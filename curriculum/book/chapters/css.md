# CSS: Making Pages Look Right

> [!GOALS]
> - Explain what CSS is, how a browser applies it, and why styles sometimes seem to "not work".
> - Write rules with selectors, properties and values, and predict which rule wins using the **cascade**, **specificity** and **inheritance**.
> - Understand the **box model** and use `box-sizing`, margins, padding and borders without surprises.
> - Choose the right units — `px`, `rem`, `em`, `%`, `vw`, `vh` — and set up colour and typography properly.
> - Lay out pages with **normal flow**, **positioning**, **Flexbox** and **Grid**, and know which tool fits which job.
> - Build **responsive** designs that work from small phones to large screens, with media queries, container queries and fluid sizes.
> - Use custom properties (CSS variables), pseudo-classes and pseudo-elements, transitions and animations — accessibly.
> - Organise CSS so it stays maintainable as a site grows, and debug styling problems with the browser's developer tools.

## Why this matters

In {{ch:html}} you built pages with correct structure and meaning. Viewed in a browser, they look plain: black text, blue underlined links, everything stacked down the left edge. Users judge a site's trustworthiness within moments of seeing it, and a shop that looks broken or amateur loses customers — even if its code is excellent.

**CSS** controls how pages look: colours, fonts, spacing, sizes, and above all **layout** — where everything goes, on every size of screen. Today more than half of web traffic comes from phones, and the same page must work on a 360-pixel-wide phone, a tablet, a laptop and a 2,560-pixel monitor.

CSS has a reputation for being frustrating. Developers change a colour and nothing happens; they centre something and it moves somewhere else; they fix the layout on a laptop and break it on a phone. Almost always, the cause is the same: they learned **properties** without learning the **mechanisms** — the cascade, the box model, how layout works. Once you understand these, CSS becomes predictable. This chapter teaches the mechanisms first.

Even back-end engineers need CSS more often than they expect: for admin pages, internal tools, HTML emails ({{ch:email}}), and simply to review and debug front-end work. And every styling system you will meet — including Tailwind in {{ch:tailwind}} — is CSS underneath.

## The simple idea

Think of HTML as the **structure of a house**: rooms, walls, doors and windows. CSS is the **interior design**: paint colours, furniture placement, how big each room appears, which lights are on. The same house can be decorated in completely different ways without moving a single wall.

And the design must adapt. Imagine the same house had to be livable whether it is a small flat or a large villa — the furniture rearranges itself depending on the space. That is responsive design.

> [!ANALOGY]
> HTML is the structure of a house; CSS is the interior design — colours, furniture and arrangement — applied without changing the walls.
>
> **Where the analogy breaks:** an interior designer gives one clear instruction per item. In CSS, many rules can apply to the same element at once, from different stylesheets, and the browser must decide which one wins using precise rules. Most of CSS's apparent "randomness" comes from conflicts between rules — not from the properties themselves.

## The proper definition and key words

**CSS** (Cascading Style Sheets) is the language used to describe the presentation of HTML documents: their layout, colours, fonts and visual effects. It is a W3C standard, developed in modules — Flexbox, Grid, Colour and so on each evolve separately, and browsers implement them as they mature.

The key words:

- **Rule** — a **selector** plus a **declaration block**.
- **Selector** — a pattern that chooses which elements the rule applies to.
- **Declaration** — a **property** and a **value**, such as `color: navy`.
- **Cascade** — the algorithm that decides which declaration wins when several apply to the same element and property.
- **Specificity** — a score that measures how precise a selector is; part of the cascade.
- **Inheritance** — the way some properties (mostly text-related) pass from a parent element to its children.
- **Box model** — the way every element is drawn as a rectangular box of content, padding, border and margin.
- **Layout** — the process of calculating the size and position of every box.
- **Viewport** — the visible area of the page in the browser window.
- **Responsive design** — designing layouts that adapt to different viewport sizes and devices.

A rule looks like this:

```css
.price {
  color: #0b6e4f;
  font-weight: 700;
}
```

- `.price` is the selector: every element with `class="price"`.
- `{ ... }` is the declaration block.
- `color: #0b6e4f;` and `font-weight: 700;` are declarations. Each ends with a semicolon.

## Where CSS goes

There are three ways to attach CSS to HTML:

```html
<!-- 1. External stylesheet: the normal way -->
<link rel="stylesheet" href="/styles.css">

<!-- 2. A <style> element in the page -->
<style>
  .price { color: #0b6e4f; }
</style>

<!-- 3. Inline style attribute on one element -->
<p style="color: #0b6e4f;">Rs 450</p>
```

**External stylesheets** are the standard: one file serves many pages, browsers cache it, and content stays separate from presentation. `<style>` blocks are used for small, page-specific styles and for "critical CSS" needed to show the top of the page quickly ({{ch:frontend-performance}}). **Inline styles** are hard to override and to maintain; avoid them, except when a value is genuinely set dynamically by JavaScript.

## How it works inside: from CSS to pixels

When the browser loads a page, it builds two trees and combines them:

```text
   HTML ──parse──▶ DOM tree ─────┐
                                 ├──▶ render tree ──▶ layout ──▶ paint ──▶ composite
   CSS  ──parse──▶ CSSOM ────────┘    (visible        (sizes &    (pixels   (layers onto
                                       elements +      positions)  per        the screen)
                                       final styles)               layer)
```

1. **Parse CSS into the CSSOM** (CSS Object Model): a structure of all the rules.
2. **Style calculation**: for every element in the DOM, find every rule whose selector matches, resolve conflicts with the cascade, apply inheritance and defaults, and compute a final value for every property. The result is the element's **computed style**.
3. **Build the render tree**: the elements that will actually be displayed. Elements with `display: none` are left out entirely.
4. **Layout** (also called reflow): calculate the exact size and position of every box, starting from the viewport and working down the tree.
5. **Paint**: fill in the pixels — text, colours, borders, shadows, images — usually into several layers.
6. **Composite**: combine the layers in the right order on the screen.

This pipeline matters for two reasons. First, the **cascade** step is where "my style doesn't work" problems happen: your rule matched, but another rule won. Second, changing different properties triggers different amounts of work. Changing `width` forces layout, paint and composite again; changing `color` needs only paint; changing `transform` or `opacity` can often be done in compositing alone, which is why smooth animations use those two properties (see Performance).

## Selectors

### Level 3 — The basic selectors

```css
p { }                    /* type selector: every <p> */
.price { }               /* class selector: every element with class="price" */
#checkout { }            /* ID selector: the element with id="checkout" */
* { }                    /* universal selector: every element */
[type="email"] { }       /* attribute selector: elements with that attribute value */
[href^="https"] { }      /* attribute starts with "https" */
```

### Level 3 — Combinators

Combinators select elements based on their position relative to others:

```css
.card p { }              /* descendant: any <p> anywhere inside .card */
.menu > li { }           /* child: <li> elements that are DIRECT children of .menu */
h2 + p { }               /* adjacent sibling: the <p> immediately after an <h2> */
h2 ~ p { }               /* general sibling: every <p> after an <h2>, same parent */
h1, h2, h3 { }           /* selector list: applies to all three */
```

### Level 3 — Pseudo-classes

