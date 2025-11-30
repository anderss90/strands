'use client';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorMessage({ message, onDismiss, className = '' }: ErrorMessageProps) {
  return (
    <div
      className={`bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm mb-4 flex items-center justify-between ${className}`}
      role="alert"
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-4 text-red-400 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
          aria-label="Dismiss error"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

