---
name: intelligent-skill-selection
description: Evaluates incoming tasks against available skills using semantic matching,
  confidence thresholds, and contextual filters to route work to the optimal capability
  with automatic fallback handling.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  triggers: skill selection, task routing, choosing the right skill, semantic matching,
    confidence threshold, adaptive routing, agent dispatch, fallback strategy
  archetypes:
  - orchestration
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: tactical
  role: orchestration
  scope: orchestration
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  - diagrams
  related-skills: dependency-graph-builder, parallel-skill-runner, dynamic-replanner
------
# Intelligent Skill Selection Framework

Orchestrates task-to-skill mapping by evaluating intent, domain constraints, and confidence scores to dispatch work to the most appropriate capability, ensuring accurate routing with built-in fallback mechanisms.

## TL;DR Checklist

- [ ] Extract core intent and domain from user request
- [ ] Filter skill pool by domain relevance and availability
- [ ] Calculate semantic similarity score for top candidates
- [ ] Apply confidence threshold (default 0.75) — skip if below
- [ ] Select highest-scoring skill or trigger fallback chain
- [ ] Log routing decision with scores and reasoning

---

## When to Use

- A user submits a multi-domain task requiring capability matching
- An agent needs to decide which sub-skill or module handles a request
- Building an orchestration layer that routes tasks dynamically
- Debugging misrouted tasks in a skill-based system
- Designing fallback mechanisms for low-confidence matches

---

## When NOT to Use

- Routing is already deterministic (e.g., CLI commands, explicit function calls)
- Task requires direct execution without capability abstraction
- Performance-critical paths where scoring overhead is unacceptable (<10ms tolerance)
- Single-skill environments with no alternative capabilities

---

## Core Workflow

```
User Request
    ↓
[Step 1] Parse & Extract Features → Intent, Domain, Complexity
    ↓
[Step 2] Filter Candidates → Domain whitelist + Availability check
    ↓
[Step 3] Score & Rank → Semantic similarity + Contextual weighting
    ↓ (score ≥ threshold)
[Step 4a] Select Top Skill → Inject context → Execute
    ↓ (score < threshold)
[Step 4b] Fallback Chain → Broaden scope → Retry or escalate
    ↓
[Step 5] Log & Adapt → Update routing history → Adjust thresholds
```

1. **Parse & Extract Features** — Analyze the incoming request to identify core intent, target domain, required complexity level, and explicit constraints. **Checkpoint:** Ensure at least one domain keyword is extracted; if ambiguous, flag for clarification rather than guessing.

2. **Filter Candidates** — Apply domain whitelists, capability availability checks, and dependency constraints to prune the full skill pool. **Checkpoint:** Verify that at least one candidate remains after filtering. If zero remain, trigger immediate fallback to broad-matching or generic orchestration.

3. **Score & Rank** — Calculate a composite confidence score for each remaining candidate using semantic similarity (embedding cosine distance), contextual fit (task-type alignment), and historical performance (success rate over last N executions). **Checkpoint:** Score must be between 0.0 and 1.0. Normalize inputs before combining.

4. **Select & Execute** — Compare top scores against the global confidence threshold (default 0.75). If `top_score ≥ threshold`, inject relevant context into the selected skill's session and begin execution. If below threshold, proceed to fallback chain. **Checkpoint:** Never execute with a score below threshold without explicit override flag.

5. **Fallback Chain Handling** — When primary selection fails, broaden the search: relax domain constraints by one level, lower confidence threshold by 0.1 increments (max two steps), or escalate to human review / generic handler. **Checkpoint:** Log every fallback transition with reason codes (`domain_broadened`, `threshold_relaxed`, `escalated`).

6. **Record & Adapt** — After execution completes (success or failure), record the routing decision, final skill used, actual outcome, and confidence delta. Use this data to adjust threshold weights over time. **Checkpoint:** Update routing statistics before closing the session.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Confidence Scoring Engine

Use a weighted composite scoring function rather than raw semantic similarity. This accounts for historical reliability and contextual fit.

