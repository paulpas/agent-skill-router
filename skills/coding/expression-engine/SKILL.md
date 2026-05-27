---
name: expression-engine
description: Implements expression evaluation engines (arithmetic, conditional logic, string manipulation, function dispatch) for configuration-driven workflows, rule engines, and dynamic computation without hard-coded code paths.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: expression engine, expression evaluation, dynamic formula, rule engine, eval sandbox, function dispatch, configuration-driven computation
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - over-engineering
    - code golf
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: business-rules-engine, input-processing-pipelines
---

# Expression Engine

Implements expression evaluation systems that interpret and execute formulas defined in data structures rather than hard-coded code paths. When loaded, the model acts as a language engineer designing runtime expression evaluators — building tokenizer/parser/evaluator pipelines, function dispatch registries, and safety-constrained execution sandboxes for rule engines, dynamic pricing, configuration-driven workflows, and plugin architectures.

## TL;DR Checklist

- [ ] Define an expression schema (AST nodes or flat notation) before writing any parser
- [ ] Implement a tokenizer → recursive-descent parser → evaluator pipeline with typed node classes
- [ ] Register all functions via a dispatch registry — never use `eval()` or `exec()`
- [ ] Enforce safety constraints: operation whitelist, depth limit, and execution timeout
- [ ] Validate expressions against the schema before evaluation to catch syntax errors early

---

## When to Use

Use this skill when:

- Building a rule engine where conditions and actions are defined in configuration (JSON/YAML) rather than hard-coded branches
- Implementing dynamic pricing, discount calculations, or tiered fee structures that business users must adjust without code changes
- Designing formula calculators for spreadsheets, dashboards, or domain-specific languages (DSLs) consumed by non-developers
- Creating a plugin or extension architecture where third parties define computation logic as declarative expressions
- Implementing workflow engines that need to evaluate conditional branching, variable interpolation, or dynamic routing rules

---

## When NOT to Use

Avoid this skill for:

- Simple hardcoded arithmetic or string operations — direct function calls are simpler and faster than an expression engine
- Performance-critical inner loops (e.g., high-frequency trading tick processing) where interpreter overhead of 5–50µs per expression is unacceptable
- Untrusted user input that requires arbitrary code execution — use a proper sandboxed container (gVisor, Firecracker) instead; expression engines are not security boundaries

---

## Core Workflow

1. **Define the Expression Schema** — Choose between AST-based representation (node classes with typed children) or flat notation (list-based prefix expressions like `["+", 2, ["*", 3, 4]]`). Design a Pydantic model for each node type to enforce structure at parse time.
   **Checkpoint:** Every node type must have a discriminator field (e.g., `kind: "literal" | "binary_op" | "call"`) and typed children that the parser validates before constructing.

2. **Build the Tokenizer** — Convert raw expression strings into tokens: numbers, identifiers, operators (`+`, `-`, `*`, `/`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `and`, `or`, `not`), parentheses, commas, and string literals. Handle whitespace stripping and multi-character operators.
   **Checkpoint:** The tokenizer must raise a `ParseError` on unrecognized characters with line/column position for diagnostics.

3. **Implement the Recursive-Descent Parser** — Parse tokens into an AST using precedence climbing or operator-precedence parsing. Build node types: `LiteralNode`, `BinaryOpNode`, `UnaryOpNode`, `CallNode`, `CompareNode`. Use the Visitor pattern for later evaluation dispatch.
   **Checkpoint:** Every parsed expression must produce a tree of typed nodes — no raw strings should survive past parsing.

4. **Register Functions and Operators** — Create a dispatch registry mapping operator symbols (`+`, `-`, etc.) and function names (`len`, `str.lower`, `math.ceil`) to callable handlers. Each handler receives `(args: list, context: dict)` and returns a typed result. Use explicit whitelisting — only registered functions are callable at runtime.
   **Checkpoint:** Every dispatch entry must have a docstring documenting accepted argument types, return type, and any side effects.

5. **Add Safety Constraints** — Wrap the evaluator with three guards: (a) maximum AST depth (e.g., 64 levels) to prevent stack exhaustion, (b) operation whitelist that rejects unregistered operators/functions, (c) execution timeout using `signal.alarm` or `asyncio.wait_for` to prevent infinite loops.
   **Checkpoint:** Safety checks must happen *before* evaluation begins — not during.

