from __future__ import annotations

from django.core.management.base import BaseCommand

from dashboard.models import AppState
from dashboard.seed_data import default_state
from dashboard.state_sanitize import sanitize_app_state


class Command(BaseCommand):
    help = "Remove oversized inline images from AppState to keep API responses fast."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persist sanitized state to the database.",
        )

    def handle(self, *args, **options):
        row = AppState.objects.filter(key="main").first()
        if not row:
            self.stdout.write("No AppState row found.")
            return

        before = len(str(row.data or ""))
        cleaned, changed = sanitize_app_state(row.data or default_state())
        after = len(str(cleaned))

        if not changed:
            self.stdout.write(f"State already clean ({after:,} chars).")
            return

        self.stdout.write(
            f"State shrink: {before:,} -> {after:,} chars "
            f"({100 - int(after * 100 / max(before, 1))}% smaller)"
        )

        if options["apply"]:
            row.data = cleaned
            row.save(update_fields=["data", "updated_at"])
            self.stdout.write(self.style.SUCCESS("Sanitized state saved."))
        else:
            self.stdout.write("Dry run only. Re-run with --apply to persist.")
