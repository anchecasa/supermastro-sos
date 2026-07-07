import {
  parseAgendaQuery,
  parseSuperMastroCommand,
} from "@/lib/procione/voice-parser";

const ACTION_PATTERN =
  /appuntament|contatto|memorizza|fissa|segna|salva|sposta|annulla|cancella|chiama|whatsapp|apri\s+super|rubrica|sos|problema\s+(?:a\s+)?casa|promemoria|da\s+fare|apri(?:re)?\s+agenda/;

/** Small talk e domande relazionali → cervello conversazione. */
export function isConversationalIntent(transcript: string): boolean {
  const t = transcript.toLowerCase().trim();
  if (!t || t.length < 2) return false;
  if (parseSuperMastroCommand(transcript)) return false;
  if (ACTION_PATTERN.test(t) && !/come\s+(?:sta|va)|che\s+(?:stai|fai)|com'?è/.test(t)) {
    return false;
  }

  return (
    /che\s+(?:stai|fai)|come\s+(?:stai|va)|com'?è\s+(?:mess[oa]|andata)|ehi\s+ehi|ci\s+sei|tutto\s+bene|dimmi|raccontami|ciao\s+procione|buongiorno|buonasera|we\s*we\s*$|ei\s+ei/.test(
      t
    ) ||
    (/come/.test(t) && /oggi|giornata|agenda/.test(t) && !parseAgendaQuery(transcript))
  );
}

export function isVoiceConfirmYes(transcript: string): boolean {
  const t = transcript.toLowerCase().trim().replace(/[.!?]+$/, "");
  return (
    /^(ok|okay|sì|si|si\s+grazie|confermo|conferma|va bene|procedi|salva|memorizza|perfetto|giusto)$/.test(t) ||
    /^(ok\s+procedi|sì\s+confermo|confermo\s+tutto|salva\s+tutto|memorizza\s+tutto)$/.test(t)
  );
}

export function isVoiceConfirmCancel(transcript: string): boolean {
  const t = transcript.toLowerCase().trim().replace(/[.!?]+$/, "");
  return /^(no|annulla|cancella|lascia|stop|ferma|non\s+salvare|niente)$/.test(t) ||
    /^(no\s+grazie|lascia\s+perdere|non\s+confermo)$/.test(t);
}
