---
name: kyverno-image-registry-validation
description: Validates container images from approved registries with allowed tags using Kyverno verifyImages rules and image digest mutation to prevent unapproved or latest-tagged images.
license: MIT
compatibility: opencode
archetypes:
  - enforcement
  - tactical
anti_triggers:
  - brainstorming
  - vague ideation
  - non-security policy work
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: cncf
  triggers: image validation, container registry, approved images, image digest, tag policy, image scanning, registry allowlist
  role: implementation
  scope: implementation
  output-format: manifests
  related-skills: kyverno-policy-generation, kyverno-resource-quota-validation
---

# Kyverno Image Registry Validation

Validates container images sourced only from approved registries with allowed tags using Kyverno `verifyImages` rules and image digest mutation. This skill makes the model configure `ClusterPolicy` objects that enforce image provenance, verify signatures via Cosign/Sigstore, mutate image references with resolved digests, and block images tagged `latest` or not from an allowlisted registry. It prevents unapproved or tampered container images from being deployed into the cluster.

## TL;DR Checklist

- [ ] Create ClusterPolicy with verifyImages rule targeting Pod containers
- [ ] Define approved registries with glob patterns (e.g., `*.myregistry.com/*`)
- [ ] Set `mutateDigest: true` to inject SHA digests into running pods
- [ ] Configure `verifyDigest: true` for cryptographic verification via Cosign
- [ ] Block `latest` tag in production via validate rule
- [ ] Verify results with PolicyReport showing pass/fail for each image

---

## When to Use

- Enforcing container image provenance in production Kubernetes clusters
- Requiring signed images from approved registries using Cosign public key verification
- Preventing use of `latest` or mutable tags in production deployments
- Implementing supply chain security with digest-based image pinning
- Meeting compliance requirements (SOC2, PCI-DSS) that mandate approved image sources
- Migrating workloads to require verified images during a security hardening initiative

---

## When NOT to Use

- For development or local testing environments where image flexibility is required — use a separate permissive policy for dev namespaces
- When you need to validate image content (vulnerability scanning) rather than provenance — use a Trivy or Grype integration instead
- For init containers that reference public images (e.g., `busybox` for sidecar patterns) unless you add specific exceptions
- In clusters without Cosign or Sigstore installed — `verifyImages` requires the verification infrastructure to be present

---

## Core Workflow

1. **Define the image validation ClusterPolicy** — Create a `ClusterPolicy` with a `verifyImages` rule. Use `spec.rules[].verifyImages` with `extract` to pull image references, then set `mutateDigest: true` and `verifyDigest: true`. Configure the `key` field with the Cosign public key or Sigstore trusted root. Apply to `Pod` resources in target namespaces. **Checkpoint:** Confirm `kubectl get clusterpolicy image-registry-validation -o yaml` shows `rules[].verifyImages[].mutateDigest: true` and `verifyDigest: true`.

2. **Configure approved registries and tag restrictions** — Use glob patterns to define allowed registries (e.g., `gcr.io/my-project/*`, `*.myregistry.com/*`). Add a separate `validate` rule to reject images tagged `latest` or images not matching approved registry patterns. Use `any` or `all` match semantics depending on whether images come from a single or multiple registries. **Checkpoint:** Test with `kubectl run test --image unapproved-registry.com/app:1.0` — the pod creation must be denied.

3. **Deploy, verify, and monitor** — Apply the ClusterPolicy. Create a pod with an approved image and verify it is accepted and mutated with the resolved digest. Then create a pod with a disallowed image (wrong registry or `latest` tag) and confirm it is rejected. Review `PolicyReport` for per-image verification results. **Checkpoint:** PolicyReport must show `pass` for the approved image and `fail` for the disallowed image, with the digested image running in the cluster.

---

## Implementation Patterns

### Pattern 1: verifyImages with Cosign Public Key Verification

