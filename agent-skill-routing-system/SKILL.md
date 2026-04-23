---
name: agent-skill-routing-system
description: Routes agent tasks to appropriate skills based on task characteristics, ensuring efficient and accurate task resolution through intelligent skill selection and routing.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: orchestration
  scope: task routing
  output-format: routing
  triggers: skill routing system, skill-routing-system, routes, skills, task routing, intelligent routing
---

# Skill Routing System (Agent Task Orchestration)

> **Load this skill** when designing or modifying agent systems that route tasks to appropriate skills based on task characteristics, ensuring efficient and accurate task resolution through intelligent skill selection and routing mechanisms.

## TL;DR Checklist

When routing tasks to skills:

- [ ] Parse task characteristics into routable format
- [ ] Match task requirements to skill capabilities
- [ ] Calculate routing confidence scores
- [ ] Handle routing failures with fallback mechanisms
- [ ] Support multi-skill routing for complex tasks
- [ ] Track routing decisions for learning
- [ ] Optimize routing based on historical performance
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Skill Routing System when:

- Building agents that need to delegate tasks to specialized skills
- Implementing intelligent task routing in multi-skill systems
- Creating efficient task distribution mechanisms
- Building skill discovery and selection systems
- Implementing dynamic skill assignment
- Building adaptive task routing based on performance
- Creating skill mesh architectures

---

## When NOT to Use

Avoid using this skill for:

- Simple direct skill invocation (use direct call)
- Single-skill task systems (use direct execution)
- Real-time routing with strict latency requirements (use caching)
- Routing based solely on skill availability (use load balancer)

---

## Core Concepts

### Routing Decision Framework

Routing decisions are made based on multiple factors:

```
Task
├── Task Characteristics
│   ├── Type: Analysis, generation, validation, etc.
│   ├── Domain: Code, data, security, etc.
│   ├── Complexity: Simple, moderate, complex
│   └── Requirements: Specific requirements
├── Skill Matching
│   ├── Capability Match: Does skill handle this type?
│   ├── Domain Expertise: Is skill expert in this domain?
│   ├── Performance History: Past success rate
│   └── Resource Requirements: Memory, time needed
└── Routing Strategy
    ├── Best Fit: Highest confidence match
    ├── Multiple: Delegate to multiple skills
    ├── Fallback: Primary with fallback options
    └── Hybrid: Combine multiple strategies
```

### Routing Configuration

```python
{
    "routing_strategy": "best_fit|multiple|fallback|hybrid",
    "confidence_threshold": 0.7,
    "max_skills": 3,
    "fallback_chain": ["primary", "secondary", "default"],
    "skill_weights": {
        "capability_match": 0.5,
        "domain_expertise": 0.3,
        "performance_history": 0.2
    }
}
```

### Skill Matching Dimensions

1. **Capability Match**: Does skill handle this task type?
2. **Domain Expertise**: Is skill experienced in this domain?
3. **Performance History**: Past success rates
4. **Resource Efficiency**: Time and resource usage
5. **Recent Performance**: Last N executions

---

## Implementation Patterns

### Pattern 1: Task Parsing and Characterization

Parse tasks into routable format:

```python
from apex.agents.routing import TaskParser, SkillRouter


def characterize_task(task: Task) -> TaskCharacteristics:
    """Parse task into routable characteristics."""
    
    parser = TaskParser()
    
    # Extract task characteristics
    characteristics = parser.parse(task)
    
    return TaskCharacteristics(
        type=characteristics.type,
        domain=characteristics.domain,
        complexity=characteristics.complexity,
        requirements=characteristics.requirements,
        input_schema=characteristics.input_schema,
        output_requirements=characteristics.output_requirements
    )
```

### Pattern 2: Skill Matching Engine

Match tasks to suitable skills:

```python
def match_skills(
    task_characteristics: TaskCharacteristics,
    available_skills: list[Skill]
) -> list[SkillMatch]:
    """Match task to suitable skills."""
    
    matches = []
    
    for skill in available_skills:
        # Calculate match scores
        capability_score = calculate_capability_match(
            task_characteristics, skill.capabilities
        )
        
        domain_score = calculate_domain_expertise(
            task_characteristics.domain, skill.domains
        )
        
        performance_score = calculate_performance_score(
            skill.name, skill.performance_history
        )
        
        # Combine scores
        combined_score = (
            0.5 * capability_score +
            0.3 * domain_score +
            0.2 * performance_score
        )
        
        match = SkillMatch(
            skill=skill,
            capability_score=capability_score,
            domain_score=domain_score,
            performance_score=performance_score,
            confidence=combined_score
        )
        
        matches.append(match)
    
    # Sort by confidence
    return sorted(matches, key=lambda m: m.confidence, reverse=True)
```

