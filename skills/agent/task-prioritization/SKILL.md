---
name: task-prioritization
description: Enables agents to rank and schedule tasks by urgency, importance, dependencies, and resource cost using priority matrices, dynamic re-prioritization, and dependency-aware scheduling for optimal execution order.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: task prioritization, priority ranking, urgency assessment, dependency scheduling, dynamic reprioritization, how do i prioritize tasks, P0 P1 P2, project management agent
  related-skills: planning-patterns,multi-agent-collaboration,resource-optimization
  archetypes: tactical,orchestration
  anti_triggers: brainstorming,vague ideation,long-form architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Task Prioritization Pattern

Implements task prioritization mechanisms that enable AI agents to autonomously rank, schedule, and re-prioritize work items by urgency, importance, dependencies, and resource cost — ensuring optimal execution order in dynamic, multi-task environments.

## TL;DR Checklist

- [ ] Define evaluation criteria: urgency, importance, dependencies, resource availability, cost/benefit ratio
- [ ] Implement priority levels (P0 critical, P1 medium, P2 low) with Pydantic task models
- [ ] Build a task manager with O(1) lookup using dictionary-backed storage
- [ ] Create LangChain tools for task creation, priority assignment, and worker allocation
- [ ] Wire up an AgentExecutor with RAG prompt template enforcing prioritization workflow
- [ ] Implement dynamic re-prioritization that triggers on deadline shifts or new critical events
- [ ] Add dependency graph evaluation to respect prerequisite ordering before scheduling

---

## When to Use

Use this skill when:

- An agentic system must autonomously decide which task to execute next from a pool of competing work items
- Building a project management agent that assigns priorities (P0/P1/P2) and allocates workers based on urgency and dependencies
- Implementing dynamic re-prioritization where task importance changes in real-time (e.g., approaching deadlines, new critical events)
- Designing agents for multi-objective environments such as cybersecurity monitoring, financial trading bots, or autonomous driving systems
- Creating a scheduler that must balance resource constraints against task importance and time sensitivity
- Coordinating multi-agent workflows where each agent's output is a prerequisite for others

---

## When NOT to Use

Avoid this skill for:

- Single-task workflows with no competing priorities (use simple sequential execution instead)
- Real-time safety-critical systems requiring sub-millisecond decision loops (prioritization overhead adds latency)
- Scenarios where all tasks have identical priority and no dependencies exist
- Very small task queues (under 3 items) — the overhead of scoring outweighs benefits

---

## Core Workflow

1. **Define Evaluation Criteria** — Establish a criteria schema with weighted dimensions: urgency (time sensitivity), importance (impact on primary objective), dependencies (prerequisite relationships), resource availability (tools and information readiness), and cost/benefit analysis (effort vs expected outcome). Assign each dimension a weight that sums to 1.0. **Checkpoint:** Verify all criteria weights sum to exactly 1.0 and each criterion has a clear scoring rubric before proceeding.

2. **Score Each Task** — Evaluate every pending task against the defined criteria using either deterministic formulas (e.g., `priority_score = urgency_weight * urgency_score + importance_weight * importance_score`) or LLM-based reasoning for subjective dimensions like "strategic importance." Use Pydantic models to enforce type safety on all task attributes including priority level (P0, P1, P2). **Checkpoint:** Confirm every task has a computed score and all scores are normalized to a 0.0–1.0 range.

3. **Build Dependency-Aware Schedule** — Construct a dependency graph from the evaluated tasks using topological ordering. Tasks with no unmet prerequisites move into the execution-ready pool first. If two tasks share the same priority score, the task with fewer dependents (upstream-critical) gets scheduled first. Apply `code-philosophy` early-exit principle: skip tasks blocked on external dependencies until their blockers complete. **Checkpoint:** Verify topological sort completes without cycles; if a cycle is detected, raise an error and flag the affected tasks for manual review.

