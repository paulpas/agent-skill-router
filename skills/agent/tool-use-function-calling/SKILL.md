---
name: tool-use-function-calling
description: Implements agent tool use and function calling patterns (@tool decorators, CrewAI tools, Google ADK built-in tools) to enable agents with real-time external data access, API operations, calculations, and code execution.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: agent
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  maturity: beta
  completeness: 90
  exampleCount: 4
  triggers: tool use, function calling, @tool decorator, external tools, API integration, how do i give agents tools, vertex extensions, CrewAI tools
  related-skills: prompt-chaining, reflection-loop, ai-llm-agentic-tooling-mcp
---

# Tool Use and Function Calling Pattern

Enables agentic systems to break out of the LLM's internal knowledge boundary by defining, registering, and executing external tools — allowing agents to access live data, query databases, perform calculations, execute code, and trigger real-world actions through structured function calls.

## TL;DR Checklist

- [ ] Define each tool with a descriptive name, clear docstring, and typed parameter schema
- [ ] Register tools with the agent framework (LangChain `@tool`, CrewAI `@tool`, ADK built-in)
- [ ] Bind tools to an LLM that supports function/tool calling (Gemini, GPT-4o series)
- [ ] Provide a prompt template with `{agent_scratchpad}` placeholder for tool call history
- [ ] Handle tool failures explicitly — raise typed exceptions, never return error strings
- [ ] Add security boundaries around code execution and API-access tools
- [ ] Validate that the LLM can actually invoke tools before relying on them in production

---

## When to Use

Use this skill when:

- Building an agent that needs real-time or live data (weather, stock prices, search results) not available in the LLM's training cut-off
- The agent must interact with external APIs — databases, payment systems, email services, IoT controllers
- You need precise computation (math, statistics, data analysis) where probabilistic text generation is unreliable
- An agent workflow requires code execution in a sandboxed environment for deterministic logic
- You are designing a multi-agent system where one agent delegates specialized tasks to another via tool interfaces
- Implementing enterprise search over private datastores using Vertex AI Search or similar RAG-backed tools

---

## When NOT to Use

Avoid this skill for:

- Pure text generation tasks that don't need external data (e.g., summarizing a document the user already provided) — use `prompt-chaining` instead
- Simple rule-based logic that can be evaluated with standard Python conditionals — tool overhead is unnecessary
- Situations where the LLM's built-in reasoning or math is sufficient and latency is critical — function calling adds round-trips
- High-frequency trading execution where every millisecond matters — use direct API calls, not agent-mediated tool calls

---

## Core Workflow

1. **Define Tool Functions** — Write Python functions with typed signatures, descriptive docstrings (used as the tool description for the LLM), and clear return types. Each function represents one external capability: search, calculate, query, send, execute. **Checkpoint:** Every tool must have a `"""docstring"""` that the LLM can use to decide when to call it.

2. **Register Tools with the Framework** — Decorate functions with the framework-specific tool decorator (`@langchain_tool` for LangChain, `@tool` for CrewAI) or reference built-in tools (`google_search`, `BuiltInCodeExecutor` for ADK). Collect them in a list passed to the agent constructor. **Checkpoint:** Verify that `len(tools)` matches your expected tool count and no decorator was accidentally skipped.

3. **Configure the Agent with Tool-Bound LLM** — Create the agent by binding the LLM, tools list, and a prompt template containing an `{agent_scratchpad}` placeholder for internal tool-call reasoning traces. Use `create_tool_calling_agent` (LangChain), pass `tools=[...]` to `Agent` (CrewAI), or set `tools=[...]` on an `LlmAgent` (ADK). **Checkpoint:** Confirm the LLM model name supports function calling — models without this capability silently ignore tools.

4. **Execute and Observe Tool Results** — Run the agent executor (`AgentExecutor.ainvoke`, `crew.kickoff()`, `runner.run_async`). The framework intercepts the LLM's structured tool-call output, executes the actual Python function, captures the result, and feeds it back as context. **Checkpoint:** Check that the agent's response references data from the tool output, not hallucinated values — if it doesn't, the scratchpad placeholder is missing or the tool docstring is ambiguous.

