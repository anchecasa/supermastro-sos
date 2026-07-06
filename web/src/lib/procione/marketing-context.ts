import type { SupabaseClient } from "@supabase/supabase-js";

export async function buildMarketingFollowUp(
  supabase: SupabaseClient,
  userId: string,
  demoMode: boolean
): Promise<string | null> {
  if (demoMode) return null;

  const now = new Date().toISOString();
  const { data: tasks } = await supabase
    .from("assistant_tasks")
    .select("title, due_at")
    .eq("owner_id", userId)
    .eq("task_type", "marketing")
    .eq("completed", false)
    .gte("due_at", now)
    .order("due_at")
    .limit(3);

  if (!tasks?.length) return null;

  const next = tasks[0]!;
  const when = next.due_at
    ? new Intl.DateTimeFormat("it-IT", {
        weekday: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(next.due_at))
    : "presto";

  if (tasks.length === 1) {
    return `Hai la campagna «${next.title}» in attesa per ${when}. Che vuoi fa?`;
  }

  return `Hai ${tasks.length} campagne in coda; la prossima «${next.title}» per ${when}. Che vuoi fa? Campagna marketing?`;
}
