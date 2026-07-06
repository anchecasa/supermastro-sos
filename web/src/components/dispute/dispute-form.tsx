"use client";

import { useState, useTransition } from "react";

type Props = {
  matchId: string;
  role: "client" | "worker";
  submitDispute: (
    matchId: string,
    type: string,
    description: string
  ) => Promise<{ error?: string; id?: string }>;
};

export function DisputeForm({ matchId, role, submitDispute }: Props) {
  const [pending, startTransition] = useTransition();
  const [description, setDescription] = useState("");
  const [type, setType] = useState(role === "client" ? "d1_no_show" : "d2_wrong_category");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-4">
      <h3 className="font-semibold">Segnala un problema</h3>
      <p className="text-xs text-zinc-500">
        {role === "client"
          ? "No-show entro 48h dal match."
          : "Errore categoria o contatto entro 2h dall'accettazione."}
      </p>

      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      >
        {role === "client" && <option value="d1_no_show">Artigiano non si è presentato</option>}
        <option value="d2_wrong_category">Categoria intervento errata</option>
        {role === "worker" && <option value="d3_wrong_contact">Contatto errato</option>}
      </select>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        minLength={20}
        placeholder="Descrivi cosa è successo (min 20 caratteri)…"
        className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-700">{message}</p>}

      <button
        type="button"
        disabled={pending || description.length < 20}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await submitDispute(matchId, type, description);
            if (result.error) setError(result.error);
            else setMessage("Dispute inviata. Ti risponderemo entro 72 ore.");
          })
        }
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        Invia segnalazione
      </button>
    </div>
  );
}
