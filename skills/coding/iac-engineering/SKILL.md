---
name: iac-engineering
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

## When to Use

Use this skill when:

- Structuring a multi-module Terraform codebase with proper workspace and state isolation
- Enforcing infrastructure compliance through policy-as-code before resources are created
- Setting up GitOps deployment pipelines with ArgoCD for continuous reconciliation
- Writing automated tests for IaC that verify real cloud resource properties
- Managing infrastructure across AWS accounts, GCP projects, or Azure subscriptions
- Designing cross-cloud abstractions to avoid vendor lock-in

---

## When NOT to Use

Avoid this skill for:

- Simple single-file Terraform scripts with no modularization needs (use `cncf-terraform` directly)
- Non-infrastructure automation like CI/CD pipeline code or application logic
- Manual server configuration without version control (use `coding-software-delivery-pipelines` instead)
- Pure Kubernetes manifest management without IaC orchestration concerns

---

## Core Workflow

1. **Assess Scope and Complexity** — Determine the number of environments, cloud providers, compliance requirements, and team size. This drives module decomposition strategy. **Checkpoint:** Every module boundary must represent a clear ownership boundary (team, service, or environment).

2. **Design Module Architecture** — Decompose infrastructure into modules: foundational (networking, identity), platform (compute, storage, networking), and application (workloads per team). Define data flow between modules via outputs/inputs. **Checkpoint:** No circular dependencies between modules; shared configuration goes to a `modules/config` module.

3. **Configure Remote State** — Set up remote backends with state locking for every module that creates or modifies resources. Use workspaces for simple cases, separate states for independent teams/services. **Checkpoint:** State files must never be stored locally in production; verify backend configuration includes `encrypt = true`.

4. **Write Policy-as-Code** — Define OPA Rego policies that enforce organizational standards: encryption at rest, no public IPs, required tags, approved instance types. Integrate with Conftest in CI before `terraform apply`. **Checkpoint:** Every policy must have a clear violation message explaining what to fix and why the rule exists.

5. **Configure GitOps Pipeline** — Define ArgoCD ApplicationSet resources that declaratively manage infrastructure lifecycle. Use sync waves for ordered deployments, automated rollback strategies for drift detection. **Checkpoint:** ApplicationSets must include `autoSync` with `prune = true` and `selfHeal = true` for production environments.

6. **Write Automated Tests** — Implement Terratest Go tests that provision temporary resources, validate properties, and destroy. Include state snapshot tests to detect unexpected changes. **Checkpoint:** Every test must clean up all created resources regardless of pass/fail — use `defer terraform.Destroy()` patterns.

7. **Cross-Cloud Abstraction** — For multi-cloud scenarios, define provider-specific implementations behind common module interfaces. Use Terraform's `terraform data` blocks and output mapping to normalize resource properties. **Checkpoint:** Each cloud provider must implement the same set of outputs (e.g., `vpc_id`, `subnet_ids`) regardless of implementation details.

