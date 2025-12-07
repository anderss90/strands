'use client';

import { useState, FormEvent, useRef, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { groupApi, Group } from '@/lib/api';
import { fetchWithRetry, isNetworkError, getErrorMessage } from '@/lib/utils/fetchWithRetry';
import { useMediaPermissions } from '@/hooks/useMediaPermissions';
import { compressImage, needsCompression } from '@/lib/utils/imageCompression';
import { directUploadToSupabase, shouldUseDirectUpload, getVideoMetadata, validateVideoSize, generateVideoThumbnail } from '@/lib/utils/directUpload';
import { useAuth } from '@/contexts/AuthContext';
import { isValidMedia, getMediaType, validateFileSize, MAX_VIDEO_SIZE } from '@/types/media';

interface StrandCreateProps {
  onSuccess?: () => void;
  preselectedGroupId?: string;
  sharedImage?: File | null;
}

interface FileWithPreview {
  file: File;
  fileData: { blob: Blob; name: string; type: string };
  preview: string;
  isVideo: boolean;
  videoMetadata?: { duration?: number; width?: number; height?: number };
}

export default function StrandCreate({ onSuccess, preselectedGroupId, sharedImage }: StrandCreateProps) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const photoCameraInputRef = useRef<HTMLInputElement>(null);
  const videoCameraInputRef = useRef<HTMLInputElement>(null);
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
    if (sharedImage && files.length === 0) {
      const processSharedImage = async () => {
        try {
          setCompressing(true);
          setError('');
          const processed = await processFile(sharedImage);
          if (processed) {
            setFiles([processed]);
            setError('');
          }
        } catch (error) {
          console.error('Error processing shared image:', error);
          setError('Failed to process shared image. Please try again.');
          try {
            sessionStorage.removeItem('sharedImage');
          } catch (e) {
            // Ignore storage errors
          }
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

  const processFile = async (selectedFile: File): Promise<FileWithPreview | null> => {
    // Validate file type
    if (!isValidMedia(selectedFile)) {
      setError('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WebM) are allowed.');
      return null;
    }

    // Get media type
    const mediaType = getMediaType(selectedFile);
    if (!mediaType) {
      setError('Unable to determine file type.');
      return null;
    }

    const isValidVideo = mediaType === 'video';

    // Validate file size
    const sizeValidation = validateFileSize(selectedFile, mediaType);
    if (!sizeValidation.valid) {
      setError(sizeValidation.error || 'File size exceeds maximum allowed size.');
      return null;
    }

    try {
      let videoMetadata: { duration?: number; width?: number; height?: number } | undefined;

      // For videos, get metadata and validate size
      if (mediaType === 'video') {
        const videoSizeValidation = validateVideoSize(selectedFile, MAX_VIDEO_SIZE);
        if (!videoSizeValidation.valid) {
          setError(videoSizeValidation.error || 'Video size exceeds maximum allowed size.');
          return null;
        }

        try {
          videoMetadata = await getVideoMetadata(selectedFile);
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

      // Create preview from the blob
      let preview: string;
      if (mediaType === 'video') {
        // For videos, use object URL for preview
        preview = URL.createObjectURL(blob);
      } else {
        // For images, use FileReader to create data URL
        preview = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              resolve(reader.result as string);
            } else {
              reject(new Error('FileReader: No result'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      }

      return {
        file: processedFile,
        fileData: {
          blob: blob,
          name: processedFile.name,
          type: normalizedMimeType,
        },
        preview,
        isVideo: isValidVideo,
        videoMetadata,
      };
    } catch (err: any) {
      console.error('Error processing file:', err);
      setError(err.message || 'Failed to process file. Please try again.');
      return null;
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setCompressing(true);
    setError('');

    const processedFiles: FileWithPreview[] = [];
    
    for (const selectedFile of selectedFiles) {
      const processed = await processFile(selectedFile);
      if (processed) {
        processedFiles.push(processed);
      } else {
        // If one file fails, stop processing
        break;
      }
    }

    if (processedFiles.length > 0) {
      setFiles(prev => [...prev, ...processedFiles]);
      setError('');
    }

    // Clear input
    if (photoCameraInputRef.current) {
      photoCameraInputRef.current.value = '';
    }
    if (videoCameraInputRef.current) {
      videoCameraInputRef.current.value = '';
    }
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }

    setCompressing(false);
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    // Revoke object URL if it's a video
    if (fileToRemove.isVideo && fileToRemove.preview.startsWith('blob:')) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handlePhotoCameraClick = () => {
    // Open camera in photo mode
    photoCameraInputRef.current?.click();
  };

  const handleVideoCameraClick = () => {
    // Open camera in video mode
    videoCameraInputRef.current?.click();
  };

  const handleGalleryClick = async () => {
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

    // Validate: at least content or files must be provided
    if (!content.trim() && files.length === 0) {
      setError('Please provide either text content or media files (or both)');
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
      // Safely get token from localStorage
      let token: string | null = null;
      try {
        token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      } catch (error) {
        setError('Unable to access storage. Please check your browser settings.');
        setLoading(false);
        return;
      }
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Prepare files for upload - use fileData if available (persists on iOS), otherwise use file
      const filesToUpload: File[] = files.map(f => {
        // Create a new File from the stored blob to ensure it's valid
        return new File([f.fileData.blob], f.fileData.name, { type: f.fileData.type });
      });

      // Upload all files
      if (filesToUpload.length > 0) {
        const { directUploadToSupabase, shouldUseDirectUpload } = await import('@/lib/utils/directUpload');
        const imageIds: string[] = [];
        const filesForServerless: File[] = [];
        
        // Process each file - use direct upload for large files/videos
        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          const useDirectUpload = shouldUseDirectUpload(file);
          
          if (useDirectUpload && user?.id) {
            // Upload directly to Supabase Storage
            const progressStart = 10 + (i * 70 / filesToUpload.length);
            const progressEnd = 10 + ((i + 1) * 70 / filesToUpload.length);
            
            const uploadResult = await directUploadToSupabase({
              file,
              userId: user.id,
              bucket: 'images',
              onProgress: (progress) => {
                // Update progress for this file
                const currentProgress = progressStart + (progress.percentage * (progressEnd - progressStart) / 100);
                setUploadProgress(currentProgress);
              },
            });
            
            // Save metadata to database to get image ID
            const metadataResponse = await fetch('/api/images/metadata', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                imageUrl: uploadResult.publicUrl,
                thumbnailUrl: uploadResult.publicUrl,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type || (files[i]?.isVideo ? 'video/mp4' : 'image/jpeg'),
                groupIds: [], // We'll share via strand, not directly
              }),
            });
            
            if (!metadataResponse.ok) {
              const errorData = await metadataResponse.json().catch(() => ({ message: 'Failed to save image metadata' }));
              throw new Error(errorData.message || 'Failed to save image metadata');
            }
            
            const imageData = await metadataResponse.json();
            imageIds.push(imageData.id);
          } else {
            // Use traditional serverless upload
            filesForServerless.push(file);
          }
        }
        
        setUploadProgress(85);
        
        // If we have image IDs from direct uploads, use JSON API
        // Otherwise, use FormData for traditional upload
        if (imageIds.length > 0 && filesForServerless.length === 0) {
          // All files were uploaded directly, use JSON API with image IDs
          const response = await fetch('/api/strands', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              content: content.trim() || undefined,
              imageId: imageIds[0], // Use first image ID for backward compatibility
              groupIds: selectedGroupIds,
            }),
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to create strand' }));
            throw new Error(errorData.message || 'Failed to create strand');
          }
        } else {
          // Mixed or all traditional uploads - use FormData
          const formData = new FormData();
          
          if (content.trim()) {
            formData.append('content', content.trim());
          }
          
          // Append files that weren't uploaded directly
          filesForServerless.forEach((file) => {
            formData.append('files', file);
          });
          
          // If we have image IDs, add the first one
          if (imageIds.length > 0) {
            formData.append('imageId', imageIds[0]);
          }
          
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
            const errorData = await response.json().catch(() => ({ message: 'Failed to create strand' }));
            throw new Error(errorData.message || 'Failed to create strand');
          }
        }
        
        setUploadProgress(100);
        
        // Reset form and return success
        setContent('');
        setFiles([]);
        setSelectedGroupIds([]);
        setUploadProgress(0);
        
        // Clean up object URLs for videos
        files.forEach(f => {
          if (f.isVideo && f.preview.startsWith('blob:')) {
            URL.revokeObjectURL(f.preview);
          }
        });
        
        if (photoCameraInputRef.current) {
          photoCameraInputRef.current.value = '';
        }
        if (videoCameraInputRef.current) {
          videoCameraInputRef.current.value = '';
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
        return;
      } else if (content.trim()) {
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

        // Reset form
        setContent('');
        setFiles([]);
        setSelectedGroupIds([]);
        setUploadProgress(0);
        
        if (onSuccess) {
          onSuccess();
        } else {
          alert('Strand created successfully!');
          router.push('/home');
        }
        return;
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
      {/* Photo camera input - opens camera in photo mode */}
      <input
        ref={photoCameraInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        capture="environment"
      />
      {/* Video camera input - opens camera in video mode */}
      <input
        ref={videoCameraInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
        capture="environment"
      />
      {/* Gallery input - opens gallery/file picker - supports multiple files */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileChange}
        multiple
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
          Media (optional) {files.length > 0 && `(${files.length} selected)`}
        </label>
        {compressing && (
          <div className="mb-3 p-3 bg-blue-900/20 border border-blue-700 text-blue-400 rounded-lg text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            {files.some(f => f.isVideo) ? 'Processing media...' : 'Compressing images to reduce file size...'}
          </div>
        )}
        {uploading && uploadProgress > 0 && (
          <div className="mb-3 p-3 bg-blue-900/20 border border-blue-700 text-blue-400 rounded-lg text-sm">
            <div className="flex items-center justify-between mb-2">
              <span>Uploading {files.some(f => f.isVideo) ? 'media' : 'files'}...</span>
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
        
        {files.length === 0 ? (
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handlePhotoCameraClick}
              className="bg-blue-600 text-white py-8 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-base min-h-[120px] flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all duration-200"
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
              <span className="text-sm font-medium">Take Photo</span>
            </button>
            <button
              type="button"
              onClick={handleVideoCameraClick}
              className="bg-purple-600 text-white py-8 px-4 rounded-lg font-medium hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 text-base min-h-[120px] flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all duration-200"
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
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm font-medium">Record Video</span>
            </button>
            <button
              type="button"
              onClick={handleGalleryClick}
              disabled={checkingPermissions}
              className="bg-green-600 text-white py-8 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-base min-h-[120px] flex flex-col items-center justify-center space-y-2 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="space-y-3">
            {/* File Previews */}
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {files.map((fileWithPreview, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden border border-gray-600">
                  {fileWithPreview.isVideo ? (
                    <video
                      src={fileWithPreview.preview}
                      className="w-full h-32 object-cover"
                      playsInline
                      muted
                    />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={fileWithPreview.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 active:scale-95 transition-all duration-200"
                  >
                    <svg
                      className="w-4 h-4"
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
                  {fileWithPreview.isVideo && (
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1 rounded">
                      🎥
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handlePhotoCameraClick}
                className="bg-gray-700 text-gray-100 py-3 px-4 rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm min-h-[48px] active:scale-95 transition-all duration-200"
              >
                📷 Add Photo
              </button>
              <button
                type="button"
                onClick={handleGalleryClick}
                disabled={checkingPermissions}
                className="bg-gray-700 text-gray-100 py-3 px-4 rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm min-h-[48px] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🖼️ Add More
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
        disabled={uploading || compressing || (!content.trim() && files.length === 0) || selectedGroupIds.length === 0}
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
