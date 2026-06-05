---




name: multi-agent-orchestration
description: Orchestrates multi-agent workflows (sequential pipelines, supervisor-worker delegation, group chat coordination, parallel task execution with result synthesis) for complex AI system coordination.
archetypes:
  - orchestration
  - tactical
anti_triggers:
  - brainstorming
  - vague ideation
  - simple scripting
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: operational
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  triggers: multi-agent, agent orchestration, CrewAI, AutoGen, supervisor worker, parallel agents, task delegation, sequential pipeline
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: tool-use-function-calling, planning-reasoning, memory-systems




---





# Multi-Agent Orchestration

Orchestrates multi-agent workflows to decompose complex tasks into specialized agent roles with structured coordination patterns. Loading this skill makes the model design, implement, and validate agent teams using sequential pipelines, supervisor-worker delegation, group chat coordination, and parallel execution — choosing the right pattern based on task dependencies, latency requirements, and output coherence needs.

## TL;DR Checklist

- [ ] Define each agent's role, tools, and bounded responsibility before writing code
- [ ] Select orchestration pattern by analyzing task dependency graph (sequential / parallel / hierarchical)
- [ ] Enforce typed inputs/outputs via Pydantic models at every agent boundary
- [ ] Add quality gates between pipeline stages to reject or retry poor outputs
- [ ] Implement a result synthesizer that merges, deduplicates, and resolves conflicts from multiple agents
- [ ] Set a maximum turn limit for group chat patterns to prevent infinite loops

---

## When to Use

Use this skill when:

- A task naturally decomposes into distinct subtasks handled by specialized agents (e.g., research → analysis → summary generation)
- You need hierarchical delegation where a supervisor breaks down complex goals and assigns subtasks to workers
- Multiple independent analyses must run in parallel and the results need conflict resolution before producing a final output
- You are building a group chat system where agents take turns contributing expertise with LLM-powered speaker selection

---

## When NOT to Use

Avoid this skill for:

- Single-turn tasks that one agent can complete reliably (overhead of orchestration exceeds benefit)
- Tasks requiring real-time sub-millisecond response times (inter-agent communication latency is non-trivial)
- Scenarios where a single LLM call with good prompting would suffice — multi-agent adds complexity, cost, and failure surface

---

## Core Workflow

### 1. Define Agent Roles and Bounded Responsibilities

Create distinct agent personas using `TypedDict` or Pydantic models that declare each agent's role, available tools, and output schema. Each agent must have a narrow, well-defined scope — avoid agents with overlapping responsibilities.

```python
from pydantic import BaseModel, Field
from typing import Protocol, runtime_checkable
import enum


class AgentRole(str, enum.Enum):
    RESEARCHER = "researcher"
    ANALYST = "analyst"
    WRITER = "writer"
    REVIEWER = "reviewer"


class AgentSpec(BaseModel):
    """Defines a single agent's role, tools, and output contract."""
    role: AgentRole
    description: str
    system_prompt: str
    allowed_tools: list[str] = Field(default_factory=list)
    max_tokens: int = 4096

    class Config:
        frozen = True


# Example agent definitions — narrow, non-overlapping scopes
RESEARCHER_SPEC = AgentSpec(
    role=AgentRole.RESEARCHER,
    description="Gathers raw information from sources and returns structured findings.",
    system_prompt=(
        "You are a Researcher. Your job is to collect factual information from provided "
        "sources. Return only verified facts with source citations. Do not analyze or "
        "synthesize — just extract."
    ),
    allowed_tools=["web_search", "web_fetch", "file_read"],
)

ANALYST_SPEC = AgentSpec(
    role=AgentRole.ANALYST,
    description="Analyzes research findings and produces structured conclusions with confidence scores.",
    system_prompt=(
        "You are an Analyst. Use the Researcher's findings to draw conclusions. "
        "Assign a confidence score (0.0–1.0) to each conclusion. Flag contradictions."
    ),
    allowed_tools=["code_interpreter", "math_solver"],
)

WRITER_SPEC = AgentSpec(
    role=AgentRole.WRITER,
    description="Writes a coherent final report from the Analyst's conclusions.",
    system_prompt=(
        "You are a Writer. Transform analytical conclusions into a well-structured "
        "report suitable for executive consumption. Maintain factual accuracy and "
        "cite confidence scores."
    ),
    allowed_tools=["template_render"],
)
```

