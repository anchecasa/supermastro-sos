import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { data: worker } = await supabase
    .from("workers")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!worker || worker.status !== "verified") {
    return NextResponse.json(
      { error: "Profilo non verificato. Attendi approvazione admin." },
      { status: 403 }
    );
  }

  const priceId = process.env.STRIPE_TRIAL_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_TRIAL_PRICE_ID non configurato" },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/artigiano?billing=success`,
    cancel_url: `${origin}/artigiano?billing=cancel`,
    metadata: {
      worker_id: worker.id,
      user_id: user.id,
      type: "trial",
    },
  });

  return NextResponse.json({ url: session.url });
}
