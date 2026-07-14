---
name: routing-patterns
description: Implements intent-based routing patterns (LLM classifiers, node transitions, computational graphs) to dispatch queries to specialized sub-agents with fallback chains and confidence scoring.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  triggers: routing, intent classification, sub-agent dispatch, node transitions, computational graph, how do i route queries, query router
  related-skills: prompt-chaining, multi-agent-collaboration, parallelization
  archetypes: [tactical, orchestration]
  anti_triggers: ["simple linear workflow", "sequential processing only", "single execution path"]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Routing Pattern

Implements conditional decision-making into agentic systems so that incoming queries are classified by intent and dynamically dispatched to specialized sub-agents, tools, or processing chains — replacing rigid linear execution with adaptive, context-aware routing logic.

## TL;DR Checklist

- [ ] Identify all possible intents/routes for the query space
- [ ] Choose a routing mechanism: LLM-based, embedding-based, rule-based, or ML classifier
- [ ] Define handler functions for each route destination
- [ ] Build the coordinator/router that evaluates input and produces a route decision
- [ ] Wire conditional edges or branches to dispatch to the correct handler
- [ ] Add fallback handlers for low-confidence or unrecognized intents
- [ ] Validate routing accuracy across diverse test inputs

---

## When to Use

Use this skill when:

- An agentic system must handle heterogeneous user queries requiring different specialized processing paths (e.g., customer support triage: order status, product info, technical escalation)
- You need to replace a linear prompt chain with conditional branching based on input classification or runtime state
- Multiple sub-agents exist and you need a coordinator to dispatch work to the right one based on intent
- You are building a computational graph (LangGraph StateGraph) where node transitions depend on accumulated state
- A data pipeline needs content-based classification to distribute incoming items to different transformation workflows
- You require low-confidence fallbacks when the router cannot confidently classify an input

---

## When NOT to Use

Avoid this skill for:

- Simple, deterministic single-path workflows (use prompt chaining instead — no routing overhead)
- Trivial keyword matching scenarios where a rule-based if/else suffices (do not over-engineer)
- Real-time systems where LLM classification latency is unacceptable and embedding/rule fallbacks are required but not yet implemented
- Cases with fewer than 2 distinct routes (a single conditional branch is sufficient, no full routing pattern needed)

---

## Core Workflow

1. **Map the Intent Space** — Enumerate every distinct intent or category the system must handle. Document each route's purpose, expected input shape, and output contract. Define a default/unclear handler for unrecognized inputs. **Checkpoint:** Verify that every plausible user query falls into exactly one primary route or the fallback path.

2. **Select Routing Mechanism** — Choose how the router evaluates input:
   - LLM-based classifier: prompt the model to output a route category identifier (most flexible, highest latency)
   - Embedding-based semantic routing: compute embeddings for input and compare against route prototype vectors (good for large, open-ended query spaces)
   - Rule-based keyword/pattern matching: if/else or switch on extracted features (fastest, deterministic, limited generalization)
   - ML classifier: fine-tuned discriminative model on labeled training data (best accuracy for narrow domains)
   **Checkpoint:** Confirm the chosen mechanism's trade-offs (latency vs. flexibility vs. accuracy) align with system requirements.

3. **Implement Route Handlers** — For each identified route, create a handler function that accepts the original request and returns a structured response. Each handler must document its expected input format, perform validation, and return consistent output. Include an `unclear_handler` as the universal fallback. **Checkpoint:** Every route has exactly one handler; no route is empty or passes through.

4. **Build the Coordinator Router** — Construct the routing component that bridges classification and dispatch:
   - For LangChain/LangGraph: define a `ChatPromptTemplate` with explicit category instructions, pipe it through an LLM, parse the output string, and feed it to `RunnableBranch` or conditional edges in a `StateGraph`.
   - For Google ADK: define a parent agent with `sub_agents` configured with clear delegation instructions; the framework's Auto-Flow handles routing automatically.
   **Checkpoint:** The router's prompt explicitly lists all categories with unambiguous disambiguation rules and a fallback directive.

