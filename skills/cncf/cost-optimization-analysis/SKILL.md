---
name: cost-optimization-analysis
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Cloud cost optimization analysis including AWS Cost Explorer, Azure Cost
  Management, and GCP Billing with right-sizing recommendations and optimization strategies
  for multi-cloud environments
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: agent-database-admin, cncf-cost-optimization, cncf-kubernetes-debugging
  role: implementation
  scope: implementation
  triggers: aws cost explorer, azure cost analysis, gcp billing, cloud cost optimization,
    right-sizing recommendations, spot instance strategy, reserved instance optimization,
    cost allocation
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
version: "1.0.0"
---
# Cloud Cost Optimization Analysis

Implements comprehensive multi-cloud cost optimization strategies including AWS Cost Explorer analysis, Azure Cost Management analysis, GCP Billing analysis, right-sizing recommendations, spot instance optimization, reserved instance planning, and cost allocation frameworks. This skill enables data-driven decisions to reduce cloud infrastructure costs while maintaining performance and reliability.

## TL;DR Checklist

- [ ] Collect and normalize cost data from all cloud providers using their respective APIs and CLI tools
- [ ] Identify idle and underutilized resources (right-sizing candidates)
- [ ] Analyze spot instance eligibility and implement spot placement strategies
- [ ] Plan reserved instance purchases based on historical usage patterns
- [ ] Implement cost allocation tagging and chargeback models
- [ ] Set up automated alerts for budget thresholds and anomalies
- [ ] Optimize storage tiers based on access patterns
- [ ] Document optimization recommendations and track ROI

---

## When to Use

Use this skill when:

- Conducting a cloud cost optimization audit across AWS, Azure, and GCP environments
- Identifying idle or underutilized resources for right-sizing decisions
- Planning spot instance adoption to reduce compute costs by 50-90%
- Evaluating reserved instance or savings plan eligibility based on usage patterns
- Implementing cost allocation frameworks for chargeback/showback models
- Investigating unexpected cost spikes and anomalies in cloud billing
- Designing multi-cloud cost optimization strategies with unified visibility
- Reviewing storage tier assignments and lifecycle policies

---

## When NOT to Use

Avoid this skill for:

- **Real-time cost monitoring** — Use dedicated cost monitoring tools like Datadog Cloud Cost Management or AWS Cost and Usage Report (CUR) for real-time dashboards instead
- **Budget approval workflows** — This skill provides analysis and recommendations but not the budget approval process; use financial governance tools for approvals
- **Contract negotiation** — While this skill identifies optimization opportunities, actual vendor contract negotiation requires procurement expertise
- **Infrastructure design** — Use `cncf-infrastructure-as-code` for designing new infrastructure; cost optimization should follow design completion
- **Security compliance** — Cost optimization may impact security configurations; always validate against security requirements using `cncf-security-compliance` skill
- **Emergency cost reduction** — For immediate budget cuts, use emergency kill-switches rather than optimization workflows; this skill is for strategic, sustainable savings

---

## Core Workflow

1. **Data Collection** — Gather cost data from AWS Cost Explorer, Azure Cost Management, and GCP Billing APIs. **Checkpoint:** Verify all cost data is normalized to a common currency (USD) and time period.

2. **Resource Discovery** — Identify all resources (EC2, Azure VMs, GCP Compute Engine) with usage and cost data. **Checkpoint:** Ensure resource IDs are standardized across providers for multi-cloud correlation.

3. **Idle Resource Analysis** — Analyze CPU, memory, network, and storage utilization metrics to identify underutilized resources. **Checkpoint:** Confirm utilization data covers at least 14 days to account for weekly patterns.

4. **Right-Sizing Recommendations** — Generate right-sizing recommendations based on utilization thresholds (e.g., CPU < 30% for 2 weeks). **Checkpoint:** Validate recommendations against application SLAs and performance requirements.

5. **Spot Instance Strategy** — Evaluate workload characteristics for spot instance eligibility (fault-tolerant, stateless, interruptible workloads). **Checkpoint:** Confirm spot instance savings projections account for interruption rates and replacement costs.

6. **Cost Allocation Framework** — Implement tagging strategy and cost allocation models for chargeback/showback. **Checkpoint:** Ensure all resources have required cost allocation tags (owner, project, environment, cost-center).

---

## Implementation Patterns

### Pattern 1: AWS Cost Explorer Analysis

AWS Cost Explorer provides detailed cost and usage data. Use the AWS CLI to analyze costs by service, tag, and time period.

**BAD — Hardcoded date range without error handling**
```bash
# ❌ BAD — No error checking, hardcoded dates, no output formatting
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-02-01 \
  --granularity DAILY \
  --metrics UnblendedCost \
  --group-by Type=DIMENSION Key=SERVICE
```

**GOOD — Robust script with error handling and formatting**
```bash
#!/bin/bash
# ✅ GOOD — Proper error handling, dynamic dates, JSON output
set -euo pipefail

START_DATE="${START_DATE:-$(date -d '1 month ago' +%Y-%m-%d)}"
END_DATE="${END_DATE:-$(date +%Y-%m-%d)}"

aws ce get-cost-and-usage \
  --time-period "Start=${START_DATE},End=${END_DATE}" \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --group-by "Type=DIMENSION,Key=SERVICE" \
  --query 'ResultsByTime[].Total[].UnblendedCost Amount' \
  --output text | awk '{sum += $1} END {printf "Total Monthly Cost: $%.2f\n", sum}'
```

**Python SDK Alternative**
```python
# ✅ GOOD — Python SDK with proper pagination
import boto3
from datetime import datetime, timedelta

def get_aws_cost_by_service(days: int = 30) -> dict:
    """Get AWS cost breakdown by service for the specified number of days."""
    client = boto3.client('ce', region_name='us-east-1')
    
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    
    response = client.get_cost_and_usage(
        TimePeriod={
            'Start': start_date.isoformat(),
            'End': end_date.isoformat()
        },
        Granularity='MONTHLY',
        Metrics=['UnblendedCost'],
        GroupBy=[{'Type': 'DIMENSION', 'Key': 'SERVICE'}]
    )
    
    return {
        'service_costs': {
            group['Keys'][0]: float(result['Total']['UnblendedCost']['Amount'])
            for result in response['ResultsByTime'][-1]['Groups']
            for group in result['Groups']
        },
        'total_cost': float(response['ResultsByTime'][-1]['Total']['UnblendedCost']['Amount'])
    }

# Usage example
costs = get_aws_cost_by_service(days=30)
for service, cost in costs['service_costs'].items():
    print(f"{service}: ${cost:.2f}")
print(f"Total: ${costs['total_cost']:.2f}")
```

---

### Pattern 2: Azure Cost Management Analysis

Azure Cost Management provides detailed cost data through the Azure CLI and REST API.

**BAD — Direct API call without authentication**
```bash
# ❌ BAD — Missing authentication, no pagination handling
curl https://management.azure.com/subscriptions/{subscriptionId}/providers/Microsoft.CostManagement/query?api-version=2022-10-01
```

**GOOD — Azure CLI with proper authentication and formatting**
```bash
#!/bin/bash
# ✅ GOOD — Azure CLI with authentication, filtering, and formatting
set -euo pipefail

# Login if not already authenticated
az account show >/dev/null 2>&1 || az login

SUBSCRIPTION_ID=$(az account show --query id -o tsv)
START_DATE="2024-01-01"
END_DATE="2024-12-31"

# Query cost data by resource group
az costmanagement query \
  --type "Usage" \
  --timeframe "MonthToDate" \
  --dataset-aggregation '{"totalCost":{"name":"PreTaxCost","function":"Sum"}}' \
  --dataset-grouping '{"name":"ResourceGroup","type":"Dimension"}' \
  --subscription "$SUBSCRIPTION_ID" \
  --query "properties.rows[]" \
  --output tsv
```

**ARM Template Cost Analysis**
```bash
# ✅ GOOD — Estimate costs from ARM template deployments
az deployment sub what-if \
  --template-file "arm-template.json" \
  --parameters "parameters.json" \
  --location "eastus" \
  --query "properties.cost" \
  --output table
```

**Python SDK for Azure Cost Analysis**
```python
# ✅ GOOD — Azure Cost Management SDK with proper error handling
from azure.identity import DefaultAzureCredential
from azure.mgmt.costmanagement import CostManagementClient
from datetime import datetime, timedelta

def get_azure_cost_by_resource_group(days: int = 30) -> dict:
    """Get Azure cost breakdown by resource group."""
    subscription_id = os.getenv("AZURE_SUBSCRIPTION_ID")
    if not subscription_id:
        raise ValueError("AZURE_SUBSCRIPTION_ID environment variable not set")
    
    credential = DefaultAzureCredential()
    client = CostManagementClient(credential, subscription_id)
    
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=days)
    
    body = {
        "type": "Usage",
        "timeframe": "Custom",
        "time_period": {
            "from": start_date.isoformat(),
            "to": end_date.isoformat()
        },
        "dataset": {
            "granularity": "Daily",
            "grouping": [{"type": "Dimension", "name": "ResourceGroup"}]
        }
    }
    
    try:
        result = client.query.usage(scope=f"subscriptions/{subscription_id}", parameters=body)
        
        return {
            "resource_group_costs": {
                item.name: item.properties.total_cost
                for item in result.properties.rows
            },
            "total_cost": sum(item.properties.total_cost for item in result.properties.rows)
        }
    except Exception as e:
        print(f"Error fetching Azure costs: {e}")
        return {}

# Usage
costs = get_azure_cost_by_resource_group(days=30)
print(f"Total Azure Cost: ${costs.get('total_cost', 0):.2f}")
```

---

### Pattern 3: GCP Billing Analysis

Google Cloud Billing provides cost data through the Cloud Billing API and gcloud CLI.

**BAD — Simple API call without error handling**
```bash
# ❌ BAD — No error handling, missing authentication
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://billingaccount.googleapis.com/v1/billingAccounts"
```

**GOOD — GCP CLI with proper authentication and cost analysis**
```bash
#!/bin/bash
# ✅ GOOD — GCP CLI with authentication and cost analysis
set -euo pipefail

gcloud auth print-access-token >/dev/null 2>&1 || gcloud auth login

BILLING_ACCOUNT=$(gcloud billing accounts list --format="value(name)" | head -1)

# Get costs by project for the last 30 days
gcloud billing budgets describe \
  --billing-account="$BILLING_ACCOUNT" \
  --format="value(name)" 2>/dev/null || true

# Alternative: Use Cloud Billing Export to BigQuery for detailed analysis
gcloud bigquery queries run \
  "SELECT 
    project.name as project_name,
    service.description as service,
    SUM(cost) as total_cost
  FROM 
    \`\${BILLING_ACCOUNT}.billing_data.gcp_billing_export_v1_012345\`
  WHERE 
    _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  GROUP BY 
    project.name, service.description
  ORDER BY 
    total_cost DESC
  LIMIT 20" \
  --format="table"
```

