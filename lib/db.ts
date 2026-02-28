// Supabase client — server-side (service role) and client-side (anon) instances
// Guards against missing env vars at build time: createClient is only called when
// URL is present, preventing "supabaseUrl is required" errors during static analysis.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl) {
  console.warn(
    "[db] NEXT_PUBLIC_SUPABASE_URL is not set — Supabase clients are disabled. " +
    "Set env vars in Vercel dashboard or .env.local before deploying to production."
  );
}

// Public client — safe to use in browser (RLS enforced)
// At build time (no env vars): evaluates to null cast as SupabaseClient.
// At runtime: real client is returned. API routes are dynamic (ƒ), never pre-rendered.
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);

// Admin client — server-only, bypasses RLS. Never expose to client.
export const supabaseAdmin: SupabaseClient = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : (null as unknown as SupabaseClient);