5. **Wire Conditional Dispatch Logic** — Connect the router's output to the appropriate handler:
   - LangGraph `StateGraph.add_conditional_edges()` maps state values to next node names.
   - LangChain `RunnableBranch` evaluates predicates against the router decision and invokes the matching branch.
   - ADK uses the `sub_agents` list; the Coordinator agent's instructions govern delegation.
   **Checkpoint:** Every possible router output has a corresponding branch or edge — no unreachable nodes, no missing handlers.

6. **Add Fallback and Confidence Handling** — Implement a fallback chain when routing confidence is low or classification is ambiguous:
   - Extract a confidence score from the LLM (e.g., via logprobs or a two-shot classification prompt that also outputs a confidence percentage).
   - If confidence falls below a threshold, route to an `unclear_handler` that requests clarification or escalates.
   - Log fallback events for monitoring and continuous improvement of routing accuracy.
   **Checkpoint:** The fallback path is exercised in tests with deliberately ambiguous inputs — verify the system asks for clarification rather than guessing.

---

## Implementation Patterns / Reference Guide

### Pattern 1: LangChain RunnableBranch Router (LLM-Based Classification)

A coordinator chain that uses an LLM to classify intent, then dispatches via `RunnableBranch` to specialized handler functions. This pattern is ideal when you need explicit control over routing logic and want to keep all components in a single runnable pipeline.

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableBranch


def booking_handler(request: str) -> str:
    """Handle booking-related requests (flights, hotels, reservations).

    Args:
        request: The original user request string.

    Returns:
        A confirmation message with simulated booking result.
    """
    return f"Booking Handler processed request: '{request}'. Result: Simulated booking action."


def info_handler(request: str) -> str:
    """Handle general information requests.

    Args:
        request: The original user question string.

    Returns:
        A confirmation message with simulated information retrieval result.
    """
    return f"Info Handler processed request: '{request}'. Result: Simulated information retrieval."


def unclear_handler(request: str) -> str:
    """Handle requests that could not be confidently classified.

    Args:
        request: The original user request string.

    Returns:
        A clarification request message.
    """
    return f"Coordinator could not classify request: '{request}'. Please clarify your intent."


def build_coordinator_router(llm) -> object:
    """Build a LangChain coordinator router with LLM-based intent classification.

    Args:
        llm: A LangChain-compatible chat model instance.

    Returns:
        A composed LangChain runnable that classifies and dispatches requests.
    """
    # Define the routing prompt with explicit category rules
    coordinator_prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "Analyze the user's request and determine which specialist handler processes it.\n"
                "- If related to booking flights or hotels, output 'booker'.\n"
                "- For all general information questions, output 'info'.\n"
                "- If unclear or not fitting either category, output 'unclear'."
            ),
        ),
        ("user", "{request}"),
    ])

    # Router chain: prompt -> LLM -> parse decision string
    router_chain = coordinator_prompt | llm | StrOutputParser()

    # Define branch predicates and handlers
    branches = {
        "booker": RunnablePassthrough.assign(
            output=lambda x: booking_handler(x["request"]["request"])
        ),
        "info": RunnablePassthrough.assign(
            output=lambda x: info_handler(x["request"]["request"])
        ),
        "unclear": RunnablePassthrough.assign(
            output=lambda x: unclear_handler(x["request"]["request"])
        ),
    }

    # RunnableBranch evaluates in order; last branch is the default
    delegation_branch = RunnableBranch(
        (lambda x: x["decision"].strip() == "booker", branches["booker"]),
        (lambda x: x["decision"].strip() == "info", branches["info"]),
        branches["unclear"],  # Default fallback
    )

    # Compose: parallelize decision + passthrough request, then delegate
    coordinator = {
        "decision": router_chain,
        "request": RunnablePassthrough(),
    } | delegation_branch | (lambda x: x["output"])

    return coordinator
