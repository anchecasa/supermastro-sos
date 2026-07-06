import Link from "next/link";
import Image from "next/image";
import { ItalyDemandMap } from "@/components/marketing/italy-demand-map";
import { HowItWorksSteps } from "@/components/marketing/how-it-works-steps";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { ClientEmailModule } from "@/components/supermastro/client-email-module";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  isLive: boolean;
  demoMode?: boolean;
  userEmail?: string | null;
  authError?: boolean;
  nuovaHref: string;
};

const HUB_SERVICES = [
  {
    title: "Cerco lavoro",
    body: "Muratore, segretaria, fattorino — iscrizione gratis in tutta Italia.",
    href: "/supermastro/lavoro",
    cta: "Iscriviti",
  },
  {
    title: "Cerco personale",
    body: "Condominio, hotel, ditta: trova personale nel talent pool.",
    href: "/lavoro/assumi",
    cta: "Assumi",
  },
  {
    title: "SOS casa",
    body: "Emergenza domestica — foto e mastro in zona (zone pilota).",
    href: null,
    cta: "SOS",
  },
] as const;

export function SuperMastroLanding({
  isLive,
  demoMode = false,
  userEmail,
  authError,
  nuovaHref,
}: Props) {
  const demoHref = "/supermastro/nuova?demo=1";
  const startHref = demoMode ? demoHref : nuovaHref;
  const loginHref = demoMode
    ? demoHref
    : "/supermastro/auth/login?next=/supermastro/nuova";

  return (
    <>
      {demoMode && (
        <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm text-blue-950 sm:px-6">
          Modalità demo attiva — prova il flusso completo senza login.
        </div>
      )}

      {!isLive && !demoMode && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-950 sm:px-6">
          Pilota SOS in preparazione — iscrizione talent pool attiva in tutta Italia.
        </div>
      )}

      {authError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          Accesso non riuscito. Riprova.
        </div>
      )}

      {/* Mobile-first hub */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-col items-center text-center lg:hidden">
          <Image
            src="/images/supermastro-mezzobusto.png"
            alt="SuperMastro"
            width={100}
            height={100}
            className="h-20 w-auto"
            priority
          />
          <Badge variant="client" className="mt-3">
            Il cuore del lavoro in Italia
          </Badge>
          <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight">
            SuperMastro
          </h1>
          <p className="mt-2 max-w-md text-muted">
            Lavoro, recruitment e SOS casa — powered by AncheCasa.
          </p>
        </div>

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <div className="hidden lg:block">
              <Badge variant="client" className="mb-4">
                Gratuito per te · SOS
              </Badge>
              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                Problema in casa?
              </h1>
              <p className="mt-4 text-xl text-muted">Scatta, invia, risolviamo.</p>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-muted">
                Foto del problema e posizione. SuperMastro capisce che intervento serve e ti mette
                in contatto con un mastro verificato in zona.
              </p>
            </div>

            <div className="mt-6 space-y-3 lg:mt-8">
              {HUB_SERVICES.map((s) => (
                <div
                  key={s.title}
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{s.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{s.body}</p>
                  </div>
                  {s.href ? (
                    <Button asChild variant={s.title === "Cerco lavoro" ? "client" : "outline"} size="sm">
                      <Link href={s.href}>{s.cta}</Link>
                    </Button>
                  ) : (
                    <Button asChild variant="client" size="sm">
                      <Link href={demoMode || userEmail ? startHref : loginHref}>
                        {demoMode ? "Demo SOS" : "SOS"}
                      </Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {!demoMode && !userEmail && (
              <div className="mt-6 hidden lg:block">
                <ClientEmailModule loginHref={loginHref} />
              </div>
            )}

            {(demoMode || userEmail) && (
              <div className="mt-6 hidden lg:block">
                {userEmail && !demoMode && (
                  <p className="mb-3 text-sm text-muted">
                    Accesso come <strong className="text-foreground">{userEmail}</strong>
                  </p>
                )}
                <Button asChild variant="client" size="lg">
                  <Link href={startHref}>
                    {demoMode ? "Prova demo SOS" : "Invia richiesta SOS"}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          <ItalyDemandMap variant="recruitment" className="mx-auto lg:sticky lg:top-24" />
        </div>
      </section>

      <TrustStrip
        items={[
          { value: "Italia", label: "iscrizione nationwide" },
          { value: "Verificati", label: "profili talent pool" },
          { value: "SOS", label: "zone pilota attive" },
        ]}
      />

      <HowItWorksSteps />

      <section className="bg-[var(--background)] py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">Pronto a iniziare?</h2>
          <p className="mx-auto mt-2 max-w-lg text-muted">
            Cerco lavoro, cerco personale o emergenza SOS — SuperMastro è il cuore del lavoro in
            Italia.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="client" size="lg">
              <Link href="/supermastro/lavoro">Cerco lavoro</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/lavoro/assumi">Cerco personale</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={demoMode || userEmail ? startHref : loginHref}>
                {demoMode ? "Demo SOS" : "SOS casa"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] bg-white px-4 py-8 text-xs text-muted sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground/80">SuperMastro — by AncheCasa</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/lavoro" className="hover:text-foreground">
              Talent pool
            </Link>
            <Link href="/supermastro/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/supermastro/termini" className="hover:text-foreground">
              Termini
            </Link>
            <Link href="/supermastro/cookie" className="hover:text-foreground">
              Cookie
            </Link>
            <Link href="/supermastro/profilo" className="hover:text-foreground">
              Il mio profilo
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
