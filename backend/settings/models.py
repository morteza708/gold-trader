from django.db import models


class SystemSettings(models.Model):
    """تنظیمات سیستم"""
    admin_phone_numbers = models.JSONField(
        default=list,
        verbose_name='شماره مدیران',
        help_text='لیست شماره موبایل مدیران برای دریافت پیامک (به صورت آرایه)'
    )
    gold_pickup_address = models.TextField(
        null=True,
        blank=True,
        verbose_name='آدرس مراجعه حضوری',
        help_text='آدرس مراجعه حضوری برای دریافت طلا'
    )
    trades_enabled = models.BooleanField(
        default=True,
        verbose_name='فعال بودن معاملات',
        help_text='اگر فعال باشد، کاربران می‌توانند معامله انجام دهند'
    )
    pending_purchase_expiry_hours = models.PositiveIntegerField(
        default=4,
        verbose_name='مهلت تسویه خرید معلق (ساعت)',
        help_text='پس از ثبت خرید معلق، کاربر چند ساعت فرصت تکمیل واریز دارد'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='تاریخ ایجاد'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='تاریخ به‌روزرسانی'
    )
    
    class Meta:
        verbose_name = 'تنظیمات سیستم'
        verbose_name_plural = 'تنظیمات سیستم'
    
    def __str__(self):
        return "تنظیمات سیستم"
    
    @classmethod
    def get_settings(cls):
        """دریافت تنظیمات سیستم (Singleton pattern)"""
        settings_obj, created = cls.objects.get_or_create(pk=1)
        return settings_obj


class DepositAccount(models.Model):
    """حساب‌های بانکی مدیر برای واریز وجه"""
    bank_name = models.CharField(
        max_length=100,
        verbose_name='نام بانک',
        help_text='نام بانک (مثال: بانک ملت)'
    )
    owner_name = models.CharField(
        max_length=200,
        verbose_name='نام صاحب حساب',
        help_text='نام صاحب حساب (مثال: شرکت گلد تریدر)'
    )
    card_number = models.CharField(
        max_length=19,
        verbose_name='شماره کارت',
        help_text='شماره کارت بانکی (16 رقم)'
    )
    sheba_number = models.CharField(
        max_length=26,
        verbose_name='شماره شبا',
        help_text='شماره شبا (24 رقم)'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='فعال',
        help_text='اگر فعال باشد، در پنل کاربری نمایش داده می‌شود'
    )
    order = models.IntegerField(
        default=0,
        verbose_name='ترتیب نمایش',
        help_text='ترتیب نمایش حساب‌ها (عدد کمتر = اولویت بیشتر)'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='تاریخ ایجاد'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='تاریخ به‌روزرسانی'
    )
    
    class Meta:
        verbose_name = 'حساب بانکی واریز'
        verbose_name_plural = 'حساب‌های بانکی واریز'
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"{self.bank_name} - {self.owner_name}"


