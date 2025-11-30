'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { userApi } from '@/lib/api';

export default function ProfilePage() {
  const { user, isAuthenticated, loading, logout, refreshUser } = useAuth();
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
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.display_name) {
      setDisplayName(user.display_name);
    }
  }, [user?.display_name]);

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

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      setNotificationMessage({ type: 'error', text: 'Display name cannot be empty' });
      setTimeout(() => setNotificationMessage(null), 5000);
      return;
    }

    if (displayName.trim() === user?.display_name) {
      setIsEditingDisplayName(false);
      return;
    }

    setIsSavingDisplayName(true);
    setNotificationMessage(null);

    try {
      // Safely get token from localStorage (may fail in private browsing mode)
      let token: string | null = null;
      try {
        token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      } catch (error) {
        // localStorage might not be available (e.g., private browsing on iOS Safari)
        throw new Error('Unable to access storage. Please check your browser settings.');
      }

      if (!token) {
        throw new Error('Not authenticated');
      }

      await userApi.updateProfile({ displayName: displayName.trim() });
      
      // Refresh user data in AuthContext
      await refreshUser();
      setIsEditingDisplayName(false);
      setNotificationMessage({ 
        type: 'success', 
        text: 'Display name updated successfully!' 
      });
      setTimeout(() => setNotificationMessage(null), 5000);
    } catch (error: any) {
      setNotificationMessage({ 
        type: 'error', 
        text: error.message || 'Failed to update display name' 
      });
      setTimeout(() => setNotificationMessage(null), 5000);
      // Revert to original value on error
      setDisplayName(user?.display_name || '');
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const handleCancelDisplayName = () => {
    setDisplayName(user?.display_name || '');
    setIsEditingDisplayName(false);
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
              {isEditingDisplayName ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isSavingDisplayName}
                    maxLength={100}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 min-h-[44px]"
                    placeholder="Enter display name"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveDisplayName}
                      disabled={isSavingDisplayName || !displayName.trim()}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {isSavingDisplayName ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelDisplayName}
                      disabled={isSavingDisplayName}
                      className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-gray-100">{user?.display_name || 'N/A'}</p>
                  <button
                    onClick={() => setIsEditingDisplayName(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    Edit
                  </button>
                </div>
              )}
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

