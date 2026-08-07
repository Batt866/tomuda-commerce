"""Merge incoming AppState with the current server row so devices cannot wipe each other."""

from __future__ import annotations

import json
from typing import Any

ENTITY_KEYS = ("customers", "products", "employees", "orders")
ARRAY_BY_ID_KEYS = ("inventoryLogs", "stockInReceipts", "stockOutReceipts")
DELETION_TYPE = {
    "customers": "customer",
    "products": "product",
    "employees": "employee",
    "orders": "order",
}


def _as_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def _as_dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def normalize_deletion_log(log: Any) -> list[dict[str, Any]]:
    if not isinstance(log, list):
        return []
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for entry in log:
        if not isinstance(entry, dict):
            continue
        entry_type = str(entry.get("type") or "").strip()
        entry_id = entry.get("id")
        if not entry_type or entry_id is None:
            continue
        key = f"{entry_type}:{entry_id}"
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "type": entry_type,
                "id": entry_id,
                "deletedBy": str(entry.get("deletedBy") or ""),
                "deletedAt": entry.get("deletedAt") or "",
            }
        )
    return out[-500:]


def deletion_log_has(log: list[dict[str, Any]], entry_type: str, entry_id: Any) -> bool:
    target = str(entry_id)
    return any(
        entry.get("type") == entry_type and str(entry.get("id")) == target for entry in log
    )


def preferred_entity_image(local_image: Any, remote_image: Any) -> str:
    local = str(local_image or "").strip()
    remote = str(remote_image or "").strip()
    if local.startswith("data:image/") and not local.startswith("data:image/svg"):
        return local
    if remote.startswith("data:image/") and not remote.startswith("data:image/svg"):
        return remote
    if "/media/" in local or local.startswith("http"):
        return local
    if "/media/" in remote or remote.startswith("http"):
        return remote
    return local or remote


def merge_entity_records(
    remote: Any,
    local: Any,
    *,
    deletion_log: list[dict[str, Any]] | None = None,
    deletion_type: str = "",
) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for item in _as_list(remote):
        if not isinstance(item, dict) or item.get("id") is None:
            continue
        merged[str(item["id"])] = dict(item)
    for item in _as_list(local):
        if not isinstance(item, dict) or item.get("id") is None:
            continue
        item_id = str(item["id"])
        prev = merged.get(item_id)
        next_item = {**(prev or {}), **item}
        image = preferred_entity_image(item.get("image"), (prev or {}).get("image"))
        if image:
            next_item["image"] = image
        elif "image" in next_item:
            del next_item["image"]
        merged[item_id] = next_item
    if deletion_type and deletion_log:
        for item_id in list(merged.keys()):
            if deletion_log_has(deletion_log, deletion_type, item_id):
                del merged[item_id]
    return list(merged.values())


def merge_array_by_id(
    remote: Any,
    local: Any,
    *,
    deletion_log: list[dict[str, Any]] | None = None,
    deletion_type: str = "",
) -> list[dict[str, Any]]:
    """Union by id; later (local) record wins on conflict."""
    merged: dict[str, dict[str, Any]] = {}
    remote_ids = set()
    local_ids = set()
    for item in _as_list(remote):
        if not isinstance(item, dict) or item.get("id") is None:
            continue
        item_id = str(item["id"])
        remote_ids.add(item_id)
        merged[item_id] = dict(item)
    for item in _as_list(local):
        if not isinstance(item, dict) or item.get("id") is None:
            continue
        item_id = str(item["id"])
        local_ids.add(item_id)
        merged[item_id] = dict(item)
    if deletion_type and deletion_log:
        for item_id in list(merged.keys()):
            if not deletion_log_has(deletion_log, deletion_type, item_id):
                continue
            # Keep local-only tombstoned rows until the tombstone has synced
            # against a remote copy (same rule as the frontend mergeArrayById).
            if item_id not in remote_ids and item_id in local_ids:
                continue
            del merged[item_id]
    return list(merged.values())


