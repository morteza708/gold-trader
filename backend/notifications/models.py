"""
Notification models
"""
from django.db import models
from accounts.models import CustomUser
from django.utils import timezone
import json


class Notification(models.Model):
    """
    مدل برای ذخیره اعلان‌های کاربران
    """
    NOTIFICATION_TYPES = [
        ('DEPOSIT_APPROVED', 'تایید واریز'),
        ('DEPOSIT_REJECTED', 'رد واریز'),
        ('WITHDRAWAL_APPROVED', 'تایید برداشت'),
        ('WITHDRAWAL_REJECTED', 'رد برداشت'),
        ('WITHDRAWAL_COMPLETED', 'تکمیل برداشت'),
        ('ORDER_EXECUTED', 'اجرای سفارش هوشمند'),
        ('TRADE_COMPLETED', 'تکمیل معامله'),
        ('SYSTEM', 'سیستمی'),
    ]

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES, default='SYSTEM')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # فیلدهای اختیاری برای لینک به object مرتبط
    related_object_type = models.CharField(max_length=50, null=True, blank=True)  # 'deposit', 'withdrawal', 'trade', 'order'
    related_object_id = models.IntegerField(null=True, blank=True)
    
    # Metadata برای نمایش بهتر
    metadata = models.JSONField(default=dict, blank=True)  # برای ذخیره اطلاعات اضافی

    class Meta:
        verbose_name = "اعلان"
        verbose_name_plural = "اعلان‌ها"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"Notification for {self.user.phone_number}: {self.title}"

    def mark_as_read(self):
        """علامت‌گذاری اعلان به عنوان خوانده شده"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class PushSubscription(models.Model):
    """
    مدل برای ذخیره subscription های Push Notification کاربران
    """
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='push_subscriptions'
    )
    endpoint = models.URLField(max_length=500)
    p256dh = models.CharField(max_length=200)  # Public key
    auth = models.CharField(max_length=200)    # Auth secret
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Push Subscription"
        verbose_name_plural = "Push Subscriptions"
        unique_together = ['user', 'endpoint']

    def __str__(self):
        return f"Push Subscription for {self.user.phone_number}"

    def to_dict(self):
        """
        تبدیل subscription به فرمت مورد نیاز برای web-push
        """
        return {
            'endpoint': self.endpoint,
            'keys': {
                'p256dh': self.p256dh,
                'auth': self.auth
            }
        }

