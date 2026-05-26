---
name: framework-utilization
description: Maximizes the value of a chosen technology or framework through progressive adoption strategies, feature discovery patterns, integration anti-pattern avoidance, and optimization techniques for sustainable long-term utilization.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework utilization, how do i use a new tool effectively, technology adoption, progressive rollout, feature discovery, integration patterns, optimize chosen framework, leveraging technology, avoid integration anti-patterns, framework best practices, adopt a new framework
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: framework-selection, ai-framework-selector, dependency-injection, integration-testing-patterns, modular-design
---

# Framework Utilization Engine

Transforms a chosen framework from a mere dependency into a production-grade asset through systematic adoption strategies. When this skill is active, the model acts as a senior integration engineer who guides teams through feature discovery, progressive rollout, optimization patterns, and anti-pattern avoidance to maximize the return on their technology investment.

## TL;DR Checklist

- [ ] Assess current adoption stage (Surface / Advanced / Deep) against the 3-Layer Rollout model
- [ ] Inventory all framework features discovered but not yet adopted
- [ ] Audit existing code for integration anti-patterns (Wrapper Hell, Frankenstein, Over-Engineering)
- [ ] Establish quantitative baselines before any optimization effort
- [ ] Design a progressive rollout plan with success criteria per stage
- [ ] Define testing strategy: what to unit-test (mocked) vs. integration-test (real framework)

---

## When to Use

Use this skill when:

- You have just selected or inherited a new framework and need a structured onboarding plan beyond the tutorial
- A team feels they are only using 20% of their framework's capabilities and wants to go deeper
- Existing code is mixing framework patterns with raw equivalents (the "Frankenstein" anti-pattern)
- Debugging integration issues caused by fighting the framework instead of working with its conventions
- Preparing a team for deep framework mastery as part of a technology transfer or onboarding initiative
- Evaluating whether current framework usage can be optimized for performance, maintainability, or developer velocity
- Upgrading to a major framework version and need to understand migration paths and new feature adoption

## When NOT to Use

Avoid this skill for:

- Framework selection or comparison decisions — use `framework-selection` or `ai-framework-selector` instead
- Evaluating whether to adopt a new technology at all (that is a strategic decision, not an utilization problem)
- Creating a new framework from scratch
- When the team is already using a framework that meets all needs with no optimization opportunities identified

---

## Core Workflow

1. **Assess Current Adoption Stage** — Determine whether the codebase is operating at Surface (basic documented features), Advanced (middleware, hooks, plugins), or Deep (framework-specific optimization, custom extensions) layer. Inventory every feature currently used and flag known-but-unused capabilities. **Checkpoint:** Produce a feature inventory with at least 3 items per adoption stage before proceeding.

2. **Discover Hidden Capabilities** — Run the Feature Discovery System (see Implementation Patterns below). Read source code of well-maintained framework projects, mine changelogs for hidden gems, and inspect what popular dependency trees import. **Checkpoint:** Produce a "discovered but not adopted" list with estimated impact per item.

3. **Audit for Anti-Patterns** — Scan the codebase for the three primary integration anti-patterns: Fighting the Framework (Wrapper Hell), Partial Adoption (Frankenstein), and Over-Engineering. Score each finding by severity (Critical / Warning / Info) and produce remediation advice. **Checkpoint:** Every Critical finding must have a specific, actionable remediation with before/after code example.

4. **Design Progressive Rollout** — Create a staged implementation plan mapping discovered capabilities to rollout phases. Each phase must include: success criteria, testing requirements, and team training needs. Start from Surface layer completeness before advancing. **Checkpoint:** No Advanced feature is scheduled until all Surface features have tests passing on the real framework (not mocked).

5. **Optimize with Measurable Impact** — For each optimization opportunity, establish a baseline measurement first. Apply framework-native patterns to improve performance or maintainability. Measure improvement quantitatively. **Checkpoint:** Every optimization must report before/after metrics. If no measurable improvement occurred, document why and reconsider the approach.

6. **Define Testing Strategy** — Separate what requires unit tests (mocked framework boundaries) from what requires integration tests (real framework behavior). Framework-boundary code that interacts with stateful framework features (databases, async queues, event loops) must have real integration tests. **Checkpoint:** Coverage report distinguishes between mocked-unit and real-integration coverage.

---

