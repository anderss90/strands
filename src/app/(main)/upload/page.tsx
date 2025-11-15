'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ImageUpload from '@/components/images/ImageUpload';

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
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const handleSuccess = () => {
    router.push('/home');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Upload Image</h1>
          <p className="text-gray-600 text-sm">Share photos with your groups.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <ImageUpload onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}

