import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProcioneUserContext } from "@/lib/procione/context";
import type { CreateAppointmentInput } from "@/lib/procione/types";
import {
  createGoogleEvent,
  deleteGoogleEvent,
  getValidAccessToken,
  updateGoogleEvent,
  type GoogleTokens,
} from "@/lib/procione/google-calendar";
import { contactNamesMatch } from "@/lib/procione/normalize";
import { findContactByName, upsertAppointment, upsertContact } from "@/lib/procione/upsert";
import {
  buildAppointmentDraftSummary,
  buildContactDraftSummary,
  buildDraftResult,
  type ProcioneDraft,
} from "@/lib/procione/draft";
import {
  buildAliasMap,
  enrichContactsWithAliases,
  parseDefaultAppointmentTime,
} from "@/lib/procione/user-memory";
import {
  parseAppointmentCommand,
  parseAgendaQuery,
  parseCallCommand,
  parseCombinedVoiceCommand,
  parseContactCommand,
  parseRubricaVoiceCommand,
  parseSuperMastroCommand,
  parseTodayQuery,
  PHONE_RE,
  splitVoiceCommands,
} from "@/lib/procione/voice-parser";
import {
  parseOpenAgendaCommand,
  parseTaskCommand,
  parseTaskCompleteCommand,
  parseTaskDeleteCommand,
  parseTaskModifyCommand,
  parseTaskQuery,
} from "@/lib/procione/task-voice";
import {
  buildTaskDraftSummary,
  deleteAssistantTask,
  findTaskByHint,
  formatTaskListReply,
  loadOpenTasks,
  taskMatchesHint,
  updateAssistantTask,
} from "@/lib/procione/tasks";

export type IntentResult = {
  reply: string;
  type:
    | "appointment"
    | "contact"
    | "task"
    | "query"
    | "multi"
    | "call"
    | "whatsapp"
    | "navigate"
    | "chat"
    | "draft"
    | "unknown";
  appointment?: unknown;
  contact?: unknown;
  appointments?: unknown[];
  contacts?: unknown[];
  task?: unknown;
  tasks?: unknown[];
  call?: { phone: string; name: string };
  whatsapp?: { phone: string; name: string; message: string; url: string };
  rubricaAction?: "open" | "add" | "search";
  rubricaSearch?: string;
  agendaAction?: "open";
  navigate?: { url: string; label: string };
  draft?: ProcioneDraft;
  awaitingConfirm?: boolean;
  sessionActive?: boolean;
  dataMode?: "real" | "meeting_demo";
  meetingContext?: { destination?: string; when?: string };
  demoSnapshot?: Record<string, number | string>;
  lastConciergeSearch?: import("@/lib/procione/concierge").ConciergeSearchResult;
  concierge?: import("@/lib/procione/concierge").ConciergeSearchResult;
  placeFavorite?: import("@/lib/procione/place-favorites").PlaceFavorite;
};

async function getGoogleAccess(supabase: SupabaseClient, userId: string) {
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

  return { accessToken, calendarId: (tokens as GoogleTokens).calendar_id || "primary", tokens };
}

async function syncApptGoogle(
  supabase: SupabaseClient,
  userId: string,
  appt: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    starts_at: string;
    ends_at: string;
    google_event_id?: string | null;
  },
  mode: "create" | "update" | "delete"
) {
  const g = await getGoogleAccess(supabase, userId);
  if (!g) return;

  try {
    if (mode === "delete" && appt.google_event_id) {
      await deleteGoogleEvent(g.accessToken, g.calendarId, appt.google_event_id);
      return;
    }
    if (mode === "update" && appt.google_event_id) {
      await updateGoogleEvent(g.accessToken, g.calendarId, appt.google_event_id, appt);
      return;
    }
    if (mode === "create") {
      const googleEventId = await createGoogleEvent(g.accessToken, g.calendarId, appt);
      await supabase
        .from("assistant_appointments")
        .update({ google_event_id: googleEventId })
        .eq("id", appt.id);
    }
  } catch {
    /* sync opzionale */
  }
}

