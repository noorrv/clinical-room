import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../lib/supabase';
import type { CaseData } from '../../pages/game/cases/types';

/*
  Clinical approaches and their practice cases, read from Supabase (tables approaches and cases).
  Row Level Security decides what comes back: published rows for approved students (or anyone, if
  marked public), and drafts as well for admins, who see them labelled as drafts.
*/

export interface CaseSummary {
  id: string;
  number: string;
  title: string;
  draft: boolean;
}

export interface ApproachSummary {
  id: string;
  specialtyId: string;
  title: string;
  summary: string;
  draft: boolean;
  cases: CaseSummary[];
}

export interface Approach extends ApproachSummary {
  sheet: string;
}

type Load<T> = { data: T; error: null } | { data: null; error: string | null };

async function listApproaches(specialtyId: string): Promise<ApproachSummary[]> {
  const [a, c] = await Promise.all([
    supabase.from('approaches').select('id, title, summary, status').eq('specialty_id', specialtyId).order('sort').order('title'),
    supabase.from('cases').select('id, approach_id, number, title, status').eq('specialty_id', specialtyId).order('sort').order('number'),
  ]);
  if (a.error) throw new Error(a.error.message);
  if (c.error) throw new Error(c.error.message);
  return (a.data ?? []).map((r) => ({
    id: r.id,
    specialtyId,
    title: r.title,
    summary: r.summary,
    draft: r.status !== 'published',
    cases: (c.data ?? []).filter((x) => x.approach_id === r.id).map((x) => ({ id: x.id, number: x.number, title: x.title, draft: x.status !== 'published' })),
  }));
}

async function getApproach(specialtyId: string, id: string): Promise<Approach | null> {
  const [a, c] = await Promise.all([
    supabase.from('approaches').select('id, title, summary, sheet, status').eq('specialty_id', specialtyId).eq('id', id).maybeSingle(),
    supabase.from('cases').select('id, number, title, status').eq('specialty_id', specialtyId).eq('approach_id', id).order('sort').order('number'),
  ]);
  if (a.error) throw new Error(a.error.message);
  if (c.error) throw new Error(c.error.message);
  if (!a.data) return null;
  return {
    id: a.data.id,
    specialtyId,
    title: a.data.title,
    summary: a.data.summary,
    sheet: a.data.sheet,
    draft: a.data.status !== 'published',
    cases: (c.data ?? []).map((x) => ({ id: x.id, number: x.number, title: x.title, draft: x.status !== 'published' })),
  };
}

/** A playable case, in the shape the case game reads; null when it isn't there or isn't open to this visitor. */
export async function fetchCase(specialtyId: string, id: string): Promise<CaseData | null> {
  const { data, error } = await supabase.from('cases').select('data').eq('specialty_id', specialtyId).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.data as CaseData | undefined) ?? null;
}

/** Runs a loader whenever its key changes; data is undefined while loading. */
function useLoad<T>(key: string, load: () => Promise<T>): Load<T> | { data: undefined; error: null } {
  const [state, setState] = useState<{ key: string; result: Load<T> } | null>(null);
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ key, result: { data, error: null } }),
      (e: unknown) => live && setState({ key, result: { data: null, error: e instanceof Error ? e.message : 'Could not load' } }),
    );
    return () => {
      live = false;
    };
    // the key names everything the loader depends on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state && state.key === key ? state.result : { data: undefined, error: null };
}

/** Who is asking: what Row Level Security returns depends on it, so a sign-in or approval reloads. */
function useViewer(): string {
  const { loading, session, profile, isAdmin } = useAuth();
  return loading ? 'loading' : `${session?.user.id ?? 'guest'}:${profile?.status ?? ''}:${isAdmin ? 'admin' : ''}`;
}

export function useApproaches(specialtyId: string) {
  const who = useViewer();
  return useLoad(`list:${specialtyId}:${who}`, () => (who === 'loading' ? new Promise<never>(() => {}) : listApproaches(specialtyId)));
}

export function useApproach(specialtyId: string, id: string) {
  const who = useViewer();
  return useLoad(`one:${specialtyId}/${id}:${who}`, () => (who === 'loading' ? new Promise<never>(() => {}) : getApproach(specialtyId, id)));
}

export function useCase(specialtyId: string, id: string) {
  const who = useViewer();
  return useLoad(`case:${specialtyId}/${id}:${who}`, () => (who === 'loading' ? new Promise<never>(() => {}) : fetchCase(specialtyId, id)));
}
