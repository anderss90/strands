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
  
  for (const match of matches) {
    let url = match[0];
    let displayUrl = url;
    
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
      
      urls.push({
        url,
        displayUrl,
        domain,
        startIndex: match.index!,
        endIndex: match.index! + match[0].length,
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

