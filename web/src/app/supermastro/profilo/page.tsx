import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWorkerSkillLabel } from "@/lib/worker-skills";
import { respondToJobInvitation } from "@/app/lavoro/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, string> = {
  registered: "Profilo incompleto",
  pending_verification: "In verifica",
  verified: "Verificato",
  active: "Attivo",
  suspended: "Sospeso",
  deactivated: "Disattivato",
};

export default async function ProfiloPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/supermastro/lavoro");

  const { data: worker } = await supabase
    .from("workers")
    .select(
      "id, status, bio, cap, comune, service_radius_km, talent_type, vat_number, availability, photo_url"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (!worker || worker.status === "registered") {
    redirect("/supermastro/profilo/onboarding");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { data: skills } = await supabase
    .from("worker_skills")
    .select("skills(slug, label)")
    .eq("worker_id", worker.id);

  const skillLabels = ((skills ?? []) as unknown as { skills: { label: string } | null }[])
    .map((s) => s.skills?.label)
    .filter(Boolean) as string[];

  const { data: invitations } = await supabase.rpc("get_worker_job_invitations");

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <Badge variant={worker.talent_type === "artisan" ? "worker" : "client"}>
          {worker.talent_type === "artisan" ? "Artigiano / P.IVA" : "Cerco lavoro"}
        </Badge>
        <h1 className="mt-3 text-2xl font-semibold">{profile?.display_name ?? "Il tuo profilo"}</h1>
        <p className="mt-1 text-sm text-muted">
          Stato: {STATUS_LABELS[worker.status] ?? worker.status}
        </p>
      </div>

      <section className="rounded-2xl surface-card p-6 space-y-3">
        <h2 className="font-semibold">Dettagli profilo</h2>
        <p className="text-sm text-muted">{worker.bio}</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Zona</dt>
            <dd>
              CAP {worker.cap}
              {worker.comune ? ` · ${worker.comune}` : ""} — {worker.service_radius_km} km
            </dd>
          </div>
          <div>
            <dt className="text-muted">Disponibilità</dt>
            <dd className="capitalize">{worker.availability?.replace("_", " ")}</dd>
          </div>
          {worker.talent_type === "artisan" && worker.vat_number && (
            <div>
              <dt className="text-muted">P.IVA</dt>
              <dd>{worker.vat_number}</dd>
            </div>
          )}
        </dl>
        <div>
          <p className="text-sm text-muted">Competenze</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {skillLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-brand"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        {worker.status === "registered" && (
          <Button asChild variant="outline" size="sm">
            <Link href="/supermastro/profilo/onboarding">Completa profilo</Link>
          </Button>
        )}
      </section>

      {invitations && invitations.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold">Opportunità in zona</h2>
          {invitations.map(
            (inv: {
              candidate_id: string;
              role_title: string;
              skill_slug: string;
              cap: string;
              comune: string | null;
              distance_km: number;
              status: string;
            }) => (
              <div key={inv.candidate_id} className="rounded-2xl surface-card p-5">
                <p className="font-medium">{inv.role_title}</p>
                <p className="mt-1 text-sm text-muted">
                  {getWorkerSkillLabel(inv.skill_slug)} · {inv.comune ?? inv.cap} · ~
                  {inv.distance_km} km
                </p>
                {inv.status === "invited" && (
                  <div className="mt-4 flex gap-2">
                    <form
                      action={async () => {
                        "use server";
                        await respondToJobInvitation(inv.candidate_id, true);
                      }}
                    >
                      <Button type="submit" variant="client" size="sm">
                        Accetto
                      </Button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await respondToJobInvitation(inv.candidate_id, false);
                      }}
                    >
                      <Button type="submit" variant="ghost" size="sm">
                        No grazie
                      </Button>
                    </form>
                  </div>
                )}
                {inv.status === "accepted" && (
                  <p className="mt-3 text-sm text-green-700">Hai accettato — in attesa di match.</p>
                )}
              </div>
            )
          )}
        </section>
      )}

      <p className="text-xs text-muted">
        SOS urgente e opportunità di lavoro attivi in tutta Italia, in base a competenze e zona
        operativa.
      </p>
    </div>
  );
}
