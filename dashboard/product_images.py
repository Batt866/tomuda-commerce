"""Save product images as files instead of bloating AppState JSON."""

from __future__ import annotations

import base64
import json
import re
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

from django.conf import settings

from dashboard.models import ProductImage

DATA_URL_RE = re.compile(
    r"^data:image/(?P<fmt>jpeg|jpg|png|webp|gif);base64,(?P<data>.+)$",
    re.IGNORECASE | re.DOTALL,
)
MAX_IMAGE_BYTES = 300_000
OPENFOODFACTS_FIELDS = "image_url"
IMAGE_MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}
IMAGE_EXT_TO_MIME = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",
}


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


def save_product_image_bytes(product_id: str, raw: bytes, ext: str) -> str:
    pid = safe_product_id(product_id)
    clean_ext = str(ext or "").lower()
    if clean_ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise ValueError("Зурагны формат буруу байна")
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("Зураг хэт том байна")
    if len(raw) < 32:
        raise ValueError("Зураг хоосон байна")
    final_ext = "jpg" if clean_ext in {"jpg", "jpeg"} else clean_ext
    content_type = IMAGE_EXT_TO_MIME[final_ext]

    image, _ = ProductImage.objects.update_or_create(
        product_id=pid,
        defaults={
            "image": raw,
            "content_type": content_type,
            "ext": final_ext,
        },
    )

    try:
        directory = product_image_dir()
        for old in directory.glob(f"{pid}.*"):
            try:
                old.unlink()
            except OSError:
                pass
        filename = f"{pid}.{final_ext}"
        (directory / filename).write_bytes(raw)
    except OSError:
        # The DB copy is the durable source; media files are only a fast path.
        pass

    version = int(image.updated_at.timestamp()) if image.updated_at else int(time.time())
    return product_image_url(pid, final_ext, version)


def product_image_url(product_id: str, ext: str, version: int | None = None) -> str:
    pid = safe_product_id(product_id)
    final_ext = "jpg" if str(ext or "").lower() in {"jpg", "jpeg"} else str(ext or "").lower()
    filename = f"{pid}.{final_ext}"
    version = int(version or time.time())
    return f"{settings.MEDIA_URL}products/{filename}?v={version}"


def save_product_image(product_id: str, data_url: str) -> str:
    raw, ext = decode_data_url(data_url)
    return save_product_image_bytes(product_id, raw, ext)


def fetch_image_bytes(url: str) -> tuple[bytes, str]:
    source = str(url or "").strip()
    if not source.startswith(("http://", "https://")):
        raise ValueError("Зурагны холбоос буруу байна")
    req = Request(
        source,
        headers={
            "Accept": "image/webp,image/jpeg,image/png,image/gif,*/*;q=0.8",
            "User-Agent": "tomuda-image-sync/1.0",
        },
    )
    try:
        with urlopen(req, timeout=20) as response:
            content_type = str(response.headers.get("Content-Type") or "")
            mime = content_type.split(";", 1)[0].strip().lower()
            ext = IMAGE_MIME_TO_EXT.get(mime, "")
            if not ext:
                raise ValueError("Зурагны формат буруу байна")
            raw = response.read(MAX_IMAGE_BYTES + 1)
    except (HTTPError, URLError):
        raise ValueError("Зураг татаж чадсангүй")
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("Зураг хэт том байна")
    if len(raw) < 32:
        raise ValueError("Зураг хоосон байна")
    return raw, ext


def mirror_product_image(product_id: str, source_url: str) -> str:
    raw, ext = fetch_image_bytes(source_url)
    return save_product_image_bytes(product_id, raw, ext)


def lookup_openfoodfacts_image(barcode: str) -> str:
    digits = re.sub(r"\D", "", str(barcode or ""))
    if not digits:
        return ""
    endpoint = (
        "https://world.openfoodfacts.org/api/v2/product/"
        f"{quote(digits)}.json?fields={OPENFOODFACTS_FIELDS}"
    )
    req = Request(
        endpoint,
        headers={"Accept": "application/json", "User-Agent": "tomuda-image-sync/1.0"},
    )
    try:
        with urlopen(req, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, json.JSONDecodeError):
        return ""
    product = payload.get("product") if isinstance(payload, dict) else {}
    image_url = str((product or {}).get("image_url") or "").strip()
    return image_url if image_url.startswith(("http://", "https://")) else ""


def update_product_image_in_state(state: dict, product_id: str, url: str) -> bool:
    for product in state.get("products") or []:
        if isinstance(product, dict) and str(product.get("id")) == str(product_id):
            product["image"] = url
            return True
    return False


