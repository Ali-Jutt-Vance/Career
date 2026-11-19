# Tailwind CSS

> [!GOALS]
> - Explain the **utility-first** approach, the problems with traditional CSS that it addresses, and the honest criticisms of it.
> - Explain how Tailwind works inside: scanning your files, generating only the CSS you use, and building from design tokens.
> - Install and configure Tailwind (version 4) and customise its theme with CSS variables.
> - Write layouts and components with utilities for spacing, typography, colour, Flexbox, Grid and borders.
> - Use **variants** for hover, focus, responsive breakpoints, dark mode, container queries and group/peer states.
> - Use arbitrary values sensibly, and know why class names must never be built dynamically from fragments.
> - Keep markup maintainable with components, variant helpers and class-merging utilities — and know when to write plain CSS instead.
> - Build accessible, responsive interfaces with Tailwind, and debug common problems.

## Why this matters

In {{ch:css}} you learned how CSS really works: the cascade, specificity, the box model, Flexbox, Grid and custom properties. You also saw the **maintenance problem**: CSS is global, so on a large site every change risks breaking something elsewhere, nobody dares delete old rules, and stylesheets grow forever. Teams invented naming conventions (BEM), scoped styles (CSS Modules) and design tokens to cope.

**Tailwind CSS** takes a different approach that has become one of the most widely used ways to style modern web applications, especially with component frameworks such as React and Next.js. Instead of writing a stylesheet full of custom class names (`.product-card__price--discounted`), you compose small, single-purpose classes directly in your markup:

```html
<p class="text-lg font-bold text-emerald-700">Rs 450</p>
```

Many developers react to this the first time with discomfort — "isn't that just inline styles with extra steps?" It is a fair question, and this chapter answers it honestly. You will see what Tailwind actually solves, how it works, how to use it well, and where its costs are. You will meet it in many job listings and codebases, and the shadcn/ui style of component libraries popular in the React ecosystem is built on it. Because Tailwind **is** CSS underneath, everything from {{ch:css}} still applies — Tailwind only changes how you write and organise it.

## The simple idea

Think of furnishing rooms in two ways.

In the first, for every room you commission **custom furniture** from a carpenter: a bespoke sofa for the living room, a bespoke desk for the study. Each piece has its own name and design. Over the years, you have hundreds of unique pieces — and when you want everything to match a new colour, you must visit each one.

In the second, you buy from a well-designed **modular system**: a fixed set of standard parts — shelves in a few sizes, legs, panels, cushions in a fixed palette of colours — that combine to make anything. Every room is built from the same parts, so everything fits and matches automatically, and you never invent a new kind of shelf.

Tailwind is the modular system. Its "parts" are utility classes such as `p-4` (padding of one standard step), `text-lg` (a standard font size) and `bg-emerald-600` (a colour from the palette). You build every element by combining parts.

> [!ANALOGY]
> Tailwind is like furnishing every room from one well-designed modular system of standard parts, instead of commissioning custom furniture for each room.
>
> **Where the analogy breaks:** physical modular parts are expensive to change; in Tailwind, the "standard parts" come from a theme you can redefine in one place, and every element using them updates. And unlike furniture, you can still order a custom piece at any time — plain CSS is always available when the standard parts are not enough.

## The proper definition and key words

**Tailwind CSS** is a **utility-first CSS framework**: a tool that generates a large vocabulary of small CSS classes, each applying one style, from a configurable design system, and includes in the final stylesheet only the classes your project actually uses.

The key words:

- **Utility class** — a class that does one small job, usually setting one CSS property to one value: `flex` sets `display: flex`; `mt-4` sets a top margin.
- **Utility-first** — styling mainly by composing utility classes in markup, rather than writing custom CSS rules for each component.
- **Theme** (or design tokens) — the named values the utilities are built from: the colour palette, the spacing scale, font sizes, breakpoints ({{ch:css}}).
- **Variant** — a prefix that applies a utility only in a certain condition: `hover:`, `focus-visible:`, `md:`, `dark:`.
- **Arbitrary value** — a one-off value written in square brackets when the theme does not have what you need: `w-[37rem]`.
- **Build step** — the process that scans your source files and generates the CSS.

## Why utility-first? The problems it addresses

### Level 2 — Naming things

In traditional CSS, every piece of styled markup needs a name: `.card`, `.card-header`, `.card-header-title`, `.promo-card-header-title-large`. Naming is hard ({{ch:clean-code}}), and much of it is wasted effort: the name exists only to connect a piece of HTML to a block of CSS in another file.

### Level 2 — Global styles and fear of change

A class defined in one place can affect any page that uses it. Change `.card` padding for the checkout page, and every card on the site changes. Nobody can safely delete `.promo-card-old`, because nobody knows whether some page still uses it. Stylesheets only grow.

With utilities, styles live **on the element**. Changing the padding of the checkout card changes the checkout card — nothing else. Delete the markup, and its styles are gone with it; nothing is left behind.

### Level 2 — Inconsistency

Without constraints, a large team produces dozens of slightly different greys, paddings of 13, 14, 15 and 17 pixels, and seven font sizes that are almost the same. Tailwind's utilities come from a **fixed scale**: padding is `p-3`, `p-4`, `p-6`; colours are from the palette. Inconsistency becomes harder than consistency.

### Level 2 — Growing CSS