**Python SDK for GCP Cost Analysis**
```python
# ✅ GOOD — GCP Billing SDK with proper error handling and pagination
from google.cloud import billing_v1
from google.api_core.exceptions import GoogleAPICallError
from datetime import datetime, timedelta
import os

def get_gcp_cost_by_project(days: int = 30) -> dict:
    """Get GCP cost breakdown by project."""
    billing_account_id = os.getenv("GCP_BILLING_ACCOUNT_ID")
    if not billing_account_id:
        raise ValueError("GCP_BILLING_ACCOUNT_ID environment variable not set")
    
    client = billing_v1.CloudBillingClient()
    
    # Get billing account name
    billing_account_name = f"billingAccounts/{billing_account_id}"
    
    # Get cost data from BigQuery export (recommended approach)
    # This assumes Cloud Billing Export is configured to BigQuery
    bigquery_client = bigquery.Client()
    
    query = f"""
    SELECT 
      project.name as project_name,
      service.description as service,
      SUM(cost) as total_cost,
      COUNT(DISTINCT sku.id) as sku_count
    FROM 
      `{billing_account_id}.billing_data.gcp_billing_export_v1_012345`
    WHERE 
      _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
    GROUP BY 
      project.name, service.description
    ORDER BY 
      total_cost DESC
    """
    
    try:
        query_job = bigquery_client.query(query)
        results = query_job.result()
        
        project_costs = {}
        for row in results:
            if row.project_name not in project_costs:
                project_costs[row.project_name] = 0.0
            project_costs[row.project_name] += row.total_cost
        
        return {
            "project_costs": project_costs,
            "total_cost": sum(project_costs.values()),
            "services": list(set(row.service for row in results))
        }
    except GoogleAPICallError as e:
        print(f"GCP API Error: {e}")
        return {}
    except Exception as e:
        print(f"Error fetching GCP costs: {e}")
        return {}

# Usage
os.environ["GCP_BILLING_ACCOUNT_ID"] = "012345-567890-ABCDEF"
costs = get_gcp_cost_by_project(days=30)
print(f"Total GCP Cost: ${costs.get('total_cost', 0):.2f}")
```

---

### Pattern 4: Right-Sizing Recommendations

Right-sizing analysis identifies resources that are over-provisioned or under-provisioned.

**BAD — Simple threshold without context**
```bash
# ❌ BAD — No context, no history, no action plan
for instance in $(aws ec2 describe-instances --query 'Reservations[].Instances[].InstanceId' --output text); do
  cpu=$(aws cloudwatch get-metric-statistics --metric-name CPUUtilization --dimensions InstanceId=$instance --start-time 2024-01-01 --end-time 2024-01-02 --period 86400 --statistics Average --query 'Datapoints[].Average' --output text)
  echo "$instance CPU: $cpu"
done
```

**GOOD — Comprehensive right-sizing analysis script**
```bash
#!/bin/bash
# ✅ GOOD — Comprehensive right-sizing with historical analysis and recommendations
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
DAYS_ANALYZED="${DAYS_ANALYZED:-14}"
CPU_THRESHOLD_LOW=30
CPU_THRESHOLD_HIGH=80

echo "=== Right-Sizing Analysis ==="
echo "Region: $REGION"
echo "Analysis Period: $DAYS_ANALYZED days"
echo "Low CPU Threshold: ${CPU_THRESHOLD_LOW}%"
echo "High CPU Threshold: ${CPU_THRESHOLD_HIGH}%"
echo ""

# Get all running instances
instances=$(aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].{InstanceId:InstanceId,InstanceType:InstanceType,Tags:Tags}' \
  --region "$REGION" \
  --output json)

# Analyze each instance
echo "$instances" | jq -c '.Reservations[].Instances[]' | while read -r instance; do
  instance_id=$(echo "$instance" | jq -r '.InstanceId')
  current_type=$(echo "$instance" | jq -r '.InstanceType')
  
  # Get CPU utilization data
  cpu_avg=$(aws cloudwatch get-metric-statistics \
    --metric-name CPUUtilization \
    --dimensions Name=InstanceId,Value=$instance_id \
    --start-time $(date -d "$DAYS_ANALYZED days ago" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date +%Y-%m-%dT%H:%M:%S) \
    --period 86400 \
    --statistics Average \
    --output json | jq -r '.Datapoints[].Average' | awk '{sum+=$1} END {printf "%.1f", sum/NR}')
  
  # Get memory utilization (requires CloudWatch Agent)
  memory_avg=$(aws cloudwatch get-metric-statistics \
    --metric-name MemoryUtilization \
    --namespace AWS/ECS \
    --dimensions Name=ClusterName,Value=default Name=ServiceName,Value=none \
    --start-time $(date -d "$DAYS_ANALYZED days ago" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date +%Y-%m-%dT%H:%M:%S) \
    --period 86400 \
    --statistics Average \
    --output json 2>/dev/null | jq -r '.Datapoints[].Average' | awk '{sum+=$1} END {printf "%.1f", sum/NR}' || echo "N/A")
  
  # Generate recommendation
  if [[ "$cpu_avg" != "N/A" ]]; then
    if (( $(echo "$cpu_avg < $CPU_THRESHOLD_LOW" | bc -l) )); then
      recommendation="DOWNSIZE"
      suggested_type="t3.medium"  # Example suggestion
    elif (( $(echo "$cpu_avg > $CPU_THRESHOLD_HIGH" | bc -l) )); then
      recommendation="UPSIZE"
      suggested_type="m5.large"  # Example suggestion
    else
      recommendation="OPTIMAL"
      suggested_type="$current_type"
    fi
  else
    recommendation="INSUFFICIENT_DATA"
    suggested_type="$current_type"
  fi
  
  echo "$instance_id | $current_type | CPU: ${cpu_avg}% | Mem: ${memory_avg}% | Recommendation: $recommendation (→ $suggested_type)"
done
```

**Python Right-Sizing Engine**
```python
# ✅ GOOD — Python right-sizing engine with historical analysis
import boto3
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import statistics

class RightSizingAnalyzer:
    """Analyzes EC2 instances for right-sizing opportunities."""
    
    def __init__(self, region: str = "us-east-1"):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.ssm = boto3.client('ssm', region_name=region)
        
        # Instance type hierarchy for right-sizing decisions
        self.instance_hierarchy = {
            't2': ['t3', 't4g'],
            't3': ['t2', 't4g'],
            'm5': ['m4', 'm6g'],
            'c5': ['c4', 'c6g'],
            'r5': ['r4', 'r6g'],
        }
        
        self.thresholds = {
            'cpu_low': 30,
            'cpu_high': 80,
            'memory_low': 40,
            'memory_high': 85,
            'days': 14,
        }
    
    def get_instance_metrics(self, instance_id: str, days: int = 14) -> Dict[str, float]:
        """Get CPU and memory metrics for an instance."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        # Get CPU utilization
        cpu_stats = self.cloudwatch.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName='CPUUtilization',
            Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
            StartTime=start_time,
            EndTime=end_time,
            Period=86400,
            Statistics=['Average'],
            Unit='Percent'
        )
        
        cpu_values = [dp['Average'] for dp in cpu_stats.get('Datapoints', [])]
        cpu_avg = statistics.mean(cpu_values) if cpu_values else None
        
        # Get memory utilization (requires CloudWatch Agent)
        try:
            memory_stats = self.cloudwatch.get_metric_statistics(
                Namespace='CWAgent',
                MetricName='memory_utilization',
                Dimensions=[
                    {'Name': 'InstanceId', 'Value': instance_id},
                    {'Name': 'InstanceType', 'Value': 'ec2'}
                ],
                StartTime=start_time,
                EndTime=end_time,
                Period=86400,
                Statistics=['Average'],
                Unit='Percent'
            )
            memory_values = [dp['Average'] for dp in memory_stats.get('Datapoints', [])]
            memory_avg = statistics.mean(memory_values) if memory_values else None
        except Exception:
            memory_avg = None
        
        return {
            'cpu_avg': round(cpu_avg, 2) if cpu_avg else None,
            'memory_avg': round(memory_avg, 2) if memory_avg else None,
            'cpu_data_points': len(cpu_values),
            'memory_data_points': len(memory_values) if memory_avg else 0,
        }
    
    def suggest_right_size(self, instance_type: str, metrics: Dict[str, float]) -> Tuple[str, str]:
        """Suggest a right-sized instance type based on metrics."""
        cpu = metrics.get('cpu_avg')
        memory = metrics.get('memory_avg')
        
        # If insufficient data, return original type
        if not cpu and not memory:
            return instance_type, "INSUFFICIENT_DATA"
        
        # If high CPU, consider up-sizing
        if cpu and cpu > self.thresholds['cpu_high']:
            return self._upsize(instance_type), "HIGH_CPU"
        
        # If low CPU, consider down-sizing
        if cpu and cpu < self.thresholds['cpu_low']:
            return self._downsize(instance_type), "LOW_CPU"
        
        # If high memory, consider memory-optimized
        if memory and memory > self.thresholds['memory_high']:
            return self._memory_optimize(instance_type), "HIGH_MEMORY"
        
        # If low memory, consider general-purpose
        if memory and memory < self.thresholds['memory_low']:
            return self._general_purpose(instance_type), "LOW_MEMORY"
        
        return instance_type, "OPTIMAL"
    
    def _downsize(self, instance_type: str) -> str:
        """Downsize instance type if possible."""
        base_type = next((k for k in self.instance_hierarchy.keys() if instance_type.startswith(k)), None)
        if base_type:
            smaller_types = self.instance_hierarchy[base_type]
            if smaller_types:
                return f"{smaller_types[0]}.large"
        return instance_type
    
    def _upsize(self, instance_type: str) -> str:
        """Upsize instance type if needed."""
        base_type = next((k for k in self.instance_hierarchy.keys() if instance_type.startswith(k)), None)
        if base_type:
            larger_types = [t for t in self.instance_hierarchy.get(base_type, []) if t != instance_type]
            if larger_types:
                return f"{larger_types[0]}.xlarge"
        return instance_type
    
    def _memory_optimize(self, instance_type: str) -> str:
        """Suggest memory-optimized instance type."""
        if instance_type.startswith('t'):
            return 'r5.large'
        elif instance_type.startswith('m'):
            return 'r5.xlarge'
        return f"r{instance_type[1:]}" if instance_type[1] != 'r' else instance_type
    
    def _general_purpose(self, instance_type: str) -> str:
        """Suggest general-purpose instance type."""
        if instance_type.startswith('r'):
            return 'm5.large'
        elif instance_type.startswith('c'):
            return 't3.large'
        return f"m{instance_type[1:]}" if instance_type[1] != 'm' else instance_type
    
    def analyze_instance(self, instance_id: str) -> Dict:
        """Analyze a single instance for right-sizing."""
        # Get instance details
        response = self.ec2.describe_instances(InstanceIds=[instance_id])
        instance = response['Reservations'][0]['Instances'][0]
        instance_type = instance['InstanceType']
        
        # Get metrics
        metrics = self.get_instance_metrics(instance_id, self.thresholds['days'])
        
        # Suggest right size
        suggested_type, reason = self.suggest_right_size(instance_type, metrics)
        
        return {
            'instance_id': instance_id,
            'current_type': instance_type,
            'suggested_type': suggested_type,
            'reason': reason,
            'metrics': metrics,
            'potential_savings': self._estimate_savings(instance_type, suggested_type),
        }
    
    def _estimate_savings(self, current_type: str, suggested_type: str) -> float:
        """Estimate potential monthly savings from right-sizing."""
        # Simplified pricing model (replace with actual pricing data)
        pricing = {
            't3.large': 0.0832,
            't3.xlarge': 0.1664,
            't3.2xlarge': 0.3328,
            'm5.large': 0.096,
            'm5.xlarge': 0.192,
            'm5.2xlarge': 0.384,
            'r5.large': 0.126,
            'r5.xlarge': 0.252,
            'r5.2xlarge': 0.504,
        }
        
        current_price = pricing.get(current_type, 0.1)
        suggested_price = pricing.get(suggested_type, 0.1)
        
        monthly_usage_hours = 730  # Average hours per month
        monthly_savings = (current_price - suggested_price) * monthly_usage_hours
        
        return round(max(0, monthly_savings), 2)
    
    def analyze_all_instances(self) -> List[Dict]:
        """Analyze all instances in the region."""
        instances = self.ec2.describe_instances(
            Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
        )
        
        results = []
        for reservation in instances['Reservations']:
            for instance in reservation['Instances']:
                result = self.analyze_instance(instance['InstanceId'])
                results.append(result)
        
        return results

# Usage example
if __name__ == "__main__":
    analyzer = RightSizingAnalyzer(region="us-east-1")
    results = analyzer.analyze_all_instances()
    
    print("Right-Sizing Analysis Results:")
    print("-" * 80)
    
    total_monthly_savings = 0
    for result in results:
        if result['reason'] != 'OPTIMAL':
            print(f"Instance: {result['instance_id']}")
            print(f"  Current: {result['current_type']}")
            print(f"  Suggested: {result['suggested_type']} ({result['reason']})")
            print(f"  Monthly Savings: ${result['potential_savings']}")
            print()
            total_monthly_savings += result['potential_savings']
    
    print(f"Total Potential Monthly Savings: ${total_monthly_savings:.2f}")
```

