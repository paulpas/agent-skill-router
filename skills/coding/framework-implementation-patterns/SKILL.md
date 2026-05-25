---
name: framework-implementation-patterns
description: Translates documented framework requirements into concrete implementation patterns with multi-layer validation gates, constraint assertions, and performance budget enforcement to ensure code decisions align with project specifications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: requirement-to-implementation mapping, framework requirement enforcement, implementation patterns, performance budgets, constraint validation, requirements-as-code, implementation decision matrix, framework requirement validation
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: framework-utilization, framework-driven-design, framework-requirements, framework-adoption-strategy
---

# Framework Implementation Patterns

Translates documented framework requirements into concrete implementation decisions with validation gates and constraint enforcement. When loaded, this skill makes the model act as a senior engineer who bridges the gap between requirement documents and production code — ensuring every coding decision is traceable to a specific requirement, every pattern maps to an actual framework API surface, and every performance budget has both CI and runtime enforcement.

## TL;DR for Code Generation

- [ ] Build a structured requirements catalog with IDs, severities (P0–P2), and validation methods before writing implementation code
- [ ] Map each requirement to specific framework features — never accept home-grown approximations without flagging the gap
- [ ] Implement validation gates at startup, request-time, runtime, and CI layers — every P0 requirement needs automated verification
- [ ] Enforce performance budgets with soft (80% warning) and hard (100% circuit breaker) thresholds using OpenTelemetry metrics
- [ ] Include requirement IDs in all validation error messages for full traceability
- [ ] Generate an audit checklist before release with pass/fail per requirement and supporting evidence

---

## When to Use

Use this skill when:

- After framework selection, you need to translate NFRs (performance SLAs, security requirements, extensibility needs) into concrete code patterns
- Building implementation decision matrices that map each documented requirement to specific framework features and code locations
- Conducting code reviews where you must verify that implementation choices align with documented project requirements
- Adding new features and need to ensure they conform to existing performance, security, and reliability budgets
- Setting up validation infrastructure (Pydantic models, Zod schemas, CI checks) tied directly to requirement IDs

---

## When NOT to Use

Avoid this skill for:

- Framework selection phase — use `framework-selection` instead
- Learning a new framework's conventions or APIs — use `framework-utilization` instead
- Planning migration or rollout strategy — use `framework-adoption-strategy` instead
- Designing IoC/DI architecture patterns — use `framework-driven-design` instead
- Writing end-to-end tests not tied to specific requirement validation gates

---

## Core Workflow

### Step 1: Extract Requirement Catalog

Build a structured requirements catalog from project documentation. Each requirement entry must be a first-class code object with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `str` | Unique identifier (e.g., `PERF-001`, `SEC-003`) |
| `description` | `str` | Human-readable requirement statement |
| `severity` | `Severity` | P0 (critical), P1 (important), P2 (nice-to-have) |
| `required_patterns` | `list[str]` | Framework patterns/APIs that satisfy this requirement |
| `validation_method` | `str` | How validation happens: `startup`, `request_time`, `runtime`, `ci` |
| `success_threshold` | `str` | Quantitative threshold (e.g., `"P95 < 100ms"`) |

**Checkpoint:** Every P0 requirement must have an automated validation gate (CI check or runtime assertion). If fewer than 3 P0 requirements exist, re-examine project scope — a production system needs multiple critical constraints. A catalog with only one P0 requirement almost certainly indicates incomplete scoping.

---

### Step 2: Map Requirements to Implementation Patterns

For each requirement, identify the specific framework feature or pattern that satisfies it. Create a mapping table linking requirement IDs to code locations and patterns used. The mapping must reference actual framework API surfaces — not home-grown approximations.

The mapping process:

1. Take each requirement from the catalog
2. Identify the corresponding framework API (e.g., FastAPI middleware, Pydantic validators, Zod schemas)
3. Record the file path and line range where the pattern is implemented
4. Flag any requirements where no framework API exists — these require custom implementation with explicit documentation of the gap

**Checkpoint:** Every mapped pattern must reference an actual framework API surface. If no framework API exists for a requirement, flag it as a **gap requiring custom implementation**. Do not silently build home-grown solutions that duplicate framework capabilities.

---

### Step 3: Implement Validation Gates

Code validation checks at appropriate layers based on the `validation_method` field of each requirement:

| Layer | Trigger | Typical Requirements |
|-------|---------|---------------------|
| **Startup** | Application bootstrap / container init | Configuration completeness, environment variables, database connectivity |
| **Request-time** | Incoming HTTP/gRPC request | Input validation, auth token expiry, rate limit headers |
| **Runtime** | Periodic background task or metric emission | Performance budgets, memory usage, error rates |
| **CI** | Build/pipeline execution | Static analysis, dependency versions, API contract tests |

Each validation gate must fail fast with a descriptive message that includes the requirement ID (e.g., `"PERF-001: P95 latency 245ms exceeds 100ms budget"`). Gates should **never** silently degrade or log-only violations at hard thresholds.

**Checkpoint:** Each validation gate must fail fast with a descriptive message containing the requirement ID. Silent degradation is a pattern failure — every gate either passes, warns (soft), or blocks (hard).

---

### Step 4: Enforce Performance Budgets

Implement runtime performance monitoring with threshold-based assertions using OpenTelemetry metrics. Budget violations are handled at two levels:

| Level | Threshold | Behavior |
|-------|-----------|----------|
| **Soft** | ≥ 80% of limit | Warning log + metric emission; does not block execution |
| **Hard** | ≥ 100% of limit | Circuit breaker / alert / request rejection; blocks degraded operation |

All performance budgets must have corresponding CI checks that prevent deployment if regression exceeds budget. Runtime assertions and CI budgets must use the same threshold values — no drift between environments.

**Checkpoint:** All performance budgets must have corresponding CI checks with identical thresholds to runtime assertions. Runtime + CI thresholds must be synchronized through a shared configuration source.

---

### Step 5: Audit Implementation Compliance

Periodically scan the codebase for requirement violations. The audit process:

1. Parse all requirement catalogs from version control
2. For each P0/P1 requirement, verify an active validation gate exists in the codebase (grep/search for the requirement ID in assertion calls)
3. Check that no requirements are unimplemented (catalog entries with zero pattern mappings)
4. Verify pattern mappings haven't drifted — compare recorded implementation paths against actual file contents
5. Generate a pass/fail report

**Checkpoint:** Audit report must be generated with pass/fail per requirement. Any failing P0 or P1 requirement blocks the next release until remediated. P2 failures are noted but do not block releases.

---

## Implementation Patterns

### Pattern 1: Requirements-as-Code Mapping Table

Requirements exist as structured code objects, not散落 in documentation. Below is a Python dataclass-based requirements catalog that maps to implementation patterns with validation methods, followed by a TypeScript equivalent.

```python
"""requirements/catalog.py — Requirements catalog as executable code."""
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Severity(Enum):
    P0 = "P0"  # Critical — must have automated validation gate
    P1 = "P1"  # Important — should have validation, manual review acceptable
    P2 = "P2"  # Nice-to-have — best effort

class ValidationMethod(Enum):
    STARTUP = "startup"        # Application bootstrap check
    REQUEST_TIME = "request_time"  # Per-request validation
    RUNTIME = "runtime"        # Periodic runtime assertion
    CI = "ci"                  # Build-time / pipeline check


@dataclass(frozen=True, slots=True)
class Requirement:
    """A single requirement with traceable validation."""
    id: str                           # e.g., "PERF-001"
    description: str                  # Human-readable statement
    severity: Severity                # P0 / P1 / P2
    required_patterns: list[str]      # Framework patterns/APIs
    validation_method: ValidationMethod  # How we verify compliance
    success_threshold: str            # Quantitative threshold string
    implementation_path: str | None = None  # File path where implemented

    def has_automation(self) -> bool:
        return self.severity in (Severity.P0, Severity.P1)


@dataclass(frozen=True)
class RequirementCatalog:
    """Immutable catalog of all project requirements."""
    requirements: tuple[Requirement, ...] = ()

    @property
    def p0_requirements(self) -> list[Requirement]:
        return [r for r in self.requirements if r.severity == Severity.P0]

    @property
    def unvalidated_p0(self) -> list[Requirement]:
        """P0 requirements missing implementation_path — flagged gaps."""
        return [r for r in self.p0_requirements if r.implementation_path is None]

    def by_id(self, req_id: str) -> Requirement | None:
        for req in self.requirements:
            if req.id == req_id:
                return req
        return None

    def audit_report(self) -> dict[str, bool]:
        """Generate pass/fail per requirement."""
        report = {}
        for req in self.requirements:
            has_gate = (
                req.implementation_path is not None
                and req.success_threshold != ""
            )
            report[req.id] = has_gate
        return report


# Example catalog entries
CATALOG = RequirementCatalog(
    requirements=(
        Requirement(
            id="PERF-001",
            description="P95 latency must be under 100ms for /api/v1/query endpoints",
            severity=Severity.P0,
            required_patterns=["opentelemetry-metrics", "performance-budget-enforcement"],
            validation_method=ValidationMethod.RUNTIME,
            success_threshold="p95_latency < 100ms",
        ),
        Requirement(
            id="SEC-003",
            description="All API endpoints must validate content-type headers against allowlist",
            severity=Severity.P0,
            required_patterns=["pydantic-validation", "middleware-headers"],
            validation_method=ValidationMethod.REQUEST_TIME,
            success_threshold="all-endpoints-have-validator",
        ),
        Requirement(
            id="REL-001",
            description="Application must fail startup if PostgreSQL connection pool is misconfigured",
            severity=Severity.P1,
            required_patterns=["pydantic-settings", "startup-hooks"],
            validation_method=ValidationMethod.STARTUP,
            success_threshold="pool-config-valid",
        ),
    ),
)
```