def find_stored_product_image_url(product_id: str) -> str:
    try:
        pid = safe_product_id(product_id)
    except ValueError:
        return ""
    try:
        directory = product_image_dir()
    except OSError:
        directory = None
    if directory:
        for ext in ("jpg", "jpeg", "png", "webp", "gif"):
            path = directory / f"{pid}.{ext}"
            try:
                if path.is_file() and path.stat().st_size > 32:
                    version = int(path.stat().st_mtime)
                    backfill_product_image_from_file(pid, path, ext)
                    return product_image_url(pid, ext, version)
            except OSError:
                continue
    image = ProductImage.objects.filter(product_id=pid).first()
    if image and image.image and len(image.image) > 32:
        version = int(image.updated_at.timestamp()) if image.updated_at else int(time.time())
        return product_image_url(pid, image.ext or "jpg", version)
    return ""


def backfill_product_image_from_file(product_id: str, path: Path, ext: str) -> None:
    if ProductImage.objects.filter(product_id=product_id).exists():
        return
    clean_ext = "jpg" if str(ext or "").lower() in {"jpg", "jpeg"} else str(ext or "").lower()
    content_type = IMAGE_EXT_TO_MIME.get(clean_ext)
    if not content_type:
        return
    try:
        raw = path.read_bytes()
    except OSError:
        return
    if len(raw) < 32 or len(raw) > MAX_IMAGE_BYTES:
        return
    ProductImage.objects.update_or_create(
        product_id=product_id,
        defaults={
            "image": raw,
            "content_type": content_type,
            "ext": clean_ext,
        },
    )


def get_stored_product_image(product_id: str) -> ProductImage | None:
    try:
        pid = safe_product_id(product_id)
    except ValueError:
        return None
    image = ProductImage.objects.filter(product_id=pid).first()
    if image and image.image and len(image.image) > 32:
        return image
    return None


def product_media_path_from_url(url: str) -> str:
    raw = str(url or "").strip()
    if not raw:
        return ""
    media_url = str(settings.MEDIA_URL or "/media/")
    if not media_url.startswith("/"):
        media_url = f"/{media_url}"
    if raw.startswith(media_url):
        return raw
    if raw.startswith(media_url.lstrip("/")):
        return f"/{raw}"
    if raw.startswith(("http://", "https://")):
        parsed = urlparse(raw)
        if parsed.path.startswith(media_url):
            return f"{parsed.path}{('?' + parsed.query) if parsed.query else ''}"
    return ""


def persist_imported_product_images(
    state: dict,
    *,
    previous_state: dict | None = None,
    product_ids: list[str] | set[str] | tuple[str, ...] | None = None,
) -> dict:
    ids = {str(pid) for pid in product_ids or [] if str(pid or "").strip()}
    previous_images = {
        str(p.get("id")): str(p.get("image") or "").strip()
        for p in (previous_state or {}).get("products") or []
        if isinstance(p, dict) and p.get("id") is not None
    }
    image_success = 0
    image_skipped = 0

    for product in state.get("products") or []:
        if not isinstance(product, dict):
            continue
        pid = str(product.get("id") or "").strip()
        if not pid or (ids and pid not in ids):
            continue
        source = str(product.get("image") or "").strip()
        if not source:
            continue

        local_url = product_media_path_from_url(source)
        if local_url:
            stored_url = find_stored_product_image_url(pid)
            product["image"] = stored_url
            if not stored_url:
                image_skipped += 1
            continue

        normalized_source = f"https:{source}" if source.startswith("//") else source
        previous = previous_images.get(pid, "")
        if product_media_path_from_url(previous) and not find_stored_product_image_url(pid):
            previous = ""
        try:
            if not normalized_source.startswith(("http://", "https://")):
                raise ValueError("Зурагны холбоос буруу байна")
            url = mirror_product_image(pid, normalized_source)
        except Exception:
            product["image"] = previous
            image_skipped += 1
            continue

        product["image"] = url
        image_success += 1

    return {
        "imageSuccess": image_success,
        "imageSkipped": image_skipped,
    }


def hydrate_product_images(state: dict) -> tuple[dict, bool]:
    changed = False
    for product in state.get("products") or []:
        if not isinstance(product, dict):
            continue
        pid = str(product.get("id") or "").strip()
        if not pid:
            continue
        current = str(product.get("image") or "").strip()
        url = find_stored_product_image_url(pid)
        if url:
            if url != current:
                product["image"] = url
                changed = True
            continue
        if product_media_path_from_url(current):
            if current:
                product["image"] = ""
                changed = True
            continue
        if current.startswith("data:image/") and not current.startswith(
            "data:image/svg"
        ):
            continue
        if current.startswith("http") and not current.startswith(
            str(settings.MEDIA_URL)
        ):
            continue
    return state, changed
