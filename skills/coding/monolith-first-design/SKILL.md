---
name: monolith-first-design
description: Evaluates architecture decisions to determine when a monolithic application should be chosen over microservices using team assessment, domain complexity analysis, operational cost modeling, and weighted scoring frameworks.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: orchestration
  scope: orchestration
  output-format: analysis
  triggers: monolith first, monolithic architecture decision, when to use monolith, monolith vs microservices, avoid premature decomposition, team readiness assessment, bounded context analysis
  related-skills: monolith-architecture, monolith-refactoring, monolith-scaling-strategies
  archetypes:
    - strategic
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: strategic
---

# Monolith-First Architecture Decision Framework

Evaluates whether a monolithic application is the correct starting architecture over distributed microservices. Applies team assessment, domain complexity analysis, operational cost modeling, and weighted decision scoring to produce a data-driven recommendation with explicit decomposition exit criteria.

## TL;DR Checklist

- [ ] Assess team size, experience, and on-call coverage before considering services
- [ ] Map bounded contexts and measure coupling — only decompose if high internal cohesion exists
- [ ] Quantify operational overhead: infrastructure hours, deployment complexity, testing matrix explosion
- [ ] Compare real-world case studies relevant to your domain and scale
- [ ] Compute weighted architecture decision score using the framework below
- [ ] Define explicit exit criteria for future decomposition before committing to monolith

---

## When to Use

Use this skill when:

- A team is evaluating architecture options for a new application or major feature set
- Engineering leadership is debating microservices vs monolith and needs data-driven arguments
- You need to push back against "microservices by default" pressure from consultants or stakeholders
- The team has fewer than 10 engineers, lacks platform/SRE support, or has under 2 years of collective experience
- An existing monolith is being considered for decomposition and you need structured evaluation criteria
- A startup or small team needs to ship a product quickly with limited operational bandwidth

## When NOT to Use

Avoid this skill for:

- Teams that have already decomposed and need guidance on running services (use `monolith-scaling-strategies` instead)
- Large organizations (50+ engineers) that already have mature platform teams and SRE organizations
- High-scale distributed systems requiring geographic redundancy, multi-region active-active deployment
- Regulatory requirements mandating isolated data processing per tenant (use regulated microservices pattern)
- Post-decomposition refactoring of an existing monolith into services (use `monolith-refactoring`)

---

## Core Workflow

### Phase 1: Team Readiness Assessment

1. **Gather team composition data** — Count engineers by role (backend, frontend, devops, QA). Interview leads about on-call rotation experience and incident response capability. **Checkpoint:** Record exact headcount per function; estimates invalidate the scoring below.

2. **Evaluate operational maturity** — Assess whether the team has: dedicated SRE/platform engineering, CI/CD pipeline ownership, centralized logging/metrics infrastructure, and documented runbooks. Score 0-4 for each dimension. **Checkpoint:** If average operational score is below 1.5, microservices are almost certainly premature regardless of domain complexity.

3. **Compute team readiness score** — Apply the `assess_team_readiness()` function below with weighted factors. Teams scoring below 60 on a 0-100 scale should strongly favor monolith architecture.

4. **Document assumptions** — Record every assumption about future team growth, hiring plans, and organizational changes that could shift the recommendation over time. **Checkpoint:** Any unrecorded assumption becomes an untested risk during decomposition decisions later.

### Phase 2: Domain Complexity Analysis

5. **Identify bounded contexts** — Work with product stakeholders to map business capabilities. Each bounded context represents a distinct area of domain knowledge with well-defined interfaces to other contexts. Use event storming sessions or domain-driven design workshops. **Checkpoint:** If you cannot list at least 3-5 distinct bounded contexts, the domain is not complex enough for decomposition.

6. **Calculate inter-context coupling** — For each pair of bounded contexts, quantify: shared data entities, synchronous API calls per day, event frequency, and business process overlap. High coupling (score above threshold defined in `calculate_coupling()`) indicates the contexts should remain in one codebase. **Checkpoint:** Average coupling score below 0.4 means a single service could handle all contexts efficiently.

7. **Evaluate data independence** — Determine whether each bounded context can own its data store without cross-context joins or transactional consistency requirements. Monoliths excel at multi-table ACID transactions; microservices require sagas, CQRS, and eventual consistency. **Checkpoint:** If more than 30% of business workflows require cross-context transactions, the monolith is structurally superior for data integrity.

