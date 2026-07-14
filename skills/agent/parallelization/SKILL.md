---
name: parallelization
description: Implements concurrent task execution patterns (parallel branches, fan-out/fan-in, multi-API calls, multi-modal processing) to reduce total agent processing time through independent subtask parallelism.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: parallelization, concurrent execution, fan-out fan-in, parallel branches, multi-API calls, how do i run tasks in parallel, RunnableParallel
  related-skills: prompt-chaining,multi-agent-orchestration,langgraph
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

# Parallelization Pattern

Implements concurrent task execution to reduce total processing time by identifying independent sub-tasks and running them simultaneously across LLM calls, tool usages, API requests, or entire sub-agents. This skill covers LangChain LCEL's `RunnableParallel`, Google ADK's `ParallelAgent`, fan-out/fan-in orchestration, multi-API interactions, multi-modal processing, and A/B option generation.

## TL;DR Checklist

- [ ] Identify truly independent sub-tasks with no cross-dependencies before parallelizing
- [ ] Use `RunnableParallel` (LangChain LCEL) or `ParallelAgent` (Google ADK) as the primary construct
- [ ] Ensure each parallel branch has its own prompt, model call, and output parser
- [ ] Add a fan-in synthesis step that combines all parallel results sequentially after convergence
- [ ] Use `asyncio.run()` with `.ainvoke()` for async execution; never block on parallel branches
- [ ] Set `output_key` on each sub-agent or use explicit dictionary keys for result routing
- [ ] Validate independence: if any branch's output feeds another branch's input, do NOT parallelize

---

## When to Use

Use this skill when designing an agentic workflow that contains multiple independent operations:

- **Multi-source research** — Searching news articles, pulling stock data, checking social media, and querying a database simultaneously for a single topic
- **Multi-API calls** — A travel agent fetching flight prices, hotel availability, local events, and restaurant recommendations from different services concurrently
- **Multi-modal processing** — Analyzing text sentiment and image content at the same time for a single social media post
- **A/B option generation** — Generating multiple creative headlines or response variants in parallel to compare quality
- **Batch data analysis** — Running sentiment analysis, keyword extraction, categorization, and urgency detection across feedback entries simultaneously
- **Validation & verification** — Checking email format, phone number validity, address database lookup, and profanity filtering concurrently on user input

---

## When NOT to Use

Avoid this skill for:

- **Sequential pipelines where output A feeds input B** — If step 2 depends on step 1's result, use `prompt-chaining` instead
- **Single LLM call with multiple instructions** — One prompt that asks an LLM to do everything is simpler and avoids extra API latency from fan-in synthesis
- **Tasks with shared mutable state** — Sub-tasks that write to the same external resource (database, file) during execution risk race conditions; serialize those operations
- **Fewer than 2 independent tasks** — Parallelization adds orchestration overhead; if there's only one task or a trivial number, sequential is faster
- **Tight latency budgets under 100ms** — Fan-out/fan-in introduces coordination overhead that may exceed the cost of a single synchronous call

---

## Core Workflow

1. **Decompose the workflow into independent sub-tasks.** Break the overall goal into discrete operations where no sub-task reads the output of another during execution. Draw a dependency graph: if edges exist between nodes, those nodes are not parallelizable. **Checkpoint:** Every pair of candidate parallel tasks has zero directed edges between them in the dependency graph.

2. **Select the parallelization construct for your framework.** For LangChain LCEL, use `RunnableParallel` to define concurrent branches as a dictionary mapping keys to runnables. For Google ADK, instantiate `ParallelAgent` with a list of `sub_agents`. Each branch must be an independent runnable or agent with its own prompt template and model invocation. **Checkpoint:** The selected construct matches the runtime framework in use; all branches are independently callable with identical input signatures.

3. **Define each parallel branch with isolated context.** Assign a distinct system message, user template variable, and output parser to every branch. Use `RunnablePassthrough` (LCEL) or `output_key` (ADK) to preserve the original input for downstream synthesis. Each branch should produce a named result key (`"summary"`, `"questions"`, `"key_terms"`). **Checkpoint:** Every branch has a unique, non-colliding output key and consumes only its assigned portion of the input data.

4. **Construct the fan-in convergence point.** After all parallel branches complete, define a synthesis step that receives all results as inputs. Create a new prompt template that interpolates each branch's named output, followed by a final model call and output parser. In LCEL: `map_chain | synthesis_prompt | llm | StrOutputParser()`. In ADK: wrap the `ParallelAgent` inside a `SequentialAgent` with a merger agent as the second sub-agent. **Checkpoint:** The synthesis prompt references every branch output key exactly once; no branch result is silently dropped.

