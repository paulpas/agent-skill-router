#!/usr/bin/env python3
"""True end-to-end LLM benchmark: WITH vs WITHOUT MCP skill router.

Compares real LLM responses using:
  - Run 1: Generic system prompt ("You are a helpful coding assistant.")
  - Run 2: Full SKILL.md content injected as system prompt via MCP router

Usage:
    python3 benchmarks/llm_compare.py --task "Review this code for security issues"
    python3 benchmarks/llm_compare.py --exercise benchmarks/exercises/simple/exercise-1.json
    python3 benchmarks/llm_compare.py --tier simple
    python3 benchmarks/llm_compare.py --tier simple --model gpt-4o
    python3 benchmarks/llm_compare.py --task "..." --output results/comparison.json
"""

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional

import requests

# ─── Constants ───────────────────────────────────────────────────────────────

GENERIC_SYSTEM_PROMPT = "You are a helpful coding assistant."
MAX_SKILL_TOKENS = (
    8000  # Truncate skill content beyond this (4-char ≈ 1 token heuristic)
)
MAX_SKILL_CHARS = MAX_SKILL_TOKENS * 4
RESPONSE_PREVIEW_CHARS = 500  # Chars to display in terminal
DEFAULT_ROUTER_URL = "http://localhost:3000"
DEFAULT_LLAMACPP_URL = "http://localhost:8080/v1"
DEFAULT_TEMPERATURE = 0.2
DEFAULT_MAX_TOKENS = 2048
HTTP_TIMEOUT_SECONDS = 30

# Path resolution
_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent


# ─── Data Structures ─────────────────────────────────────────────────────────


@dataclass
class RunResult:
    """Metrics and response from a single LLM run."""

    run_type: str  # "without_mcp" or "with_mcp"
    model: str
    system_prompt_preview: str  # First 80 chars of system prompt
    system_prompt_tokens: int  # Estimated tokens in system prompt
    response_text: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    llm_latency_ms: float
    router_latency_ms: float  # 0 for without-MCP run
    total_latency_ms: float
    skills_injected: list[str]  # Empty list for without-MCP run
    error: Optional[str] = None
    success: bool = True


@dataclass
class ExerciseComparison:
    """Full comparison result for one exercise."""

    exercise_name: str
    task: str
    model: str
    timestamp: str
    without_mcp: Optional[RunResult] = None
    with_mcp: Optional[RunResult] = None
    router_available: bool = True
    router_error: Optional[str] = None


# ─── Config Loading ───────────────────────────────────────────────────────────


def load_default_model() -> str:
    """Read default model name from benchmarks/openconfig.json.

    Returns the 'default' field under 'models', or falls back to
    'qwen3-coder-next-8_0' if the file is missing or malformed.
    """
    config_path = _SCRIPT_DIR / "openconfig.json"
    if not config_path.exists():
        return "qwen3-coder-next-8_0"

    try:
        with open(config_path, "r") as f:
            cfg = json.load(f)
        return cfg["models"]["default"]
    except (json.JSONDecodeError, KeyError):
        return "qwen3-coder-next-8_0"


def load_exercise_file(path: str) -> dict:
    """Parse and return a single exercise JSON file.

    Args:
        path: Absolute or relative path to exercise JSON.

    Raises:
        SystemExit: If file doesn't exist or JSON is invalid.
    """
    exercise_path = Path(path)
    if not exercise_path.exists():
        sys.exit(f"❌ Exercise file not found: {path}")

    try:
        with open(exercise_path, "r") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        sys.exit(f"❌ Invalid JSON in exercise file {path}: {e}")

    required_keys = {"name", "task"}
    missing = required_keys - data.keys()
    if missing:
        sys.exit(f"❌ Exercise file missing required keys: {missing}")

    return data


def load_tier_exercises(tier: str) -> list[dict]:
    """Load all exercise JSON files from a tier directory.

    Args:
        tier: One of 'simple', 'medium', 'heavy'.

    Raises:
        SystemExit: If tier directory doesn't exist or has no exercises.
    """
    tier_path = _SCRIPT_DIR / "exercises" / tier
    if not tier_path.exists():
        sys.exit(f"❌ Tier directory not found: {tier_path}")

    exercise_files = sorted(tier_path.glob("*.json"))
    if not exercise_files:
        sys.exit(f"❌ No exercise JSON files found in: {tier_path}")

    exercises = []
    for f in exercise_files:
        try:
            with open(f, "r") as fh:
                data = json.load(fh)
            if "name" in data and "task" in data:
                exercises.append(data)
            else:
                print(f"  ⚠️  Skipping {f.name}: missing 'name' or 'task' field")
        except json.JSONDecodeError as e:
            print(f"  ⚠️  Skipping {f.name}: invalid JSON ({e})")

    if not exercises:
        sys.exit(f"❌ No valid exercises found in tier '{tier}'")

    return exercises


# ─── Model Detection & Provider Dispatch ─────────────────────────────────────


