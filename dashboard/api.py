from typing import Any

from ninja import Body, NinjaAPI

from dashboard.models import AppState
from dashboard.seed_data import default_state

api = NinjaAPI(title="Tomuda API")


@api.get("/health")
def health(request):
    return {"ok": True, "app": "tomuda"}


@api.get("/meta")
def meta(request):
    return {
        "frontend": "html-tailwind-vanilla",
        "backend": "django-ninja",
        "react": False,
        "tsx": False,
    }


@api.get("/state")
def get_state(request):
    row, _ = AppState.objects.get_or_create(
        key="main",
        defaults={"data": default_state()},
    )
    return {"ok": True, "state": row.data}


@api.post("/state")
def save_state(request, payload: dict[str, Any] = Body(...)):
    data = payload.get("state", payload)
    row, _ = AppState.objects.update_or_create(
        key="main",
        defaults={"data": data},
    )
    return {"ok": True, "updatedAt": row.updated_at.isoformat()}