---

### Pattern 5: Spot Instance Strategy

Spot instance optimization reduces compute costs by up to 90% for fault-tolerant workloads.

**BAD — Simple spot request without termination handling**
```bash
# ❌ BAD — No termination handling, no replacement strategy
aws ec2 request-spot-instances \
  --spot-price "0.05" \
  --instance-count 1 \
  --type "one-time" \
  --launch-specification file://launch-spec.json
```

**GOOD — Comprehensive spot instance management script**
```bash
#!/bin/bash
# ✅ GOOD — Spot instance with termination handling, replacement strategy, and scaling
set -euo pipefail

SPOT_PRICE="${SPOT_PRICE:-0.05}"
INSTANCE_TYPE="${INSTANCE_TYPE:-c5.large}"
REGION="${AWS_REGION:-us-east-1}"
MIN_INSTANCES="${MIN_INSTANCES:-2}"
MAX_INSTANCES="${MAX_INSTANCES:-10}"

# Spot request with replacement strategy
create_spot_fleet() {
  local fleet_config=$(cat <<EOF
{
  "IamFleetRole": "arn:aws:iam::123456789012:role/spot-fleet-role",
  "TargetCapacity": $MIN_INSTANCES,
  "SpotPrice": "$SPOT_PRICE",
  "AllocationStrategy": "lowestPrice",
  "LaunchSpecifications": [
    {
      "ImageId": "ami-0123456789abcdef0",
      "InstanceType": "$INSTANCE_TYPE",
      "KeyName": "my-key",
      "SubnetId": "subnet-0123456789abcdef0",
      "IamInstanceProfile": {
        "Arn": "arn:aws:iam::123456789012:instance-profile/spot-instance-profile"
      },
      "SpotPrice": "$SPOT_PRICE"
    }
  ],
  "TerminateInstancesWithExpiration": true,
  "ReplaceUnhealthyInstances": true
}
EOF
)
  
  aws ec2 request-spot-fleet \
    --spot-fleet-request-data "$fleet_config" \
    --region "$REGION"
}

# Check spot instance health
check_spot_health() {
  local fleet_id="$1"
  
  # Get spot instance requests
  aws ec2 describe-spot-instance-requests \
    --filters "Name=spot-fleet-request-id,Values=$fleet_id" \
    --query 'SpotInstanceRequests[].{InstanceId:InstanceId,State:State,Status:Status}' \
    --output table
  
  # Check for terminations
  aws ec2 describe-spot-instance-requests \
    --filters "Name=spot-fleet-request-id,Values=$fleet_id" \
    --query 'SpotInstanceRequests[?State==`closed`]' \
    --output text
}

# Scale spot fleet based on demand
scale_spot_fleet() {
  local fleet_id="$1"
  local new_capacity="$2"
  
  aws ec2 modify-spot-fleet-request \
    --spot-fleet-request-id "$fleet_id" \
    --target-capacity "$new_capacity" \
    --terminate-instances-with-expiration
}

# Main execution
case "${1:-create}" in
  create)
    echo "Creating spot fleet with $MIN_INSTANCES instances at $SPOT_PRICE"
    create_spot_fleet
    ;;
  check)
    check_spot_health "$2"
    ;;
  scale)
    scale_spot_fleet "$2" "$3"
    ;;
  *)
    echo "Usage: $0 {create|check|scale}"
    exit 1
    ;;
esac
```

**Python Spot Instance Optimizer**
```python
# ✅ GOOD — Python spot instance optimizer with termination handling
import boto3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import statistics
import time

class SpotInstanceOptimizer:
    """Optimizes spot instance usage for cost savings."""
    
    def __init__(self, region: str = "us-east-1"):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        
        self.spot_pricing_history = {}
        self.recommendation_cache = {}
    
    def get_spot_price_history(self, instance_types: List[str], days: int = 7) -> Dict[str, List[float]]:
        """Get historical spot prices for given instance types."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        prices = {}
        
        for instance_type in instance_types:
            try:
                response = self.ec2.describe_spot_price_history(
                    InstanceTypes=[instance_type],
                    StartTime=start_time,
                    EndTime=end_time,
                    MaxResults=1000
                )
                
                price_list = [float(dp['SpotPrice']) for dp in response['SpotPriceHistory']]
                prices[instance_type] = price_list
                
                # Cache the data
                self.spot_pricing_history[instance_type] = {
                    'prices': price_list,
                    'avg': statistics.mean(price_list) if price_list else 0,
                    'min': min(price_list) if price_list else 0,
                    'max': max(price_list) if price_list else 0,
                    'std': statistics.stdev(price_list) if len(price_list) > 1 else 0,
                }
            except Exception as e:
                print(f"Error fetching spot price history for {instance_type}: {e}")
        
        return prices
    
    def recommend_spot_instance(self, instance_type: str, current_on_demand_price: float) -> Dict:
        """Recommend whether to use spot for given instance type."""
        history = self.spot_pricing_history.get(instance_type, {})
        
        if not history:
            return {
                'instance_type': instance_type,
                'recommendation': 'UNKNOWN',
                'reason': 'Insufficient historical data',
            }
        
        avg_price = history['avg']
        min_price = history['min']
        max_price = history['max']
        std = history['std']
        
        # Calculate savings
        savings_percentage = ((current_on_demand_price - avg_price) / current_on_demand_price) * 100
        
        # Determine recommendation
        if savings_percentage > 50 and std < 0.05:
            recommendation = 'STRONG_RECOMMENDATION'
            reason = f'High savings ({savings_percentage:.1f}%) with low volatility'
        elif savings_percentage > 30:
            recommendation = 'RECOMMENDATION'
            reason = f'Moderate savings ({savings_percentage:.1f}%)'
        elif savings_percentage > 10:
            recommendation = 'CONSIDER'
            reason = f'Some savings ({savings_percentage:.1f}%), monitor volatility'
        else:
            recommendation = 'NOT_RECOMMENDED'
            reason = f'Low savings ({savings_percentage:.1f}%)'
        
        return {
            'instance_type': instance_type,
            'recommendation': recommendation,
            'reason': reason,
            'spot_avg_price': round(avg_price, 4),
            'spot_min_price': round(min_price, 4),
            'spot_max_price': round(max_price, 4),
            'on_demand_price': current_on_demand_price,
            'savings_percentage': round(savings_percentage, 1),
            'price_volatility': round(std, 4),
        }
    
    def check_spot_capacity(self, instance_types: List[str], availability_zone: str) -> Dict[str, bool]:
        """Check spot capacity availability."""
        capacity = {}
        
        for instance_type in instance_types:
            try:
                response = self.ec2.describe_spot_instance_requests(
                    InstanceTypes=[instance_type],
                    AvailabilityZone=availability_zone,
                    MaxResults=1
                )
                capacity[instance_type] = True
            except Exception:
                capacity[instance_type] = False
        
        return capacity
    
    def estimate_savings(self, instance_type: str, hours_per_month: int = 730) -> Dict:
        """Estimate monthly savings from spot instances."""
        history = self.spot_pricing_history.get(instance_type, {})
        
        if not history:
            return {'error': 'No historical data available'}
        
        avg_spot_price = history['avg']
        
        # Get on-demand price (simplified - use actual pricing API in production)
        on_demand_prices = {
            'c5.large': 0.17,
            'c5.xlarge': 0.34,
            'c5.2xlarge': 0.68,
            'm5.large': 0.096,
            'm5.xlarge': 0.192,
            'r5.large': 0.126,
            'r5.xlarge': 0.252,
        }
        
        on_demand_price = on_demand_prices.get(instance_type, avg_spot_price * 2)
        
        on_demand_cost = on_demand_price * hours_per_month
        spot_cost = avg_spot_price * hours_per_month
        savings = on_demand_cost - spot_cost
        savings_percentage = (savings / on_demand_cost) * 100
        
        return {
            'instance_type': instance_type,
            'on_demand_cost': round(on_demand_cost, 2),
            'spot_cost': round(spot_cost, 2),
            'monthly_savings': round(savings, 2),
            'savings_percentage': round(savings_percentage, 1),
            'break_even_price': round(spot_cost / hours_per_month, 4),
        }
    
    def get_all_recommendations(self) -> List[Dict]:
        """Get recommendations for all common instance types."""
        instance_types = ['c5.large', 'c5.xlarge', 'c5.2xlarge', 'm5.large', 'm5.xlarge', 'r5.large', 'r5.xlarge']
        on_demand_prices = {
            'c5.large': 0.17, 'c5.xlarge': 0.34, 'c5.2xlarge': 0.68,
            'm5.large': 0.096, 'm5.xlarge': 0.192,
            'r5.large': 0.126, 'r5.xlarge': 0.252,
        }
        
        self.get_spot_price_history(instance_types)
        
        recommendations = []
        for instance_type in instance_types:
            recommendation = self.recommend_spot_instance(
                instance_type, 
                on_demand_prices.get(instance_type, 0)
            )
            savings = self.estimate_savings(instance_type)
            recommendation.update(savings)
            recommendations.append(recommendation)
        
        return recommendations

# Usage example
if __name__ == "__main__":
    optimizer = SpotInstanceOptimizer(region="us-east-1")
    recommendations = optimizer.get_all_recommendations()
    
    print("Spot Instance Optimization Recommendations")
    print("=" * 80)
    
    total_monthly_savings = 0
    
    for rec in recommendations:
        if rec['recommendation'] in ['STRONG_RECOMMENDATION', 'RECOMMENDATION']:
            print(f"\nInstance: {rec['instance_type']}")
            print(f"  Recommendation: {rec['recommendation']}")
            print(f"  Reason: {rec['reason']}")
            print(f"  On-demand: ${rec['on_demand_price']}/hr")
            print(f"  Spot avg: ${rec['spot_avg_price']}/hr")
            print(f"  Monthly Savings: ${rec['monthly_savings']}")
            
            total_monthly_savings += rec['monthly_savings']
    
    print(f"\n" + "=" * 80)
    print(f"Total Potential Monthly Savings: ${total_monthly_savings:.2f}")
```

---

### Pattern 6: Reserved Instance Optimization

Reserved instance optimization analyzes usage patterns to recommend RI purchases.

**BAD — Manual analysis without historical data**
```bash
# ❌ BAD — No historical analysis, no ROI calculation
# Just buying RIs without data-driven decisions
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id "ri-offering-123" \
  --instance-count 5
```