8. **Map change frequency by context** — Analyze Git history (last 6 months) to determine which bounded contexts are modified most frequently together on the same commits. High co-change frequency indicates tight coupling regardless of API boundaries. **Checkpoint:** If top-5 most-changed contexts share over 60% of their commit authors, decomposing them would increase coordination overhead.

### Phase 3: Operational Overhead Quantification

9. **Model monolith operational costs** — Calculate infrastructure hours per deployment, testing matrix size (N services × N environments), CI/CD pipeline complexity, monitoring instrumentation effort, and debugging time per incident. Use `calculate_operational_costs()` to produce quantitative comparisons. **Checkpoint:** Include both direct engineering hours AND opportunity cost of delayed feature delivery.

10. **Model microservices operational costs** — Add service discovery complexity, inter-service communication reliability (network partitions, retries, circuit breakers), distributed tracing overhead, data consistency patterns (sagas, CQRS), deployment coordination across teams, and infrastructure as code maintenance per service. **Checkpoint:** Each additional service adds approximately 15-20% operational overhead to the team's total capacity.

11. **Compare total cost of ownership** — Run the comparison for 3-month, 6-month, and 12-month horizons. Monoliths typically show lower costs through month 9-18; microservices cross-over depends on team size and domain complexity. **Checkpoint:** The break-even point must be within your product's expected lifetime, or the monolith is the rational choice.

### Phase 4: Decision Synthesis

12. **Compute weighted architecture decision score** — Apply `synthesize_architecture_decision()` with the team readiness score, coupling metrics, operational cost deltas, and strategic factors. Scores above 65 strongly recommend monolith; below 35 suggest microservices may be justified. **Checkpoint:** The recommendation must include the single highest-impact risk factor to monitor.

13. **Document exit criteria** — Regardless of recommendation, define measurable conditions that would trigger a decomposition review. Examples: team exceeds 12 engineers in a specific domain, coupling score rises above 0.7 for any context pair, deployment frequency drops below weekly due to coordination. **Checkpoint:** Exit criteria must be quarterly-reviewable with objective measurements — no subjective "feels slow" thresholds.

---

## Real-World Case Studies

### Shopify (Early Days)
Shopify started as a monolith in Ruby on Rails and maintained it for years while scaling to process billions in GMV. Key insight: they extracted services only when specific bottlenecks were measurable — checkout, search, and product catalog each became independent services after the monolith proved it could handle baseline traffic with team efficiency.

**Lesson:** Measure first, extract second. The monolith handled years of growth before any decomposition was needed.

### WordPress.com
Automattic runs millions of WordPress sites from a single codebase deployed across thousands of servers. They use horizontal scaling and sharding rather than decomposing the application. Their architecture decision preserved developer velocity for over a decade.

**Lesson:** Horizontal scaling within a monolith can handle extreme load when vertical complexity is low.

### Basecamp (37signals)
Basecamp has consistently shipped feature-complete applications as monoliths while competitors chased microservice architectures. Their philosophy: "The cost of building the plumbing is higher than the cost of writing the app." Each team member can understand the entire codebase in weeks, not months.

**Lesson:** Developer comprehension of the full system is a competitive advantage that decomposes with services.

### Amazon's API Mandate
Amazon's famous 2002 mandate requiring all teams to expose data and functionality through service interfaces was reactive — born from operational pain after years of microservice experimentation. Before the mandate, teams built tightly coupled distributed systems with no standards. The API mandate standardized the chaos; it didn't create the microservices architecture.

**Lesson:** Even Amazon validated monolith-first through failure. The mandate was about governing decomposition, not justifying it.

---

## Failure Modes

### 1. God Module
When a monolith grows beyond 500k lines without domain boundaries, no engineer can understand it end-to-end. **Mitigation:** Enforce module-level import restrictions, require design reviews for cross-module changes, and maintain explicit bounded context diagrams that are treated as architectural contracts.

### 2. Distributed Monolith
Decomposing a tightly coupled system into services while keeping synchronous RPC calls between every component creates the worst of both worlds: network latency plus deployment complexity without any independence. **Mitigation:** If coupling score is above 0.5 for more than two context pairs, decomposing would likely produce a distributed monolith — stay in the monolith and refactor internal boundaries first.

### 3. Database Coupling
When multiple logical services share tables or rely on foreign key constraints, each service cannot deploy independently without coordinating schema changes. **Mitigation:** In the monolith phase, design data access patterns so that each bounded context has its own schema namespace (even within a shared database). This makes future extraction cleaner.

