import type { CreateAppointmentInput } from "@/lib/procione/types";

const TIME_RE = /(?:alle|ore|h)\s*(\d{1,2})(?:[:.](\d{2}))?/i;
const DATE_RE =
  /(?:per\s+)?(domani|dopodomani|oggi|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)/i;
const CONTACT_RE = /(?:con|cliente)\s+([A-Za-zÀ-ÿ\s']+)/i;
const PHONE_RE = /(\+?\d[\d\s.-]{7,}\d)/;
const SAVE_CONTACT_RE =
  /(?:salva|crea|aggiungi)\s+(?:contatto\s+)?(.+?)(?:,\s*(?:numero|tel|telefono)\s*)/i;

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

export function parseAppointmentCommand(
  transcript: string,
  now = new Date()
): CreateAppointmentInput | null {
  const text = transcript.trim();
  if (!text) return null;

  const lowered = text.toLowerCase();
  const isAppointment =
    lowered.includes("appuntament") ||
    lowered.includes("segna") ||
    lowered.includes("sopralluogo") ||
    lowered.includes("riunione") ||
    lowered.includes("incontro") ||
    lowered.includes("visita");

  if (!isAppointment) return null;

  const timeMatch = text.match(TIME_RE);
  const dateMatch = text.match(DATE_RE);
  const contactMatch = text.match(CONTACT_RE);

  const dateBase = dateMatch ? parseItalianDate(dateMatch[1], now) : new Date(now);
  const hour = timeMatch ? Number(timeMatch[1]) : 9;
  const minute = timeMatch?.[2] ? Number(timeMatch[2]) : 0;

  dateBase.setHours(hour, minute, 0, 0);
  const endsAt = new Date(dateBase);
  endsAt.setHours(endsAt.getHours() + 1);

  let title = "Appuntamento";
  if (lowered.includes("sopralluogo")) title = "Sopralluogo";
  else if (lowered.includes("riunione")) title = "Riunione";
  else if (lowered.includes("visita")) title = "Visita";

  const withMatch = text.match(/(?:con|cliente)\s+([A-Za-zÀ-ÿ' ]+)/i);
  const contact = withMatch?.[1]?.trim().replace(/\s+(per|alle|ore).*$/i, "").trim();

  if (contact) title = `${title} con ${contact}`;

  return {
    title,
    contact_name: contactMatch?.[1]?.trim() ?? contact ?? undefined,
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
  const phoneMatch = text.match(PHONE_RE);
  const saveMatch = text.match(SAVE_CONTACT_RE);

  if (!saveMatch && !phoneMatch) return null;

  const lowered = text.toLowerCase();
  if (!lowered.includes("salva") && !lowered.includes("contatto") && !lowered.includes("numero")) {
    return null;
  }

  const namePart = saveMatch?.[1]?.trim() ?? text.replace(PHONE_RE, "").replace(/salva|contatto|numero|telefono|,/gi, "").trim();
  const companyMatch = namePart.match(/(.+?)\s+(?:di|della|del)\s+(.+)/i);

  return {
    full_name: companyMatch?.[1]?.trim() || namePart || "Nuovo contatto",
    company: companyMatch?.[2]?.trim(),
    phone: phoneMatch?.[1]?.replace(/\s+/g, " ").trim(),
  };
}

export function parseTodayQuery(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return (
    t.includes("che appuntament") ||
    t.includes("quali appuntament") ||
    t.includes("agenda di oggi") ||
    t.includes("appuntamenti oggi")
  );
}
