---
name: reasoning-engine-internals
description: Implements dual-provider reasoning architecture (Gemini + Claude orchestration), cross-model reasoning pipelines, token budget management, and AI-assisted development velocity tracking for production AI systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: infrastructure
  output-format: analysis
  triggers: dual provider reasoning, cross-model orchestration, Gemini Claude routing, reasoning engine, token budget management, AI development velocity, how do i combine multiple LLMs
  archetypes:
    - strategic
  anti_triggers:
    - single model deployment
    - simple prompt engineering
    - basic chatbot
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: resource-optimization, reasoning-techniques, agent-context-management
---

# Reasoning Engine Internals

Implements the architectural backbone of multi-model AI reasoning systems — orchestrating dual-provider pipelines (Gemini for synthesis, Claude for analysis), managing token budgets across reasoning steps, delegating code generation across specialized agents, and tracking AI-assisted development velocity at scale. This skill governs HOW to architect the reasoning engine that powers agents, not individual reasoning techniques like CoT or ReAct.

## TL;DR Checklist

- [ ] Map each incoming task to model capability profiles (synthesis vs analysis vs creative) before dispatching
- [ ] Implement dual-provider pipeline with explicit result merging and conflict resolution logic
- [ ] Allocate token budgets per reasoning step with early termination for simple queries and escalation for complex ones
- [ ] Deploy multi-agent code generation delegation with architect → implementer → reviewer handoff patterns
- [ ] Track AI development velocity metrics (code generation share, accuracy rate, latency) against industry benchmarks
- [ ] Measure reasoning quality via per-step confidence scoring, answer consistency checks, and latency-vs-accuracy tradeoff analysis
- [ ] Apply `code-philosophy` laws throughout — especially Law 1 (Early Exit) on budget exhaustion and Law 4 (Fail Fast) on model failures

---

## When to Use

Use this skill when:

- Architecting a production reasoning system that requires multiple LLM providers for optimal quality-to-cost ratio
- Designing cross-model pipelines where different models handle distinct reasoning phases (e.g., Gemini for creative synthesis, Claude for logical verification)
- Building multi-agent code generation workflows requiring role-based handoffs between architect, implementer, and reviewer agents
- Measuring AI-assisted development velocity across a team — tracking what percentage of code is AI-generated, at what quality threshold, and with what latency impact
- Managing token budgets in high-volume agent systems where cost control requires per-step allocation, early termination, and relevance scoring
- Operating in accuracy-critical domains (financial analysis, medical diagnostics, legal research) where single-model answers are insufficient and cross-validation across models is required

---

## When NOT to Use

Avoid this skill for:

- **Simple tasks solvable by a single model** — A straightforward code fix, documentation update, or basic query does not justify dual-provider overhead. Use `reasoning-techniques` (CoT/ReAct with a single model) instead.
- **Basic chatbot or prompt engineering projects** — If you are only designing conversational flows without multi-model reasoning depth, this architecture is over-engineering. Stick to simple prompt templates.
- **Single-model deployments with no scalability concerns** — If cost and latency are not constraints and a single model (e.g., GPT-4 or Claude Sonnet) handles all tasks adequately, dual-provider orchestration adds complexity without value.
- **Exploring reasoning techniques themselves** — If you need to learn about Chain-of-Thought, Tree of Thoughts, or ReAct patterns, use the `reasoning-techniques` skill. This skill assumes you already know those methods and focuses on how to compose them across models.

---

## Core Workflow

1. **Model Capability Mapping** — Classify each task by reasoning type (creative synthesis, logical analysis, factual retrieval, code generation) and map to the optimal model based on its strengths. Gemini 2.5 Pro excels at creative synthesis and multi-modal reasoning; Claude Opus 4 excels at analytical reasoning, logical verification, and structured output. Build a capability matrix that maps task categories to primary and fallback models.
   **Checkpoint:** Every task category must have a primary model, a fallback model, and an estimated token budget range before any dispatch occurs.

2. **Dual-Provider Task Assignment** — Route tasks through the dual-provider pipeline. For analytical tasks: send to Claude first for structured analysis, then pass the result to Gemini for synthesis and creative enrichment. For creative tasks: send to Gemini first for ideation, then to Claude for fact-checking and logical consistency verification. Merge results using weighted scoring based on confidence and domain expertise.
   **Checkpoint:** Both model responses must be received (or timeout after budget limit) before merging. If one provider fails, fall back to single-provider execution with a degraded-quality flag.

3. **Reasoning Execution with Token Budget Management** — Execute the reasoning pipeline while monitoring token consumption against per-step budgets. For simple queries (confidence ≥ 0.9), terminate reasoning early and return results immediately. For complex queries (confidence < 0.7), escalate to deeper reasoning with additional verification steps. Track relevance scoring for each message in the conversation turn to prioritize context window allocation for high-signal content.
   **Checkpoint:** Cumulative token usage must never exceed the total budget for the task. If approaching the limit (>85%), trigger early termination and return best-effort results with a budget-warning flag.

4. **Quality Verification via Cross-Model Consensus** — Compare outputs from different models for consistency on factual claims, logical conclusions, and numerical results. Use a confidence score per reasoning step (0.0–1.0) to weight each model's contribution during merging. For high-stakes decisions (financial, medical, legal), require unanimous agreement between models or escalate to a third-party verification model.
   **Checkpoint:** If cross-model disagreement exceeds the configured threshold (>15% on factual claims, >20% on recommendations), flag the output for human review before delivery.

