/** Stato permesso microfono — un solo punto di verità (FIX: prima apriva/chiudeva stream a ogni tap). */
export type MicPermissionState = "unknown" | "prompt" | "granted" | "denied";

let sharedStream: MediaStream | null = null;

export function getSharedMicStream(): MediaStream | null {
  if (sharedStream?.active) return sharedStream;
  sharedStream = null;
  return null;
}

export function releaseMicStream(): void {
  sharedStream?.getTracks().forEach((t) => t.stop());
  sharedStream = null;
}

export async function queryMicPermission(): Promise<MicPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
  try {
    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
    if (result.state === "granted") return "granted";
    if (result.state === "denied") return "denied";
    return "prompt";
  } catch {
    return "unknown";
  }
}

/** Richiede il microfono e mantiene lo stream aperto per wake + recorder (niente doppia getUserMedia). */
export async function requestMicPermission(): Promise<MicPermissionState> {
  const existing = getSharedMicStream();
  if (existing) return "granted";

  try {
    sharedStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return "granted";
  } catch {
    releaseMicStream();
    return "denied";
  }
}

/** Garantisce stream attivo; su iOS va chiamato dopo un gesto utente (tap). */
export async function ensureMicReady(): Promise<void> {
  const state = await requestMicPermission();
  if (state !== "granted") {
    throw new Error("MIC_DENIED");
  }
}
