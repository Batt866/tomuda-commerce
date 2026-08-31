"""Permission catalog and state mutation validation (mirror static/tomuda/permissions.js)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None  # type: ignore

BUSINESS_TZ_NAME = "Asia/Ulaanbaatar"

PERM_ACTIONS: list[dict[str, str]] = [
    {"id": "view", "label": "Харах"},
    {"id": "create", "label": "Нэмэх"},
    {"id": "edit", "label": "Засах"},
    {"id": "delete", "label": "Устгах"},
    {"id": "rate", "label": "Үнэлгээ"},
]

CRUD: list[str] = ["view", "create", "edit", "delete"]

PERM_GROUPS: list[dict[str, Any]] = [
    {
        "id": "general",
        "label": "Ерөнхий эрх",
        "modules": [
            {"id": "customers", "label": "Харилцагч", "actions": CRUD + ["rate"]},
            {"id": "products", "label": "Бараа", "actions": CRUD},
            {"id": "warehouse", "label": "Агуулах", "actions": CRUD},
            {"id": "employees", "label": "Ажилтан", "actions": CRUD},
            {"id": "suppliers", "label": "Нийлүүлэгч", "actions": CRUD},
        ],
    },
    {
        "id": "internal",
        "label": "Дотоод эрх",
        "modules": [
            {"id": "count", "label": "Тооллого", "actions": CRUD},
            {"id": "customerAdd", "label": "Харилцагч нэмэх", "actions": CRUD},
            {"id": "productAdd", "label": "Бараа нэмэх", "actions": CRUD},
            {"id": "categoryAdd", "label": "Төрөл нэмэх", "actions": CRUD},
            {"id": "groupAdd", "label": "Бүлэг нэмэх", "actions": CRUD},
            {"id": "productCost", "label": "Өртөг үнэ харах", "actions": ["view"]},
            {"id": "employeeAdd", "label": "Ажилтан нэмэх", "actions": CRUD},
            {"id": "stockIn", "label": "Орлого", "actions": CRUD},
            {"id": "stockOut", "label": "Зарлага", "actions": CRUD},
            {"id": "reports", "label": "Борлуулалтын тайлан", "actions": CRUD},
            {"id": "salesInfo", "label": "Борлуулалтын мэдээ", "actions": CRUD},
            {"id": "stockReports", "label": "Орлого/зарлага тайлан", "actions": CRUD},
            {"id": "warehousePrepare", "label": "Агуулах бэлдэх", "actions": CRUD},
            {"id": "receipts", "label": "Баримтууд", "actions": CRUD},
            {"id": "promotions", "label": "Урамшуулал", "actions": CRUD},
            {"id": "stockAlert", "label": "Үлдэгдлийн мэдэгдэл", "actions": CRUD},
            {"id": "permissions", "label": "Эрхийн тохиргоо", "actions": CRUD},
            {
                "id": "percentDiscount",
                "label": "Шууд төлөлтийн хувь оруулах",
                "actions": CRUD,
            },
            {
                "id": "orderHistory",
                "label": "Захиалгын түүх шалгах",
                "actions": CRUD,
            },
            {"id": "deletionLog", "label": "Устгасан бүртгэл", "actions": ["view"]},
            {"id": "orderDeliveryMark", "label": "Хүргэлт тэмдэглэх", "actions": ["view"]},
            {
                "id": "orderDeliveryConfirm",
                "label": "Хүргэлт баталгаажуулах",
                "actions": ["view"],
            },
        ],
    },
    {
        "id": "system",
        "label": "Системийн эрх",
        "modules": [
            {"id": "excelExport", "label": "Мэдээлэл татах", "actions": CRUD},
            {"id": "excelImport", "label": "Excel файл оруулах", "actions": CRUD},
            {"id": "excelTemplate", "label": "Формат татах", "actions": CRUD},
        ],
    },
]

HIDDEN_MODULES: list[dict[str, Any]] = [
    {"id": "dashboard", "label": "Админ самбар", "actions": ["view"]},
    {"id": "orders", "label": "Захиалга", "actions": [*CRUD, "markDelivered", "confirmDelivery"]},
    {"id": "settings", "label": "Тохиргоо", "actions": ["view"]},
]

PERM_MODULES: list[dict[str, Any]] = [
    *(mod for group in PERM_GROUPS for mod in group["modules"]),
    *HIDDEN_MODULES,
]

ACTION_LABELS: dict[str, str] = {
    "view": "харах",
    "create": "нэмэх",
    "edit": "засах",
    "delete": "устгах",
    "rate": "үнэлгээ",
    "markDelivered": "хүргэлт тэмдэглэх",
    "confirmDelivery": "хүргэлт баталгаажуулах",
}


def permission_key(module_id: str, action_id: str) -> str:
    return f"{module_id}.{action_id}"


def permission_label(module_label: str, action_id: str) -> str:
    return f"{module_label} {ACTION_LABELS.get(action_id, action_id)}"


PERMISSION_CATALOG: list[dict[str, Any]] = [
    {
        "id": mod["id"],
        "label": mod["label"],
        "permissions": [
            {
                "key": permission_key(mod["id"], action_id),
                "label": permission_label(mod["label"], action_id),
                "action": action_id,
            }
            for action_id in mod["actions"]
        ],
    }
    for mod in PERM_MODULES
]

ALL_PERMISSION_KEYS: list[str] = [
    p["key"] for cat in PERMISSION_CATALOG for p in cat["permissions"]
]
ALL_PERMISSION_KEY_SET: set[str] = set(ALL_PERMISSION_KEYS)
VISIBLE_GRANT_KEYS: list[str] = [
    permission_key(mod["id"], action)
    for group in PERM_GROUPS
    for mod in group["modules"]
    for action in mod["actions"]
    if permission_key(mod["id"], action) in ALL_PERMISSION_KEY_SET
]

PERMISSION_FALLBACKS: dict[str, list[str]] = {
    "count.view": ["warehouse.edit"],
    "count.create": ["warehouse.edit"],
    "count.edit": ["warehouse.edit"],
    "count.delete": ["warehouse.edit"],
    "customerAdd.view": ["customers.create"],
    "customerAdd.create": ["customers.create"],
    "customerAdd.edit": ["customers.create", "customers.edit"],
    "customerAdd.delete": ["customers.create"],
    "productAdd.view": ["products.create"],
    "productAdd.create": ["products.create"],
    "productAdd.edit": ["products.create", "products.edit"],
    "productAdd.delete": ["products.create"],
    "categoryAdd.view": ["products.create", "products.edit"],
    "categoryAdd.create": ["products.create", "products.edit"],
    "categoryAdd.edit": ["products.edit"],
    "categoryAdd.delete": ["products.edit", "products.delete"],
    "groupAdd.view": [
        "categoryAdd.view",
        "categoryAdd.create",
        "products.create",
        "products.edit",
    ],
    "groupAdd.create": [
        "categoryAdd.create",
        "products.create",
        "products.edit",
    ],
    "groupAdd.edit": ["categoryAdd.edit", "products.edit", "groupAdd.create"],
    "groupAdd.delete": [
        "categoryAdd.delete",
        "products.edit",
        "products.delete",
    ],
    "productCost.view": ["warehouse.edit", "stockIn.view", "stockIn.edit"],
    "employeeAdd.view": ["employees.create"],
    "employeeAdd.create": ["employees.create"],
    "employeeAdd.edit": ["employees.create", "employees.edit"],
    "employeeAdd.delete": ["employees.create"],
    "warehouse.view": ["warehouse.edit"],
    "stockIn.view": ["warehouse.edit", "warehouse.view"],
    "stockIn.create": ["warehouse.edit"],
    "stockIn.edit": ["warehouse.edit"],
    "stockIn.delete": ["warehouse.edit"],
    "stockOut.view": ["warehouse.edit", "warehouse.view"],
    "stockOut.create": ["warehouse.edit"],
    "stockOut.edit": ["warehouse.edit"],
    "stockOut.delete": ["warehouse.edit"],
    "receipts.view": ["warehouse.view", "warehouse.edit"],
    "receipts.create": ["warehouse.view", "warehouse.edit"],
    "receipts.edit": ["warehouse.edit"],
    "receipts.delete": ["warehouse.edit"],
    "promotions.view": ["settings.view"],
    "promotions.create": ["settings.view"],
    "promotions.edit": ["settings.view"],
    "promotions.delete": ["settings.view"],
    "stockAlert.view": ["settings.view"],
    "stockAlert.create": ["settings.view"],
    "stockAlert.edit": ["settings.view"],
    "stockAlert.delete": ["settings.view"],
    "percentDiscount.view": ["settings.view"],
    "percentDiscount.create": ["settings.view"],
    "percentDiscount.edit": ["settings.view"],
    "percentDiscount.delete": ["settings.view"],
    "orderHistory.view": ["settings.view"],
    "orderHistory.create": ["settings.view"],
    "orderHistory.edit": ["settings.view"],
    "orderHistory.delete": ["settings.view"],
    "excelExport.view": ["reports.view"],
    "excelExport.create": ["reports.view"],
    "excelExport.edit": ["reports.view"],
    "excelExport.delete": ["reports.view"],
    "salesInfo.view": ["reports.view"],
    "salesInfo.create": ["reports.view", "reports.create"],
    "salesInfo.edit": ["reports.edit"],
    "salesInfo.delete": ["reports.delete"],
    "stockReports.view": [
        "warehouse.view",
        "warehouse.edit",
        "stockIn.view",
        "stockOut.view",
        "receipts.view",
        "reports.view",
    ],
    "stockReports.create": ["excelExport.view", "reports.view"],
    "stockReports.edit": ["warehouse.edit", "stockIn.edit", "stockOut.edit"],
    "stockReports.delete": ["warehouse.edit", "receipts.delete"],
    "warehousePrepare.view": ["warehouse.view", "warehouse.edit"],
    "warehousePrepare.create": ["warehouse.view", "warehouse.edit"],
    "warehousePrepare.edit": ["warehouse.edit"],
    "warehousePrepare.delete": ["warehouse.edit"],
    "deletionLog.view": ["settings.view", "stockAlert.view", "orderHistory.view"],
    "excelImport.view": ["products.create", "customers.create"],
    "excelImport.create": ["products.create", "customers.create"],
    "excelImport.edit": ["products.create", "customers.create"],
    "excelImport.delete": ["products.create", "customers.create"],
    "excelTemplate.view": ["products.create", "customers.create"],
    "excelTemplate.create": ["products.create", "customers.create"],
    "excelTemplate.edit": ["products.create", "customers.create"],
    "excelTemplate.delete": ["products.create", "customers.create"],
    "customers.create": ["customerAdd.create", "customerAdd.view"],
    "customers.edit": [
        "customers.create",
        "customerAdd.edit",
        "customerAdd.create",
    ],
    "customers.rate": ["customers.edit"],
    "products.create": ["productAdd.create", "productAdd.view"],
    "employees.create": ["employeeAdd.create", "employeeAdd.view"],
    "dashboard.view": ["settings.view", "permissions.view"],
    "orders.markDelivered": ["orderDeliveryMark.view", "orders.edit"],
    "orders.confirmDelivery": ["orderDeliveryConfirm.view", "orders.edit"],
}


def _add_crud(target: set[str], module_id: str) -> None:
    for action in CRUD:
        key = permission_key(module_id, action)
        if key in ALL_PERMISSION_KEY_SET:
            target.add(key)


def expand_legacy_permissions(raw: list[str]) -> list[str]:
    keys = set(raw)
    if "settings.view" in keys:
        for module_id in (
            "promotions",
            "stockAlert",
            "percentDiscount",
            "orderHistory",
            "dashboard",
        ):
            _add_crud(keys, module_id)
        if "settings.view" in ALL_PERMISSION_KEY_SET:
            keys.add("settings.view")
        if "deletionLog.view" in ALL_PERMISSION_KEY_SET:
            keys.add("deletionLog.view")
    if "warehouse.edit" in keys:
        if "warehouse.view" in ALL_PERMISSION_KEY_SET:
            keys.add("warehouse.view")
        for module_id in ("count", "stockIn", "stockOut", "suppliers"):
            _add_crud(keys, module_id)
    if "warehouse.view" in keys and "suppliers.view" in ALL_PERMISSION_KEY_SET:
        keys.add("suppliers.view")
    if "warehouse.view" in keys or "warehouse.edit" in keys:
        _add_crud(keys, "receipts")
    if "customers.create" in keys:
        _add_crud(keys, "customerAdd")
    if "customers.edit" in keys and "customers.rate" in ALL_PERMISSION_KEY_SET:
        keys.add("customers.rate")
    if "products.create" in keys:
        _add_crud(keys, "productAdd")
        _add_crud(keys, "categoryAdd")
        _add_crud(keys, "groupAdd")
    if "products.edit" in keys:
        _add_crud(keys, "categoryAdd")
        _add_crud(keys, "groupAdd")
    if "warehouse.edit" in keys and "productCost.view" in ALL_PERMISSION_KEY_SET:
        keys.add("productCost.view")
    if "employees.create" in keys:
        _add_crud(keys, "employeeAdd")
    if "reports.view" in keys:
        _add_crud(keys, "excelExport")
        _add_crud(keys, "salesInfo")
    if "warehouse.view" in keys or "warehouse.edit" in keys:
        _add_crud(keys, "warehousePrepare")
        _add_crud(keys, "stockReports")
    if "products.create" in keys or "customers.create" in keys:
        _add_crud(keys, "excelImport")
        _add_crud(keys, "excelTemplate")
    return [k for k in keys if k in ALL_PERMISSION_KEY_SET]


ROLE_TEMPLATES: dict[str, list[str]] = {
    "admin": list(ALL_PERMISSION_KEYS),
    "sales": [
        "dashboard.view",
        "orders.view",
        "orders.create",
        "orders.edit",
        "customers.view",
        "customers.create",
        "customers.edit",
        "customers.rate",
        "customerAdd.view",
        "customerAdd.create",
        "products.view",
        "warehouse.view",
        "excelExport.view",
        "excelExport.create",
    ],
    "warehouse": [
        "warehouse.view",
        "warehouse.edit",
        "products.view",
        "stockIn.view",
        "stockIn.create",
        "stockIn.edit",
        "stockOut.view",
        "stockOut.create",
        "stockOut.edit",
        "suppliers.view",
        "suppliers.create",
        "suppliers.edit",
        "count.view",
        "count.create",
        "count.edit",
        "receipts.view",
        "warehousePrepare.view",
        "stockReports.view",
        "productCost.view",
    ],
    "delivery": ["orders.view", "orderDeliveryMark.view"],
    "manager": [
        "dashboard.view",
        "orders.view",
        "orders.create",
        "orders.edit",
        "customers.view",
        "customers.create",
        "customers.edit",
        "customers.rate",
        "customerAdd.view",
        "customerAdd.create",
        "products.view",
        "warehouse.view",
        "receipts.view",
        "reports.view",
        "excelExport.view",
        "excelExport.create",
        "employees.view",
    ],
    "user": [
        "orders.view",
        "customers.view",
        "customers.rate",
        "products.view",
    ],
}


def normalize_permissions(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    return expand_legacy_permissions([k for k in raw if isinstance(k, str)])


def complete_app_access(keys: set[str]) -> set[str]:
    """Fill hidden catalog keys the grant UI cannot tick (orders/dashboard/settings)."""
    if VISIBLE_GRANT_KEYS and all(k in keys for k in VISIBLE_GRANT_KEYS):
        keys.update(ALL_PERMISSION_KEY_SET)
        return keys
    if "customers.view" in keys and "products.view" in keys:
        keys.add("orders.view")
        if (
            "customers.create" in keys
            or "customerAdd.create" in keys
            or "customerAdd.view" in keys
        ):
            keys.add("orders.create")
            keys.add("orders.edit")
    if "orderDeliveryMark.view" in keys or "orderDeliveryConfirm.view" in keys:
        keys.add("orders.view")
        keys.add("orders.markDelivered")
        keys.add("orders.confirmDelivery")
    if keys & {
        "promotions.view",
        "stockAlert.view",
        "percentDiscount.view",
        "orderHistory.view",
        "deletionLog.view",
        "permissions.view",
    }:
        keys.add("dashboard.view")
        keys.add("settings.view")
    return keys


def resolve_permissions(employee: dict[str, Any] | None) -> set[str]:
    if not employee:
        return set()
    custom = normalize_permissions(employee.get("permissions"))
    if custom:
        return complete_app_access(set(custom))
    role = str(employee.get("role") or "sales")
    return set(ROLE_TEMPLATES.get(role, ROLE_TEMPLATES["sales"]))


def has_permission(employee: dict[str, Any] | None, key: str) -> bool:
    perms = resolve_permissions(employee)
    if key in perms:
        return True
    return any(alt in perms for alt in PERMISSION_FALLBACKS.get(key, []))


def find_employee(state: dict[str, Any], actor: dict[str, Any] | None) -> dict[str, Any] | None:
    if not actor or not isinstance(actor, dict):
        return None
    actor_id = str(actor.get("id") or "")
    actor_email = str(actor.get("email") or "").strip().lower()
    for emp in state.get("employees") or []:
        if actor_id and str(emp.get("id")) == actor_id:
            return emp
        if actor_email and str(emp.get("email") or "").strip().lower() == actor_email:
            return emp
    return None


def _by_id(items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(x.get("id")): x for x in items if x.get("id") is not None}


def _settings_changed(old: dict[str, Any], new: dict[str, Any]) -> bool:
    return (old.get("settings") or {}) != (new.get("settings") or {})


def _promotion_rules_changed(old: dict[str, Any], new: dict[str, Any]) -> bool:
    return (old.get("promotionRules") or {}) != (new.get("promotionRules") or {})


def _collection_mutations(
    old_items: list[dict[str, Any]],
    new_items: list[dict[str, Any]],
) -> tuple[set[str], set[str], set[str]]:
    old_map = _by_id(old_items or [])
    new_map = _by_id(new_items or [])
    old_ids = set(old_map)
    new_ids = set(new_map)
    created = new_ids - old_ids
    deleted = old_ids - new_ids
    updated = {
        item_id
        for item_id in old_ids & new_ids
        if old_map[item_id] != new_map[item_id]
    }
    return created, updated, deleted


def _deletion_log_has(state: dict[str, Any], type_id: str, item_id: str) -> bool:
    for entry in state.get("deletionLog") or []:
        if str(entry.get("type") or "") == type_id and str(entry.get("id") or "") == item_id:
            return True
    return False


def _iso_day(value: Any) -> str:
    """Calendar day in Asia/Ulaanbaatar — never raw UTC [:10] from timestamps."""
    raw = str(value or "").strip()
    if not raw:
        return ""
    if len(raw) == 10 and raw[4] == "-" and raw[7] == "-":
        return raw
    try:
        text = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        if ZoneInfo is not None:
            return dt.astimezone(ZoneInfo(BUSINESS_TZ_NAME)).date().isoformat()
        return dt.astimezone(timezone.utc).date().isoformat()
    except (TypeError, ValueError):
        if len(raw) >= 10 and raw[4] == "-" and raw[7] == "-":
            return raw[:10]
        return ""


def _order_retention_days(state: dict[str, Any] | None = None) -> int:
    settings = (state or {}).get("settings") or {}
    try:
        days = int(settings.get("orderRetentionDays") or 30)
    except (TypeError, ValueError):
        days = 30
    return max(7, min(days, 365))


def _order_is_paid(order: dict[str, Any]) -> bool:
    try:
        due = float(order.get("total") or 0)
    except (TypeError, ValueError):
        due = 0.0
    recorded = order.get("paidAmount")
    if recorded is not None and recorded != "":
        try:
            paid = float(recorded)
        except (TypeError, ValueError):
            paid = None
        else:
            if paid >= 0:
                return paid + 0.009 >= due
    term = str(order.get("paymentTerm") or "").strip()
    if term == "cash":
        return order.get("isPaid") is not False
    return bool(order.get("isPaid"))


def _order_has_open_receivable(order: dict[str, Any]) -> bool:
    if str(order.get("status") or "") == "cancelled":
        return False
    return not _order_is_paid(order)


def _order_within_retention(
    order: dict[str, Any],
    now: datetime | None = None,
    retention_days: int | None = None,
) -> bool:
    # Авлага (төлөөгүй) баримт хугацаа дууссан ч устгахгүй.
    if _order_has_open_receivable(order):
        return True
    day = _iso_day(order.get("takenDay") or order.get("createdAt") or "")
    if not day:
        return True
    try:
        created = datetime.fromisoformat(day)
    except ValueError:
        return True
    days = retention_days if retention_days is not None else 30
    expires = created + timedelta(days=days)
    expires = expires.replace(hour=23, minute=59, second=59, microsecond=999999)
    return expires >= (now or datetime.utcnow())


DELIVERY_MARK_KEYS = {"deliveryMarkedAt", "deliveryMarkedBy"}
DELIVERY_CONFIRM_KEYS = {
    "status",
    "deliveryConfirmedAt",
    "deliveryConfirmedBy",
    "deliveryMarkedAt",
    "deliveryMarkedBy",
}


def _order_keys_equal(
    old_order: dict[str, Any],
    new_order: dict[str, Any],
    ignored: set[str],
) -> bool:
    keys = set(old_order.keys()) | set(new_order.keys())
    for key in keys:
        if key in ignored:
            continue
        if old_order.get(key) != new_order.get(key):
            return False
    return True


def _is_delivery_mark_only_update(
    old_order: dict[str, Any], new_order: dict[str, Any]
) -> bool:
    old_status = str(old_order.get("status") or "")
    new_status = str(new_order.get("status") or "")
    if old_status not in {"confirmed", "pending"}:
        return False
    if new_status != old_status:
        return False
    if not new_order.get("deliveryMarkedAt"):
        return False
    if old_order.get("deliveryMarkedAt"):
        return False
    return _order_keys_equal(old_order, new_order, DELIVERY_MARK_KEYS)


def _is_delivery_confirm_update(
    old_order: dict[str, Any], new_order: dict[str, Any]
) -> bool:
    if str(old_order.get("status") or "") not in {"confirmed", "pending"}:
        return False
    if str(new_order.get("status") or "") != "delivered":
        return False
    if not old_order.get("deliveryMarkedAt"):
        return False
    return _order_keys_equal(old_order, new_order, DELIVERY_CONFIRM_KEYS)


def _created_order_stock_usage(
    old_orders: dict[str, dict[str, Any]],
    new_orders: dict[str, dict[str, Any]],
) -> dict[str, float]:
    usage: dict[str, float] = {}
    for order_id, order in new_orders.items():
        if order_id in old_orders:
            continue
        for item in order.get("items") or []:
            product_id = str(item.get("productId") or "")
            if not product_id:
                continue
            try:
                qty = float(item.get("quantity") or 0)
            except (TypeError, ValueError):
                qty = 0
            if qty > 0:
                usage[product_id] = usage.get(product_id, 0) + qty
    return usage


def _stock_in_receipt_usage(
    old_state: dict[str, Any],
    new_state: dict[str, Any],
) -> dict[str, float]:
    old_receipts = _by_id(old_state.get("stockInReceipts") or [])
    new_receipts = _by_id(new_state.get("stockInReceipts") or [])
    usage: dict[str, float] = {}
    for receipt_id, receipt in new_receipts.items():
        if receipt_id in old_receipts:
            continue
        for line in receipt.get("lines") or []:
            product_id = str(line.get("productId") or "")
            if not product_id:
                continue
            try:
                qty = float(line.get("quantity") or 0)
            except (TypeError, ValueError):
                qty = 0
            if qty > 0:
                usage[product_id] = usage.get(product_id, 0) + qty
    return usage


def _is_order_stock_update(
    old_product: dict[str, Any],
    new_product: dict[str, Any],
    allowed_decrease: float,
) -> bool:
    old_copy = dict(old_product)
    new_copy = dict(new_product)
    try:
        old_stock = float(old_copy.get("stock") or 0)
        new_stock = float(new_copy.get("stock") or 0)
    except (TypeError, ValueError):
        return False
    old_copy["stock"] = new_copy["stock"]
    return (
        old_copy == new_copy
        and allowed_decrease > 0
        and abs((old_stock - new_stock) - allowed_decrease) <= 0.0001
    )


def _is_stock_in_product_update(
    old_product: dict[str, Any],
    new_product: dict[str, Any],
    allowed_increase: float,
) -> bool:
    if allowed_increase <= 0:
        return False
    old_copy = dict(old_product)
    new_copy = dict(new_product)
    try:
        old_stock = float(old_copy.get("stock") or 0)
        new_stock = float(new_copy.get("stock") or 0)
    except (TypeError, ValueError):
        return False
    stock_increase = new_stock - old_stock
    if stock_increase <= 0 or abs(stock_increase - allowed_increase) > 0.0001:
        return False
    # Stock-in may also refresh cost/image/unit/minStock; ignore those when matching.
    for key in ("stock", "costPrice", "image", "unit", "minStock"):
        old_copy.pop(key, None)
        new_copy.pop(key, None)
    return old_copy == new_copy


def _has_any_permission(perms: set[str], *keys: str) -> bool:
    for key in keys:
        if key in perms:
            return True
        if any(alt in perms for alt in PERMISSION_FALLBACKS.get(key, [])):
            return True
    return False


def _can_manage_settings(perms: set[str]) -> bool:
    return _has_any_permission(
        perms,
        "settings.view",
        "promotions.edit",
        "promotions.view",
        "stockAlert.edit",
        "stockAlert.view",
        "percentDiscount.edit",
        "percentDiscount.view",
        "orderHistory.edit",
        "orderHistory.view",
    )


def _can_edit_warehouse(perms: set[str]) -> bool:
    return _has_any_permission(
        perms,
        "warehouse.edit",
        "stockIn.create",
        "stockIn.edit",
        "stockOut.create",
        "stockOut.edit",
        "count.edit",
        "count.create",
    )


def validate_state_mutation(
    old_state: dict[str, Any],
    new_state: dict[str, Any],
    actor: dict[str, Any] | None,
    *,
    import_kind: str | None = None,
) -> tuple[bool, str]:
    if old_state == new_state:
        return True, ""

    if not actor:
        return False, "Нэвтэрсэн ажилтан шаардлагатай"

    employee = find_employee(old_state, actor)
    if not employee:
        return False, "Нэвтэрсэн ажилтан олдсонгүй"

    perms = resolve_permissions(employee)

    old_orders = _by_id(old_state.get("orders") or [])
    new_orders = _by_id(new_state.get("orders") or [])
    created_order_stock = _created_order_stock_usage(old_orders, new_orders)
    stock_in_usage = _stock_in_receipt_usage(old_state, new_state)
    has_new_stock_in_receipts = bool(stock_in_usage)

    if _settings_changed(old_state, new_state) and not _can_manage_settings(perms):
        return False, "Тохиргоо өөрчлөх эрхгүй"

    if (old_state.get("extraGroups") or []) != (new_state.get("extraGroups") or []) or (
        old_state.get("categoryGroups") or {}
    ) != (new_state.get("categoryGroups") or {}):
        if not _has_any_permission(
            perms,
            "groupAdd.view",
            "groupAdd.create",
            "groupAdd.edit",
            "groupAdd.delete",
            "categoryAdd.create",
            "categoryAdd.edit",
            "products.create",
            "products.edit",
        ):
            return False, "Бүлэг өөрчлөх эрхгүй"

    if (old_state.get("extraCategories") or []) != (
        new_state.get("extraCategories") or []
    ):
        if not _has_any_permission(
            perms,
            "categoryAdd.view",
            "categoryAdd.create",
            "categoryAdd.edit",
            "categoryAdd.delete",
            "products.create",
            "products.edit",
        ):
            return False, "Төрөл өөрчлөх эрхгүй"

    if _promotion_rules_changed(old_state, new_state) and not _has_any_permission(
        perms, "promotions.edit", "promotions.view", "settings.view"
    ):
        return False, "Урамшууллын тохиргоо өөрчлөх эрхгүй"

    entity_rules = {
        "employees": (
            ("employees.create", "employeeAdd.create", "employeeAdd.view"),
            ("employees.edit", "employees.delete", "employeeAdd.edit"),
            ("employees.delete", "employees.edit", "employeeAdd.delete"),
        ),
        "suppliers": (
            ("suppliers.create", "suppliers.edit", "warehouse.edit"),
            ("suppliers.edit", "suppliers.create", "warehouse.edit"),
            ("suppliers.delete", "suppliers.edit", "warehouse.edit"),
        ),
        "products": (
            ("products.create", "productAdd.create", "productAdd.view"),
            ("products.edit", "products.delete", "productAdd.edit", "categoryAdd.edit"),
            ("products.delete", "products.edit", "productAdd.delete", "categoryAdd.delete"),
        ),
        "customers": (
            ("customers.create", "customerAdd.create", "customerAdd.view"),
            ("customers.edit", "customers.delete", "customerAdd.edit"),
            ("customers.delete", "customers.edit", "customers.create", "customerAdd.delete"),
        ),
    }

    for key, (create_keys, edit_keys, delete_keys) in entity_rules.items():
        created, updated, deleted = _collection_mutations(
            old_state.get(key) or [],
            new_state.get(key) or [],
        )
        if created and not _has_any_permission(perms, *create_keys):
            return False, f"{key} нэмэх эрхгүй"
        if deleted and not _has_any_permission(perms, *delete_keys):
            return False, f"{key} устгах эрхгүй"
        if key in {"products", "customers"}:
            type_id = "product" if key == "products" else "customer"
            missing_log = [
                item_id
                for item_id in deleted
                if not _deletion_log_has(new_state, type_id, item_id)
            ]
            if missing_log:
                return False, f"{key} устгах баталгаажуулалт дутуу"
        if key == "products" and updated:
            old_product_map = _by_id(old_state.get("products") or [])
            new_product_map = _by_id(new_state.get("products") or [])
            updated = {
                item_id
                for item_id in updated
                if not _is_order_stock_update(
                    old_product_map[item_id],
                    new_product_map[item_id],
                    created_order_stock.get(item_id, 0),
                )
                and not _is_stock_in_product_update(
                    old_product_map[item_id],
                    new_product_map[item_id],
                    stock_in_usage.get(item_id, 0),
                )
            }
        if updated:
            edit_perm_keys = edit_keys
            if import_kind and key == import_kind:
                edit_perm_keys = tuple(
                    dict.fromkeys((*edit_keys, f"{key}.create"))
                )
            if not _has_any_permission(perms, *edit_perm_keys):
                return False, f"{key} засах эрхгүй"

    deleted_orders = set(old_orders) - set(new_orders)
    if deleted_orders:
        if not _has_any_permission(
            perms, "orders.delete", "receipts.delete", "orders.edit"
        ):
            return False, "Захиалга/баримт устгах эрхгүй"
        missing_log = [
            order_id
            for order_id in deleted_orders
            if not _deletion_log_has(new_state, "order", order_id)
        ]
        if missing_log:
            return False, "Захиалга устгах баталгаажуулалт дутуу"
    for order_id, new_order in new_orders.items():
        old_order = old_orders.get(order_id)
        if old_order is None:
            if not _has_any_permission(perms, "orders.create"):
                return False, "Захиалга үүсгэх эрхгүй"
            continue
        if old_order == new_order:
            continue
        if _is_delivery_mark_only_update(old_order, new_order):
            if not _has_any_permission(perms, "orders.markDelivered", "orders.edit"):
                return False, "Захиалга хүргэлт тэмдэглэх эрхгүй"
            continue
        if _is_delivery_confirm_update(old_order, new_order):
            if not _has_any_permission(
                perms, "orders.confirmDelivery", "orders.edit"
            ):
                return False, "Захиалга баталгаажуулах эрхгүй"
            continue
        if not _has_any_permission(perms, "orders.edit", "orders.delete"):
            return False, "Захиалга засах эрхгүй"

    old_products = _by_id(old_state.get("products") or [])
    new_products = _by_id(new_state.get("products") or [])
    allow_delete_stock_restore = bool(deleted_orders) and _has_any_permission(
        perms,
        "orders.delete",
        "receipts.delete",
        "orders.edit",
        "warehouse.edit",
        "stockOut.edit",
        "stockOut.create",
    )
    for product_id, new_product in new_products.items():
        old_product = old_products.get(product_id)
        if not old_product:
            continue
        if old_product.get("stock") != new_product.get("stock") and not _can_edit_warehouse(
            perms
        ):
            if allow_delete_stock_restore:
                continue
            try:
                old_stock = float(old_product.get("stock") or 0)
                new_stock = float(new_product.get("stock") or 0)
            except (TypeError, ValueError):
                return False, "Агуулахын үлдэгдэл өөрчлөх эрхгүй"
            allowed_decrease = created_order_stock.get(product_id, 0)
            actual_decrease = old_stock - new_stock
            if actual_decrease > 0 and allowed_decrease > 0:
                if abs(actual_decrease - allowed_decrease) <= 0.0001:
                    continue
            allowed_increase = stock_in_usage.get(product_id, 0)
            stock_increase = new_stock - old_stock
            if (
                allowed_increase > 0
                and stock_increase > 0
                and abs(stock_increase - allowed_increase) <= 0.0001
            ):
                continue
            if not _has_any_permission(perms, "orders.create", "orders.edit"):
                return False, "Агуулахын үлдэгдэл өөрчлөх эрхгүй"
            if actual_decrease > 0 and allowed_decrease <= 0:
                return False, "Агуулахын үлдэгдэл өөрчлөх эрхгүй"
            if actual_decrease < 0 or abs(actual_decrease - allowed_decrease) > 0.0001:
                return False, "Агуулахын үлдэгдэл өөрчлөх эрхгүй"
        if (
            old_product.get("costPrice") != new_product.get("costPrice")
            and not _can_edit_warehouse(perms)
        ):
            if not (
                has_new_stock_in_receipts
                and stock_in_usage.get(product_id, 0) > 0
            ):
                return False, "Өртөг үнэ өөрчлөх эрхгүй"

    old_logs = old_state.get("inventoryLogs") or []
    new_logs = new_state.get("inventoryLogs") or []
    if len(new_logs) > len(old_logs) and not _can_edit_warehouse(perms):
        if not (
            has_new_stock_in_receipts
            and all(str(log.get("type") or "") == "in" for log in new_logs[len(old_logs) :])
        ):
            return False, "Агуулахын орлого/зарлага бүртгэх эрхгүй"

    return True, ""