4. **Assign Workers and Execute** — Match execution-ready tasks to available workers based on skill mapping and current load. Use LangChain `AgentExecutor` with custom tools (`create_new_task`, `assign_priority_to_task`, `assign_task_to_worker`) that operate on a dictionary-backed task manager for O(1) lookups. **Checkpoint:** Confirm each worker assignment has a clear description, priority level, and deadline before marking the task as active.

5. **Monitor and Re-Prioritize Dynamically** — Continuously monitor task states, approaching deadlines, and new incoming tasks. When a condition changes (e.g., a P1 task's deadline moves up 48 hours), re-trigger steps 2–3 with updated criteria. This dynamic re-prioritization is what separates a true agentic system from a static scheduler — the agent must autonomously adapt its focus in real-time as circumstances change. **Checkpoint:** After each re-prioritization cycle, log the before/after priority ordering and any tasks that were escalated or demoted; alert if more than 30% of priorities changed (indicating unstable criteria).

6. **Report Final State** — After all tasks are processed, produce a summary showing completed tasks, skipped tasks with reasons, and re-prioritization history. Use the `list_all_tasks` tool output as the canonical state snapshot. **Checkpoint:** Verify no P0 tasks remain unassigned or uncompleted; if any exist, escalate to human review.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Pydantic Task Model with Priority Scoring

Use strongly-typed Pydantic models to represent tasks and enforce priority level constraints at the type level. This ensures that priority values can only ever be P0, P1, or P2 — preventing invalid states.

```python
import asyncio
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, field_validator


class Task(BaseModel):
    """Represents a single task in the prioritization system."""
    id: str
    description: str
    priority: Optional[str] = None  # P0, P1, P2
    assigned_to: Optional[str] = None
    urgency: float = 0.0  # 0.0–1.0 scale
    importance: float = 0.0  # 0.0–1.0 scale
    dependencies: List[str] = []  # IDs of prerequisite tasks

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        """Enforce P0/P1/P2 priority constraint."""
        if v is not None and v not in ("P0", "P1", "P2"):
            raise ValueError("Priority must be 'P0', 'P1', or 'P2'")
        return v

    def compute_score(self, weights: Optional[Dict[str, float]] = None) -> float:
        """Compute a composite priority score from weighted criteria.

        Args:
            weights: Override default weights for urgency and importance.

        Returns:
            Composite score in 0.0–1.0 range.
        """
        w = weights or {"urgency": 0.4, "importance": 0.3, "dependency_penalty": 0.3}
        dep_penalty = len(self.dependencies) * 0.15
        dep_factor = max(0.0, 1.0 - dep_penalty)
        return round(
            w["urgency"] * self.urgency + w["importance"] * self.importance * dep_factor,
            3,
        )


class PriorityScoringResult(BaseModel):
    """Result of scoring a list of tasks."""
    scored_tasks: List[tuple[Task, float]]
    highest_priority_task: Optional[Task]
```

### Pattern 2: Dictionary-Backed Task Manager for O(1) Operations

Use a dictionary as the primary storage backend for task operations. This provides O(1) lookups, updates, and deletions — critical when agents evaluate tasks repeatedly during dynamic re-prioritization cycles.

```python
class TaskManager(BaseModel):
    """In-memory task manager with O(1) CRUD operations."""

    tasks: Dict[str, Task] = {}
    next_id: int = 1

    def create_task(self, description: str, **kwargs) -> Task:
        """Create and store a new task. Returns the created Task instance."""
        task_id = f"TASK-{self.next_id:03d}"
        self.next_id += 1
        new_task = Task(id=task_id, description=description, **kwargs)
        self.tasks[task_id] = new_task
        return new_task

    def update_task(self, task_id: str, **kwargs) -> Optional[Task]:
        """Safely update a task using Pydantic's model_copy."""
        existing = self.tasks.get(task_id)
        if not existing:
            return None
        update_data = {k: v for k, v in kwargs.items() if v is not None}
        updated = existing.model_copy(update=update_data)
        self.tasks[task_id] = updated
        return updated

    def list_all_tasks(self) -> List[Task]:
        """Return all tasks sorted by computed score (highest first)."""
        scored = [(t, t.compute_score()) for t in self.tasks.values()]
        scored.sort(key=lambda x: x[1], reverse=True)
        return [t for t, _ in scored]

    def get_ready_tasks(self) -> List[Task]:
        """Return tasks with all dependencies satisfied."""
        ready = []
        for task in self.tasks.values():
            unmet = [dep for dep in task.dependencies if dep not in self.tasks]
            if not unmet:
                ready.append(task)
        return sorted(ready, key=lambda t: t.compute_score(), reverse=True)

    def list_all_tasks(self) -> str:
        """Return a formatted string listing all current tasks."""
        if not self.tasks:
            return "No tasks in the system."
        lines = []
        for task in self.tasks.values():
            lines.append(
                f"  {task.id}: '{task.description}' | "
                f"Priority: {task.priority or 'N/A'} | "
                f"Assigned: {task.assigned_to or 'unassigned'}"
            )
        return "Current Tasks:\n" + "\n".join(lines)
```

### Pattern 3: BAD vs GOOD — Priority Assignment Tools

#### ❌ BAD — Unvalidated priority assignment (no schema, no validation)

```python
# ❌ BAD: No input validation, accepts any string as priority
def assign_priority_bad(task_id: str, priority: str) -> str:
    """Assigns a priority to a task."""
    if task_id not in task_manager.tasks:
        return f"Task {task_id} not found."
    task = task_manager.tasks[task_id]
    task.priority = priority  # Accepts "urgent", "high", "ASAP", etc. — no validation!
    return f"Updated priority to '{priority}'."

# This leads to inconsistent states:
# assign_priority_bad("TASK-001", "urgent")    → stored as "urgent" (invalid)
# assign_priority_bad("TASK-002", "ASAP")     → stored as "ASAP" (invalid)
# Sorting and scoring breaks because priorities are not normalized.
```

#### ✅ GOOD — Validated with Pydantic args schema

```python
from langchain_core.tools import Tool
from pydantic import BaseModel, Field


class PriorityArgs(BaseModel):
    """Schema for priority assignment tool arguments."""
    task_id: str = Field(description="The task ID to update, e.g. 'TASK-001'.")
    priority: str = Field(
        description="Priority level — must be one of: P0 (critical), P1 (medium), P2 (low)."
    )


def assign_priority_to_task(task_id: str, priority: str) -> str:
    """Assigns a validated priority to a given task ID.

    Args:
        task_id: The task identifier.
        priority: Must be 'P0', 'P1', or 'P2'.

    Returns:
        Confirmation message or error.
    """
    if priority not in ("P0", "P1", "P2"):
        return f"Invalid priority '{priority}'. Must be P0, P1, or P2."

    task = task_manager.update_task(task_id, priority=priority)
    if not task:
        return f"Task {task_id} not found."

    # Compute and return the new composite score for transparency
    new_score = task.compute_score()
    return f"Assigned priority {priority} to {task.id} (score: {new_score})."


# Register with LangChain using Pydantic schema for auto-validation
pm_tools = [
    Tool(
        name="assign_priority_to_task",
        func=assign_priority_to_task,
        description="Assign a P0/P1/P2 priority to a task.",
        args_schema=PriorityArgs,
    ),
]
```

### Pattern 4: Dynamic Re-Prioritization Engine

Dynamic re-prioritization is the core agentic behavior that enables agents to adapt to changing conditions. This function recalculates scores whenever a triggering event occurs (new task, deadline shift, blocker resolution).

```python
import time
from datetime import datetime, timedelta


class PriorityChangeEvent(BaseModel):
    """Records a priority change for audit and debugging."""
    task_id: str
    old_priority: Optional[str]
    new_priority: str
    reason: str
    timestamp: float = Field(default_factory=time.time)
    score_before: float
    score_after: float


class RePriorityEngine:
    """Dynamically re-evaluates and adjusts task priorities."""

    def __init__(self, task_manager: TaskManager):
        self.task_manager = task_manager
        self.change_log: List[PriorityChangeEvent] = []
        self.priority_map: Dict[str, float] = {
            "P0": 1.0,
            "P1": 0.5,
            "P2": 0.2,
        }

    def check_deadline_shifts(self, deadline_threshold_hours: float = 24.0) -> List[PriorityChangeEvent]:
        """Escalate tasks whose deadlines are approaching within threshold."""
        events: List[PriorityChangeEvent] = []
        now = time.time()
        for task in self.task_manager.tasks.values():
            if not hasattr(task, "deadline"):
                continue
            hours_until = (task.deadline - now) / 3600.0
            # Escalate P1->P0 if deadline within threshold and urgency > 0.5
            if hours_until < deadline_threshold_hours and task.priority == "P1" and task.urgency > 0.5:
                event = PriorityChangeEvent(
                    task_id=task.id,
                    old_priority="P1",
                    new_priority="P0",
                    reason=f"Deadline in {hours_until:.1f}h (threshold: {deadline_threshold_hours}h)",
                    score_before=task.compute_score(),
                    score_after=task.compute_score({"urgency": 0.7, "importance": 0.2}),
                )
                self.task_manager.update_task(task.id, priority="P0")
                events.append(event)
        self.change_log.extend(events)
        return events

    def resolve_dependency(self, completed_task_id: str) -> List[Task]:
        """When a task completes, unblock its dependents and recalculate scores."""
        newly_ready = []
        for task in self.task_manager.tasks.values():
            if completed_task_id in task.dependencies:
                task.dependencies.remove(completed_task_id)
                newly_ready.append(task)
        # Re-sort the ready queue after dependency resolution
        return sorted(
            (t for t in newly_ready if not t.dependencies),
            key=lambda t: t.compute_score(),
            reverse=True,
        )

    def generate_report(self) -> str:
        """Produce a summary of all re-prioritization events."""
        if not self.change_log:
            return "No priority changes recorded."
        lines = [f"Re-Prioritization Report ({len(self.change_log)} changes):"]
        for event in sorted(self.change_log, key=lambda e: e.timestamp):
            lines.append(
                f"  [{event.task_id}] {event.old_priority} -> {event.new_priority} "
                f"(score {event.score_before:.3f} → {event.score_after:.3f}) | {event.reason}"
            )
        return "\n".join(lines)
```

---

## Constraints

### MUST DO

1. **Define priority levels explicitly** — Always use P0 (critical/ASAP), P1 (medium/standard), P2 (low/background). Never invent ad-hoc priority names.
2. **Enforce type safety with Pydantic** — Use Pydantic models for all task definitions, tool arguments, and scoring results. This prevents invalid states at the boundary.
3. **Score deterministically before delegating to LLM** — Compute numerical scores for urgency and importance first; only use LLM reasoning for subjective dimensions like strategic alignment that resist quantification.
4. **Track priority changes for auditability** — Log every re-prioritization event with old score, new score, and reason. This is essential for debugging agent behavior and for human-in-the-loop review.
5. **Respect dependency ordering** — Never schedule a task before its prerequisites are complete. Use topological sort to detect cycles early; raise an error rather than silently proceeding.
6. **Apply early-exit guard clauses** — If no tasks exist, return immediately. If all tasks are completed, return the summary. Do not waste tokens on unnecessary computation.
7. **Reference `code-philosophy` laws** — Follow the 5 Laws of Elegant Defense: parse data at boundaries (validate priorities), fail fast on invalid states (reject bad priority strings), maintain atomic predictability in scoring functions.
8. **Set reasonable defaults for missing information** — If a request lacks priority or assignee details, default to P1 priority and a standard worker pool member rather than stalling.

### MUST NOT DO

1. **Accept unvalidated priority strings** — Never store "urgent", "ASAP", "high", or any non-standard priority value. Always normalize through the P0/P1/P2 schema.
2. **Use a list as primary task storage** — Linear scans (`for task in tasks_list`) are O(n) and unacceptable for repeated evaluation during re-prioritization cycles. Use dictionary-backed storage.
3. **Disable or bypass prioritization "temporarily"** — Even during debugging, keep the prioritization pipeline active with mock scores. Disabled prioritization turns agents into blind scripts.
4. **Let a single criterion dominate all scoring** — If urgency always overrides importance (or vice versa), the agent loses nuance and may deprioritize critical-but-not-urgent tasks indefinitely.
5. **Re-prioritize without logging reasons** — Changing priorities without recording why makes it impossible to debug or explain agent decisions later.
6. **Schedule blocked tasks into the execution pool** — Always verify dependency resolution before marking a task as ready, even if it has the highest computed score.

---

## Output Template

When this skill is active, your output must contain:

1. **Task Inventory** — Complete list of all tasks with current priority, assignment, and computed score
2. **Execution Queue** — Ordered list of execution-ready tasks (dependencies resolved) sorted by descending priority score
3. **Blocked Tasks Report** — Tasks that cannot execute yet, with their blocking dependencies listed
4. **Re-Prioritization Summary** — If any priorities changed since the last cycle, show before/after ordering with reasons
5. **Worker Allocation Table** — Mapping of active tasks to workers with current capacity

```
## Task Prioritization Report

### Priority Score Weights
urgency: 0.4 | importance: 0.3 | dependency_penalty: 0.3

### Execution Queue (Ready)
1. TASK-003 (P0, score=0.82) — "Fix critical auth bug" → Worker A
2. TASK-007 (P0, score=0.76) — "Deploy hotfix to staging" → Worker B
3. TASK-001 (P1, score=0.55) — "Write API documentation" → unassigned

### Blocked Tasks
4. TASK-002 (P1, score=0.48) — blocked on: TASK-003 (fix must land first)
5. TASK-005 (P2, score=0.31) — blocked on: TASK-007 (deploy completes first)

### Re-Prioritization (last 5 min)
- TASK-003 escalated P1 → P0: deadline moved from 48h to 4h
- TASK-006 demoted P0 → P1: market impact reassessed as low

### Worker Allocation
Worker A: TASK-003 (active, est. completion 2h)
Worker B: TASK-007 (active, est. completion 1.5h)
```

---

## Related Skills

| Skill | Purpose |
|---|---|
| `planning-patterns` | Provides the overarching plan structure that prioritization feeds into |
| `multi-agent-collaboration` | Coordinates parallel agent execution where each agent's tasks must be prioritized relative to others |
| `resource-optimization` | Extends prioritization with resource-constrained scheduling (CPU, memory, human capacity) |

---

## Applications Reference

The prioritization pattern applies across diverse real-world domains:

- **Project Management** — Rank tasks on a project board by deadlines, dependencies, team availability, and strategic importance
- **Cybersecurity** — Prioritize alerts by threat severity, potential impact, and asset criticality for immediate response to the most dangerous threats
- **Financial Trading** — Bots prioritize trades analyzing market conditions, risk tolerance, profit margins, and real-time news for prompt execution
- **Autonomous Driving** — Continuously prioritize safety actions (braking) over efficiency goals (fuel optimization)
- **Cloud Computing** — Schedule resource allocation to critical applications during peak demand; defer batch jobs to off-peak hours
- **Personal Assistant AIs** — Organize calendar events, reminders, and notifications by user-defined importance and upcoming deadlines

Each application follows the same core pattern: define criteria → score tasks → schedule with dependency awareness → re-prioritize dynamically as conditions change.
