---
name: budget-aware-cost-management
description: Implements session-level budget quotas, cost monitoring with threshold alerts, and ROI tracking to enforce AI agent spending limits and optimize return on investment.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: infrastructure
  output-format: analysis
  triggers: budget quota, cost monitoring, token budget, spending limits, ROI tracking, AI cost optimization, how do i control agent spending
  archetypes:
    - tactical
    - orchestration
  anti_triggers:
    - model selection
    - query complexity classification
    - performance benchmarking
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-optimization, goal-setting-monitoring, evaluation-monitoring
---

# Budget-Aware Cost Management for AI Agents

Implements budget quota enforcement, real-time cost monitoring, and ROI tracking to ensure AI agent operations stay within financial constraints while maximizing output value.

## TL;DR Checklist

- [ ] Define per-session budget with hard/soft limits
- [ ] Implement token-level cost tracking per operation
- [ ] Set threshold alerts at 50%, 75%, 90% budget utilization
- [ ] Configure adaptive retry strategies based on remaining budget
- [ ] Track ROI (output quality / cost spent) per agent session
- [ ] Enforce priority-based budget allocation in multi-agent deployments
- [ ] Generate cost-utilization reports with optimization recommendations

---

## When to Use

Use this skill when:

- Deploying multi-agent systems where total token spend needs hard caps
- Building production AI services with per-user or per-session budget limits
- Running experiments where ROI tracking determines continuation vs shutdown
- Managing agent teams that share a pooled compute budget
- Implementing cost-aware scheduling in resource-constrained environments (edge devices, mobile)

## When NOT to Use

Avoid this skill for:

- Simple single-agent scripts with negligible cost (overhead outweighs benefit)
- Research/exploratory work without budget constraints (use unconstrained reasoning)
- Offline/local model deployments with zero marginal cost
- Situations where quality must be guaranteed regardless of cost (use `resource-optimization` instead)

---

## Core Workflow

1. **Define Budget Architecture** — Establish per-session budgets with hard limits (never exceed) and soft limits (trigger optimization). Classify all planned operations by cost tier. **Checkpoint:** Verify budget cap is enforced at the infrastructure level, not just tracked.
2. **Implement Cost Tracking Layer** — Deploy token-level monitoring that counts input/output tokens per API call, aggregates session totals, and maintains a real-time utilization counter. **Checkpoint:** Confirm tracking granularity matches billing granularity (per-token, per-model).
3. **Configure Threshold Alerts** — Set up warnings at 50% (informational), 75% (prepare optimization), 90% (activate conservative mode), and 100% (graceful shutdown trigger). **Checkpoint:** All alert handlers must be non-blocking; alerts should not consume budget tokens.
4. **Deploy Adaptive Retry Logic** — Implement budget-aware retry strategies: aggressive retries when >75% remaining, single retry at 50-75%, no retries below 25%. Classify errors as retryable vs terminal before consuming additional budget. **Checkpoint:** Total retries × estimated cost per retry ≤ remaining budget margin.
5. **Track ROI Metrics** — Measure output quality (success rate, user satisfaction, accuracy) against cost spent per operation. Calculate ROI = quality_score / (total_tokens × cost_per_token). Log metrics for trend analysis. **Checkpoint:** ROI calculation must use normalized quality scores, not raw outputs.
6. **Generate Cost Reports** — Produce utilization summaries showing budget consumed vs allocated, top-cost operations, optimization opportunities, and ROI trends. Provide actionable recommendations for quota adjustment. **Checkpoint:** Reports must include both absolute costs and per-operation averages for comparison.

---

## Implementation Patterns

### Pattern 1: Session Budget Quota Manager

Enforces hard and soft budget limits per session with graceful degradation.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class LimitType(Enum):
    HARD = "hard"      # Never exceed — triggers shutdown
    SOFT = "soft"       # Warn + optimize — does not block


@dataclass
class BudgetLimit:
    token_budget: int
    limit_type: LimitType
    cost_per_million_tokens: float


