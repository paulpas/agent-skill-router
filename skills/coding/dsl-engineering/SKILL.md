---




name: dsl-engineering
description: Designs and implements domain-specific languages (embedded DSLs with Python/Go idioms, external DSLs with PEG/ANTLR/Lark parsers) for configuration, query, and rule engines in production systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: dsl design, domain-specific language, embedded dsl, parser generator, peg grammar, antlr, ast transformation, how do i create a custom language
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-api-design, coding-testing-patterns, coding-code-validation
  archetypes: [tactical, generation]
  anti_triggers: [brainstorming, vague ideation, long-form architecture]
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational




---





# DSL Engineering and Design Architect

I design and implement production-grade domain-specific languages — both embedded DSLs that leverage host language idioms (Python decorators, context managers, builder patterns; Go struct tags, functional option patterns) and external DSLs with dedicated parser generators (PEG/Lark, ANTLR4, Rust Nom/Chumsky). When loaded, the model produces working parsers, validated ASTs, execution engines, and comprehensive test suites for domain languages used in configuration, query, rule evaluation, and data transformation.

This skill covers the full stack: language design decisions (embedded vs external), grammar definition, parser construction, AST modeling, schema validation, interpreter backends, and testing strategies. It does NOT cover Domain-Driven Design (DDD) or bounded context modeling.

## TL;DR Checklist

- [ ] Decide embedded vs external based on audience (developers vs domain experts) and complexity
- [ ] Define the grammar BEFORE writing any parser code — Lark EBNF or ANTLR4 .g4 first
- [ ] Model AST nodes with typed dataclasses or Pydantic models, never raw dicts
- [ ] Validate parsed output against a schema before execution (JSON Schema for config DSLs)
- [ ] Write grammar tests on the boundary layer — test parse success and failure for every rule
- [ ] Keep error messages specific: include line number, expected tokens, and context

---

## When to Use

Use this skill when:

- Designing a configuration language for your application that domain stakeholders need to edit directly
- Building a query or rule engine where users write expressions in a constrained vocabulary (e.g., "if temperature > 100 then alert")
- Creating an embedded DSL in Python using decorators, context managers, or method chaining to express domain concepts naturally
- Implementing an external language with a dedicated parser for data transformation pipelines, templating systems, or workflow definitions
- Replacing complex if/elif chains or nested dictionary configurations with a purpose-built syntax
- Converting business rules from documentation into executable, testable rule files

---

## When NOT to Use

Avoid this skill for:

- Simple JSON or YAML configuration — those formats already serve the purpose; adding a DSL adds cognitive overhead without benefit
- Domain-Driven Design (DDD) bounded context modeling — use design patterns architecture instead
- General-purpose programming languages — if the language needs Turing completeness, use Python or Go directly
- One-off scripts with ad-hoc parsing needs — regex or simple string splitting is sufficient for trivial cases
- Performance-critical hot paths where parser overhead matters — pre-compute and cache parsed results, do not re-parse at runtime

---

## Core Workflow

1. **Decide Embedded vs External** — Evaluate three criteria: Who writes the DSL? How complex is the syntax? Do you need IDE or tooling support?
    - Developers as users with moderate complexity → Embedded DSL in the host language
    - Domain experts (non-programmers) as users → External DSL with a standalone parser
    - Existing data formats needing validation → Embedded DSL using existing parsers (Pydantic for JSON, Go struct tags for YAML)
    **Checkpoint:** Write one sentence: "This DSL is embedded or external because the audience needs to create or query the use case."

2. **Define the Grammar in EBNF** — Before any code, write out the complete grammar in Extended Backus-Naur Form. This forces clarity on what tokens exist, how rules nest, and where ambiguities might arise. Example:
    ```ebnf
    rule: expression (AND | OR expression)* ;
    expression: term ("==" | "!=" | ">" | "<") term ;
    term: IDENTIFIER | NUMBER | STRING ;
    ```
    **Checkpoint:** Every keyword, operator, and literal type from the intended syntax must appear in the grammar. No implicit rules — if a user can write it, it is in the EBNF.

3. **Choose the Parser Generator** — Select based on host language and complexity:
    - Python with simple to medium grammar → Lark (PEG-based, auto-generates AST)
    - Python with complex grammar needing custom tree visitors → ANTLR4 with Python runtime
    - Go with medium grammar → participle or hand-written recursive descent
    - Rust with performance-critical parsing → nom combinator or chumsky (PEG, zero-copy)
    **Checkpoint:** The chosen parser must produce a tree structure you can traverse — no ad-hoc string matching.

