---
name: multi-agent-collaboration
description: Orchestrates multiple specialized agents in concert using hierarchical, parallel, and sequential topologies (parent-child, debate/consensus, expert teams, sequential handoffs) to solve complex problems that exceed single-agent capability.
license: MIT
compatibility: opencode
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
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: multi-agent, agent collaboration, expert teams, sequential handoffs, parallel agents, parent child agents, debate consensus, how do i orchestrate multiple agents
  related-skills: prompt-chaining, routing-patterns, planning-patterns, parallelization
---

# Multi-Agent Collaboration Pattern

Orchestrates multiple specialized agents working in concert to decompose and solve complex, multi-domain problems that exceed any single agent's capabilities. Loading this skill makes the model design, implement, and validate agent topologies — hierarchical delegation, parallel execution, sequential handoffs, debate/consensus, critic-reviewer loops, and agent-as-tool patterns — choosing the right structure based on task dependencies, latency requirements, and output coherence needs.

## TL;DR Checklist

- [ ] Decompose the problem into independent or weakly-coupled sub-tasks before defining agents
- [ ] Assign each agent a narrow, non-overlapping role with explicit tools and goals
- [ ] Select an orchestration topology (sequential / parallel / hierarchical / debate) based on task dependency graph
- [ ] Implement typed inter-agent contracts (Pydantic models) at every communication boundary
- [ ] Add quality gates between pipeline stages to catch degraded outputs before they propagate
- [ ] Set hard turn limits, token caps, and timeouts for all collaboration loops
- [ ] Build a result synthesizer that merges, deduplicates, and resolves conflicts from multiple agents

---

## When to Use

Use this skill when:

- A task requires multiple distinct domains of expertise (e.g., research + analysis + writing) that no single agent can perform well in isolation
- You need parallel processing across independent sub-tasks with result synthesis at the end
- The problem benefits from debate or consensus — agents with varied perspectives evaluating options before converging on a decision
- A hierarchical structure would help: a manager agent delegating to worker agents based on their tool access or plugin capabilities
- An expert team is needed (researcher, writer, editor, reviewer) collaborating to produce a complex output like a report, codebase, or creative campaign
- Sequential handoffs are natural — one agent's output becomes the next agent's input in a multi-stage pipeline
- Customer support escalation flows require routing from front-line agents to specialists based on problem complexity
- You need a critic-reviewer loop where one agent creates and another critically assesses for correctness, compliance, quality, or security

---

## When NOT to Use

Avoid this skill for:

- **Single-domain tasks** — If one well-crafted prompt handles the problem, adding agents adds overhead without benefit (use single-agent pattern instead)
- **Strictly sequential micro-tasks** — Simple two-step transforms are better handled by chaining prompts rather than defining full agent roles
- **Real-time latency-sensitive systems** — Multi-agent orchestration adds round-trip costs; each inter-agent communication is an LLM call
- **Tasks with no clear decomposition boundary** — If sub-tasks cannot be defined independently, agents will fight over context and produce incoherent results
- **Budget-constrained one-shot queries** — Every additional agent multiplies token costs; only justify when the quality gain outweighs the cost

---

## Core Workflow

### 1. Decompose the Problem into Sub-Tasks

Analyze the problem statement and identify natural boundaries where different expertise, tools, or data sources apply. Break the objective into discrete sub-problems, each solvable by a single specialized agent. Avoid over-decomposition (too many tiny tasks) and under-decomposition (tasks still too broad for one agent). Target 2–6 sub-tasks per orchestration.

**Checkpoint:** Every sub-task must have a clearly defined input source, output contract, and required tool access. If a sub-task's boundary is fuzzy, merge it with an adjacent task.

### 2. Define Agent Roles with Bounded Responsibilities

For each sub-task, define an agent with a narrow role, explicit tools, and a bounded goal. Each agent must have a distinct scope — no two agents should claim the same responsibility. Assign each agent a system prompt that encodes its persona, constraints, and output format.

**Checkpoint:** Verify that no two agents overlap in responsibility. Run a "who does this" matrix: for every aspect of the problem, exactly one agent owns it.

### 3. Select Orchestration Topology

Choose the interaction model based on task dependencies:

| Topology | When to Use | Coordination Model |
|----------|-------------|---------------------|
| **Sequential Handoffs** | Strict ordering; each stage depends on prior output | Pipeline: A → B → C |
| **Parallel Processing** | Independent sub-tasks that merge at end | Fan-out: A + B + C → Merge |
| **Hierarchical (Parent-Child)** | Complex goals decomposable by a coordinator | Manager delegates to workers |
| **Debate / Consensus** | Multiple perspectives needed before decision | Agents argue, converge on agreement |
| **Agent-as-Tool** | One agent needs another as a callable capability | Agent calls sub-agent via tool wrapper |
| **Expert Team with Critic-Reviewer** | Output quality must be validated iteratively | Creator → Critic → Revise |

**Checkpoint:** Confirm that your topology matches the dependency graph. Sequential for dependencies, parallel for independence, hierarchical for decomposability.

### 4. Implement Inter-Agent Communication Contracts

Define typed contracts at every agent boundary using structured output schemas (e.g., Pydantic models). Each agent's output must be parseable by its consumer. Use shared state mechanisms (session state, message queues) or explicit context passing to transfer data between agents. For Google ADK, use `output_key` for simple text responses or `EventActions.state_delta` for complex multi-key updates.

**Checkpoint:** Every inter-agent boundary has a typed contract defined and validated. Unparsed outputs cause pipeline failure — never let raw strings cross stage boundaries in production.

### 5. Add Quality Gates and Retry Logic

Insert validation checkpoints between stages. Rule-based gates check field presence, type compliance, and schema validity. LLM-based gates rate output quality against criteria. Failed gates trigger retry logic (bounded to max_retries) before escalating to pipeline failure. This prevents degraded outputs from propagating downstream.

**Checkpoint:** Every pipeline stage has at least one gate defined. Configure `max_retries ≥ 1` for non-critical stages and `max_retries = 0` for security/compliance gates that must fail fast.

### 6. Synthesize Final Output

Merge results from all agents into a coherent final answer. Deduplicate overlapping findings, resolve contradictions using confidence-weighted voting or LLM-based arbitration, and produce a unified output. The synthesizer is the final quality filter — it turns fragmented agent outputs into a single coherent result that meets the original objective.

**Checkpoint:** Run the synthesized output against the original objective. If it doesn't fully address the goal, loop back to re-decompose or add specialist agents for missing coverage.

---

## Implementation Patterns

### Pattern 1: Sequential Handoffs (Pipeline)

Agents execute in strict order where each stage's output becomes the next stage's input. Use this when output fidelity matters more than latency and task dependencies are explicit. This mirrors the Planning pattern but explicitly involves different agents per stage.

