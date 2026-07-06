import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { SuperMastroTerminiContent } from "@/components/legal/supermastro-termini-content";

export const metadata: Metadata = {
  title: "Termini di servizio — SuperMastro",
  description:
    "Termini e condizioni d'uso del servizio SuperMastro SOS per i clienti AncheCasa.",
};

export default function TerminiPage() {
  return (
    <div className="space-y-6">
      <Link href="/supermastro" className="text-sm text-brand hover:underline">
        ← SuperMastro
      </Link>
      <LegalPageShell
        title="Termini e condizioni di servizio"
        subtitle="Servizio SuperMastro SOS — Clienti"
      >
        <SuperMastroTerminiContent />
      </LegalPageShell>
    </div>
  );
}
