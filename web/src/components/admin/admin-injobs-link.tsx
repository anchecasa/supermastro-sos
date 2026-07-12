import Link from "next/link";
import { INJOBS_ADMIN_HUB_URL } from "@/lib/injobsAdminUrl";

export default function AdminInjobsLink() {
  return (
    <Link
      href={INJOBS_ADMIN_HUB_URL}
      className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold hover:bg-slate-800"
      aria-label="Torna alla dashboard IN Jobs"
    >
      <span className="text-[#0056a3]">IN</span>
      <span className="text-white">Jobs</span>
      <span className="hidden sm:inline text-slate-400 font-normal">· Dashboard</span>
    </Link>
  );
}
