import type { Metadata } from "next";
import Link from "next/link";
import { ItalyDemandMap } from "@/components/marketing/italy-demand-map";
import { TalentSignupModule } from "@/components/talent/talent-signup-module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Talent pool — AncheCasa Recruitment",
  description:
    "L'ufficio recruitment di AncheCasa. Iscriviti al talent pool nazionale o pubblica un fabbisogno.",
};

export default function LavoroPage() {
  return (
    <>
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-slate-50 to-white py-14">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <Badge variant="client" className="mb-4">
            AncheCasa · Talent Intelligence
          </Badge>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            L&apos;ufficio recruitment di AncheCasa
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            Il cuore del lavoro in Italia — pool verificato di professionisti, artigiani e
            candidati in tutta la nazione.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="client" size="lg">
              <Link href="#iscrizione">Iscriviti al talent pool</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/lavoro/assumi">Cerco personale</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid min-w-0 items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold">Per chi cerca lavoro</h2>
            <p className="mt-2 text-muted">
              Condomini, hotel e imprese cercano segretarie, fattorini, manutentori, operai e
              artigiani. Iscriviti gratis — ti contattiamo quando c&apos;è un match in zona.
            </p>
            <TalentSignupModule
              variant="anchecasa"
              onboardingNext="/supermastro/profilo/onboarding"
            />
          </div>
          <ItalyDemandMap variant="recruitment" className="order-first w-full lg:order-none lg:sticky lg:top-24" />
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--background)] py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="rounded-2xl surface-card p-6">
              <h3 className="font-semibold">Artigiano con Partita IVA</h3>
              <p className="mt-2 text-sm text-muted">
                Profilo verificato, competenze, zone operative. Inviti SOS e opportunità di lavoro
                in tutta Italia.
              </p>
            </div>
            <div className="rounded-2xl surface-card p-6">
              <h3 className="font-semibold">Dipendente / cerco impiego</h3>
              <p className="mt-2 text-sm text-muted">
                Segretaria, receptionist, magazziniere, addetto pulizie — nessuna P.IVA richiesta.
                Disponibilità e mansioni nel tuo profilo.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
