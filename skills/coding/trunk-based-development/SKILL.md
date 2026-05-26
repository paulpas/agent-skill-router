---
name: trunk-based-development
description: Implements trunk-based development workflows with feature flag gating, short-lived branching strategies, and automated CI to keep main always deployable.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
  - long-lived branches
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: trunk-based development, TBD, feature flag, short-lived branches, main branch protection, how do i reduce merge conflicts, avoid long-lived branches
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: secure-release-pipeline, monolith-refactoring, architectural-modernization
---

# Trunk-Based Development Workflow

Implements trunk-based development (TBD) workflows that keep the main branch always deployable through short-lived feature branches, feature flag gating for incomplete functionality, and automated continuous integration enforcement. This skill makes the model design and configure the complete TBD pipeline — from CI checks on pull requests to gradual rollout strategies via feature flags and kill switches.

## TL;DR Checklist

- [ ] All developers commit via short-lived branches (≤ 2 days old) merged into main
- [ ] Feature flags gate all incomplete functionality — no partially-working code in main
- [ ] Every PR passes CI checks (lint, type-check, tests) before merge to main
- [ ] Main branch has protection rules: required reviews, passing CI, no force push
- [ ] Feature flags include kill-switch capability for immediate rollback on production issues
- [ ] Release pipeline is automated from main — no separate release branches exist
- [ ] TBD is chosen over GitFlow when the team practices continuous integration

---

## When to Use

Use this skill when:

- Setting up a new development workflow where the team commits to main via short-lived feature branches
- Migrating from GitFlow or long-lived topic branches to trunk-based development
- Implementing feature flag infrastructure to gate incomplete work without blocking merges
- Designing CI pipeline enforcement that blocks merge on failing checks
- Reducing merge conflicts caused by long-lived branches diverging from main
- Preparing for automated continuous deployment from the main branch

---

## When NOT to Use

Avoid this skill for:

- Teams doing regulated releases with mandatory code freezes and UQA periods (use `secure-release-pipeline` instead)
- Projects where the main branch cannot be kept in a deployable state at all times — TBD requires CI/CD maturity
- Solo developers working on personal projects with no deployment pipeline overhead
- Long-term feature branches required for multi-month platform migrations (use `monolith-refactoring` for phased migrations instead)

---

## Core Workflow

1. **Audit Current Branching Strategy** — Map how the team currently develops: branch lifetime, merge frequency, CI gate status, and whether incomplete code reaches main. Compare against TBD principles to identify friction points.
   **Checkpoint:** Confirm current average branch age. If > 5 days, TBD will provide measurable conflict reduction. Document existing merge conflicts as baseline metrics.

2. **Configure Main Branch Protection** — Set branch protection rules on the default branch: require pull request reviews, enforce passing CI checks, disallow force pushes, and require status checks to pass before merging. These are non-negotiable foundations.
   **Checkpoint:** Verify that a merge cannot occur without at least one approving review AND all required CI statuses showing green. Test by attempting a direct push to main.

3. **Implement Feature Flag Service** — Deploy a feature flag system (e.g., LaunchDarkly, Flagsmith, or custom) with three core capabilities: on/off toggles for gated features, gradual rollout controls for percentage-based exposure, and kill switches for immediate deactivation.
   **Checkpoint:** Confirm that setting any flag to `false` immediately hides the associated functionality in production without requiring a code deploy.

4. **Define Short-Lived Branch Lifecycle** — Establish team norms: branches must be ≤ 2 days old before merging, feature flags gate incomplete work, and every PR requires at least one reviewer. Branch names follow `<type>/ticket-description` convention.
   **Checkpoint:** Verify no branch older than 2 days exists in the repository without an explicit exception flag. Enforce via CI check if possible.

5. **Set Up CI Pipeline with Merge Gates** — Configure continuous integration to run on every PR and every push to main. Include lint, type-check, unit tests, integration tests, and a build verification. Block merges when any check fails.
   **Checkpoint:** Push a deliberate test failure to a feature branch and confirm the PR is blocked from merging until all checks pass.

