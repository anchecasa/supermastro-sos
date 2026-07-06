import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildWorkerInviteSms, hashPhone, sendSms } from "@/lib/sms";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: queued, error } = await admin.rpc("process_sms_fallback_queue");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: pendingSms } = await admin
    .from("sms_delivery_log")
    .select("id, outbox_id, worker_id, body_preview")
    .eq("status", "pending")
    .limit(50);

  let sent = 0;

  for (const row of pendingSms ?? []) {
    const { data: contact } = await admin
      .from("contact_vault")
      .select("phone")
      .eq("owner_type", "worker")
      .eq("owner_id", row.worker_id)
      .maybeSingle();

    const phone = contact?.phone;

    if (!phone) {
      await admin.from("sms_delivery_log").update({ status: "skipped_no_phone" }).eq("id", row.id);
      continue;
    }

    const body = row.body_preview ?? buildWorkerInviteSms("intervento");
    const result = await sendSms(phone, body);

    await admin
      .from("sms_delivery_log")
      .update({
        status: result.error ? "failed" : "sent",
        provider_sid: result.sid ?? null,
        phone_hash: hashPhone(phone),
      })
      .eq("id", row.id);

    if (!result.error && row.outbox_id) {
      await admin
        .from("notification_outbox")
        .update({ sms_sent_at: new Date().toISOString() })
        .eq("id", row.outbox_id);
      sent++;
    }
  }

  return NextResponse.json({ queued, sms_sent: sent });
}
