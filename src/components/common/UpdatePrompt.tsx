'use client';

import { useState, useEffect } from 'react';
import { checkForServiceWorkerUpdate, forceServiceWorkerUpdate } from '@/lib/utils/serviceWorkerUpdate';

export default function UpdatePrompt() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Check for updates on mount
    checkForServiceWorkerUpdate().then((state) => {
      setHasUpdate(state.hasUpdate);
    });

    // Listen for update available event
    const handleUpdateAvailable = () => {
      setHasUpdate(true);
    };
    window.addEventListener('sw-update-available', handleUpdateAvailable);

    // Check periodically
    const interval = setInterval(() => {
      checkForServiceWorkerUpdate().then((state) => {
        setHasUpdate(state.hasUpdate);
      });
    }, 60000); // Check every minute

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      clearInterval(interval);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    const success = await forceServiceWorkerUpdate();
    if (!success) {
      // If force update didn't work, just reload the page
      window.location.reload();
    }
    // Note: forceServiceWorkerUpdate will reload the page, so we won't reach here
  };

  if (!hasUpdate) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-fade-in">
      <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-medium text-sm">New version available</p>
          <p className="text-xs text-blue-100 mt-1">Update to get the latest features and fixes</p>
        </div>
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-50 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isUpdating ? 'Updating...' : 'Update Now'}
        </button>
      </div>
    </div>
  );
}

