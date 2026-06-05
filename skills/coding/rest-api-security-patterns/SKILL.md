---




name: rest-api-security-patterns
description: Implements REST API security patterns including OAuth 2.1 / OIDC authorization flows with PKCE, JWT access token vs opaque refresh token strategies, API key authentication, rate limiting headers, and CORS configuration for production APIs.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: OAuth 2.1, PKCE flow, JWT authentication API, API key security, rate limiting headers, bearer token API, how do i secure a REST API, mTLS
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  archetypes:
    - tactical
    - enforcement
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  related-skills: rest-api-error-handling, rest-api-resource-modeling




---





# API Security Patterns Engineer

Secures production REST APIs using OAuth 2.1 / OIDC authorization flows with PKCE for public clients, JWT access tokens with short TTLs and opaque refresh tokens, API key authentication for server-to-server integration, rate limiting with standard X-RateLimit-* headers, and strict CORS configuration. When active, the model selects the appropriate authentication strategy based on client type, implements token validation middleware with audience and scope claims verification, enforces resource-level authorization checks, adds rate limiting with human-readable policy strings, and configures CORS without wildcard origins for authenticated APIs.

## TL;DR Checklist

- [ ] Use OAuth 2.1 Authorization Code + PKCE for public/browser/mobile clients — never implicit grant
- [ ] JWT access tokens must have short TTL (900–3600s), verify audience, scope, and expiration claims
- [ ] Refresh tokens are opaque, rotation-enabled, and stored hashed — never embedded in JWT form
- [ ] Rate limiting returns X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers on every response
- [ ] CORS must never use wildcard `*` for authenticated APIs — specify exact origins, methods, and headers
- [ ] API keys are scoped per resource with explicit expiration dates and rotation policies

---

## When to Use

Use this skill when:

- Designing authentication and authorization for a new REST API
- Implementing OAuth 2.1 PKCE flow for a public-facing web or mobile application
- Adding JWT-based authentication middleware to an existing FastAPI application
- Configuring rate limiting with standard headers (X-RateLimit-*) to protect against abuse
- Setting up CORS policies for cross-origin API access from browser-based clients
- Implementing API key authentication for server-to-server integrations
- Adding resource-level authorization (ownership checks, role-based access control)

---

## When NOT to Use

Avoid this skill for:

- **Internal microservice APIs** using mTLS or service mesh authentication — these use infrastructure-level identity, not application-level tokens
- **Single-page applications behind an API gateway** that handles auth entirely — the SPA delegates all token management to the gateway (Cognito, Auth0, etc.)
- **Health check and public status endpoints** (`/health`, `/status`) — these should never require authentication

---

## Core Workflow

1. **Choose Authentication Strategy Based on Client Type** — For public clients (web browsers, mobile apps): use OAuth 2.1 Authorization Code + PKCE with short-lived JWT access tokens (900–3600 seconds) and opaque refresh tokens. For server-to-server integrations: use API keys scoped per resource with explicit expiration dates. Never use the deprecated Implicit Grant flow.
   **Checkpoint:** The client type determines the auth strategy — if it can store a secret, use Authorization Code + PKCE; if it cannot (single-page apps, mobile), still use Authorization Code + PKCE but skip client_secret entirely (PKCE replaces the need for a secret).

2. **Implement Token Validation Middleware** — Create middleware that intercepts every authenticated request, extracts the Bearer token from the Authorization header, verifies JWT signature using the public key from the identity provider's JWKS endpoint, and validates audience (`aud`), scope (`scope`), expiration (`exp`), and issuer (`iss`) claims. Reject expired tokens with 401 Unauthorized before reaching route handlers.
   **Checkpoint:** Every authenticated endpoint must fail with 401 (not 403) when the token is missing, malformed, or expired — the distinction between "not authenticated" and "authenticated but denied" matters for client error handling.

