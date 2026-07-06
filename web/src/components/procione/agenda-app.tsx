"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Home,
  Menu,
  Mic,
  MoreHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { AgendaTimelineCard } from "@/components/procione/agenda-timeline-card";
import { AppointmentDetailSheet } from "@/components/procione/appointment-detail-sheet";
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

type TabId = "agenda" | "ricevuti" | "crea";

type AgendaAppProps = {
  displayName: string;
  email: string;
  googleConnected: boolean;
  initialAppointments: AssistantAppointment[];
  initialContacts: AssistantContact[];
  initialVoiceLog: AssistantVoiceLog[];
};

function formatAgendaDayLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
  }).format(date);
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1 text-base font-bold text-[#F27131]">
                Agenda
                <ChevronDown className="h-4 w-4 text-[#F27131]" />
              </h2>
              <button
                type="button"
                className="flex items-center gap-1 text-xs font-medium text-[#F27131]"
              >
                {formatAgendaDayLabel(new Date())}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-4 border-b border-gray-100 pb-2 text-xs">
              <button type="button" className="font-semibold text-[#F27131]">
                Tutti
              </button>
              <button type="button" className="text-gray-400">
                In sospeso
              </button>
              <span className="ml-auto text-gray-400">{todayAppointments.length} oggi</span>
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
                  <AgendaTimelineCard
                    key={appt.id}
                    appointment={appt}
                    selected={selected?.id === appt.id}
                    onSelect={() => setSelected(appt)}
                  />
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
        <AppointmentDetailSheet
          appointment={selected}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected.id)}
          deleting={pending}
        />
      )}

      <div
        className={cn(
          "fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white/95 px-4 pb-6 pt-3 backdrop-blur",
          selected && "pointer-events-none opacity-40"
        )}
      >
        <div className="relative flex items-end justify-between">
          <button type="button" className="flex flex-col items-center gap-1 text-[#F27131]">
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("agenda")}
            className="flex flex-col items-center gap-1 text-gray-400"
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-[10px]">Agenda</span>
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

          <button type="button" className="flex flex-col items-center gap-1 text-gray-400">
            <Users className="h-5 w-5" />
            <span className="text-[10px]">Fornitore</span>
          </button>

          <button type="button" className="flex flex-col items-center gap-1 text-gray-400">
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px]">Altro</span>
          </button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1 text-center text-[10px] text-gray-400">
          <Sparkles className="h-3 w-3" />
          {voice.statusHint ??
            (listening || voice.processing
              ? "Ascolto… parla ora"
              : voice.wakeEnabled
                ? "Di' «Ehi Procione, segna riunione domani alle 10»"
                : "Chrome/Edge · clicca microfono o attiva Ehi Procione")}
        </p>
      </div>
    </div>
  );
}
