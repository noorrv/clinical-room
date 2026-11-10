/** What the noticeboard shows. Both board styles take exactly the same data. */
export interface Notice {
  id: string;
  title: string;
  body?: string;
  /** ISO date */
  date: string;
  pinned?: boolean;
}

export type RecentKind = 'question' | 'doctor' | 'topic';

export interface RecentItem {
  id: string;
  kind: RecentKind;
  title: string;
  /** e.g. "Surgery" */
  specialty: string;
  /** ISO date */
  date: string;
  href?: string;
  /** replaces the kind label, e.g. "New topic · 13 questions" */
  label?: string;
}

export interface BoardData {
  notices: Notice[];
  recent: RecentItem[];
}

export function ago(iso: string, now = Date.now()): string {
  const days = Math.floor((now - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export const KIND_LABEL: Record<RecentKind, string> = { question: 'New question', doctor: 'New examiner', topic: 'New topic' };