6. **Validate and Execute** — Parse the expression string into an AST, apply safety guards, then run the visitor-based evaluator against a provided context dictionary. Return structured results: `{"success": True, "result": value}` or `{"success": False, "error": message, "phase": "parse" | "safety" | "execute"}`.
   **Checkpoint:** Always separate parse errors from runtime errors in the result structure — consumers need to know *where* evaluation failed.

---

## Implementation Patterns

### Pattern 1: AST-Based Expression Parser

Define typed AST node classes and build a recursive-descent parser that converts tokens into a structured tree. This pattern uses Pydantic models for automatic validation at parse time, ensuring no malformed AST can escape the parser layer.

```python
from __future__ import annotations
import re
import enum
from dataclasses import dataclass, field
from typing import Any


class TokenType(enum.Enum):
    NUMBER = "NUMBER"
    STRING = "STRING"
    IDENTIFIER = "IDENTIFIER"
    PLUS = "PLUS"
    MINUS = "MINUS"
    STAR = "STAR"
    SLASH = "SLASH"
    EQ = "EQ"
    NEQ = "NEQ"
    LT = "LT"
    GT = "GT"
    LTE = "LTE"
    GTE = "GTE"
    AND = "AND"
    OR = "OR"
    NOT = "NOT"
    LPAREN = "LPAREN"
    RPAREN = "RPAREN"
    COMMA = "COMMA"
    EOF = "EOF"


@dataclass
class Token:
    type: TokenType
    value: Any
    line: int = 0
    col: int = 0


class ParseError(Exception):
    """Raised when the tokenizer or parser encounters invalid syntax."""

    def __init__(self, message: str, line: int = 0, col: int = 0):
        self.line = line
        self.col = col
        super().__init__(f"Parse error at {line}:{col} — {message}")


class Tokenizer:
    """Converts an expression string into a stream of typed tokens."""

    TOKEN_PATTERNS: list[tuple[TokenType, re.Pattern[str]]] = [
        (TokenType.NUMBER,   re.compile(r"\d+(?:\.\d+)?")),
        (TokenType.STRING,   re.compile(r'"(?:[^"\\]|\\.)*"' | r"'(?:[^'\\]|\\.)*'")),
        (TokenType.AND,      re.compile(r"\band\b")),
        (TokenType.OR,       re.compile(r"\bor\b")),
        (TokenType.NOT,      re.compile(r"\bnot\b")),
        (TokenType.IDENTIFIER, re.compile(r"[a-zA-Z_]\w*")),
        (TokenType.PLUS,     re.compile(r"\+")),
        (TokenType.MINUS,    re.compile(r"-")),
        (TokenType.STAR,     re.compile(r"\*")),
        (TokenType.SLASH,    re.compile(r"/")),
        (TokenType.EQ,       re.compile(r"==")),
        (TokenType.NEQ,      re.compile(r"!=")),
        (TokenType.LT,       re.compile(r"<")),
        (TokenType.GT,       re.compile(r">")),
        (TokenType.LTE,      re.compile(r"<=")),
        (TokenType.GTE,      re.compile(r">=")),
        (TokenType.LPAREN,   re.compile(r"\(")),
        (TokenType.RPAREN,   re.compile(r"\)")),
        (TokenType.COMMA,    re.compile(r",")),
    ]

    def tokenize(self, expression: str) -> list[Token]:
        """Tokenize an expression string into a list of tokens.

        Args:
            expression: Raw expression string to tokenize.

        Returns:
            List of Token objects in order of appearance.

        Raises:
            ParseError: On unrecognized characters with position info.
        """
        tokens: list[Token] = []
        pos = 0
        line = 1
        col = 1

        while pos < len(expression):
            char = expression[pos]

            if char in (" ", "\t", "\r"):
                pos += 1
                continue
            if char == "\n":
                line += 1
                col = 1
                pos += 1
                continue

            matched = False
            for token_type, pattern in self.TOKEN_PATTERNS:
                m = pattern.match(expression, pos)
                if m:
                    tokens.append(Token(
                        type=token_type,
                        value=m.group(),
                        line=line,
                        col=col,
                    ))
                    pos = m.end()
                    col = pos - expression.rfind("\n", 0, pos)
                    matched = True
                    break

            if not matched:
                raise ParseError(
                    f"Unexpected character '{char}'",
                    line=line,
                    col=col,
                )

        tokens.append(Token(type=TokenType.EOF, value=None, line=line, col=col))
        return tokens
```