## Implementation Patterns / Reference Guide

### Progressive Adoption Framework — The "3-Layer Rollout" Model

Framework adoption follows a natural progression through three layers. Moving between layers requires demonstrated mastery of the current layer — do not skip stages.

**Layer 1: Surface Features** — Use what is obvious and documented. Get basic functionality working fast. This includes routing, request/response handling, basic configuration, and standard library integrations that any tutorial covers.

**Layer 2: Advanced Patterns** — Discover middleware, hooks, plugins, lifecycle events, and extension points. This is where framework-specific patterns like dependency injection, event emitters, ORM relationships, and plugin registries come into play.

**Layer 3: Deep Integration** — Framework-specific optimization, performance tuning, custom extensions that modify framework internals, source code-level contributions. This layer requires understanding the framework's internal architecture.

```
Current Stage          Decision Gate                          Next Stage
─────────────         ──────────────                        ──────────
SURFACE  ◄── Need 3+ surface features with passing tests ──► ADVANCED
ADVANCED ◄── 2+ advanced features integrated + benchmarked ─► DEEP
DEEP     ◄── Performance optimized against requirements ────► (mastery)

Decision gates must include:
  - Quantitative baseline measurement before advancing
  - Team training on new feature categories
  - Integration tests using real framework, not mocked
```

### Feature Discovery System

Feature discovery is the systematic process of learning what a framework can do beyond its tutorial-level documentation. The following techniques compound over time and should be repeated quarterly.

**Technique 1: Source Code Reading** — Well-maintained frameworks have clean, documented source code. Read the implementation of features you already use to discover related features you haven't discovered yet. Look at what internal methods call what other internal methods.

```python
"""Source code inspection technique for discovering hidden framework capabilities.
This pattern shows how to trace feature relationships through a framework's internals."""

import inspect
from typing import Any


def inspect_framework_features(
    module_name: str,
    filter_prefix: str = "",
) -> dict[str, list[str]]:
    """Discover features in a Python framework module by introspection.
    
    Args:
        module_name: Fully-qualified module name to inspect (e.g., 'fastapi.applications')
        filter_prefix: Optional prefix to filter discovered members (e.g., 'app.' for methods)
    
    Returns:
        Dict mapping each class/function to its list of called dependencies.
    """
    import importlib

    try:
        module = importlib.import_module(module_name)
    except ImportError as exc:
        raise ValueError(f"Cannot import module {module_name!r}: {exc}") from exc

    features: dict[str, list[str]] = {}

    for name, obj in inspect.getmembers(module):
        if not filter_prefix or name.startswith(filter_prefix):
            if inspect.isclass(obj) or (inspect.isfunction(obj) and hasattr(obj, "__module__")):
                # Collect all referenced names within the source
                try:
                    source = inspect.getsource(obj)
                    dependencies = [
                        dep.strip()
                        for dep in set(inspect.getcallers.__doc__.split() if inspect.getsourcefile(obj) else [])  # noqa: E501
                        if dep.isidentifier()
                    ] if False else []  # Fallback to empty — real usage parses AST
                    
                    # Simpler approach: use ast module for dependency extraction
                    import ast
                    tree = ast.parse(source)
                    refs = set()
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Attribute):
                            refs.add(node.attr)
                        elif isinstance(node, ast.Name):
                            refs.add(node.id)
                    
                    features[name] = sorted(refs)
                except (OSError, TypeError):
                    features[name] = ["<source unavailable>"]

    return features


# Usage: Discover what FastAPI's Application class depends on internally
# deps = inspect_framework_features("fastapi.applications", filter_prefix="app.")
# This reveals hidden methods like app.middleware_stack, app.route_class, etc.
```

**Technique 2: Dependency Inspection** — Look at what popular projects using this framework import from it. The most commonly imported items are the most valuable features. Use `pip show`, `npm list`, or equivalent to find top dependent packages and inspect their imports.

**Technique 3: Changelog Mining** — Framework changelogs contain hidden gems. Look for entries marked "Added", "Improved", or "New" in each major and minor version release. Features added in recent versions are often the most powerful but least documented.

**Technique 4: Community Pattern Repositories** — GitHub search for `framework-name patterns`, `framework-name best practices`, or `framework-name examples`. The most-starred example repositories reveal community-validated usage patterns.

### Integration Anti-Patterns

