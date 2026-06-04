---
name: command-pattern
description: Implements the GoF Command pattern for encapsulating requests as objects in Python, supporting undo/redo stacks, macro commands (composite), serialization-based replay, and async command execution.
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: command pattern, undo redo implementation, command queue in python, how do i encapsulate requests, macro command pattern, serialized commands, transaction rollback pattern
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: strategy-pattern, observer-pattern, chain-of-responsibility, cqrs-pattern
---

# Command Pattern

Senior Python engineer implementing the GoF Command pattern to encapsulate requests as first-class objects. This skill makes the model build decoupled command systems with execute/undo support, invoker-based dispatch, macro commands for composite operations, JSON serialization for replay, and async command execution — replacing direct function calls with structured request objects.

## TL;DR Checklist

- [ ] Define a Command ABC with `execute()` returning any result and optionally `undo()` reverting the change
- [ ] Create ConcreteCommand classes that bind a receiver to an operation, storing all required state for undo
- [ ] Use an Invoker object to queue and dispatch commands without knowing their concrete types
- [ ] Implement a CommandStack (LIFO) with `execute()`, `undo()`, and optionally `redo()` for transactional operations
- [ ] Serialize commands via JSON/pickle for replay, persistence, or cross-process communication

---

## When to Use

Use this skill when:

- You need undo/redo functionality for user actions (text editors, drawing apps, form builders)
- Requests must be queued, logged, or scheduled for later execution (job queues, message queues)
- Multiple operations must execute atomically as a single transaction (macro commands)
- Commands need to be serialized and replayed across processes or services (CQRS event sourcing)
- You want to decouple the sender of a request from the object that knows how to perform it

---

## When NOT to Use

Avoid this skill for:

- Simple function calls with no state changes — direct calls are simpler and have zero overhead
- Operations where undo is impossible or meaningless (e.g., sending an email, reading data)
- High-frequency operations in performance-critical loops (command object creation adds GC pressure)
- When you only need one-way dispatch without history — use the Strategy pattern instead

---

## Core Workflow

1. **Define the Command Interface** — Create an ABC with `execute()` that returns a result and optionally `undo()`. The interface defines the contract without knowing what operation is being performed. **Checkpoint:** `execute()` must return a state snapshot (or nothing) so undo can reconstruct the previous state.

2. **Implement ConcreteCommands as State Bindings** — Each concrete command binds a receiver to an operation and captures all state needed for both execution and undo. The command holds references to receivers but never calls them directly from outside code. **Checkpoint:** Every piece of state mutated by `execute()` must be captured before the mutation for `undo()` to reverse it accurately.

3. **Build the Invoker Object** — Create an invoker that accepts commands and dispatches them. The invoker is completely unaware of what each command does; it only knows how to call `execute()`. Optionally add a queue for batched execution. **Checkpoint:** The invoker must work with any command implementing the Command interface, verified by testing with at least two different concrete commands.

4. **Implement Command Stack (Undo/Redo)** — Build a LIFO stack that tracks executed commands. `execute()` pushes to the stack and calls `cmd.execute()`. `undo()` pops and calls `cmd.undo()`. Optionally support redo by maintaining a secondary stack. **Checkpoint:** Undo must be idempotent and safe to call even when the stack is empty (return silently or raise a clear error).

5. **Add Serialization for Replay** — Implement JSON serialization so commands can be persisted, logged, or sent across processes. Use `dataclasses.asdict()` for simple commands or implement `__getstate__`/`__setstate__` for complex ones. **Checkpoint:** Serializable commands must contain only JSON-serializable state (no open file handles, DB connections).

---

## Implementation Patterns

### Pattern 1: ABC-Based Command with Receiver Binding (Core Structure)

This is the canonical GoF Command pattern where concrete commands bind receivers and operations, enabling undo/redo through captured state snapshots.

