// Supabase client — server-side (service role) and client-side (anon) instances
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Public client — safe to use in browser (RLS enforced)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client — server-only, bypasses RLS. Never expose to client.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
