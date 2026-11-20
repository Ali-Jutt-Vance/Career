# SEO: Being Found by Search Engines

> [!GOALS]
> - Explain how search engines discover, crawl, render, index and rank pages — and which parts developers control.
> - Make pages **crawlable** and **indexable**: real links, server-rendered content, correct status codes, `robots.txt`, `noindex` and sitemaps.
> - Write titles, meta descriptions and headings that help both search engines and people.
> - Use **canonical URLs** and redirects to avoid duplicate content, and design clean, stable URLs.
> - Add **structured data** (JSON-LD with schema.org) for rich results — safely.
> - Handle JavaScript-heavy sites, multiple languages (`hreflang`) and mobile-first indexing.
> - Use Google Search Console and other tools to find and fix problems, and avoid practices that get sites penalised.

## Why this matters

A corner shop can have the best mangoes in Lahore, a beautiful website and fair prices — and still sell nothing online if nobody can find it. For most websites, a large share of new visitors arrive from **search engines**: someone types "buy Chaunsa mangoes Lahore" and clicks one of the first few results. Being on page one or page five can decide whether a business survives.

**Search engine optimisation (SEO)** is the practice of making pages easy for search engines to find, understand and recommend. Much of SEO is about **content** and reputation — writing genuinely useful pages, earning links from other sites — which is the work of marketers and writers. But a surprising amount is **engineering**, and developers can destroy a site's search visibility by accident:

- A redesign changes every URL without redirects, and years of search ranking disappear overnight.
- A new single-page application renders content only with JavaScript after a click, and search engines index empty pages.
- A staging site's "do not index" setting is copied to production, and the whole site drops out of search.
- A filter system creates millions of near-identical URLs, and search engines waste their time crawling junk instead of real products.
- Product pages return "200 OK" for products that no longer exist, so search results fill with dead pages.

None of this needs marketing expertise to prevent — it needs developers who understand how search engines work. This chapter teaches that, with Google as the main example because it handles most searches worldwide; other engines such as Bing work on the same principles.

## The simple idea

Think of a vast library with a librarian who wants to help every visitor find the best book for their question. The librarian must:

1. **Find** every book — by following references from books already on the shelves, and by reading lists that publishers send.
2. **Read** each book and note what it is about.
3. **File** it in the catalogue under the right subjects.
4. **Recommend** the best books when a visitor asks a question.

A search engine is that librarian for the web. SEO for developers means making your books easy to find (clear references to them), easy to read (content in plain view, not locked in a box that must be opened first), correctly titled and labelled, and not duplicated under ten different covers.

> [!ANALOGY]
> A search engine is like a librarian who finds books by following references, reads and catalogues each one, and recommends the best answers to visitors' questions.
>
> **Where the analogy breaks:** this librarian is a program reading billions of pages, with limited time for each site; it re-reads pages repeatedly to see if they changed; and it judges quality partly by how many other trustworthy pages link to yours — something a human librarian would not normally count. It also cannot ask you what a page means: it only understands what is in the page's code.

## The proper definition and key words

**Search engine optimisation (SEO)** is the practice of improving a website so that search engines can discover, understand and rank its pages well for relevant searches.

The key words:

- **Crawler** (spider, bot) — the program that fetches web pages by following links. Google's is called **Googlebot**.
- **Crawling** — fetching pages. **Crawl budget** — roughly, how many pages a search engine is willing to fetch from your site in a period.
- **Rendering** — running a page's JavaScript to see the final content, as a browser would.
- **Indexing** — analysing a page and storing it in the search engine's database (the **index**), so it can appear in results.
- **Ranking** — ordering indexed pages for a particular search query.
- **SERP** (search engine results page) — the page of results a user sees.
- **Organic results** — unpaid search results, as opposed to advertisements.
- **Canonical URL** — the preferred URL for content that is available at several addresses.
- **Structured data** — machine-readable information about a page (a product's price, a recipe's cooking time), usually using the **schema.org** vocabulary.
- **Rich result** — an enhanced search result, such as star ratings, prices or breadcrumbs, generated from structured data.

## How it works inside: crawl, render, index, rank

```text
     ┌────────────┐   URLs from links,   ┌────────────┐
     │  URL queue │◀── sitemaps, ────────│  previous  │
     └─────┬──────┘    Search Console    │   crawls   │
           │                             └────────────┘
           ▼
     1. CRAWL      fetch the URL (respecting robots.txt)
           │        → status code, headers, HTML
           ▼
     2. RENDER     run JavaScript in a headless browser (may happen later)
           │        → final DOM, discovered links
           ▼
     3. INDEX      understand content, language, canonical URL,
           │        structured data; store (or decide not to)
           ▼
     4. RANK       for each search: relevance, quality, page
                    experience, links, location, language...
```

### Level 2 — Crawling

Googlebot starts from URLs it already knows and discovers new ones by **following links** (`<a href="...">`) in pages it fetches, and from **sitemaps** you submit. For each URL, it first checks your site's `robots.txt` file to see whether it is allowed to fetch it. It then fetches the page and records the **HTTP status code** ({{ch:how-the-web-works}}), headers and HTML.