**GOOD — Data-driven RI optimization script**
```bash
#!/bin/bash
# ✅ GOOD — Historical analysis with ROI calculation
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
ANALYSIS_DAYS="${ANALYSIS_DAYS:-90}"

# Get historical instance usage
get_instance_usage() {
  local instance_type="$1"
  
  # Get average CPU utilization over analysis period
  aws cloudwatch get-metric-statistics \
    --metric-name CPUUtilization \
    --dimensions Name=InstanceId,Value=unknown \
    --namespace AWS/EC2 \
    --start-time $(date -d "$ANALYSIS_DAYS days ago" +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date +%Y-%m-%dT%H:%M:%S) \
    --period 86400 \
    --statistics Average \
    --query 'Datapoints[].Average' \
    --output text | awk '{sum+=$1; count++} END {printf "%.1f", sum/count}'
}

# Calculate RI ROI
calculate_ri_roi() {
  local on_demand_hourly="$1"
  local ri_upfront="$2"
  local ri_annual="$3"
  local usage_hours="$4"
  
  # Calculate total cost with on-demand
  local on_demand_total=$(echo "$on_demand_hourly * $usage_hours" | bc -l)
  
  # Calculate total cost with RI (upfront + annual)
  local ri_total=$(echo "$ri_upfront + $ri_annual" | bc -l)
  
  # Calculate savings
  local savings=$(echo "$on_demand_total - $ri_total" | bc -l)
  local savings_percentage=$(echo "($savings / $on_demand_total) * 100" | bc -l)
  
  echo "On-Demand Total: \$$on_demand_total"
  echo "RI Total: \$$ri_total"
  echo "Savings: \$$savings ($savings_percentage%)"
}

# Analyze instance usage and recommend RIs
analyze_ri_opportunity() {
  local instance_type="$1"
  local current_count="$2"
  
  echo "=== Reserved Instance Analysis ==="
  echo "Instance Type: $instance_type"
  echo "Current Count: $current_count"
  echo "Analysis Period: $ANALYSIS_DAYS days"
  echo ""
  
  # Get on-demand pricing
  local on_demand_price=$(aws ec2 describe-spot-price-history \
    --instance-types "$instance_type" \
    --product-description "Linux/UNIX" \
    --query 'SpotPriceHistory[0].SpotPrice' \
    --output text)
  
  # Get RI pricing (simplified - use actual RI pricing API)
  local ri_pricing={
    "c5.large": {"upfront": 450, "annual": 600, "hourly": 0.17},
    "c5.xlarge": {"upfront": 900, "annual": 1200, "hourly": 0.34},
    "m5.large": {"upfront": 300, "annual": 400, "hourly": 0.096},
    "m5.xlarge": {"upfront": 600, "annual": 800, "hourly": 0.192},
  }
  
  if [[ -v ri_pricing["$instance_type"] ]]; then
    local upfront="${ri_pricing[$instance_type, upfront]}"
    local annual="${ri_pricing[$instance_type, annual]}"
    local hourly="${ri_pricing[$instance_type, hourly]}"
    
    # Assume 24/7 usage
    local usage_hours=$((ANALYSIS_DAYS * 24))
    
    echo "Pricing:"
    echo "  On-Demand: \$${hourly}/hour"
    echo "  RI Upfront: \$${upfront}"
    echo "  RI Annual: \$${annual}"
    echo ""
    
    echo "Projected Usage: $usage_hours hours"
    echo ""
    
    calculate_ri_roi "$hourly" "$upfront" "$annual" "$usage_hours"
  else
    echo "RI pricing not available for $instance_type"
  fi
}

# Main execution
instance_type="${1:-c5.large}"
count="${2:-5}"

analyze_ri_opportunity "$instance_type" "$count"
```

**Python RI Optimizer**
```python
# ✅ GOOD — Python RI optimizer with ROI calculations
import boto3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import statistics

@dataclass
class InstanceUsage:
    instance_id: str
    instance_type: str
    avg_cpu: float
    hours_used: int
    days_used: int

@dataclass
class RIRecommendation:
    instance_type: str
    recommended_count: int
    upfront_cost: float
    annual_cost: float
    on_demand_cost: float
    roi_percentage: float
    break_even_months: float
    recommendation: str

class ReservedInstanceOptimizer:
    """Optimizes reserved instance purchases for cost savings."""
    
    def __init__(self, region: str = "us-east-1"):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.pricing = boto3.client('pricing', region_name='us-east-1')
        
        # Simplified RI pricing (replace with actual AWS Pricing API in production)
        self.ri_pricing = {
            'c5.large': {'upfront': 450, 'annual': 600, 'hourly': 0.17},
            'c5.xlarge': {'upfront': 900, 'annual': 1200, 'hourly': 0.34},
            'c5.2xlarge': {'upfront': 1800, 'annual': 2400, 'hourly': 0.68},
            'm5.large': {'upfront': 300, 'annual': 400, 'hourly': 0.096},
            'm5.xlarge': {'upfront': 600, 'annual': 800, 'hourly': 0.192},
            'm5.2xlarge': {'upfront': 1200, 'annual': 1600, 'hourly': 0.384},
            'r5.large': {'upfront': 400, 'annual': 550, 'hourly': 0.126},
            'r5.xlarge': {'upfront': 800, 'annual': 1100, 'hourly': 0.252},
        }
        
        self.usage_analysis = {}
    
    def get_instance_usage(self, instance_id: str, days: int = 90) -> Optional[InstanceUsage]:
        """Get historical usage data for an instance."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        try:
            # Get CPU utilization data
            response = self.cloudwatch.get_metric_statistics(
                Namespace='AWS/EC2',
                MetricName='CPUUtilization',
                Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
                StartTime=start_time,
                EndTime=end_time,
                Period=86400,
                Statistics=['Average'],
                Unit='Percent'
            )
            
            datapoints = response.get('Datapoints', [])
            if not datapoints:
                return None
            
            avg_cpu = statistics.mean([dp['Average'] for dp in datapoints])
            
            # Calculate hours used (assume running 24/7)
            hours_used = days * 24
            
            return InstanceUsage(
                instance_id=instance_id,
                instance_type='UNKNOWN',  # Get this from describe_instances
                avg_cpu=round(avg_cpu, 2),
                hours_used=hours_used,
                days_used=days,
            )
        except Exception as e:
            print(f"Error getting usage for {instance_id}: {e}")
            return None
    
    def analyze_all_instances(self, days: int = 90) -> List[InstanceUsage]:
        """Analyze usage for all running instances."""
        # Get all running instances
        response = self.ec2.describe_instances(
            Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
        )
        
        usages = []
        for reservation in response['Reservations']:
            for instance in reservation['Instances']:
                instance_type = instance['InstanceType']
                instance_id = instance['InstanceId']
                
                usage = self.get_instance_usage(instance_id, days)
                if usage:
                    usage.instance_type = instance_type
                    usages.append(usage)
                
                # Add instance type to analysis
                if instance_type not in self.usage_analysis:
                    self.usage_analysis[instance_type] = {
                        'count': 0,
                        'total_hours': 0,
                        'avg_cpu': [],
                    }
                
                self.usage_analysis[instance_type]['count'] += 1
                self.usage_analysis[instance_type]['total_hours'] += usage.hours_used
                self.usage_analysis[instance_type]['avg_cpu'].append(usage.avg_cpu)
        
        return usages
    
    def calculate_ri_roi(self, instance_type: str, count: int, days: int = 365) -> RIRecommendation:
        """Calculate ROI for reserved instances."""
        pricing = self.ri_pricing.get(instance_type)
        if not pricing:
            return RIRecommendation(
                instance_type=instance_type,
                recommended_count=count,
                upfront_cost=0,
                annual_cost=0,
                on_demand_cost=0,
                roi_percentage=0,
                break_even_months=0,
                recommendation='NO_DATA',
            )
        
        hourly_price = pricing['hourly']
        upfront = pricing['upfront'] * count
        annual = pricing['annual'] * count
        
        # Calculate on-demand cost for the period
        usage = self.usage_analysis.get(instance_type, {})
        total_hours = usage.get('total_hours', days * 24 * count)
        
        on_demand_cost = hourly_price * total_hours
        
        # Calculate savings
        ri_total = upfront + annual
        savings = on_demand_cost - ri_total
        roi_percentage = (savings / on_demand_cost) * 100 if on_demand_cost > 0 else 0
        
        # Calculate break-even point
        monthly_ri_cost = annual / 12
        monthly_on_demand_cost = hourly_price * (days * 24 * count) / 12
        break_even_months = upfront / (monthly_on_demand_cost - monthly_ri_cost) if (monthly_on_demand_cost - monthly_ri_cost) > 0 else float('inf')
        
        # Determine recommendation
        if roi_percentage > 30:
            recommendation = 'STRONG_RECOMMENDATION'
        elif roi_percentage > 15:
            recommendation = 'RECOMMENDATION'
        elif roi_percentage > 5:
            recommendation = 'CONSIDER'
        else:
            recommendation = 'NOT_RECOMMENDED'
        
        return RIRecommendation(
            instance_type=instance_type,
            recommended_count=count,
            upfront_cost=upfront,
            annual_cost=annual,
            on_demand_cost=round(on_demand_cost, 2),
            roi_percentage=round(roi_percentage, 2),
            break_even_months=round(break_even_months, 1),
            recommendation=recommendation,
        )
    
    def get_all_recommendations(self, days: int = 365) -> List[RIRecommendation]:
        """Get RI recommendations for all instance types."""
        self.analyze_all_instances(days=days)
        
        recommendations = []
        for instance_type, analysis in self.usage_analysis.items():
            count = analysis['count']
            recommendation = self.calculate_ri_roi(instance_type, count, days)
            recommendations.append(recommendation)
        
        return recommendations
    
    def generate_ri_report(self, days: int = 365) -> str:
        """Generate a comprehensive RI optimization report."""
        recommendations = self.get_all_recommendations(days)
        
        report = ["=" * 80, "Reserved Instance Optimization Report", "=" * 80, ""]
        
        total_annual_savings = 0
        total_upfront_investment = 0
        
        for rec in recommendations:
            if rec.recommendation in ['STRONG_RECOMMENDATION', 'RECOMMENDATION']:
                report.append(f"Instance Type: {rec.instance_type}")
                report.append(f"  Recommended Count: {rec.recommended_count}")
                report.append(f"  Recommendation: {rec.recommendation}")
                report.append(f"  Upfront Cost: ${rec.upfront_cost:,.2f}")
                report.append(f"  Annual Cost: ${rec.annual_cost:,.2f}")
                report.append(f"  On-Demand Cost: ${rec.on_demand_cost:,.2f}")
                report.append(f"  ROI: {rec.roi_percentage:.1f}%")
                report.append(f"  Break-Even: {rec.break_even_months:.1f} months")
                report.append("")
                
                total_annual_savings += rec.on_demand_cost - rec.annual_cost - rec.upfront_cost
                total_upfront_investment += rec.upfront_cost
        
        report.append("=" * 80)
        report.append(f"Total Upfront Investment: ${total_upfront_investment:,.2f}")
        report.append(f"Total Annual Savings: ${total_annual_savings:,.2f}")
        report.append("=" * 80)
        
        return "\n".join(report)

# Usage example
if __name__ == "__main__":
    optimizer = ReservedInstanceOptimizer(region="us-east-1")
    report = optimizer.generate_ri_report(days=365)
    print(report)
```

---

### Pattern 7: Cost Allocation Tagging

Cost allocation tagging implements chargeback/showback models through proper resource tagging.

**BAD — Manual tagging without validation**
```bash
# ❌ BAD — No validation, inconsistent tags
aws ec2 create-tags \
  --resources i-1234567890abcdef0 \
  --tags Key=Project,Value=MyProject Key=Environment,Value=prod
```

