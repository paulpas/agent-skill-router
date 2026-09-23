---
name: mcp-security-authorization
description: Implements MCP security best practices including OAuth 2.1 PKCE, resource indicators, token management, tool poisoning prevention, secret management, attestation, audit logging, and defense-in-depth strategies against OWASP MCP Top 10 risks (token mismanagement, tool rug pulls, unverified inputs, supply chain attacks).
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: security
  role: implementation
  scope: orchestration
  output-format: code
  triggers: mcp security, oauth 2.1, tool poisoning, mcp token management, secret management, mcp authentication, how do i secure mcp, authorization
  related-skills: ai-llm-agentic-tooling-mcp, identity-security-hashicorp-vault
  archetypes: tactical, enforcement
  anti_triggers: brainstorming, vague ideation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# MCP Security Authorization

Implements comprehensive security controls for Model Context Protocol (MCP) implementations, protecting against token mismanagement, tool poisoning, supply chain attacks, and unauthorized resource access.

## TL;DR Checklist

- [ ] Use OAuth 2.1 PKCE for all token flows (never implicit grant)
- [ ] Implement resource indicators to prevent token confusion attacks
- [ ] Require tool allowlisting — deny unknown tools by default
- [ ] Store secrets in external vault (Vault, AWS Secrets Manager) — never in env vars
- [ ] Pin tool hashes and verify signatures on every invocation
- [ ] Log all authentication, authorization, and tool execution events
- [ ] Implement token scoping and short lifetimes (15 min max for access tokens)
- [ ] Add consent gates for sensitive operations (secrets, resource access)

---

## When to Use

Use this skill when:

- Implementing security controls for MCP servers or clients
- Designing authentication flows for multi-tenant MCP deployments
- Protecting against tool poisoning, token mismanagement, or supply chain attacks
- Integrating MCP with corporate secret management systems
- Building compliance-aware MCP implementations (GDPR, FedRAMP, SOC2)
- Auditing existing MCP deployments for security gaps

---

## When NOT to Use

Avoid this skill for:

- Basic MCP "hello world" examples (security overhead not justified)
- Internal dev-environment-only MCP usage (toy implementations)
- When MCP is used entirely within a single process (no network boundary)
- Situations where speed is the only priority (apply after launch, not before)

---

## OWASP MCP Top 10 Overview

The Model Context Protocol introduces unique attack surfaces. Real incidents:

1. **Token Mismanagement** — 34% of breaches involve leaked or exposed tokens (Verizon 2024 DBIR)
2. **Tool Poisoning** — Attackers register malicious tools mimicking legitimate ones
3. **Unverified Inputs** — Tool parameters not validated; injection attacks succeed
4. **Supply Chain Attacks** — Compromised tool dependencies execute with full system access
5. **Resource Confusion** — Single token grants access to unintended resources
6. **Consent Bypass** — Users not informed of sensitive operations (data access, API calls)
7. **Audit Gaps** — No logging of tool execution or authentication decisions
8. **Privilege Escalation** — Low-privilege tokens unexpectedly grant high-privilege actions
9. **Secret Exposure** — Credentials passed through tool parameters or logs
10. **Rate Limit Bypass** — No throttling on token issuance or tool calls

---

## OAuth 2.1 PKCE Implementation for MCP

OAuth 2.1 removes the implicit grant and weak flows. PKCE (Proof Key for Code Exchange) is now mandatory for all public clients and recommended for all clients.

### Resource Indicators (RFC 8707)

Resource indicators prevent "confused deputy" attacks where a token intended for Service A is used against Service B.

**Without Resource Indicators:**
```
Token granted for: https://api.trading-platform.com
Attacker uses token for: https://api.internal-secrets.com
Result: Data breach (same token, different resource)
```

**With Resource Indicators:**
```
Token granted for: https://api.trading-platform.com + resource=trading-data
Attacker tries to use for: https://api.internal-secrets.com + resource=secrets
Result: Authorization denied (resource mismatch)
```

### Token Issuance Flow

