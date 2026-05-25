---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Configures DNS routing with Route 53 for domain registration, health"
  checks, failover, and traffic management with private hosted zones.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-cloudfront, aws-cloudwatch, aws-elb, cni
  role: reference
  scope: infrastructure
  triggers: cname, dns, domain, failover, health check, hosted zone, route 53, traffic
    policy
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
  version: 1.0.0
name: route53
------
# Route 53 (Amazon Route 53)

Configure DNS routing, domain management, and health checks with support for failover, weighted routing, and geolocation-based policies.

## TL;DR Checklist

- [ ] Use health checks for failover routing
- [ ] Implement weighted routing for gradual traffic shifts
- [ ] Use geolocation routing for regional optimization
- [ ] Configure private hosted zones for internal DNS
- [ ] Enable query logging for DNS analysis
- [ ] Monitor health check status with CloudWatch
- [ ] Use traffic policies for complex routing
- [ ] Implement TTL appropriately (short for failover)
- [ ] Test failover procedures regularly
- [ ] Monitor query count and latency

---

## When to Use

Use Route 53 when:

- Managing domain DNS
- Implementing active-active failover
- Routing traffic based on geography
- Building private internal DNS zones
- Health checking and automatic failover
- Traffic management and optimization

---

## Purpose and Use Cases

**Primary Purpose:** Provide highly available DNS service with health checking, failover, and advanced routing policies.

**Common Use Cases:**

1. **Domain Registration** — Buy and manage domains
2. **Health-Based Failover** — Automatic failover on endpoint failure
3. **Geographic Routing** — Route to nearest region
4. **Weighted Routing** — A/B testing, gradual migration
5. **Internal DNS** — Private hosted zones for VPC

---

## Architecture Design Patterns

### Pattern 1: Active-Active Failover with Health Checks

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  # Primary ALB Health Check
  PrimaryHealthCheck:
    Type: AWS::Route53::HealthCheck
    Properties:
      Type: HTTPS
      ResourcePath: /health
      FullyQualifiedDomainName: primary.example.com
      Port: 443
      RequestInterval: 30
      FailureThreshold: 3
      HealthCheckTags:
        - Key: Name
          Value: primary-health-check

  # Secondary ALB Health Check
  SecondaryHealthCheck:
    Type: AWS::Route53::HealthCheck
    Properties:
      Type: HTTPS
      ResourcePath: /health
      FullyQualifiedDomainName: secondary.example.com
      Port: 443
      RequestInterval: 30
      FailureThreshold: 3
      HealthCheckTags:
        - Key: Name
          Value: secondary-health-check

  # Hosted Zone
  HostedZone:
    Type: AWS::Route53::HostedZone
    Properties:
      Name: example.com
      HostedZoneConfig:
        Comment: Primary hosted zone
      Tags:
        - Key: Name
          Value: example-zone

  # Primary A Record with Failover
  PrimaryRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZone
      Name: api.example.com
      Type: A
      AliasTarget:
        HostedZoneId: Z35SXDOTRQ7X7K  # ALB zone ID
        DNSName: primary-alb-123456789.us-east-1.elb.amazonaws.com
        EvaluateTargetHealth: true
      SetIdentifier: Primary
      Failover: PRIMARY
      HealthCheckId: !Ref PrimaryHealthCheck

  # Secondary A Record with Failover
  SecondaryRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZone
      Name: api.example.com
      Type: A
      AliasTarget:
        HostedZoneId: Z35SXDOTRQ7X7K
        DNSName: secondary-alb-987654321.eu-west-1.elb.amazonaws.com
        EvaluateTargetHealth: false
      SetIdentifier: Secondary
      Failover: SECONDARY

  # CloudWatch Alarm for Health Check
  HealthCheckAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: route53-health-check-failed
      MetricName: HealthCheckStatus
      Namespace: AWS/Route53
      Statistic: Minimum
      Period: 60
      EvaluationPeriods: 2
      Threshold: 1
      ComparisonOperator: LessThanThreshold
      Dimensions:
        - Name: HealthCheckId
          Value: !Ref PrimaryHealthCheck

Outputs:
  NameServers:
    Value: !Join
      - ','
      - !GetAtt HostedZone.NameServers
    Description: Route 53 name servers
