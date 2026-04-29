self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
});

self.addEventListener('fetch', (event) => {
  // Para modo offline bÃ¡sico
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline - ConÃ©ctate a internet para usar SpinDraw');
    })
  );
});
