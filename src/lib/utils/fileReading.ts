/**
 * File reading utilities with retry logic for Android gallery file picker issues
 * Handles permission problems that occur after file reference is acquired
 */

export interface FileReadResult {
  success: boolean;
  data?: ArrayBuffer | Blob | string;
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that a file is readable before processing
 * Checks file size, attempts to read first byte, and validates file type
 */
export async function validateFileReadable(file: File): Promise<FileValidationResult> {
  try {
    // Check file size
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File is empty (0 bytes)',
      };
    }

    // Check if file size is valid (not NaN or Infinity)
    if (!isFinite(file.size) || file.size < 0) {
      return {
        valid: false,
        error: 'Invalid file size',
      };
    }

    // Attempt to read first byte to verify accessibility
    // This helps catch permission issues early
    try {
      const slice = file.slice(0, 1);
      await slice.arrayBuffer();
    } catch (sliceError: any) {
      const errorMessage = sliceError?.message || 'Unknown error';
      if (errorMessage.includes('permission') || errorMessage.includes('could not be read')) {
        return {
          valid: false,
          error: 'File permission error. Please try selecting the file again.',
        };
      }
      return {
        valid: false,
        error: `File is not accessible: ${errorMessage}`,
      };
    }

    // Basic file type validation (check if name has extension)
    const hasExtension = file.name.includes('.') && file.name.split('.').length > 1;
    if (!hasExtension) {
      // This is a warning, not a blocker
    }

    return { valid: true };
  } catch (error: any) {
    return {
      valid: false,
      error: error?.message || 'Failed to validate file',
    };
  }
}

/**
 * Reads a file as ArrayBuffer with retry logic
 * Implements exponential backoff to handle Android permission issues
 */
export async function readFileAsArrayBuffer(
  file: File,
  maxRetries: number = 3,
  retryDelays: number[] = [100, 300, 500]
): Promise<FileReadResult> {
  const errors: string[] = [];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Validate file before reading
      const validation = await validateFileReadable(file);
      if (!validation.valid) {
        // If validation fails, don't retry - the file is likely invalid
        return {
          success: false,
          error: validation.error || 'File validation failed',
        };
      }

      // Attempt to read file with timeout
      const readPromise = file.arrayBuffer();
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('File read timeout')), 5000);
      });

      const arrayBuffer = await Promise.race([readPromise, timeoutPromise]);

      return {
        success: true,
        data: arrayBuffer,
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      errors.push(`Attempt ${attempt + 1}: ${errorMessage}`);

      // Check if it's a permission-related error
      const isPermissionError =
        errorMessage.includes('permission') ||
        errorMessage.includes('could not be read') ||
        errorMessage.includes('NotReadableError') ||
        errorMessage.includes('SecurityError');

      // If it's not a permission error and not the last attempt, continue
      // If it's a permission error, we'll retry with delay
      if (attempt < maxRetries - 1) {
        const delay = retryDelays[attempt] || 100 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Last attempt failed
      if (isPermissionError) {
        return {
          success: false,
          error: 'File permission error. The file may have been moved or deleted. Please try selecting it again.',
        };
      }

      return {
        success: false,
        error: `Failed to read file after ${maxRetries} attempts: ${errors.join('; ')}`,
      };
    }
  }

  return {
    success: false,
    error: `Failed to read file after ${maxRetries} attempts`,
  };
}

/**
 * Reads a file or blob as DataURL using FileReader with retry logic
 * Wraps FileReader in Promise with retry mechanism
 */
export async function readFileAsDataURL(
  file: File | Blob,
  maxRetries: number = 3,
  retryDelays: number[] = [100, 300, 500]
): Promise<FileReadResult> {
  const errors: string[] = [];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Validate file before reading (only for File objects, not Blobs)
      if (file instanceof File) {
        const validation = await validateFileReadable(file);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.error || 'File validation failed',
          };
        }
      } else if (file instanceof Blob) {
        // For Blobs, just check size
        if (file.size === 0) {
          return {
            success: false,
            error: 'Blob is empty (0 bytes)',
          };
        }
      }

      // Use FileReader with Promise wrapper
      const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        let timeoutId: NodeJS.Timeout | null = null;

        // Set timeout (5 seconds)
        timeoutId = setTimeout(() => {
          reader.abort();
          reject(new Error('FileReader timeout'));
        }, 5000);

        reader.onloadend = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (reader.result) {
            resolve(reader.result as string);
          } else {
            reject(new Error('FileReader: No result'));
          }
        };

        reader.onerror = () => {
          if (timeoutId) clearTimeout(timeoutId);
          reject(reader.error || new Error('FileReader error'));
        };

        reader.readAsDataURL(file);
      });

      return {
        success: true,
        data: dataURL,
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      errors.push(`Attempt ${attempt + 1}: ${errorMessage}`);

      // Check if it's a permission-related error
      const isPermissionError =
        errorMessage.includes('permission') ||
        errorMessage.includes('could not be read') ||
        errorMessage.includes('NotReadableError') ||
        errorMessage.includes('SecurityError') ||
        errorMessage.includes('AbortError');

      // Retry with delay if not last attempt
      if (attempt < maxRetries - 1) {
        const delay = retryDelays[attempt] || 100 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Last attempt failed
      if (isPermissionError) {
        return {
          success: false,
          error: 'File permission error. The file may have been moved or deleted. Please try selecting it again.',
        };
      }

      return {
        success: false,
        error: `Failed to read file after ${maxRetries} attempts: ${errors.join('; ')}`,
      };
    }
  }

  return {
    success: false,
    error: `Failed to read file after ${maxRetries} attempts`,
  };
}

/**
 * Reads a file as Blob with retry logic
 * Creates a new Blob from the file data
 */
export async function readFileAsBlob(
  file: File,
  maxRetries: number = 3,
  retryDelays: number[] = [100, 300, 500]
): Promise<FileReadResult> {
  const result = await readFileAsArrayBuffer(file, maxRetries, retryDelays);
  
  if (!result.success || !result.data) {
    return result;
  }

  try {
    const blob = new Blob([result.data], { type: file.type || 'application/octet-stream' });
    return {
      success: true,
      data: blob,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to create blob: ${error?.message || 'Unknown error'}`,
    };
  }
}

