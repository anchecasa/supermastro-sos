import type { Metadata, Viewport } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "SuperMastro Procione — Agenda",
  description: "L'assistente vocale intelligente esclusivo per Fernando",
  manifest: "/procione/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Procione",
  },
};

export const viewport: Viewport = {
  themeColor: "#F27131",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function ProcioneLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/supermastro/auth/login?next=/procione/agenda");
  }

  if (!isAdminEmail(user.email)) {
    redirect("/supermastro?procione=denied");
  }

  return (
    <div className="min-h-[100dvh] bg-[#1a1a1a]">
      {children}
    </div>
  );
}
