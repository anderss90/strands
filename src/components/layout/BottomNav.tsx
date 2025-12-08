'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const handleHomeClick = (e: React.MouseEvent) => {
    // If we're already on home, dispatch an event to close any open strand viewers
    if (pathname === '/home') {
      e.preventDefault();
      // Dispatch custom event to close strand viewer
      window.dispatchEvent(new CustomEvent('closeStrandViewer'));
    }
  };

  const navItems = [
    { href: '/home', label: 'Home', icon: '🏠', onClick: handleHomeClick },
    { href: '/friends', label: 'Friends', icon: '👥' },
    { href: '/groups', label: 'Groups', icon: '👨‍👩‍👧‍👦' },
    { href: '/upload', label: 'Upload', icon: '📷' },
    { href: '/console', label: 'Console', icon: '🖥️' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 z-50 shadow-lg">
      <div className="flex items-center justify-between h-16 w-full px-2 max-w-2xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center flex-1 h-full min-h-[48px] transition-all duration-200 relative ${
                isActive
                  ? 'text-blue-400 scale-105'
                  : 'text-gray-400 active:scale-95'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-10 h-1 bg-blue-600 rounded-b-full"></div>
              )}
              <span className={`text-base mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[8px] font-medium transition-colors duration-200 leading-tight text-center ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

