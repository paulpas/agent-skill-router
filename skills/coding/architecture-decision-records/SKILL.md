---
name: architecture-decision-records
description: Documents architectural decisions as Architecture Decision Records (ADRs) with structured context, decision rationale, consequences, and status tracking for engineering teams.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: architecture decision records, ADR, architectural decisions, how do i document architectural choices, design rationale, technology selection, system trade-offs, decision log
  role: reference
  scope: infrastructure
  output-format: manifests
  content-types: [guidance, examples, config]
  related-skills: software-architecture, engineering-principles, technical-debt-management
---

# Architecture Decision Records (ADRs)

Produces and maintains Architecture Decision Records — lightweight, structured documents that capture important architectural decisions, the context behind them, their consequences, and current status. ADRs create a searchable, version-controlled history of why a system is built the way it is, reducing tribal knowledge loss and enabling future teams to understand trade-offs without guessing intent.

## TL;DR Checklist

- [ ] Every ADR captures context (why we were deciding), the chosen decision, and explicit consequences
- [ ] Each ADR has a human-readable title and a numeric ID (ADR-001, ADR-002, etc.)
- [ ] Status field reflects reality: `proposed` → `accepted` → `deprecated` / `superseded` / `active`
- [ ] Consequences include both benefits and drawbacks — no sugar-coating
- [ ] ADRs live in version control alongside source code (`docs/adr/` or `architecture/decisions/`)
- [ ] The root index README links every ADR for quick navigation
- [ ] Decisions with irreversible consequences (data migration, compliance) get explicit risk flags

---

## When to Use

Use this skill when:

- **Selecting a technology stack** — choosing between database engines, frameworks, cloud providers, or message brokers where the choice will affect multiple teams or modules
- **Defining cross-cutting architectural patterns** — error handling conventions, logging standards, authentication flows, API versioning strategies, or deployment architectures
- **Onboarding new engineers** — helping them understand why the system is structured the way it is without requiring access to years of Slack history and meetings
- **Conducting an architectural review** — auditing existing decisions for relevance against current business needs, technology shifts, or regulatory changes
- **Making financial or compliance-critical choices** — data residency decisions, encryption standards, audit trail requirements, or cost optimization strategies
- **Resolving technical disagreements** — when two teams want different approaches and need a documented, rational path forward with clear trade-offs

---

## When NOT to Use

Avoid writing an ADR for:

- **Trivial implementation details** — choosing variable names, function signatures, or local refactoring choices that don't affect system architecture
- **Decisions you will immediately reverse** — if a choice is experimental and expected to be discarded within days, capture it in a PR comment instead
- **Active exploration with no direction yet** — ADRs document *decisions*, not open-ended investigation. Use RFCs or spike tickets for exploratory work
- **Externally mandated choices** — if a vendor contract, compliance requirement, or executive directive forces the decision, document it in the relevant policy doc instead
- **Bug fixes** — fixing broken behavior is not an architectural decision

---

## Core Workflow

1. **Identify the Decision Need** — Determine whether a choice warrants an ADR by asking: *Will this decision affect multiple teams, modules, or long-term maintainability? Will reversing it be costly?* If yes, proceed. If the answer is no, use a PR comment or ticket instead.
   **Checkpoint:** One sentence summary of what decision must be made and who will be impacted.

2. **Gather Context and Constraints** — Document the background: current system state, business drivers, technical constraints (budget, compliance, deadlines), known alternatives under consideration, and any data that informed the discussion (benchmarks, PoC results, vendor evaluations).
   **Checkpoint:** All stakeholders' key concerns are captured; no decision has been made yet — this step is about gathering facts.

3. **Draft the ADR Using the Standard Template** — Write the record with these sections: Title and ID, Status, Date, Deciders, Revisit Date, Context, Decision, Consequences (pros, cons, operational impact). Keep it concise — a single page is ideal; two pages maximum for complex decisions.
   **Checkpoint:** Read the draft aloud. A stranger should understand *what* was decided, *why*, and *what it costs*. If they cannot, revise before sharing.

4. **Circulate for Stakeholder Review** — Share the draft ADR with affected parties (engineering leads, product owners, security/compliance where relevant). Set a clear review deadline (48–72 hours typically). Accept feedback, but document any dissenting opinions in the ADR itself rather than burying them.
   **Checkpoint:** All named stakeholders have reviewed or declined to comment within the deadline. Record any unresolved objections.

