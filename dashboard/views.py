import json
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET


def dashboard(request):
    return render(request, "dashboard.html")


@require_GET
@cache_control(max_age=0, no_cache=True, no_store=True, must_revalidate=True)
def service_worker(request):
    sw_path = Path(settings.BASE_DIR) / "static" / "tomuda" / "sw.js"
    response = FileResponse(sw_path.open("rb"), content_type="application/javascript")
    response["Service-Worker-Allowed"] = "/"
    return response


@require_GET
@cache_control(max_age=86400)
def web_manifest(request):
    manifest_path = Path(settings.BASE_DIR) / "static" / "tomuda" / "manifest.webmanifest"
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    origin = request.build_absolute_uri("/").rstrip("/")
    data["id"] = origin + "/"
    data["start_url"] = origin + "/"
    data["scope"] = origin + "/"
    for icon in data.get("icons", []):
        src = icon.get("src", "")
        if src.startswith("/"):
            icon["src"] = origin + src
    return JsonResponse(data, json_dumps_params={"ensure_ascii": False})
