"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { sendMagicLink, type AuthActionState } from "@/app/auth/actions";
import type { UserRole } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

type MagicLinkFormProps = {
  role: UserRole;
  title: string;
  subtitle: string;
  privacyLabel: string;
  nextPath?: string | null;
};

export function MagicLinkForm({
  role,
  title,
  subtitle,
  privacyLabel,
  nextPath,
}: MagicLinkFormProps) {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);
  const [cooldown, setCooldown] = useState(0);
  const isWorker = role === "worker";

  useEffect(() => {
    if (state.success) setCooldown(30);
  }, [state.success]);

  useEffect(() => {
    if (!state.error) return;
    const match = state.error.match(/(\d+)\s*secondi/i);
    if (match) setCooldown(Number(match[1]));
  }, [state.error]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  return (
    <div className="min-w-0 rounded-2xl surface-card mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="role" value={role} />
          {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="nome@email.it"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" required className="mt-1 rounded border-[var(--border)]" />
            <span>{privacyLabel}</span>
          </label>

          <Button
            type="submit"
            disabled={pending || cooldown > 0}
            variant={isWorker ? "worker" : "client"}
            size="full"
          >
            {pending
              ? "Generazione link…"
              : cooldown > 0
                ? `Attendi ${cooldown}s…`
                : "Genera link di accesso"}
          </Button>
        </form>

        {state.error && (
          <p className={cn("mt-4 text-sm text-red-600")} role="alert">
            {state.error}
          </p>
        )}

        {state.success && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-emerald-700" role="status">
              {state.success}
            </p>
            {state.directLink && (
              <Button asChild variant="worker" size="full" className="h-auto min-h-12 py-3">
                <Link href={state.directLink}>Entra ora →</Link>
              </Button>
            )}
            <p className="text-xs text-muted">
              Ignora l&apos;email di Supabase se arriva: usa solo il pulsante verde sopra.
            </p>
          </div>
        )}
      </CardContent>
    </div>
  );
}
