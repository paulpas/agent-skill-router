---




name: security-engineering
description: Implements end-to-end secure development lifecycle practices including threat modeling (STRIDE/DREAD), OWASP Top 10 vulnerability prevention, zero-trust architecture patterns, supply chain security, and automated security pipeline integration for production systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: threat modeling, STRIDE, secure coding standards, OWASP Top 10, supply chain security, zero trust architecture, SAST DAST security pipeline, how do i secure my app
  archetypes:
    - tactical
    - strategic
    - enforcement
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: medium
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
    - config
  related-skills: coding-security-review, cncf-open-telemetry, coding-software-delivery-pipelines, coding-dependency-supply-chain-security




---





# Security Engineering — Secure Development Lifecycle

Senior security engineer implementing the full secure development lifecycle (SDLC) across threat modeling, secure coding standards, zero-trust architecture, supply chain integrity, and automated security pipeline integration. This skill provides concrete patterns for preventing vulnerabilities at every stage of the software lifecycle — from design-time threat analysis through production security controls. Follow OWASP ASVS v4.0.3, NIST SSDF (SP 800-218), and MITRE ATT&CK as the authoritative security frameworks for all implementation decisions.

## TL;DR Checklist

- [ ] Run STRIDE threat modeling on every new service or major feature before writing code
- [ ] Validate all external inputs: parameterize queries, encode outputs, enforce content types
- [ ] Implement least-privilege access controls at both infrastructure and application levels
- [ ] Generate SBOM (CycloneDX) on every build and scan with Trivy or Grype
- [ ] Enforce mTLS between all service-to-service communications in the mesh
- [ ] Integrate SAST (Semgrep, CodeQL), DAST (OWASP ZAP), and secret scanning (gitleaks) into CI
- [ ] Store all secrets in HashiCorp Vault with dynamic credentials — never in environment variables or source code
- [ ] Apply OPA/Gatekeeper policies to reject non-compliant Kubernetes manifests before deployment

---

## When to Use

Use this skill when:

- Designing a new service or system that requires threat modeling and security controls
- Implementing secure coding patterns to prevent OWASP Top 10 vulnerabilities in application code
- Building microservices that need zero-trust networking with mTLS and identity verification
- Setting up CI/CD security pipelines with SAST, DAST, dependency scanning, and secret detection
- Creating supply chain security controls: SBOM generation, artifact signing, and provenance attestation
- Configuring policy-as-code enforcement (OPA, Kyverno) to prevent insecure infrastructure deployments
- Migrating a legacy application to least-privilege access patterns with service identities
- Conducting a security design review for a system handling sensitive data (PII, payment, health records)

---

## When NOT to Use

Avoid this skill for:

- Routine code quality or style issues — use `coding-code-review` instead
- Analyzing a specific CVE in a dependency — use `coding-dependency-supply-chain-security` instead
- Generating runbooks or incident response playbooks — use an operations-focused skill
- High-level security strategy without implementation specifics — narrow the scope to concrete patterns

---

## Core Workflow

1. **Threat Model the System** — Apply STRIDE to enumerate threats per component, then prioritize with DREAD scoring.
   **Checkpoint:** Every external data flow must have at least one identified threat with a mitigation assigned.

2. **Define Security Requirements** — Translate threats into concrete security requirements using OWASP ASVS as the baseline. Separate L1 (basic), L2 (intermediate), and L3 (elevated) controls based on data sensitivity.
   **Checkpoint:** Every STRIDE threat maps to at least one ASVS control category.

3. **Implement Secure Coding Patterns** — Apply input validation, output encoding, parameterized queries, and CSRF protections in application code. Use the patterns in Section 2 below.

4. **Enforce Zero-Trust Network Controls** — Configure mTLS between services, enforce identity-aware access policies, and implement least-privilege RBAC/ABAC at every layer.
   **Checkpoint:** No service-to-service communication should ever be unauthenticated or unencrypted.

5. **Integrate Security Automation** — Add SAST, DAST, dependency scanning, secret detection, and policy-as-code gates to the CI/CD pipeline before any artifact reaches production.
   **Checkpoint:** Every merge to main triggers the full security pipeline; no manual bypass allowed.

6. **Verify and Report** — Run automated scans, review findings, track remediation metrics, and maintain an attack surface inventory.
   **Checkpoint:** Zero Critical or High findings should exist in production without documented risk acceptance.

---

## Implementation Patterns / Reference Guide

### Pattern 1: STRIDE Threat Modeling

STRIDE categorizes threats into six classes. Apply it to every component and data flow in the system design.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class StrideCategory(Enum):
    """STRIDE threat categories per Microsoft's security framework."""
    SPOOFING = "spoofing"          # Identity forgery, credential theft
    TAMPERING = "tampering"        # Data modification in transit or at rest
    REPUDIATION = "repudiation"    # Actions not logged, no non-repudiation proof
    INFORMATION_DISCLOSURE = "info_disclosure"  # Sensitive data exposure
    DENIAL_OF_SERVICE = "dos"      # Resource exhaustion, availability attacks
    ELEVATION_OF_PRIVILEGE = "privilege_escalation"  # Unauthorized access level increase


@dataclass
class Threat:
    """A STRIDE threat identified during threat modeling."""
    component: str
    data_flow: str
    category: StrideCategory
    description: str
    severity: int = 0  # 1-10 DREAD score calculated later
    mitigation: str = ""


@dataclass
class ThreatModel:
    """Container for a STRIDE threat model of a system component."""
    system_name: str
    version: str
    threats: list[Threat] = field(default_factory=list)
    attack_surface: list[str] = field(default_factory=list)

    def add_threat(
        self,
        component: str,
        data_flow: str,
        category: StrideCategory,
        description: str,
        mitigation: str = ""
    ) -> Threat:
        """Record a threat with its STRIDE category and proposed mitigation."""
        threat = Threat(
            component=component,
            data_flow=data_flow,
            category=category,
            description=description,
            mitigation=mitigation
        )
        self.threats.append(threat)
        return threat

    def threats_by_component(self, component: str) -> list[Threat]:
        """Return all threats affecting a specific component."""
        return [t for t in self.threats if t.component == component]
