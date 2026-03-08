// Stripe Checkout session creator — returns a redirect URL for payment
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";

// Price IDs — set these in Stripe dashboard, then add to env
const PRICE_IDS: Record<string, string> = {
  basic: process.env.STRIPE_PRICE_BASIC ?? "",
  pro: process.env.STRIPE_PRICE_PRO ?? "",
};

export async function POST(req: NextRequest) {
  // Runtime guard — Stripe key missing (env var not set in this environment)
  if (!stripe) {
    console.error("[checkout] STRIPE_SECRET_KEY missing — request blocked");
    return NextResponse.json(
      { error: "Stripe Key Missing: 결제 서비스가 현재 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({})) as { plan?: string };
  const plan = body.plan === "basic" ? "basic" : "pro";
  const priceId = PRICE_IDS[plan];

  if (!priceId) {
    return NextResponse.json(
      { error: `${plan} 플랜의 Stripe Price ID가 설정되지 않았습니다.` },
      { status: 503 }
    );
  }

  const origin = req.headers.get("origin") ?? "https://dreamhelixion.com";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: session.user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/plan?upgraded=1`,
    cancel_url: `${origin}/#pricing`,
    metadata: { userId: session.user.id, plan },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
