"use server";

import { createClient } from "@/lib/supabase/server";

export type UnlockedContact = {
  display_name: string | null;
  phone: string | null;
  email: string | null;
  role: string;
};

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

export async function cancelServiceRequest(requestId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_service_request", {
    p_request_id: requestId,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
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

export async function exportUserData() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_user_data");

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_account_deletion");

  if (error) {
    return { error: error.message };
  }

  await supabase.auth.signOut();
  return { success: true };
}