The following anti-patterns are the three most common and destructive ways teams misuse frameworks. Each includes a BAD vs GOOD comparison with specific remediation guidance.

**Anti-pattern 1: Fighting the Framework (The "Wrapper Hell")**

Wrapping framework internals with custom logic instead of using the framework's built-in features. This creates a layer of indirection that adds complexity without adding value, and makes migration to newer framework versions painful.

```python
# ❌ BAD: Wrapping framework internals instead of using them
class BadRepository:
    """Fights SQLAlchemy by manually building raw SQL queries."""

    def __init__(self, session) -> None:  # Missing type hints — poor practice
        self.session = session

    def get_user(self, user_id):
        # Fighting SQLAlchemy by manually building SQL
        result = self.session.execute(
            text("SELECT * FROM users WHERE id = :id"),
            {"id": user_id}
        )
        return result.fetchone()

    def list_active_users(self):
        # Raw SQL for a simple filter — ignores ORM query builder
        result = self.session.execute(
            text("SELECT * FROM users WHERE is_active = 1 ORDER BY created_at DESC LIMIT :limit"),
            {"limit": 100}
        )
        return [dict(row) for row in result]


# ✅ GOOD: Using framework idioms — SQLAlchemy ORM declarative queries
from typing import Optional

class GoodRepository:
    """Leverages SQLAlchemy ORM features for type-safe, maintainable queries."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_user(self, user_id: int) -> Optional[User]:
        """SQLAlchemy ORM idiom — declarative query with built-in caching."""
        return self.session.get(User, user_id)

    def list_active_users(self, limit: int = 100) -> list[User]:
        """ORM query builder with chainable filters and pagination support."""
        return (
            self.session.query(User)
            .filter(User.is_active == True)  # noqa: E712
            .order_by(User.created_at.desc())
            .limit(limit)
            .all()
        )
```

**Anti-pattern 2: Partial Framework Adoption (The "Frankenstein" Pattern)**

Mixing framework patterns with raw equivalents unnecessarily. This creates inconsistent code where some parts use the framework and others bypass it entirely, leading to confusing error handling, disconnected lifecycle management, and duplicated infrastructure.

```python
# ❌ BAD: Mixing framework patterns with raw equivalents unnecessarily
import requests  # Frankenstein: mixing FastAPI's built-in features with manual HTTP handling

app = FastAPI()

@app.get("/items")
def get_items():
    # Why use FastAPI if you're manually handling HTTP response construction?
    response = requests.get("https://api.example.com/items")
    return JSONResponse(content=response.json())


# ✅ GOOD: Leveraging framework-native patterns — FastAPI + httpx async integration
from fastapi import HTTPException

app = FastAPI()

@app.get("/items", response_model=ItemSchema)
async def get_items() -> ItemSchema:
    """Use FastAPI's httpx integration and dependency injection for clean async flow."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("https://api.example.com/items")
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                raise HTTPException(status_code=404, detail="Items not found")
            raise HTTPException(status_code=502, detail=f"Upstream error: {exc}") from exc
        return response.json()
```

**Anti-pattern 3: Over-Engineering with Framework Features**

Using the most complex framework feature for a problem that simpler patterns solve equally well. This is the opposite of Wrapper Hell — instead of bypassing the framework, you are using *too much* of it in situations where simple code would suffice.

```python
# ❌ BAD: Using complex framework features for simple needs
@app.on_event("startup")
async def init_db():
    # Over-engineered connection management for a single health endpoint
    pool = await create_pool(
        dsn=DATABASE_URL,
        min_size=5,
        max_size=20,
        timeout=30,
        max_queries=50000,
        max_idle=10.0,
        statement_cache_size=50,
    )

@app.get("/health")
async def health():
    return {"status": "ok"}  # This doesn't need connection pool management!


# ✅ GOOD: Right-sized infrastructure for the actual need
DATABASE_URL = os.environ["DATABASE_URL"]

@app.get("/health", tags=["operations"])
async def health() -> dict[str, str]:
    """Simple health check that verifies database connectivity without pooling overhead."""
    try:
        async with httpx.AsyncClient() as client:
            await client.post(f"{DATABASE_URL}/health")
        return {"status": "ok"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Health check failed: {exc}") from exc
```

### Optimization Strategies

#### Performance Optimization — Benchmark-Driven Tuning