### 4. Shared Global State
Singletons, global caches, and shared mutable state make it impossible to deploy services independently or run multiple instances without conflicts. **Mitigation:** Apply the dependency injection pattern consistently from day one. Every shared resource must be injectable, not globally accessible. This preserves future extraction paths.

### 5. No Extraction Strategy
Starting as a monolith without any plan for how specific modules will become services later means every future decomposition is a re-implementation. **Mitigation:** Even in the monolith phase, structure code so that bounded context boundaries are explicit: separate packages/modules per context, no cross-context imports beyond well-defined interfaces, and context-specific data models.

---

## Implementation Patterns

### Pattern 1: Team Readiness Assessment

Quantifies whether a team has the operational maturity to support microservices. Returns a score from 0-100 where scores below 60 indicate the team should strongly favor a monolithic architecture.

```python
from dataclasses import dataclass, field
from typing import List


@dataclass
class TeamReadiness:
    """Team readiness assessment result with breakdown by dimension."""
    
    total_score: float = 0.0
    backend_engineers: int = 0
    frontend_engineers: int = 0
    devops_engineers: int = 0
    qa_engineers: int = 0
    operational_maturity_avg: float = 0.0
    recommendation: str = ""


def assess_team_readiness(
    team_size: int,
    backend_count: int,
    frontend_count: int,
    devops_count: int,
    qa_count: int,
    has_dedicated_sre: bool,
    has_ci_cd_pipeline: bool,
    has_centralized_logging: bool,
    has_documented_runbooks: bool,
    avg_incident_response_minutes: float,
) -> TeamReadiness:
    """Assess team readiness for microservices decomposition.
    
    Evaluates team composition and operational maturity on a 0-100 scale.
    Scores below 60 indicate the team should strongly favor monolith architecture.
    
    Args:
        team_size: Total number of engineers on the product team.
        backend_count: Number of backend-focused engineers.
        frontend_count: Number of frontend-focused engineers.
        devops_count: Number of DevOps/SRE/platform engineers.
        qa_count: Number of quality assurance engineers.
        has_dedicated_sre: Whether the team has dedicated SRE or platform engineering.
        has_ci_cd_pipeline: Whether the team owns and maintains their CI/CD pipeline.
        has_centralized_logging: Whether centralized logging/metrics infrastructure exists.
        has_documented_runbooks: Whether incident response runbooks are documented.
        avg_incident_response_minutes: Average time to detect and begin responding to incidents.
    
    Returns:
        TeamReadiness with total score, breakdowns, and recommendation string.
    
    Raises:
        ValueError: If any count is negative or team_size does not match sum of roles.
    """
    if any(c < 0 for c in [backend_count, frontend_count, devops_count, qa_count]):
        raise ValueError("Engineer counts cannot be negative")
    
    role_sum = backend_count + frontend_count + devops_count + qa_count
    if team_size != 0 and role_sum > team_size:
        raise ValueError(f"Role counts ({role_sum}) exceed team size ({team_size})")
    
    # Team size penalty: microservices require coordination overhead
    # Teams under 6 engineers should almost always use monolith
    if team_size < 3:
        size_score = 0.0
    elif team_size < 6:
        size_score = 25.0
    elif team_size < 10:
        size_score = 50.0
    else:
        size_score = 75.0
    
    # Operational maturity scoring (each dimension worth up to 15 points)
    operational_scores = [
        (has_dedicated_sre, 15),
        (has_ci_cd_pipeline, 15),
        (has_centralized_logging, 15),
        (has_documented_runbooks, 15),
    ]
    
    op_maturity = sum(
        points if enabled else 0
        for enabled, points in operational_scores
    )
    
    # Incident response speed penalty: slow response indicates immature operations
    if avg_incident_response_minutes > 60:
        incident_penalty = 15.0
    elif avg_incident_response_minutes > 30:
        incident_penalty = 7.5
    else:
        incident_penalty = 0.0
    
    # DevOps ratio check: microservices need strong platform support
    if team_size > 0:
        devops_ratio = devops_count / team_size
    else:
        devops_ratio = 0.0
    
    platform_score = min(20.0, devops_ratio * 100.0)
    
    # Weighted total
    total_score = (
        size_score * 0.30 +          # Team composition weight
        op_maturity * 0.35 +          # Operational maturity weight  
        (15 - incident_penalty) * 0.20 +  # Incident response quality
        platform_score * 0.15         # Platform engineering support
    )
    
    total_score = round(min(100.0, max(0.0, total_score)), 1)
    
    # Recommendation logic
    if total_score < 35:
        recommendation = "Strongly favor monolith — team lacks operational maturity"
    elif total_score < 60:
        recommendation = "Favor monolith — microservices introduce unmanageable complexity"
    elif total_score < 75:
        recommendation = "Monolith recommended; re-evaluate at next growth phase"
    else:
        recommendation = "Microservices may be justified if domain coupling supports it"
    
    return TeamReadiness(
        total_score=total_score,
        backend_engineers=backend_count,
        frontend_engineers=frontend_count,
        devops_engineers=devops_count,
        qa_engineers=qa_count,
        operational_maturity_avg=round(op_maturity / 4.0, 1),
        recommendation=recommendation,
    )
```

