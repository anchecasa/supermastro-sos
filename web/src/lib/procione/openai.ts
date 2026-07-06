import type { GptParsedCommand } from "@/lib/procione/env";

const SYSTEM_PROMPT = `Sei SuperMastro Procione, assistente vocale di Fernando (admin AncheCasa).
Analizza comandi in italiano e rispondi SOLO con JSON valido (senza markdown):
{
  "intent": "create_appointment" | "create_contact" | "create_task" | "query_appointments" | "unknown",
  "reply": "risposta breve in italiano, tono professionale amichevole, chiama Fernando",
  "appointment": { "title": "", "contact_name": "", "location": "", "starts_at": "ISO8601", "ends_at": "ISO8601" },
  "contact": { "full_name": "", "company": "", "phone": "", "email": "" },
  "task": { "title": "", "description": "", "due_at": "ISO8601" }
}
Ometti oggetti non pertinenti. Per appuntamenti senza durata, ends_at = starts_at + 1h.
Timezone: Europe/Rome. Oggi: ${new Date().toISOString()}.`;

export async function transcribeWithWhisper(
  apiKey: string,
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType || "audio/webm" });
  form.append("file", blob, "voice.webm");
  form.append("model", "whisper-1");
  form.append("language", "it");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper: ${err}`);
  }

  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

export async function parseWithGpt(
  apiKey: string,
  model: string,
  transcript: string
): Promise<GptParsedCommand> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: transcript },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GPT: ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(raw) as GptParsedCommand;
  } catch {
    return {
      intent: "unknown",
      reply: "Non ho capito, Fernando. Puoi ripetere?",
    };
  }
}
