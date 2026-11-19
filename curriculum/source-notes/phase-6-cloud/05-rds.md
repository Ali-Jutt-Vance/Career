# Phase 6 — Chapter 5: RDS (Relational Database Service)

---

## Chapter Overview

RDS is AWS's managed relational database service. AWS handles OS patching, database engine upgrades, automated backups, Multi-AZ failover, and read replicas. You manage schema, data, and connection strings.

**Topics:**
- Supported engines (PostgreSQL, MySQL, MariaDB, Oracle, SQL Server, Aurora)
- Single-AZ vs Multi-AZ vs Aurora
- Read replicas for scaling reads
- Parameter groups and option groups
- Automated backups and point-in-time recovery
- RDS Proxy for connection pooling
- Aurora Serverless v2
- Performance Insights

---

## Beginner Theory

### RDS vs. Self-Managed Database

```
Self-Managed (EC2):            RDS (Managed):
  You install DB engine           AWS installs, patches DB engine
  You patch OS + DB               AWS patches OS
  You configure backups           Automated daily backups + PITR
  You set up Multi-AZ             Enable Multi-AZ with a checkbox
  You manage replicas             AWS manages read replica replication
  Full control of everything      Limited to RDS-supported configs
  Cheaper at scale                Simpler operations, higher cost

When to use RDS:
  You want managed ops            → Always start here
  GDPR / compliance needs PITR   → Automated 35-day backup retention
  High availability required     → Multi-AZ automatic failover

When NOT to use RDS:
  Need PostgreSQL extension not supported in RDS → use EC2
  Extreme customization (custom storage engine) → use EC2
  Want 100% free/open-source stack → Aurora at $$ or self-manage
```

### Aurora vs. Standard RDS

```
Standard RDS (PostgreSQL/MySQL):
  Uses EBS storage per instance
  Read replicas up to 5 (PostgreSQL), replication lag possible
  Multi-AZ: standby in another AZ, not serving reads
  Backup/restore: manual snapshots + automated backups
  
Amazon Aurora:
  Purpose-built AWS distributed storage layer
  Storage shared across up to 15 read replicas — no replication lag
  Storage auto-grows in 10 GB increments (no pre-provisioning)
  6-way replication across 3 AZs (better durability than standard RDS)
  Faster failover than standard RDS Multi-AZ
  Aurora Serverless v2: auto-scales compute capacity (ACUs) instantly
  2x MySQL speed, 3x PostgreSQL speed (per AWS benchmarks)
  
Use Aurora when: production workloads that need HA + scale
Use standard RDS when: cost-sensitive, dev/test, simple requirements
```

---

## Basic Examples

### RDS with Terraform

```hcl
# DB Subnet Group (RDS must be in private subnets)
resource "aws_db_subnet_group" "main" {
  name       = "myapp-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "myapp-db-subnet-group" }
}

# Security Group: allow DB port only from app security group
resource "aws_security_group" "rds" {
  name   = "myapp-rds-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 5432   # PostgreSQL
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = { Name = "myapp-rds-sg" }
}

# Parameter group for PostgreSQL tuning
resource "aws_db_parameter_group" "postgres" {
  name   = "myapp-postgres16"
  family = "postgres16"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # log queries > 1 second
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "main" {
  identifier = "myapp-postgres"

  # Engine
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = "db.t3.medium"

  # Storage
  allocated_storage     = 20
  max_allocated_storage = 100   # auto-scaling up to 100 GB
  storage_type          = "gp3"
  storage_encrypted     = true

  # DB Config
  db_name  = "myapp"
  username = "myapp_admin"
  password = random_password.db.result  # from random_password resource

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false   # NEVER expose to internet

  # HA
  multi_az = true   # standby in different AZ, automatic failover

  # Backups
  backup_retention_period = 7      # days of automated backups
  backup_window           = "03:00-04:00"  # UTC
  maintenance_window      = "sun:04:00-sun:05:00"

  # Monitoring
  monitoring_interval          = 60    # enhanced monitoring every 60s
  monitoring_role_arn          = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled = true
  performance_insights_retention_period = 7  # days

  # Parameter/option groups
  parameter_group_name = aws_db_parameter_group.postgres.name

  # Protection
  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "myapp-postgres-final"
  copy_tags_to_snapshot   = true

  apply_immediately = false   # apply changes during maintenance window

  tags = { Name = "myapp-postgres" }
}

# Read replica (different AZ or region)
resource "aws_db_instance" "replica" {
  identifier          = "myapp-postgres-replica"
  replicate_source_db = aws_db_instance.main.identifier
  instance_class      = "db.t3.small"  # can be smaller for read-only

  publicly_accessible  = false
  skip_final_snapshot  = true
  deletion_protection  = false
  apply_immediately    = true

  tags = { Name = "myapp-postgres-replica" }
}

# Store credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db" {
  name = "myapp/database"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id

  secret_string = jsonencode({
    host:     aws_db_instance.main.address
    port:     aws_db_instance.main.port
    dbname:   aws_db_instance.main.db_name
    username: aws_db_instance.main.username
    password: random_password.db.result
  })
}
```

