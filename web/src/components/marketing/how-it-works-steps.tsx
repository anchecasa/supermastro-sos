import { Camera, PhoneCall, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Camera,
    title: "Scatta",
    body: "Foto del problema e posizione. Bastano pochi secondi.",
  },
  {
    icon: Sparkles,
    title: "Capisci",
    body: "SuperMastro individua il mestiere — idraulico, elettricista o fabbro.",
  },
  {
    icon: PhoneCall,
    title: "Risolve",
    body: "Un mastro verificato in zona accetta e ti contatta.",
  },
] as const;

type Props = {
  className?: string;
};

export function HowItWorksSteps({ className }: Props) {
  return (
    <section className={cn("bg-[var(--section-alt)] py-14 sm:py-16", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Come funziona</h2>
        <p className="mt-2 max-w-xl text-muted">
          Tre passi chiari — nessuna ricerca manuale di artigiani.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="rounded-2xl surface-card p-6 transition hover:shadow-md"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-soft">
                  <Icon className="size-5 text-brand" strokeWidth={1.5} />
                </div>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">
                  Passo {i + 1}
                </p>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
