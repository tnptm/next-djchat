from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Room, Membership, Message, User
from django.db import transaction
# from django.core.exceptions import ObjectDoesNotExist
# from django.contrib.auth.models import Permission, Group

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("username", "password", "email")

    def create(self, validated):
        u = User.objects.create_user(
            username=validated["username"], email=validated.get("email")
        )
        u.set_password(validated["password"])
        u.save()
        return u


class RoomCreateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=True)
    invited_usernames = serializers.ListField(
        child=serializers.CharField(), allow_empty=True
    )
    is_private = serializers.BooleanField(default=True)

    def create(self, validated):
        request = self.context["request"]
        username_list = validated.get("invited_usernames", [])
        with transaction.atomic():
            room = Room.create_with_key(
                name=validated.get("name", ""),
                is_private=validated.get("is_private", True),
                created_by=request.user,
            )
            # add creator membership
            Membership.objects.create(
                room=room, user=request.user, invited_by=request.user
            )
            # invite users by username — only add if exist
            for uname in username_list:
                try:
                    u = User.objects.get(username=uname)
                    # avoid double adding creator
                    if u != request.user:
                        Membership.objects.create(
                            room=room, user=u, invited_by=request.user
                        )
                except User.DoesNotExist:
                    # skip or collect errors; here we skip
                    continue
        return room


class MessageSerializer(serializers.ModelSerializer):
    plaintext = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Message
        fields = (
            "id",
            "room",
            "sender",
            "ciphertext",
            "nonce",
            "created_at",
            "plaintext",
        )
        read_only_fields = ("ciphertext", "nonce", "sender", "created_at")

    def create(self, validated):
        request = self.context["request"]
        room = validated["room"]
        if not room.memberships.filter(user=request.user).exists():
            raise serializers.ValidationError("Not a member")
        # plaintext comes in request.data['plaintext'] - server will encrypt it
        plaintext = self.context["request"].data.get("plaintext", "").encode()
        room_key = room.get_room_key()
        from .crypto import encrypt_with_room_key

        ct, nonce = encrypt_with_room_key(room_key, plaintext)
        msg = Message.objects.create(
            room=room, sender=request.user, ciphertext=ct, nonce=nonce
        )
        # notify via channels (we'll implement consumer)
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"room_{room.id}",
            {
                "type": "new.message",
                "room_id": str(room.id),
                "message_id": str(msg.id),
            },
        )
        return msg


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "date_joined",
        )
        read_only_fields = ("date_joined",)


class MembershipSerializer(serializers.ModelSerializer):
    """Serializer for membership with user details."""
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    invited_by_username = serializers.CharField(
        source="invited_by.username", read_only=True, allow_null=True
    )

    class Meta:
        model = Membership
        fields = (
            "user_id",
            "username",
            "email",
            "invited_by_username",
            "joined_at",
        )
        read_only_fields = ("user_id", "username", "email", "invited_by_username", "joined_at")


class RoomSerializer(serializers.ModelSerializer):
    """Serializer for Room with memberships and usernames."""
    memberships = MembershipSerializer(many=True, read_only=True)
    created_by_username = serializers.CharField(
        source="created_by.username", read_only=True
    )
    member_count = serializers.SerializerMethodField()
    member_usernames = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = (
            "id",
            "name",
            "description",
            "is_private",
            "created_by_username",
            "created_at",
            "updated_at",
            "member_count",
            "member_usernames",
            "memberships",
        )
        read_only_fields = ("created_at", "updated_at", "created_by_username")

    def get_member_count(self, obj):
        """Return the total number of members in the room."""
        return obj.memberships.count()

    def get_member_usernames(self, obj):
        """Return a list of all member usernames for quick access."""
        return list(obj.memberships.values_list("user__username", flat=True))
