---
name: agent-resource-optimizer
description: Optimizes resource allocation across distributed systems to minimize
  costs while maintaining performance SLAs.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: agent
  role: optimization
  scope: resource
  output-format: optimization
  triggers: cost optimization, resource allocation, resource optimizer, resource-optimizer
---


# Resource Optimizer (Cost-Performance Balance)

> **Load this skill** when designing or modifying resource optimization pipelines that allocate compute, memory, storage, and network resources to minimize costs while maintaining performance SLAs.

## TL;DR Checklist

When optimizing resource allocation:

- [ ] Analyze current resource utilization patterns
- [ ] Identify over-provisioned and under-provisioned resources
- [ ] Calculate cost-performance ratios for different configurations
- [ ] Model scaling scenarios and their cost implications
- [ ] Generate resource recommendations with cost estimates
- [ ] Implement auto-scaling policies with safety margins
- [ ] Track optimization impact over time
- [ ] Follow the 5 Laws of Elegant Defense from code-philosophy

---

## When to Use

Use Resource Optimizer when:

- Right-sizing cloud instances for cost savings
- Optimizing database connection pools
- Allocating Kubernetes pod resources
- Balancing compute vs. memory tradeoffs
- Implementing auto-scaling policies
- Reducing infrastructure costs without SLA impact

---

## When NOT to Use

Avoid using Resource Optimizer for:

- Single-instance optimizations (use manual tuning)
- Real-time resource scaling (use auto-scaling directly)
- Environments with strict compliance requirements
- Tasks where reliability is more important than cost
- Single-use or experimental workloads

---

## Core Concepts

### Resource Optimization Pipeline

```
Resource Optimization Pipeline
├── 1. Inventory Collection
│   ├── Instance Types
│   ├── Current Usage Metrics
│   └── Cost Data
├── 2. Analysis Phase
│   ├── Utilization Patterns
│   ├── Peak vs. Average
│   └── Growth Trends
├── 3. Modeling Phase
│   ├── Scale-up Scenarios
│   ├── Scale-down Scenarios
│   └── Right-sizing Options
├── 4. Recommendation Phase
│   ├── Cost Analysis
│   ├── SLA Impact
│   └── Risk Assessment
└── 5. Implementation Phase
    ├── Policy Generation
    ├── A/B Testing
    └── Rollout Strategy
```

### Key Metrics

#### 1. Utilization Metrics

```
CPU Utilization = Current CPU / Maximum CPU
Memory Utilization = Current Memory / Total Memory
Storage Utilization = Used Space / Total Capacity
Network Utilization = Current Throughput / Bandwidth
```

#### 2. Cost Metrics

```
Cost per Hour = Base Cost + Usage-Based Costs
Cost per Request = Total Cost / Request Count
Cost per Unit = Cost / Throughput Unit
Total Cost = Sum(Cost per Hour × Hours)
```

#### 3. Performance Metrics

```
Latency = Time per Request
Throughput = Requests per Second
Error Rate = Failed Requests / Total Requests
Availability = Uptime / Total Time
```

### Optimization Strategies

#### 1. Right-Sizing
```
Current: 4 vCPU, 8GB → Optimal: 2 vCPU, 4GB
Target: Use least resources meeting SLA
```

#### 2. Auto-Scaling
```
Scale Out: Add instances during peak
Scale In: Remove instances during off-peak
Target: Maintain 70% utilization
```

#### 3. Spot/Preemptible Instances
```
Use cheaper instances for fault-tolerant workloads
Target: 50-70% cost savings
Risk: Potential interruption
```

---

## Implementation Patterns

### Pattern 1: Resource Utilization Profiler

Profile current resource utilization across instances:

```python
from dataclasses import dataclass
from typing import List, Dict
from datetime import datetime


@dataclass
class ResourceMetrics:
    timestamp: datetime
    cpu_utilization: float  # 0.0 - 1.0
    memory_utilization: float  # 0.0 - 1.0
    storage_utilization: float  # 0.0 - 1.0
    network_utilization: float  # 0.0 - 1.0
    request_count: int
    error_count: int


@dataclass
class InstanceProfile:
    instance_id: str
    resource_type: str
    metrics: List[ResourceMetrics]
    
    def average_utilization(self) -> Dict[str, float]:
        """Calculate average utilization metrics."""
        if not self.metrics:
            return {
                "cpu": 0.0,
                "memory": 0.0,
                "storage": 0.0,
                "network": 0.0
            }
        
        n = len(self.metrics)
        return {
            "cpu": sum(m.cpu_utilization for m in self.metrics) / n,
            "memory": sum(m.memory_utilization for m in self.metrics) / n,
            "storage": sum(m.storage_utilization for m in self.metrics) / n,
            "network": sum(m.network_utilization for m in self.metrics) / n,
        }
    
    def peak_utilization(self) -> Dict[str, float]:
        """Calculate peak utilization metrics."""
        if not self.metrics:
            return {"cpu": 0.0, "memory": 0.0, "storage": 0.0, "network": 0.0}
        
        return {
            "cpu": max(m.cpu_utilization for m in self.metrics),
            "memory": max(m.memory_utilization for m in self.metrics),
            "storage": max(m.storage_utilization for m in self.metrics),
            "network": max(m.network_utilization for m in self.metrics),
        }


def profile_instances(instances: List[InstanceProfile]) -> Dict[str, dict]:
    """Generate utilization profiles for all instances."""
    profiles = {}
    
    for instance in instances:
        avg = instance.average_utilization()
        peak = instance.peak_utilization()
        
        profiles[instance.instance_id] = {
            "resource_type": instance.resource_type,
            "average": avg,
            "peak": peak,
            "recommendation": determine_right_sizing(avg, peak)
        }
    
    return profiles


def determine_right_sizing(avg: dict, peak: dict) -> str:
    """Determine right-sizing recommendation based on utilization."""
    # Logic to recommend instance type based on patterns
    if avg["cpu"] < 0.3 and avg["memory"] < 0.3:
        return "Downsize to smaller instance"
    elif avg["cpu"] > 0.7 or avg["memory"] > 0.7:
        return "Upsize to larger instance"
    elif peak["cpu"] > 0.9 or peak["memory"] > 0.9:
        return "Consider auto-scaling"
    else:
        return "Current sizing appropriate"
```

### Pattern 2: Cost-Performance Modeler

Model cost-performance tradeoffs for different resource configurations:

```python
from dataclasses import dataclass
from typing import List, Callable
from enum import Enum


class InstanceType(Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    XLARGE = "xlarge"


@dataclass
class InstanceConfig:
    instance_type: InstanceType
    cpu: int
    memory_gb: int
    hourly_cost: float
    max_throughput: int  # requests per second


@dataclass
class CostPerformanceModel:
    instance_config: InstanceConfig
    current_load: int  # requests per second
    target_p99_latency_ms: int
    estimated_cost_hourly: float
    estimated_cost_monthly: float
    performance_score: float  # Higher is better
    
    def cost_per_thousand_requests(self) -> float:
        """Calculate cost per 1000 requests."""
        daily_requests = self.current_load * 3600 * 24
        daily_cost = self.estimated_cost_hourly * 24
        return (daily_cost / daily_requests) * 1000


def build_cost_models(
    current_load: int,
    target_latency: int,
    instance_configs: List[InstanceConfig]
) -> List[CostPerformanceModel]:
    """Build cost-performance models for all instance configurations."""
    models = []
    
    for config in instance_configs:
        # Simulate or estimate performance based on load
        performance_score = calculate_performance_score(
            config, current_load, target_latency
        )
        
        # Calculate cost estimates
        hourly_cost = calculate_hourly_cost(config)
        
        models.append(CostPerformanceModel(
            instance_config=config,
            current_load=current_load,
            target_p99_latency_ms=target_latency,
            estimated_cost_hourly=hourly_cost,
            estimated_cost_monthly=hourly_cost * 730,  # Monthly estimate
            performance_score=performance_score
        ))
    
    # Sort by cost-effectiveness (performance per dollar)
    models.sort(key=lambda m: m.performance_score / m.estimated_cost_monthly, reverse=True)
    
    return models


def calculate_performance_score(
    config: InstanceConfig,
    load: int,
    target_latency: int
) -> float:
    """Calculate performance score for configuration."""
    # Calculate if config can meet latency SLA
    can_meet_sla = estimate_latency(config, load) <= target_latency
    
    # Score based on SLA compliance and resource efficiency
    if not can_meet_sla:
        return 0.0
    
    # Efficiency score: lower utilization = more room for growth
    target_cpu = 0.6  # Target 60% utilization
    current_cpu = load / config.max_throughput
    efficiency = 1.0 - abs(current_cpu - target_cpu)
    
    return 100.0 * efficiency
```

