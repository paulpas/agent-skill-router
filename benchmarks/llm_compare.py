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
    python3 benchmarks/llm_compare.py --tier simple --no-code-eval
"""

import argparse
import ast
import json
import os
import subprocess
import sys
import tempfile
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
CODE_EXEC_TIMEOUT_SECONDS = 10

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

    # Code quality fields (None when no coding_challenge in exercise)
    code_generated: Optional[str] = None  # Extracted code from LLM response
    code_compiles: Optional[bool] = None
    test_cases_passed: Optional[int] = None
    test_cases_total: Optional[int] = None
    correctness_pct: Optional[float] = None  # % test cases passed
    cyclomatic_complexity: Optional[int] = None
    has_error_handling: Optional[bool] = None
    maintainability_score: Optional[float] = None  # 0-100
    sloc: Optional[int] = None


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

    # Router returns "selectedSkills"; fall back to "skills" for compatibility
    raw_skills = data.get("selectedSkills") or data.get("skills") or []
    if isinstance(raw_skills, list):
        for skill in raw_skills:
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


# ─── Code Quality Analysis ────────────────────────────────────────────────────


def extract_code(response_text: str, language: str) -> Optional[str]:
    """Extract code from an LLM response.

    Search order:
      1. Language-specific fenced block: ```python ... ``` or ```javascript ... ```
      2. Generic fenced block: ``` ... ```
      3. Whole response if it contains a top-level function declaration keyword.

    Args:
        response_text: Raw LLM response string.
        language:      Target language (e.g. "python", "javascript").

    Returns:
        Extracted code string, or None if no code is detected.
    """
    if not response_text:
        return None

    # Strategy 1: language-specific fenced block
    lang_lower = language.lower()
    lang_fence_start = f"```{lang_lower}"
    start_idx = response_text.lower().find(lang_fence_start)
    if start_idx != -1:
        # Find the actual fence start (with original case) then the closing ```
        block_start = response_text.find("\n", start_idx) + 1
        block_end = response_text.find("```", block_start)
        if block_end != -1:
            return response_text[block_start:block_end].strip()

    # Strategy 2: generic fenced block
    generic_start = response_text.find("```")
    if generic_start != -1:
        block_start = response_text.find("\n", generic_start) + 1
        block_end = response_text.find("```", block_start)
        if block_end != -1:
            return response_text[block_start:block_end].strip()

    # Strategy 3: whole response if it looks like raw code
    function_keywords = {
        "python": ["def ", "class "],
        "javascript": ["function ", "const ", "let ", "var "],
        "js": ["function ", "const "],
        "go": ["func "],
    }
    keywords = function_keywords.get(lang_lower, ["def ", "function ", "func "])
    if any(kw in response_text for kw in keywords):
        return response_text.strip()

    return None


def _count_sloc(source_lines: list[str]) -> int:
    """Count non-blank, non-comment source lines."""
    count = 0
    for line in source_lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            count += 1
    return count


def _compute_cyclomatic_complexity(tree: ast.AST) -> int:
    """Walk AST and count decision points, plus 1 for the base path."""
    decision_node_types = (
        ast.If,
        ast.For,
        ast.While,
        ast.ExceptHandler,
        ast.With,
    )
    complexity = 1  # Base path
    for node in ast.walk(tree):
        if isinstance(node, decision_node_types):
            complexity += 1
        elif isinstance(node, ast.BoolOp):
            # Each `and` / `or` adds a branch — count operands - 1
            complexity += len(node.values) - 1
    return complexity


def _has_error_handling(tree: ast.AST) -> bool:
    """Return True if the AST contains any try/except node."""
    return any(isinstance(node, ast.Try) for node in ast.walk(tree))


def _compute_maintainability_score(
    correctness_pct: float,
    cyclomatic_complexity: int,
    has_error_handling_flag: bool,
    sloc: int,
) -> float:
    """Score maintainability 0–100 based on four weighted dimensions.

    Scoring breakdown:
      - 40 pts: correctness (scaled by test pass rate)
      - 30 pts: complexity (30 ≤5, 20 ≤10, 10 ≤15, 0 otherwise)
      - 20 pts: error handling present
      - 10 pts: SLOC in reasonable range
    """
    correctness_pts = correctness_pct * 0.40 * 100  # scales 0–40

    if cyclomatic_complexity <= 5:
        complexity_pts = 30.0
    elif cyclomatic_complexity <= 10:
        complexity_pts = 20.0
    elif cyclomatic_complexity <= 15:
        complexity_pts = 10.0
    else:
        complexity_pts = 0.0

    error_handling_pts = 20.0 if has_error_handling_flag else 0.0

    if 10 <= sloc <= 100:
        sloc_pts = 10.0
    elif 1 <= sloc <= 9 or 101 <= sloc <= 200:
        sloc_pts = 5.0
    else:
        sloc_pts = 0.0

    return correctness_pts + complexity_pts + error_handling_pts + sloc_pts


def _run_single_test_case(
    code: str,
    test_case: dict,
    timeout: int,
) -> bool:
    """Execute code in a subprocess and compare stdout to expected output.

    Injects a runner that calls the first top-level function with the
    test case input, then prints the result to stdout.

    Args:
        code:      Python source code to test.
        test_case: Dict with 'input' and 'expected_output' keys.
        timeout:   Seconds before subprocess is killed.

    Returns:
        True if stdout matches expected_output (as string), False otherwise.
    """
    test_input = test_case.get("input")
    expected_output = str(test_case.get("expected_output", ""))

    # Build a runner that discovers the first top-level function
    runner_snippet = f"""
