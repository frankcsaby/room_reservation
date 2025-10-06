# Real-Time Room Monitoring with WebSockets

This document describes the real-time features implemented in the University Room Reservation System using WebSockets.

## Overview

The system now includes comprehensive real-time monitoring capabilities that allow users to see live room occupancy status, receive instant notifications when rooms become available, and track reservations as they happen across the system.

## Backend Features

### 1. Enhanced WebSocket Consumers

#### RoomConsumer (`/ws/rooms/{room_id}/`)
- **Purpose**: Monitor a specific room for real-time updates
- **Features**:
  - Automatic heartbeat every 30 seconds with current room status
  - Sends initial room status on connection
  - Broadcasts reservation events (created, confirmed, cancelled, deleted)
  - Calculates occupancy status (free, occupied, ending_soon)
  - Provides time until room becomes available
  - Shows current attendee count

#### RoomsOverviewConsumer (`/ws/rooms/overview/`)
- **Purpose**: Monitor all rooms simultaneously
- **Features**:
  - Heartbeat every 60 seconds with status of all rooms
  - Sends comprehensive status for all active rooms on connection
  - Broadcasts updates when any room's reservation changes
  - Efficient for dashboard/monitoring views

### 2. Room Status API Endpoint

**Endpoint**: `GET /api/rooms/status/`

Returns real-time occupancy information for all rooms:
```json
[
  {
    "room_id": 1,
    "room_name": "Conference Room A",
    "building": "Main Building",
    "floor": 2,
    "capacity": 20,
    "is_occupied": true,
    "occupancy_status": "occupied",
    "time_until_free": 45,
    "reservations_today": 3,
    "next_available": "15:30",
    "current_attendees": 15
  }
]
```

**Occupancy Status Values**:
- `free`: Room is currently available
- `occupied`: Room is occupied (more than 15 minutes remaining)
- `ending_soon`: Current reservation ends within 15 minutes

**Caching**: Results are cached for 30 seconds to optimize performance

### 3. Signal Handlers with Broadcasting

The system uses Django signals to automatically broadcast WebSocket messages when reservations change:

- **Post-save signal**: Broadcasts when reservations are created, confirmed, or cancelled
- **Post-delete signal**: Broadcasts when reservations are deleted
- **Dual broadcasting**: Messages sent to both room-specific and overview channels
- **Graceful degradation**: Handles Redis connection errors without crashing
- **Activity logging**: All reservation changes are logged to ActivityLog model

### 4. WebSocket URL Routing

```python
websocket_urlpatterns = [
    re_path(r'ws/rooms/(?P<room_id>\d+)/$', consumers.RoomConsumer.as_asgi()),
    re_path(r'ws/rooms/overview/$', consumers.RoomsOverviewConsumer.as_asgi()),
]
```

## Frontend Features

### 1. useWebSocket Hook

**Location**: `/frontend/src/hooks/useWebSocket.js`

A custom React hook that provides:
- Automatic connection management
- Reconnection logic (up to 5 attempts with 3-second delay)
- Connection status tracking
- Message parsing and callbacks
- Manual reconnect functionality
- Proper cleanup on unmount

**Usage**:
```javascript
const { isConnected, lastMessage, sendMessage, reconnect } = useWebSocket(
  'ws://localhost:8000/ws/rooms/overview/',
  {
    enabled: true,
    onMessage: (data) => {
      console.log('Received:', data);
    },
    onOpen: () => console.log('Connected'),
    onClose: () => console.log('Disconnected'),
    onError: (error) => console.error('Error:', error)
  }
);
```

### 2. RoomStatusBadge Component

**Location**: `/frontend/src/components/RoomStatusBadge.jsx`

Visual indicator showing real-time room occupancy:
- Color-coded badges (green=free, yellow=ending soon, red=occupied)
- Pulse animation for occupied rooms
- Shows time until room becomes free
- Displays current attendee count
- Next available time slot information
- Number of reservations today

### 3. RoomMonitor Component

**Location**: `/frontend/src/components/RoomMonitor.jsx`

A dedicated monitoring dashboard featuring:
- Live grid view of all rooms
- Real-time status updates via WebSocket
- Statistics cards (total rooms, available, ending soon, occupied)
- Filter by availability (all, free, occupied, ending soon)
- Sort by name, building, or status
- Connection status indicator
- Automatic refresh every 60 seconds