5. **Handle Tool Failures Gracefully** — When a tool raises an exception (e.g., `ValueError` for unknown ticker), the framework returns the error as context to the LLM so it can decide whether to retry with different arguments, report failure to the user, or try an alternative tool. Never suppress errors with silent `try/except` that returns a string. **Checkpoint:** Test every tool with invalid inputs to confirm exceptions propagate correctly and the LLM responds appropriately.

6. **Add Security and Access Controls** — Wrap sensitive tools (email sending, API mutations, code execution) with authentication checks, input validation, and rate limiting. For code execution, always use a sandboxed executor (`BuiltInCodeExecutor` in ADK). For API tools, validate arguments against expected schemas before making network calls. **Checkpoint:** Review each tool's docstring for security-relevant constraints — the LLM reads these as part of its decision logic.

---

## Implementation Patterns

### Pattern 1: Custom Tool with `@tool` Decorator (LangChain)

Define a tool by wrapping a Python function with `@langchain_tool`. The docstring becomes the LLM-facing description. Return raw data — never format human-readable strings inside the tool itself, so the LLM can incorporate results flexibly.

```python
import logging
from langchain_core.tools import tool as langchain_tool
from typing import Optional

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s - %(message)s")


@langchain_tool
def search_information(query: str) -> str:
    """
    Provides factual information on a given topic. Use this tool to
    find answers to phrases like 'capital of France' or 'weather in London?'.

    Args:
        query: A natural-language description of the information needed.

    Returns:
        A string containing the factual answer, or a default message if
        no specific entry matches.
    """
    logging.info(f"Tool Call: search_information with query='{query}'")

    simulated_results: dict[str, str] = {
        "weather in london": "The weather in London is currently cloudy "
                             "with a temperature of 15°C.",
        "capital of france": "The capital of France is Paris.",
        "population of earth": "The estimated population of Earth is "
                               "around 8 billion people.",
        "tallest mountain": "Mount Everest is the tallest mountain above "
                            "sea level at 8,849 meters.",
    }

    result = simulated_results.get(query.lower(),
                                   f"Simulated search for '{query}': "
                                   "No specific information found.")
    logging.info(f"--- TOOL RESULT: {result[:120]} ---")
    return result
```

**BAD — Returning formatted strings from tools:**

```python
# ❌ BAD: The LLM cannot re-format or combine this result with other data.
@langchain_tool
def get_weather_bad(location: str) -> str:
    """Get weather."""  # Too short for the LLM to reason about when to use
    temp = fetch_temperature(location)  # hypothetical
    return f"The weather in {location} is currently {temp}°C. " \
           "It looks nice today!"  # Overly opinionated, LLM can't adapt


# ✅ GOOD: Return raw data; let the LLM decide how to present it.
@langchain_tool
def get_weather_good(location: str) -> dict:
    """
    Fetches current weather conditions for a given location. Returns
    temperature, condition, and humidity as structured data.

    Args:
        location: City name or coordinates (e.g., 'London', '40.7,-74.0').

    Returns:
        Dict with 'temperature_c', 'condition', and 'humidity_percent'.
    """
    logging.info(f"Tool Call: get_weather for '{location}'")
    data = fetch_weather_api(location)  # hypothetical API call
    return {
        "temperature_c": float(data["temp"]),
        "condition": str(data["main_condition"]),
        "humidity_percent": int(data["humidity"]),
    }
```

### Pattern 2: CrewAI Tool with Exception-Based Error Handling

In CrewAI, tools are defined identically to LangChain using the `@tool` decorator from `crewai.tools`, but error handling semantics differ. Raise typed exceptions so the Crew framework routes them back to the agent for decision-making.

