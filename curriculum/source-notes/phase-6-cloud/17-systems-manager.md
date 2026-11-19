# Phase 6 — Chapter 17: AWS Systems Manager (SSM)

---

## Chapter Overview

### Why It Exists

Before Systems Manager, managing a fleet of EC2 instances meant one of two painful choices. Either you opened port 22 on every instance and distributed SSH key pairs to every engineer who needed access — creating a permanent attack surface and a key-management nightmare — or you stood up a **bastion host**: a single hardened EC2 instance in a public subnet that everyone SSH'd through to reach private instances. The bastion itself then became a single point of failure that needed its own patching, monitoring, and key rotation.

Neither approach solved a second problem: once you were on the box, how did you run the same command across 200 servers at once? SSH-looping through a list of IPs in a bash script does not scale, does not retry failed hosts, and leaves no audit trail of who ran what, where, and when.

AWS Systems Manager was built to remove both problems at once. A lightweight **SSM Agent** runs on each instance and opens an *outbound* HTTPS connection to the SSM service — no inbound ports required at all. Every action taken through SSM (a shell session, a command execution, a patch installation) is authorized through IAM and logged centrally, giving you both zero open ports and a complete audit trail.

### Problems It Solves

**1. Eliminates the bastion host entirely**
No dedicated jump-server EC2 instance to patch, monitor, and secure. Access is brokered entirely through the SSM control plane over HTTPS (443), which is almost never blocked by corporate firewalls — unlike port 22.

**2. Removes SSH key distribution and rotation**
Access is granted and revoked through IAM policies, not by handing out and later trying to claw back `.pem` files. When an engineer leaves the team, removing their IAM permissions instantly removes their access to every instance — no key rotation across a fleet required.

**3. Enables fleet-wide operations**
Run Command lets you execute the same script against instances selected by tag (`Environment=production`), by resource group, or by explicit instance ID list — with configurable concurrency and automatic error-rate cutoffs so a bad command doesn't take down your whole fleet at once.

**4. Centralizes patching**
Patch Manager scans instances against a patch baseline (e.g., "all Critical and Important security patches") and applies them on a schedule, instead of engineers SSH-ing into boxes to run `yum update` by hand.

**5. Gives full audit visibility**
Every Session Manager session and every Run Command invocation can be streamed to CloudWatch Logs or an S3 bucket, satisfying compliance requirements (SOC 2, PCI-DSS) that require proof of who accessed which server and what they did there.

### Real-World Examples

| Company/Scenario | SSM Usage |
|---|---|
| **Compliance-heavy fintechs** | Use Session Manager exclusively (SSH disabled entirely) so every production access is logged to an immutable S3 audit bucket |
| **Large fleets (500+ instances)** | Use Run Command + Maintenance Windows to roll out OS patches in waves without manual SSH |
| **Hybrid/on-prem shops** | Use SSM hybrid activations to manage on-premises servers with the same tooling as EC2 |
| **Startups replacing bastions** | Delete their bastion host, attach `AmazonSSMManagedInstanceCore` to instances, cut their monthly bastion EC2 cost and their attack surface in one change |

### Companies Using It
AWS SSM is used broadly across AWS customers of all sizes — Netflix, Capital One, and Intuit have all published case studies or talks describing migrating from bastion-host SSH access to Session Manager for compliance and security reasons.

### Alternatives

| Tool | Approach | Trade-off vs SSM |
|------|----------|-------------------|
| **Bastion host + SSH** | Traditional jump server | Open port 22, key management, extra EC2 cost, manual audit |
| **Teleport / Boundary** | Third-party access-broker | More features (session recording, RBAC UI) but another system to run and pay for |
| **Ansible (agentless, over SSH)** | Push-based config management | Still needs SSH/port 22 access to targets; SSM Run Command needs none |
| **AWS-native VPN / Client VPN** | Network-level access | Gives full network access, not scoped per-action like IAM-controlled SSM |

### When NOT to Use It
- If you already run Ansible/Chef/Puppet with an established agent and inventory, replacing it purely for SSM's sake is not worth the migration cost — SSM complements these tools better than it replaces them (you can trigger Ansible playbooks via Run Command).
- Non-AWS infrastructure with heavy multi-cloud requirements may prefer a cloud-agnostic tool like Teleport so the access-control layer isn't AWS-specific.

