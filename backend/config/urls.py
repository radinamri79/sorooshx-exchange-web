"""
URL configuration for SorooshX Exchange.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('apps.trading.urls')),
    path('api/v1/users/', include('apps.users.urls')),
]
