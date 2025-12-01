'use client';

import { useState, useRef, useEffect, TouchEvent, MouseEvent, WheelEvent } from 'react';

interface FullscreenZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  maxZoom?: number;
  minZoom?: number;
  doubleTapZoom?: number;
  showControls?: boolean;
}

export default function FullscreenZoomableImage({
  src,
  alt,
  className = '',
  maxZoom = 4,
  minZoom = 1,
  doubleTapZoom = 2.5,
  showControls = true,
}: FullscreenZoomableImageProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenSupported, setIsFullscreenSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTouchDistanceRef = useRef<number | null>(null);
  const touchHandledRef = useRef(false); // Track if touch event already handled fullscreen
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track click timeout to prevent double-click from also triggering single click
  const fullscreenOverlayRef = useRef<HTMLDivElement>(null);

  // Check if we're on iOS and if fullscreen is supported
  useEffect(() => {
    const checkFullscreenSupport = () => {
      // Detect iOS
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(isIOSDevice);

      const doc = document as any;
      // For iOS, we'll use CSS-based fullscreen, so we consider it "supported"
      // For other browsers, check for actual Fullscreen API support
      const isSupported = isIOSDevice || !!(
        doc.fullscreenEnabled ||
        doc.webkitFullscreenEnabled ||
        doc.mozFullScreenEnabled ||
        doc.msFullscreenEnabled
      );
      setIsFullscreenSupported(isSupported);
    };
    checkFullscreenSupport();
  }, []);

  // Listen for fullscreen changes (only for non-iOS browsers)
  useEffect(() => {
    if (isIOS) {
      // For iOS, we handle fullscreen state manually via CSS
      return;
    }

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
      
      // Reset zoom when exiting fullscreen
      if (!isCurrentlyFullscreen) {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        document.body.style.overflow = '';
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isIOS]);

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  // Cleanup body overflow when component unmounts
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (touch1: React.Touch, touch2: React.Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  const handleFullscreen = async () => {
    const element = containerRef.current;
    if (!element) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (isIOS) {
          // iOS doesn't support Fullscreen API for images, use CSS-based fullscreen
          setIsFullscreen(true);
          // Prevent body scroll when in fullscreen
          document.body.style.overflow = 'hidden';
          // Lock orientation if possible (though this may not work in all cases)
          if (screen.orientation && (screen.orientation as any).lock) {
            try {
              await (screen.orientation as any).lock('any');
            } catch (err) {
              // Orientation lock may fail, ignore
            }
          }
        } else {
          // Use native Fullscreen API for other browsers
          if (element.requestFullscreen) {
            await element.requestFullscreen();
          } else if ((element as any).webkitRequestFullscreen) {
            await (element as any).webkitRequestFullscreen();
          } else if ((element as any).mozRequestFullScreen) {
            await (element as any).mozRequestFullScreen();
          } else if ((element as any).msRequestFullscreen) {
            await (element as any).msRequestFullscreen();
          }
        }
      } else {
        // Exit fullscreen
        if (isIOS) {
          // Exit CSS-based fullscreen
          setIsFullscreen(false);
          document.body.style.overflow = '';
          // Reset zoom when exiting fullscreen
          setScale(1);
          setPosition({ x: 0, y: 0 });
          // Unlock orientation
          if (screen.orientation && (screen.orientation as any).unlock) {
            try {
              (screen.orientation as any).unlock();
            } catch (err) {
              // Ignore unlock errors
            }
          }
        } else {
          // Use native Fullscreen API exit
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen();
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
          }
        }
      }
    } catch (error: any) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      // Single touch - prepare for drag or double tap
      const touch = e.touches[0];
      if (scale > 1) {
        setIsDragging(true);
        setDragStart({
          x: touch.clientX - position.x,
          y: touch.clientY - position.y,
        });
      }
    } else if (e.touches.length === 2) {
      // Two touches - pinch zoom
      setIsDragging(false);
      const distance = getDistance(e.touches[0], e.touches[1]);
      lastTouchDistanceRef.current = distance;
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1 && isDragging && scale > 1) {
      // Single touch drag when zoomed
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    } else if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getDistance(e.touches[0], e.touches[1]);
      if (lastTouchDistanceRef.current !== null) {
        const scaleChange = distance / lastTouchDistanceRef.current;
        const newScale = Math.max(minZoom, Math.min(maxZoom, scale * scaleChange));
        
        if (newScale !== scale) {
          const center = getCenter(e.touches[0], e.touches[1]);
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (containerRect) {
            const centerX = center.x - containerRect.left;
            const centerY = center.y - containerRect.top;
            
            const newPosition = {
              x: centerX - (centerX - position.x) * (newScale / scale),
              y: centerY - (centerY - position.y) * (newScale / scale),
            };
            
            setScale(newScale);
            setPosition(newPosition);
          }
        }
        lastTouchDistanceRef.current = distance;
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      lastTouchDistanceRef.current = null;
    }
    
    // Handle single tap and double tap for fullscreen toggle
    if (e.touches.length === 0 && e.changedTouches.length === 1) {
      const now = Date.now();
      const tapDelay = now - lastTap;
      setLastTap(now);

      if (tapDelay < 300 && tapDelay > 0) {
        // Double tap detected - toggle fullscreen
        touchHandledRef.current = true;
        // Clear any pending click timeout
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current);
          clickTimeoutRef.current = null;
        }
        handleFullscreen();
        // Reset touch handled flag after a delay to allow for subsequent interactions
        setTimeout(() => {
          touchHandledRef.current = false;
        }, 300);
      } else if (tapDelay >= 300 || tapDelay === 0) {
        // Single tap - toggle fullscreen if not dragging
        if (!isDragging) {
          touchHandledRef.current = true;
          handleFullscreen();
          // Reset touch handled flag after a delay to prevent click event from firing
          setTimeout(() => {
            touchHandledRef.current = false;
          }, 300);
        }
      }
    }
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    setHasMoved(false);
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    // Check if mouse has moved significantly (more than 5px)
    const moveDistance = Math.sqrt(
      Math.pow(e.clientX - mouseDownPos.x, 2) + Math.pow(e.clientY - mouseDownPos.y, 2)
    );
    if (moveDistance > 5) {
      setHasMoved(true);
    }
    
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Reset hasMoved after a short delay to allow click event to fire
    setTimeout(() => {
      setHasMoved(false);
    }, 100);
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (isFullscreen && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(minZoom, Math.min(maxZoom, scale * delta));
      
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const centerX = e.clientX - containerRect.left;
        const centerY = e.clientY - containerRect.top;
        
        const newPosition = {
          x: centerX - (centerX - position.x) * (newScale / scale),
          y: centerY - (centerY - position.y) * (newScale / scale),
        };
        
        setScale(newScale);
        setPosition(newPosition);
      }
    }
  };

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    // Skip if touch event already handled this (prevents duplicate calls on touch devices)
    if (touchHandledRef.current) {
      return;
    }
    
    // Toggle fullscreen on single click if:
    // - Mouse hasn't moved (wasn't a drag)
    // - Not currently dragging
    if (!hasMoved && !isDragging) {
      e.stopPropagation();
      // Delay to check if this is part of a double click
      clickTimeoutRef.current = setTimeout(() => {
        handleFullscreen();
        clickTimeoutRef.current = null;
      }, 200);
    }
  };

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    // Skip if touch event already handled this (prevents duplicate calls on touch devices)
    if (touchHandledRef.current) {
      return;
    }
    
    // Toggle fullscreen on double click
    e.stopPropagation();
    // Clear any pending single click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    handleFullscreen();
  };

  const handleZoomIn = () => {
    const newScale = Math.min(maxZoom, scale * 1.5);
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;
      
      setPosition({
        x: centerX - (centerX - position.x) * (newScale / scale),
        y: centerY - (centerY - position.y) * (newScale / scale),
      });
    }
    setScale(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(minZoom, scale * 0.75);
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;
      
      setPosition({
        x: centerX - (centerX - position.x) * (newScale / scale),
        y: centerY - (centerY - position.y) * (newScale / scale),
      });
    }
    setScale(newScale);
  };

  const handleReset = () => {
    setScale(minZoom);
    setPosition({ x: 0, y: 0 });
  };

  // For iOS fullscreen, we need a wrapper overlay
  if (isIOS && isFullscreen) {
    return (
      <div
        ref={fullscreenOverlayRef}
        className="fixed inset-0 bg-black z-[9999] flex items-center justify-center"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          minHeight: '-webkit-fill-available', // iOS Safari support
          zIndex: 9999,
          touchAction: 'none', // Prevent default touch behaviors
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div
          ref={containerRef}
          className="relative w-full h-full overflow-hidden touch-none"
          style={{ 
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
            touchAction: 'none',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="w-full h-full flex items-center justify-center"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imageRef}
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
            />
          </div>
          
          {/* Zoom Controls - only show in fullscreen */}
          {showControls && (
            <>
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
                <button
                  onClick={handleZoomIn}
                  disabled={scale >= maxZoom}
                  className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Zoom in"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <button
                  onClick={handleZoomOut}
                  disabled={scale <= minZoom}
                  className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Zoom out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button
                  onClick={handleReset}
                  disabled={scale <= minZoom}
                  className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Reset zoom"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              
              {/* Exit fullscreen button - top right */}
              <button
                onClick={handleFullscreen}
                className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 z-10 flex items-center justify-center"
                title="Exit fullscreen"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              {/* Zoom indicator */}
              {scale > minZoom && (
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs z-10">
                  {Math.round(scale * 100)}%
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden touch-none ${className} ${isFullscreen ? 'bg-black' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{ 
        cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
      }}
    >
      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
        className="w-full h-full flex items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain select-none"
          draggable={false}
        />
      </div>
      
      {/* Fullscreen button - only show when not in fullscreen */}
      {!isFullscreen && isFullscreenSupported && showControls && (
        <button
          onClick={handleFullscreen}
          className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 z-10 flex items-center justify-center"
          title="Enter fullscreen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      )}

      {/* Zoom Controls - only show in fullscreen */}
      {isFullscreen && showControls && (
        <>
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
            <button
              onClick={handleZoomIn}
              disabled={scale >= maxZoom}
              className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button
              onClick={handleZoomOut}
              disabled={scale <= minZoom}
              className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={handleReset}
              disabled={scale <= minZoom}
              className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              title="Reset zoom"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          {/* Exit fullscreen button - top right */}
          <button
            onClick={handleFullscreen}
            className="absolute top-4 right-4 bg-black/70 text-white p-3 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 z-10 flex items-center justify-center"
            title="Exit fullscreen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Zoom indicator */}
          {scale > minZoom && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs z-10">
              {Math.round(scale * 100)}%
            </div>
          )}
        </>
      )}
    </div>
  );
}

