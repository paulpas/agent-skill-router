---
name: orchestration-frameworks
description: Designs and implements orchestration frameworks for multi-agent systems including LangGraph, AutoGen, CrewAI, Temporal, and Prefect with workflow patterns, state management, and fault tolerance.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: orchestration framework, multi-agent system, agent coordination, workflow engine, langgraph, autogen, crewai, temporal, task orchestration, agent routing
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types: [guidance, examples, do-dont, diagrams]
  related-skills: task-decomposition-engine, parallel-skill-runner, confidence-based-selector
---

# Orchestration Framework Engineering

Architects and implements orchestration frameworks that coordinate multi-agent systems, manage workflow state, and handle fault tolerance. You design the control plane that determines how agents delegate tasks, share context, and recover from failures.

## TL;DR Checklist

- [ ] Map agent capabilities to available tools before selecting an orchestration pattern
- [ ] Design explicit state machine for multi-step workflows — never rely on implicit ordering
- [ ] Implement circuit breaker pattern for all inter-agent communication paths
- [ ] Define fallback routing for every branching point with at least one alternative path
- [ ] Select framework based on workload type: synchronous (LangGraph) vs asynchronous (Temporal) vs collaborative (CrewAI)
- [ ] Instrument every step with structured logging, trace IDs, and latency metrics
- [ ] Test failure injection before deploying to production

---

## When to Use

Use this skill when:

- Designing a multi-agent system where tasks span 3+ agents with non-trivial dependencies
- Building a workflow engine that requires state persistence, checkpointing, and recovery from crashes
- Coordinating agent collaboration across distributed processes or microservice boundaries
- Implementing human-in-the-loop approval gates within an automated agent pipeline
- Architecting event-driven agent meshes where agents react to shared events on a bus
- Migrating from ad-hoc script-based agent coordination to a structured orchestration layer

---

## When NOT to Use

Avoid this skill for:

- Single-agent tasks or linear scripts — use `code-philosophy` (5 Laws of Elegant Defense) and direct implementation instead. Overhead outweighs benefit for workflows under 3 steps.
- Real-time trading execution where latency is sub-millisecond — orchestration layers add unpredictable overhead. Use synchronous function calls directly.
- Read-heavy analytical queries on static datasets — these don't involve agent coordination or workflow state.

---

## Core Workflow

### 1. Classify Orchestration Pattern

Determine which pattern fits the workload by analyzing the dependency graph of agent tasks:

**Sequential Pipeline:** Tasks execute in strict order with data flowing forward. Example: ingest → transform → validate → report. Use when outputs are deterministic and dependencies are linear.

**Parallel Fan-Out / Fan-In:** One initiator dispatches N independent subtasks, then aggregates results. Example: send 5 research agents different topics simultaneously, collect summaries. Use when subtasks are independent and latency-critical.

**Hierarchical Delegation:** A supervisor agent decomposes tasks, delegates to worker agents, and synthesizes outputs. Example: project manager agent assigns coding, testing, and documentation to specialist agents. Use when tasks have inherent role-based specialization.

**Dynamic Graph:** The next node in the workflow is determined at runtime based on intermediate results. Example: a code-analysis agent routes to either "fix-bugs" or "add-features" based on its findings. Use when branching depends on computed outcomes.

```
                    +-------------------+
                    |   Task Classifier  |
                    +--------+----------+
                             |
            +----------------+----------------+
            |                |                |
     Sequential Pipeline   Fan-Out/Fan-In   Dynamic Graph
            |                |                |
    A -> B -> C          Init -> [X,Y,Z]    Init -> NodeA -> ?
                            |    |    |        (route at runtime)
                         Result collected & merged
```

**Checkpoint:** Verify no circular dependencies exist in the task dependency graph before proceeding. Run a topological sort on your agent DAG — if it fails, restructure the dependency graph.

### 2. Select Orchestration Engine

Choose based on workload characteristics and operational requirements:

| Workload Type | Recommended Engine | Why |
|---|---|---|
| Deterministic sequential flows with shared state | LangGraph (StateGraph) | Typed state, explicit edges, human-in-the-loop built-in |
| Async distributed workflows with retries & recovery | Temporal.io | Durable execution, exactly-once semantics, saga support |
| Multi-agent collaborative research / brainstorming | CrewAI or AutoGen | Role-based agents, conversation loops, tool sharing |
| Event-driven agent mesh (reactive architecture) | Custom event bus + agent registry | Decoupled agents, pub/sub routing, horizontal scaling |
| Scheduled batch pipelines with complex DAGs | Prefect | UI for DAG visualization, retry policies, notifications |

**Decision matrix:**

