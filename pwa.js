/*
 * UT-GEST - registro y control automático de la PWA.
 * Se mantiene separado del código de los módulos para que un error de la interfaz
 * no impida registrar el Service Worker ni aplicar el control de caché.
 */
(() => {
  'use strict';

  const appVersion = document.querySelector('meta[name="app-version"]')?.content || '1.3.0';
  const serviceWorkerUrl = new URL('./service-worker.js', document.baseURI);
  const appScopeUrl = new URL('./', document.baseURI);
  let registration = null;
  let hadControllerAtStart = Boolean('serviceWorker' in navigator && navigator.serviceWorker.controller);
  let reloadingAfterUpdate = false;

  function updateConnectionIndicator() {
    const statusText = document.querySelector('.status-text');
    const statusDot = document.querySelector('.status-dot');
    const online = navigator.onLine;

    if (statusText) statusText.textContent = online ? 'En línea' : 'Modo sin conexión';
    if (statusDot) {
      statusDot.classList.toggle('offline', !online);
      statusDot.classList.toggle('online', online);
      statusDot.setAttribute('aria-label', online ? 'Con conexión' : 'Sin conexión');
    }
    document.documentElement.dataset.connection = online ? 'online' : 'offline';
  }

  async function registerServiceWorkerAndCheckUpdates() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[UT-GEST PWA] Este navegador no admite Service Worker.');
      return;
    }
    if (!window.isSecureContext) {
      console.error('[UT-GEST PWA] No se puede registrar el Service Worker desde file://. Usa HTTPS o localhost.');
      return;
    }

    try {
      registration = await navigator.serviceWorker.register(serviceWorkerUrl.href, {
        scope: appScopeUrl.pathname,
        updateViaCache: 'none'
      });

      console.info(`[UT-GEST PWA ${appVersion}] Service Worker registrado.`, {
        scriptURL: serviceWorkerUrl.href,
        scope: registration.scope,
        manifestURL: new URL('./manifest.json', document.baseURI).href
      });

      registration.addEventListener('updatefound', () => {
        const installing = registration?.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') {
            console.info('[UT-GEST PWA] Se instaló una versión del Service Worker. La Cache API administra el shell automáticamente.');
          }
        });
      });

      // El navegador compara el contenido de service-worker.js con la versión publicada.
      // La versión de caché cambia en service-worker.js para invalidar recursos obsoletos.
      if (navigator.onLine) {
        try {
          await registration.update();
        } catch (error) {
          console.debug('[UT-GEST PWA] No se pudo comprobar la actualización inicial; se reintentará al recuperar conexión.', error);
        }
      }
    } catch (error) {
      console.error('[UT-GEST PWA] Falló el registro del Service Worker. Verifica que manifest.json y service-worker.js respondan con HTTP 200 y que la app esté en HTTPS o localhost.', error);
    }
  }

  async function checkUpdateOnReconnect() {
    updateConnectionIndicator();
    if (!navigator.onLine || !('serviceWorker' in navigator)) return;
    try {
      if (!registration) registration = await navigator.serviceWorker.getRegistration(appScopeUrl.pathname);
      if (!registration) {
        await registerServiceWorkerAndCheckUpdates();
        return;
      }
      await registration.update();
      console.info('[UT-GEST PWA] Conexión restaurada; se comprobó si existe una actualización.');
    } catch (error) {
      console.debug('[UT-GEST PWA] No se pudo comprobar la actualización al recuperar conexión.', error);
    }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      const hasController = Boolean(navigator.serviceWorker.controller);
      // No se recarga durante la primera instalación. Un cambio posterior sí aplica la versión nueva.
      if (hadControllerAtStart && hasController && !reloadingAfterUpdate) {
        reloadingAfterUpdate = true;
        window.location.reload();
        return;
      }
      hadControllerAtStart = hasController;
    });
  }

  window.addEventListener('online', checkUpdateOnReconnect);
  window.addEventListener('offline', updateConnectionIndicator);

  // Actualiza el indicador solo cuando exista el encabezado. El registro del SW
  // empieza inmediatamente en el <head>, sin esperar a scripts externos ni al evento load.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateConnectionIndicator, { once: true });
  } else {
    updateConnectionIndicator();
  }

  // El registro no depende de que script.js termine ni de que Chart.js cargue correctamente.
  registerServiceWorkerAndCheckUpdates();
})();
