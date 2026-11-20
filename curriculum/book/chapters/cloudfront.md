# CloudFront: Content Delivery

> [!GOALS]
> - Explain what a content delivery network (CDN) does and why it makes sites faster, cheaper and safer.
> - Understand CloudFront's parts: **distributions**, **origins**, **behaviours** and **edge locations**.
> - Design **cache keys** and **TTLs** that give high hit ratios without serving the wrong content.
> - Serve private S3 content with **Origin Access Control**, and use signed URLs where needed.
> - Deploy front-end applications with versioned assets, invalidations and security headers.
> - Use edge security: TLS, WAF, geo restrictions and protection against attacks.

## Why this matters

Light in fibre travels about 200 kilometres per millisecond. A user in Sydney loading a page from a server in London waits around 250 milliseconds for every round trip, before the server does any work — and a page needs many round trips. Serving every image, script and API request from one region makes the site slow for most of the world and puts every request's load on your servers.

A **content delivery network (CDN)** fixes this by keeping copies of content in hundreds of **edge locations** close to users. **Amazon CloudFront** is AWS's CDN. Static files — images, JavaScript, CSS, video — are served from the edge in a few milliseconds; your origin handles only cache misses. CloudFront also terminates TLS near users, absorbs traffic spikes and attacks, and is the standard way to serve private S3 content and front-end applications ({{ch:s3}}, {{ch:frontend-performance}}).

Getting caching right is subtle: cache too little and you gain nothing; cache the wrong things and users see each other's data. This chapter shows how to reason about it.

## The simple idea

Imagine a popular bakery with one shop in the city centre. Queues stretch around the block, and customers from the suburbs travel for an hour. So the bakery opens small kiosks in every neighbourhood, each stocked with the most popular breads. Most customers buy from their local kiosk in a minute; only when a kiosk runs out does it send for more from the main bakery.

CloudFront's edge locations are the kiosks; your origin (S3 bucket, load balancer) is the main bakery.

> [!ANALOGY]
> A CDN is like a bakery opening kiosks in every neighbourhood: most customers are served nearby in seconds, and only when a kiosk runs out does it fetch more from the main bakery.
>
> **Where the analogy breaks:** every loaf of bread is the same, so any kiosk can sell any customer any loaf. Web responses are often **personal** — a basket, an account page. If the kiosk keeps one customer's personal response and hands it to the next customer, you have a data leak. The CDN must be told exactly what may be shared, and what makes two requests "the same".

## The proper definition and key words

**Amazon CloudFront** is a content delivery network that serves content from a global network of edge locations, caching responses from your **origins** according to rules in a **distribution**.

Key words:

- **Distribution** — a CloudFront configuration with its own domain name (`d111abcdef8.cloudfront.net`) and your custom domains.
- **Origin** — where CloudFront fetches content from: an S3 bucket, a load balancer, an API, any HTTP server.
- **Edge location** — a site where CloudFront caches and serves content; **regional edge caches** sit between edges and origins.
- **Cache behaviour** — rules for a path pattern (`/static/*`, `/api/*`): which origin, which cache policy, which methods.
- **Cache key** — the parts of a request that identify a cached object: path, and chosen query strings, headers and cookies.
- **Cache policy / origin request policy** — what forms the cache key / what is forwarded to the origin.
- **TTL** — how long an object stays cached, from `Cache-Control` headers within the policy's limits.
- **Hit ratio** — the share of requests served from cache.
- **Invalidation** — removing objects from the cache before their TTL ends.
- **Origin Access Control (OAC)** — lets CloudFront read a private S3 bucket.
- **Signed URL / signed cookie** — time-limited access to private content through CloudFront.

## How CloudFront works

### Level 1 — Distributions, origins and behaviours

```text
 user (Sydney) ──► edge location Sydney ──hit──► response in ~10 ms
                        │ miss
                        ▼
                  regional edge cache ──miss──► origin
                                                 ├─ /static/*  → S3 bucket (private, OAC)
                                                 ├─ /api/*     → application load balancer
                                                 └─ default    → S3 (single-page app's index.html)
```

One distribution can route different **paths** to different **origins** with different caching:

| Behaviour | Origin | Caching |
|---|---|---|
| `/assets/*` | S3 | Cache for a year (files have content hashes in their names) |
| `/api/*` | Load balancer | No caching by default; forward needed headers and cookies; all HTTP methods |
| `/images/*` | S3 or an image service | Cache for days; maybe vary by `?width` |
| Default (`*`) | S3 | Short TTL for `index.html` |

