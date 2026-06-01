from django.db import models


class AppState(models.Model):
    key = models.CharField(max_length=64, unique=True, default="main")
    data = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key
