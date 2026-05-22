---
name: modern-python-development
description: Implements modern Python 3.10+ development practices including structural union types, TypeAlias, Self, ParamSpec, TaskGroup structured concurrency, httpx async patterns, and pyproject.toml-based project structure with uv.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: python typing, python 3.12, python 3.11, TypeAlias, ParamSpec, asyncio TaskGroup, structured concurrency, pyproject.toml, uv package manager, httpx async, python project structure, self type, override decorator, modern python, python best practices 2026
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: python-testing-strategies, go-concurrency-patterns, python-package-publishing
---

# Modern Python Development (3.10+)

Implements modern Python development practices for Python 3.10 through 3.13+, covering structural union types, explicit type aliases, fluent interface patterns with Self, decorator signature preservation with ParamSpec, TaskGroup structured concurrency, httpx async I/O, and pyproject.toml-based project structure with uv as the package manager.

## TL;DR Checklist

- [ ] Use `X | Y` for unions instead of `typing.Union[X, Y]`
- [ ] Use `TypeAlias` annotation for all type aliases — never bare assignment
- [ ] Use `Self` (PEP 673) for fluent interface method return types
- [ ] Use `@override` (PEP 698) on every class method override
- [ ] Use `ParamSpec` + `Concatenate` to preserve function signatures through decorators
- [ ] Replace `asyncio.create_task()` fire-and-forget with `asyncio.TaskGroup`
- [ ] Wrap all timeout logic in `asyncio.timeout()` context manager — never `wait_for()`
- [ ] Offload blocking I/O with `asyncio.to_thread()` — never run sync code on the event loop
- [ ] Use httpx for async HTTP — never requests inside async functions
- [ ] Structure projects with single pyproject.toml and uv (no requirements.txt, no setup.py)

---

## When to Use

Use this skill when:

- Writing new Python code targeting 3.10+ and wanting modern type annotations
- Refactoring legacy Python code that uses `Union[]`, `Optional[]`, or bare type alias assignments
- Implementing async functions with I/O — choosing between TaskGroup, gather(), or fire-and-forget tasks
- Setting up a new Python project — choosing pyproject.toml structure, build backend, and package manager
- Writing decorators that wrap functions and need to preserve the wrapped function's signature for type checkers
- Implementing fluent/chainable APIs with methods returning `self`

---

## When NOT to Use

Avoid this skill for:

- Maintaining Python 3.9 or earlier codebases (these features require 3.10+ runtime)
- Performance-critical numerical computing — use NumPy/NumPy-like patterns instead of typing-focused guidance
- Project setup for teams committed to Poetry or pipenv — the uv + pyproject.toml approach is explicitly different

---

## Core Workflow

### Part A: Typing (3.10+)

1. **Assess type annotation needs** — For every public function, determine if parameters and return values benefit from explicit types. Private/internal functions without external callers can skip annotations unless they are complex or error-prone.

   **Checkpoint:** Every function signature exposed to other modules must have typed parameters and return values.

2. **Apply structural union syntax** — Replace `typing.Union[X, Y]` with `X | Y` and `typing.Optional[X]` with `X | None`. Use `from __future__ import annotations` only when circular references require deferred evaluation of type expressions.

   ```python
   # ❌ BAD — legacy typing module usage (Python 3.9 and earlier)
   from typing import Union, Optional, List, Dict

   def process(
       items: Union[str, bytes],
       metadata: Optional[Dict[str, Union[int, str]]] = None
   ) -> List[str]:
       ...
   ```

3. **Apply explicit TypeAlias for named types** — Every type alias must use the `TypeAlias` annotation from `typing`. Bare assignment creates a structurally equivalent name that loses identity across all checkers.

   ```python
   # ❌ BAD — bare assignment loses type identity; mypy and pyright treat this as dict[str, Any]
   JsonPayload = dict[str, Any]
   UserId = int

   # ✅ GOOD — explicit TypeAlias preserves distinct identity for type checkers
   from typing import TypeAlias

   JsonPayload: TypeAlias = dict[str, Any]
   UserId: TypeAlias = int
   ```

4. **Apply Self for fluent interfaces** — Methods returning `self` must use `typing.Self` (PEP 673) instead of string-quoted class names. This preserves the actual subclass type through method chains.

   ```python
   # ❌ BAD — returns the declaring class, losing subclass identity through chains
   from typing import TYPE_CHECKING

   if TYPE_CHECKING:
       pass

   class QueryBuilder:
       def where(self, field: str, value: str) -> "QueryBuilder":
           return self

       def order_by(self, field: str) -> "QueryBuilder":
           return self

   # ❌ BAD — string-quoted name is fragile and breaks with complex inheritance

   # ✅ GOOD — Self preserves actual class type through chains
   from typing import Self

   class QueryBuilder:
       def where(self, field: str, value: str) -> Self:
           return self

       def order_by(self, field: str) -> Self:
           return self


   class AdvancedQueryBuilder(QueryBuilder):
       def filter(self, condition: str) -> Self:
           return self


   # Type checker knows the full chain returns AdvancedQueryBuilder
   qb = AdvancedQueryBuilder().where("name", "test").order_by("name").filter("active")
   reveal_type(qb)  # AdvancedQueryBuilder (not QueryBuilder)
   ```

