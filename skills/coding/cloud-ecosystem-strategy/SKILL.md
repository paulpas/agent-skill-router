---
name: cloud-ecosystem-strategy
description: Strategizes cross-cloud ecosystem navigation (AWS, Azure, GCP) with vendor
  lock-in analysis, interoperability patterns, cost optimization frameworks, and multi-cloud
  architecture decision making.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: cloud ecosystem, aws, azure, gcp, multi-cloud, hybrid cloud, vendor lock-in,
    cloud migration, cross-cloud, how do i choose cloud provider, cloud strategy,
    cloud interoperability, cost optimization, cloud architecture decision
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - config
  - examples
  - do-dont
  related-skills: coding-cloud-native-architecture, coding-platform-engineering, coding-technology-adoption,
    coding-cost-optimization-patterns
------
# Cloud Ecosystem Strategy

Strategizes cross-cloud ecosystem navigation across AWS, Azure, and GCP with vendor lock-in analysis, interoperability patterns, cost optimization frameworks, and multi-cloud architecture decisions. This skill makes the model evaluate cloud provider capabilities, identify cross-cloud equivalencies, design for portability, and create migration strategies that minimize disruption while maximizing the benefits of each provider's unique services.

## TL;DR Checklist

- [ ] Map all application requirements to specific service categories (compute, storage, networking, managed services)
- [ ] Score each cloud provider against requirements using weighted criteria with explicit rationale
- [ ] Identify vendor lock-in risks for every managed service used — prefer open standards where possible
- [ ] Design interoperability boundaries between clouds when using multi-cloud patterns
- [ ] Model cost projections across providers including data transfer egress fees and long-term commitments
- [ ] Create migration runbooks with rollback procedures for cloud transitions

---

## When to Use

Use this skill when:

- Evaluating which cloud provider (AWS, Azure, GCP) or combination best fits your application architecture
- Designing a multi-cloud strategy to avoid vendor lock-in while leveraging each provider's strengths
- Planning a migration from one cloud provider to another, or between on-premises infrastructure and cloud
- Analyzing cost differences between providers for equivalent service configurations
- Troubleshooting cross-cloud connectivity, identity federation, or data synchronization issues
- Building architecture decision records that justify cloud technology choices

---

## When NOT to Use

Avoid this skill for:

- Implementing application business logic — use framework-specific skills instead
- Configuring individual cloud services in detail — use provider-specific skills (e.g., `cncf-kubernetes` for K8s)
- Setting up CI/CD pipelines — use `coding-software-delivery-pipelines` instead
- Creating infrastructure code — use `coding-cloud-native-architecture` for IaC patterns

---

## Core Workflow

### Step 1: Map Requirements to Cloud Service Categories

Translate application requirements into specific cloud service categories. Each requirement maps to one or more AWS, Azure, and GCP services. This creates the foundation for comparison and decision-making.

