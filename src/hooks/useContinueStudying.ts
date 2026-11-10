import { useEffect, useMemo, useState } from 'react';
import { questionPath, specialtyById } from '../content';
import type { SpecialtyId } from '../content/types';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../notifications/useNotifications';
import { record, useStudy } from '../study/store';

/*
  What the "Continue studying" card shows, live: the last question the student opened (the study
  store's recent list, synced to their account) with its topic, examiner and how much of that topic
  they have reviewed. It re-resolves whenever they open another question on any device. With nothing
  opened yet it suggests the newest topic from the notification feed.
*/

export type Continue =
  | { state: 'loading' }
  | {
      state: 'resume';
      title: string;
      topic?: string;
      doctor?: string;
      specialty: string;
      href: string;
      at: number;
      done: number;
      total: number;
    }
  | { state: 'start'; title: string; detail: string; href: string }
  | { state: 'empty' };

interface Resolved {
  key: string;
  title: string;
  specialty: SpecialtyId;
  topicName?: string;
  doctorName?: string;
  href: string;
  topicKeys: string[];
}

const RECENT_TO_TRY = 8;

export function useContinueStudying(): Continue {
  const st = useStudy();
  const feed = useNotifications(null);
  const keys = st.recent.slice(0, RECENT_TO_TRY).map((r) => r.key);
  const keySig = keys.join('|');
  const [resolved, setResolved] = useState<Resolved | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const pairs = keys
      .map((k) => k.split('/'))
      .filter((p): p is [SpecialtyId, string] => p.length === 2 && /^[a-z0-9-]+$/i.test(p[1]));
    if (!pairs.length) {
      setResolved(null);
      return;
    }
    (async () => {
      // the most recent question that still exists and the visitor may see
      const qs = await supabase
        .from('questions')
        .select('specialty_id, id, title')
        .or(pairs.map(([sp, id]) => `and(specialty_id.eq.${sp},id.eq.${id})`).join(','));
      const found = new Map((qs.data ?? []).map((q) => [`${q.specialty_id}/${q.id}`, q]));
      const key = keys.find((k) => found.has(k));
      if (!key) {
        if (alive) setResolved(null);
        return;
      }
      const q = found.get(key)!;
      const sp = q.specialty_id as SpecialtyId;
      const [qt, qd] = await Promise.all([
        supabase.from('question_topics').select('topic_id').eq('specialty_id', sp).eq('question_id', q.id).limit(1),
        supabase.from('question_doctors').select('doctor_id').eq('specialty_id', sp).eq('question_id', q.id).limit(1),
      ]);
      const topicId = qt.data?.[0]?.topic_id as string | undefined;
      const doctorId = qd.data?.[0]?.doctor_id as string | undefined;
      const [topic, doctor, siblings] = await Promise.all([
        topicId ? supabase.from('topics').select('name').eq('specialty_id', sp).eq('id', topicId).maybeSingle() : null,
        doctorId ? supabase.from('doctors').select('name').eq('specialty_id', sp).eq('id', doctorId).maybeSingle() : null,
        topicId ? supabase.from('question_topics').select('question_id').eq('specialty_id', sp).eq('topic_id', topicId) : null,
      ]);
      // only the topic's questions the visitor can actually open count toward its progress
      let topicKeys: string[] = [key];
      const ids = (siblings?.data ?? []).map((r) => r.question_id as string);
      if (ids.length) {
        const visible = await supabase.from('questions').select('id').eq('specialty_id', sp).in('id', ids);
        topicKeys = (visible.data ?? []).map((r) => `${sp}/${r.id}`);
      }
      const spec = specialtyById(sp);
      const href =
        topicId && doctorId
          ? `/specialties/${spec.slug}/doctors/${doctorId}/topics/${topicId}#q-${encodeURIComponent(q.id)}`
          : questionPath(spec, q.id);
      if (alive)
        setResolved({ key, title: q.title, specialty: sp, topicName: topic?.data?.name, doctorName: doctor?.data?.name, href, topicKeys });
    })().catch(() => alive && setResolved(null));
    return () => {
      alive = false;
    };
    // re-resolve only when the recent list itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keySig]);

  return useMemo<Continue>(() => {
    if (resolved === undefined) return { state: 'loading' };
    if (resolved) {
      const at = st.recent.find((r) => r.key === resolved.key)?.at ?? Date.now();
      return {
        state: 'resume',
        title: resolved.title,
        topic: resolved.topicName,
        doctor: resolved.doctorName,
        specialty: specialtyById(resolved.specialty).title,
        href: resolved.href,
        at,
        total: resolved.topicKeys.length,
        done: resolved.topicKeys.filter((k) => record(st, k).status === 'mastered').length,
      };
    }
    const newest = feed.items.find((i) => i.kind === 'new-topic' || i.kind === 'new-questions');
    if (newest) return { state: 'start', title: newest.title, detail: newest.detail, href: newest.href };
    if (feed.allowed && !feed.loaded) return { state: 'loading' };
    return { state: 'empty' };
  }, [resolved, st, feed.items, feed.allowed, feed.loaded]);
}
