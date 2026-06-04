---
name: authentication-patterns
description: Implements production-grade authentication systems including password
  hashing (bcrypt/argon2), JWT token lifecycle, OAuth 2.0 PKCE flows, secure session
  management, and MFA/TOTP for multi-factor verification.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: authentication, password hashing, JWT token, OAuth PKCE, session management,
    MFA, TOTP, two-factor, passkeys, login system, how do i implement auth, secure
    login, user authentication, token validation, webauthn
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
  - config
  - do-dont
  - examples
  related-skills: coding-security-review, coding-input-validation, coding-security-architecture
---
# Authentication Implementation Patterns

Implements production-grade authentication systems that handle identity verification securely. When loaded, the model acts as a senior backend engineer — writing concrete authentication code covering password hashing, JWT token lifecycles, OAuth 2.0/PKCE flows, secure session management, MFA/TOTP, and modern passwordless auth patterns using current best practices (OWASP Authentication Cheat Sheet 2025, NIST SP 800-63B).

## TL;DR Checklist

- [ ] Hash passwords with argon2id (or bcrypt with cost >= 12) — never store plaintext or use MD5/SHA
- [ ] Validate all JWT claims: `iss`, `aud`, `exp`, `nbf`, and algorithm whitelist — reject `alg:none`
- [ ] Use PKCE for all OAuth 2.0 flows, even public clients — generate code_verifier with cryptographically secure random bytes
- [ ] Store tokens in httpOnly, Secure, SameSite=Strict cookies for web apps — never localStorage for sensitive tokens
- [ ] Implement MFA fallback codes and rate-limit verification attempts (max 5 tries, exponential backoff)
- [ ] Set session timeout (idle 15 min, absolute 8 hours) and support explicit logout invalidation

---

## When to Use

Use this skill when:

- Building a new authentication system from scratch for a web or mobile application
- Implementing OAuth 2.0 / OIDC integration with an identity provider (Google, GitHub, Auth0, Cognito)
- Adding multi-factor authentication (TOTP, WebAuthn/FIDO2) to an existing auth system
- Migrating from insecure password storage (MD5, unsalted SHA1) to modern hashing (argon2id, bcrypt)
- Fixing JWT security issues: missing claim validation, algorithm confusion attacks, or token replay
- Implementing secure session management with proper cookie attributes and rotation
- Adding passwordless authentication via magic links or passkeys

---

## When NOT to Use

Avoid this skill for:

- Designing high-level auth architecture — use `coding-security-architecture` instead
- Auditing existing code for security vulnerabilities — use `coding-security-review` instead
- Configuring an identity provider (Auth0, Cognito, Keycloak) at the infrastructure level — those are deployment concerns
- Implementing authorization/permissions logic — this skill covers who the user is, not what they can do

---

## Core Workflow

1. **Choose Authentication Mechanism** — Select the right mechanism based on your threat model and user experience requirements:
   - Password-only: acceptable for internal tools with MFA requirement
   - OAuth 2.0 + OIDC: preferred for consumer apps (leverage identity providers)
   - Session-based: traditional web apps requiring simple cookie auth
   - JWT stateless: APIs, microservices, mobile clients without session infrastructure
   - Passwordless: modern UX via magic links or passkeys (WebAuthn)
   **Checkpoint:** Every mechanism must support token/cookie rotation and have an explicit logout path.

2. **Implement Identity Storage** — Create the user identity store with proper hashing:
   ```python
   # Use argon2id as primary; fall back to bcrypt-12 for environments without argon2
   # Never use MD5, SHA1, SHA256, or unsalted hashes for passwords
   ```
   **Checkpoint:** Verify the hash function uses a per-user random salt of at least 16 bytes.

3. **Build Token or Session Lifecycle** — Implement the chosen transport mechanism:
   - For JWT: creation, signing, validation (all claims), refresh token rotation
   - For sessions: secure cookie attributes, session store with TTL, fixation prevention
   **Checkpoint:** Every issued credential must have an explicit expiry and a revocation path.

4. **Add Multi-Factor Authentication** — Implement at least TOTP-based MFA alongside primary auth:
   - Generate QR code for authenticator app enrollment
   - Verify TOTP codes with time-window tolerance (±1 step, 30-second windows)
   - Provide backup/recovery codes (at least 8 codes, single-use, hashed storage)
   **Checkpoint:** MFA enrollment must require re-authentication of the primary credential.

