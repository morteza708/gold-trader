"""آماده‌سازی مهر/امضای فاکتور: برش حاشیه خالی و پس‌زمینه شفاف."""
from __future__ import annotations

import logging
import uuid
from io import BytesIO

from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image

logger = logging.getLogger(__name__)

_PAD = 12
_MAX_EDGE = 720


def prepare_invoice_stamp_image(source) -> InMemoryUploadedFile:
    """
    حاشیه خالی را برش می‌دهد، پس‌زمینه سیاه را شفاف می‌کند،
    و خطوط تیره امضا را برای نمایش روی کاغذ سفید قابل‌رؤیت نگه می‌دارد.
    """
    if source is None or source == '':
        return source

    if getattr(source, '_opalbox_invoice_stamp', False):
        return source

    try:
        if hasattr(source, 'seek'):
            try:
                source.seek(0)
            except Exception:
                pass
        img = Image.open(source)
        img.load()
    except Exception as e:
        raise ValueError('فایل مهر/امضا نامعتبر است') from e

    img = img.convert('RGBA')
    width, height = img.size
    pixels = img.load()

    # هسته محتوا: پیکسل‌های آبی مهر / لوگو
    blue_xs: list[int] = []
    blue_ys: list[int] = []
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a < 10:
                continue
            if b >= 50 and b > r + 12 and b > g + 6:
                blue_xs.append(x)
                blue_ys.append(y)

    if not blue_xs:
        # fallback: هر پیکسل غیرسیاه
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if a >= 10 and (r + g + b) > 40:
                    blue_xs.append(x)
                    blue_ys.append(y)

    if not blue_xs:
        raise ValueError('محتوای مهر/امضا در تصویر یافت نشد')

    left, right = min(blue_xs), max(blue_xs)
    top, bottom = min(blue_ys), max(blue_ys)
    # فضای اضافه برای دنباله امضا اطراف مهر
    pad_x = max(_PAD, int((right - left) * 0.18))
    pad_y = max(_PAD, int((bottom - top) * 0.35))
    left = max(0, left - pad_x)
    right = min(width - 1, right + pad_x)
    top = max(0, top - pad_y)
    bottom = min(height - 1, bottom + pad_y)

    out = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    out_px = out.load()

    for y in range(top, bottom + 1):
        for x in range(left, right + 1):
            r, g, b, a = pixels[x, y]
            if a < 10:
                continue
            luma = r + g + b
            is_blue = b >= 50 and b > r + 12 and b > g + 6
            if is_blue:
                out_px[x, y] = (r, g, b, a)
            elif luma <= 10:
                # پس‌زمینه خالص
                continue
            elif luma <= 95:
                # خط امضای تیره → خاکستری خوانا روی کاغذ سفید
                strength = max(160, min(230, 80 + luma * 2))
                out_px[x, y] = (36, 36, 40, strength)
            else:
                out_px[x, y] = (r, g, b, a)

    bbox = out.getbbox()
    if not bbox:
        raise ValueError('محتوای مهر/امضا در تصویر یافت نشد')
    # کمی پدینگ نهایی
    l, t, r, btm = bbox
    l = max(0, l - 6)
    t = max(0, t - 6)
    r = min(width, r + 6)
    btm = min(height, btm + 6)
    out = out.crop((l, t, r, btm))

    if max(out.size) > _MAX_EDGE:
        out.thumbnail((_MAX_EDGE, _MAX_EDGE), Image.Resampling.LANCZOS)

    buffer = BytesIO()
    out.save(buffer, format='PNG', optimize=True)
    buffer.seek(0)

    original_name = getattr(source, 'name', '') or 'stamp.png'
    base = original_name.rsplit('/', 1)[-1].rsplit('.', 1)[0][:40] or 'stamp'
    new_name = f'{base}_{uuid.uuid4().hex[:8]}.png'

    result = InMemoryUploadedFile(
        file=buffer,
        field_name=getattr(source, 'field_name', None),
        name=new_name,
        content_type='image/png',
        size=buffer.getbuffer().nbytes,
        charset=None,
    )
    result._opalbox_invoice_stamp = True  # type: ignore[attr-defined]
    result._opalbox_optimized = True  # type: ignore[attr-defined]
    logger.info(
        'آماده‌سازی مهر فاکتور: %sx%s → %sx%s',
        width,
        height,
        out.size[0],
        out.size[1],
    )
    return result


def stamp_file_to_png_base64(path: str) -> str | None:
    """خواندن فایل ذخیره‌شده، آماده‌سازی، و برگرداندن base64 برای PDF."""
    import base64
    import os

    if not path or not os.path.isfile(path):
        return None
    try:
        with open(path, 'rb') as f:
            prepared = prepare_invoice_stamp_image(f)
        prepared.seek(0)
        return base64.b64encode(prepared.read()).decode('utf-8')
    except Exception as e:
        logger.warning('خطا در آماده‌سازی مهر فاکتور برای PDF: %s', e)
        try:
            with open(path, 'rb') as f:
                return base64.b64encode(f.read()).decode('utf-8')
        except Exception:
            return None
