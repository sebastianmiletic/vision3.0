const SW_READY_TIMEOUT_MS = 3500;
let serviceWorkerRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function waitForServiceWorkerController(timeoutMs: number): Promise<void> {
  if (navigator.serviceWorker.controller) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      resolve();
    }, timeoutMs);

    const onControllerChange = () => {
      window.clearTimeout(timeoutId);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      resolve();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  });
}

export function registerVisionServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (serviceWorkerRegistrationPromise) {
    return serviceWorkerRegistrationPromise;
  }

  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(null);
  }

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocalhost && window.location.protocol !== 'https:') {
    return Promise.resolve(null);
  }

  serviceWorkerRegistrationPromise = navigator.serviceWorker.register('/sw.js')
    .then(async (registration) => {
      await Promise.race([
        waitForServiceWorkerController(SW_READY_TIMEOUT_MS),
        navigator.serviceWorker.ready.then(() => undefined).catch(() => undefined),
      ]);
      return registration;
    })
    .catch((error) => {
      console.warn('Service worker registration failed', error);
      return null;
    });

  return serviceWorkerRegistrationPromise;
}
