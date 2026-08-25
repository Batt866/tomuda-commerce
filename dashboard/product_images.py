"""Save product images as files instead of bloating AppState JSON."""

from __future__ import annotations

import base64
import io
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
FETCH_MAX_BYTES = 8_000_000
FULL_MAX_EDGE = 1200
THUMB_MAX_EDGE = 160
THUMB_JPEG_QUALITY = 72
THUMB_SUFFIX = "_t"
IMAGE_EXTS = ("jpg", "jpeg", "png", "webp", "gif")
OPENFOODFACTS_FIELDS = "image_url,image_front_url,image_front_small_url"
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
    if len(raw) < 32:
        raise ValueError("Зураг хоосон байна")
    fmt = match.group("fmt").lower()
    ext = "jpg" if fmt in {"jpg", "jpeg"} else fmt
    return prepare_product_image_bytes(raw, ext)


def compress_product_image_bytes(raw: bytes) -> tuple[bytes, str] | None:
    if not raw or len(raw) < 32:
        return None
    try:
        from PIL import Image
    except ImportError:
        return None
    try:
        with Image.open(io.BytesIO(raw)) as img:
            img = img.convert("RGB")
            edge = FULL_MAX_EDGE
            quality = 82
            data = b""
            while edge >= 320:
                work = img.copy()
                work.thumbnail((edge, edge), Image.Resampling.LANCZOS)
                q = quality
                while q >= 40:
                    out = io.BytesIO()
                    work.save(out, format="JPEG", quality=q, optimize=True)
                    data = out.getvalue()
                    if 32 <= len(data) <= MAX_IMAGE_BYTES:
                        return data, "jpg"
                    q -= 8
                edge = int(edge * 0.75)
            if 32 <= len(data) <= MAX_IMAGE_BYTES:
                return data, "jpg"
    except Exception:
        return None
    return None


def prepare_product_image_bytes(raw: bytes, ext: str) -> tuple[bytes, str]:
    clean_ext = str(ext or "").lower()
    if clean_ext not in IMAGE_EXT_TO_MIME:
        raise ValueError("Зурагны формат буруу байна")
    if len(raw) < 32:
        raise ValueError("Зураг хоосон байна")
    if len(raw) <= MAX_IMAGE_BYTES:
        final_ext = "jpg" if clean_ext in {"jpg", "jpeg"} else clean_ext
        return raw, final_ext
    compressed = compress_product_image_bytes(raw)
    if compressed:
        return compressed
    raise ValueError("Зураг хэт том байна")


def iter_product_image_files(directory: Path, product_id: str, *, thumb: bool = False):
    pid = str(product_id or "").strip().lower()
    if not pid:
        return
    try:
        entries = list(directory.iterdir())
    except OSError:
        return
    for path in entries:
        if not path.is_file():
            continue
        stem, dot, ext = path.name.rpartition(".")
        if not dot:
            continue
        ext_l = ext.lower()
        if ext_l not in IMAGE_EXT_TO_MIME:
            continue
        stem_l = stem.lower()
        is_thumb = stem_l.endswith(THUMB_SUFFIX)
        if thumb:
            if is_thumb and stem_l[: -len(THUMB_SUFFIX)] == pid:
                yield path, ext_l
        elif not is_thumb and stem_l == pid:
            yield path, ext_l


def find_product_media_file(product_id: str, *, thumb: bool = False) -> tuple[Path | None, str]:
    try:
        pid = safe_product_id(product_id)
        directory = product_image_dir()
    except (OSError, ValueError):
        return None, ""
    for path, ext in iter_product_image_files(directory, pid, thumb=thumb):
        try:
            if path.stat().st_size > 32:
                return path, ext
        except OSError:
            continue
    return None, ""


