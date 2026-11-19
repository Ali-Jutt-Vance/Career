# Phase 6 — Chapter 18: CloudFormation

---

## Chapter Overview

CloudFormation is AWS's native Infrastructure as Code service. You define resources in YAML or JSON templates; CloudFormation provisions, updates, and deletes them in the correct dependency order. While Terraform is more popular for multi-cloud, CloudFormation is deeply integrated with AWS and required knowledge for AWS certifications.

**Topics:**
- Template structure (Parameters, Mappings, Conditions, Resources, Outputs)
- Stack lifecycle (create, update, delete)
- Change sets (preview changes before applying)
- Nested stacks and StackSets
- CloudFormation vs. Terraform
- Custom Resources (Lambda-backed)
- Drift detection

---

## Basic Examples

### CloudFormation Template

```yaml
# template.yml
AWSTemplateFormatVersion: "2010-09-09"
Description: "MyApp VPC + EC2 + RDS"

# ─── Parameters (user inputs) ─────────────────────────────
Parameters:
  Environment:
    Type:             String
    Default:          production
    AllowedValues:    [development, staging, production]
    Description:      Deployment environment

  InstanceType:
    Type:             String
    Default:          t3.medium
    AllowedValues:    [t3.micro, t3.small, t3.medium, t3.large]

  DBPassword:
    Type:             String
    NoEcho:           true    # don't show in console or logs
    MinLength:        8
    Description:      Database master password

# ─── Mappings (static lookup tables) ─────────────────────
Mappings:
  RegionToAMI:
    us-east-1:
      AMI: ami-0c02fb55956c7d316   # Amazon Linux 2023
    us-west-2:
      AMI: ami-0df435f331839b2d6
    eu-west-1:
      AMI: ami-0b1f643c06c58f8b6

# ─── Conditions ──────────────────────────────────────────
Conditions:
  IsProduction:  !Equals [!Ref Environment, production]
  IsNotProduction: !Not [Condition: IsProduction]

# ─── Resources (required section) ────────────────────────
Resources:
  # VPC
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock:          10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport:   true
      Tags:
        - Key:   Name
          Value: !Sub "myapp-vpc-${Environment}"

  # Public Subnet
  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId:               !Ref VPC
      CidrBlock:           10.0.1.0/24
      AvailabilityZone:    !Select [0, !GetAZs ""]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub "myapp-public-${Environment}"

  # Internet Gateway
  IGW:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags: [{ Key: Name, Value: myapp-igw }]

  IGWAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId:             !Ref VPC
      InternetGatewayId: !Ref IGW

  # Security Group
  AppSG:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: App Security Group
      VpcId:            !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort:   80
          ToPort:     80
          CidrIp:     0.0.0.0/0
        - IpProtocol: tcp
          FromPort:   443
          ToPort:     443
          CidrIp:     0.0.0.0/0

  # EC2 Instance
  AppServer:
    Type: AWS::EC2::Instance
    DependsOn: IGWAttachment   # explicit dependency
    Properties:
      ImageId:      !FindInMap [RegionToAMI, !Ref AWS::Region, AMI]
      InstanceType: !Ref InstanceType
      SubnetId:     !Ref PublicSubnet
      SecurityGroupIds: [!Ref AppSG]

      # Conditional properties
      Monitoring: !If [IsProduction, true, false]

      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          dnf update -y
          dnf install -y docker
          systemctl enable --now docker

      Tags:
        - Key:   Name
          Value: !Sub "myapp-${Environment}"
        - Key:   Environment
          Value: !Ref Environment

  # RDS — only in production
  Database:
    Type: AWS::RDS::DBInstance
    Condition: IsProduction
    DeletionPolicy: Snapshot   # take snapshot before deleting
    UpdateReplacePolicy: Snapshot
    Properties:
      DBName:               myapp
      Engine:               postgres
      EngineVersion:        "16.3"
      DBInstanceClass:      db.t3.medium
      AllocatedStorage:     "20"
      MasterUsername:       myapp_admin
      MasterUserPassword:   !Ref DBPassword
      VPCSecurityGroups:    [!Ref AppSG]
      MultiAZ:              true
      StorageEncrypted:     true
      BackupRetentionPeriod: 7
      DeletionProtection:   true

# ─── Outputs ──────────────────────────────────────────────
Outputs:
  VpcId:
    Description: VPC ID
    Value:        !Ref VPC
    Export:
      Name: !Sub "${AWS::StackName}-VpcId"   # for cross-stack reference

  AppServerPublicIP:
    Description: App Server Public IP
    Value:        !GetAtt AppServer.PublicIp

  AppServerURL:
    Description: Application URL
    Value:        !Sub "http://${AppServer.PublicDnsName}"

  DBEndpoint:
    Condition: IsProduction
    Description: Database Endpoint
    Value:        !GetAtt Database.Endpoint.Address
```

### CloudFormation CLI Operations

