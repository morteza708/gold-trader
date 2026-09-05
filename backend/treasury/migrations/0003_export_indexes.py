from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('treasury', '0002_vaultmovement_pnl_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='vaultmovement',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='زمان ثبت'),
        ),
        migrations.AddIndex(
            model_name='operationaljournal',
            index=models.Index(fields=['-created_at', 'event_type'], name='treasury_oj_created_event_idx'),
        ),
    ]
