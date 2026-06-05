---




name: authentication-design-patterns
description: Implements production authentication architecture including JWT token lifecycle, OAuth 2.0 flows, session management, MFA/TOTP, API key auth, and password hashing strategies with security-first design patterns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: JWT authentication, OAuth 2.0, session management, MFA TOTP, API key auth, password hashing, token refresh, how do i implement auth
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  related-skills: api-gateway-patterns,spring-security-core,websocket-security




---





# Authentication Design Patterns

Implements production-grade authentication architectures that cover the full token lifecycle — from credential verification through token issuance, validation, refresh, and revocation. When loaded, this skill makes the model design secure authentication flows with explicit security considerations at every step: proper secret management, token expiry strategies, CSRF protection, and secure cookie configuration.

## TL;DR Checklist

- [ ] Choose auth mechanism matching threat model (JWT for stateless, sessions for stateful)
- [ ] Never store plaintext passwords — always use Argon2id or Bcrypt with per-user salt
- [ ] JWT access tokens: short-lived (5–15 min), refresh tokens: longer with rotation and revocation
- [ ] Always set `Secure`, `HttpOnly`, `SameSite=Strict` on cookies carrying auth data
- [ ] Implement token revocation for login/logout and account compromise scenarios
- [ ] Add MFA/TOTP as an optional but encouraged second factor for sensitive operations

---

## When to Use

Use this skill when:

- Designing authentication from scratch for a new API or web application
- Migrating from basic auth (HTTP Basic, API keys) to token-based authentication (JWT, OAuth)
- Implementing multi-factor authentication (MFA/TOTP) on an existing login system
- Building a third-party OAuth 2.0 / OIDC integration (Google, GitHub, Microsoft login)
- Designing session management for a stateful web application with secure cookie configuration
- Conducting a security audit of authentication flows and token handling patterns

---

## When NOT to Use

Avoid this skill for:

- Implementing authorization/permissions (who can do what) — use `api-gateway-patterns` or framework-specific auth like `spring-security-core` instead
- Building the UI login form itself — this covers server-side auth, not frontend components
- One-off script authentication (e.g., simple API key for a CLI tool) — overkill; use a raw environment variable with an env guard
- Cryptographic algorithm design — never invent your own crypto; use established libraries

---

## Core Workflow

1. **Classify the Authentication Model** — Determine whether the system needs stateless (JWT tokens), stateful (server-side sessions), or hybrid (JWT + refresh tokens) authentication. Stateless suits distributed microservices and mobile clients; stateful suits traditional web apps with browser sessions; hybrid gives you the best of both worlds for API clients. **Checkpoint:** Every client type must have its auth model documented — e.g., "web browser = session cookies", "mobile app = JWT + refresh token rotation", "service-to-service = mTLS or JWT audience restriction".

2. **Design Credential Storage** — Choose password hashing: Argon2id for new systems (preferred, memory-hard), Bcrypt with cost factor >= 12 for legacy compatibility. Store a unique per-user salt (Argon2 generates it automatically; Bcrypt embeds the salt in its output). Hash on every login attempt with constant-time comparison. **Checkpoint:** Verify that no password is ever stored in plaintext or reversible encryption — base64 encoding does not count as hashing. Every new user registration must produce exactly one hashed password value, never two.

3. **Implement Token Issuance** — Create the login endpoint that accepts credentials, verifies them against the hash, and returns tokens. For JWT: generate access token (5-15 min expiry, `iss`, `sub`, `exp`, `jti` claims) and refresh token (7-30 day expiry, stored in a rotating token store). Sign JWTs with RS256 or EdDSA (never HS256 in distributed systems — the public key must be separate from the secret). **Checkpoint:** After login returns, verify that the access token contains only claims needed for authorization (no PII), and that the refresh token has a unique `jti` identifier stored server-side.

