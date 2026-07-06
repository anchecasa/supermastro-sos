import { MagicLinkForm } from "@/components/auth/magic-link-form";
import Link from "next/link";
import { sanitizeAuthNextPath } from "@/lib/constants";

export default async function SuperMastroLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = sanitizeAuthNextPath(params.next, "client");

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg space-y-6 px-4 py-8 sm:max-w-xl sm:px-6">
      <Link href="/supermastro" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Torna a SuperMastro
      </Link>
      <MagicLinkForm
        role="client"
        title="Accedi a SuperMastro"
        subtitle="Ti invieremo un link sicuro via email. Nessuna password."
        privacyLabel="Ho letto e accetto l'informativa privacy e i termini del servizio cliente SOS."
        nextPath={nextPath}
      />
    </div>
  );
}