### Pattern 2: Domain Analysis with Bounded Contexts and Coupling

Analyzes domain boundaries to determine if decomposition is warranted by measuring coupling between bounded contexts. High coupling indicates the system should remain monolithic.

```python
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass
class CouplingMeasurement:
    """Measures coupling between two bounded contexts."""
    
    context_a: str = ""
    context_b: str = ""
    shared_entities: int = 0
    sync_api_calls_per_day: int = 0
    event_frequency_per_day: int = 0
    business_process_overlap: float = 0.0  # 0.0 to 1.0
    
    @property
    def coupling_score(self) -> float:
        """Compute coupling score from 0.0 (independent) to 1.0 (tightly coupled)."""
        entity_weight = min(0.3, self.shared_entities * 0.05)
        sync_weight = min(0.4, self.sync_api_calls_per_day / 200.0) if self.sync_api_calls_per_day > 0 else 0.0
        event_weight = min(0.15, self.event_frequency_per_day / 500.0) if self.event_frequency_per_day > 0 else 0.0
        process_weight = self.business_process_overlap * 0.3
        
        score = entity_weight + sync_weight + event_weight + process_weight
        return round(min(1.0, max(0.0, score)), 3)


@dataclass
class DomainAnalysis:
    """Results of bounded context and coupling analysis."""
    
    contexts: List[str] = field(default_factory=list)
    coupling_matrix: Dict[Tuple[str, str], CouplingMeasurement] = field(default_factory=dict)
    average_coupling: float = 0.0
    max_coupling_pair: Tuple[str, str, float] = ("", "", 0.0)
    recommendation: str = ""


def calculate_coupling(
    bounded_contexts: List[str],
    entity_shares: Dict[Tuple[str, str], int],
    api_calls_per_day: Dict[Tuple[str, str], int],
    event_frequencies: Dict[Tuple[str, str], int],
    process_overlaps: Dict[Tuple[str, str], float],
) -> DomainAnalysis:
    """Calculate coupling between bounded contexts to assess decomposition feasibility.
    
    For each pair of contexts, measures shared data entities, synchronous API usage,
    event-driven communication frequency, and business process overlap. Produces a
    composite coupling score where scores above 0.5 indicate the contexts should remain
    in one codebase until coupling is reduced through internal refactoring.
    
    Args:
        bounded_contexts: List of domain context names (e.g., ["orders", "payments", "inventory"]).
        entity_shares: Maps context pairs to count of shared database entities/tables.
        api_calls_per_day: Maps context pairs to daily synchronous API call volume.
        event_frequencies: Maps context pairs to daily event/message frequency.
        process_overlaps: Maps context pairs to business process overlap ratio (0.0-1.0).
    
    Returns:
        DomainAnalysis with full coupling matrix and recommendation.
    
    Raises:
        ValueError: If contexts list is empty or pair keys are inconsistent.
    """
    if not bounded_contexts:
        raise ValueError("Must provide at least one bounded context")
    
    if len(bounded_contexts) < 2:
        return DomainAnalysis(
            contexts=bounded_contexts,
            recommendation="Single context — monolith is trivially correct",
        )
    
    coupling_matrix: Dict[Tuple[str, str], CouplingMeasurement] = {}
    coupling_scores: List[float] = []
    max_pair: Tuple[str, str, float] = ("", "", 0.0)
    
    # Build symmetric coupling matrix (only store upper triangle)
    for i in range(len(bounded_contexts)):
        for j in range(i + 1, len(bounded_contexts)):
            ctx_a = bounded_contexts[i]
            ctx_b = bounded_contexts[j]
            pair_key = (ctx_a, ctx_b)
            
            shared = entity_shares.get(pair_key, 0)
            calls = api_calls_per_day.get(pair_key, 0)
            events = event_frequencies.get(pair_key, 0)
            overlap = process_overlaps.get(pair_key, 0.0)
            
            measurement = CouplingMeasurement(
                context_a=ctx_a,
                context_b=ctx_b,
                shared_entities=shared,
                sync_api_calls_per_day=calls,
                event_frequency_per_day=events,
                business_process_overlap=overlap,
            )
            
            coupling_matrix[pair_key] = measurement
            score = measurement.coupling_score
            coupling_scores.append(score)
            
            if score > max_pair[2]:
                max_pair = (ctx_a, ctx_b, score)
    
    avg_coupling = round(sum(coupling_scores) / len(coupling_scores), 3) if coupling_scores else 0.0
    
    # Recommendation logic based on coupling thresholds
    if avg_coupling < 0.2:
        recommendation = (
            f"Low coupling ({avg_coupling}) — contexts could potentially be separate services, "
            f"but monolith is still preferred for teams under 10 engineers."
        )
    elif avg_coupling < 0.4:
        recommendation = (
            f"Moderate coupling ({avg_coupling}) — remain monolithic. "
            f"Decompose only after internal boundaries are strengthened."
        )
    elif max_pair[2] > 0.5:
        recommendation = (
            f"High coupling between '{max_pair[0]}' and '{max_pair[1]}' ({max_pair[2]:.3f}). "
            f"Decomposing these contexts would produce a distributed monolith. "
            f"Refactor internal boundaries first."
        )
    else:
        recommendation = (
            f"Elevated average coupling ({avg_coupling}) — defer decomposition until "
            f"coupling drops below 0.4 through domain-driven refactoring."
        )
    
    return DomainAnalysis(
        contexts=bounded_contexts,
        coupling_matrix=coupling_matrix,
        average_coupling=avg_coupling,
        max_coupling_pair=max_pair,
        recommendation=recommendation,
    )
```

