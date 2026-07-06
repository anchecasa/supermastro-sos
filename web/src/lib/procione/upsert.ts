import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateAppointmentInput } from "@/lib/procione/types";
import {
  contactNamesMatch,
  formatDisplayName,
  normalizeContactName,
  normalizeLocation,
} from "@/lib/procione/normalize";

export type UpsertContactInput = {
  full_name: string;
  company?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type UpsertAppointmentResult = {
  data: Record<string, unknown>;
  created: boolean;
  message: string;
};

export type UpsertContactResult = {
  data: Record<string, unknown>;
  created: boolean;
  message: string;
};

export async function findContactByName(
  supabase: SupabaseClient,
  userId: string,
  name: string
) {
  const normalized = normalizeContactName(name);
  const { data: contacts } = await supabase
    .from("assistant_contacts")
    .select("*")
    .eq("owner_id", userId);

  return (contacts ?? []).find(
    (c) =>
      c.normalized_name === normalized ||
      contactNamesMatch(c.full_name, name) ||
      (c.company && contactNamesMatch(c.company, name))
  );
}

export async function upsertContact(
  supabase: SupabaseClient,
  userId: string,
  input: UpsertContactInput
): Promise<UpsertContactResult> {
  const displayName = formatDisplayName(input.full_name);
  const normalized = normalizeContactName(displayName);
  const existing = await findContactByName(supabase, userId, displayName);

  if (existing) {
    const patch: Record<string, string | null> = {};
    if (!existing.phone && input.phone) patch.phone = input.phone;
    if (!existing.email && input.email) patch.email = input.email;
    if (!existing.company && input.company) patch.company = input.company;
    if (!existing.notes && input.notes) patch.notes = input.notes;

    if (Object.keys(patch).length === 0) {
      return {
        data: existing,
        created: false,
        message: `${displayName} è già in rubrica con gli stessi dati.`,
      };
    }

    const { data, error } = await supabase
      .from("assistant_contacts")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return {
      data: data!,
      created: false,
      message: `Ho aggiornato ${displayName} in rubrica.`,
    };
  }

  const { data, error } = await supabase
    .from("assistant_contacts")
    .insert({
      owner_id: userId,
      full_name: displayName,
      normalized_name: normalized,
      company: input.company ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return {
    data: data!,
    created: true,
    message: `Contatto ${displayName} salvato in agenda.`,
  };
}

export async function findSimilarAppointment(
  supabase: SupabaseClient,
  userId: string,
  input: CreateAppointmentInput
) {
  const start = new Date(input.starts_at);
  const windowStart = new Date(start.getTime() - 15 * 60_000);
  const windowEnd = new Date(start.getTime() + 15 * 60_000);
  const loc = normalizeLocation(input.location);

  const { data: rows } = await supabase
    .from("assistant_appointments")
    .select("*")
    .eq("owner_id", userId)
    .eq("status", "scheduled")
    .gte("starts_at", windowStart.toISOString())
    .lte("starts_at", windowEnd.toISOString());

  return (rows ?? []).find((a) => {
    const sameLoc = !loc || normalizeLocation(a.location) === loc || !a.location;
    const sameContact =
      !input.contact_name ||
      !a.contact_name ||
      contactNamesMatch(a.contact_name, input.contact_name);
    return sameLoc && sameContact;
  });
}

export async function upsertAppointment(
  supabase: SupabaseClient,
  userId: string,
  input: CreateAppointmentInput,
  contactId?: string | null
): Promise<UpsertAppointmentResult> {
  const existing = await findSimilarAppointment(supabase, userId, input);

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (!existing.location && input.location) patch.location = input.location;
    if (!existing.description && input.description) patch.description = input.description;
    if (!existing.contact_name && input.contact_name) patch.contact_name = input.contact_name;
    if (!existing.contact_id && contactId) patch.contact_id = contactId;

    if (Object.keys(patch).length === 0) {
      return {
        data: existing,
        created: false,
        message: `L'appuntamento "${existing.title}" è già in agenda.`,
      };
    }

    const { data, error } = await supabase
      .from("assistant_appointments")
      .update(patch)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return {
      data: data!,
      created: false,
      message: `Ho completato i dettagli di "${existing.title}".`,
    };
  }

  const { data, error } = await supabase
    .from("assistant_appointments")
    .insert({
      owner_id: userId,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      contact_name: input.contact_name ?? null,
      contact_id: contactId ?? null,
      starts_at: input.starts_at,
      ends_at: input.ends_at,
      color: input.color ?? "orange",
      source: input.source ?? "voice",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return {
    data: data!,
    created: true,
    message: `Appuntamento "${input.title}" registrato.`,
  };
}
