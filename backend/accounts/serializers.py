from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CustomUser, UserRole, CustomerProfile
from .services import send_message, get_random_otp, persian_to_english_numbers, send_double_token_message
from django.utils import timezone
import re
import jdatetime
import uuid
import logging

User = get_user_model()
logger = logging.getLogger('accounts')


class SendOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=11)
    
    def validate_phone_number(self, value):
        """اعتبارسنجی شماره موبایل"""
        # تبدیل اعداد فارسی به انگلیسی
        value = persian_to_english_numbers(value)
        # حذف فاصله و کاراکترهای اضافی
        value = re.sub(r'\s+', '', value)
        
        # بررسی فرمت شماره موبایل ایرانی
        if not re.match(r'^09\d{9}$', value):
            raise serializers.ValidationError('شماره موبایل باید با 09 شروع شود و 11 رقم باشد')
        
        return value
    
    def validate(self, attrs):
        phone_number = attrs['phone_number']
        
        # بررسی اینکه شماره موبایل توسط مدیر تایید شده باشد
        try:
            user = CustomUser.objects.get(phone_number=phone_number)
            if not user.is_phone_verified:
                raise serializers.ValidationError({
                    'phone_number': 'شماره موبایل شما توسط مدیر تایید نشده است. لطفا با پشتیبانی تماس بگیرید.'
                })
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError({
                'phone_number': 'شماره موبایل شما در سیستم ثبت نشده است. لطفا با پشتیبانی تماس بگیرید.'
            })
        
        return attrs
    
    def create(self, validated_data):
        logger.info(f"[OTP Serializer] شروع - validated_data: {validated_data}")
        phone_number = validated_data['phone_number']
        logger.info(f"[OTP Serializer] phone_number: {phone_number}")
        
        user = CustomUser.objects.get(phone_number=phone_number)
        logger.info(f"[OTP Serializer] کاربر پیدا شد: {user.phone_number}")
        
        # تولید کد OTP
        otp_code = str(get_random_otp())
        logger.info(f"[OTP Serializer] کد OTP تولید شد: {otp_code}")
        
        # ذخیره کد OTP در دیتابیس
        user.otp_code = otp_code
        user.otp_code_created = timezone.now()
        user.save()
        logger.info(f"[OTP Serializer] کد OTP در دیتابیس ذخیره شد")
        
        # ارسال پیامک
        logger.info(f"[OTP Serializer] در حال فراخوانی send_message...")
        try:
            result = send_message(phone_number, otp_code)
            logger.info(f"[OTP Serializer] نتیجه ارسال پیامک: {result}")
        except Exception as e:
            logger.error(f"[OTP Serializer] خطا در فراخوانی send_message: {e}", exc_info=True)
        
        return {'message': 'کد OTP با موفقیت ارسال شد'}


class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=11)
    otp_code = serializers.CharField(max_length=4)
    
    def validate_phone_number(self, value):
        # تبدیل اعداد فارسی به انگلیسی
        value = persian_to_english_numbers(value)
        value = re.sub(r'\s+', '', value)
        if not re.match(r'^09\d{9}$', value):
            raise serializers.ValidationError('شماره موبایل باید با 09 شروع شود و 11 رقم باشد')
        return value
    
    def validate_otp_code(self, value):
        # تبدیل اعداد فارسی به انگلیسی
        value = persian_to_english_numbers(value)
        # حذف فاصله و کاراکترهای اضافی
        value = re.sub(r'\s+', '', value)
        return value
    
    def validate(self, attrs):
        phone_number = attrs['phone_number']
        otp_code = attrs['otp_code']
        
        try:
            user = CustomUser.objects.get(phone_number=phone_number)
            
            # بررسی انقضای کد OTP
            if not user.check_otp_expiration():
                raise serializers.ValidationError({
                    'otp_code': 'کد OTP منقضی شده است. لطفا مجددا درخواست کد دهید.'
                })
            
            # بررسی صحت کد OTP
            if user.otp_code != otp_code:
                raise serializers.ValidationError({
                    'otp_code': 'کد OTP اشتباه است.'
                })
            
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError({
                'phone_number': 'شماره موبایل در سیستم یافت نشد.'
            })
        
        return attrs


