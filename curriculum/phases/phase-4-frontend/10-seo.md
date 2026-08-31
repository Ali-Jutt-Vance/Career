# Phase 4 — Chapter 10: SEO

---

## Chapter Overview

SEO (Search Engine Optimization) ensures your web application is discoverable and ranks well in search results. Modern SEO requires technical correctness, content quality, and performance — all of which overlap with good engineering practice.

**Topics:**
- Crawlability and indexability
- Meta tags and Open Graph
- Structured data (JSON-LD)
- Core Web Vitals as ranking signals
- SSR/SSG vs. CSR for SEO
- Sitemaps and robots.txt
- Internationalization (hreflang)
- Next.js Metadata API

---

## Beginner Theory

### How Search Engines Work

```
1. Crawl:   Googlebot discovers URLs via links, sitemaps
2. Index:   Google parses HTML, executes JavaScript, stores content
3. Rank:    Algorithm assigns relevance score (content + links + signals)

Key facts for engineers:
  - Google renders JavaScript (Googlebot runs Chrome 99+) but it's slower
  - Server-rendered HTML is indexed faster and more reliably than CSR
  - Page Experience signals (Core Web Vitals) are ranking factors since 2021
  - Mobile-first indexing — Google uses your mobile version to index
  - Duplicate content: canonicalize with <link rel="canonical">
```

---

## Basic Examples

### HTML Meta Tags

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Primary SEO tags -->
  <title>MacBook Pro 16-inch Review 2025 — TechReview</title>  <!-- 50-60 chars -->
  <meta name="description" content="Detailed hands-on review of the MacBook Pro 16-inch M4. Performance benchmarks, battery life, display quality, and who should buy it." />  <!-- 150-160 chars -->

  <!-- Canonical URL — prevents duplicate content penalties -->
  <link rel="canonical" href="https://techreview.com/reviews/macbook-pro-16" />

  <!-- Robots directives -->
  <meta name="robots" content="index, follow" />           <!-- default -->
  <meta name="robots" content="noindex, nofollow" />       <!-- staging/admin pages -->
  <meta name="robots" content="index, nofollow, max-snippet:200" />

  <!-- Open Graph (Facebook, LinkedIn, Slack previews) -->
  <meta property="og:type"        content="article" />
  <meta property="og:url"         content="https://techreview.com/reviews/macbook-pro-16" />
  <meta property="og:title"       content="MacBook Pro 16-inch Review 2025" />
  <meta property="og:description" content="Detailed hands-on review with benchmarks." />
  <meta property="og:image"       content="https://techreview.com/images/mbp16-og.jpg" />  <!-- 1200×630px -->
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name"   content="TechReview" />
  <meta property="og:locale"      content="en_US" />

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:site"        content="@TechReview" />
  <meta name="twitter:title"       content="MacBook Pro 16-inch Review 2025" />
  <meta name="twitter:description" content="Detailed hands-on review with benchmarks." />
  <meta name="twitter:image"       content="https://techreview.com/images/mbp16-og.jpg" />
</head>
```

### Structured Data (JSON-LD)

```html
<!-- JSON-LD: machine-readable structured data for rich snippets in search -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Review",
  "headline": "MacBook Pro 16-inch Review 2025",
  "datePublished": "2025-01-15",
  "dateModified":  "2025-06-01",
  "author": {
    "@type": "Person",
    "name":  "Alice Smith",
    "url":   "https://techreview.com/authors/alice-smith"
  },
  "publisher": {
    "@type":  "Organization",
    "name":   "TechReview",
    "logo":   { "@type": "ImageObject", "url": "https://techreview.com/logo.png" }
  },
  "itemReviewed": {
    "@type": "Product",
    "name":  "Apple MacBook Pro 16-inch M4",
    "brand": { "@type": "Brand", "name": "Apple" }
  },
  "reviewRating": {
    "@type":       "Rating",
    "ratingValue": "4.5",
    "bestRating":  "5"
  },
  "description": "Detailed hands-on review of the MacBook Pro 16-inch M4.",
  "image": "https://techreview.com/images/mbp16.jpg"
}
</script>

