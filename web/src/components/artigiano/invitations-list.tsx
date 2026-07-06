"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitation, rejectInvitation } from "@/app/artigiano/actions";
import { URGENCY_LABELS, type UrgencyLevel } from "@/lib/sos/constants";

export type InvitationRow = {
  id: string;
  distance_km: number;
  district_hint: string | null;
  created_at: string;
  skill_label: string;
  urgency: UrgencyLevel;
};

type Props = {
  invitations: InvitationRow[];
};

export function InvitationsList({ invitations }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (invitations.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
        Nessun invito in sospeso. Resta in attesa — ti avvisiamo quando c&apos;è un
        intervento in zona.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {invitations.map((inv) => (
        <li
          key={inv.id}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4"
        >
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-amber-500">
              Nuovo invito SOS
            </p>
            <p className="text-lg font-semibold">{inv.skill_label}</p>
            <p className="text-sm text-zinc-400">
              Urgenza {URGENCY_LABELS[inv.urgency]} · ~{inv.distance_km} km
              {inv.district_hint ? ` · ${inv.district_hint}` : ""}
            </p>
            <p className="text-xs text-zinc-600">
              Nome e indirizzo preciso visibili solo dopo accettazione.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await acceptInvitation(inv.id);
                })
              }
              className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-60"
            >
              Accetta (−1 credito)
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await rejectInvitation(inv.id);
                  if (!result.error) router.refresh();
                })
              }
              className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 disabled:opacity-60"
            >
              Rifiuta
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
