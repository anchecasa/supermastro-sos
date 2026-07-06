import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkerSkillLabel } from "@/lib/worker-skills";
import {
  approveJobRequest,
  buildJobShortlist,
  selectJobCandidate,
} from "@/app/admin/actions";

export default async function AdminRecruitmentPage() {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return (
      <p className="text-red-400">
        Configura SUPABASE_SERVICE_ROLE_KEY — {e instanceof Error ? e.message : "errore"}
      </p>
    );
  }

  const { data: jobs, error } = await admin
    .from("job_requests")
    .select(
      "id, role_title, skill_slug, cap, comune, status, created_at, employer_org_id, employer_organizations(name, org_type, referent_name)"
    )
    .in("status", ["pending_review", "open", "matched"])
    .order("created_at", { ascending: false });

  if (error) {
    return <p className="text-red-400">Errore: {error.message}. Applica migrazioni recruitment.</p>;
  }

  const jobIds = jobs?.map((j) => j.id) ?? [];
  const { data: candidates } = jobIds.length
    ? await admin
        .from("job_candidates")
        .select("id, job_request_id, worker_id, status, distance_km, workers(user_id, talent_type, cap)")
        .in("job_request_id", jobIds)
    : { data: [] };

  const candidatesByJob = new Map<string, typeof candidates>();
  for (const c of candidates ?? []) {
    const list = candidatesByJob.get(c.job_request_id) ?? [];
    list.push(c);
    candidatesByJob.set(c.job_request_id, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Recruitment ({jobs?.length ?? 0})</h1>
        <a href="/admin/verifica" className="text-sm text-slate-400 hover:text-white">
          Verifica talent →
        </a>
      </div>

      {!jobs?.length ? (
        <p className="text-slate-400">Nessuna richiesta datore in coda.</p>
      ) : (
        <ul className="space-y-6">
          {jobs.map((job) => {
            const orgRaw = job.employer_organizations as
              | { name: string; org_type: string; referent_name: string }
              | { name: string; org_type: string; referent_name: string }[]
              | null;
            const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
            const jobCandidates = candidatesByJob.get(job.id) ?? [];

            return (
              <li key={job.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{job.role_title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {org?.name ?? "—"} · {org?.referent_name} ·{" "}
                      {getWorkerSkillLabel(job.skill_slug)} · CAP {job.cap}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Stato: {job.status}</p>
                  </div>
                  {job.status === "pending_review" && (
                    <form
                      action={async () => {
                        "use server";
                        await approveJobRequest(job.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white"
                      >
                        Approva + shortlist
                      </button>
                    </form>
                  )}
                  {job.status === "open" && (
                    <form
                      action={async () => {
                        "use server";
                        await buildJobShortlist(job.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white"
                      >
                        Rigenera shortlist
                      </button>
                    </form>
                  )}
                </div>

                {jobCandidates.length > 0 && (
                  <ul className="mt-4 space-y-2 border-t border-slate-800 pt-4">
                    {jobCandidates.map((c) => {
                      const workerRaw = c.workers as
                        | { talent_type?: string }
                        | { talent_type?: string }[]
                        | null;
                      const worker = Array.isArray(workerRaw) ? workerRaw[0] : workerRaw;

                      return (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span className="text-slate-300">
                          Candidato · ~{c.distance_km} km · {c.status}
                          {worker?.talent_type ? ` · ${worker.talent_type}` : ""}
                        </span>
                        {c.status === "accepted" && (
                          <form
                            action={async () => {
                              "use server";
                              await selectJobCandidate(c.id);
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded bg-amber-600 px-2 py-1 text-xs text-white"
                            >
                              Sblocca contatto
                            </button>
                          </form>
                        )}
                      </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