### Pattern 3: Optimization Recommendation Engine

Generate specific optimization recommendations:

```python
from dataclasses import dataclass
from typing import List, Dict
from enum import Enum


class RecommendationType(Enum):
    RIGHT_SIZE = "right_size"
    SCALE_OUT = "scale_out"
    SCALE_IN = "scale_in"
    USE_SPOT = "use_spot"
    RESIZE_STORAGE = "resize_storage"
    OPTIMIZE_CONNECTIONS = "optimize_connections"


@dataclass
class OptimizationRecommendation:
    type: RecommendationType
    instance_id: str
    current_value: str
    recommended_value: str
    estimated_savings_monthly: float
    estimated_latency_impact_ms: float
    risk_level: str  # low, medium, high
    justification: str


def generate_recommendations(
    instance_profiles: Dict[str, dict],
    cost_models: List[CostPerformanceModel],
    sla_requirements: dict
) -> List[OptimizationRecommendation]:
    """Generate optimization recommendations."""
    recommendations = []
    
    for instance_id, profile in instance_profiles.items():
        avg = profile["average"]
        recommendation = profile["recommendation"]
        
        if "Downsize" in recommendation:
            rec = OptimizationRecommendation(
                type=RecommendationType.RIGHT_SIZE,
                instance_id=instance_id,
                current_value=f"CPU: {avg['cpu']*100:.1f}%, Memory: {avg['memory']*100:.1f}%",
                recommended_value="Smaller instance type",
                estimated_savings_monthly=150.0,  # Example
                estimated_latency_impact_ms=2.0,
                risk_level="low",
                justification=f"Average CPU utilization is {avg['cpu']*100:.1f}%"
            )
            recommendations.append(rec)
        
        elif "Upsize" in recommendation:
            rec = OptimizationRecommendation(
                type=RecommendationType.SCALE_OUT,
                instance_id=instance_id,
                current_value=f"CPU: {avg['cpu']*100:.1f}%, Memory: {avg['memory']*100:.1f}%",
                recommended_value="Larger instance or scale out",
                estimated_savings_monthly=-50.0,  # Additional cost
                estimated_latency_impact_ms=-20.0,  # Improvement
                risk_level="medium",
                justification=f"High utilization at {avg['cpu']*100:.1f}%"
            )
            recommendations.append(rec)
        
        elif "auto-scaling" in recommendation:
            rec = OptimizationRecommendation(
                type=RecommendationType.SCALE_OUT,
                instance_id=instance_id,
                current_value="Static instance count",
                recommended_value="Auto-scaling policy",
                estimated_savings_monthly=100.0,
                estimated_latency_impact_ms=-15.0,
                risk_level="medium",
                justification="Variable load pattern detected"
            )
            recommendations.append(rec)
    
    # Sort by estimated savings
    recommendations.sort(
        key=lambda r: r.estimated_savings_monthly - abs(r.estimated_latency_impact_ms),
        reverse=True
    )
    
    return recommendations
```

### Pattern 4: Auto-Scaling Policy Generator

Generate auto-scaling policies based on analysis:

```python
from dataclasses import dataclass
from typing import List


@dataclass
class ScalingPolicy:
    instance_id: str
    min_instances: int
    max_instances: int
    target_utilization: float
    scale_up_threshold: float
    scale_down_threshold: float
    cooldown_seconds: int


def generate_scaling_policy(
    instance_id: str,
    usage_patterns: List[ResourceMetrics],
    sla_latency_ms: int
) -> ScalingPolicy:
    """Generate auto-scaling policy based on usage patterns."""
    if not usage_patterns:
        return ScalingPolicy(
            instance_id=instance_id,
            min_instances=1,
            max_instances=4,
            target_utilization=0.6,
            scale_up_threshold=0.7,
            scale_down_threshold=0.3,
            cooldown_seconds=300
        )
    
    # Analyze peak and average utilization
    cpu_values = [m.cpu_utilization for m in usage_patterns]
    avg_util = sum(cpu_values) / len(cpu_values)
    peak_util = max(cpu_values)
    
    # Calculate instance counts needed
    target_instances = max(1, int(1 / (1 - avg_util)))
    max_required = max(1, int(1 / (1 - peak_util)))
    
    return ScalingPolicy(
        instance_id=instance_id,
        min_instances=max(1, target_instances - 1),
        max_instances=max(max_required * 2, 4),  # Safety margin
        target_utilization=0.6,
        scale_up_threshold=0.7,
        scale_down_threshold=0.3,
        cooldown_seconds=300
    )
```

### Pattern 5: Cost Impact Calculator

Calculate cost impact of optimization recommendations:

```python
from dataclasses import dataclass
from typing import List, Dict


@dataclass
class CostImpact:
    current_cost_monthly: float
    optimized_cost_monthly: float
    monthly_savings: float
    annual_savings: float
    payback_period_days: int
    risk_adjusted_savings: float


def calculate_cost_impact(
    current_resources: Dict[str, dict],
    recommended_resources: Dict[str, dict],
    utilization_changes: Dict[str, float]
) -> CostImpact:
    """Calculate cost impact of resource optimization."""
    current_total = sum(r.get("monthly_cost", 0) for r in current_resources.values())
    recommended_total = sum(r.get("monthly_cost", 0) for r in recommended_resources.values())
    
    # Adjust for utilization changes
    adjusted_recommended = recommended_total
    for instance_id, utilization_change in utilization_changes.items():
        if utilization_change < 0:  # Using less
            adjustment = recommended_total * abs(utilization_change) * 0.5
            adjusted_recommended -= adjustment
    
    monthly_savings = current_total - adjusted_recommended
    annual_savings = monthly_savings * 12
    
    # Calculate payback period (considering implementation cost)
    implementation_cost = 1000  # Example
    payback_period_days = int((implementation_cost / monthly_savings) * 30) if monthly_savings > 0 else 0
    
    # Risk adjustment
    risk_factor = 0.9  # 10% risk buffer
    risk_adjusted_savings = monthly_savings * risk_factor
    
    return CostImpact(
        current_cost_monthly=current_total,
        optimized_cost_monthly=adjusted_recommended,
        monthly_savings=monthly_savings,
        annual_savings=annual_savings,
        payback_period_days=payback_period_days,
        risk_adjusted_savings=risk_adjusted_savings
    )
```

---

## Common Patterns

### Pattern 1: Multi-Cluster Optimization

Optimize across multiple clusters:

```python
async def optimize_clusters(
    cluster_configs: List[ClusterConfig]
) -> Dict[str, List[OptimizationRecommendation]]:
    """Optimize resources across multiple clusters."""
    results = {}
    
    # Optimize each cluster
    for config in cluster_configs:
        recommendations = await optimize_cluster(config)
        results[config.cluster_id] = recommendations
    
    # Find cross-cluster optimization opportunities
    cross_cluster = find_cross_cluster_optimizations(results)
    
    return {**results, "cross_cluster": cross_cluster}
```

### Pattern 2: A/B Testing for Optimizations

Test optimizations before full rollout:

```python
async def test_optimization(
    optimization: OptimizationRecommendation,
    test_duration_hours: int = 24,
    traffic_percentage: float = 0.1
) -> OptimizationTestResult:
    """Test optimization with limited traffic."""
    # Route 10% of traffic to optimized configuration
    # Monitor metrics vs. baseline
    # Return test result
    pass
```

### Pattern 3: Cost Dashboard

Create real-time cost optimization dashboard:

```python
def build_cost_dashboard(
    current_costs: dict,
    optimized_costs: dict,
    recommendations: List[OptimizationRecommendation]
) -> dict:
    """Build interactive cost dashboard data."""
    return {
        "current_total": sum(c.get("monthly_cost", 0) for c in current_costs.values()),
        "optimized_total": sum(c.get("monthly_cost", 0) for c in optimized_costs.values()),
        "savings_by_category": categorize_savings(recommendations),
        "top_recommendations": recommendations[:10],
        "timeline": generate_timeline(recommendations)
    }
```

---

## Common Mistakes

### Mistake 1: Ignoring Traffic Patterns

**Wrong:**
```python
# ❌ Using average utilization for right-sizing
avg_utilization = calculate_average utilization()
recommend_right_size(avg_utilization)  # Ignores peaks
```

**Correct:**
```python
# ✅ Consider peak and percentile utilization
avg = profile.average_utilization()
p95 = profile.percentile_utilization(0.95)
p99 = profile.percentile_utilization(0.99)

if p99 > 0.8:
    recommend_upsize()  # Peaks matter for SLAs
```

### Mistake 2: Over-Optimizing Single Resources

**Wrong:**
```python
# ❌ Optimizing CPU without considering memory
if cpu_util < 0.3:
    downsize_cpu()  # Memory might be the bottleneck
```

**Correct:**
```python
# ✅ Consider correlated resources
if cpu_util < 0.3 and memory_util < 0.3:
    downsize_both()  # Both underutilized
elif cpu_util > 0.7:
    upsize_cpu()  # CPU is limiting
elif memory_util > 0.7:
    upsize_memory()  # Memory is limiting
```

### Mistake 3: Not Accounting for Cold Starts

**Wrong:**
```python
# ❌ Scaling to zero for cost savings
if utilization < 0.1:
    scale_to_zero()  # Cold start latency ignored
```

**Correct:**
```python
# ✅ Consider cold start impact
if utilization < 0.1:
    min_instances = calculate_min_for_latency_sla()
    scale_to(min_instances)  # Not zero
```

### Mistake 4: Recommending Optimizations Without Testing

**Wrong:**
```python
# ❌ Applying recommendations immediately
recommendations = generate_recommendations()
apply_recommendations(recommendations)  # No validation
```

**Correct:**
```python
# ✅ Test before applying
recommendations = generate_recommendations()
for rec in recommendations:
    if rec.risk_level == "high":
        test_result = await test_optimization(rec)
        if not test_result.success:
            continue  # Skip failed test
    
    apply_recommendation(rec)  # Apply validated recommendation
```

### Mistake 5: Not Tracking Optimization Impact

**Wrong:**
```python
# ❌ No follow-up on optimizations
apply_recommendations(recommendations)
# Never check if savings materialized
```

**Correct:**
```python
# ✅ Track and validate optimization impact
before_cost = calculate_current_cost()
apply_recommendations(recommendations)

# Monitor for 1 week
for week in range(1, 2):
    after_cost = calculate_current_cost()
    actual_savings = before_cost - after_cost
    
    if abs(actual_savings - expected_savings) > 0.2 * expected_savings:
        alert("Savings variance detected")
```

---

## Adherence Checklist

### Code Review

- [ ] **Guard Clauses:** Input validation for resource metrics
- [ ] **Parsed State:** Raw metrics parsed into typed data structures
- [ ] **Purity:** Optimization functions return recommendations without side effects
- [ ] **Fail Loud:** Invalid configurations throw descriptive errors
- [ ] **Readability:** Recommendations read like optimization guide

### Testing

- [ ] Unit tests for utilization profiling
- [ ] Integration tests for cost modeling
- [ ] Recommendation generation tests
- [ ] Scaling policy tests
- [ ] Cost impact calculation tests

### Security

- [ ] Resource credentials sanitized in logs
- [ ] Cost data access controlled
- [ ] No unauthorized cloud resource modifications
- [ ] Audit trail for all optimizations
- [ ] SLA compliance validation

### Performance

- [ ] Concurrent optimization calculations
- [ ] Efficient data structures for large inventories
- [ ] Cached cost models
- [ ] Incremental optimization updates
- [ ] Memory-efficient streaming for large datasets

---

## References

### Related Skills

