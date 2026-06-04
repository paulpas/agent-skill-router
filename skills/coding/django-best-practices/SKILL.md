---
name: django-best-practices
description: Implements Django 5.x application patterns including modern project structure,
  ORM optimization, class-based and function views, DRF integration, async views,
  caching strategies, and settings management for production-ready web applications.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: django, django best practices, django project structure, orm optimization,
    class-based views, drf, django rest framework, django async, django caching, settings
    management, production django
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: fastapi-development
---
# Django Best Practices

Senior Django engineer building production-ready web applications using Django 5.x patterns and modern Python practices. This skill covers the full stack — from project architecture and ORM optimization to API design with DRF, async views, caching strategies, and environment-aware settings management.

## TL;DR Checklist

- [ ] Structure project with `config/` (project settings) and `apps/` (Django apps) directories
- [ ] Split settings per environment using `django-split-settings` or `django-environ`
- [ ] Use `select_related()` for ForeignKey lookups in loops, `prefetch_related()` for ManyToMany/ReverseForeignKey
- [ ] Replace `.count() + .all()` with `.exists()` for boolean checks
- [ ] Prefer function-based views for simple logic; use class-based views for complex, reusable patterns
- [ ] Put business logic in models and services — never in views
- [ ] Configure DRF pagination, throttling, and authentication classes globally
- [ ] Use Redis/Memcached as cache backend in production, never file-based caching
- [ ] Store all secrets via environment variables — never commit them to settings files
- [ ] Apply `@method_decorator(login_required)` or `LoginRequiredMixin` consistently on CBVs

---

## When to Use

- Setting up a new Django 5.x project from scratch and needing the recommended structure
- Optimizing slow database queries caused by N+1 problems or missing index usage
- Designing REST APIs with Django REST Framework (DRF) — serializers, viewsets, permissions
- Building class-based views with custom mixins for reusable logic (permissions, context, headers)
- Configuring production-ready settings: caching, static/media handling, logging, security headers
- Implementing async views or async ORM operations in Django 4.1+
- Refactoring a legacy Django codebase to modern patterns and conventions

---

## When NOT to Use

- Building a microservice where lightweight frameworks like FastAPI are more appropriate — use `fastapi-development` instead
- Creating simple scripts or CLIs — use the standard library's `argparse` or `click` instead of Django's management commands
- Real-time WebSocket-heavy applications — consider Django Channels only if you must stay within the Django ecosystem, otherwise prefer a dedicated solution

---

## Core Workflow

1. **Scaffold Project Structure** — Create `config/` for settings (local.py, production.py, base.py) and `apps/` for each Django app. Use `django-admin startproject config .` to place project settings at the root level inside `config/`.

2. **Configure Environment-Aware Settings** — Load secrets from environment variables using `os.environ` or `django-environ`. Split settings into `base.py`, `local.py`, and `production.py`. **Checkpoint:** Verify that no hardcoded secrets appear in any settings file.

3. **Create Apps with Proper Structure** — Each app should contain: `models.py`, `serializers.py`, `views.py`, `urls.py`, `services/` (business logic), `signals.py`, `admin.py`. Run `python manage.py startapp <name> -t <template_path>` if using custom templates.

4. **Define Models with ORM Best Practices** — Use explicit field types, add `__str__` methods, define `Meta` ordering and indexes, use `select_related`/`prefetch_related` in queries. **Checkpoint:** Run `python manage.py showmigrations` to verify all migrations are accounted for before committing.

5. **Build Views with Correct Abstraction** — Use function-based views for simple CRUD, class-based views with mixins for complex logic with permissions and context customization. Keep business logic out of views.

6. **Set Up DRF for API Endpoints** — Create serializers, viewsets, configure pagination/throttling globally, define custom permission classes. **Checkpoint:** Test all API endpoints return correct status codes (200/201/400/403/404).

7. **Optimize and Cache** — Profile queries with `django-debug-toolbar`, add `select_related`/`prefetch_related`, configure Redis cache backend, add per-view and template fragment caching where appropriate.

8. **Production Hardening** — Enable HTTPS-only cookies, set `SECURE_HSTS_SECONDS`, configure logging to JSON format, set up sentry-like error tracking, review security headers via `django-csp` or similar.

---

## Implementation Patterns

### Pattern 1: Modern Django 5.x Project Structure

Recommended layout for a production Django project with separate apps directory and environment-based settings:

```
myproject/
├── manage.py
├── config/                    # Project-level settings
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py       # django-split-settings loader
│   │   ├── base.py           # Shared settings
│   │   ├── local.py          # Development overrides
│   │   └── production.py     # Production overrides
│   ├── urls.py               # Root URLconf
│   ├── wsgi.py
│   └── asgi.py
├── apps/                      # Django applications
│   ├── users/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   └── user_service.py
│   │   └── apps.py
│   └── orders/
│       └── ...
├── static/
├── media/
├── requirements/
│   ├── base.txt
│   ├── local.txt
│   └── production.txt
└── .env.local                 # Never committed; loaded by django-environ
```

**Settings loader (`config/settings/__init__.py`):**

```python
"""Environment-aware settings using django-split-settings."""
from pathlib import Path
from split_settings.tools import include, optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent

include(
    "base.py",
    optional("env/local.env"),
    optional("env/.secrets.yml"),
    component="local.py",  # Loaded only when ENV=local or not set
)
```

**Base settings (`config/settings/base.py`):**

```python
"""Shared settings loaded by every environment."""
import os
from pathlib import Path

from environ import Env

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = Env()
Env.read_env(BASE_DIR / ".env.local")  # Local overrides, not committed

SECRET_KEY = env("SECRET_KEY", default="change-me-in-production")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])

INSTALLED_APPS: list[str] = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "corsheaders",
    # Local apps
    "apps.users",
    "apps.orders",
]

DATABASES = {
    "default": env.db("DATABASE_URL", default="sqlite:///db.sqlite3"),
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# DRF defaults
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
}
```

---

### Pattern 2: ORM Query Optimization — N+1 Prevention

N+1 queries are the single most common Django performance issue. Use `select_related` (ForeignKey/OneToOne) and `prefetch_related` (ManyToMany/ReverseForeignKey) to reduce database round trips.

```python
# apps/orders/models.py
from django.db import models


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    customer = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="orders",
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pending")
    total = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["customer"]),
        ]

    def __str__(self) -> str:
        return f"Order #{self.pk} — {self.customer.get_full_name()}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product_name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)

    @property
    def subtotal(self) -> float:
        return float(self.quantity * self.unit_price)
```

```python
# ❌ BAD: N+1 query — one query per order to fetch customer, one per item
def list_orders_bad(user_id: int) -> list[dict]:
    orders = Order.objects.filter(customer_id=user_id)
    result = []
    for order in orders:
        # Each iteration fires a separate query for customer
        result.append({
            "id": order.pk,
            "status": order.status,
            "customer_email": order.customer.email,  # N+1 on ForeignKey
            "items_count": order.items.count(),       # N+1 on reverse relation
            "total": order.total,
        })
    return result


# ✅ GOOD: Prefetch all related data in a single query
def list_orders_good(user_id: int) -> list[dict]:
    orders = Order.objects.filter(
        customer_id=user_id
    ).select_related("customer").prefetch_related("items")

    result = []
    for order in orders:
        result.append({
            "id": order.pk,
            "status": order.status,
            "customer_email": order.customer.email,          # No extra query
            "items_count": order.items.count(),               # Uses prefetched data
            "total": order.total,
        })
    return orders


# ✅ GOOD: Use .exists() instead of .count() when you only need a boolean check
def has_pending_orders(customer_id: int) -> bool:
    """Check if customer has any pending orders — single query, no object loading."""
    return Order.objects.filter(
        customer_id=customer_id,
        status="pending",
    ).exists()


# ✅ GOOD: Use .only() to fetch only needed fields (lightweight queryset)
def get_order_ids_and_totals() -> list[tuple[int, float]]:
    """Return only pk and total — skips loading created_at, status, customer_id, etc."""
    return list(
        Order.objects.only("pk", "total")
        .values_list("pk", "total")
    )
```

**Key ORM optimization rules:**
- `select_related` does a SQL JOIN — use for ForeignKey and OneToOne relationships
- `prefetch_related` does a separate lookup in Python — use for ManyToMany and reverse ForeignKey
- `.exists()` is faster than `.count() > 0` — Django translates it to `SELECT (1) LIMIT 1`
- `.only()` / `.defer()` control which columns are loaded from the database row
- Always add indexes on frequently filtered/sorted fields via `Meta.indexes`

---

### Pattern 3: Class-Based Views with Mixins