5. **AI Development Velocity Tracking** — Measure and report AI-assisted development metrics: percentage of code lines generated by AI, first-pass acceptance rate, revision cycles per task, and average latency from request to deployed code. Compare against industry benchmarks (Google/Microsoft report 30%+ AI-generated code at scale). Track accuracy rates for AI-generated code (does it compile, pass tests, meet requirements?).
   **Checkpoint:** Velocity metrics must be computed at regular intervals (daily for teams, hourly for production CI pipelines) and surfaced in dashboards with trend analysis over 7-day and 30-day windows.

6. **Budget Monitoring and Adaptive Allocation** — Continuously monitor token usage patterns across all active tasks. Identify tasks that consistently exceed their budget and adjust allocation rules dynamically. Track cost-per-task, latency-per-reasoning-step, and accuracy-vs-cost tradeoffs to optimize the reasoning engine over time. Implement adaptive token reallocation: if one task completes early with surplus budget, redistribute tokens to a competing complex task.
   **Checkpoint:** Budget reports must be generated every hour showing per-task spend, remaining budget, predicted overrun risk, and recommended reallocation actions.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Dual-Provider Reasoning Pipeline

Orchestrate two LLM providers where each handles the task phase it excels at, then merge results with conflict resolution.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ModelType(str, Enum):
    GEMINI = "gemini_25_pro"
    CLAUDE = "claude_opus_4"


class TaskPhase(str, Enum):
    ANALYSIS_FIRST = "analysis_then_synthesis"   # Claude → Gemini
    CREATIVE_FIRST = "synthesis_then_verification"  # Gemini → Claude
    CONSENSUS_ONLY = "parallel_consensus"          # Both → merge by voting


@dataclass
class ModelResponse:
    """Normalized response from any LLM provider."""
    content: str
    model_type: ModelType
    confidence_score: float  # 0.0 to 1.0
    token_usage: int
    reasoning_steps: list[str] = field(default_factory=list)
    factual_claims: list[str] = field(default_factory=list)


@dataclass
class MergedResult:
    """Consolidated output from dual-provider pipeline."""
    final_content: str
    primary_model: ModelType
    consensus_score: float  # Agreement between models
    flags: list[str] = field(default_factory=list)  # e.g., "budget_warning", "low_consensus"


class DualProviderPipeline:
    """Orchestrates Gemini + Claude in a configurable reasoning pipeline.
    
    Follows code-philosophy Law 1 (Early Exit): terminates immediately
    when budget is exhausted or both models fail.
    """

    def __init__(
        self,
        phase_order: TaskPhase = TaskPhase.ANALYSIS_FIRST,
        max_tokens_per_model: int = 8192,
        consensus_threshold: float = 0.85,
        timeout_seconds: float = 30.0,
    ) -> None:
        self.phase_order = phase_order
        self.max_tokens_per_model = max_tokens_per_model
        self.consensus_threshold = consensus_threshold
        self.timeout_seconds = timeout_seconds

    def execute(self, task: str) -> MergedResult:
        """Run the dual-provider pipeline for a given task.
        
        Args:
            task: The reasoning task to process.
            
        Returns:
            MergedResult with consolidated output and quality metadata.
        """
        primary_model = ModelType.CLAUDE if self.phase_order == TaskPhase.ANALYSIS_FIRST else ModelType.GEMINI
        secondary_model = ModelType.GEMINI if self.phase_order == TaskPhase.ANALYSIS_FIRST else ModelType.CLAUDE

        # Step 1: Execute primary model (Fail Fast — Law 4)
        primary_response = self._invoke_model(primary_model, task)
        if primary_response.confidence_score < 0.3:
            return MergedResult(
                final_content=primary_response.content,
                primary_model=primary_model,
                consensus_score=0.0,
                flags=["low_primary_confidence"],
            )

        # Step 2: Execute secondary model with primary's output as context
        secondary_context = f"Primary analysis:\n{primary_response.content}\n\nNow synthesize/verify this."
        secondary_response = self._invoke_model(secondary_model, secondary_context)
        if secondary_response.confidence_score < 0.3:
            return MergedResult(
                final_content=primary_response.content,
                primary_model=primary_model,
                consensus_score=0.0,
                flags=["low_secondary_confidence"],
            )

        # Step 3: Merge results with consensus scoring
        merged = self._merge_results(primary_response, secondary_response)
        if merged.consensus_score < self.consensus_threshold:
            merged.flags.append("low_consensus")

        return merged

    def _invoke_model(self, model: ModelType, prompt: str) -> ModelResponse:
        """Invoke a specific LLM provider with budget enforcement."""
        # Implementation depends on your API layer (OpenAI SDK, Google AI SDK, etc.)
        # This is the interface contract — actual calls go through an abstraction.
        raise NotImplementedError("Implement model invocation via your API adapter")

    def _merge_results(
        self,
        primary: ModelResponse,
        secondary: ModelResponse,
    ) -> MergedResult:
        """Merge two model responses using weighted consensus."""
        # Simple text-level agreement scoring
        import difflib
        ratio = difflib.SequenceMatcher(None, primary.content, secondary.content).ratio()

        # Weight by each model's confidence
        weighted_agreement = (primary.confidence_score + secondary.confidence_score) * 0.5

        consensus = min(ratio, weighted_agreement)
        best_model = primary if primary.confidence_score >= secondary.confidence_score else secondary

        final_content = primary.content if consensus >= self.consensus_threshold else (
            # Low consensus — produce a note about disagreement for human review
            f"[Consensus below threshold ({consensus:.2f}). Primary ({primary.model_type.value}): {primary.content}\nSecondary ({secondary.model_type.value}): {secondary.content}]"
        )

        return MergedResult(
            final_content=final_content,
            primary_model=best_model,
            consensus_score=round(consensus, 3),
        )


