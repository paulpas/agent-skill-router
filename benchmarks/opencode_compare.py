#!/usr/bin/env python3
"""Benchmark OpenCode WITH vs WITHOUT the MCP skill router.

Uses the OpenCode CLI (`opencode run`) to run the same task twice:
  - WITH MCP:     normal invocation, skill-router MCP injects SKILL.md as context
  - WITHOUT MCP:  temp XDG_CONFIG_HOME disables the skill-router MCP server

The benchmark captures the full JSON event stream from `opencode run --format json`,
assembles the final assistant response text, and computes code-quality metrics.

JSON event stream format (`opencode run --format json`):
  Each line is a JSON object.  Key event types:
    {"type":"step_start",       "timestamp":..., "sessionID":"...", "part":{...}}
    {"type":"message.part.updated", "properties": {"part": {"type":"text","text":"..."}, "delta":"..."}}
    {"type":"session.idle",     "properties": {"sessionID":"..."}}
    {"type":"error",            "timestamp":..., "sessionID":"...", "error":{...}}

  Text is assembled from "message.part.updated" events where
  properties.part.type == "text".  Each part has a unique id; we keep the *last*
  full `text` field seen for each part id (opencode sends incremental updates,
  final event for a part-id carries the complete text).

Usage:
    python3 benchmarks/opencode_compare.py --task "Say PONG"
    python3 benchmarks/opencode_compare.py --exercise benchmarks/exercises/simple/exercise-1.json
    python3 benchmarks/opencode_compare.py --tier simple
    python3 benchmarks/opencode_compare.py --tier simple --model llamacpp/qwen3-coder-next-8_0
    python3 benchmarks/opencode_compare.py --task "..." --output results/comparison.json
    python3 benchmarks/opencode_compare.py --tier simple --no-code-eval
"""

import argparse
import ast
import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

# ─── Constants ────────────────────────────────────────────────────────────────

OPENCODE_BINARY = Path("/home/paulpas/.opencode/bin/opencode")
OPENCODE_CONFIG_PATH = Path("/home/paulpas/.config/opencode/opencode.json")

DEFAULT_MODEL = "llamacpp/qwen3-coder-next-8_0"
DEFAULT_TIMEOUT = 120
RESPONSE_PREVIEW_CHARS = 500
CODE_EXEC_TIMEOUT_SECONDS = 10

_SCRIPT_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _SCRIPT_DIR.parent


# ─── Data Structures ──────────────────────────────────────────────────────────


@dataclass
class RunResult:
    """Metrics and response from a single OpenCode run."""

    mcp_enabled: bool
    model: str
    response_text: str
    latency_ms: float
    error: Optional[str] = None
    success: bool = True

    # Code quality fields (None when no coding_challenge in exercise)
    code_generated: Optional[str] = None
    code_compiles: Optional[bool] = None
    test_cases_passed: Optional[int] = None
    test_cases_total: Optional[int] = None
    correctness_pct: Optional[float] = None
    cyclomatic_complexity: Optional[int] = None
    has_error_handling: Optional[bool] = None
    maintainability_score: Optional[float] = None
    sloc: Optional[int] = None


@dataclass
class ExerciseComparison:
    """Full comparison result for one exercise."""

    exercise_name: str
    task: str
    model: str
    timestamp: str
    with_mcp: Optional[RunResult] = None
    without_mcp: Optional[RunResult] = None


# ─── Config Loading ───────────────────────────────────────────────────────────


def load_opencode_config() -> dict:
    """Load the OpenCode config from the standard path.

    Returns:
        Parsed config dict.

    Raises:
        RuntimeError: If the config file is missing or contains invalid JSON.
    """
    if not OPENCODE_CONFIG_PATH.exists():
        raise RuntimeError(f"OpenCode config not found: {OPENCODE_CONFIG_PATH}")

    try:
        with open(OPENCODE_CONFIG_PATH, "r") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise RuntimeError(
            f"Invalid JSON in OpenCode config {OPENCODE_CONFIG_PATH}: {e}"
        )


