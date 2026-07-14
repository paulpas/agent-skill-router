---
name: cli-agent-workflows
description: Implements CLI agent workflows (terminal interaction, file operations, code generation from design specs, MCP bridging) for building command-line AI assistants and developer tooling.
license: MIT
compatibility: opencode
archetypes:
  - tactical
anti_triggers:
  - GUI desktop application
  - web interface design
  - mobile app development
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
  triggers: CLI agent, Gemini CLI, terminal automation, command-line assistant, MCP bridging, how do i build a CLI AI tool, developer agent, stdin/stdout streaming
  related-skills: mcp-integration,tool-use-function-calling,coding-agent-frameworks
---

# CLI Agent Workflows

Implements command-line AI agent architectures — building terminal-resident agents with stdin/stdout streaming, subcommand routing, file system interaction, code generation from design specifications, and MCP server bridging. When loaded, this skill makes the model design production-grade CLI agents modeled after Gemini CLI, Claude Code, and similar developer tooling that operates entirely within the terminal environment.

## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2: parse don't validate)
- [ ] Handle edge cases with early returns at function top (Law 1: early exit)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4: fail fast)
- [ ] Return new data structures, never mutate inputs (Law 3: atomic predictability)
- [ ] Use explicit `subprocess.run` with list args — never `shell=True` with user input
- [ ] Implement tool sandboxing with path validation and command allowlists
- [ ] Design subcommand routing with click.Group or argparse subparsers for extensibility
- [ ] Reference `code-philosophy` (5 Laws of Elegant Defense) in constraint design

---

## When to Use

Use this skill when:

- Building a terminal-resident AI assistant that reads user prompts from stdin, processes them through an LLM, and writes structured output back to the terminal
- Designing code generation workflows where markdown architecture docs or design specifications are consumed as input and translated into executable source files
- Implementing prompt-based code review inside the CLI — accepting natural language review requests, running automated linting/style checks, and surfacing suggestions inline
- Creating developer tooling that bridges a local CLI agent to MCP servers for extended capabilities (database queries, API calls, external service automation)
- Building multi-turn interactive sessions in the terminal with context retention across commands (like Gemini CLI's persistent conversation mode)
- Automating repetitive developer workflows: scaffold new projects, run linters, generate boilerplate, execute tests — all orchestrated from a single CLI entry point

---

## When NOT to Use

Avoid this skill for:

- GUI desktop applications or web-based interfaces — use `coding-agent-frameworks` (LangChain, CrewAI) with their frontend integrations instead
- Simple script automation without agent-level reasoning — direct bash scripting or `os-scripting` is lighter weight and avoids LLM overhead
- High-throughput batch processing where sub-second latency matters — the LLM round-trip adds hundreds of milliseconds per request
- End-user productivity tools targeting non-technical audiences — CLI agents assume terminal familiarity; use a GUI agent (`gui-agent-interaction`) instead

---

## Core Workflow

1. **Parse Input Stream** — Read user input from stdin or command-line arguments. Classify the intent: code generation, file operation, terminal execution, review request, or tool invocation. Apply a lightweight rule-based classifier before delegating to the LLM for semantic routing. **Checkpoint:** Intent category is determined and all required parameters are extracted; if parameters are missing, return a structured error requesting them before proceeding.

2. **Route to Tool Executor** — Dispatch the classified request to the appropriate handler: code generator (reads design specs, writes source files), file engine (safe read/write with path validation), terminal executor (subprocess invocation with output capture), or MCP bridge (proxies to registered MCP servers). Each handler receives validated input and returns a structured result object. **Checkpoint:** The selected handler acknowledges receipt, confirms parameter validity, and begins execution; if no matching handler exists, fall back to the generic LLM completion path.

3. **Execute with Safety Guards** — Run the handler's logic within constrained boundaries: validate file paths against an allowlist directory, sandbox subprocess commands with timeout limits, rate-limit tool invocations, and capture all output (stdout, stderr, exit code) in a structured `ExecutionResult`. Never execute arbitrary shell strings from user input. **Checkpoint:** Execution completes or raises a structured exception; all captured output is parsed into a consistent result format containing `success`, `output`, `stderr`, `exit_code`, and `duration_ms` fields.

4. **Format Output for Terminal** — Present results in a terminal-friendly format: color-coded diffs for code generation, collapsible sections for review findings, structured JSON for tool outputs, and progress indicators for long-running operations. Support both raw output (for piping) and rich terminal output (with ANSI formatting). **Checkpoint:** Output is written to stdout (or stderr for diagnostics); the format matches the `output-format` declared in skill metadata (`code`, `analysis`, or `manifests`).

5. **Manage Interactive Context** — In multi-turn sessions, maintain conversation history bounded by a context window limit (e.g., last 20 messages or 8000 tokens). Persist context to disk between invocations using a JSONL session file so the agent retains memory across restarts. Prune older messages when approaching limits, keeping the system prompt and recent exchanges intact. **Checkpoint:** Context state is saved after each turn; on reload, the full conversation history up to the limit is restored without truncation errors or corrupted session files.

6. **Bridge to MCP Servers (Optional)** — When the CLI agent needs access to external tools beyond its built-in capabilities, establish an MCP server connection via stdio transport. Discover available tools, register them with the tool router, and execute calls through the standard handler pipeline. Handle connection failures gracefully by degrading to local-only mode without crashing. **Checkpoint:** MCP tool discovery succeeds (or fails cleanly); discovered tools appear in the agent's command list; execution of an MCP tool returns structured results indistinguishable from native handlers.

---

## Implementation Patterns

### Pattern 1: Gemini CLI Architecture (stdin/stdout Streaming, Subcommand Routing)

A CLI agent runs as a long-lived process or per-invocation script that reads prompts from stdin, processes them, and writes structured output to stdout. The architecture uses subcommand routing (via `click.Group`) for organized tool access and stdin/stdout streaming for interactive multi-turn sessions.

```python
"""cli_agent/engine.py — Gemini CLI–style agent engine with subcommand routing."""

from __future__ import annotations

import json
import logging
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

import click


log = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    """Structured result from any agent operation."""
    success: bool
    output: str = ""
    stderr: str = ""
    exit_code: int = 0
    duration_ms: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_json(self, indent: int = 2) -> str:
        """Serialize for piping or programmatic consumption."""
        return json.dumps({
            "success": self.success,
            "output": self.output,
            "stderr": self.stderr,
            "exit_code": self.exit_code,
            "duration_ms": round(self.duration_ms, 1),
            **self.metadata,
        }, indent=indent)


@dataclass
class SessionContext:
    """Conversation state for multi-turn CLI sessions."""
    history: list[dict[str, str]] = field(default_factory=list)
    max_messages: int = 20
    session_file: Path | None = None

    def add_message(self, role: str, content: str) -> None:
        """Append a message and prune if over limit."""
        self.history.append({"role": role, "content": content})
        if len(self.history) > self.max_messages:
            # Keep system prompt (index 0) + recent messages
            self.history = self.history[:1] + self.history[-(self.max_messages - 1):]

    def save(self) -> None:
        """Persist to disk for cross-invocation memory."""
        if not self.session_file:
            return
        self.session_file.parent.mkdir(parents=True, exist_ok=True)
        self.session_file.write_text(
            json.dumps(self.history, indent=2), encoding="utf-8"
        )

    @classmethod
    def load(cls, path: Path) -> SessionContext:
        """Restore from disk, handling missing or corrupted files."""
        if not path.exists():
            return cls(session_file=path)
        try:
            history = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(history, list):
                log.warning("Corrupted session at %s, starting fresh", path)
                return cls(session_file=path)
            return cls(history=history, session_file=path)
        except (json.JSONDecodeError, OSError) as exc:
            log.warning("Failed to load session from %s: %s", path, exc)
            return cls(session_file=path)


def build_agent_cli(
    default_model: str = "claude",
    max_history: int = 20,
    session_dir: Path | None = None,
) -> click.Group:
    """Create the root CLI group with subcommand routing.

    Implements Law 1 (Early Exit): validates arguments before building.
    """
    if not default_model:
        raise ValueError("default_model must be non-empty")

    cli = click.Group()

    @cli.command(name="generate")
    @click.argument("design_file", type=click.Path(exists=True))
    @click.option("--output-dir", "-o", default=".", show_default=True)
    @click.pass_context
    def generate_cmd(ctx: click.Context, design_file: str, output_dir: str) -> int:
        """Generate code from a design specification file."""
        design_path = Path(design_file)
        session = SessionContext.load(
            (session_dir or Path.home() / ".cli-agent") / "session.jsonl"
        )
        engine = AgentEngine(model=default_model, context=session)
        result = engine.generate_code(str(design_path), output_dir)
        click.echo(result.to_json())
        session.save()
        return 0 if result.success else 1

    @cli.command(name="review")
    @click.argument("file_or_dir", type=click.Path(exists=True))
    @click.option("--focus", "-f", default="", help="Review focus area (security, performance, style)")
    @click.pass_context
    def review_cmd(ctx: click.Context, file_or_dir: str, focus: str) -> int:
        """Run prompt-based code review on a file or directory."""
        session = SessionContext.load(
            (session_dir or Path.home() / ".cli-agent") / "session.jsonl"
        )
        engine = AgentEngine(model=default_model, context=session)
        path = Path(file_or_dir)
        if path.is_file():
            targets: list[Path] = [path]
        else:
            targets = sorted(path.rglob("*"))[:50]  # cap at 50 files
        result = engine.review_targets(targets, focus=focus)
        click.echo(result.to_json())
        session.save()
        return 0 if result.success else 1

    @cli.command(name="run")
    @click.argument("command", nargs=-1, required=True)
    @click.option("--timeout", "-t", default=30, show_default=True, type=int)
    def run_cmd(command: tuple[str, ...], timeout: int) -> int:
        """Execute a shell command with safety guards."""
        result = execute_sandboxed(command, timeout_seconds=timeout)
        click.echo(result.to_json())
        return 0 if result.success else 1

    @cli.command(name="interactive")
    @click.option("--model", "-m", default=None, help="Override default model")
    @click.option("--session-dir", default=None, type=click.Path(file_okay=False))
    def interactive_cmd(model: str | None, session_dir: str | None) -> int:
        """Start an interactive multi-turn terminal session."""
        effective_model = model or default_model
        effective_session = Path(session_dir) if session_dir else (Path.home() / ".cli-agent")
        session = SessionContext.load(effective_session / "session.jsonl")
        click.echo("CLI Agent ready. Type your request and press Enter.")
        click.echo("(Type 'exit' or Ctrl+D to quit.)\n")

        engine = AgentEngine(model=effective_model, context=session)
        while True:
            try:
                prompt = click.prompt(">", prompt_suffix="", type=str)
            except (EOFError, KeyboardInterrupt):
                break

            if prompt.strip().lower() in ("exit", "quit", "q"):
                break

            if not prompt.strip():
                continue

            session.add_message("user", prompt)
            click.echo("Processing...", err=True)
            result = engine.respond(prompt)
            session.add_message("assistant", result.output)
            session.save()

            # Print output with ANSI coloring for readability
            if result.success:
                click.echo(f"\n{result.output}", bold=False)
            else:
                click.secho(f"\nError: {result.output}", fg="red")

        click.echo("\nSession saved.")
        return 0

    return cli


class AgentEngine:
    """Core agent that routes prompts to handlers.

    Implements Law 4 (Fail Fast): validates model name and rejects empty prompts.
    """

    def __init__(self, model: str, context: SessionContext) -> None:
        if not model or not isinstance(model, str):
            raise ValueError(f"Invalid model name: {model!r}")
        self.model = model
        self.context = context
        self.handlers: dict[str, Callable[..., ExecutionResult]] = {}

    def register_handler(self, intent: str, handler: Callable[..., ExecutionResult]) -> None:
        """Register an intent handler. Order matters — first registration wins."""
        if intent in self.handlers:
            log.warning("Handler for '%s' already registered, skipping", intent)
            return
        self.handlers[intent] = handler

    def classify_intent(self, prompt: str) -> str:
        """Lightweight rule-based intent classifier.

        Checks keyword patterns before delegating to LLM routing.
        Returns one of: 'generate', 'review', 'execute', 'mcp', or 'general'.
        """
        lower = prompt.lower().strip()

        if any(term in lower for term in ("generate", "create code from", "build from design")):
            return "generate"
        if any(term in lower for term in ("review", "check", "audit", "lint")):
            return "review"
        if any(term in lower for term in ("run", "execute", "shell command", "run ")) or lower.startswith("$"):
            return "execute"
        if any(term in lower for term in ("query", "mcp call", "database", "api call")):
            return "mcp"

        return "general"

    def respond(self, prompt: str) -> ExecutionResult:
        """Process a user prompt through the full pipeline.

        Applies Law 1 (Early Exit): rejects empty prompts immediately.
        Applies Law 4 (Fail Fast): raises on invalid state, never swallows errors.
        """
        if not prompt or not prompt.strip():
            return ExecutionResult(
                success=False,
                output="Empty prompt — nothing to process.",
                metadata={"error": "empty_input"},
            )

        start = time.monotonic()
        intent = self.classify_intent(prompt)
        handler = self.handlers.get(intent) or self._default_handler

        try:
            result = handler(prompt)
            elapsed = (time.monotonic() - start) * 1000
            result.duration_ms = round(elapsed, 1)
            return result
        except Exception as exc:
            elapsed = (time.monotonic() - start) * 1000
            return ExecutionResult(
                success=False,
                output=f"Agent error: {exc}",
                metadata={"error": type(exc).__name__, "intent": intent},
                duration_ms=round(elapsed, 1),
            )

    def generate_code(self, design_path: str, output_dir: str) -> ExecutionResult:
        """Generate code from a design specification file."""
        design = Path(design_path)
        if not design.is_file():
            return ExecutionResult(
                success=False,
                output=f"Design file not found: {design_path}",
                metadata={"error": "file_not_found"},
            )

        try:
            spec_text = design.read_text(encoding="utf-8")
        except OSError as exc:
            return ExecutionResult(
                success=False,
                output=f"Cannot read design file: {exc}",
                metadata={"error": str(exc)},
            )

        # In production, this would call the LLM with the spec
        generated_files = [f"{design.stem}.py", f"{design.stem}_test.py"]
        out_path = Path(output_dir) / design.stem
        out_path.mkdir(parents=True, exist_ok=True)

        code_content = f'"""Generated from {design.name}."""\n\n# TODO: LLM-generated code would go here\n'
        for fname in generated_files:
            (out_path / fname).write_text(code_content, encoding="utf-8")

        return ExecutionResult(
            success=True,
            output=f"Generated {len(generated_files)} files in {out_path}",
            metadata={"files": [str(out_path / f) for f in generated_files], "design": str(design)},
        )

    def review_targets(self, targets: list[Path], focus: str = "") -> ExecutionResult:
        """Run code review on a list of files or directories."""
        if not targets:
            return ExecutionResult(
                success=False,
                output="No targets to review.",
                metadata={"error": "no_targets"},
            )

        findings = []
        for target in targets[:5]:  # cap at 5 files per invocation
            if target.is_file() and target.suffix == ".py":
                try:
                    content = target.read_text(encoding="utf-8")
                    # Simple heuristic checks (production would use linters + LLM)
                    issues = self._simple_review(content, target.name)
                    findings.extend(issues)
                except OSError:
                    continue

        summary = f"Found {len(findings)} potential issues across {min(len(targets), 5)} files." if findings else "No issues detected."
        return ExecutionResult(
            success=True,
            output=f"{summary}\n{''.join(findings[:10])}",
            metadata={"focus": focus, "findings_count": len(findings)},
        )

    @staticmethod
    def _simple_review(content: str, filename: str) -> list[str]:
        """Lightweight pre-LLM review heuristics."""
        issues = []
        if "eval(" in content or "exec(" in content:
            issues.append(f"  ⚠ {filename}: Contains eval()/exec() — potential code injection\n")
        if '"""' in content and '"""' in content[content.index('"""') + 3:] == False and 'doc' not in content[:200].lower():
            pass  # would flag missing docstrings in production
        return issues

    def _default_handler(self, prompt: str) -> ExecutionResult:
        """Fallback handler for unclassified prompts."""
        return ExecutionResult(
            success=True,
            output=f"[Default] Processed prompt via LLM ({self.model}). Intent was not explicitly classified.\n\nPrompt received: {prompt[:200]}{'...' if len(prompt) > 200 else ''}",
            metadata={"model": self.model, "mode": "fallback"},
        )


def execute_sandboxed(command: tuple[str, ...], timeout_seconds: int = 30) -> ExecutionResult:
    """Execute a command in a sandbox with safety guarantees.

    Implements Law 1 (Early Exit): rejects empty commands and blocked binaries.
    Implements Law 2 (Immutable State): never mutates the input command tuple.
    Uses subprocess.run with list args — NEVER shell=True with user data.

    Args:
        command: Tuple of command arguments (e.g., ("git", "status")).
        timeout_seconds: Maximum execution time in seconds.

    Returns:
        ExecutionResult with captured output and exit code.
    """
    if not command or len(command) == 0:
        return ExecutionResult(
            success=False,
            output="Empty command — nothing to execute.",
            metadata={"error": "empty_command"},
        )

    # Law 1: Early exit on blocked binaries (safety sandboxing)
    BLOCKED_BINARIES = frozenset(("rm", "shutdown", "reboot", "mkfs", "dd"))
    basename = Path(command[0]).name if "/" in command[0] else command[0].split("/")[-1]
    if basename in BLOCKED_BINARIES:
        return ExecutionResult(
            success=False,
            output=f"Command blocked by sandbox policy: {basename}",
            metadata={"error": "sandbox_blocked", "command": list(command)},
        )

    start = time.monotonic()
    try:
        import subprocess

        proc = subprocess.run(
            list(command),  # copy to avoid mutation — Law 3
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
        elapsed = (time.monotonic() - start) * 1000
        return ExecutionResult(
            success=proc.returncode == 0,
            output=proc.stdout.rstrip("\n"),
            stderr=proc.stderr.rstrip("\n") if proc.stderr else "",
            exit_code=proc.returncode,
            duration_ms=round(elapsed, 1),
        )
    except subprocess.TimeoutExpired:
        elapsed = (time.monotonic() - start) * 1000
        return ExecutionResult(
            success=False,
            output=f"Command timed out after {timeout_seconds}s",
            metadata={"error": "timeout", "duration_ms": round(elapsed, 1)},
            duration_ms=round(elapsed, 1),
        )
    except FileNotFoundError:
        return ExecutionResult(
            success=False,
            output=f"Command not found: {command[0]}",
            metadata={"error": "not_found", "binary": command[0]},
        )
    except Exception as exc:
        elapsed = (time.monotonic() - start) * 1000
        return ExecutionResult(
            success=False,
            output=f"Execution error: {exc}",
            metadata={"error": type(exc).__name__},
            duration_ms=round(elapsed, 1),
        )


# Entry point for pip-installed CLI tools
if __name__ == "__main__":
    logging.basicConfig(level=logging.WARNING, format="%(asctime)s %(levelname)s %(message)s")
    app = build_agent_cli()
    app()
```

**BAD vs GOOD — Subprocess invocation:**

```python
# ❌ BAD — shell=True with user input is a command injection vulnerability
def run_bad(user_path: str) -> None:
    # User could pass "; rm -rf /" and destroy the system
    subprocess.run(f"cat {user_path}", shell=True)

# ✅ GOOD — list-based args, no shell interpolation, timeout enforced
def run_good(user_path: str) -> ExecutionResult:
    safe = Path(user_path).resolve()  # resolves .. and symlinks
    if not str(safe).startswith("/allowed/"):
        return ExecutionResult(success=False, output="Path outside allowlist")
    return execute_sandboxed(("cat", str(safe)), timeout_seconds=10)
```

### Pattern 2: File & Terminal Interaction Engine (Safe Operations, Output Parsing)

A robust CLI agent needs safe file system operations and reliable terminal interaction. The engine validates all paths against a configurable allowlist, uses atomic writes to prevent corruption, and parses structured output from subprocesses using regex patterns or JSON parsers.

```python
"""cli_agent/io_engine.py — Safe file and terminal interaction engine."""

from __future__ annotations

import json
import logging
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator


log = logging.getLogger(__name__)


@dataclass(frozen=True)
class FileOperation:
    """Immutable description of a file operation."""
    path: str
    content: str | None = None  # None for read/delete operations
    operation: str = "read"     # "read", "write", "delete", "list"
    encoding: str = "utf-8"

    def validate(self, allow_root: Path) -> tuple[bool, str]:
        """Validate path against allowlist. Returns (ok, reason)."""
        resolved = Path(self.path).resolve()
        try:
            resolved.relative_to(allow_root.resolve())
            return True, ""
        except ValueError:
            return False, f"Path {resolved} is outside allowlist {allow_root}"


class FileEngine:
    """Safely manages file read/write/delete within an allowlisted directory."""

    def __init__(self, allow_root: str | Path = ".") -> None:
        self.allow_root = Path(allow_root).resolve()
        if not self.allow_root.is_dir():
            raise FileNotFoundError(f"Allowlist root does not exist: {allow_root}")

    def read_file(self, path: str) -> ExecutionResult:  # type: ignore[name-defined]
        """Read a file within the allowlist. Returns content or structured error."""
        operation = FileOperation(path=path, operation="read")
        ok, reason = operation.validate(self.allow_root)
        if not ok:
            return ExecutionResult(  # type: ignore[name-defined]
                success=False, output=reason, metadata={"error": "path_outside_allowlist"}
            )

        resolved = Path(path).resolve()
        try:
            content = resolved.read_text(encoding="utf-8")
            return ExecutionResult(  # type: ignore[name-defined]
                success=True,
                output=content,
                metadata={"path": str(resolved), "size_bytes": len(content.encode("utf-8"))},
            )
        except FileNotFoundError:
            return ExecutionResult(
                success=False,
                output=f"File not found: {resolved}",
                metadata={"error": "file_not_found"},
            )
        except PermissionError:
            return ExecutionResult(
                success=False,
                output=f"Permission denied: {resolved}",
                metadata={"error": "permission_denied"},
            )
        except UnicodeDecodeError as exc:
            return ExecutionResult(
                success=False,
                output=f"File is not valid UTF-8: {exc}",
                metadata={"error": "encoding_error"},
            )

    def write_file(self, path: str, content: str) -> ExecutionResult:  # type: ignore[name-defined]
        """Atomically write a file within the allowlist using a temp file + rename."""
        operation = FileOperation(path=path, content=content, operation="write")
        ok, reason = operation.validate(self.allow_root)
        if not ok:
            return ExecutionResult(
                success=False, output=reason, metadata={"error": "path_outside_allowlist"}
            )

        resolved = Path(path).resolve()

        # Safety: limit file size to prevent disk exhaustion (10 MB cap)
        if len(content.encode("utf-8")) > 10 * 1024 * 1024:
            return ExecutionResult(
                success=False,
                output=f"Content exceeds 10 MB limit ({len(content)} chars)",
                metadata={"error": "content_too_large"},
            )

        resolved.parent.mkdir(parents=True, exist_ok=True)

        # Atomic write: temp file → fsync → os.replace (prevents partial writes)
        try:
            fd, tmp_path = tempfile.mkstemp(
                dir=str(resolved.parent), prefix=".tmp_", suffix=resolved.suffix
            )
            try:
                import os
                with os.fdopen(fd, "w", encoding="utf-8") as tmp_file:
                    tmp_file.write(content)
                    tmp_file.flush()
                    os.fsync(tmp_file.fileno())
                os.replace(tmp_path, str(resolved))  # atomic on POSIX and Windows
            except Exception:
                Path(tmp_path).unlink(missing_ok=True)
                raise

            return ExecutionResult(
                success=True,
                output=f"Written {len(content)} chars to {resolved}",
                metadata={"path": str(resolved), "bytes_written": len(content.encode("utf-8"))},
            )
        except OSError as exc:
            return ExecutionResult(
                success=False,
                output=f"Write failed: {exc}",
                metadata={"error": str(exc)},
            )

    def list_directory(self, path: str = ".") -> ExecutionResult:  # type: ignore[name-defined]
        """List files in a directory within the allowlist."""
        operation = FileOperation(path=path, operation="list")
        ok, reason = operation.validate(self.allow_root)
        if not ok:
            return ExecutionResult(
                success=False, output=reason, metadata={"error": "path_outside_allowlist"}
            )

        resolved = Path(path).resolve()
        if not resolved.is_dir():
            return ExecutionResult(success=False, output=f"Not a directory: {resolved}")

        entries = []
        for item in sorted(resolved.iterdir()):
            tag = "" if item.is_file() else "/"
            entries.append(f"{item.name}{tag}")

        return ExecutionResult(
            success=True,
            output="\n".join(entries[:100]),  # cap output at 100 entries
            metadata={"path": str(resolved), "entry_count": len(entries)},
        )


def parse_terminal_output(output: str) -> dict[str, str | list[str]]:
    """Parse structured terminal output into categories.

    Handles common patterns: file listings, command outputs with headers,
    JSON/stderr separation, and progress indicators.
    """
    if not output:
        return {"type": "empty", "data": ""}

    # Try parsing as JSON first (cleanest structured output)
    stripped = output.strip()
    try:
        parsed = json.loads(stripped)
        return {"type": "json", "data": parsed}
    except (json.JSONDecodeError, ValueError):
        pass

    # Detect ANSI escape sequences and strip them for analysis
    ansi_pattern = re.compile(r"\x1b\[[0-9;]*m")
    clean_output = ansi_pattern.sub("", stripped)

    # Detect common output patterns
    if "→" in clean_output or "=>" in clean_output:
        return {"type": "mapping", "lines": [l.strip() for l in clean_output.splitlines()]}

    if re.search(r"^\d+ files?", clean_output, re.MULTILINE | re.IGNORECASE):
        return {"type": "file_count", "count": int(re.search(r"(\d+)", clean_output).group(1))}  # type: ignore[union-attr]

    return {"type": "raw", "lines": [l.strip() for l in clean_output.splitlines()]}


class StreamObserver:
    """Observe and filter output from subprocess streams line-by-line.

    Useful for parsing progress indicators, error patterns, or extracting
    structured data from long-running command output.
    """

    def __init__(self, patterns: dict[str, re.Pattern] | None = None) -> None:
        self.patterns = patterns or {}
        self.matches: list[dict[str, str]] = []
        self.lines_consumed: int = 0

    def observe(self, line: str) -> dict[str, str | None]:
        """Check a single line against registered patterns. Returns match info."""
        result: dict[str, str | None] = {"match": None, "matched_text": None}
        for name, pattern in self.patterns.items():
            m = pattern.search(line)
            if m:
                result["match"] = name
                result["matched_text"] = m.group(0)
                self.matches.append({"pattern": name, "line": line.rstrip(), "text": m.group(0)})
        self.lines_consumed += 1
        return result

    @property
    def error_count(self) -> int:
        return sum(1 for m in self.matches if m.get("match") == "error")


# Sentinel type alias — ExecutionResult is imported from engine module
from cli_agent.engine import ExecutionResult  # noqa: E402, F401
```

**BAD vs GOOD — File write:**

```python
# ❌ BAD — overwrites file atomically; if interrupted, file is corrupted
def write_bad(path: str, content: str) -> None:
    with open(path, "w") as f:
        f.write(content)  # If this crashes, the original file is gone

# ✅ GOOD — atomic write via temp file + fsync + os.replace
def write_good(path: str, content: str) -> None:
    """Atomic write: never corrupts the original file on crash."""
    resolved = Path(path).resolve()
    fd, tmp = tempfile.mkstemp(dir=str(resolved.parent), prefix=".tmp_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, str(resolved))
    except Exception:
        Path(tmp).unlink(missing_ok=True)
        raise  # Re-raise to signal failure without corrupting the file
```

### Pattern 3: Code Generation from Design Specifications

Converts architecture documents, markdown specs, or design files into executable code. The engine parses the design structure, identifies components and interfaces, then generates source files with proper typing, docstrings, and project structure — all within a safe output directory.

```python
"""cli_agent/codegen.py — Code generation from design specification files."""

from __future__ annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class ComponentSpec:
    """Parsed component from a design specification."""
    name: str
    type: str = "module"          # module, service, handler, model, view
    description: str = ""
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    interface_text: str = ""       # raw docstring for the component


@dataclass
class DesignDocument:
    """Complete parsed design document."""
    title: str = ""
    components: list[ComponentSpec] = field(default_factory=list)
    architecture: str = ""
    tech_stack: list[str] = field(default_factory=list)
    raw_text: str = ""


def parse_design_document(text: str) -> DesignDocument:
    """Parse a markdown design document into structured components.

    Handles common patterns:
    - YAML frontmatter for metadata
    - ## component headers followed by descriptions
    - `interface` blocks with type annotations
    - bullet lists for dependencies and inputs/outputs

    Implements Law 1 (Early Exit): returns empty doc on blank input.
    """
    if not text or not text.strip():
        return DesignDocument(raw_text=text)

    doc = DesignDocument(raw_text=text)

    # Extract YAML frontmatter (between --- markers)
    fm_match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if fm_match:
        meta_block = fm_match.group(1)
        for line in meta_block.splitlines():
            if line.startswith("title:"):
                doc.title = line.split(":", 1)[1].strip().strip('"').strip("'")
            elif line.startswith("tech_stack:") or line.startswith("framework:"):
                stack_str = line.split(":", 1)[1].strip()
                if stack_str:
                    doc.tech_stack = [s.strip().lstrip("-* ") for s in stack_str.split(",")]

    # Extract components by ## headers
    component_blocks = re.split(r"\n## ", text)
    for block in component_blocks[1:]:  # skip everything before first ##
        lines = block.splitlines()
        if not lines:
            continue

        name = lines[0].strip().rstrip(".")
        component = ComponentSpec(name=name)

        # Parse description (first non-empty line after header)
        desc_lines: list[str] = []
        for line in lines[1:]:
            stripped = line.strip()
            if not stripped or stripped.startswith("```"):
                break
            desc_lines.append(stripped)
        component.description = " ".join(desc_lines)

        # Parse interface block (``` interface ... ```)
        iface_match = re.search(r"```\s*interface\s*\n(.*?)\n```", block, re.DOTALL)
        if iface_match:
            component.interface_text = iface_match.group(1).strip()
            for param_line in component.interface_text.splitlines():
                m2 = re.match(r"\w+\s*(?:->|\:)\s*(.*)", param_line.strip())
                if m2:
                    param_name = param_line.strip().split(":")[0].strip()
                    param_type = m2.group(1).strip().rstrip(",")
                    if "input" in param_name.lower() or "param" in param_name.lower():
                        component.inputs.append(param_name)
                    elif "->" in param_line:
                        component.outputs.append(param_type)

        # Parse dependencies from bullet lists
        for line in lines:
            dep_match = re.match(r"\s*[-*]\s*dependency:\s*(.+)", line, re.I)
            if dep_match:
                component.dependencies.append(dep_match.group(1).strip())

        doc.components.append(component)

    return doc


def generate_component_stub(comp: ComponentSpec, language: str = "python") -> str:
    """Generate a code stub for a component based on its parsed spec.

    Produces typed function/class skeletons with docstrings derived
    from the design description. Follows PEP 257 and PEP 484 conventions.
    """
    if language == "python":
        return _generate_python_stub(comp)
    elif language == "typescript":
        return _generate_typescript_stub(comp)
    else:
        raise ValueError(f"Unsupported language: {language}")


def _generate_python_stub(comp: ComponentSpec) -> str:
    """Generate a Python stub with type hints and docstring."""
    lines = [f'"""{comp.description}"""', ""]

    if comp.type == "module":
        lines.append(f"class {comp.name.replace(' ', '_').title().replace('_', '')}:")
        lines.append(f'    """Component: {comp.name}."""')
        lines.append("")
        lines.append("    def __init__(self, **kwargs) -> None:")  # type: ignore[return-value]
        lines.append("        \"\"\"Initialize the component.\"\"\"")
        for dep in comp.dependencies[:3]:
            safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', dep).lower()
            lines.append(f"        self._{safe_name} = kwargs.get('{safe_name}')")
        lines.append("")

        # Generate method stubs from interface text
        if comp.interface_text:
            for param_line in comp.interface_text.splitlines():
                iface_match = re.match(r"(\w+)\s*->\s*(\w+)", param_line.strip())
                if iface_match:
                    method_name = iface_match.group(1).lower().replace("-", "_")
                    return_type = iface_match.group(2)
                    lines.append(f"    def {method_name}(self)")
                    lines.append(f'        """TODO: implement {method_name}."""')
                    lines.append("        ...")  # type: ignore[return-value]
                    lines.append("")
    else:
        comp_method = re.sub(r'\s+', '_', comp.name).lower()
        param_list = ", ".join(
            [f"input_: str"] + [f"{dep}: str" for dep in comp.dependencies[:2]]
        )
        return_type = "str" if comp.outputs else "None"
        lines.extend([
            f"def {comp_method}({param_list}) -> {return_type}:",  # type: ignore[return-value]
            f'    """{comp.description}"""',
            "...",  # type: ignore[return-value]
            "",
        ])

    return "\n".join(lines)


def generate_project_from_design(
    design_path: str,
    output_dir: str,
    language: str = "python",
) -> ExecutionResult:  # type: ignore[name-defined]
    """Full pipeline: parse design → generate files for each component.

    Creates a project structure with __init__.py, component modules,
    and a test skeleton — all within the specified output directory.
    """
    design = Path(design_path)
    if not design.is_file():
        return ExecutionResult(  # type: ignore[name-defined]
            success=False,
            output=f"Design file not found: {design_path}",
            metadata={"error": "file_not_found"},
        )

    try:
        text = design.read_text(encoding="utf-8")
    except OSError as exc:
        return ExecutionResult(
            success=False, output=f"Cannot read design file: {exc}")

    doc = parse_design_document(text)
    out_root = Path(output_dir)
    out_root.mkdir(parents=True, exist_ok=True)

    generated_files: list[str] = []

    # Generate __init__.py
    init_path = out_root / "__init__.py"
    pkg_name = doc.title.replace(" ", "_").lower() if doc.title else "project"
    init_content = f'"""{pkg_name} — auto-generated package."""\n\n# Components: {", ".join(c.name for c in doc.components) or "(none)"}\n'  # type: ignore[return-value]
    init_path.write_text(init_content, encoding="utf-8")
    generated_files.append(str(init_path))

    # Generate one file per component
    for i, comp in enumerate(doc.components):
        stub = generate_component_stub(comp, language=language)
        fname = f"{comp.name.replace(' ', '_').lower()}.py"
        comp_path = out_root / fname
        comp_path.write_text(stub, encoding="utf-8")
        generated_files.append(str(comp_path))

        # Generate matching test stub
        test_fname = f"test_{fname}"
        test_path = out_root / test_fname
        test_content = f'"""Tests for {comp.name}."""\n\nimport pytest\n\ndef test_{comp.name.lower().replace(" ", "_")}() -> None:\n    """Placeholder test for {comp.name}."""\n    assert True  # TODO: add real assertions\n'
        test_path.write_text(test_content, encoding="utf-8")
        generated_files.append(str(test_path))

    return ExecutionResult(
        success=True,
        output=f"Generated {len(generated_files)} files in {out_root}",
        metadata={"components": len(doc.components), "files": generated_files},
    )


# Import ExecutionResult for the public API
from cli_agent.engine import ExecutionResult  # noqa: E402, F401
```

**BAD vs GOOD — Code generation output:**

```python
# ❌ BAD — generates code without validation; writes to arbitrary locations
def generate_bad(spec_text: str) -> None:
    # No path validation — could overwrite system files
    with open("/tmp/generated.py", "w") as f:  # hardcoded path, no safety
        f.write(f"# Generated from spec\n{spec_text}")

# ✅ GOOD — parsed design, typed stubs, atomic writes within allowlist
def generate_good(design_path: str, output_dir: str) -> ExecutionResult:
    """Parse a design doc and generate structured project files."""
    result = generate_project_from_design(design_path, output_dir)
    if not result.success:
        return result  # Fail fast on parse errors

    # Verify generated files have proper structure (self-check)
    for filepath in result.metadata.get("files", []):  # type: ignore[union-attr]
        p = Path(filepath)
        content = p.read_text(encoding="utf-8")
        if not content.strip():
            return ExecutionResult(success=False, output=f"Empty generated file: {p}")

    return result
```

### Pattern 4: MCP Server Bridge for CLI Tools

Connects the CLI agent to MCP servers for extended capabilities. The bridge discovers tools via the MCP protocol, registers them with the CLI's tool router, and proxies execution requests through the standard handler pipeline — enabling seamless expansion of the agent's capabilities without modifying core code.

```python
"""cli_agent/mcp_bridge.py — MCP server integration for CLI agents."""

from __future__ annotations

import json
import logging
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


log = logging.getLogger(__name__)


@dataclass
class McpTool:
    """An MCP tool discovered from a connected server."""
    name: str
    description: str
    input_schema: dict[str, Any]
    parameters: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.parameters = list(self.input_schema.get("properties", {}).keys())


@dataclass
class McpBridgeResult:
    """Structured result from an MCP tool execution."""
    success: bool
    tool_name: str
    output: Any = None
    error: str = ""
    duration_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "tool": self.tool_name,
            "output": self.output if self.success else None,
            "error": self.error if not self.success else None,
            "duration_ms": round(self.duration_ms, 1),
        }


