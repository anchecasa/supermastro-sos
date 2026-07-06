import { NextResponse } from "next/server";
import { requireProcioneApiUser } from "@/lib/procione/auth-api";
import { getProcioneEnv, isElevenLabsConfigured, isOpenAiConfigured } from "@/lib/procione/env";
import { transcribeWithWhisper, parseWithGpt } from "@/lib/procione/openai";
import { synthesizeSpeech } from "@/lib/procione/elevenlabs";
import { executeParsedCommand } from "@/lib/procione/execute-intent";

export async function POST(request: Request) {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { supabase, user } = auth;
  const form = await request.formData();
  const audio = form.get("audio");
  const transcriptField = form.get("transcript");

  let transcript = typeof transcriptField === "string" ? transcriptField.trim() : "";

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
    parsed = await parseWithGpt(env.openaiKey, env.openaiModel, transcript);
  }

  const result = await executeParsedCommand(supabase, user.id, parsed, transcript);

  await supabase.from("assistant_voice_log").insert([
    { owner_id: user.id, role: "user", content: transcript, action_type: "query" },
    {
      owner_id: user.id,
      role: "assistant",
      content: result.reply,
      action_type: result.type === "unknown" ? "query" : result.type,
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
    contact: result.contact,
    task: result.task,
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
