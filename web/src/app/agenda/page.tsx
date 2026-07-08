import type { Metadata, Viewport } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { readAgendaGateSession } from "@/lib/agenda/gate";
import { loadProcioneAgendaData } from "@/lib/procione/load-agenda-data";
import { AgendaGatePanel } from "@/components/agenda/agenda-gate-panel";
import { AgendaPageClient } from "@/components/agenda/agenda-page-client";

export const metadata: Metadata = {
  title: "Agenda Procione — AncheCasa",
  description: "Agenda vocale intelligente con ascolto stile Siri. Password admin, installazione PWA.",
  manifest: "/agenda/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Agenda Procione",
  },
};

export const viewport: Viewport = {
  themeColor: "#F27131",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function AgendaPage() {
  const gate = await readAgendaGateSession();
  if (!gate) {
    return <AgendaGatePanel />;
  }

  try {
    const supabase = createAdminClient();
    const data = await loadProcioneAgendaData(supabase, gate.userId, gate.email);
    return (
      <div className="min-h-[100dvh] bg-[#1a1a1a]">
        <AgendaPageClient {...data} />
      </div>
    );
  } catch {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#1a1a1a] px-6 text-center text-white">
        <p className="max-w-md text-sm leading-relaxed text-white/80">
          Sessione admin attiva ma il server non riesce a caricare i dati Procione. Verifica{" "}
          <code className="text-[#F27131]">SUPABASE_SERVICE_ROLE_KEY</code> sul Worker Cloudflare.
        </p>
      </div>
    );
  }
}
