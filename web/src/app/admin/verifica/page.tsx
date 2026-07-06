import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminVerificaPage() {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return (
      <p className="text-red-400">
        Configura SUPABASE_SERVICE_ROLE_KEY in web/.env.local —{" "}
        {e instanceof Error ? e.message : "errore"}
      </p>
    );
  }

  const { data: queue, error } = await admin
    .from("workers")
    .select(
      "id, status, bio, cap, comune, service_radius_km, talent_type, vat_number, created_at, user_id"
    )
    .eq("status", "pending_verification")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <p className="text-red-400">
        Errore coda: {error.message}. Applica migrazioni con{" "}
        <code className="text-amber-300">node scripts/apply-migrations.mjs</code>
      </p>
    );
  }

  const userIds = queue?.map((w) => w.user_id) ?? [];
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] };

  const nameByUser = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Coda verifica mastri ({queue?.length ?? 0})</h1>
        <a href="/admin/monitor" className="text-sm text-slate-400 hover:text-white">
          Monitor SOS →
        </a>
      </div>

      {!queue?.length ? (
        <p className="text-slate-400">Nessun profilo in attesa.</p>
      ) : (
        <ul className="space-y-4">
          {queue.map((w) => (
            <li
              key={w.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <p className="font-medium">{nameByUser.get(w.user_id) ?? "—"}</p>
              <p className="mt-1 text-sm text-slate-400">{w.bio}</p>
              <p className="mt-2 text-xs text-slate-500">
                CAP {w.cap}
                {w.comune ? ` · ${w.comune}` : ""} · {w.service_radius_km} km
                {w.talent_type ? ` · ${w.talent_type}` : ""}
                {w.vat_number ? ` · P.IVA ${w.vat_number}` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={async () => {
                  "use server";
                  const { approveWorker } = await import("@/app/admin/actions");
                  await approveWorker(w.id);
                }}>
                  <button type="submit" className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white">
                    Approva
                  </button>
                </form>
                <form action={async () => {
                  "use server";
                  const { requestCorrections } = await import("@/app/admin/actions");
                  await requestCorrections(w.id);
                }}>
                  <button type="submit" className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white">
                    Correzioni
                  </button>
                </form>
                <form action={async () => {
                  "use server";
                  const { rejectWorker } = await import("@/app/admin/actions");
                  await rejectWorker(w.id);
                }}>
                  <button type="submit" className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white">
                    Rifiuta
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
