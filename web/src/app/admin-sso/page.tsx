"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INJOBS_ADMIN_LOGIN_URL } from "@/lib/injobsAdminUrl";

export default function AdminSsoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        setError("Sessione IN Jobs mancante o scaduta.");
        return;
      }

      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      window.history.replaceState(null, "", "/admin-sso");
      router.replace("/admin");
    }

    void run();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-slate-100">
        <p className="mb-4 max-w-md text-sm text-slate-300">{error}</p>
        <a
          href={INJOBS_ADMIN_LOGIN_URL}
          className="rounded-xl bg-[#FF8D00] px-5 py-3 text-sm font-semibold text-white hover:opacity-95"
        >
          Accedi da IN Jobs
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
      Accesso SuperMastro in corso…
    </div>
  );
}