```python
def select_orchestration_engine(workload: dict) -> str:
    """Select orchestration engine based on workload characteristics.
    
    Args:
        workload: Dict with keys: latency_sensitivity (high/med/low),
                  state_persistence_required (bool), retry_count (int),
                  human_approval_needed (bool), agent_count (int)
    
    Returns:
        Engine name string
    """
    if workload.get("human_approval_needed") and workload["retry_count"] <= 3:
        return "langgraph"
    elif workload.get("state_persistence_required") and workload["retry_count"] > 3:
        return "temporal"
    elif workload["agent_count"] > 5:
        return "crewai" if workload.get("collaborative", False) else "temporal"
    elif workload.get("latency_sensitivity") == "high":
        return "langgraph"
    else:
        return "prefect"
```

**Checkpoint:** Confirm selected framework supports required features: state persistence, retry policies, and human-in-the-loop capabilities. Cross-check against the feature matrix of each engine.

### 3. Define Shared State Schema

Design the shared state structure that all agents read/write. Use typed schemas with Pydantic to enforce contracts:

```python
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any, Literal
from enum import Enum
import datetime


class AgentStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class OrchestrationState(BaseModel):
    """Typed schema for multi-agent orchestration shared state.
    
    Defines the contract between orchestrator and all participating agents.
    Fields marked with docstrings as @input or @output indicate which
    agents must declare them in their capability schema.
    """
    # Workflow metadata (global, set by orchestrator)
    workflow_id: str = Field(description="@input orchestrator-generated UUID")
    status: AgentStatus = AgentStatus.PENDING
    created_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)
    updated_at: datetime.datetime = Field(default_factory=datetime.datetime.utcnow)

    # Shared context (global, readable by all agents)
    context: dict[str, Any] = Field(default_factory=dict, description="@readable all_agents")
    
    # Per-agent result slots (global, written by assigned agent, read by downstream)
    agent_results: dict[str, Any] = Field(default_factory=dict, description="@writable <assigned_agent>")

    # Routing metadata (local per agent during execution)
    routing_decision: Optional[dict[str, Any]] = Field(default=None, description="@write router")
    fallback_triggered: bool = False
    retry_count: int = 0
    max_retries: int = 3

    @field_validator("agent_results")
    @classmethod
    def validate_result_structure(cls, v: dict) -> dict:
        """Ensure all results contain required fields."""
        for agent_name, result in v.items():
            if not isinstance(result, dict):
                raise ValueError(f"Result for {agent_name} must be a dict")
            if "status" not in result or "output" not in result:
                raise ValueError(
                    f"Result for {agent_name} missing 'status' or 'output' keys"
                )
        return v

    def mark_agent_complete(self, agent_name: str, output: Any, error: Optional[str] = None) -> None:
        """Mark an agent's task as complete with its output."""
        self.agent_results[agent_name] = {
            "status": "completed" if error is None else "failed",
            "output": output,
            "error": error,
            "completed_at": datetime.datetime.utcnow().isoformat(),
        }
        self.updated_at = datetime.datetime.utcnow()
```

**Checkpoint:** Validate state schema covers all data paths between agents; no agent should write to state it doesn't declare in its input schema. Run a static analysis pass that verifies each agent's declared inputs/outputs against the `OrchestrationState` fields.

### 4. Implement Agent Routing and Delegation

Write the routing logic that routes tasks to appropriate agents based on capability matching, confidence scores, and current load:

```python
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass
class AgentCapability:
    """Declares what an agent can do, its reliability profile, and current load."""
    name: str
    tools: list[str] = field(default_factory=list)
    confidence_score: float = Field(default=0.5, ge=0.0, le=1.0)
    max_concurrent_tasks: int = 5
    current_load: int = 0
    fallback_chain: list[str] = field(default_factory=list)


class CapabilityRouter:
    """Routes tasks to agents based on capability matching and load balancing.
    
    Follows the principle of capability-based discovery over hard-coded routing.
    Implements graceful degradation through fallback chains.
    """
    
    def __init__(self) -> None:
        self.agents: dict[str, AgentCapability] = {}
        self.routing_log: list[dict] = []

    def register_agent(self, capability: AgentCapability) -> None:
        self.agents[capability.name] = capability

    def route_task(
        self,
        task_description: str,
        required_tools: list[str],
    ) -> dict[str, Any]:
        """Route a task to the best available agent.
        
        Args:
            task_description: Natural language description of the task.
            required_tools: List of tool names the task requires.
            
        Returns:
            Routing decision with assigned agent, rationale, and fallback chain.
        """
        candidates = self._score_agents(required_tools)
        
        if not candidates:
            decision = self._build_no_candidates_decision(task_description, required_tools)
        else:
            best_agent = candidates[0]
            decision = self._build_routing_decision(best_agent, task_description, required_tools)

        # Log every routing decision for auditability (code-philosophy: Intentional Naming)
        self.routing_log.append(decision)
        return decision

    def _score_agents(self, required_tools: list[str]) -> list[AgentCapability]:
        """Score and sort agents by capability match and available capacity."""
        scored = []
        for agent in self.agents.values():
            tool_overlap = len(set(required_tools) & set(agent.tools))
            score = (tool_overlap / max(len(required_tools), 1)) * agent.confidence_score
            
            # Penalize overloaded agents
            if agent.current_load >= agent.max_concurrent_tasks:
                score *= 0.1  # Still consider as last resort if fallback chain exists
            
            scored.append((score, agent))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [agent for _, agent in scored if agent.current_load < agent.max_concurrent_tasks or agent.fallback_chain]

    def _build_routing_decision(
        self,
        agent: AgentCapability,
        task_description: str,
        required_tools: list[str],
    ) -> dict[str, Any]:
        """Build a structured routing decision with rationale."""
        return {
            "assigned_agent": agent.name,
            "rationale": f"Matched tools: {len(set(required_tools) & set(agent.tools))}/{len(required_tools)}, confidence: {agent.confidence_score:.2f}",
            "fallback_chain": agent.fallback_chain if agent.current_load >= agent.max_concurrent_tasks else [],
            "timestamp": datetime.datetime.utcnow().isoformat(),
            "trace_id": f"route-{datetime.datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{agent.name}",
        }

    def _build_no_candidates_decision(
        self, task_description: str, required_tools: list[str]
    ) -> dict[str, Any]:
        """Handle case where no agent can fulfill the task."""
        return {
            "assigned_agent": None,
            "rationale": f"No agent supports tools: {required_tools}",
            "fallback_chain": [],
            "error": "UNROUTABLE_TASK",
            "timestamp": datetime.datetime.utcnow().isoformat(),
        }
```

**Checkpoint:** Every routing decision must have a logged fallback path; no silent failures. Verify the `routing_log` contains at least one entry with a non-empty `fallback_chain` when testing degraded scenarios.

### 5. Add Fault Tolerance Layers

Implement circuit breakers, retry with exponential backoff, and checkpoint-based recovery:

```python
import time
import asyncio
from typing import Callable, TypeVar
from enum import Enum


T = TypeVar("T")


class CircuitState(str, Enum):
    CLOSED = "closed"       # Normal operation
    OPEN = "open"           # Failures exceeded threshold; reject calls
    HALF_OPEN = "half_open" # Testing if service recovered


class CircuitBreaker:
    """Circuit breaker for inter-agent communication.
    
    Protects against cascading failures when an agent becomes unavailable.
    Uses a sliding window failure counter with configurable thresholds.
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        half_open_max_calls: int = 1,
    ) -> None:
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        
        self._failure_count: int = 0
        self._success_count: int = 0
        self._state: CircuitState = CircuitState.CLOSED
        self._last_failure_time: float = 0.0
        self._half_open_calls: int = 0

    @property
    def state(self) -> CircuitState:
        """Transition to half-open if recovery timeout has elapsed."""
        if self._state == CircuitState.OPEN and \
           time.monotonic() - self._last_failure_time >= self.recovery_timeout:
            self._state = CircuitState.HALF_OPEN
            self._half_open_calls = 0
        return self._state

    @property
    def is_available(self) -> bool:
        """Check if the circuit allows calls through."""
        current_state = self.state
        if current_state == CircuitState.CLOSED:
            return True
        if current_state == CircuitState.HALF_OPEN:
            return self._half_open_calls < self.half_open_max_calls
        return False

    def record_success(self) -> None:
        """Record a successful call. Reset circuit on recovery."""
        if self.state == CircuitState.HALF_OPEN:
            self._success_count += 1
            if self._success_count >= self.half_open_max_calls:
                self._reset()
        elif self.state == CircuitState.CLOSED:
            self._failure_count = max(0, self._failure_count - 1)

    def record_failure(self) -> None:
        """Record a failed call. Open circuit if threshold reached."""
        self._failure_count += 1
        self._last_failure_time = time.monotonic()
        
        if self._failure_count >= self.failure_threshold:
            self._state = CircuitState.OPEN

    def _reset(self) -> None:
        """Reset circuit breaker to closed state."""
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0

    def __call__(self, func: Callable[..., T]) -> Callable[..., T]:
        """Decorator to wrap a function with circuit breaker protection."""
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            if not self.is_available:
                raise CircuitOpenError(
                    f"Circuit '{self.name}' is OPEN. "
                    f"Failures: {self._failure_count}/{self.failure_threshold}"
                )
            
            try:
                result = await func(*args, **kwargs)
                self.record_success()
                return result
            except Exception as e:
                self.record_failure()
                raise CircuitDownstreamError(
                    f"Circuit '{self.name}' failed: {e}"
                ) from e
        
        return wrapper


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open and call is rejected."""
    pass


class CircuitDownstreamError(Exception):
    """Raised when the downstream agent/service call fails."""
    pass


async def retry_with_backoff(
    func: Callable[..., T],
    max_retries: int = 3,
    base_delay: float = 1.0,
    backoff_multiplier: float = 2.0,
    exceptions_to_retry: tuple[type[Exception], ...] = (CircuitDownstreamError,),
) -> T:
    """Retry a function with exponential backoff and jitter.
    
    Implements the pattern from code-philosophy Law 3 (Atomic Predictability):
    each retry is an isolated, deterministic attempt.
    
    Args:
        func: Async callable to retry.
        max_retries: Maximum number of retry attempts.
        base_delay: Initial delay in seconds before first retry.
        backoff_multiplier: Multiplier for exponential backoff.
        exceptions_to_retry: Tuple of exception types that trigger a retry.
        
    Returns:
        The result of the successful function call.
        
    Raises:
        The last exception if all retries are exhausted.
    """
    last_exception: Exception | None = None
    
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except exceptions_to_retry as e:
            last_exception = e
            if attempt < max_retries:
                delay = base_delay * (backoff_multiplier ** attempt)
                # Add jitter to prevent thundering herd
                import random
                jittered_delay = delay * (0.5 + random.random() * 0.5)
                time.sleep(jittered_delay)
    
    raise last_exception  # type: ignore[misc]


async def select_fallback_agent(
    primary_agent: str,
    fallback_chain: list[str],
    circuit_breakers: dict[str, CircuitBreaker],
) -> str | None:
    """Select the first available fallback agent from the chain.
    
    Args:
        primary_agent: The name of the failed primary agent.
        fallback_chain: Ordered list of fallback agent names.
        circuit_breakers: Registry of circuit breakers per agent.
        
    Returns:
        Name of an available fallback agent, or None if all unavailable.
    """
    # Always try primary first (it may have recovered)
    if primary_agent in circuit_breakers and circuit_breakers[primary_agent].is_available:
        return primary_agent
    
    for fallback in fallback_chain:
        if fallback in circuit_breakers and circuit_breakers[fallback].is_available:
            return fallback
    
    return None
```

**Checkpoint:** Test failure injection — kill one agent mid-workflow and verify the system recovers to last consistent state. Verify that the circuit breaker transitions from CLOSED → OPEN → HALF_OPEN → CLOSED through a full cycle under simulated conditions.

### 6. Add Observability

Instrument every orchestration step with structured logging, trace IDs, and metrics:

```python
import json
import logging
from contextvars import ContextVar
from typing import Any


# Trace ID propagated across agent boundaries via context variables
trace_id_var: ContextVar[str] = ContextVar("trace_id", default="unknown")
span_id_var: ContextVar[str] = ContextVar("span_id", default="unknown")

logger = logging.getLogger("orchestration")


def set_trace_context(trace_id: str, span_id: str) -> None:
    """Set trace context for the current execution flow."""
    trace_id_var.set(trace_id)
    span_id_var.set(span_id)


def log_orchestration_event(
    event_type: str,
    agent_name: str | None,
    step: str,
    details: dict[str, Any],
    level: str = "info",
) -> None:
    """Log structured orchestration events for observability.
    
    Every event includes trace_id for end-to-end correlation across
    agent boundaries. Follows the code-philosophy constraint that all
    observable behavior must be instrumented.
    """
    trace_id = trace_id_var.get()
    span_id = span_id_var.get()
    
    log_entry = {
        "trace_id": trace_id,
        "span_id": span_id,
        "event_type": event_type,  # routing_decision, agent_start, agent_complete, error, circuit_breaker, fallback_triggered
        "agent_name": agent_name,
        "step": step,
        **details,
    }
    
    log_func = getattr(logger, level, logger.info)
    log_func(json.dumps(log_entry, default=str))


async def instrumented_agent_call(
    agent_name: str,
    task: Any,
    orchestrator: "Orchestrator",  # Forward reference to avoid circular import
) -> dict[str, Any]:
    """Wrapper that instruments every agent call with tracing and metrics.
    
    Generates unique span IDs per invocation and propagates trace IDs
    across the full orchestration chain.
    """
    import uuid
    
    span_id = str(uuid.uuid4())[:8]
    trace_id = trace_id_var.get() or str(uuid.uuid4())[:12]
    set_trace_context(trace_id, span_id)
    
    start_time = time.monotonic()
    
    try:
        log_orchestration_event("agent_call_start", agent_name, f"call:{span_id}", {
            "task_preview": str(task)[:200],
        })
        
        result = await orchestrator.execute_agent(agent_name, task)
        
        elapsed = time.monotonic() - start_time
        log_orchestration_event("agent_call_complete", agent_name, f"call:{span_id}", {
            "duration_ms": round(elapsed * 1000, 2),
            "result_summary": str(result)[:200] if result else None,
        })
        
        return result
        
    except Exception as e:
        elapsed = time.monotonic() - start_time
        log_orchestration_event("agent_call_error", agent_name, f"call:{span_id}", {
            "duration_ms": round(elapsed * 1000, 2),
            "error_type": type(e).__name__,
            "error_message": str(e),
        }, level="error")
        raise
```

