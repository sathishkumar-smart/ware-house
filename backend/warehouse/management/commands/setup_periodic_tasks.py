"""Create or update the celery-beat periodic tasks in the database."""
from django.core.management.base import BaseCommand
from django.utils import timezone


class Command(BaseCommand):
    help = "Register scheduled celery-beat tasks in the database"

    def handle(self, *args, **options):
        try:
            from django_celery_beat.models import CrontabSchedule, PeriodicTask
        except ImportError:
            self.stderr.write("django_celery_beat not installed — skipping.")
            return

        # Daily low-stock alert at 8:00 AM IST
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute="0",
            hour="8",
            day_of_week="*",
            day_of_month="*",
            month_of_year="*",
            timezone="Asia/Kolkata",
        )
        _, created = PeriodicTask.objects.update_or_create(
            name="Daily Low-Stock Alert",
            defaults={
                "task": "warehouse.tasks.send_daily_low_stock_alert",
                "crontab": schedule,
                "enabled": True,
                "start_time": timezone.now(),
            },
        )
        self.stdout.write(self.style.SUCCESS(
            f"{'Created' if created else 'Updated'} periodic task: Daily Low-Stock Alert (08:00 IST)"
        ))