```python
# MCP Server - Token Endpoint
# This implements OAuth 2.1 PKCE with resource indicators

import secrets
import hashlib
import base64
from typing import NamedTuple
from datetime import datetime, timedelta
import json

class TokenRequest(NamedTuple):
    code: str
    code_verifier: str  # PKCE: unencoded challenge value
    client_id: str
    client_secret: str  # Only for confidential clients
    resource: str  # RFC 8707: target resource URI
    grant_type: str  # Should be 'authorization_code'

class AccessToken(NamedTuple):
    token: str
    expires_in: int  # seconds
    token_type: str  # "Bearer"
    resource: str  # Issued for this resource only
    scope: str  # space-separated scopes
    issued_at: int  # unix timestamp

class TokenManager:
    """Secure token issuance with PKCE and resource indicators."""
    
    def __init__(self, vault_client):
        self.vault_client = vault_client  # Secret manager
        self.token_ttl = 900  # 15 minutes
        self.code_ttl = 300  # 5 minutes
        self.auth_codes = {}  # {code: {verifier, resource, client_id, expires}}
    
    def create_authorization_code(
        self, 
        client_id: str, 
        code_challenge: str,  # SHA256(code_verifier), base64url encoded
        resource: str,
        scope: str
    ) -> str:
        """Generate authorization code with PKCE challenge."""
        auth_code = secrets.token_urlsafe(32)
        self.auth_codes[auth_code] = {
            "code_challenge": code_challenge,
            "client_id": client_id,
            "resource": resource,
            "scope": scope,
            "expires": datetime.utcnow() + timedelta(seconds=self.code_ttl),
            "used": False
        }
        return auth_code
    
    def exchange_code_for_token(self, request: TokenRequest) -> AccessToken:
        """Exchange authorization code for access token (PKCE verification)."""
        
        # Guard clause: Validate code exists and not expired
        if request.code not in self.auth_codes:
            raise ValueError("Invalid authorization code")
        
        auth_record = self.auth_codes[request.code]
        if datetime.utcnow() > auth_record["expires"]:
            raise ValueError("Authorization code expired")
        
        if auth_record["used"]:
            raise ValueError("Authorization code already used (replay attack)")
        
        # Guard clause: PKCE verification (proof of original client)
        code_challenge_computed = base64.urlsafe_b64encode(
            hashlib.sha256(request.code_verifier.encode()).digest()
        ).decode().rstrip("=")
        
        if code_challenge_computed != auth_record["code_challenge"]:
            raise ValueError("PKCE verification failed")
        
        # Guard clause: Resource indicator must match
        if request.resource != auth_record["resource"]:
            raise ValueError(f"Resource mismatch: issued for {auth_record['resource']}, requested {request.resource}")
        
        # Guard clause: Client validation
        if request.client_id != auth_record["client_id"]:
            raise ValueError("Client ID mismatch")
        
        # Mark as used (prevent replay)
        auth_record["used"] = True
        
        # Token generation with resource binding
        token_payload = {
            "client_id": request.client_id,
            "resource": request.resource,
            "scope": auth_record["scope"],
            "iat": int(datetime.utcnow().timestamp()),
            "exp": int((datetime.utcnow() + timedelta(seconds=self.token_ttl)).timestamp())
        }
        
        # Encrypt and sign token (using external vault for security)
        token = self.vault_client.encrypt_jwt(token_payload)
        
        return AccessToken(
            token=token,
            expires_in=self.token_ttl,
            token_type="Bearer",
            resource=request.resource,
            scope=auth_record["scope"],
            issued_at=int(datetime.utcnow().timestamp())
        )
    
    def verify_token(self, token: str, resource: str) -> dict:
        """Verify token validity and resource binding."""
        
        # Guard clause: Decrypt and validate signature
        try:
            payload = self.vault_client.decrypt_jwt(token)
        except Exception as e:
            raise ValueError("Invalid token signature") from e
        
        # Guard clause: Check expiration
        if payload["exp"] < datetime.utcnow().timestamp():
            raise ValueError("Token expired")
        
        # Guard clause: Verify resource indicator matches request
        if payload["resource"] != resource:
            raise ValueError(
                f"Token resource mismatch: token for {payload['resource']}, "
                f"accessing {resource}"
            )
        
        return payload
```

