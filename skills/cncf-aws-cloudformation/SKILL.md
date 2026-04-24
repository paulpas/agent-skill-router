---
name: cncf-aws-cloudformation
description: Creates Infrastructure as Code templates with CloudFormation for reproducible,
  versioned, automated deployments of entire AWS infrastructure stacks.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: cncf
  role: reference
  scope: infrastructure
  output-format: manifests
  triggers: cloudformation, infrastructure as code, iac, cloudformation template,
    stack, aws template, yaml, json
  related-skills: cncf-aws-ec2, cncf-aws-iam, cncf-aws-rds, cncf-aws-s3
---


# CloudFormation

Design and deploy complete AWS infrastructure as code using templates, enabling version control, repeatable deployments, and automated stack management.

## TL;DR Checklist

- [ ] Use YAML format for templates (more readable than JSON)
- [ ] Parameterize templates for reusability across environments
- [ ] Use Outputs to expose important resource values
- [ ] Implement change sets before updating production stacks
- [ ] Version control all templates in Git
- [ ] Use DependsOn for explicit resource dependencies
- [ ] Implement rollback on update failure
- [ ] Create separate templates for modularity (nested stacks)
- [ ] Use stack policies to prevent accidental resource deletion
- [ ] Tag all resources for cost allocation and management

---

## When to Use

Use CloudFormation when:

- Infrastructure needs to be reproducible across environments
- Requiring version control for infrastructure changes
- Automating infrastructure provisioning and updates
- Building reusable templates for common architectures
- Implementing infrastructure as code (IaC) practices
- Coordinating complex resource dependencies

---

## When NOT to Use

Avoid CloudFormation when:

- Building one-off infrastructure (manual console is faster)
- Requiring rapid prototyping (AWS CDK may be better)
- Managing third-party services (use Terraform instead)
- Working with non-AWS resources exclusively

---

## Purpose and Use Cases

**Primary Purpose:** Provide declarative infrastructure as code enabling version-controlled, repeatable, automated deployments of entire AWS infrastructure stacks.

**Common Use Cases:**

1. **Environment Templates** — Dev, staging, production environments from same template
2. **Disaster Recovery** — Rebuild entire infrastructure in secondary region
3. **Multi-Account Deployments** — Deploy stack across multiple AWS accounts
4. **Blue-Green Deployments** — Create new stack, test, then switch traffic
5. **Infrastructure Automation** — CI/CD pipelines deploy infrastructure changes
6. **Compliance and Governance** — Enforce architecture standards via templates

---

## Architecture Design Patterns

### Pattern 1: Modular Multi-AZ Web Application Stack

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Production web application stack with VPC, RDS, and ALB

Metadata:
  AWS::CloudFormation::Interface:
    ParameterGroups:
      - Label:
          default: Network Configuration
        Parameters:
          - VPCCidr
          - Environment
          - EnableEncryption
      - Label:
          default: Database Configuration
        Parameters:
          - DBInstanceClass
          - DBAllocatedStorage

Parameters:
  Environment:
    Type: String
    Default: production
    AllowedValues:
      - development
      - staging
      - production
    Description: Environment name

  VPCCidr:
    Type: String
    Default: 10.0.0.0/16
    Description: CIDR block for VPC

  DBInstanceClass:
    Type: String
    Default: db.r6i.2xlarge
    Description: Database instance type
    AllowedValues:
      - db.t3.medium
      - db.r6i.xlarge
      - db.r6i.2xlarge
      - db.r6i.4xlarge

  DBAllocatedStorage:
    Type: Number
    Default: 100
    MinValue: 20
    MaxValue: 1000
    Description: Database storage in GB

  EnableEncryption:
    Type: String
    Default: 'true'
    AllowedValues:
      - 'true'
      - 'false'
    Description: Enable encryption at rest

Conditions:
  IsProduction: !Equals [!Ref Environment, production]
  ShouldEncrypt: !Equals [!Ref EnableEncryption, 'true']

