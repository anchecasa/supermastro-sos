export const PROCIONE_AGENDA_PATH = "/procione/agenda";
export const PUBLIC_AGENDA_PATH = "/agenda";
export const PROCIONE_TAB_KEY = "procione-active-tab";

function agendaUrlWithActiveTab(basePath: string): string {
  if (typeof window === "undefined") return basePath;
  const tab = sessionStorage.getItem(PROCIONE_TAB_KEY);
  if (tab === "contatti") return `${basePath}?tab=rubrica`;
  return basePath;
}

export function getActiveAgendaPath(): string {
  if (typeof window !== "undefined" && window.location.pathname.startsWith(PUBLIC_AGENDA_PATH)) {
    return PUBLIC_AGENDA_PATH;
  }
  return PROCIONE_AGENDA_PATH;
}

/** Porta in primo piano l'app Procione sull'agenda (PWA / tab in background). */
export async function focusProcioneAgenda(): Promise<void> {
  if (typeof window === "undefined") return;

  const basePath = getActiveAgendaPath();
  const target = agendaUrlWithActiveTab(basePath);
  const here = `${window.location.pathname}${window.location.search}`;

  if (!here.startsWith(basePath) || here !== target) {
    window.location.assign(target);
    return;
  }

  window.focus();

  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "PROCIONE_WAKE_FOCUS", url: target });
  } catch {
    /* ignore */
  }
}

export function isProcioneStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (typeof navigator !== "undefined" &&
      "standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}
