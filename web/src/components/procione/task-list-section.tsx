"use client";

import { ChevronRight, ListTodo } from "lucide-react";
import type { AssistantTask } from "@/lib/procione/types";

const ORANGE = "#F27131";

function formatDue(dueAt: string | null): string {
  if (!dueAt) return "Senza scadenza";
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dueAt));
}

type Props = {
  tasks: AssistantTask[];
  onSelect: (task: AssistantTask) => void;
};

export function TaskListSection({ tasks, onSelect }: Props) {
  const open = tasks.filter((t) => !t.completed);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <ListTodo className="h-4 w-4 text-[#F27131]" />
        <h2 className="text-base font-semibold text-gray-900">Cose da fare</h2>
        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-[#F27131]">
          {open.length}
        </span>
      </div>

      {open.length === 0 ? (
        <p className="rounded-2xl bg-white p-4 text-sm text-gray-500 shadow-sm">
          Nessun promemoria. Di&apos; «memorizza da fare» seguito dal testo, oppure «promemoria: …».
        </p>
      ) : (
        <ul className="space-y-2">
          {open.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                onClick={() => onSelect(task)}
                className="flex w-full items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-black/5 transition hover:bg-orange-50/40"
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: ORANGE }}
                >
                  {task.voice_ref ?? "·"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{task.title}</p>
                  {task.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{task.description}</p>
                  )}
                  <p className="mt-1 text-[11px] font-medium text-[#F27131]">{formatDue(task.due_at)}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-300" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[11px] text-gray-400">
        Richiama con il numero: «elimina promemoria 2», «modifica promemoria 1 sposta a domani».
      </p>
    </section>
  );
}
