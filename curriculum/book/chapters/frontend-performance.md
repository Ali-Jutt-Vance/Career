# Frontend Performance

> [!GOALS]
> - Explain why front-end speed matters to users and businesses, and why it must be **measured** on real devices rather than guessed.
> - Describe what happens between a click on a link and a usable page, and where the time goes: network, server, parsing, JavaScript, rendering.
> - Explain the **Core Web Vitals** — LCP, INP and CLS — what each measures, their thresholds, and how to improve each one.
> - Measure performance in the lab (Lighthouse, DevTools) and in the field (real-user monitoring), and read the results correctly using percentiles.
> - Reduce what you send: JavaScript bundles, images, fonts and CSS — with code splitting, tree shaking, compression and modern formats.
> - Load resources in the right order with preload, preconnect, priorities and caching.
> - Keep pages responsive to input by breaking up long tasks and rendering less.
> - Set performance budgets and keep performance from regressing in a team.

## Why this matters

Imagine two online shops selling the same mangoes at the same price. On the first, the product page appears in one second, the "Add to cart" button responds instantly, and nothing jumps around while you read. On the second, you stare at a white screen for four seconds on your phone's mobile data, the page finally appears, and just as you tap "Add to cart" an advertisement loads above it, the button moves, and you tap something else entirely. Which shop do you buy from next time?

Performance is not a technical nicety. It decides:

- **Whether people stay.** On a slow page, many visitors leave before it finishes loading, especially on mobile networks.
- **Whether they buy.** Large retailers and studies commissioned by search companies have repeatedly reported that faster pages convert more visitors into customers.
- **Whether they find you.** Google uses page experience signals, including the Core Web Vitals in this chapter, as part of its search ranking ({{ch:seo}}).
- **Whether everyone can use your product.** Many of your users have mid-range or older phones, limited data plans and unstable connections. A page that feels instant on a developer's laptop on office Wi-Fi can be unusable for them.

And front-end performance is easy to destroy without noticing: one large library added for a small feature, one unoptimised hero image, one third-party chat widget, one effect that re-renders a whole list on every keystroke. This chapter teaches how browsers load and run pages, how to measure what users actually experience, and the techniques professionals use to make — and keep — pages fast.

## The simple idea

Think about getting served at a restaurant. Three things matter to you as a customer:

1. **How soon your main dish arrives** — not the water, not the menu, the thing you came for.
2. **How quickly the waiter responds** when you ask for something — a slow response feels like being ignored, even if the food is good.
3. **Whether the table stays stable** — if dishes keep being moved around while you are eating, you will knock something over.

Web performance is measured the same way. Users care about **how soon the main content appears**, **how quickly the page responds when they interact**, and **whether things stay where they are** while the page loads. These three map exactly onto Google's Core Web Vitals.

> [!ANALOGY]
> A fast web page is like a good restaurant: the main dish arrives quickly, the waiter responds immediately when you ask, and nothing on the table moves unexpectedly.
>
> **Where the analogy breaks:** a restaurant serves one table at a time in one place. A website serves thousands of different devices and networks at once, and the same page can be fast for one user and painfully slow for another. That is why performance must be measured across **many real users**, not judged from one experience.

## The proper definition and key words

**Front-end performance** is how quickly and smoothly a web page loads, becomes usable and responds to the user, as experienced on real devices and networks.

The key words:

- **Latency** — the time for a single request to travel to a server and back ({{ch:how-the-internet-works}}).
- **Bandwidth** — how much data can be transferred per second.
- **Critical rendering path** — the sequence of steps the browser must complete before it can show the first content.
- **Render-blocking resource** — a file (usually CSS, or a non-deferred script) that stops the browser from showing the page until it has loaded ({{ch:html}}).
- **Main thread** — the single thread on which the browser runs JavaScript, calculates styles and layout, and handles input ({{ch:the-event-loop}}, {{ch:browser-and-dom}}).
- **Long task** — any piece of work that occupies the main thread for more than 50 milliseconds, during which the page cannot respond.
- **Core Web Vitals** — Google's three key user-experience metrics: **LCP**, **INP** and **CLS**.
- **Lab data** — measurements from controlled tests (a tool running a page on a simulated device and network).
- **Field data** (real-user monitoring, RUM) — measurements collected from actual users' browsers.
- **Percentile** — a value below which a given percentage of measurements fall. The 75th percentile (p75) is the value that 75% of users experience or better.
- **Bundle** — a JavaScript file produced by a build tool, combining many modules ({{ch:modules-and-npm}}).

## How it works inside: from link to usable page

### Level 2 — The journey

When a user opens `https://cornershop.example/mangoes`, a long chain of work happens. Each step can be slow:

```text
  1. DNS lookup         find the server's IP address                ({{ch:dns}})
  2. Connection         TCP + TLS handshakes                        ({{ch:tls-ssl}})
  3. Request/response   server builds the HTML; first byte arrives  (TTFB)
  4. Parse HTML         build the DOM; discover CSS, JS, images
  5. Download CSS       render-blocking: nothing painted until done
  6. Download/run JS    blocks the main thread while running
  7. Style + layout     compute what goes where                     ({{ch:css}})
  8. Paint              first content appears                       (FCP)
  9. Largest element    the main image or heading appears           (LCP)
 10. Hydration          JavaScript makes server-rendered HTML interactive
 11. Interaction        user taps; handler runs; screen updates     (INP)
```