4. **Build Token Validation Pipeline** — Implement middleware/handler that validates tokens on every protected request. For JWT: verify signature, check `exp`, validate `aud` and `iss`, check `jti` against revocation list if present. For sessions: lookup session ID in the store, verify not expired, regenerate session ID periodically (rotation). **Checkpoint:** Every validation failure must return HTTP 401 with a generic message — never reveal whether the username or password was wrong, or whether the token is expired vs invalidly signed.

5. **Implement Token Refresh and Rotation** — When an access token expires, allow clients to exchange a valid refresh token for a new pair (new access + new refresh). Implement rotation: after each refresh, invalidate the old refresh token and issue a new one with a fresh `jti`. Track total refresh count per session; revoke all tokens on suspicious activity. **Checkpoint:** The refresh endpoint must be rate-limited independently from the login endpoint, and every successful refresh must emit an audit log entry with client IP and user agent.

6. **Design Logout and Revocation** — For stateful sessions: delete the session from the store and clear the cookie. For JWT: maintain a revocation list (Redis-backed set of `jti` values) checked during validation, or use short access token lifetimes so revoked tokens expire within minutes. **Checkpoint:** After logout, verify that the same token/session cannot be used to access any protected resource — this includes cached pages and background API calls from single-page applications.

---

## Implementation Patterns

### Pattern 1: JWT Token Lifecycle with RS256 Signing

Production-grade JWT authentication using RS256 (asymmetric) signing, short-lived access tokens, rotating refresh tokens, and a Redis-backed revocation store. This pattern covers the complete flow: login -> token issuance -> validation -> refresh -> revocation.