@dataclass
class SessionBudget:
    """Per-session budget quota with hard/soft limits and real-time tracking."""

    budget: BudgetLimit
    tokens_used: int = 0
    cost_incurred: float = 0.0
    alerts_triggered: list[str] = field(default_factory=list)
    is_active: bool = True

    @property
    def utilization_pct(self) -> float:
        return (self.tokens_used / self.budget.token_budget) * 100 if self.budget.token_budget > 0 else 0.0

    @property
    def tokens_remaining(self) -> int:
        return max(0, self.budget.token_budget - self.tokens_used)

    def estimate_operation_cost(self, estimated_tokens: int) -> float:
        """Estimate cost for a planned operation."""
        return (estimated_tokens / 1_000_000) * self.budget.cost_per_million_tokens

    def can_afford(self, estimated_tokens: int) -> bool:
        """Check if session can afford estimated operation without hitting hard limit."""
        return (self.tokens_used + estimated_tokens) <= self.budget.token_budget

    def record_consumption(self, tokens: int) -> bool:
        """Record token consumption. Returns False if hard limit exceeded."""
        new_total = self.tokens_used + tokens
        if self.budget.limit_type == LimitType.HARD and new_total > self.budget.token_budget:
            self.is_active = False
            self.alerts_triggered.append(f"HARD LIMIT EXCEEDED: {new_total} > {self.budget.token_budget}")
            return False

        self.tokens_used = new_total
        self.cost_incurred += self.estimate_operation_cost(tokens)
        self._check_threshold_alerts()
        return True

    def _check_threshold_alerts(self):
        """Generate threshold alerts without consuming budget tokens."""
        utilization = self.utilization_pct
        if 75 <= utilization < 90 and "SOFT_LIMIT_75" not in self.alerts_triggered:
            self.alerts_triggered.append("SOFT_LIMIT_75")
        elif 90 <= utilization < 100 and "CONSERVATIVE_MODE_90" not in self.alerts_triggered:
            self.alerts_triggered.append("CONSERVATIVE_MODE_90")
        elif utilization >= 100 and "HARD_LIMIT_TRIGGERED" not in self.alerts_triggered:
            self.is_active = False
            self.alerts_triggered.append("HARD_LIMIT_TRIGGERED")


# --- Usage Example ---

def run_agent_session(session_id: str) -> SessionBudget:
    """Create a session with $5 budget at $0.03/M tokens."""
    budget = BudgetLimit(
        token_budget=166_666_667,  # ~$5 at $0.03/M tokens
        limit_type=LimitType.HARD,
        cost_per_million_tokens=0.03,
    )
    session = SessionBudget(budget=budget)

    # Before each operation: check affordability
    estimated_tokens = 5_000
    if not session.can_afford(estimated_tokens):
        raise BudgetExhaustedError(f"Session {session_id} cannot afford estimated operation")

    # ... execute operation ...
    actual_tokens = perform_llm_call(session_id, estimated_tokens)

    # Record consumption — may deactivate session at hard limit
    session.record_consumption(actual_tokens)
    return session


class BudgetExhaustedError(Exception):
    """Raised when a session's budget is exhausted and no operations can proceed."""
    pass
```

### Pattern 2: Real-Time Cost Monitor with Threshold Alerts

Monitors token consumption in real-time with non-blocking alerts.

```python
import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class CostAlert:
    """Non-blocking cost alert that does not consume budget tokens."""

    timestamp: datetime
    threshold_pct: float
    message: str
    recommended_action: str


