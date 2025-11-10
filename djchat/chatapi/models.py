# Create your models here.
import os
import uuid
from django.conf import settings
from django.db import models
from django.contrib.auth import get_user_model
from cryptography.fernet import Fernet, InvalidToken

User = get_user_model()


def _master_fernet():
    # SERVER_MASTER_KEY must be a urlsafe_base64-encoded 32-byte key
    key = settings.SERVER_MASTER_KEY
    if not key:
        raise RuntimeError("SERVER_MASTER_KEY not set")
    # Ensure key is bytes
    if isinstance(key, str):
        key = key.encode('utf-8')
    return Fernet(key)


def gen_room_key_bytes():
    return os.urandom(32)  # 32 bytes symmetric key


class Room(models.Model):
    id = models.UUIDField(primary_key=True, editable=False, default=None)
    name = models.CharField(max_length=200, blank=True)
    is_private = models.BooleanField(default=True)  # private / public rooms
    created_by = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="created_rooms"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    description = models.TextField(blank=True, null=True)

    # encrypted_room_key stores the room symmetric key encrypted with server master key
    encrypted_room_key = models.BinaryField(null=False)

    @classmethod
    def create_with_key(cls, **kwargs):
        # generate room key, encrypt and store
        room_key = gen_room_key_bytes()
        f = _master_fernet()
        encrypted = f.encrypt(room_key)
        if "id" not in kwargs:
            kwargs["id"] = uuid.uuid4()
        room = cls(encrypted_room_key=encrypted, **kwargs)
        room.save()
        return room

    def get_room_key(self):
        f = _master_fernet()
        try:
            room_key = f.decrypt(bytes(self.encrypted_room_key))
        except InvalidToken:
            raise RuntimeError("Failed to decrypt room key")
        return room_key  # raw bytes


class Membership(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="room_memberships"
    )
    invited_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("room", "user")


class Message(models.Model):
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    ciphertext = models.BinaryField()  # encrypted message bytes
    nonce = models.BinaryField(null=True, blank=True)  # if using AES-GCM with nonce
    created_at = models.DateTimeField(auto_now_add=True)
    # add delivered/read booleans as needed


class FileAttachment(models.Model):
    id = models.UUIDField(primary_key=True, editable=False, default=uuid.uuid4)
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="chat_files/%Y/%m/%d/")
    encrypted_filename = models.BinaryField()  # encrypted original filename
    file_size = models.BigIntegerField()  # in bytes
    content_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def get_original_filename(self, room_key: bytes) -> str:
        """Decrypt and return the original filename"""
        from .crypto import decrypt_with_room_key

        # For filename, we'll use a static nonce (not ideal but simple)
        # In production, store nonce separately
        nonce = b"0" * 12  # placeholder
        return decrypt_with_room_key(
            room_key, bytes(self.encrypted_filename), nonce
        ).decode()