Even uncached API traffic benefits: TLS connections end at the nearby edge, and CloudFront keeps warm, reused connections to the origin over AWS's network.

### Level 2 — The cache key decides everything

Two requests share a cached response only if their **cache keys** are equal. By default the key is the host and path. Each query string, header or cookie you add to the key multiplies the number of variants — and divides the hit ratio. This simulation sends 10,000 product-page views through edge caches with different cache-key policies:

```ts
// An edge cache in front of an origin: the cache key decides how often the origin is hit.
type Req = { path: string; query: Record<string, string>; cookies: Record<string, string>; t: number };
type Policy = { name: string; queryKeys: "all" | string[]; cookies: "all" | "none"; ttlSeconds: number };

function cacheKey(req: Req, p: Policy): string {
  const q = Object.entries(req.query)
    .filter(([k]) => p.queryKeys === "all" || p.queryKeys.includes(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`).join("&");
  const c = p.cookies === "all" ? Object.entries(req.cookies).map(([k, v]) => `${k}=${v}`).join(";") : "";
  return `${req.path}?${q}#${c}`;
}

function simulate(requests: Req[], p: Policy) {
  const cache = new Map<string, number>();     // key -> time stored
  let originHits = 0;
  for (const req of requests) {
    const key = cacheKey(req, p);
    const stored = cache.get(key);
    if (stored !== undefined && req.t - stored < p.ttlSeconds) continue;   // HIT
    originHits++;                                                          // MISS: fetch from origin
    cache.set(key, req.t);
  }
  const hitRatio = 1 - originHits / requests.length;
  console.log(`${p.name.padEnd(42)} origin requests ${String(originHits).padStart(5)}   hit ratio ${(hitRatio * 100).toFixed(1)}%`);
}

// 10,000 product-page views over one hour: 50 products, marketing tags, session cookies, a currency choice
let seed = 3;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const requests: Req[] = Array.from({ length: 10_000 }, (_, i) => {
  const query: Record<string, string> = { currency: random() < 0.8 ? "GBP" : "EUR" };
  if (random() < 0.4) query.utm_source = ["newsletter", "google", "instagram"][Math.floor(random() * 3)]!;
  if (random() < 0.3) query.fbclid = Math.floor(random() * 1e9).toString(36);
  return {
    path: `/products/${Math.floor(random() * 50)}`,
    query,
    cookies: { session: `s${Math.floor(random() * 3000)}` },
    t: Math.floor((i / 10_000) * 3600),
  };
});

simulate(requests, { name: "forward everything (all query + cookies)", queryKeys: "all", cookies: "all", ttlSeconds: 300 });
simulate(requests, { name: "all query strings, no cookies", queryKeys: "all", cookies: "none", ttlSeconds: 300 });
simulate(requests, { name: "only ?currency, no cookies", queryKeys: ["currency"], cookies: "none", ttlSeconds: 300 });
simulate(requests, { name: "only ?currency, no cookies, TTL 1 hour", queryKeys: ["currency"], cookies: "none", ttlSeconds: 3600 });
```

**Output:**

```text
forward everything (all query + cookies)   origin requests  9994   hit ratio 0.1%
all query strings, no cookies              origin requests  5458   hit ratio 45.4%
only ?currency, no cookies                 origin requests  1072   hit ratio 89.3%
only ?currency, no cookies, TTL 1 hour     origin requests   100   hit ratio 99.0%
```

- **Including cookies** makes almost every request unique — each session cookie is a separate cache entry — so the CDN does nothing at all (0.1% hits).
- **All query strings** are still bad: marketing parameters like `utm_source` and `fbclid` change nothing on the page but split the cache.
- Keeping **only the parameter that changes the response** (`currency`) gives 89% hits. With a longer TTL, the origin sees just 100 requests: 50 products × 2 currencies, once each.
- So: put in the cache key **only what changes the response**. If a page depends on who the user is, it should not be cached at the edge — or the personal part should come from a separate, uncached API call.
- Forwarding something to the origin (origin request policy) is separate from caching on it (cache policy): the origin can receive a header that is not part of the key — but then the origin must not vary its response by it.

### Level 2 — TTLs and Cache-Control

CloudFront honours the origin's `Cache-Control` headers within the cache policy's minimum and maximum TTLs ({{ch:caching}}):

```text
Cache-Control: public, max-age=31536000, immutable   # /assets/app.3f9c2e1a.js — content hash in the name
Cache-Control: public, max-age=60                    # /index.html — must update quickly after a deploy
Cache-Control: public, max-age=300, s-maxage=3600    # browsers 5 minutes, CDN 1 hour
Cache-Control: private, no-store                     # /api/account — never cached anywhere
```

- **Fingerprinted assets** (a hash of the content in the file name, produced by build tools) can be cached for a year: a new version has a new name, so nothing stale is ever served ({{ch:frontend-performance}}).
- **HTML entry points** get short TTLs, so new deployments appear quickly.
- **Personal or sensitive responses** must be `private, no-store` — and API behaviours should use a policy that does not cache by default.

## Serving content securely

### Level 3 — Private S3 origins with Origin Access Control

The bucket stays **private**; only the CloudFront distribution may read it:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontRead",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::cornershop-web/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::111122223333:distribution/E2ABCDEF123456" } }
  }]
}
```

