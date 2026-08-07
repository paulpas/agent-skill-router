---
name: terraform-iac-patterns
description: Implements Terraform infrastructure as code patterns including modular design, remote state locking with S3/DynamoDB, workspace strategy, and plan/apply workflows for production-grade cloud provisioning.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: terraform iac, terraform modules, terraform state locking, terraform workspaces, terraform plan apply, hcl patterns
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - pulumi
    - crossplane
    - cloudformation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: infrastructure
  output-format: code
  content-types: [code, guidance, config, do-dont, examples]
  related-skills: cncf-terraform, coding-platform-engineering, cncf-kubernetes
---

# Terraform Infrastructure as Code Patterns

Senior infrastructure engineer designing, implementing, and reviewing production-grade Terraform projects. This skill makes the model build modular Terraform architectures with proper state isolation, configure remote backends with locking, apply workspace strategies for environment separation, and enforce plan/apply workflows that prevent accidental infrastructure drift.

## TL;DR Checklist

- [ ] Structure every project with `main.tf`, `variables.tf`, `outputs.tf`, and `versions.tf`
- [ ] Configure remote state backend with locking (S3+DynamoDB, GCS, or Azurerm)
- [ ] Pin Terraform and provider versions with `required_version` and `required_providers`
- [ ] Use modules for reusable components with clearly defined input/output contracts
- [ ] Run `terraform plan -out=tfplan` before any apply; never use `-auto-approve` in production
- [ ] Validate configuration with `terraform validate` and format with `terraform fmt`
- [ ] Tag all resources with `Environment`, `ManagedBy`, and `Project` at minimum

---

## When to Use

Use this skill when:

- Architecting a new Terraform project from scratch
- Refactoring a monolithic Terraform configuration into modular components
- Setting up remote state backends with locking for team collaboration
- Designing workspace strategies for multi-environment infrastructure
- Implementing plan/apply workflows with state management
- Auditing existing Terraform code for state security and module quality
- Migrating local state to a remote backend

---

## When NOT to Use

Avoid this skill for:

- Imperative infrastructure logic requiring complex control flow (use Pulumi or Crossplane instead)
- One-off resource provisioning where Terraform overhead is excessive
- Projects that already use CloudFormation or other IaC tools without a migration plan
- Managing application-level business logic — Terraform handles infrastructure only

---

## Core Workflow

1. **Define Project Structure** — Create the directory layout with `main.tf`, `variables.tf`, `outputs.tf`, and `versions.tf` at the root. Organize child modules under `modules/` with the same file convention. **Checkpoint:** Every module has at least a `main.tf`, `variables.tf`, and `outputs.tf` with typed inputs and documented outputs.

2. **Configure the Remote Backend** — Set up the backend block in `versions.tf` with the target cloud provider's remote storage and a locking table. Include `encrypt = true` and pin the Terraform version. **Checkpoint:** `terraform init` completes successfully against the remote backend with no state conflicts.

3. **Implement Modules** — Write or call modules that encapsulate related resources. Each module must define explicit variables with types and descriptions, and output meaningful identifiers. **Checkpoint:** Module inputs and outputs follow a consistent naming convention; no circular dependencies exist between modules.

4. **Plan and Review Changes** — Run `terraform plan -out=tfplan` to generate a deterministic execution plan. Review the plan output for unintended resource destruction or modification. **Checkpoint:** Plan output shows only the expected changes; no resources marked for `destroy` that were not intended.

5. **Apply with Guardrails** — Apply the plan file explicitly: `terraform apply tfplan`. For CI/CD pipelines, gate the apply behind a human approval step or merge queue. **Checkpoint:** Apply completes without errors and `terraform state list` reflects the desired resource inventory.

6. **Verify State Consistency** — Run `terraform state list` and optionally `terraform refresh` to ensure the real-world infrastructure matches the state file. Check for drift. **Checkpoint:** No unexpected resources in state; all managed resources show expected attributes.

---

## Implementation Patterns