(The chapter references in the diagram point to where each topic is taught.)

- **Time to First Byte (TTFB)** — how long until the first byte of the HTML arrives. It includes DNS, connection set-up and the server's work. A slow server or database query shows up here ({{ch:query-optimization}}).
- **First Contentful Paint (FCP)** — when the browser first shows any text or image.
- **Largest Contentful Paint (LCP)** — when the largest visible content element (usually the main image or a big heading) is shown.
- **Hydration** — for pages rendered on the server, the process in which the framework's JavaScript loads and attaches event handlers to the existing HTML so it becomes interactive ({{ch:nextjs}}).

### Level 2 — Why the main thread is the bottleneck

Recall from {{ch:browser-and-dom}} that JavaScript, style calculation, layout and input handling all share **one main thread**. While a 300-millisecond JavaScript task runs, the browser can do nothing else: taps are queued, animations freeze, and typing lags. On a mid-range phone, JavaScript often runs several times more slowly than on a developer's laptop, so a task that takes 60 ms on your machine may take 250 ms or more for many users.

This is why **JavaScript is usually the most expensive resource on a page**, byte for byte. An image of 200 KB must be downloaded and decoded (often on another thread). JavaScript of 200 KB must be downloaded, **parsed, compiled and executed on the main thread**, and it may then render, fetch more data and run more JavaScript.

## The Core Web Vitals

Google's **Core Web Vitals** distil user experience into three metrics, each with thresholds. A page "passes" when at least 75% of real visits meet the "good" threshold for each metric — the **75th percentile**.

| Metric | Measures | Good | Needs improvement | Poor |
|---|---|---|---|---|
| **LCP** — Largest Contentful Paint | Loading: when the main content appears | ≤ 2.5 s | ≤ 4.0 s | > 4.0 s |
| **INP** — Interaction to Next Paint | Responsiveness: delay from an interaction to the next screen update | ≤ 200 ms | ≤ 500 ms | > 500 ms |
| **CLS** — Cumulative Layout Shift | Visual stability: how much content moves unexpectedly | ≤ 0.1 | ≤ 0.25 | > 0.25 |

(INP replaced an older metric, First Input Delay, in 2024. TTFB and FCP are useful supporting metrics but not Core Web Vitals.)

### Level 3 — Why the 75th percentile?

An average hides the users who suffer. If most visits are fast but a quarter are painfully slow — perhaps everyone on older phones — the average may look fine. A **percentile** answers "what do most users experience at least?". p75 means three quarters of visits were at least this good.

```ts
function percentile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, rank)]!;
}

// LCP samples (milliseconds) from twenty real visits to one page
const lcpSamples = [
  1200, 1350, 1400, 1500, 1550, 1600, 1700, 1800, 1900, 2000,
  2100, 2200, 2300, 2400, 3900, 4200, 4800, 5100, 6000, 7500,
];

const average = lcpSamples.reduce((sum, v) => sum + v, 0) / lcpSamples.length;
console.log(`average: ${(average / 1000).toFixed(2)} s`);
console.log(`median (p50): ${(percentile(lcpSamples, 50) / 1000).toFixed(2)} s`);
console.log(`p75: ${(percentile(lcpSamples, 75) / 1000).toFixed(2)} s`);
console.log(percentile(lcpSamples, 75) <= 2500 ? "LCP: good" : "LCP: needs work");
```

**Output:**

```text
average: 2.83 s
median (p50): 2.00 s
p75: 3.90 s
LCP: needs work
```

- The **median** (2.0 s) suggests the page is fine, and the **average** (2.83 s) suggests "slightly slow".
- The **p75** (3.9 s) reveals the truth: a quarter of visits take almost 4 seconds or more. Those are often your users on slower phones and networks.
- The percentile function sorts a copy of the values ({{ch:functional-programming}}) and picks the value at the right rank (this is the simple "nearest rank" method; analytics tools may interpolate slightly differently).

### Level 3 — LCP: loading the main content fast

LCP is usually the hero image, a product photo, or the main heading. It is slow for four reasons, which add up:

```text
  LCP time = TTFB  +  resource load delay  +  resource load time  +  render delay
             (server)  (when did the browser   (download size,      (blocked by CSS,
                        discover the image?)    bandwidth)           JS, fonts)
```

How to improve each part:

- **TTFB**: fast server responses, caching, a **CDN** (content delivery network) close to users ({{ch:cloudfront}}), rendering pages ahead of time where possible ({{ch:nextjs}}).
- **Discovery delay**: the LCP image must be in the **initial HTML** as a normal `<img>`, not inserted later by JavaScript or hidden in a CSS background. Do **not** lazy-load it. Give it a high priority:

```html
<img src="/images/sindhri-hero.avif" alt="A box of ripe Sindhri mangoes"
     width="1200" height="800" fetchpriority="high">
```

  `fetchpriority="high"` tells the browser to fetch it before less important images.