```

#### DREAD Risk Scoring (Post-Threat-Model Prioritization)

After identifying threats with STRIDE, score each using the DREAD model to prioritize remediation:

```python
from enum import Enum


class DataSensitivity(Enum):
    PUBLIC = 1
    INTERNAL = 2
    CONFIDENTIAL = 3
    RESTRICTED = 4


def calculate_dread_score(
    difficulty: int,          # How easy is exploitation? (1=easy, 10=hard)
    exploitability: int,      # Likelihood of attack succeeding (1-10)
    discovery: int,           # How obvious is the vulnerability? (1=hidden, 10=obvious)
    affected_users: int,      # Proportion of users impacted (1-10)
    damage_potential: int,    # Severity of impact if exploited (1-10)
    reproducibility: int,     # How reliably can the attack be repeated? (1-10)
    data_sensitivity: DataSensitivity = DataSensitivity.INTERNAL
) -> dict:
    """Calculate DREAD risk score with weighted factors.

    Returns a dictionary with total score, component scores, and severity rating.
    Scores are normalized to 0-10 range.
    """
    weights = {
        "difficulty": 1.0,
        "exploitability": 2.0,       # Highest weight — focus on what's easily attackable
        "discovery": 1.0,
        "affected_users": 1.5,
        "damage_potential": 2.0,     # Highest weight — prioritize high-impact issues
        "reproducibility": 1.0,
    }

    damage_multiplier = data_sensitivity.value  # Scale up for sensitive data

    component_scores = {}
    weighted_total = 0.0

    for factor, weight in weights.items():
        score = min(10, max(1, locals()[factor]))
        weighted_score = (score / 10) * weight
        component_scores[factor] = round(weighted_score, 2)
        weighted_total += weighted_score

    max_possible_weight = sum(weights.values())
    normalized_score = (weighted_total / max_possible_weight) * damage_multiplier
    normalized_score = min(10, normalized_score)

    if normalized_score >= 8:
        severity = "CRITICAL"
    elif normalized_score >= 6:
        severity = "HIGH"
    elif normalized_score >= 4:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    return {
        "total_score": round(normalized_score, 2),
        "component_scores": component_scores,
        "severity": severity,
        "data_sensitivity_multiplier": damage_multiplier,
    }
```

### Pattern 2: OWASP Top 10 Prevention Code

These patterns prevent the most common web application vulnerabilities. Each example shows the BAD approach and a secure alternative with typed signatures.

#### A01:2021 — Broken Access Control (IDOR Prevention)

```python
from functools import wraps
from typing import Callable, Any
import logging

logger = logging.getLogger(__name__)


def require_ownership(
    resource_id_field: str = "resource_id",
    user_id_field: str = "user.id"
) -> Callable:
    """Decorator that enforces object-level authorization (prevents IDOR attacks).

    Verifies the authenticated user has ownership or explicit permission
    to access the requested resource before allowing the handler to execute.

    Args:
        resource_id_field: Query parameter or path variable name containing the resource ID.
        user_id_field: Dot-notation path to extract user ID from request context.

    Usage:
        @require_ownership("order_id")
        def get_order(request): ...
    """
    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            request = kwargs.get("request") or args[0]

            # Extract resource ID from the request
            resource_id = kwargs.get(resource_id_field)
            if not resource_id:
                raise ValueError(f"Missing required field: {resource_id_field}")

            # Extract authenticated user context
            user_context = request.get("user", {})
            user_id = _resolve_dot_notation(user_context, user_id_field)

            if not user_id:
                logger.warning("Access attempt with unauthenticated user for resource %s", resource_id)
                raise PermissionError("Authentication required")

            # Check ownership — this is the critical IDOR prevention step
            resource = _fetch_resource(resource_id)  # Your data access layer
            if resource and str(resource.get("owner_id")) != str(user_id):
                logger.warning(
                    "IDOR attempt: user %s tried to access resource owned by %s",
                    user_id,
                    resource.get("owner_id")
                )
                raise PermissionError("Access denied: insufficient permissions")

            return fn(*args, **kwargs)
        return wrapper
    return decorator


def _resolve_dot_notation(obj: dict, path: str) -> Any:
    """Safely resolve dot-notation path in a nested dictionary."""
    keys = path.split(".")
    current = obj
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key)
        else:
            return None
        if current is None:
            return None
    return current


def _fetch_resource(resource_id: str) -> dict | None:
    """Placeholder — replace with your actual data access layer."""
    pass  # Implementation depends on your ORM / database layer
```

#### A03:2021 — Injection (SQL + Command Injection Prevention)

##### ❌ BAD: SQL Injection via String Formatting

```python
# DANGEROUS: User input directly interpolated into SQL query string
def query_users_bad(db_path, role):
    conn = sqlite3.connect(db_path)
    # Never do this — user controls the query string entirely
    query = f"SELECT * FROM users WHERE role = '{role}'"
    return conn.execute(query).fetchall()  # Attacker passes: ' OR '1'='1
```

##### ✅ GOOD: Parameterized Query (Secure)

```python
import sqlite3
from typing import List


def query_users_by_role(db_path: str, role: str) -> List[tuple]:
    """Secure parameterized query preventing SQL injection.

    NEVER use f-strings or format() to build SQL queries with user input.
    Always use parameterized queries with the database driver's built-in
    binding mechanism.

    Args:
        db_path: Path to the SQLite database file.
        role: The user role to filter by (e.g., 'admin', 'editor').

    Returns:
        List of matching user tuples (id, username, email, role).

    Raises:
        sqlite3.Error: If database access fails.
    """
    if not isinstance(role, str) or len(role) > 50:
        raise ValueError("Role must be a string of 50 characters or less")

    # Parameterized query — the database driver handles escaping automatically
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.execute(
            "SELECT id, username, email, role FROM users WHERE role = ?",
            (role,)
        )
        return cursor.fetchall()
    finally:
        conn.close()
