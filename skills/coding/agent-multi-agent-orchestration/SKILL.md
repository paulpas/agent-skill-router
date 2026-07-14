---

name: agent-multi-agent-orchestration
description: Implements multi-agent orchestration patterns (CrewAI sequential crews, AutoGen group chat, supervisor-worker hierarchy, task guardrails) to coordinate specialized agents on complex workflows.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  archetypes: [tactical, orchestration]
  anti_triggers: [brainstorming, vague ideation, long-form architecture]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  triggers: multi-agent orchestration, crew ai, autogen group chat, supervisor worker pattern, agent delegation, sequential crew, how do i coordinate multiple agents, agent team coordination
  role: implementation
  scope: implementation
  output-format: code
  related-skills: agent-tool-calling-architecture,agent-memory-systems,agent-planning-reasoning,rag-pipeline-architecture

---

# Multi-Agent Orchestration Patterns

Implements production-grade multi-agent orchestration systems that coordinate multiple specialized agents to solve complex tasks. Covers four key architectural patterns: CrewAI sequential crews with role-based agents, task guardrails with structured Pydantic output validation, AutoGen group chat with LLM-powered manager routing, and supervisor-worker hierarchical decomposition with parallel worker execution.

## TL;DR Checklist

- [ ] Choose the right pattern: sequential crew for linear handoffs, group chat for conversational workflows, or supervisor-worker for decomposable tasks
- [ ] Define clear agent specializations — no overlapping capabilities to avoid conflicting outputs
- [ ] Use Pydantic models for structured output enforcement on all critical tasks
- [ ] Implement guardrails (post-execution quality checks) before passing results downstream
- [ ] Set explicit termination conditions in group chat (max_turns + stop criteria)
- [ ] Enforce task dependencies via context chains; never let agents read each other's raw state

---

## When to Use

Use this skill when:

- Building a multi-agent system where different specialized agents must cooperate on a complex task that no single agent can handle alone
- Designing a research workflow (information gathering → analysis → reporting) with clear handoff points between stages
- Implementing a conversational agent team where specialists take turns contributing to a shared discussion (code review, planning, execution)
- Decomposing a complex user request into independent subtasks that can be parallelized across expert agents
- You need structured output guarantees — each agent's output must conform to a specific schema before downstream processing

## When NOT to Use

Avoid this skill for:

- Simple tasks that a single agent with tools can complete directly — multi-agent overhead outweighs benefits for single-step operations
- Low-latency inference requirements (sub-100ms) — coordination between agents adds significant latency per request
- Scenarios where agents have overlapping capabilities without clear specialization boundaries — leads to confusion and conflicting outputs
- Conversational workflows without explicit termination conditions — conversations can loop indefinitely

---

## Core Workflow

1. **Select the orchestration pattern** — Sequential crew for linear pipelines, group chat for conversational multi-turn interactions, or supervisor-worker for decomposable parallel tasks.
2. **Define agent roles and specializations** — Each agent must have a unique capability scope; no two agents should share the same toolset without a clear division of responsibility.
3. **Specify task contracts with structured output** — Use Pydantic models to enforce output schemas, attach guardrails for post-execution validation, and declare context dependencies between tasks.
4. **Wire execution flow and termination conditions** — For sequential: chain tasks via context. For group chat: define participant descriptions, max turns, and stop criteria. For supervisor-worker: build dependency graph for parallel scheduling.
5. **Validate output quality before downstream use** — Apply guardrail checks, parse structured outputs through Pydantic validation, and reject/fallback on failures.

---

## Implementation Patterns

### Pattern 1: CrewAI Sequential Crew with Role-Based Agents

A CrewAI sequential crew executes agents in order, where each agent's output feeds into the next task. Use the `@CrewBase` decorator pattern for YAML-backed configuration with clean agent/task separation. Best for workflows with clear handoffs (researcher → analyst → writer).

