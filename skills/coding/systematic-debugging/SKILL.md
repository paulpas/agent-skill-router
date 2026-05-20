---
name: systematic-debugging
description: Applies a structured debugging methodology (binary search, logging strategy, stack trace analysis, five whys root cause) to isolate bugs and find root causes in production and development codebases.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: systematic debugging, root cause analysis, stack trace, binary search debugging, production outage, how do i debug systematically, five whys, bug isolation
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: engineering-principles, software-error-handling, code-validation
---

# Systematic Debugging Methodology

Applies a structured, repeatable debugging methodology to isolate bugs and find root causes in software systems. When active, this skill makes the model act as a senior debug engineer — using binary search on commit history or code paths, designing targeted logging strategies, analyzing stack traces with context recovery, and drilling into root causes with the five whys technique rather than applying blind fixes.

## TL;DR Checklist

- [ ] Reproduce the issue consistently before writing any fix — no patching ghosts
- [ ] Isolate the boundary between "works" and "doesn't work" using binary search on commits or code paths
- [ ] Design logging with a clear hypothesis: what specific state variable or condition do you need to observe?
- [ ] Analyze stack traces top-down but reason bottom-up — the crash is a symptom, not the disease
- [ ] Apply five whys at least once per bug to avoid treating surface symptoms as root causes
- [ ] Verify the fix by confirming the original hypothesis was correct and no regressions were introduced
- [ ] Add regression test or automated check that would have caught this failure mode

---

## When to Use

Use this skill when:

- A bug manifests in production with intermittent failures, unclear stack traces, or no obvious reproduction path
- You need to debug a complex multi-component system (e.g., a web API with database, cache, and external service dependencies)
- A regression was introduced by a recent change and you need to find which commit caused it
- The bug involves timing issues, race conditions, or state corruption that cannot be observed through simple print statements
- You are performing postmortem analysis after a production outage and need to reconstruct the causal chain
- An issue persists despite repeated patching — each fix works temporarily but the problem returns in a different form

---

## When NOT to Use

Avoid this skill for:

- Syntax errors or type mismatches caught at compile time or by linters — these are mechanical fixes, not debugging problems
- Configuration mistakes that you can identify from documentation or error messages (e.g., wrong environment variable name)
- Known third-party library bugs where the issue has already been reported and a workaround exists upstream
- Feature requests or design improvements — this skill is for finding *what went wrong*, not deciding what to build next
- Performance issues that are obvious bottlenecks (e.g., N+1 query) — use profiling tools instead

---

## Core Workflow

1. **Reproduce and Constrain** — Establish a minimal, reproducible test case. If the bug is intermittent, collect as much environmental data as possible: OS version, library versions, input data, concurrent operations. Define what "reproduced" means with concrete criteria (e.g., "the function returns None when called with list length > 100 on Python 3.11"). **Checkpoint:** You must be able to trigger the failure deterministically within a controlled environment before proceeding.

2. **Hypothesize the Failure Domain** — List every component that could cause the observed symptom. Categorize them: is this a data issue (corrupt input, stale cache), a logic issue (wrong condition, off-by-one), a timing issue (race condition, timeout), or an infrastructure issue (resource exhaustion, network partition). Narrow to 2–3 most probable domains based on evidence, not intuition. **Checkpoint:** Each hypothesis must be falsifiable — there must exist an observation that proves it wrong.

3. **Binary Search the Suspect Space** — Apply divide-and-conquer to narrow the suspect region. For commit history: use `git bisect` with a script that checks pass/fail status. For code paths: insert or enable targeted logging at halfway points in the suspected chain to determine whether the fault lies upstream or downstream of the probe point. **Checkpoint:** Each binary search step must eliminate at least half of the remaining suspect space. If it doesn't, your probe is placed incorrectly.

4. **Instrument with Hypothesis-Driven Logging** — Add logging only for the state variables that would confirm or refute your current hypothesis. Include: the input values entering the suspected function, intermediate results at decision points, and the final output before the failure manifests. Use structured logging (JSON) with consistent field names so you can filter and aggregate later. **Checkpoint:** Every log line must answer "what did I learn from this?" — if it doesn't, remove it.

