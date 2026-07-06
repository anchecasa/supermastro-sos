import { MagicLinkForm } from "@/components/auth/magic-link-form";
import Link from "next/link";
import { sanitizeAuthNextPath } from "@/lib/constants";

export default async function ArtigianoLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeAuthNextPath(params.next, "worker");

  return (
    <div className="space-y-6">
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
    </div>
  );
}