A **pseudo-class** selects elements in a particular **state** or **position**:

```css
a:hover { }                      /* the mouse is over the link */
button:focus-visible { }         /* focused by keyboard (not by mouse click) */
input:invalid { }                /* fails its HTML validation */
input:disabled { }
li:first-child { }               /* the first child of its parent */
li:nth-child(odd) { }            /* 1st, 3rd, 5th... */
tr:nth-child(2n) { }             /* every even row */
p:not(.intro) { }                /* paragraphs WITHOUT class intro */
.card:has(img) { }               /* cards that CONTAIN an image */
```

`:has()` deserves a note: for most of CSS's history, you could only select elements based on their ancestors, never on what they **contain**. `:has()`, supported in all major browsers since 2023, changes that: `.card:has(img)` styles a card differently when it has a picture; `form:has(input:invalid) button` can style a submit button when any field is invalid. It is sometimes called the "parent selector".

### Level 3 — Pseudo-elements

A **pseudo-element** styles a **part** of an element, or inserts generated content, written with two colons:

```css
.price::before {
  content: "Rs ";
}
p::first-line { font-weight: 600; }
input::placeholder { color: #6b7280; }
::selection { background: #fde68a; }   /* text the user has selected */
```

`::before` and `::after` insert a box as the first or last child of the element; they require a `content` property (which may be empty, `content: ""`, for purely decorative shapes). Do not put important information in generated content: it is not reliably read by assistive technology or copied with the text.

## The cascade: which rule wins?

### Level 2 — The problem

Several rules can set the same property on the same element:

```css
p { color: black; }
.notice { color: darkred; }
#delivery-note { color: green; }
```

```html
<p class="notice" id="delivery-note">Orders after 6 p.m. arrive tomorrow morning.</p>
```

What colour is the text? The browser decides with the **cascade**, comparing competing declarations in this order:

1. **Origin and importance.** Styles come from three origins: the browser's default stylesheet (the **user-agent** stylesheet), the user's own preferences, and the site's stylesheets (the **author** styles). Author styles beat browser defaults. The `!important` flag reverses some of this ordering (below).
2. **Cascade layers** (`@layer`), if used — explained later.
3. **Specificity** — the more precise selector wins.
4. **Order of appearance** — if everything else is equal, the declaration that comes **last** wins.

Inline styles (the `style` attribute) beat all selector-based author styles, except `!important` ones.

### Level 2 — Specificity

**Specificity** is a three-part score, usually written (A, B, C):

- **A** — the number of **ID** selectors.
- **B** — the number of **class** selectors, attribute selectors and pseudo-classes.
- **C** — the number of **type** selectors and pseudo-elements.

Scores are compared column by column, from left to right — not added up. (0, 1, 0) beats (0, 0, 9): one class beats any number of type selectors. And (1, 0, 0) beats (0, 15, 0).

| Selector | A (IDs) | B (classes, attributes, pseudo-classes) | C (types, pseudo-elements) |
|---|---|---|---|
| `p` | 0 | 0 | 1 |
| `.notice` | 0 | 1 | 0 |
| `p.notice` | 0 | 1 | 1 |
| `.card .price` | 0 | 2 | 0 |
| `nav ul li a:hover` | 0 | 1 | 4 |
| `#delivery-note` | 1 | 0 | 0 |
| `*` | 0 | 0 | 0 |

So in the example above, the ID selector wins: the text is **green**.

A few details:

- `:not()`, `:is()` and `:has()` take the specificity of their **most specific argument**. `:where()` always has **zero** specificity, which makes it useful for easily-overridable base styles.
- The universal selector `*` and combinators (` `, `>`, `+`, `~`) add nothing.

### Level 3 — Why specificity causes "my CSS doesn't work"

Here is the most common CSS bug, in miniature:

```css
/* written early, in the layout file */
#sidebar a { color: #1d4ed8; }

/* written later, in the buttons file */
.button-danger { color: white; background: #b91c1c; }
```

A link with `class="button-danger"` inside `#sidebar` shows **blue** text on red. The later rule did not win, because `#sidebar a` has specificity (1, 0, 1), which beats `.button-danger` at (0, 1, 0). The developer then adds `!important`, or writes `#sidebar .button-danger`, and the next developer must out-specify **that**... This escalation is called a **specificity war**.

The professional answer is to **keep specificity low and flat**: style with single classes, avoid IDs in CSS selectors, avoid long descendant chains. When almost everything has specificity (0, 1, 0), the order of rules decides — and that is easy to reason about.

### Level 3 — `!important`

```css
.hidden { display: none !important; }
```

`!important` makes a declaration beat every normal declaration, regardless of specificity. It has legitimate uses — utility classes that must always win, overriding third-party styles you cannot change, and user accessibility stylesheets — but using it to "fix" a specificity problem only moves the war one level up. Treat `!important` in application code as a code smell ({{ch:clean-code}}).

### Level 4 — Cascade layers

**Cascade layers** (`@layer`, available in all major browsers since 2022) let you decide explicitly which **groups** of styles win, before specificity is even considered:

```css
@layer reset, base, components, utilities;

@layer reset {
  * { margin: 0; }
}

@layer base {
  a { color: #1d4ed8; }
}

@layer components {
  .button { color: white; background: #0b6e4f; }
}

@layer utilities {
  .text-danger { color: #b91c1c; }
}
```

- The first line declares the **order** of the layers: later layers win over earlier ones.
- A rule in `utilities` beats a rule in `components` **even if** the component rule has higher specificity. Within a layer, normal specificity and order apply.
- Styles not in any layer beat all layered styles.

Layers are powerful in large codebases and design systems, where styles come from resets, third-party libraries, components and utilities. They end specificity wars by making the intended priority explicit.

## Inheritance and default values

Some properties are **inherited**: if you do not set them on an element, it takes its parent's value. Most text properties inherit — `color`, `font-family`, `font-size`, `line-height`, `text-align`. Most box and layout properties do **not** — `margin`, `padding`, `border`, `width`, `background`, `display`.

That is why you set typography once, high up, and let it flow down:

```css
body {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #1f2937;
  line-height: 1.5;
}
```

Every element in the page now uses this font, colour and line height, unless something more specific overrides it.

