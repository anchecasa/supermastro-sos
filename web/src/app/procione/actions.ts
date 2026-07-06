"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import type { CreateAppointmentInput } from "@/lib/procione/types";
import {
  executeParsedCommand,
  removeAppointmentWithGoogle,
} from "@/lib/procione/execute-intent";
import {
  createGoogleEvent,
  getValidAccessToken,
  type GoogleTokens,
} from "@/lib/procione/google-calendar";
import { parseWithGpt } from "@/lib/procione/openai";
import { getProcioneEnv, isOpenAiConfigured } from "@/lib/procione/env";
import { formatDisplayName, normalizeContactName } from "@/lib/procione/normalize";
import { upsertContact } from "@/lib/procione/upsert";

const AGENDA_PATH = "/procione/agenda";

async function requireProcioneAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    throw new Error("Accesso riservato agli admin Procione.");
  }

  return { supabase, user };
}

async function syncToGoogle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  appointment: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    starts_at: string;
    ends_at: string;
  }
) {
  const { data: tokens } = await supabase
    .from("assistant_google_tokens")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!tokens) return;

  try {
    const accessToken = await getValidAccessToken(tokens as GoogleTokens, async (access, expiresAt) => {
      await supabase
        .from("assistant_google_tokens")
        .update({ access_token: access, expires_at: expiresAt.toISOString() })
        .eq("owner_id", userId);
    });

    const googleEventId = await createGoogleEvent(
      accessToken,
      (tokens as GoogleTokens).calendar_id || "primary",
      appointment
    );

    await supabase
      .from("assistant_appointments")
      .update({ google_event_id: googleEventId })
      .eq("id", appointment.id);
  } catch {
    /* sync opzionale */
  }
}

export async function createAppointment(input: CreateAppointmentInput) {
  const { supabase, user } = await requireProcioneAdmin();

  const { data, error } = await supabase
    .from("assistant_appointments")
    .insert({
      owner_id: user.id,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      contact_name: input.contact_name ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      color: input.color ?? "orange",
      source: input.source ?? "manual",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await syncToGoogle(supabase, user.id, data);

  revalidatePath(AGENDA_PATH);
  return data;
}

export async function deleteAppointment(id: string) {
  const { supabase, user } = await requireProcioneAdmin();
  await removeAppointmentWithGoogle(supabase, user.id, id);
  revalidatePath(AGENDA_PATH);
}

export async function createContact(input: {
  full_name: string;
  company?: string;
  phone?: string;
  email?: string;
  notes?: string;
}) {
  const { supabase, user } = await requireProcioneAdmin();
  const result = await upsertContact(supabase, user.id, input);
  revalidatePath(AGENDA_PATH);
  return result.data;
}

export async function updateContact(
  id: string,
  input: {
    full_name: string;
    company?: string;
    phone?: string;
    email?: string;
    notes?: string;
  }
) {
  const { supabase, user } = await requireProcioneAdmin();
  const displayName = formatDisplayName(input.full_name);

  const { data, error } = await supabase
    .from("assistant_contacts")
    .update({
      full_name: displayName,
      normalized_name: normalizeContactName(displayName),
      company: input.company?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(AGENDA_PATH);
  return data;
}

export async function deleteContact(id: string) {
  const { supabase, user } = await requireProcioneAdmin();
  const { error } = await supabase
    .from("assistant_contacts")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath(AGENDA_PATH);
}

export async function appendVoiceLog(input: {
  role: "user" | "assistant";
  content: string;
  action_type?: "appointment" | "contact" | "task" | "query" | "multi" | "call" | "whatsapp" | "navigate" | "chat" | "draft";
}) {
  const { supabase, user } = await requireProcioneAdmin();

  const { data, error } = await supabase
    .from("assistant_voice_log")
    .insert({
      owner_id: user.id,
      role: input.role,
      content: input.content,
      action_type: input.action_type ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(AGENDA_PATH);
  return data;
}

export async function processVoiceCommand(transcript: string) {
  const { supabase, user } = await requireProcioneAdmin();

  let parsed = null;
  if (isOpenAiConfigured()) {
    const env = getProcioneEnv();
    const { loadProcioneContext } = await import("@/lib/procione/context");
    const ctx = await loadProcioneContext(supabase, user.id);
    parsed = await parseWithGpt(env.openaiKey, env.openaiModel, transcript, ctx.contextBlock);
  }

  await appendVoiceLog({ role: "user", content: transcript, action_type: "query" });

  const result = await executeParsedCommand(supabase, user.id, parsed, transcript);

  await appendVoiceLog({
    role: "assistant",
    content: result.reply,
    action_type: result.type === "unknown" ? "query" : result.type,
  });

  revalidatePath(AGENDA_PATH);
  return result;
}
