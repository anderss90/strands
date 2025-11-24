'use client';

import { useState, useEffect, useRef } from 'react';

interface ConsoleMessage {
  id: string;
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: Date;
  args?: any[];
}

export default function Console() {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIdRef = useRef(0);

  useEffect(() => {
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    // Override console methods
    const addMessage = (type: ConsoleMessage['type'], ...args: any[]) => {
      const message = args
        .map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

      setMessages(prev => {
        const newMessage: ConsoleMessage = {
          id: `msg-${messageIdRef.current++}`,
          type,
          message,
          timestamp: new Date(),
          args: args.length > 1 ? args : undefined,
        };
        return [...prev, newMessage].slice(-1000); // Keep last 1000 messages
      });
    };

    console.log = (...args: any[]) => {
      originalLog(...args);
      addMessage('log', ...args);
    };

    console.error = (...args: any[]) => {
      originalError(...args);
      addMessage('error', ...args);
    };

    console.warn = (...args: any[]) => {
      originalWarn(...args);
      addMessage('warn', ...args);
    };

    console.info = (...args: any[]) => {
      originalInfo(...args);
      addMessage('info', ...args);
    };

    console.debug = (...args: any[]) => {
      originalDebug(...args);
      addMessage('debug', ...args);
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      addMessage('error', `Unhandled Error: ${event.message}`, event.filename, event.lineno);
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      addMessage('error', `Unhandled Promise Rejection: ${event.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Restore original methods on cleanup
    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      console.debug = originalDebug;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
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
                  {msg.timestamp.toLocaleTimeString()}
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