```

**Key Elements:**
- Health checks for both primary and secondary
- Failover routing records
- Alias targets to ALBs
- Automatic failover on health check failure

### Pattern 2: Weighted Routing for Canary Deployments

```yaml
Resources:
  # 90% traffic to blue (current version)
  BlueRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZone
      Name: app.example.com
      Type: A
      AliasTarget:
        HostedZoneId: Z35SXDOTRQ7X7K
        DNSName: blue-alb.us-east-1.elb.amazonaws.com
        EvaluateTargetHealth: true
      SetIdentifier: Blue
      Weight: 90
      HealthCheckId: !Ref BlueHealthCheck

  # 10% traffic to green (new version)
  GreenRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZone
      Name: app.example.com
      Type: A
      AliasTarget:
        HostedZoneId: Z35SXDOTRQ7X7K
        DNSName: green-alb.us-east-1.elb.amazonaws.com
        EvaluateTargetHealth: true
      SetIdentifier: Green
      Weight: 10
      HealthCheckId: !Ref GreenHealthCheck
```

**Key Elements:**
- Weighted routing for gradual traffic shift
- 90/10 split for canary deployment
- Health checks on both versions
- Easy adjustment of weights for rollback

### Pattern 3: Geolocation Routing

```yaml
Resources:
  # US Region
  USRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZone
      Name: cdn.example.com
      Type: A
      AliasTarget:
        HostedZoneId: Z35SXDOTRQ7X7K
        DNSName: us-alb.us-east-1.elb.amazonaws.com
        EvaluateTargetHealth: true
      SetIdentifier: US
      GeoLocation:
        CountryCode: US

  # EU Region
  EURecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZone
      Name: cdn.example.com
      Type: A
      AliasTarget:
        HostedZoneId: Z35SXDOTRQ7X7K
        DNSName: eu-alb.eu-west-1.elb.amazonaws.com
        EvaluateTargetHealth: true
      SetIdentifier: EU
      GeoLocation:
        ContinentCode: EU

  # Default (catch-all)
  DefaultRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZone
      Name: cdn.example.com
      Type: A
      AliasTarget:
        HostedZoneId: Z35SXDOTRQ7X7K
        DNSName: global-alb.us-east-1.elb.amazonaws.com
        EvaluateTargetHealth: true
      SetIdentifier: Default
      GeoLocation:
        CountryCode: '*'
```

**Key Elements:**
- Geolocation routing by country/continent
- Route US traffic to US region
- Route EU traffic to EU region
- Default route for others

---

## Integration Approaches

### 1. Integration with CloudFront

Route 53 + CloudFront:
- DNS resolution to CloudFront distribution
- Geolocation routing to regional distributions
- Health checking of origin endpoints

### 2. Integration with ALB/NLB

Route 53 + Load Balancers:
- Alias records to load balancer endpoints
- Health checks for automatic failover
- Multi-region active-active setup

### 3. Integration with CloudWatch

CloudWatch + Route 53:
- Health check metrics
- Query count monitoring
- Latency analysis

---

## Common Pitfalls

### ❌ Pitfall 1: TTL Too Long

**Problem:** DNS changes slow to propagate; delays failover.

**Solution:**
- Short TTL for critical records (60-300s)
- Longer TTL for stable records (3600-86400s)

### ❌ Pitfall 2: Health Check Too Lenient

**Problem:** Unhealthy endpoints still receive traffic.

**Solution:**
- FailureThreshold = 3 (appropriate)
- RequestInterval = 30s (timely detection)
- Test health check endpoint regularly

### ❌ Pitfall 3: No Health Checks

**Problem:** Failed endpoints cause user errors.

**Solution:**
- Always use health checks for failover
- Monitor health check status
- Alert on check failures

### ❌ Pitfall 4: Incomplete Failover Testing

**Problem:** Failover doesn't work when actually needed.

**Solution:**
- Regular failover drills
- Monitor health check behavior
- Test DNS propagation timing

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Routing** | Health checks for failover; weighted for canary |
| **TTL** | Short for critical; long for stable |
| **Health Checks** | 30s interval; 3 failure threshold |
| **Monitoring** | CloudWatch alarms on check failures |
| **Testing** | Regular failover drills |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-elb` | Failover targets (ALB/NLB) |
| `cncf-aws-cloudfront` | CDN endpoints for routing |
| `cncf-aws-cloudwatch` | Health check monitoring |
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
