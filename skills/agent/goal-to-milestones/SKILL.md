---
name: to-milestones
description: '"Translates high-level goals into actionable milestones and tasks that"
  can be executed by specialized skills, enabling goal-directed problem solving with
  measurable progress tracking.'
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: orchestration
  scope: orchestration
  output-format: analysis
  triggers: goal to milestones, goal-to-milestones, goals, high-level, translates
  related-skills: add-new-skill, code-correctness-verifier, confidence-based-selector,
    hot-path-detector
---




# Goal to Milestones (Agent Goal Directed Planning)

> **Load this skill** when designing or modifying agent goal translation patterns that convert high-level objectives into concrete, measurable milestones and executable tasks.

## TL;DR Checklist

When translating goals to milestones:

- [ ] Define clear, measurable success criteria
- [ ] Break goals into sequential, achievable milestones
- [ ] Assign appropriate skills to each milestone
- [ ] Track progress with measurable metrics
- [ ] Handle milestone dependencies correctly
- [ ] Support goal refinement based on progress
- [ ] Provide progress visualization and reporting
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use the Goal to Milestones translation when:

- Converting vague goals into concrete, executable tasks
- Building goal-oriented agent systems with progress tracking
- Implementing OKR (Objectives and Key Results) style planning
- Creating roadmaps for complex multi-step objectives
- Managing long-term projects with intermediate checkpoints
- Building systems that reason about goal achievement

---

## When NOT to Use

Avoid using this skill for:

- Immediate execution of known tasks (direct invocation)
- Dynamic goal revision (use dynamic-replanner)
- Single-step tasks without intermediate milestones
- Real-time systems requiring immediate response

---

## Core Concepts

### Goal Hierarchy

Goals are organized in a hierarchy:

```
Objective (High-Level)
├── Goal 1 (Intermediate)
│   ├── Milestone 1.1 (Concrete)
│   ├── Milestone 1.2 (Concrete)
│   └── Milestone 1.3 (Concrete)
└── Goal 2 (Intermediate)
    ├── Milestone 2.1 (Concrete)
    └── Milestone 2.2 (Concrete)
```

### Milestone Properties

Each milestone has:

```python
{
    "id": "uuid",
    "description": "What needs to be achieved",
    "success_criteria": {
        "metric": "accuracy",
        "target": 0.95,
        "current": null
    },
    "dependencies": ["milestone_a", "milestone_b"],
    "skills": ["skill_a", "skill_b"],
    "deadline": datetime | None,
    "priority": 1,  # Higher = more important
    "status": "pending|in_progress|completed|blocked|failed"
}
```

### Success Criteria Types

#### 1. Binary Success

Achieve or not achieve:

```python
{
    "type": "binary",
    "description": "Achieve 95% code coverage",
    "target": True,
    "current": None
}
```

#### 2. Threshold Success

Achieve threshold:

```python
{
    "type": "threshold",
    "description": "Achieve 95% model accuracy",
    "target": 0.95,
    "current": None
}
```

#### 3. Range Success

Achieve within range:

```python
{
    "type": "range",
    "description": "Cost between $1000-$1500",
    "min": 1000,
    "max": 1500,
    "current": None
}
```

#### 4. Relative Success

Improve by certain percentage:

```python
{
    "type": "relative",
    "description": "Reduce latency by 50%",
    "improvement": 0.5,
    "current": None
}
```

### Progress Metrics

Track milestones with metrics:

```python
{
    "progress": 0.75,  # 0.0 to 1.0
    "metrics": {
        "tasks_completed": 3,
        "tasks_total": 4,
        "accuracy": 0.87,
        "cost_usd": 1250.00
    },
    "timeline": {
        "started_at": datetime,
        "estimated_completion": datetime,
        "actual_completion": None
    },
    "status_reason": "waiting_for_dependencies"
}
```

---

## Implementation Patterns

### Pattern 1: Basic Goal Translation

Translate goal to milestones:

```python
from apex.agents.goal_planner import GoalPlanner
from apex.agents.skill_registry import SkillRegistry


def translate_goal_to_milestones(goal: str) -> GoalPlan:
    """Translate high-level goal to executable milestones."""
    
    registry = SkillRegistry()
    registry.register_skill("code-philosophy")
    registry.register_skill("risk-management")
    registry.register_skill("indicators-api")
    
    planner = GoalPlanner(
        skill_registry=registry,
        max_milestones_per_goal=5,
        default_priority=1
    )
    
    # Define the goal
    goal_def = GoalDefinition(
        id="goal_1",
        description=goal,
        success_criteria={
            "type": "threshold",
            "target": 0.95,
            "metric": "accuracy"
        }
    )
    
    # Generate milestones
    plan = planner.translate(goal_def)
    
    return plan
```

### Pattern 2: Multi-Goal Planning

Plan multiple interdependent goals:

```python
def plan_multiple_goals(goals: list[str]):
    """Plan execution for multiple goals."""
    
    planner = GoalPlanner()
    
    # Define all goals
    goal_definitions = [
        GoalDefinition(
            id=f"goal_{i}",
            description=goal,
            priority=i + 1
        )
        for i, goal in enumerate(goals)
    ]
    
    # Generate plans with dependency resolution
    plans = planner.translate_batch(goal_definitions)
    
    # Resolve inter-goal dependencies
    planner.resolve_dependencies(plans)
    
    return plans
```

### Pattern 3: Goal Refinement

Refine goal based on progress:

```python
def refine_goal_based_on_progress(
    goal_plan: GoalPlan,
    progress_data: dict
) -> GoalPlan:
    """Refine goal based on actual progress."""
    
    planner = GoalPlanner(refinement=True)
    
    # Analyze progress
    progress_analysis = planner.analyze_progress(goal_plan, progress_data)
    
    # Identify gaps
    gaps = planner.identify_gaps(progress_analysis)
    
    # Generate refined plan
    refined_plan = planner.refine(
        goal_plan,
        gaps,
        new_milestones=2
    )
    
    return refined_plan
```

### Pattern 4: Milestone Execution Tracking

Track milestone progress:

```python
def track_milestone_execution(
    milestone: Milestone,
    execution_result: dict
) -> None:
    """Update milestone progress based on execution."""
    
    planner = GoalPlanner()
    
    # Update progress
    milestone.progress = calculate_progress(
        milestone,
        execution_result
    )
    
    # Update status
    milestone.status = determine_status(
        milestone.progress,
        execution_result.get("errors", [])
    )
    
    # Update metrics
    planner.update_metrics(milestone, execution_result)
```

### Pattern 5: Goal Visualization

Generate progress visualization:

```python
def generate_progress_report(plan: GoalPlan) -> dict:
    """Generate progress report with visualization data."""
    
    planner = GoalPlanner()
    
    # Calculate overall progress
    overall_progress = planner.calculate_overall_progress(plan)
    
    # Milestone status counts
    status_counts = planner.count_statuses(plan)
    
    # Timeline analysis
    timeline = planner.analyze_timeline(plan)
    
    # Skill utilization
    skill_usage = planner.analyze_skill_usage(plan)
    
    return {
        "overall_progress": overall_progress,
        "milestone_counts": status_counts,
        "timeline_analysis": timeline,
        "skill_usage": skill_usage,
        "risk_assessment": planner.assess_plan_risk(plan),
        "recommendations": planner.get_recommendations(plan)
    }
```

---

## Common Patterns

### Pattern 1: Goal Definition Schema

Standard goal definition format:

```python
{
    "id": "unique_identifier",
    "description": "Clear, measurable goal description",
    "success_criteria": {
        "type": "threshold|binary|range|relative",
        "target": 0.95,
        "metric": "accuracy|profit|coverage"
    },
    "constraints": {
        "max_budget": 5000,
        "deadline": "2024-12-31",
        "max_milestones": 10
    },
    "dependencies": ["other_goal_id"],
    "context": {"environment": "production"}
}
```

### Pattern 2: Milestone Template

Standard milestone structure:

```python
{
    "id": "milestone_uuid",
    "goal_id": "parent_goal_id",
    "description": "What this milestone achieves",
    "success_criteria": {
        "metric": "accuracy",
        "target": 0.90,
        "current": null
    },
    "skills": ["indicators-api", "risk-management"],
    "dependencies": ["previous_milestone"],
    "priority": 1,
    "status": "pending",
    "metadata": {
        "estimated_duration": "2h",
        "assigned_worker": null
    }
}
```

### Pattern 3: Progress Calculation

Calculate milestone progress:

```python
def calculate_milestone_progress(milestone: Milestone) -> float:
    """Calculate progress for milestone."""
    
    if milestone.status == "completed":
        return 1.0
    
    if milestone.status == "failed":
        return 0.0
    
    # Calculate based on subtasks
    if hasattr(milestone, "subtasks"):
        completed = sum(
            1 for s in milestone.subtasks if s.status == "completed"
        )
        return completed / len(milestone.subtasks)
    
    # Calculate based on skill execution
    if hasattr(milestone, "skills"):
        completed = sum(
            1 for s in milestone.skills if s.status == "completed"
        )
        return completed / len(milestone.skills)
    
    return 0.0
```

---

## Common Mistakes

### Mistake 1: Vague Success Criteria

**Wrong:**
```python
# ❌ Unclear success criteria
goal = GoalDefinition(
    id="goal_1",
    description="Improve model performance",
    success_criteria={"type": "threshold", "target": "better"}
)
# What does "better" mean?
```

**Correct:**
```python
# ✅ Specific, measurable criteria
goal = GoalDefinition(
    id="goal_1",
    description="Improve model accuracy",
    success_criteria={
        "type": "threshold",
        "target": 0.95,
        "metric": "accuracy"
    }
)
```

### Mistake 2: Not Handling Dependencies

**Wrong:**
```python
# ❌ Milestones with missing dependencies
milestones = [
    {"id": "m1", "skills": ["skill_a"]},
    {"id": "m2", "skills": ["skill_b"], "dependencies": ["m1"]}  # m1 not defined
]
```

**Correct:**
```python
# ✅ All dependencies properly defined
milestones = [
    {"id": "m1", "skills": ["skill_a"]},
    {"id": "m2", "skills": ["skill_b"], "dependencies": ["m1"]}
]

# Validate before execution
for m in milestones:
    for dep in m["dependencies"]:
        assert dep in [x["id"] for x in milestones]
```

### Mistake 3: Ignoring Resource Constraints

**Wrong:**
```python
# ❌ Goal with unlimited resources assumed
goal = GoalDefinition(
    id="goal_1",
    description="Complete analysis",
    constraints={}  # No budget, no deadline
)
```

**Correct:**
```python
# ✅ Clear resource constraints
goal = GoalDefinition(
    id="goal_1",
    description="Complete analysis",
    constraints={
        "max_budget": 5000,
        "max_time": "7d",
        "max_milestones": 10
    }
)
```

### Mistake 4: Not Tracking Progress

**Wrong:**
```python
# ❌ No progress tracking after execution
plan = planner.translate(goal)
plan.execute()  # Execution happens but progress not tracked
# Can't measure success or refine
```

**Correct:**
```python
# ✅ Progress tracking integrated
plan = planner.translate(goal)
for milestone in plan.milestones:
    result = milestone.execute()
    planner.update_progress(milestone, result)
```

### Mistake 5: Overly Granular Milestones

**Wrong:**
```python
# ❌ Too many tiny milestones
planner = GoalPlanner(max_milestones_per_goal=100)
# Overhead exceeds benefit
```