### Pattern 3: Operational Cost Comparison Calculator

Models the total operational cost of monolith vs microservices across multiple dimensions and time horizons.

```python
from dataclasses import dataclass
from typing import List


@dataclass
class OperationalCostComparison:
    """Total operational cost comparison between monolith and microservices."""
    
    weeks_modeled: int = 12
    team_size: int = 4
    
    # Monolith costs (per week)
    monolith_infrastructure_hours: float = 8.0
    monolith_deployment_hours: float = 2.0
    monolith_testing_hours: float = 6.0
    monolith_debugging_hours: float = 3.0
    monolith_total_per_week: float = 0.0
    
    # Microservices costs (per week)
    microservice_infrastructure_hours: float = 0.0
    microservice_deployment_hours: float = 0.0
    microservice_testing_hours: float = 0.0
    microservice_debugging_hours: float = 0.0
    microservice_coordination_hours: float = 0.0
    microservice_total_per_week: float = 0.0
    
    # Delta and break-even
    weekly_hour_savings_monolith: float = 0.0
    break_even_weeks: int = 0
    recommendation: str = ""


def calculate_operational_costs(
    team_size: int,
    num_microservices_target: int,
    avg_engineer_hourly_rate: float,
    deployments_per_week_monolith: int = 3,
    deployments_per_week_services: int = 12,
    test_env_count: int = 3,
    monitoring_hours_per_service: float = 4.0,
    coordination_meeting_hours_per_week: float = 8.0,
) -> OperationalCostComparison:
    """Calculate and compare operational costs between monolith and microservices architectures.
    
    Models infrastructure management hours, deployment overhead, testing complexity,
    debugging time across services, and team coordination costs over a configurable
    time horizon. Produces a weekly cost delta and estimated break-even point.
    
    Args:
        team_size: Total number of engineers on the product team.
        num_microservices_target: Number of services if decomposing.
        avg_engineer_hourly_rate: Blended hourly rate for engineering labor (USD).
        deployments_per_week_monolith: Expected deployment frequency for monolith.
        deployments_per_week_services: Expected combined deployment frequency across all services.
        test_env_count: Number of environment configurations to maintain.
        monitoring_hours_per_service: Weekly hours per service for metrics/alert tuning.
        coordination_meeting_hours_per_week: Hours spent on cross-service coordination meetings.
    
    Returns:
        OperationalCostComparison with weekly totals, deltas, break-even, and recommendation.
    
    Raises:
        ValueError: If team_size is below 1 or num_microservices_target is below 2.
    """
    if team_size < 1:
        raise ValueError("Team size must be at least 1")
    if num_microservices_target < 2:
        raise ValueError("Microservice target must be at least 2 for meaningful comparison")
    
    # === MONOLITH COSTS (per week) ===
    monolith_infra = 4.0  # Base infrastructure management
    monolith_deploy = deployments_per_week_monolith * 0.5  # ~30 min per deploy
    monolith_testing = test_env_count * 1.5  # Setup and smoke tests across environments
    monolith_debugging = 2.0  # Single codebase, straightforward stack traces
    
    monolith_total = monolith_infra + monolith_deploy + monolith_testing + monolith_debugging
    
    # === MICROSERVICES COSTS (per week) ===
    microservice_infra = (
        num_microservices_target * 2.0            # Per-service infra management
        + monitoring_hours_per_service * num_microservices_target  # Alert tuning per service
    )
    
    microservice_deploy = deployments_per_week_services * 0.5  # Coordination overhead
    microservice_testing = (
        test_env_count * num_microservices_target * 1.5  # N environments × N services
    )
    microservice_debugging = 3.0 * num_microservices_target  # Distributed tracing overhead
    microservice_coordination = coordination_meeting_hours_per_week
    
    microservice_total = (
        microservice_infra + microservice_deploy + microservice_testing
        + microservice_debugging + microservice_coordination
    )
    
    weekly_savings = round(microservice_total - monolith_total, 1)
    
    # Break-even calculation: how many weeks of savings until microservice infrastructure investment pays off
    # Assume upfront microservice platform setup costs 40 engineering-hours
    upfront_investment_hours = 40.0
    break_even_weeks = (
        int(upfront_investment_hours / weekly_savings) if weekly_savings > 0 else 999
    )
    
    # Recommendation based on team size and cost delta
    if weekly_savings < 10:
        recommendation = (
            f"Monolith saves ~{weekly_savings:.0f} engineering-hours/week. "
            f"With {team_size} engineers, this equals ${(weekly_savings * avg_engineer_hourly_rate):,.0f}/week in labor savings. "
            f"Break-even at week {break_even_weeks}. Monolith is the rational choice."
        )
    elif weekly_savings < 25:
        recommendation = (
            f"Marginal savings ({weekly_savings:.0f} hours/week) — insufficient to justify "
            f"the architectural complexity of microservices for a team of {team_size} engineers. "
            f"Re-evaluate when team grows beyond 12 engineers."
        )
    else:
        recommendation = (
            f"Microservices save ~{weekly_savings:.0f} hours/week. "
            f"Break-even at week {break_even_weeks}. "
            f"Decomposition may be justified if team exceeds 10 engineers "
            f"and domain coupling supports independent service boundaries."
        )
    
    return OperationalCostComparison(
        team_size=team_size,
        weeks_modeled=12,
        monolith_total_per_week=round(monolith_total, 1),
        microservice_total_per_week=round(microservice_total, 1),
        weekly_hour_savings_monolith=weekly_savings,
        break_even_weeks=min(break_even_weeks, 999),
        recommendation=recommendation,
    )
```