# Source: crewAIInc/crewai — Template and core implementations
```python
"""CrewAI Crew template - sequential multi-agent orchestration."""

from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent


@CrewBase
class ResearchCrew:
    """A crew of specialized agents that work sequentially to complete research tasks.

    Pattern: Sequential execution where each agent's output feeds into the next.
    Best for workflows with clear handoffs (researcher → analyst → writer).
    """

    agents: list[BaseAgent]
    tasks: list[Task]

    @agent
    def researcher(self) -> Agent:
        """Senior researcher agent specialized in information gathering.

        Tools available: web search, API queries, document parsers.
        Output: structured research findings with citations.
        """
        return Agent(
            config=self.agents_config['researcher'],  # YAML config with LLM, tools
            verbose=True,
            allow_delegation=False,  # Cannot delegate to other agents
        )

    @agent
    def analyst(self) -> Agent:
        """Data analyst agent that processes raw research findings.

        Tools available: data analysis libraries, statistical calculators.
        Output: analyzed insights with supporting metrics.
        """
        return Agent(
            config=self.agents_config['analyst'],
            verbose=True,
        )

    @agent
    def reporting_analyst(self) -> Agent:
        """Writer agent that produces the final report from analyzed data.

        Tools available: document writers, template formatters.
        Output: polished markdown or structured report.
        """
        return Agent(
            config=self.agents_config['reporting_analyst'],
            verbose=True,
        )

    @task
    def research_task(self) -> Task:
        """Gather raw information on the given topic."""
        return Task(
            config=self.tasks_config['research_task'],
            agent=self.researcher(),
        )

    @task
    def analysis_task(self) -> Task:
        """Analyze gathered research and extract key insights."""
        return Task(
            config=self.tasks_config['analysis_task'],
            agent=self.analyst(),
            context=[self.research_task()],  # Depends on research output
        )

    @task
    def reporting_task(self) -> Task:
        """Produce final report from analyzed insights."""
        return Task(
            config=self.tasks_config['reporting_task'],
            agent=self.reporting_analyst(),
            context=[self.analysis_task()],  # Depends on analysis output
            output_file='report.md',
        )

    @crew
    def crew(self) -> Crew:
        """Create the crew with sequential execution process."""
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,  # Agents execute in order
            verbose=True,
        )
```

### Pattern 2: Task with Guardrails and Structured Output

Tasks define the contract between agents — what they receive as input, what tools they can use, and what output format to produce. The guardrail system allows post-execution validation: if a task's output doesn't meet quality standards, it can be sent back for revision. Uses Pydantic models for both JSON schema enforcement and structured type validation.

