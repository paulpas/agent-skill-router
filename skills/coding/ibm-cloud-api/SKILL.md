---
name: ibm-cloud-api
description: Integrates IBM Cloud services (Watson AI, Cloud Foundry, Kubernetes Service,
  Cloud Object Storage) using IBM Cloud SDK for Python with IAM authentication and
  service patterns.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: ibm cloud, watson api, ibm cloud sdk, cloud object storage, ibm kubernetes,
    cloud foundry, how do i use ibm cloud from python
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
  related-skills: aws-sdk, azure-sdk, oci-sdk
------

# IBM Cloud API & Watson SDK Integration Patterns

Integrates IBM Cloud services using the `ibm-cloud-sdk-core` authenticators and service SDKs. Covers IAM authentication patterns, Watson AI services (Assistant, Natural Language Understanding), Cloud Object Storage (COS), IBM Cloud Kubernetes Service (IKS), and Cloud Foundry resource management with the `ibm_boto3` and `ibm_watson` libraries.

## TL;DR Checklist

- [ ] Use `IAMAuthenticator` from `ibm_cloud_sdk_core` for service authentication
- [ ] Install specific service packages (`ibm-watson`, `ibm-cos-sdk`) — granular, not monolithic
- [ ] Handle `ApiException` with specific error codes for Watson services
- [ ] Use `ibm_boto3` for Cloud Object Storage (S3-compatible API)
- [ ] Set service URLs explicitly — IBM Cloud services have regional endpoints
- [ ] Use `VCAP_SERVICES` environment variable for Cloud Foundry-deployed apps
- [ ] Use context managers for COS client lifecycle

