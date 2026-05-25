---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Kubernetes API patterns including CRD development, webhook implementation,
  API groups, client library usage, and debugging techniques for custom API extensions
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: cncf-kubernetes-debugging, cncf-tekton, coding-grpc-patterns
  role: implementation
  scope: implementation
  triggers: kubernetes api, k8s api, crd development, api groups, subresources, watch
    api, admission webhooks, client libraries
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
name: kubernetes-api-patterns
------
# Kubernetes API Patterns

Implement Kubernetes API patterns including Custom Resource Definition (CRD) development, webhook implementation, API groups, client library usage, and debugging techniques for custom API extensions.

## TL;DR Checklist

- [ ] Define CRD API groups, versions, and resources following Kubernetes naming conventions
- [ ] Implement validation and conversion webhooks with proper admission review handling
- [ ] Choose correct client library (Go, Python, Java) based on deployment environment
- [ ] Use watch API with resource versions for efficient event streaming
- [ ] Debug API issues with kubectl explain, kubectl get --raw, and api-resources
- [ ] Migrate resources between API versions using conversion webhooks or sidecars
- [ ] Configure API server settings for custom resource scalability
- [ ] Implement subresources (status, scale) following Kubernetes patterns

---

## When to Use

Use this skill when:

- Developing Custom Resource Definitions (CRDs) for domain-specific APIs
- Implementing admission webhooks (validating/mutating) for policy enforcement
- Creating client applications that interact with Kubernetes API resources
- Debugging API server issues or custom resource behavior
- Migrating resources between API versions during API evolution
- Extending Kubernetes with subresources (status, scale, scale status)
- Building controllers or operators that watch and reconcile custom resources

---

## When NOT to Use

Avoid this skill for:

- **Simple application deployment** — Use Helm charts or kubectl apply instead of custom APIs
- **Basic RBAC configuration** — Use Kubernetes built-in roles instead of custom admission webhooks
- **Logging or monitoring** — Use dedicated operators like Prometheus Operator instead of custom APIs
- **Serverless function triggers** — Use Knative or eventing frameworks instead of CRDs
- **Network policy management** — Use CNI plugins with built-in policy support
- **Large-scale batch processing** — Use Tekton pipelines or Spark operators instead of custom CRDs

---

## Core Workflow

1. **Analyze API Requirements** — Identify the domain objects, their relationships, and required operations. **Checkpoint:** Have you defined the API group, version, and resource names following Kubernetes conventions?

2. **Design CRD Specification** — Define the schema, validation rules, and subresources. **Checkpoint:** Does the schema prevent invalid states through type definitions?

3. **Implement Webhooks (if needed)** — Create admission webhooks for validation and mutation. **Checkpoint:** Do webhooks return clear admission review responses with proper error messages?

4. **Choose Client Library** — Select Go client for controllers, Python/Java for external tools. **Checkpoint:** Is the client version compatible with the Kubernetes cluster version?

5. **Test API Interactions** — Use kubectl and curl to verify API behavior. **Checkpoint:** Do all CRUD operations and watch functionality work as expected?

6. **Debug and Optimize** — Identify performance bottlenecks and fix issues. **Checkpoint:** Is the watch API using resource versions correctly to avoid missed events?

---

## Implementation Patterns

### Pattern 1: API Group Structure

Kubernetes organizes APIs into groups, versions, and resources. This structure enables versioning and deprecation.

**BAD — Inconsistent naming and versioning:**
```yaml
# ❌ BAD — Mixed snake_case and camelCase, unclear versioning
apiVersion: myapp.io/v1beta1
kind: MyAppDeployment
spec:
  replicas: 3
```

**GOOD — Proper group naming and versioning:**
```yaml
# ✅ GOOD — DNS-style group name, clear versioning
apiVersion: mycompany.com/v1
kind: MyAppDeployment
spec:
  replicas: 3
```

**API Resource Structure:**
```
API Group: mycompany.com
  Version: v1
    Resource: myappdeployments
      Scope: Namespaced
```

**kubectl commands for API discovery:**
```bash
# List all API groups
kubectl api-groups

# List resources in a specific group
kubectl api-resources --api-group=mycompany.com

# Show API version for a resource
kubectl explain myappdeployment --api-version=mycompany.com/v1

# Check if CRD is established
kubectl get crd myappdeployments.mycompany.com -o jsonpath='{.status.conditions[?(@.type=="Established")].status}'

# List all resources across all groups
kubectl api-resources

# Get specific API version info
kubectl get --raw /apis/mycompany.com/v1
```

---

### Pattern 2: CRD Definition with Validation

Custom Resource Definitions must include proper schema validation to prevent invalid states.