```python
import os
from crewai import Agent, Task, Crew
from crewai.tools import tool


@tool("Stock Price Lookup Tool")
def get_stock_price(ticker: str) -> float:
    """
    Fetches the latest simulated stock price for a given stock ticker
    symbol. Returns the price as a float.

    Args:
        ticker: Stock ticker symbol (e.g., 'AAPL', 'GOOGL'). Must be 1-5
                uppercase letters.

    Returns:
        The stock price as a floating-point number.

    Raises:
        ValueError: If the ticker is not recognized or empty.
        RuntimeError: If the external price feed is unavailable.
    """
    import logging
    logging.info(f"Tool Call: get_stock_price for ticker '{ticker}'")

    simulated_prices: dict[str, float] = {
        "AAPL": 178.15,
        "GOOGL": 1750.30,
        "MSFT": 425.50,
        "AMZN": 186.40,
    }

    normalized_ticker = ticker.strip().upper()

    if not normalized_ticker:
        raise ValueError("Ticker symbol cannot be empty.")

    price = simulated_prices.get(normalized_ticker)
    if price is None:
        raise ValueError(
            f"Simulated price for ticker '{normalized_ticker}' not found. "
            f"Available tickers: {', '.join(sorted(simulated_prices.keys()))}"
        )

    return price


# --- Agent and Task Configuration ---
financial_analyst = Agent(
    role="Senior Financial Analyst",
    goal="Analyze stock data using provided tools and report key prices.",
    backstory=(
        "You are an experienced financial analyst adept at using data "
        "sources to find stock information. You provide clear, direct "
        "answers backed by real-time tool results."
    ),
    verbose=True,
    tools=[get_stock_price],
    allow_delegation=False,
)

analyze_task = Task(
    description=(
        "What is the current simulated stock price for Apple (ticker: AAPL)? "
        "Use the 'Stock Price Lookup Tool' to find it. If the ticker is not "
        "found, report exactly that you were unable to retrieve the price."
    ),
    expected_output=(
        "A single clear sentence stating the simulated stock price for AAPL, "
        "or a statement that the price could not be retrieved."
    ),
    agent=financial_analyst,
)

financial_crew = Crew(
    agents=[financial_analyst],
    tasks=[analyze_task],
    verbose=True,
)


def run_crew() -> None:
    """Execute the financial crew and print results."""
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError(
            "OPENAI_API_KEY environment variable is not set. "
            "Set it before running the crew."
        )

    result = financial_crew.kickoff()
    print(f"\n## Crew Result:\n{result}")
```

### Pattern 3: Google ADK Pre-Built Tools

Google ADK ships built-in tools that require zero wrapper code. Reference them directly in your agent's `tools` list:

```python
from google.adk.agents import Agent as ADKAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import google_search
from google.genai import types


# Pre-built tool: Google Search
search_agent = ADKAgent(
    name="basic_search_agent",
    model="gemini-2.0-flash-exp",
    description="Agent to answer questions using Google Search.",
    instruction=(
        "I can answer your questions by searching the internet. "
        "Just ask me anything!"
    ),
    tools=[google_search],  # Built-in — no definition needed
)


# Pre-built tool: Code Interpreter (sandboxed Python execution)
from google.adk.agents import LlmAgent
from google.adk.code_executors import BuiltInCodeExecutor

code_agent = LlmAgent(
    name="calculator_agent",
    model="gemini-2.0-flash",
    code_executor=BuiltInCodeExecutor(),
    instruction=(
        "You are a calculator agent. When given a mathematical expression, "
        "write and execute Python code to calculate the result. Return only "
        "the final numerical result as plain text."
    ),
    description="Executes Python code to perform calculations.",
)


# Pre-built tool: Vertex AI Search (enterprise RAG)
from google.adk.agents import VSearchAgent

vsearch_agent = VSearchAgent(
    name="q2_strategy_vsearch_agent",
    description=(
        "Answers questions about Q2 strategy documents using "
        "Vertex AI Search."
    ),
    model="gemini-2.0-flash-exp",
    datastore_id=os.environ["DATASTORE_ID"],
    model_parameters={"temperature": 0.0},
)
```

### Pattern 4: Vertex Extensions — Custom Tool Integration

Vertex Extensions bridge external APIs with LLM reasoning through structured API wrappers. Unlike standard function calling (where you manually execute the called function), Vertex Extensions run automatically on Google's infrastructure with enterprise-grade security and data privacy guarantees.

