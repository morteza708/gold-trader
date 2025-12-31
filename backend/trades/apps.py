from django.apps import AppConfig


class TradesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'trades'
    
    def ready(self):
        """ثبت signal handlers هنگام راه‌اندازی اپلیکیشن"""
        import trades.signals  # noqa