5. **Analyze the Evidence** — With reproduction data in hand, trace through the code execution path using the logged values. Compare expected state (from your mental model or test assertions) against observed state at each probe point. The divergence point is where the bug lives. Use tools: `pdb` for interactive inspection, `ipdb` for enhanced debugging with autocomplete, `rich.traceback` for formatted tracebacks. **Checkpoint:** You can now point to a specific line of code and explain exactly why its behavior differs from what it should produce.

6. **Root Cause with Five Whys** — Once you've identified the faulty line, apply the five whys technique iteratively: "Why did this fail?" → answer → "Why did that happen?" → repeat until you reach a cause that is actionable and fixable at the system level. Stop when further whys lead to human error or external factors outside your control. **Checkpoint:** The final "why" must point to a change in the code, configuration, or architecture — not "the developer made a mistake."

7. **Apply Fix and Verify** — Implement the minimal change that addresses the root cause (not the symptom). Run the reproduction test case to confirm it passes. Then run the full regression suite. If adding a new regression test is feasible, write one that exercises this exact failure mode. **Checkpoint:** The reproduction case that was failing in step 1 must now pass consistently.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Binary Search Debugging (git bisect Automation)

Automated binary search through commit history to find the exact commit that introduced a regression. This is the fastest method when you have a reliable pass/fail test.

```python
#!/usr/bin/env python3
"""
Automated git bisect driver for systematic debugging.

Wraps `git bisect` with a Python test runner that can execute
any test function and return pass/fail status to the bisect process.

Usage:
    python3 bisect_driver.py --test "tests/test_regression_1234" \
        --start HEAD~50 --end HEAD~40
"""

import subprocess
import sys
from pathlib import Path
from typing import Protocol


class TestRunner(Protocol):
    """Interface for executing a test and reporting pass/fail status."""

    def run(self) -> bool:
        """Run the test. Returns True if the test passes, False otherwise."""
        ...


class SubprocessTestRunner:
    """Runs pytest or any CLI test command via subprocess."""

    def __init__(self, command: list[str], timeout: int = 120) -> None:
        """Initialize with a test command and optional timeout in seconds.

        Args:
            command: The full command to execute as a list of strings.
                     Example: ["pytest", "tests/test_regression.py::test_bug_1234"]
            timeout: Maximum seconds before the process is killed (default: 120).
        """
        self._command = command
        self._timeout = timeout

    def run(self) -> bool:
        """Execute the test command and return pass/fail status.

        Returns:
            True if the test exited with code 0 (pass), False otherwise.
        """
        result = subprocess.run(
            self._command,
            capture_output=True,
            text=True,
            timeout=self._timeout,
        )
        return result.returncode == 0


def bisect_commits(
    test_runner: TestRunner,
    start_ref: str,
    end_ref: str,
) -> str:
    """Run git bisect to find the commit that introduced a regression.

    This function orchestrates the entire bisect session: initializes
    the range, runs the test at each midpoint, and returns the
    offending commit hash when complete.

    Args:
        test_runner: Object implementing TestRunner protocol with run() method.
        start_ref: The older commit to start bisecting from (known good).
                   Example: "v1.2.0" or "HEAD~50"
        end_ref: The newer commit to bisect up to (known bad).
                 Example: "HEAD" or "feature-branch"

    Returns:
        The full 40-character SHA hash of the first bad commit.

    Raises:
        subprocess.TimeoutExpired: If any single bisect step exceeds timeout.
        RuntimeError: If no binary search is possible (fewer than 2 commits).
    """
    # Validate we have enough commits to bisect
    range_result = subprocess.run(
        ["git", "rev-list", "--count", f"{start_ref}..{end_ref}"],
        capture_output=True,
        text=True,
        check=True,
    )
    commit_count = int(range_result.stdout.strip())
    if commit_count < 2:
        raise RuntimeError(
            f"Not enough commits to bisect: only {commit_count} between "
            f"{start_ref} and {end_ref}"
        )

    # Initialize bisect session
    subprocess.run(["git", "bisect", "start"], check=True, capture_output=True)
    subprocess.run(
        ["git", "bisect", "bad", end_ref], check=True, capture_output=True
    )
    subprocess.run(
        ["git", "bisect", "good", start_ref], check=True, capture_output=True
    )

    # Run bisect — git itself calls the test script at each midpoint
    # We use a shell callback that runs our Python test runner
    bisect_script = Path("/tmp/bisect_test.sh")
    bisect_script.write_text(
        "#!/bin/bash\n"
        'python3 -c "\\n'\
        'import subprocess, sys\\n'\
        f'result = subprocess.run(sys.argv[1:], capture_output=True)\\n'\
        "sys.exit(0 if result.returncode == 0 else 1)\\n'\n"
        f'{" ".join(test_runner._command)}"\n'
    )
    bisect_script.chmod(0o755)

    bisect_result = subprocess.run(
        ["git", "bisect", "run", str(bisect_script)],
        capture_output=True,
        text=True,
        timeout=3600,  # Bisect can take a while across many commits
    )

    # Clean up and extract the result
    bisect_script.unlink(missing_ok=True)

    if "is the first bad commit" in bisect_result.stdout:
        # Extract the hash from git's output
        for line in bisect_result.stdout.splitlines():
            if "is the first bad commit" in line:
                commit_hash = line.split()[0]
                subprocess.run(["git", "bisect", "reset"], capture_output=True)
                return commit_hash

    # Something went wrong — leave bisect session open for manual inspection
    raise RuntimeError(
        "Bisect failed. Session left open for manual inspection.\n"
        f"Output: {bisect_result.stdout}\n"
        f"Errors: {bisect_result.stderr}"
    )


# ❌ BAD — Blind guessing through commits one at a time
def bad_approach() -> None:
    """Manually checking out commits one-by-one is slow and error-prone.
    
    If there are 100 commits between good and bad, you need up to 100 test runs.
    Binary search reduces this to ~7 test runs (log2(100)).
    """
    for ref in ["HEAD~5", "HEAD~4", "HEAD~3", "HEAD~2", "HEAD~1"]:
        subprocess.run(["git", "checkout", ref], capture_output=True)
        # Run tests manually... takes forever


# ✅ GOOD — Binary search via git bisect (logarithmic complexity)
def good_approach() -> None:
    """Automated binary search finds the bad commit in O(log n) steps.
    
    Example usage with a pytest-based test runner:
    """
    runner = SubprocessTestRunner(
        command=["pytest", "tests/test_regression_1234.py::test_bug_manifests"],
        timeout=60,
    )

    try:
        bad_commit = bisect_commits(
            test_runner=runner,
            start_ref="v1.5.0",  # Last known good release
            end_ref="HEAD",       # Current tip (known bad)
        )
        print(f"Regression introduced in commit: {bad_commit}")
    except RuntimeError as exc:
        print(f"Bisect could not complete: {exc}", file=sys.stderr)


if __name__ == "__main__":
    good_approach()
```

