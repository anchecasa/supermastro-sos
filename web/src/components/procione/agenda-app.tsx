"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  Home,
  List,
  Mic,
  Sparkles,
  X,
} from "lucide-react";
import type {
  AssistantAppointment,
  AssistantContact,
  AssistantVoiceLog,
  CreateAppointmentInput,
} from "@/lib/procione/types";
import { createAppointment, deleteAppointment } from "@/app/procione/actions";
import {
  ProcioneIntegrations,
  ProcioneServiceWorkerRegister,
  subscribeProcionePush,
  unsubscribeProcionePush,
} from "@/components/procione/procione-integrations";
import { useProcioneVoice } from "@/components/procione/use-procione-voice";
import { cn } from "@/lib/utils";

const PROCIONE_AVATAR = "/images/supermastro-mezzobusto.png";
const ORANGE = "#F27131";

const COLOR_BAR: Record<AssistantAppointment["color"], string> = {
  orange: "bg-[#F27131]",
  green: "bg-emerald-500",
  blue: "bg-sky-500",
  purple: "bg-violet-500",
};

type TabId = "agenda" | "ricevuti" | "crea";

type AgendaAppProps = {
  displayName: string;
  email: string;
  googleConnected: boolean;
  initialAppointments: AssistantAppointment[];
  initialContacts: AssistantContact[];
  initialVoiceLog: AssistantVoiceLog[];
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function AgendaApp({
  displayName,
  email,
  googleConnected: initialGoogleConnected,
  initialAppointments,
  initialContacts,
  initialVoiceLog,
}: AgendaAppProps) {
  const [tab, setTab] = useState<TabId>("agenda");
  const [appointments, setAppointments] = useState(initialAppointments);
  const [voiceLog, setVoiceLog] = useState(initialVoiceLog);
  const [googleConnected, setGoogleConnected] = useState(initialGoogleConnected);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [selected, setSelected] = useState<AssistantAppointment | null>(null);
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

  const sortedAppointments = useMemo(
    () =>
      [...appointments]
        .filter((a) => a.status === "scheduled")
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [appointments]
  );

  const todayAppointments = useMemo(() => {
    const today = new Date();
    return sortedAppointments.filter((a) => {
      const d = new Date(a.starts_at);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    });
  }, [sortedAppointments]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  const voice = useProcioneVoice({
    onWake: () => setProcioneMood("active"),
    onListeningChange: setListening,
    onError: (msg) => {
      setProcioneMood("idle");
      showToast(msg);
    },
    onResult: (result) => {
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
          action_type: result.type as AssistantVoiceLog["action_type"],
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);

      if (result.type === "appointment") {
        showToast("Appuntamento registrato!");
        setProcioneMood("success");
        window.location.reload();
        return;
      }

      setProcioneMood("success");
      window.setTimeout(() => setProcioneMood("idle"), 1800);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (google === "connected") {
      setGoogleConnected(true);
      showToast("Google Calendar collegato!");
      window.history.replaceState({}, "", "/procione/agenda");
    } else if (google === "error") {
      showToast("Collegamento Google fallito");
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
      setSelected(null);
      showToast("Appuntamento eliminato");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Errore");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col bg-[#f3f4f6] shadow-xl">
      <ProcioneServiceWorkerRegister />
      <header className="relative z-10 px-4 pb-3 pt-4" style={{ backgroundColor: ORANGE }}>
        <div className="flex items-center justify-between text-white">
          <h1 className="text-lg font-semibold tracking-tight">SuperMastro Admin</h1>
          <button type="button" className="rounded-full p-2 hover:bg-white/10" aria-label="Notifiche">
            <Bell className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="relative z-10 -mt-1 px-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-md">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-orange-50">
            <Image src={PROCIONE_AVATAR} alt="SuperMastro Procione" fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-900">{displayName}</p>
            <p className="truncate text-xs text-gray-500">{email}</p>
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: ORANGE }}
            >
              Procione attivo
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
            const data = (await res.json()) as { imported?: number; error?: string };
            if (!res.ok) throw new Error(data.error ?? "Sync fallita");
            showToast(`Importati ${data.imported ?? 0} eventi da Google`);
            window.location.reload();
          }}
          onPushToggle={async (enable) => {
            if (enable) {
              await subscribeProcionePush();
              setPushEnabled(true);
              showToast("Promemoria push attivi (15 min prima)");
            } else {
              await unsubscribeProcionePush();
              setPushEnabled(false);
              showToast("Push disattivate");
            }
          }}
        />

        {tab === "agenda" && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-1 text-base font-semibold text-gray-900">
                Agenda
                <ChevronRight className="h-4 w-4 rotate-90 text-gray-400" />
              </h2>
              <span className="text-xs text-gray-400">{todayAppointments.length} oggi</span>
            </div>

            {sortedAppointments.length === 0 ? (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <Image
                  src={PROCIONE_AVATAR}
                  alt="Procione"
                  width={80}
                  height={80}
                  className="mx-auto rounded-full"
                />
                <p className="mt-3 text-sm text-gray-600">
                  Nessun appuntamento. Di&apos; &quot;Ehi Procione, segna riunione domani alle 10&quot; o usa la tab
                  Crea.
                </p>
              </div>
            ) : (
              <div className="relative pl-14">
                <div
                  className="absolute bottom-2 left-[1.35rem] top-2 w-0.5 rounded-full"
                  style={{ backgroundColor: ORANGE }}
                />
                {sortedAppointments.map((appt) => (
                  <div key={appt.id} className="relative mb-4">
                    <span className="absolute -left-14 top-3 w-12 text-right text-xs font-medium text-gray-500">
                      {formatTime(appt.starts_at)}
                    </span>
                    <span
                      className="absolute -left-[1.65rem] top-3.5 h-3 w-3 rounded-full border-2 border-white shadow"
                      style={{ backgroundColor: ORANGE }}
                    />
                    <button
                      type="button"
                      onClick={() => setSelected(appt)}
                      className={cn(
                        "w-full rounded-2xl bg-white p-4 text-left shadow-sm transition hover:shadow-md",
                        selected?.id === appt.id && "ring-2 ring-[#F27131]/40"
                      )}
                    >
                      <div className="flex gap-3">
                        <span className={cn("mt-1 w-1 shrink-0 rounded-full", COLOR_BAR[appt.color])} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-gray-900">{appt.title}</p>
                            <span className="shrink-0 text-[10px] font-medium text-[#F27131]">
                              {formatShortDate(appt.starts_at)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatTime(appt.starts_at)} – {formatTime(appt.ends_at)}
                            {appt.contact_name ? ` · ${appt.contact_name}` : ""}
                          </p>
                          {appt.location && <p className="mt-1 text-xs text-gray-400">{appt.location}</p>}
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300" />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "ricevuti" && (
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Messaggi Procione</h2>
            <div className="space-y-3">
              {voiceLog.length === 0 && (
                <p className="text-sm text-gray-500">Nessun messaggio ancora. Usa il microfono in basso.</p>
              )}
              {voiceLog.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[90%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                    msg.role === "user" ? "ml-auto bg-[#F27131] text-white" : "mr-auto bg-white text-gray-800"
                  )}
                >
                  {msg.content}
                </div>
              ))}
            </div>

            {initialContacts.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Contatti salvati</h3>
                <div className="space-y-2">
                  {initialContacts.map((c) => (
                    <div key={c.id} className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="font-medium">{c.full_name}</p>
                      {c.company && <p className="text-xs text-gray-500">{c.company}</p>}
                      {c.phone && <p className="text-xs text-[#F27131]">{c.phone}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {procioneMood !== "idle" && !selected && (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center">
          <div
            className={cn(
              "relative h-28 w-28 overflow-hidden rounded-full border-4 bg-white shadow-2xl transition-transform",
              procioneMood === "active" && "scale-110 animate-pulse",
              procioneMood === "success" && "scale-100"
            )}
            style={{ borderColor: ORANGE }}
          >
            <Image src={PROCIONE_AVATAR} alt="Procione" fill className="object-cover" />
          </div>
        </div>
      )}

      {selected && (
        <div className="absolute inset-0 z-30 flex items-start justify-center bg-black/40 px-4 pt-24 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto -mt-16 mb-3 flex justify-center">
              <div
                className="relative h-24 w-24 overflow-hidden rounded-full border-4 bg-white shadow-lg"
                style={{ borderColor: ORANGE }}
              >
                <Image src={PROCIONE_AVATAR} alt="Procione" fill className="object-cover" />
              </div>
            </div>

            <p className="text-center text-lg font-semibold text-gray-900">
              {formatTime(selected.starts_at)} — {selected.title}
            </p>
            <p className="mt-2 text-center text-sm text-gray-500">{formatDate(selected.starts_at)}</p>
            {selected.contact_name && (
              <p className="mt-2 text-center text-sm text-gray-600">Con {selected.contact_name}</p>
            )}
            {selected.location && <p className="mt-1 text-center text-sm text-gray-500">{selected.location}</p>}
            {selected.description && (
              <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">{selected.description}</p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700"
              >
                Chiudi
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDelete(selected.id)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: ORANGE }}
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white/95 px-6 pb-6 pt-3 backdrop-blur">
        <div className="relative flex items-end justify-between">
          <button type="button" className="flex flex-col items-center gap-1 text-gray-400">
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setProcioneMood("active");
              void voice.startManualVoice();
            }}
            disabled={listening || voice.processing}
            className={cn(
              "absolute left-1/2 -top-7 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-lg transition",
              listening ? "scale-110 animate-pulse" : "hover:scale-105"
            )}
            style={{ backgroundColor: ORANGE }}
            aria-label="Ehi Procione"
          >
            <Mic className="h-7 w-7" />
          </button>

          <button type="button" className="flex flex-col items-center gap-1 text-[#F27131]">
            <List className="h-5 w-5" />
            <span className="text-[10px] font-medium">Agenda</span>
          </button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1 text-center text-[10px] text-gray-400">
          <Sparkles className="h-3 w-3" />
          {listening ? "Ascolto… parla ora" : "Ehi Procione — comando vocale"}
        </p>
      </div>
    </div>
  );
}
