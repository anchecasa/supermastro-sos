import type { SupabaseClient } from "@supabase/supabase-js";
import type { GptParsedCommand } from "@/lib/procione/env";
import type { CreateAppointmentInput } from "@/lib/procione/types";
import {
  createGoogleEvent,
  deleteGoogleEvent,
  getValidAccessToken,
  type GoogleTokens,
} from "@/lib/procione/google-calendar";
import {
  parseAppointmentCommand,
  parseContactCommand,
  parseTodayQuery,
} from "@/lib/procione/voice-parser";

export type IntentResult = {
  reply: string;
  type: "appointment" | "contact" | "task" | "query" | "unknown";
  appointment?: unknown;
  contact?: unknown;
  task?: unknown;
};

async function syncAppointmentToGoogle(
  supabase: SupabaseClient,
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

  if (!tokens) return null;

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

  return googleEventId;
}

export async function executeParsedCommand(
  supabase: SupabaseClient,
  userId: string,
  parsed: GptParsedCommand | null,
  transcript: string
): Promise<IntentResult> {
  if (parsed?.intent && parsed.intent !== "unknown") {
    return executeGptIntent(supabase, userId, parsed);
  }

  return executeLocalParser(supabase, userId, transcript);
}

async function executeGptIntent(
  supabase: SupabaseClient,
  userId: string,
  parsed: GptParsedCommand
): Promise<IntentResult> {
  switch (parsed.intent) {
    case "create_appointment": {
      const a = parsed.appointment;
      if (!a?.title || !a.starts_at || !a.ends_at) {
        return { reply: parsed.reply || "Mi mancano data o titolo, Fernando.", type: "unknown" };
      }
      const input: CreateAppointmentInput = {
        title: a.title,
        description: a.description,
        location: a.location,
        contact_name: a.contact_name,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        source: "voice",
        color: "orange",
      };
      const { data, error } = await supabase
        .from("assistant_appointments")
        .insert({
          owner_id: userId,
          title: input.title,
          description: input.description ?? null,
          location: input.location ?? null,
          contact_name: input.contact_name ?? null,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
          color: input.color ?? "orange",
          source: "voice",
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      await syncAppointmentToGoogle(supabase, userId, data);
      return {
        reply: parsed.reply || `Fatto, Fernando! Ho registrato "${input.title}".`,
        type: "appointment",
        appointment: data,
      };
    }
    case "create_contact": {
      const c = parsed.contact;
      if (!c?.full_name) {
        return { reply: parsed.reply || "Non ho capito il nome del contatto.", type: "unknown" };
      }
      const { data, error } = await supabase
        .from("assistant_contacts")
        .insert({
          owner_id: userId,
          full_name: c.full_name,
          company: c.company ?? null,
          phone: c.phone ?? null,
          email: c.email ?? null,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return {
        reply: parsed.reply || `Contatto ${c.full_name} salvato.`,
        type: "contact",
        contact: data,
      };
    }
    case "create_task": {
      const t = parsed.task;
      if (!t?.title) {
        return { reply: parsed.reply || "Quale task devo creare?", type: "unknown" };
      }
      const { data, error } = await supabase
        .from("assistant_tasks")
        .insert({
          owner_id: userId,
          title: t.title,
          description: t.description ?? null,
          due_at: t.due_at ?? null,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return {
        reply: parsed.reply || `Task "${t.title}" aggiunto.`,
        type: "task",
        task: data,
      };
    }
    case "query_appointments":
      return {
        reply: parsed.reply || "Ecco i tuoi appuntamenti di oggi nella timeline.",
        type: "query",
      };
    default:
      return {
        reply: parsed.reply || "Non ho capito, Fernando. Riprova.",
        type: "unknown",
      };
  }
}

async function executeLocalParser(
  supabase: SupabaseClient,
  userId: string,
  transcript: string
): Promise<IntentResult> {
  const contact = parseContactCommand(transcript);
  if (contact) {
    const { data, error } = await supabase
      .from("assistant_contacts")
      .insert({
        owner_id: userId,
        full_name: contact.full_name,
        company: contact.company ?? null,
        phone: contact.phone ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return {
      reply: `Contatto ${contact.full_name} salvato${contact.phone ? ` (${contact.phone})` : ""}.`,
      type: "contact",
      contact: data,
    };
  }

  const appointment = parseAppointmentCommand(transcript);
  if (appointment) {
    const { data, error } = await supabase
      .from("assistant_appointments")
      .insert({
        owner_id: userId,
        title: appointment.title,
        contact_name: appointment.contact_name ?? null,
        starts_at: appointment.starts_at,
        ends_at: appointment.ends_at,
        color: appointment.color ?? "orange",
        source: "voice",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await syncAppointmentToGoogle(supabase, userId, data);
    return {
      reply: `Fatto, Fernando! Ho registrato "${appointment.title}".`,
      type: "appointment",
      appointment: data,
    };
  }

  if (parseTodayQuery(transcript)) {
    return { reply: "Ecco i tuoi appuntamenti di oggi nella timeline.", type: "query" };
  }

  return {
    reply: 'Non ho capito. Prova: «Procione, segna sopralluogo con Rossi per domani alle 15».',
    type: "unknown",
  };
}

export async function removeAppointmentWithGoogle(
  supabase: SupabaseClient,
  userId: string,
  appointmentId: string
) {
  const { data: appt } = await supabase
    .from("assistant_appointments")
    .select("google_event_id")
    .eq("id", appointmentId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (appt?.google_event_id) {
    const { data: tokens } = await supabase
      .from("assistant_google_tokens")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();

    if (tokens) {
      try {
        const accessToken = await getValidAccessToken(tokens as GoogleTokens, async (access, expiresAt) => {
          await supabase
            .from("assistant_google_tokens")
            .update({ access_token: access, expires_at: expiresAt.toISOString() })
            .eq("owner_id", userId);
        });
        await deleteGoogleEvent(
          accessToken,
          (tokens as GoogleTokens).calendar_id || "primary",
          appt.google_event_id
        );
      } catch {
        // non bloccare eliminazione locale
      }
    }
  }

  const { error } = await supabase
    .from("assistant_appointments")
    .delete()
    .eq("id", appointmentId)
    .eq("owner_id", userId);

  if (error) throw new Error(error.message);
}
