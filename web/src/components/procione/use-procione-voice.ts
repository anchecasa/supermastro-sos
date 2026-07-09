"use client";



import { useCallback, useEffect, useRef, useState } from "react";



type VoiceResult = {

  transcript: string;

  reply: string;

  type: string;

  appointment?: unknown;

  appointments?: unknown[];

  contact?: unknown;

  contacts?: unknown[];

  call?: { phone: string; name: string };

  whatsapp?: { phone: string; name: string; message: string; url: string };

  rubricaAction?: "open" | "add" | "search";

  rubricaSearch?: string;

  agendaAction?: "open";

  navigate?: { url: string; label: string };

  draft?: ProcioneDraft;
  task?: unknown;
  tasks?: unknown[];

  awaitingConfirm?: boolean;

  sessionActive?: boolean;

  dataMode?: "real" | "meeting_demo";

  meetingContext?: { destination?: string; when?: string };

  demoSnapshot?: Record<string, number | string>;

  lastConciergeSearch?: import("@/lib/procione/concierge").ConciergeSearchResult;

  concierge?: import("@/lib/procione/concierge").ConciergeSearchResult;

  audioBase64?: string;

  audioMime?: string;

};



import {

  containsWakePhrase,

  extractCommandAfterWake,

} from "@/lib/procione/wake-phrases";

import { focusProcioneAgenda } from "@/lib/procione/focus-agenda";
import type { ProcioneDraft } from "@/lib/procione/draft";
import type { ChatTurn } from "@/lib/procione/chat";
import {
  appendSessionTurn,
  applySessionPatch,
  loadProcioneSession,
  saveProcioneSession,
  sessionHistoryForApi,
  sessionStateForApi,
  type ProcioneVoiceSession,
} from "@/lib/procione/session";
import { acquireDevicePosition } from "@/lib/sos/location";



type UseProcioneVoiceOptions = {

  onResult: (result: VoiceResult) => void;

  onError: (message: string) => void;

  onWake?: () => void;

  onListeningChange?: (listening: boolean) => void;

  /** Legge domande di conferma («Hai altro da aggiungere?») prima di riaprire il microfono. */

  onPrompt?: (text: string) => Promise<void>;

  /** Avvia «Ehi Procione» in ascolto continuo al mount (default: true). */

  autoWake?: boolean;

  /** Bozza in attesa di conferma «ok». */

  getPendingDraft?: () => ProcioneDraft | null;

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



type ManualSession = {

  parts: string[];

  phase: "idle" | "confirming";

};



const WAKE_HINT = "Di' «we we» — si apre l'agenda Procione";

const MANUAL_LISTEN_HINT = "Parla… clicca di nuovo il microfono quando hai finito";
const MANUAL_RECORD_HINT = "Registro… clicca di nuovo il microfono per inviare";

const MANUAL_CONFIRM_HINT = "Di' altro oppure «no» per memorizzare";

const FOLLOW_UP_QUESTION = "Hai altro da aggiungere? Di' no per memorizzare.";

const SILENCE_MS = 2200;



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

  audio.playbackRate = 1.15;

  void audio.play();

}



function getRecorderMimeType(): string | undefined {

  if (typeof MediaRecorder === "undefined") return undefined;

  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"]) {

    if (MediaRecorder.isTypeSupported(type)) return type;

  }

  return undefined;

}

async function isWhisperAvailable(): Promise<boolean> {
  try {
    const cfg = (await fetch("/api/procione/voice").then((r) => r.json())) as { whisper?: boolean };
    return Boolean(cfg.whisper);
  } catch {
    return false;
  }
}

type ManualHandle =
  | { mode: "speech"; getText: () => string; abort: () => void }
  | { mode: "recorder"; finish: () => Promise<Blob>; abort: () => void };



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



async function maybeGpsForTranscript(transcript?: string): Promise<{ lat?: number; lng?: number }> {
  if (!transcript) return {};
  const t = transcript.toLowerCase();
  if (!/(?:qui vicino|vicino a me|intorno a me|nei paraggi|qui attorno)/.test(t)) return {};
  try {
    const pos = await acquireDevicePosition();
    return { lat: pos.lat, lng: pos.lng };
  } catch {
    return {};
  }
}

