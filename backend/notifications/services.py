"""
Services for creating and managing notifications
"""
from django.db import transaction
from accounts.models import CustomUser, UserRole
from .models import Notification
from .models import PushSubscription
import logging

logger = logging.getLogger('notifications')


def create_notification(
    user,
    title,
    message,
    notification_type='SYSTEM',
    related_object_type=None,
    related_object_id=None,
    metadata=None
):
    """
    ایجاد یک اعلان جدید برای کاربر
    
    Args:
        user: کاربر دریافت‌کننده اعلان
        title: عنوان اعلان
        message: پیام اعلان
        notification_type: نوع اعلان (از NOTIFICATION_TYPES)
        related_object_type: نوع object مرتبط ('deposit', 'withdrawal', 'trade', 'order')
        related_object_id: ID object مرتبط
        metadata: اطلاعات اضافی (dict)
    
    Returns:
        Notification object
    """
    try:
        notification = Notification.objects.create(
            user=user,
            title=title,
            message=message,
            type=notification_type,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            metadata=metadata or {}
        )
        
        logger.info(f"Notification created for user {user.phone_number}: {title}")
        
        # ارسال Push Notification (اگر subscription فعال باشد)
        send_push_notification_async(notification)
        
        return notification
    except Exception as e:
        logger.error(f"Error creating notification: {e}", exc_info=True)
        return None


def send_push_notification_async(notification):
    """
    ارسال Push Notification به صورت async (از طریق Celery task)
    در حال حاضر فقط log می‌کنیم، در آینده می‌توانیم از Celery استفاده کنیم
    """
    try:
        # دریافت active subscriptions کاربر
        subscriptions = PushSubscription.objects.filter(
            user=notification.user,
            is_active=True
        )
        
        if subscriptions.exists():
            # در آینده می‌توانیم از Celery task استفاده کنیم
            # برای الان فقط log می‌کنیم
            logger.info(
                f"Push notification queued for user {notification.user.phone_number}: "
                f"{notification.title} ({subscriptions.count()} subscriptions)"
            )
            
            # TODO: در فاز بعدی، از Celery task برای ارسال استفاده کنیم
            # from .tasks import send_push_notification_task
            # for subscription in subscriptions:
            #     send_push_notification_task.delay(subscription.id, notification.id)
    except Exception as e:
        logger.error(f"Error in send_push_notification_async: {e}", exc_info=True)


def create_notification_for_admins(
    title,
    message,
    notification_type='SYSTEM',
    related_object_type=None,
    related_object_id=None,
    metadata=None
):
    """
    ایجاد notification برای همه مدیران سایت (SITE_ADMIN و SUPER_ADMIN)
    
    Args:
        title: عنوان اعلان
        message: پیام اعلان
        notification_type: نوع اعلان (از NOTIFICATION_TYPES)
        related_object_type: نوع object مرتبط ('deposit', 'withdrawal', 'trade', 'order')
        related_object_id: ID object مرتبط
        metadata: اطلاعات اضافی (dict)
    
    Returns:
        تعداد notification های ایجاد شده
    """
    try:
        # دریافت همه مدیران
        admins = CustomUser.objects.filter(
            role__in=[UserRole.SITE_ADMIN, UserRole.SUPER_ADMIN],
            is_active=True
        )
        
        created_count = 0
        for admin in admins:
            try:
                notification = Notification.objects.create(
                    user=admin,
                    title=title,
                    message=message,
                    type=notification_type,
                    related_object_type=related_object_type,
                    related_object_id=related_object_id,
                    metadata=metadata or {}
                )
                created_count += 1
                
                # ارسال Push Notification (اگر subscription فعال باشد)
                send_push_notification_async(notification)
                
                logger.info(f"Notification created for admin {admin.phone_number}: {title}")
            except Exception as e:
                logger.error(f"Error creating notification for admin {admin.phone_number}: {e}", exc_info=True)
                continue
        
        return created_count
    except Exception as e:
        logger.error(f"Error in create_notification_for_admins: {e}", exc_info=True)
        return 0

