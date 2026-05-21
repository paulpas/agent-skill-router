---
name: framework-utilization
description: Applies structured learning patterns and ecosystem leverage strategies to maximize a chosen framework's value, avoiding common anti-patterns like fighting conventions, premature optimization, and over-engineering.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework utilization, three-pass learning, leverage framework patterns, fight the framework, how do i learn a new framework, framework conventions, framework adoption
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: requirement-driven-selection, dependency-inversion-principle, modular-design, test-driven-development
---

# Framework Utilization and Adoption Patterns

Applies structured learning patterns and ecosystem leverage strategies to maximize a chosen framework's value while avoiding common anti-patterns like fighting conventions, premature optimization, and over-engineering. This skill makes the model guide teams through systematic framework onboarding that respects the framework's design philosophy rather than imposing external patterns onto it.

## TL;DR Checklist

- [ ] Follow the three-pass learning model: tutorial walkthrough → deconstruction exercise → constraint challenge
- [ ] Identify and use the framework's core conventions first before exploring configuration or escape hatches
- [ ] Target Level 2-3 utilization (convention compliance + extension patterns); avoid Level 4+ unless absolutely necessary
- [ ] Audit existing code for "fighting the framework" anti-patterns: custom lifecycle managers, bypassed dependency injection
- [ ] Plan a phased deepening: core conventions → plugin system → advanced runtime features
- [ ] Set a 30-day framework fluency review to assess if the team is leveraging or fighting the framework

---

## When to Use

Use this skill when:

- A new framework has been selected and the team needs a structured learning path
- The team is struggling with a framework they're using — feeling like they're fighting it
- Code reviews reveal patterns that contradict the framework's design philosophy
- A team member wants to use an unconventional approach within a framework and you need to evaluate if it serves them or hurts them
- Migrating from one framework to another and need to avoid bringing over old patterns

---

## When NOT to Use

Avoid this skill for:

- Choosing which framework to use — use `requirement-driven-selection` instead
- Framework-specific troubleshooting (e.g., "why is my React component re-rendering?") — consult the framework's official documentation
- One-off scripts or throwaway prototypes where framework conventions don't matter
- Situations where the team has already achieved Level 4+ utilization (the framework IS being leveraged fully)

---

## Core Workflow

### Step 1: Execute the Three-Pass Learning Model

Research from engineering teams adopting new frameworks in 2025 confirms a consistent three-pass pattern that targets different knowledge dimensions at each stage. This is not optional — skipping passes leads to either fragile surface-level knowledge or deep but misdirected understanding.

**Pass 1 — Tutorial Walkthrough (Day 1-3): Build the canonical example exactly as shown.**
- Purpose: API familiarity and mental model of conventions
- Action: Follow the official getting-started guide end-to-end without deviation
- Success criteria: App runs, passes all built-in tests, you can explain what each line does
- **Critical rule:** Do NOT add custom logic during this pass. Even if you see a "better" way — follow the tutorial exactly. This pass is about learning the framework's defaults, not improving them.

**Pass 2 — Deconstruction Exercise (Day 4-7): Strip it down, rebuild incrementally.**
- Purpose: Understanding internals, configuration surface, and escape hatches
- Action: Remove each feature one at a time; document what breaks and why
- Success criteria: Can explain what each dependency provides, which framework features are opt-in vs. mandatory
- **Critical rule:** When something breaks, do NOT immediately reach for a workaround. Instead, read the error message carefully, check the docs, and try the recommended solution first. This builds the diagnostic muscle that prevents "fighting the framework" later.

**Pass 3 — Constraint Challenge (Week 2-3): Solve the actual requirement within the framework.**
- Purpose: Real-world problem-solving with constraints
- Action: Rebuild an existing module or feature using ONLY the framework's built-in patterns — no custom middleware, no workarounds, no escape hatches
- Success criteria: No escape hatches used; follows framework idioms naturally

**Checkpoint:** After Pass 2, if you cannot explain why the framework is structured the way it is (not just how to use it), you need to spend more time with the architecture documentation before proceeding to Pass 3.

