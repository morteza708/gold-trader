from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0004_sitepage'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsettings',
            name='pending_purchase_expiry_hours',
            field=models.PositiveIntegerField(
                default=4,
                help_text='پس از ثبت خرید معلق، کاربر چند ساعت فرصت تکمیل واریز دارد',
                verbose_name='مهلت تسویه خرید معلق (ساعت)',
            ),
        ),
    ]
