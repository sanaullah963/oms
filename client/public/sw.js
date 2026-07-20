// --- Push notification আসলে দেখানো ---
self.addEventListener("push", (event) => {
  let data = { title: "নতুন নোটিফিকেশন", body: "", url: "/" };
  try {
    data = event.data ? event.data.json() : data;
  } catch (err) {
    data.body = event.data ? event.data.text() : "";
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// --- নোটিফিকেশনে ক্লিক করলে অ্যাপ খোলা ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});