def detect_provider(model_name: str) -> str:
    """Determine which provider backs a given model name.

    Returns one of: 'llamacpp', 'openai', 'anthropic', 'groq', 'ollama', 'unknown'.
    Uses the same ModelRegistry definitions without importing harness modules.
    """
    # Local llama.cpp models (served via OpenAI-compatible API)
    llamacpp_models = {
        "qwen3-coder-next-8_0",
        "qwen3-coder-next",
        "qwen2-72b",
        "nemotron-120b",
        "qwen35-27b",
    }
    # Ollama models
    ollama_models = {
        "llama2",
        "llama2-7b",
        "llama3",
        "mistral",
        "neural-chat",
        "codellama",
        "gemma",
        "qwen3-coder:30b",
        "gpt-oss:20b",
    }
    # OpenAI model prefixes / names
    openai_prefixes = (
        "gpt-",
        "o1",
        "o3",
        "o4",
    )
    # Anthropic prefixes
    anthropic_prefixes = ("claude-",)
    # Groq
    groq_models = {"mixtral-8x7b", "llama-2-70b-chat", "llama3-70b-8192"}

    if model_name in llamacpp_models:
        return "llamacpp"
    if model_name in ollama_models:
        return "ollama"
    if model_name in groq_models:
        return "groq"
    if any(model_name.startswith(p) for p in anthropic_prefixes):
        return "anthropic"
    if any(model_name.startswith(p) for p in openai_prefixes):
        return "openai"

    # Fallback heuristic for unknown names
    return "llamacpp"


# ─── LLM Clients ─────────────────────────────────────────────────────────────


