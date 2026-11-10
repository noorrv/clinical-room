import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom';
import { questionPath, specialtyById } from '../../content';
import type { Question, SpecialtyId } from '../../content/types';
import { ANSWER_ORDER, GIVEN, SectionBody } from '../specialty/QuestionPage';
import { supabase } from '../../lib/supabase';
import type { AdminOutletContext } from './AdminLayout';
import {
  blankForm,
  COLUMN_OF,
  hasContent,
  LIST_FIELDS,
  loadLookups,
  loadQuestion,
  saveQuestion,
  TYPE_OPTIONS,
  type Lookups,
  type QStatus,
  type QuestionForm,
} from './questionData';
import { ACCESS_OPTIONS, ConfirmDelete, friendlyError, ID_PATTERN, SelectField, slugify, specialtyOptions, specialtyTitle, TextField, useNotify } from './ui';

/*
  The question editor. Its answer sections follow the study page's own rules for each question
  type, and the preview beside it is drawn with the study page's book layout, so what you see
  here is what students get.
*/

type Col = keyof QuestionForm;

const LABEL_HINT: Partial<Record<Col, string>> = {
  scenario: 'The clinical scenario exactly as the candidate is given it.',
  question: 'The task or question asked.',
  key_points: 'One point per line.',
  examiner_expects: 'One item per line. Also used as the Mock OSCE checklist.',
  steps: 'One step per line, in order.',
};

/** What each column is called on the study page (from its section lists). */
const SECTION_LABEL: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const s of [...GIVEN, ...Object.values(ANSWER_ORDER).flat()]) m[COLUMN_OF[s.key as string]] ??= s.label;
  return m;
})();

const ALL_ANSWER_COLS = ['model_answer', 'history', 'examination', 'investigations', 'management', 'key_points', 'examiner_expects', 'steps'] as const;

const randomTail = () => Math.random().toString(36).slice(2, 6);

