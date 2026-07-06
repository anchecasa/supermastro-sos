import { createDemoSnapshot } from "@/lib/procione/demo-snapshot";
import type {
  ProcioneDataMode,
  ProcioneDemoSnapshot,
  ProcioneMeetingContext,
} from "@/lib/procione/session";

export type ModeSwitchResult = {
  dataMode: ProcioneDataMode;
  meetingContext?: ProcioneMeetingContext;
  demoSnapshot?: ProcioneDemoSnapshot;
  reply: string;
  changed: boolean;
};

export function parseMeetingEnter(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return (
    /(?:vado|devo andare|sto andando).*(?:riunione|meeting)/.test(t) ||
    /\bpreparati\b/.test(t) ||
    /inventa.*numer/.test(t) ||
    /dall['']?ora in poi.*invent/.test(t) ||
    /modalit[aà].*demo/.test(t)
  );
}

export function parseMeetingExit(transcript: string): boolean {
  const t = transcript.toLowerCase().trim().replace(/[.!?]+$/, "");
  return (
    /^(?:ho\s+)?finito(?:\s+la\s+riunione)?$/.test(t) ||
    /(?:ho\s+)?finito.*riunione/.test(t) ||
    /fine\s+riunione/.test(t) ||
    /torna.*(?:real|veri|dati\s+real)/.test(t)
  );
}

const ITALIAN_CITIES =
  /(?:milano|roma|torino|bologna|napoli|firenze|genova|palermo|bari|verona|padova|trieste|brescia|modena|parma|perugia|venezia|reggio|catania)/i;

export function extractMeetingDestination(transcript: string): string | undefined {
  const cityMatch = transcript.match(
    new RegExp(`(?:a|per|in|verso)\\s+(${ITALIAN_CITIES.source})`, "i")
  );
  if (cityMatch?.[1]) return cityMatch[1].charAt(0).toUpperCase() + cityMatch[1].slice(1).toLowerCase();

  const generic = transcript.match(/(?:a|per|in)\s+([A-Za-zÀ-ÿ]{3,24})(?:\s+(?:per|con|domani|oggi)|\s*$|[,.])/i);
  return generic?.[1]?.trim();
}

export function extractMeetingWhen(transcript: string): string | undefined {
  const t = transcript.toLowerCase();
  if (/domani\s+mattina/.test(t)) return "domani mattina";
  if (/domani/.test(t)) return "domani";
  if (/oggi/.test(t)) return "oggi";
  const time = transcript.match(/(?:alle|ore)\s*(\d{1,2}(?::\d{2})?)/i);
  if (time) return `alle ${time[1]}`;
  return undefined;
}

export function handleModeSwitch(
  transcript: string,
  currentMode: ProcioneDataMode,
  meetingContext?: ProcioneMeetingContext,
  demoSnapshot?: ProcioneDemoSnapshot,
  sessionId?: string
): ModeSwitchResult | null {
  if (parseMeetingExit(transcript)) {
    return {
      dataMode: "real",
      meetingContext: undefined,
      demoSnapshot: undefined,
      changed: currentMode !== "real",
      reply:
        "Ok Fernando, riunione chiusa. Torno ai dati reali da Supabase: da adesso ogni numero viene dal database.",
    };
  }

  if (parseMeetingEnter(transcript)) {
    const destination = extractMeetingDestination(transcript);
    const when = extractMeetingWhen(transcript);
    const nextContext: ProcioneMeetingContext = {
      ...meetingContext,
      ...(destination ? { destination } : {}),
      ...(when ? { when } : {}),
    };
    const snap = demoSnapshot ?? createDemoSnapshot(sessionId ?? "procione-demo");

    const destPart = destination
      ? ` Ti preparo per ${destination}${when ? ` ${when}` : ""}: chiedimi metriche, ristorante o treno quando vuoi.`
      : " Chiedimi metriche demo, ristorante o treno quando serve.";

    return {
      dataMode: "meeting_demo",
      meetingContext: nextContext,
      demoSnapshot: snap,
      changed: currentMode !== "meeting_demo" || Boolean(destination || when),
      reply: `Perfetto Fernando, modalità presentazione attiva con numeri demo.${destPart} Agenda e rubrica restano reali.`,
    };
  }

  return null;
}
