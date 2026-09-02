from django.db import migrations, models

import settings.defaults


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0008_support_hub'),
    ]

    operations = [
        migrations.AlterField(
            model_name='systemsettings',
            name='support_hours',
            field=models.JSONField(
                blank=True,
                default=settings.defaults.default_support_hours,
                help_text='برنامه هفتگی — کلیدهای sat..fri',
                verbose_name='ساعات پاسخگویی',
            ),
        ),
    ]