Never optimize without a baseline measurement. The following pattern establishes measurable baselines before and after applying framework-native optimizations.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class AdoptionStage(str, Enum):
    """Progressive adoption stages for framework utilization."""

    SURFACE = "surface"         # Basic functionality, documentation patterns
    ADVANCED = "advanced"       # Middleware, hooks, extension points
    DEEP = "deep"               # Framework-specific optimization, custom extensions


@dataclass
class FeatureDiscovery:
    """Tracks discovered and adopted framework features."""

    framework_name: str
    stage: AdoptionStage = AdoptionStage.SURFACE
    surface_features: list[str] = field(default_factory=list)
    advanced_features: list[str] = field(default_factory=list)
    deep_features: list[str] = field(default_factory=list)

    @property
    def total_discovered(self) -> int:
        """Total count of all discovered features across all stages."""
        return len(self.surface_features) + len(self.advanced_features) + len(self.deep_features)

    @property
    def adoption_ratio(self) -> float:
        """Fraction of discovered features that have been adopted (surface ratio)."""
        if self.total_discovered == 0:
            return 0.0
        return min(1.0, len(self.surface_features) / max(1, self.total_discovered))


class FrameworkAdopter:
    """Guides progressive adoption of a framework through three stages.
    
    This class provides the structural backbone for systematic framework utilization:
    tracking discovered features, validating stage advancement criteria,
    and recording optimization impacts with measurable metrics.
    
    Example usage::
    
        adopter = FrameworkAdopter("fastapi", ["routing", "validation", "async"])
        adopter.discover_feature("dependency injection")
        adopter.optimize("response_time", before_value=150.0, after_value=45.0, technique="response caching")
    """

    STAGE_REQUIREMENTS: dict[AdoptionStage, str] = {
        AdoptionStage.SURFACE: "Basic functionality working and tested",
        AdoptionStage.ADVANCED: "At least 2 advanced features integrated",
        AdoptionStage.DEEP: "Performance benchmarked and optimized against requirements",
    }

    def __init__(self, framework_name: str, capabilities: list[str]) -> None:
        self.framework_name = framework_name
        self.capabilities = capabilities
        self.discovery = FeatureDiscovery(framework_name=framework_name)
        self.optimization_log: list[dict] = []

    def can_advance_stage(self) -> tuple[bool, Optional[str]]:
        """Check if the current stage's requirements are met to advance.
        
        Returns:
            Tuple of (can_advance, requirement_description).
            If can_advance is False, the description explains what is missing.
        """
        stage = self.discovery.stage
        requirements = self.STAGE_REQUIREMENTS.get(stage)

        if not requirements:
            return False, f"Unknown stage: {stage}"

        if stage == AdoptionStage.SURFACE and len(self.discovery.surface_features) < 3:
            return False, (
                f"Need at least 3 surface features. Have: {len(self.discovery.surface_features)}"
            )

        if stage == AdoptionStage.ADVANCED:
            if len(self.discovery.advanced_features) < 2:
                return False, (
                    f"Need at least 2 advanced features. "
                    f"Have: {len(self.discovery.advanced_features)}"
                )

        return True, requirements

    def discover_feature(
        self,
        feature_name: str,
        category: AdoptionStage = AdoptionStage.SURFACE,
    ) -> None:
        """Register a discovered framework feature in the appropriate stage."""
        target_list = getattr(self.discovery, f"{category.value}_features")
        if feature_name not in target_list:
            target_list.append(feature_name)

    def optimize(
        self,
        metric: str,
        before_value: float,
        after_value: float,
        technique: str,
    ) -> None:
        """Record an optimization with measurable impact.
        
        Args:
            metric: Name of the measured metric (e.g., "response_time_ms")
            before_value: Baseline measurement before optimization
            after_value: Measurement after applying the optimization
            technique: Description of the optimization technique applied
        """
        improvement = (
            ((before_value - after_value) / before_value * 100) if before_value > 0 else 0
        )
        self.optimization_log.append({
            "metric": metric,
            "before": before_value,
            "after": after_value,
            "improvement_pct": round(improvement, 2),
            "technique": technique,
        })

    def report(self) -> str:
        """Generate a human-readable utilization report."""
        lines = [
            f"Framework Utilization Report — {self.framework_name}",
            "=" * 60,
            f"Stage: {self.discovery.stage.value.upper()}",
            f"Surface features: {len(self.discovery.surface_features)}",
            f"Advanced features: {len(self.discovery.advanced_features)}",
            f"Deep features: {len(self.discovery.deep_features)}",
            f"Total discovered: {self.discovery.total_discovered}",
        ]

        if self.optimization_log:
            lines.append("")
            lines.append("Optimization History:")
            for opt in self.optimization_log:
                lines.append(
                    f"  - {opt['metric']}: {opt['before']:.1f} → {opt['after']:.1f} "
                    f"({opt['improvement_pct']:+.1f}%) via {opt['technique']}"
                )

        return "\n".join(lines)