```python
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Optional


class WorkloadType(StrEnum):
    WEB_APP = "web_app"
    API_SERVICE = "api_service"
    DATA_PIPELINE = "data_pipeline"
    ML_TRAINING = "ml_training"
    BATCH_PROCESSING = "batch_processing"
    IOT_STREAMING = "iot_streaming"
    MICROSERVICES = "microservices"
    SERVERLESS_FUNCTIONS = "serverless_functions"


@dataclass(frozen=True)
class CloudRequirement:
    """A single application requirement mapped to cloud service categories."""

    id: str
    description: str
    workload_type: WorkloadType
    priority: int  # 1-5, 5 is highest
    min_capacity: float  # Minimum required capacity (units vary by category)
    latency_budget_ms: float | None = None
    compliance_requirements: list[str] = field(default_factory=list)
    data_residency: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class CloudServiceMatch:
    """Maps a requirement to equivalent services across cloud providers."""

    requirement_id: str
    aws_service: str
    azure_service: str
    gcp_service: str
    service_category: str  # "compute", "storage", "database", "messaging", "ml", etc.


def map_requirements_to_services(
    requirements: list[CloudRequirement],
) -> dict[str, CloudServiceMatch]:
    """Map each requirement to equivalent services across AWS, Azure, and GCP.

    Returns a dictionary mapping requirement IDs to CloudServiceMatch objects.
    Uses the most widely adopted service in each provider for common patterns.
    """
    service_mapping: dict[WorkloadType, CloudServiceMatch] = {
        WorkloadType.WEB_APP: CloudServiceMatch(
            requirement_id="",
            aws_service="ECS (Fargate) + ALB",
            azure_service="Azure App Service + Application Gateway",
            gcp_service="Cloud Run + Cloud Load Balancing",
            service_category="compute",
        ),
        WorkloadType.API_SERVICE: CloudServiceMatch(
            requirement_id="",
            aws_service="API Gateway + Lambda / ECS",
            azure_service="Azure API Management + Azure Functions",
            gcp_service="Cloud Endpoints + Cloud Run",
            service_category="api_gateway",
        ),
        WorkloadType.DATA_PIPELINE: CloudServiceMatch(
            requirement_id="",
            aws_service="Kinesis + Glue",
            azure_service="Event Hubs + Data Factory",
            gcp_service="Pub/Sub + Dataflow",
            service_category="data_processing",
        ),
        WorkloadType.ML_TRAINING: CloudServiceMatch(
            requirement_id="",
            aws_service="SageMaker Training Jobs",
            azure_service="Azure ML Compute Clusters",
            gcp_service="Vertex AI Training",
            service_category="ml",
        ),
        WorkloadType.BATCH_PROCESSING: CloudServiceMatch(
            requirement_id="",
            aws_service="AWS Batch + ECS",
            azure_service="Azure Batch + AKS",
            gcp_service="Cloud Composer (Airflow)",
            service_category="compute",
        ),
        WorkloadType.IOT_STREAMING: CloudServiceMatch(
            requirement_id="",
            aws_service="IoT Core + Kinesis",
            azure_service="IoT Hub + Stream Analytics",
            gcp_service="IoT Core + Pub/Sub",
            service_category="iot",
        ),
        WorkloadType.MICROSERVICES: CloudServiceMatch(
            requirement_id="",
            aws_service="EKS (Kubernetes) + EFS",
            azure_service="AKS (Kubernetes) + Azure Files",
            gcp_service="GKE (Kubernetes) + Filestore",
            service_category="compute",
        ),
        WorkloadType.SERVERLESS_FUNCTIONS: CloudServiceMatch(
            requirement_id="",
            aws_service="Lambda",
            azure_service="Azure Functions",
            gcp_service="Cloud Functions / Cloud Run Jobs",
            service_category="serverless",
        ),
    }

    result = {}
    for req in requirements:
        match = service_mapping.get(req.workload_type)
        if match:
            updated_match = CloudServiceMatch(
                requirement_id=req.id,
                aws_service=match.aws_service,
                azure_service=match.azure_service,
                gcp_service=match.gcp_service,
                service_category=match.service_category,
            )
            result[req.id] = updated_match

    return result
```

**Checkpoint:** Every requirement must have at least one cloud service match. If a requirement has no equivalent across all three providers, flag it as a potential gap — you may need custom infrastructure or on-premises deployment.

### Step 2: Evaluate Vendor Lock-In Risk

Every managed service creates some degree of vendor lock-in. Quantify this risk for each service used so teams can make informed decisions about where to invest in abstraction layers.

**Vendor lock-in scoring matrix:**

| Dimension | Low Lock-in (1) | Medium Lock-in (3) | High Lock-in (5) |
|-----------|-----------------|-------------------|------------------|
| API openness | Open standards (REST, gRPC) | Partial SDK abstraction | Provider-specific API only |
| Data export | Standard formats (CSV, Parquet) | Provider tools for export | Proprietary format, no export |
| Portability | Containerized / Kubernetes-native | VM-based with image export | Managed service, tied to platform |
| Migration effort | No-code migration tools | Scripted migration possible | Manual rewrite required |

