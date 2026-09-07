from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('treasury', '0004_manual_journal_events'),
    ]

    operations = [
        migrations.AlterField(
            model_name='operationaljournal',
            name='event_type',
            field=models.CharField(
                choices=[
                    ('OPENING', 'مانده افتتاحیه'),
                    ('DEPOSIT', 'واریز ریال'),
                    ('BUY', 'خرید طلا توسط کاربر'),
                    ('SELL', 'فروش طلا توسط کاربر'),
                    ('WITHDRAW_RIAL', 'برداشت ریال'),
                    ('GOLD_DELIVERY', 'تحویل حضوری طلا'),
                    ('VAULT_IN', 'ورود طلا به خزانه'),
                    ('VAULT_OUT', 'خروج طلا از خزانه'),
                    ('ADJUSTMENT', 'تعدیل'),
                    ('PENDING_LOCK', 'قفل خرید معلق'),
                    ('PENDING_UNLOCK', 'آزادسازی خرید معلق'),
                    ('MANUAL_BUY', 'خرید دستی (ادمین)'),
                    ('MANUAL_SELL', 'فروش دستی (ادمین)'),
                    ('OFFPLATFORM_RIAL', 'ریال خارج از سامانه (دستی)'),
                ],
                db_index=True,
                max_length=32,
                verbose_name='نوع رویداد',
            ),
        ),
    ]
