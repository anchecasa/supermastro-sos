import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AdminKpiGrid,
  AdminSituationBar,
} from "@/components/admin/admin-overview";
import {
  AdminSectorGroupsTable,
  AdminSkillDetailTable,
} from "@/components/admin/admin-sector-table";
import type { SectorRow, SituationCounts } from "@/lib/admin-dashboard";

export default async function AdminHomePage() {
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

  const [
    { data: situationRaw, error: situationError },
    { data: metrics, error: metricsError },
    { data: sectorRows, error: sectorError },
  ] = await Promise.all([
    admin.rpc("admin_dashboard_situation"),
    admin.rpc("admin_get_pilot_metrics"),
    admin.rpc("admin_dashboard_by_sector"),
  ]);

  if (situationError || metricsError || sectorError) {
    return (
      <p className="text-red-400">
        Errore dashboard:{" "}
        {situationError?.message ?? metricsError?.message ?? sectorError?.message}.
        Applica migrazione{" "}
        <code className="text-amber-300">20260706150000_admin_dashboard.sql</code>
      </p>
    );
  }

  const situation = situationRaw as SituationCounts;
  const rows = (sectorRows ?? []) as SectorRow[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Panoramica SuperMastro</h1>
          <p className="mt-1 text-sm text-slate-400">
            Controllo operativo per settore — talent, annunci e SOS
          </p>
        </div>
        <Link href="/admin/monitor" className="text-sm text-sky-400 hover:text-sky-300">
          SOS live →
        </Link>
      </div>

      <AdminSituationBar situation={situation} />
      <AdminKpiGrid situation={situation} metrics={metrics as Record<string, number>} />
      <AdminSectorGroupsTable rows={rows} />
      <AdminSkillDetailTable rows={rows} />
    </div>
  );
}