6. **Automate Release Pipeline from Main** — On every merge to main that passes all CI checks, trigger the automated release pipeline (build, stage deployment, smoke tests). No separate release branches or manual release tags are needed.
   **Checkpoint:** Merge a clean PR and verify that an artifact is produced and deployed to staging automatically within the defined SLA (e.g., ≤ 30 minutes).

---

## Implementation Patterns

### Pattern 1: Feature Flag Service with Kill Switch

Feature flags must support three operational modes: binary on/off for simple gating, percentage-based rollout for gradual exposure, and immediate kill switch for production emergencies. This implementation uses a Python feature flag client with local caching for low-latency decisions and remote evaluation via HTTP API.

```python
"""Feature flag service for trunk-based development.

Provides binary gating, graduated rollout controls, and emergency kill switches.
Designed for TBD workflows where incomplete features are merged behind flags.
Implements Early Exit (Law 1) with guard clauses on all public methods.
"""

from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class FlagStatus(str, Enum):
    """Operational states for a feature flag."""
    OFF = "off"
    ON = "on"
    ROLLOUT = "rollout"
    KILLED = "killed"  # Emergency: forces evaluation to False regardless of state


@dataclass
class RolloutConfig:
    """Configuration for gradual percentage-based rollout."""
    percentage: float  # 0.0 to 100.0
    key_attribute: str = "user_id"  # Attribute used for consistent hashing

    def __post_init__(self) -> None:
        if not 0.0 <= self.percentage <= 100.0:
            raise ValueError(f"Rollout percentage must be 0-100, got {self.percentage}")


@dataclass
class FeatureFlag:
    """Represents a single feature flag with its current configuration."""
    name: str
    description: str = ""
    status: FlagStatus = FlagStatus.OFF
    rollout_config: Optional[RolloutConfig] = None
    created_at: float = field(default_factory=time.time)
    tags: list[str] = field(default_factory=list)

    @property
    def is_active(self) -> bool:
        """Whether this flag evaluates to True by default."""
        return self.status in (FlagStatus.ON, FlagStatus.ROLLOUT)


class FeatureFlagService:
    """Feature flag service supporting gating, rollout, and kill switches.

    Thread-safe flag evaluation with local caching for production performance.
    All public methods implement Early Exit guard clauses on invalid inputs.
    """

    KILL_SWITCH_KEY = "__system_kill_switch__"
    CACHE_TTL_SECONDS = 5.0

    def __init__(self, flags: Optional[Dict[str, FeatureFlag]] = None) -> None:
        self._flags: Dict[str, FeatureFlag] = flags or {}
        self._kill_switches: set[str] = set()
        self._cache: Dict[str, tuple[float, bool]] = {}

    def register_flag(
        self,
        name: str,
        description: str = "",
        initial_status: FlagStatus = FlagStatus.OFF,
        rollout_percentage: Optional[float] = None,
    ) -> FeatureFlag:
        """Register a new feature flag with optional gradual rollout.

        Args:
            name: Unique identifier for the flag (kebab-case recommended).
            description: Human-readable purpose of the flag.
            initial_status: Starting state — default OFF gates work by default.
            rollout_percentage: If provided, starts in ROLLOUT mode at given %.

        Returns:
            The created FeatureFlag instance.

        Raises:
            ValueError: If a flag with this name already exists.
        """
        if not name or not isinstance(name, str):
            raise ValueError("Flag name must be a non-empty string")
        if name in self._flags:
            raise ValueError(f"Flag '{name}' is already registered")

        status = initial_status
        rollout_config: Optional[RolloutConfig] = None

        if rollout_percentage is not None:
            status = FlagStatus.ROLLOUT
            rollout_config = RolloutConfig(percentage=rollout_percentage)

        flag = FeatureFlag(
            name=name,
            description=description,
            status=status,
            rollout_config=rollout_config,
        )
        self._flags[name] = flag
        logger.info("Registered feature flag: %s (status=%s)", name, status.value)
        return flag

    def evaluate_flag(
        self,
        name: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Evaluate whether a feature is enabled for the given context.

        Implements kill-switch priority: if the flag or global kill switch
        is active, evaluation always returns False immediately.

        Args:
            name: The flag name to evaluate.
            context: Optional context dict with attributes like 'user_id'
                for consistent hashing during rollout evaluation.

        Returns:
            True if the feature should be visible/enabled, False otherwise.
        """
        # Early exit: kill switch takes absolute priority (Law 1: Early Exit)
        if name in self._kill_switches or self.KILL_SWITCH_KEY in self._kill_switches:
            logger.warning("Kill switch active for flag '%s' — evaluating as OFF", name)
            return False

        # Fast path: cached result within TTL window
        cache_key = f"{name}:{context.get('user_id', '')}" if context else name
        now = time.time()
        if cache_key in self._cache:
            cached_time, cached_value = self._cache[cache_key]
            if now - cached_time < self.CACHE_TTL_SECONDS:
                return cached_value

        flag = self._flags.get(name)

        # Early exit: unregistered flags evaluate to False (fail-closed default)
        if flag is None:
            logger.warning("Unregistered flag '%s' — evaluating as OFF (fail-closed)", name)
            self._cache[cache_key] = (now, False)
            return False

        # Early exit: OFF flags always evaluate to False
        if flag.status == FlagStatus.OFF:
            self._cache[cache_key] = (now, False)
            return False

        # ON flags always evaluate to True
        if flag.status == FlagStatus.ON:
            self._cache[cache_key] = (now, True)
            return True

        # ROLLOUT mode: use consistent hashing for percentage-based exposure
        if flag.status == FlagStatus.ROLLOUT and flag.rollout_config:
            result = self._evaluate_rollout(flag, context or {})
            self._cache[cache_key] = (now, result)
            return result

        self._cache[cache_key] = (now, False)
        return False

    def _evaluate_rollout(self, flag: FeatureFlag, context: Dict[str, Any]) -> bool:
        """Determine rollout membership via consistent hashing.

        Uses MD5 hash of the key attribute to ensure the same user always
        gets the same result for a given rollout percentage.

        Args:
            flag: The feature flag with rollout configuration.
            context: User/context attributes for hashing.

        Returns:
            True if the context falls within the rollout percentage bucket.
        """
        config = flag.rollout_config
        if not config or config.percentage <= 0.0:
            return False
        if config.percentage >= 100.0:
            return True

        key_attr = config.key_attribute
        key_value = context.get(key_attr, "")
        if not key_value:
            # No identifying attribute — default to OFF for safety
            logger.info(
                "Rollout flag '%s' evaluated with missing '%s' — defaulting to OFF",
                flag.name, key_attr,
            )
            return False

        # Consistent hash: maps any key to 0-99 bucket
        hash_value = int(hashlib.md5(key_value.encode()).hexdigest(), 16) % 100
        result = hash_value < config.percentage
        logger.debug(
            "Rollout flag '%s': key='%s', bucket=%d, threshold=%d, enabled=%s",
            flag.name, key_value, hash_value, config.percentage, result,
        )
        return result

    def activate_flag(self, name: str) -> None:
        """Set a flag to ON — feature is fully available."""
        if name not in self._flags:
            raise KeyError(f"Flag '{name}' not registered")
        self._flags[name].status = FlagStatus.ON
        logger.info("Activated flag: %s", name)

    def deactivate_flag(self, name: str) -> None:
        """Set a flag to OFF — feature is hidden behind gate."""
        if name not in self._flags:
            raise KeyError(f"Flag '{name}' not registered")
        self._flags[name].status = FlagStatus.OFF
        logger.info("Deactivated flag: %s", name)

    def set_rollout(self, name: str, percentage: float) -> None:
        """Set gradual rollout for a feature."""
        if name not in self._flags:
            raise KeyError(f"Flag '{name}' not registered")
        self._flags[name].status = FlagStatus.ROLLOUT
        self._flags[name].rollout_config = RolloutConfig(percentage=percentage)
        logger.info("Rollout flag '%s' set to %.1f%%", name, percentage)

    def activate_kill_switch(self, name: str) -> None:
        """Activate kill switch for immediate feature deactivation.

        This bypasses all other flag states and forces evaluation to False.
        Use in production emergencies where instant rollback is critical.
        """
        self._kill_switches.add(name)
        logger.critical("KILL SWITCH activated for flag '%s'", name)

    def deactivate_kill_switch(self, name: str) -> None:
        """Deactivate kill switch, restoring normal flag evaluation."""
        self._kill_switches.discard(name)
        logger.info("Kill switch deactivated for flag '%s'", name)
```

