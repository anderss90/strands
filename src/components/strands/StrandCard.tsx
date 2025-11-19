'use client';

import { Strand } from '@/types/strand';
import LinkText from '@/components/common/LinkText';

interface StrandCardProps {
  strand: Strand;
  onClick?: () => void;
}

export default function StrandCard({ strand, onClick }: StrandCardProps) {
  const hasImage = !!strand.imageId && strand.image;
  const hasText = !!strand.content;

  return (
    <div
      onClick={onClick}
      className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.98] transition-all duration-200"
    >
      {hasImage && strand.image && (
        <div className="relative aspect-square bg-gray-700 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={strand.image.thumbnailUrl || strand.image.imageUrl}
            alt={strand.image.fileName || 'Strand image'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
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
        <div className="p-4">
          <p className="text-gray-100 text-sm line-clamp-3">
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
          {strand.editedAt && (
            <span className="text-gray-500 text-xs">Edited</span>
          )}
        </div>
      </div>
    </div>
  );
}
