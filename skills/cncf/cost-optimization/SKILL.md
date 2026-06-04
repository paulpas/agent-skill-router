---
name: cost-optimization
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements cloud cost optimization strategies (right-sizing, reserved
  instances, spot instances, multi-cloud comparison) for Kubernetes and cloud-native
  deployments.
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: cncf-opencost, disaster-recovery, gcp-cloud-functions, gcp-deployment-manager
  role: implementation
  scope: implementation
  triggers: cost optimization, right sizing, reserved instances, spot instances, multi
    cloud costs, aws cost analysis, azure cost, gcp billing
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  version: 1.0.0
------
# Cloud Cost Optimization

Implements comprehensive cloud cost optimization strategies for Kubernetes clusters and multi-cloud deployments. Provides actionable recommendations for right-sizing, reserved instance procurement, spot instance strategy, and multi-cloud cost comparison.

## When to Use

Use this skill when:

- Planning or executing a cloud cost optimization initiative for Kubernetes deployments
- Evaluating right-sizing opportunities for workloads based on actual resource utilization
- Negotiating reserved instance or savings plan commitments with cloud providers
- Implementing spot instance or preemptible instance strategy for batch workloads
- Comparing costs across AWS, Azure, and GCP for multi-cloud deployment decisions
- Building automated cost optimization pipelines that analyze and apply recommendations

---

## When NOT to Use

Avoid this skill for:

- Initial cloud cost monitoring needs (use `cncf-opencost` instead)
- One-time cost audits without ongoing optimization plans
- Environments with static workloads that don't vary over time
- Organizations without cloud procurement authority for reserved instances
- Scenarios requiring real-time cost data (this skill provides recommendations, not live billing)

---

## Core Workflow

1. **Data Collection and Baseline** — Gather historical cost data and resource utilization metrics. **Checkpoint:** Verify at least 14 days of cost and utilization data before proceeding.

2. **Right-Sizing Analysis** — Analyze CPU and memory utilization to identify over/under-provisioned workloads. **Checkpoint:** Confirm utilization patterns show consistent over-provisioning (avg > 50% headroom) before recommendations.

3. **Reserved Instance Strategy** — Calculate optimal reserved instance coverage based on workload stability and lifecycle. **Checkpoint:** Validate reservation term aligns with workload longevity (12+ months for stable workloads).

4. **Spot Instance Evaluation** — Assess batch, fault-tolerant, and non-critical workloads for spot instance eligibility. **Checkpoint:** Confirm workload can handle interruptions with checkpointing or stateless design.

5. **Multi-Cloud Cost Comparison** — Normalize costs across providers using equivalent resources and pricing models. **Checkpoint:** Verify all providers' pricing data is current and includes all applicable discounts.

6. **Implementation and Validation** — Apply recommendations and measure actual cost savings. **Checkpoint:** Confirm 30-day post-implementation cost variance is within expected range (typically 15-30% reduction).

---

## Implementation Patterns

### Pattern 1: Right-Sizing Recommendation Engine

Analyzes workload resource utilization to calculate optimal CPU and memory requests/limits.

