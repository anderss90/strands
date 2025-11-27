'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import BottomNav from '@/components/layout/BottomNav';
import NotificationManager from '@/components/notifications/NotificationManager';
import ConsoleCapture from '@/components/debug/ConsoleCapture';
import UpdatePrompt from '@/components/common/UpdatePrompt';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ConsoleCapture />
      <NotificationManager />
      <UpdatePrompt />
      <div className="min-h-screen pb-20">
        {children}
      </div>
      <BottomNav />
    </AuthProvider>
  );
}