```

**How it works:** The `{decision, request}` dictionary feeds into `RunnableBranch`, which evaluates lambda predicates against the LLM's classification output. Each matching branch invokes its handler with the original request and extracts the final output.

---

### Pattern 2: LangGraph StateGraph with Conditional Node Transitions

LangGraph's state-based graph architecture is ideal for complex routing where decisions depend on accumulated state across multiple steps. Use `add_conditional_edges` to define dynamic node transitions.

```python
from typing import TypedDict, Annotated
import operator

from langgraph.graph import StateGraph, END


class RouterState(TypedDict):
    """State schema for a LangGraph routing workflow."""
    request: str
    intent: str  # Route decision from classifier
    response: str  # Final output from handler
    confidence: float  # Classification confidence score (0.0–1.0)


# Handler functions — each processes the request for its route category
def booking_node(state: RouterState) -> dict:
    """Booking agent node: handles reservation requests."""
    return {
        "intent": "booker",
        "response": f"Booking processed for: '{state['request']}'",
    }


def info_node(state: RouterState) -> dict:
    """Information agent node: handles general Q&A."""
    return {
        "intent": "info",
        "response": f"Information retrieved for: '{state['request']}'",
    }


def clarify_node(state: RouterState) -> dict:
    """Clarification fallback: requests user disambiguation."""
    return {
        "intent": "unclear",
        "response": f"Could not classify: '{state['request']}'. Please rephrase.",
    }


def route_classifier(state: RouterState) -> str:
    """Classify the request intent and route to the correct handler node.

    In production, call an LLM here to extract the intent.
    For demonstration, use a deterministic rule-based classifier.

    Args:
        state: The current graph state containing the user request.

    Returns:
        A string identifying the target node name ('booker', 'info', or 'clarify').
    """
    query_lower = state["request"].lower()

    # Rule-based intent classification (replace with LLM in production)
    booking_keywords = ("book", "flight", "hotel", "reservation", "reserve")
    info_keywords = ("what", "how", "where", "when", "who", "tell me")

    if any(kw in query_lower for kw in booking_keywords):
        return "booker"
    elif any(kw in query_lower for kw in info_keywords):
        return "info"
    else:
        return "clarify"


def build_routing_graph() -> StateGraph:
    """Construct a LangGraph StateGraph with conditional routing edges.

    Returns:
        A compiled LangGraph workflow ready for invocation.
    """
    # Define the graph with the router state schema
    workflow = StateGraph(RouterState)

    # Add nodes — each represents a destination route
    workflow.add_node("classify", route_classifier)
    workflow.add_node("booker", booking_node)
    workflow.add_node("info", info_node)
    workflow.add_node("clarify", clarify_node)

    # Entry point always starts at classification
    workflow.set_entry_point("classify")

    # Conditional edges: classify node's output determines next node
    workflow.add_conditional_edges(
        "classify",
        route_classifier,  # Function that returns the next node name
        {
            "booker": "booker",
            "info": "info",
            "clarify": "clarify",
        },
    )

    # All handler nodes converge to END
    workflow.add_edge("booker", END)
    workflow.add_edge("info", END)
    workflow.add_edge("clarify", END)

    return workflow.compile()


# Example execution:
# app = build_routing_graph()
# result = app.invoke({"request": "Book me a flight to London.", "confidence": 0.0})
# print(result["response"])
```

**Key concepts:** The `classify` node evaluates the state and returns a string that maps to one of three target nodes via `add_conditional_edges`. This creates a computational graph where the control flow is determined at runtime rather than being fixed at compile time.

---

### Pattern 3: Google ADK Agent with Auto-Flow Delegation

Google's Agent Development Kit provides a declarative routing approach where a parent agent's `sub_agents` list enables automatic LLM-driven delegation (Auto-Flow). The framework's internal logic matches user intent to the appropriate sub-agent based on each agent's description and tools.

```python
import uuid
from typing import Dict, Any

