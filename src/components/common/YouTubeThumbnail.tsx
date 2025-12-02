'use client';

import { extractYouTubeVideoId, getYouTubeThumbnailUrls } from '@/lib/utils/url';
import { useState } from 'react';

interface YouTubeThumbnailProps {
  url: string;
  className?: string;
  onClick?: () => void;
}

export default function YouTubeThumbnail({ url, className = '', onClick }: YouTubeThumbnailProps) {
  const videoId = extractYouTubeVideoId(url);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Get thumbnail URLs if videoId exists
  const thumbnailUrls = videoId ? getYouTubeThumbnailUrls(videoId) : null;
  const [currentSrc, setCurrentSrc] = useState(thumbnailUrls?.primary || '');

  if (!videoId || !thumbnailUrls) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
        >
          {url}
        </a>
      </div>
    );
  }

  const { primary, fallback } = thumbnailUrls;

  const handleImageError = () => {
    if (currentSrc === primary) {
      // Try fallback
      setCurrentSrc(fallback);
    } else {
      // Both failed, show error state
      setImageError(true);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      // Default: open YouTube video in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (imageError) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
        >
          {url}
        </a>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg overflow-hidden cursor-pointer group ${className}`}
      onClick={handleClick}
      style={{
        width: '100%',
        aspectRatio: '16/9',
      }}
    >
      {/* Thumbnail image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt="YouTube video thumbnail"
        onError={handleImageError}
        onLoad={() => setImageLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
      />
      
      {/* Loading placeholder */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
          <svg
            className="w-8 h-8 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* YouTube logo badge */}
      <div className="absolute top-2 right-2 bg-black/70 rounded px-2 py-1 flex items-center gap-1">
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
        <span className="text-white text-xs font-medium">YouTube</span>
      </div>
    </div>
  );
}

