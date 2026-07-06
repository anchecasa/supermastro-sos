self.addEventListener("push", (event) => {
  let data = { title: "Procione", body: "Promemoria appuntamento", url: "/procione/agenda", icon: "/images/supermastro-mezzobusto.png" };
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
  const url = event.notification.data?.url || "/procione/agenda";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
