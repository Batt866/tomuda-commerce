from typing import Any

from ninja import Body, NinjaAPI
from ninja.errors import HttpError

from dashboard.models import AppState
from dashboard.permissions import (
    PERMISSION_CATALOG,
    _order_within_retention,
    validate_state_mutation,
)
from dashboard.seed_data import default_state

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
    return {"ok": True, "state": row.data, "updatedAt": row.updated_at.isoformat()}


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
