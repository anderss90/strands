'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatTime } from '@/lib/utils/dateFormat';

interface ConsoleMessage {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  args?: any[];
}

const STORAGE_KEY = 'console_messages';

export default function Console() {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);
  const router = useRouter();

  // Load messages from localStorage on mount
  useEffect(() => {
    const loadMessages = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const converted = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(converted);
        }
      } catch (error) {
        console.error('Failed to load console messages from storage:', error);
      }
    };

    loadMessages();

    // Listen for new messages from ConsoleCapture
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const converted = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(converted);
        } catch (error) {
          console.error('Failed to parse console messages from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll for changes (in case storage event doesn't fire for same-window updates)
    const interval = setInterval(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setMessages(prev => {
            // Only update if messages have changed
            if (prev.length !== parsed.length || 
                (prev.length > 0 && prev[prev.length - 1].id !== parsed[parsed.length - 1].id)) {
              return parsed.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              }));
            }
            return prev;
          });
        }
      } catch (error) {
        // Ignore errors
      }
    }, 500); // Check every 500ms

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const clearMessages = () => {
    setMessages([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear console messages from storage:', error);
    }
  };

  const getMessageColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      case 'debug':
        return 'text-gray-400';
      default:
        return 'text-gray-300';
    }
  };

  const getMessageBg = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error':
        return 'bg-red-900/20 border-red-700/50';
      case 'warn':
        return 'bg-yellow-900/20 border-yellow-700/50';
      case 'info':
        return 'bg-blue-900/20 border-blue-700/50';
      default:
        return 'bg-gray-800/50 border-gray-700/50';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-100">Console</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/console/changelog')}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors min-h-[32px]"
          >
            Changelog
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-600 rounded focus:ring-blue-500 bg-gray-700"
            />
            Auto-scroll
          </label>
          <button
            onClick={clearMessages}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors min-h-[32px]"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-900 p-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Console messages will appear here.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded border text-sm font-mono ${getMessageBg(msg.type)} ${getMessageColor(msg.type)}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs text-gray-500 min-w-[60px]">
                  {formatTime(msg.timestamp)}
                </span>
                <span className="text-xs font-semibold min-w-[50px] uppercase">
                  {msg.type}:
                </span>
                <div className="flex-1 break-words whitespace-pre-wrap">
                  {msg.message}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer with stats */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-400">
        Total messages: {messages.length} | Errors: {messages.filter(m => m.type === 'error').length} | Warnings: {messages.filter(m => m.type === 'warn').length}
      </div>
    </div>
  );
}