```

##### ❌ BAD: Command Injection via shell=True

```python
import subprocess

# DANGEROUS: User-controlled string passed directly to shell
def find_files_bad(base_directory, pattern):
    # Attacker passes pattern="; rm -rf / ; echo " — total system compromise
    return subprocess.run(
        f"find {base_directory} -name '{pattern}'",
        shell=True  # Never use with user input!
    )
```

##### ✅ GOOD: Safe File Search with pathlib (Secure)

```python
import subprocess
from pathlib import Path
from typing import List


def find_files_safely(base_directory: str, pattern: str) -> List[str]:
    """Secure file search preventing command injection.

    NEVER pass user input directly to os.system(), subprocess with shell=True,
    or eval(). Use pathlib for safe path operations and subprocess with
    explicit argument lists (no shell).

    Args:
        base_directory: The root directory to search within.
        pattern: Glob pattern to match filenames against.

    Returns:
        List of absolute file paths matching the criteria.

    Raises:
        ValueError: If inputs contain path traversal sequences or are invalid.
    """
    # Prevent directory traversal attacks
    base_path = Path(base_directory).resolve()
    if not base_path.is_dir():
        raise ValueError(f"Invalid directory: {base_directory}")

    # Validate pattern contains no path separators or shell metacharacters
    if "/" in pattern or "\\" in pattern or any(c in pattern for c in "*;|&$`"):
        raise ValueError("Pattern must not contain path separators or shell metacharacters")

    # Use pathlib's built-in glob — safe, cross-platform, no shell involved
    matches = []
    for file_path in base_path.glob(pattern):
        if file_path.is_file() and str(file_path.resolve()).startswith(str(base_path)):
            matches.append(str(file_path))

    return sorted(matches)
```

#### A07:2021 — Identification and Authentication Failures (Secure Session Handling)

##### ❌ BAD: Insecure Session with Predictable Tokens and No Expiration

```python
# DANGEROUS: Uses predictable tokens, no expiration, stored client-side
import uuid
import json


def create_session_bad(user_id: str) -> dict:
    # UUID is not cryptographically random — attackers can predict session IDs
    token = str(uuid.uuid4())  # Predictable on some implementations

    # Storing sensitive data in the token itself breaks confidentiality
    payload = {
        "user_id": user_id,
        "role": "admin",  # NEVER embed roles in tokens without signing
        "exp": None,       # No expiration — sessions live forever
    }
    return {"token": token, "payload": json.dumps(payload)}  # Leaks payload to client
```

##### ✅ GOOD: Cryptographically Secure Session Manager (Secure)

```python
import secrets
import time
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class SessionConfig:
    """Configuration for secure session management."""
    token_length: int = 64                  # Bytes of entropy in session tokens
    expiration_seconds: int = 3600          # 1 hour default TTL
    max_concurrent_sessions: int = 5        # Limit per user
    rotate_on_privilege_change: bool = True # New token on login/logout
    secure_cookie: bool = True              # HttpOnly + Secure + SameSite


class SecureSessionManager:
    """Implements secure session management with cryptographic tokens.

    Follows OWASP Session Management Cheat Sheet:
    - Generates unpredictable 256-bit+ tokens using secrets.token_bytes()
    - Tokens are stored server-side (not in cookies) with expiration
    - Sessions rotate on authentication state changes
    - Rate limits login attempts to prevent brute force attacks
    """

    def __init__(self, config: Optional[SessionConfig] = None):
        self.config = config or SessionConfig()
        self._sessions: dict[str, dict] = {}
        self._failed_attempts: dict[str, int] = {}  # IP -> count
        self._attempt_timestamps: dict[str, list[float]] = {}

    def create_session(self, user_id: str) -> str:
        """Create a new secure session token for an authenticated user.

        Generates a cryptographically random token and stores session metadata
        server-side. The token is returned — never embed sensitive data in it.

        Args:
            user_id: Unique identifier of the authenticated user.

        Returns:
            Cryptographically secure session token string (hex-encoded).
        """
        # Generate 64 bytes (512 bits) of cryptographic randomness
        token = secrets.token_hex(self.config.token_length)
        now = time.time()

        self._sessions[token] = {
            "user_id": user_id,
            "created_at": now,
            "expires_at": now + self.config.expiration_seconds,
            "ip_address": None,  # Populate at first request
            "user_agent": None,
        }
        return token

    def validate_session(self, token: str) -> Optional[dict]:
        """Validate a session token and return user context if valid.

        Checks expiration, revocation, and consistency. Returns None for
        invalid or expired tokens.

        Args:
            token: The session token to validate.

        Returns:
            Session metadata dict if valid, None otherwise.
        """
        session = self._sessions.get(token)
        if not session:
            return None

        # Check expiration
        if time.time() > session["expires_at"]:
            del self._sessions[token]
            return None

        return session

    def rotate_token(self, old_token: str, user_id: str) -> str:
        """Rotate a session token (called on login/logout/role change).

        Invalidates the old token and creates a new one to prevent fixation attacks.
        """
        # Invalidate old token first (never create new before invalidating old)
        if old_token in self._sessions:
            del self._sessions[old_token]
        return self.create_session(user_id)

    def record_failed_attempt(self, identifier: str) -> None:
        """Track failed login attempts for brute force detection."""
        now = time.time()
        # Clean attempts older than 15 minutes
        window_start = now - 900
        if identifier in self._attempt_timestamps:
            self._attempt_timestamps[identifier] = [
                t for t in self._attempt_timestamps[identifier] if t > window_start
            ]
        else:
            self._attempt_timestamps[identifier] = []

        self._attempt_timestamps[identifier].append(now)
        self._failed_attempts[identifier] = len(self._attempt_timestamps[identifier])

    def is_rate_limited(self, identifier: str, max_attempts: int = 5) -> bool:
        """Check if an identifier is rate-limited due to too many failed attempts."""
        count = self._failed_attempts.get(identifier, 0)
        return count >= max_attempts

    def clear_failed_attempts(self, identifier: str) -> None:
        """Clear failed attempt counters after successful authentication."""
        self._failed_attempts.pop(identifier, None)
        self._attempt_timestamps.pop(identifier, None)