---

## Beginner Theory

### Core Concepts

Systems Manager is not one feature — it is a *suite* of six distinct capabilities that share the same underlying agent and IAM-based authorization model:

| Feature | What it does |
|---|---|
| **Session Manager** | Interactive shell access to an instance, with no SSH keys and no open inbound ports |
| **Run Command** | Execute a command or script against one or many instances on demand |
| **Patch Manager** | Scan and install OS/security patches on a schedule, against a defined baseline |
| **Inventory** | Continuously collect metadata (installed packages, running services, OS version) from every managed instance |
| **Parameter Store** | Centralized, encrypted configuration and secrets storage (covered in Chapter 16) |
| **Automation (runbooks)** | Multi-step, scripted workflows (e.g., "stop instance → take snapshot → resize volume → start instance") that can be triggered manually or by an event |

### Terminology

| Term | Definition |
|---|---|
| **SSM Agent** | Lightweight software running on the instance that polls the SSM service for work and reports status back |
| **Managed instance** | Any EC2 instance (or on-prem server) with the SSM Agent installed and the correct IAM role attached |
| **Document (SSM Document)** | A JSON/YAML definition of what a command, automation, or session should do — AWS ships pre-built documents like `AWS-RunShellScript` |
| **Maintenance Window** | A scheduled time slot during which SSM is allowed to run tasks (e.g., patch installs) against a target group |
| **Patch Baseline** | The rule set defining which patches are "approved" and how many days after release they should be auto-applied |
| **Hybrid Activation** | A mechanism to register on-premises or non-EC2 servers as SSM managed instances |
| **Resource Group** | A saved, named collection of AWS resources (often by tag) that Run Command / Automation can target |

### Mental Model: SSM Is a Phone Line, Not a Door

Think of the SSM Agent as a phone that only makes *outbound* calls. The agent on your EC2 instance calls out to the SSM service every few seconds asking "any work for me?" — it never listens for incoming connections. This is why no inbound security group rule is needed: nothing is knocking on the instance's door from the outside. When you run `aws ssm start-session`, you are not connecting to the instance directly — you're placing a request with the SSM service, which relays it to the agent's next outbound poll.

### Architecture Diagram

```
┌────────────────────┐        outbound HTTPS (443)        ┌─────────────────────┐
│   EC2 Instance      │ ─────────────────────────────────▶ │   SSM Service        │
│  ┌──────────────┐   │                                     │  (AWS-managed)       │
│  │  SSM Agent    │◀──┼──────── relay commands/session ────┤                       │
│  └──────────────┘   │                                     └──────────┬──────────┘
│  IAM Role:           │                                                │
│  AmazonSSMManaged-    │                                     IAM authorizes caller
│  InstanceCore         │                                                │
└────────────────────┘                                     ┌──────────▼──────────┐
                                                             │  Engineer's CLI /    │
                                                             │  AWS Console          │
                                                             └──────────────────────┘
No inbound port 22. No bastion. All access IAM-authorized and logged.
```

---

## Basic Examples

### Example 1: SSM Agent Setup and Verification

Before any SSM feature works, the instance needs the agent running and an IAM role that grants it permission to talk to the SSM service.

```hcl
# Terraform: attach the managed policy that lets the agent register and receive commands
resource "aws_iam_role" "ec2_ssm_role" {
  name = "ec2-ssm-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2_ssm_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-ssm-profile"
  role = aws_iam_role.ec2_ssm_role.name
}
```

```bash
# Verify the agent registered successfully (run from your local machine, not the instance)
aws ssm describe-instance-information \
  --filters "Key=InstanceIds,Values=i-1234567890abcdef0"

# Expected output includes "PingStatus": "Online" — if it shows nothing,
# the instance either lacks the IAM role, lacks outbound internet/VPC-endpoint
# access to the SSM service, or the agent isn't running.

# Amazon Linux 2/2023 and Ubuntu 20.04+ ship with the agent pre-installed.
# On older AMIs, install it manually:
sudo yum install -y amazon-ssm-agent   # Amazon Linux / RHEL
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
```

### Example 2: Session Manager — Interactive Shell Access

