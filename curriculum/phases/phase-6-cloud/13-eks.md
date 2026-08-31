# Phase 6 — Chapter 13: EKS (Elastic Kubernetes Service)

---

## Chapter Overview

EKS is AWS's managed Kubernetes service. AWS manages the control plane (API server, etcd, scheduler). You manage worker nodes (EC2 or Fargate). Kubernetes is the industry standard for container orchestration at scale.

**Topics:**
- Kubernetes core concepts (Pods, Deployments, Services, Ingress)
- EKS cluster creation and node groups
- kubectl basics
- Helm for package management
- EKS with Fargate profiles
- AWS Load Balancer Controller
- IAM Roles for Service Accounts (IRSA)
- Horizontal Pod Autoscaler (HPA)
- EKS Add-ons (CoreDNS, kube-proxy, VPC CNI, EBS CSI Driver)

---

## Beginner Theory

### Kubernetes Core Concepts

```
Control Plane (managed by AWS in EKS):
  API Server:    Entry point for all K8s operations (kubectl → API Server)
  etcd:          Distributed key-value store, cluster state
  Scheduler:     Assigns Pods to Nodes based on resources
  Controller Manager: Ensures desired state (replicas, rolling updates)

Data Plane (you manage — EC2 worker nodes or Fargate):
  Node:         EC2 instance running the kubelet agent
  Kubelet:      Agent on each node, pulls Pod specs, starts containers
  kube-proxy:   Network proxy, handles Service ClusterIPs

Key Objects:
  Pod:          Smallest deployable unit. One or more containers sharing network+storage.
                Ephemeral — can be killed and replaced.
  Deployment:   Manages N replicas of a Pod. Handles rolling updates, rollbacks.
  Service:      Stable DNS name + IP for a set of Pods (ClusterIP, NodePort, LoadBalancer)
  Ingress:      HTTP routing rules → Services (similar to ALB listener rules)
  ConfigMap:    Non-sensitive config (env vars, files)
  Secret:       Sensitive config (passwords, tokens) — base64 encoded in etcd
  Namespace:    Virtual cluster for isolation (dev, staging, production namespaces)
  HPA:          Horizontal Pod Autoscaler — scale based on CPU/memory/custom metrics
  PVC:          PersistentVolumeClaim — request for persistent storage (EBS, EFS)
```

---

## Basic Examples

### EKS Cluster with Terraform

```hcl
# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "myapp-${var.environment}"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.31"

  vpc_config {
    subnet_ids             = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true    # false in production (use VPN/bastion)
    public_access_cidrs    = var.allowed_ips  # restrict to your IPs
    security_group_ids     = [aws_security_group.eks_cluster.id]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_cloudwatch_log_group.eks
  ]
}

# Node Group (EC2 managed nodes)
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "myapp-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = ["m6i.large"]
  ami_type        = "AL2_x86_64"
  capacity_type   = "ON_DEMAND"  # or SPOT

  scaling_config {
    desired_size = 3
    min_size     = 2
    max_size     = 10
  }

  update_config {
    max_unavailable = 1  # rolling update: 1 node at a time
  }

  labels = {
    role = "application"
  }

  tags = { Name = "myapp-node-group" }
}
```

### Kubernetes Manifests

