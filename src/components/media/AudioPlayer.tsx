'use client';

import { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  className?: string;
  autoplay?: boolean;
  loop?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  fileName?: string;
  duration?: number | null;
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
  src,
  className = '',
  autoplay = false,
  loop = false,
  onPlay,
  onPause,
  onEnded,
  fileName,
  duration: propDuration,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(propDuration || null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadStart = () => {
      setIsLoading(true);
      setError(null);
    };

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      setDuration(audio.duration || propDuration || null);
    };
    
    const handleLoadedData = () => {
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleDurationChange = () => {
      setDuration(audio.duration || propDuration || null);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
      onPlay?.();
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPause?.();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    };

    const handleError = () => {
      setIsLoading(false);
      setError('Failed to load audio');
      console.error('Audio error:', audio.error);
    };
    
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // Set initial loading state based on audio readyState
    if (audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
      setIsLoading(false);
    }

    // Update duration from prop if available
    if (propDuration && !duration) {
      setDuration(propDuration);
    }

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onPlay, onPause, onEnded, propDuration, duration, isDragging]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.error('Failed to play audio:', err);
        setError('Failed to play audio');
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    audio.currentTime = newTime;
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const displayDuration = duration || propDuration || 0;

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        autoPlay={autoplay}
        loop={loop}
        preload="metadata"
        className="hidden"
      />
      
      {error ? (
        <div className="text-red-400 text-sm text-center p-4">
          <p>{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              audioRef.current?.load();
            }}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 min-h-[44px]"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {fileName && (
            <div className="mb-3 text-sm text-gray-300 truncate">
              {fileName}
            </div>
          )}
          
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="flex-shrink-0 w-12 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 rounded-full flex items-center justify-center min-h-[48px] min-w-[48px] transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Progress Bar and Time */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="range"
                  min="0"
                  max={displayDuration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  onMouseDown={handleSeekStart}
                  onMouseUp={handleSeekEnd}
                  onTouchStart={handleSeekStart}
                  onTouchEnd={handleSeekEnd}
                  disabled={!duration || isLoading}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background: `linear-gradient(to right, #2563eb 0%, #2563eb ${progress}%, #374151 ${progress}%, #374151 100%)`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(displayDuration)}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