4. **Build the AST Model** — Define typed nodes for every grammar rule. In Python, use dataclasses with explicit types and helper methods; in Go, use interface-based trees or struct types. Never return raw lists or dicts from the parser.
    **Checkpoint:** Every AST node has at minimum a type discriminator and immutable child references. Add validate methods that check semantic invariants (e.g., every condition must have a left operand).

5. **Implement the Execution Engine** — Walk the AST with a visitor or interpreter pattern. The execution engine is pure: it takes an AST plus context, returns a result. No I/O, no side effects at this layer.
    **Checkpoint:** Run the engine against every grammar test case from step 6. Verify output matches expected results exactly.

6. **Write Grammar and Integration Tests** — Test three categories: valid inputs parse correctly, invalid inputs fail with descriptive errors, and edge cases (empty input, deeply nested expressions, Unicode) are handled gracefully.
    **Checkpoint:** Every grammar rule has at least one success test and one failure test. Use parametrized tests for bulk coverage of operators, literals, and combinations.

7. **Add Schema Validation for Config DSLs** — For configuration languages, validate parsed output against a JSON Schema or Pydantic model to catch semantic errors the parser cannot detect (missing required fields, invalid enum values).
    **Checkpoint:** Run validation on every production config file as part of CI — reject configs that parse but fail schema validation.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Embedded DSL with Python Decorators and Context Managers

This pattern shows a rule engine embedded DSL using class decorators for rule registration and context managers for scoped evaluation. The `@rule` decorator registers functions in a global registry with metadata (priority, name). The `RuleEngineContext` provides a controlled execution environment with variable scoping and error tracking. This eliminates the need for external configuration files while giving domain experts a Pythonic syntax.

```python
"""Rule Engine — Embedded DSL using decorators and context managers."""

from __future__ import annotations

import dataclasses
import inspect
from contextlib import AbstractContextManager
from typing import Any, Callable, ClassVar


@dataclasses.dataclass(frozen=True)
class Rule:
    """Immutable rule record produced by the @rule decorator."""

    name: str
    func: Callable[..., bool]
    priority: int = 0
    description: str = ""

    def evaluate(self, context: dict[str, Any]) -> bool:
        sig = inspect.signature(self.func)
        bound = sig.bind(context=context)
        bound.apply_defaults()
        return bool(self.func(**bound.arguments))


class RuleRegistry:
    """Thread-safe registry of named rules."""

    _rules: ClassVar[dict[str, Rule]] = {}

    @classmethod
    def register(cls, func: Callable) -> Rule:
        rule = Rule(
            name=func.__name__,
            func=func,
            priority=func.__dict__.get("priority", 0),
            description=func.__doc__ or "",
        )
        cls._rules[rule.name] = rule
        return rule

    @classmethod
    def get(cls, name: str) -> Rule | None:
        return cls._rules.get(name)

    @classmethod
    def list_all(cls) -> list[Rule]:
        return sorted(cls._rules.values(), key=lambda r: -r.priority)


def rule(priority: int = 0) -> Callable:
    """Decorator that registers a function as a named rule in the global registry.

    Example usage::

        @rule(priority=10)
        def is_urgent(context):
            return context.get("severity", 0) >= 8

        @rule(priority=5)
        def belongs_to_team(context):
            return context.get("team") == "platform"
    """

    def decorator(func: Callable) -> Rule:
        return RuleRegistry.register(func)

    return decorator


class RuleEngineContext(AbstractContextManager):
    """Scoped execution environment for rule evaluation.

    Tracks which rules evaluated, their results, and any errors encountered.
    Uses context-manager protocol so it can be used with 'with' statements
    for clear lifecycle management.
    """

    def __init__(self) -> None:
        self.variables: dict[str, Any] = {}
        self.evaluation_log: list[dict[str, Any]] = []
        self.errors: list[Exception] = []

    def set(self, key: str, value: Any) -> None:
        self.variables[key] = value

    def evaluate_all(self) -> dict[str, bool]:
        """Run all registered rules against current variables. Returns results dict."""
        results: dict[str, bool] = {}
        for rule_obj in RuleRegistry.list_all():
            try:
                results[rule_obj.name] = rule_obj.evaluate(self.variables)
                self.evaluation_log.append({
                    "rule": rule_obj.name,
                    "result": results[rule_obj.name],
                })
            except Exception as exc:
                self.errors.append(exc)
                self.evaluation_log.append({
                    "rule": rule_obj.name,
                    "error": str(exc),
                })
        return results

    def __enter__(self) -> RuleEngineContext:
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is not None:
            self.errors.append(exc_val or exc_type())


# =================================================================== #
# BAD: Unstructured rule logic with no registry, no priority, no error handling
# =================================================================== #

def check_severity(context):
    """Checks if severity is high."""
    return context["severity"] > 5  # KeyError on missing key, no logging


def check_team(context):
    return context["team"] == "platform"


def run_rules_broken(context):
    """Ad-hoc rule execution — impossible to extend without editing this function."""
    if check_severity(context) and check_team(context):
        return True
    return False  # No insight into which rules passed or failed, no priority ordering


# =================================================================== #
# GOOD: Decorator-based embedded DSL with full registry and context management
# =================================================================== #

@rule(priority=10)
def is_high_severity(context: dict[str, Any]) -> bool:
    """Rule: triggers when severity exceeds the critical threshold."""
    return context.get("severity", 0) >= 8


@rule(priority=5)
def belongs_to_platform_team(context: dict[str, Any]) -> bool:
    """Rule: verifies the incident is owned by the platform team."""
    return context.get("team") == "platform"


@rule(priority=3)
def has_no_escalation(context: dict[str, Any]) -> bool:
    """Rule: passes only if escalation has not yet been triggered."""
    return not context.get("escalated", False)


# Execution with context manager for scoped evaluation
with RuleEngineContext() as engine:
    engine.set("severity", 9)
    engine.set("team", "platform")
    engine.set("escalated", False)

    results = engine.evaluate_all()
    # Results: {'is_high_severity': True, 'belongs_to_platform_team': True, 'has_no_escalation': True}

```

