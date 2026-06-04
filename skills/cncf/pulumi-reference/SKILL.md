---
name: pulumi-reference
compatibility: opencode
completeness: 95
content-types:
- guidance
- examples
- do-dont
- config
description: Implements Pulumi infrastructure as code using Python, TypeScript, and
  Go for cloud provisioning with state management, stacks, backends, and cross-cloud
  provisioning
license: MIT
maturity: stable
metadata:
  domain: cncf
  output-format: code
  related-skills: cncf-aws-cloudformation, cncf-helm, cncf-terraform
  role: implementation
  scope: infrastructure
  triggers: pulumi, iac, infrastructure as code, pulumi python, pulumi typescript,
    how do i deploy infrastructure, crossplane, cloudformation
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
version: "1.0.0"
---
# Pulumi Infrastructure as Code

Implements Pulumi infrastructure as code using Python, TypeScript, and Go programming languages for cloud provisioning with state management, stacks, backends, and multi-cloud infrastructure support.

## TL;DR Checklist

- [ ] Use Pulumi's native language SDKs (Python, TypeScript, Go) instead of YAML/JSON
- [ ] Configure state backend (S3, Azure Blob, GCS, or Pulumi Cloud) for team collaboration
- [ ] Implement stack-specific configurations for dev/staging/production environments
- [ ] Use Pulumi's resource dependencies for automatic ordering
- [ ] Leverage Pulumi's preview functionality with `pulumi preview` before applying
- [ ] Implement proper tagging strategy across all cloud resources
- [ ] Use Pulumi's secrets management for sensitive values
- [ ] Implement programmatic resource creation with loops and conditionals

---

## When to Use

Use Pulumi when you need:

- Infrastructure as code using familiar programming languages (Python, TypeScript, Go)
- Complex infrastructure logic with loops, conditionals, and functions
- Multi-cloud provisioning across AWS, Azure, GCP, and other providers
- State management with remote backends for team collaboration
- Cross-cloud resource dependencies and references
- CI/CD pipeline integration with infrastructure as code
- Programmatic resource creation with dynamic configurations
- Infrastructure versioning and rollback capabilities

---

## When NOT to Use

Avoid Pulumi for:

- Simple static infrastructure that rarely changes (use YAML manifests instead)
- Teams without programming experience (Terraform HCL may be easier to learn)
- Environments requiring pure declarative configuration without logic
- Organizations with strict YAML-only infrastructure policies
- Situations where infrastructure changes need manual YAML editing
- Projects with minimal cloud resources and simple provisioning needs

---

## Core Workflow

Pulumi follows a consistent workflow for infrastructure management:

1. **Write Configuration** — Define infrastructure using Python, TypeScript, or Go. **Checkpoint:** Code compiles and imports Pulumi SDK correctly.
2. **Initialize Project** — Create Pulumi project with `pulumi new <template>`. **Checkpoint:** `Pulumi.yaml` and stack configuration files created.
3. **Select Stack** — Choose or create stack with `pulumi stack init`. **Checkpoint:** Stack initialized with environment-specific configuration.
4. **Preview Changes** — Review changes with `pulumi preview`. **Checkpoint:** Preview shows expected resource changes, no unintended deletions.
5. **Apply Changes** — Execute changes with `pulumi up`. **Checkpoint:** Apply completes successfully, infrastructure matches configuration.
6. **Inspect State** — Verify current state with `pulumi stack`. **Checkpoint:** State file reflects all provisioned resources.

---

## Implementation Patterns

### Pattern 1: Python SDK - EC2 Instance with Security Group

Provision AWS EC2 instance with proper security configuration using Python.

```python
# ✅ GOOD — Python SDK with proper typing and error handling
import pulumi
import pulumi_aws as aws
from typing import Optional

def create_web_server(
    environment: str,
    instance_type: str = "t3.micro",
    vpc_id: Optional[str] = None,
    subnet_id: Optional[str] = None
) -> None:
    """Create a web server EC2 instance with security group."""
    
    # Create security group with proper ingress/egress rules
    web_sg = aws.ec2.SecurityGroup(
        f"web-sg-{environment}",
        name=f"web-sg-{environment}",
        description=f"Security group for web server in {environment}",
        vpc_id=vpc_id,
        ingress=[
            aws.ec2.SecurityGroupIngressArgs(
                description="HTTP from anywhere",
                from_port=80,
                to_port=80,
                protocol="tcp",
                cidr_blocks=["0.0.0.0/0"],
            ),
            aws.ec2.SecurityGroupIngressArgs(
                description="HTTPS from anywhere",
                from_port=443,
                to_port=443,
                protocol="tcp",
                cidr_blocks=["0.0.0.0/0"],
            ),
            aws.ec2.SecurityGroupIngressArgs(
                description="SSH from trusted network",
                from_port=22,
                to_port=22,
                protocol="tcp",
                cidr_blocks=["10.0.0.0/8"],
            ),
        ],
        egress=[
            aws.ec2.SecurityGroupEgressArgs(
                description="Allow all outbound traffic",
                from_port=0,
                to_port=0,
                protocol="-1",
                cidr_blocks=["0.0.0.0/0"],
            ),
        ],
        tags={
            "Name": f"web-sg-{environment}",
            "Environment": environment,
            "ManagedBy": "pulumi",
        },
    )
    
    # Get latest Amazon Linux 2 AMI
    ami = aws.ec2.get_ami(
        most_recent=True,
        owners=["amazon"],
        filters=[
            aws.GetAmiFilterArgs(
                name="name",
                values=["amzn2-ami-hvm-*-x86_64-gp2"],
            ),
            aws.GetAmiFilterArgs(
                name="virtualization-type",
                values=["hvm"],
            ),
        ],
    )
    
    # Create EC2 instance
    server = aws.ec2.Instance(
        f"web-server-{environment}",
        instance_type=instance_type,
        ami=ami.id,
        subnet_id=subnet_id,
        vpc_security_group_ids=[web_sg.id],
        tags={
            "Name": f"web-server-{environment}",
            "Environment": environment,
            "ManagedBy": "pulumi",
        },
    )
    
    # Export outputs
    pulumi.export("server_id", server.id)
    pulumi.export("server_public_ip", server.public_ip)
    pulumi.export("server_security_group", web_sg.name)

# Example usage for different environments
config = pulumi.Config()
environment = config.get("environment") or "development"
instance_type = config.get("instance_type") or "t3.micro"

create_web_server(
    environment=environment,
    instance_type=instance_type,
)
```