5. **Apply ParamSpec and Concatenate for decorators** — Decorators must preserve the wrapped function's signature using `ParamSpec` for argument capture and `Concatenate` when injecting locked parameters.

   ```python
   # ❌ BAD — decorator completely loses function signature; type checker sees Callable[..., Any]
   import functools
   from typing import Any, Callable

   def authenticate(f: Callable[..., Any]) -> Callable[..., Any]:
       @functools.wraps(f)
       async def wrapper(*args: Any, **kwargs: Any) -> Any:
           check_auth()
           return await f(*args, **kwargs)
       return wrapper


   # ✅ GOOD — ParamSpec preserves exact parameter types through the decorator layer
   from typing import ParamSpec, TypeVar

   P = ParamSpec("P")
   R = TypeVar("R")

   def authenticate(f: Callable[P, R]) -> Callable[P, R]:
       @functools.wraps(f)
       async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
           check_auth()
           return await f(*args, **kwargs)
       return wrapper

   # Type checker knows: @decorate(async def fetch_user(id: int) -> User: ...)
   # still has signature (id: int) -> User


   # ✅ GOOD — Concatenate locks a parameter at the front (e.g., injected dependency)
   from typing import Concatenate

   DB = object  # simplified for example

   def with_db(f: Callable[Concatenate[DB, P], R]) -> Callable[P, R]:
       @functools.wraps(f)
       async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
           db = get_db()  # injected dependency
           return await db(db, *args, **kwargs)
       return wrapper

   @with_db
   async def fetch_user(db: DB, user_id: int) -> User:
       ...

   # Caller passes only (user_id=42); type checker infers the DB parameter automatically
   ```

6. **Apply @override on every method override** — Every method that overrides a parent class method must use `@override` (PEP 698, Python 3.12+) to catch renames and misspellings at static analysis time.

   ```python
   # ❌ BAD — silent bug if parent method is renamed or subclass misspells
   class HTTPClient(BaseHTTPClient):
       def send_request(self, req: Request) -> Response:  # typo in name? No error.
           ...


   # ✅ GOOD — type checker catches override errors immediately
   from typing import override

   class HTTPClient(BaseHTTPClient):
       @override
       def send_request(self, req: Request) -> Response:
           return self._dispatch(req)

       @override
       def close(self) -> None:
           ...
   ```

### Part B: Async Patterns (3.11+)

7. **Use TaskGroup for structured concurrency** — Replace `asyncio.create_task()` fire-and-forget patterns with `asyncio.TaskGroup` (Python 3.11+). Every spawned task must have a defined scope and lifecycle.

   ```python
   # ❌ BAD — fire-and-forget creates orphaned tasks; exceptions are lost or raise at cleanup
   async def fetch_all_bad(urls: list[str]) -> dict[str, Any]:
       results = {}
       for url in urls:
           task = asyncio.create_task(_fetch_json(url))  # No tracking!
           results[url] = await task  # Exceptions from earlier tasks mask later ones

       return results


   # ✅ GOOD — TaskGroup provides structured scope with guaranteed cleanup
   import asyncio
   import httpx

   async def fetch_all(urls: list[str]) -> dict[str, Any]:
       async with asyncio.TaskGroup() as tg:
           tasks: dict[str, asyncio.Task] = {
               url: tg.create_task(_fetch_json(url)) for url in urls
           }
       # All tasks completed (success or failure). ExceptionGroup raised if any failed.
       return {url: task.result() for url, task in tasks.items()}


   # ✅ GOOD — handle multiple error types with except* syntax (Python 3.11+)
   async def fetch_all_with_error_handling(urls: list[str]) -> dict[str, Any]:
       try:
           async with asyncio.TaskGroup() as tg:
               tasks: dict[str, asyncio.Task] = {
                   url: tg.create_task(_fetch_json(url)) for url in urls
               }
       except* ValueError as eg:
           # Handle each validation error separately
           for exc in eg.exceptions:
               log_validation_error(exc)
           raise RuntimeError("Some requests failed validation") from eg
       except* ConnectionError as eg:
           # Retry failed connections only
           retryable = [exc for exc in eg.exceptions]
           await retry_connections(retryable)
           raise RuntimeError(f"{len(retryable)} connections failed after retry") from eg

       return {url: task.result() for url, task in tasks.items()}
   ```

