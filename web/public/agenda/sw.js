const AGENDA_URL = "/agenda";

async function focusOrOpenAgenda(url) {
  const target = new URL(url || AGENDA_URL, self.location.origin).href;
  const clientsList = await clients.matchAll({ type: "window", includeUncontrolled: true });

  for (const client of clientsList) {
    if (!client.url.includes("/agenda")) continue;
    await client.focus();
    if ("navigate" in client) {
      await client.navigate(target);
    }
    return;
  }

  if (clients.openWindow) {
    await clients.openWindow(target);
  }
}

self.addEventListener("push", (event) => {
  let data = {
    title: "Procione",
    body: "Promemoria appuntamento",
    url: AGENDA_URL,
    icon: "/images/supermastro-mezzobusto.png",
  };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    /* default */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.icon,
      data: { url: data.url },
      tag: "procione-reminder",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || AGENDA_URL;
  event.waitUntil(focusOrOpenAgenda(url));
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "PROCIONE_WAKE_FOCUS") return;
  event.waitUntil(focusOrOpenAgenda(event.data.url));
});
