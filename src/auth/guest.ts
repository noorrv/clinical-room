import { useSyncExternalStore } from 'react';
import { useAuth } from './AuthProvider';

/*
  Guest browsing: visitors without an approved account can open the study pages, but the database
  only gives them rows marked access = 'public'. Their progress stays in this browser and moves
  into their account if they register and are approved.
*/

const KEY = 'clinical-room:guest';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let guest = typeof window === 'undefined' ? false : read();

function set(next: boolean) {
  guest = next;
  try {
    if (next) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode: guest mode lasts for this visit */
  }
  listeners.forEach((l) => l());
}

export const enterGuest = () => set(true);
export const leaveGuest = () => set(false);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      guest = read();
      listeners.forEach((l) => l());
    }
  });
}

/** Has the visitor chosen to browse as a guest? */
export function useGuestFlag(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => guest,
    () => false,
  );
}

/** True while someone is browsing as a guest rather than with an approved account. */
export function useGuestBrowsing(): boolean {
  const flag = useGuestFlag();
  const { profile, isAdmin } = useAuth();
  const full = isAdmin || profile?.status === 'approved';
  return flag && !full;
}