```python
from pydantic import BaseModel, field_validator
from enum import Enum
from typing import Any


class PipelineStageStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    RETRYABLE = "retryable"


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
        self._stages: list[tuple[dict[str, Any], Any | None]] = []

    def add_stage(
        self,
        agent_spec: dict[str, Any],
        quality_gate: Any | None = None,
    ) -> "SequentialPipeline":
        """Register a pipeline stage with agent spec and optional quality gate.

        Args:
            agent_spec: Dict with keys 'role', 'system_prompt', 'max_tokens'.
            quality_gate: Optional callable(output) -> (passed: bool, score: float).

        Returns:
            self for method chaining.
        """
        self._stages.append((agent_spec, quality_gate))
        return self

    def execute_stage(
        self, stage_index: int, input_data: dict[str, Any]
    ) -> tuple[dict[str, Any], PipelineStageStatus]:
        """Execute a single pipeline stage with retry logic.

        Args:
            stage_index: Which stage to execute (0-based).
            input_data: Input for this stage.

        Returns:
            Tuple of (output_dict, status_enum).
        """
        spec, quality_gate = self._stages[stage_index]
        retries = 0

        while retries <= self.max_retries:
            prompt = f"{spec['system_prompt']}\n\nInput data: {input_data}"

            try:
                raw_output = self.llm_client.generate(
                    prompt, max_tokens=spec.get("max_tokens", 4096)
                )
                output = {
                    "content": raw_output,
                    "agent_role": spec["role"],
                }

                # Run quality gate if defined for this stage
                if quality_gate:
                    passed, score = quality_gate(output)
                    if not passed:
                        if retries < self.max_retries:
                            retries += 1
                            output["quality_feedback"] = (
                                f"Quality gate scored {score:.2f} "
                                f"(threshold: 0.7). Retry attempt {retries}."
                            )
                            continue
                        return output, PipelineStageStatus.FAILED

                return output, PipelineStageStatus.PASSED

            except Exception as exc:
                retries += 1
                if retries > self.max_retries:
                    return (
                        {"error": str(exc), "agent_role": spec["role"]},
                        PipelineStageStatus.FAILED,
                    )
                continue

    def run(self, initial_input: dict[str, Any]) -> dict[str, Any]:
        """Execute the full sequential pipeline.

        Args:
            initial_input: Input data for the first stage.

        Returns:
            Dict with 'success', 'stage_results', and 'final_output'.
        """
        stage_results: list[dict[str, Any]] = []
        current_input = initial_input.copy()

        for idx, (spec, _) in enumerate(self._stages):
            output, status = self.execute_stage(idx, current_input)
            stage_results.append({
                "stage": spec["role"],
                "status": status.value,
                "output": output,
            })

            if status == PipelineStageStatus.FAILED:
                return {
                    "success": False,
                    "stage_results": stage_results,
                    "final_output": {},
                    "failure_stage": spec["role"],
                }

            current_input = {
                "previous_output": output.get("content", str(output)),
                "raw_output": output,
            }

        return {
            "success": True,
            "stage_results": stage_results,
            "final_output": stage_results[-1]["output"],
        }
```

**CrewAI Sequential Example (from Chapter 7):**

```python
import os
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process
from langchain_google_genai import ChatGoogleGenerativeAI


def build_blog_crew() -> Crew:
    """Create a sequential Crew for AI trend blog post creation.

    Researcher finds trends → Writer composes post based on research.
    Uses Process.sequential to guarantee order of execution.
    """
    load_dotenv()
    if not os.getenv("GOOGLE_API_KEY"):
        raise ValueError("GOOGLE_API_KEY not set in .env")

    llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")

    researcher = Agent(
        role="Senior Research Analyst",
        goal="Find and summarize the latest trends in AI.",
        backstory=(
            "You are an experienced research analyst with a knack for "
            "identifying key trends and synthesizing information."
        ),
        verbose=True,
        allow_delegation=False,
    )

    writer = Agent(
        role="Technical Content Writer",
        goal="Write a clear and engaging blog post based on research findings.",
        backstory=(
            "You are a skilled writer who can translate complex technical "
            "topics into accessible content."
        ),
        verbose=True,
        allow_delegation=False,
    )

    research_task = Task(
        description=(
            "Research the top 3 emerging trends in Artificial Intelligence. "
            "Focus on practical applications and potential impact."
        ),
        expected_output=(
            "A detailed summary of the top 3 AI trends, including key "
            "points and sources."
        ),
        agent=researcher,
    )

    writing_task = Task(
        description=(
            "Write a 500-word blog post based on the research findings. "
            "The post should be engaging and easy for a general audience."
        ),
        expected_output="A complete 500-word blog post about the latest AI trends.",
        agent=writer,
        context=[research_task],  # Writer sees Researcher's output
    )

    return Crew(
        agents=[researcher, writer],
        tasks=[research_task, writing_task],
        process=Process.sequential,
        llm=llm,
        verbose=2,
    )
```

### Pattern 2: Hierarchical Parent-Child Delegation (Google ADK)

A coordinator agent delegates to specialized sub-agents based on its instructions. This creates a multi-layered organizational structure where higher-level agents oversee lower-level ones — well-suited for problems decomposable into sub-problems managed by specific layers.

