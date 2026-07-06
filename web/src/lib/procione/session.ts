import type { ConciergeSearchResult } from "@/lib/procione/concierge";

export const PROCIONE_SESSION_KEY = "procione_voice_session";
export const PROCIONE_SESSION_TIMEOUT_REAL_MS = 5 * 60 * 1000;
export const PROCIONE_SESSION_TIMEOUT_DEMO_MS = 45 * 60 * 1000;

export type ProcioneDataMode = "real" | "meeting_demo";

export type ProcioneMeetingContext = {
  destination?: string;
  when?: string;
};

export type ProcioneDemoSnapshot = Record<string, number | string>;

export type ProcioneSessionTurn = { role: "user" | "assistant"; content: string; at: number };

export type ProcioneVoiceSession = {
  id: string;
  turns: ProcioneSessionTurn[];
  lastActiveAt: number;
  dataMode: ProcioneDataMode;
  meetingContext?: ProcioneMeetingContext;
  demoSnapshot?: ProcioneDemoSnapshot;
  lastConciergeSearch?: ConciergeSearchResult;
};

function sessionTimeoutMs(session: ProcioneVoiceSession): number {
  return session.dataMode === "meeting_demo"
    ? PROCIONE_SESSION_TIMEOUT_DEMO_MS
    : PROCIONE_SESSION_TIMEOUT_REAL_MS;
}

export function createDefaultSession(): ProcioneVoiceSession {
  return {
    id: crypto.randomUUID(),
    turns: [],
    lastActiveAt: Date.now(),
    dataMode: "real",
  };
}

function normalizeSession(parsed: Partial<ProcioneVoiceSession>): ProcioneVoiceSession {
  return {
    id: parsed.id ?? crypto.randomUUID(),
    turns: parsed.turns ?? [],
    lastActiveAt: parsed.lastActiveAt ?? Date.now(),
    dataMode: parsed.dataMode === "meeting_demo" ? "meeting_demo" : "real",
    meetingContext: parsed.meetingContext,
    demoSnapshot: parsed.demoSnapshot,
    lastConciergeSearch: parsed.lastConciergeSearch,
  };
}

export function loadProcioneSession(): ProcioneVoiceSession {
  if (typeof window === "undefined") return createDefaultSession();
  try {
    const raw = sessionStorage.getItem(PROCIONE_SESSION_KEY);
    if (!raw) return createDefaultSession();
    const parsed = normalizeSession(JSON.parse(raw) as Partial<ProcioneVoiceSession>);
    if (Date.now() - parsed.lastActiveAt > sessionTimeoutMs(parsed)) {
      return createDefaultSession();
    }
    return parsed;
  } catch {
    return createDefaultSession();
  }
}

export function saveProcioneSession(session: ProcioneVoiceSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PROCIONE_SESSION_KEY, JSON.stringify(session));
}

export function appendSessionTurn(
  session: ProcioneVoiceSession,
  userText: string,
  assistantText: string
): ProcioneVoiceSession {
  const now = Date.now();
  const turns = [
    ...session.turns,
    { role: "user" as const, content: userText, at: now },
    { role: "assistant" as const, content: assistantText, at: now },
  ].slice(-20);
  return { ...session, turns, lastActiveAt: now };
}

export function sessionHistoryForApi(session: ProcioneVoiceSession) {
  return session.turns.map((t) => ({ role: t.role, content: t.content }));
}

export function applySessionPatch(
  session: ProcioneVoiceSession,
  patch: Partial<
    Pick<ProcioneVoiceSession, "dataMode" | "meetingContext" | "demoSnapshot" | "lastConciergeSearch">
  >
): ProcioneVoiceSession {
  const dataMode = patch.dataMode ?? session.dataMode;
  return {
    ...session,
    dataMode,
    meetingContext:
      patch.dataMode === "real"
        ? undefined
        : patch.meetingContext !== undefined
          ? patch.meetingContext
          : session.meetingContext,
    demoSnapshot:
      patch.dataMode === "real"
        ? undefined
        : patch.demoSnapshot !== undefined
          ? patch.demoSnapshot
          : session.demoSnapshot,
    lastConciergeSearch:
      patch.lastConciergeSearch !== undefined
        ? patch.lastConciergeSearch
        : session.lastConciergeSearch,
    lastActiveAt: Date.now(),
  };
}

export function sessionStateForApi(session: ProcioneVoiceSession) {
  return {
    dataMode: session.dataMode,
    meetingContext: session.meetingContext,
    demoSnapshot: session.demoSnapshot,
    lastConciergeSearch: session.lastConciergeSearch,
    sessionId: session.id,
  };
}
