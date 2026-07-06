"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookUser,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { AssistantContact } from "@/lib/procione/types";
import { cn } from "@/lib/utils";

const CALL_CONSENT_KEY = "procione-call-consent";
const WHATSAPP_CONSENT_KEY = "procione-whatsapp-consent";

export function getProcioneCallConsent(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CALL_CONSENT_KEY) === "1";
}

export function setProcioneCallConsent(value: boolean) {
  window.localStorage.setItem(CALL_CONSENT_KEY, value ? "1" : "0");
}

export function getProcioneWhatsAppConsent(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(WHATSAPP_CONSENT_KEY) === "1";
}

export function setProcioneWhatsAppConsent(value: boolean) {
  window.localStorage.setItem(WHATSAPP_CONSENT_KEY, value ? "1" : "0");
}

type ContactForm = {
  full_name: string;
  company: string;
  phone: string;
  email: string;
  notes: string;
};

const EMPTY_FORM: ContactForm = {
  full_name: "",
  company: "",
  phone: "",
  email: "",
  notes: "",
};

export type RubricaVoiceTrigger = {
  action: "open" | "add" | "search";
  query?: string;
  prefill?: Partial<ContactForm>;
  nonce: number;
};

type ProcioneContactsPanelProps = {
  contacts: AssistantContact[];
  onCreate: (input: ContactForm) => Promise<AssistantContact>;
  onUpdate: (id: string, input: ContactForm) => Promise<AssistantContact>;
  onDelete: (id: string) => Promise<void>;
  voiceTrigger?: RubricaVoiceTrigger | null;
  onVoiceTriggerHandled?: () => void;
  onCall?: (contact: AssistantContact) => void;
  onWhatsApp?: (contact: AssistantContact) => void;
};

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function whatsAppUrl(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

function contactInitial(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function ProcioneContactsPanel({
  contacts,
  onCreate,
  onUpdate,
  onDelete,
  voiceTrigger,
  onVoiceTriggerHandled,
  onCall,
  onWhatsApp,
}: ProcioneContactsPanelProps) {
  const [callAllowed, setCallAllowed] = useState(false);
  const [whatsappAllowed, setWhatsappAllowed] = useState(false);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setCallAllowed(getProcioneCallConsent());
    setWhatsappAllowed(getProcioneWhatsAppConsent());
  }, []);

  useEffect(() => {
    if (!voiceTrigger) return;
    if (voiceTrigger.action === "search" && voiceTrigger.query) {
      setQuery(voiceTrigger.query);
    }
    if (voiceTrigger.action === "add") {
      setEditingId(null);
      setForm({ ...EMPTY_FORM, ...voiceTrigger.prefill });
      setShowForm(true);
    }
    onVoiceTriggerHandled?.();
  }, [voiceTrigger?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...contacts].sort((a, b) => a.full_name.localeCompare(b.full_name, "it"));
    if (!q) return list;
    return list.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [contacts, query]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(c: AssistantContact) {
    setEditingId(c.id);
    setForm({
      full_name: c.full_name,
      company: c.company ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    setPending(true);
    try {
      if (editingId) {
        await onUpdate(editingId, form);
      } else {
        await onCreate(form);
      }
      closeForm();
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Eliminare ${name} dalla rubrica?`)) return;
    setPending(true);
    try {
      await onDelete(id);
      if (editingId === id) closeForm();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-[#F27131]">
          <BookUser className="h-5 w-5" />
          Rubrica
        </h2>
        <span className="text-xs text-gray-400">{contacts.length} contatti</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca nome, azienda, telefono…"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#F27131]"
        />
      </div>

      <p className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
        Comandi vocali: «we we, apri rubrica» · «memorizza contatto Mario 333…» · «chiama Quintini» ·
        «aggiungi contatto»
      </p>

      {!showForm ? (
        <button
          type="button"
          onClick={openCreate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F27131] py-3 text-sm font-semibold text-white shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Aggiungi contatto
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">
              {editingId ? "Modifica contatto" : "Nuovo contatto"}
            </p>
            <button type="button" onClick={closeForm} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            required
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="Nome e cognome *"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
          />
          <input
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            placeholder="Azienda"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="Telefono"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="Email"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
          />
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Note"
            rows={2}
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-[#F27131] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Salvataggio…" : editingId ? "Salva modifiche" : "Salva in rubrica"}
            </button>
            {editingId && (
              <button
                type="button"
                disabled={pending}
                onClick={() => void handleDelete(editingId, form.full_name)}
                className="rounded-xl border border-red-200 px-3 py-2.5 text-red-600"
                aria-label="Elimina"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-3">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#F27131]" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">Chiamate e WhatsApp</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600">
              Autorizza per chiamare o scrivere dalla rubrica, o di&apos; «we we, chiama Mario».
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !callAllowed;
                  setProcioneCallConsent(next);
                  setCallAllowed(next);
                }}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold transition",
                  callAllowed ? "bg-[#F27131] text-white" : "border border-[#F27131]/30 bg-white text-[#F27131]"
                )}
              >
                {callAllowed ? "Chiamate OK" : "Autorizza chiamate"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !whatsappAllowed;
                  setProcioneWhatsAppConsent(next);
                  setWhatsappAllowed(next);
                }}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-semibold transition",
                  whatsappAllowed ? "bg-emerald-600 text-white" : "border border-emerald-200 bg-white text-emerald-700"
                )}
              >
                {whatsappAllowed ? "WhatsApp OK" : "Autorizza WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <User className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm text-gray-600">
            {query ? "Nessun risultato." : "Rubrica vuota. Aggiungi un contatto o di' «we we, memorizza contatto Mario 333…»."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-bold text-[#F27131]">
                  {contactInitial(c.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{c.full_name}</p>
                  {c.company && <p className="text-xs text-gray-500">{c.company}</p>}
                  {c.phone && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[#F27131]">
                      <Phone className="h-3 w-3" />
                      {c.phone}
                    </p>
                  )}
                  {c.email && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-gray-500">
                      <Mail className="h-3 w-3 shrink-0" />
                      {c.email}
                    </p>
                  )}
                  {c.notes && <p className="mt-1 text-xs text-gray-400 line-clamp-2">{c.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-[#F27131]"
                  aria-label={`Modifica ${c.full_name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                {c.phone && callAllowed ? (
                  <a
                    href={`tel:${normalizePhone(c.phone)}`}
                    onClick={() => onCall?.(c)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#F27131] py-2 text-xs font-medium text-white"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Chiama
                  </a>
                ) : null}
                {c.phone && whatsappAllowed ? (
                  <a
                    href={whatsAppUrl(c.phone, `Ciao ${c.full_name.split(" ")[0]}!`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onWhatsApp?.(c)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-medium text-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                ) : null}
                {!c.phone && (
                  <span className="text-xs text-gray-400">Aggiungi un numero per chiamare</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