### Pattern 1: Modular Project Structure with Root and Child Modules

Organize Terraform projects with a root module that orchestrates child modules. Each child module owns a specific infrastructure domain (networking, compute, databases).

```hcl
# environments/production/main.tf — Root module that orchestrates all child modules
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Environment = terraform.workspace
      Project     = var.project_name
    }
  }
}

locals {
  env_prefix = "${terraform.workspace}-${var.project_name}"
}

module "vpc" {
  source = "../../modules/vpc"

  project_name = var.project_name
  environment  = terraform.workspace
  cidr_block   = var.vpc_cidr
  azs          = var.availability_zones
}

module "rds" {
  source = "../../modules/rds"

  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  environment    = terraform.workspace
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class
}

module "eks" {
  source = "../../modules/eks"

  cluster_name    = "${local.env_prefix}-cluster"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  kubernetes_version = "1.30"
}
```

```hcl
# modules/vpc/variables.tf — VPC module input contract
variable "project_name" {
  description = "Name of the project; used for resource tagging and naming"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "cidr_block" {
  description = "CIDR block for the VPC"
  type        = string
  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "cidr_block must be a valid IPv4 CIDR range."
  }
}

variable "azs" {
  description = "List of availability zones for subnet placement"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}
```

```hcl
# modules/vpc/main.tf — VPC module implementation
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  count = length(var.azs)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.cidr_block, 8, count.index)
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.project_name}-${var.environment}-public-${var.azs[count.index]}"
    Environment = var.environment
  }
}

resource "aws_subnet" "private" {
  count = length(var.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.cidr_block, 8, count.index + length(var.azs))
  availability_zone = var.azs[count.index]

  tags = {
    Name        = "${var.project_name}-${var.environment}-private-${var.azs[count.index]}"
    Environment = var.environment
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-${var.environment}-igw"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-${var.environment}-pub-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = length(aws_subnet.public)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

```hcl
# modules/vpc/outputs.tf — VPC module output contract
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  value       = aws_subnet.private[*].cidr_block
}
```

### Pattern 2: Remote State with S3 Backend and DynamoDB Locking

State locking prevents concurrent modifications that corrupt the state file. Configure the S3 backend with a DynamoDB table for atomic lock acquisition.

```hcl
# environments/production/backend.tf — Backend configuration block
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-locks"

    # KMS encryption for additional protection
    # kms_key_id = "alias/terraform-state-key"
  }

  required_version = ">= 1.6.0"
}

# Data source for AWS caller identity (used across root module)
data "aws_caller_identity" "current" {}

# Data source for available availability zones
data "aws_availability_zones" "available" {
  state = "available"
}
```

```bash
# Initialize the backend and providers
# This downloads providers and configures the remote state backend
terraform init

# Reconfigure if backend settings have changed
terraform init -reconfigure

# Verify the backend is configured correctly
terraform state list
```

```hcl
# Example: GCS backend alternative for Google Cloud
# terraform {
#   backend "gcs" {
#     bucket  = "mycompany-terraform-state-gcs"
#     prefix  = "production/infrastructure"
#     project = "my-gcp-project"
#
#     # Enable object versioning on the bucket for state recovery
#     # gcloud storage buckets add-iam-policy-binding gs://mycompany-terraform-state-gcs \
#     #   --member=serviceAccount:terraform@my-gcp-project.iam.gserviceaccount.com \
#     #   --role=roles/storage.objectViewer
#   }
# }

