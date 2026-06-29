"""Permission catalog and state mutation validation (mirror static/tomuda/permissions.js)."""

from __future__ import annotations

from typing import Any

PERMISSION_CATALOG: list[dict[str, Any]] = [
    {
        "id": "dashboard",
        "label": "Dashboard",
        "permissions": [{"key": "dashboard.view", "label": "Dashboard харах"}],
    },
    {
        "id": "warehouse",
        "label": "Агуулах",
        "permissions": [
            {"key": "warehouse.view", "label": "Агуулах харах"},
            {"key": "warehouse.edit", "label": "Агуулах засах"},
        ],
    },
    {
        "id": "products",
        "label": "Бараа",
        "permissions": [
            {"key": "products.view", "label": "Бараа харах"},
            {"key": "products.create", "label": "Бараа нэмэх"},
            {"key": "products.edit", "label": "Бараа засах"},
        ],
    },
    {
        "id": "customers",
        "label": "Харилцагч",
        "permissions": [
            {"key": "customers.view", "label": "Харилцагч харах"},
            {"key": "customers.create", "label": "Харилцагч нэмэх"},
        ],
    },
    {
        "id": "orders",
        "label": "Захиалга",
        "permissions": [
            {"key": "orders.view", "label": "Захиалга харах"},
            {"key": "orders.create", "label": "Захиалга үүсгэх"},
            {"key": "orders.edit", "label": "Захиалга засах"},
        ],
    },
    {
        "id": "reports",
        "label": "Тайлан",
        "permissions": [{"key": "reports.view", "label": "Тайлан харах"}],
    },
    {
        "id": "employees",
        "label": "Ажилтан",
        "permissions": [
            {"key": "employees.view", "label": "Ажилтан харах"},
            {"key": "employees.create", "label": "Ажилтан нэмэх"},
            {"key": "employees.edit", "label": "Ажилтан засах"},
        ],
    },
    {
        "id": "settings",
        "label": "Тохиргоо",
        "permissions": [{"key": "settings.view", "label": "Тохиргоо харах"}],
    },
]

ALL_PERMISSION_KEYS: list[str] = [
    p["key"] for cat in PERMISSION_CATALOG for p in cat["permissions"]
]

ROLE_TEMPLATES: dict[str, list[str]] = {
    "admin": list(ALL_PERMISSION_KEYS),
    "sales": [
        "dashboard.view",
        "orders.view",
        "orders.create",
        "orders.edit",
        "customers.view",
        "customers.create",
        "products.view",
        "warehouse.view",
    ],
    "warehouse": ["warehouse.view", "warehouse.edit", "products.view"],
    "delivery": ["orders.view"],
}


def normalize_permissions(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    return [k for k in raw if k in ALL_PERMISSION_KEYS]


def resolve_permissions(employee: dict[str, Any] | None) -> set[str]:
    if not employee:
        return set()
    custom = normalize_permissions(employee.get("permissions"))
    if custom:
        return set(custom)
    role = str(employee.get("role") or "sales")
    return set(ROLE_TEMPLATES.get(role, ROLE_TEMPLATES["sales"]))


def has_permission(employee: dict[str, Any] | None, key: str) -> bool:
    return key in resolve_permissions(employee)


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


def _ids(items: list[dict[str, Any]]) -> set[str]:
    return {str(x.get("id")) for x in items if x.get("id") is not None}


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


def validate_state_mutation(
    old_state: dict[str, Any],
    new_state: dict[str, Any],
    actor: dict[str, Any] | None,
) -> tuple[bool, str]:
    if old_state == new_state:
        return True, ""

    if not actor:
        return False, "Нэвтэрсэн ажилтан шаардлагатай"

    employee = find_employee(old_state, actor)
    if not employee:
        return False, "Нэвтэрсэн ажилтан олдсонгүй"

    perms = resolve_permissions(employee)

    if _settings_changed(old_state, new_state) and "settings.view" not in perms:
        return False, "Тохиргоо өөрчлөх эрхгүй"

    if _promotion_rules_changed(old_state, new_state) and "settings.view" not in perms:
        return False, "Урамшуулалын тохиргоо өөрчлөх эрхгүй"

    entity_rules = {
        "employees": ("employees.create", "employees.edit"),
        "products": ("products.create", "products.edit"),
        "customers": ("customers.create", "customers.create"),
    }

    for key, (create_perm, edit_perm) in entity_rules.items():
        created, updated, deleted = _collection_mutations(
            old_state.get(key) or [],
            new_state.get(key) or [],
        )
        if created and create_perm not in perms:
            return False, f"{key} нэмэх эрхгүй"
        if deleted and edit_perm not in perms:
            return False, f"{key} устгах эрхгүй"
        if updated and edit_perm not in perms:
            return False, f"{key} засах эрхгүй"

    old_orders = _by_id(old_state.get("orders") or [])
    new_orders = _by_id(new_state.get("orders") or [])
    for order_id, new_order in new_orders.items():
        old_order = old_orders.get(order_id)
        if old_order is None:
            if "orders.create" not in perms:
                return False, "Захиалга үүсгэх эрхгүй"
            continue
        if old_order != new_order and "orders.edit" not in perms:
            return False, "Захиалга засах эрхгүй"

    old_products = _by_id(old_state.get("products") or [])
    new_products = _by_id(new_state.get("products") or [])
    for product_id, new_product in new_products.items():
        old_product = old_products.get(product_id)
        if not old_product:
            continue
        if old_product.get("stock") != new_product.get("stock") and "warehouse.edit" not in perms:
            return False, "Агуулахын үлдэгдэл өөрчлөх эрхгүй"
        if old_product.get("costPrice") != new_product.get("costPrice") and "warehouse.edit" not in perms:
            return False, "Өртөг үнэ өөрчлөх эрхгүй"

    old_logs = old_state.get("inventoryLogs") or []
    new_logs = new_state.get("inventoryLogs") or []
    if len(new_logs) > len(old_logs) and "warehouse.edit" not in perms:
        return False, "Агуулахын орлого/зарлага бүртгэх эрхгүй"

    return True, ""