**BAD vs GOOD feature flag gating:**

```python
# ❌ BAD: Hardcoded boolean — no flag service, no kill switch, no rollout control
ENABLE_NEW_CHECKOUT = False  # global mutable state, impossible to change without deploy

def process_payment(user_id: str) -> dict:
    if ENABLE_NEW_CHECKOUT:
        return _new_checkout_flow(user_id)  # no way to disable in production
    return _legacy_checkout_flow(user_id)


# ✅ GOOD: Feature flag service with kill switch, rollout, and consistent hashing
def process_payment(
    flag_service: FeatureFlagService,
    user_id: str,
) -> dict:
    """Process payment using the feature-flag-gated checkout flow.

    The new_checkout flag gates incomplete functionality behind a toggle.
    If the flag is OFF (default), traffic routes to the proven legacy flow.
    Kill switches provide immediate rollback without any code change.
    """
    use_new = flag_service.evaluate_flag(
        "new_checkout",
        context={"user_id": user_id},
    )

    if use_new:
        return _new_checkout_flow(user_id)
    return _legacy_checkout_flow(user_id)
```

### Pattern 2: GitHub Actions CI Pipeline with Merge Gates

This GitHub Actions workflow enforces trunk-based development by running comprehensive checks on every pull request and every push to main. PRs are blocked from merging if any check fails, ensuring main is always in a deployable state.

