---
name: agent-architecture-patterns
description: Implements structural design patterns for AI agent systems including
  monolithic, multi-agent, hierarchical, and event-driven architectures with state
  management and security primitives.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: agent architecture, multi-agent system, design patterns, pub-sub messaging,
    circuit breakers, state management, event-driven architecture, service discovery,
    fault tolerance
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
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - examples
  - do-dont
  related-skills: agent-context-management, workflow-patterns, dispatching-parallel-agents,
    hierarchical-agent-memory
---
# Agent Architecture Patterns

Implements structural design patterns for building robust, scalable AI agent systems. This skill guides the model in selecting and applying the right architecture pattern based on complexity, communication needs, and fault tolerance requirements of the agent system.

Agent architecture is not a single choice — it is a layered decision spanning system topology (monolithic vs distributed), communication protocols (request-reply, pub-sub, event streaming), state management strategies, lifecycle management, and security primitives that together determine whether an agent system scales gracefully or collapses under load.

## TL;DR Checklist

- [ ] Choose architecture topology based on task complexity and isolation requirements
- [ ] Implement message routing with explicit handler registration for each agent type
- [ ] Set up state manager with serialization before any cross-agent state access
- [ ] Register lifecycle hooks (startup, shutdown, recovery) in correct priority order
- [ ] Configure circuit breakers with domain-specific thresholds per external dependency
- [ ] Validate security: authentication at entry points, authorization at action boundaries

---

## When to Use

Use this skill when:

- Designing the architecture for a new AI agent system from scratch
- Refactoring an existing single-agent system into a multi-agent topology
- Integrating third-party services or APIs that require fault-tolerant communication
- Choosing between monolithic, hub-and-spoke, peer-to-peer, or event-driven architectures
- Implementing state management across multiple collaborating agents
- Setting up security boundaries between independent agent components

## When NOT to Use

Avoid this skill for:

- Simple scripting tasks with no agent collaboration — use a linear workflow instead (see `workflow-patterns`)
- Building individual LLM prompts or system messages — focus on prompt engineering patterns
- Network infrastructure setup — use CNCF networking skills like Kubernetes service mesh
- As the only architectural consideration — always pair with reliability patterns from `agent-reliability-engineering`

---

## Core Workflow

1. **Analyze System Requirements** — Determine agent count, communication intensity, state sharing needs, and failure tolerance requirements. Classify: simple (1–2 agents, synchronous), moderate (3–5 agents, mixed sync/async), or complex (6+ agents, fully async with shared state).
   **Checkpoint:** If all agents can share a single process memory space and complete tasks sequentially, prefer monolithic architecture over distributed.

2. **Select Architecture Topology** — Match requirements to topology:
   - Monolithic: Single process, shared memory, simple coordination via function calls. Best for ≤3 tightly coupled agents.
   - Hub-and-Spoke: Central coordinator dispatches tasks to specialized worker agents. Best for predictable task routing with centralized oversight.
   - Peer-to-Peer: Agents communicate directly without central coordinator. Best for decentralized collaboration and fault tolerance.
   - Event-Driven: Agents publish events; interested agents subscribe via message bus. Best for decoupled systems with high scalability.

3. **Design Communication Layer** — Implement the chosen protocol:
   - Request-Reply: Synchronous call-and-response. Use `AgentRouter.call(target, method, args)` for direct agent calls.
   - Pub-Sub: Async publish/subscribe. Agents register handlers via `router.subscribe(event_type, handler)`.
   - Event Stream: Persistent event log (like Kafka). Agents append events and replay from arbitrary offsets.

4. **Implement State Management** — Choose state scope strategy:
   - Local State: Agent-private, no serialization needed. Store in agent instance attributes.
   - Shared State: Cross-agent via centralized store with typed accessors. Always serialize before cross-boundary transfer.
   - Eventual Consistency: Agents maintain local copies, reconcile via events. Acceptable for non-critical state.