### Pattern 4: Architecture Decision Synthesis with Weighted Scoring

Combines all assessment dimensions into a single weighted score that drives the final architecture recommendation.

```python
from dataclasses import dataclass
from typing import Dict, List


@dataclass
class ArchitectureDecision:
    """Complete architecture decision output."""
    
    recommendation: str = ""  # "monolith", "microservices", or "hybrid"
    confidence_score: float = 0.0  # 0-100, higher = more confident in recommendation
    
    # Dimension scores (each 0-100)
    team_readiness_score: float = 0.0
    domain_coupling_score: float = 0.0
    operational_cost_score: float = 0.0
    strategic_alignment_score: float = 0.0
    
    # Weights applied to each dimension
    weight_team: float = 0.30
    weight_coupling: float = 0.25
    weight_operations: float = 0.25
    weight_strategy: float = 0.20
    
    # Risk factors and exit criteria
    highest_risk_factor: str = ""
    exit_criteria: List[str] = field(default_factory=list)


def synthesize_architecture_decision(
    team_readiness_score: float,
    average_coupling: float,
    weekly_hour_savings_monolith: float,
    team_size: int,
    product_lifespan_months: int = 24,
    has_strategic_need_for_isolation: bool = False,
    regulatory_tenant_isolation: bool = False,
) -> ArchitectureDecision:
    """Synthesize architecture decision from all assessment dimensions.
    
    Combines team readiness, domain coupling, operational cost analysis, and strategic
    factors into a single weighted recommendation. Produces the final monolith-vs-microservices
    decision with explicit risk factors and decomposition exit criteria.
    
    Args:
        team_readiness_score: Score from assess_team_readiness() on 0-100 scale.
        average_coupling: Average coupling score from calculate_coupling() (0.0-1.0).
        weekly_hour_savings_monolith: Hour savings for monolith from calculate_operational_costs().
            Positive = monolith saves time; negative = microservices save time.
        team_size: Total number of engineers on the product team.
        product_lifespan_months: Expected months until major rewrite or decommissioning.
        has_strategic_need_for_isolation: Whether business requirements demand service isolation.
        regulatory_tenant_isolation: Whether regulations require data/processing separation per tenant.
    
    Returns:
        ArchitectureDecision with recommendation, confidence score, dimension scores,
        highest risk factor, and measurable exit criteria for future decomposition.
    
    Raises:
        ValueError: If any score is outside its expected range.
    """
    # Validate input ranges
    if not (0 <= team_readiness_score <= 100):
        raise ValueError(f"team_readiness_score must be 0-100, got {team_readiness_score}")
    if not (0 <= average_coupling <= 1.0):
        raise ValueError(f"average_coupling must be 0.0-1.0, got {average_coupling}")
    
    # === Convert raw metrics to normalized dimension scores (0-100) ===
    
    # Team readiness maps directly: lower score = stronger monolith case
    team_score = round(100 - team_readiness_score, 1)
    
    # Coupling: high coupling strongly favors monolith (inverse relationship)
    coupling_score = round((1.0 - average_coupling) * 100, 1)
    
    # Operational cost: positive savings for monolith favors it
    if weekly_hour_savings_monolith > 20:
        ops_score = 95.0
    elif weekly_hour_savings_monolith > 10:
        ops_score = 75.0 + (weekly_hour_savings_monolith - 10) * 2.0
    elif weekly_hour_savings_monolith > 0:
        ops_score = 55.0 + weekly_hour_savings_monolith * 2.0
    else:
        # Microservices save time — but only if team is large enough to benefit
        ops_score = max(5.0, 45.0 + (team_size - 6) * 5.0) if team_size > 6 else 15.0
    
    # Strategic factors
    strategy_score = 20.0  # Default: favors monolith
    if regulatory_tenant_isolation:
        strategy_score = 5.0  # Regulation mandates isolation regardless of other factors
    elif has_strategic_need_for_isolation:
        strategy_score = 30.0  # Some business case for isolation
    
    # === Weighted composite score (higher = more monolith, lower = more microservices) ===
    weighted_score = (
        team_score * 0.30 +
        coupling_score * 0.25 +
        ops_score * 0.25 +
        strategy_score * 0.20
    )
    weighted_score = round(min(100.0, max(0.0, weighted_score)), 1)
    
    # === Determine recommendation and confidence ===
    if weighted_score >= 65:
        recommendation = "monolith"
        confidence = min(95.0, weighted_score * 0.85)
    elif weighted_score <= 35:
        recommendation = "microservices"
        confidence = min(90.0, (100 - weighted_score) * 0.85)
    else:
        recommendation = "hybrid-monolith-start"
        confidence = min(70.0, (abs(weighted_score - 50)) * 2.0)
    
    # === Identify highest risk factor ===
    dimension_scores = {
        "team operational maturity": team_readiness_score,
        "domain coupling (high=bad for decomposition)": average_coupling * 100,
        "operational cost delta": abs(weekly_hour_savings_monolith),
        "strategic isolation needs": 100 - strategy_score if not regulatory_tenant_isolation else 50,
    }
    
    highest_risk = max(dimension_scores, key=dimension_scores.get)
    
    # === Generate exit criteria for future decomposition ===
    exit_criteria = [
        f"Team grows beyond {min(team_size + 8, 20)} engineers with dedicated SRE platform support",
        f"Any bounded context pair coupling exceeds 0.5 sustained over two quarterly reviews",
        f"Deployment coordination overhead exceeds 15 hours/week across teams",
        f"Feature delivery velocity drops below 2 significant releases per sprint for 3+ consecutive quarters",
        f"A specific bounded context demonstrates independent scaling requirements "
        f"(e.g., traffic patterns 5x others) sustained for 6 months",
    ]
    
    # Add strategic exit criteria if applicable
    if product_lifespan_months > 36:
        exit_criteria.append(
            "Product lifespan exceeds 36 months — schedule annual architecture review"
        )
    
    return ArchitectureDecision(
        recommendation=recommendation,
        confidence_score=round(confidence, 1),
        team_readiness_score=team_score,
        domain_coupling_score=coupling_score,
        operational_cost_score=ops_score,
        strategic_alignment_score=strategy_score,
        highest_risk_factor=highest_risk,
        exit_criteria=exit_criteria,
    )
```

