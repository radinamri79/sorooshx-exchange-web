"""
Custom User model for SorooshX Exchange.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model with additional fields for trading platform.
    """
    email = models.EmailField(unique=True, blank=True, null=True)
    
    # Guest user tracking
    is_guest = models.BooleanField(default=False)
    guest_session_key = models.CharField(max_length=64, blank=True, null=True, unique=True)
    
    # Trading preferences
    default_leverage = models.PositiveSmallIntegerField(default=10)
    default_margin_mode = models.CharField(
        max_length=10,
        choices=[('cross', 'Cross'), ('isolated', 'Isolated')],
        default='cross'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        if self.is_guest:
            return f'Guest-{self.guest_session_key[:8]}'
        return self.username or self.email or f'User-{self.pk}'