# Example: Azure backend alternative for Azure resources
# terraform {
#   backend "azurerm" {
#     resource_group_name  = "terraform-state-rg"
#     storage_account_name = "tfstatemycompany"
#     container_name       = "tfstate"
#     key                  = "production/infrastructure/terraform.tfstate"
#     use_azuread_auth     = true
#   }
# }
```

### Pattern 3: Workspace Strategy for Environment Isolation

Workspaces provide lightweight separation for environments that share the same infrastructure structure. Use them for dev and staging; prefer separate states for production isolation.

```hcl
# environments/main.tf — Workspace-aware configuration
locals {
  workspace_configs = {
    dev = {
      instance_count = 1
      instance_type  = "t3.micro"
      db_instance    = "db.t3.micro"
      log_retention  = 7
    }
    staging = {
      instance_count = 2
      instance_type  = "t3.medium"
      db_instance    = "db.t3.medium"
      log_retention  = 30
    }
    production = {
      instance_count = 3
      instance_type  = "c6i.xlarge"
      db_instance    = "db.r6g.xlarge"
      log_retention  = 90
    }
  }

  current_config = lookup(
    local.workspace_configs,
    terraform.workspace,
    local.workspace_configs["dev"] # default to dev for unknown workspaces
  )
}

resource "aws_instance" "app" {
  count = local.current_config.instance_count

  ami           = data.aws_ami.amazon_linux.id
  instance_type = local.current_config.instance_type
  subnet_id     = module.vpc.public_subnet_ids[count.index % length(module.vpc.public_subnet_ids)]

  tags = {
    Name        = "${local.env_prefix}-app-${count.index}"
    Environment = terraform.workspace
  }
}

# Usage:
#   terraform workspace new dev
#   terraform workspace new staging
#   terraform workspace new production
#   terraform workspace select production
#   terraform plan
#   terraform apply
```

```bash
# Workspace management commands
# Create a new workspace
terraform workspace new development

# List all workspaces
terraform workspace list

# Select a workspace
terraform workspace select production

# Delete a workspace (must not be current)
terraform workspace delete staging

# Inline execution (avoids switching workspaces)
terraform plan -workspace=staging
terraform apply -auto-approve -workspace=production
```

### Pattern 4: Plan/Apply Workflow with Guardrails

The plan/apply workflow separates the preview phase from execution, enabling safe infrastructure changes with explicit approval.

```hcl
# environments/variables.tf — Environment-level variable definitions
variable "aws_region" {
  description = "AWS region for resource deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project; used for tagging and naming conventions"
  type        = string
  default     = "platform-infra"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for subnet placement"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "db_engine_version" {
  description = "PostgreSQL engine version for RDS"
  type        = string
  default     = "16.3"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.xlarge"
}

variable "kubernetes_version" {
  description = "EKS cluster Kubernetes version"
  type        = string
  default     = "1.30"
}

variable "environment" {
  description = "Environment name from workspace"
  type        = string
  default     = "dev"
}
```

```hcl
# environments/outputs.tf — Exposed outputs from the root module
output "vpc_id" {
  description = "VPC ID for networking reference"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs for compute placement"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs for database and internal services"
  value       = module.vpc.private_subnet_ids
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}
```

```bash
# Complete plan/apply workflow commands
# Step 1: Initialize the project
terraform init

# Step 2: Validate configuration syntax
terraform validate

# Step 3: Format configuration files
terraform fmt -recursive

# Step 4: Generate and save the execution plan
terraform plan -out=tfplan

# Step 5: Inspect the plan (review before applying)
#   Read the output carefully — look for unexpected deletes or modifications

# Step 6: Apply the saved plan explicitly
terraform apply "tfplan"

# Step 7: Verify state after apply
terraform state list
terraform state show aws_vpc.main

# Step 8: Check for drift (optional, runs in CI)
terraform plan -detailed-exitcode
# Exit code 0 = no changes, 1 = error, 2 = changes detected
```

### Pattern 5: Version Management with Data Sources

Use data sources to dynamically fetch AMI IDs, instance types, and other cloud resources. Pin version constraints to balance freshness with stability.

```hcl
# environments/data-sources.tf — Dynamic resource lookup via data sources
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-kernel-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "root-device-type"
    values = ["ebs"]
  }
}

data "aws_iam_policy_document" "assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_instance_profile" "app" {
  name = "${local.env_prefix}-instance-profile"
  role = aws_iam_role.app.name
}

