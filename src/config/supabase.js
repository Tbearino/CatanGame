// ============================================================
//  src/config/supabase.js
//  ⚙️ Paste your Supabase keys here. The anon key is SAFE
//  in frontend code. Never paste the service_role key.
//  Find both in: Supabase → Project Settings → API
// ============================================================

export const SUPABASE_URL = "https://bjwzgybihfouqmifmopg.supabase.co";
export const SUPABASE_ANON_KEY = "https://bjwzgybihfouqmifmopg.supabase.co/rest/v1/"; // starts with eyJ...

export const ONLINE_ENABLED =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.startsWith("eyJ");

let _supabase = null;

export async function getSupabase() {
  if (!ONLINE_ENABLED) return null;
  if (_supabase) return _supabase;
  try {
    const mod = await import("@supabase/supabase-js");
    _supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _supabase;
  } catch (e) {
    console.warn("Supabase not available — running local only.", e);
    return null;
  }
}

export function makeRoomCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const pick = n => Array.from({ length: n }, () =>
    chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${pick(4)}-${pick(4)}`;
}