### RDS Proxy

```hcl
# RDS Proxy — connection pooling (essential for Lambda → RDS)
resource "aws_db_proxy" "main" {
  name                   = "myapp-proxy"
  engine_family          = "POSTGRESQL"
  iam_auth               = "DISABLED"
  role_arn               = aws_iam_role.rds_proxy.arn
  vpc_security_group_ids = [aws_security_group.rds.id]
  vpc_subnet_ids         = aws_subnet.private[*].id

  auth {
    auth_scheme = "SECRETS"
    secret_arn  = aws_secretsmanager_secret.db.arn
  }

  connection_pool_config {
    max_connections_percent = 80        # use max 80% of DB connections
    connection_borrow_timeout = 120
  }
}

resource "aws_db_proxy_default_target_group" "main" {
  db_proxy_name = aws_db_proxy.main.name

  connection_pool_config {
    max_connections_percent = 80
  }
}

resource "aws_db_proxy_target" "main" {
  db_instance_identifier = aws_db_instance.main.identifier
  db_proxy_name          = aws_db_proxy.main.name
  target_group_name      = aws_db_proxy_default_target_group.main.name
}

# Lambda connects to proxy endpoint instead of DB directly
# PROXY_ENDPOINT = aws_db_proxy.main.endpoint
```

---

## Interview Preparation

