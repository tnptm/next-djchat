#!/usr/bin/env python
"""
Test WebSocket notification system
Run this to verify that messages trigger WebSocket events
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'djchat.settings')
django.setup()

from django.contrib.auth import get_user_model
from chatapi.models import Room, Membership
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

User = get_user_model()

def test_channel_layer():
    """Test if channel layer is configured and working"""
    print("=" * 60)
    print("Testing Django Channels Configuration")
    print("=" * 60)
    
    channel_layer = get_channel_layer()
    
    if channel_layer is None:
        print("❌ FAILED: Channel layer is not configured!")
        print("\nCheck your CHANNEL_LAYERS setting in settings.py")
        return False
    
    print(f"✓ Channel layer found: {type(channel_layer).__name__}")
    print(f"✓ Backend: {channel_layer.__class__.__module__}")
    
    # Test sending a message
    try:
        test_group = "test_room_123"
        test_data = {
            "type": "test.message",
            "content": "Hello from test!"
        }
        
        print(f"\n📤 Testing group_send to '{test_group}'...")
        async_to_sync(channel_layer.group_send)(test_group, test_data)
        print("✓ group_send executed successfully!")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Error sending to channel layer")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_room_notification():
    """Test creating a message and sending notification"""
    print("\n" + "=" * 60)
    print("Testing Room Message Notification")
    print("=" * 60)
    
    # Get or create a test user
    user, _ = User.objects.get_or_create(
        username='testuser',
        defaults={'email': 'test@example.com'}
    )
    
    # Get or create a test room
    room = Room.objects.filter(created_by=user).first()
    if not room:
        print("Creating test room...")
        room = Room.create_with_key(
            name='Test Room',
            description='Testing notifications',
            is_private=True,
            created_by=user
        )
        Membership.objects.get_or_create(
            room=room, 
            user=user,
            defaults={'invited_by': user}
        )
    
    print(f"✓ Using room: {room.name} (ID: {room.id})")
    
    # Simulate sending a notification
    channel_layer = get_channel_layer()
    if channel_layer is None:
        print("❌ Cannot test - channel layer not configured")
        return False
    
    try:
        group_name = f"room_{room.id}"
        notification = {
            "type": "new.message",
            "room_id": str(room.id),
            "message_id": "test-message-123",
        }
        
        print(f"\n📤 Sending notification to group '{group_name}'...")
        print(f"   Data: {notification}")
        
        async_to_sync(channel_layer.group_send)(group_name, notification)
        
        print("✓ Notification sent successfully!")
        print("\n💡 If a WebSocket client is subscribed to this room,")
        print("   they should receive the notification now.")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Error sending notification")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n🔍 Django Channels & WebSocket Test\n")
    
    # Test 1: Channel layer
    if not test_channel_layer():
        print("\n❌ Channel layer test failed. Fix configuration before proceeding.")
        sys.exit(1)
    
    # Test 2: Room notification
    if not test_room_notification():
        print("\n❌ Room notification test failed.")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    print("✅ All tests passed!")
    print("=" * 60)
    print("\n📝 Next steps:")
    print("1. Make sure Redis/Valkey is running")
    print("2. Start Daphne ASGI server: daphne djchat.asgi:application")
    print("3. Connect WebSocket client from browser")
    print("4. Send a message via API and watch for WebSocket notification")
    print()

if __name__ == "__main__":
    main()