### Pattern 2: Hypothesis-Driven Logging Strategy

Structured logging that tests specific hypotheses about failure state rather than dumping every variable. Each log statement encodes a question the developer wants answered.

```python
#!/usr/bin/env python3
"""
Hypothesis-driven structured logger for systematic debugging.

Instead of sprinkling print statements everywhere, this pattern requires
each log line to encode an explicit hypothesis about what state should be
present when the bug does NOT manifest, and what state causes it to fail.

Based on the principle: every log entry should answer "what did I learn?"
If a log line doesn't help narrow the suspect space, it's noise.
"""

import json
import logging
import time
import traceback
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any


class Severity(Enum):
    """Logging severity levels with explicit debugging semantics."""
    HYPOTHESIS = "HYP"       # Testing a specific theory about the bug
    OBSERVATION = "OBS"      # Noting unexpected state encountered during investigation
    MILESTONE = "MLS"         # A decision point in the execution path
    FAILURE = "FRG"           # The failure was confirmed at this point
    CORRECTION = "CRN"        # State was corrected (e.g., retry succeeded)


@dataclass(frozen=True)
class DebugFrame:
    """A single structured logging frame that captures debugging context.

    Attributes:
        severity: Classification of what this log entry represents.
        hypothesis: What you're testing — only set for HYPOTHESIS entries.
                    Example: "expected cache hit but got miss because key expired"
        observed: What you actually saw at this point in execution.
        expected: What you thought should have happened, before seeing the bug.
        stack_depth: Call depth from entry point — helps reconstruct execution path.
        elapsed_ms: Milliseconds since the debugging session started.
    """
    severity: Severity
    message: str
    hypothesis: str = ""
    observed: dict[str, Any] = field(default_factory=dict)
    expected: dict[str, Any] = field(default_factory=dict)
    stack_depth: int = 0
    elapsed_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        """Serialize the frame to a flat dictionary for JSON logging."""
        data = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "severity": self.severity.value,
            "message": self.message,
            "hypothesis": self.hypothesis,
            "observed": _truncate_dict(self.observed, max_depth=2),
            "expected": _truncate_dict(self.expected, max_depth=2),
            "stack_depth": self.stack_depth,
            "elapsed_ms": round(self.elapsed_ms, 1),
        }
        # Omit empty hypothesis field for cleanliness
        if not data["hypothesis"]:
            del data["hypothesis"]
        return data


def _truncate_dict(
    d: dict[str, Any],
    *,
    max_depth: int = 2,
    max_key_len: int = 60,
) -> dict[str, Any]:
    """Recursively truncate a dictionary to avoid massive log lines.

    Strings longer than 100 characters are truncated with '...' appended.
    Nested dicts beyond max_depth are replaced with {'...': '<truncated>'}.
    Key names longer than max_key_len are truncated.

    Args:
        d: Dictionary to truncate.
        max_depth: Maximum nesting depth to include (default: 2).
        max_key_len: Maximum key name length before truncation.

    Returns:
        A copy of the dictionary with oversized values and deep nesting trimmed.
    """
    if max_depth <= 0 or not isinstance(d, dict):
        return {"...": "<truncated>"}

    result = {}
    for k, v in d.items():
        safe_key = str(k)[:max_key_len]
        if isinstance(v, dict):
            result[safe_key] = _truncate_dict(v, max_depth=max_depth - 1)
        elif isinstance(v, str) and len(v) > 100:
            result[safe_key] = v[:100] + "..."
        else:
            result[safe_key] = v
    return result


class HypothesisLogger:
    """Structured logger designed for systematic debugging sessions.

    Every log entry is tagged with a severity that encodes what role
    it plays in the investigation. HYPOTHESIS entries must include both
    what was expected and what was observed — this enables post-hoc
    filtering to find exactly where reality diverged from expectations.

    Usage:
        logger = HypothesisLogger("my-debug-session")
        logger.log(
            severity=Severity.HYPOTHESIS,
            message="Cache should have the user data",
            expected={"cache_hit": True, "ttl_remaining": 300},
            observed={"cache_hit": False, "key_exists": True, "value_expired": True},
        )
    """

    def __init__(self, session_id: str) -> None:
        """Initialize a debugging logging session.

        Args:
            session_id: Unique identifier for this debugging investigation.
                        Use bug ticket number or feature name + date.
        """
        self._session_id = session_id
        self._start_time = time.monotonic()
        self._logger = logging.getLogger(f"debug.{session_id}")
        self._logger.setLevel(logging.DEBUG)

        if not self._logger.handlers:
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(logging.Formatter("%(message)s"))
            self._logger.addHandler(handler)

    def _now_ms(self) -> float:
        """Return milliseconds elapsed since this session started."""
        return (time.monotonic() - self._start_time) * 1000

    def log(
        self,
        severity: Severity,
        message: str,
        *,
        hypothesis: str = "",
        observed: dict[str, Any] | None = None,
        expected: dict[str, Any] | None = None,
        stack_depth: int = 0,
    ) -> None:
        """Log a debugging frame with structured context.

        This is the core method — every investigation entry goes through here.
        The severity field determines what role this entry plays in narrowing
        the suspect space.

        Args:
            severity: Classification (HYPOTHESIS, OBSERVATION, etc.).
            message: Human-readable summary of what's happening.
            hypothesis: What you're testing — set for HYPOTHESIS entries only.
            observed: Actual state values at this point in execution.
            expected: What you believed should have been the state.
            stack_depth: Nesting depth from the function entry point.
        """
        frame = DebugFrame(
            severity=severity,
            message=message,
            hypothesis=hypothesis,
            observed=observed or {},
            expected=expected or {},
            stack_depth=stack_depth,
            elapsed_ms=self._now_ms(),
        )

        # Format as JSON for structured parsing; also print readable version
        json_output = json.dumps(frame.to_dict())
        self._logger.info(f"[{self._session_id}] {json_output}")

    def log_failure(
        self,
        message: str,
        observed: dict[str, Any],
        expected: dict[str, Any] | None = None,
        exc: Exception | None = None,
    ) -> None:
        """Log a confirmed failure with exception context.

        Convenience method for logging the moment the bug manifests.
        Automatically includes traceback if an exception is provided.

        Args:
            message: Description of what failed.
            observed: The actual (broken) state that caused the failure.
            expected: What should have happened instead.
            exc: The caught exception, if any.
        """
        self.log(
            severity=Severity.FAILURE,
            message=message,
            observed={**observed},
            expected=expected or {},
        )

        if exc is not None:
            tb_str = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
            self.log(
                severity=Severity.OBSERVATION,
                message="Exception traceback",
                observed={"traceback": tb_str[:500] + ("..." if len(tb_str) > 500 else "")},
            )

    def log_correction(self, message: str, result: dict[str, Any]) -> None:
        """Log when a correction was applied and its effect.

        Args:
            message: What correction was attempted (e.g., "retried connection").
            result: The state after the correction was applied.
        """
        self.log(
            severity=Severity.CORRECTION,
            message=message,
            observed=result,
        )


def debug_cached_user_lookup(session_id: str = "user-lookup-bug") -> dict[str, Any] | None:
    """Simulated user lookup that demonstrates hypothesis-driven debugging.

    This function searches a cache first, then falls back to database lookup.
    The bug is: sometimes the cache reports a hit but returns stale data.

    When debugging this with HypothesisLogger, you would log at each step
    to test whether the problem is in the cache read, the freshness check,
    or the database query result.

    Args:
        session_id: Identifier for this debugging session.

    Returns:
        The user data dict if found, None otherwise.
    """
    logger = HypothesisLogger(session_id)

    # Hypothesis 1: Cache miss — let's verify what actually happened
    cache_result = _get_from_cache("user_123")

    logger.log(
        severity=Severity.HYPOTHESIS,
        message="Checking if cache returned valid data",
        hypothesis="Cache should return user data or be empty",
        observed={"cache_hit": cache_result is not None, "cache_key": "user_123"},
        expected={"cache_hit": True, "cache_key": "user_123"},
    )

    if cache_result:
        # Hypothesis 2: Cache hit but data might be stale — verify freshness
        is_stale = _is_data_stale(cache_result)

        logger.log(
            severity=Severity.HYPOTHESIS,
            message="Verifying cached data freshness",
            hypothesis="Cached data should not be older than 5 minutes",
            observed={"is_stale": is_stale, "cache_age_seconds": cache_result.get("age")},
            expected={"is_stale": False},
        )

        if is_stale:
            logger.log(
                severity=Severity.FAILURE,
                message="Cache returned stale data — this is the bug",
                observed={"cached_value": cache_result, "max_age_seconds": 300},
                expected={"cached_value": "<fresh user data>", "is_stale": False},
            )

        return cache_result if not is_stale else _get_from_database("user_123")

    # Cache miss — fall back to database
    db_result = _get_from_database("user_123")
    logger.log(
        severity=Severity.MILESTONE,
        message="Cache miss — falling back to database lookup",
        observed={"db_query_time_ms": 45},
    )
    return db_result


# --- Simulated backend operations (these are the real targets of debugging) ---

def _get_from_cache(key: str) -> dict[str, Any] | None:
    """Simulate a cache lookup that sometimes returns stale data."""
    # In a real system, this would query Redis/Memcached
    return {"user_id": 123, "name": "Alice", "age": 30, "email": "alice@example.com"}


def _is_data_stale(data: dict[str, Any]) -> bool:
    """Check if cached data is older than the freshness threshold."""
    # In a real system, this would check cache TTL or last-updated timestamp
    return True  # Simulates the bug: cache returns stale data as "fresh"


def _get_from_database(user_id: str) -> dict[str, Any] | None:
    """Simulate a database lookup."""
    return {"user_id": 123, "name": "Alice Smith", "age": 31, "email": "alice@newdomain.com"}
```