5. **Configure Lifecycle Management** — Register hooks in execution order:
   - Startup: Load configurations, initialize connections, warm caches
   - Ready: Transition from initializing to operational
   - Shutdown: Flush pending operations, close connections, release resources
   - Recovery: Rehydrate state from checkpoint after crash

6. **Apply Security Primitives** — Enforce boundaries at every layer:
   - Authentication: Verify agent identity before any communication (API keys, mutual TLS)
   - Authorization: Check permissions per action using role-based access control
   - Input Validation: Sanitize all cross-agent message payloads against schemas
   - Audit Logging: Record every inter-agent call with caller, target, action, and result

---

## Implementation Patterns

### Pattern 1: Monolithic Agent Architecture

```python
from dataclasses import dataclass, field
from typing import Any, Callable
import logging

logger = logging.getLogger(__name__)


@dataclass
class AgentContext:
    """Shared context passed through all agents in a monolithic system."""
    state: dict[str, Any] = field(default_factory=dict)
    events: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, str] = field(default_factory=lambda: {
        "agent_count": "0",
        "started_at": "",
    })


class AgentRegistry:
    """Central registry for monolithic agent coordination."""

    def __init__(self, context: AgentContext):
        self.context = context
        self._handlers: dict[str, Callable] = {}
        self._hooks_startup: list[Callable] = []
        self._hooks_shutdown: list[Callable] = []

    def register(self, name: str, handler: Callable) -> None:
        """Register an agent handler by name."""
        if name in self._handlers:
            raise ValueError(f"Agent '{name}' already registered")
        self._handlers[name] = handler
        self.context.metadata["agent_count"] = str(len(self._handlers))
        logger.info("Registered agent '%s' (total: %d)", name, len(self._handlers))

    def call(self, agent_name: str, **kwargs) -> Any:
        """Invoke a registered agent synchronously."""
        handler = self._handlers.get(agent_name)
        if not handler:
            raise KeyError(f"Agent '{agent_name}' not found in registry")

        result = handler(**kwargs)
        self.context.events.append({
            "type": "call",
            "agent": agent_name,
            "args": kwargs,
            "result": str(result)[:200],
        })
        return result

    def on_startup(self, hook: Callable) -> None:
        self._hooks_startup.append(hook)

    def on_shutdown(self, hook: Callable) -> None:
        self._hooks_shutdown.append(hook)

    def run_lifecycle(self) -> dict[str, Any]:
        """Execute startup hooks, return status."""
        results = {"startup": [], "shutdown": []}
        for hook in self._hooks_startup:
            try:
                results["startup"].append(hook())
            except Exception as e:
                logger.error("Startup hook failed: %s", e)
        return results

    def shutdown(self) -> list[str]:
        """Execute all shutdown hooks in reverse order."""
        errors = []
        for hook in reversed(self._hooks_shutdown):
            try:
                hook()
            except Exception as e:
                logger.error("Shutdown hook failed: %s", e)
                errors.append(str(e))
        return errors
```

### Pattern 2: Event-Driven Agent Communication