```

### Pattern 3: Zero-Trust Architecture — mTLS Configuration

Zero-trust networking requires mutual authentication for every service-to-service connection. This pattern shows production-ready mTLS using OpenSSL and Python's ssl module.

#### TLS Certificate Authority Setup Script

```bash
#!/usr/bin/env bash
# Set strict error handling for security-critical operations
set -euo pipefail

# ============================================================
# Zero-Trust: Generate CA + Service Certificates for mTLS
# ============================================================
# This script creates a minimal PKI hierarchy suitable for
# internal service mesh mutual TLS. For production, use
# cert-manager with Kubernetes or HashiCorp Vault PKI engine.
# ============================================================

readonly CERT_DIR="${1:-./tls-certs}"
readonly CA_CN="Internal Root CA"
readonly EXPIRY_YEARS=1

mkdir -p "${CERT_DIR}/ca"
mkdir -p "${CERT_DIR}/services"

generate_ca() {
    local key_file="${CERT_DIR}/ca/ca.key"
    local cert_file="${CERT_DIR}/ca/ca.crt"

    echo "Generating Root CA..."
    openssl genrsa -out "${key_file}" 4096 2>/dev/null
    chmod 600 "${key_file}"

    openssl req -x509 -new -nodes \
        -key "${key_file}" \
        -sha256 \
        -days $((EXPIRY_YEARS * 365)) \
        -out "${cert_file}" \
        -subj "/C=US/ST=California/O=MyOrg/CN=${CA_CN}" \
        -addext "basicConstraints=critical,CA:TRUE" \
        -addext "keyUsage=critical,keyCertSign,cRLSign" 2>/dev/null

    echo "Root CA created at ${cert_file}"
}

generate_service_cert() {
    local service_name="$1"
    local sans="$2"  # Comma-separated SANs: dns:api.internal,dns:cache.internal,IP:10.0.0.5

    local key_file="${CERT_DIR}/services/${service_name}.key"
    local csr_file="${CERT_DIR}/services/${service_name}.csr"
    local cert_file="${CERT_DIR}/services/${service_name}.crt"

    echo "Generating certificate for ${service_name}..."

    # Generate service key
    openssl genrsa -out "${key_file}" 2048 2>/dev/null
    chmod 600 "${key_file}"

    # Build SAN configuration from comma-separated list
    local san_config=""
    IFS=',' read -ra parts <<< "${sans}"
    for part in "${parts[@]}"; do
        san_config+="extendedKeyUsage = serverAuth, clientAuth"$'\n'
        case "$part" in
            dns:*) san_config+="subjectAltName=DNS:${part#dns:}"$'\n' ;;
            IP:*)  san_config+="subjectAltName=IP:${part#IP:}"$'\n' ;;
        esac
    done

    # Generate CSR
    openssl req -new \
        -key "${key_file}" \
        -out "${csr_file}" \
        -subj "/C=US/ST=California/O=MyOrg/CN=${service_name}.internal" 2>/dev/null

    # Sign with CA
    openssl x509 -req \
        -in "${csr_file}" \
        -CA "${CERT_DIR}/ca/ca.crt" \
        -CAkey "${CERT_DIR}/ca/ca.key" \
        -CAcreateserial \
        -out "${cert_file}" \
        -days $((EXPIRY_YEARS * 365)) \
        -sha256 \
        -extfile <(printf "%s" "basicConstraints=CA:FALSE"$'\n'"keyUsage=digitalSignature,keyEncipherment"$'\n'"extendedKeyUsage=serverAuth,clientAuth"$'\n'"${san_config}") 2>/dev/null

    echo "Certificate for ${service_name} created at ${cert_file}"
    rm -f "${csr_file}"  # Clean up CSR — never ship CSRs to production
}

# Execute the PKI setup
generate_ca
generate_service_cert "api-gateway" "dns:api.internal,dns:api.internal.example.com,IP:10.0.1.5"
generate_service_cert "user-service" "dns:user.internal"

echo ""
echo "PKI generation complete."
echo "Copy ca.crt to all services as the trusted CA bundle."
```

#### Python mTLS Client with Certificate Verification

```python
import ssl
import socket
from typing import Optional
from pathlib import Path


