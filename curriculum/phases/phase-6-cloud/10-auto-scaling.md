# Phase 6 — Chapter 10: Auto Scaling

---

## Chapter Overview

Auto Scaling automatically adjusts the number of EC2 instances (or ECS tasks, DynamoDB capacity, etc.) based on demand. It ensures you have enough capacity during peaks and reduces cost during quiet periods.

**Topics:**
- Auto Scaling Groups (ASG)
- Launch Templates
- Scaling policies (target tracking, step scaling, scheduled)
- Health checks and replacement
- Instance refresh (rolling deployments)
- EC2 Auto Scaling with mixed instance types and Spot
- Application Auto Scaling for ECS, DynamoDB, Lambda

---

## Basic Examples

### ASG with Terraform

```hcl
# Launch Template (replaces old Launch Configuration)
resource "aws_launch_template" "app" {
  name_prefix   = "myapp-"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.medium"
  key_name      = aws_key_pair.deploy.key_name

  network_interfaces {
    security_groups             = [aws_security_group.app.id]
    associate_public_ip_address = false  # private subnet
  }

  iam_instance_profile {
    arn = aws_iam_instance_profile.ec2_profile.arn
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = 30
      volume_type           = "gp3"
      encrypted             = true
      delete_on_termination = true
    }
  }

  metadata_options {
    http_tokens = "required"  # IMDSv2
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -euo pipefail
    # Install and start application
    dnf update -y
    dnf install -y docker
    systemctl enable --now docker
    
    # Get ECR image and run
    aws ecr get-login-password --region us-east-1 | \
      docker login --username AWS --password-stdin ${aws_ecr_repository.app.repository_url}
    docker run -d --name myapp --restart unless-stopped \
      -p 3000:3000 \
      -e DATABASE_URL="$(aws secretsmanager get-secret-value --secret-id myapp/db --query SecretString --output text | jq -r '.url')" \
      ${aws_ecr_repository.app.repository_url}:latest
  EOF
  )

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "myapp-lt" }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "app" {
  name                = "myapp-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"   # use ALB health checks (more accurate than EC2)
  health_check_grace_period = 120  # wait 2 min before health checking new instances

  min_size         = 2
  max_size         = 10
  desired_capacity = 2

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  # Instance refresh for rolling deployments
  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 90   # keep 90% healthy during refresh
      instance_warmup        = 120  # wait 2 min for instance to warm up
      checkpoint_percentages = [50, 100]
    }
  }

  # Enable capacity rebalancing for Spot interruptions
  capacity_rebalance = true

  tag {
    key                 = "Name"
    value               = "myapp-asg-instance"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [desired_capacity]  # let ASG manage desired
  }
}

# Target Tracking Scaling Policy: keep CPU at 50%
resource "aws_autoscaling_policy" "cpu" {
  name                   = "myapp-cpu-scaling"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value     = 50.0
    disable_scale_in = false  # allow scale-in (terminate instances when load drops)
  }
}

# Target Tracking: ALB request count per target
resource "aws_autoscaling_policy" "requests" {
  name                   = "myapp-alb-request-scaling"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${aws_lb_target_group.app.arn_suffix}"
    }
    target_value = 1000  # 1000 requests per target per minute
  }
}

# Scheduled scaling: scale up before business hours
resource "aws_autoscaling_schedule" "morning" {
  scheduled_action_name  = "morning-scale-up"
  autoscaling_group_name = aws_autoscaling_group.app.name
  recurrence             = "0 8 * * MON-FRI"  # 8 AM UTC weekdays
  min_size               = 4
  max_size               = 20
  desired_capacity       = 6
}

resource "aws_autoscaling_schedule" "night" {
  scheduled_action_name  = "night-scale-down"
  autoscaling_group_name = aws_autoscaling_group.app.name
  recurrence             = "0 20 * * MON-FRI"  # 8 PM UTC weekdays
  min_size               = 2
  max_size               = 10
  desired_capacity       = 2
}
```

### Mixed Instance Types with Spot

```hcl
# Mixed instances policy: use Spot instances to reduce cost
resource "aws_autoscaling_group" "mixed" {
  name                = "myapp-mixed-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.app.arn]
  health_check_type   = "ELB"
  min_size            = 2
  max_size            = 20

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 2    # always keep 2 On-Demand
      on_demand_percentage_above_base_capacity = 20   # 20% On-Demand, 80% Spot above baseline
      spot_allocation_strategy                 = "capacity-optimized"  # lowest interruption
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.app.id
        version            = "$Latest"
      }

      # Fallback instance types (in case primary is unavailable as Spot)
      override {
        instance_type     = "t3.medium"
        weighted_capacity = "1"
      }
      override {
        instance_type     = "t3a.medium"
        weighted_capacity = "1"
      }
      override {
        instance_type     = "t2.medium"
        weighted_capacity = "1"
      }
      override {
        instance_type     = "m5.large"
        weighted_capacity = "2"  # counts as 2 capacity units (more powerful)
      }
    }
  }
}
```

---

## Interview Preparation

**Q1: What is the difference between target tracking, step scaling, and scheduled scaling?**
A: Target Tracking: simplest, recommended. You specify a target value for a metric (e.g., CPU = 50%), and the ASG automatically calculates and applies scaling adjustments to maintain that target. AWS manages the scale-in and scale-out calculations. Like a thermostat — you set the desired temperature. Step Scaling: you define thresholds and scaling actions manually (e.g., CPU > 70%: add 2, CPU > 90%: add 4; CPU < 30%: remove 1). More control but requires manual tuning. Use when you have non-linear scaling requirements. Scheduled Scaling: scale at known times (e.g., add instances before market opens, scale down overnight). Use when traffic patterns are predictable. Combine all three: scheduled for predictable peaks, target tracking for dynamic load, step for fine-grained control.

