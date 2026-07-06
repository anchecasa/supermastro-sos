import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminWorkerActions } from "@/components/admin/admin-worker-actions";
import { getWorkerSkillLabel } from "@/lib/worker-skills";

const STATUS_FILTERS = [
  { value: "", label: "Tutti" },
  { value: "pending_verification", label: "In verifica" },
  { value: "active", label: "Attivi" },
  { value: "verified", label: "Verificati" },
  { value: "suspended", label: "Sospesi" },
  { value: "deactivated", label: "Disattivati" },
];

type WorkerRow = {
  worker_id: string;
  display_name: string;
  status: string;
  talent_type: string;
  cap: string | null;
  comune: string | null;
  recruitment_active: boolean;
  skill_slugs: string[];
  created_at: string;
};

export default async function AdminTalentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return <p className="text-red-400">{e instanceof Error ? e.message : "Errore"}</p>;
  }

  const { data, error } = await admin.rpc("admin_list_workers_for_skill", {
    p_skill_slug: null,
    p_status: status || null,
  });

  if (error) {
    return <p className="text-red-400">{error.message}</p>;
  }

  const workers = (data ?? []) as WorkerRow[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Talent ({workers.length})</h1>
        <Link href="/admin/verifica" className="text-sm text-slate-400 hover:text-white">
          Coda verifica →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value || "all"}
            href={f.value ? `/admin/talent?status=${f.value}` : "/admin/talent"}
            className={`rounded-full border px-3 py-1 text-sm ${
              (status ?? "") === f.value
                ? "border-sky-600 bg-sky-950 text-sky-300"
                : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!workers.length ? (
        <p className="text-slate-400">Nessun talent trovato.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">Skill</th>
                <th className="px-3 py-2">Recruitment</th>
                <th className="px-3 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.worker_id} className="border-b border-slate-800/80">
                  <td className="px-3 py-2 font-medium">{w.display_name ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{w.status}</td>
                  <td className="px-3 py-2">{w.talent_type}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    CAP {w.cap ?? "—"}
                    {w.comune ? ` · ${w.comune}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {(w.skill_slugs ?? [])
                      .slice(0, 3)
                      .map((s) => getWorkerSkillLabel(s))
                      .join(", ")}
                    {(w.skill_slugs?.length ?? 0) > 3 ? "…" : ""}
                  </td>
                  <td className="px-3 py-2">
                    {w.recruitment_active ? (
                      <span className="text-emerald-400">On</span>
                    ) : (
                      <span className="text-slate-500">Off</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <AdminWorkerActions workerId={w.worker_id} status={w.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