```python
# ❌ BAD — Hardcoded values, no environment separation
import pulumi
import pulumi_aws as aws

# ❌ BAD — Hardcoded values, no environment separation
security_group = aws.ec2.SecurityGroup(
    "web-sg",
    name="web-sg",
    # Missing description
    ingress=[
        aws.ec2.SecurityGroupIngressArgs(
            from_port=22,
            to_port=22,
            protocol="tcp",
            cidr_blocks=["0.0.0.0/0"],  # ❌ SSH open to world
        ),
    ],
    tags={
        "Name": "web-sg"  # ❌ Generic tag
    }
)

# ❌ BAD — No environment separation, hardcoded AMI
server = aws.ec2.Instance(
    "web-server",
    instance_type="t3.micro",
    ami="ami-0c55b159cbfafe1f0",  # ❌ Hardcoded AMI
    tags={
        "Name": "web-server"  # ❌ Generic tag
    }
)
```

### Pattern 2: TypeScript SDK - Kubernetes Cluster with EKS

Provision AWS EKS cluster with managed node groups using TypeScript.

```typescript
// ✅ GOOD — TypeScript SDK with proper types and error handling
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const config = new pulumi.Config();
const environment = config.get("environment") || "development";
const region = config.get("region") || "us-east-1";

// Create VPC for EKS cluster
const vpc = new awsx.ec2.Vpc(`${environment}-eks-vpc`, {
    cidrBlock: "10.0.0.0/16",
    subnetSpecs: [
        { type: awsx.ec2.SubnetType.Public, cidrMask: 24 },
        { type: awsx.ec2.SubnetType.Private, cidrMask: 24 },
    ],
    tags: {
        Environment: environment,
        ManagedBy: "pulumi",
    },
});

// Create EKS cluster
const cluster = new aws.eks.Cluster(`${environment}-eks-cluster`, {
    roleArn: aws.iam.Role.fromRoleName("eks-cluster-role").arn,
    vpcConfig: {
        subnetIds: vpc.subnetIds,
        endpointPrivateAccess: true,
        endpointPublicAccess: true,
        publicAccessCidrs: ["10.0.0.0/8"],
    },
    version: "1.28",
    tags: {
        Environment: environment,
        ManagedBy: "pulumi",
    },
});

// Create managed node group
const nodeGroup = new aws.eks.NodeGroup(`${environment}-eks-nodes`, {
    clusterName: cluster.name,
    nodeGroupName: `${environment}-eks-nodes`,
    nodeRoleArn: aws.iam.Role.fromRoleName("eks-node-role").arn,
    subnetIds: vpc.subnetIds,
    scalingConfig: {
        desiredSize: 2,
        maxSize: 4,
        minSize: 1,
    },
    instanceTypes: ["t3.medium"],
    tags: {
        Environment: environment,
        ManagedBy: "pulumi",
    },
});

// Export kubeconfig
export const kubeconfig = pulumi.all([cluster.name, cluster.endpoint, cluster.certificateAuthorityData]).apply(([name, endpoint, cert]) => {
    const certData = Buffer.from(cert, "base64").toString("utf-8");
    return `apiVersion: v1
clusters:
- cluster:
    server: ${endpoint}
    certificate-authority-data: ${certData}
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: aws
  name: aws
current-context: aws
kind: Config
preferences: {}
users:
- name: aws
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1beta1
      command: aws-iam-authenticator
      args:
        - token
        - -i
        - ${name}`;
});

pulumi.export("clusterName", cluster.name);
pulumi.export("clusterEndpoint", cluster.endpoint);
pulumi.export("kubeconfig", kubeconfig);
```

```typescript
// ❌ BAD — No environment separation, hardcoded values
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// ❌ BAD — Hardcoded values, no environment separation
const cluster = new aws.eks.Cluster("eks-cluster", {
    roleArn: "arn:aws:iam::123456789012:role/eks-cluster-role",  // ❌ Hardcoded ARN
    version: "1.28",  // ❌ No version parameterization
    // ❌ Missing VPC configuration
});

// ❌ BAD — No node group definition
// ❌ No kubeconfig export
```

