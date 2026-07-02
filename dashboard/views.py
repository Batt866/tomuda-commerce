import json
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET

from dashboard.product_images import (
    IMAGE_EXT_TO_MIME,
    get_stored_product_image,
    safe_product_id,
)


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
@cache_control(max_age=0, no_cache=True, no_store=True, must_revalidate=True)
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


@require_GET
def product_media(request, filename: str):
    stem, dot, ext = str(filename or "").rpartition(".")
    ext = ext.lower()
    if not dot or ext not in IMAGE_EXT_TO_MIME:
        raise Http404("Product image not found")
    try:
        product_id = safe_product_id(stem)
    except ValueError as exc:
        raise Http404("Product image not found") from exc
    if product_id != stem:
        raise Http404("Product image not found")

    file_path = Path(settings.MEDIA_ROOT) / "products" / f"{product_id}.{ext}"
    try:
        if file_path.is_file() and file_path.stat().st_size > 32:
            response = FileResponse(
                file_path.open("rb"),
                content_type=IMAGE_EXT_TO_MIME[ext],
            )
            response["Cache-Control"] = "public, max-age=31536000, immutable"
            return response
    except OSError:
        pass

    image = get_stored_product_image(product_id)
    if not image:
        raise Http404("Product image not found")
    raw = bytes(image.image)
    response = HttpResponse(raw, content_type=image.content_type or IMAGE_EXT_TO_MIME[ext])
    response["Content-Length"] = str(len(raw))
    response["Cache-Control"] = "public, max-age=31536000, immutable"
    return response
