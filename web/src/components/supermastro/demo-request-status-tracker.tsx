"use client";

import { useEffect, useState } from "react";
import { REQUEST_STATUS_COPY, type RequestStatus } from "@/lib/sos/constants";
import { DemoMatchedContactCard } from "@/components/supermastro/demo-matched-contact-card";
import type { DemoRequestState } from "@/lib/sos/demo";

type Props = {
  demoRequest: DemoRequestState;
};

const DEMO_STEPS = [
  { atMs: 0, message: "Posizione registrata — cerchiamo mastri nel raggio di 25 km." },
  { atMs: 2500, message: "Inviti inviati a 4 mastri verificati in zona." },
  { atMs: 5500, message: "Marco B. ha visualizzato la tua richiesta." },
  { atMs: 8500, message: "Marco B. ha accettato — stiamo sbloccando il contatto." },
];

export function DemoRequestStatusTracker({ demoRequest }: Props) {
  const [status, setStatus] = useState<RequestStatus>("inviting");
  const [stepIndex, setStepIndex] = useState(0);
  const [countdown, setCountdown] = useState("0:45");
  const copy = REQUEST_STATUS_COPY[status];

  useEffect(() => {
    if (status === "matched") return;

    const started = Date.now();
    const expiresMs = 45_000;

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, expiresMs - elapsed);
      const min = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${min}:${sec.toString().padStart(2, "0")}`);

      let nextStep = 0;
      for (let i = DEMO_STEPS.length - 1; i >= 0; i--) {
        if (elapsed >= DEMO_STEPS[i].atMs) {
          nextStep = i;
          break;
        }
      }
      setStepIndex(nextStep);

      if (elapsed >= 9000) {
        setStatus("matched");
        window.clearInterval(interval);
      }
    }, 400);

    return () => window.clearInterval(interval);
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          Modalità demo — simulazione completa del flusso SOS
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
            Stato richiesta
          </p>
          <h2 className="text-xl font-semibold">{copy.title}</h2>
          <p className="text-sm text-zinc-600">{copy.subtitle}</p>
        </div>

        {status === "inviting" && (
          <>
            <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
              {DEMO_STEPS[stepIndex]?.message}
            </p>
            <p className="text-sm font-medium text-zinc-700">
              Tempo rimanente (demo): {countdown}
            </p>
          </>
        )}

        <p className="text-xs text-zinc-400">
          GPS: {demoRequest.lat.toFixed(5)}, {demoRequest.lng.toFixed(5)} ·{" "}
          {demoRequest.zone_name}
        </p>
      </div>

      {status === "matched" && (
        <DemoMatchedContactCard skillLabel={demoRequest.skill_label} />
      )}
    </div>
  );
}
