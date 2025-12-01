from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'is_guest', 'default_leverage', 'created_at']
    list_filter = ['is_guest', 'default_margin_mode', 'is_active']
    search_fields = ['username', 'email', 'guest_session_key']
    ordering = ['-created_at']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Trading', {
            'fields': ('is_guest', 'guest_session_key', 'default_leverage', 'default_margin_mode')
        }),
    )