Search engines crawl politely, adjusting how fast they fetch based on how quickly and reliably your server responds. A slow or error-prone server gets crawled less. For large sites, **crawl budget** matters: if your site generates millions of useless URLs, the crawler spends its time on them instead of on your important pages.

### Level 2 — Rendering

Google's crawler uses an up-to-date version of the Chromium browser to **run JavaScript** and see the final page. But rendering costs a great deal of computation, so it may happen **later** than the initial fetch — and if your content depends on JavaScript, indexing it may be slower and less reliable. Content that appears only after a user action (a click, a scroll that triggers loading, typing) is generally **not** seen at all, because the crawler does not click or type. Other search engines and many social-media link previews run little or no JavaScript.

This is why **server-rendered HTML** — content present in the HTML response itself — remains the most reliable way to be indexed ({{ch:nextjs}}).

### Level 2 — Indexing

The search engine analyses the rendered page: its title, headings, text, images (with alt text), links, language, structured data and **canonical URL**. It decides whether the page is worth indexing — duplicates, thin pages with little content, error pages and pages marked `noindex` are left out — and groups duplicates together, choosing one canonical version.

### Level 2 — Ranking

When someone searches, the engine finds indexed pages relevant to the query and orders them. The exact algorithms are secret and change often, but Google publicly describes the broad factors:

- **Relevance** — does the page's content match the meaning of the query?
- **Quality and helpfulness** — is the content useful, original and trustworthy? Google's public guidance emphasises "helpful, reliable, people-first content" and signals of experience, expertise, authoritativeness and trustworthiness (often abbreviated E-E-A-T).
- **Links** — links from other reputable sites act as votes of confidence.
- **Page experience** — mobile-friendliness, HTTPS, and the Core Web Vitals ({{ch:frontend-performance}}). These matter, but mostly as a tie-breaker between similarly relevant pages; a fast page with poor content will not outrank a great one.
- **Context** — the searcher's location, language and device.

Developers mostly influence crawling, rendering, indexing and page experience. Content and links are mostly the business's job — but they cannot succeed if the technical foundation is broken.

## Making pages crawlable

### Level 3 — Real links

Crawlers discover pages through `<a href="...">` links. Anything else may be invisible:

```html
<!-- Crawlable: a real link with a real URL -->
<a href="/fruit/mangoes">Mangoes</a>

<!-- Not crawlable: no href; navigation happens only in JavaScript -->
<span onclick="goTo('/fruit/mangoes')">Mangoes</span>

<!-- Not crawlable as separate pages: fragment-only URLs -->
<a href="#/fruit/mangoes">Mangoes</a>
```

- Use real `<a href>` elements for navigation — which you should do anyway for accessibility ({{ch:html}}). Client-side routers in React frameworks render real anchors and intercept clicks, so you get both fast navigation and crawlable links ({{ch:nextjs}}).
- Give every important page its **own URL** with a real path. Old single-page applications used `#` fragments for routes; search engines treat everything after `#` as part of one page.
- Make sure every important page is reachable through links from other pages — **internal linking**. Pages with no links pointing to them ("orphan pages") are hard to discover and are treated as unimportant. Category pages, breadcrumbs and "related products" links help.
- Descriptive link text ("Chaunsa mangoes") tells crawlers what the target page is about ({{ch:html}}).

### Level 3 — `robots.txt`

`robots.txt` is a plain-text file at the root of your site (`https://cornershop.example/robots.txt`) that tells crawlers which paths they may fetch:

```text
User-agent: *
Disallow: /cart
Disallow: /checkout
Disallow: /account/
Disallow: /search

Sitemap: https://cornershop.example/sitemap.xml
```

- `User-agent: *` — these rules apply to all crawlers.
- `Disallow: /cart` — do not fetch URLs starting with `/cart`. Carts, checkouts, accounts and internal search result pages have no value in search results and waste crawl budget.
- `Sitemap:` — where to find the sitemap.

Two important facts:

1. **`robots.txt` controls crawling, not indexing.** A disallowed URL can still appear in results (usually without a description) if other sites link to it, because the search engine knows the URL exists but cannot read it.
2. **It is not security.** Anyone can read `robots.txt`, and badly behaved bots ignore it. Never use it to "hide" private pages — protect them with authentication ({{ch:authentication}}). Listing secret paths in it actually advertises them.

### Level 3 — `noindex`: keeping pages out of results

To keep a page out of the index, allow it to be crawled and mark it **`noindex`**:

```html
<meta name="robots" content="noindex">
```

or with an HTTP response header (useful for PDFs and other non-HTML files):

```text
X-Robots-Tag: noindex
```

The crawler must be **allowed to fetch** the page to see the `noindex` instruction — so do not also block it in `robots.txt`. Use `noindex` for thank-you pages, internal search results, thin tag pages, and — critically — **staging and test environments**.

> [!WARNING]
> A very common, very costly mistake: a staging environment is correctly set to `noindex` (or blocked entirely), and that setting is deployed to **production** with a release. Within days, the whole site disappears from search results. Make indexing settings depend on the environment explicitly, and add an automated check to production deployments that the home page does **not** contain `noindex` ({{ch:cicd}}). Better still, protect staging with a password, so it cannot be indexed at all.

