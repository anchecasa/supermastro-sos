"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAuthCallbackUrl } from "@/lib/constants";
import type { AuthActionState } from "@/app/auth/actions";
import { translateAuthError } from "@/app/auth/errors";
import type { AvailabilityType, OrganizationType } from "@/lib/constants";
import {
  WORKER_SKILL_SLUGS,
  validateItalianVat,
  type TalentType,
} from "@/lib/worker-skills";

export type TalentOnboardingState = { error?: string; success?: string };
export type EmployerActionState = { error?: string; success?: string; jobId?: string };
export type JobResponseState = { error?: string; success?: string };

/** Invia email di conferma (Supabase Auth) per accedere e pubblicare un annuncio datore. */
export async function sendEmployerConfirmationEmail(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { error: "Inserisci la tua email." };
  }

  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const redirectTo = getAuthCallbackUrl("client", origin, "/lavoro/assumi");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  return {
    success:
      "Ti abbiamo inviato un'email di conferma con il logo SuperMastro. Clicca il pulsante nell'email per accedere e pubblicare l'annuncio.",
  };
}

export async function submitTalentOnboarding(
  _prev: TalentOnboardingState,
  formData: FormData
): Promise<TalentOnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Accedi per completare il profilo." };
  }

  const talentType = String(formData.get("talent_type") ?? "employee") as TalentType;
  const displayName = String(formData.get("display_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? user.email ?? "").trim();
  const cap = String(formData.get("cap") ?? "").trim();
  const comune = String(formData.get("comune") ?? "").trim() || null;
  const radius = Number(formData.get("service_radius_km") ?? 30);
  const photoUrl = String(formData.get("photo_url") ?? "").trim() || null;
  const vatNumber = String(formData.get("vat_number") ?? "").trim() || null;
  const availability = String(formData.get("availability") ?? "flexible") as AvailabilityType;

  const skills = WORKER_SKILL_SLUGS.filter((s) => formData.get(`skill_${s}`) === "on");

  if (!displayName || !bio || !phone || !email || !cap) {
    return { error: "Compila tutti i campi obbligatori." };
  }
  if (skills.length === 0) {
    return { error: "Seleziona almeno una competenza." };
  }
  if (talentType === "artisan") {
    if (!vatNumber || !validateItalianVat(vatNumber)) {
      return { error: "Inserisci una Partita IVA valida (11 cifre)." };
    }
  }
  if (radius < 5 || radius > 100) {
    return { error: "Raggio operativo tra 5 e 100 km." };
  }

  const { error: contactError } = await supabase.rpc("upsert_worker_contact", {
    p_phone: phone,
    p_email: email,
  });

  if (contactError) {
    return { error: contactError.message };
  }

  const { error: profileError } = await supabase.rpc("submit_worker_profile", {
    p_display_name: displayName,
    p_bio: bio,
    p_photo_url: photoUrl,
    p_cap: cap,
    p_comune: comune,
    p_service_radius_km: radius,
    p_skill_slugs: skills,
    p_talent_type: talentType,
    p_vat_number: vatNumber,
    p_availability: availability,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath("/supermastro/profilo");
  redirect("/supermastro/profilo");
}

export async function submitEmployerJobRequest(
  _prev: EmployerActionState,
  formData: FormData
): Promise<EmployerActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Accedi per pubblicare una richiesta." };
  }

  const orgType = String(formData.get("org_type") ?? "company") as OrganizationType;
  const orgName = String(formData.get("org_name") ?? "").trim();
  const referentName = String(formData.get("referent_name") ?? "").trim();
  const cap = String(formData.get("cap") ?? "").trim();
  const comune = String(formData.get("comune") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? user.email ?? "").trim();
  const skillSlug = String(formData.get("skill_slug") ?? "").trim();
  const roleTitle = String(formData.get("role_title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const hoursPerWeek = formData.get("hours_per_week")
    ? Number(formData.get("hours_per_week"))
    : null;
  const availability = formData.get("availability")
    ? (String(formData.get("availability")) as AvailabilityType)
    : null;
  const searchRadius = Number(formData.get("search_radius_km") ?? 30);

  if (!orgName || !referentName || !cap || !phone || !email || !skillSlug || !roleTitle) {
    return { error: "Compila tutti i campi obbligatori." };
  }

  const { data: jobId, error } = await supabase.rpc("submit_employer_request", {
    p_org_type: orgType,
    p_org_name: orgName,
    p_referent_name: referentName,
    p_cap: cap,
    p_comune: comune,
    p_phone: phone,
    p_email: email,
    p_skill_slug: skillSlug,
    p_role_title: roleTitle,
    p_description: description,
    p_hours_per_week: hoursPerWeek,
    p_availability: availability,
    p_search_radius_km: searchRadius,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/lavoro/assumi");
  return {
    success:
      "Richiesta inviata. Il team AncheCasa la revisiona e avvia la shortlist candidati in zona.",
    jobId: jobId as string,
  };
}

export async function respondToJobInvitation(
  candidateId: string,
  accept: boolean
): Promise<JobResponseState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_job_invitation", {
    p_candidate_id: candidateId,
    p_accept: accept,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/supermastro/profilo");
  return { success: accept ? "Hai accettato l'opportunità." : "Invito declinato." };
}
