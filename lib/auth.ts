// NextAuth configuration — Google OAuth + Supabase adapter
// SupabaseAdapter is conditionally mounted: if env vars are absent at build time,
// the adapter is omitted and a warning is logged instead of crashing the process.
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabase = !!(supabaseUrl && supabaseServiceKey);

if (!hasSupabase) {
  console.warn(
    "[auth] Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) " +
    "are not set — SupabaseAdapter is disabled. Auth sessions will not persist to DB."
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],

  // Conditionally include the adapter only when Supabase env vars are present.
  // Spreading an empty object when absent keeps the shape identical at runtime.
  ...(hasSupabase
    ? {
        adapter: SupabaseAdapter({
          url: supabaseUrl!,
          secret: supabaseServiceKey!,
        }),
      }
    : {}),

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },
};
