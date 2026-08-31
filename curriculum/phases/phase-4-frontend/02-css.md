# Phase 4 — Chapter 2: CSS

---

## Chapter Overview

CSS (Cascading Style Sheets) controls the visual presentation of HTML. Modern CSS has evolved dramatically — CSS Grid and Flexbox enable complex layouts without frameworks; CSS custom properties (variables) enable theming; `@layer` and `:has()` are transforming how we write styles.

**Core topics:**
- Box model, specificity, cascade, inheritance
- Flexbox layout
- CSS Grid layout
- Responsive design with media queries and container queries
- CSS custom properties (variables)
- CSS animations and transitions
- Modern features: `@layer`, `:has()`, `clamp()`, `subgrid`

---

## Beginner Theory

### The Box Model

```css
/* Every element is a box: content + padding + border + margin */
.box {
  /* width/height by default = content box only */
  width:  200px;
  height: 100px;
  padding: 16px;
  border:  2px solid black;
  margin:  24px;
  /* Total width = 200 + 16*2 + 2*2 = 236px */

  /* Better: include padding/border in width */
  box-sizing: border-box;
  /* Now: total width = 200px exactly */
}

/* Set globally — best practice */
*, *::before, *::after {
  box-sizing: border-box;
}
```

### Specificity and Cascade

```css
/* Specificity (highest wins, left to right):
   Inline styles: 1-0-0-0
   IDs:           0-1-0-0
   Classes/attrs: 0-0-1-0
   Elements:      0-0-0-1
*/

/* 0-0-0-1 */ p { color: blue; }
/* 0-0-1-0 */ .text { color: red; }   /* wins over element selector */
/* 0-1-0-0 */ #main { color: green; } /* wins over class */

/* !important overrides all (use sparingly — avoid in components) */
.override { color: pink !important; }

/* :is() and :where() — new selectors */
/* :is() preserves specificity of most specific argument */
:is(header, main, footer) p { margin: 0; }
/* :where() has zero specificity — great for resets */
:where(h1, h2, h3, h4, h5, h6) { font-weight: bold; }
```

---

## Basic Examples

### Flexbox

```css
/* Flexbox — one-dimensional layout (row OR column) */
.container {
  display:         flex;
  flex-direction:  row;           /* row | column | row-reverse | column-reverse */
  flex-wrap:       wrap;          /* wrap items when they overflow */
  justify-content: space-between; /* main axis: flex-start | center | space-between | space-evenly */
  align-items:     center;        /* cross axis: flex-start | center | stretch | baseline */
  gap:             16px;          /* space between flex items */
}

.item {
  flex:     1;           /* flex-grow: 1, flex-shrink: 1, flex-basis: 0 */
  flex:     0 0 200px;   /* don't grow, don't shrink, 200px wide */
  flex:     1 1 auto;    /* grow and shrink equally */
  align-self: flex-start; /* override align-items for this item */
  order:    2;            /* change visual order */
}

/* Common patterns */
/* Center horizontally and vertically */
.center {
  display:         flex;
  justify-content: center;
  align-items:     center;
  min-height:      100vh;
}

/* Navigation bar */
.nav {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
}

/* Card grid with flexible items */
.cards {
  display:   flex;
  flex-wrap: wrap;
  gap:       24px;
}
.card {
  flex: 1 1 300px; /* grow/shrink, min-width 300px */
  max-width: 400px;
}
```

### CSS Grid

```css
/* CSS Grid — two-dimensional layout */
.grid {
  display:               grid;
  grid-template-columns: repeat(3, 1fr);  /* 3 equal columns */
  grid-template-rows:    auto;
  gap:                   24px;
}

/* Named areas */
.page {
  display: grid;
  grid-template-columns: 250px 1fr 200px;
  grid-template-rows:    auto 1fr auto;
  grid-template-areas:
    "header  header  header"
    "sidebar main    aside"
    "footer  footer  footer";
  min-height: 100vh;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.aside   { grid-area: aside; }
.footer  { grid-area: footer; }

/* Responsive without media queries */
.auto-grid {
  display:               grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap:                   24px;
}

/* Spanning columns/rows */
.featured {
  grid-column: 1 / 3;   /* span from column 1 to 3 */
  grid-row:    1 / 3;   /* span rows 1-2 */
  /* Or: */
  grid-column: span 2;  /* span 2 columns */
}
```

