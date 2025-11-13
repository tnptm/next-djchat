from django.shortcuts import get_object_or_404 #render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser #, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Room, Message, User, Membership, FileAttachment
from .serializers import (
    # MessageSerializer,
    UserSerializer,
    RoomSerializer,
    RoomCreateSerializer,
    RegisterSerializer,
)
from .crypto import decrypt_with_room_key, encrypt_with_room_key


# -------------------------------
# 1. Register new user
# -------------------------------
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)  # type: ignore
        return Response(
            {
                "user": UserSerializer(user).data,
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            },
            status=status.HTTP_201_CREATED,
        )


# -------------------------------
# 2. Create chat room & List user's rooms
# -------------------------------
class RoomCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List all rooms where the user is a member"""
        memberships = Membership.objects.filter(user=request.user).select_related(
            "room"
        )
        rooms = [m.room for m in memberships]
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)

    def post(self, request):
        """
        Create a new chat room.
        Request body example:
        {
            "name": "Team Chat",
            "description": "Optional description",
            "invited_usernames": ["alice", "bob"],
            "is_private": true
        }
        """
        serializer = RoomCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        room = serializer.save()
        return Response(RoomSerializer(room).data, status=status.HTTP_201_CREATED)


# -------------------------------
# 3. Room detail view
# -------------------------------
class RoomDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        """Get room details with members"""
        room = get_object_or_404(Room, id=room_id)
        if not room.memberships.filter(user=request.user).exists():
            return Response(
                {"detail": "Not a member of this room"}, status=status.HTTP_403_FORBIDDEN
            )

        members = User.objects.filter(room_memberships__room=room)
        return Response(
            {
                "id": str(room.id),
                "name": room.name,
                "description": room.description,
                "is_private": room.is_private,
                "created_by": room.created_by.username,
                "created_at": room.created_at,
                "updated_at": room.updated_at,
                "members": [
                    {"id": u.id, "username": u.username, "email": u.email}
                    for u in members
                ],
            }
        )


# -------------------------------
# 4. Fetch and send room messages
# -------------------------------
class RoomMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, room_id):
        """Fetch decrypted message history for a room"""
        room = get_object_or_404(Room, id=room_id)
        if not room.memberships.filter(user=request.user).exists():
            return Response(
                {"detail": "Not a member"}, status=status.HTTP_403_FORBIDDEN
            )

        # Get messages with pagination support
        limit = int(request.query_params.get("limit", 100))
        offset = int(request.query_params.get("offset", 0))

        msgs = Message.objects.filter(room=room).order_by("-created_at")[
            offset : offset + limit
        ]
        room_key = room.get_room_key()
        out = []
        for m in msgs:
            pt = decrypt_with_room_key(room_key, bytes(m.ciphertext), bytes(m.nonce))
            msg_data = {
                "id": str(m.id),
                "sender": m.sender.username if m.sender else None,
                "plaintext": pt.decode(),
                "created_at": m.created_at,
            }
            # Include file attachments if any
            if m.attachments.exists():
                msg_data["attachments"] = [
                    {
                        "id": str(att.id),
                        "file_url": request.build_absolute_uri(att.file.url),
                        "file_size": att.file_size,
                        "content_type": att.content_type,
                    }
                    for att in m.attachments.all()
                ]
            out.append(msg_data)

        return Response(out[::-1])  # Reverse to get chronological order

    def post(self, request, room_id):
        """Send a new message to the room"""
        room = get_object_or_404(Room, id=room_id)
        if not room.memberships.filter(user=request.user).exists():
            return Response(
                {"detail": "Not a member"}, status=status.HTTP_403_FORBIDDEN
            )

        plaintext = request.data.get("plaintext", "")
        if not plaintext:
            return Response(
                {"error": "Message plaintext is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Encrypt message
        room_key = room.get_room_key()
        ct, nonce = encrypt_with_room_key(room_key, plaintext.encode())

        # Create message
        msg = Message.objects.create(
            room=room, sender=request.user, ciphertext=ct, nonce=nonce
        )

        # Notify via channels
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(
                f"room_{room.id}",
                {
                    "type": "new.message",
                    "room_id": str(room.id),
                    "message_id": str(msg.id),
                },
            )

        return Response(
            {
                "id": str(msg.id),
                "sender": request.user.username,
                "plaintext": plaintext,
                "created_at": msg.created_at,
            },
            status=status.HTTP_201_CREATED,
        )


# -------------------------------
# 5. File upload endpoint
# -------------------------------
class FileUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, room_id):
        """
        Upload a file to a room message.
        Send as multipart/form-data with:
        - file: the file to upload
        - plaintext: optional message text
        """
        room = get_object_or_404(Room, id=room_id)
        if not room.memberships.filter(user=request.user).exists():
            return Response(
                {"detail": "Not a member"}, status=status.HTTP_403_FORBIDDEN
            )

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response(
                {"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        plaintext = request.data.get("plaintext", "")

        # Create message
        room_key = room.get_room_key()
        message_text = plaintext or f"Shared file: {uploaded_file.name}"
        ct, nonce = encrypt_with_room_key(room_key, message_text.encode())

        msg = Message.objects.create(
            room=room, sender=request.user, ciphertext=ct, nonce=nonce
        )

        # Encrypt filename and save file
        filename_ct, _ = encrypt_with_room_key(room_key, uploaded_file.name.encode())

        attachment = FileAttachment.objects.create(
            message=msg,
            file=uploaded_file,
            encrypted_filename=filename_ct,
            file_size=uploaded_file.size,
            content_type=uploaded_file.content_type or "application/octet-stream",
        )

        # Notify via channels
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(
                f"room_{room.id}",
                {
                    "type": "new.message",
                    "room_id": str(room.id),
                    "message_id": str(msg.id),
                },
            )

        return Response(
            {
                "id": str(msg.id),
                "sender": request.user.username,
                "plaintext": message_text,
                "attachments": [
                    {
                        "id": str(attachment.id),
                        "file_url": request.build_absolute_uri(attachment.file.url),
                        "file_size": attachment.file_size,
                        "content_type": attachment.content_type,
                    },
                ],
                "created_at": msg.created_at,
            },
            status=status.HTTP_201_CREATED,
        )

# -------------------------------
# 6. Get current user info
# -------------------------------
class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current authenticated user information"""
        user = request.user
        return Response(
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            }
        )