8. **Use asyncio.timeout() instead of wait_for()** — Replace `asyncio.wait_for()` with the `asyncio.timeout()` context manager (Python 3.11+). The timeout raises plain `TimeoutError`, not asyncio-specific exceptions.

   ```python
   # ❌ BAD — wait_for() is deprecated; mixes cancellation and timeout semantics
   import asyncio

   async def fetch_with_timeout_bad(url: str) -> Response:
       try:
           result = await asyncio.wait_for(fetch_data(url), timeout=5.0)
           return result
       except asyncio.TimeoutError:
           handle_error()


   # ✅ GOOD — explicit context manager with clean cancellation propagation
   async def fetch_with_timeout(url: str) -> Response:
       try:
           async with asyncio.timeout(5.0):
               return await fetch_data(url)
       except TimeoutError:  # Plain built-in TimeoutError, not asyncio-specific
           handle_error()
   ```

9. **Offload blocking I/O with asyncio.to_thread()** — Never run synchronous blocking code directly in an async function body. Use `asyncio.to_thread()` to schedule it on the thread pool.

   ```python
   # ❌ BAD — blocks the entire event loop; no other coroutines can make progress
   def heavy_computation(data: bytes) -> str:
       return expensive_processing(data)  # Blocks event loop for potentially seconds

   async def process_request_bad(data: bytes):
       result = heavy_computation(data)  # BUG: blocks everything
       return format_response(result)


   # ✅ GOOD — offloads to thread pool; event loop remains responsive
   import asyncio

   async def process_request(data: bytes):
       result = await asyncio.to_thread(heavy_computation, data)
       return format_response(result)
   ```

10. **Use httpx for all async HTTP** — Never use `requests` inside async code. Use `httpx.AsyncClient` with connection pooling and proper lifetime management.

    ```python
    # ❌ BAD — requests is synchronous; wrapping in to_thread is awkward and sequential
    import requests

    async def fetch_multiple_bad(urls: list[str]) -> list[dict]:
        results = []
        for url in urls:
            data = await asyncio.to_thread(requests.get, url).json()
            results.append(data)  # Sequential — slow, one at a time
        return results


    # ✅ GOOD — native async with connection pooling and parallel execution
    import httpx

    async def fetch_multiple(urls: list[str]) -> list[dict]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            responses = await asyncio.gather(
                *(client.get(url) for url in urls),
                return_exceptions=True
            )
        return [r.json() for r in responses if isinstance(r, httpx.Response)]

    # Note: always use async with to ensure AsyncClient is properly closed
    # Always set explicit timeout to prevent indefinite hangs
    ```

### Part C: Project Structure (pyproject.toml + uv)

11. **Create pyproject.toml as the single configuration file** — Eliminate requirements.txt, setup.py, and setup.cfg. Everything goes in pyproject.toml with a modern build backend.

    ```toml
    # ✅ GOOD — minimal but complete pyproject.toml (PEP 621 compliant)
    [project]
    name = "my-project"
    version = "0.1.0"
    description = "A concise one-line description of what this project does"
    readme = "README.md"
    requires-python = ">=3.12"
    dependencies = [
        "httpx>=0.28",
        "pydantic>=2.10",
    ]

    [project.optional-dependencies]
    dev = [
        "pytest>=8.3",
        "pytest-asyncio>=0.25",
        "ruff>=0.9",
        "mypy>=1.14",
    ]

    [project.scripts]
    my-cli = "my_project.cli:main"

    [build-system]
    requires = ["hatchling"]
    build-backend = "hatchling.build"

    [tool.uv]
    dev-dependencies = [
        "pytest>=8.3",
        "ruff>=0.9",
        "mypy>=1.14",
    ]

    [tool.ruff]
    target-version = "py312"
    line-length = 100

    [tool.ruff.lint]
    select = ["E", "F", "I", "UP", "B", "SIM", "RUF"]

    [tool.pytest.ini_options]
    asyncio_mode = "auto"

    [tool.mypy]
    python_version = "3.12"
    strict = true
    warn_return_any = true
    ```

12. **Choose src/ layout for libraries, flat for scripts** — Libraries must use `src/` layout to prevent importing from the source root in development (which masks packaging issues). Scripts can use flat layout for simplicity.

    ```
    # Library project — src layout (MANDATORY for packages)
    my_library/
    ├── pyproject.toml
    ├── README.md
    ├── uv.lock              # committed lockfile for reproducibility
    ├── src/
    │   └── my_library/
    │       ├── __init__.py
    │       ├── core.py      # main module
    │       └── cli.py       # CLI entry point
    └── tests/
        ├── __init__.py
        └── test_core.py

    # Script project — flat layout (acceptable for single-file or small tools)
    my_script/
    ├── pyproject.toml
    ├── main.py
    └── uv.lock
    ```

