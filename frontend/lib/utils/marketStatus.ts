export type MarketMode = "OPEN" | "SELL_ONLY" | "BUY_ONLY" | "CLOSED";

export interface MarketStatusData {
  buy_enabled: boolean;
  sell_enabled: boolean;
  market_mode: MarketMode;
  trades_enabled: boolean;
  message: string;
  admin_notice?: string;
  suspended_buy_orders?: number;
  suspended_sell_orders?: number;
}

export interface MarketBannerView {
  tone: "success" | "warning" | "danger";
  title: string;
  description: string;
  show: boolean;
}

export function getMarketBannerView(status: MarketStatusData | null | undefined): MarketBannerView {
  if (!status) {
    return {
      tone: "success",
      title: "در حال بررسی وضعیت بازار...",
      description: "",
      show: false,
    };
  }

  const notice = status.admin_notice?.trim();

  switch (status.market_mode) {
    case "OPEN":
      return {
        tone: "success",
        title: "بازار باز است",
        description: notice || "خرید و فروش طلا در حال حاضر فعال است.",
        show: true,
      };
    case "SELL_ONLY":
      return {
        tone: "warning",
        title: "فقط فروش فعال است",
        description:
          notice ||
          "ثبت خرید جدید (فوری، هوشمند و معلق) موقتاً غیرفعال است. می‌توانید طلای خود را بفروشید.",
        show: true,
      };
    case "BUY_ONLY":
      return {
        tone: "warning",
        title: "فقط خرید فعال است",
        description:
          notice ||
          "ثبت فروش جدید (فوری و هوشمند) موقتاً غیرفعال است. می‌توانید طلا بخرید.",
        show: true,
      };
    case "CLOSED":
    default:
      return {
        tone: "danger",
        title: "بازار بسته است",
        description:
          notice ||
          "ثبت هر نوع معامله جدید (خرید و فروش) فعلاً ممکن نیست. لطفاً بعداً مراجعه کنید.",
        show: true,
      };
  }
}

export function isBuyAllowed(status: MarketStatusData | null | undefined): boolean {
  return status?.buy_enabled ?? false;
}

export function isSellAllowed(status: MarketStatusData | null | undefined): boolean {
  return status?.sell_enabled ?? false;
}

export function getMarketModeLabel(mode: MarketMode): string {
  const labels: Record<MarketMode, string> = {
    OPEN: "باز — خرید و فروش",
    SELL_ONLY: "فقط فروش",
    BUY_ONLY: "فقط خرید",
    CLOSED: "بسته",
  };
  return labels[mode];
}
