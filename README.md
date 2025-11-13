# NEXT DjChat - Encrypted Real-time Chat API

A secure, real-time chat application built with Django REST Framework and Django Channels, featuring end-to-end encryption for messages and WebSocket support for live messaging.

This is a working demo project, which doesn't still have all the production level features available. However I'm looking for new working possibilities and this can be a small example
of my side projects to show my skills.

## Features

- 🔐 **Server Encryption**: Messages are encrypted using AES-GCM with room-specific keys
- 🔑 **JWT Authentication**: Secure token-based authentication with SimpleJWT
- 🌐 **Real-time Communication**: WebSocket support via Django Channels and Redis
- 👥 **Room Management**: Create private/public chat rooms with membership control
- 📨 **Message History**: Persistent encrypted message storage with decryption on demand
- 🔒 **Server-side Key Management**: Room encryption keys secured with server master key
- **File Sharing** : users can send files to each others inside concersations, images, office documents etc.

## Technology Stack

- **Django 5.2.8** - Web framework
- **Django REST Framework 3.16.1** - REST API toolkit
- **Django Channels 4.3.1** - WebSocket and async support
- **Channels Redis 4.3.0** - Channel layer backend
- **Daphne** - ASGI server
- **Cryptography 46.0.3** - Encryption/decryption utilities
- **SimpleJWT 5.5.1** - JWT authentication
- **Redis** - Message broker and channel layer
- **SQLite** - Database (development)

## Frontend (Next.js / React)

A simple Next.js frontend is included at `front/nextchat`. It provides a demo chat UI, WebSocket client, and file-upload UI that integrates with the Django API.

Quick notes

- Location: `front/nextchat`
- Framework: Next.js (React + TypeScript)
- Purpose: demo UI (login/register, room list, chat, file upload), connects to the Django API and WebSocket endpoints

Development

1. Install and run the dev server:

```bash
cd front/nextchat
npm install
npm run dev
```

2. Environment variables

- Create `front/nextchat/.env.local` for local development. Use `NEXT_PUBLIC_` prefix for variables that must be available in the browser.

Example `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/rooms/
```

- Restart the Next dev server after changing env files.

Production build

```bash
cd front/nextchat
npm run build
npm run start
```

Notes

- `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` are injected at build time; for production make sure the build environment has correct values (or use a runtime config approach).
- Use `wss://` and `https://` for production API and sockets. Ensure reverse-proxy / load-balancer passes the correct headers.
- See `front/nextchat/WEBSOCKET_USAGE.md` for WebSocket connection details.

Frontend structure highlights

- Main chat UI: `front/nextchat/app/components/ChatMain.tsx`
- Message sender and uploads: `front/nextchat/app/components/chat/ChatMessageSender.tsx` and `ChatFileUpload.tsx`
- Contexts: `front/nextchat/app/context/AuthContext.tsx` and `WebSocketContext.tsx`


## Architecture

### Security Model

1. **Server Master Key**: A Fernet key used to encrypt/decrypt room-specific encryption keys
2. **Room Keys**: Each chat room has a unique AES-256 key, stored encrypted in the database
3. **Message Encryption**: Messages are encrypted with AES-GCM using the room's key + nonce

### Models

- **Room**: Chat room with encrypted key storage, creator info, and privacy settings
- **Membership**: User-room relationship tracking invited users and join timestamps
- **Message**: Encrypted message storage with ciphertext, nonce, and metadata

### API Endpoints

#### Authentication
- `POST /api/register/` - Register new user
- `POST /api/token/` - Obtain JWT token pair (access + refresh)
- `POST /api/token/refresh/` - Refresh access token

#### Chat Rooms
- `GET /api/rooms/` - List all rooms where the user is a member
- `POST /api/rooms/` - Create new chat room with invited participants
- `GET /api/rooms/<uuid:room_id>/` - Get room details with member list

#### Messages
- `GET /api/rooms/<uuid:room_id>/messages/` - Fetch decrypted message history for a room (with pagination)
- `POST /api/rooms/<uuid:room_id>/messages/` - Send a new message to the room

#### File Sharing
- `POST /api/rooms/<uuid:room_id>/upload/` - Upload a file to a room (with optional message text)

### WebSocket

- `ws://localhost:8000/ws/rooms/?token=<JWT_TOKEN>` - Real-time message notifications

WebSocket clients authenticate using JWT token in query string and can:
- Subscribe to room updates: `{"action": "subscribe", "room_id": "..."}`
- Unsubscribe from rooms: `{"action": "unsubscribe", "room_id": "..."}`
- Receive notifications: `{"type": "new_message", "room_id": "...", "message_id": "..."}`

## Installation

### Prerequisites

- Python 3.13+
- Redis server running on `localhost:6379`
- `uv` package manager (or pip)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd djchat
   ```

2. **Install dependencies**
   ```bash
   uv sync
   # or with pip:
   # pip install -r pyproject.toml
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `djchat/djchat/` directory:
   ```bash
   SECRET_KEY=your-django-secret-key
   SERVER_MASTER_KEY=your-base64-fernet-key
   ```

   **Generate a valid Fernet key for `SERVER_MASTER_KEY`:**
   
   The SERVER_MASTER_KEY must be a valid 32-byte URL-safe base64-encoded key (44 characters with padding).
   
   Generate it using Python:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
   
   Example output: `jEHj820u-x2lQjMEbO63meSCnEFpYOICOU_FLKDIDgI=`
   
   ⚠️ **Important**: The key must include the `=` padding at the end and be exactly 44 characters long.

4. **Run migrations**
   ```bash
   cd djchat
   python manage.py migrate
   ```

