---




name: auth-credentials
description: Implements agent authentication, credential management, capability-based
  access control, JWT identity verification, and human-in-the-loop authorization gates
  for production-safe AI agent systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: agent auth, credential management, JWT identity, capability-based access control, tool authorization, secret rotation, human approval gate, agent authentication control
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: infrastructure
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - do-dont
  related-skills: ai-agent-safety, multi-agent-patterns, framework-orchestration-routing,
    agent-reliability-engineering




---




# Agent Authentication & Credential Manager

Implements authentication, credential management, and authorization patterns that protect agent systems from credential leaks, unauthorized tool use, and privilege escalation. When loaded, this skill makes the model design secure identity and access layers for AI agents operating in production environments.

## TL;DR Checklist

- [ ] Use scoped credential providers — never expose raw API keys to agents
- [ ] Implement JIT (just-in-time) credential provisioning with short TTLs
- [ ] Enforce capability-based access control (CBAC) on every tool call
- [ ] Generate JWT agent identities for inter-agent communication
- [ ] Place human-in-the-loop approval gates on high-risk operations
- [ ] Log all auth events with agent_id, action, and outcome to a structured audit log

---

## When to Use

Use this skill when:

- Designing the authentication layer for an AI agent system (single-agent or multi-agent)
- Implementing credential management for agents that interact with external APIs, databases, or cloud services
- Building capability-based access control (CBAC) policies that govern what tools or actions each agent can perform
- Setting up inter-agent authentication so Agent A cannot impersonate Agent B when communicating through message queues or service calls
- Adding human-in-the-loop authorization gates for high-risk operations (production deploys, financial transactions, data deletion)
- Auditing and logging all agent credential access and tool usage events

---

## When NOT to Use

Avoid this skill for:

- Simple scripts or notebooks with no authentication concerns — use it only when agents operate in shared or production environments
- General API authentication (OAuth flows for user login) — use standard OAuth/OIDC skills instead
- Network-level security (firewalls, TLS termination) — handle those separately; focus this skill on agent identity and credential abstraction

---

## Core Workflow

1. **Define Agent Identities** — Create a unique identity (UUID + metadata) for each agent. Assign capabilities using the format `capability:action` (e.g., `github:push`, `aws:rds:backup`). Store identities in a registry, never in environment variables.
   **Checkpoint:** Every agent has at least one capability scope and no agent receives wildcard (`*:*`) permissions by default.

2. **Implement Credential Provider** — Build a credential provider interface that abstracts secret storage (HashiCorp Vault, AWS Secrets Manager, or encrypted file store). The provider must support scoped access (`provider.get(service_name, agent_id)`) and automatic rotation on a configurable schedule.
   **Checkpoint:** No code path directly accesses raw secrets — all access flows through the credential provider interface.

3. **Apply JIT Credential Provisioning** — Before executing any tool or service call, provision credentials scoped to exactly that operation with a short time-to-live (5–15 minutes). Credentials must be automatically invalidated after use or TTL expiry.
   **Checkpoint:** `TTL` is set per-operation and never exceeds 15 minutes for production agents.

4. **Enforce Capability-Based Access Control** — Intercept every tool call through an authorization middleware that checks `(agent_id, capability_name)` against the agent's capability policy. Deny by default; allow only explicitly granted capabilities.
   **Checkpoint:** The authorization check happens *before* any credentials are retrieved or tools are invoked.

5. **Add Human Approval Gates for High-Risk Operations** — For operations rated high-risk (production deployment, data deletion, financial transaction above threshold, infrastructure modification), insert a blocking gate that requires human approval via Slack, email, or webhook before proceeding.
   **Checkpoint:** Every risk level has a defined policy: auto-approve (low), async approval (medium), block until explicit sign-off (high).

6. **Log and Audit All Auth Events** — Emit structured audit logs for every credential access, tool call authorization decision, and approval gate outcome. Include `timestamp`, `agent_id`, `capability_attempted`, `decision` (allow/deny/pending), and `outcome`.
   **Checkpoint:** Logs are sent to a centralized audit system (e.g., CloudWatch, Datadog, or ELK) and cannot be deleted by agents.

---

## Implementation Patterns

### Pattern 1: Credential Provider Interface with JIT Provisioning

This pattern abstracts all secret access through a typed credential provider that enforces scoped access and automatic short-lived credential rotation.

