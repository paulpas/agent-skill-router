---




name: debugging-methodology
description: Applies systematic debugging methodologies (binary search, rubber ducking, log analysis, bisect tools) to rapidly identify root causes of bugs in production and development environments.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: debugging, root cause analysis, binary search debugging, bisect, rubber ducking, stack trace analysis, log debugging, production debug
  archetypes:
  - tactical
  - diagnostic
  anti_triggers:
  - brainstorming
  - vague ideation
  - feature development
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: systematic-debugging, incident-response, sre-engineering




---





# Systematic Debugging Methodology

Implements a structured, repeatable debugging methodology to rapidly identify and resolve software bugs. When loaded, this skill makes the model act as a senior debug engineer — reproducing failures deterministically, formulating testable hypotheses, isolating fault domains through binary search on code or commits, verifying with minimal failing tests, and delivering fixes backed by regression guards. This skill complements the broader systematic-debugging methodology by providing concrete implementation patterns, debugging utility code, and anti-pattern awareness for hands-on bug resolution.

## TL;DR Checklist

- [ ] Reproduce the bug with a deterministic, minimal test case before touching any code
- [ ] Formulate at least 2 competing hypotheses based on stack traces, logs, or recent changes
- [ ] Isolate the fault domain using binary search (bisection) on commits, functions, or data paths
- [ ] Write the smallest failing test that isolates the bug — a unit test if possible, integration test as fallback
- [ ] Verify the fix resolves the original symptom AND the root cause, not just one of them
- [ ] Add a regression test and confirm no existing tests regressed
- [ ] Document what you found so the next engineer debugging a similar issue has a head start

---

## When to Use

Use this skill when:

- A bug manifests in production or staging and needs structured root cause analysis
- You are staring at a stack trace, log file, or crash dump and need a systematic approach
- Random code changes are not working — you need a methodical isolation strategy
- A regression appeared after recent commits and you need to find which one broke things
- Multiple developers have tried fixing a bug without success because they treated symptoms, not root causes
- You are on-call and need to diagnose a production issue quickly with minimal disruption

---

## When NOT to Use

Avoid this skill for:

- Simple typos or syntax errors — a quick compile or lint check is faster than full methodology
- Feature development or refactoring tasks that are not bug-related (use `refactoring-techniques` instead)
- Architecture-level design problems that require strategic planning (use `system-design-fundamentals` instead)
- Situations where you have already found and verified the root cause — just write the fix
- Performance tuning without a confirmed bug first (use `performance-optimization` for profiling-based approaches)

---

## Core Debugging Workflow

1. **Reproduce the Bug** — Build a deterministic reproduction case. It must fail consistently, not intermittently. Start with the simplest possible input that triggers the failure. If it is intermittent, narrow down by reducing concurrency, fixing seed values, or replaying captured inputs.
   **Checkpoint:** Can someone else run the same reproduction and see the same failure within 5 minutes? If no, the reproduction is not yet deterministic enough.

2. **Formulate Hypotheses** — Based on stack traces, logs, error messages, git blame for recent changes, and your understanding of the system, generate at least 2 competing explanations for the bug. Rank them by: (a) how well they explain all observed symptoms, (b) how recently changed or fragile the hypothesized code path is.
   **Checkpoint:** Each hypothesis must be falsifiable — there must be a clear test that would prove it wrong.

3. **Isolate the Fault Domain** — Use binary search to narrow the search space. Options include: git bisect for commit-level isolation, commenting out/redirecting code paths for structural isolation, or narrowing input data until you find the boundary between "works" and "doesn't work". The goal is to reduce the candidate code region from thousands of lines to a handful.
   **Checkpoint:** After each bisection step, document what passed and what failed. The failing half is your new search space; keep bisecting until you hit a single function or even a single line.

4. **Verify with Minimal Test** — Write the smallest possible test that reproduces the bug in isolation. Prefer unit tests (no network, no DB, no filesystem) but accept integration tests when the bug is inherently cross-boundary. The test should fail before your fix and pass after it.
   **Checkpoint:** Does removing just one line of the fix cause the test to fail again? If not, the test might not be tightly coupled to the bug.

5. **Fix and Validate** — Apply the minimal change that resolves the root cause. Do not refactor unrelated code during a debug session — defer cleanups to a separate pass. Run the full test suite. Add the regression test from step 4 permanently. If this is a production fix, consider adding enhanced logging or metrics around the fix location for future recurrence detection.
   **Checkpoint:** Full test suite passes, no new warnings from linters/type-checkers, and the reproduction case you built in step 1 now passes.

---

## Debugging Techniques Reference

### Binary Search / Bisection Debugging

Binary search on code or commits is the single most effective technique for large codebases. It reduces O(n) search to O(log n).

