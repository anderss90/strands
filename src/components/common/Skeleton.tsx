'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export default function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full aspect-square',
    rectangular: 'rounded',
  };

  return (
    <div
      className={`skeleton bg-gray-200 ${variantClasses[variant]} ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

