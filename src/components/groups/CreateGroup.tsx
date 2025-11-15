'use client';

import { useState, useEffect, FormEvent } from 'react';
import { groupApi, friendApi, Friend } from '@/lib/api';

interface CreateGroupProps {
  onSuccess?: () => void;
}

export default function CreateGroup({ onSuccess }: CreateGroupProps) {
  const [name, setName] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      setFriendsLoading(true);
      const data = await friendApi.getFriends();
      setFriends(data);
    } catch (err: any) {
      setError('Failed to load friends');
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Group name is required');
      return;
    }

    if (name.length > 100) {
      setError('Group name must be less than 100 characters');
      return;
    }

    setLoading(true);

    try {
      await groupApi.createGroup({
        name: name.trim(),
        memberIds: selectedFriendIds.length > 0 ? selectedFriendIds : undefined,
      });
      
      // Reset form
      setName('');
      setSelectedFriendIds([]);
      
      if (onSuccess) {
        onSuccess();
      } else {
        alert('Group created successfully!');
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
          Group Name
        </label>
        <input
          id="groupName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter group name"
          required
          maxLength={100}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px] text-black"
        />
      </div>

      {friendsLoading ? (
        <div className="text-sm text-gray-600 py-2">Loading friends...</div>
      ) : friends.length === 0 ? (
        <div className="text-sm text-gray-500 py-2">
          No friends yet. Add friends to include them in groups.
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Friends (Optional)
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {friends.map((friend) => (
              <label
                key={friend.userId}
                className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 cursor-pointer min-h-[44px]"
              >
                <input
                  type="checkbox"
                  checked={selectedFriendIds.includes(friend.userId)}
                  onChange={() => toggleFriend(friend.userId)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {friend.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={friend.profilePictureUrl}
                        alt={friend.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-600 text-lg">
                        {friend.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{friend.displayName}</p>
                    <p className="text-xs text-gray-500 truncate">@{friend.username}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-[48px] transition-all duration-200"
      >
        {loading ? 'Creating...' : 'Create Group'}
      </button>
    </form>
  );
}