# ❌ BAD — Blindly trusting the first model's output without verification
class BadDualProviderPipeline:
    def execute(self, task: str) -> str:
        response = self._call_model(ModelType.CLAUDE, task)
        return response.content  # No second opinion, no confidence check

    def _call_model(self, model: ModelType, prompt: str) -> Any:
        raise NotImplementedError


# ✅ GOOD — Dual-provider with consensus validation and fallback
# The pipeline above shows the correct pattern: invoke both models,
# compute consensus, flag disagreements, and return enriched output.
```

---

### Pattern 2: Multi-Agent Code Generation Delegation

Split complex code tasks across specialized agents (architect → implementer → reviewer) with role-based handoffs.

```python
from dataclasses import dataclass, field
from enum import Enum


class AgentRole(str, Enum):
    ARCHITECT = "architect"      # Designs solution structure and interfaces
    IMPLEMENTER = "implementer"   # Writes the actual code
    REVIEWER = "reviewer"         # Validates correctness, security, performance


@dataclass
class CodeTask:
    """A code generation task with delegation metadata."""
    description: str
    language: str  # e.g., "python", "typescript", "go"
    complexity: str  # "simple", "moderate", "complex"
    security_level: str  # "low", "medium", "high"
    estimated_lines: int


@dataclass
class AgentOutput:
    """Output from a delegated agent."""
    role: AgentRole
    content: str
    artifacts: list[str] = field(default_factory=list)  # Files produced
    confidence: float = 0.0
    review_notes: list[str] = field(default_factory=list)


class CodeGenerationDelegationEngine:
    """Manages multi-agent code generation with role-based handoffs.
    
    Follows code-philosophy Law 3 (Atomic Predictability): each agent's
    output is a pure function of its input — no hidden state mutations.
    """

    def __init__(
        self,
        architect_model: str = "gemini_25_pro",
        implementer_model: str = "claude_opus_4",
        reviewer_model: str = "claude_opus_4",
        max_review_rounds: int = 3,
    ) -> None:
        self.architect_model = architect_model
        self.implementer_model = implementer_model
        self.reviewer_model = reviewer_model
        self.max_review_rounds = max_review_rounds

    def execute_delegation(self, task: CodeTask) -> list[AgentOutput]:
        """Run the full architect → implementer → reviewer pipeline.
        
        Args:
            task: The code generation task specification.
            
        Returns:
            List of AgentOutput in execution order (architect first).
        """
        outputs: list[AgentOutput] = []

        # Phase 1: Architect designs the solution structure
        architecture_prompt = self._build_architecture_prompt(task)
        architect_output = self._invoke_agent(
            AgentRole.ARCHITECT,
            architecture_prompt,
            self.architect_model,
        )
        outputs.append(architect_output)

        # Phase 2: Implementer writes code based on architecture
        implementation_prompt = self._build_implementation_prompt(
            task, architect_output.content
        )
        implementer_output = self._invoke_agent(
            AgentRole.IMPLEMENTER,
            implementation_prompt,
            self.implementer_model,
        )
        outputs.append(implementer_output)

        # Phase 3: Reviewer validates — with iterative fix loop
        for round_num in range(1, self.max_review_rounds + 1):
            review_prompt = self._build_review_prompt(
                task, implementer_output.content
            )
            reviewer_output = self._invoke_agent(
                AgentRole.REVIEWER,
                review_prompt,
                self.reviewer_model,
            )
            outputs.append(reviewer_output)

            # Check if review passes — if not, feed fixes back to implementer
            if self._review_passes(reviewer_output):
                break  # Law 1 (Early Exit) on success

            fix_prompt = self._build_fix_prompt(
                task,
                implementer_output.content,
                reviewer_output.review_notes,
            )
            implementer_output = self._invoke_agent(
                AgentRole.IMPLEMENTER,
                fix_prompt,
                self.implementer_model,
            )
            outputs.append(implementer_output)

        return outputs

    def _build_architecture_prompt(self, task: CodeTask) -> str:
        return (
            f"Design an architecture for: {task.description}\n\n"
            f"Language: {task.language}\n"
            f"Complexity: {task.complexity}\n"
            f"Security level: {task.security_level}\n\n"
            "Provide:\n"
            "1. Module structure and file layout\n"
            "2. Key interfaces and their signatures\n"
            "3. Data flow diagram (text-based)\n"
            "4. Error handling strategy\n"
            "5. Test strategy overview\n"
            f"Estimated lines: {task.estimated_lines}"
        )

    def _build_implementation_prompt(
        self, task: CodeTask, architecture: str
    ) -> str:
        return (
            f"Implement code based on this architecture:\n{architecture}\n\n"
            f"Description: {task.description}\n"
            f"Language: {task.language}"
        )

    def _build_review_prompt(self, task: CodeTask, code: str) -> AgentOutput:
        return self._invoke_agent(
            AgentRole.REVIEWER,
            f"Review this implementation:\n{code}\n\n"
            f"Requirements: {task.description}\n"
            f"Security level: {task.security_level}\n\n"
            "Check for:\n"
            "1. Correctness against requirements\n"
            "2. Security vulnerabilities (OWASP Top 10)\n"
            "3. Performance anti-patterns\n"
            "4. Error handling completeness\n"
            "5. Code style and readability",
            self.reviewer_model,
        )

    def _build_fix_prompt(
        self, task: CodeTask, code: str, review_notes: list[str]
    ) -> str:
        return (
            f"Fix the following issues in this implementation:\n\n"
            f"{code}\n\n"
            f"Review findings:\n"
            + "\n".join(f"- {note}" for note in review_notes) + "\n\n"
            f"Original requirements: {task.description}"
        )

    def _invoke_agent(
        self, role: AgentRole, prompt: str, model: str
    ) -> AgentOutput:
        """Invoke the appropriate agent for a given role.
        
        Implementation depends on your agent framework (LangGraph, custom orchestrator, etc.)
        """
        raise NotImplementedError("Implement agent invocation via your orchestration layer")

    def _review_passes(self, review_output: AgentOutput) -> bool:
        """Determine if code passes review based on reviewer confidence and notes."""
        critical_issues = [
            note for note in review_output.review_notes
            if any(keyword in note.lower() for keyword in ("security", "vulnerability", "critical error", "data leak"))
        ]
        return (
            review_output.confidence >= 0.8
            and len(critical_issues) == 0
        )
