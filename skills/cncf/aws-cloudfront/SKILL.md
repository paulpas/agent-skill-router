---
name: aws-cloudfront
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Configures CloudFront CDN for global content distribution with edge
  caching" DDoS protection, and SSL/TLS termination for improved performance and security.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-route53, aws-s3
  role: reference
  scope: infrastructure
  triggers: cloudfront, cdn, content distribution, edge caching, ddos protection,
    waf, ssl termination, content delivery
  archetypes:
  - educational
  - strategic
  anti_triggers:
  - brainstorming
  - vague ideation
  - non-containerized architecture
  response_profile:
    verbosity: medium
    directive_strength: low
    abstraction_level: strategic
version: "1.0.0"
---
# CloudFront (Amazon CloudFront)

Distribute content globally with edge caching, DDoS protection, and SSL/TLS termination for improved performance and security.

## TL;DR Checklist

- [ ] Use CloudFront for all static content (CSS, JS, images)
- [ ] Set appropriate cache TTLs based on content type
- [ ] Enable compression for text content
- [ ] Use Origin Access Identity (OAI) for S3 buckets
- [ ] Enable WAF for DDoS and attack protection
- [ ] Implement cache invalidation strategy
- [ ] Monitor cache hit ratio and improve
- [ ] Use SSL/TLS for all distributions
- [ ] Enable query string and cookie forwarding selectively
- [ ] Set up CloudWatch metrics and alarms

---

## When to Use

Use CloudFront when:

- Serving static content globally
- Need DDoS protection
- Requiring content delivery close to users
- Building low-latency applications
- Reducing origin server load
- Streaming video content

---

## Purpose and Use Cases

**Primary Purpose:** Cache and deliver content globally from edge locations with DDoS protection, SSL/TLS termination, and high performance.

**Common Use Cases:**

1. **Static Website** — S3 origin with CloudFront CDN
2. **API Acceleration** — CloudFront cache for API responses
3. **Video Streaming** — Deliver video from edge locations
4. **DDoS Protection** — AWS Shield Standard + WAF
5. **Application Acceleration** — Reduce latency globally

---

## Architecture Design Patterns

### Pattern 1: S3 Static Website with CloudFront

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # S3 Bucket for Website
  WebsiteBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'website-${AWS::AccountId}'
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      Tags:
        - Key: Purpose
          Value: website-cdn

  # CloudFront Origin Access Identity
  OriginAccessIdentity:
    Type: AWS::CloudFront::CloudFrontOriginAccessIdentity
    Properties:
      CloudFrontOriginAccessIdentityConfig:
        Comment: OAI for S3 website bucket

  # S3 Bucket Policy for CloudFront
  BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref WebsiteBucket
      PolicyText:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::cloudfront.amazonaws.com:user/CloudFront Origin Access Identity ${OriginAccessIdentity}'
            Action: s3:GetObject
            Resource: !Sub '${WebsiteBucket.Arn}/*'

  # CloudFront Distribution
  Distribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        HttpVersion: http2and3
        DefaultRootObject: index.html
        Comment: CDN for website
        PriceClass: PriceClass_100  # US, Canada, Europe
        
        # Origin - S3 Bucket
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt WebsiteBucket.RegionalDomainName
            S3OriginConfig:
              OriginAccessIdentity: !Sub 'origin-access-identity/cloudfront/${OriginAccessIdentity}'
            OriginAccessControlId: !Ref OriginAccessControl
        
        # Default Cache Behavior
        DefaultCacheBehavior:
          AllowedMethods:
            - GET
            - HEAD
            - OPTIONS
          CachedMethods:
            - GET
            - HEAD
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          Compress: true
          
          # Cache Policy
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6  # Managed-CachingOptimized
          
          # Origin Request Policy
          OriginRequestPolicyId: 216adef5-5c7f-47e4-b989-5492eafa07d3  # Managed-CORS-S3Origin
        
        # Cache Behaviors for Different Content Types
        CacheBehaviors:
          # HTML with short TTL
          - PathPattern: '*.html'
            AllowedMethods:
              - GET
              - HEAD
            CachedMethods:
              - GET
              - HEAD
            TargetOriginId: S3Origin
            ViewerProtocolPolicy: redirect-to-https
            Compress: true
            CachePolicyId: 4135ea3d-c35d-46eb-81d7-reeSPECIFIC  # Managed-CachingDisabled for HTML
          
          # API Gateway Origin
          - PathPattern: '/api/*'
            AllowedMethods:
              - GET
              - HEAD
              - OPTIONS
              - PUT
              - POST
              - PATCH
              - DELETE
            CachedMethods:
              - GET
              - HEAD
            TargetOriginId: APIOrigin
            ViewerProtocolPolicy: https-only
            Compress: true
            CachePolicyId: 4135ea3d-c35d-46eb-81d7-reeSPECIFIC  # Managed-CachingDisabled
            OriginRequestPolicyId: b689b0a8-53d0-4196-a37e-61753b0d5ef7  # Managed-AllViewerAndWhitelistCloudFront
        
        # Restrictions
        Restrictions:
          GeoRestriction:
            RestrictionType: none
        
        # SSL Certificate
        ViewerCertificate:
          CloudFrontDefaultCertificate: true
        
        # CloudWatch Logging
        Logging:
          Bucket: !GetAtt LoggingBucket.DomainName
          Prefix: cloudfront-logs/
          IncludeCookies: false
      Tags:
        - Key: Purpose
          Value: website-cdn

  # Logging Bucket
  LoggingBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'cloudfront-logs-${AWS::AccountId}'
      AccessControl: LogDeliveryWrite
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true

  # Origin Access Control (newer than OAI)
  OriginAccessControl:
    Type: AWS::CloudFront::OriginAccessControl
    Properties:
      OriginAccessControlConfig:
        Name: S3OAC
        OriginAccessControlOriginType: s3
        SigningBehavior: always
        SigningProtocol: sigv4

  # CloudWatch Metrics
  CacheHitRateMetric:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: cloudfront-low-cache-hit-rate
      MetricName: CacheHitRate
      Namespace: AWS/CloudFront
      Statistic: Average
      Period: 3600
      EvaluationPeriods: 1
      Threshold: 50
      ComparisonOperator: LessThanThreshold
      Dimensions:
        - Name: DistributionId
          Value: !Ref Distribution

  # WAF Association
  DistributionWAF:
    Type: AWS::WAFv2::WebACL
    Properties:
      Scope: CLOUDFRONT
      DefaultAction:
        Allow: {}
      Rules:
        - Name: AWSManagedRulesCommonRuleSet
          Priority: 1
          OverrideAction:
            None: {}
          VisibilityConfig:
            SampledRequestsEnabled: true
            CloudWatchMetricsEnabled: true
            MetricName: AWSManagedRulesCommonRuleSetMetric
          Statement:
            ManagedRuleGroupStatement:
              VendorName: AWS
              Name: AWSManagedRulesCommonRuleSet
      VisibilityConfig:
        SampledRequestsEnabled: true
        CloudWatchMetricsEnabled: true
        MetricName: DistributionWAF

