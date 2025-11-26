'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { groupApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils/dateFormat';

interface ShareGroupModalProps {
  groupId: string;
  onClose: () => void;
}

export default function ShareGroupModal({ groupId, onClose }: ShareGroupModalProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    try {
      setLoading(true);
      setError('');
      const invite = await groupApi.createInvite(groupId);
      setInviteUrl(invite.inviteUrl);
      setExpiresAt(invite.expiresAt);
    } catch (err: any) {
      setError(err.message || 'Failed to generate invite link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteUrl) return;
    
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  useEffect(() => {
    // Generate invite on mount
    generateInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 max-w-md w-full p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-100">Share Group</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {loading && !inviteUrl ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Generating invite link...</p>
          </div>
        ) : inviteUrl ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Invite Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 transition-all duration-200 min-h-[44px] text-sm font-medium"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                QR Code
              </label>
              <div className="bg-white p-4 rounded-lg">
                <QRCodeSVG value={inviteUrl} size={200} />
              </div>
            </div>

            {expiresAt && (
              <p className="text-xs text-gray-400 text-center">
                Expires: {formatDateTime(expiresAt)}
              </p>
            )}

            <button
              onClick={generateInvite}
              disabled={loading}
              className="w-full bg-gray-700 text-gray-100 py-2 px-4 rounded-lg font-medium hover:bg-gray-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm min-h-[44px] transition-all duration-200"
            >
              {loading ? 'Generating...' : 'Generate New Link'}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <button
              onClick={generateInvite}
              disabled={loading}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-[48px] transition-all duration-200"
            >
              {loading ? 'Generating...' : 'Generate Invite Link'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