Utility CSS **stops growing**. Once your project uses `flex`, `p-4` and `text-lg`, those three classes exist once in the stylesheet, however many thousands of elements use them. The total CSS size depends on how many **different** utilities you use, not on how many pages you build.

### Level 2 — "Isn't this just inline styles?"

No, in several important ways:

| | Inline `style="..."` | Tailwind utilities |
|---|---|---|
| Values | Anything (`padding: 13px`) | Constrained to the theme |
| Hover, focus, active states | Impossible | `hover:`, `focus-visible:` and more |
| Responsive design | Impossible (no media queries) | `sm:`, `md:`, `lg:` and container variants |
| Dark mode | Impossible | `dark:` |
| Specificity | Very high, hard to override | Low and predictable |
| Repeated values | Repeated in every element | One class, defined once |

### Level 5 — The honest criticisms

Tailwind is not free of costs, and a professional should know them:

- **Long class lists** make markup harder to read: `class="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-gray-300"`.
- **Duplication** across markup, if you do not extract components.
- **Learning a vocabulary** on top of CSS — and you still need to understand the CSS underneath to use it well.
- **Separation of concerns.** Critics argue that structure and appearance should live in separate files. Advocates reply that in component-based applications, the meaningful unit is the **component**, which owns its structure, behaviour and appearance together.
- **Tooling dependence.** A build step is required, and class names must be written in ways the tool can find.

The answer to most of these is **components**: you write the long class list once, inside a `Button` or `ProductCard` component, and use the component everywhere ({{ch:react-basics}}). Teams that use Tailwind without components, copying class lists across hundreds of files, suffer exactly the problems critics describe.

## How it works inside

Tailwind is a **build-time** tool. It does not run in the browser. Here is what happens:

```text
  your source files                  Tailwind                     output
  (.html, .tsx, .vue...)          ┌──────────────────────┐
  class="flex p-4 md:p-6"  ──────▶│ 1. scan files for    │
                                  │    class-like tokens │
  your CSS entry file             │ 2. match tokens to   │
  @import "tailwindcss";   ──────▶│    known utilities   │──────▶  styles.css
  @theme { --color-... }          │    + variants        │         (only the
                                  │ 3. generate CSS from │          utilities
                                  │    theme variables   │          you used)
                                  └──────────────────────┘
```

1. **Scan.** Tailwind reads your source files as plain text and extracts every string that **could** be a class name. It does not run your code or understand your framework; it simply looks for tokens like `flex`, `p-4`, `md:p-6`.
2. **Match.** Each token is checked against Tailwind's rules: is `p-4` a known utility? Is `md:` a known variant?
3. **Generate.** For each match, Tailwind writes the CSS, using values from your **theme**, and wraps variants in the right selectors or media queries. Unused utilities are never generated.

For `class="p-4 md:p-6 hover:bg-emerald-700"`, the generated CSS is roughly:

```css
.p-4 { padding: calc(var(--spacing) * 4); }

.hover\:bg-emerald-700:hover {
  @media (hover: hover) {
    background-color: var(--color-emerald-700);
  }
}

.md\:p-6 {
  @media (width >= 48rem) {
    padding: calc(var(--spacing) * 6);
  }
}
```

Several details are worth noticing:

- **The theme lives in CSS custom properties.** `--spacing` is `0.25rem` by default, so `p-4` means `1rem` (16px at default size) and `p-6` means `1.5rem`. Colours are variables such as `--color-emerald-700`. Changing a variable changes every utility built from it ({{ch:css}}).
- **Special characters are escaped** in the selector: the colon in `md:p-6` becomes `\:` in CSS.
- **Hover styles apply only on devices that can hover**, so touch screens do not get "stuck" hover states after a tap.
- **Every utility has the same low specificity** (one class), so their order in the generated stylesheet decides conflicts — and Tailwind controls that order (for example, responsive variants come after base utilities, so `md:p-6` overrides `p-4` at medium widths). Tailwind organises its output using **cascade layers** ({{ch:css}}), so your own unlayered CSS can override utilities predictably.

> [!INSIDE]
> Because Tailwind finds classes by **scanning text**, a class only exists in the output if its **complete name** appears somewhere in your source files. This single fact explains the most common Tailwind bug — dynamically built class names — covered later in this chapter.

## Getting started

### Level 3 — Installing Tailwind (version 4)

Tailwind version 4, released in 2025, simplified setup considerably: configuration moved into CSS, and source files are found automatically. In a project using the **Vite** build tool (common for React projects — {{ch:react-basics}}):

```bash
npm install tailwindcss @tailwindcss/vite
```

Add the plugin to `vite.config.ts`:

```ts
// fragment
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

And import Tailwind in your main CSS file:

```css
@import "tailwindcss";
```

That is all. Tailwind automatically scans your project's source files (ignoring things such as `node_modules` and files listed in `.gitignore`), and generates CSS as you work. Frameworks such as Next.js ({{ch:nextjs}}) offer Tailwind as an option when creating a project, using a PostCSS plugin (`@tailwindcss/postcss`). For a project without a bundler, a standalone command-line tool (`@tailwindcss/cli`) watches files and writes a CSS file.

> [!TIP]
> Install the official Tailwind CSS IntelliSense extension for your editor. It autocompletes class names, shows the CSS each class produces when you hover over it, and warns about conflicting classes. It makes learning the vocabulary far faster.

### Level 3 — Customising the theme

Your design system is defined with the `@theme` directive, using CSS custom properties with special name prefixes:

```css
@import "tailwindcss";