5. **Implement Rate Limiting and Lockout** — Protect against credential stuffing and brute force:
   - Lock account after 10 failed attempts (progressive: 5 min, 15 min, 1 hour)
   - Rate-limit login endpoint to 20 requests/minute per IP
   - Log all failed attempts with timestamp, IP, and user identifier
   **Checkpoint:** Failed attempt counters must not be exploitable via enumeration — use uniform response times.

6. **Add Security Headers and CORS** — Secure the transport layer:
   - `Set-Cookie` with `HttpOnly; Secure; SameSite=Strict` for all auth cookies
   - Strict CORS configuration allowing only known origins
   - Content-Security-Policy headers to mitigate XSS-based token theft
   **Checkpoint:** Verify no auth cookie is accessible via JavaScript (inspect in browser DevTools).

---

## Implementation Patterns / Reference Guide

### Pattern 1: Password Hashing with Argon2id (OWASP Recommended)

Argon2id is the winner of the Password Hashing Competition (2015) and is OWASP's recommended algorithm. It combines argon2i (side-channel resistance) and argon2d (GPU resistance). Use minimum parameters: time_cost=3, memory_cost=65536 (64MB), parallelism=4.

```python
import os
import base64
from datetime import datetime, timezone
from typing import Optional
import argon2


class PasswordHasher:
    """Secure password hashing using Argon2id — OWASP recommended algorithm.
    
    Parameters follow OWASP 2025 recommendations:
    - time_cost=3 (iterations)
    - memory_cost=65536 (64 MB)
    - parallelism=4
    - hash_length=32
    - salt_length=16
    """

    def __init__(
        self,
        time_cost: int = 3,
        memory_cost: int = 65536,
        parallelism: int = 4,
        hash_length: int = 32,
        salt_length: int = 16,
    ) -> None:
        self._ph = argon2.PasswordHasher(
            time_cost=time_cost,
            memory_cost=memory_cost,
            parallelism=parallelism,
            hash_length=hash_length,
            salt_length=salt_length,
            type=argon2.Type.ID,  # Argon2id hybrid
        )

    def hash_password(self, password: str) -> str:
        """Hash a plaintext password using Argon2id with a unique per-user salt.
        
        Args:
            password: The plaintext password to hash (must be non-empty).
        
        Returns:
            A fully-encoded Argon2id string containing algorithm params,
            salt, and derived key in one self-contained string.
        
        Raises:
            ValueError: If password is empty or exceeds maximum length.
        """
        if not password or len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        if len(password) > 128:
            raise ValueError("Password exceeds maximum length of 128 characters")

        return self._ph.hash(password)

    def verify_password(self, password: str, hash_string: str) -> bool:
        """Verify a plaintext password against a stored Argon2id hash.
        
        Uses constant-time comparison internally to prevent timing attacks.
        
        Args:
            password: The plaintext password to verify.
            hash_string: A previously generated Argon2id hash string.
        
        Returns:
            True if the password matches, False otherwise.
        
        Raises:
            argon2.exceptions.VerifyMismatchError: If verification fails.
            argon2.exceptions.HasChangedError: If hash params need rehashing.
        """
        try:
            return self._ph.verify(hash_string, password)
        except argon2.exceptions.VerifyMismatchError:
            return False

    def needs_rehash(self, hash_string: str) -> bool:
        """Check if the stored hash should be regenerated with current parameters.
        
        As hardware improves, recommended parameters increase over time.
        This method enables transparent rehashing on next login.
        
        Args:
            hash_string: The stored hash to check.
        
        Returns:
            True if the hash should be regenerated with newer parameters.
        """
        return self._ph.check_needs_rehash(hash_string)
```

### Pattern 2: Secure JWT Token Creation and Validation (BAD vs. GOOD)

JWT security requires strict validation of ALL claims, algorithm whitelisting to prevent `alg:none` attacks, and a bounded token lifetime with refresh token rotation.

