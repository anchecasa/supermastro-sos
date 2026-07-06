"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildAppointmentSpeech,
  PROCIONE_WAKE_SPOKEN,
} from "@/lib/procione/appointment-speech";
import type { AssistantAppointment } from "@/lib/procione/types";

const SPEECH_RATE = 1.18;
const WAKE_SPEECH_RATE = 1.55;
const AUDIO_PLAYBACK_RATE = 1.15;
const WAKE_AUDIO_PLAYBACK_RATE = 1.38;

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

function stopProcionePlayback() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = "";
    activeAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
}

function speakWithBrowser(text: string, rate = SPEECH_RATE): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("Sintesi vocale non disponibile."));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "it-IT";
    utterance.rate = rate;
    utterance.pitch = rate > 1.4 ? 1.22 : 1.18;

    const voices = window.speechSynthesis.getVoices();
    const italian =
      voices.find((v) => v.lang.startsWith("it") && /google|microsoft|natural/i.test(v.name)) ??
      voices.find((v) => v.lang.startsWith("it"));
    if (italian) utterance.voice = italian;

    utterance.onend = () => {
      activeUtterance = null;
      resolve();
    };
    utterance.onerror = () => {
      activeUtterance = null;
      reject(new Error("Lettura vocale interrotta."));
    };

    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

async function speakWithElevenLabs(
  text: string,
  opts?: { playbackRate?: number; speed?: number }
): Promise<boolean> {
  const res = await fetch("/api/procione/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed: opts?.speed }),
  });

  if (res.status === 503) return false;
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Errore sintesi vocale.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.playbackRate = opts?.playbackRate ?? AUDIO_PLAYBACK_RATE;
    activeAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      activeAudio = null;
      resolve(true);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      activeAudio = null;
      reject(new Error("Riproduzione audio fallita."));
    };
    void audio.play().catch(reject);
  });
}

async function speakSegment(
  text: string,
  opts?: { fast?: boolean }
): Promise<void> {
  const fast = opts?.fast ?? false;
  const usedElevenLabs = await speakWithElevenLabs(text, {
    playbackRate: fast ? WAKE_AUDIO_PLAYBACK_RATE : AUDIO_PLAYBACK_RATE,
    speed: fast ? 1.38 : undefined,
  });
  if (!usedElevenLabs) {
    await speakWithBrowser(text, fast ? WAKE_SPEECH_RATE : SPEECH_RATE);
  }
}

export function useProcioneSpeak() {
  const [speaking, setSpeaking] = useState(false);
  const busyRef = useRef(false);

  const speak = useCallback(async (text: string) => {
    if (busyRef.current || !text.trim()) return;
    busyRef.current = true;
    setSpeaking(true);
    stopProcionePlayback();

    try {
      await speakSegment(text);
    } finally {
      busyRef.current = false;
      setSpeaking(false);
    }
  }, []);

  const speakWakeAck = useCallback(async () => {
    await speakSegment(PROCIONE_WAKE_SPOKEN, { fast: true });
  }, []);

  const speakMessage = useCallback(
    async (content: string) => {
      if (busyRef.current || !content.trim()) return;
      busyRef.current = true;
      setSpeaking(true);
      stopProcionePlayback();
      try {
        await speakWakeAck();
        await speakSegment(content);
      } finally {
        busyRef.current = false;
        setSpeaking(false);
      }
    },
    [speakWakeAck]
  );

  const speakAppointment = useCallback(
    async (appointment: AssistantAppointment) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setSpeaking(true);
      stopProcionePlayback();
      try {
        await speakWakeAck();
        await speakSegment(buildAppointmentSpeech(appointment));
      } finally {
        busyRef.current = false;
        setSpeaking(false);
      }
    },
    [speakWakeAck]
  );

  const stop = useCallback(() => {
    stopProcionePlayback();
    busyRef.current = false;
    setSpeaking(false);
  }, []);

  useEffect(() => {
    return () => stopProcionePlayback();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    const onVoices = () => window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener("voiceschanged", onVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
  }, []);

  return { speaking, speak, speakMessage, speakAppointment, stop };
}
