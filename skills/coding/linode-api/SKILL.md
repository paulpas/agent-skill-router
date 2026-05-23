---
name: linode-api
description: Integrates Linode/Akamai Cloud services (Instances, Object Storage, LKE
  Kubernetes, NodeBalancers) using the linode_api4 Python SDK with token-based authentication
  and model-driven resource patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: linode api, akamai cloud, linode python, linode instances, linode kubernetes,
    nodebalancer, object storage, how do i use linode api from python
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  related-skills: digitalocean-api, aws-sdk, cloudflare-api
------

# Linode/Akamai Cloud API Integration Patterns

Integrates Linode (Akamai Connected Cloud) services using the official `linode_api4` Python SDK. Covers Personal Access Token authentication, Linode Instance lifecycle, Object Storage (S3-compatible), Linode Kubernetes Engine (LKE) cluster management, and NodeBalancer configuration with the SDK's model-driven design and filtering system.

## TL;DR Checklist

- [ ] Use `LinodeClient(token)` with a Personal Access Token from the Cloud Manager
- [ ] Use grouped accessors: `client.linode.instances()`, `client.lke.clusters()`, `client.networking.nodebalancers()`
- [ ] Use model attributes for filtering: `Instance.region == "us-east"`
- [ ] Handle `ApiError` with specific HTTP status codes for error recovery
- [ ] Use `client.linode.instance_create()` for provisioning Linodes with root password auto-generation
- [ ] Use `client.lke.cluster_create()` for managed Kubernetes clusters