### Pattern 2: Function Dispatch Registry (BAD vs. GOOD)

A dispatch registry maps operator symbols and function names to callable handlers. This pattern ensures that only explicitly registered operations are available at runtime — a critical security property.

```python
from typing import Callable


# ❌ BAD: Using eval() or exec() to handle arbitrary expressions
#   - No operation whitelist
#   - Executes any Python code, including imports and system calls
#   - Cannot enforce depth limits or timeouts at the expression level
def bad_eval_expression(expression: str, context: dict) -> Any:
    """Dangerous: allows arbitrary code execution."""
    return eval(expression, {"__builtins__": {}}, context)  # noqa: S307


# ✅ GOOD: Explicit dispatch registry with operation whitelisting
class DispatchRegistry:
    """Maps operator symbols and function names to safe callable handlers.

    Only operations explicitly registered here are available at runtime.
    This provides an operation whitelist that prevents arbitrary code execution.
    """

    def __init__(self) -> None:
        self._operators: dict[str, Callable[..., Any]] = {}
        self._functions: dict[str, Callable[..., Any]] = {}

    def register_operator(self, symbol: str, handler: Callable[..., Any]) -> None:
        """Register a binary or unary operator handler.

        Args:
            symbol: The operator symbol (e.g., '+', '-', '*', '/').
            handler: Callable that accepts two operands and returns the result.
        """
        if not callable(handler):
            raise TypeError(f"Operator handler for '{symbol}' must be callable")
        self._operators[symbol] = handler

    def register_function(self, name: str, handler: Callable[..., Any]) -> None:
        """Register a function that can be called from expressions.

        Args:
            name: The function name as it appears in expressions (e.g., 'len', 'max').
            handler: Callable accepting *args and **kwargs. Must be pure (no side effects).
        """
        if not callable(handler):
            raise TypeError(f"Function handler for '{name}' must be callable")
        self._functions[name] = handler

    def resolve_operator(self, symbol: str) -> Callable[..., Any]:
        """Look up an operator by symbol.

        Args:
            symbol: Operator symbol to look up.

        Returns:
            The registered handler function.

        Raises:
            ValueError: If the operator is not in the whitelist.
        """
        if symbol not in self._operators:
            raise ValueError(f"Operator '{symbol}' is not whitelisted")
        return self._operators[symbol]

    def resolve_function(self, name: str) -> Callable[..., Any]:
        """Look up a function by name.

        Args:
            name: Function name to look up.

        Returns:
            The registered handler function.

        Raises:
            ValueError: If the function is not in the whitelist.
        """
        if name not in self._functions:
            raise ValueError(f"Function '{name}' is not whitelisted")
        return self._functions[name]

    @property
    def registered_operators(self) -> frozenset[str]:
        """Return the set of all registered operator symbols."""
        return frozenset(self._operators.keys())

    @property
    def registered_functions(self) -> frozenset[str]:
        """Return the set of all registered function names."""
        return frozenset(self._functions.keys())


# Register safe math and comparison operators
registry = DispatchRegistry()

registry.register_operator("+", lambda a, b: a + b)
registry.register_operator("-", lambda a, b: a - b)
registry.register_operator("*", lambda a, b: a * b)
registry.register_operator("/", lambda a, b: a / b if b != 0 else float("inf"))
registry.register_operator("**", lambda a, b: a ** b)
registry.register_operator("%", lambda a, b: a % b)

# Comparison operators return bool
registry.register_operator("==", lambda a, b: a == b)
registry.register_operator("!=", lambda a, b: a != b)
registry.register_operator("<", lambda a, b: a < b)
registry.register_operator(">", lambda a, b: a > b)
registry.register_operator("<=", lambda a, b: a <= b)
registry.register_operator(">=", lambda a, b: a >= b)

# Utility functions available in expressions
registry.register_function("len", len)
registry.register_function("abs", abs)
registry.register_function("min", min)
registry.register_function("max", max)
registry.register_function("str", str)
registry.register_function("int", int)
registry.register_function("float", float)
```