```python
from google.adk.agents import LlmAgent, BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from typing import AsyncGenerator


class TaskExecutor(BaseAgent):
    """A custom non-LLM agent with predefined task behavior.

    Extends BaseAgent to implement deterministic or tool-based tasks
    that don't require LLM inference (e.g., data validation, file ops).
    """
    name: str = "TaskExecutor"
    description: str = "Executes a predefined task without LLM involvement."

    async def _run_async_impl(
        self, context: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        """Custom implementation logic for the task."""
        yield Event(author=self.name, content="Task finished successfully.")


def build_hierarchical_team() -> LlmAgent:
    """Create a parent coordinator with delegated sub-agents.

    The coordinator routes requests to Greeter or TaskExecutor
    based on the nature of the incoming request.
    """
    # Child agent 1: Handles greeting/friendly interactions
    greeter = LlmAgent(
        name="Greeter",
        model="gemini-2.0-flash-exp",
        instruction="You are a friendly greeter.",
    )

    # Child agent 2: Handles deterministic task execution
    task_doer = TaskExecutor()

    # Parent coordinator: delegates to children based on intent
    coordinator = LlmAgent(
        name="Coordinator",
        model="gemini-2.0-flash-exp",
        description=(
            "A coordinator that can greet users and execute tasks."
        ),
        instruction=(
            "When asked to greet, delegate to the Greeter. "
            "When asked to perform a task, delegate to the TaskExecutor."
        ),
        sub_agents=[greeter, task_doer],
    )

    # ADK automatically establishes parent-child relationships
    assert greeter.parent_agent == coordinator
    assert task_doer.parent_agent == coordinator

    return coordinator


# --- BAD vs GOOD Example ---

# ❌ BAD: No hierarchy — all agents called flatly with no delegation
def bad_flat_agents(llm_client: Any) -> None:
    """Bad example: Define agents but call them without a coordinator.
    Each agent operates in isolation with no shared context or delegation."""
    pass  # No orchestration logic — agents are disconnected

# ✅ GOOD: Coordinator routes to specialists via parent-child hierarchy
def good_hierarchical_agents() -> LlmAgent:
    """Good example: A coordinator agent delegates to specialized children.
    The parent manages task routing, reducing per-agent complexity."""
    return build_hierarchical_team()
```

### Pattern 3: LoopAgent for Iterative Workflows

Use LoopAgent when a process must repeat until a termination condition is met (e.g., processing steps that iterate until status="completed", polling operations, or iterative refinement). Combines an LlmAgent with a custom ConditionChecker that evaluates session state to decide whether to continue.

```python
import asyncio
from typing import AsyncGenerator
from google.adk.agents import LoopAgent, LlmAgent, BaseAgent
from google.adk.events import Event, EventActions
from google.adk.agents.invocation_context import InvocationContext


class ConditionChecker(BaseAgent):
    """Custom agent that checks session state for a 'completed' status.

    Yields an escalation event to terminate the loop when done,
    or a continuation event otherwise.
    """
    name: str = "ConditionChecker"
    description: (
        "Checks if a process is complete and signals the loop to stop."
    )

    async def _run_async_impl(
        self, context: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        """Check state and yield an event to continue or stop the loop."""
        status = context.session.state.get("status", "pending")
        is_done = (status == "completed")

        if is_done:
            # Escalate to terminate the loop when condition is met
            yield Event(author=self.name, actions=EventActions(escalate=True))
        else:
            # Yield a simple event to continue the loop
            yield Event(
                author=self.name,
                content="Condition not met, continuing loop.",
            )


def build_iterative_pipeline(max_iterations: int = 10) -> LoopAgent:
    """Create an iterative pipeline that repeats until status=completed.

    Each iteration runs ProcessingStep (LLM-driven task) followed by
    ConditionChecker (state-based termination decision). Max iterations
    serves as a safety bound against infinite loops.
    """
    # LLM agent performs one step of the overall process
    processing_step = LlmAgent(
        name="ProcessingStep",
        model="gemini-2.0-flash-exp",
        instruction=(
            "You are a step in a longer process. Perform your task. "
            "If you are the final step, update session state by setting "
            "'status' to 'completed'."
        ),
    )

    # Loop agent orchestrates: processing_step → condition_checker → repeat
    poller = LoopAgent(
        name="StatusPoller",
        max_iterations=max_iterations,
        sub_agents=[processing_step, ConditionChecker()],
    )

    return poller


# Safety note: Always set max_iterations to prevent infinite loops.
# A well-designed condition checker should terminate naturally within
# the iteration budget for normal inputs.
```