---

## Token Lifecycle Management

### Token Scoping

Tokens should grant **minimum necessary permissions**. Use scope parameter to limit access:

```python
# Scope examples
"mcp:tools:read"              # Read tool definitions
"mcp:tools:execute"           # Execute specific tools
"mcp:secrets:read"            # Access secrets
"mcp:logs:write"              # Write audit logs
"mcp:resources:trading-api"   # Access trading API resource only
"mcp:resources:secrets-vault" # Access vault resource only

# Multi-resource token
scope = "mcp:tools:read mcp:tools:execute:analytics mcp:resources:trading-api"
```

### Token Revocation

Implement immediate revocation for compromised tokens:

```python
class TokenRevocationList:
    """Maintain revoked tokens (Redis-backed for performance)."""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.revocation_ttl = 3600 * 24  # 24 hours
    
    def revoke_token(self, token_jti: str) -> None:
        """Add token to revocation list."""
        key = f"revoked_token:{token_jti}"
        self.redis.setex(key, self.revocation_ttl, "true")
    
    def is_revoked(self, token_jti: str) -> bool:
        """Check if token is revoked."""
        return self.redis.exists(f"revoked_token:{token_jti}") == 1
    
    def revoke_all_for_client(self, client_id: str) -> None:
        """Revoke all tokens issued to a client (after breach)."""
        pattern = f"token_jti:client:{client_id}:*"
        for jti in self.redis.keys(pattern):
            self.redis.setex(f"revoked_token:{jti}", self.revocation_ttl, "true")
```

---

## Secret Management Patterns

### ❌ BAD: Secrets in Environment Variables

```python
# FORBIDDEN: Secrets exposed in environment
import os

API_KEY = os.getenv("TRADING_API_KEY")
DATABASE_PASSWORD = os.getenv("DB_PASSWORD")

# Problems:
# - Visible in process listing (ps aux)
# - Logged in deployment configs
# - Accessible to any code in the process
# - No rotation capability
# - No audit trail
```

### ✅ GOOD: Secrets in HashiCorp Vault

```python
import hvac
from typing import Dict

class VaultSecretManager:
    """Secure secret retrieval from HashiCorp Vault."""
    
    def __init__(self, vault_url: str, role_id: str, secret_id: str):
        self.client = hvac.Client(url=vault_url)
        # Use AppRole auth (not token auth)
        self.client.auth.approle.login(role_id=role_id, secret_id=secret_id)
        self.secret_cache = {}
        self.cache_ttl = 300  # 5 minutes
    
    def get_secret(self, path: str) -> Dict[str, str]:
        """Retrieve secret from Vault with caching."""
        
        # Guard clause: Validate path (prevent path traversal)
        if ".." in path or path.startswith("/"):
            raise ValueError("Invalid secret path")
        
        cache_key = f"secret:{path}"
        if cache_key in self.secret_cache:
            return self.secret_cache[cache_key]
        
        try:
            response = self.client.secrets.kv.v2.read_secret_version(path=path)
            secret = response["data"]["data"]
            
            # Cache with TTL
            self.secret_cache[cache_key] = secret
            # (In production: use Redis with expiration)
            
            return secret
        except hvac.exceptions.InvalidPath:
            raise ValueError(f"Secret not found: {path}")
    
    def rotate_secret(self, path: str, new_value: str) -> None:
        """Rotate a secret (revokes old ones after grace period)."""
        self.client.secrets.kv.v2.create_or_update_secret(
            path=path,
            secret_data={"value": new_value}
        )
        # Vault keeps version history; old versions are accessible for grace period
        print(f"Secret rotated: {path}")
```

**Setup in Vault:**

