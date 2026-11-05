// غيّر رقم النسخة عند كل تحديث علشان الكاش القديم يتمسح
const VERSION = 'mawaqitati-v4';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const isPage = req.mode === 'navigate' || req.destination === 'document';
  if (isPage) {
    // الصفحة: الشبكة أولًا علشان التحديثات توصل فورًا، والكاش لو مفيش نت
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }
  // باقي الملفات: الكاش أولًا
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});

// ---- إشعارات في الخلفية: الصفحة بتبعت المواعيد والـ SW بيطلّع الإشعار لو التطبيق مش ظاهر ----
var timers = {};
self.addEventListener('message', function (e) {
  var d = e.data || {};
  if (d.type !== 'schedule') return;
  Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
  timers = {};
  (d.items || []).forEach(function (it) {
    var ms = it.at - Date.now();
    if (ms < 0 || ms > 2147483000) return;
    timers[it.tag] = setTimeout(function () {
      self.clients.matchAll({ type: 'window' }).then(function (cs) {
        if (cs.some(function (c) { return c.visibilityState === 'visible'; })) return;
        return self.registration.showNotification(it.title, {
          body: it.body, tag: it.tag, icon: 'icon-192.png', badge: 'icon-192.png',
          vibrate: [200, 100, 200, 100, 200], requireInteraction: true, renotify: true, dir: 'rtl', lang: 'ar'
        });
      });
    }, ms);
  });
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    return cs.length ? cs[0].focus() : self.clients.openWindow('./');
  }));
});
