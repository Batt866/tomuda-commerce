"""Save product images as files instead of bloating AppState JSON."""

from __future__ import annotations

import base64
import re
import time
from pathlib import Path

from django.conf import settings

DATA_URL_RE = re.compile(
    r"^data:image/(?P<fmt>jpeg|jpg|png|webp|gif);base64,(?P<data>.+)$",
    re.IGNORECASE | re.DOTALL,
)
MAX_IMAGE_BYTES = 300_000


def product_image_dir() -> Path:
    path = Path(settings.MEDIA_ROOT) / "products"
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_product_id(product_id: str) -> str:
    clean = re.sub(r"[^\w.-]", "", str(product_id or "").strip())
    if not clean:
        raise ValueError("Барааны ID буруу байна")
    return clean


def decode_data_url(data_url: str) -> tuple[bytes, str]:
    text = str(data_url or "").strip()
    match = DATA_URL_RE.match(text)
    if not match:
        raise ValueError("Зурагны формат буруу байна")
    raw = base64.b64decode(match.group("data"), validate=True)
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("Зураг хэт том байна")
    if len(raw) < 32:
        raise ValueError("Зураг хоосон байна")
    fmt = match.group("fmt").lower()
    ext = "jpg" if fmt in {"jpg", "jpeg"} else fmt
    return raw, ext


def save_product_image(product_id: str, data_url: str) -> str:
    pid = safe_product_id(product_id)
    raw, ext = decode_data_url(data_url)
    directory = product_image_dir()
    for old in directory.glob(f"{pid}.*"):
        try:
            old.unlink()
        except OSError:
            pass
    filename = f"{pid}.{ext}"
    (directory / filename).write_bytes(raw)
    version = int(time.time())
    return f"{settings.MEDIA_URL}products/{filename}?v={version}"


def update_product_image_in_state(state: dict, product_id: str, url: str) -> bool:
    for product in state.get("products") or []:
        if isinstance(product, dict) and str(product.get("id")) == str(product_id):
            product["image"] = url
            return True
    return False
