'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import StrandEdit from '@/components/strands/StrandEdit';
import { redirectToLogin } from '@/lib/utils/authRedirect';

export default function EditStrandPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();
  const strandId = params.id as string;

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirectToLogin(router, pathname || `/strands/${strandId}/edit`);
    }
  }, [loading, isAuthenticated, router, pathname, strandId]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const handleSuccess = () => {
    // Redirect back to previous page or home
    router.back();
  };

  const handleCancel = () => {
    // Redirect back to previous page
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="py-4">
        <div className="bg-gray-800 rounded-lg shadow-sm px-4 py-4 mb-4 border border-gray-700">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Edit Strand</h1>
          <p className="text-gray-400 text-sm">Update your strand&apos;s content or image.</p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-sm px-4 py-4 border border-gray-700">
          <StrandEdit
            strandId={strandId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
}

