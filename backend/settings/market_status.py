"""Market kill-switch helpers for buy/sell sides."""


def get_market_mode(buy_enabled: bool, sell_enabled: bool) -> str:
    if buy_enabled and sell_enabled:
        return "OPEN"
    if sell_enabled and not buy_enabled:
        return "SELL_ONLY"
    if buy_enabled and not sell_enabled:
        return "BUY_ONLY"
    return "CLOSED"


def get_market_message(buy_enabled: bool, sell_enabled: bool) -> str:
    mode = get_market_mode(buy_enabled, sell_enabled)
    messages = {
        "OPEN": "بازار باز است — خرید و فروش فعال",
        "SELL_ONLY": "خرید موقتاً غیرفعال — فقط فروش امکان‌پذیر است",
        "BUY_ONLY": "فروش موقتاً غیرفعال — فقط خرید امکان‌پذیر است",
        "CLOSED": "معاملات متوقف شده — فعالیت خرید و فروش ممکن نیست",
    }
    return messages[mode]


def build_market_status_payload(settings) -> dict:
    buy_enabled = bool(settings.buy_enabled)
    sell_enabled = bool(settings.sell_enabled)
    admin_notice = (getattr(settings, "market_admin_notice", None) or "").strip()

    return {
        "buy_enabled": buy_enabled,
        "sell_enabled": sell_enabled,
        "market_mode": get_market_mode(buy_enabled, sell_enabled),
        "trades_enabled": buy_enabled and sell_enabled,
        "message": get_market_message(buy_enabled, sell_enabled),
        "admin_notice": admin_notice,
    }