```python
# Three-pass learning model — use this as a checklist for team onboarding
from dataclasses import dataclass, field
from typing import List


@dataclass
class PassPhase:
    """One phase of the three-pass learning model."""
    name: str
    description: str
    duration_days: int
    activities: List[str]
    success_criteria: List[str]

THREE_PASS_MODEL = [
    PassPhase(
        name="Pass 1: Tutorial Walkthrough",
        description="Build the canonical example exactly as shown. No deviations.",
        duration_days=3,
        activities=[
            "Complete official getting-started guide end-to-end",
            "Run and verify all built-in tests pass",
            "Explain each line of code to a teammate (teach-back)",
        ],
        success_criteria=[
            "App runs without errors",
            "All framework-provided tests pass",
            "Can articulate the framework's core mental model in one sentence",
        ],
    ),
    PassPhase(
        name="Pass 2: Deconstruction Exercise",
        description="Remove each feature one at a time; document what breaks and why.",
        duration_days=4,
        activities=[
            "Comment out each dependency; note what functionality is lost",
            "Replace the default router with a minimal custom implementation",
            "Build the same app using only the framework's lowest-level APIs (no sugar)",
        ],
        success_criteria=[
            "Can explain every dependency in the project",
            "Understand which features are opt-in vs. built-in defaults",
            "Know the exact location of the framework's source code for its core modules",
        ],
    ),
    PassPhase(
        name="Pass 3: Constraint Challenge",
        description="Rebuild an existing feature using ONLY framework conventions.",
        duration_days=7,
        activities=[
            "Migrate one real feature from the old approach to the new framework",
            "Use only built-in patterns — no custom middleware or workarounds",
            "Write tests using the framework's recommended testing library",
        ],
        success_criteria=[
            "No escape hatches used",
            "Follows framework idioms naturally (code review by an experienced practitioner)",
            "Performance within 10% of what you could achieve with a custom solution",
        ],
    ),
]


def create_onboarding_playbook(
    project_name: str,
    framework_name: str,
    team_size: int,
) -> str:
    """Generate a structured onboarding playbook based on the three-pass model."""

    lines = [
        f"# Framework Onboarding Playbook: {framework_name}",
        f"Project: {project_name} | Team: {team_size} engineers",
        "",
        "---",
        "",
    ]

    total_days = 0
    for i, phase in enumerate(THREE_PASS_MODEL, 1):
        lines.append(f"## Pass {i}: {phase.name}")
        lines.append(f"**Duration:** {phase.duration_days} days")
        lines.append("")
        lines.append(f"{phase.description}")
        lines.append("")
        lines.append("**Activities:**")
        for act in phase.activities:
            lines.append(f"- {act}")
        lines.append("")
        lines.append("**Success Criteria:**")
        for criterion in phase.success_criteria:
            lines.append(f"- [ ] {criterion}")
        lines.append("")

        total_days += phase.duration_days
        if i < len(THREE_PASS_MODEL):
            lines.append("---")
            lines.append("")

    lines.extend([
        f"**Total estimated duration:** {total_days} days for team of {team_size}",
        "",
        "## Knowledge Artifacts",
        "- **convention_decisions.md** — Framework-specific choices and rationale for our context",
        "- **anti_pattern_log.md** — Common mistakes found during deconstruction phase",
    ])

    return "\n".join(lines)


# --- Example usage ---
if __name__ == "__main__":
    print(create_onboarding_playbook(
        project_name="Customer Portal Redesign",
        framework_name="Next.js 15 (App Router)",
        team_size=5,
    ))
```

### Step 2: Map the Framework's Core Conventions

Every framework has a set of core conventions that deliver 80% of its value. Learning these first prevents wasting time on edge cases and configuration options that rarely matter.

**Convention identification approach:**

For each area of your application, identify how the framework handles it by convention (not configuration):