```python
import jwt
import time
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from dataclasses import dataclass, field


# ❌ BAD: Insecure JWT implementation — common vulnerabilities
def bad_create_token(user_id: int) -> str:
    """Creates a token with NO validation requirements.
    
    Vulnerable to:
    - alg:none attack (any attacker can bypass signature verification)
    - No expiry = forever valid
    - No audience/issuer claims = tokens work across services
    - HS256 with weak secret = vulnerable to brute force
    """
    payload = {
        "sub": str(user_id),
        "iat": int(time.time()),
        # ❌ No 'exp' claim — token never expires
        # ❌ No 'aud' claim — token accepted by any service
        # ❌ No 'jti' claim — no individual token revocation
    }
    return jwt.encode(payload, "secret123", algorithm="HS256")


# ✅ GOOD: Secure JWT implementation with full claim validation
@dataclass(frozen=True)
class TokenConfig:
    """Immutable JWT configuration with strict security parameters."""
    issuer: str = "auth-service"
    audience: str = "api-gateway"
    access_token_lifetime_minutes: int = 15
    refresh_token_lifetime_hours: int = 72  # 3 days
    algorithm: str = "RS256"  # Prefer asymmetric (RSA/ECDSA) for distributed systems
    min_secret_bytes: int = 32  # Minimum key material entropy


class TokenManager:
    """Secure JWT token lifecycle management with full claim validation."""

    def __init__(self, config: TokenConfig, secret_key: bytes) -> None:
        if len(secret_key) < config.min_secret_bytes:
            raise ValueError(
                f"Secret key must be at least {config.min_secret_bytes} bytes"
            )
        self._config = config
        self._secret_key = secret_key

    def create_access_token(self, user_id: str, extra_claims: Optional[Dict] = None) -> str:
        """Create a short-lived access token with complete claim set.
        
        Args:
            user_id: The authenticated subject identifier.
            extra_claims: Optional additional claims (scopes, roles, tenant_id).
        
        Returns:
            Signed JWT access token valid for self._config.access_token_lifetime_minutes.
        """
        now = datetime.now(timezone.utc)
        payload: Dict[str, object] = {
            "sub": user_id,                          # Subject — who this is for
            "iss": self._config.issuer,               # Issuer — who created it
            "aud": self._config.audience,             # Audience — who should accept it
            "exp": now + timedelta(minutes=self._config.access_token_lifetime_minutes),
            "iat": now,                               # Issued at
            "nbf": now,                               # Not valid before (prevents future tokens)
            "jti": secrets.token_hex(16),             # Unique token ID — enables revocation
        }
        if extra_claims:
            payload.update(extra_claims)

        return jwt.encode(payload, self._secret_key, algorithm=self._config.algorithm)

    def create_refresh_token(self, user_id: str, session_id: str) -> tuple[str, str]:
        """Create a refresh token and its hashed counterpart for storage.
        
        Returns (refresh_token, hashed_token_for_storage). The raw token is
        returned to the client; only the hash is stored server-side. This
        prevents replay of stolen refresh tokens even from database theft.
        
        Args:
            user_id: The authenticated subject identifier.
            session_id: The session this refresh token belongs to.
        
        Returns:
            Tuple of (raw_token, hashed_storage_value).
        """
        raw_token = secrets.token_urlsafe(64)  # 96 bits of entropy
        hashed = self._hash_refresh_token(raw_token)

        return raw_token, hashed

    def validate_access_token(self, token: str) -> Dict[str, object]:
        """Validate a JWT access token with full claim verification.
        
        Checks:
        - Algorithm whitelist (rejects alg:none, HS256 if expecting RS256)
        - Expiration (exp), not-before (nbf), issued-at (iat)
        - Issuer and audience claims
        - Token ID format
        
        Args:
            token: The JWT string to validate.
        
        Returns:
            Decoded payload dictionary with all validated claims.
        
        Raises:
            jwt.InvalidAlgorithmError: If algorithm is not in whitelist.
            jwt.ExpiredSignatureError: If token has expired.
            jwt.InvalidIssuerError: If issuer does not match.
            jwt.InvalidAudienceError: If audience does not match.
            jwt.ImmatureSignatureError: If token is not yet valid (nbf).
        """
        options = {
            "verify_exp": True,
            "verify_nbf": True,
            "verify_iat": True,
            "verify_aud": True,
            "require": ["exp", "iss", "aud", "jti"],  # All these claims are mandatory
        }

        # CRITICAL: Algorithm whitelist prevents alg:none and algorithm confusion attacks
        # For symmetric keys use algorithms=["HS256"]; for asymmetric prefer RS256+ECDSA
        public_key = self._get_public_key()  # Implementation-specific key lookup
        
        payload = jwt.decode(
            token,
            public_key or self._secret_key,
            algorithms=[self._config.algorithm],  # Strict whitelist — no wildcards!
            issuer=self._config.issuer,
            audience=self._config.audience,
            options=options,
        )
        return payload

    def _hash_refresh_token(self, raw_token: str) -> str:
        """One-way hash a refresh token for secure server-side storage."""
        import hashlib
        return hashlib.sha256(raw_token.encode()).hexdigest()

    def _get_public_key(self) -> Optional[bytes]:
        """Retrieve the public key for asymmetric JWT verification.
        
        In production, this would load from a JWKS endpoint or secrets manager.
        Returns None to fall back to symmetric key if not configured.
        """
        return None  # Placeholder — implement based on your key management system
```