function parseWhatsAppCommand(
  transcript: string,
  contacts: { full_name: string; phone: string | null }[]
): { phone: string; name: string; message: string } | null {
  const t = transcript.toLowerCase();
  if (!/(whatsapp|whats app|messaggio|scrivi|manda)/.test(t)) return null;

  let message = "Ciao!";
  const msgMatch = transcript.match(/(?:messaggio|scrivi|dì|di')\s*[:\s]+(.+)/i);
  if (msgMatch) message = msgMatch[1].trim();

  for (const c of contacts) {
    if (!c.phone) continue;
    const parts = c.full_name.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
    if (parts.some((p) => t.includes(p))) {
      return { phone: c.phone.replace(/\s+/g, ""), name: c.full_name, message };
    }
  }

  const phoneMatch = transcript.match(PHONE_RE);
  if (phoneMatch) {
    return { phone: phoneMatch[1].replace(/\s+/g, ""), name: "contatto", message };
  }
  return null;
}

function parseRescheduleCommand(transcript: string) {
  const t = transcript.toLowerCase();
  if (!/(sposta|posticipa|anticipa|alle\s+\d|invece\s+delle|ritardo)/.test(t)) return null;

  const timeMatch = transcript.match(/(?:alle|ore|h)\s*(\d{1,2})(?:[:.](\d{2}))?/i);
  const contactMatch = transcript.match(/(?:appuntamento|incontro|riunione).*?(?:con|di)\s+([A-Za-zÀ-ÿ\s']+)/i);
  const bulkToday = /sposta.*(oggi|di oggi).*(domani)/i.test(t);

  return {
    hour: timeMatch ? Number(timeMatch[1]) : undefined,
    minute: timeMatch?.[2] ? Number(timeMatch[2]) : 0,
    contactHint: contactMatch?.[1]?.trim(),
    bulkTodayTomorrow: bulkToday,
  };
}

function parseCancelCommand(transcript: string) {
  const t = transcript.toLowerCase();
  if (!/(annulla|cancella|elimina|rimuovi)/.test(t) || !/appuntament|incontro|riunione/.test(t)) {
    return null;
  }
  const contactMatch = transcript.match(/(?:con|di)\s+([A-Za-zÀ-ÿ\s']+)/i);
  return { contactHint: contactMatch?.[1]?.trim() };
}

function isSmallTalk(transcript: string) {
  const t = transcript.toLowerCase();
  if (parseAgendaQuery(transcript)) return false;
  if (parseSuperMastroCommand(transcript)) return false;
  return (
    /come stai|tutto a posto|ciao procione|ehi ehi|buongiorno|buonasera/.test(t) &&
    !/appuntament|contatto|sposta|annulla|chiama|whatsapp|segna|fissa|memorizza|agenda|cosa ho|che ho/.test(t)
  );
}

export async function executeVoiceCommand(
  supabase: SupabaseClient,
  userId: string,
  transcript: string,
  ctx: ProcioneUserContext
): Promise<IntentResult> {
  const { data: contactsRows } = await supabase
    .from("assistant_contacts")
    .select("full_name, phone")
    .eq("owner_id", userId);

  const contacts = enrichContactsWithAliases(contactsRows ?? [], ctx.userMemory);
  const aliasMap = buildAliasMap(ctx.userMemory);
  const defaultTime = parseDefaultAppointmentTime(ctx.userMemory);

  const superMastro = parseSuperMastroCommand(transcript);
  if (superMastro) {
    return {
      reply: superMastro.reply,
      type: "navigate",
      navigate: { url: superMastro.url, label: superMastro.label },
    };
  }

  const openAgenda = parseOpenAgendaCommand(transcript);
  if (openAgenda) {
    return { reply: openAgenda.reply, type: "query", agendaAction: "open" };
  }

  const taskDelete = parseTaskDeleteCommand(transcript);
  if (taskDelete) {
    return deleteTaskByVoice(supabase, userId, taskDelete.hint);
  }

  const taskComplete = parseTaskCompleteCommand(transcript);
  if (taskComplete) {
    return completeTaskByVoice(supabase, userId, taskComplete.hint);
  }

  const taskModify = parseTaskModifyCommand(transcript);
  if (taskModify) {
    return modifyTaskByVoice(supabase, userId, taskModify);
  }

  const taskQuery = parseTaskQuery(transcript);
  if (taskQuery) {
    return queryTasksByVoice(supabase, userId, taskQuery);
  }

  const taskDraft = parseTaskCommand(transcript);
  if (taskDraft) {
    return buildDraftResult({
      kind: "task",
      task: taskDraft,
      summary: buildTaskDraftSummary(taskDraft),
    });
  }

  const rubricaCmd = parseRubricaVoiceCommand(transcript);
  if (rubricaCmd) {
    const replies: Record<string, string> = {
      open: "Apro la rubrica.",
      add: "Apro la rubrica. Dimmi nome e numero da memorizzare.",
      search: `Cerco ${rubricaCmd.searchQuery ?? ""} in rubrica.`,
    };
    return {
      reply: replies[rubricaCmd.action],
      type: "query",
      rubricaAction: rubricaCmd.action,
      rubricaSearch: rubricaCmd.searchQuery,
    };
  }

  const wa = parseWhatsAppCommand(transcript, contacts);
  if (wa) {
    const url = `https://wa.me/${wa.phone.replace(/\D/g, "")}?text=${encodeURIComponent(wa.message)}`;
    return {
      reply: `Ok Fernando, apro WhatsApp per ${wa.name}.`,
      type: "whatsapp",
      whatsapp: { ...wa, url },
      rubricaAction: "open",
    };
  }

  const call = parseCallCommand(transcript, contacts, aliasMap);
  if (call) {
    return {
      reply: `Chiamo ${call.name}.`,
      type: "call",
      call,
      rubricaAction: "open",
    };
  }

  if (isSmallTalk(transcript)) {
    return {
      reply: `Ciao Fernando! ${ctx.summaryText} Come posso aiutarti?`,
      type: "chat",
      agendaAction: "open",
      sessionActive: true,
    };
  }

  const agendaPeriod = parseAgendaQuery(transcript);
  if (agendaPeriod) {
    const { buildAgendaQueryReply } = await import("@/lib/procione/context");
    const reply = await buildAgendaQueryReply(supabase, userId, agendaPeriod);
    return { reply, type: "query", agendaAction: "open" };
  }

  const cancel = parseCancelCommand(transcript);
  if (cancel) {
    return cancelAppointment(supabase, userId, cancel.contactHint, transcript);
  }

  const reschedule = parseRescheduleCommand(transcript);
  if (reschedule?.bulkTodayTomorrow) {
    return bulkMoveTodayToTomorrow(supabase, userId);
  }
  if (reschedule) {
    return rescheduleAppointment(supabase, userId, reschedule);
  }

  return executeCreateCommands(supabase, userId, transcript, defaultTime);
}

async function queryTasksByVoice(
  supabase: SupabaseClient,
  userId: string,
  query: import("@/lib/procione/task-voice").TaskQueryIntent
): Promise<IntentResult> {
  let tasks = await loadOpenTasks(supabase, userId, 50);

  if (query.filter === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    tasks = tasks.filter((t) => t.due_at && new Date(t.due_at) >= start && new Date(t.due_at) <= end);
  } else if (query.filter === "week") {
    const end = new Date();
    end.setDate(end.getDate() + 7);
    tasks = tasks.filter((t) => !t.due_at || new Date(t.due_at) <= end);
  }

  if (query.search) {
    tasks = tasks.filter((t) => taskMatchesHint(t, query.search!));
  }

  return {
    reply: formatTaskListReply(tasks),
    type: "query",
    agendaAction: "open",
    tasks,
  };
}

async function deleteTaskByVoice(
  supabase: SupabaseClient,
  userId: string,
  hint: string
): Promise<IntentResult> {
  const task = await findTaskByHint(supabase, userId, hint);
  if (!task) {
    return { reply: "Non trovo quel promemoria.", type: "unknown" };
  }
  await deleteAssistantTask(supabase, userId, task.id);
  return {
    reply: `Eliminato promemoria n.${task.voice_ref ?? "?"} «${task.title}».`,
    type: "task",
    task: { ...task, deleted: true },
    agendaAction: "open",
  };
}

async function completeTaskByVoice(
  supabase: SupabaseClient,
  userId: string,
  hint: string
): Promise<IntentResult> {
  const task = await findTaskByHint(supabase, userId, hint);
  if (!task) {
    return { reply: "Non trovo quel promemoria.", type: "unknown" };
  }
  const updated = await updateAssistantTask(supabase, userId, task.id, { completed: true });
  return {
    reply: `Segnato come fatto: «${updated.title}».`,
    type: "task",
    task: updated,
    agendaAction: "open",
  };
}

async function modifyTaskByVoice(
  supabase: SupabaseClient,
  userId: string,
  patch: { hint: string; title?: string; description?: string; due_at?: string }
): Promise<IntentResult> {
  const task = await findTaskByHint(supabase, userId, patch.hint);
  if (!task) {
    return { reply: "Non trovo quel promemoria da modificare.", type: "unknown" };
  }

  const updates: Partial<{ title: string; description: string; due_at: string }> = {};
  if (patch.title) updates.title = patch.title;
  if (patch.description) updates.description = patch.description;
  if (patch.due_at) updates.due_at = patch.due_at;

  if (!Object.keys(updates).length) {
    return {
      reply: `Promemoria n.${task.voice_ref ?? "?"} «${task.title}». Cosa vuoi cambiare? Data, titolo o contenuto.`,
      type: "query",
      agendaAction: "open",
    };
  }

  const updated = await updateAssistantTask(supabase, userId, task.id, updates);
  return {
    reply: `Aggiornato promemoria n.${updated.voice_ref ?? "?"} «${updated.title}».`,
    type: "task",
    task: updated,
    agendaAction: "open",
  };
}

async function cancelAppointment(
  supabase: SupabaseClient,
  userId: string,
  contactHint: string | undefined,
  transcript: string
) {
  const { data: rows } = await supabase
    .from("assistant_appointments")
    .select("*")
    .eq("owner_id", userId)
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(20);

  const target =
    (rows ?? []).find((a) => contactHint && a.contact_name && contactNamesMatch(a.contact_name, contactHint)) ??
    (rows ?? [])[0];

  if (!target) {
    return { reply: "Non trovo appuntamenti da annullare.", type: "unknown" as const };
  }

  await syncApptGoogle(supabase, userId, target, "delete");
  await supabase
    .from("assistant_appointments")
    .update({ status: "cancelled" })
    .eq("id", target.id);

  return {
    reply: `Ho annullato "${target.title}"${target.contact_name ? ` con ${target.contact_name}` : ""}.`,
    type: "appointment" as const,
    appointment: { ...target, status: "cancelled" },
  };
}

async function rescheduleAppointment(
  supabase: SupabaseClient,
  userId: string,
  hint: { hour?: number; minute?: number; contactHint?: string }
) {
  const { data: rows } = await supabase
    .from("assistant_appointments")
    .select("*")
    .eq("owner_id", userId)
    .eq("status", "scheduled")
    .gte("starts_at", new Date(Date.now() - 3600000).toISOString())
    .order("starts_at")
    .limit(20);

  const target =
    (rows ?? []).find(
      (a) => hint.contactHint && a.contact_name && contactNamesMatch(a.contact_name, hint.contactHint)
    ) ?? (rows ?? [])[0];

  if (!target || hint.hour === undefined) {
    return { reply: "Non ho capito quale appuntamento spostare.", type: "unknown" as const };
  }

  const start = new Date(target.starts_at);
  start.setHours(hint.hour, hint.minute ?? 0, 0, 0);
  const end = new Date(target.ends_at);
  const duration = end.getTime() - new Date(target.starts_at).getTime();
  const newEnd = new Date(start.getTime() + duration);

  const { data, error } = await supabase
    .from("assistant_appointments")
    .update({ starts_at: start.toISOString(), ends_at: newEnd.toISOString() })
    .eq("id", target.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  await syncApptGoogle(supabase, userId, data, "update");

  return {
    reply: `Spostato "${target.title}" alle ${new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(start)}.`,
    type: "appointment" as const,
    appointment: data,
  };
}

async function bulkMoveTodayToTomorrow(supabase: SupabaseClient, userId: string) {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const { data: rows } = await supabase
    .from("assistant_appointments")
    .select("*")
    .eq("owner_id", userId)
    .eq("status", "scheduled")
    .gte("starts_at", start.toISOString())
    .lte("starts_at", end.toISOString());

  if (!rows?.length) {
    return { reply: "Non hai appuntamenti oggi da spostare.", type: "unknown" as const };
  }

  const updated: unknown[] = [];
  for (const row of rows) {
    const s = new Date(row.starts_at);
    s.setDate(s.getDate() + 1);
    const e = new Date(row.ends_at);
    e.setDate(e.getDate() + 1);
    const { data } = await supabase
      .from("assistant_appointments")
      .update({ starts_at: s.toISOString(), ends_at: e.toISOString() })
      .eq("id", row.id)
      .select("*")
      .single();
    if (data) {
      await syncApptGoogle(supabase, userId, data, "update");
      updated.push(data);
    }
  }

  return {
    reply: `Ho spostato ${updated.length} appuntament${updated.length === 1 ? "o" : "i"} di oggi a domani.`,
    type: "multi" as const,
    appointments: updated,
  };
}

async function executeCreateCommands(
  supabase: SupabaseClient,
  userId: string,
  transcript: string,
  defaultTime?: { hour: number; minute: number }
) {
  const combined = parseCombinedVoiceCommand(transcript, new Date(), defaultTime);
  let draftContact: ProcioneDraft["contact"];
  let draftAppointment: ProcioneDraft["appointment"];

  if (combined.contact?.full_name) {
    draftContact = {
      full_name: combined.contact.full_name,
      company: combined.contact.company ?? null,
      phone: combined.contact.phone ?? null,
      email: null,
    };
  }

  if (combined.appointment) {
    draftAppointment = combined.appointment;
  }

  if (!draftContact && !draftAppointment) {
    for (const segment of splitVoiceCommands(transcript)) {
      const c = parseContactCommand(segment);
      if (c?.full_name) {
        draftContact = {
          full_name: c.full_name,
          company: c.company ?? null,
          phone: c.phone ?? null,
          email: null,
        };
        continue;
      }
      const a = parseAppointmentCommand(segment, new Date(), defaultTime);
      if (a) draftAppointment = a;
    }
  }

  if (draftContact && draftAppointment) {
    const summary = `${buildContactDraftSummary(draftContact)} ${buildAppointmentDraftSummary(draftAppointment)}`;
    return buildDraftResult({ kind: "multi", contact: draftContact, appointment: draftAppointment, summary });
  }
  if (draftAppointment) {
    return buildDraftResult({
      kind: "appointment",
      appointment: draftAppointment,
      summary: buildAppointmentDraftSummary(draftAppointment),
    });
  }
  if (draftContact) {
    return buildDraftResult({
      kind: "contact",
      contact: draftContact,
      summary: buildContactDraftSummary(draftContact),
    });
  }

  return {
    reply:
      'Prova: «Fissa appuntamento domani alle 10 con Quintini in via Po 31 e memorizza contatto Quintini numero 333 1234567».',
    type: "unknown" as const,
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
    const g = await getGoogleAccess(supabase, userId);
    if (g) {
      try {
        await deleteGoogleEvent(g.accessToken, g.calendarId, appt.google_event_id);
      } catch {
        /* ignore */
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