```python
import asyncio
from google.genai import types
from google.adk.agents import Agent as ADKAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.adk.tools import google_search


APP_NAME = "vertex_extensions_app"
USER_ID = "user1234"
SESSION_ID = "session_ext_001"

# Agent with both built-in search and Vertex Extensions
root_agent = ADKAgent(
    name="extended_search_agent",
    model="gemini-2.0-flash-exp",
    description=(
        "Agent with Google Search plus custom Vertex Extensions "
        "for private data access."
    ),
    instruction=(
        "Search the internet for public information using Google Search. "
        "For queries about internal company documents, use the configured "
        "Vertex AI Search extension to query the private datastore."
    ),
    tools=[google_search],  # Built-in tool
)

async def call_extended_agent(query: str) -> str:
    """Run an agent with Vertex Extensions against a user query."""
    session_service = InMemorySessionService()
    session = await session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID
    )
    runner = Runner(agent=root_agent, app_name=APP_NAME,
                    session_service=session_service)

    content = types.Content(role='user',
                            parts=[types.Part(text=query)])
    final_response = "No response captured."

    async for event in runner.run_async(
        user_id=USER_ID, session_id=SESSION_ID, new_message=content
    ):
        if event.is_final_response() and event.content:
            text_parts = [
                part.text for part in event.content.parts
                if part.text and not part.text.isspace()
            ]
            final_response = "".join(text_parts)

            # Log grounding metadata (source attributions from Vertex Search)
            if event.grounding_metadata:
                num_sources = len(
                    event.grounding_metadata.grounding_attributions
                )
                print(f"  [Sources found: {num_sources}]")

    return final_response


async def main() -> None:
    result = await call_extended_agent(
        "What are the latest developments in AI agent frameworks?"
    )
    print(f"\nAgent Response: {result}")


try:
    asyncio.run(main())
except RuntimeError as e:
    if "running event loop" in str(e):
        print("Running in an existing event loop. Run `await main()` instead.")
    else:
        raise
```

---

## Constraints

### MUST DO

1. **Every tool must have a descriptive docstring** — The LLM reads the docstring to decide when to call the tool. Write 2–4 sentences describing purpose, inputs, and expected output. Follow the `code-philosophy` law of *Intentional Naming*: if a human can't understand what the tool does from its docstring alone, refactor it.

2. **Use typed function signatures** — Define parameter types (`str`, `float`, `int`, `dict[str, str]`) and return types. This is how the framework generates the JSON schema the LLM sees. Follow *Parse Don't Validate*: trust that typed signatures define the contract at the boundary.

3. **Raise exceptions for failure states** — Use `ValueError` for bad arguments, `RuntimeError` for unavailable services. Never catch exceptions and return error strings — this robs the LLM of structured error context. Follow *Fail Fast*: invalid states halt with descriptive errors.

4. **Include `{agent_scratchpad}` in prompt templates** — LangChain agents require this placeholder to display tool call history back to the LLM. Without it, the agent cannot learn from previous tool results and will repeat failed calls indefinitely.

5. **Validate API keys before execution** — Check for required environment variables (`OPENAI_API_KEY`, `GOOGLE_API_KEY`, `DATASTORE_ID`) at entry points. Provide clear error messages that tell users exactly what to set.

6. **Separate raw data from presentation** — Tools return structured data (dict, float, list). Let the LLM format and present results to the user. This keeps tools composable — one tool's output can feed into another tool or be combined with multiple data sources. Follow *Atomic Predictability*: pure functions that do one thing well.

7. **Wrap code execution in a sandbox** — Always use `BuiltInCodeExecutor` (ADK) or equivalent sandboxes. Never execute arbitrary user-supplied code directly via `exec()` or `eval()`. This is non-negotiable for security. Follow *Fail Fast*: untrusted code execution must be isolated before it can cause harm.

8. **Document tool prerequisites and constraints** — Note rate limits, authentication requirements, known edge cases, and cost implications in the docstring. The LLM uses this to avoid calling expensive tools unnecessarily.

### MUST NOT DO

1. **Never return human-formatted strings from tools** — Tools are data pipelines, not presentation layers. Returning "The price is $178.15" prevents the LLM from combining it with other calculations or formatting it differently per user preference.