**Checkpoint:** Verify that no two agents claim the same responsibility. Each agent's `allowed_tools` should be a strict subset of what it actually needs — this is your security boundary.

### 2. Design Orchestration Pattern

Analyze the task dependency graph and select the appropriate pattern:

| Pattern | When to Use | Latency | Coordination Complexity |
|---------|-------------|---------|------------------------|
| **Sequential Pipeline** | Strict ordering, each stage depends on prior output | High (serial) | Low |
| **Supervisor-Worker** | One complex goal decomposable into independent subtasks | Medium (partial parallel) | Medium |
| **Group Chat** | Open-ended exploration where agents iteratively build on each other | Variable | High |
| **Parallel Execution** | Independent tasks that merge at the end | Low (parallel) | Low-Medium |

### 3. Wire Task Dependencies

Map outputs from one agent to inputs of the next using typed message passing. Use Pydantic models to enforce schema compliance at every boundary. This is where you handle conditional branching — if a pipeline stage produces insufficient quality, route to an retry or escalation path.

```python
from pydantic import BaseModel, field_validator
from typing import Optional


class ResearchOutput(BaseModel):
    """Structured output from the Researcher agent."""
    findings: list[dict[str, str]] = Field(
        description="List of {fact, source, confidence} dicts"
    )
    gaps: list[str] = Field(
        default_factory=list,
        description="Information gaps identified during research"
    )

    @field_validator("findings")
    @classmethod
    def validate_findings(cls, v: list[dict]) -> list[dict]:
        for finding in v:
            if not all(k in finding for k in ("fact", "source")):
                raise ValueError(f"Finding missing required keys: {finding}")
        return v


class AnalysisOutput(BaseModel):
    """Structured output from the Analyst agent."""
    conclusions: list[dict[str, str | float]] = Field(
        description="List of {conclusion, confidence, supporting_evidence} dicts"
    )
    contradictions: list[tuple[str, str]] = Field(
        default_factory=list,
        description="Pairs of contradictory findings and their resolution"
    )

    @field_validator("conclusions")
    @classmethod
    def validate_confidence(cls, v: list[dict]) -> list[dict]:
        for c in v:
            conf = c.get("confidence", 0.0)
            if not (0.0 <= conf <= 1.0):
                raise ValueError(f"Confidence must be 0.0-1.0, got {conf}")
        return v


class ReportOutput(BaseModel):
    """Final structured report from the Writer agent."""
    executive_summary: str
    sections: list[dict[str, str]] = Field(
        default_factory=list,
        description="List of {title, content, confidence} dicts"
    )
    references: list[str]

    @field_validator("sections")
    @classmethod
    def validate_sections(cls, v: list[dict]) -> list[dict]:
        if not v:
            raise ValueError("Report must contain at least one section")
        return v
```

**Checkpoint:** Run each Pydantic model through a validation test with realistic input before deploying to production. Schema mismatches are the #1 cause of pipeline failures.

### 4. Execute and Collect Results

Run agents according to the chosen pattern. For parallel execution, use `concurrent.futures.ThreadPoolExecutor` to dispatch independent workers. For sequential pipelines, chain agent calls with inter-stage validation.

### 5. Synthesize Final Output

Merge results from multiple agents, deduplicate overlapping conclusions, resolve contradictions using confidence-weighted voting, and produce a coherent final answer. The synthesizer is the most critical component — it turns fragmented agent outputs into a unified result.

---

## Implementation Patterns

### Pattern 1: Supervisor-Worker Delegation