```bash
# Create AppRole for MCP server
vault auth enable approle
vault write auth/approle/role/mcp-server \
  bind_secret_id=true \
  secret_id_ttl=24h \
  token_ttl=1h

# Create policy for MCP to read secrets
vault policy write mcp-policy - <<EOF
path "secret/data/mcp/*" {
  capabilities = ["read", "list"]
}
path "secret/metadata/mcp/*" {
  capabilities = ["read", "list"]
}
EOF

# Attach policy to role
vault write auth/approle/role/mcp-server/policies policies=mcp-policy

# Generate credentials
vault read auth/approle/role/mcp-server/role-id
vault write -f auth/approle/role/mcp-server/secret-id
```

---

## Tool Validation and Allowlisting

### Secure Token Handler with Tool Pinning

```python
import hashlib
import hmac
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class ToolSignature:
    """Cryptographic signature for tool validation."""
    tool_name: str
    tool_hash: str  # SHA256 of tool code
    signature: str  # HMAC-SHA256 of hash, signed by trusted key
    timestamp: int  # When tool was signed

class ToolAllowlist:
    """Allowlist of approved tools with signature validation."""
    
    def __init__(self, signing_key: bytes):
        # signing_key: Secret key used to sign tool hashes (from vault)
        self.signing_key = signing_key
        self.approved_tools = {}  # {tool_name: ToolSignature}
        self.rejected_tools = set()  # Tools blocked due to compromise
    
    def register_tool(
        self, 
        tool_name: str, 
        tool_code: str, 
        signer_identity: str
    ) -> ToolSignature:
        """Register and sign a new tool."""
        
        # Guard clause: Validate tool name
        if not tool_name.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Invalid tool name (must be alphanumeric with - or _)")
        
        # Compute tool hash
        tool_hash = hashlib.sha256(tool_code.encode()).hexdigest()
        
        # Sign the hash
        signature = hmac.new(
            self.signing_key,
            tool_hash.encode(),
            hashlib.sha256
        ).hexdigest()
        
        sig_record = ToolSignature(
            tool_name=tool_name,
            tool_hash=tool_hash,
            signature=signature,
            timestamp=int(datetime.utcnow().timestamp())
        )
        
        self.approved_tools[tool_name] = sig_record
        return sig_record
    
    def validate_tool_execution(
        self, 
        tool_name: str, 
        tool_code: str,
        token_scopes: List[str]
    ) -> bool:
        """Validate tool before execution (layered defense)."""
        
        # Layer 1: Check if tool is in reject list (compromised tools)
        if tool_name in self.rejected_tools:
            raise ValueError(f"Tool {tool_name} is blocked (security compromise)")
        
        # Layer 2: Check if tool is allowlisted
        if tool_name not in self.approved_tools:
            raise ValueError(f"Tool {tool_name} not approved (unknown tool)")
        
        # Layer 3: Verify tool hasn't been modified (diff hash)
        stored_sig = self.approved_tools[tool_name]
        current_hash = hashlib.sha256(tool_code.encode()).hexdigest()
        
        if current_hash != stored_sig.tool_hash:
            # Tool code has changed — potential supply chain attack
            raise ValueError(
                f"Tool {tool_name} failed validation: "
                f"hash mismatch (stored: {stored_sig.tool_hash[:8]}..., "
                f"current: {current_hash[:8]}...)"
            )
        
        # Layer 4: Check token scope permits tool execution
        required_scope = f"mcp:tools:execute:{tool_name}"
        if required_scope not in token_scopes:
            raise ValueError(
                f"Token does not permit execution of {tool_name}. "
                f"Required: {required_scope}"
            )
        
        return True
    
    def block_tool(self, tool_name: str, reason: str) -> None:
        """Block a tool immediately (emergency response to compromise)."""
        self.rejected_tools.add(tool_name)
        # In production: audit log this action, notify all clients
        print(f"Tool blocked: {tool_name} - {reason}")
```

---

## Resource Attestation and Pinning

