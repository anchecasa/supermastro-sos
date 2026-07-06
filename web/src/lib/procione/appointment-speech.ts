import type { AssistantAppointment } from "@/lib/procione/types";

/** Saluto vocale Procione (wake ack) */
export const PROCIONE_WAKE_SPOKEN = "We we!";
/** Voce premade ElevenLabs: Charlie — giovane, energico, adatto a Procione */
export const PROCIONE_DEFAULT_VOICE_ID = "IKne3meq5aSn9XLXHlEF";
export const PROCIONE_DEFAULT_VOICE_NAME = "Charlie";

function formatSpokenDate(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function formatSpokenTime(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Testo letto da Procione quando l'utente apre un appuntamento. */
export function buildAppointmentSpeech(appt: AssistantAppointment): string {
  const time = formatSpokenTime(appt.starts_at);
  const date = formatSpokenDate(appt.starts_at);
  const parts = [
    `Hai un appuntamento alle ${time}, ${date}: ${appt.title}.`,
  ];

  if (appt.contact_name) {
    parts.push(`Con ${appt.contact_name}.`);
  }
  if (appt.location) {
    parts.push(`Luogo: ${appt.location}.`);
  }
  if (appt.description) {
    parts.push(appt.description.endsWith(".") ? appt.description : `${appt.description}.`);
  }

  return parts.join(" ");
}
