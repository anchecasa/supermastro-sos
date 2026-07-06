"use client";

import { useActionState } from "react";
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
  const isWorker = role === "worker";

  return (
    <div className="rounded-2xl surface-card mx-auto w-full max-w-md">
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
            disabled={pending}
            variant={isWorker ? "worker" : "client"}
            size="full"
          >
            {pending ? "Invio in corso…" : "Invia link di accesso"}
          </Button>
        </form>

        {state.error && (
          <p className={cn("mt-4 text-sm text-red-600")} role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="mt-4 text-sm text-emerald-700" role="status">
            {state.success}
          </p>
        )}
      </CardContent>
    </div>
  );
}
