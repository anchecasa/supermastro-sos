import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmployerJobForm } from "@/components/talent/employer-job-form";

export const metadata: Metadata = {
  title: "Cerco personale — AncheCasa Recruitment",
  description: "Condomini, hotel e ditte: trova personale nel talent pool nazionale AncheCasa.",
};

export default async function AssumiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Cerco personale</h1>
        <p className="mt-3 text-muted">
          Condominio, hotel, ditta: pubblica il fabbisogno e ricevi una shortlist di candidati in
          zona — come un ufficio recruitment, con il pool SuperMastro / AncheCasa.
        </p>
        <p className="mt-2 text-sm text-muted">
          Candidati?{" "}
          <Link href="/lavoro#iscrizione" className="text-brand underline">
            Iscriviti al talent pool
          </Link>
        </p>
      </div>
      <EmployerJobForm userEmail={user?.email} />
    </section>
  );
}
