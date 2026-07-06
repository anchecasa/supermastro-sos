import type { UrgencyLevel } from "@/lib/sos/constants";

export const DEMO_REQUEST_ID_PREFIX = "demo-";

/** Flusso SOS senza login (default). Imposta NEXT_PUBLIC_SOS_DEMO_MODE=false per richiedere auth. */
export function isSosDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_SOS_DEMO_MODE !== "false";
}

export function isDemoRequestId(id: string): boolean {
  return id.startsWith(DEMO_REQUEST_ID_PREFIX);
}

export function createDemoRequestId(): string {
  return `${DEMO_REQUEST_ID_PREFIX}${crypto.randomUUID()}`;
}

export type DemoRequestState = {
  id: string;
  lat: number;
  lng: number;
  accuracy_m: number;
  zone_name: string;
  city: string;
  skill_slug: string;
  skill_label: string;
  urgency: UrgencyLevel;
  summary: string;
  phone: string;
  createdAt: string;
};

export const DEMO_MATCHED_CONTACT = {
  display_name: "Marco B.",
  phone: "+39 333 482 9102",
  email: "marco.b@supermastro.it",
  skill_label: "Idraulico",
  distance_km: 2.4,
  eta_minutes: 35,
};

const STORAGE_PREFIX = "sos-demo:";

export function saveDemoRequest(state: DemoRequestState): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${STORAGE_PREFIX}${state.id}`, JSON.stringify(state));
}

export function loadDemoRequest(id: string): DemoRequestState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoRequestState;
  } catch {
    return null;
  }
}

export function demoDiagnosisForSkill(slug: string, label: string) {
  const summaries: Record<string, string> = {
    idraulico: "Perdita sotto il lavandino — probabile guarnizione usurata.",
    elettricista: "Presa scintillante — possibile corto circuito locale.",
    fabbro: "Serratura bloccata — chiave rimasta dentro.",
  };

  return {
    skill_slug: slug,
    skill_label: label,
    urgency: "medium" as UrgencyLevel,
    summary: summaries[slug] ?? `Intervento ${label.toLowerCase()} richiesto in zona.`,
  };
}
