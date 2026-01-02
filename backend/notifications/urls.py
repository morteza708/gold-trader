"""
URLs for Notifications
"""
from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # Push Notifications
    path('notifications/push/subscribe/', views.subscribe_push, name='subscribe-push'),
    path('notifications/push/unsubscribe/', views.unsubscribe_push, name='unsubscribe-push'),
    path('notifications/push/subscriptions/', views.get_subscriptions, name='get-subscriptions'),
    
    # Notifications - باید URL های خاص قبل از URL های با پارامتر قرار گیرند
    path('notifications/unread-count/', views.get_unread_count, name='get-unread-count'),
    path('notifications/mark-all-read/', views.mark_all_read, name='mark-all-read'),
    path('notifications/<int:notification_id>/read/', views.mark_notification_read, name='mark-notification-read'),
    path('notifications/<int:notification_id>/', views.delete_notification, name='delete-notification'),
    path('notifications/', views.get_notifications, name='get-notifications'),  # این باید آخر باشد
]