**Git Bisect Pattern:**
```bash
# Start bisection from current bad commit back to known good commit
git bisect start
git bisect bad HEAD
git bisect good v2.3.0    # known good tag/commit

# Git checks out a midpoint; test and mark:
git bisect run python -m pytest tests/test_payment.py -x
# or manually:
git bisect good  # if that commit works
git bisect bad   # if that commit is broken
```

**Code-Level Bisection:**
- For structural isolation, use a decision tree approach: identify the entry point and systematically disable branches of execution.
- In interpreted languages (Python, JavaScript), wrap suspect code blocks in `try/except` or conditional guards to confirm which block contains the fault.
- In compiled languages, use strategic `assert` statements at key decision points to verify assumptions about state.

**Key principle:** Each bisection step must be a clean test with a clear pass/fail outcome. Ambiguous results mean your test is not isolating cleanly enough.

### Rubber Duck / Walkthrough Debugging

Narrate the logic flow of the code line by line, as if explaining it to someone who knows nothing about the system. This forces you to slow down and often reveals the bug during explanation.

**How to execute:**
1. Identify the code path from entry point to the failure.
2. Narrate each statement's expected behavior out loud or in writing.
3. At each step, ask: "If x is true here, what must y be?"
4. When you find a mismatch between expected and actual state, you've found the bug.

**Why it works:** The act of articulating logic exposes gaps in mental models. Studies show rubber duck debugging catches ~40% of bugs on first pass because it forces systematic thinking over pattern-matching intuition.

**When it fails:** Complex systems with many asynchronous interactions. In these cases, supplement with log analysis and stack trace inspection rather than relying on walkthrough alone.

### Log Analysis Patterns

Effective logging is the difference between debugging blind and debugging informed. Structured logs enable correlation across distributed systems; unstructured logs become noise at scale.

**Structured Logging Strategy:**
```python
import logging
from typing import Any, Dict, Optional
import uuid

# Configure structured logger for a debug session
def setup_debug_logger(name: str, level: int = logging.DEBUG) -> logging.Logger:
    """Set up a structured logger with JSON-capable output.
    
    Args:
        name: Logger name, typically the module or function name
        level: Logging verbosity level (DEBUG for active debugging)
    
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setLevel(level)
        formatter = logging.Formatter(
            '{"time": "%(asctime)s", "level": "%(levelname)s", '
            '"name": "%(name)s", "message": "%(message)s"}',
            datefmt="%Y-%m-%dT%H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


def debug_session_trace(func_name: str, context: Optional[Dict[str, Any]] = None) -> str:
    """Generate a unique trace ID for correlating logs within a debug session.
    
    Args:
        func_name: Name of the function being traced
        context: Optional dictionary of relevant state to log
    
    Returns:
        A trace_id string usable across log lines and distributed systems
    """
    trace_id = f"{func_name}:{uuid.uuid4().hex[:8]}"
    
    if context:
        logger = logging.getLogger("debug-trace")
        logger.info(f"[{trace_id}] entering with context={context}")
    
    return trace_id


def log_state_change(trace_id: str, label: str, before: Any, after: Any) -> None:
    """Log a state transition with before/after values for diff-style debugging.
    
    Args:
        trace_id: Debug session trace identifier
        label: Human-readable description of what changed
        before: State value before the change
        after: State value after the change
    """
    if before == after:
        logging.getLogger("debug-trace").debug(
            f"[{trace_id}] {label}: unchanged (before={before})"
        )
    else:
        logging.getLogger("debug-trace").info(
            f"[{trace_id}] {label}: changed from {before!r} to {after!r}"
        )
```

**Log Correlation Patterns:**
- Include a `trace_id` in every log line for requests that flow through multiple services or functions.
- Log state at function boundaries (entry/exit) with inputs and outputs — this is cheaper than instrumenting every internal path.
- Use distinct log levels: DEBUG for hypothesis testing, INFO for important transitions, WARNING for unexpected-but-recoverable conditions, ERROR for failures.

### Stack Trace Analysis

Stack traces are the map of how a program reached its failure state. Reading them correctly separates symptoms from root causes.

**Reading Strategy (bottom-up reasoning):**
1. **Entry point:** The top frame shows where the exception was raised or caught. This is almost always the symptom, not the cause.
2. **Call chain:** Work down through each frame to trace how control reached the failure point. Note which modules crossed boundaries (your code → library code).
3. **The root cause:** Look for frames within your own code where incorrect state or an unhandled edge case triggered the exception deeper in the call stack.
4. **Context recovery:** Examine local variables and arguments at each frame — these are snapshots of state that may reveal invariant violations.

**Key distinction:** The line number in a stack trace shows where the crash happened, not why it happened. A `NullPointerException` in a deep utility function might be caused by bad input data several stack frames above.

### Print/Debug Statement Strategy

