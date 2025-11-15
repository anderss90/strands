'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import AddMembersToGroup from '@/components/groups/AddMembersToGroup';

export default function AddMembersPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const groupId = params.id as string;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const handleSuccess = () => {
    router.push(`/groups/${groupId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <button
            onClick={() => router.push(`/groups/${groupId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2 min-h-[44px]"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Group
          </button>
          <h1 className="text-xl font-bold text-gray-900">Add Members</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <AddMembersToGroup groupId={groupId} onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}

