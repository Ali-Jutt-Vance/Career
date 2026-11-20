# The Browser and the DOM

> [!GOALS]
> - Explain what the browser gives JavaScript: the `window` object, the **DOM**, and many other Web APIs.
> - Find elements with `querySelector` and friends, and read and change their text, attributes, classes and styles.
> - Create, insert and remove elements efficiently, and explain why `textContent` is safe and `innerHTML` can be dangerous.
> - Respond to user actions with **events**: listeners, the event object, bubbling, `preventDefault` and **event delegation**.
> - Handle forms in JavaScript with the `submit` event and `FormData`, and send data with `fetch`.
> - Know when scripts run, how rendering interacts with JavaScript, and how to avoid layout thrashing.
> - Use browser storage, the URL and History APIs and observers appropriately — and securely.
> - Build a small interactive feature in plain JavaScript, and understand exactly what problem frameworks such as React solve.

## Why this matters

In Part II you learned JavaScript as a language: values, functions, objects, promises. You ran it in Node.js, in a terminal. But JavaScript was created for the **browser**, and most of the world's JavaScript still runs there — making buttons respond, forms validate, carts update and maps move.

In {{ch:html}} and {{ch:css}} you built pages with structure and appearance. They are still **static**: they look the same no matter what the user does. Real applications respond:

- Pressing "Add to cart" updates the cart count without reloading the page.
- Typing in a search box shows suggestions as you type.
- Choosing a delivery city updates the delivery fee and estimated time.
- Submitting a form shows errors next to the fields that need fixing.

All of this works through the **DOM** — the browser's live, programmable model of the page. Frameworks such as React ({{ch:react-basics}}) hide much of the DOM behind their own abstractions, and many developers learn them without ever understanding what is underneath. Then they hit a bug in event handling, a memory leak from a listener never removed, a performance problem from forced layouts, or a security hole from `innerHTML` — and cannot diagnose it. This chapter teaches the foundation. By the end, you will see exactly why frameworks exist, which makes learning them much easier.

## The simple idea

Imagine a puppet theatre. The audience sees the puppets on stage. Above the stage, hidden, is the puppeteer, holding strings attached to every puppet. Pull a string, and a puppet moves; the audience sees it instantly.

The **page** is the stage. The **DOM** is the set of strings — one attached to every element. **JavaScript** is the puppeteer: it can find any puppet by its strings, move it, change its costume, add new puppets or remove them. And the puppeteer can **listen**: when someone in the audience shouts (a click, a key press), the puppeteer hears it and reacts.

> [!ANALOGY]
> The DOM is like the strings of a puppet theatre: JavaScript holds a string to every element on the page, and whatever it pulls, the audience sees immediately.
>
> **Where the analogy breaks:** a puppeteer moves one puppet at a time, and each movement is cheap. In the browser, some changes force the browser to recalculate the layout of the **whole page**, and doing that repeatedly is slow. Also, a puppeteer cannot add a new puppet out of thin air — but JavaScript can create elements from nothing, and even replace the whole stage.

## The proper definition and key words

The **DOM** (Document Object Model) is a programming interface that represents an HTML document as a **tree of objects**, which scripts can read and modify. It is defined by a WHATWG standard and implemented by every browser. Changes to the DOM are reflected on screen.

The key words:

- **Node** — any object in the DOM tree: element nodes, text nodes, comment nodes, and the document itself.
- **Element** — a node that represents an HTML element, such as `<button>` or `<p>`.
- **`document`** — the object representing the whole page; the entry point to the DOM.
- **`window`** — the global object in a browser: it represents the browser window or tab and holds everything else — `document`, timers, `fetch`, `localStorage`, `location` and more.
- **Web APIs** — the many interfaces the browser provides to JavaScript beyond the language itself: the DOM, `fetch`, storage, timers, geolocation, the clipboard and many others. (Node.js provides a different set: files, processes, network servers — {{ch:nodejs}}.)
- **Event** — a signal that something happened: a click, a key press, a form submission, the page finishing loading.
- **Event listener** (or handler) — a function you register to run when a particular event happens on a particular element.

## How it works inside

> [!RECAP]
> In {{ch:html}} you saw the browser parse HTML into a tree of nodes. In {{ch:css}} you saw it compute styles, calculate layout and paint. In {{ch:the-event-loop}} you learned that JavaScript runs on a single thread, taking tasks from queues one at a time.

Here is how those pieces fit together in a running page:

```text
   ┌───────────────────────────── browser tab ─────────────────────────────┐
   │                                                                       │
   │   JavaScript engine (V8, SpiderMonkey...)       Rendering engine       │
   │   ┌───────────────────────┐                   ┌─────────────────────┐  │
   │   │ your code             │──reads/changes──▶ │ DOM tree            │  │
   │   │ (one thread)          │                   │ styles, layout,     │  │
   │   └──────────▲────────────┘                   │ paint → screen      │  │
   │              │                                └─────────────────────┘  │
   │       event loop: tasks from                                           │
   │       clicks, keys, timers, network ◀── user and network events        │
   └───────────────────────────────────────────────────────────────────────┘
```

Key facts that follow from this design:

- **JavaScript and rendering share one thread.** While your code runs, the browser cannot update the screen or respond to clicks. A slow loop in a click handler freezes the page ({{ch:the-event-loop}}).
- **The screen updates between tasks.** If your code changes the DOM ten times in one task, the user sees only the final result, after your code finishes. The browser then recalculates styles and layout, and paints.
- **Events arrive as tasks.** When the user clicks, the browser queues a task; when the current JavaScript finishes, the event loop runs your click listener.
- **The DOM is live.** The objects your code holds **are** the page. Change a property, and the next frame shows it.

> [!INSIDE]
> DOM objects are not ordinary JavaScript objects. They are **host objects** provided by the browser: a JavaScript wrapper around the rendering engine's own internal structures (often written in C++). That is why some DOM operations are surprisingly expensive — crossing from JavaScript into the engine has a cost — and why reading certain properties, such as an element's size, may force the engine to do work first.

## Finding elements

### Level 3 — `querySelector` and `querySelectorAll`

The most useful way to find elements uses the **CSS selectors** you learned in {{ch:css}}:

```html
<ul id="cart">
  <li class="item" data-sku="PEN">Pen <span class="price">150</span></li>
  <li class="item" data-sku="INK">Ink <span class="price">220</span></li>
</ul>
<p class="total">Total: <output id="total">370</output></p>
```

```ts
// fragment
const cart = document.querySelector("#cart");            // first match, or null
const items = document.querySelectorAll("#cart .item");  // all matches: a NodeList
const total = document.getElementById("total");          // by id, or null

console.log(items.length);                // 2
console.log(items[0]?.textContent);       // "Pen 150"
```