**Q2: What is Instance Refresh and why is it needed?**
A: When you update a Launch Template (new AMI, new user data, new instance type), existing instances in the ASG still run the old configuration. Instance Refresh triggers a rolling replacement: it terminates instances in batches, waits for new instances to pass health checks, then moves to the next batch. Configuration: `min_healthy_percentage` ensures you never drop below e.g. 90% capacity during refresh. `instance_warmup` gives each new instance time to start before health checks. Without Instance Refresh, you'd need to manually terminate instances or drain the ASG and recreate it (causes downtime). Instance Refresh achieves zero-downtime AMI or configuration updates.

**Q3: How does EC2 Auto Scaling handle Spot interruptions?**
A: Spot instances can be interrupted with 2-minute notice when AWS needs capacity back. ASG with Spot: enable `capacity_rebalance = true` — ASG monitors rebalancing recommendations and proactively replaces at-risk Spot instances before interruption (rather than waiting for the 2-min warning). Use `capacity-optimized` spot allocation strategy (picks instance pools least likely to be interrupted). Use multiple instance types and AZs (diversification). Add On-Demand base capacity (`on_demand_base_capacity`) to ensure a minimum of non-interruptible instances. ALB connection draining (deregistration delay) ensures in-flight requests complete before termination. For stateful workloads, don't use Spot — use On-Demand or Reserved.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create an ASG with min=1, max=3, desired=2.
2. Attach an ALB target group to the ASG.
3. Set health check type to ELB.
4. Verify that terminating an instance causes ASG to replace it.
5. Manually adjust desired capacity and observe scaling.
6. Create a simple CPU target tracking policy (target 50%).
7. Set up scheduled scaling (scale to 4 at 9 AM, back to 2 at 6 PM).
8. Enable ASG lifecycle hooks for graceful shutdown.
9. View scaling activity in the ASG Activity History.
10. Add CloudWatch alarm for ASG desired vs. current capacity.

### Intermediate (10 Tasks)
1. Create an ASG with Terraform (LT + ASG + target tracking policy).
2. Trigger an instance refresh after a Launch Template update.
3. Add mixed instance policy with On-Demand base + Spot overflow.
4. Set up scale-in protection for in-progress jobs.
5. Configure warm pools to reduce scale-out latency.
6. Set up Application Auto Scaling for ECS service.
7. Add custom CloudWatch metric for ASG scaling (queue depth).
8. Implement step scaling policy for sudden traffic spikes.
9. Set up notifications for scaling events (SNS).
10. Test Spot interruption handling with `aws ec2 describe-instance-status`.

### Advanced (10 Tasks)
1. Build a complete auto-scaled app tier with ALB + ASG + Terraform.
2. Implement predictive scaling with ML-based forecasting.
3. Set up multi-AZ ASG with capacity rebalancing for Spot.
4. Configure warm pools with pre-initialized instances.
5. Implement graceful shutdown handler for Spot interruptions (SIGTERM).
6. Set up ASG lifecycle hooks with Lambda for custom initialization.
7. Build a deployment pipeline that triggers Instance Refresh.
8. Implement canary ASG (10% new, 90% old) behind ALB weighted routing.
9. Configure scaling cooldown periods to prevent oscillation.
10. Analyze ASG scaling history and optimize thresholds.

---

## Self Assessment
1. What is an Auto Scaling Group?
2. What is a Launch Template?
3. What is the difference between min, max, and desired capacity?
4. What is target tracking scaling?
5. What is step scaling?
6. What is scheduled scaling?
7. What is Instance Refresh?
8. What is min_healthy_percentage?
9. What is capacity rebalancing for Spot?
10. What health check types can an ASG use?

---

## Cheat Sheet

```bash
# ASG CLI commands
aws autoscaling describe-auto-scaling-groups
aws autoscaling set-desired-capacity --auto-scaling-group-name myapp-asg --desired-capacity 4
aws autoscaling start-instance-refresh --auto-scaling-group-name myapp-asg \
  --preferences '{"MinHealthyPercentage":90,"InstanceWarmup":120}'
aws autoscaling describe-scaling-activities --auto-scaling-group-name myapp-asg
aws autoscaling describe-policies --auto-scaling-group-name myapp-asg

# Execute scheduled action manually
aws autoscaling execute-policy --auto-scaling-group-name myapp-asg --policy-name myapp-cpu-scaling

# List instance refresh status
aws autoscaling describe-instance-refreshes --auto-scaling-group-name myapp-asg
```

```
Scaling policy types:
  TargetTrackingScaling  → set a target, AWS calculates actions
  StepScaling            → define steps based on alarm breach size
  SimpleScaling          → single step (legacy, avoid)
  ScheduledScaling       → scale at specific times (cron)
  PredictiveScaling      → ML-based proactive scaling

Predefined metrics for TargetTracking:
  ASGAverageCPUUtilization
  ASGAverageNetworkIn
  ASGAverageNetworkOut
  ALBRequestCountPerTarget  ← most useful for web apps

Spot strategies:
  lowest-price:          cheapest, highest interruption risk
  capacity-optimized:    most available capacity, lower interruption
  price-capacity-optimized: balance of both (recommended)
```
