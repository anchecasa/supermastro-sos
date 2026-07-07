import type { CreateAppointmentInput } from "@/lib/procione/types";
import type { AgendaQueryPeriod } from "@/lib/procione/context";

export const TIME_RE = /(?:alle|ore|h)\s*(\d{1,2})(?:[:.](\d{2}))?/i;
export const DATE_RE =
  /(?:per\s+)?(domani|dopodomani|oggi|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)/i;
const CONTACT_RE = /(?:con|cliente)\s+([A-Za-zÀ-ÿ\s']+)/i;
export const PHONE_RE = /(\+?\d[\d\s.-]{7,}\d)/;

const COMBO_SPLIT_RE =
  /^(.+?)\s+(?:e\s+poi|poi|,?\s*e\s+)memorizza\s+(?:questo\s+)?contatto\s+(.+)$/i;

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

export function splitVoiceCommands(transcript: string): string[] {
  const text = transcript.trim();
  if (!text) return [];

  const parts = text
    .split(/\s*,\s*|\s+(?:e\s+poi|poi|inoltre)\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);

  return parts.length ? parts : [text];
}

export function parseAppointmentCommand(
  transcript: string,
  now = new Date(),
  defaultTime?: { hour: number; minute: number }
): CreateAppointmentInput | null {
  const text = transcript.trim();
  if (!text) return null;

  const lowered = text.toLowerCase();
  const isAppointment =
    lowered.includes("appuntament") ||
    lowered.includes("fissa") ||
    lowered.includes("segna") ||
    lowered.includes("memorizza un appuntament") ||
    lowered.includes("sopralluogo") ||
    lowered.includes("riunione") ||
    lowered.includes("incontro") ||
    lowered.includes("visita");

  if (!isAppointment) return null;

  const timeMatch = text.match(TIME_RE);
  const dateMatch = text.match(DATE_RE);
  const contactMatch = text.match(CONTACT_RE);

  const dateBase = dateMatch ? parseItalianDate(dateMatch[1], now) : new Date(now);
  const hour = timeMatch ? Number(timeMatch[1]) : (defaultTime?.hour ?? 9);
  const minute = timeMatch?.[2] ? Number(timeMatch[2]) : (defaultTime?.minute ?? 0);

  dateBase.setHours(hour, minute, 0, 0);
  const endsAt = new Date(dateBase);
  endsAt.setHours(endsAt.getHours() + 1);

  let title = "Appuntamento";
  if (lowered.includes("sopralluogo")) title = "Sopralluogo";
  else if (lowered.includes("riunione")) title = "Riunione";
  else if (lowered.includes("visita")) title = "Visita";

  const withMatch = text.match(/(?:con|cliente)\s+([A-Za-zÀ-ÿ' ]+)/i);
  const contact = withMatch?.[1]?.trim().replace(/\s+(per|alle|ore|e\s+memorizza).*$/i, "").trim();

  if (contact) title = `${title} con ${contact}`;

  return {
    title,
    contact_name: contactMatch?.[1]?.trim().replace(/\s+(per|alle|ore).*$/i, "").trim() ?? contact ?? undefined,
    starts_at: dateBase.toISOString(),
    ends_at: endsAt.toISOString(),
    source: "voice",
    color: "orange",
  };
}

export function parseContactCommand(transcript: string): {
  full_name: string;
  company?: string;
  phone?: string;
} | null {
  const text = transcript.trim();
  if (!text) return null;

  const lowered = text.toLowerCase();
  const phoneMatch = text.match(PHONE_RE);

  const hasContactIntent =
    /memorizza\s+(?:questo\s+)?contatto/.test(lowered) ||
    /registra\s+(?:in\s+agenda\s+)?(?:il\s+)?contatto/.test(lowered) ||
    /salva\s+(?:in\s+agenda\s+)?(?:il\s+)?contatto/.test(lowered) ||
    /(?:salva|memorizza|registra|archivia).*(?:contatto|numero|telefono|cellulare)/.test(lowered) ||
    (/(?:salva|memorizza|registra)/.test(lowered) && Boolean(phoneMatch));

  if (!hasContactIntent && !phoneMatch) return null;

  const memNumMatch = text.match(
    /memorizza\s+(?:il\s+)?(?:numero|telefono|cellulare)\s+(?:di\s+)?([A-Za-zÀ-ÿ\s']+)/i
  );
  if (memNumMatch) {
    const name = memNumMatch[1]
      .replace(PHONE_RE, "")
      .replace(/\s+(?:numero|tel|telefono).*$/i, "")
      .trim();
    if (name) {
      return {
        full_name: name,
        phone: phoneMatch?.[1]?.replace(/\s+/g, " ").trim(),
      };
    }
  }

  const memMatch = text.match(
    /(?:memorizza|salva|registra)\s+(?:questo\s+)?contatto\s+(.+)/i
  );
  const agendaMatch = text.match(
    /(?:registra|salva)\s+(?:in\s+agenda\s+)?(?:il\s+)?contatto\s+(.+)/i
  );

  let namePart =
    memMatch?.[1]?.trim() ??
    agendaMatch?.[1]?.trim() ??
    text
      .replace(PHONE_RE, "")
      .replace(/memorizza|salva|registra|archivia|contatto|questo|numero|telefono|cellulare|in agenda|,/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  namePart = namePart.replace(/\s+(?:numero|tel|telefono|cellulare).*$/i, "").trim();

  const companyMatch = namePart.match(/(.+?)\s+(?:di|della|del)\s+(.+)/i);

  return {
    full_name: companyMatch?.[1]?.trim() || namePart || "Nuovo contatto",
    company: companyMatch?.[2]?.trim(),
    phone: phoneMatch?.[1]?.replace(/\s+/g, " ").trim(),
  };
}

export function parseCombinedVoiceCommand(
  transcript: string,
  now = new Date(),
  defaultTime?: { hour: number; minute: number }
) {
  const combo = transcript.trim().match(COMBO_SPLIT_RE);
  if (combo) {
    return {
      appointment: parseAppointmentCommand(combo[1], now, defaultTime),
      contact: parseContactCommand(`memorizza contatto ${combo[2]}`),
    };
  }

  return {
    appointment: parseAppointmentCommand(transcript, now, defaultTime),
    contact: parseContactCommand(transcript),
  };
}

export function parseAgendaQuery(transcript: string): AgendaQueryPeriod | null {
  const t = transcript.toLowerCase();

  const asksAgenda =
    /che appuntament|quali appuntament|cosa ho|che ho|elenco appuntament|appuntamenti (?:ho|hai|abbiamo)|la mia agenda|cos['']?è in agenda|programma (?:di|per)|in programma/.test(
      t
    ) || (/come (?:sta|va)/.test(t) && /agenda|giornata/.test(t));

  if (!asksAgenda && !/\b(?:oggi|domani|dopodomani|settimana|stasera)\b/.test(t)) {
    return null;
  }

  if (/settimana|prossimi?\s+(?:7\s+)?giorni|questa settimana/.test(t)) {
    return "week";
  }
  if (/dopodomani/.test(t)) {
    return "day_after_tomorrow";
  }
  if (/\bdomani\b/.test(t) && !/\boggi\b/.test(t)) {
    return "tomorrow";
  }
  if (/\boggi\b|stasera|questa giornata/.test(t)) {
    return "today";
  }

  if (asksAgenda) return "today";

  return null;
}

/** @deprecated use parseAgendaQuery */
export function parseTodayQuery(transcript: string): boolean {
  return parseAgendaQuery(transcript) === "today";
}

/** Comandi da confermare con «no» prima di salvare (microfono manuale). */
export function wantsManualConfirmFlow(transcript: string): boolean {
  const t = transcript.toLowerCase();
  if (parseSuperMastroCommand(transcript)) return false;
  if (parseAgendaQuery(transcript)) return false;
  if (/(chiama|whatsapp|annulla|sposta|cancella|elimina)/.test(t)) return false;
  return /appuntament|contatto|memorizza|fissa|segna|salva|riunione|incontro|visita|cliente|numero|telefono|task|promemoria/.test(
    t
  );
}

export function isVoiceConfirmDone(transcript: string): boolean {
  const t = transcript.toLowerCase().trim().replace(/[.!?]+$/, "");
  return (
    /^(no|niente|nulla|basta|salva|memorizza|va bene|ok|confermo|tutto|stop|fine)$/.test(t) ||
    /^(no grazie|non ho altro|nient'?altro|niente altro|memorizza tutto|salva tutto)$/.test(t)
  );
}

export type SuperMastroVoiceCommand = {
  url: string;
  label: string;
  reply: string;
};

/** Apre SuperMastro / SOS casa dall'agenda Procione. */
export function parseSuperMastroCommand(transcript: string): SuperMastroVoiceCommand | null {
  const t = transcript.toLowerCase().replace(/super\s+mastro/g, "supermastro");

  const wantsSos =
    /problema\s+(?:a\s+|in\s+|della?\s+)?casa|emergenza\s+(?:a\s+)?casa|sos\s+casa|guasto\s+(?:a\s+)?casa/.test(
      t
    ) ||
    (/(?:ho|c'?è|abbiamo)\s+(?:un\s+)?(?:problema|guasto|emergenza|perdita)/.test(t) &&
      /casa|bagno|tub|acqua|luce|caldaia|infiltraz/.test(t)) ||
    /cerc(?:o|a|are)\s+(?:un\s+)?(?:artigiano|mastro|idraulico|elettricista|muratore|tecnico)/.test(t) ||
    /cerc(?:a|are|o)\s+quasi/.test(t) ||
    /nuova\s+richiesta|richiesta\s+sos|apri(?:re)?\s+(?:il\s+)?sos|mastro\s+in\s+zona/.test(t);

  if (wantsSos) {
    return {
      url: "/supermastro/nuova",
      label: "SOS casa",
      reply: "Ok Fernando, apro SuperMastro per cercare un mastro in zona.",
    };
  }

  if (
    /apri(?:re)?\s+(?:l'?app\s+)?supermastro|vai\s+(?:su|a)\s+supermastro|supermastro(?:\s+app)?|apri\s+super\s?mastro/.test(
      t
    )
  ) {
    return {
      url: "/supermastro",
      label: "SuperMastro",
      reply: "Apro SuperMastro.",
    };
  }

  return null;
}

export function parseCallCommand(
  transcript: string,
  contacts: { full_name: string; phone: string | null }[],
  aliasMap?: Map<string, string>
): { phone: string; name: string } | null {
  const t = transcript.toLowerCase();
  if (!/(chiama|telefona|fai\s+chiamata|chiamata\s+a|chiamalo|chiamala)/.test(t)) return null;

  if (aliasMap?.size) {
    for (const [alias, resolved] of aliasMap) {
      if (alias.length > 2 && t.includes(alias)) {
        const resolvedContact = contacts.find((c) =>
          c.full_name.toLowerCase().includes(resolved.toLowerCase())
        );
        if (resolvedContact?.phone) {
          return { phone: resolvedContact.phone.replace(/\s+/g, ""), name: resolvedContact.full_name };
        }
      }
    }
  }

  for (const c of contacts) {
    if (!c.phone) continue;
    const parts = c.full_name.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
    if (parts.some((p) => t.includes(p))) {
      return { phone: c.phone.replace(/\s+/g, ""), name: c.full_name };
    }
  }

  const phoneMatch = transcript.match(PHONE_RE);
  if (phoneMatch) {
    return { phone: phoneMatch[1].replace(/\s+/g, ""), name: "contatto" };
  }

  return null;
}

export type RubricaVoiceAction = "open" | "add" | "search";

/** Comandi vocali per aprire/gestire la rubrica senza dati completi. */
export function parseRubricaVoiceCommand(transcript: string): {
  action: RubricaVoiceAction;
  searchQuery?: string;
} | null {
  const t = transcript.toLowerCase().trim();

  const searchInRubrica = t.match(/(?:cerca|trova|mostra)\s+(?:in\s+rubrica\s+)?(?:il\s+)?contatto\s+(.+)/i);
  const searchNamed = t.match(/(?:cerca|trova)\s+(.+?)\s+(?:in\s+)?rubrica/i);
  const query = searchInRubrica?.[1]?.trim() || searchNamed?.[1]?.trim();
  if (query) return { action: "search", searchQuery: query };

  if (
    /\b(?:apri|mostra|vai)\s+(?:in\s+|alla\s+)?rubrica\b/.test(t) ||
    /\b(?:apri|mostra)\s+(?:i\s+)?contatti\b/.test(t) ||
    /^rubrica$/i.test(t)
  ) {
    return { action: "open" };
  }

  if (
    /^(?:aggiungi|nuovo|crea|inserisci)\s+(?:un\s+)?contatto\s*$/i.test(t) ||
    /\bapri\s+(?:form|scheda)\b.*\bcontatt/i.test(t) ||
    /^(?:memorizza|salva|registra)\s+(?:un\s+)?(?:nuovo\s+)?contatto\s*$/i.test(t) ||
    /^memorizza\s+(?:il\s+)?numero\s*$/i.test(t) ||
    /^we we\s+(?:aggiungi|memorizza|salva)\s+contatto\s*$/i.test(t)
  ) {
    return { action: "add" };
  }

  return null;
}