```yaml
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge:       1    # create 1 extra pod during update
      maxUnavailable: 0    # never take pods offline (zero-downtime)
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: myapp   # for IRSA
      containers:
        - name: myapp
          image: 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.2.3
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key:  database-url
          resources:
            requests:
              cpu:    "100m"    # 0.1 CPU (1000m = 1 vCPU)
              memory: "256Mi"
            limits:
              cpu:    "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds:       5
            failureThreshold:    3
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds:       10
            failureThreshold:    3
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]  # drain connections
      terminationGracePeriodSeconds: 30
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchLabels: { app: myapp }
                topologyKey: kubernetes.io/hostname  # spread across nodes

---
# Service (ClusterIP — internal access only)
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: production
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP

---
# Ingress (AWS Load Balancer Controller creates ALB)
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    kubernetes.io/ingress.class:                  "alb"
    alb.ingress.kubernetes.io/scheme:             "internet-facing"
    alb.ingress.kubernetes.io/target-type:        "ip"
    alb.ingress.kubernetes.io/certificate-arn:    "arn:aws:acm:..."
    alb.ingress.kubernetes.io/listen-ports:       '[{"HTTP":80,"HTTPS":443}]'
    alb.ingress.kubernetes.io/actions.ssl-redirect: |
      {"Type":"redirect","RedirectConfig":{"Protocol":"HTTPS","StatusCode":"HTTP_301"}}
    alb.ingress.kubernetes.io/healthcheck-path:   "/health"
spec:
  rules:
    - host: myapp.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: myapp-api
                port: { number: 80 }
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp-web
                port: { number: 80 }

---
# HorizontalPodAutoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name:   cpu
        target:
          type:               Utilization
          averageUtilization: 60
    - type: Resource
      resource:
        name:   memory
        target:
          type:               Utilization
          averageUtilization: 80
```

### kubectl Commands

```bash
# Cluster access
aws eks update-kubeconfig --name myapp-production --region us-east-1
kubectl cluster-info
kubectl get nodes

# Pods
kubectl get pods -n production
kubectl get pods -n production -o wide           # show node and IP
kubectl describe pod myapp-abc123 -n production  # detailed info
kubectl logs myapp-abc123 -n production          # logs
kubectl logs myapp-abc123 -n production -f       # follow logs
kubectl logs myapp-abc123 -n production --previous  # previous crashed container

# Exec into pod
kubectl exec -it myapp-abc123 -n production -- /bin/sh

# Deployments
kubectl get deployments -n production
kubectl rollout status deployment/myapp -n production
kubectl rollout history deployment/myapp -n production
kubectl rollout undo deployment/myapp -n production    # rollback
kubectl set image deployment/myapp myapp=myapp:v1.2.4 -n production

# Apply/delete manifests
kubectl apply -f deployment.yaml
kubectl delete -f deployment.yaml

# Port-forward for local testing
kubectl port-forward pod/myapp-abc123 3000:3000 -n production

# Resource usage
kubectl top nodes
kubectl top pods -n production

# Secrets
kubectl create secret generic myapp-secrets -n production \
  --from-literal=database-url="postgresql://..."
kubectl get secret myapp-secrets -n production -o jsonpath='{.data.database-url}' | base64 -d
```

---

## Interview Preparation

**Q1: What is IRSA (IAM Roles for Service Accounts)?**
A: IRSA allows Kubernetes Pods to assume IAM roles without using long-term credentials or instance profiles. Without IRSA, all pods on an EC2 node share the node's IAM role — dangerous (any pod can access all node permissions). IRSA: create a Kubernetes Service Account annotated with an IAM role ARN. Create an IAM role with a trust policy that allows the EKS OIDC provider to assume it for that specific service account. The pod running with that service account gets temporary credentials for that specific IAM role via the projected service account token. This enables least privilege at the pod level, not just the node level. Essential for any production EKS setup.

**Q2: What is the difference between EKS and ECS?**
A: ECS is AWS's proprietary container orchestration — simpler, tightly integrated with AWS, less ecosystem. EKS runs standard Kubernetes — complex, industry standard, vast ecosystem, portable across cloud providers. ECS advantages: simpler to learn, tighter AWS integration (IAM, CloudFormation), managed Fargate is first-class, lower operational overhead. EKS advantages: Kubernetes ecosystem (Helm, ArgoCD, Istio, Prometheus Operator), portable workloads, multi-cloud, more community tooling, required if your team already uses Kubernetes. Choose ECS for: AWS-only shops that want simplicity, startups, teams new to containers. Choose EKS for: teams with Kubernetes expertise, multi-cloud requirements, need Helm-based tools, complex networking/service mesh.