import sys as _sys

_input = {repr(test_input)}

# Find first top-level callable and invoke it
_candidates = [v for v in list(locals().values()) + list(globals().values())
               if callable(v) and not v.__name__.startswith('_')]
# Re-discover after exec context: parse the module for function names
import ast as _ast, types as _types
_src = open(__file__).read()
_tree = _ast.parse(_src)
_fn_names = [n.name for n in _ast.walk(_tree)
             if isinstance(n, _ast.FunctionDef) and not n.name.startswith('_')]

if not _fn_names:
    print("__NO_FUNCTION__")
    _sys.exit(0)

_fn = globals().get(_fn_names[0])
if _fn is None:
    print("__FUNCTION_NOT_FOUND__")
    _sys.exit(0)

try:
    if isinstance(_input, (list, tuple)):
        _result = _fn(*_input)
    else:
        _result = _fn(_input)
    print(_result)
except Exception as _e:
    print(f"__EXCEPTION__: {{_e}}")
"""

    full_source = code + "\n" + runner_snippet

    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as tmp:
            tmp.write(full_source)
            tmp_path = tmp.name

        result = subprocess.run(
            ["python3", tmp_path],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        actual_output = result.stdout.strip()
        return actual_output == expected_output

    except subprocess.TimeoutExpired:
        return False
    except Exception:
        return False
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


def analyze_python_code(
    code: str,
    test_cases: list,
    timeout: int = CODE_EXEC_TIMEOUT_SECONDS,
    run_tests: bool = True,
) -> dict:
    """Analyze Python code for quality metrics.

    Performs:
      - Syntax / compilation check via ast.parse
      - Test case execution (if run_tests=True)
      - Cyclomatic complexity via AST walk
      - Error handling detection via AST walk
      - Source lines of code count
      - Maintainability score (0–100)

    Args:
        code:       Python source code string.
        test_cases: List of {input, expected_output} dicts from exercise.
        timeout:    Seconds per test case subprocess.
        run_tests:  If False, skip subprocess execution.

    Returns:
        Dict with keys: compiles, test_cases_passed, test_cases_total,
        correctness_pct, cyclomatic_complexity, has_error_handling,
        sloc, maintainability_score.
    """
    # Guard: empty code produces zeroed metrics
    if not code or not code.strip():
        return {
            "compiles": False,
            "test_cases_passed": 0,
            "test_cases_total": len(test_cases),
            "correctness_pct": 0.0,
            "cyclomatic_complexity": 0,
            "has_error_handling": False,
            "sloc": 0,
            "maintainability_score": 0.0,
        }

    # ── Compilation check ──────────────────────────────────────────────────
    try:
        tree = ast.parse(code)
        compiles = True
    except SyntaxError:
        return {
            "compiles": False,
            "test_cases_passed": 0,
            "test_cases_total": len(test_cases),
            "correctness_pct": 0.0,
            "cyclomatic_complexity": 0,
            "has_error_handling": False,
            "sloc": _count_sloc(code.splitlines()),
            "maintainability_score": 0.0,
        }

    # ── Static metrics (safe, no subprocess) ──────────────────────────────
    cyclomatic_complexity = _compute_cyclomatic_complexity(tree)
    error_handling = _has_error_handling(tree)
    sloc = _count_sloc(code.splitlines())

    # ── Test execution ─────────────────────────────────────────────────────
    passed = 0
    total = len(test_cases)

    if run_tests and total > 0:
        for test_case in test_cases:
            try:
                if _run_single_test_case(code, test_case, timeout):
                    passed += 1
            except Exception:
                pass  # Never let a broken test crash the benchmark

    correctness_pct = (passed / total) if total > 0 else 1.0

    # ── Maintainability score ──────────────────────────────────────────────
    maintainability = _compute_maintainability_score(
        correctness_pct=correctness_pct,
        cyclomatic_complexity=cyclomatic_complexity,
        has_error_handling_flag=error_handling,
        sloc=sloc,
    )

    return {
        "compiles": compiles,
        "test_cases_passed": passed,
        "test_cases_total": total,
        "correctness_pct": correctness_pct,
        "cyclomatic_complexity": cyclomatic_complexity,
        "has_error_handling": error_handling,
        "sloc": sloc,
        "maintainability_score": maintainability,
    }


def build_coding_challenge_prompt(exercise: dict) -> str:
    """Build a user prompt that includes the coding challenge description.

    Args:
        exercise: Exercise dict containing 'task' and 'coding_challenge' keys.

    Returns:
        Formatted prompt string that instructs the LLM to return fenced code.
    """
    task = exercise.get("task", "")
    challenge = exercise["coding_challenge"]
    description = challenge.get("description", "")
    language = challenge.get("language", "python")

    return (
        f"Task: {task}\n\n"
        f"Coding Challenge: {description}\n"
        f"Language: {language}\n\n"
        f"Please provide working {language} code that solves the challenge.\n"
        f"Return code in a ```{language} ... ``` fenced block."
    )


def apply_code_quality_to_result(
    result: RunResult,
    exercise: dict,
    run_code_eval: bool,
) -> None:
    """Extract code from result and compute quality metrics in-place.

    Only processes exercises with a 'coding_challenge' key.
    Only runs Python quality analysis (non-Python languages get None fields).

    Args:
        result:        RunResult to annotate with quality fields.
        exercise:      Exercise dict (may contain 'coding_challenge').
        run_code_eval: If False, skip subprocess test execution.
    """
    challenge = exercise.get("coding_challenge")
    if challenge is None:
        return  # Not a coding exercise — leave all quality fields as None

    language = challenge.get("language", "python").lower()
    test_cases = challenge.get("success_criteria", {}).get("test_cases", [])

    code = extract_code(result.response_text, language)
    result.code_generated = code

    if language != "python":
        # Non-Python quality eval not supported yet
        print(f"  ℹ️  Code quality eval not supported for language: {language}")
        return

    if code is None:
        # No code found at all — mark as failed compilation
        result.code_compiles = False
        result.test_cases_passed = 0
        result.test_cases_total = len(test_cases)
        result.correctness_pct = 0.0
        result.cyclomatic_complexity = 0
        result.has_error_handling = False
        result.maintainability_score = 0.0
        result.sloc = 0
        return

    metrics = analyze_python_code(
        code=code,
        test_cases=test_cases,
        run_tests=run_code_eval,
    )

    result.code_compiles = metrics["compiles"]
    result.test_cases_passed = metrics["test_cases_passed"]
    result.test_cases_total = metrics["test_cases_total"]
    result.correctness_pct = metrics["correctness_pct"]
    result.cyclomatic_complexity = metrics["cyclomatic_complexity"]
    result.has_error_handling = metrics["has_error_handling"]
    result.maintainability_score = metrics["maintainability_score"]
    result.sloc = metrics["sloc"]


# ─── Individual Runs ──────────────────────────────────────────────────────────


def run_without_mcp(
    task: str,
    model_name: str,
    provider: str,
    llamacpp_url: str,
    exercise: Optional[dict] = None,
    run_code_eval: bool = True,
) -> RunResult:
    """Run the LLM with a generic system prompt (no MCP skill injection).

    Args:
        task:          Task description sent as user message.
        model_name:    LLM model identifier.
        provider:      LLM provider string.
        llamacpp_url:  llama.cpp base URL (used only if provider='llamacpp').
        exercise:      Full exercise dict (used for coding_challenge prompt/eval).
        run_code_eval: If False, skip subprocess code execution.

    Returns:
        RunResult populated with metrics and response.
    """
    print("  ⏳ Calling LLM (without MCP)...")

    # Use enriched prompt when exercise has a coding challenge
    user_message = task
    if exercise and "coding_challenge" in exercise:
        user_message = build_coding_challenge_prompt(exercise)

    try:
        text, prompt_tokens, completion_tokens, latency_ms = call_llm(
            model_name=model_name,
            system_prompt=GENERIC_SYSTEM_PROMPT,
            user_message=user_message,
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

    result = RunResult(
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

    if exercise:
        apply_code_quality_to_result(result, exercise, run_code_eval)

    return result


def run_with_mcp(
    task: str,
    model_name: str,
    provider: str,
    llamacpp_url: str,
    router_url: str,
    exercise: Optional[dict] = None,
    run_code_eval: bool = True,
) -> RunResult:
    """Route task via MCP, inject SKILL.md as system prompt, call LLM.

    Steps:
      1. POST /route → get skill names + routing latency
      2. GET /skill/{name} → fetch SKILL.md content for each skill
      3. Call LLM with skill content as system prompt

    Args:
        task:          Task description.
        model_name:    LLM model identifier.
        provider:      LLM provider string.
        llamacpp_url:  llama.cpp base URL.
        router_url:    MCP router base URL.
        exercise:      Full exercise dict (used for coding_challenge prompt/eval).
        run_code_eval: If False, skip subprocess code execution.

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

    # Use enriched prompt when exercise has a coding challenge
    user_message = task
    if exercise and "coding_challenge" in exercise:
        user_message = build_coding_challenge_prompt(exercise)

    try:
        text, prompt_tokens, completion_tokens, llm_latency_ms = call_llm(
            model_name=model_name,
            system_prompt=system_prompt,
            user_message=user_message,
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

    result = RunResult(
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

    if exercise:
        apply_code_quality_to_result(result, exercise, run_code_eval)

    return result


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


def _has_quality_data(result: Optional[RunResult]) -> bool:
    """Return True if result contains populated code quality metrics."""
    return result is not None and result.code_compiles is not None


def print_coding_quality_section(
    w: Optional[RunResult],
    m: Optional[RunResult],
    thin: str,
) -> None:
    """Print the CODING QUALITY comparison section.

    Only called when at least one run has quality data.

    Args:
        w:    without_mcp RunResult.
        m:    with_mcp RunResult.
        thin: Section separator string.
    """
    w_has = _has_quality_data(w)
    m_has = _has_quality_data(m)

    if not w_has and not m_has:
        return

    print("\nCODING QUALITY COMPARISON")
    print(thin)

    col = 18
    header = (
        f"{'Metric':<25} {'WITHOUT MCP':>{col}} {'WITH MCP':>{col}} {'Delta':>{col}}"
    )
    print(header)
    print("─" * (25 + col * 3 + 3))

    def fmt_bool(val: Optional[bool]) -> str:
        if val is None:
            return "N/A"
        return "✅ Yes" if val else "❌ No"

    def fmt_opt(val, fmt_str: str = "") -> str:
        if val is None:
            return "N/A"
        if fmt_str:
            return f"{val:{fmt_str}}"
        return str(val)

    # Compiles
    w_compiles = fmt_bool(w.code_compiles if w_has else None)
    m_compiles = fmt_bool(m.code_compiles if m_has else None)
    compiles_delta = "—"
    if w_has and m_has and w.code_compiles is not None and m.code_compiles is not None:
        if w.code_compiles == m.code_compiles:
            compiles_delta = "same"
        elif m.code_compiles:
            compiles_delta = "improved"
        else:
            compiles_delta = "regressed"
    print(
        f"{'Compiles':<25} {w_compiles:>{col}} {m_compiles:>{col}} {compiles_delta:>{col}}"
    )

    # Test cases passed
    def fmt_tests(r: Optional[RunResult], has: bool) -> str:
        if not has or r is None or r.test_cases_total is None:
            return "N/A"
        if r.test_cases_total == 0:
            return "no tests"
        pct = (r.correctness_pct or 0.0) * 100
        return f"{r.test_cases_passed}/{r.test_cases_total} ({pct:.1f}%)"

    w_tests = fmt_tests(w, w_has)
    m_tests = fmt_tests(m, m_has)
    tests_delta = "—"
    if (
        w_has
        and m_has
        and w is not None
        and m is not None
        and w.correctness_pct is not None
        and m.correctness_pct is not None
    ):
        diff_pct = (m.correctness_pct - w.correctness_pct) * 100
        sign = "+" if diff_pct >= 0 else ""
        tests_delta = f"{sign}{diff_pct:.1f}%"
    print(
        f"{'Test cases passed':<25} {w_tests:>{col}} {m_tests:>{col}} {tests_delta:>{col}}"
    )

    # Cyclomatic complexity
    w_cc = fmt_opt(w.cyclomatic_complexity if w_has else None)
    m_cc = fmt_opt(m.cyclomatic_complexity if m_has else None)
    cc_delta = "—"
    if (
        w_has
        and m_has
        and w is not None
        and m is not None
        and w.cyclomatic_complexity is not None
        and m.cyclomatic_complexity is not None
    ):
        diff = m.cyclomatic_complexity - w.cyclomatic_complexity
        sign = "+" if diff >= 0 else ""
        direction = " (worse)" if diff > 0 else " (better)" if diff < 0 else ""
        cc_delta = f"{sign}{diff}{direction}"
    print(
        f"{'Cyclomatic complexity':<25} {w_cc:>{col}} {m_cc:>{col}} {cc_delta:>{col}}"
    )

    # Error handling
    w_eh = fmt_bool(w.has_error_handling if w_has else None)
    m_eh = fmt_bool(m.has_error_handling if m_has else None)
    eh_delta = "—"
    if (
        w_has
        and m_has
        and w is not None
        and m is not None
        and w.has_error_handling is not None
        and m.has_error_handling is not None
    ):
        if w.has_error_handling == m.has_error_handling:
            eh_delta = "same"
        elif m.has_error_handling:
            eh_delta = "improved"
        else:
            eh_delta = "regressed"
    print(f"{'Error handling':<25} {w_eh:>{col}} {m_eh:>{col}} {eh_delta:>{col}}")

    # Maintainability score
    w_ms = fmt_opt(
        f"{w.maintainability_score:.0f}/100"
        if w_has and w is not None and w.maintainability_score is not None
        else None
    )
    m_ms = fmt_opt(
        f"{m.maintainability_score:.0f}/100"
        if m_has and m is not None and m.maintainability_score is not None
        else None
    )
    ms_delta = "—"
    if (
        w_has
        and m_has
        and w is not None
        and m is not None
        and w.maintainability_score is not None
        and m.maintainability_score is not None
    ):
        diff = m.maintainability_score - w.maintainability_score
        sign = "+" if diff >= 0 else ""
        ms_delta = f"{sign}{diff:.0f} pts"
    print(f"{'Maintainability':<25} {w_ms:>{col}} {m_ms:>{col}} {ms_delta:>{col}}")

    # SLOC
    w_sloc = fmt_opt(w.sloc if w_has else None)
    m_sloc = fmt_opt(m.sloc if m_has else None)
    sloc_delta = "—"
    if (
        w_has
        and m_has
        and w is not None
        and m is not None
        and w.sloc is not None
        and m.sloc is not None
    ):
        diff = m.sloc - w.sloc
        sign = "+" if diff >= 0 else ""
        sloc_delta = f"{sign}{diff} lines"
    print(f"{'SLOC':<25} {w_sloc:>{col}} {m_sloc:>{col}} {sloc_delta:>{col}}")

    print(thin)

    # Verdict
    if (
        w_has
        and m_has
        and w is not None
        and m is not None
        and w.maintainability_score is not None
        and m.maintainability_score is not None
    ):
        w_score = w.maintainability_score
        m_score = m.maintainability_score
        if m_score > w_score:
            verdict = f"WITH MCP wins ({m_score:.0f} vs {w_score:.0f})"
        elif w_score > m_score:
            verdict = f"WITHOUT MCP wins ({w_score:.0f} vs {m_score:.0f})"
        else:
            verdict = f"Tied ({w_score:.0f} vs {m_score:.0f})"
        print(f"CODE QUALITY VERDICT: {verdict}")


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

        # ── CODING QUALITY SECTION ──
        print_coding_quality_section(w, m, thin)

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

    # ── CODE QUALITY AGGREGATE ──────────────────────────────────────────────
    coding_valid = [
        c
        for c in valid
        if _has_quality_data(c.without_mcp) and _has_quality_data(c.with_mcp)
    ]

    if not coding_valid:
        return  # No coding exercises in this run — skip quality aggregate

    wo_correctness_values = [
        c.without_mcp.correctness_pct * 100
        for c in coding_valid
        if c.without_mcp.correctness_pct is not None
    ]
    mcp_correctness_values = [
        c.with_mcp.correctness_pct * 100
        for c in coding_valid
        if c.with_mcp.correctness_pct is not None
    ]

    avg_wo_correctness = avg(wo_correctness_values)
    avg_mcp_correctness = avg(mcp_correctness_values)
    quality_improvement = avg_mcp_correctness - avg_wo_correctness

    # Count wins, losses, ties by maintainability score
    mcp_wins = sum(
        1
        for c in coding_valid
        if (c.with_mcp.maintainability_score or 0)
        > (c.without_mcp.maintainability_score or 0)
    )
    wo_wins = sum(
        1
        for c in coding_valid
        if (c.without_mcp.maintainability_score or 0)
        > (c.with_mcp.maintainability_score or 0)
    )
    ties = len(coding_valid) - mcp_wins - wo_wins

    total_coding = len(coding_valid)

    print(f"\n{'CODE QUALITY AGGREGATE':}")
    print("─" * 55)
    print(f"Average correctness WITHOUT MCP: {avg_wo_correctness:.1f}%")
    print(f"Average correctness WITH MCP:    {avg_mcp_correctness:.1f}%")
    sign = "+" if quality_improvement >= 0 else ""
    print(
        f"Quality improvement:             {sign}{quality_improvement:.1f} percentage points"
    )
    print(f"Exercises where WITH MCP won:    {mcp_wins}/{total_coding}")
    print(f"Exercises where WITHOUT MCP won: {wo_wins}/{total_coding}")
    print(f"Exercises tied:                  {ties}/{total_coding}")
    print(sep)


# ─── Orchestration ────────────────────────────────────────────────────────────


def run_exercise_comparison(
    exercise: dict,
    model_name: str,
    provider: str,
    llamacpp_url: str,
    router_url: str,
    router_is_available: bool,
    run_code_eval: bool = True,
) -> ExerciseComparison:
    """Execute both runs for a single exercise and return the comparison.

    Args:
        exercise:             Exercise dict with 'name' and 'task' keys.
        model_name:           LLM model identifier.
        provider:             LLM provider string.
        llamacpp_url:         llama.cpp base URL.
        router_url:           MCP router base URL.
        router_is_available:  If False, skip the MCP run.
        run_code_eval:        If False, skip subprocess code execution.

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

    if "coding_challenge" in exercise:
        lang = exercise["coding_challenge"].get("language", "python")
        print(f"  🧪 Coding challenge detected (language: {lang})")

    # Run 1: WITHOUT MCP
    comparison.without_mcp = run_without_mcp(
        task=task,
        model_name=model_name,
        provider=provider,
        llamacpp_url=llamacpp_url,
        exercise=exercise,
        run_code_eval=run_code_eval,
    )

    # Run 2: WITH MCP (skip gracefully if router is down)
    if router_is_available:
        comparison.with_mcp = run_with_mcp(
            task=task,
            model_name=model_name,
            provider=provider,
            llamacpp_url=llamacpp_url,
            router_url=router_url,
            exercise=exercise,
            run_code_eval=run_code_eval,
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

  # Skip code execution (for restricted environments)
  python3 benchmarks/llm_compare.py --tier simple --no-code-eval
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
    parser.add_argument(
        "--no-code-eval",
        action="store_true",
        default=False,
        help="Skip subprocess code execution (static analysis only)",
    )

    return parser


def main() -> None:
    """Parse CLI arguments, orchestrate runs, and display results."""
    parser = build_argument_parser()
    args = parser.parse_args()

    # Resolve model
    model_name = args.model or load_default_model()
    provider = detect_provider(model_name)

    run_code_eval = not args.no_code_eval

    print(f"\n🤖 Model: {model_name}  (provider: {provider})")
    print(f"🌐 Router URL: {args.router_url}")
    if provider == "llamacpp":
        print(f"🖥️  llama.cpp URL: {args.llamacpp_url}")
    if not run_code_eval:
        print("⚠️  Code execution disabled (--no-code-eval)")

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
            run_code_eval=run_code_eval,
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
