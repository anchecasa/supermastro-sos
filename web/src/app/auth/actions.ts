"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import {
  getAuthCallbackUrl,
  REGISTRATION_CONSENT_PURPOSE,
  type UserRole,
} from "@/lib/constants";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type AuthActionState = {
  error?: string;
  success?: string;
  directLink?: string;
};

function translateAuthError(message: string): string {
  const rateMatch = message.match(/after (\d+) seconds?/i);
  if (rateMatch) {
    return `Per sicurezza, attendi ${rateMatch[1]} secondi prima di richiedere un nuovo link.`;
  }
  if (message.toLowerCase().includes("rate limit")) {
    return "Troppi tentativi. Attendi un minuto e riprova.";
  }
  if (message.toLowerCase().includes("invalid email")) {
    return "Indirizzo email non valido.";
  }
  return message;
}

export async function sendMagicLink(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "client") as UserRole;
  const next = String(formData.get("next") ?? "").trim() || null;

  if (!email) {
    return { error: "Inserisci la tua email." };
  }

  if (next?.startsWith("/procione") && !isAdminEmail(email)) {
    return { error: "Questa area è riservata agli admin Procione." };
  }

  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  try {
    const redirectTo = getAuthCallbackUrl(role, origin, next);
    const admin = createAdminClient();

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (error || !data?.properties?.hashed_token) {
      return { error: translateAuthError(error?.message ?? "Link non generato.") };
    }

    const joiner = redirectTo.includes("?") ? "&" : "?";
    const directLink = `${redirectTo}${joiner}token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=magiclink`;

    return {
      success: "Clicca il pulsante verde qui sotto per entrare (link valido una sola volta).",
      directLink,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return { error: "Configura SUPABASE_SERVICE_ROLE_KEY in web/.env.local" };
    }
    if (message.includes("fetch failed") || message.includes("ENOTFOUND")) {
      return {
        error:
          "Impossibile contattare Supabase. Verifica web/.env.local e riavvia il dev server.",
      };
    }
    return { error: message };
  }
}

export async function signOut(redirectTo: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(redirectTo);
}

export async function logRegistrationConsent() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_registration_consent", {
    p_purpose: REGISTRATION_CONSENT_PURPOSE,
    p_version: "1.0",
  });

  if (error) {
    console.error("consent log failed:", error.message);
  }
}
