from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_notification'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pushsubscription',
            name='endpoint',
            field=models.URLField(max_length=2048),
        ),
        migrations.AlterField(
            model_name='pushsubscription',
            name='p256dh',
            field=models.CharField(max_length=255),
        ),
        migrations.AlterField(
            model_name='pushsubscription',
            name='auth',
            field=models.CharField(max_length=255),
        ),
    ]
