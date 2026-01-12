'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { groupApi } from '@/lib/api';
import { redirectAfterLogin } from '@/lib/utils/authRedirect';

interface LoginFormProps {
  inviteToken?: string;
  searchParams?: URLSearchParams | null;
}

export default function LoginForm({ inviteToken, searchParams }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      
      // If there's an invite token, join the group
      if (inviteToken) {
        try {
          const result = await groupApi.joinGroupViaInvite(inviteToken);
          router.push(`/groups/${result.groupId}`);
        } catch (inviteErr: any) {
          // If join fails, check for return URL or redirect to home
          console.error('Failed to join group via invite:', inviteErr);
          redirectAfterLogin(router, searchParams || null, '/home');
        }
      } else {
        // Redirect to return URL if present, otherwise home
        redirectAfterLogin(router, searchParams || null, '/home');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm mx-auto space-y-6">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px] bg-gray-700"
          placeholder="username"
          autoComplete="username"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="password" className="block text-sm font-medium text-gray-300">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-sm text-blue-400 hover:text-blue-300 font-medium"
          >
            Forgot Password?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base bg-gray-700"
          placeholder="••••••••"
          autoComplete="current-password"
          minLength={8}
        />
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-[48px] transition-all duration-200 shadow-md hover:shadow-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Logging in...
          </span>
        ) : (
          'Log In'
        )}
      </button>
    </form>
  );
}