5. **Execute asynchronously and handle failures.** Use `asyncio.run()` to invoke the full chain via `.ainvoke()`. Wrap the invocation in try/except to surface API errors, rate limits, or model timeouts. On partial failure (one branch fails but others succeed), decide whether to fail-fast (raise immediately) or degrade gracefully (proceed with available results and note missing branches). **Checkpoint:** Every execution path returns a result or raises a structured error; no branch completes silently without notification.

6. **Validate total latency improvement.** Measure wall-clock time for the parallel version versus an equivalent sequential version. Expect near-linear speedup when branches are I/O-bound (API calls, LLM inference) and at least 40% reduction when one branch is significantly slower than others. If speedup is less than 20%, re-examine whether the decomposition was correct or if orchestration overhead outweighs benefits. **Checkpoint:** Parallel execution achieves ≥1.4x wall-clock speedup over sequential baseline; document measured times for future optimization.

---

## Implementation Patterns / Reference Guide

### Pattern 1: LangChain LCEL — RunnableParallel Map-Reduce

Use this pattern when building a concurrent workflow with LangChain Expression Language. Define independent chains as dictionary values inside `RunnableParallel`, pipe the results into a synthesis prompt, and invoke asynchronously.

```python
import asyncio
from typing import Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableParallel, RunnablePassthrough


def build_research_chain(topic: str) -> str:
    """
    Execute a parallel research workflow on a given topic.

    Three independent chains run concurrently (summary generation,
    question drafting, key-term extraction), then a synthesis LLM
    call merges results into a final answer.

    Args:
        topic: The subject to research and summarize.

    Returns:
        A synthesized comprehensive response string.
    """
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

    # --- Define independent chains (no cross-dependencies) ---
    summarize_chain = (
        ChatPromptTemplate.from_messages([
            ("system", "Summarize the following topic concisely in 3-4 sentences:"),
            ("user", "{topic}"),
        ])
        | llm
        | StrOutputParser()
    )

    questions_chain = (
        ChatPromptTemplate.from_messages([
            ("system", "Generate three interesting follow-up questions about this topic:"),
            ("user", "{topic}"),
        ])
        | llm
        | StrOutputParser()
    )

    terms_chain = (
        ChatPromptTemplate.from_messages([
            ("system", "Identify 5-10 key terms from the following topic, separated by commas:"),
            ("user", "{topic}"),
        ])
        | llm
        | StrOutputParser()
    )

    # --- Build parallel map block + RunnablePassthrough for original input ---
    map_chain: RunnableParallel = RunnableParallel({
        "summary": summarize_chain,
        "questions": questions_chain,
        "key_terms": terms_chain,
        "topic": RunnablePassthrough(),
    })

    # --- Fan-in: Synthesis prompt consumes all parallel outputs ---
    synthesis_prompt = ChatPromptTemplate.from_messages([
        ("system", """Based on the following research results:
Summary: {summary}
Related Questions: {questions}
Key Terms: {key_terms}

Synthesize a comprehensive, well-structured answer that integrates
all three perspectives. Cite the original topic: {topic}."""),
        ("user", "Produce the final synthesized response."),
    ])

    full_chain = map_chain | synthesis_prompt | llm | StrOutputParser()
    return asyncio.get_event_loop().run_until_complete(full_chain.ainvoke(topic))
```

**BAD — Sequential branches that could be parallel:**

```python
# ❌ BAD: Three LLM calls in series — total time = T1 + T2 + T3
summary_result = summarize_chain.invoke({"topic": topic})
questions_result = questions_chain.invoke({"topic": topic})
terms_result = terms_chain.invoke({"topic": topic})
# Each call waits for the previous one to complete. Wastes ~4-9 seconds.
```

**GOOD — Parallel branches with RunnableParallel:**

```python
# ✅ GOOD: All three LLM calls execute concurrently via RunnableParallel
map_chain = RunnableParallel({
    "summary": summarize_chain,
    "questions": questions_chain,
    "key_terms": terms_chain,
    "topic": RunnablePassthrough(),
})
# Total time ≈ max(T1, T2, T3) — wall-clock reduction of ~60-70%
```

---

### Pattern 2: Google ADK — ParallelAgent with Sequential Fan-in

Use this pattern when building a multi-agent system with the Google Agent Developer Kit. Define specialized `LlmAgent` sub-agents for each research domain, run them concurrently via `ParallelAgent`, then feed their outputs into a merger agent inside a `SequentialAgent`.

