"use client";

import { Undo2 } from "lucide-react";
import { voiceUndoSecondsLeft, type VoiceUndoState } from "@/lib/procione/voice-undo";

type VoiceUndoBannerProps = {
  undo: VoiceUndoState;
  onUndo: () => void;
};

export function VoiceUndoBanner({ undo, onUndo }: VoiceUndoBannerProps) {
  const seconds = voiceUndoSecondsLeft(undo);

  return (
    <div
      className="fixed inset-x-0 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-lg"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-emerald-800">Salvato</p>
        <p className="truncate text-sm text-emerald-900">{undo.label}</p>
      </div>
      <button
        type="button"
        onClick={onUndo}
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100"
      >
        <Undo2 className="h-4 w-4" />
        Annulla ({seconds}s)
      </button>
    </div>
  );
}
