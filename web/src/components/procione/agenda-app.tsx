"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Mail,
  Menu,
  Mic,
  MoreHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { ProcioneCalendar } from "@/components/procione/calendar/procione-calendar";
import { MailPlaceholderPanel } from "@/components/procione/mail-placeholder";
import { AppointmentDetailSheet } from "@/components/procione/appointment-detail-sheet";
import {
  getProcioneCallConsent,
  getProcioneWhatsAppConsent,
  ProcioneContactsPanel,
  type RubricaVoiceTrigger,
} from "@/components/procione/procione-contacts-panel";
import { PROCIONE_TAB_KEY } from "@/lib/procione/focus-agenda";
import type {
  AssistantAppointment,
  AssistantContact,
  AssistantTask,
  AssistantVoiceLog,
  CreateAppointmentInput,
} from "@/lib/procione/types";
import { createAppointment, createContact, deleteAppointment, deleteContact, deleteTask, updateContact, updateTask } from "@/app/procione/actions";
import {
  ProcioneIntegrations,
  ProcioneServiceWorkerRegister,
  subscribeProcionePush,
} from "@/components/procione/procione-integrations";
import { ProcioneInstallBanner } from "@/components/procione/procione-install-banner";
import { useProcioneSpeak } from "@/components/procione/use-procione-speak";
import { useProcioneVoice } from "@/components/procione/use-procione-voice";
import { ProcioneDraftCard } from "@/components/procione/procione-draft-card";
import { ConciergeResultsCard } from "@/components/procione/concierge-results-card";
import type { ConciergeSearchResult } from "@/lib/procione/concierge";
import type { ProcioneDraft } from "@/lib/procione/draft";
import type { ConciergePlaceResult } from "@/lib/procione/concierge";
import { loadProcioneSession, type ProcioneDataMode } from "@/lib/procione/session";
import { useProcioneScreenWakeLock } from "@/components/procione/use-procione-wake-lock";
import { cn } from "@/lib/utils";
import { TaskListSection } from "@/components/procione/task-list-section";
import { TaskDetailSheet } from "@/components/procione/task-detail-sheet";
import { VoiceUndoBanner } from "@/components/procione/voice-undo-banner";
import {
  buildVoiceUndoState,
  isVoiceUndoCommand,
  isVoiceUndoExpired,
  type VoiceUndoState,
} from "@/lib/procione/voice-undo";

const PROCIONE_AVATAR = "/images/supermastro-mezzobusto.png";
const ORANGE = "#F27131";

type TabId = "agenda" | "contatti" | "ricevuti" | "crea" | "mail" | "altro";

type AgendaAppProps = {
  displayName: string;
  email: string;
  googleConnected: boolean;
  initialAppointments: AssistantAppointment[];
  initialContacts: AssistantContact[];
  initialTasks: AssistantTask[];
  initialVoiceLog: AssistantVoiceLog[];
  installVariant?: "procione" | "agenda";
};