```yaml
# .github/workflows/tbd-ci.yml
# Trunk-Based Development CI Pipeline
# Blocks all merges to main unless every check passes.
name: TBD Continuous Integration

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

env:
  PYTHON_VERSION: "3.12"
  NODE_VERSION: "20"

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for commitlint on all history

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install ruff mypy pytest-cov

      - name: Run linter (Ruff)
        run: ruff check . --exit-non-zero-on-fix

      - name: Run type checker (mypy)
        run: mypy src/ --strict --ignore-missing-imports

  tests:
    name: Test Suite
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov coverage-badge

      - name: Run tests with coverage
        run: |
          pytest tests/ --cov=src --cov-report=xml --cov-report=html \
            --tb=short -v
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          FEATURE_FLAG_SERVICE_KEY: ${{ secrets.FEATURE_FLAG_KEY }}

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: htmlcov/
          retention-days: 7

      # Block merge if coverage drops below threshold
      - name: Check minimum coverage
        run: |
          COVERAGE=$(python -c "import lxml.html; tree = lxml.html.parse('htmlcov/index.html'); 
            score = tree.xpath('//span[@class=\"fl\"]//text()')[0].strip('%');
            print(score)")
          echo "Coverage: ${COVERAGE}%"
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "::error::Coverage ${COVERAGE}% is below 80% threshold"
            exit 1
          fi

  integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: tests
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Run integration tests
        run: pytest tests/integration/ --tb=short -v
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/testdb
          CI: "true"

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: integration
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t app:${{ github.sha }} .

      - name: Push to container registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | docker login ${{ secrets.REGISTRY_URL }} -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push ${{ secrets.REGISTRY_URL }}/app:${{ github.sha }}

      - name: Deploy to staging via kubectl
        run: |
          kubectl set image deployment/app app=${{ secrets.REGISTRY_URL }}/app:${{ github.sha }} \
            --namespace=staging
          kubectl rollout status deployment/app --namespace=staging --timeout=300s

      - name: Run smoke tests against staging
        run: pytest tests/smoke/ --api-url=https://staging.example.com --tb=short
```

### Pattern 3: Branch Lifecycle Enforcement via CI Check

A lightweight GitHub Actions check that enforces the short-lived branch rule. This workflow runs on every PR creation and reports violations when branches exceed the age threshold, giving teams early warning before merge attempts.