# Source: crewAIInc/crewai — lib/crewai/src/crewai/task.py
```python
from __future__ import annotations

import asyncio
import datetime
import json
import uuid
from collections.abc import Sequence
from typing import (
    Annotated,
    Any,
    ClassVar,
    cast,
)

from pydantic import (
    UUID4,
    BaseModel,
    BeforeValidator,
    Field,
    PrivateAttr,
    field_validator,
    model_validator,
)
from typing_extensions import Self


class Task(BaseModel):
    """Represents a task to be executed by an agent.

    Each task defines:
    - description: What needs to be done (given to the agent's prompt)
    - expected_output: Format and content specification for the output
    - tools: Restricted set of tools available to this specific task
    - context: Dependencies on other tasks' outputs
    - output_json/output_pydantic: Structured output enforcement via Pydantic model

    The guardrail system allows post-execution validation — if a task's
    output doesn't meet quality standards, it can be sent back for revision.
    """

    logger: ClassVar[logging.Logger] = logging.getLogger(__name__)

    # Execution tracking counters
    used_tools: int = 0
    tools_errors: int = 0
    delegations: int = 0

    # Core task definition
    description: str = Field(description="Description of the actual task.")
    expected_output: str = Field(
        description="Clear definition of expected output for the task."
    )

    # Agent assignment
    agent: Any = Field(  # BaseAgent type
        default=None,
        description="Agent responsible for executing this task.",
    )

    # Output enforcement
    output_json: type[BaseModel] | None = Field(
        default=None,
        description="Pydantic model that the output must conform to as a JSON dict.",
    )
    output_pydantic: type[BaseModel] | None = Field(
        default=None,
        description="Pydantic model class for structured output validation.",
    )
    output_file: str | None = Field(
        default=None,
        description="File path where the output should be saved.",
    )

    # Tool restrictions
    tools: list[BaseTool] = Field(
        default_factory=list,
        description="Tools/resources made available to this specific task.",
    )

    # Task dependencies
    context: list[Task] = Field(
        default_factory=list,
        description="Tasks whose outputs serve as input for this task.",
    )

    @model_validator(mode="after")
    def validate_output_constraints(self) -> Self:
        """Ensure output constraints are consistent.

        Only one of output_json, output_pydantic, or raw output can be specified.
        Mixing structured output with file output is allowed (both saved).
        """
        if self.output_json and self.output_pydantic:
            raise ValueError(
                "Cannot specify both output_json and output_pydantic. "
                "Choose one structured output format."
            )
        return self

    async def execute_async(
        self,
        crew: Any = None,  # Crew context for inter-agent communication
        tools: Sequence[BaseTool] | None = None,
    ) -> TaskOutput:
        """Execute this task asynchronously.

        Execution flow:
        1. Resolve input from context tasks and original description
        2. Inject available tools into the agent's execution context
        3. Run the agent with the resolved prompt
        4. Validate output against expected format (Pydantic, JSON schema)
        5. Apply guardrail checks if configured
        6. Save to file if output_file specified
        7. Return TaskOutput for downstream tasks

        Args:
            crew: Parent crew providing cross-agent context.
            tools: Additional tools beyond what's defined on this task.

        Returns:
            TaskOutput containing result string, agent name, and metadata.
        """
        if not self.agent:
            raise ValueError(f"Task '{self.description}' has no assigned agent")

        # Resolve input from context tasks
        context_outputs = []
        for ctx_task in self.context:
            if hasattr(ctx_task, 'result') and ctx_task.result:
                context_outputs.append(str(ctx_task.result))

        # Build the full prompt with context
        prompt_parts = [self.description]
        if context_outputs:
            prompt_parts.append(f"\nContext from previous tasks:\n" + "\n".join(context_outputs))
        prompt_parts.append(f"\nExpected output format:\n{self.expected_output}")

        full_prompt = "\n\n".join(prompt_parts)

        # Execute with tools
        available_tools = list(self.tools) + (list(tools) if tools else [])
        result = await self.agent.execute_async(
            prompt=full_prompt,
            tools=available_tools,
            context=crew,
        )

        # Validate structured output if specified
        if self.output_pydantic:
            result = _validate_pydantic_output(str(result), self.output_pydantic)
        elif self.output_json:
            result = _validate_json_output(str(result), self.output_json)

        # Apply guardrails if configured
        result = await self._apply_guardrails(str(result))

        # Save to file if specified
        if self.output_file and hasattr(self, 'result'):
            await self._save_to_file(str(result))

        task_output = TaskOutput(
            description=self.description,
            raw=str(result),
            agent=self.agent.name or str(self.agent),
            pydantic=result if self.output_pydantic else None,
        )
        self.result = task_output
        return task_output

    async def _apply_guardrails(self, result: str) -> str:
        """Apply guardrail validation to the task output.

        Guardrails are post-execution quality checks that can:
        - Reject low-quality outputs for re-generation
        - Transform outputs to meet format requirements
        - Flag outputs requiring human review

        Args:
            result: The raw output from the agent execution.

        Returns:
            Validated and potentially transformed output string.
        """
        if not hasattr(self, 'guardrails') or not self.guardrails:
            return result

        for guardrail in self.guardrails:
            if isinstance(guardrail, GuardrailCallable):
                result = guardrail(result)
            elif isinstance(guardrail, dict) and 'action' in guardrail:
                action = guardrail['action']
                if action == 'reject':
                    raise ValueError(f"Guardrail rejected output: {guardrail.get('reason')}")

        return result
```

