export const AI_ANALYSIS_CONSENT_PURPOSE = "ai_photo_analysis";

export {
  SOS_SKILL_OPTIONS,
  WORKER_SKILL_CATALOG,
  WORKER_SKILL_SLUGS,
  getWorkerSkillLabel,
  isSosSkill,
} from "@/lib/worker-skills";

export type RequestStatus =
  | "draft"
  | "submitted"
  | "diagnosing"
  | "inviting"
  | "matched"
  | "completed"
  | "expired"
  | "cancelled";

export type UrgencyLevel = "low" | "medium" | "high";

export const REQUEST_STATUS_COPY: Record<
  RequestStatus,
  { title: string; subtitle: string }
> = {
  draft: {
    title: "Descrivi il problema",
    subtitle: "Aggiungi almeno una foto",
  },
  submitted: {
    title: "Richiesta inviata",
    subtitle: "Stiamo analizzando le foto",
  },
  diagnosing: {
    title: "Analisi in corso",
    subtitle: "Quasi fatto…",
  },
  inviting: {
    title: "Cerchiamo un mastro",
    subtitle: "Di solito entro 30 minuti · max 45",
  },
  matched: {
    title: "Mastro trovato",
    subtitle: "Ti contatterà a breve",
  },
  expired: {
    title: "Nessun mastro libero ora",
    subtitle: "Riprova tra poco o contattaci",
  },
  cancelled: {
    title: "Richiesta annullata",
    subtitle: "Puoi inviarne una nuova",
  },
  completed: {
    title: "Intervento completato",
    subtitle: "Grazie per aver usato SuperMastro",
  },
};

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
};

export const SIGNED_URL_TTL_SEC = 300;

export function buildMediaStoragePath(
  userId: string,
  requestId: string,
  fileName: string
): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const uuid = crypto.randomUUID();
  return `${userId}/${requestId}/${uuid}.${ext}`;
}