```typescript
// requirements/catalog.ts — TypeScript requirements catalog
import { z } from "zod";

const SeveritySchema = z.enum(["P0", "P1", "P2"]);
type Severity = z.infer<typeof SeveritySchema>;

const ValidationMethodSchema = z.enum([
  "startup",
  "request_time",
  "runtime",
  "ci",
]);
type ValidationMethod = z.infer<typeof ValidationMethodSchema>;

const RequirementSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(10),
  severity: SeveritySchema,
  requiredPatterns: z.array(z.string()).min(1),
  validationMethod: ValidationMethodSchema,
  successThreshold: z.string().min(1),
  implementationPath: z.string().url().optional(),
});

export type Requirement = z.infer<typeof RequirementSchema>;

export class RequirementCatalog {
  constructor(private requirements: readonly Requirement[]) {}

  get p0Requirements(): Requirement[] {
    return this.requirements.filter((r) => r.severity === "P0");
  }

  get unvalidatedP0(): Requirement[] {
    return this.p0Requirements.filter(
      (r) => !r.implementationPath,
    );
  }

  findById(id: string): Requirement | undefined {
    return this.requirements.find((r) => r.id === id);
  }

  auditReport(): Record<string, boolean> {
    const report: Record<string, boolean> = {};
    for (const req of this.requirements) {
      report[req.id] =
        !!req.implementationPath && req.successThreshold.length > 0;
    }
    return report;
  }
}

// Example catalog entries
export const CATALOG = new RequirementCatalog([
  {
    id: "PERF-001",
    description: "P95 latency must be under 100ms for /api/v1/query endpoints",
    severity: "P0",
    requiredPatterns: ["opentelemetry-metrics", "performance-budget-enforcement"],
    validationMethod: "runtime",
    successThreshold: "p95_latency < 100ms",
  },
  {
    id: "SEC-003",
    description: "All API endpoints must validate content-type headers against allowlist",
    severity: "P0",
    requiredPatterns: ["zod-validation", "middleware-headers"],
    validationMethod: "request_time",
    successThreshold: "all-endpoints-have-validator",
  },
]);
```

**Checkpoint:** The catalog is immutable (frozen dataclass / readonly array) — requirements cannot be mutated at runtime. Any addition must go through a code change reviewed against the implementation decision matrix.

---

### Pattern 2: Multi-Layer Validation Gates

Below are BAD vs GOOD examples of validation at multiple layers, using Pydantic v2 for Python and Zod for TypeScript.

#### BAD — No Requirement Traceability

```python
# ❌ BAD — No requirement ID in error messages, no gate layering
# app/validators.py

def validate_request(body):
    # Silent fallback on invalid input
    if not body.get("email"):
        logger.warning("missing email")  # No traceability to requirement
        return {"default": True}  # Silent degradation — violates fail-fast

    try:
        result = process_payment(body)
    except Exception as e:
        # Swallowed exception — no gate failure
        pass
    return result

def check_performance():
    # No thresholds, no budget enforcement
    avg = get_average_latency()  # Why is this called? What does it enforce?
```