This replaces `ssh ec2-user@<ip>` entirely. No key pair, no open port 22.

```bash
# Start an interactive shell session — behaves like SSH once connected
aws ssm start-session --target i-1234567890abcdef0

# End the session
exit

# View currently active sessions (useful for auditing "who is on this box right now")
aws ssm describe-sessions --state Active

# Forcibly terminate someone else's session (e.g., during an incident)
aws ssm terminate-session --session-id "user-name-0123456789abcdef0"
```

**Why this matters in practice:** because access is IAM-controlled, you can grant a contractor `ssm:StartSession` scoped to exactly one tagged instance, for exactly one week, without ever generating an SSH key for them.

### Example 3: Port Forwarding — Reaching a Private Database

A very common use case: your RDS instance sits in a private subnet with no public access, but you need to run a one-off query from your laptop.

```bash
# Forward a port on the target instance to your local machine
aws ssm start-session \
  --target i-1234567890abcdef0 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{
    "host":["myapp-db.xxxxx.us-east-1.rds.amazonaws.com"],
    "portNumber":["5432"],
    "localPortNumber":["5432"]
  }'

# In a second terminal, connect as if the database were local:
psql -h localhost -p 5432 -U myapp mydb
```

Note the distinction from Example 2's document: `AWS-StartPortForwardingSession` forwards a port *on the instance itself*, while `AWS-StartPortForwardingSessionToRemoteHost` uses the instance as a relay to reach a *different* host (like RDS) that the instance can see but your laptop cannot.

### Example 4: Run Command — Executing Across a Fleet

Run Command targets many instances at once by tag, and reports success/failure per instance.

```bash
# Restart an application service on every instance tagged Environment=production
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets '[{"Key":"tag:Environment","Values":["production"]}]' \
  --parameters '{"commands":["systemctl restart myapp"]}' \
  --output-s3-bucket-name my-ssm-output-bucket \
  --comment "Rolling restart after config deploy" \
  --max-concurrency "25%" \
  --max-errors "10%"

# max-concurrency/max-errors are the safety valve: only 25% of the fleet
# is touched at a time, and if more than 10% of attempts fail, SSM stops
# rather than continuing to break the rest of the fleet.

# Check the result for one specific instance
aws ssm get-command-invocation \
  --command-id "1a2b3c4d-5678-90ab-cdef-example11111" \
  --instance-id "i-1234567890abcdef0"
```

**Targeting by Resource Group instead of a raw tag filter**

Tag filters work fine for a one-off command, but if you find yourself typing the same `tag:Environment=production` filter across dozens of Run Command calls, a Resource Group lets you name that set once and reuse it everywhere.

```bash
# Create a resource group — a saved, named query over your AWS resources
aws resource-groups create-group \
  --name "production-app-servers" \
  --resource-query '{
    "Type": "TAG_FILTERS_1_0",
    "Query": "{\"ResourceTypeFilters\":[\"AWS::EC2::Instance\"],\"TagFilters\":[{\"Key\":\"Environment\",\"Values\":[\"production\"]}]}"
  }'

# Now target the group by name instead of repeating the tag filter
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets '[{"Key":"resource-groups:Name","Values":["production-app-servers"]}]' \
  --parameters '{"commands":["systemctl status myapp"]}'

# The advantage over a raw tag filter: if the group definition changes
# (e.g., you widen it to include a new Auto Scaling Group), every script
# and runbook referencing "production-app-servers" picks up the change
# automatically — you're not hunting down every hardcoded tag filter
# across your automation.
```

### Example 5: Patch Manager — Automated OS Patching

Patch Manager works in two parts: a **baseline** (the rules for which patches are "approved") and a **maintenance window** (when those patches actually get installed).

```bash
# 1. Create a patch baseline: auto-approve Critical/Important patches 3 days after release
aws ssm create-patch-baseline \
  --name "prod-baseline" \
  --operating-system AMAZON_LINUX_2023 \
  --approval-rules '{
    "PatchRules": [{
      "PatchFilterGroup": {
        "PatchFilters": [{"Key": "SEVERITY", "Values": ["Critical","Important"]}]
      },
      "ApproveAfterDays": 3
    }]
  }'

# 2. Register a maintenance window: patches only apply Sunday 2–4 AM UTC
aws ssm create-maintenance-window \
  --name "sunday-patch-window" \
  --schedule "cron(0 2 ? * SUN *)" \
  --duration 2 \
  --cutoff 1 \
  --allow-unassociated-targets

# 3. On-demand scan (without waiting for the window) to see what's missing right now
aws ssm send-command \
  --document-name "AWS-RunPatchBaseline" \
  --targets '[{"Key":"tag:Environment","Values":["production"]}]' \
  --parameters '{"Operation":["Scan"]}'
```

