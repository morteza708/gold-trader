'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requireProfileCompleted?: boolean;
}

export function ProtectedRoute({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
  requireProfileCompleted = false,
}: ProtectedRouteProps) {
  const { user, isLoading, isAdmin, isSuperAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    // اگر کاربر لاگین نیست
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // اگر نیاز به admin است
    if (requireAdmin && !isAdmin) {
      router.push('/dashboard');
      return;
    }

    // اگر نیاز به super admin است
    if (requireSuperAdmin && !isSuperAdmin) {
      router.push('/dashboard');
      return;
    }

    // اگر نیاز به پروفایل کامل است
    if (requireProfileCompleted && !user.profile_completed) {
      router.push('/auth/profile');
      return;
    }
  }, [user, isLoading, isAdmin, isSuperAdmin, requireAdmin, requireSuperAdmin, requireProfileCompleted, router]);

  // نمایش loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-foreground-muted">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // اگر کاربر لاگین نیست یا دسترسی ندارد، چیزی نمایش نده
  if (!user) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return null;
  }

  if (requireProfileCompleted && !user.profile_completed) {
    return null;
  }

  return <>{children}</>;
}
