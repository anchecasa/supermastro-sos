"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AdminMfaPage() {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function enroll() {
    setError(null);
    const supabase = createClient();
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "SuperMastro Admin",
    });

    if (enrollError) {
      setError(enrollError.message);
      return;
    }

    setFactorId(data.id);
    setQr(data.totp.qr_code);
  }

  async function verify() {
    if (!factorId) return;
    setError(null);
    const supabase = createClient();

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      setError(challengeError.message);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    setOk(true);
    window.location.href = "/admin/monitor";
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <h1 className="text-xl font-bold">MFA Admin (F4)</h1>
      <p className="text-sm text-slate-400">
        Configura autenticazione a due fattori per accedere all&apos;area admin in produzione.
      </p>

      {error && (
        <p className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      {ok && (
        <p className="rounded-lg bg-green-950 px-4 py-3 text-sm text-green-300">
          MFA attivo. Reindirizzamento…
        </p>
      )}

      {!factorId ? (
        <button
          type="button"
          onClick={() => void enroll()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Configura TOTP
        </button>
      ) : (
        <div className="space-y-4">
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR MFA" className="mx-auto h-48 w-48 rounded bg-white p-2" />
          )}
          <input
            type="text"
            inputMode="numeric"
            placeholder="Codice 6 cifre"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void verify()}
            className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white"
          >
            Verifica e continua
          </button>
        </div>
      )}
    </div>
  );
}