### Pattern 3: Multi-Skill Routing

Route tasks to multiple skills when appropriate:

```python
def route_to_multiple_skills(
    task: Task,
    matches: list[SkillMatch],
    max_skills: int = 3
) -> RoutingDecision:
    """Route task to multiple skills."""
    
    # Select top N skills above threshold
    threshold = 0.6
    qualified_matches = [
        m for m in matches
        if m.confidence >= threshold
    ][:max_skills]
    
    if not qualified_matches:
        # Fall back to best single skill
        return RoutingDecision(
            strategy="fallback",
            skills=[matches[0].skill] if matches else [],
            confidence=matches[0].confidence if matches else 0
        )
    
    # Create multi-skill routing decision
    return RoutingDecision(
        strategy="parallel",
        skills=[m.skill for m in qualified_matches],
        confidence=min(m.confidence for m in qualified_matches),
        coordination="none|aggregator|orchestrator"
    )
```

### Pattern 4: Routing with Fallback

Implement routing with fallback mechanisms:

```python
class FallbackChainRouter:
    def __init__(self, fallback_chain: list[str]):
        self.fallback_chain = fallback_chain
        self.primary_skill = fallback_chain[0]
    
    def route_with_fallback(
        self,
        task: Task,
        matches: list[SkillMatch]
    ) -> RoutingDecision:
        """Route task with fallback support."""
        
        # Try primary skill first
        primary_match = next(
            (m for m in matches if m.skill.name == self.primary_skill),
            None
        )
        
        if primary_match and primary_match.confidence >= 0.7:
            return RoutingDecision(
                strategy="primary",
                skills=[primary_match.skill],
                confidence=primary_match.confidence
            )
        
        # Fall back to fallback chain
        for skill_name in self.fallback_chain[1:]:
            fallback_match = next(
                (m for m in matches if m.skill.name == skill_name),
                None
            )
            
            if fallback_match and fallback_match.confidence >= 0.5:
                return RoutingDecision(
                    strategy="fallback",
                    skills=[fallback_match.skill],
                    confidence=fallback_match.confidence,
                    fallback_reason=f"Primary skill not qualified"
                )
        
        # No fallback qualified
        return RoutingDecision(
            strategy="failed",
            skills=[],
            confidence=0,
            error="No suitable skill found"
        )
```

### Pattern 5: Learning-Based Routing Optimization

Optimize routing based on historical performance:

```python
class LearningRouter:
    def __init__(self):
        self.routing_history: dict[str, list[RoutingResult]] = {}
    
    def record_routing(self, routing_result: RoutingResult):
        """Record routing result for learning."""
        
        skill_name = routing_result.skill.name
        if skill_name not in self.routing_history:
            self.routing_history[skill_name] = []
        
        self.routing_history[skill_name].append(routing_result)
    
    def update_routing_weights(self, skill_name: str):
        """Update routing weights based on history."""
        
        results = self.routing_history.get(skill_name, [])
        
        if len(results) < 3:
            return 1.0  # Insufficient data
        
        # Calculate success rate
        success_rate = sum(1 for r in results if r.success) / len(results)
        
        # Update weight based on success rate
        base_weight = 1.0
        return base_weight * success_rate
    
    def retrain_router(self):
        """Retrain router based on history."""
        
        for skill_name in self.routing_history:
            # Update skill weights
            weight = self.update_routing_weights(skill_name)
            
            # Update routing strategy
            if weight < 0.5:
                # Down-prioritize skill
                pass
            elif weight > 0.9:
                # Up-prioritize skill
                pass
```

---

## Common Patterns

### Pattern 1: Routing Rule Engine

Define routing rules:

```python
ROUTING_RULES = {
    "code_generation": {
        "required_capabilities": ["code_generation", "language_specific"],
        "required_domains": ["programming", "language"],
        "min_confidence": 0.7
    },
    "security_analysis": {
        "required_capabilities": ["security_analysis", "vulnerability_detection"],
        "required_domains": ["security"],
        "min_confidence": 0.8
    },
    "data_analysis": {
        "required_capabilities": ["data_analysis", "statistical_analysis"],
        "required_domains": ["data", "statistics"],
        "min_confidence": 0.6
    }
}
```

