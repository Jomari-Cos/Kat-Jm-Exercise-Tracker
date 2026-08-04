import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Build-time config (inlined by Vite when the credentials exist at build time,
// e.g. `npm run dev` which reads .env.local).
const buildTimeUrl: string | undefined = import.meta.env.VITE_SUPABASE_URL;
const buildTimeKey: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ---------------------------------------------------------------------------
// Runtime config fallback.
//
// The AI Studio cloud build does NOT have a local .env.local (it is gitignored
// and not committed), so VITE_* build-time vars are normally empty there.
// Instead, the server (which has the real env vars injected at runtime from the
// AI Studio Secrets / environment panel) exposes them via /api/supabase-config.
// We fetch that so the deployed app uses the cloud even without build-time vars.
// ---------------------------------------------------------------------------

interface RuntimeConfig { url?: string; key?: string; }

let runtimeConfigPromise: Promise<RuntimeConfig> | null = null;

function fetchRuntimeConfig(): Promise<RuntimeConfig> {
    if (!runtimeConfigPromise) {
        runtimeConfigPromise = (async () => {
            try {
                const res = await fetch('/api/supabase-config', {
                    headers: { Accept: 'application/json' }
                });
                if (!res.ok) return {};
                const data = await res.json();
                return {
                    url: typeof data.url === 'string' ? data.url : undefined,
                    key: typeof data.key === 'string' ? data.key : undefined
                };
            } catch (err) {
                console.warn('[supabase] Failed to fetch runtime config:', err);
                return {};
            }
        })();
    }
    return runtimeConfigPromise;
}

let supabaseClient: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Async accessor for the Supabase client. Resolves once at app start:
 *  - prefers build-time env (import.meta.env.VITE_*), then
 *  - falls back to runtime config served by the backend (/api/supabase-config).
 * Returns null when no credentials are available.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
    if (!initPromise) {
        initPromise = (async () => {
            let url = buildTimeUrl;
            let key = buildTimeKey;

            if (!url || !key) {
                const runtime = await fetchRuntimeConfig();
                url = url || runtime.url;
                key = key || runtime.key;
            }

            if (url && key) {
                supabaseClient = createClient(url, key, {
                    auth: { persistSession: false }
                });
            }

            if (!supabaseClient) {
                console.warn(
                    '[supabase] No cloud credentials available. ' +
                    'Data will be stored only in this browser (Device Only).'
                );
            }

            return supabaseClient;
        })();
    }
    return initPromise;
}

/** Returns the resolved client (only call AFTER awaiting getSupabase()). */
export function getClient(): SupabaseClient | null {
    return supabaseClient;
}

/** Async check whether cloud persistence is available. */
export function isSupabaseConfigured(): Promise<boolean> {
    return getSupabase().then((client) => client !== null);
}