<!-- Product schema (e-commerce) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type":    "Product",
  "name":     "Wireless Headphones Pro",
  "image":    ["https://shop.com/images/headphones.jpg"],
  "description": "Premium noise-canceling wireless headphones.",
  "sku":      "WHP-2025",
  "brand":    { "@type": "Brand", "name": "AudioPro" },
  "offers": {
    "@type":         "Offer",
    "url":           "https://shop.com/products/headphones-pro",
    "priceCurrency": "USD",
    "price":         "299.00",
    "availability":  "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type":       "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "2341"
  }
}
</script>

<!-- Breadcrumb schema -->
<script type="application/ld+json">
{
  "@context":        "https://schema.org",
  "@type":           "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home",       "item": "https://shop.com/" },
    { "@type": "ListItem", "position": 2, "name": "Electronics", "item": "https://shop.com/electronics" },
    { "@type": "ListItem", "position": 3, "name": "Headphones",  "item": "https://shop.com/electronics/headphones" }
  ]
}
</script>
```

---

## Intermediate Concepts

### Core Web Vitals as a Ranking Signal

Google's "Page Experience" update (2021) made three specific performance metrics — collectively called Core Web Vitals — an actual ranking factor, not just a nice-to-have for users. Each measures a different kind of user-perceived slowness:

```
LCP (Largest Contentful Paint): time until the biggest visible element
  (usually a hero image or heading) finishes rendering.
  Good: < 2.5s   Needs improvement: 2.5-4s   Poor: > 4s

INP (Interaction to Next Paint, replaced FID in March 2024):
  time between a user interaction (click, tap, key press) and the
  browser visually responding to it.
  Good: < 200ms   Needs improvement: 200-500ms   Poor: > 500ms

CLS (Cumulative Layout Shift): how much visible content unexpectedly
  moves around as the page loads (e.g., an ad loads and pushes text down).
  Good: < 0.1   Needs improvement: 0.1-0.25   Poor: > 0.25
```

Measuring real, field-collected Core Web Vitals (not just a lab score from Lighthouse) in a Next.js app:

```typescript
// app/layout.tsx — report real user metrics to your analytics endpoint
'use client';
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // metric.name is one of: LCP, INP, CLS, FCP, TTFB
    navigator.sendBeacon('/api/vitals', JSON.stringify({
      name:  metric.name,
      value: metric.value,
      id:    metric.id,
      page:  window.location.pathname
    }));
  });
  return null;
}
```

```typescript
// Common fix for a poor LCP score: the hero image wasn't prioritized
import Image from 'next/image';

// Bad — browser discovers this image late, after other resources
<img src="/hero.jpg" alt="Product hero" />

// Good — priority tells Next.js to preload this image immediately
<Image src="/hero.jpg" alt="Product hero" width={1200} height={600} priority />
```

The engineering takeaway: Core Web Vitals turn "make the site feel fast" from a vague UX goal into three concrete, measurable numbers that Google Search Console will show you per-page, ranked by how many real users had a poor experience.

### Internationalization for SEO (hreflang)

When a site serves the same content in multiple languages or to multiple regions (e.g., `/en/pricing`, `/fr/pricing`, `/de/pricing`), search engines need to know these pages are translations of each other — otherwise Google may treat them as duplicate content, or serve the wrong language version to a user's region. The `hreflang` annotation solves this by explicitly mapping every language/region variant of a page to every other variant.

```html
<!-- On https://myapp.com/en/pricing -->
<link rel="alternate" hreflang="en"    href="https://myapp.com/en/pricing" />
<link rel="alternate" hreflang="fr"    href="https://myapp.com/fr/pricing" />
<link rel="alternate" hreflang="de"    href="https://myapp.com/de/pricing" />
<link rel="alternate" hreflang="en-GB" href="https://myapp.com/en-gb/pricing" />
<!-- x-default: shown to users whose language doesn't match any listed variant -->
<link rel="alternate" hreflang="x-default" href="https://myapp.com/en/pricing" />
```

```typescript
// app/[locale]/pricing/page.tsx — generating hreflang via Next.js Metadata API
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  return {
    alternates: {
      canonical: `https://myapp.com/${params.locale}/pricing`,
      languages: {
        en:          'https://myapp.com/en/pricing',
        fr:          'https://myapp.com/fr/pricing',
        de:          'https://myapp.com/de/pricing',
        'x-default': 'https://myapp.com/en/pricing'
      }
    }
  };
}
```

A common mistake: adding `hreflang` to only ONE page in the set. The tag must be reciprocal — every language variant must list every other variant (including itself), or search engines will ignore the annotation entirely.

### Next.js Metadata API

```typescript
// app/layout.tsx — base metadata (inherited by all pages)
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://myapp.com"),
  title: {
    template: "%s | MyApp",
    default:  "MyApp — Build Better Products"
  },
  description: "The platform for modern product teams.",
  openGraph: {
    type:      "website",
    siteName:  "MyApp",
    locale:    "en_US"
  },
  twitter: {
    card: "summary_large_image",
    site: "@myapp"
  },
  robots: {
    index:  true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": 200 }
  }
};