### Pattern 3: OAuth 2.0 Authorization Code with PKCE Flow

PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks and is REQUIRED by OAuth 2.1 for all clients including public/implicit ones. This pattern implements the full server-side flow.

```python
import secrets
import hashlib
import base64
import urllib.parse
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class PKCEParams:
    """PKCE (Proof Key for Code Exchange) parameters per RFC 7636.
    
    PKCE prevents authorization code interception attacks by requiring the client
    to prove it initiated the authorization request through a cryptographic proof
    that only the original client possesses.
    """
    code_challenge: str         # Base64url-encoded hash of code_verifier
    code_challenge_method: str  # "S256" (recommended) or "plain"
    state: str                  # CSRF protection state parameter


def generate_pkce_params() -> PKCEParams:
    """Generate fresh PKCE parameters for a new authorization flow.
    
    The code_verifier is a cryptographically random string. The code_challenge
    is derived by SHA-256 hashing the verifier and base64url-encoding it.
    
    Returns:
        PKCEParams containing code_challenge, method, and state.
        
    Security notes:
    - code_verifier must have length 43-128 characters (RFC 7636)
    - Use secrets module for cryptographically secure randomness
    - The same PKCE params must NOT be reused across requests
    """
    # Generate code_verifier: 43-128 random characters, base64url-encoded
    code_verifier = secrets.token_urlsafe(96)  # 128 bytes → ~171 chars encoded

    # Generate code_challenge using SHA-256 (S256 method per RFC 7636)
    code_challenge_hash = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(code_challenge_hash).rstrip(b"=").decode("ascii")

    # State parameter for CSRF protection
    state = secrets.token_urlsafe(32)

    return PKCEParams(
        code_challenge=code_challenge,
        code_challenge_method="S256",
        state=state,
    )


def build_authorization_url(
    provider_url: str,
    client_id: str,
    redirect_uri: str,
    pkce_params: PKCEParams,
    scope: str = "openid profile email",
) -> str:
    """Build the OAuth 2.0 authorization URL with PKCE and state parameters.
    
    Args:
        provider_url: The authorization endpoint of the identity provider
                      (e.g., https://accounts.google.com/o/oauth2/v2/auth).
        client_id: The registered application client ID.
        redirect_uri: Registered redirect URI matching exactly what the provider has on file.
        pkce_params: PKCE parameters generated by generate_pkce_params().
        scope: Space-separated scope string requesting specific access levels.
    
    Returns:
        Complete authorization URL to redirect the user's browser to.
        
    Security notes:
    - redirect_uri must exactly match a pre-registered URI with the provider
    - state parameter prevents CSRF attacks — store in session, compare on callback
    - scope should follow principle of least privilege
    """
    params = urllib.parse.urlencode({
        "response_type": "code",            # Authorization code flow
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scope,
        "state": pkce_params.state,
        "code_challenge": pkce_params.code_challenge,
        "code_challenge_method": pkce_params.code_challenge_method,
    })

    return f"{provider_url}?{params}"


@dataclass
class TokenResponse:
    """Parsed OAuth 2.0 token response from the authorization server.
    
    Per RFC 6749 Section 5.1, the token endpoint returns JSON with:
    - access_token (required)
    - token_type (usually "Bearer")
    - expires_in (seconds until expiration)
    - refresh_token (optional but recommended)
    - scope (returned scopes)
    """
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = 3600
    refresh_token: Optional[str] = None
    id_token: Optional[str] = None     # OIDC-specific — contains user identity claims
    scope: str = ""


def exchange_authorization_code(
    token_url: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    authorization_code: str,
    code_verifier: str,
) -> TokenResponse:
    """Exchange an authorization code for tokens using PKCE proof.
    
    This is called on the server side after the user is redirected back from
    the identity provider with the authorization code in the query parameter.
    
    Args:
        token_url: The token endpoint of the identity provider.
        client_id: The registered application client ID.
        client_secret: The registered application client secret.
        redirect_uri: MUST match the redirect_uri used in the authorization request.
        authorization_code: The code received from the identity provider callback.
        code_verifier: The original PKCE code_verifier (proves origin of auth request).
    
    Returns:
        TokenResponse with access_token, optional refresh_token, and id_token.
        
    Raises:
        RuntimeError: If the token exchange fails (invalid code, bad verifier, etc.)
    """
    import requests  # In production, use httpx or aiohttp for async

    token_request = {
        "grant_type": "authorization_code",
        "code": authorization_code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        # CRITICAL: code_verifier must be sent — this is the PKCE proof
        "code_verifier": code_verifier,
    }

    # Client secret required only for confidential clients (web apps)
    if client_secret:
        token_request["client_secret"] = client_secret

    response = requests.post(token_url, data=token_request, timeout=10)

    if response.status_code != 200:
        error_body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
        raise RuntimeError(
            f"Token exchange failed ({response.status_code}): {error_body.get('error', response.text)}"
        )

    body = response.json()
    return TokenResponse(
        access_token=body["access_token"],
        token_type=body.get("token_type", "Bearer"),
        expires_in=body.get("expires_in", 3600),
        refresh_token=body.get("refresh_token"),
        id_token=body.get("id_token"),
        scope=body.get("scope", ""),
    )
```