```python
from dataclasses import dataclass
from enum import IntEnum


class LockInSeverity(IntEnum):
    LOW = 1
    MEDIUM = 3
    HIGH = 5


@dataclass(frozen=True)
class VendorLockInAssessment:
    """Assesses vendor lock-in risk for a cloud service usage pattern."""

    service_name: str
    provider: str  # "aws", "azure", "gcp"
    api_openness_score: LockInSeverity
    data_export_score: LockInSeverity
    portability_score: LockInSeverity
    migration_effort_score: LockInSeverity

    @property
    def total_lock_in_score(self) -> int:
        """Sum of all lock-in dimensions. Range: 4-20."""
        return (
            self.api_openness_score +
            self.data_export_score +
            self.portability_score +
            self.migration_effort_score
        )

    @property
    def average_lock_in_score(self) -> float:
        """Average lock-in score per dimension. Range: 1.0-5.0."""
        return self.total_lock_in_score / 4.0

    @property
    def lock_in_level(self) -> str:
        """Human-readable lock-in assessment."""
        avg = self.average_lock_in_score
        if avg <= 2.0:
            return "LOW LOCK-IN — Service is portable and uses open standards"
        if avg <= 3.5:
            return "MODERATE LOCK-IN — Abstraction layer recommended for portability"
        return "HIGH LOCK-IN — Migration would require significant rework; plan carefully"

    @property
    def mitigation_strategy(self) -> str:
        """Recommended strategy to reduce lock-in risk."""
        if self.total_lock_in_score <= 6:
            return "No specific mitigation needed. Monitor for changes."
        if self.total_lock_in_score <= 10:
            return (
                f"Consider abstracting {self.service_name} behind a service interface. "
                "Use infrastructure-as-code to maintain deployment portability."
            )
        return (
            f"HIGH lock-in detected for {self.service_name}. "
            "Evaluate managed alternatives with open standards (e.g., PostgreSQL instead of DynamoDB, "
            "Kubernetes operators instead of provider-specific orchestrators). "
            "Document migration path before deep integration."
        )


# Reference assessments for common services (authoritative as of 2025)
CLOUD_SERVICE_LOCKIN_DATA: dict[str, VendorLockInAssessment] = {
    "AWS Lambda": VendorLockInAssessment(
        service_name="AWS Lambda",
        provider="aws",
        api_openness_score=LockInSeverity.MEDIUM,
        data_export_score=LockInSeverity.LOW,
        portability_score=LockInSeverity.HIGH,
        migration_effort_score=LockInSeverity.HIGH,
    ),
    "Azure Functions": VendorLockInAssessment(
        service_name="Azure Functions",
        provider="azure",
        api_openness_score=LockInSeverity.MEDIUM,
        data_export_score=LockInSeverity.LOW,
        portability_score=LockInSeverity.HIGH,
        migration_effort_score=LockInSeverity.HIGH,
    ),
    "GCP Cloud Functions": VendorLockInAssessment(
        service_name="Cloud Functions",
        provider="gcp",
        api_openness_score=LockInSeverity.MEDIUM,
        data_export_score=LockInSeverity.LOW,
        portability_score=LockInSeverity.HIGH,
        migration_effort_score=LockInSeverity.HIGH,
    ),
    "AWS DynamoDB": VendorLockInAssessment(
        service_name="AWS DynamoDB",
        provider="aws",
        api_openness_score=LockInSeverity.HIGH,
        data_export_score=LockInSeverity.HIGH,
        portability_score=LockInSeverity.HIGH,
        migration_effort_score=LockInSeverity.HIGH,
    ),
    "Azure Cosmos DB": VendorLockInAssessment(
        service_name="Azure Cosmos DB",
        provider="azure",
        api_openness_score=LockInSeverity.HIGH,
        data_export_score=LockInSeverity.MEDIUM,
        portability_score=LockInSeverity.HIGH,
        migration_effort_score=LockInSeverity.HIGH,
    ),
    "GCP Firestore": VendorLockInAssessment(
        service_name="Cloud Firestore",
        provider="gcp",
        api_openness_score=LockInSeverity.HIGH,
        data_export_score=LockInSeverity.MEDIUM,
        portability_score=LockInSeverity.HIGH,
        migration_effort_score=LockInSeverity.HIGH,
    ),
    "AWS S3": VendorLockInAssessment(
        service_name="AWS S3",
        provider="aws",
        api_openness_score=LockInSeverity.LOW,  # S3 API is widely replicated
        data_export_score=LockInSeverity.LOW,   # Standard object formats
        portability_score=LockInSeverity.LOW,    # MinIO/Ceph can emulate
        migration_effort_score=LockInSeverity.LOW,
    ),
    "Azure Blob Storage": VendorLockInAssessment(
        service_name="Azure Blob Storage",
        provider="azure",
        api_openness_score=LockInSeverity.MEDIUM,
        data_export_score=LockInSeverity.LOW,
        portability_score=LockInSeverity.LOW,
        migration_effort_score=LockInSeverity.LOW,
    ),
    "GCP Cloud Storage": VendorLockInAssessment(
        service_name="Cloud Storage",
        provider="gcp",
        api_openness_score=LockInSeverity.MEDIUM,
        data_export_score=LockInSeverity.LOW,
        portability_score=LockInSeverity.LOW,
        migration_effort_score=LockInSeverity.LOW,
    ),
    "AWS RDS": VendorLockInAssessment(
        service_name="AWS RDS",
        provider="aws",
        api_openness_score=LockInSeverity.LOW,  # Standard SQL engine (PostgreSQL, MySQL)
        data_export_score=LockInSeverity.LOW,
        portability_score=LockInSeverity.LOW,   # Standard DB engine = portable
        migration_effort_score=LockInSeverity.MEDIUM,
    ),
}


def assess_service_lock_in(
    service_name: str,
) -> VendorLockInAssessment:
    """Look up lock-in assessment for a known cloud service.

    Returns a pre-assessed VendorLockInAssessment if the service is in our reference data.
    For unknown services, returns a conservative default assessment.
    """
    if service_name in CLOUD_SERVICE_LOCKIN_DATA:
        return CLOUD_SERVICE_LOCKIN_DATA[service_name]
    # Conservative default for unknown services: medium lock-in
    return VendorLockInAssessment(
        service_name=service_name,
        provider="unknown",
        api_openness_score=LockInSeverity.MEDIUM,
        data_export_score=LockInSeverity.MEDIUM,
        portability_score=LockInSeverity.MEDIUM,
        migration_effort_score=LockInSeverity.MEDIUM,
    )
```

