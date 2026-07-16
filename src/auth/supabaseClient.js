// ── Supabase client ───────────────────────────────────────────────────────────
// Loaded via CDN — no build step required.
// Keys are safe to be public (publishable key + RLS enforces data isolation).
const SUPABASE_URL = "https://ajabrqcbultkaszsycwh.supabase.co";
const SUPABASE_KEY = "sb_publishable_yn6mJb93k85y5nrJJReQSA_M6iliVoD";

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
