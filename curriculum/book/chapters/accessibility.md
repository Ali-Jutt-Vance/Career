# Accessibility: Building for Everyone

> [!GOALS]
> - Explain what accessibility is, who benefits from it, and why it is a legal, ethical and business requirement.
> - Describe how people with different disabilities use the web, including through **assistive technologies** such as screen readers.
> - Understand the **WCAG** guidelines: the four principles, conformance levels, and the success criteria developers meet most often.
> - Explain the **accessibility tree** and accessible names, and use semantic HTML as the foundation.
> - Use **ARIA** correctly — and know when not to use it.
> - Build accessible keyboard interaction, focus management, forms, dynamic updates, media, colour and motion.
> - Test accessibility with automated tools, keyboard checks, screen readers and real users, and build it into a team's process.

## Why this matters

Imagine a shop whose front door is at the top of a flight of steep stairs. People in wheelchairs, parents with prams, elderly customers and delivery workers with heavy boxes struggle or cannot enter at all. The shop has not chosen to exclude them — it just never thought about them. Adding a ramp fixes it, and as a bonus, everyone finds the ramp easier.

Websites have stairs too, invisible to the developers who build them:

- A blind customer's screen reader announces a checkout button as just "button", because it contains only an icon.
- Someone with tremors in their hands cannot click a tiny close icon on a pop-up, and cannot use the site at all while the pop-up covers it.
- A user who navigates by keyboard presses Tab and the focus disappears into an off-screen menu.
- A colour-blind customer cannot tell which form fields have errors, because errors are shown only by a red border.
- A deaf user cannot follow a product video without captions.
- A person with a cognitive disability is timed out of a form before they can finish it.

**Accessibility** (often shortened to **a11y** — "a", then 11 letters, then "y") is the practice of building products that people with disabilities can use. The World Health Organization estimates that around 1.3 billion people — about one in six people worldwide — experience significant disability. Many more have **temporary** impairments (a broken arm, an eye infection) or **situational** ones (a phone in bright sunlight, a noisy train, holding a baby in one arm). And everyone ages: vision, hearing and fine motor control decline for most people.

Accessibility is also increasingly a **legal requirement**. In the United States, courts have applied the Americans with Disabilities Act to websites, and government sites must meet Section 508; the European Accessibility Act requires many products and services sold in the European Union, including e-commerce, to be accessible from June 2025; many other countries have similar laws, most referring to the same international guidelines (WCAG). Companies face lawsuits and lost contracts over inaccessible sites.

You have met accessibility in almost every chapter of Part VI — semantic HTML, labels, contrast, focus, live regions. This chapter brings it together as a complete discipline.

## The simple idea

Think again of the ramp, but also of all the other things that make a building usable by everyone: lifts with braille buttons and spoken floor announcements, signs with large clear lettering, doors that open automatically, quiet rooms, clear maps. None of these changes **what** the building is for. They change **how many people** can use it.

Accessible software does the same: it offers more than one way to perceive information (see it, hear it, feel it in braille), more than one way to operate controls (mouse, touch, keyboard, voice, switches), and makes everything understandable and robust enough to work with the tools people rely on.

> [!ANALOGY]
> Accessibility is like making a building usable by everyone — ramps, lifts with spoken announcements, clear signs — without changing what the building is for.
>
> **Where the analogy breaks:** a building's ramp is added once and stays. Software changes every week, and each change can quietly break accessibility — a new button without a label, a modal that traps the keyboard. Accessibility must therefore be part of how a team builds **every** feature, not a renovation done once.

## The proper definition and key words

