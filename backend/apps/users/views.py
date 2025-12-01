import uuid
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import User
from .serializers import UserSerializer


@api_view(['POST'])
def create_guest_user(request):
    """
    Create or retrieve a guest user based on session key.
    """
    session_key = request.data.get('session_key') or str(uuid.uuid4())
    
    user, created = User.objects.get_or_create(
        guest_session_key=session_key,
        defaults={
            'username': f'guest_{session_key[:12]}',
            'is_guest': True,
        }
    )
    
    serializer = UserSerializer(user)
    return Response({
        'user': serializer.data,
        'session_key': session_key,
        'created': created,
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
def get_current_user(request):
    """
    Get the current user based on session key header.
    """
    session_key = request.headers.get('X-Session-Key')
    
    if not session_key:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        user = User.objects.get(guest_session_key=session_key)
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['PATCH'])
def update_preferences(request):
    """
    Update user trading preferences.
    """
    session_key = request.headers.get('X-Session-Key')
    
    if not session_key:
        return Response(
            {'error': 'Session key required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    try:
        user = User.objects.get(guest_session_key=session_key)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Update allowed fields
    allowed_fields = ['default_leverage', 'default_margin_mode']
    for field in allowed_fields:
        if field in request.data:
            setattr(user, field, request.data[field])
    
    user.save()
    serializer = UserSerializer(user)
    return Response(serializer.data)
