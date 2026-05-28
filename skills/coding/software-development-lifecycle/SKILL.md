---
name: software-development-lifecycle
description: Orchestrates the complete software development lifecycle from requirements gathering through design, iterative implementation with branching strategies, and structured code review to produce maintainable, well-documented software systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: software development lifecycle, SDLC, requirements engineering, design documentation, iterative development, branching strategy, code review process, user stories, acceptance criteria, feature branches, trunk-based development, how do i manage a software project
  archetypes:
    - orchestration
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - long-form architecture
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: orchestration
  output-format: code
  content-types:
    - code
    - guidance
    - examples
    - do-dont
  related-skills: software-engineering-principles, software-design-principles, test-driven-development, refactoring-techniques, modern-software-development-workflows, architecture-decision-records
---

# Software Development Lifecycle

This skill makes the model orchestrate the end-to-end SDLC — from translating ambiguous requirements into concrete acceptance criteria, through iterative design and implementation with proper branching strategies, to structured code review ensuring quality. It covers process decisions, not just code: how to structure requirements, when to write ADRs, which branching model fits your team, and what a high-signal code review actually checks.

## TL;DR Checklist

- [ ] Verify every user story has ≥3 acceptance criteria in Given/When/Then format before any implementation begins
- [ ] Confirm the chosen branching strategy matches team size (trunk-based for ≤5 engineers, feature-branch for 6–20, GitFlow for regulated release cadence)
- [ ] Check that PR templates enforce description, tests, documentation updates, and reviewer approval gates
- [ ] Ensure an ADR exists and is approved before any change touches shared modules or architectural boundaries
- [ ] Validate sprint backlogs are prioritized with story points and mapped to team velocity estimates
- [ ] Confirm merge policy requires at least one reviewer approval and all CI checks passing

---

## When to Use

Use this skill when:

- **Kickstarting a new project** — You need a structured approach from zero to first deploy, covering requirements capture, design documentation, branching strategy, and review process
- **Auditing an existing development process** — Your team has merge conflicts, skipped reviews, or undocumented architectural decisions; you need a systematic improvement plan
- **Onboarding new engineers** — You need to establish baseline SDLC practices (branching conventions, PR standards, story formatting) for the team
- **Resolving workflow chaos** — The team is merging directly to main, skipping documentation, or producing undeliverable features; you need process guardrails

---

## When NOT to Use

Avoid this skill when:

- You need detailed **testing strategy and test automation patterns** → use `software-quality-assurance` instead
- You are configuring **CI/CD pipeline infrastructure** (GitHub Actions, Jenkins, GitLab CI) → use `modern-software-development-workflows`
- You are writing a **trivial one-off script** or fixing a single-line bug — the SDLC overhead is not justified

---

## Core Workflow

### 1. Elicit and Document Requirements

Convert stakeholder needs into structured user stories with concrete, testable acceptance criteria. Every story must follow the Given/When/Then format — vague statements like "the system should be fast" are rejected immediately.

