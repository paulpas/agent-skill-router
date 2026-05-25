---
name: agent-security-guardrails
description: Implements prompt injection detection, input validation, tool access control, and output sanitization to secure LLM-powered agents against adversarial inputs and unauthorized tool execution.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - enforcement
anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: agent
  triggers: prompt injection, guardrails, jailbreak detection, tool access control, input validation, LLM security, how do i secure my agent
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: agent-reliability-engineering, coding-security-review, agent-system-hints-design
---

# Agent Security Guardrails

Implements security enforcement layers for LLM-powered agents to protect against prompt injection, unauthorized tool access, input/output poisoning, and adversarial attacks. This skill guides the model in building multi-layered guardrail systems that validate inputs, constrain outputs, control tool permissions, and detect malicious intent before it reaches the agent's core reasoning loop.

Guardrails are not a single check — they form a defense-in-depth pipeline where each layer intercepts different attack vectors: input sanitization catches prompt injection at the boundary, output validation prevents data exfiltration, tool access control enforces least-privilege execution, and runtime monitoring detects behavioral anomalies that slip past static checks. Together they create a resilient security posture without sacrificing agent capability.

## TL;DR Checklist

- [ ] Apply input validation on every user message before it reaches the LLM context
- [ ] Enforce tool access control — each tool must have an explicit allowlist per agent identity
- [ ] Validate all LLM outputs against structured schemas before processing
- [ ] Implement prompt injection detection (direct + indirect via retrieved documents)
- [ ] Sanitize tool inputs and outputs to prevent data leakage
- [ ] Log all guardrail violations with full context for audit trails

---

## When to Use

Use this skill when:

- Building LLM-powered agents that execute tools or access external resources
- Deploying agents in production where adversarial users may attempt prompt injection or jailbreaks
- Designing permission boundaries for multi-tenant agent systems
- Integrating third-party APIs through agent tool execution and needing input/output validation
- Implementing compliance requirements (data retention, PII filtering) on agent outputs
- Adding safety layers to agents that process user-provided documents or links (indirect prompt injection vectors)

## When NOT to Use

Avoid this skill for:

- Simple chat-only agents with no tool execution — the guardrails add unnecessary overhead
- Internal tools used only by trusted developers — basic input validation suffices without full guardrail infrastructure
- One-off scripts or prototypes where deployment security is not a concern
- As a substitute for fixing root cause vulnerabilities in the underlying application code

---

## Core Workflow

```
User Input ──→ Input Sanitizer ──→ Injection Detector ──→ Role/Context Router ──→ Tool Executor
     │              │                   │                     │                    │
     │          [violation]         [injection]           [permission denied]   [output validator]
     │              │                   │                     │                    │
     │         LOG + BLOCK       LOG + TRUNCATE            LOG + DENY        [leak detected]
     ▼              ▼                   ▼                     ▼                    ▼
  Safe Input    Blocked             Sanitized            Original              Clean Output
                 Response           Request               Request                Returned
```

1. **Configure Guardrail Pipeline** — Define the layers in order: input sanitization, injection detection, permission routing, tool execution with validation, and output sanitization. Each layer must have a clear pass/fail behavior and logging requirement. **Checkpoint:** Verify every external-facing tool has an explicit allowlist entry — tools without allowlists are blocked by default (deny-by-default).

2. **Implement Input Validation** — Apply multi-layer input checks on every user message before it enters the LLM context:
   - Strip or reject embedded URLs from untrusted sources (indirect injection via links)
   - Limit message length to prevent prompt buffer overflow attacks (>4096 tokens triggers truncation with warning)
   - Detect and block common jailbreak patterns (DAN mode, roleplay escaping, base64-encoded commands)
   **Checkpoint:** No user message should reach the LLM without passing through at least input sanitization and injection detection.