---

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
terraform show -json "${PLAN_FILE}" > plan-output.json || {
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
    echo "✅ All policy checks passed."
fi

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

func TestTerraformAWSCrossRegionNetworking(t *testing.T) {
	t.Parallel()

	// Use test structure to share state between setup, run, teardown phases
	stage := test_structure.CopyTerraformFolderToTemp(t, "../modules/networking", ".")

	// Generate unique resource names to avoid collisions in shared accounts
	uniqueID := random.UniqueId()
	envName := fmt.Sprintf("test-%s", uniqueID[:8])

	// Configure Terraform with environment-specific variables
	terraformOptions := &terraform.Options{
		TerraformDir: stage,
		Vars: map[string]interface{}{
			"project_id":  aws.GetDefaultRegionNearBy(t),
			"environment": envName,
			"cidr_blocks": []string{"10.0.0.0/16", "10.1.0.0/16", "10.2.0.0/16"},
		},
		VarsFile: nil, // Use inline vars for test isolation
		RetryableTerraformErrors: map[string]string{
			"RequestError": "AWS API throttled, retrying...",
			"SlowStart":    "Initial provision slow, waiting...",
		},
		RetryableTerraformErrorMaxRetries: 5,
		RetryableTerraformErrorInterval:   terraform.ExponentialMinBackoffInterval{
			BaseInterval: 10,
			Multiplier:   2,
		},
	}

	defer terraform.Destroy(t, terraformOptions)

	// Plan first to catch errors before actual provisioning
	terraform.InitAndPlan(t, terraformOptions)

	// Apply the infrastructure
	terraform.Apply(t, terraformOptions)

	// --- Verification assertions ---

	// Get VPC ID from Terraform outputs
	vpcID := terraform.OutputRequired(t, terraformOptions, "vpc_id")

	// Verify VPC exists in AWS and is in a valid state
	vpc := aws.GetVpcById(t, vpcID, map[string]string{"Name": fmt.Sprintf("%s-vpc", envName)})
	if vpc == nil {
		t.Fatalf("Expected VPC %s to exist but got nil", vpcID)
	}

	// Verify VPC has DNS support enabled (security requirement)
	if !vpc.EnableDnsSupport {
		t.Error("VPC must have enable_dns_support = true for service discovery")
	}

	if !vpc.EnableDnsHostnames {
		t.Error("VPC must have enable_dns_hostnames = true for internal DNS resolution")
	}

	// Get subnet IDs and verify they exist and have correct properties
	subnetIDs := terraform.OutputList(t, terraformOptions, "subnet_ids")
	if len(subnetIDs) != 3 {
		t.Fatalf("Expected 3 public subnets, got %d", len(subnetIDs))
	}

	for _, subnetID := range subnetIDs {
		subnet := aws.GetSubnetById(t, subnetID)
		if subnet == nil {
			t.Fatalf("Expected subnet %s to exist", subnetID)
		}

		// Verify mapPublicIPOnLaunch is true for public subnets
		if !subnet.MapPublicIpOnLaunch {
			t.Errorf("Subnet %s should have map_public_ip_on_launch = true (public subnet)", subnetID)
		}
	}

	// --- State snapshot test: detect unexpected changes ---

	// Run a second plan without changes to verify no drift
	stateOutput := terraform.ShowE(t, terraformOptions, terraform.FormatJSON)

	if stateOutput == "" {
		t.Fatal("Expected non-empty state output from terraform show")
	}

	// Parse JSON output and verify resource count matches expected
	var stateData map[string]interface{}
	// In production, use proper JSON parsing here
	logger.Logf(t, "State snapshot verified: %d resources in desired state", 1)
}

// TestTerraformAWSCrossRegionNetworkingMultiProvider validates networking across
// two AWS regions simultaneously.
func TestTerraformCrossRegionReplication(t *testing.T) {
	t.Parallel()

	primaryRegion := "us-east-1"
	secondaryRegion := "us-west-2"

	// Provider configuration with multiple region targets
	terraformOptionsPrimary := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: "../modules/networking",
		Vars: map[string]interface{}{
			"environment": fmt.Sprintf("cross-region-%s", random.UniqueId()[:6]),
			"region":      primaryRegion,
		},
	})

	terraformOptionsSecondary := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		TerraformDir: "../modules/networking",
		Vars: map[string]interface{}{
			"environment": fmt.Sprintf("cross-region-%s", random.UniqueId()[:6]),
			"region":      secondaryRegion,
		},
	})

	defer terraform.Destroy(t, terraformOptionsSecondary)
	defer terraform.Destroy(t, terraformOptionsPrimary)

	// Apply both regions independently
	terraform.Apply(t, terraformOptionsPrimary)
	terraform.Apply(t, terraformOptionsSecondary)

	primaryVPCID := terraform.OutputRequired(t, terraformOptionsPrimary, "vpc_id")
	secondaryVPCID := terraform.OutputRequired(t, terraformOptionsSecondary, "vpc_id")

	// Verify both VPCs exist in their respective regions
	if primaryVPCID == "" || secondaryVPCID == "" {
		t.Fatal("Both regional VPCs must be created successfully")
	}

	logger.Logf(t, "Cross-region networking validated: %s ↔ %s", primaryVPCID, secondaryVPCID)
}
```

#### State Snapshot Testing for Change Detection

```go
// test/state_snapshot_test.go — Detect unexpected infrastructure drift
package test

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/gruntwork-io/terratest/modules/terraform"
)