- `document.querySelector(selector)` returns the **first** matching element, or **`null`** if there is none.
- `document.querySelectorAll(selector)` returns a **NodeList** of every match. It looks like an array and supports `length`, indexing and `forEach`, but lacks most array methods; convert it with `Array.from(items)` or `[...items]` when you need `map` or `filter`.
- `getElementById` is an older, very fast way to find an element by `id`.
- You can call `querySelector` on **any element**, not just `document`, to search only inside it: `cart.querySelector(".price")`.

### Level 3 — Handling `null` properly

`querySelector` returns `null` when nothing matches — because of a typo, because the element is not on this page, or because the script ran before the element existed. Using the result without checking causes the most common DOM error:

```text
TypeError: Cannot read properties of null (reading 'addEventListener')
```

TypeScript ({{ch:typescript-basics}}) helps by typing the result as `Element | null`, forcing you to handle the missing case. For elements your page **must** have, a small helper that fails loudly with a clear message is better than optional chaining that hides the problem:

```ts
// fragment
function mustFind<T extends Element>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

const totalOutput = mustFind<HTMLOutputElement>("#total");
```

- The generic parameter `<T extends Element>` lets you say which element type you expect, so TypeScript knows that `totalOutput` has properties specific to `<output>` elements.
- `ParentNode` is the DOM interface shared by `document` and elements — anything you can search inside.

### Level 2 — Walking the tree

Every node knows its neighbours: `parentElement`, `children` (child elements), `firstElementChild`, `lastElementChild`, `nextElementSibling` and `previousElementSibling`. Two methods are particularly useful:

- `element.closest(selector)` — walks **up** from the element (including itself) and returns the first ancestor matching the selector. Invaluable in event handling, as you will see.
- `element.matches(selector)` — returns `true` if the element matches a selector.

> [!TIP]
> Older properties such as `childNodes` and `firstChild` include **text nodes** — even the whitespace between tags — which surprises beginners. The `...Element...` versions (`children`, `firstElementChild`) skip text nodes and are usually what you want.

## Reading and changing elements

### Level 3 — Text: `textContent` versus `innerHTML`

```ts
// fragment
const heading = mustFind<HTMLHeadingElement>("h1");
heading.textContent = "Your cart (2 items)";
```

`textContent` sets the element's text. Whatever string you assign is shown **as text**, exactly — even if it contains `<` and `>`. That makes it **safe** for any data, including what users typed.

`innerHTML` is different: the string is **parsed as HTML**:

```ts
// fragment
const reviewBox = mustFind<HTMLDivElement>("#review");
reviewBox.innerHTML = userReview; // DANGEROUS if userReview came from a user
```

If `userReview` contains `<img src=x onerror="stealCookies()">`, the browser creates that image, the load fails, and the attacker's code runs in your page — **cross-site scripting** ({{ch:html}}, {{ch:application-security}}). Note that `<script>` tags inserted with `innerHTML` do not run, but event-handler attributes like `onerror` do — so "we checked for `<script>`" is not protection.

The rule: **use `textContent` for data. Use `innerHTML` only with HTML you fully control** (never containing user data), or with HTML that has passed through a sanitiser. Building elements with `createElement` (below) is the safest general approach.

`innerText` also exists. It is similar to `textContent` but takes CSS into account (it ignores hidden elements and follows line breaks as displayed), which makes it **slower**, because reading it can force layout. Prefer `textContent` unless you specifically need the rendered text.

### Level 3 — Attributes and properties

HTML attributes become **properties** on DOM objects:

```ts
// fragment
const link = mustFind<HTMLAnchorElement>("a.help");
link.href = "/help/delivery";          // property
link.setAttribute("target", "_blank"); // attribute method
console.log(link.getAttribute("href")); // "/help/delivery" (as written)
console.log(link.href);                 // "https://cornershop.example/help/delivery" (resolved)

const qty = mustFind<HTMLInputElement>("#qty");
console.log(qty.value);                 // the CURRENT value the user typed
console.log(qty.getAttribute("value")); // the INITIAL value from the HTML
```

Attributes and properties usually correspond, with important differences:

- **Properties are typed and resolved.** `link.href` is a full absolute URL; `getAttribute("href")` returns exactly what is in the HTML.
- **`value` on inputs**: the `value` **attribute** is the starting value; the `value` **property** is what the field contains now. To read what the user typed, always use the property.
- **Boolean attributes** become boolean properties: `button.disabled = true` adds the `disabled` attribute; `false` removes it.

### Level 3 — Custom data with `data-*` attributes

To attach your own information to elements, use `data-*` attributes; they appear in the `dataset` property:

```html
<li class="item" data-sku="PEN" data-unit-price-paisa="15000">Pen</li>
```

```ts
// fragment
const item = mustFind<HTMLLIElement>(".item");
console.log(item.dataset.sku);                 // "PEN"
console.log(Number(item.dataset.unitPricePaisa)); // 15000
```

Names are converted from `kebab-case` in HTML to `camelCase` in `dataset`. Values are **always strings**, so convert numbers explicitly. Remember that anything in `data-*` attributes is visible and editable by the user: never trust a price read from the page when charging money — the server must look it up ({{ch:html}}).

### Level 3 — Classes and styles

```ts
// fragment
const banner = mustFind<HTMLElement>(".banner");
banner.classList.add("is-visible");
banner.classList.remove("is-hidden");
banner.classList.toggle("is-expanded");          // add if absent, remove if present
console.log(banner.classList.contains("is-visible")); // true

banner.style.setProperty("--progress", "40%");   // set a CSS custom property
banner.style.backgroundColor = "#fde68a";        // inline style (use sparingly)
```

The best practice is to **change classes, not styles**: let CSS define how each state looks (`.is-visible`, `.has-error`), and let JavaScript only switch states. This keeps appearance in stylesheets, where designers and the cascade can manage it ({{ch:css}}). Setting a CSS custom property from JavaScript is a neat middle ground for genuinely dynamic values such as a progress percentage.

## Creating, inserting and removing elements

### Level 3 — Building elements safely

```ts
// fragment
type CartItem = { sku: string; name: string; pricePaisa: number; qty: number };

function renderCartRow(item: CartItem): HTMLLIElement {
  const li = document.createElement("li");
  li.className = "item";
  li.dataset.sku = item.sku;

  const name = document.createElement("span");
  name.textContent = item.name;               // safe for any text

  const price = document.createElement("span");
  price.className = "price";
  price.textContent = `Rs ${(item.pricePaisa * item.qty) / 100}`;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "remove";
  remove.textContent = "Remove";
  remove.setAttribute("aria-label", `Remove ${item.name}`);

  li.append(name, " ", price, " ", remove);
  return li;
}
```

- `document.createElement("li")` creates a new element **not yet in the page**.
- Text is always set with `textContent`, so product names containing `<` or quotes can never inject HTML.
- `aria-label` gives the button a fuller accessible name ("Remove Pen") — otherwise a screen-reader user hears "Remove, button" several times with no idea which item each button affects ({{ch:accessibility}}).
- `append(...)` adds children at the end. It accepts several nodes and strings at once (strings become text nodes).