- **Load time**: serve the right size (`srcset`), a modern format (AVIF or WebP), and compress it ({{ch:html}}).
- **Render delay**: keep render-blocking CSS small, defer non-critical JavaScript, and avoid waiting for web fonts before showing text.

### Level 3 — CLS: keeping things still

**Layout shift** happens when visible content moves because something above or around it changed size after it was shown. The score combines how much of the screen moved and how far.

Common causes and fixes:

| Cause | Fix |
|---|---|
| Images and videos without dimensions | Always set `width` and `height` (or `aspect-ratio`) ({{ch:html}}, {{ch:css}}) |
| Ads, embeds, banners inserted at the top | Reserve their space in advance; insert new content below the viewport or in response to a user action |
| Content injected after data loads | Show a skeleton placeholder of the **same size** |
| Web fonts swapping and changing text size | Use a fallback font with similar metrics; `font-display: optional` or `swap` with size adjustment |
| Animating `top`, `height`, `margin` | Animate `transform` instead ({{ch:css}}) |

Shifts within 500 milliseconds after a user's own input (such as expanding an accordion) do not count — users expect things to move when they ask for it.

### Level 3 — INP: responding quickly

INP measures, across the user's whole visit, how long it takes from an interaction (tap, click, key press) until the browser **paints the next frame** showing a response. It is reported as roughly the worst interaction (ignoring rare outliers on long visits).

The delay has three parts:

```text
  input delay           +   processing time         +   presentation delay
  (main thread busy        (your event handlers         (style, layout, paint
   with other work)         running)                     of the update)
```

- **Input delay** is high when a long task — often a big script loading or a heavy timer — is running when the user taps.
- **Processing time** is high when handlers do too much: re-rendering a huge React tree, filtering thousands of items synchronously, heavy analytics.
- **Presentation delay** is high when the resulting update is expensive to lay out and paint: a massive DOM, layout thrashing ({{ch:browser-and-dom}}).

The general fix is to **give the main thread back** quickly: do the minimum needed to show feedback immediately, and move the rest later or elsewhere (see "Responsiveness" below).

## Measuring performance

### Level 3 — Lab tools

**Lighthouse** (built into Chrome DevTools, under the *Lighthouse* panel, and available as a command-line tool) loads a page on a simulated mid-range phone and slow network and reports metrics, a score, and specific suggestions ("Properly size images", "Reduce unused JavaScript"). It is excellent for finding problems and for comparing before and after a change.

The **Performance panel** in DevTools records a timeline of everything the browser did: network requests, JavaScript tasks (long tasks are marked in red), style and layout work, and paints. Use it to answer "why is this interaction slow?". Turn on **CPU throttling** (for example, 4× slower) and **network throttling** to approximate real users' devices. The **Network panel** shows every request, its size, timing and priority.

The **React DevTools Profiler** shows which components rendered and why ({{ch:react-advanced}}).

Lab data has a weakness: it is **one simulated visit**. It cannot tell you what real users experience on their real devices.

### Level 4 — Field data: real-user monitoring

**Field data** comes from real visits. Two sources:

- **The Chrome User Experience Report (CrUX)** — Google's public dataset of real Chrome users' Core Web Vitals for popular sites, shown in tools such as PageSpeed Insights and Google Search Console. This is what search ranking uses.
- **Your own real-user monitoring (RUM)** — measuring in your users' browsers and sending the data to your analytics. Google's small `web-vitals` library makes this straightforward:

```ts
// fragment
import { onCLS, onINP, onLCP, type Metric } from "web-vitals";

function report(metric: Metric): void {
  const body = JSON.stringify({
    name: metric.name,        // "LCP" | "INP" | "CLS"
    value: metric.value,
    rating: metric.rating,    // "good" | "needs-improvement" | "poor"
    page: location.pathname,
  });
  // sendBeacon keeps working while the page is being closed
  navigator.sendBeacon("/api/vitals", body);
}

onLCP(report);
onINP(report);
onCLS(report);
```

- Each `on...` function calls `report` when the metric's value is known (INP and CLS are finalised when the user leaves the page or switches tabs).
- `navigator.sendBeacon` sends the data reliably even as the page unloads.
- On the server, aggregate by page and device type, and look at the **p75**.

Commercial monitoring services provide the same, with dashboards. Field data tells you **what** is slow and **for whom**; lab tools then help you find **why**.

## Sending less: JavaScript

### Level 3 — See what you ship

Before optimising, look at what is in your bundles. **Bundle analysers** (for Vite, Webpack and Next.js) draw a map of every module in each bundle, sized by bytes. Common discoveries:

- A whole date library imported for one formatting function — when the built-in `Intl.DateTimeFormat` would do.
- A utility library imported entirely (`import _ from "lodash"`) for two functions.
- The same library included twice in different versions.
- Code for an admin dashboard shipped to every shop visitor.
- Large data (a list of every country, a translations file) bundled into JavaScript.

### Level 3 — Tree shaking

