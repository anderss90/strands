/**
 * Detects and formats Google Maps links
 */

export interface GoogleMapsLink {
  url: string;
  displayText: string;
  locationName?: string;
  coordinates?: { lat: number; lng: number };
}

/**
 * Detects if a URL is a Google Maps link
 */
export function isGoogleMapsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check for various Google Maps URL patterns
    return (
      hostname.includes('maps.google.com') ||
      hostname.includes('google.com/maps') ||
      hostname.includes('goo.gl/maps') ||
      url.startsWith('geo:')
    );
  } catch {
    // If URL parsing fails, check string patterns
    return (
      url.includes('maps.google.com') ||
      url.includes('google.com/maps') ||
      url.includes('goo.gl/maps') ||
      url.startsWith('geo:')
    );
  }
}

/**
 * Extracts location information from a Google Maps URL
 */
export function parseGoogleMapsUrl(url: string): GoogleMapsLink | null {
  if (!isGoogleMapsUrl(url)) {
    return null;
  }

  try {
    // Handle geo: protocol
    if (url.startsWith('geo:')) {
      const geoMatch = url.match(/^geo:(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (geoMatch) {
        const lat = parseFloat(geoMatch[1]);
        const lng = parseFloat(geoMatch[2]);
        return {
          url: `https://www.google.com/maps?q=${lat},${lng}`,
          displayText: `📍 Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          coordinates: { lat, lng },
        };
      }
    }

    const urlObj = new URL(url);
    
    // Try to extract location name from query parameters
    const q = urlObj.searchParams.get('q');
    const placeId = urlObj.searchParams.get('place_id');
    const ll = urlObj.searchParams.get('ll'); // lat,lng format
    
    let locationName: string | undefined;
    let coordinates: { lat: number; lng: number } | undefined;

    if (q) {
      locationName = decodeURIComponent(q);
    }

    if (ll) {
      const [lat, lng] = ll.split(',').map(parseFloat);
      if (!isNaN(lat) && !isNaN(lng)) {
        coordinates = { lat, lng };
      }
    }

    // Extract from pathname for /maps/place/ URLs
    const placeMatch = url.match(/\/maps\/place\/([^/]+)/);
    if (placeMatch && !locationName) {
      locationName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }

    // Build display text
    let displayText = '📍 Location';
    if (locationName) {
      displayText = `📍 ${locationName}`;
    } else if (coordinates) {
      displayText = `📍 Location (${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)})`;
    }

    return {
      url,
      displayText,
      locationName,
      coordinates,
    };
  } catch (error) {
    // If parsing fails, return basic info
    return {
      url,
      displayText: '📍 Location',
    };
  }
}

/**
 * Detects and formats Google Maps links in text
 * Returns an array of detected links with their positions
 */
export function detectGoogleMapsLinks(text: string): Array<{
  link: GoogleMapsLink;
  startIndex: number;
  endIndex: number;
}> {
  const results: Array<{
    link: GoogleMapsLink;
    startIndex: number;
    endIndex: number;
  }> = [];

  // URL pattern that matches http/https URLs and geo: protocol
  const urlPattern = /(https?:\/\/[^\s]+|geo:[^\s]+)/gi;
  let match;

  while ((match = urlPattern.exec(text)) !== null) {
    const url = match[0];
    if (isGoogleMapsUrl(url)) {
      const parsed = parseGoogleMapsUrl(url);
      if (parsed) {
        results.push({
          link: parsed,
          startIndex: match.index,
          endIndex: match.index + url.length,
        });
      }
    }
  }

  return results;
}

