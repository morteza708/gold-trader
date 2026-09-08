"""
فیلدهای مشترک سند تحویل فیزیکی طلا (فاکتور دستی و برداشت طلا).
دفتر پلتفرم همچنان بر حسب گرم معادل ۷۵۰ است؛ این فیلدها مستندسازی تحویل‌اند.
"""
from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.db import models

DIFF_NONE = ""
DIFF_CASH = "CASH"
DIFF_CARD = "CARD"
DIFF_OTHER = "OTHER"

DIFFERENCE_METHOD_CHOICES = [
    (DIFF_NONE, "بدون مابه‌التفاوت"),
    (DIFF_CASH, "نقدی"),
    (DIFF_CARD, "کارت"),
    (DIFF_OTHER, "سایر"),
]


class GoldDeliveryFieldsMixin(models.Model):
    """Mixin abstract — فیلدهای سند تحویل فیزیکی."""

    delivery_actual_karat = models.DecimalField(
        max_digits=6,
        decimal_places=1,
        null=True,
        blank=True,
        verbose_name="عیار واقعی تحویل",
        help_text="مثلاً ۷۴۷ — عیار فیزیکی تحویل‌شده",
    )
    delivery_physical_weight = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        null=True,
        blank=True,
        verbose_name="وزن فیزیکی تحویل (گرم)",
    )
    delivery_packet_code = models.CharField(
        max_length=32,
        blank=True,
        default="",
        verbose_name="کد ریگیری / پاکت",
    )
    delivery_seri = models.CharField(
        max_length=4,
        blank=True,
        default="",
        verbose_name="سری پاکت",
    )
    delivery_lab_name = models.CharField(
        max_length=120,
        blank=True,
        default="",
        verbose_name="نام آزمایشگاه",
    )
    delivery_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="توضیحات تحویل",
    )
    delivery_difference_rial = models.DecimalField(
        max_digits=15,
        decimal_places=0,
        default=0,
        verbose_name="مابه‌التفاوت (ریال)",
        help_text="مثبت = مشتری پرداخت کرد؛ منفی = به مشتری برگشت داده شد",
    )
    delivery_difference_method = models.CharField(
        max_length=16,
        choices=DIFFERENCE_METHOD_CHOICES,
        blank=True,
        default=DIFF_NONE,
        verbose_name="نحوه تسویه مابه‌التفاوت",
    )

    class Meta:
        abstract = True


