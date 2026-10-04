from django.core.management.base import BaseCommand

from dashboard.models import AppState
from dashboard.seed_data import default_state


class Command(BaseCommand):
    help = "Seed TOMUDA backend with real product names and matching image URLs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--only-if-empty",
            action="store_true",
            help="Skip seeding when main AppState already exists.",
        )

    def handle(self, *args, **options):
        if options["only_if_empty"] and AppState.objects.filter(key="main").exists():
            self.stdout.write("TOMUDA seed skipped — data already exists.")
            return
        AppState.objects.update_or_create(
            key="main",
            defaults={"data": default_state()},
        )
        self.stdout.write(self.style.SUCCESS("TOMUDA backend seed data updated."))