5. **Create superuser (optional)**
   ```bash
   python manage.py createsuperuser
   ```

6. **Start Redis**
   ```bash
   redis-server
   ```

7. **Run the development server**
   ```bash
   python manage.py runserver
   # or with Daphne for ASGI:
   daphne -b 0.0.0.0 -p 8000 djchat.asgi:application
   ```

## Usage Examples

### 1. Register a User

```bash
curl -X POST http://localhost:8000/api/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@example.com",
    "password": "securepass123"
  }'
```

### 2. Obtain JWT Token

```bash
curl -X POST http://localhost:8000/api/token/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "securepass123"
  }'
```

Response:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### 3. List User's Rooms

```bash
curl -X GET http://localhost:8000/api/rooms/ \
  -H "Authorization: Bearer <access_token>"
```

### 4. Create a Chat Room

```bash
curl -X POST http://localhost:8000/api/rooms/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "name": "Team Chat",
    "description": "Our team discussion",
    "invited_usernames": ["bob", "charlie"],
    "is_private": true
  }'
```

### 5. Get Room Details

```bash
curl -X GET http://localhost:8000/api/rooms/<room_uuid>/ \
  -H "Authorization: Bearer <access_token>"
```

### 6. Send a Message

```bash
curl -X POST http://localhost:8000/api/rooms/<room_uuid>/messages/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "plaintext": "Hello team!"
  }'
```

### 7. Fetch Room Messages

```bash
curl -X GET "http://localhost:8000/api/rooms/<room_uuid>/messages/?limit=50&offset=0" \
  -H "Authorization: Bearer <access_token>"
```

Response:
```json
[
  {
    "id": "message-uuid",
    "sender": "alice",
    "plaintext": "Hello team!",
    "created_at": "2025-11-09T12:34:56Z"
  }
]
```

### 8. Upload a File

```bash
curl -X POST http://localhost:8000/api/rooms/<room_uuid>/upload/ \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@/path/to/document.pdf" \
  -F "plaintext=Check out this document"
```

Response:
```json
{
  "id": "message-uuid",
  "sender": "alice",
  "plaintext": "Check out this document",
  "attachment": {
    "id": "attachment-uuid",
    "file_url": "http://localhost:8000/media/chat_files/2025/11/09/document.pdf",
    "file_size": 102400,
    "content_type": "application/pdf"
  },
  "created_at": "2025-11-09T12:34:56Z"
}
```

### 9. WebSocket Connection (JavaScript)

```javascript
const token = "your-jwt-access-token";
const ws = new WebSocket(`ws://localhost:8000/ws/rooms/?token=${token}`);

ws.onopen = () => {
  // Subscribe to room updates
  ws.send(JSON.stringify({
    action: "subscribe",
    room_id: "room-uuid"
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("New message in room:", data.room_id);
  // Fetch new messages via REST API
};
```

## Project Structure

```
djchat/
├── djchat/                     # Django project
│   ├── chatapi/                # Chat API application
│   │   ├── models.py           # Room, Membership, Message models
│   │   ├── views.py            # REST API views
│   │   ├── serializers.py      # DRF serializers
│   │   ├── consumers.py        # WebSocket consumers
│   │   ├── crypto.py           # Encryption/decryption utilities
│   │   ├── routing.py          # WebSocket URL routing
│   │   └── urls.py             # REST API URLs
│   ├── djchat/                 # Project settings
│   │   ├── settings.py         # Django settings
│   │   ├── asgi.py             # ASGI configuration
│   │   ├── urls.py             # Main URL configuration
│   │   └── wsgi.py             # WSGI configuration
│   ├── manage.py               # Django management script
│   └── db.sqlite3              # SQLite database
├── front/                      # Frontend directory (TBD)
├── pyproject.toml              # Project dependencies
└── README.md                   # This file
```

## Security Considerations

⚠️ **Important**: This is a development setup. For production:

1. **Change `DEBUG = False`** in settings.py
2. **Use a production database** (PostgreSQL, MySQL)
3. **Secure Redis** with authentication and firewall rules
4. **Use HTTPS/WSS** for all connections
5. **Rotate keys regularly** and store them securely (e.g., AWS Secrets Manager)
6. **Implement rate limiting** on API endpoints
7. **Add proper CORS headers** for frontend integration
8. **Use environment-specific configuration** (dev/staging/prod)

## API Response Format

All API responses follow standard REST conventions:

**Success Response** (2xx):
```json
{
  "data": {...}
}
```

**Error Response** (4xx/5xx):
```json
{
  "error": "Error message",
  "detail": "Detailed explanation"
}
```

## Development

### Running Tests

```bash
cd djchat
python manage.py test chatapi
```

### Making Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### Creating an Admin User

```bash
python manage.py createsuperuser
```

Access admin panel at: http://localhost:8000/admin/

## Troubleshooting

### Redis Connection Error
Ensure Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### JWT Token Errors
Tokens expire after a set time. Use the refresh endpoint to obtain a new access token:
```bash
curl -X POST http://localhost:8000/api/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "your-refresh-token"}'
```

### WebSocket Connection Fails
- Check that Daphne is running (not just `runserver`)
- Verify JWT token is valid and included in query string
- Check Redis is accessible

## Future Enhancements

- [ ] Frontend application (NextJs/React)
- [ ] File/image sharing with encryption
- [ ] User presence indicators
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Push notifications
- [ ] Group chat management (add/remove members)
- [ ] Message search functionality
- [ ] Message deletion/editing
- [ ] User profiles and avatars

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Contact

For questions or support, please open an issue on the repository.

---

**Note**: This application implements server-side encryption. For true end-to-end encryption where the server cannot decrypt messages, implement client-side encryption where clients exchange keys directly.