@theme {
  --color-brand-50: oklch(0.97 0.02 165);
  --color-brand-500: oklch(0.6 0.13 165);
  --color-brand-600: oklch(0.52 0.12 165);
  --color-brand-700: oklch(0.45 0.1 165);

  --font-sans: "Inter", system-ui, sans-serif;

  --breakpoint-3xl: 120rem;

  --radius-card: 0.75rem;
}
```

- Variables starting with `--color-` create colour utilities: you can now write `bg-brand-600`, `text-brand-700`, `border-brand-500`.
- `--font-sans` replaces the default sans-serif font stack used by `font-sans` (and by the page's base styles).
- `--breakpoint-3xl` adds a new responsive variant, `3xl:`.
- `--radius-card` creates `rounded-card`.
- Everything in `@theme` is also emitted as a normal CSS variable, so your own CSS — and JavaScript — can use `var(--color-brand-600)`.

To **replace** a whole group rather than add to it — for example, to use only your brand palette and remove Tailwind's default colours — you can reset a namespace inside `@theme` (`--color-*: initial;`) before defining your own values.

Older projects (Tailwind version 3 and earlier) configure the theme in a JavaScript file, `tailwind.config.js`, with a `content` list telling Tailwind which files to scan. You will meet many such projects; the concepts are identical, only the location of configuration differs.

## The core utilities

You do not need to memorise the whole vocabulary; most names follow CSS closely, and your editor autocompletes them. Learn the **patterns**.

### Level 3 — Spacing

Spacing utilities use the theme's spacing step (`0.25rem` by default) multiplied by the number:

| Class | CSS |
|---|---|
| `p-4` | `padding: 1rem` |
| `px-4` / `py-2` | horizontal / vertical padding |
| `pt-2`, `pr-2`, `pb-2`, `pl-2` | one side |
| `m-4`, `mx-auto`, `-mt-2` | margins; `auto`; negative margin |
| `gap-4`, `gap-x-6` | gap in flex and grid layouts |
| `space-y-4` | vertical space between children |
| `ps-4`, `me-2` | logical: padding-inline-start, margin-inline-end ({{ch:css}}) |

So `p-1` is 4px, `p-2` is 8px, `p-4` is 16px, `p-6` is 24px, `p-8` is 32px (at the default root font size). In version 4, any whole number works — `p-13` simply means 13 steps — but sticking to a small set of values keeps designs consistent.

### Level 3 — Typography and colour

```html
<h1 class="text-3xl font-bold tracking-tight text-gray-900">Fresh mangoes</h1>
<p class="mt-2 max-w-prose text-base leading-relaxed text-gray-600">
  Sindhri and Chaunsa, delivered the same day in Lahore.
</p>
<p class="text-sm font-medium uppercase text-brand-700">In season now</p>
```

- `text-3xl` sets the font size (and a matching line height); `text-gray-900` sets the colour. The same `text-` prefix serves both, distinguished by the value.
- `font-bold`, `font-medium` set weight; `tracking-tight` letter spacing; `leading-relaxed` line height.
- `max-w-prose` limits the line length to a comfortable reading width ({{ch:css}}).
- Colours follow `{property}-{colour}-{shade}`, with shades from 50 (lightest) to 950 (darkest): `bg-amber-100`, `border-gray-200`, `text-red-700`.
- Opacity can be added with a slash: `bg-black/50` is black at 50% opacity.

### Level 3 — Layout: Flexbox and Grid

The utilities map directly onto the CSS you learned in {{ch:css}}:

```html
<!-- A header row: logo, flexible search, actions -->
<header class="flex items-center gap-4 px-4 py-3">
  <a href="/" class="shrink-0 font-bold">Corner Shop</a>
  <form class="flex-1" role="search">
    <label for="q" class="sr-only">Search products</label>
    <input id="q" type="search" class="w-full rounded-md border border-gray-300 px-3 py-2">
  </form>
  <a href="/cart" class="shrink-0">Cart (2)</a>
</header>

<!-- A responsive product grid -->
<ul class="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-5">
  <!-- product cards -->
</ul>
```

- `flex`, `items-center`, `justify-between`, `gap-4`, `flex-1`, `shrink-0` correspond to `display: flex`, `align-items`, `justify-content`, `gap`, `flex: 1` and `flex-shrink: 0`.
- `sr-only` is Tailwind's "visually hidden" class: hidden on screen, available to screen readers ({{ch:css}}).
- `grid`, `grid-cols-3`, `col-span-2`, `gap-5` map onto CSS Grid. The responsive auto-fill grid from {{ch:css}} uses an **arbitrary value** in square brackets (below), because it is a full template rather than a simple column count. (Underscores stand for spaces inside arbitrary values; this one needs no spaces.)

### Level 3 — Sizing, borders and effects

```html
<article class="w-full max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
  <img src="/mangoes.jpg" alt="A box of ripe Sindhri mangoes" width="800" height="600"
       class="aspect-square w-full object-cover">
  <div class="p-4">
    <h3 class="font-semibold">Sindhri mangoes, 5 kg</h3>
    <p class="mt-1 text-lg font-bold text-brand-700">Rs 2,250</p>
  </div>