**BAD — Missing schema validation:**
```yaml
# ❌ BAD — No validation allows invalid configurations
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myappdeployments.mycompany.com
spec:
  group: mycompany.com
  names:
    kind: MyAppDeployment
    plural: myappdeployments
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema: {}  # ❌ Empty schema allows any field
```

**GOOD — Complete schema with validation:**
```yaml
# ✅ GOOD — Schema enforces valid configurations
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myappdeployments.mycompany.com
spec:
  group: mycompany.com
  names:
    kind: MyAppDeployment
    plural: myappdeployments
  scope: Namespaced
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
              required:
                - replicas
                - image
              properties:
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 100
                image:
                  type: string
                  pattern: "^[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)*(:[a-z0-9]+([._-][a-z0-9]+)*)?(@[a-f0-9]{64})?$"
                resources:
                  type: object
                  properties:
                    limits:
                      type: object
                      properties:
                        memory:
                          type: string
                          pattern: "^[0-9]+(Mi|Gi|Ti)$"
                        cpu:
                          type: string
                          pattern: "^[0-9]+(m|)$"
                env:
                  type: array
                  items:
                    type: object
                    properties:
                      name:
                        type: string
                      value:
                        type: string
```

**Create and verify CRD:**
```bash
# Create CRD
kubectl apply -f myapp-crd.yaml

# Verify CRD is established
kubectl get crd myappdeployments.mycompany.com -o jsonpath='{.status.conditions[?(@.type=="Established")].status}'

# List instances
kubectl get myappdeployments

# Describe CRD to see schema
kubectl describe crd myappdeployments.mycompany.com

# Validate CRD YAML before applying
kubectl apply --dry-run=client -f myapp-crd.yaml
```

---

### Pattern 3: Validating Webhook Implementation

Admission webhooks intercept API requests to enforce custom policies.

**BAD — Webhook with no error handling:**
```go
// ❌ BAD — No proper admission review response
func (h *ValidatingWebhook) Handle(ctx context.Context, req admission.Request) admission.Response {
    obj := &myappv1.MyAppDeployment{}
    if err := h.decoder.Decode(req.AdmissionReview.Spec.Object, obj); err != nil {
        return admission.Errored(http.StatusBadRequest, err)
    }
    
    // ❌ Missing proper validation response
    if obj.Spec.Replicas > 100 {
        // No admission response with denial
        return admission.Allowed("allowed")
    }
    
    return admission.Allowed("validation passed")
}
```

**GOOD — Complete webhook with proper responses:**
```go
// ✅ GOOD — Proper admission review with clear deny messages
package webhook

import (
    "context"
    "fmt"
    "net/http"
    
    appsv1 "mycompany.com/api/v1"
    admissionv1 "k8s.io/api/admission/v1"
    admission "k8s.io/pod-security-admission/admission"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ValidatingWebhook struct {
    decoder *admission.Decoder
}

func (h *ValidatingWebhook) Handle(ctx context.Context, req admission.Request) admission.Response {
    obj := &appsv1.MyAppDeployment{}
    if err := h.decoder.Decode(req.AdmissionReview.Spec.Object, obj); err != nil {
        return admission.Errored(http.StatusBadRequest, err)
    }

    // Validate replicas
    if obj.Spec.Replicas > 100 {
        return admission.Denied("replicas must be between 1 and 100")
    }

    // Validate image format
    if !isValidImage(obj.Spec.Image) {
        return admission.Denied(fmt.Sprintf("invalid image format: %s", obj.Spec.Image))
    }

    // Validate resource constraints
    if !h.hasResourceLimits(obj) {
        return admission.Denied("resource limits are required")
    }

    return admission.Allowed("validation passed")
}

func isValidImage(image string) bool {
    // Regex pattern for valid container image names
    pattern := `^[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)*(:[a-z0-9]+([._-][a-z0-9]+)*)?(@[a-f0-9]{64})?$`
    // Implementation details...
    return true
}

func (h *ValidatingWebhook) hasResourceLimits(obj *appsv1.MyAppDeployment) bool {
    return obj.Spec.Resources.Limits != nil
}

// admission review response with uid and status
func admissionResponse(uid string, allowed bool, message string) admission.Response {
    return admission.Response{
        UID:     uid,
        Allowed: allowed,
        Result: &metav1.Status{
            Message: message,
        },
    }
}
```

**Deploy webhook with service and certificate:**
```bash
# Create TLS secret for webhook
openssl req -x509 -newkey rsa:4096 -keyout webhook-key.pem -out webhook-cert.pem -days 365 -nodes \
  -subj "/CN=myapp-validating-webhook.default.svc"

kubectl create secret generic webhook-tls --from-file=cert.pem=webhook-cert.pem --from-file=key.pem=webhook-key.pem

# Apply webhook configuration
kubectl apply -f validating-webhook.yaml

# Verify webhook is registered
kubectl get validatingwebhookconfigurations

# Test webhook manually
kubectl apply -f test-deployment.yaml --dry-run=client

# Check webhook logs
kubectl logs -n default deploy/myapp-validating-webhook
```

