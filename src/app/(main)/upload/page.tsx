'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import StrandCreate from '@/components/strands/StrandCreate';

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');
  const [sharedImage, setSharedImage] = useState<File | null>(null);

  // Check for shared image from sessionStorage
  useEffect(() => {
    const sharedImageData = sessionStorage.getItem('sharedImage');
    if (sharedImageData) {
      try {
        const imageData = JSON.parse(sharedImageData);
        // Convert base64 back to File
        const binaryString = atob(imageData.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: imageData.type });
        const file = new File([blob], imageData.name, { type: imageData.type });
        setSharedImage(file);
        // Clear sessionStorage after retrieving
        sessionStorage.removeItem('sharedImage');
      } catch (error) {
        console.error('Error processing shared image:', error);
        sessionStorage.removeItem('sharedImage');
      }
    }
  }, []);

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
          <StrandCreate 
            onSuccess={handleSuccess} 
            preselectedGroupId={groupId || undefined}
            sharedImage={sharedImage}
          />
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

