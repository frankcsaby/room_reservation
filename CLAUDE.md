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
- Comprehensive analysis of improvements needed

## Project Overview

University Room Reservation System (RRS) - a full-stack web application for managing room reservations at a university. Features a modern, minimalist design inspired by Apple's design philosophy, real-time room monitoring, dark mode support, and comprehensive analytics.

## Current State Assessment

### Strengths
- **Overbuilt Backend**: Many features already implemented but not exposed in UI
- **Real-time Infrastructure**: WebSocket support with Django Channels
- **Modern Stack**: React 18, Django 5.2, PostgreSQL, Redis
- **Design System**: Apple-style components with dark mode
- **Database Models**: Comprehensive models including UserProfile, ActivityLog, RecurringPattern

### Critical Issues (Fix Immediately)
1. **Security Vulnerabilities**:
   - Hardcoded SECRET_KEY and database password in settings.py
   - CORS allows ALL origins (`CORS_ALLOW_ALL_ORIGINS = True`)
   - Public access to critical endpoints (reservation confirm, activity feed)
   - WebSocket connections lack JWT validation
   - JWT tokens stored in localStorage (vulnerable to XSS)

2. **Performance Bottlenecks**:
   - N+1 queries in room status endpoint (50+ queries for 50 rooms)
   - No pagination on list endpoints (loads ALL data)
   - Missing database indexes for common queries
   - No database connection pooling
   - WebSocket heartbeat causes excessive queries

3. **Code Quality Issues**:
   - Zero test coverage
   - Code duplication (room status calculation in 3 places)
   - 702-line monolithic component (MainAppEnhanced.jsx)
   - No API documentation
   - No CI/CD pipeline

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
- `frontend/src/components/MainAppEnhanced.jsx` - Main application with real-time features (702 lines - needs refactoring)
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

## Development Roadmap (56 Tasks)

### Priority 1: Quick Wins - Leverage Existing Backend APIs
1. Add Dashboard Analytics View using existing `/api/stats/dashboard/`
2. Implement Favorite Rooms UI with star toggle
3. Create Activity Feed display component
4. Build Calendar View for room availability
5. Create User Profile Settings page
6. Add advanced search filters for amenities

### Priority 2: High-Value New Features
7. Implement recurring reservations UI (backend model exists)
8. Add QR code check-in system
9. Create email notification preferences UI
10. Build Admin Dashboard for analytics
11. Implement Room Management UI for admins
12. Add PWA capabilities for mobile

### Priority 3: Performance Optimizations
13. Fix N+1 queries in room status endpoint
14. Add pagination to all list endpoints
15. Implement database connection pooling
16. Optimize WebSocket heartbeat with caching
17. Add missing database indexes
18. Reduce API response sizes with lightweight serializers

### Priority 4: Code Quality & Architecture
19. Split MainAppEnhanced into smaller components
20. Extract service layer for business logic
21. Remove code duplication in room status calculation
22. Implement state management with Zustand
23. Add loading states and skeleton screens
24. Enhance error messages and validation feedback
25. Create custom confirmation dialogs
26. Optimize mobile responsive design
27. Add keyboard shortcuts for power users
28. Implement onboarding tour for new users
29. Create export functionality for iCal and PDF
30. Build waitlist system for fully booked rooms
31. Add room recommendation system
32. Implement maintenance scheduling for admins

### Priority 5: Testing & DevOps
33. Write comprehensive unit tests (80% coverage)
34. Add integration tests for API endpoints
35. Create frontend component tests
36. Set up API documentation with Swagger
37. Configure CI/CD pipeline with GitHub Actions
38. Add pre-commit hooks for code quality
39. Set up linting for Python and JavaScript
40. Implement code formatting with Black and Prettier
41. Add performance monitoring with Django Silk
42. Configure proper Redis caching strategy
43. Implement background job processing with Celery
44. Add bundle size optimization for frontend
45. Implement code splitting and lazy loading

