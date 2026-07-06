"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DemoRequestStatusTracker } from "@/components/supermastro/demo-request-status-tracker";
import { loadDemoRequest, type DemoRequestState } from "@/lib/sos/demo";

type Props = {
  requestId: string;
};

export function DemoRichiestaView({ requestId }: Props) {
  const [demoRequest, setDemoRequest] = useState<DemoRequestState | null>(null);

  useEffect(() => {
    setDemoRequest(loadDemoRequest(requestId));
  }, [requestId]);

  if (!demoRequest) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Sessione demo scaduta. Avvia una nuova simulazione dalla home.
        </p>
        <Link
          href="/supermastro/nuova?demo=1"
          className="inline-flex rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white"
        >
          Nuova demo SOS
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8">
      <Link href="/supermastro" className="text-sm text-blue-600 hover:underline">
        ← Torna a SuperMastro
      </Link>
      <DemoRequestStatusTracker demoRequest={demoRequest} />
    </div>
  );
}