A supervisor agent decomposes a complex goal into subtasks, dispatches workers via `ThreadPoolExecutor`, then synthesizes results. Use this when you have one clear objective that can be parallelized.

```python
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any, Callable

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Subtask:
    """A discrete unit of work delegated to a worker agent."""
    id: str
    description: str
    required_tools: list[str]
    input_data: dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkerResult:
    """Result from a single worker agent execution."""
    subtask_id: str
    success: bool
    output: dict[str, Any] | None
    error: str | None = None
    latency_ms: float = 0.0


def create_supervisor(
    llm_client: Any,
    max_workers: int = 4,
    timeout_seconds: float = 120.0,
) -> "SupervisorOrchestrator":
    """Factory that creates a SupervisorOrchestrator with configured constraints."""
    return SupervisorOrchestrator(
        llm_client=llm_client,
        max_workers=max_workers,
        timeout_seconds=timeout_seconds,
    )


class SupervisorOrchestrator:
    """Supervisor-worker pattern: decompose → delegate → synthesize.

    The supervisor breaks a high-level goal into subtasks using an LLM call,
    dispatches workers in parallel via ThreadPoolExecutor, then merges results.
    """

    def __init__(
        self,
        llm_client: Any,
        max_workers: int = 4,
        timeout_seconds: float = 120.0,
    ) -> None:
        self.llm_client = llm_client
        self.max_workers = min(max_workers, 8)  # Hard cap to prevent resource exhaustion
        self.timeout_seconds = timeout_seconds

    def decompose_task(self, goal: str) -> list[Subtask]:
        """Use LLM to decompose a high-level goal into parallel subtasks.

        Args:
            goal: The high-level objective to decompose.

        Returns:
            List of Subtask objects describing work for each worker.
        """
        prompt = (
            f"Break the following goal into 2-5 independent subtasks that can run "
            f"in parallel. Return a JSON array with 'id', 'description', and "
            f"'required_tools' for each subtask.\n\nGoal: {goal}"
        )

        response = self.llm_client.generate(prompt, max_tokens=1024)

        # Parse LLM response into Subtask objects
        import json

        try:
            data = json.loads(response.strip())
            return [
                Subtask(
                    id=str(item["id"]),
                    description=item["description"],
                    required_tools=list(item.get("required_tools", [])),
                )
                for item in data
            ]
        except (json.JSONDecodeError, KeyError) as exc:
            raise ValueError(f"Failed to parse decomposition response: {exc}") from exc

    def execute_workers(self, subtasks: list[Subtask]) -> list[WorkerResult]:
        """Dispatch subtasks to workers in parallel and collect results.

        Args:
            subtasks: List of Subtask objects to execute.

        Returns:
            List of WorkerResult objects with success/failure status.
        """

        def run_worker(subtask: Subtask) -> WorkerResult:
            """Execute a single worker task with error handling and timing."""
            start = asyncio.get_event_loop().time() if not hasattr(self, "_sync_mode") else __import__("time").perf_counter()
            try:
                # Each worker gets a specialized prompt based on its subtask
                worker_prompt = (
                    f"Execute this task: {subtask.description}\n\n"
                    f"Input data: {subtask.input_data}\n\n"
                    f"Available tools: {', '.join(subtask.required_tools)}\n\n"
                    f"Return a JSON object with your results."
                )

                output = self.llm_client.generate(worker_prompt, max_tokens=2048)

                elapsed = __import__("time").perf_counter() - start
                return WorkerResult(
                    subtask_id=subtask.id,
                    success=True,
                    output={"raw_response": output},
                    latency_ms=elapsed * 1000,
                )

            except Exception as exc:
                elapsed = __import__("time").perf_counter() - start
                logger.error("Worker %s failed: %s", subtask.id, exc)
                return WorkerResult(
                    subtask_id=subtask.id,
                    success=False,
                    output=None,
                    error=str(exc),
                    latency_ms=elapsed * 1000,
                )

        # Dispatch in parallel with a thread pool
        results: list[WorkerResult] = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_subtask = {
                executor.submit(run_worker, st): st for st in subtasks
            }
            for future in as_completed(future_to_subtask, timeout=self.timeout_seconds):
                try:
                    results.append(future.result())
                except TimeoutError:
                    subtask = future_to_subtask[future]
                    logger.warning("Worker %s timed out after %.0fs", subtask.id, self.timeout_seconds)
                    results.append(WorkerResult(
                        subtask_id=subtask.id, success=False, output=None,
                        error=f"Timed out after {self.timeout_seconds}s",
                    ))

        return results

    def synthesize_results(self, subtasks: list[Subtask], results: list[WorkerResult]) -> dict[str, Any]:
        """Merge worker outputs into a coherent final answer.

        Deduplicates overlapping findings, resolves contradictions via
        confidence-weighted voting, and produces the unified result.

        Args:
            subtasks: Original task definitions for context.
            results: Completed (or failed) worker results.

        Returns:
            Dict with 'success', 'summary', 'failed_subtasks', and 'final_output'.
        """
        successful = [r for r in results if r.success]
        failed = [r for r in results if not r.success]

        if not successful:
            return {
                "success": False,
                "summary": "All worker tasks failed.",
                "failed_subtasks": [r.subtask_id for r in failed],
                "final_output": {},
            }

        # Collect all raw outputs for synthesis
        raw_outputs = []
        for r in successful:
            if r.output and "raw_response" in r.output:
                try:
                    import json as _json
                    parsed = _json.loads(r.output["raw_response"])
                    raw_outputs.append(parsed)
                except (json.JSONDecodeError, TypeError):
                    raw_outputs.append({"text": r.output["raw_response"]})

        # Synthesize via LLM — merge fragmented results into coherent output
        synthesis_prompt = (
            "Merge the following partial results from parallel worker agents "
            "into a single coherent report. Deduplicate overlapping findings, "
            "resolve contradictions using the highest-confidence answer, and "
            "produce a unified output.\n\n"
            + "\n---\n".join(str(o) for o in raw_outputs)
        )

        synthesis_response = self.llm_client.generate(synthesis_prompt, max_tokens=4096)

        return {
            "success": len(failed) == 0,
            "summary": f"Completed {len(successful)}/{len(subtasks)} tasks successfully.",
            "failed_subtasks": [r.subtask_id for r in failed],
            "final_output": {"synthesis": synthesis_response},
        }

    def run(self, goal: str) -> dict[str, Any]:
        """Full supervisor workflow: decompose → delegate → synthesize.

        Args:
            goal: The high-level objective to accomplish.

        Returns:
            Dict containing the synthesized final output and metadata.
        """
        subtasks = self.decompose_task(goal)
        if len(subtasks) < 1 or len(subtasks) > 8:
            raise ValueError(f"Decomposition produced {len(subtasks)} subtasks — expected 1-8")

        logger.info("Supervisor decomposed goal into %d subtasks", len(subtasks))
        results = self.execute_workers(subtasks)
        return self.synthesize_results(subtasks, results)
```

