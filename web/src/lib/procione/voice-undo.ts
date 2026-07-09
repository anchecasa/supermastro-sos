import type { ProcioneDraft } from "@/lib/procione/draft";

/** Opzione C: salvataggio immediato con finestra annulla 5 secondi. */
export const VOICE_UNDO_MS = 5000;

export type VoiceUndoState = {
  appointmentIds: string[];
  contactIds: string[];
  taskIds: string[];
  label: string;
  expiresAt: number;
};

type SavedEntity = { id?: string };

function collectIds(list?: SavedEntity[], single?: SavedEntity): string[] {
  const ids = new Set<string>();
  for (const item of list ?? []) {
    if (item?.id) ids.add(item.id);
  }
  if (single?.id) ids.add(single.id);
  return [...ids];
}

function buildLabel(draft?: ProcioneDraft, data?: { type?: string; reply?: string }): string {
  if (draft?.kind === "appointment" || draft?.kind === "multi") {
    return draft.appointment?.title ? `Appuntamento «${draft.appointment.title}»` : "Appuntamento";
  }
  if (draft?.kind === "contact") {
    return draft.contact?.full_name ? `Contatto ${draft.contact.full_name}` : "Contatto";
  }
  if (draft?.kind === "task") {
    return draft.task?.title ? `Promemoria «${draft.task.title}»` : "Promemoria";
  }
  if (data?.type === "contact") return "Contatto";
  if (data?.type === "task") return "Promemoria";
  return data?.reply?.slice(0, 48) ?? "Elemento salvato";
}

export function buildVoiceUndoState(
  data: {
    type?: string;
    reply?: string;
    appointment?: SavedEntity;
    appointments?: SavedEntity[];
    contact?: SavedEntity;
    contacts?: SavedEntity[];
    task?: SavedEntity;
    tasks?: SavedEntity[];
  },
  draft?: ProcioneDraft
): VoiceUndoState | null {
  const appointmentIds = collectIds(data.appointments, data.appointment);
  const contactIds = collectIds(data.contacts, data.contact);
  const taskIds = collectIds(data.tasks, data.task);

  if (!appointmentIds.length && !contactIds.length && !taskIds.length) {
    return null;
  }

  return {
    appointmentIds,
    contactIds,
    taskIds,
    label: buildLabel(draft, data),
    expiresAt: Date.now() + VOICE_UNDO_MS,
  };
}

export function voiceUndoSecondsLeft(state: VoiceUndoState): number {
  return Math.max(0, Math.ceil((state.expiresAt - Date.now()) / 1000));
}

export function isVoiceUndoExpired(state: VoiceUndoState): boolean {
  return Date.now() >= state.expiresAt;
}

/** «annulla» durante la finestra undo — distinto da annulla appuntamento generico. */
export function isVoiceUndoCommand(transcript: string): boolean {
  const t = transcript.toLowerCase().trim().replace(/[.!?]+$/, "");
  return (
    /^(annulla|cancella|no|stop|ferma|undo|rimuovi)$/.test(t) ||
    /^(annulla\s+(?:tutto|salvataggio|ultimo)|non\s+salvare)$/.test(t)
  );
}
