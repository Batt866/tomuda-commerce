from __future__ import annotations

from django.core.management.base import BaseCommand

from dashboard.models import AppState
from dashboard.product_images import remirror_missing_product_images
from dashboard.seed_data import default_state


class Command(BaseCommand):
    help = "Download and mirror product images into media/products."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change without writing files/state.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Maximum number of products to process (0 = all).",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Re-download even when a local media image already exists.",
        )
        parser.add_argument(
            "--timeout",
            type=int,
            default=8,
            help="Seconds to wait for each external image request.",
        )

    def handle(self, *args, **options):
        row, _ = AppState.objects.get_or_create(
            key="main",
            defaults={"data": default_state()},
        )
        state = dict(row.data or default_state())
        dry_run = bool(options.get("dry_run"))
        force = bool(options.get("force"))
        limit = max(0, int(options.get("limit") or 0))
        timeout = max(1, int(options.get("timeout") or 8))

        if dry_run:
            from dashboard.product_images import (
                find_stored_product_image_url,
                remote_product_image_source,
            )

            products = [
                p for p in (state.get("products") or []) if isinstance(p, dict)
            ]
            mirrored = 0
            processed = 0
            for product in products:
                if limit and processed >= limit:
                    break
                pid = str(product.get("id") or "").strip()
                processed += 1
                if not pid:
                    continue
                if find_stored_product_image_url(pid) and not force:
                    continue
                image_url = remote_product_image_source(product, timeout=timeout)
                if not image_url:
                    continue
                mirrored += 1
                self.stdout.write(f"DRY-RUN mirror {pid} <- {image_url}")
            self.stdout.write(
                f"Sync finished: processed={processed}, mirrored={mirrored} (dry-run)"
            )
            return

        previous_images = [
            str(p.get("image") or "")
            for p in (state.get("products") or [])
            if isinstance(p, dict)
        ]
        state, report = remirror_missing_product_images(
            state,
            timeout=timeout,
            limit=limit,
            force=force,
        )
        next_images = [
            str(p.get("image") or "")
            for p in (state.get("products") or [])
            if isinstance(p, dict)
        ]
        if previous_images != next_images:
            row.data = state
            row.save(update_fields=["data", "updated_at"])
        for pid in report.get("mirroredIds") or []:
            self.stdout.write(self.style.SUCCESS(f"Mirrored {pid}"))

        self.stdout.write(
            "Sync finished: "
            f"processed={report['processed']}, mirrored={report['mirrored']}, "
            f"skipped_existing={report['skippedExisting']}, "
            f"skipped_no_source={report['skippedNoSource']}, errors={report['errors']}"
        )