def estimate_tokens(text: str) -> int:
    """Cheap heuristic: 4 chars ≈ 1 token."""
    return max(1, len(text) // 4)


def calculate_cost(model_name: str, input_tokens: int, output_tokens: int) -> float:
    """Return estimated cost in USD using known per-MTok rates.

    Returns 0.0 for local/unknown models (they are free).
    """
    # (input_$/MTok, output_$/MTok) — only cloud models have non-zero rates
    cost_table: dict[str, tuple[float, float]] = {
        "gpt-4": (30.0, 60.0),
        "gpt-4-turbo": (10.0, 30.0),
        "gpt-4o": (5.0, 15.0),
        "gpt-4o-mini": (0.15, 0.60),
        "gpt-3.5-turbo": (0.5, 1.5),
        "gpt-4.1": (12.0, 48.0),
        "gpt-4.1-mini": (2.0, 8.0),
        "gpt-5": (25.0, 100.0),
        "gpt-5.5": (35.0, 140.0),
        "gpt-5.5-pro": (40.0, 160.0),
        "o1": (15.0, 60.0),
        "o1-mini": (3.0, 12.0),
        "o1-pro": (20.0, 80.0),
        "o3": (20.0, 80.0),
        "o3-mini": (5.0, 20.0),
        "o3-pro": (25.0, 100.0),
        "o4-mini": (8.0, 32.0),
        "claude-3-opus": (15.0, 75.0),
        "claude-3-sonnet": (3.0, 15.0),
        "claude-3-haiku": (0.25, 1.25),
        "claude-3-5-sonnet": (3.0, 15.0),
        "claude-3-5-haiku": (0.80, 4.0),
        "claude-opus-4": (25.0, 125.0),
        "claude-sonnet-4-20250514": (8.0, 40.0),
        "claude-sonnet-4-5-20250929": (9.0, 45.0),
        "claude-sonnet-4-6": (10.0, 50.0),
        "claude-opus-4-6": (40.0, 200.0),
        "claude-opus-4-7": (45.0, 225.0),
        "claude-haiku-4-5-20251001": (1.0, 5.0),
        "mixtral-8x7b": (0.27, 0.81),
        "llama-2-70b-chat": (0.70, 0.90),
        "llama3-70b-8192": (0.59, 0.79),
    }

    rates = cost_table.get(model_name)
    if rates is None:
        return 0.0  # Local or unknown → free

    input_cost = (input_tokens / 1_000_000) * rates[0]
    output_cost = (output_tokens / 1_000_000) * rates[1]
    return input_cost + output_cost


def call_llamacpp(
    model_name: str,
    system_prompt: str,
    user_message: str,
    base_url: str,
    temperature: float,
    max_tokens: int,
) -> tuple[str, int, int, float]:
    """Call a llama.cpp server via OpenAI-compatible chat API.

    Args:
        model_name:    Model identifier to send to the API.
        system_prompt: System message content.
        user_message:  User message content.
        base_url:      Base URL for llama.cpp OpenAI-compatible API.
        temperature:   Sampling temperature.
        max_tokens:    Maximum output tokens.

    Returns:
        (response_text, prompt_tokens, completion_tokens, latency_ms)

    Raises:
        RuntimeError: On any API or connection error.
    """
    try:
        import openai
    except ImportError:
        raise RuntimeError("openai package required: pip install openai")

    client = openai.OpenAI(api_key="not-needed", base_url=base_url)

    start = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except Exception as e:
        raise RuntimeError(f"llama.cpp API error at {base_url}: {e}")

    latency_ms = (time.perf_counter() - start) * 1000
    text = response.choices[0].message.content or ""

    prompt_tokens = (
        response.usage.prompt_tokens
        if response.usage
        else estimate_tokens(system_prompt + user_message)
    )
    completion_tokens = (
        response.usage.completion_tokens if response.usage else estimate_tokens(text)
    )

    return text, prompt_tokens, completion_tokens, latency_ms


def call_openai(
    model_name: str,
    system_prompt: str,
    user_message: str,
    temperature: float,
    max_tokens: int,
) -> tuple[str, int, int, float]:
    """Call OpenAI chat completions API.

    Raises:
        RuntimeError: If OPENAI_API_KEY is missing or API call fails.
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable not set")

    try:
        import openai
    except ImportError:
        raise RuntimeError("openai package required: pip install openai")

    client = openai.OpenAI(api_key=api_key)

    start = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except Exception as e:
        raise RuntimeError(f"OpenAI API error: {e}")

    latency_ms = (time.perf_counter() - start) * 1000
    text = response.choices[0].message.content or ""
    prompt_tokens = response.usage.prompt_tokens
    completion_tokens = response.usage.completion_tokens

    return text, prompt_tokens, completion_tokens, latency_ms


def call_anthropic(
    model_name: str,
    system_prompt: str,
    user_message: str,
    temperature: float,
    max_tokens: int,
) -> tuple[str, int, int, float]:
    """Call Anthropic Claude API.

    Raises:
        RuntimeError: If ANTHROPIC_API_KEY is missing or API call fails.
    """
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY environment variable not set")

    try:
        import anthropic
    except ImportError:
        raise RuntimeError("anthropic package required: pip install anthropic")

    client = anthropic.Anthropic(api_key=api_key)

    start = time.perf_counter()
    try:
        response = client.messages.create(
            model=model_name,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except Exception as e:
        raise RuntimeError(f"Anthropic API error: {e}")

    latency_ms = (time.perf_counter() - start) * 1000
    text = response.content[0].text if response.content else ""
    prompt_tokens = response.usage.input_tokens
    completion_tokens = response.usage.output_tokens

    return text, prompt_tokens, completion_tokens, latency_ms


def call_groq(
    model_name: str,
    system_prompt: str,
    user_message: str,
    temperature: float,
    max_tokens: int,
) -> tuple[str, int, int, float]:
    """Call Groq fast inference API.

    Raises:
        RuntimeError: If GROQ_API_KEY is missing or API call fails.
    """
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable not set")

    try:
        from groq import Groq
    except ImportError:
        raise RuntimeError("groq package required: pip install groq")

    client = Groq(api_key=api_key)

    start = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except Exception as e:
        raise RuntimeError(f"Groq API error: {e}")

    latency_ms = (time.perf_counter() - start) * 1000
    text = response.choices[0].message.content or ""
    prompt_tokens = response.usage.prompt_tokens
    completion_tokens = response.usage.completion_tokens

    return text, prompt_tokens, completion_tokens, latency_ms


def call_ollama(
    model_name: str,
    system_prompt: str,
    user_message: str,
    temperature: float,
    max_tokens: int,
) -> tuple[str, int, int, float]:
    """Call local Ollama server.

    Raises:
        RuntimeError: If Ollama server is unreachable or returns error.
    """
    base_url = "http://localhost:11434"
    full_prompt = f"{system_prompt}\n\n{user_message}"

    start = time.perf_counter()
    try:
        resp = requests.post(
            f"{base_url}/api/generate",
            json={
                "model": model_name,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                },
            },
            timeout=120,
        )
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        raise RuntimeError(f"Cannot connect to Ollama at {base_url}. Is it running?")
    except Exception as e:
        raise RuntimeError(f"Ollama error: {e}")

    latency_ms = (time.perf_counter() - start) * 1000
    data = resp.json()
    text = data.get("response", "")
    prompt_tokens = data.get("prompt_eval_count", estimate_tokens(full_prompt))
    completion_tokens = data.get("eval_count", estimate_tokens(text))

    return text, prompt_tokens, completion_tokens, latency_ms


def call_llm(
    model_name: str,
    system_prompt: str,
    user_message: str,
    provider: str,
    llamacpp_url: str,
    temperature: float = DEFAULT_TEMPERATURE,
    max_tokens: int = DEFAULT_MAX_TOKENS,
) -> tuple[str, int, int, float]:
    """Dispatch to the correct LLM provider and return raw results.

    Args:
        model_name:    Model to call.
        system_prompt: System message injected before the user turn.
        user_message:  The task description sent as user message.
        provider:      One of 'llamacpp', 'openai', 'anthropic', 'groq', 'ollama'.
        llamacpp_url:  Base URL for llama.cpp (only used when provider='llamacpp').
        temperature:   Sampling temperature (default 0.2).
        max_tokens:    Max output tokens (default 2048).

    Returns:
        (response_text, prompt_tokens, completion_tokens, latency_ms)

    Raises:
        RuntimeError: On any provider-specific API error.
    """
    dispatch = {
        "llamacpp": lambda: call_llamacpp(
            model_name,
            system_prompt,
            user_message,
            llamacpp_url,
            temperature,
            max_tokens,
        ),
        "openai": lambda: call_openai(
            model_name, system_prompt, user_message, temperature, max_tokens
        ),
        "anthropic": lambda: call_anthropic(
            model_name, system_prompt, user_message, temperature, max_tokens
        ),
        "groq": lambda: call_groq(
            model_name, system_prompt, user_message, temperature, max_tokens
        ),
        "ollama": lambda: call_ollama(
            model_name, system_prompt, user_message, temperature, max_tokens
        ),
    }

    handler = dispatch.get(provider)
    if handler is None:
        raise RuntimeError(
            f"Unknown provider '{provider}'. Supported: {list(dispatch)}"
        )

    return handler()


# ─── MCP Router Client ────────────────────────────────────────────────────────


def router_health_check(router_url: str) -> bool:
    """Return True if the MCP router is reachable and healthy."""
    try:
        resp = requests.get(
            f"{router_url}/health",
            timeout=HTTP_TIMEOUT_SECONDS,
        )
        data = resp.json()
        return resp.status_code == 200 and data.get("status") == "healthy"
    except Exception:
        return False


def route_task(router_url: str, task_description: str) -> tuple[list[str], float]:
    """POST /route and extract skill names and routing latency.

    Args:
        router_url:       Base URL of the skill router.
        task_description: Task text to route.

    Returns:
        (skill_names, router_latency_ms)

    Raises:
        RuntimeError: If the router returns a non-200 response.
    """
    payload = {
        "task": task_description,
        "context": {},
        "constraints": {"maxSkills": 5},
    }

    start = time.perf_counter()
    try:
        resp = requests.post(
            f"{router_url}/route",
            json=payload,
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except requests.exceptions.ConnectionError as e:
        raise RuntimeError(f"Cannot connect to router at {router_url}: {e}")

    latency_ms = (time.perf_counter() - start) * 1000

    if resp.status_code != 200:
        raise RuntimeError(
            f"Router returned HTTP {resp.status_code}: {resp.text[:200]}"
        )

    data = resp.json()
    skill_names: list[str] = []

    if "skills" in data and isinstance(data["skills"], list):
        for skill in data["skills"]:
            if isinstance(skill, dict):
                name = skill.get("name", "")
                if name:
                    skill_names.append(name)
            elif isinstance(skill, str):
                skill_names.append(skill)

    return skill_names, latency_ms


def fetch_skill_content(router_url: str, skill_name: str) -> str:
    """GET /skill/{name} and return the raw SKILL.md text.

    Truncates to MAX_SKILL_CHARS to stay within context limits.

    Args:
        router_url:  Base URL of the skill router.
        skill_name:  Skill identifier (e.g. 'coding-code-review').

    Returns:
        SKILL.md text, truncated if necessary.

    Raises:
        RuntimeError: If the skill endpoint returns a non-200 response.
    """
    try:
        resp = requests.get(
            f"{router_url}/skill/{skill_name}",
            timeout=HTTP_TIMEOUT_SECONDS,
        )
    except requests.exceptions.ConnectionError as e:
        raise RuntimeError(f"Cannot connect to router at {router_url}: {e}")

    if resp.status_code != 200:
        raise RuntimeError(
            f"Skill fetch returned HTTP {resp.status_code} for '{skill_name}': {resp.text[:200]}"
        )

    content = resp.text
    if len(content) > MAX_SKILL_CHARS:
        content = content[:MAX_SKILL_CHARS] + "\n\n[...truncated to fit context window]"

    return content


def build_mcp_system_prompt(router_url: str, skill_names: list[str]) -> str:
    """Fetch and concatenate SKILL.md content for all selected skills.

    Args:
        router_url:   Base URL of the skill router.
        skill_names:  List of skill names returned by the router.

    Returns:
        Combined system prompt text from all skill files.
        Falls back to GENERIC_SYSTEM_PROMPT if no skills were fetched.
    """
    if not skill_names:
        return GENERIC_SYSTEM_PROMPT

    skill_blocks: list[str] = []
    for name in skill_names:
        try:
            content = fetch_skill_content(router_url, name)
            skill_blocks.append(f"# SKILL: {name}\n\n{content}")
        except RuntimeError as e:
            print(f"  ⚠️  Could not fetch skill '{name}': {e}")

    if not skill_blocks:
        return GENERIC_SYSTEM_PROMPT

    return "\n\n---\n\n".join(skill_blocks)


# ─── Individual Runs ──────────────────────────────────────────────────────────


def run_without_mcp(
    task: str,
    model_name: str,
    provider: str,
    llamacpp_url: str,
) -> RunResult:
    """Run the LLM with a generic system prompt (no MCP skill injection).

    Args:
        task:         Task description sent as user message.
        model_name:   LLM model identifier.
        provider:     LLM provider string.
        llamacpp_url: llama.cpp base URL (used only if provider='llamacpp').

    Returns:
        RunResult populated with metrics and response.
    """
    print("  ⏳ Calling LLM (without MCP)...")

    try:
        text, prompt_tokens, completion_tokens, latency_ms = call_llm(
            model_name=model_name,
            system_prompt=GENERIC_SYSTEM_PROMPT,
            user_message=task,
            provider=provider,
            llamacpp_url=llamacpp_url,
        )
    except RuntimeError as e:
        return RunResult(
            run_type="without_mcp",
            model=model_name,
            system_prompt_preview=GENERIC_SYSTEM_PROMPT[:80],
            system_prompt_tokens=estimate_tokens(GENERIC_SYSTEM_PROMPT),
            response_text="",
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
            cost_usd=0.0,
            llm_latency_ms=0.0,
            router_latency_ms=0.0,
            total_latency_ms=0.0,
            skills_injected=[],
            error=str(e),
            success=False,
        )

    cost = calculate_cost(model_name, prompt_tokens, completion_tokens)

    return RunResult(
        run_type="without_mcp",
        model=model_name,
        system_prompt_preview=GENERIC_SYSTEM_PROMPT[:80],
        system_prompt_tokens=estimate_tokens(GENERIC_SYSTEM_PROMPT),
        response_text=text,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        cost_usd=cost,
        llm_latency_ms=latency_ms,
        router_latency_ms=0.0,
        total_latency_ms=latency_ms,
        skills_injected=[],
        success=True,
    )


def run_with_mcp(
    task: str,
    model_name: str,
    provider: str,
    llamacpp_url: str,
    router_url: str,
) -> RunResult:
    """Route task via MCP, inject SKILL.md as system prompt, call LLM.

    Steps:
      1. POST /route → get skill names + routing latency
      2. GET /skill/{name} → fetch SKILL.md content for each skill
      3. Call LLM with skill content as system prompt

    Args:
        task:         Task description.
        model_name:   LLM model identifier.
        provider:     LLM provider string.
        llamacpp_url: llama.cpp base URL.
        router_url:   MCP router base URL.

    Returns:
        RunResult populated with metrics, response, and skill info.
    """
    print("  🔀 Routing via MCP...")

    try:
        skill_names, router_latency_ms = route_task(router_url, task)
    except RuntimeError as e:
        return RunResult(
            run_type="with_mcp",
            model=model_name,
            system_prompt_preview="[routing failed]",
            system_prompt_tokens=0,
            response_text="",
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
            cost_usd=0.0,
            llm_latency_ms=0.0,
            router_latency_ms=0.0,
            total_latency_ms=0.0,
            skills_injected=[],
            error=f"Router error: {e}",
            success=False,
        )

    print(
        f"  ✅ Router selected: {', '.join(skill_names) or '(none)'} ({router_latency_ms:.0f}ms)"
    )
    print("  📥 Fetching skill content...")

    system_prompt = build_mcp_system_prompt(router_url, skill_names)
    system_prompt_tokens = estimate_tokens(system_prompt)

    print(f"  ⏳ Calling LLM (with MCP, ~{system_prompt_tokens} system tokens)...")

    try:
        text, prompt_tokens, completion_tokens, llm_latency_ms = call_llm(
            model_name=model_name,
            system_prompt=system_prompt,
            user_message=task,
            provider=provider,
            llamacpp_url=llamacpp_url,
        )
    except RuntimeError as e:
        return RunResult(
            run_type="with_mcp",
            model=model_name,
            system_prompt_preview=system_prompt[:80],
            system_prompt_tokens=system_prompt_tokens,
            response_text="",
            prompt_tokens=0,
            completion_tokens=0,
            total_tokens=0,
            cost_usd=0.0,
            llm_latency_ms=0.0,
            router_latency_ms=router_latency_ms,
            total_latency_ms=router_latency_ms,
            skills_injected=skill_names,
            error=f"LLM error: {e}",
            success=False,
        )

    cost = calculate_cost(model_name, prompt_tokens, completion_tokens)
    total_latency_ms = router_latency_ms + llm_latency_ms

    return RunResult(
        run_type="with_mcp",
        model=model_name,
        system_prompt_preview=system_prompt[:80].replace("\n", " "),
        system_prompt_tokens=system_prompt_tokens,
        response_text=text,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        cost_usd=cost,
        llm_latency_ms=llm_latency_ms,
        router_latency_ms=router_latency_ms,
        total_latency_ms=total_latency_ms,
        skills_injected=skill_names,
        success=True,
    )


# ─── Display Formatting ───────────────────────────────────────────────────────


def format_delta(without_val: float, with_val: float, unit: str = "") -> str:
    """Format a numeric delta with sign and optional percentage."""
    delta = with_val - without_val
    sign = "+" if delta >= 0 else ""
    return f"{sign}{delta:.0f}{unit}"


def format_cost_delta(without_val: float, with_val: float) -> str:
    """Format cost delta in dollars."""
    delta = with_val - without_val
    sign = "+" if delta >= 0 else ""
    return f"{sign}${delta:.4f}"


def print_comparison(comparison: ExerciseComparison) -> None:
    """Print a formatted side-by-side comparison to stdout."""
    w = comparison.without_mcp
    m = comparison.with_mcp

    sep = "═" * 70
    thin = "─" * 55

    print(f"\n{sep}")
    print(f"EXERCISE: {comparison.exercise_name}")
    print(f"TASK: {comparison.task[:120]}{'...' if len(comparison.task) > 120 else ''}")
    print(f"MODEL: {comparison.model}")
    print(sep)

    # ── RUN 1: WITHOUT MCP ──
    print("\nRUN 1 — WITHOUT MCP")
    print(thin)
    print(f'System: "{GENERIC_SYSTEM_PROMPT}"')

    if w is None:
        print("  ⚠️  Run was skipped")
    elif not w.success:
        print(f"  ❌ Run failed: {w.error}")
    else:
        preview = w.response_text[:RESPONSE_PREVIEW_CHARS]
        ellipsis = "..." if len(w.response_text) > RESPONSE_PREVIEW_CHARS else ""
        print(
            f"\nLLM Response:\n  {preview.replace(chr(10), chr(10) + '  ')}{ellipsis}"
        )
        print(
            f"\nMetrics: latency={w.llm_latency_ms:.0f}ms  "
            f"tokens={w.total_tokens}  cost=${w.cost_usd:.4f}"
        )

    # ── RUN 2: WITH MCP ──
    print("\nRUN 2 — WITH MCP")
    print(thin)

    if not comparison.router_available:
        print(f"  ⚠️  Router unavailable: {comparison.router_error}")
    elif m is None:
        print("  ⚠️  Run was skipped")
    elif not m.success:
        print(f"  ❌ Run failed: {m.error}")
    else:
        skills_str = (
            ", ".join(m.skills_injected) if m.skills_injected else "(none selected)"
        )
        print(f"Router: {m.router_latency_ms:.0f}ms → selected skills: {skills_str}")
        print(f"System: [SKILL.md content injected, ~{m.system_prompt_tokens} tokens]")

        preview = m.response_text[:RESPONSE_PREVIEW_CHARS]
        ellipsis = "..." if len(m.response_text) > RESPONSE_PREVIEW_CHARS else ""
        print(
            f"\nLLM Response:\n  {preview.replace(chr(10), chr(10) + '  ')}{ellipsis}"
        )
        print(
            f"\nMetrics: router={m.router_latency_ms:.0f}ms  "
            f"llm={m.llm_latency_ms:.0f}ms  "
            f"total={m.total_latency_ms:.0f}ms  "
            f"tokens={m.total_tokens}  cost=${m.cost_usd:.4f}"
        )

    # ── COMPARISON TABLE ──
    if w and m and w.success and m.success:
        print("\nCOMPARISON")
        print(thin)

        col_w = 20
        header = f"{'Metric':<22} {'WITHOUT MCP':>{col_w}} {'WITH MCP':>{col_w}} {'Delta':>{col_w}}"
        print(header)
        print("─" * (22 + col_w * 3 + 4))

        total_pct = (
            f" ({(m.total_latency_ms - w.total_latency_ms) / w.total_latency_ms * 100:+.0f}%)"
            if w.total_latency_ms > 0
            else ""
        )

        rows: list[tuple[str, str, str, str]] = [
            (
                "Router latency",
                "0ms",
                f"{m.router_latency_ms:.0f}ms",
                format_delta(0, m.router_latency_ms, "ms"),
            ),
            (
                "LLM latency",
                f"{w.llm_latency_ms:.0f}ms",
                f"{m.llm_latency_ms:.0f}ms",
                format_delta(w.llm_latency_ms, m.llm_latency_ms, "ms"),
            ),
            (
                "Total latency",
                f"{w.total_latency_ms:.0f}ms",
                f"{m.total_latency_ms:.0f}ms",
                format_delta(w.total_latency_ms, m.total_latency_ms, "ms") + total_pct,
            ),
            (
                "Prompt tokens",
                str(w.prompt_tokens),
                str(m.prompt_tokens),
                format_delta(w.prompt_tokens, m.prompt_tokens),
            ),
            (
                "Response tokens",
                str(w.completion_tokens),
                str(m.completion_tokens),
                format_delta(w.completion_tokens, m.completion_tokens),
            ),
            (
                "Total tokens",
                str(w.total_tokens),
                str(m.total_tokens),
                format_delta(w.total_tokens, m.total_tokens),
            ),
            (
                "Cost",
                f"${w.cost_usd:.4f}",
                f"${m.cost_usd:.4f}",
                format_cost_delta(w.cost_usd, m.cost_usd),
            ),
            (
                "Skills injected",
                "none",
                ", ".join(m.skills_injected) if m.skills_injected else "(none)",
                "",
            ),
        ]

        for label, without_val, with_val, delta in rows:
            print(
                f"{label:<22} {without_val:>{col_w}} {with_val:>{col_w}} {delta:>{col_w}}"
            )

    print(sep)


# ─── Result Serialisation ─────────────────────────────────────────────────────


def serialise_run_result(r: Optional[RunResult]) -> Optional[dict]:
    """Convert a RunResult to a JSON-safe dict, or None."""
    if r is None:
        return None
    return asdict(r)


def save_results(comparisons: list[ExerciseComparison], output_path: str) -> None:
    """Write comparison results to a JSON file.

    Args:
        comparisons: List of completed exercise comparisons.
        output_path: File path to write JSON output to.
    """
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "timestamp": datetime.now().isoformat(),
        "total_exercises": len(comparisons),
        "results": [
            {
                "exercise_name": c.exercise_name,
                "task": c.task,
                "model": c.model,
                "timestamp": c.timestamp,
                "router_available": c.router_available,
                "router_error": c.router_error,
                "without_mcp": serialise_run_result(c.without_mcp),
                "with_mcp": serialise_run_result(c.with_mcp),
            }
            for c in comparisons
        ],
    }

    with open(out, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"\n💾 Results saved to {output_path}")


# ─── Aggregate Summary ────────────────────────────────────────────────────────


def print_aggregate_summary(comparisons: list[ExerciseComparison]) -> None:
    """Print a summary table across all exercises when running a tier."""
    valid = [
        c
        for c in comparisons
        if c.without_mcp and c.with_mcp and c.without_mcp.success and c.with_mcp.success
    ]

    if not valid:
        print("\n⚠️  No successful paired comparisons to summarise.")
        return

    avg = lambda values: sum(values) / len(values) if values else 0.0

    wo_latencies = [c.without_mcp.total_latency_ms for c in valid]
    mcp_latencies = [c.with_mcp.total_latency_ms for c in valid]
    wo_tokens = [c.without_mcp.total_tokens for c in valid]
    mcp_tokens = [c.with_mcp.total_tokens for c in valid]
    wo_costs = [c.without_mcp.cost_usd for c in valid]
    mcp_costs = [c.with_mcp.cost_usd for c in valid]
    router_lats = [c.with_mcp.router_latency_ms for c in valid]

    sep = "═" * 70
    print(f"\n{sep}")
    print(f"AGGREGATE SUMMARY ({len(valid)}/{len(comparisons)} exercises succeeded)")
    print(sep)

    col = 18
    print(
        f"\n{'Metric':<24} {'WITHOUT MCP':>{col}} {'WITH MCP':>{col}} {'Delta':>{col}}"
    )
    print("─" * (24 + col * 3 + 3))

    def row(
        label: str, wo_val: float, mcp_val: float, fmt: str = ".0f", suffix: str = ""
    ) -> None:
        delta = mcp_val - wo_val
        sign = "+" if delta >= 0 else ""
        print(
            f"{label:<24} {wo_val:>{col}{fmt}}{suffix} {mcp_val:>{col}{fmt}}{suffix} {sign}{delta:>{col - 1}{fmt}}{suffix}"
        )

    row("Avg router latency", 0, avg(router_lats), suffix="ms")
    row("Avg LLM latency", avg(wo_latencies), avg(mcp_latencies), suffix="ms")
    row("Avg total latency", avg(wo_latencies), avg(mcp_latencies), suffix="ms")
    row("Avg total tokens", avg(wo_tokens), avg(mcp_tokens), ".0f")

    wo_cost_sum = sum(wo_costs)
    mcp_cost_sum = sum(mcp_costs)
    cost_delta = mcp_cost_sum - wo_cost_sum
    sign = "+" if cost_delta >= 0 else ""
    print(
        f"{'Total cost (all runs)':<24} ${wo_cost_sum:>{col - 1}.4f}  ${mcp_cost_sum:>{col - 1}.4f}  {sign}${cost_delta:.4f}"
    )

    print(sep)


# ─── Orchestration ────────────────────────────────────────────────────────────


def run_exercise_comparison(
    exercise: dict,
    model_name: str,
    provider: str,
    llamacpp_url: str,
    router_url: str,
    router_is_available: bool,
) -> ExerciseComparison:
    """Execute both runs for a single exercise and return the comparison.

    Args:
        exercise:             Exercise dict with 'name' and 'task' keys.
        model_name:           LLM model identifier.
        provider:             LLM provider string.
        llamacpp_url:         llama.cpp base URL.
        router_url:           MCP router base URL.
        router_is_available:  If False, skip the MCP run.

    Returns:
        Completed ExerciseComparison.
    """
    exercise_name = exercise.get("name", "Unnamed")
    task = exercise.get("task", "")

    comparison = ExerciseComparison(
        exercise_name=exercise_name,
        task=task,
        model=model_name,
        timestamp=datetime.now().isoformat(),
        router_available=router_is_available,
    )

    print(f"\n▶ Exercise: {exercise_name}")
    print(f"  Task: {task[:100]}{'...' if len(task) > 100 else ''}")

    # Run 1: WITHOUT MCP
    comparison.without_mcp = run_without_mcp(
        task=task,
        model_name=model_name,
        provider=provider,
        llamacpp_url=llamacpp_url,
    )

    # Run 2: WITH MCP (skip gracefully if router is down)
    if router_is_available:
        comparison.with_mcp = run_with_mcp(
            task=task,
            model_name=model_name,
            provider=provider,
            llamacpp_url=llamacpp_url,
            router_url=router_url,
        )
    else:
        comparison.router_error = "Router unavailable — MCP run skipped"

    return comparison


# ─── CLI Entry Point ──────────────────────────────────────────────────────────


def build_argument_parser() -> argparse.ArgumentParser:
    """Construct the CLI argument parser with all supported flags."""
    parser = argparse.ArgumentParser(
        description=(
            "True end-to-end LLM benchmark: compare responses WITH vs WITHOUT "
            "MCP skill router injection."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single task
  python3 benchmarks/llm_compare.py --task "Review this code for security issues"

  # Single exercise file
  python3 benchmarks/llm_compare.py --exercise benchmarks/exercises/simple/exercise-1.json

  # All exercises in a tier
  python3 benchmarks/llm_compare.py --tier simple

  # Override model
  python3 benchmarks/llm_compare.py --tier simple --model gpt-4o

  # Custom router / llamacpp URLs
  python3 benchmarks/llm_compare.py --task "..." \\
      --router-url http://localhost:3000 \\
      --llamacpp-url http://localhost:8080/v1

  # Save JSON results
  python3 benchmarks/llm_compare.py --tier simple --output results/comparison.json
""",
    )

    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument(
        "--task",
        type=str,
        metavar="TASK",
        help="Single task description to benchmark",
    )
    source.add_argument(
        "--exercise",
        type=str,
        metavar="FILE",
        help="Path to a single exercise JSON file",
    )
    source.add_argument(
        "--tier",
        type=str,
        choices=["simple", "medium", "heavy"],
        metavar="TIER",
        help="Run all exercises in a tier (simple|medium|heavy)",
    )

    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Override the default model from openconfig.json",
    )
    parser.add_argument(
        "--router-url",
        type=str,
        default=DEFAULT_ROUTER_URL,
        metavar="URL",
        help=f"MCP router base URL (default: {DEFAULT_ROUTER_URL})",
    )
    parser.add_argument(
        "--llamacpp-url",
        type=str,
        default=DEFAULT_LLAMACPP_URL,
        metavar="URL",
        help=f"llama.cpp OpenAI-compatible API base URL (default: {DEFAULT_LLAMACPP_URL})",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        metavar="FILE",
        help="Save results as JSON to this file path",
    )

    return parser


