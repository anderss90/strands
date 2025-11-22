'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('inviteToken') || undefined;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Strands</h1>
          <p className="text-lg text-gray-300 mb-2 font-medium">The first strand type group chat</p>
          
        </div>

        <div className="bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-700">
          <LoginForm inviteToken={inviteToken} />
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Don&apos;t have an account?{' '}
            <Link 
              href={inviteToken ? `/signup?inviteToken=${inviteToken}` : '/signup'} 
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}

