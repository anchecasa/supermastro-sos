import { NextResponse } from "next/server";
import { requireProcioneApiUser } from "@/lib/procione/auth-api";
import { getProcioneEnv, isElevenLabsConfigured, isOpenAiConfigured } from "@/lib/procione/env";
import { transcribeWithWhisper, parseWithGpt } from "@/lib/procione/openai";
import { synthesizeSpeech } from "@/lib/procione/elevenlabs";
import { executeParsedCommand } from "@/lib/procione/execute-intent";
import type { ProcioneDraft } from "@/lib/procione/draft";
import type { ChatTurn } from "@/lib/procione/chat";
import type { ProcioneDataMode, ProcioneDemoSnapshot, ProcioneMeetingContext } from "@/lib/procione/session";
import type { ConciergeSearchResult } from "@/lib/procione/concierge";

function parseSessionField(form: FormData) {
  const dataModeField = form.get("dataMode");
  const meetingContextField = form.get("meetingContext");
  const demoSnapshotField = form.get("demoSnapshot");
  const sessionIdField = form.get("sessionId");
  const lastConciergeField = form.get("lastConciergeSearch");

  let meetingContext: ProcioneMeetingContext | undefined;
  if (typeof meetingContextField === "string" && meetingContextField.trim()) {
    try {
      meetingContext = JSON.parse(meetingContextField) as ProcioneMeetingContext;
    } catch {
      meetingContext = undefined;
    }
  }

  let demoSnapshot: ProcioneDemoSnapshot | undefined;
  if (typeof demoSnapshotField === "string" && demoSnapshotField.trim()) {
    try {
      demoSnapshot = JSON.parse(demoSnapshotField) as ProcioneDemoSnapshot;
    } catch {
      demoSnapshot = undefined;
    }
  }

  const dataMode: ProcioneDataMode =
    dataModeField === "meeting_demo" ? "meeting_demo" : "real";

  let lastConciergeSearch: ConciergeSearchResult | undefined;
  if (typeof lastConciergeField === "string" && lastConciergeField.trim()) {
    try {
      lastConciergeSearch = JSON.parse(lastConciergeField) as ConciergeSearchResult;
    } catch {
      lastConciergeSearch = undefined;
    }
  }

  return {
    dataMode,
    meetingContext,
    demoSnapshot,
    sessionId: typeof sessionIdField === "string" ? sessionIdField : undefined,
    lastConciergeSearch,
  };
}

export async function POST(request: Request) {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, user } = auth;
  const form = await request.formData();
  const audio = form.get("audio");
  const transcriptField = form.get("transcript");
  const pendingDraftField = form.get("pendingDraft");
  const historyField = form.get("history");
  const session = parseSessionField(form);
  const latField = form.get("lat");
  const lngField = form.get("lng");
  const lat = typeof latField === "string" && latField.trim() ? Number(latField) : undefined;
  const lng = typeof lngField === "string" && lngField.trim() ? Number(lngField) : undefined;

  let transcript = typeof transcriptField === "string" ? transcriptField.trim() : "";

  let pendingDraft: ProcioneDraft | null = null;
  if (typeof pendingDraftField === "string" && pendingDraftField.trim()) {
    try {
      pendingDraft = JSON.parse(pendingDraftField) as ProcioneDraft;
    } catch {
      pendingDraft = null;
    }
  }

  let history: ChatTurn[] = [];
  if (typeof historyField === "string" && historyField.trim()) {
    try {
      history = JSON.parse(historyField) as ChatTurn[];
    } catch {
      history = [];
    }
  }

  const env = getProcioneEnv();

  if (!transcript && audio instanceof Blob) {
    if (!isOpenAiConfigured()) {
      return NextResponse.json(
        {
          error:
            "Whisper non configurato. Usa Chrome/Edge: il browser trascrive in italiano senza OpenAI.",
        },
        { status: 503 }
      );
    }
    const buffer = Buffer.from(await audio.arrayBuffer());
    transcript = await transcribeWithWhisper(env.openaiKey, buffer, audio.type || "audio/webm");
  }

  if (!transcript) {
    return NextResponse.json({ error: "Nessun audio o trascrizione." }, { status: 400 });
  }

  let parsed = null;
  if (isOpenAiConfigured()) {
    const { loadProcioneContext } = await import("@/lib/procione/context");
    const ctx = await loadProcioneContext(supabase, user.id, {
      dataMode: session.dataMode,
      demoSnapshot: session.demoSnapshot,
    });
    parsed = await parseWithGpt(env.openaiKey, env.openaiModel, transcript, ctx.contextBlock);
  }

  const result = await executeParsedCommand(supabase, user.id, parsed, transcript, {
    pendingDraft,
    history,
    session,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  });

  await supabase.from("assistant_voice_log").insert([
    { owner_id: user.id, role: "user", content: transcript, action_type: "query" },
    {
      owner_id: user.id,
      role: "assistant",
      content: result.reply,
      action_type:
        result.type === "unknown"
          ? "query"
          : (["appointment", "contact", "task", "query", "multi", "call", "whatsapp", "navigate", "chat", "draft"].includes(
              result.type
            )
              ? result.type
              : "query"),
    },
  ]);

  let audioBase64: string | undefined;
  if (isElevenLabsConfigured()) {
    try {
      const audioBuf = await synthesizeSpeech(env.elevenLabsKey, env.elevenLabsVoiceId, result.reply);
      audioBase64 = audioBuf.toString("base64");
    } catch {
      // risposta testuale sufficiente
    }
  }

  return NextResponse.json({
    transcript,
    reply: result.reply,
    type: result.type,
    appointment: result.appointment,
    appointments: result.appointments,
    contact: result.contact,
    contacts: result.contacts,
    call: result.call,
    whatsapp: result.whatsapp,
    rubricaAction: result.rubricaAction,
    rubricaSearch: result.rubricaSearch,
    agendaAction: result.agendaAction,
    navigate: result.navigate,
    draft: result.draft,
    awaitingConfirm: result.awaitingConfirm,
    sessionActive: result.sessionActive,
    dataMode: result.dataMode,
    meetingContext: result.meetingContext,
    demoSnapshot: result.demoSnapshot,
    lastConciergeSearch: result.lastConciergeSearch,
    concierge: result.concierge,
    placeFavorite: result.placeFavorite,
    task: result.task,
    tasks: result.tasks,
    audioBase64,
    audioMime: audioBase64 ? "audio/mpeg" : undefined,
  });
}

export async function GET() {
  return NextResponse.json({
    whisper: isOpenAiConfigured(),
    gpt: isOpenAiConfigured(),
    elevenLabs: isElevenLabsConfigured(),
  });
}
