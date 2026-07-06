import { NextResponse } from "next/server";
import { requireProcioneApiUser } from "@/lib/procione/auth-api";
import {
  PROCIONE_DEFAULT_VOICE_ID,
  PROCIONE_DEFAULT_VOICE_NAME,
} from "@/lib/procione/appointment-speech";
import { getProcioneEnv, isElevenLabsConfigured } from "@/lib/procione/env";
import { synthesizeSpeech } from "@/lib/procione/elevenlabs";

export async function GET() {
  return NextResponse.json({
    elevenLabs: isElevenLabsConfigured(),
    voiceName: PROCIONE_DEFAULT_VOICE_NAME,
    voiceId: getProcioneEnv().elevenLabsVoiceId || PROCIONE_DEFAULT_VOICE_ID,
  });
}

export async function POST(request: Request) {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isElevenLabsConfigured()) {
    return NextResponse.json({ error: "ElevenLabs non configurato." }, { status: 503 });
  }

  const { text, speed } = (await request.json()) as { text?: string; speed?: number };
  if (!text?.trim()) {
    return NextResponse.json({ error: "Testo mancante." }, { status: 400 });
  }

  const env = getProcioneEnv();
  const audio = await synthesizeSpeech(
    env.elevenLabsKey,
    env.elevenLabsVoiceId,
    text.trim(),
    typeof speed === "number" ? Math.min(1.5, Math.max(0.7, speed)) : 1.12
  );

  return new NextResponse(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
