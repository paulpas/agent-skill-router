---
name: agent-engineering-practices
description: Applies traditional software engineering rigor to AI agents through checkpoint/rollback state management, modular architecture, structured observability logging, and least-privilege permissions for production-grade reliability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: infrastructure
  output-format: code
  triggers: engineering reliable agents, checkpoint rollback, structured logging observability, modular agent architecture, least privilege permissions, how do i make agents production ready, fault tolerance agents
  archetypes: [orchestration]
  anti_triggers:
    - content policy enforcement
    - input sanitization only
    - output filtering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  related-skills: guardrails-safety,exception-handling-recovery,agent-observability
---

# Agent Engineering Practices Pattern

Applies traditional software engineering rigor to AI agents through checkpoint/rollback state management, modular architecture design, structured observability logging, and least-privilege permissions. This skill makes the model treat agents as complex systems that demand proven engineering disciplines — fault tolerance, state durability, modularity, and operational observability — rather than treating them as monolithic prompt-response pipelines.

## TL;DR Checklist

- [ ] Implement checkpoint/rollback as transactional state management for all agent actions
- [ ] Design modular architecture with specialized sub-agents instead of monolithic agents
- [ ] Add structured logging capturing full chain of thought, tool calls, and confidence scores
- [ ] Enforce least-privilege permissions — minimum required access only
- [ ] Set up fault isolation so individual failures don't cascade through the system
- [ ] Document blast radius analysis for each agent's permission set

---

## When to Use

Use this skill when:

- Building production-grade agents that must be reliable, auditable, and debuggable
- An existing monolithic agent is brittle, difficult to maintain, or hard to debug
- You need full observability into agent decision-making (tools called, reasoning steps, confidence)
- Designing multi-agent systems where fault isolation between components is critical
- Compliance requires audit trails of every agent action and decision

## When NOT to Use

Avoid this skill for:

- Simple prototype agents that won't reach production
- Single-purpose agents with well-understood failure modes (e.g., a calculator)
- Agents running in fully sandboxed environments where blast radius is already zero
- Early ideation phases before the agent's core behavior is stable

---

## Core Workflow

1. **Modular Architecture Design** — Decompose the agent into specialized sub-agents or tools, each with a single responsibility (e.g., data retrieval, analysis, communication). Avoid monolithic agents that do everything. Each component must have clear interfaces and failure boundaries. **Checkpoint:** Every sub-agent has exactly one documented responsibility; no sub-agent performs more than 3 distinct operations.
2. **Checkpoint/Rollback System** — Design checkpoints as transactional state commits. After each meaningful action (tool call, state mutation, decision), save the validated state. Rollback is the mechanism for fault tolerance when downstream operations fail. **Checkpoint:** Every checkpoint includes enough context to fully reconstruct the agent's state at that point.
3. **Structured Observability** — Implement logging that captures the full chain of thought: which tools were called, what data was received, reasoning for the next step, and confidence scores for decisions. This goes beyond simple print statements to structured JSON logs queryable by trace ID. **Checkpoint:** Every log entry includes a trace_id linking all related entries across sub-agents.
4. **Least-Privilege Permission Model** — Grant each agent the absolute minimum set of permissions required for its task. An agent that summarizes news articles should only access the news API, not read private files or interact with other company systems. This limits blast radius. **Checkpoint:** Run a permission audit listing every tool/API an agent accesses; remove any permission not directly required for its documented responsibility.
5. **Fault Isolation Testing** — Test that failures in one sub-agent do not cascade to others. Simulate timeouts, rate limits, and unexpected responses for each component independently. **Checkpoint:** All fault isolation tests pass; no single-point failure can bring down the entire agent system.
6. **Blast Radius Analysis** — Document the maximum potential damage from any single agent's failure or compromise. This includes data access scope, external system mutation capability, and downstream dependencies. Use this to calibrate least-privilege permissions. **Checkpoint:** Blast radius document is reviewed quarterly and updated when agents gain new capabilities.