// app/blog/[slug]/page.tsx — dynamic page metadata
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post) return { title: "Post Not Found" };

  return {
    title:       post.title,
    description: post.excerpt,
    authors:     [{ name: post.author.name }],
    openGraph: {
      type:        "article",
      title:       post.title,
      description: post.excerpt,
      images:      [{ url: post.coverImage, width: 1200, height: 630, alt: post.title }],
      publishedTime:  post.publishedAt.toISOString(),
      modifiedTime:   post.updatedAt.toISOString(),
      authors:        [post.author.name]
    },
    twitter: {
      card:        "summary_large_image",
      title:       post.title,
      description: post.excerpt,
      images:      [post.coverImage]
    },
    alternates: {
      canonical:   `https://myapp.com/blog/${params.slug}`,
      languages:   { "fr": `/fr/blog/${params.slug}`, "de": `/de/blog/${params.slug}` }
    }
  };
}
```

### Sitemap and Robots.txt

```typescript
// app/sitemap.ts — dynamically generated sitemap
import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://myapp.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl,            lastModified: new Date(), changeFrequency: "weekly",  priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/blog`,  lastModified: new Date(), changeFrequency: "daily",   priority: 0.9 }
  ];

  // Dynamic pages
  const posts = await prisma.post.findMany({
    where:  { isPublished: true },
    select: { slug: true, updatedAt: true }
  });

  const postPages: MetadataRoute.Sitemap = posts.map(post => ({
    url:            `${baseUrl}/blog/${post.slug}`,
    lastModified:   post.updatedAt,
    changeFrequency: "weekly",
    priority:        0.7
  }));

  return [...staticPages, ...postPages];
}