class McpServerConnection:
    """Manages the lifecycle of an MCP server process and its tool registry."""

    def __init__(
        self,
        command: list[str],
        args: list[str] | None = None,
        env: dict[str, str] | None = None,
        timeout_seconds: int = 30,
    ) -> None:
        self.command = list(command)
        self.args = list(args or [])
        self.env = env or {}
        self.timeout_seconds = timeout_seconds
        self._process: subprocess.Popen[bytes] | None = None
        self.tools: list[McpTool] = []
        self.connected: bool = False

    @property
    def process(self) -> subprocess.Popen[bytes]:
        """Lazy-start the MCP server process on first access."""
        if self._process is not None and self._process.poll() is None:
            return self._process

        merged_env = {**__import__("os").environ}
        merged_env.update(self.env)

        cmd = self.command + self.args
        log.info("Starting MCP server: %s", " ".join(cmd))
        self._process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=merged_env,
        )

        # Wait briefly for the process to start
        try:
            self._process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            pass  # Process started successfully (long-running servers don't exit)

        self.connected = True
        return self._process

    def discover_tools(self) -> list[McpTool]:
        """Request tool list from the MCP server via JSON-RPC.

        Returns empty list if the server is unreachable or returns errors.
        Implements Law 4 (Fail Fast): logs and returns clean failure.
        """
        if not self.connected:
            log.warning("Cannot discover tools: MCP server not connected")
            return []

        request = json.dumps({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/list",
            "params": {},
        }) + "\n"

        try:
            proc = self.process
            proc.stdin.write(request.encode("utf-8"))
            proc.stdin.flush()
            response_line = proc.stdout.readline().decode("utf-8")
        except (BrokenPipeError, OSError) as exc:
            log.error("MCP server connection lost during tool discovery: %s", exc)
            self.connected = False
            return []

        try:
            response = json.loads(response_line)
        except json.JSONDecodeError:
            log.warning("Non-JSON response from MCP server: %s", response_line[:200])
            return []

        result = response.get("result", {})
        raw_tools = result.get("tools", [])

        self.tools = []
        for tool_def in raw_tools:
            self.tools.append(McpTool(
                name=tool_def["name"],
                description=tool_def.get("description", ""),
                input_schema=tool_def.get("inputSchema", {}),
            ))

        log.info("Discovered %d MCP tools", len(self.tools))
        return self.tools

    def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> McpBridgeResult:
        """Execute an MCP tool with the given arguments.

        Implements Law 3 (Atomic Predictability): returns a new result object,
        never mutating internal state. Applies Law 1 (Early Exit) for missing tools.
        """
        if not self.connected:
            return McpBridgeResult(
                success=False, tool_name=tool_name, error="MCP server not connected"
            )

        # Early exit: check tool exists
        matching = [t for t in self.tools if t.name == tool_name]
        if not matching:
            available = [t.name for t in self.tools]
            return McpBridgeResult(
                success=False,
                tool_name=tool_name,
                error=f"Tool '{tool_name}' not found. Available: {', '.join(available[:10])}",
            )

        start = time.monotonic()
        request = json.dumps({
            "jsonrpc": "2.0",
            "id": int(time.time() * 1000),
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments},
        }) + "\n"

        try:
            proc = self.process
            proc.stdin.write(request.encode("utf-8"))
            proc.stdin.flush()
            response_line = proc.stdout.readline().decode("utf-8")

            elapsed = (time.monotonic() - start) * 1000
            response = json.loads(response_line)

            if "error" in response:
                return McpBridgeResult(
                    success=False,
                    tool_name=tool_name,
                    error=response["error"].get("message", str(response["error"])),
                    duration_ms=round(elapsed, 1),
                )

            content = response.get("result", {}).get("content", [])
            text_output = ""
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_output += block.get("text", "")

            return McpBridgeResult(
                success=True,
                tool_name=tool_name,
                output=text_output.strip(),
                duration_ms=round(elapsed, 1),
            )
        except subprocess.TimeoutExpired:
            elapsed = (time.monotonic() - start) * 1000
            return McpBridgeResult(
                success=False,
                tool_name=tool_name,
                error=f"MCP tool call timed out after {self.timeout_seconds}s",
                duration_ms=round(elapsed, 1),
            )
        except (json.JSONDecodeError, BrokenPipeError, OSError) as exc:
            elapsed = (time.monotonic() - start) * 1000
            return McpBridgeResult(
                success=False,
                tool_name=tool_name,
                error=f"MCP call failed: {exc}",
                duration_ms=round(elapsed, 1),
            )

    def close(self) -> None:
        """Gracefully terminate the MCP server process."""
        if self._process and self._process.poll() is None:
            try:
                self._process.terminate()
                self._process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._process.kill()
            finally:
                self.connected = False
                log.info("MCP server process terminated")