**Tree shaking** is the build tool's removal of code that is imported but never used. It works with ES module `import`/`export` syntax ({{ch:modules-and-npm}}), because imports are static and analysable:

```ts
// fragment
// Tree-shakeable: only formatDistance ends up in the bundle
import { formatDistance } from "date-fns";

// Not tree-shakeable in many libraries: pulls in everything
import _ from "lodash";
_.debounce(fn, 300);

// Better: import the single function (or write the five-line debounce yourself)
import debounce from "lodash/debounce";
```

Tree shaking can be defeated by modules with **side effects** at import time, and by CommonJS (`require`) packages. Check a library's size and tree-shakeability before adding it; tools such as "bundlephobia" show this for npm packages.

### Level 3 — Code splitting and lazy loading

**Code splitting** divides your JavaScript into chunks that load **only when needed**:

- **Per route**: each page's code loads when the user navigates to it. Frameworks such as Next.js do this automatically ({{ch:nextjs}}).
- **Per feature**: heavy components that are not visible at first — a rich text editor, a map, a chart, a modal — load on demand with dynamic `import()` and React's `lazy` ({{ch:react-advanced}}).

```tsx
// fragment
import { lazy, Suspense, useState } from "react";

const ReviewEditor = lazy(() => import("./ReviewEditor")); // large: rich-text editor

export function ProductReviews() {
  const [writing, setWriting] = useState(false);
  return (
    <section>
      <h2>Reviews</h2>
      {writing ? (
        <Suspense fallback={<p>Loading editor…</p>}>
          <ReviewEditor />
        </Suspense>
      ) : (
        <button type="button" onClick={() => setWriting(true)}>Write a review</button>
      )}
    </section>
  );
}
```

Most visitors read reviews but never write one. The editor's code is downloaded only by the few who click the button.

### Level 4 — Do less on the client

The biggest JavaScript savings come from **not needing JavaScript at all**:

- Render content on the **server** and send HTML ({{ch:nextjs}}). With React Server Components, components that only display data send **no** component JavaScript to the browser.
- Use **HTML and CSS** features instead of JavaScript: `<details>` for accordions, `<dialog>` for modals, CSS for hover effects and simple animations, native form validation ({{ch:html}}, {{ch:css}}).
- Remove **unused** features, polyfills for browsers you no longer support, and abandoned experiments.

### Level 4 — Third-party scripts

Analytics, advertising, chat widgets, A/B-testing tools and social embeds are frequently the **largest** contributors to slow pages — and they are outside your control. Each one can download more scripts, run long tasks and shift layout.

- Keep an **inventory**: what each script is for, who owns it, what it costs.
- Load them with `async` or `defer`, or after the page is interactive.
- Load heavy widgets (chat, video) only **on interaction** — show a static "Chat with us" button that loads the real widget when clicked (a **facade**).
- Remove the ones nobody uses.

Remember the security side too: every third-party script has full access to your page ({{ch:browser-and-dom}}).

## Sending less: images, fonts and CSS

### Level 3 — Images

Images are usually the largest bytes on a page. The techniques from {{ch:html}}, in one checklist:

- **Right format**: AVIF or WebP for photos (often much smaller than JPEG at similar quality), SVG for logos and icons, PNG only when needed.
- **Right size**: never send a 3,000-pixel image to show at 400 pixels. Use `srcset` and `sizes`, or an image service/CDN that resizes on demand.
- **Right compression**: quality around 60–80 is usually visually fine for photos.
- **Right priority**: `fetchpriority="high"` for the LCP image; `loading="lazy"` for images below the fold.
- **Dimensions** always, for CLS.

Frameworks often provide an image component that does much of this automatically ({{ch:nextjs}}).

### Level 3 — Fonts

Custom fonts are render-blocking for text unless handled carefully:

- Use as **few** families and weights as possible; each weight is a separate file.
- Prefer **WOFF2**, the most compressed font format.
- **Subset** fonts to the characters you need (for example, Latin only, or Latin plus Urdu).
- Use `font-display: swap` (text appears immediately in a fallback font and swaps when the custom font arrives) or `optional` (use the custom font only if it arrives very quickly) ({{ch:css}}).
- **Self-host** fonts or preconnect to the font provider, and preload the one or two critical font files.
- Consider **system fonts** (`system-ui`), which cost nothing to download.

### Level 3 — CSS

- Remove unused CSS (utility frameworks generate only what you use — {{ch:tailwind}}).
- Keep the CSS needed for the first screen small; some sites **inline critical CSS** in the HTML and load the rest without blocking.
- Avoid `@import` chains in CSS, which load files one after another.

## Loading in the right order

### Level 3 — Resource hints

You can give the browser hints about what it will need soon:

```html
<!-- Start the connection to another origin early (DNS + TCP + TLS) -->
<link rel="preconnect" href="https://images.cornershop.example">

<!-- Fetch a critical resource early, before the parser discovers it -->
<link rel="preload" href="/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>

<!-- Fetch something likely needed for the NEXT navigation, at low priority -->
<link rel="prefetch" href="/checkout">
```

