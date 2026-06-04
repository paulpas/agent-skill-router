---
name: durable-execution
description: Implements durable execution patterns for fault-tolerant AI agent workflows including checkpoint-based persistence, exponential backoff retry, idempotency keys, and crash recovery strategies across LangGraph, Temporal, and generic async frameworks.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: durable execution, checkpointing, crash recovery, idempotency, retry strategy, state persistence, fault tolerance, temporal
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: langgraph-state-machine, tool-use-function-calling, multi-agent-orchestration, agent-reliability-engineering
  archetypes:
    - tactical
    - enforcement
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Durable Execution for AI Agent Workflows

Implements durable execution patterns that ensure AI agent workflows can survive crashes, network failures, and API rate limits without losing progress. This skill covers checkpoint-based state persistence, idempotent operation design, exponential backoff retry strategies, replay detection, and the saga pattern for multi-step compensation — essential primitives for production-grade agent systems as of 2025-2026.

## TL;DR Checklist

- [ ] Wrap every workflow step in a try/except with structured error classification
- [ ] Assign idempotency keys to all side-effect-producing operations (API calls, DB writes)
- [ ] Implement exponential backoff with jitter for retryable errors
- [ ] Persist state checkpoints after each successful node completion
- [ ] Detect and handle replay scenarios during recovery (Temporals' `replay_started` pattern)
- [ ] Design compensation logic for every irreversible action in a multi-step workflow

---

## When to Use

Use this skill when:

- Building AI agent workflows that must survive process crashes, restarts, or OOM kills
- Your agents call external APIs (LLM providers, web services, databases) that can fail transiently
- You need deterministic replay of completed steps after a failure (not re-execution from scratch)
- Multi-step workflows require compensation — undoing previous actions when a later step fails
- Your system operates in production with SLA requirements that demand fault tolerance

## When NOT to Use

Avoid this skill for:

- Purely stateless, idempotent single-shot LLM calls (no workflow state to persist)
- Prototypes and one-off experiments where crash recovery adds unnecessary complexity
- Real-time inference pipelines where checkpoint overhead is unacceptable (< 10ms p99 latency)

---

## Core Workflow

### 1. Classify Errors for Retry Strategy

Not all errors are equal. Classify every failure into retryable, terminal, or recoverable — this determines whether you retry, give up, or attempt recovery.

```python
import enum
import time
import random
from dataclasses import dataclass


class ErrorCategory(str, enum.Enum):
    """Classifies workflow errors by their retry behavior."""
    RETRYABLE = "retryable"       # Transient: network timeout, rate limit, API error 429/503
    TERMINAL = "terminal"         # Permanent: invalid input, schema mismatch, auth failure
    RECOVERABLE = "recoverable"   # Needs intervention: human approval required, external dependency down


@dataclass(frozen=True)
class WorkflowError:
    """Structured error that carries classification and retry metadata."""
    category: ErrorCategory
    message: str
    original_exception: Exception | None = None
    retry_after_seconds: float = 0.0

    @classmethod
    def from_http_error(cls, status_code: int, body: str) -> "WorkflowError":
        """Classify HTTP errors by status code."""
        if 400 <= status_code < 500:
            return cls(
                category=ErrorCategory.TERMINAL,
                message=f"Client error {status_code}: {body}",
            )
        elif status_code == 429:
            return cls(
                category=ErrorCategory.RETRYABLE,
                message=f"Rate limited (429). Retry after headers.",
                retry_after_seconds=2.0,
            )
        elif status_code >= 500:
            return cls(
                category=ErrorCategory.RETRYABLE,
                message=f"Server error {status_code}: {body}",
                retry_after_seconds=5.0,
            )
        else:
            return cls(
                category=ErrorCategory.TERMINAL,
                message=f"Unexpected HTTP error {status_code}: {body}",
            )

    def is_retryable(self) -> bool:
        return self.category in (ErrorCategory.RETRYABLE, ErrorCategory.RECOVERABLE)
```

**Checkpoint:** Every LLM API call, tool invocation, and external service call must catch exceptions and convert them to `WorkflowError` objects. Never propagate raw third-party exceptions up the workflow stack — they carry framework-specific details that break recovery logic.

### 2. Implement Exponential Backoff with Jitter

When retrying transient failures, use exponential backoff with random jitter to prevent thundering herd problems when multiple agents restart simultaneously.

```python
import asyncio
import logging
from typing import Callable, TypeVar

T = TypeVar("T")

logger = logging.getLogger(__name__)


def calculate_backoff(
    attempt: int,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    jitter_factor: float = 0.5,
) -> float:
    """Calculate delay for exponential backoff with random jitter.

    Args:
        attempt: Current retry attempt number (0-based).
        base_delay: Initial delay in seconds. Doubles each attempt.
        max_delay: Maximum delay cap in seconds.
        jitter_factor: Random jitter multiplier (0.0 = no jitter, 0.5 = ±50%).

    Returns:
        Delay in seconds before the next retry.

    Formula: min(base_delay * 2^attempt * random(1 - jitter, 1 + jitter), max_delay)
    """
    exponential_delay = base_delay * (2 ** attempt)
    jitter_range = exponential_delay * jitter_factor
    jitter = random.uniform(-jitter_range, jitter_range)
    return min(exponential_delay + jitter, max_delay)


async def retry_with_backoff(
    operation: Callable[[], T],
    max_retries: int = 3,
    base_delay: float = 1.0,
    error_types: tuple[type[Exception], ...] | None = None,
) -> T:
    """Execute an operation with exponential backoff retry.

    Args:
        operation: Async callable to execute.
        max_retries: Maximum number of retries before giving up.
        base_delay: Base delay in seconds (doubles each attempt).
        error_types: Only retry these exception types. None = retry all.

    Returns:
        The return value of the successful operation.

    Raises:
        Last exception if all retries are exhausted.
    """
    last_exception: Exception | None = None

    for attempt in range(max_retries + 1):
        try:
            if asyncio.iscoroutinefunction(operation):
                return await operation()
            else:
                return operation()

        except Exception as exc:
            last_exception = exc

            # Only retry if error type is in the allowed set (or any type if None)
            if error_types and not isinstance(exc, error_types):
                raise

            if attempt >= max_retries:
                break

            delay = calculate_backoff(attempt, base_delay)
            logger.warning(
                "Attempt %d/%d failed. Retrying in %.1fs: %s",
                attempt + 1, max_retries, delay, exc,
            )
            await asyncio.sleep(delay)

    raise RuntimeError(
        f"Operation failed after {max_retries + 1} attempts. Last error: {last_exception}"
    ) from last_exception


# --- Usage Examples ---

async def call_llm_with_retry(prompt: str) -> str:
    """Call an LLM API with automatic retry on transient failures."""
    import httpx  # noqa: F811

    async def _llm_call() -> str:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": "Bearer YOUR_API_KEY"},
                json={
                    "model": "gpt-4",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1024,
                },
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]

    # Only retry on network errors and server errors (5xx)
    return await retry_with_backoff(
        operation=_llm_call,
        max_retries=3,
        base_delay=2.0,
        error_types=(httpx.HTTPError, httpx.RemoteProtocolError),
    )


async def call_with_workflow_error(prompt: str) -> str:
    """Call LLM with WorkflowError classification."""
    import httpx  # noqa: F811

    last_error: Exception | None = None

    for attempt in range(4):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": "Bearer YOUR_API_KEY"},
                    json={"model": "gpt-4", "messages": [{"role": "user", "content": prompt}], "max_tokens": 1024},
                )
                response.raise_for_status()
                return response.json()["choices"][0]["message"]["content"]

        except httpx.HTTPStatusError as exc:
            workflow_error = WorkflowError.from_http_error(exc.response.status_code, exc.response.text)
            if workflow_error.is_retryable():
                delay = calculate_backoff(attempt, base_delay=2.0)
                logger.info("Retryable error %s. Sleeping %.1fs", workflow_error.message, delay)
                await asyncio.sleep(delay + workflow_error.retry_after_seconds)
                last_error = exc
            else:
                raise RuntimeError(workflow_error.message) from exc

        except httpx.HTTPError as exc:
            # Network errors are always retryable
            delay = calculate_backoff(attempt, base_delay=2.0)
            logger.info("Network error %s. Retrying in %.1fs", exc, delay)
            await asyncio.sleep(delay)
            last_error = exc

    raise RuntimeError(f"LLM call failed after 4 attempts") from last_error
```

### 3. Design Idempotent Operations

Every side-effect-producing operation must be idempotent — producing the same result when called multiple times with the same input. This is essential for crash recovery: after a restart, you cannot know whether the original call succeeded or failed, so re-executing must be safe.

```python
import hashlib
import json
import uuid
from datetime import datetime, timezone


class IdempotencyStore:
    """Thread-safe idempotency key store backed by an in-memory dict.

    In production, replace with Redis (SET NX EX) or a relational DB
    with a unique constraint on the idempotency_key column.
    """

    def __init__(self) -> None:
        self._cache: dict[str, dict] = {}
        self._lock: object = object()  # Placeholder — use threading.Lock in prod

    @staticmethod
    def generate_key(operation_name: str, input_hash: str) -> str:
        """Generate a deterministic idempotency key from operation name and inputs."""
        raw = f"{operation_name}:{input_hash}"
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

    @staticmethod
    def hash_input(data: dict) -> str:
        """Create a stable hash of input data for idempotency key generation."""
        canonical = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(canonical.encode()).hexdigest()[:16]

    def check_and_set(self, key: str, result: dict, ttl_seconds: int = 3600) -> bool:
        """Atomically check if a result exists for this idempotency key.

        Args:
            key: The idempotency key to check/set.
            result: The operation result to cache if key is new.
            ttl_seconds: How long to keep the cached result.

        Returns:
            True if the key was newly set (first call).
            False if the key already existed (duplicate call — return cached result).
        """
        # In production: use Redis SET NX EX or DB transaction
        if key in self._cache:
            return False  # Duplicate — caller should return cached result

        self._cache[key] = {
            "result": result,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "ttl_seconds": ttl_seconds,
        }
        return True  # New call — proceed with operation

    def get_result(self, key: str) -> dict | None:
        """Retrieve cached result for an idempotency key."""
        entry = self._cache.get(key)
        if entry is None:
            return None

        created_at = datetime.fromisoformat(entry["created_at"])
        age_seconds = (datetime.now(timezone.utc) - created_at).total_seconds()
        if age_seconds > entry["ttl_seconds"]:
            del self._cache[key]  # Expired
            return None

        return entry["result"]


class IdempotentOperation:
    """Mixin class providing idempotent operation execution."""

    def __init__(self) -> None:
        self.idempotency_store = IdempotencyStore()

    async def execute_idempotently(
        self,
        operation_name: str,
        input_data: dict,
        operation_fn: Callable[..., dict],
        ttl_seconds: int = 3600,
    ) -> dict:
        """Execute an operation with idempotency guarantee.

        If the same operation with the same inputs was previously executed
        (and cached), returns the cached result without re-executing.

        Args:
            operation_name: Logical name of the operation (e.g., "web_search", "code_exec").
            input_data: Input parameters to hash for deduplication.
            operation_fn: The actual operation to execute.
            ttl_seconds: How long to cache results.

        Returns:
            Operation result — either newly computed or from cache.
        """
        input_hash = self.idempotency_store.hash_input(input_data)
        key = self.idempotency_store.generate_key(operation_name, input_hash)

        # Check for existing cached result (idempotent read)
        cached_result = self.idempotency_store.get_result(key)
        if cached_result is not None:
            logger.info("Idempotent hit for %s (%s)", operation_name, key[:12])
            return cached_result

        # Execute the actual operation
        result = operation_fn(input_data)

        # Cache the result (idempotent write)
        self.idempotency_store.check_and_set(key, result, ttl_seconds)

        logger.info("Idempotent miss for %s (%s) — cached result", operation_name, key[:12])
        return result


# --- Usage Example ---

def search_web(input_data: dict) -> dict:
    """Example tool that is NOT naturally idempotent (web content changes)."""
    # In production: make this call an external API
    return {
        "query": input_data["query"],
        "results": [
            {"title": f"Result 1 for {input_data['query']}", "url": f"https://example.com/1"},
            {"title": f"Result 2 for {input_data['query']}", "url": f"https://example.com/2"},
        ],
    }


async def idempotent_search(operation: IdempotentOperation, query: str) -> dict:
    """Search with idempotency — same query returns cached results."""
    return await operation.execute_idempotently(
        operation_name="web_search",
        input_data={"query": query},
        operation_fn=search_web,
        ttl_seconds=300,  # Cache for 5 minutes (web results are relatively stable)
    )
```

### 4. Implement Checkpoint-Based State Persistence

Persist workflow state after each step completes. On recovery, reload the last checkpoint and resume from where you left off.

```python
import json
import os
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass
class Checkpoint:
    """Serialized workflow state at a specific point in execution."""
    workflow_id: str
    step_index: int
    step_name: str
    state: dict[str, Any]
    timestamp: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc).isoformat()


class CheckpointStore:
    """File-based checkpoint store for workflow state persistence.

    In production, replace with a database (PostgreSQL) or Redis for
    concurrent access and atomic writes.
    """

    def __init__(self, workspace_dir: str = "/tmp/workflow-checkpoints") -> None:
        self.base_dir = Path(workspace_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _checkpoint_path(self, workflow_id: str, step_index: int) -> Path:
        return self.base_dir / f"{workflow_id}" / f"step_{step_index}.json"

    def save_checkpoint(self, checkpoint: Checkpoint) -> None:
        """Save a checkpoint atomically (write to temp file, then rename)."""
        workflow_dir = self.base_dir / checkpoint.workflow_id
        workflow_dir.mkdir(parents=True, exist_ok=True)

        # Atomic write: write to temp, then rename
        tmp_path = self._checkpoint_path(checkpoint.workflow_id, checkpoint.step_index).with_suffix(".tmp")
        final_path = self._checkpoint_path(checkpoint.workflow_id, checkpoint.step_index)

        with open(tmp_path, "w") as f:
            json.dump(asdict(checkpoint), f, indent=2, default=str)

        os.replace(str(tmp_path), str(final_path))  # Atomic on POSIX

    def load_last_checkpoint(self, workflow_id: str) -> Checkpoint | None:
        """Load the most recent checkpoint for a workflow.

        Returns None if no checkpoints exist (fresh execution).
        """
        workflow_dir = self.base_dir / workflow_id
        if not workflow_dir.exists():
            return None

        checkpoint_files = sorted(
            workflow_dir.glob("step_*.json"),
            key=lambda p: int(p.stem.split("_")[1]),
            reverse=True,
        )

        if not checkpoint_files:
            return None

        with open(checkpoint_files[0]) as f:
            data = json.load(f)

        return Checkpoint(**data)

    def list_checkpoints(self, workflow_id: str) -> list[Checkpoint]:
        """List all checkpoints for a workflow in execution order."""
        workflow_dir = self.base_dir / workflow_id
        if not workflow_dir.exists():
            return []

        result = []
        for filepath in sorted(workflow_dir.glob("step_*.json")):
            with open(filepath) as f:
                data = json.load(f)
            result.append(Checkpoint(**data))

        return result


class CheckpointedWorkflow:
    """Mixin class that adds checkpoint persistence to a workflow."""

    def __init__(self, workflow_id: str | None = None) -> None:
        self.workflow_id = workflow_id or f"wf-{uuid.uuid4().hex[:12]}"
        self.checkpoint_store = CheckpointStore()

    async def run_with_recovery(
        self,
        steps: list[Callable],
        initial_state: dict[str, Any],
    ) -> dict[str, Any]:
        """Execute workflow steps with automatic checkpointing and crash recovery.

        On first run, executes all steps from the beginning.
        On restart, loads the last checkpoint and resumes from that step.

        Args:
            steps: List of step functions to execute in order.
            initial_state: Initial workflow state dict.

        Returns:
            Final workflow state after all steps complete.
        """
        # Try to recover from last checkpoint
        last_cp = self.checkpoint_store.load_last_checkpoint(self.workflow_id)
        if last_cp is not None:
            logger.info("Recovering workflow %s from step %d (%s)", self.workflow_id, last_cp.step_index, last_cp.step_name)
            state = last_cp.state
            start_step = last_cp.step_index + 1
        else:
            state = initial_state.copy()
            start_step = 0

        # Execute remaining steps with checkpointing after each
        for step_idx in range(start_step, len(steps)):
            step_fn = steps[step_idx]
            step_name = step_fn.__name__ if hasattr(step_fn, "__name__") else f"step_{step_idx}"

            logger.info("Executing workflow step %d/%d: %s", step_idx + 1, len(steps), step_name)
            state = step_fn(state)

            # Save checkpoint AFTER successful completion
            cp = Checkpoint(
                workflow_id=self.workflow_id,
                step_index=step_idx,
                step_name=step_name,
                state=state,
                metadata={"attempt": "normal"},
            )
            self.checkpoint_store.save_checkpoint(cp)

        return state
```

**Checkpoint:** Always save the checkpoint AFTER the step succeeds, not before. Saving before execution means a crashed workflow would resume from a point where work was already done but not persisted — defeating the purpose of recovery.

### 5. Implement the Saga Pattern for Compensation

When a multi-step workflow performs irreversible actions, implement compensation logic that undoes previous steps if a later step fails. This is the saga pattern.

```python
from dataclasses import dataclass
from typing import Callable


@dataclass
class SagaStep:
    """A single step in a saga workflow with its compensation function."""
    name: str
    action: Callable[[dict], dict]
    compensate: Callable[[dict], dict]  # Undo/rollback this step's effects
    is_irreversible: bool = False


class SagaOrchestrator:
    """Orchestrates saga workflows with automatic compensation on failure.

    Each step has an action (forward) and a compensate (backward) function.
    If any step fails, previously completed steps are compensated in reverse order.
    """

    def __init__(self, max_compensation_retries: int = 1) -> None:
        self.max_compensation_retries = max_compensation_retries

    def execute_saga(
        self,
        initial_state: dict[str, Any],
        steps: list[SagaStep],
    ) -> tuple[bool, dict[str, Any], list[str]]:
        """Execute a saga with automatic rollback on failure.

        Args:
            initial_state: Starting workflow state.
            steps: Ordered list of saga steps with action and compensate functions.

        Returns:
            Tuple of (success, final_state, compensation_log).
        """
        executed_steps: list[SagaStep] = []
        current_state = initial_state.copy()
        compensation_log: list[str] = []

        # Forward execution
        for step in steps:
            try:
                logger.info("Saga forward: executing %s", step.name)
                current_state = step.action(current_state)
                executed_steps.append(step)
            except Exception as exc:
                logger.error("Saga forward failed at '%s': %s. Compensating...", step.name, exc)

                # Backward compensation (reverse order)
                for completed_step in reversed(executed_steps):
                    try:
                        logger.info("Saga compensate: undoing %s", completed_step.name)
                        current_state = completed_step.compensate(current_state)
                        compensation_log.append(f"Compensated {completed_step.name}")
                    except Exception as comp_exc:
                        msg = f"CRITICAL: Compensation for '{completed_step.name}' failed: {comp_exc}"
                        logger.critical(msg)
                        compensation_log.append(f"COMPENSATION FAILED: {msg}")

                return False, current_state, compensation_log

        # All steps succeeded
        return True, current_state, ["Saga completed successfully"]


# --- Saga Example: Research Pipeline with Cleanup ---

def create_research_saga() -> list[SagaStep]:
    """Build a saga for multi-step research with cleanup on failure."""
    created_resources: list[str] = []  # Track for compensation

    def download_sources(state: dict) -> dict:
        """Step 1: Download source URLs (creates local cache files)."""
        urls = state.get("urls", [])
        cached_paths = []
        for url in urls:
            path = f"/tmp/cache/{hash(url)}.json"  # noqa: S301 — simplified
            # In production: actually download and save
            with open(path, "w") as f:
                json.dump({"url": url, "content": "cached content"}, f)
            cached_paths.append(path)

        created_resources.extend(cached_paths)
        return {**state, "downloaded_files": cached_paths}

    def analyze_content(state: dict) -> dict:
        """Step 2: Analyze downloaded content."""
        files = state.get("downloaded_files", [])
        analysis_results = []
        for path in files:
            with open(path) as f:
                data = json.load(f)
            analysis_results.append({"source": data["url"], "summary": "Analysis result"})

        return {**state, "analysis": analysis_results}

    def publish_report(state: dict) -> dict:
        """Step 3: Publish the final report (irreversible action)."""
        analysis = state.get("analysis", [])
        report_id = f"report-{uuid.uuid4().hex[:8]}"

        return {**state, "report_id": report_id, "published": True}

    def cleanup_downloads(state: dict) -> dict:
        """Compensation for Step 1: Remove cached files."""
        for path in state.get("downloaded_files", []):
            try:
                os.remove(path)
            except OSError:
                pass  # Best-effort cleanup

        return {**state, "downloaded_files": [], "_cleanup_done": True}

    def undo_analysis(state: dict) -> dict:
        """Compensation for Step 2: Remove analysis from state."""
        return {**state, "analysis": []}

    def unpublish_report(state: dict) -> dict:
        """Compensation for Step 3: Mark report as unpublished (if API supports it)."""
        # In production: call API to delete/unpublish the report
        logger.info("Unpublishing report %s", state.get("report_id", "unknown"))
        return {**state, "published": False}

    return [
        SagaStep(
            name="download_sources",
            action=download_sources,
            compensate=cleanup_downloads,
        ),
        SagaStep(
            name="analyze_content",
            action=analyze_content,
            compensate=undo_analysis,
        ),
        SagaStep(
            name="publish_report",
            action=publish_report,
            compensate=unpublish_report,
            is_irreversible=True,  # Mark for special handling
        ),
    ]


# --- Usage ---

async def run_research_pipeline(urls: list[str]) -> dict:
    """Execute the research saga with recovery on failure."""
    saga = SagaOrchestrator()
    initial_state = {"urls": urls}
    steps = create_research_saga()

    success, final_state, log = saga.execute_saga(initial_state, steps)

    return {
        "success": success,
        "report_id": final_state.get("report_id"),
        "compensation_log": log,
        "published": final_state.get("published", False),
    }
```

### 6. Implement Circuit Breaker for External Dependencies

Prevent cascading failures by opening the circuit when an external service is consistently failing. This protects your workflow from exhausting resources on a dead dependency.

```python
import threading
from enum import Enum
from datetime import datetime, timedelta, timezone


class CircuitState(str, Enum):
    CLOSED = "closed"       # Normal operation — requests flow through
    OPEN = "open"           # Service failing — requests fail immediately
    HALF_OPEN = "half_open"  # Testing recovery — allow one probe request


class CircuitBreaker:
    """Circuit breaker for external dependencies.

    State transitions:
    - CLOSED → OPEN: After `failure_threshold` consecutive failures
    - OPEN → HALF_OPEN: After `recovery_timeout` seconds elapse
    - HALF_OPEN → CLOSED: If probe request succeeds
    - HALF_OPEN → OPEN: If probe request fails
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

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: datetime | None = None
        self._half_open_calls = 0
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        """Get current circuit state, transitioning OPEN → HALF_OPEN if timeout elapsed."""
        with self._lock:
            if (
                self._state == CircuitState.OPEN
                and self._last_failure_time
                and datetime.now(timezone.utc) - self._last_failure_time > timedelta(seconds=self.recovery_timeout)
            ):
                self._state = CircuitState.HALF_OPEN
                self._half_open_calls = 0
                logger.info("Circuit '%s' transitioning OPEN → HALF_OPEN", self.name)

            return self._state

    def record_success(self) -> None:
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.half_open_max_calls:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0
                    logger.info("Circuit '%s' transitioning HALF_OPEN → CLOSED", self.name)
            else:
                self._failure_count = 0

    def record_failure(self) -> None:
        with self._lock:
            self._last_failure_time = datetime.now(timezone.utc)

            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                logger.warning("Circuit '%s' transitioning HALF_OPEN → OPEN (probe failed)", self.name)
            else:
                self._failure_count += 1
                if self._failure_count >= self.failure_threshold:
                    self._state = CircuitState.OPEN
                    logger.error(
                        "Circuit '%s' transitioning CLOSED → OPEN (%d consecutive failures)",
                        self.name, self._failure_count,
                    )

    def raise_if_open(self) -> None:
        """Raise CircuitOpenError if the circuit is open (blocking requests)."""
        current_state = self.state
        if current_state == CircuitState.OPEN:
            raise CircuitOpenError(
                f"Circuit '{self.name}' is OPEN. Will retry after {self.recovery_timeout}s."
            )


class CircuitOpenError(Exception):
    """Raised when a circuit breaker is open and blocks a request."""
    pass


# --- Usage with workflow step ---

async def call_service_with_circuit_breaker(
    service_name: str,
    request_data: dict,
) -> dict:
    """Execute an external API call protected by a circuit breaker.

    If the circuit is open, fails immediately without calling the service.
    If the circuit is closed or half-open, proceeds normally.
    """
    # Get or create circuit breaker (in production, use a registry)
    cb = CircuitBreaker(
        name=service_name,
        failure_threshold=5,
        recovery_timeout=30.0,
    )

    try:
        # Check circuit before making the call
        cb.raise_if_open()

        # Make the actual API call (simplified)
        result = _make_api_call(service_name, request_data)  # noqa: F821

        # Record success — resets failure count
        cb.record_success()
        return result

    except CircuitOpenError as exc:
        logger.warning("Request blocked by circuit breaker: %s", exc)
        raise WorkflowError(
            category=ErrorCategory.RECOVERABLE,
            message=str(exc),
        ) from exc

    except Exception as exc:
        # Record failure — increments failure count
        cb.record_failure()
        raise


def _make_api_call(service_name: str, request_data: dict) -> dict:
    """Simulated API call."""
    import httpx  # noqa: F811

    async def _do_call():
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"https://api.{service_name}.com/v1/process",
                json=request_data,
            )
            resp.raise_for_status()
            return resp.json()

    # For sync context, run in event loop
    import asyncio
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(_do_call())
        finally:
            loop.close()
    return loop.run_until_complete(_do_call())
```

---

## Implementation Patterns

### Pattern 1: Combined Durable Workflow Template

A complete template that combines checkpoints, retries, idempotency, and circuit breakers into a single durable workflow executor.

```python
import asyncio
from dataclasses import dataclass, field
from typing import Any, Callable


@dataclass
class DurableWorkflowConfig:
    """Configuration for durable workflow execution."""
    max_retries: int = 3
    base_retry_delay: float = 1.0
    checkpoint_after_each_step: bool = True
    use_idempotency: bool = True
    circuit_breaker_threshold: int = 5
    recovery_timeout_seconds: float = 30.0


class DurableWorkflowExecutor:
    """Combines all durable execution patterns into one reusable executor."""

    def __init__(self, config: DurableWorkflowConfig | None = None) -> None:
        self.config = config or DurableWorkflowConfig()
        self.checkpoint_store = CheckpointStore()
        self.idempotency_op = IdempotentOperation()
        self._circuit_breakers: dict[str, CircuitBreaker] = {}

    def _get_circuit_breaker(self, name: str) -> CircuitBreaker:
        if name not in self._circuit_breakers:
            self._circuit_breakers[name] = CircuitBreaker(
                name=name,
                failure_threshold=self.config.circuit_breaker_threshold,
                recovery_timeout=self.config.recovery_timeout_seconds,
            )
        return self._circuit_breakers[name]

    async def execute_step_with_recovery(
        self,
        workflow_id: str,
        step_index: int,
        step_name: str,
        step_fn: Callable[..., dict],
        state: dict[str, Any],
        use_idempotency: bool = False,
        idempotency_key_prefix: str = "",
    ) -> tuple[dict[str, Any], Checkpoint | None]:
        """Execute a single workflow step with full recovery guarantees.

        Combines: circuit breaker check → retry with backoff → idempotency → checkpointing.

        Args:
            workflow_id: Unique identifier for this workflow execution.
            step_index: Current step number (0-based).
            step_name: Human-readable step name.
            step_fn: The step function to execute.
            state: Current workflow state.
            use_idempotency: Whether to apply idempotency deduplication.
            idempotency_key_prefix: Prefix for the idempotency key.

        Returns:
            Tuple of (updated_state, checkpoint) where checkpoint is None if
            checkpointing is disabled for this step.
        """
        # Step 1: Circuit breaker check
        cb_name = f"{workflow_id}-{step_name}"
        cb = self._get_circuit_breaker(cb_name)

        try:
            cb.raise_if_open()
        except CircuitOpenError:
            # Circuit is open — return state unchanged, mark as failed for saga compensation
            new_state = {**state, f"step_{step_index}_status": "circuit_open"}
            return new_state, None

        # Step 2: Execute with retry (exponential backoff)
        async def _execute() -> dict:
            if use_idempotency and idempotency_key_prefix:
                key = f"{idempotency_key_prefix}:{step_name}"
                cached = self.idempotency_op.idempotency_store.get_result(key)
                if cached is not None:
                    return cached
                result = step_fn(state)
                self.idempotency_op.idempotency_store.check_and_set(key, result)
                return result
            return step_fn(state)

        try:
            new_state = await retry_with_backoff(
                operation=_execute,
                max_retries=self.config.max_retries,
                base_delay=self.config.base_retry_delay,
            )
        except RuntimeError as exc:
            # All retries exhausted — record failure for circuit breaker
            cb.record_failure()
            new_state = {**state, f"step_{step_index}_status": "failed", f"step_{step_index}_error": str(exc)}
            return new_state, None

        # Step 3: Record success on circuit breaker
        cb.record_success()

        # Step 4: Save checkpoint
        checkpoint: Checkpoint | None = None
        if self.config.checkpoint_after_each_step:
            checkpoint = Checkpoint(
                workflow_id=workflow_id,
                step_index=step_index,
                step_name=step_name,
                state=new_state,
            )
            self.checkpoint_store.save_checkpoint(checkpoint)

        return new_state, checkpoint
```

### Pattern 2: Replay Detection for Temporal Workflows

When using Temporal (or similar frameworks), replay detection is critical to prevent re-executing steps that already completed.

```python
import os
from functools import wraps


def with_replay_detection(func):
    """Decorator that detects workflow replay and skips re-execution.

    In Temporal, when a worker restarts after a crash, it replays the
    event history from checkpoints to rebuild state. Code must be
    deterministic during replay — no side effects (API calls, DB writes).

    Usage:
        @with_replay_detection
        async def my_workflow_step(ctx, data):
            # During replay: returns cached result
            # During real execution: executes and caches
            result = await external_api_call(data)
            return result
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Check if we're in a replay scenario
        is_replaying = _check_replay_status()

        if is_replaying:
            # During replay: retrieve cached result from event history
            logger.info("Replay detected for %s — using cached result", func.__name__)
            return _get_cached_result(func.__qualname__, args, kwargs)

        # Real execution: run the function
        result = await func(*args, **kwargs)

        # Cache result for future replay scenarios
        _cache_result(func.__qualname__, result, args, kwargs)

        return result

    return wrapper


def _check_replay_status() -> bool:
    """Check if the current execution is a replay.

    In Temporal, this checks workflow context. For generic workflows,
    check an environment variable or context flag.
    """
    # Generic pattern: check for replay flag in context
    replay_context = getattr(_check_replay_status, "_current_context", {})
    return replay_context.get("replaying", False)


def _get_cached_result(func_name: str, args: tuple, kwargs: dict) -> Any:
    """Retrieve cached result from a local store during replay."""
    # In Temporal: use context.memo.get()
    cache_key = f"{func_name}:{hash(str((args, kwargs)))}"
    return _replay_cache.get(cache_key)


def _cache_result(func_name: str, result: Any, args: tuple, kwargs: dict) -> None:
    """Cache a result for future replay scenarios."""
    cache_key = f"{func_name}:{hash(str((args, kwargs)))}"
    _replay_cache[cache_key] = result


_replay_cache: dict[str, Any] = {}


# --- Usage with Temporal-style context ---

async def search_with_replay(ctx, query: str) -> dict:
    """A workflow step that is deterministic during replay."""
    # During replay: returns cached result from event history
    # During real execution: calls external API and caches
    cached = _replay_cache.get(f"web_search:{query}")
    if cached:
        return cached

    results = await call_search_api(query)  # External API call
    _replay_cache[f"web_search:{query}"] = results
    return results
```

---

## Constraints

### MUST DO

- **Classify errors before retrying** — Use `ErrorCategory` to distinguish retryable (transient), terminal (permanent), and recoverable (needs intervention) errors. Never blindly retry all failures.
- **Use idempotency keys for side effects** — Every operation that modifies external state (API calls, DB writes, file operations) must have an idempotency key. This enables safe retries without duplicate effects.
- **Persist checkpoints AFTER successful completion** — Always save the checkpoint after the step succeeds. Saving before means a crash could cause double-execution of already-completed steps.
- **Implement exponential backoff with jitter** — Fixed delays cause thundering herd problems when multiple workers restart simultaneously. Jitter spreads retry attempts over time.
- **Design compensation logic for every irreversible action** — If a step modifies external state in an irreversible way (publishes content, charges money), it MUST have a corresponding compensation function in the saga pattern.

### MUST NOT DO

- **Never retry terminal errors** — Retrying schema mismatches, auth failures, or invalid inputs wastes resources and masks real bugs. Fail fast on terminal errors.
- **Never store secrets in checkpoint files** — Checkpoint files are written to disk and may be readable by other processes. Strip API keys, tokens, and credentials from state before persisting.
- **Never skip circuit breaker for external dependencies** — Always protect API calls with a circuit breaker. A continuously failing dependency will exhaust your workflow resources without one.
- **Never use non-deterministic operations during replay** — Time-based calculations (`datetime.now()`), random numbers, and UUIDs must be deterministic during replay. Use seeded values or cached results.

---

## TL;DR for Code Generation

- Error classification: `RETRYABLE` → retry with backoff, `TERMINAL` → fail fast, `RECOVERABLE` → needs intervention
- Retry formula: `min(base_delay * 2^attempt * random(1±jitter), max_delay)`
- Idempotency key: `sha256(operation_name + json.dumps(sorted_inputs))[:32]`
- Checkpoint save order: execute step → success → save checkpoint (NOT save → execute)
- Saga pattern: each step has `action(state) -> state` and `compensate(state) -> state`
- Circuit breaker: CLOSED→OPEN after N failures, OPEN→HALF_OPEN after timeout, HALF_OPEN→CLOSED on probe success

---

## Related Skills

| Skill | Purpose |
|---|---|
| `langgraph-state-machine` | LangGraph's built-in checkpointing; this skill covers patterns applicable beyond LangGraph |
| `multi-agent-orchestration` | Multi-agent workflows need durable execution to survive crashes during parallel processing |
| `tool-use-function-calling` | Tool calls are the most common source of transient failures requiring retry and idempotency |

## Live References

> Authoritative documentation links for durable execution patterns.

- [Temporal Durable Execution](https://temporal.io/concepts/what-is-a-durable-execution)
- [Saga Pattern — Martin Fowler](https://martinfowler.com/articles/saga.html)
- [Circuit Breaker Pattern — Microservices.io](https://microservices.io/patterns/reliability/circuit-breaker.html)
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Idempotency in Distributed Systems](https://learn.microsoft.com/azure/architecture/guide/resilience/idempotency)
- [LangGraph Checkpointing](https://langchain-ai.github.io/langgraph/concepts/persistence/)
