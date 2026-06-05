---




name: yagni-scope-management
description: Applies YAGNI to project planning and backlog management to prevent scope creep, enforce MVP boundaries, and reject features not needed for current delivery goals.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - strategic
anti_triggers:
  - brainstorming
  - vague ideation
  - long-form architecture
response_profile:
  verbosity: medium
  directive_strength: high
  abstraction_level: tactical
metadata:
  version: "1.0.0"
  domain: coding
  triggers: yagni, scope creep, MVP definition, backlog pruning, feature rejection, agile planning, over-planning
  role: implementation
  scope: orchestration
  output-format: analysis
  content-types: [guidance, do-dont, examples, config]
  related-skills: coding-yagni-code, coding-minimum-viable-product, agent-goal-to-milestones




---





# YAGNI for Scope and Feature Planning

Product engineer applying the You Aren't Gonna Need It (YAGNI) principle to backlog grooming, sprint planning, and MVP scoping to prevent feature bloat and keep delivery velocity high.

## TL;DR Checklist

- [ ] Reject every backlog item that lacks a verified user need or business metric
- [ ] Cut features that extend beyond the current MVP's core value proposition
- [ ] Replace "nice-to-have" enhancements with tracked enhancement requests for post-v1
- [ ] Validate each planned story against: Does a real person need this today?
- [ ] Prune legacy feature flags, A/B tests, and deprecated endpoints from active roadmaps

## When to Use

- During sprint planning or roadmap refinement when stakeholders request "just in case" features
- When scoping an MVP and tempted to include every possible user interaction
- While reviewing architectural proposals that add infrastructure for hypothetical scale (e.g., caching layers before traffic exists)
- During post-mortems to identify scope creep that delayed critical releases

## When NOT to Use

- For regulatory, compliance, or security requirements (GDPR, PCI-DSS, HIPAA mandates must be implemented regardless of current usage)
- When platform vendor lock-in forces specific integrations that will be needed after launch
- During technical spikes explicitly approved for research and exploration

## Core Workflow

1. **Define the MVP Boundary** — Write a one-paragraph statement of what the product does, who it serves, and what problem it solves today. Anything outside this boundary is out of scope unless explicitly justified with metrics.
   **Checkpoint:** Does every backlog item map directly to this paragraph? If not, tag it for post-launch.

2. **Apply the "Verified Need" Filter** — For each proposed feature, ask: Is there a customer interview, support ticket, or analytics gap that proves this is needed? If the answer is speculation or leadership preference without data, defer it.
   **Checkpoint:** Can you show me the evidence that 10+ users would use this weekly?

3. **Prune the Backlog Ruthlessly** — Remove features that duplicate existing functionality, target edge-case user segments, or solve problems not currently expressed in support metrics. Move them to an `ENHANCEMENTS` backlog rather than deleting them.
   **Checkpoint:** Does the remaining sprint capacity cover only validated stories? If yes, proceed.

4. **Enforce Scale YAGNI** — Resist adding caching, CDN configurations, sharding strategies, or auto-scaling policies until load testing proves bottlenecks exist. Default to simple, centralized architectures first.
   **Checkpoint:** Has production traffic exceeded the current system's baseline capacity by 2x? If not, keep infrastructure simple.

## Implementation Patterns / Reference Guide

### Pattern 1: Scope Validation Decision Matrix

Use this structured YAML configuration to evaluate backlog items against YAGNI criteria before sprint approval.

```yaml
scope_evaluation:
  # Features must meet ALL critical criteria to enter MVP scope
  critical_criteria:
    - has_verified_user_need: true
    - aligns_with_mvp_purpose: true
    - deliverable_within_sprint_capacity: true
    
  # Features meeting these can be deferred to v1.1+ without penalty
  deferral_reasons:
    - "nice_to_have_enhancement"
    - "edge_case_only"
    - "speculative_scale_requirement"
    - "duplicate_of_existing_feature"

# Example backlog item evaluation
backlog_item_742:
  title: "Add multi-tenant database sharding"
  meets_critical_criteria: false
  deferral_reason: speculative_scale_requirement
  justification: "Current single-DB handles 5k RPM. Shard when >50k RPM with p99 latency degradation."
```