### Pattern 4: Secure Session Management with Cookie Rotation

Session-based authentication requires secure cookie attributes, session fixation prevention (rotation on login), idle/absolute timeouts, and proper invalidation on logout.

```python
import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from dataclasses import dataclass


@dataclass
class SessionConfig:
    """Session configuration with security-conscious defaults."""
    cookie_name: str = "session_id"
    http_only: bool = True              # Prevent JavaScript access (XSS protection)
    secure: bool = True                 # HTTPS-only cookies — disable for localhost dev
    same_site: str = "Strict"           # Prevent CSRF — use 'Lax' if form submissions needed
    idle_timeout_minutes: int = 15      # Timeout after inactivity
    absolute_timeout_hours: int = 8     # Max lifetime regardless of activity
    cookie_length_bytes: int = 32       # Cryptographically random session IDs


class SecureSessionManager:
    """Secure session management with fixation prevention and rotation."""

    def __init__(self, config: Optional[SessionConfig] = None) -> None:
        self._config = config or SessionConfig()

    def create_session(self, user_id: str, extra_data: Optional[Dict] = None) -> tuple[str, dict]:
        """Create a new session and return (session_id, session_store_entry).
        
        Implements session fixation prevention by generating a fresh,
        cryptographically random session ID for every new session.
        
        Args:
            user_id: The authenticated user identifier.
            extra_data: Optional metadata to store in the session.
        
        Returns:
            Tuple of (raw_session_id_for_cookie, session_data_dict).
        """
        session_id = secrets.token_hex(self._config.cookie_length_bytes)

        now = datetime.now(timezone.utc)
        session_data = {
            "user_id": user_id,
            "created_at": now.isoformat(),
            "last_activity": now.isoformat(),
            "idle_timeout": (now + timedelta(minutes=self._config.idle_timeout_minutes)).isoformat(),
            "absolute_timeout": (now + timedelta(hours=self._config.absolute_timeout_hours)).isoformat(),
        }
        if extra_data:
            session_data.update(extra_data)

        return session_id, session_data

    def validate_session(self, session_data: dict) -> bool:
        """Validate a session against timeout and integrity checks.
        
        Checks both idle timeout (inactivity-based) and absolute timeout
        (maximum lifetime regardless of activity). A session that passes
        validation has its last_activity updated for sliding expiration.
        
        Args:
            session_data: The session data dictionary loaded from the store.
        
        Returns:
            True if session is valid; False if expired or tampered with.
        """
        now = datetime.now(timezone.utc)

        # Check absolute timeout — hard limit regardless of activity
        try:
            abs_timeout = datetime.fromisoformat(session_data["absolute_timeout"])
            if now >= abs_timeout:
                return False
        except (KeyError, ValueError):
            return False

        # Check idle timeout — sliding window based on last activity
        try:
            idle_timeout = datetime.fromisoformat(session_data["idle_timeout"])
            if now >= idle_timeout:
                return False
        except (KeyError, ValueError):
            return False

        # Update last activity for sliding expiration
        session_data["last_activity"] = now.isoformat()
        session_data["idle_timeout"] = (
            now + timedelta(minutes=self._config.idle_timeout_minutes)
        ).isoformat()

        return True

    def rotate_session(self, old_session_data: dict) -> tuple[str, dict]:
        """Rotate a session ID to prevent fixation and replay attacks.
        
        Called on privilege changes (login, role escalation) and optionally
        on periodic intervals. The old session is invalidated atomically.
        
        Args:
            old_session_data: The existing session data to rotate from.
        
        Returns:
            Tuple of (new_session_id, new_session_data with preserved user).
        """
        user_id = old_session_data["user_id"]
        # Preserve extra data but reset timing
        extra_data = {k: v for k, v in old_session_data.items()
                      if k not in ("created_at", "last_activity", "idle_timeout", "absolute_timeout")}

        return self.create_session(user_id, extra_data)

    def build_cookie_headers(self, session_id: str) -> list[tuple[str, str]]:
        """Build Set-Cookie headers with secure attributes.
        
        Returns a list of (header_name, header_value) tuples suitable for
        setting cookies in HTTP responses.
        
        Args:
            session_id: The session ID to encode in the cookie.
        
        Returns:
            List of cookie header tuples.
        """
        cookie_value = session_id
        attrs = [
            f"{self._config.cookie_name}={cookie_value}",
            "Path=/",
            f"Max-Age={self._config.idle_timeout_minutes * 60}",
            "SameSite=" + self._config.same_site,
        ]
        if self._config.http_only:
            attrs.append("HttpOnly")
        # Secure flag — set True in production, False for localhost development
        attrs.append("Secure" if self._config.secure else "")

        return [("Set-Cookie", "; ".join(a for a in attrs if a))]
```

