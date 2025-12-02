'use client';

import { useState, useEffect, useRef } from 'react';
import { extractYouTubeVideoId } from '@/lib/utils/url';

interface YouTubeEmbedProps {
  url: string;
  className?: string;
}

export default function YouTubeEmbed({ url, className = '' }: YouTubeEmbedProps) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = extractYouTubeVideoId(url);
    if (id) {
      setVideoId(id);
      setError(null);
    } else {
      setError('Invalid YouTube URL');
    }
  }, [url]);

  if (error || !videoId) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>
      </div>
    );
  }

  // YouTube embed URL with privacy-enhanced mode
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

  return (
    <div
      ref={containerRef}
      className={`youtube-embed-container ${className}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          position: 'relative',
          paddingBottom: '56.25%', // 16:9 aspect ratio
          height: 0,
          overflow: 'hidden',
          borderRadius: '12px',
        }}
      >
        <iframe
          src={embedUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="YouTube video player"
        />
      </div>
    </div>
  );
}