### Pattern 2: External DSL with Lark (PEG Parser) — Configuration Language

This pattern implements an external configuration language using Lark, a Python PEG parser generator. The grammar is defined in EBNF within the code (or a .lark file for production use). The parser auto-generates a parse tree, which we convert into typed dataclass nodes. A schema validator catches semantic errors after parsing. This approach is ideal when domain stakeholders need to write configurations in a custom syntax that is more expressive than JSON but simpler than full Python.

```python
"""Configuration DSL — External language using Lark PEG parser."""

from __future__ import annotations

import dataclasses
from pathlib import Path
from typing import Any

from lark import Lark, Transformer, v_args


# =================================================================== #
# Grammar Definition (EBNF)
# =================================================================== #
# This grammar defines a simple configuration language supporting:
#   - Key-value pairs with string, number, and boolean values
#   - Nested sections via braces
#   - Variable interpolation: ${VAR_NAME} in string values
#   - Comments with #
# =================================================================== #

CONFIG_GRAMMAR = r"""
    start: section

    section: ("#" any*)*  // comment lines
           | IDENT "=" value
           | IDENT "{" section+ "}"  // nested section/block

    value: STRING          -> string
         | NUMBER          -> number
         | BOOLEAN         -> boolean
         | INTERPOLATION   -> interpolation

    IDENT: /[a-zA-Z_][a-zA-Z0-9_]*/
    STRING: /"[^"]*"/
    NUMBER: /[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/
    BOOLEAN: "true" | "false"
    INTERPOLATION: "${" IDENT "}"

    %import common.WS
    %ignore WS
"""


# =================================================================== #
# AST Node Definitions — Typed dataclasses, never raw dicts
# =================================================================== #

@dataclasses.dataclass(frozen=True)
class ConfigNode:
    """Base class for all configuration AST nodes."""

    @property
    def children(self) -> list["ConfigNode"]:
        return []


@dataclasses.dataclass(frozen=True)
class SectionNode(ConfigNode):
    """Named configuration section with key-value pairs and nested sections."""

    name: str | None  # None for root section
    entries: dict[str, ConfigNode] = dataclasses.field(default_factory=dict)

    def get(self, key: str, default: Any = None) -> Any:
        node = self.entries.get(key)
        if node is None:
            return default
        if isinstance(node, ValueNode):
            return node.value
        return node


@dataclasses.dataclass(frozen=True)
class ValueNode(ConfigNode):
    """Leaf node containing a primitive value (string, number, boolean)."""

    value: str | float | bool
    raw: str  # Original text from source

    @property
    def kind(self) -> str:
        if isinstance(self.value, bool):
            return "boolean"
        if isinstance(self.value, (int, float)):
            return "number"
        return "string"


@dataclasses.dataclass(frozen=True)
class InterpolationNode(ConfigNode):
    """Variable reference node: ${VAR_NAME}."""

    variable_name: str


# =================================================================== #
# Lark Transformer — Converts parse tree into AST
# =================================================================== #

@v_args(inline=True)
class ConfigTransformer(Transformer):
    """Transforms a Lark parse tree into our typed ConfigNode AST."""

    def start(self, children):
        return SectionNode(name=None, entries=dict(children))

    def section(self, children):
        entries: dict[str, ConfigNode] = {}
        for child in children:
            if isinstance(child, tuple) and len(child) == 2:
                key, value = child
                entries[key] = value
            elif isinstance(child, SectionNode):
                if child.name:
                    entries[child.name] = child
        return SectionNode(name=None, entries=entries)

    def IDENT(self, token):
        return str(token)

    def string(self, children):
        raw = str(children[0])
        return ValueNode(value=raw[1:-1], raw=raw)  # Strip quotes

    def number(self, children):
        raw = str(children[0])
        value: float | int
        if "." in raw or "e" in raw.lower():
            value = float(raw)
        else:
            value = int(raw)
        return ValueNode(value=value, raw=raw)

    def boolean(self, children):
        raw = str(children[0])
        return ValueNode(value=(raw == "true"), raw=raw)

    def interpolation(self, children):
        raw = str(children[0])
        var_name = raw[2:-1]  # Strip ${}
        return InterpolationNode(variable_name=var_name)


# =================================================================== #
# Schema Validation — Catches semantic errors the parser misses
# =================================================================== #

class ConfigValidationError(Exception):
    """Raised when configuration fails schema validation."""

    def __init__(self, path: str, message: str):
        self.path = path
        self.message = message
        super().__init__(f"{path}: {message}")


def validate_config(section: SectionNode) -> None:
    """Validate configuration against semantic constraints.

    Rules enforced:
    - Every SECTION node must have a non-empty name (except root)
    - No two keys in the same scope may have identical names (case-sensitive)
    """
    _validate_node(section, path="$", required_keys={"name": str})


def _validate_node(node: ConfigNode, path: str, required_keys: dict[str, type]) -> None:
    if isinstance(node, SectionNode):
        for key, expected_type in required_keys.items():
            attr = getattr(node, key, None)
            if attr is None or not isinstance(attr, expected_type):
                raise ConfigValidationError(
                    path, f"Missing or invalid required field '{key}' (expected {expected_type.__name__})"
                )
        for key, child in node.entries.items():
            child_path = f"{path}.{key}"
            _validate_node(child, child_path, {})

    elif isinstance(node, InterpolationNode):
        # In production: cross-reference with a variable env to ensure ${VAR} exists
        pass


# =================================================================== #
# Public API — Parse and validate configuration
# =================================================================== #

def parse_config(source: str | Path) -> SectionNode:
    """Parse a configuration language source string into an AST.

    Args:
        source: Configuration text or path to file containing config.

    Returns:
        Root SectionNode representing the parsed configuration tree.

    Raises:
        lark.exceptions.LarkError: If the grammar is violated (syntax error).
    """
    if isinstance(source, Path):
        source = source.read_text()

    parser = Lark(CONFIG_GRAMMAR, parser="lalr", propagate_positions=True)
    tree = parser.parse(source)
    ast = ConfigTransformer().transform(tree)
    return ast  # type: ignore[return-value]


def load_and_validate(source: str | Path) -> SectionNode:
    """Parse configuration and run schema validation in one call."""
    ast = parse_config(source)
    validate_config(ast)
    return ast


# =================================================================== #
# Usage Example
# =================================================================== #

config_text = """
app_name "MyService"
debug false

database {
  host "localhost"
  port 5432
  name "mydb"
}
"""

ast = load_and_validate(config_text)
db_section = ast.entries.get("database")
if isinstance(db_section, SectionNode):
    host_val = db_section.get("host")   # "localhost"
    port_val = db_section.get("port")   # 5432
    print(f"Connecting to {host_val}:{port_val}/{db_section.get('name')}")

```

