import { createAdminClient } from "@/lib/supabase/admin";
import { DisputeResolveForm } from "@/components/admin/dispute-resolve-form";

export default async function AdminDisputePage() {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return <p className="text-red-400">{e instanceof Error ? e.message : "Errore config"}</p>;
  }

  const { data: disputes, error } = await admin.rpc("admin_list_disputes");

  if (error) {
    return <p className="text-red-400">{error.message}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Coda dispute ({disputes?.length ?? 0})</h1>

      {!disputes?.length ? (
        <p className="text-slate-400">Nessuna dispute aperta.</p>
      ) : (
        <ul className="space-y-4">
          {(disputes as Array<{
            id: string;
            type: string;
            status: string;
            description: string;
            opener_role: string;
            worker_name: string;
            client_email: string;
            created_at: string;
          }>).map((d) => (
            <li key={d.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-slate-800 px-2 py-0.5">{d.type}</span>
                <span className="text-slate-500">{d.opener_role}</span>
              </div>
              <p className="text-sm">{d.description}</p>
              <p className="text-xs text-slate-500">
                Cliente: {d.client_email} · Mastro: {d.worker_name}
              </p>
              <DisputeResolveForm disputeId={d.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