```

### Integration Anti-Pattern Detector

A reusable analysis function that scans source code for common integration anti-patterns and produces remediation guidance.

```python
import re
from dataclasses import dataclass


@dataclass
class AntiPatternFinding:
    """A detected integration anti-pattern with remediation guidance."""

    pattern_name: str
    severity: str  # "critical", "warning", "info"
    location: str
    description: str
    remediation: str


def detect_integration_antipatterns(
    code: str,
    framework_context: dict[str, list[str]],
) -> list[AntiPatternFinding]:
    """Detect common framework integration anti-patterns in source code.
    
    Analyzes the given source code against known anti-pattern signatures
    for the specified framework context and returns actionable findings.
    
    Args:
        code: Source code to analyze (entire file or relevant excerpt)
        framework_context: Dict of {framework_name: [known_capabilities]}
        
    Returns:
        List of detected anti-patterns with severity, location, description,
        and specific remediation advice for each finding.
    """
    findings: list[AntiPatternFinding] = []

    # Anti-pattern 1: Manual SQL when ORM is available (Wrapper Hell)
    if "sqlalchemy" in framework_context.get("orm_framework", []):
        if re.search(r'session\.execute\s*\(\s*text\(', code):
            findings.append(AntiPatternFinding(
                pattern_name="Wrapper Hell — Manual SQL with ORM Available",
                severity="critical",
                location="session.execute(text(...)) usage detected",
                description=(
                    "Using raw SQL through SQLAlchemy's text() when the ORM provides "
                    "query methods. This bypasses ORM caching, relationship loading, "
                    "and type-safe query building."
                ),
                remediation=(
                    "Replace with session.get(Model, id) for single-row fetch, or use "
                    "session.query(Model).filter(...) for filtered queries. For complex "
                    "queries, use ORM select() construct from SQLAlchemy 2.0."
                ),
            ))

    # Anti-pattern 2: Mixing HTTP libraries with framework features (Frankenstein)
    if "fastapi" in framework_context.get("web_framework", []):
        if re.search(r'import\s+requests\b', code) and 'FastAPI' in code:
            findings.append(AntiPatternFinding(
                pattern_name="Frankenstein — Manual HTTP with Framework Available",
                severity="warning",
                location="requests import alongside FastAPI",
                description=(
                    "Using synchronous requests library when FastAPI provides async "
                    "httpx integration. This blocks the event loop and prevents "
                    "concurrent request handling."
                ),
                remediation=(
                    "Replace 'import requests' with 'import httpx'. Use httpx.AsyncClient "
                    "for async compatibility with FastAPI's event loop. Wrap calls in "
                    "async/await and use response.raise_for_status() for error handling."
                ),
            ))

    return findings


