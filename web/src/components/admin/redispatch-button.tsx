"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { redispatchInvitations } from "@/app/admin/actions";

type Props = {
  requestId: string;
};

export function RedispatchButton({ requestId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await redispatchInvitations(requestId);
          if (result.error) {
            alert(result.error);
            return;
          }
          alert(`Seconda ondata: ${result.count} nuovi inviti inviati.`);
          router.refresh();
        })
      }
      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
    >
      Seconda ondata (R1)
    </button>
  );
}
