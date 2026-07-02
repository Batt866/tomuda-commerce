from django.db import models


class AppState(models.Model):
    key = models.CharField(max_length=64, unique=True, default="main")
    data = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key


class ProductImage(models.Model):
    product_id = models.CharField(max_length=160, unique=True, db_index=True)
    image = models.BinaryField()
    content_type = models.CharField(max_length=64, default="image/jpeg")
    ext = models.CharField(max_length=8, default="jpg")
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.product_id
