"""Trim bloated inline images and unbounded logs from AppState JSON."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

# ~130 KB decoded image as base64; larger blobs slow boot and cause 503/timeouts.
MAX_INLINE_IMAGE_CHARS = 180_000
MAX_INVENTORY_LOGS = 5000


def sanitize_image_field(value: Any) -> tuple[Any, bool]:
    if not isinstance(value, str):
        return value, False
    text = value.strip()
    if not text.startswith("data:image/"):
        return value, False
    if len(text) <= MAX_INLINE_IMAGE_CHARS:
        return value, False
    return "", True


def _sanitize_image_entities(items: list[Any]) -> tuple[list[Any], bool]:
    changed = False
    cleaned: list[Any] = []
    for item in items:
        if not isinstance(item, dict):
            cleaned.append(item)
            continue
        next_item = dict(item)
        if "image" in next_item:
            next_image, did = sanitize_image_field(next_item.get("image"))
            if did:
                next_item["image"] = next_image
                changed = True
        cleaned.append(next_item)
    return cleaned, changed


def sanitize_app_state(state: dict[str, Any] | None) -> tuple[dict[str, Any], bool]:
    if not isinstance(state, dict):
        return {}, False

    next_state = deepcopy(state)
    changed = False

    for key in ("products", "customers", "employees"):
        items, did = _sanitize_image_entities(list(next_state.get(key) or []))
        next_state[key] = items
        changed = changed or did

    logs = list(next_state.get("inventoryLogs") or [])
    if len(logs) > MAX_INVENTORY_LOGS:
        next_state["inventoryLogs"] = logs[-MAX_INVENTORY_LOGS:]
        changed = True

    return next_state, changed
