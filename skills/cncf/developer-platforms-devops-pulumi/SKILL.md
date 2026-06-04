---




name: developer-platforms-devops-pulumi
description: Implements detailed Pulumi deployment processes in cloud environments, focusing on stacks, resources, programs, deployments, and best practices for effective infrastructure management.
license: MIT
compatibility: opencode
metadata:
  archetypes: implementation, orchestration
  anti_triggers: cloud management, infrastructure as code
  response_profile:
      verbosity: medium
      directive_strength: high

  version: "1.0.0"
  domain: cncf
  triggers: pulumi, infrastructure as code, stacks, cloud deployments, resource management, best practices, pulumi examples
  role: implementation
  scope: infrastructure
  output-format: code
  related-skills: pulumi, pulumi-aws, pulumi-azure, pulumi-gcp




---




# Developer Platforms & DevOps - Pulumi
Implements detailed Pulumi deployment processes in cloud environments, focusing on stacks, resources, programs, deployments, and best practices for effective infrastructure management.

## TL;DR Checklist
- [ ] Use Pulumi's native SDK for language flexibility (Python, TypeScript, Go)
- [ ] Set up remote state management (S3, Azure Blob, GCS) for team collaboration
- [ ] Organize infrastructure into distinct stacks for different environments (dev, staging, production)
- [ ] Use resource dependencies for automatic ordering
- [ ] Leverage the preview feature to check changes before applying with `pulumi preview`
- [ ] Implement a tagging strategy across resources for visibility
- [ ] Utilize Pulumi's secrets management for sensitive information
- [ ] Enable state locking to prevent concurrent modifications
- [ ] Write modular code for resource definitions to promote reusability and clarity

## Core Workflow
Pulumi's infrastructure management follows these steps:
1. **Configuration**: Define infrastructure layout via Pulumi SDK in your preferred language.
2. **Project Initialization**: Utilize `pulumi new <template>` to scaffold a new project. 
3. **Stack Management**: Use `pulumi stack init <stack-name>` to create and manage stacks for different environments.
4. **Resource Definition**: Declare resources including compute, storage, and networking components in your codebase.
5. **Preview**: Validate proposed changes with `pulumi preview` to avoid unintended changes.
6. **Deployment**: Execute `pulumi up` to deploy the defined infrastructure.
7. **Monitoring**: Inspect current infrastructure with `pulumi stack` and adjust configurations as necessary.

## Implementation Patterns

### Pattern 1: Stack Creation
_A foundational setup for organizing projects into stacks._
```python
import pulumi
import pulumi_aws as aws

def create_stack(environment):
    # Create a new stack
    pulumi.stack.create_stack(env=environment)
    print(f"Stack '{environment}' has been created.")

# Initialize the stack based on environment
create_stack("development")
```

### Pattern 2: Resource Definition
_Detailing how to define various resources with potential dependencies._
```python
import pulumi
import pulumi_aws as aws
from typing import Optional

# Example function to provision an EC2 instance
def create_ec2_instance(environment: str, instance_type: Optional[str] = "t2.micro"):
    ami = aws.ec2.get_ami(most_recent=True, owners=["amazon"], filters=[aws.ec2.GetAmiFilterArgs(
        name="name",
        values=["amzn2-ami-hvm-*-x86_64-gp2"],
    )])
    instance = aws.ec2.Instance(
        f"{environment}-instance",
        ami=ami.id,
        instance_type=instance_type,
        tags={
            "Name": f"{environment}-instance",
        }
    )
    return instance

# Creating an EC2 based on environment
create_ec2_instance("production")
```

### Pattern 3: Deployments
_Implementing deployment strategies to manage application lifecycle._
```python
import pulumi
import pulumi_kubernetes as k8s

def deploy_k8s_app(app_name: str, image: str):
    # Define a Kubernetes Deployment for the application
    deployment = k8s.apps.v1.Deployment(app_name, spec=k8s.apps.v1.DeploymentSpec(
        replicas=2,
        selector={
            "matchLabels": {"app": app_name}
        },
        template=k8s.core.v1.PodTemplateSpec(
            metadata={
                "labels": {"app": app_name}
            },
            spec=k8s.core.v1.PodSpec(
                containers=[{
                    "name": app_name,
                    "image": image,
                    "ports": [{"containerPort": 80}]
                }]
            )
        )
    ))
    return deployment

# Deploy application in Kubernetes
# Example usage
deploy_k8s_app("myapp", "myapp:latest")
```

### Pattern 4: Best Practices
_Capture the best practices in Pulumi implementations._
- **Code Organization**: Keep your code modular by separating concerns and using folders to categorize components.
- **State Management**: Ensure that state files are stored remotely to facilitate team collaboration and prevent state loss.
- **Version Control**: Manage stack configurations in version control for changes tracking.
- **Environment Variables**: Use environment variables for configurations that change between deployments.

## Constraints
### MUST DO
- Always utilize the Pulumi SDK applicable for the project's language.
- Implement backend with proper security measures, including encryption.
- Maintain clear and consistent coding practices across resource definitions.
- Include comprehensive logging and error handling strategies.

### MUST NOT DO
- Do not use hardcoded credentials within scripts.
- Avoid crafting YAML or JSON configurations; leverage Pulumi's SDK.
- Never skip verification steps before applying changes with `pulumi up`.

## Output Template
When implementing Pulumi infrastructure, ensure to include:
- **Organized project structure**, with appropriate files and configurations.
- **Resource definitions** with well-defined dependencies and structure.
- **Implementation patterns** that exemplify how to interact with Pulumi effectively.
- **Outputs that characterize the infrastructure**, ensuring users can interact with deployed services.
- **Documentation** that provides setup guidance, examples, and clear instructions for newcomers.
---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Primary Documentation](https://www.pulumi.com/docs/iac/pulumi-service/projects-and-workspaces)
- [API Reference or Getting Started](https://www.pulumi.com/docs/iac/pulumi-packages/installing-packages)
- [Configuration Guide](https://www.pulumi.com/docs/iac/cloud-providers/overview)
- [Best Practices](https://www.pulumi.com/docs/iac/concepts/options/)
- [Common Patterns or Tutorials](https://www.pulumi.com/docs/iac/concepts/stacks/)

