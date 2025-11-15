'use client';

import { useEffect, useState } from 'react';
import { friendApi, FriendRequest } from '@/lib/api';

export default function FriendRequests() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await friendApi.getFriendRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load friend requests');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      await friendApi.updateFriendRequest(requestId, status);
      setRequests(requests.filter(r => r.id !== requestId));
      if (status === 'accepted') {
        // Optionally reload friends list
        window.dispatchEvent(new Event('friends-updated'));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update friend request');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No pending friend requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const user = request.isReceived ? request.sender : request.receiver;
        if (!user) return null;

        return (
          <div
            key={request.id}
            className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-all duration-200 animate-slide-in"
          >
            <div className="flex items-center justify-between">
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
              {request.isReceived && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdateRequest(request.id, 'accepted')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 min-h-[44px] transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleUpdateRequest(request.id, 'declined')}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 active:scale-95 min-h-[44px] transition-all duration-200"
                  >
                    Decline
                  </button>
                </div>
              )}
              {!request.isReceived && (
                <span className="text-sm text-gray-500">Pending</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

