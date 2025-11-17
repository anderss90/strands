'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

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

