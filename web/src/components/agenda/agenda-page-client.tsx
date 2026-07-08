"use client";

import { AgendaApp } from "@/components/procione/agenda-app";
import {
  ProcioneServiceWorkerRegister,
  subscribeProcionePush,
} from "@/components/procione/procione-integrations";
import type { ProcioneAgendaPageData } from "@/lib/procione/load-agenda-data";

type AgendaPageClientProps = ProcioneAgendaPageData;

export function AgendaPageClient(props: AgendaPageClientProps) {
  return (
    <>
      <ProcioneServiceWorkerRegister swPath="/agenda/sw.js" scope="/agenda/" />
      <AgendaApp
        displayName={props.displayName}
        email={props.email}
        googleConnected={props.googleConnected}
        initialAppointments={props.appointments}
        initialContacts={props.contacts}
        initialTasks={props.tasks}
        initialVoiceLog={props.voiceLog}
        installVariant="agenda"
      />
    </>
  );
}

export { subscribeProcionePush };
