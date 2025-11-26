'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTimeLong, formatDateLong } from '@/lib/utils/dateFormat';

interface ChangelogEntry {
  hash: string;
  date: string;
  message: string;
  author: string;
}

interface ChangelogResponse {
  entries: ChangelogEntry[];
  error?: string;
}

export default function Changelog() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/changelog');
        const data: ChangelogResponse = await response.json();
        
        if (data.error) {
          setError(data.error);
        }
        
        setEntries(data.entries || []);
      } catch (err: any) {
        console.error('Error fetching changelog:', err);
        setError('Failed to load changelog');
      } finally {
        setLoading(false);
      }
    };

    fetchChangelog();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return formatDateTimeLong(dateString);
    } catch {
      return dateString;
    }
  };

  const groupByDate = (entries: ChangelogEntry[]) => {
    const grouped: { [key: string]: ChangelogEntry[] } = {};
    
    entries.forEach(entry => {
      try {
        const date = new Date(entry.date);
        const dateKey = formatDateLong(entry.date);
        
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(entry);
      } catch {
        // If date parsing fails, use the date string as-is
        if (!grouped[entry.date]) {
          grouped[entry.date] = [];
        }
        grouped[entry.date].push(entry);
      }
    });

    return grouped;
  };

  const groupedEntries = groupByDate(entries);
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => {
    try {
      return new Date(b).getTime() - new Date(a).getTime();
    } catch {
      return b.localeCompare(a);
    }
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading changelog...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.push('/console')}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Back to Console"
          >
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-gray-100">Changelog</h2>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Recent changes and updates to the application
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-900 p-4">
        {error && (
          <div className="mb-4 p-3 rounded border border-yellow-700/50 bg-yellow-900/20 text-yellow-400 text-sm">
            {error}
          </div>
        )}

        {entries.length === 0 && !error ? (
          <div className="text-center text-gray-500 py-8">
            No changelog entries available.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(date => (
              <div key={date} className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-700 pb-2">
                  {date}
                </h3>
                <div className="space-y-2">
                  {groupedEntries[date].map((entry, index) => (
                    <div
                      key={`${entry.hash}-${index}`}
                      className="p-3 rounded border bg-gray-800/50 border-gray-700/50 text-sm"
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-xs text-gray-500 font-mono min-w-[60px]">
                          {entry.hash}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(entry.date)}
                        </span>
                        <span className="text-xs text-gray-500">
                          by {entry.author}
                        </span>
                      </div>
                      <div className="text-gray-200 mt-2 whitespace-pre-wrap break-words">
                        {entry.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-400">
        Showing {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
      </div>
    </div>
  );
}

