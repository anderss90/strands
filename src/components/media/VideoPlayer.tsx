'use client';

import { useState, useRef, useEffect } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  className?: string;
  autoplay?: boolean;
  controls?: boolean;
  loop?: boolean;
  muted?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export default function VideoPlayer({
  src,
  poster,
  className = '',
  autoplay = false,
  controls = true,
  loop = false,
  muted = false,
  onPlay,
  onPause,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Aggressively prevent autoplay on iOS Safari
    // iOS Safari can autoplay muted videos even when autoplay is false
    if (!autoplay) {
      video.pause();
      // Set currentTime to 0 to prevent any frame from showing
      video.currentTime = 0;
    }

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
      // Ensure video is paused on load (iOS Safari can autoplay muted videos)
      if (!autoplay) {
        video.pause();
        video.currentTime = 0;
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      // Explicitly pause if autoplay is disabled (iOS Safari workaround)
      if (!autoplay) {
        video.pause();
        video.currentTime = 0;
      }
    };

    const handlePlay = () => {
      // If autoplay is disabled and video starts playing, immediately pause it
      // This catches iOS Safari's aggressive autoplay behavior
      if (!autoplay && video.paused === false) {
        video.pause();
        video.currentTime = 0;
        return;
      }
      setIsPlaying(true);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Failed to load video');
      console.error('Video error:', video.error);
    };

    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [onPlay, onPause, onEnded, autoplay]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        controls={controls}
        autoPlay={autoplay}
        loop={loop}
        muted={muted}
        playsInline // Required for iOS to play inline
        preload="none" // Use "none" instead of "metadata" to prevent iOS from loading and potentially autoplaying
        className="w-full h-auto max-h-96 object-contain rounded-lg"
      >
        Your browser does not support the video tag.
      </video>
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
          <div className="text-white text-sm text-center p-4">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                videoRef.current?.load();
              }}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