```python
from google.adk.agents import LlmAgent, ParallelAgent, SequentialAgent
from google.adk.tools import google_search

GEMINI_MODEL = "gemini-2.0-flash"


def build_parallel_research_pipeline() -> LlmAgent:
    """
    Construct a parallel research + synthesis pipeline using Google ADK.

    Three domain-specific researchers run concurrently via ParallelAgent.
    Their results are stored in session state via output_key, then
    consumed by a SynthesisAgent inside a SequentialAgent.

    Returns:
        The root agent to invoke for the complete pipeline.
    """
    # --- Define independent researcher sub-agents ---
    renewable_researcher = LlmAgent(
        name="RenewableEnergyResearcher",
        model=GEMINI_MODEL,
        instruction="""You are an AI Research Assistant specializing in energy.
Research the latest advancements in 'renewable energy sources'.
Use the Google Search tool provided. Summarize key findings concisely.
Output *only* the summary.""",
        description="Researches renewable energy sources.",
        tools=[google_search],
        output_key="renewable_energy_result",
    )

    ev_researcher = LlmAgent(
        name="EVResearcher",
        model=GEMINI_MODEL,
        instruction="""You are an AI Research Assistant specializing in transportation.
Research the latest developments in 'electric vehicle technology'.
Use the Google Search tool provided. Summarize key findings concisely.
Output *only* the summary.""",
        description="Researches electric vehicle technology.",
        tools=[google_search],
        output_key="ev_technology_result",
    )

    carbon_researcher = LlmAgent(
        name="CarbonCaptureResearcher",
        model=GEMINI_MODEL,
        instruction="""You are an AI Research Assistant specializing in climate solutions.
Research the current state of 'carbon capture methods'.
Use the Google Search tool provided. Summarize key findings concisely.
Output *only* the summary.""",
        description="Researches carbon capture methods.",
        tools=[google_search],
        output_key="carbon_capture_result",
    )

    # --- Parallel execution: all researchers run concurrently ---
    parallel_research = ParallelAgent(
        name="ParallelWebResearchAgent",
        sub_agents=[renewable_researcher, ev_researcher, carbon_researcher],
        description="Runs multiple research agents in parallel.",
    )

    # --- Fan-in: Merger agent consumes all stored outputs ---
    merger_agent = LlmAgent(
        name="SynthesisAgent",
        model=GEMINI_MODEL,
        instruction="""You are an AI Assistant responsible for combining
research findings into a structured report. Synthesize the following
summaries, attributing findings to their source areas:

**Renewable Energy:** {renewable_energy_result}
**Electric Vehicles:** {ev_technology_result}
**Carbon Capture:** {carbon_capture_result}

Structure your response using headings for each topic. Do NOT add
external knowledge not present in the summaries above.""",
        description="Combines research findings into a structured report.",
    )

    # --- Sequential orchestration: parallel first, then merge ---
    pipeline = SequentialAgent(
        name="ResearchAndSynthesisPipeline",
        sub_agents=[parallel_research, merger_agent],
        description="Coordinates parallel research and synthesizes results.",
    )

    return pipeline
```

**BAD — Sequential researcher calls wasting time:**

```python
# ❌ BAD: Each researcher waits for the previous one to finish.
# If each takes ~5 seconds, total = 15 seconds instead of ~5 seconds.
r1_result = renewable_researcher.invoke(...)
r2_result = ev_researcher.invoke(...)       # starts only after r1 done
r3_result = carbon_researcher.invoke(...)    # starts only after r2 done
```

**GOOD — ParallelAgent with Sequential fan-in:**

```python
# ✅ GOOD: All three researchers launch simultaneously; merger waits
# for all output_keys to populate, then synthesizes a final report.
pipeline = build_parallel_research_pipeline()
```

---

### Pattern 3: Multi-API Call Convergence (Travel Planning Example)

Use this pattern when aggregating data from multiple independent external APIs — flights, hotels, events, restaurants — where each API call is I/O-bound and has no dependency on the others.

