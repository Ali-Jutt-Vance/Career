# Phase 4 — Chapter 9: Frontend Performance

---

## Chapter Overview

Frontend performance directly impacts revenue — Google found a 0.1s improvement in mobile search latency improved sales by 0.9% for retailers. The Core Web Vitals (LCP, INP, CLS) are Google's ranking signals. This chapter covers measurement, diagnosis, and optimization of real-world frontend performance.

**Core Web Vitals (2025):**
- LCP (Largest Contentful Paint): how fast the main content loads (target: < 2.5s)
- INP (Interaction to Next Paint): responsiveness to user interaction (target: < 200ms)
- CLS (Cumulative Layout Shift): visual stability (target: < 0.1)

---

## Beginner Theory

### Browser Rendering Pipeline

```
Parse HTML  → Build DOM
Parse CSS   → Build CSSOM
DOM + CSSOM → Render Tree
Layout      → Geometry (position/size of every element)
Paint       → Pixels
Composite   → Layer composition (GPU)

Blocking resources (delay initial render):
  <link rel="stylesheet">  ← render-blocking CSS
  <script>                 ← parser-blocking JS (no defer/async)

Non-blocking:
  <script defer>           ← download in parallel, execute after parse
  <script async>           ← download in parallel, execute immediately
  <link rel="preload">     ← download early, don't block render
```

---

## Basic Examples

### Core Web Vitals Measurement

```typescript
// Measure real user CWV in production
import { onLCP, onINP, onCLS, onFCP, onTTFB } from "web-vitals";

function sendToAnalytics(metric) {
  navigator.sendBeacon("/api/vitals", JSON.stringify({
    name:    metric.name,
    value:   metric.value,
    rating:  metric.rating,    // "good" | "needs-improvement" | "poor"
    id:      metric.id,
    page:    location.pathname
  }));
}

// Measure all Core Web Vitals
onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);

// Analytics API endpoint
// app/api/vitals/route.ts
export async function POST(req: Request) {
  const metric = await req.json();
  await db.vitals.create({ data: { ...metric, url: req.headers.get("referer"), timestamp: new Date() } });
  return new Response(null, { status: 204 });
}
```

### Image Optimization

```typescript
// Next.js Image component (handles resize, WebP, lazy load)
import Image from "next/image";

// Hero image (above fold) — eager load, high priority
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={630}
  priority                          // fetchpriority="high", no lazy load
  sizes="100vw"                     // full-width on all screens
  quality={85}
/>

// Product image (below fold) — lazy load
<Image
  src={product.imageUrl}
  alt={product.name}
  width={400}
  height={400}
  loading="lazy"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL={product.blurUrl}     // tiny base64 blur shown while loading
/>

// Responsive image with srcset (vanilla HTML)
<picture>
  <source type="image/avif" srcset="hero-800.avif 800w, hero-1200.avif 1200w" />
  <source type="image/webp" srcset="hero-800.webp 800w, hero-1200.webp 1200w" />
  <img src="hero-1200.jpg" alt="Hero" loading="eager" fetchpriority="high" width="1200" height="630" />
</picture>
```

---

## Intermediate Concepts

### Code Splitting and Lazy Loading

```typescript
import { lazy, Suspense, startTransition } from "react";

// Lazy load heavy components — only download when needed
const RichTextEditor = lazy(() => import("./RichTextEditor"));
const DataChart      = lazy(() => import("./DataChart"));
const AdminDashboard = lazy(() => import("./AdminDashboard"));
const PdfViewer      = lazy(() => import("./PdfViewer"));

// Usage with Suspense
function PostEditor() {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div>
      <button onClick={() => startTransition(() => setShowEditor(true))}>
        Open Editor
      </button>
      {showEditor && (
        <Suspense fallback={<div className="h-64 skeleton" />}>
          <RichTextEditor />
        </Suspense>
      )}
    </div>
  );
}

// Route-based code splitting (Next.js App Router does this automatically)
// Each page.tsx is a separate JS chunk

// Prefetch on hover (load before user clicks)
function NavLink({ href, children }) {
  const prefetchRoute = useCallback(() => {
    // Next.js router.prefetch()
    router.prefetch(href);
  }, [href]);

  return <a href={href} onMouseEnter={prefetchRoute}>{children}</a>;
}
```

### Virtualization for Long Lists

