import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "SuperMastro — AncheCasa",
  description: "Scatta, invia, risolviamo.",
};

export default function SuperMastroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-[var(--background)] text-foreground">
      <SiteHeader
        product="supermastro"
        ctaHref="/supermastro/lavoro"
        ctaLabel="Cerco lavoro"
      />
      <main>{children}</main>
    </div>
  );
}
