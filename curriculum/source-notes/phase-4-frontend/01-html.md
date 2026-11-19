# Phase 4 — Chapter 1: HTML

---

## Chapter Overview

HTML (HyperText Markup Language) is the structural foundation of every webpage. While backend engineers don't write as much HTML as frontend specialists, understanding semantic HTML, accessibility, forms, and modern features is essential for building complete web applications and communicating effectively with frontend teams.

**Core topics:**
- Semantic HTML5 elements
- Forms and form validation
- Accessibility (ARIA, roles)
- SEO considerations
- Meta tags, Open Graph, link types
- Web APIs exposed through HTML

---

## Beginner Theory

### Document Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Page description for SEO (150-160 chars)" />
  <title>Page Title — Site Name</title>

  <!-- Preconnect to critical origins (CDN, fonts) -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />

  <!-- Critical CSS inlined (above the fold) -->
  <style>/* critical styles */</style>

  <!-- Non-critical CSS loaded with preload trick -->
  <link rel="preload" href="/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/styles.css" /></noscript>
</head>
<body>
  <!-- Semantic structure -->
  <header>
    <nav aria-label="Main navigation">
      <a href="/" aria-current="page">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>

  <main id="main-content">
    <h1>Page Heading</h1>
    <article>
      <h2>Article Title</h2>
      <p>Content...</p>
    </article>
    <aside>
      <h2>Related</h2>
    </aside>
  </main>

  <footer>
    <p>&copy; 2025 Company</p>
  </footer>

  <!-- Scripts at end, use defer/async -->
  <script src="/app.js" defer></script>
</body>
</html>
```

---

## Basic Examples

### Semantic HTML5 Elements

```html
<!-- Content sectioning -->
<header>    <!-- page/section header, logo, navigation -->
<nav>       <!-- navigation links -->
<main>      <!-- primary content (one per page) -->
<article>   <!-- self-contained content (blog post, product, comment) -->
<section>   <!-- thematic grouping with heading -->
<aside>     <!-- tangentially related content (sidebar, ads) -->
<footer>    <!-- page/section footer -->

<!-- Text content -->
<h1>–<h6>  <!-- headings, document outline -->
<p>         <!-- paragraph -->
<blockquote cite="url">  <!-- quoted content -->
<figure><figcaption>     <!-- figure with caption (image, chart, code) -->
<details><summary>       <!-- expandable/collapsible content -->
<time datetime="2025-01-15">January 15</time>  <!-- machine-readable time -->
<address>   <!-- contact info for nearest article/body ancestor -->
<mark>      <!-- highlighted text -->
<abbr title="HyperText Markup Language">HTML</abbr>  <!-- abbreviation -->

<!-- Lists -->
<ul>  <!-- unordered list -->
<ol>  <!-- ordered list -->
<dl><dt><dd>  <!-- definition list (glossary, key-value pairs) -->

<!-- Tables (data, not layout!) -->
<table>
  <caption>Monthly Sales</caption>
  <thead>
    <tr><th scope="col">Month</th><th scope="col">Revenue</th></tr>
  </thead>
  <tbody>
    <tr><td>January</td><td>$12,000</td></tr>
  </tbody>
  <tfoot>
    <tr><th scope="row">Total</th><td>$12,000</td></tr>
  </tfoot>
</table>
```

### Forms and Validation

```html
<form
  action="/api/register"
  method="POST"
  novalidate          <!-- handle validation in JS for better UX -->
  autocomplete="on"
