# Systems Manager

> [!GOALS]
> - Explain what AWS Systems Manager is and why it is the standard way to operate fleets of instances.
> - Open shells with **Session Manager** without SSH keys or open ports, with IAM control and logging.
> - Run commands across many machines safely with **Run Command** and rate controls.
> - Keep instances patched with **Patch Manager**, and see what is installed with **Inventory**.
> - Store configuration in **Parameter Store** hierarchies.
> - Automate operational procedures with **Automation runbooks**, and know where Systems Manager fits next to containers and infrastructure as code.

## Why this matters

Operating servers used to mean SSH keys copied to laptops, a bastion host open to the internet, shell scripts run machine by machine, and patching done whenever someone remembered. Every one of those is a security and reliability risk: keys that leave with former employees, open ports scanned by attackers, commands that half-succeed across a fleet, unpatched systems with known vulnerabilities.

**AWS Systems Manager (SSM)** replaces that with a managed set of tools driven by an agent on each instance and controlled by IAM: shell access without open ports, commands across fleets with safety limits, scheduled patching, inventory, configuration storage and automated runbooks. Even teams that run mostly containers and serverless still have some instances — bastions, self-managed databases, ECS or EKS nodes, build agents ({{ch:ec2}}) — and use Systems Manager for them. Parameter Store is used by almost everyone for configuration ({{ch:secrets-manager}}).

## The simple idea

Think of a building manager's control room. Instead of walking to every flat with a bunch of keys, the manager can open a monitored intercom to any flat, send the same instruction to every flat at once ("turn off the water for maintenance"), schedule repairs, and see a list of what appliances each flat has. Every action is recorded, and only authorised staff can use the controls.

Systems Manager is that control room for your instances: the **SSM Agent** on each instance connects **out** to AWS and waits for instructions.

> [!ANALOGY]
> Systems Manager is like a building's control room: authorised staff can talk to any flat, send instructions to many at once and schedule maintenance, and every action is recorded.
>
> **Where the analogy breaks:** an intercom only carries words. A Session Manager shell or a Run Command document carries **full control** of the machine — often as root. The control room is only as safe as the permissions that decide who may use it, on which machines, with which commands.

## The proper definition and key words

**AWS Systems Manager** is a collection of capabilities for viewing, controlling and automating AWS and on-premises infrastructure. Instances become **managed nodes** when they run the **SSM Agent**, have an IAM role allowing it to talk to Systems Manager, and can reach its endpoints.

Key words:

- **SSM Agent** — software on the instance that receives and runs Systems Manager requests (pre-installed on Amazon Linux and many other AMIs).
- **Managed node** — an instance or server registered with Systems Manager.
- **Session Manager** — interactive shells and port forwarding without SSH or inbound ports.
- **Run Command** — running a **document** (a set of commands) on many targets.
- **SSM document** — a JSON or YAML definition of actions (`AWS-RunShellScript`, `AWS-RunPatchBaseline`, your own).
- **Rate controls** — **max concurrency** and **max errors** limits for commands and automations.
- **Patch Manager / patch baseline** — patching and the rules for which patches are approved.
- **Maintenance window** — a schedule for disruptive tasks.
- **Inventory** — collected software, configuration and metadata from nodes.
- **Parameter Store** — hierarchical storage for configuration and secrets.
- **Automation runbook** — a multi-step document that performs operational tasks through AWS APIs.

## Access without SSH

### Level 1 — Making instances manageable

An instance is managed when:

1. The **SSM Agent** is installed and running.
2. Its **instance profile** includes the `AmazonSSMManagedInstanceCore` managed policy (or the account uses Default Host Management Configuration).
3. It can reach Systems Manager endpoints over HTTPS — through a NAT gateway or **VPC endpoints** (`ssm`, `ssmmessages`, `ec2messages`) for private subnets ({{ch:vpc}}).

No inbound security group rules are needed at all.

### Level 2 — Session Manager

```bash
# fragment
aws ssm start-session --target i-0abc12345def67890                     # a shell, no SSH, no open port
aws ssm start-session --target i-0abc12345def67890 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["shop-db.xxxx.eu-west-2.rds.amazonaws.com"],"portNumber":["5432"],"localPortNumber":["15432"]}'
# then: psql -h localhost -p 15432 ...  (a tunnel to a private database through the instance)
```

- **Who may connect where** is IAM: allow `ssm:StartSession` only on instances with certain tags (`team = shop`), only for certain roles, perhaps only with MFA ({{ch:iam}}).
- **Session logging** to S3 or CloudWatch Logs records every command typed — useful for audit and incident review. Encrypt sessions with a KMS key.
- **Port forwarding** reaches private databases and internal web consoles without a bastion open to the internet.
- **Run as**: configure sessions to start as a specific operating-system user rather than a shared default.
- ECS has a similar feature, **ECS Exec**, built on the same technology ({{ch:ecs}}).

