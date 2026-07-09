import type { AgendaQueryPeriod } from "@/lib/procione/context";
import type { CreateTaskInput } from "@/lib/procione/types";
import { DATE_RE, TIME_RE } from "@/lib/procione/voice-parser";

function nextWeekday(target: number, from: Date): Date {
  const d = new Date(from);
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseItalianDate(token: string, base: Date): Date {
  const lower = token.toLowerCase();
  const result = new Date(base);
  result.setSeconds(0, 0);

  if (lower.includes("domani")) {
    result.setDate(result.getDate() + 1);
    return result;
  }
  if (lower.includes("dopodomani")) {
    result.setDate(result.getDate() + 2);
    return result;
  }
  if (lower.includes("oggi")) return result;

  const weekdays: Record<string, number> = {
    domenica: 0,
    lunedì: 1,
    lunedi: 1,
    martedì: 2,
    martedi: 2,
    mercoledì: 3,
    mercoledi: 3,
    giovedì: 4,
    giovedi: 4,
    venerdì: 5,
    venerdi: 5,
    sabato: 6,
  };

  for (const [name, day] of Object.entries(weekdays)) {
    if (lower.includes(name)) return nextWeekday(day, base);
  }

  const slash = token.match(/(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]) - 1;
    const year = slash[3] ? Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]) : base.getFullYear();
    return new Date(year, month, day, base.getHours(), base.getMinutes());
  }

  return result;
}

function parseDueAt(text: string, now = new Date()): string | undefined {
  const dateMatch = text.match(DATE_RE);
  const timeMatch = text.match(TIME_RE);
  if (!dateMatch && !timeMatch) return undefined;

  const dateBase = dateMatch ? parseItalianDate(dateMatch[1], now) : new Date(now);
  const hour = timeMatch ? Number(timeMatch[1]) : 9;
  const minute = timeMatch?.[2] ? Number(timeMatch[2]) : 0;
  dateBase.setHours(hour, minute, 0, 0);
  return dateBase.toISOString();
}

function stripScheduling(text: string): string {
  return text
    .replace(DATE_RE, "")
    .replace(TIME_RE, "")
    .replace(/\b(?:per|entro|il|in)\s+(?:data\s+)?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function agendaPeriodFromText(t: string): AgendaQueryPeriod | undefined {
  if (/settimana|prossimi?\s+(?:7\s+)?giorni|questa settimana/.test(t)) return "week";
  if (/dopodomani/.test(t)) return "day_after_tomorrow";
  if (/\bdomani\b/.test(t) && !/\boggi\b/.test(t)) return "tomorrow";
  if (/\boggi\b|stasera|questa giornata/.test(t)) return "today";
  return undefined;
}

function openAgendaReply(period?: AgendaQueryPeriod): string {
  switch (period) {
    case "tomorrow":
      return "Apro l'agenda di domani.";
    case "day_after_tomorrow":
      return "Apro l'agenda di dopodomani.";
    case "today":
      return "Apro l'agenda di oggi.";
    case "week":
      return "Apro l'agenda della settimana.";
    default:
      return "Apro l'agenda.";
  }
}

/** Apre la tab agenda Procione (opz. con giorno: «apri agenda di domani»). */
export function parseOpenAgendaCommand(
  transcript: string
): { reply: string; period?: AgendaQueryPeriod } | null {
  const t = transcript.toLowerCase();
  const opensAgenda =
    /apri(?:re)?\s+(?:l'?)?agenda|mostra(?:mi)?\s+(?:l'?)?agenda|vai\s+all'?agenda|apri\s+procione|mostra\s+i\s+promemoria/.test(
      t
    ) || /^agenda\s+(?:di\s+)?(?:domani|oggi|dopodomani|settimana)\b/.test(t.trim());

  if (!opensAgenda) return null;

  const period = agendaPeriodFromText(t);
  return { reply: openAgendaReply(period), period };
}

export function parseTaskCommand(transcript: string, now = new Date()): CreateTaskInput | null {
  const text = transcript.trim();
  if (!text) return null;

  const lowered = text.toLowerCase();

  const blocked =
    /appuntament|contatto|numero|telefono|cellulare|riunione|incontro|visita|sopralluogo|cliente\s+\d/.test(
      lowered
    );
  if (blocked) return null;

  const hasTaskIntent =
    /(?:memorizza|segna|ricorda)\s+(?:un\s+)?(?:promemoria|task|da\s+fare|cosa\s+da\s+fare)/.test(lowered) ||
    /^promemoria\b/.test(lowered) ||
    /(?:cosa|cos)\s+da\s+fare\s*:/.test(lowered) ||
    (/(?:memorizza|segna)\s+(?!.*(?:contatto|appuntament))/.test(lowered) &&
      /(?:da fare|promemoria|task|comprare|chiamare|inviare|ordinare|controllare|preparare|mandare|fare)/.test(
        lowered
      ));

  if (!hasTaskIntent) return null;

  let body = text;
  const prefixRe =
    /^(?:memorizza|segna|ricorda)\s+(?:un\s+)?(?:promemoria|task|da\s+fare|cosa\s+da\s+fare)\s*[:\-]?\s*/i;
  if (prefixRe.test(body)) {
    body = body.replace(prefixRe, "");
  } else if (/^promemoria\s*[:\-]?\s*/i.test(body)) {
    body = body.replace(/^promemoria\s*[:\-]?\s*/i, "");
  } else {
    body = body.replace(/^(?:memorizza|segna|ricorda)\s+/i, "");
  }

  const detailSplit = body.split(/\s*(?:\u2014|--|\u00b7|\||dettaglio:|note:|contenuto:)\s*/i);
  const titlePart = detailSplit[0]?.trim() ?? "";
  const description = detailSplit.slice(1).join(" ").trim() || undefined;

  const due_at = parseDueAt(body, now);
  let title = stripScheduling(titlePart);
  title = title.replace(/^(?:che\s+)?(?:devo|bisogna)\s+/i, "").trim();

  if (!title || title.length < 2) return null;

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    description,
    due_at,
    task_type: "reminder",
  };
}