>
  <!-- Hidden CSRF token -->
  <input type="hidden" name="_csrf" value="{{ csrfToken }}" />

  <!-- Text input with label (ALWAYS label every input) -->
  <div class="field">
    <label for="name">Full Name <span aria-hidden="true">*</span></label>
    <input
      type="text"
      id="name"
      name="name"
      required
      minlength="2"
      maxlength="100"
      autocomplete="name"
      placeholder="Alice Smith"
      aria-required="true"
      aria-describedby="name-hint"
    />
    <p id="name-hint" class="hint">Use your legal name as it appears on your ID</p>
    <p id="name-error" class="error" role="alert" aria-live="polite"></p>
  </div>

  <!-- Email input -->
  <div class="field">
    <label for="email">Email Address <span aria-hidden="true">*</span></label>
    <input
      type="email"
      id="email"
      name="email"
      required
      autocomplete="email"
      inputmode="email"
    />
  </div>

  <!-- Password -->
  <div class="field">
    <label for="password">Password</label>
    <input
      type="password"
      id="password"
      name="password"
      required
      minlength="8"
      autocomplete="new-password"
      aria-describedby="password-rules"
    />
    <ul id="password-rules">
      <li>At least 8 characters</li>
      <li>At least one number</li>
    </ul>
  </div>

  <!-- Select -->
  <div class="field">
    <label for="country">Country</label>
    <select id="country" name="country" autocomplete="country">
      <option value="">Choose...</option>
      <option value="US">United States</option>
      <option value="GB">United Kingdom</option>
    </select>
  </div>

  <!-- Radio buttons -->
  <fieldset>
    <legend>Preferred contact method</legend>
    <label>
      <input type="radio" name="contact" value="email" checked /> Email
    </label>
    <label>
      <input type="radio" name="contact" value="phone" /> Phone
    </label>
  </fieldset>

  <!-- Checkbox -->
  <label>
    <input type="checkbox" name="terms" required />
    I agree to the <a href="/terms">Terms of Service</a>
  </label>

  <!-- File upload -->
  <div class="field">
    <label for="avatar">Profile Photo</label>
    <input
      type="file"
      id="avatar"
      name="avatar"
      accept="image/jpeg,image/png,image/webp"
      aria-describedby="avatar-hint"
    />
    <p id="avatar-hint">JPEG, PNG, or WebP. Max 5MB.</p>
  </div>

  <button type="submit">Create Account</button>
</form>
```

---

## Intermediate Concepts

### Accessibility (A11y)

```html
<!-- ARIA (Accessible Rich Internet Applications) -->

<!-- Skip link — let keyboard users jump to main content -->
<a class="skip-link" href="#main-content">Skip to main content</a>

<!-- Landmark roles -->
<header role="banner">...</header>
<nav role="navigation" aria-label="Main navigation">...</nav>
<main role="main" id="main-content">...</main>
<footer role="contentinfo">...</footer>

<!-- Button vs Link: use <button> for actions, <a> for navigation -->
<button type="button" onclick="openModal()">Open Dialog</button>  <!-- action -->
<a href="/about">About Us</a>                                     <!-- navigation -->

<!-- ARIA states and properties -->
<button
  aria-expanded="false"
  aria-controls="dropdown-menu"
  aria-haspopup="true"
>
  Menu
</button>
<ul id="dropdown-menu" role="menu" hidden>
  <li role="menuitem"><a href="/profile">Profile</a></li>
</ul>

<!-- Live regions — announce dynamic content changes to screen readers -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="status">
  <!-- Inject messages here: "Form submitted successfully" -->
</div>

<!-- Icons without text need aria-label or aria-hidden -->
<button aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- Images -->
<img src="profile.jpg" alt="Alice Smith's profile photo" />  <!-- descriptive alt -->
<img src="decorative.png" alt="" role="presentation" />      <!-- decorative: empty alt -->
```

### Performance: Loading Attributes

```html
<!-- Lazy load images below the fold -->
<img src="hero.jpg" alt="Hero" loading="eager" fetchpriority="high" />  <!-- LCP image -->
<img src="blog-thumb.jpg" alt="Post thumbnail" loading="lazy" />

<!-- Async and defer for scripts -->
<script src="analytics.js" async></script>  <!-- no dependency, load asap -->
<script src="app.js" defer></script>        <!-- execute after HTML parsed -->

<!-- Preload critical resources -->
<link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/critical.css" as="style" />