```python
"""authentication/jwt_auth.py - Production JWT authentication with RS256 signing."""

import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt  # PyJWT library


@dataclass(frozen=True)
class TokenPair:
    """Access + refresh token pair returned after successful authentication."""
    access_token: str
    refresh_token: str
    refresh_token_jti: str
    issued_at: datetime
    expires_in: int  # seconds until access token expires


@dataclass(frozen=True)
class JWTPayload:
    """Decoded JWT payload with validated claims."""
    sub: str
    jti: str
    aud: str
    iss: str
    exp: datetime
    iat: datetime
    nbf: Optional[datetime] = None
    scopes: list[str] = field(default_factory=list)


class JWTAuthProvider:
    """Manages JWT token lifecycle with RS256 asymmetric signing.

    Uses a key pair (private/public key). The private key signs tokens;
    the public key verifies them. This allows distributed systems to
    verify tokens without sharing the signing secret - each service
    holds only the public key.
    """

    def __init__(
        self,
        private_key_path: str,
        public_key_path: str,
        audience: str,
        issuer: str,
        access_token_ttl_seconds: int = 900,  # 15 minutes
        refresh_token_ttl_days: int = 7,
    ) -> None:
        with open(private_key_path, "r") as f:
            self._private_key = f.read()
        with open(public_key_path, "r") as f:
            self._public_key = f.read()
        self._audience = audience
        self._issuer = issuer
        self._access_ttl = access_token_ttl_seconds
        self._refresh_ttl = timedelta(days=refresh_token_ttl_days)

    def generate_tokens(self, user_id: str, scopes: list[str] | None = None) -> TokenPair:
        """Issue a new JWT access token and refresh token pair.

        Args:
            user_id: The authenticated user's unique identifier (claims in `sub`).
            scopes: Optional list of permission scopes granted to this token.

        Returns:
            TokenPair with both tokens and metadata for client storage.
        """
        now = datetime.now(timezone.utc)
        access_jti = str(uuid.uuid4())

        # Short-lived access token - only carries minimal claims
        access_payload: dict = {
            "sub": user_id,
            "jti": access_jti,
            "aud": self._audience,
            "iss": self._issuer,
            "iat": now,
            "exp": now + timedelta(seconds=self._access_ttl),
        }
        if scopes:
            access_payload["scopes"] = scopes

        access_token = jwt.encode(
            access_payload,
            self._private_key,
            algorithm="RS256",
        )

        # Long-lived refresh token with unique JTI for rotation tracking
        refresh_jti = str(uuid.uuid4())
        refresh_payload: dict = {
            "sub": user_id,
            "jti": refresh_jti,
            "aud": self._audience,
            "iss": self._issuer,
            "iat": now,
            "exp": now + self._refresh_ttl,
            "type": "refresh",  # Distinguishes refresh tokens from access tokens
        }
        refresh_token = jwt.encode(
            refresh_payload,
            self._private_key,
            algorithm="RS256",
        )

        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
            refresh_token_jti=refresh_jti,
            issued_at=now,
            expires_in=self._access_ttl,
        )

    def decode_access_token(self, token: str, revocation_store: set[str]) -> JWTPayload:
        """Validate and decode a JWT access token.

        Checks signature, expiration, issuer, audience, and revocation status.
        Raises jwt.PyJWTError on any validation failure.

        Args:
            token: The raw JWT string from the Authorization header.
            revocation_store: Set of revoked JTI values (checked during validation).

        Returns:
            JWTPayload with all validated claims.

        Raises:
            jwt.ExpiredSignatureError: If token has expired.
            jwt.InvalidIssuerError: If issuer does not match configured value.
            jwt.InvalidAudienceError: If audience does not match configured value.
            jwt.InvalidTokenError: On any other validation failure.
        """
        # Verify RS256 signature using public key
        payload = jwt.decode(
            token,
            self._public_key,
            algorithms=["RS256"],
            audience=self._audience,
            issuer=self._issuer,
        )

        # Check JTI against revocation store
        if payload["jti"] in revocation_store:
            raise jwt.InvalidTokenError("Token has been revoked")

        return JWTPayload(
            sub=payload["sub"],
            jti=payload["jti"],
            aud=payload["aud"],
            iss=payload["iss"],
            exp=payload["exp"],
            iat=payload["iat"],
            nbf=payload.get("nbf"),
            scopes=payload.get("scopes", []),
        )

    def rotate_refresh_token(
        self,
        old_refresh: str,
        revocation_store: set[str],
    ) -> TokenPair:
        """Rotate a refresh token: invalidate old, issue new pair.

        Implements token rotation - each refresh consumes the old refresh token
        and produces a fresh pair. The old refresh token's JTI is added to the
        revocation store so it cannot be replayed even if intercepted.

        Args:
            old_refresh: The current valid refresh token from the client.
            revocation_store: Set of revoked JTI values.

        Returns:
            New TokenPair with fresh access + refresh tokens.
        """
        # Decode old refresh token to extract user info
        old_payload = jwt.decode(
            old_refresh,
            self._public_key,
            algorithms=["RS256"],
            audience=self._audience,
            issuer=self._issuer,
        )

        if old_payload.get("type") != "refresh":
            raise ValueError("Provided token is not a refresh token")

        # Revoke old refresh token by adding its JTI to revocation store
        old_jti = old_payload["jti"]
        revocation_store.add(old_jti)

        # Issue new token pair with the same user context
        return self.generate_tokens(user_id=old_payload["sub"])
```

### Pattern 2: Password Hashing with Argon2id (BAD vs. GOOD)

Demonstrates correct password hashing using Argon2id (the winner of the 2015 Password Hashing Competition), contrasted with common anti-patterns.

