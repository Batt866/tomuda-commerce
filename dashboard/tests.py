from __future__ import annotations

import tempfile
from pathlib import Path

from django.test import TestCase, override_settings

from dashboard.models import AppState, ProductImage
from dashboard.product_images import (
    find_stored_product_image_url,
    hydrate_product_images,
    save_product_image_bytes,
)
from dashboard.seed_data import default_state


@override_settings(SECURE_SSL_REDIRECT=False)
class ProductImageStorageTests(TestCase):
    def test_product_image_serves_from_db_when_media_file_is_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            with override_settings(MEDIA_ROOT=Path(tmp), MEDIA_URL="/media/"):
                raw = b"image-bytes-for-db-fallback" * 3
                url = save_product_image_bytes("prod-1", raw, "png")

                self.assertIn("/media/products/prod-1.png", url)
                self.assertTrue(ProductImage.objects.filter(product_id="prod-1").exists())

                media_file = Path(tmp) / "products" / "prod-1.png"
                media_file.unlink()

                stored_url = find_stored_product_image_url("prod-1")
                self.assertIn("/media/products/prod-1.png", stored_url)

                response = self.client.get("/media/products/prod-1.png")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response["Content-Type"], "image/png")
                self.assertEqual(response.content, raw)

    def test_hydrate_keeps_media_url_when_storage_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            with override_settings(MEDIA_ROOT=Path(tmp), MEDIA_URL="/media/"):
                state = {
                    "products": [
                        {
                            "id": "missing-prod",
                            "name": "Missing",
                            "image": "/media/products/missing-prod.jpg?v=1",
                        }
                    ]
                }

                next_state, changed = hydrate_product_images(state)

                self.assertFalse(changed)
                self.assertEqual(
                    next_state["products"][0]["image"],
                    "/media/products/missing-prod.jpg?v=1",
                )

    def test_existing_media_file_is_backfilled_to_db(self):
        with tempfile.TemporaryDirectory() as tmp:
            with override_settings(MEDIA_ROOT=Path(tmp), MEDIA_URL="/media/"):
                media_dir = Path(tmp) / "products"
                media_dir.mkdir(parents=True)
                raw = b"existing-media-file" * 3
                (media_dir / "old-prod.jpg").write_bytes(raw)

                url = find_stored_product_image_url("old-prod")

                self.assertIn("/media/products/old-prod.jpg", url)
                image = ProductImage.objects.get(product_id="old-prod")
                self.assertEqual(bytes(image.image), raw)
                self.assertEqual(image.content_type, "image/jpeg")

    def test_save_state_returns_cleaned_state(self):
        with tempfile.TemporaryDirectory() as tmp:
            with override_settings(MEDIA_ROOT=Path(tmp), MEDIA_URL="/media/"):
                product = {
                    "id": "missing-prod",
                    "barcode": "123",
                    "name": "Missing",
                    "category": "Бусад",
                    "unit": "ширхэг",
                    "boxQuantity": 1,
                    "price": 1000,
                    "costPrice": 0,
                    "stock": 0,
                    "minStock": 0,
                    "country": "Монгол",
                    "image": "",
                }
                initial = default_state()
                initial["products"] = [dict(product)]
                state = default_state()
                state["products"] = [
                    {**product, "image": "/media/products/missing-prod.jpg?v=1"}
                ]
                AppState.objects.create(key="main", data=initial)

                response = self.client.post(
                    "/api/state",
                    {
                        "state": state,
                        "actor": {"id": "admin", "email": "admin@tomuda.mn"},
                    },
                    content_type="application/json",
                )

                self.assertEqual(response.status_code, 200)
                payload = response.json()
                self.assertEqual(
                    payload["state"]["products"][0]["image"],
                    "/media/products/missing-prod.jpg?v=1",
                )