### Pattern 3: AutoGen Group Chat with Manager Routing

The group chat pattern uses an LLM-powered manager to select which agent speaks next, enabling natural conversational multi-agent workflows. Participants subscribe to both the group topic and their own individual topic. The manager subscribes to the group topic and uses an LLM to select the next speaker after each response. Termination is controlled by a `TerminationCondition` (e.g., max turns, stop message).

# Source: microsoft/autogen — python/packages/autogen-agentchat/src/autogen_agentchat/teams/_group_chat/_base_group_chat_manager.py
```python
import asyncio
from abc import ABC, abstractmethod
from typing import Any, List, Sequence

from autogen_core import CancellationToken, DefaultTopicId, MessageContext, event, rpc


class BaseGroupChatManager(SequentialRoutedAgent, ABC):
    """Manages a group chat with multiple participant agents.

    Architecture:
    - Participants subscribe to both the group topic and their own individual topic
    - The manager subscribes to the group topic
    - When an agent responds, the manager uses an LLM to select the next speaker
    - Termination is controlled by a TerminationCondition (e.g., max turns, stop message)

    This pattern enables:
    - Dynamic role switching based on conversation context
    - Natural handoffs between specialist agents
    - Controlled conversation length via termination conditions
    """

    def __init__(
        self,
        name: str,
        group_topic_type: str,
        output_topic_type: str,
        participant_topic_types: List[str],
        participant_names: List[str],
        participant_descriptions: List[str],
        output_message_queue: asyncio.Queue,
        termination_condition: TerminationCondition | None,
        max_turns: int | None,
        message_factory: MessageFactory,
        emit_team_events: bool = False,
    ):
        """Initialize group chat manager.

        Args:
            name: Identifier for this manager agent.
            group_topic_type: Topic type for the shared group channel.
            output_topic_type: Topic type for the final output channel.
            participant_topic_types: Unique topic type per participant agent.
            participant_names: Human-readable names shown to the speaker selector.
            participant_descriptions: Detailed descriptions used by the LLM speaker selector.
            output_message_queue: Queue for collecting all messages from this team.
            termination_condition: Condition that, when met, stops the conversation.
            max_turns: Hard limit on total message exchanges (failsafe).
            message_factory: Factory for creating typed message objects.
        """
        super().__init__(
            description="Group chat manager",
            sequential_message_types=[
                GroupChatStart,
                GroupChatAgentResponse,
                GroupChatTeamResponse,
                GroupChatMessage,
                GroupChatReset,
            ],
        )

        if max_turns is not None and max_turns <= 0:
            raise ValueError("max_turns must be greater than 0")
        if len(participant_topic_types) != len(participant_descriptions):
            raise ValueError("Participant types and descriptions must match in count")
        if len(set(participant_topic_types)) != len(participant_topic_types):
            raise ValueError("Participant topic types must all be unique")
        if group_topic_type in participant_topic_types:
            raise ValueError("Group topic type must not overlap with participant types")

        self._name = name
        self._group_topic_type = group_topic_type
        self._participant_names = participant_names
        self._participant_name_to_topic_type = dict(
            zip(participant_names, participant_topic_types, strict=True)
        )
        self._participant_descriptions = participant_descriptions
        self._termination_condition = termination_condition
        self._max_turns = max_turns
        self._current_turn = 0
        self._message_thread: List[Any] = []

    @rpc
    async def handle_start(self, message: GroupChatStart, ctx: MessageContext) -> None:
        """Handle the start of a group chat session.

        Validates group state, relays initial messages to all participants,
        and selects the first speaker.
        """
        # Check if conversation already terminated
        if self._termination_condition and self._termination_condition.terminated:
            stop_msg = StopMessage(
                content="The group chat has already terminated.",
                source=self._name,
            )
            await self._signal_termination(stop_msg)
            return

        # Relay initial messages to all participants
        if message.messages:
            await self.publish_message(
                GroupChatStart(messages=message.messages),
                topic_id=DefaultTopicId(type=self._group_topic_type),
            )
            for msg in message.messages:
                await self._output_message_queue.put(msg)

        # Append to conversation thread and check termination
        if message.messages:
            await self.update_message_thread(message.messages)
            if await self._apply_termination_condition(message.messages):
                return

        # Select the first speaker using LLM-based routing
        await self._transition_to_next_speakers(ctx.cancellation_token)

    @event
    async def handle_agent_response(
        self,
        message: GroupChatAgentResponse | GroupChatTeamResponse,
        ctx: MessageContext,
    ) -> None:
        """Handle a response from any participant agent.

        Flow:
        1. Append response to conversation thread
        2. Apply termination condition check
        3. Select next speaker using LLM
        4. Publish selected speaker's topic to the group channel
        """
        # Collect delta messages from the response
        delta: List[Any] = []
        if isinstance(message, GroupChatAgentResponse):
            if message.response.inner_messages:
                for inner_msg in message.response.inner_messages:
                    delta.append(inner_msg)
            delta.append(message.response.chat_message)
        else:
            delta.extend(message.result.messages)

        # Update conversation thread
        await self.update_message_thread(delta)

        # Check termination
        if await self._apply_termination_condition(delta):
            return

        # Select next speaker
        await self._transition_to_next_speakers(ctx.cancellation_token)

    @abstractmethod
    async def _transition_to_next_speakers(
        self, cancellation_token: CancellationToken | None = None
    ) -> None:
        """Select the next speaker(s) using an LLM-based chooser.

        The implementation should:
        1. Build a prompt listing current conversation + participant descriptions
        2. Call an LLM to select which agent should speak next
        3. Publish a SelectSpeakerEvent to the group topic
        """
        ...
```

