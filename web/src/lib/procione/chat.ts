import type { ProcioneUserContext } from "@/lib/procione/context";
import { buildProcionePersonaPrompt, type ProcionePersonaOptions } from "@/lib/procione/persona";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function chatWithProcione(
  apiKey: string,
  model: string,
  userMessage: string,
  ctx: ProcioneUserContext,
  history: ChatTurn[] = [],
  personaOptions: ProcionePersonaOptions = {}
): Promise<string> {
  const system = buildProcionePersonaPrompt(ctx, personaOptions);
  const recent = history.slice(-16);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.92,
      max_tokens: 280,
      messages: [
        { role: "system", content: system },
        ...recent.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat Procione: ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return (data.choices?.[0]?.message?.content ?? "").trim() || "Ci sono Fernando, dimmi pure.";
}

/** Avvolge dati agenda fattuali con tono naturale Procione. */
export async function wrapAgendaWithPersona(
  apiKey: string,
  model: string,
  userQuestion: string,
  factualAgenda: string,
  ctx: ProcioneUserContext,
  personaOptions: ProcionePersonaOptions = {}
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.85,
      max_tokens: 320,
      messages: [
        {
          role: "system",
          content: `${buildProcionePersonaPrompt(ctx, personaOptions)}

Devi rispondere alla domanda di Fernando sull'agenda.
INCLUDI TUTTI i dati factuali qui sotto, senza cambiarli né ometterli:
${factualAgenda}`,
        },
        { role: "user", content: userQuestion },
      ],
    }),
  });

  if (!res.ok) {
    return factualAgenda;
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return (data.choices?.[0]?.message?.content ?? "").trim() || factualAgenda;
}

/** Avvolge risposta analytics con tono Procione senza alterare i numeri. */
export async function wrapAnalyticsWithPersona(
  apiKey: string,
  model: string,
  userQuestion: string,
  factualAnalytics: string,
  ctx: ProcioneUserContext,
  personaOptions: ProcionePersonaOptions = {}
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.75,
      max_tokens: 320,
      messages: [
        {
          role: "system",
          content: `${buildProcionePersonaPrompt(ctx, personaOptions)}

Rispondi alla domanda di Fernando sulle metriche piattaforma.
INCLUDI TUTTI i numeri e fatti qui sotto SENZA modificarli, arrotondare o ometterli:
${factualAnalytics}`,
        },
        { role: "user", content: userQuestion },
      ],
    }),
  });

  if (!res.ok) return factualAnalytics;

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return (data.choices?.[0]?.message?.content ?? "").trim() || factualAnalytics;
}
