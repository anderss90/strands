'use client';

import { useState, useEffect, useRef } from 'react';

interface SpotifyEmbedProps {
  url: string;
  className?: string;
}

interface SpotifyOEmbedResponse {
  html: string;
  width: number;
  height: number;
  version: string;
  provider_name: string;
  provider_url: string;
  type: string;
  title?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

export default function SpotifyEmbed({ url, className = '' }: SpotifyEmbedProps) {
  const [embedHtml, setEmbedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchEmbed = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Spotify oEmbed API endpoint
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(oembedUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch Spotify embed');
        }
        
        const data: SpotifyOEmbedResponse = await response.json();
        
        if (data.html) {
          setEmbedHtml(data.html);
        } else {
          throw new Error('No embed HTML received');
        }
      } catch (err: any) {
        console.error('Error fetching Spotify embed:', err);
        setError(err.message || 'Failed to load Spotify embed');
      } finally {
        setLoading(false);
      }
    };

    fetchEmbed();
  }, [url]);

  // Handle iframe injection safely
  useEffect(() => {
    if (embedHtml && containerRef.current) {
      // Clear previous content
      containerRef.current.innerHTML = '';
      
      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = embedHtml;
      
      // Find the iframe
      const iframe = tempDiv.querySelector('iframe');
      if (iframe) {
        // Make iframe responsive and styled
        iframe.style.width = '100%';
        iframe.style.height = '352px'; // Spotify's default height
        iframe.style.border = '0';
        iframe.style.borderRadius = '12px';
        iframe.setAttribute('allow', 'encrypted-media');
        
        // Append to container
        containerRef.current.appendChild(iframe);
      }
    }
  }, [embedHtml]);

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 flex items-center justify-center min-h-[200px] ${className}`}>
        <div className="text-gray-400 text-sm">Loading Spotify player...</div>
      </div>
    );
  }

  if (error) {
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

  return (
    <div
      ref={containerRef}
      className={`spotify-embed-container ${className}`}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
      }}
    />
  );
}

