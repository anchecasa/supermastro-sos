import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminInjobsLink from "@/components/admin/admin-injobs-link";
import AdminHeaderBrand from "@/components/admin/admin-header-brand";
import { INJOBS_ADMIN_LOGIN_URL } from "@/lib/injobsAdminUrl";

const NAV = [
  { href: "/admin", label: "Panoramica" },
  { href: "/procione/agenda", label: "Agenda Procione" },
  { href: "/admin/talent", label: "Talent" },
  { href: "/admin/annunci", label: "Annunci" },
  { href: "/admin/monitor", label: "SOS live" },
  { href: "/admin/dispute", label: "Dispute" },
  { href: "/admin/metriche", label: "Metriche" },
  { href: "/admin/impostazioni", label: "Impostazioni" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect(INJOBS_ADMIN_LOGIN_URL);
  }

  return (
    <div className="admin-theme min-h-full bg-[#eef1f6] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <AdminHeaderBrand />
              <AdminInjobsLink />
            </div>
            <span className="truncate text-xs text-slate-500">{user.email}</span>
          </div>
          <nav className="flex flex-wrap gap-x-1 gap-y-2 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 py-8">
        {children}
      </main>
    </div>
  );
}
