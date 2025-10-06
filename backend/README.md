Django backend for Room Reservation (DRF + Channels)

How to run (development):

1. Create virtualenv and install requirements
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt

2. Copy .env.example to .env and set credentials (EMAIL_*, DJANGO_SECRET_KEY)

3. Run Redis (required for Channels). You can use Docker:
   docker run -p 6379:6379 -d redis:7

4. Run migrations and create superuser:
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser

5. Run server with Daphne (ASGI with Channels):
   pip install daphne
   daphne -b 0.0.0.0 -p 8000 backend.asgi:application

   Or for quick dev (without websockets) run:
   python manage.py runserver

API base: http://localhost:8000/api/

Auth: Uses JWT (Simple JWT)
Register: POST /api/auth/register/
Login: POST /api/auth/login/  -> returns access, refresh
Current user: GET /api/auth/me/  (requires Bearer token)

Reservations: POST /api/reservations/ (requires auth)
Rooms: GET /api/rooms/

WebSockets: ws://localhost:8000/ws/rooms/<room_id>/