```python
from dataclasses import dataclass
from typing import List, Tuple
from datetime import datetime, timedelta
import numpy as np


@dataclass
class ResourceMetrics:
    """Container for resource utilization metrics."""
    timestamp: datetime
    cpu_utilization: float  # Percentage
    memory_utilization: float  # Percentage
    cpu_request: float  # Cores
    memory_request: float  # GB


@dataclass
class SizingRecommendation:
    """Right-sizing recommendation with savings estimate."""
    current_cpu: float
    current_memory: float
    recommended_cpu: float
    recommended_memory: float
    estimated_monthly_savings: float
    risk_level: str  # "low", "medium", "high"


def calculate_right_sizing(
    metrics: List[ResourceMetrics],
    cloud_price_per_core_hour: float,
    cloud_price_per_gb_hour: float,
    utilization_target: float = 0.70,
    safety_margin: float = 0.20
) -> SizingRecommendation:
    """
    Calculate right-sizing recommendations based on utilization history.
    
    Args:
        metrics: Historical resource utilization data (minimum 14 days recommended)
        cloud_price_per_core_hour: Cost per CPU core per hour
        cloud_price_per_gb_hour: Cost per GB memory per hour
        utilization_target: Target utilization percentage (default 70%)
        safety_margin: Additional buffer percentage (default 20%)
    
    Returns:
        SizingRecommendation with optimal values and estimated savings
    """
    if len(metrics) < 336:  # 14 days * 24 hours
        raise ValueError("Minimum 14 days of hourly metrics required")
    
    # Calculate utilization percentiles
    cpu_utils = [m.cpu_utilization for m in metrics]
    memory_utils = [m.memory_utilization for m in metrics]
    
    cpu_95th = np.percentile(cpu_utils, 95)
    memory_95th = np.percentile(memory_utils, 95)
    
    # Calculate recommended resources with safety margin
    recommended_cpu = (cpu_95th / 100.0) * (1 + safety_margin)
    recommended_memory = (memory_95th / 100.0) * (1 + safety_margin)
    
    # Ensure minimum resources
    recommended_cpu = max(recommended_cpu, 0.1)  # Minimum 100m CPU
    recommended_memory = max(recommended_memory, 0.25)  # Minimum 256MB memory
    
    # Calculate current and recommended costs
    current_cpu_cost = metrics[0].cpu_request * cloud_price_per_core_hour * 730  # Hours/month
    current_memory_cost = metrics[0].memory_request * cloud_price_per_gb_hour * 730
    
    recommended_cpu_cost = recommended_cpu * cloud_price_per_core_hour * 730
    recommended_memory_cost = recommended_memory * cloud_price_per_gb_hour * 730
    
    estimated_savings = (current_cpu_cost + current_memory_cost) - \
                       (recommended_cpu_cost + recommended_memory_cost)
    
    # Determine risk level based on utilization patterns
    cpu_std = np.std(cpu_utils)
    memory_std = np.std(memory_utils)
    
    if cpu_std > 20 or memory_std > 20:
        risk_level = "high"
    elif cpu_std > 10 or memory_std > 10:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    return SizingRecommendation(
        current_cpu=metrics[0].cpu_request,
        current_memory=metrics[0].memory_request,
        recommended_cpu=round(recommended_cpu, 2),
        recommended_memory=round(recommended_memory, 2),
        estimated_monthly_savings=round(estimated_savings, 2),
        risk_level=risk_level
    )


def analyze_deployment_sizing(
    deployment_name: str,
    namespace: str,
    metrics_endpoint: str,
    cloud_prices: dict
) -> dict:
    """
    Analyze a deployment and return right-sizing recommendation.
    
    Args:
        deployment_name: Kubernetes deployment name
        namespace: Deployment namespace
        metrics_endpoint: Prometheus metrics endpoint
        cloud_prices: dict with 'cpu_per_core_hour' and 'memory_per_gb_hour'
    
    Returns:
        Analysis results with recommendation
    """
    import requests
    from datetime import datetime, timedelta
    
    # Fetch metrics from Prometheus
    end_time = datetime.now()
    start_time = end_time - timedelta(days=14)
    
    query = f"""
    avg by (container, pod) (
        rate(container_cpu_usage_seconds_total{{container="{deployment_name}", namespace="{namespace}"}}[5m])
    )
    """
    
    response = requests.get(
        f"{metrics_endpoint}/api/v1/query_range",
        params={
            "query": query,
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "step": "1h"
        }
    )
    
    metrics_data = response.json()
    
    # Parse and convert metrics
    metrics = []
    for point in metrics_data['data']['result'][0]['values']:
        timestamp = datetime.fromtimestamp(point[0])
        cpu_util = float(point[1]) * 100  # Convert to percentage
        metrics.append(ResourceMetrics(
            timestamp=timestamp,
            cpu_utilization=cpu_util,
            memory_utilization=0,  # Would fetch separately
            cpu_request=0.5,  # Current values
            memory_request=1.0
        ))
    
    # Calculate recommendation
    recommendation = calculate_right_sizing(
        metrics=metrics,
        cloud_price_per_core_hour=cloud_prices['cpu_per_core_hour'],
        cloud_price_per_gb_hour=cloud_prices['memory_per_gb_hour']
    )
    
    return {
        "deployment": deployment_name,
        "namespace": namespace,
        "current": {
            "cpu": recommendation.current_cpu,
            "memory": recommendation.current_memory
        },
        "recommended": {
            "cpu": recommendation.recommended_cpu,
            "memory": recommendation.recommended_memory
        },
        "savings": {
            "monthly": recommendation.estimated_monthly_savings,
            "annual": recommendation.estimated_monthly_savings * 12
        },
        "risk": recommendation.risk_level,
        "confidence": "high" if recommendation.risk_level != "high" else "medium"
    }
```

