'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { imageApi, Image } from '@/lib/api';
import PullToRefresh from '@/components/common/PullToRefresh';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Skeleton from '@/components/common/Skeleton';

interface ImageFeedProps {
  groupId?: string;
  onImageClick?: (imageId: string) => void;
}

export default function ImageFeed({ groupId, onImageClick }: ImageFeedProps) {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchImages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const fetchImages = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError('');

      const currentOffset = reset ? 0 : offset;
      const response = groupId
        ? await imageApi.getGroupImages(groupId, 20, currentOffset)
        : await imageApi.getImageFeed(20, currentOffset);

      if (reset) {
        setImages(response.images);
      } else {
        setImages(prev => [...prev, ...response.images]);
      }

      setHasMore(response.pagination.hasMore);
      setOffset(currentOffset + response.images.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load images');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchImages(false);
    }
  };

  const handleRefresh = async () => {
    await fetchImages(true);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-2 gap-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
        {error}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No images yet.</p>
        <p className="text-sm text-gray-500">Share your first image to get started!</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-2 gap-2">
          {images.map((image, index) => (
            <div
              key={image.id}
              onClick={() => {
                if (onImageClick) {
                  onImageClick(image.id);
                } else {
                  router.push(`/images/${image.id}`);
                }
              }}
              className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-200 animate-scale-in"
              style={{
                animationDelay: `${index * 0.05}s`,
                animationFillMode: 'both',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.thumbnailUrl || image.imageUrl}
                alt={image.fileName}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
              {image.user && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-2 transition-opacity duration-200">
                  <p className="text-white text-xs font-medium truncate drop-shadow-sm">{image.user.displayName}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="text-center py-4 animate-slide-up">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-medium hover:bg-gray-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px] transition-all duration-200"
            >
              {loadingMore ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" />
                  Loading...
                </span>
              ) : (
                'Load More'
              )}
            </button>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}