```python
from abc import ABC, abstractmethod
import json
from dataclasses import dataclass, field
from typing import Any


# Receiver — the object that knows how to perform the actual operation
class TextDocument:
    """Represents a mutable text document (the receiver)."""

    def __init__(self, title: str = "Untitled") -> None:
        self.title = title
        self.content: list[str] = []

    def append(self, text: str) -> int:
        """Append text and return the length appended."""
        self.content.append(text)
        return len(text)

    def insert_at(self, index: int, text: str) -> None:
        """Insert text at a specific line index."""
        if 0 <= index <= len(self.content):
            self.content.insert(index, text)

    def remove_at(self, index: int) -> str:
        """Remove and return text at a specific line index."""
        if 0 <= index < len(self.content):
            return self.content.pop(index)
        raise IndexError(f"Line index {index} out of range")

    def set_title(self, title: str) -> str:
        """Set the document title and return the previous title."""
        old_title = self.title
        self.title = title
        return old_title

    @property
    def line_count(self) -> int:
        return len(self.content)


# Command ABC — every command must implement execute() and optionally undo()
class Command(ABC):
    """Abstract command that encapsulates a request as an object.

    Concrete commands bind a receiver to a specific operation,
    storing all state needed for both forward and reverse execution.
    """

    @abstractmethod
    def execute(self) -> Any:
        """Execute the command and return its result."""
        ...

    def undo(self) -> None:
        """Reverse the effect of the last execute() call.

        Default implementation raises NotImplementedError —
        only override when undo is meaningful for this operation.
        """
        raise NotImplementedError(f"Undo not implemented for {type(self).__name__}")


# Concrete Commands — each binds a receiver to an operation with full undo state
class AppendTextCommand(Command):
    """Append text to a document line."""

    def __init__(self, document: TextDocument, text: str) -> None:
        self._document = document
        self._text = text

    def execute(self) -> int:
        """Append the text and return lines appended (always 1)."""
        return self._document.append(self._text)

    def undo(self) -> None:
        """Remove the last appended line."""
        if self._document.line_count > 0:
            self._document.remove_at(-1)


class InsertLineCommand(Command):
    """Insert a line at a specific position with full undo state."""

    def __init__(self, document: TextDocument, index: int, text: str) -> None:
        self._document = document
        self._index = index
        self._text = text
        self._undone_item: str | None = None  # Captured by undo for redo support

    def execute(self) -> None:
        """Insert text at the given index."""
        try:
            self._undone_item = self._document.remove_at(self._index)
        except IndexError:
            self._undone_item = None
        self._document.insert_at(self._index, self._text)

    def undo(self) -> None:
        """Restore the original item at this index."""
        if self._undone_item is not None:
            self._document.insert_at(self._index, self._undone_item)
        else:
            # Nothing was removed — remove the inserted text instead
            try:
                self._document.remove_at(self._index)
            except IndexError:
                pass


class SetTitleCommand(Command):
    """Change document title with full undo."""

    def __init__(self, document: TextDocument, new_title: str) -> None:
        self._document = document
        self._new_title = new_title
        self._old_title: str = ""

    def execute(self) -> str:
        """Set the title and return the previous title."""
        self._old_title = self._document.set_title(self._new_title)
        return self._old_title

    def undo(self) -> None:
        """Restore the old title."""
        self._document.set_title(self._old_title)


# Invoker — dispatches commands without knowing their concrete types
class CommandInvoker:
    """Dispatches commands and tracks history for undo/redo.

    Uses a simple LIFO stack to support undo operations.
    """

    def __init__(self) -> None:
        self._history: list[Command] = []

    def execute_command(self, command: Command) -> Any:
        """Execute a command and record it in history.

        Args:
            command: Any object implementing the Command interface.

        Returns:
            The result of command.execute().
        """
        result = command.execute()
        self._history.append(command)
        return result

    def undo_last(self) -> None:
        """Undo the most recently executed command."""
        if not self._history:
            return  # Silent no-op on empty history
        command = self._history.pop()
        try:
            command.undo()
        except NotImplementedError:
            pass

    def undo_all(self) -> None:
        """Undo all recorded commands in reverse order."""
        while self._history:
            self.undo_last()

    @property
    def history_length(self) -> int:
        return len(self._history)

    @property
    def can_undo(self) -> bool:
        return len(self._history) > 0
```