### Pattern 2: Reserved Instance Optimization Calculator

Calculates optimal reserved instance coverage and savings.

```python
from dataclasses import dataclass
from typing import Dict, List
from datetime import datetime
import math


@dataclass
class ReservedInstanceOption:
    """Reserved instance offering option."""
    instance_type: str
    term_years: int
    payment_option: str  # "all_upfront", "partial_upfront", "no_upfront"
    on_demand_rate: float  # Hourly
    reserved_rate: float  # Hourly
    upfront_cost: float
    monthly_savings: float
    break_even_months: int


@dataclass
class WorkloadProfile:
    """Profile of a workload for reserved instance planning."""
    instance_type: str
    hourly_usage_hours: float  # Hours per day
    monthly_days: int = 30
    utilization_class: str  # "standard", "convertible", "partial"


def calculate_reserved_instance_options(
    instance_type: str,
    on_demand_price: float,
    reserved_price: float,
    upfront_cost: float,
    term_years: int = 1
) -> ReservedInstanceOption:
    """
    Calculate reserved instance options and savings.
    
    Args:
        instance_type: EC2 instance type (e.g., "m5.xlarge")
        on_demand_price: On-demand hourly rate
        reserved_price: Reserved instance hourly rate
        upfront_cost: Upfront payment amount
        term_years: Reservation term (1 or 3 years)
    
    Returns:
        ReservedInstanceOption with all calculated values
    """
    term_months = term_years * 12
    hours_in_term = term_months * 30 * 24
    
    # Calculate total costs
    total_on_demand_cost = on_demand_price * hours_in_term
    total_reserved_cost = reserved_price * hours_in_term + upfront_cost
    
    # Calculate savings
    total_savings = total_on_demand_cost - total_reserved_cost
    monthly_savings = total_savings / term_months
    
    # Calculate break-even point
    if upfront_cost > 0:
        break_even_months = upfront_cost / (on_demand_price - reserved_price) / 24 / 30
    else:
        break_even_months = 0
    
    return ReservedInstanceOption(
        instance_type=instance_type,
        term_years=term_years,
        payment_option="all_upfront" if upfront_cost > 0 else "no_upfront",
        on_demand_rate=on_demand_price,
        reserved_rate=reserved_price,
        upfront_cost=upfront_cost,
        monthly_savings=round(monthly_savings, 2),
        break_even_months=round(break_even_months, 1)
    )


def calculate_ri_optimization(
    workload_profiles: List[WorkloadProfile],
    cloud_pricing: Dict[str, dict],
    target_coverage: float = 0.70
) -> dict:
    """
    Calculate optimal reserved instance strategy for multiple workloads.
    
    Args:
        workload_profiles: List of workload profiles to cover
        cloud_pricing: Pricing data per instance type
        target_coverage: Target reserved instance coverage (0-1)
    
    Returns:
        Optimization recommendations with savings
    """
    recommendations = []
    total_on_demand_cost = 0
    total_reserved_cost = 0
    
    for profile in workload_profiles:
        if profile.instance_type not in cloud_pricing:
            continue
        
        pricing = cloud_pricing[profile.instance_type]
        
        # Calculate monthly on-demand cost
        hourly_usage = profile.hourly_usage_hours
        monthly_on_demand = hourly_usage * pricing['on_demand'] * profile.monthly_days
        total_on_demand_cost += monthly_on_demand
        
        # Calculate reserved cost (1-year all-upfront)
        ri_option = calculate_reserved_instance_options(
            instance_type=profile.instance_type,
            on_demand_price=pricing['on_demand'],
            reserved_price=pricing['reserved'],
            upfront_cost=pricing['upfront_1y']
        )
        
        monthly_reserved = hourly_usage * ri_option.reserved_rate * profile.monthly_days
        total_reserved_cost += monthly_reserved
        
        recommendations.append({
            "instance_type": profile.instance_type,
            "hourly_usage": hourly_usage,
            "recommended_ri": ri_option,
            "monthly_on_demand": round(monthly_on_demand, 2),
            "monthly_reserved": round(monthly_reserved, 2)
        })
    
    total_monthly_savings = total_on_demand_cost - total_reserved_cost
    annual_savings = total_monthly_savings * 12
    savings_percentage = (total_monthly_savings / total_on_demand_cost * 100) if total_on_demand_cost > 0 else 0
    
    return {
        "total_workloads": len(workload_profiles),
        "coverage_target": target_coverage,
        "cost_summary": {
            "current_monthly_cost": round(total_on_demand_cost, 2),
            "optimized_monthly_cost": round(total_reserved_cost, 2),
            "monthly_savings": round(total_monthly_savings, 2),
            "annual_savings": round(annual_savings, 2),
            "savings_percentage": round(savings_percentage, 1)
        },
        "recommendations": recommendations
    }
```

