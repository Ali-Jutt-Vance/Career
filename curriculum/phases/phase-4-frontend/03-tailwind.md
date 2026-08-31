# Phase 4 — Chapter 3: Tailwind CSS

---

## Chapter Overview

Tailwind CSS is a utility-first CSS framework — instead of writing custom CSS classes, you compose small utility classes directly in your HTML. It generates only the CSS you actually use (zero-bloat), enforces design system constraints, and enables rapid UI development.

**Why Tailwind:**
- Utility classes map directly to CSS properties — no naming cognitive overhead
- Design system enforced by configuration (palette, spacing, typography)
- PurgeCSS built-in — only ships classes used in your HTML (tiny bundles)
- First-class responsive, hover, focus, dark mode modifiers
- Excellent with React, Vue, Next.js, HTML

---

## Beginner Theory

### Core Utilities

```html
<!-- Typography -->
<p class="
  text-sm        <!-- font-size: 0.875rem -->
  text-base      <!-- 1rem -->
  text-lg        <!-- 1.125rem -->
  text-xl        <!-- 1.25rem -->
  text-2xl       <!-- 1.5rem -->
  text-4xl       <!-- 2.25rem -->
  font-normal    <!-- font-weight: 400 -->
  font-medium    <!-- 500 -->
  font-semibold  <!-- 600 -->
  font-bold      <!-- 700 -->
  text-gray-900  <!-- color -->
  text-gray-500
  leading-tight  <!-- line-height: 1.25 -->
  leading-relaxed <!-- 1.625 -->
  tracking-wide  <!-- letter-spacing: 0.025em -->
  uppercase lowercase capitalize
  truncate       <!-- overflow hidden, text-overflow: ellipsis -->
  line-clamp-2   <!-- clamp to 2 lines -->
">...</p>

<!-- Spacing (m = margin, p = padding, 4 = 1rem, each unit = 0.25rem) -->
<!-- t=top, r=right, b=bottom, l=left, x=horizontal, y=vertical -->
<div class="
  m-4   <!-- margin: 1rem all sides -->
  mt-2  <!-- margin-top: 0.5rem -->
  mx-auto  <!-- margin-left/right: auto (center) -->
  p-6   <!-- padding: 1.5rem -->
  px-4  <!-- padding-left/right: 1rem -->
  py-2  <!-- padding-top/bottom: 0.5rem -->
  gap-4 <!-- gap: 1rem (in flex/grid) -->
">

<!-- Colors: {property}-{color}-{shade} -->
<!-- bg: background, text: color, border: border-color, ring: outline-ring -->
<div class="
  bg-white bg-gray-50 bg-blue-500 bg-blue-600
  text-gray-900 text-gray-500 text-white text-blue-600
  border border-gray-200 border-blue-500
">

<!-- Sizing -->
<div class="
  w-full w-1/2 w-1/3 w-64  <!-- width -->
  h-full h-screen h-16 h-auto  <!-- height -->
  max-w-sm max-w-lg max-w-7xl  <!-- max-width -->
  min-h-screen                 <!-- min-height -->
">

<!-- Border & radius -->
<div class="
  rounded      <!-- border-radius: 0.25rem -->
  rounded-lg   <!-- 0.5rem -->
  rounded-xl   <!-- 0.75rem -->
  rounded-full <!-- 9999px (circle/pill) -->
  border       <!-- border-width: 1px -->
  border-2     <!-- 2px -->
  border-gray-200
">

<!-- Shadows -->
<div class="shadow-sm shadow shadow-md shadow-lg shadow-xl shadow-2xl">
```

---

## Basic Examples

### Button Component

```html
<!-- Primary button -->
<button
  class="
    inline-flex items-center justify-center gap-2
    px-4 py-2
    text-sm font-medium text-white
    bg-blue-600
    border border-transparent
    rounded-lg
    shadow-sm
    hover:bg-blue-700
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    active:scale-95
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-150
  "
>
  <svg class="w-4 h-4" aria-hidden="true">...</svg>
  Create Account
</button>

<!-- Outline button -->
<button
  class="
    px-4 py-2 text-sm font-medium
    text-blue-600
    bg-white border border-blue-600 rounded-lg
    hover:bg-blue-50
    focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    transition-colors
  "
>
  Cancel
</button>

<!-- Danger button -->
<button class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500">
  Delete
</button>
```

### Card Component