### Pattern 5: TOTP-Based Multi-Factor Authentication (RFC 6238)

Time-based one-time passwords provide strong second-factor authentication. Implement with 6-digit codes, 30-second time steps, and ±1 window tolerance.

```python
import hmac
import struct
import time
import base64
import qrcode
import io
from datetime import datetime, timezone
from typing import Optional


class TotpManager:
    """RFC 6238 TOTP (Time-based One-Time Password) implementation for MFA.
    
    Uses HMAC-SHA1 with 30-second time steps and 6-digit codes per
    current best practices. Compatible with Google Authenticator, Authy,
    Microsoft Authenticator, and other standard TOTP applications.
    """

    def __init__(
        self,
        secret_length: int = 20,       # Bytes of random secret (160 bits)
        digits: int = 6,               # Code length
        time_step: int = 30,           # Seconds per time step
        window: int = 1,               # Accept ±window steps (±30 seconds default)
        algorithm: str = "SHA1",       # SHA-1 is standard for TOTP; SHA-256/SHA-512 also supported
    ) -> None:
        self._secret_length = secret_length
        self._digits = digits
        self._time_step = time_step
        self._window = window
        self._algorithm = algorithm

    def generate_secret(self) -> str:
        """Generate a cryptographically random TOTP secret in base32 format.
        
        Returns:
            A 32-character base32-encoded secret suitable for QR code generation.
            
        The secret should be stored in the user's profile and associated
        with their account. It must never be logged or transmitted unencrypted.
        """
        raw_secret = secrets.token_bytes(self._secret_length)
        # Base32 encoding produces a 32-character string (160 bits of entropy)
        return base64.b32encode(raw_secret).decode("ascii").rstrip("=")

    def generate_qr_code_url(self, secret: str, account_name: str, issuer: str = "MyApp") -> str:
        """Generate a provisioning URI for QR code scanning by authenticator apps.
        
        Args:
            secret: The base32-encoded TOTP secret.
            account_name: The user's email or identifier shown in the app.
            issuer: The application name shown as category in the authenticator app.
        
        Returns:
            otpauth:// URI string that can be rendered as a QR code.
            
        Example output:
            otpauth://totp/MyApp:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=MyApp&algorithm=SHA1&digits=6&period=30
        """
        params = {
            "secret": secret,
            "issuer": issuer,
            "algorithm": self._algorithm.upper(),
            "digits": str(self._digits),
            "period": str(self._time_step),
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"otpauth://totp/{issuer}:{account_name}?{query}"

    def verify_code(self, secret: str, code: str, current_time: Optional[float] = None) -> bool:
        """Verify a TOTP code with time-window tolerance.
        
        Checks the provided code against the expected values for the current
        time step and ±window steps to account for clock skew between the
        server and the authenticator device.
        
        Args:
            secret: The base32-encoded TOTP secret stored for this user.
            code: The 6-digit code entered by the user.
            current_time: Optional override for testing; defaults to current time.
        
        Returns:
            True if the code matches any expected value in the tolerance window.
        """
        if not code or not code.isdigit() or len(code) != self._digits:
            return False

        # Strip spaces and dashes that users might add for readability
        clean_code = code.replace(" ", "").replace("-", "")
        if len(clean_code) != self._digits:
            return False

        timestamp = current_time or time.time()
        counter = int(timestamp // self._time_step)

        # Convert base32 secret to bytes (handle missing padding)
        try:
            secret_bytes = base64.b32decode(secret.upper() + "=" * (-len(secret) % 8))
        except Exception:
            return False

        # Check current time step and ±window steps
        for offset in range(-self._window, self._window + 1):
            expected = self._generate_totp(secret_bytes, counter + offset)
            if hmac.compare_digest(expected, clean_code):
                return True

        return False

    def _generate_totp(self, secret: bytes, counter: int) -> str:
        """Generate a single TOTP code for a given counter value.
        
        Implements the full RFC 6238 algorithm:
        1. Pack counter as 8-byte big-endian
        2. Compute HMAC-SHA1(secret, counter_bytes)
        3. Dynamic truncation per RFC 4226 Section 5.4
        4. Modulo to get N-digit code
        """
        # Step 1: Pack counter as 8-byte big-endian integer
        msg = struct.pack(">Q", counter)

        # Step 2: HMAC-SHA1 computation
        algorithm_map = {
            "SHA1": "sha1",
            "SHA256": "sha256",
            "SHA512": "sha512",
        }
        hash_func = hmac.new(secret, msg, algorithm_map.get(self._algorithm, "sha1"))
        digest = hash_func.digest()

        # Step 3: Dynamic truncation
        offset = digest[-1] & 0x0F
        truncated = struct.unpack(">I", digest[offset:offset + 4])[0]
        truncated &= 0x7FFFFFFF  # Clear the most significant bit

        # Step 4: Generate N-digit code
        otp = truncated % (10 ** self._digits)
        return str(otp).zfill(self._digits)

    def generate_backup_codes(self, count: int = 10) -> list[str]:
        """Generate a set of single-use backup/recovery codes.
        
        Backup codes allow account recovery when the user loses access to
        their authenticator device. Each code is single-use and must be
        hashed before storage (never store plaintext backup codes).
        
        Args:
            count: Number of backup codes to generate (8-10 recommended).
        
        Returns:
            List of 8-character alphanumeric codes in "XXXX-XXXX" format.
        """
        codes = []
        for _ in range(count):
            raw = secrets.token_bytes(6)  # 48 bits ≈ 8 hex chars
            code = raw.hex().upper()
            # Format as XXXX-XXXX for readability
            codes.append(f"{code[:4]}-{code[4:]}")
        return codes

    def verify_backup_code(self, stored_hash: str, candidate: str) -> bool:
        """Verify a backup code against its pre-computed hash.
        
        Uses hmac.compare_digest for constant-time comparison to prevent
        timing attacks during backup code verification.
        
        Args:
            stored_hash: The SHA-256 hex digest of the original backup code.
            candidate: The backup code entered by the user.
        
        Returns:
            True if the candidate matches the stored hash.
        """
        candidate_normalized = candidate.replace("-", "").upper()
        candidate_hash = hashlib.sha256(candidate_normalized.encode()).hexdigest()
        return hmac.compare_digest(stored_hash, candidate_hash)
```

