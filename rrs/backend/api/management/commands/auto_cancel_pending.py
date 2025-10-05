"""
Management command to auto-cancel pending reservations that have not been confirmed after 15 minutes.
This should be run periodically via cron job or scheduler.
Usage: python manage.py auto_cancel_pending
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import Reservation, ActivityLog


class Command(BaseCommand):
    help = 'Auto-cancel pending reservations that have not been confirmed after 15 minutes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--minutes',
            type=int,
            default=15,
            help='Cancel reservations pending for more than this many minutes (default: 15)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be cancelled without actually cancelling'
        )

    def handle(self, *args, **options):
        minutes = options['minutes']
        dry_run = options['dry_run']

        cutoff_time = timezone.now() - timedelta(minutes=minutes)

        # Find pending reservations older than cutoff time
        pending_reservations = Reservation.objects.filter(
            status='pending',
            created_at__lt=cutoff_time
        )

        count = pending_reservations.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would auto-cancel {count} pending reservations older than {minutes} minutes'
                )
            )
            for res in pending_reservations:
                self.stdout.write(
                    f'  - Reservation {res.id}: {res.room.name} on {res.date} at {res.start_time}'
                )
            return

        # Auto-cancel pending reservations
        cancelled_count = 0
        for reservation in pending_reservations:
            reservation.status = 'cancelled'
            reservation.save()

            # Log activity
            ActivityLog.objects.create(
                user=reservation.user,
                action='reservation_cancelled',
                room=reservation.room,
                reservation=reservation,
                description=f'Auto-cancelled reservation for {reservation.room.name} due to no confirmation within {minutes} minutes'
            )
            cancelled_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully auto-cancelled {cancelled_count} pending reservations'
            )
        )