Every property also has an **initial value** used when nothing is set and it is not inherited. You can request these behaviours explicitly with keywords: `inherit` (take the parent's value), `initial` (the property's initial value), `unset` (inherit if the property normally inherits, otherwise initial), and `revert` (go back to the browser's default style).

## The box model

### Level 2 — Every element is a box

Every element is drawn as a rectangle made of four layers, from the inside out:

```text
  ┌───────────────────────── margin ─────────────────────────┐
  │   ┌─────────────────────── border ───────────────────┐   │
  │   │   ┌─────────────────── padding ──────────────┐   │   │
  │   │   │                                          │   │   │
  │   │   │              content                     │   │   │
  │   │   │        (text, images, children)          │   │   │
  │   │   │                                          │   │   │
  │   │   └──────────────────────────────────────────┘   │   │
  │   └──────────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────────────┘
```

- **Content** — the text, image or child elements.
- **Padding** — space **inside** the border, between the border and the content. The background colour extends into it.
- **Border** — a line around the padding.
- **Margin** — space **outside** the border, separating the box from its neighbours. Always transparent.

### Level 3 — `box-sizing`

Here is the surprise that confuses every beginner:

```css
.card {
  width: 300px;
  padding: 20px;
  border: 1px solid #d1d5db;
}
```

How wide is the card on screen? By default, **342 pixels**: 300 for the content, plus 20 + 20 for padding, plus 1 + 1 for the border. In the default `box-sizing: content-box`, `width` sets the width of the **content** only.

Almost every modern project changes this globally:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

With `border-box`, `width` means the width of the whole box **including** padding and border. The card above is exactly 300 pixels wide, and the content area shrinks to 258 pixels. Layout maths becomes intuitive: two `width: 50%` columns with padding fit side by side.

### Level 3 — Margins, padding and shorthand

```css
.card {
  padding: 16px;                 /* all four sides */
  padding: 16px 24px;            /* top & bottom, left & right */
  padding: 8px 16px 24px;        /* top, left & right, bottom */
  padding: 8px 16px 24px 32px;   /* top, right, bottom, left (clockwise) */
  margin-block: 24px;            /* top and bottom (in horizontal writing) */
  margin-inline: auto;           /* left and right: auto centres a block */
}
```

The four-value form goes **clockwise from the top**: top, right, bottom, left.

`margin-block` and `margin-inline` are **logical properties**: "block" is the direction paragraphs stack (top to bottom in English), "inline" is the direction text flows (left to right in English, right to left in Urdu or Arabic). Logical properties adapt automatically to the writing direction, which makes them the better choice for sites that support right-to-left languages.

A classic way to centre a block of fixed or maximum width horizontally:

```css
.page {
  max-width: 1100px;
  margin-inline: auto;
  padding-inline: 16px;
}
```

`margin-inline: auto` shares the remaining horizontal space equally between left and right. `max-width` (rather than `width`) lets the page shrink on small screens.

### Level 3 — Margin collapsing

One more box-model surprise: the **vertical** margins of adjacent blocks in normal flow **collapse** — they overlap, and the larger one wins, instead of adding up.

```css
h2 { margin-bottom: 24px; }
p  { margin-top: 16px; }
```

The space between an `h2` and the following `p` is **24 pixels**, not 40. Margin collapsing was designed for text, so paragraph spacing stays even. It does not happen with horizontal margins, or inside Flexbox and Grid containers. Many teams avoid confusion by using margins in one direction only (for example, only `margin-bottom`), or by using `gap` in flex and grid layouts.

### Overflow

When content is larger than its box, the `overflow` property decides what happens: `visible` (the default — it spills out), `hidden` (clipped), `scroll` (always shows scrollbars), or `auto` (scrollbars only when needed). `overflow-x: auto` on a wrapper is the standard way to let a wide table scroll on a phone ({{ch:html}}).

## Units and values

### Level 2 — Absolute and relative units

| Unit | Relative to | Typical use |
|---|---|---|
| `px` | A "CSS pixel" (about 1/96 of an inch at normal viewing distance) | Borders, small fixed details |
| `rem` | The **root** (`html`) font size — 16px by default | Font sizes, spacing |
| `em` | The **current element's** font size | Spacing that should scale with the element's text |
| `%` | Usually the parent's size | Widths in fluid layouts |
| `vw`, `vh` | 1% of the viewport's width or height | Full-screen sections, fluid type |
| `dvh`, `svh`, `lvh` | Dynamic, small and large viewport height | Mobile full-height layouts |
| `ch` | The width of the "0" character in the current font | Limiting line length for readability |
| `fr` | A fraction of the free space in a grid | Grid columns and rows |

**Why `rem` for font sizes?** Many people increase their browser's default font size because they have low vision. If you set `font-size: 14px`, you override their choice; if you set `font-size: 0.875rem`, the text scales with it. Using `rem` for spacing too keeps the whole design proportional when text grows.

**Why `ch` for text width?** Long lines are hard to read. A maximum of roughly 60–75 characters per line is a widely used guideline: `max-width: 65ch`.

**The mobile `vh` problem.** On phones, the browser's address bar appears and disappears as you scroll, so the viewport height changes. `100vh` is based on the largest size, so a "full-screen" section can be partly hidden behind the address bar. The newer `100dvh` (dynamic viewport height) follows the current visible height.

### Level 3 — Calculations and fluid values

```css
.sidebar { width: calc(100% - 320px); }

h1 { font-size: clamp(1.75rem, 1.2rem + 2.5vw, 3rem); }

.thumb { width: min(100%, 480px); }
```

- `calc()` does arithmetic with mixed units.
- `clamp(minimum, preferred, maximum)` keeps a value between limits. Here the heading grows smoothly with the viewport width but never goes below 1.75rem or above 3rem — **fluid typography** with no media queries.
- `min()` and `max()` choose the smaller or larger of several values. `min(100%, 480px)` means "full width, but never more than 480 pixels".

### Colour

```css
.brand {
  color: #0b6e4f;                        /* hexadecimal: red, green, blue */
  color: rgb(11 110 79);                 /* the same colour */
  color: rgb(11 110 79 / 0.8);           /* with 80% opacity */
  color: hsl(162 82% 24%);               /* hue, saturation, lightness */
  color: oklch(0.47 0.1 165);            /* perceptual: lightness, chroma, hue */
}
```

- **Hex** and **rgb()** describe colours as amounts of red, green and blue light.
- **hsl()** describes them as hue (an angle on a colour wheel), saturation and lightness — easier for people to adjust ("same hue, lighter").
- **oklch()**, newer and widely supported, is **perceptually uniform**: changing its lightness value changes how light the colour *looks* consistently across hues, which makes it excellent for generating consistent colour palettes.

Whatever format you use, check **contrast**. Text must stand out clearly from its background for people with low vision, colour blindness, or a phone in bright sunlight. The Web Content Accessibility Guidelines (WCAG) recommend a contrast ratio of at least **4.5:1** for normal text and 3:1 for large text. Browser developer tools show the ratio when you inspect a colour. Never convey information by colour alone — an error should have text or an icon, not just a red border ({{ch:accessibility}}).

### Typography

```css
html {
  font-size: 100%;                         /* respect the user's default (usually 16px) */
}

body {
  font-family: "Inter", system-ui, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
}

h1 { font-size: 2rem; line-height: 1.2; font-weight: 700; }

.article { max-width: 65ch; }
```

- `font-family` lists fonts in order of preference, ending with a **generic family** (`sans-serif`, `serif`, `monospace`, or `system-ui` — the operating system's interface font) as a fallback.
- `line-height` without a unit (`1.6`) means "1.6 times the element's font size", and is inherited as a ratio — the safest form.
- Custom web fonts are loaded with `@font-face` or from a font service. They add download weight and can delay text; use `font-display: swap` so text appears immediately in a fallback font, and load only the weights you use ({{ch:frontend-performance}}).

## Layout, part 1: normal flow, display and positioning

### Level 2 — Normal flow

Without any layout CSS, elements are placed in **normal flow**: block elements stack vertically, each taking the full width; inline elements flow along lines like words. This is a perfectly good layout for an article — which is why HTML is readable even with no CSS at all.

### Level 3 — `display`

The `display` property controls how a box takes part in layout:

```css
.badge   { display: inline-block; }  /* flows in a line, but accepts width, height, vertical padding */
.menu    { display: flex; }          /* becomes a flex container (below) */
.gallery { display: grid; }          /* becomes a grid container (below) */
.modal   { display: none; }          /* not rendered at all; removed from layout and from the accessibility tree */
```

`display: none` removes an element completely — it takes no space and screen readers ignore it. `visibility: hidden` hides it but keeps its space. And to hide something **visually** while keeping it available to screen readers (for example, extra context for an icon button), use a "visually hidden" utility class:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
```

### Level 3 — Positioning

The `position` property takes an element out of (or adjusts it within) normal flow:

| Value | Behaviour |
|---|---|
| `static` | Default: normal flow. `top`, `left` and friends have no effect. |
| `relative` | Stays in normal flow, but can be **nudged** with `top`/`left`; also becomes the reference point for absolutely positioned children. |
| `absolute` | Removed from normal flow; positioned relative to the nearest **positioned ancestor** (one whose position is not `static`), or the page if there is none. |
| `fixed` | Removed from flow; positioned relative to the **viewport** — stays in place when scrolling. |
| `sticky` | Acts like `relative` until scrolling reaches a threshold, then sticks like `fixed` within its container. |

A common pattern — a "Sale" badge in the corner of a product card:

```css
.product-card {
  position: relative;        /* the reference point for the badge */
}

.product-card .badge {
  position: absolute;
  top: 8px;
  right: 8px;
}
```

And a header that stays visible while scrolling:

```css
.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
}
```

### Level 4 — `z-index` and stacking contexts

When boxes overlap, `z-index` decides which appears in front — but only for positioned elements (and flex or grid children), and only **within the same stacking context**. A **stacking context** is like a separate pile of paper: everything inside it is stacked together, and the whole pile is placed as one unit in its parent's pile. Elements create a new stacking context when they have, for example, `position` with a `z-index`, `opacity` less than 1, a `transform`, or `isolation: isolate`.

This explains the classic mystery: "I set `z-index: 9999` on my dropdown, but it is still behind the header." The dropdown is inside a stacking context whose **whole pile** sits behind the header's pile; no z-index inside it can lift it out. The fix is to change the z-index of the **context-creating ancestor**, or to render the dropdown elsewhere in the DOM. Teams avoid z-index chaos by defining a small scale of named levels (for example, dropdown 100, sticky header 200, modal 300, toast 400) as custom properties.

## Layout, part 2: Flexbox

### Level 2 — What Flexbox is for

**Flexbox** (the Flexible Box Layout) lays out items **in one dimension** — a row or a column — and distributes space among them. It is ideal for navigation bars, toolbars, rows of buttons, a card's internal layout, and centring.

```css
.toolbar {
  display: flex;
}
```

The element with `display: flex` becomes a **flex container**; its direct children become **flex items**. Flexbox works along two axes:

```text
  flex-direction: row (default)

  main axis ─────────────────────────────────────────▶
  ┌──────────────────────────────────────────────────┐   │
  │ ┌────────┐ ┌────────┐ ┌────────┐                 │   │ cross
  │ │ item 1 │ │ item 2 │ │ item 3 │    free space   │   │ axis
  │ └────────┘ └────────┘ └────────┘                 │   ▼
  └──────────────────────────────────────────────────┘
```

- The **main axis** runs in the `flex-direction` (a row: left to right; a column: top to bottom).
- The **cross axis** is perpendicular to it.

### Level 3 — The container properties

```css
.toolbar {
  display: flex;
  flex-direction: row;          /* row | column | row-reverse | column-reverse */
  justify-content: space-between; /* distribution along the MAIN axis */
  align-items: center;          /* alignment along the CROSS axis */
  gap: 12px;                    /* space between items */
  flex-wrap: wrap;              /* allow items to wrap onto new lines */
}
```

- **`justify-content`** — how items and free space are distributed along the main axis: `flex-start`, `center`, `flex-end`, `space-between` (first and last at the edges, equal gaps between), `space-around`, `space-evenly`.
- **`align-items`** — how items are aligned on the cross axis: `stretch` (default — items fill the container's height in a row), `center`, `flex-start`, `flex-end`, `baseline` (align text baselines).
- **`gap`** — space between items. Prefer it to margins on items: it puts space only **between** items, never at the edges.
- **`flex-wrap: wrap`** — when items do not fit on one line, they continue on the next.

The famous "how do I centre a div" question has a two-line answer:

```css
.centred {
  display: flex;
  justify-content: center;   /* horizontally (main axis of a row) */
  align-items: center;       /* vertically (cross axis) */
}
```

### Level 3 — The item properties: `flex-grow`, `flex-shrink`, `flex-basis`

Each flex item can control how it uses space:

```css
.search-bar {
  flex: 1 1 0;      /* grow: 1, shrink: 1, basis: 0 */
}
.logo {
  flex: 0 0 auto;   /* never grow, never shrink, use its own size */
}
```

- **`flex-basis`** — the item's starting size before free space is shared (`auto` means "use my width or my content's size").
- **`flex-grow`** — how much of the **leftover** space the item takes, relative to other items. Two items with `flex-grow: 1` share it equally; an item with 2 takes twice as much as an item with 1.
- **`flex-shrink`** — how much the item shrinks, relative to others, when there is **not enough** space.
- The shorthand `flex: 1` (meaning `1 1 0%`) is the common "take an equal share of the space" instruction.

Here is a typical header: logo on the left, a search box that fills the middle, buttons on the right.

```html
<header class="site-header">
  <a class="logo" href="/">Corner Shop</a>
  <form class="search" role="search">
    <label class="visually-hidden" for="q">Search products</label>
    <input id="q" name="q" type="search">
  </form>
  <nav class="actions" aria-label="Account">
    <a href="/account">Account</a>
    <a href="/cart">Cart (2)</a>
  </nav>
</header>
```

```css
.site-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
}