### 4. MainAppEnhanced Component

**Location**: `/frontend/src/components/MainAppEnhanced.jsx`

Enhanced main application with real-time features:
- WebSocket connection to overview channel
- Live room status badges on each room card
- Real-time notifications when rooms become available
- Filter rooms by occupancy status
- Connection status indicator in header
- Automatic reservation list updates when changes occur
- Toast notifications for reservation events

### 5. NotificationToast Component

**Location**: `/frontend/src/components/NotificationToast.jsx`

Toast notification system with:
- Multiple types (success, error, info, warning)
- Auto-dismiss with configurable duration
- Slide-in/out animations
- Positioning options (top-right, top-left, bottom-right, bottom-left)
- NotificationContainer for managing multiple toasts
- Stacked notification display

## Real-Time Features in Action

### 1. Live Occupancy Indicators

Each room card displays:
- Current occupancy status with color coding
- Live countdown when room is occupied
- Next available time slot
- Number of reservations today
- Current attendee count

### 2. Instant Notifications

Users receive notifications for:
- New reservations in monitored rooms
- Rooms becoming available after cancellations
- Their own reservation status changes
- System-wide reservation activity

### 3. Automatic Updates

- Room cards update immediately when reservations change
- No page refresh needed to see latest status
- Reservation lists update in real-time
- Statistics update automatically

### 4. Connection Management

- Visual indicator shows WebSocket connection status
- Automatic reconnection on network interruptions
- Graceful degradation when WebSocket unavailable
- Manual reconnect option

## Performance Considerations

### Backend Optimizations

1. **Caching**: Room status endpoint caches results for 30 seconds
2. **Database Queries**: Optimized with select_related and prefetch_related
3. **Heartbeat Intervals**: Balanced (30s for rooms, 60s for overview)
4. **Signal Broadcasting**: Async operations for non-blocking execution

### Frontend Optimizations

1. **React.memo**: Components memoized to prevent unnecessary re-renders
2. **useMemo/useCallback**: Expensive calculations and callbacks memoized
3. **Debouncing**: Rapid WebSocket updates debounced
4. **Connection Pooling**: Single WebSocket connection for overview
5. **Efficient Filtering**: Client-side filtering with memoization

## Usage Guide

### For Users

1. **Browse Rooms with Live Status**:
   - Navigate to "Browse Rooms"
   - See real-time occupancy badges on each room
   - Filter by availability (free/occupied)
   - Watch status update automatically

2. **Monitor All Rooms**:
   - Use the RoomMonitor component
   - View comprehensive statistics
   - Filter and sort rooms by various criteria
   - See live updates across all rooms

3. **Receive Notifications**:
   - Get alerted when rooms become available
   - See notifications for reservation events
   - Notifications auto-dismiss after 5 seconds

### For Developers

1. **Connect to Room Channel**:
```javascript
const { isConnected, lastMessage } = useWebSocket(
  `ws://localhost:8000/ws/rooms/${roomId}/`,
  {
    onMessage: (data) => {
      if (data.type === 'reservation.created') {
        // Handle new reservation
      }
    }
  }
);
```

2. **Connect to Overview Channel**:
```javascript
const { isConnected, lastMessage } = useWebSocket(
  'ws://localhost:8000/ws/rooms/overview/',
  {
    onMessage: (data) => {
      if (data.type === 'heartbeat' && data.rooms) {
        // Update all room statuses
        setRoomStatuses(data.rooms);
      }
    }
  }
);
```

3. **Fetch Room Status**:
```javascript
const response = await fetch('http://localhost:8000/api/rooms/status/');
const statuses = await response.json();
```

## WebSocket Message Types

### From Server to Client

#### Room-Specific Messages
- `room.status`: Initial room status on connection
- `heartbeat`: Periodic status updates
- `reservation.created`: New reservation created
- `reservation.confirmed`: Reservation confirmed
- `reservation.cancelled`: Reservation cancelled
- `reservation.deleted`: Reservation deleted

#### Overview Messages
- `rooms.status`: Initial status of all rooms
- `heartbeat`: Periodic update for all rooms
- `room.update`: Individual room status changed

### Message Structure

```javascript
// Heartbeat message
{
  type: 'heartbeat',
  status: {
    room_id: 1,
    is_occupied: true,
    occupancy_status: 'occupied',
    time_until_free: 30,
    reservations_today: 2,
    next_available: '14:00',
    current_attendees: 10
  },
  timestamp: '2025-10-05T12:30:00Z'
}

