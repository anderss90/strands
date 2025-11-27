'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { registerServiceWorker, checkForServiceWorkerUpdate } from '@/lib/utils/serviceWorkerUpdate';

export default function NotificationManager() {
  const { isAuthenticated } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);

    // Register service worker with update checking
    registerServiceWorker().then((registration) => {
      if (registration) {
        console.log('Service Worker registered:', registration);
        
        // Check for updates immediately
        checkForServiceWorkerUpdate().then((state) => {
          if (state.hasUpdate) {
            setHasUpdate(true);
          }
        });
      }
    });

    // Listen for update available event
    const handleUpdateAvailable = () => {
      setHasUpdate(true);
    };
    window.addEventListener('sw-update-available', handleUpdateAvailable);

    // Check for updates periodically
    const updateInterval = setInterval(() => {
      checkForServiceWorkerUpdate().then((state) => {
        if (state.hasUpdate) {
          setHasUpdate(true);
        }
      });
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      clearInterval(updateInterval);
    };
  }, []);

  // Note: Permission request is now handled manually via the Profile page
  // This component only registers the service worker

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

  return null; // This component doesn't render anything
}