2. **Never use `pass` bodies or stub functions** — A tool with `pass`, `return {}`, or `# TODO: implement` silently fails and corrupts agent reasoning. Every tool must return real data or raise a meaningful exception. Follow the repository's zero-tolerance stub policy.

3. **Never skip error handling in tools** — A crashing tool without `try/except` at the orchestration level will terminate the entire agent run. Wrap external API calls in `try/except` blocks that convert network errors to typed exceptions the LLM can handle.

4. **Never expose sensitive credentials inside tool code** — API keys, tokens, and connection strings must come from environment variables or secret managers. Never hardcode them in tool function bodies. Follow the `security-encryption-at-rest-and-in-transit` principle: credentials are secrets that travel through secure channels only.

5. **Never use overly generic tool descriptions** — A docstring like `"Gets information"` gives the LLM no signal about when to call the tool vs. use its own knowledge. Specificity in descriptions directly correlates with correct tool selection rates. Follow *Intentional Naming*: precise descriptions lead to precise routing decisions.

6. **Never rely on tools without testing them** — Before deploying an agent with new tools, verify each tool individually: pass valid inputs, invalid inputs, and boundary cases. Confirm the LLM produces the expected function call arguments by inspecting intermediate events.

---

## Output Template

When this skill is active, produce outputs in this structure:

1. **Tool Schema Definition** — Show the Python function with `@tool` decorator, type hints, docstring, and return logic. Include both the tool definition and how it's registered with the framework.

2. **Agent Configuration Block** — Show the agent setup (LLM model, tools list, prompt template with scratchpad placeholder), specifying which framework is being used (LangChain, CrewAI, or ADK).

3. **Execution Flow Demonstration** — Provide a concrete example of invoking the agent with a user query and showing the expected tool call → execution → result cycle, including error handling paths.

4. **Security & Validation Notes** — List any security considerations for the tools implemented (authentication requirements, sandboxing needs, input validation rules).

---

## Related Skills

| Skill | Purpose |
|---|---|
| `prompt-chaining` | Chains multiple agent steps together; tool use is often one step in a larger prompt chain |
| `reflection-loop` | Agent reflects on its own tool-use results to decide if further calls are needed or the task is complete |
| `ai-llm-agentic-tooling-mcp` | Model Context Protocol for standardized external tool integration across LLM frameworks |

---

## Aggregation Flow Diagram

```
User Request
     │
     ▼
┌──────────────┐
│   LLM Agent  │ ◄── Prompt with {agent_scratchpad} placeholder
└──────┬───────┘
       │ Decides: call tool?
       ├──────────────► No → Generate final response
       │
       ▼ (Yes)
┌──────────────┐     ┌──────────────────┐
│ Function Call│────►│ Tool Executor    │
│  (JSON args) │     │ (Python function │
└──────────────┘     │  or API wrapper) │
                     └───────┬──────────┘
                             │ Result / Exception
                     ┌───────▼──────────┐
                     │ Observation      │ ◄── Returned to LLM context
                     │ (Result stored   │
                     │  in scratchpad)  │
                     └───────┬──────────┘
                             │ LLM sees result
                     ┌───────▼──────────┐
                     │ LLM Decision     │
                     │ → Call another?  │──► Yes (loop back to Function Call)
                     │ → Final answer?  │──► Yes (output to user)
                     └──────────────────┘
```

## Live References

> Authoritative documentation links for tool use and function calling across the major agentic frameworks. The model follows these links at load time to resolve external references and inline content.

- [LangChain Tools Integration Guide](https://python.langchain.com/docs/integrations/tools/) — Official LangChain docs on defining, registering, and using tools
- [Google ADK Tools Documentation](https://google.github.io/adk-docs/tools/) — Built-in tools, code executors, and Vertex Extensions in ADK
- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling) — OpenAI's native function calling API specification
- [CrewAI Tools Concepts](https://docs.crewai.com/concepts/tools) — Tool definitions, multi-agent tool sharing, and best practices
- [LangGraph Tool Execution Patterns](https://python.langchain.com/docs/versions/migrating_tools/) — Advanced tool calling patterns with LangGraph state machines
- [Google ADK Code Executors](https://google.github.io/adk-docs/tools/code-execution) — BuiltInCodeExecutor configuration and sandboxing