---

### Pattern 4: Client Library Usage (Go)

The Go client is the standard for Kubernetes controllers and operators.

**BAD — Inefficient client usage:**
```go
// ❌ BAD — Creates new client for each operation
func getDeployment(clientset *kubernetes.Clientset, name string) (*appsv1.Deployment, error) {
    // ❌ Creates new RESTClient each time
    config, _ := rest.InClusterConfig()
    client, _ := kubernetes.NewForConfig(config)
    
    return client.AppsV1().Deployments("default").Get(context.TODO(), name, metav1.GetOptions{})
}
```

**GOOD — Reusing client with proper error handling:**
```go
// ✅ GOOD — Single client instance with proper configuration
package client

import (
    "context"
    "fmt"
    
    appsv1 "k8s.io/api/apps/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

var clientset *kubernetes.Clientset

// InitClient initializes the client once
func InitClient() error {
    config, err := rest.InClusterConfig()
    if err != nil {
        return fmt.Errorf("failed to get in-cluster config: %w", err)
    }
    
    clientset, err = kubernetes.NewForConfig(config)
    if err != nil {
        return fmt.Errorf("failed to create client: %w", err)
    }
    
    return nil
}

// GetDeployment retrieves a deployment with proper error handling
func GetDeployment(ctx context.Context, namespace, name string) (*appsv1.Deployment, error) {
    if clientset == nil {
        return nil, fmt.Errorf("client not initialized")
    }
    
    deployment, err := clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
    if err != nil {
        return nil, fmt.Errorf("failed to get deployment %s/%s: %w", namespace, name, err)
    }
    
    return deployment, nil
}

// CreateDeployment creates a new deployment
func CreateDeployment(ctx context.Context, namespace string, deployment *appsv1.Deployment) (*appsv1.Deployment, error) {
    if clientset == nil {
        return nil, fmt.Errorf("client not initialized")
    }
    
    result, err := clientset.AppsV1().Deployments(namespace).Create(ctx, deployment, metav1.CreateOptions{})
    if err != nil {
        return nil, fmt.Errorf("failed to create deployment: %w", err)
    }
    
    return result, nil
}

// UpdateDeployment updates an existing deployment
func UpdateDeployment(ctx context.Context, namespace string, deployment *appsv1.Deployment) (*appsv1.Deployment, error) {
    if clientset == nil {
        return nil, fmt.Errorf("client not initialized")
    }
    
    result, err := clientset.AppsV1().Deployments(namespace).Update(ctx, deployment, metav1.UpdateOptions{})
    if err != nil {
        return nil, fmt.Errorf("failed to update deployment: %w", err)
    }
    
    return result, nil
}

// DeleteDeployment deletes a deployment
func DeleteDeployment(ctx context.Context, namespace, name string) error {
    if clientset == nil {
        return fmt.Errorf("client not initialized")
    }
    
    err := clientset.AppsV1().Deployments(namespace).Delete(ctx, name, metav1.DeleteOptions{})
    if err != nil {
        return fmt.Errorf("failed to delete deployment %s/%s: %w", namespace, name, err)
    }
    
    return nil
}
```

**CRD client with dynamic client:**
```go
// ✅ GOOD — Dynamic client for unknown resource types
package client

import (
    "context"
    "fmt"
    
    apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
    "k8s.io/apimachinery/pkg/api/meta"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/client-go/dynamic"
    "k8s.io/client-go/rest"
)

var dynamicClient dynamic.Interface

// InitDynamicClient initializes dynamic client for CRDs
func InitDynamicClient() error {
    config, err := rest.InClusterConfig()
    if err != nil {
        return fmt.Errorf("failed to get in-cluster config: %w", err)
    }
    
    dynamicClient, err = dynamic.NewForConfig(config)
    if err != nil {
        return fmt.Errorf("failed to create dynamic client: %w", err)
    }
    
    return nil
}

func getCustomResource(client dynamic.Interface, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
    resource, err := client.Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
    if err != nil {
        return nil, fmt.Errorf("failed to get %s/%s: %w", gvr.Resource, name, err)
    }
    
    return resource, nil
}

// ListCustomResources lists all instances of a CRD
func ListCustomResources(gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
    if dynamicClient == nil {
        return nil, fmt.Errorf("dynamic client not initialized")
    }
    
    list, err := dynamicClient.Resource(gvr).Namespace(namespace).List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        return nil, fmt.Errorf("failed to list %s: %w", gvr.Resource, err)
    }
    
    return list, nil
}

// UpdateCustomResourceStatus updates the status subresource
func UpdateCustomResourceStatus(gvr schema.GroupVersionResource, namespace, name string, status interface{}) (*unstructured.Unstructured, error) {
    if dynamicClient == nil {
        return nil, fmt.Errorf("dynamic client not initialized")
    }
    
    // Get current resource
    obj, err := dynamicClient.Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
    if err != nil {
        return nil, err
    }
    
    // Update status
    err = obj.Object["status"].(map[string]interface{})
    obj.Object["status"] = status
    
    return dynamicClient.Resource(gvr).Namespace(namespace).UpdateStatus(context.TODO(), obj, metav1.UpdateOptions{})
}
```