```

---

### Pattern 3: Token Budget Allocator

Per-step token budget allocation with early termination, escalation, and relevance scoring for context window management.

```python
import time
from dataclasses import dataclass, field
from enum import Enum


class BudgetAction(str, Enum):
    CONTINUE = "continue"           # Normal execution
    EARLY_EXIT = "early_exit"       # Terminated due to low confidence + budget
    ESCALATE = "escalate"           # Complex task — allocate more tokens
    TRIM_CONTEXT = "trim_context"   # Relevance-based context window pruning


@dataclass
class BudgetState:
    """Tracks token budget state across reasoning steps."""
    total_budget: int               # Max tokens for the entire task
    step_budget: int                # Tokens allocated per reasoning step
    used_tokens: int = 0            # Cumulative consumption
    current_step: int = 0           # Step counter
    max_steps: int = 10             # Safety limit on reasoning depth


@dataclass
class BudgetDecision:
    """Action decision from the budget allocator."""
    action: BudgetAction
    remaining_budget: int
    recommended_next_action: str | None = None
    explanation: str = ""


class TokenBudgetAllocator:
    """Manages token allocation per reasoning step with adaptive behavior.
    
    Follows code-philosophy Law 2 (Parse Don't Validate): the budget state
    is parsed at boundaries and trusted internally — only validated once on
    entry, never re-parsed during execution.
    
    Follows code-philosophy Law 1 (Early Exit): terminates immediately when
    budget exhaustion is detected rather than degrading gracefully.
    """

    def __init__(
        self,
        total_budget: int = 32768,     # Default: ~32K context window
        step_budget: int = 4096,       # 4K per reasoning step
        max_steps: int = 10,           # Safety ceiling
    ) -> None:
        self.total_budget = total_budget
        self.step_budget = step_budget
        self.max_steps = max_steps

    def allocate(self, state: BudgetState) -> BudgetDecision:
        """Determine the next action based on current budget state.
        
        Args:
            state: Current budget tracking state.
            
        Returns:
            BudgetDecision with the recommended action and explanation.
        """
        # Early exit: budget exhausted
        if state.used_tokens >= self.total_budget:
            return BudgetDecision(
                action=BudgetAction.EARLY_EXIT,
                remaining_budget=0,
                explanation="Budget exhausted — terminating reasoning",
            )

        # Step limit reached
        if state.current_step >= self.max_steps:
            return BudgetDecision(
                action=BudgetAction.EARLY_EXIT,
                remaining_budget=self.total_budget - state.used_tokens,
                explanation="Max reasoning depth reached — returning best-effort result",
            )

        remaining = self.total_budget - state.used_tokens

        # Early exit for simple queries with high confidence
        if remaining > (self.step_budget * 4) and state.current_step == 0:
            return BudgetDecision(
                action=BudgetAction.EARLY_EXIT,
                remaining_budget=remaining,
                recommended_next_action="Return immediate answer without further reasoning",
                explanation="Sufficient budget for single-step answer — no need for deep reasoning",
            )

        # Escalation: complex task needs more tokens in next step
        if remaining < (self.step_budget * 2) and state.current_step > 0:
            return BudgetDecision(
                action=BudgetAction.ESCALATE,
                remaining_budget=remaining,
                recommended_next_action="Request budget increase for deeper analysis",
                explanation="Budget running low but task may need more depth — consider escalation",
            )

        # Normal operation: continue with allocated step budget
        return BudgetDecision(
            action=BudgetAction.CONTINUE,
            remaining_budget=remaining,
            recommended_next_action=f"Allocate {self.step_budget} tokens for reasoning step {state.current_step + 1}",
            explanation="Budget healthy — proceed with next reasoning step",
        )

    def record_usage(self, state: BudgetState, tokens_consumed: int) -> None:
        """Record token consumption for the current reasoning step.
        
        Args:
            state: Current budget state to update.
            tokens_consumed: Number of tokens used in this step (input + output).
        """
        state.used_tokens += tokens_consumed
        state.current_step += 1