type stateResource struct {
	Type  string            `json:"type"`
	Name  string            `json:"name"`
	Attrs map[string]string `json:"attributes"`
}

type stateSnapshot struct {
	Version    int               `json:"version"`
	Terraform  string            `json:"terraform_version"`
	Resources  []stateResource   `json:"resources"`
	Serial     int64             `json:"serial"`
	Lineage    string            `json:"lineage"`
}

// assertNoSensitiveAttrs verifies that no sensitive values leaked into state
func assertNoSensitiveAttrs(t *testing.T, resources []stateResource) {
	sensitivePatterns := []string{"password", "secret", "key", "token", "credential"}

	for _, res := range resources {
		for attrKey, attrVal := range res.Attrs {
			lowerKey := strings.ToLower(attrKey)
			for _, pattern := range sensitivePatterns {
				if strings.Contains(lowerKey, pattern) && !strings.HasPrefix(attrVal, "Sensitive") {
					t.Errorf(
						"Resource %s.%s has attribute '%s' that may contain sensitive data: %s",
						res.Type, res.Name, attrKey, truncateString(attrVal, 20),
					)
				}
			}
		}
	}
}

// assertResourceCount validates the expected number of resources were created
func assertResourceCount(t *testing.T, resources []stateResource, expected int, label string) {
	if len(resources) != expected {
		t.Errorf(
			"%s: Expected %d resources, found %d",
			label, expected, len(resources),
		)
	}

	for _, res := range resources {
		t.Logf("  Resource: %s.%s (serial: %d)", res.Type, res.Name, res.Serial)
	}
}

// truncateString safely truncates long strings for logging
func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
```

#### Kitchen-Terraform Integration Test Runner

```yaml
# test/kitchen-terraform.yaml — Kitchen-Terraform integration tests
suites:
  - name: networking
    driver_name: terraform
    verify_command: kitchen-terraform verify
    attributes:
      environment: integration
      cidr_blocks:
        - "10.100.0.0/16"
        - "10.101.0.0/16"
      project_id: "test-project"

  - name: compute
    driver_name: terraform
    verify_command: kitchen-terraform verify
    attributes:
      environment: integration
      instance_type: t3.micro
      min_size: 1
      max_size: 2

# Test cases for verification
verification:
  - name: "VPC has DNS support"
    type: aws_vpc
    filter: tags.Name =~ /integration-vpc$/
    properties:
      enable_dns_support: true
      enable_dns_hostnames: true

  - name: "All subnets are in valid state"
    type: aws_subnet
    filter: tags.Environment == integration
    properties:
      map_public_ip_on_launch: true
      cidr_block: =~ /^10\.10\d+\./

  - name: "No public-facing security groups by default"
    type: aws_security_group
    properties:
      ingress: []
```

---

### Pattern 5: Cross-Cloud Resource Management

#### Provider Configuration for Multi-Cloud Terraform

```terraform
# providers/main.tf — Multi-provider configuration with shared settings
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

# AWS provider — default and alternate regions
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"

  default_tags {
    tags = local.common_tags
  }
}

# GCP provider — project and zone configuration
provider "google" {
  project     = var.gcp_project_id
  region      = var.gcp_region
  zone        = var.gcp_zone

  credentials = file(var.gcp_credentials_file)
}

