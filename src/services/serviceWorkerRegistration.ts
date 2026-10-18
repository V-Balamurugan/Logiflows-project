/**
 * Service Worker Registration and Lifecycle Controller
 */

export interface SWRegistrationState {
  isRegistered: boolean;
  isInstalling: boolean;
  isWaiting: boolean;
  isActive: boolean;
  hasSyncSupport: boolean;
  error?: string;
}

let registrationInstance: ServiceWorkerRegistration | null = null;
const listeners = new Set<(state: SWRegistrationState) => void>();

let currentState: SWRegistrationState = {
  isRegistered: false,
  isInstalling: false,
  isWaiting: false,
  isActive: false,
  hasSyncSupport: typeof window !== 'undefined' && 'SyncManager' in window,
};

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...currentState }));
}

export function registerServiceWorker(onSyncTrigger?: () => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      registrationInstance = registration;
      currentState = {
        ...currentState,
        isRegistered: true,
        isInstalling: !!registration.installing,
        isWaiting: !!registration.waiting,
        isActive: !!registration.active,
        hasSyncSupport: 'sync' in registration,
      };
      notifyListeners();

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          currentState = {
            ...currentState,
            isInstalling: newWorker.state === 'installing',
            isActive: newWorker.state === 'activated',
          };
          notifyListeners();
        });
      });

      // Listen for messages from SW (e.g. background sync triggers)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SERVICE_WORKER_SYNC_TRIGGER') {
          if (onSyncTrigger) {
            onSyncTrigger();
          }
        }
      });

      console.log('[ServiceWorker] Successfully registered with scope:', registration.scope);
    } catch (err) {
      console.warn('[ServiceWorker] Registration failed:', err);
      currentState = {
        ...currentState,
        isRegistered: false,
        error: String(err),
      };
      notifyListeners();
    }
  });
}

/**
 * Request background sync via standard Web API SyncManager if available
 */
export async function requestBackgroundSync(tag = 'sync-courier-outbox'): Promise<boolean> {
  if (!registrationInstance || !('sync' in registrationInstance)) {
    return false;
  }

  try {
    // @ts-expect-error SyncManager is standard in Chromium but not in all TS default libs
    await registrationInstance.sync.register(tag);
    return true;
  } catch (err) {
    console.warn('[ServiceWorker] Background sync register failed:', err);
    return false;
  }
}

export function subscribeSWState(callback: (state: SWRegistrationState) => void): () => void {
  listeners.add(callback);
  callback({ ...currentState });
  return () => {
    listeners.delete(callback);
  };
}

export function getSWRegistration(): ServiceWorkerRegistration | null {
  return registrationInstance;
}