**GOOD — Automated tagging with validation and enforcement**
```bash
#!/bin/bash
# ✅ GOOD — Automated tagging with validation and cost allocation
set -euo pipefail

# Cost allocation tags (required for all resources)
REQUIRED_TAGS=(
  "Project"
  "Environment"
  "Owner"
  "CostCenter"
  "Department"
)

# Validate tags
validate_tags() {
  local tags="$1"
  
  for tag in "${REQUIRED_TAGS[@]}"; do
    if ! echo "$tags" | grep -q "\"Key\":\"$tag\""; then
      echo "ERROR: Missing required tag: $tag"
      return 1
    fi
  done
  
  echo "All required tags present"
  return 0
}

# Tag EC2 instance
tag_ec2_instance() {
  local instance_id="$1"
  local tags="$2"
  
  echo "Tagging EC2 instance: $instance_id"
  
  if validate_tags "$tags"; then
    aws ec2 create-tags \
      --resources "$instance_id" \
      --tags "$tags" \
      --region "${AWS_REGION:-us-east-1}"
    
    echo "Tags applied successfully"
  else
    echo "Tagging failed: validation error"
    return 1
  fi
}

# Tag S3 bucket
tag_s3_bucket() {
  local bucket_name="$1"
  local tags="$2"
  
  echo "Tagging S3 bucket: $bucket_name"
  
  if validate_tags "$tags"; then
    aws s3api put-bucket-tagging \
      --bucket "$bucket_name" \
      --tagging "$tags"
    
    echo "Tags applied successfully"
  else
    echo "Tagging failed: validation error"
    return 1
  fi
}

# Tag RDS instance
tag_rds_instance() {
  local db_instance_identifier="$1"
  local tags="$2"
  
  echo "Tagging RDS instance: $db_instance_identifier"
  
  if validate_tags "$tags"; then
    aws rds add-tags-to-resource \
      --resource-name "arn:aws:rds:${AWS_REGION:-us-east-1}:123456789012:db:$db_instance_identifier" \
      --tags "$tags"
    
    echo "Tags applied successfully"
  else
    echo "Tagging failed: validation error"
    return 1
  fi
}

# Example usage
INSTANCE_ID="${1:-i-1234567890abcdef0}"
TAGS='[
  {"Key":"Project","Value":"WebApplication"},
  {"Key":"Environment","Value":"production"},
  {"Key":"Owner","Value":"john.doe@company.com"},
  {"Key":"CostCenter","Value":"CC12345"},
  {"Key":"Department","Value":"Engineering"}
]'

tag_ec2_instance "$INSTANCE_ID" "$TAGS"
```

**Python Tagging Manager**
```python
# ✅ GOOD — Python tagging manager with cost allocation enforcement
import boto3
from typing import Dict, List, Optional
from datetime import datetime
import re

class CostAllocationTagManager:
    """Manages cost allocation tagging across AWS resources."""
    
    # Required cost allocation tags
    REQUIRED_TAGS = {
        'Project': {'type': 'string', 'pattern': r'^[a-zA-Z0-9-_.]{1,50}$'},
        'Environment': {'type': 'string', 'values': ['dev', 'staging', 'production', 'testing']},
        'Owner': {'type': 'email', 'pattern': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'},
        'CostCenter': {'type': 'string', 'pattern': r'^[A-Z]{2}\d{5}$'},
        'Department': {'type': 'string', 'values': ['Engineering', 'Marketing', 'Sales', 'Finance', 'Operations']},
        'Application': {'type': 'string', 'pattern': r'^[a-zA-Z0-9-_.]{1,50}$'},
        'BusinessUnit': {'type': 'string', 'pattern': r'^[a-zA-Z0-9-_.]{1,50}$'},
    }
    
    def __init__(self, region: str = "us-east-1"):
        self.ec2 = boto3.client('ec2', region_name=region)
        self.s3 = boto3.client('s3', region_name=region)
        self.rds = boto3.client('rds', region_name=region)
        self.iam = boto3.client('iam', region_name=region)
        
        self.tag_cache: Dict[str, Dict[str, str]] = {}
    
    def validate_tag(self, key: str, value: str) -> tuple:
        """Validate a tag key-value pair."""
        if key not in self.REQUIRED_TAGS:
            return True, None  # Optional tag
        
        tag_spec = self.REQUIRED_TAGS[key]
        
        # Check if value is in allowed values
        if 'values' in tag_spec and value not in tag_spec['values']:
            return False, f"Value '{value}' not in allowed values: {tag_spec['values']}"
        
        # Check regex pattern
        if 'pattern' in tag_spec:
            pattern = tag_spec['pattern']
            if tag_spec.get('type') == 'email':
                pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            
            if not re.match(pattern, value):
                return False, f"Value '{value}' does not match pattern: {pattern}"
        
        return True, None
    
    def validate_tags(self, tags: List[Dict[str, str]]) -> tuple:
        """Validate all tags and ensure required tags are present."""
        tag_dict = {tag['Key']: tag['Value'] for tag in tags}
        
        # Check required tags
        for required_tag in self.REQUIRED_TAGS:
            if required_tag not in tag_dict:
                return False, f"Missing required tag: {required_tag}"
        
        # Validate each tag
        for key, value in tag_dict.items():
            valid, error = self.validate_tag(key, value)
            if not valid:
                return False, f"Invalid tag {key}: {error}"
        
        return True, None
    
    def tag_ec2_instance(self, instance_id: str, tags: List[Dict[str, str]]) -> bool:
        """Tag an EC2 instance with cost allocation tags."""
        # Validate tags
        valid, error = self.validate_tags(tags)
        if not valid:
            print(f"Tag validation failed: {error}")
            return False
        
        try:
            self.ec2.create_tags(
                Resources=[instance_id],
                Tags=tags
            )
            self.tag_cache[instance_id] = {tag['Key']: tag['Value'] for tag in tags}
            print(f"Successfully tagged EC2 instance {instance_id}")
            return True
        except Exception as e:
            print(f"Error tagging EC2 instance: {e}")
            return False
    
    def tag_s3_bucket(self, bucket_name: str, tags: List[Dict[str, str]]) -> bool:
        """Tag an S3 bucket with cost allocation tags."""
        valid, error = self.validate_tags(tags)
        if not valid:
            print(f"Tag validation failed: {error}")
            return False
        
        try:
            self.s3.put_bucket_tagging(
                Bucket=bucket_name,
                Tagging={'TagSet': tags}
            )
            self.tag_cache[bucket_name] = {tag['Key']: tag['Value'] for tag in tags}
            print(f"Successfully tagged S3 bucket {bucket_name}")
            return True
        except Exception as e:
            print(f"Error tagging S3 bucket: {e}")
            return False
    
    def tag_rds_instance(self, db_instance_id: str, tags: List[Dict[str, str]]) -> bool:
        """Tag an RDS instance with cost allocation tags."""
        valid, error = self.validate_tags(tags)
        if not valid:
            print(f"Tag validation failed: {error}")
            return False
        
        try:
            response = self.rds.describe_db_instances(DBInstanceIdentifier=db_instance_id)
            arn = response['DBInstances'][0]['DBInstanceArn']
            
            self.rds.add_tags_to_resource(
                ResourceName=arn,
                Tags=tags
            )
            self.tag_cache[db_instance_id] = {tag['Key']: tag['Value'] for tag in tags}
            print(f"Successfully tagged RDS instance {db_instance_id}")
            return True
        except Exception as e:
            print(f"Error tagging RDS instance: {e}")
            return False
    
    def get_resource_tags(self, resource_id: str) -> Dict[str, str]:
        """Get tags for a resource."""
        if resource_id in self.tag_cache:
            return self.tag_cache[resource_id]
        
        try:
            response = self.ec2.describe_tags(
                Filters=[{'Name': 'resource-id', 'Values': [resource_id]}]
            )
            tags = {tag['Key']: tag['Value'] for tag in response.get('Tags', [])}
            self.tag_cache[resource_id] = tags
            return tags
        except Exception:
            return {}
    
    def generate_cost_allocation_report(self) -> Dict[str, float]:
        """Generate cost allocation report by tag."""
        # This would integrate with AWS Cost Explorer in production
        # For demo, we'll simulate the report structure
        
        report = {
            'tags_analyzed': len(self.tag_cache),
            'cost_by_project': {},
            'cost_by_environment': {},
            'cost_by_owner': {},
        }
        
        # In production, query AWS Cost Explorer with tag dimensions
        # Example query structure:
        # response = ce.get_cost_and_usage(
        #     TimePeriod={'Start': '2024-01-01', 'End': '2024-02-01'},
        #     Granularity='MONTHLY',
        #     Metrics=['UnblendedCost'],
        #     GroupBy=[
        #         {'Type': 'TAG', 'Key': 'Project'},
        #         {'Type': 'TAG', 'Key': 'Environment'}
        #     ]
        # )
        
        return report
    
    def enforce_tagging_policy(self, resource_type: str, resource_id: str) -> bool:
        """Enforce cost allocation tagging policy on a resource."""
        if resource_type == 'ec2':
            return self.tag_ec2_instance(resource_id, [])
        elif resource_type == 's3':
            return self.tag_s3_bucket(resource_id, [])
        elif resource_type == 'rds':
            return self.tag_rds_instance(resource_id, [])
        else:
            print(f"Unsupported resource type: {resource_type}")
            return False

# Usage example
if __name__ == "__main__":
    tag_manager = CostAllocationTagManager(region="us-east-1")
    
    # Define cost allocation tags
    cost_tags = [
        {'Key': 'Project', 'Value': 'WebApplication'},
        {'Key': 'Environment', 'Value': 'production'},
        {'Key': 'Owner', 'Value': 'john.doe@company.com'},
        {'Key': 'CostCenter', 'Value': 'CC12345'},
        {'Key': 'Department', 'Value': 'Engineering'},
        {'Key': 'Application', 'Value': 'frontend'},
        {'Key': 'BusinessUnit', 'Value': 'Tech'},
    ]
    
    # Tag a resource (example)
    instance_id = "i-1234567890abcdef0"
    tag_manager.tag_ec2_instance(instance_id, cost_tags)
    
    # Get tags
    tags = tag_manager.get_resource_tags(instance_id)
    print(f"Tags for {instance_id}: {tags}")
```

---

### Pattern 8: Multi-Cloud Cost Aggregation

Multi-cloud cost aggregation provides unified visibility across AWS, Azure, and GCP.

**BAD — Separate queries without normalization**
```bash
# ❌ BAD — No normalization, separate tools for each cloud
# AWS
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-02-01

# Azure
az costmanagement query --type Usage --timeframe MonthToDate

# GCP
gcloud billing budgets describe --billing-account="012345-567890-ABCDEF"
```