def create_mtls_context(
    cert_file: str | Path,
    key_file: str | Path,
    ca_file: str | Path,
    verify_mode: bool = True,
    min_protocol_version: str = "TLSv1_3"
) -> ssl.SSLContext:
    """Create an SSL context configured for mutual TLS authentication.

    This context requires both the client and server to present certificates,
    enabling zero-trust service-to-service communication. The CA bundle is used
    to verify the peer's certificate chain.

    Args:
        cert_file: Path to the client certificate file (PEM format).
        key_file: Path to the client private key file (PEM format).
        ca_file: Path to the CA certificate bundle for verifying the server.
        verify_mode: If True, enforce full certificate chain verification.
            Set False only for development — never in production.
        min_protocol_version: Minimum TLS version. Must be TLSv1_3 in production.

    Returns:
        Configured SSLContext ready for mTLS connections.

    Raises:
        FileNotFoundError: If any certificate or key file does not exist.
        ValueError: If the minimum protocol version is insecure (below TLS 1.2).
    """
    cert_path = Path(cert_file)
    key_path = Path(key_file)
    ca_path = Path(ca_file)

    # Validate all files exist before creating context
    for path in (cert_path, key_path, ca_path):
        if not path.exists():
            raise FileNotFoundError(f"TLS certificate file not found: {path}")

    # Enforce minimum TLS version — never allow TLS 1.0 or 1.1
    protocol_map = {
        "TLSv1_2": ssl.TLSVersion.TLSv1_2,
        "TLSv1_3": ssl.TLSVersion.TLSv1_3,
    }
    min_version = protocol_map.get(min_protocol_version)
    if not min_version:
        raise ValueError(f"Unknown protocol version: {min_protocol_version}")

    # Create context with modern security settings
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.minimum_version = min_version
    context.maximum_version = ssl.TLSVersion.TLSv1_3

    # Require certificate verification in production
    if verify_mode:
        context.verify_mode = ssl.CERT_REQUIRED
        context.check_hostname = True
    else:
        context.verify_mode = ssl.CERT_OPTIONAL

    # Load client certificate and key for mTLS authentication
    context.load_cert_chain(certfile=str(cert_path), keyfile=str(key_path))

    # Trust only the specified CA — not system defaults
    context.load_verify_locations(str(ca_path))

    # Enable OCSP stapling if supported
    try:
        context.minimum_version = min_version
    except ValueError:
        pass  # Fallback to default if protocol not available in this Python build

    # Security hardening: disable weak cipher suites
    context.set_ciphers(
        "ECDHE-ECDSA-AES256-GCM-SHA384:"
        "ECDHE-RSA-AES256-GCM-SHA384:"
        "ECDHE-ECDSA-CHACHA20-POLY1305:"
        "ECDHE-RSA-CHACHA20-POLY1305:"
        "ECDHE-ECDSA-AES128-GCM-SHA256:"
        "ECDHE-RSA-AES128-GCM-SHA256"
    )

    return context


def connect_mtls(
    host: str,
    port: int,
    cert_file: str,
    key_file: str,
    ca_file: str,
    timeout: float = 10.0
) -> ssl.SSLSocket:
    """Establish a mutual TLS connection to a service.

    Performs full certificate chain verification and returns
    an authenticated SSL socket for bidirectional communication.

    Args:
        host: Target hostname or IP address.
        port: Target TCP port (typically 443 or custom mTLS port).
        cert_file: Client certificate path.
        key_file: Client private key path.
        ca_file: Trusted CA bundle path.
        timeout: Connection timeout in seconds.

    Returns:
        Verified SSL socket connected to the target service.

    Raises:
        ssl.SSLCertVerificationError: If peer certificate verification fails.
        socket.timeout: If connection times out.
    """
    context = create_mtls_context(cert_file, key_file, ca_file)

    with socket.create_connection((host, port), timeout=timeout) as sock:
        with context.wrap_socket(sock, server_hostname=host) as ssock:
            # Log certificate details for audit trail
            cert = ssock.getpeercert(binary_form=True)
            if cert:
                subject = _extract_subject_from_cert(cert)
                print(f"Connected to {host}:{port} — verified identity: {subject}")

            return ssock


def _extract_subject_from_cert(cert_binary: bytes) -> str:
    """Extract the subject CN from a DER-encoded certificate.

    Uses openssl CLI as a fallback since pure Python cert parsing
    is verbose. In production, use cryptography library for direct parsing.
    """
    import subprocess
    result = subprocess.run(
        ["openssl", "x509", "-inform", "DER", "-noout", "-subject"],
        input=cert_binary, capture_output=True
    )
    if result.returncode == 0:
        return result.stdout.decode().strip()
    return "<unknown>"
```

### Pattern 4: Policy-as-Code with Open Policy Agent (OPA) / Rego

Enforce security policies declaratively. These Rego policies prevent insecure Kubernetes deployments and enforce security standards.

#### OPA Rego Policy — Enforce Container Security Standards

```rego
# Policy: containers must not run as root, must have resource limits,
# must use read-only filesystems, and must drop ALL capabilities
package kubernetes.admission.security.containers

# Reject pods running as root user or group
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.runAsUser == 0
    msg := sprintf("Container '%v' must not run as root (runAsUser=0)", [container.name])
}

# Reject pods with privileged containers
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    container.securityContext.privileged == true
    msg := sprintf("Privileged containers are not allowed: '%v'", [container.name])
}

# Enforce resource limits on all containers
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.cpu
    msg := sprintf("Container '%v' must have CPU resource limits defined", [container.name])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.resources.limits.memory
    msg := sprintf("Container '%v' must have memory resource limits defined", [container.name])
}

# Require read-only root filesystem
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    not container.securityContext.readOnlyRootFilesystem
    msg := sprintf("Container '%v' must enable readOnlyRootFilesystem", [container.name])
}

# Require dropping ALL capabilities and adding only NET_BIND_SERVICE
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    caps := container.securityContext.capabilities.drop
    not caps[_] == "ALL"
    msg := sprintf("Container '%v' must drop ALL capabilities", [container.name])
}

# Enforce image digest pinning (not latest tag or mutable tag)
deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    image := container.image
    # Reject images using :latest or no tag at all
    endswith(image, ":latest")
    msg := sprintf("Image '%v' must use a digest pin (@sha256:...) instead of :latest", [image])
}

deny[msg] {
    input.request.kind.kind == "Pod"
    container := input.request.object.spec.containers[_]
    image := container.image
    # Images with mutable tags (no @digest) are rejected
    not contains(image, "@sha256:")
    msg := sprintf("Image '%v' must use digest-pinned format (@sha256:...) for reproducible deployments", [image])
}

# Allow the admission if no violations found
allow { true }
```

#### OPA Rego Policy — Secret Detection in Git Operations

```rego
# Policy: Prevent committing secrets, API keys, and credentials to version control.
# This policy can be integrated with pre-commit hooks or CI gates via opa eval.
package security.secrets