- **`preconnect`** saves the connection set-up time (which can be several hundred milliseconds on mobile — {{ch:how-the-internet-works}}) for origins you will certainly use.
- **`preload`** fetches a resource the browser would otherwise discover late — a font referenced inside CSS, or an LCP image loaded by CSS. Preload only a few truly critical files: preloading everything competes for bandwidth and slows the page.
- **`prefetch`** downloads resources for a **future** navigation during idle time. Frameworks prefetch the code for links visible on screen ({{ch:nextjs}}).

### Level 3 — Compression and caching

- **Compression**: servers and CDNs should compress text resources (HTML, CSS, JavaScript, JSON) with **Brotli** or **gzip**. Text often shrinks to a fraction of its size. This is configuration, usually on the server or CDN ({{ch:nginx-reverse-proxy}}).
- **HTTP caching**: tell browsers how long they may reuse a file without asking again, with the `Cache-Control` header ({{ch:how-the-web-works}}, {{ch:caching}}). The standard pattern:
  - Build tools give static assets **content-hashed** file names, such as `app.3f9a2c.js`. The name changes whenever the content changes, so these files can be cached "forever": `Cache-Control: public, max-age=31536000, immutable`.
  - The **HTML** that references them is cached briefly or revalidated on every visit, so users get new asset names after each deployment.
- **CDNs** serve static files from servers close to users, reducing latency ({{ch:cloudfront}}).

## Responsiveness: keeping the main thread free

### Level 4 — Breaking up long tasks

A single long task blocks every interaction during it. If you must process a lot of data in the browser, split the work into chunks and **yield** to the browser between chunks, so it can handle input and paint:

```ts
// fragment
async function yieldToMain(): Promise<void> {
  // Use the scheduler API where available; fall back to a zero-delay timeout
  if ("scheduler" in globalThis && "yield" in (globalThis as any).scheduler) {
    return (globalThis as any).scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function indexProducts(products: Product[]): Promise<Map<string, Product[]>> {
  const index = new Map<string, Product[]>();
  for (let i = 0; i < products.length; i++) {
    const p = products[i]!;
    for (const word of p.name.toLowerCase().split(/\s+/)) {
      const list = index.get(word) ?? [];
      list.push(p);
      index.set(word, list);
    }
    if (i % 500 === 499) await yieldToMain(); // let the browser respond every 500 items
  }
  return index;
}
```

Each `await yieldToMain()` ends the current task and continues in a new one, giving queued taps and keystrokes a chance to run ({{ch:the-event-loop}}). `scheduler.yield()` is a newer browser API designed for exactly this; the timeout is a fallback.

### Level 4 — Other techniques

- **Show feedback first, work second.** In a click handler, update the UI immediately (a pressed state, a spinner), then do the heavy work in a later task.
- **Debounce** expensive work triggered by typing ({{ch:browser-and-dom}}).
- **Transitions** in React mark heavy re-renders as interruptible ({{ch:react-advanced}}).
- **Render less**: keep state local, memoise expensive components, **virtualise** long lists ({{ch:react-advanced}}).
- **Web workers** run JavaScript on a **separate thread**, with no access to the DOM. Move pure, heavy computation there — parsing a large file, image processing, complex calculations — and send the result back with messages.
- **Avoid layout thrashing** and huge DOMs ({{ch:browser-and-dom}}).

## Performance budgets and preventing regressions

### Level 5 — Budgets

Performance degrades gradually, one "small" addition at a time. Teams protect it with **performance budgets**: explicit limits that are checked automatically.

```ts
type Budget = { name: string; limitKb: number };
type Asset = { name: string; sizeKb: number };

const budgets: Budget[] = [
  { name: "initial JavaScript", limitKb: 170 },
  { name: "LCP image", limitKb: 120 },
  { name: "CSS", limitKb: 40 },
];

const build: Asset[] = [
  { name: "initial JavaScript", sizeKb: 184.6 },
  { name: "LCP image", sizeKb: 96.2 },
  { name: "CSS", sizeKb: 31.0 },
];

let failures = 0;
for (const budget of budgets) {
  const asset = build.find((a) => a.name === budget.name);
  if (!asset) continue;
  const over = asset.sizeKb - budget.limitKb;
  const status = over > 0 ? `OVER by ${over.toFixed(1)} KB` : "ok";
  if (over > 0) failures++;
  console.log(`${budget.name.padEnd(20)} ${asset.sizeKb.toFixed(1).padStart(6)} / ${budget.limitKb} KB  ${status}`);
}
console.log(failures > 0 ? "Budget check FAILED" : "Budget check passed");
```

**Output:**

```text
initial JavaScript    184.6 / 170 KB  OVER by 14.6 KB
LCP image              96.2 / 120 KB  ok
CSS                    31.0 / 40 KB  ok
Budget check FAILED
```

In a real pipeline ({{ch:cicd}}), a check like this runs on every pull request and fails the build when a budget is exceeded, so the team must make a conscious decision — optimise, or raise the budget with a reason — instead of discovering the slowdown months later. Budgets can cover sizes (compressed JavaScript, images, fonts) and lab metrics (Lighthouse LCP, total blocking time). Tools such as Lighthouse CI and bundle-size checkers automate this.

