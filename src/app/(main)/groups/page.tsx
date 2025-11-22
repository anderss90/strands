'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import GroupsList from '@/components/groups/GroupsList';
import CreateGroup from '@/components/groups/CreateGroup';

export default function GroupsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const handleGroupCreated = () => {
    setActiveTab('list');
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-4 border border-gray-700">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Groups</h1>
          <p className="text-gray-400 text-sm">Create and manage your groups.</p>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg shadow-sm mb-4 border border-gray-700">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex-1 px-4 py-3 text-center font-medium text-base min-h-[48px] ${
                activeTab === 'list'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              My Groups
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 px-4 py-3 text-center font-medium text-base min-h-[48px] ${
                activeTab === 'create'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Create Group
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
          {activeTab === 'list' ? (
            <GroupsList key={refreshKey} />
          ) : (
            <CreateGroup onSuccess={handleGroupCreated} />
          )}
        </div>
      </div>
    </div>
  );
}

