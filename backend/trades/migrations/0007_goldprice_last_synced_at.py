# Generated manually for last_synced_at

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trades', '0006_goldprice_market_snapshot'),
    ]

    operations = [
        migrations.AddField(
            model_name='goldprice',
            name='last_synced_at',
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                help_text='زمان آخرین دریافت موفق از API زنده؛ برای تشخیص سلامت Celery',
                null=True,
                verbose_name='آخرین همگام‌سازی',
            ),
        ),
    ]
