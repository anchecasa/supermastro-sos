"use client";

import { useEffect, useState } from "react";
import { getAuthCallbackUrl, type UserRole } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MagicLinkFormProps = {
  role: UserRole;
  title: string;
  subtitle: string;
  privacyLabel: string;
  nextPath?: string | null;
};

function translateAuthError(message: string): string {
  const rateMatch = message.match(/after (\d+) seconds?/i);
  if (rateMatch) {
    return `Per sicurezza, attendi ${rateMatch[1]} secondi prima di richiedere un nuovo link.`;
  }
  if (message.toLowerCase().includes("rate limit")) {
    return "Troppi tentativi. Attendi un minuto e riprova.";
  }
  return message;
}

export function MagicLinkForm({
  role,
  title,
  subtitle,
  privacyLabel,
  nextPath,
}: MagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const isWorker = role === "worker";

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !accepted || pending || cooldown > 0) return;

    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createClient();
      const redirectTo = getAuthCallbackUrl(role, window.location.origin, nextPath);

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
          data: { role },
        },
      });

      if (otpError) {
        const msg = translateAuthError(otpError.message);
        setError(msg);
        const match = msg.match(/(\d+)\s*secondi/i);
        if (match) setCooldown(Number(match[1]));
        return;
      }

      setSuccess(
        "Controlla la tua email e apri il link nello stesso browser dove hai richiesto l'accesso."
      );
      setCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-w-0 rounded-2xl surface-card mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 rounded border-[var(--border)]"
            />
            <span>{privacyLabel}</span>
          </label>

          <Button
            type="submit"
            disabled={pending || cooldown > 0 || !accepted}
            variant={isWorker ? "worker" : "client"}
            size="full"
          >
            {pending
              ? "Invio in corso…"
              : cooldown > 0
                ? `Attendi ${cooldown}s…`
                : "Invia link di accesso"}
          </Button>
        </form>

        {error && (
          <p className={cn("mt-4 text-sm text-red-600")} role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 text-sm text-emerald-700" role="status">
            {success}
          </p>
        )}
      </CardContent>
    </div>
  );
}
