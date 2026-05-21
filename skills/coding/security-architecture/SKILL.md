---
name: security-architecture
description: Designs secure system architecture with threat modeling (STRIDE), defense-in-depth layers, zero-trust principles, and authentication patterns for production systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: security architecture, threat modeling, STRIDE, defense in depth, zero trust, authentication architecture, authorization design, how do i secure a system
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-api-security-patterns, coding-code-review, coding-dependency-supply-chain-security
---

# Security Architecture Patterns

Designs secure system architecture by applying threat modeling (STRIDE methodology), defense-in-depth layering, zero-trust principles, and robust authentication/authorization patterns. When loaded, the model acts as a senior security architect — analyzing system boundaries, identifying threats, and producing concrete architectural safeguards aligned with OWASP standards.

## TL;DR Checklist

- [ ] Run STRIDE analysis on every external data boundary before implementation
- [ ] Define at least three defense layers (network, application, data) for critical systems
- [ ] Treat every request as untrusted — implement zero-trust validation at each layer
- [ ] Separate authentication from authorization concerns with distinct middleware components
- [ ] Apply input validation at the API boundary; never trust downstream consumers
- [ ] Ensure secrets are injected via environment variables, not hardcoded or committed
- [ ] Add structured security audit logging for every authN/authZ decision

---

## When to Use

Use this skill when:

- Designing a new system or service where security architecture is a first-class concern
- Conducting a threat modeling exercise using STRIDE on an existing application's data flows
- Migrating a monolithic application to microservices with zero-trust networking requirements
- Implementing authentication and authorization from scratch (OAuth 2.0, JWT, mTLS)
- Reviewing an existing architecture for defense-in-depth gaps or over-permissive access
- Building API gateways, service meshes, or middleware that mediate all inter-service traffic

---

## When NOT to Use

Avoid this skill for:

- Fixing a specific runtime bug or application error — use `coding-code-review` instead
- Managing cloud provider IAM policies at the infrastructure level — use `linux-security` for host-level hardening
- Performing a code-level vulnerability scan on a single file — use `coding-api-security-patterns` for API-specific checks
- Writing frontend UI/UX features where security is not the primary concern

---

## Core Workflow

1. **Map System Boundaries and Trust Zones** — Identify all external-facing endpoints, data stores, third-party integrations, and internal service-to-service communication paths. Draw a simple boundary diagram listing trust assumptions for each segment.
   **Checkpoint:** Every arrow between components must have an explicit trust label (trusted, semi-trusted, untrusted).

2. **Conduct STRIDE Threat Modeling** — For each data flow identified in Step 1, evaluate all six STRIDE categories: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege. Document the top two threats per flow with a likelihood rating (High/Medium/Low).
   **Checkpoint:** Every external data boundary must have at least three STRIDE threat entries; flows with no threats are likely missing boundaries.

3. **Define Defense Layers** — Map mitigations to the OWASP Defense-in-Depth model: Network layer (firewalls, rate limiting), Application layer (input validation, auth middleware), Data layer (encryption, access controls). Each layer must have at least one independent control that can fail without collapsing the entire system.
   **Checkpoint:** No single layer provides complete protection; verify redundancy by removing each layer mentally and confirming remaining layers catch at least one threat.

4. **Design Authentication and Authorization Architecture** — Choose authN mechanism (JWT, session-based, OAuth 2.0 flows, mTLS) and authZ model (RBAC, ABAC, or capability-based). Implement as separate middleware components — never mix identity verification with permission checks in the same handler.
   **Checkpoint:** The authZ layer must accept an authenticated principal as input; if a request can reach authorization without authentication, the design is flawed.

5. **Implement Security Middleware Chain** — Build a layered middleware sequence: rate-limiting → input validation → authentication → authorization → audit logging. Each middleware must short-circuit on failure and return early without executing subsequent layers.
   **Checkpoint:** Every middleware must have explicit unit tests verifying it blocks at least one attack vector independently.

6. **Validate with Attack Scenarios** — Write three adversarial test cases per critical data flow: valid request (should pass), spoofed identity (should be rejected), and privilege escalation attempt (should fail). Run all against the implemented middleware chain.
   **Checkpoint:** Every STRIDE threat from Step 2 must have at least one corresponding attack scenario in Step 6 that validates its mitigation.

---

## Implementation Patterns / Reference Guide

### Pattern 1: STRIDE Threat Model Analysis

STRIDE categorizes threats by their adversarial goal. For each data store or data flow in your architecture, evaluate all six categories. This is the foundational analysis that drives every subsequent security decision.