---

## Intermediate Concepts

### CSS Custom Properties

```css
/* Define on :root for global scope */
:root {
  /* Colors */
  --color-primary:     #3b82f6;
  --color-primary-dark: #2563eb;
  --color-text:        #1f2937;
  --color-text-muted:  #6b7280;
  --color-bg:          #ffffff;
  --color-bg-subtle:   #f9fafb;
  --color-border:      #e5e7eb;

  /* Typography */
  --font-sans:  'Inter', system-ui, sans-serif;
  --font-mono:  'Fira Code', 'Courier New', monospace;
  --text-sm:    0.875rem;
  --text-base:  1rem;
  --text-lg:    1.125rem;
  --text-xl:    1.25rem;

  /* Spacing */
  --space-1:  0.25rem;
  --space-2:  0.5rem;
  --space-4:  1rem;
  --space-6:  1.5rem;
  --space-8:  2rem;

  /* Border radius */
  --radius-sm:  0.25rem;
  --radius:     0.5rem;
  --radius-lg:  1rem;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow:    0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

/* Dark mode with custom properties */
@media (prefers-color-scheme: dark) {
  :root {
    --color-text:      #f9fafb;
    --color-bg:        #111827;
    --color-border:    #374151;
  }
}

/* Usage */
.button {
  background: var(--color-primary);
  color:      #fff;
  padding:    var(--space-2) var(--space-4);
  border-radius: var(--radius);
  transition: background 0.2s;
}

.button:hover {
  background: var(--color-primary-dark);
}
```

### Responsive Design

```css
/* Mobile-first approach (base = mobile, add complexity for larger screens) */

/* Base (mobile) styles */
.container {
  padding: 1rem;
  width: 100%;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 1.5rem;
    max-width: 768px;
    margin: 0 auto;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    max-width: 1280px;
    padding: 2rem;
  }
}

/* Modern: Container Queries (style based on parent size, not viewport) */
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}

/* Fluid typography with clamp() */
h1 {
  /* min: 1.5rem, preferred: 4vw, max: 3rem */
  font-size: clamp(1.5rem, 4vw, 3rem);
}

body {
  /* 16px–20px depending on viewport */
  font-size: clamp(1rem, 1.25vw, 1.25rem);
}
```

### Animations and Transitions

```css
/* Transitions — simple property changes */
.button {
  background: var(--color-primary);
  transform:  scale(1);
  transition: background 0.2s ease, transform 0.1s ease, box-shadow 0.2s;
}

.button:hover {
  background: var(--color-primary-dark);
  transform:  scale(1.02);
  box-shadow: var(--shadow-lg);
}

.button:active {
  transform: scale(0.98);
}

/* Keyframe animations */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in {
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
}

.spinner {
  animation: spin 1s linear infinite;
}

.modal {
  animation: fade-in 0.2s ease-out;
}

/* Respect user preference for reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration:   0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration:  0.01ms !important;
  }
}
```

---

## Advanced Concepts

### @layer (Cascade Layers)

```css
/* Define layer order — lower layers are overridden by higher ones */
@layer reset, base, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; margin: 0; }
  img { display: block; max-width: 100%; }
}

@layer base {
  body { font-family: var(--font-sans); color: var(--color-text); }
  a { color: var(--color-primary); }
}

@layer components {
  .card { background: var(--color-bg); border-radius: var(--radius); padding: var(--space-6); }
  .button { /* ... */ }
}

@layer utilities {
  .hidden { display: none !important; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
}
```

---

## Interview Preparation

**Q1: What is the difference between Flexbox and Grid?**
A: Flexbox is one-dimensional — you define a main axis (row or column) and items flow along it. Best for: navigation bars, card rows, vertically/horizontally centering items, distributing space among items in a line. Grid is two-dimensional — you define both columns AND rows simultaneously. Best for: page layouts, complex card arrangements where items must align in both axes. A common pattern: use Grid for macro layout (page sections), Flexbox for micro layout (items within a section). They complement each other.