### Level 3 — Inserting and removing

```ts
// fragment
const list = mustFind<HTMLUListElement>("#cart");

list.append(renderCartRow({ sku: "PAD", name: "Notepad", pricePaisa: 25000, qty: 2 })); // at the end
list.prepend(someElement);         // at the start
existing.before(newElement);       // just before another element
existing.after(newElement);        // just after
existing.replaceWith(newElement);  // swap
existing.remove();                 // remove from the page
list.replaceChildren();            // remove all children
```

These modern methods replace older, clumsier ones (`appendChild`, `insertBefore`, `removeChild`), which you will still see in older code.

### Level 4 — Many elements at once: fragments and templates

Inserting elements one by one into the live page can cause extra work. To add many, build them in a **DocumentFragment** — a lightweight container that is not part of the page — and insert it once:

```ts
// fragment
function renderCart(items: CartItem[]): void {
  const fragment = document.createDocumentFragment();
  for (const item of items) fragment.append(renderCartRow(item));
  list.replaceChildren(fragment); // one change to the live DOM
}
```

When a fragment is inserted, its **children** move into the page and the fragment becomes empty.

For complex markup, an HTML **`<template>`** element holds inert HTML that is not rendered and whose scripts do not run; you clone it and fill it in:

```html
<template id="row-template">
  <li class="item"><span class="name"></span> <span class="price"></span></li>
</template>
```

```ts
// fragment
const template = mustFind<HTMLTemplateElement>("#row-template");
const row = template.content.cloneNode(true) as DocumentFragment;
row.querySelector(".name")!.textContent = "Pen";
list.append(row);
```

`cloneNode(true)` makes a deep copy of the template's content. Templates keep markup in HTML, where it is easy to read, while data is still inserted safely with `textContent`.

## Events

### Level 2 — Listening

Programs in the browser are **event-driven**: instead of running from top to bottom and finishing, they set up listeners and then **wait** for things to happen.

```ts
// fragment
const button = mustFind<HTMLButtonElement>("#add-to-cart");

button.addEventListener("click", (event) => {
  console.log("clicked", event.type, event.target);
});
```

- `addEventListener(type, listener)` registers a function to run each time the event happens on that element. You can register many listeners for the same event; they run in the order added.
- The listener receives an **event object** with details: `event.type` (`"click"`), `event.target` (the element where the event started), mouse position, which key was pressed, and more.
- A listener is called later, by the event loop, every time the event fires — not when you register it.

Some common events:

| Event | Fires when |
|---|---|
| `click` | An element is activated — by mouse, touch, **or** Enter/Space on a focused button |
| `input` | The value of an input, textarea or select changes, on every keystroke |
| `change` | A value is committed (for text inputs, when focus leaves; for checkboxes and selects, immediately) |
| `submit` | A form is submitted |
| `keydown`, `keyup` | A key is pressed or released |
| `focus`, `blur` | An element gains or loses focus (`focusin`/`focusout` are versions that bubble) |
| `pointerdown`, `pointerup`, `pointermove` | Mouse, pen or touch input, unified |
| `scroll`, `resize` | Scrolling or window size changes (fire very often) |
| `DOMContentLoaded` | The HTML is fully parsed and the DOM is built |
| `load` | Everything, including images and styles, has finished loading |

> [!TIP]
> Use `click` on buttons, not `mousedown` or `touchstart`. The `click` event also fires for keyboard activation, so one listener serves mouse, touch and keyboard users alike — another reason to use a real `<button>` ({{ch:html}}).

### Level 2 — The old way: `on...` properties and attributes

You will also see `button.onclick = function () {...}` and `<button onclick="...">` in older code. A property like `onclick` holds only **one** handler (assigning again replaces it), and inline attributes mix JavaScript into HTML and are blocked by strict Content Security Policies ({{ch:application-security}}). Prefer `addEventListener`.

### Level 3 — Removing listeners

A listener stays registered as long as its element exists. Listeners on long-lived objects — `window`, `document`, or elements that stay on the page — must be removed when no longer needed, or they keep running and keep memory alive (a **leak**, like the observer problem in {{ch:design-patterns}}).

```ts
// fragment
function onResize(): void {
  console.log(window.innerWidth);
}
window.addEventListener("resize", onResize);
// later:
window.removeEventListener("resize", onResize); // must be the SAME function

// Or remove many listeners at once with an AbortController:
const controller = new AbortController();
window.addEventListener("resize", onResize, { signal: controller.signal });
document.addEventListener("keydown", onKey, { signal: controller.signal });
controller.abort(); // removes both
```

`removeEventListener` needs the **same function object**: an anonymous arrow function written again is a different object and removes nothing. The `signal` option with an `AbortController` is the modern way to clean up groups of listeners together. Other useful options: `{ once: true }` removes the listener after its first call, and `{ passive: true }` promises the listener will not call `preventDefault`, letting the browser scroll smoothly without waiting for it.

### Level 3 — Default actions and `preventDefault`

Many events have a **default action** the browser performs after your listeners run: following a link, submitting a form, typing a character, opening a context menu. `event.preventDefault()` cancels it:

```ts
// fragment
const form = mustFind<HTMLFormElement>("#search-form");
form.addEventListener("submit", (event) => {
  event.preventDefault();           // stop the full page reload
  // ...handle the search with fetch instead
});
```

### Level 4 — Bubbling and capturing

When you click a `<span>` inside a `<button>` inside a `<li>` inside a `<ul>`, which element "was clicked"? All of them. The event travels through the tree in three phases:

```text
          capture phase (down)              bubble phase (up)
   window                                                   window
     │ ▼                                                     ▲ │
   document                                               document
     │ ▼                                                     ▲ │
    ul                                                      ul
     │ ▼                                                     ▲ │
    li                                                      li
     │ ▼                                                     ▲ │
   button  ────────────  target phase  ─────────────────  button
                       (the clicked element)
```

1. **Capture phase:** the event travels from `window` **down** to the target.
2. **Target phase:** it reaches the element that was actually clicked.
3. **Bubble phase:** it travels back **up** to `window`.

By default, listeners run during the **bubble** phase. So a click on the button runs the button's listeners, then the `li`'s, then the `ul`'s, then `document`'s. (To listen during capture, pass `{ capture: true }`.) Most events bubble; a few, such as `focus` and `blur`, do not.

Two properties on the event object matter here:

- `event.target` — the element where the event **started** (the innermost element clicked).
- `event.currentTarget` — the element whose listener is **currently running**.

`event.stopPropagation()` stops the event from travelling further. Use it rarely: other code higher up (analytics, menus that close when clicking outside) may legitimately depend on events bubbling.

### Level 4 — Event delegation

