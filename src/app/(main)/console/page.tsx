'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Console from '@/components/debug/Console';
import { redirectToLogin } from '@/lib/utils/authRedirect';

export default function ConsolePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      redirectToLogin(router, pathname || '/console');
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
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="max-w-2xl mx-auto h-[calc(100vh-5rem)]">
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 h-full flex flex-col">
          <Console />
        </div>
      </div>
    </div>
  );
}