**Checkpoint:** Verify end-to-end trace ID flows through all agent boundaries in a single workflow execution. Run a test that generates a single `trace_id` and confirm it appears identically in log entries for every step of the pipeline.

---

## Implementation Patterns / Reference Guide

### Pattern 1: LangGraph StateGraph for Deterministic Multi-Agent Pipeline

Use when you need explicit control over state transitions between agents, with built-in human-in-the-loop support and checkpointing:

```python
from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver
import uuid


class ResearchPipelineState:
    """State schema for a multi-agent research pipeline.
    
    Demonstrates how typed state flows through a LangGraph with
    explicit edges and conditional routing.
    """
    workflow_id: str
    query: str
    sources: list[dict] = []       # Gathered by web_research_agent
    analysis: dict[str, Any] = {}   # Produced by analysis_agent
    final_report: str = ""          # Written by report_agent
    
    def __init__(self, query: str) -> None:
        self.workflow_id = str(uuid.uuid4())[:12]
        self.query = query


def define_research_graph() -> StateGraph:
    """Build a deterministic multi-agent research pipeline.
    
    Flow: START -> web_research_agent -> analysis_router -> 
          [deep_analysis | surface_summary] -> report_agent -> END
    
    Conditional routing based on analysis depth required.
    """
    graph = StateGraph(ResearchPipelineState)

    # --- Define agent nodes with error handlers ---
    
    def web_research_agent(state: ResearchPipelineState) -> ResearchPipelineState:
        """Scrape and gather initial research sources."""
        logger.info(f"[{state.workflow_id}] web_research started")
        state.sources = [
            {"url": f"research-topic-{i}", "content": f"data-{i}", "relevance": 0.9}
            for i in range(5)
        ]
        return state

    def analysis_router(state: ResearchPipelineState) -> str:
        """Route to deep_analysis or surface_summary based on source count.
        
        This is the branching point — both paths have explicit fallbacks.
        """
        if len(state.sources) >= 3:
            logger.info(f"[{state.workflow_id}] Routing to deep_analysis ({len(state.sources)} sources)")
            return "deep_analysis_agent"
        else:
            logger.warning(f"[{state.workflow_id}] Routing to surface_summary (only {len(state.sources)} sources, insufficient for deep analysis)")
            return "surface_summary_agent"

    def deep_analysis_agent(state: ResearchPipelineState) -> ResearchPipelineState:
        """Deep analysis of multiple sources."""
        state.analysis = {"depth": "deep", "findings_count": len(state.sources) * 2}
        return state

    def surface_summary_agent(state: ResearchPipelineState) -> ResearchPipelineState:
        """Surface-level summary when insufficient data for deep analysis."""
        state.analysis = {"depth": "surface", "findings_count": len(state.sources)}
        return state

    def report_agent(state: ResearchPipelineState) -> ResearchPipelineState:
        """Generate final research report from collected analysis."""
        state.final_report = f"Report for '{state.query}': {len(state.analysis.get('findings_count', 0))} findings analyzed."
        return state

    # --- Build graph with explicit edges ---
    
    # Agent nodes (these are the actual agent implementations)
    graph.add_node("web_research", web_research_agent)
    graph.add_node("deep_analysis", deep_analysis_agent)
    graph.add_node("surface_summary", surface_summary_agent)
    graph.add_node("report", report_agent)

    # Explicit edges — NO implicit ordering
    graph.add_edge(START, "web_research")
    graph.add_edge("web_research", "analysis_router")
    
    # Conditional routing from the router node
    graph.add_conditional_edges(
        "analysis_router",
        analysis_router,
        {
            "deep_analysis_agent": "deep_analysis",
            "surface_summary_agent": "surface_summary",
        },
    )
    
    # Both analysis paths converge to report — explicit fan-in edge
    graph.add_edge("deep_analysis", "report")
    graph.add_edge("surface_summary", "report")
    graph.add_edge("report", END)

    # Checkpointing for recovery after crashes (durable execution)
    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer)


# Execution with checkpoint persistence:
# app = define_research_graph()
# result = app.invoke({"query": "Impact of AI on software engineering"}, config={"configurable": {"thread_id": "unique-thread-123"}})
```

