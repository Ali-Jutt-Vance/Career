# Phase 6 — Chapter 12: ECS (Elastic Container Service)

---

## Chapter Overview

ECS is AWS's managed container orchestration service. You define your containers (task definitions) and ECS runs, scales, and manages them — either on EC2 instances you manage (EC2 launch type) or on fully serverless Fargate (Fargate launch type).

**Topics:**
- ECS architecture (Cluster, Service, Task Definition, Task)
- EC2 vs. Fargate launch types
- Task Definition configuration
- ECS Service with ALB integration
- Auto Scaling for ECS tasks
- IAM task roles vs. execution roles
- ECS Exec for debugging
- Blue-green deployments with CodeDeploy

---

## Beginner Theory

### ECS Architecture

```
Cluster:         Logical group of infrastructure (EC2 instances or Fargate capacity)
                 One cluster per environment (dev, staging, production)

Task Definition: Blueprint for running containers (like docker-compose.yml)
                 Defines: Docker image, CPU/memory, ports, env vars, volumes, roles
                 Versioned (task-def:1, task-def:2 ...)

Task:            Running instance of a Task Definition
                 Like: docker run (one-off) or part of a Service

Service:         Ensures N tasks are always running
                 Registers tasks with ALB target group
                 Handles rolling deployments

Launch Types:
  Fargate:       Serverless — AWS manages the underlying EC2 infrastructure
                 You pay per vCPU/hour + GB RAM/hour
                 No EC2 to patch, no instance management
                 Best for: most new workloads, variable traffic

  EC2:           You manage EC2 instances in the cluster
                 More control, cheaper at scale, requires instance management
                 Best for: GPU workloads, very high throughput, specific instance needs
```

---

## Basic Examples

### ECS Fargate with Terraform

