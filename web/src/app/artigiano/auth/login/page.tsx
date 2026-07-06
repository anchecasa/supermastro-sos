import { MagicLinkForm } from "@/components/auth/magic-link-form";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";
import { sanitizeAuthNextPath } from "@/lib/constants";

export default async function ArtigianoLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeAuthNextPath(params.next, "worker");

  return (
    <ContentPage size="sm">
      <Link href="/artigiano" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Torna all&apos;area mastri
      </Link>
      <MagicLinkForm
        role="worker"
        title="Accedi come mastro"
        subtitle="Registrazione dedicata agli artigiani verificati SuperMastro."
        privacyLabel="Ho letto e accetto l'informativa privacy e i termini per artigiani."
        nextPath={nextPath}
      />
    </ContentPage>
  );
}