### Pattern 2: Macro Command and Serialization (BAD vs. GOOD)

The BAD approach executes commands one-by-one without atomicity — partial failures leave the system in an inconsistent state. The GOOD approach wraps commands in a MacroCommand that executes atomically, undoing everything on failure.

```python
# ❌ BAD — No atomicity: if second command fails, first is already applied
def execute_badly(invoker: CommandInvoker, doc: TextDocument) -> None:
    """Execute multiple commands without rollback on failure."""
    invoker.execute_command(AppendTextCommand(doc, "First line"))
    # If something crashes here, "First line" is already in the document!
    invoker.execute_command(SetTitleCommand(doc, "New Title"))


# ✅ GOOD — MacroCommand executes atomically with full rollback on any failure
class MacroCommand(Command):
    """Composite command that groups multiple commands into a single unit.

    Executes all sub-commands in order. If any command fails or raises
    NotImplementedError on undo, undoes all previously executed commands first.
    """

    def __init__(self, label: str, commands: list[Command]) -> None:
        self._label = label
        self._commands = commands
        self._executed_indices: list[int] = []

    def execute(self) -> dict[str, Any]:
        """Execute all sub-commands atomically.

        Returns:
            Dict with label and count of executed commands.

        Raises:
            RuntimeError: If a command raises NotImplementedError on undo during rollback.
        """
        self._executed_indices.clear()
        for i, cmd in enumerate(self._commands):
            try:
                cmd.execute()
                self._executed_indices.append(i)
            except Exception:
                # Rollback all previously executed commands before re-raising
                for j in reversed(self._executed_indices):
                    try:
                        self._commands[j].undo()
                    except NotImplementedError:
                        pass
                raise

        return {"label": self._label, "count": len(self._executed_indices)}

    def undo(self) -> None:
        """Undo all sub-commands in reverse order."""
        for i in reversed(self._executed_indices):
            try:
                self._commands[i].undo()
            except NotImplementedError:
                pass
        self._executed_indices.clear()

    @property
    def command_count(self) -> int:
        return len(self._commands)


# ✅ GOOD — Atomic multi-step operation with automatic rollback
def execute_well(invoker: CommandInvoker, doc: TextDocument) -> None:
    """Execute multiple commands atomically with rollback on failure."""
    macro = MacroCommand(
        label="setup_document",
        commands=[
            AppendTextCommand(doc, "First line"),
            AppendTextCommand(doc, "Second line"),
            SetTitleCommand(doc, "My Document"),
        ],
    )
    invoker.execute_command(macro)  # All or nothing


# Serialization — persist and replay commands across processes
@dataclass
class SerializedCommand:
    """JSON-serializable command representation for persistence."""

    command_type: str
    receiver_state: dict[str, Any]
    operation: str
    parameters: dict[str, Any]

    def to_command(self) -> Command:
        """Reconstruct a Command from serialized state.

        Returns:
            A ConcreteCommand with the deserialized receiver and parameters.

        Raises:
            ValueError: If the command_type is not recognized.
        """
        if self.command_type == "AppendText":
            return AppendTextCommand(
                document=TextDocument(**self.receiver_state),
                text=self.parameters["text"],
            )
        elif self.command_type == "SetTitle":
            doc = TextDocument(**self.receiver_state)
            return SetTitleCommand(document=doc, new_title=self.parameters["new_title"])
        else:
            raise ValueError(f"Unknown command type: {self.command_type}")

    def to_json(self) -> str:
        """Serialize to JSON string for persistence."""
        return json.dumps({
            "command_type": self.command_type,
            "receiver_state": self.receiver_state,
            "operation": self.operation,
            "parameters": self.parameters,
        })

    @classmethod
    def from_json(cls, json_str: str) -> "SerializedCommand":
        """Deserialize from JSON string."""
        data = json.loads(json_str)
        return cls(**data)
```