### Pattern 3: Schema-Driven Validation with Pydantic for Config DSLs

For embedded configuration DSLs built on top of JSON or YAML, use Pydantic v2 models to enforce structure at the boundary. This pattern validates that parsed data conforms to the expected schema before it reaches business logic. The key insight is that validation belongs at the parsing boundary, not inside domain handlers.

```python
"""Pydantic-driven schema validation for configuration DSLs."""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# =================================================================== #
# Domain Enums — Restrict allowed values at the type level
# =================================================================== #

class LogLevel(str, Enum):
    """Supported log levels for the application."""

    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class DatabaseDriver(str, Enum):
    """Supported database drivers."""

    POSTGRES = "postgres"
    MYSQL = "mysql"
    SQLITE = "sqlite"


# =================================================================== #
# Nested Models — Hierarchical structure validation
# =================================================================== #

class DatabaseConfig(BaseModel):
    """Database connection configuration with validation rules."""

    model_config = ConfigDict(strict=True)

    driver: DatabaseDriver
    host: str = Field(..., min_length=1, max_length=253)
    port: int = Field(default=5432, ge=1, le=65535)
    name: str = Field(..., min_length=1, pattern="^[a-zA-Z0-9_]+$")
    pool_size: int = Field(default=5, ge=1, le=100)
    ssl_mode: Optional[str] = Field(None, pattern="^(disable|require|verify-ca|verify-full)$")

    @field_validator("port")
    @classmethod
    def validate_port_for_driver(cls, v: int, info) -> int:
        """MySQL requires port 3306 as default; enforce if driver is MySQL."""
        if getattr(info.data, "driver", None) == DatabaseDriver.MYSQL and v == 5432:
            raise ValueError("MySQL requires default port 3306, not PostgreSQL's 5432")
        return v


class ServerConfig(BaseModel):
    """HTTP server configuration."""

    model_config = ConfigDict(strict=True)

    host: str = Field(default="0.0.0.0", description="Bind address")
    port: int = Field(default=8080, ge=1024, le=65535, description="Port (privileged ports excluded)")
    max_connections: int = Field(default=1024, ge=1, le=10000)
    log_level: LogLevel = Field(default=LogLevel.INFO)
    cors_origins: list[str] = Field(default_factory=list)


class AppConfig(BaseModel):
    """Root application configuration — top-level schema."""

    model_config = ConfigDict(strict=True)

    app_name: str = Field(..., min_length=1, max_length=63, pattern="^[a-z][a-z0-9_-]*$")
    version: str = Field(
        ...,
        pattern=r"^\d+\.\d+\.\d+$",
        description="Semantic versioning format",
    )
    server: ServerConfig = Field(default_factory=ServerConfig)
    database: DatabaseConfig
    features: dict[str, bool] = Field(default_factory=dict)

    @field_validator("features")
    @classmethod
    def validate_feature_flags(cls, v: dict[str, bool]) -> dict[str, bool]:
        """Ensure feature flag keys follow naming convention."""
        for key in v:
            if not key.startswith(("enable_", "disable_", "experimental_")):
                raise ValueError(
                    f"Feature flags must start with 'enable_', 'disable_', or 'experimental_' — got '{key}'"
                )
        return v


# =================================================================== #
# BAD: Untyped dict with no schema — errors surface deep in the call stack
# =================================================================== #

def bad_config_handler(raw_config: dict[str, Any]) -> None:
    """This function has zero validation — crashes when keys are missing or wrong types."""
    # KeyError if 'database' is missing
    db = raw_config["database"]
    # TypeError if port is a string instead of int
    port = db["port"] + 1000
    # No validation on enum-like fields — any string is accepted
    log_level = db.get("log_level", "debug")


# =================================================================== #
# GOOD: Pydantic models at the boundary — errors caught immediately with context
# =================================================================== #

def load_and_validate(raw_json: dict[str, Any]) -> AppConfig:
    """Parse and validate configuration at the system boundary.

    Returns a fully validated AppConfig instance. Raises ValidationError
    with detailed field-level information if any constraint is violated.
    """
    return AppConfig.model_validate(raw_json)


# Usage in production:
# config = load_and_validate(json.loads(config_file.read_text()))
# Now config.server and config.database are guaranteed to be valid.

```

