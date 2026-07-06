"use client";

import { useTransition } from "react";
import { setEmployerStatus } from "@/app/admin/actions";

type Props = {
  orgId: string;
  status: string;
};

const btn =
  "rounded-lg px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50";

export function AdminEmployerActions({ orgId, status }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "active" ? (
        <button
          type="button"
          disabled={pending}
          className={`${btn} bg-amber-700`}
          onClick={() =>
            startTransition(async () => {
              await setEmployerStatus(orgId, "suspended", "suspended_by_admin");
            })
          }
        >
          Sospendi
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          className={`${btn} bg-green-700`}
          onClick={() =>
            startTransition(async () => {
              await setEmployerStatus(orgId, "active", "reactivated_by_admin");
            })
          }
        >
          Riattiva
        </button>
      )}
    </div>
  );
}