@dataclass
class CostMonitor:
    """Real-time cost monitoring with configurable threshold alerts.

    Alerts are sent to a callback queue and never block the agent execution path.
    Monitoring overhead is kept below 0.1% of total compute budget.
    """

    alert_thresholds: list[float] = field(default_factory=lambda: [50.0, 75.0, 90.0, 100.0])
    alerts: list[CostAlert] = field(default_factory=list)
    _last_alerted_pct: float = 0.0
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def check_and_alert(self, current_tokens: int, max_tokens: int, alert_callback=None):
        """Check utilization against thresholds and trigger alerts if needed."""
        if max_tokens == 0:
            return

        utilization_pct = (current_tokens / max_tokens) * 100

        for threshold in sorted(self.alert_thresholds):
            if utilization_pct >= threshold and self._last_alerted_pct < threshold:
                action_map = {
                    50.0: "Log cost trend — no action required",
                    75.0: "Switch to lower-cost model or simplify queries",
                    90.0: "Disable non-critical operations, activate conservative retry mode",
                    100.0: "Graceful shutdown: complete in-flight request then stop",
                }
                alert = CostAlert(
                    timestamp=datetime.utcnow(),
                    threshold_pct=threshold,
                    message=f"Cost utilization reached {utilization_pct:.1f}% (threshold: {threshold}%)",
                    recommended_action=action_map.get(threshold, "Review budget allocation"),
                )
                self.alerts.append(alert)
                if alert_callback:
                    alert_callback(alert)

        self._last_alerted_pct = max(self._last_alerted_pct, utilization_pct)


# --- Usage Example ---

monitor = CostMonitor(
    alert_thresholds=[50.0, 75.0, 90.0, 100.0]
)

def on_cost_alert(alert: CostAlert):
    """Non-blocking handler — does not consume agent budget tokens."""
    print(f"[{alert.timestamp}] {alert.message}")
    print(f"  Recommended: {alert.recommended_action}")

# During agent execution:
monitor.check_and_alert(tokens_used, total_budget, alert_callback=on_cost_alert)
```

### Pattern 3: Budget-Aware Retry Logic

Adaptive retry strategies based on remaining budget margin.

```python
from enum import IntEnum
import random


class RetryMode(IntEnum):
    AGGRESSIVE = 3    # >75% budget remaining — retry up to 3 times
    MODERATE = 2      # 50-75% remaining — retry up to 2 times
    CONSERVATIVE = 1  # 25-50% remaining — retry only once
    NONE = 0          # <25% remaining — no retries


class ErrorClassification(IntEnum):
    RETRYABLE = 1     # Transient: rate limit, timeout, network error
    TERMINAL = 0      # Permanent: invalid input, schema mismatch, auth failure


def classify_error(exception: Exception) -> ErrorClassification:
    """Classify error as retryable or terminal to avoid wasting budget."""
    transient_errors = (TimeoutError, ConnectionError, RateLimitError)
    return (
        ErrorClassification.RETRYABLE
        if isinstance(exception, transient_errors)
        else ErrorClassification.TERMINAL
    )


def adaptive_retry(
    operation: callable,
    session_budget: SessionBudget,
    estimated_cost_per_retry: int = 1_000,
    max_retries: Optional[int] = None,
) -> object:
    """Execute operation with budget-aware adaptive retry logic.

    Args:
        operation: Callable that performs the LLM/API call.
        session_budget: Active SessionBudget to check against.
        estimated_cost_per_retry: Token budget reserved for one retry attempt.
        max_retries: Override default (derived from remaining budget).

    Returns:
        Operation result.

    Raises:
        BudgetExhaustedError: If no retries are affordable.
        FinalError: If all retries exhausted or error classified as terminal.
    """
    # Determine retry mode based on remaining budget
    if max_retries is None:
        utilization = session_budget.utilization_pct
        if utilization < 25:
            max_retries = RetryMode.NONE
        elif utilization < 50:
            max_retries = RetryMode.CONSERVATIVE
        elif utilization < 75:
            max_retries = RetryMode.MODERATE
        else:
            max_retries = RetryMode.AGGRESSIVE

    if max_retries == 0:
        raise BudgetExhaustedError(
            f"Budget below 25% threshold ({session_budget.utilization_pct:.1f}%). "
            f"No retries allowed. Complete current operation and shut down gracefully."
        )

    last_exception: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            return operation()
        except Exception as exc:
            error_type = classify_error(exc)
            if error_type == ErrorClassification.TERMINAL:
                raise FinalError(f"Terminal error on attempt {attempt + 1}: {exc}") from exc

            # Check if we can afford another retry before attempting it
            if attempt < max_retries and not session_budget.can_afford(estimated_cost_per_retry):
                raise BudgetExhaustedError(
                    f"Cannot afford retry #{attempt + 2}. Remaining budget: "
                    f"{session_budget.tokens_remaining:,} tokens."
                )

            # Add jitter to avoid thundering herd on rate limits
            jitter = random.uniform(0.1, 1.0) * (2 ** attempt)
            last_exception = exc
            import time; time.sleep(jitter)

    raise FinalError(f"All {max_retries} retries exhausted. Last error: {last_exception}")


