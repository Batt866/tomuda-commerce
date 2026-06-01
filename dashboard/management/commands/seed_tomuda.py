from django.core.management.base import BaseCommand

from dashboard.models import AppState
from dashboard.seed_data import default_state


class Command(BaseCommand):
    help = "Seed TOMUDA backend with real product names and matching image URLs."

    def handle(self, *args, **options):
        AppState.objects.update_or_create(
            key="main",
            defaults={"data": default_state()},
        )
        self.stdout.write(self.style.SUCCESS("TOMUDA backend seed data updated."))
