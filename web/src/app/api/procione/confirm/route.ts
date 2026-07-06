import { NextResponse } from "next/server";
import { requireProcioneApiUser } from "@/lib/procione/auth-api";
import { confirmProcioneDraft, type ProcioneDraft } from "@/lib/procione/draft";
import { isElevenLabsConfigured, getProcioneEnv } from "@/lib/procione/env";
import { synthesizeSpeech } from "@/lib/procione/elevenlabs";

export async function POST(request: Request) {
  const auth = await requireProcioneApiUser();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await request.json()) as { draft?: ProcioneDraft };
  if (!body.draft?.kind) {
    return NextResponse.json({ error: "Bozza mancante." }, { status: 400 });
  }

  const { supabase, user } = auth;
  const result = await confirmProcioneDraft(supabase, user.id, body.draft);

  await supabase.from("assistant_voice_log").insert([
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
      const env = getProcioneEnv();
      const audioBuf = await synthesizeSpeech(env.elevenLabsKey, env.elevenLabsVoiceId, result.reply);
      audioBase64 = audioBuf.toString("base64");
    } catch {
      /* optional */
    }
  }

  return NextResponse.json({
    ...result,
    audioBase64,
    audioMime: audioBase64 ? "audio/mpeg" : undefined,
  });
}
