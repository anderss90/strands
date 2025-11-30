'use client';

import { useState, useEffect, FormEvent } from 'react';
import { groupApi, friendApi, Friend } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AddMembersToGroupProps {
  groupId: string;
  onSuccess?: () => void;
}

export default function AddMembersToGroup({ groupId, onSuccess }: AddMembersToGroupProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const fetchData = async () => {
    try {
      setFriendsLoading(true);
      
      // Fetch friends and group members in parallel
      const [friendsData, groupData] = await Promise.all([
        friendApi.getFriends(),
        groupApi.getGroup(groupId),
      ]);

      setFriends(friendsData);
      
      // Get list of existing member IDs
      const existingMemberIds = groupData.members?.map(m => m.userId) || [];
      setGroupMembers(existingMemberIds);
    } catch (err: any) {
      setError('Failed to load data');
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (selectedFriendIds.length === 0) {
      setError('Please select at least one friend to add');
      return;
    }

    setLoading(true);

    try {
      await groupApi.addMembersToGroup(groupId, selectedFriendIds);
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/groups/${groupId}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add members');
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

  // Filter out friends who are already members
  const availableFriends = friends.filter(f => !groupMembers.includes(f.userId));

  if (friendsLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (availableFriends.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-4">All your friends are already in this group.</p>
        <button
          onClick={() => router.push(`/groups/${groupId}`)}
          className="text-blue-400 hover:text-blue-300 font-medium"
        >
          Back to Group
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Friends to Add
        </label>
        <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-700 rounded-lg p-2 bg-gray-700/50">
          {availableFriends.map((friend) => (
            <label
              key={friend.userId}
              className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700 cursor-pointer min-h-[44px]"
            >
              <input
                type="checkbox"
                checked={selectedFriendIds.includes(friend.userId)}
                onChange={() => toggleFriend(friend.userId)}
                className="w-5 h-5 text-blue-600 border-gray-600 rounded focus:ring-blue-500 bg-gray-700"
              />
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                  {friend.profilePictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={friend.profilePictureUrl}
                      alt={friend.displayName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-blue-400 text-lg">
                      {friend.displayName && friend.displayName.length > 0
                        ? friend.displayName.charAt(0).toUpperCase()
                        : '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-100 truncate text-sm">{friend.displayName}</p>
                  <p className="text-xs text-gray-400 truncate">@{friend.username}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => router.push(`/groups/${groupId}`)}
          className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-base min-h-[48px] transition-all duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || selectedFriendIds.length === 0}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-[48px] transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Adding...
            </span>
          ) : (
            `Add ${selectedFriendIds.length > 0 ? `(${selectedFriendIds.length})` : ''}`
          )}
        </button>
      </div>
    </form>
  );
}