### Pattern 4: Parallel Agent Execution (Google ADK)

Multiple agents execute concurrently, each producing independent output stored in session state. Results are merged after all agents complete. Use this when sub-tasks are independent and parallelism provides a latency or coverage benefit.

```python
from google.adk.agents import Agent, ParallelAgent


def build_parallel_gatherer() -> ParallelAgent:
    """Create a ParallelAgent that fetches weather and news concurrently.

    Both sub-agents run simultaneously and store results in separate
    session state keys for downstream consumers to merge.
    """
    weather_fetcher = Agent(
        name="weather_fetcher",
        model="gemini-2.0-flash-exp",
        instruction=(
            "Fetch the weather for the given location and return "
            "only the weather report."
        ),
        output_key="weather_data",  # Stored in session.state["weather_data"]
    )

    news_fetcher = Agent(
        name="news_fetcher",
        model="gemini-2.0-flash-exp",
        instruction=(
            "Fetch the top news story for the given topic and "
            "return only that story."
        ),
        output_key="news_data",  # Stored in session.state["news_data"]
    )

    data_gatherer = ParallelAgent(
        name="data_gatherer",
        sub_agents=[weather_fetcher, news_fetcher],
    )

    return data_gatherer


def merge_parallel_results(final_state: dict[str, Any]) -> str:
    """Merge outputs from parallel agents into a unified report.

    Args:
        final_state: The session state after all parallel sub-agents complete.

    Returns:
        A formatted string combining weather and news data.
    """
    weather = final_state.get("weather_data", "No weather data available.")
    news = final_state.get("news_data", "No news data available.")

    return (
        f"## Daily Briefing\n\n"
        f"### Weather\n{weather}\n\n"
        f"### Top News\n{news}"
    )


# Usage:
# agent = build_parallel_gatherer()
# runner = Runner(agent=agent, ...)
# for event in runner.run(...):
#     pass  # events processed; results in final_state
# report = merge_parallel_results(runner.final_state)
```

### Pattern 5: Agent as Tool (Nested Agent Invocation)

An agent wraps another agent as a tool using `AgentTool`, enabling one agent to call another as if it were a function. This creates layered agent systems where higher-level agents orchestrate lower-level, specialized agents — ideal when you want the parent agent to compose capabilities rather than delegate responsibility.

```python
from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool


def generate_image(prompt: str) -> dict:
    """Simple function tool that simulates image generation.

    Args:
        prompt: A detailed description of the image to generate.

    Returns:
        Dict with status, image_bytes, and mime_type.
    """
    print(f"TOOL: Generating image for prompt: '{prompt}'")
    mock_image_bytes = b"mock_image_data_for_a_cat_wearing_a_hat"
    return {
        "status": "success",
        "image_bytes": mock_image_bytes,
        "mime_type": "image/png",
    }


def build_nested_agent_system() -> LlmAgent:
    """Create a layered agent system using AgentTool pattern.

    ArtistAgent (parent) invents a prompt, then calls ImageGenAgent
    (child wrapped as AgentTool) to generate the image. The parent
    agent never directly calls the image API — it delegates that
    responsibility to its specialized child.
    """
    # Child agent: responsible for the actual image generation
    image_generator_agent = LlmAgent(
        name="ImageGen",
        model="gemini-2.0-flash",
        description="Generates an image based on a detailed text prompt.",
        instruction=(
            "You are an image generation specialist. Your task is to take "
            "the user's request and use the `generate_image` tool to "
            "create the image. The user's entire request should be used "
            "as the 'prompt' argument for the tool. After the tool returns "
            "the image bytes, you MUST output the image."
        ),
        tools=[generate_image],
    )

    # Wrap child agent as a callable tool for the parent
    image_tool = agent_tool.AgentTool(
        agent=image_generator_agent,
        description=(
            "Use this tool to generate an image. The input should be a "
            "descriptive prompt of the desired image."
        ),
    )

    # Parent agent: orchestrates creativity by calling ImageGen as tool
    artist_agent = LlmAgent(
        name="Artist",
        model="gemini-2.0-flash",
        instruction=(
            "You are a creative artist. First, invent a creative and "
            "descriptive prompt for an image. Then, use the `ImageGen` "
            "tool to generate the image using your prompt."
        ),
        tools=[image_tool],  # ImageGen is now a tool callable from Artist
    )

    return artist_agent


# Architecture:
#   User → ArtistAgent (invents prompt) → calls image_tool (AgentTool)
#     → ImageGenAgent (receives prompt) → calls generate_image() → returns bytes
```