Use CBVs when you need reusable logic across multiple views. Use function-based views for simple, one-off endpoints. Custom mixins let you compose behavior cleanly.

```python
# apps/users/mixins.py
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.shortcuts import get_object_or_404
from rest_framework import generics


class OwnerOnlyMixin:
    """Restrict access to the owner of an object."""

    def get_queryset(self):
        qs = super().get_queryset()
        # In function-based views, check ownership in the view directly
        return qs.filter(owner=self.request.user)


class JSONResponseMixin:
    """Mix in JSON response generation for CBVs that need it alongside templates."""

    def render_to_response(self, context, **response_kwargs):
        import json
        from django.http import JsonResponse
        return JsonResponse(context)


# apps/users/views.py
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import ListView, DetailView, CreateView, UpdateView
from .models import UserProfile


class UserProfileListView(LoginRequiredMixin, ListView):
    """List profiles for staff users only. Non-staff see only their own profile."""
    model = UserProfile
    template_name = "users/profile_list.html"
    context_object_name = "profiles"

    def get_queryset(self):
        if self.request.user.is_staff:
            return UserProfile.objects.select_related("user").all()
        return UserProfile.objects.filter(user=self.request.user)


class UserProfileDetailView(LoginRequiredMixin, DetailView):
    model = UserProfile
    template_name = "users/profile_detail.html"
    context_object_name = "profile"

    def get_queryset(self):
        # Ensure users can only view their own profile or staff sees all
        qs = UserProfile.objects.select_related("user__auth_user")
        if not self.request.user.is_staff:
            return qs.filter(user=self.request.user)
        return qs


class UserProfileCreateView(LoginRequiredMixin, CreateView):
    model = UserProfile
    fields = ["bio", "avatar"]
    template_name = "users/profile_form.html"

    def form_valid(self, form):
        form.instance.user = self.request.user
        return super().form_valid(form)

    def get_success_url(self) -> str:
        return self.object.get_absolute_url()
```

**When to choose function-based views instead:**

```python
# apps/orders/views.py
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from apps.orders.models import Order


@require_POST
def checkout_order(request) -> JsonResponse:
    """Simple POST-only view — no CBV needed for this single action."""
    product_id = request.POST.get("product_id")
    quantity = int(request.POST.get("quantity", 1))

    if not product_id or quantity < 1:
        return JsonResponse({"error": "Invalid parameters"}, status=400)

    order = Order.objects.create(
        customer=request.user,
        total=0.00,  # Simplified; in real code, calculate from cart items
    )
    return JsonResponse({"order_id": order.pk}, status=201)


# Use CBVs when you have complex logic that needs reuse:
# - Multiple HTTP methods with different permission requirements
# - Pagination + filtering + ordering all composed together
# - Multiple endpoints sharing the same queryset or serializer
```

---

### Pattern 4: DRF Serializer Patterns

DRF serializers handle validation, serialization, and deserialization. Use nested serializers for complex objects, custom `validate_` methods for cross-field validation, and global pagination/throttling config.

```python
# apps/orders/serializers.py
from decimal import Decimal
from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    """Nested serializer for order items within an order."""
    subtotal = serializers.DecimalField(
        max_digits=8,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = OrderItem
        fields = ["pk", "product_name", "quantity", "unit_price", "subtotal"]
        extra_kwargs = {
            "unit_price": {"min_value": Decimal("0.01")},
            "quantity": {"min_value": 1},
        }


class OrderCreateSerializer(serializers.ModelSerializer):
    """Handles order creation with nested items in a single request."""
    items = OrderItemSerializer(many=True)

    class Meta:
        model = Order
        fields = ["pk", "customer", "status", "total", "items", "created_at"]
        read_only_fields = ["pk", "customer", "total", "created_at"]

    def validate_items(self, items: list[dict]) -> list[dict]:
        """Ensure each item has positive quantity and valid pricing."""
        if not items:
            raise serializers.ValidationError("An order must have at least one item.")

        for idx, item in enumerate(items):
            qty = item.get("quantity", 0)
            price = item.get("unit_price")
            if qty < 1:
                raise serializers.ValidationError(
                    f"Item {idx}: quantity must be >= 1"
                )
            if price is None or price <= 0:
                raise serializers.ValidationError(
                    f"Item {idx}: unit_price must be positive"
                )
        return items

    def create(self, validated_data: dict) -> Order:
        """Extract nested items and create order with calculated total."""
        items_data = validated_data.pop("items")
        order = Order.objects.create(
            customer=self.context["request"].user,
            **validated_data,
        )
        total = Decimal("0.00")
        for item_data in items_data:
            item = OrderItem.objects.create(order=order, **item_data)
            total += item.subtotal
        order.total = total
        order.save(update_fields=["total"])
        return order

    def to_representation(self, instance: Order) -> dict:
        """Include nested items in read responses."""
        rep = super().to_representation(instance)
        rep["items"] = OrderItemSerializer(
            instance.items, many=True
        ).data
        return rep


# apps/orders/views.py — ViewSets with DRF best practices
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Order


class OrderViewSet(viewsets.ModelViewSet):
    """Full CRUD for orders with permission and pagination."""
    serializer_class = OrderCreateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(
            customer=self.request.user
        ).select_related("customer").prefetch_related("items")

    def get_serializer_class(self) -> type[serializers.ModelSerializer]:
        """Use detailed serializer for read, compact for write."""
        if self.action == "list":
            return OrderCreateSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        """Attach current user to the order on creation."""
        serializer.save(customer=self.request.user)
```