### Pattern 4: Supervisor-Worker Hierarchical Pattern

A supervisor/manager agent decomposes complex tasks and delegates subtasks to specialized worker agents, then synthesizes results into a final answer. Workers execute in parallel (up to `max_workers_active`), respecting dependency constraints encoded in a task graph. This pattern is ideal for multi-faceted research, competitive analysis, or any task with independent sub-questions.

# Source: langchain-ai/langgraph — Supervisor/Worker pattern (LangChain-style)
```python
from typing import Any, List, Optional, Sequence
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool


class SupervisorAgent:
    """Supervisor agent that decomposes tasks and delegates to worker agents.

    Architecture:
        ┌─────────────┐     task分解      ┌──────────┐ ┌──────────┐ ┌──────────┐
        │  Supervisor  │ ──────────────► │ Worker A │ │ Worker B │ │ Worker C │
        │  (Manager)   │ ◄────────────── │ (expert) │ │ (expert) │ │ (expert) │
        └─────────────┘    results       └──────────┘ └──────────┘ └──────────┘
               │                                          │
               └────────────── final answer ─────────────┘

    The supervisor:
    1. Receives a complex task from the user
    2. Decomposes it into subtasks for specialized workers
    3. Collects results and synthesizes a final answer
    """

    def __init__(
        self,
        model: BaseChatModel,
        workers: List[WorkerAgent],
        max_workers_active: int = 2,
    ) -> None:
        """Initialize supervisor with worker agents.

        Args:
            model: LLM used for task decomposition and result synthesis.
            workers: List of specialized worker agent instances.
            max_workers_active: Maximum number of workers to run simultaneously.
        """
        self.model = model
        self.workers = {w.name: w for w in workers}
        self.max_workers_active = max_workers_active

    def execute(self, task: str) -> str:
        """Execute a complex task by decomposing and delegating to workers.

        Args:
            task: Complex multi-step task description.

        Returns:
            Synthesized final answer combining all worker outputs.
        """
        # Step 1: Decompose the task into subtasks with worker assignments
        subtasks = self._decompose_task(task)

        if not subtasks:
            return "No subtasks generated."

        # Step 2: Execute subtasks (respecting dependencies and parallelism)
        results = self._execute_subtasks(subtasks)

        # Step 3: Synthesize final answer from worker outputs
        final_answer = self._synthesize(results, task)

        return final_answer

    def _decompose_task(self, task: str) -> List[dict]:
        """Decompose a complex task into parallelizable subtasks.

        The supervisor LLM analyzes the task and identifies:
        - Independent subtasks (can run in parallel)
        - Dependent subtasks (must wait for others to complete)
        - Optimal worker assignment based on expertise descriptions
        """
        prompt = f"""You are a task decomposition expert. Break down the following complex
task into subtasks that can be assigned to specialized workers.

Task: {task}

Available workers and their specializations:
{self._list_workers()}

For each subtask, provide:
- id: Unique identifier
- description: What needs to be done
- worker: Which worker should handle it (from the list above)
- depends_on: List of subtask IDs that must complete first (empty if independent)
- parallel: True if this can run alongside other independent tasks

Return your response as a JSON array."""

        response = self.model.invoke([HumanMessage(content=prompt)])
        return self._parse_decomposition(response.content)

    def _execute_subtasks(self, subtasks: List[dict]) -> dict[str, str]:
        """Execute subtasks respecting dependencies and parallelism.

        Uses a dependency graph to schedule execution: independent subtasks
        run in parallel (up to max_workers_active), dependent tasks wait.
        """
        import concurrent.futures

        results: dict[str, str] = {}
        completed = set()
        pending = list(subtasks)

        while pending or not completed == {s['id'] for s in subtasks}:
            # Find subtasks whose dependencies are all met
            ready = [
                st for st in pending
                if all(dep in completed for dep in st.get('depends_on', []))
            ]

            if not ready:
                break  # No progress possible — circular dependency?

            # Execute ready subtasks in parallel (limited by max_workers_active)
            with concurrent.futures.ThreadPoolExecutor(
                max_workers=self.max_workers_active
            ) as executor:
                futures = {}
                for task_spec in ready[:self.max_workers_active]:
                    worker = self.workers[task_spec['worker']]
                    future = executor.submit(worker.execute, task_spec['description'])
                    futures[future] = task_spec['id']

                for future in concurrent.futures.as_completed(futures):
                    task_id = futures[future]
                    results[task_id] = future.result()
                    completed.add(task_id)

            pending = [st for st in pending if st['id'] not in completed]

        return results

    def _synthesize(self, results: dict[str, str], original_task: str) -> str:
        """Synthesize a final answer from individual worker outputs.

        The supervisor reviews all worker results and produces a cohesive
        final response that addresses the original task comprehensively.
        """
        result_text = "\n\n".join(
            f"Worker {task_id} output:\n{output}" for task_id, output in results.items()
        )

        prompt = f"""You are synthesizing a final answer from multiple expert worker outputs.

Original task: {original_task}

Worker outputs:
{result_text}

Provide a comprehensive, well-structured final answer that incorporates the relevant
information from each worker's output. Resolve any contradictions and fill gaps."""

        response = self.model.invoke([HumanMessage(content=prompt)])
        return response.content

    def _list_workers(self) -> str:
        """Return formatted list of workers with descriptions."""
        return "\n".join(
            f"- {w.name}: {w.description}" for w in self.workers.values()
        )

    def _parse_decomposition(self, content: str) -> List[dict]:
        """Parse JSON subtask decomposition from LLM response."""
        import json
        try:
            # Extract JSON array from markdown code block if present
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            return json.loads(content.strip())
        except (json.JSONDecodeError, IndexError):
            raise ValueError(f"Failed to parse subtask decomposition: {content[:200]}")


class WorkerAgent:
    """Specialized agent that handles one type of subtask.

    Each worker has a name, description (for supervisor assignment),
    an LLM, and optionally tools for domain-specific operations.
    """

    def __init__(
        self,
        name: str,
        description: str,
        model: BaseChatModel,
        tools: Optional[Sequence[BaseTool]] = None,
    ) -> None:
        """Initialize worker agent.

        Args:
            name: Unique identifier shown to the supervisor for assignment.
            description: Expertise area used by supervisor for task routing.
            model: LLM for executing the subtask.
            tools: Domain-specific tools available to this worker.
        """
        self.name = name
        self.description = description
        self.model = model
        self.tools = tools or []

    def execute(self, subtask: str) -> str:
        """Execute a specific subtask assigned by the supervisor.

        Args:
            subtask: The specific work to be done.

        Returns:
            Result string from the worker's LLM.
        """
        prompt = f"""You are {self.name}, specialized in {self.description}.

Your task: {subtask}

Provide a thorough, accurate response to this specific task."""

        messages = [SystemMessage(content=self._build_system_prompt()),
                    HumanMessage(content=prompt)]
        return self.model.invoke(messages).content

    def _build_system_prompt(self) -> str:
        """Build the worker's system prompt with role context."""
        return (
            f"You are {self.name}, an AI expert in {self.description}. "
            "Focus on providing accurate, detailed responses for your specific domain. "
            "Do not attempt tasks outside your expertise — just complete your assigned work."
        )
```

