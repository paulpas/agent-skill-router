---
name: human-in-the-loop
description: Integrates human oversight into AI agent workflows for high-stakes decisions through approval gates, feedback loops for RLHF, escalation policies, and decision augmentation patterns that balance automation with accountability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: human in the loop, human oversight, approval gates, RLHF feedback, escalation policy, decision augmentation, how do i add human review, high-stakes AI decisions
  related-skills: exception-handling-recovery, tool-use-function-calling, goal-setting-monitoring
  archetypes:
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
    - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Human-in-the-Loop Pattern

Integrates human oversight into AI agent workflows for high-stakes decisions by implementing approval gates, escalation policies, RLHF feedback loops, and decision augmentation patterns that balance automation with accountability. This skill makes the model design systems where AI handles computational heavy-lifting while humans provide critical validation, intervention, and final authority on sensitive operations.

## TL;DR Checklist

- [ ] Define escalation criteria before implementing any HITL workflow
- [ ] Implement approval gates for all high-risk actions (financial, safety, legal)
- [ ] Build feedback collection mechanisms to feed into RLHF training loops
- [ ] Design human-agent collaboration interfaces with clear handoff protocols
- [ ] Anonymize sensitive data before exposing it to human operators
- [ ] Establish scalability strategy — HITL does not scale to millions of operations
- [ ] Add monitoring and audit trails for every human intervention

---

## When to Use

Use this skill when:

- Deploying AI in domains where errors carry significant safety, ethical, or financial consequences (healthcare, finance, autonomous systems)
- Designing agent workflows that require human validation before executing irreversible actions (fund transfers, content publishing, model deployments)
- Building RLHF training pipelines where human preference data drives model improvement
- Implementing escalation mechanisms for agents encountering ambiguous or out-of-scope scenarios
- Creating decision augmentation systems where AI recommends and humans decide (loan approvals, legal review, medical diagnosis support)
- Developing customer support triage that seamlessly transfers complex queries to human agents
- Content moderation systems need human judgment on borderline or policy-violating content

---

## When NOT to Use

Avoid this skill for:

- **High-volume, low-risk tasks** — If an operation can be automated safely at scale (e.g., data sorting, formatting), HITL adds unnecessary overhead and creates a bottleneck
- **Real-time systems with sub-second latency requirements** — Human review introduces delays that may be unacceptable in time-critical contexts like autonomous driving control loops or high-frequency trading execution
- **Well-defined deterministic tasks** — If the AI can solve the problem with 100% accuracy using rule-based logic, human oversight provides zero value
- **"Human-on-the-loop" scenarios where policy is static** — When a human expert simply defines rules and the AI executes autonomously within them, you need rule-based automation, not full HITL (see Rule of Thumb below)

---

## Core Workflow

1. **Identify High-Stakes Decision Points** — Audit the agent's workflow and map every operation where an error could cause safety harm, financial loss, legal liability, or reputational damage. Classify each into risk tiers: critical (requires human approval), elevated (requires human review after execution), and standard (fully autonomous). **Checkpoint:** Every decision point is tagged with its risk tier and escalation criteria before any code is written.

2. **Define Escalation Criteria** — For each critical and elevated operation, specify the exact conditions that trigger human intervention. Criteria should be deterministic where possible (e.g., transaction amount > $10,000) and include confidence thresholds from the AI model itself (e.g., "confidence score below 0.85 on fraud detection"). **Checkpoint:** Escalation rules are documented in a machine-readable format (JSON or YAML config) and reviewed by domain experts.

3. **Implement Approval Gate Mechanism** — Build the approval gate as an atomic operation that halts agent execution until a human approves or rejects. The gate must capture: the action proposed, full context needed for informed decision-making (sanitized of PII), confidence score from the AI, and alternative actions considered. Implement timeout handling — if no response within the configured window, execute a safe fallback. **Checkpoint:** Every approval gate has a test case verifying correct behavior for approve, reject, and timeout scenarios.

4. **Build Feedback Collection and RLHF Loop** — Design mechanisms to capture human decisions during review (approve/reject/modify), the rationale provided by the operator, and the outcome of the action. Feed this data into training pipelines as preference pairs: state-action pair with the human-approved action marked as preferred. Tag feedback by domain and risk tier for targeted model improvement. **Checkpoint:** Feedback schema is validated against a JSON schema and includes required fields (decision, rationale, confidence_before, timestamp, operator_id).