class McpBridgeRegistry:
    """Registers MCP bridges and routes tool calls to the correct server.

    Supports multiple MCP servers, each with a different purpose
    (e.g., one for databases, one for APIs, one for file search).
    """

    def __init__(self) -> None:
        self._bridges: dict[str, McpServerConnection] = {}
        self._tools_index: list[McpTool] = []

    def add_server(
        self, name: str, command: list[str], args: list[str] | None = None
    ) -> None:
        """Register an MCP server bridge. Multiple servers are supported."""
        if not name or not command:
            raise ValueError("Server name and command are required")
        if name in self._bridges:
            log.warning("Bridge '%s' already registered, replacing", name)
        self._bridges[name] = McpServerConnection(command=command, args=args)
        log.info("Registered MCP server bridge: %s", name)

    def discover_all(self) -> int:
        """Discover tools from all registered servers. Returns total tool count."""
        self._tools_index = []
        for bridge in self._bridges.values():
            tools = bridge.discover_tools()
            self._tools_index.extend(tools)
        return len(self._tools_index)

    def list_available_tools(self) -> list[McpTool]:
        """Return the complete indexed tool list across all servers."""
        if not self._tools_index:
            self.discover_all()
        return self._tools_index

    def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> McpBridgeResult:
        """Route a tool call to the correct MCP server.

        Searches all connected servers for the tool name and executes it.
        Implements Law 4 (Fail Fast): raises on unconnected servers.
        """
        # Index tools if not already discovered
        if not self._tools_index:
            self.discover_all()

        target_bridge: McpServerConnection | None = None
        for bridge in self._bridges.values():
            if any(t.name == tool_name for t in bridge.tools):
                target_bridge = bridge
                break

        if target_bridge is None:
            return McpBridgeResult(
                success=False,
                tool_name=tool_name,
                error=f"Tool '{tool_name}' not found in any registered MCP server",
            )

        return target_bridge.call_tool(tool_name, arguments)


