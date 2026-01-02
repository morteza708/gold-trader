'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, UserInfo, VerifyOTPResponse } from '@/lib/api/auth';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  // State
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  
  // Actions
  login: (phoneNumber: string) => Promise<void>;
  verifyOTP: (phoneNumber: string, otpCode: string) => Promise<VerifyOTPResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  completeProfile: (data: {
    first_name: string;
    last_name: string;
    national_id: string;
    birth_date: string;
    national_card_image: File;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // بررسی اینکه آیا کاربر لاگین است یا نه
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          // تلاش برای دریافت اطلاعات کاربر
          const userData = await authAPI.getUserInfo();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
          // اگر token معتبر نبود، پاک کن
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // مدیریت redirect بر اساس نقش کاربر
  useEffect(() => {
    if (isLoading) return;

    const isAdminRoute = pathname?.startsWith('/admin');
    const isAuthRoute = pathname?.startsWith('/auth');
    const isDashboardRoute = pathname?.startsWith('/dashboard');

    if (!user) {
      // اگر کاربر لاگین نیست و در route محافظت شده است
      // اما صفحات login و verify را مستثنی می‌کنیم
      const isAdminLoginPage = pathname === '/admin/login' || pathname === '/admin/verify';
      const isAuthLoginPage = pathname === '/auth/login' || pathname === '/auth/verify';
      
      if (isAdminRoute && !isAdminLoginPage) {
        router.push('/admin/login');
      } else if (isDashboardRoute && !isAuthLoginPage) {
        router.push('/auth/login');
      }
      return;
    }

    // بررسی دسترسی بر اساس نقش
    if (isAdminRoute) {
      // فقط SUPER_ADMIN و SITE_ADMIN می‌توانند وارد پنل مدیریت شوند
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'SITE_ADMIN') {
        router.push('/dashboard');
        return;
      }
    }

    if (isDashboardRoute) {
      // همه کاربران می‌توانند وارد داشبورد شوند
      // اما اگر پروفایل کامل نشده، به صفحه تکمیل پروفایل هدایت شود
      if (!user.profile_completed && !pathname?.includes('/profile')) {
        router.push('/auth/profile');
        return;
      }
    }

    // اگر کاربر لاگین است و در صفحه login است
    if (isAuthRoute && pathname !== '/auth/profile') {
      const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'SITE_ADMIN';
      
      if (isAdmin) {
        // مدیران مستقیماً به پنل مدیریت می‌روند (نیازی به تکمیل پروفایل ندارند)
        router.push('/admin');
      } else {
        // مشتریان: اگر پروفایل کامل است، به داشبورد، وگرنه به صفحه تکمیل پروفایل
        if (user.profile_completed) {
          router.push('/dashboard');
        } else {
          router.push('/auth/profile');
        }
      }
    }
  }, [user, isLoading, pathname, router]);

  const login = async (phoneNumber: string) => {
    await authAPI.sendOTP(phoneNumber);
  };

  const verifyOTP = async (phoneNumber: string, otpCode: string): Promise<VerifyOTPResponse> => {
    const response: VerifyOTPResponse = await authAPI.verifyOTP(phoneNumber, otpCode);
    
    // تبدیل response.user به UserInfo (اضافه کردن فیلدهای missing)
    const userInfo: UserInfo = {
      ...response.user,
      national_id: null,
      birth_date: null,
      avatar: null,
    };
    
    // ذخیره token ها
    localStorage.setItem('access_token', response.access);
    localStorage.setItem('refresh_token', response.refresh);
    localStorage.setItem('user', JSON.stringify(userInfo));
    
    setUser(userInfo);

    // هدایت بر اساس نقش و وضعیت پروفایل
    const isAdmin = response.user.role === 'SUPER_ADMIN' || response.user.role === 'SITE_ADMIN';
    
    if (isAdmin) {
      // مدیران مستقیماً به پنل مدیریت می‌روند (نیازی به تکمیل پروفایل ندارند)
      router.push('/admin');
    } else {
      // مشتریان: اگر پروفایل کامل نشده، به صفحه تکمیل پروفایل
      if (!response.profile_completed) {
        router.push('/auth/profile');
      } else {
        router.push('/dashboard');
      }
    }

    return response;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      try {
        await authAPI.logout(refreshToken);
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }

    // پاک کردن همه چیز
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    
    router.push('/auth/login');
  };

  const refreshUser = async () => {
    try {
      const userData = await authAPI.getUserInfo();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error refreshing user:', error);
      logout();
    }
  };

  const completeProfile = async (data: {
    first_name: string;
    last_name: string;
    national_id: string;
    birth_date: string;
    national_card_image: File;
  }) => {
    const response = await authAPI.completeProfile(data);
    setUser(response.user);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    // هدایت به داشبورد مناسب
    if (response.user.role === 'SUPER_ADMIN' || response.user.role === 'SITE_ADMIN') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'SITE_ADMIN' || user?.role === 'SUPER_ADMIN' || false,
    isSuperAdmin: user?.role === 'SUPER_ADMIN' || false,
    login,
    verifyOTP,
    logout,
    refreshUser,
    completeProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
