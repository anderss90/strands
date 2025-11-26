'use client';

import { useState, useEffect } from 'react';
import { Strand } from '@/types/strand';
import LinkText from '@/components/common/LinkText';
import { strandApi } from '@/lib/api';

interface StrandCardProps {
  strand: Strand;
  onClick?: () => void;
  onFireUpdate?: (strandId: string, fireCount: number, hasUserFired: boolean) => void;
}

export default function StrandCard({ strand, onClick, onFireUpdate }: StrandCardProps) {
  const hasImage = !!strand.imageId && strand.image;
  const hasText = !!strand.content;
  const isVideo = strand.image?.mediaType === 'video' || strand.image?.mimeType?.startsWith('video/');
  const [localFireCount, setLocalFireCount] = useState(strand.fireCount || 0);
  const [localHasUserFired, setLocalHasUserFired] = useState(strand.hasUserFired || false);
  const [firing, setFiring] = useState(false);

  // Update local state when strand prop changes
  useEffect(() => {
    setLocalFireCount(strand.fireCount || 0);
    setLocalHasUserFired(strand.hasUserFired || false);
  }, [strand.fireCount, strand.hasUserFired]);

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

  return (
    <div
      onClick={onClick}
      className={`bg-gray-800 rounded-lg shadow-sm border overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200 ${
        isTextOnly 
          ? 'border-blue-600/50 border-2 shadow-lg shadow-blue-900/20' 
          : 'border-gray-700'
      }`}
    >
      {hasImage && strand.image && (
        <div className="relative aspect-square bg-gray-700 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={strand.image.thumbnailUrl || strand.image.imageUrl || strand.image.mediaUrl || ''}
            alt={strand.image.fileName || (isVideo ? 'Strand video' : 'Strand image')}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="bg-black/60 rounded-full p-3">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              {strand.image.duration && (
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {Math.floor(strand.image.duration / 60)}:{(strand.image.duration % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          )}
          {strand.isPinned && (
            <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
              </svg>
              Pinned
            </div>
          )}
        </div>
      )}
      
      {hasText && (
        <div className={`relative ${isTextOnly ? 'p-6 min-h-[120px] flex items-center' : 'p-4'}`}>
          {isTextOnly && (
            <div className="absolute top-4 left-4 text-blue-400 opacity-50">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
          <p className={`text-gray-100 ${isTextOnly ? 'text-base leading-relaxed pl-8' : 'text-sm line-clamp-3'}`}>
            <LinkText text={strand.content || ''} />
          </p>
        </div>
      )}

      <div className="px-4 pb-4 pt-2 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {strand.user?.profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={strand.user.profilePictureUrl}
                alt={strand.user.displayName}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-blue-400 text-xs font-medium">
                  {strand.user?.displayName?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
            <p className="text-gray-300 text-xs font-medium truncate">
              {strand.user?.displayName || 'Unknown'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFireClick}
              disabled={firing}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
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
            {strand.editedAt && (
              <span className="text-gray-500 text-xs">Edited</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