**Checkpoint:** Services with HIGH lock-in scores (average > 4.0) must have a documented mitigation strategy or explicit risk acceptance from the architecture review board before production deployment.

### Step 3: Build Weighted Provider Comparison Matrix

Create a quantitative comparison of cloud providers against your requirements to support objective decision-making and architecture documentation.

```python
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ProviderScore:
    """Weighted evaluation score for a single cloud provider."""

    provider: str
    compute_score: float        # 0-100
    storage_score: float        # 0-100
    networking_score: float     # 0-100
    managed_services_score: float  # 0-100
    developer_experience_score: float  # 0-100
    cost_score: float           # 0-100
    compliance_score: float     # 0-100

    @property
    def weighted_total(self) -> float:
        """Calculate weighted total score using standard weights."""
        return (
            self.compute_score * 0.20 +
            self.storage_score * 0.15 +
            self.networking_score * 0.10 +
            self.managed_services_score * 0.15 +
            self.developer_experience_score * 0.15 +
            self.cost_score * 0.15 +
            self.compliance_score * 0.10
        )

    @property
    def rank_label(self) -> str:
        if self.weighted_total >= 80:
            return "STRONG FIT"
        if self.weighted_total >= 60:
            return "MODERATE FIT"
        return "WEAK FIT"


def compare_cloud_providers(
    requirements: list[CloudRequirement],
    service_matches: dict[str, CloudServiceMatch],
    custom_weights: dict[str, float] | None = None,
) -> list[ProviderScore]:
    """Build weighted provider comparison matrix from mapped requirements.

    Args:
        requirements: Application requirements with priorities
        service_matches: Mapped cloud services per requirement
        custom_weights: Optional override for default scoring weights

    Returns:
        List of ProviderScore objects sorted by weighted total (descending).
    """
    # Default category weights
    weights = custom_weights or {
        "compute": 0.25,
        "storage": 0.15,
        "networking": 0.10,
        "api_gateway": 0.10,
        "data_processing": 0.10,
        "ml": 0.05,
        "iot": 0.05,
        "serverless": 0.20,
    }

    # Provider service quality scores (simplified reference as of 2025)
    # In practice, these should be filled in from current benchmarks and team feedback
    provider_quality: dict[str, dict[str, float]] = {
        "aws": {
            "compute": 90, "storage": 95, "networking": 88, "api_gateway": 85,
            "data_processing": 82, "ml": 78, "iot": 75, "serverless": 88,
        },
        "azure": {
            "compute": 85, "storage": 88, "networking": 82, "api_gateway": 90,
            "data_processing": 80, "ml": 75, "iot": 85, "serverless": 82,
        },
        "gcp": {
            "compute": 82, "storage": 90, "networking": 85, "api_gateway": 80,
            "data_processing": 92, "ml": 95, "iot": 80, "serverless": 90,
        },
    }

    # Aggregate scores weighted by requirement priority
    aggregated: dict[str, dict[str, list[float]]] = {
        p: {cat: [] for cat in weights} for p in provider_quality
    }

    for req in requirements:
        match = service_matches.get(req.id)
        if not match:
            continue
        category_scores = provider_quality.get("aws", {})  # Fallback
        category = match.service_category

        for provider in provider_quality:
            quality = provider_quality[provider].get(category, 70)
            aggregated[provider][category].append(quality * req.priority / 5.0)

    # Calculate averages per category per provider
    scores = []
    for provider in ["aws", "azure", "gcp"]:
        cat_scores = {}
        for category, val_list in aggregated[provider].items():
            cat_scores[category] = sum(val_list) / len(val_list) if val_list else 50.0

        scores.append(ProviderScore(
            provider=provider,
            compute_score=cat_scores.get("compute", 70),
            storage_score=cat_scores.get("storage", 70),
            networking_score=cat_scores.get("networking", 70),
            managed_services_score=cat_scores.get("api_gateway", 70),
            developer_experience_score=cat_scores.get("serverless", 70),
            cost_score=cat_scores.get("data_processing", 70),
            compliance_score=cat_scores.get("ml", 70),
        ))

    return sorted(scores, key=lambda s: s.weighted_total, reverse=True)
```

