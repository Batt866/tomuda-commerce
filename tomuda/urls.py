import os

from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

from dashboard.api import api
from dashboard.views import dashboard, entity_media, service_worker, web_manifest

urlpatterns = [
    path("", dashboard, name="dashboard"),
    path("sw.js", service_worker, name="service-worker"),
    path("manifest.webmanifest", web_manifest, name="web-manifest"),
    re_path(
        r"^media/(?P<folder>products|employees|customers)/(?P<filename>[^/]+)$",
        entity_media,
        name="entity-media",
    ),
    path("api/", api.urls),
    path("admin/", admin.site.urls),
]

if settings.DEBUG or os.environ.get("SERVE_MEDIA", "1").lower() in {
    "1",
    "true",
    "yes",
    "on",
}:
    urlpatterns += [
        re_path(
            r"^media/(?P<path>.*)$",
            serve,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]
