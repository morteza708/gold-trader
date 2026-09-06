from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('trades', '0010_trade_manual_invoice_fields'),
    ]

    operations = [
        migrations.RenameIndex(
            model_name='trade',
            new_name='trades_channel_created_idx',
            old_name='trades_trad_channel_created_idx',
        ),
    ]
