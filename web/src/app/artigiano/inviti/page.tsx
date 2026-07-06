import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvitationsList, type InvitationRow } from "@/components/artigiano/invitations-list";
import { ContentPage } from "@/components/layout/content-page";
import type { UrgencyLevel } from "@/lib/sos/constants";

export default async function ArtigianoInvitiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/artigiano/auth/login?next=/artigiano/inviti");
  }

  const { data: worker } = await supabase
    .from("workers")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!worker || worker.status !== "active") {
    return (
      <ContentPage size="sm">
        <Link href="/artigiano" className="text-sm text-amber-400 hover:underline">
          ← Area mastri
        </Link>
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
          Attiva il trial e completa la verifica per ricevere inviti SOS.
        </p>
      </ContentPage>
    );
  }

  const { data: rows, error } = await supabase.rpc("get_worker_pending_invitations");

  if (error) {
    return (
      <ContentPage size="sm">
        <p className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-300">
          {error.message}
        </p>
      </ContentPage>
    );
  }

  const invitations: InvitationRow[] = (rows ?? []).map(
    (row: {
      id: string;
      distance_km: number;
      district_hint: string | null;
      created_at: string;
      skill_label: string;
      urgency: UrgencyLevel;
    }) => ({
      id: row.id,
      distance_km: Number(row.distance_km),
      district_hint: row.district_hint,
      created_at: row.created_at,
      skill_label: row.skill_label,
      urgency: row.urgency,
    })
  );

  return (
    <ContentPage size="sm">
      <Link href="/artigiano" className="text-sm text-amber-400 hover:underline">
        ← Area mastri
      </Link>
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">Inviti SOS</h1>
        <p className="text-sm text-zinc-400">
          Accetti tu. Il credito si scala solo quando accetti.
        </p>
      </section>
      <InvitationsList invitations={invitations} />
    </ContentPage>
  );
}
