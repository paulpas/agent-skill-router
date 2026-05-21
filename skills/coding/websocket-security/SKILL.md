---
name: websocket-security
description: Hardens WebSocket connections against cross-site hijacking, DoS attacks, and message flooding through origin validation, authentication, rate limiting, connection limits, and secure transport enforcement.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: websocket security, origin validation, cross-site WebSocket hijacking, CCoS, wss://, WebSocket authentication, rate limiting, message flooding, slowloris, connection limits, WebSocket auth, Sec-WebSocket-Origin
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: websocket-manager, websocket-protocol
---

# WebSocket Security Hardening Guide

Hardens WebSocket connections against cross-site hijacking (CCoS), denial-of-service attacks, message flooding, and authentication bypasses. Covers origin validation, token-based auth over WebSocket, per-connection and per-client rate limiting, connection limits by IP and user, secure transport enforcement (wss:// only), protection against slowloris-style attacks, and message size constraints to prevent memory exhaustion.

## TL;DR Checklist

- [ ] Validate Origin header against an allowlist — reject mismatches at the HTTP upgrade stage
- [ ] Require authentication tokens in the handshake query string or first message before accepting the connection
- [ ] Enforce per-client message rate limits (e.g., 100 messages/sec) with burst allowance
- [ ] Set maximum connections per IP and per authenticated user to prevent resource exhaustion
- [ ] Limit message sizes to a configurable ceiling — reject oversized payloads immediately
- [ ] Enforce wss:// for all production connections; block plaintext ws:// in non-dev environments

---

## When to Use

Use this skill when:

- Securing a WebSocket server that accepts connections from browsers or untrusted clients
- Implementing authentication and authorization for real-time communication endpoints
- Protecting against denial-of-service attacks targeting WebSocket infrastructure
- Configuring rate limits to prevent message flooding on shared WebSocket servers
- Auditing existing WebSocket endpoints for security vulnerabilities
- Migrating plaintext ws:// connections to secure wss:// with TLS termination

## When NOT to Use

Avoid this skill for:

- Server-to-server communication over private networks where origin validation is unnecessary — use a firewall or network ACL instead
- Implementing the protocol-level frame handling itself — use `websocket-protocol` for that
- Setting up infrastructure-level TLS termination (nginx, Envoy) — handle WSS upgrade there, then focus on application-layer auth

---

## Core Workflow

1. **Enforce Secure Transport (wss://)** — Reject all plaintext ws:// connections in production. Configure your reverse proxy or WebSocket server to terminate TLS and require the `Upgrade: websocket` request over HTTPS only. In development, allow ws:// with a clear security notice but never ship without wss:// enforcement. **Checkpoint:** Test with `curl -N http://your-host/ws` — it must return 403 Forbidden or close the connection immediately in production.

2. **Validate Origin Header** — The Origin header is sent by browsers during the WebSocket handshake. Compare it against your server's allowlist of permitted origins. This prevents Cross-Site WebSocket Hijacking (CCoS) where a malicious page opens a WebSocket connection to your server using the victim's authenticated cookies. **Checkpoint:** Never use `origin == request.host` as your only check — this is bypassable when both the attacker and your service share the same host but different ports or subdomains.

```python
import re
from typing import Optional


class OriginValidator:
    """Validates WebSocket Origin headers against an allowlist to prevent CCoS.
    
    Cross-Site WebSocket Hijacking (CCoS) occurs when a malicious webpage
    opens a WebSocket connection to your server using the victim's session
    cookies. The server authenticates the connection based on the cookie,
    leaking real-time data to the attacker.
    
    Origin validation at the HTTP upgrade stage blocks these attacks before
    the protocol handshake completes.
    """

    def __init__(self, allowed_origins: list[str]) -> None:
        """Initialize with a list of allowed origin patterns.
        
        Patterns support exact matches and glob-style wildcards:
        - "https://app.example.com" — exact match only
        - "https://*.example.com"   — wildcard subdomain match
        - "https://app.*"           — prefix wildcard (last segment)
        
        Args:
            allowed_origins: List of allowed origin patterns.
                            At minimum, include your production domain.
        """
        self._allowed = [self._compile_pattern(o) for o in allowed_origins]

    def _compile_pattern(self, pattern: str) -> re.Pattern[str]:
        """Convert an allowlist pattern to a compiled regex."""
        # Escape dots except the wildcard star
        escaped = re.escape(pattern).replace(r"\*", "(?:[^/]+)")
        
        # Handle subdomain wildcard: "https://*.example.com" → full domain match
        if "*." in pattern and not pattern.startswith("*"):
            return re.compile(f"^{escaped}$", re.IGNORECASE)
        
        # Handle prefix wildcard: "https://app.*" → prefix with any suffix
        if pattern.endswith("*"):
            prefix = re.escape(pattern[:-1])
            return re.compile(f"^{prefix}.*$", re.IGNORECASE)
        
        # Exact match
        return re.compile(f"^{escaped}$", re.IGNORECASE)

    def validate(self, origin: str, request_host: str) -> bool:
        """Validate an Origin header against the allowlist.
        
        Args:
            origin: The Origin header value from the HTTP upgrade request.
            request_host: The Host header value from the same request.
            
        Returns:
            True if the origin is allowed, False otherwise.
        """
        # Empty Origin means no browser context (CLI, proxy, server-to-server)
        # Allow these through only if explicitly in the allowlist or via a trusted_proxy flag
        if not origin:
            return self._is_trusted_direct_connection()

        # Check direct pattern match first
        for pattern in self._allowed:
            if pattern.match(origin):
                return True

        # Fallback: allow when Origin matches Host exactly (same-origin)
        # This handles cases where the WebSocket server runs on the same host as the web app
        allowed_hosts = [self._extract_host(o) for o in self._allowed]
        if request_host in allowed_hosts:
            return True

        return False

    def _is_trusted_direct_connection(self) -> bool:
        """Determine if a connection without Origin is trusted.
        
        Connections from known proxy IPs or internal services may not send
        Origin headers. This method should check against a list of trusted
        proxy IPs in production.
        """
        # In production, this checks against trusted proxy CIDRs
        # For development, allow direct connections
        return False  # Override with actual proxy IP logic in deployment

    @staticmethod
    def _extract_host(origin: str) -> Optional[str]:
        """Extract the host portion from an origin URL."""
        match = re.match(r"^https?://([^:/]+)", origin)
        return match.group(1) if match else None
```

3. **Implement Authentication Over WebSocket** — Authenticate the connection before accepting it. Two approaches:

   **Approach A — Token in handshake query string** (most common for browser clients): Include a JWT or session token in the URL query parameters during the WebSocket handshake. Validate and reject before completing the 101 switch.

   **Approach B — Auth message as first frame**: Accept the connection but require an authentication message within a configurable timeout (e.g., 5 seconds). If auth fails, close the connection with status 4001 (authentication failed).

```python
import time
import hmac
import hashlib
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AuthResult:
    """Result of WebSocket authentication attempt."""
    success: bool
    user_id: Optional[str] = None
    error_reason: Optional[str] = None
    
    @classmethod
    def rejected(cls, reason: str) -> "AuthResult":
        return cls(success=False, error_reason=reason)
    
    @classmethod
    def accepted(cls, user_id: str) -> "AuthResult":
        return cls(success=True, user_id=user_id)


class WebSocketAuthenticator:
    """Handles authentication for WebSocket connections.
    
    Supports two auth modes:
    - TOKEN_IN_URL: Validate JWT from query string during handshake
    - AUTH_FRAME_REQUIRED: Require an auth message within timeout period
    
    Implements fail-fast semantics: rejected connections are closed before
    any application data flows, minimizing resource waste on unauthenticated clients.
    """

    def __init__(
        self,
        jwt_secret: bytes,
        mode: str = "TOKEN_IN_URL",  # or "AUTH_FRAME_REQUIRED"
        auth_timeout_seconds: float = 5.0,
    ) -> None:
        self._jwt_secret = jwt_secret
        self._mode = mode
        self._auth_timeout = auth_timeout_seconds

        # Track pending auth for connections awaiting auth messages
        self._pending_auth: dict[str, tuple[float, str]] = {}

    def validate_token_in_url(
        self,
        query_string: str,
    ) -> AuthResult:
        """Validate a JWT token from the WebSocket handshake URL.
        
        Example URL: wss://api.example.com/realtime?token=eyJhbGc...
        
        Args:
            query_string: The full query string from the upgrade request.
            
        Returns:
            AuthResult indicating success/failure with user_id or error reason.
        """
        if not query_string:
            return AuthResult.rejected("Missing authentication token")

        # Parse query string — expect ?token=<jwt>
        parts = query_string.split("&", 1)
        token_param = parts[0]
        
        if not token_param.startswith("token="):
            return AuthResult.rejected("Invalid token parameter format")

        token = token_param[6:]  # Strip "token=" prefix
        
        if len(token) < 10:
            return AuthResult.rejected("Token too short")

        # Validate JWT signature (simplified — use PyJWT or jose in production)
        try:
            header_b64, payload_b64, signature = token.split(".")
            
            # Decode and verify signature
            signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
            expected_sig = hmac.new(
                self._jwt_secret,
                signing_input,
                hashlib.sha256,
            ).digest()

            actual_sig = bytes.fromhex(signature)
            if not hmac.compare_digest(expected_sig, actual_sig):
                return AuthResult.rejected("Invalid JWT signature")

            # Decode payload and check expiration
            import json
            payload = json.loads(
                _base64url_decode(payload_b64)
            )

            now = time.time()
            exp = payload.get("exp", 0)
            if exp < now:
                return AuthResult.rejected("Expired authentication token")

            user_id = payload.get("sub") or payload.get("user_id")
            if not user_id:
                return AuthResult.rejected("Token missing user identifier")

            return AuthResult.accepted(user_id)

        except Exception as e:
            return AuthResult.rejected(f"JWT parse error: {e}")

    def require_auth_frame(
        self,
        connection_id: str,
        frame_data: bytes,
        current_time: Optional[float] = None,
    ) -> AuthResult:
        """Process an incoming auth message on a pending connection.
        
        In AUTH_FRAME_REQUIRED mode, the connection is accepted but not yet
        authenticated. This method processes the first message as the auth
        attempt. If successful, the connection is fully opened. If failed,
        it is closed immediately.
        
        Args:
            connection_id: Unique identifier for this connection.
            frame_data: The text payload of the auth message (JSON).
            current_time: Override for testing; defaults to time.time().
            
        Returns:
            AuthResult indicating success/failure.
        """
        if current_time is None:
            current_time = time.time()

        # Check if connection timed out while waiting for auth
        if connection_id in self._pending_auth:
            pending_time, _ = self._pending_auth[connection_id]
            elapsed = current_time - pending_time
            
            if elapsed > self._auth_timeout:
                del self._pending_auth[connection_id]
                return AuthResult.rejected("Authentication timed out")

        # Parse the auth message
        try:
            import json
            auth_msg = json.loads(frame_data.decode("utf-8"))
            
            token = auth_msg.get("token", "")
            if not token or len(token) < 10:
                return AuthResult.rejected("Invalid auth message format")

            # Reuse the JWT validation logic
            result = self._validate_token_from_string(token)
            
            # Clean up pending state
            self._pending_auth.pop(connection_id, None)
            
            if result.success:
                del self._pending_auth[connection_id]
            return result

        except (json.JSONDecodeError, UnicodeDecodeError):
            return AuthResult.rejected("Invalid JSON in auth message")

    def register_pending_auth(self, connection_id: str) -> None:
        """Register a connection as awaiting authentication."""
        self._pending_auth[connection_id] = (time.time(), "")

    def _validate_token_from_string(self, token: str) -> AuthResult:
        """Shared JWT validation logic for both auth modes.
        
        Simplified JWT validation — use a proper library in production.
        """
        try:
            header_b64, payload_b64, signature = token.split(".")
            signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
            expected_sig = hmac.new(
                self._jwt_secret,
                signing_input,
                hashlib.sha256,
            ).digest()
            actual_sig = bytes.fromhex(signature)

            if not hmac.compare_digest(expected_sig, actual_sig):
                return AuthResult.rejected("Invalid JWT signature")

            import json
            payload = json.loads(_base64url_decode(payload_b64))
            
            now = time.time()
            exp = payload.get("exp", 0)
            if exp < now:
                return AuthResult.rejected("Expired token")

            user_id = payload.get("sub") or payload.get("user_id")
            if not user_id:
                return AuthResult.rejected("Token missing user identifier")

            return AuthResult.accepted(user_id)
        except Exception:
            return AuthResult.rejected("JWT validation failed")


def _base64url_decode(s: str) -> bytes:
    """Decode Base64-URL encoding (RFC 7515)."""
    import base64
    s += "=" * (-len(s) % 4)  # Pad to multiple of 4
    return base64.urlsafe_b64decode(s.replace("-", "+").replace("_", "/"))
```

4. **Enforce Rate Limiting** — Protect against message flooding by limiting the number of messages each connection and each user can send within a time window. Use a sliding window counter approach that resets gradually rather than hard windows, providing smoother throttling behavior.

```python
import time
import threading
from collections import defaultdict
from typing import Optional


class WebSocketRateLimiter:
    """Sliding-window rate limiter for WebSocket connections and users.
    
    Uses a token bucket algorithm with per-connection and per-user limits.
    Each connection is independently rate-limited, and all connections
    belonging to the same user share a user-level limit — preventing a
    single user from opening many connections to bypass per-connection caps.
    """

    def __init__(
        self,
        messages_per_second: float = 50.0,
        burst_size: int = 100,
        user_messages_per_second: float = 500.0,
        user_burst_size: int = 1000,
    ) -> None:
        """Initialize rate limiter with per-connection and per-user limits.
        
        Args:
            messages_per_second: Max messages per connection per second.
            burst_size: Maximum burst allowed before throttling kicks in.
            user_messages_per_second: Max messages per authenticated user
                                     across all their connections.
            user_burst_size: User-level burst allowance.
        """
        self._conn_limit = messages_per_second
        self._conn_burst = int(burst_size)
        self._user_limit = user_messages_per_second
        self._user_burst = int(user_burst_size)

        # Token bucket state: {id: (tokens, last_refill_time)}
        self._conn_buckets: dict[str, tuple[float, float]] = {}
        self._user_buckets: dict[str, tuple[float, float]] = {}
        
        # Map user_id -> set of connection_ids for cleanup
        self._user_connections: dict[str, set[str]] = defaultdict(set)

        self._lock = threading.Lock()

    def allow_message(
        self,
        connection_id: str,
        user_id: Optional[str] = None,
        current_time: Optional[float] = None,
    ) -> tuple[bool, float]:
        """Check if a message from this connection should be allowed.
        
        Both per-connection AND per-user limits must pass for the message
        to be accepted. The returned float is the retry-after seconds
        (0.0 if allowed immediately).
        
        Args:
            connection_id: Unique ID for this WebSocket connection.
            user_id: Authenticated user ID, or None for unauthenticated.
            current_time: Override for testing; defaults to time.time().
            
        Returns:
            Tuple of (allowed: bool, retry_after_seconds: float).
        """
        if current_time is None:
            current_time = time.time()

        with self._lock:
            # Check per-connection limit
            conn_allowed, conn_retry = self._check_bucket(
                connection_id,
                self._conn_limit,
                self._conn_burst,
                current_time,
            )

            if not conn_allowed:
                return False, conn_retry

            # Check per-user limit if authenticated
            if user_id:
                user_allowed, user_retry = self._check_bucket(
                    f"user:{user_id}",
                    self._user_limit,
                    self._user_burst,
                    current_time,
                )

                if not user_allowed:
                    return False, user_retry

                self._user_connections[user_id].add(connection_id)

        return True, 0.0

    def _check_bucket(
        self,
        key: str,
        rate: float,
        max_tokens: int,
        current_time: float,
    ) -> tuple[bool, float]:
        """Check a single token bucket."""
        refill_rate = rate  # tokens added per second

        if key not in self._conn_buckets and key not in self._user_buckets:
            buckets = self._conn_buckets if "user:" not in key else self._user_buckets
            buckets[key] = (float(max_tokens), current_time)

        buckets = self._conn_buckets if "user:" not in key else self._user_buckets
        tokens, last_time = buckets[key]

        # Refill tokens based on elapsed time
        elapsed = current_time - last_time
        tokens = min(max_tokens, tokens + elapsed * refill_rate)

        if tokens >= 1.0:
            tokens -= 1.0
            buckets[key] = (tokens, current_time)
            return True, 0.0

        # Calculate time until next token available
        retry_after = (1.0 - tokens) / refill_rate
        buckets[key] = (tokens, current_time)
        return False, retry_after

    def remove_connection(self, connection_id: str) -> None:
        """Clean up bucket state when a connection is closed."""
        with self._lock:
            self._conn_buckets.pop(connection_id, None)
            
            # Unregister from user tracking
            for user_id, conns in self._user_connections.items():
                conns.discard(connection_id)
                if not conns:
                    del self._user_connections[user_id]
                    self._user_buckets.pop(f"user:{user_id}", None)
```

5. **Enforce Connection Limits** — Prevent resource exhaustion by limiting the number of simultaneous WebSocket connections per IP address and per authenticated user. Track active connections and reject new ones when limits are exceeded, returning a 429 Too Many Requests HTTP response at the upgrade stage.

```python
import time
from collections import defaultdict
from typing import Optional


class ConnectionLimiter:
    """Limits simultaneous WebSocket connections per IP and per user."""

    def __init__(
        self,
        max_per_ip: int = 10,
        max_per_user: int = 5,
    ) -> None:
        """Initialize connection limits.
        
        Args:
            max_per_ip: Maximum simultaneous connections from one IP.
            max_per_user: Maximum connections for one authenticated user.
        """
        self._max_per_ip = max_per_ip
        self._max_per_user = max_per_user

        # Track active connections: {ip -> set(connection_ids)}
        self._ip_connections: dict[str, set[str]] = defaultdict(set)
        # Track per-user connections: {user_id -> set(connection_ids)}
        self._user_connections: dict[str, set[str]] = defaultdict(set)
        
        # Connection metadata for cleanup: {connection_id -> (ip, user_id_or_none)}
        self._conn_meta: dict[str, tuple[str, Optional[str]]] = {}

    def register_connection(
        self,
        connection_id: str,
        client_ip: str,
        user_id: Optional[str] = None,
    ) -> tuple[bool, str]:
        """Register a new connection and check if it exceeds limits.
        
        Args:
            connection_id: Unique ID for this connection.
            client_ip: Client's IP address.
            user_id: Authenticated user ID, or None.
            
        Returns:
            Tuple of (allowed, reason). If not allowed, reason explains why.
        """
        # Check per-IP limit
        if len(self._ip_connections[client_ip]) >= self._max_per_ip:
            return False, f"Max {self._max_per_ip} connections per IP exceeded"

        # Check per-user limit (if authenticated)
        if user_id and len(self._user_connections[user_id]) >= self._max_per_user:
            return False, f"Max {self._max_per_user} connections per user exceeded"

        # Register the connection
        self._ip_connections[client_ip].add(connection_id)
        self._conn_meta[connection_id] = (client_ip, user_id)
        
        if user_id:
            self._user_connections[user_id].add(connection_id)

        return True, "allowed"

    def unregister_connection(self, connection_id: str) -> None:
        """Remove a connection from all tracking."""
        meta = self._conn_meta.pop(connection_id, None)
        if not meta:
            return

        client_ip, user_id = meta
        
        conns = self._ip_connections.get(client_ip, set())
        conns.discard(connection_id)
        
        if user_id and user_id in self._user_connections:
            users_conns = self._user_connections[user_id]
            users_conns.discard(connection_id)
            
            # Clean up empty entries
            if not users_conns:
                del self._user_connections[user_id]
            
            if not conns:
                del self._ip_connections[client_ip]

    def get_active_count(self, client_ip: str) -> int:
        """Get the number of active connections from an IP."""
        return len(self._ip_connections.get(client_ip, set()))

    def get_user_count(self, user_id: str) -> int:
        """Get the number of active connections for a user."""
        return len(self._user_connections.get(user_id, set()))
```

6. **Enforce Message Size Limits** — Reject messages that exceed a configured maximum size during the frame parsing phase, before any payload allocation. This prevents memory exhaustion attacks where an attacker sends increasingly large frames. Set the limit based on your application's needs — typically 1 MB for text/chat and 10-50 MB for binary data transfers.

```python
class MessageSizeEnforcer:
    """Enforces maximum message size limits to prevent DoS via memory exhaustion.
    
    Checks message size at two levels:
    1. Single frame size — prevents a single massive frame from consuming memory
    2. Total message size (after reassembly of fragments) — prevents large
       fragmented messages that exhaust buffer space
    
    Both limits must pass for a message to be accepted.
    """

    def __init__(
        self,
        max_single_frame: int = 1_048_576,   # 1 MB per frame
        max_total_message: int = 10_485_760,  # 10 MB total message
    ) -> None:
        """Initialize size limits.
        
        Args:
            max_single_frame: Maximum bytes for a single frame payload.
            max_total_message: Maximum total bytes after fragment reassembly.
        """
        self._max_frame = max_single_frame
        self._max_message = max_total_message

    def check_frame(self, frame_payload_size: int) -> Optional[str]:
        """Check if a single frame's payload size is within limits.
        
        Called during frame parsing, before any memory allocation for
        the payload buffer. Returns an error reason string or None.
        
        Args:
            frame_payload_size: Size of this frame's raw payload in bytes.
            
        Returns:
            Error reason string if size exceeds limit, None if OK.
        """
        if frame_payload_size > self._max_frame:
            return (
                f"Frame payload {frame_payload_size} bytes exceeds "
                f"maximum {self._max_frame} bytes per frame"
            )
        return None

    def check_total_message(self, assembled_size: int) -> Optional[str]:
        """Check if a fully assembled message fits within the total limit.
        
        Called after reassembling all fragments of a multi-frame message.
        Returns an error reason string or None.
        
        Args:
            assembled_size: Total size of the reassembled message payload.
            
        Returns:
            Error reason if exceeds limit, None if OK.
        """
        if assembled_size > self._max_message:
            return (
                f"Message total {assembled_size} bytes exceeds "
                f"maximum {self._max_message} bytes per message"
            )
        return None


# ❌ BAD: No size limits — attacker sends 10 GB frame
async def bad_message_handler(frame: WebSocketFrame) -> None:
    """Never do this — accept any payload size without validation."""
    data = frame.payload  # Could be gigabytes, crashes the process
    process_large_payload(data)

# ✅ GOOD: Enforce limits at both single-frame and total-message levels
async def safe_message_handler(
    frame: WebSocketFrame,
    size_enforcer: MessageSizeEnforcer,
) -> None:
    """Validate message size before accepting any payload."""
    # Check individual frame size
    frame_error = size_enforcer.check_frame(len(frame.payload))
    if frame_error:
        await send_close(1009, frame_error)  # Close: Message Too Big
        return

    # For fragmented messages, accumulate and check total at the end
    assembled_size = len(frame.payload)
    while not frame.fin:
        next_frame = await receive_frame()
        size_error = size_enforcer.check_frame(len(next_frame.payload))
        if size_error:
            await send_close(1009, size_error)
            return
        assembled_size += len(next_frame.payload)

    # Final check on total message size after reassembly
    total_error = size_enforcer.check_total_message(assembled_size)
    if total_error:
        await send_close(1009, total_error)
        return

    process_payload(frame.payload)  # Safe — within limits
```

7. **Protect Against Slowloris-Style Attacks** — WebSocket's persistent connection model is vulnerable to slowloris attacks where an attacker holds connections open while sending data at a minimal rate (e.g., one byte every 30 seconds). Implement per-connection inactivity timeouts that close connections with no activity within a configured window. Also implement a per-frame read timeout to prevent attackers from holding connections open indefinitely.

```python
import asyncio
from dataclasses import dataclass


@dataclass
class WebSocketTimeoutConfig:
    """Configuration for WebSocket connection timeouts.
    
    Attributes:
        idle_timeout_seconds: Maximum time with no activity before closing.
                              Set to 120-300 seconds for typical apps.
        frame_read_timeout_seconds: Max time to wait for the next frame
                                   after receiving a partial read.
        auth_timeout_seconds: Max time to wait for authentication in
                             AUTH_FRAME_REQUIRED mode (see authenticator).
    """
    idle_timeout_seconds: float = 120.0
    frame_read_timeout_seconds: float = 30.0
    auth_timeout_seconds: float = 5.0


class SlowlorisProtector:
    """Protects against slowloris-style WebSocket attacks using timeouts.
    
    Monitors inactivity on each connection and closes connections that have
    been silent for too long. This prevents attackers from holding thousands
    of idle connections open, which would exhaust file descriptors, memory,
    and worker threads.
    
    Also enforces a per-frame read timeout: if bytes arrive but no complete
    frame is received within the configured window, the connection is closed.
    """

    def __init__(self, config: WebSocketTimeoutConfig) -> None:
        self._config = config
        
        # Track last activity per connection: {connection_id: timestamp}
        self._last_activity: dict[str, float] = {}
        
        # Cleanup task — runs periodically to close timed-out connections
        self._cleanup_task: Optional[asyncio.Task[None]] = None

    def start(self) -> asyncio.Task[None]:
        """Start the background cleanup task.
        
        Must be called when the server starts. The task runs every 60 seconds
        and closes any connection idle longer than idle_timeout_seconds.
        
        Returns:
            The asyncio.Task that performs periodic cleanup.
        """
        self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
        return self._cleanup_task

    def stop(self) -> None:
        """Stop the background cleanup task."""
        if self._cleanup_task and not self._cleanup_task.done():
            self._cleanup_task.cancel()

    def record_activity(self, connection_id: str) -> None:
        """Update the last-activity timestamp for a connection.
        
        Call this every time any data is received or sent on the connection,
        including ping/pong frames. A pong reply counts as activity because
        it proves the connection is alive.
        """
        self._last_activity[connection_id] = asyncio.get_event_loop().time()

    def get_idle_seconds(self, connection_id: str) -> float:
        """Get how many seconds a connection has been idle."""
        last = self._last_activity.get(connection_id)
        if last is None:
            return float("inf")
        return asyncio.get_event_loop().time() - last

    async def _periodic_cleanup(self) -> None:
        """Run every 60 seconds to close idle connections."""
        while True:
            await asyncio.sleep(60)
            now = asyncio.get_event_loop().time()

            timed_out = []
            for conn_id, last_active in self._last_activity.items():
                if now - last_active > self._config.idle_timeout_seconds:
                    timed_out.append(conn_id)

            for conn_id in timed_out:
                del self._last_activity[conn_id]
                # In a real implementation, trigger connection close here
                await self._close_connection_with_code(
                    conn_id, 1001  # Going Away
                )

    @staticmethod
    async def _close_connection_with_code(connection_id: str, code: int) -> None:
        """Close a connection with the given WebSocket close code.
        
        In production, this calls the actual connection.close(code, reason).
        Here it's a placeholder for demonstration.
        """
        pass  # connection_manager.close_connection(connection_id, code)

    def create_frame_read_timeout(self, connection_id: str) -> asyncio.TimeoutHandle:
        """Create a timeout handle for reading a single frame.
        
        Returns a handle that, when fired, will close the connection if
        a complete frame has not been received within the configured window.
        
        Use this at the start of each read operation and cancel it upon
        successful frame completion.
        """
        loop = asyncio.get_event_loop()
        # Implementation depends on your async framework
        # e.g., for asyncio.StreamReader: await reader.readexactly(N, timeout=...)
        return loop.call_later(
            self._config.frame_read_timeout_seconds,
            lambda: self._close_connection_with_code(connection_id, 1002),
        )
```

8. **Secure Transport Enforcement** — Block plaintext ws:// connections in production, requiring wss:// (WebSocket over TLS). Configure your reverse proxy (nginx, Caddy, Traefik) to enforce HTTPS termination and upgrade only valid requests to WebSocket protocol. This ensures all data in transit is encrypted, preventing eavesdropping and man-in-the-middle attacks on real-time communication.

```python
import os


class SecureTransportEnforcer:
    """Enforces wss:// (secure WebSocket) connections in production.
    
    Prevents plaintext ws:// connections from being accepted in production
    environments, ensuring all real-time data is encrypted in transit.
    In development and testing, ws:// is allowed with a warning logged.
    """

    def __init__(self, enforce_wss: Optional[bool] = None) -> None:
        """Initialize transport enforcement configuration.
        
        Args:
            enforce_wss: Override default detection. If True, always require
                        wss://. If False, allow ws:// in all environments.
                        If None (default), auto-detect based on ENVIRONMENT.
        """
        self._enforce = enforce_wss if enforce_wss is not None else self._is_production()

    def _is_production(self) -> bool:
        """Auto-detect production environment."""
        env = os.environ.get("ENVIRONMENT", os.environ.get("NODE_ENV", "development"))
        return env in ("production", "prod")

    def validate_upgrade_request(
        self,
        scheme: str,  # "wss" or "ws" (extracted from the request URI)
    ) -> tuple[bool, str]:
        """Validate that the upgrade request uses secure transport.
        
        Args:
            scheme: The scheme extracted from the WebSocket URI — "wss" for
                   secure or "ws" for plaintext.
                   
        Returns:
            Tuple of (allowed, reason). If not allowed, reason explains why.
        """
        if self._enforce and scheme != "wss":
            return False, "WebSocket connections require wss:// in production"

        if scheme == "ws":
            # Log a warning for development usage
            print("[WARNING] Plaintext ws:// connection accepted — use wss:// in production")

        return True, ""

    def build_tls_config(self) -> dict:
        """Generate TLS configuration for the WebSocket server.
        
        Returns recommended TLS settings that prevent downgrade attacks
        and ensure strong cipher suites.
        """
        return {
            "ssl_version": "TLSv1_2",  # Minimum supported version
            "min_tls_version": "TLSv1_2",
            "preferred_ciphers": [
                "ECDHE-ECDSA-AES256-GCM-SHA384",
                "ECDHE-RSA-AES256-GCM-SHA384",
                "ECDHE-ECDSA-CHACHA20-POLY1305",
                "ECDHE-RSA-CHACHA20-POLY1305",
            ],
            "hsts_enabled": True,
            "hsts_max_age": 31536000,  # 1 year
        }


# ❌ BAD: Accepting any transport without validation
async def bad_upgrade_handler(request) -> None:
    """Never do this — no transport validation."""
    if request.headers.get("Upgrade") == "websocket":
        upgrade_to_websocket(request)  # Accepts ws:// and wss:// equally

# ✅ GOOD: Enforce wss:// in production with TLS configuration
async def secure_upgrade_handler(request) -> None:
    """Validate transport security before upgrading to WebSocket."""
    enforcer = SecureTransportEnforcer(enforce_wss=True)
    
    # Extract scheme from the request URI
    scheme = "wss" if request.is_secure else "ws"
    
    allowed, reason = enforcer.validate_upgrade_request(scheme)
    if not allowed:
        await request.send_response(403, {"error": reason})
        return
    
    upgrade_to_websocket(request)
```

---

## Constraints

### MUST DO
- Validate Origin header against an explicit allowlist — never use `request.host` alone as the sole check
- Reject unauthenticated connections before application data flows — fail fast at handshake or first message
- Enforce per-connection AND per-user rate limits to prevent bypass via multiple connections
- Set connection limits per IP (10-20) and per authenticated user (3-10) based on expected usage
- Limit single frame payload to 1 MB and total message to a configured ceiling — reject oversized frames before allocation
- Enforce wss:// in production — block ws:// connections with 403 Forbidden
- Implement idle timeouts (120-300 seconds) to prevent slowloris-style connection exhaustion
- Log all rejected connections with the rejection reason for security monitoring

### MUST NOT DO
- Use `Access-Control-Allow-Origin: *` on WebSocket endpoints — this bypasses origin validation entirely
- Accept WebSocket connections from unknown or unverified origins without explicit allowlisting
- Allow unlimited message sizes — always enforce both per-frame and total-message limits
- Skip authentication for sensitive real-time endpoints (trading feeds, chat with PII, admin dashboards)
- Use hard time windows for rate limiting — attackers can flood right before the window resets; use sliding windows or token buckets
- Close connections without sending a proper Close frame — this triggers code 1006 (abnormal closure) and wastes server resources tracking dead connections
- Hardcode secret keys for JWT validation — load them from environment variables or a secrets manager

---

## Output Template

When auditing or implementing WebSocket security, produce:

1. **Transport Assessment** — Whether wss:// is enforced in the target environment, with TLS configuration details
2. **Origin Validation Results** — The configured allowlist, whether `request.host` fallback is present (should be removed), and any gaps
3. **Authentication Strategy** — Which auth mode is used (token-in-url or auth-frame), token validation logic summary
4. **Rate Limit Configuration** — Per-connection and per-user limits with burst allowances and time window strategy
5. **Connection Limits** — Max connections per IP, per user, and whether cleanup on disconnect is implemented
6. **Message Size Policy** — Single frame limit, total message limit, and how oversized frames are handled

---

## Related Skills

| Skill | Purpose |
|---|---|
| `websocket-protocol` | Frame-level protocol implementation (RFC 6455), subprotocol negotiation, compression |
| `websocket-manager` | Connection state machine, automatic reconnection with exponential backoff, message routing |
