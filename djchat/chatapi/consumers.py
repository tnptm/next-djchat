from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken
from django.contrib.auth import get_user_model
from jwt import decode as jwt_decode
from django.conf import settings

User = get_user_model()


# Clients should pass JWT token as querystring ?token=...
class RoomConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # simple JWT token from querystring
        query = self.scope["query_string"].decode()
        token = None
        for part in query.split("&"):
            if part.startswith("token="):
                token = part.split("=", 1)[1]
        if not token:
            await self.close()
            return
        try:
            # validate token (simple)
            UntypedToken(token)
            # decode to get user id
            decoded = jwt_decode(
                token,
                settings.SIMPLE_JWT["SIGNING_KEY"],
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
            self.user = await database_sync_to_async(User.objects.get)(
                id=decoded["user_id"]
            )
        except Exception:
            await self.close()
            return
        await self.accept()
        # now client sends subscribe messages for room ids

    async def receive_json(self, content):
        action = content.get("action")
        if action == "subscribe":
            room_id = content.get("room_id")
            await self.channel_layer.group_add(f"room_{room_id}", self.channel_name)
        elif action == "unsubscribe":
            room_id = content.get("room_id")
            await self.channel_layer.group_discard(f"room_{room_id}", self.channel_name)

    async def new_message(self, event):
        # forward minimal payload
        await self.send_json(
            {
                "type": "new_message",
                "room_id": event["room_id"],
                "message_id": event["message_id"],
            }
        )
