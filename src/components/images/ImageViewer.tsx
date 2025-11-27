'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { imageApi, Image, Comment } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDateTime } from '@/lib/utils/dateFormat';
import FullscreenZoomableImage from '@/components/media/FullscreenZoomableImage';

interface ImageViewerProps {
  imageId: string;
  onClose?: () => void;
}

export default function ImageViewer({ imageId, onClose }: ImageViewerProps) {
  const [image, setImage] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    fetchImage();
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId]);

  const fetchImage = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await imageApi.getImage(imageId);
      setImage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      const data = await imageApi.getImageComments(imageId);
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
      const newComment = await imageApi.createComment(imageId, commentText.trim());
      setComments(prev => [...prev, newComment]);
      setCommentText('');
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      setDeleting(true);
      await imageApi.deleteImage(imageId);
      if (onClose) {
        onClose();
      } else {
        router.push('/home');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete image');
      setDeleting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      setDeletingComment(commentId);
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const response = await fetch(`/api/images/${imageId}/comments/${commentId}`, {
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

  if (error || !image) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center px-4">
          <p className="mb-4">{error || 'Image not found'}</p>
          <button
            onClick={handleClose}
            className="bg-white text-black px-4 py-2 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === image.userId;
  const isAdmin = user?.isAdmin || user?.is_admin || false;
  const canDeleteImage = isOwner || isAdmin;

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
          {image.user?.displayName || 'Image'}
        </div>
        {canDeleteImage ? (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 p-2 hover:bg-white/10 active:bg-white/20 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50 transition-all duration-200 active:scale-95"
            title={isAdmin && !isOwner ? "Delete image (Admin)" : "Delete image"}
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
        ) : (
          <div className="w-[44px]" />
        )}
      </div>

      {/* Scrollable Content Area - Everything scrolls together */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col">
          {/* Image */}
          <div className="flex-shrink-0 flex items-center justify-center min-h-[40vh] max-h-[70vh] p-4 animate-scale-in">
            <FullscreenZoomableImage
              src={image.imageUrl}
              alt={image.fileName}
              className="w-full h-full"
              maxZoom={4}
              minZoom={1}
              doubleTapZoom={2.5}
              showControls={true}
            />
          </div>

          {/* Comment Input - Right below the image */}
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
                    // Auto-resize textarea
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

          {/* Image Info */}
          <div className="flex-shrink-0 p-4 bg-black/50 backdrop-blur-sm border-b border-white/10 text-white text-sm">
            {image.groups && image.groups.length > 0 && (
              <div className="mb-3">
                <p className="text-gray-400 text-xs mb-1">Shared in:</p>
                <div className="flex flex-wrap gap-1">
                  {image.groups.map((group) => (
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
            {image.user && (
              <div className="flex items-center gap-2">
                {image.user.profilePictureUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.user.profilePictureUrl}
                    alt={image.user.displayName}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{image.user.displayName || image.user.username}</p>
                  <p className="text-gray-400 text-xs">
                    @{image.user.username} • {formatDateTime(image.createdAt)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Comments List - Part of scrollable content */}
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
                        {comment.user.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="bg-white/10 rounded-lg p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs mb-1">{comment.user.displayName}</p>
                            <p className="text-sm break-words text-gray-300">{comment.content}</p>
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

