import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Configurazione incompleta" }, { status: 500 });
  }

  const edgeUrl = `${supabaseUrl}/functions/v1/process-notifications`;
  const edgeRes = await fetch(edgeUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}` },
  });

  if (edgeRes.ok) {
    return NextResponse.json(await edgeRes.json());
  }

  const admin = createAdminClient();
  const { data: pending, error } = await admin
    .from("notification_outbox")
    .select("id")
    .is("sent_at", null)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (pending ?? []).map((r) => r.id);
  const now = new Date().toISOString();

  if (ids.length > 0) {
    await admin
      .from("notification_outbox")
      .update({ sent_at: now, push_sent_at: now, push_delivered_at: now })
      .in("id", ids);
    await admin.rpc("mark_notifications_sent", { p_ids: ids });
  }

  return NextResponse.json({ processed: ids.length, fallback: true });
}