**Checkpoint:** The provider comparison must be reviewed and adjusted by the engineering team — automated scores are a starting point, not a final decision. Include qualitative factors (team familiarity, existing contracts, support quality) in the final assessment.

### Step 4: Design Interoperability Architecture for Multi-Cloud

When using multiple cloud providers, design clear boundaries that define what runs where and how services communicate across providers. This prevents accidental coupling and enables independent scaling.

```python
from dataclasses import dataclass
from enum import StrEnum


class CrossCloudProtocol(StrEnum):
    """Standard protocols for cross-cloud communication."""
    HTTPS = "https"          # REST APIs over TLS (universal)
    GRPC = "grpc"            # gRPC with mTLS
    MESSAGE_QUEUE = "message_queue"  # AMQP, MQTT bridging
    OBJECT_STORAGE_SYNC = "object_storage_sync"  # Bucket replication
    DNS = "dns"              # Cross-cloud DNS routing
    VPN = "vpn"              # Site-to-site VPN / Interconnect


@dataclass(frozen=True)
class CloudBoundary:
    """Defines a boundary between two cloud environments."""

    id: str
    name: str
    source_cloud: str  # "aws", "azure", "gcp", or "on-prem"
    target_cloud: str  # "aws", "azure", "gcp", or "on-prem"
    communication_protocol: CrossCloudProtocol
    data_flow_direction: str  # "bidirectional", "source_to_target", "target_to_source"
    authentication_method: str  # "api_keys", "mutual_tls", "service_mesh", "iam_federation"
    latency_tolerance_ms: float  # Maximum acceptable cross-cloud latency
    data_volume_gb_per_day: float  # Estimated daily data transfer volume


def design_cross_cloud_boundaries(
    architecture: dict,
    target_providers: list[str],
) -> list[CloudBoundary]:
    """Design cloud-to-cloud communication boundaries for a multi-cloud architecture.

    Args:
        architecture: Dict describing the application's service topology
        target_providers: List of cloud providers to deploy across

    Returns:
        List of CloudBoundary definitions with communication specifications.
    """
    # Reference boundary patterns (authoritative as of 2025)
    standard_boundaries = [
        CloudBoundary(
            id="boundary-1",
            name="API Gateway Cross-Cloud Routing",
            source_cloud="aws",
            target_cloud="azure",
            communication_protocol=CrossCloudProtocol.HTTPS,
            data_flow_direction="bidirectional",
            authentication_method="mutual_tls",
            latency_tolerance_ms=50.0,
            data_volume_gb_per_day=10.0,
        ),
        CloudBoundary(
            id="boundary-2",
            name="Object Storage Replication (Analytics)",
            source_cloud="aws",
            target_cloud="gcp",
            communication_protocol=CrossCloudProtocol.OBJECT_STORAGE_SYNC,
            data_flow_direction="source_to_target",
            authentication_method="iam_federation",
            latency_tolerance_ms=3600000.0,  # Near-real-time but not strict
            data_volume_gb_per_day=500.0,
        ),
        CloudBoundary(
            id="boundary-3",
            name="Message Queue Bridge (Event Streaming)",
            source_cloud="azure",
            target_cloud="gcp",
            communication_protocol=CrossCloudProtocol.MESSAGE_QUEUE,
            data_flow_direction="source_to_target",
            authentication_method="service_mesh",
            latency_tolerance_ms=1000.0,
            data_volume_gb_per_day=50.0,
        ),
    ]

    # In a real implementation, boundaries would be derived from the architecture dict
    return standard_boundaries


def assess_boundary_risk(boundary: CloudBoundary) -> dict:
    """Assess risks inherent in a cross-cloud communication boundary."""
    risks = []

    # Latency risk
    if boundary.latency_tolerance_ms < 100 and boundary.communication_protocol != CrossCloudProtocol.VPN:
        risks.append({
            "type": "LATENCY",
            "severity": "HIGH" if boundary.latency_tolerance_ms < 50 else "MEDIUM",
            "description": (
                f"Cross-cloud latency ({boundary.latency_tolerance_ms}ms tolerance) with "
                f"{boundary.communication_protocol.value} protocol may exceed acceptable bounds. "
                "Consider co-locating services or using VPN/interconnect."
            ),
        })

    # Data transfer cost risk
    if boundary.data_volume_gb_per_day > 100:
        daily_cost = boundary.data_volume_gb_per_day * 0.12  # Average $/GB egress
        risks.append({
            "type": "COST",
            "severity": "HIGH" if daily_cost > 50 else "MEDIUM",
            "description": (
                f"High cross-cloud data transfer: {boundary.data_volume_gb_per_day} GB/day. "
                f"Estimated egress cost: ${daily_cost:.2f}/day (${daily_cost * 30:.2f}/month). "
                "Evaluate data deduplication, compression, or reducing transfer volume."
            ),
        })

    # Authentication complexity risk
    if boundary.authentication_method == "api_keys":
        risks.append({
            "type": "SECURITY",
            "severity": "MEDIUM",
            "description": (
                f"Cross-cloud authentication uses API keys ({boundary.id}). "
                "Rotate keys frequently and use short-lived tokens where possible. "
                "Consider migrating to mTLS or service mesh-based auth."
            ),
        })

    return {
        "boundary": boundary.name,
        "total_risks": len(risks),
        "risks": risks,
        "recommendations": [r["description"] for r in risks],
    }
```