```python
import time
from dataclasses import dataclass, field
from typing import Protocol, Optional


@dataclass
class Credentials:
    """Immutable credential bundle with TTL enforcement."""
    service: str
    api_key: str
    secret_token: Optional[str] = None
    issued_at: float = field(default_factory=time.time)
    ttl_seconds: int = 300

    @property
    def is_expired(self) -> bool:
        return time.time() - self.issued_at > self.ttl_seconds


class CredentialProvider(Protocol):
    """Interface for all agent credential operations."""

    async def get(self, service: str, agent_id: str) -> Credentials: ...

    async def provision(
        self,
        agent_id: str,
        scope: list[str],
        ttl_seconds: int = 300,
    ) -> Credentials: ...

    async def revoke(self, credential_id: str) -> None: ...

    async def rotate(self, service: str, agent_id: str) -> bool: ...


class VaultCredentialProvider:
    """Production credential provider backed by HashiCorp Vault or similar."""

    def __init__(self, vault_client, rotation_interval_minutes: int = 30):
        self._vault = vault_client
        self._rotation_interval = rotation_interval_minutes

    async def get(self, service: str, agent_id: str) -> Credentials:
        """Retrieve credentials scoped to a specific service and agent."""
        path = f"secret/agents/{agent_id}/{service}"
        response = await self._vault.read(path)
        if not response or "data" not in response:
            raise PermissionError(
                f"Agent {agent_id} has no credentials for service '{service}'"
            )
        data = response["data"]
        return Credentials(
            service=service,
            api_key=data["api_key"],
            secret_token=data.get("token"),
            ttl_seconds=300,
        )

    async def provision(
        self, agent_id: str, scope: list[str], ttl_seconds: int = 300
    ) -> Credentials:
        """JIT provisioning: short-lived credentials for a specific operation."""
        service = scope[0] if scope else "default"
        credential_id = f"{agent_id}:{service}:{int(time.time())}"

        return Credentials(
            service=service,
            api_key=f"ephemeral-{credential_id}",
            issued_at=time.time(),
            ttl_seconds=ttl_seconds,
        )

    async def revoke(self, credential_id: str) -> None:
        """Revoke a specific credential — critical on suspected compromise."""
        await self._vault.delete(f"secret/credentials/{credential_id}")

    async def rotate(self, service: str, agent_id: str) -> bool:
        """Rotate credentials on a configurable schedule."""
        return True
```

### Pattern 2: Capability-Based Access Control Middleware

This pattern intercepts every tool call and validates that the calling agent possesses the required capability before proceeding. It uses a deny-by-default policy model.

```python
from enum import Enum
from functools import wraps


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class CapabilityPolicy:
    """Defines what an agent is allowed to do."""
    agent_id: str
    capabilities: dict[str, RiskLevel]

    def has_capability(self, capability: str) -> bool:
        return capability in self.capabilities

    def get_risk_level(self, capability: str) -> RiskLevel:
        return self.capabilities.get(capability, RiskLevel.LOW)


class CapabilityAuthorizer:
    """Deny-by-default authorization middleware for agent tool calls."""

    def __init__(self, policy_store: dict[str, CapabilityPolicy]):
        self._policies = policy_store
        self._audit_logger: list[dict] = []

    def authorize(self, agent_id: str, capability: str) -> bool:
        """Check if an agent is authorized for a specific capability."""
        policy = self._policies.get(agent_id)
        if not policy:
            self._log_audit(agent_id, capability, "deny", "no_policy")
            return False

        if not policy.has_capability(capability):
            self._log_audit(agent_id, capability, "deny", "missing_capability")
            return False

        self._log_audit(agent_id, capability, "allow", "capability_granted")
        return True

    def get_risk_level(self, agent_id: str, capability: str) -> RiskLevel:
        policy = self._policies.get(agent_id)
        if not policy:
            return RiskLevel.HIGH
        return policy.get_risk_level(capability)

    def _log_audit(self, agent_id: str, capability: str, decision: str, reason: str):
        self._audit_logger.append({
            "timestamp": time.time(),
            "agent_id": agent_id,
            "capability": capability,
            "decision": decision,
            "reason": reason,
        })


def require_capability(
    authorizer: CapabilityAuthorizer, capability: str
):
    """Decorator that enforces capability check before tool execution."""

    def decorator(func):
        @wraps(func)
        async def wrapper(agent: object, *args, **kwargs) -> object:
            agent_id = getattr(agent, "id", "unknown")

            if not authorizer.authorize(agent_id, capability):
                raise UnauthorizedToolCall(
                    f"Agent {agent_id} lacks capability '{capability}'"
                )

            return await func(agent, *args, **kwargs)

        return wrapper

    return decorator


class UnauthorizedToolCall(Exception):
    """Raised when an agent attempts a tool call without required capabilities."""
    def __init__(self, message: str, agent_id: str = "", capability: str = ""):
        super().__init__(message)
        self.agent_id = agent_id
        self.capability = capability
```

