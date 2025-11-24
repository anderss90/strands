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

  const compressionOptions = {
    maxSizeMB: options.maxSizeMB || MAX_FILE_SIZE / 1024 / 1024, // Convert to MB
    maxWidthOrHeight: options.maxWidthOrHeight || MAX_WIDTH_OR_HEIGHT,
    useWebWorker: options.useWebWorker !== false, // Use web worker by default for better performance
    fileType: file.type || 'image/jpeg', // Default to JPEG for better compression
    initialQuality: COMPRESSION_QUALITY,
    onProgress: options.onProgress,
  };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    
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
      };
      
      const moreCompressed = await imageCompression(file, aggressiveOptions);
      
      const finalSizeMB = (moreCompressed.size / 1024 / 1024).toFixed(2);
      const finalReduction = ((1 - moreCompressed.size / file.size) * 100).toFixed(1);
      console.log(`Aggressive compression: ${originalSizeMB}MB → ${finalSizeMB}MB (${finalReduction}% reduction)`);
      
      return moreCompressed;
    }

    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    // If compression fails, return original file (will be rejected by server if too large)
    throw new Error('Failed to compress image. Please try a smaller image.');
  }
}

/**
 * Check if an image needs compression
 */
export function needsCompression(file: File): boolean {
  return file.size > MAX_FILE_SIZE;
}