### Level 3 — Status codes matter

Crawlers rely on HTTP status codes ({{ch:how-the-web-works}}) to understand what happened:

| Situation | Correct response | Common mistake |
|---|---|---|
| Page exists | `200 OK` | — |
| Page moved permanently (new URL) | `301 Moved Permanently` (or `308`) to the new URL | Leaving the old URL as a 404, losing its ranking |
| Temporary redirect | `302 Found` (or `307`) | Using 302 for permanent moves |
| Page does not exist | `404 Not Found` | A "Sorry, not found" page returned with `200` — a **soft 404** |
| Page removed for good | `410 Gone` (or 404) | Redirecting everything to the home page |
| Server error | `500`/`503` | — (but frequent errors reduce crawling) |
| Temporarily down for maintenance | `503 Service Unavailable` with `Retry-After` | Returning 200 with a maintenance message, which can get indexed |

**Soft 404s** are a particular problem with JavaScript applications: the server returns `200` for every URL, and the app shows "Product not found" in the browser. Search engines then index error pages. Make sure unknown URLs return a real `404` status from the server ({{ch:nextjs}}, {{ch:rest-apis}}).

When products are discontinued, a good approach is to keep the page (with a clear "no longer available" message and links to alternatives) if it still has value, redirect it with `301` to the closest replacement if there is one, or return `404`/`410`. Redirecting every old URL to the home page is treated like a soft 404.

### Level 3 — Sitemaps

A **sitemap** is an XML file listing the URLs you want indexed, helping search engines discover pages — especially new ones, and ones that are not well linked:

```ts
type SitemapEntry = { path: string; lastModified: Date };

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildSitemap(origin: string, entries: SitemapEntry[]): string {
  const urls = entries.map(
    (e) =>
      `  <url>\n    <loc>${escapeXml(new URL(e.path, origin).toString())}</loc>\n` +
      `    <lastmod>${e.lastModified.toISOString().slice(0, 10)}</lastmod>\n  </url>`,
  );
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

console.log(
  buildSitemap("https://cornershop.example", [
    { path: "/", lastModified: new Date("2026-06-01T10:00:00Z") },
    { path: "/fruit/mangoes?variety=sindhri&box=5kg", lastModified: new Date("2026-06-03T08:30:00Z") },
  ]),
);
```

**Output:**

```text
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cornershop.example/</loc>
    <lastmod>2026-06-01</lastmod>
  </url>
  <url>
    <loc>https://cornershop.example/fruit/mangoes?variety=sindhri&amp;box=5kg</loc>
    <lastmod>2026-06-03</lastmod>
  </url>
</urlset>
```

- Each `<url>` contains the absolute URL in `<loc>` and, optionally, the date it last meaningfully changed in `<lastmod>`.
- URLs must be **escaped** for XML: the `&` in the query string became `&amp;`, otherwise the file is invalid XML.
- `new URL(path, origin)` builds a correct absolute URL ({{ch:browser-and-dom}}).
- A single sitemap can list up to 50,000 URLs (and 50 MB uncompressed); larger sites use several sitemaps listed in a **sitemap index** file.
- List only canonical, indexable URLs that return 200. A sitemap full of redirects and 404s teaches search engines to distrust it.
- Generate sitemaps automatically from your database or routes, so they stay current ({{ch:nextjs}} provides a built-in way). Submit them in Google Search Console and reference them in `robots.txt`.
- `lastmod` should reflect real content changes; setting every page to "today" on every build makes it useless.

## Helping search engines understand pages

### Level 3 — Titles and meta descriptions

The `<title>` is one of the strongest signals of what a page is about, and it is usually the clickable headline in results ({{ch:html}}):

```html
<title>Chaunsa Mangoes, 5 kg Box — Same-Day Delivery in Lahore | Corner Shop</title>
<meta name="description" content="Order fresh Chaunsa mangoes from Multan, delivered the same day in Lahore. Rs 2,600 per 5 kg box, cash on delivery available.">
```

- **Unique for every page**, describing that page specifically — not "Corner Shop" everywhere.
- **Main topic first**, site name last.
- **Reasonably short**: search engines truncate long titles in results (the display limit is based on pixel width, roughly 50–60 characters).
- The **meta description** does not directly affect ranking, but search engines often show it under the title, so it influences whether people click. Write it as a clear, honest summary; around 150 characters. Search engines may choose other text from the page if they judge it more relevant.

### Level 3 — Headings and content

- One clear `<h1>` stating the page's main topic, and a logical heading outline ({{ch:html}}).
- **Text in HTML**, not inside images. Search engines read alt text, but the main content should be real text.
- Content that answers what people search for, in the words they use ("delivery time", "price per kg"), written for people — not stuffed with repeated keywords.
- Descriptive **alt text** on images helps image search and accessibility at the same time.

### Level 3 — Clean URLs

```text
Good:  https://cornershop.example/fruit/mangoes/chaunsa-5kg
Poor:  https://cornershop.example/p.php?id=8823&cat=3&sessionid=a8f7e2
```

- **Readable**, using words separated by hyphens (a **slug**).
- **Stable**: a URL is a promise; changing it loses accumulated ranking unless you redirect.
- **Lowercase** and consistent (decide on trailing slashes one way, and redirect the other).
- **No session ids or tracking parameters** in internal links.