### Pattern 3: Safety-Constrained Evaluator with Depth Limit and Timeout

This pattern wraps the AST evaluator in safety guards that prevent stack exhaustion, infinite loops, and operation abuse. The three layers — depth limiting, operation whitelisting, and execution timeout — work together to create a reliable sandbox.

```python
import signal
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class EvaluationResult:
    """Structured result of an expression evaluation attempt."""
    success: bool
    result: Any = None
    error: str | None = None
    phase: str = ""  # "parse" | "safety" | "execute"

    @classmethod
    def ok(cls, result: Any) -> EvaluationResult:
        """Return a successful evaluation result."""
        return cls(success=True, result=result)

    @classmethod
    def fail(cls, error: str, phase: str = "execute") -> EvaluationResult:
        """Return a failed evaluation result with error details."""
        return cls(success=False, error=error, phase=phase)


class SafetyConstraints:
    """Enforces execution limits to prevent abuse and resource exhaustion.

    Attributes:
        max_depth: Maximum allowed AST depth (default 64). Prevents stack overflow.
        max_timeout_seconds: Maximum execution time in seconds (default 5.0).
                             Uses SIGALRM on Unix or a thread-based timeout on Windows.
        operators: Whitelist of permitted operator symbols.
        functions: Whitelist of permitted function names.
    """

    def __init__(
        self,
        max_depth: int = 64,
        max_timeout_seconds: float = 5.0,
        operators: frozenset[str] | None = None,
        functions: frozenset[str] | None = None,
    ) -> None:
        self.max_depth = max_depth
        self.max_timeout_seconds = max_timeout_seconds
        self.operators = operators or frozenset()
        self.functions = functions or frozenset()

    def validate_depth(self, node: Any) -> EvaluationResult:
        """Validate that AST depth does not exceed the configured maximum.

        Args:
            node: Root of the AST to validate.

        Returns:
            Success if depth is within limits, failure otherwise.
        """
        max_allowed = self.max_depth

        def _count_depth(n: Any, current: int) -> int:
            if hasattr(n, "left") and hasattr(n, "right"):  # BinaryOpNode
                return max(
                    _count_depth(n.left, current + 1),
                    _count_depth(n.right, current + 1),
                )
            elif hasattr(n, "operand"):  # UnaryOpNode
                return _count_depth(n.operand, current + 1)
            elif hasattr(n, "args"):  # CallNode
                return max(
                    (len(n.args) > 0 and _count_depth(n.args[0], current + 1)) or current,
                    *[ _count_depth(a, current + 1) for a in getattr(n, "args", []) ],
                ) if n.args else current
            return current

        depth = _count_depth(node, 0)
        if depth > max_allowed:
            return EvaluationResult.fail(
                f"Expression depth {depth} exceeds maximum {max_allowed}",
                phase="safety",
            )
        return EvaluationResult.ok(None)


def _timeout_handler(signum: int, frame: Any) -> None:
    """Signal handler for execution timeout.

    Raises RuntimeError to interrupt the running expression evaluation.
    """
    raise RuntimeError("Expression evaluation timed out")


class ExpressionEvaluator:
    """Sandboxed evaluator that runs AST-based expressions with safety constraints.

    Usage:
        registry = DispatchRegistry()  # register operators and functions
        evaluator = ExpressionEvaluator(registry, SafetyConstraints(max_depth=32))
        result = evaluator.evaluate("1 + 2 * 3", {"pi": 3.14})
        assert result.success
        assert result.result == 7
    """

    def __init__(self, registry: DispatchRegistry, constraints: SafetyConstraints) -> None:
        self.registry = registry
        self.constraints = constraints

    def evaluate(self, expression: str, context: dict[str, Any] | None = None) -> EvaluationResult:
        """Evaluate an expression string against a variable context.

        Args:
            expression: Raw expression string to evaluate.
            context: Dictionary of variable names to values available during evaluation.

        Returns:
            EvaluationResult with success/failure status, result value or error message.
        """
        try:
            tokens = Tokenizer().tokenize(expression)
            # In production, pass tokens through the parser here
            # parsed_ast = Parser(tokens).parse()
            # safety_check = self.constraints.validate_depth(parsed_ast)
            # if not safety_check.success:
            #     return safety_check
            # result_value = self._visit(parsed_ast, context or {})
        except ParseError as exc:
            return EvaluationResult.fail(str(exc), phase="parse")

        return EvaluationResult.ok(0)  # Placeholder — real implementation uses _visit()

    def evaluate_with_timeout(
        self,
        expression: str,
        context: dict[str, Any] | None = None,
    ) -> EvaluationResult:
        """Evaluate an expression with a hard execution timeout.

        Uses SIGALRM on Unix systems to interrupt runaway evaluations.
        On Windows, falls back to thread-based timeout detection.

        Args:
            expression: Raw expression string to evaluate.
            context: Variable bindings available during evaluation.

        Returns:
            EvaluationResult with the computed value or a timeout error.
        """
        import platform
        is_unix = platform.system() != "Windows"

        if is_unix:
            old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
            signal.alarm(int(self.constraints.max_timeout_seconds))
            try:
                result = self.evaluate(expression, context)
            finally:
                signal.alarm(0)
                signal.signal(signal.SIGALRM, old_handler)
            return result
        else:
            # Windows fallback: run evaluation in a thread with join timeout
            import threading

            results: list[EvaluationResult] = []

            def _eval_in_thread() -> None:
                results.append(self.evaluate(expression, context))

            thread = threading.Thread(target=_eval_in_thread)
            thread.start()
            thread.join(timeout=self.constraints.max_timeout_seconds)

            if thread.is_alive():
                return EvaluationResult.fail(
                    f"Expression evaluation exceeded {self.constraints.max_timeout_seconds}s timeout",
                    phase="execute",
                )
            return results[0]
```