5. **Settle Status and Store** — If no significant concerns remain, update status to `accepted` (or `proposed` if conditional). File the ADR in the repository's decision directory (`docs/adr/ADR-NNN.md`) and update the root index README with a link. Commit with a clear message referencing any tracking ticket.
   **Checkpoint:** The ADR file is committed, linked from the index, and visible to the team.

6. **Maintain Over Time** — Revisit decisions marked with a `revisit_date` when that date arrives or when triggering events occur (technology EOL, compliance changes, cost anomalies). If a decision becomes outdated, create a new ADR to supersede it rather than editing the old one — preserve history.
   **Checkpoint:** Superseded ADRs have status `superseded` and link to the replacement ADR. Old decisions remain readable for historical context.

---

## ADR Template Reference

### Standard ADR Format

Every ADR follows this structure:

```markdown
# ADR-001: Use PostgreSQL Instead of MongoDB for Primary Data Store

**Status:** accepted
**Date:** 2025-12-15
**Deciders:** Engineering Leadership, Backend Team Leads
**Revisit Date:** 2026-06-15
**Consequences:** Reduced flexibility for nested document writes; gained ACID compliance and transaction support across services.

## Context

The platform needed a primary data store supporting user accounts, transactions, and audit logs. Requirements included:
- ACID transactions spanning multiple entity types
- Regulatory compliance requiring full audit trails
- Team familiarity — 80% of the team had PostgreSQL experience, 0% with MongoDB at production scale
- Budget constraint: self-hosted preferred over managed services

Alternatives evaluated: MySQL (familiar but weaker JSON support), DynamoDB (no multi-row transactions until recently), CockroachDB (strong consistency but operational overhead).

## Decision

We will use PostgreSQL as the primary data store for all relational data. MongoDB may be evaluated later for specific document-heavy workloads where schema flexibility is critical.

## Consequences

### Benefits
- ACID transactions enable consistent multi-entity updates without distributed transaction complexity
- Mature ecosystem with well-understood migration tooling (Alembic, Flyway)
- Team productivity gain — no onboarding curve for database operations
- Strong community support and extensive documentation

### Drawbacks
- Horizontal scaling requires additional tooling ( Citus, PgBouncer pooling layers)
- JSON column support exists but is less mature than dedicated document databases
- Larger operational footprint compared to managed NoSQL offerings
- Write throughput limits under heavy concurrent load without careful sharding strategy
```

### Index README Template

The root `docs/adr/README.md` should maintain a navigable index:

```markdown
# Architecture Decision Records

| ID | Title | Status | Date |
|----|-------|--------|------|
| [ADR-001](./ADR-001-use-postgresql-instead-of-mongodb.md) | Use PostgreSQL Instead of MongoDB for Primary Data Store | accepted | 2025-12-15 |
| [ADR-002](./ADR-002-event-sourcing-for-audit-trail.md) | Use Event Sourcing for Financial Audit Trail | proposed | 2026-01-10 |
```

---

## Consequence Analysis Framework

When documenting consequences, use a structured approach that evaluates decisions across multiple dimensions. The following Python utilities help teams systematically analyze and score the impact of architectural choices.

### ADR Consequence Data Model

This data model structures consequences across four key dimensions: runtime behavior, operational burden, financial impact, and team/culture effects. Use it when drafting the Consequences section or performing formal decision reviews.

