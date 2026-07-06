"use client";

import { useTransition } from "react";
import { resolveDispute } from "@/app/admin/actions";

type Props = {
  disputeId: string;
};

export function DisputeResolveForm({ disputeId }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-2 border-t border-slate-800 pt-3"
      action={(formData) => {
        startTransition(async () => {
          await resolveDispute(
            disputeId,
            String(formData.get("status")),
            String(formData.get("note")),
            formData.get("refund") === "on"
          );
        });
      }}
    >
      <select
        name="status"
        className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
      >
        <option value="resolved_client">Favore cliente (+ refund)</option>
        <option value="resolved_worker">Favore artigiano</option>
        <option value="inconclusive">Inconcluso</option>
      </select>
      <textarea
        name="note"
        required
        minLength={50}
        rows={3}
        placeholder="Motivazione admin (min 50 caratteri)…"
        className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="refund" />
        Rimborsa 1 credito artigiano
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-green-700 px-3 py-1.5 text-sm text-white disabled:opacity-60"
      >
        Risolvi dispute
      </button>
    </form>
  );
}