```python
"""Branch lifecycle enforcement for trunk-based development.

Validates that feature branches comply with TBD length limits by
checking commit timestamps against the main branch base. Designed
for CI integration — returns structured pass/fail results.
Implements Fail Fast (Law 4) by rejecting violations immediately.
"""

from __future__ import annotations

import logging
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class BranchViolation:
    """Represents a TBD branch lifecycle violation."""
    branch_name: str
    age_hours: float
    max_age_hours: float
    message: str

    @property
    def is_critical(self) -> bool:
        return self.age_hours > self.max_age_hours * 2


def get_branch_age_hours(
    branch_name: str,
    base_branch: str = "main",
    git_root: str = ".",
) -> Optional[float]:
    """Calculate the age of a feature branch since its divergence from main.

    Determines how long a branch has been open by finding when it diverged
    from the base branch (the commit before the first unique commit).

    Args:
        branch_name: The feature branch to measure (e.g., `feature/TICKET-123`).
        base_branch: The trunk branch (default: main).
        git_root: Path to the repository root.

    Returns:
        Age in hours since divergence, or None if the branch cannot be measured.
    """
    if not branch_name or not isinstance(branch_name, str):
        raise ValueError("Branch name must be a non-empty string")

    try:
        # Find the merge base (last common commit) between branch and main
        result = subprocess.run(
            ["git", "-C", git_root, "merge-base", branch_name, base_branch],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode != 0:
            logger.warning("No common ancestor between '%s' and '%s'", branch_name, base_branch)
            return None

        merge_base_hash = result.stdout.strip()

        # Get the timestamp of the merge base commit
        ts_result = subprocess.run(
            ["git", "-C", git_root, "log", "-1", "--format=%ct", merge_base_hash],
            capture_output=True, text=True, timeout=10,
        )
        if ts_result.returncode != 0:
            return None

        base_timestamp = int(ts_result.stdout.strip())
        now = datetime.now(timezone.utc).timestamp()

        age_hours = (now - base_timestamp) / 3600.0
        logger.info("Branch '%s': %d hours since divergence from '%s'", branch_name, age_hours, base_branch)
        return round(age_hours, 2)

    except subprocess.TimeoutExpired:
        logger.error("Git command timed out measuring branch '%s'", branch_name)
        return None
    except subprocess.CalledProcessError as exc:
        logger.error("Git error measuring branch '%s': %s", branch_name, exc.stderr)
        return None


def enforce_branch_lifecycle(
    branch_name: str,
    max_age_hours: float = 48.0,
) -> list[BranchViolation]:
    """Enforce TBD branch age limits and return any violations.

    This function is designed to be called from CI pipelines as a merge gate.
    Violations block the merge when any critical violation exists.

    Args:
        branch_name: The feature branch being evaluated for merge.
        max_age_hours: Maximum allowed branch age in hours (default: 48h / 2 days).

    Returns:
        List of BranchViolation objects — empty list means all checks pass.
    """
    violations: list[BranchViolation] = []

    age_hours = get_branch_age_hours(branch_name)

    # Fail Fast: if we cannot measure the branch, reject it
    if age_hours is None:
        violations.append(BranchViolation(
            branch_name=branch_name,
            age_hours=0,
            max_age_hours=max_age_hours,
            message="Cannot determine branch age — ensure main is up to date with git fetch",
        ))
        return violations

    # Record violation if branch exceeds age limit
    if age_hours > max_age_hours:
        violations.append(BranchViolation(
            branch_name=branch_name,
            age_hours=age_hours,
            max_age_hours=max_age_hours,
            message=(
                f"Branch '{branch_name}' is {age_hours:.1f}h old "
                f"(max: {max_age_hours}h). Rebase onto latest main or merge early."
            ),
        ))

    return violations
```

### Pattern 4: TBD vs GitFlow — Decision Framework

Understanding why TBD is preferred for teams practicing continuous integration helps justify the workflow choice. The following decision matrix compares both approaches across key dimensions:

| Dimension | Trunk-Based Development | GitFlow | Winner for CI Teams |
|-----------|------------------------|---------|---------------------|
| **Branch lifetime** | ≤ 2 days | Weeks to months | TBD — shorter divergence = fewer conflicts |
| **Merge frequency** | Multiple times daily | Once at release | TBD — incremental integration catches bugs early |
| **Main branch state** | Always deployable | Often broken during feature development | TBD — automated CI enforces this invariant |
| **Feature delivery** | Gated by flags, not branches | Gated by release branch existence | TBD — flags allow safe partial visibility |
| **Release cadence** | Continuous (on every merged PR) | Periodic (at release milestones) | TBD — reduces release anxiety and big-bang risk |
| **Conflict resolution** | Resolved in small batches on short branches | Massive merge conflicts at release time | TBD — daily conflict resolution is trivial vs. weekly |
| **CI/CD dependency** | Requires mature CI/CD pipeline | Can survive with minimal automation | TBD — CI investment pays for itself immediately |