---

## Constraints

### MUST DO

- **Decide embedded vs external before writing code** — Embedded DSLs (decorators, context managers, builder patterns) when developers are the audience; external DSLs with dedicated parsers when domain experts or non-programmers write the language
- **Define grammar in EBNF first** — Every keyword, operator, and literal type must appear explicitly. No implicit rules. This forces design decisions before implementation begins.
- **Model AST nodes as typed dataclasses or struct types** — Never return raw dicts or lists from a parser. Each node should have at minimum a type discriminator and immutable child references. Add validate methods that check semantic invariants (e.g., every condition must have left and right operands).
- **Place schema validation at the parsing boundary** — Use Pydantic v2 models for Python config DSLs, JSON Schema validators, or custom schema checks before any business logic runs. Never validate inside handlers.
- **Write grammar tests on three axes** — Valid inputs parse successfully, invalid inputs fail with descriptive errors including line and column numbers, and edge cases (empty input, deeply nested structures, Unicode) are handled gracefully.
- **Keep the execution engine pure** — It takes an AST plus context as input, returns a result. No I/O, no side effects at this layer. This enables deterministic testing of every grammar rule.
- **Reference SOLID principles for parser architecture** — Single Responsibility (lexer, parser, transformer are separate), Open/Closed (add new AST node types without modifying the visitor interface), and Dependency Inversion (execution engine depends on AST abstraction, not concrete node types).

