import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { questionPath, specialtyById } from '../content';
import type { SpecialtyId } from '../content/types';
import { supabase } from '../lib/supabase';

/*
  The notification feed for the header bell. The database writes a row whenever something reaches
  students (a question first published, an admin-flagged update, an announcement); here those rows
  are grouped for reading: new questions become one item per topic and day, updates and notices stay
  single. Row Level Security already limits rows to approved students and to content that is still
  published. "Mark all as read" stores the time in notification_reads, so it follows the account.
*/

interface Row {
  id: number;
  at: string;
  kind: 'added' | 'updated' | 'announcement';
  specialty_id: SpecialtyId | null;
  question_id: string | null;
  announcement_id: string | null;
  title: string;
  note: string | null;
}

export interface FeedItem {
  key: string;
  kind: 'new-topic' | 'new-questions' | 'updated' | 'announcement';
  at: Date;
  title: string;
  detail: string;
  href: string;
  unread: boolean;
}

const DAYS = 90;
const MAX_ITEMS = 25;

const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA');
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function useNotifications(openSignal: unknown) {
  const { session, profile, isAdmin } = useAuth();
  const uid = session?.user.id ?? null;
  const allowed = Boolean(uid && (isAdmin || profile?.status === 'approved'));

  const [rows, setRows] = useState<Row[]>([]);
  const [links, setLinks] = useState<{ topic: Map<string, string>; doctor: Map<string, string>; topicName: Map<string, string>; doctorName: Map<string, string> }>({
    topic: new Map(),
    doctor: new Map(),
    topicName: new Map(),
    doctorName: new Map(),
  });
  const [seenAt, setSeenAt] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!allowed || busy.current) return;
    busy.current = true;
    try {
      const since = new Date(Date.now() - DAYS * 864e5).toISOString();
      const [feed, read] = await Promise.all([
        supabase.from('content_updates').select('*').gte('at', since).order('at', { ascending: false }).limit(400),
        supabase.from('notification_reads').select('seen_at').eq('user_id', uid!).maybeSingle(),
      ]);
      if (feed.error) return;
      const data = (feed.data ?? []) as Row[];
      const qids = [...new Set(data.filter((r) => r.question_id).map((r) => r.question_id!))];
      const topic = new Map<string, string>();
      const doctor = new Map<string, string>();
      const topicName = new Map<string, string>();
      const doctorName = new Map<string, string>();
      if (qids.length) {
        const [qt, qd, t, d] = await Promise.all([
          supabase.from('question_topics').select('specialty_id, question_id, topic_id').in('question_id', qids),
          supabase.from('question_doctors').select('specialty_id, question_id, doctor_id').in('question_id', qids),
          supabase.from('topics').select('specialty_id, id, name'),
          supabase.from('doctors').select('specialty_id, id, name'),
        ]);
        for (const r of qt.data ?? []) if (!topic.has(`${r.specialty_id}/${r.question_id}`)) topic.set(`${r.specialty_id}/${r.question_id}`, r.topic_id);
        for (const r of qd.data ?? []) if (!doctor.has(`${r.specialty_id}/${r.question_id}`)) doctor.set(`${r.specialty_id}/${r.question_id}`, r.doctor_id);
        for (const r of t.data ?? []) topicName.set(`${r.specialty_id}/${r.id}`, r.name);
        for (const r of d.data ?? []) doctorName.set(`${r.specialty_id}/${r.id}`, r.name);
      }
      setRows(data);
      setLinks({ topic, doctor, topicName, doctorName });
      // nothing cleared yet: everything since the account was created counts as new
      setSeenAt(read.data?.seen_at ? new Date(read.data.seen_at) : profile?.created_at ? new Date(profile.created_at) : new Date(0));
      setLoaded(true);
    } finally {
      busy.current = false;
    }
  }, [allowed, uid, profile?.created_at]);

  // on sign-in, whenever the bell is opened, and when the tab comes back into view
  useEffect(() => {
    if (!allowed) {
      setRows([]);
      setLoaded(false);
      return;
    }
    load();
  }, [allowed, load, openSignal]);
  useEffect(() => {
    const onFocus = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [load]);

  const items = useMemo<FeedItem[]>(() => {
    if (!seenAt) return [];
    const out: FeedItem[] = [];
    const unread = (d: Date) => d > seenAt;

    // the earliest time each topic received a question, to tell a brand-new topic from additions
    const firstForTopic = new Map<string, number>();
    for (const r of rows) {
      if (r.kind !== 'added' || !r.specialty_id || !r.question_id) continue;
      const t = links.topic.get(`${r.specialty_id}/${r.question_id}`) ?? '';
      const k = `${r.specialty_id}/${t}`;
      const at = +new Date(r.at);
      if (!firstForTopic.has(k) || at < firstForTopic.get(k)!) firstForTopic.set(k, at);
    }

    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      if (r.kind === 'added' && r.specialty_id && r.question_id) {
        const t = links.topic.get(`${r.specialty_id}/${r.question_id}`) ?? '';
        const k = `${r.specialty_id}/${t}/${dayOf(r.at)}`;
        groups.set(k, [...(groups.get(k) ?? []), r]);
        continue;
      }
      const sp = r.specialty_id ? specialtyById(r.specialty_id) : null;
      if (r.kind === 'updated' && sp && r.question_id) {
        const qk = `${r.specialty_id}/${r.question_id}`;
        const t = links.topic.get(qk);
        const d = links.doctor.get(qk);
        out.push({
          key: `u${r.id}`,
          kind: 'updated',
          at: new Date(r.at),
          title: r.title,
          detail: r.note || 'Answer revised',
          href: t && d ? `/specialties/${sp.slug}/doctors/${d}/topics/${t}#q-${encodeURIComponent(r.question_id)}` : questionPath(sp, r.question_id),
          unread: unread(new Date(r.at)),
        });
      } else if (r.kind === 'announcement') {
        out.push({ key: `a${r.id}`, kind: 'announcement', at: new Date(r.at), title: r.title, detail: 'Notice board', href: '/#notices', unread: unread(new Date(r.at)) });
      }
    }

    for (const [k, g] of groups) {
      const [spId, topicId] = k.split('/') as [SpecialtyId, string];
      const sp = specialtyById(spId);
      const latest = g.reduce((a, r) => (r.at > a ? r.at : a), g[0].at);
      const at = new Date(latest);
      const firstQ = `${spId}/${g[0].question_id}`;
      const doctorId = links.doctor.get(firstQ);
      const doctors = [...new Set(g.map((r) => links.doctor.get(`${spId}/${r.question_id}`)).filter(Boolean))] as string[];
      const earliest = Math.min(...g.map((r) => +new Date(r.at)));
      const isNewTopic = Boolean(topicId) && firstForTopic.get(`${spId}/${topicId}`) === earliest;
      const topicName = topicId ? links.topicName.get(`${spId}/${topicId}`) : undefined;
      const detail = [
        plural(g.length, 'question'),
        doctors.length === 1 ? links.doctorName.get(`${spId}/${doctors[0]}`) : doctors.length > 1 ? plural(doctors.length, 'examiner') : null,
        sp.shortName,
      ]
        .filter(Boolean)
        .join(' · ');
      const single = g.length === 1 && !isNewTopic;
      out.push({
        key: `g${k}`,
        kind: isNewTopic ? 'new-topic' : 'new-questions',
        at,
        title: single ? g[0].title : topicName ?? `New ${sp.shortName} questions`,
        detail,
        href:
          topicId && doctorId
            ? `/specialties/${sp.slug}/doctors/${doctorId}/topics/${topicId}${single ? `#q-${encodeURIComponent(g[0].question_id!)}` : ''}`
            : questionPath(sp, g[0].question_id!),
        unread: unread(at),
      });
    }

    return out.sort((a, b) => +b.at - +a.at).slice(0, MAX_ITEMS);
  }, [rows, links, seenAt]);

  const unreadCount = items.filter((i) => i.unread).length;

  const markAllRead = useCallback(async () => {
    if (!uid) return;
    const now = new Date();
    setSeenAt(now);
    await supabase.from('notification_reads').upsert({ user_id: uid, seen_at: now.toISOString() }, { onConflict: 'user_id' });
  }, [uid]);

  return { allowed, loaded, items, unreadCount, markAllRead };
}