### Pattern 3: Stack Trace Analysis with Context Recovery

Systematic analysis of stack traces that goes beyond reading the error message to reconstruct the execution context that led to the crash. This pattern turns a raw traceback into an investigation roadmap.

```python
#!/usr/bin/env python3
"""
Stack trace analyzer and context recovery tool for systematic debugging.

When a bug crashes in production, the stack trace is your first clue —
but it's incomplete. This pattern shows how to extract maximum diagnostic
information from a traceback by reconstructing local variables, call
arguments, and execution state at each frame.
"""

import inspect
import sys
import traceback
from dataclasses import dataclass, field
from typing import Any


@dataclass
class StackFrameInfo:
    """Reconstructed information about a single frame in the call stack.

    Attributes:
        filename: Source file where this frame was executing.
        line_number: Line number of the instruction that caused execution here.
        function_name: Name of the function containing this frame.
        local_variables: Snapshot of local variables at the time of the frame.
        call_args: The arguments with which this function was called.
    """
        filename: str
        line_number: int
        function_name: str
        local_variables: dict[str, Any] = field(default_factory=dict)
        call_args: dict[str, Any] = field(default_factory=dict)

    def summary(self) -> str:
        """Return a one-line summary of this frame.

        Returns:
            Formatted string suitable for log output or reports.
            Example: "users.py:42 in process_user — args={user_id=123, mode='fast'}"
        """
        args_str = ", ".join(f"{k}={v!r}" for k, v in self.call_args.items())
        return f"{self.filename}:{self.line_number} in {self.function_name}({args_str})"


def extract_stack_context(
    exc: Exception,
    max_frames: int = 10,
) -> list[StackFrameInfo]:
    """Extract detailed context from an exception's traceback.

    Walks the traceback chain and captures local variables and call
    arguments at each frame (up to max_frames). This is significantly
    more informative than just printing the traceback because it
    preserves the state that led to the failure.

    Args:
        exc: The exception whose traceback to analyze.
        max_frames: Maximum number of frames to capture from the bottom up.

    Returns:
        List of StackFrameInfo objects ordered from innermost (where crash happened)
        to outermost (entry point). Empty list if no traceback available.
    """
    frames: list[StackFrameInfo] = []
    tb = exc.__traceback__

    while tb is not None and len(frames) < max_frames:
        frame = tb.tb_frame
        code = frame.f_code

        # Capture local variables (excluding private/dunder attributes)
        local_vars = {
            k: v for k, v in frame.f_locals.items()
            if not k.startswith("_")
        }

        # Extract call arguments from the function signature
        call_args: dict[str, Any] = {}
        try:
            sig = inspect.signature(code.co_filename + code.co_name)  # Approximation
            param_names = list(frame.f_code.co_varnames[:frame.f_code.co_argcount])
            for name in param_names:
                if name in frame.f_locals and not name.startswith("self"):
                    call_args[name] = frame.f_locals[name]
        except (ValueError, TypeError):
            # Some built-ins don't have inspectable signatures
            pass

        frames.append(StackFrameInfo(
            filename=code.co_filename,
            line_number=tb.tb_lineno,
            function_name=code.co_name,
            local_variables=local_vars,
            call_args=call_args,
        ))

        tb = tb.tb_next

    # Reverse to get innermost-first ordering (where crash happened → entry)
    frames.reverse()
    return frames


def analyze_stack_trace(exc: Exception) -> str:
    """Produce a human-readable analysis of an exception's stack trace.

    This is the main diagnostic output — it formats the traceback,
    highlights where variables diverged from expected state, and
    provides a structured view that's faster to scan than the raw
    Python traceback.

    Args:
        exc: The exception to analyze.

    Returns:
        A formatted multi-line string containing the full analysis.
    """
    lines: list[str] = []
    lines.append("=" * 72)
    lines.append("STACK TRACE ANALYSIS")
    lines.append("=" * 72)
    lines.append(f"Exception type: {type(exc).__name__}")
    lines.append(f"Exception message: {exc!s}")
    lines.append("")

    # Raw traceback for reference
    raw_tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    lines.append("RAW TRACEBACK:")
    lines.append(raw_tb)
    lines.append("")

    # Structured frame analysis
    frames = extract_stack_context(exc)
    if not frames:
        lines.append("No traceback frames available.")
        return "\n".join(lines)

    lines.append(f"CAPTURED {len(frames)} FRAMES (innermost → outermost):")
    lines.append("-" * 72)

    for i, frame in enumerate(frames, start=1):
        lines.append(f"\nFrame {i}: {frame.summary()}")

        if frame.local_variables:
            lines.append("  Local variables:")
            for k, v in list(frame.local_variables.items())[:8]:  # Limit to 8 vars
                lines.append(f"    {k} = {v!r}")
            if len(frame.local_variables) > 8:
                lines.append(f"    ... ({len(frame.local_variables) - 8} more variables)")

        if frame.call_args:
            lines.append("  Call arguments:")
            for k, v in frame.call_args.items():
                lines.append(f"    {k} = {v!r}")

    lines.append("")
    lines.append("=" * 72)

    # Root cause hint based on the innermost frame
    if frames:
        innermost = frames[0]
        lines.append(f"ROOT CAUSE HINT: Check the variables in {innermost.function_name}()")
        lines.append(f"at {innermost.filename}:{innermost.line_number}.")

    return "\n".join(lines)


# Demonstration with realistic production error patterns

class DataValidationError(Exception):
    """Raised when input data fails validation checks."""
    pass


class ConnectionTimeoutError(Exception):
    """Raised when a network operation exceeds its time budget."""
    def __init__(self, endpoint: str, timeout_seconds: float) -> None:
        self.endpoint = endpoint
        self.timeout_seconds = timeout_seconds
        super().__init__(f"Connection to {endpoint} timed out after {timeout_seconds}s")


def process_payment_order(order_id: str, amount_cents: int, card_token: str) -> dict[str, Any]:
    """Process a payment order — simulates a realistic production function.

    Args:
        order_id: Unique identifier for the order being processed.
        amount_cents: Order amount in cents (integer, no floating point).
        card_token: Encrypted payment token from the payment gateway.

    Returns:
        dict with keys: status, transaction_id, amount_charged

    Raises:
        DataValidationError: If input data fails validation.
        ConnectionTimeoutError: If the payment gateway is unreachable.
    """
    # Validation layer
    if not order_id or len(order_id) < 8:
        raise DataValidationError(f"Invalid order_id: {order_id!r} — must be >= 8 chars")

    if amount_cents <= 0 or amount_cents > 10_000_000:
        raise DataValidationError(
            f"Invalid amount: {amount_cents} cents — "
            f"must be between 1 and 10,000,000"
        )

    if not card_token or len(card_token) < 32:
        raise DataValidationError("Card token too short or missing")

    # Simulate gateway call that might time out
    try:
        _charge_card(card_token, amount_cents)
    except ConnectionTimeoutError as exc:
        # This is a common production pattern: timeout → log context → re-raise with wrapper
        exc_analysis = analyze_stack_trace(exc)
        # In production, you'd send exc_analysis to your error tracking system (Sentry, etc.)
        raise RuntimeError(
            f"Payment processing failed for order {order_id}: {exc}"
        ) from exc

    return {
        "status": "completed",
        "transaction_id": f"txn_{order_id[:8]}",
        "amount_charged": amount_cents,
    }


def _charge_card(card_token: str, amount_cents: int) -> None:
    """Simulate charging a card via payment gateway."""
    # In production: actual HTTP call to Stripe/PayPal/etc.
    import random
    if random.random() < 0.3:  # Simulated 30% timeout rate
        raise ConnectionTimeoutError(endpoint="https://api.payment-gateway.com/charge", timeout_seconds=5.0)


def demonstrate_stack_analysis() -> None:
    """Demonstrate stack trace analysis with a realistic failure scenario."""
    try:
        process_payment_order(
            order_id="ord",  # Too short — triggers DataValidationError
            amount_cents=-100,
            card_token="short",
        )
    except Exception as exc:
        print(analyze_stack_trace(exc))


if __name__ == "__main__":
    demonstrate_stack_analysis()
```

