import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SosWizard } from "@/components/supermastro/sos-wizard";
import { Badge } from "@/components/ui/badge";
import { isSosDemoMode } from "@/lib/sos/demo";

export const metadata: Metadata = {
  title: "Nuova richiesta SOS — SuperMastro",
};

export default async function NuovaRichiestaPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const params = await searchParams;
  const demoMode = isSosDemoMode() || params.demo === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!demoMode && !user) {
    redirect("/supermastro/auth/login?next=/supermastro/nuova");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:max-w-xl">
      <Link href="/supermastro" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Torna a SuperMastro
      </Link>
      <section className="space-y-3">
        <Badge variant="client">{demoMode ? "Demo SOS" : "Wizard SOS"}</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">
          {demoMode ? "Prova la richiesta SOS" : "Nuova richiesta"}
        </h1>
        <p className="text-sm text-muted leading-relaxed">
          {demoMode
            ? "Simulazione completa: GPS reale, analisi AI fittizia e mastro trovato in pochi secondi."
            : "Gratuito per te — paghi solo il mastro per l'intervento."}
        </p>
      </section>
      <SosWizard userId={user?.id ?? "demo"} demoMode={demoMode} />
    </div>
  );
}
