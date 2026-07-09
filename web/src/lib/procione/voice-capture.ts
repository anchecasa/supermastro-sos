/** Costanti e utility cattura audio — estratte dal monolite use-procione-voice. */

import { isIosDevice } from "@/lib/procione/voice-permissions";

export const SILENCE_MS = 2800;
export const IOS_MIN_RECORD_MS = 1200;

export type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult:
    | ((ev: {
        results: { isFinal: boolean; length: number; [i: number]: { transcript: string } | undefined }[];
      }) => void)
    | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

/** Wake «we we» può usare SpeechRecognition anche su iPhone (webkit). */
export function canUsePhraseWake(): boolean {
  return Boolean(getSpeechRecognition());
}

/** Cattura comando: su iPhone sempre MediaRecorder + Whisper (SpeechRecognition troppo fragile). */
export function preferRecorderCapture(): boolean {
  if (typeof navigator === "undefined") return false;
  if (isIosDevice()) return true;
  if (/Android|Mobile/i.test(navigator.userAgent)) return true;
  const ua = navigator.userAgent;
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)) return true;
  return !getSpeechRecognition();
}

/** Su iOS il VAD con AudioContext fallisce (context suspended) → tap due volte per inviare. */
export function shouldUseTapToStop(): boolean {
  return isIosDevice();
}

export function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microfono bloccato. Su iPhone: Impostazioni → Safari → Microfono → Consenti.";
    case "no-speech":
      return "Non ho sentito nulla. Riprova parlando più vicino al microfono.";
    case "network":
      return "Riconoscimento vocale offline non disponibile. Usa Chrome e connessione attiva.";
    case "aborted":
      return "Ascolto interrotto.";
    default:
      return `Errore microfono: ${code}`;
  }
}

export function getRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const types = isIosDevice()
    ? ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

export function startMediaRecorder(recorder: MediaRecorder): void {
  // FIX iOS: timeslice 250ms spesso produce blob vuoto; un solo chunk allo stop.
  if (isIosDevice()) {
    recorder.start();
    return;
  }
  recorder.start(250);
}

type SilenceOptions = {
  silenceMs?: number;
  minRecordMs?: number;
  requireSpeechBeforeSilence?: boolean;
};

/**
 * VAD silenzio → auto-stop.
 * FIX iOS: AudioContext parte suspended → RMS=0 → stop immediato con audio vuoto.
 */
export function attachSilenceAutoStop(
  stream: MediaStream,
  onSilence: () => void,
  options: SilenceOptions = {}
): () => void {
  const silenceMs = options.silenceMs ?? SILENCE_MS;
  const minRecordMs = options.minRecordMs ?? (isIosDevice() ? IOS_MIN_RECORD_MS : 700);
  const requireSpeech = options.requireSpeechBeforeSilence ?? isIosDevice();

  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  const startedAt = Date.now();
  let silenceStart: number | null = null;
  let heardSpeech = false;
  let raf = 0;
  let done = false;
  let ctxReady = false;

  const cleanup = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    source.disconnect();
    void audioCtx.close();
  };

  void audioCtx.resume().then(() => {
    ctxReady = true;
  });

  const tick = () => {
    if (done) return;
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    if (!ctxReady && audioCtx.state !== "running") {
      raf = requestAnimationFrame(tick);
      return;
    }

    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const loud = rms > (isIosDevice() ? 0.012 : 0.018);
    const elapsed = Date.now() - startedAt;

    if (loud) {
      heardSpeech = true;
      silenceStart = null;
    } else if ((!requireSpeech || heardSpeech) && elapsed >= minRecordMs) {
      silenceStart ??= Date.now();
      if (Date.now() - silenceStart >= silenceMs) {
        cleanup();
        onSilence();
        return;
      }
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return cleanup;
}
