"use client";

import { useTransition } from "react";
import {
  approveWorker,
  reactivateWorker,
  rejectWorker,
  requestCorrections,
  suspendWorker,
} from "@/app/admin/actions";

type Props = {
  workerId: string;
  status: string;
};

const btn =
  "rounded-lg px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50";

export function AdminWorkerActions({ workerId, status }: Props) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "pending_verification" && (
        <>
          <button
            type="button"
            disabled={pending}
            className={`${btn} bg-green-600`}
            onClick={() => run(() => approveWorker(workerId))}
          >
            Approva
          </button>
          <button
            type="button"
            disabled={pending}
            className={`${btn} bg-amber-600`}
            onClick={() => run(() => requestCorrections(workerId))}
          >
            Correzioni
          </button>
          <button
            type="button"
            disabled={pending}
            className={`${btn} bg-red-700`}
            onClick={() => run(() => rejectWorker(workerId))}
          >
            Rifiuta
          </button>
        </>
      )}
      {(status === "active" || status === "verified") && (
        <button
          type="button"
          disabled={pending}
          className={`${btn} bg-amber-700`}
          onClick={() => run(() => suspendWorker(workerId))}
        >
          Sospendi
        </button>
      )}
      {status === "suspended" && (
        <button
          type="button"
          disabled={pending}
          className={`${btn} bg-green-700`}
          onClick={() => run(() => reactivateWorker(workerId))}
        >
          Riattiva
        </button>
      )}
    </div>
  );
}