def _q0(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def _q1(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def _q3(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def extract_delivery_payload(data) -> dict | None:
    """استخراج فیلدهای سند تحویل از body؛ اگر هیچ کلیدی نبود None."""
    if not isinstance(data, dict):
        return None
    nested = data.get('delivery') if isinstance(data.get('delivery'), dict) else None
    source = nested if nested is not None else data
    mapping = {
        'actual_karat': ('actual_karat', 'delivery_actual_karat'),
        'physical_weight': ('physical_weight', 'delivery_physical_weight'),
        'packet_code': ('packet_code', 'delivery_packet_code'),
        'seri': ('seri', 'delivery_seri'),
        'lab_name': ('lab_name', 'delivery_lab_name'),
        'notes': ('notes', 'delivery_notes'),
        'difference_rial': ('difference_rial', 'delivery_difference_rial'),
        'difference_method': ('difference_method', 'delivery_difference_method'),
    }
    payload = {}
    found = False
    for out_key, aliases in mapping.items():
        for alias in aliases:
            if alias in source:
                payload[out_key] = source.get(alias)
                found = True
                break
    return payload if found else None


def normalize_delivery_payload(data: dict | None) -> dict:
    """
    نرمال‌سازی ورودی API به مقادیر قابل ذخیره.
    کلیدهای ورودی (اختیاری):
      actual_karat, physical_weight, packet_code, seri, lab_name,
      notes, difference_rial, difference_method
    """
    data = data or {}
    out: dict = {}

    if "actual_karat" in data and data.get("actual_karat") not in (None, ""):
        try:
            karat = _q1(data["actual_karat"])
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValueError("عیار واقعی نامعتبر است") from exc
        if karat <= 0 or karat > 1000:
            raise ValueError("عیار واقعی باید بین ۰ و ۱۰۰۰ باشد")
        out["delivery_actual_karat"] = karat
    elif "actual_karat" in data:
        out["delivery_actual_karat"] = None

    if "physical_weight" in data and data.get("physical_weight") not in (None, ""):
        try:
            w = _q3(data["physical_weight"])
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValueError("وزن فیزیکی نامعتبر است") from exc
        if w <= 0:
            raise ValueError("وزن فیزیکی باید بیشتر از صفر باشد")
        out["delivery_physical_weight"] = w
    elif "physical_weight" in data:
        out["delivery_physical_weight"] = None

    if "packet_code" in data:
        out["delivery_packet_code"] = str(data.get("packet_code") or "").strip()[:32]
    if "seri" in data:
        seri = str(data.get("seri") or "").strip().upper()
        if seri and (len(seri) != 1 or not seri.isalpha()):
            raise ValueError("سری باید یک حرف انگلیسی باشد یا خالی بماند")
        out["delivery_seri"] = seri
    if "lab_name" in data:
        out["delivery_lab_name"] = str(data.get("lab_name") or "").strip()[:120]
    if "notes" in data:
        out["delivery_notes"] = str(data.get("notes") or "").strip()

    if "difference_rial" in data and data.get("difference_rial") not in (None, ""):
        try:
            out["delivery_difference_rial"] = _q0(data["difference_rial"])
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValueError("مابه‌التفاوت نامعتبر است") from exc
    elif "difference_rial" in data:
        out["delivery_difference_rial"] = Decimal("0")

    if "difference_method" in data:
        method = str(data.get("difference_method") or DIFF_NONE).strip().upper()
        valid = {c[0] for c in DIFFERENCE_METHOD_CHOICES}
        if method not in valid:
            raise ValueError("نحوه تسویه مابه‌التفاوت نامعتبر است")
        out["delivery_difference_method"] = method

    return out


def apply_delivery_fields(instance, normalized: dict, *, save: bool = False) -> list[str]:
    """اعمال dict نرمال‌شده روی instance؛ لیست فیلدهای تغییر یافته را برمی‌گرداند."""
    updates = []
    for key, value in normalized.items():
        if getattr(instance, key, None) != value:
            setattr(instance, key, value)
            updates.append(key)
    if save and updates:
        updates.append("updated_at")
        instance.save(update_fields=updates)
    return updates


def delivery_fields_to_dict(instance) -> dict:
    """خروجی API برای فیلدهای تحویل."""
    method = getattr(instance, "delivery_difference_method", "") or ""
    method_display = ""
    for code, label in DIFFERENCE_METHOD_CHOICES:
        if code == method:
            method_display = label
            break
    karat = getattr(instance, "delivery_actual_karat", None)
    weight = getattr(instance, "delivery_physical_weight", None)
    diff = getattr(instance, "delivery_difference_rial", None)
    return {
        "delivery_actual_karat": str(karat) if karat is not None else None,
        "delivery_physical_weight": str(weight) if weight is not None else None,
        "delivery_packet_code": getattr(instance, "delivery_packet_code", "") or "",
        "delivery_seri": getattr(instance, "delivery_seri", "") or "",
        "delivery_lab_name": getattr(instance, "delivery_lab_name", "") or "",
        "delivery_notes": getattr(instance, "delivery_notes", "") or "",
        "delivery_difference_rial": str(diff if diff is not None else 0),
        "delivery_difference_method": method,
        "delivery_difference_method_display": method_display,
        "has_delivery_details": bool(
            karat is not None
            or weight is not None
            or (getattr(instance, "delivery_packet_code", "") or "")
            or (getattr(instance, "delivery_lab_name", "") or "")
            or (getattr(instance, "delivery_notes", "") or "")
            or (diff not in (None, 0, Decimal("0"), "0"))
        ),
    }


def delivery_context_for_invoice(instance, *, to_persian) -> dict:
    """Context اضافی برای قالب PDF / پیش‌نمایش."""
    d = delivery_fields_to_dict(instance)
    if not d["has_delivery_details"]:
        return {"has_delivery_details": False}

    karat = d["delivery_actual_karat"]
    weight = d["delivery_physical_weight"]
    diff = d["delivery_difference_rial"]
    return {
        "has_delivery_details": True,
        "delivery_actual_karat": to_persian(karat) if karat else "—",
        "delivery_physical_weight": to_persian(f"{float(weight):.3f}") if weight else "—",
        "delivery_packet_code": to_persian(d["delivery_packet_code"]) if d["delivery_packet_code"] else "—",
        "delivery_seri": d["delivery_seri"] or "—",
        "delivery_lab_name": d["delivery_lab_name"] or "—",
        "delivery_notes": d["delivery_notes"] or "—",
        "delivery_difference_rial": to_persian(f"{int(Decimal(diff or 0)):,}"),
        "delivery_difference_method_display": d["delivery_difference_method_display"] or "—",
    }