## Operating fleets

### Level 2 — Parameter Store hierarchies

Parameters are named like paths, so one call can load a service's whole configuration:

```ts
// 1. Parameter Store hierarchies: load one service's configuration for one environment by path
const parameters: Record<string, { value: string; type: "String" | "SecureString" }> = {
  "/shop/production/api/log-level": { value: "info", type: "String" },
  "/shop/production/api/feature/new-checkout": { value: "25", type: "String" },
  "/shop/production/api/stripe-key": { value: "sk_live_…", type: "SecureString" },
  "/shop/production/worker/concurrency": { value: "8", type: "String" },
  "/shop/staging/api/log-level": { value: "debug", type: "String" },
};
function getParametersByPath(path: string, withDecryption: boolean) {
  return Object.entries(parameters)
    .filter(([name]) => name.startsWith(path))
    .map(([name, p]) => ({ name: name.slice(path.length), value: p.type === "SecureString" && !withDecryption ? "(encrypted)" : p.value }));
}
console.log(getParametersByPath("/shop/production/api/", false));

// 2. Run Command across a fleet with rate controls: at most 3 targets at once, stop after 2 errors
const fleet = ["i-01", "i-02", "i-03", "i-04", "i-05", "i-06", "i-07", "i-08", "i-09", "i-10"];
const brokenDisk = new Set(["i-04", "i-06", "i-07"]);
function runCommand(targets: string[], maxConcurrency: number, maxErrors: number) {
  let errors = 0, index = 0, wave = 0;
  const results: string[] = [];
  while (index < targets.length) {
    if (errors >= maxErrors) { results.push(`stopped: ${errors} errors reached maxErrors; ${targets.length - index} targets not started`); break; }
    const batch = targets.slice(index, index + maxConcurrency);
    index += batch.length; wave++;
    const out = batch.map((t) => { const ok = !brokenDisk.has(t); if (!ok) errors++; return `${t}:${ok ? "Success" : "Failed"}`; });
    results.push(`wave ${wave}: ${out.join(" ")}`);
  }
  return results.join("\n");
}
console.log(runCommand(fleet, 3, 2));
```

**Output:**

```text
[
  { name: 'log-level', value: 'info' },
  { name: 'feature/new-checkout', value: '25' },
  { name: 'stripe-key', value: '(encrypted)' }
]
wave 1: i-01:Success i-02:Success i-03:Success
wave 2: i-04:Failed i-05:Success i-06:Failed
stopped: 2 errors reached maxErrors; 4 targets not started
```

The first part of the output comes from the path lookup; the second part, explained in the next section, from Run Command.

- `GetParametersByPath("/shop/production/api/", recursive)` returns every parameter below that path; the API strips the prefix and gets its configuration. Staging values live under `/shop/staging/`, so the same code works in every environment with a different path.
- **SecureString** values stay encrypted unless the caller asks for decryption **and** is allowed to use the KMS key — here, without decryption, the Stripe key stayed hidden.
- IAM policies can allow a service to read only `/shop/production/api/*`.
- Parameters have versions and labels, and changes can trigger EventBridge events (for example to refresh configuration).

### Level 3 — Run Command with rate controls

Run Command runs a document on many targets, chosen by instance IDs, **tags** or resource groups. The second part of the example shows **rate controls** at work: with **max concurrency 3**, commands ran in waves of three instances; with **max errors 2**, the second failure stopped the command, and four instances were never touched. If the command were a bad configuration change, it would have damaged two machines rather than ten.

```bash
# fragment
aws ssm send-command \
  --document-name AWS-RunShellScript \
  --targets Key=tag:role,Values=search-node \
  --parameters 'commands=["df -h /var/lib/search","systemctl is-active search"]' \
  --max-concurrency 20% --max-errors 1 \
  --output-s3-bucket-name cornershop-ssm-output \
  --comment "check disk on search nodes"
```

- Concurrency and errors can be numbers or percentages of targets.
- Output goes to S3 or CloudWatch Logs; the command's status per target is visible in the console and API.
- Prefer **documents in version control** over ad hoc shell commands for anything repeated.
- Changes to fleets should usually come from new images and infrastructure code; Run Command is best for investigation, emergency fixes and tasks that cannot be baked in ({{ch:terraform}}).

### Level 3 — Patching and inventory

