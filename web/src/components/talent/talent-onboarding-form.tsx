"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { submitTalentOnboarding, type TalentOnboardingState } from "@/app/lavoro/actions";
import {
  readTalentSignupDraft,
  clearTalentSignupDraft,
  type TalentType,
} from "@/lib/worker-signup-draft";
import {
  getSkillsBySector,
  SKILL_SECTOR_LABELS,
  type SkillSector,
} from "@/lib/worker-skills";
import { AVAILABILITY_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: TalentOnboardingState = {};

type Props = {
  defaultEmail?: string;
  defaultTalentType?: TalentType;
};

export function TalentOnboardingForm({ defaultEmail, defaultTalentType }: Props) {
  const [state, action, pending] = useActionState(submitTalentOnboarding, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [talentType, setTalentType] = useState<TalentType>(
    defaultTalentType ?? readTalentSignupDraft()?.talentType ?? "employee"
  );

  useEffect(() => {
    const draft = readTalentSignupDraft();
    if (!draft || !formRef.current) return;
    const capInput = formRef.current.elements.namedItem("cap") as HTMLInputElement | null;
    const comuneInput = formRef.current.elements.namedItem("comune") as HTMLInputElement | null;
    if (capInput && draft.cap) capInput.value = draft.cap;
    if (comuneInput && draft.comune) comuneInput.value = draft.comune;
    if (draft.talentType) setTalentType(draft.talentType);
    if (draft.skill) {
      const checkbox = formRef.current.elements.namedItem(
        `skill_${draft.skill}`
      ) as HTMLInputElement | null;
      if (checkbox) checkbox.checked = true;
    }
    clearTalentSignupDraft();
  }, []);

  const skillsBySector = getSkillsBySector(talentType);
  const sectors = (Object.keys(SKILL_SECTOR_LABELS) as SkillSector[]).filter(
    (s) => skillsBySector[s].length > 0
  );

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="talent_type" value={talentType} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTalentType("employee")}
          className={`rounded-xl border px-3 py-2 text-sm ${
            talentType === "employee"
              ? "border-brand bg-blue-50 font-semibold text-brand"
              : "border-[var(--border)]"
          }`}
        >
          Dipendente
        </button>
        <button
          type="button"
          onClick={() => setTalentType("artisan")}
          className={`rounded-xl border px-3 py-2 text-sm ${
            talentType === "artisan"
              ? "border-worker bg-amber-50 font-semibold text-amber-800"
              : "border-[var(--border)]"
          }`}
        >
          Artigiano / P.IVA
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium">
          {talentType === "artisan" ? "Nome / ragione sociale" : "Nome e cognome"}
        </label>
        <Input name="display_name" required className="mt-1" />
      </div>

      {talentType === "artisan" && (
        <div>
          <label className="block text-sm font-medium">Partita IVA</label>
          <Input
            name="vat_number"
            required
            pattern="[0-9]{11}"
            placeholder="12345678901"
            inputMode="numeric"
            maxLength={11}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted">11 cifre, senza spazi</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">Presentazione (max 300 caratteri)</label>
        <textarea
          name="bio"
          required
          maxLength={300}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Telefono</label>
          <Input name="phone" type="tel" required className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <Input
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">CAP</label>
          <Input name="cap" required pattern="[0-9]{5}" placeholder="00100" className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Comune</label>
          <Input name="comune" placeholder="Roma" className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Raggio km</label>
          <Input
            name="service_radius_km"
            type="number"
            min={5}
            max={100}
            defaultValue={30}
            required
            className="mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Disponibilità</label>
          <select
            name="availability"
            required
            className="mt-1 flex h-10 w-full rounded-xl border border-[var(--border)] bg-white px-3 text-sm"
          >
            {AVAILABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">URL foto profilo (opzionale)</label>
        <Input name="photo_url" type="url" placeholder="https://..." className="mt-1" />
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Competenze / mansioni</legend>
        <p className="mt-1 text-xs text-muted">
          Seleziona tutte le tue competenze. Riceverai inviti SOS e opportunità di lavoro in base
          alla tua zona e al raggio operativo.
        </p>
        <div className="mt-3 space-y-4">
          {sectors.map((sector) => (
            <div key={sector}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {SKILL_SECTOR_LABELS[sector]}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {skillsBySector[sector].map((s) => (
                  <label
                    key={s.slug}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm has-[:checked]:border-brand has-[:checked]:bg-blue-50"
                  >
                    <input type="checkbox" name={`skill_${s.slug}`} className="rounded" />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <Button type="submit" variant="client" disabled={pending}>
        {pending ? "Invio…" : "Invia profilo per verifica"}
      </Button>
    </form>
  );
}