---

## Implementation Patterns

### Pattern 1: Transactional Checkpoint/Rollback System

```python
from dataclasses import dataclass, field
from typing import Any
import uuid
from datetime import datetime


@dataclass
class AgentCheckpoint:
    """A validated state snapshot of the agent at a specific point in execution."""

    checkpoint_id: str = ""
    trace_id: str = ""
    step: int  # Order within the execution flow
    state_snapshot: dict[str, Any]  # Full agent state at this point
    confidence_scores: dict[str, float]  # Confidence per decision made
    tools_called: list[str]  # Which tools were invoked before this checkpoint
    timestamp: str = ""

    def __post_init__(self) -> None:
        if not self.checkpoint_id:
            self.checkpoint_id = uuid.uuid4().hex[:12]
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()


class CheckpointManager:
    """Manages transactional checkpoints and rollbacks for agent state durability.

    Each checkpoint is a validated 'commit' of the agent's work. Rollback restores
    to a previous validated state — treating agent execution like a database
    transaction with commit and rollback semantics.
    """

    def __init__(self) -> None:
        self._checkpoints: dict[str, list[AgentCheckpoint]] = {}  # trace_id -> [checkpoints]

    def create_checkpoint(
        self,
        trace_id: str,
        step: int,
        state: dict[str, Any],
        confidence_scores: dict[str, float],
        tools_called: list[str],
    ) -> AgentCheckpoint:
        """Create a validated checkpoint — a 'commit' of agent state.

        Args:
            trace_id: Unique identifier for the execution trace.
            step: Ordered position within the execution flow.
            state: Full copy of the agent's state at this point.
            confidence_scores: Confidence scores per decision made before this checkpoint.
            tools_called: List of tool names invoked before this checkpoint.

        Returns:
            The created AgentCheckpoint instance.
        """
        checkpoint = AgentCheckpoint(
            trace_id=trace_id,
            step=step,
            state_snapshot=dict(state),  # Shallow copy for safety
            confidence_scores=dict(confidence_scores),
            tools_called=list(tools_called),
        )

        if trace_id not in self._checkpoints:
            self._checkpoints[trace_id] = []
        self._checkpoints[trace_id].append(checkpoint)

        return checkpoint

    def rollback_to(
        self,
        trace_id: str,
        target_step: int | None = None,
    ) -> dict[str, Any] | None:
        """Rollback agent state to a previous checkpoint — a 'transaction rollback'.

        If target_step is None, rolls back to the most recent checkpoint.
        If target_step is provided, finds the latest checkpoint at or before that step.

        Args:
            trace_id: The execution trace to restore from.
            target_step: Optional step number to roll back to. Most recent if omitted.

        Returns:
            Restored state snapshot dict, or None if no checkpoints exist for the trace.
        """
        if trace_id not in self._checkpoints:
            return None

        checkpoints = sorted(self._checkpoints[trace_id], key=lambda c: c.step, reverse=True)

        # Find the latest checkpoint at or before target_step
        if target_step is not None:
            restored = next((c for c in checkpoints if c.step <= target_step), None)
        else:
            restored = checkpoints[0]  # Most recent

        if restored is None:
            return None

        return dict(restored.state_snapshot)

    def get_trace_history(self, trace_id: str) -> list[dict]:
        """Get the full execution history for a trace — used for observability.

        Args:
            trace_id: The execution trace to retrieve history for.

        Returns:
            List of dicts containing checkpoint summaries ordered by step.
        """
        if trace_id not in self._checkpoints:
            return []

        return [
            {
                "checkpoint_id": c.checkpoint_id,
                "step": c.step,
                "tools_called": c.tools_called,
                "confidence_scores": c.confidence_scores,
                "timestamp": c.timestamp,
            }
            for c in sorted(self._checkpoints[trace_id], key=lambda x: x.step)
        ]

    def get_latest_checkpoint(self, trace_id: str) -> AgentCheckpoint | None:
        """Get the most recent checkpoint — used to determine current state.

        Args:
            trace_id: The execution trace to query.

        Returns:
            The latest AgentCheckpoint, or None if no checkpoints exist.
        """
        checkpoints = self._checkpoints.get(trace_id, [])
        return max(checkpoints, key=lambda c: c.step) if checkpoints else None
```

