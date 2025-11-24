/**
 * Fetch with timeout and retry logic for better error handling
 */

interface FetchWithRetryOptions extends RequestInit {
  timeout?: number; // Timeout in milliseconds (default: 120000 = 2 minutes)
  retries?: number; // Number of retry attempts (default: 2)
  retryDelay?: number; // Delay between retries in milliseconds (default: 1000)
}

/**
 * Fetch with timeout and automatic retry on network errors
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = 120000, // 2 minutes default timeout for large file uploads
    retries = 2,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Check if it was aborted due to timeout
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout / 1000} seconds. Please check your internet connection and try again.`);
        }
        
        // Re-throw network errors to be handled by retry logic
        throw fetchError;
      }
    } catch (error: any) {
      lastError = error;

      // Log the error
      if (attempt === 0) {
        console.error('Fetch error (attempt 1):', {
          url,
          error: error.message || error,
          name: error.name,
          isNetworkError: isNetworkError(error),
        });
      } else {
        console.warn(`Fetch retry attempt ${attempt + 1}/${retries + 1}:`, {
          url,
          error: error.message || error,
        });
      }

      // Don't retry on the last attempt
      if (attempt < retries) {
        // Only retry on network errors, not on server errors (4xx, 5xx)
        if (
          error.name === 'TypeError' ||
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('Failed to fetch')
        ) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
      }

      // If it's not a network error or we've exhausted retries, throw
      console.error('Fetch failed after all retries:', {
        url,
        error: error.message || error,
        attempts: attempt + 1,
      });
      throw error;
    }
  }

  // This shouldn't be reached, but TypeScript needs it
  throw lastError || new Error('Request failed');
}

/**
 * Check if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  
  return (
    error.name === 'TypeError' ||
    error.message?.includes('fetch') ||
    error.message?.includes('network') ||
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('NetworkError') ||
    error.message?.includes('Network request failed')
  );
}

/**
 * Get a user-friendly error message from an error
 */
export function getErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred';

  // Network errors
  if (isNetworkError(error)) {
    if (error.message?.includes('timeout')) {
      return error.message;
    }
    return 'Network error. Please check your internet connection and try again.';
  }

  // Server errors with messages
  if (error.message) {
    return error.message;
  }

  // Default message
  return 'An error occurred. Please try again.';
}