---

## Five Whys Root Cause Analysis

A structured technique for drilling past symptoms to find the underlying cause. Not a coding pattern per se, but a thinking framework you apply alongside code analysis.

### How It Works

Start with the observed failure and ask "why did this happen?" repeatedly — each answer becomes the premise of the next question. Stop when you reach a cause that is fixable in code or architecture.

### Example Walkthrough: Production Data Loss

```
Problem:  User's order data disappeared after the nightly sync job ran.

Why #1:  The sync job overwrote the user's recent changes with stale data from the source system.
         → Root: Sync job uses a read-only copy of source data that was last updated 48h ago.

Why #2:  The source data copy is refreshed only on a 48-hour schedule, not in real time.
         → Root: The replication pipeline has a hardcoded 48h interval (config.py:L42).

Why #3:  No monitoring alert fires when the replication lag exceeds 6 hours.
         → Root: Alert thresholds are set to "critical only at 72h lag" — too late for any action.

Why #4:  The alerting configuration was last updated two years ago and never revisited.
         → Root: No ownership or review process exists for monitoring configurations.

WHY STOP HERE: The actionable fix is:
  1. Reduce replication interval to 6 hours (code change in config.py:L42)
  2. Lower alert threshold to 6 hours lag (monitoring change)
  3. Add monitoring config to the deployment review checklist (process change)

Further whys would lead to "who owns the pipeline" or "why was the review process not created" —
those are management/organizational questions, not code-level fixes.
```