### Pattern 2: Modular Sub-Agent Architecture

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class AgentRole(str, Enum):
    """Enumeration of valid sub-agent roles — each maps to a single responsibility."""

    DATA_RETRIEVAL = "data_retrieval"
    ANALYSIS = "analysis"
    COMMUNICATION = "communication"
    TOOL_EXECUTION = "tool_execution"


@dataclass
class SubAgentConfig:
    """Configuration for a specialized sub-agent.

    Each config defines the agent's role, permissions, and operational limits.
    Permissions are explicitly scoped — no implicit access.
    """

    role: AgentRole
    name: str
    permissions: list[str]  # Tools/APIs this agent can access
    max_tokens: int = 1024
    description: str = ""


@dataclass
class SubAgentResponse:
    """Standardized response from any sub-agent.

    Provides a uniform contract so the orchestrator can handle all sub-agent
    responses without knowing their internal structure.
    """

    role: AgentRole
    result: Any
    confidence: float
    trace_id: str
    tools_used: list[str] = field(default_factory=list)
    error: str | None = None


class BaseSubAgent(ABC):
    """Base class for all specialized sub-agents — each has exactly one responsibility.

    Subclasses must implement `execute()` with atomic behavior: one operation,
    one checkpoint, one permission set enforced.
    """

    def __init__(self, config: SubAgentConfig, checkpoint_mgr: "CheckpointManager") -> None:
        self._config = config
        self._checkpoints = checkpoint_mgr

    @abstractmethod
    def execute(self, input_data: dict[str, Any], trace_id: str) -> SubAgentResponse:
        """Execute this sub-agent's single responsibility. Must be atomic — one operation."""
        ...  # pragma: no cover

    def _create_checkpoint(
        self,
        trace_id: str,
        step: int,
        state: dict[str, Any],
        confidence: float,
        tools: list[str],
    ) -> None:
        """Helper: create a checkpoint after this sub-agent's operation.

        Args:
            trace_id: Execution trace identifier.
            step: Ordered position in the workflow.
            state: State snapshot to commit.
            confidence: Confidence score for this operation.
            tools: Tools invoked during this operation.
        """
        self._checkpoints.create_checkpoint(
            trace_id=trace_id,
            step=step,
            state=dict(state),
            confidence_scores={"confidence": confidence},
            tools_called=list(tools),
        )


class DataRetrievalAgent(BaseSubAgent):
    """Specialized agent: responsible only for fetching data from external sources.

    Never performs analysis or communication — those are separate agents' jobs.
    All tool calls go through the permission enforcer.
    """

    def execute(self, input_data: dict, trace_id: str) -> SubAgentResponse:
        """Execute data retrieval with permission-enforced tool calls.

        Args:
            input_data: Must contain 'queries' list of tool names to invoke.
            trace_id: Execution trace identifier.

        Returns:
            SubAgentResponse with retrieved data and confidence score.

        Raises:
            PermissionError: If a query references a tool not in this agent's permission set.
        """
        results = self._execute_with_permissions(input_data["queries"], self._config.permissions)

        checkpoint = {
            "data_fetched": len(results),
            "sources_used": list(set(r.get("source") for r in results if isinstance(r, dict))),
        }
        self._create_checkpoint(
            trace_id=trace_id,
            step=1,
            state=checkpoint,
            confidence=0.95,
            tools=input_data["queries"],
        )

        return SubAgentResponse(
            role=self._config.role,
            result=results,
            confidence=0.95,
            trace_id=trace_id,
            tools_used=list(input_data["queries"]),
        )

    def _execute_with_permissions(
        self, queries: list[str], allowed_tools: list[str]
    ) -> list[dict]:
        """Execute only the tools explicitly granted in this agent's permission set.

        Args:
            queries: List of tool names to invoke.
            allowed_tools: Permission-enforced whitelist.

        Returns:
            List of result dicts from each invoked tool.

        Raises:
            PermissionError: If any query references an unauthorized tool.
        """
        results = []
        for query in queries:
            if query not in allowed_tools:
                raise PermissionError(
                    f"Agent {self._config.name} lacks permission for tool: {query}"
                )
            # Execute tool...
            results.append({"tool": query, "data": "retrieved"})
        return results