**Checkpoint:** Every cross-cloud boundary must have documented risk assessments and approved mitigation strategies. Boundaries without assessed risks block production deployment.

### Step 5: Model Cost Projections and Optimization

Build detailed cost projections across cloud providers, including hidden costs like data egress, cross-region replication, and long-term commitment discounts.

```python
from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class CloudCostProjection:
    """Detailed cost projection for a single month of cloud operations."""

    provider: str
    compute_cost_usd: float
    storage_cost_usd: float
    networking_cost_usd: float  # Includes egress, cross-region, and interconnect costs
    managed_service_cost_usd: float
    support_plan_cost_usd: float
    reserved_instance_discount_usd: float = 0.0

    @property
    def gross_cost_usd(self) -> float:
        return (
            self.compute_cost_usd +
            self.storage_cost_usd +
            self.networking_cost_usd +
            self.managed_service_cost_usd +
            self.support_plan_cost_usd
        )

    @property
    def net_cost_usd(self) -> float:
        return self.gross_cost_usd - self.reserved_instance_discount_usd

    @property
    def egress_percentage_of_total(self) -> float:
        """What percentage of gross costs is network egress (a key optimization target)."""
        if self.gross_cost_usd <= 0:
            return 0.0
        return (self.networking_cost_usd / self.gross_cost_usd) * 100


def project_monthly_costs(
    resource_utilization: dict[str, float],  # hours_per_month per resource type
    provider_rates: dict[str, float],  # $/hour per resource type
    monthly_egress_gb: float = 0.0,
    egress_rate_per_gb: float = 0.09,  # Average AWS/GCP/Azure egress rate
) -> CloudCostProjection:
    """Calculate projected monthly cloud costs from resource utilization and rates.

    Args:
        resource_utilization: Dict mapping resource type names to monthly hours used (max 730)
        provider_rates: Dict mapping resource type names to $/hour rates
        monthly_egress_gb: Estimated outbound data transfer per month in GB
        egress_rate_per_gb: Cost per GB of egress traffic

    Returns:
        CloudCostProjection with detailed cost breakdown.
    """
    compute_cost = sum(
        utilization * provider_rates.get(resource_type, 0)
        for resource_type, utilization in resource_utilization.items()
    )

    storage_cost = resource_utilization.get("storage_tier_standard", 0) * 0.023  # $/GB/month standard
    networking_cost = monthly_egress_gb * egress_rate_per_gb + \
        resource_utilization.get("cross_region_traffic_gb", 0) * (egress_rate_per_gb * 0.5)

    return CloudCostProjection(
        provider="multi-cloud_average",
        compute_cost_usd=round(compute_cost, 2),
        storage_cost_usd=round(storage_cost, 2),
        networking_cost_usd=round(networking_cost, 2),
        managed_service_cost_usd=round((compute_cost + storage_cost) * 0.10, 2),  # ~10% overhead estimate
        support_plan_cost_usd=round(compute_cost * 0.05, 2),  # ~5% support plan estimate
    )


def calculate_reserved_instance_savings(
    on_demand_monthly_cost: float,
    reservation_term_months: int = 12,
    discount_rate: float = 0.30,  # Typical 30% for 1-year RI
) -> dict:
    """Calculate savings from reserved instance commitments vs on-demand pricing."""
    monthly_on_demand = on_demand_monthly_cost
    monthly_reserved = monthly_on_demand * (1 - discount_rate)
    total_savings_12m = (monthly_on_demand - monthly_reserved) * reservation_term_months

    return {
        "monthly_on_demand": round(monthly_on_demand, 2),
        "monthly_reserved": round(monthly_reserved, 2),
        "monthly_savings": round(monthly_on_demand - monthly_reserved, 2),
        "term_months": reservation_term_months,
        "total_savings": round(total_savings_12m, 2),
        "break_even_months": int(1 / discount_rate) if discount_rate > 0 else float('inf'),
        "risk_assessment": (
            f"At {reservation_term_months}-month commitment, you commit to ${monthly_reserved:.2f}/month. "
            "Only reserve instances for workloads with predictable, steady-state usage patterns."
        ),
    }
```