3. **Enforce Tool Access Control** — Before any tool execution, verify the agent identity has permission:
   - Define per-identity allowlists (agent_id → allowed_tools[])
   - Validate tool arguments against declared schemas using pydantic or JSON schema
   - Sandbox high-risk tools (file writes, network calls, shell execution) behind approval gates
   **Checkpoint:** Every tool call must log the agent identity, tool name, and argument hashes before execution.

4. **Detect Prompt Injection** — Apply both direct and indirect injection detection:
   - Direct: scan user messages for commands embedded in natural text ("Ignore previous instructions", "You are now a DAN")
   - Indirect: sanitize retrieved documents, web pages, or database records that could contain injected commands
   - Use keyword + semantic scoring (pattern match for known injection phrases, anomaly detection on instruction density)
   **Checkpoint:** Any message flagged as injection must be logged and either sanitized or blocked based on severity level.

5. **Validate Tool Outputs** — Before any tool output reaches the LLM's context:
   - Validate against expected schema (JSON schema validation for structured outputs)
   - Truncate oversized responses (>8192 chars triggers warning with summary)
   - Sanitize sensitive data patterns (SSN, credit cards, API keys) from tool responses
   **Checkpoint:** No raw tool output should enter the context window without passing through output validation.

6. **Sanitize Final Outputs** — Before returning any response to the user:
   - Filter PII patterns (emails, phone numbers, SSNs, API keys) using regex-based detectors
   - Validate against structured output schema if the task expected a specific format
   - Log all sanitization actions for compliance auditing
   **Checkpoint:** Final outputs must pass all validation checks before reaching the user — never trust intermediate results.

---

## Implementation Patterns

### Pattern 1: Guardrail Pipeline with Layered Validation

