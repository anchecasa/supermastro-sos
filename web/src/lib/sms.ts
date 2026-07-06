import { createHash } from "node:crypto";

export type SmsMessageType = "worker_invite" | "client_match";

export function hashPhone(phone: string): string {
  return createHash("sha256").update(phone.replace(/\s/g, "")).digest("hex").slice(0, 16);
}

export function buildWorkerInviteSms(skillLabel: string): string {
  const category = skillLabel || "intervento";
  return `SuperMastro: intervento ${category} vicino a te. Apri l'app entro 45 min: anchecasa.it/artigiano`.slice(
    0,
    160
  );
}

export function buildClientMatchSms(workerName: string, phone: string): string {
  return `SuperMastro: mastro trovato. ${workerName} — Tel ${phone}. Dettagli: anchecasa.it/supermastro`.slice(
    0,
    160
  );
}

export async function sendSms(to: string, body: string): Promise<{ sid?: string; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    console.log("[sms-stub]", { to: hashPhone(to), body });
    return { sid: `stub_${Date.now()}` };
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const params = new URLSearchParams({ To: to, From: from, Body: body });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: data.message ?? "Twilio error" };
  }

  return { sid: data.sid as string };
}
