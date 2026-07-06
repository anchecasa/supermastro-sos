import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Lavoro — AncheCasa",
  description: "Talent pool e recruitment AncheCasa / SuperMastro.",
};

export default function LavoroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-[var(--background)] text-foreground">
      <SiteHeader
        product="lavoro"
        subtitle="Recruitment · AncheCasa"
        ctaHref="/lavoro/assumi"
        ctaLabel="Cerco personale"
      />
      <main>{children}</main>
      <footer className="border-t border-[var(--border)] bg-white px-4 py-8 text-xs text-muted sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/80">AncheCasa — Talent Intelligence</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/supermastro/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/supermastro/termini" className="hover:text-foreground">
              Termini
            </Link>
            <Link href="/supermastro" className="hover:text-foreground">
              SuperMastro SOS
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
