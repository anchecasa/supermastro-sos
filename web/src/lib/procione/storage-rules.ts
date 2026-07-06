import type { ProcioneDataMode } from "@/lib/procione/session";

/** Metriche demo riunione: mai persistere su Supabase. */
export function isDemoMetricsPersistBlocked(dataMode: ProcioneDataMode): boolean {
  return dataMode === "meeting_demo";
}

/** Ricerche concierge: search-only, nessun insert automatico. */
export const CONCIERGE_SEARCH_ONLY = true as const;