.logo    { flex: 0 0 auto; font-weight: 700; }
.search  { flex: 1; }                 /* takes all remaining space */
.search input { width: 100%; }
.actions { display: flex; gap: 12px; flex: 0 0 auto; }
```

- The logo and actions keep their natural size; the search form takes everything left over.
- `align-items: center` aligns all three vertically, whatever their heights.
- The actions are themselves a flex container — nesting flex layouts is normal.
- The visually hidden label keeps the search input accessible without showing the text.

A single item can override `align-items` with `align-self`, and `margin-left: auto` on an item pushes it (and everything after it) to the far end of the row — a handy trick for "everything left, this one right".

`order` can visually rearrange items, but it does **not** change the order in which keyboard users and screen readers move through them. Changing visual order without changing DOM order confuses people navigating by keyboard; use it rarely.

## Layout, part 3: Grid

### Level 2 — What Grid is for

**CSS Grid** lays out items **in two dimensions** at once — rows **and** columns. It is the right tool for page-level layouts (header, sidebar, content, footer) and for regular collections such as product galleries and dashboards.

A useful rule of thumb: **Flexbox when the content decides the layout** (a row of items of varying size); **Grid when the layout decides where the content goes** (a defined structure of rows and columns).

### Level 3 — Defining a grid

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
```