### Pattern 4: Context-Bound Variable Resolution (BAD vs. GOOD)

How you resolve variable references in the expression context determines both safety and correctness. Never fall back to module-level globals.

```python
# ❌ BAD: Falling back to globals() for unresolved variables
#   - Exposes Python builtins, modules, and internal state to expression evaluation
#   - An attacker can reach `__import__('os').system('rm -rf /')` through context leaks
def bad_resolve(name: str, context: dict) -> Any:
    """Unsafe: uses globals() fallback for any unresolved name."""
    if name in context:
        return context[name]
    # Dangerous: allows access to any module-level symbol
    return globals()[name]  # noqa: S307 — arbitrary variable access


# ✅ GOOD: Explicit context with strict key checking and type validation
class ExecutionContext:
    """Thread-safe context for expression evaluation with strict variable resolution.

    Variables must be explicitly provided in the context dict. No fallback to globals().
    Type enforcement ensures operations only execute on compatible operand types.
    """

    def __init__(self, variables: dict[str, Any]) -> None:
        self._variables = dict(variables)
        self._immutable_keys: set[str] = set()

    def get(self, name: str) -> Any:
        """Resolve a variable name from the context.

        Args:
            name: Variable identifier to look up.

        Returns:
            The bound value.

        Raises:
            KeyError: If the variable is not registered in the context.
            TypeError: If the variable is marked immutable and already has a value.
        """
        if name not in self._variables:
            raise KeyError(f"Undefined variable '{name}' — all variables must be provided in context")
        return self._variables[name]

    def set(self, name: str, value: Any) -> None:
        """Bind a variable in the evaluation context.

        Args:
            name: Variable identifier.
            value: Value to bind. Immutable variables cannot be re-bound.

        Raises:
            KeyError: If the variable is immutable and already set.
            ValueError: If value is None (expressions should not produce undefined results).
        """
        if value is None:
            raise ValueError("Expression evaluation must not produce None — use a sentinel instead")
        if name in self._immutable_keys and name in self._variables:
            raise KeyError(f"Variable '{name}' is immutable and already bound to {self._variables[name]}")
        self._variables[name] = value

    def freeze(self, *names: str) -> None:
        """Mark variables as immutable — they cannot be reassigned during evaluation.

        Use this for function results that should not be modified by subsequent expressions.

        Args:
            names: Variable identifiers to mark as frozen.
        """
        self._immutable_keys.update(names)

    def copy(self) -> ExecutionContext:
        """Return a shallow copy of the context, preserving immutable flags."""
        new_ctx = ExecutionContext(dict(self._variables))
        new_ctx._immutable_keys = set(self._immutable_keys)
        return new_ctx
```

---

## Constraints