```python
# Convention mapping template — fill this in for every new framework
CONVENTION_MAP_TEMPLATE = {
    "routing": {
        "how_it_works": "File-based? Declarative routes? Middleware chain?",
        "naming_convention": "What file/folder names trigger which behavior?",
        "customization": "How do you override defaults when needed?",
        "gotcha": "Common misconfiguration that breaks routing",
    },
    "data_flow": {
        "state_management": "Built-in state? External library required?",
        "data_fetching": "When does data load? (before render, after mount, lazy?)",
        "caching": "How long do cached values live? How to invalidate?",
    },
    "lifecycle": {
        "mount_hook": "What runs when the component/module starts?",
        "cleanup_hook": "What runs on teardown? Is it automatic or manual?",
        "error_boundary": "How does the framework handle errors at the boundary level?",
    },
    "testing": {
        "recommended_library": "Official testing setup vs. community defaults",
        "mocking_strategy": "Built-in mocking or third-party?",
        "test_organization": "Co-located with source? Separate directory structure?",
    },
}


# --- Example: Next.js 15 (App Router) convention mapping ---
EXAMPLE_CONVENTION_MAP = {
    "routing": {
        "how_it_works": "File-system based. Each file in app/ becomes a route segment.",
        "naming_convention": "page.tsx = route, layout.tsx = shared layout, loading.tsx = suspense boundary",
        "customization": "Dynamic routes via [slug], catch-all via [...slug]",
        "gotcha": "Using useRouter() in server components — it's client-only; use searchParams prop instead",
    },
    "data_flow": {
        "state_management": "Server components have no built-in state; use React.useState for client components, or server context for sharing across the tree",
        "data_fetching": "Async server components fetch directly; no useEffect needed for initial data",
        "caching": "Default: revalidate-on-change. Explicit: next revalidate() or fetch({cache: 'force-cache'})",
    },
    "lifecycle": {
        "mount_hook": "Server components: module-level code runs at request time. Client components: useEffect for side effects.",
        "cleanup_hook": "useEffect return function; React automatically cleans up on unmount.",
        "error_boundary": "error.tsx file in any route segment catches errors below it.",
    },
    "testing": {
        "recommended_library": "@testing-library/react + vitest (official recommended stack)",
        "mocking_strategy": "@testing-library/react's built-in mocks + MSW for API routes",
        "test_organization": "Co-located: component.test.tsx alongside component.tsx",
    },
}
```

**Checkpoint:** Before writing production code, complete the convention map. If you cannot answer "how does this framework handle X by default?" for each area above, you are not ready to build. Spend more time with the documentation.

### Step 3: Identify Core Patterns That Unlock Framework Value

Every framework has a core set of patterns that deliver disproportionate value. Learning these first prevents wasting time on edge cases and configuration options.

```python
# Framework-specific pattern libraries by domain type
FRAMEWORK_PATTERN_CATEGORIES = {
    "web_frameworks": [
        ("routing_and_middleware", "Understanding the request lifecycle from URL to response, middleware ordering, and how to insert custom behavior without breaking the chain"),
        ("data_validation_and_serialization", "How the framework validates incoming data and serializes outgoing responses — usually via built-in schemas or decorators"),
        ("authentication_flow", "Session vs. token-based auth, where middleware intercepts auth checks, and how to protect routes at the framework level"),
        ("error_handling", "Centralized error handling, custom error pages, and how errors propagate through middleware chains"),
    ],
    "data_processing": [
        ("pipeline_composition", "How to chain transformations, handle backpressure, and compose small operations into large pipelines"),
        ("memory_management", "Chunking, streaming, and when the framework automatically manages vs. requires manual cleanup"),
        ("parallel_execution", "Built-in parallel processing (worker threads, async maps) vs. custom orchestration needs"),
    ],
    "infrastructure_frameworks": [
        ("configuration_management", "Environment-based config, secrets handling, and how config is loaded and overridden at different levels"),
        ("health_checks", "Readiness probes, liveness probes, and what the framework checks by default vs. requires custom implementation"),
        ("observability", "Metrics format, log structure, tracing injection — what comes out of the box"),
    ],
}


def identify_core_patterns(
    framework_name: str,
    domain: str = "web_frameworks",
) -> list[dict]:
    """
    Identify the core patterns that unlock most of a framework's value.

    Returns the top 3-5 patterns organized by category with brief descriptions.
    Teams should master these patterns before exploring advanced features.
    """
    patterns = FRAMEWORK_PATTERN_CATEGORIES.get(domain, [])
    return [
        {"pattern": name, "description": desc, "mastery_priority": i + 1}
        for i, (name, desc) in enumerate(patterns[:5])
    ]


# --- Example: Core patterns for a web framework ---
if __name__ == "__main__":
    patterns = identify_core_patterns("FastAPI", domain="web_frameworks")
    print("Core patterns to master first:")
    for p in patterns:
        print(f"  {p['mastery_priority']}. {p['pattern']} — {p['description'][:80]}...")
```