**GOOD — Unified multi-cloud cost aggregation framework**
```bash
#!/bin/bash
# ✅ GOOD — Unified multi-cloud cost aggregation with normalization
set -euo pipefail

# Configuration
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/cost-aggregation}"
START_DATE="${START_DATE:-$(date -d '1 month ago' +%Y-%m-%d)}"
END_DATE="${END_DATE:-$(date +%Y-%m-%d)}"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# AWS Cost Aggregation
aggregate_aws_costs() {
  echo "Aggregating AWS costs..."
  
  aws ce get-cost-and-usage \
    --time-period "Start=${START_DATE},End=${END_DATE}" \
    --granularity MONTHLY \
    --metrics UnblendedCost \
    --group-by "Type=DIMENSION,Key=SERVICE" \
    --query 'ResultsByTime[].Total[].UnblendedCost Amount' \
    --output json > "$OUTPUT_DIR/aws_costs.json"
  
  # Extract total cost
  local aws_total=$(cat "$OUTPUT_DIR/aws_costs.json" | jq -r '.ResultsByTime[].Total.UnblendedCost.Amount' | awk '{sum+=$1} END {printf "%.2f", sum}')
  echo "AWS Total Cost: \$$aws_total"
  echo "$aws_total" > "$OUTPUT_DIR/aws_total.txt"
}

# Azure Cost Aggregation
aggregate_azure_costs() {
  echo "Aggregating Azure costs..."
  
  local subscription_id=$(az account show --query id -o tsv)
  
  az costmanagement query \
    --type "Usage" \
    --timeframe "MonthToDate" \
    --dataset-aggregation '{"totalCost":{"name":"PreTaxCost","function":"Sum"}}' \
    --dataset-grouping '{"name":"ResourceGroup","type":"Dimension"}' \
    --subscription "$subscription_id" \
    --query "properties.rows[].properties.totalCost" \
    --output tsv > "$OUTPUT_DIR/azure_costs.txt"
  
  # Calculate total
  local azure_total=$(cat "$OUTPUT_DIR/azure_costs.txt" | awk '{sum+=$1} END {printf "%.2f", sum}')
  echo "Azure Total Cost: \$$azure_total"
  echo "$azure_total" > "$OUTPUT_DIR/azure_total.txt"
}

# GCP Cost Aggregation
aggregate_gcp_costs() {
  echo "Aggregating GCP costs..."
  
  # Get billing account
  local billing_account=$(gcloud billing accounts list --format="value(name)" | head -1)
  
  # Query BigQuery for costs (requires Cloud Billing Export)
  gcloud bigquery queries run "
    SELECT 
      SUM(cost) as total_cost
    FROM 
      \`\${billing_account}.billing_data.gcp_billing_export_v1_012345\`
    WHERE 
      _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  " --format="csv" > "$OUTPUT_DIR/gcp_costs.csv"
  
  # Extract total
  local gcp_total=$(tail -1 "$OUTPUT_DIR/gcp_costs.csv" | cut -d',' -f1)
  echo "GCP Total Cost: \$$gcp_total"
  echo "$gcp_total" > "$OUTPUT_DIR/gcp_total.txt"
}

# Normalize all costs to USD
normalize_costs() {
  echo "Normalizing costs to USD..."
  
  # Get exchange rates (simplified - use actual rates API)
  local exchange_rates=(
    "USD:1.0"
    "EUR:1.08"
    "GBP:1.27"
    "JPY:0.0068"
  )
  
  # In production, use a real exchange rate API
  # For now, assume all costs are already in USD
  echo "1.0" > "$OUTPUT_DIR/eur_usd_rate.txt"
  echo "1.0" > "$OUTPUT_dir/gbp_usd_rate.txt"
  echo "1.0" > "$OUTPUT_DIR/jpy_usd_rate.txt"
  
  # Copy costs (already in USD)
  cp "$OUTPUT_DIR/aws_total.txt" "$OUTPUT_DIR/normalized_total.txt"
  cp "$OUTPUT_DIR/azure_total.txt" "$OUTPUT_DIR/normalized_azure.txt"
  cp "$OUTPUT_DIR/gcp_total.txt" "$OUTPUT_DIR/normalized_gcp.txt"
}

# Generate unified report
generate_unified_report() {
  echo "Generating unified cost report..."
  
  local aws_cost=$(cat "$OUTPUT_DIR/aws_total.txt" 2>/dev/null || echo "0")
  local azure_cost=$(cat "$OUTPUT_DIR/azure_total.txt" 2>/dev/null || echo "0")
  local gcp_cost=$(cat "$OUTPUT_DIR/gcp_total.txt" 2>/dev/null || echo "0")
  
  local total_cost=$(echo "$aws_cost + $azure_cost + $gcp_cost" | bc -l)
  
  echo ""
  echo "=============================================="
  echo "     Multi-Cloud Cost Aggregation Report"
  echo "=============================================="
  echo ""
  echo "Period: $START_DATE to $END_DATE"
  echo ""
  echo "Cost by Provider:"
  echo "  AWS:     \$$aws_cost"
  echo "  Azure:   \$$azure_cost"
  echo "  GCP:     \$$gcp_cost"
  echo "  Total:   \$$total_cost"
  echo ""
  echo "Cost Distribution:"
  if (( $(echo "$total_cost > 0" | bc -l) )); then
    local aws_pct=$(echo "scale=1; $aws_cost * 100 / $total_cost" | bc -l)
    local azure_pct=$(echo "scale=1; $azure_cost * 100 / $total_cost" | bc -l)
    local gcp_pct=$(echo "scale=1; $gcp_cost * 100 / $total_cost" | bc -l)
    echo "  AWS:     ${aws_pct}%"
    echo "  Azure:   ${azure_pct}%"
    echo "  GCP:     ${gcp_pct}%"
  fi
  echo ""
  echo "Report generated: $(date)"
  echo "=============================================="
  
  # Save report
  cat > "$OUTPUT_DIR/unified_report.txt" <<EOF
Multi-Cloud Cost Aggregation Report
====================================
Period: $START_DATE to $END_DATE

Cost by Provider:
  AWS:     \$$aws_cost
  Azure:   \$$azure_cost
  GCP:     \$$gcp_cost
  Total:   \$$total_cost

Cost Distribution:
  AWS:     ${aws_pct}%
  Azure:   ${azure_pct}%
  GCP:     ${gcp_pct}%

Report generated: $(date)
====================================
EOF
}

# Main execution
main() {
  echo "Starting multi-cloud cost aggregation..."
  echo "Date range: $START_DATE to $END_DATE"
  echo ""
  
  aggregate_aws_costs
  aggregate_azure_costs
  aggregate_gcp_costs
  normalize_costs
  generate_unified_report
  
  echo ""
  echo "Reports saved to: $OUTPUT_DIR"
}

main "$@"
```

**Python Multi-Cloud Cost Aggregator**
```python
# ✅ GOOD — Python multi-cloud cost aggregator with normalization
import boto3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import statistics
import os

@dataclass
class CloudCost:
    provider: str
    amount: float
    currency: str
    period_start: datetime
    period_end: datetime
    breakdown: Optional[Dict[str, float]] = None

class MultiCloudCostAggregator:
    """Aggregates and normalizes costs across AWS, Azure, and GCP."""
    
    def __init__(self):
        self.aws_client = boto3.client('ce', region_name='us-east-1')
        self.aws_cost_explorer = boto3.client('ce', region_name='us-east-1')
        
        # Azure and GCP costs will be fetched via API/CLI
        self.azure_costs: List[Dict] = []
        self.gcp_costs: List[Dict] = []
        
        self.exchange_rates: Dict[str, float] = {
            'USD': 1.0,
            'EUR': 1.08,
            'GBP': 1.27,
            'JPY': 0.0068,
        }
    
    def get_aws_costs(self, days: int = 30) -> CloudCost:
        """Get AWS costs for the specified period."""
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        try:
            response = self.aws_cost_explorer.get_cost_and_usage(
                TimePeriod={
                    'Start': start_date.isoformat(),
                    'End': end_date.isoformat()
                },
                Granularity='MONTHLY',
                Metrics=['UnblendedCost'],
                GroupBy=[
                    {'Type': 'DIMENSION', 'Key': 'SERVICE'},
                    {'Type': 'TAG', 'Key': 'Project'}
                ]
            )
            
            # Extract total cost
            total_cost = 0
            service_costs: Dict[str, float] = {}
            
            for result in response['ResultsByTime'][-1]['Groups']:
                amount = float(result['Metrics']['UnblendedCost']['Amount'])
                key = result['Keys'][0]  # Service name
                total_cost += amount
                service_costs[key] = service_costs.get(key, 0) + amount
            
            return CloudCost(
                provider='aws',
                amount=round(total_cost, 2),
                currency='USD',
                period_start=start_date,
                period_end=end_date,
                breakdown=service_costs,
            )
        except Exception as e:
            print(f"Error fetching AWS costs: {e}")
            return CloudCost(
                provider='aws',
                amount=0,
                currency='USD',
                period_start=start_date,
                period_end=end_date,
            )
    
    def get_azure_costs(self, days: int = 30) -> CloudCost:
        """Get Azure costs for the specified period."""
        # In production, use Azure Cost Management SDK
        # This is a simplified example
        
        from datetime import datetime
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        try:
            # Example Azure Cost Management SDK usage
            # from azure.identity import DefaultAzureCredential
            # from azure.mgmt.costmanagement import CostManagementClient
            
            # For demo, return mock data
            azure_cost = 1500.0  # Example cost
            
            return CloudCost(
                provider='azure',
                amount=round(azure_cost, 2),
                currency='USD',  # Azure costs are typically in USD
                period_start=start_date,
                period_end=end_date,
            )
        except Exception as e:
            print(f"Error fetching Azure costs: {e}")
            return CloudCost(
                provider='azure',
                amount=0,
                currency='USD',
                period_start=start_date,
                period_end=end_date,
            )
    
    def get_gcp_costs(self, days: int = 30) -> CloudCost:
        """Get GCP costs for the specified period."""
        from datetime import datetime
        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=days)
        
        try:
            # Example GCP Billing API usage
            # from google.cloud import billing_v1
            # client = billing_v1.CloudBillingClient()
            
            # For demo, return mock data
            gcp_cost = 2000.0  # Example cost
            
            return CloudCost(
                provider='gcp',
                amount=round(gcp_cost, 2),
                currency='USD',  # GCP costs are typically in USD
                period_start=start_date,
                period_end=end_date,
            )
        except Exception as e:
            print(f"Error fetching GCP costs: {e}")
            return CloudCost(
                provider='gcp',
                amount=0,
                currency='USD',
                period_start=start_date,
                period_end=end_date,
            )
    
    def normalize_to_usd(self, amount: float, currency: str) -> float:
        """Normalize an amount to USD using exchange rates."""
        if currency == 'USD':
            return amount
        
        rate = self.exchange_rates.get(currency, 1.0)
        return round(amount * rate, 2)
    
    def aggregate_costs(self, days: int = 30) -> Dict:
        """Aggregate costs from all cloud providers."""
        aws_cost = self.get_aws_costs(days)
        azure_cost = self.get_azure_costs(days)
        gcp_cost = self.get_gcp_costs(days)
        
        # Normalize all costs to USD
        aws_usd = self.normalize_to_usd(aws_cost.amount, aws_cost.currency)
        azure_usd = self.normalize_to_usd(azure_cost.amount, azure_cost.currency)
        gcp_usd = self.normalize_to_usd(gcp_cost.amount, gcp_cost.currency)
        
        total_cost = aws_usd + azure_usd + gcp_usd
        
        return {
            'period': {
                'start': aws_cost.period_start.isoformat(),
                'end': aws_cost.period_end.isoformat(),
            },
            'providers': {
                'aws': {
                    'amount': aws_cost.amount,
                    'currency': aws_cost.currency,
                    'normalized_usd': aws_usd,
                    'breakdown': aws_cost.breakdown,
                },
                'azure': {
                    'amount': azure_cost.amount,
                    'currency': azure_cost.currency,
                    'normalized_usd': azure_usd,
                },
                'gcp': {
                    'amount': gcp_cost.amount,
                    'currency': gcp_cost.currency,
                    'normalized_usd': gcp_usd,
                },
            },
            'totals': {
                'total_usd': round(total_cost, 2),
                'aws_percentage': round((aws_usd / total_cost) * 100, 1) if total_cost > 0 else 0,
                'azure_percentage': round((azure_usd / total_cost) * 100, 1) if total_cost > 0 else 0,
                'gcp_percentage': round((gcp_usd / total_cost) * 100, 1) if total_cost > 0 else 0,
            },
        }
    
    def generate_cost_report(self, days: int = 30) -> str:
        """Generate a comprehensive cost report."""
        costs = self.aggregate_costs(days)
        
        report = [
            "=" * 80,
            "         Multi-Cloud Cost Aggregation Report",
            "=" * 80,
            "",
            f"Period: {costs['period']['start']} to {costs['period']['end']}",
            "",
            "Cost by Provider:",
            f"  AWS:     ${costs['providers']['aws']['normalized_usd']:,.2f} ({costs['providers']['aws']['amount']:.2f} {costs['providers']['aws']['currency']})",
            f"  Azure:   ${costs['providers']['azure']['normalized_usd']:,.2f} ({costs['providers']['azure']['amount']:.2f} {costs['providers']['azure']['currency']})",
            f"  GCP:     ${costs['providers']['gcp']['normalized_usd']:,.2f} ({costs['providers']['gcp']['amount']:.2f} {costs['providers']['gcp']['currency']})",
            "",
            f"  Total:   ${costs['totals']['total_usd']:,.2f}",
            "",
            "Cost Distribution:",
            f"  AWS:     {costs['totals']['aws_percentage']}%",
            f"  Azure:   {costs['totals']['azure_percentage']}%",
            f"  GCP:     {costs['totals']['gcp_percentage']}%",
            "",
        ]
        
        # AWS breakdown by service (if available)
        if costs['providers']['aws']['breakdown']:
            report.extend([
                "AWS Breakdown by Service:",
            ])
            for service, amount in sorted(costs['providers']['aws']['breakdown'].items(), key=lambda x: x[1], reverse=True)[:10]:
                pct = (amount / costs['providers']['aws']['normalized_usd']) * 100 if costs['providers']['aws']['normalized_usd'] > 0 else 0
                report.append(f"  {service}: ${amount:,.2f} ({pct:.1f}%)")
            report.append("")
        
        report.append("=" * 80)
        
        return "\n".join(report)

# Usage example
if __name__ == "__main__":
    aggregator = MultiCloudCostAggregator()
    report = aggregator.generate_cost_report(days=30)
    print(report)
```

