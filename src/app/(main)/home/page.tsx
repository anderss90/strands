'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import StrandFeed, { StrandFeedRef } from '@/components/strands/StrandFeed';
import StrandViewer from '@/components/strands/StrandViewer';

export default function HomePage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [selectedStrandId, setSelectedStrandId] = useState<string | null>(null);
  const feedRef = useRef<StrandFeedRef>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

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
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-4 animate-fade-in border border-gray-700">
          <h1 className="text-2xl font-bold text-gray-100 mb-2">
            Welcome, {user?.display_name || user?.username}!
          </h1>
          <p className="text-gray-400 text-sm">Your strand feed from all groups.</p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-sm p-6 animate-slide-up border border-gray-700">
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

