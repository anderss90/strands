'use client';

import { useState, FormEvent, useRef, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { groupApi, Group } from '@/lib/api';
import { fetchWithRetry, isNetworkError, getErrorMessage } from '@/lib/utils/fetchWithRetry';

interface StrandCreateProps {
  onSuccess?: () => void;
  preselectedGroupId?: string;
}

export default function StrandCreate({ onSuccess, preselectedGroupId }: StrandCreateProps) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // On iOS, file.type can be empty, so we also check the file extension
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const hasValidMimeType = selectedFile.type && allowedTypes.includes(selectedFile.type);
    const hasValidExtension = allowedExtensions.includes(fileExtension);

    if (!hasValidMimeType && !hasValidExtension) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
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

    // Validate: at least content or file must be provided
    if (!content.trim() && !file) {
      setError('Please provide either text content or an image (or both)');
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

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const formData = new FormData();
      
      if (content.trim()) {
        formData.append('content', content.trim());
      }
      if (file) {
        formData.append('file', file);
      }
      formData.append('groupIds', JSON.stringify(selectedGroupIds));

      // Use fetchWithRetry for better network error handling
      const response = await fetchWithRetry('/api/strands', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        timeout: file ? 180000 : 30000, // 3 minutes for file uploads, 30s for text only
        retries: 2,
        retryDelay: 2000,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create strand' }));
        throw new Error(errorData.message || 'Failed to create strand');
      }

      // Reset form
      setContent('');
      setFile(null);
      setPreview(null);
      setSelectedGroupIds([]);
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
      if (isNetworkError(err)) {
        setError(getErrorMessage(err));
      } else {
        setError(err.message || 'Failed to create strand');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
        capture="environment"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
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
        {!preview ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCameraClick}
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="w-full h-auto max-h-96 object-contain"
              />
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
                📷 Take New
              </button>
              <button
                type="button"
                onClick={handleGalleryClick}
                className="bg-gray-700 text-gray-100 py-3 px-4 rounded-lg font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm min-h-[48px] active:scale-95 transition-all duration-200"
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
        disabled={uploading || (!content.trim() && !file) || selectedGroupIds.length === 0}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-[48px] transition-all duration-200 shadow-md hover:shadow-lg"
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Creating...
          </span>
        ) : (
          'Create Strand'
        )}
      </button>
    </form>
  );
}