---

## Constraints

### MUST DO
- Give each agent a unique specialization with no overlapping capabilities — this prevents confusion and conflicting outputs in group chats
- Set explicit termination conditions for any conversational pattern (max_turns + stop criteria) to prevent infinite loops
- Use Pydantic models for structured output on all critical tasks where downstream consumers depend on format correctness
- Declare task context dependencies explicitly so agents receive prior results as input, not through shared mutable state
- Wrap agent tool calls in error handling with feedback loops — LLMs may return malformed outputs; surface the error back to the agent

### MUST NOT DO
- Share raw state between agents — use explicit task outputs and context chains instead of global variables or shared objects
- Overlap agent toolsets without clear responsibility division — two agents with the same tools but different goals will produce conflicting results
- Omit termination conditions in group chat patterns — conversations without max_turns or stop criteria can run indefinitely
- Use untyped tool definitions (dict args) — always use Pydantic `args_schema` for validation and schema generation
- Allow fallback chains deeper than 3 levels — this causes infinite loops and token budget overflow; log all transitions instead

---

## Output Template

When this skill is active, your output should contain:

1. **Pattern selection justification** — State which orchestration pattern (sequential crew, group chat, or supervisor-worker) you recommend and why
2. **Agent role definitions** — Each agent's name, specialization description, toolset scope, and output contract
3. **Task dependency graph** — Explicit mapping of context dependencies between tasks (for sequential/group patterns) or subtask decomposition with worker assignments (for supervisor pattern)
4. **Implementation code** — Production-ready Python classes following the exact patterns above, with source attribution comments preserved
5. **Termination and error handling** — Explicit max_turns, guardrail configurations, and fallback strategies

---

## Related Skills

| Skill | Purpose |
|---|---|
| `agent-tool-calling-architecture` | Defines how agents invoke external tools and handle function calling responses |
| `agent-memory-systems` | Manages conversation history, episodic memory, and retrieval-augmented context for persistent agent behavior |
| `agent-planning-reasoning` | Implements ReAct loops, chain-of-thought reasoning, and iterative planning patterns for autonomous agents |
| `rag-pipeline-architecture` | Builds knowledge retrieval pipelines (chunking, hybrid search, re-ranking) that provide external context to agents |
