"""
ASGI config for djchat project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "djchat.settings")

# Get the Django ASGI application (for HTTP)
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from chatapi.routing import websocket_urlpatterns

# Define the ASGI application
application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,  # Handles normal HTTP requests
        "websocket": AuthMiddlewareStack(  # Handles WebSocket connections
            URLRouter(websocket_urlpatterns)
        ),
    }
)
