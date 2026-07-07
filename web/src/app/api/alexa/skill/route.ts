import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALEXA_HELP,
  ALEXA_NOT_LINKED,
  ALEXA_WELCOME,
  buildAlexaResponse,
  completeAlexaLink,
  extractAlexaTranscript,
  filterResultForAlexa,
  isAlexaConfigured,
  parseAlexaLinkCode,
  resolveAlexaOwnerId,
  sanitizeReplyForAlexa,
  validateAlexaApplication,
  validateAlexaWebhook,
  type AlexaRequestBody,
} from "@/lib/procione/alexa";
import { executeParsedCommand } from "@/lib/procione/execute-intent";
import { getProcioneEnv, isOpenAiConfigured } from "@/lib/procione/env";
import { loadProcioneContext } from "@/lib/procione/context";
import { parseWithGpt } from "@/lib/procione/openai";

export async function POST(request: Request) {
  if (!isAlexaConfigured()) {
    return NextResponse.json({ error: "Alexa non configurata." }, { status: 503 });
  }
  if (!validateAlexaWebhook(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AlexaRequestBody;
  try {
    body = (await request.json()) as AlexaRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!validateAlexaApplication(body)) {
    return NextResponse.json({ error: "Application ID mismatch" }, { status: 403 });
  }

  const requestType = body.request?.type;
  if (requestType === "LaunchRequest") {
    return NextResponse.json(buildAlexaResponse(ALEXA_WELCOME, false));
  }
  if (requestType === "SessionEndedRequest") {
    return NextResponse.json(buildAlexaResponse("A presto.", true));
  }
  if (requestType !== "IntentRequest") {
    return NextResponse.json(buildAlexaResponse("Non ho capito.", true));
  }

  const amazonUserId = body.session?.user?.userId;
  if (!amazonUserId) {
    return NextResponse.json(buildAlexaResponse(ALEXA_NOT_LINKED, true));
  }

  const supabase = createAdminClient();
  const transcript = extractAlexaTranscript(body);

  if (transcript === "__STOP__") {
    return NextResponse.json(buildAlexaResponse("Va bene.", true));
  }
  if (transcript === "__HELP__") {
    return NextResponse.json(buildAlexaResponse(ALEXA_HELP, false));
  }

  const linkCode = transcript ? parseAlexaLinkCode(transcript) : null;
  if (linkCode) {
    const linked = await completeAlexaLink(supabase, linkCode, amazonUserId);
    const speech = linked.ok
      ? "Account SuperMastro collegato. Ora puoi chiedermi l'agenda."
      : linked.error;
    return NextResponse.json(buildAlexaResponse(speech, true));
  }

  const ownerId = await resolveAlexaOwnerId(supabase, amazonUserId);
  if (!ownerId) {
    return NextResponse.json(buildAlexaResponse(ALEXA_NOT_LINKED, true));
  }

  if (!transcript) {
    return NextResponse.json(buildAlexaResponse("Ripeti pure, non ho sentito.", false));
  }

  let parsed = null;
  if (isOpenAiConfigured()) {
    const ctx = await loadProcioneContext(supabase, ownerId);
    const env = getProcioneEnv();
    parsed = await parseWithGpt(env.openaiKey, env.openaiModel, transcript, ctx.contextBlock);
  }

  const raw = await executeParsedCommand(supabase, ownerId, parsed, transcript, {
    session: { dataMode: "real" },
  });
  const result = filterResultForAlexa(raw);
  const speech = sanitizeReplyForAlexa(result.reply) || "Fatto.";

  await supabase.from("assistant_voice_log").insert([
    { owner_id: ownerId, role: "user", content: `[Alexa] ${transcript}`, action_type: "query" },
    {
      owner_id: ownerId,
      role: "assistant",
      content: speech,
      action_type: result.type === "unknown" ? "query" : "appointment",
    },
  ]);

  const keepOpen = result.type === "chat" && !result.awaitingConfirm;
  return NextResponse.json(buildAlexaResponse(speech, !keepOpen));
}

export async function GET() {
  return NextResponse.json({ configured: isAlexaConfigured() });
}
