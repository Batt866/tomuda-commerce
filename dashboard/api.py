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
    _order_within_retention,
)
from dashboard.product_images import save_product_image, update_product_image_in_state
from dashboard.seed_data import default_state
from dashboard.state_sanitize import sanitize_app_state

api = NinjaAPI(title="Tomuda API")


@api.get("/health")
def health(request):
    return {"ok": True}


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
    if changed:
        row.data = data
        row.save(update_fields=["data", "updated_at"])
    return {"ok": True, "state": data, "updatedAt": row.updated_at.isoformat()}


def _retained_orders_state(data: dict[str, Any]) -> dict[str, Any]:
    next_state = dict(data or {})
    orders = next_state.get("orders") or []
    next_state["orders"] = [
        order for order in orders if _order_within_retention(order)
    ]
    return next_state


@api.post("/state")
def save_state(request, payload: dict[str, Any] = Body(...)):
    data = _retained_orders_state(payload.get("state", payload))
    data, _ = sanitize_app_state(data)
    actor = payload.get("actor")
    row, _ = AppState.objects.get_or_create(
        key="main",
        defaults={"data": default_state()},
    )
    ok, message = validate_state_mutation(row.data or {}, data, actor)
    if not ok:
        raise HttpError(403, message or "Эрх хүрэлцэхгүй")
    row.data = data
    row.save(update_fields=["data", "updated_at"])
    return {"ok": True, "updatedAt": row.updated_at.isoformat()}


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
        url = save_product_image(product_id, data_url)
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
        ok, message = validate_state_mutation(current, next_state, actor_data)
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
        ok, message = validate_state_mutation(current, next_state, actor_data)
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