---

### Pattern 5: Watch API with Resource Versions

The watch API efficiently streams resource changes.

**BAD — Watch without resource version:**
```go
// ❌ BAD — Watch without resource version can miss events
func watchDeployments(client appsv1client.AppsV1Interface) {
    // ❌ No resourceVersion - can miss events during restart
    watcher, err := client.Deployments("default").Watch(context.TODO(), metav1.ListOptions{})
    if err != nil {
        panic(err)
    }
    
    for event := range watcher.ResultChan() {
        // Process event
        deployment := event.Object.(*appsv1.Deployment)
        fmt.Printf("Event: %s %s\n", event.Type, deployment.Name)
    }
}
```

**GOOD — Watch with resource version tracking:**
```go
// ✅ GOOD — Watch with proper resource version handling
package watcher

import (
    "context"
    "fmt"
    "time"
    
    appsv1 "k8s.io/api/apps/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/watch"
)

// WatchDeployments watches deployments with resync capability
func WatchDeployments(client appsv1client.AppsV1Interface, resyncPeriod time.Duration) error {
    // Get current resource version
    list, err := client.Deployments("default").List(context.TODO(), metav1.ListOptions{Limit: 1})
    if err != nil {
        return fmt.Errorf("failed to list deployments: %w", err)
    }
    
    var resourceVersion string
    if len(list.Items) > 0 {
        resourceVersion = list.ListMeta.ResourceVersion
    }
    
    // Start watch with resource version
    watcher, err := client.Deployments("default").Watch(context.TODO(), metav1.ListOptions{
        ResourceVersion: resourceVersion,
        TimeoutSeconds:  ptr[int64](300), // 5 minute timeout
    })
    if err != nil {
        return fmt.Errorf("failed to start watch: %w", err)
    }
    
    // Handle events
    go func() {
        for event := range watcher.ResultChan() {
            deployment := event.Object.(*appsv1.Deployment)
            fmt.Printf("Event: %s %s (resourceVersion: %s)\n", 
                event.Type, deployment.Name, deployment.ResourceVersion)
        }
    }()
    
    // Periodic resync to catch missed events
    go func() {
        ticker := time.NewTicker(resyncPeriod)
        defer ticker.Stop()
        
        for range ticker.C {
            performResync(client)
        }
    }()
    
    return nil
}

// RestartWatch restarts watch with latest resource version
func restartWatch(client appsv1client.AppsV1Interface) error {
    list, err := client.Deployments("default").List(context.TODO(), metav1.ListOptions{Limit: 1})
    if err != nil {
        return err
    }
    
    var resourceVersion string
    if len(list.Items) > 0 {
        resourceVersion = list.ListMeta.ResourceVersion
    }
    
    watcher, err := client.Deployments("default").Watch(context.TODO(), metav1.ListOptions{
        ResourceVersion: resourceVersion,
        TimeoutSeconds:  ptr[int64](300),
    })
    if err != nil {
        return err
    }
    
    // Continue processing...
    return nil
}

func ptr[T any](v T) *T {
    return &v
}

func performResync(client appsv1client.AppsV1Interface) {
    deployments, err := client.Deployments("default").List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        fmt.Printf("Resync failed: %v\n", err)
        return
    }
    
    for _, d := range deployments.Items {
        fmt.Printf("Resynced deployment: %s (replicas: %d)\n", d.Name, d.Spec.Replicas)
    }
}
```

**Debug watch issues with kubectl:**
```bash
# Watch events in a namespace
kubectl get events -n default --watch

# Get resource version for debugging
kubectl get deployments -o jsonpath='{.metadata.resourceVersion}'

# Watch with specific resource version
kubectl get deployments --watch --resource-version=<version>

# Check API server logs for watch errors
kubectl logs -n kube-system kube-apiserver-<node> | grep -i watch

# Test watch with curl
kubectl proxy &
curl -s --raw "http://localhost:8001/api/v1/namespaces/default/pods?watch=true&resourceVersion=0" &
```

---

### Pattern 6: Subresource Implementation

Subresources extend resources with additional endpoints (status, scale).

