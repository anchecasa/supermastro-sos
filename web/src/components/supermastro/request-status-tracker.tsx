"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  REQUEST_STATUS_COPY,
  type RequestStatus,
} from "@/lib/sos/constants";

type Props = {
  requestId: string;
  initialStatus: RequestStatus;
  expiresAt?: string | null;
};

export function RequestStatusTracker({
  requestId,
  initialStatus,
  expiresAt,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<RequestStatus>(initialStatus);
  const copy = REQUEST_STATUS_COPY[status];

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`request:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "service_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const next = (payload.new as { status?: RequestStatus }).status;
          if (next) {
            setStatus(next);
            if (next === "matched" || next === "expired") {
              router.refresh();
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [requestId, router]);

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
          Stato richiesta
        </p>
        <h2 className="text-xl font-semibold">{copy.title}</h2>
        <p className="text-sm text-zinc-600">{copy.subtitle}</p>
      </div>

      {status === "inviting" && (
        <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Stiamo avvisando i mastri verificati vicino a te. Non devi fare nulla:
          ti avvisiamo appena qualcuno accetta.
        </p>
      )}

      {status === "inviting" && expiresAt && (
        <Countdown expiresAt={expiresAt} />
      )}

      <p className="text-xs text-zinc-400">
        Aggiornamento in tempo reale attivo
      </p>
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("Tempo scaduto");
        return;
      }
      const min = Math.floor(ms / 60000);
      const sec = Math.floor((ms % 60000) / 1000);
      setRemaining(`${min}:${sec.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <p className="text-sm font-medium text-zinc-700">
      Tempo rimanente: {remaining}
    </p>
  );
}
