# Generated manually for HEIC/iPhone receipt uploads

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('wallet', '0006_add_custom_owner_name'),
    ]

    operations = [
        migrations.AlterField(
            model_name='withdrawalrequest',
            name='receipt_image',
            field=models.FileField(
                blank=True,
                help_text='JPG، PNG، WebP، HEIC/HEIF — حداکثر ۱۰ مگابایت (فقط برای برداشت وجه)',
                null=True,
                upload_to='withdrawal_receipts/',
                verbose_name='فیش واریزی',
            ),
        ),
        migrations.AlterField(
            model_name='depositrequest',
            name='receipt_image',
            field=models.FileField(
                blank=True,
                help_text='JPG، PNG، WebP، HEIC/HEIF — حداکثر ۱۰ مگابایت (در flow جدید اختیاری است)',
                null=True,
                upload_to='deposit_receipts/',
                verbose_name='تصویر فیش واریزی',
            ),
        ),
        migrations.AlterField(
            model_name='depositreceipt',
            name='receipt_image',
            field=models.FileField(
                help_text='JPG، PNG، WebP، HEIC/HEIF — حداکثر ۱۰ مگابایت',
                upload_to='deposit_receipts/',
                verbose_name='تصویر فیش واریزی',
            ),
        ),
    ]