```html
<article
  class="
    bg-white
    border border-gray-200
    rounded-xl
    shadow-sm
    overflow-hidden
    hover:shadow-md
    transition-shadow duration-200
  "
>
  <img
    src="/product.jpg"
    alt="Product Name"
    class="w-full h-48 object-cover"
    loading="lazy"
  />

  <div class="p-6">
    <span class="text-xs font-semibold text-blue-600 uppercase tracking-wider">
      Electronics
    </span>
    <h3 class="mt-2 text-lg font-semibold text-gray-900 line-clamp-2">
      Wireless Noise-Canceling Headphones
    </h3>
    <p class="mt-2 text-sm text-gray-500 line-clamp-3">
      Premium sound quality with 30-hour battery life and active noise cancellation.
    </p>

    <div class="mt-4 flex items-center justify-between">
      <span class="text-2xl font-bold text-gray-900">$299</span>
      <button class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
        Add to Cart
      </button>
    </div>
  </div>
</article>
```

### Responsive Grid

```html
<!-- 1 col mobile → 2 col tablet → 3 col desktop -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  <div class="...">Card 1</div>
  <div class="...">Card 2</div>
  <div class="...">Card 3</div>
</div>

<!-- Responsive modifiers: {breakpoint}:{utility} -->
<!-- sm: ≥640px, md: ≥768px, lg: ≥1024px, xl: ≥1280px, 2xl: ≥1536px -->

<!-- Text sizes by breakpoint -->
<h1 class="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold">
  Heading
</h1>

<!-- Show/hide by breakpoint -->
<nav class="hidden md:flex">...</nav>
<button class="md:hidden">Hamburger</button>
```

---

## Intermediate Concepts

### Dark Mode

```html
<!-- Enable dark mode in tailwind.config.js: darkMode: 'class' -->
<!-- Add class="dark" to <html> element when dark mode is active -->

<div class="
  bg-white dark:bg-gray-900
  text-gray-900 dark:text-gray-100
  border-gray-200 dark:border-gray-700
">

<button class="
  bg-blue-600 hover:bg-blue-700
  dark:bg-blue-500 dark:hover:bg-blue-400
  text-white
">
  Click me
</button>
```

### Tailwind Config (Design Tokens)

```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx,html}"],
  darkMode: "class",

  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eff6ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Fira Code", "monospace"]
      },
      spacing: {
        "18": "4.5rem",
        "112": "28rem"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      animation: {
        "fade-in":   "fade-in 0.2s ease-out",
        "slide-up":  "slide-up 0.3s ease-out",
        "spin-slow": "spin 3s linear infinite"
      },
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },

  plugins: [
    require("@tailwindcss/typography"),  // prose class for rich text
    require("@tailwindcss/forms"),        // form input resets
    require("@tailwindcss/aspect-ratio") // aspect-ratio utilities
  ]
};
```

### `@apply` for Reusable Classes

```css
/* globals.css — use @apply for repeated patterns */
/* Best used sparingly — prefer component abstraction over @apply */

@layer components {
  .btn {
    @apply inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors;
  }

  .btn-primary {
    @apply btn bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500;
  }

  .btn-ghost {
    @apply btn bg-transparent text-gray-700 hover:bg-gray-100;
  }

  .card {
    @apply bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden;
  }

  .input {
    @apply block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
  }

  .label {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }
}
```

---

## Advanced Concepts

### Tailwind v4 (CSS-First Config)

```css
/* tailwind.css (v4 — no JS config file needed) */
@import "tailwindcss";

@theme {
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --font-family-sans: "Inter", system-ui, sans-serif;
  --spacing-18: 4.5rem;
}
```

### Arbitrary Values

```html
<!-- Escape hatch for one-off values not in design system -->
<div class="
  top-[117px]            <!-- top: 117px -->
  bg-[#bada55]           <!-- custom color -->
  text-[14px]            <!-- custom size -->
  w-[calc(100%-2rem)]    <!-- calc() -->
  grid-cols-[1fr_2fr_1fr] <!-- custom grid -->
">
```

---

## Interview Preparation

**Q1: What is utility-first CSS and what are its advantages over component-based CSS?**
A: Utility-first CSS uses small, single-purpose classes (`flex`, `items-center`, `bg-blue-600`) composed in HTML rather than writing custom CSS per component. Advantages: no naming — you never need to name things, reducing cognitive overhead and bikeshedding. No CSS bloat — Tailwind only ships utilities you actually use. Consistency — you're constrained to the design system scale (8px grid, color palette) naturally. Fast iteration — change styles without switching files. Disadvantages: HTML becomes verbose; long class strings. Mitigated with component abstraction (React/Vue components encapsulate the classes).