### Pattern 2: Sequential Pipeline with Guardrails

Agents execute in strict order. Each stage validates the prior stage's output via Pydantic and applies quality gates before passing to the next stage. Use this when output fidelity matters more than latency.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum


class PipelineStageStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    RETRYABLE = "retryable"


@dataclass
class QualityGate:
    """Defines a validation check that must pass before advancing to the next pipeline stage."""
    name: str
    threshold: float  # Minimum acceptable score (0.0-1.0)
    is_mandatory: bool = True

    def evaluate(self, output: dict[str, Any]) -> tuple[bool, float]:
        """Run quality check on output. Returns (passed, score)."""
        raise NotImplementedError


class LLMQualityGate(QualityGate):
    """Uses an LLM to rate the quality of a stage's output."""

    def __init__(self, llm_client: Any, rating_criteria: str) -> None:
        super().__init__(name="llm_quality_check", threshold=0.7)
        self.llm_client = llm_client
        self.rating_criteria = rating_criteria

    def evaluate(self, output: dict[str, Any]) -> tuple[bool, float]:
        prompt = (
            f"Rate the quality of this output on a scale of 0.0 to 1.0 based on: {self.rating_criteria}\n\n"
            f"Output: {output.get('content', str(output))}"
        )
        response = self.llm_client.generate(prompt, max_tokens=256)

        try:
            score = float(response.strip())
            return (score >= self.threshold, score)
        except ValueError:
            # Fallback: parse embedded score from response
            import re
            match = re.search(r"(\d+\.?\d*)", response)
            if match:
                score = min(float(match.group(1)), 1.0)
                return (score >= self.threshold, score)
            return (False, 0.0)


