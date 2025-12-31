# Generated manually

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('wallet', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='withdrawalrequest',
            name='completed_at',
            field=models.DateTimeField(blank=True, help_text='تاریخ تسویه درخواست (فقط برای برداشت طلا)', null=True, verbose_name='تاریخ تسویه'),
        ),
    ]

