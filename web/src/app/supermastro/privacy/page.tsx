import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { ContentPage } from "@/components/layout/content-page";
import { SuperMastroPrivacyContent } from "@/components/legal/supermastro-privacy-content";

export const metadata: Metadata = {
  title: "Informativa Privacy — SuperMastro",
  description:
    "Informativa privacy del servizio SuperMastro SOS di AncheCasa ai sensi del GDPR.",
};

export default function PrivacyPage() {
  return (
    <ContentPage>
      <Link href="/supermastro" className="text-sm text-brand hover:underline">
        ← SuperMastro
      </Link>
      <LegalPageShell
        title="Informativa sulla privacy"
        subtitle="Servizio SuperMastro SOS — Clienti"
      >
        <SuperMastroPrivacyContent />
      </LegalPageShell>
    </ContentPage>
  );
}