Bubbling makes a powerful pattern possible. Instead of attaching a listener to every "Remove" button in the cart — and remembering to attach listeners to new rows, and to remove them when rows disappear — attach **one** listener to the list, and work out which button was clicked:

```ts
// fragment
list.addEventListener("click", (event) => {
  const button = (event.target as Element).closest("button.remove");
  if (!button || !list.contains(button)) return;   // the click was not on a remove button

  const row = button.closest<HTMLLIElement>("li.item");
  const sku = row?.dataset.sku;
  if (sku) removeFromCart(sku);
});
```

- The click on a remove button bubbles up to the list, where one listener catches clicks for **every** row — including rows added later.
- `event.target` may be the button itself or something inside it (an icon, a `<span>`), so `closest("button.remove")` walks up to the button.
- `list.contains(button)` guards against matching a button **outside** the list (closest can walk past the list's boundary).
- The row's `data-sku` attribute tells us which item to remove.

This is called **event delegation**. It means fewer listeners, no setup for new elements, and no clean-up for removed ones. React uses a similar technique internally: it attaches listeners at the root of your application and dispatches events to your components.

## Forms in JavaScript

### Level 3 — Handling submission

Forms in {{ch:html}} submitted by reloading the page. Modern applications usually intercept submission, send data with `fetch` and update the page:

```ts
// fragment
const orderForm = mustFind<HTMLFormElement>("#order-form");
const status = mustFind<HTMLParagraphElement>("#form-status");

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!orderForm.reportValidity()) return;      // run the built-in HTML validation

  const data = new FormData(orderForm);
  const payload = {
    name: String(data.get("name") ?? ""),
    phone: String(data.get("phone") ?? ""),
    quantity: Number(data.get("quantity")),
  };

  const submit = orderForm.querySelector<HTMLButtonElement>("button[type=submit]")!;
  submit.disabled = true;
  status.textContent = "Placing your order…";

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Server responded ${response.status}`);
    const order: { id: string } = await response.json();
    status.textContent = `Order ${order.id} placed. Thank you!`;
    orderForm.reset();
  } catch (error) {
    status.textContent = "Sorry, we could not place your order. Please try again.";
    console.error(error);
  } finally {
    submit.disabled = false;
  }
});
```

Walk through it:

- **Listen for `submit` on the form**, not `click` on the button: `submit` also fires when the user presses Enter in a field, and the browser handles which button was used.
- `event.preventDefault()` stops the normal page reload.
- `form.reportValidity()` runs the HTML validation attributes (`required`, `pattern`, `min`...) and shows the browser's messages; it returns `false` if anything is invalid. (A form with an `submit` listener still benefits from all the HTML you wrote.)
- **`new FormData(form)`** collects every named field exactly as a normal submission would ({{ch:html}}). `data.get("name")` returns a string, a file, or `null`, so we convert explicitly.
- **Disabling the button** while the request is in flight prevents **double submission** — a customer impatiently clicking twice and placing two orders. (The server should also protect against duplicates — {{ch:rest-apis}}.)
- `fetch` sends the request ({{ch:asynchronous-javascript}}). Note that `fetch` only rejects on **network** failure; an HTTP error such as 400 or 500 still resolves, so you must check `response.ok` yourself.
- The `status` paragraph tells the user what is happening. For screen-reader users to hear these updates, the element should be a **live region** — `<p id="form-status" role="status">` — which assistive technology announces when its text changes ({{ch:accessibility}}).
- `finally` re-enables the button whether the request succeeded or failed.

### Level 3 — Reacting while the user types

```ts
// fragment
const qtyInput = mustFind<HTMLInputElement>("#qty");
const subtotal = mustFind<HTMLOutputElement>("#subtotal");
const unitPricePaisa = 45000;

qtyInput.addEventListener("input", () => {
  const qty = qtyInput.valueAsNumber;
  subtotal.textContent = Number.isFinite(qty) && qty > 0 ? `Rs ${(qty * unitPricePaisa) / 100}` : "—";
});
```

`input` fires on every change, so the subtotal updates as the customer types. `valueAsNumber` reads a number input's value as a number (or `NaN` if it is empty or invalid).

For expensive work triggered by typing — such as calling a search API — do not run it on **every** keystroke. **Debounce** it: wait until the user pauses for, say, 300 milliseconds.

```ts
function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}

const search = debounce((query: string) => console.log(`searching for "${query}"`), 300);

// Simulate fast typing, then a pause
search("m");
search("ma");
search("man");
setTimeout(() => search("mango"), 100);
```

**Output:**

```text
searching for "mango"
```

- Each call **cancels** the previous timer and starts a new one. Only when 300 milliseconds pass with no new call does `fn` run — once, with the latest arguments.
- `ReturnType<typeof setTimeout>` is the type of a timer handle, which differs between browsers (a number) and Node.js (an object); this expression works in both.
- Four calls produced one search: on a real site, that is one API request instead of four. Debouncing is a closure-based higher-order function ({{ch:scope-and-closures}}, {{ch:functional-programming}}).

## When scripts run

### Level 3 — Waiting for the DOM

A script can only find elements that **already exist** in the DOM. If a plain `<script>` in the `<head>` runs before the body is parsed, `querySelector` returns `null`.

The solutions, from {{ch:html}}:

- Load scripts with **`defer`** or as **`type="module"`**: they run after the DOM is fully built. This is the normal approach today.
- Or wait for the `DOMContentLoaded` event, which fires when the HTML is parsed (before images finish loading).
- The `load` event on `window` fires later, when everything — images, stylesheets, iframes — has loaded. Wait for it only if you genuinely need those resources.

## Rendering and performance

### Level 4 — Layout thrashing

Recall the pipeline from {{ch:css}}: style → layout → paint → composite. The browser is lazy: when you change the DOM or styles, it **marks** layout as out of date and recalculates it later, once, before the next frame.

But if you **read** a layout property — `offsetHeight`, `getBoundingClientRect()`, `scrollTop`, `clientWidth` — after a change, the browser must recalculate layout **immediately** to give you a correct answer. This is called a **forced synchronous layout**. Doing it in a loop — write, read, write, read — forces a full layout on every iteration:

```ts
// fragment
// Slow: alternating reads and writes forces layout on every iteration
for (const card of cards) {
  const width = card.offsetWidth;          // READ: forces layout
  card.style.height = `${width * 0.75}px`; // WRITE: invalidates layout
}