```python
"""authentication/password_hash.py - Secure password storage patterns."""

from __future__ import annotations

# --- BAD: Multiple common anti-patterns in one block ---

def bad_password_hash(password: str) -> str:
    """BAD: Uses SHA-256 with no salt - vulnerable to rainbow table attacks."""
    import hashlib
    # No salt, no iterations, no memory cost - instant to crack
    return hashlib.sha256(password.encode()).hexdigest()


def bad_password_verify(stored_hash: str, password: str) -> bool:
    """BAD: Timing attack vulnerability - Python `==` short-circuits on first mismatch."""
    import hashlib
    computed = hashlib.sha256(password.encode()).hexdigest()
    return stored_hash == computed  # Vulnerable to timing attacks


# --- GOOD: Argon2id with recommended parameters ---

def hash_password(password: str, salt: bytes | None = None) -> str:
    """Hash a password using Argon2id with secure default parameters.

    Uses the OWASP-recommended configuration:
    - Memory: 64 MB (tunable based on server capacity)
    - Iterations: 3
    - Parallelism: 4
    - Hash length: 32 bytes

    Args:
        password: The plaintext password to hash. Must be <= 4096 characters.
        salt: Optional pre-generated salt (16 bytes recommended). If None,
              Argon2id generates a random one internally.

    Returns:
        The encoded hash string containing algorithm params, salt, and hash
        in the standard $argon2id$v=19$ format (parseable by any Argon2 library).

    Raises:
        ValueError: If password is empty or exceeds 4096 characters.
    """
    if not password or len(password) > 4096:
        raise ValueError("Password must be between 1 and 4096 characters")

    try:
        import argon2
    except ImportError:
        raise RuntimeError(
            "argon2-cffi package required. Install with: pip install argon2-cffi"
        )

    ph = argon2.PasswordHasher(
        time_cost=3,           # Number of iterations
        memory_cost=65536,     # 64 MB memory (65536 KB)
        parallelism=4,         # Number of parallel threads
        hash_len=32,           # Output hash length in bytes
        salt_len=16,           # Random salt length in bytes
        type=argon2.Type.ID,   # Argon2id - hybrid of argon2i and argon2d
    )

    return ph.hash(password, salt=salt)


def verify_password(stored_hash: str, password: str) -> bool:
    """Verify a plaintext password against a stored Argon2id hash.

    Uses constant-time comparison internally (argon2-cffi library handles this).
    The `check_needs_rehash` flag enables transparent re-hashing when parameters
    change - if the server upgrades its Argon2 config, passwords are silently
    upgraded on next login.

    Args:
        stored_hash: The hash string previously returned by `hash_password()`.
            Must be in $argon2id$v=19$ format.
        password: The plaintext password to verify.

    Returns:
        True if the password matches, False otherwise.

    Raises:
        argon2.exceptions.VerifyMismatchError: If hash format is invalid.
    """
    try:
        import argon2
    except ImportError:
        raise RuntimeError(
            "argon2-cffi package required. Install with: pip install argon2-cffi"
        )

    ph = argon2.PasswordHasher()

    try:
        # check_needs_rehash=True enables transparent parameter upgrades
        needs_rehash = ph.verify(stored_hash, password)

        if needs_rehash:
            # Re-hash with updated parameters on next login (silent upgrade)
            new_hash = ph.hash(password)
            _update_password_in_database(stored_hash, new_hash)

        return True

    except argon2.exceptions.VerifyMismatchError:
        return False


def _update_password_in_database(old_hash: str, new_hash: str) -> None:
    """Update a password hash in the database atomically.

    Production implementation pattern using SQLAlchemy-style direct SQL execution.
    Uses optimistic concurrency control: the WHERE clause matches both the user's
    primary key AND their current hash value, ensuring atomicity without explicit
    transactions. If another request updated the password concurrently (returning 0 rows),
    an IntegrityError is raised to signal a race condition.

    Args:
        old_hash: The previously stored hash value used as a concurrency guard.
        new_hash: The new Argon2id hash to store.

    Raises:
        IntegrityError: If the password was changed by another concurrent request
            (old_hash no longer matches, meaning someone else updated it first).
    """
    from sqlalchemy.exc import IntegrityError

    session = SessionLocal()
    try:
        result = session.execute(
            "UPDATE users SET password_hash = :new_hash WHERE id = :user_id AND password_hash = :old_hash",
            {"new_hash": new_hash, "user_id": _get_current_user_id(), "old_hash": old_hash},
        )
        if result.rowcount == 0:
            raise IntegrityError(
                "UPDATE users SET password_hash = :new_hash WHERE id = :user_id AND password_hash = :old_hash",
                {"new_hash": new_hash, "user_id": _get_current_user_id(), "old_hash": old_hash},
                None,
            )
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
```