**Checkpoint:** Always include data transfer egress costs in your projections — these are the most commonly underestimated cost driver in multi-cloud architectures and can exceed compute costs by 3-5x in data-intensive applications.

---

## Implementation Patterns

### Pattern 1: Cloud Provider Decision Framework

A structured decision framework for choosing between cloud providers or designing multi-cloud strategies.

```python
def evaluate_cloud_strategy(
    application_requirements: list[CloudRequirement],
    service_matches: dict[str, CloudServiceMatch],
    team_expertise: dict[str, float],  # provider -> proficiency score (0-5)
    existing_investments: list[str],   # Already invested services/resources per provider
) -> dict:
    """Evaluate cloud strategy using weighted multi-factor analysis.

    This function implements the decision framework described in Step 2 and Step 3,
    augmented with team expertise and existing investment considerations.
    """
    provider_scores = compare_cloud_providers(
        application_requirements, service_matches
    )

    # Apply team expertise modifier (familiarity can offset raw capability gaps)
    for score in provider_scores:
        expertise = team_expertise.get(score.provider, 2.5)  # Default: moderate familiarity
        expertise_modifier = expertise / 5.0  # Normalize to 0-1
        score.weighted_total = round(
            score.weighted_total * 0.7 +  # Base score (70%)
            score.developer_experience_score * 0.3 * expertise_modifier,  # Expertise factor (30%)
            2,
        )

    provider_scores.sort(key=lambda s: s.weighted_total, reverse=True)

    # Calculate lock-in risks for top recommendations
    lock_in_risks = {}
    for req in application_requirements:
        match = service_matches.get(req.id)
        if match:
            lock_in_risks[req.id] = {
                "aws": assess_service_lock_in(match.aws_service),
                "azure": assess_service_lock_in(match.azure_service),
                "gcp": assess_service_lock_in(match.gcp_service),
            }

    return {
        "ranked_providers": [
            {"provider": s.provider, "score": s.weighted_total, "level": s.rank_label}
            for s in provider_scores
        ],
        "lock_in_assessments": lock_in_risks,
        "team_expertise_adjustment": team_expertise,
        "existing_investments": existing_investments,
    }
```

### Pattern 2: Migration Runbook Generator

Generate a structured migration runbook for moving between cloud providers.

```python
def generate_migration_runbook(
    source_provider: str,
    target_provider: str,
    services_to_migrate: list[str],
    timeline_days: int = 90,
) -> str:
    """Generate a structured migration runbook for cross-cloud service migration.

    Args:
        source_provider: Current cloud provider ("aws", "azure", or "gcp")
        target_provider: Destination cloud provider ("aws", "azure", or "gcp")
        services_to_migrate: List of service names to migrate
        timeline_days: Total project timeline in days

    Returns:
        Formatted migration runbook as a string.
    """
    phases = [
        {
            "name": "Discovery & Assessment",
            "duration_days": int(timeline_days * 0.15),
            "tasks": [
                f"Audit all services on {source_provider} — inventory resources, dependencies, data volumes",
                "Map source services to equivalent target provider services",
                "Assess vendor lock-in for each service using assess_service_lock_in()",
                "Estimate migration effort and identify high-risk services",
            ],
        },
        {
            "name": "Proof of Concept",
            "duration_days": int(timeline_days * 0.2),
            "tasks": [
                "Deploy lowest-risk service to target provider as a proof of concept",
                "Validate functional parity (API endpoints, data consistency, performance)",
                "Measure cross-cloud latency and egress costs during dual-run period",
                "Document lessons learned and update migration plan accordingly",
            ],
        },
        {
            "name": "Data Migration",
            "duration_days": int(timeline_days * 0.35),
            "tasks": [
                "Implement initial full data sync from source to target",
                "Enable change-data-capture for ongoing replication",
                "Validate data integrity using checksums and sample comparisons",
                "Run production traffic in shadow mode (copy requests, don't execute)",
            ],
        },
        {
            "name": "Traffic Cutover",
            "duration_days": int(timeline_days * 0.2),
            "tasks": [
                "Gradually shift DNS traffic from source to target (1% → 10% → 50% → 100%)",
                "Monitor error rates, latency, and resource utilization on both sides",
                "Have rollback procedure ready: restore DNS to source provider",
                "Verify all integrations work correctly with target services",
            ],
        },
        {
            "name": "Decommission & Optimization",
            "duration_days": int(timeline_days * 0.1),
            "tasks": [
                "Monitor target provider for 30 days post-migration",
                "Optimize resource sizing based on actual performance data",
                "Purchase reserved instances if usage patterns are stable",
                "Decommission source provider resources and close accounts",
            ],
        },
    ]

    lines = [f"# Migration Runbook: {source_provider} → {target_provider}\n"]
    lines.append(f"Services to migrate: {', '.join(services_to_migrate)}\n")

    for phase in phases:
        lines.append(f"## Phase: {phase['name']} ({phase['duration_days']} days)")
        for i, task in enumerate(phase["tasks"], 1):
            lines.append(f"{i}. {task}")
        lines.append("")

    return "\n".join(lines)
```

