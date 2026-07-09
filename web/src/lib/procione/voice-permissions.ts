/** Stato permesso microfono — un solo punto di verità (FIX: prima apriva/chiudeva stream a ogni tap). */
export type MicPermissionState = "unknown" | "prompt" | "granted" | "denied";

let sharedStream: MediaStream | null = null;

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

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

/** Richiede il microfono e mantiene lo stream master aperto per wake + tap successivi. */
export async function requestMicPermission(): Promise<MicPermissionState> {
  const existing = getSharedMicStream();
  if (existing) return "granted";

  try {
    sharedStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return "granted";
  } catch {
    releaseMicStream();
    return "denied";
  }
}

export async function ensureMicReady(): Promise<void> {
  const state = await requestMicPermission();
  if (state !== "granted") {
    throw new Error("MIC_DENIED");
  }
}

/**
 * Stream dedicato alla registrazione: clona la traccia master così onstop non uccide il wake listener.
 * FIX iOS: prima stop() sullo stream condiviso rendeva il secondo tap muto.
 */
export async function acquireRecordingStream(): Promise<{ stream: MediaStream; release: () => void }> {
  await ensureMicReady();
  const master = getSharedMicStream();
  if (master?.getAudioTracks().length) {
    const cloned = master.getAudioTracks().map((t) => t.clone());
    const stream = new MediaStream(cloned);
    return {
      stream,
      release: () => {
        stream.getTracks().forEach((t) => t.stop());
      },
    };
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return {
    stream,
    release: () => {
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
