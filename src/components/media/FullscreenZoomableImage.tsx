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
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const lastTouchDistanceRef = useRef<number | null>(null);

  // Check if fullscreen is supported
  useEffect(() => {
    const checkFullscreenSupport = () => {
      const doc = document as any;
      const isSupported = !!(
        doc.fullscreenEnabled ||
        doc.webkitFullscreenEnabled ||
        doc.mozFullScreenEnabled ||
        doc.msFullscreenEnabled
      );
      setIsFullscreenSupported(isSupported);
    };
    checkFullscreenSupport();
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
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
  }, []);

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

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
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          await (element as any).webkitRequestFullscreen();
        } else if ((element as any).mozRequestFullScreen) {
          await (element as any).mozRequestFullScreen();
        } else if ((element as any).msRequestFullscreen) {
          await (element as any).msRequestFullscreen();
        }
      } else {
        // Exit fullscreen
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
    
    // Handle single tap for fullscreen or double tap for zoom
    if (e.touches.length === 0 && e.changedTouches.length === 1) {
      const now = Date.now();
      const tapDelay = now - lastTap;
      setLastTap(now);

      if (tapDelay < 300 && tapDelay > 0) {
        // Double tap detected
        if (isFullscreen) {
          // In fullscreen: toggle zoom
          const touch = e.changedTouches[0];
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (containerRect) {
            const centerX = touch.clientX - containerRect.left;
            const centerY = touch.clientY - containerRect.top;
            
            if (scale > minZoom) {
              // Zoom out
              setScale(minZoom);
              setPosition({ x: 0, y: 0 });
            } else {
              // Zoom in
              const newScale = Math.min(maxZoom, doubleTapZoom);
              setScale(newScale);
              setPosition({
                x: centerX - (centerX - position.x) * (newScale / scale),
                y: centerY - (centerY - position.y) * (newScale / scale),
              });
            }
          }
        }
      } else if (tapDelay >= 300 || tapDelay === 0) {
        // Single tap - enter fullscreen if not already in fullscreen and not zoomed
        if (!isFullscreen && scale === 1 && !isDragging) {
          handleFullscreen();
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
    // Only trigger fullscreen on single click if:
    // - Not in fullscreen already
    // - Not zoomed
    // - Mouse hasn't moved (wasn't a drag)
    // - Not currently dragging
    if (!isFullscreen && scale === 1 && !hasMoved && !isDragging) {
      e.stopPropagation();
      handleFullscreen();
    }
  };

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isFullscreen) {
      // Toggle zoom when in fullscreen
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const centerX = e.clientX - containerRect.left;
        const centerY = e.clientY - containerRect.top;
        
        if (scale > minZoom) {
          setScale(minZoom);
          setPosition({ x: 0, y: 0 });
        } else {
          const newScale = Math.min(maxZoom, doubleTapZoom);
          setScale(newScale);
          setPosition({
            x: centerX - (centerX - position.x) * (newScale / scale),
            y: centerY - (centerY - position.y) * (newScale / scale),
          });
        }
      }
    }
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
          className="absolute top-4 right-4 bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 z-10"
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
              className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button
              onClick={handleZoomOut}
              disabled={scale <= minZoom}
              className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            {scale > minZoom && (
              <button
                onClick={handleReset}
                className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200"
                title="Reset zoom"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <button
              onClick={handleFullscreen}
              className="bg-black/70 text-white p-2 rounded-full hover:bg-black/90 active:scale-95 transition-all duration-200"
              title="Exit fullscreen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6h12v12" />
              </svg>
            </button>
          </div>
          
          {/* Zoom indicator */}
          {scale > minZoom && (
            <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs z-10">
              {Math.round(scale * 100)}%
            </div>
          )}
        </>
      )}
    </div>
  );
}

