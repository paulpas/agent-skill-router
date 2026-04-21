---
name: coding-fastapi-patterns
description: FastAPI application structure with typed error hierarchy, global exception handlers, CORS middleware, request timing, and lifecycle events
---

# Skill: coding-fastapi-patterns

# FastAPI application structure with typed error hierarchy, global exception handlers, CORS middleware, request timing, and lifecycle events

## Role / Purpose

This skill covers the canonical pattern for structuring a FastAPI application in a trading platform. It focuses on a typed error hierarchy with structured JSON responses, separation of application-level errors from framework-level errors, middleware for timing, CORS setup, health check endpoints, and router organization.

---

## Key Patterns

### 1. Structured Error Hierarchy

All API errors inherit from `APIError`. Each subclass encodes its own status code and structures its `details` payload. Callers raise specific error types — never raw HTTP exceptions — keeping error semantics in one place.

```python
from typing import Any

class APIError(Exception):
    """Base API error with structured response."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class NotFoundError(APIError):
    """Resource not found error."""

    def __init__(self, resource: str, identifier: str):
        super().__init__(
            message=f"{resource} not found: {identifier}",
            status_code=404,
            details={"resource": resource, "identifier": identifier},
        )


class BadRequestError(APIError):
    """Bad request error."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(message=message, status_code=400, details=details)


class ValidationError(APIError):
    """Validation error from Pydantic."""

    def __init__(self, errors: list[dict[str, Any]]):
        super().__init__(
            message="Validation failed",
            status_code=422,
            details={"errors": errors},
        )


class ExchangeError(APIError):
    """Exchange-specific error."""

    def __init__(self, exchange: str, message: str, status_code: int = 502):
        super().__init__(
            message=f"Exchange error [{exchange}]: {message}",
            status_code=status_code,
            details={"exchange": exchange},
        )
```

---

### 2. `@app.exception_handler(APIError)` — Structured JSON Response

The exception handler translates any `APIError` (or subclass) into a consistent JSON shape. Every error response includes timestamp, error type, message, details, request path, and method — making client error handling predictable.

```python
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(
    title="APEX Trading Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    """Handle API errors with structured response."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "timestamp": datetime.utcnow().isoformat(),
            "error": {
                "type": exc.__class__.__name__,
                "message": exc.message,
                "details": exc.details,
                "path": request.url.path,
                "method": request.method,
            },
        },
    )

@app.exception_handler(ValidationError)
async def validation_error_handler(
    request: Request, exc: ValidationError
) -> JSONResponse:
    """Handle Pydantic validation errors."""
    return JSONResponse(
        status_code=422,
        content={
            "timestamp": datetime.utcnow().isoformat(),
            "error": {
                "type": "ValidationError",
                "message": "Request validation failed",
                "details": exc.errors(),
                "path": request.url.path,
                "method": request.method,
            },
        },
    )

@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unhandled exceptions - fail fast with descriptive error."""
    return JSONResponse(
        status_code=500,
        content={
            "timestamp": datetime.utcnow().isoformat(),
            "error": {
                "type": exc.__class__.__name__,
                "message": "Internal server error",
                "details": {"error": str(exc)},
                "path": request.url.path,
                "method": request.method,
            },
        },
    )
```

---

### 3. `@app.middleware("http")` — Request Timing Headers

Middleware wraps every request and adds an `X-Process-Time` header with the elapsed time in seconds. This provides free observability for every endpoint without modifying individual route handlers.

```python
@app.middleware("http")
async def add_request_timing(request: Request, call_next: Any) -> JSONResponse:
    """Add timing information to responses."""
    start_time = datetime.utcnow()
    response = await call_next(request)
    process_time = (datetime.utcnow() - start_time).total_seconds()
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

---

### 4. `CORSMiddleware` Setup

Configured for development with `allow_origins=["*"]`. In production, replace with an explicit whitelist. Exposes custom headers (`X-Request-ID`, `X-RateLimit-Remaining`) that clients may need.

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-RateLimit-Remaining"],
)
```

