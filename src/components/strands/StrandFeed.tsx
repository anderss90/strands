'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Strand } from '@/types/strand';
import StrandCard from './StrandCard';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Skeleton from '@/components/common/Skeleton';

interface StrandFeedProps {
  groupId?: string;
  pinnedOnly?: boolean;
  onStrandClick?: (strandId: string) => void;
}

interface StrandFeedResponse {
  strands: Strand[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function StrandFeed({ groupId, pinnedOnly = false, onStrandClick }: StrandFeedProps) {
  const [strands, setStrands] = useState<Strand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchStrands(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, pinnedOnly]);

  const fetchStrands = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      setError('');

      const currentOffset = reset ? 0 : offset;
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      
      let url = '/api/strands';
      if (groupId) {
        url = `/api/strands/group/${groupId}`;
        if (pinnedOnly) {
          url += '?pinned=true';
        }
      }
      url += `${groupId ? (pinnedOnly ? '&' : '?') : '?'}limit=20&offset=${currentOffset}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load strands');
      }

      const data: StrandFeedResponse = await response.json();

      if (reset) {
        setStrands(data.strands);
      } else {
        setStrands(prev => [...prev, ...data.strands]);
      }

      setHasMore(data.pagination.hasMore);
      setOffset(currentOffset + data.strands.length);
    } catch (err: any) {
      setError(err.message || 'Failed to load strands');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchStrands(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="grid grid-cols-1 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
        {error}
      </div>
    );
  }

  if (strands.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-4">
          {pinnedOnly ? 'No pinned strands yet.' : 'No strands yet.'}
        </p>
        <p className="text-sm text-gray-500">
          {pinnedOnly ? 'Pin a strand to see it here!' : 'Share your first strand to get started!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 gap-4">
        {strands.map((strand, index) => (
          <div
            key={strand.id}
            style={{
              animationDelay: `${index * 0.05}s`,
              animationFillMode: 'both',
            }}
          >
            <StrandCard
              strand={strand}
              onClick={() => {
                if (onStrandClick) {
                  onStrandClick(strand.id);
                } else {
                  router.push(`/strands/${strand.id}`);
                }
              }}
              onFireUpdate={(strandId, fireCount, hasUserFired) => {
                setStrands(prev =>
                  prev.map(s =>
                    s.id === strandId
                      ? { ...s, fireCount, hasUserFired }
                      : s
                  )
                );
              }}
            />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="text-center py-4 animate-slide-up">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="bg-gray-700 text-gray-100 py-3 px-6 rounded-lg font-medium hover:bg-gray-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px] transition-all duration-200"
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
  );
}