### Pattern 3: Go SDK - Multi-Cloud Infrastructure

Provision infrastructure across AWS, Azure, and GCP using Go.

```go
// ✅ GOOD — Go SDK with proper error handling and multi-cloud support
package main

import (
    "fmt"

    "github.com/pulumi/pulumi-aws/sdk/v5/go/aws/ec2"
    "github.com/pulumi/pulumi-azure-native/sdk/go/azure/compute"
    "github.com/pulumi/pulumi-azure-native/sdk/go/azure/network"
    "github.com/pulumi/pulumi-gcp/sdk/v6/go/gcp/compute"
    "github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
    pulumi.Run(func(ctx *pulumi.Context) error {
        // AWS EC2 Instance
        awsAMI, err := ec2.LookupAmi(ctx, &ec2.LookupAmiArgs{
            MostRecent: true,
            Owners:     []string{"amazon"},
            Filters: []ec2.LookupAmiFilter{
                {
                    Name:   "name",
                    Values: []string{"amzn2-ami-hvm-*-x86_64-gp2"},
                },
                {
                    Name:   "virtualization-type",
                    Values: []string{"hvm"},
                },
            },
        }, nil)
        if err != nil {
            return fmt.Errorf("failed to lookup AWS AMI: %w", err)
        }

        awsSecurityGroup, err := ec2.NewSecurityGroup(ctx, "aws-web-sg", &ec2.SecurityGroupArgs{
            Description: pulumi.String("Security group for web server"),
            Ingress: ec2.SecurityGroupIngressArray{
                ec2.SecurityGroupIngressArgs{
                    Description: pulumi.String("HTTP from anywhere"),
                    FromPort:    pulumi.Int(80),
                    ToPort:      pulumi.Int(80),
                    Protocol:    pulumi.String("tcp"),
                    CidrBlocks:  pulumi.ToStringArray([]string{"0.0.0.0/0"}),
                },
            },
            Tags: pulumi.StringMap{
                "Name":        pulumi.String("aws-web-sg"),
                "Environment": pulumi.String("production"),
                "ManagedBy":   pulumi.String("pulumi"),
            },
        })
        if err != nil {
            return fmt.Errorf("failed to create AWS security group: %w", err)
        }

        awsInstance, err := ec2.NewInstance(ctx, "aws-web-server", &ec2.InstanceArgs{
            InstanceType: pulumi.String("t3.micro"),
            Ami:          pulumi.String(awsAMI.Id),
            VpcSecurityGroupIds: pulumi.StringArray{awsSecurityGroup.ID()},
            Tags: pulumi.StringMap{
                "Name":        pulumi.String("aws-web-server"),
                "Environment": pulumi.String("production"),
                "ManagedBy":   pulumi.String("pulumi"),
            },
        })
        if err != nil {
            return fmt.Errorf("failed to create AWS instance: %w", err)
        }

        // Azure VM
        azureResourceGroup, err := compute.NewResourceGroup(ctx, "azure-web-rg", &compute.ResourceGroupArgs{
            ResourceGroupName: pulumi.String("azure-web-rg"),
            Location:          pulumi.String("East US"),
        })
        if err != nil {
            return fmt.Errorf("failed to create Azure resource group: %w", err)
        }

        azureVNet, err := network.NewVirtualNetwork(ctx, "azure-vnet", &network.VirtualNetworkArgs{
            ResourceGroupName: azureResourceGroup.Name,
            Location:          azureResourceGroup.Location,
            AddressSpace: &network.AddressSpaceArgs{
                AddressPrefixes: pulumi.ToStringArray([]string{"10.0.0.0/16"}),
            },
        })
        if err != nil {
            return fmt.Errorf("failed to create Azure VNet: %w", err)
        }

        azureSubnet, err := network.NewSubnet(ctx, "azure-subnet", &network.SubnetArgs{
            ResourceGroupName: azureResourceGroup.Name,
            VirtualNetworkName: azureVNet.Name,
            AddressPrefix:      pulumi.String("10.0.1.0/24"),
        })
        if err != nil {
            return fmt.Errorf("failed to create Azure subnet: %w", err)
        }

        azurePublicIP, err := network.NewPublicIPAddress(ctx, "azure-public-ip", &network.PublicIPAddressArgs{
            ResourceGroupName: azureResourceGroup.Name,
            Location:          azureResourceGroup.Location,
            PublicIPAllocationMethod: pulumi.String("Dynamic"),
        })
        if err != nil {
            return fmt.Errorf("failed to create Azure public IP: %w", err)
        }

        azureNetworkInterface, err := network.NewNetworkInterface(ctx, "azure-nic", &network.NetworkInterfaceArgs{
            ResourceGroupName: azureResourceGroup.Name,
            Location:          azureResourceGroup.Location,
            IpConfigurations: network.NetworkInterfaceIPConfigurationArray{
                network.NetworkInterfaceIPConfigurationArgs{
                    Name:                     pulumi.String("ipconfig"),
                    SubnetId:                 azureSubnet.ID(),
                    PrivateIPAddressAllocation: pulumi.String("Dynamic"),
                    PublicIPAddressId:         azurePublicIP.ID(),
                },
            },
        })
        if err != nil {
            return fmt.Errorf("failed to create Azure network interface: %w", err)
        }

        _, err = compute.NewVirtualMachine(ctx, "azure-web-vm", &compute.VirtualMachineArgs{
            ResourceGroupName: azureResourceGroup.Name,
            Location:          azureResourceGroup.Location,
            VMSize:            pulumi.String("Standard_B2s"),
            NetworkInterfaceIDs: pulumi.StringArray{azureNetworkInterface.ID()},
            OsProfile: &compute.OSProfileArgs{
                ComputerName:  pulumi.String("azure-web-vm"),
                AdminUsername: pulumi.String("azureuser"),
                AdminPassword: pulumi.String("P@ssw0rd1234!"),
            },
            StorageImageReference: &compute.StorageImageReferenceArgs{
                Publisher: pulumi.String("Canonical"),
                Offer:     pulumi.String("UbuntuServer"),
                Sku:       pulumi.String("18.04-LTS"),
                Version:   pulumi.String("latest"),
            },
            StorageOSDisk: &compute.StorageOSDiskArgs{
                Name:          pulumi.String("osdisk"),
                Caching:       pulumi.String("ReadWrite"),
                CreateOption:  pulumi.String("FromImage"),
                ManagedDiskType: pulumi.String("Standard_LRS"),
            },
        })
        if err != nil {
            return fmt.Errorf("failed to create Azure VM: %w", err)
        }

        // GCP Compute Instance
        gcpNetwork, err := compute.NewNetwork(ctx, "gcp-network", &compute.NetworkArgs{
            Name:                    pulumi.String("gcp-network"),
            AutoCreateSubnetworks:   pulumi.Bool(false),
        })
        if err != nil {
            return fmt.Errorf("failed to create GCP network: %w", err)
        }

        gcpSubnet, err := compute.NewSubnetwork(ctx, "gcp-subnet", &compute.SubnetworkArgs{
            Name:          pulumi.String("gcp-subnet"),
            IpCidrRange:   pulumi.String("10.1.0.0/24"),
            Network:       gcpNetwork.SelfLink(),
        })
        if err != nil {
            return fmt.Errorf("failed to create GCP subnet: %w", err)
        }

        gcpFirewall, err := compute.NewFirewall(ctx, "gcp-firewall", &compute.FirewallArgs{
            Name:    pulumi.String("gcp-web-firewall"),
            Network: gcpNetwork.SelfLink(),
            Allowed: compute.FirewallAllowedArray{
                compute.FirewallAllowedArgs{
                    Protocol: pulumi.String("tcp"),
                    Ports:    pulumi.ToStringArray([]string{"80", "443"}),
                },
            },
        })
        if err != nil {
            return fmt.Errorf("failed to create GCP firewall: %w", err)
        }

        gcpInstance, err := compute.NewInstance(ctx, "gcp-web-server", &compute.InstanceArgs{
            Name:        pulumi.String("gcp-web-server"),
            MachineType: pulumi.String("e2-micro"),
            Zone:        pulumi.String("us-central1-a"),
            NetworkInterfaces: compute.InstanceNetworkInterfaceArray{
                compute.InstanceNetworkInterfaceArgs{
                    Network:    gcpNetwork.SelfLink(),
                    Subnetwork: gcpSubnet.SelfLink(),
                    AccessConfigs: compute.InstanceNetworkInterfaceAccessConfigArray{
                        compute.InstanceNetworkInterfaceAccessConfigArgs{},
                    },
                },
            },
            Disks: compute.InstanceDiskArray{
                compute.InstanceDiskArgs{
                    AutoDelete: pulumi.Bool(true),
                    Boot:       pulumi.Bool(true),
                    InitializeParams: compute.InstanceDiskInitializeParamsArgs{
                        SourceImage: pulumi.String("projects/debian-cloud/global/images/debian-11-bullseye-v20231011"),
                        DiskType:    pulumi.String("zones/us-central1-a/diskTypes/pd-standard"),
                        DiskSizeGb:  pulumi.Int(10),
                    },
                },
            },
            Tags: pulumi.ToStringArray([]string{"web-server"}),
        })
        if err != nil {
            return fmt.Errorf("failed to create GCP instance: %w", err)
        }

        // Export outputs
        ctx.Export("aws_instance_id", awsInstance.ID())
        ctx.Export("aws_instance_public_ip", awsInstance.PublicIp)
        ctx.Export("azure_vm_id", azureInstance.ID())
        ctx.Export("gcp_instance_id", gcpInstance.ID())

        return nil
    })
}
```