# List of secret patterns — extend based on your organization's risk profile
secret_patterns := {
    "aws_access_key": `AKIA[0-9A-Z]{16}`,
    "private_key": `-+BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-+`,
    "generic_secret": `[Aa][Pp][Ii]_?[Kk][Ee][Yy].*[A-Fa-f0-9]{20,}`,
    "jwt_token": `eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}`,
    "database_url": `(postgres|mysql|mongodb)://[^\s]+:[^\s]+@[^\s]+`,
}

# Deny if any tracked file contains a secret pattern
deny[msg] {
    input.review ~= "add"            # File is being added or modified
    content := input.content         # Content of the changed file
    name := key(secret_patterns, k)  # Iterate over pattern names
    regex.match(secret_patterns[name], content)
    msg := sprintf("Secret pattern '%v' detected in file: %s", [k, input.path])
}

# Deny if any diff contains a secret (for CI pipeline scanning)
deny[msg] {
    input.type == "git.diffs"
    change := input.changes[_]
    name := key(secret_patterns, k)
    regex.match(secret_patterns[name], change.new_content)
    msg := sprintf("Secret pattern '%v' found in %s:%d", [k, change.file, change.line])
}

allow { true }
```

### Pattern 5: CI/CD Security Automation Pipeline

This bash script implements a multi-stage security pipeline integrating SAST, DAST, dependency scanning, secret detection, and SBOM generation.

```bash
#!/usr/bin/env bash
# ============================================================
# CI/CD Security Pipeline — Multi-Stage Security Gates
# ============================================================
# Integrates: Semgrep (SAST), Grype (dependency vulns),
# Trivy (container scan), gitleaks (secrets), CycloneDX (SBOM)
# ============================================================

set -euo pipefail

readonly BUILD_DIR="${1:-.}"
readonly REPORT_DIR="./security-reports"
readonly FAIL_ON="critical"  # Fail pipeline on: low|medium|high|critical

mkdir -p "${REPORT_DIR}"

log() { echo "[$(date +%FT%T)] $*"; }

