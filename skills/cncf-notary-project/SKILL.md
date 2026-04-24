---
name: cncf-notary-project
description: Notary Project in Content Trust &amp; Security - cloud native architecture,
  patterns, pitfalls, and best practices
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: content, how do i find security issues, notary project, notary-project,
    security, trust, vulnerability scanning, security auditing
  related-skills: cncf-openfga
---



# Notary Project in Cloud-Native Engineering

**Category:** security  
**Status:** Sandbox  
**Stars:** 4,100  
**Last Updated:** 2026-04-22  
**Primary Language:** Go  
**Documentation:** [https://notaryproject.dev/](https://notaryproject.dev/)  

---

## Purpose and Use Cases

### What Problem Does It Solve?

The Notary Project addresses the critical need for content trust and supply chain security in container and software distribution. Without proper content verification, attackers can inject malicious code into container images, Helm charts, or other software artifacts that are then deployed to production environments. Notary provides a framework for signing and verifying artifact integrity and authenticity.

### When to Use This Project

Use Notary when you need:
- Sign and verify container images and artifacts
- Prevent tampering with software supply chain
- Ensure artifact authenticity from trusted publishers
- Implement keyless signing with Sigstore integration
- Manage signing keys securely across teams
- Verify artifact integrity before deployment

### Key Use Cases

- **Container Image Signing**: Sign Docker images before pushing to registry
- **Helm Chart Signing**: Verify Helm chart authenticity before deployment
- **Artifact Integrity**: Ensure artifacts haven't been modified in transit
- **Supply Chain Security**: Implement SLSA compliance with artifact signing
- **Key Management**: Securely manage signing keys with Keyless or KMS
- **CI/CD Integration**: Automate signing and verification in pipelines

---

## Architecture Design Patterns

### Core Components

- **Notary Server**: Centralized server for managing signing keys and metadata
- **Notary Client**: CLI tool for signing and verifying artifacts
- **TUF (The Update Framework)**: Framework for secure software updates
- **Delegated Signers**: Multiple signers with specific roles and authorities
- **Key Management**: Secure storage and management of signing keys
- **Signatures Storage**: Separate storage for signature metadata
- **Notary V2**: Modern implementation with Sigstore integration

### Component Interactions

1. **Publisher → Notary Client**: Request to sign artifact
2. **Notary Client → TUF**: Create metadata for artifact and signatures
3. **TUF → Key Manager**: Access signing keys for signature generation
4. **Notary Client → Registry**: Push artifact and signature metadata
5. **Consumer → Registry**: Pull artifact and signature metadata
6. **Consumer → Notary Client**: Verify artifact authenticity
7. **Notary Client → Key Manager**: Verify signature with public keys

### Data Flow Patterns

1. **Signing Flow**: Artifact → TUF metadata → Signature → Push to registry
2. **Verification Flow**: Pull artifact + signatures → Verify signature → Verify TUF metadata → Trust
3. **Key Rotation**: New keys → TUF metadata update → Push to registry → Clients update
4. **Delegation Flow**: Delegated signer → Signature → TUF metadata → Verification

### Design Principles

- **Security First**: Defense in depth with multiple verification layers
- **Flexible Signing**: Support for multiple signing methods (keyless, KMS, traditional)
- **Decentralized Trust**: TUF allows for multiple delegatable signers
- **Standard Format**: Use standard TUF metadata format for interoperability
- **Key Rotation**: Support for key rotation without service disruption
- **Verifiable History**: Complete history of all artifact changes

---

## Integration Approaches

### Integration with Other CNCF Projects

- **Containerd**: Sign and verify container images via containerd
- **Docker**: Integrate Notary with Docker for image signing
- **Kubernetes**: Verify images in admission controllers
- **Helm**: Sign and verify Helm charts
- **Kaniko**: Sign images built with Kaniko
- **Tekton**: Automate signing in CI/CD pipelines
- **Grafana**: Verify artifact integrity in monitoring

### API Patterns

- **Registry API**: Extend OCI registry with signature storage
- **Notary CLI**: Command-line interface for signing and verification
- **REST API**: HTTP API for programmatic access
- **TUF Metadata API**: Access and update TUF metadata

### Configuration Patterns

- **Signing Keys**: Configure key storage (local, KMS, Keyless)
- **Delegation**: Set up delegated signer roles
- **Registry Integration**: Configure registry for signature storage
- **Verification Policies**: Define trust policies for verification

### Extension Mechanisms

- **Custom Key Management**: Support additional KMS providers
- **Custom Verifiers**: Implement custom verification logic
- **Webhooks**: Notify on signing events
- **Metrics Export**: Extend metrics with custom data

---

## Common Pitfalls and How to Avoid Them

### Configuration Issues

- **Key Storage**: Ensure signing keys are properly secured
- **TUF Metadata**: Keep TUF metadata synchronized with artifacts
- **Root Keys**: Secure root keys and establish key rotation procedures
- **Registry Integration**: Verify registry supports Notary signatures
- **Delegation Setup**: Properly configure delegated signer permissions

### Performance Issues

- **Signature Verification**: Optimize verification for large artifact sets
- **Metadata Refresh**: Balance metadata freshness with performance
- **Network Latency**: Minimize network calls for signature verification

### Operational Challenges

- **Key Recovery**: Implement secure key backup and recovery procedures
- **Metadata Sync**: Ensure consistent TUF metadata across clients
- **Version Compatibility**: Manage compatibility between Notary V1 and V2
- **Rolling Updates**: Plan for zero-downtime updates

### Security Pitfalls

- **Key Exposure**: Never store private keys in plaintext
- **Unverified Artifacts**: Always verify before deploying
- **Stale Metadata**: Regularly refresh TUF metadata
- **Insufficient Delegation**: Overly broad delegation permissions

---

## Coding Practices

### Idiomatic Configuration

- **Keyless Mode**: Use Sigstore for keyless signing
- **KMS Integration**: Use cloud KMS for enterprise key management
- **Delegation YAML**: Declarative delegation configuration
- **Verification Policies**: Define trust policies in YAML

### API Usage Patterns

- **Sign Command**: Sign artifacts via Notary CLI
- **Verify Command**: Verify artifact authenticity
- **TUF Metadata Query**: Query TUF metadata programmatically
- **Delegation Management**: Manage delegated signers

### Observability Best Practices

- **Signing Events**: Log signing events for audit
- **Verification Failures**: Monitor and alert on verification failures
- **Key Rotation**: Track key rotation events
- **TUF Sync**: Monitor TUF metadata synchronization

### Development Workflow

- **Local Testing**: Test signing and verification locally first
- **Staging Environment**: Verify signing workflow in staging
- **CI/CD Integration**: Automate signing in CI/CD pipelines
- **Rollback Plans**: Test recovery from key loss or corruption

---

## Fundamentals

### Essential Concepts

- **Artifact**: Software being signed (container image, Helm chart, binary)
- **Signature**: Cryptographic proof of artifact authenticity
- **TUF Metadata**: Signed metadata describing artifact versions and signatures
- **Delegation**: Authorizing specific signers for specific paths
- **Root Key**: Top-level key that signs all TUF metadata
- **Snapshot/Targets**: TUF metadata types for artifact management
- **Keyless**: Sigstore-based signing without key management

### Terminology Glossary

- **Artifact**: Software being distributed with Notary
- **Signature**: Cryptographic signature of artifact
- **TUF**: The Update Framework for secure software updates
- **Targets**: Metadata type for artifact listings
- **Snapshot**: Metadata for version tracking
- **Delegation**: Authorized signer with limited scope
- **Root Key**: Top-level key in TUF hierarchy
- **Keyless**: Sigstore-based signing approach

### Data Models and Types

- **Artifact**: Name, digest, signature, metadata
- **TUF Metadata**: Signed metadata for artifact versions
- **Signature**: Cryptographic signature and key information
- **Delegation**: Delegated signer configuration
- **Key**: Public/private key pair for signing

### Lifecycle Management

- **Signing Lifecycle**: Artifact → Sign → Push → Metadata updated
- **Verification Lifecycle**: Pull → Verify → Trust/Deny → Deploy
- **Key Lifecycle**: Generate → Distribute → Rotate → Compromise response
- **TUF Update**: Metadata refresh → Verification → Deployment

### State Management

- **Artifact State**: Signed, unsigned, verified, unverified
- **Key State**: Active, rotated, compromised, revoked
- **Metadata State**: Current, outdated, synced, desynced

---

## Scaling and Deployment Patterns

### Horizontal Scaling

- **Notary Server Scaling**: Scale for high-throughput signing operations
- **Signature Storage**: Scale storage for large artifact sets
- **Verification Load**: Scale verification servers for parallel checks

### High Availability

- **Server Redundancy**: Deploy multiple Notary servers
- **Database HA**: Use HA database for metadata storage
- **Key Backup**: Secure backup of all signing keys
- **Certificate Management**: Automated certificate renewal

### Production Deployments

- **Production Server**: Deploy Notary with HA configuration
- **Sigstore Integration**: Use Sigstore for keyless signing
- **KMS Integration**: Use enterprise KMS for key management
- **Monitoring**: Set up alerting for signing and verification issues

### Upgrade Strategies

- **Minor Version**: In-place upgrade with metadata compatibility
- **Major Version**: Plan migration with testing
- **TUF Version**: Handle TUF metadata version transitions
- **Rollback Plan**: Keep previous version available

### Resource Management

- **Storage**: Monitor metadata storage usage
- **Memory**: Configure memory for signature verification
- **CPU**: Balance signing and verification workload
- **Network**: Monitor signature sync network traffic

---

## Additional Resources

- **Official Documentation:** [https://notaryproject.dev/docs/](https://notaryproject.dev/docs/)
- **GitHub Repository:** [github.com/notaryproject/notary](https://github.com/notaryproject/notary)
- **CNCF Project Page:** [cncf.io/projects/notary/](https://www.cncf.io/projects/notary/)
- **Community:** Check the GitHub repository for community channels
- **Versioning:** Refer to project's release notes for version-specific features

---

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check pod logs for errors
   - Verify configuration values
   - Ensure network connectivity

2. **Performance Issues**
   - Monitor resource usage
   - Adjust resource limits
   - Check for bottlenecks

3. **Configuration Errors**
   - Validate YAML syntax
   - Check required fields
   - Verify environment-specific settings

4. **Integration Problems**
   - Verify API compatibility
   - Check dependency versions
   - Review integration documentation

### Getting Help

- Check official documentation
- Search GitHub issues
- Join community channels
- Review logs and metrics
*Content generated automatically. Verify against official documentation before production use.*

## Examples

### Basic Configuration


```yaml
# Basic configuration example
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{project_name}}-config
  namespace: default
data:
  # Configuration goes here
  config.yaml: |
    # Base configuration
    # Add your settings here
```

### Kubernetes Deployment


```yaml
# Kubernetes deployment for {{project_name}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{project_name}}
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {{project_name}}
  template:
    metadata:
      labels:
        app: {{project_name}}
    spec:
      containers:
      - name: {{project_name}}
        image: {{project_name}}:latest
        ports:
        - containerPort: 8080
        resources:
          limits:
            memory: "128Mi"
            cpu: "500m"
```

### Kubernetes Service


```yaml
# Kubernetes service for {{project_name}}
apiVersion: v1
kind: Service
metadata:
  name: {{project_name}}
  namespace: default
spec:
  selector:
    app: {{project_name}}
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: ClusterIP
```