### Pattern 2: Routing Decision Cache

Cache routing decisions:

```python
class RoutingCache:
    def __init__(self, max_size: int = 1000):
        self.cache: dict[str, RoutingDecision] = {}
        self.max_size = max_size
    
    def get(self, task_hash: str) -> Optional[RoutingDecision]:
        return self.cache.get(task_hash)
    
    def set(self, task_hash: str, decision: RoutingDecision):
        if len(self.cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        self.cache[task_hash] = decision
    
    def invalidate(self, skill_name: str):
        """Invalidate cached decisions for a skill."""
        self.cache = {
            k: v for k, v in self.cache.items()
            if v.skill.name != skill_name
        }
```

---

## Common Mistakes

### Mistake 1: Not Handling Task Ambiguity

**Wrong:**
```python
# ❌ Crashes on ambiguous tasks
def route_task(task: Task):
    characteristics = parse_task(task)  # ❌ Crashes on ambiguous input
    matches = match_skills(characteristics, skills)
    return matches[0].skill
```

**Correct:**
```python
# ✅ Handle ambiguous tasks gracefully
def route_task(task: Task):
    try:
        characteristics = parse_task(task)
    except ParseError as e:
        return RoutingDecision(
            strategy="human_review",
            skills=[],
            error="Task too ambiguous for automatic routing"
        )
    
    matches = match_skills(characteristics, skills)
    
    if not matches or matches[0].confidence < 0.5:
        return RoutingDecision(
            strategy="human_review",
            skills=[],
            confidence=matches[0].confidence if matches else 0
        )
    
    return RoutingDecision(
        strategy="best_fit",
        skills=[matches[0].skill],
        confidence=matches[0].confidence
    )
```

### Mistake 2: Ignoring Skill Resource Requirements

**Wrong:**
```python
# ❌ Routing to resource-intensive skill without checking
def route_task(task, skills):
    matches = match_skills(task, skills)
    return matches[0].skill  # ❌ May be resource-intensive
```

**Correct:**
```python
# ✅ Check resource requirements
def route_task(task, skills):
    matches = match_skills(task, skills)
    
    for match in matches:
        if meets_resource_requirements(match.skill, task):
            return RoutingDecision(
                strategy="best_fit",
                skills=[match.skill],
                confidence=match.confidence
            )
    
    # No skill meets requirements
    return RoutingDecision(
        strategy="failed",
        skills=[],
        error="No skill meets resource requirements"
    )
```

### Mistake 3: Not Updating Routing Over Time

**Wrong:**
```python
# ❌ Static routing weights
ROUTING_WEIGHTS = {
    "capability_match": 0.5,
    "domain_expertise": 0.3,
    "performance_history": 0.2
}  # ❌ Never updated
```

**Correct:**
```python
# ✅ Dynamic routing weights
def calculate_routing_weights() -> dict:
    weights = {
        "capability_match": 0.5,
        "domain_expertise": 0.3,
        "performance_history": 0.2
    }
    
    # Update based on historical performance
    if has_high_correlation("performance_history"):
        weights["performance_history"] += 0.2
        weights["capability_match"] -= 0.1
    
    return weights
```

### Mistake 4: No Routing Decision Logging

**Wrong:**
```python
# ❌ No logging of routing decisions
def route_task(task: Task):
    matches = match_skills(task, skills)
    decision = matches[0]
    
    return decision.skill  # ❌ No logging for analysis
```

**Correct:**
```python
# ✅ Log routing decisions
def route_task(task: Task):
    matches = match_skills(task, skills)
    decision = matches[0]
    
    # Log routing decision
    log_routing_decision(
        task_id=task.id,
        selected_skill=decision.skill.name,
        confidence=decision.confidence,
        alternative_skills=[m.skill.name for m in matches[1:5]]
    )
    
    return decision.skill
```

### Mistake 5: Over-Routing Based on Single Skill

**Wrong:**
```python
# ❌ Always routing to single skill
def route_task(task, skills):
    matches = match_skills(task, skills)
    return matches[0].skill  # ❌ Single skill, no flexibility
```