**Correct:**
```python
# ✅ Appropriate milestone granularity
planner = GoalPlanner(
    max_milestones_per_goal=5,
    min_milestone_size=100
)
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Goal validation at top of methods
- [ ] **Parsed State:** Goal features parsed at boundary
- [ ] **Purity:** Planning functions are stateless
- [ ] **Fail Loud:** Invalid goals throw clear errors
- [ ] **Readability:** Goal translation reads as English

### Testing

- [ ] Unit tests for each translation strategy
- [ ] Integration tests for multi-goal planning
- [ ] Progress tracking tests
- [ ] Dependency resolution tests
- [ ] Goal refinement tests

### Security

- [ ] Goal parameters validated before translation
- [ ] No arbitrary code execution in planning
- [ ] Input sanitization for all goal features
- [ ] Resource limits enforced
- [ ] Milestone dependencies validated

### Performance

- [ ] Planning cached where appropriate
- [ ] Memory usage monitored for large plans
- [ ] Dependency resolution optimized
- [ ] Parallel milestone execution supported

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `task-decomposition-engine` | Task breakdown for milestones |
| `multi-skill-executor` | Sequential milestone execution |
| `parallel-skill-runner` | Parallel milestone execution |
| `dynamic-replanner` | Dynamic goal revision |
| `confidence-based-selector` | Skill selection for milestones |

### Core Dependencies

- **Translator:** Converts goals to milestones
- **Validator:** Ensures milestone quality
- **Tracker:** Monitors milestone progress
- **Optimizer:** Optimizes milestone order

### External Resources

- [OKR Framework](https://example.com/okr) - Objective and Key Results
- [SMART Goals](https://example.com/smart-goals) - Goal setting methodology
- [Goal Decomposition](https://example.com/goal-decomposition) - Goal breakdown techniques

---

## Implementation Tracking

### Agent Goal to Milestones - Core Patterns

| Task | Status |
|------|--------|
| Goal definition schema | ✅ Complete |
| Milestone generation | ✅ Complete |
| Dependency management | ✅ Complete |
| Progress tracking | ✅ Complete |
| Goal refinement | ✅ Complete |
| Progress reporting | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Goal to milestone translation
- Success criteria definition
- Progress tracking
- Dependency management
- Basic reporting

### 1.1.0 (Planned)
- Multi-goal planning
- Goal refinement
- Advanced progress tracking
- Optimization

### 2.0.0 (Future)
- Learning from execution
- Distributed planning
- Adaptive goal setting
- Real-time revision

---

## Implementation Prompt (Execution Layer)

When implementing the Goal to Milestones translator, use this prompt for code generation:

```
Create a Goal to Milestones translator implementation following these requirements:

1. Core Class: `GoalPlanner`
   - Translate high-level goals to executable milestones
   - Manage goal hierarchies and dependencies
   - Track milestone progress
   - Generate progress reports

2. Key Methods:
   - `translate(goal_definition)`: Convert goal to milestones
   - `translate_batch(goal_definitions)`: Plan multiple goals
   - `refine(goal_plan, feedback)`: Refine plan based on progress
   - `calculate_progress(milestone)`: Calculate milestone progress
   - `generate_report(goal_plan)`: Generate progress report

3. Goal Definition:
   - `id`: Unique identifier
   - `description`: Clear goal description
   - `success_criteria`: Metrics for success (threshold/binary/range/relative)
   - `constraints`: Budget, deadline, resource limits
   - `dependencies`: Other goals this depends on
   - `context`: Execution environment context

4. Milestone Structure:
   - `id`: Unique identifier
   - `goal_id`: Parent goal reference
   - `description`: Milestone description
   - `success_criteria`: Metrics and targets
   - `skills`: Required skills for execution
   - `dependencies`: Other milestones this depends on
   - `priority`: Priority level
   - `status`: Pending/In Progress/Completed/Blocked/Failed
   - `progress`: Progress percentage (0.0-1.0)

5. Success Criteria Types:
   - `binary`: Boolean success/failure
   - `threshold`: Must achieve threshold value
   - `range`: Must be within range
   - `relative`: Must improve by percentage
   - `custom`: Custom calculation function

6. Progress Tracking:
   - Start/stop time tracking
   - Metrics collection
   - Status updates
   - Progress percentage calculation
   - Timeline estimation

7. Dependency Management:
   - Automatic dependency resolution
   - Cycle detection
   - Topological ordering
   - Parallel execution optimization

8. Planning Strategies:
   - Top-down: Start from goal
   - Bottom-up: Build from tasks
   - Hybrid: Combine strategies
   - Learning: Adapt from history

Follow the 5 Laws of Elegant Defense:
- Guard clauses for goal validation
- Parse goal features at boundary
- Pure planning functions
- Fail fast on invalid goals
- Clear names for all planning components
```