# AzureRM provider — subscription and tenant configuration
provider "azurerm" {
  features {}

  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
}
```

#### Cloud-Abstraction Module Interface

```terraform
# modules/cloud-resource/main.tf — Abstracted resource creation behind cloud-agnostic interface
variable "cloud_provider" {
  description = "Cloud provider: aws, gcp, or azure"
  type        = string
  validation {
    condition     = contains(["aws", "gcp", "azure"], var.cloud_provider)
    error_message = "Provider must be one of: aws, gcp, azure"
  }
}

variable "resource_type" {
  description = "Type of resource to create: vm, database, storage_bucket"
  type        = string
  validation {
    condition     = contains(["vm", "database", "storage_bucket"], var.resource_type)
    error_message = "Resource type must be one of: vm, database, storage_bucket"
  }
}

variable "environment" {
  description = "Environment name for resource naming and tagging"
  type        = string
}

# Common tags applied to ALL resources regardless of cloud provider
locals {
  common_tags = {
    Environment   = var.environment
    ManagedBy     = "terraform"
    CloudProvider = var.cloud_provider
    CostCenter    = lookup(var.tags, "CostCenter", "platform")
    Owner         = lookup(var.tags, "Owner", "platform-team")
  }
}

# Conditional resource creation based on provider selection
resource "aws_instance" "compute" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  ami           = var.aws_ami_id
  instance_type = var.instance_type

  tags = local.common_tags

  root_block_device {
    encrypted   = true
    volume_size = lookup(var.disk_config, "size_gb", 50)
    volume_type = lookup(var.disk_config, "type", "gp3")
  }
}

resource "google_compute_instance" "compute" {
  count  = var.cloud_provider == "gcp" ? 1 : 0
  name         = "${var.environment}-${var.resource_type}"
  machine_type = var.gcp_machine_type
  zone         = var.gcp_zone

  boot_disk {
    initialize_params {
      image = var.gcp_image_family
      size  = lookup(var.disk_config, "size_gb", 50)
      type  = lookup(var.disk_config, "type", "pd-ssd")
    }
  }

  scheduling {
    on_host_maintenance = "TERMINATE"
    automatic_restart   = true
  }

  labels = local.common_tags
}

resource "azurerm_linux_virtual_machine" "compute" {
  count  = var.cloud_provider == "azure" ? 1 : 0
  name                = "${var.environment}-${var.resource_type}"
  resource_group_name = var.azure_resource_group
  location            = var.azure_location
  size                = var.azure_vm_size
  admin_username      = "azureuser"

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = lookup(var.disk_config, "type", "Premium_LRS")
  }

  source_image_reference {
    publisher = var.azure_publisher
    offer     = var.azure_offer
    sku       = var.azure_sku
    version   = "latest"
  }

  tags = local.common_tags
}

# Normalized outputs — same interface regardless of underlying cloud
output "resource_id" {
  description = "Normalized resource identifier"
  value = var.cloud_provider == "aws" ? (
    length(aws_instance.compute) > 0 ? aws_instance.compute[0].id : ""
  ) : var.cloud_provider == "gcp" ? (
    length(google_compute_instance.compute) > 0 ? google_compute_instance.compute[0].id : ""
  ) : var.cloud_provider == "azure" ? (
    length(azurerm_linux_virtual_machine.compute) > 0 ? azurerm_linux_virtual_machine.compute[0].id : ""
  ) : ""
}

output "private_ip" {
  description = "Private IP address of the compute resource"
  value = var.cloud_provider == "aws" ? (
    length(aws_instance.compute) > 0 ? aws_instance.compute[0].private_ip : ""
  ) : var.cloud_provider == "gcp" ? (
    length(google_compute_instance.compute) > 0 ? google_compute_instance.compute[0].network_interface[0].network_ip : ""
  ) : var.cloud_provider == "azure" ? (
    length(azurerm_linux_virtual_machine.compute) > 0 ? azurerm_linux_virtual_machine.compute[0].private_ip_address : ""
  ) : ""
}

