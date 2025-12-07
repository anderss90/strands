'use client';

import { detectUrls, ParsedUrl, isSpotifyUrl, isYouTubeUrl } from '@/lib/utils/url';
import { isGoogleMapsUrl, parseGoogleMapsUrl } from '@/lib/utils/linkDetection';
import SpotifyEmbed from './SpotifyEmbed';
import YouTubeEmbed from './YouTubeEmbed';
import YouTubeThumbnail from './YouTubeThumbnail';

interface EnhancedLinkTextProps {
  text: string;
  className?: string;
  showThumbnails?: boolean; // If true, show YouTube thumbnails instead of embeds (for feed view)
}

export default function EnhancedLinkText({ text, className = '', showThumbnails = false }: EnhancedLinkTextProps) {
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
      
      // Always log YouTube URLs to help debug
      if (u.url.toLowerCase().includes('youtube')) {
        console.log('EnhancedLinkText - YouTube URL detected:', { 
          url: u.url, 
          hostname,
          isYouTube: isYT,
          isSpotify: isSpot,
          willRenderAsEmbed: isYT
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
    // Check YouTube first since it's more common
    const isYT = isYouTubeUrl(url.url);
    const isSpot = isSpotifyUrl(url.url);
    
    if (isYT) {
      console.log('EnhancedLinkText - Adding YouTube embed to parts:', url.url);
      parts.push({ type: 'youtube', url });
    } else if (isSpot) {
      parts.push({ type: 'spotify', url });
    } else {
      // Log if it looks like YouTube but wasn't recognized
      if (url.url.toLowerCase().includes('youtube')) {
        console.warn('EnhancedLinkText - YouTube URL not recognized, rendering as regular link:', {
          url: url.url,
          isYT: isYT,
          isSpot: isSpot,
          hostname: (() => {
            try {
              return new URL(url.url).hostname;
            } catch {
              return 'unknown';
            }
          })()
        });
      }
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
            // Render YouTube thumbnail or embed based on showThumbnails prop
            const youtubeUrl = part.url;
            if (showThumbnails) {
              // Show thumbnail in feed view
              return (
                <div key={index} className="my-3 w-full">
                  <YouTubeThumbnail url={youtubeUrl.url} />
                </div>
              );
            } else {
              // Show full embed in detail view
              console.log('EnhancedLinkText - Rendering YouTube embed for URL:', youtubeUrl.url);
              return (
                <div 
                  key={index} 
                  className="my-3 w-full" 
                  style={{ 
                    minHeight: '200px',
                    width: '100%',
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  <YouTubeEmbed url={youtubeUrl.url} />
                </div>
              );
            }
          }
        } else {
          // Render regular link or Google Maps link
          const url = part as ParsedUrl;
          const isMaps = isGoogleMapsUrl(url.url);
          const mapsInfo = isMaps ? parseGoogleMapsUrl(url.url) : null;
          
          if (isMaps && mapsInfo) {
            // Render Google Maps link with special styling
            return (
              <a
                key={index}
                href={mapsInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  // Try to open in Maps app on mobile
                  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                    // For iOS, try maps:// protocol
                    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                      const mapsUrl = mapsInfo.url.replace(/^https?:\/\//, 'maps://');
                      window.location.href = mapsUrl;
                      e.preventDefault();
                    }
                  }
                }}
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 underline break-all"
                title={mapsInfo.url}
              >
                <span className="text-base">📍</span>
                <span>{mapsInfo.displayText}</span>
              </a>
            );
          }
          
          // Render regular link
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

