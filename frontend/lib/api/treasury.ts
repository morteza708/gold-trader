import apiClient from './client';

export interface CoverageSnapshot {
  company_gold_balance: string;
  avg_cost_per_gram: string;
  customer_gold_liability: string;
  pending_gold_delivery: string;
  obligated_gold: string;
  cover_ratio: string;
  cover_percent: string;
  status: 'ok' | 'warning' | 'critical';
  status_label: string;
  buy_blocked: boolean;
  auto_block_user_buy: boolean;
  warning_cover_ratio: string;
  critical_cover_ratio: string;
  shortfall_gold: string;
  updated_at?: string;
}

export interface VaultMovement {
  id: number;
  created_at: string;
  created_at_jalali: string | null;
  movement_type: 'IN' | 'OUT' | 'ADJUST';
  movement_type_display: string;
  amount: string;
  unit_price: string;
  counterparty: string;
  note: string;
  created_by_name: string | null;
}

export interface JournalRow {
  id: number;
  created_at: string;
  created_at_jalali: string | null;
  asset: 'RIAL' | 'GOLD';
  asset_display: string;
  amount: string;
  unit_price: string | null;
  event_type: string;
  event_type_display: string;
  user_phone: string | null;
  user_name: string | null;
  balance_after: string | null;
  reference_type: string;
  reference_id: number | null;
  note: string;
}

export interface GoldDebtor {
  user_id: number;
  phone_number: string;
  full_name: string | null;
  account_code: string | null;
  gold_balance: string;
  rial_balance: string;
}

export interface OpenWithdrawal {
  id: number;
  request_code: string;
  withdrawal_type: 'RIAL' | 'GOLD';
  withdrawal_type_display: string;
  status: string;
  status_display: string;
  amount: string;
  user_id: number;
  phone_number: string;
  full_name: string | null;
  account_code: string | null;
}

export const adminTreasuryAPI = {
  getOverview: async (): Promise<CoverageSnapshot> => {
    const res = await apiClient.get<CoverageSnapshot>('/admin/treasury/overview/');
    return res.data;
  },

  getSettings: async (): Promise<{
    warning_cover_ratio: string;
    critical_cover_ratio: string;
    auto_block_user_buy: boolean;
    gold_balance: string;
    avg_cost_per_gram: string;
  }> => {
    const res = await apiClient.get('/admin/treasury/settings/');
    return res.data;
  },

  updateSettings: async (data: {
    warning_cover_ratio?: number | string;
    critical_cover_ratio?: number | string;
    auto_block_user_buy?: boolean;
  }) => {
    const res = await apiClient.put('/admin/treasury/settings/', data);
    return res.data as { message: string; settings: unknown; coverage: CoverageSnapshot };
  },

  listVaultMovements: async (): Promise<VaultMovement[]> => {
    const res = await apiClient.get<VaultMovement[]>('/admin/treasury/vault-movements/');
    return res.data;
  },

  createVaultMovement: async (data: {
    movement_type: 'IN' | 'OUT' | 'ADJUST';
    amount: number | string;
    unit_price?: number | string;
    counterparty?: string;
    note?: string;
  }) => {
    const res = await apiClient.post('/admin/treasury/vault-movements/', data);
    return res.data as { message: string; movement: VaultMovement; coverage: CoverageSnapshot };
  },

  listJournal: async (params?: {
    event_type?: string;
    asset?: string;
    search?: string;
  }): Promise<JournalRow[]> => {
    const query = new URLSearchParams();
    if (params?.event_type) query.append('event_type', params.event_type);
    if (params?.asset) query.append('asset', params.asset);
    if (params?.search) query.append('search', params.search);
    const q = query.toString();
    const res = await apiClient.get<JournalRow[]>(`/admin/treasury/journal/${q ? `?${q}` : ''}`);
    return res.data;
  },

  getParties: async (): Promise<{
    gold_debtors: GoldDebtor[];
    open_withdrawals: OpenWithdrawal[];
    totals: {
      total_customer_gold: string;
      total_pending_gold_delivery: string;
      open_rial_withdrawals: string;
    };
    coverage: CoverageSnapshot;
  }> => {
    const res = await apiClient.get('/admin/treasury/parties/');
    return res.data;
  },
};