```go
// ❌ BAD — No error handling, hardcoded values
package main

import (
    "github.com/pulumi/pulumi-aws/sdk/v5/go/aws/ec2"
    "github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
    pulumi.Run(func(ctx *pulumi.Context) error {
        // ❌ BAD — No error handling
        sg := ec2.NewSecurityGroup(ctx, "web-sg", &ec2.SecurityGroupArgs{
            Tags: pulumi.StringMap{
                "Name": pulumi.String("web-sg"),
            },
        })
        
        // ❌ BAD — Hardcoded AMI, no environment separation
        instance := ec2.NewInstance(ctx, "web-server", &ec2.InstanceArgs{
            InstanceType: pulumi.String("t3.micro"),
            Ami:          pulumi.String("ami-0c55b159cbfafe1f0"),  // ❌ Hardcoded AMI
        })
        
        return nil
    })
}
```

### Pattern 4: State Management and Backends

Configure remote backends for team collaboration with state locking.

```python
# ✅ GOOD — S3 backend with state locking
import pulumi

# Pulumi.yaml should reference the backend
# For S3 backend, configure in ~/.pulumi/config or environment variables

# Configure backend via environment variable
# export PULUMI_BACKEND_URL=s3://my-pulumi-state-bucket

# Or configure specific backend in code
config = pulumi.Config()

# Store state in S3 with encryption and locking
backend_config = {
    "bucket": "company-pulumi-state-prod",
    "key": "aws/production/terraform.tfstate",
    "region": "us-east-1",
    "encrypt": True,
    "dynamodb_table": "pulumi-state-locks-prod",
}

# Use Pulumi Cloud for team collaboration
# pulumi login --cloud-url https://app.pulumi.com
pulumi.log.info("Pulumi state backend configured for team collaboration")

# Export backend configuration
pulumi.export("backend_type", "s3")
pulumi.export("bucket_name", backend_config["bucket"])
```

