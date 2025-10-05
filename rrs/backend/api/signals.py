from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Reservation, ActivityLog
from .serializers import ReservationSerializer
import logging

logger = logging.getLogger(__name__)


def broadcast_reservation_change(reservation, event_type):
    """
    Utility function to broadcast reservation changes to WebSocket clients.
    Gracefully handles Redis connection errors - logs but doesn't crash.

    Args:
        reservation: Reservation instance
        event_type: Type of event ('created', 'confirmed', 'cancelled', 'deleted')
    """
    channel_layer = get_channel_layer()
    room_group_name = f'room_{reservation.room.id}'
    overview_group_name = 'rooms_overview'

    # Serialize the reservation data
    serializer = ReservationSerializer(reservation)
    reservation_data = serializer.data

    # Prepare the message for room-specific group
    room_message = {
        'type': f'reservation_{event_type}',
        'reservation': reservation_data,
        'event_type': event_type,
        'reservation_id': reservation.id,
        'room_id': reservation.room.id,
    }

    # Prepare the message for overview group
    overview_message = {
        'type': 'room_update',
        'room_id': reservation.room.id,
        'event_type': event_type,
        'reservation': reservation_data,
    }

    # Send to the room's group - gracefully handle Redis connection errors
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(room_group_name, room_message)
            async_to_sync(channel_layer.group_send)(overview_group_name, overview_message)
        except Exception as e:
            # Log the error but don't crash - WebSocket broadcasting is optional
            logger.warning(f"Failed to broadcast reservation {event_type} (Redis not available): {e}")


@receiver(post_save, sender=Reservation)
def reservation_post_save(sender, instance, created, **kwargs):
    """
    Signal handler for when a Reservation is saved.
    Broadcasts different events based on whether it's a new reservation or an update.
    Also logs activities for tracking.
    """
    if created:
        # New reservation created
        broadcast_reservation_change(instance, 'created')
        # Log activity
        ActivityLog.objects.create(
            user=instance.user,
            action='reservation_created',
            room=instance.room,
            reservation=instance,
            description=f'Created reservation for {instance.room.name} on {instance.date} at {instance.start_time}'
        )
    else:
        # Existing reservation updated - check status changes
        if instance.status == 'confirmed':
            broadcast_reservation_change(instance, 'confirmed')
            # Log activity
            ActivityLog.objects.create(
                user=instance.user,
                action='reservation_confirmed',
                room=instance.room,
                reservation=instance,
                description=f'Confirmed reservation for {instance.room.name} on {instance.date}'
            )
        elif instance.status == 'cancelled':
            broadcast_reservation_change(instance, 'cancelled')
            # Log activity
            ActivityLog.objects.create(
                user=instance.user,
                action='reservation_cancelled',
                room=instance.room,
                reservation=instance,
                description=f'Cancelled reservation for {instance.room.name} on {instance.date}'
            )


@receiver(post_delete, sender=Reservation)
def reservation_post_delete(sender, instance, **kwargs):
    """
    Signal handler for when a Reservation is deleted.
    Broadcasts a deletion event to all connected WebSocket clients.
    Gracefully handles Redis connection errors.
    Also logs deletion activity.
    """
    # Log activity before deletion
    ActivityLog.objects.create(
        user=instance.user,
        action='reservation_deleted',
        room=instance.room,
        description=f'Deleted reservation for {instance.room.name} on {instance.date} at {instance.start_time}'
    )

    # For deleted reservations, we need to send minimal data
    # since the instance is being deleted
    channel_layer = get_channel_layer()
    room_group_name = f'room_{instance.room.id}'
    overview_group_name = 'rooms_overview'

    message = {
        'type': 'reservation_deleted',
        'event_type': 'deleted',
        'reservation_id': instance.id,
        'room_id': instance.room.id,
    }

    overview_message = {
        'type': 'room_update',
        'room_id': instance.room.id,
        'event_type': 'deleted',
    }

    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(room_group_name, message)
            async_to_sync(channel_layer.group_send)(overview_group_name, overview_message)
        except Exception as e:
            # Log the error but don't crash - WebSocket broadcasting is optional
            logger.warning(f"Failed to broadcast reservation deletion (Redis not available): {e}")
