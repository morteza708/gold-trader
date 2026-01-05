import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// ایجاد instance اصلی axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request Interceptor - اضافه کردن token به header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // دریافت token از localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug log برای درخواست‌های OTP
    if (config.url?.includes('send-otp')) {
      console.log('[API Client] درخواست ارسال OTP:', {
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        method: config.method,
        data: config.data,
      });
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('[API Client] خطا در request interceptor:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor - مدیریت خطاها و refresh token
apiClient.interceptors.response.use(
  (response) => {
    // Debug log برای پاسخ‌های OTP
    if (response.config.url?.includes('send-otp')) {
      console.log('[API Client] پاسخ ارسال OTP:', {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    // Debug log برای خطاهای OTP
    if (error.config?.url?.includes('send-otp')) {
      console.error('[API Client] خطا در ارسال OTP:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        config: error.config,
      });
    }
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // اگر خطای 401 بود و قبلا retry نکرده‌ایم
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // تلاش برای refresh token
        const refreshToken = typeof window !== 'undefined' 
          ? localStorage.getItem('refresh_token') 
          : null;

        if (refreshToken) {
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;

          // ذخیره token جدید
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', access);
          }

          // تکرار request با token جدید
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }

          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // اگر refresh token هم کار نکرد، کاربر را logout کن
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
