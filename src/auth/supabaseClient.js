// ── Supabase client ───────────────────────────────────────────────────────────
// Loaded via CDN — no build step required.
// Keys are safe to be public (publishable key + RLS enforces data isolation).
// Set per environment: VITE_SUPABASE_URL / VITE_SUPABASE_KEY (publishable key only — never the secret key).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

let _supabase = null;
export function getSupabase() {
  if (_supabase) return _supabase;
  if (window.supabase?.createClient) {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  return _supabase;
}