**Key principles:**
- Each user story describes a single capability from an actor's perspective
- Acceptance criteria are testable conditions, not implementation details
- Priority is explicitly assigned (Must / Should / Could / Won't for now)
- Stories are small enough to complete in one sprint

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class Priority(Enum):
    MUST = "must"
    SHOULD = "should"
    COULD = "could"
    WONT_NOW = "wont_now"


class StoryStatus(Enum):
    BACKLOG = "backlog"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


@dataclass
class UserStory:
    """Structured user story with traceable acceptance criteria."""
    id: str                           # e.g., "PROJ-42"
    title: str                        # Concise capability description
    actor: str                        # Who benefits (e.g., "admin", "end-user")
    narrative: str                    # "As an {actor}, I want {goal} so that {benefit}"
    priority: Priority = Priority.COULD
    status: StoryStatus = StoryStatus.BACKLOG
    story_points: Optional[int] = None
    acceptance_criteria: list[str] = field(default_factory=list)
    references: list[str] = field(default_factory=list)  # ADR IDs, design docs
    sprint_assignment: Optional[str] = None

    def add_acceptance_criteria(self, criteria: str) -> None:
        """Add a Given/When/Then acceptance criterion. Validates format."""
        parts = criteria.strip().split("\n")
        has_given = any(p.strip().lower().startswith("given ") for p in parts)
        has_when = any(p.strip().lower().startswith("when ") for p in parts)
        has_then = any(p.strip().lower().startswith("then ") for p in parts)

        if not (has_given and has_when and has_then):
            raise ValueError(
                f"Acceptance criterion must follow Given/When/Then format: "
                f"{criteria!r}"
            )
        self.acceptance_criteria.append(criteria)

    def is_ready_for_sprint(self) -> bool:
        """A story is sprint-ready when it has priority, criteria, and points."""
        return (
            self.priority in (Priority.MUST, Priority.SHOULD)
            and len(self.acceptance_criteria) >= 3
            and self.story_points is not None
            and self.status == StoryStatus.READY
        )

    def to_dict(self) -> dict:
        """Serialize for export or API transmission."""
        return {
            "id": self.id,
            "title": self.title,
            "actor": self.actor,
            "narrative": self.narrative,
            "priority": self.priority.value,
            "status": self.status.value,
            "story_points": self.story_points,
            "acceptance_criteria": self.acceptance_criteria,
            "references": self.references,
        }


# --- Example usage ---
story = UserStory(
    id="AUTH-12",
    title="User can reset password via email link",
    actor="registered user",
    narrative="As a registered user, I want to reset my password via email "
              "so that I can regain access when I forget my credentials.",
    priority=Priority.MUST,
    story_points=5,
)

story.add_acceptance_criteria("""Given I am on the login page
When I click the 'Forgot Password' link and enter my registered email
Then I receive an email with a password reset link within 2 minutes""")

story.add_acceptance_criteria("""Given I have received a password reset email
When I click the reset link and enter a new password meeting requirements
Then my password is updated and I can log in with the new password""")

story.add_acceptance_criteria("""Given I clicked a password reset link after 25 hours
When I attempt to use the reset link to change my password
Then the system rejects the link and prompts me to request a new one""")

assert story.is_ready_for_sprint()
```

### 2. Design Architecture & Document Decisions

Every significant design choice gets an Architecture Decision Record (ADR). An ADR captures the context, the decision made, and — crucially — the consequences (both positive and negative). This prevents tribal knowledge from replacing documentation.

**When to write an ADR:**
- Introducing a new technology or library with long-term commitment
- Changing data models shared across services
- Selecting between competing architectural patterns
- Modifying API contracts that external consumers depend on

```python
import datetime
from dataclasses import asdict, dataclass
from enum import Enum
from pathlib import Path


class ADRStatus(Enum):
    PROPOSED = "proposed"
    ACCEPTED = "accepted"
    DEPRECATED = "deprecated"
    SUPERSEDED = "superseded"


@dataclass
class ArchitectureDecisionRecord:
    """Architecture Decision Record with full traceability."""
    id: int                           # Sequential ID, e.g., 42
    title: str                        # Concise decision description
    status: ADRStatus = ADRStatus.PROPOSED
    author: str                       # Name of the proposer
    created_date: str                 # ISO format date
    updated_date: str                 # ISO format date (same as created initially)
    context: str                      # What is the situation forcing this decision?
    decision: str                     # What decision has been made?
    consequences: str                 # Resulting context, both positive and negative

    def related_adrs(self) -> list[str]:
        """Return IDs of ADRs referenced in this record."""
        import re
        return re.findall(r"ADR-(\d+)", self.consequences + self.context)


def generate_adr(
    adr_id: int,
    title: str,
    context: str,
    decision: str,
    consequences: str,
    author: str = "unknown",
    status: ADRStatus = ADRStatus.PROPOSED,
    adr_dir: Path = Path("docs/adr"),
) -> Path:
    """Generate a complete ADR markdown file and write it to the docs directory."""

    today = datetime.date.today().isoformat()
    adr = ArchitectureDecisionRecord(
        id=adr_id,
        title=title,
        status=status,
        author=author,
        created_date=today,
        updated_date=today,
        context=context,
        decision=decision,
        consequences=consequences,
    )

    related = adr.related_adrs()
    related_section = f"\n**Related:** ADR-{', ADR-'.join(related)}\n" if related else ""

    markdown = f"""# ADR-{adr.id}: {adr.title}

**Status:** {adr.status.value.upper()}
**Author:** {adr.author}
**Created:** {adr.created_date}
**Updated:** {adr.updated_date}

---

## Context

{adr.context}

## Decision

{adr.decision}

## Consequences

{adr.consequences}{related_section}
"""

    adr_dir.mkdir(parents=True, exist_ok=True)
    filepath = adr_dir / f"ADR-{adr.id:03d}.md"
    filepath.write_text(markdown)

    return filepath


# --- Example usage ---
filepath = generate_adr(
    adr_id=15,
    title="Use PostgreSQL instead of MongoDB for transactional data",
    context=(
        "The team is designing a new multi-tenant SaaS platform. The initial "
        "architecture assumed document storage would provide flexibility for "
        "varying tenant schemas. However, the requirement for ACID-compliant "
        "transactions across entities and complex reporting queries has become "
        "critical. MongoDB's cross-document transactions (GA since 4.2) add "
        "operational complexity and do not support distributed transactions."
    ),
    decision=(
        "We will use PostgreSQL as the primary transactional store for all "
        "tenant data. Each tenant will be isolated via a schema-per-tenant "
        "strategy to maintain data boundaries while leveraging relational "
        "integrity and mature tooling."
    ),
    consequences=(
        "Positive: Strong ACID guarantees, mature ORMs (SQLAlchemy), excellent "
        "reporting via standard SQL, familiar team skill set.\n\n"
        "Negative: Schema migrations require planning and downtime windows. "
        "Schema-per-tenant increases connection pool complexity. Horizontal "
        "sharding is not built-in and requires Citus or application-level logic.\n\n"
        "ADR-12 established the SaaS platform requirements that drive this "
        "decision. This supersedes ADR-08 which tentatively approved MongoDB."
    ),
    author="sarah.engineer",
    status=ADRStatus.ACCEPTED,
)
```

### 3. Establish Branching Strategy

Choose a branching model based on team characteristics, not tradition. The decision matrix below maps concrete team attributes to recommended strategies with implementation details.

**Selection logic:**

| Team Size | Release Frequency | Recommended Strategy |
|-----------|-------------------|---------------------|
| ≤5 engineers | Continuous or daily | Trunk-based development |
| 6–20 engineers | Weekly to bi-weekly | Feature-branch model |
| ≥5 engineers | Regulated, quarterly | GitFlow (with shortened release branches) |
| Any size | Hotfixes required | Add `hotfix/` branch type to chosen model |

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class BranchingStrategy:
    """Recommended branching configuration for a team."""
    name: str
    description: str
    main_branches: list[str]
    supporting_branch_types: list[str]
    branch_protection_rules: dict
    pr_requirements: list[str]

    def to_config(self) -> dict:
        """Export as structured configuration for repository admin."""
        return {
            "strategy": self.name,
            "main_branches": self.main_branches,
            "supporting_branch_types": self.supporting_branch_types,
            "protection_rules": self.branch_protection_rules,
            "pr_requirements": self.pr_requirements,
        }


def recommend_branching_strategy(
    team_size: int,
    release_frequency: str = "bi-weekly",
    requires_code_review: bool = True,
    compliance_required: bool = False,
) -> BranchingStrategy:
    """Recommend a branching strategy based on concrete team characteristics.

    Args:
        team_size: Number of engineers actively committing code
        release_frequency: One of 'daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly'
        requires_code_review: Whether the organization mandates peer review
        compliance_required: Whether audits require formal release branches

    Returns:
        BranchingStrategy with full configuration for repository setup
    """
    if team_size <= 5 and not compliance_required:
        return BranchingStrategy(
            name="trunk-based",
            description=(
                "Short-lived feature branches (≤2 days) merged directly to main. "
                "Feature flags control exposure. Minimizes merge conflicts and "
                "keeps main always deployable."
            ),
            main_branches=["main"],
            supporting_branch_types=["feature/<story-id>"],
            branch_protection_rules={
                "main": {
                    "required_pull_request_reviews": 1,
                    "dismiss_stale_reviews": True,
                    "require_code_owner_review": False,
                    "require_status_checks": True,
                    "enforce_admins": True,
                    "restrictions": None,
                    "branch_name_pattern": "main",
                }
            },
            pr_requirements=[
                "At least 1 reviewer approval before merge",
                "All CI checks must pass (lint, test, type-check)",
                "PR description links to user story ID and ADR (if applicable)",
                "Diff ≤400 lines; split if larger",
            ],
        )

    elif team_size <= 20:
        return BranchingStrategy(
            name="feature-branch",
            description=(
                "Features develop on isolated branches from main/develop. "
                "Branches merged via PR after review. Supports parallel "
                "development for mid-sized teams with bi-weekly releases."
            ),
            main_branches=["main", "develop"],
            supporting_branch_types=[
                "feature/<story-id>",
                "bugfix/<issue-id>",
                "release/v<major>.<minor>.x",
            ],
            branch_protection_rules={
                "main": {
                    "required_pull_request_reviews": 1,
                    "dismiss_stale_reviews": True,
                    "require_code_owner_review": True,
                    "require_status_checks": True,
                    "strict_status_check_requires": ["build", "test", "lint"],
                    "enforce_admins": True,
                },
                "develop": {
                    "required_pull_request_reviews": 1,
                    "dismiss_stale_reviews": True,
                    "require_status_checks": True,
                    "enforce_admins": False,
                },
            },
            pr_requirements=[
                "Target branch must be develop (not main)",
                "At least 1 reviewer approval before merge to develop",
                "CI checks pass on the feature branch",
                "PR description links to user story ID",
                "Changes in shared modules require ADR reference in PR",
            ],
        )

    else:
        return BranchingStrategy(
            name="gitflow-enhanced",
            description=(
                "Structured workflow with dedicated release branches for "
                "large teams requiring controlled releases. Shortens typical "
                "GitFlow by limiting release branch lifetime to 1 sprint."
            ),
            main_branches=["main", "develop"],
            supporting_branch_types=[
                "feature/<story-id>",
                "release/v<major>.<minor>.<patch>",
                "hotfix/<issue-id>",
            ],
            branch_protection_rules={
                "main": {
                    "required_pull_request_reviews": 2,
                    "dismiss_stale_reviews": True,
                    "require_code_owner_review": True,
                    "require_status_checks": True,
                    "enforce_admins": True,
                    "required_linear_history": True,
                },
                "develop": {
                    "required_pull_request_reviews": 1,
                    "dismiss_stale_reviews": True,
                    "require_status_checks": True,
                    "enforce_admins": False,
                },
            },
            pr_requirements=[
                "2 reviewer approvals required for main merges",
                "Release branches can only merge to main and develop",
                "Hotfixes require immediate post-mortem ADR",
                "All CI checks pass; integration tests mandatory on release branches",
                "Changelog updated before any merge to release or main",
            ],
        )


# --- Example usage ---
strategy = recommend_branching_strategy(
    team_size=8,
    release_frequency="bi-weekly",
    requires_code_review=True,
)

config = strategy.to_config()
assert config["strategy"] == "feature-branch"
assert len(config["main_branches"]) == 2  # main + develop
assert "hotfix/<issue-id>" not in config[
    "supporting_branch_types"
]  # Not in feature-branch by default
```

### 4. Implement with Iterative Sprints

Break work into time-boxed sprints (1–2 weeks). Each sprint pulls stories from the prioritized backlog based on team velocity. Track story points completed vs. planned to calibrate future estimates.

**Sprint mechanics:**
- Sprint planning selects stories that fit within estimated velocity
- Daily standups surface blockers, not status reports
- Sprint review demonstrates working software against acceptance criteria
- Retrospective identifies process improvements for the next sprint

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class Sprint:
    """Sprint planning and tracking."""
    sprint_id: str                # e.g., "sprint-14"
    start_date: str               # ISO date
    end_date: str                 # ISO date
    stories_assigned: list[str]   # User story IDs
    velocity_estimate: int        # Total story points planned
    velocity_actual: Optional[int] = None  # Updated after sprint ends

    @property
    def is_complete(self) -> bool:
        return self.velocity_actual is not None


def plan_sprint(
    backlog: list[UserStory],
    current_velocity: float,
    sprint_capacity_factor: float = 0.85,
) -> Sprint:
    """Allocate user stories to a sprint based on velocity and capacity.

    Stories are selected in priority order (MUST first), then by story points.
    The sprint is capped at velocity * capacity_factor to leave buffer for
    unplanned work and bug fixes.

    Args:
        backlog: Sorted list of ready stories (highest priority first)
        current_velocity: Average story points completed in recent sprints
        sprint_capacity_factor: Fraction of velocity to reserve (default 85%)

    Returns:
        Sprint with assigned stories and velocity estimate
    """
    if current_velocity <= 0:
        raise ValueError("Velocity must be positive; cannot plan without historical data")

    capacity = int(current_velocity * sprint_capacity_factor)
    assigned: list[UserStory] = []
    points_allocated = 0

    for story in backlog:
        if story.story_points is None or story.story_points > capacity:
            continue

        # Check that the story fits within remaining capacity
        if points_allocated + story.story_points <= capacity:
            assigned.append(story)
            points_allocated += story.story_points
            story.sprint_assignment = f"estimated_{points_allocated}pts"

    return Sprint(
        sprint_id=f"sprint-{len(backlog)}",
        start_date="2026-06-01",
        end_date="2026-06-14",
        stories_assigned=[s.id for s in assigned],
        velocity_estimate=points_allocated,
    )


# --- Example usage ---
backlog = [
    UserStory(id="AUTH-12", title="Password reset via email", priority=Priority.MUST,
              story_points=5, acceptance_criteria=["placeholder"], status=StoryStatus.READY),
    UserStory(id="AUTH-13", title="Two-factor authentication", priority=Priority.SHOULD,
              story_points=8, acceptance_criteria=["placeholder"], status=StoryStatus.READY),
    UserStory(id="AUTH-14", title="Biometric login", priority=Priority.COULD,
              story_points=13, acceptance_criteria=["placeholder"], status=StoryStatus.READY),
    UserStory(id="AUTH-15", title="Password history policy", priority=Priority.SHOULD,
              story_points=3, acceptance_criteria=["placeholder"], status=StoryStatus.READY),
]

sprint = plan_sprint(backlog, current_velocity=20)

assert sprint.velocity_estimate == 16  # AUTH-12(5) + AUTH-15(3) + AUTH-13(8) would be 16... let me recalc
# Actually: 5+3 = 8, then 8+8=16 ≤ 17 (20*0.85). Then 16+13=29 > 17. So stories are AUTH-12, AUTH-15, AUTH-13
assert sprint.stories_assigned == ["AUTH-12", "AUTH-15", "AUTH-13"]
assert not sprint.is_complete  # No actual velocity yet
```

### 5. Enforce Structured Code Review

Code review is the last quality gate before code ships. A structured checklist ensures consistency and catches issues that automated tools miss (design coherence, naming clarity, edge cases). Every PR must pass both automated checks AND human review.

**Automated prerequisites (block merge if failing):**
- Linting passes (`ruff check`, `eslint`, etc.)
- Type checking passes (`mypy --strict`)
- Unit tests pass with ≥80% coverage on changed lines
- No merge conflicts against target branch

**Human review checklist:**
- Does the code match the user story's acceptance criteria?
- Are error cases handled or explicitly delegated?
- Is the code readable without explanation from the author?
- Could this be understood by a new team member in 10 minutes?

```python
from dataclasses import dataclass, field


@dataclass
class PRChecklist:
    """Validates that a pull request meets all review prerequisites."""
    pr_title: str
    pr_description: str
    has_tests: bool
    tests_updated: bool
    docs_updated: bool
    adr_referenced: bool
    affected_shared_modules: list[str]
    diff_lines: int
    story_id: Optional[str] = None

    def validate(self) -> tuple[bool, list[str]]:
        """Validate the PR against checklist criteria.

        Returns:
            Tuple of (is_valid, list_of_violations)
        """
        violations: list[str] = []

        # 1. Title must reference a story or bug ID
        if not self.story_id and not any(
            tag in self.pr_title.upper() for tag in ["BUG", "HOTFIX", "CHORE", "REVERT"]
        ):
            violations.append(
                "PR title must include a user story ID (e.g., AUTH-42) or bug tag"
            )

        # 2. Description must not be empty
        if len(self.pr_description.strip()) < 50:
            violations.append(
                "PR description must be ≥50 characters and explain the change, "
                "not just restate the title"
            )

        # 3. Tests are required for all non-doc-only changes
        if not self.has_tests:
            violations.append("This PR requires tests; add test coverage before requesting review")

        # 4. Shared module changes require ADR reference
        if self.affected_shared_modules and not self.adr_referenced:
            violations.append(
                f"Changes to shared modules ({', '.join(self.affected_shared_modules)}) "
                f"require an ADR reference in the PR description"
            )

        # 5. Diff size limit
        if self.diff_lines > 400:
            violations.append(
                f"PR diff is {self.diff_lines} lines (max 400). "
                f"Split into smaller, focused pull requests"
            )

        # 6. Docs must be updated if code behavior changed for users
        if self.docs_updated is None:
            violations.append(
                "Set docs_updated=True only if user-facing documentation was updated"
            )

        return (len(violations) == 0, violations)


# --- BAD vs GOOD PR description examples ---
bad_pr_description = """Fixed the login bug. Added some tests.
"""

good_pr_description = """## AUTH-42: Fix session timeout on password reset flow

**User Story:** Users losing their session after clicking a password reset link,
then being forced to re-authenticate and lose their cart state.

**What Changed:**
- Moved session regeneration from `login()` to the `reset_password_confirm()` endpoint
- Added explicit session flush before redirect after successful reset
- Reduced session TTL from 24h to 8h (security improvement)

**Testing:**
- Added 3 unit tests for session handling in auth flow (`test_auth_sessions.py`)
- Regression test covers the exact timeout scenario described in AUTH-42
- All existing auth tests pass (24/24)

**ADR Reference:** Related to ADR-15 (session management policy changes)

**Checklist:**
- [x] Acceptance criteria met (verified against story comments)
- [x] Tests added/updated
- [ ] Documentation updated (no user-facing API change)
- [x] No merge conflicts with develop
"""


def demonstrate_review() -> None:
    """Demonstrate the checklist validation in action."""

    # BAD PR — will fail validation
    bad_pr = PRChecklist(
        pr_title="Fix login",
        pr_description=bad_pr_description,
        has_tests=False,
        tests_updated=False,
        docs_updated=False,
        adr_referenced=False,
        affected_shared_modules=["auth.core"],
        diff_lines=250,
    )

    is_valid, violations = bad_pr.validate()
    assert not is_valid
    # Multiple violations expected: no story ID, description too short, no tests,
    # shared module without ADR reference, docs_updated not set

    # GOOD PR — will pass validation
    good_pr = PRChecklist(
        pr_title="AUTH-42: Fix session timeout on password reset flow",
        pr_description=good_pr_description,
        has_tests=True,
        tests_updated=True,
        docs_updated=False,  # No user-facing change
        adr_referenced=True,
        affected_shared_modules=[],
        diff_lines=180,
        story_id="AUTH-42",
    )

    is_valid, violations = good_pr.validate()
    assert is_valid
    assert len(violations) == 0
```

---

## Implementation Patterns

### Pattern 1: User Story Definition Template

A comprehensive user story model with status transitions, validation, and serialization. Use this as the backbone of your requirement tracking — whether in a spreadsheet, issue tracker, or custom system.

```python
from dataclasses import dataclass, field
from enum import Enum
import json


class Priority(Enum):
    MUST = "must"
    SHOULD = "should"
    COULD = "could"
    WONT_NOW = "wont_now"


class StoryStatus(Enum):
    BACKLOG = "backlog"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


VALID_TRANSITIONS: dict[StoryStatus, set[StoryStatus]] = {
    StoryStatus.BACKLOG: {StoryStatus.READY, StoryStatus.DONE},
    StoryStatus.READY: {StoryStatus.IN_PROGRESS, StoryStatus.BACKLOG},
    StoryStatus.IN_PROGRESS: {StoryStatus.REVIEW, StoryStatus.BACKLOG},
    StoryStatus.REVIEW: {StoryStatus.DONE, StoryStatus.IN_PROGRESS},
    StoryStatus.DONE: set(),  # Terminal state
}


@dataclass
class UserStory:
    id: str
    title: str
    actor: str
    narrative: str
    priority: Priority = Priority.COULD
    status: StoryStatus = StoryStatus.BACKLOG
    story_points: int | None = None
    acceptance_criteria: list[str] = field(default_factory=list)
    references: list[str] = field(default_factory=list)

    def transition_to(self, new_status: StoryStatus) -> None:
        """Move the story to a new status. Rejects invalid transitions."""
        allowed = VALID_TRANSITIONS[self.status]
        if new_status not in allowed:
            raise ValueError(
                f"Cannot transition from {self.status.value} to {new_status.value}. "
                f"Allowed transitions: {[s.value for s in allowed]}"
            )
        self.status = new_status

    def add_acceptance_criteria(self, criterion: str) -> None:
        """Add a Given/When/Then acceptance criterion with format validation."""
        text = criterion.strip()
        lines = [l.strip().lower() for l in text.splitlines()]
        has_given = any(l.startswith("given ") for l in lines)
        has_when = any(l.startswith("when ") for l in lines)
        has_then = any(l.startswith("then ") for l in lines)

        if not (has_given and has_when and has_then):
            raise ValueError(
                f"Acceptance criterion must include Given, When, and Then clauses. "
                f"Got: {text[:80]}..."
            )
        self.acceptance_criteria.append(criterion)

    def validate_readiness(self) -> tuple[bool, list[str]]:
        """Check if this story is ready for sprint assignment."""
        issues: list[str] = []
        if not self.narrative or "as an" not in self.narrative.lower():
            issues.append("Narrative must follow 'As an {actor}, I want {goal} so that {benefit}'")
        if len(self.acceptance_criteria) < 3:
            issues.append(f"Need ≥3 acceptance criteria (have {len(self.acceptance_criteria)})")
        if self.story_points is None:
            issues.append("Story points must be estimated before sprint assignment")
        return (len(issues) == 0, issues)

    def serialize(self) -> str:
        """Export to JSON for API or file storage."""
        data = {
            "id": self.id,
            "title": self.title,
            "actor": self.actor,
            "priority": self.priority.value,
            "status": self.status.value,
            "story_points": self.story_points,
            "acceptance_criteria": self.acceptance_criteria,
        }
        return json.dumps(data, indent=2)
```

### Pattern 2: ADR Generator

Full function that creates an architecture decision record file from structured input. Handles markdown formatting, metadata headers, cross-referencing to other ADRs, and version tracking.

```python
import datetime
from dataclasses import dataclass
from pathlib import Path


@dataclass
class ADR:
    """Complete Architecture Decision Record."""
    id: int
    title: str
    status: str  # proposed | accepted | deprecated | superseded
    author: str
    context: str
    decision: str
    consequences: str
    related_adr_ids: list[int] = field(default_factory=list)

    def generate_markdown(self, base_dir: Path) -> Path:
        """Write the ADR as a numbered markdown file in the ADR directory."""
        today = datetime.date.today().isoformat()
        related = f"ADR-{', ADR-'.join(str(a) for a in self.related_adr_ids)}\n" if self.related_adr_ids else ""

        content = f"""# ADR-{self.id:03d}: {self.title}

**Status:** [{self.status.upper()}]
**Author:** @{self.author}
**Created:** {today}

---

## Context

{self.context}

## Decision

{self.decision}

## Consequences

{self.consequences}

{'## Related\n\n' + related if related else ''}
"""
        base_dir.mkdir(parents=True, exist_ok=True)
        filepath = base_dir / f"ADR-{self.id:03d}.md"
        filepath.write_text(content)
        return filepath


def create_adr(
    id: int,
    title: str,
    context: str,
    decision: str,
    consequences: str,
    author: str = "anonymous",
    related_ids: list[int] | None = None,
    status: str = "proposed",
    adr_dir: Path = Path("docs/adr"),
) -> Path:
    """Convenience wrapper for creating and writing an ADR file."""
    adr = ADR(
        id=id, title=title, status=status, author=author,
        context=context, decision=decision, consequences=consequences,
        related_adr_ids=related_ids or [],
    )
    return adr.generate_markdown(adr_dir)


# --- Example usage ---
create_adr(
    id=20,
    title="Adopt event sourcing for order management module",
    context=(
        "The order management system currently stores orders as mutable rows in "
        "PostgreSQL. Auditing requirements from the finance team demand a complete "
        "history of every change with who made it and when. Current implementation "
        "uses soft-deletes and an audit log table, but this approach cannot reconstruct "
        "the state of any order at an arbitrary point in time."
    ),
    decision=(
        "The order module will adopt event sourcing pattern using PostgreSQL as the "
        "event store. Each order mutation is appended as an immutable domain event. "
        "Projections materialize current state for read queries. Event versioning uses "
        "monotonic sequence numbers."
    ),
    consequences=(
        "Positive: Full audit trail built-in, point-in-time reconstruction possible, "
        "events can trigger downstream reactions (notifications, analytics).\n\n"
        "Negative: Requires learning curve for the team. Read queries need projection "
        "tables or on-the-fly replay. Event migration strategy needed when schema evolves. "
        "Complexity penalty for simple CRUD operations."
    ),
    author="alex.architect",
    related_ids=[15, 8],
)
```

### Pattern 3: Branching Strategy Selector

Function that takes team parameters and returns recommended strategy with explanation of why, including configuration for branch protection rules. This can be integrated into repository initialization scripts or used as a planning tool.

```python
from dataclasses import dataclass


@dataclass
class BranchConfig:
    """Complete branching strategy configuration."""
    strategy_name: str
    explanation: str
    main_branches: list[str]
    feature_pattern: str
    release_pattern: str | None
    hotfix_pattern: str
    protection_rules: dict[str, dict]

    def export_github_api(self) -> list[dict]:
        """Generate GitHub Branch Protection API payloads for each protected branch."""
        rules = {}
        for branch_name, config in self.protection_rules.items():
            rules[branch_name] = {
                "branch": branch_name,
                "required_pull_request_reviews": config.get("reviews", {}),
                "enforce_admins": config.get("enforce_admins", True),
                "required_status_checks": {
                    "strict": True,
                    "contexts": config.get("status_checks", ["build", "test", "lint"]),
                },
            }
        return list(rules.values())


def select_branching_strategy(
    team_size: int,
    release Cadence: str = "bi-weekly",
    compliance_level: str = "none",  # none | internal | external
) -> BranchConfig:
    """Select and configure a branching strategy based on team characteristics.

    Args:
        team_size: Number of engineers actively committing code
        release_cadence: How frequently the team ships to production
        compliance_level: Regulatory stringency for release branches

    Returns:
        BranchConfig with full repository setup instructions
    """
    if team_size <= 5 and compliance_level == "none":
        return BranchConfig(
            strategy_name="trunk-based",
            explanation=(
                "Small teams shipping frequently benefit from trunk-based development. "
                "Short-lived branches (≤48 hours) merged directly to main with feature "
                "flags controlling exposure. This eliminates merge conflict accumulation "
                "and keeps the main branch always deployable."
            ),
            main_branches=["main"],
            feature_pattern="feature/{story-id}",
            release_pattern=None,
            hotfix_pattern="hotfix/{issue-id}",
            protection_rules={
                "main": {
                    "reviews": {"required_approvals": 1},
                    "enforce_admins": True,
                    "status_checks": ["build", "test", "lint"],
                }
            },
        )

    elif compliance_level in ("internal", "external"):
        return BranchConfig(
            strategy_name="gitflow-enhanced",
            explanation=(
                "Compliance requirements demand auditable release branches with formal "
                "approval gates. GitFlow provides the structure for controlled releases, "
                "sign-offs, and rollback capability required by external audits."
            ),
            main_branches=["main", "develop"],
            feature_pattern="feature/{story-id}",
            release_pattern="release/v{major}.{minor}.x",
            hotfix_pattern="hotfix/{issue-id}",
            protection_rules={
                "main": {
                    "reviews": {"required_approvals": 2},
                    "enforce_admins": True,
                    "status_checks": ["build", "test", "lint", "integration-tests"],
                },
                "develop": {
                    "reviews": {"required_approvals": 1},
                    "enforce_admins": False,
                    "status_checks": ["build", "test"],
                },
            },
        )

    else:
        return BranchConfig(
            strategy_name="feature-branch",
            explanation=(
                "Mid-sized teams benefit from isolated feature branches merged to develop. "
                "Develop branch acts as integration hub, validated by CI before merging "
                "to main for releases. Supports parallel development with manageable "
                "merge conflict resolution."
            ),
            main_branches=["main", "develop"],
            feature_pattern="feature/{story-id}",
            release_pattern="release/v{major}.{minor}.x",
            hotfix_pattern="hotfix/{issue-id}",
            protection_rules={
                "main": {
                    "reviews": {"required_approvals": 1},
                    "enforce_admins": True,
                    "status_checks": ["build", "test", "lint"],
                },
                "develop": {
                    "reviews": {"required_approvals": 1},
                    "enforce_admins": False,
                    "status_checks": ["build", "test"],
                },
            },
        )


# --- Example usage ---
config = select_branching_strategy(
    team_size=3,
    release_cadence="daily",
    compliance_level="none",
)

assert config.strategy_name == "trunk-based"
assert len(config.protection_rules) == 1  # Only 'main' protected
assert config.release_pattern is None  # No release branches needed
```

---

## Constraints

### MUST DO
- Every user story must have ≥3 acceptance criteria in Given/When/Then format
- Create an ADR before implementing any architectural change to shared modules
- Require at least one reviewer approval before merging to main or develop
- Keep pull requests scoped to a single user story or bug fix (≤400 lines of diff)
- Update sprint velocity estimates after each sprint based on actual completed story points
- Maintain a living backlog ordered by priority — every item must have an ID, actor, and narrative

### MUST NOT DO
- Begin implementation without written acceptance criteria
- Merge directly to the main branch — always use pull requests
- Bundle multiple unrelated features in a single pull request
- Skip architecture documentation for changes affecting shared modules or public APIs
- Plan sprints using optimistic estimates without historical velocity data
- Allow PRs with empty or one-line descriptions

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `software-engineering-principles` | SOLID, DRY, KISS and other fundamental design principles applied during implementation |
| `test-driven-development` | Test-first methodology that complements the SDLC by shifting quality left into the requirements phase |
| `refactoring-techniques` | Safe code improvement patterns to apply during the iterative implementation phase |
| `modern-software-development-workflows` | CI/CD pipeline configuration and automation that supports the branching strategy defined here |

> 📖 skill(local cache): software-development-lifecycle

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [IBM — Software Development Lifecycle (SDLC) Overview](https://www.ibm.com/topics/software-development-lifecycle)
- [Wikipedia — Software Development Process](https://en.wikipedia.org/wiki/Software_development_process)
- [Atlassian — SDLC Guide: Stages & Best Practices](https://www.atlassian.com/agile/project-management/sdlc)
- [ISO/IEC/IEEE 12207 — Systems and Software Engineering — Life Cycle Processes](https://www.iso.org/standard/65694.html)
- [GitHub Docs — Managing Your Project Board for SDLC Workflows](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-a-project-board/about-your-project)