---

## Constraints

### MUST DO

- Normalize all cost data to a common currency (USD) before aggregation and comparison
- Use at least 14 days of historical data for right-sizing recommendations to account for weekly patterns
- Always layer spot instance recommendations with on-demand or reserved instances for critical workloads
- Validate all cost allocation tags before applying them to resources
- Set up automated alerts at 50%, 75%, 90%, and 100% of budget thresholds
- Cross-reference utilization metrics with application SLAs before right-sizing
- Document all optimization recommendations with ROI calculations and break-even periods
- Regularly audit cost allocation tags for completeness and accuracy
- Use reserved instance optimization for workloads with >70% utilization and stable patterns
- Implement cost allocation at the resource level for granular chargeback

### MUST NOT DO

- Disable or bypass cost allocation tags to "speed up" deployments
- Make right-sizing decisions based on single-point utilization metrics without trend analysis
- Use spot instances for stateful, critical, or latency-sensitive workloads without proper interruption handling
- Purchase reserved instances without historical usage validation and ROI analysis
- Aggregate costs from different cloud providers without currency normalization
- Ignore spot instance interruption rates when planning capacity
- Apply cost allocation tags retroactively without considering data retention policies
- Make optimization decisions without consulting application owners and SLA requirements
- Disable monitoring and alerting during optimization implementation
- Recommend spot instances for databases or services with strict uptime SLAs (>99.9%)

---

## Output Template

When implementing cost optimization strategies, return the following structured output:

### 1. Executive Summary

```
Cost Optimization Analysis Report
=================================
Analysis Period: YYYY-MM-DD to YYYY-MM-DD
Total Estimated Monthly Savings: $X,XXX.XX
Implementation Timeline: X weeks
Projected ROI: XX%
```

### 2. Provider Breakdown

```
AWS:
  Current Monthly Cost: $X,XXX.XX
  Right-Sizing Savings: $XXX.XX (XX%)
  Spot Instance Savings: $XXX.XX (XX%)
  Reserved Instance Savings: $XXX.XX (XX%)
  Total Potential Savings: $XXX.XX (XX%)

Azure:
  Current Monthly Cost: $X,XXX.XX
  Right-Sizing Savings: $XXX.XX (XX%)
  Spot Instance Savings: $XXX.XX (XX%)
  Reserved Instance Savings: $XXX.XX (XX%)
  Total Potential Savings: $XXX.XX (XX%)

GCP:
  Current Monthly Cost: $X,XXX.XX
  Right-Sizing Savings: $XXX.XX (XX%)
  Spot Instance Savings: $XXX.XX (XX%)
  Reserved Instance Savings: $XXX.XX (XX%)
  Total Potential Savings: $XXX.XX (XX%)
```

### 3. Action Plan

```
Priority 1 (Week 1-2):
- Implement cost allocation tagging for all resources
- Set up automated cost alerts at 50%, 75%, 90%, 100% thresholds

Priority 2 (Week 3-4):
- Right-size low-utilization resources (CPU < 30% for 14 days)
- Implement spot instance strategy for fault-tolerant workloads

Priority 3 (Month 2):
- Purchase reserved instances for stable, high-utilization workloads
- Implement storage tier optimization

Priority 4 (Ongoing):
- Monthly cost reviews and optimization cycle
- Continuous right-sizing based on usage patterns
```

### 4. Risk Assessment

```
Spot Instance Risks:
- Interruption rate: XX% (based on historical data)
- Replacement time: X minutes average
- Mitigation: Maintain buffer capacity, use mixed instance types

Right-Sizing Risks:
- Performance impact: Low/Medium/High
- Application impact: Minimal/Moderate/Significant
- Mitigation: Gradual rollout, monitoring, rollback plan

Reserved Instance Risks:
- Commitment period: 1 or 3 years
- Early termination fees: XXX%
- Mitigation: Start with 1-year terms, monitor usage patterns
```

### 5. Monitoring Framework

```
Cost Alerts:
- 50% threshold: Informational notification
- 75% threshold: Manager notification
- 90% threshold: Emergency notification
- 100% threshold: Automatic budget freeze (optional)

Optimization Metrics:
- Monthly cost trend
- Cost per workload
- Cost per user
- ROI on optimization initiatives

Review Cadence:
- Daily: Automated cost anomaly detection
- Weekly: Team cost review
- Monthly: Executive cost report
- Quarterly: Optimization strategy review
```

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-cost-optimization` | Complementary skill with different optimization focus; use this skill for detailed analysis and implementation |
| `cncf-kubernetes-debugging` | Kubernetes cost optimization often requires debugging resource allocations and pod scheduling |
| `agent-database-admin` | Database optimization is a key component of cloud cost management; use for RDS, Cloud SQL, Cosmos DB optimization |

---

## References

### AWS Cost Optimization
- AWS Cost Explorer Documentation: https://aws.amazon.com/cost-management/cost-explorer/
- AWS Reserved Instance Pricing Calculator: https://aws.amazon.com/pricing/calculator/
- AWS Spot Instances Documentation: https://aws.amazon.com/ec2/spot/
- AWS Cost Allocation Tags: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html

### Azure Cost Optimization
- Azure Cost Management Documentation: https://learn.microsoft.com/en-us/azure/cost-management-billing/cost-management/
- Azure Reserved VM Instances: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/reserved-vm-instances
- Azure Spot Virtual Machines: https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms
- Azure Cost Analysis: https://learn.microsoft.com/en-us/azure/cost-management-billing/cost-management/cost-analysis

### GCP Cost Optimization
- GCP Billing Documentation: https://cloud.google.com/billing/docs
- GCP Compute Engine Pricing: https://cloud.google.com/compute/pricing
- GCP Preemptible VMs: https://cloud.google.com/compute/docs/instances/preemptible
- GCP Cost Allocation: https://cloud.google.com/billing/docs/how-to/bq-examples

### General Cost Optimization
- Cloud Cost Management Best Practices: https://aws.amazon.com/architecture/security-identity-compliance/latest/cloud-security-best-practices/
- Multi-Cloud Cost Management: https://www.forrester.com/report/multi-cloud-cost-management/
- Right-Sizing Calculations: https://cloud.google.com/architecture/best-practices-for-running-compute-engine-vms

---

## Additional Implementation Patterns

### Pattern 9: Storage Tier Optimization

Optimize storage costs by analyzing access patterns and implementing appropriate tiering strategies.

**BAD — No access pattern analysis**
```bash
# ❌ BAD — No analysis, all data in expensive storage
# Just moving everything to S3 Intelligent-Tiering without analysis
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json
```

**GOOD — Data-driven storage tier optimization**
```bash
#!/bin/bash
# ✅ GOOD — Access pattern analysis for storage tier recommendations
set -euo pipefail

BUCKET="${1:-my-bucket}"
REGION="${AWS_REGION:-us-east-1}"

# Get bucket metrics
aws s3api get-bucket-metrics-configuration \
  --bucket "$BUCKET" \
  --id "StorageMetrics" \
  --query 'BucketMetricsConfiguration.StorageClassMetrics' \
  --output json 2>/dev/null || echo "Metrics not configured"

# Analyze access patterns
echo "=== Storage Tier Analysis for $BUCKET ==="
echo ""

# Check current lifecycle configuration
aws s3api get-bucket-lifecycle-configuration \
  --bucket "$BUCKET" \
  --query 'Rules[].{ID:ID,Status:Status,Transitions:Transitions}' \
  --output table 2>/dev/null || echo "No lifecycle configuration found"

# Get object count by size
echo ""
echo "Storage Distribution:"
aws s3api list-objects-v2 \
  --bucket "$BUCKET" \
  --query 'Contents[].{Key:Key,Size:Size,LastModified:LastModified}' \
  --max-items 100 \
  --output table 2>/dev/null | head -50

# Generate tier recommendations
echo ""
echo "=== Tier Recommendations ==="
echo "S3 Standard:      Objects accessed >= 1 time/month"
echo "S3 Intelligent:   Objects with variable access patterns"
echo "S3 Standard-IA:   Objects accessed < 1 time/month"
echo "S3 One-Zone IA:   Non-critical objects, < 1 access/month"
echo "S3 Glacier:       Objects accessed < 1 time/year"
echo "S3 Glacier Deep:  Objects accessed < 1 time/7 years"
```

**Python Storage Optimization Engine**
```python
# ✅ GOOD — Python storage optimization with access pattern analysis
import boto3
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import defaultdict
import statistics

class StorageTierOptimizer:
    """Optimizes storage tier assignments based on access patterns."""
    
    def __init__(self, region: str = "us-east-1"):
        self.s3 = boto3.client('s3', region_name=region)
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        
        # Access pattern thresholds (days since last access)
        self.thresholds = {
            'standard': 30,      # Accessed >= 1 time/month
            'standard_ia': 90,   # Accessed < 1 time/month
            'one_zone': 90,      # Non-critical, accessed < 1 time/month
            'glacier': 365,      # Accessed < 1 time/year
            'glacier_deep': 2555,  # Accessed < 1 time/7 years
        }
        
        self.tier_costs = {
            'standard': 0.023,        # $/GB/month
            'standard_ia': 0.0125,    # $/GB/month
            'one_zone': 0.0100,       # $/GB/month
            'glacier': 0.004,         # $/GB/month
            'glacier_deep': 0.00099,  # $/GB/month
        }
    
    def get_object_access_pattern(self, bucket: str, prefix: str = "") -> Dict[str, int]:
        """Get access patterns for objects in a bucket."""
        access_patterns = defaultdict(int)
        
        # List objects with pagination
        paginator = self.s3.get_paginator('list_objects_v2')
        page_iterator = paginator.paginate(Bucket=bucket, Prefix=prefix)
        
        for page in page_iterator:
            for obj in page.get('Contents', []):
                key = obj['Key']
                size = obj['Size']
                
                # Classify by size
                if size < 1024:  # < 1KB
                    access_patterns['tiny'] += 1
                elif size < 1024 * 1024:  # < 1MB
                    access_patterns['small'] += 1
                elif size < 1024 * 1024 * 1024:  # < 1GB
                    access_patterns['medium'] += 1
                else:
                    access_patterns['large'] += 1
        
        return dict(access_patterns)
    
    def analyze_bucket_storage(self, bucket: str) -> Dict:
        """Analyze bucket storage and recommend tier assignments."""
        try:
            # Get lifecycle configuration
            try:
                lifecycle = self.s3.get_bucket_lifecycle_configuration(Bucket=bucket)
                current_tiers = [rule['Transitions'][0]['StorageClass'] 
                               for rule in lifecycle.get('Rules', [])]
            except Exception:
                current_tiers = []
            
            # Get storage metrics
            metrics = self.cloudwatch.get_metric_statistics(
                Namespace='AWS/S3',
                MetricName='BucketSizeBytes',
                Dimensions=[
                    {'Name': 'BucketName', 'Value': bucket},
                    {'Name': 'StorageType', 'Value': 'StandardStorage'}
                ],
                StartTime=datetime.utcnow() - timedelta(days=30),
                EndTime=datetime.utcnow(),
                Period=86400,
                Statistics=['Average']
            )
            
            avg_size_bytes = statistics.mean([
                dp['Average'] for dp in metrics.get('Datapoints', [])
            ]) if metrics.get('Datapoints') else 0
            
            avg_size_gb = avg_size_bytes / (1024 ** 3)
            
            # Calculate potential savings
            current_cost = avg_size_gb * self.tier_costs['standard']
            
            # Recommend optimal tier based on size and access pattern
            if avg_size_gb < 100:
                recommended_tier = 'standard'
            elif avg_size_gb < 1000:
                recommended_tier = 'standard_ia'
            elif avg_size_gb < 10000:
                recommended_tier = 'one_zone'
            else:
                recommended_tier = 'glacier'
            
            recommended_cost = avg_size_gb * self.tier_costs[recommended_tier]
            savings = current_cost - recommended_cost
            savings_percentage = (savings / current_cost) * 100 if current_cost > 0 else 0
            
            return {
                'bucket': bucket,
                'current_size_gb': round(avg_size_gb, 2),
                'current_tier': 'Standard',
                'recommended_tier': recommended_tier,
                'current_cost_monthly': round(current_cost, 2),
                'recommended_cost_monthly': round(recommended_cost, 2),
                'monthly_savings': round(savings, 2),
                'savings_percentage': round(savings_percentage, 1),
                'tier_breakdown': {
                    'standard': round(avg_size_gb * 0.3, 2),
                    'standard_ia': round(avg_size_gb * 0.4, 2),
                    'one_zone': round(avg_size_gb * 0.2, 2),
                    'glacier': round(avg_size_gb * 0.1, 2),
                },
            }
        except Exception as e:
            print(f"Error analyzing bucket {bucket}: {e}")
            return {}
    
    def optimize_all_buckets(self) -> List[Dict]:
        """Optimize storage for all buckets."""
        buckets = self.s3.list_buckets()['Buckets']
        results = []
        
        for bucket in buckets:
            result = self.analyze_bucket_storage(bucket['Name'])
            if result:
                results.append(result)
        
        return results