The condition limits access to **this one distribution**, so nobody can read the bucket by creating their own distribution. Users cannot bypass CloudFront to reach the bucket directly, and Block Public Access stays on ({{ch:s3}}).

### Level 3 — Private content for some users

For content only certain users may see — purchased downloads, private videos — CloudFront **signed URLs** or **signed cookies** grant time-limited access, signed by your API with a private key whose public key is registered with the distribution. They work like S3 pre-signed URLs but keep the benefits of edge caching. Alternatively, S3 pre-signed URLs can be used directly when caching is not needed.

### Level 3 — HTTPS, domains and headers

- Use **your own domain** (`www.cornershop.example`) with a certificate from ACM — certificates for CloudFront must be in **us-east-1** — and an alias record in Route 53 ({{ch:route53}}, {{ch:tls-ssl}}).
- **Redirect HTTP to HTTPS** and set a modern TLS security policy.
- **Response headers policies** add security headers at the edge: `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy` ({{ch:application-security}}).
- **Lock the origin**: allow the load balancer to accept traffic only from CloudFront (the CloudFront managed prefix list in its security group, plus a secret header checked by the load balancer, or a VPC origin), so attackers cannot bypass the edge protections.

### Level 4 — Edge security: WAF and DDoS protection

- **AWS Shield Standard** protects all distributions against common network-level DDoS attacks at no extra cost.
- **AWS WAF** on the distribution filters requests before they reach your origin: managed rule sets for common attacks (SQL injection, known bad inputs), **rate-based rules** limiting requests per IP address ({{ch:rate-limiting}}), bot control, and geo blocking.
- **Geo restrictions** allow or block countries, for licensing or legal reasons.

## Deploying front ends

### Level 4 — A safe deployment flow for a single-page app

```bash
# fragment
npm run build                                       # dist/ with hashed asset names and index.html
aws s3 sync dist/assets s3://cornershop-web/assets \
  --cache-control "public, max-age=31536000, immutable"
aws s3 cp dist/index.html s3://cornershop-web/index.html \
  --cache-control "public, max-age=60"
aws cloudfront create-invalidation --distribution-id E2ABCDEF123456 --paths "/index.html"
```

- Upload **assets first**, then `index.html`, so the new HTML never refers to files that are not there yet. Keep old assets for a while — users with the old page open still request them.
- Invalidate only what is not fingerprinted (usually `index.html`). Invalidating `/*` on every deploy works but throws away the whole cache; invalidations beyond a monthly free allowance cost money.
- Single-page apps with client-side routing need a rule returning `index.html` for unknown paths (a CloudFront Function or custom error response).
- **Edge functions**: **CloudFront Functions** (tiny, very fast JavaScript for header rewrites, redirects, URL normalisation) and **Lambda@Edge** (more powerful, slower) run code at the edge.

### Level 4 — Measuring and tuning

- Watch **cache hit ratio**, **origin latency**, and **4xx/5xx error rates** in CloudFront metrics and reports; enable standard or real-time logs for detail ({{ch:cloudwatch}}).
- Normalise cache keys (lower-case, sorted query strings, removed tracking parameters) with policies or CloudFront Functions.
- **Origin Shield** adds an extra central cache layer, reducing origin load further for global traffic.
- Data transfer from CloudFront to the internet is usually cheaper than from EC2 or S3 directly, and transfer from AWS origins to CloudFront is free — a CDN often lowers the bill as well as latency ({{ch:cost-optimization}}).

## From beginner to enterprise

**Level 1–2 — first distributions.** A distribution for a private S3 bucket with OAC; a custom domain and ACM certificate; HTTPS redirect; long TTLs for fingerprinted assets, short for HTML.