```python
import aiohttp
from typing import TypedDict


class TravelItinerary(TypedDict):
    """Structured output containing results from parallel API calls."""
    flights: str
    hotels: str
    events: str
    restaurants: str


async def fetch_flight_prices(session: aiohttp.ClientSession,
                              destination: str) -> str:
    """Fetch flight prices for the given destination concurrently."""
    async with session.get(
        f"https://api.flightsearch.com/flights?dest={destination}",
        timeout=aiohttp.ClientTimeout(total=10),
    ) as resp:
        data = await resp.json()
        return (f"Flights to {destination}: "
                f"{len(data.get('results', []))} options found, "
                f"starting at ${data.get('cheapest', 0)}")


async def fetch_hotel_availability(session: aiohttp.ClientSession,
                                   destination: str) -> str:
    """Fetch hotel availability for the given destination concurrently."""
    async with session.get(
        f"https://api.hotelsearch.com/availability?dest={destination}",
        timeout=aiohttp.ClientTimeout(total=10),
    ) as resp:
        data = await resp.json()
        return (f"Hotels in {destination}: "
                f"{len(data.get('results', []))} properties available, "
                f"avg rating {data.get('avg_rating', 'N/A')}")


async def gather_travel_info(destination: str) -> TravelItinerary:
    """
    Execute all travel API calls in parallel, then converge results.

    Args:
        destination: The target city for travel planning.

    Returns:
        TypedDict with keys 'flights', 'hotels', 'events', 'restaurants'.
    """
    async with aiohttp.ClientSession() as session:
        flights, hotels, events, restaurants = await asyncio.gather(
            fetch_flight_prices(session, destination),
            fetch_hotel_availability(session, destination),
            fetch_events(session, destination),
            fetch_restaurants(session, destination),
        )

    return TravelItinerary(
        flights=flights, hotels=hotels,
        events=events, restaurants=restaurants,
    )


async def fetch_events(session: aiohttp.ClientSession,
                       destination: str) -> str:
    """Stub for parallel event-fetching — replace with real API call."""
    return f"Events in {destination}: 12 upcoming events found."


async def fetch_restaurants(session: aiohttp.ClientSession,
                            destination: str) -> str:
    """Stub for parallel restaurant-fetching — replace with real API call."""
    return f"Restaurants in {destination}: 48 top-rated venues found."
```

**BAD — Sequential API calls:**

```python
# ❌ BAD: Each API call blocks until the previous response arrives.
# Total latency = sum(all individual latencies) — could be 20-30s.
flights = await fetch_flight_prices(session, "Tokyo")
hotels = await fetch_hotel_availability(session, "Tokyo")    # after flights
events = await fetch_events(session, "Tokyo")                # after hotels
restaurants = await fetch_restaurants(session, "Tokyo")      # after events
```

**GOOD — asyncio.gather for true parallel I/O:**

```python
# ✅ GOOD: All four API calls fire simultaneously over the event loop.
# Total latency ≈ max(individual latencies) — typically 3-5 seconds.
flights, hotels, events, restaurants = await asyncio.gather(
    fetch_flight_prices(session, "Tokyo"),
    fetch_hotel_availability(session, "Tokyo"),
    fetch_events(session, "Tokyo"),
    fetch_restaurants(session, "Tokyo"),
)
```

---

### Pattern 4: A/B Option Generation (Creative Variants in Parallel)

Use this pattern when generating multiple creative outputs to compare quality — headlines, ad copy, product descriptions — where each variant is independently generated from a slightly different prompt.

```python
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser


def generate_creative_variants(topic: str, count: int = 3) -> List[str]:
    """
    Generate multiple creative variants in parallel for A/B comparison.

    Each variant uses a distinct angle/prompt to encourage diversity in
    the generated outputs, enabling side-by-side quality evaluation.

    Args:
        topic: The subject matter for variant generation.
        count: Number of variants to generate (default 3).

    Returns:
        List of unique creative output strings, ready for comparison.
    """
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.9)

    angles = [
        ("professional", "Write a professional, data-driven description."),
        ("creative", "Write an imaginative, story-like description."),
        ("concise", "Write a punchy, one-sentence hook."),
        ("technical", "Write a detailed, specification-focused description."),
        ("conversational", "Write as if speaking directly to the reader."),
    ]

    # Select only the requested number of angles
    selected_angles = angles[:count]

    # Build independent variant chains
    variant_chains = {
        f"variant_{i}": (
            ChatPromptTemplate.from_messages([
                ("system", f"You are a copywriter. {angle}. Topic: {{topic}}."),
                ("user", "Generate the content."),
            ])
            | llm
            | StrOutputParser()
        )
        for i, (angle, _) in enumerate(selected_angles)
    }

    map_chain = RunnableParallel(variant_chains)

    # No fan-in synthesis — return raw variants for external comparison
    result = asyncio.get_event_loop().run_until_complete(
        map_chain.ainvoke({"topic": topic})
    )

    return list(result.values())


# Usage: variants = generate_creative_variants("AI-powered code review", count=3)
# Returns: ["Professional description...", "Creative description...", ...]
```

---

## Constraints

### MUST DO

