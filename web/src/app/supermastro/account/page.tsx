"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteAccount, exportUserData } from "@/app/supermastro/actions";

export default function AccountPage() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <Link href="/supermastro" className="text-sm text-blue-600 hover:underline">
        ← SuperMastro
      </Link>
      <h1 className="text-2xl font-bold">Il tuo account</h1>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 space-y-3">
        <h2 className="font-semibold">Export dati (Art. 15 GDPR)</h2>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await exportUserData();
              if (result.error) setError(result.error);
              else {
                const blob = new Blob([JSON.stringify(result.data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "supermastro-export.json";
                a.click();
                setMessage("Export scaricato.");
              }
            })
          }
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
        >
          Scarica i miei dati
        </button>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-6 space-y-3">
        <h2 className="font-semibold text-red-900">Cancellazione account</h2>
        <p className="text-sm text-red-800">
          Anonimizzazione profilo e revoca consensi. Azione irreversibile.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Confermi la cancellazione dell'account?")) return;
            startTransition(async () => {
              const result = await deleteAccount();
              if (result.error) setError(result.error);
              else window.location.href = "/supermastro";
            });
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
        >
          Elimina account
        </button>
      </section>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-zinc-500">
        <Link href="/supermastro/privacy" className="underline">
          Privacy
        </Link>
        {" · "}
        <Link href="/supermastro/termini" className="underline">
          Termini
        </Link>
      </p>
    </div>
  );
}