### Pattern 3: Spot Instance Strategy Analyzer

Evaluates workloads for spot instance eligibility and calculates potential savings.

```python
from dataclasses import dataclass
from typing import List, Dict
from datetime import datetime, timedelta
import math


@dataclass
class SpotInstanceMetric:
    """Spot instance pricing and availability metrics."""
    timestamp: datetime
    instance_type: str
    spot_price: float
    spot_availability: float  # Percentage of time available
    interruption_rate: float  # Events per 1000 hours


@dataclass
class SpotWorkload:
    """Workload characteristics for spot analysis."""
    name: str
    type: str  # "batch", "stateless", "critical"
    estimated_runtime_hours: float
    interruption_handling: str  # "none", "checkpointing", "retries"
    max_price_multiplier: float  # Multiplier of on-demand price


def evaluate_spot_eligibility(
    workload: SpotWorkload,
    instance_metrics: List[SpotInstanceMetric],
    on_demand_price: float
) -> dict:
    """
    Evaluate if a workload is suitable for spot instances.
    
    Args:
        workload: Workload profile to evaluate
        instance_metrics: Historical spot pricing data
        on_demand_price: Current on-demand price for comparison
    
    Returns:
        Eligibility assessment with risk and savings analysis
    """
    if not instance_metrics:
        raise ValueError("At least 7 days of spot pricing data required")
    
    # Calculate average spot price and availability
    avg_spot_price = sum(m.spot_price for m in instance_metrics) / len(instance_metrics)
    avg_availability = sum(m.spot_availability for m in instance_metrics) / len(instance_metrics)
    avg_interruption = sum(m.interruption_rate for m in instance_metrics) / len(instance_metrics)
    
    # Calculate savings
    spot_price = avg_spot_price * workload.max_price_multiplier
    max_spot_price = on_demand_price * 0.7  # Typical spot discount
    
    if spot_price > on_demand_price:
        return {
            "workload": workload.name,
            "eligible": False,
            "reason": "Spot price exceeds on-demand",
            "savings_percentage": 0
        }
    
    # Calculate savings
    savings_percentage = (on_demand_price - spot_price) / on_demand_price * 100
    
    # Assess interruption risk
    interruption_risk = "low" if avg_availability > 0.95 else "medium" if avg_availability > 0.90 else "high"
    
    # Determine if workload can handle interruptions
    can_handle_interruptions = False
    if workload.interruption_handling == "none":
        can_handle_interruptions = interruption_risk == "low"
    elif workload.interruption_handling == "checkpointing":
        can_handle_interruptions = interruption_risk in ["low", "medium"]
    else:  # retries
        can_handle_interruptions = True
    
    # Calculate expected cost
    estimated_runtime = workload.estimated_runtime_hours
    expected_interruptions = (avg_interruption / 1000) * estimated_runtime
    
    if workload.interruption_handling == "none":
        effective_runtime = estimated_runtime * avg_availability
    elif workload.interruption_handling == "checkpointing":
        effective_runtime = estimated_runtime  # With checkpointing, can recover
    else:
        effective_runtime = estimated_runtime * 1.1  # Add buffer for retries
    
    expected_cost = effective_runtime * spot_price
    
    return {
        "workload": workload.name,
        "eligible": can_handle_interruptions and savings_percentage > 30,
        "reason": "Meets eligibility criteria" if can_handle_interruptions else f"Cannot handle interruption risk ({interruption_risk})",
        "spot_price": round(spot_price, 4),
        "on_demand_price": on_demand_price,
        "savings_percentage": round(savings_percentage, 1),
        "availability": round(avg_availability * 100, 1),
        "interruption_risk": interruption_risk,
        "expected_cost": round(expected_cost, 2),
        "expected_interruptions": round(expected_interruptions, 2)
    }


def calculate_spot_optimization(
    workloads: List[SpotWorkload],
    instance_metrics: Dict[str, List[SpotInstanceMetric]],
    on_demand_pricing: Dict[str, float]
) -> dict:
    """
    Calculate spot instance optimization across multiple workloads.
    
    Args:
        workloads: List of workloads to evaluate
        instance_metrics: Historical metrics per instance type
        on_demand_pricing: On-demand prices per instance type
    
    Returns:
        Overall optimization analysis
    """
    results = []
    total_on_demand_cost = 0
    total_spot_cost = 0
    
    for workload in workloads:
        if workload.type == "critical":
            continue  # Skip critical workloads
        
        metrics = instance_metrics.get(workload.name, [])
        on_demand = on_demand_pricing.get(workload.name, 0)
        
        if not metrics or not on_demand:
            continue
        
        evaluation = evaluate_spot_eligibility(workload, metrics, on_demand)
        
        total_on_demand_cost += workload.estimated_runtime_hours * on_demand
        total_spot_cost += evaluation.get("expected_cost", 0)
        
        results.append(evaluation)
    
    total_savings = total_on_demand_cost - total_spot_cost
    savings_percentage = (total_savings / total_on_demand_cost * 100) if total_on_demand_cost > 0 else 0
    
    eligible_count = sum(1 for r in results if r.get("eligible", False))
    
    return {
        "total_workloads_analyzed": len(workloads),
        "eligible_for_spot": eligible_count,
        "savings_analysis": {
            "current_monthly_cost": round(total_on_demand_cost, 2),
            "optimized_monthly_cost": round(total_spot_cost, 2),
            "monthly_savings": round(total_savings, 2),
            "savings_percentage": round(savings_percentage, 1)
        },
        "workload_results": results
    }
```

