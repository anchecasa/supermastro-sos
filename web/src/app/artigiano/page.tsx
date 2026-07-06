import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { ArtigianoLanding } from "@/components/artigiano/artigiano-landing";
import { ActivateTrialButton } from "@/components/artigiano/activate-trial-button";
import { BuyCreditsButton } from "@/components/artigiano/buy-credits-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<string, string> = {
  registered: "Completa il profilo",
  pending_verification: "In verifica admin",
  verified: "Attiva il trial per ricevere lavori",
  active: "Operativo — puoi ricevere inviti",
  suspended: "Account sospeso",
  deactivated: "Account disattivato",
};

export default async function ArtigianoPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string; billing?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ArtigianoLanding />;
  }

  const { data: worker } = await supabase
    .from("workers")
    .select("id, status, cap, service_radius_km")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!worker || worker.status === "registered") {
    redirect("/artigiano/onboarding");
  }

  let balance: number | null = null;
  if (worker?.status === "active") {
    const { data: billing } = await supabase
      .from("billing_accounts")
      .select("id")
      .eq("worker_id", worker.id)
      .maybeSingle();

    if (billing?.id) {
      const { data: balRow } = await supabase
        .from("credit_balance")
        .select("balance")
        .eq("account_id", billing.id)
        .maybeSingle();
      balance = balRow?.balance ?? 0;
    }
  }

  const status = worker?.status ?? "registered";
  const statusHint = STATUS_LABEL[status] ?? status;

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-8 sm:max-w-xl">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Ciao, mastro</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </section>

      {params.auth === "error" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">Accesso non riuscito.</CardContent>
        </Card>
      )}
      {params.billing === "success" && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-800">
            Pagamento ricevuto. I crediti saranno attivi a breve.
          </CardContent>
        </Card>
      )}
      {params.billing === "paid_success" && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 text-sm text-emerald-800">
            Pacchetto acquistato — 5 crediti in arrivo.
          </CardContent>
        </Card>
      )}
      {params.billing === "cancel" && (
        <Card>
          <CardContent className="p-4 text-sm text-muted">Pagamento annullato.</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-muted">Stato account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Badge variant="worker">{statusHint}</Badge>
            <p className="mt-2 text-xs text-muted">
              <code className="rounded bg-zinc-100 px-1.5 py-0.5">{status}</code>
            </p>
          </div>

          {balance !== null && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Crediti disponibili</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight">{balance}</p>
            </div>
          )}

          {status === "verified" && <ActivateTrialButton />}

          {status === "active" && (
            <>
              <Button asChild variant="worker" size="full">
                <Link href="/artigiano/inviti">Vedi inviti SOS</Link>
              </Button>
              <BuyCreditsButton />
              {balance === 0 && (
                <p className="text-sm text-amber-800">
                  Crediti esauriti — acquista un pacchetto per ricevere inviti.
                </p>
              )}
            </>
          )}

          <form
            action={async () => {
              "use server";
              await signOut("/artigiano");
            }}
          >
            <Button type="submit" variant="ghost" size="sm" className="text-muted">
              Esci
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
