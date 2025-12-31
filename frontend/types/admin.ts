/**
 * Types مربوط به پنل مدیریت
 */

// تایپ معامله
export interface Trade {
  id: number;
  userId: number;
  userName: string;
  userMobile: string;
  type: "buy" | "sell";
  amount: number; // گرم
  price: number; // قیمت واحد
  total: number; // مبلغ کل
  status: "success" | "failed" | "pending";
  date: string;
  time: string;
  invoiceNumber: string;
  code: string; // کد رهگیری
  adminNote?: string;
}

// تایپ تراکنش مالی
export interface FinancialTransaction {
  id: number;
  userId: number;
  userName: string;
  userMobile: string;
  type: "deposit" | "withdraw";
  amount: number;
  status: "pending" | "approved" | "rejected";
  date: string;
  time: string;
  receiptImage?: string;
  bankName?: string;
  cardNumber?: string;
  sheba?: string;
  description?: string;
  adminNote?: string;
}

// تایپ کاربر
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  mobile: string;
  nationalCode: string;
  email: string;
  goldBalance: number;
  rialBalance: number;
  status: "active" | "blocked" | "pending";
  verificationStatus: "verified" | "unverified" | "pending";
  joinDate: string;
  lastLogin: string;
  totalTrades: number;
  totalVolume: number;
}

// تایپ کاربر تایید شده (برای تایید شماره موبایل)
export interface VerifiedUser {
  id: number;
  mobile: string;
  verified: boolean;
  verifiedAt: string;
  verifiedBy?: string;
  role?: 'CUSTOMER' | 'SITE_ADMIN' | 'SUPER_ADMIN';
}

