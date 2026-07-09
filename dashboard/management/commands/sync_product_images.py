from __future__ import annotations

from django.core.management.base import BaseCommand

from dashboard.models import AppState
from dashboard.product_images import (
    find_stored_product_image_url,
    lookup_openfoodfacts_image,
    mirror_product_image,
    product_media_path_from_url,
)
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
        products = [p for p in (state.get("products") or []) if isinstance(p, dict)]

        dry_run = bool(options.get("dry_run"))
        force = bool(options.get("force"))
        limit = max(0, int(options.get("limit") or 0))
        timeout = max(1, int(options.get("timeout") or 8))

        total = 0
        mirrored = 0
        skipped_existing = 0
        skipped_no_source = 0
        errors = 0
        changed = False

        for product in products:
            if limit and total >= limit:
                break
            total += 1
            pid = str(product.get("id") or "").strip()
            if not pid:
                skipped_no_source += 1
                continue

            existing_local = find_stored_product_image_url(pid)
            if existing_local and not force:
                if str(product.get("image") or "").strip() != existing_local:
                    product["image"] = existing_local
                    changed = True
                skipped_existing += 1
                continue

            image_url = str(product.get("image") or "").strip()
            if product_media_path_from_url(image_url):
                image_url = ""
            if not image_url.startswith(("http://", "https://")):
                image_url = lookup_openfoodfacts_image(
                    product.get("barcode"),
                    timeout=timeout,
                )
            if not image_url:
                skipped_no_source += 1
                continue

            if dry_run:
                mirrored += 1
                self.stdout.write(f"DRY-RUN mirror {pid} <- {image_url}")
                continue

            try:
                local_url = mirror_product_image(pid, image_url, timeout=timeout)
            except ValueError as exc:
                errors += 1
                self.stdout.write(self.style.WARNING(f"{pid}: {exc}"))
                continue

            if str(product.get("image") or "").strip() != local_url:
                product["image"] = local_url
                changed = True
            mirrored += 1
            self.stdout.write(self.style.SUCCESS(f"Mirrored {pid}"))

        if changed and not dry_run:
            state["products"] = products
            row.data = state
            row.save(update_fields=["data", "updated_at"])

        self.stdout.write(
            "Sync finished: "
            f"processed={total}, mirrored={mirrored}, "
            f"skipped_existing={skipped_existing}, "
            f"skipped_no_source={skipped_no_source}, errors={errors}"
        )
