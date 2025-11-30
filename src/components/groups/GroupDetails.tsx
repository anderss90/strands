'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { groupApi, GroupWithMembers } from '@/lib/api';
import StrandFeed, { StrandFeedRef } from '@/components/strands/StrandFeed';
import StrandViewer from '@/components/strands/StrandViewer';
import ShareGroupModal from '@/components/groups/ShareGroupModal';

interface GroupDetailsProps {
  groupId: string;
  onBack?: () => void;
}

export default function GroupDetails({ groupId, onBack }: GroupDetailsProps) {
  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [selectedStrandId, setSelectedStrandId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pinned' | 'info'>('all');
  const [showShareModal, setShowShareModal] = useState(false);
  const feedRef = useRef<StrandFeedRef>(null);
  const router = useRouter();

  useEffect(() => {
    fetchGroup();
    markGroupAsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // Refresh feed when page becomes visible (e.g., after returning from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && feedRef.current) {
        // Small delay to ensure navigation is complete
        setTimeout(() => {
          feedRef.current?.refresh();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const markGroupAsRead = async () => {
    try {
      await groupApi.markGroupAsRead(groupId);
    } catch (err) {
      // Silently fail - not critical
      console.error('Failed to mark group as read:', err);
    }
  };

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
        <div className="text-gray-400">Loading group...</div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
        {error || 'Group not found'}
      </div>
    );
  }

  const currentUserRole = group.members?.find(m => m.userId === group.createdBy)?.role || 'member';
  const isAdmin = currentUserRole === 'admin';

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-700">
        <h2 className="text-xl font-bold text-gray-100 mb-1">{group.name}</h2>
        <p className="text-sm text-gray-400">
          {group.members?.length || 0} member{group.members?.length !== 1 ? 's' : ''}
        </p>
      </div>

      <button
        onClick={() => router.push(`/upload?groupId=${groupId}`)}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-base min-h-[48px] transition-all duration-200 shadow-md hover:shadow-lg"
      >
        + Create Strand
      </button>

      <div className="bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-700">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            All Strands
          </button>
          <button
            onClick={() => setActiveTab('pinned')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'pinned'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Pinned
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'info'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Group Info
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'info' ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-100 mb-3">Members</h3>
              {group.members && group.members.length > 0 ? (
                <div className="space-y-2">
                  {group.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700 min-h-[60px]"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                          {member.user?.profilePictureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.user.profilePictureUrl}
                              alt={member.user.displayName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-blue-400 text-xl">
                              {member.user?.displayName && member.user.displayName.length > 0
                                ? member.user.displayName.charAt(0).toUpperCase()
                                : '?'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-100 truncate text-base">
                            {member.user?.displayName || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-400 truncate">
                            @{member.user?.username || 'unknown'}
                            {member.role === 'admin' && ' • Admin'}
                          </p>
                        </div>
                      </div>
                      {isAdmin && member.role !== 'admin' && (
                        <button
                          onClick={() => handleRemoveMember(member.userId, member.user?.displayName || 'member')}
                          className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-2 min-h-[44px]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No members yet.</p>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-gray-700">
              <button
                onClick={() => setShowShareModal(true)}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-base min-h-[48px] transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Share Group
              </button>
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
          </div>
        ) : (
          <StrandFeed
            ref={feedRef}
            groupId={groupId}
            pinnedOnly={activeTab === 'pinned'}
            onStrandClick={(strandId) => setSelectedStrandId(strandId)}
          />
        )}
      </div>

      {showShareModal && (
        <ShareGroupModal
          groupId={groupId}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {selectedStrandId && (
        <StrandViewer
          strandId={selectedStrandId}
          onClose={() => setSelectedStrandId(null)}
          onRefresh={() => {
            feedRef.current?.refresh();
          }}
        />
      )}
    </div>
  );
}

