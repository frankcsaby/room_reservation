from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db.models import Q, Count, Avg, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.core.cache import cache
from .models import Room, Reservation, UserProfile, ActivityLog, RecurringPattern
from .serializers import (
    RegisterSerializer, UserSerializer, RoomSerializer, ReservationSerializer,
    UserProfileSerializer, ActivityLogSerializer, UpcomingReservationSerializer,
    RoomDetailSerializer, RecurringPatternSerializer, RoomAdminSerializer
)
from datetime import datetime, date, time, timedelta

# --- User Registration ---
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

# --- Current User ---
class CurrentUserView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

# --- Rooms ---
class RoomViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def list(self, request):
        """List all active rooms"""
        rooms = Room.objects.filter(is_active=True)
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Retrieve a specific room by ID"""
        try:
            room = Room.objects.get(pk=pk, is_active=True)
            serializer = RoomSerializer(room)
            return Response(serializer.data)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='status')
    def room_status(self, request):
        """
        Get current occupancy status for all rooms.
        Returns room information with current occupancy, reservations today, and next available slot.
        GET /api/rooms/status/
        """
        # Try to get from cache first
        cache_key = 'room_status_all'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        rooms = Room.objects.filter(is_active=True).prefetch_related('reservations')
        now = timezone.now()
        today = now.date()
        current_time = now.time()

        room_statuses = []
        for room in rooms:
            # Get today's reservations
            today_reservations = Reservation.objects.filter(
                room=room,
                date=today,
                status__in=['pending', 'confirmed']
            ).order_by('start_time')

            # Calculate current occupancy
            is_occupied = False
            current_reservation = None
            for res in today_reservations:
                if res.start_time <= current_time <= res.end_time:
                    is_occupied = True
                    current_reservation = res
                    break

            # Find next reservation
            next_reservation = None
            for res in today_reservations:
                if res.start_time > current_time:
                    next_reservation = res
                    break

            # Calculate next available time
            next_available = None
            if is_occupied and current_reservation:
                next_available = current_reservation.end_time.strftime('%H:%M')
            elif next_reservation:
                next_available = next_reservation.start_time.strftime('%H:%M')

            # Occupancy status: free, occupied, ending_soon (within 15 min)
            occupancy_status = 'free'
            time_until_free = None
            if is_occupied:
                # Calculate minutes until reservation ends
                end_datetime = timezone.datetime.combine(today, current_reservation.end_time)
                now_datetime = timezone.datetime.combine(today, current_time)
                minutes_diff = (end_datetime - now_datetime).total_seconds() / 60

                if minutes_diff <= 15:
                    occupancy_status = 'ending_soon'
                    time_until_free = int(minutes_diff)
                else:
                    occupancy_status = 'occupied'
                    time_until_free = int(minutes_diff)

            room_statuses.append({
                'room_id': room.id,
                'room_name': room.name,
                'building': room.building,
                'floor': room.floor,
                'capacity': room.capacity,
                'is_occupied': is_occupied,
                'occupancy_status': occupancy_status,
                'time_until_free': time_until_free,
                'reservations_today': today_reservations.count(),
                'next_available': next_available,
                'current_attendees': current_reservation.attendees if current_reservation else 0,
            })

        # Cache for 30 seconds
        cache.set(cache_key, room_statuses, 30)
        return Response(room_statuses)

    @action(detail=True, methods=['get'], url_path='availability')
    def room_availability(self, request, pk=None):
        """
        Get detailed availability for a specific room within a date range.
        GET /api/rooms/{id}/availability/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
        """
        try:
            room = Room.objects.get(pk=pk, is_active=True)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get date range from query parameters
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if not start_date_str or not end_date_str:
            return Response(
                {"error": "start_date and end_date query parameters are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all reservations in the date range
        reservations = Reservation.objects.filter(
            room=room,
            date__gte=start_date,
            date__lte=end_date,
            status__in=['pending', 'confirmed']
        ).order_by('date', 'start_time')

        # Build availability data by date
        availability_by_date = {}
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            day_reservations = reservations.filter(date=current_date)

            availability_by_date[date_str] = {
                'date': date_str,
                'is_available': day_reservations.count() < 24,  # Assuming hourly slots
                'reservations': [
                    {
                        'id': res.id,
                        'start_time': res.start_time.strftime('%H:%M'),
                        'end_time': res.end_time.strftime('%H:%M'),
                        'status': res.status,
                        'attendees': res.attendees
                    }
                    for res in day_reservations
                ]
            }
            current_date += timedelta(days=1)

        return Response({
            'room_id': room.id,
            'room_name': room.name,
            'start_date': start_date_str,
            'end_date': end_date_str,
            'availability': availability_by_date
        })

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def favorite(self, request, pk=None):
        """
        Toggle favorite status for a room.
        POST /api/rooms/{id}/favorite/
        """
        try:
            room = Room.objects.get(pk=pk, is_active=True)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=request.user)

        # Toggle favorite
        if profile.favorite_rooms.filter(pk=room.pk).exists():
            profile.favorite_rooms.remove(room)
            is_favorited = False
            action_type = 'room_unfavorited'
            message = "Room removed from favorites"
        else:
            profile.favorite_rooms.add(room)
            is_favorited = True
            action_type = 'room_favorited'
            message = "Room added to favorites"

        # Log activity
        ActivityLog.objects.create(
            user=request.user,
            action=action_type,
            room=room,
            description=f"User {request.user.username} {action_type.replace('_', ' ')} {room.name}"
        )

        return Response({
            'message': message,
            'is_favorited': is_favorited,
            'room_id': room.id
        })

# --- Reservations ---
class ReservationViewSet(viewsets.ViewSet):
    """
    ViewSet for handling reservations with proper permission checks
    """
    def get_permissions(self):
        """
        Set different permissions for different actions:
        - list, retrieve: AllowAny (anyone can view)
        - create, destroy: IsAuthenticated (must be logged in)
        """
        if self.action in ['create', 'destroy']:
            return [IsAuthenticated()]
        return [AllowAny()]

    def list(self, request):
        """List all reservations"""
        reservations = Reservation.objects.all().select_related('user', 'room')
        serializer = ReservationSerializer(reservations, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Retrieve a specific reservation by ID"""
        try:
            reservation = Reservation.objects.select_related('user', 'room').get(pk=pk)
            serializer = ReservationSerializer(reservation)
            return Response(serializer.data)
        except Reservation.DoesNotExist:
            return Response({"error": "Reservation not found"}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        """
        Create a new reservation with validation for:
        - User authentication
        - Room existence
        - Time slot availability (no overlapping reservations)
        """
        # Get room_id from request data
        room_id = request.data.get('roomId') or request.data.get('room_id')
        if not room_id:
            return Response({"error": "Room ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify room exists
        try:
            room = Room.objects.get(pk=room_id, is_active=True)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        # Extract reservation data
        reservation_date = request.data.get('date')
        start_time = request.data.get('startTime') or request.data.get('start_time')
        end_time = request.data.get('endTime') or request.data.get('end_time')
        purpose = request.data.get('purpose')
        attendees = request.data.get('attendees', 1)
        contact_email = request.data.get('contactEmail') or request.data.get('contact_email')
        contact_phone = request.data.get('contactPhone') or request.data.get('contact_phone', '')

        # Validate required fields
        if not all([reservation_date, start_time, end_time, purpose, contact_email]):
            return Response(
                {"error": "Missing required fields: date, startTime, endTime, purpose, contactEmail"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check for overlapping reservations
        overlapping = Reservation.objects.filter(
            room=room,
            date=reservation_date,
            status__in=['pending', 'confirmed']
        ).filter(
            Q(start_time__lt=end_time, end_time__gt=start_time)
        ).exists()

        if overlapping:
            return Response(
                {"error": "This time slot is already reserved for the selected room"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create reservation
        reservation = Reservation.objects.create(
            user=request.user,
            room=room,
            date=reservation_date,
            start_time=start_time,
            end_time=end_time,
            purpose=purpose,
            attendees=attendees,
            contact_email=contact_email,
            contact_phone=contact_phone,
            status='pending'
        )

        serializer = ReservationSerializer(reservation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None):
        """
        Delete a reservation
        Users can only delete their own reservations
        """
        try:
            reservation = Reservation.objects.get(pk=pk)

            # Check if user owns this reservation
            if reservation.user != request.user:
                return Response(
                    {"error": "You can only delete your own reservations"},
                    status=status.HTTP_403_FORBIDDEN
                )

            reservation.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Reservation.DoesNotExist:
            return Response({"error": "Reservation not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], url_path='user/(?P<user_id>[^/.]+)')
    def user_reservations(self, request, user_id=None):
        """
        Custom endpoint to fetch reservations for a specific user
        GET /api/reservations/user/{user_id}/
        """
        try:
            user = User.objects.get(pk=user_id)
            reservations = Reservation.objects.filter(user=user).select_related('user', 'room')
            serializer = ReservationSerializer(reservations, many=True)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='upcoming')
    def upcoming_reservations(self, request):
        """
        Get current user's upcoming reservations with countdown.
        GET /api/reservations/upcoming/
        """
        now = timezone.now()
        today = now.date()

        # Get upcoming reservations for the current user
        upcoming = Reservation.objects.filter(
            user=request.user,
            status__in=['pending', 'confirmed']
        ).filter(
            Q(date__gt=today) |
            Q(date=today, start_time__gt=now.time())
        ).select_related('room').order_by('date', 'start_time')[:10]

        serializer = UpcomingReservationSerializer(upcoming, many=True)
        return Response({
            'count': upcoming.count(),
            'reservations': serializer.data
        })

# --- Confirm Reservation ---
@api_view(['POST'])
@permission_classes([AllowAny])
def reservation_confirm(request):
    """
    Confirm a reservation by changing its status to 'confirmed'
    Updates the database with the new status
    """
    reservation_id = request.data.get('id')

    if not reservation_id:
        return Response({"error": "Reservation ID is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reservation = Reservation.objects.select_related('user', 'room').get(pk=reservation_id)

        # Update status to confirmed
        reservation.status = 'confirmed'
        reservation.save()

        serializer = ReservationSerializer(reservation)
        return Response(serializer.data)
    except Reservation.DoesNotExist:
        return Response({"error": "Reservation not found"}, status=status.HTTP_404_NOT_FOUND)


# --- Dashboard Statistics ---
@api_view(['GET'])
@permission_classes([AllowAny])
def dashboard_stats(request):
    """
    Get dashboard statistics including:
    - Total rooms
    - Total reservations
    - Occupancy rate
    - Popular rooms
    - Today's reservations
    GET /api/stats/dashboard/
    """
    # Try to get from cache first (cache for 5 minutes)
    cache_key = 'dashboard_stats'
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    now = timezone.now()
    today = now.date()

    # Total counts
    total_rooms = Room.objects.filter(is_active=True).count()
    total_reservations = Reservation.objects.filter(status='confirmed').count()

    # Today's reservations
    today_reservations = Reservation.objects.filter(
        date=today,
        status__in=['pending', 'confirmed']
    ).count()

    # Calculate occupancy rate (rooms currently occupied vs total rooms)
    current_time = now.time()
    occupied_rooms = Reservation.objects.filter(
        date=today,
        start_time__lte=current_time,
        end_time__gte=current_time,
        status='confirmed'
    ).values('room').distinct().count()

    occupancy_rate = (occupied_rooms / total_rooms * 100) if total_rooms > 0 else 0

    # Popular rooms (by reservation count)
    popular_rooms = Room.objects.filter(is_active=True).annotate(
        reservation_count=Count('reservations', filter=Q(reservations__status='confirmed'))
    ).order_by('-reservation_count')[:5]

    popular_rooms_data = [
        {
            'id': room.id,
            'name': room.name,
            'building': room.building,
            'reservation_count': room.reservation_count,
            'capacity': room.capacity
        }
        for room in popular_rooms
    ]

    # Average attendees per reservation
    avg_attendees = Reservation.objects.filter(
        status='confirmed'
    ).aggregate(avg=Avg('attendees'))['avg'] or 0

    # Upcoming reservations (next 7 days)
    next_week = today + timedelta(days=7)
    upcoming_count = Reservation.objects.filter(
        date__gte=today,
        date__lte=next_week,
        status__in=['pending', 'confirmed']
    ).count()

    stats = {
        'total_rooms': total_rooms,
        'total_reservations': total_reservations,
        'today_reservations': today_reservations,
        'occupancy_rate': round(occupancy_rate, 2),
        'occupied_rooms': occupied_rooms,
        'popular_rooms': popular_rooms_data,
        'avg_attendees': round(avg_attendees, 2),
        'upcoming_week_count': upcoming_count,
        'timestamp': now.isoformat()
    }

    # Cache for 5 minutes
    cache.set(cache_key, stats, 300)
    return Response(stats)


# --- Activity Feed ---
@api_view(['GET'])
@permission_classes([AllowAny])
def activity_feed(request):
    """
    Get recent activity feed across all rooms.
    GET /api/activity/feed/?limit=20
    """
    limit = int(request.query_params.get('limit', 20))
    limit = min(limit, 100)  # Max 100 items

    activities = ActivityLog.objects.select_related('user', 'room').order_by('-created_at')[:limit]
    serializer = ActivityLogSerializer(activities, many=True)

    return Response({
        'count': activities.count(),
        'activities': serializer.data
    })


# --- User Profile ---
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get or update user profile with preferences.
    GET /api/profile/
    PATCH /api/profile/
    """
    profile, created = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        # Update profile fields
        theme = request.data.get('theme')
        notifications_enabled = request.data.get('notifications_enabled')
        email_reminders = request.data.get('email_reminders')

        if theme:
            profile.theme = theme
        if notifications_enabled is not None:
            profile.notifications_enabled = notifications_enabled
        if email_reminders is not None:
            profile.email_reminders = email_reminders

        profile.save()
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)


# --- Admin Room Management ---
class AdminRoomViewSet(viewsets.ModelViewSet):
    """
    Admin ViewSet for full room CRUD operations.
    Only accessible to staff/admin users.
    """
    serializer_class = RoomAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Room.objects.all().order_by('building', 'floor', 'name')

    def list(self, request):
        """List all rooms including inactive ones for admins"""
        include_inactive = request.query_params.get('include_inactive', 'true').lower() == 'true'

        if include_inactive:
            rooms = Room.objects.all().order_by('building', 'floor', 'name')
        else:
            rooms = Room.objects.filter(is_active=True).order_by('building', 'floor', 'name')

        serializer = self.serializer_class(rooms, many=True)
        return Response(serializer.data)

    def create(self, request):
        """Create a new room"""
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()

            # Log activity
            ActivityLog.objects.create(
                user=request.user,
                action='reservation_created',  # Using existing action type
                description=f"Admin {request.user.username} created room {serializer.data['name']}"
            )

            # Clear room cache
            cache.delete('room_status_all')

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """Update a room"""
        try:
            room = Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(room, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()

            # Log activity
            ActivityLog.objects.create(
                user=request.user,
                action='reservation_confirmed',  # Using existing action type
                room=room,
                description=f"Admin {request.user.username} updated room {room.name}"
            )

            # Clear room cache
            cache.delete('room_status_all')

            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, pk=None):
        """Delete a room (soft delete by setting is_active=False)"""
        try:
            room = Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

        # Check if room has future reservations
        future_reservations = Reservation.objects.filter(
            room=room,
            date__gte=timezone.now().date(),
            status__in=['pending', 'confirmed']
        ).count()

        if future_reservations > 0:
            return Response(
                {"error": f"Cannot delete room with {future_reservations} future reservations. Cancel them first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Soft delete
        room.is_active = False
        room.save()

        # Log activity
        ActivityLog.objects.create(
            user=request.user,
            action='reservation_deleted',  # Using existing action type
            description=f"Admin {request.user.username} deactivated room {room.name}"
        )

        # Clear room cache
        cache.delete('room_status_all')

        return Response({"message": "Room deactivated successfully"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-toggle')
    def bulk_toggle_active(self, request):
        """Bulk activate/deactivate rooms"""
        room_ids = request.data.get('room_ids', [])
        active = request.data.get('active', True)

        if not room_ids:
            return Response({"error": "room_ids is required"}, status=status.HTTP_400_BAD_REQUEST)

        updated = Room.objects.filter(id__in=room_ids).update(is_active=active)

        # Log activity
        ActivityLog.objects.create(
            user=request.user,
            action='reservation_confirmed',  # Using existing action type
            description=f"Admin {request.user.username} bulk {'activated' if active else 'deactivated'} {updated} rooms"
        )

        # Clear room cache
        cache.delete('room_status_all')

        return Response({"message": f"{updated} rooms updated", "count": updated})


# --- Check Admin Status ---
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_admin_status(request):
    """
    Check if current user is admin/staff.
    GET /api/admin/check/
    """
    return Response({
        'is_admin': request.user.is_staff or request.user.is_superuser,
        'is_staff': request.user.is_staff,
        'is_superuser': request.user.is_superuser,
        'username': request.user.username
    })


# --- Recurring Reservations ---
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_recurring_reservation(request):
    """
    Create a recurring reservation pattern with automatic generation of individual reservations.
    POST /api/reservations/recurring/
    Body: {
        "room_id": int,
        "frequency": "daily|weekly|biweekly|monthly",
        "start_date": "YYYY-MM-DD",
        "end_date": "YYYY-MM-DD",
        "start_time": "HH:MM",
        "end_time": "HH:MM",
        "purpose": str,
        "attendees": int,
        "contact_email": str,
        "contact_phone": str (optional)
    }
    Returns: {
        "recurring_pattern_id": int,
        "reservations_created": int,
        "conflicts": [list of conflicting dates],
        "created_dates": [list of successful reservation dates]
    }
    """
    room_id = request.data.get('room_id')
    frequency = request.data.get('frequency')
    start_date_str = request.data.get('start_date')
    end_date_str = request.data.get('end_date')
    start_time_str = request.data.get('start_time')
    end_time_str = request.data.get('end_time')
    purpose = request.data.get('purpose')
    attendees = request.data.get('attendees')
    contact_email = request.data.get('contact_email')
    contact_phone = request.data.get('contact_phone', '')

    # Validate required fields
    if not all([room_id, frequency, start_date_str, end_date_str, start_time_str, end_time_str, purpose, attendees, contact_email]):
        return Response(
            {"error": "Missing required fields"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate frequency
    valid_frequencies = ['daily', 'weekly', 'biweekly', 'monthly']
    if frequency not in valid_frequencies:
        return Response(
            {"error": f"Invalid frequency. Must be one of: {', '.join(valid_frequencies)}"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify room exists
    try:
        room = Room.objects.get(pk=room_id, is_active=True)
    except Room.DoesNotExist:
        return Response({"error": "Room not found"}, status=status.HTTP_404_NOT_FOUND)

    # Parse dates and times
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        start_time = datetime.strptime(start_time_str, '%H:%M').time()
        end_time = datetime.strptime(end_time_str, '%H:%M').time()
    except ValueError:
        return Response(
            {"error": "Invalid date or time format"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate date range
    if end_date < start_date:
        return Response(
            {"error": "End date must be after start date"},
            status=status.HTTP_400_BAD_REQUEST
        )

    if start_date < date.today():
        return Response(
            {"error": "Start date cannot be in the past"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create recurring pattern
    recurring_pattern = RecurringPattern.objects.create(
        user=request.user,
        room=room,
        frequency=frequency,
        start_date=start_date,
        end_date=end_date,
        start_time=start_time,
        end_time=end_time,
        purpose=purpose,
        attendees=attendees,
        contact_email=contact_email,
        contact_phone=contact_phone
    )

    # Generate reservation dates based on frequency
    reservation_dates = []
    current_date = start_date

    while current_date <= end_date:
        reservation_dates.append(current_date)

        # Increment based on frequency
        if frequency == 'daily':
            current_date += timedelta(days=1)
        elif frequency == 'weekly':
            current_date += timedelta(weeks=1)
        elif frequency == 'biweekly':
            current_date += timedelta(weeks=2)
        elif frequency == 'monthly':
            # Add one month (handle edge cases)
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)

    # Create individual reservations and track conflicts
    conflicts = []
    created_dates = []
    created_reservations = []

    for reservation_date in reservation_dates:
        # Check for conflicts
        overlapping = Reservation.objects.filter(
            room=room,
            date=reservation_date,
            status__in=['pending', 'confirmed']
        ).filter(
            Q(start_time__lt=end_time, end_time__gt=start_time)
        ).exists()

        if overlapping:
            conflicts.append(reservation_date.strftime('%Y-%m-%d'))
        else:
            # Create reservation
            reservation = Reservation.objects.create(
                user=request.user,
                room=room,
                date=reservation_date,
                start_time=start_time,
                end_time=end_time,
                purpose=purpose,
                attendees=attendees,
                contact_email=contact_email,
                contact_phone=contact_phone,
                recurring_pattern=recurring_pattern,
                status='pending'
            )
            created_dates.append(reservation_date.strftime('%Y-%m-%d'))
            created_reservations.append(reservation)

    # Log activity
    ActivityLog.objects.create(
        user=request.user,
        action='reservation_created',
        room=room,
        description=f"Created recurring {frequency} reservation for {room.name} ({len(created_dates)} reservations, {len(conflicts)} conflicts)"
    )

    return Response({
        'recurring_pattern_id': recurring_pattern.id,
        'reservations_created': len(created_dates),
        'conflicts': conflicts,
        'created_dates': created_dates,
        'message': f'Successfully created {len(created_dates)} reservations. {len(conflicts)} conflicts detected.'
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def preview_recurring_reservation(request):
    """
    Preview dates for a recurring reservation without creating it.
    GET /api/reservations/recurring/preview/?frequency=weekly&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&room_id=1&start_time=HH:MM&end_time=HH:MM
    """
    frequency = request.query_params.get('frequency')
    start_date_str = request.query_params.get('start_date')
    end_date_str = request.query_params.get('end_date')
    room_id = request.query_params.get('room_id')
    start_time_str = request.query_params.get('start_time')
    end_time_str = request.query_params.get('end_time')

    if not all([frequency, start_date_str, end_date_str, room_id, start_time_str, end_time_str]):
        return Response(
            {"error": "Missing required parameters"},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        start_time = datetime.strptime(start_time_str, '%H:%M').time()
        end_time = datetime.strptime(end_time_str, '%H:%M').time()
        room = Room.objects.get(pk=room_id, is_active=True)
    except (ValueError, Room.DoesNotExist):
        return Response(
            {"error": "Invalid parameters"},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Generate preview dates
    preview_dates = []
    current_date = start_date

    while current_date <= end_date:
        # Check for conflicts
        overlapping = Reservation.objects.filter(
            room=room,
            date=current_date,
            status__in=['pending', 'confirmed']
        ).filter(
            Q(start_time__lt=end_time, end_time__gt=start_time)
        ).exists()

        preview_dates.append({
            'date': current_date.strftime('%Y-%m-%d'),
            'day_of_week': current_date.strftime('%A'),
            'has_conflict': overlapping
        })

        # Increment based on frequency
        if frequency == 'daily':
            current_date += timedelta(days=1)
        elif frequency == 'weekly':
            current_date += timedelta(weeks=1)
        elif frequency == 'biweekly':
            current_date += timedelta(weeks=2)
        elif frequency == 'monthly':
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)

    return Response({
        'total_dates': len(preview_dates),
        'conflicts': sum(1 for d in preview_dates if d['has_conflict']),
        'available': sum(1 for d in preview_dates if not d['has_conflict']),
        'dates': preview_dates
    })


# --- QR Code Generation for Reservations ---
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_reservation_qr(request, reservation_id):
    """
    Generate a QR code for a specific reservation.
    The QR code contains reservation details and can be used for check-in.
    GET /api/reservations/{reservation_id}/qr/
    """
    import qrcode
    import io
    import base64
    from django.http import JsonResponse

    try:
        reservation = Reservation.objects.select_related('user', 'room').get(pk=reservation_id)

        # Check if user owns this reservation or is admin
        if reservation.user != request.user and not request.user.is_staff:
            return Response(
                {"error": "You can only generate QR codes for your own reservations"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Create QR code data - include key reservation details
        qr_data = {
            'reservation_id': reservation.id,
            'room_name': reservation.room.name,
            'room_id': reservation.room.id,
            'building': reservation.room.building,
            'date': reservation.date.strftime('%Y-%m-%d'),
            'start_time': reservation.start_time.strftime('%H:%M'),
            'end_time': reservation.end_time.strftime('%H:%M'),
            'user': reservation.user.username,
            'purpose': reservation.purpose,
            'status': reservation.status,
            'check_in_url': f"{request.build_absolute_uri('/')[:-1]}/check-in/{reservation.id}"
        }

        # Convert to JSON string for QR code
        import json
        qr_string = json.dumps(qr_data)

        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_string)
        qr.make(fit=True)

        # Create QR code image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return Response({
            'qr_code': f'data:image/png;base64,{img_str}',
            'reservation_id': reservation.id,
            'data': qr_data
        })

    except Reservation.DoesNotExist:
        return Response({"error": "Reservation not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_in_reservation(request, reservation_id):
    """
    Check in to a reservation using QR code scan.
    Updates reservation status and records check-in time.
    POST /api/reservations/{reservation_id}/check-in/
    """
    try:
        reservation = Reservation.objects.select_related('user', 'room').get(pk=reservation_id)

        # Verify reservation is today and status is confirmed
        now = timezone.now()
        today = now.date()

        if reservation.date != today:
            return Response(
                {"error": "This reservation is not for today"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if reservation.status != 'confirmed':
            return Response(
                {"error": f"Reservation status is {reservation.status}. Only confirmed reservations can be checked in."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if within check-in window (15 minutes before to 15 minutes after start time)
        start_datetime = timezone.datetime.combine(today, reservation.start_time)
        start_datetime = timezone.make_aware(start_datetime)

        time_diff = (now - start_datetime).total_seconds() / 60

        if time_diff < -15:
            return Response(
                {"error": "Too early to check in. Check-in opens 15 minutes before reservation start time."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if time_diff > 15:
            return Response(
                {"error": "Check-in window has closed. You can only check in within 15 minutes of start time."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Record check-in (using capacity_used field)
        actual_attendees = request.data.get('actual_attendees', reservation.attendees)
        reservation.capacity_used = actual_attendees
        reservation.save()

        # Log activity
        ActivityLog.objects.create(
            user=reservation.user,
            action='reservation_confirmed',
            room=reservation.room,
            reservation=reservation,
            description=f"{reservation.user.username} checked in to {reservation.room.name} at {now.strftime('%H:%M')}"
        )

        return Response({
            'message': 'Successfully checked in',
            'reservation_id': reservation.id,
            'room': reservation.room.name,
            'check_in_time': now.strftime('%H:%M'),
            'actual_attendees': actual_attendees
        })

    except Reservation.DoesNotExist:
        return Response({"error": "Reservation not found"}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