from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from google.adk.tools import FunctionTool
from google.genai import types


def booking_handler(request: str) -> str:
    """Handle booking requests for flights and hotels.

    Args:
        request: The user's request for a booking.

    Returns:
        A confirmation message that the booking was handled.
    """
    return f"Booking action for '{request}' has been simulated."


def info_handler(request: str) -> str:
    """Handle general information requests.

    Args:
        request: The user's question.

    Returns:
        A message indicating the information request was handled.
    """
    return f"Information request for '{request}'. Result: Simulated retrieval."


# Wrap handler functions as ADK tools
booking_tool = FunctionTool(booking_handler)
info_tool = FunctionTool(info_handler)


def build_adk_coordinator() -> Agent:
    """Build a Google ADK coordinator agent with sub-agent delegation.

    Creates a Coordinator agent that delegates to specialized Booker and Info
    agents using the framework's Auto-Flow mechanism.

    Returns:
        A compiled ADK Agent instance ready for execution.
    """
    # Specialized sub-agents with their tools
    booking_agent = Agent(
        name="Booker",
        model="gemini-2.0-flash",
        description=(
            "A specialized agent that handles all flight and hotel booking "
            "requests by calling the booking tool."
        ),
        tools=[booking_tool],
    )

    info_agent = Agent(
        name="Info",
        model="gemini-2.0-flash",
        description=(
            "A specialized agent that provides general information and "
            "answers user questions by calling the info tool."
        ),
        tools=[info_tool],
    )

    # Parent coordinator with explicit delegation instructions
    coordinator = Agent(
        name="Coordinator",
        model="gemini-2.0-flash",
        instruction=(
            "You are the main coordinator. Your only task is to analyze "
            "incoming user requests and delegate them to the appropriate "
            "specialist agent. Do not try to answer directly.\n"
            "- For booking flights or hotels, delegate to 'Booker'.\n"
            "- For general information questions, delegate to 'Info'."
        ),
        description="Routes user requests to the correct specialist agent.",
        sub_agents=[booking_agent, info_agent],  # Auto-Flow enabled
    )

    return coordinator


async def run_adk_coordinator(request: str) -> str:
    """Execute an ADK coordinator with a user request and extract the response.

    Args:
        request: The user's natural language request string.

    Returns:
        The final response text from the delegated sub-agent.
    """
    coordinator = build_adk_coordinator()
    runner = InMemoryRunner(coordinator)

    user_id = "user_123"
    session_id = str(uuid.uuid4())

    await runner.session_service.create_session(
        app_name=runner.app_name,
        user_id=user_id,
        session_id=session_id,
    )

    final_result = ""
    for event in runner.run(
        user_id=user_id,
        session_id=session_id,
        new_message=types.Content(
            role="user",
            parts=[types.Part(text=request)],
        ),
    ):
        if event.is_final_response() and event.content:
            if hasattr(event.content, "text") and event.content.text:
                final_result = event.content.text
            elif event.content.parts:
                text_parts = [
                    part.text for part in event.content.parts if part.text
                ]
                final_result = "".join(text_parts)
            break

    return final_result