// Fast: read everything first, then write everything
const widths = cards.map((card) => card.offsetWidth);   // one layout
cards.forEach((card, i) => {
  card.style.height = `${widths[i]! * 0.75}px`;           // writes only
});
```

The first version is called **layout thrashing**. With hundreds of cards it can freeze the page for a noticeable time; the second performs one layout. (In this particular case, CSS could do it with no JavaScript at all: `aspect-ratio: 4 / 3` — always check whether CSS can solve a layout problem first.)

### Level 4 — `requestAnimationFrame`

For visual updates that should happen every frame — animations, following the pointer — use `requestAnimationFrame(callback)`. The browser calls your function just **before** it paints the next frame (typically 60 times a second), so your updates are synchronised with the screen and batched with the browser's own work. Timers such as `setInterval` are not synchronised with painting and can cause stuttering.

### Level 4 — Observers instead of polling

Browsers provide **observer** APIs that notify you efficiently, instead of you checking repeatedly in `scroll` or `resize` listeners:

- **`IntersectionObserver`** tells you when an element enters or leaves the viewport — for lazy-loading, "infinite scroll" lists, and analytics on what users actually saw.
- **`ResizeObserver`** tells you when an element's size changes.
- **`MutationObserver`** tells you when the DOM changes.

```ts
// fragment
const sentinel = mustFind<HTMLDivElement>("#load-more-sentinel");

const observer = new IntersectionObserver(
  async (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.unobserve(sentinel);
      await loadNextPageOfProducts();
      observer.observe(sentinel);
    }
  },
  { rootMargin: "400px" }, // start loading 400px before it scrolls into view
);
observer.observe(sentinel);
```

An invisible "sentinel" element sits at the bottom of the product list. When it comes within 400 pixels of the viewport, the next page of products loads — before the user reaches the end. The browser does the geometry calculations efficiently, off the main path of your code.

## Storage, URLs and history

### Level 3 — Web Storage

`localStorage` and `sessionStorage` store **strings** by key, in the user's browser, for one site (one **origin**: scheme, host and port):

```ts
// fragment
type Preferences = { theme: "light" | "dark"; city: string };

function savePreferences(prefs: Preferences): void {
  localStorage.setItem("prefs", JSON.stringify(prefs));
}

function loadPreferences(): Preferences | null {
  try {
    const raw = localStorage.getItem("prefs");
    return raw ? (JSON.parse(raw) as Preferences) : null;
  } catch {
    return null;   // corrupted data, or storage unavailable
  }
}
```

- `localStorage` persists until removed; `sessionStorage` lasts only for the current tab's session.
- Values are strings: store objects with `JSON.stringify` and read them with `JSON.parse` ({{ch:objects}}).
- Wrap access in `try/catch`: storage can be full, disabled in some private modes, or contain data written by an older version of your code.
- The API is **synchronous**, so keep stored data small; for larger data, browsers provide IndexedDB.

> [!WARNING]
> **Never store secrets or authentication tokens in `localStorage` lightly.** Any JavaScript running on your page — including injected script from an XSS bug, or a compromised third-party library — can read it. Many teams keep session credentials in `HttpOnly` cookies, which JavaScript cannot read at all. The trade-offs are covered in {{ch:sessions}}, {{ch:jwt}} and {{ch:frontend-authentication}}. `localStorage` is fine for preferences such as theme or last chosen city.

### Level 3 — The URL and history

The current address is available as `window.location`; the `URL` and `URLSearchParams` classes parse and build URLs safely:

```ts
const url = new URL("https://cornershop.example/search?q=mango&sort=price");
console.log(url.pathname, url.searchParams.get("q"), url.searchParams.get("sort"));

url.searchParams.set("page", "2");
url.searchParams.set("q", "mango & lychee");
console.log(url.toString());
```

**Output:**

```text
/search mango price
https://cornershop.example/search?q=mango+%26+lychee&sort=price&page=2
```

`URLSearchParams` handles encoding for you: the `&` inside the search text becomes `%26`, so it is not mistaken for a separator. Never build query strings by gluing strings together.

The **History API** lets single-page applications change the URL **without** reloading the page — so that filters, tabs and pages within an app get real, shareable, bookmarkable URLs and the Back button works:

```ts
// fragment
function applyFilters(category: string): void {
  const url = new URL(location.href);
  url.searchParams.set("category", category);
  history.pushState({ category }, "", url);   // new history entry, no reload
  renderProducts(category);
}

window.addEventListener("popstate", (event) => {
  // the user pressed Back or Forward
  renderProducts((event.state as { category?: string } | null)?.category ?? "all");
});
```

`pushState` adds an entry to the browser history; `replaceState` changes the current one without adding. When the user navigates back or forward, the `popstate` event fires and your code must render the matching state. Frameworks' **routers** ({{ch:nextjs}}) are built on exactly this.

## Putting it together: a small cart, and why frameworks exist

### Level 4 — A complete vanilla feature

Here is a small but complete shopping cart in plain TypeScript, combining what this chapter covered. The HTML:

```html
<ul id="cart" aria-live="polite"></ul>
<p>Total: <output id="total">Rs 0</output></p>
<button type="button" id="add-pen">Add pen (Rs 150)</button>
```

The script:

```ts
// fragment
type Line = { sku: string; name: string; pricePaisa: number; qty: number };

const state: { lines: Line[] } = { lines: [] };

const cartList = mustFind<HTMLUListElement>("#cart");
const totalOutput = mustFind<HTMLOutputElement>("#total");

function render(): void {
  const fragment = document.createDocumentFragment();
  for (const line of state.lines) {
    const li = document.createElement("li");
    li.dataset.sku = line.sku;
    const label = document.createElement("span");
    label.textContent = `${line.name} × ${line.qty}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${line.name}`);
    li.append(label, " ", remove);
    fragment.append(li);
  }
  cartList.replaceChildren(fragment);

  const totalPaisa = state.lines.reduce((sum, l) => sum + l.pricePaisa * l.qty, 0);
  totalOutput.textContent = `Rs ${totalPaisa / 100}`;
}

function add(sku: string, name: string, pricePaisa: number): void {
  const existing = state.lines.find((l) => l.sku === sku);
  if (existing) existing.qty++;
  else state.lines.push({ sku, name, pricePaisa, qty: 1 });
  render();
}

function removeLine(sku: string): void {
  state.lines = state.lines.filter((l) => l.sku !== sku);
  render();
}

mustFind<HTMLButtonElement>("#add-pen").addEventListener("click", () => add("PEN", "Pen", 15000));

cartList.addEventListener("click", (event) => {
  const button = (event.target as Element).closest("button.remove");
  const sku = button?.closest<HTMLLIElement>("li")?.dataset.sku;
  if (sku) removeLine(sku);
});

