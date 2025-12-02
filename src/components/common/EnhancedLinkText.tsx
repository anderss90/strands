'use client';

import { detectUrls, ParsedUrl, isSpotifyUrl, isYouTubeUrl } from '@/lib/utils/url';
import SpotifyEmbed from './SpotifyEmbed';
import YouTubeEmbed from './YouTubeEmbed';

interface EnhancedLinkTextProps {
  text: string;
  className?: string;
}

export default function EnhancedLinkText({ text, className = '' }: EnhancedLinkTextProps) {
  const urls = detectUrls(text);
  const hasSpotifyUrl = urls.some(url => isSpotifyUrl(url.url));
  const hasYouTubeUrl = urls.some(url => isYouTubeUrl(url.url));
  const hasEmbedUrl = hasSpotifyUrl || hasYouTubeUrl;
  
  // Debug logging - always log YouTube-related URLs
  if (urls.length > 0) {
    const urlInfo = urls.map(u => {
      const isYT = isYouTubeUrl(u.url);
      const isSpot = isSpotifyUrl(u.url);
      let hostname = 'unknown';
      try {
        hostname = new URL(u.url).hostname;
      } catch {}
      
      // Always log if it looks like YouTube but wasn't detected
      if (u.url.toLowerCase().includes('youtube') && !isYT) {
        console.warn('EnhancedLinkText - YouTube URL not detected:', { 
          url: u.url, 
          hostname,
          isYouTube: isYT,
          isSpotify: isSpot
        });
      }
      
      return { url: u.url, isYouTube: isYT, isSpotify: isSpot, hostname };
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log('EnhancedLinkText - Detected URLs:', urlInfo);
    }
  }
  
  if (urls.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build array of text segments, links, and embeds
  const parts: (string | ParsedUrl | { type: 'spotify' | 'youtube'; url: ParsedUrl })[] = [];
  let lastIndex = 0;

  // Process all URLs (Spotify, YouTube, and regular) in order
  const allUrls = [...urls].sort((a, b) => a.startIndex - b.startIndex);

  allUrls.forEach((url) => {
    // Add text before URL
    if (url.startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, url.startIndex));
    }
    
    // Add URL (marked as embed type if applicable)
    if (isSpotifyUrl(url.url)) {
      parts.push({ type: 'spotify', url });
    } else if (isYouTubeUrl(url.url)) {
      parts.push({ type: 'youtube', url });
    } else {
      parts.push(url);
    }
    
    lastIndex = url.endIndex;
  });

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If we have embeds, don't apply line-clamp to the container
  // Instead, apply it only to text segments
  // Also ensure overflow is visible for embeds to render properly
  const containerClass = hasEmbedUrl 
    ? className.replace('line-clamp-3', '').trim() + ' overflow-visible'
    : className;

  return (
    <div className={containerClass}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          // Apply line-clamp only to text if className has it and we have embeds
          const textClass = hasEmbedUrl && className.includes('line-clamp-3') ? 'line-clamp-3' : '';
          return <span key={index} className={textClass}>{part}</span>;
        } else if (typeof part === 'object' && 'type' in part) {
          if (part.type === 'spotify') {
            // Render Spotify embed (always show full embed, not truncated)
            const spotifyUrl = part.url;
            return (
              <div key={index} className="my-3">
                <SpotifyEmbed url={spotifyUrl.url} />
              </div>
            );
          } else if (part.type === 'youtube') {
            // Render YouTube embed (always show full embed, not truncated)
            const youtubeUrl = part.url;
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log('EnhancedLinkText - Rendering YouTube embed for URL:', youtubeUrl.url);
            }
            return (
              <div key={index} className="my-3 w-full" style={{ minHeight: '200px' }}>
                <YouTubeEmbed url={youtubeUrl.url} />
              </div>
            );
          }
        } else {
          // Render regular link
          const url = part as ParsedUrl;
          return (
            <a
              key={index}
              href={url.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-blue-400 hover:text-blue-300 underline break-all"
              title={url.url}
            >
              {url.displayUrl}
            </a>
          );
        }
      })}
    </div>
  );
}