Temporary debug statements are useful but dangerous — they can mask bugs, add noise, and leave stale output after fixes. Use them strategically:

**When to use print-based debugging:**
- Quick investigation in a local environment where you don't want to set up full logging infrastructure
- Exploring library or framework internals that you cannot instrument directly
- Verifying a hypothesis before committing to permanent logging changes
- Situations where the debugger (pdb, breakpoint) is impractical (e.g., multiprocessing, certain cloud environments)

**When NOT to use:**
- In production code — always use proper structured logging instead
- For anything that might need to be revisited later — if it's worth printing, it's worth making a proper log statement
- When you have more than 3–5 debug statements in a file — if debugging requires that many print statements, the code is too complex to reason about incrementally and needs refactoring

**Safe temporary debugging pattern:**
```python
import os
import functools

# Use an environment variable to gate debug prints
DEBUG_PRINT = os.environ.get("DEBUG_PRINT", "0") == "1"

def debug_print(label: str, *args: Any) -> None:
    """Conditional print gated by DEBUG_PRINT environment variable.
    
    Args:
        label: Label prefix for the debug output
        *args: Values to print, converted via repr()
    
    Usage: DEBUG_PRINT=1 python my_script.py
    """
    if DEBUG_PRINT:
        values = ", ".join(repr(a) for a in args)
        print(f"[DEBUG:{label}] {values}", flush=True)

# Then use throughout code:
# debug_print("payment", transaction_id, amount, currency)
```

### Core Dump / Crash Analysis

Core dumps and crash reports capture the complete process state at the moment of failure. They are invaluable for debugging non-reproducible or hard-to-trace crashes.

**When to use core dump analysis:**
- Segmentation faults or bus errors (C/Rust/Native extensions)
- Deadlocks that only manifest under specific timing conditions in production
- Memory corruption bugs (heap overflow, use-after-free) that are unreproducible in test environments
- Kernel panics or OOM kills where process-level debugging was not instrumented

**Basic patterns for Python:**
```python
import faulthandler
import signal
import sys

def enable_crash_dumps(output_path: str = "/tmp/core") -> None:
    """Enable Python crash dump generation for debugging segfaults.
    
    This enables faulthandler to write tracebacks on fatal signals,
    which helps debug C extension crashes that produce no Python traceback.
    
    Args:
        output_path: Directory or file path for writing trace dumps
    """
    # Write crash traceback to stderr (or redirect to file in production)
    faulthandler.enable()
    
    # Also handle SIGUSR1 manually — useful for triggering dump on demand
    def handle_sigusr1(signum, frame):
        faulthandler.dump_traceback(file=open(output_path, "a"), all_threads=True)
        sys.stdout.flush()

    signal.signal(signal.SIGUSR1, handle_sigusr1)


def enable_assertion_traps() -> None:
    """Configure Python to fail fast on assertion violations and common bugs.
    
    Enables faulthandler for C-level crashes, sets PYTHONFAULTHANDLER,
    and activates all warnings as errors for caught exceptions.
    """
    import os
    
    # Ensure faulthandler is active even for segfaults from extensions
    if not os.environ.get("PYTHONFAULTHANDLER"):
        os.environ["PYTHONFAULTHANDLER"] = "1"
    
    faulthandler.enable()
```

---

## Implementation Patterns

### Pattern 1: Assertion-Based Debugging Helper

Use assertions to catch invariant violations early, turning silent bugs into loud failures. This is the foundation of fail-fast debugging.

