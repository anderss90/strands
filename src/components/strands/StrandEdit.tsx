'use client';

import { useState, FormEvent, useRef, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Strand } from '@/types/strand';

interface StrandEditProps {
  strand: Strand;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function StrandEdit({ strand, onSuccess, onCancel }: StrandEditProps) {
  const [content, setContent] = useState(strand.content || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Set preview if strand has an image
    if (strand.image) {
      setPreview(strand.image.imageUrl);
    }
  }, [strand]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setFile(selectedFile);
    setRemoveImage(false);
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validate: at least content or image must be present
    const hasContent = content.trim().length > 0;
    const hasImage = !removeImage && (file || (strand.image && !removeImage));

    if (!hasContent && !hasImage) {
      setError('Strand must have either text content or an image');
      return;
    }

    if (content.trim().length > 5000) {
      setError('Content must be 5000 characters or less');
      return;
    }

    setUpdating(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const formData = new FormData();
      
      if (content !== strand.content) {
        formData.append('content', content.trim() || '');
      }
      if (file) {
        formData.append('file', file);
      }
      if (removeImage) {
        formData.append('removeImage', 'true');
      }

      const response = await fetch(`/api/strands/${strand.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update strand');
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/strands/${strand.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update strand');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Text Content
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-base min-h-[120px] resize-y"
          maxLength={5000}
          rows={5}
        />
        <p className="text-xs text-gray-500 mt-1">
          {content.length}/5000 characters
        </p>
      </div>

      {/* Image Section */}
      {strand.image && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Image
          </label>
          <div className="relative rounded-lg overflow-hidden border border-gray-300 mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={strand.image.imageUrl}
              alt="Current image"
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>
          <label className="flex items-center space-x-2 mb-2">
            <input
              type="checkbox"
              checked={removeImage}
              onChange={(e) => {
                setRemoveImage(e.target.checked);
                if (e.target.checked) {
                  setFile(null);
                  setPreview(null);
                }
              }}
              className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Remove image</span>
          </label>
        </div>
      )}

      {/* New Image Selection */}
      {(!strand.image || !removeImage) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {strand.image ? 'Replace Image' : 'Add Image (optional)'}
          </label>
          {!preview || (strand.image && !file) ? (
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
              <div className="relative rounded-lg overflow-hidden border border-gray-300">
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
                    if (strand.image) {
                      setPreview(strand.image.imageUrl);
                    } else {
                      setPreview(null);
                    }
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
                  className="bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm min-h-[48px] active:scale-95 transition-all duration-200"
                >
                  📷 Take New
                </button>
                <button
                  type="button"
                  onClick={handleGalleryClick}
                  className="bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm min-h-[48px] active:scale-95 transition-all duration-200"
                >
                  🖼️ Choose Different
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-base min-h-[48px] transition-all duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={updating || (!content.trim() && !file && !strand.image && !removeImage)}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-[48px] transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {updating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Updating...
            </span>
          ) : (
            'Update Strand'
          )}
        </button>
      </div>
    </form>
  );
}

