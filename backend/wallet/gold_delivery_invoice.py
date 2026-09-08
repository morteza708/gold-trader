"""
تولید شماره و PDF فاکتور تحویل طلا (برداشت)
"""
from __future__ import annotations

from django.conf import settings
from django.template.loader import render_to_string
from jalali_date import datetime2jalali

from trades.delivery_fields import delivery_context_for_invoice, format_gold_grams
from wallet.models import WithdrawalRequest


def generate_gold_delivery_invoice_number() -> str:
    last = (
        WithdrawalRequest.objects.exclude(delivery_invoice_number__isnull=True)
        .exclude(delivery_invoice_number="")
        .order_by("-id")
        .first()
    )
    if last and last.delivery_invoice_number:
        try:
            last_number = int(str(last.delivery_invoice_number).split("-")[-1])
            new_number = last_number + 1
        except ValueError:
            new_number = 1001
    else:
        new_number = 1001
    return f"GD-{new_number:04d}"


def _to_persian_digits(text):
    persian_digits = "۰۱۲۳۴۵۶۷۸۹"
    english_digits = "0123456789"
    for i, digit in enumerate(english_digits):
        text = str(text).replace(digit, persian_digits[i])
    return text


def build_gold_delivery_invoice_html(withdrawal: WithdrawalRequest) -> str:
    from settings.invoice_issuer import (
        get_invoice_issuer,
        load_invoice_font_base64,
        load_invoice_logo_base64,
        load_invoice_stamp_base64,
    )

    issuer = get_invoice_issuer()
    logo_base64 = load_invoice_logo_base64() or ""
    stamp_base64 = load_invoice_stamp_base64() or ""
    font_base64 = load_invoice_font_base64() or ""

    when = withdrawal.completed_at or withdrawal.updated_at or withdrawal.created_at
    jalali = datetime2jalali(when) if when else None
    date_str = jalali.strftime("%Y/%m/%d") if jalali else "-"
    time_str = jalali.strftime("%H:%M") if jalali else "-"

    brand_name = issuer["brand_name"]
    national_id = issuer["national_id"] or "—"
    footer_parts = []
    if issuer["address"]:
        footer_parts.append(f"آدرس: {issuer['address']}")
    if issuer["phone"]:
        footer_parts.append(f"تلفن: {_to_persian_digits(issuer['phone'])}")

    buyer_name = (
        f"{withdrawal.user.first_name or ''} {withdrawal.user.last_name or ''}".strip()
        or withdrawal.user.phone_number
        or "-"
    )

    context = {
        "invoice_number": _to_persian_digits(withdrawal.delivery_invoice_number or withdrawal.request_code),
        "date": _to_persian_digits(date_str),
        "time": _to_persian_digits(time_str),
        "seller_label": "فروشنده / تحویل‌دهنده",
        "seller_name": issuer["company_name"] or brand_name,
        "brand_name": brand_name,
        "brand_initial": (brand_name[:1] if brand_name else "G"),
        "logo_base64": logo_base64,
        "stamp_base64": stamp_base64,
        "seller_national_id": _to_persian_digits(national_id) if national_id != "—" else national_id,
        "buyer_label": "خریدار / تحویل‌گیرنده",
        "buyer_name": buyer_name,
        "buyer_mobile": _to_persian_digits(withdrawal.user.phone_number or "-"),
        "item_description": "تحویل طلای آب‌شده (برداشت از پلتفرم)",
        "amount": _to_persian_digits(format_gold_grams(withdrawal.amount)),
        "price": "—",
        "total": "—",
        "font_base64": font_base64,
        "footer_text": " | ".join(footer_parts) if footer_parts else "",
        "tagline": issuer["tagline"] or "سند تحویل فیزیکی طلا",
        "is_manual": False,
        "is_gold_delivery": True,
        "settlement_mode_display": "برداشت طلا از کیف پلتفرم",
        "payment_status_display": "",
    }
    context.update(delivery_context_for_invoice(withdrawal, to_persian=_to_persian_digits))
    return render_to_string("invoice.html", context)


def render_gold_delivery_pdf_bytes(withdrawal: WithdrawalRequest) -> bytes:
    try:
        from weasyprint import HTML, CSS
    except ImportError as exc:
        raise RuntimeError("WeasyPrint در دسترس نیست") from exc

    html_string = build_gold_delivery_invoice_html(withdrawal)
    page_css = CSS(
        string="""
        @page { size: A5; margin: 10mm; }
        body { font-family: 'IRANYekan', Tahoma, Arial, sans-serif; }
        """
    )
    return HTML(string=html_string).write_pdf(stylesheets=[page_css])
