from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Room, Reservation, UserProfile, RecurringPattern, ActivityLog

# --- User Serializers ---
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            email=validated_data['email']
        )
        user.set_password(validated_data['password'])
        user.save()
        # Create user profile automatically
        UserProfile.objects.create(user=user)
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    favorite_rooms = serializers.PrimaryKeyRelatedField(many=True, queryset=Room.objects.all(), required=False)

    class Meta:
        model = UserProfile
        fields = ('id', 'user', 'theme', 'favorite_rooms', 'notifications_enabled', 'email_reminders', 'created_at', 'updated_at')

# --- Room Serializers ---
class RoomSerializer(serializers.ModelSerializer):
    is_favorited = serializers.SerializerMethodField()
    current_occupancy = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = '__all__'

    def get_is_favorited(self, obj):
        """Check if current user has favorited this room"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favorited_by.filter(user=request.user).exists()
        return False

    def get_current_occupancy(self, obj):
        """Get current occupancy status"""
        return obj.get_current_occupancy_status()

class RoomDetailSerializer(serializers.ModelSerializer):
    """Detailed room serializer with additional statistics"""
    total_reservations = serializers.SerializerMethodField()
    is_favorited = serializers.SerializerMethodField()
    favorite_count = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = '__all__'

    def get_total_reservations(self, obj):
        return obj.reservations.filter(status='confirmed').count()

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favorited_by.filter(user=request.user).exists()
        return False

    def get_favorite_count(self, obj):
        return obj.favorited_by.count()

# --- Reservation Serializers ---
class ReservationSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    room = RoomSerializer(read_only=True)
    room_id = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all(), write_only=True, source='room')
    time_until_start = serializers.SerializerMethodField()
    is_upcoming = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = ('id', 'user', 'room', 'room_id', 'date', 'start_time', 'end_time', 'purpose',
                  'attendees', 'capacity_used', 'contact_email', 'contact_phone', 'status',
                  'created_at', 'updated_at', 'reminder_sent', 'time_until_start', 'is_upcoming')

    def get_time_until_start(self, obj):
        """Get minutes until reservation starts"""
        return obj.time_until_start()

    def get_is_upcoming(self, obj):
        """Check if reservation is upcoming"""
        return obj.is_upcoming()

class UpcomingReservationSerializer(serializers.ModelSerializer):
    """Serializer for upcoming reservations with countdown"""
    room_name = serializers.CharField(source='room.name', read_only=True)
    room_building = serializers.CharField(source='room.building', read_only=True)
    time_until_start = serializers.SerializerMethodField()
    countdown_text = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = ('id', 'room_name', 'room_building', 'date', 'start_time', 'end_time',
                  'purpose', 'attendees', 'status', 'time_until_start', 'countdown_text')

    def get_time_until_start(self, obj):
        return obj.time_until_start()

    def get_countdown_text(self, obj):
        minutes = obj.time_until_start()
        if minutes < 60:
            return f"{minutes} minutes"
        hours = minutes // 60
        remaining_minutes = minutes % 60
        return f"{hours}h {remaining_minutes}m"

# --- Recurring Pattern Serializers ---
class RecurringPatternSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    room = RoomSerializer(read_only=True)
    room_id = serializers.PrimaryKeyRelatedField(queryset=Room.objects.all(), write_only=True, source='room')

    class Meta:
        model = RecurringPattern
        fields = '__all__'

# --- Activity Log Serializers ---
class ActivityLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True, allow_null=True)
    time_ago = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = ('id', 'user', 'action', 'room_name', 'description', 'created_at', 'time_ago')

    def get_time_ago(self, obj):
        """Human-readable time ago"""
        from django.utils import timezone
        diff = timezone.now() - obj.created_at

        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"

        hours = diff.seconds // 3600
        if hours > 0:
            return f"{hours} hour{'s' if hours > 1 else ''} ago"

        minutes = (diff.seconds % 3600) // 60
        if minutes > 0:
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"

        return "just now"
