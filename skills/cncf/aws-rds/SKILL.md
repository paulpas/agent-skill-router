---
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: '"Deploys managed relational databases (MySQL, PostgreSQL, MariaDB, Oracle"
  SQL Server) with multi-AZ failover, automated backups, read replicas, and encryption
  for production-grade database infrastructure.'
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: manifests
  related-skills: aws-auto-scaling, aws-cloudformation, aws-cloudwatch, aws-kms
  role: reference
  scope: infrastructure
  triggers: rds, relational database, mysql, postgresql, multi-az, database failover,
    read replica, automated backup
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
name: rds
------
# RDS (Relational Database Service)

Deploy managed relational databases with automated administration, high availability, and advanced features like automated backups, read replicas, and multi-AZ failover.

## TL;DR Checklist

- [ ] Enable Multi-AZ deployment for production databases
- [ ] Configure automated backups with appropriate retention period (7-35 days)
- [ ] Create read replicas for read-heavy workloads and reporting
- [ ] Enable encryption at rest with AWS KMS
- [ ] Enable encryption in transit (SSL/TLS)
- [ ] Configure security groups with principle of least privilege
- [ ] Implement parameter groups for performance tuning
- [ ] Enable CloudWatch Enhanced Monitoring
- [ ] Implement automated failover testing
- [ ] Use database activity stream for audit logging
- [ ] Configure backup windows during low-traffic periods
- [ ] Enable deletion protection for production databases