### Priority 6: Security Enhancements
46. Move hardcoded secrets to environment variables
47. Fix CORS configuration to specific origins
48. Add authentication to public endpoints
49. Implement WebSocket JWT authentication
50. Add rate limiting to prevent API abuse
51. Configure security headers (HSTS, CSP, etc.)
52. Strengthen password validation policies
53. Move JWT tokens to HttpOnly cookies
54. Add comprehensive input validation and sanitization
55. Implement security audit logging
56. Add account lockout mechanism

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
- **Connection Status**: Visual indicators with auto-reconnection ("Offline" shows when Redis not running)

## Performance Metrics

### Current Performance
- **Concurrent Users**: ~50 max
- **DB Queries/Request**: 100-200
- **Response Time (p95)**: 2-5 seconds
- **Bundle Size**: ~800KB
- **Cache Hit Rate**: ~30%

### Target Performance (After Optimizations)
- **Concurrent Users**: 5,000+
- **DB Queries/Request**: <10
- **Response Time (p95)**: <200ms
- **Bundle Size**: <300KB
- **Cache Hit Rate**: >85%

## Known Issues & Solutions

### Issue: "Offline" Status in Navbar
**Cause**: Redis not running for WebSocket support
**Solution**: Install and start Redis, or ignore (app works without real-time features)

### Issue: Reservation List 500 Error
**Cause**: Timezone comparison issue in `is_upcoming()` method
**Solution**: Fixed by using `timezone.make_aware()` for datetime comparisons

### Issue: Database Connection Errors
**Cause**: PostgreSQL peer authentication or missing password
**Solution**: Use md5 authentication, set PGPASSWORD=1228

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

## Quick Start Guide

1. **Start PostgreSQL**: Ensure database is running
2. **Start Redis** (optional): `redis-server` for real-time features
3. **Start Backend**: `cd backend && source .venv/bin/activate && python manage.py runserver`
4. **Start Frontend**: `cd frontend && npm run dev`
5. **Access Application**: http://localhost:5173
6. **View API Docs** (when implemented): http://localhost:8000/api/docs/

## Testing the Application

### Test User Accounts
Check existing users: `python manage.py shell -c "from django.contrib.auth.models import User; print([(u.username, u.email) for u in User.objects.all()])"`

### Test API Endpoints
```bash
# Test room status
curl http://localhost:8000/api/rooms/status/

# Test dashboard stats
curl http://localhost:8000/api/stats/dashboard/

# Test activity feed
curl http://localhost:8000/api/activity/feed/
```

## Production Deployment Checklist

### Critical Security Fixes (Do First!)
- [ ] Move SECRET_KEY to environment variable
- [ ] Fix CORS to specific origins only
- [ ] Add authentication to public endpoints
- [ ] Configure proper database credentials
- [ ] Disable DEBUG mode

### Infrastructure
- [ ] Set up PostgreSQL with proper credentials
- [ ] Configure Redis for WebSocket support
- [ ] Set up reverse proxy (nginx)
- [ ] Configure SSL certificates
- [ ] Set up domain name

### Application
- [ ] Apply all database migrations
- [ ] Create UserProfiles for existing users
- [ ] Configure email settings for notifications
- [ ] Set up cron jobs for management commands
- [ ] Configure proper logging

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure performance monitoring
- [ ] Set up uptime monitoring
- [ ] Configure backup strategy

## Contributing Guidelines

### Code Style
- **Python**: Follow PEP 8, use Black formatter
- **JavaScript**: Use ESLint, Prettier for formatting
- **Commits**: Use conventional commits (feat:, fix:, docs:)

### Testing Requirements
- Minimum 80% test coverage for new code
- All API endpoints must have tests
- Frontend components need unit tests

### Pull Request Process
1. Create feature branch from main
2. Write tests for new features
3. Update documentation
4. Ensure all tests pass
5. Request code review

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