# Usage example:
# code = open("my_app.py").read()
# context = {
#     "orm_framework": ["sqlalchemy"],
#     "web_framework": ["fastapi"],
# }
# findings = detect_integration_antipatterns(code, context)
# for finding in findings:
#     print(f"[{finding.severity.upper()}] {finding.pattern_name}")
#     print(f"  Location: {finding.location}")
#     print(f"  Fix: {finding.remediation}\n")
```

### Progressive Adoption Implementation — Complete Example

This combined example demonstrates the FrameworkAdopter system with full feature discovery, optimization tracking, and reporting.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class AdoptionStage(str, Enum):
    SURFACE = "surface"         # Basic functionality, documentation patterns
    ADVANCED = "advanced"       # Middleware, hooks, extension points
    DEEP = "deep"               # Framework-specific optimization, custom extensions


@dataclass
class FeatureDiscovery:
    """Tracks discovered and adopted framework features."""

    framework_name: str
    stage: AdoptionStage = AdoptionStage.SURFACE
    surface_features: list[str] = field(default_factory=list)
    advanced_features: list[str] = field(default_factory=list)
    deep_features: list[str] = field(default_factory=list)

    @property
    def total_discovered(self) -> int:
        return len(self.surface_features) + len(self.advanced_features) + len(self.deep_features)

    @property
    def adoption_ratio(self) -> float:
        """Fraction of discovered features that have been adopted."""
        if self.total_discovered == 0:
            return 0.0
        return min(1.0, len(self.surface_features) / max(1, self.total_discovered))


class FrameworkAdopter:
    """Guides progressive adoption of a framework through three stages."""

    STAGE_REQUIREMENTS = {
        AdoptionStage.SURFACE: "Basic functionality working and tested",
        AdoptionStage.ADVANCED: "At least 2 advanced features integrated",
        AdoptionStage.DEEP: "Performance benchmarked and optimized against requirements",
    }

    def __init__(self, framework_name: str, capabilities: list[str]) -> None:
        self.framework_name = framework_name
        self.capabilities = capabilities
        self.discovery = FeatureDiscovery(framework_name=framework_name)
        self.optimization_log: list[dict] = []

    def can_advance_stage(self) -> tuple[bool, Optional[str]]:
        """Check if the current stage's requirements are met to advance."""
        stage = self.discovery.stage
        requirements = self.STAGE_REQUIREMENTS.get(stage)

        if not requirements:
            return False, f"Unknown stage: {stage}"

        if stage == AdoptionStage.SURFACE and len(self.discovery.surface_features) < 3:
            return False, f"Need at least 3 surface features. Have: {len(self.discovery.surface_features)}"

        if stage == AdoptionStage.ADVANCED:
            if len(self.discovery.advanced_features) < 2:
                return False, f"Need at least 2 advanced features. Have: {len(self.discovery.advanced_features)}"

        return True, requirements

    def discover_feature(
        self,
        feature_name: str,
        category: AdoptionStage = AdoptionStage.SURFACE,
    ) -> None:
        """Register a discovered framework feature in the appropriate stage."""
        target_list = getattr(self.discovery, f"{category.value}_features")
        if feature_name not in target_list:
            target_list.append(feature_name)

    def optimize(
        self,
        metric: str,
        before_value: float,
        after_value: float,
        technique: str,
    ) -> None:
        """Record an optimization with measurable impact."""
        improvement = ((before_value - after_value) / before_value * 100) if before_value > 0 else 0
        self.optimization_log.append({
            "metric": metric,
            "before": before_value,
            "after": after_value,
            "improvement_pct": round(improvement, 2),
            "technique": technique,
        })

    def report(self) -> str:
        """Generate a human-readable utilization report."""
        lines = [
            f"Framework Utilization Report — {self.framework_name}",
            "=" * 60,
            f"Stage: {self.discovery.stage.value.upper()}",
            f"Surface features: {len(self.discovery.surface_features)}",
            f"Advanced features: {len(self.discovery.advanced_features)}",
            f"Deep features: {len(self.discovery.deep_features)}",
            f"Total discovered: {self.discovery.total_discovered}",
        ]

        if self.optimization_log:
            lines.append("")
            lines.append("Optimization History:")
            for opt in self.optimization_log:
                lines.append(
                    f"  - {opt['metric']}: {opt['before']:.1f} → {opt['after']:.1f} "
                    f"({opt['improvement_pct']:+.1f}%) via {opt['technique']}"
                )

        return "\n".join(lines)


# === Practical Usage Example ===

def demonstrate_framework_utilization() -> None:
    """Demonstrates the full progressive adoption workflow for FastAPI."""
    adopter = FrameworkAdopter(
        framework_name="fastapi",
        capabilities=["routing", "validation", "async", "dependencies", "middleware"],
    )

    # Phase 1: Surface discovery and adoption
    adopter.discover_feature("path parameters")
    adopter.discover_feature("query parameter validation")
    adopter.discover_feature("request body Pydantic models")

    can_advance, reason = adopter.can_advance_stage()
    assert can_advance is True  # 3 surface features met

    # Phase 2: Advanced discovery
    adopter.discovery.stage = AdoptionStage.ADVANCED
    adopter.discover_feature("dependency injection via Depends()", category=AdoptionStage.ADVANCED)
    adopter.discover_feature("custom middleware", category=AdoptionStage.ADVANCED)

    # Record optimization from adding response caching
    adopter.optimize(
        metric="get_user_response_time_ms",
        before_value=150.0,
        after_value=45.0,
        technique="FastAPI response model validation + httpx connection pooling",
    )

    # Phase 3: Deep optimization
    adopter.discovery.stage = AdoptionStage.DEEP
    adopter.discover_feature("ASGI lifespan events", category=AdoptionStage.DEEP)
    adopter.discover_feature("custom exception handlers", category=AdoptionStage.DEEP)

    # Generate final report
    print(adopter.report())


if __name__ == "__main__":
    demonstrate_framework_utilization()
```