class SequentialPipeline:
    """Runs agents in strict order with typed message passing and quality gates.

    Each stage must pass its quality gate before the next stage begins.
    Failed stages can be retried (up to max_retries) or cause pipeline failure.
    """

    def __init__(
        self,
        llm_client: Any,
        max_retries: int = 2,
        raise_on_failure: bool = True,
    ) -> None:
        self.llm_client = llm_client
        self.max_retries = max_retries
        self.raise_on_failure = raise_on_failure
        self._stages: list[tuple[AgentSpec, QualityGate | None]] = []

    def add_stage(
        self,
        spec: AgentSpec,
        quality_gate: QualityGate | None = None,
    ) -> "SequentialPipeline":
        """Register a pipeline stage with its agent spec and optional quality gate.

        Args:
            spec: The agent specification for this stage.
            quality_gate: Optional validation to run after execution.

        Returns:
            self for method chaining.
        """
        self._stages.append((spec, quality_gate))
        return self

    def execute_stage(self, stage_index: int, input_data: dict[str, Any]) -> tuple[dict[str, Any], PipelineStageStatus]:
        """Execute a single pipeline stage with retry logic.

        Args:
            stage_index: Which stage to execute (0-based).
            input_data: Input for this stage.

        Returns:
            Tuple of (output, status) where status indicates pass/fail/retryable.
        """
        spec, quality_gate = self._stages[stage_index]
        retries = 0

        while retries <= self.max_retries:
            prompt = f"{spec.system_prompt}\n\nInput data: {input_data}"

            try:
                raw_output = self.llm_client.generate(prompt, max_tokens=spec.max_tokens)
                output = {"content": raw_output, "agent_role": spec.role.value}

                # Run quality gate if defined for this stage
                if quality_gate:
                    passed, score = quality_gate.evaluate(output)
                    if not passed:
                        if retries < self.max_retries:
                            retries += 1
                            output["quality_feedback"] = (
                                f"Quality gate '{quality_gate.name}' scored {score:.2f} "
                                f"(threshold: {quality_gate.threshold}). Retry attempt {retries}."
                            )
                            continue
                        return output, PipelineStageStatus.FAILED

                return output, PipelineStageStatus.PASSED

            except Exception as exc:
                retries += 1
                if retries > self.max_retries:
                    return {"error": str(exc), "agent_role": spec.role.value}, PipelineStageStatus.FAILED
                continue

    def run(self, initial_input: dict[str, Any]) -> dict[str, Any]:
        """Execute the full sequential pipeline.

        Args:
            initial_input: Input data for the first stage.

        Returns:
            Dict with 'success', 'stage_results' (list of per-stage outputs),
            and 'final_output' (output from the last stage).
        """
        stage_results: list[dict[str, Any]] = []
        current_input = initial_input.copy()

        for idx, (spec, _) in enumerate(self._stages):
            output, status = self.execute_stage(idx, current_input)
            stage_results.append({"stage": spec.role.value, "status": status.value, "output": output})

            if status == PipelineStageStatus.FAILED:
                return {
                    "success": False,
                    "stage_results": stage_results,
                    "final_output": {},
                    "failure_stage": spec.role.value,
                }

            # Pass output content as input to next stage
            current_input = {"previous_output": output.get("content", str(output)), "raw_output": output}

        return {
            "success": True,
            "stage_results": stage_results,
            "final_output": stage_results[-1]["output"],
        }


