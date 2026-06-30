"""Permission catalog and state mutation validation (mirror static/tomuda/permissions.js)."""

from __future__ import annotations

from typing import Any

PERM_ACTIONS: list[dict[str, str]] = [
    {"id": "view", "label": "Харах"},
    {"id": "create", "label": "Нэмэх"},
    {"id": "edit", "label": "Засах"},
    {"id": "delete", "label": "Устгах"},
]

PERM_MODULES: list[dict[str, Any]] = [
    {"id": "dashboard", "label": "Админ самбар", "actions": ["view"]},
    {
        "id": "products",
        "label": "Бараа",
        "actions": ["view", "create", "edit", "delete"],
    },
    {
        "id": "customers",
        "label": "Харилцагч",
        "actions": ["view", "create", "edit", "delete"],
    },
    {"id": "warehouse", "label": "Агуулах", "actions": ["view", "edit"]},
    {
        "id": "orders",
        "label": "Баримт",
        "actions": ["view", "create", "edit", "delete"],
    },
    {"id": "reports", "label": "Тайлан", "actions": ["view"]},
    {
        "id": "employees",
        "label": "Ажилтан",
        "actions": ["view", "create", "edit", "delete"],
    },
    {
        "id": "permissions",
        "label": "Эрх",
        "actions": ["view", "create", "edit", "delete"],
    },
    {"id": "settings", "label": "Тохиргоо", "actions": ["view"]},
]

ACTION_LABELS: dict[str, str] = {
    "view": "харах",
    "create": "нэмэх",
    "edit": "засах",
    "delete": "устгах",
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


def _has_any_permission(perms: set[str], *keys: str) -> bool:
    return any(k in perms for k in keys)


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
        "employees": (
            ("employees.create",),
            ("employees.edit", "employees.delete"),
            ("employees.delete", "employees.edit"),
        ),
        "products": (
            ("products.create",),
            ("products.edit", "products.delete"),
            ("products.delete", "products.edit"),
        ),
        "customers": (
            ("customers.create",),
            ("customers.edit", "customers.delete"),
            ("customers.delete", "customers.edit", "customers.create"),
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
        if updated and not _has_any_permission(perms, *edit_keys):
            return False, f"{key} засах эрхгүй"

    old_orders = _by_id(old_state.get("orders") or [])
    new_orders = _by_id(new_state.get("orders") or [])
    for order_id, new_order in new_orders.items():
        old_order = old_orders.get(order_id)
        if old_order is None:
            if not _has_any_permission(perms, "orders.create"):
                return False, "Захиалга үүсгэх эрхгүй"
            continue
        if old_order != new_order and not _has_any_permission(
            perms, "orders.edit", "orders.delete"
        ):
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
