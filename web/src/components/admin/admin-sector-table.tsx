import Link from "next/link";
import {
  aggregateSectorGroups,
  type SectorGroup,
  type SectorRow,
  urgencyLevel,
} from "@/lib/admin-dashboard";

function urgencyDot(count: number) {
  const level = urgencyLevel(count);
  if (level === "ok") return "text-emerald-700";
  if (level === "warn") return "text-amber-700";
  return "text-red-700";
}

export function AdminSectorGroupsTable({ rows }: { rows: SectorRow[] }) {
  const groups = aggregateSectorGroups(rows);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Totali per macro-settore
        </h2>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm text-slate-800">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Settore</th>
              <th className="px-3 py-2">Talent</th>
              <th className="px-3 py-2">In verifica</th>
              <th className="px-3 py-2">Annunci</th>
              <th className="px-3 py-2">Da approvare</th>
              <th className="px-3 py-2">SOS attivi</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <SectorGroupRow key={group.id} group={group} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SectorGroupRow({ group }: { group: SectorGroup }) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-3 py-2">
        <Link
          href={`/admin/settore/${group.id}`}
          className="font-medium text-orange-700 hover:text-orange-800"
        >
          {group.label}
        </Link>
      </td>
      <td className={`px-3 py-2 tabular-nums ${urgencyDot(0)}`}>
        <Link href={`/admin/settore/${group.id}?tab=talent`} className="hover:underline">
          {group.talent_count}
        </Link>
      </td>
      <td className={`px-3 py-2 tabular-nums ${urgencyDot(group.talent_pending)}`}>
        <Link
          href={`/admin/settore/${group.id}?tab=talent&status=pending_verification`}
          className="hover:underline"
        >
          {group.talent_pending}
        </Link>
      </td>
      <td className="px-3 py-2 tabular-nums">
        <Link href={`/admin/settore/${group.id}?tab=annunci`} className="hover:underline">
          {group.annunci_open}
        </Link>
      </td>
      <td className={`px-3 py-2 tabular-nums ${urgencyDot(group.annunci_pending)}`}>
        <Link
          href={`/admin/settore/${group.id}?tab=annunci&status=pending_review`}
          className="hover:underline"
        >
          {group.annunci_pending}
        </Link>
      </td>
      <td className={`px-3 py-2 tabular-nums ${urgencyDot(group.sos_active)}`}>
        <Link href={`/admin/settore/${group.id}?tab=sos`} className="hover:underline">
          {group.sos_active}
        </Link>
      </td>
    </tr>
  );
}

export function AdminSkillDetailTable({ rows }: { rows: SectorRow[] }) {
  const activeRows = rows.filter(
    (r) =>
      r.talent_count > 0 ||
      r.annunci_total > 0 ||
      r.sos_total > 0
  );

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
        Dettaglio per skill
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm text-slate-800">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Skill</th>
              <th className="px-3 py-2">SOS</th>
              <th className="px-3 py-2">Talent</th>
              <th className="px-3 py-2">Annunci</th>
              <th className="px-3 py-2">Attivi ora</th>
            </tr>
          </thead>
          <tbody>
            {(activeRows.length ? activeRows : rows).map((row) => (
              <tr
                key={row.skill_slug}
                className="border-b border-slate-100 hover:bg-slate-50"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/settore/${row.skill_slug}`}
                    className="font-medium text-orange-700 hover:text-orange-800"
                  >
                    {row.skill_label}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {row.sos_enabled ? (
                    <span className="text-emerald-700">Sì</span>
                  ) : (
                    <span className="text-slate-500">No</span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  <Link
                    href={`/admin/settore/${row.skill_slug}?tab=talent`}
                    className="hover:underline"
                  >
                    {row.talent_count}
                  </Link>
                  {row.talent_pending > 0 && (
                    <span className="ml-1 text-xs text-amber-700">
                      (+{row.talent_pending} verifica)
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  <Link
                    href={`/admin/settore/${row.skill_slug}?tab=annunci`}
                    className="hover:underline"
                  >
                    {row.annunci_total}
                  </Link>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {row.sos_active + row.annunci_open}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
