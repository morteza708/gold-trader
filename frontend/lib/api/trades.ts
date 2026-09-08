import apiClient from './client';
import type { MarketStatusData } from '@/lib/utils/marketStatus';

export type TradesStatus = MarketStatusData;

export interface MarketControlResponse extends MarketStatusData {
  message: string;
  suspended_buy_orders: number;
  suspended_sell_orders: number;
  resumed_buy_orders: number;
  resumed_sell_orders: number;
  suspended_orders: number;
  resumed_orders: number;
}

// ==================== Interfaces ====================

export interface GoldPrice {
  buy: number;
  sell: number;
  buy_enabled: boolean;
  sell_enabled: boolean;
  market_mode: MarketStatusData['market_mode'];
  trades_enabled: boolean;
  message: string;
  admin_notice?: string;
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
  channel?: 'PLATFORM' | 'MANUAL';
  channel_display?: string;
  settlement_mode?: 'WALLET' | 'OFFPLATFORM';
  settlement_mode_display?: string;
  payment_status?: string;
  payment_status_display?: string;
  delivery_status?: string;
  delivery_status_display?: string;
  settlement_note?: string;
  created_by_name?: string | null;
  payment_effect_applied?: boolean;
  delivery_effect_applied?: boolean;
  delivery_actual_karat?: string | number | null;
  delivery_physical_weight?: string | number | null;
  delivery_packet_code?: string;
  delivery_seri?: string;
  delivery_lab_name?: string;
  delivery_notes?: string;
  delivery_difference_rial?: string | number;
  delivery_difference_method?: string;
  delivery_difference_method_display?: string;
  has_delivery_details?: boolean;
}

export interface ManualCustomer {
  id: number;
  phone_number: string;
  first_name: string;
  last_name: string;
  full_name: string | null;
  national_id: string;
  is_phone_verified: boolean;
  is_active?: boolean;
  profile_completed?: boolean;
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

export interface PendingPurchase {
  id: number;
  request_code: string;
  status: string;
  status_display: string;
  gold_amount: number | string;
  locked_unit_price: number | string;
  locked_total: number | string;
  wallet_applied: number | string;
  deposit_min_amount: number | string;
  deposit_requested_amount: number | string | null;
  deposit_request_id: number | null;
  deposit_request_code: string | null;
  trade_id: number | null;
  expires_at: string;
  expires_at_jalali: string | null;
  remaining_seconds: number;
  created_at: string;
  created_at_jalali: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  user_phone?: string;
}

export interface ToggleTradesStatusResponse extends MarketControlResponse {}

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

  createPendingPurchase: async (amount: number): Promise<{
    message: string;
    pending_purchase: PendingPurchase;
    redirect_to: string;
  }> => {
    const response = await apiClient.post<{
      message: string;
      pending_purchase: PendingPurchase;
      redirect_to: string;
    }>('/trades/pending-purchases/create/', { amount });
    return response.data;
  },

  getActivePendingPurchase: async (): Promise<{ pending_purchase: PendingPurchase | null }> => {
    const response = await apiClient.get<{ pending_purchase: PendingPurchase | null }>(
      '/trades/pending-purchases/'
    );
    return response.data;
  },

  getPendingPurchase: async (id: number): Promise<PendingPurchase> => {
    const response = await apiClient.get<PendingPurchase>(`/trades/pending-purchases/${id}/`);
    return response.data;
  },

  cancelPendingPurchase: async (id: number): Promise<{ message: string; pending_purchase: PendingPurchase }> => {
    const response = await apiClient.post<{ message: string; pending_purchase: PendingPurchase }>(
      `/trades/pending-purchases/${id}/cancel/`
    );
    return response.data;
  },

  adminListPendingPurchases: async (status: string = 'active'): Promise<PendingPurchase[]> => {
    const response = await apiClient.get<PendingPurchase[]>('/admin/trades/pending-purchases/', {
      params: { status },
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

  // تغییر وضعیت معاملات (deprecated)
  toggleTradesStatus: async (enabled: boolean): Promise<ToggleTradesStatusResponse> => {
    const response = await apiClient.post<ToggleTradesStatusResponse>('/admin/trades/status/toggle/', {
      enabled,
    });
    return response.data;
  },

  updateMarketControl: async (data: {
    buy_enabled: boolean;
    sell_enabled: boolean;
    admin_notice?: string;
  }): Promise<MarketControlResponse> => {
    const response = await apiClient.post<MarketControlResponse>(
      '/admin/trades/market-control/',
      data
    );
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
    channel?: 'PLATFORM' | 'MANUAL';
  }): Promise<Trade[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.type) queryParams.append('type', params.type);
    if (params?.channel) queryParams.append('channel', params.channel);

    const response = await apiClient.get<Trade[]>(
      `/admin/trades/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  },

  searchCustomers: async (q: string): Promise<ManualCustomer[]> => {
    const response = await apiClient.get<{ results: ManualCustomer[] }>(
      `/admin/customers/search/?q=${encodeURIComponent(q)}`
    );
    return response.data.results;
  },

  ensureCustomer: async (data: {
    phone_number: string;
    first_name?: string;
    last_name?: string;
    national_id?: string;
  }): Promise<{ message: string; user: ManualCustomer }> => {
    const response = await apiClient.post('/admin/customers/ensure/', data);
    return response.data;
  },

  listManualTrades: async (): Promise<Trade[]> => {
    const response = await apiClient.get<Trade[]>('/admin/trades/manual/');
    return response.data;
  },

  createManualTrade: async (data: {
    user_id?: number;
    phone_number?: string;
    first_name?: string;
    last_name?: string;
    national_id?: string;
    trade_type: 'BUY' | 'SELL';
    amount: number | string;
    unit_price: number | string;
    settlement_mode: 'WALLET' | 'OFFPLATFORM';
    payment_status: string;
    delivery_status: string;
    admin_note?: string;
    settlement_note?: string;
    actual_karat?: string;
    physical_weight?: string;
    packet_code?: string;
    seri?: string;
    lab_name?: string;
    notes?: string;
    difference_rial?: string;
    difference_method?: string;
  }): Promise<{ message: string; trade: Trade }> => {
    const response = await apiClient.post('/admin/trades/manual/', data);
    return response.data;
  },

  updateManualSettlement: async (
    tradeId: number,
    data: {
      payment_status?: string;
      delivery_status?: string;
      settlement_note?: string;
      admin_note?: string;
      confirm_delivery?: boolean;
      amount?: number | string;
      unit_price?: number | string;
      actual_karat?: string;
      physical_weight?: string;
      packet_code?: string;
      seri?: string;
      lab_name?: string;
      notes?: string;
      difference_rial?: string;
      difference_method?: string;
    }
  ): Promise<{ message: string; trade: Trade }> => {
    const response = await apiClient.patch(`/admin/trades/manual/${tradeId}/settlement/`, data);
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

