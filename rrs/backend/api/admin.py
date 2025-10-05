from django.contrib import admin
from .models import Room, Reservation, UserProfile, ActivityLog, RecurringPattern

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'building', 'floor', 'capacity', 'is_active')
    list_filter = ('is_active', 'building', 'floor')
    search_fields = ('name', 'building')

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'user', 'date', 'start_time', 'end_time', 'status', 'attendees', 'reminder_sent')
    list_filter = ('status', 'date', 'room', 'reminder_sent')
    search_fields = ('room__name', 'user__username', 'purpose')
    date_hierarchy = 'date'

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'theme', 'notifications_enabled', 'email_reminders')
    list_filter = ('theme', 'notifications_enabled', 'email_reminders')
    search_fields = ('user__username', 'user__email')
    filter_horizontal = ('favorite_rooms',)

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'room', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('user__username', 'room__name', 'description')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)

@admin.register(RecurringPattern)
class RecurringPatternAdmin(admin.ModelAdmin):
    list_display = ('user', 'room', 'frequency', 'start_date', 'end_date', 'is_active')
    list_filter = ('frequency', 'is_active', 'start_date')
    search_fields = ('user__username', 'room__name', 'purpose')
    date_hierarchy = 'start_date'
