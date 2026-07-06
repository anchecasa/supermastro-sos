import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: candidates, error } = await admin.rpc("process_monthly_trial_refund_candidates");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stripe = process.env.STRIPE_SECRET_KEY ? getStripe() : null;
  const refunded: string[] = [];

  for (const row of candidates ?? []) {
    if (Number(row.matches_in_month) > 0) continue;
    if (!row.checkout_session_id || !stripe) continue;

    try {
      const session = await stripe.checkout.sessions.retrieve(row.checkout_session_id);
      const paymentIntent =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;

      if (paymentIntent) {
        const pi = await stripe.paymentIntents.retrieve(paymentIntent);
        if (pi.latest_charge && typeof pi.latest_charge === "string") {
          await stripe.refunds.create({ charge: pi.latest_charge });
          refunded.push(row.worker_id);
        }
      }
    } catch (err) {
      console.error("Trial refund failed", row.worker_id, err);
    }
  }

  return NextResponse.json({ candidates: candidates?.length ?? 0, refunded: refunded.length, ids: refunded });
}
