---
name: devops-infrastructure-as-code
description: Implements best practices for Infrastructure as Code (IaC) management and automation in the DevOps workflow, focusing on tools and methodologies.
license: MIT
compatibility: opencode
metadata:
version: "1.1.1"
  domain: devops
  triggers: infrastructure as code, IaC, automation, cloud provisioning, devops practices
  archetypes: [implementation, orchestration]
  anti_triggers: [manual infrastructure provisioning, ad-hoc scripting]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: infrastructure
  output-format: code
---

## Infrastructure as Code (IaC) in DevOps: Best Practices
Infrastructure as Code (IaC) is essential for automating and managing infrastructure through code. This model ensures consistency and efficiency in the deployment process. Below are detailed practices and strategies for implementing IaC successfully:

### Core Principles:
1. **Version Control for Infrastructure**: Use Git to manage your infrastructure configurations alongside application code, effectively monitoring changes and rollbacks.
2. **Automation Tools**: Leverage tools like Terraform, AWS CloudFormation, and Ansible to facilitate infrastructure management and deployments through code.
3. **Environment Consistency**: Ensure consistent environments across development, testing, and production by using automated provisioning tools to minimize discrepancies.

### Security Best Practices:
- **Review Access Control**: Regularly audit and restrict IAM policies governing access to infrastructure management tools and resources.
- **Sensitive Data Management**: Store secrets securely using services like AWS Secrets Manager or HashiCorp Vault to manage sensitive information.
- **Logging and Monitoring**: Incorporate logging and monitoring systems (e.g., AWS CloudTrail, Datadog) to track infrastructure changes and maintain compliance.

### Example Workflow for IaC Implementation:
Implementing infrastructure using Terraform:
```bash
# Define your infrastructure in a main.tf file
provider "aws" {
  region = "us-west-2"
}

resource "aws_instance" "app_server" {
  ami = "ami-abc123"
  instance_type = "t2.micro"
}

# Initialize the directory and apply your configuration
terraform init
terraform apply
```

### Measuring Success of IaC Practices:
Use key metrics like deployment frequency, success rates, and mean time to recovery (MTTR) to monitor the effectiveness and improvements in infrastructure management.

### FAQs on Infrastructure as Code Best Practices:
- **What are the primary benefits of adopting IaC?**  
IaC provides automated deployments, reducing manual errors and ensuring repeatable and predictable infrastructure setups.
- **How do I ensure compliance?**  
Regularly audit your IaC configurations against compliance policies and utilize tools that allow for policy as code, such as Terraform Sentinel.
- **Can IaC be used for legacy systems?**  
Yes, while challenging, IaC can be adapted for legacy systems with appropriate planning and incremental adoption.

By implementing effective Infrastructure as Code strategies, organizations not only foster a more agile DevOps environment but also enhance their ability to deploy infrastructure securely and consistently, improving overall operational efficiency and responsiveness to changing business needs.

---

---



### Pattern 2: Terraform Module Structure for Production

```terraform
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  tags = { Name = "${var.environment}-vpc" }
}

resource "aws_subnet" "public" {
  count             = length(var.public_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = { Name = "${var.environment}-public-${count.index + 1}" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.environment}-igw" }
}

# RDS Module
resource "aws_db_instance" "main" {
  identifier     = var.db_identifier
  engine         = "postgres"
  instance_class = var.instance_class
  storage_type   = "gp3"
  multi_az       = true
  deletion_protection = true

  backup_retention_period = 7
}
```

## Constraints

### MUST DO
- Validate all inputs at function boundaries before processing — guard clauses should fail early with descriptive errors
- Implement proper error handling that distinguishes between recoverable and unrecoverable failures
- Add comprehensive logging with structured context (correlation IDs, operation names, timing) for debugging and monitoring
- Write unit tests covering normal operations, edge cases, and error conditions before integrating the component

### MUST NOT DO
- Do not silently swallow exceptions — always log or propagate errors with meaningful context
- Avoid unbounded resource allocation without limits (connection pools, memory buffers, thread counts)
- Never use hardcoded credentials, API keys, or secrets in source code
- Do not bypass input validation for perceived performance gains


## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links to resolve external references and inline content.

- [Terraform Documentation](https://www.terraform.io/docs)
- [AWS CloudFormation User Guide](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/)
- [Ansible Documentation](https://docs.ansible.com/ansible/latest/)
- [Infrastructure as Code Best Practices (HashiCorp)](https://developer.hashicorp.com/terraform/tutorials)
- [Terraform Registry — Provider Reference](https://registry.terraform.io/)