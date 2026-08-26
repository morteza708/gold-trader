"""اعتبارسنجی مشترک آپلود تصویر (کارت ملی، فیش واریزی، …)."""

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
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


def get_uploaded_image_error(uploaded_file) -> str | None:
    """اگر فایل نامعتبر باشد پیام فارسی برمی‌گرداند؛ در غیر این صورت None."""
    if uploaded_file is None:
        return 'فایل تصویر ارسال نشده است'

    size = getattr(uploaded_file, 'size', 0) or 0
    if size > MAX_IMAGE_SIZE:
        return 'حجم تصویر بیش از ۱۰ مگابایت است. لطفاً حجم را کاهش دهید و دوباره آپلود کنید.'

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