class ContextRelevanceScorer:
    """Scores conversation messages by relevance to prioritize context window allocation.
    
    Used alongside TokenBudgetAllocator to decide which messages deserve
    retention in the context window when memory is constrained.
    """

    @staticmethod
    def score_message(
        message: str,
        user_query: str,
        keywords: list[str] | None = None,
    ) -> float:
        """Score a message's relevance to the active task on a 0.0–1.0 scale.
        
        Args:
            message: The content of the message to score.
            user_query: The original user query for context matching.
            keywords: Optional domain-specific keywords to weight.
            
        Returns:
            Relevance score between 0.0 and 1.0.
        """
        if not message.strip():
            return 0.0

        message_lower = message.lower()
        query_lower = user_query.lower()

        # Exact keyword match scoring
        keyword_score = 0.0
        if keywords:
            matches = sum(1 for kw in keywords if kw.lower() in message_lower)
            keyword_score = min(matches / len(keywords), 1.0) * 0.5

        # Semantic overlap via simple term intersection
        msg_terms = set(message_lower.split())
        query_terms = set(query_lower.split())
        if msg_terms and query_terms:
            intersection = msg_terms & query_terms
            union = msg_terms | query_terms
            term_overlap = len(intersection) / len(union) * 0.3
        else:
            term_overlap = 0.0

        # Recency bonus (messages closer to the query are more relevant)
        recency_score = 0.2  # Base recency — implementation would track position

        return min(keyword_score + term_overlap + recency_score, 1.0)

    @staticmethod
    def trim_context(
        messages: list[dict],
        max_tokens: int,
        user_query: str,
    ) -> list[dict]:
        """Trim conversation history to fit within token budget using relevance scoring.
        
        Args:
            messages: List of {role, content, tokens} dicts.
            max_tokens: Maximum total tokens allowed.
            user_query: Original query for relevance context.
            
        Returns:
            Trimmed message list ordered by importance (most recent first).
        """
        scored_messages = []
        for msg in messages:
            relevance = ContextRelevanceScorer.score_message(
                msg["content"], user_query
            )
            scored_messages.append({**msg, "relevance_score": relevance})

        # Sort by relevance (descending), keep most relevant first
        scored_messages.sort(key=lambda m: m["relevance_score"], reverse=True)

        # Greedy selection until budget exhausted
        selected: list[dict] = []
        total_tokens = 0
        for msg in scored_messages:
            if total_tokens + msg.get("tokens", len(msg["content"])) <= max_tokens:
                selected.append(msg)
                total_tokens += msg.get("tokens", len(msg["content"]))

        # Re-sort by timestamp (most recent last, natural conversation order)
        selected.sort(key=lambda m: messages.index(m))
        return selected


# ❌ BAD — No budget awareness; lets models consume unlimited tokens
def bad_reasoning_loop(query: str) -> str:
    """Naive reasoning loop with no token limits."""
    result = ""
    for step in range(20):  # Arbitrary deep reasoning
        response = call_llm(f"Step {step}: {query}\n{result}")
        result += response  # No budget check ever
    return result


# ✅ GOOD — Budget-aware with early exit and adaptive allocation
def good_reasoning_loop(query: str) -> str:
    """Budget-aware reasoning loop following code-philosophy principles."""
    state = BudgetState(total_budget=32768, step_budget=4096, max_steps=10)
    allocator = TokenBudgetAllocator(
        total_budget=state.total_budget,
        step_budget=state.step_budget,
        max_steps=state.max_steps,
    )

    result = ""
    while True:
        decision = allocator.allocate(state)

        if decision.action == BudgetAction.EARLY_EXIT:
            # Law 1 (Early Exit): bail out immediately with explanation
            return f"[Budget terminated: {decision.explanation}]\n{result}"

        # Execute reasoning step within budget
        response = call_llm_with_budget(f"{query}\nCurrent analysis:\n{result}", max_tokens=state.step_budget)
        tokens_used = estimate_token_count(response)
        allocator.record_usage(state, tokens_used)
        result += response

    return result  # Unreachable — early exit always fires