**Level 3 — application delivery.** Several behaviours for static files and APIs; cache policies with minimal keys; security headers; origins locked to CloudFront; signed URLs for private content.

**Level 4 — production edge.** WAF with managed and rate-based rules; safe deployment order and targeted invalidations; edge functions for redirects and normalisation; hit-ratio monitoring.

**Level 5 — senior practice.** Designing cacheable APIs and pages (separating personal from shared data); cost and performance tuning with Origin Shield; edge-based A/B testing and redirects.

**Level 6 — enterprises.** Central edge security policies (Firewall Manager), multi-origin failover, global delivery strategies for video and large downloads.

## Real-world use cases

### The shop front end

- **Design**: React build in a private bucket; `/assets/*` cached for a year; `index.html` cached for a minute and invalidated on deploy; `/api/*` to the ALB, uncached, with WAF rate limiting; security headers from a response headers policy.

### The leaking basket

- **What happened**: a developer cached the `/api/basket` route for 60 seconds to reduce load, with a cache key without the session cookie. Customers briefly saw other people's baskets.
- **Fix**: API behaviour caching disabled; responses marked `private, no-store`; a test checking that personal routes send no-store headers; shared product data moved to a separately cached endpoint.

## Common mistakes

### Beginner: public S3 bucket behind CloudFront

**Fix:** private bucket with OAC and a source-ARN condition.

### Beginner: forwarding all cookies and query strings

**Consequence:** almost no cache hits. **Fix:** minimal cache keys.

### Beginner: long TTLs on `index.html`

**Consequence:** users stuck on old versions after deploys. **Fix:** short TTL plus invalidation.

### Intermediate: caching personalised responses

**Consequence:** users see each other's data. **Fix:** no caching for personal routes; `private, no-store`.

### Intermediate: origin reachable directly

**Consequence:** attackers bypass WAF and caching. **Fix:** lock the origin to CloudFront.

### Production: `/*` invalidation on every deploy

**Consequence:** cold caches and origin spikes after every release. **Fix:** fingerprinted assets, targeted invalidations.

### Production: deleting old assets immediately

**Consequence:** errors for users with the old page open. **Fix:** keep previous assets for a while.

## Debugging and troubleshooting

- **Check the response headers**: `x-cache: Hit from cloudfront` or `Miss from cloudfront`, `age` (seconds in cache), `cache-control`, and `x-amz-cf-pop` (which edge answered).
- **Stale content**: check the TTL and `Cache-Control` the origin sent; invalidate the path; make sure assets are fingerprinted.
- **Low hit ratio**: look at the cache key — cookies, headers or query strings that vary per user.
- **403 from S3 origin**: the OAC configuration or the bucket policy's source ARN; or the object does not exist (S3 returns 403 for missing objects without list permission).
- **502/504 errors**: the origin is unreachable, slow, or has a TLS certificate that does not match the origin domain name.
- **CORS problems**: forward the `Origin` header and include it in the cache key when responses vary by origin.

## Security summary

- **Private origins**: OAC for S3, origins locked to CloudFront for load balancers.
- **HTTPS everywhere** with modern TLS policies and HSTS.
- **Never cache personal data**; `private, no-store` on sensitive responses.
- **WAF** with managed rules and rate limiting; Shield for DDoS.
- **Security headers** at the edge.
- **Signed URLs or cookies** for private content, with short lifetimes and protected signing keys.

## How a senior engineer thinks about this

- **Cache what is shared, nothing that is personal.**
- **The cache key is a design decision.** Every element must change the response.
- **Make content immutable.** Fingerprinted files make long caching safe.
- **The edge is a security layer.** WAF, TLS and headers before traffic reaches you.
- **Measure the hit ratio.** It tells you whether the CDN is working.

## Exercises

### Exercise 1 — Design the behaviours

**Objective:** practise behaviours and caching.
**What to do:** design cache behaviours for a site with: a React app (hashed assets and `index.html`), product images resized by `?width=` (three sizes), a public product API that changes every few minutes, and a private account API.

<details>
<summary>Show the solution</summary>

- `/assets/*` → S3, cache key path only, TTL one year, `immutable`.
- `/images/*` → image origin, cache key path + `width` query string, TTL days.
- `/api/products*` → ALB, cache key path + needed query parameters (page, category), TTL 60–300 seconds, no cookies.
- `/api/account*` → ALB, **caching disabled**, forward cookies or `Authorization`, `private, no-store` from the origin, all methods.
- Default → S3 `index.html`, TTL 60 seconds, invalidated on deploy; SPA fallback for client routes.