```typescript
import { FixedSizeList, VariableSizeList } from "react-window";
import { useVirtualizer }                  from "@tanstack/react-virtual";

// react-window: fixed height items
function VirtualizedList({ items }) {
  return (
    <FixedSizeList
      height={600}       // container height
      itemCount={items.length}
      itemSize={72}      // each row height
      width="100%"
    >
      {({ index, style }) => (
        <div style={style} className="flex items-center border-b px-4">
          <UserRow user={items[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}

// TanStack Virtual: more flexible
function TanStackVirtualList({ items }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count:     items.length,
    getScrollElement: () => parentRef.current,
    estimateSize:     () => 72,
    overscan:  5
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position:  "absolute",
              top:       0,
              transform: `translateY(${virtualRow.start}px)`,
              width:     "100%",
              height:    virtualRow.size
            }}
          >
            <UserRow user={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### INP Optimization (Interaction Responsiveness)

```typescript
// Long tasks block the main thread — break them up
// Bad: synchronous processing that blocks UI
function processLargeDataset(data) {
  // This blocks for 500ms — freezes UI
  return data.map(item => expensiveTransform(item));
}

// Good: use scheduler API or chunking
async function processInChunks(data, chunkSize = 50) {
  const results = [];
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    results.push(...chunk.map(expensiveTransform));
    // Yield to the browser between chunks
    await new Promise(resolve => scheduler.postTask(resolve, { priority: "background" }));
  }
  return results;
}

// Move heavy work to Web Worker
const worker = new Worker(new URL("./heavy-worker.ts", import.meta.url));
worker.postMessage({ data: largeData });
worker.onmessage = (e) => setResult(e.data);

// Debounce expensive event handlers
import { useDebouncedCallback } from "use-debounce";

function SearchInput() {
  const search = useDebouncedCallback((value) => {
    performSearch(value);
  }, 300);

  return <input onChange={e => search(e.target.value)} />;
}

// Use CSS animations instead of JS (runs on compositor thread)
// Bad: JS animation
useEffect(() => {
  let frame;
  function animate() {
    el.style.transform = `translateX(${x++}px)`;
    frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(frame);
}, []);

// Good: CSS animation (no JS involvement)
// .slide { animation: slide-in 0.3s ease-out; }
// @keyframes slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }
```

### Bundle Analysis and Optimization

```bash
# Analyze Next.js bundle
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true"
});
module.exports = withBundleAnalyzer({ /* next config */ });

# Run analyzer
ANALYZE=true npm run build
```

```typescript
// next.config.js — performance optimizations
module.exports = {
  // Enable SWC minification (default)
  swcMinify: true,

  // Optimize images
  images: {
    formats:  ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    minimumCacheTTL: 86400  // 1 day
  },

  // Headers for caching static assets
  async headers() {
    return [{
      source: "/_next/static/(.*)",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
      ]
    }];
  },

  // Compress responses
  compress: true,

  // Experimental features
  experimental: {
    optimizeCss: true,  // inline critical CSS
    optimizePackageImports: ["lodash", "date-fns", "@mui/material"]
  }
};
```

---

## Advanced Concepts

### Resource Hints

```html
<!-- preconnect: establish TCP/TLS connection early -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://api.stripe.com" crossorigin />

<!-- dns-prefetch: resolve DNS only (cheaper than preconnect) -->
<link rel="dns-prefetch" href="https://cdn.example.com" />