**Correct:**
```python
# ✅ Support multiple routing strategies
def route_task(task, skills):
    matches = match_skills(task, skills)
    
    if is_complex_task(task):
        # Use multiple skills for complex tasks
        return route_to_multiple_skills(matches)
    else:
        # Use single skill for simple tasks
        return matches[0].skill
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Validation at top of routing functions
- [ ] **Parsed State:** Tasks parsed into routable format
- [ ] **Purity:** Matching functions are stateless
- [ ] **Fail Fast:** Invalid routing throws clear errors
- [ ] **Readability:** Routing logic reads as English

### Testing

- [ ] Unit tests for skill matching
- [ ] Integration tests for multi-skill routing
- [ ] Edge case tests for boundary conditions
- [ ] Fallback mechanism tests
- [ ] Learning-based routing tests

### Security

- [ ] Task inputs validated before routing
- [ ] No arbitrary code execution in matching
- [ ] Resource limits on routing runs
- [ ] Input length limits enforced
- [ ] Malicious task detection

### Performance

- [ ] Routing caching where appropriate
- [ ] Parallel skill matching
- [ ] Memory usage bounded for large skill sets
- [ ] Timeout protection for slow routing
- [ ] Incremental updates supported

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `agent-confidence-based-selector` | Confidence-based skill selection |
| `agent-task-decomposition-engine` | Task decomposition |
| `agent-diff-quality-analyzer` | Code quality analysis |
| `agent-self-critique-engine` | Self-critique and improvement |
| `code-philosophy` | Core correctness principles |

### Core Dependencies

- **Task Parser:** Parse tasks into routable format
- **Skill Matcher:** Match tasks to skills
- **Confidence Calculator:** Calculate routing confidence
- **Routing Strategy:** Implement routing strategies
- **Learning Engine:** Optimize routing over time

### External Resources

- [Service Discovery](https://example.com/service-discovery) - Skill discovery
- [Load Balancing](https://example.com/load-balancing) - Task distribution
- [Routing Algorithms](https://example.com/routing-algorithms) - Routing strategies

---

## Implementation Tracking

### Agent Skill Routing System - Core Patterns

| Task | Status |
|------|--------|
| Task parsing and characterization | ✅ Complete |
| Skill matching engine | ✅ Complete |
| Multi-skill routing | ✅ Complete |
| Fallback routing | ✅ Complete |
| Learning-based optimization | ✅ Complete |
| Routing cache | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Task parsing and characterization
- Skill matching engine
- Multi-skill routing
- Fallback routing
- Learning-based optimization

### 1.1.0 (Planned)
- Custom routing rules
- Performance profiling integration
- ML-based routing optimization
- Multi-dimensional routing

### 2.0.0 (Future)
- Historical routing analysis
- Predictive routing
- Automated skill addition
- Cross-agent routing correlation

---

## Implementation Prompt (Execution Layer)

When implementing the Skill Routing System, use this prompt for code generation:

```
Create a Skill Routing System implementation following these requirements:

1. Core Class: `SkillRouter`
   - Parse tasks into routable format
   - Match tasks to suitable skills
   - Calculate routing confidence
   - Support multiple routing strategies
   - Implement learning-based optimization

2. Key Methods:
   - `characterize_task(task)`: Parse task characteristics
   - `match_skills(task, skills)`: Match task to skills
   - `calculate_confidence(match)`: Calculate routing confidence
   - `route_task(task, skills)`: Route task to skill
   - `learn_from_routing(result)`: Update routing based on history

3. Routing Strategies:
   - best_fit: Select highest confidence skill
   - multiple: Route to multiple skills
   - fallback: Primary with fallback options
   - hybrid: Combine multiple strategies

4. Matching Dimensions:
   - Capability match: Does skill handle this type?
   - Domain expertise: Is skill experienced in domain?
   - Performance history: Past success rates
   - Resource efficiency: Time and resource usage
   - Recent performance: Last N executions

5. Output Structure:
   - `strategy`: Routing strategy used
   - `skills`: Selected skills
   - `confidence`: Routing confidence (0.0-1.0)
   - `alternatives`: Alternative skill recommendations
   - `error`: Routing error (if any)

6. Fallback Features:
   - Configurable fallback chain
   - Multiple fallback levels
   - Fallback confidence thresholds
   - Fallback reason tracking
   - Fallback success rate monitoring

7. Learning Features:
   - Routing history tracking
   - Confidence adjustment
   - Skill weighting updates
   - Pattern recognition
   - Optimization suggestions

8. Performance Features:
   - Routing caching
   - Parallel skill matching
   - Resource-aware routing
   - Timeout protection
   - Memory-efficient routing

Follow the 5 Laws of Elegant Defense:
- Guard clauses for validation
- Parse task at boundary
- Pure matching functions
- Fail fast on invalid routing
- Clear names for all components
```