# --- Usage example for Pattern 2 ---

def build_research_pipeline(llm_client: Any) -> SequentialPipeline:
    """Build a 4-stage research pipeline with quality gates."""
    pipeline = SequentialPipeline(llm_client=llm_client, max_retries=1)

    pipeline.add_stage(
        spec=RESEARCHER_SPEC,
        quality_gate=QualityGate(name="has_citations", threshold=0.5),
    )
    pipeline.add_stage(
        spec=ANALYST_SPEC,
        quality_gate=LLMQualityGate(llm_client, "Conclusions must have confidence scores and cite evidence"),
    )
    pipeline.add_stage(
        spec=WRITER_SPEC,
        quality_gate=QualityGate(name="has_summary", threshold=0.6),
    )

    return pipeline
```

### Pattern 3: Group Chat Manager with LLM Speaker Selection

A group chat pattern where an LLM acts as moderator to select which agent speaks next based on conversation context. Use this for open-ended tasks where the order of contributions is not predetermined. Includes termination conditions to prevent infinite loops.

```python
from typing import Literal

MessageRole = Literal["user", "assistant", "system"]


@dataclass
class ChatMessage:
    """A single message in a group chat."""
    role: str  # "agent:<role>" or "moderator" or "user"
    content: str
    sender_role: AgentRole | None = None
    turn_number: int = 0


