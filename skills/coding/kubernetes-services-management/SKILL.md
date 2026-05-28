---
name: kubernetes-services-management
description: Manages Kubernetes Services, including configuration for ClusterIP, NodePort, and LoadBalancer services. This skill provides detailed guidance on setting up and maintaining services in a Kubernetes cluster, ensuring efficient access and networking for deployed applications.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  archetypes: service management, kubernetes infrastructure
  anti_triggers: over-exposing services, manual configuration
  response_profile:
      verbosity: medium
      directive_strength: high
  domain: coding
  triggers: services, kubernetes services, managing services, creating services, configuring services
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance]
---

# Kubernetes Services Management

This skill manages Kubernetes Services, enabling efficient configuration and management of networking options like ClusterIP, NodePort, and LoadBalancer services within a Kubernetes cluster.

## When to Use
- When deploying applications that require service exposure within or outside the cluster.
- When configuring services based on accessibility needs (internal vs external).
- For educational purposes to understand the service abstraction layer in Kubernetes.

## Core Workflow
1. **Define the Service Type**: Identify the type of service needed (ClusterIP, NodePort, LoadBalancer).
2. **Create the Service YAML**: Prepare the YAML configuration specifying the service type, selectors, and ports. 
3. **Apply the Configuration**: Use `kubectl apply -f <service-yaml-file>` to create the service in the cluster.
4. **Verify the Service**: Check the status and details of the service using `kubectl get services`.
5. **Update and Maintain**: If changes are required, modify the YAML and reapply.

## Implementation Patterns
### Example 1: Creating a ClusterIP Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-clusterip-service
spec:
  type: ClusterIP
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

### Example 2: Creating a NodePort Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-nodeport-service
spec:
  type: NodePort
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30001 
```

### Example 3: Creating a LoadBalancer Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-loadbalancer-service
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

## Common Pitfalls
- **Exposing Unnecessary Services**: Ensure that only services that require external access are exposed.
  - **Solution**: Review service types frequently and use ClusterIP for internal-only services.
- **Misconfigured Selectors**: Ensure the correct selectors are defined in the service configuration.
  - **Solution**: Validate selectors via `kubectl describe service <service-name>` to confirm they point to the desired pods.

## Best Practices
- **Use Consistent Naming Conventions**: Maintain a clear naming pattern for better discoverability.
- **Regularly Audit Your Services**: Conduct regular reviews of services to ensure they are configured correctly and serve their intended purpose.
- **Document Your Services**: Provide clear documentation for each service setup to facilitate maintenance and onboarding.

## Related Skills
| Skill | Purpose |
|---|---|
| kubernetes-pod-management | Manages Kubernetes Pods and their lifecycle. |
| kubernetes-deployment-management | Handles creation and configuration of Deployments for applications in Kubernetes.