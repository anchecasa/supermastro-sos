import type { Metadata } from "next";
import Link from "next/link";
import { ArtigianoTerminiContent } from "@/components/legal/artigiano-termini-content";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = {
  title: "Termini di servizio — Artigiani",
  description: "Termini e condizioni per artigiani iscritti alla piattaforma AncheCasa.",
};

export default function ArtigianoTerminiPage() {
  return (
    <ContentPage>
      <Link href="/artigiano" className="text-sm text-brand hover:underline">
        ← Area mastri
      </Link>
      <LegalPageShell
        title="Termini e condizioni di servizio"
        subtitle="Programma Artigiano / Mastri — AncheCasa"
      >
        <ArtigianoTerminiContent />
      </LegalPageShell>
    </ContentPage>
  );
}
