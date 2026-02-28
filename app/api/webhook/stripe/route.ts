// Stripe webhook handler — verifies signature, upgrades user plan on payment
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// App Router: disable body parsing so we can read the raw bytes for sig verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Webhook signature verification failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Handle payment success — upgrade user plan to pro
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const customerEmail =
      session.customer_email ?? session.customer_details?.email ?? null;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : (session.customer as Stripe.Customer | null)?.id ?? null;

    if (customerEmail) {
      await supabaseAdmin
        .from("users")
        .update({ plan_type: "pro", stripe_customer_id: customerId })
        .eq("email", customerEmail);
    }
  }

  // Handle subscription cancellation — downgrade to beta
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId =
      typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    await supabaseAdmin
      .from("users")
      .update({ plan_type: "free" })
      .eq("stripe_customer_id", customerId);
  }

  return NextResponse.json({ received: true });
}