<!-- preload: download critical resources early (don't delay render) -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/hero.jpg" as="image" />

<!-- prefetch: download next-navigation resources in background -->
<link rel="prefetch" href="/dashboard" as="document" />

<!-- modulepreload: preload JS modules and their dependencies -->
<link rel="modulepreload" href="/app.js" />
```

---

## Interview Preparation

**Q1: What are the Core Web Vitals and what are their targets?**
A: LCP (Largest Contentful Paint): measures how long until the largest visible element (usually hero image or heading) loads. Target: < 2.5s. Optimize by: preloading hero images, optimizing image formats (WebP/AVIF), reducing TTFB. INP (Interaction to Next Paint): measures the delay from user interaction to next visual update. Replaced FID in 2024. Target: < 200ms. Optimize by: breaking up long tasks, avoiding heavy event handlers, using Web Workers. CLS (Cumulative Layout Shift): measures unexpected layout shifts. Target: < 0.1. Optimize by: always specifying image dimensions, not injecting content above existing content, using CSS `aspect-ratio` for media.

**Q2: How does virtualization improve list performance?**
A: Without virtualization, rendering a list of 10,000 items creates 10,000 DOM nodes — even hidden/scrolled items exist in the DOM, consuming memory and causing slow initial renders. Virtualization renders only the items visible in the viewport (plus a small overscan buffer). As the user scrolls, items that leave the viewport are recycled/removed, and new items are added. The DOM stays small (usually 20-30 nodes visible) regardless of total list size. This reduces memory usage by 99% for large lists and keeps initial render fast.

**Q3: What is the difference between `defer` and lazy loading in the context of performance?**
A: `defer` (HTML attribute): defers JavaScript execution until after HTML parsing — the script downloads in parallel with parsing but only runs after the full DOM is built. Reduces render-blocking, maintains execution order. Lazy loading (React): code splitting — the component's JavaScript bundle is not downloaded at all until the component is needed. `defer` makes a script run later; lazy loading doesn't download it at all until needed. Lazy loading has a larger impact on initial bundle size and time-to-interactive.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Run Lighthouse on a page and analyze the report.
2. Add `loading="lazy"` to all below-the-fold images.
3. Add `defer` to all script tags.
4. Convert a PNG to WebP format.
5. Add `width` and `height` to all images to prevent CLS.
6. Install `web-vitals` and log metrics to the console.
7. Use Next.js `<Image>` component for all images.
8. Add `<link rel="preconnect">` for third-party domains.
9. Enable gzip compression on the server.
10. Eliminate render-blocking CSS (move non-critical CSS to async load).

### Intermediate (10 Tasks)
1. Analyze bundle with `@next/bundle-analyzer` and identify the largest packages.
2. Code-split a heavy component with `React.lazy`.
3. Implement virtualized list for 10K+ items with `react-window`.
4. Add `blurDataURL` placeholder to all product images.
5. Measure INP and identify long tasks in Chrome DevTools Performance panel.
6. Implement debounced search input.
7. Move image processing to a Web Worker.
8. Use `startTransition` for non-urgent state updates.
9. Add HTTP cache headers for static assets.
10. Implement service worker for offline caching (PWA).

### Advanced (10 Tasks)
1. Achieve 100 Lighthouse performance score on a production page.
2. Implement real user monitoring (RUM) for all Core Web Vitals.
3. Implement predictive prefetching (prefetch links in viewport).
4. Build a performance budget into CI/CD (fail build if LCP > 2.5s).
5. Implement AVIF image generation pipeline.
6. Reduce CLS to 0 by auditing all dynamic content insertion.
7. Use `PerformanceObserver` to monitor long tasks (> 50ms) in production.
8. Implement server-side rendering (SSR) to improve TTFB.
9. Implement streaming SSR with React Suspense for dashboard.
10. Profile and optimize a React component tree with React DevTools Profiler.

---

## Self Assessment
1. What are the Core Web Vitals?
2. What is LCP and how do you improve it?
3. What is INP and what causes poor INP?
4. What is CLS and how do you prevent layout shifts?
5. What is the difference between `defer` and `async`?
6. What is code splitting?
7. What is virtualization and when do you need it?
8. What does `fetchpriority="high"` do?
9. What is `preconnect` used for?
10. What is the main thread and why is it critical?

---

## Cheat Sheet

```html
<!-- Critical images (LCP) -->
<img src="hero.jpg" fetchpriority="high" loading="eager" width="1200" height="630" alt="..." />

<!-- Below-fold images -->
<img src="product.jpg" loading="lazy" width="400" height="400" alt="..." />

<!-- Scripts (no blocking) -->
<script defer src="app.js"></script>
<script async src="analytics.js"></script>

<!-- Resource hints -->
<link rel="preconnect"   href="https://fonts.googleapis.com" />
<link rel="preload"      href="/font.woff2" as="font" crossorigin />
<link rel="dns-prefetch" href="https://cdn.example.com" />
```

```typescript
// Code split component
const Heavy = lazy(() => import("./Heavy"));
<Suspense fallback={<Skeleton />}><Heavy /></Suspense>

// Measure vitals
import { onLCP, onINP, onCLS } from "web-vitals";
onLCP(m => sendToAnalytics(m));
onINP(m => sendToAnalytics(m));
onCLS(m => sendToAnalytics(m));

// Virtualize long lists
<FixedSizeList height={600} itemCount={10000} itemSize={72} width="100%">
  {({ index, style }) => <div style={style}><Row item={items[index]} /></div>}
</FixedSizeList>

// Debounce input
const search = useDebouncedCallback(value => fetchResults(value), 300);

// Non-urgent update
startTransition(() => setSearch(query));
```