#### GOOD — Multi-Layer Validation with Traceability

```python
# ✅ GOOD — Each gate has requirement ID, threshold, and fail-fast behavior
# app/validation/gates.py
from __future__ import annotations

import logging
from contextlib import contextmanager
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class GateLevel(Enum):
    SOFT = "soft"     # Warning, does not block
    HARD = "hard"     # Blocks execution or raises
    INFO = "info"     # Logged only, no action


@dataclass(frozen=True)
class GateViolation:
    """Structured violation with requirement traceability."""
    requirement_id: str       # e.g., "SEC-003"
    description: str          # What violated
    threshold: str            # Expected vs actual
    level: GateLevel          # soft / hard / info

    def format_message(self) -> str:
        return (
            f"{self.requirement_id}: {self.description} "
            f"(expected: {self.threshold})"
        )


class ValidationGate:
    """Implements a single validation gate tied to a requirement."""

    def __init__(
        self,
        requirement_id: str,
        threshold: float,
        level: GateLevel = GateLevel.HARD,
        metric_name: str | None = None,
    ):
        self.requirement_id = requirement_id
        self.threshold = threshold
        self.level = level
        self.metric_name = metric_name or f"gate.{requirement_id}.value"

    def check(self, actual_value: float) -> GateViolation | None:
        """Return violation if threshold exceeded. Returns None if passing."""
        if actual_value > self.threshold:
            return GateViolation(
                requirement_id=self.requirement_id,
                description=f"{self.metric_name} value {actual_value:.1f} exceeds {self.threshold:.1f}",
                threshold=f"max={self.threshold}",
                level=self.level,
            )
        return None

    def enforce(self, actual_value: float) -> None:
        """Raise if hard gate fails, warn if soft gate breached."""
        violation = self.check(actual_value)
        if violation is None:
            return

        msg = violation.format_message()
        if violation.level == GateLevel.HARD:
            raise RuntimeError(msg)
        elif violation.level == GateLevel.SOFT:
            logger.warning(msg)
        # INFO level: logged by the caller


# --- Startup gate for SEC-003: Content-Type validation ---
SEC_003_GATE = ValidationGate(
    requirement_id="SEC-003",
    threshold=1.0,  # All endpoints must have validator
    level=GateLevel.HARD,
)

def startup_content_type_audit() -> None:
    """Validated at startup that all routes have content-type validation."""
    from app.router import registered_routes  # framework-specific import
    endpoints_with_validator = sum(
        1 for r in registered_routes if r.has_content_type_validator
    )
    total_endpoints = len(registered_routes)
    ratio = (endpoints_with_validator / max(total_endpoints, 1)) * 100
    violation = SEC_003_GATE.check(ratio)
    if violation:
        raise RuntimeError(violation.format_message())


# --- Request-time gate using Pydantic v2 for input validation ---
from pydantic import BaseModel, field_validator, ValidationError
from typing import Optional


class PaymentRequest(BaseModel):
    """Pydantic v2 model — validates at request boundary."""
    amount: float
    currency: str = "USD"
    email: str
    reference: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, value: str) -> str:
        import re
        if not re.match(r"[^@]+@[^@]+\.[^@]+", value):
            raise ValueError(SEC_003_GATE.check.__self__.requirement_id + ": invalid email format")
        return value.lower().strip()

    @field_validator("amount")
    @classmethod
    def validate_amount_range(cls, v: float) -> float:
        if v <= 0:
            raise ValueError(f"SEC-003: amount must be positive, got {v}")
        if v > 1_000_000:
            raise ValueError(f"SEC-003: amount exceeds single-transaction limit of $1M")
        return round(v, 2)


def handle_payment(request_body: dict) -> dict:
    """Request-time validation gate — fails fast with requirement ID."""
    try:
        payment = PaymentRequest(**request_body)
    except ValidationError as exc:
        # Extract requirement IDs from validation errors for traceability
        error_details = []
        for err in exc.errors():
            if "SEC-003" in str(err.get("msg", "")):
                error_details.append(str(err["msg"]))

        if error_details:
            raise RuntimeError(
                f"SEC-003: Request validation failed:\n"
                + "\n".join(f"  - {d}" for d in error_details)
            ) from exc
        raise

    return process_payment(payment.model_dump())


# --- Runtime gate for PERF-001: Performance budget enforcement ---
@dataclass
class PerformanceBudget:
    """Enforces performance budgets with soft and hard thresholds."""
    requirement_id: str
    soft_threshold_pct: float = 0.80  # 80% of limit triggers warning
    hard_threshold_pct: float = 1.0   # 100% triggers circuit breaker

    def check(self, metric_name: str, actual_ms: float, budget_ms: float) -> GateViolation | None:
        ratio = actual_ms / budget_ms if budget_ms > 0 else float("inf")

        if ratio >= self.hard_threshold_pct:
            return GateViolation(
                requirement_id=self.requirement_id,
                description=f"{metric_name}={actual_ms:.0f}ms exceeds hard limit {budget_ms:.0f}ms",
                threshold=f"<{budget_ms:.0f}ms (hard)",
                level=GateLevel.HARD,
            )
        elif ratio >= self.soft_threshold_pct:
            return GateViolation(
                requirement_id=self.requirement_id,
                description=f"{metric_name}={actual_ms:.0f}ms approaching limit {budget_ms:.0f}ms",
                threshold=f"<{budget_ms:.0f}ms (soft at 80%)",
                level=GateLevel.SOFT,
            )
        return None
```