</article>
```

- `w-full` and `max-w-sm` for width; `aspect-square` and `object-cover` for consistent image shapes ({{ch:css}}).
- `rounded-xl` for corner radius; `border border-gray-200` for a one-pixel grey border; `shadow-sm` for a subtle shadow.
- `overflow-hidden` clips the image to the rounded corners.

## Variants: states, breakpoints and themes

**Variants** are prefixes that apply a utility only under a condition. They are where Tailwind becomes much more than inline styles.

### Level 3 — Interaction states

```html
<button type="button"
  class="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white
         hover:bg-brand-700
         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500
         active:scale-95
         disabled:cursor-not-allowed disabled:opacity-50">
  Add to cart
</button>
```

- `hover:bg-brand-700` — a darker background on hover (on devices that can hover).
- `focus-visible:` — a clear focus ring for keyboard users ({{ch:css}}). Never remove focus indicators without replacing them.
- `active:scale-95` — slightly shrinks while pressed, giving tactile feedback.
- `disabled:` — styles for the disabled state.

Many state variants exist: `first:`, `last:`, `odd:`, `even:`, `invalid:`, `required:`, `checked:`, `placeholder:`, `open:` (for `<details>` and `<dialog>`), and `aria-*` variants such as `aria-expanded:` that style elements based on their ARIA state.

### Level 3 — Responsive design

Tailwind is **mobile-first** ({{ch:css}}): an unprefixed utility applies at **every** size, and breakpoint prefixes apply **from that width upwards**.

| Prefix | Applies from | Default width |
|---|---|---|
| (none) | always | 0 |
| `sm:` | small | 40rem (640px) |
| `md:` | medium | 48rem (768px) |
| `lg:` | large | 64rem (1024px) |
| `xl:` | extra large | 80rem (1280px) |
| `2xl:` | 2× extra large | 96rem (1536px) |

```html
<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
  <!-- one column on phones, two from 640px, four from 1024px -->
</ul>

<nav class="hidden md:flex md:gap-6">
  <!-- hidden on small screens; a flex row from 768px -->
</nav>
```

A common beginner mistake is to read `sm:` as "on small screens". It means "from the small breakpoint **upward**". To target only small screens, write the default without a prefix, and override it at larger sizes. Ranges are also possible with `max-*` variants, such as `md:max-lg:` (between medium and large).

### Level 4 — Container queries

Container queries ({{ch:css}}) are built in: mark a container with `@container`, and use `@sm:`, `@md:` and similar variants on its children:

```html
<div class="@container">
  <article class="flex flex-col gap-3 @md:flex-row">
    <img class="aspect-square w-full @md:w-40" src="/mango.jpg" alt="Sindhri mango" width="400" height="400">
    <div>...</div>
  </article>
</div>
```

The card lays its image beside the text whenever **its container** is wide enough — whether it sits in a wide main column or a narrow sidebar.

### Level 4 — Dark mode

By default, the `dark:` variant follows the operating system preference (`prefers-color-scheme: dark`):

```html
<body class="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
  <div class="rounded-lg border border-gray-200 dark:border-gray-800">...</div>
</body>
```

To let users choose with a toggle, redefine the variant in your CSS so it follows a class (or a data attribute) on the `html` element instead:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

Now `dark:` utilities apply whenever an ancestor has the class `dark`, which your JavaScript adds or removes ({{ch:browser-and-dom}}).

A more scalable alternative, which large design systems prefer, is to define **semantic colour tokens** that change with the theme — `--color-surface`, `--color-text`, `--color-border` — and use `bg-surface` and `text-text` everywhere, so components need no `dark:` prefixes at all. This is the same token approach as in {{ch:css}}.

### Level 4 — Group and peer

Sometimes an element should change when **another** element is hovered or changes state:

```html
<a href="/fruit/mangoes" class="group block rounded-lg p-4 hover:bg-gray-50">
  <h3 class="font-semibold group-hover:text-brand-700">Mangoes</h3>
  <p class="text-sm text-gray-500">12 varieties</p>
  <span class="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">→</span>
</a>

<label class="block">
  <span>Email</span>
  <input type="email" required class="peer mt-1 w-full rounded border px-3 py-2">
  <span class="mt-1 hidden text-sm text-red-700 peer-user-invalid:block">Please enter a valid email address.</span>