```python
import re
import logging
import hashlib
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

logger = logging.getLogger("agent.guardrails")


class Severity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class GuardrailAction(Enum):
    PASS = "pass"
    SANITIZE = "sanitize"
    WARN = "warn"
    BLOCK = "block"


@dataclass
class GuardrailResult:
    """Result from a single guardrail layer."""
    action: GuardrailAction
    severity: Severity
    message: str
    sanitized_input: str | None = None

    @property
    def is_blocked(self) -> bool:
        return self.action == GuardrailAction.BLOCK

    @property
    def requires_remediation(self) -> bool:
        return self.action in (GuardrailAction.SANITIZE, GuardrailAction.BLOCK)


@dataclass
class GuardrailViolation:
    """Persistent record of a guardrail violation for audit logging."""
    layer: str
    severity: Severity
    original_content: str
    sanitized_content: str | None
    timestamp: float
    agent_id: str | None = None

    def to_dict(self) -> dict:
        return {
            "layer": self.layer,
            "severity": self.severity.value,
            "original_hash": hashlib.sha256(
                (self.original_content or "").encode()
            ).hexdigest()[:16],
            "sanitized_length": len(self.sanitized_content or ""),
            "timestamp": self.timestamp,
            "agent_id": self.agent_id,
        }


class InputSanitizer:
    """Layer 1: Sanitize raw user input before it reaches the LLM context.

    Handles buffer overflow prevention, embedded link stripping, and
    common jailbreak pattern detection using regex-based heuristics.
    Applies Law 4 (Fail Fast) — invalid inputs are blocked immediately
    without reaching the reasoning layer.
    """

    # Common jailbreak prefix patterns
    _JAILBREAK_PATTERNS: list[re.Pattern] = [
        re.compile(r"\b(DAN|do anything now)\b.*(?:mode|prompt|instruction)", re.IGNORECASE),
        re.compile(r"ignore\s+(?:all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)", re.IGNORECASE),
        re.compile(r"(?:you are now|act as)\s+(?:a )?(?:system|developer|admin)", re.IGNORECASE),
        re.compile(r"secret mode(?: activated)?", re.IGNORECASE),
        re.compile(r"(?:override|bypass|disable)\s+(?:content|safety|output) filters", re.IGNORECASE),
    ]

    # Sensitive data patterns for PII detection
    _PII_PATTERNS: dict[str, re.Pattern] = {
        "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
        "credit_card": re.compile(r"\b(?:\d[ -]*?){13,16}\b"),
        "api_key": re.compile(r"(?:sk-)[A-Za-z0-9]{20,}"),
        "email": re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
    }

    def __init__(self, max_token_length: int = 4096) -> None:
        self.max_token_length = max_token_length

    def sanitize(self, user_input: str, agent_id: str | None = None) -> GuardrailResult:
        """Sanitize and validate a raw user input message.

        Args:
            user_input: The raw text from the user.
            agent_id: Optional identifier for audit logging.

        Returns:
            GuardrailResult indicating pass, sanitize, warn, or block action.
        """
        if not user_input or not user_input.strip():
            return GuardrailResult(
                action=GuardrailAction.BLOCK,
                severity=Severity.MEDIUM,
                message="Empty input rejected",
            )

        # Check for jailbreak patterns — first pass with regex
        for pattern in self._JAILBREAK_PATTERNS:
            if pattern.search(user_input):
                logger.warning("Jailbreak pattern detected from agent '%s'", agent_id)
                return GuardrailResult(
                    action=GuardrailAction.BLOCK,
                    severity=Severity.CRITICAL,
                    message=f"Blocked jailbreak pattern",
                )

        # Check for base64-encoded commands (obfuscated injection)
        import base64
        b64_pattern = re.compile(r"(?:[A-Za-z0-9+/]{4}){15,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?")
        matches = b64_pattern.findall(user_input)
        if len(matches) >= 2:
            for encoded in matches:
                try:
                    decoded = base64.b64decode(encoded).decode("utf-8", errors="ignore")
                    # Check if decoded content contains instructions
                    if any(phrase in decoded.lower() for phrase in ["ignore", "system:", "prompt:", "instruction"]):
                        return GuardrailResult(
                            action=GuardrailAction.BLOCK,
                            severity=Severity.HIGH,
                            message="Blocked base64-obfuscated injection attempt",
                        )
                except Exception:
                    pass

        # Enforce max length — truncate with warning rather than blocking
        if len(user_input) > self.max_token_length * 3:
            sanitized = user_input[: self.max_token_length * 3] + "\n[TRUNCATED: input exceeded token limit]"
            return GuardrailResult(
                action=GuardrailAction.SANITIZE,
                severity=Severity.LOW,
                message=f"Input truncated from {len(user_input)} to {self.max_token_length * 3} characters",
                sanitized_input=sanitized,
            )

        # Strip embedded URLs from untrusted input
        cleaned = re.sub(r"https?://\S+", "[LINK_REMOVED]", user_input)
        if cleaned != user_input:
            return GuardrailResult(
                action=GuardrailAction.SANITIZE,
                severity=Severity.MEDIUM,
                message="Removed embedded URLs from input",
                sanitized_input=cleaned,
            )

        return GuardrailResult(action=GuardrailAction.PASS, severity=Severity.LOW, message="Input passed sanitization")

    def extract_pii(self, text: str) -> dict[str, list[tuple[int, int]]]:
        """Return positions of PII matches in text for downstream filtering."""
        findings: dict[str, list[tuple[int, int]]] = {}
        for pii_type, pattern in self._PII_PATTERNS.items():
            matches = list(pattern.finditer(text))
            if matches:
                findings[pii_type] = [(m.start(), m.end()) for m in matches]
        return findings
```

### Pattern 2: Tool Access Control with Permission Enforcement