```python
from typing import Any, Optional, TypeVar
import traceback

T = TypeVar("T")


class AssertError(AssertionError):
    """Custom assertion error with rich context for debugging."""
    
    def __init__(self, message: str, context: Optional[dict[str, Any]] = None) -> None:
        self.context = context or {}
        super().__init__(message)


def debug_assert(
    condition: bool,
    message: str,
    **context: Any
) -> None:
    """Raise a descriptive assertion error with captured context when condition fails.
    
    This is the primary debugging helper — it turns invariant violations
    into detailed failure reports that include the values of relevant variables.
    
    Args:
        condition: The condition that must be true for correct operation
        message: Human-readable description of what went wrong
        **context: Keyword arguments whose values are included in the error report
    
    Raises:
        AssertError: If condition is False, with full context attached
    
    Example:
        >>> debug_assert(x > 0, "balance must be positive", x=balance)
        # Raises: AssertError: balance must be positive {x: -5}
    """
    if not condition:
        ctx_str = ", ".join(f"{k}={v!r}" for k, v in context.items())
        full_message = f"{message} {{{ctx_str}}}"
        
        raise AssertError(full_message, context=context)


def trace_function(
    func_name: str,
    expected_state: Optional[dict[str, Any]] = None,
    should_return_type: Optional[type] = None
) -> dict[str, Any]:
    """Generate a function entry/exit trace point for debugging.
    
    Call this at the start and end of functions to build a call graph
    with state snapshots. Useful for understanding execution flow.
    
    Args:
        func_name: Name of the function being traced
        expected_state: Dict of variable names to their expected values at entry
        should_return_type: If set, asserts return type matches on exit
    
    Returns:
        A dict with trace metadata including timestamp and function name
    """
    import time
    
    entry = {
        "func": func_name,
        "event": "entry",
        "time": time.time(),
        "expected_state": expected_state,
    }
    
    if expected_state:
        for key, expected in expected_state.items():
            # Note: in real code, you'd pass the actual values to check
            # This is a template pattern — use it as a guide
            debug_assert(
                True,  # Placeholder — replace with actual checks
                f"State invariant at {func_name} entry for '{key}'",
                key=key,
                expected=expected,
            )
    
    return entry


# ❌ BAD: Silent failures — bug hides until it causes downstream damage
def process_payment(amount: float, balance: float) -> bool:
    if amount > balance:  # Bug: should be amount <= balance, but no error raised
        print("Insufficient funds")  # Silent failure — caller may not check return value
        return False
    return True


# ✅ GOOD: Explicit invariants fail fast with full context
def process_payment_safe(amount: float, balance: float) -> dict[str, Any]:
    """Process a payment with explicit invariant checks.
    
    Each operation is guarded by debug_assert so that if an invariant
    is violated, we know exactly which one and what state was observed.
    """
    debug_assert(amount >= 0, "payment amount must be non-negative", amount=amount)
    debug_assert(balance >= 0, "balance must be non-negative before transaction", balance=balance)
    debug_assert(isinstance(amount, float), "amount must be a float", type_amount=type(amount))
    
    if amount > balance:
        debug_assert(False, "insufficient funds — invariant broken by caller logic",
                      amount=amount, balance=balance, deficit=amount - balance)
    
    return {"success": True, "new_balance": balance - amount, "charged": amount}
```

### Pattern 2: Git-Bisect-Style Test Runner

Automate the binary search over commits when a regression appeared. This turns manual bisecting into a repeatable process.

