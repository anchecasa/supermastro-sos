import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AssistantAppointment,
  AssistantContact,
  AssistantTask,
  AssistantVoiceLog,
} from "@/lib/procione/types";

export type ProcioneAgendaPageData = {
  displayName: string;
  email: string;
  googleConnected: boolean;
  appointments: AssistantAppointment[];
  contacts: AssistantContact[];
  tasks: AssistantTask[];
  voiceLog: AssistantVoiceLog[];
};

export async function loadProcioneAgendaData(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<ProcioneAgendaPageData> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  startOfDay.setDate(startOfDay.getDate() - 30);
  const endRange = new Date();
  endRange.setDate(endRange.getDate() + 90);

  const [{ data: appointments }, { data: contacts }, { data: tasks }, { data: voiceLog }, { data: googleTokens }] =
    await Promise.all([
      supabase
        .from("assistant_appointments")
        .select("*")
        .eq("owner_id", userId)
        .gte("starts_at", startOfDay.toISOString())
        .lte("starts_at", endRange.toISOString())
        .order("starts_at", { ascending: true }),
      supabase
        .from("assistant_contacts")
        .select("*")
        .eq("owner_id", userId)
        .order("full_name", { ascending: true })
        .limit(100),
      supabase
        .from("assistant_tasks")
        .select("*")
        .eq("owner_id", userId)
        .eq("completed", false)
        .eq("task_type", "reminder")
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("assistant_voice_log")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("assistant_google_tokens")
        .select("owner_id")
        .eq("owner_id", userId)
        .maybeSingle(),
    ]);

  return {
    displayName: profile?.display_name ?? "Fernando",
    email,
    googleConnected: Boolean(googleTokens),
    appointments: (appointments ?? []) as AssistantAppointment[],
    contacts: (contacts ?? []) as AssistantContact[],
    tasks: (tasks ?? []) as AssistantTask[],
    voiceLog: (voiceLog ?? []) as AssistantVoiceLog[],
  };
}
