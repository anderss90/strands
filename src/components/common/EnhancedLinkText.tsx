'use client';

import { detectUrls, ParsedUrl, isSpotifyUrl } from '@/lib/utils/url';
import SpotifyEmbed from './SpotifyEmbed';

interface EnhancedLinkTextProps {
  text: string;
  className?: string;
}

export default function EnhancedLinkText({ text, className = '' }: EnhancedLinkTextProps) {
  const urls = detectUrls(text);
  const hasSpotifyUrl = urls.some(url => isSpotifyUrl(url.url));
  
  if (urls.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build array of text segments, links, and embeds
  const parts: (string | ParsedUrl | { type: 'spotify'; url: ParsedUrl })[] = [];
  let lastIndex = 0;

  // Process all URLs (both Spotify and regular) in order
  const allUrls = [...urls].sort((a, b) => a.startIndex - b.startIndex);

  allUrls.forEach((url) => {
    // Add text before URL
    if (url.startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, url.startIndex));
    }
    
    // Add URL (marked as Spotify if applicable)
    if (isSpotifyUrl(url.url)) {
      parts.push({ type: 'spotify', url });
    } else {
      parts.push(url);
    }
    
    lastIndex = url.endIndex;
  });

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If we have Spotify embeds, don't apply line-clamp to the container
  // Instead, apply it only to text segments
  const containerClass = hasSpotifyUrl ? className.replace('line-clamp-3', '') : className;

  return (
    <div className={containerClass}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          // Apply line-clamp only to text if className has it and we have embeds
          const textClass = hasSpotifyUrl && className.includes('line-clamp-3') ? 'line-clamp-3' : '';
          return <span key={index} className={textClass}>{part}</span>;
        } else if (typeof part === 'object' && 'type' in part && part.type === 'spotify') {
          // Render Spotify embed (always show full embed, not truncated)
          const spotifyUrl = part.url;
          return (
            <div key={index} className="my-3">
              <SpotifyEmbed url={spotifyUrl.url} />
            </div>
          );
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