```typescript
// ✅ GOOD — TypeScript validation with Zod for request-time gates
import { z } from "zod";
import { Hono } from "hono";

// --- Requirement-mapped Zod schemas ---
const PaymentRequestSchema = z.object({
  amount: z.number().positive("SEC-003: amount must be positive").max(1_000_000, "SEC-003: exceeds single-transaction limit"),
  currency: z.string().default("USD"),
  email: z.string().email("SEC-003: invalid email format"),
  reference: z.string().optional(),
});

export type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

// --- Startup gate using Zod schema introspection ---
function startupEndpointValidation(app: Hono) {
  const allSchemas = collectRequestSchemas(app); // framework-specific
  const withValidator = allSchemas.filter(s => s !== undefined).length;
  const total = allSchemas.length;
  const coveragePct = (withValidator / Math.max(total, 1)) * 100;

  if (coveragePct < 100) {
    throw new Error(
      `SEC-003: Only ${coveragePct.toFixed(0)}% of endpoints have request validation. Required: 100%`
    );
  }
}

// --- Runtime performance budget check ---
interface GateViolation {
  requirementId: string;
  description: string;
  threshold: string;
  level: "soft" | "hard" | "info";
}

function createPerformanceGate(
  requirementId: string,
  budgetMs: number,
): (actualMs: number) => GateViolation | null {
  const softThreshold = budgetMs * 0.80;
  const hardThreshold = budgetMs;

  return (actualMs: number): GateViolation | null => {
    if (actualMs >= hardThreshold) {
      return {
        requirementId,
        description: `${requirementId}: ${actualMs.toFixed(0)}ms exceeds hard limit ${budgetMs.toFixed(0)}ms`,
        threshold: `<${budgetMs}ms (hard)`,
        level: "hard",
      };
    }
    if (actualMs >= softThreshold) {
      return {
        requirementId,
        description: `${requirementId}: ${actualMs.toFixed(0)}ms approaching limit ${budgetMs.toFixed(0)}ms`,
        threshold: `<${budgetMs}ms (soft at 80%)`,
        level: "soft",
      };
    }
    return null;
  };
}

const perfBudgetGate = createPerformanceGate("PERF-001", 100); // 100ms budget

export async function handlePayment(req: Request): Promise<Response> {
  const body = await req.json();
  const result = PaymentRequestSchema.safeParse(body);

  if (!result.success) {
    const messages = result.error.errors
      .filter(e => e.message.includes("SEC-003"))
      .map(e => `  - ${e.message}`)
      .join("\n");
    return new Response(
      JSON.stringify({ error: `SEC-003: Request validation failed:\n${messages}` }),
      { status: 400 },
    );
  }

  // Runtime performance check on the response itself
  const startTime = performance.now();
  const payment = await processPayment(result.data);
  const elapsed = performance.now() - startTime;

  const violation = perfBudgetGate(elapsed);
  if (violation?.level === "hard") {
    throw new Error(violation.description);
  }
  if (violation?.level === "soft") {
    console.warn(`[PERF-WARN] ${violation.description}`);
  }

  return new Response(JSON.stringify(payment), { status: 200 });
}
```