### Pattern 4: Multi-Cloud Cost Comparison Tool

Compares equivalent workloads across AWS, Azure, and GCP.

```python
from dataclasses import dataclass
from typing import Dict, List, Optional
from datetime import datetime


@dataclass
class CloudPricing:
    """Pricing for a specific cloud provider."""
    provider: str
    instance_type: str
    cpu_price: float  # Per hour
    memory_price: float  # Per GB-hour
    storage_price: float  # Per GB-month
    network_price: float  # Per GB
    os_license_price: float  # Per hour (Windows, etc.)
    region: str


@dataclass
class WorkloadSpecification:
    """Workload requirements for cost comparison."""
    name: str
    cpu_cores: int
    memory_gb: float
    storage_gb: float
    monthly_storage_io: int  # IO operations
    monthly_egress_gb: float
    uptime_required: float  # Percentage (99.9, 99.99)


def normalize_to_equivalent_resources(
    cpu_cores: int,
    cpu_type: str = "standard"
) -> dict:
    """
    Normalize CPU to equivalent resources across providers.
    
    Args:
        cpu_cores: Number of CPU cores
        cpu_type: Type of CPU ("standard", "compute_optimized", "memory_optimized")
    
    Returns:
        Normalized resource specification
    """
    # AWS: m5.xlarge = 4 vCPUs, 16GB memory
    # Azure: Standard_D4s_v3 = 4 vCPUs, 16GB memory
    # GCP: n1-standard-4 = 4 vCPUs, 15GB memory
    
    cpu_equivalence = {
        "standard": 1.0,
        "compute_optimized": 1.2,
        "memory_optimized": 0.8
    }
    
    return {
        "cpu_cores": cpu_cores,
        "cpu_equivalent": cpu_cores * cpu_equivalence.get(cpu_type, 1.0)
    }


def fetch_cloud_pricing(
    provider: str,
    instance_type: str,
    region: str = "us-east-1"
) -> Optional[CloudPricing]:
    """
    Fetch current pricing from cloud provider API.
    
    Args:
        provider: "aws", "azure", or "gcp"
        instance_type: Instance type to look up
        region: Cloud region
    
    Returns:
        CloudPricing object or None if not found
    """
    # This would call actual cloud provider APIs
    # AWS Pricing API, Azure Resource Provider, GCP Billing API
    
    pricing_data = {
        "aws": {
            "m5.xlarge": {"cpu": 0.17, "memory": 0.0425, "storage": 0.10, "network": 0.09, "os": 0.0},
            "c5.xlarge": {"cpu": 0.192, "memory": 0.048, "storage": 0.10, "network": 0.09, "os": 0.0},
        },
        "azure": {
            "Standard_D4s_v3": {"cpu": 0.192, "memory": 0.048, "storage": 0.10, "network": 0.09, "os": 0.0},
            "Standard_D4_v3": {"cpu": 0.20, "memory": 0.05, "storage": 0.10, "network": 0.09, "os": 0.0},
        },
        "gcp": {
            "n1-standard-4": {"cpu": 0.20, "memory": 0.05, "storage": 0.04, "network": 0.12, "os": 0.0},
        }
    }
    
    if provider not in pricing_data:
        return None
    
    instance_prices = pricing_data[provider].get(instance_type)
    if not instance_prices:
        return None
    
    return CloudPricing(
        provider=provider,
        instance_type=instance_type,
        cpu_price=instance_prices["cpu"],
        memory_price=instance_prices["memory"],
        storage_price=instance_prices["storage"],
        network_price=instance_prices["network"],
        os_license_price=instance_prices["os"],
        region=region
    )


def calculate_workload_cost(
    specification: WorkloadSpecification,
    pricing: CloudPricing
) -> dict:
    """
    Calculate monthly cost for a workload on a specific provider.
    
    Args:
        specification: Workload requirements
        pricing: Cloud provider pricing
    
    Returns:
        Cost breakdown and total
    """
    # Calculate resource costs
    cpu_cost = specification.cpu_cores * pricing.cpu_price * 730  # Hours/month
    memory_cost = specification.memory_gb * pricing.memory_price * 730
    
    # Storage costs
    storage_cost = specification.storage_gb * pricing.storage_price
    
    # Network costs (approximate)
    egress_cost = specification.monthly_egress_gb * pricing.network_price * 0.5  # 50% discount for large volume
    
    # OS license cost (if applicable)
    license_cost = specification.cpu_cores * pricing.os_license_price * 730
    
    # Uptime-based premium (SLA adjustments)
    uptime_premium = 0.0
    if specification.uptime_required > 99.9:
        uptime_premium = 0.10  # 10% premium for 99.99% SLA
    
    total_cost = (cpu_cost + memory_cost + storage_cost + egress_cost + license_cost) * (1 + uptime_premium)
    
    return {
        "provider": pricing.provider,
        "instance_type": pricing.instance_type,
        "region": pricing.region,
        "cost_breakdown": {
            "cpu": round(cpu_cost, 2),
            "memory": round(memory_cost, 2),
            "storage": round(storage_cost, 2),
            "network": round(egress_cost, 2),
            "license": round(license_cost, 2),
            "uptime_premium": round(total_cost - (cpu_cost + memory_cost + storage_cost + egress_cost + license_cost), 2)
        },
        "total_monthly_cost": round(total_cost, 2)
    }


def compare_multi_cloud_costs(
    specification: WorkloadSpecification,
    regions: Dict[str, str]
) -> dict:
    """
    Compare costs across AWS, Azure, and GCP for equivalent workloads.
    
    Args:
        specification: Workload requirements
        regions: Mapping of provider to region (e.g., {"aws": "us-east-1", "azure": "eastus"})
    
    Returns:
        Multi-cloud cost comparison
    """
    providers = {
        "aws": "m5.xlarge",
        "azure": "Standard_D4s_v3",
        "gcp": "n1-standard-4"
    }
    
    results = {}
    for provider, instance_type in providers.items():
        region = regions.get(provider, "us-east-1")
        pricing = fetch_cloud_pricing(provider, instance_type, region)
        
        if pricing:
            cost = calculate_workload_cost(specification, pricing)
            results[provider] = cost
    
    # Find optimal provider
    cheapest_provider = min(results.items(), key=lambda x: x[1]["total_monthly_cost"]) if results else None
    
    # Calculate potential savings
    if cheapest_provider and len(results) > 1:
        all_costs = [r["total_monthly_cost"] for r in results.values()]
        avg_cost = sum(all_costs) / len(all_costs)
        cheapest_cost = cheapest_provider[1]["total_monthly_cost"]
        potential_savings = avg_cost - cheapest_cost
        savings_percentage = (potential_savings / avg_cost * 100) if avg_cost > 0 else 0
        
        comparison = {
            "workload_name": specification.name,
            "workload_spec": {
                "cpu": specification.cpu_cores,
                "memory_gb": specification.memory_gb,
                "storage_gb": specification.storage_gb,
                "uptime_required": specification.uptime_required
            },
            "providers": results,
            "recommendation": {
                "provider": cheapest_provider[0],
                "instance_type": cheapest_provider[1]["instance_type"],
                "region": cheapest_provider[1]["region"],
                "monthly_cost": cheapest_cost
            },
            "comparison_analysis": {
                "cheapest_provider": cheapest_provider[0],
                "cost_range": {
                    "min": min(all_costs),
                    "max": max(all_costs),
                    "avg": round(avg_cost, 2)
                },
                "potential_savings": round(potential_savings, 2),
                "savings_percentage": round(savings_percentage, 1)
            }
        }
        
        return comparison
    
    return {"error": "Could not fetch pricing for all providers", "results": results}


def calculate_aws_cost_explorer_query(
    start_date: str,
    end_date: str,
    granularity: str = "DAILY",
    group_by: List[str] = None
) -> dict:
    """
    Generate AWS Cost Explorer API query for cost analysis.
    
    Args:
        start_date: Start date in ISO format
        end_date: End date in ISO format
        granularity: "DAILY", "WEEKLY", or "MONTHLY"
        group_by: List of dimensions to group by
    
    Returns:
        Cost Explorer API query structure
    """
    if group_by is None:
        group_by = ["SERVICE", "LINKED_ACCOUNT"]
    
    return {
        "TimePeriod": {
            "Start": start_date,
            "End": end_date
        },
        "Granularity": granularity,
        "Metrics": [
            "UNBLENDED_COST",
            "AMORTIZED_COST",
            "USAGE_QUANTITY"
        ],
        "GroupBy": [
            {
                "Type": "DIMENSION",
                "Key": dimension
            } for dimension in group_by
        ],
        "Filter": {
            "Not": {
                "Dimensions": {
                    "Key": "RECORD_TYPE",
                    "Values": ["Credit", "Refund", "Upfront", "Support"]
                }
            }
        }
    }


def calculate_azure_cost_analysis_query(
    scope: str,
    start_date: str,
    end_date: str,
    granularity: str = "Daily"
) -> dict:
    """
    Generate Azure Cost Management query for cost analysis.
    
    Args:
        scope: Resource scope (subscription or resource group)
        start_date: Start date in ISO format
        end_date: End date in ISO format
        granularity: "Daily" or "Monthly"
    
    Returns:
        Azure Cost Management query structure
    """
    return {
        "type": "ActualCost",
        "dataSet": {
            "granularity": granularity,
            "aggregation": {
                "totalCost": {
                    "name": "Cost",
                    "function": "Sum"
                },
                "totalCostUSD": {
                    "name": "CostUSD",
                    "function": "Sum"
                }
            },
            "sorting": [
                {
                    "name": "date",
                    "direction": "asc"
                }
            ]
        },
        "timeframe": "Custom",
        "timePeriod": {
            "from": start_date,
            "to": end_date
        },
        "dataset": {
            "aggregation": {
                "totalCost": {
                    "name": "Cost",
                    "function": "Sum"
                }
            },
            "grouping": [
                {
                    "type": "Dimension",
                    "name": "ResourceGroup"
                },
                {
                    "type": "Dimension",
                    "name": "ServiceName"
                }
            ]
        }
    }


def calculate_gcp_billing_export_query(
    start_date: str,
    end_date: str,
    project_id: str
) -> dict:
    """
    Generate BigQuery query for GCP billing export analysis.
    
    Args:
        start_date: Start date in ISO format
        end_date: End date in ISO format
        project_id: GCP project ID
    
    Returns:
        BigQuery query structure
    """
    return f"""
    #standardSQL
    SELECT
      service.description as service,
      product.description as product,
      usage_start_time,
      usage_cost,
      currency,
      project.id as project_id,
      project.name as project_name,
      labels.key as label_key,
      labels.value as label_value
    FROM
      `billing_dataset.billing_export`
    WHERE
      project.id = '{project_id}'
      AND usage_start_time >= TIMESTAMP('{start_date}')
      AND usage_start_time < TIMESTAMP('{end_date}')
      AND cost > 0
    ORDER BY
      usage_start_time DESC
    LIMIT 10000
    """
```

