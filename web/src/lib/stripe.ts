import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY mancante");
    stripe = new Stripe(key);
  }
  return stripe;
}

export const TRIAL_CREDITS = 5;
export const PAID_CREDITS = 5;
export const PAID_PACKAGE_LABEL = "Pacchetto 5 crediti";