# Usage example
if __name__ == "__main__":
    optimizer = StorageTierOptimizer(region="us-east-1")
    buckets = optimizer.optimize_all_buckets()
    
    print("Storage Tier Optimization Report")
    print("=" * 60)
    
    total_monthly_savings = 0
    
    for bucket in buckets:
        if bucket['savings_percentage'] > 10:
            print(f"\nBucket: {bucket['bucket']}")
            print(f"  Current Size: {bucket['current_size_gb']:.2f} GB")
            print(f"  Current Tier: {bucket['current_tier']}")
            print(f"  Recommended: {bucket['recommended_tier']}")
            print(f"  Monthly Savings: ${bucket['monthly_savings']:.2f}")
            total_monthly_savings += bucket['monthly_savings']
    
    print(f"\n" + "=" * 60)
    print(f"Total Monthly Savings: ${total_monthly_savings:.2f}")
```

### Pattern 10: Kubernetes Resource Optimization

Optimize Kubernetes resource requests and limits to reduce cluster costs.

**BAD — No resource optimization, default settings**
```bash
# ❌ BAD — No resource analysis, just applying defaults
kubectl apply -f deployment.yaml
# Deployment has no resource requests/limits defined
```

**GOOD — Kubernetes resource optimization with metrics**
```bash
#!/bin/bash
# ✅ GOOD — Kubernetes resource optimization with metrics analysis
set -euo pipefail

NAMESPACE="${NAMESPACE:-default}"
DAYS_ANALYZED="${DAYS_ANALYZED:-14}"

echo "=== Kubernetes Resource Optimization ==="
echo "Namespace: $NAMESPACE"
echo "Analysis Period: $DAYS_ANALYZED days"
echo ""

# Get all deployments
deployments=$(kubectl get deployments -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')

for deployment in $deployments; do
  echo "Analyzing deployment: $deployment"
  
  # Get pod resource usage (requires metrics server)
  kubectl top pods -n "$NAMESPACE" -l "app=$deployment" 2>/dev/null || echo "Metrics not available"
  
  # Get deployment resource configuration
  echo "Current resource configuration:"
  kubectl get deployment "$deployment" -n "$NAMESPACE" \
    -o jsonpath='{.spec.template.spec.containers[*].resources}' 2>/dev/null || echo "No resources defined"
  
  echo ""
done

# Generate recommendations
echo "=== Optimization Recommendations ==="
echo "1. Set CPU requests to 50-70% of measured peak"
echo "2. Set CPU limits to 150-200% of requests"
echo "3. Set memory requests to 70-80% of measured peak"
echo "4. Set memory limits to 150-200% of requests"
echo "5. Use Vertical Pod Autoscaler for automatic optimization"
```

**Python K8s Resource Optimizer**
```python
# ✅ GOOD — Python K8s resource optimizer with metrics
import subprocess
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass
import statistics

@dataclass
class PodMetrics:
    name: str
    cpu_usage: float  # millicores
    memory_usage: float  # MB
    cpu_request: Optional[float] = None
    memory_request: Optional[float] = None
    cpu_limit: Optional[float] = None
    memory_limit: Optional[float] = None

class K8sResourceOptimizer:
    """Optimizes Kubernetes resource requests and limits."""
    
    def __init__(self):
        self.metrics_server_available = self._check_metrics_server()
    
    def _check_metrics_server(self) -> bool:
        """Check if metrics server is available."""
        try:
            result = subprocess.run(
                ['kubectl', 'get', 'apiservice', 'v1beta1.metrics.k8s.io', '-o', 'jsonpath={.status.conditions[0].status}'],
                capture_output=True, text=True
            )
            return result.stdout.strip() == 'True'
        except Exception:
            return False
    
    def get_pod_metrics(self, namespace: str, pod: str) -> Optional[PodMetrics]:
        """Get resource metrics for a pod."""
        if not self.metrics_server_available:
            return None
        
        try:
            result = subprocess.run(
                ['kubectl', 'top', 'pod', pod, '-n', namespace, '--no-headers', '-o', 'json'],
                capture_output=True, text=True, check=True
            )
            metrics = json.loads(result.stdout)
            
            return PodMetrics(
                name=pod,
                cpu_usage=metrics.get('usage', {}).get('cpu', '0').rstrip('n') or '0',
                memory_usage=metrics.get('usage', {}).get('memory', '0').rstrip('Ki') or '0',
            )
        except Exception as e:
            print(f"Error getting metrics for {pod}: {e}")
            return None
    
    def get_deployment_resources(self, namespace: str, deployment: str) -> Dict:
        """Get resource configuration for a deployment."""
        try:
            result = subprocess.run(
                ['kubectl', 'get', 'deployment', deployment, '-n', namespace, '-o', 'json'],
                capture_output=True, text=True, check=True
            )
            deployment_data = json.loads(result.stdout)
            
            containers = []
            for container in deployment_data['spec']['template']['spec'].get('containers', []):
                resources = container.get('resources', {})
                containers.append({
                    'name': container['name'],
                    'requests': resources.get('requests', {}),
                    'limits': resources.get('limits', {}),
                })
            
            return {'containers': containers}
        except Exception as e:
            print(f"Error getting resources for {deployment}: {e}")
            return {'containers': []}
    
    def calculate_optimal_resources(self, metrics: List[PodMetrics]) -> Dict[str, float]:
        """Calculate optimal resource requests and limits based on metrics."""
        if not metrics:
            return {}
        
        cpu_values = [m.cpu_usage for m in metrics]
        memory_values = [m.memory_usage for m in metrics]
        
        # Use 70th percentile for requests
        cpu_70th = sorted(cpu_values)[int(len(cpu_values) * 0.7)] if cpu_values else 0
        memory_70th = sorted(memory_values)[int(len(memory_values) * 0.7)] if memory_values else 0
        
        # Use 95th percentile for limits
        cpu_95th = sorted(cpu_values)[int(len(cpu_values) * 0.95)] if cpu_values else 0
        memory_95th = sorted(memory_values)[int(len(memory_values) * 0.95)] if memory_values else 0
        
        return {
            'cpu_request': round(cpu_70th * 0.7, 0),  # 70% of 70th percentile
            'cpu_limit': round(cpu_95th * 1.5, 0),
            'memory_request': round(memory_70th * 0.7, 0),
            'memory_limit': round(memory_95th * 1.5, 0),
        }
    
    def analyze_namespace(self, namespace: str) -> List[Dict]:
        """Analyze resource optimization for all pods in a namespace."""
        if not self.metrics_server_available:
            return [{'error': 'Metrics server not available'}]
        
        try:
            result = subprocess.run(
                ['kubectl', 'get', 'pods', '-n', namespace, '-o', 'jsonpath={.items[*].metadata.name}'],
                capture_output=True, text=True, check=True
            )
            pods = result.stdout.split()
            
            results = []
            for pod in pods:
                metrics = self.get_pod_metrics(namespace, pod)
                if metrics:
                    optimal = self.calculate_optimal_resources([metrics])
                    
                    # Calculate potential savings
                    current_cpu = metrics.cpu_limit or 500  # Default
                    current_memory = metrics.memory_limit or 512  # Default
                    
                    optimal_cpu = optimal.get('cpu_limit', current_cpu)
                    optimal_memory = optimal.get('memory_limit', current_memory)
                    
                    # Estimate cost savings (simplified)
                    cpu_savings = (current_cpu - optimal_cpu) * 0.000011  # $ per millicore per hour
                    memory_savings = (current_memory - optimal_memory) * 0.0000037  # $ per MB per hour
                    
                    monthly_savings = (cpu_savings + memory_savings) * 730
                    
                    results.append({
                        'pod': pod,
                        'current_cpu': current_cpu,
                        'current_memory': current_memory,
                        'optimal_cpu': optimal_cpu,
                        'optimal_memory': optimal_memory,
                        'monthly_savings': round(monthly_savings, 2),
                        'metrics': metrics,
                    })
            
            return results
        except Exception as e:
            return [{'error': str(e)}]
    
    def optimize_all_namespaces(self) -> Dict[str, List[Dict]]:
        """Optimize resources across all namespaces."""
        try:
            result = subprocess.run(
                ['kubectl', 'get', 'namespaces', '-o', 'jsonpath={.items[*].metadata.name}'],
                capture_output=True, text=True, check=True
            )
            namespaces = result.stdout.split()
            
            results = {}
            for namespace in namespaces:
                if namespace not in ['kube-system', 'kube-public', 'kube-node-lease']:
                    results[namespace] = self.analyze_namespace(namespace)
            
            return results
        except Exception as e:
            return {'error': str(e)}

# Usage example
if __name__ == "__main__":
    optimizer = K8sResourceOptimizer()
    
    # Get current namespace
    try:
        result = subprocess.run(
            ['kubectl', 'config', 'get-contexts', '--output', 'name'],
            capture_output=True, text=True, check=True
        )
        current_context = result.stdout.strip().split('*')[-1].strip()
    except Exception:
        current_context = "default"
    
    print("Kubernetes Resource Optimization")
    print("=" * 60)
    print(f"Current Context: {current_context}")
    
    results = optimizer.analyze_namespace(current_context)
    
    total_monthly_savings = 0
    
    for result in results:
        if 'monthly_savings' in result:
            if result['monthly_savings'] > 10:
                print(f"\nPod: {result['pod']}")
                print(f"  Current CPU: {result['current_cpu']}m")
                print(f"  Optimal CPU: {result['optimal_cpu']}m")
                print(f"  Monthly Savings: ${result['monthly_savings']:.2f}")
                total_monthly_savings += result['monthly_savings']
    
    print(f"\n" + "=" * 60)
    print(f"Total Monthly Savings: ${total_monthly_savings:.2f}")
```

---

## References