**DRF global configuration (`config/settings/base.py`):**

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
        "upload": "5/minute",
    },
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.FormParser",
        "rest_framework.parsers.MultiPartParser",
    ],
}
```

---

### Pattern 5: Async Views and Tasks

Django 4.1+ supports native async views. Use async for I/O-bound operations (external API calls, database queries with async databases). Avoid async for CPU-bound work or blocking operations.

```python
# apps/orders/async_views.py
import asyncio
from typing import Any

from asgiref.sync import sync_to_async
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from .models import Order


@require_http_methods(["GET", "POST"])
async def order_stats_endpoint(
    request: HttpRequest,
) -> HttpResponse:
    """Async view that fetches order statistics concurrently."""

    async def get_pending_count() -> int:
        return await Order.objects.filter(status="pending").aaggregate_total_count()  # noqa: E501

    async def get_revenue_today() -> float:
        from django.utils import timezone
        today = timezone.localdate()
        result = await Order.objects.filter(
            created_at__date=today,
            status__in=["confirmed", "shipped", "delivered"],
        ).aggregate(total=models.Sum("total"))
        return float(result["total"] or 0)

    # Run both queries concurrently
    pending, revenue = await asyncio.gather(
        get_pending_count(),
        get_revenue_today(),
    )

    return JsonResponse({
        "pending_orders": pending,
        "revenue_today": round(revenue, 2),
    })


# ✅ Use sync_to_async when bridging synchronous code into async views
@method_decorator(require_http_methods(["GET"]), name="dispatch")
class OrderStatsView:
    """Class-based async view using sync-to-async bridge for ORM."""

    async def dispatch(self, request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        # All ORM calls must use .afilter(), .aget(), etc. with native async DB backend
        orders_count = await Order.objects.acount()
        return JsonResponse({"total_orders": orders_count})


# ❌ BAD: Mixing blocking I/O inside an async view — this blocks the entire event loop
async def bad_async_view(request: HttpRequest) -> HttpResponse:
    import time
    time.sleep(5)  # Blocks the event loop for 5 seconds!
    orders = await Order.objects.acount()
    return JsonResponse({"count": orders})


# ❌ BAD: Calling a synchronous ORM method in an async view — raises RuntimeWarning
async def also_bad_async_view(request: HttpRequest) -> HttpResponse:
    from django.db import connection
    # This is a sync call inside async context — will cause issues with async DB backends
    orders = Order.objects.all()  # Should use .all().aiterator() or asyncio.gather patterns
    return JsonResponse({"count": len(list(orders))})
```

**When NOT to use async in Django:**
- Reading from a synchronous database backend (PostgreSQL via `psycopg2` is sync-only)
- CPU-bound operations like image processing, encryption — offload to Celery/Redis tasks
- Views that depend on synchronous third-party libraries (most HTTP clients like `requests`)

---

### Pattern 6: Caching Strategies

Use Redis or Memcached as cache backend in production. Use database-backed cache only for development. Combine per-view caching, template fragment caching, and manual cache invalidation for maximum performance.

```python
# config/settings/base.py — Cache configuration
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://127.0.0.1:6379/1"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "SOCKET_CONNECT_TIMEOUT": 5,
            "SOCKET_TIMEOUT": 5,
            "CONNECTION_POOL_KWARGS": {"max_connections": 50},
        },
    },
}