```python
import asyncio
from typing import Any, Awaitable, Callable
from dataclasses import dataclass, field


@dataclass
class Event:
    """Typed event for pub-sub agent communication."""
    event_type: str
    payload: dict[str, Any]
    source_agent: str = ""
    timestamp: float = 0.0

    def __post_init__(self):
        import time
        if self.timestamp == 0.0:
            self.timestamp = time.time()


class EventRouter:
    """Async event router for pub-sub agent communication."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[Callable[[Event], Awaitable[None]]]] = {}
        self._max_history: int = 10000
        self._history: list[Event] = []

    async def subscribe(
        self, event_type: str, handler: Callable[[Event], Awaitable[None]]
    ) -> None:
        """Register an async handler for a specific event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)
        logger.info("EventRouter: subscribed '%s' to %s", id(handler), event_type)

    async def publish(self, event: Event) -> list[str]:
        """Publish an event to all subscribers. Returns list of handler names called."""
        handlers = self._subscribers.get(event.event_type, [])
        called = []

        for handler in handlers:
            try:
                await handler(event)
                called.append(handler.__name__ if hasattr(handler, "__name__") else "anonymous")
            except Exception as e:
                logger.error(
                    "EventRouter: handler %s failed for event %s: %s",
                    handler.__name__, event.event_type, e,
                )

        self._history.append(event)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]
        return called

    async def publish_all(self, events: list[Event]) -> dict[str, list[str]]:
        """Batch-publish multiple events. Returns per-event handler results."""
        results = {}
        for event in events:
            results[event.event_type] = await self.publish(event)
        return results

    def get_history(
        self, event_type: str | None = None, limit: int = 100
    ) -> list[Event]:
        """Retrieve recent event history, optionally filtered by type."""
        if event_type:
            filtered = [e for e in self._history if e.event_type == event_type]
            return filtered[-limit:]
        return self._history[-limit:]


# Example usage: routing events between specialized agents
async def handle_trade_event(event: Event) -> None:
    """Trade agent processes trade execution events."""
    payload = event.payload
    logger.info("TradeAgent: processing %s for %s at %.2f",
                payload.get("action"), payload.get("symbol"), payload.get("price"))


async def handle_risk_event(event: Event) -> None:
    """Risk agent monitors and validates risk constraints."""
    payload = event.payload
    position_value = payload.get("position_value", 0)
    if position_value > 100_000:
        logger.warning("RiskAgent: position %.2f exceeds threshold", position_value)


async def main():
    router = EventRouter()
    await router.subscribe("trade.execution", handle_trade_event)
    await router.subscribe("trade.execution", handle_risk_event)

    event = Event(
        event_type="trade.execution",
        payload={"action": "BUY", "symbol": "AAPL", "price": 178.50},
        source_agent="strategy_engine",
    )
    called = await router.publish(event)
    assert len(called) == 2, f"Expected 2 handlers called, got {len(called)}"
```

### Pattern 3: State Management with Serialization

```python
import json
import hashlib
from typing import Any
from dataclasses import dataclass, field


@dataclass
class StateSnapshot:
    """Serializable state snapshot for cross-agent state sharing."""
    agent_id: str
    version: int = 0
    data: dict[str, Any] = field(default_factory=dict)
    checksum: str = ""

    def compute_checksum(self) -> str:
        content = f"{self.agent_id}:{self.version}:{json.dumps(self.data, sort_keys=True)}"
        self.checksum = hashlib.sha256(content.encode()).hexdigest()[:16]
        return self.checksum

    def is_intact(self) -> bool:
        return self.compute_checksum() == self.checksum


class StateManager:
    """Centralized state manager with versioning and checksum validation."""

    def __init__(self) -> None:
        self._states: dict[str, StateSnapshot] = {}
        self._lock: Any = None  # asyncio.Lock in async context

    def get(self, agent_id: str) -> StateSnapshot | None:
        """Retrieve current state for an agent. Returns None if not found."""
        return self._states.get(agent_id)

    def set(self, agent_id: str, data: dict[str, Any], version: int = 0) -> StateSnapshot:
        """Set state for an agent with optimistic concurrency control.

        Args:
            agent_id: Unique identifier of the agent owning this state.
            data: Serializable state data dictionary.
            version: Expected current version for conflict detection. Pass -1 to force-set.

        Returns:
            Updated StateSnapshot instance.

        Raises:
            ValueError: If version mismatch detected (optimistic lock conflict).
        """
        existing = self._states.get(agent_id)
        if existing is not None and version >= 0 and existing.version != version:
            raise ValueError(
                f"State version conflict for '{agent_id}': "
                f"expected {version}, current {existing.version}"
            )

        snapshot = StateSnapshot(
            agent_id=agent_id,
            data=data,
            version=(existing.version + 1) if existing else 0,
        )
        snapshot.compute_checksum()
        self._states[agent_id] = snapshot
        return snapshot

    def merge(
        self, source_agent: str, target_agent: str, fields: list[str] | None = None
    ) -> StateSnapshot:
        """Merge specific fields from one agent's state into another.

        Args:
            source_agent: Agent whose state is the source of truth.
            target_agent: Agent receiving merged state fields.
            fields: Specific field keys to merge. If None, merges all fields.

        Returns:
            Updated target StateSnapshot after merge.
        """
        source = self._states.get(source_agent)
        if not source:
            raise KeyError(f"No state found for source agent '{source_agent}'")

        target = self.set(
            target_agent,
            {**(self._states.get(target_agent).data if self._states.get(target_agent) else {}), **source.data},
        )

        if fields:
            # Merge only specified fields
            current_target = self._states.get(target_agent)
            if current_target:
                merged = {k: v for k, v in source.data.items() if k in fields}
                base = {k: v for k, v in current_target.data.items() if k not in fields}
                target = self.set(target_agent, {**base, **merged}, version=current_target.version)

        return target

    def export_all(self) -> dict[str, StateSnapshot]:
        """Export all states as serializable dict."""
        return {aid: s for aid, s in self._states.items()}

    def import_snapshot(self, snapshot: StateSnapshot) -> None:
        """Import a state snapshot, overwriting existing if present."""
        if not snapshot.is_intact():
            raise ValueError(f"Corrupted snapshot from agent '{snapshot.agent_id}'")
        self._states[snapshot.agent_id] = snapshot

    def delete(self, agent_id: str) -> bool:
        """Delete state for an agent. Returns True if deleted."""
        return self._states.pop(agent_id, None) is not None
```

