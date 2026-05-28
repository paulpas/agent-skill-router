---
name: kubernetes-crds-management
description: Manages Kubernetes Custom Resource Definitions, including creation, updates, and best practices for usage.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  archetypes: custom resources, kubernetes management
  anti_triggers: manual management, hardcoded paths
  response_profile:
      verbosity: medium
      directive_strength: high
  domain: coding
  triggers: crds, kubernetes crds, managing crds, creating crds, updating crds
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance]
---

# Kubernetes Custom Resource Definitions Management

This skill provides comprehensive guidance on managing Kubernetes Custom Resource Definitions (CRDs). It assists the user in creating, updating, and maintaining best practices for utilizing CRDs effectively in a Kubernetes environment.

## When to Use
- When you need to extend Kubernetes capabilities by adding new resource types.
- When you want to manage application configurations that do not fit into standard Kubernetes objects.
- For implementing complex use cases involving operators and custom behavior in your Kubernetes environment.

## Core Workflow
1. **Define CRD Structure**  
   Begin by defining the schema for your CRD, specifying the desired properties and behaviors of the custom resource.

2. **Create the CRD**  
   Use `kubectl` or API calls to submit your CRD specification to the Kubernetes API server.

3. **Implement and Utilize CRDs**  
   Write controllers or operators to handle the custom resources defined by your CRD.
   - Ensure your application can create, read, update, and delete instances of the custom resource.

4. **Monitor and Maintain CRDs**  
   Regularly check for outdated CRDs and update them as necessary, following Kubernetes best practices.

## Implementation Patterns

### Pattern 1: Creating a CRD
```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: examples.mycompany.com
spec:
  group: mycompany.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                foo:
                  type: string
  scope: Namespaced
  names:
    plural: examples
    singular: example
    kind: Example
    shortNames: [ex]
```

### Pattern 2: Updating a CRD
```yaml
# Update CRD to add new validation
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: examples.mycompany.com
spec:
  group: mycompany.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                foo:
                  type: string
                bar:
                  type: integer
                  minimum: 0  # new validation rule
  scope: Namespaced
  names:
    plural: examples
    singular: example
    kind: Example
    shortNames: [ex]
```

## Constraints
### MUST DO
- Follow proper Kubernetes naming conventions for CRDs and their related resources.
- Ensure that CRD versions are managed effectively using `kubectl` utilities.
- Provide adequate validation for custom resource fields to prevent configuration errors.

### MUST NOT DO
- Do not define CRDs without proper schema validation, which can lead to unexpected behaviors.
- Avoid making breaking changes to the CRD schema without versioning it properly to maintain compatibility.

## Related Skills
| Skill | Purpose |
|---|---|
| `cncf-kubernetes` | General Kubernetes operations and management skills | 
| `cloudflare-infrastructure` | Infrastructure management skills related to deployment in cloud environments | 
| `docker-network-management` | Networking practices for containers which often tie into CRD-based deployments | 