Outputs:
  DistributionDomainName:
    Value: !GetAtt Distribution.DomainName
    Description: CloudFront distribution domain name
  DistributionId:
    Value: !Ref Distribution
    Description: CloudFront distribution ID
```

**Key Elements:**
- S3 origin with OAI for secure access
- Default cache behavior with compression
- Multiple cache behaviors for different content types
- CloudFront logging to S3
- WAF for DDoS and attack protection
- CloudWatch metrics and alarms

---

## Integration Approaches

### 1. Integration with S3

CloudFront + S3 enables:
- Static content caching at edge
- Reduced S3 API costs
- Origin Access Identity for security

### 2. Integration with ALB/API Gateway

CloudFront + ALB provides:
- Dynamic content caching
- Origin Shield for additional layer
- Request/response rewriting

### 3. Integration with ACM

ACM + CloudFront enables:
- SSL/TLS termination at edge
- Custom domain names
- Certificate management

### 4. Integration with WAF

WAF + CloudFront provides:
- DDoS protection
- Attack mitigation
- Rate limiting

---

## Common Pitfalls

### ❌ Pitfall 1: Low Cache Hit Ratio

**Problem:** Most requests miss cache; high origin load.

**Solution:**
- Analyze query strings (cache key)
- Minimize cookies
- Extend TTLs for static content
- Use Origin Shield for additional caching layer

### ❌ Pitfall 2: Stale Content After Deploy

**Problem:** Users see old version after code deploy.

**Solution:**
- Implement cache invalidation in CI/CD
- Use versioned filenames (app.v1.js)
- Set appropriate TTLs per content type

### ❌ Pitfall 3: No Origin Failover

**Problem:** Origin down = CDN down (no cached fallback).

**Solution:**
- Configure multiple origins with failover
- Cache dynamic content briefly
- Implement error pages in S3

### ❌ Pitfall 4: Slow Origin Causing Slowness

**Problem:** Even cached requests slow if origin slow.

**Solution:**
- Use Origin Shield for additional caching
- Optimize origin performance
- Monitor origin latency

### ❌ Pitfall 5: No DDoS Protection

**Problem:** Large DDoS attacks overwhelm edge.

**Solution:**
- Enable AWS Shield Standard (automatic)
- Add WAF for application protection
- Monitor CloudFront metrics

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Caching** | High TTL for static; low for dynamic |
| **Hit Ratio** | Monitor and optimize query strings |
| **Invalidation** | Versioned filenames; CI/CD automation |
| **Security** | WAF enabled; HTTPS only; OAI for S3 |
| **Performance** | Origin Shield; compression enabled |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-s3` | Origin bucket for static content |
| `cncf-aws-route53` | DNS alias to CloudFront |
| `cncf-aws-acm` | SSL/TLS certificates |
---

## Core Workflow

1. **Assess Requirements** — Understand the use case, scale, integration needs, and existing infrastructure. **Checkpoint:** Document requirements, constraints, and success criteria.

2. **Design Architecture** — Plan component interactions, data flow, and deployment strategy using cloud-native best practices. **Checkpoint:** Verify the architecture addresses all requirements and follows CNCF conventions.

3. **Implement & Configure** — Create manifests, configurations, and deployment scripts. Include resource limits, health checks, and observability hooks. **Checkpoint:** Validate all YAML against schema and test in a staging environment.

4. **Deploy & Monitor** — Apply manifests to the cluster, verify component health, and confirm observability is working. **Checkpoint:** Confirm all pods/services are running, probes passing, and metrics/alerts configured.

---

## Constraints

### MUST DO
- Include at least one complete working YAML manifest example
- Note when content is auto-generated vs. manually verified
- Reference relevant CNCF project documentation

### MUST NOT DO
- Deploy manifests without testing in a staging environment first
- Use deprecated API versions (e.g., apps/v1beta1)
- Omit resource limits and requests in Kubernetes manifests