### MUST NOT DO

- **Use if/elif chains or regex for multi-rule parsing** — Regex is appropriate for single patterns but becomes unmaintainable with nested structures. Use a proper parser generator or recursive descent parser for anything beyond simple key-value pairs.
- **Accept unvalidated input into domain logic** — Even embedded DSLs must validate at the boundary. A KeyError deep in handler code means validation happened too late.
- **Use magic numbers in grammar rules** — If a field has constraints (port range, enum values), those are enforced by schema validation, not hidden in parser token definitions.
- **Create parsers that silently drop invalid syntax** — Every parse error must include the location (line/column) and what tokens were expected. Silent failures make debugging production config issues nearly impossible.
- **Mix parsing logic with business rules** — The parser produces an AST; the execution engine evaluates it. These layers must be independently testable. Do not embed business logic inside parser grammar rules.
- **Write external DSL grammars that are Turing-complete** — If a user needs full computational power, use Python or Go directly. External DSLs should be purpose-constrained for safety and simplicity (designer principle: least privilege for the language).

---

## Output Template

When this skill is active, the model's output for a DSL engineering task must contain:

1. **Decision Rationale** — Embedded or external? Justified by audience analysis and complexity assessment
2. **Grammar Specification** — Complete EBNF grammar with all terminals (tokens) and non-terminals (rules)
3. **AST Node Definitions** — Typed dataclasses or struct types with fields, constructors, and helper methods for every grammar rule
4. **Parser Implementation** — Working parser code using the chosen generator (Lark, ANTLR4, Go recursive descent, etc.) with position tracking on errors
5. **Schema Validation Layer** — Pydantic models or equivalent that enforce semantic constraints beyond syntax
6. **Execution Engine** — Pure function or visitor pattern that evaluates AST plus context to result
7. **Test Suite** — Parametrized tests covering valid inputs (pass), invalid inputs (fail with errors), and edge cases
8. **Usage Example** — A minimal working example showing how a user writes DSL content, parses it, validates it, and executes it

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-api-design` | Design APIs that expose DSL functionality to application consumers |
| `coding-testing-patterns` | Write comprehensive grammar and integration tests for DSL implementations |
| `coding-code-validation` | Apply schema validation patterns (Pydantic, JSON Schema) for DSL input verification |

---

## Live References

> Authoritative documentation links for DSL engineering, parser generation, and language design.

- [Lark Documentation](https://lark-parser.readthedocs.io/) — Python PEG parser generator with auto-AST construction and LALR mode
- [ANTLR4 Official Guide](https://www.antlr.org/manual/) — Industry-standard parser generator supporting multiple target languages including Python, Go, and Java
- [The Definitive Grammar Reference (Tiger Book)](https://xion.github.io/tiger/) — Comprehensive guide to grammar formalisms from regular expressions to PEG
- [Designing DSLs with Scala](https://www.artima.com/pins1ed/objects-in-depth-3.html) — Principles of embedded DSL design applicable to Python and Go
- [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/) — Schema validation for configuration DSLs and input boundaries
- [Recursive Descent Parsing (Wikipedia)](https://en.wikipedia.org/wiki/Recursive_descent_parser) — Algorithm reference for hand-written parsers in Go and other languages