**Q3: What are Kubernetes requests and limits and why do they matter?**
A: Requests: the minimum resources a container is guaranteed. The scheduler uses requests to decide which node a pod can run on. A node with 2 CPU available can schedule pods totaling 2 CPU in requests. Limits: the maximum a container can use. If it exceeds CPU limit, it gets throttled. If it exceeds memory limit, the container is OOMKilled (killed and restarted). Why they matter: without requests, the scheduler can't make placement decisions (it might overcommit nodes). Without limits, one misbehaving container can consume all node resources (CPU starvation, OOM). Best practice: always set both. For CPU: limit = 2-4x request. For memory: limit ≈ request (memory can't be throttled, only killed). Set namespace LimitRange defaults so every pod gets sane defaults.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create an EKS cluster (console or eksctl).
2. Configure `kubectl` access with `aws eks update-kubeconfig`.
3. Deploy a simple Nginx Deployment with 2 replicas.
4. Create a ClusterIP Service for the Deployment.
5. Port-forward to test the pod locally.
6. Scale the Deployment to 4 replicas.
7. Roll out a new image version with `kubectl set image`.
8. Roll back with `kubectl rollout undo`.
9. View pod logs with `kubectl logs -f`.
10. Delete the Deployment and Service.

### Intermediate (10 Tasks)
1. Create an EKS cluster with Terraform.
2. Set up AWS Load Balancer Controller.
3. Deploy app with Ingress to create an ALB.
4. Set up IRSA for S3 access from a pod.
5. Create a Secret from Secrets Manager with External Secrets Operator.
6. Set up HPA based on CPU utilization.
7. Set up Cluster Autoscaler for automatic node scaling.
8. Install Metrics Server (`kubectl top pods` support).
9. Install Prometheus Operator with Helm.
10. Set up namespace-level RBAC (developer access to specific namespace).

### Advanced (10 Tasks)
1. Implement GitOps deployment with ArgoCD.
2. Set up service mesh with Istio or AWS App Mesh.
3. Implement Karpenter for intelligent node provisioning.
4. Set up Fargate profiles for serverless pods.
5. Configure VPA (Vertical Pod Autoscaler) for right-sizing.
6. Implement pod disruption budgets for zero-downtime maintenance.
7. Set up EKS multi-cluster with cross-cluster networking.
8. Implement custom admission webhooks for policy enforcement.
9. Build a Helm chart for your application.
10. Set up EKS with Bottlerocket OS for enhanced security.

---

## Self Assessment
1. What is Kubernetes?
2. What is a Pod?
3. What is a Deployment?
4. What is a Service?
5. What is an Ingress?
6. What is the difference between EKS and ECS?
7. What is IRSA?
8. What is HPA?
9. What is the difference between requests and limits?
10. What is a Helm chart?

---

## Cheat Sheet

```bash
# kubectl essentials
kubectl get pods/deployments/services/ingress -n <namespace>
kubectl describe pod <name> -n <namespace>
kubectl logs <pod> -n <namespace> -f
kubectl exec -it <pod> -n <namespace> -- /bin/sh
kubectl apply -f manifest.yaml
kubectl delete -f manifest.yaml
kubectl rollout status deployment/<name> -n <namespace>
kubectl rollout undo deployment/<name> -n <namespace>
kubectl scale deployment/<name> --replicas=5 -n <namespace>

# EKS
aws eks update-kubeconfig --name <cluster> --region us-east-1
eksctl create cluster --name myapp --region us-east-1 --nodegroup-name workers --node-type m5.large --nodes 3

# Helm
helm install myapp ./chart -n production -f values.prod.yaml
helm upgrade myapp ./chart -n production -f values.prod.yaml
helm rollback myapp 1 -n production
helm list -n production
```

```yaml
# Minimal Deployment template
apiVersion: apps/v1
kind: Deployment
metadata: { name: myapp, namespace: default }
spec:
  replicas: 2
  selector: { matchLabels: { app: myapp } }
  template:
    metadata: { labels: { app: myapp } }
    spec:
      containers:
        - name: myapp
          image: nginx:latest
          ports: [{ containerPort: 80 }]
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }
          readinessProbe:
            httpGet: { path: /, port: 80 }
            initialDelaySeconds: 5
```