### Pattern 6: Debate and Consensus with Critic-Reviewer

Agents with varied perspectives evaluate options before converging. A critic-reviewer pattern where one agent creates and another critically assesses for correctness, compliance, quality, or security. The creator revises based on feedback. This reduces hallucinations and improves output robustness.

```python
from typing import Any


class DebateAgent:
    """Manages a multi-agent debate followed by consensus convergence.

    Flow:
      1. Define the question/options
      2. Each perspective agent argues its position independently
      3. A moderator agent evaluates arguments and identifies consensus
      4. Final answer synthesizes strongest points from all perspectives
    """

    def __init__(self, llm_client: Any) -> None:
        self.llm_client = llm_client

    def run_debate(
        self,
        question: str,
        perspectives: list[str],
        max_rounds: int = 3,
    ) -> dict[str, Any]:
        """Execute a structured debate with consensus convergence.

        Args:
            question: The decision or analysis question to resolve.
            perspectives: List of agent perspective labels (e.g., ["risk", "reward", "compliance"]).
            max_rounds: Maximum number of argument rounds before forced convergence.

        Returns:
            Dict with 'arguments' (per-perspective), 'consensus', and 'confidence'.
        """
        # Round 1: Each perspective argues independently
        arguments: dict[str, list[str]] = {p: [] for p in perspectives}

        for round_num in range(1, max_rounds + 1):
            round_args: dict[str, str] = {}
            for perspective in perspectives:
                prompt = (
                    f"QUESTION: {question}\n\n"
                    f"You are arguing from the '{perspective}' perspective. "
                    f"{'Present your initial position.' if round_num == 1 else 'Refine your argument based on previous positions.'}\n\n"
                    f"Previous arguments:\n"
                    + "\n".join(
                        f"[{p}]: {a}" for p, args in arguments.items()
                        for a in args[-3:] if round_num > 1 and args
                    )
                )
                response = self.llm_client.generate(prompt, max_tokens=1024)
                arguments[perspective].append(response)
                round_args[perspective] = response

            # Check convergence: all perspectives agree?
            if round_num > 1 and self._check_convergence(
                list(round_args.values())
            ):
                break

        # Moderator synthesizes consensus from strongest arguments
        consensus_prompt = (
            f"QUESTION: {question}\n\n"
            f"After hearing all perspectives, synthesize a consensus "
            f"answer that incorporates the strongest points from each view. "
            f"Be decisive — choose a clear recommendation."
        )
        for p, args in arguments.items():
            consensus_prompt += f"\n\n[{p}]:\n" + "\n".join(args)

        consensus = self.llm_client.generate(consensus_prompt, max_tokens=2048)

        return {
            "arguments": arguments,
            "consensus": consensus,
            "rounds_completed": len(arguments[perspectives[0]]),
        }

    def _check_convergence(self, responses: list[str], threshold: float = 0.85) -> bool:
        """Quick heuristic check for convergence between perspectives.

        In production, use a similarity model instead of this placeholder.

        Args:
            responses: Arguments from all perspectives in the current round.
            threshold: Minimum similarity score to consider converged.

        Returns:
            True if perspectives have sufficiently converged.
        """
        # Placeholder: compare first characters/keywords as proxy
        # Production should use embedding cosine similarity
        if len(set(r[:50] for r in responses)) < 2:
            return True
        return False


# --- BAD vs GOOD Example ---

# ❌ BAD: No structure — agents talk over each other, no convergence mechanism
def bad_undefined_debate(llm_client: Any) -> None:
    """Bad example: Call all agents with the same prompt and merge results naively.
    No moderation, no convergence logic, no structured output merging."""
    pass

# ✅ GOOD: Structured debate with rounds, moderator synthesis, convergence check
def good_debate_with_consensus(llm_client: Any) -> DebateAgent:
    """Good example: Multi-round debate with a moderator that synthesizes consensus.
    Each perspective argues independently, then the moderator converges on agreement."""
    return DebateAgent(llm_client=llm_client)


# Usage:
# agent = good_debate_with_consensus(llm_client)
# result = agent.run_debate(
#     question="Should we use PostgreSQL or MongoDB for this workload?",
#     perspectives=["relational_db_expert", "nosql_expert", "ops_engineer"],
#     max_rounds=3,
# )
```

