"use client";

import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { submitWorkerOnboarding, type OnboardingState } from "@/app/artigiano/actions";
import { readWorkerSignupDraft, clearWorkerSignupDraft } from "@/lib/worker-signup-draft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: OnboardingState = {};

import { WORKER_SKILL_CATALOG } from "@/lib/worker-skills";

export function WorkerOnboardingForm({ defaultEmail }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState(submitWorkerOnboarding, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const draft = readWorkerSignupDraft();
    if (!draft || !formRef.current) return;
    const capInput = formRef.current.elements.namedItem("cap") as HTMLInputElement | null;
    if (capInput && draft.cap) capInput.value = draft.cap;
    if (draft.skill) {
      const checkbox = formRef.current.elements.namedItem(
        `skill_${draft.skill}`
      ) as HTMLInputElement | null;
      if (checkbox) checkbox.checked = true;
    }
    clearWorkerSignupDraft();
  }, []);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <div>
        <label className="block text-sm font-medium">Nome / ragione sociale</label>
        <Input name="display_name" required className="mt-1" />
      </div>

      <div>
        <label className="block text-sm font-medium">Bio (max 300 caratteri)</label>
        <textarea
          name="bio"
          required
          maxLength={300}
          rows={3}
          className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Telefono</label>
          <Input name="phone" type="tel" required className="mt-1" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email contatto</label>
          <Input
            name="email"
            type="email"
            required
            defaultValue={defaultEmail}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">CAP sede</label>
          <Input
            name="cap"
            required
            pattern="[0-9]{5}"
            placeholder="00100"
            className="mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Raggio km</label>
          <Input
            name="service_radius_km"
            type="number"
            min={5}
            max={25}
            defaultValue={15}
            required
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">URL foto profilo (opzionale)</label>
        <Input name="photo_url" type="url" placeholder="https://..." className="mt-1" />
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Competenze</legend>
        <p className="mt-1 text-xs text-muted">
          Gli inviti SOS partono per idraulico, elettricista e fabbro. Seleziona tutte le tue
          competenze.
        </p>
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] p-3">
          {WORKER_SKILL_CATALOG.map((s) => (
            <label key={s.slug} className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name={`skill_${s.slug}`} className="rounded" />
              {s.label}
              {s.sosEnabled ? (
                <span className="text-[10px] font-medium uppercase tracking-wide text-brand">
                  SOS
                </span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" disabled={pending} variant="worker" size="full">
        {pending ? "Invio…" : "Invia per verifica"}
      </Button>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
