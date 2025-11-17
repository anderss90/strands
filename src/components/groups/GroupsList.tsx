'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { groupApi, Group } from '@/lib/api';

export default function GroupsList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await groupApi.getGroups();
      setGroups(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">Loading groups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
        {error}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-4">You don&apos;t have any groups yet.</p>
        <p className="text-sm text-gray-500">Create a group to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group, index) => (
        <div
          key={group.id}
          onClick={() => router.push(`/groups/${group.id}`)}
          className="bg-gray-800 rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98] active:bg-gray-700 border border-gray-700 min-h-[60px] animate-slide-in"
          style={{
            animationDelay: `${index * 0.05}s`,
            animationFillMode: 'both',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-100 truncate text-base">{group.name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-gray-400 capitalize">{group.userRole}</span>
                {group.userRole === 'admin' && (
                  <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">Admin</span>
                )}
              </div>
            </div>
            <svg
              className="w-5 h-5 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

