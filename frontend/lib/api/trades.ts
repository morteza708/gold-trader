import apiClient from './client';

// ==================== Interfaces ====================

export interface GoldPrice {
  buy: number;
  sell: number;
  trades_enabled: boolean;
  updated_at: string;
  created_at_jalali: string;
  market_change?: number | null;
  market_change_percent?: number | null;
  market_high?: number | null;
  market_low?: number | null;
  market_price_time?: string | null;
  market_symbol_name?: string | null;
  last_synced_at?: string | null;
  last_synced_at_jalali?: string | null;
}

export interface GoldPriceAdmin {
  id: number;
  buy_base_price: number;
  sell_base_price: number;
  buy_margin: number;
  sell_margin: number;
  buy_final_price: number;
  sell_final_price: number;
  is_active: boolean;
  source: 'MANUAL' | 'API';
  created_at: string;
  created_at_jalali: string;
  created_by: number | null;
  created_by_name: string | null;
  live_feed_enabled?: boolean;
  live_symbol_id?: number;
  live_symbol_name?: string;
}

export interface GoldPriceHistory {
  buy_base_price: number;
  sell_base_price: number;
  buy_final_price: number;
  sell_final_price: number;
  source: 'MANUAL' | 'API';
  created_at: string;
  created_at_jalali: string;
}

export interface Trade {
  id: number;
  user: number;
  user_name: string;
  user_mobile: string;
  trade_type: 'BUY' | 'SELL';
  amount: number;
  price: number;
  total: number;
  fee: number;
  margin_profit: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  tracking_code: string;
  invoice_number: string;
  admin_note?: string | null;
  created_at: string;
  created_at_jalali: string;
}

export interface Order {
  id: number;
  user: number;
  order_type: 'BUY_LIMIT' | 'SELL_LIMIT';
  target_price: number;
  amount: number;
  status: 'PENDING' | 'SUSPENDED' | 'EXECUTED' | 'CANCELLED' | 'EXPIRED';
  executed_trade: Trade | null;
  expires_at: string | null;
  created_at: string;
  created_at_jalali: string;
}

export interface TradesStatus {
  trades_enabled: boolean;
  message: string;
}

export interface ToggleTradesStatusResponse {
  trades_enabled: boolean;
  message: string;
  suspended_orders: number;
  resumed_orders: number;
}

// ==================== User API Functions ====================

export const tradesAPI = {
  // دریافت قیمت فعلی (قیمت نهایی)
  getCurrentPrice: async (): Promise<GoldPrice> => {
    const response = await apiClient.get<GoldPrice>('/trades/price/');
    return response.data;
  },

  // دریافت وضعیت معاملات
  getTradesStatus: async (): Promise<TradesStatus> => {
    const response = await apiClient.get<TradesStatus>('/trades/status/');
    return response.data;
  },

  // خرید فوری
  buyGold: async (amount: number): Promise<{ message: string; trade: Trade }> => {
    const response = await apiClient.post<{ message: string; trade: Trade }>('/trades/buy/', {
      amount,
    });
    return response.data;
  },

  // فروش فوری
  sellGold: async (amount: number): Promise<{ message: string; trade: Trade }> => {
    const response = await apiClient.post<{ message: string; trade: Trade }>('/trades/sell/', {
      amount,
    });
    return response.data;
  },

  // ایجاد سفارش هوشمند
  createOrder: async (data: {
    order_type: 'BUY_LIMIT' | 'SELL_LIMIT';
    target_price: number;
    amount: number;
  }): Promise<{ message: string; order: Order }> => {
    const response = await apiClient.post<{ message: string; order: Order }>('/trades/orders/', data);
    return response.data;
  },

  // دریافت لیست سفارشات
  getOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/trades/orders/');
    return response.data;
  },

  // لغو سفارش
  cancelOrder: async (orderId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/trades/orders/${orderId}/`);
    return response.data;
  },

  // دریافت تاریخچه معاملات
  getTrades: async (): Promise<Trade[]> => {
    const response = await apiClient.get<Trade[]>('/trades/');
    return response.data;
  },

  // دریافت جزئیات معامله
  getTradeDetail: async (tradeId: number): Promise<Trade> => {
    const response = await apiClient.get<Trade>(`/trades/${tradeId}/`);
    return response.data;
  },

  // دانلود فاکتور PDF
  downloadInvoicePDF: async (tradeId: number): Promise<Blob> => {
    const response = await apiClient.get(`/trades/${tradeId}/invoice/`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ==================== Admin API Functions ====================

export const adminTradesAPI = {
  // دریافت وضعیت معاملات
  getTradesStatus: async (): Promise<TradesStatus> => {
    const response = await apiClient.get<TradesStatus>('/admin/trades/status/');
    return response.data;
  },

  // تغییر وضعیت معاملات
  toggleTradesStatus: async (enabled: boolean): Promise<ToggleTradesStatusResponse> => {
    const response = await apiClient.post<ToggleTradesStatusResponse>('/admin/trades/status/toggle/', {
      enabled,
    });
    return response.data;
  },

  // دریافت قیمت فعلی (با جزئیات)
  getCurrentPrice: async (): Promise<GoldPriceAdmin> => {
    const response = await apiClient.get<GoldPriceAdmin>('/admin/trades/price/current/');
    return response.data;
  },

  // به‌روزرسانی قیمت دستی
  updatePrice: async (data: {
    buy_base_price: number;
    sell_base_price: number;
    buy_margin: number;
    sell_margin: number;
  }): Promise<{ message: string; price: GoldPriceAdmin }> => {
    const response = await apiClient.post<{ message: string; price: GoldPriceAdmin }>(
      '/admin/trades/price/update/',
      data
    );
    return response.data;
  },

  // دریافت تاریخچه قیمت‌ها
  getPriceHistory: async (days: number = 30): Promise<GoldPriceHistory[]> => {
    const response = await apiClient.get<GoldPriceHistory[]>(
      `/admin/trades/price/history/?days=${days}`
    );
    return response.data;
  },

  // دریافت لیست معاملات
  getTrades: async (params?: {
    status?: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
    type?: 'BUY' | 'SELL';
  }): Promise<Trade[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);

    const response = await apiClient.get<Trade[]>(
      `/admin/trades/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  },

  // دریافت جزئیات معامله
  getTradeDetail: async (tradeId: number): Promise<Trade> => {
    const response = await apiClient.get<Trade>(`/admin/trades/${tradeId}/`);
    return response.data;
  },

  // دریافت لیست سفارشات
  getOrders: async (params?: {
    status?: 'PENDING' | 'SUSPENDED' | 'EXECUTED' | 'CANCELLED' | 'EXPIRED';
  }): Promise<Order[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);

    const response = await apiClient.get<Order[]>(
      `/admin/trades/orders/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  },

  // دانلود فاکتور PDF (Admin)
  downloadInvoicePDF: async (tradeId: number): Promise<Blob> => {
    const response = await apiClient.get(`/trades/${tradeId}/invoice/`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

