import Link from "next/link";
import { INJOBS_ADMIN_HUB_URL } from "@/lib/injobsAdminUrl";

export default function AdminInjobsLink() {
  return (
    <Link
      href={INJOBS_ADMIN_HUB_URL}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:bg-slate-50"
      aria-label="Torna alla dashboard IN Jobs"
    >
      <span className="text-[#0056a3]">IN</span>
      <span className="text-slate-800">Jobs</span>
      <span className="hidden font-normal text-slate-500 sm:inline">· Dashboard</span>
    </Link>
  );
}