class GroupChatManager:
    """LLM-powered speaker selection for multi-agent group chat.

    The manager evaluates conversation context and selects the most relevant
    agent to speak next, then routes their response back into the conversation.
    Supports termination conditions based on user goals or turn limits.
    """

    def __init__(
        self,
        llm_client: Any,
        agents: dict[AgentRole, AgentSpec],
        max_turns: int = 15,
        min_turns: int = 3,
    ) -> None:
        self.llm_client = llm_client
        self.agents = agents
        self.max_turns = max_turns
        self.min_turns = min_turns
        self.messages: list[ChatMessage] = []
        self.turn_count: int = 0

    def add_message(self, message: ChatMessage) -> None:
        """Append a message to the conversation history."""
        self.messages.append(message)
        if message.sender_role:
            self.turn_count += 1

    def select_next_speaker(self, context: dict[str, Any] | None = None) -> AgentRole:
        """Ask the LLM which agent should speak next based on conversation context.

        Args:
            context: Optional additional context (e.g., user goal summary).

        Returns:
            The AgentRole selected to speak next.

        Raises:
            ValueError: If no suitable speaker is found or turn limit exceeded.
        """
        # Build conversation summary for the speaker selection prompt
        recent_messages = self.messages[-6:]  # Last 3 turns (each agent sends 1-2 messages)
        history_str = "\n".join(
            f"[{msg.role}] {msg.content}" for msg in recent_messages
        )

        available_roles = list(self.agents.keys())
        last_speaker = self.messages[-1].sender_role if self.messages else None

        prompt = (
            "Select which agent should speak next to make the most progress.\n\n"
            f"Available agents: {', '.join(r.value for r in available_roles)}\n"
            f"Last speaker: {last_speaker.value if last_speaker else 'none'}\n"
            f"Conversation history:\n{history_str}\n\n"
        )

        if context and context.get("goal"):
            prompt += f"User goal: {context['goal']}\n"

        if context and context.get("termination_check") == True:
            prompt += (
                "Check if the user's goal has been fully addressed. If yes, respond with 'MODERATOR_END'. "
                "Otherwise, select the next agent."
            )

        prompt += "\nRespond with ONLY the agent role name (e.g., analyst) or 'END'."

        response = self.llm_client.generate(prompt, max_tokens=64).strip().lower()

        # Parse speaker selection
        if "end" in response or "moderator_end" in response:
            if self.turn_count >= self.min_turns:
                raise StopIteration("Conversation terminated by moderator")
            else:
                # Force at least min_turns before allowing termination
                return available_roles[self.turn_count % len(available_roles)]

        # Map response back to AgentRole
        role_mapping = {r.value: r for r in available_roles}
        if response in role_mapping:
            selected = role_mapping[response]
            if selected != last_speaker:
                return selected
            # Avoid repeating the same agent — pick next
            idx = (available_roles.index(last_speaker) + 1) % len(available_roles)
            return available_roles[idx]

        raise ValueError(f"Unable to parse speaker selection response: {response!r}")

    def run_chat(self, user_goal: str) -> list[ChatMessage]:
        """Execute the group chat until termination or turn limit.

        Args:
            user_goal: The user's original request that agents work toward.

        Returns:
            Complete conversation history as a list of ChatMessages.

        Raises:
            StopIteration: When moderator decides to end the chat.
            ValueError: On parsing errors or invalid state.
        """
        self.messages = [ChatMessage(
            role="user", content=user_goal, turn_number=0
        )]
        context = {"goal": user_goal}

        while self.turn_count < self.max_turns:
            # Check termination condition periodically
            if self.turn_count >= 5 and self.turn_count % 3 == 0:
                try:
                    self.select_next_speaker(context={**context, "termination_check": True})
                    return self.messages  # Chat ended early — goal satisfied
                except StopIteration:
                    return self.messages

            # Select speaker
            try:
                next_role = self.select_next_speaker(context)
            except ValueError as exc:
                raise RuntimeError(f"Speaker selection failed at turn {self.turn_count}: {exc}") from exc

            # Route the message to the selected agent
            agent_spec = self.agents[next_role]
            chat_context = "\n".join(
                f"[{msg.role}] {msg.content}" for msg in self.messages[-4:]
            )

            agent_prompt = (
                f"{agent_spec.system_prompt}\n\n"
                f"You are participating in a group chat. Your role is to contribute "
                f"your expertise on this topic.\n\n"
                f"Recent conversation:\n{chat_context}\n\n"
                f"Please provide your contribution."
            )

            response = self.llm_client.generate(agent_prompt, max_tokens=2048)

            message = ChatMessage(
                role=f"agent:{next_role.value}",
                content=response,
                sender_role=next_role,
                turn_number=self.turn_count + 1,
            )
            self.add_message(message)

        raise RuntimeError(f"Reached maximum turns ({self.max_turns}) without termination")


# --- Usage example for Pattern 3 ---

def run_group_chat(llm_client: Any, user_goal: str) -> list[ChatMessage]:
    """Run a group chat with researcher, analyst, and writer agents."""
    chat = GroupChatManager(
        llm_client=llm_client,
        agents={
            AgentRole.RESEARCHER: RESEARCHER_SPEC,
            AgentRole.ANALYST: ANALYST_SPEC,
            AgentRole.WRITER: WRITER_SPEC,
        },
        max_turns=12,
        min_turns=3,
    )

    try:
        return chat.run_chat(user_goal)
    except StopIteration as e:
        # Chat ended successfully via moderator termination
        print(f"Chat ended: {e}")
        return chat.messages


# --- BAD vs GOOD Example ---

# ❌ BAD: No speaker selection logic — agents interrupt each other randomly
def bad_group_chat(llm_client: Any, agents: list[AgentSpec]) -> None:
    """Bad example: All agents are called in a fixed order with no intelligence.
    This wastes turns and produces incoherent results."""
    for agent in agents:
        # Each agent gets the full raw prompt — no context from previous agents
        llm_client.generate(agent.system_prompt, max_tokens=1024)


