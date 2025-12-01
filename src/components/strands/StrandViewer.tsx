'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Strand } from '@/types/strand';
import { Comment } from '@/types/comment';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import LinkText from '@/components/common/LinkText';
import VideoPlayer from '@/components/media/VideoPlayer';
import FullscreenZoomableImage from '@/components/media/FullscreenZoomableImage';
import { strandApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils/dateFormat';

interface StrandViewerProps {
  strandId: string;
  onClose?: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
}

export default function StrandViewer({ strandId, onClose, onEdit, onRefresh }: StrandViewerProps) {
  const [strand, setStrand] = useState<Strand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [firing, setFiring] = useState(false);
  const [pinning, setPinning] = useState<string | null>(null); // Track which group is being pinned/unpinned
  const [deletingComment, setDeletingComment] = useState<string | null>(null); // Track which comment is being deleted
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const isHandlingBackRef = useRef(false); // Track if we're currently handling a back button press

  useEffect(() => {
    fetchStrand();
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strandId]);

  // Refresh strand data when page becomes visible (e.g., after returning from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to ensure navigation is complete
        setTimeout(() => {
          fetchStrand();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strandId]);

  // Intercept browser back button when viewing a strand
  useEffect(() => {
    // Push a state to history when viewer opens so we can detect back button
    const historyState = { strandViewer: true, strandId };
    window.history.pushState(historyState, '', window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      // When back button is pressed while viewing a strand, close the viewer
      // and prevent navigation by pushing our state back
      isHandlingBackRef.current = true;
      handleClose();
      // Push state back to prevent browser from navigating away
      window.history.pushState(historyState, '', window.location.href);
      // Reset flag after a brief delay
      setTimeout(() => {
        isHandlingBackRef.current = false;
      }, 100);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up history state when component unmounts (e.g., close button clicked)
      // Only if we're not currently handling a back button press
      if (!isHandlingBackRef.current && window.history.state?.strandViewer === true && window.history.state?.strandId === strandId) {
        // Replace current state instead of going back to avoid triggering popstate
        window.history.replaceState(null, '', window.location.href);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strandId]);

  const fetchStrand = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Safely get token from localStorage
      let token: string | null = null;
      try {
        token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      } catch (error) {
        setError('Unable to access storage. Please check your browser settings.');
        return;
      }
      
      const response = await fetch(`/api/strands/${strandId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load strand');
      }

      const data = await response.json();
      setStrand(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load strand');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      
      // Safely get token from localStorage
      let token: string | null = null;
      try {
        token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      } catch (error) {
        console.error('Failed to get access token:', error);
        return;
      }
      
      const response = await fetch(`/api/strands/${strandId}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load comments');
      }

      const data = await response.json();
      setComments(data.comments);
    } catch (err: any) {
      console.error('Failed to load comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCommentSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      
      // Safely get token from localStorage
      let token: string | null = null;
      try {
        token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      } catch (error) {
        alert('Unable to access storage. Please check your browser settings.');
        return;
      }
      
      const response = await fetch(`/api/strands/${strandId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: commentText.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to post comment');
      }

      const newComment = await response.json();
      setComments(prev => [...prev, newComment]);
      setCommentText('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this strand?')) {
      return;
    }

    try {
      setDeleting(true);
      
      // Safely get token from localStorage
      let token: string | null = null;
      try {
        token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      } catch (error) {
        alert('Unable to access storage. Please check your browser settings.');
        setDeleting(false);
        return;
      }
      
      const response = await fetch(`/api/strands/${strandId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete strand');
      }

      // Refresh feed after deletion
      if (onRefresh) {
        onRefresh();
      }

      if (onClose) {
        onClose();
      } else {
        router.push('/home');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete strand');
      setDeleting(false);
    }
  };

  const handleFire = async () => {
    if (!strand) return;

    try {
      setFiring(true);
      if (strand.hasUserFired) {
        const result = await strandApi.removeFire(strandId);
        setStrand({ ...strand, hasUserFired: false, fireCount: result.fireCount });
      } else {
        const result = await strandApi.addFire(strandId);
        setStrand({ ...strand, hasUserFired: true, fireCount: result.fireCount });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update fire reaction');
    } finally {
      setFiring(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      setDeletingComment(commentId);
      
      // Safely get token from localStorage
      let token: string | null = null;
      try {
        token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      } catch (error) {
        alert('Unable to access storage. Please check your browser settings.');
        setDeletingComment(null);
        return;
      }
      
      const response = await fetch(`/api/strands/${strandId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Remove comment from local state
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete comment');
    } finally {
      setDeletingComment(null);
    }
  };

  const handlePin = async (groupId: string) => {
    if (!strand) return;

    try {
      setPinning(groupId);
      const group = strand.groups?.find(g => g.id === groupId);
      if (group?.isPinned) {
        await strandApi.unpinStrand(strandId, groupId);
        // Update group's pinned status
        setStrand({
          ...strand,
          groups: strand.groups?.map(g =>
            g.id === groupId ? { ...g, isPinned: false } : g
          ),
        });
      } else {
        await strandApi.pinStrand(strandId, groupId);
        // Update group's pinned status
        setStrand({
          ...strand,
          groups: strand.groups?.map(g =>
            g.id === groupId ? { ...g, isPinned: true } : g
          ),
        });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update pin status');
    } finally {
      setPinning(null);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      // Navigate within the app instead of browser back
      // Try to go to a sensible default based on current path
      if (pathname?.includes('/groups/')) {
        // Extract group ID from path if we're on a group page
        const groupMatch = pathname.match(/\/groups\/([^\/]+)/);
        if (groupMatch) {
          router.push(`/groups/${groupMatch[1]}`);
        } else {
          router.push('/groups');
        }
      } else {
        // Default to home
        router.push('/home');
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" className="text-white" />
          <div className="text-white text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !strand) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center px-4">
          <p className="mb-4">{error || 'Strand not found'}</p>
          <button
            onClick={handleClose}
            className="bg-gray-700 text-gray-100 px-4 py-2 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === strand.userId;
  const isAdmin = user?.isAdmin || user?.is_admin || false;
  const canEditDelete = isOwner || isAdmin;
  const hasImage = !!strand.imageId && strand.image; // For backward compatibility
  const hasText = !!strand.content;
  const hasMultipleImages = strand.images && strand.images.length > 0;
  const displayImages = hasMultipleImages && strand.images ? strand.images : (hasImage ? [{ id: strand.image!.id, imageId: strand.image!.id, displayOrder: 0, image: strand.image! }] : []);

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 bg-black z-[100] flex flex-col animate-fade-in overflow-hidden">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-10">
        <button
          onClick={handleClose}
          className="text-white p-2 hover:bg-white/10 active:bg-white/20 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-200 active:scale-95"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex-1 text-white text-center font-medium">
          {strand.user?.displayName || 'Strand'}
        </div>
        {canEditDelete && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onEdit) {
                  onEdit();
                } else {
                  router.push(`/strands/${strandId}/edit`);
                }
              }}
              className="text-blue-500 p-2 hover:bg-white/10 active:bg-white/20 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-200 active:scale-95"
              title={isAdmin && !isOwner ? "Edit strand (Admin)" : "Edit strand"}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-500 p-2 hover:bg-white/10 active:bg-white/20 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50 transition-all duration-200 active:scale-95"
              title={isAdmin && !isOwner ? "Delete strand (Admin)" : "Delete strand"}
            >
              {deleting ? (
                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          </div>
        )}
        {!canEditDelete && <div className="w-[44px]" />}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col">
          {/* Image or Video (if present) */}
          {displayImages && displayImages.length > 0 && (
            <div className="flex-shrink-0 space-y-4 p-4">
              {displayImages.map((mediaEntry, index) => {
                const media = mediaEntry.image;
                const isVideo = media.mediaType === 'video' || media.mimeType?.startsWith('video/');
                return (
                  <div
                    key={mediaEntry.id || media.id || index}
                    className="flex items-center justify-center min-h-[40vh] max-h-[70vh] animate-scale-in"
                  >
                    {isVideo ? (
                      <VideoPlayer
                        src={media.imageUrl || media.mediaUrl || ''}
                        poster={media.thumbnailUrl || undefined}
                        className="max-w-full max-h-full"
                        controls
                        autoplay={false}
                      />
                    ) : (
                      <FullscreenZoomableImage
                        src={media.imageUrl || media.mediaUrl || ''}
                        alt={media.fileName || `Strand image ${index + 1}`}
                        className="w-full h-full"
                        maxZoom={4}
                        minZoom={1}
                        doubleTapZoom={2.5}
                        showControls={true}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment Input - Right below image or at top if no image */}
          <div className="flex-shrink-0 bg-black/70 backdrop-blur-sm border-y border-white/10 p-4 text-white">
            <form onSubmit={handleCommentSubmit}>
              <div className="flex gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment... 😊"
                  className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px] max-h-[120px] resize-none"
                  maxLength={1000}
                  disabled={submittingComment}
                  rows={1}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                  }}
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || submittingComment}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px] transition-all duration-200 self-end"
                >
                  {submittingComment ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Post'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Strand Info */}
          <div className="flex-shrink-0 p-4 bg-black/50 backdrop-blur-sm border-b border-white/10 text-white text-sm">
            {hasText && (
              <div className="mb-4">
                <p className="text-white text-base leading-relaxed whitespace-pre-wrap break-words">
                  <LinkText text={strand.content || ''} />
                </p>
                {strand.editedAt && (
                  <p className="text-gray-400 text-xs mt-2">(edited)</p>
                )}
              </div>
            )}
            
            {/* Fire Button */}
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={handleFire}
                disabled={firing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  strand.hasUserFired
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span className="text-lg">🔥</span>
                <span className="text-sm">
                  {strand.fireCount !== undefined ? strand.fireCount : 0}
                </span>
              </button>
            </div>

            {strand.groups && strand.groups.length > 0 && (
              <div className="mb-3">
                <p className="text-gray-400 text-xs mb-2">Shared in:</p>
                <div className="space-y-2">
                  {strand.groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            group.isPinned
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-600/50 text-gray-300'
                          }`}
                        >
                          {group.name}
                        </span>
                        {group.isPinned && (
                          <span className="text-blue-400 text-xs" title="Pinned">
                            📌
                          </span>
                        )}
                      </div>
                      {group.userRole === 'admin' && (
                        <button
                          onClick={() => handlePin(group.id)}
                          disabled={pinning === group.id}
                          className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                            group.isPinned
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          title={group.isPinned ? 'Unpin from group' : 'Pin to group'}
                        >
                          {pinning === group.id ? (
                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : group.isPinned ? (
                            'Unpin'
                          ) : (
                            'Pin'
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {strand.user && (
              <div className="flex items-center gap-2">
                {strand.user.profilePictureUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={strand.user.profilePictureUrl}
                    alt={strand.user.displayName}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{strand.user.displayName || strand.user.username}</p>
                  <p className="text-gray-400 text-xs">
                    @{strand.user.username} • {formatDateTime(strand.createdAt)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Comments List */}
          <div className="flex-shrink-0 p-4 space-y-3 bg-black/50 backdrop-blur-sm text-white text-sm">
            <h3 className="text-white font-medium mb-3">Comments</h3>
            {commentsLoading ? (
              <div className="text-center py-4">
                <LoadingSpinner size="sm" className="text-white" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No comments yet</p>
            ) : (
              comments.map((comment) => {
                const isCommentOwner = user?.id === comment.userId;
                const isCommentAdmin = user?.isAdmin || user?.is_admin || false;
                const canDeleteComment = isCommentOwner || isCommentAdmin;
                
                return (
                  <div key={comment.id} className="flex gap-2 animate-fade-in">
                    {comment.user.profilePictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.user.profilePictureUrl}
                        alt={comment.user.displayName}
                        className="w-8 h-8 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-medium">
                        {comment.user.displayName && comment.user.displayName.length > 0
                          ? comment.user.displayName.charAt(0).toUpperCase()
                          : '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="bg-white/10 rounded-lg p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs mb-1">{comment.user.displayName}</p>
                            <p className="text-sm break-words text-gray-300">
                              <LinkText text={comment.content} />
                            </p>
                          </div>
                          {canDeleteComment && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              disabled={deletingComment === comment.id}
                              className="text-red-400 hover:text-red-300 p-1 rounded transition-all duration-200 active:scale-95 disabled:opacity-50 flex-shrink-0"
                              title={isCommentAdmin && !isCommentOwner ? "Delete comment (Admin)" : "Delete comment"}
                            >
                              {deletingComment === comment.id ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs mt-1 ml-2">
                        {formatDateTime(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
