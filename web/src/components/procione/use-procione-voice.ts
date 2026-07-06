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

function playBase64Audio(base64: string, mime = "audio/mpeg") {
  const audio = new Audio(`data:${mime};base64,${base64}`);
  void audio.play();
}

async function recordAudioBlob(maxMs = 8000): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
  const chunks: Blob[] = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: "audio/webm" }));
    };
    recorder.onerror = () => reject(new Error("Registrazione fallita"));
    recorder.start();
    setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, maxMs);
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

export function useProcioneVoice({
  onResult,
  onError,
  onWake,
  onListeningChange,
}: UseProcioneVoiceOptions) {
  const [wakeEnabled, setWakeEnabled] = useState(false);
  const [processing, setProcessing] = useState(false);
  const wakeRef = useRef<{ stop: () => void } | null>(null);
  const busyRef = useRef(false);

  const runPipeline = useCallback(
    async (transcript?: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setProcessing(true);
      onListeningChange?.(true);
      try {
        let result: VoiceResult;
        if (transcript) {
          result = await sendVoiceToApi(undefined, transcript);
        } else {
          const blob = await recordAudioBlob();
          result = await sendVoiceToApi(blob);
        }
        if (result.audioBase64) {
          playBase64Audio(result.audioBase64, result.audioMime);
        }
        onResult(result);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Errore vocale");
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
    type SR = new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: ((ev: { results: SpeechRecognitionResultList }) => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    const win = window as Window & { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Ctor) {
      onError("Wake word non supportata in questo browser.");
      return null;
    }

    const recognition = new Ctor();
    recognition.lang = "it-IT";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      for (let i = event.results.length - 1; i >= 0; i--) {
        const text = event.results[i]?.[0]?.transcript?.toLowerCase() ?? "";
        if (text.includes("ehi procione") || text.includes("hey procione")) {
          onWake?.();
          recognition.stop();
          void runPipeline(text.replace(/.*?(ehi|hey)\s+procione[, ]?/i, "").trim() || undefined);
          break;
        }
      }
    };

    recognition.onerror = () => {
      /* riavvio silenzioso */
    };

    recognition.start();
    return { stop: () => recognition.stop() };
  }, [onError, onWake, runPipeline]);

  const enableWakeWord = useCallback(async () => {
    if (wakeRef.current) return;
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
          stop: () => {
            void WebVoiceProcessor.unsubscribe(porcupine);
            porcupine.terminate();
          },
        };
        setWakeEnabled(true);
        return;
      } catch {
        /* fallback phrase */
      }
    }

    wakeRef.current = startPhraseWakeWord();
    setWakeEnabled(Boolean(wakeRef.current));
  }, [onWake, runPipeline, startPhraseWakeWord]);

  const disableWakeWord = useCallback(() => {
    wakeRef.current?.stop();
    wakeRef.current = null;
    setWakeEnabled(false);
  }, []);

  useEffect(() => {
    return () => {
      wakeRef.current?.stop();
    };
  }, []);

  return {
    wakeEnabled,
    processing,
    enableWakeWord,
    disableWakeWord,
    startManualVoice,
    runWithTranscript: runPipeline,
  };
}

export type { VoiceResult };