The 3-day delay in step 1 is a deliberate safety margin: it gives you time to notice if a vendor patch is broken before it's auto-applied to production.

### Example 6: Inventory — Fleet-Wide Metadata Collection

Inventory continuously answers questions like "which of my 200 servers still have the old version of OpenSSL installed?" without SSH-ing into any of them.

```bash
# Enable inventory collection on a set of instances via State Manager association
aws ssm create-association \
  --name "AWS-GatherSoftwareInventory" \
  --targets '[{"Key":"tag:Environment","Values":["production"]}]' \
  --schedule-expression "rate(12 hours)"

# Query collected inventory: which instances have package "openssl" installed, and which version?
aws ssm get-inventory \
  --filters "Key=AWS:Application.Name,Values=openssl" \
  --result-attributes '[{"TypeName":"AWS:Application"}]'
```

### Example 7: Automation — Multi-Step Runbooks

An Automation document scripts a *sequence* of actions — useful for repeatable operational tasks like resizing an EBS volume with zero manual steps.

```yaml
# automation-resize-volume.yaml
schemaVersion: '0.3'
description: "Stop instance, resize root volume, restart instance"
parameters:
  InstanceId:
    type: String
  NewVolumeSize:
    type: Integer
mainSteps:
  - name: stopInstance
    action: aws:changeInstanceState
    inputs:
      InstanceIds: ["{{ InstanceId }}"]
      DesiredState: stopped

  - name: modifyVolume
    action: aws:executeAwsApi
    inputs:
      Service: ec2
      Api: ModifyVolume
      VolumeId: "{{ getVolumeId }}"
      Size: "{{ NewVolumeSize }}"

  - name: startInstance
    action: aws:changeInstanceState
    inputs:
      InstanceIds: ["{{ InstanceId }}"]
      DesiredState: running
```

```bash
# Register and run the runbook
aws ssm create-document \
  --name "ResizeVolumeRunbook" \
  --document-type "Automation" \
  --content file://automation-resize-volume.yaml

aws ssm start-automation-execution \
  --document-name "ResizeVolumeRunbook" \
  --parameters "InstanceId=i-1234567890abcdef0,NewVolumeSize=100"
```

---

## Intermediate Concepts

### Best Practices

**1. Disable SSH entirely once SSM is validated.** Remove the inbound port-22 security group rule and delete distributed key pairs — leaving both open "just in case" defeats the security benefit.

**2. Scope IAM narrowly per team.** Don't grant blanket `ssm:StartSession` on `*` — scope it to instances with a specific tag (e.g., `Team=payments`) using IAM condition keys on `ssm:resourceTag/Team`.

**3. Always stream session logs.** Configure Session Manager preferences to send session output to both CloudWatch Logs and S3 — CloudWatch for real-time alerting, S3 for long-term compliance retention.

**4. Use `max-concurrency` and `max-errors` on every Run Command.** Without them, a bad script runs on all 500 instances simultaneously before you can react.

**5. Separate patch baselines per environment.** Production should have a longer `ApproveAfterDays` delay than staging, so staging surfaces bad vendor patches before they reach production.

### Common Mistakes

- **Forgetting the VPC endpoint requirement for private subnets.** If an instance has no NAT gateway and no internet access, it also can't reach the public SSM API endpoints — you need VPC endpoints for `ssm`, `ssmmessages`, and `ec2messages` for Session Manager to work in a fully private subnet.
- **Assuming Run Command output appears instantly.** Command status is eventually consistent; polling `get-command-invocation` immediately after `send-command` may show `InProgress` even for fast commands.
- **Not testing patch baselines in a non-prod maintenance window first.** A "Critical" OS patch can occasionally break an application dependency — patching staging first catches this before production.

---