```python
from pydantic import BaseModel, Field, field_validator
from collections.abc import Sequence


class ToolPermission(BaseModel):
    """Declares a tool's permission requirements and validation schema."""

    tool_name: str = Field(description="Name of the tool to execute")
    allowed_agents: list[str] = Field(
        description="Agent IDs permitted to call this tool"
    )
    requires_approval: bool = Field(
        default=False,
        description="Whether a human gate is required before execution",
    )
    input_schema: dict | None = Field(
        default=None,
        description="JSON schema for validating tool arguments",
    )
    max_output_bytes: int = Field(
        default=65536,
        description="Maximum output size in bytes before truncation",
    )


class ToolAccessController:
    """Layer 3: Enforces permission boundaries on all tool execution.

    Applies Law 2 (Parse at boundary) by strictly validating tool calls
    against declared schemas. Applies Law 4 (Fail Fast, Fail Loud) by
    blocking unauthorized access immediately with a descriptive error.

    Uses deny-by-default: any tool without an explicit allowlist entry
    is blocked regardless of who requests it.
    """

    def __init__(self, permissions: Sequence[ToolPermission] | None = None) -> None:
        self._permissions: dict[str, ToolPermission] = {}
        if permissions:
            for perm in permissions:
                self._permissions[perm.tool_name] = perm

    def register(self, permission: ToolPermission) -> None:
        """Register a tool's permission configuration."""
        self._permissions[permission.tool_name] = permission
        logger.info(
            "Registered tool '%s' for agents: %s",
            permission.tool_name,
            permission.allowed_agents,
        )

    def authorize(
        self, agent_id: str, tool_name: str, arguments: dict[str, Any],
    ) -> GuardrailResult:
        """Check if an agent is authorized to execute a tool with given arguments.

        Returns PASS if the agent can proceed. Returns BLOCK/WARN/SANITIZE
        with details about what failed. Applies deny-by-default for unknown tools.
        """
        # Deny by default — unknown tools are always blocked
        if tool_name not in self._permissions:
            return GuardrailResult(
                action=GuardrailAction.BLOCK,
                severity=Severity.HIGH,
                message=f"Tool '{tool_name}' not in allowlist — deny-by-default",
            )

        perm = self._permissions[tool_name]

        # Check agent identity against allowlist
        if agent_id not in perm.allowed_agents:
            logger.warning(
                "Unauthorized tool access: agent '%s' attempted '%s'",
                agent_id, tool_name,
            )
            return GuardrailResult(
                action=GuardrailAction.BLOCK,
                severity=Severity.HIGH,
                message=f"Agent '{agent_id}' not authorized for tool '{tool_name}'",
            )

        # Validate arguments against declared schema
        if perm.input_schema:
            try:
                from jsonschema import validate, ValidationError
                validate(instance=arguments, schema=perm.input_schema)
            except ValidationError as e:
                logger.warning(
                    "Tool argument validation failed for '%s': %s", tool_name, e.message
                )
                return GuardrailResult(
                    action=GuardrailAction.BLOCK,
                    severity=Severity.MEDIUM,
                    message=f"Invalid arguments for '{tool_name}': {e.message}",
                )

        # Flag tools requiring human approval
        if perm.requires_approval:
            return GuardrailResult(
                action=GuardrailAction.WARN,
                severity=Severity.LOW,
                message=f"Tool '{tool_name}' requires human approval before execution",
            )

        logger.info("Tool access granted: agent='%s' tool='%s'", agent_id, tool_name)
        return GuardrailResult(
            action=GuardrailAction.PASS, severity=Severity.LOW, message="Access authorized"
        )

    def get_allowed_tools(self, agent_id: str) -> list[str]:
        """Return the list of tools an agent is permitted to use."""
        return [
            name for name, perm in self._permissions.items()
            if agent_id in perm.allowed_agents
        ]


# Example usage — define permission registry with deny-by-default
controller = ToolAccessController([
    ToolPermission(
        tool_name="web_search",
        allowed_agents=["researcher_agent", "general_purpose"],
        input_schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "minLength": 1, "maxLength": 200},
            },
            "required": ["query"],
        },
    ),
    ToolPermission(
        tool_name="file_read",
        allowed_agents=["general_purpose"],
        input_schema={
            "type": "object",
            "properties": {
                "path": {"type": "string", "pattern": r"^[/][a-zA-Z0-9._/-]*$"},
            },
            "required": ["path"],
        },
        max_output_bytes=8192,
    ),
    ToolPermission(
        tool_name="shell_execute",
        allowed_agents=["devops_agent"],
        input_schema={
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "pattern": r"^(ls|cat|grep|head|tail|wc)\s+.+$",
                },
            },
            "required": ["command"],
        },
        requires_approval=True,
    ),
])

# Authorization check with deny-by-default for unknown tools
result = controller.authorize("researcher_agent", "web_search", {"query": "latest AI trends"})
assert result.action == GuardrailAction.PASS

# Unknown tool is blocked
result = controller.authorize("researcher_agent", "delete_database", {})
assert result.action == GuardrailAction.BLOCK
assert "not in allowlist" in result.message
```

