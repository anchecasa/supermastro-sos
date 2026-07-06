import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ItalyDemandMap } from "@/components/marketing/italy-demand-map";
import { TalentSignupModule } from "@/components/talent/talent-signup-module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Cerco lavoro — SuperMastro",
  description:
    "Iscriviti gratis al talent pool SuperMastro / AncheCasa. Opportunità in tutta Italia.",
};

const SERVICES = [
  {
    title: "Cerco lavoro",
    body: "Segretaria, muratore, fattorino, saldatore — iscrizione gratuita in tutta Italia.",
  },
  {
    title: "Artigiano con P.IVA",
    body: "Idraulico, elettricista, imprenditore edile: profilo verificato e opportunità in zona.",
  },
  {
    title: "SOS casa",
    body: "Emergenza domestica nelle zone pilota — inviti urgenti per mastri verificati.",
  },
] as const;

export default function SuperMastroLavoroPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/images/supermastro-mezzobusto.png"
            alt="SuperMastro"
            width={120}
            height={120}
            className="h-24 w-auto sm:h-28"
            priority
          />
          <Badge variant="client" className="mt-4">
            Talent pool nazionale
          </Badge>
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Il cuore del lavoro in Italia
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            Iscriviti in 2 minuti. Muratore, segretaria, fattorino, idraulico — ti avvisiamo quando
            c&apos;è opportunità in zona.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <TalentSignupModule variant="supermastro" />
          <ItalyDemandMap variant="recruitment" className="lg:sticky lg:top-24" />
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-white py-10">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-3 sm:px-6">
          {SERVICES.map((s) => (
            <div key={s.title} className="rounded-2xl border border-[var(--border)] p-5">
              <h3 className="font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6">
        <p className="text-sm text-muted">Sei un datore di lavoro?</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/lavoro/assumi">Cerco personale — condomini, hotel, ditte</Link>
        </Button>
      </section>
    </>
  );
}
