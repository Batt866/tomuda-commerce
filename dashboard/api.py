from __future__ import annotations

from typing import Any

from django.db import transaction
from django.http import HttpResponse
from ninja import Body, File, Form, NinjaAPI
from ninja.errors import HttpError
from ninja.files import UploadedFile

from dashboard.excel_import import (
    _append_import_log,
    build_customer_template_bytes,
    build_product_template_bytes,
    import_customers_into_state,
    import_products_into_state,
    load_sheet_rows,
    parse_actor,
)
from dashboard.models import AppState
from dashboard.permissions import (
    PERMISSION_CATALOG,
    find_employee,
    has_permission,
    validate_state_mutation,
    _order_retention_days,
    _order_within_retention,
)
from dashboard.product_images import (
    hydrate_product_images,
    mirror_product_image,
    persist_imported_product_images,
    save_product_image,
    update_product_image_in_state,
)
from dashboard.profile_images import (
    hydrate_profile_images,
    save_profile_image,
    update_profile_image_in_state,
)
from dashboard.seed_data import default_state
from dashboard.state_merge import merge_app_states
from dashboard.state_sanitize import sanitize_app_state

api = NinjaAPI(title="Tomuda API")


def _hydrate_all_images(state: dict) -> tuple[dict, bool]:
    state, product_changed = hydrate_product_images(state)
    state, profile_changed = hydrate_profile_images(state)
    return state, product_changed or profile_changed


def _retained_orders_state(data: dict[str, Any]) -> dict[str, Any]:
    next_state = dict(data or {})
    orders = next_state.get("orders") or []
    retention_days = _order_retention_days(next_state)
    next_state["orders"] = [
        order
        for order in orders
        if _order_within_retention(order, retention_days=retention_days)
    ]
    return next_state


def _purge_expired_orders_from_row(row: AppState) -> int:
    data = row.data or default_state()
    before = len(data.get("orders") or [])
    cleaned = _retained_orders_state(data)
    after = len(cleaned.get("orders") or [])
    if after < before:
        row.data = cleaned
        row.save(update_fields=["data", "updated_at"])
    return before - after


@api.get("/health")
def health(request):
    purged = 0
    row = AppState.objects.filter(key="main").first()
    if row:
        purged = _purge_expired_orders_from_row(row)
    payload = {"ok": True}
    if purged:
        payload["purgedOrders"] = purged
    return payload


@api.get("/meta")
def meta(request):
    return {
        "frontend": "html-tailwind-vanilla",
        "backend": "django-ninja",
        "react": False,
        "tsx": False,
    }


@api.get("/permissions")
def get_permissions(request):
    return {"ok": True, "catalog": PERMISSION_CATALOG}


@api.get("/state")
def get_state(request):
    row, _ = AppState.objects.get_or_create(
        key="main",
        defaults={"data": default_state()},
    )
    data, changed = sanitize_app_state(row.data or default_state())
    data, hydrated = _hydrate_all_images(data)
    changed = changed or hydrated
    retained = _retained_orders_state(data)
    if len(retained.get("orders") or []) < len(data.get("orders") or []):
        data = retained
        changed = True
    if changed:
        row.data = data
        row.save(update_fields=["data", "updated_at"])
    return {"ok": True, "state": data, "updatedAt": row.updated_at.isoformat()}


@api.post("/state")
def save_state(request, payload: dict[str, Any] = Body(...)):
    incoming = _retained_orders_state(payload.get("state", payload))
    incoming, _ = sanitize_app_state(incoming)
    incoming, _ = _hydrate_all_images(incoming)
    actor = payload.get("actor")

    with transaction.atomic():
        row, _ = AppState.objects.get_or_create(
            key="main",
            defaults={"data": default_state()},
        )
        row = AppState.objects.select_for_update().get(pk=row.pk)
        current = dict(row.data or default_state())
        # Merge so one device cannot wipe customers/orders created on another.
        data = merge_app_states(current, incoming)
        data = _retained_orders_state(data)
        data, _ = sanitize_app_state(data)
        data, _ = _hydrate_all_images(data)
        ok, message = validate_state_mutation(current, data, actor)
        if not ok:
            raise HttpError(403, message or "Эрх хүрэлцэхгүй")
        row.data = data
        row.save(update_fields=["data", "updated_at"])
        updated_at = row.updated_at.isoformat()

    return {"ok": True, "state": data, "updatedAt": updated_at}