```bash
# ✅ GOOD — S3 backend configuration
# Configure S3 backend with state locking

# 1. Create S3 bucket for state
aws s3api create-bucket \
    --bucket company-pulumi-state-prod \
    --region us-east-1 \
    --create-bucket-configuration LocationConstraint=us-east-1

# 2. Enable versioning on state bucket
aws s3api put-bucket-versioning \
    --bucket company-pulumi-state-prod \
    --versioning-configuration Status=Enabled

# 3. Create DynamoDB table for state locking
aws dynamodb create-table \
    --table-name pulumi-state-locks-prod \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region us-east-1

# 4. Configure Pulumi to use S3 backend
pulumi login s3://company-pulumi-state-prod?region=us-east-1

# 5. Set encryption key
pulumi config set aws:region us-east-1
pulumi config set --secret aws:s3BucketEncryption {"SSEAlgorithm":"AES256"}

# 6. Initialize stack with backend
pulumi stack init production
```

```bash
# ❌ BAD — Local state with no backend
# ❌ BAD — State stored locally, no locking, no sharing
pulumi login --local

# ❌ State files stored in ./Pulumi.*
# ❌ No protection against concurrent modifications
# ❌ No state sharing between team members
```

### Pattern 5: Azure Infrastructure with TypeScript

Provision Azure resources using TypeScript including resource groups, virtual networks, and virtual machines.

```typescript
// ✅ GOOD — Azure infrastructure with TypeScript
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";
import * as azure from "@pulumi/azure";

const config = new pulumi.Config();
const environment = config.get("environment") || "development";
const location = config.get("location") || "eastus";

// Create resource group
const resourceGroup = new azure_native.resources.ResourceGroup(`${environment}-rg`, {
    resourceGroupName: `${environment}-rg`,
    location: location,
    tags: {
        Environment: environment,
        ManagedBy: "pulumi",
        Project: "infrastructure",
    },
});

// Create virtual network
const vnet = new azure_native.network.VirtualNetwork(`${environment}-vnet`, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    addressSpace: {
        addressPrefixes: ["10.0.0.0/16"],
    },
    tags: {
        Environment: environment,
        ManagedBy: "pulumi",
    },
});

// Create subnet
const subnet = new azure_native.network.Subnet(`${environment}-subnet`, {
    resourceGroupName: resourceGroup.name,
    virtualNetworkName: vnet.name,
    subnetName: `${environment}-subnet`,
    addressPrefix: "10.0.1.0/24",
});

// Create public IP
const publicIP = new azure_native.network.PublicIPAddress(`${environment}-public-ip`, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    publicIPAllocationMethod: "Dynamic",
    tags: {
        Environment: environment,
        ManagedBy: "pulumi",
    },
});

// Create network interface
const nic = new azure_native.network.NetworkInterface(`${environment}-nic`, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    ipConfigurations: [{
        name: "ipconfig",
        subnet: {
            id: subnet.id,
        },
        privateIPAllocationMethod: "Dynamic",
        publicIPAddress: {
            id: publicIP.id,
        },
    }],
    tags: {
        Environment: environment,
        ManagedBy: "pulumi",
    },
});

// Create virtual machine
const vm = new azure_native.compute.VirtualMachine(`${environment}-vm`, {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
    vmSize: "Standard_B2s",
    networkProfile: {
        networkInterfaces: [{
            id: nic.id,
        }],
    },
    osProfile: {
        computerName: `${environment}-vm`,
        adminUsername: "azureuser",
        adminPassword: config.requireSecret("adminPassword"),
    },
    storageProfile: {
        imageReference: {
            publisher: "Canonical",
            offer: "UbuntuServer",
            sku: "18.04-LTS",
            version: "latest",
        },
        osDisk: {
            caching: "ReadWrite",
            createOption: "FromImage",
            managedDisk: {
                storageAccountType: "Standard_LRS",
            },
        },
    },
    tags: {
        Environment: environment,
        ManagedBy: "pulumi",
    },
});

// Export outputs
export const vmId = vm.id;
export const publicIpAddress = publicIP.ipAddress;
```