**Q2: How does Tailwind's PurgeCSS work?**
A: Tailwind v3+ uses JIT (Just-In-Time) compilation — it scans all files matching `content` patterns for any string that looks like a Tailwind class, generates only those utilities in the output CSS. The output for a typical app is 5-50KB instead of 3MB+ for the full stylesheet. Critical: all class names must be complete strings — you cannot dynamically construct classes like `text-${color}-500` because the scanner won't detect it. Use full class names in a lookup object: `const classes = { blue: 'text-blue-500', red: 'text-red-500' }`.

**Q3: When would you use `@apply` and when would you avoid it?**
A: Use `@apply` for: base HTML elements that you can't add classes to (third-party prose content, markdown output, form resets). Avoid `@apply` for regular components — it defeats the purpose of utility-first by creating abstractions that hide which utilities are applied, and it increases build complexity. The correct abstraction layer is your component framework (React/Vue/HTML template). Create a `<Button>` component with the classes embedded, not a CSS class using `@apply`. The official Tailwind recommendation is to use `@apply` very sparingly.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Install Tailwind CSS in a project (npm or CDN).
2. Build a button with hover, focus, and disabled states using Tailwind.
3. Build a card with image, title, description, and CTA.
4. Create a responsive 3-column grid.
5. Implement dark mode with `dark:` modifier.
6. Build a navigation bar with logo left, links right.
7. Build a form with labels, inputs, and submit button.
8. Use `max-w-*` and `mx-auto` to center a container.
9. Use `aspect-ratio` for an image container.
10. Build a badge/tag component with different color variants.

### Intermediate (10 Tasks)
1. Configure `tailwind.config.js` with a custom color palette.
2. Add custom fonts via `fontFamily` config.
3. Create `@apply` button component classes in a global CSS file.
4. Build a modal dialog with backdrop and animations.
5. Implement a sidebar layout with collapsible mobile navigation.
6. Build a data table with striped rows and hover effects.
7. Implement toast/notification component.
8. Build a pricing page with highlighted featured plan.
9. Implement animated skeleton loading with `animate-pulse`.
10. Use `@tailwindcss/typography` for a blog post content area.

### Advanced (10 Tasks)
1. Build a full landing page using only Tailwind.
2. Implement a design token system in `tailwind.config.js`.
3. Build a headless UI component library (accessible, Tailwind-styled).
4. Use `@headlessui/react` with Tailwind for accessible dropdown.
5. Implement Tailwind v4 CSS-first configuration.
6. Build a storybook of all your Tailwind components.
7. Implement responsive design audit — test all breakpoints.
8. Optimize Tailwind bundle size (verify no unused classes).
9. Build an email template using Tailwind (use Maizzle).
10. Implement theming (brand colors per client) using CSS variables + Tailwind.

---

## Self Assessment
1. What is utility-first CSS?
2. What does Tailwind's JIT compilation do?
3. What are responsive modifiers (`sm:`, `md:`, `lg:`)?
4. What is the dark mode modifier?
5. What are state variants (`hover:`, `focus:`, `disabled:`)?
6. What is `@apply` and when should you use it?
7. What is `tailwind.config.js` used for?
8. What is the `content` field in Tailwind config?
9. What are arbitrary values (`[value]`)?
10. What is the difference between `items-center` and `justify-center`?

---

## Cheat Sheet

```html
<!-- Layout -->
<div class="flex items-center justify-between gap-4">
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
<div class="container mx-auto max-w-7xl px-4">

<!-- Typography -->
<h1 class="text-4xl font-bold text-gray-900 tracking-tight">
<p  class="text-base text-gray-500 leading-relaxed line-clamp-3">

<!-- Spacing -->
<div class="p-6 px-4 py-2 mt-4 mb-8 mx-auto space-y-4">

<!-- Colors -->
<div class="bg-blue-600 text-white border border-blue-700 ring-2 ring-blue-500">

<!-- Dark mode -->
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">

<!-- Responsive -->
<div class="w-full md:w-1/2 lg:w-1/3">
<h1 class="text-2xl md:text-4xl lg:text-5xl">

<!-- States -->
<button class="bg-blue-600 hover:bg-blue-700 focus:ring-2 active:scale-95 disabled:opacity-50">

<!-- Animation -->
<div class="animate-spin animate-pulse animate-bounce animate-fade-in">

<!-- Arbitrary values -->
<div class="top-[117px] w-[calc(100%-2rem)] bg-[#ff6b35]">
```