**Q1: What is the difference between RDS Multi-AZ and Read Replicas?**
A: Multi-AZ: high availability feature. AWS maintains a synchronous standby in a different AZ. The standby receives synchronous writes — every commit is committed on both primary and standby before the application gets an ACK. During primary failure, DNS updates point to standby within 60-120 seconds (automatic). The standby CANNOT serve read traffic (in standard RDS — Aurora's Multi-AZ read replicas can). Read Replicas: scalability feature. Asynchronous replication from primary. Lag is possible. Used to distribute read load across multiple endpoints. Can be in same region, different AZ, or cross-region. Can also be promoted to standalone DB for disaster recovery. Use both together: Multi-AZ for HA, read replicas for read scaling.

**Q2: Why should you use RDS Proxy with Lambda?**
A: Lambda functions are stateless — each invocation may create a new database connection. At scale, you can have thousands of concurrent Lambda executions, each trying to open a connection to your RDS instance. PostgreSQL max_connections is typically 100-500 (limited by memory). 1,000 concurrent Lambdas would exhaust connections and crash the database. RDS Proxy acts as a connection pool: it maintains a fixed pool of connections to RDS and multiplexes thousands of Lambda requests over them. Lambda connects to the Proxy endpoint (fast), Proxy reuses existing DB connections. RDS Proxy also: handles failover transparently (waits for new primary), can use IAM authentication, reduces failover time from ~1 min to seconds.

**Q3: What is Amazon Aurora and when should you use it over RDS?**
A: Aurora is AWS's cloud-native relational database — reimagined from scratch for cloud storage. Key differences: Distributed storage layer: 6 copies across 3 AZs (vs. 2 copies in Multi-AZ RDS). Up to 15 read replicas sharing the same storage (vs. 5 for MySQL, replication lag free). Auto-scaling storage (10 GB increments, up to 128 TB). Faster failover (30 seconds vs. 60-120 for RDS Multi-AZ). Aurora Serverless v2: compute scales from 0.5 to 128 ACUs based on load — no pre-provisioning. Use Aurora for: production workloads requiring high availability and read scaling. Use standard RDS for: smaller projects, cost-sensitive scenarios, databases that don't need Aurora's scale.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Launch an RDS PostgreSQL instance (single-AZ, t3.micro).
2. Connect to it with psql from an EC2 instance.
3. Enable automated backups with 7-day retention.
4. Create a manual snapshot.
5. Restore from a snapshot to a new instance.
6. Enable Multi-AZ on an existing instance.
7. Enable Performance Insights.
8. Add a CloudWatch alarm for high CPU (> 80%).
9. Connect with a Node.js app using the RDS endpoint.
10. Store credentials in Secrets Manager and retrieve in app.

### Intermediate (10 Tasks)
1. Create an RDS instance with Terraform (Multi-AZ + encryption).
2. Create a read replica and route SELECT queries to it.
3. Set up RDS Proxy for Lambda connection pooling.
4. Configure custom parameter group for PostgreSQL tuning.
5. Set up point-in-time recovery to restore to 3 days ago.
6. Enable Enhanced Monitoring (60-second intervals).
7. Configure RDS to send logs to CloudWatch.
8. Set up automated backups with cross-region copy.
9. Test failover (trigger Multi-AZ switchover) and measure downtime.
10. Use Performance Insights to identify slow queries.

### Advanced (10 Tasks)
1. Deploy Aurora PostgreSQL cluster with 2 read replicas.
2. Configure Aurora Auto Scaling for read replicas (scale based on CPU).
3. Set up Aurora Serverless v2 and test auto-scale.
4. Implement blue-green deployment for RDS (zero-downtime schema changes).
5. Configure Aurora Global Database for cross-region HA.
6. Implement database activity streams for compliance audit.
7. Use RDS Proxy with IAM authentication (no password).
8. Configure Trusted Language Extensions (TLE) for custom functions.
9. Analyze query performance with pg_stat_statements in CloudWatch.
10. Migrate from self-managed PostgreSQL to RDS using DMS.

---

## Self Assessment
1. What does RDS manage for you vs. what you manage?
2. What is Multi-AZ?
3. What is a Read Replica?
4. What is the difference between Multi-AZ and Read Replicas?
5. What is Aurora?
6. What is Aurora Serverless v2?
7. What is RDS Proxy and why use it with Lambda?
8. What is point-in-time recovery?
9. What is a Parameter Group?
10. Why should RDS never be publicly accessible?

---

## Cheat Sheet

```bash
# RDS CLI commands
aws rds describe-db-instances
aws rds create-db-snapshot --db-instance-identifier myapp-postgres --db-snapshot-identifier myapp-snap-$(date +%Y%m%d)
aws rds restore-db-instance-from-db-snapshot --db-instance-identifier myapp-restored --db-snapshot-identifier myapp-snap-20250101
aws rds restore-db-instance-to-point-in-time --source-db-instance-identifier myapp-postgres --target-db-instance-identifier myapp-restored --restore-time 2025-01-15T09:00:00Z
aws rds reboot-db-instance --db-instance-identifier myapp-postgres --force-failover  # trigger Multi-AZ failover
aws rds describe-db-log-files --db-instance-identifier myapp-postgres
```

```
RDS pricing (approx):
  db.t3.micro:    $0.017/hr  (single-AZ)
  db.t3.medium:   $0.068/hr  (single-AZ)
  db.m6g.large:   $0.129/hr  (single-AZ)
  Multi-AZ:       2x single-AZ price
  Storage:        $0.115/GB/mo (gp3)
  Backup:         First backup = free (same size as DB); extra $0.095/GB

Connection string:
  postgresql://username:password@myapp-postgres.xxxx.us-east-1.rds.amazonaws.com:5432/myapp
  (for RDS Proxy):
  postgresql://username:password@myapp-proxy.proxy-xxxx.us-east-1.rds.amazonaws.com:5432/myapp
```