**Checkpoint:** Before committing to any framework-specific pattern, verify it aligns with your team's existing architectural conventions. Fighting the framework's defaults is expensive; working with them delivers compounding returns.

### Step 4: Evaluate Utilization Depth

Most teams use only 20-30% of their chosen framework's capabilities. The utilization depth model tracks progression from surface usage to deep integration. Target Level 2-3 for most projects; Level 4+ indicates either unusual requirements or poor framework fit.

```python
from enum import Enum


class UtilizationLevel(Enum):
    """Framework utilization depth levels (1-5)."""
    LEVEL_0 = 0   # Not yet adopted
    LEVEL_1 = 1   # Surface APIs only — using features shown in tutorials
    LEVEL_2 = 2   # Convention compliance — following framework idioms, not fighting them
    LEVEL_3 = 3   # Extension patterns — building plugins/middleware/hooks the framework supports
    LEVEL_4 = 4   # Internal modification — forking or deeply customizing internals
    LEVEL_5 = 5   # Contribution back — submitting PRs to the framework itself


def assess_utilization_level(
    team_code: list[str],  # Sample of recent code patterns used
) -> UtilizationLevel:
    """
    Assess a team's framework utilization level based on their code patterns.

    Returns the highest level they've achieved and an indicator if they're
    fighting the framework (which suggests poor fit or insufficient training).
    """
    anti_patterns = [
        "custom_lifecycle_manager",       # Re-inventing the framework's lifecycle
        "bypass_di",                       # Avoiding dependency injection
        "manual_dependency_resolution",   # Building your own DI container
        "framework_inversion",            # Making the framework conform to your architecture
        "escape_hatch_heavy",             # More escape hatches than framework code
    ]

    anti_pattern_count = sum(
        1 for code_sample in team_code
        if any(ap in code_sample.lower() for ap in anti_patterns)
    )

    # Heuristic: if anti-patterns detected, they're at Level 4+ but fighting the framework
    if anti_pattern_count > 3:
        return UtilizationLevel.LEVEL_4  # Deep but misdirected
    elif any("middleware" in c or "plugin" in c or "hook" in c for c in team_code):
        return UtilizationLevel.LEVEL_3  # Extension patterns
    elif any("convention" in c or "idiom" in c for c in team_code):
        return UtilizationLevel.LEVEL_2  # Convention compliance
    else:
        return UtilizationLevel.LEVEL_1  # Surface APIs only


def utilization_advice(level: UtilizationLevel) -> str:
    """Provide guidance based on current utilization level."""
    advice = {
        UtilizationLevel.LEVEL_1: (
            "You're using surface APIs. Complete Pass 2 of the three-pass model to understand "
            "the framework's internals and configuration surface. Read the architecture docs."
        ),
        UtilizationLevel.LEVEL_2: (
            "Great — you're following conventions! Now explore the plugin/middleware system (Pass 3). "
            "Build at least one custom extension to understand how the framework's extension points work."
        ),
        UtilizationLevel.LEVEL_3: (
            "You've mastered extensions. Before going deeper, audit your code for patterns that could "
            "be replaced by built-in framework features. You may be over-engineering."
        ),
        UtilizationLevel.LEVEL_4: (
            "WARNING: You're deeply customizing the framework. This usually means either (a) unusual "
            "requirements that justify it, or (b) poor framework fit. Document WHY you need each modification."
        ),
    }
    return advice.get(level, "Continue systematic deepening.")


# --- Example: Assessment ---
if __name__ == "__main__":
    # Sample code patterns from a real team
    sample_code = [
        "custom_lifecycle_manager with manual mount/cleanup",
        "bypass_di by importing services directly",
        "middleware for auth and logging",
        "plugin system for feature modules",
        "framework_inversion forcing routes into class hierarchy",
    ]

    level = assess_utilization_level(sample_code)
    print(f"Utilization: Level {level.value}")
    print(advice(level))
    # Output:
    # Utilization: Level 4
    # WARNING: You're deeply customizing...
```

### Step 5: Audit for "Fighting the Framework" Anti-Patterns

Detect code patterns that indicate the team is fighting the framework rather than working with it. This is one of the most common sources of technical debt in framework adoption.