```bash
# Validate template
aws cloudformation validate-template --template-body file://template.yml

# Create stack
aws cloudformation create-stack \
  --stack-name myapp-production \
  --template-body file://template.yml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=InstanceType,ParameterValue=t3.medium \
    ParameterKey=DBPassword,ParameterValue="MySecurePass123!" \
  --capabilities CAPABILITY_IAM \
  --on-failure DO_NOTHING  # or ROLLBACK or DELETE

# Wait for stack to complete
aws cloudformation wait stack-create-complete --stack-name myapp-production

# Check stack status
aws cloudformation describe-stacks --stack-name myapp-production
aws cloudformation describe-stack-events --stack-name myapp-production

# Create change set (preview changes before applying)
aws cloudformation create-change-set \
  --stack-name myapp-production \
  --change-set-name my-update \
  --template-body file://template.yml \
  --parameters ParameterKey=InstanceType,ParameterValue=t3.large

aws cloudformation describe-change-set \
  --stack-name myapp-production \
  --change-set-name my-update

# Execute change set (apply the changes)
aws cloudformation execute-change-set \
  --stack-name myapp-production \
  --change-set-name my-update

# Update stack directly
aws cloudformation update-stack \
  --stack-name myapp-production \
  --template-body file://template.yml \
  --parameters ParameterKey=InstanceType,ParameterValue=t3.large

# Detect drift (changes made outside CloudFormation)
aws cloudformation detect-stack-drift --stack-name myapp-production
aws cloudformation describe-stack-resource-drifts --stack-name myapp-production

# Delete stack
aws cloudformation delete-stack --stack-name myapp-production
aws cloudformation wait stack-delete-complete --stack-name myapp-production
```

---

## Interview Preparation

**Q1: What is a CloudFormation Change Set?**
A: A change set lets you preview what changes CloudFormation will make before actually applying them. When you modify a template and submit it, CloudFormation computes the diff: which resources will be Added, Modified, or Removed. You review the change set and execute it only if satisfied. This prevents surprises — especially for modifications that require replacement (e.g., changing an RDS instance type may require replacement, causing downtime). In production environments, always use change sets rather than direct `update-stack`. The change set describes the action on each resource: Add, Modify, or Remove, and for Modify, whether it's an update or replacement.

**Q2: What is CloudFormation Drift Detection?**
A: Drift: when resource properties have been manually changed outside of CloudFormation (e.g., someone modified a security group rule in the console). CloudFormation's model is the source of truth — it doesn't know about manual changes. Drift detection: CloudFormation compares the actual resource state with the expected state from the template. Shows each resource as IN_SYNC or DRIFTED, with details on what changed. Why it matters: if you then run `update-stack`, CloudFormation will revert manual changes. Drift detection helps audit: "has anyone touched production infrastructure without going through IaC?" Remediation: update your template to match reality, or remediate the resource to match the template.

**Q3: What is the difference between CloudFormation and Terraform?**
A: CloudFormation: AWS-native, deeply integrated (some features only available via CloudFormation), no state file management (state is in AWS), free (you pay only for resources), JSON/YAML templates, automatic rollback on failure. Terraform: multi-cloud, state file (local or remote), HCL syntax (more readable), large ecosystem of modules and providers, parallel resource creation, workspace support, plan/apply workflow (like CF change sets but more flexible), requires backend for team use. For AWS-only companies: either works. CloudFormation for certification/compliance-heavy environments. Terraform preferred in multi-cloud or if team already knows HCL. At most companies, choose one and stick to it consistently.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Write a CloudFormation template for an S3 bucket with versioning.
2. Create the stack with `aws cloudformation create-stack`.
3. View stack events as it creates.
4. Add an output for the S3 bucket name.
5. Update the stack to add a lifecycle policy.
6. Create a change set and inspect the changes.
7. Execute the change set.
8. Detect drift on a stack.
9. Add a condition: create DLQ only in production.
10. Delete the stack.

### Intermediate (10 Tasks)
1. Write a complete VPC + SG + EC2 template.
2. Add Parameters for environment and instance type.
3. Use Mappings for AMI per region.
4. Use `DependsOn` for resource ordering.
5. Use `!Sub` for dynamic names.
6. Export VPC ID as a cross-stack export.
7. Create a nested stack referencing the VPC.
8. Create a StackSet to deploy to 3 accounts.
9. Add DeletionPolicy: Snapshot on RDS.
10. Use `!If` condition to add monitoring only in production.

### Advanced (10 Tasks)
1. Build a Lambda-backed Custom Resource.
2. Create a StackSet deploying IAM roles across an AWS Organization.
3. Implement drift detection monitoring with EventBridge.
4. Use CloudFormation Macros for template transformation.
5. Implement a CI/CD pipeline with CloudFormation change sets.
6. Build a Service Catalog product for self-service infrastructure.
7. Migrate existing resources into CloudFormation via import.
8. Use CloudFormation Guard for policy-as-code validation.
9. Build a multi-account, multi-region deployment with StackSets.
10. Implement termination protection on all production stacks.

---

## Cheat Sheet

```yaml
# Intrinsic functions
!Ref Resource           # reference resource logical ID (usually returns ID/ARN)
!GetAtt Resource.Prop   # get attribute: !GetAtt MyBucket.Arn
!Sub "prefix-${Param}"  # string substitution with variables
!If [Condition, IfTrue, IfFalse]
!Equals [!Ref Env, production]
!And [Condition1, Condition2]
!Not [Condition]
!FindInMap [MapName, TopKey, SecondKey]
!Select [0, !GetAZs ""]  # first AZ
!Join [",", [a, b, c]]   # "a,b,c"
!Split [",", !Ref CSV]
!Base64 !Sub "#!/bin/bash\n..."

# Stack operations
aws cloudformation create-stack --stack-name NAME --template-body file://tpl.yml --capabilities CAPABILITY_IAM
aws cloudformation update-stack --stack-name NAME --template-body file://tpl.yml
aws cloudformation create-change-set --stack-name NAME --change-set-name CS --template-body file://tpl.yml
aws cloudformation describe-change-set --stack-name NAME --change-set-name CS
aws cloudformation execute-change-set --stack-name NAME --change-set-name CS
aws cloudformation delete-stack --stack-name NAME

# Pseudo-parameters
!Ref AWS::Region        # us-east-1
!Ref AWS::AccountId     # 123456789012
!Ref AWS::StackName     # myapp-production
!Ref AWS::NoValue       # removes optional property
```
