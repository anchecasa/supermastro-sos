"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notifyClientMatchSms } from "@/lib/match-notify";
import { submitTalentOnboarding, type TalentOnboardingState } from "@/app/lavoro/actions";

export type OnboardingState = TalentOnboardingState;
export type InvitationActionState = { error?: string };

export type UnlockedContact = {
  display_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
};

/** @deprecated Usare submitTalentOnboarding da @/app/lavoro/actions */
export async function submitWorkerOnboarding(
  prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  return submitTalentOnboarding(prev, formData);
}

export async function acceptInvitation(
  invitationId: string
): Promise<InvitationActionState> {
  const supabase = await createClient();
  const { data: matchId, error } = await supabase.rpc("accept_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    return { error: error.message };
  }

  if (matchId) {
    await notifyClientMatchSms(String(matchId)).catch(() => null);
  }

  revalidatePath("/artigiano/inviti");
  redirect(`/artigiano/match/${matchId}`);
}

export async function rejectInvitation(
  invitationId: string
): Promise<InvitationActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reject_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/artigiano/inviti");
  return {};
}

export async function unlockMatchContact(
  matchId: string
): Promise<{ data?: UnlockedContact; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unlock_contact", {
    p_match_id: matchId,
  });

  if (error) {
    return { error: error.message };
  }

  return { data: data as UnlockedContact };
}

export async function openDispute(
  matchId: string,
  type: string,
  description: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_dispute", {
    p_match_id: matchId,
    p_type: type,
    p_description: description,
  });

  if (error) {
    return { error: error.message };
  }

  return { id: data as string };
}
