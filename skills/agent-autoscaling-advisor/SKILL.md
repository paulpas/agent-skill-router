---
name: agent-autoscaling-advisor
description: Advisors on optimal auto-scaling configurations for distributed systems to balance cost and availability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: agent
  role: optimization
  scope: scaling
  output-format: recommendation
  triggers: autoscaling advisor, autoscaling-advisor, scaling policies, scale-out, scale-in
---

# Autoscaling Advisor (Scaling Policy Optimization)

> **Load this skill** when designing or modifying auto-scaling pipelines that configure scaling policies to balance cost, availability, and performance SLAs.

## TL;DR Checklist

When configuring auto-scaling policies:

- [ ] Analyze historical scaling patterns and usage metrics
- [ ] Calculate optimal scaling thresholds based on SLAs
- [ ] Design scale-up and scale-down policies with safety margins
- [ ] Model cooldown periods and dampening strategies
- [ ] Generate recommendations for min/max instance counts
- [ ] Implement dynamic scaling based on multiple metrics
- [ ] Validate policies with load testing
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use Autoscaling Advisor when:

- Configuring new auto-scaling groups
- Tuning existing scaling policies
- Optimizing scaling for cost-performance balance
- Designing scaling for variable workloads
- Implementing predictive scaling strategies

---

## When NOT to Use

Avoid using Autoscaling Advisor for:

- Static workloads with predictable patterns
- Single-instance deployments
- Environments with strict compliance requirements
- Real-time scaling requirements (milliseconds)
- Tasks where manual scaling is preferred

---

## Core Concepts

### Auto-Scaling Policy Structure

```
Auto-Scaling Policy
├── Scale-Up Configuration
│   ├── Trigger Metric (CPU, Memory, Requests)
│   ├── Threshold (e.g., 70% CPU utilization)
│   ├── Scale Cooldown (seconds)
│   └── Scaling Adjustment (+N instances)
├── Scale-Down Configuration
│   ├── Trigger Metric (CPU, Memory, Requests)
│   ├── Threshold (e.g., 30% CPU utilization)
│   ├── Scale Cooldown (seconds)
│   └── Scaling Adjustment (-N instances)
├── Instance Configuration
│   ├── Minimum Instances
│   ├── Maximum Instances
│   └── Desired Capacity
└── Health Check Configuration
    ├── Health Check Type
    ├── Health Check Period
    └── Unhealthy Threshold
```

### Key Metrics

#### 1. Trigger Metrics

```
CPU Utilization = Current CPU / Total CPU
Memory Utilization = Current Memory / Total Memory
Request Rate = Requests per second
Queue Length = Pending requests in queue
Response Time = P95/P99 latency
```

#### 2. Scaling Metrics

```
Scale-Up Rate = Instances added per scale event
Scale-Down Rate = Instances removed per scale event
Cooldown Period = Time between scaling events
Scaling Adjustment = Change in instance count
```

#### 3. Health Metrics

```
Instance Health = Health check status
Task Health = Application health status
Queue Depth = Work queue backlog
Error Rate = Failed requests percentage
```

### Scaling Strategies

#### 1. Reactive Scaling
```
Monitor metrics → Alert threshold met → Scale
Response time: Minutes
Use case: Variable workloads
```

#### 2. Predictive Scaling
```
Analyze patterns → Predict future load → Pre-scale
Response time: Hours (proactive)
Use case: Predictable patterns
```

#### 3. Hybrid Scaling
```
Combine reactive and predictive
Use case: Most production workloads
```

---

## Implementation Patterns

### Pattern 1: Historical Usage Analyzer

Analyze historical scaling patterns to inform policy:

```python
from dataclasses import dataclass
from typing import List, Dict
from datetime import datetime
from collections import defaultdict
import math


@dataclass
class ScalingEvent:
    timestamp: datetime
    event_type: str  # scale_up, scale_down
    instance_count: int
    trigger_metric: str
    trigger_value: float
    reason: str


@dataclass
class UsagePattern:
    period: str
    avg_utilization: float
    p95_utilization: float
    p99_utilization: float
    peak_utilization: float
    min_instances: int
    max_instances: int
    scaling_events_per_day: float


def analyze_scaling_history(
    events: List[ScalingEvent],
    utilization_data: List[dict]
) -> UsagePattern:
    """Analyze historical scaling events and utilization data."""
    if not events:
        return UsagePattern(
            period="unknown",
            avg_utilization=0.0,
            p95_utilization=0.0,
            p99_utilization=0.0,
            peak_utilization=0.0,
            min_instances=1,
            max_instances=1,
            scaling_events_per_day=0.0
        )
    
    # Extract utilization values
    cpu_values = [d.get("cpu_utilization", 0) for d in utilization_data]
    
    # Calculate pattern metrics
    avg_util = sum(cpu_values) / len(cpu_values)
    sorted_utils = sorted(cpu_values)
    n = len(sorted_utils)
    
    # Calculate scaling frequency
    days_span = (events[-1].timestamp - events[0].timestamp).days or 1
    scaling_rate = len(events) / days_span
    
    return UsagePattern(
        period="24h",
        avg_utilization=avg_util,
        p95_utilization=sorted_utils[int(n * 0.95)],
        p99_utilization=sorted_utils[int(n * 0.99)],
        peak_utilization=max(cpu_values),
        min_instances=min(e.instance_count for e in events),
        max_instances=max(e.instance_count for e in events),
        scaling_events_per_day=scaling_rate
    )
```

### Pattern 2: Optimal Threshold Calculator

Calculate optimal scaling thresholds based on SLAs:

```python
from dataclasses import dataclass
from typing import Tuple


@dataclass
class ThresholdConfig:
    scale_up_trigger: float  # 0.0 - 1.0
    scale_down_trigger: float  # 0.0 - 1.0
    scale_up_adjustment: int
    scale_down_adjustment: int
    cooldown_seconds: int


def calculate_optimal_thresholds(
    utilization_data: List[float],
    sla_response_time_ms: int,
    sla_error_rate: float,
    target_response_time_ms: int,
    target_error_rate: float
) -> ThresholdConfig:
    """Calculate optimal scaling thresholds based on SLAs."""
    if not utilization_data:
        return ThresholdConfig(
            scale_up_trigger=0.7,
            scale_down_trigger=0.3,
            scale_up_adjustment=2,
            scale_down_adjustment=1,
            cooldown_seconds=300
        )
    
    # Calculate current SLA performance
    current_p95 = calculate_percentile(utilization_data, 0.95)
    
    # Calculate thresholds that maintain SLA
    scale_up_trigger = current_p95 - 0.15  # 15% buffer below current
    scale_down_trigger = scale_up_trigger * 0.4  # Lower for scale-down hysteresis
    
    # Clamp to safe ranges
    scale_up_trigger = max(0.5, min(0.9, scale_up_trigger))
    scale_down_trigger = max(0.1, min(0.5, scale_down_trigger))
    
    # Calculate scaling adjustments
    current_max = max(utilization_data)
    current_min = min(utilization_data)
    
    scale_up_adjustment = max(1, int((1.0 - current_max) / 0.1))
    scale_down_adjustment = max(1, int(current_min / 0.1))
    
    # Calculate cooldown based on scaling frequency
    scaling_rate = len(utilization_data) / 300  # 5 min window
    
    if scaling_rate > 10:
        cooldown_seconds = 60  # High frequency, short cooldown
    elif scaling_rate > 5:
        cooldown_seconds = 120  # Medium frequency
    else:
        cooldown_seconds = 300  # Low frequency, longer cooldown
    
    return ThresholdConfig(
        scale_up_trigger=scale_up_trigger,
        scale_down_trigger=scale_down_trigger,
        scale_up_adjustment=scale_up_adjustment,
        scale_down_adjustment=scale_down_adjustment,
        cooldown_seconds=cooldown_seconds
    )


def calculate_percentile(values: List[float], percentile: float) -> float:
    """Calculate percentile value."""
    if not values:
        return 0.0
    
    sorted_values = sorted(values)
    index = int(len(sorted_values) * percentile)
    return sorted_values[min(index, len(sorted_values) - 1)]
```

### Pattern 3: Scaling Policy Generator

Generate comprehensive auto-scaling policies:

```python
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class ScalingPolicy:
    policy_name: str
    min_instances: int
    max_instances: int
    desired_capacity: int
    scale_up: ThresholdConfig
    scale_down: ThresholdConfig
    health_check_interval_seconds: int
    health_check_grace_period_seconds: int


def generate_scaling_policy(
    workload_type: str,
    usage_pattern: UsagePattern,
    sla_requirements: dict
) -> ScalingPolicy:
    """Generate auto-scaling policy based on workload type and patterns."""
    
    # Workload-specific defaults
    workload_defaults = {
        "web": {
            "scale_up_trigger": 0.7,
            "scale_down_trigger": 0.3,
            "scale_up_adjustment": 2,
            "scale_down_adjustment": 1,
            "cooldown_seconds": 300,
            "min_instances": 2,
            "max_instances": 20
        },
        "batch": {
            "scale_up_trigger": 0.8,
            "scale_down_trigger": 0.2,
            "scale_up_adjustment": 1,
            "scale_down_adjustment": 5,
            "cooldown_seconds": 600,
            "min_instances": 1,
            "max_instances": 100
        },
        "api": {
            "scale_up_trigger": 0.6,
            "scale_down_trigger": 0.25,
            "scale_up_adjustment": 2,
            "scale_down_adjustment": 1,
            "cooldown_seconds": 180,
            "min_instances": 3,
            "max_instances": 50
        }
    }
    
    defaults = workload_defaults.get(workload_type, workload_defaults["web"])
    
    # Override with calculated thresholds
    thresholds = calculate_optimal_thresholds(
        utilization_data=[usage_pattern.avg_utilization] * 100,
        sla_response_time_ms=sla_requirements.get("response_time_ms", 500),
        sla_error_rate=sla_requirements.get("error_rate", 0.01),
        target_response_time_ms=sla_requirements.get("target_response_time_ms", 200),
        target_error_rate=sla_requirements.get("target_error_rate", 0.001)
    )
    
    # Calculate desired capacity (target 60% utilization)
    desired_capacity = calculate_desired_capacity(
        usage_pattern.avg_utilization,
        defaults["min_instances"],
        defaults["max_instances"]
    )
    
    return ScalingPolicy(
        policy_name=f"{workload_type}-scaling-policy",
        min_instances=max(defaults["min_instances"], usage_pattern.min_instances),
        max_instances=min(defaults["max_instances"], usage_pattern.max_instances * 2),
        desired_capacity=desired_capacity,
        scale_up=ThresholdConfig(
            scale_up_trigger=thresholds.scale_up_trigger,
            scale_down_trigger=thresholds.scale_down_trigger,
            scale_up_adjustment=thresholds.scale_up_adjustment,
            scale_down_adjustment=thresholds.scale_down_adjustment,
            cooldown_seconds=thresholds.cooldown_seconds
        ),
        scale_down=ThresholdConfig(
            scale_up_trigger=thresholds.scale_down_trigger * 0.8,
            scale_down_trigger=thresholds.scale_down_trigger,
            scale_up_adjustment=-thresholds.scale_down_adjustment,
            scale_down_adjustment=-thresholds.scale_down_adjustment,
            cooldown_seconds=thresholds.cooldown_seconds * 2
        ),
        health_check_interval_seconds=60,
        health_check_grace_period_seconds=300
    )


def calculate_desired_capacity(
    avg_utilization: float,
    min_instances: int,
    max_instances: int
) -> int:
    """Calculate desired instance count for 60% target utilization."""
    target_utilization = 0.6
    
    if avg_utilization == 0:
        return min_instances
    
    # Calculate instances needed for current load
    instances_needed = 1 / (1 - avg_utilization)
    
    # Adjust for target utilization
    desired = instances_needed * (avg_utilization / target_utilization)
    
    # Clamp to min/max
    return max(min_instances, min(max_instances, max(1, int(desired))))
```

### Pattern 4: Scale Event Simulator

Simulate scaling events to validate policies:

```python
from dataclasses import dataclass
from typing import List
import random


@dataclass
class SimulationResult:
    policy_name: str
    total_cost: float
    avg_response_time_ms: float
    error_rate: float
    scale_up_count: int
    scale_down_count: int
    instances_oversized: int
    instances_undersized: int


def simulate_scaling(
    policy: ScalingPolicy,
    workload_profile: List[float],
    instance_cost_hourly: float,
    simulation_hours: int
) -> SimulationResult:
    """Simulate scaling behavior over workload profile."""
    current_instances = policy.min_instances
    total_cost = 0
    total_response_time = 0
    total_requests = 0
    scale_up_count = 0
    scale_down_count = 0
    oversized = 0
    undersized = 0
    
    for hour in range(simulation_hours):
        # Add instance cost for this hour
        total_cost += current_instances * (instance_cost_hourly / 24)
        
        # Get workload for this hour
        workload = workload_profile[hour % len(workload_profile)]
        
        # Calculate resource utilization
        resource_util = workload / current_instances if current_instances > 0 else 1.0
        
        # Check scale-up trigger
        if resource_util > policy.scale_up.scale_up_trigger and current_instances < policy.max_instances:
            scale_up_count += 1
            current_instances += policy.scale_up.scale_up_adjustment
            current_instances = min(current_instances, policy.max_instances)
        
        # Check scale-down trigger
        elif resource_util < policy.scale_down.scale_down_trigger and current_instances > policy.min_instances:
            scale_down_count += 1
            current_instances -= policy.scale_down.scale_down_adjustment
            current_instances = max(current_instances, policy.min_instances)
        
        # Calculate response time and errors
        if resource_util > 0.9:
            response_time = 500 + (resource_util - 0.9) * 2000  # Degrades rapidly
            error_rate = 0.05 + (resource_util - 0.9) * 0.5
            oversized += 1
        elif resource_util < 0.3:
            response_time = 100 + (0.3 - resource_util) * 50  # Over-provisioned
            error_rate = 0.001
            undersized += 1
        else:
            response_time = 100 + resource_util * 100
            error_rate = 0.001
        
        total_response_time += response_time
        total_requests += 1
    
    return SimulationResult(
        policy_name=policy.policy_name,
        total_cost=total_cost,
        avg_response_time_ms=total_response_time / total_requests,
        error_rate=total_requests > 0 else 0,
        scale_up_count=scale_up_count,
        scale_down_count=scale_down_count,
        instances_oversized=oversized,
        instances_undersized=undersized
    )
```

### Pattern 5: Policy Comparison Engine

Compare multiple scaling policies and recommend optimal:

```python
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class PolicyComparison:
    policy_name: str
    total_cost: float
    sla_compliance: float  # 0.0 - 1.0
    cost_effectiveness: float  # Cost per performance unit
    recommendation: str


def compare_policies(
    policies: List[ScalingPolicy],
    workload_profile: List[float],
    instance_cost_hourly: float,
    sla_threshold_ms: int,
    simulation_hours: int = 168  # 1 week
) -> List[PolicyComparison]:
    """Compare multiple policies and rank by effectiveness."""
    comparisons = []
    
    for policy in policies:
        simulation = simulate_scaling(
            policy=policy,
            workload_profile=workload_profile,
            instance_cost_hourly=instance_cost_hourly,
            simulation_hours=simulation_hours
        )
        
        # Calculate SLA compliance
        sla_compliance = max(0, 1 - (simulation.avg_response_time_ms - sla_threshold_ms) / sla_threshold_ms)
        
        # Calculate cost effectiveness
        if sla_compliance > 0:
            cost_effectiveness = simulation.total_cost / sla_compliance
        else:
            cost_effectiveness = float('inf')
        
        # Generate recommendation
        if sla_compliance >= 0.99 and cost_effectiveness < 1000:
            recommendation = "OPTIMAL"
        elif sla_compliance >= 0.95:
            recommendation = "RECOMMENDED"
        elif sla_compliance >= 0.90:
            recommendation = "ACCEPTABLE"
        else:
            recommendation = "NOT_RECOMMENDED"
        
        comparisons.append(PolicyComparison(
            policy_name=policy.policy_name,
            total_cost=simulation.total_cost,
            sla_compliance=sla_compliance,
            cost_effectiveness=cost_effectiveness,
            recommendation=recommendation
        ))
    
    # Sort by cost-effectiveness (lower is better), then SLA compliance
    comparisons.sort(key=lambda c: (c.cost_effectiveness, -c.sla_compliance))
    
    return comparisons
```

---

## Common Patterns

### Pattern 1: Dynamic Threshold Adjustment

Adjust thresholds based on time of day:

```python
def get_time_adjusted_thresholds(base_config: ThresholdConfig, hour: int) -> ThresholdConfig:
    """Adjust thresholds based on time of day patterns."""
    if 0 <= hour < 6:  # Night hours
        return ThresholdConfig(
            scale_up_trigger=base_config.scale_up_trigger * 0.8,
            scale_down_trigger=base_config.scale_down_trigger * 1.2,
            scale_up_adjustment=base_config.scale_up_adjustment,
            scale_down_adjustment=base_config.scale_down_adjustment,
            cooldown_seconds=base_config.cooldown_seconds
        )
    else:
        return base_config
```

### Pattern 2: Heat Death Prevention

Prevent scale-down events during critical operations:

```python
def prevent_heat_death(current_instances: int, min_instances: int, cooldown_until: datetime) -> bool:
    """Check if scale-down should be prevented."""
    if current_instances <= min_instances:
        return True  # Already at minimum
    
    if cooldown_until and datetime.now() < cooldown_until:
        return True  # Still in cooldown period
    
    return False
```

### Pattern 3: Smart Scaling with Multiple Metrics

Scale based on multiple correlated metrics:

```python
def calculate_scaling_signal(
    cpu_util: float,
    memory_util: float,
    request_rate: float,
    response_time: float
) -> float:
    """Calculate composite scaling signal from multiple metrics."""
    # Weight different metrics
    cpu_weight = 0.4
    memory_weight = 0.3
    request_weight = 0.2
    response_weight = 0.1
    
    # Normalize response time to utilization equivalent
    response_util = min(1.0, response_time / 500)
    
    # Calculate weighted average
    signal = (
        cpu_util * cpu_weight +
        memory_util * memory_weight +
        request_rate * request_weight +
        response_util * response_weight
    )
    
    return signal
```

---

## Common Mistakes

### Mistake 1: Insufficient Scale Cooldown

**Wrong:**
```python
# ❌ Too short cooldown causes oscillation
ScalingPolicy(
    cooldown_seconds=30,  # Too short!
    scale_up_trigger=0.7,
    scale_down_trigger=0.7  # Same as scale-up
)
```

**Correct:**
```python
# ✅ Adequate cooldown with hysteresis
ScalingPolicy(
    cooldown_seconds=300,  # 5 minutes minimum
    scale_up_trigger=0.7,
    scale_down_trigger=0.3  # Hysteresis prevents oscillation
)
```

### Mistake 2: Ignoring Warm-up Time

**Wrong:**
```python
# ❌ Scaling down during application warm-up
if utilization < 0.3:
    scale_down()  # New instances still warming up
```

**Correct:**
```python
# ✅ Wait for warm-up before scaling down
if utilization < 0.3 and instances_healthy_for(120):  # 2 minutes
    scale_down()  # Safe to scale down
```

### Mistake 3: Over-Scaling on Spikes

**Wrong:**
```python
# ❌ Scaling to max on single spike
if utilization > 0.9:
    scale_to(max_instances)  # Might be temporary spike
```

**Correct:**
```python
# ✅ Gradual scaling with spike protection
if utilization > 0.9:
    scale_up(2)  # Add 2 instances, not max
    spike_count += 1
    if spike_count > 3:
        scale_up(5)  # If repeated, scale more
```

### Mistake 4: Not Testing Policies

**Wrong:**
```python
# ❌ Deploying scaling policy without testing
policy = generate_policy(usage_pattern)
apply_policy(policy)  # No validation
```

**Correct:**
```python
# ✅ Test policies before deployment
policy = generate_policy(usage_pattern)
simulation = simulate_scaling(policy, test_workload)
if simulation.sla_compliance < 0.99:
    adjust_policy(policy)  # Fix before deployment
else:
    apply_policy(policy)  # Deploy tested policy
```

### Mistake 5: Not Monitoring Scaling Health

**Wrong:**
```python
# ❌ No monitoring of scaling effectiveness
policy = apply_policy(policy)
# Never check if scaling is working correctly
```

