import { buildDraftResult, type ProcioneDraft } from "@/lib/procione/draft";

export type ProcioneMarketingDraft = {
  title: string;
  description?: string;
  due_at?: string;
};

export function parseMarketingDraft(transcript: string): ProcioneMarketingDraft | null {
  const t = transcript.toLowerCase();
  if (
    !/(?:campagna|marketing|promuov|promozione|social|newsletter|ricorda.*campagna|lancia.*campagna)/.test(
      t
    )
  ) {
    return null;
  }

  const titleMatch = transcript.match(
    /(?:campagna|promozione|marketing)\s+(?:su|per|di)?\s*[:\s]+(.+?)(?:\s+(?:per|entro|domani|luned)|$)/i
  );
  const title =
    titleMatch?.[1]?.trim() ||
    transcript.replace(/^(?:ricorda|prepara|lancia|crea)\s+/i, "").trim() ||
    "Campagna marketing AncheCasa";

  let due_at: string | undefined;
  if (/domani/.test(t)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    due_at = d.toISOString();
  }

  return {
    title: title.slice(0, 120),
    description: "Promemoria campagna marketing Procione",
    due_at,
  };
}

export function buildMarketingDraftResult(marketing: ProcioneMarketingDraft) {
  const when = marketing.due_at
    ? new Intl.DateTimeFormat("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(marketing.due_at))
    : "senza scadenza";

  const draft: ProcioneDraft = {
    kind: "marketing",
    marketing,
    summary: `Promemoria campagna «${marketing.title}» ${when}.`,
  };

  return buildDraftResult(draft);
}
