import json
import asyncio
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import Room, Reservation

class RoomConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time room reservation updates.

    Clients connect to a specific room channel and receive real-time notifications
    when reservations are created, confirmed, cancelled, or deleted for that room.
    Includes periodic heartbeat messages with current room occupancy status.
    """

    async def connect(self):
        """
        Handle WebSocket connection.
        Adds the client to the room-specific channel group and starts heartbeat.
        """
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.group_name = f'room_{self.room_id}'
        self.heartbeat_task = None

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send initial room status
        status = await self.get_room_status()
        if status:
            await self.send_json({
                'type': 'room.status',
                'status': status
            })

        # Start heartbeat task (every 30 seconds)
        self.heartbeat_task = asyncio.create_task(self.send_heartbeat())

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Removes the client from the room-specific channel group and stops heartbeat.
        """
        # Cancel heartbeat task
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
            try:
                await self.heartbeat_task
            except asyncio.CancelledError:
                pass

        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_heartbeat(self):
        """
        Periodically send heartbeat messages with current room status.
        Runs every 30 seconds.
        """
        try:
            while True:
                await asyncio.sleep(30)
                status = await self.get_room_status()
                if status:
                    await self.send_json({
                        'type': 'heartbeat',
                        'status': status,
                        'timestamp': timezone.now().isoformat()
                    })
        except asyncio.CancelledError:
            pass

    @database_sync_to_async
    def get_room_status(self):
        """
        Get current room occupancy status from database.
        Returns occupancy info, reservations today, next available slot.
        """
        try:
            room = Room.objects.get(pk=self.room_id, is_active=True)
            now = timezone.now()
            today = now.date()
            current_time = now.time()

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

            # Occupancy status
            occupancy_status = 'free'
            time_until_free = None
            if is_occupied:
                end_datetime = timezone.datetime.combine(today, current_reservation.end_time)
                now_datetime = timezone.datetime.combine(today, current_time)
                minutes_diff = (end_datetime - now_datetime).total_seconds() / 60

                if minutes_diff <= 15:
                    occupancy_status = 'ending_soon'
                    time_until_free = int(minutes_diff)
                else:
                    occupancy_status = 'occupied'
                    time_until_free = int(minutes_diff)

            return {
                'room_id': room.id,
                'is_occupied': is_occupied,
                'occupancy_status': occupancy_status,
                'time_until_free': time_until_free,
                'reservations_today': today_reservations.count(),
                'next_available': next_available,
                'current_attendees': current_reservation.attendees if current_reservation else 0,
            }
        except Room.DoesNotExist:
            return None

    async def reservation_created(self, event):
        """
        Handle reservation creation events.
        Sends notification to WebSocket client when a new reservation is created.
        """
        await self.send_json({
            'type': 'reservation.created',
            'reservation': event.get('reservation'),
            'reservation_id': event.get('reservation_id'),
            'room_id': event.get('room_id'),
            'event_type': event.get('event_type'),
        })

    async def reservation_cancelled(self, event):
        """
        Handle reservation cancellation events.
        Sends notification to WebSocket client when a reservation is cancelled.
        """
        await self.send_json({
            'type': 'reservation.cancelled',
            'reservation': event.get('reservation'),
            'reservation_id': event.get('reservation_id'),
            'room_id': event.get('room_id'),
            'event_type': event.get('event_type'),
        })

    async def reservation_confirmed(self, event):
        """
        Handle reservation confirmation events.
        Sends notification to WebSocket client when a reservation is confirmed.
        """
        await self.send_json({
            'type': 'reservation.confirmed',
            'reservation': event.get('reservation'),
            'reservation_id': event.get('reservation_id'),
            'room_id': event.get('room_id'),
            'event_type': event.get('event_type'),
        })

    async def reservation_deleted(self, event):
        """
        Handle reservation deletion events.
        Sends notification to WebSocket client when a reservation is deleted.
        """
        await self.send_json({
            'type': 'reservation.deleted',
            'reservation_id': event.get('reservation_id'),
            'room_id': event.get('room_id'),
            'event_type': event.get('event_type'),
        })


class RoomsOverviewConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for monitoring all rooms at once.
    Provides a live overview of all room statuses and broadcasts updates
    when any reservation changes in any room.
    """

    async def connect(self):
        """
        Handle WebSocket connection.
        Adds the client to the global rooms overview group.
        """
        self.group_name = 'rooms_overview'
        self.heartbeat_task = None

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send initial status of all rooms
        all_statuses = await self.get_all_rooms_status()
        await self.send_json({
            'type': 'rooms.status',
            'rooms': all_statuses
        })

        # Start heartbeat task (every 60 seconds for overview)
        self.heartbeat_task = asyncio.create_task(self.send_heartbeat())

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Removes the client from the overview group and stops heartbeat.
        """
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
            try:
                await self.heartbeat_task
            except asyncio.CancelledError:
                pass

        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_heartbeat(self):
        """
        Periodically send heartbeat messages with all rooms status.
        Runs every 60 seconds.
        """
        try:
            while True:
                await asyncio.sleep(60)
                all_statuses = await self.get_all_rooms_status()
                await self.send_json({
                    'type': 'heartbeat',
                    'rooms': all_statuses,
                    'timestamp': timezone.now().isoformat()
                })
        except asyncio.CancelledError:
            pass

    @database_sync_to_async
    def get_all_rooms_status(self):
        """
        Get current occupancy status for all active rooms.
        """
        rooms = Room.objects.filter(is_active=True)
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

            # Occupancy status
            occupancy_status = 'free'
            time_until_free = None
            if is_occupied:
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

        return room_statuses

    async def room_update(self, event):
        """
        Handle room update events from any room.
        Sends notification when any reservation changes.
        """
        await self.send_json({
            'type': 'room.update',
            'room_id': event.get('room_id'),
            'event_type': event.get('event_type'),
            'reservation': event.get('reservation'),
        })