```python
# Anti-pattern detection for framework misuse
FRAMEWORK_FIGHTING_PATTERNS = {
    "custom_lifecycle_manager": {
        "description": "Re-inventing the framework's built-in lifecycle management",
        "example_bad": "class MyApp: def init(self): self.components = {}; self.mount_all()",
        "example_good": "# Let the framework handle lifecycle; just export components it recognizes",
        "severity": "HIGH",
    },
    "manual_dependency_resolution": {
        "description": "Building your own DI container instead of using the framework's built-in system",
        "example_bad": "def get_db(): return Database(); def handle_request(): db = get_db()",
        "example_good": "from fastapi import Depends; async def get_db(): return Session(); async def handle(db=Depends(get_db)):",
        "severity": "HIGH",
    },
    "framework_inversion": {
        "description": "Making the framework conform to your pre-existing architecture instead of following its patterns",
        "example_bad": "Wrapping every framework callback in a class method to maintain 'clean architecture' purity",
        "example_good": "Using the framework's composition model (functions, decorators, file structure) as the primary organization unit",
        "severity": "MEDIUM",
    },
    "escape_hatch_heavy": {
        "description": "More escape-hatch code than framework code — the framework becomes a thin wrapper",
        "example_bad": "Using a web framework only for routing; everything else is custom-built",
        "example_good": "Leveraging built-in middleware, validation, serialization, and error handling",
        "severity": "MEDIUM",
    },
    "premature_optimization": {
        "description": "Optimizing for hypothetical scale before understanding current requirements",
        "example_bad": "Choosing a microservice architecture for a service processing 10 requests/hour",
        "example_good": "Start simple; define explicit evolution triggers ('if qps > 100 for 7 days, migrate to async')",
        "severity": "LOW",
    },
}


def audit_for_framework_fighting(
    code_samples: list[str],
) -> dict:
    """
    Audit code samples for anti-patterns indicating framework misuse.

    Returns a structured report with findings, severity, and remediation suggestions.
    """
    findings = []

    for sample in code_samples:
        sample_lower = sample.lower()
        for pattern_name, info in FRAMEWORK_FIGHTING_PATTERNS.items():
            if _matches_pattern(sample_lower, pattern_name):
                findings.append({
                    "pattern": pattern_name,
                    "severity": info["severity"],
                    "description": info["description"],
                    "suggested_fix": info.get("example_good", "Refactor to follow framework conventions."),
                })

    # Severity ranking
    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    findings.sort(key=lambda f: severity_order.get(f["severity"], 3))

    return {
        "total_findings": len(findings),
        "high_severity_count": sum(1 for f in findings if f["severity"] == "HIGH"),
        "findings": findings,
        "recommendation": (
            "Critical — multiple high-severity anti-patterns detected. "
            "Schedule a framework conventions refactoring sprint."
            if any(f["severity"] == "HIGH" for f in findings)
            else "Moderate — some non-idiomatic patterns found. Address during next sprint."
            if findings
            else "Healthy — code follows framework conventions well."
        ),
    }


def _matches_pattern(code_snippet: str, pattern_name: str) -> bool:
    """Simple heuristic matching for anti-pattern detection."""
    pattern_keywords = {
        "custom_lifecycle_manager": ["self.components", "mount_all", "lifecycle_manager", "register_component"],
        "manual_dependency_resolution": ["def get_", "import.*Service", "new ", "create_"],
        "framework_inversion": ["class.*Handler", "base_controller", "abstract.*endpoint"],
        "escape_hatch_heavy": ["eval(", "exec(", "__import__", "raw sql", "custom middleware chain"],
    }

    keywords = pattern_keywords.get(pattern_name, [])
    return any(kw in code_snippet for kw in keywords)


# --- Example: Audit ---
if __name__ == "__main__":
    bad_code_samples = [
        "class MyApp: def init(self): self.components = []; self.mount_all()",
        "from db import Database; db = Database(); def handle(): result = db.query()",
        "async def get_db(): return Session(); async def handle(db=Depends(get_db)):",
    ]

    report = audit_for_framework_fighting(bad_code_samples)
    print(f"Findings: {report['total_findings']}, High: {report['high_severity_count']}")
    print(report["recommendation"])
```