```python
"""ADR consequence data model for structured decision analysis."""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Optional


class Dimension(str, Enum):
    """Dimensions along which an ADR's consequences are evaluated."""

    RUNTIME = "runtime"          # Performance, latency, throughput, correctness
    OPERATIONAL = "operational"  # Deployment complexity, monitoring, on-call burden
    FINANCIAL = "financial"      # Infrastructure cost, licensing, vendor lock-in
    TEAM_CULTURE = "team_culture"  # Developer experience, hiring, learning curve


class ImpactLevel(str, Enum):
    """Severity of impact for a given consequence."""

    NEGATIVE_CRITICAL = "-3"   # Blocks delivery or introduces severe risk
    NEGATIVE_MAJOR = "-2"     # Requires significant mitigation effort
    NEGATIVE_MINOR = "-1"     # Manageable with standard practices
    NEUTRAL = "0"              # No measurable effect
    POSITIVE_MINOR = "+1"      # Small improvement over baseline
    POSITIVE_MAJOR = "+2"     # Significant advantage
    POSITIVE_CRITICAL = "+3"  # Game-changing benefit


@dataclass(frozen=True)
class Consequence:
    """A single consequence of an ADR, evaluated across one dimension."""

    description: str
    direction: Dimension
    impact: ImpactLevel
    mitigation: str = ""
    owner_team: Optional[str] = None

    @property
    def severity_score(self) -> int:
        """Numeric score for sorting and aggregation (-3 to +3)."""
        return int(self.direction) if hasattr(self, "direction") else 0


@dataclass(frozen=True)
class DecisionImpactSummary:
    """Aggregated consequence summary for a single ADR."""

    adr_id: str
    title: str
    consequences: list[Consequence] = field(default_factory=list)

    @property
    def net_score(self) -> float:
        """Average impact across all dimensions. Positive = net beneficial."""
        if not self.consequences:
            return 0.0
        scores = [int(c.impact) for c in self.consequences]
        return sum(scores) / len(scores)

    def by_dimension(self, dimension: Dimension) -> list[Consequence]:
        """Return consequences filtered to a specific evaluation dimension."""
        return [c for c in self.consequences if c.direction == dimension]

    def critical_concerns(self) -> list[Consequence]:
        """Return all consequences rated as negative critical or negative major."""
        return [
            c for c in self.consequences
            if int(c.impact) <= -2
        ]


def build_adr_consequence_summary(
    adr_id: str,
    title: str,
    items: list[dict],
) -> DecisionImpactSummary:
    """Build a consequence summary from structured input dicts.

    Each dict should contain: description (str), direction (Dimension or str),
    impact (ImpactLevel or int), mitigation (str, optional), owner_team (str, optional).

    Raises ValueError if any item has an unrecognized dimension or impact level.
    """
    consequences: list[Consequence] = []
    for item in items:
        direction_str = str(item["direction"]).strip().lower()
        try:
            direction = Dimension(direction_str)
        except ValueError:
            raise ValueError(
                f"Unrecognized dimension '{item['direction']}' "
                f"in ADR {adr_id}. Expected one of: {[d.value for d in Dimension]}"
            )

        impact_raw = item.get("impact", 0)
        if isinstance(impact_raw, str):
            try:
                impact = ImpactLevel(impact_raw)
            except ValueError:
                raise ValueError(
                    f"Unrecognized impact '{impact_raw}' "
                    f"in ADR {adr_id}. Expected one of: {[i.value for i in ImpactLevel]}"
                )
        else:
            # Integer shortcut — maps directly to ImpactLevel string values
            impact = ImpactLevel(str(impact_raw))

        consequences.append(Consequence(
            description=item["description"],
            direction=direction,
            impact=impact,
            mitigation=item.get("mitigation", ""),
            owner_team=item.get("owner_team"),
        ))

    return DecisionImpactSummary(adr_id=adr_id, title=title, consequences=consequences)
```

### Reversibility Scoring Utility

Architectural decisions differ in how easily they can be undone. This scoring utility evaluates a decision on a 1–5 reversibility scale based on concrete factors like data migration requirements, API surface changes, and organizational dependencies. Use it during the Context phase to determine whether to label a decision as `reversible`, `partially_reversible`, or `irreversible`.