# ✅ GOOD: LLM selects speaker based on conversation context
def good_group_chat(llm_client: Any, user_goal: str) -> None:
    """Good example: Moderated group chat with intelligent speaker selection.
    The moderator evaluates who adds the most value at each turn."""
    results = run_group_chat(llm_client, user_goal)

    # Moderator synthesizes final answer from conversation
    final_prompt = (
        "Synthesize the following group chat discussion into a final answer.\n\n"
        + "\n".join(f"[{m.role}] {m.content}" for m in results)
    )
    llm_client.generate(final_prompt, max_tokens=2048)
```

---

## Constraints

### MUST DO

- **Enforce typed contracts at every agent boundary** — Use Pydantic models to validate inputs and outputs between agents. Never pass raw strings across stage boundaries in production code.
- **Set hard limits on turns and tokens** — Always configure `max_tokens` per agent, `max_turns` for group chats, and timeouts for parallel execution to prevent runaway costs.
- **Implement a quality gate at each pipeline stage** — Use either rule-based checks (field presence, type validation) or LLM-based rating gates to catch degraded outputs before they propagate downstream.
- **Deduplicate results in the synthesizer** — When merging outputs from multiple workers, detect and remove duplicate findings, keeping only the highest-confidence version of each fact.
- **Log agent execution metadata** — Record latency, success/failure status, token counts, and quality gate scores for every stage to enable post-hoc analysis and pipeline tuning.

### MUST NOT DO

- **Never let an agent access tools outside its declared scope** — The `allowed_tools` list is a security boundary, not a suggestion. Validate tool access at runtime by checking against the spec.
- **Never allow infinite loops in group chat** — Always enforce `max_turns` and a minimum turn threshold before allowing moderator termination. Never rely on the LLM to self-terminate without safeguards.
- **Never skip output validation between pipeline stages** — Passing unchecked outputs downstream is the primary cause of cascading failures. If a stage produces invalid output, retry or fail fast — never let it propagate.
- **Never hardcode agent selection order in supervisor-worker patterns** — Use LLM-powered decomposition to create subtasks dynamically based on the specific goal. Static decomposition misses opportunities for parallelization and wastes resources.
- **Never use more than 8 agents in a single orchestration** — Beyond this threshold, coordination overhead dominates useful work, token costs explode, and failure rates compound unmanageably.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `tool-use-function-calling` | Each agent needs tools to perform its role. This skill covers how agents discover, call, and parse tool outputs. |
| `planning-reasoning` | Before orchestrating agents, the supervisor must plan — decompose goals, identify dependencies, and estimate complexity. |
| `memory-systems` | Multi-agent systems often need shared memory or persistent state across agent interactions (conversation history, cached results). |

---

## Output Template

When this skill is active, the model's output should contain:

1. **Agent Definitions** — Typed specs for each agent with role, tools, and constraints
2. **Orchestration Code** — Complete implementation of the selected pattern (pipeline, supervisor-worker, or group chat)
3. **Quality Gates** — Validation logic at every inter-agent boundary
4. **Synthesis Logic** — How results are merged, deduplicated, and conflict-resolved
5. **Error Handling** — Retry strategies, timeout policies, and failure modes

```python
# Example output structure
orchestrator = create_supervisor(llm_client, max_workers=4)
result = orchestrator.run("Analyze the competitive landscape for AI coding assistants")
# → {success: bool, summary: str, failed_subtasks: list[str], final_output: dict}
```


---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Multi-Agent Orchestration with LangGraph](<https://langchain-ai.github.io/langgraph/concepts/multi_agent/>)
- [CrewAI Multi-Agent Framework Docs](<https://docs.crewai.com/concepts/how-crewai-works>)
- [MetaGPT Multi-Agent Research Paper](<https://arxiv.org/abs/2308.00352>)
- [AutoGen: Enabling Next-Gen LLM Applications (Microsoft)](<https://arxiv.org/abs/2308.08155>)
- [LLM Agent Orchestration Patterns Survey](<https://arxiv.org/abs/2402.01680>)
