'use client';

import { useState, useEffect, useRef } from 'react';
import { Strand, Comment } from '@/types/strand';
import EnhancedLinkText from '@/components/common/EnhancedLinkText';
import { strandApi } from '@/lib/api';
import { detectUrls, isYouTubeUrl, isSpotifyUrl } from '@/lib/utils/url';

interface StrandCardProps {
  strand: Strand;
  onClick?: () => void;
  onFireUpdate?: (strandId: string, fireCount: number, hasUserFired: boolean) => void;
}

export default function StrandCard({ strand, onClick, onFireUpdate }: StrandCardProps) {
  const hasImage = !!strand.imageId && strand.image; // For backward compatibility
  const hasText = !!strand.content;
  // Prioritize strand.images array over single strand.image
  // hasMultipleImages is true only if there are 2+ images
  const hasMultipleImages = strand.images && strand.images.length > 1;
  // Build displayImages: use images array if it exists, otherwise fall back to single image
  const displayImages = strand.images && strand.images.length > 0 
    ? strand.images.slice(0, 2) 
    : (hasImage ? [{ image: strand.image!, displayOrder: 0 }] : []);
  const hasMoreImages = strand.images && strand.images.length > 2;
  const [localFireCount, setLocalFireCount] = useState(strand.fireCount || 0);
  const [localHasUserFired, setLocalHasUserFired] = useState(strand.hasUserFired || false);
  const [firing, setFiring] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Update local state when strand prop changes
  useEffect(() => {
    setLocalFireCount(strand.fireCount || 0);
    setLocalHasUserFired(strand.hasUserFired || false);
  }, [strand.fireCount, strand.hasUserFired]);

  // Prevent video autoplay on iOS
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      // Explicitly pause video to prevent autoplay on iOS Safari
      video.pause();
    }
  }, []);

  // Fetch comments for the strand
  useEffect(() => {
    const fetchComments = async () => {
      try {
        setLoadingComments(true);
        const response = await strandApi.getStrandComments(strand.id);
        setComments(response.comments || []);
      } catch (error) {
        console.error('Failed to fetch comments:', error);
        setComments([]);
      } finally {
        setLoadingComments(false);
      }
    };

    fetchComments();
  }, [strand.id]);


  const handleFireClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (firing) return;

    try {
      setFiring(true);
      if (localHasUserFired) {
        const result = await strandApi.removeFire(strand.id);
        setLocalFireCount(result.fireCount);
        setLocalHasUserFired(false);
        if (onFireUpdate) {
          onFireUpdate(strand.id, result.fireCount, false);
        }
      } else {
        const result = await strandApi.addFire(strand.id);
        setLocalFireCount(result.fireCount);
        setLocalHasUserFired(true);
        if (onFireUpdate) {
          onFireUpdate(strand.id, result.fireCount, true);
        }
      }
    } catch (err: any) {
      console.error('Failed to update fire reaction:', err);
    } finally {
      setFiring(false);
    }
  };

  const isTextOnly = hasText && !hasImage;
  
  // Check if content has embed URLs (YouTube or Spotify)
  const contentUrls = hasText ? detectUrls(strand.content || '') : [];
  const hasEmbedUrl = contentUrls.some(url => isYouTubeUrl(url.url) || isSpotifyUrl(url.url));

  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 rounded-lg shadow-sm border ${hasEmbedUrl ? 'overflow-visible' : 'overflow-hidden'} cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200 ${
        isTextOnly 
          ? 'border-blue-600/50 border-2 shadow-lg shadow-blue-900/20' 
          : 'border-gray-700'
      }`}
    >
      {/* First row: User name + Fire button */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {strand.user?.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={strand.user.profilePictureUrl}
                alt={strand.user.displayName}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-6 h-6 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 text-xs font-medium">
                  {strand.user?.displayName?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
            <p className="text-gray-300 text-xs font-medium truncate">
              {strand.user?.displayName || 'Unknown'}
            </p>
          </div>
          <button
            onClick={handleFireClick}
            disabled={firing}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
              localHasUserFired
                ? 'bg-orange-600/20 text-orange-400 hover:bg-orange-600/30'
                : 'text-gray-400 hover:bg-gray-700/50'
            }`}
            title={localHasUserFired ? 'Remove fire' : 'Add fire'}
          >
            <span className="text-sm">🔥</span>
            {localFireCount > 0 && (
              <span className="text-xs font-medium">{localFireCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Second: Strand image/video(s) */}
      {displayImages.length > 0 && (
        <div className={`relative bg-gray-700 overflow-hidden ${hasMultipleImages ? 'grid grid-cols-2 gap-0.5' : 'aspect-square'}`}>
          {displayImages.map((mediaEntry, index) => {
            const media = mediaEntry.image;
            const isVideo = media.mediaType === 'video' || media.mimeType?.startsWith('video/');
            const isLast = index === displayImages.length - 1;
            const showMoreBadge = isLast && hasMoreImages;
            
            return (
              <div key={media.id || index} className="relative aspect-square bg-gray-800">
                {isVideo ? (
                  media.thumbnailUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={media.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <video
                      ref={index === 0 ? videoRef : undefined}
                      src={media.mediaUrl || media.imageUrl || ''}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      playsInline
                      muted
                      autoPlay={false}
                      onLoadedMetadata={(e) => {
                        const video = e.currentTarget;
                        if (video.duration) {
                          video.currentTime = Math.min(0.1, video.duration / 10);
                        }
                        // Explicitly pause after loading metadata (iOS Safari workaround)
                        video.pause();
                      }}
                      onSeeked={(e) => {
                        e.currentTarget.pause();
                      }}
                    />
                  )
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={media.thumbnailUrl || media.imageUrl || media.mediaUrl || ''}
                    alt={media.fileName || `Strand image ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {showMoreBadge && strand.images && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">+{strand.images.length - 2}</span>
                  </div>
                )}
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <div className="bg-black/60 rounded-full p-3">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    {media.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {Math.floor(media.duration / 60)}:{(media.duration % 60).toString().padStart(2, '0')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {strand.isPinned && (
            <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 z-10">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
              </svg>
              Pinned
            </div>
          )}
        </div>
      )}

      {/* Third: Strand text content */}
      {hasText && (
        <div className={`relative ${isTextOnly ? 'p-6 min-h-[120px] flex items-center' : 'px-4 pb-4 pt-4'} ${hasEmbedUrl ? 'overflow-visible' : ''}`}>
          {isTextOnly && (
            <div className="absolute top-4 left-4 text-blue-400 opacity-50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
          <div className={`text-gray-100 ${isTextOnly ? 'text-base leading-relaxed pl-8' : 'text-sm'} ${hasEmbedUrl ? 'overflow-visible' : ''}`}>
            <EnhancedLinkText text={strand.content || ''} className={!isTextOnly ? 'line-clamp-3' : ''} showThumbnails={true} />
          </div>
        </div>
      )}

      {/* Comments section */}
      {comments.length > 0 && (
        <div className="px-4 pb-3 border-t border-gray-700">
          <div className="pt-3 space-y-2">
            {comments.slice(0, 3).map((comment) => (
              <div key={comment.id} className="flex items-start gap-2">
                {comment.user?.profilePictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comment.user.profilePictureUrl}
                    alt={comment.user.displayName}
                    className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="w-5 h-5 bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-400 text-[10px] font-medium">
                      {comment.user?.displayName?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-300 text-xs font-medium">
                      {comment.user?.displayName || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5 break-words">
                    <EnhancedLinkText text={comment.content} />
                  </p>
                </div>
              </div>
            ))}
            {comments.length > 3 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
                className="text-gray-400 hover:text-gray-300 text-xs font-medium mt-1 transition-colors"
              >
                View {comments.length - 3} more {comments.length - 3 === 1 ? 'comment' : 'comments'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer with edit indicator */}
      {strand.editedAt && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-700">
          <div className="flex items-center justify-end">
            <span className="text-gray-500 text-xs">Edited</span>
          </div>
        </div>
      )}
    </div>
  );
}
