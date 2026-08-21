import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Frontend-only Supabase client.
 * Uses ONLY the public URL + anon/publishable key from environment variables.
 * Never reference service-role or any backend-only secret here.
 */
const url = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const anonKey = (import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ??
  import.meta.env['VITE_SUPABASE_ANON_KEY']) as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export class NotConfiguredError extends Error {
  constructor() {
    super(
      "Supabase is not connected. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new NotConfiguredError();
  return supabase;
}

/** Read via Postgres RPC. Returns server data verbatim. */
export async function callRpc<T = unknown>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await requireSupabase().rpc(fn, args ?? {});
  if (error) throw new Error(error.message);
  return data as T;
}

/** Write / complex logic via Edge Function. */
export async function callFunction<T = unknown>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke(name, {
    body: body ?? {},
  });
  if (error) {
    // Surface the server's message verbatim where available.
    const ctx = (error as { context?: { error?: string; message?: string } }).context;
    throw new Error(ctx?.error ?? ctx?.message ?? error.message);
  }
  return data as T;
}