def _merge_promotion_kind(remote_list: Any, local_list: Any) -> list:
    """Union promotion rules; prefer local on exact JSON equality duplicates."""
    out: list = []
    seen: set[str] = set()
    for item in [*_as_list(remote_list), *_as_list(local_list)]:
        if not isinstance(item, dict):
            continue
        try:
            key = json_dumps_stable(item)
        except TypeError:
            key = str(item)
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def _promotion_free_ids(rule: dict[str, Any]) -> list[str]:
    for key in ("freeProductIds", "priceFreeProductIds", "paymentFreeProductIds"):
        value = rule.get(key)
        if isinstance(value, list) and value:
            return sorted({str(x) for x in value if x is not None and str(x)})
    for key in ("freeProductId", "priceFreeProductId", "paymentFreeProductId"):
        value = rule.get(key)
        if value is not None and str(value):
            return [str(value)]
    return []


def _stable_promotion_value(value: Any) -> Any:
    if isinstance(value, list):
        return [_stable_promotion_value(item) for item in value]
    if isinstance(value, dict):
        return {key: _stable_promotion_value(value[key]) for key in sorted(value)}
    return value


def promotion_rule_canonical_fingerprint(rule: Any) -> str:
    if not isinstance(rule, dict):
        return json_dumps_stable(rule)
    copy = dict(rule)
    free_ids = _promotion_free_ids(copy)
    for key in (
        "freeProductId",
        "priceFreeProductId",
        "paymentFreeProductId",
        "priceFreeProductIds",
        "paymentFreeProductIds",
    ):
        copy.pop(key, None)
    copy["freeProductIds"] = free_ids
    buy_ids = copy.get("buyProductIds")
    if isinstance(buy_ids, list):
        copy["buyProductIds"] = sorted({str(x) for x in buy_ids if x is not None and str(x)})
    return json_dumps_stable(_stable_promotion_value(copy))


def promotion_deletion_canonical_key(kind: str, fingerprint: Any) -> str:
    fp = str(fingerprint or "")
    try:
        parsed = json.loads(fp)
        fp = promotion_rule_canonical_fingerprint(parsed)
    except (TypeError, ValueError, json.JSONDecodeError):
        pass
    return f"{kind}:{fp}"


def promotion_deletion_log_has(log: list[dict[str, Any]], kind: str, rule: Any) -> bool:
    key = (
        promotion_deletion_canonical_key(kind, rule)
        if isinstance(rule, str)
        else f"{kind}:{promotion_rule_canonical_fingerprint(rule)}"
    )
    for entry in log:
        if entry.get("restored"):
            continue
        entry_key = promotion_deletion_canonical_key(
            str(entry.get("kind") or ""), entry.get("fingerprint")
        )
        if entry_key == key:
            return True
    return False


def json_dumps_stable(value: Any) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, default=str)


def merge_promotion_rules(
    remote: Any,
    local: Any,
    deletion_log: list[dict[str, Any]] | None = None,
) -> dict[str, list]:
    remote_rules = _as_dict(remote)
    local_rules = _as_dict(local)
    tombstones = deletion_log or []
    merged = {
        "quantity": _merge_promotion_kind(
            remote_rules.get("quantity"), local_rules.get("quantity")
        ),
        "price": _merge_promotion_kind(remote_rules.get("price"), local_rules.get("price")),
        "payment": _merge_promotion_kind(
            remote_rules.get("payment"), local_rules.get("payment")
        ),
    }
    if not tombstones:
        return merged
    return {
        kind: [
            rule
            for rule in rules
            if isinstance(rule, dict) and not promotion_deletion_log_has(tombstones, kind, rule)
        ]
        for kind, rules in merged.items()
    }


