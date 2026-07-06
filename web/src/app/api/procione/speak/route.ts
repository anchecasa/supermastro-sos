import { NextResponse } from "next/server";
import { requireProcioneApiUser } from "@/lib/procione/auth-api";
import { getProcioneEnv, isElevenLabsConfigured } from "@/lib/procione/env";
import { synthesizeSpeech } from "@/lib/procione/elevenlabs";

export async function POST(request: Request) {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!isElevenLabsConfigured()) {
    return NextResponse.json({ error: "ElevenLabs non configurato." }, { status: 503 });
  }

  const { text } = (await request.json()) as { text?: string };
  if (!text?.trim()) {
    return NextResponse.json({ error: "Testo mancante." }, { status: 400 });
  }

  const env = getProcioneEnv();
  const audio = await synthesizeSpeech(env.elevenLabsKey, env.elevenLabsVoiceId, text.trim());

  return new NextResponse(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