5. **Design Decision Augmentation Interface** — For decision augmentation patterns, structure AI outputs as structured recommendations that support human judgment rather than replace it. Each recommendation must include: the primary suggestion with confidence level, supporting evidence (data points, precedents), alternative options considered and why they were deprioritized, and explicit uncertainty flags. **Checkpoint:** The recommendation format is validated against a schema and includes at minimum: suggestion, confidence_evidence, alternatives, and uncertainty_flags.

6. **Implement Monitoring, Audit Trails, and Privacy Guards** — Log every escalation event, approval decision, feedback submission, and human intervention with full traceability. Anonymize or mask sensitive information (PII, financial data, health records) before presenting it to human operators. Implement role-based access controls so operators only see the data relevant to their clearance level. **Checkpoint:** Audit logs are queryable by operator_id, timestamp range, and outcome, and all sensitive fields pass through a sanitization pipeline before display.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Approval Gate with Escalation

An approval gate blocks execution of high-risk operations until a human explicitly approves or rejects the proposed action. This is the foundational HITL mechanism for preventing irreversible mistakes.

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional
import uuid


class DecisionResult(Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    TIMEOUT = "timeout"


@dataclass
class EscalationRequest:
    """Represents a request for human review of an AI-proposed action."""
    request_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    action_type: str
    proposed_action: dict
    confidence_score: float
    risk_tier: str  # "critical", "elevated", "standard"
    context_summary: str
    alternatives_considered: list[dict] = field(default_factory=list)
    uncertainty_flags: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    timeout_after: timedelta = field(
        default_factory=lambda: timedelta(hours=1)
    )

    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() > (self.created_at + self.timeout_after)


@dataclass
class HumanDecision:
    """Records the outcome of human review on an escalation request."""
    decision_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    escalation_id: str
    result: DecisionResult
    rationale: str
    operator_id: str
    decided_at: datetime = field(default_factory=datetime.utcnow)
    modifications: Optional[dict] = None

    def to_feedback_record(self) -> dict:
        """Serialize for RLHF training pipeline ingestion."""
        return {
            "decision_id": self.decision_id,
            "escalation_id": self.escalation_id,
            "result": self.result.value,
            "rationale": self.rationale,
            "operator_id": self.operator_id,
            "timestamp": self.decided_at.isoformat(),
        }


class ApprovalGate:
    """
    Halts agent execution until a human approves or rejects the proposed action.
    Implements timeout-to-fallback semantics per safety requirements.
    """

    def __init__(
        self,
        gate_id: str,
        on_approve: callable,
        on_reject: callable,
        on_timeout: Optional[callable] = None,
        default_timeout: timedelta = timedelta(hours=1),
    ):
        self.gate_id = gate_id
        self.on_approve = on_approve
        self.on_reject = on_reject
        self.on_timeout = on_timeout or (lambda: None)
        self.default_timeout = default_timeout
        self.pending_requests: dict[str, EscalationRequest] = {}

    def submit(self, request: EscalationRequest) -> str:
        """Submit a request for human review. Returns the request ID."""
        if request.risk_tier == "standard":
            # No gate needed for standard-tier operations
            raise ValueError(
                f"Risk tier '{request.risk_tier}' does not require approval gate"
            )

        request.timeout_after = self.default_timeout
        self.pending_requests[request.request_id] = request
        return request.request_id

    def resolve(self, request_id: str, decision: HumanDecision) -> None:
        """Process a human decision and execute the corresponding action."""
        if request_id not in self.pending_requests:
            raise KeyError(f"No pending escalation request: {request_id}")

        req = self.pending_requests.pop(request_id)

        # Anonymize sensitive data before logging for audit trail
        sanitized_context = self._sanitize(req.context_summary)

        if decision.result == DecisionResult.APPROVED:
            effective_action = decision.modifications or req.proposed_action
            self.on_approve(effective_action, request_id=req.request_id)
        elif decision.result == DecisionResult.REJECTED:
            self.on_reject(
                rejection_rationale=decision.rationale,
                request_id=req.request_id,
            )
        # TIMEOUT is handled by the background checker

    def _sanitize(self, text: str) -> str:
        """Remove PII from context before audit logging."""
        import re
        patterns = [
            (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]'),       # SSN
            (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]'),  # email
            (r'\b\d{16}\b', '[CARD]'),                    # credit card
        ]
        for pattern, replacement in patterns:
            text = re.sub(pattern, replacement, text)
        return text

    def check_timeouts(self) -> list[EscalationRequest]:
        """Background task — returns expired requests needing timeout fallback."""
        expired = [
            req for req in self.pending_requests.values() if req.is_expired
        ]
        for req in expired:
            self.on_timeout(request_id=req.request_id, action=req.proposed_action)
            del self.pending_requests[req.request_id]
        return expired
```

#### Pattern 2: Escalation Router with Confidence Thresholds

An escalation router evaluates AI model confidence scores and deterministic risk criteria to decide whether an operation proceeds autonomously or requires human review. This pattern scales by routing the majority of low-risk operations through while only escalating genuinely uncertain cases.

```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class EscalationPolicy:
    """
    Configurable escalation rules that determine when an AI operation
    requires human intervention based on confidence and risk factors.
    """
    action_name: str
    min_confidence_for_autonomy: float = 0.90
    max_transaction_amount: float = 10_000.0
    requires_review_after_execution: bool = True
    critical_keywords: list[str] = field(default_factory=list)
    escalation_channels: list[str] = field(
        default_factory=lambda: ["dashboard", "email"]
    )

    def evaluate(self, action_context: dict) -> tuple[bool, str]:
        """
        Determine if human review is required.

        Returns:
            (requires_review: bool, reason: str) — reason explains the
            escalation trigger for audit logging.
        """
        confidence = action_context.get("confidence_score", 1.0)
        amount = action_context.get("transaction_amount", 0)
        text_content = action_context.get("content", "")

        # Confidence-based escalation
        if confidence < self.min_confidence_for_autonomy:
            return True, (
                f"Confidence {confidence:.2f} below threshold "
                f"{self.min_confidence_for_autonomy}"
            )

        # Amount-based escalation
        if amount > self.max_transaction_amount:
            return True, (
                f"Transaction ${amount:,.2f} exceeds limit "
                f"${self.max_transaction_amount:,.2f}"
            )

        # Keyword-based escalation for domain-specific risks
        text_lower = text_content.lower()
        matched_keywords = [
            kw for kw in self.critical_keywords if kw.lower() in text_lower
        ]
        if matched_keywords:
            return True, (
                f"Sensitive keywords detected: {', '.join(matched_keywords)}"
            )

        return False, "All criteria within autonomy thresholds"


class EscalationRouter:
    """
    Routes AI operations to autonomous execution or human review
    based on configurable escalation policies.
    """

    def __init__(self) -> None:
        self.policies: dict[str, EscalationPolicy] = {}

    def register_policy(self, policy: EscalationPolicy) -> None:
        self.policies[policy.action_name] = policy

    def route(
        self, action_name: str, context: dict
    ) -> dict[str, Any]:
        """
        Evaluate the escalation decision for an AI operation.

        Returns a routing result dict with keys:
          - requires_human: bool
          - reason: str
          - policy_applied: str | None
          - confidence_score: float | None
        """
        policy = self.policies.get(action_name)
        if not policy:
            # No policy registered — default to full autonomy with post-review
            return {
                "requires_human": False,
                "reason": "No escalation policy; operating autonomously",
                "policy_applied": None,
                "confidence_score": context.get("confidence_score"),
            }

        requires_review, reason = policy.evaluate(context)

        result: dict[str, Any] = {
            "requires_human": requires_review,
            "reason": reason,
            "policy_applied": action_name,
            "confidence_score": context.get("confidence_score"),
        }

        if requires_review:
            # Enforce post-execution review for elevated-tier ops
            result["review_after_execution"] = policy.requires_review_after_execution  # noqa: E501

        return result
```

#### Pattern 3: Feedback Collection for RLHF Training

Captures human decisions and rationales during approval gate interactions to build preference datasets for Reinforcement Learning from Human Feedback.

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class RLHFFeedbackRecord:
    """
    A single feedback record for RLHF training pipelines.
    Captures the AI's state, its proposed action, the human decision,
    and any modifications applied by the operator.
    """
    record_id: str = field(default_factory=lambda: f"fb_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}")  # noqa: E501
    prompt_state: dict  # The AI's input state when making the decision
    ai_proposed_action: dict
    human_decision: str  # "approve", "reject", "modify"
    human_rationale: str
    operator_id: str
    action_modifications: Optional[dict] = None
    confidence_before: Optional[float] = None
    risk_tier: str = "standard"
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_training_sample(self) -> dict:
        """
        Convert to a training sample format compatible with
        standard RLHF pipelines (e.g., HuggingFace DPO/ORPO).
        """
        chosen_action = self.action_modifications or self.ai_proposed_action

        return {
            "prompt": self._serialize_prompt(self.prompt_state),
            "chosen": chosen_action,
            "rejected": self.ai_proposed_action if self.human_decision == "reject" else None,  # noqa: E501
            "meta": {
                "operator_id": self.operator_id,
                "risk_tier": self.risk_tier,
                "confidence_before": self.confidence_before,
                "rationale": self.human_rationale,
                "created_at": self.created_at.isoformat(),
            },
        }

    def _serialize_prompt(self, state: dict) -> str:
        """Serialize the AI's internal state into a prompt-compatible string."""
        return "\n".join(f"{k}: {v}" for k, v in state.items() if not k.startswith("_"))  # noqa: E501


class FeedbackCollector:
    """
    Collects and stores human decisions from approval gates
    for downstream RLHF training data pipelines.
    """

    def __init__(self) -> None:
        self._records: list[RLHFFeedbackRecord] = []

    def record(self, feedback: RLHFFeedbackRecord) -> str:
        """Store a feedback record and return its ID."""
        self._records.append(feedback)
        return feedback.record_id

    def query_by_risk_tier(self, risk_tier: str) -> list[RLHFFeedbackRecord]:
        return [r for r in self._records if r.risk_tier == risk_tier]

    def query_by_operator(self, operator_id: str) -> list[RLHFFeedbackRecord]:
        return [r for r in self._records if r.operator_id == operator_id]

    def export_training_dataset(self) -> list[dict]:
        """Export all records as training samples for RLHF."""
        return [r.to_training_sample() for r in self._records]
```

---

### BAD vs GOOD Examples

#### BAD: No Escalation Criteria — Fully Autonomous High-Risk Operation

```python
# ❌ BAD: AI executes fund transfers with zero human oversight.
# The model has no confidence threshold, no approval gate,
# and no escalation policy. A single hallucination could
# transfer millions to the wrong account.

def process_fund_transfer(user_id: str, amount: float, recipient: str) -> dict:
    # AI decides autonomously — no guardrails whatsoever
    recommendation = ai_model.predict(
        {"user_id": user_id, "amount": amount, "recipient": recipient}
    )
    if recommendation.get("is_fraud"):
        return {"status": "blocked", "reason": "fraud detected"}

    # Auto-executes without any human review
    execute_transfer(amount, recipient)
    log_transaction(user_id, amount, recipient)
    return {"status": "executed"}
```

#### GOOD: Confidence-Thresholded Escalation with Approval Gate

```python
# ✅ GOOD: Fund transfers over a threshold or with low AI confidence
# are routed through an approval gate. High-confidence, low-risk
# transfers proceed autonomously within defined bounds.

def process_fund_transfer(
    user_id: str,
    amount: float,
    recipient: str,
    gate: ApprovalGate,
    router: EscalationRouter,
) -> dict:
    confidence = ai_model.predict_confidence(
        {"user_id": user_id, "amount": amount, "recipient": recipient}
    )

    # Route through escalation policy
    context = {
        "confidence_score": confidence,
        "transaction_amount": amount,
    }
    routing = router.route("fund_transfer", context)

    if routing["requires_human"]:
        request = EscalationRequest(
            action_type="fund_transfer",
            proposed_action={
                "amount": amount,
                "recipient": recipient,
                "user_id": user_id,
            },
            confidence_score=confidence,
            risk_tier="critical",
            context_summary=f"Transfer ${amount} to {recipient}",
        )
        gate.submit(request)

        # Agent pauses — waits for human decision via gate.resolve()
        return {"status": "pending_approval", "request_id": request.request_id}

    # Autonomous within bounds — execute safely
    execute_transfer(amount, recipient)
    return {"status": "executed", "confidence": confidence}
```

#### BAD: Feedback Not Captured — Lost Training Signal

```python
# ❌ BAD: Human makes a decision on an escalation but the feedback
# is never stored. The AI system repeats the same mistake because
# there's no RLHF loop to learn from human corrections.

def handle_rejection(escalation_id: str, decision: HumanDecision) -> None:
    # Just logs the rejection — no training data captured
    audit_log.warn(f"Escalation {escalation_id} rejected: {decision.rationale}")
    # The AI never learns from this
```

#### GOOD: Feedback Captured for RLHF Pipeline

```python
# ✅ GOOD: Every human decision is recorded as an RLHF training sample.
# The feedback pipeline builds a growing dataset of human-preferred actions.

def handle_rejection(
    escalation_id: str,
    decision: HumanDecision,
    original_request: EscalationRequest,
    collector: FeedbackCollector,
) -> None:
    # Record rejection as RLHF training signal
    feedback = RLHFFeedbackRecord(
        prompt_state={"action": "fund_transfer", "amount": 50_000},
        ai_proposed_action=original_request.proposed_action,
        human_decision="reject",
        human_rationale=decision.rationale,
        operator_id=decision.operator_id,
        confidence_before=original_request.confidence_score,
        risk_tier="critical",
    )
    collector.record(feedback)

    audit_log.warn(
        f"Escalation {escalation_id} rejected. "
        f"Feedback recorded for RLHF: {feedback.record_id}"
    )
```

---

## Constraints

### MUST DO
- Define escalation criteria and risk tiers before writing any code — never add HITL as an afterthought
- Implement approval gates as atomic, interruptible operations that block execution until human response or timeout
- Anonymize PII (SSN, email, phone, financial data) before exposing it to human operators via sanitization pipelines
- Capture every human decision, rationale, and modification for RLHF training — lost feedback is a sunk cost
- Design timeout handling with explicit fallback behavior (safe-no-op, retry with reduced scope, or escalate higher tier)
- Structure decision augmentation outputs to include confidence scores, supporting evidence, alternatives considered, and uncertainty flags
- Implement full audit trails with queryable records by operator_id, timestamp range, and outcome
- Follow the 5 Laws of Elegant Defense from `code-philosophy`: early exit on guard conditions, parse-don't-validate at boundaries, atomic pure functions where possible, fail fast on invalid states, intentional naming that reads like English

### MUST NOT DO
- Deploy fully autonomous AI in domains with significant safety or financial risk without approval gates — even 99% accuracy leaves unacceptable failure surfaces
- Use HITL for high-volume, low-risk operations — the human bottleneck will destroy throughput and create operational drag
- Present unanonymized sensitive data to human operators — privacy violations compound every time PII is exposed in review dashboards
- Rely solely on confidence scores for escalation — combine with deterministic rules (amount thresholds, keyword flags) to prevent false negatives
- Allow AI recommendations to become de facto decisions by humans through poor UI design — clearly label suggestions as recommendations, not directives
- Skip feedback collection — without RLHF data, the system cannot improve and will repeat the same mistakes indefinitely

---

## Output Template

When this skill is active, your output must contain:

1. **Escalation Architecture** — Risk tier classification for every decision point in the workflow, with deterministic escalation criteria per tier
2. **Approval Gate Implementation** — Code for the gate mechanism including submit/resolve/timeout methods, sanitization pipeline, and audit logging
3. **Routing Logic** — Confidence-thresholded or rule-based escalation router that determines autonomous vs human-reviewed paths
4. **Feedback Schema** — Structured data capture for RLHF training with required fields validated against a schema
5. **Fallback Behavior** — Explicit timeout handling for each gate, specifying the safe action when no human response arrives within the configured window

---

## Related Skills

| Skill | Purpose |
|---|---|
| `exception-handling-recovery` | Handles runtime failures that may require human escalation; complements proactive HITL gates |
| `tool-use-function-calling` | Provides the tool integration layer that HITL gates wrap around autonomous operations |
| `goal-setting-monitoring` | Defines the success metrics and monitoring dashboards for tracking HITL effectiveness over time |

---

> 📖 skill(local cache): human-in-the-loop