def main() -> None:
    """Parse CLI arguments, orchestrate runs, and display results."""
    parser = build_argument_parser()
    args = parser.parse_args()

    # Resolve model
    model_name = args.model or load_default_model()
    provider = detect_provider(model_name)

    print(f"\n🤖 Model: {model_name}  (provider: {provider})")
    print(f"🌐 Router URL: {args.router_url}")
    if provider == "llamacpp":
        print(f"🖥️  llama.cpp URL: {args.llamacpp_url}")

    # Check router availability once upfront
    print("\n🔍 Checking MCP router health...")
    router_available = router_health_check(args.router_url)
    if router_available:
        print("  ✅ Router is healthy")
    else:
        print(
            f"  ⚠️  Router unavailable at {args.router_url} — MCP runs will be skipped"
        )

    # Resolve exercise list
    if args.task:
        exercises = [{"name": "Ad-hoc Task", "task": args.task}]
    elif args.exercise:
        exercises = [load_exercise_file(args.exercise)]
    else:
        exercises = load_tier_exercises(args.tier)

    print(f"\n📋 Running {len(exercises)} exercise(s)...\n")

    comparisons: list[ExerciseComparison] = []

    for exercise in exercises:
        comparison = run_exercise_comparison(
            exercise=exercise,
            model_name=model_name,
            provider=provider,
            llamacpp_url=args.llamacpp_url,
            router_url=args.router_url,
            router_is_available=router_available,
        )
        comparisons.append(comparison)
        print_comparison(comparison)

    # Aggregate summary when multiple exercises ran
    if len(comparisons) > 1:
        print_aggregate_summary(comparisons)

    # Persist JSON if requested
    if args.output:
        save_results(comparisons, args.output)


if __name__ == "__main__":
    main()