<!-- DNS prefetch for 3rd party origins -->
<link rel="dns-prefetch" href="https://cdn.example.com" />
```

---

## Interview Preparation

**Q1: What is semantic HTML and why does it matter?**
A: Semantic HTML uses elements that convey meaning about the content: `<article>` for a self-contained piece of content, `<nav>` for navigation, `<aside>` for tangentially related content. This matters for: accessibility — screen readers use semantic elements to navigate and announce content structure; SEO — search engines use semantic structure to understand content hierarchy and importance; maintainability — developers understand the purpose of each section without reading content. Using `<div>` for everything (div soup) loses all these benefits.

**Q2: What is the difference between `async` and `defer` on script tags?**
A: Both download the script in parallel with HTML parsing (non-blocking download). `async`: executes as soon as download completes, even if HTML isn't fully parsed — good for independent scripts (analytics, ads). `defer`: executes after HTML is fully parsed but before `DOMContentLoaded` — maintains script execution order, good for scripts that depend on DOM or each other. Regular `<script>` (no attribute) blocks HTML parsing entirely during both download and execution — always use `async` or `defer`.

**Q3: What is the purpose of `aria-live` regions?**
A: `aria-live` regions tell screen readers to announce content changes when they happen dynamically (without a page reload). Without it, dynamic updates (error messages, status notifications, search results) are invisible to screen reader users. `aria-live="polite"` waits until the user is idle to announce the change. `aria-live="assertive"` interrupts immediately — use sparingly, only for critical alerts. `aria-atomic="true"` reads the entire region content when any part changes.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Build a semantic HTML page: header, nav, main, article, aside, footer.
2. Create a registration form with all standard input types.
3. Add proper `<label>` elements to all form inputs.
4. Add `aria-required`, `aria-describedby` to form inputs.
5. Add a skip navigation link for keyboard accessibility.
6. Mark decorative images with empty `alt=""`.
7. Use `<time datetime="...">` for timestamps.
8. Use `<figure>` and `<figcaption>` for an image with a caption.
9. Create a definition list `<dl>` for a glossary.
10. Create a data table with `<thead>`, `<tbody>`, `<tfoot>`, `scope` attributes.

### Intermediate (10 Tasks)
1. Implement a custom accessible dropdown menu with ARIA roles and states.
2. Build a modal dialog with focus trap and `aria-modal`.
3. Add `aria-live` for form error announcements.
4. Implement lazy loading for below-the-fold images.
5. Set up `<link rel="preload">` for critical fonts and CSS.
6. Add Open Graph meta tags for social media sharing.
7. Add structured data (JSON-LD) for SEO.
8. Build an accessible accordion with `aria-expanded`.
9. Add `autocomplete` attributes to a checkout form.
10. Test your page with a screen reader (NVDA, VoiceOver).

### Advanced (10 Tasks)
1. Achieve WCAG 2.1 AA compliance on a full page — audit with Axe.
2. Implement progressive enhancement: page works without JavaScript.
3. Build a form with client-side and server-side validation that syncs.
4. Optimize LCP: preload hero image with `fetchpriority="high"`.
5. Use `<picture>` element with `srcset` for responsive images.
6. Implement custom form controls (checkbox, select) that are fully accessible.
7. Build a multi-step form with accessible progress indicator.
8. Add Service Worker for offline-capable pages.
9. Implement `<template>` and web components.
10. Run a full accessibility audit and fix all critical issues.

---

## Self Assessment
1. What are the 5 main HTML5 semantic sectioning elements?
2. What is the difference between `async` and `defer`?
3. What is `aria-live` and when do you use it?
4. When should you use `alt=""` (empty) for images?
5. What is the difference between `<button>` and `<a>`?
6. What is `<fieldset>` and `<legend>` used for?
7. What does `loading="lazy"` do?
8. What is `aria-describedby`?
9. What does `<label for="id">` connect to?
10. What is the `rel="noopener noreferrer"` attribute used for?

---

## Cheat Sheet

```html
<!-- Structure -->
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="...">
<header><nav aria-label="Main"><main id="main"><article><aside><footer>

<!-- Forms -->
<label for="id">Text<input type="text" id="id" name="n" required aria-describedby="hint" />
<fieldset><legend>Group</legend><input type="radio" name="g" /></fieldset>
<button type="submit">Submit</button>

<!-- A11y -->
<a class="skip-link" href="#main">Skip to main</a>
<img src="..." alt="descriptive text" />  <!-- meaningful -->
<img src="..." alt="" role="presentation" />  <!-- decorative -->
<div aria-live="polite" class="sr-only"></div>
<button aria-label="Close"><svg aria-hidden="true">...</svg></button>

<!-- Performance -->
<link rel="preload" href="/font.woff2" as="font" crossorigin />
<img loading="lazy" src="..." alt="..." />
<script defer src="..."></script>
<script async src="analytics.js"></script>
```
