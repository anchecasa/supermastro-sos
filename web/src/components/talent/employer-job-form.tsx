"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  sendEmployerConfirmationEmail,
  submitEmployerJobRequest,
  type EmployerActionState,
} from "@/app/lavoro/actions";
import type { AuthActionState } from "@/app/auth/actions";
import {
  WORKER_SKILL_CATALOG,
  SKILL_SECTOR_LABELS,
  type SkillSector,
} from "@/lib/worker-skills";
import { AVAILABILITY_OPTIONS, ORGANIZATION_TYPE_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const employerInitial: EmployerActionState = {};
const authInitial: AuthActionState = {};

type Props = {
  userEmail?: string | null;
};

export function EmployerJobForm({ userEmail }: Props) {
  const [state, formAction, pending] = useActionState(submitEmployerJobRequest, employerInitial);
  const [authState, authAction, authPending] = useActionState(
    sendEmployerConfirmationEmail,
    authInitial
  );

  const sectors = Object.keys(SKILL_SECTOR_LABELS) as SkillSector[];

  if (!userEmail) {
    return (
      <div className="rounded-2xl surface-card p-6 sm:p-8">
        <h2 className="text-lg font-semibold">Accedi per pubblicare un fabbisogno</h2>
        <p className="mt-1 text-sm text-muted">
          Condominio, hotel o ditta: trova personale nel talent pool AncheCasa.
        </p>
        <form action={authAction} className="mt-5 space-y-4">
          <Input name="email" type="email" required placeholder="referente@email.it" />
          <label className="flex items-start gap-2 text-sm text-muted">
            <input type="checkbox" required className="mt-1 rounded border-[var(--border)]" />
            <span>
              Accetto{" "}
              <Link href="/supermastro/privacy" className="text-brand underline">
                privacy
              </Link>{" "}
              e{" "}
              <Link href="/supermastro/termini" className="text-brand underline">
                termini
              </Link>{" "}
              del servizio recruitment AncheCasa.
            </span>
          </label>
          {authState.error && <p className="text-sm text-red-600">{authState.error}</p>}
          {authState.success && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{authState.success}</p>
          )}
          <Button type="submit" variant="client" className="w-full" disabled={authPending || !!authState.success}>
            {authPending ? "Invio email…" : authState.success ? "Email inviata" : "Invia email di conferma"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl surface-card p-6 sm:p-8">
      <p className="text-sm text-muted">
        Accesso come <strong className="text-foreground">{userEmail}</strong>
      </p>
      <form action={formAction} className="mt-5 space-y-4">
        <div>
          <label className="text-sm font-medium">Tipo organizzazione</label>
          <select
            name="org_type"
            required
            className="mt-1 flex h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
          >
            {ORGANIZATION_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Nome organizzazione</label>
            <Input name="org_name" required placeholder="Condominio Via Roma 12" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Referente</label>
            <Input name="referent_name" required placeholder="Mario Rossi" className="mt-1" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">CAP sede</label>
            <Input name="cap" required pattern="[0-9]{5}" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Comune</label>
            <Input name="comune" placeholder="Milano" className="mt-1" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Telefono</label>
            <Input name="phone" type="tel" required className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input name="email" type="email" required defaultValue={userEmail} className="mt-1" />
          </div>
        </div>

        <hr className="border-[var(--border)]" />

        <div>
          <label className="text-sm font-medium">Ruolo cercato</label>
          <Input name="role_title" required placeholder="Segretaria part-time" className="mt-1" />
        </div>

        <div>
          <label className="text-sm font-medium">Categoria / mansione</label>
          <select
            name="skill_slug"
            required
            className="mt-1 flex h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
          >
            <option value="">Seleziona</option>
            {sectors.map((sector) => (
              <optgroup key={sector} label={SKILL_SECTOR_LABELS[sector]}>
                {WORKER_SKILL_CATALOG.filter((s) => s.sector === sector).map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Descrizione (opzionale)</label>
          <textarea
            name="description"
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-sm"
            placeholder="Orari, requisiti, urgenza…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Ore/settimana</label>
            <Input name="hours_per_week" type="number" min={1} max={60} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Disponibilità richiesta</label>
            <select
              name="availability"
              className="mt-1 flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
            >
              <option value="">Qualsiasi</option>
              {AVAILABILITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Raggio ricerca km</label>
            <Input
              name="search_radius_km"
              type="number"
              min={5}
              max={100}
              defaultValue={30}
              className="mt-1"
            />
          </div>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{state.success}</p>
        )}

        <Button type="submit" variant="client" className="w-full" disabled={pending}>
          {pending ? "Invio…" : "Pubblica richiesta personale"}
        </Button>
      </form>

      <p className="mt-4 text-xs text-muted">
        AncheCasa mette in contatto organizzazioni e candidati. Il rapporto di lavoro resta tra le
        parti.{" "}
        <Link href="/supermastro/termini" className="text-brand underline">
          Termini
        </Link>
      </p>
    </div>
  );
}
