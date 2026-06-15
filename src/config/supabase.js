// ============================================================
//  src/config/supabase.js
//  ⚙️ Paste your Supabase keys here. The anon key is SAFE
//  in frontend code. Never paste the service_role key.
//  Find both in: Supabase → Project Settings → API
// ============================================================

export const SUPABASE_URL = "https://bjwzgybihfouqmifmopg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_GhewzRt8SlptQL0M9vVnzQ_moSUuXKY";

// Works with both old (eyJ...) and new (sb_publishable_...) key formats
export const ONLINE_ENABLED =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.length > 20;

let _supabase = null;

export async function getSupabase() {
  if (!ONLINE_ENABLED) return null;
  if (_supabase) return _supabase;
  try {
    const mod = await import("@supabase/supabase-js");
    _supabase = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
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