**When GitFlow still makes sense:** Teams with strict regulatory release gates requiring code freeze windows, QA-only testing periods, and separate production sign-off phases. In those cases, combine TBD for daily development with a separate release promotion process (see `secure-release-pipeline`).

---

## Constraints

### MUST DO
- Keep every feature branch at most 48 hours old before merging into main — enforce via CI age check
- Gate all incomplete functionality behind feature flags that default to OFF (fail-closed)
- Require passing CI checks (lint, type-check, tests) and at least one approving review before any PR merge to main
- Implement kill switch capability on every feature flag for immediate production deactivation without code deploy
- Run automated deployment to staging on every successful merge to main — no separate release branches
- Use consistent hashing for rollout percentages so the same user always sees consistent behavior
- Name branches with the convention `<type>/<ticket-id>-description` (e.g., `feature/TICKET-42-user-dashboard`)

### MUST NOT DO
- Create or maintain long-lived feature branches (> 48h) that diverge from main without explicit exception approval
- Merge code behind a flag to main if the code could break the build — incomplete code must not compromise CI stability
- Use feature flags as an excuse for poor branch hygiene — flags gate work, they don't replace short cycles
- Disable or remove branch protection on main under any circumstance — this is the single most important TBD rule
- Deploy a new flag to production without adding corresponding smoke tests that verify the flag evaluates correctly
- Create a separate `release/` or `develop/` branch for TBD teams — these reintroduce GitFlow divergence patterns
- Ship partial functionality by accidentally leaving a feature flag ON permanently — review flags in every PR

---

## Output Template

When this skill is active, produce outputs following this structure:

1. **Branching Strategy Assessment** — Current state analysis with branch age metrics, merge conflict frequency, and CI gate coverage. Identify specific friction points where TBD would help.
2. **Branch Protection Rules** — Concrete configuration (GitHub/Bitbucket/GitLab) for main branch protection including required reviews, status checks, and force-push prevention. Include the exact YAML/API configuration.
3. **Feature Flag Implementation** — Code for feature flag service or integration with existing services (LaunchDarkly, Flagsmith). Include registration, evaluation, rollout, and kill-switch patterns specific to the codebase.
4. **CI Pipeline Configuration** — Complete GitHub Actions (or equivalent) workflow YAML that enforces merge gates on PRs and triggers deployment from main. Must include lint, test, coverage threshold, and staging deploy jobs.
5. **Branch Lifecycle Enforcement** — CI check script or CLI tool configuration that validates branch age limits. Include the violation reporting format for PR comments.
6. **Migration Plan** (if applicable) — Step-by-step guide for transitioning from GitFlow or other long-lived branch strategies to TBD, including team training points and rollback considerations.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `secure-release-pipeline` | Complementary: automated release promotion when regulated release gates are required alongside TBD |
| `monolith-refactoring` | Used together: phased migrations within TBD using feature flags for incremental decommissioning |
| `architectural-modernization` | When migrating legacy branching to TBD across a large codebase with multiple services |

---

## Live References

> Authoritative documentation and reference materials for trunk-based development practices.

- [Martin Fowler: Trunk-Based Development](https://martinfowler.com/articles/trunkBasedDevelopment.html) — Original exposition of TBD principles
- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges/managing-protected-branches/about-protected-branches) — Configuring main branch protection rules
- [LaunchDarkly Feature Flags Documentation](https://launchdarkly.com/platform/) — Production-grade feature flag service patterns
- [GitHub Actions Workflows](https://docs.github.com/en/actions/writing-workflows) — CI/CD pipeline configuration reference
- [Flagsmith Open Source Feature Flags](https://docs.flagsmith.com/) — Self-hosted alternative for feature flag infrastructure
- [Google Engineering Practices: Development Process](https://google.github.io/eng-practices/review/code-reviews/) — Google's TBD implementation guidelines