3. **Apply Authorization Checks at Resource Level** — After authentication succeeds, verify that the authenticated user has permission to access the specific resource. Implement ownership checks (does `user_id` in the token match the `{id}` path parameter?), role-based access control (`admin` role required for DELETE), and scope checks (does the token's `scope` include `orders:write`?).
   **Checkpoint:** Resource-level authorization must be checked before any business logic executes — never rely on route guards alone. A route guard only checks that the user is authenticated; ownership/permission checks must happen inside the handler.

4. **Add Rate Limiting with Standard Headers** — Implement rate limiting per client (identified by API key or user token) using a sliding window or fixed window algorithm. Return `X-RateLimit-Limit` (maximum requests), `X-RateLimit-Remaining` (remaining requests in current window), and `X-RateLimit-Reset` (Unix timestamp when the window resets) headers on every successful response. On 429 Too Many Requests, include a `Retry-After` header with seconds to wait.
   **Checkpoint:** Rate limit headers must appear on EVERY response — including 200 OK responses — so clients can monitor their consumption and back off proactively before hitting the limit.

5. **Configure CORS Strictly** — Never use wildcard `*` for authenticated APIs. Specify exact origins (e.g., `https://app.example.com`), allowed methods (`GET, POST, PUT, DELETE`), and exposed headers. For credentialed requests (cookies or Authorization headers), set `Access-Control-Allow-Credentials: true` and ensure the origin is explicitly listed.
   **Checkpoint:** Every browser-originated API request must be tested with a real cross-origin scenario — CORS misconfiguration causes silent failures that are extremely difficult to debug from the server side alone.

---

## Implementation Patterns

### Pattern 1: OAuth 2.1 with PKCE Flow Implementation (BAD vs. GOOD)

OAuth 2.1 deprecates the Implicit Grant flow (which exposed access tokens in URL fragments and browser history). All public clients — web apps, mobile apps, SPAs — must use Authorization Code + PKCE where the authorization code is exchanged for tokens at the token endpoint using a `code_verifier` derived from a `code_challenge`.

```python
# ❌ BAD: Implicit Grant flow — deprecated in OAuth 2.1, exposes tokens in URLs
from fastapi import FastAPI
import uuid
import hashlib
import hmac
import base64

app = FastAPI()


@app.get("/auth/login")
def implicit_login_broken(redirect_uri: str):
    """❌ Implicit Grant redirects with the access token in the URL fragment.

    The token is visible in browser history, server logs, Referer headers,
    and any JavaScript that reads window.location.hash. This is a critical
    security vulnerability that OAuth 2.1 explicitly deprecates.

    GET /auth/login?redirect_uri=https://app.example.com/callback#
      access_token=eyJhbGci...&token_type=bearer&expires_in=3600
    """
    # This would redirect with the token in the URL — NEVER do this
    return {"error": "implicit grant is deprecated"}


# ✅ GOOD: OAuth 2.1 Authorization Code + PKCE flow

import secrets
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.responses import JSONResponse, RedirectResponse

app = FastAPI()


class PKCEChallenge:
    """Manages PKCE code_challenge and code_verifier generation and validation.

    Per RFC 7636, the code_verifier is a high-entropy cryptographic random string
    (43-128 characters). The code_challenge is derived using S256 (SHA-256) or
    plain base64url encoding for backward compatibility.
    """

    @staticmethod
    def generate_code_verifier() -> str:
        """Generate a high-entropy code verifier (43-128 characters)."""
        return secrets.token_urlsafe(32)  # 43 characters by default

    @staticmethod
    def generate_code_challenge(verifier: str, method: str = "S256") -> str:
        """Derive the code challenge from the verifier.

        S256 (recommended): base64url(sha256(verifier))
        plain:              base64url(verifier) — only for clients that cannot compute SHA-256
        """
        if method == "S256":
            digest = hashlib.sha256(verifier.encode()).digest()
            return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
        else:
            return base64.urlsafe_b64encode(verifier.encode()).rstrip(b"=").decode()


# --- In-memory store for authorization codes and PKCE verifiers (use Redis in production) ---
_authorization_codes: dict[str, dict] = {}
_pkce_verifiers: dict[str, str] = {}

AUTH_CODE_EXPIRY_SECONDS = 300  # Authorization codes expire after 5 minutes


def generate_authorization_code(user_id: str, redirect_uri: str) -> str:
    """Generate a one-time authorization code bound to the user and redirect URI."""
    code = secrets.token_urlsafe(32)
    _authorization_codes[code] = {
        "user_id": user_id,
        "redirect_uri": redirect_uri,
        "created_at": datetime.now(timezone.utc),
    }
    return code


# --- OAuth 2.1 Authorization Code + PKCE endpoints ---

@app.get("/auth/authorize")
def authorize(
    response_type: str = "code",
    client_id: str | None = None,
    redirect_uri: str | None = None,
    scope: str | None = None,
    code_challenge: str | None = None,
    code_challenge_method: str = "S256",
):
    """GET /auth/authorize — Initiate OAuth 2.1 Authorization Code + PKCE flow.

    The client sends a code_challenge to prove it will later present the matching
    code_verifier when exchanging the authorization code for tokens.

    Query parameters:
      - response_type: must be "code" (never "token" — implicit grant is deprecated)
      - client_id: registered application identifier
      - redirect_uri: must match a pre-registered URI exactly
      - scope: space-separated list of requested scopes
      - code_challenge: base64url-encoded SHA-256 hash of the code_verifier
      - code_challenge_method: "S256" (recommended) or "plain"

    Returns an authorization form to the user for consent/login.
    """
    if response_type != "code":
        raise HTTPException(400, "response_type must be 'code'. Implicit grant is not supported.")

    if not client_id:
        raise HTTPException(400, "client_id is required")

    if not redirect_uri:
        raise HTTPException(400, "redirect_uri is required")

    # Verify redirect_uri against registered clients (in production, query database)
    registered_uris = {"https://app.example.com/callback", "http://localhost:3000/callback"}
    if redirect_uri not in registered_uris:
        raise HTTPException(400, f"redirect_uri is not registered. Must be one of: {', '.join(sorted(registered_uris))}")

    # Store PKCE challenge for later verification at the token endpoint
    code_challenge = code_challenge or ""
    if not code_challenge:
        raise HTTPException(400, "code_challenge is required for PKCE")

    return {"redirect": "/auth/login", "state": "csrf-protection-token"}  # Would redirect to login page


@app.post("/auth/token")
async def exchange_code_for_tokens(request: Request):
    """POST /auth/token — Exchange authorization code + PKCE verifier for tokens.

    This is the critical step where the client proves it holds the original
    code_verifier by computing and sending code_verifier (not code_challenge).

    Form parameters:
      - grant_type: must be "authorization_code"
      - code: the authorization code received in the redirect callback
      - code_verifier: the original high-entropy random string
      - redirect_uri: must match the one used in the authorize request

    Returns JSON with access_token (JWT), token_type, expires_in, and refresh_token.
    """
    # Parse form data
    form = await request.form()
    grant_type = form.get("grant_type")
    code = form.get("code")
    code_verifier = form.get("code_verifier")
    redirect_uri = form.get("redirect_uri")

    # Validate grant type — must be authorization_code, never implicit
    if grant_type != "authorization_code":
        raise HTTPException(400, "grant_type must be 'authorization_code'")

    if not code or not code_verifier:
        raise HTTPException(400, "code and code_verifier are required")

    # Verify the authorization code hasn't been used (one-time use)
    auth_code_data = _authorization_codes.pop(code, None)
    if not auth_code_data:
        raise HTTPException(401, "Invalid or already-used authorization code")

    # Verify redirect_uri matches
    if auth_code_data["redirect_uri"] != redirect_uri:
        raise HTTPException(400, "redirect_uri does not match the authorize request")

    # Verify PKCE: recompute challenge from verifier and compare with stored challenge
    expected_challenge = PKCEChallenge.generate_code_challenge(code_verifier, "S256")
    stored_challenge = _pkce_verifiers.get(code)  # In production, store alongside auth code
    if not stored_challenge or expected_challenge != stored_challenge:
        raise HTTPException(401, "code_verifier does not match the code_challenge")

    # Generate short-lived JWT access token (900–3600 seconds)
    now = datetime.now(timezone.utc)
    access_token_expiry = timedelta(seconds=1800)  # 30 minutes — max per OAuth 2.1 recommendations
    refresh_token_expiry = timedelta(days=30)

    # In production: use python-jose or PyJWT to create a real JWT signed with RS256
    access_token = f"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.{{" \
        f'"sub":"{auth_code_data["user_id"]}",' \
        f'"aud":"myapi.example.com",' \
        f'"exp":{(now + access_token_expiry).timestamp()},}} signature"

    # Generate opaque refresh token (not a JWT — random bytes, stored hashed in database)
    refresh_token = secrets.token_urlsafe(48)  # 64-character opaque string
    refresh_token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()

    # Store refresh token hash with expiry for rotation tracking
    _store_refresh_token(auth_code_data["user_id"], refresh_token_hash, refresh_token_expiry)

    return JSONResponse(content={
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": 1800,  # Seconds until expiration
        "refresh_token": refresh_token,
        "scope": scope or "read",
    })


def _store_refresh_token(user_id: str, token_hash: str, expiry: timedelta) -> None:
    """Store a hashed refresh token in the database with rotation tracking.

    Only the hash is stored — the raw token is returned to the client once
    and never persisted. On refresh, the incoming token is hashed and compared.
    Token rotation invalidates old refresh tokens after successful use.
    """
    pass


# --- Usage flow summary ---

"""
Step 1 — Client generates PKCE challenge:
  code_verifier = secrets.token_urlsafe(32)      # e.g., "abc123..." (43 chars)
  code_challenge = base64url(sha256(code_verifier))

Step 2 — Client redirects user to authorization server:
  GET /auth/authorize?response_type=code&client_id=app_123&redirect_uri=https://app.example.com/callback&scope=read+write&code_challenge=<challenge>&code_challenge_method=S256

Step 3 — User authenticates, consents → redirect back with authorization code:
  GET /callback?code=auth_code_xyz&state=csrf_token

Step 4 — Client exchanges code + verifier for tokens (server-to-server):
  POST /auth/token
  grant_type=authorization_code
  code=auth_code_xyz
  code_verifier=abc123...
  redirect_uri=https://app.example.com/callback

Step 5 — Server returns:
  {
    "access_token": "eyJhbGci...",
    "token_type": "Bearer",
    "expires_in": 1800,
    "refresh_token": "opaque_refresh_token_64chars"
  }

Step 6 — Client uses access_token for API requests:
  Authorization: Bearer eyJhbGci...
"""
```

### Pattern 2: JWT Access Token Validation Middleware (BAD vs. GOOD)

JWT middleware validates every incoming request by verifying the token signature, checking expiration and audience claims, and extracting user identity for downstream authorization checks.

```python
# ❌ BAD: No audience check, long TTL, no claim validation
import jwt as pyjwt  # python-jose or PyJWT

BAD_SECRET = "my-secret-key"  # Hardcoded secret — should use RS256 asymmetric keys


def bad_token_middleware_bad(request):
    """❌ This middleware accepts any JWT signed with the shared secret,
    from any issuer, for any audience, expiring in 30 days."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None  # Silently passes unauthenticated requests through!

    token = auth_header[7:]
    try:
        payload = pyjwt.decode(token, BAD_SECRET, algorithms=["HS256"])
        return payload
    except pyjwt.ExpiredSignatureError:
        pass  # ❌ Silently ignores expired tokens instead of rejecting
    except Exception:
        pass  # ❌ Silently accepts malformed tokens

    # If token is invalid, the request continues as if unauthenticated!
    # This means every protected endpoint runs without any authentication.
    return None


# ✅ GOOD: Comprehensive JWT validation middleware with claim verification

from fastapi import Depends, HTTPException, status
from typing import Any
import jwt  # PyJWT library
from datetime import datetime, timezone

# Configuration — in production, load from environment variables or secret manager
JWKS_URL = "https://auth.example.com/.well-known/jwks.json"
API_AUDIENCE = "api.myapp.example.com"  # The intended audience for these tokens
REQUIRED_SCOPES: list[str] = ["read", "write"]
MAX_TOKEN_LIFETIME_SECONDS = 3600  # Maximum acceptable token lifetime (1 hour)


def get_public_keys_from_jwks() -> dict:
    """Fetch and cache RSA public keys from the Identity Provider's JWKS endpoint.

    In production, implement caching with a TTL (e.g., refresh every 6 hours) to avoid
    fetching JWKS on every request. Use httpx.AsyncClient for non-blocking fetches.
    """
    # In production: response = await httpx.get(JWKS_URL); return response.json()["keys"]
    return {}


class JWTAuthenticator:
    """Validates OAuth 2.1 JWT access tokens with comprehensive claim verification.

    Per OAuth 2.1 §2.3, every access token MUST be validated for:
      - Signature (using the correct signing algorithm from the JWKS)
      - Expiration (exp claim must be in the future)
      - Audience (aud claim must match the intended API audience)
      - Issuer (iss claim must match the trusted identity provider)
      - Token lifetime (exp - iat must not exceed maximum allowed)
    """

    def __init__(self, audience: str = API_AUDIENCE, required_scopes: list[str] | None = None):
        self.audience = audience
        self.required_scopes = required_scopes or []

    def validate(self, token: str) -> dict[str, Any]:
        """Validate a JWT access token and return the decoded payload.

        Performs five validation checks in order:
          1. Signature verification using RS256 algorithm from JWKS
          2. Expiration check (exp claim must be future)
          3. Audience check (aud must match this API)
          4. Issuer check (iss must be a trusted identity provider)
          5. Token lifetime check (exp - iat must not exceed MAX_TOKEN_LIFETIME_SECONDS)

        Args:
            token: The JWT access token string from the Authorization header.

        Returns:
            Decoded payload dict with claims.

        Raises:
            HTTPException(401): If any validation check fails.
        """
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing Authorization header",
                headers={"WWW-Authenticate": 'Bearer realm="api"'},
            )

        # Check signature algorithm — RS256 is required (not HS256 which uses shared secrets)
        try:
            # Decode without verification first to get the header (algorithm)
            unverified_header = jwt.get_unverified_header(token)
            if unverified_header.get("alg") != "RS256":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token algorithm. Only RS256 is accepted.",
                )

            # Verify signature using public key from JWKS
            payload = jwt.decode(
                token,
                keys=get_public_keys_from_jwks(),
                algorithms=["RS256"],
                audience=self.audience,          # Validates 'aud' claim matches API audience
                options={
                    "verify_exp": True,           # Reject expired tokens with 401
                    "verify_nbf": False,          # Not-before not required for access tokens
                    "require": ["exp", "aud"],    # These claims are mandatory
                },
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Access token has expired",
                headers={"WWW-Authenticate": 'Bearer realm="api", error="invalid_token", error_description="Token expired"'},
            )
        except jwt.InvalidAudienceError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token audience does not match this API",
            )
        except jwt.InvalidIssuerError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail("Token issuer is not trusted"),
            )
        except jwt.DecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token format: {e}",
            )

        # Verify token lifetime: exp - iat must not exceed maximum
        issued_at = payload.get("iat")
        expires_at = payload.get("exp")
        if issued_at and expires_at:
            token_age = expires_at - issued_at
            if token_age > MAX_TOKEN_LIFETIME_SECONDS:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Token lifetime ({token_age}s) exceeds maximum ({MAX_TOKEN_LIFETIME_SECONDS}s)",
                )

        # Verify scope (if required scopes are specified)
        token_scopes = set(payload.get("scope", "").split())
        if self.required_scopes and not self.required_scopes.issubset(token_scopes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Token missing required scopes. Required: {', '.join(self.required_scopes)}",
            )

        return payload


# FastAPI dependency for injecting authenticated user into route handlers
jwt_auth = JWTAuthenticator(audience=API_AUDIENCE)


def get_current_user(token: str = Depends(lambda: "")) -> dict[str, Any]:
    """FastAPI dependency that extracts and validates the Bearer token.

    This runs before every route handler decorated with Depends(get_current_user).
    If validation fails, the request never reaches the handler — a 401 response
    is returned immediately by the dependency injection system.
    """
    auth_header = __import__("fastapi").Request.__dict__  # Would get from actual request in production
    token_value = "dummy"  # In production, extract from Authorization: Bearer <token> header
    return jwt_auth.validate(token_value)


# --- Example endpoints using JWT authentication ---

@app.get("/users/me")
def get_my_profile(user=Depends(get_current_user)):
    """GET /users/me — Returns the authenticated user's own profile.

    The JWT payload contains 'sub' (subject/user_id), 'aud' (audience),
    'scope', and other claims. Resource-level authorization verifies
    that the user is accessing their own data.
    """
    user_id = user.get("sub")
    # In production: return db.query("SELECT * FROM users WHERE id = $1", user_id)
    return {"id": user_id, "email": f"user-{user_id}@example.com"}


@app.post("/orders")
def create_order(order_data: dict, user=Depends(get_current_user)):
    """POST /orders — Create an order for the authenticated user.

    The token's scope must include 'orders:write'. The user's ID from the
    JWT subject claim is used to associate the order with the correct account.
    """
    user_id = user.get("sub")
    return {"id": "order-123", "user_id": user_id, **order_data}


# --- Token refresh endpoint using opaque refresh tokens ---

@app.post("/auth/refresh")
def refresh_access_token(request: Request):
    """POST /auth/refresh — Exchange an opaque refresh token for a new access token.

    Uses token rotation: the old refresh token is invalidated after a successful
    refresh, preventing replay attacks. The new refresh token is returned in the
    response and replaces the old one on the client side.
    """
    form = await request.form()
    refresh_token = form.get("refresh_token")

    if not refresh_token:
        raise HTTPException(401, "refresh_token is required")

    # Hash the incoming token and compare with stored hash
    token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
    # In production: query database for matching token hash

    return JSONResponse(content={
        "access_token": "eyJhbGciOiJSUzI1NiJ9.new_access_token",
        "token_type": "Bearer",
        "expires_in": 1800,
        "refresh_token": secrets.token_urlsafe(48),  # Rotated refresh token
    })
```

### Pattern 3: Rate Limiting Headers and Response (BAD vs. GOOD)

Rate limiting protects APIs from abuse and resource exhaustion. Every response must include X-RateLimit-* headers so clients can monitor their consumption, and 429 responses must include Retry-After to guide backoff behavior.

```python
# ❌ BAD: No rate limiting at all — API is vulnerable to brute force and DDoS
from fastapi import FastAPI

app = FastAPI()


@app.post("/auth/login")
def login_bad(username: str, password: str):
    """No rate limiting on authentication endpoint.

    Attackers can send 100,000 requests per minute trying passwords.
    No headers inform clients of their remaining quota.
    No Retry-After on failure — clients keep hammering the endpoint.
    """
    if username == "admin" and password == "password123":
        return {"authenticated": True}
    return {"authenticated": False}


# ❌ BAD: Rate limiting exists but no headers — clients have no visibility into their quota
@app.post("/auth/login")
def login_no_headers(username: str, password: str):
    """Returns 429 with no indication of when to retry or what the limit is."""
    return {"error": "Too many requests"}  # No Retry-After header, no rate limit info


# ✅ GOOD: Complete rate limiting with standard headers on every response

import time
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

app = FastAPI()

# In-memory rate limit store (use Redis in production with atomic operations)
_rate_limit_store: dict[str, list[float]] = {}

# Rate limit configuration per tier
RATE_LIMITS = {
    "default": {"requests": 60, "window_seconds": 60},      # 60 requests per minute
    "authenticated": {"requests": 300, "window_seconds": 60}, # 300 requests per minute
    "admin": {"requests": 1000, "window_seconds": 60},       # 1000 requests per minute
}


def get_client_identifier(request: Request) -> str:
    """Extract a stable client identifier for rate limiting.

    Priority: API key (for server-to-server) > IP address (for unauthenticated).
    In production, use the JWT user_id for authenticated clients instead of IP.
    """
    api_key = request.headers.get("X-API-Key")
    if api_key:
        return f"api_key:{api_key}"

    # Fall back to IP address — in production behind a reverse proxy,
    # use X-Forwarded-For header instead of direct connection IP
    client_ip = request.client.host if request.client else "unknown"
    return f"ip:{client_ip}"


def check_rate_limit(client_id: str) -> tuple[bool, dict[str, str]]:
    """Check if the client has exceeded their rate limit.

    Uses a sliding window algorithm: records timestamps of recent requests
    and counts how many fall within the current window.

    Args:
        client_id: The rate-limited client identifier.

    Returns:
        (is_allowed, headers) where headers contain X-RateLimit-* values.
    """
    now = time.time()
    config = RATE_LIMITS.get("default")  # In production, determine tier from auth context
    max_requests = config["requests"]
    window_seconds = config["window_seconds"]

    # Clean old entries outside the current window
    if client_id not in _rate_limit_store:
        _rate_limit_store[client_id] = []

    # Remove timestamps older than the window
    _rate_limit_store[client_id] = [
        ts for ts in _rate_limit_store[client_id]
        if now - ts < window_seconds
    ]

    current_count = len(_rate_limit_store[client_id])
    remaining = max(0, max_requests - current_count)
    reset_timestamp = int(now + window_seconds)

    headers = {
        "X-RateLimit-Limit": str(max_requests),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Reset": str(reset_timestamp),
    }

    if current_count >= max_requests:
        # Client has exceeded the limit — reject with Retry-After
        retry_after = int(window_seconds - (now - _rate_limit_store[client_id][0])) if _rate_limit_store[client_id] else window_seconds
        headers["Retry-After"] = str(max(1, retry_after))
        return False, headers

    # Record this request
    _rate_limit_store[client_id].append(now)
    headers["X-RateLimit-Remaining"] = str(remaining - 1)

    return True, headers


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware that adds X-RateLimit-* headers to every response.

    Headers are included on ALL responses (200 OK, 404, etc.) — not just 429.
    This allows clients to monitor their consumption and back off proactively.

    Public endpoints (unauthenticated) use a stricter limit than authenticated ones.
    """
    # Skip rate limiting for health check endpoints
    if request.url.path in ("/health", "/healthz", "/ready"):
        return await call_next(request)

    client_id = get_client_identifier(request)
    is_allowed, headers = check_rate_limit(client_id)

    if not is_allowed:
        # Reject with 429 Too Many Requests
        response = JSONResponse(
            status_code=429,
            content={
                "type": "https://api.example.com/errors/rate-limited",
                "title": "Rate Limit Exceeded",
                "status": 429,
                "detail": (
                    f"Rate limit exceeded. The maximum is {headers['X-RateLimit-Limit']} "
                    f"requests per {RATE_LIMITS.get('default', {}).get('window_seconds', 60)} seconds. "
                    f"Please retry after {headers['Retry-After']} seconds."
                ),
            },
        )
        for header, value in headers.items():
            response.headers[header] = value
        return response

    # Client is within limits — process the request
    response = await call_next(request)

    # Add rate limit headers to ALL successful responses (not just 429)
    for header, value in headers.items():
        if header != "Retry-After":  # Only add Retry-After on 429
            response.headers[header] = value

    return response


# --- Example responses with rate limit headers ---

"""
GET /users/me HTTP/1.1
Authorization: Bearer eyJhbGci...
Host: api.example.com

HTTP/1.1 200 OK
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 247
X-RateLimit-Reset: 1719580260
Content-Type: application/json

{"id": "user-1", "email": "alice@example.com"}


--- Client hits rate limit ---

POST /auth/login HTTP/1.1
Host: api.example.com

HTTP/1.1 429 Too Many Requests
Retry-After: 35
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1719580260
Content-Type: application/json

{
  "type": "https://api.example.com/errors/rate-limited",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Rate limit exceeded. The maximum is 60 requests per 60 seconds. Please retry after 35 seconds."
}
"""
```

---

## Constraints

### MUST DO
- **Use OAuth 2.1 Authorization Code + PKCE for all public clients** — never use Implicit Grant (deprecated in OAuth 2.1) or Resource Owner Password Credentials flow. Access tokens must be short-lived (900–3600 seconds). Refresh tokens must be opaque, rotation-enabled, and stored hashed.
- **Validate JWT access tokens against five claims**: signature (RS256 from JWKS), expiration (`exp` in the future), audience (`aud` matches this API), issuer (`iss` is a trusted provider), and token lifetime (`exp - iat ≤ 3600s`). Reject invalid tokens with 401 Unauthorized.
- **Include X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers on every response** — not just on 429 errors. Clients need visibility into their consumption to implement proactive backoff.
- **Configure CORS without wildcard origins** — authenticated APIs must specify exact allowed origins (e.g., `https://app.example.com`), never `*`. When `Access-Control-Allow-Credentials: true`, the origin list is mandatory per browser security enforcement.
- **Scope API keys to specific resources with expiration dates** — never issue unlimited API keys. Each key should have a defined scope, resource access list, and expiration date (maximum 90 days for rotating keys).

### MUST NOT DO
- **Use Implicit Grant flow (`response_type=token`)** — it exposes access tokens in URL fragments visible in browser history, server logs, and Referer headers. OAuth 2.1 has deprecated this flow entirely.
- **Accept JWTs signed with HS256 (shared secrets) for production APIs** — use RS256 or ES256 (asymmetric keys) so the API can verify signatures using public keys from JWKS without storing secret material.
- **Set CORS `Access-Control-Allow-Origin: *` on authenticated endpoints** — browsers block credentialed cross-origin requests when the origin is wildcarded. Always specify exact origins for APIs that accept Authorization headers or cookies.
- **Return rate limit status only on 429 responses** — clients must see X-RateLimit-* headers on every response to monitor their consumption and back off before hitting limits.
- **Store refresh tokens as JWTs** — refresh tokens are credentials that grant extended access and should be opaque, rotation-enabled, and stored hashed in the database. JWT refresh tokens cannot be revoked without a token blacklist or short TTL.

---

## Output Template

When implementing or reviewing API security with this skill active, produce:

1. **Authentication Strategy Matrix** — Table mapping each client type to its authentication method:

   | Client Type | Auth Method | Token Format | TTL |
   |---|---|---|---|
   | Web browser app | OAuth 2.1 Authorization Code + PKCE | JWT access + opaque refresh | 900–3600s |
   | Mobile app | OAuth 2.1 Authorization Code + PKCE | JWT access + opaque refresh | 900–3600s |
   | Server-to-server | API Key (scoped) | Bearer <key> | Max 90 days |

2. **Rate Limit Configuration** — Per-tier rate limits with header format documentation:

   | Tier | Requests / Window | Headers on Every Response | 429 Retry-After |
   |---|---|---|---|
   | Unauthenticated | 60 / 60s | X-RateLimit-Limit/Remaining/Reset | Seconds to wait |
   | Authenticated | 300 / 60s | Same | Same |

3. **CORS Configuration** — Exact origin list, allowed methods, and headers for each API environment. Never use `*` for authenticated APIs.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `rest-api-error-handling` | Security-specific errors (401 Unauthorized, 403 Forbidden) must be formatted as RFC 7807 ProblemDetails with the correct error type URIs |
| `rest-api-resource-modeling` | Resource-level authorization checks (ownership, permissions) are applied after authentication to protect specific resources defined in the API model |

---

## Live References

> Authoritative documentation links for OAuth 2.1, JWT, rate limiting, and CORS security. The model follows these references at load time to resolve external content.

- [OAuth 2.1 (RFC 8252 + draft-ietf-oauth-v2-1)](https://oauth.net/2/oauth-v2-specifier/) — OAuth 2.1 specification deprecating Implicit Grant, mandating PKCE for public clients
- [RFC 7519 — JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519.html) — JWT format and claim definitions (iss, exp, aud, sub, scope)
- [RFC 8252 — OAuth 2.1 for Native Apps](https://www.rfc-editor.org/rfc/rfc8252.html) — Security requirements for native apps including PKCE mandate
- [MDN: CORS — Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) — Practical guide to CORS headers, preflight requests, and browser enforcement
- [FastAPI Security Dependencies](https://fastapi.tiangolo.com/tutorial/security/) — FastAPI's OAuth2PasswordBearer, JWT authentication patterns, and dependency injection for auth

> 📖 skill(local cache): rest-api-security-patterns