render();
```

Notice the **structure**, because it is the most important idea in this chapter:

- There is one **state** object — the data that describes what the cart contains.
- Every change goes through a function (`add`, `removeLine`) that **updates the state** and then calls `render()`.
- `render()` rebuilds the cart's DOM **entirely from the state**. It never asks the DOM what the cart contains; the state is the single source of truth.
- Events are handled with **delegation**, so re-rendered rows need no new listeners.

This "state → render" pattern is much more reliable than the alternative many beginners write — changing bits of the DOM directly in each handler ("find the count span and increase it", "find the row and delete it", "find the total and recalculate it from the prices in the page"). That approach scatters the truth across the DOM, and sooner or later the count, the rows and the total disagree.

### Level 5 — The problems that remain

Even this clean version has problems that grow with the size of an application:

- **Re-rendering everything is wasteful.** `replaceChildren` rebuilds every row on every change. With a few rows that is fine; with a thousand-row table it is slow, and it destroys things the user cares about — the focus position, text selection, scroll position inside a list, half-typed input in a field.
- **Updating only what changed is hard.** Writing code that compares old and new state and applies precisely the minimal DOM changes, correctly, for every kind of change, is difficult and error-prone.
- **Organising many pieces** — the cart, product lists, filters, user menu — each with its own state, rendering and events, needs a consistent structure, or the code becomes tangled.

This is exactly what **front-end frameworks** solve. In React ({{ch:react-basics}}), you write `render`-like functions (components) that describe the UI **from state**, as you did here. React then works out the **minimal** DOM changes needed when state changes, preserving focus and input, and gives you a consistent way to compose many components. If you understand this chapter's cart, you already understand the core idea of React.

## From beginner to enterprise

**Level 3 — small enhancements.** `querySelector`, `textContent`, `classList`, `addEventListener`, `FormData` and `fetch` — enough to add interactivity to a server-rendered page.

**Level 4 — interactive features.** State-driven rendering, event delegation, debouncing, `IntersectionObserver`, the History API for shareable URLs, accessible live regions for updates.

**Level 5 — professional practice.** Frameworks for complex interfaces; plain DOM code for small widgets and performance-critical parts; Content Security Policy; no `innerHTML` with untrusted data (enforced by lint rules); performance profiling with the browser's Performance panel.

**Level 6 — large applications.** **Web Components** (custom elements with encapsulated "shadow" DOM) for design systems shared across teams that use different frameworks; **web workers** to move heavy computation off the main thread so the interface stays responsive; careful measurement of real users' interaction responsiveness (the "Interaction to Next Paint" metric — {{ch:frontend-performance}}); strict policies such as Trusted Types, a browser feature that blocks unsafe DOM writes like assigning plain strings to `innerHTML`.

## Real-world use cases

### Progressive enhancement of a server-rendered page

- **Situation:** a product page is rendered as complete HTML by the server ({{ch:express}}), with a normal form for "Add to cart".
- **Enhancement:** a small script intercepts the form's `submit`, sends it with `fetch`, and updates the cart count without a reload. If JavaScript fails to load, the form still works the old way.
- **Why:** fast first display, good search-engine visibility, and robustness. This approach is called **progressive enhancement**.

### Search-as-you-type

- **Requirement:** suggestions appear while typing in the search box.
- **Approach:** an `input` listener, debounced to 300 milliseconds; `fetch` with an `AbortController` to cancel the previous request when a new one starts (so a slow, old response cannot overwrite newer results); results rendered with `textContent`; keyboard navigation of suggestions with arrow keys.
- **Failure scenario without cancellation:** the user types "man", then "mango"; the "man" request is slow and arrives last, so the list shows results for the wrong query. Cancelling old requests, or ignoring responses that do not match the latest query, prevents it.

### Infinite scrolling product feed

- **Approach:** `IntersectionObserver` on a sentinel element; load the next page; append with a fragment; update the URL with `replaceState` so a refresh returns to roughly the same place.
- **Trade-offs:** infinite scroll makes footers unreachable and can make it hard to return to a specific item; many shops prefer a "Load more" button for those reasons.

## Common mistakes

### Beginner: running code before the element exists

`querySelector` returns `null`, then "Cannot read properties of null". **Fix:** `defer` or `type="module"`; check for `null`.

### Beginner: using `innerHTML` with user data

**Consequence:** cross-site scripting. **Fix:** `textContent`, or create elements; sanitise when HTML is truly required.

### Beginner: forgetting `preventDefault` on form submit

The page reloads before your `fetch` finishes. **Fix:** call `event.preventDefault()` first in the submit listener.

### Intermediate: attaching listeners inside loops or render functions

Each render adds another listener to the same element, so one click runs the handler many times. **Fix:** attach listeners once, or use delegation; clean up with `removeEventListener` or an `AbortController`.

### Intermediate: storing truth in the DOM

Reading the cart total from the text of an element, or deciding state from CSS classes. **Fix:** keep state in JavaScript variables, render from state.

### Intermediate: not checking `response.ok`

`fetch` resolves for 404 and 500 responses; code then tries to parse an error page as JSON. **Fix:** check `response.ok` (or the status) before using the body.

### Production: layout thrashing and heavy scroll handlers

Scrolling stutters on mid-range phones. **Fix:** batch reads before writes; use observers; mark scroll and touch listeners `passive`; move heavy work out of event handlers.

### Production: tokens in `localStorage`

An XSS bug becomes an account takeover. **Fix:** `HttpOnly` cookies for session credentials where possible; strict Content Security Policy ({{ch:frontend-authentication}}).

## Debugging and troubleshooting

The browser's developer tools have everything you need:

- **Console** — errors with stack traces; `console.log`, `console.table` for arrays of objects, and `$0` (the element currently selected in the Elements panel).
- **Elements panel** — the live DOM. Elements flash when they change. Right-click an element and choose "Break on → subtree modifications" to pause JavaScript at the exact line that changes it — the fastest way to answer "what keeps changing this?".
- **Event Listeners tab** (in the Elements panel) — every listener registered on the selected element and its ancestors, with a link to the code.
- **Sources panel** — set **breakpoints** in your code, step through it line by line, and inspect variables. Use "Event Listener Breakpoints" to pause on any click or key press.
- **Network panel** — every `fetch` request, its headers, payload, response and timing. Essential for form and API problems.
- **Performance panel** — record an interaction and see where time is spent: long JavaScript tasks, layouts, paints. Forced layouts are flagged.
- **Application panel** — inspect and clear `localStorage`, cookies and other storage.

Common symptoms:

- **"Cannot read properties of null"** — the selector matched nothing: a typo, the element is on another page, or the script ran too early.
- **A handler runs twice per click** — it was registered twice.
- **A click does nothing** — the listener is on a different element; another element covers it (check with Inspect); or an earlier error stopped the script before the listener was attached — check the console.
- **The page freezes** — a long-running synchronous task in a handler; profile it and break it up or move it to a web worker.

## Security and performance summary

**Security.**

- Treat all data as untrusted when it reaches the DOM: `textContent` or element creation, never `innerHTML` with user data.
- Validate URLs before using them in `href` or `src` (reject `javascript:` URLs).
- Do not trust anything read from the page (`data-*`, hidden inputs, `localStorage`) for decisions the server must make.
- Use a **Content Security Policy** to block inline scripts and limit where scripts may load from; it turns many XSS bugs from disasters into blocked attempts ({{ch:application-security}}).
- Every third-party script you include (analytics, chat widgets, ads) runs with **full access** to your page's DOM — including payment forms. Include as few as possible, from trusted sources.

**Performance.**

- Keep handlers short; never block the main thread with long work.
- Batch DOM changes (fragments, `replaceChildren`) and separate layout reads from writes.
- Debounce or throttle frequent events; use observers instead of scroll polling; mark scroll listeners `passive`.
- Animate with CSS `transform` and `opacity`, or `requestAnimationFrame` ({{ch:css}}).
- Remove listeners and observers you no longer need.

## How a senior engineer thinks about this

- **State is the source of truth; the DOM is a projection of it.** They never read business data back out of the page.
- **Use the platform first.** Native elements, form validation, `FormData`, `URL`, `IntersectionObserver` and `<dialog>` solve many problems with less code and better accessibility than custom implementations.
- **Safe by default.** `textContent` and element creation everywhere; `innerHTML` only with reviewed, trusted markup.
- **Respect the main thread.** They profile before optimising, but they know the usual culprits: forced layouts, heavy handlers, too many listeners.
- **Frameworks are tools, not magic.** Understanding the DOM lets them debug framework problems, write small features without a framework, and choose wisely when one is needed.

## Exercises

### Exercise 1 — Character counter

**Objective:** practise selecting elements, the `input` event and classes.
**Starting point:**

```html
<label for="msg">Gift message</label>
<textarea id="msg" maxlength="120"></textarea>
<p id="msg-count" aria-live="polite">0 / 120</p>
```

**What to build:** update the counter as the user types. When 100 or more characters are used, add the class `is-near-limit` to the counter.

<details>
<summary>Show the solution</summary>

```ts
// fragment
const message = document.querySelector<HTMLTextAreaElement>("#msg");
const counter = document.querySelector<HTMLParagraphElement>("#msg-count");