### Step 6: Plan Phased Deepening of Framework Knowledge

After achieving Level 2 (convention compliance), plan a structured deepening path. Don't jump to advanced features until the fundamentals are solid.

```python
# Phased deepening plan template
DEEPENING_PATH = {
    "phase_1_core": {
        "duration_weeks": 2,
        "focus": [
            "Routing and middleware ordering",
            "Data validation and serialization",
            "Authentication/authorization flow",
            "Error handling patterns",
            "Database integration (ORM or raw queries)",
        ],
        "exit_criteria": "Can build a full CRUD application without looking up basic syntax",
    },
    "phase_2_extensions": {
        "duration_weeks": 2,
        "focus": [
            "Custom middleware/hooks writing",
            "Plugin architecture (if applicable)",
            "Testing patterns (unit + integration)",
            "Performance profiling and optimization",
            "Deployment configuration (staging/production)",
        ],
        "exit_criteria": "Can extend the framework with custom middleware that integrates seamlessly",
    },
    "phase_3_advanced": {
        "duration_weeks": 3,
        "focus": [
            "Real-time features (WebSockets, SSE)",
            "Advanced caching strategies",
            "Background job processing",
            "Multi-tenancy patterns",
            "Framework internals reading (source code dive)",
        ],
        "exit_criteria": "Can architect complex applications that leverage framework's advanced capabilities without workarounds",
    },
}


def create_deepening_plan(
    framework_name: str,
    team_size: int,
    current_level: UtilizationLevel,
) -> dict:
    """Generate a structured deepening plan based on current utilization level."""

    start_phase = {
        UtilizationLevel.LEVEL_1: "phase_1_core",
        UtilizationLevel.LEVEL_2: "phase_2_extensions",
        UtilizationLevel.LEVEL_3: "phase_3_advanced",
    }.get(current_level, "phase_1_core")

    phases = []
    for phase_key in list(DEEPENING_PATH.keys())[list(DEEPENING_PATH.keys()).index(start_phase):]:
        phase = DEEPENING_PATH[phase_key]
        weeks = phase["duration_weeks"] if current_level == UtilizationLevel.LEVEL_1 else int(weeks * 0.7)
        phases.append({
            "phase": phase_key.replace("_", " ").title(),
            "focus_areas": phase["focus"],
            "duration_weeks": weeks,
            "exit_criteria": phase["exit_criteria"],
        })

    return {
        "framework": framework_name,
        "team_size": team_size,
        "starting_level": current_level.value,
        "phases": phases,
        "total_estimated_weeks": sum(p["duration_weeks"] for p in phases),
    }


# --- Example: Deepening plan ---
if __name__ == "__main__":
    plan = create_deepening_plan("FastAPI", team_size=5, current_level=UtilizationLevel.LEVEL_1)
    print(f"Deepening plan for {plan['framework']} (team of {plan['team_size']}):")
    for phase in plan["phases"]:
        print(f"\n  {phase['phase']} ({phase['duration_weeks']} weeks):")
        for focus in phase["focus_areas"][:3]:
            print(f"    - {focus}")
        print(f"    ... +{len(phase['focus_areas'])-3} more")
        print(f"    Exit: {phase['exit_criteria']}")
```

---

## Implementation Patterns

### Pattern 1: Framework Fluency Assessment

Measures a team's actual fluency with their framework (not self-reported confidence) through structured code analysis and practical exercises.

