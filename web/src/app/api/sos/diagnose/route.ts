import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let body: { request_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const requestId = body.request_id;
  if (!requestId) {
    return NextResponse.json({ error: "request_id mancante" }, { status: 400 });
  }

  const { data: owned } = await supabase
    .from("service_requests")
    .select("id, status")
    .eq("id", requestId)
    .eq("client_id", user.id)
    .single();

  if (!owned) {
    return NextResponse.json({ error: "Richiesta non trovata" }, { status: 404 });
  }

  if (owned.status !== "diagnosing") {
    return NextResponse.json(
      { error: "Stato non valido per diagnosi" },
      { status: 409 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Configurazione server incompleta" },
      { status: 500 }
    );
  }

  const edgeUrl = `${supabaseUrl}/functions/v1/diagnose-request`;
  const edgeRes = await fetch(edgeUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ request_id: requestId }),
  });

  if (edgeRes.ok) {
    const data = await edgeRes.json();
    return NextResponse.json(data);
  }

  const admin = createAdminClient();
  const { data: media } = await admin
    .from("request_media")
    .select("mime_type")
    .eq("request_id", requestId);

  const skills = ["idraulico", "elettricista", "fabbro"] as const;
  const skill = skills[Math.floor(Math.random() * skills.length)];

  const { error: rpcError } = await admin.rpc("apply_request_diagnosis", {
    p_request_id: requestId,
    p_skill_slug: skill,
    p_urgency: "medium",
    p_confidence: 0.7,
    p_summary: `Analisi automatica: intervento ${skill} (fallback locale).`,
    p_raw_response: { fallback: true, media_count: media?.length ?? 0 },
    p_model_version: "local-fallback-v1",
  });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    skill_slug: skill,
    urgency: "medium",
    model_version: "local-fallback-v1",
    fallback: true,
  });
}
