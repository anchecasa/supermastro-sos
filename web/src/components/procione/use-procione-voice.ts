"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceResult = {
  transcript: string;
  reply: string;
  type: string;
  audioBase64?: string;
  audioMime?: string;
};

type UseProcioneVoiceOptions = {
  onResult: (result: VoiceResult) => void;
  onError: (message: string) => void;
  onWake?: () => void;
  onListeningChange?: (listening: boolean) => void;
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((ev: { results: { isFinal: boolean; length: number; [i: number]: { transcript: string } | undefined }[] }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

function speechErrorMessage(code: string): string {
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

function playBase64Audio(base64: string, mime = "audio/mpeg") {
  const audio = new Audio(`data:${mime};base64,${base64}`);
  void audio.play();
}

function getRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
}

async function ensureMicrophoneAccess(): Promise<void> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  stream.getTracks().forEach((t) => t.stop());
}

async function recordAudioBlob(maxMs = 9000): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = getRecorderMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (!chunks.length) {
        reject(new Error("Nessun audio registrato."));
        return;
      }
      resolve(new Blob(chunks, { type: mimeType ?? chunks[0]?.type ?? "audio/webm" }));
    };
    recorder.onerror = () => {
      stream.getTracks().forEach((t) => t.stop());
      reject(new Error("Registrazione fallita."));
    };
    recorder.start(250);
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, maxMs);
  });
}

async function listenOnceSpeech(maxMs = 10000): Promise<string> {
  const Ctor = getSpeechRecognition();
  if (!Ctor) {
    throw new Error("Usa Chrome o Edge su PC per i comandi vocali.");
  }

  await ensureMicrophoneAccess();

  return new Promise((resolve, reject) => {
    const recognition = new Ctor();
    recognition.lang = "it-IT";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let finished = false;
    const finish = (fn: () => void) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      fn();
    };

    const timer = window.setTimeout(() => {
      recognition.stop();
      finish(() => reject(new Error("Tempo scaduto. Di' il comando entro 10 secondi.")));
    }, maxMs);

    recognition.onresult = (event) => {
      const text = event.results[0]?.[0]?.transcript?.trim() ?? "";
      finish(() => {
        if (!text) reject(new Error("Non ho capito. Riprova."));
        else resolve(text);
      });
    };

    recognition.onerror = (event) => {
      finish(() => reject(new Error(speechErrorMessage(event.error))));
    };

    recognition.onend = () => {
      finish(() => reject(new Error("Non ho sentito nulla. Riprova.")));
    };

    try {
      recognition.start();
    } catch {
      finish(() => reject(new Error("Impossibile avviare il riconoscimento vocale.")));
    }
  });
}

async function sendVoiceToApi(audio?: Blob, transcript?: string): Promise<VoiceResult> {
  const form = new FormData();
  if (audio) form.append("audio", audio, "voice.webm");
  if (transcript) form.append("transcript", transcript);

  const res = await fetch("/api/procione/voice", { method: "POST", body: form });
  const data = (await res.json()) as VoiceResult & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Errore API vocale");
  return data;
}

async function transcribeCommand(): Promise<{ transcript?: string; audio?: Blob }> {
  try {
    const transcript = await listenOnceSpeech();
    return { transcript };
  } catch (speechErr) {
    const cfg = (await fetch("/api/procione/voice").then((r) => r.json())) as { whisper?: boolean };
    if (!cfg.whisper) throw speechErr;
    const audio = await recordAudioBlob();
    return { audio };
  }
}

const WAKE_PATTERNS = [
  /ehi\s+procione/i,
  /hey\s+procione/i,
  /ei\s+procione/i,
  /ok\s+procione/i,
  /procione[, ]/i,
];

function containsWakePhrase(text: string): boolean {
  return WAKE_PATTERNS.some((re) => re.test(text));
}

function extractCommandAfterWake(text: string): string {
  return text
    .replace(/^.*?(ehi|hey|ei|ok)\s+procione[,:\s]*/i, "")
    .replace(/^procione[,:\s]*/i, "")
    .trim();
}

