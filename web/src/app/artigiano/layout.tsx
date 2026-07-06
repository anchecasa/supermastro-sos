import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Area Mastri — SuperMastro / AncheCasa",
  description: "Lavori in zona. Tu decidi. Solo quando accetti.",
};

export default function ArtigianoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-[var(--background)] text-foreground">
      <SiteHeader
        product="artigiano"
        subtitle="SuperMastro"
        ctaHref="/artigiano#iscrizione"
        ctaLabel="Iscriviti"
      />
      <main>{children}</main>
    </div>
  );
}