```

---

### Pattern 4: AI Development Velocity Tracker

Measure AI-assisted development velocity — code generation share, accuracy tracking, and latency metrics against industry benchmarks.

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum


class TaskOutcome(str, Enum):
    ACCEPTED = "accepted"         # Code accepted on first pass
    REVISIONS_NEEDED = "revisions_needed"  # Required iterations before acceptance
    REJECTED = "rejected"         # AI output rejected entirely
    PARTIALLY_USED = "partially_used"  # Some AI code kept, rest rewritten


@dataclass
class CodeGenerationEvent:
    """A single AI-assisted code generation event."""
    timestamp: datetime
    task_type: str  # e.g., "feature", "bugfix", "refactor", "test"
    language: str
    estimated_lines_ai: int       # Lines generated by AI
    total_lines_changed: int      # Total lines changed in the diff
    revision_cycles: int          # Number of iterations needed
    time_to_first_output_sec: float  # Latency until first code from AI
    final_acceptance_time_sec: float   # Total time from request to acceptance
    outcome: TaskOutcome
    reviewer: str | None = None


@dataclass
class VelocityMetrics:
    """Aggregated AI development velocity metrics for a time window."""
    period_start: datetime
    period_end: datetime
    total_events: int
    ai_code_share_pct: float         # Percentage of code generated by AI
    first_pass_acceptance_rate: float  # Accepted without revisions / total
    avg_revision_cycles: float
    avg_latency_sec: float           # Average time_to_first_output_sec
    accuracy_rate: float             # Events where output met requirements
    outcomes_distribution: dict[str, int] = field(default_factory=dict)


class AIVelocityTracker:
    """Tracks and analyzes AI-assisted development velocity metrics.
    
    Benchmarks for reference (Google/Microsoft internal data, 2025):
    - AI-generated code share: 30%+ at scale
    - First-pass acceptance rate: 60–75% for experienced teams
    - Average latency to first output: 15–45 seconds
    
    Follows code-philosophy Law 3 (Atomic Predictability): metrics are
    computed from immutable event data — no shared mutable state.
    """

    def __init__(self, team_id: str = "default") -> None:
        self.team_id = team_id
        self.events: list[CodeGenerationEvent] = []

    def record_event(self, event: CodeGenerationEvent) -> None:
        """Record a code generation event.
        
        Args:
            event: The complete event data from AI-assisted development.
        """
        self.events.append(event)

    def compute_metrics(self, window_days: int = 7) -> VelocityMetrics:
        """Compute velocity metrics for the specified time window.
        
        Args:
            window_days: Number of days to look back (default 7).
            
        Returns:
            VelocityMetrics with aggregated statistics.
        """
        cutoff = datetime.now() - timedelta(days=window_days)
        recent_events = [e for e in self.events if e.timestamp >= cutoff]

        if not recent_events:
            return VelocityMetrics(
                period_start=cutoff,
                period_end=datetime.now(),
                total_events=0,
                ai_code_share_pct=0.0,
                first_pass_acceptance_rate=0.0,
                avg_revision_cycles=0.0,
                avg_latency_sec=0.0,
                accuracy_rate=0.0,
            )

        # AI code share: total AI lines / total changed lines
        total_ai_lines = sum(e.estimated_lines_ai for e in recent_events)
        total_lines = sum(e.total_lines_changed for e in recent_events)
        ai_share = (total_ai_lines / total_lines * 100) if total_lines > 0 else 0.0

        # First-pass acceptance rate
        accepted_count = sum(1 for e in recent_events if e.outcome == TaskOutcome.ACCEPTED)
        first_pass_rate = accepted_count / len(recent_events) if recent_events else 0.0

        # Average revision cycles
        avg_revisions = sum(e.revision_cycles for e in recent_events) / len(recent_events)

        # Average latency
        avg_latency = sum(e.time_to_first_output_sec for e in recent_events) / len(recent_events)

        # Accuracy: events where AI output met requirements (ACCEPTED or PARTIALLY_USED)
        accurate_count = sum(
            1 for e in recent_events
            if e.outcome in (TaskOutcome.ACCEPTED, TaskOutcome.PARTIALLY_USED)
        )
        accuracy_rate = accurate_count / len(recent_events)

        # Outcome distribution
        outcome_dist: dict[str, int] = {}
        for event in recent_events:
            key = event.outcome.value
            outcome_dist[key] = outcome_dist.get(key, 0) + 1

        return VelocityMetrics(
            period_start=cutoff,
            period_end=datetime.now(),
            total_events=len(recent_events),
            ai_code_share_pct=round(ai_share, 2),
            first_pass_acceptance_rate=round(first_pass_rate, 3),
            avg_revision_cycles=round(avg_revisions, 2),
            avg_latency_sec=round(avg_latency, 2),
            accuracy_rate=round(accuracy_rate, 3),
            outcomes_distribution=outcome_dist,
        )

    def check_benchmarks(self, metrics: VelocityMetrics) -> list[str]:
        """Check current metrics against industry benchmarks.
        
        Returns a list of findings (warnings or confirmations).
        """
        findings: list[str] = []

        # AI code share benchmark
        if metrics.ai_code_share_pct < 20:
            findings.append(
                f"⚠️ Low AI adoption: {metrics.ai_code_share_pct:.1f}% AI-generated code "
                f"(target: 30%+ at Google/Microsoft scale)"
            )
        elif metrics.ai_code_share_pct >= 30:
            findings.append(f"✅ Strong AI adoption: {metrics.ai_code_share_pct:.1f}% AI-generated code")

        # First-pass acceptance rate
        if metrics.first_pass_acceptance_rate < 0.60:
            findings.append(
                f"⚠️ Low first-pass acceptance: {metrics.first_pass_acceptance_rate*100:.0f}% "
                f"(target: 60-75% for experienced teams)"
            )

        # Latency benchmark
        if metrics.avg_latency_sec > 45:
            findings.append(
                f"⚠️ High latency: {metrics.avg_latency_sec:.0f}s avg to first output "
                f"(target: 15-45 seconds)"
            )

        # Revision cycle count
        if metrics.avg_revision_cycles > 3:
            findings.append(
                f"⚠️ Excessive revision cycles: {metrics.avg_revision_cycles:.1f} avg "
                f"(indicates poor initial AI output quality or unclear prompts)"
            )

        return findings


# ❌ BAD — No tracking; development velocity is unmeasured and unoptimized
def bad_velocity_tracking() -> None:
    """No metrics collected — impossible to measure AI impact."""
    # Developer writes code, ships it, never asks: how much was AI?
    # How fast? How accurate? Without data, optimization is guesswork.
    pass


# ✅ GOOD — Comprehensive velocity tracking with benchmark comparison
def good_velocity_tracking(tracker: AIVelocityTracker) -> dict:
    """Generate a velocity report with actionable insights."""
    metrics = tracker.compute_metrics(window_days=7)
    findings = tracker.check_benchmarks(metrics)

    return {
        "period": f"{metrics.period_start.date()} to {metrics.period_end.date()}",
        "total_ai_tasks": metrics.total_events,
        "ai_code_share_pct": metrics.ai_code_share_pct,
        "first_pass_acceptance_rate": metrics.first_pass_acceptance_rate,
        "avg_revision_cycles": metrics.avg_revision_cycles,
        "avg_latency_sec": metrics.avg_latency_sec,
        "accuracy_rate": metrics.accuracy_rate,
        "outcomes": metrics.outcomes_distribution,
        "benchmark_findings": findings,
    }
```

