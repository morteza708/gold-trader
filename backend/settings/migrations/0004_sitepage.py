# Generated manually for SitePage

from django.db import migrations, models


def seed_site_pages(apps, schema_editor):
    SitePage = apps.get_model('settings', 'SitePage')
    from django.conf import settings as django_settings

    brand = getattr(django_settings, 'BRAND_NAME', 'گلد تریدر')
    defaults = {
        'about': {
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
            'is_published': True,
        },
        'contact': {
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
            'is_published': True,
        },
    }
    for slug, data in defaults.items():
        SitePage.objects.get_or_create(slug=slug, defaults=data)


def unseed_site_pages(apps, schema_editor):
    SitePage = apps.get_model('settings', 'SitePage')
    SitePage.objects.filter(slug__in=['about', 'contact']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0003_depositaccount'),
    ]

    operations = [
        migrations.CreateModel(
            name='SitePage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('slug', models.SlugField(choices=[('about', 'درباره ما'), ('contact', 'تماس با ما')], max_length=32, unique=True, verbose_name='شناسه صفحه')),
                ('title', models.CharField(max_length=200, verbose_name='عنوان')),
                ('subtitle', models.TextField(blank=True, default='', verbose_name='زیرعنوان')),
                ('body', models.TextField(blank=True, default='', verbose_name='متن اصلی')),
                ('hero_image', models.ImageField(blank=True, null=True, upload_to='site_pages/', verbose_name='تصویر اصلی')),
                ('extra_image', models.ImageField(blank=True, help_text='مثلاً تصویر نقشه یا عکس تکمیلی', null=True, upload_to='site_pages/', verbose_name='تصویر ثانویه')),
                ('section_one_title', models.CharField(blank=True, default='', max_length=200, verbose_name='عنوان بخش ۱')),
                ('section_one_body', models.TextField(blank=True, default='', verbose_name='متن بخش ۱')),
                ('section_two_title', models.CharField(blank=True, default='', max_length=200, verbose_name='عنوان بخش ۲')),
                ('section_two_body', models.TextField(blank=True, default='', verbose_name='متن بخش ۲')),
                ('address', models.TextField(blank=True, default='', verbose_name='آدرس')),
                ('phone', models.CharField(blank=True, default='', max_length=100, verbose_name='تلفن')),
                ('email', models.CharField(blank=True, default='', max_length=200, verbose_name='ایمیل')),
                ('is_published', models.BooleanField(default=True, verbose_name='منتشر شده')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='تاریخ به‌روزرسانی')),
            ],
            options={
                'verbose_name': 'صفحه سایت',
                'verbose_name_plural': 'صفحات سایت',
                'ordering': ['slug'],
            },
        ),
        migrations.RunPython(seed_site_pages, unseed_site_pages),
    ]