### Pattern 7: Sequential Agent with Output Key (Google ADK)

Builds a linear workflow where the output of one agent becomes the input for the next via session state. Each step stores its result under a named key that subsequent steps reference.

```python
from google.adk.agents import SequentialAgent, Agent


def build_data_pipeline() -> SequentialAgent:
    """Create a two-stage sequential pipeline using output_key and state references.

    Step 1 fetches data and stores it under session.state["data"].
    Step 2 reads that data and produces a summary.
    This pattern scales to N stages by chaining output_key → instruction references.
    """
    step1 = Agent(
        name="Step1_Fetch",
        output_key="data",  # Response saved to session.state["data"]
    )

    step2 = Agent(
        name="Step2_Process",
        instruction=(
            "Analyze the information found in state['data'] and "
            "provide a summary."
        ),
    )

    pipeline = SequentialAgent(
        name="MyPipeline",
        sub_agents=[step1, step2],
    )

    return pipeline
```

---

## Communication Models Spectrum

The choice of interrelationship and communication model is a critical design decision. Chapter 7 defines six models on a complexity spectrum:

| Model | Structure | Pros | Cons |
|-------|-----------|------|------|
| **Single Agent** | One autonomous agent | Simple, low overhead | Limited scope, single point of failure in capability |
| **Network** | Peer-to-peer decentralized | Resilient to individual failures | High communication overhead, hard to manage coherence |
| **Supervisor** | Central hub coordinates workers | Clear authority, simple management | Supervisor is bottleneck and single point of failure |
| **Supervisor as Tool** | Supervisor provides resources, not commands | Flexible, less rigid control | Requires agents to self-direct effectively |
| **Hierarchical** | Multi-layered organization | Scalable, structured decision-making | Deep hierarchies slow communication |
| **Custom** | Hybrid/tailored design | Optimized for specific domain | Requires deep multi-agent expertise |

**Selection heuristic:** Start with the simplest model that handles your task complexity. A Supervisor works for most initial implementations; upgrade to Hierarchical or Custom only when you hit limits of coordination overhead or task decomposition granularity.

---

## Constraints

### MUST DO
- **Decompose before defining agents** — Never create agents without first identifying clear sub-task boundaries. Overlapping roles create conflicting outputs and wasted tokens.
- **Enforce typed contracts at every agent boundary** — Use structured output schemas (Pydantic, JSON Schema) to validate inter-agent data transfers. Raw string passing between agents is a production anti-pattern.
- **Set hard limits on all collaboration loops** — Always configure `max_iterations` for LoopAgents, `max_turns` for group chats, timeouts for parallel execution, and `max_tokens` per agent call.
- **Implement a quality gate between pipeline stages** — Every sequential handoff should have at least one validation checkpoint (rule-based or LLM-rated) to catch degraded outputs before they propagate downstream.
- **Build a result synthesizer** — When combining outputs from multiple agents, deduplicate findings, resolve contradictions via confidence-weighted voting or LLM arbitration, and produce a unified coherent result.
- **Reference `code-philosophy` laws** — Apply the 5 Laws of Elegant Defense: Early Exit (guard clauses at agent boundaries), Parse Don't Validate (typed contracts enforce structure), Atomic Predictability (pure output schemas), Fail Fast (quality gates reject bad outputs immediately), Intentional Naming (clear role names and output keys).
- **Limit team size** — Never use more than 6–8 agents in a single orchestration. Beyond this threshold, coordination overhead dominates useful work and failure rates compound unmanageably.