```python
"""Reversibility scoring for ADR decisions."""

from __future__ import annotations

import sys
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ReversibilityAssessment:
    """Quantitative assessment of how easily an architectural decision can be reversed.

    Attributes:
        score: 1 (irreversible) through 5 (fully reversible).
        rationale: Human-readable explanation for the score.
        blocking_factors: List of conditions that prevent easy reversal.
        estimated_reversal_cost_days: Rough estimate of effort to undo the decision.
    """

    score: int
    rationale: str
    blocking_factors: list[str] = field(default_factory=list)
    estimated_reversal_cost_days: int = 0


def assess_reversibility(
    *,
    data_migration_required: bool,
    api_surface_change: str,       # "none", "internal_only", "public_api", "third_party_contract"
    organizational_dependencies: int,  # number of teams affected
    external_dependencies: list[str],  # e.g., ["aws_rds", "stripe_integration"]
    regulatory_constraints: bool,
    team_adoption_in_progress: bool,
) -> ReversalAssessment:
    """Score the reversibility of an architectural decision.

    Scoring rubric:
      5 — Fully reversible: no data migration, internal-only API changes,
          zero organizational dependencies, no external commitments.
      4 — Mostly reversible: minor operational friction on rollback, but
          no irreversible data state changes or third-party lock-in.
      3 — Partially reversible: requires coordinated rollback across teams;
          some data may be lost or require manual reconciliation.
      2 — Difficult to reverse: significant migration effort required;
          external vendor integration adds complexity.
      1 — Irreversible: data rewritten in incompatible format, regulatory
          compliance embedded, multi-team dependency creates coordination
          ceiling that makes rollback impractical.

    Raises ValueError if api_surface_change is not a recognized value.
    """

    VALID_API_LEVELS = {"none", "internal_only", "public_api", "third_party_contract"}
    if api_surface_change not in VALID_API_LEVELS:
        raise ValueError(
            f"api_surface_change must be one of {VALID_API_LEVELS}, got '{api_surface_change}'"
        )

    blocking_factors: list[str] = []
    penalty = 0

    # Data migration is the single biggest irreversibility factor.
    if data_migration_required:
        penalty += 2
        blocking_factors.append("Data migration required — rollback risks data inconsistency")

    # API surface expansion correlates with stakeholder impact.
    api_penalties = {"none": 0, "internal_only": 1, "public_api": 2, "third_party_contract": 3}
    penalty += api_penalties.get(api_surface_change, 1)
    if api_surface_change == "third_party_contract":
        blocking_factors.append("Third-party contract change required for rollback")
    elif api_surface_change == "public_api":
        blocking_factors.append("Public API consumers must coordinate deprecation cycle")

    # Each additional team adds coordination overhead.
    if organizational_dependencies >= 3:
        penalty += 1
        blocking_factors.append(f"{organizational_dependencies} teams dependent on this decision")

    # External vendor lock-in reduces flexibility.
    for dep in external_dependencies:
        penalty += 1
        blocking_factors.append(f"External dependency: {dep}")

    # Regulatory constraints mean rollback may violate compliance requirements.
    if regulatory_constraints:
        penalty += 1
        blocking_factors.append("Regulatory/compliance constraints on data state during rollback")

    # If teams are already building on this decision, reversal cascades.
    if team_adoption_in_progress:
        penalty += 1
        blocking_factors.append("Multiple teams already built features on top of this decision")

    score = max(1, min(5, 5 - penalty))

    rationale_parts = []
    if score <= 1:
        rationale_parts.append("Irreversible — reversal would cause data loss, compliance violations, or unmanageable coordination overhead.")
    elif score <= 2:
        rationale_parts.append("Difficult to reverse — significant migration and coordination effort required.")
    elif score <= 3:
        rationale_parts.append("Partially reversible — rollback is possible but requires careful planning and may lose data.")
    elif score <= 4:
        rationale_parts.append("Mostly reversible — operational friction exists but no fundamental blockers.")
    else:
        rationale_parts.append("Fully reversible — internal decision with no external or data implications.")

    # Estimate reversal cost based on score and dependency breadth.
    base_cost = {1: 60, 2: 30, 3: 14, 4: 5, 5: 1}
    estimated_cost_days = base_cost[score] + (organizational_dependencies * 3)

    return ReversalAssessment(
        score=score,
        rationale=" ".join(rationale_parts),
        blocking_factors=blocking_factors if blocking_factors else ["No significant blockers to reversal."],
        estimated_reversal_cost_days=estimated_cost_days,
    )
```

---

## ADR Patterns and Anti-Patterns

### Pattern: Technology Selection Decision

Technology selection ADRs are among the most common and most valuable. They should capture the evaluation criteria, the shortlisted options, why each was rejected or chosen, and the evidence behind the choice.

**Example structure for a technology selection ADR:**

```markdown
# ADR-012: Adopt Rust for High-Throughput Data Ingestion Pipeline

**Status:** accepted
**Date:** 2026-02-28
**Deciders:** Platform Engineering, Backend Architecture Board

## Context

Current Python-based ingestion pipeline handles ~5K events/sec with occasional backpressure spikes causing message loss during peak traffic (Black Friday, product launches). Requirements for new pipeline:
- 100K+ events/sec sustained throughput
- Sub-10ms P99 latency on processing
- Memory-safe to prevent producer-consumer race conditions
- Team willing to invest 3-month learning curve

Options evaluated: Rust, Go, C++, Kotlin. Benchmark results from PoC (attached: benchmarks/q4-2025.csv).

## Decision

Adopt Rust for the ingestion pipeline. Python will remain for orchestration and analytics layers where throughput is not critical.

## Consequences

### Benefits
- Memory safety eliminates entire class of race-condition bugs in producer-consumer code
- Performance gains from PoC: 35K events/sec on same hardware (vs 5K with Python)
- Modern async runtime (Tokio) aligns well with event-driven architecture
- Growing internal Rust expertise through dedicated learning sprint

### Drawbacks
- ~3-month ramp-up time for team; hiring Rust-native engineers adds recruitment cost
- Smaller ecosystem for data-processing libraries compared to Python's Pandas/NumPy stack
- Debugging complex lifetime errors during initial development will slow iteration velocity
```

