from django.contrib import admin
from django.urls import include, path

from dashboard.api import api
from dashboard.views import dashboard, service_worker, web_manifest

urlpatterns = [
    path("", dashboard, name="dashboard"),
    path("sw.js", service_worker, name="service-worker"),
    path("manifest.webmanifest", web_manifest, name="web-manifest"),
    path("api/", api.urls),
    path("admin/", admin.site.urls),
]