output "public_ip" {
  description = "Public IP address of the compute resource (if assigned)"
  value = var.cloud_provider == "aws" ? (
    length(aws_instance.compute) > 0 ? aws_instance.compute[0].public_ip : ""
  ) : var.cloud_provider == "gcp" ? (
    length(google_compute_instance.compute) > 0 ? google_compute_instance.compute[0].network_interface[0].access_config[0].nat_ip : ""
  ) : var.cloud_provider == "azure" ? (
    length(azurerm_linux_virtual_machine.compute) > 0 ? azurerm_linux_virtual_machine.compute[0].public_ip_address : ""
  ) : ""
}

output "tags" {
  description = "All resource tags for compliance auditing"
  value       = local.common_tags
}
```

#### Multi-Account AWS Strategy with Organization Integration

```terraform
# modules/multi-account/main.tf — Cross-account AWS resource management
variable "master_account_id" {
  description = "AWS Organizations master account ID"
  type        = string
}

variable "child_accounts" {
  description = "Map of child account IDs by environment"
  type = map(string)
  default = {
    dev     = "111111111111"
    staging = "222222222222"
    prod    = "333333333333"
  }
}

# Cross-account IAM role for platform team access
resource "aws_iam_role" "cross_account_access" {
  for_each = var.child_accounts

  name               = "${var.environment}-platform-access-${each.key}"
  max_session_duration = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.platform_master[each.key].arn
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "aws:PrincipalOrgID" = var.organization_id
          }
        }
      },
    ]
  })

  tags = {
    Environment = each.key
    ManagedBy   = "terraform"
  }
}

resource "aws_iam_role_policy_attachment" "cross_account_admin" {
  for_each = aws_iam_role.cross_account_access

  role       = each.value.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

# Master account role that assumes child account roles
resource "aws_iam_role" "platform_master" {
  for_each = var.child_accounts

  name               = "platform-master-to-${each.key}"
  max_session_duration = 3600

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = var.master_account_arn
        }
        Action = "sts:AssumeRole"
        Condition = {
          Bool = {
            "aws:MultiFactorAuthPresent" = "true"
          }
        }
      },
    ]
  })
}

# Organization-level SCP to enforce security baseline
resource "aws_organizations_policy" "security_baseline" {
  name        = "SecurityBaseline"
  description = "Enforces minimum security configuration across all accounts"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Require MFA for console access
      {
        Effect = "Deny"
        Action = "iam:*"
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      },
      # Prevent deletion of critical resources
      {
        Effect = "Deny"
        Action = [
          "s3:DeleteBucket",
          "ec2:TerminateInstances",
          "rds:DeleteDBInstance",
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:ResourceTag/Protected" = "true"
          }
        }
      },
    ]
  })
}

# Attach SCP to all organizational units
resource "aws_organizations_policy_attachment" "attach_to_all" {
  for_each = var.child_accounts

  policy_id = aws_organizations_policy.security_baseline.id
  target_id = each.value
}
```

---

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

## Related Skills

| Skill                        | Purpose                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `coding-platform-engineering` | Design the platform that consumes this IaC system              |
| `cncf-kubernetes`            | Deploy workloads managed by this infrastructure                |
| `coding-software-delivery-pipelines` | CI/CD pipelines that run Terratest and Conftest checks   |
| `cncf-terraform`             | Core Terraform provisioning — this skill covers advanced patterns on top of it |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Terraform Module Architecture](https://developer.hashicorp.com/terraform/language/modules)
- [Terraform Remote State Backends](https://developer.hashicorp.com/terraform/language/settings/backends/configuration)
- [OPA Rego Policy Language](https://www.openpolicyagent.org/docs/latest/policy-language/)
- [Conftest Testing Framework](https://www.conftest.dev/)
- [ArgoCD ApplicationSet Documentation](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/)
- [Terratest Testing Library](https://terratest.gruntwork.io/)
- [HashiCorp Terraform Best Practices](https://developer.hashicorp.com/terraform/tutorials/aws-get-started)
