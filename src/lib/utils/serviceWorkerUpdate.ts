/**
 * Service Worker Update Utilities
 * Handles checking for and applying service worker updates
 */

export interface ServiceWorkerUpdateState {
  hasUpdate: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * Check if a new service worker is available
 */
export async function checkForServiceWorkerUpdate(): Promise<ServiceWorkerUpdateState> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { hasUpdate: false, isUpdating: false, registration: null };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if there's a waiting service worker (new version available)
    if (registration.waiting) {
      return {
        hasUpdate: true,
        isUpdating: false,
        registration,
      };
    }

    // Check if there's an installing service worker
    if (registration.installing) {
      return {
        hasUpdate: false,
        isUpdating: true,
        registration,
      };
    }

    // Try to update the service worker
    await registration.update();
    
    // Check again after update attempt
    if (registration.waiting) {
      return {
        hasUpdate: true,
        isUpdating: false,
        registration,
      };
    }

    return {
      hasUpdate: false,
      isUpdating: false,
      registration,
    };
  } catch (error) {
    console.error('Error checking for service worker update:', error);
    return { hasUpdate: false, isUpdating: false, registration: null };
  }
}

/**
 * Force update to the new service worker
 * This will skip waiting and activate the new service worker immediately
 */
export async function forceServiceWorkerUpdate(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration.waiting) {
      // Send a message to the waiting service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page after a short delay to ensure the new service worker is active
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error forcing service worker update:', error);
    return false;
  }
}

/**
 * Register service worker with update checking
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      updateViaCache: 'none', // Always check for updates
    });

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is installed and waiting
            // You can dispatch a custom event here to notify the app
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });

    // Check for updates periodically (every 60 seconds)
    setInterval(() => {
      registration.update();
    }, 60000);

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