- `grid-template-columns: repeat(3, 1fr)` creates three columns, each taking one **fraction** of the free space — three equal columns.
- Children are placed into the cells automatically, row by row.
- `gap` sets the space between rows and columns.

Columns can mix units: `grid-template-columns: 240px 1fr` creates a fixed sidebar and a flexible content column; `200px 2fr 1fr` gives the middle column twice the share of the last.

### Level 3 — The responsive gallery without media queries

One line of Grid creates a gallery that adapts to any screen size:

```css
.products {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}
```

- `minmax(220px, 1fr)` — each column is at least 220 pixels wide, and may grow to share the free space.
- `repeat(auto-fill, ...)` — create **as many columns as fit**.
- On a 360-pixel phone: one column. On a tablet: three. On a wide screen: five or six. All columns stay equal, and no media query is needed.
- (`auto-fit` behaves like `auto-fill`, except that when there are too few items to fill a row, it collapses the empty tracks so the existing items stretch.)

### Level 4 — Named areas for page layout

For whole pages, **grid template areas** let you draw the layout with names:

```css
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  min-height: 100dvh;
  gap: 16px;
}

.page > header { grid-area: header; }
.page > aside  { grid-area: sidebar; }
.page > main   { grid-area: main; }
.page > footer { grid-area: footer; }

@media (max-width: 700px) {
  .page {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
  }
}
```

- The strings in `grid-template-areas` form a picture of the layout: each word is a cell, and repeating a name makes an area span several cells.
- Each landmark element ({{ch:html}}) is assigned to its area by name.
- `grid-template-rows: auto 1fr auto` makes the header and footer as tall as their content, and the middle row take the remaining height — so the footer stays at the bottom even on short pages.
- On narrow screens, a media query (explained next) redraws the picture as a single column. The HTML does not change at all.

Grid has much more — placing items by line numbers (`grid-column: 1 / 3` spans from line 1 to line 3), implicit rows, alignment, and **subgrid**, which lets nested elements align to their parent's grid tracks (useful for making the titles and prices of many cards line up).

## Responsive design

### Level 2 — The idea

**Responsive design** means one page that adapts to the device, instead of separate "mobile" and "desktop" sites. Three ingredients:

1. **Fluid layouts** — sizes in `%`, `fr`, `min()`, `clamp()` rather than fixed pixels.
2. **Flexible media** — images that never overflow: `img { max-width: 100%; height: auto; }`.
3. **Breakpoints** — media or container queries that change the layout where the design stops working.

And the viewport `<meta>` tag from {{ch:html}}, without which mobile browsers ignore all of this.

### Level 3 — Media queries and mobile-first

A **media query** applies rules only when a condition about the device is true:

```css
/* Base styles: small screens first */
.product-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

/* From 640px wide and up */
@media (min-width: 640px) {
  .product-grid { grid-template-columns: repeat(2, 1fr); }
}

/* From 1024px wide and up */
@media (min-width: 1024px) {
  .product-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
}
```

This is **mobile-first**: write the simplest, single-column layout as the default, then **add** complexity with `min-width` queries for larger screens. Mobile-first tends to produce simpler CSS (small screens rarely need to undo anything) and forces you to prioritise content for the most constrained screen.

Choose breakpoints where **your content** starts to look wrong, not by device names — there are thousands of device sizes. Newer syntax lets you write ranges more naturally: `@media (width >= 640px)`.

Media queries can test more than width:

```css
@media (prefers-color-scheme: dark) { /* the user prefers dark mode */ }
@media (prefers-reduced-motion: reduce) { /* the user wants less animation */ }
@media (hover: hover) and (pointer: fine) { /* a mouse, not just touch */ }
@media print { /* styles for printing */ }
```

### Level 4 — Container queries

Media queries respond to the **viewport**. But a component often does not care how wide the screen is — it cares how wide **its own space** is. A product card might sit in a wide main column on one page and a narrow sidebar on another. **Container queries** (supported in all major browsers since 2023) let components respond to their container:

```css
.card-slot {
  container-type: inline-size;
}

.product-card {
  display: grid;
  gap: 8px;
}

@container (min-width: 420px) {
  .product-card {
    grid-template-columns: 160px 1fr;   /* image beside text when there is room */
  }
}
```

- `container-type: inline-size` makes `.card-slot` a **query container** for its width.
- The `@container` rule applies when the nearest container is at least 420 pixels wide — wherever the card is placed.

Container queries make truly reusable components possible: each component adapts to the space it is given.

## Custom properties (CSS variables)

### Level 3 — Defining and using them

**Custom properties** are values you name and reuse:

```css
:root {
  --color-brand: #0b6e4f;
  --color-text: #1f2937;
  --color-surface: #ffffff;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --radius: 8px;
}

.button {
  background: var(--color-brand);
  color: white;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius);
}
```

- Names start with two dashes. `:root` matches the `html` element, so variables defined there are available everywhere.
- `var(--name)` reads the value; `var(--name, fallback)` supplies a fallback.
- Unlike variables in preprocessors such as Sass (which are replaced at build time), CSS custom properties are **live**: they cascade and inherit like any property, can be changed by media queries or by JavaScript, and every use updates instantly.

### Level 4 — Theming and dark mode

Because they cascade, custom properties make themes simple:

```css
:root {
  color-scheme: light dark;
  --color-text: #1f2937;
  --color-surface: #ffffff;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #e5e7eb;
    --color-surface: #111827;
  }
}

[data-theme="dark"] {
  --color-text: #e5e7eb;
  --color-surface: #111827;
}

body {
  color: var(--color-text);
  background: var(--color-surface);
}
```

- The site follows the operating system's dark-mode setting by default.
- A `data-theme="dark"` attribute on the `html` element (set by a toggle in JavaScript) lets users choose explicitly.
- `color-scheme: light dark` tells the browser that the page supports both, so built-in controls such as scrollbars and form fields match.
- Components never mention specific colours; they use the variables. This set of named values — colours, spacing, radii, font sizes — is what design systems call **design tokens**.

## Interaction, motion and modern conveniences

### Focus styles

Keyboard users need to see where they are. Browsers draw a **focus outline** by default. Never remove it without a replacement:

```css
/* Never do this alone */
button:focus { outline: none; }

/* Do this: a clear indicator for keyboard focus */
button:focus-visible {
  outline: 3px solid #f59e0b;
  outline-offset: 2px;
}
```

`:focus-visible` matches when the browser judges a visible focus indicator is helpful — typically keyboard navigation — so mouse users clicking a button do not see a ring they did not ask for, while keyboard users always do.

### Transitions

A **transition** animates a property smoothly when its value changes:

```css
.button {
  background: var(--color-brand);
  transition: background-color 150ms ease, transform 150ms ease;
}

.button:hover {
  background: #095c42;
  transform: translateY(-1px);
}
```

When the button is hovered, the background colour and position change over 150 milliseconds instead of instantly. `ease` is a **timing function** describing the speed curve.

### Animations

**Keyframe animations** run on their own, defined by stages:

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}