class CompleteProfileSerializer(serializers.ModelSerializer):
    birth_date = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    ALLOWED_IMAGE_TYPES = ('image/jpeg', 'image/jpg', 'image/png')
    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
    
    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'national_id', 'national_card_image', 'birth_date']
    
    def validate_first_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('نام الزامی است')
        return str(value).strip()
    
    def validate_last_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError('نام خانوادگی الزامی است')
        return str(value).strip()
    
    def validate_national_id(self, value):
        """اعتبارسنجی کد ملی"""
        if not value:
            raise serializers.ValidationError('کد ملی الزامی است')
        # تبدیل اعداد فارسی به انگلیسی
        value = persian_to_english_numbers(value)
        if len(value) != 10:
            raise serializers.ValidationError('کد ملی باید 10 رقم باشد')
        if not value.isdigit():
            raise serializers.ValidationError('کد ملی باید فقط شامل اعداد باشد')
        return value
    
    def validate_national_card_image(self, value):
        if value is None:
            return value
        if value.size > self.MAX_IMAGE_SIZE:
            raise serializers.ValidationError('حجم تصویر باید کمتر از ۵ مگابایت باشد')
        content_type = getattr(value, 'content_type', '') or ''
        if content_type not in self.ALLOWED_IMAGE_TYPES:
            raise serializers.ValidationError('فرمت مجاز: JPG یا PNG')
        return value
    
    def validate(self, attrs):
        instance = self.instance
        errors = {}
        
        birth_date = attrs.get('birth_date')
        if birth_date is None and 'birth_date' not in attrs:
            birth_date = None
        has_birth_date = bool(birth_date) or (instance and instance.birth_date)
        
        has_image = attrs.get('national_card_image') or (instance and instance.national_card_image)
        if not has_image:
            errors['national_card_image'] = 'آپلود تصویر کارت ملی الزامی است'
        if not has_birth_date:
            errors['birth_date'] = 'تاریخ تولد الزامی است'
        
        if errors:
            raise serializers.ValidationError(errors)
        return attrs
    
    def validate_birth_date(self, value):
        """اعتبارسنجی تاریخ تولد (فرمت: YYYY-MM-DD شمسی)"""
        if not value:
            raise serializers.ValidationError('تاریخ تولد الزامی است')
        
        # تبدیل اعداد فارسی به انگلیسی
        value = persian_to_english_numbers(value)
        value = value.strip()
        
        # بررسی فرمت تاریخ (YYYY-MM-DD)
        try:
            parts = value.split('-')
            if len(parts) != 3:
                raise serializers.ValidationError('فرمت تاریخ باید YYYY-MM-DD باشد (مثال: 1375-05-15)')
            
            year = int(parts[0])
            month = int(parts[1])
            day = int(parts[2])
            
            # بررسی اعتبار تاریخ شمسی
            jdatetime.date(year, month, day)
            
            return value
        except ValueError as e:
            raise serializers.ValidationError(f'تاریخ نامعتبر است: {str(e)}')
        except Exception as e:
            raise serializers.ValidationError(f'فرمت تاریخ اشتباه است. باید YYYY-MM-DD باشد (مثال: 1375-05-15)')
    
    def update(self, instance, validated_data):
        birth_date_str = validated_data.pop('birth_date', None)
        
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.national_id = validated_data.get('national_id', instance.national_id)
        instance.national_card_image = validated_data.get('national_card_image', instance.national_card_image)
        
        # تبدیل تاریخ شمسی به jDate
        if birth_date_str:
            parts = birth_date_str.split('-')
            year = int(parts[0])
            month = int(parts[1])
            day = int(parts[2])
            instance.birth_date = jdatetime.date(year, month, day)
        elif birth_date_str is None and 'birth_date' in validated_data:
            instance.birth_date = None
        
        instance.save()
        
        if (
            instance.first_name and
            instance.last_name and
            instance.national_id and
            instance.national_card_image and
            instance.birth_date
        ):
            instance.profile_completed = True
            instance.save(update_fields=['profile_completed'])
        
        return instance


