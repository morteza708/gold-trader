from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trades', '0008_pendingpurchase'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='suspended_reason',
            field=models.CharField(
                blank=True,
                choices=[('', '—'), ('KILL_SWITCH', 'kill switch'), ('PENDING_PURCHASE', 'خرید معلق')],
                default='',
                max_length=32,
                verbose_name='دلیل تعلیق',
            ),
        ),
    ]
