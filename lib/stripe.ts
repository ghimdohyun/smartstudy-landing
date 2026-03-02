// Stripe singleton — defensive initialization guards against missing env vars at build time.
// If STRIPE_SECRET_KEY is absent (e.g., Vercel preview without secrets), the module
// returns null instead of throwing, so static pages can still be generated.
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";

if (!stripeKey) {
  console.warn(
    "[stripe] STRIPE_SECRET_KEY is not set — Stripe client is disabled. " +
    "Set the key in Vercel dashboard or .env.local before going to production."
  );
}

// At build time (key absent): null cast as Stripe — never executed (routes are dynamic ƒ).
// At runtime (key present): real Stripe instance.
export const stripe: Stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-02-25.clover" })
  : (null as unknown as Stripe);