```

**Key concepts:** The `sub_agents` field on the Coordinator agent is the single configuration that enables Auto-Flow. ADK's internal routing logic matches incoming user messages to sub-agents based on their descriptions and available tools — no explicit routing code needed in the parent agent.

---

### Pattern 4: BAD vs GOOD — Router Prompt Design

#### ❌ BAD — Vague categories with ambiguous boundaries

```python
coordinator_prompt_bad = ChatPromptTemplate.from_messages([
    ("system", "Figure out what the user wants and send them to the right place."),
    ("user", "{request}"),
])
# Problem: No explicit categories, no disambiguation rules.
# The LLM may produce inconsistent outputs across runs.
```

#### ✅ GOOD — Explicit categories with disambiguation and fallback

```python
coordinator_prompt_good = ChatPromptTemplate.from_messages([
    (
        "system",
        (
            "Classify the user's request into exactly ONE category.\n"
            "\n"
            "CATEGORIES:\n"
            "- 'booker': Flight bookings, hotel reservations, travel planning.\n"
            "  Example: 'Book me a flight to Paris', 'I need a hotel in Tokyo'\n"
            "- 'info': General questions, facts, definitions, explanations.\n"
            "  Example: 'What is the capital of France?', 'How do I reset my password?'\n"
            "- 'unclear': Does not fit above categories or is ambiguous.\n"
            "  Example: 'Tell me a joke', gibberish input\n"
            "\n"
            "RULES:\n"
            "- If the request matches multiple categories, choose the most specific one.\n"
            "- If uncertain, choose 'unclear' — do not guess.\n"
            "- Output ONLY the category name, nothing else.\n"
        ),
    ),
    ("user", "{request}"),
])
# Each category has clear examples and boundary rules.
# Fallback ('unclear') is explicit with a tie-breaking rule.
```

---

### Pattern 5: Confidence-Based Routing with Threshold Fallback

When using LLM classifiers, guard against low-confidence classifications by extracting confidence scores and routing uncertain requests to a clarification handler.

```python
from dataclasses import dataclass


@dataclass
class RouteDecision:
    """Structured output from an intent classifier."""
    category: str
    confidence: float  # 0.0 to 1.0
    raw_output: str


def classify_with_confidence(
    llm,
    request: str,
    confidence_threshold: float = 0.75,
) -> RouteDecision:
    """Classify a request and return the category with a confidence score.

    Uses a two-shot prompt that asks the LLM to also estimate its
    classification confidence as a percentage.

    Args:
        llm: A LangChain-compatible chat model.
        request: The user request string to classify.
        confidence_threshold: Minimum confidence required to accept the routing decision.

    Returns:
        A RouteDecision with category, confidence (0.0–1.0), and raw output.
    """
    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            (
                "Classify this request into one of three categories: 'booker', "
                "'info', or 'unclear'. Also estimate your confidence as a number "
                "from 0 to 100. Output in JSON format only.\n"
                "Format: {{\"category\": \"<category>\", \"confidence\": <0-100>}}"
            ),
        ),
        ("user", "{request}"),
    ])

    chain = prompt | llm | StrOutputParser()
    raw_output = chain.invoke({"request": request})

    # Parse JSON output to extract category and confidence
    import json

    try:
        parsed = json.loads(raw_output)
        confidence = min(max(parsed["confidence"] / 100.0, 0.0), 1.0)
        category = parsed["category"].strip()
    except (json.JSONDecodeError, KeyError):
        # Fallback: low confidence on parse failure
        confidence = 0.0
        category = "unclear"

    return RouteDecision(
        category=category if confidence >= confidence_threshold else "unclear",
        confidence=confidence,
        raw_output=raw_output,
    )


def apply_fallback(decision: RouteDecision) -> str:
    """Apply fallback logic for low-confidence or unclear classifications.

    Args:
        decision: The classification result from classify_with_confidence.

    Returns:
        A clarification request message if confidence is below threshold.
    """
    if decision.category == "unclear":
        return (
            f"I'm not confident I understood your request correctly "
            f"(confidence: {decision.confidence:.0%}). Could you rephrase?"
        )

    # Confident classification — proceed with normal routing
    handler_map = {
        "booker": lambda: f"Booking processed for '{decision.raw_output}'",
        "info": lambda: f"Information retrieved for '{decision.raw_output}'",
    }

    handler = handler_map.get(decision.category)
    return handler() if handler else "unclear_handler fallback"