async function sendVoiceToApi(
  audio?: Blob,
  transcript?: string,
  ctx?: {
    pendingDraft?: ProcioneDraft | null;
    history?: ChatTurn[];
    session?: ReturnType<typeof sessionStateForApi>;
    lat?: number;
    lng?: number;
  }
): Promise<VoiceResult> {

  const form = new FormData();

  if (audio) form.append("audio", audio, "voice.webm");

  if (transcript) form.append("transcript", transcript);

  if (ctx?.pendingDraft) form.append("pendingDraft", JSON.stringify(ctx.pendingDraft));

  if (ctx?.history?.length) form.append("history", JSON.stringify(ctx.history));

  if (ctx?.session) {
    form.append("dataMode", ctx.session.dataMode);
    if (ctx.session.sessionId) form.append("sessionId", ctx.session.sessionId);
    if (ctx.session.meetingContext) {
      form.append("meetingContext", JSON.stringify(ctx.session.meetingContext));
    }
    if (ctx.session.demoSnapshot) {
      form.append("demoSnapshot", JSON.stringify(ctx.session.demoSnapshot));
    }
    if (ctx.session.lastConciergeSearch) {
      form.append("lastConciergeSearch", JSON.stringify(ctx.session.lastConciergeSearch));
    }
  }

  if (ctx?.lat != null && ctx?.lng != null) {
    form.append("lat", String(ctx.lat));
    form.append("lng", String(ctx.lng));
  }



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



async function onWakeDetected(onWake?: () => void) {

  onWake?.();

  await focusProcioneAgenda();

}



export function useProcioneVoice({

  onResult,

  onError,

  onWake,

  onListeningChange,

  onPrompt,

  autoWake = true,

  getPendingDraft,

}: UseProcioneVoiceOptions) {

  const [wakeEnabled, setWakeEnabled] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [manualListening, setManualListening] = useState(false);

  const [statusHint, setStatusHint] = useState<string | null>(null);

  const wakeRef = useRef<{

    stop: () => void;

    pause?: () => void;

    resume?: () => void;

    active: boolean;

  } | null>(null);

  const busyRef = useRef(false);

  const wakeLockRef = useRef(false);

  const manualRef = useRef<ManualHandle | null>(null);

  const manualSessionRef = useRef<ManualSession>({ parts: [], phase: "idle" });

  const voiceSessionRef = useRef<ProcioneVoiceSession>(loadProcioneSession());

  const finishingManualRef = useRef(false);
  const handleManualUtteranceRef = useRef<(text: string) => Promise<void>>(async () => {});
  const startManualListeningRef = useRef<() => void>(() => {});

  const pauseWake = useCallback(() => {

    wakeLockRef.current = true;

    wakeRef.current?.pause?.();

  }, []);



  const resumeWake = useCallback(() => {

    wakeLockRef.current = false;

    wakeRef.current?.resume?.();

  }, []);



  const stopManualRecognition = useCallback(() => {

    const handle = manualRef.current;

    if (!handle) return;

    manualRef.current = null;

    try {

      handle.abort();

    } catch {

      /* ignore */

    }

    setManualListening(false);

    onListeningChange?.(false);

  }, [onListeningChange]);



  const buildApiContext = useCallback(
    () => ({
      pendingDraft: getPendingDraft?.() ?? null,
      history: sessionHistoryForApi(voiceSessionRef.current),
      session: sessionStateForApi(voiceSessionRef.current),
    }),
    [getPendingDraft]
  );

  const deliverResult = useCallback(
    (result: VoiceResult) => {
      if (result.transcript && result.reply) {
        let session = appendSessionTurn(
          voiceSessionRef.current,
          result.transcript,
          result.reply
        );
        if (
          result.dataMode ||
          result.meetingContext !== undefined ||
          result.demoSnapshot !== undefined ||
          result.lastConciergeSearch !== undefined ||
          result.concierge
        ) {
          session = applySessionPatch(session, {
            dataMode: result.dataMode ?? session.dataMode,
            meetingContext: result.meetingContext,
            demoSnapshot: result.demoSnapshot,
            lastConciergeSearch: result.lastConciergeSearch ?? result.concierge,
          });
        }
        voiceSessionRef.current = session;
        saveProcioneSession(voiceSessionRef.current);
      }
      onResult(result);
    },
    [onResult]
  );

  const executeTranscript = useCallback(

    async (transcript: string) => {

      busyRef.current = true;

      pauseWake();

      setProcessing(true);

      setStatusHint("Elaboro…");



      try {

        const gps = await maybeGpsForTranscript(transcript);

        const result = await sendVoiceToApi(undefined, transcript, {
          ...buildApiContext(),
          lat: gps.lat,
          lng: gps.lng,
        });

        if (result.audioBase64) {

          playBase64Audio(result.audioBase64, result.audioMime);

        }

        deliverResult(result);

        setStatusHint(null);

      } catch (err) {

        const msg = err instanceof Error ? err.message : "Errore vocale";

        setStatusHint(null);

        onError(msg);

      } finally {

        busyRef.current = false;

        setProcessing(false);

        resumeWake();

      }

    },

    [buildApiContext, deliverResult, onError, pauseWake, resumeWake]

  );



  const startManualListening = useCallback(async () => {

    if (manualRef.current) return;

    try {

      await ensureMicrophoneAccess();

    } catch {

      onError("Consenti l'accesso al microfono nelle impostazioni del browser.");

      return;

    }

    pauseWake();

    setManualListening(true);

    onListeningChange?.(true);

    setStatusHint(MANUAL_LISTEN_HINT);

    const Ctor = getSpeechRecognition();

    if (!Ctor) {

      const whisper = await isWhisperAvailable();

      if (!whisper) {

        setManualListening(false);

        onListeningChange?.(false);

        resumeWake();

        onError("Riconoscimento vocale non disponibile su questo browser. Usa Chrome o Edge.");

        return;

      }

      try {

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const mimeType = getRecorderMimeType();

        const recorder = mimeType

          ? new MediaRecorder(stream, { mimeType })

          : new MediaRecorder(stream);

        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {

          if (e.data.size) chunks.push(e.data);

        };

        let stopResolve!: (blob: Blob) => void;

        let stopReject!: (err: Error) => void;

        const blobPromise = new Promise<Blob>((resolve, reject) => {

          stopResolve = resolve;

          stopReject = reject;

        });

        recorder.onstop = () => {

          stream.getTracks().forEach((t) => t.stop());

          if (!chunks.length) {

            stopReject(new Error("Nessun audio registrato."));

            return;

          }

          stopResolve(new Blob(chunks, { type: mimeType ?? chunks[0]?.type ?? "audio/webm" }));

        };

        recorder.onerror = () => {

          stream.getTracks().forEach((t) => t.stop());

          stopReject(new Error("Registrazione fallita."));

        };

        let finished = false;

        manualRef.current = {

          mode: "recorder",

          finish: () => {

            if (finished) return blobPromise;

            finished = true;

            if (recorder.state !== "inactive") recorder.stop();

            return blobPromise;

          },

          abort: () => {

            finished = true;

            if (recorder.state !== "inactive") recorder.stop();

            else stream.getTracks().forEach((t) => t.stop());

          },

        };

        setStatusHint(MANUAL_RECORD_HINT);

        recorder.start(250);

      } catch {

        setManualListening(false);

        onListeningChange?.(false);

        resumeWake();

        onError("Impossibile avviare il microfono. Riprova tra un attimo.");

      }

      return;

    }

    const recognition = new Ctor();

    recognition.lang = "it-IT";

    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.maxAlternatives = 1;



    let collected = "";

    let resultIndex = 0;

    let silenceTimer: ReturnType<typeof setTimeout> | null = null;

    let stopped = false;



    const clearSilence = () => {

      if (silenceTimer) clearTimeout(silenceTimer);

      silenceTimer = null;

    };



    const abortRecognition = () => {

      if (stopped) return;

      stopped = true;

      clearSilence();

      try {

        recognition.abort();

      } catch {

        /* ignore */

      }

    };



    manualRef.current = {

      mode: "speech",

      getText: () => collected,

      abort: abortRecognition,

    };



    const finishFromSilence = () => {

      if (finishingManualRef.current) return;

      finishingManualRef.current = true;

      abortRecognition();

      const text = collected.trim();

      stopManualRecognition();

      void (async () => {

        try {

          await handleManualUtteranceRef.current(text);

        } finally {

          finishingManualRef.current = false;

        }

      })();

    };



    const scheduleSilence = () => {

      clearSilence();

      silenceTimer = setTimeout(finishFromSilence, SILENCE_MS);

    };



    recognition.onresult = (event) => {

      for (let i = resultIndex; i < event.results.length; i++) {

        const result = event.results[i];

        if (!result?.isFinal) continue;

        const piece = result[0]?.transcript?.trim() ?? "";

        if (piece) {

          collected = collected ? `${collected} ${piece}` : piece;

        }

        resultIndex = i + 1;

      }

      if (collected) scheduleSilence();

    };



    recognition.onerror = (event) => {

      if (event.error === "no-speech") {

        scheduleSilence();

        return;

      }

      if (event.error === "aborted") return;

      stopManualRecognition();

      resumeWake();

      onError(speechErrorMessage(event.error));

    };



    recognition.onend = () => {

      if (!stopped && manualRef.current) {

        scheduleSilence();

      }

    };



    try {

      recognition.start();

      scheduleSilence();

    } catch {

      stopManualRecognition();

      resumeWake();

      onError("Impossibile avviare il microfono. Riprova tra un attimo.");

    }

  }, [onError, onListeningChange, pauseWake, resumeWake, stopManualRecognition]);

  startManualListeningRef.current = startManualListening;

  const handleManualUtterance = useCallback(

    async (text: string) => {

      if (!text) {

        resumeWake();

        return;

      }

      manualSessionRef.current = { parts: [], phase: "idle" };

      await executeTranscript(text);

    },

    [executeTranscript, resumeWake]

  );

  handleManualUtteranceRef.current = handleManualUtterance;

  const finishManualListening = useCallback(() => {

    const handle = manualRef.current;

    if (!handle) return;

    if (handle.mode === "recorder") {

      finishingManualRef.current = true;

      manualRef.current = null;

      setManualListening(false);

      onListeningChange?.(false);

      setStatusHint("Elaboro…");

      void (async () => {

        try {

          const blob = await handle.finish();

          busyRef.current = true;

          pauseWake();

          setProcessing(true);

          const result = await sendVoiceToApi(blob, undefined, buildApiContext());

          if (result.audioBase64) {

            playBase64Audio(result.audioBase64, result.audioMime);

          }

          deliverResult(result);

          setStatusHint(null);

        } catch (err) {

          setStatusHint(null);

          onError(err instanceof Error ? err.message : "Errore vocale");

        } finally {

          busyRef.current = false;

          setProcessing(false);

          finishingManualRef.current = false;

          resumeWake();

        }

      })();

      return;

    }

    const text = handle.getText().trim();

    finishingManualRef.current = true;

    stopManualRecognition();

    void (async () => {

      try {

        await handleManualUtterance(text);

      } finally {

        finishingManualRef.current = false;

      }

    })();

  }, [

    buildApiContext,

    deliverResult,

    handleManualUtterance,

    onError,

    onListeningChange,

    pauseWake,

    resumeWake,

    stopManualRecognition,

  ]);



  const toggleManualVoice = useCallback(() => {

    if (manualListening) {

      finishManualListening();

      return;

    }

    if (busyRef.current || processing) {

      onError("Aspetta che Procione finisca di rispondere.");

      return;

    }



    manualSessionRef.current = { parts: [], phase: "idle" };

    void startManualListening();

  }, [busyRef, finishManualListening, manualListening, onError, processing, startManualListening]);



  const runPipeline = useCallback(

    async (knownTranscript?: string) => {

      if (busyRef.current || manualRef.current) return;

      busyRef.current = true;

      pauseWake();

      setProcessing(true);

      onListeningChange?.(true);

      setStatusHint("Ascolto…");



      try {

        let result: VoiceResult;

        if (knownTranscript) {

          setStatusHint("Elaboro…");

          const gps = await maybeGpsForTranscript(knownTranscript);

          result = await sendVoiceToApi(undefined, knownTranscript, {
            ...buildApiContext(),
            lat: gps.lat,
            lng: gps.lng,
          });

        } else {

          const captured = await transcribeCommand();

          setStatusHint("Elaboro…");

          const gps = await maybeGpsForTranscript(captured.transcript);

          result = await sendVoiceToApi(captured.audio, captured.transcript, {
            ...buildApiContext(),
            lat: gps.lat,
            lng: gps.lng,
          });

        }



        if (result.audioBase64) {

          playBase64Audio(result.audioBase64, result.audioMime);

        }

        deliverResult(result);

        setStatusHint(null);

      } catch (err) {

        const msg = err instanceof Error ? err.message : "Errore vocale";

        setStatusHint(null);

        onError(msg);

      } finally {

        busyRef.current = false;

        setProcessing(false);

        onListeningChange?.(false);

        resumeWake();

      }

    },

    [buildApiContext, deliverResult, onError, onListeningChange, pauseWake, resumeWake]

  );



  const startManualVoice = useCallback(async () => {

    toggleManualVoice();

  }, [toggleManualVoice]);



  const startPhraseWakeWord = useCallback(() => {

    const Ctor = getSpeechRecognition();

    if (!Ctor) {

      return null;

    }



    const recognition = new Ctor();

    recognition.lang = "it-IT";

    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.maxAlternatives = 1;



    const state = { active: true, recognition };



    const restart = () => {

      if (!state.active || busyRef.current || wakeLockRef.current || manualRef.current) return;

      try {

        recognition.start();

        if (!manualRef.current && !busyRef.current) {

          setStatusHint(WAKE_HINT);

        }

      } catch {

        window.setTimeout(restart, 800);

      }

    };



    recognition.onresult = (event) => {

      if (busyRef.current || wakeLockRef.current || manualRef.current) return;



      for (let i = event.results.length - 1; i >= 0; i--) {

        const text = event.results[i]?.[0]?.transcript ?? "";

        if (!containsWakePhrase(text)) continue;

        if (!event.results[i]?.isFinal) continue;



        wakeLockRef.current = true;

        void onWakeDetected(onWake);

        try {

          recognition.stop();

        } catch {

          /* ignore */

        }



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

      pause: () => {

        try {

          recognition.abort();

        } catch {

          /* ignore */

        }

      },

      resume: restart,

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

            void onWakeDetected(onWake);

            void runPipeline();

          },

          { publicPath: modelPath }

        );



        await WebVoiceProcessor.subscribe(porcupine);

        wakeRef.current = {

          active: true,

          pause: () => {

            void WebVoiceProcessor.unsubscribe(porcupine);

          },

          resume: () => {

            void WebVoiceProcessor.subscribe(porcupine);

            setStatusHint(WAKE_HINT);

          },

          stop: () => {

            void WebVoiceProcessor.unsubscribe(porcupine);

            porcupine.terminate();

            setStatusHint(null);

          },

        };

        setWakeEnabled(true);

        setStatusHint(WAKE_HINT);

        return;

      } catch {

        /* fallback phrase */

      }

    }



    const handle = startPhraseWakeWord();

    if (!handle) {

      setStatusHint("Clicca il microfono per parlare con Procione");

      return;

    }

    wakeRef.current = handle;

    setWakeEnabled(true);

    setStatusHint(WAKE_HINT);

  }, [onError, onWake, runPipeline, startPhraseWakeWord]);



  const disableWakeWord = useCallback(() => {

    wakeRef.current?.stop();

    wakeRef.current = null;

    setWakeEnabled(false);

    setStatusHint(null);

  }, []);



  useEffect(() => {

    if (!autoWake) return;

    void enableWakeWord();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [autoWake]);



  useEffect(() => {

    const resumeIfVisible = () => {

      if (document.visibilityState !== "visible") return;

      if (busyRef.current || wakeLockRef.current || manualRef.current) return;

      wakeRef.current?.resume?.();

    };

    document.addEventListener("visibilitychange", resumeIfVisible);

    return () => document.removeEventListener("visibilitychange", resumeIfVisible);

  }, []);



  useEffect(() => {

    return () => {

      manualRef.current?.abort();

      wakeRef.current?.stop();

    };

  }, []);



  return {

    wakeEnabled,

    processing,

    manualListening,

    statusHint,

    enableWakeWord,

    disableWakeWord,

    startManualVoice,

    toggleManualVoice,

    runWithTranscript: runPipeline,

  };

}



export type { VoiceResult };


