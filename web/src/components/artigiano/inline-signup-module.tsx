"use client";

import { TalentSignupModule } from "@/components/talent/talent-signup-module";

/** @deprecated Usare TalentSignupModule — mantenuto per compatibilità /artigiano */
export function InlineSignupModule() {
  return (
    <TalentSignupModule
      variant="supermastro"
      defaultTalentType="artisan"
      onboardingNext="/supermastro/profilo/onboarding"
    />
  );
}