**Q2: What is the CSS specificity hierarchy?**
A: From lowest to highest: universal selector (`*`), element/pseudo-element selectors, class/attribute/pseudo-class selectors, ID selectors (`#id`), inline styles (`style="..."`), `!important`. When two rules have the same specificity, the one that appears later in the CSS wins (cascade). Best practice: use classes for styling, IDs only for JavaScript hooks or fragment links, avoid `!important` except in utility classes or reset overrides.

**Q3: What are CSS custom properties and how are they different from preprocessor variables?**
A: CSS custom properties (`--variable-name`) are native CSS variables that cascade like any CSS property — they can be overridden per element, per media query, per component. Unlike Sass/Less variables (which are compiled away), custom properties exist at runtime and can be read/modified by JavaScript (`element.style.setProperty('--color', 'red')`). They also inherit through the DOM tree, enabling theming: define `--color-primary: blue` on `:root`, override it with `--color-primary: purple` on a specific component, and all descendants use the component's value.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set `box-sizing: border-box` globally and understand why.
2. Build a 3-column Flexbox layout with `gap`.
3. Center an element horizontally and vertically with Flexbox.
4. Build a navigation bar with logo left, links right using Flexbox.
5. Create a responsive grid with `auto-fill` and `minmax()`.
6. Define CSS custom properties for color palette and typography.
7. Add a hover transition to a button (color, scale).
8. Build a two-column page layout with CSS Grid named areas.
9. Create a keyframe animation for a loading spinner.
10. Add `@media (prefers-color-scheme: dark)` dark mode.

### Intermediate (10 Tasks)
1. Build a responsive card grid without media queries (auto-fill minmax).
2. Implement fluid typography with `clamp()`.
3. Build a complete page layout with header, sidebar, main, footer using Grid.
4. Implement container queries for a card component.
5. Create a CSS-only accordion with `<details>` and `<summary>`.
6. Build a modal overlay with backdrop blur.
7. Implement skeleton loading animation.
8. Implement `@layer` for a proper cascade management.
9. Build a dark mode toggle that persists via CSS custom properties.
10. Add `prefers-reduced-motion` support to all animations.

### Advanced (10 Tasks)
1. Build a design system with custom properties for colors, typography, spacing.
2. Implement scroll-driven animations with `@scroll-timeline`.
3. Build a masonry layout with CSS Grid subgrid.
4. Implement a sticky header that changes style on scroll (CSS only with `@scroll-timeline`).
5. Build a CSS-only tabbed interface using `:has()`.
6. Implement logical properties for RTL/LTR support.
7. Build a print stylesheet.
8. Implement performant CSS animations using only `transform` and `opacity`.
9. Build a full design token system and implement it in a component library.
10. Achieve 100 Lighthouse performance score with CSS optimization.

---

## Self Assessment
1. What is the box model?
2. What does `box-sizing: border-box` do?
3. What is the difference between Flexbox and Grid?
4. What is CSS specificity?
5. What is `justify-content` vs. `align-items`?
6. What is a CSS custom property?
7. What does `clamp()` do?
8. What is `@media (prefers-reduced-motion: reduce)` used for?
9. What is `container-type` used for?
10. What is `@layer` used for?

---

## Cheat Sheet

```css
/* Global reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* Flexbox */
.flex  { display: flex; gap: 1rem; }
.flex-col { flex-direction: column; }
.center   { display: flex; justify-content: center; align-items: center; }
.between  { justify-content: space-between; }
.item     { flex: 1; }  /* grow proportionally */

/* Grid */
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.auto-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }

/* Custom properties */
:root { --primary: #3b82f6; --radius: 0.5rem; }
.btn  { background: var(--primary); border-radius: var(--radius); }

/* Transitions */
.btn { transition: background 0.2s, transform 0.1s; }
.btn:hover { background: #2563eb; transform: scale(1.02); }

/* Animation */
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.modal { animation: fade-in 0.2s ease-out; }

/* Responsive */
@media (min-width: 768px) { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-color-scheme: dark) { :root { --bg: #111827; } }
h1 { font-size: clamp(1.5rem, 4vw, 3rem); }
```
