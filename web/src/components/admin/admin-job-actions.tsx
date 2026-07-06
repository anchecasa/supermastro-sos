"use client";

import { useTransition } from "react";
import {
  approveJobRequest,
  closeJobRequest,
  suspendJobRequest,
} from "@/app/admin/actions";

type Props = {
  jobId: string;
  status: string;
};

const btn =
  "rounded-lg px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50";

export function AdminJobActions({ jobId, status }: Props) {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "pending_review" && (
        <button
          type="button"
          disabled={pending}
          className={`${btn} bg-green-600`}
          onClick={() => run(() => approveJobRequest(jobId))}
        >
          Approva
        </button>
      )}
      {status !== "closed" && status !== "cancelled" && status !== "suspended" && (
        <button
          type="button"
          disabled={pending}
          className={`${btn} bg-amber-700`}
          onClick={() => run(() => suspendJobRequest(jobId))}
        >
          Sospendi
        </button>
      )}
      {status === "suspended" && (
        <button
          type="button"
          disabled={pending}
          className={`${btn} bg-green-700`}
          onClick={() => run(() => approveJobRequest(jobId))}
        >
          Riapri
        </button>
      )}
      {status !== "closed" && status !== "cancelled" && (
        <button
          type="button"
          disabled={pending}
          className={`${btn} bg-red-800`}
          onClick={() => run(() => closeJobRequest(jobId, "Chiuso da admin"))}
        >
          Chiudi
        </button>
      )}
    </div>
  );
}
