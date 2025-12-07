'use client';

import { useParams, useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import GroupDetails from '@/components/groups/GroupDetails';
import { redirectToLogin } from '@/lib/utils/authRedirect';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();
  const groupId = params.id as string;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirectToLogin(router, pathname || `/groups/${groupId}`);
    }
  }, [loading, isAuthenticated, router, pathname, groupId]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const handleBack = () => {
    router.push('/groups');
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="py-4">
        <div className="bg-gray-800 rounded-lg shadow-sm px-4 py-4 mb-4 border border-gray-700">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-300 hover:text-gray-100 mb-2 min-h-[44px]"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Groups
          </button>
        </div>

        <GroupDetails groupId={groupId} onBack={handleBack} />
      </div>
    </div>
  );
}