</details>

### Exercise 2 — Explain the low hit ratio

**Objective:** practise cache-key analysis.
**What to do:** a distribution serving product images shows a 12% hit ratio. Its cache policy includes all query strings and the `User-Agent` header. What is wrong?

<details>
<summary>Show the solution</summary>

`User-Agent` has thousands of different values (browser, version, device), so each image is cached separately for each one. All query strings add marketing and tracking parameters as further variants. Fix: remove `User-Agent` from the cache key (if different formats are needed, use a small normalised header such as CloudFront's device-type headers, or format negotiation on `Accept` with few values), and include only the query parameters that change the image (`width`).

</details>

### Exercise 3 — Production scenario: the slow global launch

**Objective:** practise performance design.
**The scenario:** a shop hosted in `eu-west-2` launches in Australia. Australian users report slow pages: each page load takes four seconds, and the origin's CPU doubled. Images, scripts and the API are all served directly from the load balancer. What do you change?

<details>
<summary>Show the solution</summary>

1. **Put CloudFront in front** with a custom domain and certificate.
2. **Static assets** to S3 with fingerprinted names and long TTLs, served through CloudFront — Australian users get them from Sydney edges.
3. **Images** cached at the edge with a minimal cache key; consider an image resizing service.
4. **API**: route through CloudFront for TLS termination near users and connection reuse; cache shared, public responses (product lists) briefly; keep personal endpoints uncached.
5. **Origin protection**: lock the ALB to CloudFront; WAF rate limits.
6. **Measure** hit ratio, origin load and user-perceived latency; if API latency is still too high for Australia, consider read replicas or a second region later.

</details>

## Summary

A **CDN** serves content from **edge locations** near users, cutting latency, origin load and often cost. **CloudFront** **distributions** route request **paths** through **cache behaviours** to **origins** — S3 buckets, load balancers, any HTTP server — and even uncached traffic gains from TLS termination near users and reused origin connections.

The **cache key** decides whether two requests share a cached response: include only the query strings, headers and cookies that change the response, because each extra element splits the cache and cookies can destroy it entirely. **TTLs** come from `Cache-Control` within policy limits: fingerprinted assets for a year, HTML briefly, personal or sensitive responses `private, no-store` and never cached at the edge.

Keep S3 origins private with **Origin Access Control** restricted to the distribution, lock load balancer origins to CloudFront, use **signed URLs or cookies** for private content, serve your domain over HTTPS with ACM certificates in us-east-1, add security headers, and protect the edge with **WAF** and Shield. Deploy front ends by uploading assets before HTML, keeping old assets, and invalidating only non-fingerprinted paths; watch the **hit ratio**.

## Key terms

- **CDN** — A content delivery network serving content from locations near users.
- **CloudFront** — AWS's content delivery network.
- **Distribution** — A CloudFront configuration with its domain names, origins and behaviours.
- **Origin** — The server or bucket CloudFront fetches content from.
- **Edge location** — A CloudFront site that caches and serves content.
- **Regional edge cache** — A larger intermediate cache between edge locations and origins.
- **Cache behaviour** — Routing and caching rules for a path pattern.
- **Cache key** — The request attributes that identify a cached object.
- **Cache policy** — The settings that define the cache key and TTL limits.
- **Origin request policy** — The settings that define what is forwarded to the origin.
- **Hit ratio** — The share of requests served from cache.
- **Fingerprinted asset** — A file whose name includes a hash of its content.
- **Invalidation** — Removing objects from the CDN cache before they expire.
- **Origin Access Control** — A mechanism letting CloudFront read a private S3 bucket.
- **Signed URL / signed cookie** — Time-limited permission to access private content through CloudFront.
- **CloudFront Function** — Lightweight JavaScript that runs at edge locations.
- **Lambda@Edge** — Lambda functions that run in response to CloudFront events.
- **AWS WAF** — A web application firewall that filters HTTP requests.
- **AWS Shield** — AWS's DDoS protection service.
- **Origin Shield** — An extra caching layer that reduces requests to the origin.

## What comes next

Behind CloudFront, requests for dynamic content reach your application servers — usually through a load balancer. The next chapter, {{ch:elb}}, covers Elastic Load Balancing: application and network load balancers, listeners, target groups, health checks, TLS termination, routing rules, sticky sessions and connection draining.
