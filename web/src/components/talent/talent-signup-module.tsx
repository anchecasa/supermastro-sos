"use client";

import { useActionState, useState } from "react";
import { sendMagicLink, type AuthActionState } from "@/app/auth/actions";
import { saveTalentSignupDraft, type TalentType } from "@/lib/worker-signup-draft";
import {
  getSkillsBySector,
  SKILL_SECTOR_LABELS,
  type SkillSector,
} from "@/lib/worker-skills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initial: AuthActionState = {};

type Props = {
  variant?: "supermastro" | "anchecasa";
  defaultTalentType?: TalentType;
  onboardingNext?: string;
};

export function TalentSignupModule({
  variant = "supermastro",
  defaultTalentType = "employee",
  onboardingNext = "/supermastro/profilo/onboarding",
}: Props) {
  const [state, formAction, pending] = useActionState(sendMagicLink, initial);
  const [talentType, setTalentType] = useState<TalentType>(defaultTalentType);

  const skillsBySector = getSkillsBySector(talentType);
  const sectors = (Object.keys(SKILL_SECTOR_LABELS) as SkillSector[]).filter(
    (s) => skillsBySector[s].length > 0
  );

  return (
    <div id="iscrizione" className="min-w-0 rounded-2xl surface-card p-4 sm:p-6 md:p-8">
      <h2 className="text-lg font-semibold">
        {variant === "anchecasa" ? "Iscriviti al talent pool" : "Iscriviti gratuitamente"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {variant === "anchecasa"
          ? "L'ufficio recruitment di AncheCasa — opportunità in tutta Italia."
          : "Muratore, segretaria, fattorino, idraulico — ti avvisiamo quando c'è lavoro in zona."}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTalentType("employee")}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-left text-sm transition",
            talentType === "employee"
              ? "border-brand bg-blue-50 font-semibold text-brand"
              : "border-[var(--border)] hover:border-brand/40"
          )}
        >
          Cerco lavoro
          <span className="mt-0.5 block text-xs font-normal text-muted">Dipendente</span>
        </button>
        <button
          type="button"
          onClick={() => setTalentType("artisan")}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-left text-sm transition",
            talentType === "artisan"
              ? "border-worker bg-amber-50 font-semibold text-amber-800"
              : "border-[var(--border)] hover:border-worker/40"
          )}
        >
          Artigiano / P.IVA
          <span className="mt-0.5 block text-xs font-normal text-muted">Libero professionista</span>
        </button>
      </div>

      <form
        action={formAction}
        className="mt-5 space-y-4"
        onSubmit={(e) => {
          const form = e.currentTarget;
          const fd = new FormData(form);
          saveTalentSignupDraft({
            talentType,
            skill: String(fd.get("skill") ?? ""),
            cap: String(fd.get("cap") ?? "").trim(),
            comune: String(fd.get("comune") ?? "").trim() || undefined,
          });
        }}
      >
        <input type="hidden" name="role" value="worker" />
        <input type="hidden" name="next" value={onboardingNext} />

        <div className="space-y-2">
          <label htmlFor="skill" className="text-sm font-medium">
            {talentType === "artisan" ? "La tua attività principale" : "Mansione cercata"}
          </label>
          <select
            id="skill"
            name="skill"
            required
            className="flex h-11 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 text-sm"
          >
            <option value="">Seleziona categoria</option>
            {sectors.map((sector) => (
              <optgroup key={sector} label={SKILL_SECTOR_LABELS[sector]}>
                {skillsBySector[sector].map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                    {s.sosEnabled ? " — SOS attivo" : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="cap" className="text-sm font-medium">
              CAP / zona
            </label>
            <Input
              id="cap"
              name="cap"
              required
              pattern="[0-9]{5}"
              placeholder="00100"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="comune" className="text-sm font-medium">
              Comune (opzionale)
            </label>
            <Input id="comune" name="comune" placeholder="Roma" />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="talent-email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="talent-email"
            name="email"
            type="email"
            required
            placeholder="nome@email.it"
            autoComplete="email"
          />
        </div>

        <p className="text-xs text-muted">
          Iscrizione e servizio SOS attivi in tutta Italia. Ti avvisiamo quando c&apos;è lavoro o
          un&apos;emergenza in zona.
        </p>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-green-700">{state.success}</p>}

        <Button
          type="submit"
          variant={talentType === "artisan" ? "worker" : "client"}
          size="lg"
          className="w-full"
          disabled={pending}
        >
          {pending ? "Invio…" : "Continua con email"}
        </Button>
      </form>
    </div>
  );
}
