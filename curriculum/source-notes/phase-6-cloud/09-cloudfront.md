# Phase 6 — Chapter 9: CloudFront

---

## Chapter Overview

CloudFront is AWS's global CDN with 600+ edge locations worldwide. It caches and delivers content from the nearest edge location to users, reducing latency. It also provides DDoS protection (Shield Standard), WAF integration, HTTPS termination, and Lambda@Edge for edge computing.

**Topics:**
- Origins, behaviors, and distributions
- Caching and TTLs
- Origin Access Control (OAC) for S3
- Custom headers for security
- Invalidations
- Cache policies and origin request policies
- WAF integration
- Lambda@Edge and CloudFront Functions

---

## Basic Examples

### CloudFront Distribution with Terraform

```hcl
# S3 Bucket for static assets
resource "aws_s3_bucket" "assets" {
  bucket = "myapp-assets-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Origin Access Control (OAC) — allows CloudFront to access private S3
resource "aws_cloudfront_origin_access_control" "s3" {
  name                              = "myapp-s3-oac"
  description                       = "OAC for S3 origin"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 bucket policy: allow only CloudFront OAC
resource "aws_s3_bucket_policy" "assets" {
  bucket = aws_s3_bucket.assets.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontOAC"
      Effect = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action   = "s3:GetObject"
      Resource = "${aws_s3_bucket.assets.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
        }
      }
    }]
  })
}

# ACM Certificate (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "cf" {
  provider          = aws.us_east_1   # CloudFront requires us-east-1
  domain_name       = "myapp.com"
  subject_alternative_names = ["www.myapp.com", "*.myapp.com"]
  validation_method = "DNS"

  lifecycle { create_before_destroy = true }
}

# Cache Policy
resource "aws_cloudfront_cache_policy" "static" {
  name        = "myapp-static-cache-policy"
  min_ttl     = 0
  default_ttl = 86400    # 1 day
  max_ttl     = 31536000  # 1 year

  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config  { cookie_behavior  = "none" }
    headers_config  { header_behavior  = "none" }
    query_strings_config { query_string_behavior = "none" }
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "MyApp CDN"
  default_root_object = "index.html"
  aliases             = ["myapp.com", "www.myapp.com"]

  # Origin 1: S3 for static assets
  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "s3-assets"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
  }

  # Origin 2: ALB for API
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }

    custom_header {
      name  = "X-CloudFront-Secret"
      value = var.cloudfront_secret   # ALB validates this header — blocks direct access
    }
  }

  # Behavior 1: /api/* → ALB (no caching)
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "alb-api"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.disabled.id   # caching disabled
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer.id

    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }

  # Behavior 2: /static/* → S3 (long cache)
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    target_origin_id       = "s3-assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = aws_cloudfront_cache_policy.static.id
    compress               = true
  }

  # Default behavior: SPA (all other paths → S3/index.html)
  default_cache_behavior {
    target_origin_id       = "s3-assets"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = aws_cloudfront_cache_policy.static.id
    compress               = true
  }

  # Error pages: route 404/403 to index.html (SPA routing)
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  # SSL certificate
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cf.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"  # or "whitelist"/"blacklist" with locations
    }
  }

  # Security headers via response headers policy
  # (or use CloudFront Functions for more control)

  tags = { Name = "myapp-cf" }
}

# Route 53: point domain to CloudFront
resource "aws_route53_record" "cf_alias" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "myapp.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = "Z2FDTNDATAQYW2"  # CloudFront hosted zone ID (always this)
    evaluate_target_health = false
  }
}
```

### Cache Invalidation

```bash
# Invalidate specific paths after deploy
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"     # all paths

# Targeted invalidation (faster, cheaper)
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/index.html" "/app.*.js" "/app.*.css"

# In CI/CD pipeline after deploy
DIST_ID=$(aws cloudfront list-distributions \
  --query 'DistributionList.Items[?Comment==`MyApp CDN`].Id' \
  --output text)
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

### CloudFront Functions (Edge Logic)

```javascript
// CloudFront Function: add security headers to all responses
// Runs at edge — very fast, no cold start
function handler(event) {
  var response = event.response;
  var headers  = response.headers;

  headers["strict-transport-security"] = { value: "max-age=63072000; includeSubDomains; preload" };
  headers["x-content-type-options"]    = { value: "nosniff" };
  headers["x-frame-options"]           = { value: "DENY" };
  headers["x-xss-protection"]          = { value: "1; mode=block" };
  headers["referrer-policy"]           = { value: "strict-origin-when-cross-origin" };
  headers["content-security-policy"]   = {
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  };

  return response;
}