**Web accessibility** means that websites, tools and technologies are designed and developed so that people with disabilities can perceive, understand, navigate and interact with them, and contribute to them. (This is close to the definition used by the W3C's Web Accessibility Initiative.)

The key words:

- **Disability** — a condition that affects how a person interacts with the world; categories relevant to the web include visual, auditory, motor (physical), cognitive and neurological, and speech.
- **Assistive technology (AT)** — software or hardware people use to interact with computers: screen readers, screen magnifiers, switch devices, voice control, braille displays, alternative keyboards.
- **Screen reader** — software that reads the screen aloud or outputs it to a braille display, and lets users navigate by headings, links, landmarks and form fields. Common examples: NVDA and JAWS on Windows, VoiceOver on Apple devices, TalkBack on Android.
- **WCAG** (Web Content Accessibility Guidelines) — the international standard for web accessibility, published by the W3C.
- **Accessibility tree** — a simplified version of the DOM that browsers expose to assistive technology, containing each element's role, name and state.
- **Accessible name** — the text that assistive technology announces for an element ("Add Chaunsa mangoes to cart, button").
- **ARIA** (Accessible Rich Internet Applications) — a set of HTML attributes (`role`, `aria-*`) that add or change information in the accessibility tree.
- **Focus** — the element that currently receives keyboard input.

## How people use the web

Understanding real use is the foundation of good accessibility work. A few examples:

- **Blind users** typically use a **screen reader** with a keyboard (on desktops) or touch gestures (on phones). They rarely read pages top to bottom; they jump between **headings**, **landmarks**, **links** and **form fields**, using lists that the screen reader builds from the page. If your page has no headings, or every link says "click here", that navigation fails ({{ch:html}}).
- **Low-vision users** zoom the page (often to 200% or more), use screen magnifiers that show only a small part of the screen at a time, increase text size, or switch to high-contrast modes. Layouts must reflow without horizontal scrolling, and important information must not depend on colour alone.
- **Colour-blind users** (colour vision deficiency affects roughly 1 in 12 men and 1 in 200 women of Northern European descent) may not distinguish red from green — the two colours most often used for "error" and "success".
- **Users with motor disabilities** may use only a keyboard, a switch device that simulates one or two keys, voice control ("click Add to cart"), or eye-tracking. They need everything to work with the keyboard, large enough click targets, no actions that require precise dragging or holding, and enough time.
- **Deaf and hard-of-hearing users** need captions for video and transcripts for audio.
- **Users with cognitive disabilities** — including dyslexia, attention difficulties, memory impairments and learning disabilities — benefit from clear language, consistent navigation, predictable behaviour, error messages that explain how to fix problems, and no unnecessary time limits.
- **Users with vestibular disorders** can feel dizzy or ill from large animations and parallax effects ({{ch:css}}).

A useful habit: test your own feature without a mouse, with the screen zoomed to 200%, and with a screen reader — even briefly. It changes how you build.

## How it works inside: the accessibility tree

### Level 2 — From DOM to assistive technology

Assistive technology does not read your pixels or your CSS classes. Browsers build an **accessibility tree** from the DOM ({{ch:browser-and-dom}}) and expose it through operating-system accessibility APIs:

```text
   DOM                                      Accessibility tree
   <nav aria-label="Main">           ──▶    navigation "Main"
     <a href="/fruit">Fruit</a>      ──▶      link "Fruit"
   <h1>Mangoes</h1>                  ──▶    heading level 1 "Mangoes"
   <button>                          ──▶    button "Add Chaunsa to cart"
     <svg aria-hidden="true">…</svg>            (svg hidden)
     <span class="sr-only">Add Chaunsa to cart</span>
   </button>
   <input type="checkbox" checked    ──▶    checkbox "Express delivery", checked
          id="exp">
   <label for="exp">Express delivery</label>
   <div class="card"> … </div>       ──▶    (generic — usually ignored)
```

Each node in the accessibility tree has:

- a **role** — what kind of thing it is (link, button, heading, checkbox, navigation, dialog...);
- a **name** — what it is called ("Add Chaunsa to cart");
- **states and properties** — checked, expanded, disabled, required, invalid, the heading level, the current value;
- and its relationships (which label describes which field, which items belong to a list).

A screen reader announces these: "Express delivery, checkbox, checked". Voice control matches commands against names ("click Add Chaunsa to cart"). Everything depends on the tree being correct.

### Level 2 — Where roles and names come from

**Semantic HTML provides almost everything automatically**: a `<button>` has the role "button"; its text content becomes its name; `disabled` becomes a state. A `<div onclick>` has no role, no keyboard behaviour and often no name — it is invisible or meaningless to assistive technology.

The **accessible name** is computed from, roughly in order of priority:

1. `aria-labelledby` — the text of other elements, referenced by id;
2. `aria-label` — a string attribute;
3. the associated `<label>` for form fields (or `alt` for images, `<caption>` for tables, `<legend>` for fieldsets);
4. the element's **content** (for buttons, links, headings);
5. `title` — a last resort, poorly supported.

You can see the tree in the browser: Chrome and Firefox developer tools have an **Accessibility** panel showing each element's role, name and states, and Chrome can show the full accessibility tree. Checking it is the fastest way to find out what a screen reader will say.

## WCAG: the guidelines

### Level 2 — Four principles: POUR

WCAG organises its requirements under four principles. Content must be:

1. **Perceivable** — users must be able to perceive the information: text alternatives for images, captions for video, enough contrast, content that adapts to different presentations.
2. **Operable** — users must be able to operate the interface: keyboard access, enough time, nothing that causes seizures, ways to navigate and find content, input methods beyond the keyboard.
3. **Understandable** — information and operation must be understandable: readable text, predictable behaviour, help with avoiding and correcting mistakes.
4. **Robust** — content must work with current and future technologies, including assistive technology: valid, semantic code with correct names, roles and values.

### Level 2 — Levels and versions

Each requirement — a **success criterion** — has a level:

- **Level A** — the essential minimum; failing these blocks some users entirely.
- **Level AA** — the standard most laws and organisations require. **"WCAG 2.1 AA" or "WCAG 2.2 AA" is the usual target.**
- **Level AAA** — enhanced; not generally required for whole sites.

WCAG 2.2, published in 2023, is the current version (it builds on 2.0 and 2.1, so meeting 2.2 also meets the earlier versions). A future WCAG 3 is in development with a different structure.

### Level 3 — The success criteria developers meet most often

You do not need to memorise WCAG's numbering, but you should know these requirements well:

| Area | Requirement (paraphrased) | Level |
|---|---|---|
| Text alternatives | Non-text content (images, icons, charts) has a text alternative | A |
| Captions | Pre-recorded video with audio has captions | A |
| Info and relationships | Structure (headings, lists, tables, labels) is in the code, not only visual | A |
| Use of colour | Colour is not the only way information is conveyed | A |
| Contrast | Text contrast at least 4.5:1 (3:1 for large text) | AA |
| Non-text contrast | Controls' boundaries and icons have at least 3:1 contrast | AA |
| Resize and reflow | Usable at 200% text size; reflows at 320 CSS pixels wide without horizontal scrolling | AA |
| Keyboard | All functionality works with a keyboard, with no keyboard traps | A |
| Focus visible | Keyboard focus is clearly visible | AA |
| Focus not obscured | The focused element is not hidden behind sticky headers or banners (new in 2.2) | AA |
| Focus order | Focus moves in a meaningful order | A |
| Timing | Users can extend or turn off time limits | A |
| Seizures | Nothing flashes more than three times per second | A |
| Bypass blocks | A way to skip repeated content (skip link, landmarks) | A |
| Page titled | Each page has a descriptive title | A |
| Link purpose | Link text (with context) says where it goes | A |
| Headings and labels | Headings and labels describe their purpose | AA |
| Target size | Click/tap targets at least 24×24 CSS pixels, or enough spacing (new in 2.2) | AA |
| Dragging | Anything done by dragging can also be done with simple clicks (new in 2.2) | AA |
| Language | The page's language is set (`lang`) | A |
| Predictable | No unexpected context changes on focus or input | A |
| Error identification | Errors are identified and described in text | A |
| Labels or instructions | Inputs have labels or instructions | A |
| Error suggestion | Suggestions for fixing errors are offered | AA |
| Accessible authentication | Logging in does not require a cognitive test such as remembering or transcribing, unless alternatives exist; allow paste and password managers (new in 2.2) | AA |
| Name, role, value | Custom controls expose correct name, role and state | A |
| Status messages | Status updates are announced without moving focus | AA |

The rest of this chapter shows how to meet them.

## Semantic HTML first

The single most effective accessibility practice is **using the right HTML element**. Almost every rule in {{ch:html}} is an accessibility rule:

- Headings in a logical outline, one `<h1>`.
- Landmarks: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`; a skip link.
- `<button>` for actions and `<a href>` for navigation — never clickable `<div>`s.
- `<label>` for every form field; `<fieldset>` and `<legend>` for groups.
- `<ul>`/`<ol>` for lists; `<table>` with `<th scope>` for tabular data.
- `alt` text on images (empty `alt=""` for decorative ones).
- `lang` on the `<html>` element.
- Native widgets — `<select>`, `<input type="date">`, `<details>`, `<dialog>` — before custom ones.

Native elements bring the correct role, name, states and keyboard behaviour for free, and they keep working as browsers and assistive technologies evolve. Every custom replacement must rebuild all of that by hand — and usually misses something.

## ARIA: power and danger

### Level 3 — What ARIA does

ARIA attributes change the accessibility tree **without changing behaviour**. They can:

- give an element a **role**: `role="dialog"`, `role="tab"`, `role="alert"`;
- give it a **name** or **description**: `aria-label`, `aria-labelledby`, `aria-describedby`;
- describe its **state**: `aria-expanded`, `aria-selected`, `aria-checked`, `aria-pressed`, `aria-invalid`, `aria-current`, `aria-disabled`;
- describe **relationships**: `aria-controls`, `aria-owns`;
- create **live regions**: `aria-live`;
- **hide** decorative content: `aria-hidden="true"`.

### Level 3 — The first rule of ARIA

The W3C's guidance on using ARIA begins with what is known as the **first rule of ARIA use**: **if a native HTML element or attribute already has the semantics and behaviour you need, use it instead of adding ARIA.** A widely repeated observation among accessibility specialists is that "no ARIA is better than bad ARIA": incorrect ARIA actively misleads users.

```html
<!-- Bad: role without behaviour. Announced as a button, but Tab skips it and Enter does nothing -->
<div role="button" class="btn">Add to cart</div>

<!-- Good: native behaviour, role and name for free -->
<button type="button" class="btn">Add to cart</button>
```

ARIA **only changes what is announced**. `role="button"` does not make an element focusable or respond to the keyboard; you would have to add `tabindex="0"`, `keydown` handlers for Enter and Space, and disabled handling. A `<button>` already does all of it.

### Level 3 — Where ARIA is genuinely needed

ARIA is the right tool when HTML has no equivalent, or to add state and relationships:

```html
<!-- An icon-only button needs a name -->
<button type="button" aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
</button>

<!-- A disclosure button tells users whether its content is open -->
<button type="button" aria-expanded="false" aria-controls="delivery-info">Delivery information</button>
<div id="delivery-info" hidden>Same-day delivery in Lahore.</div>

<!-- The current page in navigation -->
<a href="/fruit" aria-current="page">Fruit</a>

<!-- Two navigation landmarks distinguished by name -->
<nav aria-label="Main">…</nav>
<nav aria-label="Footer">…</nav>
```

- The icon button has no text, so `aria-label` gives it a name; the decorative SVG is hidden with `aria-hidden="true"` so it is not announced as a meaningless graphic.
- `aria-expanded` announces "collapsed" or "expanded"; JavaScript must update it when the content opens ({{ch:browser-and-dom}}).
- `aria-current="page"` announces "current page".

Some important cautions:

- `aria-label` **replaces** the element's visible text as its name. If a button reads "Buy" visually but has `aria-label="Purchase item"`, voice-control users who say "click Buy" may fail. Keep the accessible name consistent with — ideally starting with — the visible label (WCAG calls this **label in name**).
- `aria-hidden="true"` hides an element **and all its children** from assistive technology. Never put it on something focusable — keyboard users would land on an element that does not exist for their screen reader.
- For complex custom widgets (tabs, menus, comboboxes, tree views), follow the **WAI-ARIA Authoring Practices Guide (APG)** from the W3C, which documents the expected roles, states and keyboard interaction for each pattern — or use a well-tested component library that implements them.

## Keyboard accessibility and focus

### Level 3 — Everything must work with a keyboard

Keyboard users move with **Tab** (forward) and **Shift+Tab** (backward), activate with **Enter** (links and buttons) and **Space** (buttons, checkboxes), use **arrow keys** inside composite widgets (radio groups, menus, tabs, selects), and close things with **Escape**.

Checks for every feature:

- Can I reach every interactive element with Tab?
- Can I see where focus is at all times? (Visible `:focus-visible` styles — {{ch:css}}.)
- Does focus move in a logical order, matching the visual order?
- Can I operate everything — including menus, sliders, carousels, drag-and-drop — without a mouse?
- Can I always get **out** of a component (no **keyboard trap**), except a modal dialog, which deliberately keeps focus inside until it is closed?

### Level 3 — `tabindex`

- `tabindex="0"` makes a non-interactive element focusable in the normal order. Needed only for custom widgets — usually a sign you should use a native element instead.
- `tabindex="-1"` makes an element focusable **by script** (`element.focus()`) but not by Tab — useful for moving focus to a heading or an error summary.
- **Never use positive values** (`tabindex="3"`): they create a separate tab order that jumps around unpredictably and is a maintenance nightmare.

### Level 4 — Managing focus in dynamic interfaces

When the interface changes without a page load, **you** must manage focus:

- **Opening a modal dialog**: move focus into it (to its first field or its heading), keep focus inside while open, close it with Escape, and **return focus** to the button that opened it when it closes. The native `<dialog>` element opened with `showModal()` handles most of this ({{ch:html}}).
- **Client-side navigation** in a single-page app: after a route change, move focus to the new page's main heading (or announce the new page title), otherwise screen-reader users may not know anything happened. Frameworks such as Next.js announce route changes; check that yours does ({{ch:nextjs}}).
- **Deleting an item**: when a row with focus is removed, move focus somewhere sensible (the next row, or the list heading) rather than letting it fall back to the top of the page.
- **Showing errors after submit**: move focus to the first invalid field or to an error summary ({{ch:forms}}).
- **Sticky headers and cookie banners**: make sure they do not cover the focused element (WCAG 2.2's "focus not obscured"); CSS `scroll-padding-top` on the page can keep focused elements clear of a sticky header.

Here is a small, focus-aware disclosure in React ({{ch:react-basics}}), showing several of these ideas together:

```tsx
// fragment
import { useId, useState } from "react";

export function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <h3>
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
          {title}
        </button>
      </h3>
      <div id={panelId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
```

- A real `<button>` inside a heading: keyboard-operable, announced as a button, and findable by heading navigation.
- `aria-expanded` reflects the state on every render; `aria-controls` links the button to the panel.
- `useId` generates a unique id, so several disclosures on a page never clash.
- `hidden` removes the closed panel from the accessibility tree and the tab order.

## Colour, contrast and visual design

### Level 3 — Contrast

Text must stand out from its background. WCAG's AA level requires a **contrast ratio** of at least **4.5:1** for normal text and **3:1** for large text (about 24 px, or 19 px bold) and for icons and control boundaries. The ratio is calculated from the **relative luminance** (perceived brightness) of the two colours:

```ts
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

for (const [fg, bg] of [["#777777", "#ffffff"], ["#595959", "#ffffff"], ["#0b6e4f", "#ffffff"], ["#ffffff", "#f59e0b"]] as const) {
  const ratio = contrastRatio(fg, bg);
  console.log(`${fg} on ${bg}: ${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? "passes AA" : "fails AA for normal text"}`);
}
```

**Output:**

```text
#777777 on #ffffff: 4.48:1 fails AA for normal text
#595959 on #ffffff: 7.00:1 passes AA
#0b6e4f on #ffffff: 6.25:1 passes AA
#ffffff on #f59e0b: 2.15:1 fails AA for normal text
```

Walk through it:

- `parseInt(..., 16)` reads the hex colour; bit shifts (`>>`) and masks (`& 0xff`) extract the red, green and blue bytes.
- `channel` converts each byte to a linear light value (screens store colours in a non-linear "gamma-encoded" form, so this undoes it).
- `luminance` weights the channels by how sensitive human eyes are to each — green most, blue least — which is why the green coefficient is so large.
- The ratio adds 0.05 to each luminance (accounting for ambient light) and divides lighter by darker; it ranges from 1:1 (identical) to 21:1 (black on white).
- The popular light grey `#777777` on white **just fails** (4.48:1). White text on an amber button fails badly (2.15:1) — a very common design mistake. The brand green passes.

Browser developer tools show the contrast ratio when you inspect text colours, and design tools have contrast checkers. Check real combinations, including text on images, placeholder text, disabled states (which are exempt but should remain readable), and dark mode.

### Level 3 — Never colour alone

Do not convey information **only** by colour:

- Errors: a red border **and** an icon **and** text explaining the problem ({{ch:forms}}).
- Links within text: underlined (or with another non-colour indicator), not just a different colour.
- Charts: different patterns or labels, not only different colours ({{ch:css}}).
- Status: "In stock" text, not just a green dot.

### Level 3 — Text and reflow

- Use relative units (`rem`) so text scales with user settings; never disable zoom (`user-scalable=no` or `maximum-scale=1` in the viewport tag harms low-vision users).
- Layouts must work at **200% zoom** and reflow to a single column at **320 CSS pixels** wide without horizontal scrolling (except for content such as maps, data tables and code) — responsive design from {{ch:css}} usually achieves this.
- Do not put text in images. Keep line length readable and line height generous.

### Level 3 — Target size

Small targets are hard to hit for people with tremors and for everyone on a phone. WCAG 2.2 AA requires targets of at least **24×24 CSS pixels**, or enough space around smaller targets; around 44×44 pixels is a common, more comfortable recommendation for important controls. Padding counts — a small icon inside a larger button is fine.

## Forms, errors and status messages

Forms were covered in depth in {{ch:forms}}; the accessibility essentials are:

- A visible `<label>` for every field; hints and errors linked with `aria-describedby`; `aria-invalid` on invalid fields.
- `autocomplete` attributes, so browsers and password managers fill in details (also required by WCAG's "identify input purpose").
- Errors identified in text, with suggestions for fixing them, near the field — plus focus moved to the first error or an error summary on submit.
- No time limits, or the ability to extend them.
- Logins that allow **pasting** and **password managers** (WCAG 2.2's accessible authentication) — never block paste in password or code fields.

**Status messages** — "Added to cart", "3 results found", "Saved" — appear without moving focus, so screen-reader users need them announced. Use a **live region**:

```html
<p role="status" class="sr-only" id="cart-status"></p>
```

When JavaScript sets its text to "Chaunsa mangoes added to cart. 3 items in cart.", screen readers announce it politely, after finishing what they are currently reading. `role="status"` implies `aria-live="polite"`; `role="alert"` (implying `aria-live="assertive"`) interrupts immediately and should be reserved for urgent messages such as errors. The live region element must **exist in the page before** its content changes — regions inserted together with their text are often not announced.

## Media, motion and time

- **Captions** for all pre-recorded video with speech; **transcripts** for audio such as podcasts. Auto-generated captions are a starting point, but should be corrected — they make mistakes, especially with names and accents.
- **Audio description** (narration of important visual information) for videos whose meaning depends on visuals.
- **No autoplaying audio**; any media that plays automatically for more than a few seconds needs a pause control.
- **Respect reduced motion**: `prefers-reduced-motion` ({{ch:css}}); avoid large parallax and zoom animations.
- **Nothing flashes** more than three times per second (it can trigger seizures).
- **Carousels and auto-advancing content** need pause controls, and should not move while a user is interacting with them — many accessibility specialists recommend avoiding auto-advancing carousels altogether.
- **Session timeouts**: warn before expiry and allow extending ({{ch:frontend-authentication}}).

## Testing accessibility

No single method finds everything. Professionals combine several.

### Level 3 — Automated tools

Automated checkers catch common, objective problems quickly: missing alt text, missing labels, low contrast, invalid ARIA, missing document language, duplicate ids.

- **axe** (the open-source axe-core engine) runs in browser extensions, in Lighthouse's accessibility audit, and in test frameworks.
- **WAVE** and Lighthouse give visual reports in the browser.
- In component and end-to-end tests, axe can fail the build when violations appear; Testing Library queries by role and label also act as basic accessibility checks ({{ch:react-advanced}}, {{ch:testing}}).

Automated tools are commonly estimated to catch only a **minority** of WCAG issues — they cannot judge whether alt text is meaningful, whether focus order makes sense, or whether a custom widget behaves correctly. A page can score 100 in Lighthouse and still be unusable.

### Level 3 — Manual checks

A quick manual routine for every feature:

1. **Keyboard only**: put the mouse away. Tab through everything; operate every control; check focus is visible, logical and never lost or trapped.
2. **Zoom to 200%** and narrow the window to phone width: does everything still work without horizontal scrolling?
3. **Screen reader**: turn on NVDA (free, Windows) or VoiceOver (built into macOS and iOS: Cmd+F5 on Mac), and try the main task — navigating by headings and landmarks, filling in a form, hearing errors and status messages.
4. **Inspect the accessibility tree** for custom components: correct role, name and state?
5. **Check contrast** of new colour combinations.
6. **Turn on reduced motion and high-contrast / forced-colours modes** and look for problems.

### Level 4 — Real users and audits

Nothing replaces observing **disabled people using your product**. Many organisations run usability sessions with users of assistive technology, or commission accessibility audits from specialists, who test against WCAG and produce a report. Products sold to governments and large organisations often need an **accessibility conformance report** (based on a template known as the VPAT) describing how they meet each criterion.

## Building accessibility into a team

Accessibility fails when it is a final check before launch; fixing an inaccessible design at the end is expensive. It succeeds when it is part of every stage:

- **Design**: designers check contrast, define focus styles, specify heading structure, alt text and error states, and design for zoom and keyboard use.
- **Components**: an accessible design system — button, input, dialog, menu, tabs built once, correctly, and reused everywhere ({{ch:tailwind}}). Many teams build on headless component libraries that implement ARIA patterns (for example Radix UI or React Aria), adding their own styling.
- **Definition of Done**: keyboard tested, screen-reader spot-checked, no automated violations ({{ch:agile-and-scrum}}).
- **Code review**: reviewers check semantics, labels, focus management and ARIA usage ({{ch:code-review-and-documentation}}).
- **CI**: automated axe checks on key pages and components ({{ch:cicd}}).
- **Content**: writers and editors provide alt text, captions, clear headings and plain language.
- **Feedback**: an accessibility statement with a way for users to report problems — and a process to fix them quickly.

## From beginner to enterprise

**Level 3 — every developer.** Semantic HTML; labels; alt text; visible focus; keyboard testing; contrast checks; `lang`; no clickable `div`s.

**Level 4 — application features.** Focus management for dialogs, routes and errors; live regions for status updates; accessible custom widgets following the ARIA Authoring Practices or a headless library; captions; reduced motion.

**Level 5 — professional practice.** Accessible design system; automated checks in CI; screen-reader testing in the Definition of Done; WCAG 2.2 AA as the documented target; accessibility in design and code reviews.

**Level 6 — large organisations.** Accessibility programmes with specialists and training; regular audits and conformance reports for procurement; legal compliance across jurisdictions (for example, the European Accessibility Act); usability research with disabled users; accessibility metrics tracked alongside quality and performance.

## Real-world use cases

### An inaccessible checkout

- **Problem:** a customer using a screen reader cannot complete checkout; the support team receives the complaint.
- **Findings:** quantity steppers are `div`s with icons and no names; the payment method choice is a set of styled `div`s with no radio semantics; errors appear only as red borders; the "Place order" confirmation appears in a modal that does not receive focus.
- **Fixes:** real `<button>`s with accessible names ("Decrease quantity of Chaunsa mangoes"); a `<fieldset>` of radio inputs styled as cards; text errors linked to fields; the native `<dialog>` with focus management.
- **Result:** the checkout works for keyboard and screen-reader users — and the fixes, especially clearer errors and larger targets, also reduce errors for everyone.

### A design system rollout

- **Problem:** fifteen teams each build their own dropdowns and modals, each with different accessibility bugs.
- **Approach:** a shared component library built on a headless, ARIA-compliant foundation, with documented keyboard behaviour, automated axe tests and screen-reader testing per component.
- **Result:** accessibility improves across all products at once, and new features start accessible.

## Common mistakes

### Beginner: clickable `div`s and `span`s

**Fix:** `<button>` and `<a href>`.

### Beginner: missing or useless alt text

**Fix:** meaningful alt text describing purpose; `alt=""` for decoration.

### Beginner: removing focus outlines

**Fix:** design visible `:focus-visible` styles.

### Beginner: placeholders as labels

**Fix:** visible `<label>` elements.

### Intermediate: ARIA instead of HTML

`role="button"` on a `div`, `role="link"` on a `span`. **Fix:** native elements; ARIA only for what HTML cannot express.

### Intermediate: colour as the only signal

**Fix:** text, icons or patterns as well as colour.

### Intermediate: dynamic changes without announcements or focus management

**Fix:** live regions for status; move focus for dialogs, route changes and errors.

### Production: relying only on automated scores

**Fix:** manual keyboard and screen-reader testing; audits; user testing.

### Enterprise: accessibility as a pre-launch checklist

**Fix:** build it into design, components, the Definition of Done and CI.

## Debugging and troubleshooting

- **"The screen reader says just 'button'"** — no accessible name: add visible text, or `aria-label` for icon-only buttons. Check the Accessibility panel's "Name" field.
- **"The screen reader reads things that are hidden"** — elements hidden only visually (opacity, off-screen without `aria-hidden`), or not removed with `hidden`/`display: none`.
- **"Tab skips my control"** — it is not a focusable element (use a native control), or something has `tabindex="-1"`, or it is inside an `aria-hidden` or `inert` container.
- **"Focus disappears"** — it moved to an element that was removed, or into hidden content; move it deliberately after changes.
- **"Status messages aren't announced"** — the live region was added at the same time as its text, or it is hidden with `display: none` (use a visually hidden class instead).
- **"Errors are announced too often or interrupt"** — `role="alert"` used for routine updates; use `role="status"`.
- **Test across combinations**: screen readers behave differently with different browsers (NVDA with Firefox or Chrome, VoiceOver with Safari). Test the common pairs for your users.

## Security and performance

Accessibility and security occasionally interact. CAPTCHAs that rely only on reading distorted text or identifying images exclude blind users — provide alternatives (or use less intrusive bot protection). Security timeouts must be extendable. Login flows must support password managers and pasting ({{ch:frontend-authentication}}). Performance helps accessibility too: assistive technology users on older devices are disproportionately affected by heavy JavaScript and very large DOMs ({{ch:frontend-performance}}).

## How a senior engineer thinks about this

- **Accessibility is quality.** An inaccessible feature is a broken feature for some users — and often a legal risk.
- **Semantic HTML is the foundation**; ARIA is a precise tool for the gaps, used sparingly and correctly.
- **Test the way users use it**: keyboard, zoom, screen reader — not only automated scores.
- **Fix it once, in the components.** An accessible design system scales good practice across every team.
- **Shift left.** Accessibility is considered in design and planning, where it costs least.
- **Listen to disabled users.** Their feedback finds what checklists miss.

## Exercises

### Exercise 1 — Fix the markup

**Objective:** practise semantic HTML and correct ARIA.
**Starting point:**

```html
<div class="header">
  <img src="logo.png">
  <div class="nav"><span onclick="go('/')">Home</span> <span onclick="go('/cart')">Cart</span></div>
</div>
<div class="title">Your cart</div>
<div class="item">
  Chaunsa mangoes
  <div class="icon-btn" onclick="remove('CH')"><img src="trash.svg"></div>
</div>
<div class="error" style="color:red">Invalid coupon</div>
<input placeholder="Coupon code">
```

**What to do:** rewrite it accessibly.

<details>
<summary>Show the solution</summary>

```html
<header>
  <a href="/"><img src="logo.png" alt="Corner Shop home" width="120" height="40"></a>
  <nav aria-label="Main">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/cart" aria-current="page">Cart</a></li>
    </ul>
  </nav>
</header>

<main>
  <h1>Your cart</h1>
  <ul>
    <li>
      Chaunsa mangoes
      <button type="button" aria-label="Remove Chaunsa mangoes from cart">
        <img src="trash.svg" alt="" width="20" height="20">
      </button>
    </li>
  </ul>

  <label for="coupon">Coupon code</label>
  <input id="coupon" name="coupon" aria-invalid="true" aria-describedby="coupon-error">
  <p id="coupon-error" class="error">⚠ This coupon code is not valid. Check the spelling or try another code.</p>
</main>
```

**Walkthrough:** landmarks (`header`, `nav`, `main`) and a real `h1`; real links for navigation; the logo link has alt text describing its destination; the remove control is a `<button>` with a name that says **which** item it removes, and its icon has empty alt (the name is on the button); the coupon field has a visible label, `aria-invalid`, and an error linked with `aria-describedby`; the error uses text and an icon, not only red colour, and suggests how to fix it.

</details>

### Exercise 2 — Check a palette

**Objective:** practise contrast calculation.
**What to do:** using the `contrastRatio` function from this chapter, check these combinations for a new brand, and suggest a fix for any that fail AA for normal text: dark text `#1f2937` on `#ffffff`; white on brand orange `#ea580c`; brand orange `#ea580c` on white; muted text `#9ca3af` on white.

<details>
<summary>Show the solution</summary>

```ts
function channel(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}
function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

const pairs: [string, string][] = [
  ["#1f2937", "#ffffff"],
  ["#ffffff", "#ea580c"],
  ["#ea580c", "#ffffff"],
  ["#9ca3af", "#ffffff"],
  ["#ffffff", "#c2410c"],
  ["#6b7280", "#ffffff"],
];
for (const [fg, bg] of pairs) console.log(fg, "on", bg, contrastRatio(fg, bg).toFixed(2));
```

**Output:**

```text
#1f2937 on #ffffff 14.68
#ffffff on #ea580c 3.56
#ea580c on #ffffff 3.56
#9ca3af on #ffffff 2.54
#ffffff on #c2410c 5.18
#6b7280 on #ffffff 4.83
```

**Analysis:** dark text on white passes easily. White on `#ea580c` (3.56) fails for normal text — it passes only the 3:1 requirement for large text and icons. A darker shade of the same orange, `#c2410c`, reaches 5.18 and passes. The light grey `#9ca3af` (2.54) fails badly for body text; the darker grey `#6b7280` (4.83) passes. The fix is usually a darker shade of the same hue, so the brand still looks the same.

</details>

### Exercise 3 — Debug the modal

**Objective:** practise focus management.
**The scenario:** a custom "Confirm order" modal is a `div` that appears on top of the page. Keyboard users report that after it opens, pressing Tab moves through the page **behind** it; screen-reader users hear nothing when it opens; pressing Escape does nothing; after closing, focus is at the top of the page. How would you fix it?

<details>
<summary>Show the solution</summary>

**Simplest robust fix: use the native `<dialog>` element**, opened with `showModal()`:

```html
<dialog id="confirm" aria-labelledby="confirm-title">
  <h2 id="confirm-title">Confirm your order</h2>
  <p>Total: Rs 5,200, cash on delivery.</p>
  <form method="dialog">
    <button value="cancel">Go back</button>
    <button value="confirm">Place order</button>
  </form>
</dialog>
```

```ts
// fragment
const dialog = document.querySelector<HTMLDialogElement>("#confirm")!;
const opener = document.querySelector<HTMLButtonElement>("#review-order")!;
opener.addEventListener("click", () => dialog.showModal());
dialog.addEventListener("close", () => {
  if (dialog.returnValue === "confirm") placeOrder();
  opener.focus(); // return focus to where the user was
});
```

**What this fixes:** `showModal()` makes the rest of the page **inert** (not focusable, not reachable by screen readers), moves focus into the dialog, and closes on **Escape**; the `dialog` role and `aria-labelledby` make screen readers announce "Confirm your order, dialog" when it opens; returning focus to the opener keeps keyboard users where they were. (Browsers return focus automatically in many cases, but setting it explicitly is safe.) If a custom modal must be kept, every one of those behaviours has to be implemented by hand — which is why native elements or a tested headless library are preferred.

</details>

### Exercise 4 — Production scenario: an accessibility plan

**Objective:** plan accessibility work for a real product.
**The scenario:** a company's shop has never been tested for accessibility. A large corporate customer requires WCAG 2.2 AA compliance within its next contract cycle. You are asked to lead the effort. Describe your plan.

<details>
<summary>Show the solution</summary>

1. **Baseline:** run automated scans (axe) across key templates; do a manual audit of the main journeys (browse, search, product, cart, checkout, account) with keyboard, zoom and screen readers; consider a specialist audit. Record issues against WCAG criteria, with severity (blocks a task / causes difficulty / minor).
2. **Fix blockers first:** anything that prevents completing a purchase with keyboard or screen reader — unlabelled controls, inaccessible custom widgets, focus traps, missing form errors.
3. **Fix at the component level:** rebuild buttons, inputs, dialogs, menus, tabs and carousels once in the design system (on a headless accessible library), then roll out; this fixes many issues across all pages.
4. **Content:** alt text for product images (workflow for editors), captions for videos, heading structure in templates, clear error messages.
5. **Visual:** palette contrast fixes (darker shades), focus styles, target sizes, reflow at 320 px, reduced motion.
6. **Prevent regressions:** axe checks in component tests and CI on key pages; keyboard and screen-reader checks in the Definition of Done; accessibility in code review checklists; training for designers, developers and content editors.
7. **Document:** an accessibility statement with a contact for reporting problems; a conformance report for the customer, honest about any remaining exceptions and their timeline.
8. **Validate with users:** sessions with assistive-technology users on the main journeys; act on findings.

</details>

## Summary

**Accessibility** means people with disabilities can perceive, understand, navigate and interact with your product. It affects a large share of the population, plus everyone with temporary or situational limitations, and it is increasingly required by law, usually by reference to **WCAG**, whose **AA** level is the common target. WCAG's principles are **Perceivable, Operable, Understandable and Robust**.

Assistive technologies read the **accessibility tree** — each element's role, accessible name and states — which browsers build from the DOM. **Semantic HTML** supplies almost all of it correctly; **ARIA** fills genuine gaps (names for icon buttons, `aria-expanded`, `aria-current`, live regions), following the first rule: prefer native elements, because ARIA changes what is announced, not how things behave. Make everything work with the **keyboard**, with visible, logical focus, no traps, and deliberate **focus management** for dialogs, route changes, deletions and errors. Meet **contrast** ratios (4.5:1 for text), never rely on **colour alone**, support zoom and reflow, provide adequate **target sizes**, label forms and announce **status messages** with live regions, caption media, respect reduced motion and avoid unnecessary time limits.

Test with **automated tools** (which catch only part of the problems), **manual** keyboard, zoom and screen-reader checks, and **real users**. Build accessibility into design, shared components, the Definition of Done, code review and CI, so every feature starts accessible.

## Key terms

- **Accessibility (a11y)** — Designing and building products so that people with disabilities can use them.
- **Assistive technology** — Software or hardware that helps people with disabilities use computers, such as screen readers or switch devices.
- **Screen reader** — Software that presents screen content as speech or braille and supports navigation by structure.
- **Screen magnifier** — Software that enlarges part of the screen for users with low vision.
- **WCAG** — The Web Content Accessibility Guidelines, the international standard for web accessibility.
- **Success criterion** — A specific, testable requirement in WCAG, assigned a level of A, AA or AAA.
- **Conformance level** — WCAG's levels A (minimum), AA (common legal target) and AAA (enhanced).
- **POUR** — WCAG's four principles: perceivable, operable, understandable and robust.
- **Accessibility tree** — The structure browsers expose to assistive technology, giving each element a role, name and states.
- **Role** — In the accessibility tree, what kind of element something is, such as a button or heading.
- **Accessible name** — The text assistive technology uses to identify an element.
- **ARIA** — Attributes that add or change roles, names, states and relationships in the accessibility tree.
- **First rule of ARIA** — The guidance to use a native HTML element or attribute instead of ARIA whenever one exists.
- **aria-label** — An attribute providing an accessible name as a string.
- **aria-hidden** — An attribute that hides an element and its children from assistive technology.
- **aria-expanded** — An attribute announcing whether a control's related content is currently shown.
- **Live region** — An area whose content changes are announced by screen readers, using `aria-live` or roles like `status` and `alert`.
- **Focus management** — Deliberately moving keyboard focus when the interface changes.
- **Keyboard trap** — A situation where keyboard focus cannot leave a component.
- **tabindex** — An attribute that controls whether and how an element is reachable by keyboard focus.
- **Contrast ratio** — A measure of the difference in luminance between two colours, from 1:1 to 21:1.
- **Relative luminance** — The perceived brightness of a colour, used to calculate contrast ratios.
- **Reflow** — The ability of content to adapt to a narrow width without horizontal scrolling.
- **Target size** — The size of the area that can be clicked or tapped to activate a control.
- **Captions** — Text versions of the speech and important sounds in a video, synchronised with it.
- **Audio description** — Narration describing important visual information in a video.
- **Inert** — The state of page content that cannot be focused or reached by assistive technology, such as content behind a modal dialog.
- **WAI-ARIA Authoring Practices Guide** — W3C guidance describing roles, states and keyboard behaviour for common custom widgets.
- **axe** — A widely used open-source engine for automated accessibility testing.
- **Accessibility conformance report** — A document describing how a product meets accessibility standards, often based on the VPAT template.

## What comes next

Part VI is complete: you can build fast, accessible, search-friendly, secure web interfaces with HTML, CSS, JavaScript, React and Next.js.

Part VII moves behind the interface, to the **back end** — the servers and APIs that every front end depends on. It begins with {{ch:nodejs}}: how JavaScript runs outside the browser, what Node.js provides for files, networking and processes, its event loop and streams, and why it became one of the most popular platforms for building servers.