Resources:
  # ==================== VPC ====================
  ProductionVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VPCCidr
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-vpc'

  # Public Subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref ProductionVPC
      CidrBlock: !Select [0, !Cidr [!Ref VPCCidr, 6, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-public-subnet-1'

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref ProductionVPC
      CidrBlock: !Select [1, !Cidr [!Ref VPCCidr, 6, 8]]
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-public-subnet-2'

  # Private Subnets
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref ProductionVPC
      CidrBlock: !Select [2, !Cidr [!Ref VPCCidr, 6, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-private-subnet-1'

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref ProductionVPC
      CidrBlock: !Select [3, !Cidr [!Ref VPCCidr, 6, 8]]
      AvailabilityZone: !Select [1, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-private-subnet-2'

  # Database Subnets
  DBSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref ProductionVPC
      CidrBlock: !Select [4, !Cidr [!Ref VPCCidr, 6, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-db-subnet-1'

  DBSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref ProductionVPC
      CidrBlock: !Select [5, !Cidr [!Ref VPCCidr, 6, 8]]
      AvailabilityZone: !Select [1, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-db-subnet-2'

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-igw'

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref ProductionVPC
      InternetGatewayId: !Ref InternetGateway

  # NAT Gateways
  NATGatewayEIP1:
    Type: AWS::EC2::EIP
    DependsOn: AttachGateway
    Properties:
      Domain: vpc
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-nat-eip-1'

  NATGateway1:
    Type: AWS::EC2::NatGateway
    Properties:
      AllocationId: !GetAtt NATGatewayEIP1.AllocationId
      SubnetId: !Ref PublicSubnet1

  # ==================== SECURITY ====================
  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: ALB security group
      VpcId: !Ref ProductionVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-alb-sg'

  AppSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Application security group
      VpcId: !Ref ProductionVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8080
          ToPort: 8080
          SourceSecurityGroupId: !Ref ALBSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-app-sg'

  DBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Database security group
      VpcId: !Ref ProductionVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 5432
          ToPort: 5432
          SourceSecurityGroupId: !Ref AppSecurityGroup
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-db-sg'

  # ==================== DATABASE ====================
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Database subnet group
      SubnetIds:
        - !Ref DBSubnet1
        - !Ref DBSubnet2
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-db-subnet-group'

  Database:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Snapshot
    Properties:
      DBInstanceIdentifier: !Sub '${Environment}-db'
      Engine: postgres
      EngineVersion: '14.7'
      DBInstanceClass: !Ref DBInstanceClass
      AllocatedStorage: !Ref DBAllocatedStorage
      StorageType: gp3
      StorageEncrypted: !If [ShouldEncrypt, true, false]
      MasterUsername: admin
      MasterUserPassword: !Sub '{{resolve:secretsmanager:${Environment}/db-password:SecretString:password}}'
      DBSubnetGroupName: !Ref DBSubnetGroup
      VPCSecurityGroups:
        - !Ref DBSecurityGroup
      MultiAZ: !If [IsProduction, true, false]
      BackupRetentionPeriod: !If [IsProduction, 30, 7]
      PreferredBackupWindow: '03:00-04:00'
      PreferredMaintenanceWindow: 'sun:04:00-sun:05:00'
      DeletionProtection: !If [IsProduction, true, false]
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-database'

Outputs:
  VPCId:
    Description: VPC ID
    Value: !Ref ProductionVPC
    Export:
      Name: !Sub '${Environment}-VPC-ID'

  PrivateSubnet1Id:
    Description: Private subnet 1 ID
    Value: !Ref PrivateSubnet1
    Export:
      Name: !Sub '${Environment}-PrivateSubnet1-ID'

  PrivateSubnet2Id:
    Description: Private subnet 2 ID
    Value: !Ref PrivateSubnet2
    Export:
      Name: !Sub '${Environment}-PrivateSubnet2-ID'

  DatabaseEndpoint:
    Description: Database endpoint address
    Value: !GetAtt Database.Endpoint.Address
    Export:
      Name: !Sub '${Environment}-Database-Endpoint'

  DBSecurityGroupId:
    Description: Database security group ID
    Value: !Ref DBSecurityGroup
    Export:
      Name: !Sub '${Environment}-DBSecurityGroup-ID'

  ALBSecurityGroupId:
    Description: ALB security group ID
    Value: !Ref ALBSecurityGroup
    Export:
      Name: !Sub '${Environment}-ALBSecurityGroup-ID'
```

**Key Elements:**
- Parameterized for environment reusability
- Conditional resources (production vs. development)
- Multi-AZ high availability
- Exports for cross-stack references
- Comprehensive Outputs for integration
- Clear resource naming and tagging

### Pattern 2: Change Set and Stack Policy for Safety

```yaml
# Create change set before updating stack
aws cloudformation create-change-set \
  --stack-name prod-stack \
  --change-set-name prod-stack-update-$(date +%s) \
  --template-body file://template.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production \
  --change-set-type UPDATE

# Review change set
aws cloudformation describe-change-set \
  --stack-name prod-stack \
  --change-set-name prod-stack-update-1234567890

# Execute change set
aws cloudformation execute-change-set \
  --stack-name prod-stack \
  --change-set-name prod-stack-update-1234567890

# Stack Policy to prevent accidental deletion
{
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": [
        "cloudformation:Delete",
        "cloudformation:Update"
      ],
      "Resource": "LogicalResourceId/Database",
      "Condition": {
        "StringNotLike": {
          "aws:PrincipalArn": "arn:aws:iam::123456789012:role/admin"
        }
      }
    },
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "cloudformation:Update",
      "Resource": "*"
    }
  ]
}
```

**Key Elements:**
- Change sets for safe updates (review before execute)
- Stack policies for protection
- Rollback on failure automatic
- CloudTrail logs all stack operations

### Pattern 3: Nested Stacks for Modularity

```yaml
# Parent stack references nested stacks
Resources:
  NetworkingStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      StackName: !Sub '${Environment}-networking'
      TemplateURL: https://s3.amazonaws.com/cf-templates/networking.yaml
      Parameters:
        VPCCidr: !Ref VPCCidr
        Environment: !Ref Environment

  DatabaseStack:
    Type: AWS::CloudFormation::Stack
    DependsOn: NetworkingStack
    Properties:
      StackName: !Sub '${Environment}-database'
      TemplateURL: https://s3.amazonaws.com/cf-templates/database.yaml
      Parameters:
        VPCId: !GetAtt NetworkingStack.Outputs.VPCId
        DBSubnetGroup: !GetAtt NetworkingStack.Outputs.DBSubnetGroupName

  ApplicationStack:
    Type: AWS::CloudFormation::Stack
    DependsOn: DatabaseStack
    Properties:
      StackName: !Sub '${Environment}-application'
      TemplateURL: https://s3.amazonaws.com/cf-templates/application.yaml
      Parameters:
        VPCId: !GetAtt NetworkingStack.Outputs.VPCId
        DatabaseEndpoint: !GetAtt DatabaseStack.Outputs.DatabaseEndpoint

Outputs:
  ApplicationURL:
    Value: !GetAtt ApplicationStack.Outputs.ApplicationURL
```

**Key Elements:**
- Modular nested stacks for separation of concerns
- DependsOn for ordered stack creation
- Cross-stack outputs via GetAtt
- Reusable templates for common infrastructure

---

## Integration Approaches

### 1. Integration with CodePipeline

CloudFormation + CodePipeline enables:
- Automated infrastructure deployments
- Change sets in CI/CD pipeline
- Approval workflows before production
- Rollback on pipeline failures

### 2. Integration with Service Catalog

Service Catalog + CloudFormation:
- Self-service infrastructure provisioning
- Governance via approved templates
- End-user simplicity with pre-configured options
- Cost tracking per product

### 3. Integration with StackSets

StackSets enable:
- Deploy stack to multiple accounts/regions
- Centralized management
- Automatic updates across deployment targets
- Role-based permissions

### 4. Integration with Systems Manager

Systems Manager + CloudFormation:
- Document-based automation
- Parameter store for template values
- Automation runbooks for post-deployment
- Configuration management

---

## Common Pitfalls

### ❌ Pitfall 1: Hardcoded Values in Templates

**Problem:** Values not reusable; must edit template for each environment.

**Solution:**
- Use Parameters for all environment-specific values
- Use Pseudo Parameters for account/region
- Parameterize instance types, storage, retention

### ❌ Pitfall 2: Tight Coupling Between Stacks

**Problem:** Stacks depend on internal resource IDs; hard to update independently.

**Solution:**
- Use Outputs and cross-stack references
- Decouple stacks functionally (networking, database, app)
- Use nested stacks for logical grouping

### ❌ Pitfall 3: No Change Set Review

**Problem:** Update stack directly; unexpected changes cause outages.

**Solution:**
- Always use change sets for production
- Review changes before execution
- Enable termination protection for critical stacks

### ❌ Pitfall 4: Unversioned Templates

**Problem:** Lose history of infrastructure changes; rollback difficult.

**Solution:**
- Version control all templates in Git
- Use commit messages to document changes
- Tag releases in Git matching stack updates

### ❌ Pitfall 5: Resource Deletion Protection Missing

**Problem:** Accidental resource deletion causes data loss.

**Solution:**
- Set DeletionPolicy: Snapshot for databases
- Enable DeletionProtection on production resources
- Use stack policies to prevent changes

### ❌ Pitfall 6: No Outputs Defined

**Problem:** Stack created but outputs hidden; hard to use resources.

**Solution:**
- Define all important resource IDs in Outputs
- Export outputs for cross-stack references
- Document output purposes

---

## Best Practices Summary

| Category | Best Practice |
|---|---|
| **Design** | Modular nested stacks; separate concerns |
| **Parameters** | Parameterize all environment-specific values |
| **Updates** | Use change sets; review before execution |
| **Safety** | Stack policies; termination protection; DeletionPolicy |
| **Version Control** | Git version all templates and parameters |
| **Documentation** | Clear Metadata; parameter descriptions; Outputs |

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-aws-iam` | IAM roles for CloudFormation |
| `cncf-aws-ec2` | EC2 resources in templates |
| `cncf-aws-rds` | Database resources in templates |
| `cncf-aws-vpc` | VPC and networking in templates |