### Pattern 4: Hub-and-Spoke Task Orchestrator

```python
from enum import Enum
from typing import Any
import asyncio


class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


class TaskOrchestrator:
    """Hub-and-spoke orchestrator that dispatches tasks to specialized worker agents.

    The hub maintains task lifecycle, tracks worker capabilities, and ensures
    no single worker is overloaded beyond its capacity threshold.
    """

    def __init__(self, max_concurrent_per_worker: int = 5) -> None:
        self._workers: dict[str, dict[str, Any]] = {}
        self._tasks: dict[str, dict[str, Any]] = {}
        self._max_concurrent = max_concurrent_per_worker

    def register_worker(self, name: str, capabilities: list[str]) -> None:
        """Register a worker agent with its capability list."""
        self._workers[name] = {
            "capabilities": set(capabilities),
            "active_tasks": 0,
            "status": "idle",
        }

    def can_execute(self, worker_name: str, task_type: str) -> bool:
        """Check if a worker has the required capability and available capacity."""
        worker = self._workers.get(worker_name)
        if not worker:
            return False
        if task_type not in worker["capabilities"]:
            return False
        return worker["active_tasks"] < self._max_concurrent

    def dispatch(
        self,
        task_id: str,
        task_type: str,
        payload: dict[str, Any],
        timeout_seconds: float = 30.0,
    ) -> str | None:
        """Dispatch a task to the best available worker. Returns assigned worker or None.

        Strategy: select worker with fewest active tasks among all capable workers.
        This implements simple load balancing across the hub-and-spoke topology.
        """
        candidates = [
            name for name, w in self._workers.items()
            if self.can_execute(name, task_type)
        ]
        if not candidates:
            logger.warning("No capable worker available for task '%s' type '%s'", task_id, task_type)
            return None

        # Pick least-loaded worker
        best_worker = min(candidates, key=lambda n: self._workers[n]["active_tasks"])

        self._tasks[task_id] = {
            "type": task_type,
            "payload": payload,
            "worker": best_worker,
            "status": TaskStatus.RUNNING.value,
            "timeout_seconds": timeout_seconds,
            "submitted_at": asyncio.get_event_loop().time(),
        }
        self._workers[best_worker]["active_tasks"] += 1
        self._workers[best_worker]["status"] = "busy"

        return best_worker

    def complete_task(self, task_id: str, result: dict[str, Any]) -> dict[str, Any]:
        """Mark a task as completed and update worker status."""
        task = self._tasks.get(task_id)
        if not task:
            raise KeyError(f"Task '{task_id}' not found")

        task["status"] = TaskStatus.COMPLETED.value
        task["result"] = result

        worker_name = task["worker"]
        self._workers[worker_name]["active_tasks"] -= 1
        if self._workers[worker_name]["active_tasks"] == 0:
            self._workers[worker_name]["status"] = "idle"

        return task

    def get_worker_status(self) -> dict[str, Any]:
        """Return current status of all registered workers."""
        return {
            name: {
                "status": w["status"],
                "active_tasks": w["active_tasks"],
                "capabilities": sorted(w["capabilities"]),
            }
            for name, w in self._workers.items()
        }


# Example usage with typed worker capabilities
orchestrator = TaskOrchestrator(max_concurrent_per_worker=3)

orchestrator.register_worker("data_fetcher", ["fetch_data", "validate_schema", "backfill"])
orchestrator.register_worker("strategy_engine", ["analyze", "generate_signal", "simulate"])
orchestrator.register_worker("risk_manager", ["check_risk", "approve_trade", "limit_enforcement"])

# Dispatch with load balancing
assigned = orchestrator.dispatch("task-001", "analyze", {"symbol": "BTC"}, timeout_seconds=60.0)
assert assigned == "strategy_engine", f"Expected 'strategy_engine', got {assigned}"

status = orchestrator.get_worker_status()
assert status["strategy_engine"]["active_tasks"] == 1
```