### Pattern 2: Temporal Workflow for Async Distributed Agent Orchestration

Use when you need durable execution with automatic retry, cancellation, and human-in-the-loop approvals across distributed agents:

```python
from temporalio import workflow, activity
from typing import Any
import datetime

with workflow.unchecked_run():
    pass  # Ensure we're in a workflow context for type checking


# Activity definitions (individual agent tasks)
@activity.defn
async def research_activity(topic: str) -> dict[str, Any]:
    """Agent activity that performs web research on a topic."""
    await asyncio.sleep(0.1)  # Simulate network call
    return {
        "topic": topic,
        "sources_found": 12,
        "summary": f"Research results for {topic}",
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


@activity.defn
async def analysis_activity(research_results: dict[str, Any]) -> dict[str, Any]:
    """Agent activity that analyzes research findings."""
    await asyncio.sleep(0.1)
    return {
        "analysis_type": "deep",
        "key_findings": 5,
        "confidence": 0.87,
        "recommendations": ["investigate further", "validate source quality"],
    }


@activity.defn
async def report_activity(analysis: dict[str, Any]) -> str:
    """Agent activity that generates final report."""
    await asyncio.sleep(0.1)
    return f"Final report with {analysis['key_findings']} key findings."


# Signal type for human-in-the-loop approval
class ApprovalSignal(workflow.Signal):
    approved: bool = True
    comment: str = ""


@workflow.defn
class ResearchWorkflow:
    """Durable multi-agent research workflow with human-in-the-loop.
    
    Demonstrates Temporal's durable execution model where the entire
    workflow state is persisted to the temporal database, enabling
    recovery from any failure without manual intervention.
    """
    
    def __init__(self) -> None:
        self.human_approved = True
    
    @workflow.signal
    async def approval_signal(self, signal: ApprovalSignal) -> None:
        """Human-in-the-loop approval gate.
        
        Workflow pauses until a human approves or rejects via this signal.
        This is a checkpoint boundary — the workflow state before the signal
        is durable and can be resumed from any point.
        """
        self.human_approved = signal.approved

    @workflow.run
    async def run(self, topic: str) -> dict[str, Any]:
        """Main workflow execution with retry policy and structured recovery."""
        
        # Retry policy for the research activity (exponential backoff built into Temporal)
        from temporalio.common import RetryPolicy
        
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=1),
            maximum_interval=timedelta(seconds=30),
            maximum_attempts=3,
            non_retryable_error_types=["ValueError", "PermissionDenied"],
        )
        
        # Step 1: Research with retries
        research_results = await workflow.execute_activity(
            research_activity,
            args=[topic],
            retry=retry_policy,
            schedule_to_close_timeout=timedelta(minutes=5),
        )
        
        # Human-in-the-loop checkpoint
        if not self.human_approved:
            return {
                "status": "rejected",
                "reason": "Human approval not granted",
                "topic": topic,
            }
        
        # Step 2: Analysis (runs only after research succeeds)
        analysis = await workflow.execute_activity(
            analysis_activity,
            args=[research_results],
            retry=retry_policy,
        )
        
        # Step 3: Report generation
        report = await workflow.execute_activity(
            report_activity,
            args=[analysis],
            retry=retry_policy,
        )
        
        return {
            "status": "completed",
            "topic": topic,
            "report": report,
            "workflow_id": workflow.info().workflow_id,
            "started_at": workflow.info().start_time.isoformat(),
        }
```

### Pattern 3: Circuit Breaker + Retry for Inter-Agent Communication

Production-quality inter-agent communication layer with circuit breakers, exponential backoff, and automatic fallback routing:

