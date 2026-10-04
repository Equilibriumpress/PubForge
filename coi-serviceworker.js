/*
 * PubForge cross-origin isolation bridge for static hosts such as GitHub Pages.
 * On hosts that already send COOP/COEP headers, this file exits without registering.
 */
(() => {
  const isWorker = typeof window === 'undefined';

  if (isWorker) {
    self.addEventListener('install', () => self.skipWaiting());
    self.addEventListener('activate', (event) => {
      event.waitUntil(self.clients.claim());
    });
    self.addEventListener('fetch', (event) => {
      if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
        return;
      }

      event.respondWith(
        fetch(event.request).then((response) => {
          if (response.status === 0) return response;

          const headers = new Headers(response.headers);
          headers.set('Cross-Origin-Opener-Policy', 'same-origin');
          headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
          headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
          });
        }),
      );
    });
    return;
  }

  if (
    window.crossOriginIsolated ||
    !('serviceWorker' in navigator) ||
    (location.protocol !== 'https:' && location.hostname !== 'localhost')
  ) {
    return;
  }

  const currentScript = document.currentScript;
  const source =
    currentScript instanceof HTMLScriptElement
      ? currentScript.src
      : new URL('coi-serviceworker.js', document.baseURI).href;

  navigator.serviceWorker
    .register(source, { scope: './' })
    .then(async () => {
      if (navigator.serviceWorker.controller) return;
      await navigator.serviceWorker.ready;

      const key = 'pubforge-coi-reloaded';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        location.reload();
      }
    })
    .catch((error) => {
      console.warn('PubForge could not enable cross-origin isolation.', error);
    });
})();
