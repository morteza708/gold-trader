"""
Serializers for Notifications
"""
from rest_framework import serializers
from jalali_date import datetime2jalali
from .models import Notification, PushSubscription


class PushSubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer for Push Subscription
    """
    class Meta:
        model = PushSubscription
        fields = ['id', 'endpoint', 'p256dh', 'auth', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        """
        بررسی اینکه endpoint و keys موجود باشند
        """
        if not data.get('endpoint'):
            raise serializers.ValidationError("endpoint الزامی است")
        if not data.get('p256dh'):
            raise serializers.ValidationError("p256dh الزامی است")
        if not data.get('auth'):
            raise serializers.ValidationError("auth الزامی است")
        return data


class PushSubscriptionCreateSerializer(serializers.Serializer):
    """
    Serializer برای ایجاد Push Subscription
    """
    endpoint = serializers.URLField()
    keys = serializers.DictField()
    
    def validate_keys(self, value):
        """
        بررسی ساختار keys
        """
        if 'p256dh' not in value:
            raise serializers.ValidationError("p256dh در keys الزامی است")
        if 'auth' not in value:
            raise serializers.ValidationError("auth در keys الزامی است")
        return value
    
    def create(self, validated_data):
        """
        ایجاد یا به‌روزرسانی Push Subscription
        """
        user = self.context['request'].user
        endpoint = validated_data['endpoint']
        keys = validated_data['keys']
        
        subscription, created = PushSubscription.objects.update_or_create(
            user=user,
            endpoint=endpoint,
            defaults={
                'p256dh': keys['p256dh'],
                'auth': keys['auth'],
                'is_active': True,
            }
        )
        
        return subscription


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification
    """
    created_at_jalali = serializers.SerializerMethodField()
    read_at_jalali = serializers.SerializerMethodField()
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'type', 'type_display',
            'is_read', 'read_at', 'created_at', 'created_at_jalali', 'read_at_jalali',
            'related_object_type', 'related_object_id', 'metadata'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']

    def get_created_at_jalali(self, obj):
        """تبدیل تاریخ ایجاد به شمسی"""
        if obj.created_at:
            jalali_date = datetime2jalali(obj.created_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None

    def get_read_at_jalali(self, obj):
        """تبدیل تاریخ خوانده شدن به شمسی"""
        if obj.read_at:
            jalali_date = datetime2jalali(obj.read_at)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None