```python
from dataclasses import dataclass, field
from typing import Callable, TypeVar, Optional
import time
import random
import asyncio


T = TypeVar("T")


@dataclass
class AgentInvocationResult:
    """Result of calling an agent with full context for observability."""
    agent_name: str
    success: bool
    output: Any
    error: Optional[str] = None
    latency_ms: float = 0.0
    trace_id: str = ""
    fallback_used: bool = False
    
    @property
    def summary(self) -> dict[str, Any]:
        return {
            "agent": self.agent_name,
            "success": self.success,
            "latency_ms": round(self.latency_ms, 2),
            "fallback": self.fallback_used,
            "trace_id": self.trace_id,
        }


class AgentInvocationService:
    """Production-grade agent invocation with circuit breaker and retry.
    
    Implements the reliability patterns from code-philosophy:
    - Law 1 (Early Exit): Guard clauses for unavailable agents
    - Law 4 (Fail Fast): Circuit open = immediate rejection, not delayed failure
    - Law 5 (Intentional Naming): All metrics and logs use consistent naming
    """
    
    def __init__(
        self,
        agent_clients: dict[str, Callable[..., Any]],
        default_max_retries: int = 3,
        circuit_failure_threshold: int = 5,
    ) -> None:
        self.agent_clients = agent_clients
        self.default_max_retries = default_max_retries
        self._circuit_breakers: dict[str, CircuitBreaker] = {
            name: CircuitBreaker(name=name, failure_threshold=circuit_failure_threshold)
            for name in agent_clients
        }

    async def invoke_with_fault_tolerance(
        self,
        agent_name: str,
        task: Any,
        fallback_chain: list[str] | None = None,
    ) -> AgentInvocationResult:
        """Invoke an agent with full fault tolerance: circuit breaker + retry + fallback.
        
        This is the primary entry point for all inter-agent communication.
        Every invocation follows this exact flow:
        1. Check circuit breaker (early exit if open)
        2. Attempt with retries and exponential backoff
        3. If all retries exhausted, try fallback agents
        4. Log complete result with trace ID
        
        Args:
            agent_name: Target agent to invoke.
            task: Task payload for the agent.
            fallback_chain: Ordered list of alternative agents if primary fails.
            
        Returns:
            AgentInvocationResult with full observability data.
        """
        start_time = time.monotonic()
        trace_id = f"inv-{uuid.uuid4().hex[:12]}"
        
        # Set trace context for downstream observability
        set_trace_context(trace_id, f"circuit:{agent_name}")
        
        # Step 1: Check circuit breaker (early exit — Law 4: Fail Fast)
        cb = self._circuit_breakers.get(agent_name)
        if cb and not cb.is_available:
            latency_ms = (time.monotonic() - start_time) * 1000
            log_orchestration_event("circuit_rejected", agent_name, "invoke", {
                "reason": f"Circuit open. Failures: {cb._failure_count}/{cb.failure_threshold}",
            }, level="warning")
            return AgentInvocationResult(
                agent_name=agent_name, success=False, output=None,
                error=f"Circuit open: {agent_name} unavailable",
                latency_ms=latency_ms, trace_id=trace_id,
            )
        
        # Step 2: Attempt primary agent with retry + backoff
        async def _call_primary() -> Any:
            if agent_name not in self.agent_clients:
                raise ValueError(f"Agent '{agent_name}' not registered")
            return await self.agent_clients[agent_name](task)
        
        try:
            output = await retry_with_backoff(
                func=_call_primary,
                max_retries=self.default_max_retries,
                base_delay=1.0,
            )
            
            # Record success with circuit breaker (helps recovery)
            if cb:
                cb.record_success()
            
            latency_ms = (time.monotonic() - start_time) * 1000
            log_orchestration_event("agent_call_complete", agent_name, "invoke", {
                "trace_id": trace_id,
                "success": True,
                "latency_ms": round(latency_ms, 2),
            })
            
            return AgentInvocationResult(
                agent_name=agent_name, success=True, output=output,
                latency_ms=latency_ms, trace_id=trace_id, fallback_used=False,
            )
            
        except CircuitDownstreamError as e:
            # All retries exhausted — try fallback chain
            if fallback_chain:
                result = await self._try_fallbacks(
                    agent_name, task, fallback_chain, start_time, trace_id
                )
                return result
            
            latency_ms = (time.monotonic() - start_time) * 1000
            log_orchestration_event("agent_call_error", agent_name, "invoke", {
                "trace_id": trace_id,
                "error": str(e),
                "retries_exhausted": True,
            }, level="error")
            
            return AgentInvocationResult(
                agent_name=agent_name, success=False, output=None,
                error=str(e), latency_ms=latency_ms, trace_id=trace_id,
                fallback_used=len(fallback_chain) > 0 if fallback_chain else False,
            )

    async def _try_fallbacks(
        self,
        primary: str,
        task: Any,
        fallback_chain: list[str],
        start_time: float,
        trace_id: str,
    ) -> AgentInvocationResult:
        """Try each fallback agent in order until one succeeds."""
        for fallback_agent in fallback_chain:
            log_orchestration_event("fallback_triggered", primary, "invoke", {
                "trace_id": trace_id,
                "attempted_fallback": fallback_agent,
            })
            
            result = await self.invoke_with_fault_tolerance(
                fallback_agent, task, fallback_chain=[]  # No nested fallbacks
            )
            result.fallback_used = True
            
            if result.success:
                log_orchestration_event("fallback_succeeded", primary, "invoke", {
                    "trace_id": trace_id,
                    "used_fallback": fallback_agent,
                })
                return result
        
        # All fallbacks failed
        latency_ms = (time.monotonic() - start_time) * 1000
        log_orchestration_event("all_fallbacks_failed", primary, "invoke", {
            "trace_id": trace_id,
            "fallback_chain": fallback_chain,
        }, level="error")
        
        return AgentInvocationResult(
            agent_name=primary, success=False, output=None,
            error=f"All fallbacks failed: {fallback_chain}",
            latency_ms=latency_ms, trace_id=trace_id, fallback_used=True,
        )
```

