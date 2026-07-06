"use server";

import { createClient } from "@/lib/supabase/server";
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
};

export async function sendMagicLink(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "client") as UserRole;
  const next = String(formData.get("next") ?? "").trim() || null;

  if (!email) {
    return { error: "Inserisci la tua email." };
  }

  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getAuthCallbackUrl(role, origin, next),
        data: { role },
      },
    });

    if (error) {
      return { error: error.message };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    if (message.includes("fetch failed") || message.includes("ENOTFOUND")) {
      return {
        error:
          "Impossibile contattare Supabase. Verifica web/.env.local e riavvia il dev server (npm run dev).",
      };
    }
    return { error: message };
  }

  return {
    success: "Controlla la tua email per il link di accesso.",
  };
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
