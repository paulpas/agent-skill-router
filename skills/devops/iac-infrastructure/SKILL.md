---




name: iac-infrastructure
description: Implements advanced IaC engineering patterns including modular Terraform architecture, policy-as-code with OPA, GitOps with ArgoCD, Terratest-driven testing, and cross-cloud multi-account resource management for production infrastructure.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: Terraform modules, policy as code, OPA Conftest, GitOps ArgoCD, IaC testing, Terratest, how do i manage terraform state
  archetypes:
    - tactical
    - orchestration
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: infrastructure
  output-format: code
  content-types: [code, guidance, do-dont, config, examples]
  related-skills: coding-platform-engineering, cncf-kubernetes, coding-software-delivery-pipelines, cncf-terraform




---




# Infrastructure as Code Engineering
Acts as a senior infrastructure engineer who designs, implements, and validates production-grade IaC systems. This skill makes the model build modular Terraform architectures with proper state isolation, enforce compliance through policy-as-code (OPA/Conftest), orchestrate deployments via GitOps workflows (ArgoCD), write automated tests using Terratest, and manage resources across multiple cloud providers and accounts.
## TL;DR Checklist
- [ ] Structure every Terraform project with a root module calling child modules per environment or service
- [ ] Configure remote state backends with locking (S3+DynamoDB, GCS+Cloud SQL, Azurerm)
- [ ] Write OPA Rego policies that reject non-compliant resources at plan time via Conftest
- [ ] Define ArgoCD ApplicationSets for declarative, label-selector-based resource provisioning
- [ ] Run Terratest Go tests against real infrastructure after every apply in CI pipelines
- [ ] Abstract cloud-specific resources behind common interfaces for cross-cloud portability
---
## Core Workflow
Assess Scope and Complexity: Determine the number of environments, cloud providers, compliance requirements, and team size. This drives module decomposition strategy. **Checkpoint:** Every module boundary must represent a clear ownership boundary (team, service, or environment).; Design Module Architecture: Decompose infrastructure into modules: foundational (networking, identity), platform (compute, storage, networking), and application (workloads per team). Define data flow between modules via outputs/inputs. **Checkpoint:** No circular dependencies between modules; shared configuration goes to a `modules/config` module.; Configure Remote State: Set up remote backends with state locking for every module that creates or modifies resources. Use workspaces for simple cases, separate states for independent teams/services. **Checkpoint:** State files must never be stored locally in production; verify backend configuration includes `encrypt = true`.; Write Policy-as-Code: Define OPA Rego policies that enforce organizational standards: encryption at rest, no public IPs, required tags, approved instance types. Integrate with Conftest in CI before `terraform apply`. **Checkpoint:** Every policy must have a clear violation message explaining what to fix and why the rule exists.; Configure GitOps Pipeline: Define ArgoCD ApplicationSet resources that declaratively manage infrastructure lifecycle. Use sync waves for ordered deployments, automated rollback strategies for drift detection. **Checkpoint:** ApplicationSets must include `autoSync` with `prune = true` and `selfHeal = true` for production environments.; Write Automated Tests: Implement Terratest Go tests that provision temporary resources, validate properties, and destroy. Include state snapshot tests to detect unexpected changes. **Checkpoint:** Every test must clean up all created resources regardless of pass/fail — use `defer terraform.Destroy()` patterns.; Cross-Cloud Abstraction: For multi-cloud scenarios, define provider-specific implementations behind common module interfaces. Use Terraform's `terraform data` blocks and output mapping to normalize resource properties. **Checkpoint:** Each cloud provider must implement the same set of outputs (e.g., `vpc_id`, `subnet_ids`) regardless of implementation details.---
## Implementation Patterns
### Pattern 1: Modular Terraform Architecture
#### Module Composition with Workspace Isolation
```terraform
# modules/networking/main.tf — Shared VPC networking module
variable "project_id" {
  description = "GCP project ID or AWS account ID depending on provider"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "cidr_blocks" {
  description = "List of CIDR blocks for VPC subnets"
  type        = list(string)
  default     = ["10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16"]
}

resource "aws_vpc" "main" {
  cidr_block           = var.cidr_blocks[0]
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  for_each = toset(var.cidr_blocks)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value
  map_public_ip_on_launch = true
  availability_zone       = data.aws_availability_zones.available.names[index(var.cidr_blocks, each.value)]

  tags = {
    Name        = "${var.environment}-public-${each.key}"
    Environment = var.environment
  }
}

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "subnet_ids" {
  description = "List of public subnet IDs"
  value       = [for s in aws_subnet.public : s.id]
}

output "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  value       = var.cidr_blocks[1:]
}
```
#### Root Module with Workspace Strategy
```terraform
# environments/production/main.tf — Production root module
locals {
  common_tags = {
    ManagedBy   = "terraform"
    Environment = terraform.workspace
    Project     = "platform-infra"
    Owner       = "platform-team"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

module "networking" {
  source      = "../../modules/networking"
  project_id  = data.aws_caller_identity.current.account_id
  environment = terraform.workspace
  cidr_blocks = var.vpc_cidrs
}

module "compute" {
  source       = "../../modules/compute"
  vpc_id       = module.networking.vpc_id
  subnet_ids   = module.networking.subnet_ids
  environment  = terraform.workspace
  instance_type = "c6i.xlarge"
  min_size     = var.compute_min_size
  max_size     = var.compute_max_size
}

module "observability" {
  source      = "../../modules/observability"
  vpc_id      = module.networking.vpc_id
  environment = terraform.workspace
  log_retention_days = 90
}

# Workspaces for environment isolation
#   terraform workspace select dev
#   terraform workspace select staging
#   terraform workspace select production
```
#### Remote State with S3 Backend and DynamoDB Locking
```terraform
# environments/production/backend.tf — Remote state configuration
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/networking/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"

    # Enable versioning for state file recovery
    # Ensure S3 bucket has versioning enabled:
    #   aws s3api put-bucket-versioning \
    #     --bucket mycompany-terraform-state \
    #     --versioning-configuration Status=Enabled
  }

  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}
```
---
### Pattern 2: Policy-as-Code with OPA and Conftest
#### Rego Policy: Require Encryption at Rest
```rego
# policies/encryption.rego — All storage resources must have encryption enabled
package terraform.aws

deny[msg] {
    resource := input.resource[_]
    not resource.create_before_destroy

    # Check S3 buckets for server-side encryption
    resource.type == "aws_s3_bucket"
    not_encrypted(resource)

    msg = sprintf(
        "S3 bucket '%s' (%s) must have server-side encryption enabled. Add 'server_side_encryption_configuration' block.",
        [resource.name, resource.address]
    )
}

not_encrypted(r) {
    not r.server_side_encryption_configuration[_].rule[_].apply_server_side_encryption_by_default[_]
}

deny[msg] {
    resource := input.resource[_]
    resource.type == "aws_ebs_volume"
    not resource.encrypted

    msg = sprintf(
        "EBS volume '%s' (%s) must have 'encrypted = true'. Unencrypted volumes risk data exposure.",
        [resource.name, resource.address]
    )
}

deny[msg] {
    resource := input.resource[_]
    resource.type == "aws_db_instance"
    not resource.storage_encrypted

    msg = sprintf(
        "RDS instance '%s' (%s) must have 'storage_encrypted = true'. Database encryption is mandatory.",
        [resource.name, resource.address]
    )
}

deny[msg] {
    resource := input.resource[_]
    resource.type == "aws_efs_file_system"
    not resource.encrypted

    msg = sprintf(
        "EFS file system '%s' (%s) must have 'encrypted = true'. File storage encryption is required.",
        [resource.name, resource.address]
    )
}
```
#### Rego Policy: Enforce Required Tags
```rego
# policies/required-tags.rego — All resources must carry compliance tags
package terraform.aws.tags

import rego.v1

compliance_tags := {"Environment", "Project", "Owner", "CostCenter", "DataClassification"}

deny[msg] {
    resource := input.resource[_]
    tags := resource.tags
    required := compliance_tags[_]
    not tags[required]

    msg = sprintf(
        "Resource '%s' (%s) is missing required tag '%s'. All resources must include: %v",
        [resource.name, resource.address, required, compliance_tags]
    )
}

# Allow data sources and outputs to be exempt from tagging
allow {
    input.resource[_].type == "data"
}
```
#### Conftest CI Integration
```bash
#!/usr/bin/env bash
set -euo pipefail

# conftest-ci.sh — Run OPA policy checks in CI pipeline
# This script runs after terraform plan to validate the proposed changes

readonly PLAN_FILE="${PLAN_FILE:-plan.json}"
readonly CONFTEST_VERSION="1.25.0"
readonly POLICY_DIR="./policies"
readonly EXIT_CODE=0

echo "Running OPA/Conftest policy checks..."
echo "  Plan file: ${PLAN_FILE}"
echo "  Policy dir: ${POLICY_DIR}"

# Convert Terraform plan JSON to a format Conftest can evaluate
# Using terraform-json-converter for accurate state representation
tf show -json "${PLAN_FILE}" > plan-output.json || {
    echo "ERROR: Failed to generate plan JSON" >&2
    exit 1
}

# Run Conftest against the plan output
conftest test \
    --policy "${POLICY_DIR}" \
    --namespace terraform \
    --report json \
    -o report-conftest.json \
    plan-output.json

EXIT_CODE=$?

# Generate human-readable summary
if [ ${EXIT_CODE} -ne 0 ]; then
    echo "❌ Policy violations detected:"
    jq -r '.[] | "  [\(.rule)] \(.file):\(.line) - \(.message)"' report-conftest.json || true
    echo ""
    echo "Fix the above violations before proceeding."
else
    echo "✅ All policy checks passed."i

echo "Run the CI pipeline with the following command:"
echo "  conftest test --policy ./policies"

exit ${EXIT_CODE}
```
#### Conftest Configuration
```yaml
# conftest.yaml — Conftest configuration for IaC validation
plugins:
  terraform:
    enabled: true
    cache: true

# Test directories
tests:
  - path: policies
    namespace: terraform.aws

# Required policy packages
packages:
  - terraform.aws
  - terraform.aws.tags

# Exit behavior
exit_code: 1

# Allow specific exceptions with justification
exceptions:
  - policy: terraform.aws.deny
    rule: not_encrypted
    resource_type: aws_instance
    reason: "Temporary migration phase — encrypted by AMI, cannot change mid-lifecycle"
    expires: "2026-06-30"
```
---
### Pattern 3: GitOps Workflows with ArgoCD
#### ApplicationSet for Multi-Environment Infrastructure
```yaml
# argocd/applicationset.yaml — Declarative infrastructure provisioning
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: platform-infrastructure
  namespace: argocd
  labels:
    team: platform
    managed-by: argocd-applicationset
spec:
  generators:
    # Generate one Application per environment using list generator
    - list:
        elements:
          - environment: dev
            cluster: https://k8s-dev.example.com
            namespace: infra-dev
            replicas: 1
            enable_monitoring: "true"
            backup_enabled: "false"

          - environment: staging
            cluster: https://k8s-staging.example.com
            namespace: infra-staging
            replicas: 2
            enable_monitoring: "true"
            backup_enabled: "true"

          - environment: production
            cluster: https://k8s-prod.example.com
            namespace: infra-production
            replicas: 3
            enable_monitoring: "true"
            backup_enabled: "true"
            sre_oncall: "platform-team"

  template:
    metadata:
      name: 'infra-{{environment}}'
      labels:
        environment: '{{environment}}'
        managed-by: argocd
    spec:
      project: platform-infra
      syncWindow:
        - kind: allow
          schedule: '0 2 * * *'
          duration: 1h
          applications:
            - infra-{{environment}}
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
          allowEmpty: false
        syncOptions:
          - CreateNamespace=true
          - PruneLast=true
          - RespectIgnoreDeletions=true
      source:
        repoURL: https://github.com/company/platform-infra.git
        targetRevision: HEAD
        path: 'environments/{{environment}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{namespace}}'

      # Sync waves ensure ordered deployment:
      #   Wave 0: Networking (VPC, subnets, route tables)
      #   Wave 1: Identity (IAM roles, service accounts)
      #   Wave 2: Compute (EKS clusters, worker groups)
      #   Wave 3: Observability (monitoring stack, logging)
      #   Wave 4: Application workloads
```
#### Automated Rollback with Sync Waves and Health Checks
```yaml
# argocd/sync-waves.yaml — Ordered infrastructure deployment with health gates
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: infra-networking-prod
  namespace: argocd
spec:
  project: platform-infra
  source:
    repoURL: https://github.com/company/platform-infra.git
    targetRevision: HEAD
    path: environments/production/modules/networking
  destination:
    server: https://k8s-prod.example.com
    namespace: infra-production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
    retry:
      limit: 3
      backoff:
        duration: 30s
        factor: 2
        maxDuration: 5m

---
# argocd/health-checks.yaml — Custom health checks for infrastructure resources
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-health-checks
  namespace: argocd
 data:
  networkResourceHealth.lua: |
    local status = {}

    if obj.status == nil or obj.status.conditions == nil then
      status.status = "Progressing"
      status.message = "Waiting for resource status"
      return status
    end

    for _, condition in ipairs(obj.status.conditions) do
      if condition.type == "Ready" and condition.status == "True" then
        status.status = "Healthy"
        status.message = "Resource is ready"
        return status
      elseif condition.type == "Ready" and condition.status == "False" then
        status.status = "Degraded"
        status.message = condition.message or "Resource not ready"
        return status
      end
    end

    status.status = "Progressing"
    status.message = "No Ready condition found yet"
    return status
```
#### ArgoCD Rollout and Rollback Strategy
```python
#!/usr/bin/env python3
"""argocd_rollback.py — Automated rollback helper for ArgoCD-managed infrastructure.

Checks application health, triggers rollback on failure detection,
and notifies the platform team via Slack webhook.
"""

import subprocess
import json
import sys
from datetime import datetime, timezone

def get_application_health(app_name: str, namespace: str = "argocd") -> dict:
    """Query ArgoCD for application health status."""
    result = subprocess.run(
        ["argocd", "app", "get", app_name, "-n", namespace, "--output", "json"],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"Failed to get application {app_name}: {result.stderr}")

    return json.loads(result.stdout)

def trigger_rollback(app_name: str, revision: str = "HEAD", namespace: str = "argocd") -> dict:
    """Trigger a rollback to a specific Git revision."""
    result = subprocess.run(
        [
            "argocd", "app", "rollback", app_name,
            "-r", revision,
            "-n", namespace,
            "--output", "json",
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"Rollback failed for {app_name}: {result.stderr}")

    return json.loads(result.stdout)

def check_infrastructure_drift(app_name: str) -> bool:
    """Detect configuration drift between Git state and live infrastructure."""
    app = get_application_health(app_name)
    sync_status = app.get("status", {}).get("sync", {})
    health_status = app.get("status", {}).get("health", {})

    is_out_of_sync = sync_status.get("status") != "Synced"
    is_degraded = health_status.get("status") == "Degraded"
    is_missing = health_status.get("status") == "Missing"

    return is_out_of_sync and (is_degraded or is_missing)

def main() -> int:
    """Main entry point for drift detection and automated rollback."""
    applications = sys.argv[1:] if len(sys.argv) > 1 else ["infra-networking-prod", "infra-compute-prod"]

    rollback_triggered = False

    for app_name in applications:
        try:
            if check_infrastructure_drift(app_name):
                print(f"[{datetime.now(timezone.utc).isoformat()}] Drift detected: {app_name}")

                # Trigger rollback to last known good commit
                app_health = get_application_health(app_name)
                history = app_health.get("status", {}).get("history", [])

                if history:
                    last_good_revision = history[-1].get("revision", "HEAD")
                    print(f"  Rolling back {app_name} to revision {last_good_revision}")
                    trigger_rollback(app_name, revision=last_good_revision)
                    rollback_triggered = True
                else:
                    print(f"  WARNING: No sync history for {app_name}, cannot rollback automatically")
            else:
                print(f"[{datetime.now(timezone.utc).isoformat()}] OK: {app_name} is in sync and healthy")

        except Exception as exc:
            print(f"ERROR checking {app_name}: {exc}", file=sys.stderr)
            return 1

    return 0 if not rollback_triggered else 2

if __name__ == "__main__":
    sys.exit(main())
```
---
### Pattern 4: IaC Testing with Terratest (Go)
#### Base Terratest Test Structure
```go
// test/networking_test.go — Terratest for Terraform networking modules
package test

import (
	"fmt"
	"testing"

	"github.com/gruntwork-io/terratest/modules/aws"
	"github.com/gruntwork-io/terratest/modules/logger"
	"github.com/gruntwork-io/terratest/modules/random"
	"github.com/gruntwork-io/terratest/modules/terraform"
	test_structure "github.com/gruntwork-io/terratest/modules/test-structure"
)

do the rest

```
## Constraints
### MUST DO
- Structure Terraform modules with clear ownership boundaries — one team owns one module hierarchy
- Always use remote state backends with locking in production (S3+DynamoDB, GCS, Azurerm)
- Encrypt all state files and the backend storage bucket
- Write OPA/Conftest policies that fail CI when non-compliant resources are detected
- Integrate Terratest into CI pipelines — tests must run after every PR that modifies Terraform
- Use ArgoCD ApplicationSets for declarative infrastructure lifecycle, not individual Applications
- Ensure all cross-cloud modules expose normalized outputs (`resource_id`, `private_ip`, `tags`)
- Tag every resource with Environment, ManagedBy, Owner, and CostCenter at minimum
- Include automatic rollback strategies in all GitOps configurations (selfHeal + prune)
- Clean up all test infrastructure in Terratest via defer patterns regardless of test outcome
### MUST NOT DO
- Store Terraform state files locally in production environments
- Hardcode cloud provider credentials — always use IAM roles, workload identity, or managed identities
- Skip policy-as-code checks in CI — compliance must be enforced before apply
- Create circular module dependencies — if A imports B, B must not import A
- Use `terraform workspace` for independent team separation — use separate state files instead
- Apply Terraform changes manually in production — always route through GitOps/ArgoCD
- Allow public IPs on database or internal service subnets without explicit approval and logging
- Ignore Conftest violations to unblock CI — fix the root cause, do not add exceptions as a workaround
- Mix multiple environments in a single Terraform state file for production workloads
---
## Output Template
When implementing or reviewing IaC systems, produce:
1. **Architecture Decision** — Module structure diagram (ASCII) showing hierarchy and data flow
2. **State Strategy** — Backend configuration with locking, workspace plan, or separation strategy
3. **Policy Suite** — OPA Rego policies for each compliance concern, with violation messages
4. **GitOps Configuration** — ArgoCD ApplicationSet YAML with sync waves and rollback strategy
5. **Test Coverage** — Terratest Go tests covering resource creation, property validation, and cleanup
6. **Cross-Cloud Mapping** — Normalized output definitions and provider-specific implementations table
---
## Live References
> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.
- 
---