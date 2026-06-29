from typing import Any

from ninja import Body, NinjaAPI
from ninja.errors import HttpError

from dashboard.models import AppState
from dashboard.permissions import PERMISSION_CATALOG, validate_state_mutation
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


@api.post("/state")
def save_state(request, payload: dict[str, Any] = Body(...)):
    data = payload.get("state", payload)
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