---

## Constraints

### MUST DO
- Use argon2id for password hashing; if unavailable, use bcrypt with cost factor >= 12
- Validate ALL JWT claims (iss, aud, exp, nbf, jti) — never skip any check
- Implement PKCE for every OAuth 2.0 flow, even confidential clients
- Store refresh token hashes server-side, never the raw tokens (mitigates database theft)
- Generate all secrets with `secrets` module — never use `random`, `uuid4()`, or `os.urandom()` without proper encoding
- Rate-limit authentication endpoints: max 5 login attempts per user per 15 minutes
- Rotate session IDs on privilege escalation (login, password change, MFA enrollment)
- Set `HttpOnly; Secure; SameSite=Strict` on all authentication cookies in production
- Implement constant-time comparison (`hmac.compare_digest`) for all secret comparisons
- Provide backup recovery codes alongside any MFA implementation (minimum 8 codes)
- Include `jti` (JWT ID) in every access token to enable individual token revocation

### MUST NOT DO
- Never use MD5, SHA1, SHA256, or any unsalted hash for password storage
- Never accept JWT tokens with `alg:none` — enforce strict algorithm whitelisting on decode
- Never store tokens in browser localStorage (XSS can read them — cookies are safer)
- Never skip audience (`aud`) claim validation — allows token reuse across services
- Never use the same PKCE code_verifier across multiple authorization requests
- Never allow more than 5 consecutive MFA verification attempts without exponential backoff
- Never store backup codes in plaintext — always hash with SHA-256 before storage
- Never hardcode secrets, API keys, or client secrets in source code
- Never use `random` module for any cryptographic operation (including token generation)