if (message && counter) {
  const limit = message.maxLength; // reads the maxlength attribute as a number

  const update = (): void => {
    const used = message.value.length;
    counter.textContent = `${used} / ${limit}`;
    counter.classList.toggle("is-near-limit", used >= 100);
  };

  message.addEventListener("input", update);
  update(); // correct display if the browser restored a value
}
```

**Walkthrough:** `maxLength` is the property form of the `maxlength` attribute — no hard-coded 120 in the script, so changing the HTML keeps them in sync. `classList.toggle(name, force)` with a second argument adds the class when `force` is true and removes it when false — exactly right for a condition. Calling `update()` once at the start handles browsers that restore form contents when the user navigates back. `aria-live="polite"` makes screen readers announce the count without interrupting.

**Common wrong approach:** listening to `keyup` — it misses pasting with the mouse and changes from autofill. `input` catches every change.

</details>

### Exercise 2 — Delegated tabs

**Objective:** practise event delegation, `dataset` and accessible state.
**Starting point:**

```html
<div class="tabs" role="tablist" aria-label="Product information">
  <button type="button" role="tab" data-panel="desc" aria-selected="true">Description</button>
  <button type="button" role="tab" data-panel="ship" aria-selected="false">Delivery</button>
</div>
<section id="desc">Fresh Sindhri mangoes from Mirpur Khas.</section>
<section id="ship" hidden>Same-day delivery in Lahore.</section>
```

**What to build:** clicking a tab shows its panel, hides the others, and updates `aria-selected`. Use one listener on `.tabs`.

<details>
<summary>Show the solution</summary>

```ts
// fragment
const tabList = document.querySelector<HTMLDivElement>(".tabs");

tabList?.addEventListener("click", (event) => {
  const tab = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
  if (!tab || !tabList.contains(tab)) return;

  for (const other of tabList.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
    const selected = other === tab;
    other.setAttribute("aria-selected", String(selected));
    const panel = document.getElementById(other.dataset.panel ?? "");
    if (panel) panel.hidden = !selected;
  }
});
```

**Walkthrough:** one listener on the container handles clicks on any tab (delegation). `closest` finds the tab even if the click landed on something inside it. For every tab, we update `aria-selected` (so screen readers announce which is selected) and set the `hidden` **property** of its panel — the `hidden` attribute hides an element and removes it from the accessibility tree. A complete accessible tab component also supports arrow-key navigation between tabs and links each panel to its tab with `aria-labelledby`; these patterns are described in the WAI-ARIA Authoring Practices ({{ch:accessibility}}).

</details>

### Exercise 3 — Debug the double order

**Objective:** practise diagnosing event bugs.
**The scenario:** customers sometimes receive two identical orders. The checkout code:

```ts
// fragment
function setupCheckout(): void {
  const form = document.querySelector("#checkout")!;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await fetch("/api/orders", { method: "POST", body: new FormData(form as HTMLFormElement) });
    showConfirmation();
  });
}

// called whenever the user opens the checkout step
document.querySelector("#go-to-checkout")!.addEventListener("click", () => {
  showCheckoutStep();
  setupCheckout();
});
```

**What to do:** find the causes and fix them.

<details>
<summary>Show the solution</summary>

**Cause 1 — duplicate listeners:** `setupCheckout` runs every time the customer opens the checkout step. If they go back and open it again, a **second** submit listener is attached to the same form; one submission then sends two requests.

**Cause 2 — no protection against double clicks:** even with one listener, an impatient double-click or double Enter can submit twice before the first request finishes.

**Fixes:**

```ts
// fragment
const form = document.querySelector<HTMLFormElement>("#checkout")!;
let submitting = false;

// attach ONCE, at startup
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitting) return;
  submitting = true;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  button.disabled = true;
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      body: new FormData(form),
      headers: { "Idempotency-Key": crypto.randomUUID() },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    showConfirmation();
  } finally {
    submitting = false;
    button.disabled = false;
  }
});

document.querySelector("#go-to-checkout")!.addEventListener("click", showCheckoutStep);
```

- The listener is attached **once**; opening the step only shows it.
- A `submitting` flag and a disabled button prevent concurrent submissions.
- An **idempotency key** — a unique id per order attempt, sent in a header — lets the **server** recognise and ignore duplicates even if two requests do arrive (for example, after a network retry). The server-side half is explained in {{ch:rest-apis}}. (In a real app, generate the key once per checkout attempt and reuse it on retry, rather than per request.)
- The response is now checked with `response.ok`.

**Lesson:** client-side guards improve the experience, but only the server can truly guarantee "exactly one order".

</details>

### Exercise 4 — Production scenario: a fast product filter

**Objective:** combine state-driven rendering, the URL and performance.
**The scenario:** a category page shows 300 products already rendered by the server. Product managers want instant filtering by price range and "in stock only", with the filter reflected in the URL so customers can share links. Describe and sketch your implementation.

<details>
<summary>Show the solution</summary>

**Design:**

1. **Keep the server-rendered HTML** (fast first load, search visibility). Each product `<li>` has `data-price-paisa` and `data-in-stock` attributes for filtering — display only; the server remains the authority for prices.
2. **Read the products once** into an array of `{ element, pricePaisa, inStock }` at start-up (no DOM reads during filtering).
3. **State** = the current filters, initialised from the URL with `URLSearchParams`.
4. **Apply** filters by toggling each element's `hidden` property — no re-creating elements, so images are not reloaded.
5. **Update the URL** with `history.replaceState` (replace, not push, so every slider movement does not create a history entry) and handle `popstate`.
6. **Announce** the number of results in a live region ("42 products").

```ts
// fragment
type Filters = { minPaisa: number; maxPaisa: number; inStockOnly: boolean };