---

## Constraints

### MUST DO
- Always match architecture topology to system complexity — do not over-engineer simple systems with distributed patterns
- Serialize all state before cross-agent transfer; never pass raw mutable objects between agents
- Register event handlers explicitly by event type rather than using wildcard subscriptions that catch everything
- Use checksums or version numbers for shared state validation to detect corruption early
- Implement startup and shutdown hooks for every agent — resources must always be released cleanly
- Apply authentication before any inter-agent communication; never trust internal network boundaries
- Log all cross-boundary calls with caller identity, target, action, timestamp, and outcome

### MUST NOT DO
- Share mutable state objects directly between agents without serialization — race conditions are guaranteed
- Use wildcard event subscriptions (e.g., `*` pattern) that expose every event to every handler
- Bypass the router for direct object references between agents — all communication must flow through the routing layer
- Register more than 50 handlers per event type — this causes fan-out performance degradation
- Store secrets or API keys in state snapshots shared across agents — use environment injection instead
- Implement a hub-and-spoke topology where any single worker can bring down the entire system — always isolate failures
- Use synchronous calls for operations that may take more than 10 seconds — switch to async pub-sub

---

## Output Template

When designing or implementing agent architecture, produce:

1. **Architecture Topology** — Selected pattern (monolithic/hub-and-spoke/peer-to-peer/event-driven) with justification based on agent count and communication requirements
2. **Communication Protocol** — Chosen protocol (request-reply, pub-sub, event stream) with handler routing configuration
3. **State Management Strategy** — State scope per agent (local/shared/eventual), serialization format, versioning scheme
4. **Lifecycle Configuration** — Startup hooks in execution order, shutdown sequence, recovery strategy
5. **Security Boundaries** — Authentication mechanism, authorization model, input validation schemas, audit logging targets

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-reliability-engineering` | Fault tolerance mechanisms (circuit breakers, retries, graceful degradation) layered on top of this architecture |
| `agent-context-management` | Managing conversation context and memory within agent workflows |
| `workflow-patterns` | Linear and conditional workflow patterns for simpler agent orchestrations |
| `agent-dispatching-parallel-agents` | Parallel task delegation patterns for independent sub-tasks |
| `hierarchical-agent-memory` | Multi-level memory architecture for deep context retention across long conversations |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [LLM Agents Survey — Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [Multi-Agent Systems — Wikipedia Overview](https://en.wikipedia.org/wiki/Multi-agent_system)
- [Microsoft LLM Agent Survey](https://arxiv.org/abs/2308.11432)
- [Agent Orchestration Patterns — LangChain Docs](https://langchain-ai.github.io/langgraph/concepts/)
