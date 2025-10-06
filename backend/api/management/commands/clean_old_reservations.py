"""
Management command to clean old reservations from the database.
Usage: python manage.py clean_old_reservations --days=30
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import Reservation


class Command(BaseCommand):
    help = 'Clean old reservations from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=90,
            help='Delete reservations older than this many days (default: 90)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']

        cutoff_date = timezone.now().date() - timedelta(days=days)

        # Find old reservations
        old_reservations = Reservation.objects.filter(
            date__lt=cutoff_date
        )

        count = old_reservations.count()

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would delete {count} reservations older than {days} days (before {cutoff_date})'
                )
            )
            return

        # Delete old reservations
        deleted_count, _ = old_reservations.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully deleted {deleted_count} reservations older than {days} days'
            )
        )