---

## Constraints

### MUST DO
- Always design the state schema before writing any agent nodes — shared state is the contract that binds agents together
- Implement checkpointing at natural boundaries for recovery after crashes (end of each major workflow phase)
- Log every routing decision with rationale for auditability — this is how you debug production failures
- Include health check endpoints for all orchestration services (`/health` returning agent status + circuit breaker states)
- Test failure scenarios: network partitions, agent crashes, data corruption, circuit breaker tripping
- Reference `code-philosophy` (5 Laws of Elegant Defense) when designing the control plane — especially Law 1 (Early Exit for unavailable agents) and Law 4 (Fail Fast with circuit breakers)

### MUST NOT DO
- Use implicit ordering between agents — always define explicit edges in the DAG, even if it feels verbose
- Let any single agent hold mutable global state without versioning — use immutable snapshots or versioned state
- Orchestrate more than 7 concurrent fan-out branches without a queue layer — unbounded parallelism causes resource exhaustion
- Bypass circuit breakers "for performance" — they exist for exactly this reason, and their overhead is negligible compared to agent call latency
- Hard-code agent names in routing logic — always use capability-based discovery via the `CapabilityRouter` pattern

---

## Output Template

When designing an orchestration framework, produce:

1. **Pattern Classification** — Which pattern (sequential pipeline, parallel fan-out/fan-in, hierarchical delegation, or dynamic graph) and why it fits the workload characteristics
2. **Framework Selection Rationale** — Why the chosen framework fits: LangGraph for deterministic state graphs, Temporal for durable async workflows, CrewAI/AutoGen for collaborative multi-agent research, Prefect for batch DAG pipelines
3. **State Schema Definition** — Typed schema (Pydantic) with local vs global boundaries documented per field
4. **Fault Tolerance Strategy** — Circuit breaker configuration (thresholds, recovery timeout), retry policies (max attempts, backoff schedule), checkpoint locations in the workflow
5. **Observability Plan** — Tracing strategy (trace ID propagation), metrics to collect (latency per step, success/fail rates, queue depth), and logging format

---

## Related Skills

| Skill | Purpose |
|---|---|
| `task-decomposition-engine` | Break monolithic tasks into subtasks that the orchestrator distributes across agents |
| `parallel-skill-runner` | Execute multiple skills concurrently with result aggregation in fan-out/fan-in patterns |
| `confidence-based-selector` | Score and select the best agent for each subtask dynamically based on capability matching |
| `dependency-graph-builder` | Build and validate DAGs of inter-agent dependencies before workflow execution |

---

## Live References

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) — Stateful multi-agent orchestration with explicit graph edges
- [Temporal.io Documentation](https://docs.temporal.io/) — Durable execution and distributed workflow orchestration
- [CrewAI Framework](https://docs.crewai.com/) — Role-based collaborative multi-agent frameworks
- [Microsoft AutoGen](https://microsoft.github.io/autogen/) — Conversable multi-agent conversation framework
- [Prefect Workflow Orchestration](https://docs.prefect.io/) — Modern workflow orchestration with DAG visualization
- [Circuit Breaker Pattern (Martin Fowler)](https://martinfowler.com/bliki/CircuitBreaker.html) — Original pattern definition and implementation guidance
- [Microservices Saga Pattern (InfoQ)](https://www.infoq.com/articles/saga-pattern/) — Multi-step distributed transaction orchestration

---

> This skill references `code-philosophy` (5 Laws of Elegant Defense) for control plane design principles. Always apply Law 1 (Early Exit) when agents are unavailable, and Law 4 (Fail Fast) when implementing circuit breaker logic to prevent cascading failures across the agent mesh.
