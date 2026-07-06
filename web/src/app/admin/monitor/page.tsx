import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { RedispatchButton } from "@/components/admin/redispatch-button";

const STATUS_COLORS: Record<string, string> = {
  submitted: "text-blue-400",
  diagnosing: "text-yellow-400",
  inviting: "text-amber-400",
  matched: "text-green-400",
};

export default async function AdminMonitorPage() {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return (
      <p className="text-red-400">
        {e instanceof Error ? e.message : "Configura SUPABASE_SERVICE_ROLE_KEY"}
      </p>
    );
  }

  const { data: requests, error: reqError } = await admin.rpc(
    "admin_list_active_requests"
  );

  const { data: invitations, error: invError } = await admin.rpc(
    "admin_list_invitation_log",
    { p_request_id: null }
  );

  if (reqError) {
    return (
      <p className="text-red-400">
        Errore richieste: {reqError.message}. Applica migrazioni Blocco E.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">Monitor richieste SOS</h1>
        <Link href="/admin/verifica" className="text-sm text-slate-400 hover:text-white">
          ← Verifica mastri
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Richieste attive ({requests?.length ?? 0})
        </h2>

        {!requests?.length ? (
          <p className="text-slate-400">Nessuna richiesta attiva.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Stato</th>
                  <th className="px-3 py-2">Skill</th>
                  <th className="px-3 py-2">Urgenza</th>
                  <th className="px-3 py-2">Inviti</th>
                  <th className="px-3 py-2">Scade</th>
                  <th className="px-3 py-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {(requests as Array<{
                  id: string;
                  status: string;
                  skill_label: string;
                  urgency: string;
                  invitation_count: number;
                  pending_invites: number;
                  expires_at: string | null;
                  matched_at: string | null;
                  created_at: string;
                }>).map((r) => (
                  <tr key={r.id} className="border-b border-slate-800/80">
                    <td className={`px-3 py-2 font-mono text-xs ${STATUS_COLORS[r.status] ?? ""}`}>
                      {r.status}
                    </td>
                    <td className="px-3 py-2">{r.skill_label ?? "—"}</td>
                    <td className="px-3 py-2">{r.urgency ?? "—"}</td>
                    <td className="px-3 py-2">
                      {r.pending_invites}/{r.invitation_count} pending
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {r.expires_at
                        ? new Date(r.expires_at).toLocaleString("it-IT")
                        : r.matched_at
                          ? `Match ${new Date(r.matched_at).toLocaleString("it-IT")}`
                          : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {r.status === "inviting" && (
                        <RedispatchButton requestId={r.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Log inviti recenti
          {invError && (
            <span className="ml-2 text-red-400 normal-case">{invError.message}</span>
          )}
        </h2>

        {!invitations?.length ? (
          <p className="text-slate-400">Nessun invito registrato.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Mastro</th>
                  <th className="px-3 py-2">Stato invito</th>
                  <th className="px-3 py-2">Distanza</th>
                  <th className="px-3 py-2">Creato</th>
                  <th className="px-3 py-2">Risposta</th>
                </tr>
              </thead>
              <tbody>
                {(invitations as Array<{
                  id: string;
                  worker_name: string;
                  invitation_status: string;
                  distance_km: number;
                  created_at: string;
                  responded_at: string | null;
                }>)
                  .slice(0, 50)
                  .map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-800/80">
                      <td className="px-3 py-2">{inv.worker_name ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{inv.invitation_status}</td>
                      <td className="px-3 py-2">{inv.distance_km} km</td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {new Date(inv.created_at).toLocaleString("it-IT")}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {inv.responded_at
                          ? new Date(inv.responded_at).toLocaleString("it-IT")
                          : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-600">
        Runbook R1–R3:{" "}
        <code className="text-slate-400">docs/RUNBOOK-OPS-R1-R3-v1.md</code>
      </p>
    </div>
  );
}