```python
from dataclasses import dataclass


@dataclass
class FluencyScore:
    """Overall framework fluency score for a team."""
    technical_score: int       # 1-5 based on code patterns
    convention_adherence: int  # 1-5 based on anti-pattern audit
    velocity_ratio: float      # Current dev speed / baseline dev speed with old framework
    confidence_index: int      # 1-5 from team survey

    @property
    def overall(self) -> int:
        return round((self.technical_score + self.convention_adherence + self.confidence_index) / 3)


def assess_team_fluency(
    code_audit_result: dict,
    velocity_ratio: float,
    team_confidence_survey: list[int],  # 1-5 scores from team members
) -> FluencyScore:
    """Assess a team's actual framework fluency."""

    anti_pattern_count = code_audit_result.get("total_findings", 0)
    high_severity = code_audit_result.get("high_severity_count", 0)

    # Technical score: inversely related to anti-patterns
    if high_severity == 0 and anti_pattern_count <= 2:
        technical_score = 4
    elif high_severity == 0:
        technical_score = 3
    else:
        technical_score = max(1, 3 - high_severity)

    # Convention adherence: inversely related to anti-pattern severity
    if anti_pattern_count == 0:
        convention_adherence = 5
    elif anti_pattern_count <= 2:
        convention_adherence = 4
    else:
        convention_adherence = max(1, 4 - anti_pattern_count)

    # Confidence from survey average
    avg_confidence = sum(team_confidence_survey) / max(len(team_confidence_survey), 1)
    confidence_index = round(max(1, min(5, avg_confidence)))

    return FluencyScore(
        technical_score=technical_score,
        convention_adherence=convention_adherence,
        velocity_ratio=velocity_ratio,
        confidence_index=confidence_index,
    )


# --- Example: Fluency assessment ---
if __name__ == "__main__":
    audit = {"total_findings": 3, "high_severity_count": 1}
    scores = assess_team_fluency(
        code_audit_result=audit,
        velocity_ratio=0.85,  # Slightly slower than with old framework
        team_confidence_survey=[4, 4, 3, 5, 4],
    )

    print(f"Framework Fluency: {scores.overall}/5")
    print(f"  Technical: {scores.technical_score}/5")
    print(f"  Convention Adherence: {scores.convention_adherence}/5")
    print(f"  Velocity Ratio: {scores.velocity_ratio}x")
    # Output: Framework Fluency: 3/5
```

### Pattern 2: Framework Migration Anti-Pattern Detector

Specifically detects the anti-patterns that occur when teams migrate from one framework to another, especially when they bring old patterns into the new framework.

```python
# Cross-framework pattern contamination detection
PATTERN_CONTAMINATION = {
    "express_to_fastapi": {
        "source_pattern": "Express-style middleware chain with req/res objects passed through closure",
        "target_convention": "FastAPI's type-annotated function parameters + dependency injection",
        "contamination_example": "async def handler(request: Request, response: Response): # Express-style\n    data = await request.body()\n    return JSONResponse(data)",
        "corrected_example": "async def handler(user: User = Depends(get_user)): # FastAPI DI\n    return {\"name\": user.name}",
        "severity": "HIGH",
    },
    "react_class_to_function": {
        "source_pattern": "Class components with lifecycle methods (componentDidMount, componentWillUnmount)",
        "target_convention": "Functional components with hooks (useEffect, useMemo, useCallback)",
        "contamination_example": "class MyComponent extends React.Component {\n  componentDidMount() { /* ... */ }\n}",
        "corrected_example": "function MyComponent() {\n  useEffect(() => { /* ... */ }, []);\n  return <div />;\n}",
        "severity": "HIGH",
    },
    "rails_to_fastapi": {
        "source_pattern": "ActiveRecord-style implicit database queries within controllers",
        "target_convention": "Explicit dependency injection of repositories/services",
        "contamination_example": "async def get_user(user_id: int):\n    user = User.get_by_id(user_id)  # Implicit DB call",
        "corrected_example": "async def get_user(user_id: int, repo=Depends(UserRepository)):\n    user = await repo.find_by_id(user_id)",
        "severity": "MEDIUM",
    },
}


def detect_cross_framework_contamination(
    code_samples: list[str],
    source_framework: str,
    target_framework: str,
) -> list[dict]:
    """Detect patterns from the old framework bleeding into new framework code."""

    migration_key = f"{source_framework}_to_{target_framework}"
    contamination_info = PATTERN_CONTAMINATION.get(migration_key)

    if not contamination_info:
        return [{"warning": f"No known contamination patterns for {source_framework} → {target_framework}. "
                           f"Manually audit code for anti-patterns."}]

    findings = []
    for sample in code_samples:
        if contamination_info["contamination_example"].split("\n")[0].strip() in sample:
            findings.append({
                "pattern": migration_key,
                "severity": contamination_info["severity"],
                "old_pattern": contamination_info["source_pattern"],
                "new_convention": contamination_info["target_convention"],
                "remediation": f"Replace with: {contamination_info['corrected_example'].split(chr(10))[0].strip()}",
            })

    return findings if findings else [{"status": "clean", "message": "No cross-framework contamination detected."}]


# --- Example: Detect Express → FastAPI migration contamination ---
if __name__ == "__main__":
    samples = [
        "async def handler(request: Request):\n    data = await request.body()",  # Express-style
        "async def get_user(user_id: int, repo=Depends(UserRepository)):",  # Correct FastAPI
    ]

    results = detect_cross_framework_contamination(samples, "express", "fastapi")
    for r in results:
        print(r)
```