```ts
function slugify(text: string): string {
  return text
    .normalize("NFKD")                 // split accented letters into letter + accent
    .replace(/[\u0300-\u036f]/g, "")   // remove the accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")       // anything else becomes a hyphen
    .replace(/^-+|-+$/g, "");          // no hyphens at the ends
}

console.log(slugify("Chaunsa Mangoes – 5 kg Box!"));
console.log(slugify("Café Crème & Biscuits"));
```

**Output:**

```text
chaunsa-mangoes-5-kg-box
cafe-creme-and-biscuits
```

- `normalize("NFKD")` decomposes characters such as "é" into "e" plus a separate accent mark, which the next line removes — so "Café" becomes "cafe".
- The rest replaces every run of other characters with a single hyphen and trims hyphens at the ends ({{ch:functional-programming}} — this is a small pipeline of pure steps).
- For non-Latin scripts such as Urdu, many sites keep a transliterated or English slug, or use the original script in the URL (which browsers display, but percent-encode in requests — {{ch:html}}). Choose deliberately and consistently.
- Store the slug when the product is created; do not regenerate it when the name changes, or the URL changes too (or redirect the old one).

### Level 4 — Duplicate content and canonical URLs

The same content is often reachable at several URLs:

```text
https://cornershop.example/fruit/mangoes/chaunsa-5kg
https://cornershop.example/fruit/mangoes/chaunsa-5kg?utm_source=newsletter
https://cornershop.example/offers/chaunsa-5kg
http://www.cornershop.example/fruit/mangoes/chaunsa-5kg
```

Search engines must choose one to show, and signals such as links are split between the duplicates. Tell them which version is preferred with a **canonical link**:

```html
<link rel="canonical" href="https://cornershop.example/fruit/mangoes/chaunsa-5kg">
```

Combine this with **permanent redirects** for host and protocol variants: every `http://` URL redirects to `https://`, and `www` redirects to the bare domain (or the reverse) — one consistent host ({{ch:nginx-reverse-proxy}}, {{ch:tls-ssl}}).

### Level 4 — Faceted navigation

Shops let users filter by size, price, colour, brand and sort order. Each combination can produce a URL: `/mangoes?size=5kg&sort=price&page=3&ripeness=ripe`. With a handful of filters, the number of combinations explodes into millions of near-duplicate pages — wasting crawl budget and diluting signals.

Common strategies:

- Decide which filtered pages are **valuable as landing pages** (for example, "Sindhri mangoes" as a category) and give those clean URLs, unique titles and content.
- Point other combinations' canonical tags at the main category page, and/or mark them `noindex`.
- Keep sort-order and display parameters out of links that crawlers follow, or disallow their crawling.
- Keep **paginated** lists crawlable with normal links to the next pages, each page with its own URL.

## Structured data

### Level 3 — What it is

**Structured data** describes a page's content in a standard, machine-readable vocabulary — **schema.org**, created jointly by the major search engines. Search engines use it to understand pages precisely and to show **rich results**: prices and stock status, star ratings, breadcrumbs, event dates, recipes, FAQ answers and more.

The recommended format is **JSON-LD**: a JSON object inside a `<script type="application/ld+json">` element.

### Level 3 — A product example — and a security trap

```ts
type Product = {
  name: string;
  description: string;
  imageUrl: string;
  sku: string;
  pricePaisa: number;
  inStock: boolean;
  url: string;
  rating?: { value: number; count: number };
};

function productJsonLd(p: Product): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.imageUrl,
    sku: p.sku,
    offers: {
      "@type": "Offer",
      url: p.url,
      priceCurrency: "PKR",
      price: (p.pricePaisa / 100).toFixed(2),
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(p.rating && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating.value, reviewCount: p.rating.count },
    }),
  };
}

// Safe embedding: escape "<" so the data can never close the <script> element
function jsonLdScript(data: object): string {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

const product: Product = {
  name: "Chaunsa Mangoes, 5 kg",
  description: "Sweet Chaunsa mangoes </script><script>alert('x')</script>",
  imageUrl: "https://cornershop.example/img/chaunsa.jpg",
  sku: "CH-5KG",
  pricePaisa: 260000,
  inStock: true,
  url: "https://cornershop.example/fruit/mangoes/chaunsa-5kg",
  rating: { value: 4.7, count: 132 },
};

console.log(jsonLdScript(productJsonLd(product)));
```

**Output:**

```text
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Chaunsa Mangoes, 5 kg","description":"Sweet Chaunsa mangoes \u003c/script>\u003cscript>alert('x')\u003c/script>","image":"https://cornershop.example/img/chaunsa.jpg","sku":"CH-5KG","offers":{"@type":"Offer","url":"https://cornershop.example/fruit/mangoes/chaunsa-5kg","priceCurrency":"PKR","price":"2600.00","availability":"https://schema.org/InStock"},"aggregateRating":{"@type":"AggregateRating","ratingValue":4.7,"reviewCount":132}}</script>
```

Walk through it:

- `@context` names the vocabulary (schema.org); `@type` names the kind of thing (`Product`, with a nested `Offer` and `AggregateRating`).
- The property names (`name`, `offers`, `priceCurrency`, `availability`...) come from schema.org's definitions. Search engines document which properties each rich result requires.
- `...(p.rating && {...})` adds the rating object only when there is a rating (spreading `undefined` adds nothing — {{ch:objects}}).
- **The security point:** product descriptions often come from staff or suppliers — and here one contains `</script>`. If the JSON were inserted into the page as-is, the browser's HTML parser would see `</script>`, **end the script element early**, and then run the attacker's `<script>`. This is a real cross-site scripting vector ({{ch:html}}). Replacing every `<` with the JSON escape `\u003c` keeps the JSON valid (it still means `<` when parsed as JSON) while making it impossible to close the element. Frameworks' helpers should do this for you; if you build JSON-LD by hand, do it yourself.

Rules for structured data:

- It must **describe content that is visible on the page**. Marking up a 4.7-star rating that the page does not show, or reviews that do not exist, violates search engines' guidelines and can lead to manual penalties.
- **Keep it accurate**: price and availability must match the page (and the checkout).
- Validate it with Google's **Rich Results Test** and the schema.org validator.
- Rich results are **never guaranteed**; structured data makes a page eligible, and the search engine decides.

Other useful types include `BreadcrumbList` (the path shown in results), `Organization` (logo and contact details), `LocalBusiness` (address, opening hours — important for a physical shop), `Article`, `Event` and `Recipe`.

## JavaScript-heavy sites

### Level 4 — Rendering strategies and SEO

How your pages are rendered decides what crawlers see first ({{ch:nextjs}}):

| Strategy | What the first HTML response contains | SEO |
|---|---|---|
| **Client-side rendering (CSR)** | An almost empty page; JavaScript builds the content | Weakest: depends on the crawler rendering JavaScript, later and less reliably; link previews often empty |
| **Server-side rendering (SSR)** | Complete HTML for each request | Strong |
| **Static site generation (SSG)** | Complete HTML generated at build time | Strong, and very fast |
| **Incremental / revalidated static** | Complete HTML, regenerated periodically | Strong |

For pages that should rank — products, categories, articles, landing pages — render the content on the server. Keep purely client-side rendering for pages behind login (dashboards, account pages), which should not be indexed anyway.

Other JavaScript pitfalls:

- **Content behind interactions**: product descriptions in tabs that load only when clicked, or reviews that load on scroll, may never be indexed. Render them in the HTML (hidden tabs are fine if the content is in the DOM).
- **Metadata set only in the browser**: titles and canonical tags inserted by client-side JavaScript may be missed by crawlers and are certainly missed by link-preview bots. Set them on the server.
- **Blocked resources**: if `robots.txt` blocks your JavaScript or CSS files, the crawler cannot render the page properly.
- **Infinite scroll without URLs**: give each "page" of an infinite list a real URL and real links, so crawlers can reach item 500.

### Level 4 — Mobile-first indexing

Google now indexes and ranks primarily based on the **mobile** version of pages. If your mobile layout hides content, structured data or links that the desktop version shows, that content effectively does not exist for search. With responsive design ({{ch:css}}), the same HTML serves both, which avoids the problem.

## International sites

### Level 4 — `hreflang`

If you have the same content in several languages or for several regions, tell search engines which version suits which users with **`hreflang`** annotations:

```html
<link rel="alternate" hreflang="en" href="https://cornershop.example/en/fruit/mangoes">
<link rel="alternate" hreflang="ur" href="https://cornershop.example/ur/fruit/mangoes">
<link rel="alternate" hreflang="x-default" href="https://cornershop.example/en/fruit/mangoes">
```

- Each language version lists **all** versions, including itself — the annotations must be reciprocal, or they are ignored.
- Values are language codes (`en`, `ur`), optionally with a region (`en-GB`, `en-PK`).
- `x-default` is the fallback for users who match none.
- Each version keeps its own canonical URL (pointing to itself, not to the English version).
- Set the `lang` attribute on the `html` element to match ({{ch:html}}), and write titles and descriptions in each language.

Use separate URLs for languages (paths such as `/ur/` or subdomains), not automatic redirects based on the visitor's IP address or browser language — crawlers usually come from one country and would only ever see one version.

## Measuring and debugging SEO

### Level 3 — Google Search Console

**Google Search Console** is a free service for site owners (you prove ownership by adding a DNS record or a file — {{ch:dns}}). It shows:

- **Which pages are indexed**, which are not, and **why** ("Crawled — currently not indexed", "Duplicate without user-selected canonical", "Excluded by noindex", "Soft 404", "Blocked by robots.txt").
- **URL Inspection**: fetch one URL as Googlebot, see the rendered HTML and screenshot, the chosen canonical, and request indexing.
- **Performance**: the searches for which your pages appeared, impressions, clicks, average position.
- **Core Web Vitals** from real Chrome users, rich result status, and manual action notices.

Bing Webmaster Tools offers similar features for Bing.

### Level 3 — Other tools