```python
class ResourcePinner:
    """Pin resource URLs and verify at runtime (prevent man-in-the-middle)."""
    
    def __init__(self):
        self.pinned_resources = {}  # {resource_url: ssl_cert_sha256}
    
    def pin_resource(self, url: str, cert_hash: str) -> None:
        """Register a resource with its SSL certificate hash."""
        self.pinned_resources[url] = cert_hash
    
    def verify_resource(self, url: str, cert_hash: str) -> bool:
        """Verify resource certificate matches pinned hash."""
        
        if url not in self.pinned_resources:
            raise ValueError(f"Resource not pinned: {url}")
        
        if cert_hash != self.pinned_resources[url]:
            raise ValueError(
                f"Certificate mismatch for {url} (MITM attack?)"
            )
        
        return True
```

---

## Audit Logging Strategies

```python
import json
from datetime import datetime
from enum import Enum

class AuditEventType(Enum):
    TOKEN_ISSUED = "token_issued"
    TOKEN_VERIFIED = "token_verified"
    TOKEN_REVOKED = "token_revoked"
    TOOL_EXECUTED = "tool_executed"
    TOOL_BLOCKED = "tool_blocked"
    AUTHORIZATION_DENIED = "authorization_denied"
    SECRET_ACCESSED = "secret_accessed"
    CONFIG_CHANGED = "config_changed"

class AuditLogger:
    """Immutable audit log for compliance (GDPR, FedRAMP, SOC2)."""
    
    def __init__(self, log_sink):
        # log_sink: Cloud logging (CloudWatch, Stackdriver, Splunk)
        self.sink = log_sink
    
    def log_event(
        self,
        event_type: AuditEventType,
        client_id: str,
        resource: str,
        details: Dict,
        outcome: str  # "success" or "denied"
    ) -> None:
        """Log security event (immutable record)."""
        
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type.value,
            "client_id": client_id,
            "resource": resource,
            "outcome": outcome,
            "details": details
        }
        
        # Send to immutable log (append-only, encrypted at rest)
        self.sink.write(json.dumps(event))
        
        # Alert on suspicious patterns
        if outcome == "denied":
            self._check_for_attacks(event)
    
    def _check_for_attacks(self, event: Dict) -> None:
        """Detect attack patterns (brute force, etc)."""
        # Example: 5 failed auth attempts in 60 seconds = ban client
        pass

# Usage
audit = AuditLogger(log_sink=CloudLoggingSink())

audit.log_event(
    event_type=AuditEventType.TOOL_EXECUTED,
    client_id="client-123",
    resource="trading-api",
    details={
        "tool": "place_order",
        "params_hash": "abc123...",  # Don't log actual params (PII)
        "execution_time_ms": 245
    },
    outcome="success"
)
```

---

## Common Mistakes to Avoid

### ❌ Token Passthrough Without Scope Binding

```python
# FORBIDDEN: Client passes token to untrusted service
client_token = request.headers["Authorization"]
result = requests.post(
    "https://untrusted-service.com/api",
    headers={"Authorization": client_token}  # Token leaked to third party!
)
```

### ✅ Use Scoped Sub-Tokens

```python
# CORRECT: Issue scoped token for third party
scoped_token = token_manager.issue_scoped_token(
    original_token=client_token,
    scope="mcp:tools:read",  # Limited scope
    resource="https://untrusted-service.com",
    lifetime=600  # 10 minutes only
)
requests.post(
    "https://untrusted-service.com/api",
    headers={"Authorization": scoped_token}
)
```

### ❌ No Rate Limiting

```python
# FORBIDDEN: Attacker can brute force tokens or flood API
@app.post("/token")
def token_endpoint(request):
    # No rate limit — attacker makes 10,000 requests/second
    return issue_token(request)
```

### ✅ Rate Limit with Token Bucket

```python
from ratelimit import RateLimiter

# 10 tokens per minute per client_id
limiter = RateLimiter(rate=10, per=60)

@app.post("/token")
def token_endpoint(request):
    client_id = request.json["client_id"]
    
    if not limiter.allow(client_id):
        raise ValueError("Rate limit exceeded")
    
    return issue_token(request)
```

---