</label>
```

- `group` on a parent lets children use `group-hover:`, `group-focus:` and similar: when the whole card is hovered, the title changes colour and the arrow appears.
- `peer` on an element lets **later siblings** use `peer-*` variants: the error message appears when the input is invalid after the user has interacted with it (`user-invalid` waits until the user has edited the field, so empty forms do not show errors immediately).
- `aria-hidden="true"` hides the decorative arrow from screen readers.

### Stacking variants

Variants can be combined: `dark:md:hover:bg-gray-800` applies in dark mode, from the medium breakpoint, on hover.

## Arbitrary values and escape hatches

When the theme does not contain the value you need, write it in square brackets:

```html
<div class="top-[117px] grid-cols-[200px_1fr] bg-[#bada55] text-[clamp(1.5rem,4vw,3rem)]"></div>
```

- `top-[117px]` — any length.
- `grid-cols-[200px_1fr]` — underscores become spaces, giving `grid-template-columns: 200px 1fr`.
- `bg-[#bada55]` — a one-off colour.
- `text-[clamp(...)]` — a fluid font size ({{ch:css}}).

You can also use a CSS variable directly: `bg-(--promo-colour)`, and write an arbitrary **property**: `[mask-type:luminance]`.

Use arbitrary values for genuine one-offs — matching an exact asset size, a third-party widget, a single unusual layout. If you find yourself writing the same arbitrary value repeatedly, it belongs in the **theme**. Many arbitrary colours scattered across a codebase are a sign the design system is being bypassed.

## Keeping it maintainable

### Level 3 — Extract components, not classes

The main tool for managing long class lists is the **component** in your framework. In React ({{ch:react-basics}}):

```tsx
// fragment
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500
        disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

// Used everywhere:
// <Button type="submit">Place order</Button>
```

The long class list exists **once**. Every button in the application is `<Button>`, and a design change to buttons is a one-line edit. (`className` is React's name for the `class` attribute.)

### Level 4 — Variants with a lookup table

Real components have variations: primary and secondary, small and large. A clear, type-safe way to handle them is a lookup table of **complete** class strings:

```ts
type Intent = "primary" | "secondary" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-lg font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";

const intents: Record<Intent, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  secondary: "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

function buttonClasses(intent: Intent = "primary", size: Size = "md", extra = ""): string {
  return [base, intents[intent], sizes[size], extra].filter(Boolean).join(" ");
}

console.log(buttonClasses());
console.log(buttonClasses("danger", "sm", "w-full"));
```

**Output:**

```text
inline-flex items-center justify-center rounded-lg font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 bg-brand-600 text-white hover:bg-brand-700 px-4 py-2 text-base
inline-flex items-center justify-center rounded-lg font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 text-sm w-full
```

- `Record<Intent, string>` ({{ch:typescript-advanced}}) forces every intent to have an entry, so adding a new intent without styles is a compile error.
- Every class string is **complete** — `"bg-red-600"`, never `"bg-" + colour + "-600"` — so Tailwind's scanner finds them all.
- `.filter(Boolean)` removes empty strings before joining.
- Libraries such as **cva** (class-variance-authority) package this exact pattern with extra features; it is widely used in React component libraries.

### Level 4 — Merging conflicting classes

What if a caller passes `extra = "bg-gray-500"` to a primary button that already has `bg-brand-600`? Both classes end up in the list. Which wins? **Not** the one written last in the `class` attribute — the order of classes in HTML has no effect on the cascade. The winner is whichever rule appears **later in the generated stylesheet**, which you do not control. The result can look random.

The usual solution is a helper that **removes conflicting utilities**, keeping the last one given. The library **tailwind-merge** does this, often wrapped together with **clsx** (which joins class names conditionally) in a tiny function commonly named `cn`:

```ts
// fragment
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

cn("px-4 py-2 bg-brand-600", isWide && "w-full", "bg-gray-500");
// → "px-4 py-2 w-full bg-gray-500"   (bg-brand-600 removed; the later bg wins)
```

You will see this `cn` helper in a great many React codebases.

### Level 4 — `@apply` and plain CSS

Tailwind lets you use utilities inside your own CSS with `@apply`:

```css
.prose-link {
  @apply font-medium text-brand-700 underline underline-offset-2 hover:text-brand-600;
}
```

This is useful when you cannot add classes to the markup — for example, styling HTML produced by a Markdown renderer or a content management system. But using `@apply` to recreate traditional named classes for everything brings back the problems utilities solve (naming, global CSS, unused rules). Prefer components; use `@apply` sparingly.

And remember: **plain CSS is always allowed**. Complex animations, intricate selectors, third-party widget overrides and styles for rich text are often clearer as a few lines of normal CSS in your stylesheet. Tailwind is a tool, not a rule. You can also define your own utilities with the `@utility` directive, which then work with all variants.

### Level 4 — Ordering classes

Long class lists are easier to scan when they are in a consistent order. The official Prettier plugin for Tailwind (`prettier-plugin-tailwindcss`) sorts classes automatically in a recommended order — layout first, then spacing, typography, colours, and variants — so every developer's markup looks the same and diffs stay small ({{ch:clean-code}}).

## The dynamic class name problem

### Level 3 — The bug

This is the most common Tailwind bug:

```tsx
// fragment
function Badge({ colour }: { colour: "green" | "red" }) {
  return <span className={`bg-${colour}-100 text-${colour}-800`}>…</span>;
}
```

It looks perfectly reasonable — and the badge has **no colour**. Why?

Recall how Tailwind works: it scans source files **as text**, looking for complete class names. Nowhere in the source does the text `bg-green-100` appear — only the fragments `bg-`, `-100` and a variable. The class is constructed at **runtime**, in the browser, long after Tailwind generated the CSS at **build time**. The CSS rule was never created.

### Level 3 — The fix

Always write **complete** class names in your source, and choose between them:

```tsx
// fragment
const badgeColours = {
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
} as const;

function Badge({ colour }: { colour: keyof typeof badgeColours }) {
  return <span className={badgeColours[colour]}>…</span>;
}
```

Every full class name now appears literally in the file, so the scanner finds them. This is exactly why the variant table in the previous section used complete strings.

The same rule applies to class names that come from a database or an API: Tailwind cannot know about them. Map such values to complete class strings in your code, or — for genuinely dynamic values like a user-chosen brand colour — use a CSS variable set with an inline style (`style={{ "--accent": colour }}` with `bg-(--accent)`), after validating the value ({{ch:css}}). As a last resort, the `@source inline(...)` directive can force specific classes to be generated.

## From beginner to enterprise

**Level 3 — learning.** Use utilities for spacing, type, colour and layout; mobile-first breakpoints; `hover:` and `focus-visible:`; editor IntelliSense; no dynamic class fragments.

**Level 4 — an application.** A custom theme with brand colours and fonts; components for every repeated element; a variant table or cva; the `cn` helper; Prettier class sorting; dark mode via tokens.

**Level 5 — professional practice.** A design system whose tokens are the Tailwind theme; documented components (often in a tool such as Storybook); lint rules and code review to keep arbitrary values rare; accessibility checks for contrast and focus ({{ch:accessibility}}); visual regression tests.

**Level 6 — large organisations.** A shared theme published as a package and imported by many applications; tokens generated from a single source (often a design tool) for web and mobile; component libraries copied into projects and owned by each team (the approach popularised by shadcn/ui) or published centrally; build-time checks that every app uses only approved tokens.

## Real-world use cases

### A startup building fast

- **Situation:** a small team builds a marketplace with Next.js and must ship screens quickly, without a dedicated designer.
- **Approach:** Tailwind's default palette and spacing scale act as a ready-made design system; a handful of components (`Button`, `Card`, `Input`, `Badge`) built early; a component library based on Tailwind for complex widgets such as dialogs and menus.
- **Why it works:** consistent design from day one; no time spent naming classes; styles deleted along with unused components.
- **Risk:** without discipline, class lists are copied into every page instead of extracted into components; the code becomes hard to change. Extract components early.

### A rebrand

- **Situation:** the company changes its brand colour and font.
- **With a theme:** change `--color-brand-*` and `--font-sans` in `@theme`; every utility using them updates.
- **Without it:** hundreds of hard-coded `bg-emerald-600` and arbitrary hex values across the codebase must be found and replaced. **Lesson:** use semantic brand tokens (`brand`) rather than raw palette names (`emerald`) for anything that represents the brand.

### Styling content you do not control

- **Situation:** blog posts are written in Markdown and rendered to HTML; you cannot add classes to each element.
- **Approach:** the official typography plugin (`@tailwindcss/typography`) provides a `prose` class that styles all the HTML inside a container — headings, lists, links, code — with good defaults, customisable through the theme. Alternatively, a small amount of plain CSS or `@apply` targeting the container's descendants.

## Common mistakes

### Beginner: building class names dynamically

`bg-${colour}-500` — the class is never generated. **Fix:** complete class names in lookup tables.

### Beginner: misreading breakpoints

Using `sm:` for phones. **Fix:** unprefixed means all sizes; prefixes mean "from this width up".

### Beginner: no focus styles

Removing outlines (`outline-none`) for appearance. **Fix:** `focus-visible:` styles on every interactive element.

### Intermediate: copying long class lists everywhere

**Consequence:** inconsistent duplicates; a design change requires editing dozens of files. **Fix:** components.

### Intermediate: conflicting classes

`p-4` and `p-2` on the same element, expecting the later one to win. **Fix:** do not combine conflicting utilities; use `tailwind-merge` when components accept extra classes.

### Intermediate: arbitrary values everywhere

`text-[#3a5f8a]`, `mt-[13px]` throughout. **Consequence:** the design system dissolves. **Fix:** add genuinely needed values to the theme; use the scale.

### Production: classes from the database

A CMS lets editors store class names; most render with no styles. **Fix:** store semantic options ("highlight", "warning") and map them to complete classes in code.

### Production: `@apply` for everything

Recreating hundreds of named classes with `@apply`. **Consequence:** all the problems of traditional CSS, plus a dependency on Tailwind. **Fix:** components; `@apply` only for markup you cannot control.

## Debugging and troubleshooting

- **A class has no effect.** Inspect the element in the browser's developer tools ({{ch:css}}). If the class is on the element but **no rule appears** in the Styles panel, Tailwind did not generate it: check for typos, dynamic construction, or a file Tailwind does not scan (for example, a file in a folder ignored by `.gitignore`, or a component from an installed package — add such locations with the `@source` directive). If the rule appears but is **crossed out**, another rule wins: look for conflicting utilities or your own CSS.
- **Hover styles do not work on a phone.** Expected: hover variants apply only on devices that support hover.
- **Styles work in development but not in production.** Usually a class built dynamically that happened to exist somewhere else during development, or a source path not scanned by the production build.
- **The page has no styles at all.** The CSS file is not imported, the build plugin is not configured, or the `@import "tailwindcss";` line is missing.
- **Dark mode does not switch with your toggle.** The default `dark:` variant follows the operating system; add the `@custom-variant` to switch with a class.
- **Editor hover shows the CSS for a class** — use it whenever you are unsure what a utility does.

## Security, performance and accessibility

**Security.** Tailwind itself adds little risk, but the patterns around it can: never insert user-provided strings into `class` attributes without mapping them to an allowed list, and validate user-supplied values used in inline styles or CSS variables ({{ch:css}}, {{ch:browser-and-dom}}).

**Performance.** Generated stylesheets are typically small, because only used utilities are included and each utility is defined once; they also compress very well. Avoid scanning huge directories unnecessarily (for example, build output), which slows builds. Large arbitrary class lists in server-rendered HTML increase page size slightly, but compression largely removes the repetition.

**Accessibility.** Tailwind makes it easy to build things that look interactive but are not: a `div` with `cursor-pointer hover:bg-gray-100` is still not a button. Use semantic HTML ({{ch:html}}), keep visible focus styles, check colour contrast of your palette combinations, use `sr-only` for hidden labels, and respect reduced motion with the `motion-safe:` and `motion-reduce:` variants (`motion-safe:animate-pulse` animates only for users who have not asked for reduced motion).

## How a senior engineer thinks about this

- **Tailwind is CSS.** They understand the CSS each utility produces, and reach for plain CSS when it is clearer.
- **Components are the unit of reuse.** Long class lists live inside components; pages compose components.
- **The theme is the design system.** Semantic tokens for brand and surfaces; few arbitrary values; changes in one place.
- **Complete class names only.** They know how the scanner works, so they never build classes from fragments.
- **Consistency over cleverness.** Sorted classes, a shared `cn` helper, an agreed variant pattern.
- **Choose with the team.** Utility-first, CSS Modules and other approaches all work; consistency within a codebase matters more than which one is chosen.

## Exercises

### Exercise 1 — Translate CSS to utilities

**Objective:** connect utilities to the CSS you know.
**Starting point:**

```css
.notice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #fde68a;   /* a light amber */
  border-radius: 0.5rem;
  background: #fffbeb;         /* a very light amber */
  color: #92400e;              /* dark amber */
  font-size: 0.875rem;
}
```

**What to do:** write the equivalent element using Tailwind's default palette (the amber shades 50, 200 and 800 are close to these colours).

<details>
<summary>Show the solution</summary>

```html
<div class="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
  Orders after 6 p.m. arrive the next morning.
</div>
```

**Walkthrough:** `flex` and `items-center` → display and alignment; `gap-3` → 0.75rem (3 × 0.25rem); `p-4` → 1rem; `border` → a 1px solid border, with `border-amber-200` setting its colour; `rounded-lg` → 0.5rem radius; `bg-amber-50`, `text-amber-800` → colours; `text-sm` → 0.875rem with a matching line height. If the exact hex values matter for the brand, add them to the theme as named colours rather than using arbitrary values everywhere.

</details>

### Exercise 2 — A responsive, accessible card

**Objective:** practise layout, responsive and state variants.
**What to build:** a product card that stacks image above text on narrow screens and places the image beside the text from the `sm` breakpoint; has a visible keyboard focus ring on its "Add to cart" button; shows a "Sold out" badge in the top-right corner of the image; supports dark mode.

<details>
<summary>Show the solution</summary>

```html
<article class="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white sm:flex-row
                dark:border-gray-800 dark:bg-gray-900">
  <div class="relative sm:w-48 sm:shrink-0">
    <img src="/chaunsa.jpg" alt="Three ripe Chaunsa mangoes" width="600" height="600"
         class="aspect-square w-full object-cover">
    <span class="absolute right-2 top-2 rounded-full bg-gray-900/80 px-2 py-0.5 text-xs font-medium text-white">
      Sold out
    </span>
  </div>
  <div class="flex flex-1 flex-col gap-2 p-4">
    <h3 class="font-semibold text-gray-900 dark:text-gray-100">Chaunsa mangoes, 5 kg</h3>
    <p class="text-lg font-bold text-brand-700 dark:text-brand-500">Rs 2,600</p>
    <button type="button" disabled
      class="mt-auto rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700
             focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500
             disabled:cursor-not-allowed disabled:opacity-50">
      Add to cart
    </button>
  </div>
</article>
```

**Walkthrough:** `flex-col sm:flex-row` stacks on phones and goes side by side from 640px. The image wrapper is `relative`, so the badge can be `absolute` in its corner ({{ch:css}}). `mt-auto` pushes the button to the bottom of the text column. The `disabled` attribute both prevents interaction and activates the `disabled:` styles — the visual state follows the real state. `dark:` utilities change surfaces and text in dark mode; with semantic tokens, these could be removed.

</details>

### Exercise 3 — Debug the missing styles

**Objective:** practise diagnosing Tailwind problems.
**The scenario:** an alert component shows correct spacing but no colours in production:

```tsx
// fragment
function Alert({ level, children }: { level: "info" | "warning" | "error"; children: React.ReactNode }) {
  const colour = level === "info" ? "blue" : level === "warning" ? "amber" : "red";
  return <div className={`rounded p-3 bg-${colour}-50 text-${colour}-800 border border-${colour}-200`}>{children}</div>;
}
```

**What to do:** explain why and fix it.

<details>
<summary>Show the solution</summary>

**Why:** `rounded`, `p-3` and `border` appear literally, so they are generated. The colour classes are assembled at runtime from fragments; the text `bg-blue-50` never appears in the source, so Tailwind never generates it. (If a few colours seemed to work in development, it was because those exact classes happened to be used somewhere else.)

**Fix:**

```tsx
// fragment
const alertStyles = {
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800",
} as const;

function Alert({ level, children }: { level: keyof typeof alertStyles; children: React.ReactNode }) {
  return (
    <div role={level === "error" ? "alert" : "status"} className={`rounded border p-3 ${alertStyles[level]}`}>
      {children}
    </div>
  );
}
```

Every class is now written in full. As a bonus, the alert gets an appropriate ARIA role so screen readers announce it ({{ch:accessibility}}).

</details>

### Exercise 4 — Production scenario: theming a multi-brand product

**Objective:** combine Tailwind's theme with design tokens.
**The scenario:** the same shop software serves several stores, each with its own brand colour, and all must support dark mode — without changing component code per store (compare {{ch:css}}, Exercise 4). How would you set up the Tailwind theme and components?

<details>
<summary>Show the solution</summary>

```css
@import "tailwindcss";

/* Semantic tokens become utilities: bg-surface, text-fg, border-line, bg-brand... */
@theme {
  --color-surface: var(--surface);
  --color-fg: var(--fg);
  --color-line: var(--line);
  --color-brand: var(--brand);
  --color-brand-fg: var(--brand-fg);
}

/* Default values (light) */
:root {
  --surface: #ffffff;
  --fg: #1f2937;
  --line: #e5e7eb;
  --brand: #0b6e4f;
  --brand-fg: #ffffff;
}

/* Dark mode changes only neutral tokens */
@media (prefers-color-scheme: dark) {
  :root {
    --surface: #111827;
    --fg: #e5e7eb;
    --line: #374151;
  }
}

/* One small block per store */
[data-store="mango-mart"] { --brand: #c2410c; }
[data-store="city-pharmacy"] { --brand: #1d4ed8; }
```

```html
<button class="rounded-lg bg-brand px-4 py-2 text-brand-fg">Add to cart</button>
<div class="rounded-lg border border-line bg-surface p-4 text-fg">…</div>
```

**Walkthrough:** the `@theme` block creates **semantic** colour utilities whose values point at plain CSS variables. Components use only semantic utilities (`bg-brand`, `text-fg`, `border-line`) — never raw palette colours and never `dark:` prefixes — so they work for every store and both modes. A store is a `data-store` attribute on the `html` element plus a few variable values, often generated from a configuration file. Contrast between `--brand` and `--brand-fg` should be checked automatically for each store.

</details>

## Summary

**Tailwind CSS** is a utility-first framework: you style elements by composing small classes, each doing one job, generated from a design system. It addresses real problems of traditional CSS — naming, global side effects, inconsistent values and ever-growing stylesheets — at the cost of long class lists and a new vocabulary, both best managed with **components**.

Tailwind is a **build-time** tool: it scans your files as text, matches complete class names to utilities and variants, and generates only the CSS you use, from **theme variables** defined in CSS with `@theme`. Utilities map closely onto CSS: spacing on a 0.25rem scale, typography, colours with shades, Flexbox, Grid, sizing, borders and effects. **Variants** add conditions: interaction states (`hover:`, `focus-visible:`, `disabled:`), mobile-first breakpoints (`sm:` means "from small upward"), container queries (`@md:`), dark mode (`dark:`), and relationships (`group-*`, `peer-*`). Arbitrary values in brackets handle one-offs; repeated ones belong in the theme.

Keep code maintainable with components, variant lookup tables (or cva), the `cn` helper with tailwind-merge for conflicts, and automatic class sorting. Never build class names from fragments — write complete names. Use plain CSS or `@apply` where markup cannot carry classes. And remember that Tailwind is CSS: semantic HTML, focus styles, contrast and reduced motion are still your responsibility.

## Key terms

- **Tailwind CSS** — A utility-first CSS framework that generates small single-purpose classes from a design system.
- **Utility class** — A CSS class that applies one small piece of styling, usually one property and value.
- **Utility-first** — An approach to styling that composes utility classes in markup instead of writing custom CSS for each component.
- **Theme (Tailwind)** — The set of design tokens, such as colours, spacing and breakpoints, from which Tailwind generates utilities.
- **@theme** — The Tailwind directive in CSS where theme variables are defined.
- **Spacing scale** — Tailwind's set of spacing values, each a multiple of a base step, used by padding, margin and gap utilities.
- **Variant (Tailwind)** — A prefix such as `hover:` or `md:` that applies a utility only under a particular condition.
- **Responsive variant** — A breakpoint prefix that applies a utility from a given viewport width upward.
- **Dark mode variant** — The `dark:` prefix, which applies utilities when a dark colour scheme is active.
- **Group and peer** — Tailwind mechanisms that style an element based on the state of a parent (`group`) or an earlier sibling (`peer`).
- **Arbitrary value** — A one-off value written in square brackets in a utility, such as `top-[117px]`.
- **Content scanning** — Tailwind's process of reading source files as text to find the class names that are used.
- **Dynamic class name** — A class name assembled at runtime from fragments, which a build-time scanner cannot detect.
- **@apply** — A Tailwind directive that applies utility classes inside a custom CSS rule.
- **@custom-variant** — A Tailwind directive for defining or redefining a variant, such as class-based dark mode.
- **tailwind-merge** — A library that removes conflicting Tailwind classes, keeping the last one given.
- **clsx** — A small library for building class strings conditionally from strings, arrays and objects.
- **cn helper** — A common function that combines clsx and tailwind-merge to build class strings safely.
- **class-variance-authority (cva)** — A library for defining component style variants as lookup tables of class strings.
- **Semantic token** — A design token named by its purpose, such as surface or brand, rather than its raw value.

## What comes next

You have seen, in {{ch:browser-and-dom}}, how hard it is to keep the DOM in sync with changing state by hand, and in this chapter how styles fit naturally inside components. The next chapter, {{ch:react-basics}}, brings these together: React, the most widely used library for building user interfaces from components — functions that turn state into UI, with React handling the work of updating the DOM efficiently.
