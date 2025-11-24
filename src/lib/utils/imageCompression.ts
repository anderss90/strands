/**
 * Image compression utility using browser-image-compression
 * Automatically compresses images to fit within the 4MB limit
 */

import imageCompression from 'browser-image-compression';

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const MAX_WIDTH_OR_HEIGHT = 1920; // Max dimension (maintains aspect ratio)
const COMPRESSION_QUALITY = 0.8; // 0.8 = 80% quality (good balance)

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  onProgress?: (progress: number) => void;
}

/**
 * Compress an image file to fit within the size limit
 * @param file - The image file to compress
 * @param options - Optional compression settings
 * @returns Compressed File object
 */
/**
 * Check if web workers are available
 */
function isWebWorkerSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return typeof Worker !== 'undefined';
  } catch {
    return false;
  }
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // If file is already under the limit, return as-is
  if (file.size <= MAX_FILE_SIZE) {
    console.log('Image is already under size limit, skipping compression');
    return file;
  }

  console.log(`Compressing image: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  
  // Check web worker support
  const webWorkerSupported = isWebWorkerSupported();
  if (!webWorkerSupported) {
    console.log('Web workers not supported, compression will run on main thread');
  }

  // Try compression with web worker first, fallback to no web worker if it fails
  // Disable web worker if not supported or explicitly disabled
  const shouldUseWebWorker = webWorkerSupported && options.useWebWorker !== false;
  
  let compressionOptions = {
    maxSizeMB: options.maxSizeMB || MAX_FILE_SIZE / 1024 / 1024, // Convert to MB
    maxWidthOrHeight: options.maxWidthOrHeight || MAX_WIDTH_OR_HEIGHT,
    useWebWorker: shouldUseWebWorker, // Only use web worker if supported
    fileType: file.type || 'image/jpeg', // Default to JPEG for better compression
    initialQuality: COMPRESSION_QUALITY,
    onProgress: options.onProgress,
  };

  try {
    let compressedFile: File;
    
    try {
      // First attempt with web worker
      compressedFile = await imageCompression(file, compressionOptions);
    } catch (webWorkerError: any) {
      // If web worker fails, try without web worker
      console.warn('Web worker compression failed, trying without web worker:', webWorkerError);
      compressionOptions.useWebWorker = false;
      compressedFile = await imageCompression(file, compressionOptions);
    }
    
    const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
    const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
    
    console.log(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB (${reduction}% reduction)`);

    // If still too large after compression, try more aggressive compression
    if (compressedFile.size > MAX_FILE_SIZE) {
      console.warn('Image still too large after initial compression, applying more aggressive compression');
      
      const aggressiveOptions = {
        ...compressionOptions,
        maxSizeMB: MAX_FILE_SIZE / 1024 / 1024,
        maxWidthOrHeight: 1280, // Smaller max dimension
        initialQuality: 0.6, // Lower quality
        useWebWorker: false, // Disable web worker for aggressive compression
      };
      
      try {
        const moreCompressed = await imageCompression(file, aggressiveOptions);
        
        const finalSizeMB = (moreCompressed.size / 1024 / 1024).toFixed(2);
        const finalReduction = ((1 - moreCompressed.size / file.size) * 100).toFixed(1);
        console.log(`Aggressive compression: ${originalSizeMB}MB → ${finalSizeMB}MB (${finalReduction}% reduction)`);
        
        return moreCompressed;
      } catch (aggressiveError) {
        // If aggressive compression also fails, return the first compressed result
        // (even if it's slightly over the limit, it's better than nothing)
        console.warn('Aggressive compression failed, using initial compression result:', aggressiveError);
        return compressedFile;
      }
    }

    return compressedFile;
  } catch (error: any) {
    console.error('Image compression failed:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to compress image. ';
    if (error.message?.includes('Worker')) {
      errorMessage += 'Web worker is not available. ';
    } else if (error.message?.includes('memory') || error.message?.includes('Memory')) {
      errorMessage += 'Image is too large for your device. ';
    } else if (error.message?.includes('type') || error.message?.includes('format')) {
      errorMessage += 'Image format not supported. ';
    }
    errorMessage += 'Please try a smaller image or a different format.';
    
    throw new Error(errorMessage);
  }
}

/**
 * Check if an image needs compression
 */
export function needsCompression(file: File): boolean {
  return file.size > MAX_FILE_SIZE;
}

