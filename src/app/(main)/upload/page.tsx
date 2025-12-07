'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, Suspense, useState } from 'react';
import StrandCreate from '@/components/strands/StrandCreate';
import { redirectToLogin } from '@/lib/utils/authRedirect';

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');
  const [sharedImage, setSharedImage] = useState<File | null>(null);
  const [sharedContent, setSharedContent] = useState<string | null>(null);

  // Check for shared image/video from sessionStorage
  useEffect(() => {
    const loadSharedFile = async () => {
      try {
        // Safely access sessionStorage
        let sharedImageData: string | null = null;
        let sharedFileData: string | null = null;
        try {
          sharedImageData = sessionStorage.getItem('sharedImage');
          sharedFileData = sessionStorage.getItem('sharedFile');
        } catch (storageError) {
          // sessionStorage might not be available (e.g., private browsing)
          console.warn('Unable to access sessionStorage:', storageError);
          return;
        }

        // Handle shared file (videos/large files stored as URL)
        if (sharedFileData) {
          try {
            const fileData = JSON.parse(sharedFileData);
            
            if (fileData.url) {
              // Fetch the file from the URL
              const response = await fetch(fileData.url);
              if (!response.ok) {
                throw new Error('Failed to fetch shared file');
              }
              
              const blob = await response.blob();
              const file = new File([blob], fileData.name, { type: fileData.type });
              setSharedImage(file);
              
              // Clear sessionStorage after retrieving
              try {
                sessionStorage.removeItem('sharedFile');
              } catch (clearError) {
                console.warn('Failed to clear sessionStorage:', clearError);
              }
            }
          } catch (error) {
            console.error('Error processing shared file:', error);
            // Try to clear invalid data
            try {
              sessionStorage.removeItem('sharedFile');
            } catch (clearError) {
              // Ignore clear errors
            }
          }
        }
        // Handle shared image (small images stored as base64)
        else if (sharedImageData) {
          try {
            const imageData = JSON.parse(sharedImageData);
            
            // Safely use atob
            if (typeof window === 'undefined' || typeof window.atob !== 'function') {
              throw new Error('atob is not available');
            }
            
            // Convert base64 back to File
            const binaryString = window.atob(imageData.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: imageData.type });
            const file = new File([blob], imageData.name, { type: imageData.type });
            setSharedImage(file);
            
            // Clear sessionStorage after retrieving
            try {
              sessionStorage.removeItem('sharedImage');
            } catch (clearError) {
              console.warn('Failed to clear sessionStorage:', clearError);
            }
          } catch (error) {
            console.error('Error processing shared image:', error);
            // Try to clear invalid data
            try {
              sessionStorage.removeItem('sharedImage');
            } catch (clearError) {
              // Ignore clear errors
            }
          }
        }
        
        // Handle shared content (text/URLs from Spotify, YouTube, etc.)
        let sharedContentData: string | null = null;
        try {
          sharedContentData = sessionStorage.getItem('sharedContent');
        } catch (storageError) {
          // Ignore storage errors
        }
        
        if (sharedContentData) {
          try {
            const contentData = JSON.parse(sharedContentData);
            if (contentData.content) {
              setSharedContent(contentData.content);
              
              // Clear sessionStorage after retrieving
              try {
                sessionStorage.removeItem('sharedContent');
              } catch (clearError) {
                console.warn('Failed to clear sessionStorage:', clearError);
              }
            }
          } catch (error) {
            console.error('Error processing shared content:', error);
            // Try to clear invalid data
            try {
              sessionStorage.removeItem('sharedContent');
            } catch (clearError) {
              // Ignore clear errors
            }
          }
        }
      } catch (error) {
        console.error('Error in shared file effect:', error);
      }
    };

    loadSharedFile();
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
      <div className="py-4">
        <div className="bg-gray-800 rounded-lg shadow-sm px-4 py-4 mb-4 border border-gray-700">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Create Strand</h1>
          <p className="text-gray-400 text-sm">Share text, images, or both with your groups.</p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-sm px-4 py-4 border border-gray-700">
          <StrandCreate 
            onSuccess={handleSuccess} 
            preselectedGroupId={groupId || undefined}
            sharedImage={sharedImage}
            sharedContent={sharedContent}
          />
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirectToLogin(router, pathname || '/upload');
    }
  }, [loading, isAuthenticated, router, pathname]);

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

