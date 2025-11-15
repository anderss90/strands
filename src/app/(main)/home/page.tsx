'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ImageFeed from '@/components/images/ImageFeed';
import ImageViewer from '@/components/images/ImageViewer';

export default function HomePage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4 animate-fade-in">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome, {user?.display_name || user?.username}!
          </h1>
          <p className="text-gray-600 text-sm">Your image feed from all groups.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 animate-slide-up">
          <ImageFeed onImageClick={(imageId) => setSelectedImageId(imageId)} />
        </div>
      </div>

      {selectedImageId && (
        <ImageViewer
          imageId={selectedImageId}
          onClose={() => setSelectedImageId(null)}
        />
      )}
    </div>
  );
}

