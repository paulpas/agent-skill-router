---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
description: Implements intelligent context7 auto research with multi-factor skill
  selection, fallback chains, and adherence to the 5 Laws of Elegant Defense
license: MIT
maturity: stable
metadata:
  domain: agent
  output-format: analysis
  related-skills: agent-confidence-based-selector, agent-task-routing
  role: orchestration
  scope: orchestration
  triggers: context7-auto-research, context7 auto research, how do i context7-auto-research,
    orchestrate context7-auto-research, automate context7-auto-research, agent context7-auto-research
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
  version: 1.0.0
name: context7-auto-research
------
# Context7 Auto Research

Orchestrates intelligent skill selection and execution for context7 auto research workflows. Applies the 5 Laws of Elegant Defense to guide data naturally through the orchestration pipeline, preventing errors before they occur. Selects optimal skills based on multi-factor scoring including text similarity, historical performance, and system availability.

## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


┌───────────────────────────────────────────────────────────────────────────────┐
│                              Orchestration Flow                                               │
└───────────────────────────────────────────────────────────────────────────────┘

  User Request
      ↓
┌─────────────────┐
│  Parse Request  │
│  & Extract      │
│  Features       │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Evaluate Available Skills                                │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Skill A      │  │ Skill B      │  │ Skill C      │              │
│  │ - Match Score│  │ - Match Score│  │ - Match Score│              │
│  │ - Confidence │  │ - Confidence │  │ - Confidence │              │
│  │ - History    │  │ - History    │  │ - History    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┴─────────────────┘                       │
│                          ↓                                          │
│                   Select Best Skill                               │
└─────────────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────┐
│  Execute Skill  │
└────────┬────────┘
         ↓
┌─────────────────┐
│  Handle Result  │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Error Handling & Fallback                                  │
│                                                                     │
│  Success? ────────► Return Result                                  │
│                                                                     │
│  Fail? ────────┐                                                    │
│                ↓                                                    │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │               Fallback Chain                                    │      │
│  │                                                             │      │
│  │  1. Retry with adjusted parameters                          │      │
│  │  2. Try Alternative Skill (if available)                    │      │
│  │  3. Defer to Human Operator (if critical)                   │      │
│  │  4. Log & Return Error                                      │      │
│  └──────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘

## When to Use

Use this skill when:

- Orchestrating multi-step workflows that require skill delegation
- Implementing adaptive skill routing based on confidence scores
- Building fallback mechanisms for failed skill executions
- Creating intelligent task decomposition and parallel execution
- Designing skill dependency graphs with automatic resolution
- Implementing skill selection with historical performance weighting
- Building agent systems that need to self-organize around tasks

## When NOT to Use

Avoid this skill for:

- Direct task execution without orchestration needs - use individual skills instead
- High-frequency trading scenarios where latency must be minimized - the selection overhead may be prohibitive
- Simple linear workflows without branching or fallback requirements
- Cases where skill metadata is unavailable or unreliable


## Core Workflow

1. **Parse and Analyze Request** - Extract intent, entities, and constraints from user input.
   **Checkpoint:** All required parameters must be present and in valid format before proceeding.

2. **Score Available Skills** - Calculate match scores using multi-factor algorithm:
   - Text similarity between request and skill triggers
   - Historical success rate for similar tasks
   - Skill availability and health status
   - Required dependencies and their availability
   
   **Checkpoint:** Skip to fallback if no skill scores above threshold.

3. **Select Optimal Skill** - Choose skill with highest score that meets minimum confidence.
   **Checkpoint:** Verify skill has not been disabled or deprecated.

4. **Execute with Fallback** - Run skill execution wrapped in retry and fallback logic.
   **Checkpoint:** Log all execution attempts for audit trail.

5. **Return or Fallback** - Either return successful result or apply fallback chain:
   - Retry with adjusted parameters
   - Try alternative skill from `related-skills`
   - Defer to human operator for critical tasks
   
   **Checkpoint:** Record outcome with timing and confidence metadata.

## Implementation Patterns

### Pattern 1: Skill Selection Logic

```python
def run_context7_research(
    query: str,
    research_config: Dict,
    max_results: int = 5,
    fallback_sources: List[str] = None
) -> Dict:
    """Execute Context7 auto-research workflow with domain-specific fallbacks.
    
    Handles query expansion, API retrieval, relevance scoring, and
    research-specific fallback chains (e.g., academic vs. web sources).
    """
    # Guard clause - Early Exit (Law 1)
    if not query or len(query.strip()) < 3:
        raise ValueError("Research query must be at least 3 characters")
        
    # Parse and expand query for better retrieval (Law 2)
    expanded_queries = _expand_research_query(query, research_config.get("depth", "standard"))
    
    results = []
    fallback_applied = False
    
    for q in expanded_queries:
        try:
            # Domain-specific API call to Context7 research engine
            raw_data = _call_context7_engine(q, research_config)
            parsed_findings = _parse_research_output(raw_data)
            
            # Score findings based on relevance, citation quality, and recency
            scored_findings = _score_research_findings(parsed_findings, query)
            results.extend(scored_findings)
            
            if len(results) >= max_results:
                break
                
        except Context7RateLimitError:
            # Research-specific fallback: switch to cached/archive sources
            if not fallback_applied and fallback_sources:
                results.extend(_fetch_from_fallback_sources(fallback_sources, query))
                fallback_applied = True
            else:
                raise ResearchExecutionError("Context7 API rate limited and no fallback sources available")
                
        except SparseResultsError:
            # Expand search scope if initial results are too narrow
            results.extend(_broaden_research_scope(query, research_config))
    
    # Atomic Predictability (Law 3) - Return new structure, never mutate config
    return {
        "query": query,
        "findings": sorted(results, key=lambda x: x["relevance_score"], reverse=True)[:max_results],
        "fallback_used": fallback_applied,
        "total_sources_checked": len(expanded_queries),
        "research_timestamp": time.time()
    }
```