export function AgendaApp({
  displayName,
  email,
  googleConnected: initialGoogleConnected,
  initialAppointments,
  initialContacts,
  initialTasks,
  initialVoiceLog,
  installVariant = "procione",
}: AgendaAppProps) {
  const [tab, setTab] = useState<TabId>("agenda");
  const [appointments, setAppointments] = useState(initialAppointments);
  const [contacts, setContacts] = useState(initialContacts);
  const [tasks, setTasks] = useState(initialTasks);
  const [voiceLog, setVoiceLog] = useState(initialVoiceLog);
  const [googleConnected, setGoogleConnected] = useState(initialGoogleConnected);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushAttempted, setPushAttempted] = useState(false);
  const [selected, setSelected] = useState<AssistantAppointment | null>(null);
  const [selectedTask, setSelectedTask] = useState<AssistantTask | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [procioneMood, setProcioneMood] = useState<"idle" | "active" | "success">("idle");
  const [form, setForm] = useState({
    title: "",
    contact_name: "",
    location: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    color: "orange" as AssistantAppointment["color"],
  });
  const [pending, setPending] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<ProcioneDraft | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);
  const [dataMode, setDataMode] = useState<ProcioneDataMode>(() => loadProcioneSession().dataMode);
  const [conciergeResult, setConciergeResult] = useState<ConciergeSearchResult | null>(null);
  const [rubricaVoiceTrigger, setRubricaVoiceTrigger] = useState<RubricaVoiceTrigger | null>(null);
  const [voiceUndo, setVoiceUndo] = useState<VoiceUndoState | null>(null);
  const [, setUndoTick] = useState(0);
  const voiceUndoRef = useRef<VoiceUndoState | null>(null);

  const sortedAppointments = useMemo(
    () =>
      [...appointments]
        .filter((a) => a.status === "scheduled")
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [appointments]
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function mergeAppointments(incoming: AssistantAppointment[]) {
    if (!incoming.length) return;
    setAppointments((prev) => {
      const next = [...prev];
      for (const appt of incoming) {
        const idx = next.findIndex((p) => p.id === appt.id);
        if (idx >= 0) next[idx] = appt;
        else next.push(appt);
      }
      return next.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    });
  }

  function mergeContacts(incoming: AssistantContact[]) {
    if (!incoming.length) return;
    setContacts((prev) => {
      const next = [...prev];
      for (const c of incoming) {
        const idx = next.findIndex((p) => p.id === c.id);
        if (idx >= 0) next[idx] = c;
        else next.push(c);
      }
      return next.sort((a, b) => a.full_name.localeCompare(b.full_name, "it"));
    });
  }

  function mergeTasks(incoming: AssistantTask[]) {
    if (!incoming.length) return;
    setTasks((prev) => {
      const next = [...prev];
      for (const t of incoming) {
        const idx = next.findIndex((p) => p.id === t.id);
        if (idx >= 0) next[idx] = t;
        else next.push(t);
      }
      return next
        .filter((t) => !(t as AssistantTask & { deleted?: boolean }).deleted && !t.completed)
        .sort((a, b) => {
          const ad = a.due_at ? new Date(a.due_at).getTime() : Number.MAX_SAFE_INTEGER;
          const bd = b.due_at ? new Date(b.due_at).getTime() : Number.MAX_SAFE_INTEGER;
          return ad - bd;
        });
    });
  }

  function removeTaskFromList(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  function applyRubricaVoice(result: {
    type: string;
    rubricaAction?: "open" | "add" | "search";
    rubricaSearch?: string;
    contact?: unknown;
  }) {
    const rubricaTypes = ["contact", "call", "whatsapp", "multi"];
    if (!result.rubricaAction && !rubricaTypes.includes(result.type)) return;

    setTab("contatti");

    if (result.rubricaAction === "add") {
      const c = result.contact as AssistantContact | undefined;
      setRubricaVoiceTrigger({
        action: "add",
        prefill: c
          ? {
              full_name: c.full_name ?? "",
              company: c.company ?? "",
              phone: c.phone ?? "",
              email: c.email ?? "",
              notes: c.notes ?? "",
            }
          : undefined,
        nonce: Date.now(),
      });
      return;
    }

    if (result.rubricaAction === "search" && result.rubricaSearch) {
      setRubricaVoiceTrigger({
        action: "search",
        query: result.rubricaSearch,
        nonce: Date.now(),
      });
      return;
    }

    if (result.rubricaAction === "open" || rubricaTypes.includes(result.type)) {
      setRubricaVoiceTrigger({ action: "open", nonce: Date.now() });
    }
  }

  const procioneSpeak = useProcioneSpeak();

  async function applyVoiceResult(result: {
    transcript: string;
    reply: string;
    type: string;
    draft?: ProcioneDraft;
    awaitingConfirm?: boolean;
    appointments?: unknown[];
    appointment?: unknown;
    contacts?: unknown[];
    contact?: unknown;
    rubricaAction?: "open" | "add" | "search";
    rubricaSearch?: string;
    agendaAction?: "open";
    navigate?: { url: string; label: string };
    call?: { phone: string; name: string };
    whatsapp?: { phone: string; name: string; url: string };
    dataMode?: ProcioneDataMode;
    concierge?: ConciergeSearchResult;
    task?: unknown;
    tasks?: unknown[];
  }) {
    if (result.dataMode) {
      setDataMode(result.dataMode);
    }
    if (result.concierge) {
      setConciergeResult(result.concierge);
    }
    if (
      result.reply.includes("modalità presentazione") ||
      result.reply.includes("dati reali da Supabase")
    ) {
      showToast(result.reply.slice(0, 140));
    }
    setVoiceLog((prev) => [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: result.transcript,
        action_type: "query",
        created_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.reply,
        action_type: (result.type === "unknown" ? "query" : result.type) as AssistantVoiceLog["action_type"],
        created_at: new Date().toISOString(),
      },
      ...prev,
    ]);

    const newAppointments = (result.appointments ?? (result.appointment ? [result.appointment] : [])) as AssistantAppointment[];
    const newContacts = (result.contacts ?? (result.contact ? [result.contact] : [])) as AssistantContact[];

    mergeAppointments(newAppointments);
    if (newContacts.length) {
      mergeContacts(newContacts);
    }

    const newTasks = (result.tasks ?? (result.task ? [result.task] : [])) as (AssistantTask & {
      deleted?: boolean;
    })[];
    for (const t of newTasks) {
      if (t.deleted) {
        removeTaskFromList(t.id);
      } else if (t.completed) {
        removeTaskFromList(t.id);
      } else {
        mergeTasks([t]);
      }
    }

    applyRubricaVoice(result);

    if (result.agendaAction === "open") {
      setTab("agenda");
    }

    if (result.draft && result.awaitingConfirm) {
      setPendingDraft(result.draft);
      showToast("Errore salvataggio — conferma manualmente");
      setProcioneMood("active");
      return;
    }

    if (result.type === "chat") {
      if (result.reply.toLowerCase().includes("annullo")) {
        setPendingDraft(null);
      }
      if (!result.reply.includes("modalità presentazione") && !result.reply.includes("dati reali da Supabase")) {
        showToast(result.reply.slice(0, 120));
      }
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 2200);
      return;
    }

    if (result.type === "task") {
      setPendingDraft(null);
      showToast(result.reply || "Promemoria salvato!");
      setTab("agenda");
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 2000);
      return;
    }

    if (result.type === "multi") {
      setPendingDraft(null);
      showToast("Appuntamento e contatto registrati!");
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 2000);
      return;
    }

    if (result.type === "appointment") {
      setPendingDraft(null);
      showToast(result.reply || "Appuntamento registrato!");
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 2000);
      return;
    }

    if (result.type === "contact") {
      setPendingDraft(null);
      showToast(result.reply || "Contatto salvato in rubrica!");
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 2000);
      return;
    }

    if (result.type === "query" && result.rubricaAction) {
      showToast(result.reply);
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 1800);
      return;
    }

    if (result.type === "query") {
      showToast(result.reply);
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 1800);
      return;
    }

    if (result.type === "call" && result.call) {
      if (getProcioneCallConsent()) {
        window.location.href = `tel:${result.call.phone.replace(/[^\d+]/g, "")}`;
        showToast(`Chiamata a ${result.call.name}`);
      } else {
        showToast("Autorizza le chiamate nella Rubrica");
        setTab("contatti");
      }
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 1800);
      return;
    }

    if (result.type === "whatsapp" && result.whatsapp) {
      if (getProcioneWhatsAppConsent()) {
        window.open(result.whatsapp.url, "_blank", "noopener,noreferrer");
        showToast(`WhatsApp a ${result.whatsapp.name}`);
      } else {
        showToast("Autorizza WhatsApp nella Rubrica");
        setTab("contatti");
      }
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 1800);
      return;
    }

    if (result.type === "navigate" && result.navigate) {
      showToast(result.reply);
      setProcioneMood("success");
      window.setTimeout(() => {
        window.location.href = result.navigate!.url;
      }, 600);
      return;
    }

    setProcioneMood("success");
    window.setTimeout(() => setProcioneMood("idle"), 1800);
  }

  function handleSaveConciergePlace(place: ConciergePlaceResult, _index: number) {
    if (!conciergeResult || conciergeResult.kind === "train") return;
    void autoSaveVoiceDraft({
      transcript: "Salva preferito",
      reply: "",
      draft: {
        kind: "place_favorite",
        placeFavorite: {
          kind: conciergeResult.kind,
          name: place.name,
          address: place.address,
          city: conciergeResult.destination,
          mapsUrl: place.mapsUrl,
          placeId: place.placeId,
          rating: place.rating,
        },
        summary: `Memorizzo ${conciergeResult.kind === "hotel" ? "l'albergo" : "il ristorante"} «${place.name}» a ${conciergeResult.destination}.`,
      },
    });
  }

  async function performVoiceUndo() {
    const undo = voiceUndoRef.current;
    if (!undo || isVoiceUndoExpired(undo)) {
      voiceUndoRef.current = null;
      setVoiceUndo(null);
      return;
    }
    try {
      for (const id of undo.appointmentIds) {
        await deleteAppointment(id);
        setAppointments((prev) => prev.filter((a) => a.id !== id));
      }
      for (const id of undo.contactIds) {
        await deleteContact(id);
        setContacts((prev) => prev.filter((c) => c.id !== id));
      }
      for (const id of undo.taskIds) {
        await deleteTask(id);
        removeTaskFromList(id);
      }
      showToast("Salvataggio annullato");
      setProcioneMood("idle");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Annullamento fallito");
    } finally {
      voiceUndoRef.current = null;
      setVoiceUndo(null);
    }
  }

  function scheduleVoiceUndo(
    data: {
      type?: string;
      reply?: string;
      appointment?: { id?: string };
      appointments?: { id?: string }[];
      contact?: { id?: string };
      contacts?: { id?: string }[];
      task?: { id?: string };
      tasks?: { id?: string }[];
    },
    draft?: ProcioneDraft
  ) {
    const undo = buildVoiceUndoState(data, draft);
    if (!undo) return;
    voiceUndoRef.current = undo;
    setVoiceUndo(undo);
  }

  /** Opzione C: salva subito la bozza vocale, poi banner annulla 5s. */
  async function autoSaveVoiceDraft(result: {
    transcript: string;
    reply: string;
    draft: ProcioneDraft;
  }) {
    setDraftSaving(true);
    setProcioneMood("active");
    try {
      const res = await fetch("/api/procione/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ draft: result.draft }),
      });
      const data = (await res.json()) as Parameters<typeof applyVoiceResult>[0] & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Salvataggio fallito");

      setPendingDraft(null);
      await applyVoiceResult({
        transcript: result.transcript,
        reply: data.reply ?? result.reply,
        type: data.type ?? "appointment",
        appointment: data.appointment,
        appointments: data.appointments,
        contact: data.contact,
        contacts: data.contacts,
        task: data.task,
        tasks: data.tasks,
      });

      scheduleVoiceUndo(
        data as Parameters<typeof scheduleVoiceUndo>[0],
        result.draft
      );
      showToast("Salvato — annulla entro 5 secondi se non va bene");
      if (data.reply) void procioneSpeak.speak(data.reply.slice(0, 220));
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 2000);
    } catch (err) {
      setPendingDraft(result.draft);
      showToast(err instanceof Error ? err.message : "Errore salvataggio");
      setProcioneMood("idle");
    } finally {
      setDraftSaving(false);
    }
  }

  async function confirmPendingDraft() {
    if (!pendingDraft) return;
    setDraftSaving(true);
    try {
      const res = await fetch("/api/procione/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ draft: pendingDraft }),
      });
      const data = (await res.json()) as Parameters<typeof applyVoiceResult>[0] & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Conferma fallita");
      setPendingDraft(null);
      await applyVoiceResult({
        transcript: "Conferma",
        reply: data.reply,
        type: data.type,
        appointment: data.appointment,
        appointments: data.appointments,
        contact: data.contact,
        contacts: data.contacts,
        task: data.task,
        tasks: data.tasks,
      });
      scheduleVoiceUndo(
        data as Parameters<typeof scheduleVoiceUndo>[0],
        pendingDraft ?? undefined
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore salvataggio");
    } finally {
      setDraftSaving(false);
    }
  }

  const voice = useProcioneVoice({
    getPendingDraft: () => pendingDraft,
    onWake: () => {
      setProcioneMood("active");
      showToast("Ti ascolto — parla pure");
    },
    onListeningChange: (isListening) => {
      setListening(isListening);
      if (isListening) setProcioneMood("active");
    },
    onPrompt: (text) => procioneSpeak.speak(text),
    onError: (msg) => {
      setProcioneMood("idle");
      showToast(msg);
    },
    onResult: (result) => {
      if (voiceUndoRef.current && isVoiceUndoCommand(result.transcript)) {
        void performVoiceUndo();
        return;
      }

      if (result.draft && result.awaitingConfirm) {
        void autoSaveVoiceDraft({
          transcript: result.transcript,
          reply: result.reply,
          draft: result.draft,
        });
        return;
      }

      void applyVoiceResult(result);
      if (result.reply && result.type !== "unknown" && result.type !== "draft") {
        void procioneSpeak.speak(result.reply.slice(0, 220));
      }
    },
  });

  useProcioneScreenWakeLock(voice.wakeEnabled);

  useEffect(() => {
    if (voice.wakeEnabled) return;
    const unlockWake = () => {
      void voice.enableWakeWord();
    };
    window.addEventListener("pointerdown", unlockWake, { once: true, passive: true });
    return () => window.removeEventListener("pointerdown", unlockWake);
  }, [voice.wakeEnabled, voice.enableWakeWord]);

  useEffect(() => {
    if (!voiceUndo) return;
    const timer = window.setInterval(() => {
      const current = voiceUndoRef.current;
      if (!current || isVoiceUndoExpired(current)) {
        voiceUndoRef.current = null;
        setVoiceUndo(null);
        return;
      }
      setUndoTick((n) => n + 1);
    }, 500);
    return () => window.clearInterval(timer);
  }, [voiceUndo]);

  useEffect(() => {
    sessionStorage.setItem(PROCIONE_TAB_KEY, tab);
  }, [tab]);

  useEffect(() => {
    if (!voice.wakeEnabled || pushAttempted) return;
    setPushAttempted(true);
    void subscribeProcionePush()
      .then(() => setPushEnabled(true))
      .catch(() => {
        /* VAPID non configurato o permesso negato */
      });
  }, [voice.wakeEnabled, pushAttempted]);

  useEffect(() => {
    if (listening || voice.processing || procioneSpeak.speaking) return;
    setProcioneMood((prev) => (prev === "active" ? "idle" : prev));
  }, [listening, voice.processing, voice.manualListening, procioneSpeak.speaking]);

  async function readVoiceMessage(content: string) {
    setProcioneMood("active");
    try {
      await procioneSpeak.speakMessage(content);
    } finally {
      setProcioneMood("idle");
    }
  }

  useEffect(() => {
    if (!selected) return;
    setProcioneMood("active");
    void procioneSpeak.speakAppointment(selected).finally(() => {
      window.setTimeout(() => setProcioneMood("idle"), 400);
    });
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeAppointment() {
    procioneSpeak.stop();
    setSelected(null);
    setProcioneMood("idle");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "rubrica" || tabParam === "contatti") {
      setTab("contatti");
    }
    const google = params.get("google");
    if (google === "connected") {
      setGoogleConnected(true);
      showToast("Google Calendar collegato!");
      window.history.replaceState({}, "", "/procione/agenda");
    } else if (google === "error") {
      showToast("Collegamento Google fallito");
      window.history.replaceState({}, "", "/procione/agenda");
    } else if (tabParam) {
      window.history.replaceState({}, "", "/procione/agenda");
    }
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.date) return;

    setPending(true);
    try {
      const startsAt = new Date(`${form.date}T${form.startTime}:00`);
      const endsAt = new Date(`${form.date}T${form.endTime}:00`);
      const input: CreateAppointmentInput = {
        title: form.title,
        contact_name: form.contact_name || undefined,
        location: form.location || undefined,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        color: form.color,
        source: "manual",
      };
      const created = await createAppointment(input);
      setAppointments((prev) => [...prev, created as AssistantAppointment]);
      setTab("agenda");
      setForm({
        title: "",
        contact_name: "",
        location: "",
        date: "",
        startTime: "09:00",
        endTime: "10:00",
        color: "orange",
      });
      showToast("Appuntamento registrato!");
      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 2000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    setPending(true);
    try {
      await deleteAppointment(id);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      closeAppointment();
      showToast("Appuntamento eliminato");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore");
    } finally {
      setPending(false);
    }
  }

  async function handleSaveTask(
    id: string,
    patch: { title: string; description: string; due_at: string; completed: boolean }
  ) {
    setPending(true);
    try {
      const updated = (await updateTask(id, {
        title: patch.title,
        description: patch.description || null,
        due_at: patch.due_at ? new Date(patch.due_at).toISOString() : null,
        completed: patch.completed,
      })) as AssistantTask;
      if (updated.completed) {
        removeTaskFromList(updated.id);
      } else {
        mergeTasks([updated]);
      }
      setSelectedTask(null);
      showToast(patch.completed ? "Promemoria completato" : "Promemoria aggiornato");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore");
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteTask(id: string) {
    setPending(true);
    try {
      await deleteTask(id);
      removeTaskFromList(id);
      setSelectedTask(null);
      showToast("Promemoria eliminato");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col bg-[#f3f4f6] shadow-xl">
      {installVariant === "procione" && <ProcioneServiceWorkerRegister />}
      <header className="relative z-10 overflow-hidden px-4 pb-8 pt-4" style={{ backgroundColor: ORANGE }}>
        <div className="flex items-center justify-between text-white">
          <button type="button" className="rounded-full p-2 hover:bg-white/10" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">SuperMastro Admin</h1>
          <button type="button" className="rounded-full p-2 hover:bg-white/10" aria-label="Notifiche">
            <Bell className="h-5 w-5" />
          </button>
        </div>
        <div
          className="pointer-events-none absolute -bottom-6 left-0 right-0 h-12 rounded-[50%] bg-[#f3f4f6]"
          aria-hidden
        />
      </header>

      <div className="relative z-10 -mt-10 px-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/5">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-orange-50 ring-2 ring-[#F27131]/30">
            <Image src={PROCIONE_AVATAR} alt="SuperMastro Procione" fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-900">{displayName}</p>
            <p className="truncate text-xs text-gray-500">Elettricista, Edilizia, Idraulica</p>
            <span
              className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              Procione attivo
            </span>
            <span
              className={cn(
                "ml-1 mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                dataMode === "meeting_demo"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              )}
            >
              {dataMode === "meeting_demo" ? "Demo riunione" : "Dati reali"}
            </span>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
        </div>
      </div>

      {toast && (
        <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl bg-white p-3 shadow-md">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: ORANGE }}
          >
            !
          </span>
          <p className="text-sm font-medium text-gray-900">{toast}</p>
        </div>
      )}

      <div className="mt-4 flex border-b border-gray-200 bg-white px-2">
        {(
          [
            ["agenda", "Agenda"],
            ["contatti", "Rubrica"],
            ["ricevuti", "Ricevuti"],
            ["crea", "Crea"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition",
              tab === id ? "text-[#F27131]" : "text-gray-400"
            )}
          >
            {label}
            {tab === id && (
              <span className="mx-auto mt-2 block h-0.5 w-10 rounded-full" style={{ backgroundColor: ORANGE }} />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {tab === "agenda" && (
          <section>
            <ProcioneInstallBanner variant={installVariant} prominent={installVariant === "agenda"} />
            <ProcioneCalendar
              appointments={sortedAppointments}
              onSelectAppointment={setSelected}
            />
            <TaskListSection tasks={tasks} onSelect={setSelectedTask} />
          </section>
        )}

        {tab === "contatti" && (
          <ProcioneContactsPanel
            contacts={contacts}
            voiceTrigger={rubricaVoiceTrigger}
            onVoiceTriggerHandled={() => setRubricaVoiceTrigger(null)}
            onCreate={async (input) => {
              const created = (await createContact(input)) as AssistantContact;
              mergeContacts([created]);
              showToast(`${created.full_name} in rubrica`);
              return created;
            }}
            onUpdate={async (id, input) => {
              const updated = (await updateContact(id, input)) as AssistantContact;
              mergeContacts([updated]);
              showToast("Contatto aggiornato");
              return updated;
            }}
            onDelete={async (id) => {
              await deleteContact(id);
              setContacts((prev) => prev.filter((c) => c.id !== id));
              showToast("Contatto eliminato");
            }}
            onCall={(c) => showToast(`Chiamata a ${c.full_name}`)}
            onWhatsApp={(c) => showToast(`WhatsApp a ${c.full_name}`)}
          />
        )}

        {tab === "mail" && <MailPlaceholderPanel />}

        {tab === "altro" && (
          <ProcioneIntegrations
            googleConnected={googleConnected}
            pushEnabled={pushEnabled}
            wakeEnabled={voice.wakeEnabled}
            onWakeToggle={(enable) => {
              if (enable) void voice.enableWakeWord();
              else voice.disableWakeWord();
            }}
            onGoogleSync={async () => {
              const res = await fetch("/api/procione/google/sync", { method: "POST" });
              const data = (await res.json()) as { imported?: number; updated?: number; error?: string };
              if (!res.ok) throw new Error(data.error ?? "Sync fallita");
              showToast(
                `Google: ${data.imported ?? 0} importati, ${data.updated ?? 0} aggiornati`
              );
              window.location.reload();
            }}
          />
        )}

        {tab === "ricevuti" && (
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Messaggi Procione</h2>
            <div className="space-y-3">
              {voiceLog.length === 0 && (
                <p className="text-sm text-gray-500">Nessun messaggio ancora. Usa il microfono in basso.</p>
              )}
              {voiceLog.map((msg) => (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => {
                    if (msg.role === "assistant") void readVoiceMessage(msg.content);
                  }}
                  disabled={msg.role === "user" || procioneSpeak.speaking}
                  className={cn(
                    "max-w-[90%] rounded-2xl px-4 py-3 text-left text-sm shadow-sm transition",
                    msg.role === "user"
                      ? "ml-auto cursor-default bg-[#F27131] text-white"
                      : "mr-auto bg-white text-gray-800 hover:bg-orange-50 active:scale-[0.99]"
                  )}
                >
                  {msg.content}
                  {msg.role === "assistant" && (
                    <span className="mt-1 block text-[10px] font-medium text-[#F27131]">
                      Tocca per sentire Procione
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "crea" && (
          <section>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Nuovo appuntamento</h2>
            <form onSubmit={handleCreate} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
              <label className="block text-sm">
                <span className="text-gray-600">Titolo</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
                  placeholder="Revisione gara AncheCasa"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Cliente / contatto</span>
                <input
                  value={form.contact_name}
                  onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
                  placeholder="Mario Rossi"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Luogo</span>
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
                  placeholder="Via Roma 12, Milano"
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-600">Data</span>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-gray-600">Inizio</span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Fine</span>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-gray-600">Colore</span>
                <select
                  value={form.color}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      color: e.target.value as AssistantAppointment["color"],
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
                >
                  <option value="orange">Arancione</option>
                  <option value="green">Verde</option>
                  <option value="blue">Blu</option>
                  <option value="purple">Viola</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: ORANGE }}
              >
                {pending ? "Salvataggio…" : "Registra appuntamento"}
              </button>
            </form>
          </section>
        )}
      </div>

      {(procioneMood !== "idle" || procioneSpeak.speaking) && !selected && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center">
          <div
            className={cn(
              "relative h-28 w-28 overflow-hidden rounded-full border-4 bg-white shadow-2xl transition-transform",
              (procioneMood === "active" || listening || voice.manualListening || voice.processing || procioneSpeak.speaking) &&
                "scale-110 animate-pulse",
              procioneMood === "success" && "scale-100"
            )}
            style={{ borderColor: ORANGE }}
          >
            <Image src={PROCIONE_AVATAR} alt="Procione" fill className="object-cover" />
          </div>
        </div>
      )}

      {voiceUndo && !selected && !selectedTask && (
        <VoiceUndoBanner undo={voiceUndo} onUndo={() => void performVoiceUndo()} />
      )}

      {pendingDraft && !selected && (
        <ProcioneDraftCard
          draft={pendingDraft}
          pending={draftSaving}
          onConfirm={() => void confirmPendingDraft()}
          onCancel={() => {
            setPendingDraft(null);
            showToast("Bozza annullata");
          }}
        />
      )}

      {conciergeResult && !selected && (
        <div className="fixed inset-x-0 bottom-24 z-30 mx-auto max-w-md px-4">
          <ConciergeResultsCard
            result={conciergeResult}
            onDismiss={() => setConciergeResult(null)}
            onSavePlace={handleSaveConciergePlace}
          />
        </div>
      )}

      {selected && (
        <AppointmentDetailSheet
          appointment={selected}
          contacts={contacts}
          speaking={procioneSpeak.speaking}
          onClose={closeAppointment}
          onReplay={() => void procioneSpeak.speakAppointment(selected)}
          onDelete={() => handleDelete(selected.id)}
          deleting={pending}
        />
      )}

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          pending={pending}
          onClose={() => setSelectedTask(null)}
          onSave={(patch) => handleSaveTask(selectedTask.id, patch)}
          onDelete={() => handleDeleteTask(selectedTask.id)}
        />
      )}

      <div
        className={cn(
          "fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white/95 px-4 pb-6 pt-3 backdrop-blur",
          (selected || selectedTask) && "pointer-events-none opacity-40"
        )}
      >
        <div className="relative flex items-end justify-between">
          <button
            type="button"
            onClick={() => setTab("agenda")}
            className={cn(
              "flex flex-col items-center gap-1",
              tab === "agenda" ? "text-[#F27131]" : "text-gray-400"
            )}
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-[10px] font-medium">Agenda</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("contatti")}
            className={cn(
              "flex flex-col items-center gap-1",
              tab === "contatti" ? "text-[#F27131]" : "text-gray-400"
            )}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px]">Rubrica</span>
          </button>

          <button
            type="button"
            onClick={() => voice.toggleManualVoice()}
            disabled={voice.processing && !voice.manualListening}
            className={cn(
              "absolute left-1/2 -top-7 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-lg transition",
              listening || voice.manualListening ? "scale-110 animate-pulse ring-4 ring-[#F27131]/40" : "hover:scale-105"
            )}
            style={{ backgroundColor: ORANGE }}
            aria-label={voice.manualListening ? "Ferma ascolto" : "Parla con Procione"}
            aria-pressed={voice.manualListening}
          >
            <Mic className="h-7 w-7" />
          </button>

          <button
            type="button"
            onClick={() => setTab("mail")}
            className={cn(
              "flex flex-col items-center gap-1",
              tab === "mail" ? "text-[#F27131]" : "text-gray-400"
            )}
          >
            <Mail className="h-5 w-5" />
            <span className="text-[10px]">Mail</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("altro")}
            className={cn(
              "flex flex-col items-center gap-1",
              tab === "altro" ? "text-[#F27131]" : "text-gray-400"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px]">Altro</span>
          </button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1 text-center text-[10px] text-gray-400">
          <Sparkles className="h-3 w-3" />
          {voice.statusHint ??
            (voice.manualListening
              ? voice.tapToStop
                ? "Registro… tocca di nuovo il microfono per inviare"
                : "Ascolto… smetti di parlare per inviare"
              : listening || voice.processing
                ? "Elaboro il comando…"
                : voice.wakeEnabled
                  ? "Di' «we we» o «wee wee» · salvato subito · annulla 5 sec"
                  : voice.tapToStop
                    ? "Tocca il microfono · parla · tocca di nuovo per salvare"
                    : "Consenti microfono · tap sullo schermo per «we we»")}
        </p>
      </div>
    </div>
  );
}
