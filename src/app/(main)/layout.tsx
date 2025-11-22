'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import BottomNav from '@/components/layout/BottomNav';
import NotificationManager from '@/components/notifications/NotificationManager';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <NotificationManager />
      <div className="min-h-screen pb-20">
        {children}
      </div>
      <BottomNav />
    </AuthProvider>
  );
}

