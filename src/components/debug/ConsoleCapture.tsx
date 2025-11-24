'use client';

import { useEffect } from 'react';

/**
 * Global console capture component that runs in the background
 * to capture all console messages and errors, even when the Console page isn't open.
 * Messages are stored in localStorage and can be retrieved by the Console component.
 */
export default function ConsoleCapture() {
  useEffect(() => {
    // Storage key for console messages
    const STORAGE_KEY = 'console_messages';
    const MAX_MESSAGES = 1000;

    // Load existing messages from localStorage
    const loadMessages = (): any[] => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    };

    // Save messages to localStorage
    const saveMessages = (messages: any[]) => {
      try {
        // Keep only last MAX_MESSAGES
        const trimmed = messages.slice(-MAX_MESSAGES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch (error) {
        // If localStorage is full, try to clear old messages
        try {
          const trimmed = messages.slice(-Math.floor(MAX_MESSAGES / 2));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
        } catch {
          // If still failing, clear all
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    // Add message to storage
    const addMessage = (type: string, ...args: any[]) => {
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

      const messages = loadMessages();
      const newMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        type,
        message,
        timestamp: new Date().toISOString(),
        args: args.length > 1 ? args : undefined,
      };

      messages.push(newMessage);
      saveMessages(messages);

      // Also call original console method
      const originalMethodName = type === 'log' ? '__originalLog' :
                                 type === 'error' ? '__originalError' :
                                 type === 'warn' ? '__originalWarn' :
                                 type === 'info' ? '__originalInfo' :
                                 '__originalDebug';
      const original = (console as any)[originalMethodName] || (console as any)[`__original${type.charAt(0).toUpperCase() + type.slice(1)}`];
      if (typeof original === 'function') {
        original(...args);
      } else {
        // Fallback to default console method if original not found
        (console as any)[type](...args);
      }
    };

    // Store original console methods if not already stored
    if (!(console as any).__originalLog) {
      (console as any).__originalLog = console.log;
      (console as any).__originalError = console.error;
      (console as any).__originalWarn = console.warn;
      (console as any).__originalInfo = console.info;
      (console as any).__originalDebug = console.debug;
    }

    // Override console methods
    console.log = (...args: any[]) => {
      addMessage('log', ...args);
    };

    console.error = (...args: any[]) => {
      addMessage('error', ...args);
    };

    console.warn = (...args: any[]) => {
      addMessage('warn', ...args);
    };

    console.info = (...args: any[]) => {
      addMessage('info', ...args);
    };

    console.debug = (...args: any[]) => {
      addMessage('debug', ...args);
    };

    // Capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      addMessage('error', `Unhandled Error: ${event.message}`, event.filename, event.lineno);
    };

    // Capture unhandled promise rejections
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error 
        ? event.reason.message 
        : String(event.reason);
      addMessage('error', `Unhandled Promise Rejection: ${reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Cleanup is not needed - we want to keep capturing even if component unmounts
    // But we'll restore on cleanup if needed
    return () => {
      // Don't restore - let other components use the overridden methods
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // This component doesn't render anything
  return null;
}