# For development only — falls back to memory cache if Redis not available
if DEBUG:
    CACHES["default"] = {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
    }
```

```python
# apps/orders/views.py — Per-view caching with varying cache keys
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_cookie
from django.utils.decorators import method_decorator


@method_decorator(cache_page(60 * 15), name="dispatch")  # Cache for 15 minutes
@method_decorator(vary_on_cookie, name="dispatch")         # Vary by session cookie
class PublicOrderListView:
    """Cached public order listing — different cache per logged-in user."""

    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    # In a real app, use ListView with @method_decorator or function-based @cache_page
```

```python
# apps/products/serializers.py — Manual cache invalidation pattern
from django.core.cache import cache
from .models import Product


def invalidate_product_cache(product_id: int) -> None:
    """Invalidate cached product data when the product changes.

    Uses a key prefix to namespace cache keys by entity type,
    making bulk invalidation simple and safe.
    """
    cache.delete_pattern(f"product:{product_id}:*")


def get_or_cache_product(product_id: int) -> Product | None:
    """Fetch with cache — write-through on miss."""
    cache_key = f"product:{product_id}"
    product = cache.get(cache_key)

    if product is None:
        from .models import Product as ProductModel
        product = ProductModel.objects.select_related(
            "category", "brand"
        ).filter(pk=product_id).first()

        if product:
            # Cache for 1 hour with a structured key
            cache.set(cache_key, product, timeout=3600)

    return product


# apps/products/signals.py — Auto-invalidate on model save
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


@receiver(post_save, sender="products.Product")
@receiver(post_delete, sender="products.Product")
def invalidate_on_product_change(sender, instance, **kwargs):
    """Automatically invalidate cached product data on any model mutation."""
    invalidate_product_cache(instance.pk)
```

**Template fragment caching:**

```html+django
{# templates/products/product_list.html #}
{% load cache %}

{# Cache entire section for 10 minutes, keyed by user's language and page number #}
{% cache 600 product_list request.LANGUAGE_CODE request.GET.get "page" "1" %}
    <div class="product-grid">
    {% for product in products %}
        <article class="product-card">
            <h3>{{ product.name }}</h3>
            <p class="price">${{ product.price }}</p>
        </article>
    {% empty %}
        <p>No products available.</p>
    {% endfor %}
    </div>
{% endcache %}
```

---

### Pattern 7: Settings Management with Environment Variables

Production settings must never contain secrets. Use `django-environ` to load from environment variables and `.env` files that are git-ignored. Split settings into base/local/production layers.

```python
# config/settings/base.py — Core shared configuration
import os
from pathlib import Path

from environ import Env

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = Env()
Env.read_env(BASE_DIR / ".env.local", overwrite=True)  # Local overrides, not committed to VCS

# SECURITY — never hardcode these
SECRET_KEY: str = env("DJANGO_SECRET_KEY")

DEBUG: bool = env.bool("DJANGO_DEBUG", default=False)

ALLOWED_HOSTS: list[str] = env.list(
    "DJANGO_ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1"],
)

# CORS — only allow known origins in production
CORS_ALLOWED_ORIGINS: list[str] = env.list(
    "DJANGO_CORS_ORIGINS",
    default=[],
)

# Email configuration — different per environment
EMAIL_BACKEND = env(
    "DJANGO_EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",  # Dev only
)
EMAIL_HOST = env("DJANGO_EMAIL_HOST", default="localhost")
EMAIL_PORT = env.int("DJANGO_EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("DJANGO_EMAIL_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env(
    "DJANGO_DEFAULT_FROM_EMAIL",
    default="noreply@example.com",
)
```

```python
# config/settings/local.py — Development overrides
DEBUG = True
ALLOWED_HOSTS = ["*", "localhost", "127.0.0.1"]

# django-debug-toolbar for query inspection (only in local)
INSTALLED_APPS += ["debug_toolbar"]
MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]

INTERNAL_IPS = ["127.0.0.1"]

LOGGING: dict = {
    "version": 1,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",
    },
}
```

```python
# config/settings/production.py — Production overrides
import logging

# Security hardening for production
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Logging — structured JSON in production for log aggregation
LOGGING: dict = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "fmt": "%(asctime)s %(name)s %(levelname)s %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "WARNING",
    },
    "loggers": {
        "django.security.DisallowedHost": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}

