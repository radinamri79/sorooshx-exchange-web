from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'is_guest',
            'default_leverage',
            'default_margin_mode',
            'created_at',
        ]
        read_only_fields = ['id', 'is_guest', 'created_at']


class GuestUserSerializer(serializers.Serializer):
    """Serializer for creating guest users."""
    session_key = serializers.CharField(max_length=64)
