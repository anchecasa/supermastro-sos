import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssistantTask, CreateTaskInput } from "@/lib/procione/types";

export async function nextTaskVoiceRef(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("assistant_tasks")
    .select("voice_ref")
    .eq("owner_id", userId)
    .not("voice_ref", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  let max = 0;
  for (const row of data ?? []) {
    const n = Number.parseInt(String(row.voice_ref), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

export async function createAssistantTask(
  supabase: SupabaseClient,
  userId: string,
  input: CreateTaskInput
): Promise<AssistantTask> {
  const voiceRef = input.voice_ref ?? (await nextTaskVoiceRef(supabase, userId));

  const { data, error } = await supabase
    .from("assistant_tasks")
    .insert({
      owner_id: userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      due_at: input.due_at ?? null,
      task_type: input.task_type ?? "reminder",
      voice_ref: voiceRef,
      completed: false,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as AssistantTask;
}

export async function loadOpenTasks(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<AssistantTask[]> {
  const { data, error } = await supabase
    .from("assistant_tasks")
    .select("*")
    .eq("owner_id", userId)
    .eq("completed", false)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as AssistantTask[];
}

function normalizeHint(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

export function taskMatchesHint(task: AssistantTask, hint: string): boolean {
  const h = normalizeHint(hint);
  if (!h) return false;
  if (task.voice_ref && h === task.voice_ref) return true;
  if (task.voice_ref && h === `numero ${task.voice_ref}`) return true;
  if (task.voice_ref && h === `promemoria ${task.voice_ref}`) return true;
  const title = normalizeHint(task.title);
  const desc = normalizeHint(task.description ?? "");
  return title.includes(h) || h.includes(title) || (desc.length > 2 && desc.includes(h));
}

export async function findTaskByHint(
  supabase: SupabaseClient,
  userId: string,
  hint: string
): Promise<AssistantTask | null> {
  const refMatch = hint.match(/(?:numero|promemoria|task|n\.?\s*)\s*(\d+)/i);
  if (refMatch) {
    const { data } = await supabase
      .from("assistant_tasks")
      .select("*")
      .eq("owner_id", userId)
      .eq("voice_ref", refMatch[1]!)
      .eq("completed", false)
      .maybeSingle();
    if (data) return data as AssistantTask;
  }

  const tasks = await loadOpenTasks(supabase, userId, 50);
  const matches = tasks.filter((t) => taskMatchesHint(t, hint));
  return matches[0] ?? null;
}

export async function updateAssistantTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  patch: Partial<Pick<AssistantTask, "title" | "description" | "due_at" | "completed">>
): Promise<AssistantTask> {
  const { data, error } = await supabase
    .from("assistant_tasks")
    .update(patch)
    .eq("id", taskId)
    .eq("owner_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as AssistantTask;
}

export async function deleteAssistantTask(
  supabase: SupabaseClient,
  userId: string,
  taskId: string
): Promise<void> {
  const { error } = await supabase
    .from("assistant_tasks")
    .delete()
    .eq("id", taskId)
    .eq("owner_id", userId);

  if (error) throw new Error(error.message);
}

export function formatTaskWhen(dueAt: string | null): string {
  if (!dueAt) return "senza scadenza";
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dueAt));
}

export function formatTaskListReply(tasks: AssistantTask[]): string {
  if (!tasks.length) {
    return "Non hai promemoria aperti. Di' «memorizza da fare» seguito dal testo.";
  }

  const lines = tasks.slice(0, 8).map((t) => {
    const ref = t.voice_ref ? ` n.${t.voice_ref}` : "";
    const when = t.due_at
      ? new Intl.DateTimeFormat("it-IT", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(t.due_at))
      : "senza data";
    const body = t.description ? ` — ${t.description.slice(0, 60)}` : "";
    return `${ref} «${t.title}»${body}, ${when}`;
  });

  const extra = tasks.length > 8 ? ` …e altri ${tasks.length - 8}.` : "";
  return `Hai ${tasks.length} promemori${tasks.length === 1 ? "o" : "a"}: ${lines.join("; ")}.${extra}`;
}

export function buildTaskDraftSummary(input: CreateTaskInput, voiceRefPreview?: string): string {
  const ref = voiceRefPreview ? ` (riferimento ${voiceRefPreview})` : "";
  const when = input.due_at ? formatTaskWhen(input.due_at) : "senza scadenza";
  let s = `Promemoria «${input.title}»${ref}, ${when}`;
  if (input.description) s += `. Dettaglio: ${input.description}`;
  return `${s}.`;
}
