---




name: skill-systems-architecture
description: Designs production-ready multi-skill agent architectures with cross-skill coordination patterns, quality gates, deployment pipelines, and monitoring strategies for AI skill ecosystems.
license: MIT
compatibility: opencode
archetypes:
  - strategic
  - orchestration
anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: strategic
metadata:
  version: "1.0.0"
  domain: agent
  triggers: >-
    skill architecture, multi-skill systems, cross-skill coordination,
    quality gates, deployment pipeline, how do i deploy skills at scale,
    skill monitoring strategy, orchestration patterns
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
    - guidance
    - examples
    - diagrams
    - do-dont
  related-skills: >-
    skill-engineering, skill-lifecycle-management, skill-ecosystem-design,
    skill-audit, skill-router-system




---





# Multi-Skill Systems Architecture

Orchestrates the production deployment of multi-skill agent systems — designing how skills coordinate at runtime, validating quality gates across pipelines, and building monitoring strategies that keep skill ecosystems healthy under real-world load. This skill operates at the system level: it does not create individual SKILL.md files, manage retirement schedules, or design network topology.

## TL;DR Checklist

- [ ] Classify the deployment target (staging vs production) before selecting architecture patterns
- [ ] Design cross-skill coordination with explicit fallback chains and timeout boundaries
- [ ] Define quality gates at every pipeline stage — trigger validation, stub detection, integration testing
- [ ] Build deployment pipeline with staging environment, canary rollout, and rollback procedures
- [ ] Set up monitoring for skill performance metrics (load latency, trigger accuracy, success rate)
- [ ] Document the complete system architecture diagram showing all components and data flows

---

## When to Use

Use this skill when:

- Designing the production architecture for deploying multiple skills across agent systems
- Building a deployment pipeline that validates and releases skills from staging to production
- Establishing quality gates that every skill must pass before entering the routing index
- Designing cross-skill coordination patterns for agents that load multiple skills in sequence or parallel
- Setting up monitoring strategies to track skill health, trigger accuracy, and performance at scale
- Migrating an existing single-skill setup to a multi-skill production architecture
- Planning canary deployments for new skills alongside existing ones

---

## When NOT to Use

Avoid this skill for:

- Creating or editing individual SKILL.md content — use `skill-engineering` instead (that skill handles trigger engineering, stub detection, and constraint design)
- Managing version bumps, deprecation, or retirement of individual skills — use `skill-lifecycle-management` instead
- Designing the skill dependency graph or reciprocal relationship network — use `skill-ecosystem-design` instead
- Auditing individual skill quality — use `skill-audit` instead (that skill validates content against standards)
- Configuring the runtime routing engine or confidence thresholds — use `skill-router-system` instead

---

## Core Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MULTI-SKILL SYSTEM ARCHITECTURE                          │
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │ Author   │───▶│ Validate │───▶│ Staging  │───▶│ Production│              │
│  │ Skills   │    │ Pipeline │    │ Deploy   │    │ Deploy   │              │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘              │
│                       │                    │                │               │
│                  [Quality Gate 1]     [Quality Gate 2]      │               │
│                  stub + trigger       integration          │               │
│                  validation           tests                │               │
│                                                                    │         │
│                     ┌──────────────┐                               │               │
│                     │ Monitoring & │◄──────────────────────────────┘               │
│                     │ Observability│  (feedback loop from prod)                    │
│                     └──────────────┘                                             │
│                                                                                  │
│  Runtime Flow:                                                                   │
│  Agent Task → Router Index → Skill Match → Load Skill(s) → Execute              │
│                        ↓            ↓               ↓                           │
│                  trigger      confidence       fallback chain                   │
│                  validation   scoring         on failure                         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

1. **Inventory and Classify Existing Skills** — Catalog all skills in the ecosystem. Classify each by: role (implementation, orchestration, reference), domain, maturity (draft/beta/stable), and criticality (core vs auxiliary). This creates the baseline inventory for architecture decisions.

   **Checkpoint:** Every skill must have a current `metadata.maturity` field set. Skills without maturity classification should be flagged as "unclassified" and routed to `skill-audit` for assessment before inclusion in the production pipeline.

2. **Design Cross-Skill Coordination Patterns** — Define how skills interact at runtime. For every group of related skills (e.g., the full risk management suite), specify:
   - **Sequential loading:** Which skills must load in order (foundational → tactical → emergency)
   - **Parallel loading:** Which skills can load simultaneously without conflicts
   - **Fallback chains:** What happens when a skill fails to load or returns low confidence
   - **Timeout boundaries:** Maximum load time per skill, maximum total load time for the system

   **Checkpoint:** No single skill should be a blocking dependency for more than 3 other skills. If it is, decompose the dependency into async loading with graceful degradation.

