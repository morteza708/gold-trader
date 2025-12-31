/**
 * Types مربوط به پنل کاربری
 */

// نوع سفارش
export type OrderType = "buy_limit" | "sell_limit";

// سفارش باز
export interface OpenOrder {
  id: number;
  type: OrderType;
  price: number;
  amount: number;
  total: number;
  date: string;
}