### Level 5 — Monitoring

Lab checks catch regressions before release; **field monitoring** catches what lab checks miss — a slow API in one region, a heavy third-party script added through a tag manager, a slow page on a particular device. Dashboards of p75 Core Web Vitals per page, with alerts when they cross thresholds, close the loop ({{ch:monitoring}}).

## From beginner to enterprise

**Level 3 — your own pages.** Images with dimensions, the right size and format; deferred scripts; no huge libraries for small tasks; check with Lighthouse.

**Level 4 — a real application.** Route-based code splitting; lazy loading of heavy features; a CDN with compression and long-lived caching of hashed assets; server rendering for important pages; RUM with the `web-vitals` library.

**Level 5 — professional practice.** Performance budgets in CI; bundle analysis on pull requests; a third-party script inventory and governance; performance considered in design reviews; regular profiling on mid-range devices.

**Level 6 — large organisations.** Dedicated performance teams; field data dashboards by country, device and connection type; experiments measuring the business impact of speed changes; edge rendering and caching close to users ({{ch:cloudfront}}); architecture choices — server components, streaming, islands of interactivity — made with performance as a primary goal.

## Real-world use cases

### A slow product page

- **Field data:** p75 LCP 4.3 s on mobile; CLS 0.22.
- **Investigation:** Lighthouse and the Network panel show a 1.8 MB hero image loaded by JavaScript after hydration; a cookie banner inserted at the top after load; 600 KB of JavaScript including a carousel library and a full date library.
- **Fixes:** hero image moved into server-rendered HTML as AVIF with `srcset`, `fetchpriority="high"` and dimensions; cookie banner given reserved space at the bottom; carousel replaced with CSS scroll snapping; date formatting with `Intl`.
- **Result:** p75 LCP and CLS move into the "good" range; the JavaScript bundle shrinks substantially.

### A sluggish search page

- **Symptom:** INP around 600 ms when typing in a filter on a page listing 3,000 items.
- **Cause (Performance panel):** each keystroke filters and re-renders all 3,000 rows synchronously.
- **Fixes:** debounce input; mark the list update as a transition; virtualise the list; move filtering to a web worker for very large datasets — or to the server.

## Common mistakes

### Beginner: testing only on a fast laptop

**Consequence:** "it's fast for me" while most users suffer. **Fix:** throttle CPU and network in DevTools; test on a real mid-range phone; use field data.

### Beginner: lazy-loading the LCP image

**Consequence:** the most important image loads last. **Fix:** eager loading with high priority for the main image; lazy only below the fold.

### Beginner: images without dimensions

**Consequence:** layout shifts. **Fix:** `width` and `height` on every image.

### Intermediate: importing whole libraries

**Fix:** check bundle impact before adding dependencies; import specific functions; prefer platform features.

### Intermediate: preloading everything

**Consequence:** critical resources compete with non-critical ones. **Fix:** preload only one or two truly critical files.

### Intermediate: judging by averages

**Fix:** use p75 (and look at p90/p95 for your worst-served users).

### Production: unmanaged third-party scripts

**Consequence:** tag managers silently add heavy scripts. **Fix:** inventory, ownership, budgets, loading on interaction.

### Enterprise: optimising once, never monitoring

**Fix:** budgets in CI and field monitoring with alerts.

## Debugging and troubleshooting