## Advanced Concepts

### Hybrid Activations (Managing On-Premises Servers)

SSM isn't limited to EC2. A hybrid activation lets an on-premises or other-cloud server register as a managed instance using an activation code/ID instead of an EC2 instance role.

```bash
aws ssm create-activation \
  --default-instance-name "onprem-web-01" \
  --iam-role "SSMServiceRole" \
  --registration-limit 5
# Returns an ActivationId + ActivationCode used to install and register
# the SSM Agent on the on-prem box, which then appears in the console
# exactly like an EC2 managed instance.
```

### Just-in-Time Access Pattern

A common advanced pattern: instead of standing IAM access to `ssm:StartSession`, engineers request temporary access (e.g., via a Slack bot or self-service portal) that attaches a scoped, time-limited IAM policy, then automatically revokes it after N hours. This gives full audit trail plus least-privilege by default — access exists only during the incident, not permanently.

### Cross-Account, Cross-Region Operations

Systems Manager supports designating an administrator account that can run Automation documents and Run Command against instances in other accounts within an AWS Organization — useful for centralized platform teams managing patching across dozens of application accounts without needing IAM roles assumed manually in each one.

---

## Interview Preparation

**Q1: What is SSM Session Manager and why is it better than a bastion host?**

A: A bastion host is a dedicated EC2 instance in a public subnet that engineers SSH into as a jump point to reach private instances. It requires port 22 open to the internet (or at least to a VPN range), SSH keys distributed and rotated, and the bastion itself patched and monitored as its own attack surface. Session Manager removes all of this: the SSM Agent on the target instance makes an *outbound* HTTPS connection to the SSM service, so no inbound port is ever opened. Access is authorized entirely through IAM policies rather than key possession, and every session can be streamed to CloudWatch Logs or S3 for a complete audit trail — something a bastion only provides if you build custom logging around it.

**Q2: What is SSM Run Command and when would you use it?**

A: Run Command executes a script or command against one, several, or all instances matching a tag/resource-group filter, without needing SSH. Use it for fleet-wide operations: rolling restarts, ad-hoc diagnostics ("check disk usage on every production instance"), or pushing a configuration change. Unlike EC2 user data (which only runs once at launch), Run Command executes on-demand against already-running instances. `max-concurrency` and `max-errors` parameters prevent a broken script from cascading across the entire fleet at once.

**Q3: How does SSM achieve zero-inbound-port access — what's actually happening on the network?**

A: The SSM Agent on the instance polls the SSM service over outbound HTTPS (port 443) on a regular interval, asking whether there's work queued for it. When you run `aws ssm start-session`, the CLI doesn't connect directly to the instance — it registers a session request with the SSM service, which the agent picks up on its next poll and then establishes a secure, relayed channel back through the same outbound connection. Because the connection is always initiated by the instance, no inbound security group rule is ever required.

**Q4: What's the difference between a Patch Baseline and a Maintenance Window?**

A: A patch baseline defines *which* patches are approved and under what conditions (e.g., "Critical and Important severity, auto-approved 3 days after release"). A maintenance window defines *when* SSM is allowed to act on a target group (e.g., "Sundays 2–4 AM UTC"). You need both: the baseline without a window has nothing to trigger it; a window without a baseline has no patch policy to apply.

**Q5: How would you migrate a team off bastion-host SSH to Session Manager with zero downtime?**

A: 1) Attach the `AmazonSSMManagedInstanceCore` policy to every instance's IAM role and confirm the SSM Agent registers (`describe-instance-information` shows `Online`). 2) If instances sit in fully private subnets, add VPC interface endpoints for `ssm`, `ssmmessages`, and `ec2messages`. 3) Validate Session Manager access for the whole team in parallel with SSH still enabled. 4) Enable session logging to CloudWatch/S3 and confirm it's capturing sessions. 5) Once the team has used Session Manager successfully for a sprint, remove the port-22 inbound security group rule and decommission the bastion EC2 instance.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Verify SSM Agent is running: `aws ssm describe-instance-information`.
2. Attach `AmazonSSMManagedInstanceCore` to an EC2 instance's IAM role.
3. Start an SSM Session Manager session (no SSH key needed).
4. Use port forwarding to connect to a private RDS instance locally.
5. Run a command on one instance with `aws ssm send-command`.
6. Check the command output from CloudWatch Logs.
7. View Session Manager session history in the console.
8. Install the CloudWatch Agent via Run Command.
9. Enable and check SSM inventory for one instance.
10. Configure Session Manager to log sessions to CloudWatch.

