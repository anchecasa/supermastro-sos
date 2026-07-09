/** Costanti e utility cattura audio — estratte dal monolite use-procione-voice. */

export const SILENCE_MS = 2800;

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

/** Recorder + Whisper su mobile/Safari; SpeechRecognition solo dove affidabile. */
export function preferRecorderCapture(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent)) return true;
  const ua = navigator.userAgent;
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)) return true;
  return !getSpeechRecognition();
}

export function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microfono bloccato. Clicca l'icona lucchetto nella barra indirizzi e consenti il microfono.";
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
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

/** VAD silenzio → auto-stop registrazione (FIX: prima serviva secondo tap su mobile). */
export function attachSilenceAutoStop(
  stream: MediaStream,
  onSilence: () => void,
  silenceMs = SILENCE_MS,
  minRecordMs = 700
): () => void {
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  const startedAt = Date.now();
  let silenceStart: number | null = null;
  let raf = 0;
  let done = false;

  const cleanup = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    source.disconnect();
    void audioCtx.close();
  };

  const tick = () => {
    if (done) return;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    const loud = rms > 0.018;
    const elapsed = Date.now() - startedAt;

    if (loud) {
      silenceStart = null;
    } else if (elapsed >= minRecordMs) {
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