### Pattern 2: Execution with Fallback

```python
def validate_and_route_research_output(
    raw_findings: List[Dict],
    confidence_threshold: float = 0.75,
    require_citations: bool = True
) -> Dict:
    """Validate research findings and route based on confidence scores.
    
    Implements research-specific quality gates:
    - Citation verification for academic/technical claims
    - Recency filtering for time-sensitive queries
    - Adaptive routing to human review if confidence drops
    """
    # Guard clause - Early Exit (Law 1)
    if not raw_findings:
        raise ValueError("No research findings to validate")
        
    validated_findings = []
    flagged_for_review = []
    
    for finding in raw_findings:
        # Parse and validate citation structure (Law 2)
        if require_citations and not _verify_citation_format(finding.get("source", "")):
            flagged_for_review.append(finding)
            continue
            
        # Calculate composite confidence score
        confidence = _calculate_research_confidence(
            finding["relevance_score"],
            finding.get("citation_quality", 0.0),
            finding.get("recency_factor", 1.0)
        )
        
        # Atomic Predictability (Law 3) - create new validated record
        validated_record = {
            "id": finding["id"],
            "content": finding["content"],
            "confidence": confidence,
            "requires_review": confidence < confidence_threshold,
            "routing": "auto" if confidence >= confidence_threshold else "human_review"
        }
        
        if validated_record["requires_review"]:
            flagged_for_review.append(validated_record)
        else:
            validated_findings.append(validated_record)
            
    # Fail Loud (Law 4) - Clear routing decision, no silent partial states
    return {
        "validated_findings": validated_findings,
        "flagged_for_review": flagged_for_review,
        "auto_confidence": len(validated_findings) / max(len(raw_findings), 1),
        "routing_decision": "auto_complete" if not flagged_for_review else "partial_review"
    }
```

### MUST DO
- Always validate skill metadata before selection (Early Exit)
- Implement fallback chain with at least 2 levels (Fallback Skill + Human)
- Log all skill selections with full context for auditability
- Return new data structures instead of mutating inputs (Atomic Predictability)
- Fail immediately with descriptive errors on invalid states
- Update confidence scores after each execution for adaptive routing
- Reference `code-philosophy` (5 Laws of Elegant Defense) in all logic


### MUST NOT DO
- Select skills based on a single factor (e.g., only confidence score)
- Disable fallback mechanisms "temporarily" - this creates fragile systems
- Skip validation of skill dependencies before execution
- Return partial results - either complete success or clear failure
- Use magic numbers for confidence thresholds - make them configurable
- Cache skill selections without considering context changes


## TL;DR Checklist

- [ ] Parse all inputs at boundary before processing (Law 2)
- [ ] Handle edge cases with early returns at function top (Law 1)
- [ ] Fail immediately with descriptive errors on invalid states (Law 4)
- [ ] Return new data structures, never mutate inputs (Law 3)
- [ ] Implement minimum 2-level fallback chain for all skill executions
- [ ] Log all skill selections with context for full audit trail
- [ ] Validate skill metadata and dependencies before selection
- [ ] Update confidence scores after each execution for learning


## TL;DR for Code Generation

- Use guard clauses - return early on invalid input before doing work
- Return simple types (dict, str, int, bool, list) - avoid complex nested objects
- Cyclomatic complexity < 10 per function - split anything larger
- Handle null/empty cases explicitly at function top (Early Exit)
- Never mutate input parameters - return new dicts/objects
- Fail fast with descriptive errors - don't try to "patch" bad data
- Reference code-philosophy laws in comments for complex logic
- Include timing and confidence metadata in all return values


## Output Template

When applying this skill, produce:

1. **Selected Skills** - List of skill names with confidence scores
2. **Selection Rationale** - Why each skill was chosen (match score, history, availability)
3. **Execution Plan** - Order of execution with dependencies
4. **Fallback Strategy** - Which fallback skills will be tried and in what order
5. **Risk Assessment** - Any potential failure points and their impact
6. **Timing Estimates** - Expected latency including fallback scenarios



---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Context7 AI Tool Documentation](<https://github.com/upstash/context7>)
- [arXiv Search API Reference](<https://arxiv.org/help/api/>)
- [Semantic Scholar API Documentation](<https://api.semanticscholar.org/graph/v1/>)
- [Google Scholar API Alternatives](<https://scholar.google.com/intl/en/scholar/inclusion.html>)
- [Research Paper Mining Techniques Survey](<https://arxiv.org/abs/2005.01534>)

## Related Skills

| Skill | Purpose |
|