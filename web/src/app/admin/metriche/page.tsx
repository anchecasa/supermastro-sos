import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminMetrichePage() {
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return <p className="text-red-400">{e instanceof Error ? e.message : "Errore"}</p>;
  }

  const { data: metrics, error } = await admin.rpc("admin_get_pilot_metrics");

  if (error) {
    return <p className="text-red-400">{error.message}</p>;
  }

  const m = metrics as Record<string, number>;

  const items = [
    { label: "Richieste oggi", value: m.requests_today },
    { label: "Richieste 7 gg", value: m.requests_7d },
    { label: "Match 7 gg", value: m.matched_7d },
    { label: "Match rate 7 gg (%)", value: m.match_rate_7d },
    { label: "Mastri active", value: m.active_workers },
    { label: "Dispute aperte", value: m.open_disputes },
    { label: "SMS inviati 24h", value: m.sms_sent_24h },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Metriche pilota (K2)</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase text-slate-500">{item.label}</p>
            <p className="mt-1 text-3xl font-bold">{item.value ?? "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