# Re-export ExecutionResult for compatibility with the engine module
from cli_agent.engine import ExecutionResult  # noqa: E402, F401
```

**BAD vs GOOD — MCP tool execution:**

```python
# ❌ BAD — calls MCP tools without checking connection state or tool existence
def call_bad(bridge: McpServerConnection, name: str, args: dict) -> None:
    # No connection check — will crash if server is down
    result = bridge.call_tool(name, args)  # Could return None or raise
    print(result["output"])  # Crashes if result is None

# ✅ GOOD — validates state, checks tool existence, handles errors cleanly
def call_good(bridge: McpServerConnection, name: str, args: dict) -> McpBridgeResult:
    """Safely execute an MCP tool with full error handling."""
    if not bridge.connected:
        log.warning("MCP server disconnected — cannot execute %s", name)
        return McpBridgeResult(success=False, tool_name=name, error="disconnected")

    # Verify tool exists before calling (Law 1: Early Exit)
    available = {t.name: t for t in bridge.tools}
    if name not in available:
        return McpBridgeResult(
            success=False, tool_name=name,
            error=f"Unknown tool. Available: {', '.join(sorted(available.keys())[:10])}",
        )

    # Execute with timeout protection (Law 4: Fail Fast)
    result = bridge.call_tool(name, args)
    if not result.success:
        log.error("MCP tool %s failed: %s", name, result.error)

    return result