.skeleton {
  animation: pulse 1.5s ease-in-out infinite;
  background: #e5e7eb;
  border-radius: 4px;
}
```

This creates the "loading skeleton" effect shown while content loads.

### Respecting reduced motion

Animations can cause dizziness, nausea or headaches for people with vestibular disorders. Operating systems let users ask for reduced motion; respect it:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

(This is one of the legitimate uses of `!important`: a user-preference override that must win everywhere.)

### Nesting

Modern CSS supports **nesting** natively (in all major browsers since 2023), a feature previously available only through preprocessors such as Sass:

```css
.product-card {
  padding: var(--space-4);

  & .title {
    font-weight: 600;
  }

  &:hover {
    box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
  }

  @media (min-width: 640px) {
    padding: calc(var(--space-4) * 1.5);
  }
}
```

`&` refers to the parent selector. Nesting keeps related rules together — but deep nesting creates long, high-specificity selectors, so keep it shallow (one or two levels).

## Organising CSS in real projects

### Level 4 — The maintenance problem

CSS is **global by default**: every rule can affect any element on any page. In a small site this is convenient. In a large one, it becomes dangerous: a developer changes `.title` for the checkout page and accidentally changes titles across the whole site. Nobody dares delete old CSS, because nobody knows what depends on it — so stylesheets only grow.

Teams have developed several approaches to this problem:

**Naming conventions — BEM.** "Block, Element, Modifier" uses class names that encode structure and make collisions unlikely:

```css
.product-card { }                 /* block */
.product-card__title { }          /* element inside the block */
.product-card__price { }
.product-card--featured { }       /* modifier: a variation of the block */
```

Every selector is a single class (specificity 0,1,0), and the name says exactly what it styles.

**Scoped styles — CSS Modules.** Build tools rename classes automatically so that a `.title` in `ProductCard.module.css` becomes something like `ProductCard_title__x7f2a`, unique to that component. You write simple names; collisions are impossible. Common in React projects ({{ch:react-basics}}).

**Utility-first — Tailwind CSS.** Instead of writing custom CSS, you compose small single-purpose classes directly in the HTML: `class="flex items-center gap-4 p-4 rounded-lg"`. This is the subject of {{ch:tailwind}}.

**CSS-in-JS.** Libraries that write styles in JavaScript inside components. Popular for some years in the React world; less favoured recently because many add runtime cost, and some do not work well with server rendering.

**Preprocessors — Sass.** A language that compiles to CSS, adding variables, nesting, mixins and functions. Still common in existing codebases; native CSS now covers many of its original reasons (custom properties, nesting).

No approach is "correct". What matters is that a team **chooses one** and applies it consistently, keeps specificity low, uses design tokens for shared values, and can delete styles confidently.

### Level 4 — A small, sensible base

Most projects start from a short **reset** or base stylesheet that removes inconsistent browser defaults and sets sane defaults:

```css
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  color: var(--color-text);
  background: var(--color-surface);
}

img, picture, video, svg {
  display: block;
  max-width: 100%;
  height: auto;
}

input, button, textarea, select { font: inherit; }

h1, h2, h3, p { overflow-wrap: break-word; }
```

- `img { max-width: 100%; height: auto; }` makes images shrink to fit their container while keeping their proportions — combined with the `width`/`height` attributes from {{ch:html}}, they reserve the right space and scale responsively.
- `font: inherit` on form controls makes them use the page's font (by default, browsers give them their own smaller font).
- `overflow-wrap: break-word` stops very long words or URLs from breaking the layout on narrow screens.

## From beginner to enterprise

**Level 3 — a single page.** A small base stylesheet, `border-box`, typography set on `body`, Flexbox for rows, Grid for galleries, mobile-first media queries, visible focus styles.

**Level 4 — a real site.** Design tokens in custom properties; a consistent naming approach (BEM, CSS Modules or utilities); responsive images; dark mode; container queries for reusable components; tested at several widths.

**Level 5 — professional practice.** A design system with documented components; linting for CSS (for example, Stylelint) in CI; visual regression tests that compare screenshots before and after a change to catch unintended differences; accessibility checks for contrast and focus; performance budgets for CSS size.

**Level 6 — large organisations.** Shared component libraries consumed by many teams; cascade layers to order styles from resets, libraries, products and utilities; tokens generated from a single source and shared between web, iOS and Android; automatic removal of unused CSS at build time; strict ownership of global styles.

## Real-world use cases

### A product listing page

- **Requirement:** a grid of product cards that works from small phones to large monitors; each card shows an image, name, price and an "Add to cart" button aligned at the bottom.
- **Approach:** the list uses `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`; each card is a flex column with the button pushed to the bottom with `margin-top: auto`; images keep a fixed shape with `aspect-ratio: 1` and `object-fit: cover`.
- **Why:** no breakpoints are needed for the grid; cards with long names still line up their buttons; images of different shapes are cropped consistently instead of stretching.

### A brand refresh

- **Requirement:** marketing changes the brand colour and corner style across the whole site.
- **With tokens:** change `--color-brand` and `--radius` in one place; every component updates.
- **Without tokens:** search and replace hundreds of hard-coded hex values, missing some, and finding them for months afterwards.

### A layout that broke in another language

- **Problem:** the site added Urdu. With `margin-left`, `padding-right` and `left: 8px` hard-coded throughout, the right-to-left layout was mirrored incorrectly.
- **Fix:** logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-end`), `dir="rtl"` on the `html` element, and Flexbox/Grid, which already follow the writing direction.

## Common mistakes

### Beginner: fighting specificity with `!important` and IDs

**Fix:** flat, single-class selectors; understand which rule is winning (devtools shows it); cascade layers for intentional ordering.

### Beginner: fixed pixel widths everywhere

`width: 1200px` on a container makes the page scroll sideways on phones. **Fix:** `max-width` with fluid widths; `min()`; Grid and Flexbox.

### Beginner: removing focus outlines

`outline: none` "because it looks ugly" makes the site unusable by keyboard. **Fix:** design a clear `:focus-visible` style instead.

### Intermediate: using margins for spacing between flex or grid items

Extra space appears at the edges and calculations break when items wrap. **Fix:** `gap`.

### Intermediate: magic numbers for positioning

`top: 37px; left: 213px;` to line something up on one screen size. **Fix:** let Flexbox or Grid align it; positioned elements only for genuinely overlapping things such as badges and dropdowns.

### Intermediate: changing visual order but not DOM order

Grid or `order` rearranges items visually, so keyboard focus jumps around unpredictably. **Fix:** keep the HTML in a sensible reading order; use visual reordering sparingly.

### Production: z-index escalation

`z-index: 99999` scattered through the codebase. **Fix:** a small, named z-index scale in custom properties; understand stacking contexts.

### Production: unused CSS growing forever

Stylesheets of hundreds of kilobytes, mostly unused, slowing every page. **Fix:** component-scoped styles (CSS Modules or utilities) that are deleted with their components; build-time removal of unused rules; coverage tools in devtools to find dead CSS.

## Debugging and troubleshooting

The browser's developer tools are the essential CSS tool. Right-click an element and choose **Inspect**:

- **Styles panel** — every rule that matches the element, in cascade order, with overridden declarations **crossed out**. If your declaration is crossed out, another rule won; the panel shows which one, and where it is defined. If your rule does not appear at all, its selector does not match — check for typos and the actual DOM structure.
- **Computed panel** — the final value of every property, and (by expanding it) which rule produced it.
- **Box model diagram** — the element's exact content, padding, border and margin sizes.
- **Layout tools** — Flexbox and Grid overlays draw the lines, gaps and areas on the page.
- **Device toolbar** — preview the page at phone and tablet sizes.
- You can edit any value live and see the effect immediately — then copy the working change into your source.

Common symptoms and causes:

- **A declaration has a warning icon or is ignored** — an invalid value or a typo (`colour` instead of `color`). Invalid declarations are silently dropped.
- **`width` or `height` does nothing on a `<span>` or `<a>`** — inline elements ignore them; use `inline-block`, `block` or a flex/grid parent.
- **`top`/`left` do nothing** — the element is `position: static`.
- **An absolutely positioned element appears in the wrong place** — no positioned ancestor; add `position: relative` to the intended reference element.
- **The page scrolls sideways on mobile** — something is wider than the viewport: fixed widths, long unbroken text, or an image without `max-width: 100%`. A quick way to find it is a temporary rule `* { outline: 1px solid red; }` to see every box's edges.
- **Content jumps while loading** — images or embeds without reserved dimensions, or web fonts swapping ({{ch:frontend-performance}}).
- **`z-index` has no effect** — the element is not positioned, or it is trapped in a stacking context.

## Security, performance and accessibility

**Security.** CSS can be abused when attackers control it. Injected styles can hide or overlay parts of the page to trick users (for example, putting an invisible element over a "Confirm" button), and attribute selectors combined with background-image URLs have been used to leak values from pages. Never insert user-controlled text into stylesheets or `style` attributes without strict validation; for user-chosen colours, allow only validated values such as a hex code. A Content Security Policy can restrict where styles may come from ({{ch:application-security}}).

**Performance.**

- Keep CSS lean and remove unused rules: CSS blocks rendering until it is downloaded and parsed.
- Animate **`transform`** and **`opacity`**: they can be handled by the compositor without layout or paint, producing smooth 60-frames-per-second motion. Animating `width`, `height`, `top` or `margin` forces layout on every frame and stutters on slow phones.
- Avoid reading layout values (such as `offsetHeight`) and writing styles in alternation from JavaScript in a loop — it forces repeated layouts ("layout thrashing"; {{ch:browser-and-dom}}).
- Reserve space for images and embeds to prevent layout shifts ({{ch:frontend-performance}}).
- `content-visibility: auto` lets the browser skip rendering off-screen sections until they are needed — useful for long pages.

**Accessibility.** Sufficient colour contrast; never colour alone to convey meaning; visible focus styles; text sized in `rem` so it scales; layouts that survive 200% zoom without horizontal scrolling; respect `prefers-reduced-motion`; keep visual order consistent with DOM order. You will study these properly in {{ch:accessibility}}.

## How a senior engineer thinks about this

- **Use the right layout tool.** Normal flow for documents, Flexbox for one-dimensional rows and columns, Grid for two-dimensional structures, positioning only for overlap.
- **Let the browser do the maths.** Intrinsic and fluid sizing (`fr`, `minmax`, `clamp`, `auto-fill`) instead of breakpoint after breakpoint and pixel-perfect magic numbers.
- **Low, flat specificity**, and a consistent organisation strategy, so anyone can predict which rule wins.
- **Tokens over values.** Colours, spacing and radii come from a small set of named custom properties.
- **Design for change and for people:** themes, right-to-left languages, zoom, keyboard users, reduced motion.
- **Debug with the tools, not by guessing.** The Styles and Computed panels answer "why does this look like that?" in seconds.

## Exercises

### Exercise 1 — Predict the winner

**Objective:** practise the cascade and specificity.
**Starting point:**

```css
p { color: black; }
.message p { color: blue; }
.error { color: red; }
.message .error { color: orange; }
#notice { color: green; }
p.error { color: purple; }
```

```html
<div class="message">
  <p class="error">A</p>
  <p class="error" id="notice">B</p>
  <p>C</p>
</div>
```

**What to do:** give the colour of A, B and C, with the specificity of the winning selector.

<details>
<summary>Show the solution</summary>

Specificities: `p` (0,0,1); `.message p` (0,1,1); `.error` (0,1,0); `.message .error` (0,2,0); `#notice` (1,0,0); `p.error` (0,1,1).

- **A** matches `p`, `.message p`, `.error`, `.message .error` and `p.error`. The highest is `.message .error` at (0,2,0): **orange**. (`p.error` at (0,1,1) loses, because the B column is compared first: 2 beats 1.)
- **B** matches the same rules plus `#notice` at (1,0,0): **green**. One ID beats any number of classes.
- **C** matches `p` and `.message p`: **blue** (0,1,1).

**Lesson:** compare column by column, left to right — never add the numbers together. In real code, avoid needing to work this out: keep selectors flat.

</details>

### Exercise 2 — A responsive card grid

**Objective:** practise Grid, Flexbox and fluid sizing.
**What to build:** CSS for a list of product cards (`ul.products` containing `li.card` elements, each with an `img`, an `h3`, a `p.price` and a `button`). Requirements: cards at least 200px wide, as many per row as fit; 16px gaps; square images that fill the card width without distortion; the button always at the bottom of the card even when titles have different lengths.

<details>
<summary>Show the solution</summary>

```css
.products {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.card img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 4px;
}

.card h3 { margin: 0; font-size: 1rem; }
.card .price { margin: 0; font-weight: 700; }

.card button {
  margin-top: auto;          /* pushes the button to the bottom */
}
```

**Walkthrough:**
- `list-style: none` and zero margin/padding remove the default list bullets and indentation, while keeping the semantic list ({{ch:html}}).
- The grid creates as many 200px-minimum columns as fit, sharing extra space equally.
- Grid rows stretch all cards in a row to the same height. Each card is a flex column; `margin-top: auto` on the button takes up all remaining vertical space above it, so buttons line up at the bottom.
- `aspect-ratio: 1` makes images square; `object-fit: cover` crops instead of stretching.

**Common wrong approaches:** fixed `width: 25%` cards with media queries for every size; `position: absolute; bottom: 0` for the button (it then overlaps content).

</details>

### Exercise 3 — Debug the layout

**Objective:** practise diagnosing CSS problems.
**The scenario:** on phones, the checkout page scrolls sideways, the "Pay" button is hidden behind a sticky footer, and keyboard users cannot see which field is focused. The CSS includes:

```css
.checkout { width: 960px; margin: 0 auto; }
.summary-table { width: 100%; }
.footer-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 72px; }
input:focus { outline: none; }
```

**What to do:** explain each problem and fix it.

<details>
<summary>Show the solution</summary>

1. **Sideways scrolling:** `.checkout` is fixed at 960px, wider than any phone. Fix: `max-width: 960px; margin-inline: auto; padding-inline: 16px;` (and with `box-sizing: border-box` globally). If the summary table is still too wide, wrap it in a container with `overflow-x: auto`.
2. **Hidden "Pay" button:** the fixed footer bar covers the bottom 72px of the viewport, so the last content on the page sits underneath it. Fix: reserve space — `body { padding-bottom: 72px; }` (better, a custom property shared by both rules) — or make the footer `position: sticky` within the layout so it takes up space in the flow.
3. **Invisible focus:** `outline: none` removes the focus indicator. Fix:

```css
input:focus-visible {
  outline: 3px solid #f59e0b;
  outline-offset: 2px;
}
```

**How to find such problems quickly:** the device toolbar in devtools for the phone width; the temporary `* { outline: 1px solid red; }` trick to find the over-wide element; pressing Tab through the form to test focus.

</details>

### Exercise 4 — Production scenario: a themeable design

**Objective:** apply custom properties as design tokens.
**The scenario:** your company sells the same shop software to several stores, each with its own brand colour and corner style, and every store wants light and dark modes. Design the CSS token structure so that adding a new store needs **no** component CSS changes.

<details>
<summary>Show the solution</summary>

```css
/* 1. Base tokens: default brand, light mode */
:root {
  color-scheme: light dark;
  --brand: #0b6e4f;
  --brand-contrast: #ffffff;   /* text colour on brand backgrounds */
  --radius: 8px;
  --surface: #ffffff;
  --text: #1f2937;
  --border: #e5e7eb;
}

/* 2. Dark mode overrides only neutral tokens */
@media (prefers-color-scheme: dark) {
  :root {
    --surface: #111827;
    --text: #e5e7eb;
    --border: #374151;
  }
}

/* 3. One small block per store, set via <html data-store="..."> */
[data-store="mango-mart"] {
  --brand: #c2410c;
  --radius: 16px;
}

[data-store="city-pharmacy"] {
  --brand: #1d4ed8;
  --radius: 2px;
}

/* 4. Components use only tokens */
.button {
  background: var(--brand);
  color: var(--brand-contrast);
  border-radius: var(--radius);
}

.card {
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
```

**Walkthrough:** components never contain raw colours or radii — only token names — so a new store is one small block of token values. Dark mode changes only the neutral tokens, and the brand tokens continue to apply. In production you would also **check contrast** for each store's brand colour against `--brand-contrast` in both modes (an automated test can calculate the ratio), and you might generate these blocks from a configuration file that the store owners edit. This is the core of how design systems and white-label products are themed.

</details>

## Summary

CSS describes how HTML is presented. The browser parses CSS into the CSSOM, computes each element's style, builds the render tree, calculates **layout**, **paints** and **composites**. When several declarations apply, the **cascade** decides: origin and importance, then cascade layers, then **specificity** (IDs, then classes/attributes/pseudo-classes, then types, compared column by column), then order. Keep specificity low and flat; treat `!important` as a last resort. Text properties **inherit**; box properties do not.

Every element is a **box** of content, padding, border and margin; set `box-sizing: border-box` globally, and remember that vertical margins collapse. Prefer relative units — `rem` for type and spacing, `%`, `fr`, `ch`, `dvh` — and fluid functions such as `clamp()` and `min()`. Check colour contrast.

Lay out with **normal flow** for documents, **Flexbox** for one-dimensional rows and columns (`justify-content`, `align-items`, `gap`, `flex: 1`), **Grid** for two-dimensional structures (`fr`, `repeat(auto-fill, minmax(...))`, template areas), and **positioning** only for overlap — understanding stacking contexts. Build **mobile-first** with media queries, and use **container queries** for reusable components. Store design decisions in **custom properties** for theming and dark mode. Keep focus visible, respect reduced motion, animate `transform` and `opacity`, organise CSS with one consistent strategy, and debug with the browser's developer tools.

## Key terms

- **CSS (Cascading Style Sheets)** — The language that describes the presentation and layout of HTML documents.
- **Rule (CSS)** — A selector together with a block of declarations.
- **Selector** — A pattern that determines which elements a CSS rule applies to.
- **Declaration** — A CSS property and its value.
- **CSSOM (CSS Object Model)** — The browser's internal structure representing the parsed stylesheets.
- **Computed style** — The final value of every CSS property for an element after the cascade and inheritance.
- **Cascade** — The algorithm that decides which of several conflicting declarations applies to an element.
- **Specificity** — A score based on the kinds of selectors in a rule, used by the cascade to choose between rules.
- **Inheritance (CSS)** — The passing of certain property values, mostly text-related, from parent elements to their children.
- **Cascade layer** — A named group of styles whose priority in the cascade is declared explicitly with `@layer`.
- **User-agent stylesheet** — The browser's built-in default styles.
- **Pseudo-class** — A selector that matches elements in a particular state or position, such as `:hover` or `:first-child`.
- **Pseudo-element** — A selector that targets part of an element or generated content, such as `::before`.
- **Box model** — The model in which every element is a box of content, padding, border and margin.
- **box-sizing** — The property that decides whether width and height include padding and border.
- **Margin collapsing** — The merging of adjacent vertical margins in normal flow into a single margin.
- **Logical property** — A property such as `margin-inline` that adapts to the writing direction instead of fixed left and right.
- **rem** — A CSS unit equal to the root element's font size.
- **Viewport units** — Units such as `vw` and `dvh` that are relative to the size of the visible browser area.
- **Normal flow** — The default layout in which blocks stack vertically and inline content flows in lines.
- **Positioning** — Taking an element out of or adjusting it within normal flow using `relative`, `absolute`, `fixed` or `sticky`.
- **Stacking context** — A group of elements stacked together as a unit, within which `z-index` values are compared.
- **Flexbox** — A one-dimensional layout model for distributing space and aligning items in a row or column.
- **Main axis / cross axis** — In Flexbox, the direction items are laid out in, and the direction perpendicular to it.
- **CSS Grid** — A two-dimensional layout model for arranging items in rows and columns.
- **fr unit** — A Grid unit representing a fraction of the free space in the grid container.
- **Responsive design** — Designing pages that adapt their layout to different screen sizes and devices.
- **Media query** — A condition about the device or user preferences under which CSS rules apply.
- **Mobile-first** — Writing base styles for small screens and adding styles for larger screens with min-width queries.
- **Breakpoint** — A width at which a layout changes to suit the available space.
- **Container query** — A condition based on the size of an element's container rather than the viewport.
- **Custom property (CSS variable)** — A named, reusable value defined with two leading dashes and read with `var()`.
- **Design token** — A named design decision, such as a colour or spacing value, shared across a product.
- **Focus indicator** — The visible mark showing which element has keyboard focus.
- **Transition** — A smooth change of a property's value over time when it changes.
- **Keyframe animation** — An animation defined by a sequence of styles at stages, using `@keyframes`.
- **BEM** — A class-naming convention of block, element and modifier that keeps CSS selectors flat and predictable.
- **CSS Modules** — A build-time technique that makes class names unique to each component file.
- **Contrast ratio** — A measure of the difference in brightness between text and its background, used to judge readability.

## What comes next

You can now give pages structure with HTML and appearance with CSS. But a page that only looks right is still static. The next chapter, {{ch:browser-and-dom}}, connects the JavaScript you learned in Part II to the page itself: how the browser exposes the document as the DOM, how to find, create and change elements, how to respond to clicks, typing and form submissions with events, and how to fetch data from servers — the foundation on which React and every other front-end framework are built.
