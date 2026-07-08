"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Lock, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const AVATAR = "/images/supermastro-mezzobusto.png";
const ORANGE = "#F27131";

export function AgendaGatePanel() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listeningHint, setListeningHint] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/agenda/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Accesso negato");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di accesso");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#1a1a1a] px-6 py-10 text-white">
      <div className="relative mb-8">
        <span
          className={cn(
            "absolute inset-0 rounded-full bg-[#F27131]/20 blur-2xl transition-all duration-700",
            listeningHint ? "scale-125 opacity-100" : "scale-100 opacity-60"
          )}
        />
        <span
          className={cn(
            "absolute -inset-3 rounded-full border border-[#F27131]/30 transition-all duration-700",
            listeningHint && "animate-ping"
          )}
        />
        <div
          className="relative h-32 w-32 overflow-hidden rounded-full border-4 shadow-2xl"
          style={{ borderColor: ORANGE }}
          onMouseEnter={() => setListeningHint(true)}
          onMouseLeave={() => setListeningHint(false)}
        >
          <Image src={AVATAR} alt="Procione" fill className="object-cover" priority />
        </div>
      </div>

      <p className="mb-1 flex items-center gap-2 text-sm font-medium text-[#F27131]">
        <Mic className="h-4 w-4" />
        Assistente vocale Procione
      </p>
      <h1 className="mb-2 text-center text-2xl font-semibold">Agenda AncheCasa</h1>
      <p className="mb-8 max-w-sm text-center text-sm leading-relaxed text-white/70">
        Inserisci la password admin per aprire l&apos;agenda, installare la PWA e attivare
        l&apos;ascolto vocale stile Siri con «we we».
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <label className="block text-sm text-white/80">
          <span className="mb-2 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Password admin
          </span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg tracking-[0.35em] text-white outline-none placeholder:text-white/30 focus:border-[#F27131]"
          />
        </label>

        {error && (
          <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || password.length < 4}
          className="w-full rounded-2xl py-3.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
          style={{ backgroundColor: ORANGE }}
        >
          {pending ? "Accesso…" : "Entra come admin"}
        </button>
      </form>
    </div>
  );
}
