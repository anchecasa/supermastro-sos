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

        <Badge variant="client">Richiesta SOS</Badge>

        <h1 className="text-2xl font-semibold tracking-tight">Nuova richiesta SOS</h1>

        <p className="text-sm text-muted leading-relaxed">

          Gratuito per te — paghi solo il mastro per l&apos;intervento.

        </p>

      </section>

      <SosWizard userId={user?.id ?? "demo"} demoMode={demoMode} />

    </div>

  );

}


