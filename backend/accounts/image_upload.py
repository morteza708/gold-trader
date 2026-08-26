"""اعتبارسنجی و بهینه‌سازی مشترک آپلود تصویر (کارت ملی، فیش، آواتار، …)."""
from __future__ import annotations

import logging
import uuid
from io import BytesIO

from django.core.files.uploadedfile import InMemoryUploadedFile, UploadedFile
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
    HEIF_SUPPORTED = True
except Exception:  # noqa: BLE001 — در صورت نبود کتابخانه، HEIC بعداً با پیام خطا رد می‌شود
    HEIF_SUPPORTED = False

ALLOWED_IMAGE_TYPES = (
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence',
)
ALLOWED_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif')
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB — سقف آپلود ورودی

# پروفایل‌های بهینه‌سازی پس از آپلود
IMAGE_PROFILES = {
    # فیش واریز / کارت ملی / مدارک
    'document': {
        'max_edge': 1600,
        'quality': 75,
        'prefix': 'doc',
    },
    # آواتار کاربر
    'avatar': {
        'max_edge': 512,
        'quality': 78,
        'prefix': 'avatar',
    },
    # تصاویر صفحات سایت
    'page': {
        'max_edge': 1920,
        'quality': 78,
        'prefix': 'page',
    },
}


def get_uploaded_image_error(uploaded_file) -> str | None:
    """اگر فایل نامعتبر باشد پیام فارسی برمی‌گرداند؛ در غیر این صورت None."""
    if uploaded_file is None:
        return 'فایل تصویر ارسال نشده است'

    size = getattr(uploaded_file, 'size', 0) or 0
    if size > MAX_IMAGE_SIZE:
        return 'حجم تصویر بیش از ۱۰ مگابایت است. لطفاً تصویر کوچک‌تری انتخاب کنید.'

    content_type = (getattr(uploaded_file, 'content_type', '') or '').lower().strip()
    name = (getattr(uploaded_file, 'name', '') or '').lower()
    ext = ''
    if '.' in name:
        ext = '.' + name.rsplit('.', 1)[-1]

    mime_ok = content_type in ALLOWED_IMAGE_TYPES
    mime_unknown = content_type in ('', 'application/octet-stream', 'binary/octet-stream')
    ext_ok = ext in ALLOWED_EXTENSIONS

    if mime_ok or (mime_unknown and ext_ok) or (not content_type and ext_ok):
        return None

    if ext_ok and content_type.startswith('image/'):
        return None

    return 'فرمت مجاز نیست. JPG، PNG، WebP یا HEIC/HEIF (آیفون) را آپلود کنید.'


def _reset_file_pointer(uploaded_file) -> None:
    try:
        uploaded_file.seek(0)
    except Exception:
        pass


def optimize_uploaded_image(
    uploaded_file,
    *,
    purpose: str = 'document',
) -> InMemoryUploadedFile:
    """
    ریسایز + فشرده‌سازی JPEG و حذف EXIF.
    خروجی همیشه JPEG است تا سازگاری ادمین/PDF/مرورگر بالا بماند.
    """
    if uploaded_file is None:
        raise ValueError('فایل تصویر ارسال نشده است')

    if getattr(uploaded_file, '_opalbox_optimized', False):
        return uploaded_file

    profile = IMAGE_PROFILES.get(purpose) or IMAGE_PROFILES['document']
    max_edge = int(profile['max_edge'])
    quality = int(profile['quality'])
    prefix = str(profile['prefix'])

    _reset_file_pointer(uploaded_file)

    try:
        image = Image.open(uploaded_file)
        image.load()
    except Exception as e:
        logger.warning('خطا در باز کردن تصویر آپلودشده: %s', e)
        name = (getattr(uploaded_file, 'name', '') or '').lower()
        if name.endswith(('.heic', '.heif')) and not HEIF_SUPPORTED:
            raise ValueError(
                'پشتیبانی HEIC روی سرور فعال نیست. لطفاً JPG یا PNG آپلود کنید.'
            ) from e
        raise ValueError('فایل تصویر نامعتبر است یا آسیب دیده است.') from e

    # چرخش صحیح بر اساس EXIF، سپس حذف متادیتا هنگام ذخیره
    image = ImageOps.exif_transpose(image)

    if image.mode in ('RGBA', 'LA'):
        background = Image.new('RGB', image.size, (255, 255, 255))
        alpha = image.split()[-1]
        background.paste(image.convert('RGBA'), mask=alpha)
        image = background
    elif image.mode == 'P':
        image = image.convert('RGBA')
        background = Image.new('RGB', image.size, (255, 255, 255))
        background.paste(image, mask=image.split()[-1] if 'A' in image.getbands() else None)
        image = background
    elif image.mode != 'RGB':
        image = image.convert('RGB')

    if max(image.size) > max_edge:
        image.thumbnail((max_edge, max_edge), Image.Resampling.LANCZOS)

    buffer = BytesIO()
    image.save(
        buffer,
        format='JPEG',
        quality=quality,
        optimize=True,
        progressive=True,
    )
    buffer.seek(0)

    original_name = getattr(uploaded_file, 'name', '') or f'{prefix}.jpg'
    base = original_name.rsplit('/', 1)[-1].rsplit('.', 1)[0][:40] or prefix
    new_name = f'{base}_{uuid.uuid4().hex[:8]}.jpg'
    size = buffer.getbuffer().nbytes

    optimized = InMemoryUploadedFile(
        file=buffer,
        field_name=getattr(uploaded_file, 'field_name', None),
        name=new_name,
        content_type='image/jpeg',
        size=size,
        charset=None,
    )
    optimized._opalbox_optimized = True  # type: ignore[attr-defined]

    original_size = getattr(uploaded_file, 'size', None)
    if original_size:
        logger.info(
            'بهینه‌سازی تصویر %s: %s → %s بایت (purpose=%s)',
            original_name,
            original_size,
            size,
            purpose,
        )
    return optimized


def ensure_optimized_upload(file_value, *, purpose: str = 'document'):
    """
    اگر مقدار یک آپلود جدید (UploadedFile) باشد بهینه می‌کند؛
    اگر فایل ذخیره‌شده قبلی (FieldFile) باشد دست نمی‌زند.
    """
    if file_value is None or file_value == '':
        return file_value

    if getattr(file_value, '_opalbox_optimized', False):
        return file_value

    # آپلود تازه از request.FILES
    if isinstance(file_value, UploadedFile):
        return optimize_uploaded_image(file_value, purpose=purpose)

    # گاهی FieldFile هنوز به UploadedFile commit‌نشده اشاره دارد
    inner = getattr(file_value, 'file', None)
    if isinstance(inner, UploadedFile) and not getattr(file_value, '_committed', True):
        return optimize_uploaded_image(inner, purpose=purpose)

    return file_value