## Constraints

### MUST DO

- Use OAuth 2.1 PKCE for all token flows (code exchange only, no implicit)
- Implement resource indicators (RFC 8707) to prevent token confusion
- Require tool allowlisting — deny unknown tools by default
- Store secrets in external vault (Vault, AWS Secrets Manager) — never in code or env vars
- Pin tool hashes and verify signatures on every invocation
- Log all authentication, authorization, and tool execution decisions
- Implement token scoping with fine-grained scopes (mcp:tools:execute:TOOL_NAME)
- Set short token lifetimes (15 minutes max for access tokens)
- Revoke tokens immediately on compromise; implement token revocation list
- Use HMAC-SHA256 for tool signatures with key material from vault
- Validate and sanitize all tool parameters before execution
- Implement consent gates for sensitive operations (secrets access, high-value trades)
- Perform certificate pinning for resource endpoints (prevent MITM)
- Use cryptographically secure randomness (secrets.token_urlsafe) for codes and nonces
- Store audit logs in immutable, encrypted storage (append-only, tamper-evident)
- Implement rate limiting on token issuance and tool execution endpoints

### MUST NOT DO

- Use implicit grant or password grant flows (OAuth 2.1 forbids these)
- Store secrets in environment variables, code, or configuration files
- Issue tokens without resource binding (allows token confusion attacks)
- Trust tool names without signature validation (supply chain attacks)
- Log sensitive data (secrets, API keys, PII) in audit logs
- Disable PKCE verification ("too slow") — PKCE adds <1ms overhead
- Reuse authorization codes (implement replay attack protection)
- Issue long-lived tokens (JWT with 1-year expiration = nightmare)
- Allow tool execution without explicit scope in token
- Store signing keys in the same process as MCP code (keep in vault)
- Use MD5 or SHA1 for hashing (use SHA256 minimum)
- Pass tokens as URL parameters (use Authorization header only)
- Implement custom crypto (use industry libraries: hvac, cryptography, jwt)
- Assume tools from "trusted" sources are safe (verify all tools equally)
- Omit audit logs for "performance" (logging is security, not overhead)

---

## Compliance Considerations

### GDPR (Personal Data Protection)

- Right to be forgotten: Implement token revocation for user deletion
- Data minimization: Issue scoped tokens limiting data exposure
- Audit trail: Maintain immutable logs of all data access for 30+ days
- Encryption: Tokens and secrets encrypted at rest and in transit

### FedRAMP (Government Cloud Requirements)

- Continuous monitoring: Audit log ingestion into SIEM
- Incident response: Automated alerting on failed auth attempts
- Segregation: MCP deployments isolated by classification level
- Key management: FIPS 140-2 validated hardware security module (HSM) for signing keys

### SOC2 Type II

- Control testing: Quarterly verification of token expiration enforcement
- Change management: Audit log for all tool registration/blocking
- Logical access: Tool allowlist changes require multi-person approval
- Incident response: Breach timeline captured in audit logs

---

## Related Skills

| Skill | Purpose |
|---|---|
| `ai-llm-agentic-tooling-mcp` | Core MCP implementation patterns (tools, resources, prompts) |
| `identity-security-hashicorp-vault` | Vault configuration and secret management strategies |
| `auth-patterns` | OAuth 2.1, OIDC, JWT implementation details |
| `sast-tooling` | Static analysis for token leaks and hardcoded secrets |
| `distributed-tracing-patterns` | Audit logging and observability in distributed systems |

---

## Summary

MCP deployments face unique security risks: token mismanagement accounts for 34% of breaches, tool poisoning can grant arbitrary code execution, and supply chain attacks are increasingly common. This skill implements defense-in-depth: OAuth 2.1 PKCE for token issuance, resource indicators to prevent token confusion, tool allowlisting with cryptographic validation, secret management via external vaults, and immutable audit logging for compliance.

The key insight: **validation at the boundary (PKCE, signatures) keeps core logic pristine**. Once a token is verified or a tool is allowlisted, downstream code can be simple and fast.
