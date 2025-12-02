// URL detection and processing utilities

export interface ParsedUrl {
  url: string;
  displayUrl: string;
  domain: string;
  startIndex: number;
  endIndex: number;
}

// URL regex pattern - matches http, https, and www URLs
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/gi;

/**
 * Detects URLs in text and returns them with their positions
 */
export function detectUrls(text: string): ParsedUrl[] {
  const urls: ParsedUrl[] = [];
  const matches = Array.from(text.matchAll(URL_REGEX));
  
  // Common trailing punctuation that should be stripped from URLs
  // But be careful not to strip punctuation that's part of the URL (like in query params)
  const trailingPunctuation = /[.,;:!?)\]}>'"`]+$/;
  
  for (const match of matches) {
    let url = match[0];
    let displayUrl = url;
    const originalMatch = url;
    
    // Strip trailing punctuation from URLs
    // Only strip if it's at the very end and appears to be sentence punctuation
    // Don't strip if it's part of the URL structure (like in query params or paths)
    if (url.includes('://')) {
      // For URLs with protocol, check if trailing chars are punctuation
      // Only strip if they're clearly sentence-ending punctuation
      const cleaned = url.replace(trailingPunctuation, '');
      // Only use cleaned version if it's still a valid URL structure
      if (cleaned.length < url.length && cleaned.match(/^https?:\/\/[^\s]+$/)) {
        url = cleaned;
      }
    }
    
    // Add https:// if missing
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    } else if (!url.match(/^https?:\/\//i)) {
      // If it looks like a domain but no protocol, add https://
      if (url.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/)) {
        url = 'https://' + url;
      } else {
        continue; // Skip if it doesn't look like a valid URL
      }
    }
    
    // Extract domain for display
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      
      // Create shortened display URL
      // Show domain + path (max 50 chars total)
      const path = urlObj.pathname + urlObj.search;
      if (domain.length + path.length <= 50) {
        displayUrl = domain + path;
      } else {
        // Truncate path if needed
        const maxPathLength = Math.max(20, 50 - domain.length);
        displayUrl = domain + path.substring(0, maxPathLength) + '...';
      }
      
      // Calculate end index based on the original match or the cleaned URL
      // If we stripped trailing punctuation, adjust the end index
      const urlLength = url.length;
      const originalLength = originalMatch.length;
      const strippedChars = originalLength - urlLength;
      const endIndex = match.index! + originalLength - strippedChars;
      
      urls.push({
        url,
        displayUrl,
        domain,
        startIndex: match.index!,
        endIndex: endIndex,
      });
    } catch (e) {
      // Invalid URL, skip
      continue;
    }
  }
  
  return urls;
}

/**
 * Shortens a URL for display purposes
 */
export function shortenUrl(url: string, maxLength: number = 50): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname + urlObj.search;
    
    if (domain.length + path.length <= maxLength) {
      return domain + path;
    }
    
    // Truncate path
    const maxPathLength = Math.max(20, maxLength - domain.length);
    return domain + path.substring(0, maxPathLength) + '...';
  } catch {
    // If URL parsing fails, just truncate the original string
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  }
}

/**
 * Extracts domain from URL
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Checks if a URL is a Spotify URL (track, album, playlist, artist, etc.)
 */
export function isSpotifyUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return (
      hostname === 'open.spotify.com' ||
      hostname === 'spotify.com' ||
      hostname === 'www.spotify.com' ||
      hostname === 'www.open.spotify.com'
    );
  } catch {
    return false;
  }
}

/**
 * Checks if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    // Handle URLs that might not have protocol
    let urlToCheck = url;
    if (!urlToCheck.match(/^https?:\/\//i)) {
      if (urlToCheck.startsWith('www.')) {
        urlToCheck = 'https://' + urlToCheck;
      } else if (urlToCheck.startsWith('youtu.be') || urlToCheck.startsWith('youtube.com') || urlToCheck.startsWith('m.youtube.com')) {
        urlToCheck = 'https://' + urlToCheck;
      }
    }
    
    const urlObj = new URL(urlToCheck);
    const hostname = urlObj.hostname.toLowerCase();
    const isYouTube = (
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'youtu.be' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtube-nocookie.com' ||
      hostname === 'www.youtube-nocookie.com'
    );
    
    // Debug logging
    if (process.env.NODE_ENV === 'development' && url.includes('youtube') && !isYouTube) {
      console.log('isYouTubeUrl - URL not recognized:', { original: url, normalized: urlToCheck, hostname });
    }
    
    return isYouTube;
  } catch (error) {
    // Debug logging
    if (process.env.NODE_ENV === 'development' && url.includes('youtube')) {
      console.log('isYouTubeUrl - Error parsing URL:', { url, error });
    }
    return false;
  }
}

/**
 * Extracts YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Handle youtu.be short URLs
    if (hostname === 'youtu.be') {
      const videoId = urlObj.pathname.substring(1); // Remove leading slash
      return videoId || null;
    }
    
    // Handle youtube.com URLs
    if (hostname.includes('youtube.com')) {
      // Check for /embed/ path
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.split('/embed/')[1] || null;
      }
      
      // Check for /watch?v= format
      if (urlObj.pathname === '/watch' || urlObj.pathname === '/watch/') {
        return urlObj.searchParams.get('v') || null;
      }
      
      // Check for /v/ format
      if (urlObj.pathname.startsWith('/v/')) {
        return urlObj.pathname.split('/v/')[1] || null;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

