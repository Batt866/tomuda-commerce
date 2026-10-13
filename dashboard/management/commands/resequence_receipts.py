from __future__ import annotations

from django.core.management.base import BaseCommand

from dashboard.models import AppState
from dashboard.receipt_seq import ensure_chrono_receipt_seqs, resequence_order_receipts
from dashboard.seed_data import default_state


class Command(BaseCommand):
    help = "Renumber zarlaga receipt № by taken day + time within each month."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Persist renumbered receipt sequences to the database.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-run even if settings.receiptSeqChronoV2 is already set.",
        )

    def handle(self, *args, **options):
        row = AppState.objects.filter(key="main").first()
        if not row:
            self.stdout.write("No AppState row found.")
            return

        data = row.data or default_state()
        _, seq_changed = resequence_order_receipts(data)
        cleaned, persist = ensure_chrono_receipt_seqs(data, force=options["force"])

        self.stdout.write(
            f"Receipt seq changes: {seq_changed}. Persist markers: {persist}."
        )
        if not options["apply"]:
            self.stdout.write("Dry run only. Re-run with --apply to persist.")
            return
        if not persist and not options["force"]:
            self.stdout.write("Already up to date.")
            return

        row.data = cleaned
        row.save(update_fields=["data", "updated_at"])
        self.stdout.write(self.style.SUCCESS("Resequenced receipts saved."))