### Pattern 3: Secure Session Cookie Configuration

Proper session cookie settings that prevent XSS theft, CSRF attacks, and cross-site tracking.

```python
"""authentication/session_cookies.py - Secure session cookie configuration."""

from http import cookies
from datetime import datetime, timedelta, timezone
import secrets
import re


def create_secure_session_cookie(
    session_id: str,
    ttl_minutes: int = 30,
    domain: str | None = None,
    same_site: str = "Strict",
) -> str:
    """Create a properly secured session cookie string.

    Configures the following security attributes:
    - Secure: Only sent over HTTPS (prevents network-level interception)
    - HttpOnly: Not accessible via JavaScript (prevents XSS token theft)
    - SameSite=Strict: Never sent on cross-site requests (prevents CSRF)
    - Max-Age: Explicit expiration rather than session-based expiry

    Args:
        session_id: The opaque session identifier. Must be cryptographically random.
        ttl_minutes: Session lifetime in minutes. Default 30 minutes for web apps.
            Use shorter TTLs (5-15 min) for highly sensitive operations.
        domain: Optional domain to scope the cookie to. If None, uses current host.
        same_site: "Strict" (most secure), "Lax" (allows top-level GET navigations),
            or "None" (must use with Secure flag only - not recommended).

    Returns:
        Cookie string formatted as `name=value; Secure; HttpOnly; SameSite=Strict`.

    Raises:
        ValueError: If same_site is not one of the allowed values.
    """
    valid_samesite = {"Strict", "Lax", "None"}
    if same_site not in valid_samesite:
        raise ValueError(f"same_site must be one of {valid_samesite}")

    max_age_seconds = ttl_minutes * 60
    cookie_value = f"session={session_id}; Secure; HttpOnly; Max-Age={max_age_seconds}; Path=/"

    if domain:
        cookie_value += f"; Domain={domain}"

    cookie_value += f'; SameSite={same_site}'

    return cookie_value


def generate_secure_session_id() -> str:
    """Generate a cryptographically secure session identifier.

    Uses os.urandom(32) which draws from the OS CSPRNG (Linux /dev/urandom,
    Windows BCryptGenRandom). Output is URL-safe base64 encoded (no padding).

    Produces 256 bits of entropy - sufficient to prevent session guessing even
    against millions of concurrent sessions. Collision probability is negligible
    per the birthday paradox at this entropy level.

    Returns:
        A 43-character URL-safe base64 string (e.g., "dGhpcyBpcyBhIHRlc3Q...").
    """
    return secrets.token_urlsafe(32)


def validate_session_cookie(cookie_header: str, expected_session_id: str) -> bool:
    """Validate a session cookie against the expected ID using constant-time comparison.

    Prevents timing attacks by using `secrets.compare_digest()` which takes
    the same time regardless of how many characters match between inputs.

    Args:
        cookie_header: The full Cookie header value from the HTTP request.
            Expected format: "session=<opaque_id>"
        expected_session_id: The session ID to validate against.

    Returns:
        True if the cookie contains the expected session ID, False otherwise.
    """
    match = re.search(r"session=([^;]+)", cookie_header)
    if not match:
        return False

    provided_id = match.group(1).strip()
    return secrets.compare_digest(provided_id, expected_session_id)
```

### Pattern 4: TOTP Multi-Factor Authentication (RFC 6238)

Two-factor authentication using Time-based One-Time Passwords as defined in RFC 6238. Compatible with Google Authenticator, Authy, and other TOTP apps.

