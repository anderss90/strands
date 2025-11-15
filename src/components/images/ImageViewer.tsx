'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { imageApi, Image } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface ImageViewerProps {
  imageId: string;
  onClose?: () => void;
}

export default function ImageViewer({ imageId, onClose }: ImageViewerProps) {
  const [image, setImage] = useState<Image | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    fetchImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId]);

  const fetchImage = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await imageApi.getImage(imageId);
      setImage(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      setDeleting(true);
      await imageApi.deleteImage(imageId);
      if (onClose) {
        onClose();
      } else {
        router.push('/home');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete image');
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" className="text-white" />
          <div className="text-white text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white text-center px-4">
          <p className="mb-4">{error || 'Image not found'}</p>
          <button
            onClick={handleClose}
            className="bg-white text-black px-4 py-2 rounded-lg font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === image.userId;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300">
        <button
          onClick={handleClose}
          className="text-white p-2 hover:bg-white/10 active:bg-white/20 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-200 active:scale-95"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div className="flex-1 text-white text-center font-medium">
          {image.user?.displayName || 'Image'}
        </div>
        {isOwner && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 p-2 hover:bg-white/10 active:bg-white/20 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50 transition-all duration-200 active:scale-95"
          >
            {deleting ? (
              <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            )}
          </button>
        )}
        {!isOwner && <div className="w-[44px]" />}
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center overflow-hidden animate-scale-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.imageUrl}
          alt={image.fileName}
          className="max-w-full max-h-full object-contain transition-transform duration-300"
        />
      </div>

      {/* Footer */}
      <div className="p-4 bg-black/50 backdrop-blur-sm text-white text-sm transition-opacity duration-300 animate-slide-up">
        {image.groups && image.groups.length > 0 && (
          <div className="mb-2">
            <p className="text-gray-400 text-xs mb-1">Shared in:</p>
            <div className="flex flex-wrap gap-1">
              {image.groups.map((group) => (
                <span
                  key={group.id}
                  className="bg-blue-600 px-2 py-1 rounded text-xs"
                >
                  {group.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {image.user && (
          <div className="flex items-center gap-2">
            {image.user.profilePictureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.user.profilePictureUrl}
                alt={image.user.displayName}
                className="w-6 h-6 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">@{image.user.username}</p>
              <p className="text-gray-400 text-xs">
                {new Date(image.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

