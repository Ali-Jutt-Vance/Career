# Phase 6 — Chapter 11: Elastic Load Balancer (ELB)

---

## Chapter Overview

AWS Elastic Load Balancer distributes incoming traffic across multiple targets (EC2 instances, ECS tasks, Lambda functions, IP addresses) in multiple AZs. There are four types: Application (ALB), Network (NLB), Gateway (GWLB), and Classic (legacy).

**Topics:**
- ALB vs. NLB vs. GWLB
- Listeners, rules, and target groups
- Path-based and host-based routing
- HTTPS termination and ACM integration
- Sticky sessions
- Health checks
- Connection draining / deregistration delay
- Access logs

---

## Beginner Theory

### Load Balancer Types

```
Application Load Balancer (ALB):    Layer 7 (HTTP/HTTPS/WebSocket/gRPC)
  Routes by URL path, host, headers, query string, method
  Native support for HTTP/2 and WebSocket
  Can authenticate users (Cognito, OIDC)
  Has AWS WAF integration
  Target: EC2, ECS, Lambda, IP addresses
  Cost: $0.008/hr + $0.008/LCU-hour
  Best for: web apps, APIs, microservices

Network Load Balancer (NLB):        Layer 4 (TCP/UDP/TLS)
  Routes by IP + port only
  Extremely high performance: millions of requests/second
  Supports static IPs or Elastic IPs (ALB has variable IPs)
  Ultra-low latency
  Target: EC2, ECS, IP addresses
  Best for: TCP workloads, game servers, financial apps, SMTP, IoT

Gateway Load Balancer (GWLB):       Layer 3 (IP)
  For network appliances (firewalls, IDS/IPS)
  Not used for application traffic

Classic Load Balancer (CLB):        Legacy
  Do not use — use ALB or NLB
```

---

## Basic Examples

### ALB with Terraform

```hcl
# ALB Security Group
resource "aws_security_group" "alb" {
  name   = "myapp-alb-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "myapp-alb-sg" }
}

# ALB
resource "aws_lb" "main" {
  name               = "myapp-alb"
  internal           = false    # internet-facing
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = true
  enable_http2               = true

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "myapp-alb"
    enabled = true
  }

  tags = { Name = "myapp-alb" }
}

# Target Group
resource "aws_lb_target_group" "app" {
  name        = "myapp-app-tg"
  port        = 3000
  protocol    = "HTTP"
  target_type = "instance"   # or "ip" for ECS tasks, "lambda"
  vpc_id      = aws_vpc.main.id

  health_check {
    enabled             = true
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 5
    matcher             = "200"  # expected status code
  }

  # Deregistration delay: allow in-flight requests to complete before removing target
  deregistration_delay = 30   # seconds (default 300 — reduce for faster deploys)

  stickiness {
    type            = "lb_cookie"
    cookie_duration = 86400  # 1 day (set 0 to disable)
    enabled         = false  # disable for stateless apps
  }

  tags = { Name = "myapp-app-tg" }
}

# HTTP Listener: redirect to HTTPS
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Listener Rule: route /api/* to API target group
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 10

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# Listener Rule: return 503 if missing required CloudFront header
resource "aws_lb_listener_rule" "block_direct" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 1  # highest priority

  condition {
    http_header {
      http_header_name = "X-CloudFront-Secret"
      values           = [var.cloudfront_secret]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# Default action for HTTPS listener when no rules match + no secret header
# Can also add a fixed-response rule for direct access attempts
resource "aws_lb_listener_rule" "deny_direct" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 2

  condition {
    path_pattern {
      values = ["/*"]
    }
  }

  action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }
}
```

### Blue-Green Deployment with ALB Weighted Target Groups

```hcl
# Weighted target group (for blue-green / canary)
resource "aws_lb_listener_rule" "canary" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 20

  condition {
    path_pattern { values = ["/api/*"] }
  }

  action {
    type = "forward"
    forward {
      target_group {
        arn    = aws_lb_target_group.blue.arn
        weight = 90
      }
      target_group {
        arn    = aws_lb_target_group.green.arn
        weight = 10  # 10% to green (new version)
      }
      stickiness {
        enabled  = true
        duration = 300  # stick to same target for 5 min per user
      }
    }
  }
}
```

---

## Interview Preparation

**Q1: What is the difference between ALB and NLB?**
A: ALB (Layer 7): understands HTTP. Routes by URL path, headers, hostname. SSL termination — backend receives plain HTTP. Native WebSocket support. WAF integration. Can route to Lambda. Adds X-Forwarded-For header with real client IP. Slightly higher latency (parses HTTP). NLB (Layer 4): works at TCP/UDP level. Routes by IP + port only. Can pass-through TLS (your backend terminates SSL) or terminate TLS. Preserves source IP natively. Supports Elastic IPs (static IPs per AZ — good for whitelisting). Extremely high throughput (millions req/sec), ultra-low latency (<100μs). No path-based routing. Use ALB for: web applications, APIs, anything needing HTTP-aware routing. Use NLB for: TCP applications, static IP requirement, ultra-high performance, non-HTTP protocols.