```typescript
// ❌ BAD — Hardcoded values, no environment separation
import * as pulumi from "@pulumi/pulumi";
import * as azure_native from "@pulumi/azure-native";

// ❌ BAD — Hardcoded values, no environment separation
const resourceGroup = new azure_native.resources.ResourceGroup("my-rg", {
    resourceGroupName: "my-rg",
    // ❌ Missing location
});

// ❌ BAD — No tags
const vnet = new azure_native.network.VirtualNetwork("my-vnet", {
    resourceGroupName: resourceGroup.name,
    addressSpace: {
        addressPrefixes: ["10.0.0.0/16"],
    },
    // ❌ Missing tags
});

// ❌ BAD — Hardcoded admin password
const vm = new azure_native.compute.VirtualMachine("my-vm", {
    resourceGroupName: resourceGroup.name,
    osProfile: {
        adminPassword: "P@ssw0rd1234!",  // ❌ Hardcoded password
    },
    // ❌ Missing other required fields
});
```

### Pattern 6: GCP Infrastructure with Python

Provision Google Cloud Platform resources using Python including VPC, firewall rules, and compute instances.

```python
# ✅ GOOD — GCP infrastructure with Python
import pulumi
import pulumi_gcp as gcp
from typing import Optional

def create_gcp_infrastructure(
    project_id: str,
    region: str = "us-central1",
    environment: str = "development"
) -> None:
    """Create GCP infrastructure with VPC, firewall, and compute instance."""
    
    # Create VPC network
    vpc = gcp.compute.Network(
        f"{environment}-vpc",
        name=f"{environment}-vpc",
        description=f"VPC for {environment} environment",
        auto_create_subnetworks=False,
        project=project_id,
        tags={
            "Environment": environment,
            "ManagedBy": "pulumi",
        },
    )
    
    # Create subnet
    subnet = gcp.compute.Subnetwork(
        f"{environment}-subnet",
        name=f"{environment}-subnet",
        ip_cidr_range="10.0.0.0/24",
        region=region,
        network=vpc.self_link,
        project=project_id,
        tags={
            "Environment": environment,
            "ManagedBy": "pulumi",
        },
    )
    
    # Create firewall rule for HTTP/HTTPS
    firewall = gcp.compute.Firewall(
        f"{environment}-web-firewall",
        name=f"{environment}-web-firewall",
        network=vpc.self_link,
        allowed=[
            gcp.compute.FirewallAllowedArgs(
                protocol="tcp",
                ports=["80", "443"],
            ),
            gcp.compute.FirewallAllowedArgs(
                protocol="tcp",
                ports=["22"],
            ),
        ],
        source_ranges=["0.0.0.0/0"],
        project=project_id,
        tags={
            "Environment": environment,
            "ManagedBy": "pulumi",
        },
    )
    
    # Get latest Debian image
    debian_image = gcp.compute.get_image(
        project="debian-cloud",
        family="debian-11",
    )
    
    # Create compute instance
    instance = gcp.compute.Instance(
        f"{environment}-instance",
        name=f"{environment}-instance",
        machine_type="e2-micro",
        zone=f"{region}-a",
        network_interfaces=[
            gcp.compute.InstanceNetworkInterfaceArgs(
                network=vpc.self_link,
                subnetwork=subnet.self_link,
                access_configs=[
                    gcp.compute.InstanceNetworkInterfaceAccessConfigArgs(),
                ],
            ),
        ],
        disks=[
            gcp.compute.InstanceDiskArgs(
                auto_delete=True,
                boot=True,
                initialize_params=gcp.compute.InstanceDiskInitializeParamsArgs(
                    source_image=debian_image.self_link,
                    disk_type=f"zones/{region}-a/diskTypes/pd-standard",
                    disk_size_gb=10,
                ),
            ),
        ],
        tags=[f"{environment}-server"],
        metadata={
            "user-data": "#!/bin/bash\napt-get update\napt-get install -y nginx",
        },
        project=project_id,
        tags={
            "Environment": environment,
            "ManagedBy": "pulumi",
        },
    )
    
    # Export outputs
    pulumi.export("instance_name", instance.name)
    pulumi.export("instance_zone", instance.zone)
    pulumi.export("instance_public_ip", instance.network_interfaces[0].access_configs[0].nat_ip)

# Example usage
project_id = "my-gcp-project"
create_gcp_infrastructure(
    project_id=project_id,
    environment="production",
)
```

```python
# ❌ BAD — Hardcoded values, no environment separation
import pulumi
import pulumi_gcp as gcp

# ❌ BAD — Hardcoded values, no environment separation
vpc = gcp.compute.Network("my-vpc", name="my-vpc")
# ❌ Missing project_id, no tags

subnet = gcp.compute.Subnetwork("my-subnet", name="my-subnet", ip_cidr_range="10.0.0.0/24")
# ❌ Missing region, network reference

instance = gcp.compute.Instance("my-instance", name="my-instance", machine_type="e2-micro")
# ❌ Missing zone, disks, network interfaces
```

### Pattern 7: Kubernetes Deployment with TypeScript

Deploy Kubernetes applications using Pulumi's Kubernetes provider.