```python
from enum import Enum
from dataclasses import dataclass, field


class ThreatCategory(Enum):
    SPOOFING = "Spoofing"
    TAMPERING = "Tampering"
    REPUDIATION = "Repudiation"
    INFO_DISCLOSURE = "Information Disclosure"
    DOS = "Denial of Service"
    ELEVATION_OF_PRIVILEGE = "Elevation of Privilege"


class Likelihood(Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


@dataclass
class STRIDEThreat:
    category: ThreatCategory
    description: str
    likelihood: Likelihood
    mitigation: str

    def severity_score(self) -> int:
        """Return numeric severity for prioritization. HIGH=3, MEDIUM=2, LOW=1."""
        return {"High": 3, "Medium": 2, "Low": 1}[self.likelihood.value]


@dataclass
class ThreatModel:
    """STRIDE threat model for a single data flow between two components."""
    source: str
    destination: str
    data_type: str
    trust_level: str
    threats: list[STRIDEThreat] = field(default_factory=list)

    def add_threat(self, category: ThreatCategory, description: str,
                   likelihood: Likelihood, mitigation: str) -> None:
        """Add a STRIDE threat and auto-sort by severity."""
        self.threats.append(STRIDEThreat(category, description, likelihood, mitigation))
        self.threats.sort(key=lambda t: t.severity_score(), reverse=True)

    def high_severity_count(self) -> int:
        """Count threats rated HIGH severity for risk dashboarding."""
        return sum(1 for t in self.threats if t.likelihood == Likelihood.HIGH)


# Usage example:
model = ThreatModel("API Gateway", "User Service", "JWT tokens", "semi-trusted")
model.add_threat(
    ThreatCategory.SPOOFING,
    "Attacker forges JWT without valid signature",
    Likelihood.HIGH,
    "Validate JWT signature with public key; reject unsigned tokens"
)
model.add_threat(
    ThreatCategory.INFO_DISCLOSURE,
    "JWT payload contains sensitive claims visible in transit",
    Likelihood.MEDIUM,
    "Encrypt token with JWE; never send tokens over unencrypted channels"
)
print(f"High severity threats: {model.high_severity_count()}")
```

### Pattern 2: Defense-in-Depth Middleware Chain (BAD vs. GOOD)

A defense-in-depth architecture requires independent security layers that each provide meaningful protection even if other layers fail. The key principle is **fail-open isolation** — a failed middleware layer must deny the request, not pass it through.

```python
# ❌ BAD: Single monolithic security handler — one bypass breaks all protections
def monolithic_security_handler(request):
    # All checks crammed into one function with no separation of concerns
    if not validate_input(request.body):  # validation
        return deny()
    token = request.headers.get("Authorization")
    if not verify_jwt(token):  # authentication mixed with validation
        return deny()
    user = decode_jwt(token)
    if user.role != "admin":  # authorization mixed with everything else
        return deny()
    # No audit logging — cannot trace who did what
    return execute(request.body)

# ✅ GOOD: Separate middleware layers with short-circuit fail-fast design
from functools import wraps
import logging

logger = logging.getLogger("security.middleware")


def rate_limit_middleware(max_requests: int = 100, window_seconds: int = 60):
    """Rate limiting layer — rejects excess requests before they reach auth."""
    request_counts: dict[str, list[float]] = {}

    @wraps(middleware)
    def middleware(request):
        client_ip = request.client.host
        now = request.timestamp
        # Clean old entries outside the window
        request_counts.setdefault(client_ip, [])
        request_counts[client_ip] = [
            t for t in request_counts[client_ip]
            if now - t < window_seconds
        ]
        if len(request_counts[client_ip]) >= max_requests:
            logger.warning(f"Rate limit exceeded for {client_ip}")
            return {"status": 429, "body": "Too many requests"}
        request_counts[client_ip].append(now)
        return None  # Pass through — no rejection

    return middleware


def input_validation_middleware(schemas: dict[str, dict]):
    """Input validation layer — rejects malformed or dangerous payloads."""
    def middleware(request):
        if "json" in request.headers.get("Content-Type", ""):
            for field_name, schema in schemas.items():
                value = request.body.get(field_name)
                if not _validate_field(value, schema):
                    logger.warning(f"Invalid input for {field_name}")
                    return {"status": 400, "body": f"Invalid {field_name}"}
        return None

    return middleware


def auth_middleware(jwt_secret: str):
    """Authentication layer — verifies identity, returns principal or denial."""
    def middleware(request):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning("Missing or malformed Authorization header")
            return {"status": 401, "body": "Authentication required"}
        token = auth_header[7:]
        try:
            principal = _verify_jwt(token, jwt_secret)
            request.principal = principal  # Inject into request context
            return None  # Pass through with authenticated identity
        except Exception:
            logger.warning("JWT verification failed")
            return {"status": 401, "body": "Invalid token"}

    return middleware


# Execution order: rate limit → validate → auth → (then route to handler)
# Each layer returns a rejection dict on failure or None to pass through.
```

### Pattern 3: Zero-Trust Network Middleware