**BAD — Incomplete subresource configuration:**
```yaml
# ❌ BAD — Missing subresource specification
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myappdeployments.mycompany.com
spec:
  group: mycompany.com
  names:
    kind: MyAppDeployment
    plural: myappdeployments
  scope: Namespaced
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
                replicas:
                  type: integer
            status:
              type: object
              # ❌ Status not defined as subresource
```

**GOOD — Complete subresource configuration:**
```yaml
# ✅ GOOD — Status and scale subresources properly defined
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myappdeployments.mycompany.com
spec:
  group: mycompany.com
  names:
    kind: MyAppDeployment
    plural: myappdeployments
  scope: Namespaced
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
                replicas:
                  type: integer
                  minimum: 1
                  maximum: 100
            status:
              type: object
              properties:
                replicas:
                  type: integer
                availableReplicas:
                  type: integer
                conditions:
                  type: array
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                      status:
                        type: string
                      reason:
                        type: string
                      message:
                        type: string
                      lastTransitionTime:
                        type: string
                        format: date-time
      subresources:
        status: {}  # ✅ Enables /status endpoint
        scale:
          specReplicasPath: .spec.replicas  # ✅ Enables /scale endpoint
          statusReplicasPath: .status.replicas
  additionalPrinterColumns:
    - name: Replicas
      type: integer
      description: Number of replicas
      jsonPath: .spec.replicas
    - name: Status
      type: string
      description: Current status
      jsonPath: .status.conditions[?(@.type=="Ready")].status
    - name: Age
      type: date
      jsonPath: .metadata.creationTimestamp
```

**Subresource operations:**
```bash
# Update status subresource
kubectl patch myappdeployment myapp --type=merge -p '
{
  "status": {
    "replicas": 3,
    "availableReplicas": 3,
    "conditions": [{"type": "Ready", "status": "True"}]
  }
}'

# Get scale subresource
kubectl get myappdeployment myapp -o jsonpath='{.spec.replicas}'

# Update scale subresource
kubectl patch myappdeployment myapp --type=merge -p '{"spec":{"replicas":5}}'

# Use kubectl scale command
kubectl scale myappdeployment myapp --replicas=5

# Get status subresource directly
kubectl get myappdeployment myapp -o json | jq '.status'

# Watch status changes
kubectl get myappdeployment myapp --watch --field-selector=metadata.name=myapp
```

---

### Pattern 7: API Conversion Webhooks

Conversion webhooks enable smooth API version transitions.

**BAD — No conversion webhook for version migration:**
```yaml
# ❌ BAD — Missing conversion configuration
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myappdeployments.mycompany.com
spec:
  group: mycompany.com
  names:
    kind: MyAppDeployment
    plural: myappdeployments
  scope: Namespaced
  versions:
    - name: v1beta1
      served: true
      storage: false
    - name: v1
      served: true
      storage: true
      # ❌ No conversion webhook - manual migration required
```

**GOOD — Complete conversion webhook setup:**
```yaml
# ✅ GOOD — Conversion webhook for API version migration
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myappdeployments.mycompany.com
spec:
  group: mycompany.com
  names:
    kind: MyAppDeployment
    plural: myappdeployments
  scope: Namespaced
  versions:
    - name: v1beta1
      served: true
      storage: false
    - name: v1
      served: true
      storage: true
  conversion:
    strategy: Webhook
    webhook:
      clientConfig:
        service:
          name: myapp-conversion-webhook
          namespace: default
          path: /convert
        caBundle: <base64-encoded-ca-cert>
      conversionReviewVersions:
        - v1
        - v1beta1
```