// CloudFront Function: URL rewrite for SPA (client-side routing)
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // If the URI has a file extension, don't rewrite
  if (uri.match(/\.[a-zA-Z0-9]+$/)) {
    return request;
  }

  // Rewrite to index.html for SPA routes
  if (!uri.includes(".")) {
    request.uri = "/index.html";
  }

  return request;
}
```

---

## Interview Preparation

**Q1: How does CloudFront caching work and what is cache invalidation?**
A: CloudFront caches responses at edge locations. On first request to an edge, CloudFront forwards to origin and caches the response. Subsequent requests from that region are served from cache until TTL expires. Cache key: by default, just the URL path. You can include query strings, headers, and cookies in the cache key (increases cache variations but reduces hit rate). TTL: controlled by `Cache-Control: max-age=N` header from origin, or by CloudFront cache policy (min/default/max TTL). Cache invalidation: push a request to CloudFront to remove specific cached paths before TTL expires. Cost: $0.005 per invalidation request for first 1,000 paths/month, free after. Use `/*` for full invalidation after deployments. Better strategy: use content hashing in filenames (`app.a1b2c3d4.js`) so new deployments never conflict with cached files — only invalidate `index.html`.

**Q2: What is Origin Access Control and why is it important?**
A: Without OAC, if you have an S3 bucket serving content, you must make it public — anyone who discovers the S3 URL can bypass CloudFront, access raw content without security headers or WAF, and incur direct S3 costs. Origin Access Control (OAC) is an identity that CloudFront uses to sign requests to your private S3 bucket. The bucket policy allows only CloudFront's OAC to access it — the bucket stays private. Benefits: S3 bucket never directly accessible, WAF and security headers always applied, CloudFront handles HTTPS (S3 website endpoints don't support HTTPS), lower cost (CloudFront pricing often cheaper than S3 direct at scale). OAC replaced the older Origin Access Identity (OAI).

**Q3: What is the difference between Lambda@Edge and CloudFront Functions?**
A: CloudFront Functions: runs at all 600+ edge locations. Extremely fast (<1ms). Limited: JavaScript only, 10ms max execution time, 2MB package size, no network calls, no file system. Supports viewer request/response events. Best for: URL rewrites, header manipulation, A/B testing, authentication token validation. Lambda@Edge: runs at ~30 regional edge locations (fewer than CF Functions). Can use any Lambda runtime. Up to 5 seconds (viewer) or 30 seconds (origin) execution time. Can make network calls (to databases, APIs). Supports all four event types (viewer request/response, origin request/response). Best for: dynamic auth, complex routing logic, fetching from external APIs. Cost: CF Functions are ~6x cheaper than Lambda@Edge for the same operation.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Create a CloudFront distribution with an S3 origin.
2. Set up OAC so the S3 bucket is private.
3. Add `index.html` as the default root object.
4. Enable HTTPS with an ACM certificate.
5. Add a custom domain (CNAME or Alias record in Route 53).
6. Invalidate the cache after deploying new files.
7. Check cache headers: `curl -I https://myapp.com/index.html`.
8. Configure a 403 → index.html error response for SPA routing.
9. Enable CloudFront access logs.
10. Check the `X-Cache` response header (Hit/Miss from CloudFront).

### Intermediate (10 Tasks)
1. Add an ALB origin for API routes (`/api/*`).
2. Set cache TTL=0 for API routes (passthrough, no caching).
3. Add `X-CloudFront-Secret` header to ALB requests.
4. Configure ALB listener rule to deny requests without the secret.
5. Add a CloudFront Function to add security headers.
6. Set up geo-restriction to block specific countries.
7. Integrate AWS WAF with CloudFront.
8. Use content hashing in filenames to eliminate full invalidations.
9. Set up CloudFront for a Next.js app with API routes.
10. Add multiple cache behaviors for different content types.

### Advanced (10 Tasks)
1. Implement Lambda@Edge for JWT validation at the edge.
2. Set up real-time CloudFront logs to Kinesis Data Firehose.
3. Build a multi-origin CloudFront with A/B testing via CF Functions.
4. Implement CloudFront signed URLs for paid content downloads.
5. Set up CloudFront signed cookies for streaming video access.
6. Create a CloudFront distribution with Terraform including all behaviors.
7. Implement edge-side rendering with Lambda@Edge.
8. Use CloudFront for DDoS mitigation with WAF rate limiting.
9. Set up CloudFront for WebSocket connections.
10. Build a multi-region active-active CDN with Route 53 latency routing.

---

## Self Assessment
1. What is a CDN?
2. What is an edge location?
3. What is a CloudFront origin?
4. What is a cache behavior?
5. What is Origin Access Control?
6. What is cache invalidation?
7. What is a CloudFront cache policy?
8. What is the difference between CloudFront Functions and Lambda@Edge?
9. Why must ACM certificates for CloudFront be in us-east-1?
10. What is the CloudFront hosted zone ID for Alias records?

---

## Cheat Sheet

```bash
# CloudFront CLI
aws cloudfront list-distributions
aws cloudfront get-distribution --id E1234567890ABC
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
aws cloudfront get-invalidation --distribution-id E1234567890ABC --id I1234567890ABC

# Check cache hit/miss
curl -sI https://myapp.com/index.html | grep -i "x-cache\|age\|cache-control"

# CloudFront domain is always *.cloudfront.net
# Zone ID for Alias records is always: Z2FDTNDATAQYW2
```

```
CloudFront cache decision flow:
  1. Is the object in cache? → Cache HIT (serve from edge)
  2. Is the TTL expired?     → Cache MISS (fetch from origin)
  3. Is the object in cache key? → Must match URL + configured headers/cookies/qs

Cache-Control headers from origin:
  Cache-Control: max-age=31536000, immutable  → cache for 1 year (static assets with hash)
  Cache-Control: no-cache                      → always revalidate with origin
  Cache-Control: no-store                      → never cache
  Cache-Control: max-age=300                   → cache for 5 minutes

Pricing:
  HTTP requests: $0.0075–$0.01 per 10,000 (varies by region)
  Data transfer: $0.0075–$0.12/GB (cheaper than direct S3/EC2 transfer)
  Cache invalidations: First 1,000 paths/mo free, then $0.005/path
  Lambda@Edge: $0.60/M requests + compute time
  CF Functions: $0.10/M invocations
```