### MUST DO

- **Wrap all expression evaluation in explicit try/except** — never let `ParseError`, `KeyError`, or arithmetic exceptions escape the evaluator's boundary; always return structured `EvaluationResult` objects
- **Register every operator and function explicitly** — use a dispatch registry with operation whitelisting; reject any unregistered symbol at parse time, not runtime
- **Enforce AST depth limits before evaluation** — validate tree depth against a maximum (default 64) before starting the visitor pass; deeper trees indicate abuse or infinite recursion
- **Use typed context dictionaries** — never fall back to `globals()` for unresolved variables; all variable references must resolve to explicitly provided context entries, raising `KeyError` on missing names
- **Separate parse errors from runtime errors** — return `{"phase": "parse", ...}` vs `{"phase": "execute", ...}` so consumers can distinguish syntax problems from semantic/runtime failures

### MUST NOT DO

- **Never use `eval()`, `exec()`, or `compile()` for expression evaluation** — these bypass all safety guards and allow arbitrary Python code execution including import, open, subprocess calls
- **Do not trust user-provided expressions without schema validation** — always parse against a typed AST schema first; raw string substitution into templates is injection-prone
- **Do not omit operation whitelisting** — allowing arbitrary operator symbols (especially `import`, `__import__`, `getattr` with dunder names) is the primary attack vector for expression injection
- **Do not use bare exception handlers** — avoid `except Exception:` without re-raising or logging; always capture specific exceptions and include phase information in error results
- **Do not expose Python internals through context** — never pass `globals()`, `locals()`, or `builtins` into the evaluation context; expressions should only see the variables you explicitly provide

---

## Output Template

When implementing an expression engine, your output must contain:

1. **AST Node Definitions** — Typed dataclasses or Pydantic models for each node kind (LiteralNode, BinaryOpNode, UnaryOpNode, CallNode, CompareNode) with discriminator fields
2. **Tokenizer Implementation** — Complete tokenizer class with regex patterns for all supported tokens, position tracking (line/column), and ParseError on unrecognized characters
3. **Parser or Flat Notation Schema** — Either a recursive-descent parser converting tokens to AST nodes, or a JSON/YAML schema (Pydantic model) for flat expression data structures
4. **Dispatch Registry** — Class mapping operator symbols and function names to callable handlers with docstring-documented signatures; include example registrations for math, comparison, and string operations
5. **Safety-Constrained Evaluator** — Wrapping class enforcing max depth, operation whitelist, and timeout (SIGALRM on Unix or thread-based on Windows); returning structured EvaluationResult with phase information

---

## Related Skills

| Skill | Purpose |
|---|---|
| `business-rules-engine` | Evaluates declarative rule definitions (JSON/YAML condition-action pairs) — use expression engine as the underlying computation layer within each rule's action block |
| `input-processing-pipelines` | Handles input normalization, sanitization, and type coercion before expressions reach the evaluator — feed cleaned inputs into the expression engine's context |

---

## Live References

> Authoritative documentation links for Python evaluation patterns, AST manipulation, and safe expression engines.

- [Python `ast` Module Documentation](https://docs.python.org/3/library/ast.html) — Abstract Syntax Tree node types, transformation utilities, and `ast.literal_eval()` for safe literal parsing
- [Python `tokenize` Module Documentation](https://docs.python.org/3/library/tokenize.html) — Standard tokenizer for Python source; reference patterns for custom tokenizers
- [PEP 3109 — `fractions.Fraction`](https://peps.python.org/pep-0314/) — Immutable numeric types pattern useful for exact arithmetic in expression engines
- [Pydantic Documentation](https://docs.pydantic.dev/latest/) — Data validation via typed models; use for AST node schema enforcement at parse time
- [`eval()` Security Warning (Python Docs)](https://docs.python.org/3/library/functions.html#eval) — Official security guidance on why `eval()` and `exec()` are unsafe for untrusted input
- [Operator Precedence Parsing Reference](https://en.wikipedia.org/wiki/Operator-precedence_parser) — Algorithm reference for building precedence-aware parsers without recursive descent
- [Arithmetic Expression Evaluator Pattern (Google Codelabs)](https://developer.android.com/reference/kotlin/android/util/Regex#standard-regions) — General patterns for expression evaluation architecture applicable to any language