**Correct:**
```python
# ✅ Monitor scaling health continuously
while True:
    scaling_health = get_scaling_health()
    if scaling_health.scale_events == 0:
        alert("Scaling not triggering - policy review needed")
    elif scaling_health.scale_events > 10:
        alert("Scaling too aggressive - review thresholds")
    elif scaling_health.sla_violations > 0:
        alert("SLA violations detected - review capacity")
    
    await asyncio.sleep(300)  # Check every 5 minutes
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Input validation for utilization metrics
- [ ] **Parsed State:** Raw metrics parsed into typed data structures
- [ ] **Purity:** Policy generation functions are pure
- [ ] **Fail Loud:** Invalid configurations throw descriptive errors
- [ ] **Readability:** Policy recommendations read like scaling guide

### Testing

- [ ] Unit tests for utilization analysis
- [ ] Integration tests for threshold calculation
- [ ] Policy generation tests
- [ ] Scaling simulation tests
- [ ] Policy comparison tests

### Security

- [ ] Instance limits validated
- [ ] No unauthorized cloud resource modifications
- [ ] Audit trail for all policy changes
- [ ] SLA compliance validation
- [ ] Cost data access controlled

### Performance

- [ ] Efficient scaling calculations
- [ ] Concurrent policy comparisons
- [ ] Cached utilization patterns
- [ ] Incremental updates for large deployments
- [ ] Memory-efficient streaming for patterns

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `resource-optimizer` | Optimize resource allocation |
| `ci-cd-pipeline-analyzer` | Optimize CI/CD scaling |
| `latency-analyzer` | Ensure SLAs in scaling |
| `hot-path-detector` | Optimize hot paths |
| `autoscaling-advisor` | Policy validation |

### Core Dependencies

- **Analyzer:** Historical usage analysis
- **Calculator:** Optimal threshold calculation
- **Generator:** Scaling policy generation
- **Simulator:** Policy validation via simulation
- **Monitor:** Ongoing scaling health monitoring

### External Resources

- [AWS Auto Scaling](https://aws.amazon.com/autoscaling/)
- [Kubernetes Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [Google Cloud AutoScaling](https://cloud.google.com/compute/docs/autoscaler)

---

## Implementation Tracking

### Agent Autoscaling Advisor - Core Patterns

| Task | Status |
|------|--------|
| Historical usage analyzer | ✅ Complete |
| Optimal threshold calculator | ✅ Complete |
| Scaling policy generator | ✅ Complete |
| Scale event simulator | ✅ Complete |
| Policy comparison engine | ✅ Complete |
| Dynamic threshold adjustment | ✅ Complete |
| Heat death prevention | ✅ Complete |
| Multi-metric scaling | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Historical usage analysis
- Optimal threshold calculation
- Scaling policy generation
- Scale event simulation
- Policy comparison

### 1.1.0 (Planned)
- Predictive scaling
- Multi-dimensional scaling
- A/B testing support
- Cost optimization

### 2.0.0 (Future)
- ML-based optimization
- Auto-tuning policies
- Cross-cluster optimization
- Cost-aware scaling

---

## Implementation Prompt (Execution Layer)

When implementing the Autoscaling Advisor skill, use this prompt for code generation:

```
Create an Autoscaling Advisor implementation following these requirements:

1. Core Classes:
   - ScalingEvent: Records scaling events
   - UsagePattern: Analyzed scaling patterns
   - ThresholdConfig: Scaling thresholds
   - ScalingPolicy: Complete policy configuration
   - SimulationResult: Policy simulation results
   - PolicyComparison: Policy comparison results

2. Key Methods:
   - analyze_scaling_history(events, utilization): Analyze patterns
   - calculate_optimal_thresholds(data, sla_requirements): Calculate thresholds
   - generate_scaling_policy(workload_type, pattern, sla): Generate policy
   - simulate_scaling(policy, workload, cost, hours): Simulate behavior
   - compare_policies(policies, workload, cost, sla, hours): Compare policies
   - get_time_adjusted_thresholds(config, hour): Time-based adjustments
   - calculate_scaling_signal(metrics): Multi-metric scaling signal

3. Data Structures:
   - ScalingEvent with timestamp, type, count, trigger details
   - UsagePattern with utilization metrics and scaling frequency
   - ThresholdConfig with scale-up and scale-down settings
   - ScalingPolicy with full policy configuration
   - SimulationResult with cost, SLA compliance, events
   - PolicyComparison with cost-effectiveness rankings

4. Scaling Strategies:
   - Reactive: Response to current metrics
   - Predictive: Anticipate load patterns
   - Hybrid: Combined approach
   - Spikes: Handle traffic spikes gracefully

5. Configuration Options:
   - scale_up_trigger: CPU/memory threshold for scale-up
   - scale_down_trigger: Threshold for scale-down
   - cooldown_seconds: Wait between scaling events
   - min_instances: Minimum instances allowed
   - max_instances: Maximum instances allowed
   - sla_response_time_ms: Response time SLA target
   - sla_error_rate: Error rate SLA target

6. Output Features:
   - Scaling policies
   - Threshold configurations
   - Simulated behavior
   - Policy comparisons
   - Recommendations

7. Error Handling:
   - Invalid utilization data fallback
   - SLA violation detection
   - Scaling policy validation
   - Graceful degradation

Follow the 5 Laws of Elegant Defense:
- Guard clauses for input validation
- Parse raw metrics into typed structures
- Pure policy generation functions
- Fail fast on invalid state
- Clear names for all components
```
