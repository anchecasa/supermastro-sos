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
Se l'utente chiede DUE azioni insieme (es. fissa appuntamento E memorizza contatto), popola appointment e contact nello stesso JSON.
Per domande sull'agenda ("che appuntamenti ho oggi/domani/dopodomani/questa settimana", "cosa ho in programma") usa intent query_appointments (reply breve opzionale: l'elenco reale viene dal server).
Frasi comuni: "fissa un appuntamento", "memorizza questo contatto", "memorizza da fare comprare cavi domani", "promemoria chiamare il cliente", "cosa devo fare", "elimina promemoria 3", "modifica promemoria 2 sposta a venerdì", "apri agenda", "sposta alle 11", "annulla appuntamento", "sposta tutti gli appuntamenti di oggi a domani", "chiama", "manda messaggio whatsapp", "ho un problema a casa", "apri supermastro", "cerco un artigiano".
Per promemoria/cose da fare usa intent create_task con title (soggetto) e description (contenuto/dettaglio) e due_at se indicata data/ora.
Per elenco promemoria ("cosa devo fare", "elenco promemoria") rispondi query_appointments solo se chiede appuntamenti; altrimenti create_task unknown e il server gestisce i promemoria.
Memoria utente: se Fernando dice "quando dico X intendo Y" o "ricorda che X è Y", segnala intent unknown con reply che conferma la memorizzazione (il server salva l'alias). Usa gli alias nel contesto agenda per risolvere nomi contatti.
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
  transcript: string,
  agendaContext?: string
): Promise<GptParsedCommand> {
  const contextBlock = agendaContext
    ? `\nContesto agenda attuale: ${agendaContext}`
    : "";

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
        { role: "system", content: SYSTEM_PROMPT + contextBlock },
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
