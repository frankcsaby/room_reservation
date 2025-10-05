# API Enhancements Documentation

## Overview
This document describes all the new features, API endpoints, and enhancements made to the University Room Reservation System backend.

## Table of Contents
1. [New Models](#new-models)
2. [New API Endpoints](#new-api-endpoints)
3. [Enhanced Models](#enhanced-models)
4. [WebSocket Enhancements](#websocket-enhancements)
5. [Management Commands](#management-commands)
6. [Performance Optimizations](#performance-optimizations)

---

## New Models

### 1. UserProfile
**Purpose**: Store user preferences and favorites

**Fields**:
- `user` (OneToOne): Link to Django User model
- `theme` (CharField): User's theme preference (light/dark/auto)
- `favorite_rooms` (ManyToMany): User's favorite rooms
- `notifications_enabled` (Boolean): Enable/disable notifications
- `email_reminders` (Boolean): Enable/disable email reminders
- `created_at`, `updated_at` (DateTime): Timestamps

**Automatic Creation**: Profile is automatically created when a new user registers.

### 2. ActivityLog
**Purpose**: Track all user activities across the system

**Fields**:
- `user` (ForeignKey): User who performed the action
- `action` (CharField): Type of action (reservation_created, confirmed, cancelled, etc.)
- `room` (ForeignKey): Associated room
- `reservation` (ForeignKey): Associated reservation
- `description` (TextField): Human-readable description
- `created_at` (DateTime): When the action occurred

**Actions Tracked**:
- `reservation_created`
- `reservation_confirmed`
- `reservation_cancelled`
- `reservation_deleted`
- `room_favorited`
- `room_unfavorited`

### 3. RecurringPattern
**Purpose**: Support for recurring room reservations

**Fields**:
- `user`, `room` (ForeignKey): User and room
- `frequency` (CharField): daily, weekly, biweekly, monthly
- `start_date`, `end_date` (DateField): Pattern duration
- `start_time`, `end_time` (TimeField): Time slots
- `purpose`, `attendees`, `contact_email`, `contact_phone`: Reservation details
- `is_active` (Boolean): Whether pattern is active

---

## New API Endpoints

### Real-time Room Status

#### GET /api/rooms/status/
**Description**: Get real-time occupancy status for all rooms

**Authentication**: Not required

**Response**:
```json
[
  {
    "room_id": 1,
    "room_name": "Conference Room A",
    "building": "Main Building",
    "floor": 2,
    "capacity": 20,
    "is_occupied": true,
    "occupancy_status": "occupied",  // or "free", "ending_soon"
    "time_until_free": 45,  // minutes
    "reservations_today": 3,
    "next_available": "14:00",
    "current_attendees": 15
  }
]
```

**Caching**: Results cached for 30 seconds

---

### Room Availability Calendar

#### GET /api/rooms/{id}/availability/
**Description**: Get detailed availability for a specific room within date range

**Authentication**: Not required

**Query Parameters**:
- `start_date` (required): YYYY-MM-DD format
- `end_date` (required): YYYY-MM-DD format

**Response**:
```json
{
  "room_id": 1,
  "room_name": "Conference Room A",
  "start_date": "2025-10-05",
  "end_date": "2025-10-12",
  "availability": {
    "2025-10-05": {
      "date": "2025-10-05",
      "is_available": true,
      "reservations": [
        {
          "id": 123,
          "start_time": "09:00",
          "end_time": "11:00",
          "status": "confirmed",
          "attendees": 10
        }
      ]
    }
  }
}
```

---

### Room Favorites

#### POST /api/rooms/{id}/favorite/
**Description**: Toggle favorite status for a room

**Authentication**: Required

**Response**:
```json
{
  "message": "Room added to favorites",
  "is_favorited": true,
  "room_id": 1
}
```

---

### Dashboard Statistics

#### GET /api/stats/dashboard/
**Description**: Get comprehensive dashboard statistics

**Authentication**: Not required

**Response**:
```json
{
  "total_rooms": 25,
  "total_reservations": 450,
  "today_reservations": 12,
  "occupancy_rate": 48.5,
  "occupied_rooms": 12,
  "popular_rooms": [
    {
      "id": 1,
      "name": "Conference Room A",
      "building": "Main Building",
      "reservation_count": 87,
      "capacity": 20
    }
  ],
  "avg_attendees": 8.5,
  "upcoming_week_count": 45,
  "timestamp": "2025-10-05T14:30:00Z"
}
```

**Caching**: Results cached for 5 minutes

---

### Upcoming Reservations

#### GET /api/reservations/upcoming/
**Description**: Get current user's upcoming reservations with countdown

**Authentication**: Required

**Response**:
```json
{
  "count": 3,
  "reservations": [
    {
      "id": 123,
      "room_name": "Conference Room A",
      "room_building": "Main Building",
      "date": "2025-10-05",
      "start_time": "15:00:00",
      "end_time": "17:00:00",
      "purpose": "Team Meeting",
      "attendees": 8,
      "status": "confirmed",
      "time_until_start": 30,
      "countdown_text": "30 minutes"
    }
  ]
}
```

---

### Activity Feed

#### GET /api/activity/feed/
**Description**: Get recent activity feed across all rooms

**Authentication**: Not required

**Query Parameters**:
- `limit` (optional): Number of activities to return (default: 20, max: 100)

**Response**:
```json
{
  "count": 20,
  "activities": [
    {
      "id": 456,
      "user": {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com"
      },
      "action": "reservation_created",
      "room_name": "Conference Room A",
      "description": "Created reservation for Conference Room A on 2025-10-05 at 15:00:00",
      "created_at": "2025-10-05T14:30:00Z",
      "time_ago": "5 minutes ago"
    }
  ]
}
```

---

### User Profile

#### GET /api/profile/
**Description**: Get current user's profile with preferences

**Authentication**: Required

**Response**:
```json
{
  "id": 1,
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  },
  "theme": "dark",
  "favorite_rooms": [1, 3, 5],
  "notifications_enabled": true,
  "email_reminders": true,
  "created_at": "2025-10-01T10:00:00Z",
  "updated_at": "2025-10-05T14:30:00Z"
}
```

#### PATCH /api/profile/
**Description**: Update user profile preferences

**Authentication**: Required

**Request Body**:
```json
{
  "theme": "dark",
  "notifications_enabled": true,
  "email_reminders": false
}
```

---

## Enhanced Models

### Room Model Enhancements
**New Fields**:
- `room_image_url` (URLField): High-quality room image URL

**New Methods**:
- `get_current_occupancy_status()`: Returns current occupancy status with details

**New Indexes**:
- Index on `is_active`
- Composite index on `building, floor`

### Reservation Model Enhancements
**New Fields**:
- `capacity_used` (PositiveInteger): Actual attendees who showed up
- `reminder_sent` (Boolean): Whether reminder has been sent
- `recurring_pattern` (ForeignKey): Link to recurring pattern

**New Methods**:
- `is_upcoming()`: Check if reservation is in the future
- `time_until_start()`: Get minutes until reservation starts
- `should_auto_cancel()`: Check if should be auto-cancelled (pending > 15 min)

**New Indexes**:
- Composite index on `user, date`
- Composite index on `status, date`
- Index on `created_at`
- Composite index on `reminder_sent, date, start_time`

---

## WebSocket Enhancements

### RoomConsumer Enhancements
**New Features**:
- **Heartbeat Messages**: Sends status updates every 30 seconds
- **Initial Status**: Sends room status immediately on connection
- **Enhanced Status Info**: Includes occupancy status, time until free, etc.

**WebSocket URL**: `ws://localhost:8000/ws/rooms/{room_id}/`

**Message Types**:
- `room.status`: Initial status on connection
- `heartbeat`: Periodic status updates (every 30s)
- `reservation.created`: New reservation created
- `reservation.confirmed`: Reservation confirmed
- `reservation.cancelled`: Reservation cancelled
- `reservation.deleted`: Reservation deleted

### RoomsOverviewConsumer (NEW)
**Purpose**: Monitor all rooms at once

**WebSocket URL**: `ws://localhost:8000/ws/rooms/overview/`

**Features**:
- Provides live overview of all room statuses
- Broadcasts updates when any reservation changes in any room
- Heartbeat every 60 seconds

**Message Types**:
- `rooms.status`: Status of all rooms on connection
- `heartbeat`: Periodic updates of all rooms (every 60s)
- `room.update`: When any room's reservation changes

---

## Management Commands

### 1. Clean Old Reservations

**Command**: `python manage.py clean_old_reservations`

**Purpose**: Delete old reservations from the database

**Options**:
- `--days N`: Delete reservations older than N days (default: 90)
- `--dry-run`: Show what would be deleted without actually deleting

**Example**:
```bash
# Delete reservations older than 30 days
python manage.py clean_old_reservations --days=30

# Dry run to see what would be deleted
python manage.py clean_old_reservations --days=30 --dry-run
```

**Recommended**: Run weekly via cron job

---

### 2. Auto-Cancel Pending Reservations

**Command**: `python manage.py auto_cancel_pending`

**Purpose**: Auto-cancel pending reservations not confirmed within 15 minutes

**Options**:
- `--minutes N`: Cancel reservations pending for more than N minutes (default: 15)
- `--dry-run`: Show what would be cancelled without actually cancelling

**Example**:
```bash
# Auto-cancel pending reservations older than 15 minutes
python manage.py auto_cancel_pending

# Dry run to see what would be cancelled
python manage.py auto_cancel_pending --dry-run
```

**Recommended**: Run every 5 minutes via cron job

**Cron Example**:
```bash
*/5 * * * * cd /path/to/backend && .venv/bin/python manage.py auto_cancel_pending
```

---

### 3. Send Reservation Reminders

**Command**: `python manage.py send_reservation_reminders`

**Purpose**: Send email reminders 10 minutes before reservation starts

**Options**:
- `--minutes-before N`: Send reminders N minutes before start (default: 10)
- `--dry-run`: Show what reminders would be sent without actually sending

**Example**:
```bash
# Send reminders 10 minutes before start
python manage.py send_reservation_reminders

# Dry run to see what reminders would be sent
python manage.py send_reservation_reminders --dry-run
```

**Recommended**: Run every minute via cron job

**Cron Example**:
```bash
* * * * * cd /path/to/backend && .venv/bin/python manage.py send_reservation_reminders
```

**Requirements**:
- EMAIL_HOST, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD must be configured in settings
- User must have `email_reminders` enabled in their profile

---

## Performance Optimizations

### 1. Database Indexes
**Added indexes on frequently queried fields**:
- Room: `is_active`, `(building, floor)`
- Reservation: `(user, date)`, `(status, date)`, `created_at`, `(reminder_sent, date, start_time)`
- ActivityLog: `-created_at`, `(user, -created_at)`
- RecurringPattern: `(room, is_active)`, `(user, is_active)`

### 2. Query Optimization
**Using `select_related` and `prefetch_related`**:
- All reservation queries use `select_related('user', 'room')`
- Room status queries use `prefetch_related('reservations')`
- Activity log queries use `select_related('user', 'room')`

### 3. Redis Caching
**Cache Keys and Durations**:
- `room_status_all`: 30 seconds (room occupancy status)
- `dashboard_stats`: 5 minutes (dashboard statistics)

**Benefits**:
- Reduces database load
- Faster response times for frequently accessed data
- Automatic cache invalidation

### 4. Graceful Degradation
**Redis Connection Handling**:
- WebSocket broadcasting gracefully handles Redis unavailability
- Application continues to function without Redis
- Warnings logged but no crashes

---

## Migration Instructions

### Step 1: Create Migrations
```bash
cd /path/to/backend
source .venv/bin/activate
python manage.py makemigrations
```

### Step 2: Review Migrations
Check the generated migration file:
```bash
cat api/migrations/0002_activitylog_recurringpattern_userprofile_and_more.py
```

### Step 3: Apply Migrations
```bash
python manage.py migrate
```

### Step 4: Create Profiles for Existing Users
```bash
python manage.py shell
```
```python
from django.contrib.auth.models import User
from api.models import UserProfile

for user in User.objects.all():
    UserProfile.objects.get_or_create(user=user)
```

### Step 5: Test Endpoints
```bash
# Test room status endpoint
curl http://localhost:8000/api/rooms/status/

# Test dashboard stats
curl http://localhost:8000/api/stats/dashboard/

# Test activity feed
curl http://localhost:8000/api/activity/feed/
```

---

## Security Considerations

### 1. Authentication
- All write operations require authentication
- User profiles are automatically created on registration
- Users can only delete their own reservations

### 2. Authorization
- Room favorites require authentication
- User profile endpoints require authentication
- Activity logs are read-only via API

### 3. Rate Limiting
- Consider adding rate limiting for WebSocket connections
- Consider adding API rate limiting for public endpoints

### 4. Data Validation
- All date inputs validated
- Time slot overlap checking
- Room existence verification

---

## Testing Recommendations

### 1. Unit Tests
- Test model methods (is_upcoming, time_until_start, should_auto_cancel)
- Test serializers with different user contexts
- Test signal handlers with and without Redis

### 2. Integration Tests
- Test complete reservation flow with activity logging
- Test favorite toggling and profile updates
- Test dashboard statistics calculations

### 3. WebSocket Tests
- Test connection/disconnection handling
- Test message broadcasting
- Test graceful Redis failure handling

### 4. Management Command Tests
- Test auto-cancel with different time windows
- Test clean old reservations with different date ranges
- Test reminder sending with email settings

---

## API Endpoint Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/rooms/ | No | List all rooms |
| GET | /api/rooms/{id}/ | No | Get room details |
| GET | /api/rooms/status/ | No | Real-time room status |
| GET | /api/rooms/{id}/availability/ | No | Room availability calendar |
| POST | /api/rooms/{id}/favorite/ | Yes | Toggle room favorite |
| GET | /api/reservations/ | No | List all reservations |
| GET | /api/reservations/{id}/ | No | Get reservation details |
| POST | /api/reservations/ | Yes | Create reservation |
| DELETE | /api/reservations/{id}/ | Yes | Delete reservation |
| GET | /api/reservations/upcoming/ | Yes | User's upcoming reservations |
| POST | /api/reservations/confirm/ | No | Confirm reservation |
| GET | /api/stats/dashboard/ | No | Dashboard statistics |
| GET | /api/activity/feed/ | No | Activity feed |
| GET | /api/profile/ | Yes | Get user profile |
| PATCH | /api/profile/ | Yes | Update user profile |

---

## WebSocket Endpoints

| URL | Description |
|-----|-------------|
| ws://localhost:8000/ws/rooms/{id}/ | Single room monitoring |
| ws://localhost:8000/ws/rooms/overview/ | All rooms monitoring |

---

## Next Steps

1. **Frontend Integration**: Update frontend to use new endpoints
2. **Testing**: Write comprehensive tests for all new features
3. **Documentation**: Add API documentation to frontend
4. **Monitoring**: Set up logging and monitoring for new features
5. **Cron Jobs**: Set up automated tasks for management commands
6. **Email Configuration**: Configure SMTP settings for reminders
7. **Redis Setup**: Set up Redis for production if using WebSockets
8. **Performance Testing**: Load test new endpoints with realistic data

---

## Support

For issues or questions:
1. Check the logs in /backend/logs/
2. Review Django admin interface at /admin/
3. Test endpoints with curl or Postman
4. Check WebSocket connections with browser developer tools
