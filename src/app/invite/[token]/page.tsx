'use client';

import { useParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { groupApi } from '@/lib/api';
import SignUpForm from '@/components/auth/SignUpForm';
import Link from 'next/link';

function InvitePageContent() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const token = params.token as string;
  
  const [groupInfo, setGroupInfo] = useState<{ groupId: string; groupName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invite link');
      setLoading(false);
      return;
    }

    // Fetch group info from invite token
    const fetchInviteInfo = async () => {
      try {
        setLoading(true);
        setError('');
        const info = await groupApi.getInviteInfo(token);
        setGroupInfo({ groupId: info.groupId, groupName: info.groupName });
      } catch (err: any) {
        setError(err.message || 'Invalid or expired invite link');
      } finally {
        setLoading(false);
      }
    };

    fetchInviteInfo();
  }, [token]);

  useEffect(() => {
    // If authenticated and group info is loaded, auto-join
    if (isAuthenticated && !authLoading && groupInfo && !joining) {
      const joinGroup = async () => {
        try {
          setJoining(true);
          await groupApi.joinGroupViaInvite(token);
          router.push(`/groups/${groupInfo.groupId}`);
        } catch (err: any) {
          setError(err.message || 'Failed to join group');
          setJoining(false);
        }
      };
      joinGroup();
    }
  }, [isAuthenticated, authLoading, groupInfo, token, router, joining]);

  if (loading || authLoading || joining) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">
            {joining ? 'Joining group...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-700 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-100 mb-4">Invalid Invite</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-base min-h-[48px] transition-all duration-200"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!groupInfo) {
    return null;
  }

  // If not authenticated, show signup form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-900">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">Strands</h1>
            <p className="text-lg text-gray-300 mb-2 font-medium">The first strand type group chat</p>
            <div className="mt-6 mb-4">
              <p className="text-lg text-gray-300 mb-2 font-medium">
                You&apos;ve been invited to join
              </p>
              <p className="text-xl font-semibold text-blue-400 mb-4">{groupInfo.groupName}</p>
              <p className="text-gray-400">Create your account to join</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-700">
            <SignUpForm inviteToken={token} />
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link href={`/login?inviteToken=${token}`} className="text-blue-400 hover:text-blue-300 font-medium">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // This shouldn't be reached if auto-join works, but just in case
  return null;
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-gray-400">Loading...</div>
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
}