def _actor_payload(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None
    actor = payload.get("actor")
    return actor if isinstance(actor, dict) else None


def _strip_customer_inline_image(customer: dict[str, Any]) -> dict[str, Any]:
    next_customer = dict(customer)
    image = str(next_customer.get("image") or "").strip()
    if image.startswith("data:image/"):
        next_customer.pop("image", None)
    elif image:
        next_customer["image"] = image
    else:
        next_customer.pop("image", None)
    return next_customer


@api.post("/customers/upsert")
def upsert_customer(request, payload: dict[str, Any] = Body(...)):
    """Atomically create/update one customer so devices do not wait on full-state races."""
    raw_customer = payload.get("customer")
    if not isinstance(raw_customer, dict) or raw_customer.get("id") is None:
        raise HttpError(400, "Харилцагчийн мэдээлэл дутуу байна")
    customer = _strip_customer_inline_image(raw_customer)
    customer_id = str(customer.get("id"))
    actor = _actor_payload(payload)

    with transaction.atomic():
        row, _ = AppState.objects.get_or_create(
            key="main",
            defaults={"data": default_state()},
        )
        row = AppState.objects.select_for_update().get(pk=row.pk)
        current = dict(row.data or default_state())
        employee = find_employee(current, actor)
        if not employee:
            raise HttpError(403, "Нэвтэрсэн ажилтан шаардлагатай")

        customers = [
            dict(item)
            for item in (current.get("customers") or [])
            if isinstance(item, dict) and item.get("id") is not None
        ]
        existing_idx = next(
            (
                index
                for index, item in enumerate(customers)
                if str(item.get("id")) == customer_id
            ),
            -1,
        )
        if existing_idx >= 0:
            if not (
                has_permission(employee, "customers.edit")
                or has_permission(employee, "customers.create")
                or has_permission(employee, "customerAdd.edit")
                or has_permission(employee, "customerAdd.create")
            ):
                raise HttpError(403, "Харилцагч засах эрхгүй")
            previous = customers[existing_idx]
            merged_customer = {**previous, **customer}
            if not merged_customer.get("image") and previous.get("image"):
                merged_customer["image"] = previous["image"]
            customers[existing_idx] = merged_customer
            saved_customer = merged_customer
        else:
            if not (
                has_permission(employee, "customers.create")
                or has_permission(employee, "customerAdd.create")
                or has_permission(employee, "customerAdd.view")
            ):
                raise HttpError(403, "Харилцагч нэмэх эрхгүй")
            customers.append(customer)
            saved_customer = customer

        data = dict(current)
        data["customers"] = customers
        # Re-adding a customer clears its tombstone so merge won't drop it again.
        data["deletionLog"] = [
            entry
            for entry in (data.get("deletionLog") or [])
            if not (
                isinstance(entry, dict)
                and str(entry.get("type") or "") == "customer"
                and str(entry.get("id") or "") == customer_id
            )
        ]
        data, _ = sanitize_app_state(data)
        data, _ = _hydrate_all_images(data)
        row.data = data
        row.save(update_fields=["data", "updated_at"])
        updated_at = row.updated_at.isoformat()

    return {
        "ok": True,
        "customer": saved_customer,
        "state": data,
        "updatedAt": updated_at,
    }


def _order_item_qty_map(items: Any) -> dict[str, float]:
    qty: dict[str, float] = {}
    if not isinstance(items, list):
        return qty
    for item in items:
        if not isinstance(item, dict):
            continue
        product_id = str(item.get("productId") or "").strip()
        if not product_id:
            continue
        try:
            amount = float(item.get("quantity") or 0)
        except (TypeError, ValueError):
            amount = 0.0
        if amount <= 0:
            continue
        qty[product_id] = qty.get(product_id, 0.0) + amount
    return qty


def _adjust_order_stock(
    products: list[dict[str, Any]],
    before_items: Any,
    after_items: Any,
) -> None:
    before = _order_item_qty_map(before_items)
    after = _order_item_qty_map(after_items)
    product_map = {
        str(item.get("id")): item
        for item in products
        if isinstance(item, dict) and item.get("id") is not None
    }
    for product_id in set(before) | set(after):
        delta = after.get(product_id, 0.0) - before.get(product_id, 0.0)
        if abs(delta) < 0.0001:
            continue
        product = product_map.get(product_id)
        if not product:
            continue
        try:
            stock = float(product.get("stock") or 0)
        except (TypeError, ValueError):
            stock = 0.0
        if delta > 0:
            product["stock"] = max(0, stock - delta)
        else:
            product["stock"] = stock - delta  # delta negative => increase


def _validate_order_stock(
    products: list[dict[str, Any]],
    before_items: Any,
    after_items: Any,
) -> None:
    before = _order_item_qty_map(before_items)
    after = _order_item_qty_map(after_items)
    product_map = {
        str(item.get("id")): item
        for item in products
        if isinstance(item, dict) and item.get("id") is not None
    }
    shortages = []
    for product_id, need in after.items():
        extra = need - before.get(product_id, 0.0)
        if extra <= 0:
            continue
        product = product_map.get(product_id)
        try:
            have = float((product or {}).get("stock") or 0)
        except (TypeError, ValueError):
            have = 0.0
        # Credit back the qty already reserved by the previous version of this order.
        have += before.get(product_id, 0.0)
        if need > have + 0.0001:
            name = str((product or {}).get("name") or product_id)
            shortages.append(f"{name}: {int(have)} үлдсэн, {int(need)} ш хэрэгтэй")
    if shortages:
        raise HttpError(400, "Үлдэгдэл хүрэлцэхгүй байна.\n" + "\n".join(shortages))


@api.post("/orders/upsert")
def upsert_order(request, payload: dict[str, Any] = Body(...)):
    """Atomically create/update one order so peer devices see it immediately."""
    raw_order = payload.get("order")
    if not isinstance(raw_order, dict) or raw_order.get("id") is None:
        raise HttpError(400, "Захиалгын мэдээлэл дутуу байна")
    order = dict(raw_order)
    order_id = str(order.get("id"))
    actor = _actor_payload(payload)
    previous_items = payload.get("previousItems")

    with transaction.atomic():
        row, _ = AppState.objects.get_or_create(
            key="main",
            defaults={"data": default_state()},
        )
        row = AppState.objects.select_for_update().get(pk=row.pk)
        current = dict(row.data or default_state())
        employee = find_employee(current, actor)
        if not employee:
            raise HttpError(403, "Нэвтэрсэн ажилтан шаардлагатай")

        orders = [
            dict(item)
            for item in (current.get("orders") or [])
            if isinstance(item, dict) and item.get("id") is not None
        ]
        products = [
            dict(item)
            for item in (current.get("products") or [])
            if isinstance(item, dict) and item.get("id") is not None
        ]
        existing_idx = next(
            (
                index
                for index, item in enumerate(orders)
                if str(item.get("id")) == order_id
            ),
            -1,
        )

        if existing_idx >= 0:
            if not (
                has_permission(employee, "orders.edit")
                or has_permission(employee, "orders.create")
            ):
                raise HttpError(403, "Захиалга засах эрхгүй")
            previous = orders[existing_idx]
            before_items = (
                previous_items
                if isinstance(previous_items, list)
                else previous.get("items") or []
            )
            _validate_order_stock(products, before_items, order.get("items") or [])
            _adjust_order_stock(products, before_items, order.get("items") or [])
            merged_order = {**previous, **order}
            orders[existing_idx] = merged_order
            saved_order = merged_order
        else:
            if not has_permission(employee, "orders.create"):
                raise HttpError(403, "Захиалга үүсгэх эрхгүй")
            _validate_order_stock(products, [], order.get("items") or [])
            _adjust_order_stock(products, [], order.get("items") or [])
            orders.append(order)
            saved_order = order

        data = dict(current)
        data["orders"] = orders
        data["products"] = products
        data["deletionLog"] = [
            entry
            for entry in (data.get("deletionLog") or [])
            if not (
                isinstance(entry, dict)
                and str(entry.get("type") or "") == "order"
                and str(entry.get("id") or "") == order_id
            )
        ]
        data = _retained_orders_state(data)
        data, _ = sanitize_app_state(data)
        data, _ = _hydrate_all_images(data)
        row.data = data
        row.save(update_fields=["data", "updated_at"])
        updated_at = row.updated_at.isoformat()

    return {
        "ok": True,
        "order": saved_order,
        "state": data,
        "updatedAt": updated_at,
    }


def _require_import_permission(state: dict[str, Any], actor: dict[str, Any] | None, perm: str) -> None:
    if not actor:
        raise HttpError(403, "Нэвтэрсэн ажилтан шаардлагатай")
    employee = find_employee(state, actor)
    if not employee:
        raise HttpError(403, "Нэвтэрсэн ажилтан олдсонгүй")
    if not has_permission(employee, perm):
        raise HttpError(403, "Импорт хийх эрхгүй")


@api.get("/import/customers/template")
def customer_import_template(request):
    content = build_customer_template_bytes()
    response = HttpResponse(
        content,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = 'attachment; filename="hariltsagch-format.xlsx"'
    return response


@api.get("/import/products/template")
def product_import_template(request):
    content = build_product_template_bytes()
    response = HttpResponse(
        content,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = 'attachment; filename="baraa-format.xlsx"'
    return response


@api.post("/products/{product_id}/image")
def upload_product_image(
    request, product_id: str, payload: dict[str, Any] = Body(...)
):
    data_url = payload.get("image") or payload.get("dataUrl") or ""
    source_url = payload.get("sourceUrl") or payload.get("source_url") or ""
    actor = payload.get("actor")

    row, _ = AppState.objects.get_or_create(
        key="main",
        defaults={"data": default_state()},
    )
    current = dict(row.data or default_state())
    employee = find_employee(current, actor)
    if not employee:
        raise HttpError(403, "Нэвтэрсэн ажилтан шаардлагатай")

    product_exists = any(
        str(p.get("id")) == str(product_id)
        for p in current.get("products") or []
        if isinstance(p, dict)
    )
    if product_exists:
        if not has_permission(employee, "products.edit"):
            raise HttpError(403, "Бараа засах эрхгүй")
    elif not has_permission(employee, "products.create"):
        raise HttpError(403, "Бараа нэмэх эрхгүй")

    try:
        if data_url:
            url = save_product_image(product_id, data_url)
        elif source_url:
            url = mirror_product_image(product_id, source_url)
        else:
            raise ValueError("Зураг оруулна уу")
    except ValueError as exc:
        raise HttpError(400, str(exc)) from exc

    with transaction.atomic():
        row = AppState.objects.select_for_update().get(key="main")
        current = dict(row.data or default_state())
        update_product_image_in_state(current, product_id, url)
        row.data = current
        row.save(update_fields=["data", "updated_at"])
        updated_at = row.updated_at.isoformat()

    return {"ok": True, "url": url, "updatedAt": updated_at}


def _upload_profile_image(
    *,
    kind: str,
    entity_id: str,
    payload: dict[str, Any],
    collection_key: str,
    edit_perm: str,
    create_perm: str,
) -> dict[str, Any]:
    data_url = payload.get("image") or payload.get("dataUrl") or ""
    actor = payload.get("actor")
    if not data_url:
        raise HttpError(400, "Зураг оруулна уу")

    row, _ = AppState.objects.get_or_create(
        key="main",
        defaults={"data": default_state()},
    )
    current = dict(row.data or default_state())
    employee = find_employee(current, actor)
    if not employee:
        raise HttpError(403, "Нэвтэрсэн ажилтан шаардлагатай")

    entity_exists = any(
        str(item.get("id")) == str(entity_id)
        for item in current.get(collection_key) or []
        if isinstance(item, dict)
    )
    if entity_exists:
        if not has_permission(employee, edit_perm):
            raise HttpError(403, "Засах эрхгүй")
    elif not has_permission(employee, create_perm):
        raise HttpError(403, "Нэмэх эрхгүй")

    try:
        url = save_profile_image(kind, entity_id, data_url)
    except ValueError as exc:
        raise HttpError(400, str(exc)) from exc

    with transaction.atomic():
        row = AppState.objects.select_for_update().get(key="main")
        current = dict(row.data or default_state())
        update_profile_image_in_state(current, kind, entity_id, url)
        row.data = current
        row.save(update_fields=["data", "updated_at"])
        updated_at = row.updated_at.isoformat()

    return {"ok": True, "url": url, "updatedAt": updated_at}


@api.post("/employees/{employee_id}/image")
def upload_employee_image(
    request, employee_id: str, payload: dict[str, Any] = Body(...)
):
    return _upload_profile_image(
        kind="employee",
        entity_id=employee_id,
        payload=payload,
        collection_key="employees",
        edit_perm="employees.edit",
        create_perm="employees.create",
    )


@api.post("/customers/{customer_id}/image")
def upload_customer_image(
    request, customer_id: str, payload: dict[str, Any] = Body(...)
):
    return _upload_profile_image(
        kind="customer",
        entity_id=customer_id,
        payload=payload,
        collection_key="customers",
        edit_perm="customers.edit",
        create_perm="customers.create",
    )


@api.post("/import/customers")
def import_customers(request, file: UploadedFile = File(...), actor: str = Form("")):
    actor_data = parse_actor(actor)
    data = file.read()
    filename = file.name or "upload.xlsx"
    try:
        rows = load_sheet_rows(data, filename)
    except ValueError as exc:
        raise HttpError(400, str(exc)) from exc

    with transaction.atomic():
        row, _ = AppState.objects.get_or_create(
            key="main",
            defaults={"data": default_state()},
        )
        row = AppState.objects.select_for_update().get(pk=row.pk)
        current = dict(row.data or default_state())
        _require_import_permission(current, actor_data, "customers.create")
        try:
            next_state, report = import_customers_into_state(current, rows)
        except ValueError as exc:
            raise HttpError(400, str(exc)) from exc
        ok, message = validate_state_mutation(
            current, next_state, actor_data, import_kind="customers"
        )
        if not ok:
            raise HttpError(403, message or "Эрх хүрэлцэхгүй")
        _append_import_log(next_state, kind="customers", actor=actor_data, report=report)
        row.data = next_state
        row.save(update_fields=["data", "updated_at"])
        updated_at = row.updated_at.isoformat()

    return {
        "ok": True,
        "report": report,
        "customers": next_state.get("customers") or [],
        "updatedAt": updated_at,
    }


@api.post("/import/products")
def import_products(request, file: UploadedFile = File(...), actor: str = Form("")):
    actor_data = parse_actor(actor)
    data = file.read()
    filename = file.name or "upload.xlsx"
    try:
        rows = load_sheet_rows(data, filename)
    except ValueError as exc:
        raise HttpError(400, str(exc)) from exc

    with transaction.atomic():
        row, _ = AppState.objects.get_or_create(
            key="main",
            defaults={"data": default_state()},
        )
        row = AppState.objects.select_for_update().get(pk=row.pk)
        current = dict(row.data or default_state())
        _require_import_permission(current, actor_data, "products.create")
        try:
            next_state, report = import_products_into_state(current, rows)
        except ValueError as exc:
            raise HttpError(400, str(exc)) from exc
        product_ids = report.pop("_productIds", [])
        image_report = persist_imported_product_images(
            next_state,
            previous_state=current,
            product_ids=product_ids,
        )
        report.update(image_report)
        ok, message = validate_state_mutation(
            current, next_state, actor_data, import_kind="products"
        )
        if not ok:
            raise HttpError(403, message or "Эрх хүрэлцэхгүй")
        _append_import_log(next_state, kind="products", actor=actor_data, report=report)
        row.data = next_state
        row.save(update_fields=["data", "updated_at"])
        updated_at = row.updated_at.isoformat()

    return {
        "ok": True,
        "report": report,
        "products": next_state.get("products") or [],
        "updatedAt": updated_at,
    }