class AdminUserListSerializer(serializers.ModelSerializer):
    """Serializer برای لیست کاربران در پنل مدیریت (بهینه شده)"""
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    customer_profile = serializers.SerializerMethodField()
    date_joined_jalali = serializers.SerializerMethodField()
    last_login_jalali = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'phone_number',
            'first_name',
            'last_name',
            'email',
            'national_id',
            'role',
            'role_display',
            'is_phone_verified',
            'is_active',
            'profile_completed',
            'date_joined',
            'date_joined_jalali',
            'last_login',
            'last_login_jalali',
            'avatar',
            'customer_profile'
        ]
        read_only_fields = ['id', 'phone_number', 'role', 'date_joined', 'last_login']
    
    def get_customer_profile(self, obj):
        """دریافت customer_profile (با select_related بهینه شده)"""
        if hasattr(obj, 'customer_profile'):
            return {
                'account_code': obj.customer_profile.account_code,
            }
        return None
    
    def get_date_joined_jalali(self, obj):
        """تبدیل تاریخ عضویت به شمسی"""
        if obj.date_joined:
            from jalali_date import datetime2jalali
            jalali_date = datetime2jalali(obj.date_joined)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    def get_last_login_jalali(self, obj):
        """تبدیل آخرین ورود به شمسی"""
        if obj.last_login:
            from jalali_date import datetime2jalali
            jalali_date = datetime2jalali(obj.last_login)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    def get_avatar(self, obj):
        """برگرداندن URL کامل avatar"""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    birth_date = serializers.SerializerMethodField()
    customer_profile = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    national_card_image = serializers.SerializerMethodField()
    has_bank_card = serializers.SerializerMethodField()
    is_active = serializers.BooleanField(read_only=True)
    date_joined_jalali = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id',
            'phone_number',
            'first_name',
            'last_name',
            'national_id',
            'national_card_image',
            'avatar',
            'is_phone_verified',
            'is_active',
            'role',
            'role_display',
            'profile_completed',
            'birth_date',
            'date_joined',
            'date_joined_jalali',
            'customer_profile',
            'has_bank_card'
        ]
        read_only_fields = ['id', 'phone_number', 'role', 'date_joined']
    
    def get_birth_date(self, obj):
        """تبدیل تاریخ تولد به فرمت شمسی"""
        if obj.birth_date:
            return obj.birth_date.strftime('%Y-%m-%d')
        return None
    
    def get_avatar(self, obj):
        """برگرداندن URL کامل avatar"""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None
    
    def get_national_card_image(self, obj):
        """برگرداندن URL کامل عکس کارت ملی"""
        if obj.national_card_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.national_card_image.url)
            return obj.national_card_image.url
        return None
    
    def get_has_bank_card(self, obj):
        """بررسی اینکه آیا کاربر کارت بانکی دارد یا نه"""
        from wallet.models import BankCard
        return BankCard.objects.filter(user=obj, is_active=True).exists()
    
    def get_date_joined_jalali(self, obj):
        """تبدیل تاریخ عضویت به شمسی"""
        if obj.date_joined:
            from jalali_date import datetime2jalali
            jalali_date = datetime2jalali(obj.date_joined)
            return jalali_date.strftime('%Y/%m/%d %H:%M')
        return None
    
    def get_customer_profile(self, obj):
        """دریافت customer_profile اگر وجود داشته باشد"""
        if hasattr(obj, 'customer_profile'):
            return {
                'account_code': obj.customer_profile.account_code,
                'created_at': obj.customer_profile.created_at,
                'updated_at': obj.customer_profile.updated_at,
            }
        return None


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer برای به‌روزرسانی پروفایل کاربر"""
    birth_date = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    remove_avatar = serializers.BooleanField(required=False, default=False)
    
    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'birth_date', 'avatar', 'remove_avatar']
    
    def validate_birth_date(self, value):
        """اعتبارسنجی تاریخ تولد (فرمت: YYYY-MM-DD شمسی)"""
        if not value:
            return None
        
        # تبدیل اعداد فارسی به انگلیسی
        value = persian_to_english_numbers(value)
        value = value.strip()
        
        # بررسی فرمت تاریخ (YYYY-MM-DD)
        try:
            parts = value.split('-')
            if len(parts) != 3:
                raise serializers.ValidationError('فرمت تاریخ باید YYYY-MM-DD باشد (مثال: 1375-05-15)')
            
            year = int(parts[0])
            month = int(parts[1])
            day = int(parts[2])
            
            # بررسی اعتبار تاریخ شمسی
            jdatetime.date(year, month, day)
            
            return value
        except ValueError as e:
            raise serializers.ValidationError(f'تاریخ نامعتبر است: {str(e)}')
        except Exception as e:
            raise serializers.ValidationError(f'فرمت تاریخ اشتباه است. باید YYYY-MM-DD باشد (مثال: 1375-05-15)')
    
    def update(self, instance, validated_data):
        birth_date_str = validated_data.pop('birth_date', None)
        remove_avatar = validated_data.pop('remove_avatar', False)
        
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        
        # به‌روزرسانی avatar اگر ارسال شده باشد
        if remove_avatar:
            if instance.avatar:
                instance.avatar.delete(save=False)
            instance.avatar = None
        elif 'avatar' in validated_data:
            instance.avatar = validated_data.get('avatar')
        
        # تبدیل تاریخ شمسی به jDate
        if birth_date_str:
            parts = birth_date_str.split('-')
            year = int(parts[0])
            month = int(parts[1])
            day = int(parts[2])
            instance.birth_date = jdatetime.date(year, month, day)
        elif birth_date_str is None and 'birth_date' in validated_data:
            # اگر خالی ارسال شده باشد
            instance.birth_date = None
        
        instance.save()
        return instance


class AdminRegisterPhoneSerializer(serializers.Serializer):
    """Serializer برای ثبت شماره موبایل از پنل مدیریت"""
    phone_number = serializers.CharField(max_length=11)
    role = serializers.ChoiceField(choices=UserRole.choices, default=UserRole.CUSTOMER, required=False)
    
    def validate_phone_number(self, value):
        """اعتبارسنجی شماره موبایل"""
        # تبدیل اعداد فارسی به انگلیسی
        value = persian_to_english_numbers(value)
        # حذف فاصله و کاراکترهای اضافی
        value = re.sub(r'\s+', '', value)
        
        # بررسی فرمت شماره موبایل ایرانی
        if not re.match(r'^09\d{9}$', value):
            raise serializers.ValidationError('شماره موبایل باید با 09 شروع شود و 11 رقم باشد')
        
        return value
    
    def validate_role(self, value):
        """اعتبارسنجی نقش - فقط CUSTOMER و SITE_ADMIN مجاز هستند"""
        # SUPER_ADMIN نمی‌تواند از این طریق ایجاد شود
        if value == UserRole.SUPER_ADMIN:
            raise serializers.ValidationError('نقش سوپر ادمین نمی‌تواند از این طریق ایجاد شود')
        return value
    
    def validate(self, attrs):
        phone_number = attrs['phone_number']
        
        # بررسی اینکه شماره قبلا ثبت نشده باشد
        if CustomUser.objects.filter(phone_number=phone_number).exists():
            raise serializers.ValidationError({
                'phone_number': 'این شماره موبایل قبلا در سیستم ثبت شده است.'
            })
        
        return attrs
    
    def create(self, validated_data):
        phone_number = validated_data['phone_number']
        role = validated_data.get('role', UserRole.CUSTOMER)
        
        # ایجاد کاربر جدید با نقش تعیین شده و تایید همزمان
        # چون از پنل مدیریت ثبت می‌شود، به معنای تایید است
        user = CustomUser.objects.create(
            phone_number=phone_number,
            is_phone_verified=True,  # ثبت از پنل مدیریت = تایید همزمان
            role=role
        )
        
        return user


class AdminVerifyPhoneSerializer(serializers.Serializer):
    """Serializer برای تایید شماره موبایل از پنل مدیریت"""
    phone_number = serializers.CharField(max_length=11)
    send_invite = serializers.BooleanField(default=True, required=False)
    
    def validate_phone_number(self, value):
        """اعتبارسنجی شماره موبایل"""
        # تبدیل اعداد فارسی به انگلیسی
        value = persian_to_english_numbers(value)
        # حذف فاصله و کاراکترهای اضافی
        value = re.sub(r'\s+', '', value)
        
        # بررسی فرمت شماره موبایل ایرانی
        if not re.match(r'^09\d{9}$', value):
            raise serializers.ValidationError('شماره موبایل باید با 09 شروع شود و 11 رقم باشد')
        
        return value
    
    def validate(self, attrs):
        phone_number = attrs['phone_number']
        
        # بررسی اینکه شماره در سیستم وجود دارد
        try:
            user = CustomUser.objects.get(phone_number=phone_number)
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError({
                'phone_number': 'این شماره موبایل در سیستم یافت نشد.'
            })
        
        return attrs