---

## Constraints

### MUST DO

- Collect at least 14 days of utilization data before making right-sizing recommendations
- Use 95th percentile utilization for sizing calculations to account for outliers
- Layer emergency cost controls (cost limits, alerts) on top of all optimization strategies
- Validate reserved instance break-even period against workload lifetime
- Implement spot instance workloads with checkpointing or retry mechanisms
- Normalize costs using equivalent resources when comparing across cloud providers
- Recalculate optimization recommendations quarterly or after major infrastructure changes

### MUST NOT DO

- Apply right-sizing recommendations without verifying workload SLA requirements
- Commit to reserved instances for workloads with uncertain or changing resource needs
- Use spot instances for stateful, critical workloads without interruption handling
- Make multi-cloud decisions based on initial pricing without considering usage patterns
- Disable or bypass cost optimization controls for "temporary" workarounds
- Ignore network egress costs when comparing cloud providers
- Apply spot instance strategy to workloads with hard real-time requirements

---

## Output Template

When this skill is active, your output must include:

1. **Optimization Recommendation** — Right-sizing, reserved instance, or spot instance recommendation with specific values and savings estimates

2. **Risk Assessment** — Evaluation of implementation risk (low/medium/high) with justification

3. **Implementation Steps** — Clear, actionable steps to deploy the optimization with verification checkpoints

