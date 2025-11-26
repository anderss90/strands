'use client';

import { useState, FormEvent, useRef, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { groupApi, Group } from '@/lib/api';
import { fetchWithRetry, isNetworkError, getErrorMessage } from '@/lib/utils/fetchWithRetry';
import { useMediaPermissions } from '@/hooks/useMediaPermissions';
import { compressImage, needsCompression } from '@/lib/utils/imageCompression';
import { directUploadToSupabase, shouldUseDirectUpload, getVideoMetadata, validateVideoSize } from '@/lib/utils/directUpload';
import { useAuth } from '@/contexts/AuthContext';
import { isValidMedia, getMediaType, validateFileSize, MAX_VIDEO_SIZE } from '@/types/media';

interface StrandCreateProps {
  onSuccess?: () => void;
  preselectedGroupId?: string;
  sharedImage?: File | null;
}

export default function StrandCreate({ onSuccess, preselectedGroupId, sharedImage }: StrandCreateProps) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<{ blob: Blob; name: string; type: string } | null>(null); // Store file data to persist on iOS
  const [preview, setPreview] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isVideo, setIsVideo] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<{ duration?: number; width?: number; height?: number } | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { requestGalleryAccess, isChecking: checkingPermissions } = useMediaPermissions();
  const { user } = useAuth();

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Pre-select the group if provided and groups are loaded
    if (preselectedGroupId && groups.length > 0 && selectedGroupIds.length === 0) {
      const groupExists = groups.some(g => g.id === preselectedGroupId);
      if (groupExists) {
        setSelectedGroupIds([preselectedGroupId]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedGroupId, groups]);

  // Process shared image when provided
  useEffect(() => {
    if (sharedImage && !file && !fileData) {
      const processSharedImage = async () => {
        try {
          setCompressing(true);
          setError('');

          // Validate file type
          if (!isValidMedia(sharedImage)) {
            setError('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WebM) are allowed.');
            return;
          }

          // Get media type
          const sharedMediaType = getMediaType(sharedImage);
          if (!sharedMediaType) {
            setError('Unable to determine file type.');
            return;
          }

          const isValidVideo = sharedMediaType === 'video';
          setIsVideo(isValidVideo);

          // Validate file size
          const sizeValidation = validateFileSize(sharedImage, sharedMediaType);
          if (!sizeValidation.valid) {
            setError(sizeValidation.error || 'File size exceeds maximum allowed size.');
            return;
          }

          // For videos, get metadata
          if (isValidVideo) {
            try {
              const metadata = await getVideoMetadata(sharedImage);
              setVideoMetadata(metadata);
            } catch (err) {
              console.warn('Failed to get video metadata:', err);
            }
          }

          // Compress image if needed (only for images, not videos)
          let processedFile = sharedImage;
          if (sharedMediaType === 'image' && needsCompression(sharedImage)) {
            console.log('Image exceeds size limit, compressing...');
            processedFile = await compressImage(sharedImage);
          }

          // Read file into memory to persist it
          const arrayBuffer = await processedFile.arrayBuffer();
          const sharedFileExtension = sharedImage.name.split('.').pop()?.toLowerCase() || '';
          const blob = new Blob([arrayBuffer], { type: processedFile.type || (sharedMediaType === 'video' ? `video/${sharedFileExtension}` : `image/${sharedFileExtension}`) });
          
          // Determine MIME type (normalize if missing)
          let normalizedMimeType = processedFile.type;
          if (!normalizedMimeType) {
            const extensionToMime: Record<string, string> = {
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'png': 'image/png',
              'gif': 'image/gif',
              'webp': 'image/webp',
              'mp4': 'video/mp4',
              'mov': 'video/quicktime',
              'avi': 'video/x-msvideo',
            };
            normalizedMimeType = extensionToMime[sharedFileExtension] || (sharedMediaType === 'video' ? 'video/mp4' : 'image/jpeg');
          }

          // Store file data for persistence
          setFileData({
            blob: blob,
            name: processedFile.name,
            type: normalizedMimeType,
          });
          
          // Keep the processed File object
          setFile(processedFile);
          setError('');

          // Create preview from the blob
          // For videos, create object URL; for images, use data URL
          if (sharedMediaType === 'video') {
            // For videos, use object URL for preview
            const videoUrl = URL.createObjectURL(blob);
            setPreview(videoUrl);
          } else {
            // For images, use FileReader to create data URL
            const reader = new FileReader();
            
            reader.onloadend = () => {
              if (reader.result) {
                setPreview(reader.result as string);
              } else {
                console.error('FileReader: No result');
                setError('Failed to generate preview. Please try again.');
                setFile(null);
                setFileData(null);
                setPreview(null);
              }
            };
            
            reader.onerror = () => {
              console.error('FileReader error:', reader.error);
              setError('Failed to read file for preview. Please try again.');
              setFile(null);
              setFileData(null);
              setPreview(null);
            };
            
            reader.readAsDataURL(blob);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to process shared image. Please try again.');
          console.error('Error processing shared image:', err);
          setFile(null);
          setFileData(null);
          setPreview(null);
        } finally {
          setCompressing(false);
        }
      };

      processSharedImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedImage]);

  const fetchGroups = async () => {
    try {
      setGroupsLoading(true);
      setError('');
      const data = await groupApi.getGroups();
      setGroups(data);
    } catch (err: any) {
      setError('Failed to load groups');
    } finally {
      setGroupsLoading(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!isValidMedia(selectedFile)) {
      setError('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WebM) are allowed.');
      return;
    }

    // Get media type
    const mediaType = getMediaType(selectedFile);
    if (!mediaType) {
      setError('Unable to determine file type.');
      return;
    }

    const isValidVideo = mediaType === 'video';
    setIsVideo(isValidVideo);

    // Validate file size
    const sizeValidation = validateFileSize(selectedFile, mediaType);
    if (!sizeValidation.valid) {
      setError(sizeValidation.error || 'File size exceeds maximum allowed size.');
      return;
    }

    try {
      setCompressing(true);
      setError('');

      // For videos, get metadata and validate size
      if (mediaType === 'video') {
        const videoSizeValidation = validateVideoSize(selectedFile, MAX_VIDEO_SIZE);
        if (!videoSizeValidation.valid) {
          setError(videoSizeValidation.error || 'Video size exceeds maximum allowed size.');
          return;
        }

        try {
          const metadata = await getVideoMetadata(selectedFile);
          setVideoMetadata(metadata);
        } catch (err) {
          console.warn('Failed to get video metadata:', err);
          // Continue without metadata
        }
      }

      // Compress image if needed (only for images, not videos)
      let processedFile = selectedFile;
      if (mediaType === 'image' && needsCompression(selectedFile)) {
        console.log('Image exceeds size limit, compressing...');
        processedFile = await compressImage(selectedFile);
      }

      // On iOS, File objects can become invalid after navigation
      // Read file into memory immediately to persist it
      const arrayBuffer = await processedFile.arrayBuffer();
      const currentFileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
      const blob = new Blob([arrayBuffer], { type: processedFile.type || (mediaType === 'video' ? `video/${currentFileExtension}` : `image/${currentFileExtension}`) });
      
      // Determine MIME type (normalize if missing)
      let normalizedMimeType = processedFile.type;
      if (!normalizedMimeType) {
        const extensionToMime: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'mp4': 'video/mp4',
          'mov': 'video/quicktime',
          'avi': 'video/x-msvideo',
        };
        normalizedMimeType = extensionToMime[currentFileExtension] || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
      }

      // Store file data for persistence
      setFileData({
        blob: blob,
        name: processedFile.name,
        type: normalizedMimeType,
      });
      
      // Keep the processed File object
      setFile(processedFile);
      setError('');

      // Create preview from the blob
      // For videos, create object URL; for images, use data URL
      if (mediaType === 'video') {
        // For videos, use object URL for preview
        const videoUrl = URL.createObjectURL(blob);
        setPreview(videoUrl);
      } else {
        // For images, use FileReader to create data URL
        const reader = new FileReader();
        
        reader.onloadend = () => {
          if (reader.result) {
            setPreview(reader.result as string);
          } else {
            console.error('FileReader: No result');
            setError('Failed to generate preview. Please try again.');
            setFile(null);
            setFileData(null);
            setPreview(null);
          }
        };
        
        reader.onerror = () => {
          console.error('FileReader error:', reader.error);
          setError('Failed to read file for preview. Please try again.');
          setFile(null);
          setFileData(null);
          setPreview(null);
        };
        
        reader.readAsDataURL(blob);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process image. Please try again.');
      console.error('Error processing file:', err);
      setFile(null);
      setFileData(null);
      setPreview(null);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    } finally {
      setCompressing(false);
    }
  };

  const handleCameraClick = async () => {
    // On Android, the gallery input (without capture) gives choice between camera/video/gallery
    // Check and request gallery permissions before opening file picker
    setError('');
    const permissionResult = await requestGalleryAccess();
    
    if (!permissionResult.success) {
      setError(permissionResult.error || 'Unable to access gallery. Please check your browser permissions.');
      return;
    }
    
    // If permissions are granted or not needed, open the file picker
    galleryInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    // On Android, the camera input (with capture) opens the gallery directly
    cameraInputRef.current?.click();
  };

  const toggleGroup = (groupId: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validate: at least content or file must be provided
    if (!content.trim() && !file && !fileData) {
      setError('Please provide either text content or a media file (or both)');
      return;
    }

    if (content.trim().length > 5000) {
      setError('Content must be 5000 characters or less');
      return;
    }

    if (selectedGroupIds.length === 0) {
      setError('Please select at least one group to share with');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Use stored file data if available (persists on iOS), otherwise use file
      let fileToUpload: File | null = null;
      if (fileData) {
        // Create a new File from the stored blob to ensure it's valid
        fileToUpload = new File([fileData.blob], fileData.name, { type: fileData.type });
      } else if (file) {
        fileToUpload = file;
      }

      let mediaId: string | null = null;

      // Determine if we should use direct upload (videos or files > 4MB)
      if (fileToUpload && shouldUseDirectUpload(fileToUpload)) {
        // Use direct upload to Supabase Storage
        if (!user?.id) {
          throw new Error('User ID not available');
        }

        setUploadProgress(10);
        
        // Upload directly to Supabase Storage
        const uploadResult = await directUploadToSupabase({
          file: fileToUpload,
          userId: user.id,
          onProgress: (progress) => {
            // Map upload progress (0-90% for upload, 90-100% for metadata)
            setUploadProgress(Math.min(90, progress.percentage * 0.9));
          },
        });

        setUploadProgress(90);

        // Get video metadata if it's a video
        let videoMeta = null;
        if (isVideo && fileToUpload) {
          try {
            videoMeta = await getVideoMetadata(fileToUpload);
          } catch (err) {
            console.warn('Failed to get video metadata:', err);
          }
        }

        // Save metadata via API
        const mediaResponse = await fetch('/api/media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            mediaUrl: uploadResult.publicUrl,
            thumbnailUrl: isVideo ? uploadResult.publicUrl : uploadResult.publicUrl, // For now, use same URL
            fileName: fileToUpload.name,
            fileSize: fileToUpload.size,
            mimeType: fileToUpload.type || fileData?.type || 'application/octet-stream',
            mediaType: isVideo ? 'video' : 'image',
            duration: videoMeta?.duration,
            width: videoMeta?.width,
            height: videoMeta?.height,
            groupIds: selectedGroupIds,
          }),
        });

        if (!mediaResponse.ok) {
          const errorData = await mediaResponse.json().catch(() => ({ message: 'Failed to save media metadata' }));
          throw new Error(errorData.message || 'Failed to save media metadata');
        }

        const mediaData = await mediaResponse.json();
        mediaId = mediaData.id;
        setUploadProgress(100);
      } else if (fileToUpload) {
        // Use traditional server-side upload for small images
        const formData = new FormData();
        
        if (content.trim()) {
          formData.append('content', content.trim());
        }
        
        formData.append('file', fileToUpload);
        formData.append('groupIds', JSON.stringify(selectedGroupIds));

        // Use fetchWithRetry for better network error handling
        const response = await fetchWithRetry('/api/strands', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
          timeout: 180000, // 3 minutes for file uploads
          retries: 2,
          retryDelay: 2000,
        });

        if (!response.ok) {
          // Handle 413 Payload Too Large specifically
          if (response.status === 413) {
            const errorData = await response.json().catch(() => ({ 
              message: 'File size exceeds maximum allowed size of 4MB. Please choose a smaller file or compress it.' 
            }));
            throw new Error(errorData.message || 'File size exceeds maximum allowed size of 4MB.');
          }
          
          const errorData = await response.json().catch(() => ({ message: 'Failed to create strand' }));
          throw new Error(errorData.message || 'Failed to create strand');
        }

        const strandData = await response.json();
        // Reset form and return success
        setContent('');
        setFile(null);
        setFileData(null);
        setPreview(null);
        setSelectedGroupIds([]);
        setUploadProgress(0);
        setIsVideo(false);
        setVideoMetadata(null);
        
        if (onSuccess) {
          onSuccess();
        } else {
          alert('Strand created successfully!');
          router.push('/home');
        }
        return;
      }

      // If we used direct upload, create strand with media ID
      if (mediaId) {
        const response = await fetch('/api/strands', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: content.trim() || undefined,
            imageId: mediaId, // API expects imageId but it works for both images and videos
            groupIds: selectedGroupIds,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to create strand' }));
          throw new Error(errorData.message || 'Failed to create strand');
        }

        setUploadProgress(100);
      } else if (!fileToUpload && content.trim()) {
        // Text-only strand
        const response = await fetch('/api/strands', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: content.trim(),
            groupIds: selectedGroupIds,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to create strand' }));
          throw new Error(errorData.message || 'Failed to create strand');
        }
      }

      // Reset form
      setContent('');
      setFile(null);
      setFileData(null);
      setPreview(null);
      setSelectedGroupIds([]);
      setUploadProgress(0);
      setIsVideo(false);
      setVideoMetadata(null);
      
      // Clean up object URL if it was a video
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
      
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
      
      if (onSuccess) {
        onSuccess();
      } else {
        alert('Strand created successfully!');
        router.push('/home');
      }
    } catch (err: any) {
      const errorMessage = isNetworkError(err) ? getErrorMessage(err) : (err.message || 'Failed to create strand');
      console.error('Error creating strand:', {
        error: err,
        message: errorMessage,
        isNetworkError: isNetworkError(err),
        stack: err.stack,
      });
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Hidden file inputs */}
      {/* Camera input - opens camera on mobile for both photos and videos */}
      {/* Explicitly accept both images and videos to allow mode switching in camera app */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
        capture="environment"
      />
      {/* Gallery input - opens gallery/file picker (no capture attribute for Android compatibility) */}
      {/* Note: Some mobile browsers may only show images with image/*,video/* 
          If videos don't appear, try removing the accept attribute or using accept="" */}
      <input
        ref={galleryInputRef}
        type="file"
        accept=""
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Text Content */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Text Content (optional)
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-4 py-3 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-base min-h-[120px] resize-y"
          maxLength={5000}
          rows={5}
        />
        <p className="text-xs text-gray-400 mt-1">
          {content.length}/5000 characters
        </p>
      </div>

      {/* Image Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Image (optional)
        </label>
        {compressing && (
          <div className="mb-3 p-3 bg-blue-900/20 border border-blue-700 text-blue-400 rounded-lg text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            {isVideo ? 'Processing video...' : 'Compressing image to reduce file size...'}
          </div>
        )}
        {uploading && uploadProgress > 0 && (
          <div className="mb-3 p-3 bg-blue-900/20 border border-blue-700 text-blue-400 rounded-lg text-sm">
            <div className="flex items-center justify-between mb-2">
              <span>Uploading {isVideo ? 'video' : 'file'}...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        {!preview ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={checkingPermissions}
              className="bg-blue-600 text-white py-8 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-base min-h-[120px] flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-sm font-medium">Take Photo/Video</span>
            </button>
            <button
              type="button"
              onClick={handleGalleryClick}
              className="bg-green-600 text-white py-8 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-base min-h-[120px] flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all duration-200"
            >
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm font-medium">Choose from Gallery</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden border border-gray-600">
              {isVideo ? (
                <video
                  src={preview || undefined}
                  controls
                  className="w-full h-auto max-h-96 object-contain"
                  playsInline
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={preview || undefined}
                  alt="Preview"
                  className="w-full h-auto max-h-96 object-contain"
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  if (cameraInputRef.current) {
                    cameraInputRef.current.value = '';
                  }
                  if (galleryInputRef.current) {
                    galleryInputRef.current.value = '';
                  }
                }}
                className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-95 transition-all duration-200"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCameraClick}
                className="bg-gray-700 text-gray-100 py-3 px-4 rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm min-h-[48px] active:scale-95 transition-all duration-200"
              >
                📷📹 Take New
              </button>
              <button
                type="button"
                onClick={handleGalleryClick}
                disabled={checkingPermissions}
                className="bg-gray-700 text-gray-100 py-3 px-4 rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm min-h-[48px] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🖼️ Choose Different
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Group Selection */}
      {groupsLoading ? (
        <div className="text-sm text-gray-400 py-2">Loading groups...</div>
      ) : groups.length === 0 ? (
        <div className="text-sm text-gray-500 py-2">
          No groups yet. Create a group to share strands.
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Share with Groups (required)
          </label>
          <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-700 rounded-lg p-2 bg-gray-700/50">
            {groups.map((group) => (
              <label
                key={group.id}
                className="flex items-center space-x-3 p-2 rounded hover:bg-gray-700 cursor-pointer min-h-[44px]"
              >
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(group.id)}
                  onChange={() => toggleGroup(group.id)}
                  className="w-5 h-5 text-blue-600 border-gray-600 rounded focus:ring-blue-500 bg-gray-700"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-100 truncate text-sm">{group.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{group.userRole}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={uploading || compressing || (!content.trim() && !file && !fileData) || selectedGroupIds.length === 0}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-[48px] transition-all duration-200 shadow-md hover:shadow-lg"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Creating...
          </span>
        ) : compressing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Compressing Image...
          </span>
        ) : (
          'Create Strand'
        )}
      </button>
    </form>
  );
}
