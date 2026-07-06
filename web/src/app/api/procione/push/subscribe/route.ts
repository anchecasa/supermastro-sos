import { NextResponse } from "next/server";
import { requireProcioneApiUser } from "@/lib/procione/auth-api";
import { getProcioneEnv, isWebPushConfigured } from "@/lib/procione/env";

export async function GET() {
  const { vapidPublicKey } = getProcioneEnv();
  return NextResponse.json({
    configured: isWebPushConfigured(),
    publicKey: vapidPublicKey || null,
  });
}

export async function POST(request: Request) {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ error: "Web Push non configurato." }, { status: 503 });
  }

  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Subscription invalida." }, { status: 400 });
  }

  const { error } = await auth.supabase.from("assistant_push_subscriptions").upsert(
    {
      owner_id: auth.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth_key: body.keys.auth,
    },
    { onConflict: "owner_id,endpoint" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) {
    return NextResponse.json({ error: "Endpoint mancante." }, { status: 400 });
  }

  await auth.supabase
    .from("assistant_push_subscriptions")
    .delete()
    .eq("owner_id", auth.user.id)
    .eq("endpoint", body.endpoint);

  return NextResponse.json({ ok: true });
}