class AnalysisAgent(BaseSubAgent):
    """Specialized agent: responsible only for analyzing data from the retrieval agent.

    Never fetches external data — that is DataRetrievalAgent's sole responsibility.
    This strict separation of concerns prevents coupling and simplifies testing.
    """

    def execute(self, input_data: dict, trace_id: str) -> SubAgentResponse:
        """Execute analysis using only the provided data — no external tool calls.

        Args:
            input_data: Must contain 'data' (list of dicts) and optional 'analysis_type'.
            trace_id: Execution trace identifier.

        Returns:
            SubAgentResponse with analysis results and confidence score.
        """
        analysis_result = self._analyze(
            input_data["data"], input_data.get("analysis_type", "summary")
        )

        checkpoint = {
            "analysis_type": analysis_result["type"],
            "findings_count": len(analysis_result.get("findings", [])),
        }
        self._create_checkpoint(trace_id, 2, checkpoint, 0.87, [])

        return SubAgentResponse(
            role=self._config.role,
            result=analysis_result,
            confidence=0.87,
            trace_id=trace_id,
        )

    def _analyze(self, data: list[dict], analysis_type: str) -> dict:
        """Perform the specified analysis on the provided data.

        Args:
            data: List of data dicts to analyze.
            analysis_type: Type of analysis to perform (e.g., 'summary', 'trend').

        Returns:
            Dict containing analysis type and list of findings.
        """
        return {
            "type": analysis_type,
            "findings": [f"Finding from {analysis_type}" for _ in data],
        }


class AgentOrchestrator:
    """Coordinates specialized sub-agents without any agent doing everything.

    The orchestrator routes inputs to the appropriate sub-agent and handles
    inter-agent error propagation — but never performs domain operations itself.
    """

    def __init__(
        self,
        sub_agents: list[BaseSubAgent],
        checkpoint_mgr: CheckpointManager,
    ) -> None:
        self._agents = {a._config.name: a for a in sub_agents}
        self._checkpoints = checkpoint_mgr

    def execute_workflow(
        self, input_data: dict, trace_id: str | None = None
    ) -> list[SubAgentResponse]:
        """Execute a workflow across specialized sub-agents — each handles its own responsibility.

        Faults in one sub-agent do not prevent the orchestrator from reporting what
        completed successfully. Checkpoints survive failures for potential rollback.

        Args:
            input_data: Input data for the workflow.
            trace_id: Optional execution trace identifier (auto-generated if omitted).

        Returns:
            List of SubAgentResponses from each executed sub-agent.
        """
        if not trace_id:
            trace_id = uuid.uuid4().hex[:12]

        results: list[SubAgentResponse] = []

        # Step 1: Data Retrieval (isolated fault boundary)
        try:
            retrieval = self._agents["data_retrieval"].execute(input_data, trace_id)
            results.append(retrieval)
        except Exception as e:
            # Failure in retrieval doesn't affect analysis agent — it was never called.
            return [
                SubAgentResponse(
                    role="orchestrator",
                    result=None,
                    confidence=0.0,
                    trace_id=trace_id,
                    error=f"Data retrieval failed: {e}",
                )
            ]

        # Step 2: Analysis (uses only retrieval's output)
        try:
            analysis = self._agents["analysis"].execute(
                {
                    "data": retrieval.result,
                    "analysis_type": input_data.get("analysis_type", "summary"),
                },
                trace_id,
            )
            results.append(analysis)
        except Exception as e:
            # Analysis failed — but retrieval already completed and checkpointed.
            # Can rollback to retrieval state if needed.
            results.append(
                SubAgentResponse(
                    role="orchestrator",
                    result=None,
                    confidence=0.0,
                    trace_id=trace_id,
                    error=f"Analysis failed: {e}",
                )
            )

        return results
