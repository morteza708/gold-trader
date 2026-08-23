# Generated manually for HEIC/iPhone national card uploads

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_remove_bankcard_user_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='national_card_image',
            field=models.FileField(
                blank=True,
                help_text='JPG، PNG، WebP، HEIC/HEIF — حداکثر ۱۰ مگابایت',
                null=True,
                upload_to='national_cards/',
                verbose_name='عکس کارت ملی',
            ),
        ),
    ]
