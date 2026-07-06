import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWebPush } from "@/lib/procione/web-push";
import { isWebPushConfigured } from "@/lib/procione/env";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV === "development";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ skipped: true, reason: "Web Push non configurato" });
  }

  const admin = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 14 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 16 * 60 * 1000);

  const { data: appointments, error } = await admin
    .from("assistant_appointments")
    .select("id, owner_id, title, starts_at, contact_name")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("starts_at", windowStart.toISOString())
    .lte("starts_at", windowEnd.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const appt of appointments ?? []) {
    const { data: subs } = await admin
      .from("assistant_push_subscriptions")
      .select("endpoint, p256dh, auth_key")
      .eq("owner_id", appt.owner_id);

    if (!subs?.length) continue;

    const time = new Intl.DateTimeFormat("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(appt.starts_at));

    const payload = {
      title: "Procione — tra 15 minuti",
      body: `${time}: ${appt.title}${appt.contact_name ? ` con ${appt.contact_name}` : ""}`,
      url: "/procione/agenda",
      icon: "/images/supermastro-mezzobusto.png",
    };

    let delivered = false;
    for (const sub of subs) {
      try {
        await sendWebPush(sub, payload);
        delivered = true;
      } catch {
        failed++;
        await admin
          .from("assistant_push_subscriptions")
          .delete()
          .eq("endpoint", sub.endpoint);
      }
    }

    if (delivered) {
      await admin
        .from("assistant_appointments")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", appt.id);
      sent++;
    }
  }

  return NextResponse.json({
    checked: appointments?.length ?? 0,
    sent,
    failed,
  });
}
