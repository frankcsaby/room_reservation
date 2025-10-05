# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated**: 2025-10-05
**Major Changes**:
- Complete UI redesign with Apple-style minimalist philosophy
- Dark mode implementation with theme persistence
- Real-time room monitoring with WebSocket integration
- Enhanced backend with new models and API endpoints
- Activity logging and analytics dashboard
- Automated management commands for production use

## Project Overview

University Room Reservation System (RRS) - a full-stack web application for managing room reservations at a university. Features a modern, minimalist design inspired by Apple's design philosophy, real-time room monitoring, dark mode support, and comprehensive analytics.

## Architecture

### Backend (Django)
- **Framework**: Django 4.2+ with Django REST Framework
- **Authentication**: JWT tokens via `djangorestframework-simplejwt`
- **Real-time**: Django Channels with Redis for WebSocket support (automatic broadcasting via signals)
- **Database**: PostgreSQL (configured for local db `room_reservation`)
- **Current State**: Fully integrated with database using Django ORM

#### Key Backend Files
- `backend/api/models.py` - Database models (Room, Reservation, UserProfile, ActivityLog, RecurringPattern)
- `backend/api/views.py` - REST API endpoints using Django ORM with caching
- `backend/api/serializers.py` - DRF serializers for request/response handling
- `backend/api/consumers.py` - WebSocket consumers (RoomConsumer, RoomsOverviewConsumer) with heartbeat
- `backend/api/signals.py` - Django signal handlers with activity logging
- `backend/api/apps.py` - App configuration that registers signal handlers
- `backend/api/routing.py` - WebSocket URL routing
- `backend/backend/settings.py` - Django configuration
- `backend/backend/asgi.py` - ASGI application with HTTP and WebSocket protocol routing
- `backend/populate_rooms.py` - Script to populate database with sample room data
- `backend/api/management/commands/` - Production-ready management commands

#### API Endpoints

##### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - JWT token authentication
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `GET /api/auth/me/` - Get current user

##### Room Management
- `GET /api/rooms/` - List all rooms
- `GET /api/rooms/{id}/` - Get room details
- `GET /api/rooms/status/` - Real-time occupancy for all rooms (cached 30s)
- `GET /api/rooms/{id}/availability/` - Detailed availability calendar
- `POST /api/rooms/{id}/favorite/` - Toggle room favorites

##### Reservations
- `GET /api/reservations/` - List reservations
- `POST /api/reservations/` - Create reservation
- `DELETE /api/reservations/{id}/` - Cancel reservation
- `POST /api/reservations/confirm/` - Confirm reservation
- `GET /api/reservations/upcoming/` - User's upcoming reservations with countdown

##### Analytics & Activity
- `GET /api/stats/dashboard/` - Dashboard statistics (cached 5min)
- `GET /api/activity/feed/` - Recent activity feed

##### User Profile
- `GET /api/profile/` - Get user profile with preferences
- `PATCH /api/profile/` - Update user preferences

##### WebSocket Endpoints
- `ws://localhost:8000/ws/rooms/{room_id}/` - Room-specific updates
- `ws://localhost:8000/ws/rooms/overview/` - All rooms monitoring

### Frontend (React + Vite)
- **Framework**: React 18 with React Router
- **Build Tool**: Vite 7
- **Styling**: Tailwind CSS with custom Apple-inspired design system
- **Icons**: lucide-react
- **State Management**: Context API (ThemeContext) + Local state
- **Authentication**: JWT tokens stored in localStorage
- **Real-time**: WebSocket hooks for live updates
- **Theme**: Dark/Light mode with system preference detection

#### Key Frontend Files

##### Core Components
- `frontend/src/App.jsx` - Root component with authentication flow and ThemeProvider
- `frontend/src/components/MainAppEnhanced.jsx` - Main application with real-time features
- `frontend/src/components/LoginPage.jsx` - Minimalist login with gradient background
- `frontend/src/components/RegisterPage.jsx` - Matching registration page
- `frontend/src/components/RoomMonitor.jsx` - Live room monitoring dashboard

##### UI Components
- `frontend/src/components/ui/Button.jsx` - Reusable button with variants
- `frontend/src/components/ui/Card.jsx` - Card wrapper with hover effects
- `frontend/src/components/ui/Input.jsx` - Styled input with label/error states
- `frontend/src/components/ui/ThemeToggle.jsx` - Animated dark mode toggle

