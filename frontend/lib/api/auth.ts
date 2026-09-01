import apiClient from './client';

export interface SendOTPResponse {
  message: string;
}

export interface VerifyOTPResponse {
  access: string;
  refresh: string;
  profile_completed: boolean;
  user: {
    id: number;
    phone_number: string;
    first_name: string | null;
    last_name: string | null;
    role: 'SUPER_ADMIN' | 'SITE_ADMIN' | 'CUSTOMER';
    is_phone_verified: boolean;
    profile_completed: boolean;
  };
}

export interface UserInfo {
  id: number;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
  role: 'SUPER_ADMIN' | 'SITE_ADMIN' | 'CUSTOMER';
  is_phone_verified: boolean;
  profile_completed: boolean;
  national_id: string | null;
  birth_date: string | null;
  avatar: string | null; // URL to avatar image
  has_bank_card?: boolean;
  customer_profile?: {
    account_code: string;
    created_at: string;
    updated_at: string;
  } | null;
}

export interface CompleteProfileData {
  first_name: string;
  last_name: string;
  national_id: string;
  birth_date: string; // فرمت: YYYY-MM-DD (شمسی)
  national_card_image: File;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  birth_date?: string; // فرمت: YYYY-MM-DD (شمسی)
  avatar?: File; // اختیاری
  remove_avatar?: boolean;
}