- **LCP is slow:** find the LCP element (Lighthouse and the Performance panel identify it). Check when the browser **discovered** it (Network panel's waterfall) and how big it is. Check TTFB.
- **CLS is high:** the Performance panel marks **layout shifts**; hover to see which elements moved. Look for images without dimensions, late-inserted banners and font swaps.
- **INP is high:** record the interaction in the Performance panel; find the long task; check whether the delay is before the handler (input delay), in the handler (processing), or after (rendering).
- **JavaScript is large:** run the bundle analyser; look for duplicates, whole-library imports and code that should be lazy.
- **Lab and field disagree:** lab is one simulated device; field reflects real devices, networks, logged-in states and third-party scripts that the lab test may not include. Trust field data for "how bad", lab for "why".

## Security and performance

Performance and security interact. **Third-party scripts** are both a performance and a security risk; fewer is better on both counts. **Subresource Integrity** (an `integrity` attribute containing a hash on `<script>` and `<link>` tags) ensures a file from a CDN has not been tampered with ({{ch:application-security}}). Caching must never store **private** responses in shared caches: personalised pages and API responses need `Cache-Control: private` or `no-store` ({{ch:caching}}). And be careful with performance monitoring itself: do not send personal data in RUM beacons.

## How a senior engineer thinks about this

- **Measure first, in the field.** They start from real-user p75 data, then use lab tools to find causes.
- **JavaScript is the most expensive byte.** They question every dependency and prefer server rendering, HTML and CSS.
- **Order matters as much as size.** The LCP resource is discovered early and loaded first; everything else waits.
- **Protect the main thread.** Long tasks are broken up; interactions get immediate feedback.
- **Make it hard to regress.** Budgets in CI, monitoring with alerts, and a culture where performance is part of "done".
- **Performance is for everyone.** They design for the slowest common device and network among their users, not for their own laptop.

## Exercises

### Exercise 1 — Read the field data

**Objective:** practise interpreting percentile data.
**The scenario:** for the product page, p75 values are: LCP 2.1 s, INP 380 ms, CLS 0.04. For the category page: LCP 3.4 s, INP 140 ms, CLS 0.18. Which metrics pass, which fail, and what would you investigate first on each page?

<details>
<summary>Show the solution</summary>

**Product page:** LCP good (≤ 2.5 s), CLS good (≤ 0.1), **INP needs improvement** (200–500 ms). Investigate interactions: which ones are slow (add to cart? image gallery? quantity changes?), using RUM with interaction details and the Performance panel. Look for heavy handlers, large re-renders and long tasks from scripts loading when users interact.

**Category page:** INP good (≤ 200 ms), **LCP needs improvement** (2.5–4 s), **CLS needs improvement** (0.1–0.25). Investigate the LCP element (probably the first product image or a banner): is it discovered late, too large, lazy-loaded? Then find what shifts: product images without dimensions, a promotional banner inserted at the top, or filters that change size after loading.

**Lesson:** each metric points to a different kind of problem; fix each page's failing metrics specifically.

</details>

### Exercise 2 — Fix the hero section

**Objective:** practise LCP and CLS techniques.
**Starting point:**

```html
<head>
  <link rel="stylesheet" href="https://fonts.example.com/css?family=Display:400,500,600,700,800">
  <script src="/js/carousel.js"></script>
  <script src="/js/app.js"></script>
</head>
<body>
  <div class="hero" style="background-image: url('/img/hero-4000px.jpg')"></div>
  <div id="promo"></div> <!-- filled by app.js after an API call -->
  <img src="/img/product-1.jpg" loading="lazy">
</body>
```

**What to do:** list the problems and rewrite the markup.

<details>
<summary>Show the solution</summary>

**Problems:**
1. Five font weights from a third-party origin, loaded with a render-blocking stylesheet and no preconnect.
2. Two synchronous scripts in `<head>` block parsing.
3. The hero (likely the LCP element) is a **CSS background** — discovered late, not prioritised, with no responsive sizes — and is a 4,000-pixel JPEG.
4. The promo is inserted later by JavaScript with no reserved space → layout shift.
5. The first product image (possibly visible on load) is lazy-loaded, has no dimensions and no alt text.

**Rewrite:**

```html
<head>
  <link rel="preconnect" href="https://fonts.example.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.example.com/css?family=Display:400,700&display=swap">
  <script src="/js/app.js" defer></script>
</head>
<body>
  <img class="hero" src="/img/hero-1200.avif"
       srcset="/img/hero-800.avif 800w, /img/hero-1200.avif 1200w, /img/hero-2000.avif 2000w"
       sizes="100vw" alt="Fresh mangoes in wooden crates at the farm"
       width="1200" height="600" fetchpriority="high">
  <div id="promo" style="min-height: 120px"></div>
  <img src="/img/product-1.avif" alt="Box of Sindhri mangoes, 5 kg" width="400" height="400">
</body>
```

Two font weights with `display=swap` and a preconnect; one deferred script (the carousel replaced by CSS scroll snapping, or loaded lazily if still needed); the hero as a real, responsive, high-priority `<img>` in a modern format; reserved space for the promo; the first product image loaded normally with dimensions and alt text (lazy loading stays for images further down).

</details>

### Exercise 3 — Debug a slow interaction

**Objective:** practise INP diagnosis.
**The scenario:** clicking "Apply filters" on an orders page freezes the page for about 800 ms. The Performance panel shows one long task in the click handler: it sorts 20,000 orders, computes statistics for each, rebuilds a 20,000-row table, and sends an analytics event synchronously. Propose fixes, in order.

<details>
<summary>Show the solution</summary>

1. **Give immediate feedback**: on click, first update the button state and show a loading indicator, then yield before doing the heavy work, so the user sees a response within one frame.
2. **Render less**: virtualise the table so only visible rows are in the DOM — rebuilding 20,000 rows is likely the largest cost (style, layout and paint, not just JavaScript).
3. **Move the data work**: filtering, sorting and statistics for 20,000 records should happen on the **server** (with pagination), or at least in a **web worker**, off the main thread.
4. **Defer non-essential work**: send the analytics event asynchronously after the update (for example with `sendBeacon` or in an idle callback).
5. **Break up any remaining work** into chunks with `scheduler.yield()` or `setTimeout`.
6. **Measure again** with the Performance panel and RUM INP data.

</details>

### Exercise 4 — Production scenario: protect performance in a growing team

**Objective:** design processes that keep a site fast.
**The scenario:** your company's site was optimised last year, but field LCP and INP have steadily worsened as features were added by six teams. Propose a plan to stop the decline and keep performance healthy.

<details>
<summary>Show the solution</summary>

1. **Make it visible:** a shared dashboard of field p75 LCP, INP and CLS per key page and device type; weekly review; alerts when a metric crosses a threshold.
2. **Budgets in CI:** bundle-size limits for initial JavaScript per route, image size limits, and Lighthouse CI on key pages; pull requests that exceed budgets fail with a clear report, and raising a budget requires an explicit, reviewed decision.
3. **Ownership:** each key page has an owning team responsible for its metrics; performance is part of the Definition of Done ({{ch:agile-and-scrum}}).
4. **Third-party governance:** an inventory of every external script, with an owner and a business justification; new tags require review; heavy widgets loaded on interaction.
5. **Dependency review:** adding a dependency over a size threshold requires review; bundle analysis shown on pull requests.
6. **Architecture:** move suitable pages to server rendering / server components; route-based splitting enforced by the framework.
7. **Education:** a short internal guide and examples of good patterns (LCP image, lazy features, transitions).
8. **Celebrate wins:** report improvements in business terms (conversion, bounce rate), which keeps performance a priority.

</details>

## Summary

Front-end performance is how quickly and smoothly pages load and respond for **real users on real devices**. Between a click and a usable page lie DNS, connection set-up, server time, HTML parsing, render-blocking CSS, JavaScript on the single main thread, layout, paint and hydration. JavaScript is usually the most expensive resource, because it must be parsed and executed on the main thread.

The **Core Web Vitals** measure the three things users feel: **LCP** (main content appears; good ≤ 2.5 s), **INP** (response to interactions; good ≤ 200 ms) and **CLS** (visual stability; good ≤ 0.1), judged at the **75th percentile** of real visits. Measure with lab tools (Lighthouse, the Performance and Network panels) to find causes, and field data (CrUX, RUM with `web-vitals`) to know what users experience.

Send less: analyse bundles, tree-shake, split code by route and feature, render on the server, prefer HTML and CSS features, and govern third-party scripts. Optimise images (format, size, priority, dimensions), fonts (few, WOFF2, subset, `font-display`) and CSS. Load in the right order with preconnect, preload and prefetch, compress text with Brotli or gzip, and cache hashed assets for a long time behind a CDN. Keep the main thread free by giving immediate feedback, breaking up long tasks, debouncing, rendering less, and using web workers. Protect the gains with **performance budgets** in CI and continuous field monitoring.

## Key terms

- **Front-end performance** — How quickly and smoothly a web page loads, becomes usable and responds on real devices and networks.
- **Latency** — The time it takes for a request to travel to a server and for the response to begin returning.
- **Critical rendering path** — The steps the browser must complete before it can display the first content of a page.
- **Main thread** — The browser thread that runs JavaScript, calculates styles and layout, and handles user input.
- **Long task** — Work that occupies the main thread for more than 50 milliseconds, blocking responses to the user.
- **Time to First Byte (TTFB)** — The time until the first byte of a page's HTML reaches the browser.
- **First Contentful Paint (FCP)** — The moment the browser first displays any text or image.
- **Largest Contentful Paint (LCP)** — A Core Web Vital measuring when the largest visible content element is displayed.
- **Interaction to Next Paint (INP)** — A Core Web Vital measuring how long the page takes to visually respond to user interactions.
- **Cumulative Layout Shift (CLS)** — A Core Web Vital measuring how much visible content moves unexpectedly.
- **Core Web Vitals** — Google's three key user-experience metrics: LCP, INP and CLS.
- **Percentile** — The value below which a given percentage of measurements fall, such as the 75th percentile.
- **Lab data** — Performance measurements from controlled, simulated tests.
- **Field data (RUM)** — Performance measurements collected from real users' browsers.
- **Lighthouse** — A tool that audits a page's performance, accessibility and best practices in a simulated environment.
- **Hydration** — Loading JavaScript that attaches interactivity to HTML that was rendered on the server.
- **Bundle** — A JavaScript file produced by a build tool combining many modules.
- **Bundle analyser** — A tool that shows which modules make up a bundle and how large each is.
- **Tree shaking** — The removal of unused exported code from bundles during the build.
- **Code splitting** — Dividing JavaScript into chunks that are loaded only when needed.
- **Lazy loading** — Delaying the loading of a resource or component until it is needed.
- **Resource hint** — An instruction such as preconnect, preload or prefetch that helps the browser load resources earlier.
- **fetchpriority** — An HTML attribute that tells the browser how important a resource is to fetch.
- **Brotli** — A compression algorithm used to make text resources smaller during transfer.
- **Content hashing** — Including a hash of a file's contents in its name so it can be cached indefinitely and replaced when it changes.
- **CDN (content delivery network)** — A network of servers around the world that delivers content from locations close to users.
- **Third-party script** — JavaScript from an external provider, such as analytics or advertising, included in a page.
- **Web worker** — A background thread in the browser that runs JavaScript without blocking the main thread.
- **Yielding** — Ending a task early so the browser can handle input and painting before work continues.
- **Performance budget** — An agreed limit on resource sizes or metrics that automated checks enforce.

## What comes next

Fast pages are one part of being found and chosen online. The next chapter, {{ch:seo}}, covers how search engines discover, crawl, render and rank pages — and what developers control: crawlable links, server-rendered content, metadata, structured data, sitemaps, canonical URLs and the page-experience signals you just learned to measure.
