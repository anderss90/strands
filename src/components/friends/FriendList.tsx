'use client';

import { useEffect, useState } from 'react';
import { friendApi, Friend } from '@/lib/api';

export default function FriendList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await friendApi.getFriends();
      setFriends(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      await friendApi.removeFriend(friendId);
      setFriends(friends.filter(f => f.userId !== friendId));
    } catch (err: any) {
      alert(err.message || 'Failed to remove friend');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg shadow-sm p-4 flex items-center justify-between border border-gray-700">
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-12 h-12 bg-gray-700 rounded-full animate-pulse"></div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
                <div className="h-3 bg-gray-700 rounded w-16 animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No friends yet. Start adding friends!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((friend, index) => (
        <div
          key={friend.id}
          className="bg-gray-800 rounded-lg shadow-sm p-4 flex items-center justify-between hover:shadow-md active:scale-[0.98] transition-all duration-200 border border-gray-700 animate-slide-in"
          style={{
            animationDelay: `${index * 0.05}s`,
            animationFillMode: 'both',
          }}
        >
          <div className="flex items-center space-x-3 flex-1">
            <div className="w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 text-xl">
                {friend.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={friend.profilePictureUrl}
                    alt={friend.displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  friend.displayName && friend.displayName.length > 0
                    ? friend.displayName.charAt(0).toUpperCase()
                    : '?'
                )}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-100 truncate">{friend.displayName}</p>
              <p className="text-sm text-gray-400 truncate">@{friend.username}</p>
            </div>
          </div>
          <button
            onClick={() => handleRemoveFriend(friend.userId)}
            className="text-red-400 hover:text-red-300 active:text-red-200 px-3 py-2 text-sm font-medium min-h-[44px] min-w-[44px] active:scale-95 transition-all duration-200"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