class RateLimitError(Exception):
    """Transient error raised when API rate limit is exceeded."""
    pass


class FinalError(Exception):
    """Non-retryable error after all retry attempts exhausted."""
    pass
```

### Pattern 4: Multi-Agent Budget Orchestrator

Priority-based budget allocation across agent teams sharing a pooled budget.

```python
from dataclasses import dataclass, field
from enum import IntEnum


class AgentPriority(IntEnum):
    CRITICAL = 0   # Always funded first (e.g., safety monitoring)
    HIGH = 1       # Funded when budget allows (e.g., user-facing operations)
    LOW = 2        # Deferred when budget constrained (e.g., background analysis)


@dataclass
class AgentBudgetAllocation:
    """Budget allocation for a single agent or agent team."""

    agent_id: str
    priority: AgentPriority
    max_tokens: int
    tokens_used: int = 0

    @property
    def utilization_pct(self) -> float:
        return (self.tokens_used / self.max_tokens) * 100 if self.max_tokens > 0 else 0.0


@dataclass
class MultiAgentBudgetOrchestrator:
    """Priority-based budget allocation across multiple agents sharing a pooled budget."""

    total_token_budget: int
    allocations: list[AgentBudgetAllocation] = field(default_factory=list)
    tokens_remaining: int = 0

    def __post_init__(self):
        self.tokens_remaining = self.total_token_budget

    def allocate(self, agent_id: str, max_tokens: int, priority: AgentPriority) -> bool:
        """Allocate budget to an agent. Returns False if insufficient pooled budget."""
        # Check pool availability
        if max_tokens > self.tokens_remaining:
            return False

        self.allocations.append(AgentBudgetAllocation(
            agent_id=agent_id,
            priority=priority,
            max_tokens=max_tokens,
        ))
        self.tokens_remaining -= max_tokens
        return True

    def get_next_agent(self) -> Optional[AgentBudgetAllocation]:
        """Get the next agent to run, ordered by priority then allocation size."""
        if not self.allocations:
            return None

        # Sort by priority (CRITICAL first), then by tokens remaining (largest first)
        eligible = [
            a for a in self.allocations
            if a.tokens_used < a.max_tokens and self.tokens_remaining > 0
        ]

        if not eligible:
            return None

        eligible.sort(key=lambda a: (a.priority, -(a.max_tokens - a.tokens_used)))
        return eligible[0]

    def record_usage(self, agent_id: str, tokens_consumed: int) -> bool:
        """Record token consumption for an agent. Returns False if agent not found."""
        for alloc in self.allocations:
            if alloc.agent_id == agent_id:
                new_total = alloc.tokens_used + tokens_consumed
                if new_total > alloc.max_tokens:
                    return False
                alloc.tokens_used = new_total
                self.tokens_remaining += tokens_consumed  # Refund unused allocation
                return True
        return False

    def utilization_summary(self) -> dict:
        """Get budget utilization summary across all agents."""
        total_allocated = sum(a.max_tokens for a in self.allocations)
        total_used = sum(a.tokens_used for a in self.allocations)
        return {
            "total_budget": self.total_token_budget,
            "total_allocated": total_allocated,
            "total_consumed": total_used,
            "pool_remaining": self.tokens_remaining,
            "allocation_utilization": (total_used / total_allocated * 100) if total_allocated > 0 else 0,
            "agents": [
                {
                    "id": a.agent_id,
                    "priority": a.priority.name,
                    "allocated": a.max_tokens,
                    "consumed": a.tokens_used,
                    "utilization_pct": round(a.utilization_pct, 1),
                }
                for a in self.allocations
            ],
        }