---

## Constraints

### MUST DO
- Always start with surface features and only advance to advanced/deep patterns after the current layer is tested and stable — never skip a stage
- Measure optimization improvements quantitatively before and after — never optimize without a baseline measurement. If you cannot measure it, you cannot justify it
- Document every discovered framework feature in a shared team wiki or CODEOWNERS annotation — feature discovery knowledge must be shared, not tribal. Follow the `code-philosophy` principle that code guides data naturally; documented patterns guide developers naturally
- Test framework-boundary code with both unit tests (mocked) and integration tests (real framework) — a single testing approach leaves blind spots in stateful behavior coverage
- Reference the "Frankenstein pattern" anti-pattern explicitly when teams mix framework patterns with raw implementations. This naming convention creates a shared vocabulary for the team

### MUST NOT DO
- Never adopt framework features before understanding their lifecycle management and memory implications — an adopted feature that leaks resources is worse than no feature at all
- Use a framework's most complex feature for a problem that simpler patterns solve equally well. Framework awareness should not drive over-engineering; requirements should
- Skip integration tests in favor of unit-test-only coverage when the framework has significant stateful behavior (databases, async queues, event loops). Mocks cannot exercise the framework's internal state machine
- Adopt features solely because they are "cool" or "modern". Every framework feature used must map to a measurable requirement or constraint — velocity improvement, reliability gain, or developer productivity
- Ignore the framework's official migration guides when upgrading. Frameworks often have breaking changes between major versions that require specific steps; community blog posts do not capture these

---

## Output Template

When performing framework utilization analysis, produce:

1. **Current Adoption Stage Assessment** — Surface / Advanced / Deep with feature inventory for each stage
2. **Feature Discovery Report** — Newly discovered capabilities not yet adopted, with estimated impact ranking
3. **Anti-Pattern Audit** — Detected integration anti-patterns with severity (Critical / Warning / Info) and specific remediation per finding
4. **Optimization Opportunities** — Specific areas where framework-native patterns could improve performance or maintainability, with before/after baseline requirements
5. **Progressive Rollout Plan** — Staged implementation timeline with success criteria per stage
6. **Testing Strategy** — What to unit-test (mocked) vs integration-test (real framework), with coverage expectations

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-selection` | Choose the right framework before you adopt it — use this skill first |
| `ai-framework-selector` | AI-assisted framework evaluation when starting from scratch |
| `dependency-injection` | Decouple framework code from domain logic using DI patterns |
| `integration-testing-patterns` | Design effective integration tests for framework-boundary code |
| `modular-design` | Structure applications to maximize framework utilization while maintaining testability |

---

## Live References

> Authoritative documentation links for framework utilization patterns. The model follows markdown links at load time to resolve external references and inline content.

- [FastAPI Documentation](https://fastapi.tiangolo.com/) — Modern async web framework patterns including dependency injection, middleware, and response models
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/en/20/) — Python ORM best practices, declarative queries, and relationship loading strategies
- [React Documentation](https://react.dev/reference/react) — Component patterns, hooks conventions, and the hook rules that prevent state corruption
- [Spring Framework Reference](https://docs.spring.io/spring-framework/reference/) — Enterprise Java framework utilization including DI container, AOP, and transaction management
- [Dependency Injection Patterns in Python](https://fastapi.tiangolo.com/tutorial/dependencies/) — Decoupling framework code from domain logic using FastAPI's Depends system
- [Martin Fowler — Dependency Injection](https://martinfowler.com/articles/injection.html) — Core DI principles that apply across all frameworks and languages
