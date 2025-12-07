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

    // Track if user has interacted with the page
    let userInteracted = false;

    const handleUserInteraction = () => {
      userInteracted = true;
      // Remove listeners after first interaction
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
    };

    document.addEventListener('touchstart', handleUserInteraction, { once: true });
    document.addEventListener('click', handleUserInteraction, { once: true });

    // Prevent autoplay on iOS Safari
    if (!autoplay) {
      video.pause();
      video.currentTime = 0;
    }

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleLoadedMetadata = () => {
      // Video metadata loaded - video is ready to play
      setIsLoading(false);
      if (!autoplay) {
        video.pause();
        video.currentTime = 0;
      }
    };
    
    // Also handle when video data is loaded (fired before canplay sometimes)
    const handleLoadedData = () => {
      setIsLoading(false);
      if (!autoplay) {
        video.pause();
        video.currentTime = 0;
      }
    };

    const handleCanPlay = () => {
      // Video can play - ensure loading is false
      setIsLoading(false);
      // Explicitly pause if autoplay is disabled (iOS Safari workaround)
      if (!autoplay) {
        video.pause();
        video.currentTime = 0;
      }
    };

    const handlePlay = () => {
      // Allow playback - if user clicked play, they want to watch
      // Only prevent autoplay, not user-initiated playback
      setIsPlaying(true);
      setIsLoading(false); // Video is playing, no longer loading
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

    // Track clicks on video to mark user interaction
    const handleVideoClick = () => {
      userInteracted = true;
    };
    
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('click', handleVideoClick);
    
    // Set initial loading state based on video readyState
    // If video already has data loaded, don't show loading spinner
    if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
      setIsLoading(false);
    }

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('click', handleUserInteraction);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('click', handleVideoClick);
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
        preload="metadata" // Load metadata so video can be played when user clicks
        className="w-full h-auto max-h-96 object-contain rounded-lg"
        onLoadedMetadata={() => {
          // Ensure video is paused after metadata loads (prevents autoplay)
          if (!autoplay && videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
        }}
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

