/**
 * Utility functions for enabling notifications automatically
 */

/**
 * Enable push notifications automatically (without user interaction)
 * This will request permission and subscribe if not already subscribed
 */
export async function enableNotificationsAuto(): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not in browser environment' };
  }

  // Check if push notifications are supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Push notifications are not supported in this browser' };
  }

  // Check if already granted or denied
  const currentPermission = Notification.permission;
  if (currentPermission === 'denied') {
    return { success: false, error: 'Notification permission was previously denied' };
  }

  // If already granted, check subscription status
  if (currentPermission === 'granted') {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Already subscribed, verify with server
        let token: string | null = null;
        try {
          token = localStorage.getItem('accessToken');
        } catch (error) {
          // localStorage might not be available
          return { success: false, error: 'Unable to access storage' };
        }
        if (token) {
          try {
            const response = await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
                  auth: arrayBufferToBase64(subscription.getKey('auth')!),
                },
              }),
            });
            
            if (response.ok) {
              return { success: true };
            }
          } catch (error) {
            // Continue to re-subscribe if server verification fails
          }
        }
      }
    } catch (error) {
      // Continue to request permission if check fails
    }
  }

  // Request permission if not granted
  if (currentPermission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'Notification permission was denied' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to request notification permission' };
    }
  }

  // Check if VAPID key is configured
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { success: false, error: 'Push notifications are not configured' };
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // Already subscribed, send to server
      let token: string | null = null;
      try {
        token = localStorage.getItem('accessToken');
      } catch (error) {
        // localStorage might not be available
        return { success: false, error: 'Unable to access storage' };
      }
      if (token) {
        const response = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(subscription.getKey('auth')!),
            },
          }),
        });

        if (response.ok) {
          return { success: true };
        }
      }
    }

    // Subscribe to push notifications
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Send subscription to server
    let token: string | null = null;
    try {
      token = localStorage.getItem('accessToken');
    } catch (error) {
      // localStorage might not be available
      return { success: false, error: 'Unable to access storage' };
    }
    if (!token) {
      return { success: false, error: 'Not authenticated' };
    }

    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
        },
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'Failed to subscribe to push notifications' };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to enable notifications' };
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): BufferSource {
  if (!base64String) {
    return new Uint8Array(0);
  }
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