---

### Pattern 3: Performance Budget Enforcement with OpenTelemetry

Concrete implementation with runtime assertion using OpenTelemetry metrics, including soft and hard violation handling.

```python
"""app/metrics/performance_budgets.py — OpenTelemetry-powered performance budget enforcement."""
from __future__ import annotations

import asyncio
import logging
from collections import deque
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class MetricSample:
    """Single performance measurement."""
    timestamp: float
    value_ms: float


@dataclass
class PerformanceBudget:
    """Enforces a performance budget with percentile calculation and OTel metrics."""
    requirement_id: str
    metric_name: str
    p95_budget_ms: float
    p99_budget_ms: float
    soft_threshold_pct: float = 0.80

    _samples: deque[MetricSample] = field(default_factory=lambda: deque(maxlen=10_000), init=False)

    @property
    def samples(self) -> list[float]:
        return [s.value_ms for s in self._samples]

    def record(self, value_ms: float) -> None:
        """Record a single measurement. Thread-safe via deque's internal locking."""
        import time
        self._samples.append(MetricSample(timestamp=time.time(), value_ms=value_ms))

    def _percentile(self, pct: float) -> float | None:
        if not self.samples:
            return None
        sorted_vals = sorted(self.samples)
        idx = int(len(sorted_vals) * pct / 100)
        idx = min(idx, len(sorted_vals) - 1)
        return sorted_vals[idx]

    async def evaluate(self) -> list[GateViolation]:
        """Evaluate current performance against budget. Returns violations found."""
        violations: list[GateViolation] = []

        p95 = self._percentile(95)
        p99 = self._percentile(99)

        if p95 is None or p99 is None:
            # Insufficient samples — warn but don't fail
            logger.warning(
                "%s: insufficient samples for budget evaluation (need >= 2, have %d)",
                self.requirement_id, len(self._samples),
            )
            return violations

        # P95 soft / hard checks
        p95_violation = self._check_single(p95, self.p95_budget_ms, "p95")
        if p95_violation:
            violations.append(p95_violation)

        # P99 hard check (always hard level — tail latency is critical)
        p99_ratio = p99 / self.p99_budget_ms if self.p99_budget_ms > 0 else float("inf")
        if p99_ratio >= 1.0:
            violations.append(GateViolation(
                requirement_id=self.requirement_id,
                description=f"{self.metric_name} P99 latency {p99:.0f}ms exceeds hard limit {self.p99_budget_ms:.0f}ms",
                threshold=f"p99 < {self.p99_budget_ms:.0f}ms",
                level=GateLevel.HARD,
            ))

        return violations

    def _check_single(self, actual: float, budget: float, label: str) -> GateViolation | None:
        ratio = actual / budget if budget > 0 else float("inf")
        hard_limit = budget
        soft_limit = budget * self.soft_threshold_pct

        if actual >= hard_limit:
            return GateViolation(
                requirement_id=self.requirement_id,
                description=f"{self.metric_name} {label}={actual:.0f}ms exceeds hard limit {budget:.0f}ms",
                threshold=f"max_{label} < {budget:.0f}ms (hard)",
                level=GateLevel.HARD,
            )
        elif actual >= soft_limit:
            return GateViolation(
                requirement_id=self.requirement_id,
                description=f"{self.metric_name} {label}={actual:.0f}ms approaching limit {budget:.0f}ms",
                threshold=f"max_{label} < {budget:.0f}ms (soft at {int(self.soft_threshold_pct * 100)}%)",
                level=GateLevel.SOFT,
            )
        return None

    async def emit_to_otel(self, meter: Any) -> None:
        """Emit performance metrics to OpenTelemetry for external monitoring."""
        if not self.samples:
            return

        import time
        now = time.time()
        p95 = self._percentile(95) or 0.0
        p96 = self._percentile(99) or 0.0

        metric = meter.create_histogram(f"apex.perf.{self.requirement_id}")
        metric.record(p95, attributes={
            "requirement": self.requirement_id,
            "metric": self.metric_name,
            "percentile": "p95",
        })
        metric.record(p96, attributes={
            "requirement": self.requirement_id,
            "metric": self.metric_name,
            "percentile": "p99",
        })


async def periodic_budget_check(budget: PerformanceBudget, meter: Any, interval_s: int = 30) -> None:
    """Background task that periodically evaluates a performance budget and emits OTel metrics."""
    while True:
        try:
            violations = await budget.evaluate()
            for v in violations:
                if v.level == GateLevel.HARD:
                    logger.error("HARD VIOLATION: %s", v.format_message())
                    # TODO: trigger circuit breaker / alerting integration
                else:
                    logger.warning("SOFT VIOLATION: %s", v.format_message())

            await budget.emit_to_otel(meter)
        except Exception as e:
            logger.exception("Budget evaluation failed for %s: %s", budget.requirement_id, e)

        await asyncio.sleep(interval_s)
```

