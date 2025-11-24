'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { href: '/home', label: 'Home', icon: '🏠' },
    { href: '/friends', label: 'Friends', icon: '👥' },
    { href: '/groups', label: 'Groups', icon: '👨‍👩‍👧‍👦' },
    { href: '/upload', label: 'Upload', icon: '📷' },
    { href: '/console', label: 'Console', icon: '🖥️' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 z-50 shadow-lg">
      <div className="flex items-center h-16 w-full max-w-2xl mx-auto overflow-x-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full min-w-[60px] max-w-[80px] h-full min-h-[48px] transition-all duration-200 relative shrink-0 ${
                isActive
                  ? 'text-blue-400 scale-105'
                  : 'text-gray-400 active:scale-95'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-blue-600 rounded-b-full"></div>
              )}
              <span className={`text-lg mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-[9px] font-medium transition-colors duration-200 leading-tight text-center ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