##### Real-time Components
- `frontend/src/components/RoomStatusBadge.jsx` - Live occupancy indicator
- `frontend/src/components/NotificationToast.jsx` - Toast notification system
- `frontend/src/hooks/useWebSocket.js` - Custom WebSocket hook with reconnection

##### Context & Themes
- `frontend/src/contexts/ThemeContext.jsx` - Global theme management
- `frontend/src/index.css` - Global styles with transitions
- `frontend/tailwind.config.js` - Extended Tailwind configuration

## Design System

### Apple-Style Minimalism
- **Color Palette**:
  - Light: White backgrounds, subtle grays, blue-500 accents
  - Dark: Gray-950 backgrounds, gray-800 surfaces, blue-400 accents
- **Typography**: System font stack with SF Pro Display priority
- **Spacing**: Consistent scale (4, 8, 12, 16, 24, 32, 48px)
- **Border Radius**: 12-16px for modern look
- **Shadows**: Multiple layers for depth (apple, apple-lg, apple-xl)
- **Animations**: 200ms ease-out transitions throughout

### Component Variants
- **Buttons**: primary, secondary, danger, ghost (3 sizes: sm, md, lg)
- **Cards**: Optional hover effects with scale transitions
- **Status Badges**: Color-coded (green=free, yellow=ending, red=occupied)
- **Inputs**: Consistent styling with focus rings

## Development Commands

### Backend
```bash
cd backend

# Create virtual environment (if not exists)
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Database setup (PostgreSQL)
# First, ensure PostgreSQL is configured for md5 authentication:
# Edit /etc/postgresql/16/main/pg_hba.conf and change:
#   local   all   postgres   peer
# To:
#   local   all   postgres   md5
# Then restart: sudo systemctl restart postgresql

# Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '1228';"

# Create database
sudo -u postgres createdb room_reservation

# Import database structure
cd /mnt/c/Users/levente.bodo/Desktop/code/egyetem/rrs
sudo -u postgres psql -d room_reservation -f database.sql

# Run Django migrations
cd backend
python manage.py migrate

# Create UserProfiles for existing users
python manage.py shell -c "
from django.contrib.auth.models import User
from api.models import UserProfile
for user in User.objects.all():
    UserProfile.objects.get_or_create(user=user)
"

# Create superuser (optional)
python manage.py createsuperuser

# Populate database with sample room data
python populate_rooms.py

# Run development server
python manage.py runserver

# Management Commands (Production)
python manage.py auto_cancel_pending --minutes=15        # Auto-cancel unconfirmed
python manage.py send_reservation_reminders --minutes=10  # Send reminders
python manage.py clean_old_reservations --days=90        # Clean old data
```

