
'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Layout } from './Layout';
import { useAuth } from '@/contexts';

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const isPublic = pathname?.startsWith('/auth') || pathname === '/';
  
  if (isPublic) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    router.replace('/auth/login');
    return null;
  }
  
  return <Layout>{children}</Layout>;
}