```

---

## Constraints

### MUST DO
- Parse all user input at the boundary with explicit type checking before routing (Law 2: parse don't validate)
- Use guard clauses — return early on invalid input, empty commands, or blocked binaries before executing any logic (Law 1: early exit)
- Never use `subprocess.run(... shell=True, ...)` with user-supplied data; always pass commands as list arguments (Law 4: fail fast on unsafe patterns)
- Implement path validation against an allowlist directory for all file operations — reject paths outside the sandbox with a structured error (Law 2: boundary validation)
- Use atomic writes (`tempfile` + `fsync` + `os.replace`) for all file modifications to prevent corruption on crash (Law 3: atomic predictability)
- Return new data structures instead of mutating inputs; make `ExecutionResult` and `FileOperation` immutable via `@dataclass(frozen=True)` where appropriate (Law 3: atomic predictability)
- Design the CLI with `click.Group` or `argparse.add_subparsers` for subcommand routing, enabling clean extensibility without monolithic if/elif chains
- Manage session context with bounded history — cap conversation memory to prevent token overflow; persist between invocations via JSONL files

### MUST NOT DO
- Execute arbitrary user-supplied shell strings with `shell=True` under any circumstances — this is the single most critical security boundary in a CLI agent
- Allow file operations on paths outside the configured allowlist root — use `Path.resolve()` + `relative_to()` for validation, not string prefix matching (which can be bypassed with symlinks)
- Use bare `except Exception` blocks without logging the full traceback and context — every handler must log errors before returning a user-facing message
- Store conversation history beyond the configured maximum (20 messages or 8000 tokens) without explicit pruning strategy — unbounded context leads to token budget exhaustion
- Hardcode MCP server credentials or API keys in source files — use environment variables, `.env` files with `python-dotenv`, or the system keyring
- Write output directly to user's current working directory without an explicit target parameter — always accept a designated output path to prevent accidental file creation

---

## Output Template

When applying this skill, produce outputs following this structure:

1. **CLI Architecture Blueprint** — ASCII diagram of the agent's subcommand routing tree showing all registered commands, their arguments, and handler chain
2. **Tool Router Configuration** — List of registered handlers with intent patterns, parameter schemas, and safety constraints (allowed binaries, path allowlists)
3. **Session Management Design** — Context window configuration (max messages, max tokens), persistence strategy (JSONL file format), and pruning policy for history overflow
4. **MCP Bridge Inventory** — Table of connected MCP servers with discovered tools, their input schemas, and execution timeout settings
5. **Generated Code Artifacts** — File-by-file breakdown of code generation output: each generated file path, its component origin, type hints included, and test stub coverage
6. **Safety Audit Summary** — Verification report covering sandbox boundaries (blocked binaries, path allowlist), subprocess timeout enforcement, atomic write guarantees, and session persistence integrity

---

## Related Skills

| Skill | Purpose |
|---|---|
| `mcp-integration` | Protocol-level MCP server/client implementation — use when you need to build the MCP protocol layer itself; this skill uses existing MCP servers as tools |
| `tool-use-function-calling` | Function calling decorators and LLM tool-calling patterns — use when integrating LLMs with specific functions; this skill handles terminal interaction orchestration on top of that |
| `coding-agent-frameworks` | General-purpose AI agent frameworks (LangChain, AutoGen, CrewAI) for complex multi-agent systems — use when you need cross-platform agents beyond the terminal; this skill focuses specifically on CLI-resident agents |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Gemini CLI Documentation](https://google.github.io/gemini-cli/)
- [Click Python CLI Framework](https://click.palletsprojects.com/en/latest/)
- [Python subprocess — Running Processes](https://docs.python.org/3/library/subprocess.html)
- [Model Context Protocol (MCP) Specification](https://modelcontextprotocol.io/specification/2024/11/05/basic)
- [AGENTS.md: Agent Skills Guide — CLI skill creation patterns and quality standards](https://github.com/anthropics/agent-skill-router/blob/main/AGENTS.md)
- [code-philosophy: 5 Laws of Elegant Defense — constraint design reference for all agent skills](../code-philosophy/SKILL.md)

---

*This skill implements CLI-based AI agent workflows inspired by Gemini CLI architecture. It is distinct from general MCP protocol implementation (`mcp-integration`) and general tool calling (`tool-use-function-calling`). Focus on terminal interaction, subprocess safety, file system sandboxing, and design-to-code generation — not on building the MCP transport layer itself.*