def make_product_thumb_bytes(raw: bytes) -> bytes | None:
    """Build a small square JPEG thumb (full product, letterboxed). Returns None if decode fails."""
    if not raw or len(raw) < 32:
        return None
    try:
        from PIL import Image
    except ImportError:
        return None
    try:
        with Image.open(io.BytesIO(raw)) as img:
            img = img.convert("RGB")
            img.thumbnail((THUMB_MAX_EDGE, THUMB_MAX_EDGE), Image.Resampling.LANCZOS)
            canvas = Image.new("RGB", (THUMB_MAX_EDGE, THUMB_MAX_EDGE), (255, 255, 255))
            ox = max(0, (THUMB_MAX_EDGE - img.width) // 2)
            oy = max(0, (THUMB_MAX_EDGE - img.height) // 2)
            canvas.paste(img, (ox, oy))
            out = io.BytesIO()
            canvas.save(
                out,
                format="JPEG",
                quality=THUMB_JPEG_QUALITY,
                optimize=True,
            )
            data = out.getvalue()
    except Exception:
        return None
    if len(data) < 32 or len(data) > MAX_IMAGE_BYTES:
        return None
    return data


def clear_product_media_files(product_id: str) -> None:
    pid = safe_product_id(product_id)
    try:
        directory = product_image_dir()
    except OSError:
        return
    for pattern in (f"{pid}.*", f"{pid}{THUMB_SUFFIX}.*"):
        for old in directory.glob(pattern):
            try:
                old.unlink()
            except OSError:
                pass


def write_product_thumb_file(product_id: str, raw: bytes) -> Path | None:
    thumb = make_product_thumb_bytes(raw)
    if not thumb:
        return None
    pid = safe_product_id(product_id)
    try:
        directory = product_image_dir()
        for old in directory.glob(f"{pid}{THUMB_SUFFIX}.*"):
            try:
                old.unlink()
            except OSError:
                pass
        path = directory / f"{pid}{THUMB_SUFFIX}.jpg"
        path.write_bytes(thumb)
        return path
    except OSError:
        return None


def load_product_image_bytes(product_id: str) -> bytes | None:
    pid = safe_product_id(product_id)
    path, _ext = find_product_media_file(pid, thumb=False)
    if path is not None:
        try:
            return path.read_bytes()
        except OSError:
            pass
    image = get_stored_product_image(pid)
    if image and image.image and len(image.image) > 32:
        return bytes(image.image)
    return None


def ensure_product_thumb_bytes(product_id: str) -> bytes | None:
    """Return thumb bytes, generating and caching to disk when missing."""
    pid = safe_product_id(product_id)
    try:
        directory = product_image_dir()
        thumb_path = directory / f"{pid}{THUMB_SUFFIX}.jpg"
        if thumb_path.is_file() and thumb_path.stat().st_size > 32:
            return thumb_path.read_bytes()
    except OSError:
        thumb_path = None

    raw = load_product_image_bytes(pid)
    if not raw:
        return None
    thumb = make_product_thumb_bytes(raw)
    if not thumb:
        return None
    if thumb_path is not None:
        try:
            thumb_path.write_bytes(thumb)
        except OSError:
            pass
    return thumb


def product_thumb_url(product_id: str, version: int | None = None) -> str:
    pid = safe_product_id(product_id)
    version = int(version or time.time())
    return f"{settings.MEDIA_URL}products/{pid}{THUMB_SUFFIX}.jpg?v={version}"


def save_product_image_bytes(product_id: str, raw: bytes, ext: str) -> str:
    pid = safe_product_id(product_id)
    raw, final_ext = prepare_product_image_bytes(raw, ext)
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
        clear_product_media_files(pid)
        directory = product_image_dir()
        filename = f"{pid}.{final_ext}"
        (directory / filename).write_bytes(raw)
        write_product_thumb_file(pid, raw)
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


def ext_from_image_url(url: str) -> str:
    path = urlparse(str(url or "")).path.lower()
    for ext in IMAGE_EXTS:
        if path.endswith(f".{ext}"):
            return "jpg" if ext == "jpeg" else ext
    return ""


def candidate_image_urls(url: str) -> list[str]:
    source = str(url or "").strip()
    if source.startswith("//"):
        source = f"https:{source}"
    urls: list[str] = []
    if source.startswith("http://"):
        urls.append("https://" + source[len("http://") :])
        urls.append(source)
    elif source.startswith("https://"):
        urls.append(source)
    return urls


def fetch_image_bytes(url: str, *, timeout: int = 20) -> tuple[bytes, str]:
    sources = candidate_image_urls(url)
    if not sources:
        raise ValueError("Зурагны холбоос буруу байна")
    last_error = "Зураг татаж чадсангүй"
    for source in sources:
        req = Request(
            source,
            headers={
                "Accept": "image/webp,image/jpeg,image/png,image/gif,*/*;q=0.8",
                "User-Agent": "tomuda-image-sync/1.0",
            },
        )
        try:
            with urlopen(req, timeout=max(1, int(timeout or 20))) as response:
                content_type = str(response.headers.get("Content-Type") or "")
                mime = content_type.split(";", 1)[0].strip().lower()
                ext = IMAGE_MIME_TO_EXT.get(mime, "") or ext_from_image_url(
                    str(response.url or source)
                )
                raw = response.read(FETCH_MAX_BYTES + 1)
        except (HTTPError, TimeoutError, URLError, ValueError):
            last_error = "Зураг татаж чадсангүй"
            continue
        if not ext:
            last_error = "Зурагны формат буруу байна"
            continue
        if len(raw) > FETCH_MAX_BYTES:
            last_error = "Зураг хэт том байна"
            continue
        if len(raw) < 32:
            last_error = "Зураг хоосон байна"
            continue
        return prepare_product_image_bytes(raw, ext)
    raise ValueError(last_error)


def mirror_product_image(
    product_id: str,
    source_url: str,
    *,
    timeout: int = 20,
) -> str:
    raw, ext = fetch_image_bytes(source_url, timeout=timeout)
    return save_product_image_bytes(product_id, raw, ext)


def lookup_openfoodfacts_image(barcode: str, *, timeout: int = 20) -> str:
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
        with urlopen(req, timeout=max(1, int(timeout or 20))) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, TimeoutError, URLError, json.JSONDecodeError):
        return ""
    product = payload.get("product") if isinstance(payload, dict) else {}
    for key in ("image_front_small_url", "image_url", "image_front_url"):
        image_url = str((product or {}).get(key) or "").strip()
        if image_url.startswith("//"):
            image_url = f"https:{image_url}"
        if image_url.startswith(("http://", "https://")):
            return image_url
    return ""


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
    path, ext = find_product_media_file(pid, thumb=False)
    if path is not None:
        try:
            version = int(path.stat().st_mtime)
            backfill_product_image_from_file(pid, path, ext)
            return product_image_url(pid, ext, version)
        except OSError:
            pass
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
    if len(raw) < 32:
        return
    try:
        raw, clean_ext = prepare_product_image_bytes(raw, clean_ext)
        content_type = IMAGE_EXT_TO_MIME[clean_ext]
    except ValueError:
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
    # When product_ids is provided (even as an empty list) restrict processing
    # to exactly those ids. An empty set must mean "no products", not "all";
    # relying on truthiness here reprocessed the whole catalog and silently
    # cleared images for products whose media file is missing on prod.
    restrict_to_ids = product_ids is not None
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
        if not pid or (restrict_to_ids and pid not in ids):
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


def remote_product_image_source(
    product: dict, *, timeout: int = 8, allow_barcode: bool = True
) -> str:
    image_url = str((product or {}).get("image") or "").strip()
    if image_url.startswith("//"):
        image_url = f"https:{image_url}"
    if product_media_path_from_url(image_url):
        image_url = ""
    if image_url.startswith("http://"):
        image_url = "https://" + image_url[len("http://") :]
    if image_url.startswith("https://"):
        return image_url
    if not allow_barcode:
        return ""
    return lookup_openfoodfacts_image(
        (product or {}).get("barcode"),
        timeout=timeout,
    )


def remirror_missing_product_images(
    state: dict,
    *,
    timeout: int = 8,
    limit: int = 0,
    force: bool = False,
    allow_barcode: bool = True,
) -> tuple[dict, dict]:
    mirrored = 0
    skipped_existing = 0
    skipped_no_source = 0
    errors = 0
    attempts = 0
    mirrored_ids: list[str] = []

    for product in state.get("products") or []:
        if not isinstance(product, dict):
            continue
        pid = str(product.get("id") or "").strip()
        if not pid:
            skipped_no_source += 1
            continue

        existing_local = find_stored_product_image_url(pid)
        if existing_local and not force:
            if str(product.get("image") or "").strip() != existing_local:
                product["image"] = existing_local
            skipped_existing += 1
            continue

        if limit and attempts >= limit:
            break
        attempts += 1

        image_url = remote_product_image_source(
            product, timeout=timeout, allow_barcode=allow_barcode
        )
        if not image_url:
            skipped_no_source += 1
            continue
        try:
            local_url = mirror_product_image(pid, image_url, timeout=timeout)
        except Exception:
            errors += 1
            continue
        if str(product.get("image") or "").strip() != local_url:
            product["image"] = local_url
        mirrored += 1
        mirrored_ids.append(pid)

    return state, {
        "processed": skipped_existing + attempts,
        "mirrored": mirrored,
        "mirroredIds": mirrored_ids,
        "skippedExisting": skipped_existing,
        "skippedNoSource": skipped_no_source,
        "errors": errors,
    }


def hydrate_product_images(
    state: dict,
    *,
    remirror: bool = True,
    remirror_limit: int = 8,
    remirror_timeout: int = 6,
) -> tuple[dict, bool]:
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
        # Keep existing media paths — files may be served from ProductImage DB
        # even when the on-disk copy is missing, and clearing here makes images
        # disappear after unrelated state syncs.
        if product_media_path_from_url(current):
            continue
        if current.startswith("data:image/") and not current.startswith(
            "data:image/svg"
        ):
            continue
        if current.startswith("http") and not current.startswith(
            str(settings.MEDIA_URL)
        ):
            continue
    if remirror:
        before = [
            str(p.get("image") or "")
            for p in (state.get("products") or [])
            if isinstance(p, dict)
        ]
        state, report = remirror_missing_product_images(
            state,
            timeout=max(1, int(remirror_timeout or 6)),
            limit=max(0, int(remirror_limit or 0)),
            allow_barcode=False,
        )
        after = [
            str(p.get("image") or "")
            for p in (state.get("products") or [])
            if isinstance(p, dict)
        ]
        if report.get("mirrored") or before != after:
            changed = True
    return state, changed