---

## Output Template

When implementing authentication patterns, the model must produce:

1. **Authentication Mechanism Selected** — Which mechanism (password+jwt, session, oauth, passwordless) and why
2. **Password Hash Configuration** — Algorithm, cost parameters, and salt strategy
3. **Token/Session Lifecycle** — Token lifetimes, refresh token rotation strategy, or session timeout configuration
4. **OAuth Flow Details** — Authorization URL builder, PKCE params, token exchange flow with error handling
5. **MFA Implementation** — TOTP config, QR provisioning URI format, backup code generation and hashing
6. **Security Configuration** — Cookie attributes, rate limits, CORS policy, algorithm whitelists

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-security-review` | Audit authentication implementations for vulnerabilities before deployment |
| `coding-input-validation` | Validate user inputs at auth boundaries (registration forms, login payloads) |
| `coding-security-architecture` | Design overall auth architecture including threat modeling and trust boundaries |

---

## Live References

> Authoritative documentation links for authentication implementation. These links are resolved at load time to provide up-to-date reference material.

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) — Comprehensive auth best practices
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) — Hashing algorithm recommendations and parameters
- [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636) — Proof Key for Code Exchange specification
- [RFC 6238 — TOTP](https://datatracker.ietf.org/doc/html/rfc6238) — Time-based One-Time Password algorithm
- [NIST SP 800-63B — Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html) — Authentication and lifecycle management standards
- [OWASP JWT Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_C_Node.html) — JWT security best practices

---

## Appendix: Token Lifetime Recommendations

| Token Type | Recommended Lifetime | Rationale |
|---|---|---|
| Access Token (JWT) | 5–15 minutes | Short-lived minimizes damage if stolen; refresh tokens handle renewal |
| Refresh Token | 24 hours – 7 days | Balanced between security and user convenience |
| Session (web cookie) | Idle 15 min, Absolute 8 hours | Industry standard for web applications |
| OAuth Authorization Code | 10 minutes (single-use only) | Must be exchanged immediately after redirect |
| MFA Backup Codes | N/A — single-use forever | Each code consumed once; no reuse allowed |