---

## Constraints

### MUST DO
- Always assess team operational maturity before domain complexity — a weak team cannot run microservices regardless of architecture quality
- Quantify every claim with measurements: coupling scores, deployment hours, incident response times
- Document assumptions about future team growth and organizational changes in the decision record
- Define explicit exit criteria that are quarterly-reviewable with objective thresholds — no subjective language
- Structure the monolith with explicit bounded context boundaries (separate modules/packages per context) from day one
- Treat the architecture decision as reversible: write it down, set review dates, measure against criteria
- Include all stakeholders (product, engineering, operations) in the assessment — architecture decisions affect delivery speed and reliability for all teams
- When recommending microservices, require that the team has at least 3 DevOps/SRE engineers or a dedicated platform team

### MUST NOT DO
- Base architecture decisions on conference talks, vendor presentations, or "industry trends" without quantitative analysis
- Decompose based on technology preferences (e.g., "everyone wants to use Kafka") — decompose based on domain boundaries and coupling metrics
- Assume microservices automatically improve scalability — they shift complexity from code to coordination without necessarily reducing either
- Skip the operational cost comparison — many teams dramatically underestimate debugging, monitoring, and deployment overhead across services
- Set exit criteria that are impossible to measure objectively (e.g., "when it feels slow") — every criterion must have a quantifiable threshold
- Ignore the distributed monolith anti-pattern — if coupling is high, decomposing creates synchronous RPC chains with none of the independence benefits
- Allow architecture decisions to be made by a single individual without engineering leadership consensus and documented tradeoffs