---

## Constraints

### MUST DO
- Always assess vendor lock-in risk before committing to any provider-specific managed service — use `assess_service_lock_in()` for every service
- Include data egress costs in all cost projections — egress is the most commonly underestimated cost driver and can exceed compute by 3-5x in data-intensive workloads
- Design cross-cloud boundaries with explicit authentication methods, latency tolerances, and data volume estimates before deploying inter-cloud communication
- Use open standards (REST, gRPC, Kubernetes, PostgreSQL) where possible to maintain portability across cloud providers
- Create migration runbooks with rollback procedures BEFORE starting any cloud transition — never migrate without a tested rollback plan
- Document team expertise levels per provider — technical capability alone does not determine the right choice; team familiarity significantly impacts delivery speed and error rates

### MUST NOT DO
- Do not use provider-specific managed databases (DynamoDB, Cosmos DB, Firestore) in multi-cloud architectures — these create irreversible lock-in and make cross-cloud data sharing extremely difficult
- Do not design multi-cloud architectures without accounting for inter-region latency — services in different clouds communicate at internet speeds, not intra-region LAN speeds
- Do not commit to reserved instance purchases before running the workload for at least 30 days — usage patterns change and wrong commitments waste money
- Do not assume feature parity between providers — each provider's equivalent service may have different capabilities, limitations, or performance characteristics that matter for your workload
- Do not ignore compliance requirements when choosing cloud regions — data residency laws (GDPR, HIPAA, CCPA) restrict where customer data can be stored and processed
- Do not use the cheapest provider as the sole selection criterion — factor in developer productivity, support quality, and ecosystem maturity alongside raw pricing

---

## Output Template

When applying this skill, produce:

1. **Requirements-to-Services Mapping** — Table mapping each application requirement to AWS, Azure, and GCP service equivalents
2. **Vendor Lock-In Assessment** — Per-service lock-in scores with mitigation strategies for HIGH-risk services
3. **Provider Comparison Matrix** — Weighted provider scores with breakdown by category (compute, storage, networking, etc.)
4. **Cross-Cloud Boundary Design** — Architecture diagram description with communication protocols, authentication methods, and risk assessments for each boundary
5. **Cost Projection Report** — Monthly cost breakdown per provider including egress costs, reserved instance analysis, and optimization recommendations
6. **Migration Runbook** (if applicable) — Phased migration plan with tasks, timelines, success criteria, and rollback procedures

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-cloud-native-architecture` | Design Kubernetes-native cloud architectures that work across providers — complements this skill's provider-specific analysis |
| `coding-platform-engineering` | Build internal developer platforms that abstract cloud provider differences from application teams |
| `coding-technology-adoption` | Evaluate individual cloud services for adoption — this skill focuses on strategic multi-provider decisions |
| `coding-cost-optimization-patterns` | Deep-dive into cost optimization techniques across all cloud providers |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references.

- [AWS Architecture Center](https://aws.amazon.com/architecture/)
- [Azure Architecture Center](https://learn.microsoft.com/azure/architecture/)
- [Google Cloud Architecture Framework](https://cloud.google.com/architecture/framework)
- [CNCF Multi-Cloud Landscape](https://landscape.cncf.io/guide#multi-cloud)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Azure Well-Architacked Framework](https://learn.microsoft.com/azure/well-architected/)
- [Google Cloud Well-Architacted Framework](https://cloud.google.com/architecture/framework/well-architected)