class SitePage(models.Model):
    """محتوای صفحات عمومی سایت (درباره ما / تماس با ما)"""

    SLUG_ABOUT = 'about'
    SLUG_CONTACT = 'contact'
    SLUG_CHOICES = [
        (SLUG_ABOUT, 'درباره ما'),
        (SLUG_CONTACT, 'تماس با ما'),
    ]

    slug = models.SlugField(
        max_length=32,
        unique=True,
        choices=SLUG_CHOICES,
        verbose_name='شناسه صفحه',
    )
    title = models.CharField(max_length=200, verbose_name='عنوان')
    subtitle = models.TextField(blank=True, default='', verbose_name='زیرعنوان')
    body = models.TextField(blank=True, default='', verbose_name='متن اصلی')
    hero_image = models.ImageField(
        upload_to='site_pages/',
        blank=True,
        null=True,
        verbose_name='تصویر اصلی',
    )
    extra_image = models.ImageField(
        upload_to='site_pages/',
        blank=True,
        null=True,
        verbose_name='تصویر ثانویه',
        help_text='مثلاً تصویر نقشه یا عکس تکمیلی',
    )
    section_one_title = models.CharField(
        max_length=200, blank=True, default='', verbose_name='عنوان بخش ۱'
    )
    section_one_body = models.TextField(
        blank=True, default='', verbose_name='متن بخش ۱'
    )
    section_two_title = models.CharField(
        max_length=200, blank=True, default='', verbose_name='عنوان بخش ۲'
    )
    section_two_body = models.TextField(
        blank=True, default='', verbose_name='متن بخش ۲'
    )
    address = models.TextField(blank=True, default='', verbose_name='آدرس')
    phone = models.CharField(max_length=100, blank=True, default='', verbose_name='تلفن')
    email = models.CharField(max_length=200, blank=True, default='', verbose_name='ایمیل')
    is_published = models.BooleanField(default=True, verbose_name='منتشر شده')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')

    class Meta:
        verbose_name = 'صفحه سایت'
        verbose_name_plural = 'صفحات سایت'
        ordering = ['slug']

    def __str__(self):
        return self.get_slug_display()

    def save(self, *args, **kwargs):
        from accounts.image_upload import ensure_optimized_upload

        if self.hero_image:
            self.hero_image = ensure_optimized_upload(self.hero_image, purpose='page')
        if self.extra_image:
            self.extra_image = ensure_optimized_upload(self.extra_image, purpose='page')
        super().save(*args, **kwargs)

    @classmethod
    def get_or_create_defaults(cls):
        """ساخت رکوردهای پیش‌فرض about/contact در صورت نبودن"""
        from django.conf import settings as django_settings

        brand = getattr(django_settings, 'BRAND_NAME', 'گلد تریدر')
        defaults = {
            cls.SLUG_ABOUT: {
                'title': f'{brand}؛ سرمایه‌گذاری امن در طلا',
                'subtitle': (
                    'ما با حذف واسطه‌ها و ارائه پلتفرم آنلاین، امکان خرید و فروش طلای آب‌شده را '
                    'با کمترین کارمزد و بالاترین امنیت برای همه ایرانیان فراهم کرده‌ایم.'
                ),
                'body': '',
                'section_one_title': 'ماموریت ما',
                'section_one_body': (
                    'ایجاد بستری شفاف برای حفظ ارزش دارایی مردم در برابر تورم از طریق '
                    'سرمایه‌گذاری خرد و کلان در طلا، با ضمانت بازخرید همیشگی.'
                ),
                'section_two_title': 'تیم متخصص',
                'section_two_body': (
                    f'تیم {brand} متشکل از کارشناسان بازار طلا، توسعه‌دهندگان نرم‌افزار '
                    'و متخصصان امنیت سایبری است تا تجربه‌ای بی‌نقص را رقم بزنند.'
                ),
                'address': 'تهران، بازار بزرگ، سرای زرگرها، پلاک ۱۱۰',
                'phone': '۰۲۱ - ۸۸ ۸۸ ۸۸ ۸۸',
                'email': 'info@opalbox.ir',
            },
            cls.SLUG_CONTACT: {
                'title': 'تماس با ما',
                'subtitle': f'راه‌های ارتباطی با {brand}',
                'body': (
                    'از طریق راه‌های زیر می‌توانید با پشتیبانی و دفتر مرکزی ما در ارتباط باشید. '
                    'پاسخگویی در ساعات کاری انجام می‌شود.'
                ),
                'section_one_title': '',
                'section_one_body': '',
                'section_two_title': '',
                'section_two_body': '',
                'address': 'تهران، بازار بزرگ، سرای زرگرها، پلاک ۱۱۰',
                'phone': '۰۲۱ - ۸۸ ۸۸ ۸۸ ۸۸',
                'email': 'info@opalbox.ir',
            },
        }
        created = []
        for slug, data in defaults.items():
            obj, was_created = cls.objects.get_or_create(slug=slug, defaults=data)
            if was_created:
                created.append(obj)
        return created