3. **Define Quality Gates** — Establish validation stages that every skill passes through before deployment:

   ```
   Pipeline Stages (quality gates):
   
   Stage 1: Frontmatter Validation
     ├── YAML parseable?
     ├── name matches directory kebab-case?
     ├── triggers count between 3-8 terms?
     └── role/scope/output-format are valid enum values?
   
   Stage 2: Stub Detection (Zero-Tolerance)
     ├── File size >= 3,000 bytes?
     ├── Zero stub sentinel occurrences?
     ├── >= 2 real code blocks (for implementation skills)?
     └── Core Workflow has domain-specific steps with Checkpoints?
   
   Stage 3: Trigger Space Analysis
     ├── No shared triggers > 30% with sibling skills?
     ├── At least one conversational variant present?
     └── No ultra-generic single-word triggers?
   
   Stage 4: Integration Testing
     ├── All related-skills references resolve to existing files?
     ├── Reciprocity verified (if A lists B, B lists A)?
     └── No circular dependencies in the dependency graph?
   ```

   **Checkpoint:** All four quality gate stages must return PASS before a skill advances to staging. Any failure produces an actionable report with specific fixes referenced back to AGENTS.md quality checklist.

4. **Build the Deployment Pipeline** — Design the CI/CD pipeline for skills:

   ```yaml
   # Example deployment pipeline structure (GitOps pattern)
   pipeline:
     name: skill-deployment-pipeline
     
     stages:
       - name: validate
         triggers: [push, pull_request]
         checks:
           - validate_skill.sh --llm            # Static + LLM validation
           - python3 scripts/generate_readme.py # Regenerate catalog
           - git diff --exit-code               # Verify automation output clean
       
       - name: staging
         triggers: [validate_pass]
         actions:
           - deploy_to_staging_index.json      # Update staging index only
           - run_integration_tests             # Test with sample agent tasks
           - measure_load_performance          # Record latency metrics
       
       - name: canary
         triggers: [staging_pass, manual_approval]
         actions:
           - deploy_10_percent_traffic         # Route 10% of requests to new skill set
           - monitor_error_rate                # Track failure rate vs baseline
           - wait_for_stability_window         # 30-minute stability observation
       
       - name: production
         triggers: [canary_stable, manual_approval]
         actions:
           - full_traffic_migration            # Route 100% to new skill set
           - update_skills-index.json          # Publish to live index
           - send_deployment_notification      # Alert maintainers
   ```

   **Checkpoint:** The pipeline must support rollback at every stage. A `git revert` on the production deployment stage should restore the previous skills-index.json and trigger a router reload within 5 minutes.

