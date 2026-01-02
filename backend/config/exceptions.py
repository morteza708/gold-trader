"""
Custom exception handler for Django REST Framework
"""
from rest_framework.views import exception_handler
from rest_framework import status
from rest_framework.response import Response
from django_ratelimit.exceptions import Ratelimited


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides better error messages
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Handle Rate Limiting
    if isinstance(exc, Ratelimited):
        return Response(
            {
                'error': 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید و دوباره تلاش کنید.',
                'detail': 'Rate limit exceeded'
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    
    # Customize the response for other exceptions
    if response is not None:
        # اگر response از exception_handler آمده، آن را بهبود می‌دهیم
        custom_response_data = {
            'error': response.data.get('detail', 'خطایی رخ داده است'),
        }
        
        # اضافه کردن field errors اگر وجود داشته باشد
        if isinstance(response.data, dict):
            for key, value in response.data.items():
                if key != 'detail' and key != 'error':
                    custom_response_data[key] = value
        
        response.data = custom_response_data
    
    return response

