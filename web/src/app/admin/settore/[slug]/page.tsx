import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminWorkerActions } from "@/components/admin/admin-worker-actions";
import { AdminJobActions } from "@/components/admin/admin-job-actions";
import { RedispatchButton } from "@/components/admin/redispatch-button";
import {
  resolveSkillFilter,
  isSkillSectorSlug,
} from "@/lib/admin-dashboard";
import {
  getWorkerSkillLabel,
  WORKER_SKILL_CATALOG,
  type SkillSector,
} from "@/lib/worker-skills";

type TabId = "talent" | "annunci" | "sos";

const TABS: { id: TabId; label: string }[] = [
  { id: "talent", label: "Talent" },
  { id: "annunci", label: "Annunci" },
  { id: "sos", label: "SOS" },
];

function skillSlugsForFilter(
  sector: SkillSector | null,
  skillSlug: string | null
): string[] | null {
  if (skillSlug) return [skillSlug];
  if (sector) {
    return WORKER_SKILL_CATALOG.filter((s) => s.sector === sector).map((s) => s.slug);
  }
  return null;
}

export default async function AdminSettorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const { slug } = await params;
  const { tab: tabRaw, status } = await searchParams;
  const tab = (TABS.find((t) => t.id === tabRaw)?.id ?? "talent") as TabId;

  const filter = resolveSkillFilter(slug);
  if (!isSkillSectorSlug(slug) && !WORKER_SKILL_CATALOG.some((s) => s.slug === slug)) {
    notFound();
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return <p className="text-red-400">{e instanceof Error ? e.message : "Errore"}</p>;
  }

  const skillFilterSlug = filter.skillSlug;
  const sectorSlugs = skillSlugsForFilter(filter.sector, filter.skillSlug);

  const workerStatus =
    status && status !== "all" ? status : tab === "talent" && status ? status : null;

  const [{ data: workers }, { data: jobs }, { data: sos }] = await Promise.all([
    admin.rpc("admin_list_workers_for_skill", {
      p_skill_slug: skillFilterSlug,
      p_status: workerStatus as never,
    }),
    admin.rpc("admin_list_jobs_for_skill", { p_skill_slug: skillFilterSlug }),
    admin.rpc("admin_list_sos_for_skill", { p_skill_slug: skillFilterSlug }),
  ]);

  let workerRows = workers ?? [];
  let jobRows = jobs ?? [];
  let sosRows = sos ?? [];

  if (filter.sector && !filter.skillSlug) {
    const slugSet = new Set(sectorSlugs);
    workerRows = workerRows.filter((w: { skill_slugs: string[] }) =>
      w.skill_slugs?.some((s: string) => slugSet.has(s))
    );
    jobRows = jobRows.filter((j: { skill_slug: string }) => slugSet.has(j.skill_slug));
    sosRows = sosRows.filter(
      (s: { skill_slug: string | null }) => s.skill_slug && slugSet.has(s.skill_slug)
    );
  }

  if (status && tab === "annunci") {
    jobRows = jobRows.filter((j: { status: string }) => j.status === status);
  }

  if (status && tab === "talent" && status !== "all") {
    workerRows = workerRows.filter((w: { status: string }) => w.status === status);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
          ← Panoramica
        </Link>
        <h1 className="text-xl font-bold">{filter.title}</h1>
        {filter.sector && !filter.skillSlug && (
          <p className="text-sm text-slate-400">
            Macro-settore · {sectorSlugs?.length ?? 0} skill
          </p>
        )}
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/settore/${slug}?tab=${t.id}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t.id
                ? "bg-sky-600 text-white"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-80">
              (
              {t.id === "talent"
                ? workerRows.length
                : t.id === "annunci"
                  ? jobRows.length
                  : sosRows.length}
              )
            </span>
          </Link>
        ))}
      </nav>

      {tab === "talent" && (
        <SectorTalentTable rows={workerRows} slug={slug} status={status} />
      )}
      {tab === "annunci" && (
        <SectorAnnunciTable rows={jobRows} slug={slug} status={status} />
      )}
      {tab === "sos" && <SectorSosTable rows={sosRows} />}
    </div>
  );
}

