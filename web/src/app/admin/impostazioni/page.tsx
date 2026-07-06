import { createAdminClient } from "@/lib/supabase/admin";
import { PlatformFlagsForm } from "@/components/admin/platform-flags-form";

export default async function AdminImpostazioniPage() {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return <p className="text-red-400">{e instanceof Error ? e.message : "Errore"}</p>;
  }

  const { data: settings } = await admin.from("platform_settings").select("key, value");

  const flags = Object.fromEntries(
    (settings ?? []).map((s) => [s.key, Boolean(s.value)])
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Impostazioni piattaforma</h1>
      <PlatformFlagsForm
        pilotPublic={flags.pilot_public ?? false}
        smsOnlyMode={flags.sms_only_mode ?? false}
      />
      <p className="text-xs text-slate-500">
        L6 go-live: attiva <code>pilot_public</code> solo dopo soft launch e OK legal G6–G8.
      </p>
    </div>
  );
}