def make_no_mcp_config_dir(base_config: dict) -> str:
    """Create a temp XDG_CONFIG_HOME dir with skill-router MCP disabled.

    Writes a modified opencode.json to:
        <tmpdir>/opencode/opencode.json

    with mcp["skill-router"]["enabled"] set to False.

    Args:
        base_config: Original config dict (not mutated).

    Returns:
        Path to the temp directory (caller must set XDG_CONFIG_HOME to this).
    """
    tmpdir = tempfile.mkdtemp(prefix="opencode-no-mcp-")
    config_dir = os.path.join(tmpdir, "opencode")
    os.makedirs(config_dir, exist_ok=True)

    modified = copy.deepcopy(base_config)
    if "mcp" in modified and "skill-router" in modified["mcp"]:
        modified["mcp"]["skill-router"]["enabled"] = False

    config_file = os.path.join(config_dir, "opencode.json")
    with open(config_file, "w") as f:
        json.dump(modified, f, indent=2)

    return tmpdir


def load_exercise_file(path: str) -> dict:
    """Parse and return a single exercise JSON file.

    Raises:
        SystemExit: If file is missing or JSON is invalid.
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

    Raises:
        SystemExit: If tier directory is missing or contains no valid exercises.
    """
    tier_path = _SCRIPT_DIR / "exercises" / tier
    if not tier_path.exists():
        sys.exit(f"❌ Tier directory not found: {tier_path}")

    exercise_files = sorted(tier_path.glob("*.json"))
    if not exercise_files:
        sys.exit(f"❌ No exercise JSON files found in: {tier_path}")

    exercises: list[dict] = []
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


# ─── JSON Event Stream Parser ─────────────────────────────────────────────────


def parse_opencode_json_stream(stdout_text: str) -> tuple[str, list[dict]]:
    """Parse the newline-delimited JSON event stream from `opencode run --format json`.

    Event format overview:
      - step_start:            {"type":"step_start", "part":{...}}
      - message.part.updated:  {"type":"message.part.updated",
                                 "properties":{"part":{"type":"text","text":"...","id":"..."},
                                               "delta":"..."}}
      - session.idle:          {"type":"session.idle", "properties":{"sessionID":"..."}}
      - error:                 {"type":"error", "error":{"name":"...","data":{"message":"..."}}}

    Text assembly:
      For each "message.part.updated" event where properties.part.type == "text",
      we record the latest full `text` value keyed by part `id`.
      The final assistant response is the concatenation of all part texts
      in the order they were first seen.

    Args:
        stdout_text: Raw stdout from the opencode subprocess.

    Returns:
        (response_text, raw_events) — assembled text and all parsed events.
    """
    raw_events: list[dict] = []
    error_messages: list[str] = []

    # part_id → (order_index, latest_text)
    text_parts: dict[str, tuple[int, str]] = {}
    part_order: list[str] = []

    for line in stdout_text.splitlines():
        line = line.strip()
        if not line:
            continue

        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue  # Skip non-JSON lines (ANSI escape codes, etc.)

        raw_events.append(event)
        event_type = event.get("type", "")

        if event_type == "message.part.updated":
            properties = event.get("properties", {})
            part = properties.get("part", {})
            part_type = part.get("type", "")
            part_id = part.get("id", "")

            if part_type == "text" and part_id:
                text_val = part.get("text", "")
                if part_id not in text_parts:
                    # First time we see this part id — record its order
                    part_order.append(part_id)
                    text_parts[part_id] = (len(part_order) - 1, text_val)
                else:
                    # Update with latest (longer) text
                    order_idx = text_parts[part_id][0]
                    text_parts[part_id] = (order_idx, text_val)

        elif event_type == "error":
            error_data = event.get("error", {})
            error_name = error_data.get("name", "")
            error_msg = error_data.get("data", {}).get("message", "")
            error_messages.append(
                f"{error_name}: {error_msg}" if error_msg else error_name
            )

    # Assemble response from parts in order of first appearance
    ordered_texts = [text_parts[pid][1] for pid in part_order if pid in text_parts]
    response_text = "".join(ordered_texts).strip()

    # If we got errors but no response, include the error message
    if not response_text and error_messages:
        response_text = f"[ERROR] {'; '.join(error_messages)}"

    return response_text, raw_events