### Intermediate (10 Tasks)
1. Set up Run Command to restart an app across all tagged instances with `max-concurrency`/`max-errors` set.
2. Implement a rolling restart with an SSM Automation document.
3. Set up a Patch Manager baseline that auto-approves critical patches after 3 days.
4. Schedule a maintenance window for patch operations.
5. Use an SSM Parameter Store path (`/myapp/prod/`) to load all config for an app.
6. Set up SSH-over-SSM in `~/.ssh/config` for transparent `ssh i-xxxx` access.
7. Build an Automation document for a zero-downtime deploy.
8. Use a resource group to target instances belonging to a specific environment.
9. Enable SSM inventory and query which instances have a specific package installed.
10. Set up a CloudTrail alert that fires whenever a Session Manager session starts in production.

### Advanced (10 Tasks)
1. Replace all bastion hosts in an account with Session Manager + VPC interface endpoints.
2. Implement a just-in-time access workflow: a Slack command grants scoped, time-limited `ssm:StartSession` IAM access that auto-expires.
3. Build an SSM Automation runbook for an incident-response playbook (e.g., isolate a compromised instance).
4. Set up SSM Distributor to push a custom internal package to a fleet.
5. Implement compliance checking with SSM State Manager associations.
6. Integrate SSM Inventory data with AWS Config for custom compliance rules.
7. Build a self-service internal tool for developers to trigger Run Command restarts without AWS console access.
8. Register an on-premises server as an SSM managed instance via hybrid activation.
9. Implement centralized patch compliance reporting across a multi-account AWS Organization.
10. Build automated remediation: an EventBridge rule that triggers an SSM Automation runbook when a CloudWatch alarm fires.

---

## Cheat Sheet

```bash
# ── Session Manager ──────────────────────────────────────────
aws ssm start-session --target i-INSTANCEID
aws ssm start-session --target i-INSTANCEID \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["PORT"],"localPortNumber":["LOCALPORT"]}'
aws ssm describe-sessions --state Active
aws ssm terminate-session --session-id SESSION_ID

# ── Run Command ──────────────────────────────────────────────
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets '[{"Key":"tag:Env","Values":["prod"]}]' \
  --parameters '{"commands":["your-command-here"]}' \
  --max-concurrency "25%" --max-errors "10%"
aws ssm list-commands
aws ssm get-command-invocation --command-id CMD_ID --instance-id i-INSTANCEID

# ── Patch Manager ────────────────────────────────────────────
aws ssm describe-patch-baselines
aws ssm create-patch-baseline --name myapp-baseline \
  --operating-system AMAZON_LINUX_2023 \
  --approval-rules '{"PatchRules":[{"PatchFilterGroup":{"PatchFilters":[{"Key":"SEVERITY","Values":["Critical","Important"]}]},"ApproveAfterDays":3}]}'

# ── Inventory ─────────────────────────────────────────────────
aws ssm create-association --name "AWS-GatherSoftwareInventory" \
  --targets '[{"Key":"tag:Environment","Values":["production"]}]' \
  --schedule-expression "rate(12 hours)"
aws ssm get-inventory --filters "Key=AWS:Application.Name,Values=openssl"

# ── Automation ────────────────────────────────────────────────
aws ssm start-automation-execution --document-name "MyRunbook" \
  --parameters "InstanceId=i-xxxx"
```

```
SSM vs Bastion:
  SSM:     No port 22 open, IAM-controlled, full audit, no key management
  Bastion: Port 22 open, key-pair managed, manual audit, extra EC2 to maintain

SSM Agent is pre-installed on:
  Amazon Linux 2 / Amazon Linux 2023
  Ubuntu 16.04+
  Windows Server 2019+
  RHEL 7+, CentOS 7+

Private-subnet requirement: VPC interface endpoints for
  com.amazonaws.<region>.ssm
  com.amazonaws.<region>.ssmmessages
  com.amazonaws.<region>.ec2messages
```
