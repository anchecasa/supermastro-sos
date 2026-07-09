"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { VoicePhase } from "@/components/procione/use-procione-voice";

const PROCIONE_AVATAR = "/images/supermastro-mezzobusto.png";
const ORANGE = "#F27131";

type ProcioneSiriOverlayProps = {
  phase: VoicePhase;
  statusHint?: string | null;
  speaking?: boolean;
};

function phaseLabel(phase: VoicePhase, hint: string | null | undefined, speaking: boolean): string {
  if (speaking) return "Rispondo…";
  if (hint?.trim()) return hint;
  switch (phase) {
    case "wake":
      return "Ciao! Ti ascolto…";
    case "listening":
      return "Ti ascolto…";
    case "processing":
      return "Elaboro…";
    default:
      return "";
  }
}

export function ProcioneSiriOverlay({ phase, statusHint, speaking = false }: ProcioneSiriOverlayProps) {
  if (phase === "hidden" && !speaking) return null;

  const active = phase === "listening" || phase === "wake" || speaking;
  const label = phaseLabel(phase, statusHint, speaking);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/55 backdrop-blur-md"
      aria-live="polite"
      aria-label="SuperMastro in ascolto"
    >
      <div className="relative flex h-44 w-44 items-center justify-center">
        {active && (
          <>
            <span
              className="absolute inset-0 animate-ping rounded-full opacity-30"
              style={{ backgroundColor: ORANGE }}
            />
            <span
              className="absolute inset-2 animate-pulse rounded-full opacity-20"
              style={{ backgroundColor: ORANGE }}
            />
          </>
        )}
        <div
          className={cn(
            "relative h-32 w-32 overflow-hidden rounded-full border-4 bg-white shadow-2xl transition-transform duration-300",
            active && "scale-105",
            phase === "processing" && "scale-100 opacity-95"
          )}
          style={{ borderColor: ORANGE }}
        >
          <Image src={PROCIONE_AVATAR} alt="SuperMastro Procione" fill className="object-cover" priority />
        </div>
      </div>

      <p className="mt-6 max-w-xs px-6 text-center text-lg font-semibold text-white">{label}</p>

      {phase === "listening" && (
        <p className="mt-2 px-6 text-center text-sm text-white/70">
          Es. «apri agenda di domani», «fissa appuntamento alle 10»
        </p>
      )}
    </div>
  );
}