---

### 5. Health Check Endpoint Pattern

Uses `response_model` for automatic schema generation and documentation. Returns a typed dict that matches the `ExchangeResponse` shape.

```python
from typing import Any
from apex.core.models import ExchangeResponse

@app.get(
    "/health",
    summary="Health Check",
    description="Check if the API is running and responsive.",
    response_model=ExchangeResponse,
    tags=["system"],
)
async def health_check() -> dict[str, Any]:
    """Health check endpoint - early exit for quick health checks."""
    return {
        "timestamp": datetime.utcnow(),
        "exchange": "api",
        "success": True,
        "data": {"status": "healthy"},
    }
```

---

### 6. `@app.on_event("startup")` / `@app.on_event("shutdown")` Lifecycle

Startup and shutdown hooks handle initialization (event bus, config, exchange connections) and cleanup (close connections, flush queues) in a structured way.

```python
@app.on_event("startup")
async def startup_event() -> None:
    """Initialize application on startup."""
    # Initialize config, event bus, exchange adapters, etc.
    print("APEX Trading Platform API starting up...")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Cleanup on shutdown."""
    # Close connections, flush queues, etc.
    print("APEX Trading Platform API shutting down...")
```

---

### 7. `app.include_router()` — Route Organization

All domain routes are grouped in a sub-router and mounted under `/api`. This keeps `main.py` clean and each domain module self-contained.

```python
from .routes import router as api_router

# Include all domain routes under /api prefix
app.include_router(api_router, prefix="/api", tags=["api"])
```

---

## Code Examples

### Raising Errors in Route Handlers

```python
from fastapi import APIRouter
from apex.api.main import NotFoundError, BadRequestError, ExchangeError

router = APIRouter()

@router.get("/trades/{trade_id}")
async def get_trade(trade_id: str) -> dict:
    trade = await trade_service.get(trade_id)

    if not trade:
        raise NotFoundError(resource="Trade", identifier=trade_id)

    return trade.model_dump()

@router.post("/orders")
async def create_order(order: OrderRequest) -> dict:
    if order.size <= 0:
        raise BadRequestError(
            message="Order size must be positive",
            details={"size": order.size},
        )

    try:
        result = await exchange.place_order(order)
    except ExchangeConnectionError as e:
        raise ExchangeError(exchange="binance", message=str(e))

    return result
```

### API Error Response Shape

```json
{
  "timestamp": "2026-04-21T12:00:00.000Z",
  "error": {
    "type": "NotFoundError",
    "message": "Trade not found: TRD-001",
    "details": {
      "resource": "Trade",
      "identifier": "TRD-001"
    },
    "path": "/api/trades/TRD-001",
    "method": "GET"
  }
}
```

### Root Info Endpoint Pattern

```python
@app.get("/", summary="API Info", tags=["system"])
async def root() -> dict[str, Any]:
    """Root endpoint - return API information."""
    return {
        "name": "APEX Trading Platform API",
        "version": "1.0.0",
        "endpoints": {
            "public": ["/health", "/"],
            "exchange": ["/api/exchange/balance", "/api/exchange/positions"],
            "market": ["/api/market/candles", "/api/market/orderbook"],
            "signals": ["/api/signals", "/api/signals/publish"],
        },
        "docs": {"swagger": "/docs", "redoc": "/redoc"},
    }
```

---

## Philosophy Checklist

- **Early Exit**: Exception handlers return immediately with structured responses; route handlers raise on first invalid condition
- **Parse Don't Validate**: Request bodies validated by Pydantic before reaching route handler logic; errors surfaced by `ValidationError` handler
- **Atomic Predictability**: Each exception handler is a pure function from `(request, exc)` to `JSONResponse`; no shared mutable state
- **Fail Fast**: `Exception` handler catches all unhandled errors with a 500 response; no silent swallowing of errors
- **Intentional Naming**: `NotFoundError`, `BadRequestError`, `ExchangeError` — error class names describe what went wrong exactly
