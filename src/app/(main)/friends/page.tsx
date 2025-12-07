'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import FriendList from '@/components/friends/FriendList';
import FriendRequests from '@/components/friends/FriendRequests';
import AddFriend from '@/components/friends/AddFriend';
import { redirectToLogin } from '@/lib/utils/authRedirect';

type Tab = 'friends' | 'requests' | 'add';

export default function FriendsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<Tab>('friends');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirectToLogin(router, pathname || '/friends');
    }
  }, [loading, isAuthenticated, router, pathname]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="py-4">
        <div className="bg-gray-800 rounded-lg shadow-sm px-4 py-4 mb-4 border border-gray-700">
          <h1 className="text-2xl font-bold text-gray-100 mb-4">Friends</h1>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-700 mb-4">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-3 px-4 text-center font-medium min-h-[48px] ${
                activeTab === 'friends'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Friends
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-1 py-3 px-4 text-center font-medium min-h-[48px] ${
                activeTab === 'requests'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 py-3 px-4 text-center font-medium min-h-[48px] ${
                activeTab === 'add'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Add Friend
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'friends' && <FriendList />}
            {activeTab === 'requests' && <FriendRequests />}
            {activeTab === 'add' && <AddFriend />}
          </div>
        </div>
      </div>
    </div>
  );
}
