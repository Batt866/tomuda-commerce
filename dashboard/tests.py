from __future__ import annotations

import io
import re
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.test import Client, SimpleTestCase
from openpyxl import Workbook, load_workbook

from dashboard.excel_import import (
    PRODUCT_HEADERS,
    import_products_into_state,
    load_sheet_rows,
)
from dashboard.product_images import persist_imported_product_images


PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x04\x00\x00\x00\xb5\x1c\x0c\x02\x00\x00\x00\x0bIDATx\xdac\xfc"
    b"\xff\x1f\x00\x03\x03\x02\x00\xef\xbf\xa7\xdb\x00\x00\x00\x00IEND\xaeB`\x82"
)


class ProductImportTests(SimpleTestCase):
    def test_product_template_download_is_xlsx_file(self):
        response = Client().get("/api/import/products/template", secure=True)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Content-Type"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.assertIn('filename="baraa-format.xlsx"', response["Content-Disposition"])

        workbook = load_workbook(io.BytesIO(response.content), read_only=True)
        self.assertEqual(workbook.sheetnames, ["Бараа"])
        worksheet = workbook["Бараа"]
        self.assertEqual(
            [cell.value for cell in next(worksheet.iter_rows(min_row=1, max_row=1))],
            PRODUCT_HEADERS,
        )

    def test_import_format_errors_include_xlsx_guidance(self):
        with self.assertRaisesRegex(ValueError, r"\.xlsx"):
            load_sheet_rows(b"not-excel", "products.txt")

        with self.assertRaisesRegex(ValueError, r"\.xlsx"):
            import_products_into_state({"products": []}, [["Wrong", "Header"]])

    def test_product_import_saves_valid_rows_and_reports_invalid_rows(self):
        rows = [
            PRODUCT_HEADERS,
            ["1111111111111", "Valid one", "ширхэг", "1200", "900", "Монгол", ""],
            ["", "Missing barcode", "ширхэг", "1200", "900", "Монгол", ""],
            ["2222222222222", "", "ширхэг", "1200", "900", "Монгол", ""],
            ["3333333333333", "Bad price", "ширхэг", "abc", "900", "Монгол", ""],
        ]

        next_state, report = import_products_into_state({"products": []}, rows)

        self.assertEqual(report["total"], 4)
        self.assertEqual(report["success"], 1)
        self.assertEqual(report["failed"], 3)
        self.assertEqual([error["row"] for error in report["errors"]], [3, 4, 5])
        self.assertEqual(len(next_state["products"]), 1)
        self.assertEqual(next_state["products"][0]["barcode"], "1111111111111")

    def test_product_import_mirrors_image_url_to_media(self):
        rows = [
            PRODUCT_HEADERS,
            [
                "1234567890123",
                "Excel бараа",
                "ширхэг",
                "1200",
                "900",
                "Монгол",
                "https://example.com/product.png",
            ],
        ]
        state = {"products": []}
        next_state, report = import_products_into_state(state, rows)

        with TemporaryDirectory() as tmpdir, self.settings(
            MEDIA_ROOT=Path(tmpdir),
            MEDIA_URL="/media/",
        ), patch("dashboard.product_images.fetch_image_bytes", return_value=(PNG_BYTES, "png")):
            image_report = persist_imported_product_images(
                next_state,
                previous_state=state,
                product_ids=report["_productIds"],
            )

            product = next_state["products"][0]
            product_id = product["id"]
            self.assertEqual(image_report["imageSuccess"], 1)
            self.assertEqual(image_report["imageSkipped"], 0)
            self.assertRegex(
                product["image"],
                rf"^/media/products/{re.escape(product_id)}\.png\?v=\d+$",
            )
            self.assertTrue((Path(tmpdir) / "products" / f"{product_id}.png").is_file())

    def test_product_import_rejects_existing_barcode_without_updating_product(self):
        state = {
            "products": [
                {
                    "id": "p1",
                    "barcode": "1234567890123",
                    "name": "Old",
                    "category": "Бусад",
                    "unit": "ширхэг",
                    "price": 1000,
                    "costPrice": 700,
                    "stock": 3,
                    "minStock": 0,
                    "country": "Монгол",
                    "image": "/media/products/p1.jpg?v=1",
                }
            ]
        }
        rows = [
            PRODUCT_HEADERS,
            ["1234567890123", "Updated", "ширхэг", "1500", "800", "Монгол", "not-a-url"],
        ]

        next_state, report = import_products_into_state(state, rows)

        self.assertEqual(report["total"], 1)
        self.assertEqual(report["success"], 0)
        self.assertEqual(report["failed"], 1)
        self.assertEqual(report["errors"][0]["row"], 2)
        self.assertEqual(
            report["errors"][0]["message"],
            "Али хэдийн бүртгэгдсэн product байна.",
        )
        self.assertEqual(next_state["products"][0]["name"], "Old")
        self.assertEqual(len(next_state["products"]), 1)

    def test_product_import_skips_invalid_or_nan_image_for_new_products(self):
        state = {"products": []}
        rows = [
            PRODUCT_HEADERS,
            ["1234567890123", "Invalid image", "ширхэг", "1500", "800", "Монгол", "not-a-url"],
            ["9876543210987", "New no image", "ширхэг", "1000", "600", "Монгол", "NaN"],
        ]
        next_state, report = import_products_into_state(state, rows)

        with TemporaryDirectory() as tmpdir, self.settings(
            MEDIA_ROOT=Path(tmpdir),
            MEDIA_URL="/media/",
        ):
            image_report = persist_imported_product_images(
                next_state,
                previous_state=state,
                product_ids=report["_productIds"],
            )

        by_barcode = {p["barcode"]: p for p in next_state["products"]}
        self.assertEqual(report["success"], 2)
        self.assertEqual(image_report["imageSuccess"], 0)
        self.assertEqual(image_report["imageSkipped"], 1)
        self.assertEqual(by_barcode["1234567890123"]["image"], "")
        self.assertEqual(by_barcode["9876543210987"]["image"], "")

    def test_product_import_reads_misnamed_xlsx_upload_with_xls_extension(self):
        wb = Workbook()
        ws = wb.active
        ws.title = "Бараа"
        ws.append(PRODUCT_HEADERS)
        ws.append(
            ["5555555555555", "Misnamed xlsx", "ширхэг", "3200", "1700", "Монгол", ""]
        )
        buf = io.BytesIO()
        wb.save(buf)

        rows = load_sheet_rows(buf.getvalue(), "products.xls")
        next_state, report = import_products_into_state({"products": []}, rows)

        self.assertEqual(report["success"], 1)
        self.assertEqual(next_state["products"][0]["barcode"], "5555555555555")

    def test_product_import_reads_legacy_xls_matching_sheet(self):
        class FakeSheet:
            def __init__(self, rows):
                self._rows = rows
                self.nrows = len(rows)
                self.ncols = max(len(row) for row in rows)

            def cell_value(self, row, col):
                values = self._rows[row]
                return values[col] if col < len(values) else ""

        class FakeBook:
            def __init__(self, sheets):
                self._sheets = sheets
                self.nsheets = len(sheets)

            def sheet_by_index(self, idx):
                return self._sheets[idx]

        fake_book = FakeBook(
            [
                FakeSheet([["Тайлбар"], ["энэ sheet биш"]]),
                FakeSheet(
                    [
                        PRODUCT_HEADERS,
                        [
                            "6666666666666",
                            "Legacy xls",
                            "ширхэг",
                            4500,
                            2200,
                            "Монгол",
                            "",
                        ],
                    ]
                ),
            ]
        )

        with patch("xlrd.open_workbook", return_value=fake_book):
            rows = load_sheet_rows(b"legacy-xls", "products.xls")
        next_state, report = import_products_into_state({"products": []}, rows)

        self.assertEqual(report["success"], 1)
        self.assertEqual(next_state["products"][0]["barcode"], "6666666666666")

    def test_xlsx_product_template_rows_are_loaded_without_embedded_image_support(self):
        wb = Workbook()
        ws = wb.active
        ws.title = "Бараа"
        ws.append(PRODUCT_HEADERS)
        ws.append(
            [
                "9876543210987",
                "URL product",
                "ширхэг",
                "2400",
                "1200",
                "Монгол",
                "https://example.com/item.jpg",
            ]
        )
        buf = io.BytesIO()
        wb.save(buf)

        rows = load_sheet_rows(buf.getvalue(), "products.xlsx")
        next_state, report = import_products_into_state({"products": []}, rows)

        self.assertEqual(report["success"], 1)
        self.assertEqual(next_state["products"][0]["image"], "https://example.com/item.jpg")