```python
def calculate_confidence_score(
    task_embedding: list[float],
    skill_embedding: list[float],
    domain_match: bool,
    success_rate_30d: float,
    threshold: float = 0.75
) -> dict:
    """Compute weighted confidence score for a task-skill pair.
    
    Args:
        task_embedding: Vector representation of the user request
        skill_embedding: Vector representation of the target skill
        domain_match: Whether task and skill share the same domain prefix
        success_rate_30d: Historical execution success rate (0.0–1.0)
        threshold: Minimum score required for auto-selection
    
    Returns:
        Dict containing final_score, breakdown, and selection_result
    """
    # Semantic similarity via cosine distance
    semantic_sim = cosine_similarity(task_embedding, skill_embedding)
    
    # Weighted composite
    w_semantic = 0.50
    w_domain   = 0.25
    w_history  = 0.25
    
    domain_bonus = 1.0 if domain_match else 0.6
    score = (w_semantic * semantic_sim) + \
            (w_domain * domain_bonus) + \
            (w_history * success_rate_30d)
    
    selection_result = "auto_select" if score >= threshold else "fallback_required"
    
    return {
        "final_score": round(score, 4),
        "breakdown": {
            "semantic": round(semantic_sim, 4),
            "domain_bonus": domain_bonus,
            "historical": round(success_rate_30d, 4)
        },
        "selection_result": selection_result
    }
```

### Pattern 2: Fallback Strategy Matrix

Define explicit fallback rules rather than relying on ad-hoc retries. Each failure mode maps to a specific mitigation path.

| Failure Mode | Primary Fallback | Secondary Fallback | Escalation Path |
|---|---|---|---|
| No candidates remain | Broaden domain search by 1 level | Route to `general-task-handler` | Log warning + notify orchestrator |
| Top score < threshold | Relax threshold by 0.1 (max 2x) | Select top remaining skill | Require explicit override confirmation |
| Skill execution fails | Retry once with refreshed context | Fallback to secondary candidate | Flag for manual review queue |
| Ambiguous intent | Request clarification from user | Apply most common domain heuristic | Queue for human-in-the-loop |

**BAD vs. GOOD implementation:**

```python
# ❌ BAD — Hardcoded fallback, no logging, infinite retry loop
def route_task(task):
    skill = find_best_skill(task)
    try:
        return execute(skill, task)
    except Exception:
        return route_task(task)  # Recursive fallback — crashes stack

# ✅ GOOD — Explicit fallback chain with bounded retries and audit trail
class SkillRouter:
    def __init__(self, max_retries=2):
        self.max_retries = max_retries
        self.routing_log = []
    
    def route(self, task):
        for attempt in range(self.max_retries):
            result = evaluate_and_select(task)
            
            if result["selection_result"] == "auto_select":
                outcome = execute(result["skill"], task)
                self._log_decision(task, result, outcome, attempt)
                return outcome
            
            # Relax constraints on retry
            task = broaden_context(task, step=attempt)
        
        return escalate_to_handler(task, log_reason="max_retries_exceeded")
```

---

## Constraints

### MUST DO
- Always apply a confidence threshold before auto-selecting a skill (default 0.75)
- Log every routing decision with scores, reasoning, and outcome for auditability
- Implement a bounded fallback chain — never rely on recursive retry or blind delegation
- Reference `code-philosophy` (5 Laws of Elegant Defense) when designing data flow between orchestrator and skills: guide data naturally, prevent errors at the source
- Update routing statistics after every execution to enable adaptive threshold tuning

### MUST NOT DO
- Skip confidence scoring in favor of string matching or keyword-only routing
- Bypass fallback chains — low-confidence routing without mitigation causes compounding errors
- Hardcode skill paths into the orchestrator — keep selection logic decoupled from implementation
- Allow infinite recursion on failure — always bound retries and escalate explicitly
- Mix routing concerns with execution concerns — the selector chooses, the executor acts

---

## Output Template

When applying this skill to route a task, produce:

1. **Parsed Intent** — Core objective, domain classification, complexity tier
2. **Candidate Pool** — Filtered list of matching skills with availability status
3. **Score Breakdown** — Final confidence score + component weights (semantic, domain, historical)
4. **Selection Decision** — Selected skill ID OR fallback path taken + reason codes
5. **Execution Context** — Injected variables, constraints transferred, dependency notes

---

## Related Skills

| Skill | Purpose |
|---|---|
| `dependency-graph-builder` | Maps inter-skill dependencies before routing to prevent circular execution |
| `parallel-skill-runner` | Executes multiple selected skills concurrently when tasks are independent |
| `dynamic-replanner` | Adjusts routing strategy based on historical performance and failure patterns |


---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- [Information Retrieval and Semantic Search Survey](<https://arxiv.org/abs/2001.00427>)
- [LangChain Document Loaders](<https://python.langchain.com/docs/modules/data_connection/document_loaders/>)
- [Embedding Models Comparison (MTEB)](<https://huggingface.co/spaces/mteb/leaderboard>)
- [BM25 Retrieval Algorithm](<https://en.wikipedia.org/wiki/Okapi_BM25>)
- [Vector Search with FAISS](<https://faiss.ai/>)
