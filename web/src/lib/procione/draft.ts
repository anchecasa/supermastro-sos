import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateAppointmentInput } from "@/lib/procione/types";
import { upsertAppointment, upsertContact, findContactByName } from "@/lib/procione/upsert";
import { buildTaskDraftSummary, createAssistantTask } from "@/lib/procione/tasks";
import type { IntentResult } from "@/lib/procione/tools";

export type ProcioneDraftContact = {
  full_name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type ProcioneMarketingDraft = {
  title: string;
  description?: string;
  due_at?: string;
};

export type ProcioneTaskDraft = {
  title: string;
  description?: string;
  due_at?: string;
  task_type?: "reminder" | "marketing";
};

import { savePlaceFavorite, type PlaceFavorite } from "@/lib/procione/place-favorites";
import type { ConciergePlaceResult } from "@/lib/procione/concierge";

export type ProcionePlaceFavoriteDraft = {
  kind: "restaurant" | "hotel";
  name: string;
  address: string;
  city: string;
  mapsUrl: string;
  placeId?: string;
  rating?: number;
};

export type ProcioneDraft = {
  kind: "contact" | "appointment" | "multi" | "marketing" | "task" | "place_favorite";
  contact?: ProcioneDraftContact;
  appointment?: CreateAppointmentInput;
  marketing?: ProcioneMarketingDraft;
  task?: ProcioneTaskDraft;
  placeFavorite?: ProcionePlaceFavoriteDraft;
  summary: string;
};

export function buildContactDraftSummary(c: ProcioneDraftContact): string {
  const parts = [c.full_name];
  if (c.phone) parts.push(`telefono ${c.phone}`);
  if (c.company) parts.push(`azienda ${c.company}`);
  if (c.email) parts.push(`email ${c.email}`);
  return `Salvo in rubrica: ${parts.join(", ")}.`;
}

export function buildAppointmentDraftSummary(a: CreateAppointmentInput): string {
  const when = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(a.starts_at));
  let s = `Appuntamento «${a.title}» ${when}`;
  if (a.contact_name) s += ` con ${a.contact_name}`;
  if (a.location) s += ` in ${a.location}`;
  return `${s}.`;
}

export function buildDraftResult(draft: ProcioneDraft): IntentResult {
  return {
    reply: `${draft.summary} Confermi? Di' ok o clicca Conferma.`,
    type: "draft",
    draft,
    awaitingConfirm: true,
    rubricaAction: draft.contact ? "open" : undefined,
    agendaAction: draft.appointment || draft.task ? "open" : undefined,
  };
}

export async function confirmProcioneDraft(
  supabase: SupabaseClient,
  userId: string,
  draft: ProcioneDraft
): Promise<IntentResult> {
  const replies: string[] = [];
  const contacts: unknown[] = [];
  const appointments: unknown[] = [];

  if (draft.contact?.full_name) {
    const r = await upsertContact(supabase, userId, {
      full_name: draft.contact.full_name,
      company: draft.contact.company ?? undefined,
      phone: draft.contact.phone ?? undefined,
      email: draft.contact.email ?? undefined,
    });
    contacts.push(r.data);
    replies.push(r.message);
  }

  if (draft.appointment?.title && draft.appointment.starts_at && draft.appointment.ends_at) {
    const contactId = draft.contact
      ? (contacts[0] as { id?: string })?.id
      : draft.appointment.contact_name
        ? (await findContactByName(supabase, userId, draft.appointment.contact_name))?.id
        : null;

    const r = await upsertAppointment(supabase, userId, draft.appointment, contactId ?? null);
    appointments.push(r.data);
    replies.push(r.message);
  }

  if (draft.kind === "marketing" && draft.marketing?.title) {
    const { data, error } = await supabase
      .from("assistant_tasks")
      .insert({
        owner_id: userId,
        title: draft.marketing.title,
        description: draft.marketing.description ?? null,
        due_at: draft.marketing.due_at ?? null,
        task_type: "marketing",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return {
      reply: `Fatto Fernando! Promemoria campagna «${draft.marketing.title}» salvato.`,
      type: "task",
      task: data,
    };
  }

  if (draft.kind === "task" && draft.task?.title) {
    const saved = await createAssistantTask(supabase, userId, {
      title: draft.task.title,
      description: draft.task.description,
      due_at: draft.task.due_at,
      task_type: draft.task.task_type ?? "reminder",
    });
    return {
      reply: `Fatto Fernando! Promemoria n.${saved.voice_ref} «${saved.title}» memorizzato.`,
      type: "task",
      task: saved,
      agendaAction: "open",
    };
  }

  if (draft.kind === "place_favorite" && draft.placeFavorite) {
    const pf = draft.placeFavorite;
    const saved = await savePlaceFavorite(supabase, userId, {
      kind: pf.kind,
      name: pf.name,
      address: pf.address,
      city: pf.city,
      mapsUrl: pf.mapsUrl,
      placeId: pf.placeId,
      rating: pf.rating,
    } as ConciergePlaceResult & { kind: "restaurant" | "hotel"; city: string });
    return {
      reply: `Perfetto Fernando! Ho memorizzato ${pf.kind === "hotel" ? "l'albergo" : "il ristorante"} «${pf.name}» a ${pf.city}. La prossima volta te lo consiglio.`,
      type: "chat",
      placeFavorite: saved,
    };
  }

  if (contacts.length && appointments.length) {
    return {
      reply: `Fatto Fernando! ${replies.join(" ")}`,
      type: "multi",
      contacts,
      appointments,
      contact: contacts[0],
      appointment: appointments[0],
      rubricaAction: "open",
    };
  }
  if (appointments.length) {
    return { reply: replies[0] ?? "Appuntamento registrato.", type: "appointment", appointment: appointments[0] };
  }
  if (contacts.length) {
    return {
      reply: replies[0] ?? "Contatto salvato.",
      type: "contact",
      contact: contacts[0],
      rubricaAction: "open",
    };
  }

  return { reply: "Niente da salvare.", type: "unknown" };
}