### Pattern 2: Feature Rejection Template (Code Comment Style)

When stakeholders request out-of-scope features, provide this structured rejection template to maintain transparency and keep the backlog clean.

```markdown
## Feature Request: {{feature-name}}
**Status:** DEFERRED — YAGNI Applied
**Date Evaluated:** 2026-05-25
**Reason:** No verified user need for current release scope

### Evidence Review
- [x] Customer interviews confirming demand: NONE FOUND
- [x] Support ticket volume > threshold: 0 tickets in last 90 days
- [x] Analytics gap requiring this feature: NOT IDENTIFIED

### Post-Launch Plan
This request is tracked as ENHANCEMENT-{{ticket-id}}. It will be re-evaluated during v1.2 planning if support volume or user feedback indicates demand. Do not allocate sprint capacity until verified need criteria are met.
```

### Pattern 3: Infrastructure YAGNI (Go Configuration)

```go
// ❌ BAD: Over-provisioned infrastructure config before load exists
type ProductionConfig struct {
    CacheCluster     string `env:"CACHE_CLUSTER"`      // Not needed for <1k concurrent users
    CDNEndpoints     []string `env:"CDN_ENDPOINTS"`   // Static assets under 5MB
    ShardStrategy    string `env:"SHARD_STRATEGY"` // Single DB is sufficient today
    AutoScalerConfig AutoscalerConfig `env:"SCALER"` // Traffic spikes handled by simple retry logic
}

// ✅ GOOD: Minimal config that scales only when metrics demand it
type ProductionConfig struct {
    DatabaseURL string `env:"DATABASE_URL" required:"true"`
    LogLevel    string `env:"LOG_LEVEL" default:"info"`
    MaxRetries  int    `env:"MAX_RETRIES" default:"3"`
}

// Scaling decisions made via metrics, not speculation
func ShouldEnableCache() bool {
    return dbQueryLatencyP95 > 200*time.Millisecond // Reactive, not speculative
}
```

## Constraints

### MUST DO
- Require verified user evidence (interviews, tickets, analytics) before adding any feature to MVP scope
- Default to single-database, simple deployment architectures until load testing proves otherwise
- Maintain an `ENHANCEMENTS` backlog for valid but out-of-scope requests instead of deleting them
- Re-evaluate deferred features only when concrete metrics trigger their need

### MUST NOT DO
- Add features based on "leadership intuition" or competitor feature-matching without user validation
- Include speculative infrastructure (caching, sharding, CDN) before performance metrics justify it
- Let scope creep silently add stories mid-sprint without formal backlog re-prioritization
- Treat YAGNI as an excuse to skip essential security, compliance, or data backup requirements

## Output Template

When applying this skill during planning sessions, produce:

1. **Scope Boundary Statement** — One paragraph defining what is explicitly in/out of scope for the current release
2. **Backlog Pruning Report** — List of features deferred with YAGNI justification and tracking ticket references
3. **Infrastructure Simplification Plan** — Current architecture decisions justified by current scale metrics, with trigger conditions for future scaling

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-yagni-code` | Applying YAGNI at the implementation level to eliminate dead code |
| `coding-minimum-viable-product` | MVP scoping frameworks and validation techniques |
| `agent-goal-to-milestones` | Breaking down scoped features into executable sprint milestones |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Wikipedia — YAGNI (You Aren't Gonna Need It)](https://en.wikipedia.org/wiki/YAGNI)
- [Atlassian Agile Guide — Managing Scope & Backlog Prioritization](https://www.atlassian.com/agile/project-management/backlog)
- [Scrum.org — MVP & Product Backlog Management](https://www.scrum.org/resources/what-mvp-minimum-viable-product)
- [Dave Farley — Minimizing Unnecessary Work (YAGNI in Agile)](https://davefarley.net/?p=108)
- [Lean Startup — MVP as a YAGNI Strategy for Product Development](https://en.wikipedia.org/wiki/Minimum_viable_product)