// Reservation event message
{
  type: 'reservation.created',
  reservation: { /* full reservation object */ },
  event_type: 'created',
  reservation_id: 123,
  room_id: 1
}
```

## Troubleshooting

### WebSocket Connection Issues

1. **Check Redis is running**: WebSocket requires Redis for Django Channels
   ```bash
   redis-cli ping
   ```

2. **Verify WebSocket URL**: Ensure correct protocol (ws:// not http://)

3. **Check CORS settings**: WebSocket connections subject to CORS policies

4. **Monitor console logs**: Both backend and frontend log WebSocket events

### Performance Issues

1. **Too many connections**: Use overview channel instead of individual room connections
2. **Slow updates**: Check Redis connection and network latency
3. **Memory leaks**: Ensure WebSocket cleanup on component unmount

### Missing Updates

1. **Verify signal handlers**: Check that signals.py is imported in apps.py
2. **Check Redis connection**: Signals broadcast through Redis
3. **Test manually**: Use browser dev tools to inspect WebSocket messages

## Security Considerations

1. **Authentication**: WebSocket connections don't require authentication (read-only)
2. **Rate limiting**: Consider adding rate limiting for WebSocket connections
3. **Input validation**: All user inputs validated before processing
4. **CORS**: Configured to allow frontend origin

## Future Enhancements

Potential improvements for the real-time system:

1. **User-specific channels**: Private channels for user notifications
2. **Push notifications**: Browser push notifications for important events
3. **Audio alerts**: Optional sound notifications for room availability
4. **Reservation reminders**: Countdown notifications before reservations
5. **Collaborative features**: See who else is viewing a room
6. **Historical analytics**: Track room usage patterns over time
7. **Predictive availability**: ML-based predictions of room availability
8. **Mobile support**: Native WebSocket support for mobile apps

## Testing

### Backend Tests

Test WebSocket consumers:
```python
from channels.testing import WebsocketCommunicator
from api.consumers import RoomConsumer

async def test_room_consumer():
    communicator = WebsocketCommunicator(RoomConsumer.as_asgi(), "/ws/rooms/1/")
    connected, _ = await communicator.connect()
    assert connected

    response = await communicator.receive_json_from()
    assert response['type'] == 'room.status'

    await communicator.disconnect()
```

### Frontend Tests

Test WebSocket hook:
```javascript
import { renderHook } from '@testing-library/react-hooks';
import useWebSocket from './useWebSocket';

test('connects to WebSocket', () => {
  const { result } = renderHook(() =>
    useWebSocket('ws://localhost:8000/ws/rooms/1/')
  );

  expect(result.current.connectionStatus).toBe('connecting');
});
```

## Files Modified/Created

### Backend Files
- `backend/api/consumers.py` - Enhanced with heartbeat and occupancy tracking
- `backend/api/signals.py` - Updated to broadcast to overview channel
- `backend/api/views.py` - Added room status endpoint with caching
- `backend/api/routing.py` - Added overview WebSocket route

### Frontend Files
- `frontend/src/hooks/useWebSocket.js` - **NEW** Custom WebSocket hook
- `frontend/src/components/RoomStatusBadge.jsx` - **NEW** Live status indicator
- `frontend/src/components/RoomMonitor.jsx` - **NEW** Live monitoring dashboard
- `frontend/src/components/MainAppEnhanced.jsx` - **NEW** Enhanced main app with real-time
- `frontend/src/components/NotificationToast.jsx` - **NEW** Toast notification system
- `frontend/tailwind.config.js` - Added animation keyframes

### Documentation
- `WEBSOCKET_FEATURES.md` - **NEW** This comprehensive documentation

## Support

For issues or questions about real-time features:
1. Check console logs for WebSocket events
2. Verify Redis is running and accessible
3. Review Django Channels documentation
4. Test with browser WebSocket debugging tools
