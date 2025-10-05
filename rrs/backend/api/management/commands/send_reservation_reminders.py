"""
Management command to send reminder notifications 10 minutes before reservation starts.
This should be run periodically (every minute) via cron job or scheduler.
Usage: python manage.py send_reservation_reminders
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from api.models import Reservation, UserProfile
from django.core.mail import send_mail
from django.conf import settings


class Command(BaseCommand):
    help = 'Send reminder notifications 10 minutes before reservation starts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--minutes-before',
            type=int,
            default=10,
            help='Send reminders this many minutes before reservation starts (default: 10)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what reminders would be sent without actually sending'
        )

    def handle(self, *args, **options):
        minutes_before = options['minutes_before']
        dry_run = options['dry_run']

        now = timezone.now()
        target_time = now + timedelta(minutes=minutes_before)

        # Find window of 1 minute (to account for command running periodically)
        start_window = target_time
        end_window = target_time + timedelta(minutes=1)

        # Find reservations starting within the target window that haven't been reminded yet
        upcoming_reservations = Reservation.objects.filter(
            date=target_time.date(),
            start_time__gte=start_window.time(),
            start_time__lt=end_window.time(),
            status='confirmed',
            reminder_sent=False
        ).select_related('user', 'room')

        count = upcoming_reservations.count()

        if count == 0:
            self.stdout.write(
                self.style.WARNING(
                    f'No upcoming reservations found that need reminders'
                )
            )
            return

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would send reminders for {count} reservations'
                )
            )
            for res in upcoming_reservations:
                self.stdout.write(
                    f'  - {res.user.username}: {res.room.name} at {res.start_time}'
                )
            return

        # Send reminders
        sent_count = 0
        for reservation in upcoming_reservations:
            # Check if user has email reminders enabled
            try:
                profile = UserProfile.objects.get(user=reservation.user)
                if not profile.email_reminders:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Skipping {reservation.user.username} - email reminders disabled'
                        )
                    )
                    reservation.reminder_sent = True
                    reservation.save()
                    continue
            except UserProfile.DoesNotExist:
                pass

            # Send email reminder
            try:
                subject = f'Reminder: Room Reservation in {minutes_before} minutes'
                message = f"""
Hello {reservation.user.username},

This is a reminder that your room reservation is starting in {minutes_before} minutes.

Room: {reservation.room.name} ({reservation.room.building})
Date: {reservation.date}
Time: {reservation.start_time} - {reservation.end_time}
Purpose: {reservation.purpose}
Attendees: {reservation.attendees}

Please arrive on time!

Best regards,
Room Reservation System
                """

                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [reservation.contact_email],
                    fail_silently=False,
                )

                # Mark reminder as sent
                reservation.reminder_sent = True
                reservation.save()
                sent_count += 1

                self.stdout.write(
                    self.style.SUCCESS(
                        f'Sent reminder to {reservation.user.username} for {reservation.room.name}'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Failed to send reminder to {reservation.user.username}: {str(e)}'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully sent {sent_count} reminders'
            )
        )