---

## Output Template

When applying this skill, produce:

1. **Team Readiness Assessment** — Team composition data, operational maturity scores, readiness score (0-100), and recommendation with rationale
2. **Domain Analysis Report** — Bounded context inventory, coupling matrix with scores per pair, average coupling, highest-risk pair, and decomposition feasibility assessment
3. **Operational Cost Comparison** — Weekly engineering hours for monolith vs microservices across all dimensions, total weekly delta, cost in labor dollars, break-even timeline
4. **Architecture Decision** — Final recommendation (monolith / microservices / hybrid), confidence score (0-100), weighted dimension breakdown with individual scores and applied weights
5. **Risk Assessment** — Highest-impact risk factor to monitor, secondary risks ranked by probability and impact, mitigation strategies for each
6. **Exit Criteria** — Measurable conditions that would trigger a decomposition review, including thresholds, review cadence (quarterly recommended), and responsible party

---

## Related Skills

| Skill | Purpose |
|---|---|
| `monolith-architecture` | Designing and implementing the monolith structure with bounded context boundaries |
| `monolith-refactoring` | Extracting services from a mature monolith when exit criteria are met |
| `monolith-scaling-strategies` | Scaling patterns for monoliths: read replicas, sharding, caching, async queues |

> 📖 skill(local cache): monolith-first-design

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Martin Fowler — Modular Monolith](https://martinfowler.com/articles/modular-monolith.html)
- [Martin Fowler — Scaling the Monolith](https://martinfowler.com/articles/scaling-monolith.html)
- [Shopify Engineering Blog — Scaling Ruby on Rails](https://shopify.engineering/tagged/monolith)
- [Basecamp's Approach to Productivity and Architecture](https://basecamp.com/essays/the-cost-of-microservices)
- [Amazon's API Mandate — Case Study by Werner Vogels](https://martinfowler.com/articles/201901-monolith-to-microservices.html)