**Q2: What is connection draining / deregistration delay and why is it important?**
A: When you remove an instance from an ALB target group (during deploy, scale-in, or instance termination), active connections to that instance need to complete — you can't abruptly terminate them. Deregistration delay: ALB stops sending new requests to the deregistering target but continues to forward existing in-flight requests for the configured delay period (default 300 seconds, recommend 30-60 seconds for API). After the delay, all connections are forcibly closed. Why it matters: without draining, in-flight requests (file uploads, API calls) would error mid-request when the instance is removed. With proper draining + graceful shutdown in your app, requests complete naturally. Reduce delay (30 seconds) for faster deployments; increase (300 seconds) for long-running operations like file uploads.

**Q3: How does sticky sessions work and when should you avoid it?**
A: Sticky sessions (session affinity): the ALB uses a cookie (`AWSALB`) to route all requests from the same user to the same target for the cookie duration. This ensures users with server-side session state (shopping cart, auth session in memory) always hit the same backend. Problems: breaks horizontal scalability — one instance gets overloaded while others are underused. Defeats the purpose of load balancing. Makes deployments harder (draining all stuck users takes longer). Better approach: stateless backends — store sessions in Redis/DynamoDB/Elasticache, not in memory. Then any instance can serve any request. Only use sticky sessions if you have a legacy stateful app that you cannot make stateless quickly.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create an ALB in a public subnet with two AZs.
2. Create a target group for EC2 instances on port 3000.
3. Register EC2 instances with the target group.
4. Create HTTP listener that redirects to HTTPS.
5. Create HTTPS listener with ACM certificate.
6. Verify ALB health checks mark instances healthy.
7. Add `curl -I https://myapp.com` to verify ALB routing.
8. View ALB access logs in S3.
9. Set deregistration delay to 30 seconds.
10. Terminate one EC2 instance — verify ALB routes to remaining.

### Intermediate (10 Tasks)
1. Build ALB + TG + ASG with Terraform.
2. Add path-based routing rule: `/api/*` → API target group.
3. Add host-based routing: `api.myapp.com` → API TG.
4. Add a fixed-response rule for direct access (no CF secret).
5. Set up blue-green deployment with weighted target groups (90/10).
6. Enable access logs and analyze top error paths with Athena.
7. Set up NLB for TCP connection to a game server.
8. Add WAF to ALB and block common attack patterns.
9. Set up Cognito authentication via ALB (OAuth 2.0 built-in).
10. Configure ALB for WebSocket: ensure `Upgrade` header passthrough.

### Advanced (10 Tasks)
1. Build full ALB + ASG + Route 53 + CloudFront architecture with Terraform.
2. Implement zero-downtime blue-green switch (move 100% weight instantly).
3. Set up NLB with TLS passthrough to backend with client certificate auth.
4. Build canary deployment automation (gradually increase green weight).
5. Set up ALB access log analysis pipeline (S3 → Firehose → OpenSearch).
6. Implement rate limiting at ALB level using WAF.
7. Add custom response headers to ALB responses.
8. Set up cross-zone load balancing analysis.
9. Implement IP-based allow/deny rules with WAF on ALB.
10. Build automated ALB failover test.

---

## Self Assessment
1. What is a Load Balancer?
2. What is the difference between ALB and NLB?
3. What is a Target Group?
4. What is a Listener?
5. What is a Listener Rule?
6. What is health check in the context of ALB?
7. What is deregistration delay?
8. What is sticky sessions?
9. What is path-based routing?
10. What is host-based routing?

---

## Cheat Sheet

```bash
# ALB CLI
aws elbv2 describe-load-balancers
aws elbv2 describe-target-groups
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...
aws elbv2 describe-listeners --load-balancer-arn arn:aws:elasticloadbalancing:...
aws elbv2 describe-rules --listener-arn arn:aws:elasticloadbalancing:...

# Register/deregister targets
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-1234567890,Port=3000

aws elbv2 deregister-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-1234567890
```

```
ALB routing priority (listener rules evaluated in order):
  1. path-pattern match       /api/*, /admin/*
  2. host-header match        api.myapp.com, admin.myapp.com
  3. http-header match        X-API-Version: v2
  4. query-string match       ?version=beta
  5. source-ip match          10.0.0.0/8
  6. default action           (forward to default TG)

Health check matcher:
  "200"       → only 200
  "200-299"   → any 2xx
  "200,302"   → 200 or 302

ALB pricing:
  $0.008/hr (per ALB)
  $0.008/LCU-hour
  LCU = max(new conn/s, active conn, req/s, bandwidth)
  Typically: small app = $5-20/mo, large = $30-100/mo
```
