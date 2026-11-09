import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/*
  The one Supabase client for the whole site. It only ever holds the public key: every rule
  about who may read or change what lives in the database (Row Level Security), not here.
*/

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** False until .env.local holds the project URL and public key. */
export const supabaseConfigured = Boolean(url && key && !url.includes('your-project-ref'));

/** True for a secret key: the new sb_secret_ format, or an old JWT whose role is service_role. */
function looksSecret(k: string): boolean {
  if (k.startsWith('sb_secret_')) return true;
  try {
    const payload = k.split('.')[1];
    if (!payload) return false;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return /"role"\s*:\s*"service_role"/.test(json);
  } catch {
    return false;
  }
}

// Refuse to start with a secret key, so it can never ship to students' browsers.
if (key && looksSecret(key)) {
  throw new Error('A Supabase secret / service_role key was put in VITE_SUPABASE_ANON_KEY. Use the public anon or publishable key only.');
}

export const supabase: SupabaseClient = createClient(url || 'http://localhost:54321', key || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
