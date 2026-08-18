from rest_framework import serializers
import re
from .models import SystemSettings, DepositAccount, SitePage


def persian_to_english_numbers(text):
    """تبدیل اعداد فارسی و عربی به انگلیسی"""
    persian_digits = '۰۱۲۳۴۵۶۷۸۹'
    arabic_digits = '٠١٢٣٤٥٦٧٨٩'
    english_digits = '0123456789'
    
    for i in range(10):
        text = text.replace(persian_digits[i], english_digits[i])
        text = text.replace(arabic_digits[i], english_digits[i])
    
    return text


class SystemSettingsSerializer(serializers.ModelSerializer):
    """Serializer برای تنظیمات سیستم"""
    
    class Meta:
        model = SystemSettings
        fields = ['admin_phone_numbers', 'gold_pickup_address', 'updated_at']
        read_only_fields = ['updated_at']
    
    def validate_admin_phone_numbers(self, value):
        """اعتبارسنجی شماره مدیران"""
        if not isinstance(value, list):
            raise serializers.ValidationError('شماره مدیران باید به صورت لیست باشد')
        
        # اگر لیست خالی است و در حالت partial update هستیم، مقدار موجود را حفظ می‌کنیم
        # این کار در متد update انجام می‌شود، اما اینجا فقط اعتبارسنجی می‌کنیم
        if len(value) == 0:
            # در حالت partial update، لیست خالی را قبول می‌کنیم اما در update آن را نادیده می‌گیریم
            return value
        
        validated_numbers = []
        for phone in value:
            phone = persian_to_english_numbers(str(phone))
            phone = re.sub(r'\s+', '', phone)
            if not re.match(r'^09\d{9}$', phone):
                raise serializers.ValidationError(f'شماره موبایل {phone} نامعتبر است')
            validated_numbers.append(phone)
        
        return validated_numbers
    
    def update(self, instance, validated_data):
        """به‌روزرسانی تنظیمات با حفظ داده‌های موجود در صورت لیست خالی"""
        # اگر admin_phone_numbers به صورت لیست خالی ارسال شده، مقدار موجود را حفظ می‌کنیم
        # این کار از پاک شدن تصادفی شماره‌ها جلوگیری می‌کند
        if 'admin_phone_numbers' in validated_data:
            new_phone_numbers = validated_data['admin_phone_numbers']
            # اگر لیست خالی است و قبلاً شماره‌هایی وجود داشته، مقدار موجود را حفظ می‌کنیم
            if len(new_phone_numbers) == 0 and len(instance.admin_phone_numbers) > 0:
                # لیست خالی را نادیده می‌گیریم و مقدار موجود را حفظ می‌کنیم
                validated_data.pop('admin_phone_numbers')
                print(f"⚠️ هشدار: لیست خالی برای admin_phone_numbers نادیده گرفته شد. مقدار موجود ({len(instance.admin_phone_numbers)} شماره) حفظ شد.")
        
        return super().update(instance, validated_data)


class DepositAccountSerializer(serializers.ModelSerializer):
    """Serializer برای حساب‌های بانکی واریز"""
    
    class Meta:
        model = DepositAccount
        fields = ['id', 'bank_name', 'owner_name', 'card_number', 'sheba_number', 'is_active', 'order', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_card_number(self, value):
        """اعتبارسنجی شماره کارت"""
        value = persian_to_english_numbers(str(value))
        value = re.sub(r'\s+|-', '', value)
        if not re.match(r'^\d{16}$', value):
            raise serializers.ValidationError('شماره کارت باید 16 رقم باشد')
        return value
    
    def validate_sheba_number(self, value):
        """اعتبارسنجی شماره شبا"""
        value = persian_to_english_numbers(str(value))
        value = re.sub(r'\s+|-', '', value)
        # حذف IR از ابتدا در صورت وجود
        if value.upper().startswith('IR'):
            value = value[2:]
        if not re.match(r'^\d{24}$', value):
            raise serializers.ValidationError('شماره شبا باید 24 رقم باشد (بدون IR)')
        return value


class SitePageSerializer(serializers.ModelSerializer):
    """Serializer برای صفحات عمومی سایت"""

    hero_image_url = serializers.SerializerMethodField()
    extra_image_url = serializers.SerializerMethodField()
    slug_display = serializers.CharField(source='get_slug_display', read_only=True)

    class Meta:
        model = SitePage
        fields = [
            'slug',
            'slug_display',
            'title',
            'subtitle',
            'body',
            'hero_image',
            'hero_image_url',
            'extra_image',
            'extra_image_url',
            'section_one_title',
            'section_one_body',
            'section_two_title',
            'section_two_body',
            'address',
            'phone',
            'email',
            'is_published',
            'updated_at',
        ]
        read_only_fields = ['slug', 'slug_display', 'hero_image_url', 'extra_image_url', 'updated_at']
        extra_kwargs = {
            'hero_image': {'write_only': True, 'required': False},
            'extra_image': {'write_only': True, 'required': False},
        }

    def _absolute_url(self, file_field):
        if not file_field:
            return None
        request = self.context.get('request')
        try:
            url = file_field.url
        except ValueError:
            return None
        if request:
            return request.build_absolute_uri(url)
        return url

    def get_hero_image_url(self, obj):
        return self._absolute_url(obj.hero_image)

    def get_extra_image_url(self, obj):
        return self._absolute_url(obj.extra_image)
