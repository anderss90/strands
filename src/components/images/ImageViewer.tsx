'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { imageApi, Image, Comment } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { formatDateTime } from '@/lib/utils/dateFormat';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Check if fullscreen is supported
  useEffect(() => {
    const checkFullscreenSupport = () => {
      const doc = document as any;
      const isSupported = !!(
        doc.fullscreenEnabled ||
        doc.webkitFullscreenEnabled ||
        doc.mozFullScreenEnabled ||
        doc.msFullscreenEnabled
      );
      setIsFullscreenSupported(isSupported);
    };
    checkFullscreenSupport();
  }, []);

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

  const handleFullscreen = async () => {
    const element = imageContainerRef.current || imageRef.current;
    if (!element) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          // Safari
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          // Firefox
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          // IE/Edge
          await (element as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          // Safari
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          // Firefox
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          // IE/Edge
          await (document as any).msExitFullscreen();
        }
      }
    } catch (error: any) {
      console.error('Error toggling fullscreen:', error);
      // Fallback: try to make the entire viewer fullscreen
      if (!isFullscreen && imageContainerRef.current) {
        try {
          const viewer = imageContainerRef.current.closest('.fixed');
          if (viewer && (viewer as any).requestFullscreen) {
            await (viewer as any).requestFullscreen();
          }
        } catch (fallbackError) {
          console.error('Fallback fullscreen also failed:', fallbackError);
        }
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

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
        <div className="flex items-center gap-2">
          <button
            onClick={handleFullscreen}
            disabled={!isFullscreenSupported}
            className="text-white p-2 hover:bg-white/10 active:bg-white/20 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title={!isFullscreenSupported ? "Fullscreen not supported" : isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
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
                  d="M6 18L18 6M6 6h12v12"
                />
              </svg>
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
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            )}
          </button>
          {canDeleteImage && (
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
          )}
          {!canDeleteImage && <div className="w-[44px]" />}
        </div>
      </div>

      {/* Scrollable Content Area - Everything scrolls together */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col">
          {/* Image */}
          <div 
            ref={imageContainerRef}
            className="flex-shrink-0 flex items-center justify-center min-h-[40vh] p-4 animate-scale-in cursor-pointer"
            onClick={handleFullscreen}
            title="Click to toggle fullscreen"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={image.imageUrl}
              alt={image.fileName}
              className="max-w-full max-h-[70vh] object-contain transition-transform duration-300"
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
                  <p className="font-medium">@{image.user.username}</p>
                  <p className="text-gray-400 text-xs">
                    {formatDateTime(image.createdAt)}
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

