"use client";

import { useActionState } from "react";
import Link from "next/link";
import { sendMagicLink, type AuthActionState } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: AuthActionState = {};

type Props = {
  loginHref: string;
  nextPath?: string;
};

export function ClientEmailModule({ loginHref, nextPath = "/supermastro/nuova" }: Props) {
  const [state, formAction, pending] = useActionState(sendMagicLink, initial);

  return (
    <div className="rounded-2xl surface-card p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Invia la tua richiesta SOS</h2>
      <p className="mt-1 text-sm text-muted">Gratuito per te — accedi con magic link via email.</p>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="role" value="client" />
        <input type="hidden" name="next" value={nextPath} />
        <div className="space-y-2">
          <label htmlFor="client-email" className="text-sm font-medium">
            La tua email
          </label>
          <Input
            id="client-email"
            name="email"
            type="email"
            required
            placeholder="nome@email.it"
            autoComplete="email"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" required className="mt-1 rounded border-[var(--border)]" />
          <span>Accetto privacy e termini del servizio cliente SOS.</span>
        </label>
        <Button type="submit" disabled={pending} variant="client" size="full">
          {pending ? "Invio in corso…" : "Invia richiesta — accedi"}
        </Button>
      </form>

      {state.error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="mt-3 text-sm text-emerald-700" role="status">
          {state.success}
        </p>
      )}

      <p className="mt-4 text-center text-xs text-muted">
        Sei un mastro?{" "}
        <Link href="/artigiano" className="font-medium text-brand hover:underline">
          Iscriviti qui
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted">
        <Link href={loginHref} className="hover:underline">
          Pagina accesso dedicata
        </Link>
      </p>
    </div>
  );
}
