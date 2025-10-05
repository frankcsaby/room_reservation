from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

class Room(models.Model):
    name = models.CharField(max_length=150)
    building = models.CharField(max_length=150, blank=True)
    floor = models.IntegerField(default=1)
    capacity = models.PositiveIntegerField(default=1)
    amenities = models.JSONField(default=list, blank=True)
    image = models.URLField(blank=True, null=True)
    room_image_url = models.URLField(blank=True, null=True, help_text="High-quality room image URL")
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=["is_active"]),
            models.Index(fields=["building", "floor"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.building})"

    def get_current_occupancy_status(self):
        """Returns current occupancy status of the room"""
        now = timezone.now()
        current_reservation = self.reservations.filter(
            date=now.date(),
            start_time__lte=now.time(),
            end_time__gte=now.time(),
            status='confirmed'
        ).first()

        if current_reservation:
            return {
                'occupied': True,
                'reservation': current_reservation,
                'time_until_free': (
                    timezone.datetime.combine(now.date(), current_reservation.end_time) -
                    timezone.datetime.combine(now.date(), now.time())
                ).seconds // 60
            }
        return {'occupied': False, 'reservation': None, 'time_until_free': 0}

class UserProfile(models.Model):
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('auto', 'Auto'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default='auto')
    favorite_rooms = models.ManyToManyField(Room, related_name='favorited_by', blank=True)
    notifications_enabled = models.BooleanField(default=True)
    email_reminders = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"

class Reservation(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("cancelled", "Cancelled"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations")
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="reservations")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    purpose = models.TextField()
    attendees = models.PositiveIntegerField(default=1)
    capacity_used = models.PositiveIntegerField(default=0, help_text="Actual attendees who showed up")
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    confirmation_token = models.CharField(max_length=255, blank=True, null=True)
    reminder_sent = models.BooleanField(default=False)
    recurring_pattern = models.ForeignKey('RecurringPattern', on_delete=models.SET_NULL, null=True, blank=True, related_name='reservations')

    class Meta:
        ordering = ["-date", "-start_time"]
        indexes = [
            models.Index(fields=["room", "date", "start_time"]),
            models.Index(fields=["user", "date"]),
            models.Index(fields=["status", "date"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["reminder_sent", "date", "start_time"]),
        ]

    def __str__(self):
        return f"Reservation {self.id} - {self.room.name} on {self.date}"

    def is_upcoming(self):
        """Check if reservation is in the future"""
        now = timezone.now()
        reservation_datetime = timezone.make_aware(timezone.datetime.combine(self.date, self.start_time))
        return reservation_datetime > now and self.status in ['pending', 'confirmed']

    def time_until_start(self):
        """Get time until reservation starts (in minutes)"""
        now = timezone.now()
        reservation_datetime = timezone.make_aware(timezone.datetime.combine(self.date, self.start_time))
        if timezone.is_naive(reservation_datetime):
            reservation_datetime = timezone.make_aware(reservation_datetime)
        delta = reservation_datetime - now
        return max(0, int(delta.total_seconds() // 60))

    def should_auto_cancel(self):
        """Check if reservation should be auto-cancelled (unconfirmed after 15 minutes)"""
        if self.status == 'pending':
            time_since_creation = timezone.now() - self.created_at
            return time_since_creation > timedelta(minutes=15)
        return False

class RecurringPattern(models.Model):
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-weekly'),
        ('monthly', 'Monthly'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recurring_patterns')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='recurring_patterns')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    purpose = models.TextField()
    attendees = models.PositiveIntegerField(default=1)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["room", "is_active"]),
            models.Index(fields=["user", "is_active"]),
        ]

    def __str__(self):
        return f"Recurring {self.frequency} - {self.room.name}"

class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('reservation_created', 'Reservation Created'),
        ('reservation_confirmed', 'Reservation Confirmed'),
        ('reservation_cancelled', 'Reservation Cancelled'),
        ('reservation_deleted', 'Reservation Deleted'),
        ('room_favorited', 'Room Favorited'),
        ('room_unfavorited', 'Room Unfavorited'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    reservation = models.ForeignKey(Reservation, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.action} at {self.created_at}"