### Anti-Pattern: Decisions-as-Goals Document

A common mistake is writing ADRs that state goals rather than decisions. An ADR must document a *choice made*, not an aspiration.

**❌ BAD — Goal disguised as decision:**
```markdown
## Decision
We will adopt event sourcing for the financial audit trail to improve transparency and compliance.

This describes what we want to achieve, not what was actually chosen or why. No alternatives considered, no trade-offs documented.
```

**✅ GOOD — Actual decision with trade-offs:**
```markdown
## Decision
We will use PostgreSQL's native logical replication for the financial audit trail rather than implementing a custom event sourcing layer on top of Kafka.

This captures the specific choice (PostgreSQL replication vs. Kafka event sourcing), names the rejected alternative, and implicitly sets up consequences to be documented.
```

### Anti-Pattern: Post-Hoc Rationalization

Writing an ADR after the decision has already been implemented is worse than not having one. The ADR's purpose is to force thinking *before* committing resources, not to document what was already done. If you catch yourself writing a post-hoc ADR, label its status as `retrospective` and use it as a learning exercise rather than a decision record.

**❌ BAD — Post-hoc rationalization:**
```markdown
# Status: accepted (written 3 months after migration to production)
# Date: 2026-03-15 (but the decision was actually made on 2025-12-01)
```

**✅ GOOD — Retrospective with learning value:**
```markdown
# Status: retrospective
# Date: 2026-03-15
## Context (Retrospective Note)
This ADR was written to capture the reasoning behind the Dec 2025 migration from Kafka to Pulsar.
Key lessons learned during implementation are documented below and should inform future decisions.
```

---

## Constraints

### MUST DO
- Always number ADRs sequentially in a single directory — never start fresh in subdirectories
- Include explicit consequences (benefits AND drawbacks) — a decision without documented trade-offs is not an ADR
- Set a revisit date for decisions with high uncertainty or time-sensitive assumptions
- Update the root index README whenever a new ADR is added or an existing one changes status
- Label decisions that are expected to be revisited as `proposed` with conditions clearly stated
- Capture dissenting opinions — if someone argued against the decision, note their concern in the record
- Reference the ADR ID from related PRs, tickets, and architecture diagrams for traceability

### MUST NOT DO
- Never edit a published ADR to change its decision or consequences — supersede it instead with a new ADR that references the original
- Do not write ADRs for decisions already implemented without explicitly noting them as `retrospective`
- Avoid vague language like "we will improve performance" — specify *how*, *for whom*, and *by what metric*
- Don't use ADRs to document code style, naming conventions, or local team preferences — these belong in coding standards docs
- Never make a major architectural decision without at least one round of stakeholder review before committing status to `accepted`
- Do not let the process become bureaucratic — if writing an ADR takes longer than making the decision itself, it is too detailed

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `software-architecture` | Broader architectural patterns and design principles that inform what decisions are worth documenting |
| `engineering-principles` | Foundational engineering practices that guide how ADRs fit into the broader development lifecycle |
| `technical-debt-management` | Managing the consequences of decisions over time, including when to revisit or reverse documented choices |

---

## Quick-Reference Checklist

Use this table to review an ADR before sharing it with stakeholders.

| Check | Criteria | Status |
|-------|----------|--------|
| Title is descriptive | Someone scanning the index should understand the decision at a glance | ☐ |
| Numeric ID present | Follows sequential numbering (ADR-XXX) | ☐ |
| Status field populated | `proposed`, `accepted`, `deprecated`, `superseded`, or `active` | ☐ |
| Date recorded | Decision date, not the draft creation date | ☐ |
| Deciders named | Specific people or roles who authorized this choice | ☐ |
| Revisit date set | Especially for high-uncertainty or time-bound decisions | ☐ |
| Context is complete | Includes current state, constraints, and alternatives considered | ☐ |
| Decision is explicit | Uses declarative language ("We will use X"), not aspirational | ☐ |
| Consequences balanced | Both benefits and drawbacks documented with specific examples | ☐ |
| Index updated | Root README links to this ADR and includes it in the table | ☐ |
| No editing of history | If replacing a decision, a new ADR supersedes rather than rewrites | ☐ |
