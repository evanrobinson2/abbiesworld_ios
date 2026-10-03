/* Abbie Review — sparse Web Push + open Board/Dump. v=20261003f */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const bust =
    url.pathname.endsWith(".html") ||
    url.pathname === "/" ||
    url.pathname.endsWith("webmanifest") ||
    url.pathname.endsWith("sw-review.js");
  if (!bust) return;
  event.respondWith(fetch(event.request, { cache: "reload" }));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Abbie’s World";
  const options = {
    body: data.body || "Something needs review",
    tag: data.tag || "abbies-review",
    renotify: true,
    data: {
      url: data.url || "/review.html?v=20261003f",
      missionId: data.missionId || null,
      proofId: data.proofId || null,
    },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/review.html?v=20261003f";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
              return;
            } catch {
              /* fall through */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(target);
    })()
  );
});