```

### Pattern 3: Structured Observability Logger

```python
import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from datetime import datetime


class LogSeverity(str, Enum):
    """Severity levels for structured log entries."""

    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class StructuredLogEntry:
    """A single structured log entry capturing the agent's chain of thought.

    Each entry is queryable by trace_id and includes enough context to reconstruct
    what happened, why it happened, and how confident the agent was in its decision.
    """

    trace_id: str
    step: int
    timestamp: str
    severity: LogSeverity
    agent_role: str  # Which sub-agent produced this log
    event_type: str  # tool_call, decision, checkpoint, error, confidence_score
    payload: dict[str, Any]

    def to_json(self) -> str:
        """Serialize this entry to a JSON string for storage or transmission.

        Returns:
            JSON-serialized representation of the log entry.
        """
        return json.dumps(
            {
                "trace_id": self.trace_id,
                "step": self.step,
                "timestamp": self.timestamp,
                "severity": self.severity.value,
                "agent_role": self.agent_role,
                "event_type": self.event_type,
                **self.payload,
            }
        )


class StructuredLogger:
    """Captures the full chain of thought — not just final output.

    Every tool call, decision, error, and confidence score is recorded with a
    shared trace_id so the entire execution can be replayed or audited.
    """

    def __init__(self, trace_id: str, agent_name: str) -> None:
        self._trace_id = trace_id
        self._agent_name = agent_name
        self._entries: list[StructuredLogEntry] = []

    def log_tool_call(
        self,
        step: int,
        tool_name: str,
        arguments: dict[str, Any],
        result_summary: str,
        confidence: float,
    ) -> None:
        """Log a tool call with full context — what was called, why, and the outcome.

        Args:
            step: Execution step number.
            tool_name: Name of the tool invoked.
            arguments: Arguments passed to the tool.
            result_summary: Brief description of the tool's result.
            confidence: Confidence score for this action.
        """
        self._entries.append(
            StructuredLogEntry(
                trace_id=self._trace_id,
                step=step,
                timestamp=datetime.now().isoformat(),
                severity=LogSeverity.DEBUG,
                agent_role=self._agent_name,
                event_type="tool_call",
                payload={
                    "tool": tool_name,
                    "arguments": arguments,
                    "result_summary": result_summary,
                    "confidence": confidence,
                },
            )
        )

    def log_decision(
        self,
        step: int,
        decision_type: str,
        reasoning: str,
        confidence: float,
        alternatives_considered: list[str] | None = None,
    ) -> None:
        """Log a decision point — what the agent chose and why.

        Args:
            step: Execution step number.
            decision_type: Category of decision (e.g., 'analysis_choice').
            reasoning: Natural-language explanation of the reasoning.
            confidence: Confidence score for this decision.
            alternatives_considered: List of rejected alternatives, if any.
        """
        self._entries.append(
            StructuredLogEntry(
                trace_id=self._trace_id,
                step=step,
                timestamp=datetime.now().isoformat(),
                severity=LogSeverity.INFO,
                agent_role=self._agent_name,
                event_type="decision",
                payload={
                    "decision_type": decision_type,
                    "reasoning": reasoning,
                    "confidence": confidence,
                    "alternatives_considered": alternatives_considered or [],
                },
            )
        )

    def log_error(self, step: int, error_message: str, context: dict[str, Any]) -> None:
        """Log an error with full context for debugging.

        Args:
            step: Execution step where the error occurred.
            error_message: Human-readable description of the error.
            context: Additional contextual data (masked — never log raw secrets).
        """
        self._entries.append(
            StructuredLogEntry(
                trace_id=self._trace_id,
                step=step,
                timestamp=datetime.now().isoformat(),
                severity=LogSeverity.ERROR,
                agent_role=self._agent_name,
                event_type="error",
                payload={
                    "error_message": error_message,
                    "context": context,
                },
            )
        )

    def get_trace(self) -> list[str]:
        """Return the complete trace for a request — used for debugging and audit.

        Returns:
            List of JSON-serialized log entries in execution order.
        """
        return [entry.to_json() for entry in self._entries]