# --- Usage Example ---

orchestrator = MultiAgentBudgetOrchestrator(total_token_budget=50_000_000)

# Allocate budgets to agents
orchestrator.allocate("safety_monitor", 5_000_000, AgentPriority.CRITICAL)
orchestrator.allocate("user_chat", 30_000_000, AgentPriority.HIGH)
orchestrator.allocate("background_analysis", 15_000_000, AgentPriority.LOW)

# Schedule next agent based on priority and availability
while (agent := orchestrator.get_next_agent()):
    result = run_agent_pipeline(agent.agent_id)
    orchestrator.record_usage(agent.agent_id, result.tokens_consumed)
```

---

## Constraints

### MUST DO
1. Always enforce hard budget limits at the infrastructure level — never rely on agent self-reporting alone
2. Track token consumption at API call granularity (input tokens + output tokens separately) for accurate cost attribution
3. Classify errors as RETRYABLE vs TERMINAL before attempting retries to avoid wasting budget on non-recoverable failures
4. Set threshold alerts at 50%, 75%, 90% utilization — alerts must be non-blocking and never consume budget tokens themselves
5. Implement adaptive retry logic that scales aggressiveness with remaining budget: aggressive early, conservative near limit
6. Calculate ROI per operation as quality_score / (tokens × cost_per_token) — normalize quality scores for cross-model comparison
7. Reference `code-philosophy` Laws of Elegant Defense in all budget enforcement code: Law 1 (Early Exit at budget check), Law 4 (Fail Fast when hard limit hit)
8. Generate utilization reports that show top-cost operations and actionable optimization recommendations

### MUST NOT DO
1. Allow an agent to exceed its session budget under any circumstance — no "just one more call" exceptions
2. Block execution for alert notifications — alerts must be fire-and-forget to the callback queue
3. Retry terminal errors (schema mismatches, auth failures, invalid input) — classify before retrying
4. Use wall-clock time as a proxy for cost estimation — token counts are the only reliable cost metric
5. Share budgets across unrelated user sessions — each session must have isolated budget tracking
6. Ignore ROI metrics in favor of pure cost minimization — optimize for value per dollar, not cheapest output

---

## Output Template

When this skill is active, deliver:

1. **Budget Architecture** — Session budget definition with hard/soft limits, token-to-cost mapping
2. **Cost Tracking Configuration** — Token counting strategy, aggregation intervals, monitoring granularity
3. **Alert Threshold Plan** — 50%/75%/90%/%100 alert handlers with recommended actions at each level
4. **Retry Strategy** — Budget-aware retry configuration (max retries, jitter, error classification)
5. **ROI Framework** — Quality score definition, cost normalization formula, tracking interval
6. **Utilization Report** — Budget consumed vs allocated per agent/session, top-cost operations, optimization recommendations

---

## Related Skills

| Skill | Purpose |
|---|---|
| `resource-optimization` | Model routing based on query complexity (complements budget enforcement) |
| `goal-setting-monitoring` | Iterative goal refinement with bounded loops (budget-aware iterations) |
| `evaluation-monitoring` | Production monitoring with drift detection (cost metrics feed into evaluation) |

---

## Live References

- [OpenAI Pricing Guide](https://openai.com/api/pricing/) — Token cost per model for accurate budget calculation
- [Anthropic Pricing Guide](https://www.anthropic.com/pricing) — Alternative model pricing for cross-provider budgeting
- [Google Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing) — Gemini model pricing and quota management
