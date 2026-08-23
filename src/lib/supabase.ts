import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;

const supabaseUrl = env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : null;

// Debug: confirm client initialization (Constraint 1)
try {
  console.log('[supabase] supabaseUrl present:', Boolean(supabaseUrl));
  console.log('[supabase] supabase client initialized:', !!supabase);
  if (supabase) {
    // Attempt to log current auth session/token (Constraint 2)
    // Don't await at module init (may be SSR), but call and log when available
    supabase.auth.getSession().then((sessionRes) => {
      try {
        // sessionRes shape: { data: { session }, error }
        const token = sessionRes?.data?.session?.access_token ?? null;
        console.log('[supabase] Supabase Auth Token (may be null):', token);
      } catch (e) {
        console.warn('[supabase] Failed to read session token', e);
      }
    }).catch((err) => {
      console.warn('[supabase] supabase.auth.getSession() failed', err?.message ?? err);
    });
  }
} catch (e) {
  // Defensive - do not crash app if console access fails
  // eslint-disable-next-line no-console
  console.warn('[supabase] Debug initialization failed', e instanceof Error ? e.message : e);
}

export async function getSupabaseAuthToken() {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch (e) {
    console.warn('[supabase] getSupabaseAuthToken error', e instanceof Error ? e.message : e);
    return null;
  }
}