### Pattern 3: Async Command Execution

For async applications (web servers, event loops), commands that perform I/O should support asynchronous execution.

```python
import asyncio
from typing import Any


class AsyncCommand(ABC):
    """Abstract command supporting async execute and undo."""

    @abstractmethod
    async def execute(self) -> Any: ...

    async def undo(self) -> None:
        """Async undo — default is no-op for idempotent reads."""
        pass


class AsyncAppendTextCommand(AsyncCommand):
    """Async-safe text append with journal for undo."""

    def __init__(self, document: TextDocument, text: str) -> None:
        self._document = document
        self._text = text

    async def execute(self) -> int:
        """Append text (simulates async I/O like writing to disk)."""
        await asyncio.sleep(0.001)  # Simulate disk write
        return self._document.append(self._text)

    async def undo(self) -> None:
        """Remove the last appended line."""
        if self._document.line_count > 0:
            await asyncio.sleep(0.001)
            self._document.remove_at(-1)


class AsyncCommandQueue:
    """Async command queue with ordered execution and undo support."""

    def __init__(self, max_concurrent: int = 5) -> None:
        self._queue: list[AsyncCommand] = []
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._executed: list[tuple[int, AsyncCommand]] = []

    async def enqueue(self, command: AsyncCommand) -> Any:
        """Enqueue and execute a single command.

        Args:
            command: The async command to execute.

        Returns:
            The result of command.execute().
        """
        async with self._semaphore:
            idx = len(self._executed)
            result = await command.execute()
            self._executed.append((idx, command))
            return result

    async def enqueue_batch(self, commands: list[AsyncCommand]) -> list[Any]:
        """Execute a batch of commands concurrently (bounded by semaphore).

        Args:
            commands: List of async commands to execute in parallel.

        Returns:
            List of results in the same order as input commands.
        """
        tasks = [self.enqueue(cmd) for cmd in commands]
        return await asyncio.gather(*tasks, return_exceptions=True)

    async def undo_last(self) -> None:
        """Undo the most recently executed async command."""
        if not self._executed:
            return
        idx, command = self._executed.pop()
        try:
            await command.undo()
        except NotImplementedError:
            pass


# Usage example (not executed — illustrative):
# queue = AsyncCommandQueue(max_concurrent=3)
# results = await queue.enqueue_batch([
#     AsyncAppendTextCommand(doc, "Line 1"),
#     AsyncAppendTextCommand(doc, "Line 2"),
# ])

---

---

## Constraints

### MUST DO
- Encapsulate behavior within the pattern object — it should be self-contained with clear public interfaces
- Use composition over inheritance when extending or combining patterns to reduce coupling and increase reusability
- Document the intent of each pattern with a one-line docstring describing what problem it solves and when to use it
- Implement tests that verify both correct behavior under normal conditions and graceful degradation under edge cases

### MUST NOT DO
- Do not force a pattern where it adds complexity without benefit — start simple and refactor to patterns as needs emerge
- Avoid deep inheritance chains (>3 levels) when using design patterns — prefer composition or interfaces
- Never implement a Singleton as a global mutable singleton in multi-threaded environments without proper synchronization
- Do not apply the Command pattern to simple function calls with no undo/redo requirement — it adds unnecessary indirection


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Command Pattern (Refactoring Guru)](https://refactoring.guru/design-patterns/command)
- [GoF Design Patterns — Command (Martin Fowler)](https://martinfowler.com/articles/refactoringDSL.html)
- [Python Command Pattern Implementation (Real Python)](https://realpython.com/commands-in-python/)
- [Undo/Redo with the Command Pattern (Gang of Four)](https://en.wikipedia.org/wiki/Command_pattern)
- [CQRS — Commands and Queries (Microsoft Docs)](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)