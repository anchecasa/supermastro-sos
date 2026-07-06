import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { SuperMastroCookieContent } from "@/components/legal/supermastro-cookie-content";

export const metadata: Metadata = {
  title: "Cookie Policy — SuperMastro",
  description: "Informativa sui cookie del sito AncheCasa e del servizio SuperMastro.",
};

export default function CookiePage() {
  return (
    <div className="space-y-6">
      <Link href="/supermastro" className="text-sm text-brand hover:underline">
        ← SuperMastro
      </Link>
      <LegalPageShell
        title="Cookie Policy"
        subtitle="Utilizzo di cookie e tecnologie simili su AncheCasa / SuperMastro"
      >
        <SuperMastroCookieContent />
      </LegalPageShell>
    </div>
  );
}
