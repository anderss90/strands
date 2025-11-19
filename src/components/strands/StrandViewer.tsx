'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Strand } from '@/types/strand';
import { Comment } from '@/types/comment';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import LinkText from '@/components/common/LinkText';

interface StrandViewerProps {
  strandId: string;
  onClose?: () => void;
  onEdit?: () => void;
}

export default function StrandViewer({ strandId, onClose, onEdit }: StrandViewerProps) {
  const [strand, setStrand] = useState<Strand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    fetchStrand();
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strandId]);

  const fetchStrand = async () => {
    try {
      setLoading(true);
      setError('');
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
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
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch(`/api/strands/${strandId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete strand');
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

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
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
  const hasImage = !!strand.imageId && strand.image;
  const hasText = !!strand.content;

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
        {isOwner && (
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
        {!isOwner && <div className="w-[44px]" />}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col">
          {/* Image (if present) */}
          {hasImage && strand.image && (
            <div className="flex-shrink-0 flex items-center justify-center min-h-[40vh] p-4 animate-scale-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={strand.image.imageUrl}
                alt={strand.image.fileName || 'Strand image'}
                className="max-w-full max-h-[70vh] object-contain transition-transform duration-300"
              />
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
            {strand.groups && strand.groups.length > 0 && (
              <div className="mb-3">
                <p className="text-gray-400 text-xs mb-1">Shared in:</p>
                <div className="flex flex-wrap gap-1">
                  {strand.groups.map((group) => (
                    <span
                      key={group.id}
                      className="bg-blue-600 px-2 py-1 rounded text-xs"
                    >
                      {group.name}
                    </span>
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
                  <p className="font-medium">@{strand.user.username}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(strand.createdAt).toLocaleDateString()}
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
              comments.map((comment) => (
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
                      {comment.user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="font-medium text-xs mb-1">{comment.user.displayName}</p>
                      <p className="text-sm break-words text-gray-300">
                        <LinkText text={comment.content} />
                      </p>
                    </div>
                    <p className="text-gray-400 text-xs mt-1 ml-2">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
