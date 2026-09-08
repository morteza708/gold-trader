# Generated manually for Bale / Rubika support channels

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0010_invoice_issuer_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsettings',
            name='bale_id',
            field=models.CharField(
                blank=True,
                default='',
                help_text='یوزرنیم (مثل opalbox) یا لینک کامل ble.ir',
                max_length=128,
                verbose_name='آیدی یا لینک بله',
            ),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='rubika_id',
            field=models.CharField(
                blank=True,
                default='',
                help_text='یوزرنیم یا لینک کامل rubika.ir',
                max_length=128,
                verbose_name='آیدی یا لینک روبیکا',
            ),
        ),
    ]