```python
import subprocess
import shutil
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Optional


class BisectResult(Enum):
    """Possible outcomes of a bisect test step."""
    GOOD = "good"
    BAD = "bad"
    SKIP = "skip"  # Test cannot run in this commit state


@dataclass
class BisectReport:
    """Report from a completed bisect operation."""
    bad_commit: str
    good_commit: str
    first_bad_commit: str
    first_bad_message: str
    test_command: str
    total_steps: int
    
    def summary(self) -> str:
        """Return human-readable summary of the bisect results."""
        return (
            f"Regression introduced in commit {self.first_bad_commit}:\n"
            f"  Message: {self.first_bad_message}\n"
            f"  Between: {self.good_commit} (good) and {self.bad_commit} (bad)\n"
            f"  Test command: {self.test_command}\n"
            f"  Bisection steps taken: {self.total_steps}"
        )


def run_bisect(
    test_command: str,
    good_tag: str,
    bad_ref: str = "HEAD",
    workdir: str = ".",
) -> BisectReport:
    """Execute a git bisect binary search to find the commit that introduced a regression.
    
    This wraps `git bisect run` with proper error handling and report generation.
    
    Args:
        test_command: Shell command to run for each bisect step (must return 0 for pass, non-zero for fail)
        good_tag: Tag or commit hash known to be before the regression
        bad_ref: Commit or ref where the bug is present (default: HEAD)
        workdir: Git repository working directory
    
    Returns:
        BisectReport with details of the first bad commit found
    
    Raises:
        RuntimeError: If bisect fails (no regression found, test too flaky, etc.)
    
    Example:
        >>> report = run_bisect(
        ...     test_command="python -m pytest tests/test_payment.py -x",
        ...     good_tag="v2.0.0",
        ...     bad_ref="HEAD"
        ... )
        >>> print(report.summary())
    """
    bisect_log: list[str] = []
    
    try:
        # Start bisect session
        _git_cmd(["bisect", "start"], workdir)
        _git_cmd(["bisect", "bad", bad_ref], workdir)
        _git_cmd(["bisect", "good", good_tag], workdir)
        
        # Run automated bisect with test command
        result = subprocess.run(
            ["git", "bisect", "run", *test_command.split()],
            cwd=workdir,
            capture_output=True,
            text=True,
            timeout=3600,  # 1 hour max — long bisections can take time
        )
        
        bisect_log.append(result.stdout)
        if result.stderr:
            bisect_log.append(result.stderr)
        
    except subprocess.TimeoutExpired:
        _git_cmd(["bisect", "reset"], workdir)
        raise RuntimeError(
            f"Bisect timed out after 1 hour. Test command may be too slow or flaky:\n"
            f"  Command: {test_command}"
        )
    except subprocess.CalledProcessError as e:
        # Bisect run can return non-zero if the first bad commit is HEAD
        # or if no good commit was found — this is a valid outcome
        bisect_log.append(f"Bisect exited with code {e.returncode}: {e.stderr}")
    finally:
        # Always reset bisect state after completion
        try:
            _git_cmd(["bisect", "reset"], workdir)
        except Exception:
            pass  # Bisect may already be in a clean state
    
    # Extract first bad commit from git bisect log
    log_result = _git_cmd(["bisect", "log"], workdir)
    first_bad = _extract_first_bad_from_log(log_result, bad_ref, good_tag)
    
    return BisectReport(
        bad_commit=bad_ref,
        good_commit=good_tag,
        first_bad_commit=first_bad.commit if first_bad else "unknown",
        first_bad_message=first_bad.message if first_bad else "",
        test_command=test_command,
        total_steps=_count_bisect_steps(log_result),
    )


def _git_cmd(args: list[str], cwd: str = ".") -> str:
    """Execute a git command and return stdout.
    
    Args:
        args: Command arguments (without 'git' prefix)
        cwd: Working directory
    
    Returns:
        Stdout from the git command
    """
    result = subprocess.run(
        ["git"] + args,
        cwd=cwd,
        capture_output=True,
        text=True,
        check=False,  # We handle non-zero exit codes ourselves
    )
    
    if result.stderr and "error:" in result.stderr:
        raise RuntimeError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    
    return result.stdout


def _extract_first_bad_from_log(log_output: str, bad_ref: str, good_tag: str) -> Optional[dict]:
    """Parse git bisect log to find the first bad commit.
    
    The bisect log contains entries like:
        # first bad: <commit> <message>
    
    Args:
        log_output: Raw output from `git bisect log`
        bad_ref: Reference for the known bad commit
        good_tag: Tag for the known good commit
    
    Returns:
        Dict with 'commit' and 'message' keys, or None if parsing fails
    """
    for line in log_output.strip().splitlines():
        if line.startswith("# first bad commit:"):
            parts = line.split(":", 1)[1].strip().split(None, 1)
            if len(parts) >= 2:
                return {"commit": parts[0], "message": parts[1]}
    
    return None


def _count_bisect_steps(log_output: str) -> int:
    """Count the number of bisection steps taken.
    
    Each `# good:` or `# bad:` line represents one step.
    We exclude the initial markers (good tag and bad ref).
    
    Args:
        log_output: Raw output from `git bisect log`
    
    Returns:
        Number of bisection steps taken
    """
    lines = [l for l in log_output.strip().splitlines() if l.startswith("# ")]
    # Subtract 2 for the initial good/bad markers, add 1 for the final result line
    return max(0, len(lines) - 3)
```

### Pattern 3: Stack Trace Parser Utility

Parse raw stack traces to extract function names, file locations, and identify the most likely root cause location.

```python
from dataclasses import dataclass
import re
from typing import Optional


@dataclass
class StackFrame:
    """Represents a single frame in a stack trace."""
    function: str
    file: Optional[str] = None
    line_number: Optional[int] = None
    module: Optional[str] = None
    
    @property
    def location(self) -> str:
        """Return human-readable location string.
        
        Examples:
            - "app/payments/process.py:42"
            - "lib/http/client.py" (no line number available)
        """
        if self.line_number and self.file:
            return f"{self.file}:{self.line_number}"
        elif self.file:
            return str(self.file)
        return self.function


@dataclass
class ParsedStackTrace:
    """Complete parsed stack trace with metadata."""
    frames: list[StackFrame]
    exception_type: Optional[str] = None
    exception_message: Optional[str] = None
    
    @property
    def entry_point(self) -> StackFrame:
        """The topmost frame — where the exception was raised or caught.
        
        This is usually the symptom, not the root cause.
        """
        return self.frames[0] if self.frames else StackFrame(function="<unknown>")
    
    @property
    def likely_root_cause(self) -> StackFrame:
        """The most likely root cause location.
        
        Strategy: Find the deepest frame within user code (not standard library
        or framework code). This is where incorrect state was first introduced.
        """
        user_frames = [f for f in reversed(self.frames) if not self._is_system_module(f)]
        return user_frames[0] if user_frames else self.entry_point
    
    def _is_system_module(self, frame: StackFrame) -> bool:
        """Determine if a frame belongs to the standard library or framework.
        
        Args:
            frame: Stack frame to check
        
        Returns:
            True if this frame is in system/framework code, False for user code
        """
        if not frame.file:
            return False
        system_indicators = [
            "/usr/lib", "/usr/local/lib", "/site-packages/", "lib/python",
            "<frozen", "<string>", "<stdin>", "/framework/", "/vendor/"
        ]
        return any(indicator in frame.file for indicator in system_indicators)
    
    def summary(self, max_depth: int = 10) -> str:
        """Return a formatted summary of the stack trace.
        
        Args:
            max_depth: Maximum number of frames to show (from bottom/root cause up)
        
        Returns:
            Human-readable stack trace summary
        """
        lines: list[str] = []
        
        if self.exception_type:
            lines.append(f"{self.exception_type}: {self.exception_message}")
        
        # Show from root cause upward for readability
        user_frames = [f for f in reversed(self.frames) if not self._is_system_module(f)]
        for frame in user_frames[-max_depth:]:
            location = frame.location
            lines.append(f"  -> {frame.function} at {location}")
        
        return "\n".join(lines)


def parse_stack_trace(
    raw_trace: str,
    language: str = "python"
) -> ParsedStackTrace:
    """Parse a raw stack trace string into structured frame data.
    
    Supports Python traceback format. Extensible for other languages.
    
    Args:
        raw_trace: The full text of a stack trace from an exception or log
        language: Programming language of the trace (default: "python")
    
    Returns:
        ParsedStackTrace with typed frames and exception metadata
    
    Raises:
        ValueError: If the trace cannot be parsed in the specified format
    
    Example:
        >>> trace = '''Traceback (most recent call last):
        ...   File "app/main.py", line 15, in handle_request
        ...     process(data)
        ...   File "app/process.py", line 42, in process
        ...     value = int(raw_input)
        ... ValueError: invalid literal for int() with base 10: 'abc'
        ... '''
        >>> parsed = parse_stack_trace(trace)
        >>> print(parsed.likely_root_cause.function)
        process
    """
    if language != "python":
        raise ValueError(f"Stack trace parsing for '{language}' is not implemented yet")
    
    frames: list[StackFrame] = []
    exception_type: Optional[str] = None
    exception_message: Optional[str] = None
    
    # Extract exception line (last line of the trace)
    last_line = raw_trace.strip().splitlines()[-1] if raw_trace.strip() else ""
    
    exc_match = re.match(r"^(\w+Error): (.+)$", last_line)
    if exc_match:
        exception_type = exc_match.group(1)
        exception_message = exc_match.group(2)
    
    # Parse frame lines: "  File \"path\", line N, in function"
    frame_pattern = re.compile(
        r'^\s+File "(?P<file>[^"]+)", line (?P<line>\d+), in (?P<function>\S+)'
    )
    
    for line in raw_trace.splitlines():
        match = frame_pattern.match(line)
        if match:
            frames.append(StackFrame(
                function=match.group("function"),
                file=match.group("file"),
                line_number=int(match.group("line")),
            ))
    
    return ParsedStackTrace(
        frames=frames,
        exception_type=exception_type,
        exception_message=exception_message,
    )
```

### Pattern 4: Debug Hypothesis Tracker

Maintain a structured record of debugging hypotheses as you explore. This prevents tunnel vision and ensures you evaluate competing explanations.

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class Hypothesis:
    """A testable explanation for a bug."""
    id: int
    description: str
    confidence: float  # 0.0 to 1.0
    evidence_for: list[str] = field(default_factory=list)
    evidence_against: list[str] = field(default_factory=list)
    tests_run: list[dict[str, str]] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"  # active | confirmed | rejected
    
    def test(self, description: str, result: str, evidence: str) -> None:
        """Record the result of a test against this hypothesis.
        
        Args:
            description: What test was performed
            result: "passed", "failed", or "inconclusive"
            evidence: Key finding from the test
        """
        self.tests_run.append({
            "test": description,
            "result": result,
            "evidence": evidence,
        })
        
        # Update confidence based on result
        if result == "failed":
            # Test passed (hypothesis was supported) — increase confidence
            self.confidence = min(1.0, self.confidence + 0.15)
            self.evidence_for.append(evidence)
        elif result == "passed" and not evidence:
            # Test failed (hypothesis contradicted) — decrease confidence
            self.confidence = max(0.0, self.confidence - 0.2)
            self.evidence_against.append(evidence or "Test showed hypothesis is wrong")
    
    def verdict(self) -> str:
        """Return the current verdict on this hypothesis."""
        if self.confidence >= 0.8:
            return "CONFIRMED"
        elif self.confidence <= 0.2:
            return "REJECTED"
        else:
            return "NEUTRAL"


class DebugHypothesisTracker:
    """Track and manage competing debugging hypotheses during a session.
    
    This prevents the common pitfall of pursuing a single hypothesis to exhaustion
    while ignoring equally plausible alternatives. It enforces structured evaluation
    and provides visibility into which hypotheses have been tested and what was found.
    
    Usage:
        tracker = DebugHypothesisTracker("Payment processing timeout bug")
        
        h1 = tracker.add(
            description="Database connection pool is exhausted under load",
            confidence=0.7,
            evidence_for=["Timeout occurs only after 50+ concurrent requests"]
        )
        
        h2 = tracker.add(
            description="Third-party API response time exceeded our timeout threshold",
            confidence=0.3,
            evidence_for=[]
        )
        
        # Test h1
        result = run_concurrency_test(max_concurrent=50)
        h1.test("Concurrency test at 50 concurrent requests", 
                "failed" if result.timeout else "passed",
                f"Timeout observed: {result.timeout}")
    
    Attributes:
        bug_description: What bug is being investigated
        hypotheses: List of active and resolved hypotheses
    """
    
    def __init__(self, bug_description: str) -> None:
        """Initialize the hypothesis tracker.
        
        Args:
            bug_description: Brief description of the bug under investigation
        """
        self.bug_description = bug_description
        self.hypotheses: list[Hypothesis] = []
        self._next_id = 1
    
    def add(
        self,
        description: str,
        confidence: float = 0.5,
        evidence_for: Optional[list[str]] = None,
    ) -> Hypothesis:
        """Add a new competing hypothesis to the investigation.
        
        Args:
            description: Clear statement of what this hypothesis claims caused the bug
            confidence: Initial confidence score (0.0–1.0) based on available evidence
            evidence_for: List of observations supporting this hypothesis
        
        Returns:
            The created Hypothesis object for further testing
        """
        hypothesis = Hypothesis(
            id=self._next_id,
            description=description,
            confidence=min(1.0, max(0.0, confidence)),
            evidence_for=evidence_for or [],
        )
        self.hypotheses.append(hypothesis)
        self._next_id += 1
        return hypothesis
    
    def best_hypothesis(self) -> Optional[Hypothesis]:
        """Return the highest-confidence hypothesis that is not yet resolved.
        
        Returns:
            The most promising unconfirmed hypothesis, or None if all are resolved
        """
        active = [h for h in self.hypotheses if h.status == "active"]
        if not active:
            return None
        return max(active, key=lambda h: h.confidence)
    
    def summary(self) -> str:
        """Return a human-readable summary of all hypotheses and their status.
        
        Returns:
            Formatted text suitable for printing or logging
        """
        lines = [f"Debug Investigation: {self.bug_description}", ""]
        
        for h in self.hypotheses:
            verdict = h.verdict()
            confidence_bar = f"{h.confidence:.0%}"
            lines.append(f"  #{h.id} [{confidence_bar}] {h.description}")
            lines.append(f"    Status: {verdict}")
            if h.evidence_for:
                for ev in h.evidence_for:
                    lines.append(f"    + {ev}")
            if h.evidence_against:
                for ev in h.evidence_against:
                    lines.append(f"    - {ev}")
            if h.tests_run:
                lines.append(f"    Tests: {len(h.tests_run)}")
            lines.append("")
        
        best = self.best_hypothesis()
        if best:
            lines.append(f"> Focusing on hypothesis #{best.id} ({best.verdict()})")
        else:
            lines.append("> All hypotheses resolved. Review evidence.")
        
        return "\n".join(lines)


# ❌ BAD: No hypothesis tracking — developers chase symptoms randomly
def debug_without_methodology():
    """Random debugging approach that wastes time and misses root causes."""
    # Developer 1 thinks it's a DB issue, adds more logging around queries
    print("Added query logging...")
    # Still broken, so they restart the server
    print("Restarted server...")
    # Bug reappears, now they think it's network-related
    print("Checking DNS resolution...")
    # Eventually "fix" it by catching the exception and ignoring it
    try:
        process_request()
    except Exception:
        pass  # Silent failure — bug still exists!


# ✅ GOOD: Structured hypothesis tracking with evidence-based evaluation
def debug_with_methodology(bug_report: str) -> DebugHypothesisTracker:
    """Debug using structured hypothesis tracking.
    
    This function demonstrates the full workflow: create hypotheses,
    test them, and converge on the root cause through evidence.
    
    Args:
        bug_report: Description of the observed bug
    
    Returns:
        The hypothesis tracker with all findings recorded
    """
    tracker = DebugHypothesisTracker(bug_report)
    
    # Add competing hypotheses based on initial observations
    h1 = tracker.add(
        description="Database connection pool exhaustion under load",
        confidence=0.6,
        evidence_for=["Timeouts correlate with high request volume",
                       "Connection pool metrics show near-max utilization"],
    )
    
    h2 = tracker.add(
        description="Third-party API latency exceeding our timeout threshold",
        confidence=0.4,
        evidence_for=[],
    )
    
    h3 = tracker.add(
        description="Memory leak causing GC pressure and request stalls",
        confidence=0.2,
        evidence_for=["CPU spikes coincide with timeout windows"],
    )
    
    # Each hypothesis is tested systematically — results update confidence
    # The highest-confidence hypothesis becomes the investigation focus
    
    return tracker
```

---

## Common Debugging Anti-Patterns

| Anti-Pattern | Why It's Wrong | What to Do Instead |
|---|---|---|
| **Guessing and spraying code** | Random changes don't build understanding. You might accidentally "fix" a symptom while creating a new bug elsewhere, and you'll have no idea why it changed. | Formulate a hypothesis, then design a test that isolates whether your hypothesis is correct before making any changes. |
| **Fixing symptoms instead of root causes** | When you address only the visible error (e.g., adding a null check where a value should never have been null), the underlying bug remains and will manifest elsewhere in unpredictable ways. | Follow the call chain from symptom back to cause. The null pointer exists because some earlier code didn't initialize it — fix that initialization, not the dereference. |
| **Skipping reproduction** | You cannot verify your fix is correct if you cannot reliably observe the failure. "It works now" is not evidence of correctness without a deterministic test. | Build a minimal reproducible case before writing any fix. This test becomes your regression guard. |
| **Debugging in production directly** | Production environments have hidden complexity (data volume, concurrency, external dependencies) that makes isolation extremely difficult and risky. | Reproduce the bug in staging or locally with captured production data if needed. Production should be used only for final validation. |
| **Abandoning a bisection halfway** | Stopping at commit 5 of an expected 10-step bisect wastes all progress. You lose the benefit of systematic narrowing and return to guessing. | Commit to completing the bisection. Each step halves the search space — stopping early means you gain no structural insight. |
| **Using print statements as permanent debugging** | Stale debug output degrades log readability, may leak sensitive data, and gets left behind after fixes are deployed. | Convert any print statement that survived a fix into a proper structured log call with appropriate log level. Remove it if the fix makes it unnecessary. |
| **Assuming the first explanation is correct** | Confirmation bias causes you to selectively interpret evidence in favor of your initial hypothesis while dismissing contradictory data. | Write down at least 2 competing hypotheses before testing any. Actively try to falsify each one rather than confirm it. |
| **Changing multiple things simultaneously** | If you modify three files at once and the bug disappears, you have no idea which change fixed it. This is the debugging equivalent of a double-blind trial without blinding. | Change one thing at a time. Each isolated change must be verified independently before proceeding to the next. |

---

## Constraints

### MUST DO
- Always reproduce the bug with a deterministic test case before attempting any fix
- Formulate at least 2 competing hypotheses and attempt to falsify each one
- Use binary search (bisect) on code or commits whenever the fault domain exceeds ~100 lines
- Write the smallest failing test that isolates the bug — unit test preferred, integration test acceptable as fallback
- Apply the minimal change that fixes the root cause without refactoring unrelated code during the debug session
- Run the full test suite after any fix and confirm no regressions were introduced
- Add a regression test (unit or integration) that would have caught this failure mode before it reached production

### MUST NOT DO
- Change more than one variable, function, or file at a time — if multiple changes are needed, verify each independently
- Apply fixes based on intuition alone without a reproducible test case to confirm the fix works
- Leave temporary debug print statements in code that reaches production — convert them to structured logging or remove them entirely
- Assume the top of a stack trace is the root cause — reason bottom-up from the deepest frame within your code
- Skip bisection because "I'll just look at the recent commits manually" — manual review scales linearly with changes, binary search scales logarithmically
- Bypass or disable error handling to "see what happens next" — this corrupts the system state and produces misleading debugging data
- Confuse a workaround for a fix — if the code still enters an invalid state (even if handled), the bug is not fixed

---

## Related Skills

| Skill | Purpose |
|---|---|
| `systematic-debugging` | Broader methodology framework covering five whys, root cause analysis, and structured problem decomposition |
| `incident-response` | Production incident management — service restoration and postmortem coordination when debugging a live outage |
| `sre-engineering` | Site reliability practices for production debugging at scale (SLO monitoring, error budgets, chaos engineering) |
| `performance-optimization` | Profiling-based diagnosis for performance-related bugs where systematic debugging identifies the hot path |
| `refactoring-techniques` | When debugging reveals structural issues in the code that need cleanup after the immediate bug is fixed |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Python faulthandler — Crash dump generation](https://docs.python.org/3/library/faulthandler.html)
- [Git Bisect Documentation](https://git-scm.com/docs/git-bisect)
- [Debugging: The 9 Indispensable Rules for Finding Even Elusive Bugs (David Agans)](https://www.amazon.com/gp/product/0596005524)
- [The Art of Debugging with GDB, DDD, and XDB (Tony Lawrence)](https://www.artofdebugging.com/)
- [Google SRE Book — Debugging](https://sre.google/sre-book/debugging/)