- **Lighthouse's SEO audit** — basic checks: title, description, status code, crawlable links, `hreflang` validity.
- **Rich Results Test** — validates structured data and shows which rich results a page is eligible for.
- **Crawlers you run yourself** (several commercial and open-source "site crawler" tools exist) — crawl your own site like a search engine to find broken links, redirect chains, missing titles, duplicate titles, orphan pages and `noindex` pages.
- **Server logs** — show what search-engine bots actually request, how often, and which status codes they receive ({{ch:logging}}). Verify that a "Googlebot" in your logs really is Google (by reverse DNS lookup); its user-agent string is easy to fake.

## What not to do

Search engines publish **spam policies**, and violating them can lead to ranking drops or **manual actions** (penalties applied by human reviewers). Practices to avoid:

- **Keyword stuffing** — repeating search terms unnaturally.
- **Hidden text** — text coloured like the background or positioned off-screen to fool crawlers.
- **Cloaking** — showing search engines different content from what users see.
- **Link schemes** — buying links, or large-scale link exchanges meant to manipulate ranking.
- **Scaled low-value content** — mass-producing pages (by hand, by templates or by AI) with little original value to capture searches.
- **Doorway pages** — many near-identical pages targeting slight variations of a query ("mangoes Lahore", "mangoes in Lahore city", "Lahore mangoes delivery") that all lead to the same place.
- **Misleading structured data** — markup for content that is not on the page.

The durable strategy is simple: make genuinely useful pages, make them technically easy to crawl and understand, and make them fast.

## From beginner to enterprise

**Level 3 — a single site.** Unique titles and descriptions; real links; one `h1`; alt text; HTTPS; a `robots.txt` and sitemap; correct 404s.

**Level 4 — a real product.** Server-rendered public pages; canonical URLs and redirects; structured data for products and breadcrumbs; generated sitemaps; Search Console set up and monitored; environment-specific indexing settings.

**Level 5 — professional practice.** Automated checks in CI for `noindex`, canonical tags, titles and structured data on key templates; redirect maps planned before URL changes; facet and parameter strategy; Core Web Vitals monitoring; collaboration with marketing on content and with legal on structured-data claims such as reviews.

**Level 6 — large organisations.** Sites with millions of URLs managing crawl budget through log analysis; international `hreflang` at scale; migrations of entire domains with careful redirect plans, monitored daily; programmatic landing pages governed for quality; SEO requirements included in platform and framework choices.

## Real-world use cases

### Migrating a shop to a new platform

- **Risk:** every URL changes; years of ranking are lost.
- **Plan:** crawl the old site and export every indexed URL; map each old URL to the most relevant new URL; implement `301` redirects for all of them (not to the home page); keep titles, content and structured data at least as good; update internal links and sitemaps to the new URLs; launch, then watch Search Console's indexing and 404 reports daily for weeks.
- **Result when done well:** a short dip, then recovery. When done badly: a long-term loss of traffic.

### A JavaScript storefront with poor indexing

- **Symptom:** Search Console shows many product pages "Discovered — currently not indexed"; URL Inspection's rendered screenshot shows a spinner.
- **Cause:** client-side rendering with data fetched after load; titles set by JavaScript.
- **Fix:** server-render product and category pages ({{ch:nextjs}}), set metadata on the server, return real 404s for unknown products, add product structured data.

## Common mistakes

### Beginner: the same title on every page

**Fix:** unique, descriptive titles generated from each page's content.

### Beginner: navigation without real links

**Fix:** `<a href>` for every navigational element.

### Intermediate: soft 404s

**Fix:** real `404`/`410` status codes for missing content.

### Intermediate: changing URLs without redirects

**Fix:** permanent redirects from every old URL to its new equivalent; plan before changing.

### Intermediate: blocking a page in robots.txt to remove it

**Consequence:** it stays in the index (the crawler cannot see the `noindex`). **Fix:** allow crawling and use `noindex`, or return 404/410.

### Production: staging `noindex` deployed to production

**Fix:** environment-specific configuration and an automated post-deployment check.

### Production: unescaped JSON-LD

**Consequence:** cross-site scripting through product data. **Fix:** escape `<` in embedded JSON, or use the framework's safe helper.

### Enterprise: uncontrolled faceted URLs

**Consequence:** crawl budget wasted on millions of filter combinations. **Fix:** a deliberate facet strategy with canonicals, `noindex` and controlled linking.

## Debugging and troubleshooting

- **A page is not in Google:** inspect the URL in Search Console. Is it known? Crawled? Blocked by `robots.txt`? Marked `noindex`? Canonicalised to another URL? Considered a duplicate or soft 404? The report usually says.
- **The wrong URL appears in results:** check canonical tags, redirects, internal links and sitemap entries — they should all agree on one URL.
- **Search results show an old title or price:** the page has not been recrawled yet, or the search engine chose different text; request recrawling, check what the server actually returns, and keep structured data consistent.
- **Link previews on social apps show nothing:** metadata (Open Graph tags — {{ch:html}}) is set by client-side JavaScript; render it on the server.
- **Traffic dropped suddenly:** check for `noindex`, `robots.txt` changes, mass redirects, server errors, or a manual action notice in Search Console — then check whether a search-engine algorithm update was announced.

## Security and performance

