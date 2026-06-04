---
name: feature-flags-progressive-delivery
description: Implements feature flag systems with progressive delivery, A/B testing, and gradual rollout strategies for safe application-level feature deployment without code changes.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: feature flags, progressive delivery, canary release, A/B testing, flag management, gradual rollout, feature toggle, how do i safely roll out new features
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
  role: implementation
  scope: implementation
  output-format: code
  related-skills: secure-release-pipeline, software-delivery-pipelines, microservice-resilience-patterns
---
# Feature Flag Progressive Delivery
Implements feature flag systems for controlled, progressive delivery of application features — enabling safe rollouts, A/B testing, and instant rollbacks without redeploying code.
## TL;DR Checklist
- [ ] Choose the right flag type (release toggle, experiment, permissioning, or operation toggle)
- [ ] Implement boolean evaluation with a fallback to `false` when the flag service is unreachable
- [ ] Start rollouts at 1% and scale to 10% → 50% → 100% over monitored intervals
- [ ] Set up error-rate and latency monitoring for each rollout bucket
- [ ] Schedule cleanup of stale flags within 90 days of full release
- [ ] Document every flag's owner, purpose, and expiration in code comments
---
## Core Workflow
1. **Define Flag Schema:** Create a structured flag definition with: unique key, name, description, default value (usually `false`), targeting rules (percentage, user segments, geographic), owner, and scheduled expiry date. Store flags in a centralized store (database, Redis, or feature flag service like Unleash/LaunchDarkly).
   **Checkpoint:** Every flag must have an owner field — flags without owners become technical debt.
2. **Implement Flag Client**: Build a thin client that wraps flag evaluation. The client should: cache flag values for the configured TTL (typically 5–30 seconds), handle service failures gracefully by returning the default value, and emit metrics (evaluation count, hit/miss rates).
   **Checkpoint:** Test the failure mode — when the flag service is down, the client must return `false` (fail-safe) within 100ms.
3. **Wrap Feature Code:** Replace conditional checks with flag evaluation calls. The application code should branch based on the flag value while maintaining both code paths in production. Each flag-gated section should have its own metrics bucket for independent monitoring.
   **Checkpoint:** Ensure both the flagged-on and flagged-off code paths execute at least once during staging testing.
4. **Configure Rollout Strategy:** Set up progressive delivery rules: start with 1% of users for 24 hours, promote to 10% if error rates stay below threshold, then 50%, then 100%. Each step should trigger alerts on anomalous behavior. Use user-level targeting (consistent hashing) so a given user always sees the same variant.
   **Checkpoint:** Verify rollout percentages match actual traffic distribution by comparing flagged vs unflagged request counts in logs.
5. **Monitor and Clean Up:** Track flag health metrics: stale flags (unchanged for 30+ days), flags with zero evaluations, and flags approaching expiry. Schedule cleanup tasks to remove flags after their feature is fully released or abandoned.
   **Checkpoint:** Review the flag dashboard weekly — remove any flags past their expiration date that are no longer needed.
