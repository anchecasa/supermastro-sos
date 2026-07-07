import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeAlexaLink, isAlexaConfigured, validateAlexaWebhook } from "@/lib/procione/alexa";

export async function POST(request: Request) {
  if (!isAlexaConfigured()) {
    return NextResponse.json({ error: "Alexa non configurata." }, { status: 503 });
  }
  if (!validateAlexaWebhook(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string; amazonUserId?: string };
  try {
    body = (await request.json()) as { code?: string; amazonUserId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = body.code?.trim();
  const amazonUserId = body.amazonUserId?.trim();
  if (!code || !amazonUserId) {
    return NextResponse.json({ error: "code e amazonUserId richiesti." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const result = await completeAlexaLink(supabase, code, amazonUserId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