const products = [...document.querySelectorAll<HTMLLIElement>("#products > li")].map((element) => ({
  element,
  pricePaisa: Number(element.dataset.pricePaisa),
  inStock: element.dataset.inStock === "true",
}));

function readFilters(): Filters {
  const p = new URL(location.href).searchParams;
  return {
    minPaisa: Number(p.get("min") ?? 0),
    maxPaisa: Number(p.get("max") ?? Number.MAX_SAFE_INTEGER),
    inStockOnly: p.get("stock") === "1",
  };
}

function apply(filters: Filters): void {
  let shown = 0;
  for (const product of products) {
    const visible =
      product.pricePaisa >= filters.minPaisa &&
      product.pricePaisa <= filters.maxPaisa &&
      (!filters.inStockOnly || product.inStock);
    product.element.hidden = !visible;
    if (visible) shown++;
  }
  document.querySelector("#result-count")!.textContent = `${shown} products`;
}

function setFilters(filters: Filters): void {
  const url = new URL(location.href);
  url.searchParams.set("min", String(filters.minPaisa));
  url.searchParams.set("max", String(filters.maxPaisa));
  url.searchParams.set("stock", filters.inStockOnly ? "1" : "0");
  history.replaceState(null, "", url);
  apply(filters);
}

window.addEventListener("popstate", () => apply(readFilters()));
apply(readFilters());
```

**Why it is fast:** filtering 300 items in memory takes well under a millisecond, and toggling `hidden` changes only what is needed. If the catalogue grew to thousands of products, filtering would move to the server, with paginated API requests ({{ch:rest-apis}}). The filter controls' `input` events would call `setFilters` — debounced for sliders.

</details>

## Summary

The browser gives JavaScript the **`window`** object, the **DOM** and many other **Web APIs**. The DOM is a live tree of node objects; JavaScript and rendering share one thread, and the screen updates between tasks.

Find elements with `querySelector`, `querySelectorAll`, `closest` and `matches`, always handling `null`. Change text with **`textContent`** (safe) rather than **`innerHTML`** (parses HTML — dangerous with user data). Read current values from properties, use `dataset` for `data-*` attributes, and switch appearance by changing **classes**. Create elements with `createElement`, insert them with `append`, `before`, `replaceChildren`, and batch with fragments or `<template>`.

Respond to **events** with `addEventListener`; use the event object, cancel default actions with `preventDefault`, and remove listeners with `removeEventListener` or an `AbortController`. Events **bubble**, which enables **event delegation** — one listener for many elements, including future ones. Handle forms with the `submit` event, `reportValidity`, `FormData` and `fetch` (checking `response.ok`), prevent double submission, and debounce expensive work. Load scripts with `defer` or as modules.

For performance, separate layout reads from writes, use `requestAnimationFrame` and observers, and keep handlers short. Use `localStorage` for preferences, never for secrets, and `URL`, `URLSearchParams` and the History API for shareable app state. Structure interactive features as **state → render**: the problems of doing that efficiently at scale are exactly what frameworks such as React solve.

## Key terms

- **DOM (Document Object Model)** — The browser's live tree of objects representing a document, which scripts can read and change.
- **Node** — Any object in the DOM tree, such as an element, a text node or the document.
- **window** — The global object in a browser, representing the tab and providing access to the document and Web APIs.
- **document** — The object representing the loaded page and the entry point to the DOM.
- **Web API** — An interface provided by the browser to JavaScript, such as the DOM, fetch or storage.
- **Host object** — An object provided by the environment, such as a DOM element, rather than by the JavaScript language.
- **querySelector** — A method that returns the first element matching a CSS selector, or null.
- **NodeList** — An array-like collection of nodes returned by methods such as `querySelectorAll`.
- **textContent** — A property for reading or setting an element's text, treating any assigned string as plain text.
- **innerHTML** — A property that reads or sets an element's content as HTML, parsing any assigned string.
- **dataset** — The property giving access to an element's `data-*` attributes.
- **classList** — The property for adding, removing, toggling and checking an element's classes.
- **DocumentFragment** — A lightweight container for building DOM nodes before inserting them into the page in one operation.
- **Template element** — An HTML element holding inert markup that can be cloned and filled in by scripts.
- **Event** — A signal that something has happened, such as a click, key press or form submission.
- **Event listener** — A function registered to run when a particular event occurs on a particular target.
- **Event object** — The object passed to a listener, describing the event and its target.
- **Default action** — The browser's built-in response to an event, such as following a link or submitting a form.
- **preventDefault** — A method that cancels an event's default action.
- **Event bubbling** — The propagation of an event from its target up through its ancestors.
- **Capture phase** — The first phase of event propagation, from the window down to the target.
- **Event delegation** — Handling events for many child elements with one listener on a common ancestor.
- **AbortController** — An object whose signal can cancel fetch requests or remove groups of event listeners.
- **FormData** — An object that collects a form's named fields and their values.
- **Debounce** — Delaying a function until calls have stopped for a set time, so it runs once after a burst.
- **DOMContentLoaded** — The event fired when the HTML has been parsed and the DOM is complete.
- **Forced synchronous layout** — An immediate layout calculation triggered by reading layout properties after changing the DOM.
- **Layout thrashing** — Repeatedly alternating DOM writes and layout reads, forcing many expensive layouts.
- **requestAnimationFrame** — A browser function that runs a callback just before the next screen repaint.
- **IntersectionObserver** — A browser API that reports when elements enter or leave the viewport.
- **localStorage** — Browser storage that keeps string key–value pairs for a site until they are removed.
- **Origin** — The combination of scheme, host and port that defines the boundary of a website's storage and permissions.
- **History API** — The browser interface for changing the URL and history entries without reloading the page.
- **Live region** — An element whose changes are announced by screen readers, marked with `aria-live` or a role such as `status`.
- **Progressive enhancement** — Building a working basic page first and adding JavaScript improvements on top.

## What comes next

You have now built interactive behaviour with plain JavaScript and seen both the power of the DOM and the work needed to keep it in sync with state. Before turning to frameworks, the next chapter, {{ch:tailwind}}, returns to styling: Tailwind CSS, the utility-first approach that has become one of the most popular ways to style modern applications, and that pairs naturally with the component-based frameworks that follow it.