export function useProcioneVoice({
  onResult,
  onError,
  onWake,
  onListeningChange,
}: UseProcioneVoiceOptions) {
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const wakeRef = useRef<{ stop: () => void; active: boolean } | null>(null);
  const busyRef = useRef(false);

  const runPipeline = useCallback(
    async (knownTranscript?: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setProcessing(true);
      onListeningChange?.(true);
      setStatusHint("Ascolto…");

      try {
        let result: VoiceResult;
        if (knownTranscript) {
          setStatusHint("Elaboro…");
          result = await sendVoiceToApi(undefined, knownTranscript);
        } else {
          const captured = await transcribeCommand();
          setStatusHint("Elaboro…");
          result = await sendVoiceToApi(captured.audio, captured.transcript);
        }

        if (result.audioBase64) {
          playBase64Audio(result.audioBase64, result.audioMime);
        }
        onResult(result);
        setStatusHint(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Errore vocale";
        setStatusHint(null);
        onError(msg);
      } finally {
        busyRef.current = false;
        setProcessing(false);
        onListeningChange?.(false);
      }
    },
    [onError, onListeningChange, onResult]
  );

  const startManualVoice = useCallback(async () => {
    await runPipeline();
  }, [runPipeline]);

  const startPhraseWakeWord = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      onError("Wake word richiede Chrome o Edge su PC.");
      return null;
    }

    const recognition = new Ctor();
    recognition.lang = "it-IT";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const state = { active: true, recognition };

    const restart = () => {
      if (!state.active) return;
      try {
        recognition.start();
        setStatusHint("Ehi Procione attivo — di' il comando");
      } catch {
        window.setTimeout(restart, 800);
      }
    };

    recognition.onresult = (event) => {
      for (let i = event.results.length - 1; i >= 0; i--) {
        if (!event.results[i]?.isFinal) continue;
        const text = event.results[i]?.[0]?.transcript ?? "";
        if (!containsWakePhrase(text)) continue;

        onWake?.();
        state.active = false;
        recognition.stop();

        const inlineCommand = extractCommandAfterWake(text);
        void runPipeline(inlineCommand || undefined);
        break;
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        restart();
        return;
      }
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        state.active = false;
        onError(speechErrorMessage(event.error));
        return;
      }
      restart();
    };

    recognition.onend = () => {
      if (state.active) restart();
    };

    restart();

    return {
      active: true,
      stop: () => {
        state.active = false;
        recognition.abort();
        setStatusHint(null);
      },
    };
  }, [onError, onWake, runPipeline]);

  const enableWakeWord = useCallback(async () => {
    if (wakeRef.current) return;

    try {
      await ensureMicrophoneAccess();
    } catch {
      onError("Consenti l'accesso al microfono per usare Ehi Procione.");
      return;
    }

    const picovoiceKey = process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY;
    const keywordPath = process.env.NEXT_PUBLIC_PICOVOICE_KEYWORD_PATH;

    if (picovoiceKey && keywordPath) {
      try {
        const { PorcupineWorker } = await import("@picovoice/porcupine-web");
        const { WebVoiceProcessor } = await import("@picovoice/web-voice-processor");
        const modelPath =
          process.env.NEXT_PUBLIC_PICOVOICE_MODEL_PATH ?? "/porcupine/porcupine_params.pv";

        const porcupine = await PorcupineWorker.create(
          picovoiceKey,
          [{ publicPath: keywordPath, label: "Ehi Procione" }],
          () => {
            onWake?.();
            void runPipeline();
          },
          { publicPath: modelPath }
        );

        await WebVoiceProcessor.subscribe(porcupine);
        wakeRef.current = {
          active: true,
          stop: () => {
            void WebVoiceProcessor.unsubscribe(porcupine);
            porcupine.terminate();
            setStatusHint(null);
          },
        };
        setWakeEnabled(true);
        setStatusHint("Ehi Procione attivo (Picovoice)");
        return;
      } catch {
        /* fallback phrase */
      }
    }

    const handle = startPhraseWakeWord();
    if (!handle) return;
    wakeRef.current = handle;
    setWakeEnabled(true);
  }, [onError, onWake, runPipeline, startPhraseWakeWord]);

  const disableWakeWord = useCallback(() => {
    wakeRef.current?.stop();
    wakeRef.current = null;
    setWakeEnabled(false);
    setStatusHint(null);
  }, []);

  useEffect(() => {
    return () => {
      wakeRef.current?.stop();
    };
  }, []);

  return {
    wakeEnabled,
    processing,
    statusHint,
    enableWakeWord,
    disableWakeWord,
    startManualVoice,
    runWithTranscript: runPipeline,
  };
}

export type { VoiceResult };
