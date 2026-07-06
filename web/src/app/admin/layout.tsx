import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { redirect } from "next/navigation";

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
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="shrink-0 font-semibold">Admin SuperMastro</span>
            <nav className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
              <a href="/admin/verifica" className="text-slate-400 hover:text-white">
                Verifica
              </a>
              <a href="/admin/recruitment" className="text-slate-400 hover:text-white">
                Recruitment
              </a>
              <a href="/admin/monitor" className="text-slate-400 hover:text-white">
                Monitor
              </a>
              <a href="/admin/dispute" className="text-slate-400 hover:text-white">
                Dispute
              </a>
              <a href="/admin/metriche" className="text-slate-400 hover:text-white">
                Metriche
              </a>
              <a href="/admin/impostazioni" className="text-slate-400 hover:text-white">
                Impostazioni
              </a>
            </nav>
          </div>
          <span className="truncate text-xs text-slate-400">{user.email}</span>
        </div>
      </header>
      <main className="mx-auto min-w-0 max-w-4xl overflow-x-clip px-4 py-8">{children}</main>
    </div>
  );
}