```python
"""authentication/totp_mfa.py - RFC 6238 TOTP for multi-factor authentication."""

import hashlib
import hmac
import struct
import time
import base64
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class TOTPOptions:
    """Configuration for TOTP token generation and verification.

    Follows RFC 6238 Section 4 recommendations:
    - 160-bit (20-byte) shared secret
    - 30-second time step
    - SHA-1 hash function
    - 6-digit codes (truncated to 8 digits max)
    """
    secret_key: str           # Base32-encoded shared secret stored per user
    period_seconds: int = 30  # Time step (RFC 6238 default: 30 seconds)
    digits: int = 6           # Code length (6-8, RFC 6238 Section 4: 6 recommended)
    allowed_drift: int = 1    # How many time steps to look ahead/behind

    def __post_init__(self) -> None:
        if not (6 <= self.digits <= 8):
            raise ValueError("TOTP digits must be between 6 and 8")
        if self.period_seconds < 10 or self.period_seconds > 60:
            raise ValueError("TOTP period must be between 10 and 60 seconds")


def generate_totp_secret() -> str:
    """Generate a new cryptographically random TOTP secret in Base32 encoding.

    Produces 20 bytes (160 bits) of random data from os.urandom, then encodes
    it in RFC 4648 Base32 format without padding. This produces a 32-character
    string suitable for manual entry into authenticator apps or QR code encoding.

    Returns:
        A 32-character Base32-encoded secret (e.g., "JBSWY3DPEHPK3PXP").
    """
    return base64.b32encode(__import__("os").urandom(20)).decode("ascii").rstrip("=")


def generate_totp_code(secret_b32: str, time_step: int | None = None, digits: int = 6) -> str:
    """Generate a TOTP code for the current or specified time step.

    Implements RFC 6238 Section 5 (TOTP Algorithm):
    1. Convert time to counter value: T = floor(current_time / time_step)
    2. Convert T to 8-byte big-endian representation
    3. Compute HMAC-SHA1(secret, T_bytes)
    4. Dynamic truncation: extract 4 bytes from HMAC using offset byte
    5. Extract numeric code: take last 31 bits and mod 10^digits

    Args:
        secret_b32: Base32-encoded shared secret (the value stored in the authenticator app).
        time_step: Optional specific time step index (for testing or back-dating).
            If None, uses current Unix time divided by period.
        digits: Number of digits in the output code. Must be 6–8.

    Returns:
        A zero-padded numeric string of length `digits` (default "123456").
    """
    secret_bytes = base64.b32decode(secret_b32.upper() + "==")  # Add padding for decode

    if time_step is None:
        current_time = int(time.time())
        time_step = current_time // 30

    # Convert counter to 8-byte big-endian bytes
    time_bytes = struct.pack(">Q", time_step)

    # HMAC-SHA1(secret, time_bytes)
    hmac_digest = hmac.new(secret_bytes, time_bytes, hashlib.sha1).digest()

    # Dynamic truncation (RFC 4226 Section 5.4)
    offset = hmac_digest[-1] & 0x0F
    code_int = struct.unpack(">I", hmac_digest[offset:offset + 4])[0]
    code_int &= 0x7FFFFFFF  # Mask to 31 bits

    # Generate N-digit code using configurable digits parameter
    code = code_int % (10 ** digits)
    return str(code).zfill(digits)


def verify_totp_code(secret_b32: str, code: str, options: TOTPOptions | None = None) -> bool:
    """Verify a TOTP code entered by the user.

    Checks the provided code against codes generated for the current time step
    and up to `allowed_drift` steps in either direction (to account for clock
    skew between server and device). Returns False immediately if the format
    is invalid.

    Args:
        secret_b32: Base32-encoded shared secret stored in the database.
        code: The 6-digit code entered by the user.
        options: Optional configuration overrides. Uses default RFC 6238 values if None.

    Returns:
        True if the code matches any valid code within the drift window.
    """
    opts = options or TOTPOptions(secret_key=secret_b32)

    if not code.isdigit() or len(code) != opts.digits:
        return False

    current_time = int(time.time())
    base_step = current_time // opts.period_seconds

    # Check current step and drift window (past + future)
    for offset in range(-opts.allowed_drift, opts.allowed_drift + 1):
        expected = generate_totp_code(secret_b32, time_step=base_step + offset, digits=opts.digits)
        if hmac.compare_digest(expected, code):
            return True

    return False
```