| Skill | Purpose |
|-------|---------|
| `autoscaling-advisor` | Auto-scaling policy recommendations |
| `ci-cd-pipeline-analyzer` | Optimize CI/CD resource usage |
| `latency-analyzer` | Ensure SLAs in optimization |
| `resource-optimizer` | Cross-cluster optimization |
| `infra-drift-detector` | Detect optimization drift |

### Core Dependencies

- **Profiler:** Resource utilization profiling
- **Modeler:** Cost-performance modeling
- **Analyzer:** Recommendation generation
- **Optimizer:** Optimization algorithm
- **Reporter:** Optimization dashboard

### External Resources

- [AWS Cost Explorer](https://aws.amazon.com/cost-management/cost-explorer/)
- [Google Cloud Cost Management](https://cloud.google.com/cost-management)
- [Kubernetes Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

---

## Implementation Tracking

### Agent Resource Optimizer - Core Patterns

| Task | Status |
|------|--------|
| Utilization profiler | ✅ Complete |
| Cost-performance model | ✅ Complete |
| Recommendation engine | ✅ Complete |
| Scaling policy generator | ✅ Complete |
| Cost impact calculator | ✅ Complete |
| Multi-cluster optimization | ✅ Complete |
| A/B testing support | ✅ Complete |

---

## Version History

### 1.0.0 (Initial)
- Utilization profiling
- Cost-performance modeling
- Recommendation generation
- Scaling policy generation
- Cost impact calculation

### 1.1.0 (Planned)
- Multi-cloud optimization
- Spot instance optimization
- Reserved instance recommendations
- Savings Plans analysis

### 2.0.0 (Future)
- ML-based optimization
- Predictive scaling
- Automated implementation
- Continuous optimization

---

## Implementation Prompt (Execution Layer)

When implementing the Resource Optimizer skill, use this prompt for code generation:

```
Create a Resource Optimizer implementation following these requirements:

1. Core Classes:
   - ResourceMetrics: Current utilization metrics
   - InstanceProfile: Resource usage profile per instance
   - InstanceConfig: Target configuration
   - CostPerformanceModel: Cost vs performance analysis
   - OptimizationRecommendation: Specific recommendations
   - ScalingPolicy: Auto-scaling configuration
   - CostImpact: Estimated cost savings

2. Key Methods:
   - profile_instances(instances): Generate utilization profiles
   - build_cost_models(load, latency, configs): Cost-performance models
   - generate_recommendations(profiles, models, sla): Optimization recommendations
   - generate_scaling_policy(id, patterns, sla): Auto-scaling policy
   - calculate_cost_impact(current, optimized, changes): Savings analysis
   - optimize_clusters(configs): Multi-cluster optimization
   - build_cost_dashboard(current, optimized, recommendations): Dashboard data

3. Data Structures:
   - ResourceMetrics with CPU/memory/storage/network utilization
   - InstanceProfile with metrics history and recommendations
   - InstanceConfig with type, CPU, memory, cost, throughput
   - CostPerformanceModel with score and cost estimates
   - OptimizationRecommendation with type, impact, risk
   - ScalingPolicy with thresholds and cooldowns

4. Optimization Strategies:
   - Right-sizing: Downsize underutilized resources
   - Scale-out: Add instances during peaks
   - Scale-in: Remove instances during off-peak
   - Spot usage: Use cheaper instances where safe
   - Reserved capacity: Use reserved instances for predictable load

5. Configuration Options:
   - sla_latency_ms: Latency SLA target
   - target_utilization: Optimal utilization percentage
   - max_instances: Maximum instance count
   - cooldown_seconds: Scaling cooldown period
   - traffic_percentage: A/B test traffic percentage

6. Output Features:
   - Right-sizing recommendations
   - Auto-scaling policies
   - Cost impact calculations
   - A/B test recommendations
   - Cost dashboard data

7. Error Handling:
   - Missing metrics fallback
   - Invalid configuration validation
   - Partial failure handling
   - Graceful degradation

Follow the 5 Laws of Elegant Defense:
- Guard clauses for input validation
- Parse raw metrics into typed structures
- Pure optimization functions
- Fail fast on invalid state
- Clear names for all components
```