```typescript
// ✅ GOOD — Kubernetes deployment with TypeScript
import * as pulumi from "@pulumi/pulumi";
import * as kubernetes from "@pulumi/kubernetes";

const config = new pulumi.Config();
const environment = config.get("environment") || "development";

// Create a Kubernetes provider instance
const k8sProvider = new kubernetes.Provider("k8s-provider", {
    kubeconfig: config.require("kubeconfig"),
});

// Create namespace
const namespace = new kubernetes.core.v1.Namespace(`${environment}-app`, {
    metadata: {
        name: `${environment}-app`,
        labels: {
            environment: environment,
            managedBy: "pulumi",
        },
    },
}, { provider: k8sProvider });

// Create deployment
const appLabels = { app: `${environment}-web` };
const deployment = new kubernetes.apps.v1.Deployment(`${environment}-deployment`, {
    metadata: {
        namespace: namespace.metadata.name,
        labels: appLabels,
    },
    spec: {
        replicas: config.getNumber("replicas") || 3,
        selector: {
            matchLabels: appLabels,
        },
        template: {
            metadata: {
                labels: appLabels,
            },
            spec: {
                containers: [{
                    name: "nginx",
                    image: "nginx:1.24",
                    ports: [{
                        containerPort: 80,
                    }],
                    resources: {
                        requests: {
                            cpu: "100m",
                            memory: "128Mi",
                        },
                        limits: {
                            cpu: "200m",
                            memory: "256Mi",
                        },
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider });

// Create service
const service = new kubernetes.core.v1.Service(`${environment}-service`, {
    metadata: {
        namespace: namespace.metadata.name,
        labels: appLabels,
    },
    spec: {
        selector: appLabels,
        ports: [{
            port: 80,
            targetPort: 80,
        }],
        type: "ClusterIP",
    },
}, { provider: k8sProvider });

// Export outputs
export const namespaceName = namespace.metadata.name;
export const deploymentName = deployment.metadata.name;
export const serviceName = service.metadata.name;
```

```typescript
// ❌ BAD — Hardcoded values, no environment separation
import * as kubernetes from "@pulumi/kubernetes";

const k8sProvider = new kubernetes.Provider("k8s", {
    kubeconfig: "hardcoded-kubeconfig",  // ❌ Hardcoded kubeconfig
});

// ❌ BAD — No namespace, hardcoded values
const deployment = new kubernetes.apps.v1.Deployment("my-deployment", {
    spec: {
        replicas: 3,
        template: {
            spec: {
                containers: [{
                    image: "nginx:1.24",
                    // ❌ No resource limits
                }],
            },
        },
    },
});

// ❌ BAD — No service defined
```

### Pattern 8: AWS RDS Database with Python

Provision AWS RDS database instances using Python.

```python
# ✅ GOOD — AWS RDS database with Python
import pulumi
import pulumi_aws as aws
from typing import Optional

def create_rds_database(
    environment: str,
    instance_class: str = "db.t3.micro",
    allocated_storage: int = 20,
    multi_az: bool = False,
    vpc_security_group_ids: Optional[list] = None,
) -> None:
    """Create an AWS RDS database instance."""
    
    # Generate random password using Pulumi's random provider
    db_password = aws.random.RandomPassword(
        f"{environment}-db-password",
        length=16,
        special=True,
        override_special="!@#$%&*",
    )
    
    # Create RDS subnet group
    subnet_group = aws.rds.SubnetGroup(
        f"{environment}-db-subnet-group",
        subnet_ids=["subnet-12345678", "subnet-87654321"],
        tags={
            "Name": f"{environment}-db-subnet-group",
            "Environment": environment,
            "ManagedBy": "pulumi",
        },
    )
    
    # Create security group for RDS
    rds_sg = aws.ec2.SecurityGroup(
        f"{environment}-rds-sg",
        name=f"{environment}-rds-sg",
        description=f"Security group for RDS in {environment}",
        ingress=[
            aws.ec2.SecurityGroupIngressArgs(
                description="MySQL from application servers",
                from_port=3306,
                to_port=3306,
                protocol="tcp",
                security_groups=vpc_security_group_ids or [],
            ),
        ],
        tags={
            "Name": f"{environment}-rds-sg",
            "Environment": environment,
            "ManagedBy": "pulumi",
        },
    )
    
    # Create RDS instance
    db = aws.rds.Instance(
        f"{environment}-database",
        engine="mysql",
        engine_version="8.0",
        instance_class=instance_class,
        allocated_storage=allocated_storage,
        storage_type="gp3",
        db_name="appdb",
        username="admin",
        password=db_password.result,
        parameter_group_name="default.mysql8.0",
        skip_final_snapshot=True,
        db_subnet_group_name=subnet_group.name,
        vpc_security_group_ids=[rds_sg.id],
        multi_az=multi_az,
        backup_retention_period=7 if environment == "production" else 0,
        publically_accessible=False,
        tags={
            "Name": f"{environment}-database",
            "Environment": environment,
            "ManagedBy": "pulumi",
        },
    )
    
    # Export outputs
    pulumi.export("db_endpoint", db.endpoint)
    pulumi.export("db_name", db.db_name)
    pulumi.export("db_username", db.username)

# Example usage
config = pulumi.Config()
environment = config.get("environment") or "development"
instance_class = config.get("instance_class") or "db.t3.micro"

create_rds_database(
    environment=environment,
    instance_class=instance_class,
    multi_az=environment == "production",
)
```

```python
# ❌ BAD — Hardcoded values, no environment separation
import pulumi
import pulumi_aws as aws

# ❌ BAD — Hardcoded values
db = aws.rds.Instance("my-db",
    engine="mysql",
    instance_class="db.t3.micro",
    db_name="appdb",
    username="admin",
    password="hardcoded-password123",  # ❌ Hardcoded password
    skip_final_snapshot=True,
    # ❌ Missing security group, subnet group
)
```