4. **Cost Impact Analysis** — Monthly and annual savings projection with confidence interval

5. **Monitoring Requirements** — Metrics and alerts needed to validate optimization effectiveness

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-opencost` | Real-time Kubernetes cost monitoring and attribution; use this skill first to gather cost data before optimization |
| `cncf-prometheus` | Cost metrics collection and alerting; provides the data source for utilization analysis |
| `coding-terraform` | Infrastructure-as-code implementation of cost optimization recommendations |
| `trading-risk-management` | Similar risk management concepts; applies to cost control and emergency stop mechanisms |

---

## References

- **AWS Cost Explorer Documentation:** [https://docs.aws.amazon.com/cost-management/latest/userguide/ce-overview.html](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-overview.html)
- **Azure Cost Management:** [https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/)
- **GCP Billing Export:** [https://cloud.google.com/billing/docs/how-to/export-data-bigquery](https://cloud.google.com/billing/docs/how-to/export-data-bigquery)
- **OpenCost Project:** [https://opencost.io/](https://opencost.io/)
- **AWS EC2 Pricing Calculator:** [https://calculator.aws/](https://calculator.aws/)
- **Azure Pricing Calculator:** [https://azure.microsoft.com/en-us/pricing/calculator/](https://azure.microsoft.com/en-us/pricing/calculator/)
- **GCP Pricing Calculator:** [https://cloud.google.com/products/calculator/](https://cloud.google.com/products/calculator/)
