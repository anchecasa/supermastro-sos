"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { AssistantTask } from "@/lib/procione/types";

const ORANGE = "#F27131";

type Props = {
  task: AssistantTask;
  pending?: boolean;
  onClose: () => void;
  onSave: (patch: {
    title: string;
    description: string;
    due_at: string;
    completed: boolean;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskDetailSheet({ task, pending, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueAt, setDueAt] = useState(toLocalInput(task.due_at));
  const [completed, setCompleted] = useState(task.completed);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40">
      <button type="button" className="flex-1" aria-label="Chiudi" onClick={onClose} />
      <div className="max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white px-4 pb-8 pt-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F27131]">
              Promemoria n.{task.voice_ref ?? "—"}
            </p>
            <h3 className="text-lg font-semibold text-gray-900">Dettaglio</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
            aria-label="Chiudi scheda"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-gray-600">Soggetto</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Contenuto</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Scadenza</span>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#F27131]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
              className="rounded border-gray-300"
            />
            Segna come completato
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={pending || !title.trim()}
            onClick={() =>
              void onSave({
                title: title.trim(),
                description: description.trim(),
                due_at: dueAt,
                completed,
              })
            }
            className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: ORANGE }}
          >
            {pending ? "Salvo…" : "Salva modifiche"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void onDelete()}
            className="w-full rounded-xl border border-red-200 py-3 text-sm font-medium text-red-600"
          >
            Elimina promemoria
          </button>
        </div>
      </div>
    </div>
  );
}
