'use client';

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import ImageViewer from '@/components/images/ImageViewer';

export default function ImagePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const imageId = params.id as string;

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

  const handleClose = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-black">
      <ImageViewer imageId={imageId} onClose={handleClose} />
    </div>
  );
}