# ─── OpenCode Runner ──────────────────────────────────────────────────────────


def run_opencode(
    task: str,
    model: str,
    extra_env: Optional[dict] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> tuple[str, float, list[dict]]:
    """Run `opencode run <task> --format json --model <model>` as subprocess.

    Args:
        task:       Task description sent to opencode.
        model:      Model identifier in provider/model format.
        extra_env:  Extra environment variables (merged with os.environ).
                    Pass {"XDG_CONFIG_HOME": tmpdir} to override config.
        timeout:    Seconds before the process is killed.

    Returns:
        (response_text, latency_ms, raw_events)

    Raises:
        RuntimeError: If the binary is missing or subprocess returns non-zero exit.
    """
    if not OPENCODE_BINARY.exists():
        raise RuntimeError(f"OpenCode binary not found: {OPENCODE_BINARY}")

    cmd = [
        str(OPENCODE_BINARY),
        "run",
        task,
        "--format",
        "json",
        "--model",
        model,
    ]

    env = {**os.environ}
    if extra_env:
        env.update(extra_env)

    start = time.perf_counter()
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(
            f"opencode run timed out after {timeout}s. "
            "Try --timeout with a larger value."
        )

    latency_ms = (time.perf_counter() - start) * 1000

    if proc.returncode != 0:
        stderr_preview = proc.stderr[:500] if proc.stderr else "(no stderr)"
        # Non-zero exit is not always fatal — parse what we got
        stdout = proc.stdout or ""
        response_text, raw_events = parse_opencode_json_stream(stdout)
        if not response_text:
            raise RuntimeError(
                f"opencode exited with code {proc.returncode}. stderr: {stderr_preview}"
            )
        return response_text, latency_ms, raw_events

    stdout = proc.stdout or ""
    response_text, raw_events = parse_opencode_json_stream(stdout)
    return response_text, latency_ms, raw_events


def run_with_mcp(
    task: str,
    model: str,
    timeout: int = DEFAULT_TIMEOUT,
) -> RunResult:
    """Run OpenCode with MCP skill-router active (normal config).

    Args:
        task:    Task description.
        model:   Model identifier.
        timeout: Seconds per run.

    Returns:
        RunResult with mcp_enabled=True.
    """
    print("  🔀 Running WITH MCP (skill-router active)...")
    try:
        response_text, latency_ms, _ = run_opencode(task, model, timeout=timeout)
        return RunResult(
            mcp_enabled=True,
            model=model,
            response_text=response_text,
            latency_ms=latency_ms,
            success=True,
        )
    except RuntimeError as e:
        return RunResult(
            mcp_enabled=True,
            model=model,
            response_text="",
            latency_ms=0.0,
            error=str(e),
            success=False,
        )


def run_without_mcp(
    task: str,
    model: str,
    timeout: int = DEFAULT_TIMEOUT,
) -> RunResult:
    """Run OpenCode with MCP skill-router disabled via temp XDG_CONFIG_HOME.

    Creates a temp config dir with skill-router.enabled=false, sets
    XDG_CONFIG_HOME to that dir, then cleans up regardless of outcome.

    Args:
        task:    Task description.
        model:   Model identifier.
        timeout: Seconds per run.

    Returns:
        RunResult with mcp_enabled=False.
    """
    print("  ⏳ Running WITHOUT MCP (skill-router disabled)...")
    config = load_opencode_config()
    tmpdir = make_no_mcp_config_dir(config)

    try:
        extra_env = {**os.environ, "XDG_CONFIG_HOME": tmpdir}
        response_text, latency_ms, _ = run_opencode(
            task, model, extra_env=extra_env, timeout=timeout
        )
        return RunResult(
            mcp_enabled=False,
            model=model,
            response_text=response_text,
            latency_ms=latency_ms,
            success=True,
        )
    except RuntimeError as e:
        return RunResult(
            mcp_enabled=False,
            model=model,
            response_text="",
            latency_ms=0.0,
            error=str(e),
            success=False,
        )
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ─── Code Quality Analysis (reused from llm_compare.py) ──────────────────────


def extract_code(response_text: str, language: str) -> Optional[str]:
    """Extract code from an LLM response.

    Search order:
      1. Language-specific fenced block: ```python ... ```
      2. Generic fenced block: ``` ... ```
      3. Whole response if it contains a top-level function keyword.

    Args:
        response_text: Raw response string.
        language:      Target language (e.g. "python").

    Returns:
        Extracted code string, or None if no code detected.
    """
    if not response_text:
        return None

    lang_lower = language.lower()
    lang_fence_start = f"```{lang_lower}"
    start_idx = response_text.lower().find(lang_fence_start)
    if start_idx != -1:
        block_start = response_text.find("\n", start_idx) + 1
        block_end = response_text.find("```", block_start)
        if block_end != -1:
            return response_text[block_start:block_end].strip()

    generic_start = response_text.find("```")
    if generic_start != -1:
        block_start = response_text.find("\n", generic_start) + 1
        block_end = response_text.find("```", block_start)
        if block_end != -1:
            return response_text[block_start:block_end].strip()

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
    complexity = 1
    for node in ast.walk(tree):
        if isinstance(node, decision_node_types):
            complexity += 1
        elif isinstance(node, ast.BoolOp):
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
    """Score maintainability 0–100 based on four weighted dimensions."""
    correctness_pts = correctness_pct * 0.40 * 100

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


def _run_single_test_case(code: str, test_case: dict, timeout: int) -> bool:
    """Execute code in a subprocess and compare stdout to expected output."""
    test_input = test_case.get("input")
    expected_output = str(test_case.get("expected_output", ""))

    runner_snippet = f"""
import sys as _sys

_input = {repr(test_input)}

import ast as _ast
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

    tmp_path = ""
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
        if tmp_path:
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

    Returns dict with: compiles, test_cases_passed, test_cases_total,
    correctness_pct, cyclomatic_complexity, has_error_handling, sloc,
    maintainability_score.
    """
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

    try:
        tree = ast.parse(code)
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

    cyclomatic_complexity = _compute_cyclomatic_complexity(tree)
    error_handling = _has_error_handling(tree)
    sloc = _count_sloc(code.splitlines())

    passed = 0
    total = len(test_cases)
    if run_tests and total > 0:
        for test_case in test_cases:
            try:
                if _run_single_test_case(code, test_case, timeout):
                    passed += 1
            except Exception:
                pass

    correctness_pct = (passed / total) if total > 0 else 1.0

    maintainability = _compute_maintainability_score(
        correctness_pct=correctness_pct,
        cyclomatic_complexity=cyclomatic_complexity,
        has_error_handling_flag=error_handling,
        sloc=sloc,
    )

    return {
        "compiles": True,
        "test_cases_passed": passed,
        "test_cases_total": total,
        "correctness_pct": correctness_pct,
        "cyclomatic_complexity": cyclomatic_complexity,
        "has_error_handling": error_handling,
        "sloc": sloc,
        "maintainability_score": maintainability,
    }


def apply_code_quality_to_result(
    result: RunResult,
    exercise: dict,
    run_code_eval: bool,
) -> None:
    """Extract code from result and compute quality metrics in-place.

    Only processes exercises with a 'coding_challenge' key.
    Only Python exercises receive quality analysis (others get None fields).

    Args:
        result:        RunResult to annotate.
        exercise:      Exercise dict (may have 'coding_challenge').
        run_code_eval: If False, skip subprocess test execution.
    """
    challenge = exercise.get("coding_challenge")
    if challenge is None:
        return

    language = challenge.get("language", "python").lower()
    test_cases = challenge.get("success_criteria", {}).get("test_cases", [])

    code = extract_code(result.response_text, language)
    result.code_generated = code

    if language != "python":
        print(f"  ℹ️  Code quality eval not supported for language: {language}")
        return

    if code is None:
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


# ─── Comparison Orchestration ─────────────────────────────────────────────────


def compare_exercise(
    exercise_data: dict,
    model: str,
    run_code_eval: bool = True,
    timeout: int = DEFAULT_TIMEOUT,
) -> ExerciseComparison:
    """Run both paths for one exercise and return a comparison dict.

    Runs WITH MCP first, then WITHOUT MCP.  Both results are annotated
    with code-quality metrics if the exercise has a coding_challenge.

    Args:
        exercise_data:  Exercise dict with at least 'name' and 'task'.
        model:          Model identifier (provider/model).
        run_code_eval:  If False, skip subprocess test execution.
        timeout:        Seconds per individual opencode run.

    Returns:
        ExerciseComparison with both RunResult objects populated.
    """
    exercise_name = exercise_data.get("name", "Unnamed")
    task = exercise_data.get("task", "")

    comparison = ExerciseComparison(
        exercise_name=exercise_name,
        task=task,
        model=model,
        timestamp=datetime.now().isoformat(),
    )

    print(f"\n▶ Exercise: {exercise_name}")
    print(f"  Task: {task[:100]}{'...' if len(task) > 100 else ''}")

    if "coding_challenge" in exercise_data:
        lang = exercise_data["coding_challenge"].get("language", "python")
        print(f"  🧪 Coding challenge detected (language: {lang})")

    # Run WITH MCP
    comparison.with_mcp = run_with_mcp(task, model, timeout=timeout)
    if comparison.with_mcp.success and "coding_challenge" in exercise_data:
        apply_code_quality_to_result(comparison.with_mcp, exercise_data, run_code_eval)

    # Run WITHOUT MCP
    comparison.without_mcp = run_without_mcp(task, model, timeout=timeout)
    if comparison.without_mcp.success and "coding_challenge" in exercise_data:
        apply_code_quality_to_result(
            comparison.without_mcp, exercise_data, run_code_eval
        )

    return comparison


# ─── Display Formatting ───────────────────────────────────────────────────────


def _has_quality_data(result: Optional[RunResult]) -> bool:
    """Return True if result has populated code-quality metrics."""
    return result is not None and result.code_compiles is not None


def print_comparison_table(comparisons: list[ExerciseComparison]) -> None:
    """Print a side-by-side console comparison for all exercises."""
    sep = "═" * 72
    thin = "─" * 55

    for comparison in comparisons:
        w = comparison.without_mcp
        m = comparison.with_mcp

        print(f"\n{sep}")
        print(f"EXERCISE: {comparison.exercise_name}")
        print(
            f"TASK: {comparison.task[:120]}"
            f"{'...' if len(comparison.task) > 120 else ''}"
        )
        print(f"MODEL: {comparison.model}")
        print(sep)

        # ── WITHOUT MCP ──
        print("\nRUN 1 — WITHOUT MCP (skill-router disabled)")
        print(thin)
        if w is None:
            print("  ⚠️  Run was skipped")
        elif not w.success:
            print(f"  ❌ Run failed: {w.error}")
        else:
            preview = w.response_text[:RESPONSE_PREVIEW_CHARS]
            ellipsis = "..." if len(w.response_text) > RESPONSE_PREVIEW_CHARS else ""
            print(
                f"\nResponse:\n  {preview.replace(chr(10), chr(10) + '  ')}{ellipsis}"
            )
            print(f"\nLatency: {w.latency_ms:.0f}ms")

        # ── WITH MCP ──
        print("\nRUN 2 — WITH MCP (skill-router active)")
        print(thin)
        if m is None:
            print("  ⚠️  Run was skipped")
        elif not m.success:
            print(f"  ❌ Run failed: {m.error}")
        else:
            preview = m.response_text[:RESPONSE_PREVIEW_CHARS]
            ellipsis = "..." if len(m.response_text) > RESPONSE_PREVIEW_CHARS else ""
            print(
                f"\nResponse:\n  {preview.replace(chr(10), chr(10) + '  ')}{ellipsis}"
            )
            print(f"\nLatency: {m.latency_ms:.0f}ms")

        # ── LATENCY COMPARISON ──
        if w and m and w.success and m.success:
            print("\nLATENCY COMPARISON")
            print(thin)
            col = 20
            delta = m.latency_ms - w.latency_ms
            sign = "+" if delta >= 0 else ""
            pct = (delta / w.latency_ms * 100) if w.latency_ms > 0 else 0

            header = f"{'Metric':<22} {'WITHOUT MCP':>{col}} {'WITH MCP':>{col}} {'Delta':>{col}}"
            print(header)
            print("─" * (22 + col * 3 + 4))
            print(
                f"{'Latency':<22} "
                f"{w.latency_ms:>{col}.0f}ms "
                f"{m.latency_ms:>{col}.0f}ms "
                f"{sign}{delta:>{col - 2}.0f}ms ({sign}{pct:.0f}%)"
            )

            # ── CODE QUALITY SECTION ──
            w_has = _has_quality_data(w)
            m_has = _has_quality_data(m)
            if w_has or m_has:
                print("\nCODE QUALITY COMPARISON")
                print(thin)

                def fmt_bool(val: Optional[bool]) -> str:
                    if val is None:
                        return "N/A"
                    return "✅ Yes" if val else "❌ No"

                def fmt_opt(val: object) -> str:
                    return "N/A" if val is None else str(val)

                rows: list[tuple[str, str, str, str]] = []

                # Compiles
                w_c = fmt_bool(w.code_compiles if w_has else None)
                m_c = fmt_bool(m.code_compiles if m_has else None)
                c_delta = "—"
                if (
                    w_has
                    and m_has
                    and w.code_compiles is not None
                    and m.code_compiles is not None
                ):
                    if w.code_compiles == m.code_compiles:
                        c_delta = "same"
                    elif m.code_compiles:
                        c_delta = "improved"
                    else:
                        c_delta = "regressed"
                rows.append(("Compiles", w_c, m_c, c_delta))

                # Test cases
                def fmt_tests(r: Optional[RunResult], has: bool) -> str:
                    if not has or r is None or r.test_cases_total is None:
                        return "N/A"
                    if r.test_cases_total == 0:
                        return "no tests"
                    pct_val = (r.correctness_pct or 0.0) * 100
                    return (
                        f"{r.test_cases_passed}/{r.test_cases_total} ({pct_val:.1f}%)"
                    )

                w_t = fmt_tests(w, w_has)
                m_t = fmt_tests(m, m_has)
                t_delta = "—"
                if (
                    w_has
                    and m_has
                    and w is not None
                    and m is not None
                    and w.correctness_pct is not None
                    and m.correctness_pct is not None
                ):
                    diff_pct = (m.correctness_pct - w.correctness_pct) * 100
                    t_sign = "+" if diff_pct >= 0 else ""
                    t_delta = f"{t_sign}{diff_pct:.1f}%"
                rows.append(("Test cases passed", w_t, m_t, t_delta))

                # Complexity
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
                    diff_cc = m.cyclomatic_complexity - w.cyclomatic_complexity
                    cc_sign = "+" if diff_cc >= 0 else ""
                    direction = (
                        " (worse)"
                        if diff_cc > 0
                        else " (better)"
                        if diff_cc < 0
                        else ""
                    )
                    cc_delta = f"{cc_sign}{diff_cc}{direction}"
                rows.append(("Cyclomatic complexity", w_cc, m_cc, cc_delta))

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
                rows.append(("Error handling", w_eh, m_eh, eh_delta))

                # Maintainability
                w_ms_str = (
                    f"{w.maintainability_score:.0f}/100"
                    if w_has and w.maintainability_score is not None
                    else None
                )
                m_ms_str = (
                    f"{m.maintainability_score:.0f}/100"
                    if m_has and m.maintainability_score is not None
                    else None
                )
                ms_delta = "—"
                if (
                    w_has
                    and m_has
                    and w.maintainability_score is not None
                    and m.maintainability_score is not None
                ):
                    diff_ms = m.maintainability_score - w.maintainability_score
                    ms_sign = "+" if diff_ms >= 0 else ""
                    ms_delta = f"{ms_sign}{diff_ms:.0f} pts"
                rows.append(
                    ("Maintainability", fmt_opt(w_ms_str), fmt_opt(m_ms_str), ms_delta)
                )

                # SLOC
                w_sloc = fmt_opt(w.sloc if w_has else None)
                m_sloc = fmt_opt(m.sloc if m_has else None)
                sloc_delta = "—"
                if w_has and m_has and w.sloc is not None and m.sloc is not None:
                    diff_sloc = m.sloc - w.sloc
                    sloc_sign = "+" if diff_sloc >= 0 else ""
                    sloc_delta = f"{sloc_sign}{diff_sloc} lines"
                rows.append(("SLOC", w_sloc, m_sloc, sloc_delta))

                header = f"{'Metric':<25} {'WITHOUT MCP':>{col}} {'WITH MCP':>{col}} {'Delta':>{col}}"
                print(header)
                print("─" * (25 + col * 3 + 3))
                for label, wval, mval, dval in rows:
                    print(f"{label:<25} {wval:>{col}} {mval:>{col}} {dval:>{col}}")

                print(thin)

                # Verdict
                if (
                    w_has
                    and m_has
                    and w.maintainability_score is not None
                    and m.maintainability_score is not None
                ):
                    if m.maintainability_score > w.maintainability_score:
                        verdict = f"WITH MCP wins ({m.maintainability_score:.0f} vs {w.maintainability_score:.0f})"
                    elif w.maintainability_score > m.maintainability_score:
                        verdict = f"WITHOUT MCP wins ({w.maintainability_score:.0f} vs {m.maintainability_score:.0f})"
                    else:
                        verdict = f"Tied ({w.maintainability_score:.0f} vs {m.maintainability_score:.0f})"
                    print(f"CODE QUALITY VERDICT: {verdict}")

        print(sep)


def print_aggregate_summary(comparisons: list[ExerciseComparison]) -> None:
    """Print aggregate summary across all exercises."""
    valid = [
        c
        for c in comparisons
        if c.with_mcp and c.without_mcp and c.with_mcp.success and c.without_mcp.success
    ]

    if not valid:
        print("\n⚠️  No successful paired comparisons to summarise.")
        return

    avg = lambda values: sum(values) / len(values) if values else 0.0

    wo_latencies = [c.without_mcp.latency_ms for c in valid]
    mcp_latencies = [c.with_mcp.latency_ms for c in valid]

    sep = "═" * 72
    print(f"\n{sep}")
    print(f"AGGREGATE SUMMARY ({len(valid)}/{len(comparisons)} exercises succeeded)")
    print(sep)

    col = 18
    avg_wo = avg(wo_latencies)
    avg_mcp = avg(mcp_latencies)
    delta_lat = avg_mcp - avg_wo
    sign = "+" if delta_lat >= 0 else ""

    print(
        f"\n{'Metric':<24} {'WITHOUT MCP':>{col}} {'WITH MCP':>{col}} {'Delta':>{col}}"
    )
    print("─" * (24 + col * 3 + 3))
    print(
        f"{'Avg latency':<24} {avg_wo:>{col}.0f}ms "
        f"{avg_mcp:>{col}.0f}ms "
        f"{sign}{delta_lat:>{col - 2}.0f}ms"
    )

    print(sep)

    # Code quality aggregate
    coding_valid = [
        c
        for c in valid
        if _has_quality_data(c.without_mcp) and _has_quality_data(c.with_mcp)
    ]

    if not coding_valid:
        return

    wo_correctness = [
        c.without_mcp.correctness_pct * 100
        for c in coding_valid
        if c.without_mcp.correctness_pct is not None
    ]
    mcp_correctness = [
        c.with_mcp.correctness_pct * 100
        for c in coding_valid
        if c.with_mcp.correctness_pct is not None
    ]

    avg_wo_correct = avg(wo_correctness)
    avg_mcp_correct = avg(mcp_correctness)
    improvement = avg_mcp_correct - avg_wo_correct
    sign = "+" if improvement >= 0 else ""

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

    print(f"\n{'CODE QUALITY AGGREGATE':}")
    print("─" * 55)
    print(f"Average correctness WITHOUT MCP: {avg_wo_correct:.1f}%")
    print(f"Average correctness WITH MCP:    {avg_mcp_correct:.1f}%")
    print(f"Quality improvement:             {sign}{improvement:.1f} percentage points")
    print(f"Exercises where WITH MCP won:    {mcp_wins}/{len(coding_valid)}")
    print(f"Exercises where WITHOUT MCP won: {wo_wins}/{len(coding_valid)}")
    print(f"Exercises tied:                  {ties}/{len(coding_valid)}")
    print(sep)


# ─── Result Serialisation ─────────────────────────────────────────────────────


def save_results(comparisons: list[ExerciseComparison], output_path: str) -> None:
    """Write comparison results to a JSON file.

    Args:
        comparisons: List of completed exercise comparisons.
        output_path: Destination file path.
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
                "with_mcp": asdict(c.with_mcp) if c.with_mcp else None,
                "without_mcp": asdict(c.without_mcp) if c.without_mcp else None,
            }
            for c in comparisons
        ],
    }

    with open(out, "w") as f:
        json.dump(payload, f, indent=2)

    print(f"\n💾 Results saved to {output_path}")


# ─── CLI Entry Point ──────────────────────────────────────────────────────────


def build_argument_parser() -> argparse.ArgumentParser:
    """Construct the CLI argument parser."""
    parser = argparse.ArgumentParser(
        description=(
            "Benchmark OpenCode WITH vs WITHOUT the MCP skill router. "
            "Runs each task twice: once with skill-router active, once disabled."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single task
  python3 benchmarks/opencode_compare.py --task "Say PONG"

  # Single exercise file
  python3 benchmarks/opencode_compare.py --exercise benchmarks/exercises/simple/exercise-1.json

  # All exercises in a tier
  python3 benchmarks/opencode_compare.py --tier simple

  # Override model
  python3 benchmarks/opencode_compare.py --tier simple --model llamacpp/qwen3-coder-next-8_0

  # Save JSON results
  python3 benchmarks/opencode_compare.py --tier simple --output results/opencode_comparison.json

  # Skip code execution (static analysis only)
  python3 benchmarks/opencode_compare.py --tier simple --no-code-eval

  # Longer timeout for large models
  python3 benchmarks/opencode_compare.py --task "..." --timeout 300
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
        default=DEFAULT_MODEL,
        help=f"Model identifier in provider/model format (default: {DEFAULT_MODEL})",
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
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        metavar="SECONDS",
        help=f"Per-run timeout in seconds (default: {DEFAULT_TIMEOUT})",
    )

    return parser


def main() -> None:
    """Parse CLI arguments, orchestrate runs, and display results."""
    # Guard: check binary exists before anything else
    if not OPENCODE_BINARY.exists():
        sys.exit(f"❌ OpenCode binary not found: {OPENCODE_BINARY}")

    parser = build_argument_parser()
    args = parser.parse_args()

    run_code_eval = not args.no_code_eval

    print(f"\n🤖 Model: {args.model}")
    print(f"⏱️  Timeout per run: {args.timeout}s")
    if not run_code_eval:
        print("⚠️  Code execution disabled (--no-code-eval)")

    # Resolve exercise list
    if args.task:
        exercises = [{"name": "Ad-hoc Task", "task": args.task}]
    elif args.exercise:
        exercises = [load_exercise_file(args.exercise)]
    else:
        exercises = load_tier_exercises(args.tier)

    print(f"\n📋 Running {len(exercises)} exercise(s) × 2 runs each...\n")

    comparisons: list[ExerciseComparison] = []

    for exercise in exercises:
        comparison = compare_exercise(
            exercise_data=exercise,
            model=args.model,
            run_code_eval=run_code_eval,
            timeout=args.timeout,
        )
        comparisons.append(comparison)

    print_comparison_table(comparisons)

    if len(comparisons) > 1:
        print_aggregate_summary(comparisons)

    if args.output:
        save_results(comparisons, args.output)


if __name__ == "__main__":
    main()