// app/robots.ts
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow:     "/",
        disallow:  ["/api/", "/admin/", "/dashboard/", "/_next/"]
      },
      {
        userAgent: "AdsBot-Google",
        disallow:  "/"
      }
    ],
    sitemap: "https://myapp.com/sitemap.xml"
  };
}
```

---

## Interview Preparation

**Q1: Why is server-side rendering better for SEO than client-side rendering?**
A: With CSR (React SPA), the server sends a near-empty HTML file with a JS bundle. The browser downloads and executes the JS, then renders the content. Googlebot does render JavaScript, but the crawl budget is limited, rendering takes time, and there's a delay between discovery and indexing. With SSR/SSG (Next.js), the server sends fully rendered HTML. Googlebot sees the complete content immediately — no JS execution required. Google can index the page faster, and the content is available immediately even if JavaScript fails. SSR also improves TTFB and LCP, which are ranking signals.

**Q2: What is a canonical URL and when do you need it?**
A: A canonical URL (`<link rel="canonical" href="...">`) tells search engines which version of a page is the "true" one. Without it, if your product page exists at `shop.com/products/shoe?color=red` and `shop.com/products/shoe?color=blue` and `shop.com/products/shoe`, Google treats them as different pages and splits your ranking signals across all three (duplicate content penalty). With canonical, you say "all these URLs represent the same content; consolidate rankings at `/products/shoe`." Always set canonical on: paginated pages, product pages with query parameters, pages accessible at multiple URLs (www vs. non-www, HTTP vs. HTTPS).

**Q3: What is structured data and how does it affect search ranking?**
A: Structured data (JSON-LD with Schema.org types) provides machine-readable context about your content. It doesn't directly improve rankings but enables "rich snippets" in search results: star ratings for products/reviews, FAQ accordions, breadcrumbs, recipe cards, event dates, job postings. Rich snippets increase click-through rates (CTR) significantly, which is a ranking signal. Google can also use structured data to better understand page content, potentially improving relevance scoring. Always validate structured data with Google's Rich Results Test.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Add `<title>` and `<meta name="description">` to every page.
2. Add Open Graph tags for homepage.
3. Add canonical URLs to all pages.
4. Add `robots.txt` disallowing admin and API routes.
5. Create a sitemap.xml with all public pages.
6. Add Twitter Card meta tags.
7. Add JSON-LD for an article/blog post.
8. Test Open Graph tags with LinkedIn Post Inspector.
9. Ensure all images have descriptive `alt` text.
10. Add `<html lang="en">` and correct language attribute.

### Intermediate (10 Tasks)
1. Set up Next.js Metadata API with global template title.
2. Implement dynamic `generateMetadata()` for blog posts.
3. Implement dynamic sitemap with Next.js `sitemap.ts`.
4. Add Product schema with reviews and pricing.
5. Add Breadcrumb schema to category/product pages.
6. Add Organization and Website schema to the homepage.
7. Add `hreflang` for international pages.
8. Validate all structured data with Google Rich Results Test.
9. Implement Open Graph image generation with `next/og`.
10. Ensure mobile-first and pass Core Web Vitals (Lighthouse ≥ 90).

### Advanced (10 Tasks)
1. Generate OG images dynamically with `@vercel/og` (Edge Runtime).
2. Implement advanced robots directives (crawl budget management).
3. Set up Google Search Console and submit sitemap.
4. Monitor Core Web Vitals with real user data via web-vitals.
5. Implement FAQ schema for a support page.
6. Implement breadcrumbs both visually and with schema.
7. A/B test title/description changes and measure CTR impact in GSC.
8. Implement structured data for local business (NAP consistency).
9. Build an automated SEO audit using Lighthouse CI in GitHub Actions.
10. Pass all items on the technical SEO checklist (pagespeed, canonical, structured data, robots, sitemap).

---

## Self Assessment
1. What is the difference between `noindex` and `nofollow`?
2. What is a canonical URL?
3. What is structured data?
4. What are Open Graph tags used for?
5. Why is SSR better for SEO than CSR?
6. What is a sitemap.xml?
7. What does `robots.txt` do?
8. What is a rich snippet?
9. What are the Core Web Vitals and why do they matter for SEO?
10. What is `hreflang` used for?

---

## Cheat Sheet

```html
<!-- Essential meta tags -->
<title>Page Title (50-60 chars) | Site Name</title>
<meta name="description" content="Page description (150-160 chars)" />
<link rel="canonical" href="https://example.com/page" />
<meta name="robots" content="index, follow" />

<!-- Open Graph -->
<meta property="og:type"        content="article" />
<meta property="og:title"       content="..." />
<meta property="og:description" content="..." />
<meta property="og:image"       content="https://...jpg" />  <!-- 1200×630px -->
<meta property="og:url"         content="https://..." />

<!-- Twitter Card -->
<meta name="twitter:card"  content="summary_large_image" />
<meta name="twitter:title" content="..." />
<meta name="twitter:image" content="..." />

<!-- JSON-LD Article -->
<script type="application/ld+json">
{ "@context":"https://schema.org","@type":"Article","headline":"...","author":{"@type":"Person","name":"..."},"datePublished":"2025-01-15" }
</script>
```

```typescript
// Next.js Metadata API
export const metadata: Metadata = {
  title:       { template: "%s | Site", default: "Site" },
  description: "...",
  openGraph:   { type: "website", siteName: "..." },
  robots:      { index: true, follow: true }
};

// Dynamic metadata
export async function generateMetadata({ params }): Promise<Metadata> {
  const item = await getData(params.slug);
  return { title: item.title, description: item.desc, openGraph: { images: [item.image] } };
}

// Sitemap
// app/sitemap.ts → export default async function sitemap(): Promise<MetadataRoute.Sitemap>
// app/robots.ts  → export default function robots(): MetadataRoute.Robots
```
