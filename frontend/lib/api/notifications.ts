import apiClient from './client';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'DEPOSIT_APPROVED' | 'DEPOSIT_REJECTED' | 'WITHDRAWAL_APPROVED' | 'WITHDRAWAL_REJECTED' | 'WITHDRAWAL_COMPLETED' | 'ORDER_EXECUTED' | 'TRADE_COMPLETED' | 'SYSTEM';
  type_display: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  created_at_jalali: string;
  read_at_jalali: string | null;
  related_object_type: string | null;
  related_object_id: number | null;
  metadata: Record<string, any>;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export const notificationsAPI = {
  /**
   * دریافت لیست اعلان‌ها
   */
  getNotifications: async (params?: {
    is_read?: boolean;
    type?: string;
    limit?: number;
  }): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications/', { params });
    return response.data;
  },

  /**
   * دریافت تعداد اعلان‌های خوانده نشده
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count/');
    return response.data.unread_count;
  },

  /**
   * علامت‌گذاری اعلان به عنوان خوانده شده
   */
  markAsRead: async (notificationId: number): Promise<Notification> => {
    const response = await apiClient.put(`/notifications/${notificationId}/read/`);
    return response.data;
  },

  /**
   * علامت‌گذاری همه اعلان‌ها به عنوان خوانده شده
   */
  markAllAsRead: async (): Promise<{ message: string }> => {
    const response = await apiClient.put('/notifications/mark-all-read/');
    return response.data;
  },

  /**
   * حذف اعلان
   */
  deleteNotification: async (notificationId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/notifications/${notificationId}/`);
    return response.data;
  },
};

