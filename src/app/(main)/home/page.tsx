'use client';

import { useState, useRef, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import StrandFeed, { StrandFeedRef } from '@/components/strands/StrandFeed';
import StrandViewer from '@/components/strands/StrandViewer';
import { redirectToLogin } from '@/lib/utils/authRedirect';

function HomePageContent() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedStrandId, setSelectedStrandId] = useState<string | null>(null);
  const feedRef = useRef<StrandFeedRef>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirectToLogin(router, pathname || '/home');
    }
  }, [loading, isAuthenticated, router, pathname]);

  // Check for strand ID in query params (from notification clicks)
  useEffect(() => {
    if (!loading && isAuthenticated) {
      const strandIdFromQuery = searchParams.get('strand');
      if (strandIdFromQuery && strandIdFromQuery !== selectedStrandId) {
        setSelectedStrandId(strandIdFromQuery);
        // Clean up URL by removing query param
        router.replace('/home', { scroll: false });
      }
    }
  }, [searchParams, loading, isAuthenticated, selectedStrandId, router]);

  // Refresh feed when page becomes visible (e.g., after returning from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && feedRef.current) {
        // Small delay to ensure navigation is complete
        setTimeout(() => {
          feedRef.current?.refresh();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="py-4">
        <div className="bg-gray-800 rounded-lg shadow-sm px-4 py-4 mb-4 animate-fade-in border border-gray-700">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">
            Welcome, {user?.display_name || user?.username}!
          </h1>
          <p className="text-gray-400 text-sm">Your strand feed from all groups.</p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-sm py-4 animate-slide-up border border-gray-700">
          <StrandFeed 
            ref={feedRef}
            onStrandClick={(strandId) => setSelectedStrandId(strandId)} 
          />
        </div>
      </div>

      {selectedStrandId && (
        <StrandViewer
          strandId={selectedStrandId}
          onClose={() => setSelectedStrandId(null)}
          onRefresh={() => {
            feedRef.current?.refresh();
          }}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}