**Security.** Escape structured data and all user-provided content in pages ({{ch:html}}). Do not rely on `robots.txt` to hide anything. Protect staging environments with authentication. Be careful with redirect features that take a URL from a query parameter (`/go?to=...`): if they redirect anywhere, attackers use your trusted domain to send people to phishing sites — an **open redirect**. Allow only known destinations ({{ch:application-security}}).

**Performance.** Page experience, including the Core Web Vitals, is part of ranking; fast server responses also let crawlers fetch more pages. Everything in {{ch:frontend-performance}} supports SEO.

## How a senior engineer thinks about this

- **SEO is mostly correctness.** Real links, real status codes, server-rendered content, unique metadata and consistent URLs are just good web engineering.
- **URLs are permanent promises.** They design URL structures carefully and never change them without redirects.
- **Every environment has explicit indexing rules**, checked automatically.
- **Structured data is data.** It is generated from the same source as the page, kept accurate and escaped safely.
- **Measure with Search Console and logs**, not guesses; work with marketing on content and with product on URL design.

## Exercises

### Exercise 1 — Audit a product page

**Objective:** practise spotting technical SEO problems.
**Starting point:** a product page's server response:

```html
HTTP/1.1 200 OK

<html>
<head>
  <title>Corner Shop</title>
  <meta name="robots" content="noindex">
</head>
<body>
  <div id="app"></div>
  <script src="/bundle.js"></script>
</body>
</html>
```

The product is discontinued, and `bundle.js` shows "This product is no longer available" after fetching from the API. List the problems and describe the correct response.

<details>
<summary>Show the solution</summary>

**Problems:**
1. **Generic title** — every page called "Corner Shop".
2. **`noindex`** — possibly leaked from staging; it removes the page from search.
3. **Client-side rendering only** — the HTML contains no content; crawlers depend on JavaScript rendering.
4. **Soft 404** — a discontinued product returns `200 OK` with a "not available" message rendered in the browser.
5. No `lang`, no meta description, no canonical, no structured data.

