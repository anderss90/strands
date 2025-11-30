'use client';

import { useState, useEffect } from 'react';

interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: false,
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // Safely check for Notification API
    let permission: NotificationPermission = 'default';
    try {
      if (typeof Notification !== 'undefined') {
        permission = Notification.permission;
      }
    } catch (error) {
      console.warn('Notification API not available:', error);
    }

    // Check for service worker and push manager support
    const isSupported = 
      'serviceWorker' in navigator && 
      'PushManager' in window &&
      typeof Notification !== 'undefined';

    setState(prev => ({
      ...prev,
      isSupported,
      permission,
    }));

    // Check subscription status
    if (isSupported) {
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      // Check if service worker is available
      if (!('serviceWorker' in navigator)) {
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Check if pushManager is available
      if (!registration.pushManager) {
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
      }));
    } catch (error) {
      console.error('Error checking subscription status:', error);
      // Don't crash - just set subscribed to false
      setState(prev => ({
        ...prev,
        isSubscribed: false,
      }));
    }
  };

  const enableNotifications = async (): Promise<{ success: boolean; error?: string }> => {
    if (!state.isSupported) {
      return { success: false, error: 'Push notifications are not supported in this browser' };
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Safely check for Notification API
      if (typeof Notification === 'undefined') {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Notifications are not supported in this browser' };
      }

      // Request permission
      let currentPermission: NotificationPermission = 'default';
      try {
        currentPermission = Notification.permission;
        if (currentPermission === 'default') {
          currentPermission = await Notification.requestPermission();
          setState(prev => ({ ...prev, permission: currentPermission }));
        }
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Failed to request notification permission' };
      }

      if (currentPermission !== 'granted') {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Notification permission was denied' };
      }

      // Check if VAPID key is configured
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Push notifications are not configured' };
      }

      // Check if service worker is available
      if (!('serviceWorker' in navigator)) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Service workers are not supported' };
      }

      // Get service worker registration
      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Service worker is not ready' };
      }

      // Check if pushManager is available
      if (!registration.pushManager) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Push manager is not available' };
      }

      // Check if already subscribed
      let subscription: PushSubscription | null = null;
      try {
        subscription = await registration.pushManager.getSubscription();
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Failed to check subscription status' };
      }

      if (subscription) {
        setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
        return { success: true };
      }

      // Subscribe to push notifications
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      } catch (error: any) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: error.message || 'Failed to subscribe to push notifications' };
      }

      // Safely get subscription keys
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Failed to get subscription keys' };
      }

      // Safely get access token from localStorage
      let accessToken: string | null = null;
      try {
        accessToken = localStorage.getItem('accessToken');
      } catch (error) {
        // localStorage might not be available (e.g., private browsing)
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Failed to access storage' };
      }

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken || ''}`,
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(p256dhKey),
            auth: arrayBufferToBase64(authKey),
          },
        }),
      });

      if (!response.ok) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Failed to subscribe to push notifications' };
      }

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
        permission: 'granted',
      }));

      return { success: true };
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: error.message || 'Failed to enable notifications' };
    }
  };

  const disableNotifications = async (): Promise<{ success: boolean; error?: string }> => {
    if (!state.isSupported) {
      return { success: false, error: 'Push notifications are not supported' };
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Check if service worker is available
      if (!('serviceWorker' in navigator)) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Service workers are not supported' };
      }

      let registration: ServiceWorkerRegistration;
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Service worker is not ready' };
      }

      // Check if pushManager is available
      if (!registration.pushManager) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Push manager is not available' };
      }

      let subscription: PushSubscription | null = null;
      try {
        subscription = await registration.pushManager.getSubscription();
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Failed to get subscription' };
      }

      if (subscription) {
        // Unsubscribe from push notifications
        try {
          await subscription.unsubscribe();
        } catch (error) {
          console.error('Failed to unsubscribe:', error);
        }

        // Safely get access token from localStorage
        let accessToken: string | null = null;
        try {
          accessToken = localStorage.getItem('accessToken');
        } catch (error) {
          // localStorage might not be available (e.g., private browsing)
          console.warn('Failed to access localStorage:', error);
        }

        // Remove subscription from server
        try {
          const response = await fetch('/api/notifications/unsubscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken || ''}`,
            },
            body: JSON.stringify({
              endpoint: subscription.endpoint,
            }),
          });

          if (!response.ok) {
            console.error('Failed to unsubscribe from server');
          }
        } catch (error) {
          console.error('Failed to send unsubscribe request:', error);
        }
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return { success: true };
    } catch (error: any) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { success: false, error: error.message || 'Failed to disable notifications' };
    }
  };

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string): BufferSource {
    if (!base64String) {
      return new Uint8Array(0);
    }
    try {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      
      // Safely use atob
      if (typeof window === 'undefined' || typeof window.atob !== 'function') {
        throw new Error('atob is not available');
      }
      
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray.buffer;
    } catch (error) {
      console.error('Error converting VAPID key:', error);
      return new Uint8Array(0);
    }
  }

  // Helper function to convert ArrayBuffer to base64
  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    try {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      
      // Safely use btoa
      if (typeof window === 'undefined' || typeof window.btoa !== 'function') {
        throw new Error('btoa is not available');
      }
      
      return window.btoa(binary);
    } catch (error) {
      console.error('Error converting ArrayBuffer to base64:', error);
      return '';
    }
  }

  return {
    ...state,
    enableNotifications,
    disableNotifications,
    refreshStatus: checkSubscriptionStatus,
  };
}