def merge_promotion_deletion_log(remote: Any, local: Any) -> list[dict[str, Any]]:
    """Keep newest entry per kind+fingerprint."""
    by_key: dict[str, dict[str, Any]] = {}
    for entry in [*_as_list(remote), *_as_list(local)]:
        if not isinstance(entry, dict):
            continue
        kind = str(entry.get("kind") or "").strip()
        fingerprint = str(entry.get("fingerprint") or "").strip()
        if not kind or not fingerprint:
            continue
        key = f"{kind}:{fingerprint}"
        norm = {
            "kind": kind,
            "fingerprint": fingerprint,
            "deletedBy": str(entry.get("deletedBy") or ""),
            "deletedAt": entry.get("deletedAt") or "",
            "restored": bool(entry.get("restored")),
            "updatedAt": str(entry.get("updatedAt") or entry.get("deletedAt") or ""),
        }
        prev = by_key.get(key)
        if not prev or norm["updatedAt"] >= prev["updatedAt"]:
            by_key[key] = norm
    return list(by_key.values())[-500:]


def _count_session_ms(value: Any) -> float:
    from datetime import datetime

    text = str(value or "").strip()
    if not text:
        return 0.0
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def merge_app_states(remote: dict[str, Any] | None, local: dict[str, Any] | None) -> dict[str, Any]:
    """
    Merge server (remote) state with an incoming device save (local).

    Entity collections are unioned by id so one device cannot erase another
    device's newly created customers/products/employees/orders.
    """
    remote_state = _as_dict(remote)
    local_state = _as_dict(local)
    deletion_log = normalize_deletion_log(
        [*_as_list(remote_state.get("deletionLog")), *_as_list(local_state.get("deletionLog"))]
    )
    promotion_deletion_log = merge_promotion_deletion_log(
        remote_state.get("promotionDeletionLog"),
        local_state.get("promotionDeletionLog"),
    )

    merged: dict[str, Any] = dict(remote_state)
    merged.update(
        {
            key: value
            for key, value in local_state.items()
            if key
            not in {
                *ENTITY_KEYS,
                *ARRAY_BY_ID_KEYS,
                "deletionLog",
                "promotionDeletionLog",
                "promotionRules",
                "settings",
                "extraCategories",
                "countQty",
                "countOpeningStock",
                "countSessionStartedAt",
                "countDone",
            }
        }
    )

    for key in ENTITY_KEYS:
        deletion_type = DELETION_TYPE[key]
        if key == "orders":
            merged[key] = merge_array_by_id(
                remote_state.get(key),
                local_state.get(key),
                deletion_log=deletion_log,
                deletion_type=deletion_type,
            )
        else:
            merged[key] = merge_entity_records(
                remote_state.get(key),
                local_state.get(key),
                deletion_log=deletion_log,
                deletion_type=deletion_type,
            )

    for key in ARRAY_BY_ID_KEYS:
        merged[key] = merge_array_by_id(remote_state.get(key), local_state.get(key))

    merged["deletionLog"] = deletion_log
    merged["promotionDeletionLog"] = promotion_deletion_log
    merged["promotionRules"] = merge_promotion_rules(
        remote_state.get("promotionRules"),
        local_state.get("promotionRules"),
        promotion_deletion_log,
    )
    merged["settings"] = {
        **_as_dict(remote_state.get("settings")),
        **_as_dict(local_state.get("settings")),
    }
    merged["extraCategories"] = list(
        dict.fromkeys(
            [
                *[str(x) for x in _as_list(remote_state.get("extraCategories")) if x],
                *[str(x) for x in _as_list(local_state.get("extraCategories")) if x],
            ]
        )
    )

    remote_count_ms = _count_session_ms(remote_state.get("countSessionStartedAt"))
    local_count_ms = _count_session_ms(local_state.get("countSessionStartedAt"))
    count_src = local_state if local_count_ms >= remote_count_ms else remote_state
    merged["countQty"] = dict(_as_dict(count_src.get("countQty")))
    merged["countOpeningStock"] = dict(_as_dict(count_src.get("countOpeningStock")))
    merged["countSessionStartedAt"] = count_src.get("countSessionStartedAt")
    merged["countDone"] = bool(count_src.get("countDone"))

    return merged
