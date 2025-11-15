'use client';

import { useState, FormEvent } from 'react';
import { userApi, friendApi } from '@/lib/api';

interface SearchResult {
  id: string;
  email: string;
  username: string;
  displayName: string;
  profilePictureUrl: string | null;
  createdAt?: string;
}

export default function AddFriend() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const data = await userApi.search(searchQuery);
      // Transform API response to match component interface
      const transformedData: SearchResult[] = data.map(user => ({
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        profilePictureUrl: user.profilePictureUrl,
        createdAt: user.createdAt,
      }));
      setResults(transformedData);
    } catch (err: any) {
      setError(err.message || 'Failed to search users');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      setSendingRequest(userId);
      await friendApi.sendFriendRequest(userId);
      alert('Friend request sent!');
      setResults(results.filter(r => r.id !== userId));
    } catch (err: any) {
      alert(err.message || 'Failed to send friend request');
    } finally {
      setSendingRequest(null);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by username or email..."
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[44px] text-black"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Searching...
            </span>
          ) : (
            'Search'
          )}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <h3 className="font-medium text-gray-900">Search Results</h3>
          {results.map((user, index) => (
            <div
              key={user.id}
              className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md transition-all duration-200 animate-slide-in"
              style={{
                animationDelay: `${index * 0.05}s`,
                animationFillMode: 'both',
              }}
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-xl">
                    {user.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.profilePictureUrl}
                        alt={user.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      user.displayName.charAt(0).toUpperCase()
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{user.displayName}</p>
                  <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                </div>
              </div>
              <button
                onClick={() => handleSendRequest(user.id)}
                disabled={sendingRequest === user.id}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 min-h-[44px] transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingRequest === user.id ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </span>
                ) : (
                  'Add Friend'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

