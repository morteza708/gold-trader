"""
Views for Notifications
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_ratelimit.decorators import ratelimit
from django.db.models import Q
import logging

from .models import Notification, PushSubscription
from .serializers import (
    NotificationSerializer,
    PushSubscriptionSerializer,
    PushSubscriptionCreateSerializer
)

logger = logging.getLogger('notifications')


@ratelimit(key='user', rate='10/m', method='POST', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe_push(request):
    """
    ثبت subscription برای Push Notifications
    """
    try:
        serializer = PushSubscriptionCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            subscription = serializer.save()
            response_serializer = PushSubscriptionSerializer(subscription)
            logger.info(f"Push subscription created for user {request.user.phone_number}")
            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in subscribe_push: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در ثبت subscription'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@ratelimit(key='user', rate='10/m', method='POST', block=True)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unsubscribe_push(request):
    """
    حذف subscription برای Push Notifications
    """
    try:
        endpoint = request.data.get('endpoint')
        
        if not endpoint:
            return Response(
                {'error': 'endpoint الزامی است'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        subscription = PushSubscription.objects.filter(
            user=request.user,
            endpoint=endpoint
        ).first()
        
        if subscription:
            subscription.is_active = False
            subscription.save()
            logger.info(f"Push subscription deactivated for user {request.user.phone_number}")
            return Response(
                {'message': 'Subscription با موفقیت غیرفعال شد'},
                status=status.HTTP_200_OK
            )
        
        return Response(
            {'error': 'Subscription یافت نشد'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error in unsubscribe_push: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در حذف subscription'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscriptions(request):
    """
    دریافت لیست subscriptions کاربر
    """
    try:
        subscriptions = PushSubscription.objects.filter(
            user=request.user,
            is_active=True
        )
        serializer = PushSubscriptionSerializer(subscriptions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error in get_subscriptions: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در دریافت subscriptions'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ==================== Notification Views ====================

@ratelimit(key='user', rate='60/m', method='GET', block=True)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notifications(request):
    """
    دریافت لیست اعلان‌های کاربر
    Query params:
    - is_read: true/false (فیلتر بر اساس خوانده شده/نشده)
    - type: نوع اعلان
    - limit: تعداد نتایج (default: 50)
    """
    try:
        queryset = Notification.objects.filter(user=request.user)
        
        # فیلتر بر اساس is_read
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)
        
        # فیلتر بر اساس type
        notification_type = request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        
        # محدود کردن تعداد نتایج
        limit = int(request.query_params.get('limit', 50))
        queryset = queryset[:limit]
        
        serializer = NotificationSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error in get_notifications: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در دریافت اعلان‌ها'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@ratelimit(key='user', rate='30/m', method='GET', block=True)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_count(request):
    """
    دریافت تعداد اعلان‌های خوانده نشده
    """
    try:
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        
        return Response({'unread_count': count}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error in get_unread_count: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در دریافت تعداد اعلان‌ها'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@ratelimit(key='user', rate='30/m', method='PUT', block=True)
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notification_id):
    """
    علامت‌گذاری اعلان به عنوان خوانده شده
    """
    try:
        notification = Notification.objects.filter(
            id=notification_id,
            user=request.user
        ).first()
        
        if not notification:
            return Response(
                {'error': 'اعلان یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        notification.mark_as_read()
        serializer = NotificationSerializer(notification)
        
        logger.info(f"Notification {notification_id} marked as read by user {request.user.phone_number}")
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Error in mark_notification_read: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در به‌روزرسانی اعلان'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@ratelimit(key='user', rate='30/m', method='PUT', block=True)
@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def mark_all_read(request):
    """
    علامت‌گذاری همه اعلان‌ها به عنوان خوانده شده
    """
    try:
        updated_count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        
        logger.info(f"{updated_count} notifications marked as read by user {request.user.phone_number}")
        return Response(
            {'message': f'{updated_count} اعلان به عنوان خوانده شده علامت‌گذاری شد'},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"Error in mark_all_read: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در به‌روزرسانی اعلان‌ها'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@ratelimit(key='user', rate='30/m', method='DELETE', block=True)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """
    حذف اعلان
    """
    try:
        notification = Notification.objects.filter(
            id=notification_id,
            user=request.user
        ).first()
        
        if not notification:
            return Response(
                {'error': 'اعلان یافت نشد'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        notification.delete()
        logger.info(f"Notification {notification_id} deleted by user {request.user.phone_number}")
        return Response(
            {'message': 'اعلان با موفقیت حذف شد'},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"Error in delete_notification: {e}", exc_info=True)
        return Response(
            {'error': 'خطا در حذف اعلان'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