### Pattern 3: JWT Agent Identity for Inter-Agent Communication

This pattern generates and validates JSON Web Tokens (JWT) as agent identities when agents communicate with each other over message queues, HTTP APIs, or gRPC channels. Each JWT encodes the agent's identity and permitted capabilities.

```python
import time


class AgentIdentityProvider:
    """Issues and validates JWT tokens for agent-to-agent authentication."""

    def __init__(self, signing_key: str, algorithm: str = "HS256", ttl_minutes: int = 10):
        self._signing_key = signing_key
        self._algorithm = algorithm
        self._ttl = ttl_minutes

    def create_identity(self, agent_id: str, capabilities: list[str]) -> str:
        """Generate a JWT containing the agent's identity and capabilities."""
        import json
        from datetime import datetime, timedelta, timezone

        now = datetime.now(timezone.utc)
        payload = {
            "agent_id": agent_id,
            "capabilities": capabilities,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=self._ttl)).timestamp()),
            "nbf": int(now.timestamp()),
            "jti": f"{agent_id}:{int(now.timestamp())}",
        }
        # In production: use PyJWT or jose library for proper JWT signing
        raw = json.dumps(payload, separators=(',', ':'))
        import base64, hmac, hashlib
        header = json.dumps({"alg": self._algorithm, "typ": "JWT"}, separators=(',', ':'))
        encoded_header = base64.urlsafe_b64encode(header.encode()).rstrip(b'=').decode()
        encoded_payload = base64.urlsafe_b64encode(raw.encode()).rstrip(b'=').decode()
        signing_input = f"{encoded_header}.{encoded_payload}"
        signature = hmac.new(
            self._signing_key.encode(),
            signing_input.encode(),
            hashlib.sha256
        ).digest()
        encoded_signature = base64.urlsafe_b64encode(signature).rstrip(b'=').decode()
        return f"{signing_input}.{encoded_signature}"

    def validate_identity(self, token: str) -> dict:
        """Validate a JWT and return the decoded agent identity."""
        import json
        from datetime import datetime, timezone

        parts = token.split('.')
        if len(parts) != 3:
            raise InvalidAgentToken("Malformed JWT token")

        encoded_payload = parts[1] + '=' * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(encoded_payload))

        now = int(datetime.now(timezone.utc).timestamp())
        if payload.get("exp", 0) < now:
            raise ExpiredAgentToken("Agent JWT has expired")

        required = ("agent_id", "capabilities", "iat", "exp")
        missing = [k for k in required if k not in payload]
        if missing:
            raise InvalidAgentToken(f"Missing fields: {missing}")

        return payload


class ExpiredAgentToken(Exception): ...
class InvalidAgentToken(Exception): ...
```

### Pattern 4: Human-in-the-Loop Authorization Gate

This pattern inserts a blocking approval gate for high-risk operations. The agent pauses execution until a human approves via webhook, Slack, or email. If the gate times out without approval, the operation is cancelled.