5. **Set Up Monitoring and Observability** — Define metrics to track skill health in production:

   | Metric Category | Specific Metrics | Alert Threshold |
   |---|---|---|
   | **Load Performance** | Skill load latency (p50, p95, p99), total system load time | p95 > 2s triggers warning |
   | **Trigger Accuracy** | False positive rate (skill loads when not needed), miss rate (needed skill doesn't load) | False positive > 15% or miss rate > 20% |
   | **Success Rate** | % of times loaded skill produces useful output vs. user re-asking | Success rate < 85% |
   | **Coverage** | % of agent tasks that successfully match at least one skill | Coverage < 70% |
   | **Quality Decay** | Skill performance degradation over time (same query, worse output) | Output score drops > 10% week-over-week |

   ```python
   def compute_skill_health_score(
       load_latency_p95: float,      # seconds
       trigger_accuracy: float,      # 0.0 - 1.0
       success_rate: float,          # 0.0 - 1.0
       coverage_pct: float,          # 0.0 - 1.0
   ) -> dict:
       """Compute a composite health score for the skill ecosystem.
       
       Uses weighted averaging with per-metric scoring curves.
       Returns individual metric scores and overall rating.
       """
       weights = {
           "load_latency": 0.25,     # Performance matters most
           "trigger_accuracy": 0.30, # Accuracy is critical for UX
           "success_rate": 0.25,     # Output quality drives trust
           "coverage": 0.20          # Coverage determines usefulness
       }
       
       scores = {}
       
       # Load latency score: linear decay from 1.0 (under 1s) to 0.0 (over 5s)
       if load_latency_p95 <= 1.0:
           scores["load_latency"] = 1.0
       elif load_latency_p95 >= 5.0:
           scores["load_latency"] = 0.0
       else:
           scores["load_latency"] = 1.0 - (load_latency_p95 - 1.0) / 4.0
       
       scores["trigger_accuracy"] = trigger_accuracy
       scores["success_rate"] = success_rate
       scores["coverage"] = coverage_pct / 100.0
       
       overall = sum(weights[k] * scores[k] for k in weights)
       
       if overall >= 0.9:
           rating = "excellent"
       elif overall >= 0.75:
           rating = "good"
       elif overall >= 0.60:
           rating = "fair"
       else:
           rating = "needs_attention"
       
       return {
           "metric_scores": scores,
           "weighted_score": round(overall, 3),
           "rating": rating,
           "recommendations": _generate_recommendations(scores)
       }
   ```

   **Checkpoint:** Monitoring must include a feedback loop — metrics that trigger an alert should automatically create a ticket assigned to the skill's maintainer with specific metric values and suggested investigation steps.

6. **Design Fallback and Recovery Strategies** — For every coordination pattern, define what happens during failures:

   | Failure Mode | Immediate Action | Recovery Path |
   |---|---|---|
   | Skill fails to load | Skip to next skill in sequence; log error with context | Retry once after 5s; if still failing, alert maintainer |
   | Low confidence match | Load top-3 ranked skills instead of single best | User can explicitly request a different skill via `/skill` |
   | Timeout during execution | Kill the task; return partial results if available | Flag as degraded; skip this skill for 5 minutes (circuit breaker) |
   | Trigger collision (multiple skills fire) | Use confidence scoring to pick highest; load secondary in background | Log collision event; review trigger overlap with `skill-ecosystem-design` |
   | Router index corruption | Reload from last known good commit (`git checkout HEAD~1`) | Alert on-call; manual intervention within 15 minutes |

   **Checkpoint:** Every fallback strategy must be tested under simulated failure conditions before deployment. Use chaos engineering principles — inject failures into staging to verify recovery procedures work as documented.

---

## System Architecture Patterns

### Pattern 1: Orchestrator-Based Skill Loading

An orchestrator component manages skill loading decisions, coordinating multiple skills for complex tasks:

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Agent     │────▶│  Orchestrator    │────▶│  Router Index   │
│   Request   │     │  (Coordinator)   │     │  (Skill Catalog)│
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │                         │
                    ┌──────▼─────────┐        ┌─────▼──────┐
                    │ Skill Loader   │───────▶│ Matched    │
                    │ Manager        │        │ Skills (N) │
                    └───────┬────────┘        └────────────┘
                            │
                   ┌────────▼────────┐
                   │ Execution       │
                   │ Coordinator     │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │ Results         │
                   │ Merger &        │
                   │ Response Builder│
                   └─────────────────┘
```

The orchestrator pattern is essential when a single agent task requires multiple skills to produce a coherent response. It manages:
- **Task decomposition:** Breaking a complex request into sub-tasks, each mapped to one or more skills
- **Result merging:** Combining outputs from multiple loaded skills into a unified response
- **Conflict resolution:** When two skills provide contradictory guidance, use confidence scoring and domain priority

**Implementation rule (reference `code-philosophy`):** The orchestrator must follow Law 1 (Early Exit) — if any required skill in the chain fails to load, exit immediately rather than producing partial results. Follow Law 4 (Fail Fast) — log detailed context about which skill failed and why.

### Pattern 2: Canary Deployment for Skill Ecosystems

When deploying changes to a large skill set, use canary deployment to limit blast radius:

```
Deployment phases (canary strategy):

Phase 1: Isolated Staging     → Skills deployed to staging index only
Phase 2: Internal Test        → 5-10 trusted testers route through new skills
Phase 3: Canary 10%           → 10% of production traffic hits new skill set
Phase 4: Monitor              → Observe for 30 minutes (or 100 requests, whichever first)
Phase 5: Canary Expand        → If stable, expand to 50% traffic
Phase 6: Full Production      → 100% traffic; update skills-index.json permanently

Rollback trigger: Any phase with error rate > baseline by more than 5%
```

**Checkpoint:** After canary deployment but before full rollout, verify that the new skill set does not degrade performance of existing skills (cross-contamination check).

### Pattern 3: Multi-Round Quality Validation

For high-criticality deployments (e.g., replacing core skills used in 80%+ of agent tasks), implement multi-round validation:

```python
def run_multi_round_validation(
    skill_path: str,
    test_tasks: list[str],
    rounds: int = 3
) -> dict:
    """Validate a skill across multiple rounds with increasing stringency.
    
    Each round tests the same task set but with progressively stricter criteria.
    
    Args:
        skill_path: Path to the SKILL.md being validated.
        test_tasks: List of real agent tasks used for testing.
        rounds: Number of validation rounds (default 3).
    
    Returns:
        Validation results per round with pass/fail status and metrics.
    """
    results = {
        "skill_path": skill_path,
        "rounds": [],
        "overall_pass": True,
        "pass_rate_per_round": []
    }
    
    for round_num in range(1, rounds + 1):
        round_results = {
            "round": round_num,
            "tasks_tested": len(test_tasks),
            "tasks_passed": 0,
            "avg_confidence": 0.0,
            "stricter_threshold": True if round_num > 1 else False
        }
        
        # Execute each test task through the skill pipeline
        for task in test_tasks:
            outcome = evaluate_skill_against_task(
                skill_path, task, 
                stricter=round_num > 1
            )
            if outcome.passed:
                round_results["tasks_passed"] += 1
        
        pass_rate = round_results["tasks_passed"] / len(test_tasks)
        round_results["pass_rate"] = pass_rate
        round_results["threshold_met"] = (
            pass_rate >= 0.95 if round_num > 1 else pass_rate >= 0.85
        )
        
        results["rounds"].append(round_results)
        results["pass_rate_per_round"].append(pass_rate)
        
        # Fail fast: if any round fails critically, stop early
        if not round_results["threshold_met"]:
            results["overall_pass"] = False
            break
    
    return results


def evaluate_skill_against_task(
    skill_path: str,
    task: str,
    stricter: bool = False
) -> dict:
    """Evaluate a single skill against a test task.
    
    Returns evaluation result with pass/fail and quality score.
    """
    # This would integrate with the actual routing engine
    # For architecture documentation, this shows the pattern
    return {
        "matched_skill": "skill-systems-architecture",
        "confidence": 0.92,
        "response_quality": "high" if not stricter else "medium",
        "passed": True  # Actual logic depends on evaluation criteria
    }
```

---

## Constraints

### MUST DO
- Design every deployment pipeline with a rollback mechanism at every stage — no forward-only deployments
- Set explicit timeout and circuit breaker policies for skill loading (max 2s per skill, 5s total)
- Use the two-tier trigger strategy when designing cross-skill coordination to prevent false positive collisions
- Implement monitoring that includes both latency metrics and quality metrics — performance without quality is useless
- Test all fallback strategies under simulated failure conditions before production deployment
- Reference `code-philosophy` (5 Laws of Elegant Defense) in orchestrator design, especially Law 4 (Fail Fast) for error handling

### MUST NOT DO
- Deploy changes to the routing index without passing all four quality gate stages
- Allow any single skill to block more than 3 other skills from loading (creates single points of failure)
- Skip staging environment — even small skill updates should be validated in staging first
- Use a fixed confidence threshold for all skills — tune thresholds per skill based on historical performance data
- Route all agent traffic through a new skill set immediately after creation — always use canary deployment
- Design fallback strategies that silently degrade output quality — partial results must be explicitly marked to the user

---

## Output Template

When applying this skill to design or audit a multi-skill system architecture, produce:

1. **System Architecture Diagram** — ASCII flow diagram showing all components (router, orchestrator, quality gates, deployment pipeline stages, monitoring) with data flow between them
2. **Skill Inventory Report** — Complete catalog of skills classified by role, domain, maturity, and criticality, with any gaps or unclassified skills flagged
3. **Quality Gate Specification** — Detailed validation criteria for each pipeline stage with specific checks derived from AGENTS.md quality checklist and SKILL_FORMAT_SPEC.md
4. **Cross-Skill Coordination Matrix** — Table showing which skills coordinate together, their loading order (sequential/parallel), fallback chains, and timeout boundaries
5. **Deployment Pipeline Definition** — Complete CI/CD pipeline specification with stages, triggers, checks, and rollback procedures in a structured format
6. **Monitoring Dashboard Spec** — List of metrics to track, alert thresholds, feedback loop design, and recommended dashboard layout

---

## Related Skills

| Skill | Purpose |
|---|---|
| `skill-engineering` | Creates individual SKILL.md files with content — this skill orchestrates how those skills are deployed at production scale |
| `skill-lifecycle-management` | Manages versioning, deprecation, and retirement of individual skills — this skill handles the deployment pipeline that lifecycle changes flow through |
| `skill-ecosystem-design` | Designs dependency graphs and reciprocal relationships between skills — this skill builds the operational architecture around those relationships |
| `skill-audit` | Validates individual skill quality against standards — this skill defines the quality gates that audit results feed into for deployment decisions |
| `skill-router-system` | Configures the runtime routing engine and confidence thresholds — this skill designs the broader system that the router operates within |

---

## Live References

> Authoritative documentation links for multi-skill agent systems architecture. The model follows markdown links at load time to resolve external references.

- [GitOps Deployment Patterns](https://www.gitops.tech/)
- [Canary Deployment Best Practices (Google SRE)](https://sre.google/sre-workbook/canary-deployment/)
- [Chaos Engineering Principles](https://principlesofchaos.org/)
- [OpenTelemetry Observability Framework](https://opentelemetry.io/docs/)
- [CI/CD Pipeline Design Patterns](https://www.atlassian.com/continuous-delivery/ci-cd/pipeline-patterns)
- [Skill Format Specification (this repository)](./SKILL_FORMAT_SPEC.md)
- [Agent Skill Router Documentation (this repository)](./agent-skill-routing-system/README.md)