// API Functions
export const authAPI = {
  // ارسال OTP برای کاربر عادی
  sendOTP: async (phoneNumber: string): Promise<SendOTPResponse> => {
    const response = await apiClient.post<SendOTPResponse>('/auth/send-otp/', {
      phone_number: phoneNumber,
    });
    return response.data;
  },

  // تایید OTP و دریافت token
  verifyOTP: async (phoneNumber: string, otpCode: string): Promise<VerifyOTPResponse> => {
    const response = await apiClient.post<VerifyOTPResponse>('/auth/verify-otp/', {
      phone_number: phoneNumber,
      otp_code: otpCode,
    });
    return response.data;
  },

  // دریافت اطلاعات کاربر فعلی
  getUserInfo: async (): Promise<UserInfo> => {
    const response = await apiClient.get<UserInfo>('/auth/user/');
    return response.data;
  },

  // تکمیل پروفایل
  completeProfile: async (data: CompleteProfileData): Promise<{ message: string; user: UserInfo }> => {
    const formData = new FormData();
    formData.append('first_name', data.first_name);
    formData.append('last_name', data.last_name);
    formData.append('national_id', data.national_id);
    formData.append('birth_date', data.birth_date);
    formData.append('national_card_image', data.national_card_image);

    const response = await apiClient.post<{ message: string; user: UserInfo }>(
      '/auth/complete-profile/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // به‌روزرسانی پروفایل
  updateProfile: async (data: UpdateProfileData): Promise<{ message: string; user: UserInfo }> => {
    const formData = new FormData();
    if (data.first_name) formData.append('first_name', data.first_name);
    if (data.last_name) formData.append('last_name', data.last_name);
    if (data.birth_date) formData.append('birth_date', data.birth_date);
    if (data.avatar) formData.append('avatar', data.avatar);
    if (data.remove_avatar) formData.append('remove_avatar', 'true');

    const response = await apiClient.patch<{ message: string; user: UserInfo }>(
      '/auth/profile/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // خروج از سیستم
  logout: async (refreshToken: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/logout/', {
      refresh: refreshToken,
    });
    return response.data;
  },
};

// Admin API Types
export interface AdminUserListItem {
  id: number;
  phone_number: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  national_id: string | null;
  role: 'SUPER_ADMIN' | 'SITE_ADMIN' | 'CUSTOMER';
  role_display: string;
  is_phone_verified: boolean;
  is_active: boolean;
  profile_completed: boolean;
  date_joined: string;
  date_joined_jalali: string | null;
  last_login: string | null;
  last_login_jalali: string | null;
  avatar: string | null;
  customer_profile: {
    account_code: string;
  } | null;
}

export interface AdminUsersListResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: boolean;
  previous: boolean;
  results: AdminUserListItem[];
  stats: {
    total: number;
    active: number;
    blocked: number;
    pending: number;
    verified: number;
    unverified: number;
  };
}

export interface AdminUsersListParams {
  is_verified?: boolean;
  is_active?: boolean;
  role?: 'CUSTOMER' | 'SITE_ADMIN' | 'SUPER_ADMIN';
  profile_completed?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  national_card_image: string | null;
  birth_date: string | null;
  gold_balance: number;
  rial_balance: number;
  total_trades: number;
  total_volume: number;
  is_active: boolean;
}

// Admin API Functions
export const adminAPI = {
  // دریافت لیست کاربران
  getUsersList: async (params?: AdminUsersListParams): Promise<AdminUsersListResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.is_verified !== undefined) {
      queryParams.append('is_verified', params.is_verified.toString());
    }
    if (params?.is_active !== undefined) {
      queryParams.append('is_active', params.is_active.toString());
    }
    if (params?.role) {
      queryParams.append('role', params.role);
    }
    if (params?.profile_completed !== undefined) {
      queryParams.append('profile_completed', params.profile_completed.toString());
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }
    if (params?.page) {
      queryParams.append('page', params.page.toString());
    }
    if (params?.page_size) {
      queryParams.append('page_size', params.page_size.toString());
    }
    
    const response = await apiClient.get<AdminUsersListResponse>(
      `/admin/users/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  },

  // دریافت جزئیات کامل یک کاربر
  getUserDetail: async (userId: number): Promise<AdminUserDetail> => {
    const response = await apiClient.get<AdminUserDetail>(`/admin/users/${userId}/`);
    return response.data;
  },

  // فعال/غیرفعال کردن کاربر
  toggleUserStatus: async (userId: number): Promise<{ message: string; user: AdminUserListItem }> => {
    const response = await apiClient.patch<{ message: string; user: AdminUserListItem }>(
      `/admin/users/${userId}/toggle-status/`
    );
    return response.data;
  },

  // ثبت یا تایید شماره موبایل از پنل مدیریت
  registerOrVerifyPhone: async (phoneNumber: string, role: 'CUSTOMER' | 'SITE_ADMIN' = 'CUSTOMER', sendInvite: boolean = true): Promise<{
    message: string;
    action: 'registered' | 'verified';
    user: {
      id: number;
      phone_number: string;
      is_phone_verified: boolean;
      role?: string;
    };
  }> => {
    const response = await apiClient.post('/admin/register-or-verify-phone/', {
      phone_number: phoneNumber,
      role: role,
      send_invite: sendInvite,
    });
    return response.data;
  },

  // دریافت آمار dashboard
  getDashboardStats: async (): Promise<{
    total_users: number;
    new_users_today: number;
    trades_today_count: number;
    trades_today_volume: number;
    revenue_today: number;
    pending_requests: number;
  }> => {
    const response = await apiClient.get('/admin/dashboard/stats/');
    return response.data;
  },
};

// ==================== Wallet API Types ====================

export interface Wallet {
  rial_balance: number;
  gold_balance: number;
  pending_withdrawal_rial?: number;
  pending_withdrawal_gold?: number;
  pending_trade_rial?: number;
  available_rial_balance?: number;
  available_gold_balance?: number;
  created_at: string;
  updated_at: string;
}

export interface BankCard {
  id: number;
  bank_name: string;
  card_number: string;
  sheba_number: string;
  is_active: boolean;
  created_at: string;
}

export interface DepositAccountAssignment {
  id: number;
  account_type: 'WITHDRAWAL' | 'DEPOSIT_ACCOUNT' | 'CUSTOM';
  withdrawal_request?: number;
  deposit_account?: number;
  custom_bank_name?: string;
  custom_owner_name?: string;
  custom_card_number?: string;
  custom_sheba_number?: string;
  amount: string;
  order: number;
  account_display?: string;
  withdrawal_request_info?: {
    id: number;
    request_code: string;
    amount: string;
    user_info?: {
      phone_number: string;
      full_name: string;
      account_code?: string;
    };
    bank_card_info?: {
      bank_name: string;
      card_number?: string;
      card_number_last_4: string;
      sheba_number?: string;
    };
    created_at?: string;
    withdrawal_type: 'RIAL' | 'GOLD';
  };
  deposit_account_info?: {
    id: number;
    bank_name: string;
    owner_name: string;
    card_number: string;
    sheba_number: string;
  };
  receipts_total?: string;
  remaining_amount?: string;
  receipts_count?: number;
  created_at: string;
}

export interface DepositReceipt {
  id: number;
  deposit_request: number;
  account_assignment: number;
  account_assignment_info: DepositAccountAssignment;
  tracking_number: string;
  deposit_date: string;
  deposit_date_jalali: string;
  receipt_image: string;
  receipt_image_url: string;
  amount: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_note?: string | null;
  created_at: string;
  created_at_jalali: string;
  updated_at: string;
  assignments?: DepositAccountAssignment[];
  receipts?: DepositReceipt[];
}

export interface DepositWithdrawalLink {
  id: number;
  deposit_receipt: number;
  withdrawal_request: number;
  amount: string;
  auto_approved: boolean;
  deposit_receipt_info?: {
    id: number;
    deposit_request_code: string;
    tracking_number: string;
    amount: string;
  };
  withdrawal_request_info?: {
    id: number;
    request_code: string;
    user_phone: string;
    amount: string;
  };
  created_at: string;
  created_at_jalali?: string;
}

export interface DepositRequest {
  id: number;
  amount: number;
  tracking_number?: string | null;
  deposit_date?: string | null;
  deposit_date_jalali?: string | null;
  receipt_image?: string | null;
  receipt_image_url?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  request_code: string;
  admin_note: string | null;
  user_info?: {
    id: number;
    phone_number: string;
    first_name: string | null;
    last_name: string | null;
    account_code: string | null;
  };
  assignments?: DepositAccountAssignment[];
  receipts?: DepositReceipt[];
  created_at: string;
  created_at_jalali: string | null;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: number;
  withdrawal_type: 'RIAL' | 'GOLD';
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  request_code: string;
  bank_card: BankCard | null;
  receipt_image: string | null;
  admin_note: string | null;
  user_info: {
    id: number;
    phone_number: string;
    first_name: string | null;
    last_name: string | null;
    account_code: string | null;
  };
  created_at: string;
  created_at_jalali: string | null;
  completed_at?: string | null;
  completed_at_jalali?: string | null;
  gold_pickup_address?: string | null;
  updated_at: string;
  paid_amount?: number;
  remaining_amount?: number;
  is_fully_paid?: boolean;
  deposit_receipts_info?: Array<{
    id: number;
    deposit_request_code: string;
    depositor_info: {
      id: number;
      phone_number: string;
      first_name: string;
      last_name: string;
      full_name: string;
      account_code: string | null;
    };
    amount: string;
    tracking_number: string;
    deposit_date: string | null;
    deposit_date_jalali: string | null;
    receipt_image_url: string | null;
    status: string;
    created_at: string | null;
    created_at_jalali: string | null;
    link_amount: string;
  }>;
}

export interface SystemSettings {
  admin_phone_numbers: string[];
  gold_pickup_address: string | null;
  updated_at: string;
}

// Wallet API Functions
export const walletAPI = {
  // دریافت اطلاعات کیف پول
  getWallet: async (): Promise<Wallet> => {
    const response = await apiClient.get<Wallet>('/wallet/');
    return response.data;
  },

  // ثبت یک‌مرحله‌ای واریز (مبلغ + حساب + فیش)
  createDepositRequest: async (data: {
    amount: number;
    deposit_account_id: number;
    tracking_number: string;
    deposit_date: string;
    receipt_image: File;
    pending_purchase_id?: number;
  }): Promise<DepositRequest> => {
    const formData = new FormData();
    formData.append('amount', data.amount.toString());
    formData.append('deposit_account_id', data.deposit_account_id.toString());
    formData.append('tracking_number', data.tracking_number);
    formData.append('deposit_date', data.deposit_date);
    formData.append('receipt_image', data.receipt_image);
    if (data.pending_purchase_id) {
      formData.append('pending_purchase_id', data.pending_purchase_id.toString());
    }
    const response = await apiClient.post<DepositRequest>('/wallet/deposit/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // دریافت لیست کارت‌های بانکی
  getBankCards: async (): Promise<BankCard[]> => {
    const response = await apiClient.get<BankCard[]>('/wallet/cards/');
    return response.data;
  },

  // افزودن کارت بانکی
  addBankCard: async (data: {
    bank_name: string;
    card_number: string;
    sheba_number: string;
  }): Promise<BankCard> => {
    const response = await apiClient.post<BankCard>('/wallet/cards/', data);
    return response.data;
  },

  // ویرایش کارت بانکی
  updateBankCard: async (cardId: number, data: Partial<BankCard>): Promise<BankCard> => {
    const response = await apiClient.put<BankCard>(`/wallet/cards/${cardId}/`, data);
    return response.data;
  },

  // حذف کارت بانکی
  deleteBankCard: async (cardId: number): Promise<void> => {
    await apiClient.delete(`/wallet/cards/${cardId}/`);
  },

  // ایجاد درخواست برداشت
  createWithdrawalRequest: async (data: {
    withdrawal_type: 'RIAL' | 'GOLD';
    amount: number;
    bank_card_id?: number;
  }): Promise<WithdrawalRequest> => {
    const response = await apiClient.post<WithdrawalRequest>('/wallet/withdraw/', data);
    return response.data;
  },

  // دریافت لیست درخواست‌های برداشت
  getWithdrawalRequests: async (): Promise<WithdrawalRequest[]> => {
    const response = await apiClient.get<WithdrawalRequest[]>('/wallet/withdrawals/');
    return response.data;
  },

  // دریافت لیست درخواست‌های واریز
  getDepositRequests: async (): Promise<DepositRequest[]> => {
    const response = await apiClient.get<DepositRequest[]>('/wallet/deposits/');
    return response.data;
  },

  // دریافت آدرس مراجعه حضوری
  getGoldPickupAddress: async (): Promise<{ address: string }> => {
    const response = await apiClient.get<{ address: string }>('/wallet/gold-pickup-address/');
    return response.data;
  },

  // دریافت لیست حساب‌های تخصیص یافته برای یک درخواست واریز
  getDepositAssignments: async (depositRequestId: number): Promise<DepositAccountAssignment[]> => {
    const response = await apiClient.get<DepositAccountAssignment[]>(
      `/wallet/deposits/${depositRequestId}/accounts/`
    );
    return response.data;
  },

  // آپلود فیش واریزی برای یک حساب تخصیص یافته
  uploadDepositReceipt: async (
    depositRequestId: number,
    assignmentId: number,
    data: {
      amount: number;
      tracking_number: string;
      deposit_date: string; // YYYY-MM-DD
      receipt_image: File;
    }
  ): Promise<{ message: string; receipt: DepositReceipt }> => {
    const formData = new FormData();
    formData.append('assignment_id', assignmentId.toString());
    formData.append('amount', data.amount.toString());
    formData.append('tracking_number', data.tracking_number);
    formData.append('deposit_date', data.deposit_date);
    formData.append('receipt_image', data.receipt_image);
    
    const response = await apiClient.post<{ message: string; receipt: DepositReceipt }>(
      `/wallet/deposits/${depositRequestId}/receipts/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  uploadDepositReceiptsBatch: async (
    depositRequestId: number,
    receipts: Array<{
      assignment_id: number;
      amount: number;
      tracking_number: string;
      deposit_date: string; // YYYY-MM-DD
      receipt_image: File;
    }>
  ): Promise<{ message: string; receipts: DepositReceipt[] }> => {
    const formData = new FormData();
    
    // اضافه کردن هر receipt به formData
    receipts.forEach((receipt, index) => {
      formData.append(`receipts[${index}][assignment_id]`, receipt.assignment_id.toString());
      formData.append(`receipts[${index}][amount]`, receipt.amount.toString());
      formData.append(`receipts[${index}][tracking_number]`, receipt.tracking_number);
      formData.append(`receipts[${index}][deposit_date]`, receipt.deposit_date);
      formData.append(`receipts[${index}][receipt_image]`, receipt.receipt_image);
    });
    
    const response = await apiClient.post<{ message: string; receipts: DepositReceipt[] }>(
      `/wallet/deposits/${depositRequestId}/receipts/batch/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};

// Admin Wallet API Functions
export const adminWalletAPI = {
  // دریافت لیست درخواست‌های برداشت
  getWithdrawalRequests: async (params?: {
    type?: 'RIAL' | 'GOLD';
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  }): Promise<WithdrawalRequest[]> => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.status) queryParams.append('status', params.status);
    
    const response = await apiClient.get<WithdrawalRequest[]>(
      `/admin/wallet/withdrawals/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  },

  // دریافت لیست درخواست‌های واریز
  getDepositRequests: async (params?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  }): Promise<DepositRequest[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    
    const response = await apiClient.get<DepositRequest[]>(
      `/admin/wallet/deposits/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  },

  // دریافت جزئیات درخواست واریز
  getDepositRequestDetail: async (requestId: number): Promise<DepositRequest> => {
    const response = await apiClient.get<DepositRequest>(`/admin/wallet/deposits/${requestId}/`);
    return response.data;
  },

  // تایید درخواست واریز (Old flow - برای سازگاری)
  approveDeposit: async (requestId: number): Promise<{ message: string; deposit_request: DepositRequest }> => {
    const response = await apiClient.patch<{ message: string; deposit_request: DepositRequest }>(
      `/admin/wallet/deposits/${requestId}/approve/`
    );
    return response.data;
  },

  // دریافت لیست درخواست‌های برداشت برای انتخاب در مودال واریز
  getDepositWithdrawalRequests: async (depositRequestId: number): Promise<WithdrawalRequest[]> => {
    const response = await apiClient.get<WithdrawalRequest[]>(
      `/admin/wallet/deposits/${depositRequestId}/withdrawal-requests/`
    );
    return response.data;
  },

  // ثبت حساب‌های مقصد برای درخواست واریز
  assignDepositAccounts: async (
    depositRequestId: number,
    accounts: Array<{
      account_type: 'WITHDRAWAL' | 'DEPOSIT_ACCOUNT' | 'CUSTOM';
      withdrawal_request_id?: number;
      deposit_account_id?: number;
      custom_bank_name?: string;
      custom_card_number?: string;
      custom_sheba_number?: string;
      amount: number;
      order?: number;
    }>
  ): Promise<{ message: string; assignments: DepositAccountAssignment[] }> => {
    const response = await apiClient.post<{ message: string; assignments: DepositAccountAssignment[] }>(
      `/admin/wallet/deposits/${depositRequestId}/assign-accounts/`,
      { accounts }
    );
    return response.data;
  },

  // تایید نهایی درخواست واریز (New flow)
  approveDepositNewFlow: async (depositRequestId: number): Promise<{
    message: string;
    deposit_request: DepositRequest;
    auto_approved_withdrawals: DepositWithdrawalLink[];
    auto_approved_count: number;
  }> => {
    const response = await apiClient.post<{
      message: string;
      deposit_request: DepositRequest;
      auto_approved_withdrawals: DepositWithdrawalLink[];
      auto_approved_count: number;
    }>(`/admin/wallet/deposits/${depositRequestId}/approve-new/`);
    return response.data;
  },

  // رد درخواست واریز
  rejectDeposit: async (requestId: number, adminNote?: string): Promise<{ message: string; deposit_request: DepositRequest }> => {
    const response = await apiClient.patch<{ message: string; deposit_request: DepositRequest }>(
      `/admin/wallet/deposits/${requestId}/reject/`,
      { admin_note: adminNote || '' }
    );
    return response.data;
  },

  // دریافت جزئیات درخواست
  getWithdrawalRequestDetail: async (requestId: number): Promise<WithdrawalRequest> => {
    const response = await apiClient.get<WithdrawalRequest>(`/admin/wallet/withdrawals/${requestId}/`);
    return response.data;
  },

  // تایید درخواست
  approveWithdrawal: async (requestId: number): Promise<{ message: string; withdrawal_request: WithdrawalRequest }> => {
    const response = await apiClient.patch<{ message: string; withdrawal_request: WithdrawalRequest }>(
      `/admin/wallet/withdrawals/${requestId}/approve/`
    );
    return response.data;
  },

  // رد درخواست
  rejectWithdrawal: async (requestId: number, adminNote?: string): Promise<{ message: string; withdrawal_request: WithdrawalRequest }> => {
    const response = await apiClient.patch<{ message: string; withdrawal_request: WithdrawalRequest }>(
      `/admin/wallet/withdrawals/${requestId}/reject/`,
      { admin_note: adminNote || '' }
    );
    return response.data;
  },

  // آپلود فیش واریزی
  uploadReceipt: async (requestId: number, file: File): Promise<{ message: string; withdrawal_request: WithdrawalRequest }> => {
    const formData = new FormData();
    formData.append('receipt_image', file);
    
    const response = await apiClient.post<{ message: string; withdrawal_request: WithdrawalRequest }>(
      `/admin/wallet/withdrawals/${requestId}/upload-receipt/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // تسویه درخواست برداشت طلا
  completeGoldWithdrawal: async (requestId: number): Promise<{ message: string; withdrawal_request: WithdrawalRequest }> => {
    const response = await apiClient.patch<{ message: string; withdrawal_request: WithdrawalRequest }>(
      `/admin/wallet/withdrawals/${requestId}/complete/`
    );
    return response.data;
  },
};

// System Settings API Functions
export interface DepositAccount {
  id: number;
  bank_name: string;
  owner_name: string;
  card_number: string;
  sheba_number: string;
  is_active: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

export const depositAccountsAPI = {
  // دریافت لیست حساب‌های فعال (برای کاربران)
  getActiveAccounts: async (): Promise<DepositAccount[]> => {
    const response = await apiClient.get<DepositAccount[]>('/wallet/deposit-accounts/');
    return response.data;
  },

  // دریافت لیست تمام حساب‌ها (Admin)
  getAllAccounts: async (): Promise<DepositAccount[]> => {
    const response = await apiClient.get<DepositAccount[]>('/admin/wallet/deposit-accounts/');
    return response.data;
  },

  // ایجاد حساب جدید (Admin)
  createAccount: async (data: {
    bank_name: string;
    owner_name: string;
    card_number: string;
    sheba_number: string;
    is_active?: boolean;
    order?: number;
  }): Promise<{ message: string; account: DepositAccount }> => {
    const response = await apiClient.post<{ message: string; account: DepositAccount }>(
      '/admin/wallet/deposit-accounts/', data);
    return response.data;
  },

  // به‌روزرسانی حساب (Admin)
  updateAccount: async (id: number, data: Partial<{
    bank_name: string;
    owner_name: string;
    card_number: string;
    sheba_number: string;
    is_active: boolean;
    order: number;
  }>): Promise<{ message: string; account: DepositAccount }> => {
    const response = await apiClient.put<{ message: string; account: DepositAccount }>(
      `/admin/wallet/deposit-accounts/${id}/`, data);
    return response.data;
  },

  // حذف حساب (Admin)
  deleteAccount: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/admin/wallet/deposit-accounts/${id}/`);
    return response.data;
  },
};

export const systemSettingsAPI = {
  // دریافت تنظیمات
  getSettings: async (): Promise<SystemSettings> => {
    const response = await apiClient.get<SystemSettings>('/admin/settings/');
    return response.data;
  },

  // به‌روزرسانی تنظیمات
  updateSettings: async (data: {
    admin_phone_numbers?: string[];
    gold_pickup_address?: string;
  }): Promise<{ message: string; settings: SystemSettings }> => {
    const response = await apiClient.put<{ message: string; settings: SystemSettings }>('/admin/settings/', data);
    return response.data;
  },
};
