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

    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    const permission = Notification.permission;

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
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
      }));
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const enableNotifications = async (): Promise<{ success: boolean; error?: string }> => {
    if (!state.isSupported) {
      return { success: false, error: 'Push notifications are not supported in this browser' };
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request permission
      let currentPermission = Notification.permission;
      if (currentPermission === 'default') {
        currentPermission = await Notification.requestPermission();
        setState(prev => ({ ...prev, permission: currentPermission }));
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

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        setState(prev => ({ ...prev, isSubscribed: true, isLoading: false }));
        return { success: true };
      }

      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Send subscription to server
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
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
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push notifications
        await subscription.unsubscribe();

        // Remove subscription from server
        const response = await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });

        if (!response.ok) {
          console.error('Failed to unsubscribe from server');
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

  return {
    ...state,
    enableNotifications,
    disableNotifications,
    refreshStatus: checkSubscriptionStatus,
  };
}

