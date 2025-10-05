from rest_framework import viewsets, status, generics
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
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
    RoomDetailSerializer, RecurringPatternSerializer
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
