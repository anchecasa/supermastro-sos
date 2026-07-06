import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, PAID_CREDITS } from "@/lib/stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = (await headers()).get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: idemError } = await admin.from("stripe_events").insert({
    event_id: event.id,
    event_type: event.type,
  });

  if (idemError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const workerId = session.metadata?.worker_id;
    const checkoutType = session.metadata?.type ?? "trial";

    if (workerId) {
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id;

      await admin.from("billing_accounts").upsert(
        {
          worker_id: workerId,
          stripe_customer_id: customerId ?? null,
        },
        { onConflict: "worker_id" }
      );

      let fingerprint: string | null = null;
      if (session.payment_intent) {
        const piId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent.id;
        try {
          const pi = await getStripe().paymentIntents.retrieve(piId, {
            expand: ["payment_method"],
          });
          const pm = pi.payment_method as Stripe.PaymentMethod | null;
          fingerprint = pm?.card?.fingerprint ?? null;
        } catch {
          /* optional */
        }
      }

      if (checkoutType === "paid_package") {
        await admin.rpc("grant_paid_credits", {
          p_worker_id: workerId,
          p_reference: session.id,
          p_amount: PAID_CREDITS,
        });
      } else {
        if (fingerprint) {
          const { error: fpError } = await admin.rpc("record_trial_card_fingerprint", {
            p_worker_id: workerId,
            p_fingerprint: fingerprint,
            p_session_id: session.id,
          });
          if (fpError) {
            return NextResponse.json({ error: fpError.message }, { status: 409 });
          }
        }

        await admin.rpc("grant_trial_credits", {
          p_worker_id: workerId,
          p_reference: session.id,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