```hcl
# ECR Repository (container image registry)
resource "aws_ecr_repository" "app" {
  name                 = "myapp"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  lifecycle_policy {
    policy = jsonencode({
      rules = [{
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "tagged"
          tagPrefixList = ["v"]
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = { type = "expire" }
      }]
    })
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "myapp-${var.environment}"

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# CloudWatch Log Group for containers
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/myapp"
  retention_in_days = 30
}

# Task Execution Role (pulls images from ECR, sends logs to CloudWatch)
resource "aws_iam_role" "ecs_execution" {
  name = "myapp-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow pulling from private ECR + reading secrets
resource "aws_iam_role_policy" "ecs_execution_extra" {
  name = "ecs-execution-extra"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = "arn:aws:secretsmanager:*:*:secret:myapp/*"
    }]
  })
}

# Task Role (permissions for the running application)
resource "aws_iam_role" "ecs_task" {
  name = "myapp-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "myapp-task-permissions"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = ["${aws_s3_bucket.app.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail"]
        Resource = "*"
      },
      {
        # For ECS Exec (debugging)
        Effect = "Allow"
        Action = [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel"
        ]
        Resource = "*"
      }
    ]
  })
}

# Task Definition
resource "aws_ecs_task_definition" "app" {
  family                   = "myapp"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"  # required for Fargate
  cpu                      = 512       # 0.5 vCPU
  memory                   = 1024      # 1 GB

  execution_role_arn = aws_iam_role.ecs_execution.arn
  task_role_arn      = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "myapp"
      image     = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
      essential = true

      portMappings = [{
        containerPort = 3000
        hostPort      = 3000
        protocol      = "tcp"
      }]

      environment = [
        { name = "NODE_ENV",    value = "production" },
        { name = "PORT",        value = "3000" },
        { name = "AWS_REGION",  value = var.region }
      ]

      # Inject secrets from Secrets Manager
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.db.arn}:url::"
        },
        {
          name      = "REDIS_URL"
          valueFrom = "${aws_secretsmanager_secret.redis.arn}:url::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "app"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60  # give app 60s to start before health checks count
      }

      ulimits = [{
        name      = "nofile"
        softLimit = 65536
        hardLimit = 65536
      }]
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "app" {
  name            = "myapp"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  enable_execute_command = true  # allow ECS Exec for debugging

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false  # private subnets
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "myapp"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true  # auto-rollback to previous if new tasks keep failing
  }

  deployment_controller {
    type = "ECS"  # rolling update (or "CODE_DEPLOY" for blue-green)
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]  # managed by CI/CD
  }

  depends_on = [aws_lb_listener.https]
}

# Application Auto Scaling for ECS
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 20
  min_capacity       = 2
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "myapp-ecs-cpu"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 60.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

---

## Interview Preparation

**Q1: What is the difference between ECS Task Execution Role and Task Role?**
A: Execution Role: used by the ECS agent and Fargate runtime to pull Docker images from ECR and send container logs to CloudWatch. The application code itself cannot use this role. You attach `AmazonECSTaskExecutionRolePolicy` to it. If you inject secrets from Secrets Manager or SSM, add permissions to this role too (ECS needs to read them before starting the container). Task Role: attached to the running application. The application code uses this role when making AWS SDK calls — S3.getObject, SES.sendEmail, DynamoDB.putItem, etc. This is what you'd normally think of as "the app's IAM role." Keep them separate: Execution Role for infrastructure-level operations (start the container), Task Role for application-level operations (what the app does once running).

**Q2: What is ECS Fargate and when would you choose EC2 launch type instead?**
A: Fargate is serverless compute for containers — you specify CPU and memory, AWS manages the underlying EC2 infrastructure. No patching, no capacity planning, no cluster management. You pay per task: vCPU-hour + GB RAM-hour. EC2 launch type: you manage EC2 instances in the cluster. ECS Scheduler places tasks on them. Advantages: full control over instance type (including GPU instances), potentially cheaper at scale (Reserved Instances), ability to use instance store for high I/O. Choose Fargate: most new workloads, variable traffic, don't want to manage servers, startup speed (tasks start in 30-60s). Choose EC2: GPU workloads (Fargate doesn't support GPU), very high throughput where Fargate pricing is prohibitive, custom kernel settings, very high density of tasks per dollar.

**Q3: What is the ECS Circuit Breaker and why enable it?**
A: During a rolling deployment, ECS starts new tasks. If the new task keeps failing health checks, without the circuit breaker, ECS keeps retrying indefinitely — your service degrades as bad tasks accumulate and good tasks drain. With circuit breaker enabled: ECS monitors failed task replacements. If a configurable threshold of consecutive failures occurs (default: 10 failed tasks), the deployment is marked failed and ECS automatically rolls back to the previous stable task definition. `rollback = true` automatically reverts — no manual intervention needed. This protects production: a bad image push doesn't cause an outage. Failures go to CloudWatch events and can trigger SNS notifications.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create an ECR repository and push a Docker image.
2. Create an ECS cluster (Fargate).
3. Write a Task Definition JSON and register it.
4. Run a one-off task (`ecs run-task`) in Fargate.
5. Create an ECS Service with desired_count=2.
6. View container logs in CloudWatch.
7. Scale the service: `aws ecs update-service --desired-count 4`.
8. View running tasks: `aws ecs list-tasks --cluster myapp`.
9. Check task health and logs.
10. Stop a running task and verify Service recreates it.

### Intermediate (10 Tasks)
1. Build ECS Fargate deployment with Terraform (ECR + Task Def + Service + ALB).
2. Inject secrets from Secrets Manager into a container.
3. Set up Application Auto Scaling for ECS (target tracking on CPU).
4. Enable ECS Exec and SSH into a running container.
5. Enable circuit breaker with auto-rollback.
6. Set up CloudWatch Container Insights for ECS cluster metrics.
7. Configure sidecar container (e.g., Datadog agent, log forwarder).
8. Set up CI/CD pipeline that updates ECS task definition and triggers deploy.
9. Use ECR lifecycle policy to delete old images.
10. Enable ECR image scanning and fail CI if critical CVEs found.

### Advanced (10 Tasks)
1. Implement blue-green deployment with CodeDeploy + ECS.
2. Set up multi-container task (app + nginx sidecar).
3. Build a worker ECS service (no ALB) consuming SQS messages.
4. Implement ECS Task Placement Strategies (spread, binpack).
5. Set up ECS on EC2 with mixed Spot/On-Demand instances.
6. Implement ECS service discovery with AWS Cloud Map.
7. Set up Fargate Spot tasks for worker services (batch jobs).
8. Build zero-downtime database migration as ECS task.
9. Implement ECS Anywhere (run containers on-premises).
10. Set up cross-account ECS deployment with ECR image pull.

---

## Self Assessment
1. What is an ECS Cluster?
2. What is a Task Definition?
3. What is an ECS Service?
4. What is the difference between Fargate and EC2 launch types?
5. What is the Execution Role?
6. What is the Task Role?
7. What is ECS Circuit Breaker?
8. What is ECS Exec?
9. What is Application Auto Scaling for ECS?
10. What is a Container Insight?

---

## Cheat Sheet

```bash
# ECS CLI commands
aws ecs list-clusters
aws ecs describe-clusters --clusters myapp-production
aws ecs list-services --cluster myapp-production
aws ecs describe-services --cluster myapp-production --services myapp
aws ecs list-tasks --cluster myapp-production --service-name myapp
aws ecs describe-tasks --cluster myapp-production --tasks <task-arn>

# Deploy new image
aws ecs update-service --cluster myapp-production --service myapp \
  --force-new-deployment

# Register new task definition and update service
TASK_DEF=$(aws ecs register-task-definition --cli-input-json file://task-def.json --query 'taskDefinition.taskDefinitionArn' --output text)
aws ecs update-service --cluster myapp-production --service myapp --task-definition "$TASK_DEF"

# ECS Exec (SSH into running container)
aws ecs execute-command \
  --cluster myapp-production \
  --task <task-arn> \
  --container myapp \
  --interactive \
  --command "/bin/sh"

# Scale
aws ecs update-service --cluster myapp-production --service myapp --desired-count 6
```

```
CPU/Memory combinations for Fargate:
  CPU 256 (.25 vCPU):   Memory: 512MB, 1GB, 2GB
  CPU 512 (.5 vCPU):    Memory: 1GB–4GB
  CPU 1024 (1 vCPU):    Memory: 2GB–8GB
  CPU 2048 (2 vCPU):    Memory: 4GB–16GB
  CPU 4096 (4 vCPU):    Memory: 8GB–30GB
  CPU 8192 (8 vCPU):    Memory: 16GB–60GB
  CPU 16384 (16 vCPU):  Memory: 32GB–120GB

Fargate pricing (us-east-1):
  vCPU: $0.04048/hr
  GB RAM: $0.004445/hr
  0.5 vCPU + 1 GB = ~$0.022/hr ≈ $16/mo per task
```
