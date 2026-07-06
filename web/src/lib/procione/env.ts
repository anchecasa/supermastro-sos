import type { CreateAppointmentInput } from "@/lib/procione/types";

export type ProcioneIntent =
  | "create_appointment"
  | "create_contact"
  | "create_task"
  | "query_appointments"
  | "unknown";

export type GptParsedCommand = {
  intent: ProcioneIntent;
  reply: string;
  appointment?: Partial<CreateAppointmentInput> & { title?: string };
  contact?: {
    full_name?: string;
    company?: string;
    phone?: string;
    email?: string;
  };
  task?: {
    title?: string;
    description?: string;
    due_at?: string;
  };
};

export function getProcioneEnv() {
  return {
    openaiKey: process.env.OPENAI_API_KEY ?? "",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
    elevenLabsKey: process.env.ELEVENLABS_API_KEY ?? "",
    elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID ?? "",
    picovoiceAccessKey: process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY ?? "",
    picovoiceKeywordPath: process.env.NEXT_PUBLIC_PICOVOICE_KEYWORD_PATH ?? "",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
    vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:anchecasa@anchecasa.it",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  };
}

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function isElevenLabsConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_VOICE_ID);
}

export function isGoogleCalendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function isWebPushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function isPicovoiceConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY);
}
