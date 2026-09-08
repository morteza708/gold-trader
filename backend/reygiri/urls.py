from django.urls import path

from . import views

app_name = 'reygiri'

urlpatterns = [
    path('reygiri/lookup/', views.lookup, name='reygiri-lookup'),
]
