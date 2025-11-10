from django.urls import path
from .views import (
    CurrentUserView,
    RegisterView,
    RoomCreateView,
    RoomDetailView,
    RoomMessagesView,
    FileUploadView,
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    # Authentication
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Rooms
    path("rooms/", RoomCreateView.as_view(), name="room_list_create"),
    path("rooms/<uuid:room_id>/", RoomDetailView.as_view(), name="room_detail"),
    # Messages
    path(
        "rooms/<uuid:room_id>/messages/",
        RoomMessagesView.as_view(),
        name="room_messages",
    ),
    # File uploads
    path(
        "rooms/<uuid:room_id>/upload/", FileUploadView.as_view(), name="file_upload"
    ),
    path("user/", CurrentUserView.as_view(), name="current_user"),
]