export function QuestionEditorPage() {
  const { sp: editSp, id: editId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const { refreshCounts } = useOutletContext<AdminOutletContext>();
  const isNew = !editId;

  const [form, setForm] = useState<QuestionForm | null>(null);
  const [initial, setInitial] = useState<string>('');
  const [links, setLinks] = useState<{ doctorIds: string[]; topicIds: string[] }>({ doctorIds: [], topicIds: [] });
  const [lookups, setLookups] = useState<Lookups>({ doctors: [], topics: [] });
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Col, string>>>({});
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [idTouched, setIdTouched] = useState(false);
  const [docSearch, setDocSearch] = useState('');

  // load: an existing question, a copy of one, or a blank form
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const lk = await loadLookups();
        let f: QuestionForm | null;
        if (!isNew) {
          f = await loadQuestion(editSp!, editId!);
          if (!f) throw new Error('This question no longer exists. It may have been deleted.');
          if (alive) setLinks({ doctorIds: f.doctorIds, topicIds: f.topicIds });
        } else if (params.get('copy')) {
          const [csp, cid] = params.get('copy')!.split('/');
          const src = await loadQuestion(csp, cid);
          f = src ? { ...src, id: '', title: `${src.title} (copy)`, status: 'draft' } : blankForm('medicine');
        } else {
          const sp = (params.get('specialty') as SpecialtyId) || 'medicine';
          f = blankForm(specialtyOptions().some((o) => o.value === sp) ? sp : 'medicine');
        }
        if (!alive) return;
        setLookups(lk);
        setForm(f);
        setInitial(JSON.stringify(f));
      } catch (e) {
        if (alive) setLoadError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [isNew, editSp, editId, params]);

  const dirty = form !== null && JSON.stringify(form) !== initial;

  // warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends Col>(k: K, v: QuestionForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const answerCols = useMemo(() => (form ? ANSWER_ORDER[form.type].map((s) => COLUMN_OF[s.key as string]) : []), [form?.type]); // eslint-disable-line react-hooks/exhaustive-deps
  // sections that hold text but aren't shown for the chosen type
  const hiddenWithText = form ? ALL_ANSWER_COLS.filter((c) => !answerCols.includes(c) && form[c].trim()) : [];

  if (loadError) {
    return (
      <section className="view admin-view">
        <div className="admin-alert" role="alert">
          <p>{loadError}</p>
          <Link className="btn-ghost admin-linkbtn" to="/admin/questions">
            Back to questions
          </Link>
        </div>
      </section>
    );
  }
  if (!form) {
    return (
      <p className="muted admin-loading" role="status">
        Opening the question…
      </p>
    );
  }

  const doctors = lookups.doctors.filter((d) => d.specialty_id === form.specialty_id && (!docSearch.trim() || d.name.includes(docSearch.trim())));
  const topics = lookups.topics.filter((t) => t.specialty_id === form.specialty_id);

  const validate = (f: QuestionForm, publishing: boolean) => {
    const e: Partial<Record<Col, string>> = {};
    if (!f.title.trim()) e.title = 'Please give the question a title.';
    else if (f.title.trim().length > 200) e.title = 'Please keep the title under 200 characters.';
    if (isNew && f.id && !ID_PATTERN.test(f.id)) e.id = 'Use only lowercase letters, numbers and dashes.';
    if (f.minutes.trim() && !(/^\d+$/.test(f.minutes.trim()) && +f.minutes >= 1 && +f.minutes <= 60)) e.minutes = 'Use a whole number of minutes from 1 to 60, or leave empty.';
    if (!/^-?\d+$/.test(f.sort.trim())) e.sort = 'Use a whole number.';
    if (publishing && !hasContent(f)) e.scenario = 'Add the scenario, the task or an answer section before publishing.';
    return e;
  };

  const save = async (status: QStatus) => {
    setSaveError('');
    let f = { ...form, status };
    if (isNew && !f.id && f.title.trim()) f = { ...f, id: slugify(f.title) || `question-${randomTail()}` };
    // links that no longer belong to the specialty are dropped
    f.doctorIds = f.doctorIds.filter((id) => lookups.doctors.some((d) => d.specialty_id === f.specialty_id && d.id === id));
    f.topicIds = f.topicIds.filter((id) => lookups.topics.some((t) => t.specialty_id === f.specialty_id && t.id === id));
    const e = validate(f, status === 'published');
    setErrors(e);
    if (Object.keys(e).length) {
      setSaveError('Please fix the highlighted fields.');
      return;
    }
    setBusy(true);
    const err = await saveQuestion(f, isNew, isNew ? undefined : links);
    setBusy(false);
    if (err) {
      setSaveError(err);
      return;
    }
    setForm(f);
    setInitial(JSON.stringify(f));
    setLinks({ doctorIds: f.doctorIds, topicIds: f.topicIds });
    refreshCounts();
    notify(status === 'published' ? `Published “${f.title.trim()}”.` : `Saved “${f.title.trim()}” as a draft.`);
    if (isNew) navigate(`/admin/questions/edit/${f.specialty_id}/${f.id}`, { replace: true });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    save(form.status);
  };

  const leave = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    navigate('/admin/questions');
  };

  const toggleIn = (k: 'doctorIds' | 'topicIds', id: string) => set(k, form[k].includes(id) ? form[k].filter((x) => x !== id) : [...form[k], id]);

  const field = (c: Col, rows = 4) => (
    <TextField
      key={c}
      label={SECTION_LABEL[c] ?? c}
      value={form[c] as string}
      onChange={(v) => set(c, v as never)}
      multiline
      rows={(LIST_FIELDS as readonly string[]).includes(c) ? 5 : rows}
      hint={LABEL_HINT[c]}
      error={errors[c]}
      dir="auto"
    />
  );

  return (
    <section className="view admin-view admin-editor" aria-labelledby="qe-title">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/admin/questions">Questions</Link>
        <span aria-hidden> / </span>
        <span aria-current="page">{isNew ? 'New question' : 'Edit'}</span>
      </nav>
      <header className="view__head">
        <div>
          <h1 id="qe-title" className="view__title">
            <bdi>{isNew ? 'New question' : form.title || 'Untitled question'}</bdi>
          </h1>
          <p className="view__intro">
            <span className={`admin-pill admin-pill--${form.status}`}>{form.status === 'draft' ? 'Draft' : 'Published'}</span>{' '}
            {specialtyTitle(form.specialty_id)}
            {dirty && <span className="admin-unsaved"> · Unsaved changes</span>}
          </p>
        </div>
        <div className="admin-head-actions">
          <button type="button" className="btn-ghost" onClick={() => setPreview((p) => !p)} aria-pressed={preview}>
            {preview ? 'Hide preview' : 'Show preview'}
          </button>
        </div>
      </header>

      <div className={`admin-editor__grid${preview ? ' has-preview' : ''}`}>
        <form className="admin-form admin-editor__form" onSubmit={onSubmit} noValidate>
          <fieldset className="admin-fieldset">
            <legend>Basics</legend>
            <TextField
              label="Title"
              value={form.title}
              onChange={(v) => setForm((f) => (f ? { ...f, title: v, id: isNew && !idTouched ? slugify(v) : f.id } : f))}
              error={errors.title}
              required
              dir="auto"
              hint="Shown in lists, search and at the top of the page."
            />
            <div className="admin-form__row">
              <SelectField
                label="Specialty"
                value={form.specialty_id}
                onChange={(v) => set('specialty_id', v)}
                options={specialtyOptions()}
                disabled={!isNew}
                hint={isNew ? 'Examiners and topics come from this specialty.' : 'Fixed once saved. To move it, duplicate it into another specialty.'}
              />
              <SelectField label="Type" value={form.type} onChange={(v) => set('type', v)} options={TYPE_OPTIONS} hint="Decides which answer sections the page shows." />
            </div>
            <TextField
              label="Web address"
              value={form.id}
              onChange={(v) => {
                setIdTouched(true);
                set('id', v.toLowerCase());
              }}
              error={errors.id}
              disabled={!isNew}
              hint={isNew ? 'Made from the title; leave it, or edit it. Can’t be changed later.' : 'Can’t be changed, so links and students’ progress keep working.'}
            />
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>Given to the candidate</legend>
            {field('scenario', 5)}
            {field('question', 3)}
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>The answer</legend>
            <p className="admin-fieldset__note">These are the sections a {TYPE_OPTIONS.find((t) => t.value === form.type)?.label.toLowerCase()} shows, in page order. Empty sections are left out.</p>
            {answerCols.map((c) => field(c))}
            {hiddenWithText.length > 0 && (
              <div className="admin-hidden-sections">
                <p>
                  These hold text but aren’t shown for this type. Switch the type back to show them, or clear them:
                </p>
                {hiddenWithText.map((c) => field(c))}
              </div>
            )}
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>Examiners and topics</legend>
            <div className="admin-form__row admin-form__row--top">
              <div className="admin-checklist">
                <p className="admin-checklist__title">Examiners</p>
                {lookups.doctors.some((d) => d.specialty_id === form.specialty_id) ? (
                  <>
                    <input type="search" className="admin-checklist__search" placeholder="Find an examiner" value={docSearch} onChange={(e) => setDocSearch(e.target.value)} aria-label="Find an examiner" />
                    <ul>
                      {doctors.map((d) => (
                        <li key={d.id}>
                          <label>
                            <input type="checkbox" checked={form.doctorIds.includes(d.id)} onChange={() => toggleIn('doctorIds', d.id)} /> <bdi>{d.name}</bdi>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="muted">
                    No examiners in {specialtyTitle(form.specialty_id)} yet. <Link to="/admin/examiners">Add some</Link>.
                  </p>
                )}
              </div>
              <div className="admin-checklist">
                <p className="admin-checklist__title">Topics</p>
                {topics.length ? (
                  <ul>
                    {topics.map((t) => (
                      <li key={t.id}>
                        <label>
                          <input type="checkbox" checked={form.topicIds.includes(t.id)} onChange={() => toggleIn('topicIds', t.id)} /> <bdi>{t.name}</bdi>
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">
                    No topics in {specialtyTitle(form.specialty_id)} yet. <Link to="/admin/topics">Add some</Link>.
                  </p>
                )}
              </div>
            </div>
          </fieldset>

          <fieldset className="admin-fieldset">
            <legend>Settings</legend>
            <div className="admin-form__row">
              <TextField label="Station time (minutes)" value={form.minutes} onChange={(v) => set('minutes', v)} error={errors.minutes} hint="For Mock OSCE. Leave empty to use its default." />
              <TextField label="Order" value={form.sort} onChange={(v) => set('sort', v)} error={errors.sort} hint="Lower numbers are listed first." />
            </div>
            <TextField label="Source" value={form.source} onChange={(v) => set('source', v)} hint="Optional, e.g. the exam and year it came from." dir="auto" />
            <SelectField label="Who can see it once published" value={form.access} onChange={(v) => set('access', v)} options={ACCESS_OPTIONS} />
          </fieldset>

          {saveError && (
            <p className="auth-message auth-message--error" role="alert">
              {saveError}
            </p>
          )}

          <div className="admin-savebar">
            {form.status === 'draft' ? (
              <>
                <button type="button" className="btn-ghost" disabled={busy} onClick={() => save('draft')}>
                  {busy ? 'Saving…' : 'Save draft'}
                </button>
                <button type="button" className="btn-ink" disabled={busy} onClick={() => save('published')}>
                  Save and publish
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-ink" disabled={busy} onClick={() => save('published')}>
                  {busy ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" className="btn-ghost" disabled={busy} onClick={() => save('draft')}>
                  Move to drafts
                </button>
              </>
            )}
            <span className="admin-savebar__spacer" />
            {!isNew && (
              <>
                {form.status === 'published' && !dirty && (
                  <Link className="admin-linklike" to={questionPath(specialtyById(form.specialty_id), form.id)}>
                    View on the site
                  </Link>
                )}
                <Link className="admin-linklike" to={`/admin/questions/new?copy=${form.specialty_id}/${form.id}`}>
                  Duplicate
                </Link>
                <button type="button" className="admin-linklike admin-danger-text" onClick={() => setDeleting(true)}>
                  Delete
                </button>
              </>
            )}
            <button type="button" className="admin-linklike" onClick={leave}>
              Back to questions
            </button>
          </div>
        </form>

        {preview && <QuestionPreview form={form} />}
      </div>

      {deleting && (
        <ConfirmDelete
          title="Delete this question?"
          body={
            <>
              <p>
                <strong>
                  <bdi>{form.title}</bdi>
                </strong>{' '}
                ({specialtyTitle(form.specialty_id)})
              </p>
              <p>Its examiner and topic links go with it. Students’ saved progress on it is no longer shown. This can’t be undone.</p>
            </>
          }
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            const { error } = await supabase.from('questions').delete().eq('specialty_id', form.specialty_id).eq('id', form.id);
            if (error) return friendlyError(error);
            setInitial(JSON.stringify(form)); // nothing left to lose
            refreshCounts();
            notify(`Deleted “${form.title}”.`);
            navigate('/admin/questions');
            return null;
          }}
        />
      )}
    </section>
  );
}

/** The question as students will see it: the study page's book spread, from the form as it stands. */
function QuestionPreview({ form }: { form: QuestionForm }) {
  const lines = (s: string) =>
    s
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  const value = (key: keyof Question): string | string[] | undefined => {
    const col = COLUMN_OF[key as string];
    if (!col) return undefined;
    return (LIST_FIELDS as readonly string[]).includes(col) ? lines(form[col]) : form[col].trim();
  };
  const filled = (key: keyof Question) => {
    const v = value(key);
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  };
  const given = GIVEN.filter((s) => filled(s.key));
  const answer = ANSWER_ORDER[form.type].filter((s) => filled(s.key));

  return (
    <aside className="admin-preview" aria-label="Preview">
      <p className="admin-preview__label">Preview, as students will see it</p>
      <p className="qpage__type">{TYPE_OPTIONS.find((t) => t.value === form.type)?.label}</p>
      <h2 className="qpage__title">
        <bdi>{form.title || 'Untitled question'}</bdi>
      </h2>
      <div className="book">
        <section className="book__page book__page--left" aria-label="Given to the candidate">
          {given.length ? (
            given.map((s) => (
              <div key={s.key} className="book__section">
                <h3 className="book__h">{s.label}</h3>
                <SectionBody value={value(s.key)} />
              </div>
            ))
          ) : (
            <p className="book__missing">The scenario and question haven’t been added yet.</p>
          )}
        </section>
        <section className="book__page book__page--right" aria-label="The answer">
          {answer.length ? (
            answer.map((s) => (
              <div key={s.key} className="book__section">
                <h3 className="book__h">{s.label}</h3>
                <SectionBody value={value(s.key)} ordered={s.key === 'steps'} sheet={s.key === 'modelAnswer'} />
              </div>
            ))
          ) : (
            <p className="book__missing">The answer for this question hasn’t been added yet.</p>
          )}
        </section>
      </div>
    </aside>
  );
}