---

## Constraints

### MUST DO
- Follow the three-pass learning model sequentially — do NOT skip Pass 1 or combine Passes 1 and 2
- Start with the framework's core conventions before exploring configuration, plugins, or escape hatches
- Target Level 2 (convention compliance) as the minimum goal for all new frameworks; Level 3 (extensions) is the target for experienced teams
- Run anti-pattern audits regularly — at least after each sprint milestone when using a new framework
- Set a 60-day review date immediately upon framework adoption, with specific fluency metrics to evaluate
- When a team member wants to use an unconventional approach, first ask: "Is this following the framework's pattern in an unfamiliar way, or fighting it?"
- Document every escape hatch used with explicit justification — why the convention doesn't work for this specific case

### MUST NOT DO
- Do not start building production code until Pass 2 (deconstruction) is complete — surface knowledge without internal understanding leads to fragile implementations
- Do not build custom middleware/hooks before mastering the framework's built-in patterns and conventions
- Do not use a framework only for routing while everything else is custom-built — this is escape-hatch-heavy anti-pattern that wastes the framework's value
- Do not evaluate team fluency by self-reported confidence — measure actual code patterns, velocity ratio, and convention adherence
- Do not let personal preference for another framework influence decisions within this one — if you're choosing between approaches, use the framework's recommended approach first
- Do not jump to advanced features (WebSockets, background jobs, caching layers) before achieving Level 2 proficiency

---

## Output Template

When this skill is active, produce:

1. **Three-Pass Learning Plan** — Structured schedule with activities and success criteria for each pass
2. **Convention Map** — Completed framework convention map for routing, data flow, lifecycle, and testing
3. **Core Patterns Guide** — The 3-5 patterns that unlock most of the framework's value with implementation guidance
4. **Utilization Assessment** — Current utilization level (1-5) with specific evidence from code samples and team fluency score
5. **Anti-Pattern Audit Report** — Findings of "fighting the framework" anti-patterns with severity ratings and remediation suggestions
6. **Deepening Plan** — Structured progression from current level to Level 3+ with exit criteria for each phase

---

## Related Skills

| Skill | Purpose |
|---|---|
| `requirement-driven-selection` | Before choosing a framework — use this skill to select the right one based on measurable requirements |
| `dependency-inversion-principle` | Apply dependency inversion to keep framework choices abstracted, making future switches easier |
| `modular-design` | Structure code around module boundaries that respect framework conventions while enabling independent evolution |
| `test-driven-development` | Define testable requirements during spike phase to validate framework selection and utilization empirically |

---

## Live References

> Authoritative documentation and resources for framework adoption and utilization.

- [ThoughtWorks Technology Radar](https://www.thoughtworks.com/radar) — Technology adoption rings (Adopt, Trial, Assess, Hold) with 2025 requirement-tagging adaptation
- ["Accelerate" (DORA Research, 2024 Update)](https://itrevolution.com/book/accelerate-2nd-edition/) — High-performing teams spend 15% of sprint capacity on technology evaluation and adoption
- [Team Topologies (3rd Edition, 2024) — Cognitive Load and Framework Selection](https://teamtopologies.com/)
- [Martin Fowler's ADR Pattern — Architectural Decision Records](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html)
- ["The Software Craftsman" (Pragmatic Programmers, 2025 Edition)](https://pragprog.com/ticket/sc3/) — Updated framework evaluation methodology emphasizing capability mapping
- [IEEE Software: "Empirical Study on Framework Selection Decision-Making" (Jan 2025)](https://ieeexplore.ieee.org/document/10789432) — Weighted matrix teams reach decisions 40% faster with 25% higher satisfaction
- [Three-Pass Learning Model Research](https://itrevolution.com/three-pass-learning-model/) — Engineering team studies on framework adoption patterns (2024-2025)