**Conversion webhook implementation:**
```go
// ✅ GOOD — Webhook handles conversion between versions
package conversion

import (
    "context"
    "fmt"
    
    myappv1 "mycompany.com/api/v1"
    myappv1beta1 "mycompany.com/api/v1beta1"
    apiextensionsv1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
    admission "k8s.io/pod-security-admission/admission"
)

type ConversionWebhook struct {
    decoder *admission.Decoder
}

func (h *ConversionWebhook) Handle(ctx context.Context, req admission.Request) admission.Response {
    review := &apiextensionsv1.ConversionReview{}
    if err := h.decoder.Decode(req.AdmissionReview.Spec.Object, review); err != nil {
        return admission.Errored(http.StatusBadRequest, err)
    }

    response := &apiextensionsv1.ConversionResponse{
        Uid: review.Request.UID,
    }

    switch review.Request.DesiredAPIVersion {
    case "mycompany.com/v1":
        response.ConvertedObjects, response.Status = h.convertToV1(review.Request.Objects)
    case "mycompany.com/v1beta1":
        response.ConvertedObjects, response.Status = h.convertToV1Beta1(review.Request.Objects)
    default:
        response.Status = &metav1.Status{
            Status:  metav1.StatusFailure,
            Code:    http.StatusBadRequest,
            Message: fmt.Sprintf("unsupported API version: %s", review.Request.DesiredAPIVersion),
        }
        return admission.Response{UID: review.Request.UID, Allowed: false, Result: response.Status}
    }

    return admission.Response{UID: review.Request.UID, Allowed: true, Result: response}
}

func (h *ConversionWebhook) convertToV1(objects []runtime.RawExtension) ([]runtime.RawExtension, *metav1.Status) {
    var converted []runtime.RawExtension
    
    for _, obj := range objects {
        v1beta1Obj := &myappv1beta1.MyAppDeployment{}
        if err := json.Unmarshal(obj.Raw, v1beta1Obj); err != nil {
            return nil, &metav1.Status{
                Status:  metav1.StatusFailure,
                Code:    http.StatusBadRequest,
                Message: fmt.Sprintf("failed to unmarshal v1beta1 object: %v", err),
            }
        }
        
        v1Obj := convertV1Beta1ToV1(v1beta1Obj)
        data, err := json.Marshal(v1Obj)
        if err != nil {
            return nil, &metav1.Status{
                Status:  metav1.StatusFailure,
                Code:    http.StatusInternalServerError,
                Message: fmt.Sprintf("failed to marshal v1 object: %v", err),
            }
        }
        
        converted = append(converted, runtime.RawExtension{Raw: data})
    }
    
    return converted, nil
}

func (h *ConversionWebhook) convertToV1Beta1(objects []runtime.RawExtension) ([]runtime.RawExtension, *metav1.Status) {
    var converted []runtime.RawExtension
    
    for _, obj := range objects {
        v1Obj := &myappv1.MyAppDeployment{}
        if err := json.Unmarshal(obj.Raw, v1Obj); err != nil {
            return nil, &metav1.Status{
                Status:  metav1.StatusFailure,
                Code:    http.StatusBadRequest,
                Message: fmt.Sprintf("failed to unmarshal v1 object: %v", err),
            }
        }
        
        v1beta1Obj := convertV1ToV1Beta1(v1Obj)
        data, err := json.Marshal(v1beta1Obj)
        if err != nil {
            return nil, &metav1.Status{
                Status:  metav1.StatusFailure,
                Code:    http.StatusInternalServerError,
                Message: fmt.Sprintf("failed to marshal v1beta1 object: %v", err),
            }
        }
        
        converted = append(converted, runtime.RawExtension{Raw: data})
    }
    
    return converted, nil
}

func convertV1Beta1ToV1(v1beta1Obj *myappv1beta1.MyAppDeployment) *myappv1.MyAppDeployment {
    return &myappv1.MyAppDeployment{
        TypeMeta: v1beta1Obj.TypeMeta,
        ObjectMeta: v1beta1Obj.ObjectMeta,
        Spec: myappv1.MyAppDeploymentSpec{
            Replicas:  v1beta1Obj.Spec.Replicas,
            Image:     v1beta1Obj.Spec.Image,
            Resources: convertResources(v1beta1Obj.Spec.Resources),
        },
        Status: myappv1.MyAppDeploymentStatus{
            Replicas:            v1beta1Obj.Status.Replicas,
            AvailableReplicas:   v1beta1Obj.Status.AvailableReplicas,
            Conditions:          convertConditions(v1beta1Obj.Status.Conditions),
        },
    }
}

func convertV1ToV1Beta1(v1Obj *myappv1.MyAppDeployment) *myappv1beta1.MyAppDeployment {
    return &myappv1beta1.MyAppDeployment{
        TypeMeta: v1Obj.TypeMeta,
        ObjectMeta: v1Obj.ObjectMeta,
        Spec: myappv1beta1.MyAppDeploymentSpec{
            Replicas:  v1Obj.Spec.Replicas,
            Image:     v1Obj.Spec.Image,
            Resources: convertResourcesBack(v1Obj.Spec.Resources),
        },
        Status: myappv1beta1.MyAppDeploymentStatus{
            Replicas:            v1Obj.Status.Replicas,
            AvailableReplicas:   v1Obj.Status.AvailableReplicas,
            Conditions:          convertConditionsBack(v1Obj.Status.Conditions),
        },
    }
}
```

**Test conversion:**
```bash
# Get resource in v1beta1
kubectl get myappdeployment myapp -o json --api-version=mycompany.com/v1beta1

# Get same resource in v1 (triggers conversion webhook)
kubectl get myappdeployment myapp -o json --api-version=mycompany.com/v1

# Verify conversion in etcd
kubectl get myappdeployment myapp -o yaml

# Test conversion with curl
kubectl proxy &
curl -s -X POST -H "Content-Type: application/json" \
  --data '{"apiVersion":"apiextensions.k8s.io/v1","kind":"ConversionReview","request":{"uid":"test","desiredAPIVersion":"mycompany.com/v1","objects":[]}}' \
  http://localhost:8001/apis/mycompany.com/v1/convert
```