---

## Constraints

### MUST DO

- Always use Pulumi's native language SDKs (Python, TypeScript, Go) for infrastructure as code
- Configure remote backend (S3, Azure Blob, GCS, or Pulumi Cloud) for team collaboration
- Use stack-specific configurations for different environments (dev, staging, production)
- Implement proper tagging strategy with `Environment`, `ManagedBy`, and `Project` tags
- Use Pulumi's preview functionality with `pulumi preview` before applying changes
- Leverage Pulumi's secrets management for sensitive values (database passwords, API keys)
- Implement proper error handling in all infrastructure code
- Use type hints (Python), interfaces (TypeScript), or proper types (Go) for code clarity
- Implement resource dependencies explicitly where needed with `depends_on` or explicit references
- Use Pulumi's built-in resource imports for existing infrastructure

### MUST NOT DO

- Never store Pulumi state files in version control (they contain sensitive data)
- Never use hardcoded credentials or API keys in Pulumi code
- Never bypass Pulumi's preview process with `--yes` flag in production
- Never modify Pulumi state files manually
- Never share Pulumi access tokens or provider credentials
- Never use Pulumi for infrastructure that requires manual YAML editing
- Never disable Pulumi's preview for production deployments
- Never use Pulumi for static infrastructure that rarely changes

---

## Output Template

When implementing Pulumi infrastructure, the output must include:

1. **Project Structure**
   - `Pulumi.yaml`: Project configuration with name, runtime, and description
   - `Pulumi.<stack>.yaml`: Stack-specific configuration
   - `requirements.txt` (Python), `package.json` (TypeScript), `go.mod` (Go): Dependencies

2. **Infrastructure Code**
   - Main application file (`__main__.py`, `index.ts`, `main.go`)
   - Proper imports and SDK usage
   - Environment-specific configurations
   - Resource definitions with proper parameters

3. **Backend Configuration**
   - Remote backend setup (S3, Azure, GCS, or Pulumi Cloud)
   - State locking mechanism
   - Encryption settings

4. **Outputs**
   - Resource IDs and endpoints
   - Connection strings and URLs
   - Any values needed for integration

5. **Documentation**
   - README with usage instructions
   - Example configurations
   - Environment setup guide

---

## Related Skills

| Skill | Purpose |
|---|---|
| `cncf-terraform` | Alternative IaC tool using HCL declarative language |
| `cncf-aws-cloudformation` | AWS-native IaC tool using YAML/JSON templates |
| `cncf-helm` | Kubernetes package manager for deploying apps on K8s |

---

## References

### Official Documentation

- **Pulumi Documentation:** [https://www.pulumi.com/docs/](https://www.pulumi.com/docs/)
- **Pulumi Python SDK:** [https://www.pulumi.com/registry/packages/aws/](https://www.pulumi.com/registry/packages/aws/)
- **Pulumi TypeScript SDK:** [https://www.pulumi.com/registry/packages/aws/](https://www.pulumi.com/registry/packages/aws/)
- **Pulumi Go SDK:** [https://www.pulumi.com/registry/packages/aws/](https://www.pulumi.com/registry/packages/aws/)
- **Pulumi Cloud:** [https://app.pulumi.com](https://app.pulumi.com)

### Provider Documentation

- **AWS Provider:** [https://www.pulumi.com/registry/packages/aws/](https://www.pulumi.com/registry/packages/aws/)
- **Azure Provider:** [https://www.pulumi.com/registry/packages/azure-native/](https://www.pulumi.com/registry/packages/azure-native/)
- **GCP Provider:** [https://www.pulumi.com/registry/packages/gcp/](https://www.pulumi.com/registry/packages/gcp/)
- **Kubernetes Provider:** [https://www.pulumi.com/registry/packages/kubernetes/](https://www.pulumi.com/registry/packages/kubernetes/)

### Community Resources

- **Pulumi Examples:** [https://github.com/pulumi/examples](https://github.com/pulumi/examples)
- **Pulumi Registry:** [https://www.pulumi.com/registry/](https://www.pulumi.com/registry/)
- **Pulumi Blog:** [https://www.pulumi.com/blog/](https://www.pulumi.com/blog/)

### Quick Reference

```bash
# Initialize new project
pulumi new python    # Python
pulumi new typescript  # TypeScript
pulumi new go        # Go

# Stack operations
pulumi stack init development  # Create dev stack
pulumi stack init staging      # Create staging stack
pulumi stack init production   # Create prod stack
pulumi stack select <name>     # Select stack

# Infrastructure operations
pulumi preview                 # Preview changes
pulumi up                      # Apply changes
pulumi refresh                 # Sync state with cloud
pulumi destroy                 # Destroy infrastructure

# State management
pulumi stack output            # Show outputs
pulumi stack export            # Export state
pulumi stack import            # Import state

# Configuration
pulumi config set key value    # Set config
pulumi config set --secret key value  # Set secret
pulumi config                  # Show config

# Help
pulumi help                    # Show help
pulumi <command> --help        # Show command help
```

---

*Pulumi Infrastructure as Code Skill - Version 1.0.0*