resource "aws_iam_role" "app" {
  name               = "${local.env_prefix}-app-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

# Random password for RDS master password (never hardcode secrets)
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store database password in SSM Parameter Store
resource "aws_ssm_parameter" "db_password" {
  name  = "/${local.env_prefix}/db/password"
  type  = "SecureString"
  value = random_password.db_password.result
}
```

---

## Constraints

### MUST DO
- Always configure a remote backend with state locking for team environments; never rely on local state in production
- Pin Terraform `required_version` and all `required_providers` with version constraints to prevent breaking changes
- Structure every project with distinct files: `main.tf` (resources/modules), `variables.tf` (inputs), `outputs.tf` (outputs), `versions.tf` (backend/versions)
- Run `terraform plan -out=tfplan` and review the plan output before every apply; never use `-auto-approve` in production
- Tag all resources with `Environment`, `ManagedBy`, and `Project` tags via `default_tags` in the provider block
- Use modules for any resource pattern repeated more than once; define explicit typed variables and documented outputs
- Store sensitive values in SSM Parameter Store, HashiCorp Vault, or a secrets manager; never hardcode passwords or API keys
- Enable versioning on the S3 backend bucket for state file recovery after accidental corruption
- Use `terraform fmt -recursive` and `terraform validate` in CI/CD pipelines before any plan
- Use `random_password` or `random_id` resources for secrets instead of static values
- Use `sensitive = true` on outputs that expose credentials or tokens
- Use `cidrsubnet()` for predictable subnet allocation instead of manual CIDR calculations

### MUST NOT DO
- Never store state files in version control — state files contain sensitive data and drift from the live environment
- Never modify state files manually with `terraform state rm` or `mv` without understanding the full impact on managed resources
- Never use `terraform apply -auto-approve` in production environments without an approval gate
- Never hardcode cloud provider credentials — use IAM roles, workload identity, or environment-based authentication
- Never mix local and remote backends in the same configuration; pick one and stick to it
- Never delete the only workspace in a project — at least one workspace must always exist
- Never place production resources in the same state file as dev resources; separate states by environment or team ownership
- Never use `terraform destroy` on a production state without a signed approval workflow
- Never skip `terraform validate` — invalid HCL will cause unpredictable behavior during plan
- Never use `null_resource` or `local-exec` with shell commands for infrastructure that should be managed by native providers

---

## Output Template

When implementing or reviewing Terraform IaC, produce:

1. **Project Structure** — Directory tree showing module hierarchy with `main.tf`, `variables.tf`, `outputs.tf`, and `versions.tf` at each level.
2. **Backend Configuration** — Complete `backend` block with provider-specific settings, locking mechanism, and encryption configuration.
3. **Module Contracts** — Variables with types and descriptions, outputs with values and descriptions for each module.
4. **Plan/Apply Commands** — Exact CLI commands for init, validate, plan, and apply with the correct flags for the target environment.
5. **State Management** — Commands for state inspection (`terraform state list`, `show`) and drift detection (`terraform plan -detailed-exitcode`).

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-terraform` | General Terraform CLI usage and provider management reference |
| `coding-platform-engineering` | Platform engineering patterns including infrastructure testing and CI/CD for IaC |
| `cncf-kubernetes` | Kubernetes deployment and management; Terraform-managed EKS/GKE clusters |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Terraform Documentation — Getting Started](https://developer.hashicorp.com/terraform/tutorials/aws-get-started)
- [Terraform Configuration Language — HCL Syntax](https://developer.hashicorp.com/terraform/language)
- [Terraform Modules — Documentation](https://developer.hashicorp.com/terraform/language/modules)
- [Terraform State — Remote Backends and Locking](https://developer.hashicorp.com/terraform/language/settings/backends/s3)
- [Terraform Workspaces — Documentation](https://developer.hashicorp.com/terraform/language/state/workspaces)
- [Terraform CLI — Plan and Apply Commands](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [Terraform AWS Provider — Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
