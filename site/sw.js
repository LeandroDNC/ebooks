// Service worker do app Íntima Graça.
// Regras de segurança e frescor:
//  - só intercepta GET do próprio site (nunca Supabase, nunca outros domínios);
//  - nunca guarda as páginas do administrador nem respostas com erro;
//  - rede primeiro (sempre a versão mais nova); o cache só serve se estiver sem internet.
const CACHE = "intimagraca-app-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const PROIBIDO = /^\/(admin|sw\.js)/;

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || PROIBIDO.test(url.pathname)) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const guardado = await caches.match(req);
        if (guardado) return guardado;
        if (req.mode === "navigate") return caches.match(OFFLINE);
        return Response.error();
      })
  );
});