# BAD — No observability beyond final output
# agent = MyAgent()
# result = agent.process(user_input)  # If it fails, you know nothing about what went wrong.

# GOOD — Full chain of thought captured
# logger = StructuredLogger(trace_id=uuid4().hex[:12], agent_name="analysis_agent")
# logger.log_tool_call(step=1, tool_name="search_api", arguments={"query": "stock price AAPL"},
#                      result_summary="Found $185.23", confidence=0.92)
# logger.log_decision(step=2, decision_type="analysis_choice", reasoning="Using moving average for trend analysis",
#                     confidence=0.87, alternatives_considered=["volatility analysis", "volume analysis"])
# # ... later, if something fails:
# trace = logger.get_trace()  # Full history of what happened, queryable by trace_id
```

### Pattern 4: Least-Privilege Permission Enforcer

```python
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PermissionPolicy:
    """Defines which tools/APIs an agent role can access.

    All fields are explicitly scoped — the absence of a permission means denial.
    This implements the principle of least privilege by default.
    """

    role: str
    allowed_tools: list[str]
    allowed_api_endpoints: list[str] = field(default_factory=list)
    max_tokens_per_request: int = 4096
    description: str = ""


class PermissionEnforcer:
    """Enforces least-privilege — agents only access what they're explicitly granted.

    Default behavior is deny-all. Only tools/APIs listed in a registered policy
    are accessible to an agent role.
    """

    def __init__(self) -> None:
        self._policies: dict[str, PermissionPolicy] = {}
        # Default deny: if not in policy, nothing is allowed

    def register_policy(self, policy: PermissionPolicy) -> None:
        """Register a least-privilege permission policy for an agent role.

        Args:
            policy: The PermissionPolicy to register. Duplicate registrations
                    overwrite existing policies for the same role.
        """
        self._policies[policy.role] = policy

    def check_permission(self, agent_role: str, tool_name: str) -> bool:
        """Check if an agent role is permitted to use a specific tool.

        Args:
            agent_role: The role of the agent requesting access.
            tool_name: The name of the tool being requested.

        Returns:
            True if the tool is in the policy's allowed_tools list. False if
            the agent has no policy (default deny) or the tool is not permitted.
        """
        if agent_role not in self._policies:
            return False  # Default deny — no permission means no access

        policy = self._policies[agent_role]
        return tool_name in policy.allowed_tools

    def get_allowed_tools(self, agent_role: str) -> list[str]:
        """Return the complete set of tools an agent is permitted to use.

        Args:
            agent_role: The role to query.

        Returns:
            Copy of the allowed_tools list, or empty list if no policy exists.
        """
        if agent_role not in self._policies:
            return []
        return list(self._policies[agent_role].allowed_tools)

    def audit_permissions(self, agent_role: str) -> dict[str, Any]:
        """Audit what permissions an agent has — used for blast radius analysis.

        Calculates a blast_radius estimate based on the breadth of allowed tools.

        Args:
            agent_role: The role to audit.

        Returns:
            Dict containing role, allowed tools/endpoints, token limits, and
            estimated blast radius classification.
        """
        if agent_role not in self._policies:
            return {
                "role": agent_role,
                "error": "No permission policy found (default deny)",
                "allowed_tools": [],
                "blast_radius": "none",
            }

        policy = self._policies[agent_role]
        tool_count = len(policy.allowed_tools)
        blast_radius = (
            "low"
            if tool_count <= 2
            else "medium" if tool_count <= 5 else "high"
        )

        return {
            "role": agent_role,
            "allowed_tools": policy.allowed_tools,
            "allowed_endpoints": policy.allowed_api_endpoints,
            "max_tokens": policy.max_tokens_per_request,
            "blast_radius": blast_radius,
        }


