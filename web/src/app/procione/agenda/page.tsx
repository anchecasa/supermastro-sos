import { createClient } from "@/lib/supabase/server";
import { AgendaApp } from "@/components/procione/agenda-app";
import { loadProcioneAgendaData } from "@/lib/procione/load-agenda-data";

export default async function ProcioneAgendaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await loadProcioneAgendaData(supabase, user!.id, user!.email ?? "");

  return (
    <AgendaApp
      displayName={data.displayName}
      email={data.email}
      googleConnected={data.googleConnected}
      initialAppointments={data.appointments}
      initialContacts={data.contacts}
      initialTasks={data.tasks}
      initialVoiceLog={data.voiceLog}
    />
  );
}
