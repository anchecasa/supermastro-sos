import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminJobActions } from "@/components/admin/admin-job-actions";
import { AdminEmployerActions } from "@/components/admin/admin-employer-actions";
import { getWorkerSkillLabel } from "@/lib/worker-skills";

type JobRow = {
  job_id: string;
  role_title: string;
  skill_slug: string;
  cap: string;
  comune: string | null;
  status: string;
  candidate_count: number;
  employer_name: string;
  created_at: string;
};

export default async function AdminAnnunciPage({
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

  const { data, error } = await admin.rpc("admin_list_jobs_for_skill", {
    p_skill_slug: null,
  });

  const { data: employers } = await admin
    .from("employer_organizations")
    .select("id, name, referent_name, cap, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return <p className="text-red-400">{error.message}</p>;
  }

  let jobs = (data ?? []) as JobRow[];
  if (status) {
    jobs = jobs.filter((j) => j.status === status);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold">Annunci recruitment ({jobs.length})</h1>
        <Link href="/admin/recruitment" className="text-sm text-slate-400 hover:text-white">
          Vista shortlist →
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "", label: "Tutti" },
          { value: "pending_review", label: "Da approvare" },
          { value: "open", label: "Aperti" },
          { value: "matched", label: "Matchati" },
          { value: "suspended", label: "Sospesi" },
          { value: "closed", label: "Chiusi" },
        ].map((f) => (
          <Link
            key={f.value || "all"}
            href={f.value ? `/admin/annunci?status=${f.value}` : "/admin/annunci"}
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

      {!jobs.length ? (
        <p className="text-slate-400">Nessun annuncio trovato.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Titolo</th>
                <th className="px-3 py-2">Datore</th>
                <th className="px-3 py-2">Skill</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2">Candidati</th>
                <th className="px-3 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_id} className="border-b border-slate-800/80">
                  <td className="px-3 py-2 font-medium">{job.role_title}</td>
                  <td className="px-3 py-2">{job.employer_name}</td>
                  <td className="px-3 py-2">{getWorkerSkillLabel(job.skill_slug)}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    CAP {job.cap}
                    {job.comune ? ` · ${job.comune}` : ""}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{job.status}</td>
                  <td className="px-3 py-2 tabular-nums">{job.candidate_count}</td>
                  <td className="px-3 py-2">
                    <AdminJobActions jobId={job.job_id} status={job.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="space-y-3 pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Datori di lavoro ({employers?.length ?? 0})
        </h2>
        {!employers?.length ? (
          <p className="text-slate-400">Nessun datore registrato.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Organizzazione</th>
                  <th className="px-3 py-2">Referente</th>
                  <th className="px-3 py-2">CAP</th>
                  <th className="px-3 py-2">Stato</th>
                  <th className="px-3 py-2">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {employers.map((org) => (
                  <tr key={org.id} className="border-b border-slate-800/80">
                    <td className="px-3 py-2 font-medium">{org.name}</td>
                    <td className="px-3 py-2">{org.referent_name}</td>
                    <td className="px-3 py-2">{org.cap}</td>
                    <td className="px-3 py-2 font-mono text-xs">{org.status}</td>
                    <td className="px-3 py-2">
                      <AdminEmployerActions orgId={org.id} status={org.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
