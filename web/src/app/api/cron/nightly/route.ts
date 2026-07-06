import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const [reconcile, purge] = await Promise.all([
    admin.rpc("run_billing_reconciliation"),
    admin.rpc("purge_expired_sos_media"),
  ]);

  return NextResponse.json({
    reconciliation_id: reconcile.data,
    purged_media: purge.data,
  });
}