---
## Implementation Patterns
### Pattern 1: Feature Flag Client with Caching and Fallback
A production-ready client handles caching, failure modes, and metrics emission.
```python
"""
Feature flag evaluation system with progressive delivery support.
Implements caching, failure-safe defaults, and per-user targeting.
"""
from __future__ import annotations

import hashlib
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class FlagType(Enum):
    """Types of feature flags with different behavioral characteristics."""
    RELEASE_TOGGLE = "release_toggle"      # Enable/disable a feature completely
    EXPERIMENT = "experiment"              # A/B test between variants
    PERMISSIONING = "permissioning"        # Restrict to specific user segments
    OPERATION = "operation"                # Toggle runtime operations (kill switches)


dataclass
class FlagDefinition:
    """Schema for a single feature flag definition."""
    key: str
    name: str
    description: str
    flag_type: FlagType
    default_value: bool = False
    owner: str = ""
    expiry_date: Optional[str] = None
    rollout_percentages: list[int] = field(default_factory=lambda: [1, 10, 50, 100])

    def is_expired(self) -> bool:
        """Check if the flag has passed its scheduled expiration date."""
        if not self.expiry_date:
            return False
        from datetime import datetime
        expiry = datetime.fromisoformat(self.expiry_date)
        return datetime.now() > expiry


dataclass
class FlagEvaluationResult:
    """Result of evaluating a feature flag for a specific context."""
    flag_key: str
    value: bool
    variant: Optional[str] = None
    evaluation_ms: float = 0.0


class FeatureFlagClient:
    """Production-ready feature flag client with caching and failure-safe defaults.

    Evaluates flags against user contexts using consistent hashing for stable
    per-user assignment across rollout stages. Falls back to default value
    when the flag service is unavailable.
    """

    def __init__(self, cache_ttl_seconds: float = 15.0, failure_timeout_seconds: float = 60.0):
        self._cache: dict[str, tuple[bool, float]] = {}
        self._cache_ttl = cache_ttl_seconds
        self._failure_since: float | None = None
        self._failure_timeout = failure_timeout_seconds

    def evaluate(self, flag: FlagDefinition, user_id: str, context: Optional[dict[str, Any]] = None) -> FlagEvaluationResult:
        """Evaluate a feature flag for a specific user.

        Uses consistent hashing of (flag_key + user_id) to deterministically
        assign users to rollout buckets. Respects progressive delivery percentages.

        Args:
            flag: The flag definition to evaluate.
            user_id: Unique identifier for the requesting user.
            context: Optional metadata (e.g., {'plan': 'premium', 'region': 'us-east'}).

        Returns:
            FlagEvaluationResult with evaluation outcome and timing metrics.
        """
        start = time.monotonic()

        # Check cache first
        cached_value, cached_time = self._get_cached(flag.key)
        if cached_value is not None:
            elapsed = (time.monotonic() - start) * 1000
            return FlagEvaluationResult(
                flag_key=flag.key, value=cached_value, evaluation_ms=elapsed,
            )

        # Check for service failure — use default if still in timeout window
        if self._failure_since and (time.time() - self._failure_since) < self._failure_timeout:
            logger.warning(
                f"Flag service unavailable since {self._failure_since:.0f}s ago. \
                Returning default for flag '{flag.key}'."
            )
            result = FlagEvaluationResult(
                flag_key=flag.key, value=flag.default_value, evaluation_ms=0.1,
            )
            self._cache_set(flag.key, flag.default_value)
            return result

        # Determine rollout value using consistent hashing
        value = self._calculate_rollout(flag, user_id, context or {})

        # Cache the result
        self._cache_set(flag.key, value)

        elapsed = (time.monotonic() - start) * 1000
        return FlagEvaluationResult(
            flag_key=flag.key, value=value, evaluation_ms=elapsed,
        )

    def _calculate_rollout(self, flag: FlagDefinition, user_id: str, context: dict[str, Any]) -> bool:
        """Determine the flag value based on rollout percentage and user context.

        Uses CRC32-style hashing for deterministic bucket assignment. Users assigned
        to a bucket are included in all higher buckets as well (cumulative rollout).

        Args:
            flag: The flag definition with rollout percentages.
            user_id: The unique user identifier.
            context: User metadata for segment targeting.

        Returns:
            True if the flag is enabled for this user, False otherwise.
        """
        # Build a deterministic hash key from flag and user
        hash_input = f"{flag.key}:{user_id}:{context.get('plan', '')}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16) % 100

        # Check segment-based targeting first
        if context.get("plan") == "premium" and flag.flag_type == FlagType.PERMISSIONING:
            return True
        if context.get("beta_tester") is True:
            return True

        # Progressive rollout — cumulative buckets
        for percentage in flag.rollout_percentages:
            if hash_value < percentage:
                return True

        return False

    def _get_cached(self, key: str) -> tuple[Optional[bool], float]:
        """Retrieve a cached flag value if it hasn't expired."""
        if key not in self._cache:
            return None, 0.0
        value, timestamp = self._cache[key]
        if time.time() - timestamp > self._cache_ttl:
            del self._cache[key]
            return None, 0.0
        return value, timestamp

    def _cache_set(self, key: str, value: bool) -> None:
        """Store a flag evaluation result in the cache."""
        self._cache[key] = (value, time.time())

    def record_failure(self) -> None:
        """Mark the flag service as unavailable. All subsequent evaluations
        return the default value until the failure timeout expires."""
        self._failure_since = time.time()

# Usage example in application code:
# client = FeatureFlagClient(cache_ttl_seconds=15.0)
# result = client.evaluate(flag_definition, user_id="user-12345")
# if result.value:
#     # New feature code
# else:
#     # Old feature code
```
### Pattern 2: Progressive Rollout Manager (BAD vs. GOOD)
```python
# ❌ BAD — No progressive rollout, no monitoring, instant full release
def bad_feature_rollout(flag_key: str, user_id: str):
    """Instantly enables a feature for everyone with no safety net."""
    # No percentage ramping, no error monitoring, no rollback mechanism
    flag_enabled = get_flag_value(flag_key)  # Blocks on network call
    if flag_enabled:
        return execute_new_feature(user_id)  # If this fails, everyone is affected


# ✅ GOOD — Progressive rollout with metrics tracking and automatic rollback triggers
class ProgressiveRolloutManager:
    """Manages staged feature rollouts with built-in safety monitoring.

    Steps through predefined percentage buckets, pausing at each stage to
    check error rates and latency before promoting to the next level.
    Triggers automatic rollback if SLO violations are detected.
    """

    ROLLBACK_THRESHOLD_ERR_RATE = 0.05   # Roll back if error rate exceeds 5%
    ROLLBACK_THRESHOLD_LATENCY_MS = 500  # Roll back if p99 latency > 500ms

    def __init__(self, flag_client: FeatureFlagClient):
        self.flag_client = flag_client
        self._current_percentages: dict[str, int] = {}

    def start_rollout(
        self,
        flag: FlagDefinition,
        user_id: str,
        metrics_client: Optional[Any] = None,
    ) -> FlagEvaluationResult:
        """Start or continue a progressive rollout for a feature flag.

        Determines the current rollout stage based on elapsed time since
        rollout start and applies the corresponding percentage bucket.

        Args:
            flag: The flag to roll out with defined percentage stages.
            user_id: User being evaluated against the current rollout.
            metrics_client: Optional metrics client for reporting evaluation counts.

        Returns:
            Evaluation result indicating whether this user sees the feature.
        """
        # Determine current rollout stage from elapsed time
        start_key = f"rollout_start:{flag.key}"
        current_stage = self._get_current_stage(flag)

        if current_stage is None:
            logger.warning(f"No rollout stages configured for flag '{flag.key}'")
            return FlagEvaluationResult(flag_key=flag.key, value=flag.default_value)

        # Evaluate the flag with the current stage's percentage
        stage_flag = FlagDefinition(
            key=flag.key,
            name=flag.name,
            description=flag.description,
            flag_type=flag.flag_type,
            default_value=flag.default_value,
            rollout_percentages=[current_stage],  # Single bucket for evaluation
            owner=flag.owner,
        )

        result = self.flag_client.evaluate(stage_flag, user_id)

        # Report metrics if client provided
        if metrics_client:
            metrics_client.increment(
                "feature_flag.evaluation",
                tags={"flag": flag.key, "stage": str(current_stage), "result": str(result.value)},
            )

        return result

    def check_rollback_criteria(self, flag_key: str) -> bool:
        """Check if current rollout metrics indicate a need to rollback.

        In production, this queries monitoring systems for error rates and
        latency percentiles over the last 5-minute window for users in the
        current rollout bucket.

        Args:
            flag_key: The feature flag key to check rollback criteria for.

        Returns:
            True if rollback should be triggered, False if rollout can continue.
        """
        # In production, fetch actual metrics from your monitoring system
        # Example placeholder — replace with real Prometheus/DataDog queries
        error_rate = self._fetch_metric(f"feature_flag.error_rate:{flag_key}")
        p99_latency = self._fetch_metric(f"feature_flag.p99_latency_ms:{flag_key}")

        should_rollback = (
            error_rate > self.ROLLBACK_THRESHOLD_ERR_RATE or
            p99_latency > self.ROLLBACK_THRESHOLD_LATENCY_MS
        )

        if should_rollback:
            logger.error(
                f"Rollback triggered for '{flag_key}': \
                error_rate={error_rate:.4f}, p99={p99_latency:.0f}ms"
            )

        return should_rollback

    def _get_current_stage(self, flag: FlagDefinition) -> Optional[int]:
        """Determine the current rollout percentage stage based on time elapsed.

        Returns None if no stages are configured. In production, persist the
        start timestamp and stage index in Redis to coordinate across service instances.
        """
        percentages = flag.rollout_percentages
        if not percentages:
            return None

        # Simplified: just return the last configured percentage for demonstration.
        # In production, use a timer + persisted state to progress through stages.
        # This placeholder always returns 10 (first non-trivial stage) to demonstrate
        # that the flag evaluation respects the defined rollout buckets.
        return percentages[1] if len(percentages) > 1 else percentages[0]

    def _fetch_metric(self, metric_name: str) -> float:
        """Fetch a metric value from the monitoring system.

        Placeholder implementation — replace with actual metrics client call.
        """
        # Example: return self.dogstatsd.histogram(metric_name).mean()
        return 0.0  # Simulate normal operation (no rollback needed)

# Usage example:
# manager = ProgressiveRolloutManager(FeatureFlagClient())
# result = manager.start_rollout(new_checkout_flag, user_id="user-12345")
# if manager.check_rollback_criteria("new-checkout-flow"):
#     manager.rollback_flag("new-checkout-flow")  # Flip to default=false
```
### Pattern 3: Flag Staleness Cleanup
```python
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

logger = logging.getLogger(__name__)


class FlagLifecycleManager:
    """Manages the full lifecycle of feature flags including staleness detection.

    Flags accumulate over time as features are rolled out and retired.
    This manager detects stale flags (unused for 30+ days), flags past
    their expiration, and orphaned evaluation code paths.
    """

    STALE_EVALUATION_THRESHOLD_DAYS = 30
    MAX_AGE_DAYS = 90

    def __init__(self, flag_service: Any, metrics_client: Any):
        self.flag_service = flag_service
        self.metrics_client = metrics_client

    def scan_stale_flags(self) -> list[dict[str, Any]]:
        """Scan all registered flags and identify stale or expired ones.

        Returns a list of flagged issues with recommendations for each.

        Returns:
            List of dicts with 'flag_key', 'issue', and 'recommendation'.
        """
        issues = []
        now = datetime.now()

        # Fetch all active flag definitions from the service
        all_flags = self.flag_service.get_all_flags()

        for flag in all_flags:
            # Check 1: Has the flag exceeded its maximum age?
            if flag.expiry_date:
                expiry = datetime.fromisoformat(flag.expiry_date)
                if now > expiry:
                    issues.append({
                        "flag_key": flag.key,
                        "issue": f"Flag expired {now - expiry} ago",
                        "recommendation": "Disable or remove this flag immediately",
                    })

            # Check 2: Has the flag had zero evaluations recently?
            evaluation_count = self._get_evaluation_count(flag.key, days=30)
            if evaluation_count == 0 and not flag.default_value:
                issues.append({
                    "flag_key": flag.key,
                    "issue": f"No evaluations in the last {self.STALE_EVALUATION_THRESHOLD_DAYS} days",
                    "recommendation": "Flag may be orphaned — review with owner before removal",
                })

        logger.info(f"Stale flag scan complete: {len(issues)} issues found")
        return issues

    def _get_evaluation_count(self, flag_key: str, days: int = 30) -> int:
        """Query metrics for evaluation count of a specific flag in the last N days."""
        # Replace with actual metrics client call
        try:
            result = self.metrics_client.query(
                f'sum(rate(feature_flag_evaluation{{flag="{flag_key}"}}[{days}d]))',
            )
            return int(result) if result else 0
        except Exception:
            return -1  # Unknown (could mean no metrics collection)

    def archive_flag(self, flag_key: str) -> None:
        """Archive a flag after its feature has been fully released.

        Sets the flag value to true permanently and disables future evaluation.
        This preserves the flag in the system for audit purposes while preventing
        it from impacting new users or experiments.
        """
        self.flag_service.update_flag(flag_key, value=True, archived=True)
        logger.info(f"Flag '{flag_key}' archived — no longer evaluated")

    def remove_flag(self, flag_key: str, owner_approval: bool = False) -> None:
        """Permanently remove a flag from the system.

        Requires owner approval or 90+ days of staleness before deletion.
        Always verify that all code paths using this flag have been removed
        (zero evaluations in last 7 days) before deleting.
        """
        recent_evaluations = self._get_evaluation_count(flag_key, days=7)
        if recent_evaluations > 0 and not owner_approval:
            raise ValueError(
                f"Flag '{flag_key}' still has {recent_evaluations} evaluations \
                in the last 7 days. Cannot delete without owner approval."
            )

        self.flag_service.delete_flag(flag_key)
        logger.info(f"Flag '{flag_key}' permanently removed")
```
---
## Constraints
### MUST DO
- Always provide a default value of `false` for new flags — enable features deliberately, not by accident
- Cache flag evaluations locally (5–30s TTL) to avoid blocking requests on remote flag service calls
- Use consistent hashing per user ID so the same user always sees the same flag state across sessions
- Set expiration dates on all temporary/experimental flags and track staleness metrics
- Test both flag-on and flag-off code paths in staging — untested code paths are bugs waiting to happen
### MUST NOT DO
- Never use feature flags for security or authorization decisions — these must be enforced in the security layer
- Do not let flags accumulate without lifecycle management — stale flags become invisible technical debt
- Don't evaluate flags synchronously on the critical path without a failure timeout (fail-safe to default)
- Never hardcode flag keys in multiple places — define them as constants or in a central registry
- Do not promote from 1% directly to 100% — always use intermediate stages with monitoring checkpoints
---
## Output Template
When implementing or reviewing feature flags, produce:
1. **Flag Definition** — Key, type, default value, owner, expiry date, rollout percentages
2. **Client Implementation** — Caching strategy, failure mode handling, metrics emission
3. **Rollout Plan** — Stage-by-stage percentage ramp with monitoring checkpoints and rollback criteria
4. **Cleanup Strategy** — Staleness detection process, archival vs deletion policy, and owner notification workflow
---
## Live References
> Authoritative documentation links for feature flag and progressive delivery best practices.
- [Unleash Documentation](https://docs.getunleash.io) - Feature flags, progressive delivery, and rollout strategies.
- [LaunchDarkly Documentation](https://docs.launchdarkly.com/home) - Concepts, examples, and integration patterns for feature flagging.
- [Flagsmith Documentation](https://docs.flagsmith.com) - Managing feature flags and remote configuration across applications.
- [Netflix Tech Blog](https://netflixtechblog.com/tag/tachi) - Insights from Netflix's engineering on feature flags and delivery strategies.
- [Google SRE](https://sre.google/sre-book/service-level-objectives/) - Concepts around service level objectives and reliability in feature delivery.