### MUST NOT DO
- **Never let an agent access tools outside its declared scope** — The allowed_tools list is a security boundary. Validate tool access at runtime against the agent's spec.
- **Never allow infinite loops in any collaboration pattern** — Always enforce `max_iterations`, `max_turns`, or iteration budget caps. Never rely on agents to self-terminate without safeguards.
- **Never skip inter-agent output validation** — Passing unchecked outputs downstream is the primary cause of cascading failures in multi-agent systems. If a stage produces invalid output, retry or fail fast.
- **Never use hierarchical delegation for flat problems** — A parent-child hierarchy adds unnecessary LLM call overhead for tasks that could be handled by a single agent with a well-crafted prompt.
- **Never hardcode agent selection order in supervisor patterns** — Use dynamic task decomposition based on the specific goal. Static decomposition misses opportunities for parallelization and wastes resources.
- **Never store sensitive data in shared session state without scoping** — Use key prefixes (`user:`, `app:`, `temp:`) to control data scope and persistence. Never put PII or credentials in session.state without proper access controls.

---

## Output Template

When this skill is active, the model's output should contain:

1. **Problem Decomposition** — Identified sub-tasks with boundaries and dependencies
2. **Agent Definitions** — Typed specs for each agent with role, tools, goals, and system prompt
3. **Topology Selection** — Justification for chosen collaboration pattern (sequential / parallel / hierarchical / debate)
4. **Orchestration Code** — Complete implementation using the selected framework (CrewAI, Google ADK, or custom Python)
5. **Communication Contracts** — Typed inter-agent data schemas and state management logic
6. **Quality Gates** — Validation checks at every pipeline stage with retry configuration
7. **Synthesis Logic** — How results merge, deduplicate, and resolve conflicts

```python
# Expected output structure (example for sequential pipeline)
pipeline = SequentialPipeline(llm_client=llm_client, max_retries=1)
pipeline.add_stage(researcher_spec, quality_gate=has_citations_gate)
pipeline.add_stage(analyst_spec, quality_gate=confidence_gate)
pipeline.add_stage(writer_spec, quality_gate=summary_gate)

result = pipeline.run({"query": "Analyze market trends for Q4 2025"})
# → {"success": True, "stage_results": [...], "final_output": {...}}
```

---

## Framework Reference

### CrewAI Quick Reference

| Component | Purpose | Key Parameters |
|-----------|---------|----------------|
| `Agent` | Defines role, goal, backstory, tools | `role`, `goal`, `backstory`, `allow_delegation` |
| `Task` | Defines description, expected output, agent | `description`, `expected_output`, `agent`, `context` |
| `Crew` | Assembles agents + tasks into a team | `agents`, `tasks`, `process`, `llm` |
| `Process.sequential` | Tasks execute in order | Each task sees prior task's output via `context` |
| `Crew.kickoff()` | Executes the crew | Returns final output as string |

### Google ADK Quick Reference

| Component | Purpose | Key Parameters |
|-----------|---------|----------------|
| `LlmAgent` | Standard LLM-based agent | `name`, `model`, `instruction`, `sub_agents` |
| `BaseAgent` | Custom non-LLM agent base class | Override `_run_async_impl()` |
| `SequentialAgent` | Linear pipeline of sub-agents | `name`, `sub_agents` |
| `ParallelAgent` | Concurrent execution of sub-agents | `name`, `sub_agents` |
| `LoopAgent` | Iterative workflow with max iterations | `name`, `max_iterations`, `sub_agents` |
| `AgentTool` | Wraps agent as callable tool | `agent`, `description` |
| `Session.state` | Per-session key-value storage | Use `output_key` or `EventActions.state_delta` to update |

---

## Live References

- [Multi-Agent Collaboration Mechanisms Survey (arXiv)](https://arxiv.org/abs/2501.06322)
- [CrewAI Framework Documentation](https://docs.crewai.com/concepts/how-crewai-works)
- [Google ADK Multi-Agent Patterns](https://google.github.io/adk-docs/)
- [LangGraph Multi-Agent Orchestration](https://langchain-ai.github.io/langgraph/concepts/multi_agent/)
- [AutoGen: Enabling Next-Gen LLM Applications (Microsoft)](https://arxiv.org/abs/2308.08155)
- [Multi-Agent System — The Power of Collaboration](https://aravindakumar.medium.com/introducing-multi-agent-frameworks-the-power-of-collaboration-e9db31bba1b6)