---

## Constraints

### MUST DO
- **Map tasks to model capabilities** — Before dispatching any task, classify its reasoning type and select the optimal primary model based on documented strengths (Gemini: synthesis/creative; Claude: analysis/logical). Never guess which model fits.
- **Implement dual-provider pipelines with explicit merge logic** — Every cross-model workflow must have a defined result merging strategy with conflict resolution (consensus scoring, weighted averaging, or voting). Do not silently discard one model's output.
- **Allocate token budgets per reasoning step** — Enforce per-step and total budgets. Simple queries get early termination; complex queries get escalation. Never allow unbounded token consumption.
- **Deploy multi-agent delegation with role boundaries** — Each agent in the architect → implementer → reviewer chain must have a clearly defined, non-overlapping responsibility set. Handoff artifacts (architecture specs, review reports) must be explicit and structured.
- **Track AI development velocity metrics at regular intervals** — Record code generation share, first-pass acceptance rate, revision cycles, latency, and accuracy. Report on 7-day and 30-day windows against industry benchmarks (30%+ AI code at Google/Microsoft scale).
- **Measure reasoning quality via per-step confidence scoring** — Every reasoning step must produce a confidence score (0.0–1.0). Cross-model consensus checks must run on factual claims and numerical results. Disagreements above threshold trigger human review flags.
- **Follow `code-philosophy` (5 Laws of Elegant Defense) throughout:**
  - Law 1 (Early Exit): Terminate reasoning immediately when budget is exhausted or both models fail — do not continue degraded.
  - Law 4 (Fail Fast): Log detailed context on every model failure (provider, error type, step number) before surfacing errors to users.
  - Law 3 (Atomic Predictability): Agent outputs are pure functions of their inputs — no hidden state mutations between handoffs.
- **Design fallback chains for every provider failure** — When a primary model is unavailable or returns low-confidence output, the system must gracefully degrade to secondary provider or single-provider mode with appropriate quality flags.

### MUST NOT DO
- **Route all tasks through both models regardless of complexity** — A simple "fix this typo" does not need dual-provider orchestration. Match pipeline depth to task complexity (Law 1: early exit for simple queries).
- **Merge conflicting model outputs by averaging text** — Text content cannot be meaningfully averaged. Use consensus scoring, voting on recommendations, or flag disagreements for human review instead.
- **Allow any single model's latency to block the entire pipeline** — If one provider times out, return the other model's result with a degradation flag rather than waiting indefinitely or returning nothing.
- **Track velocity metrics without accuracy measurements** — High AI code share with 40% acceptance rate is a failure, not a success. Always pair volume metrics (lines generated) with quality metrics (acceptance rate, compilation success).
- **Design agent handoffs without structured artifacts** — The architect's output must be a spec the implementer can follow verbatim. Without structured handoff documents, delegation becomes "pass the prompt" — which is not delegation, it's just sequential prompting.
- **Skip budget monitoring for production reasoning systems** — Unbounded token consumption in multi-model pipelines causes uncontrolled cost escalation. Every production deployment must have per-task budget enforcement with hourly reporting (code-philosophy Law 1: fail fast on budget exhaustion).

---

## Output Template

When applying this skill to architect, audit, or operate a reasoning engine, produce the following structured output:

1. **Reasoning Architecture Diagram** — ASCII flow showing model selection logic, dual-provider pipeline stages, agent delegation handoff points, and fallback routing paths with all data flows between components.

2. **Model Capability Mapping Table** — For each task category (analysis, synthesis, creative, code generation, factual retrieval): list primary model, fallback model, typical token budget range, expected latency, and known failure modes.

3. **Token Budget Specification** — Current per-step and total budget allocations, early termination thresholds, escalation triggers, relevance scoring parameters for context window management, and the adaptive reallocation strategy.

