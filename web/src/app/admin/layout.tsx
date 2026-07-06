import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { redirect } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Panoramica" },
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
    redirect("/supermastro");
  }

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="shrink-0 font-semibold">Admin SuperMastro</span>
            <nav className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-slate-400 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <span className="truncate text-xs text-slate-400">{user.email}</span>
        </div>
      </header>
      <main className="mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 py-8">
        {children}
      </main>
    </div>
  );
}
