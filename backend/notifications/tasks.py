"""
Celery tasks for Web Push notifications
"""
from __future__ import annotations

import json
import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger('notifications')


def _notification_url(notification) -> str:
    t = notification.related_object_type
    if t in ('deposit', 'withdrawal'):
        return '/dashboard/wallet'
    if t in ('trade', 'order'):
        return '/dashboard/history'
    return '/dashboard'


@shared_task(
    bind=True,
    ignore_result=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={'max_retries': 3},
    name='notifications.tasks.send_web_push',
)
def send_web_push(self, subscription_id: int, notification_id: int) -> None:
    from pywebpush import webpush, WebPushException

    from .models import Notification, PushSubscription

    try:
        subscription = PushSubscription.objects.select_related('user').get(pk=subscription_id)
    except PushSubscription.DoesNotExist:
        logger.warning('Push subscription %s not found', subscription_id)
        return

    if not subscription.is_active:
        return

    try:
        notification = Notification.objects.get(pk=notification_id)
    except Notification.DoesNotExist:
        logger.warning('Notification %s not found', notification_id)
        return

    vapid_private = getattr(settings, 'VAPID_PRIVATE_KEY', '') or ''
    vapid_public = getattr(settings, 'VAPID_PUBLIC_KEY', '') or ''
    vapid_email = getattr(settings, 'VAPID_CLAIM_EMAIL', 'mailto:admin@opalbox.ir')

    if not vapid_private or not vapid_public:
        logger.warning('VAPID keys not configured; skip web push')
        return

    payload = {
        'title': notification.title,
        'body': notification.message,
        'tag': f'notif-{notification.id}',
        'icon': '/web-app-manifest-192x192.png',
        'badge': '/web-app-manifest-192x192.png',
        'related_object_type': notification.related_object_type,
        'related_object_id': notification.related_object_id,
        'url': _notification_url(notification),
        'data': {
            'notification_id': notification.id,
            'type': notification.type,
            'url': _notification_url(notification),
        },
    }

    try:
        webpush(
            subscription_info=subscription.to_dict(),
            data=json.dumps(payload, ensure_ascii=False),
            vapid_private_key=vapid_private,
            vapid_claims={'sub': vapid_email},
        )
        logger.info(
            'Web push sent to user %s (sub=%s, notif=%s)',
            subscription.user_id,
            subscription_id,
            notification_id,
        )
    except WebPushException as exc:
        status_code = getattr(getattr(exc, 'response', None), 'status_code', None)
        logger.warning(
            'Web push failed sub=%s status=%s: %s',
            subscription_id,
            status_code,
            exc,
        )
        # Gone / Not Found → deactivate stale subscription
        if status_code in (404, 410):
            subscription.is_active = False
            subscription.save(update_fields=['is_active', 'updated_at'])
        else:
            raise