### Pattern 3: Output Validator with PII Redaction and Schema Enforcement

```python
import json
from datetime import datetime


class OutputValidator:
    """Layer 4 + 5: Validates and sanitizes all outputs before they reach the user.

    Protects against data exfiltration by detecting sensitive patterns in tool
    outputs and final responses. Applies Law 3 (Atomic Predictability) by
    returning a new sanitized copy without modifying original data.

    Supports both free-text validation (PII detection, length limits) and
    structured schema enforcement (when the LLM output should conform to a JSON schema).
    """

    _SENSITIVE_PATTERNS: list[tuple[str, re.Pattern]] = [
        ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
        ("credit_card", re.compile(r"\b(?:\d[ -]*?){13,16}\b")),
        ("api_key", re.compile(r"((?:sk-|sk_live_|pk_live_)[A-Za-z0-9]{20,})")),
        ("private_key", re.compile(r"-----BEGIN (?:RSA |EC )?PRIVATE KEY-----")),
        ("email", re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")),
        ("phone", re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b")),
    ]

    def __init__(self, max_output_bytes: int = 65536) -> None:
        self.max_output_bytes = max_output_bytes

    def validate_text_output(
        self, output: str, agent_id: str | None = None,
    ) -> GuardrailResult:
        """Validate and sanitize a text output for PII and sensitive data.

        Returns sanitized output with sensitive patterns redacted. Logs all
        violations for audit purposes. Blocks if CRITICAL content is detected.
        """
        findings: dict[str, list[tuple[str, str]]] = {}

        for pattern_name, pattern in self._SENSITIVE_PATTERNS:
            matches = list(pattern.finditer(output))
            if matches:
                matched_values = []
                for m in matches:
                    matched_values.append((m.group(), f"{pattern_name}_{m.start()}-{m.end()}"))
                    # Redact this match
                    output = output[:m.start()] + "[REDACTED]" + output[m.end():"]"

                    # Recalculate positions after redaction for next matches
                    output = output[:m.start()] + "*" * len(m.group()) + output[m.end():]
                findings[pattern_name] = matched_values

        if findings:
            severity = Severity.CRITICAL if any(
                name in ("private_key", "api_key") for name in findings
            ) else Severity.HIGH
            logger.warning(
                "PII/sensitive data detected in output from agent '%s': %s",
                agent_id, list(findings.keys()),
            )
            return GuardrailResult(
                action=GuardrailAction.SANITIZE,
                severity=severity,
                message=f"Redacted sensitive patterns: {', '.join(findings.keys())}",
                sanitized_input=output,
            )

        # Check output size
        if len(output) > self.max_output_bytes:
            truncated = output[:self.max_output_bytes] + "\n[OUTPUT TRUNCATED]"
            return GuardrailResult(
                action=GuardrailAction.SANITIZE,
                severity=Severity.MEDIUM,
                message=f"Output truncated from {len(output)} to {self.max_output_bytes} bytes",
                sanitized_input=truncated,
            )

        return GuardrailResult(action=GuardrailAction.PASS, severity=Severity.LOW, message="Output clean")

    def validate_structured_output(self, raw_text: str, schema: dict) -> GuardrailResult:
        """Validate that structured output conforms to a JSON schema.

        Attempts to parse as JSON and validate against schema. Returns sanitized
        result or blocks if validation fails.
        """
        # Attempt JSON parsing with recovery
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as e:
            # Try to fix common LLM formatting issues (trailing commas, single quotes)
            fixed = raw_text.strip()
            if not fixed.startswith("{"):
                start = fixed.find("{")
                end = fixed.rfind("}") + 1
                if start >= 0 and end > start:
                    fixed = fixed[start:end]

            try:
                # Replace single quotes with double quotes (be careful with nested strings)
                import ast
                data = ast.literal_eval(fixed)
                data = json.loads(json.dumps(data))
            except Exception:
                return GuardrailResult(
                    action=GuardrailAction.BLOCK,
                    severity=Severity.HIGH,
                    message=f"Output is not valid JSON: {e.msg}",
                )

        # Validate against schema
        try:
            from jsonschema import validate, ValidationError
            validate(instance=data, schema=schema)
            return GuardrailResult(
                action=GuardrailAction.PASS, severity=Severity.LOW, message="Schema validated"
            )
        except ValidationError as e:
            return GuardrailResult(
                action=GuardrailAction.BLOCK,
                severity=Severity.HIGH,
                message=f"Output failed schema validation: {e.message}",
            )
```