### Frontend
```bash
cd frontend

# Install Node.js 22+ (required for latest packages)
# Using nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 22
nvm use 22

# Install dependencies
npm install

# Run development server (default: http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Services Required
- **PostgreSQL**: Database server on localhost:5432
  - Database name: `room_reservation`
  - User: `postgres`
  - Password: `1228`
  - Authentication: md5 authentication
- **Redis**: Optional for Django Channels WebSocket broadcasting (localhost:6379)
  - Not required for basic functionality
  - Signal handlers gracefully handle Redis unavailability

## Database Models

### Core Models
1. **Room**
   - Basic info: name, building, floor, capacity
   - amenities (JSONB), room_image_url, is_active
   - Methods: get_current_occupancy_status()

2. **Reservation**
   - Links: user, room, recurring_pattern
   - Time: date, start_time, end_time
   - Details: purpose, attendees, capacity_used
   - Status: pending/confirmed/cancelled
   - Tracking: created_at, updated_at, reminder_sent

3. **UserProfile**
   - Theme: light/dark/auto
   - Preferences: email_reminders, notifications_enabled
   - Favorites: ManyToMany to Room

4. **ActivityLog**
   - Tracks all reservation and favorite actions
   - Human-readable descriptions with timestamps
   - Methods: time_ago() for relative times

5. **RecurringPattern**
   - Frequency: daily/weekly/biweekly/monthly
   - Date range and time slots
   - Links to generated reservations

## Real-time Features

### WebSocket Implementation
- **useWebSocket Hook**: Auto-reconnection, status tracking, message callbacks
- **RoomConsumer**: Heartbeat (30s), initial status, occupancy calculations
- **RoomsOverviewConsumer**: System-wide monitoring, heartbeat (60s)
- **Signal Broadcasting**: Dual-channel (room-specific + overview)

### Live Updates
- **Occupancy Status**: Real-time free/occupied/ending_soon indicators
- **Notifications**: Toast alerts for room availability changes
- **Activity Feed**: Live updates of all system actions
- **Connection Status**: Visual indicators with auto-reconnection

### Performance Optimizations
- **Backend Caching**: Room status (30s), Dashboard stats (5min)
- **Database Indexes**: Optimized queries for common operations
- **Frontend Optimization**: React.memo, useMemo, useCallback usage
- **WebSocket Efficiency**: Single overview connection for monitoring

## Production Checklist

### Initial Setup
- [ ] Apply all database migrations
- [ ] Create UserProfiles for existing users
- [ ] Configure email settings for reminders
- [ ] Set up Redis for WebSocket support
- [ ] Configure environment variables

### Automation
- [ ] Set up cron jobs for management commands:
  ```
  */5 * * * * python manage.py auto_cancel_pending
  * * * * * python manage.py send_reservation_reminders
  0 2 * * 0 python manage.py clean_old_reservations --days=90
  ```

### Testing
- [ ] Test all API endpoints with authentication
- [ ] Verify WebSocket connections and broadcasts
- [ ] Check dark mode persistence across sessions
- [ ] Test responsive design on mobile devices
- [ ] Verify email reminders (if configured)

### Security
- [ ] Move SECRET_KEY to environment variable
- [ ] Configure proper CORS settings for production
- [ ] Set DEBUG=False in production
- [ ] Review and restrict API permissions
- [ ] Enable HTTPS for production deployment

## Environment Variables
Create a `.env` file in the backend directory:
```
DEBUG=1
SECRET_KEY=your-secret-key-here
REDIS_URL=redis://127.0.0.1:6379
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

## Key Improvements in This Version

### Frontend Enhancements
- ✅ Complete Apple-style minimalist redesign
- ✅ Dark mode with theme persistence and system detection
- ✅ Reusable component library (Button, Card, Input, ThemeToggle)
- ✅ Smooth animations and micro-interactions
- ✅ Glassmorphism effects and gradient backgrounds
- ✅ Real-time WebSocket integration with auto-reconnection
- ✅ Toast notification system
- ✅ Live room monitoring dashboard

### Backend Enhancements
- ✅ 8 new API endpoints for analytics and real-time features
- ✅ 3 new models (UserProfile, ActivityLog, RecurringPattern)
- ✅ Enhanced WebSocket consumers with heartbeat
- ✅ Comprehensive activity logging
- ✅ Redis caching for performance
- ✅ Production-ready management commands
- ✅ Database indexes for optimization
- ✅ Graceful Redis error handling

### Developer Experience
- ✅ Comprehensive documentation
- ✅ Clear separation of concerns
- ✅ Consistent code style
- ✅ Production-ready configuration
- ✅ Automated tasks via management commands
- ✅ Performance optimizations throughout

## Support & Troubleshooting

### Common Issues

1. **Redis Connection Errors**
   - The app works without Redis but WebSocket features will be limited
   - Install and start Redis: `sudo apt install redis-server && redis-server`

2. **PostgreSQL Authentication**
   - Ensure pg_hba.conf uses md5 authentication
   - Restart PostgreSQL after configuration changes

3. **Node.js Version**
   - Frontend requires Node.js 20+ (preferably 22)
   - Use nvm to manage Node versions

4. **Dark Mode Not Persisting**
   - Check localStorage in browser DevTools
   - Clear cache if theme appears stuck

5. **WebSocket Not Connecting**
   - Ensure backend is running on port 8000
   - Check browser console for connection errors
   - Verify Redis is running (optional but recommended)

### Performance Tips
- Enable Redis for optimal WebSocket performance
- Use production builds for deployment
- Configure proper database indexes
- Implement CDN for static assets
- Use nginx for reverse proxy in production