**Checkpoint:** Performance budgets use sliding window of 10,000 samples for percentile calculations. The `periodic_budget_check` async task runs at configurable intervals and emits both violation logs and OpenTelemetry metrics. Hard violations are logged as errors and trigger the circuit breaker integration path.

---

## Constraints

### MUST DO
- Every P0 requirement must have at least one automated validation gate (CI check or runtime assertion) — manual review is never sufficient for P0
- Validation gates must include the requirement ID in their error messages for full traceability from production failure back to the original requirement
- Performance budgets must be enforced at both CI build-time and application runtime layers with identical threshold values — no drift between environments
- Requirement-to-pattern mapping table must be version-controlled alongside application code in the same repository — never in a separate wiki or document
- Audit reports must be generated before each release candidate with pass/fail per requirement and supporting evidence (log snippets, metric snapshots)

### MUST NOT DO
- Never accept "close enough" thresholds — performance budgets are hard limits, not aspirational goals. A budget of 100ms P95 means 100ms, not "around 100ms"
- Never implement a requirement without a corresponding validation gate — unvalidated requirements are just wishes. If you can't test it, it doesn't exist
- Never bypass runtime assertions for "performance reasons" — the assertion overhead is negligible compared to the cost of production failures. If assertions slow down hot paths, profile and optimize the assertions, not by removing them
- Never document requirements only in non-code artifacts (Confluence, Word docs, Jira tickets alone) — requirements must exist as executable code objects that can be parsed, validated, and audited

---

## Output Template

When this skill is active, produce output structured as follows:

1. **Requirements Catalog** — Structured table with columns: ID, Description, Severity (P0–P2), Required Patterns, Validation Method, Success Threshold
2. **Requirement-to-Pattern Mapping Table** — Columns: Requirement ID → Framework Feature → Code Location (file path + line range)
3. **Validation Gate Implementation** — Code for each gate layer: startup (bootstrap checks), request-time (input validators), runtime (periodic assertions). Each must include the requirement ID in error messages
4. **Performance Budget Configuration** — Threshold values (soft at 80%, hard at 100%), monitoring hooks, alert configurations mapped to specific metrics
5. **Audit Checklist** — Pass/fail per requirement with evidence references (e.g., "SEC-003: PASS — PaymentRequestSchema validates email in app/validation/schemas.py:42–58")

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `framework-selection` | Selecting the right framework before implementation begins |
| `framework-utilization` | Learning and applying framework conventions after selection |
| `framework-driven-design` | Designing IoC/DI architecture using framework capabilities |
| `framework-adoption-strategy` | Planning migration or rollout strategy for a new framework |

---

## Live References

| Resource | URL | Relevance |
|----------|-----|-----------|
| FastAPI Dependencies & Validation | https://fastapi.tiangolo.com/tutorial/dependencies/ | Request-time validation patterns |
| Pydantic v2 Documentation | https://pydantic.dev/ | Python data validation as executable code |
| Zod Schema Validation | https://zod.dev/ | TypeScript runtime type checking |
| OpenTelemetry Specification | https://opentelemetry.io/docs/ | Performance metric collection standard |
| OWASP Application Security Verification | https://owasp.org/www-project-application-security-verification-standard/ | Security requirement validation standards |
| OpenTelemetry SLO Spec | https://github.com/pyroscope-io/opentelemetry-slo-spec | Service level objective metric patterns |
| Renovate Dependency Management | https://docs.renovatebot.com/ | Automated dependency version enforcement in CI |
