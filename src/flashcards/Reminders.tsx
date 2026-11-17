import { useEffect, useId, useState } from 'react';
import { currentSubscription, DEFAULT_PREFS, disablePush, enablePush, loadPrefs, permission, pushSupport, savePrefs, showSample, type ReminderPrefs } from '../push/push';

/*
  Flashcard reminders: explained first, and switched on only when the student presses the
  button (that is when the browser asks for permission). Once on: a daily time in their own
  timezone, quiet hours, and which reminders to get. They're sent from Supabase's servers, so
  they arrive with the site closed. iPhones and iPads get them only from the Home Screen app.
*/

type Phase = 'loading' | 'off' | 'on' | 'elsewhere';

export function Reminders({ due }: { due: number }) {
  const ids = useId();
  const support = pushSupport();
  const [phase, setPhase] = useState<Phase>('loading');
  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [p, sub] = await Promise.all([loadPrefs(), currentSubscription()]);
        if (!live) return;
        if (p) setPrefs({ ...p, timezone: DEFAULT_PREFS.timezone });
        setPhase(sub && p?.enabled ? 'on' : p?.enabled ? 'elsewhere' : 'off');
      } catch {
        if (live) {
          setPhase('off');
          setError('Reminders aren’t available yet: their database update hasn’t been installed.');
        }
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setError('');
    setNote('');
    const r = await enablePush();
    if (r === 'denied') setError('Your browser didn’t allow notifications. To change that, allow notifications for this site in the browser’s settings, then try again.');
    else if (r === 'failed') setError('Reminders couldn’t be switched on here. Please try again in a moment.');
    else {
      const next = { ...prefs, enabled: true, timezone: DEFAULT_PREFS.timezone };
      try {
        await savePrefs(next);
        setPrefs(next);
        setPhase('on');
        await showSample(0);
        setNote('Reminders are on for this browser.');
      } catch {
        setError('Your settings couldn’t be saved. Please try again.');
      }
    }
    setBusy(false);
  };

  const turnOff = async () => {
    setBusy(true);
    setError('');
    await disablePush();
    const next = { ...prefs, enabled: false };
    try {
      await savePrefs(next);
    } catch {
      /* the subscription is gone either way */
    }
    setPrefs(next);
    setPhase('off');
    setNote('Reminders are off. Nothing more will be sent.');
    setBusy(false);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await savePrefs({ ...prefs, timezone: DEFAULT_PREFS.timezone });
      setNote('Saved.');
    } catch {
      setError('Your settings couldn’t be saved. Please try again.');
    }
    setBusy(false);
  };

  const set = <K extends keyof ReminderPrefs>(k: K, v: ReminderPrefs[K]) => {
    setNote('');
    setPrefs((p) => ({ ...p, [k]: v }));
  };

  return (
    <section className="fc-panel" aria-labelledby={`${ids}-t`}>
      <h2 id={`${ids}-t`} className="fc-panel__title">
        Reminders
      </h2>
      <p className="fc-hint">Get a notification when your flashcards are due, even with the site closed. One a day at most, at a time you choose, never in your quiet hours.</p>

      {support === 'ios-install' ? (
        <div className="fc-reminder-note">
          <p>
            <strong>On iPhone and iPad, reminders work from the Home Screen.</strong> In Safari, tap the Share button, choose <em>Add to Home Screen</em>, then open The Clinical Room from your Home Screen and come back here. It needs iOS 16.4 or later.
          </p>
        </div>
      ) : support !== 'ok' ? (
        <div className="fc-reminder-note">
          <p>This browser can’t receive reminders. Try a current version of Chrome, Edge, Firefox or Safari.</p>
        </div>
      ) : phase === 'loading' ? (
        <p className="fc-hint" role="status">
          Checking your reminders…
        </p>
      ) : phase === 'off' || phase === 'elsewhere' ? (
        <div className="fc-reminder-note">
          {phase === 'elsewhere' && <p>Reminders are on for another of your devices. Turn them on here too to get them in this browser.</p>}
          {permission() === 'denied' ? (
            <p>Notifications are blocked for this site. Allow them in your browser’s site settings, then come back to turn reminders on.</p>
          ) : (
            <>
              <p>When you press the button, your browser will ask whether The Clinical Room may send notifications. You can turn them off here at any time.</p>
              <button type="button" className="fc-btn fc-btn--solid" onClick={turnOn} disabled={busy}>
                {busy ? 'Turning on…' : 'Turn on reminders'}
              </button>
            </>
          )}
        </div>
      ) : (
        <form
          className="fc-reminder-form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="fc-filters">
            <div className="fc-picker">
              <label htmlFor={`${ids}-time`}>Remind me at</label>
              <input id={`${ids}-time`} type="time" value={prefs.daily_time} onChange={(e) => set('daily_time', e.target.value || '19:00')} />
            </div>
            <div className="fc-picker">
              <label htmlFor={`${ids}-qs`}>Quiet from</label>
              <input id={`${ids}-qs`} type="time" value={prefs.quiet_start ?? ''} onChange={(e) => set('quiet_start', e.target.value || null)} />
            </div>
            <div className="fc-picker">
              <label htmlFor={`${ids}-qe`}>Quiet until</label>
              <input id={`${ids}-qe`} type="time" value={prefs.quiet_end ?? ''} onChange={(e) => set('quiet_end', e.target.value || null)} />
            </div>
          </div>
          <label className="fc-check">
            <input type="checkbox" checked={prefs.due_reminders} onChange={(e) => set('due_reminders', e.target.checked)} />
            Tell me when flashcards are due
          </label>
          <label className="fc-check">
            <input type="checkbox" checked={prefs.daily_reminder} onChange={(e) => set('daily_reminder', e.target.checked)} />
            Remind me to study every day, even when nothing is due
          </label>
          <p className="fc-hint">Times are in your timezone: {DEFAULT_PREFS.timezone.replace(/_/g, ' ')}.</p>
          <div className="fc-note__actions fc-note__actions--start">
            <button type="submit" className="fc-btn fc-btn--solid" disabled={busy}>
              Save reminder settings
            </button>
            <button type="button" className="fc-btn" onClick={() => showSample(due)} disabled={busy}>
              Show a sample
            </button>
            <button type="button" className="fc-btn" onClick={turnOff} disabled={busy}>
              Turn off on this browser
            </button>
          </div>
        </form>
      )}

      {note && (
        <p className="fc-hint" role="status">
          {note}
        </p>
      )}
      {error && (
        <p className="fc-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