```

---

## Constraints

### MUST DO

1. **Always define a fallback handler** — Every routing system must have an `unclear_handler` (or equivalent) for low-confidence or unrecognized inputs. Never let an unclassified request fall through without handling it explicitly. Follow the *Fail Fast* law from code-philosophy: invalid states halt with a clarification request, not a silent default.

2. **Document every route's input/output contract** — Each handler function must specify its expected input shape and return type. Use Python type hints and docstrings as required by the *Atomic Predictability* principle (pure, predictable functions).

3. **Ensure exhaustive branch coverage** — Every possible router output string must map to exactly one branch or edge in the dispatch logic. Verify with static analysis: count branches against category count — they must match.

4. **Provide explicit disambiguation rules in the classifier prompt** — When categories could overlap (e.g., "book a restaurant" vs. "restaurant review"), include tie-breaking rules in the system prompt so the LLM produces deterministic output.

5. **Log routing decisions and fallback events** — Every classification (category, confidence, raw output) should be logged for monitoring. Fallback events are especially important: they indicate gaps in your route definitions or prompt quality.

6. **Reference `code-philosophy` laws** — All routing code must follow the 5 Laws of Elegant Defense:
   - *Early Exit*: Guard clauses handle edge cases at the top of handlers
   - *Parse Don't Validate*: Parse data at boundaries, trust internal state
   - *Atomic Predictability*: Classification functions should be pure and deterministic where possible
   - *Fail Fast*: Invalid classifications halt with a clarification request immediately
   - *Intentional Naming*: Route names read like English verbs ("booker", "info", "escalate")

7. **Test routing with adversarial inputs** — Include test cases for ambiguous, multi-intent, and out-of-scope queries to verify that the fallback chain activates correctly.

### MUST NOT DO

1. **Never skip the fallback handler** — An empty or missing `unclear_handler` is a critical bug. The system must always return something meaningful, never crash on unclassifiable input.

2. **Do not embed routing logic inside handlers** — Handlers should only execute their domain task. Routing (classification + dispatch) is a separate concern handled by the coordinator/router component.

3. **Never use bare string matching without normalization** — Always `.strip()` and normalize case before comparing router outputs. Inconsistent whitespace causes silent misrouting bugs.

4. **Do not hardcode routing categories as magic strings scattered across the codebase** — Define category constants or an Enum (e.g., `RouteCategory.BOOKER`) to prevent typos that create unreachable branches.

5. **Never route based solely on a single keyword without context** — A request containing "book" might mean "book a flight" (routable) or "book a research paper" (unclear). Use multi-signal classification, not single-keyword heuristics.

6. **Do not add new routes without updating the fallback and test suite** — Every new route must have: an updated classifier prompt with category examples, a handler implementation, and at least two test cases (one positive, one ambiguous).

---

## Output Template

When applying this skill, produce output in the following structure:

1. **Intent Space Map** — Table of all routes with purpose, keywords, and handler function name.
2. **Routing Mechanism Choice** — State which mechanism was selected (LLM-based / embedding-based / rule-based / ML classifier) and justify the choice based on latency vs. flexibility requirements.
3. **Router Prompt Template** — The complete `ChatPromptTemplate` (or equivalent) with all categories, examples, and disambiguation rules.
4. **Handler Implementations** — Typed Python functions for each route destination with docstrings and type hints.
5. **Dispatch Wiring** — The LangChain `RunnableBranch`, LangGraph `add_conditional_edges`, or ADK sub-agent configuration connecting the router to handlers.
6. **Fallback Configuration** — Confidence threshold, fallback handler behavior, and logging strategy.
7. **Test Cases** — At least 3 test inputs demonstrating correct routing across all categories plus one ambiguous input exercising the fallback path.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-chaining` | Sequential workflows that precede or follow routed decisions — combine when routing feeds into multi-step chains |
| `multi-agent-collaboration` | Coordination between routed sub-agents after dispatch — handles inter-agent communication once routing completes |
| `parallelization` | Routes queries to parallel sub-workers for independent processing — use when multiple routes can execute concurrently |

> 📖 skill(local cache): customize-opencode, code-philosophy
