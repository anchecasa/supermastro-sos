import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { SuperMastroLanding } from "@/components/supermastro/supermastro-landing";
import { Button } from "@/components/ui/button";
import { isSosDemoMode } from "@/lib/sos/demo";

export default async function SuperMastroPage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: pilotPublic } = await supabase.rpc("get_platform_flag", {
    p_key: "pilot_public",
  });

  const demoMode = isSosDemoMode();

  return (
    <>
      <SuperMastroLanding
        isLive={pilotPublic === true}
        demoMode={demoMode}
        userEmail={user?.email}
        authError={params.auth === "error"}
        nuovaHref="/supermastro/nuova"
      />
      {user && (
        <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6">
          <form
            action={async () => {
              "use server";
              await signOut("/supermastro");
            }}
          >
            <Button type="submit" variant="ghost" size="sm" className="text-muted">
              Esci
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