Zero-trust architecture treats every request as untrusted, regardless of its origin. Implement this via mandatory authentication at every hop, mutual TLS for service-to-service communication, and least-privilege authorization per request context.

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class ZeroTrustRequest:
    """Represents a zero-trust validated request with full provenance."""
    client_cert_fingerprint: str  # mTLS peer certificate hash
    service_identity: str         # Authenticated source service identity
    requested_resource: str       # Target resource being accessed
    action: str                   # Intended operation (read/write/delete)
    claims: dict[str, object]     # JWT/OAuth2 claims payload
    trace_id: str                 # Distributed tracing identifier


class ZeroTrustAuthorizer:
    """Implements zero-trust authorization using attribute-based access control."""

    def __init__(self, policy_db: dict):
        self.policy_db = policy_db  # {resource_pattern: {action: [allowed_services]}}

    def evaluate(self, req: ZeroTrustRequest) -> bool:
        """Evaluate whether the request satisfies zero-trust policy.
        
        Returns True only if ALL of the following pass:
        1. Service identity is authenticated via mTLS
        2. The requested resource matches an allowed pattern
        3. The action is permitted for this service identity
        4. No broader role grants are assumed — check exact claim values
        """
        # Step 1: Verify service identity exists in policy
        for pattern, actions in self.policy_db.items():
            if not self._matches_pattern(req.requested_resource, pattern):
                continue
            allowed_services = actions.get(req.action, [])
            return req.service_identity in allowed_services

        # No matching policy found — deny by default (zero-trust principle)
        return False

    def _matches_pattern(self, resource: str, pattern: str) -> bool:
        """Simple wildcard pattern matcher for resource paths."""
        import fnmatch
        return fnmatch.fnmatch(resource.lower(), pattern.lower())


# Example policy configuration:
POLICY_DB = {
    "api/*/users/*": {"read": ["user-service", "admin-service"],
                      "write": ["admin-service"]},
    "api/*/orders/*": {"read": ["order-service", "user-service"],
                       "write": ["order-service"]},
}

authorizer = ZeroTrustAuthorizer(POLICY_DB)
req = ZeroTrustRequest(
    client_cert_fingerprint="sha256:abc123...",
    service_identity="admin-service",
    requested_resource="api/v1/users/42",
    action="read",
    claims={"sub": "admin-svc", "scope": "admin"},
    trace_id="trace-001"
)
assert authorizer.evaluate(req) is True  # admin-service can read users
```

---

## Constraints

### MUST DO
- Run STRIDE threat modeling on every external data boundary before writing implementation code
- Design at least three independent defense layers (network, application, data) for any system handling sensitive data
- Separate authentication middleware from authorization middleware — never merge them into a single handler
- Validate and sanitize all inputs at the API boundary; treat downstream components as potentially compromised
- Log every authentication and authorization decision with trace ID, principal identity, resource, and outcome
- Inject secrets via environment variables or a secrets manager — never hardcode credentials in source code
- Use parameterized queries or ORM methods exclusively to prevent injection attacks (per OWASP)
- Implement short-circuit middleware: each layer must return early on failure without executing subsequent layers

### MUST NOT DO
- Trust requests based solely on their network origin (e.g., internal IPs) — zero-trust applies everywhere
- Store passwords in plaintext or use reversible encryption — always use bcrypt, scrypt, or argon2 for hashing
- Implement custom cryptographic algorithms — rely on well-vetted libraries like libsodium or the standard library
- Skip audit logging of authentication failures — these are high-value attack surface signals
- Grant admin or elevated privileges through implicit trust (e.g., session cookies without server-side validation)
- Place authorization logic inside individual route handlers — always use centralized middleware
- Use JWT access tokens as long-lived credentials without refresh token rotation
- Expose stack traces or internal error details in production responses

---

## Output Template

When implementing or reviewing security architecture, produce:

1. **STRIDE Threat Assessment** — Table listing each data flow with threat categories evaluated and severity scores
2. **Defense Layer Map** — Diagram showing network, application, and data layers with independent controls per layer
3. **Authentication Architecture** — Chosen mechanism (JWT/session/OAuth/mTLS), token lifecycle, and refresh strategy
4. **Authorization Design** — RBAC/ABAC/capability model with policy table showing resource-action-principal mappings
5. **Middleware Chain Specification** — Ordered list of middleware components with rejection behavior for each
6. **Attack Scenario Validation** — Three adversarial test cases per critical flow confirming threat mitigation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-api-security-patterns` | API-specific security patterns (auth headers, rate limiting, CORS) that complement this architecture-level skill |
| `coding-code-review` | Code review processes for spotting security anti-patterns in implementation code |
| `coding-dependency-supply-chain-security` | Third-party dependency auditing and SBOM management to prevent supply chain attacks |

---

## Live References

> Authoritative documentation links for security architecture standards and frameworks.

- [OWASP Top 10 Web Application Security Risks](https://owasp.org/Top10/)
- [NIST Cybersecurity Framework (CSF) v2.0](https://www.nist.gov/cyberframework)
- [Microsoft STRIDE Threat Modeling Methodology](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threat-taxonomy)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Zero Trust Architecture (NIST SP 800-207)](https://csrc.nist.gov/publications/detail/sp/800-207/final)