export type TaskQueryIntent = {
  search?: string;
  filter?: "open" | "today" | "week";
};

export function parseTaskQuery(transcript: string): TaskQueryIntent | null {
  const t = transcript.toLowerCase();

  const searchMatch =
    t.match(/(?:cerca(?:re)?|trova(?:mi)?|mostra(?:mi)?)\s+(?:il\s+)?promemoria\s+(.+)/i) ??
    t.match(/(?:cerca(?:re)?|trova(?:mi)?)\s+(?:nei\s+)?promemoria\s+(.+)/i);
  if (searchMatch?.[1]) {
    return { search: searchMatch[1].trim(), filter: "open" };
  }

  const asksTasks =
    /cosa\s+devo\s+fare|che\s+devo\s+fare|elenco\s+(?:dei\s+)?promemoria|lista\s+(?:dei\s+)?promemoria|promemoria\s+aperti|cosa\s+ho\s+da\s+fare|task\s+aperti|to\s*do/.test(
      t
    );

  if (!asksTasks) return null;

  if (/\boggi\b/.test(t)) return { filter: "today" };
  if (/\bsettimana\b/.test(t)) return { filter: "week" };
  return { filter: "open" };
}

export function parseTaskDeleteCommand(transcript: string): { hint: string } | null {
  const t = transcript.toLowerCase();
  if (!/(?:annulla|cancella|elimina|rimuovi)/.test(t)) return null;
  if (!/(?:promemoria|task|da\s+fare|numero|n\.?\s*\d)/.test(t)) return null;

  const refMatch = transcript.match(/(?:promemoria|task|numero|n\.?\s*)\s*(\d+)/i);
  if (refMatch) return { hint: refMatch[1]! };

  const named = transcript.match(
    /(?:annulla|cancella|elimina|rimuovi)\s+(?:il\s+)?(?:promemoria|task)\s+(.+)/i
  );
  if (named?.[1]) return { hint: named[1].trim() };

  return null;
}

export function parseTaskCompleteCommand(transcript: string): { hint: string } | null {
  const t = transcript.toLowerCase();
  if (!/(?:segna|marca|completa|fatto|fatta|concluso)/.test(t)) return null;
  if (!/(?:promemoria|task|da\s+fare|numero)/.test(t)) return null;

  const refMatch = transcript.match(/(?:promemoria|task|numero|n\.?\s*)\s*(\d+)/i);
  if (refMatch) return { hint: refMatch[1]! };

  const named = transcript.match(
    /(?:segna|marca|completa)\s+(?:come\s+)?(?:fatto|fatta|completato)\s+(?:il\s+)?(?:promemoria|task)\s+(.+)/i
  );
  if (named?.[1]) return { hint: named[1].trim() };

  return null;
}

export function parseTaskModifyCommand(
  transcript: string,
  now = new Date()
): { hint: string; title?: string; description?: string; due_at?: string } | null {
  const t = transcript.toLowerCase();
  if (!/(?:modifica|aggiorna|cambia|sposta)/.test(t)) return null;
  if (!/(?:promemoria|task|numero)/.test(t)) return null;

  const refMatch = transcript.match(/(?:promemoria|task|numero|n\.?\s*)\s*(\d+)/i);
  const named = transcript.match(
    /(?:modifica|aggiorna|cambia|sposta)\s+(?:il\s+)?(?:promemoria|task)\s+(.+)/i
  );
  const hint = refMatch?.[1] ?? named?.[1]?.split(/\s+(?:in|a|per|con)\s+/i)[0]?.trim();
  if (!hint) return null;

  let title: string | undefined;
  const titleMatch = transcript.match(/(?:titolo|soggetto)\s+(?:in|a|:)\s+(.+)/i);
  if (titleMatch?.[1]) title = titleMatch[1].trim();

  let description: string | undefined;
  const descMatch = transcript.match(/(?:contenuto|dettaglio|note)\s+(?:in|a|:)\s+(.+)/i);
  if (descMatch?.[1]) description = descMatch[1].trim();

  const due_at = parseDueAt(transcript, now);

  return { hint, title, description, due_at };
}