run_sast() {
    log "Running SAST scan with Semgrep..."
    semgrep \
        --config auto \
        --json \
        --output "${REPORT_DIR}/sast-results.json" \
        --severity ERROR,WARNING \
        --metrics off \
        "${BUILD_DIR}" 2>/dev/null || true

    # Check for critical/high findings
    local high_count
    high_count=$(python3 -c "
import json, sys
with open('${REPORT_DIR}/sast-results.json') as f:
    data = json.load(f)
print(sum(1 for r in data.get('results', []) if r.get('extra',{}).get('message','').lower() in ['critical','high']))
" 2>/dev/null || echo "0")

    if [[ "${high_count}" -gt 0 ]]; then
        log "FAIL: ${high_count} critical/high SAST findings detected"
        return 1
    fi
    log "PASS: SAST scan complete — no critical/high findings"
    return 0
}

run_dep_scanning() {
    log "Running dependency vulnerability scan with Grype..."

    # Scan the lockfile (adjust for your language ecosystem)
    if [[ -f "${BUILD_DIR}/requirements.txt" ]]; then
        grype sbom "cyclonedx-sbom.json" --fail-at "${FAIL_ON}" \
            --output json > "${REPORT_DIR}/dep-scans.json" 2>/dev/null || {
                log "FAIL: Vulnerabilities found at or above ${FAIL_ON} severity"
                return 1
        }
    elif [[ -f "${BUILD_DIR}/package-lock.json" ]]; then
        grype dir:"${BUILD_DIR}" --fail-at "${FAIL_ON}" \
            --output json > "${REPORT_DIR}/dep-scans.json" 2>/dev/null || {
                log "FAIL: Vulnerabilities found at or above ${FAIL_ON} severity"
                return 1
        }
    fi

    log "PASS: Dependency scanning complete"
    return 0
}

run_secret_detection() {
    log "Running secret detection with gitleaks..."

    # Scan the working directory for leaked secrets
    gitleaks detect \
        --source "${BUILD_DIR}" \
        --report-path "${REPORT_DIR}/secrets-results.json" \
        --report-format json \
        --log-level warn 2>/dev/null || true

    local secret_count
    secret_count=$(python3 -c "
import json
with open('${REPORT_DIR}/secrets-results.json') as f:
    data = json.load(f)
print(len(data.get('violations', [])))
" 2>/dev/null || echo "0")

    if [[ "${secret_count}" -gt 0 ]]; then
        log "FAIL: ${secret_count} potential secrets detected"
        return 1
    fi
    log "PASS: Secret detection complete — no leaks found"
    return 0
}

generate_sbom() {
    log "Generating CycloneDX SBOM..."

    # Use cyclonedx-npm, cyclonedx-py, or similar per ecosystem
    if [[ -f "${BUILD_DIR}/package.json" ]]; then
        cyclonedx-npm --output-file "${REPORT_DIR}/sbom-cyclonedx.json" \
            --output-format json 2>/dev/null || log "WARN: SBOM generation skipped (no cyclonedx-npm)"
    elif [[ -f "${BUILD_DIR}/requirements.txt" ]]; then
        cyclonedx-py requirements "${BUILD_DIR}/requirements.txt" \
            --output "${REPORT_DIR}/sbom-cyclonedx.json" 2>/dev/null || log "WARN: SBOM generation skipped (no cyclonedx-py)"
    fi

    if [[ -f "${REPORT_DIR}/sbom-cyclonedx.json" ]]; then
        log "PASS: SBOM generated at ${REPORT_DIR}/sbom-cyclonedx.json"
    else
        log "WARN: SBOM generation not available for this project type"
    fi
    return 0
}

run_sca_policy_check() {
    log "Running policy-as-code checks with OPA..."

    # Run Rego policies against the current state
    if [[ -f "policy/kubernetes/rego/security.rego" ]]; then
        opa eval \
            --data "policy/kubernetes/rego/" \
            --input <(echo '{"request":{"kind":{"kind":"Pod"},"object":{}}}') \
            "data.kubernetes.admission.security.containers.deny" 2>/dev/null || true
    fi

    log "PASS: Policy check complete"
    return 0
}

# ============================================================
# Pipeline Execution
# ============================================================
log "========================================="
log "Starting Security Pipeline"
log "========================================="

FAILED_STAGES=()

run_sast           || FAILED_STAGES+=("SAST")
run_dep_scanning   || FAILED_STAGES+=("Dependency Scan")
run_secret_detection || FAILED_STAGES+=("Secret Detection")
generate_sbom      # SBOM is advisory — does not block pipeline
run_sca_policy_check || FAILED_STAGES+=("Policy Check")

if [[ ${#FAILED_STAGES[@]} -gt 0 ]]; then
    log "========================================="
    log "SECURITY PIPELINE FAILED"
    log "Failed stages: ${FAILED_STAGES[*]}"
    log "Review reports in: ${REPORT_DIR}/"
    log "========================================="
    exit 1
fi

log "========================================="
log "SECURITY PIPELINE PASSED — All gates clear"
log "Reports available at: ${REPORT_DIR}/"
log "========================================="
exit 0
```

### Pattern 6: HashiCorp Vault Integration for Secret Management

Application-level secret retrieval using the HashiCorp Vault API with automatic token renewal.

```python
import time
import logging
from typing import Optional
from dataclasses import dataclass, field

try:
    import hvac
except ImportError:
    raise ImportError(
        "Install vault client: pip install hvac"
    )


logger = logging.getLogger(__name__)


@dataclass
class VaultConfig:
    """Configuration for HashiCorp Vault integration."""
    address: str = "https://vault.example.com:8200"
    namespace: Optional[str] = None
    role_id: Optional[str] = None          # AppRole authentication
    secret_id: Optional[str] = None        # AppRole authentication (or use k8s auth)
    k8s_role: Optional[str] = None         # Kubernetes service account authentication
    k8s_token_path: str = "/var/run/secrets/kubernetes.io/serviceaccount/token"
    mount_point: str = "secret"            # KV secrets engine path
    ca_cert: Optional[str] = None          # CA bundle for mTLS to Vault
    token_ttl: int = 3600                  # Token time-to-live in seconds
    renewal_buffer: int = 600              # Renew token N seconds before expiry


class SecretManager:
    """Secure secret management using HashiCorp Vault.

    All secrets are fetched from Vault at runtime — never cached in source code,
    environment variables, or config files. Supports AppRole and Kubernetes service
    account authentication methods. Implements automatic token renewal to prevent
    mid-request auth failures.

    Usage:
        manager = SecretManager.from_k8s()
        db_password = manager.get_secret("database/production", "password")
    """

    def __init__(self, config: VaultConfig, client: Optional[hvac.Client] = None):
        self.config = config
        self._client = client or hvac.Client(url=config.address)
        self._token_expires_at: float = 0

    @classmethod
    def from_approle(
        cls,
        vault_address: str,
        role_id: str,
        secret_id: str,
        mount_point: str = "approle",
        **kwargs
    ) -> "SecretManager":
        """Authenticate using Vault AppRole method.

        Best for CI/CD pipelines and batch processes.
        """
        config = VaultConfig(address=vault_address, **kwargs)
        client = hvac.Client(url=config.address)
        client.auth.approle.login(
            role_id=role_id,
            secret_id=secret_id,
            use_token=True,
            mount_point=mount_point,
        )
        return cls(config, client)

    @classmethod
    def from_k8s(
        cls,
        vault_address: str = "https://vault.example.com:8200",
        k8s_role: str = "app-role",
        mount_point: str = "kubernetes",
        **kwargs
    ) -> "SecretManager":
        """Authenticate using Kubernetes service account JWT.

        Best for workloads running inside Kubernetes clusters.
        """
        with open(kwargs.get("k8s_token_path", "/var/run/secrets/kubernetes.io/serviceaccount/token")) as f:
            k8s_jwt = f.read().strip()

        config = VaultConfig(address=vault_address, **kwargs)
        client = hvac.Client(url=config.address)
        client.auth.kubernetes.login(
            role=k8s_role,
            jwt=k8s_jwt,
            mount_point=mount_point,
        )
        return cls(config, client)

    def _ensure_token_valid(self) -> None:
        """Renew the Vault token if it's approaching expiration."""
        if time.time() < self._token_expires_at - self.config.renewal_buffer:
            return  # Token still valid for longer than buffer period

        try:
            self._client.secrets.sys.renew_self_token(
                increment=f"{self.config.token_ttl}s"
            )
            renewal_info = self._client.secrets.sys.read_renewal(
                self._client.token
            )
            if renewal_info and "lease_expiration_time" in renewal_info["data"]:
                self._token_expires_at = renewal_info["data"]["lease_expiration_time"]
            logger.debug("Vault token renewed, expires at %s", self._token_expires_at)
        except Exception as e:
            logger.warning("Token renewal failed: %s — proceeding with existing token", e)

    def get_secret(
        self,
        path: str,
        field_name: Optional[str] = None,
        version: Optional[int] = None
    ) -> dict[str, str] | str | None:
        """Retrieve a secret from Vault's KV secrets engine.

        Automatically handles token renewal before each read to prevent
        auth failures during long-running operations.

        Args:
            path: The secret path in Vault (e.g., "database/production").
            field_name: If set, return only this specific field value.
                If None, return the full secret dict.
            version: Specific secret version to retrieve. None = latest.

        Returns:
            Secret data as a dict, or a single field value if field_name is set.
            Returns None if no secret exists at the path.

        Raises:
            hvac.exceptions.InvalidPath: If the secret path does not exist.
            hvac.exceptions.Forbidden: If the Vault token lacks permissions.
        """
        self._ensure_token_valid()

        client = self._client.secrets.kv.v2
        read_kwargs = {"path": path, "mount_point": self.config.mount_point}
        if version is not None:
            read_kwargs["version"] = version

        try:
            response = client.read_secrets(**read_kwargs)
        except Exception as e:
            logger.error("Failed to read secret at %s: %s", path, e)
            raise

        data = response.get("data", {})
        secret_data = data.get("data", {})

        if not secret_data:
            return None

        if field_name:
            return secret_data.get(field_name)

        return secret_data

    def get_dynamic_credentials(
        self,
        path: str,
    ) -> dict[str, str]:
        """Read dynamic credentials (e.g., database roles that generate on-demand creds).

        Dynamic credentials are short-lived and automatically revoked. Use this
        instead of static long-lived secrets for database connections.

        Args:
            path: The mount point where the dynamic secrets engine is configured
                (e.g., "database/roles/myapp-db").

        Returns:
            Dictionary containing username, password, connection URI, and TTL.
        """
        self._ensure_token_valid()
        response = self._client.read(path)
        return {
            "username": response["data"]["username"],
            "password": response["data"]["password"],
            "host": response["data"].get("host", ""),
            "port": str(response["data"].get("port", "")),
            "db_name": response["data"].get("db_name", ""),
            "lease_id": response["data"].get("lease_id", ""),
            "ttl": response["data"].get("lease_duration", 3600),
        }

    def revoke_secret(self, lease_id: str) -> None:
        """Explicitly revoke a dynamic secret lease.

        Call this when the application shuts down to immediately release
        dynamically-generated credentials rather than waiting for TTL expiry.

        Args:
            lease_id: The lease ID returned from get_dynamic_credentials.
        """
        try:
            self._client.secrets.sys.revoke(lease_id)
            logger.info("Revoked secret lease: %s", lease_id)
        except Exception as e:
            logger.warning("Failed to revoke lease %s: %s", lease_id, e)
```

---

## Constraints

### MUST DO

- Run STRIDE threat modeling on every new service or major feature before implementation begins
- Parameterize all database queries — never use string formatting or concatenation for SQL
- Encode all output rendered to browsers (context-appropriate: HTML, JavaScript, URL, CSS)
- Enforce mTLS for all service-to-service communication in production environments
- Store secrets exclusively in HashiCorp Vault with short-lived dynamic credentials where possible
- Generate SBOM on every build and scan with vulnerability databases updated within 24 hours
- Integrate SAST, DAST, and secret scanning into CI — block merges with critical findings
- Apply policy-as-code (OPA/Gatekeeper) to enforce security requirements on Kubernetes deployments
- Log all authentication failures, authorization denials, and access anomalies for SIEM ingestion
- Use TLS 1.3 minimum for all external communications; enforce certificate chain validation
- Implement rate limiting on all public-facing endpoints and authentication endpoints
- Validate JWT tokens using RS256/ES256 with JWKS endpoint rotation — never trust HS256 with a static secret in multi-service systems

### MUST NOT DO

- Hardcode API keys, passwords, certificates, or private keys in source code or configuration files
- Use `shell=True` in subprocess calls with user-controlled input strings
- Trust client-side validation alone — all business logic security checks must exist server-side
- Disable certificate verification to "fix" SSL errors — investigate and resolve the root cause instead
- Use default credentials, weak cipher suites (RC4, DES, 3DES), or MD5/SHA1 for hashing passwords
- Allow unauthenticated admin endpoints or APIs with privileged operations accessible without authentication
- Store session tokens in localStorage on the frontend — use HttpOnly, Secure, SameSite=Strict cookies instead
- Run containers as root or with `privileged: true` security context in Kubernetes
- Expose internal metrics, health checks, or debug endpoints to unauthenticated access
- Use `latest` tags for container images in production — always pin to specific digests
- Bypass CI security gates manually — every merge must pass the automated security pipeline

---

## Output Template

When applying this skill, produce output following this structure:

1. **Threat Model Summary** — Components analyzed, STRIDE categories identified, top risks by DREAD score
2. **Vulnerability Remediation Plan** — OWASP Top 10 findings with secure code replacements and risk ratings
3. **Zero-Trust Configuration** — mTLS certificate chain details, identity provider configuration, access policy matrix
4. **Security Pipeline Report** — SAST/DAST/SCA scan results, SBOM summary, secret detection findings with remediation steps
5. **Secrets Management Assessment** — Current secret locations, Vault migration plan, dynamic credential recommendations
6. **Policy Enforcement Summary** — OPA/Gatekeeper policy status, violations found, and corrective actions

Each section should include concrete code snippets, configuration files, or shell commands as evidence of the recommendation.

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `coding-security-review` | Focused code review for security vulnerabilities — complements this skill's broader SDLC coverage |
| `cncf-open-telemetry` | Observability instrumentation for security monitoring, audit logging, and incident detection |
| `coding-software-delivery-pipelines` | CI/CD pipeline design — integrates the security gates defined in this skill |
| `coding-dependency-supply-chain-security` | Deep supply chain security — SBOM formats, SLSA provenance, package signing with Sigstore |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [OWASP Application Security Verification Standard v4.0.3](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Top 10 Web Application Security Risks (2021)](https://owasp.org/Top10/)
- [NIST Secure Software Development Framework (SP 800-218)](https://csrc.nist.gov/pubs/sp/800-218/final)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [HashiCorp Vault Documentation](https://developer.hashicorp.com/vault/docs)
- [Open Policy Agent (OPA) / Rego Documentation](https://www.openpolicyagent.org/docs/latest/policy-language/)
- [Microsoft STRIDE Threat Modeling Methodology](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threat-taxonomy)