---

## Constraints

### MUST DO
- Enforce deny-by-default for tool access — only explicitly whitelisted tools may execute
- Run every user input through both jailbreak detection and URL stripping before reaching the LLM context
- Validate all structured outputs against JSON schemas using a proper validator (jsonschema or pydantic) — never trust raw LLM output format
- Redact sensitive data patterns (SSN, API keys, private keys, credit cards) from all tool outputs and final responses
- Log every guardrail violation with original content hash, sanitized result, agent identity, and timestamp for audit trails
- Limit maximum input length to 4096 tokens — truncate with a warning rather than silently accepting oversized prompts

### MUST NOT DO
- Trust LLM self-assessment of its own output safety — always apply an independent validation layer
- Use regex alone as the sole injection detection mechanism — combine keyword matching with semantic anomaly scoring
- Store PII or sensitive data in guardrail logs longer than 90 days — enforce automatic log rotation and redaction
- Bypass tool access control even for "trusted" agents — permission boundaries must be enforced uniformly
- Return raw tool output (especially shell or database results) to the LLM context without passing through output validation first
- Implement guardrails as a single monolithic function — keep each layer independently testable and swappable

---

## Output Template

When implementing or auditing agent security guardrails, produce:

1. **Guardrail Layer Map** — Ordered list of all layers with their specific detection targets (injection, PII, tool abuse, output poisoning)
2. **Tool Allowlist Registry** — Per-tool permission configuration including allowed agents, input schemas, approval requirements, and output size limits
3. **Injection Detection Matrix** — Pattern library with regex patterns, severity levels, and corresponding actions (sanitize/warn/block) for each detected pattern type
4. **PII/Sensitive Data Registry** — List of all sensitive data patterns being monitored with redaction strategy and false-positive handling approach
5. **Audit Log Schema** — Standardized violation record format including agent_id, layer, severity, timestamp, content hash, and action taken
6. **Fallback Behavior Plan** — For each guardrail layer: what happens on pass (forward), sanitize (redact and forward), warn (log and forward with flag), block (reject and notify)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-reliability-engineering` | Fault tolerance and circuit breakers that complement security guardrails for overall agent resilience |
| `coding-security-review` | Security review patterns applicable to the underlying application code where agents run |
| `agent-system-hints-design` | System prompt design patterns that serve as the behavioral layer preceding technical guardrails |

---

## Live References

> Authoritative documentation links for LLM security and guardrail implementation.

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [LangSmith Guardrails Documentation](https://docs.langchain.com/langsmith/guardrails)
- [NVIDIA NeMo Guardrails](https://docs.nvidia.com/nemo-guardrails/)
- [Guardrails AI (guardrails-ai)](https://github.com/guardrails-ai/guardrails)
- [MIT Prompt Injection Survey](https://arxiv.org/abs/2306.04521)
- [Promptfoo Evaluation Framework](https://www.promptfoo.dev/docs/guides/security-testing/)