4. **Multi-Agent Delegation Plan** — Role definitions (architect, implementer, reviewer), handoff artifact specifications, max review rounds, conflict resolution rules when reviewers disagree, and rollback procedure on total failure.

5. **Velocity Metrics Report** — Current AI code generation share (%), first-pass acceptance rate, average revision cycles, latency to first output, accuracy rate, outcome distribution, benchmark comparison (vs 30%+ industry standard), and trend over 7-day/30-day windows.

6. **Reasoning Quality Dashboard Spec** — Per-step confidence score tracking methodology, cross-model consensus thresholds (factual claims >15% disagreement triggers review, recommendations >20% triggers review), answer consistency check procedure across repeated runs, and latency-vs-accuracy tradeoff analysis framework.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `resource-optimization` | Model routing based on query complexity — complements this skill's budget management with cost-aware dispatch |
| `reasoning-techniques` | CoT, ToT, ReAct reasoning methods — individual techniques that compose within the dual-provider pipeline |
| `agent-context-management` | Conversation context window strategies — works alongside this skill's token budget allocator for context optimization |

---

## Live References

> Authoritative documentation links for reasoning engine architecture. The model follows markdown links at load time to resolve external references and inline content.

- [Agentic Design Patterns by Antonio Gulli](https://www.packtpub.com/product/agentic-design-patterns/9781835460439) — Appendix F: Under the Hood — Inside the Agents' Reasoning Engines, pp. 403–415
- [code-philosophy](../../code-philosophy/) — The 5 Laws of Elegant Defense

---

## 📎 Reference: External: https://www.packtpub.com/product/agentic-design-patterns/9781835460439 (relevant excerpts)

> Source: `https://www.packtpub.com/product/agentic-design-patterns/9781835460439`
### Appendix F — Under the Hood: Inside the Agents' Reasoning Engines (pp. 403–415)

Key findings from production reasoning engine architectures:

**Dual-Provider Reasoning**: Combining Gemini 2.5 Pro + Claude Opus 4 for different reasoning tasks — Gemini excels at creative synthesis and multi-modal understanding; Claude Opus 4 excels at analytical reasoning, logical verification, and structured output generation. The combination achieves higher quality than either model alone on complex tasks requiring both creativity and rigor.

**Context Management**: Token budget allocation across conversation turns using relevance scoring for message prioritization. High-signal messages (user query, architect outputs, reviewer findings) retain priority in the context window; low-signal messages (intermediate reasoning steps with low confidence) are trimmed first when memory is constrained.

**Multi-Agent Code Generation Delegation**: Splitting complex code tasks across specialized agents — architect (designs structure and interfaces), implementer (writes actual code), reviewer (validates correctness, security, performance). Role-based handoffs with structured artifacts ensure each agent has the precise information needed for its phase.

**AI-Assisted Development Velocity Statistics**: Measuring AI code generation impact reveals that top organizations (Google, Microsoft) achieve 30%+ AI-generated code at scale. Key metrics tracked: code share percentage, first-pass acceptance rate, revision cycles per task, time-to-first-output latency, and compilation/test success rate for AI-generated code.

**Reasoning Engine Architecture**: Model selection based on task complexity using a capability matrix. Reasoning depth calibration determines when to use shallow reasoning (simple queries) vs deep multi-step verification (complex analysis). Confidence scoring per reasoning step enables adaptive budget allocation — early exit on high confidence, escalation on low confidence.

**Cross-Model Reasoning Pipelines**: Using multiple models in a pipeline where each handles its strength domain. For analytical tasks: Claude first (structured analysis), then Gemini (creative enrichment). For creative tasks: Gemini first (ideation), then Claude (fact-checking and consistency verification). Result merging uses weighted consensus scoring with conflict flagging.

**Token Budget Management**: Per-step budget allocation with early termination for simple queries (confidence ≥ 0.9 returns immediately) and escalation pathways for complex ones (budget increase request when confidence < 0.7 after multiple steps). Relevance scoring prioritizes high-signal messages in context window management.

**Reasoning Quality Metrics**: Step-by-step confidence scores enable tracking of reasoning quality at every phase. Answer consistency checks across multiple runs identify models that produce variable outputs on the same prompt. Latency-vs-accuracy tradeoff analysis helps optimize cost-quality balance per task category.

---

## Related Skills (Detailed)

### `resource-optimization`
While this skill focuses on *which models to use* and *how to compose them*, `resource-optimization` covers the complementary problem of *routing queries to the right model based on complexity*. Together they form a complete cost-quality optimization stack: resource-optimization handles coarse-grained model selection, reasoning-engine-internals handles fine-grained multi-model orchestration.

### `reasoning-techniques`
This skill governs the infrastructure that hosts reasoning techniques. `reasoning-techniques` (CoT, ToT, ReAct, PAL) teaches you how individual models reason internally. `reasoning-engine-internals` teaches you how to compose those techniques across multiple models in a production pipeline. Use both together when building complex multi-stage reasoning systems.

### `agent-context-management`
Token budget management is one half of context optimization; the other half is semantic relevance within the context window. `agent-context-management` covers conversation memory strategies, retrieval-augmented patterns, and context compression techniques that work alongside this skill's token allocator to keep agents responsive under tight memory constraints.