- **Patch baselines** define which patches are approved (for example, security patches auto-approved seven days after release); **patch groups** or policies map instances to baselines.
- **Maintenance windows** schedule `AWS-RunPatchBaseline` with rate controls, so instances behind a load balancer are patched a few at a time with reboots ({{ch:elb}}).
- **Patch compliance** reports show which instances are missing patches — evidence for audits.
- For immutable fleets, the alternative is rebuilding images with patches and replacing instances (EC2 Image Builder plus instance refresh) — often preferable, but Patch Manager still serves long-lived machines.
- **Inventory** records installed software, versions, network configuration and more across the fleet — answering "which machines still run OpenSSL version X?" in minutes.

### Level 4 — Automation runbooks

**Automation** runbooks are multi-step procedures executed by Systems Manager with its own role, using AWS APIs: restart an instance safely, create an AMI and update a launch template, copy a snapshot to another region, collect diagnostic logs, rotate a key. AWS provides many (`AWS-RestartEC2Instance`, `AWS-CreateImage`), and you write your own in YAML.

- Runbooks can include **approval steps**, branching and rate controls across many resources.
- **Incident response**: alarms can start runbooks automatically through EventBridge — for example, collecting diagnostics when an instance fails health checks ({{ch:cloudwatch}}).
- **Change Manager** adds change requests and approvals around runbooks for regulated environments.

## From beginner to enterprise

**Level 1–2 — first steps.** Instance profiles with SSM permissions; Session Manager instead of SSH; port forwarding to private databases; configuration in Parameter Store paths.

**Level 3 — fleet operations.** Run Command with tag targets and rate controls; documents in version control; patch baselines and maintenance windows; inventory and compliance.

**Level 4 — automation.** Automation runbooks with approvals; event-driven runbooks for incidents; session logging and KMS encryption; least-privilege session policies by tag.

**Level 5 — senior practice.** Deciding between in-place management and immutable replacement; designing access models for on-call engineers; integrating runbooks into incident processes.

**Level 6 — enterprises.** Organisation-wide Systems Manager set-up (Quick Setup, delegated administrators), hybrid fleets including on-premises servers, compliance reporting across many accounts.

## Real-world use cases

### Closing the bastion

- **Before**: a bastion host with SSH open to the office IP range and keys shared among twelve engineers.
- **After**: Session Manager with port forwarding to the database; access by IAM role per team with MFA; sessions logged to S3. The bastion and its port were removed.

### Patching a fleet

- **Practice**: a maintenance window every Tuesday night patches 20% of instances at a time with `max-errors 1`; instances leave the load balancer, patch, reboot and return; compliance reports go to the security team weekly.

## Common mistakes

### Beginner: keeping SSH open "just in case"

**Fix:** Session Manager for all access; remove port 22 rules.

### Beginner: instances not managed

**Consequence:** no access in an emergency. **Fix:** SSM permissions in every instance profile; endpoints in private subnets.

### Intermediate: Run Command without rate controls

**Consequence:** a bad command breaks the whole fleet at once. **Fix:** max concurrency and max errors.

### Intermediate: unlimited session permissions

**Consequence:** anyone with console access can get a root shell on any machine. **Fix:** tag-based conditions, MFA and logging.

### Intermediate: secrets as plain String parameters

**Fix:** SecureString or Secrets Manager.

### Production: manual fixes that never reach the image

**Consequence:** replaced instances lose the fix. **Fix:** put fixes into images and code; Run Command for emergencies only.

## Debugging and troubleshooting

- **Instance not appearing as managed**: agent not running, missing IAM permissions, no route to SSM endpoints, or wrong region.
- **Session fails to start**: the user lacks `ssm:StartSession` on that instance (tag conditions), or the session document's KMS key is not usable.
- **Command stuck "In progress" or "Undeliverable"**: the agent lost connectivity; check endpoints and the agent log (`/var/log/amazon/ssm/amazon-ssm-agent.log`).
- **Patching failures**: read the command output per instance; repository access through NAT or proxies is a frequent cause.
- **Parameter access denied**: IAM path permissions and KMS key permissions for SecureStrings.

## Security summary

- **No inbound management ports**; Session Manager with IAM and MFA.
- **Least privilege** by tag and document; restrict who can run which documents where.
- **Log** sessions and command output; encrypt with KMS.
- **Rate controls** on every fleet-wide change.
- **Patch** regularly or rebuild images; track compliance.
- **SecureString** or Secrets Manager for sensitive values.

## How a senior engineer thinks about this

- **Access is identity, not keys.** IAM-controlled, logged sessions replace shared SSH keys.
- **Every fleet change has a blast-radius limit.** Concurrency and error limits are not optional.
- **Fix it in the image.** In-place changes are for emergencies; durable fixes go into code.
- **Runbooks capture knowledge.** Repeated procedures become documents that anyone on call can run.