1. **Prove independence before parallelizing.** Draw a dependency graph and verify no sub-task reads another's output during execution. If any edge exists, the tasks must run sequentially (`prompt-chaining`). This is the single most important check — false parallelization causes silent data corruption.
2. **Name every branch output explicitly.** Use dictionary keys in LCEL (`RunnableParallel`) or `output_key` in ADK (`ParallelAgent`). Never rely on positional results; always use named access to prevent key collisions when branches produce similar output types.
3. **Wrap fan-in synthesis in a dedicated prompt.** The convergence step must have its own system message that explicitly instructs the model how to combine, attribute, and reconcile results from multiple parallel branches. Do not concatenate raw outputs into the original prompt.
4. **Use async execution for I/O-bound branches.** Always invoke parallel chains with `.ainvoke()` inside `asyncio.run()`. Never use synchronous `.invoke()` on parallel branches — it defeats the concurrency benefit entirely.
5. **Reference the 5 Laws of Elegant Defense in branch design.** Apply *Early Exit* (guard clauses before launching branches), *Fail Fast* (raise immediately when a required branch fails), and *Parse Don't Validate* (trust each branch's output format after successful completion, validate only at boundaries). See `code-philosophy`.
6. **Add timeout configuration to all external API calls.** When parallelizing multi-API interactions, set explicit `aiohttp.ClientTimeout` or framework equivalents on every branch. A hung branch blocks the entire fan-in; timeouts prevent cascading failures.
7. **Benchmark parallel vs sequential execution.** Measure wall-clock time for both approaches and document the speedup ratio. If improvement is below 20%, reconsider whether the overhead of orchestration, fan-in synthesis, or framework coordination outweighs concurrency gains.

### MUST NOT DO

1. **Parallelize dependent tasks.** Never run branches concurrently when one branch's input depends on another branch's output. This creates race conditions where the consumer reads incomplete or missing data. Use sequential chains instead.
2. **Use `RunnableParallel` or `ParallelAgent` for a single task.** Parallelization constructs add orchestration overhead (state management, result aggregation, convergence logic). If only one independent operation exists, invoke it directly without wrapping in a parallel construct.
3. **Omit the fan-in synthesis step.** Every parallel workflow must have a convergence point that combines branch results into a coherent output. Leaving branches to return scattered results to the caller shifts coordination responsibility outside the agent and is a design anti-pattern.
4. **Share mutable state between parallel branches.** Never allow two concurrent sub-tasks to write to the same file, database row, or session variable. Branches must be pure or write to isolated resources. Use `output_key` in ADK for safe result storage — never shared dictionaries.
5. **Mix synchronous and asynchronous invocations in the same parallel block.** All branches within a `RunnableParallel` or `ParallelAgent` must use the same concurrency model. Mixing `.invoke()` (blocking) with `.ainvoke()` (async) causes deadlocks and undefined behavior.
6. **Generate more than 8 parallel branches without explicit justification.** Each additional branch increases coordination overhead, context-window pressure during synthesis, and error surface area. If you need more than 8 independent operations, consider chunking into batches of ≤8 with sequential batch processing.

---

## Output Template

When this skill is active, your output must contain:

1. **Dependency Analysis** — State which tasks are truly independent (parallelizable) vs. dependent (sequential). Include a brief ASCII dependency diagram if the workflow has ≥3 branches.
2. **Construct Selection** — Name the framework and parallelization construct you are using (`RunnableParallel` for LCEL, `ParallelAgent` for ADK, `asyncio.gather` for raw Python). Justify why this construct is appropriate.
3. **Branch Definitions** — For each parallel branch, show: (a) input signature, (b) prompt/template, (c) model call, (d) output key/name, (e) error handling strategy.
4. **Fan-In Convergence** — Show the synthesis step that consumes all branch results. Include the full convergence prompt template with every branch key interpolated.
5. **Invocation Code** — Provide the complete async invocation with `asyncio.run()` or framework-equivalent runner, including try/except error handling.
6. **Latency Note** — State expected wall-clock speedup factor and list which branches are I/O-bound vs. compute-bound to explain the timing model.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-chaining` | Sequential workflows where one step's output feeds another's input — the counterpart to parallelization |
| `multi-agent-orchestration` | Coordinating multiple agents with complex routing, fallback, and state management across parallel and sequential phases |
| `langgraph` | Graph-based workflow definition in LangChain; supports parallel nodes, conditional edges, and stateful fan-in/fan-in patterns beyond simple LCEL dictionaries |

---

## References

1. LangChain Expression Language (LCEL) Documentation — [Parallelism](https://python.langchain.com/docs/concepts/lcel/)
2. Google Agent Developer Kit (ADK) — [Multi-Agent Systems](https://google.github.io/adk-docs/agents/multi-agents/)
3. Python asyncio Documentation — [asyncio.gather](https://docs.python.org/3/library/asyncio.html)
