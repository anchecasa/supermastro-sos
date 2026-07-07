import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntentResult } from "@/lib/procione/tools";

export type AlexaRequestBody = {
  version?: string;
  session?: {
    user?: { userId?: string };
    sessionId?: string;
  };
  context?: {
    System?: {
      application?: { applicationId?: string };
    };
  };
  request?: {
    type?: string;
    locale?: string;
    intent?: {
      name?: string;
      slots?: Record<
        string,
        {
          name?: string;
          value?: string;
          resolutions?: {
            resolutionsPerAuthority?: Array<{
              values?: Array<{ value?: { name?: string } }>;
            }>;
          };
        }
      >;
    };
  };
};

export function isAlexaConfigured(): boolean {
  return Boolean(process.env.ALEXA_APPLICATION_ID && process.env.ALEXA_WEBHOOK_SECRET);
}

export function validateAlexaWebhook(request: Request): boolean {
  const secret = process.env.ALEXA_WEBHOOK_SECRET ?? "";
  if (!secret) return false;
  return request.headers.get("x-alexa-webhook-secret") === secret;
}

export function validateAlexaApplication(body: AlexaRequestBody): boolean {
  const expected = process.env.ALEXA_APPLICATION_ID ?? "";
  if (!expected) return false;
  const appId = body.context?.System?.application?.applicationId;
  return appId === expected;
}

export function extractAlexaTranscript(body: AlexaRequestBody): string | null {
  const requestType = body.request?.type;
  if (requestType === "LaunchRequest") return null;

  const intentName = body.request?.intent?.name ?? "";
  if (intentName === "LinkAccountIntent") {
    const code = body.request?.intent?.slots?.code?.value?.trim();
    if (code) return `collega codice ${code}`;
  }

  if (
    intentName === "AMAZON.StopIntent" ||
    intentName === "AMAZON.CancelIntent" ||
    intentName === "AMAZON.NavigateHomeIntent"
  ) {
    return "__STOP__";
  }
  if (intentName === "AMAZON.HelpIntent") {
    return "__HELP__";
  }

  const slots = body.request?.intent?.slots ?? {};
  for (const slot of Object.values(slots)) {
    const resolved =
      slot.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]?.value?.name;
    const value = (resolved ?? slot.value)?.trim();
    if (value) return value;
  }

  return null;
}

export function parseAlexaLinkCode(transcript: string): string | null {
  const match = transcript.match(/(?:collega|link|associa)\s+(?:account\s+)?(?:alexa\s+)?(?:codice\s+)?([A-Z0-9]{6})/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export function buildAlexaResponse(speech: string, shouldEndSession = true) {
  const text = speech.slice(0, 8000);
  return {
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText" as const, text },
      shouldEndSession,
    },
  };
}

export function sanitizeReplyForAlexa(reply: string): string {
  return reply
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterResultForAlexa(result: IntentResult): IntentResult {
  if (result.type === "navigate") {
    return {
      reply:
        "Per aprire SuperMastro o le richieste SOS usa l'app Procione sul telefono. Da Alexa posso leggere e creare appuntamenti.",
      type: "chat",
    };
  }
  if (result.type === "whatsapp" || result.type === "call") {
    return {
      reply: "Per chiamate e WhatsApp apri la rubrica nell'app Procione.",
      type: "chat",
    };
  }
  if (result.type === "draft" && result.awaitingConfirm) {
    return {
      ...result,
      reply: `${result.reply} Conferma dall'app Procione o ripeti il comando con data e ora esplicite.`,
    };
  }
  return result;
}

export async function resolveAlexaOwnerId(
  supabase: SupabaseClient,
  amazonUserId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("assistant_alexa_links")
    .select("owner_id")
    .eq("amazon_user_id", amazonUserId)
    .maybeSingle();
  return data?.owner_id ?? null;
}

export async function completeAlexaLink(
  supabase: SupabaseClient,
  code: string,
  amazonUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = code.trim().toUpperCase();
  const { data: row, error: fetchError } = await supabase
    .from("assistant_alexa_link_codes")
    .select("id, owner_id, expires_at, used_at")
    .eq("code", normalized)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false, error: "Codice non valido." };
  }
  if (row.used_at) {
    return { ok: false, error: "Codice già utilizzato." };
  }
  if (new Date(row.expires_at) < new Date()) {
    return { ok: false, error: "Codice scaduto. Generane uno nuovo dall'app Procione." };
  }

  const { error: linkError } = await supabase.from("assistant_alexa_links").upsert(
    {
      owner_id: row.owner_id,
      amazon_user_id: amazonUserId,
    },
    { onConflict: "owner_id" }
  );
  if (linkError) {
    return { ok: false, error: linkError.message };
  }

  await supabase
    .from("assistant_alexa_link_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id);

  return { ok: true };
}

export const ALEXA_WELCOME =
  "Ciao Fernando, sono SuperMastro Procione. Chiedimi cosa hai in agenda o di fissare un appuntamento.";

export const ALEXA_HELP =
  "Puoi dire: cosa ho oggi, cosa ho domani, oppure fissa un appuntamento con un cliente domani alle dieci.";

export const ALEXA_NOT_LINKED =
  "Account non collegato. Apri Procione, genera un codice Alexa e dì: collega codice seguito dal codice.";
