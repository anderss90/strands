'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { groupApi, GroupWithMembers } from '@/lib/api';
import ImageFeed from '@/components/images/ImageFeed';
import ImageViewer from '@/components/images/ImageViewer';

interface GroupDetailsProps {
  groupId: string;
  onBack?: () => void;
}

export default function GroupDetails({ groupId, onBack }: GroupDetailsProps) {
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const fetchGroup = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await groupApi.getGroup(groupId);
      setGroup(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this group?')) {
      return;
    }

    try {
      setLeaving(true);
      await groupApi.leaveGroup(groupId);
      if (onBack) {
        onBack();
      } else {
        router.push('/groups');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to leave group');
      setLeaving(false);
    }
  };

  const handleRemoveMember = async (userId: string, displayName: string) => {
    if (!confirm(`Remove ${displayName} from this group?`)) {
      return;
    }

    try {
      await groupApi.removeMemberFromGroup(groupId, userId);
      await fetchGroup();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600">Loading group...</div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
        {error || 'Group not found'}
      </div>
    );
  }

  const currentUserRole = group.members?.find(m => m.userId === group.createdBy)?.role || 'member';
  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{group.name}</h2>
        <p className="text-sm text-gray-500">
          {group.members?.length || 0} member{group.members?.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-medium text-gray-900 mb-3">Members</h3>
        {group.members && group.members.length > 0 ? (
          <div className="space-y-2">
            {group.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 min-h-[60px]"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {member.user?.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.user.profilePictureUrl}
                        alt={member.user.displayName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-blue-600 text-xl">
                        {member.user?.displayName.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-base">
                      {member.user?.displayName || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      @{member.user?.username || 'unknown'}
                      {member.role === 'admin' && ' • Admin'}
                    </p>
                  </div>
                </div>
                {isAdmin && member.role !== 'admin' && (
                  <button
                    onClick={() => handleRemoveMember(member.userId, member.user?.displayName || 'member')}
                    className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-2 min-h-[44px]"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No members yet.</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-medium text-gray-900 mb-3">Images</h3>
        <ImageFeed groupId={groupId} onImageClick={(imageId) => setSelectedImageId(imageId)} />
      </div>

      <div className="space-y-2">
        <button
          onClick={() => router.push(`/groups/${groupId}/add-members`)}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-base min-h-[48px] transition-all duration-200 shadow-md hover:shadow-lg"
        >
          Add Members
        </button>
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-[48px] transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {leaving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Leaving...
            </span>
          ) : (
            'Leave Group'
          )}
        </button>
      </div>

      {selectedImageId && (
        <ImageViewer
          imageId={selectedImageId}
          onClose={() => setSelectedImageId(null)}
        />
      )}
    </div>
  );
}

