'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

export default function ProfilePage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    enableNotifications,
    disableNotifications,
  } = useNotifications();
  const [notificationMessage, setNotificationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleEnableNotifications = async () => {
    setNotificationMessage(null);
    const result = await enableNotifications();
    if (result.success) {
      setNotificationMessage({ type: 'success', text: 'Notifications enabled successfully!' });
    } else {
      setNotificationMessage({ type: 'error', text: result.error || 'Failed to enable notifications' });
    }
    setTimeout(() => setNotificationMessage(null), 5000);
  };

  const handleDisableNotifications = async () => {
    setNotificationMessage(null);
    const result = await disableNotifications();
    if (result.success) {
      setNotificationMessage({ type: 'success', text: 'Notifications disabled successfully!' });
    } else {
      setNotificationMessage({ type: 'error', text: result.error || 'Failed to disable notifications' });
    }
    setTimeout(() => setNotificationMessage(null), 5000);
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const canEnable = isSupported && (permission === 'default' || (permission === 'granted' && !isSubscribed));
  const canDisable = isSupported && isSubscribed;

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-4 border border-gray-700">
          <h1 className="text-2xl font-bold text-gray-100 mb-4">Profile</h1>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Display Name
              </label>
              <p className="text-gray-100">{user?.display_name || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Username
              </label>
              <p className="text-gray-100">@{user?.username || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Email
              </label>
              <p className="text-gray-100">{user?.email || 'N/A'}</p>
            </div>

            {/* Notifications Section */}
            <div className="pt-4 border-t border-gray-700">
              <label className="block text-sm font-medium text-gray-400 mb-3">
                Push Notifications
              </label>
              
              {!isSupported && (
                <p className="text-sm text-gray-400 mb-3">
                  Push notifications are not supported in this browser.
                </p>
              )}

              {isSupported && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-300">
                        {isSubscribed
                          ? 'Notifications are enabled'
                          : permission === 'denied'
                          ? 'Notifications are blocked. Please enable them in your browser settings.'
                          : 'Notifications are disabled'}
                      </p>
                      {permission === 'granted' && isSubscribed && (
                        <p className="text-xs text-gray-400 mt-1">
                          You will receive notifications for new strands and comments in your groups.
                        </p>
                      )}
                    </div>
                  </div>

                  {notificationMessage && (
                    <div
                      className={`px-4 py-2 rounded-lg text-sm ${
                        notificationMessage.type === 'success'
                          ? 'bg-green-900/20 border border-green-700 text-green-400'
                          : 'bg-red-900/20 border border-red-700 text-red-400'
                      }`}
                    >
                      {notificationMessage.text}
                    </div>
                  )}

                  <div className="flex gap-3">
                    {canEnable && (
                      <button
                        onClick={handleEnableNotifications}
                        disabled={isLoading}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {isLoading ? 'Loading...' : 'Enable Notifications'}
                      </button>
                    )}

                    {canDisable && (
                      <button
                        onClick={handleDisableNotifications}
                        disabled={isLoading}
                        className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {isLoading ? 'Loading...' : 'Disable Notifications'}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-6 w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-base min-h-[48px]"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

