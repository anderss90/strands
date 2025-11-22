'use client';

import { detectUrls, ParsedUrl } from '@/lib/utils/url';

interface LinkTextProps {
  text: string;
  className?: string;
}

export default function LinkText({ text, className = '' }: LinkTextProps) {
  const urls = detectUrls(text);
  
  if (urls.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build array of text segments and links
  const parts: (string | ParsedUrl)[] = [];
  let lastIndex = 0;

  urls.forEach((url) => {
    // Add text before URL
    if (url.startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, url.startIndex));
    }
    // Add URL
    parts.push(url);
    lastIndex = url.endIndex;
  });

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <span key={index}>{part}</span>;
        } else {
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
    </span>
  );
}