This pattern enforces that all container images in target namespaces are signed with a specific Cosign public key and originate from approved registries. It mutates image references with resolved SHA digests.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: image-registry-validation
  annotations:
    policies.kyverno.io/title: Image Registry Validation
    policies.kyverno.io/category: Supply Chain Security
    policies.kyverno.io/description: >-
      Validates that all container images originate from approved registries,
      are signed with a known Cosign public key, and rejects images tagged
      'latest'. Mutates image references with resolved SHA digests.
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-image-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - namespaces:
              - kube-system
              - kube-public
      verifyImages:
        - imageReferences:
            - "gcr.io/my-project/*"
            - "*.myregistry.com/*"
          mutateDigest: true
          verifyDigest: true
          key: |-
            -----BEGIN PUBLIC KEY-----
            MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEExampleKeyDataHere
            ExamplePublicKeyDataForCosignVerification
            -----END PUBLIC KEY-----
          operator: AlwaysIntoto
          attestation:
            - type: https://slsa.dev/provenance/v0.1
              publisher:
                - gcr.io/distroless/*
    - name: reject-latest-tag
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - namespaces:
              - kube-system
              - kube-public
      validate:
        message: "Images tagged 'latest' are not allowed in production. Use a specific version tag or digest."
        pattern:
          spec:
            containers:
              - image: "!*:latest"
    - name: enforce-approved-registry
      match:
        any:
          - resources:
              kinds:
                - Pod
      exclude:
        any:
          - namespaces:
              - kube-system
              - kube-public
      validate:
        message: >-
          Image '{{ @image }}' is not from an approved registry.
          Approved registries: gcr.io/my-project/*, *.myregistry.com/*
        pattern:
          spec:
            containers:
              - image: "gcr.io/my-project/*"
      foreach:
        - imageReferences:
            - "gcr.io/my-project/*"
            - "*.myregistry.com/*"
```

### Pattern 2: BAD vs GOOD — Image Reference Patterns

This pattern shows the difference between disallowed image references and compliant ones. It demonstrates registry patterns, tag restrictions, and digest pinning.

```yaml
# ❌ BAD — Image from unapproved registry with latest tag
apiVersion: v1
kind: Pod
metadata:
  name: bad-image-pod
  namespace: production-payments
spec:
  containers:
    - name: app
      image: docker.io/dockeruser/random-app:latest    # ❌ BLOCKED: wrong registry + latest tag
      securityContext:
        runAsNonRoot: true
---
# ❌ BAD — Image from approved registry but using latest tag
apiVersion: v1
kind: Pod
metadata:
  name: bad-latest-pod
  namespace: production-payments
spec:
  containers:
    - name: app
      image: gcr.io/my-project/payments-app:latest     # ❌ BLOCKED: latest tag not allowed
      securityContext:
        runAsNonRoot: true
---
# ✅ GOOD — Image from approved registry with specific tag
apiVersion: v1
kind: Pod
metadata:
  name: good-tagged-pod
  namespace: production-payments
spec:
  containers:
    - name: app
      image: gcr.io/my-project/payments-app:1.2.3     # ✅ OK: approved registry + specific tag
      securityContext:
        runAsNonRoot: true
---
# ✅ GOOD — Image from approved registry with digest pinning
apiVersion: v1
kind: Pod
metadata:
  name: good-digested-pod
  namespace: production-payments
spec:
  containers:
    - name: app
      image: gcr.io/my-project/payments-app@sha256:a]b]c]d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3 # ✅ OK: digest-pinned
      securityContext:
        runAsNonRoot: true
```

**Kyverno PolicyReport Example for Image Verification:**

```yaml
apiVersion: wgpolicyk8s.io/v1alpha2
kind: PolicyReport
metadata:
  name: image-registry-validation-report
  namespace: production-payments
results:
  - policy: image-registry-validation
    rule: verify-image-signature
    result: pass
    severity: high
    message: "Image gcr.io/my-project/payments-app:1.2.3 verified and mutated with digest"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
    details:
      digest: sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
  - policy: image-registry-validation
    rule: reject-latest-tag
    result: pass
    severity: high
    message: "Image does not use the 'latest' tag"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
  - policy: image-registry-validation
    rule: enforce-approved-registry
    result: pass
    severity: high
    message: "Image originates from an approved registry"
    scored: true
    source: kyverno
    timestamp:
      seconds: 1733501530
summary:
  error: 0
  fail: 0
  pass: 3
  skip: 0
  warn: 0
```

### Pattern 3: Sigstore Transparency Log Verification

When using Sigstore (instead of Cosign with a static key), configure Kyverno to verify images against the transparency log. This is the recommended approach for open-source projects and supply chain security.

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: image-sigstore-verification
  annotations:
    policies.kyverno.io/title: Sigstore Image Verification
    policies.kyverno.io/category: Supply Chain Security
    policies.kyverno.io/description: >-
      Verifies container images against Sigstore transparency logs using
      the Fulcio certificate and Rekor entries for image provenance.
spec:
  validationFailureAction: Enforce
  rules:
    - name: verify-sigstore
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "ghcr.io/my-org/*"
            - "public.ecr.aws/my-org/*"
          mutateDigest: true
          verifyDigest: true
          ctfePubKey: |-
            -----BEGIN PUBLIC KEY-----
            MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEsigstoreTransparencyLogPublicKey
            ExampleSigstoreCTFEPublicKeyData
            -----END PUBLIC KEY-----
          key: ""
          skipTlog: false
          attestation:
            - type: https://opencontainers.org/source
```

---

## Constraints

### MUST DO
- Specify full registry URLs with glob patterns (e.g., `gcr.io/my-project/*`, `*.myregistry.com/*`) — partial patterns like `my-project` will match unintended registries
- Set `mutateDigest: true` and `verifyDigest: true` on every `verifyImages` rule — mutation without verification is a security gap, verification without mutation is fragile
- Use `operator: AlwaysIntoto` or `key` with a real Cosign public key — empty keys or placeholder keys bypass verification entirely
- Include a separate `validate` rule to explicitly block `*:latest` tags — the `verifyImages` rule alone does not restrict tag mutability
- Exclude `kube-system`, `kube-public`, and any infrastructure namespace from image validation policies — system components often pull from public registries
- Configure `auditAnnotations` for visibility into which images passed or failed verification in PolicyReports

### MUST NOT DO
- Allow `latest` tag in production under any circumstance — even for verified images, `latest` is mutable and breaks auditability
- Hardcode a specific image digest (`sha256:abc...`) in a `validate` rule — digests change with every build, making the policy permanently broken
- Skip the `verifyDigest` flag — setting `mutateDigest: true` without `verifyDigest: true` injects digests but does not verify signatures
- Validate only init container images — if you need init container coverage, add a second `verifyImages` rule with `any` matching on both `Pod` and init container specs
- Use `validate` rules for registry enforcement when `verifyImages` with `imageReferences` is available — the latter provides both matching and mutation in one rule
- Apply image validation to namespaces running CI/CD agents (e.g., Tekton, ArgoCD) without exceptions — these agents frequently pull from public registries for dynamic pipelines

---

## Related Skills

| Skill | Purpose |
|---|---|
| `kyverno-policy-generation` | Generate Kyverno policies from templates for repetitive registry rules |
| `kyverno-resource-quota-validation` | Enforce resource quotas alongside image validation for complete namespace governance |

---

## Live References

> Authoritative documentation links for Kyverno image verification and registry validation.

- [Kyverno Documentation](https://kyverno.io/docs/)
- [Kyverno CLI](https://kyverno.io/docs/kyverno-cli/)
- [Kyverno verifyImages Rule](https://kyverno.io/policies/best-practices/image-verification/image-verification/image-verification/)
- [Kyverno GitHub](https://github.com/kyverno/kyverno)
- [Kyverno Installation](https://kyverno.io/docs/installation/)
- [Policy Report Schema](https://github.com/kubernetes-sigs/wg-policy-prototypes/tree/master/policy-report)
- [Cosign Documentation](https://docs.sigstore.dev/)
- [Sigstore Transparency Logs](https://docs.sigstore.dev/rekor/overview/)
- [Kyverno Image Verification Guide](https://kyverno.io/policies/best-practices/image-verification/)
- [Container Image Signing with Cosign](https://kyverno.io/policies/best-practices/image-verification/cosign-image-verification/cosign-image-verification/)
