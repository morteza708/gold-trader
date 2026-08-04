"""
URL configuration for config project.
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
    path('api/', include('accounts.urls')),
    path('api/', include('wallet.urls')),
    path('api/', include('settings.urls')),
    path('api/', include('trades.urls')),
    path('api/', include('notifications.urls')),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Explicit serve for Runflare (WhiteNoise alone is not enough for /django-static/).
    static_prefix = settings.STATIC_URL.lstrip('/')
    media_prefix = settings.MEDIA_URL.lstrip('/')
    urlpatterns += [
        re_path(
            rf'^{static_prefix}(?P<path>.*)$',
            serve,
            {'document_root': settings.STATIC_ROOT},
        ),
        re_path(
            rf'^{media_prefix}(?P<path>.*)$',
            serve,
            {'document_root': settings.MEDIA_ROOT},
        ),
    ]