function SectorTalentTable({
  rows,
  slug,
  status,
}: {
  rows: Array<{
    worker_id: string;
    display_name: string;
    status: string;
    talent_type: string;
    cap: string | null;
    comune: string | null;
    recruitment_active: boolean;
    skill_slugs: string[];
  }>;
  slug: string;
  status?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["all", "pending_verification", "active", "suspended"].map((s) => (
          <Link
            key={s}
            href={`/admin/settore/${slug}?tab=talent${s !== "all" ? `&status=${s}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              (status ?? "all") === s
                ? "border-sky-600 text-sky-300"
                : "border-slate-700 text-slate-500"
            }`}
          >
            {s === "all" ? "Tutti" : s}
          </Link>
        ))}
      </div>
      {!rows.length ? (
        <p className="text-slate-400">Nessun talent in questo settore.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">Skill</th>
                <th className="px-3 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => (
                <tr key={w.worker_id} className="border-b border-slate-800/80">
                  <td className="px-3 py-2">{w.display_name ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{w.status}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    CAP {w.cap ?? "—"}
                    {w.comune ? ` · ${w.comune}` : ""}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {(w.skill_slugs ?? []).map((s) => getWorkerSkillLabel(s)).join(", ")}
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

function SectorAnnunciTable({
  rows,
  slug,
  status,
}: {
  rows: Array<{
    job_id: string;
    role_title: string;
    skill_slug: string;
    cap: string;
    status: string;
    employer_name: string;
    candidate_count: number;
  }>;
  slug: string;
  status?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["all", "pending_review", "open", "suspended"].map((s) => (
          <Link
            key={s}
            href={`/admin/settore/${slug}?tab=annunci${s !== "all" ? `&status=${s}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs ${
              (status ?? "all") === s
                ? "border-sky-600 text-sky-300"
                : "border-slate-700 text-slate-500"
            }`}
          >
            {s === "all" ? "Tutti" : s}
          </Link>
        ))}
      </div>
      {!rows.length ? (
        <p className="text-slate-400">Nessun annuncio in questo settore.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Titolo</th>
                <th className="px-3 py-2">Datore</th>
                <th className="px-3 py-2">Skill</th>
                <th className="px-3 py-2">Stato</th>
                <th className="px-3 py-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((job) => (
                <tr key={job.job_id} className="border-b border-slate-800/80">
                  <td className="px-3 py-2">{job.role_title}</td>
                  <td className="px-3 py-2">{job.employer_name}</td>
                  <td className="px-3 py-2">{getWorkerSkillLabel(job.skill_slug)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{job.status}</td>
                  <td className="px-3 py-2">
                    <AdminJobActions jobId={job.job_id} status={job.status} />
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

function SectorSosTable({
  rows,
}: {
  rows: Array<{
    request_id: string;
    status: string;
    urgency: string | null;
    skill_label: string | null;
    pending_invites: number;
    invitation_count: number;
    expires_at: string | null;
    created_at: string;
  }>;
}) {
  if (!rows.length) {
    return <p className="text-slate-400">Nessuna richiesta SOS attiva in questo settore.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[640px] text-left text-sm">
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
          {rows.map((r) => (
            <tr key={r.request_id} className="border-b border-slate-800/80">
              <td className="px-3 py-2 font-mono text-xs">{r.status}</td>
              <td className="px-3 py-2">{r.skill_label ?? "—"}</td>
              <td className="px-3 py-2">{r.urgency ?? "—"}</td>
              <td className="px-3 py-2">
                {r.pending_invites}/{r.invitation_count}
              </td>
              <td className="px-3 py-2 text-xs text-slate-400">
                {r.expires_at
                  ? new Date(r.expires_at).toLocaleString("it-IT")
                  : "—"}
              </td>
              <td className="px-3 py-2">
                {r.status === "inviting" && (
                  <RedispatchButton requestId={r.request_id} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
