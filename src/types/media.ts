export type MediaType = 'image' | 'video';

export interface Media {
  id: string;
  userId: string;
  mediaUrl: string;
  imageUrl?: string; // For backward compatibility
  thumbnailUrl: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  mediaType: MediaType;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
}

// Maximum file sizes (in bytes)
export const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB for server-side uploads
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos (direct upload)
export const MAX_DIRECT_UPLOAD_SIZE = 4 * 1024 * 1024; // 4MB threshold for direct upload

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

// Allowed file extensions
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm'];

/**
 * Validates if a file is a valid image
 */
export function isValidImage(file: File): boolean {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const hasValidMimeType = file.type && ALLOWED_IMAGE_TYPES.includes(file.type);
  const hasValidExtension = ALLOWED_IMAGE_EXTENSIONS.includes(fileExtension);
  return hasValidMimeType || hasValidExtension;
}

/**
 * Validates if a file is a valid video
 */
export function isValidVideo(file: File): boolean {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  const hasValidMimeType = file.type && ALLOWED_VIDEO_TYPES.includes(file.type);
  const hasValidExtension = ALLOWED_VIDEO_EXTENSIONS.includes(fileExtension);
  return hasValidMimeType || hasValidExtension;
}

/**
 * Validates if a file is a valid media (image or video)
 */
export function isValidMedia(file: File): boolean {
  return isValidImage(file) || isValidVideo(file);
}

/**
 * Gets the media type of a file
 */
export function getMediaType(file: File): MediaType | null {
  if (isValidVideo(file)) return 'video';
  if (isValidImage(file)) return 'image';
  return null;
}

/**
 * Validates file size based on media type
 */
export function validateFileSize(file: File, mediaType: MediaType): { valid: boolean; error?: string } {
  if (mediaType === 'video') {
    if (file.size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: `Video size exceeds maximum allowed size of ${MAX_VIDEO_SIZE / 1024 / 1024}MB`,
      };
    }
  } else if (mediaType === 'image') {
    // Images can use server-side upload if < 4MB, or direct upload if larger
    // No hard limit for images with direct upload
    if (file.size > MAX_VIDEO_SIZE) {
      return {
        valid: false,
        error: `Image size exceeds maximum allowed size of ${MAX_VIDEO_SIZE / 1024 / 1024}MB`,
      };
    }
  }
  return { valid: true };
}

