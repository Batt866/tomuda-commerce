"""Renumber zarlaga receiptSeq by taken day + createdAt within each month."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

RECEIPT_SEQ_CHRONO_FLAG = "receiptSeqChronoV2"


def _utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _as_list(value: Any) -> list:
    return value if isinstance(value, list) else []


def order_taken_day(order: dict[str, Any]) -> str:
    locked = str(order.get("takenDay") or "").strip()[:10]
    if len(locked) == 10 and locked[4] == "-" and locked[7] == "-":
        return locked
    created = str(order.get("createdAt") or "").strip()
    return created[:10] if len(created) >= 10 else ""


def receipt_month_key(order: dict[str, Any]) -> str:
    day = order_taken_day(order)
    return day[:7] if day else ""


def _created_ms(order: dict[str, Any]) -> float:
    text = str(order.get("createdAt") or "").strip()
    if not text:
        return 0.0
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return 0.0


def build_receipt_number(order: dict[str, Any], seq: int) -> str:
    day = order_taken_day(order)
    if day:
        year, month, _day = day.split("-")
        yy = year[-2:]
        mm = month.zfill(2)
        return f"{yy}{mm}-{int(seq)}"
    return str(int(seq)) if seq > 0 else ""


def chrono_sort_key(order: dict[str, Any]) -> tuple:
    return (
        order_taken_day(order) or "",
        _created_ms(order),
        str(order.get("id") or ""),
    )


def resequence_order_receipts(data: dict[str, Any]) -> tuple[dict[str, Any], int]:
    """Assign 1..n per receipt month by taken day then createdAt. Returns (data, changed)."""
    orders = [dict(o) for o in _as_list(data.get("orders")) if isinstance(o, dict)]
    by_month: dict[str, list[dict[str, Any]]] = {}
    for order in orders:
        month = receipt_month_key(order)
        if not month:
            continue
        order["receiptMonth"] = month
        by_month.setdefault(month, []).append(order)

    changed = 0
    now = _utc_now_iso()
    for month, rows in by_month.items():
        rows.sort(key=chrono_sort_key)
        for index, order in enumerate(rows, start=1):
            prev_seq = int(order.get("receiptSeq") or 0)
            prev_no = str(order.get("receiptNumber") or "")
            display = build_receipt_number(order, index)
            order["receiptMonth"] = month
            order["receiptSeq"] = index
            order["receiptNumber"] = display
            if prev_seq != index or prev_no != display:
                order["updatedAt"] = now
                changed += 1

    if not changed:
        return data, 0

    # Preserve non-dict / skipped rows in original order by id map.
    by_id = {
        str(o.get("id")): o
        for o in orders
        if o.get("id") is not None and receipt_month_key(o)
    }
    next_orders = []
    for raw in _as_list(data.get("orders")):
        if not isinstance(raw, dict) or raw.get("id") is None:
            next_orders.append(raw)
            continue
        key = str(raw.get("id"))
        next_orders.append(by_id.get(key, raw))
    out = dict(data)
    out["orders"] = next_orders
    return out, changed


def ensure_chrono_receipt_seqs(
    data: dict[str, Any], *, force: bool = False
) -> tuple[dict[str, Any], int]:
    """One-shot (or forced) month chrono renumber; stamps settings flag when done."""
    if not isinstance(data, dict):
        return data, 0
    settings = dict(data.get("settings") or {})
    flag_was_set = bool(settings.get(RECEIPT_SEQ_CHRONO_FLAG))
    if flag_was_set and not force:
        return data, 0
    out, changed = resequence_order_receipts(data)
    settings = dict(out.get("settings") or settings)
    settings[RECEIPT_SEQ_CHRONO_FLAG] = True
    settings["updatedAt"] = _utc_now_iso()
    out = dict(out)
    out["settings"] = settings
    if changed or not flag_was_set or force:
        return out, max(changed, 1)
    return out, 0