### When Five Whys Fails

```
❌ BAD: Stop after one or two whys and call it root cause analysis.
    → This just finds the immediate cause, not the root cause.
    → You'll fix symptoms forever without solving the underlying problem.

❌ BAD: Go beyond organizational causes (e.g., "because humans make mistakes").
    → Not actionable in code or architecture. Stop when you reach a fixable layer.

✅ GOOD: Use five whys to bridge from "the code crashed" to "the retry policy 
         doesn't handle transient network failures," then implement a circuit breaker.
```

---

## Constraints

### MUST DO
- Always reproduce the issue in a controlled environment before attempting any fix — patching without reproduction is guessing, not debugging
- Use binary search (git bisect or code-path probing) to narrow the suspect space before adding extensive logging
- Design each log statement with a specific hypothesis: write down what you expect to see and what would surprise you
- Trace stack traces from the innermost frame outward — the crash location is where the program died, not necessarily where it went wrong
- Apply five whys at least once per bug investigation to avoid mistaking symptoms for root causes
- Write a regression test that exercises the exact failure condition discovered during debugging
- Preserve and timestamp all investigation data (logs, stack traces, reproduction scripts) for postmortem review

### MUST NOT DO
- Add print statements or logging everywhere without a specific question in mind — unstructured log dumps waste time and obscure signal
- Fix the error message instead of the root cause — silencing an exception is hiding the bug, not solving it
- Skip reproduction — if you can't reliably trigger the failure, any "fix" you apply is unverifiable
- Trust the first hypothesis that comes to mind — actively seek evidence that could disprove it (falsification bias)
- Modify production data directly to "test" a fix — always use staging or isolated environments for debugging changes
- Assume timing issues are race conditions without measuring — most so-called "race conditions" are actually timeout misconfigurations or missing retry logic
- Leave investigation code (debug-only branches, temporary workarounds) in the final commit

