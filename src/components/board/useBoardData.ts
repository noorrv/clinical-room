import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { allSpecialties } from '../../content';
import type { SpecialtyId } from '../../content/types';
import { maskNames } from '../../content/remote';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import type { BoardData, Notice, RecentItem } from './types';

/*
  Notices you write (table: announcements) and the newest questions, examiners and topics.
  Row Level Security decides what each visitor gets: guests and signed-out visitors see only open
  items, so locked material isn't even titled.
*/

const RECENT_COUNT = 5;

function where(specialtyId: SpecialtyId) {
  const sp = allSpecialties().find((s) => s.id === specialtyId);
  return { title: sp?.title ?? specialtyId, slug: sp?.slug ?? specialtyId };
}

async function load(): Promise<BoardData> {
  // doctors are never shown to students, so the noticeboard lists new questions and topics only
  const [ann, qs, tops] = await Promise.all([
    supabase.from('announcements').select('id, title, body, pinned, created_at').eq('published', true).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(4),
    supabase.from('questions').select('specialty_id, id, title, created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(RECENT_COUNT),
    supabase.from('topics').select('specialty_id, id, name, created_at').order('created_at', { ascending: false }).limit(RECENT_COUNT),
  ]);

  // a missing table (before its migration has run) just means an empty column
  const notices: Notice[] = (ann.data ?? []).map((a) => ({ id: a.id, title: a.title, body: a.body ?? undefined, pinned: a.pinned, date: a.created_at }));

  const recent: RecentItem[] = [
    ...(qs.data ?? []).map((q) => {
      const w = where(q.specialty_id);
      return { id: `q-${q.specialty_id}-${q.id}`, kind: 'question' as const, title: maskNames(q.title), specialty: w.title, date: q.created_at, href: `/specialties/${w.slug}/questions/${q.id}` };
    }),
    ...(tops.data ?? []).map((t) => {
      const w = where(t.specialty_id);
      return { id: `t-${t.specialty_id}-${t.id}`, kind: 'topic' as const, title: t.name, specialty: w.title, date: t.created_at, href: `/specialties/${w.slug}/topics/${t.id}` };
    }),
  ]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, RECENT_COUNT);

  return { notices, recent };
}

export function useBoardData(): { data: BoardData; loading: boolean } {
  const { session, profile, loading: authLoading } = useAuth();
  const viewer = `${session?.user.id ?? 'anon'}:${profile?.status ?? '-'}`;
  const [data, setData] = useState<BoardData>({ notices: [], recent: [] });
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured || authLoading) return;
    let alive = true;
    setLoading(true);
    load()
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ notices: [], recent: [] }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [viewer, authLoading]);

  return { data, loading };
}