# Rate limiting — stricter in production
REST_FRAMEWORK = {
    **{
        k: v for k, v in {
            "DEFAULT_THROTTLE_CLASSES": [
                "rest_framework.throttling.UserRateThrottle",
            ],
            "DEFAULT_THROTTLE_RATES": {"user": "5000/day"},
        }.items()
    },
}

# Database — use PostgreSQL connection pooling in production
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="postgres://user:password@localhost:5432/dbname",  # Never commit!
    ),
}
```

**`.env.local` template (git-ignored, shown for reference):**

```bash
# .env.local — NEVER commit this file
DJANGO_SECRET_KEY=your-ultra-secret-key-change-in-production
DJANGO_DEBUG=True
DATABASE_URL=postgres://user:password@localhost:5432/myproject_dev
REDIS_URL=redis://127.0.0.1:6379/1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
```

**`.gitignore` entry:**

```gitignore
# Django environment files — contain secrets
.env
.env.local
.env.*.local
*.secrets.yml
```

---

## Constraints

### MUST DO
- Use `select_related()` for ForeignKey/OneToOne lookups inside loops to avoid N+1 queries
- Use `prefetch_related()` for ManyToMany and reverse ForeignKey relationships
- Put business logic in model methods or service classes — never in views or serializers
- Store all secrets via environment variables (`django-environ`, `os.environ`) — never hardcode them
- Use `get_or_create()` with explicit `defaults` dict to avoid race conditions on unique fields
- Use `.exists()` instead of `.count() > 0` for boolean database checks — it's a single query
- Configure DRF pagination, throttling, and authentication classes globally in settings
- Use Redis or Memcached as cache backend in production — never use file-based caching
- Define `Meta.indexes` on models that are frequently filtered or sorted by specific fields
- Add `__str__` methods to all models for admin display and debug output
- Use explicit field types with `max_length`, `choices`, `default`, and `null=True`/`blank=False` as appropriate

### MUST NOT DO
- Call `.count()` then `.all()` — use `.exists()` or `.iterator()` instead
- Put business logic in views — this violates separation of concerns
- Hardcode secrets (SECRET_KEY, DATABASE_URL passwords) in settings files
- Use `*` imports in Django apps (`from module import *`)
- Omit `related_name` on ForeignKey fields — it causes reverse accessor conflicts
- Use raw SQL queries without parameterization — use Django's query API or `connection.cursor()` with `%s` parameters
- Commit `.env`, `.env.local`, or any file containing secrets to version control
- Define custom managers without calling `super().get_queryset()` to preserve filtering chains
- Use `sync_to_async` around blocking operations like `time.sleep()` or `requests.get()`
- Skip `update_fields` in `save()` calls when updating only specific fields — it prevents race conditions

---

## Output Template

When implementing or reviewing Django code, produce:

1. **Architecture Decision** — Project structure choice (monolithic apps vs. split project) with rationale
2. **Model Definition** — Typed model with `Meta` options, indexes, and `__str__` method
3. **Query Code** — Optimized query showing `select_related`/`prefetch_related` usage where applicable
4. **View Implementation** — Class-based view with appropriate mixins OR function-based view with decorators
5. **Serializer (if API)** — Nested serializer with validation and proper `to_representation` override
6. **Caching Layer** — Cache key pattern, invalidation strategy, and timeout values
7. **Settings Snippet** — Environment variable references for any configuration introduced

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `fastapi-development` | For lightweight microservices where Django is overkill — same Python ecosystem, async-native |

---

## Live References

> Authoritative documentation links for Django development. The model follows markdown links at load time to resolve external references and inline content.

- [Django 5.x Documentation](https://docs.djangoproject.com/en/5.1/)
- [Class-based views reference](https://docs.djangoproject.com/en/5.1/ref/class-based-views/)
- [Django ORM documentation — QuerySet API](https://docs.djangoproject.com/en/5.1/topics/db/queries/)
- [Django REST Framework documentation](https://www.django-rest-framework.org/)
- [Django caching framework](https://docs.djangoproject.com/en/5.1/topics/cache/)
- [Django security checklist for production](https://docs.djangoproject.com/en/5.1/topics/security/)
- [Django async views documentation](https://docs.djangoproject.com/en/5.1/topics/async/)