**Correct response, depending on the situation:**
- If a direct replacement exists (the new season's box): `301` redirect to it.
- If the page still has value (people search for it, and you can suggest alternatives): `200` with server-rendered content explaining it is discontinued, links to similar products, `OutOfStock`/discontinued status in structured data, unique title — and no `noindex` unless you want it gone.
- If it has no value: `404` or `410`, with a helpful server-rendered page linking to the category.

In every case: server-render the content, remove the accidental `noindex`, and add a deployment check that production pages are indexable.

</details>

### Exercise 2 — Generate a breadcrumb structured-data block

**Objective:** practise JSON-LD generation and safe embedding.
**What to build:** a function that takes a list of `{ name, path }` breadcrumb items and an origin, and returns a safe `<script type="application/ld+json">` string with a schema.org `BreadcrumbList`, where each item has a `position` starting at 1.

<details>
<summary>Show the solution</summary>

```ts
type Crumb = { name: string; path: string };

function breadcrumbJsonLd(origin: string, crumbs: Crumb[]): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: new URL(c.path, origin).toString(),
    })),
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

console.log(
  breadcrumbJsonLd("https://cornershop.example", [
    { name: "Fruit", path: "/fruit" },
    { name: "Mangoes", path: "/fruit/mangoes" },
    { name: "Chaunsa, 5 kg", path: "/fruit/mangoes/chaunsa-5kg" },
  ]),
);
```

**Output:**

```text
<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Fruit","item":"https://cornershop.example/fruit"},{"@type":"ListItem","position":2,"name":"Mangoes","item":"https://cornershop.example/fruit/mangoes"},{"@type":"ListItem","position":3,"name":"Chaunsa, 5 kg","item":"https://cornershop.example/fruit/mangoes/chaunsa-5kg"}]}</script>
```

**Walkthrough:** `map` with the index produces positions 1, 2, 3; `new URL` makes absolute URLs; `<` is escaped so a crumb name can never close the script element. The same breadcrumbs should also be **visible** on the page as normal links — structured data must describe visible content.

</details>

### Exercise 3 — Plan a URL change

**Objective:** practise protecting search visibility during change.
**The scenario:** product URLs currently look like `/product.php?id=8823`. The team wants `/fruit/mangoes/chaunsa-5kg`. Write the step-by-step plan.

<details>
<summary>Show the solution</summary>

1. **Inventory**: export every product id with its current URL, and the URLs that currently receive search traffic (Search Console, analytics, server logs).
2. **Generate slugs** once per product and store them; ensure uniqueness (append a short id on collision).
3. **Implement new routes** that render the same (or better) content, with self-referencing canonical tags.
4. **Redirect**: `/product.php?id=8823` → `301` → `/fruit/mangoes/chaunsa-5kg`, for every product; redirect directly (no chains of redirects); old ids for deleted products return 404/410 or redirect to the closest equivalent.
5. **Update internal links**, navigation, sitemaps and structured data to the new URLs, so crawlers and users rarely hit redirects.
6. **Test** the redirect map automatically (every old URL returns 301 to the expected new URL; every new URL returns 200 and has the right canonical).
7. **Launch and monitor** Search Console (indexing, 404s, traffic per page) and server logs daily for several weeks; keep redirects in place long-term (at least a year, often permanently).
8. **Changing slugs later** (after a product rename) must also create a redirect from the old slug.

</details>

### Exercise 4 — Production scenario: faceted search

**Objective:** practise crawl-budget and duplicate-content strategy.
**The scenario:** the shop has 4,000 products, 60 categories and filters for size, price range, ripeness, origin and sort order. Search Console shows Google crawling hundreds of thousands of filter URLs, while some new products take weeks to be indexed. What do you do?

<details>
<summary>Show the solution</summary>

1. **Analyse** server logs and Search Console: which parameter combinations are crawled, how often, and which have search value (do people search "Sindhri mangoes" — yes; "mangoes sorted by price descending" — no).
2. **Promote valuable facets** (for example, variety and origin) to clean, static category URLs (`/fruit/mangoes/sindhri`) with unique titles, descriptions and content; link to them from navigation.
3. **Canonicalise** other filter combinations to their base category page; consider `noindex, follow` for them.
4. **Stop links to worthless combinations**: render sort order and multi-select filter changes through form controls or links marked to avoid crawling, and/or **disallow** clearly worthless parameters (such as `sort=`) in `robots.txt` once they are canonicalised.
5. **Improve discovery of products**: complete sitemaps of canonical product URLs with accurate `lastmod`; strong internal links from categories; fast server responses so crawlers can fetch more.
6. **Monitor** the change in crawl distribution in logs and new-product indexing time in Search Console.

</details>

## Summary

Search engines **crawl** pages by following links and reading sitemaps (respecting `robots.txt`), **render** them with JavaScript (sometimes later and less reliably), **index** what they understand — choosing a canonical URL and skipping duplicates, errors and `noindex` pages — and **rank** indexed pages by relevance, quality, links and page experience. Developers control much of the first three.

Make pages crawlable with real `<a href>` links, real URLs and good internal linking; control crawling with `robots.txt` (not security, not de-indexing) and indexing with `noindex` (which needs crawling allowed). Return correct **status codes** — 301 for moves, real 404/410 for missing pages, no soft 404s. Generate accurate **sitemaps**. Write unique titles and helpful meta descriptions, a clear heading outline and real text; design clean, stable URLs with slugs; resolve duplicates with **canonical** tags and redirects; manage faceted navigation deliberately. Add **structured data** in JSON-LD that matches visible content, escaped safely. Render public pages on the server, respect mobile-first indexing, use `hreflang` for languages, and monitor everything in **Search Console**. Avoid spam tactics; useful content on a technically sound, fast site is what lasts.

## Key terms

- **Search engine optimisation (SEO)** — Improving a website so search engines can discover, understand and rank its pages well.
- **Crawler** — A program that fetches web pages by following links, such as Googlebot.
- **Crawling** — Fetching web pages to discover and read their content.
- **Crawl budget** — The number of pages a search engine is willing to crawl on a site in a given period.
- **Rendering (search)** — Running a page's JavaScript to obtain its final content for indexing.
- **Indexing** — Analysing a page and storing it in a search engine's database so it can appear in results.
- **Ranking** — Ordering indexed pages by relevance and quality for a given search query.
- **SERP** — The search engine results page shown for a query.
- **Organic result** — An unpaid search result.
- **robots.txt** — A file at a site's root that tells crawlers which paths they may fetch.
- **noindex** — A directive, in a meta tag or HTTP header, telling search engines not to include a page in results.
- **Soft 404** — A page that says content is missing but returns a success status code.
- **301 redirect** — A permanent redirect telling browsers and search engines that a URL has moved.
- **Sitemap** — An XML file listing the URLs a site wants search engines to index.
- **Meta description** — A short summary of a page that search engines often display under the title.
- **Slug** — The human-readable, hyphenated part of a URL that identifies a page.
- **Canonical URL** — The preferred URL for content reachable at several addresses, declared with a canonical link.
- **Duplicate content** — The same or very similar content available at more than one URL.
- **Faceted navigation** — Filtering and sorting options that generate many URL variations of listing pages.
- **Structured data** — Machine-readable information describing a page's content, usually using schema.org.
- **schema.org** — A shared vocabulary of types and properties for structured data, created by the major search engines.
- **JSON-LD** — A JSON-based format for embedding structured data in a page inside a script element.
- **Rich result** — An enhanced search result, such as ratings or prices, produced from structured data.
- **Mobile-first indexing** — Indexing and ranking based primarily on the mobile version of a page.
- **hreflang** — Annotations that tell search engines which language or regional version of a page to show to which users.
- **Google Search Console** — Google's free service for monitoring and troubleshooting a site's presence in search.
- **Cloaking** — Showing search engines different content from what users see, which violates search guidelines.
- **Open redirect** — A redirect feature that sends users to any URL given in a request, which attackers can abuse.

## What comes next

Being found is only useful if everyone who arrives can use what they find. The next chapter, {{ch:accessibility}}, brings together the accessibility practices scattered through Part VI — semantic HTML, labels, keyboard support, focus, contrast, motion, live regions — into a complete discipline: who your users with disabilities are, the WCAG guidelines and the law, ARIA used correctly, testing with real assistive technology, and building accessibility into a team's everyday work.