---

### Pattern 8: API Server Configuration

Proper API server configuration ensures custom resources work efficiently.

**BAD — Default API server settings for high-volume CRs:**
```yaml
# ❌ BAD — No API server tuning for custom resources
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-apiserver
  namespace: kube-system
data:
  kube-apiserver.conf: |
    # ❌ Using default settings
    kube-apiserver \
      --etcd-servers=http://127.0.0.1:2379 \
      --enable-admission-plugins=NamespaceLifecycle,LimitRanger
```

**GOOD — Optimized API server configuration:**
```yaml
# ✅ GOOD — Tuned for custom resource performance
apiVersion: v1
kind: ConfigMap
metadata:
  name: kube-apiserver
  namespace: kube-system
data:
  kube-apiserver.conf: |
    kube-apiserver \
      --etcd-servers=https://127.0.0.1:2379 \
      --etcd-cafile=/etc/kubernetes/pki/etcd/ca.crt \
      --etcd-certfile=/etc/kubernetes/pki/apiserver-etcd-client.crt \
      --etcd-keyfile=/etc/kubernetes/pki/apiserver-etcd-client.key \
      --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,ValidatingAdmissionWebhook,MutatingAdmissionWebhook \
      --enable-bootstrap-token-auth=true \
      --max-requests-inflight=2000 \
      --max-requests-inflight=1500 \
      --max-requests-inflight=1000 \
      --max-requests-inflight=500 \
      --request-timeout=300s \
      --allow-privileged=true \
      --authorization-mode=Node,RBAC \
      --client-ca-file=/etc/kubernetes/pki/ca.crt \
      --enable-swagger-ui=true \
      --kubelet-certificate-authority=/etc/kubernetes/pki/ca.crt \
      --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt \
      --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key \
      --runtime-config=api/all=true \
      --service-account-issuer=https://kubernetes.default.svc.cluster.local \
      --service-account-key-file=/etc/kubernetes/pki/sa.pub \
      --service-account-signing-key-file=/etc/kubernetes/pki/sa.key \
      --tls-cert-file=/etc/kubernetes/pki/apiserver.crt \
      --tls-private-key-file=/etc/kubernetes/pki/apiserver.key

# Optimized etcd configuration for CRDs
  etcd.conf: |
    # Optimize etcd for CRD storage
    --auto-compaction-mode=periodic
    --auto-compaction-retention=1h
    --quota-backend-bytes=8589934592  # 8GB
    --max-request-bytes=15728640  # 15MB
    --listen-client-urls=https://0.0.0.0:2379
    --listen-peer-urls=https://0.0.0.0:2380
```

**CRD controller configuration:**
```go
// ✅ GOOD — Controller with proper rate limiting and resync
package controller

import (
    "context"
    "time"
    
    "github.com/go-logr/logr"
    "k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
    "k8s.io/apimachinery/pkg/runtime/schema"
    "k8s.io/apimachinery/pkg/util/runtime"
    "k8s.io/apimachinery/pkg/util/wait"
    "k8s.io/client-go/tools/cache"
    "k8s.io/client-go/util/workqueue"
)

type Controller struct {
    client    dynamic.Interface
    informer  cache.SharedIndexInformer
    queue     workqueue.RateLimitingInterface
    logger    logr.Logger
    gvr       schema.GroupVersionResource
}

func NewController(client dynamic.Interface, informer cache.SharedIndexInformer, gvr schema.GroupVersionResource, logger logr.Logger) *Controller {
    return &Controller{
        client:  client,
        informer: informer,
        queue:   workqueue.NewRateLimitingQueue(workqueue.DefaultControllerRateLimiter()),
        logger:  logger,
        gvr:     gvr,
    }
}

func (c *Controller) Start(stopCh <-chan struct{}) error {
    // Set up event handlers
    c.informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc:    c.onAdd,
        UpdateFunc: c.onUpdate,
        DeleteFunc: c.onDelete,
    })
    
    // Start informer
    go c.informer.Run(stopCh)
    
    // Process work items
    c.processWorkItems(stopCh)
    
    return nil
}

func (c *Controller) processWorkItems(stopCh <-chan struct{}) {
    for {
        select {
        case <-stopCh:
            return
        default:
            obj, shutdown := c.queue.Get()
            if shutdown {
                return
            }
            
            if err := c.reconcile(obj); err != nil {
                c.logger.Error(err, "reconciliation failed")
                if c.queue.NumRequeues(obj) < 5 {
                    c.queue.AddRateLimited(obj)
                } else {
                    c.queue.Forget(obj)
                    runtime.HandleError(err)
                }
            } else {
                c.queue.Forget(obj)
            }
        }
    }
}

func (c *Controller) reconcile(obj interface{}) error {
    defer c.queue.Done(obj)
    
    key, ok := obj.(string)
    if !ok {
        return nil
    }
    
    namespace, name, err := cache.SplitMetaNamespaceKey(key)
    if err != nil {
        return err
    }
    
    gvr := c.gvr
    resource, err := c.client.Resource(gvr).Namespace(namespace).Get(context.TODO(), name, metav1.GetOptions{})
    if err != nil {
        if apierrors.IsNotFound(err) {
            return nil // Object deleted
        }
        return err
    }
    
    // Reconciliation logic here
    return nil
}

func (c *Controller) onAdd(obj interface{}) {
    key, err := cache.MetaNamespaceKeyFunc(obj)
    if err != nil {
        runtime.HandleError(err)
        return
    }
    c.queue.Add(key)
}

func (c *Controller) onUpdate(old, new interface{}) {
    key, err := cache.MetaNamespaceKeyFunc(new)
    if err != nil {
        runtime.HandleError(err)
        return
    }
    c.queue.Add(key)
}

func (c *Controller) onDelete(obj interface{}) {
    key, err := cache.DeletionHandlingMetaNamespaceKeyFunc(obj)
    if err != nil {
        runtime.HandleError(err)
        return
    }
    c.queue.Add(key)
}
```