---

## Output Template

When applying this skill to a bug report or issue description, produce the following:

1. **Issue Summary** — One-sentence restatement of the observed failure, including what was expected vs. what actually happened
2. **Reproduction Status** — Whether the issue can be reproduced deterministically; if not, describe the conditions under which it occurs and data collection strategy
3. **Hypotheses** — List 2–3 falsifiable hypotheses ranked by probability, each with: (a) the component it points to, (b) what evidence would confirm it, (c) what evidence would disprove it
4. **Binary Search Plan** — If applicable, describe the binary search strategy (which commits or code paths to probe and in what order)
5. **Logging Strategy** — Specify exactly which log statements to add, what they test, and what output is expected at each point
6. **Stack Trace Analysis** — If an exception was raised, provide frame-by-frame analysis with local variable context
7. **Root Cause Determination** — After evidence collection, state the root cause found via five whys analysis, including all intermediate causes
8. **Fix Description** — The minimal code change that addresses the root cause (not just the symptom)
9. **Verification Plan** — How to confirm the fix works: reproduction test pass/fail criteria and regression suite results

---

## Related Skills

| Skill | Purpose |
|---|---|
| `engineering-principles` | Use when the bug reveals deeper architectural violations (SOLID, DRY) — the root cause may be design debt requiring refactoring, not a one-line fix |
| `software-error-handling` | Use when designing better error propagation and recovery strategies to prevent similar bugs from becoming production incidents |
| `code-validation` | Use when the bug was caused by missing input validation — adding structured validation at boundaries prevents this class of failures |

> **Reciprocity:** These related skills should reference `systematic-debugging` in their `metadata.related-skills` fields to ensure bidirectional discovery.