```python
import asyncio
from dataclasses import dataclass


class ApprovalResult(str):
    APPROVED = "approved"
    REJECTED = "rejected"
    TIMEOUT = "timeout"


@dataclass
class ApprovalRequest:
    """Represents a human approval gate request."""
    operation: str
    agent_id: str
    risk_level: RiskLevel  # from Pattern 2
    description: str
    timeout_seconds: int = 300

    @property
    def requires_immediate_approval(self) -> bool:
        return self.risk_level == RiskLevel.HIGH


class ApprovalGate:
    """Blocking human-in-the-loop authorization gate."""

    def __init__(self, notification_handler):
        self._notify = notification_handler
        self._pending: dict[str, asyncio.Event] = {}

    async def request_approval(self, request: ApprovalRequest) -> str:
        """Block until human approves/rejects or timeout occurs."""
        gate_id = f"{request.agent_id}:{request.operation}:{int(time.time())}"

        await self._notify({
            "gate_id": gate_id,
            "operation": request.operation,
            "agent_id": request.agent_id,
            "risk_level": request.risk_level.value,
            "description": request.description,
            "timeout_seconds": request.timeout_seconds,
        })

        approval_event = asyncio.Event()
        self._pending[gate_id] = approval_event

        try:
            await asyncio.wait_for(
                approval_event.wait(),
                timeout=request.timeout_seconds
            )
            return ApprovalResult.APPROVED
        except asyncio.TimeoutError:
            return ApprovalResult.TIMEOUT
        finally:
            self._pending.pop(gate_id, None)

    def respond_to_gate(self, gate_id: str, approved: bool) -> None:
        """Called by notification handler when a human responds."""
        if event := self._pending.get(gate_id):
            event.set()


# Risk level policy mapping for common operations
RISK_POLICY: dict[str, RiskLevel] = {
    "github:push_to_main": RiskLevel.HIGH,
    "aws:rds:delete": RiskLevel.HIGH,
    "aws:s3:write_production": RiskLevel.MEDIUM,
    "github:read_repo": RiskLevel.LOW,
    "db:select": RiskLevel.LOW,
    "db:insert": RiskLevel.MEDIUM,
    "db:delete": RiskLevel.HIGH,
    "deploy:production": RiskLevel.HIGH,
}


async def execute_with_approval(
    agent_id: str,
    operation: str,
    tool_func,
    gate=None,
):
    """Execute a tool with automatic risk-based approval routing."""
    risk = RISK_POLICY.get(operation) or RiskLevel.LOW

    if risk == RiskLevel.HIGH and gate:
        request = ApprovalRequest(
            operation=operation,
            agent_id=agent_id,
            risk_level=risk,
            description=f"Agent {agent_id} requesting to execute: {operation}",
            timeout_seconds=300,
        )
        result = await gate.request_approval(request)

        if result != ApprovalResult.APPROVED:
            raise OperationBlocked(f"Approval {result.value} for operation '{operation}'")

    return await tool_func()


class OperationBlocked(Exception): ...
```

---

## Constraints

### MUST DO
- Never hardcode API keys, tokens, or secrets in agent code, configuration files, or environment variable definitions visible in version control
- Use JIT (just-in-time) credential provisioning with TTLs not exceeding 15 minutes for production operations
- Enforce capability-based access control (CBAC) on every tool call — deny by default; allow only explicitly granted capabilities
- Generate unique JWT identities for every inter-agent communication channel to prevent identity spoofing
- Place human approval gates on all HIGH-risk operations; log the gate outcome even when auto-approved
- Log every credential access, authorization decision, and approval gate event to a centralized audit system
- Rotate credentials on a configurable schedule (minimum 30 days) and immediately on any suspected compromise

### MUST NOT DO
- Never pass raw API keys or secret tokens as function arguments, environment variables accessible to all agents, or in log messages
- Do not use wildcard permissions (`*:*`) for any agent — even service accounts must have scoped capabilities
- Do not cache credentials beyond their TTL without explicit re-validation against the credential provider
- Do not allow agents to read other agents' capability policies (lateral movement prevention)
- Do not bypass human approval gates programmatically — never auto-approve a HIGH-risk operation regardless of context
- Do not store JWT signing keys in the same repository or service as the agent runtime

---

## Output Template

When implementing or reviewing authentication and credential patterns for an agent system, produce:

1. **Agent Identity Schema** — The identity model (JWT claims or UUID-based) with assigned capabilities per agent
2. **Credential Provider Design** — The provider interface and backing store (Vault, AWS Secrets Manager, etc.) with provisioning flow
3. **Capability Policy Matrix** — A table mapping each agent to its granted capabilities and associated risk levels
4. **Authorization Flow Diagram** — ASCII diagram showing how a tool call is intercepted, checked against the policy, and either executed or routed through a human gate
5. **Audit Log Schema** — The structured fields captured for every auth event (timestamp, agent_id, capability, decision, reason)

---

## Related Skills

| Skill                        | Purpose                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `ai-agent-safety`            | Broader safety concerns including prompt injection and guardrails |
| `multi-agent-patterns`       | Inter-agent communication — auth is the trust layer on top |
| `framework-orchestration-routing` | How authenticated agents are selected for task routing |
| `agent-reliability-engineering` | Credential failures as a reliability concern (fallback, retries) |

---

## Live References

> Authoritative documentation links for agent authentication and credential management.

- [OWASP API Security Top 10 — Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-object-id/)
- [JWT.io — JSON Web Token Introduction](https://jwt.io/introduction)
- [HashiCorp Vault — Secrets Management Best Practices](https://developer.hashicorp.com/vault/docs/secrets)
- [NIST SP 800-63B — Digital Identity Guidelines for Authentication](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [LangChain Security Best Practices](https://python.langchain.com/docs/security/)
- [Anthropic Agent Safety Documentation](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
