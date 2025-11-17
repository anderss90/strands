'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import StrandCreate from '@/components/strands/StrandCreate';

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');

  const handleSuccess = () => {
    if (groupId) {
      router.push(`/groups/${groupId}`);
    } else {
      router.push('/home');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-4 border border-gray-700">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Create Strand</h1>
          <p className="text-gray-400 text-sm">Share text, images, or both with your groups.</p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-700">
          <StrandCreate onSuccess={handleSuccess} preselectedGroupId={groupId || undefined} />
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

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

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}

