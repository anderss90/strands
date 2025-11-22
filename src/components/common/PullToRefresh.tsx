'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
}

export default function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canPull = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop <= 0) {
        touchStartY.current = e.touches[0].clientY;
        canPull.current = true;
      } else {
        canPull.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPull.current || touchStartY.current === null) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY.current;

      if (distance > 0 && container.scrollTop <= 0) {
        e.preventDefault();
        const pull = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(pull);
        setIsPulling(pull > 10);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setIsPulling(false);
        setPullDistance(threshold);
        
        try {
          await onRefresh();
        } finally {
          setTimeout(() => {
            setPullDistance(0);
            setIsRefreshing(false);
          }, 300);
        }
      } else {
        setPullDistance(0);
        setIsPulling(false);
      }
      
      touchStartY.current = null;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const pullProgress = Math.min(pullDistance / threshold, 1);
  const shouldShowIndicator = pullDistance > 10 || isRefreshing;

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 transition-transform duration-200"
        style={{
          transform: `translateY(${shouldShowIndicator ? pullDistance : -60}px)`,
          opacity: shouldShowIndicator ? 1 : 0,
        }}
      >
        <div className="flex flex-col items-center gap-2 py-2">
          {isRefreshing ? (
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <div
              className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"
              style={{
                transform: `rotate(${pullProgress * 180}deg)`,
                transition: 'transform 0.2s',
              }}
            ></div>
          )}
          <span className="text-xs text-gray-600">
            {isRefreshing ? 'Refreshing...' : pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>
      <div
        style={{
          transform: `translateY(${Math.max(0, pullDistance)}px)`,
          transition: isRefreshing ? 'transform 0.3s' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

