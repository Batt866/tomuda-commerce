"""Persist employee and customer photos outside AppState JSON."""

from __future__ import annotations

import re
import time
from pathlib import Path

from django.conf import settings

from dashboard.models import ProfileImage
from dashboard.product_images import (
    IMAGE_EXT_TO_MIME,
    MAX_IMAGE_BYTES,
    decode_data_url,
    product_media_path_from_url,
)

PROFILE_KINDS = frozenset({"employee", "customer"})
PROFILE_FOLDER_TO_KIND = {
    "employees": "employee",
    "customers": "customer",
}
PROFILE_KIND_TO_FOLDER = {
    "employee": "employees",
    "customer": "customers",
}


def safe_entity_id(entity_id: str) -> str:
    clean = re.sub(r"[^\w.-]", "", str(entity_id or "").strip())
    if not clean:
        raise ValueError("ID буруу байна")
    return clean


def _normalize_kind(kind: str) -> str:
    value = str(kind or "").strip().lower()
    if value in PROFILE_KINDS:
        return value
    if value in PROFILE_FOLDER_TO_KIND:
        return PROFILE_FOLDER_TO_KIND[value]
    raise ValueError("Зурагны төрөл буруу байна")


def profile_image_dir(kind: str) -> Path:
    folder = PROFILE_KIND_TO_FOLDER[_normalize_kind(kind)]
    path = Path(settings.MEDIA_ROOT) / folder
    path.mkdir(parents=True, exist_ok=True)
    return path


def profile_image_url(
    kind: str, entity_id: str, ext: str, version: int | None = None
) -> str:
    normalized = _normalize_kind(kind)
    eid = safe_entity_id(entity_id)
    folder = PROFILE_KIND_TO_FOLDER[normalized]
    final_ext = "jpg" if str(ext or "").lower() in {"jpg", "jpeg"} else str(ext or "").lower()
    filename = f"{eid}.{final_ext}"
    version = int(version or time.time())
    return f"{settings.MEDIA_URL}{folder}/{filename}?v={version}"


def save_profile_image_bytes(kind: str, entity_id: str, raw: bytes, ext: str) -> str:
    normalized = _normalize_kind(kind)
    eid = safe_entity_id(entity_id)
    clean_ext = str(ext or "").lower()
    if clean_ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise ValueError("Зурагны формат буруу байна")
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("Зураг хэт том байна")
    if len(raw) < 32:
        raise ValueError("Зураг хоосон байна")
    final_ext = "jpg" if clean_ext in {"jpg", "jpeg"} else clean_ext
    content_type = IMAGE_EXT_TO_MIME[final_ext]

    image, _ = ProfileImage.objects.update_or_create(
        kind=normalized,
        entity_id=eid,
        defaults={
            "image": raw,
            "content_type": content_type,
            "ext": final_ext,
        },
    )

    try:
        directory = profile_image_dir(normalized)
        for old in directory.glob(f"{eid}.*"):
            try:
                old.unlink()
            except OSError:
                pass
        (directory / f"{eid}.{final_ext}").write_bytes(raw)
    except OSError:
        pass

    version = int(image.updated_at.timestamp()) if image.updated_at else int(time.time())
    return profile_image_url(normalized, eid, final_ext, version)


def save_profile_image(kind: str, entity_id: str, data_url: str) -> str:
    raw, ext = decode_data_url(data_url)
    return save_profile_image_bytes(kind, entity_id, raw, ext)


def find_stored_profile_image_url(kind: str, entity_id: str) -> str:
    try:
        normalized = _normalize_kind(kind)
        eid = safe_entity_id(entity_id)
    except ValueError:
        return ""
    try:
        directory = profile_image_dir(normalized)
    except OSError:
        directory = None
    if directory:
        for ext in ("jpg", "jpeg", "png", "webp", "gif"):
            path = directory / f"{eid}.{ext}"
            try:
                if path.is_file() and path.stat().st_size > 32:
                    version = int(path.stat().st_mtime)
                    backfill_profile_image_from_file(normalized, eid, path, ext)
                    return profile_image_url(normalized, eid, ext, version)
            except OSError:
                continue
    image = ProfileImage.objects.filter(kind=normalized, entity_id=eid).first()
    if image and image.image and len(image.image) > 32:
        version = int(image.updated_at.timestamp()) if image.updated_at else int(time.time())
        return profile_image_url(normalized, eid, image.ext or "jpg", version)
    return ""


def backfill_profile_image_from_file(
    kind: str, entity_id: str, path: Path, ext: str
) -> None:
    normalized = _normalize_kind(kind)
    if ProfileImage.objects.filter(kind=normalized, entity_id=entity_id).exists():
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
    ProfileImage.objects.update_or_create(
        kind=normalized,
        entity_id=entity_id,
        defaults={
            "image": raw,
            "content_type": content_type,
            "ext": clean_ext,
        },
    )


def get_stored_profile_image(kind: str, entity_id: str) -> ProfileImage | None:
    try:
        normalized = _normalize_kind(kind)
        eid = safe_entity_id(entity_id)
    except ValueError:
        return None
    image = ProfileImage.objects.filter(kind=normalized, entity_id=eid).first()
    if image and image.image and len(image.image) > 32:
        return image
    return None


def update_profile_image_in_state(
    state: dict, kind: str, entity_id: str, url: str
) -> bool:
    key = "employees" if _normalize_kind(kind) == "employee" else "customers"
    for item in state.get(key) or []:
        if isinstance(item, dict) and str(item.get("id")) == str(entity_id):
            item["image"] = url
            return True
    return False


def _hydrate_profile_collection(state: dict, collection_key: str, kind: str) -> bool:
    changed = False
    for item in state.get(collection_key) or []:
        if not isinstance(item, dict):
            continue
        eid = str(item.get("id") or "").strip()
        if not eid:
            continue
        current = str(item.get("image") or "").strip()
        url = find_stored_profile_image_url(kind, eid)
        if url:
            if url != current:
                item["image"] = url
                changed = True
            continue
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
    return changed


def hydrate_profile_images(state: dict) -> tuple[dict, bool]:
    changed = False
    changed = _hydrate_profile_collection(state, "employees", "employee") or changed
    changed = _hydrate_profile_collection(state, "customers", "customer") or changed
    return state, changed