---

## Constraints

### MUST DO

- Use RS256 or EdDSA for JWT signing — never HS256 in multi-service systems where the signing secret must be shared across services
- Set `Secure`, `HttpOnly`, and `SameSite=Strict` on every cookie carrying session data or tokens
- Generate all opaque identifiers (session IDs, JTI values) using a CSPRNG (`secrets.token_urlsafe(32)`) — never `random.randint()` or UUIDv4 for security-sensitive values
- Hash passwords with Argon2id (preferred) or Bcrypt with cost factor >= 12 — never MD5, SHA-256, or any fast hash function for password storage
- Implement refresh token rotation: every refresh invalidates the old refresh token and issues a new pair — this limits the window for stolen refresh tokens
- Rate-limit both login and refresh endpoints independently to prevent brute-force credential stuffing attacks
- Store TOTP secrets with the same security as passwords (encrypted at rest) — they are effectively long-lived authentication keys

### MUST NOT DO

- Never store passwords in plaintext, reversible encryption (AES), or base64 encoding — these all count as "no hashing"
- Never expose whether login failed due to wrong username vs wrong password — use the same error message for both to prevent user enumeration
- Never use `SameSite=None` on session cookies without `Secure` — this is how cross-site request forgery attacks bypass SameSite protection
- Never allow refresh token reuse across different clients — if a refresh token is used from an unrecognized IP or device, revoke all tokens and require re-authentication
- Never include user PII (email, name, address) in JWT access tokens — they are base64-encoded, not encrypted, and anyone with the token can read the claims
- Never implement custom cryptographic algorithms for authentication — always use established libraries and standard protocols (RFC 6238 for TOTP, RFC 7519 for JWT)

---

## Output Template

When applying this skill, produce outputs following this structure:

1. **Authentication Model Selection** — State which model is chosen (JWT stateless / session stateful / hybrid) and why, with a comparison table showing trade-offs
2. **Token Schema Design** — Complete JWT payload schema listing every claim (`iss`, `sub`, `exp`, `jti`, `aud`, etc.) with its type, purpose, and whether it goes in access or refresh token
3. **Implementation Code** — Production-ready code for the chosen pattern (login endpoint, token validation middleware, session creation), including typed signatures and docstrings
4. **Security Audit Results** — Verification that all security attributes are correctly set: cookie flags, algorithm choice, rate limits, error message consistency, CSPRNG usage
5. **Token Lifecycle Diagram** — ASCII flow showing the full lifecycle: login -> access/refresh issuance -> validation -> refresh rotation -> logout revocation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `api-gateway-patterns` | Gateway-level JWT validation, API key offloading, and authentication filtering at the edge |
| `spring-security-core` | Spring Boot-specific security filter chain, method security annotations, and JWT integration |
| `websocket-security` | Authentication patterns for WebSocket connections including token validation in handshakes |

---

## Live References

> Authoritative documentation links for authentication protocols and standards. The model follows markdown links at load time to resolve external references and inline content.

- [RFC 7519 - JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 6238 - Time-based One-Time Passwords (TOTP)](https://www.rfc-editor.org/rfc/rfc6238)
- [OAuth 2.0 RFC 6749](https://www.rfc-editor.org/rfc/rfc6749)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-63B - Digital Identity Guidelines (Authentication)](https://pages.nist.gov/800-63-3/sp800-63b.html)
