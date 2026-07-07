import { createClient } from "@/lib/supabase/server";
import { AgendaApp } from "@/components/procione/agenda-app";
import type {
  AssistantAppointment,
  AssistantContact,
  AssistantTask,
  AssistantVoiceLog,
} from "@/lib/procione/types";

export default async function ProcioneAgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user!.id)
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
      .eq("owner_id", user!.id)
      .gte("starts_at", startOfDay.toISOString())
      .lte("starts_at", endRange.toISOString())
      .order("starts_at", { ascending: true }),
    supabase
      .from("assistant_contacts")
      .select("*")
      .eq("owner_id", user!.id)
      .order("full_name", { ascending: true })
      .limit(100),
    supabase
      .from("assistant_tasks")
      .select("*")
      .eq("owner_id", user!.id)
      .eq("completed", false)
      .eq("task_type", "reminder")
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("assistant_voice_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("assistant_google_tokens")
      .select("owner_id")
      .eq("owner_id", user!.id)
      .maybeSingle(),
  ]);

  return (
    <AgendaApp
      displayName={profile?.display_name ?? "Fernando"}
      email={user!.email ?? ""}
      googleConnected={Boolean(googleTokens)}
      initialAppointments={(appointments ?? []) as AssistantAppointment[]}
      initialContacts={(contacts ?? []) as AssistantContact[]}
      initialTasks={(tasks ?? []) as AssistantTask[]}
      initialVoiceLog={(voiceLog ?? []) as AssistantVoiceLog[]}
    />
  );
}