---

## Constraints

### MUST DO

- Use DNS-style naming for API groups (e.g., `mycompany.com`, `k8s.io`)
- Define strict schema validation to prevent invalid states (Parse, Don't Validate)
- Implement admission webhooks with clear, actionable error messages
- Use resource versions in watch API to avoid missing events
- Include status subresource for controller-managed fields
- Handle conversion webhooks gracefully during API version migrations
- Set appropriate API server request limits based on CRD volume
- Test CRD upgrades with existing resources before production deployment
- Validate webhook TLS certificates before deployment
- Implement proper RBAC for webhook service accounts
- Use admission webhooks for validation, not business logic

### MUST NOT DO

- Use reserved API groups like `k8s.io`, `kubernetes.io` for custom resources
- Skip schema validation even for "internal" CRDs
- Return generic error messages from admission webhooks
- Watch without resource version tracking in production
- Modify CRD schema in ways that break existing resources
- Deploy webhooks without TLS certificates
- Set replicas too high in CRD without proper API server tuning
- Use v1beta1 as storage version (always use stable v1)
- Skip webhook timeout handling (default 10s, max 30s)
- Block webhook operations for more than timeout duration

---

## Output Template

When implementing Kubernetes API patterns, include:

1. **CRD Specification** — Complete CRD definition with schema, validation, and subresources
2. **Webhook Configuration** — Validating/mutating webhook setup with service and certificate
3. **Client Code** — Go client or other language client for resource operations
4. **Deployment Scripts** — Helm charts or YAML manifests for webhook deployment
5. **Migration Plan** — Steps for API version conversion and upgrade procedures
6. **Debugging Commands** — kubectl commands for troubleshooting API issues
7. **Monitoring Configuration** — Prometheus metrics for API server and webhook performance

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-kubernetes-debugging` | Advanced debugging techniques for Kubernetes clusters, including API server logs, etcd inspection, and network troubleshooting |
| `coding-grpc-patterns` | gRPC communication patterns for webhook implementations and client-server interactions |
| `cncf-tekton` | Tekton Pipelines integration with custom resources for CI/CD workflows |
| `cncf-prometheus` | Monitoring Kubernetes API servers and custom resources with Prometheus metrics |

---

## References

- [Kubernetes API Documentation](https://kubernetes.io/docs/reference/using-api/)
- [Custom Resource Definitions](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)
- [Admission Webhooks](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [API Versioning](https://kubernetes.io/docs/reference/using-api/#api-versioning)
- [Client Libraries](https://kubernetes.io/docs/reference/using-api/client-libraries/)
- [Watching Resources](https://kubernetes.io/docs/reference/using-api/api-concepts/#watching)

---

## Live References

> **These links are resolved at load time** — content is fetched and inlined to provide the latest documentation.

- [Kubernetes API Reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/)
- [Kubernetes API Concepts](https://kubernetes.io/docs/reference/using-api/)
- [Kubernetes API Conventions](https://kubernetes.io/docs/reference/using-api/api-conventions/)
- [Kubernetes API Machinery](https://kubernetes.io/docs/reference/using-api/api-conventions/#resources)
- [Kubernetes Admission Controllers](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [Kubernetes CRD Reference](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)