13. **Use uv commands as the single interface** — Never manually manage virtualenvs. Use `uv add` to install, `uv run` to execute, and `uv sync` to resolve. Always commit `uv.lock`.

    ```bash
    # Create a new project (auto-generates pyproject.toml + src layout)
    uv init my-project
    cd my-project

    # Add production dependencies (instant resolution, updates lockfile)
    uv add httpx pydantic

    # Add development dependencies
    uv add --dev pytest ruff mypy

    # Run code with correct environment — no venv activation needed
    uv run python -m my_project.cli
    uv run pytest
    uv run ruff check .
    uv run mypy src/

    # Sync all dependencies from lockfile (deterministic)
    uv sync

    # Update all packages to newest compatible versions
    uv lock --upgrade
    ```

---

## Constraints

### MUST DO
- Use `X | Y` union syntax instead of `typing.Union[X, Y]` for all Python 3.10+ code
- Annotate every type alias with `TypeAlias` — never use bare assignment for named types
- Use `Self` (PEP 673) for fluent interface method return types — never string-quoted class names
- Apply `@override` (PEP 698) on every method that overrides a parent class method
- Preserve function signatures through decorators using `ParamSpec` and `Concatenate`
- Use `asyncio.TaskGroup()` for all multi-task spawning — never bare `create_task()` outside context
- Wrap async I/O in `asyncio.timeout()` with explicit timeout values — every I/O operation needs one
- Offload blocking synchronous code with `asyncio.to_thread()` — never run sync I/O on the event loop
- Use httpx.AsyncClient for all async HTTP — never requests or aiohttp inside async functions
- Structure all libraries with src/ layout and single pyproject.toml — no requirements.txt, no setup.py
- Commit the lockfile (`uv.lock` or `poetry.lock`) for deterministic builds
- Pin `requires-python` to a minimum version in pyproject.toml (e.g., `>=3.12`)

### MUST NOT DO
- Use bare type alias assignment (`JsonType = dict[str, Any]`) — always use `TypeAlias` annotation
- Use string-quoted forward references for return types of methods returning self — use `Self`
- Ignore errors from `asyncio.create_task()` outside a TaskGroup context — orphaned tasks lose exceptions
- Mix blocking I/O (requests, sync DB drivers, open()/read()) directly in async functions — always use to_thread or async alternatives
- Run `sync` HTTP clients inside event loops without offloading — this blocks all concurrent operations
- Manually create and activate virtualenvs — uv manages environments automatically via `uv run`
- Use `asyncio.wait_for()` for timeouts — it is deprecated in favor of `asyncio.timeout()` context manager
- Omit `@override` on subclass methods — misspelled method names or parent renames cause silent bugs
- Allow bare `Any` types in public API signatures — prefer specific types or structural protocols
- Commit projects without a lockfile — nondeterministic builds break CI and production deployments

---

## Output Template

When implementing or reviewing Python code with this skill active, produce:

1. **Typing Audit** — List all functions requiring modern type annotations, specifying union syntax, TypeAlias usage, Self returns, ParamSpec decorators, and @override placements
2. **Async Pattern Review** — Identify all async I/O operations and specify: TaskGroup scope, timeout duration, httpx vs sync client, to_thread offload points
3. **Project Structure Assessment** — Confirm pyproject.toml completeness, src/ layout adherence, uv commands used, lockfile presence
4. **Migration Plan** — For legacy code: exact line-by-line changes needed to upgrade from Union[]/Optional[] to | syntax, add TypeAlias annotations, replace fire-and-forget tasks with TaskGroup

---

## Related Skills

| Skill | Purpose |
|---|---|
| `python-testing-strategies` | Pytest fixtures, parametrize, mocking, coverage — complements modern Python project structure |
| `go-concurrency-patterns` | Worker pools and context cancellation — Go alternative patterns for comparison when evaluating concurrency approaches |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Python 3.12 Documentation — The typing Module](https://docs.python.org/3/library/typing.html)
- [PEP 604 — Union Operator `X | Y`](https://peps.python.org/pep-0604/)
- [PEP 673 — Self Type for Methods Returning Self](https://peps.python.org/pep-0673/)
- [PEP 612 — ParamSpec and Concatenate for Decorators](https://peps.python.org/pep-0612/)
- [PEP 698 — @override Decorator](https://peps.python.org/pep-0698/)
- [asyncio TaskGroup Documentation](https://docs.python.org/3/library/asyncio-task.html#asyncio.TaskGroup)
- [uv Documentation — Package Manager for Python](https://docs.astral.sh/uv/)

---
