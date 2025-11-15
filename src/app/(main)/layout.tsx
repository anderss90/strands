'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import BottomNav from '@/components/layout/BottomNav';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen pb-20">
        {children}
      </div>
      <BottomNav />
    </AuthProvider>
  );
}