# BAD — Agent has unrestricted access to all tools
# agent = MyAgent()  # Can call ANY tool — if compromised, full blast radius

# GOOD — Least-privilege enforced per agent role
# enforcer = PermissionEnforcer()
# enforcer.register_policy(PermissionPolicy(
#     role="news_summarizer",
#     allowed_tools=["news_api.search", "news_api.get_article"],
#     allowed_api_endpoints=["https://api.news.com/v1/search", "https://api.news.com/v1/articles/{id}"],
#     description="Can only fetch news articles — cannot access user data or other systems"
# ))
# assert enforcer.check_permission("news_summarizer", "news_api.search") is True  # Allowed
# assert enforcer.check_permission("news_summarizer", "database.query") is False  # Denied
# audit = enforcer.audit_permissions("news_summarizer")
# # blast_radius: "low" — agent can only access news APIs
```

## Constraints

### MUST DO

1. Design each sub-agent with exactly one responsibility — never let an agent do both data retrieval AND analysis AND communication.
2. Create checkpoints after every meaningful state mutation, including the full context needed for rollback.
3. Log tool calls, decisions, and confidence scores using structured JSON with trace IDs — not print statements.
4. Enforce least-privilege by default — no agent has access to any tool or API unless explicitly listed in its permission policy.
5. Run fault isolation tests on every sub-agent independently before integrating into the full workflow.
6. Maintain a blast radius audit document reviewed quarterly for each agent role.
7. Reference `code-philosophy` (5 Laws of Elegant Defense): fail fast on permission violations, early exit when checkpoint state is invalid, atomic predictability in sub-agent boundaries.
8. Treat checkpoints as transactional commits — each must be fully validated before accepting it.

### MUST NOT DO

1. Build monolithic agents that handle all responsibilities — this creates brittle, un-debuggable systems.
2. Skip checkpoints during agent execution — without state snapshots, failure recovery is impossible.
3. Log raw user data in observability entries — mask sensitive information (PII, API keys) in all log payloads.
4. Grant agents more permissions than their documented responsibility requires — review quarterly.
5. Assume that one agent's error handling is sufficient for the entire system — each sub-agent must handle its own faults.
6. Use string-based logging without structured fields — if you can't query logs by trace_id, you don't have observability.

---

## Output Template

When this skill is active, deliver:

1. **Modular architecture diagram** — ASCII showing sub-agents, their responsibilities, and data flow between them
2. **Checkpoint design** — CheckpointManager implementation with rollback logic for the agent's state machine
3. **Sub-agent definitions** — Each sub-agent class with its single responsibility, input/output contracts, and permission set
4. **Observability configuration** — StructuredLogger setup with trace_id propagation across all sub-agents
5. **Permission policies** — Least-privilege policy for each agent role with blast radius assessment
6. **Fault isolation test plan** — List of failure scenarios to test per sub-agent independently

---

## Related Skills

| Skill | Purpose |
| --- | --- |
| `guardrails-safety` | Guardrails handle content safety; engineering practices handle system reliability (both layers needed) |
| `exception-handling-recovery` | Exception handling focuses on error recovery; engineering practices add checkpoint/rollback and modularity |
| `agent-observability` | Agent observability tracks performance; this skill adds the structured logging patterns for chain-of-thought capture |

> 📖 skill(local cache): guardrails-safety, exception-handling-recovery, agent-observability
