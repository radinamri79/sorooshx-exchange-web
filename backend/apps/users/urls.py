from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    path('guest/', views.create_guest_user, name='create_guest'),
    path('me/', views.get_current_user, name='current_user'),
    path('preferences/', views.update_preferences, name='update_preferences'),
]
