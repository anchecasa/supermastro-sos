import Link from "next/link";
import { ItalyDemandMap } from "@/components/marketing/italy-demand-map";
import { TalentSignupModule } from "@/components/talent/talent-signup-module";
import { Badge } from "@/components/ui/badge";

const BENEFITS = [
  {
    title: "Opportunità in tutta Italia",
    body: "Recruitment e inviti SOS in tutta Italia per idraulico, elettricista, fabbro e altre competenze.",
  },
  {
    title: "Artigiano o dipendente",
    body: "Profilo con P.IVA per liberi professionisti, o mansione e disponibilità se cerchi impiego.",
  },
  {
    title: "Match mediato",
    body: "AncheCasa ti mette in contatto con condomini, hotel e ditte — come un ufficio recruitment.",
  },
] as const;

const FAQ = [
  {
    q: "Quanto costa iscriversi?",
    body: "Gratis per chi cerca lavoro. Gli artigiani SOS pagano crediti solo quando accettano interventi urgenti.",
  },
  {
    q: "Quanto tempo per la verifica?",
    body: "Entro 48 ore lavorative dopo il profilo completo.",
  },
  {
    q: "Devo cercare lavori da solo?",
    body: "No — ricevi notifiche quando c'è un match in zona, per recruitment o SOS.",
  },
] as const;

export function ArtigianoLanding() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="grid min-w-0 items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="min-w-0 space-y-8">
            <div>
              <Badge variant="worker" className="mb-4">
                Talent pool · AncheCasa
              </Badge>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.5rem]">
                Iscriviti al cuore del lavoro in Italia
              </h1>
              <p className="mt-4 text-lg text-muted">
                Muratore, segretaria, fattorino, idraulico — artigiano con P.IVA o dipendente. Ti
                avvisiamo quando c&apos;è opportunità in zona.
              </p>
            </div>
            <TalentSignupModule
              variant="supermastro"
              onboardingNext="/supermastro/profilo/onboarding"
            />
          </div>
          <ItalyDemandMap variant="recruitment" className="order-first w-full lg:order-none lg:sticky lg:top-24" />
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-white py-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
          {BENEFITS.map((b) => (
            <div key={b.title}>
              <h3 className="font-semibold text-foreground">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Come funziona?</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            "Scegli artigiano o dipendente, CAP e mansione",
            "Completa profilo — verifica AncheCasa",
            "Ricevi opportunità recruitment e SOS in zona",
          ].map((step, i) => (
            <li key={step} className="rounded-2xl surface-card p-5">
              <span className="text-sm font-semibold text-worker">{i + 1}</span>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-center text-sm text-muted">
          Cerco personale per la mia organizzazione?{" "}
          <Link href="/lavoro/assumi" className="text-brand underline">
            Pubblica un fabbisogno
          </Link>
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <h2 className="text-xl font-semibold">Domande frequenti</h2>
        <dl className="mt-6 space-y-4">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-xl border border-[var(--border)] p-4">
              <dt className="font-medium">{item.q}</dt>
              <dd className="mt-1 text-sm text-muted">{item.body}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
