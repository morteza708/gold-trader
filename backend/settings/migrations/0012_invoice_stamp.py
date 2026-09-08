from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0011_support_bale_rubika'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsettings',
            name='invoice_stamp',
            field=models.ImageField(
                blank=True,
                help_text='تصویر مهر رسمی یا امضای دیجیتال فروشنده روی فاکتور',
                null=True,
                upload_to='invoice_stamps/',
                verbose_name='مهر / امضای دیجیتال فاکتور',
            ),
        ),
    ]