## Exercises

### Exercise 1 — Replace the bastion

**Objective:** practise secure access.
**What to do:** engineers currently SSH to a bastion and then connect to a private PostgreSQL database. Describe a Systems Manager set-up that removes the bastion's open port.

<details>
<summary>Show the solution</summary>

- A small instance (or an existing one) in a private subnet with the SSM Agent and an instance profile including `AmazonSSMManagedInstanceCore`; VPC endpoints `ssm`, `ssmmessages` and `ec2messages`.
- Engineers use `aws ssm start-session` with the `AWS-StartPortForwardingSessionToRemoteHost` document to forward a local port to the database endpoint.
- IAM allows `ssm:StartSession` only for the on-call or database role, only for instances tagged `access = db-tunnel`, with MFA.
- Session logging to S3; database access still requires the database's own credentials (ideally IAM authentication).
- Remove the bastion's SSH rule and public IP.

</details>

### Exercise 2 — Configure rate controls

**Objective:** practise safe fleet changes.
**What to do:** you must change a configuration file on 200 web servers behind a load balancer. What `max-concurrency` and `max-errors` would you use, and why?

<details>
<summary>Show the solution</summary>

Start small: `max-concurrency 5%` (10 servers at a time) and `max-errors 1` or 2. The load balancer keeps serving from the other 95%, and a broken change stops after one or two failures. Better still, first run it on a few canary servers by tag, check them, then run on the rest. And put the change into the image or configuration management so new servers get it too.

</details>

### Exercise 3 — Production scenario: the vulnerable library

**Objective:** practise fleet investigation.
**The scenario:** a critical vulnerability is announced in a library version installed on some Linux instances. Security asks within the hour: which instances are affected, and when will they be patched?

<details>
<summary>Show the solution</summary>

1. **Inventory**: query collected software inventory for the package and version across accounts (or run a quick Run Command check with rate controls where inventory is missing).
2. **Report** the affected instances by environment and owner (tags).
3. **Patch**: update the patch baseline to approve the fix; run `AWS-RunPatchBaseline` through a maintenance window or immediately with rate controls, starting with non-production, then production in waves behind load balancers.
4. **Images**: rebuild golden AMIs and container images so new instances are not vulnerable; instance refresh for auto scaling groups.
5. **Verify** with patch compliance reports and share the status.

</details>

## Summary

**Systems Manager** operates instances through the **SSM Agent**, an instance role and HTTPS endpoints — no inbound ports. **Session Manager** provides shells and port forwarding controlled by IAM (by tag, role and MFA) and logged to S3 or CloudWatch, replacing SSH keys and bastions. **Parameter Store** holds hierarchical configuration by path, with **SecureString** values decrypted only for callers allowed to use their KMS key.

**Run Command** executes **documents** on targets chosen by tags, with **rate controls** — max concurrency and max errors — that limit the blast radius of a bad change; output goes to S3 or logs. **Patch Manager** applies **patch baselines** in **maintenance windows** with compliance reporting, and **Inventory** answers what is installed where. **Automation runbooks** capture multi-step operational procedures, with approvals and event-driven triggers. Durable changes still belong in images and infrastructure code; Systems Manager covers access, investigation, patching, emergencies and automation around them.

## Key terms

- **AWS Systems Manager** — A set of AWS tools for viewing, controlling and automating infrastructure.
- **SSM Agent** — The software on a node that runs Systems Manager requests.
- **Managed node** — An instance or server registered with Systems Manager.
- **Session Manager** — Browser or CLI shell access without SSH or inbound ports.
- **Port forwarding session** — A tunnel from a local port to a remote host through a managed node.
- **Run Command** — Running an SSM document on many targets.
- **SSM document** — A definition of actions Systems Manager performs.
- **Max concurrency** — The most targets a command or automation runs on at once.
- **Max errors** — The number of failures after which a command or automation stops.
- **Patch Manager** — The capability that scans and installs operating-system patches.
- **Patch baseline** — Rules defining which patches are approved.
- **Maintenance window** — A scheduled time for disruptive tasks.
- **Inventory** — Collected information about software and configuration on nodes.
- **Parameter Store** — Hierarchical storage for configuration and secrets.
- **Automation runbook** — A multi-step operational procedure run by Systems Manager.

## What comes next

Operating systems well requires seeing them. The next chapter, {{ch:cloudwatch}}, covers CloudWatch: metrics and alarms, logs and Logs Insights queries, dashboards, custom metrics, composite alarms and how CloudWatch fits with the monitoring principles from earlier chapters.
