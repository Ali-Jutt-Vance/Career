# How the Web Works: Browsers, Servers and HTTP

> [!GOALS]
> - What actually happens, step by step, between clicking a button on a website and seeing the result.
> - How to read every part of a web address (a URL).
> - What HTTP is, and how to read an HTTP request and an HTTP response line by line.
> - What the HTTP methods (GET, POST, PUT, PATCH, DELETE) and status codes (200, 404, 500 and others) mean, and when each is correct.
> - What headers are, and the ones you will see every day.
> - Why HTTP "forgets" every request, and how cookies let websites remember you.
> - What HTTPS adds, and why every site uses it.
> - What the browser does with the files it receives, and the difference between frontend and backend.
> - What an API and JSON are — the way modern apps and servers talk to each other.
> - How to watch real HTTP traffic yourself in the browser's developer tools and with `curl`.

## Why this matters

Almost everything you will build as a software engineer speaks HTTP.

A web page loading in a browser is HTTP. A mobile banking app fetching your balance is HTTP. A shop's server asking a payment company to charge a card is HTTP. When two parts of a large company's system talk to each other, very often that is HTTP too.

If you are a frontend developer, you send HTTP requests and handle their responses. If you are a backend developer, you receive HTTP requests and build the responses. Either way, HTTP is the language of your daily work. Developers who understand it properly can look at a failing request and know in seconds whether the problem is in the browser, the network, the server or the database. Developers who do not understand it guess.

In the previous chapter, {{ch:how-the-internet-works}}, you learned how data crosses the internet: IP addresses, packets, TCP and ports. This chapter builds the next layer on top: the **web**, and the protocol it speaks.

## The simple idea

The web works like a restaurant.

- You, the customer, are the **client** — in practice, your web browser.
- The kitchen is the **server**.
- You do not walk into the kitchen. You give an **order** to a waiter: "One chicken karahi, please." That is a **request**.
- The kitchen prepares it and sends back a plate — or a message saying "Sorry, we are out of chicken." That is a **response**.
- Every order uses the same format, so any waiter can take it to any kitchen. That shared format is **HTTP**.

Every interaction on the web is a pair: **one request, one response**. Your browser asks; a server answers. A whole web page is built from many of these pairs happening very quickly.

> [!ANALOGY]
> A request is like an order slip: it says *what you want* (the dish), *how* (no chilli, extra naan), and sometimes includes *something extra* (a voucher). The response is the plate plus a note: *how it went* ("here you are", or "sorry, not available"), and the food itself.
>
> **Where the analogy breaks:** a good waiter remembers you between courses. HTTP does not. Each request arrives at the server as if from a stranger, with no memory of the last one. Websites have to add memory deliberately, using cookies — you will see how later in this chapter.

## The proper definition and key words

**HTTP** (HyperText Transfer Protocol) is the application-layer protocol that clients and servers use to exchange requests and responses on the web. It runs on top of TCP (or, in its newest version, QUIC), which you met in the previous chapter.

- **The web (World Wide Web)** — a huge collection of documents and applications, linked together, that are transferred using HTTP.
- **Web browser** — a program (Chrome, Edge, Firefox, Safari) that sends HTTP requests, receives responses, and displays them as pages you can read and use.
- **Web server** — a program that listens for HTTP requests (usually on port 443 or 80) and sends back responses.
- **Resource** — anything a server can send: a web page, an image, a video, a list of products, a customer's order history.
- **URL** (Uniform Resource Locator) — the address of a resource, such as `https://shop.example.com/products?page=2`.
- **Hypertext** — text containing **links** to other documents. Clicking a link requests a new document. The "HT" in HTTP and HTML comes from this idea.

## Reading a URL

Before a browser can make a request, it needs to know exactly what to ask for and where. All of that is packed into the URL. Let us take one apart:

```text
  https://shop.example.com:443/products/shoes?colour=black&size=42#reviews
  \___/   \______________/ \_/\____________/ \___________________/ \_____/
    |            |          |        |                 |               |
  scheme       host       port     path            query string    fragment
```

- **Scheme** — `https`. Which protocol to use. `https` is HTTP with encryption; `http` is without. (Other schemes exist, such as `mailto:` for email links.)
- **Host** — `shop.example.com`. Which server to contact. This is a domain name, which DNS will translate into an IP address, as you learned in the previous chapter.
- **Port** — `443`. Which port on that server. It is usually left out, because browsers use the standard port automatically: 443 for `https`, 80 for `http`. You only see it written when it is non-standard, such as `localhost:3000` during development.
- **Path** — `/products/shoes`. Which resource on that server. It looks like a folder path, and sometimes it really is one, but usually it is just a name the server's code understands.
- **Query string** — `?colour=black&size=42`. Extra details for the request, written as `name=value` pairs, separated by `&`, starting after a `?`. Used for things like search terms, filters and page numbers.
- **Fragment** — `#reviews`. A position *within* the page, such as a section heading. The fragment is **never sent to the server**; the browser uses it on its own to scroll to the right place. (This book's reader uses fragments to move between chapters.)

The parts of a domain name are read from right to left, from general to specific:

```text
  shop . example . com
   |        |       |
   |        |     top-level domain (TLD): .com, .org, .pk, .io ...
   |      the registered domain, owned by a business
  a subdomain chosen by that business
```

A business that owns `example.com` can create as many subdomains as it likes: `shop.example.com`, `api.example.com`, `admin.example.com` — often each pointing to a different server.

### Special characters in URLs

URLs may only contain a limited set of characters. Spaces and many symbols must be **encoded**, which means replaced by a `%` sign followed by the character's number in hexadecimal. A space becomes `%20`:

```text
  search for:   running shoes
  in a URL:     /search?q=running%20shoes
```

Browsers and programming libraries do this encoding for you, but you will see it constantly in addresses and logs, so it helps to recognise it.

## The journey of a web request

Now the most important part of this chapter. Let us follow a single, real-feeling action all the way through.

You are on an online shop, logged in, looking at a pair of shoes. You click **Add to basket**. A moment later, the basket icon shows "1".

Here is everything that happens in that moment.

```text
  [1] You click "Add to basket"
          |
  [2] Browser builds an HTTP request
          |
  [3] Request travels across the network (DNS, TCP, encryption, routers)
          |
  [4] Server receives it
          |
  [5] Application code processes it (who is this? is the item in stock?)
          |
  [6] Database is queried and updated
          |
  [7] Server builds an HTTP response
          |
  [8] Browser receives it and updates the page
```

### Step 1 — The user acts

You click the button. The button is part of the web page, and the web page contains **JavaScript** code (you met JavaScript in {{ch:from-code-to-running-program}}). That code has been waiting for this click. When it happens, the code runs: it collects the product's ID (say `shoe-881`) and the quantity (1), and asks the browser to send a request to the server.

### Step 2 — The browser creates a request

The browser builds an HTTP request. Written out, it is plain text, like this:

```http
POST /api/basket/items HTTP/1.1
Host: shop.example.com
Content-Type: application/json
Cookie: session_id=8f3a91c2e7
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0
Accept: application/json

{"productId": "shoe-881", "quantity": 1}
```

We will study every line of this shortly. In short: it says *"I want to **add** something (POST) to the basket items (`/api/basket/items`) on `shop.example.com`; I am the person with session `8f3a91c2e7`; here is the product and quantity."*

### Step 3 — The request travels across the network

Everything from the previous chapter now happens:

- **DNS** translates `shop.example.com` into an IP address — usually instantly, because it was cached when the page first loaded.
- The browser already has a **TCP connection** open to that server from loading the page, so it **reuses** it instead of performing a new three-way handshake.
- The connection is **encrypted** (because the address is `https`), so the request is scrambled before it leaves your computer. Nobody between you and the server can read the cookie or the product details.
- The encrypted request is split into **packets**, passed through your router (with **NAT**) and hop by hop across the internet to the server's network.

### Step 4 — The server receives it

The packets arrive at the shop's data centre. In a real company, they usually reach a **load balancer** first — a server whose job is to share incoming requests among several identical application servers so that no single one is overwhelmed ({{ch:elb}}). The load balancer chooses one and passes the request on.

On that server, a **web server program** is listening on a port. TCP reassembles the packets, the encryption is removed, and the web server reads the HTTP request text.

### Step 5 — The application processes it

The web server hands the request to the shop's **application code** — the backend, written by developers like you will be, perhaps in Node.js. The code works through a series of decisions:

1. **Which code handles this?** The method and path, `POST /api/basket/items`, are matched to the function written for "add an item to the basket". Matching requests to code like this is called **routing** (a different meaning of the word from the network routing in the previous chapter).
2. **Who is asking?** The code reads the cookie `session_id=8f3a91c2e7` and looks up which customer that session belongs to. If the session is missing or invalid, it stops and replies "not logged in".
3. **Is the request valid?** Is there a `productId`? Is the quantity a positive whole number, not `-5` or `"lots"`? Bad input is rejected immediately. ({{ch:validation}} is about this.)

### Step 6 — The database is queried

The code needs data it does not hold in memory, so it talks to the **database** — usually a separate server, over the network:

- "Does product `shoe-881` exist, and is it in stock?"
- "Add one `shoe-881` to this customer's basket."

The database finds the information, updates the stored basket and confirms. This is where data becomes permanent: as you learned in {{ch:what-a-computer-is}}, anything only in the application's memory would be lost on a restart.

### Step 7 — The server creates a response

With the work done, the application builds an HTTP response:

```http
HTTP/1.1 201 Created
Content-Type: application/json
Cache-Control: no-store
Date: Thu, 19 Nov 2026 10:24:31 GMT

{"basketCount": 1, "item": {"productId": "shoe-881", "quantity": 1}}
```

It says: *"Success — something new was created (201). Here, in JSON format, is the new basket count and the item that was added. Do not cache this."* The response travels back along the same connection, encrypted, as packets, across the internet.

### Step 8 — The browser handles the response

Your browser reassembles and decrypts the response and gives it to the JavaScript code that sent the request. That code reads the status code — 201, success — and the body, finds `basketCount: 1`, and changes the number on the basket icon on the page.

If the status had been something else — say, `409 Conflict` with a message "Out of stock" — the same code would have shown that message instead.

All eight steps typically take between 100 and 500 milliseconds. You see only the basket number changing.

> [!SENIOR]
> When an experienced engineer hears "Add to basket is slow" or "Add to basket is broken", they mentally walk these same eight steps and ask where the problem is. Did the click handler run (step 1)? Was a request sent, and what did it contain (step 2)? Did it reach the server (steps 3–4)? What did the code decide (step 5)? Was the database slow (step 6)? What status code came back (step 7)? Did the page handle that response correctly (step 8)? Debugging the web is mostly a matter of finding *which step* went wrong — and the browser's developer tools, which you will use at the end of this chapter, show most of them directly.

## Anatomy of an HTTP request

Let us now read a request properly, line by line. Here is the one from step 2 again:

```http
POST /api/basket/items HTTP/1.1
Host: shop.example.com
Content-Type: application/json
Cookie: session_id=8f3a91c2e7
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0
Accept: application/json

{"productId": "shoe-881", "quantity": 1}
```

An HTTP request has three parts:

```text
  +--------------------------------------------------+
  | REQUEST LINE   method  path  version             |
  +--------------------------------------------------+
  | HEADERS        Name: value                       |
  |                Name: value                       |
  |                ...                               |
  +--------------------------------------------------+
  | (one empty line)                                 |
  +--------------------------------------------------+
  | BODY           optional data                     |
  +--------------------------------------------------+
```

**The request line** — `POST /api/basket/items HTTP/1.1`:

- `POST` is the **method**: the kind of action requested. Here, "create something new".
- `/api/basket/items` is the **path**: which resource the action is about. (The query string, if there were one, would come after the path.)
- `HTTP/1.1` is the **version** of HTTP being used.

**The headers** — each line is `Name: value`. Headers are extra information about the request:

- `Host: shop.example.com` — which website this request is for. One server computer often hosts many websites at the same IP address, so the request must say which one it wants. This header is required.
- `Content-Type: application/json` — the format of the body. Here: JSON (explained below).
- `Cookie: session_id=8f3a91c2e7` — a small piece of data the server gave this browser earlier, sent back so the server can recognise the visitor.
- `User-Agent: ...` — which browser and operating system is making the request. Servers sometimes use it for statistics or to work around old browsers.
- `Accept: application/json` — which format the client would like the response in.

**The empty line** marks the end of the headers. It is required; it is how the server knows where the headers stop.

**The body** — `{"productId": "shoe-881", "quantity": 1}` — the actual data being sent. Not every request has a body. A request that only *fetches* something usually has none.

## HTTP methods: what kind of action?

The **method** (sometimes called the "verb") tells the server what kind of action the client wants. These are the ones you will use constantly:

| Method | Meaning | Example | Has a body? |
|---|---|---|---|
| **GET** | Fetch a resource. Change nothing. | `GET /products/shoe-881` | No |
| **POST** | Create something new, or trigger an action. | `POST /orders` — place an order | Yes |
| **PUT** | Replace a resource completely with the data sent. | `PUT /users/42/address` — the full new address | Yes |
| **PATCH** | Change part of a resource. | `PATCH /users/42` — `{"phone": "0300..."}` only | Yes |
| **DELETE** | Remove a resource. | `DELETE /basket/items/shoe-881` | Usually no |

Two properties of methods matter a great deal in real systems, so it is worth learning their names now.

**Safe methods** do not change anything on the server. **GET** is safe. A browser, a search engine or a link-preview tool may send GET requests freely — before you even click, sometimes — and nothing should change as a result.

**Idempotent methods** may change something, but repeating the same request has the same effect as sending it once. **PUT** and **DELETE** are idempotent: setting your address to "House 12" twice leaves it as "House 12"; deleting an item twice leaves it deleted. **POST is not idempotent**: sending "place this order" twice may create two orders.

```text
  GET    /products/1         safe, idempotent    -> repeat freely
  PUT    /users/42/address   idempotent          -> repeating is harmless
  DELETE /basket/items/7     idempotent          -> repeating is harmless
  POST   /orders             neither             -> repeating may duplicate!
```

Why should you care? Because **networks fail halfway**, as you saw in the previous chapter. Imagine your phone sends "place order", the server places it, and then the connection drops before the response arrives. Your app does not know whether it worked. If the request was idempotent, it can simply send it again. If it was a POST, sending it again might charge the customer twice.

This is a real and serious problem in payment and ordering systems. You will learn the professional solution — **idempotency keys**, a unique ID the client attaches so the server can recognise a repeated request — in {{ch:rest-apis}}.

> [!WARNING]
> **Never use GET for something that changes data.** It is tempting to make a link like `/orders/55/cancel` that cancels an order when visited. But browsers pre-load links, chat apps visit links to show previews, and search engines follow links automatically. Developers have accidentally had orders cancelled and records deleted by programs that were simply *looking* at links. Changes belong in POST, PUT, PATCH or DELETE.

## Anatomy of an HTTP response

Now the other direction. Here is the response from step 7:

```http
HTTP/1.1 201 Created
Content-Type: application/json
Cache-Control: no-store
Date: Thu, 19 Nov 2026 10:24:31 GMT

{"basketCount": 1, "item": {"productId": "shoe-881", "quantity": 1}}
```

It has the same three-part shape as a request:

- **The status line** — `HTTP/1.1 201 Created`: the version, a three-digit **status code** (`201`), and a short human-readable **reason phrase** (`Created`).
- **Headers** — information about the response: its format (`Content-Type`), whether it may be cached (`Cache-Control`), when it was produced (`Date`).
- **The body** — the actual content: here, JSON data. For a web page, it would be HTML; for an image, the image's bytes.

### Status codes

The status code is the single most important thing in a response. It tells the client, in one number, how things went. The first digit gives the category:

| Range | Category | Meaning |
|---|---|---|
| **1xx** | Informational | "Received, still working" — rarely seen directly |
| **2xx** | Success | "It worked" |
| **3xx** | Redirection | "Look somewhere else" |
| **4xx** | Client error | "**You** (the client) made a mistake" |
| **5xx** | Server error | "**I** (the server) failed" |

The difference between 4xx and 5xx is crucial. A **4xx** means the request was wrong — retrying the same request will not help; it must be changed. A **5xx** means the server had a problem — the same request might succeed later. Monitoring systems and on-call engineers treat them very differently: a rise in 5xx errors usually means something is broken and someone should be woken up.

The codes you will meet most often:

| Code | Name | When it is used |
|---|---|---|
| **200** | OK | General success, with a body (e.g. the product you asked for). |
| **201** | Created | Something new was created (e.g. after a POST). |
| **204** | No Content | Success, with nothing to send back (e.g. after a DELETE). |
| **301** | Moved Permanently | The resource has a new permanent address; update your links. |
| **302** | Found (temporary redirect) | Go to another address for now — e.g. "go to the login page". |
| **304** | Not Modified | Your cached copy is still up to date; use it. |
| **400** | Bad Request | The request is malformed or invalid — e.g. quantity `-5`. |
| **401** | Unauthorized | You are not logged in, or your credentials are invalid. |
| **403** | Forbidden | You are logged in, but not allowed to do this. |
| **404** | Not Found | No such resource. |
| **409** | Conflict | The request conflicts with the current state — e.g. out of stock, or email already registered. |
| **422** | Unprocessable Content | The format is fine but the data fails the rules (used by many APIs for validation errors). |
| **429** | Too Many Requests | You are sending requests too fast; slow down. ({{ch:rate-limiting}}) |
| **500** | Internal Server Error | Something went wrong in the server's code — often a bug. |
| **502** | Bad Gateway | A server in the middle (like a load balancer) got a bad answer from the server behind it. |
| **503** | Service Unavailable | The server is overloaded or down for maintenance. |
| **504** | Gateway Timeout | A server in the middle waited too long for the server behind it. |

> [!TIP]
> **401 versus 403** confuses many developers, partly because "Unauthorized" is a misleading name. Think of it this way. **401** means "I don't know who you are" — log in. **403** means "I know who you are, and you are not allowed" — logging in again will not help. A customer trying to open the admin panel should get 403, not 401.

## Headers you will see every day

Headers carry information *about* the request or response. There are dozens, but a handful appear constantly:

| Header | Sent in | Purpose |
|---|---|---|
| `Host` | Request | Which website the request is for. |
| `Content-Type` | Both | The format of the body: `text/html`, `application/json`, `image/png`... |
| `Content-Length` | Both | The size of the body in bytes. |
| `Accept` | Request | Which formats the client would like back. |
| `Authorization` | Request | Credentials, such as a token proving who the client is. ({{ch:jwt}}) |
| `Cookie` | Request | Cookies the browser is sending back to the server. |
| `Set-Cookie` | Response | Asks the browser to store a cookie. |
| `Cache-Control` | Both | Rules about whether and how long a response may be cached. |
| `Location` | Response | Where to go, used with redirects (3xx) and sometimes with 201. |
| `User-Agent` | Request | The kind of client making the request. |

Header names are not case-sensitive: `content-type` and `Content-Type` mean the same thing. In newer versions of HTTP they are always sent in lowercase.

## HTTP is stateless — and how cookies fix it

Here is a design decision that shapes the whole web.

**HTTP is stateless.** Each request stands completely on its own. The server is not required to remember anything about previous requests. When your second request arrives, the server has no built-in way of knowing it came from the same person as the first.

Why design it this way? Because it makes servers **simple and scalable**. If the server does not have to remember each visitor between requests, then *any* server in a group can handle *any* request. You can add more servers when traffic grows, and if one server dies, the others carry on. You will see this principle again and again in system design.

But real websites obviously need to remember you: your login, your basket, your language preference. The solution is to make the *client* carry a reminder with every request. That reminder is a **cookie**.

A **cookie** is a small piece of text that a server asks the browser to store, and that the browser then automatically sends back with every later request to that same website.

```text
  1. You log in:
     Browser  --- POST /login  (email + password) --------------->  Server
     Browser  <-- 200 OK                                          ---  Server
                  Set-Cookie: session_id=8f3a91c2e7; HttpOnly; Secure

  2. Browser stores:  shop.example.com -> session_id=8f3a91c2e7

  3. Every later request to that site, automatically:
     Browser  --- GET /basket
                  Cookie: session_id=8f3a91c2e7 ----------------->  Server
                                          "Ah, session 8f3a... is Ali."
```

Step by step:

1. When you log in successfully, the server creates a **session** — a record on the server saying "session `8f3a91c2e7` belongs to customer Ali" — and sends back a `Set-Cookie` header containing the session's ID.
2. The browser stores that cookie, labelled with the website it came from.
3. From then on, every request your browser sends to that website automatically includes `Cookie: session_id=8f3a91c2e7`. The server looks up the session and knows who you are.

Each request is still independent — the server still remembers nothing about the *previous request* — but every request now carries its own identity. Statelessness is preserved; memory is achieved.

> [!ANALOGY]
> A cookie is like the numbered ticket you get at a coat check. The attendant does not remember your face. You simply show the ticket each time, and they look up which coat is yours.
>
> **Where the analogy breaks:** anyone holding your coat-check ticket can collect your coat — and anyone who steals your session cookie can act as you on the website. That is why cookies holding sessions must be protected, with settings such as `Secure` (only send over HTTPS) and `HttpOnly` (do not let JavaScript on the page read it). {{ch:sessions}} explains these protections and the attacks they prevent.

Cookies are also used for other things — remembering preferences, and, more controversially, tracking people across websites for advertising, which is why privacy laws and browsers have tightened the rules around them.

## HTTPS: HTTP with protection

Plain HTTP sends everything as readable text. Anyone able to see the traffic between you and the server — someone on the same café Wi-Fi, an internet provider, a compromised router — could read your passwords and cookies, and could even *change* the page on its way to you.

**HTTPS** is HTTP sent through an encrypted, verified connection. It uses a protocol called **TLS** (Transport Layer Security). HTTPS gives three guarantees:

1. **Confidentiality** — the traffic is encrypted, so people in between see only scrambled data.
2. **Integrity** — the data cannot be changed in transit without the change being detected.
3. **Authentication** — your browser can verify that it is really talking to `shop.example.com`, and not an impostor. The server proves its identity with a **certificate**: a digital document, vouched for by a trusted organisation called a **certificate authority**, stating that this server is the genuine owner of the domain.

The padlock icon next to the address in your browser means the connection is HTTPS and the certificate checked out.

Today, essentially every website uses HTTPS. Browsers mark plain-HTTP sites as "Not secure", many modern browser features only work over HTTPS, and free, automatically renewed certificates are available. In professional work, **HTTPS is not optional** for anything users touch. You will learn how TLS works internally, and how to set it up on a server, in {{ch:tls-ssl}}.

> [!NOTE]
> On your own computer during development, you will usually use plain `http://localhost`. That is fine, because the traffic never leaves your machine. Browsers treat `localhost` as a trusted exception for this reason.

## What the browser does with a response

When the response is a web page rather than JSON data, the browser has much more work to do. A web page is not one file. It is a main document that refers to many others.

The main document is written in **HTML** (HyperText Markup Language), which describes the *structure* and *content* of the page: headings, paragraphs, images, buttons, links. It refers to:

- **CSS** files (Cascading Style Sheets), which describe how things *look*: colours, fonts, layout, spacing.
- **JavaScript** files, which add *behaviour*: what happens when you click, type or scroll.
- **Images, fonts and videos.**

Here is what the browser does when you visit a page:

```text
  1. Request the HTML document           GET /products/shoes
  2. Start reading (parsing) the HTML
  3. Find references to other files:     <link href="style.css">
                                         <script src="app.js">
                                         <img src="shoe.jpg">
  4. Request each of them                GET /style.css
                                         GET /app.js
                                         GET /shoe.jpg   ... (often in parallel)
  5. Build the page structure in memory (the DOM)
  6. Apply the CSS to work out how everything looks
  7. Lay out and paint the page on the screen
  8. Run the JavaScript, which can change the page and send more requests
```

A typical modern web page triggers dozens of requests — sometimes over a hundred. Each one is a full HTTP request and response. This is why the latency lessons from the previous chapter matter so much for websites: if requests had to happen one after another, a page would take many seconds to load. Browsers send many requests **in parallel** over the same connections to keep things fast, and modern HTTP versions are designed to make this efficient.

In step 5, the browser builds the **DOM** (Document Object Model): a tree-shaped representation of the page held in memory, which JavaScript can read and change. When the JavaScript in our basket example changed the basket count, it was changing the DOM. {{ch:browser-and-dom}} teaches this in depth, and Part VI teaches HTML, CSS and modern frontend frameworks.

## Static and dynamic content

Not every response is created the same way.

**Static content** is the same for everyone and stored ready-made as files: images, CSS files, JavaScript files, a company's "About us" page. The server simply reads the file and sends it. Static content is fast and cheap to serve, and can easily be cached and copied to CDNs close to users.

**Dynamic content** is generated by code for each request: your basket, your order history, search results, a page in your language with your name on it. Generating it requires running application code and usually asking a database.

Most real websites mix both: static files for the look and behaviour of the page, and dynamic data for whatever is specific to the user and the moment.

## Frontend and backend

Now you can see clearly where the two halves of web development live.

```text
   FRONTEND (runs in the user's browser)       BACKEND (runs on servers)
  +-----------------------------------+      +-----------------------------------+
  |  HTML   - structure               |      |  Application code                 |
  |  CSS    - appearance              | HTTP |   - routing                       |
  |  JavaScript - behaviour           |<---->|   - checking who you are          |
  |                                   |      |   - validating input              |
  |  Shows things, reacts to the user,|      |   - business rules                |
  |  sends requests, shows responses  |      |  Database                         |
  +-----------------------------------+      +-----------------------------------+
```

- The **frontend** is everything that runs in the user's browser (or app): what the user sees and touches. It is built with HTML, CSS and JavaScript, often using a framework such as React. Part VI teaches it.
- The **backend** is everything that runs on servers: receiving requests, applying the business's rules, talking to databases, sending emails, taking payments. Part VII teaches it, using Node.js.
- **HTTP is the boundary between them.** They are often built by different people, sometimes in different languages, and they only meet through HTTP requests and responses.

One rule follows from this picture, and it is one of the most important rules in web security:

> [!WARNING]
> **Never trust the frontend.** Everything in the user's browser is under the user's control. They can open the developer tools, change the JavaScript, edit a price from 5,000 to 5, or send any HTTP request they like with tools such as `curl`. So every important rule — prices, stock, permissions, "is this user allowed to see this order?" — **must be checked on the backend**. Checks in the frontend are there to make the experience pleasant (showing an error before submitting a form), never to keep anything safe. Many real security incidents come from backends that trusted a price, a user ID or a role sent by the frontend.

## APIs and JSON

In the basket example, the server did not send back a web page. It sent a small piece of data:

```json
{"basketCount": 1, "item": {"productId": "shoe-881", "quantity": 1}}
```

This is how most modern applications work. The server offers an **API** — an **Application Programming Interface** — a defined set of requests that other programs can make, and the responses they will get. The frontend's JavaScript, a mobile app, or another company's server can all use the same API.

The data in these requests and responses is usually written in **JSON** (JavaScript Object Notation): a simple text format for structured data.

```json
{
  "orderId": 5521,
  "status": "shipped",
  "total": 7499,
  "items": [
    { "productId": "shoe-881", "quantity": 1 },
    { "productId": "sock-012", "quantity": 3 }
  ],
  "giftWrapped": false
}
```

How to read it:

- Curly braces `{ }` surround a group of **named values**. Each one is written `"name": value`, and they are separated by commas.
- Names are always in double quotes.
- Values can be **text** in double quotes (`"shipped"`), **numbers** (`7499` — note this total is in the smallest currency unit, as you learned to do in {{ch:what-a-computer-is}}), **true or false** (`false`), `null` (meaning "no value"), another group in curly braces, or a **list** in square brackets `[ ]`.
- Here, `items` is a list of two groups, each describing one product in the order.

JSON became the standard because it is easy for humans to read, easy for every programming language to produce and understand, and compact. You will work with JSON every single day as a developer. Its rules closely match JavaScript's own way of writing data, which you will learn properly in {{ch:objects}}.

Web pages, mobile apps and other servers that use an API are all **clients** of it. One backend can serve many kinds of clients through the same API:

```text
   Web browser  --\
   Android app  ----> HTTP + JSON ---->  Backend API  ---->  Database
   iPhone app   --/
   Partner's server -/
```

This is why backend developers focus so heavily on designing good APIs: a well-designed API serves every client, now and in the future. {{ch:rest-apis}} teaches API design.

## HTTP versions

HTTP has evolved over time, mainly to make the web faster. You will see version numbers in tools and settings:

- **HTTP/1.1** (1997) — the classic, text-based version shown in this chapter's examples. One request at a time per connection, so browsers opened several connections to load pages faster.
- **HTTP/2** (2015) — sends many requests and responses **at the same time over one connection**, in a compact binary format, and compresses headers. Pages with many files load noticeably faster.
- **HTTP/3** (2022) — runs over **QUIC** on top of UDP (from the previous chapter) instead of TCP, so that one lost packet does not hold up every other response on the same connection. It also sets up connections faster.

The good news: the *meaning* of HTTP — methods, paths, status codes, headers and bodies — is the same in every version. Browsers and servers negotiate the version automatically. Everything you learn in this chapter applies to all of them. The examples in this book use the readable HTTP/1.1 form because it shows the structure clearly.

## Watching HTTP for yourself

You can see real HTTP traffic right now, with tools you already have.

### The Network tab in developer tools

1. Open Chrome or Edge and visit any website, for example `https://example.com`.
2. Press <kbd>F12</kbd> to open the developer tools, and click the **Network** tab.
3. Reload the page (<kbd>F5</kbd>). Every request the page makes appears in a list.
4. Click on the first request (the page itself). You will see tabs such as **Headers**, **Response** and **Timing**.

In **Headers** you can see the request line's parts (method and URL), the **status code**, the **request headers** your browser sent and the **response headers** the server returned. In **Response** you can see the body. In **Timing** you can see how long each stage took: DNS lookup, connecting, waiting for the server, downloading.

> [!TRY]
> Open the Network tab on a large website you use — a news site or an online shop — and reload. Look at:
>
> 1. How many requests appear in total (shown at the bottom of the panel).
> 2. The **Status** column: are they mostly 200? Do you see any 304s (cached copies still valid) or 3xx redirects?
> 3. The **Type** column: how many are documents, scripts, stylesheets, images, or `fetch`/`xhr` (data requests from JavaScript, usually JSON)?
>
> You are now looking at exactly what this chapter describes, on a real production website.

### `curl` — making requests from the terminal

**curl** is a command-line tool for sending HTTP requests. It is installed on Windows 10 and later, macOS and almost every Linux system. Developers use it constantly to test APIs without a browser.

> [!NOTE]
> In Windows PowerShell 5.1, typing `curl` runs a different PowerShell command with a similar name. Type **`curl.exe`** instead to use the real curl. In PowerShell 7, Git Bash, macOS and Linux, plain `curl` works.

```text
> curl.exe -i https://example.com
```

**Output (shortened):**

```text
HTTP/1.1 200 OK
Content-Type: text/html; charset=UTF-8
Content-Length: 1256
Cache-Control: max-age=604800

<!doctype html>
<html>
<head>
    <title>Example Domain</title>
...
```

Walkthrough:

- `curl.exe` (or `curl`) runs the tool.
- `-i` is an option meaning "include the response headers in the output". Without it, curl shows only the body.
- `https://example.com` is the URL to request. curl sends a GET request by default.
- The output begins with the **status line**, `HTTP/1.1 200 OK`: success.
- Then the **response headers**. `Content-Type: text/html; charset=UTF-8` says the body is an HTML page encoded in UTF-8 — the encoding you learned about in {{ch:what-a-computer-is}}. `Cache-Control: max-age=604800` says the response may be cached for 604,800 seconds (one week).
- After the empty line comes the **body**: the HTML of the page.

You can also send other methods and data. This sends a POST request with a JSON body to a free public testing service that simply echoes back what it receives:

```text
> curl -X POST https://httpbin.org/post -H "Content-Type: application/json" -d "{\"product\":\"shoe-881\"}"
```

- `-X POST` sets the method to POST.
- `-H "..."` adds a request header.
- `-d "..."` sets the request body. The backslashes before the inner quote marks are needed so the shell does not treat them as the end of the text.

You will use curl regularly once you start building backends in Part VII, to test your own API without needing a frontend.

## From beginner to enterprise: HTTP at every level

**Level 3 — A single page.** A simple website is a few static HTML, CSS and image files served by a web server. Every visitor gets the same files. One server handles everything.

**Level 4 — A real web application.** An online shop has a frontend (HTML, CSS, JavaScript) and a backend API. The frontend sends HTTP requests with JSON to the API; the API checks who the user is from a cookie or token, applies business rules, talks to a database and returns JSON. Static files are served separately and cached.

**Level 5 — Professional engineering.** The team designs the API carefully: consistent paths, correct methods and status codes, clear error messages, versioning so old mobile apps keep working ({{ch:api-versioning}}), documentation ({{ch:api-documentation}}), and rate limits to protect it. All traffic is HTTPS. Caching headers are set deliberately, so that static files are cached for a long time and personal data never is.

**Level 6 — Enterprise scale.** Requests from millions of users pass through layers of infrastructure before reaching application code: DNS that sends users to the nearest region, CDNs that answer requests for static content without touching the origin servers at all, load balancers spreading traffic across many servers, and **API gateways** that handle security, rate limiting and routing for hundreds of internal services ({{ch:api-gateway}}). Inside the company, those services often talk to each other with HTTP too. Every request carries a unique **request ID** in a header, so that when something fails, engineers can trace its path through every system it touched ({{ch:observability-and-incidents}}).

## Real-world use cases

### Beginner level — A personal portfolio site

**Situation:** a new developer wants a website showing their CV and projects.

**Solution:** a few static HTML and CSS files. Every visitor receives the same files with `200 OK`. No backend or database is needed.

**Reasoning:** static content is the simplest, cheapest and fastest kind to serve. Many free hosting services serve static sites over HTTPS automatically. Adding a backend here would add cost and complexity for no benefit.

### Intermediate level — A clinic's appointment booking

**Business problem:** a medical clinic wants patients to book appointments online.

**Solution:** a frontend page shows available slots by sending `GET /api/slots?date=2026-12-01`. Booking sends `POST /api/appointments` with JSON describing the slot and the patient. The backend checks the patient's session cookie, checks that the slot is still free, saves the appointment and replies `201 Created`. If someone else booked the slot a moment earlier, it replies `409 Conflict`, and the frontend shows "Sorry, this slot was just taken".

**Reasoning:** correct methods and status codes make the behaviour predictable for every client. Checking availability on the backend — not trusting the frontend's list — prevents double bookings.

**Failure scenario:** two patients press "Book" at the same instant for the last slot. If the backend checks "is it free?" and then saves in two separate steps, both may pass the check. This is a **race condition** (you met the term in {{ch:what-a-computer-is}}), and preventing it is the job of database transactions ({{ch:transactions}}).

### Advanced level — A mobile app on unreliable connections

**Business problem:** a ride-hailing company's drivers often have weak mobile signal. Sometimes "accept this ride" requests time out, the app retries, and the ride is accepted twice or fails confusingly.

**Technical problem:** the request is a POST, which is not idempotent. When a response is lost, the app cannot know whether the server acted.

**Solution:** the app generates a unique ID for each "accept" action and sends it in a header (an **idempotency key**). If the server receives the same key again, it does not act a second time; it returns the original result.

**Trade-offs:** the server must store recent keys and check them on every request — a little extra storage and complexity. In exchange, retries become safe, which matters enormously on unreliable networks.

### Enterprise level — Serving a global e-commerce site

**Business problem:** a large online retailer serves customers on several continents, with traffic spiking hugely during sales.

**Solution (illustrative):** static files — images, scripts, stylesheets — are given long `Cache-Control` lifetimes and served from a CDN in dozens of cities, so most requests never reach the company's own servers. Product pages are cached briefly at the edge. Personal data (baskets, accounts) is never cached and always goes to the backend, through load balancers, to many identical stateless application servers that can be added within minutes as traffic rises.

**Reasoning:** because HTTP is stateless and caching is built into the protocol, the company can scale by adding servers and caches rather than by building one enormous server.

**Failure scenario:** a mistaken caching header on a personal page — for example, `Cache-Control: public` on the account page — could cause the CDN to store one customer's page and show it to other customers. Such incidents have happened at real companies. Caching rules for personal data must be reviewed with great care.

## Common mistakes

### Beginner mistake — Returning "200 OK" for errors

**What it looks like:** an API that always replies `200 OK`, with the body saying `{"success": false, "error": "Product not found"}`.

**Why it happens:** it seems simpler to always succeed at the HTTP level and put the real outcome in the body.

**What happens:** every client must read every body to discover failures. Monitoring tools, which count status codes, see no errors at all while users are failing. Caches may even store the error response as if it were valid.

**How to fix and prevent it:** use the status code that matches what happened — `404` for not found, `400` or `422` for invalid input, `500` for server failures — and put helpful details in the body as well.

### Beginner mistake — Confusing the frontend URL with the API URL

**What it looks like:** a request to `/api/products` fails with 404, while the page `/products` works.

**Why it happens:** the page the user sees and the API the page calls are often different paths, and sometimes different servers.

**How to spot it:** open the Network tab and look at the exact URL the request was sent to, and the status it received.

### Intermediate mistake — Using GET to change data

**What it looks like:** `GET /orders/55/cancel` or `GET /users/9/delete`.

**What happens:** link-preview bots, browsers pre-loading pages, and search engine crawlers trigger the action without anyone deciding to.

**How to fix and prevent it:** GET only reads. Changes use POST, PUT, PATCH or DELETE.

### Intermediate mistake — Trusting data from the frontend

**What it looks like:** the frontend sends `{"productId": "shoe-881", "price": 7499}`, and the backend charges whatever price arrives.

**What happens:** a user changes the price to 1 in their browser's developer tools and buys shoes for one rupee.

**How to fix and prevent it:** the backend looks up the price itself from the database. In general, the backend should accept from the client only what the client is entitled to choose (which product, how many), and decide everything else itself.

### Production mistake — Missing or wrong caching headers

**What it looks like:** after a new version of the website is released, some users keep seeing the old version, or broken pages mixing old and new files. Or the opposite: every visit re-downloads large files that never change, making the site slow.

**Why it happens:** caching headers were left at defaults or set without thinking.

**How to prevent it:** deliberately choose caching rules: long caching for files whose names change with each release, short or no caching for HTML pages and personal data. {{ch:frontend-performance}} and {{ch:caching}} cover the techniques.

### Enterprise mistake — Sensitive data in URLs

**What it looks like:** `GET /reset-password?token=abc123` or `/api/users?email=someone@example.com&password=...`.

**Why it happens:** query strings are convenient.

**What happens:** URLs are written into server logs, browser history, proxy logs and analytics tools, and can leak through the `Referer` header to other websites. Secrets in URLs end up stored in many places nobody controls.

**How to prevent it:** send secrets in request bodies or headers, never in URLs. Keep any one-time tokens that must appear in links short-lived and single-use.

## Debugging and troubleshooting

When something on a website does not work, the Network tab and the eight-step journey tell you where to look.

| What you see | What it means | Where to look |
|---|---|---|
| No request appears at all when you click | The frontend code did not send one | The browser's **Console** tab for JavaScript errors (step 1–2) |
| Request shows **(failed)** or a network error | It never reached the server, or no response came back | DNS, connection, HTTPS certificate, CORS (steps 3–4) |
| **4xx** status | The server rejected the request as wrong | The request's URL, method, headers and body; the response body usually explains |
| **401** or **403** | Not logged in, or not permitted | Cookies or `Authorization` header; the user's permissions |
| **5xx** status | The server failed | The **server's logs** — the browser cannot show the cause (steps 5–6) |
| **502 / 504** | A server in the middle could not get an answer from the application | Is the application running? Is it too slow? |
| **200** but the page does not change | The response arrived but the frontend did not handle it correctly | The response body, and the frontend code that handles it (step 8) |
| Very long "Waiting" time in Timing | The server took a long time to respond | Server-side code and database queries (steps 5–6) |

> [!NOTE]
> You may see an error mentioning **CORS** (Cross-Origin Resource Sharing). Browsers, for security, stop a web page from reading responses from a *different* website unless that website explicitly allows it with special headers. It commonly appears when a frontend at `localhost:5173` calls a backend at `localhost:3000` — different ports count as different origins. It is a browser protection, not a server crash, and it is fixed on the server by allowing the frontend's origin. {{ch:express}} shows how.

## How a senior engineer thinks about HTTP

> [!SENIOR]
> Experienced engineers treat HTTP as a contract, and design with its rules rather than around them:
>
> - **Methods and status codes carry meaning.** Using them correctly means caches, browsers, monitoring tools and other developers all understand the API without special instructions.
> - **Assume every request can be repeated.** Networks drop responses. They ask, "What happens if this request arrives twice?" — and make the answer "nothing bad".
> - **Stateless servers scale.** They keep per-user state in the database or a shared store, not in one server's memory, so any server can handle any request.
> - **The client is untrusted.** Every rule that matters is enforced on the server.
> - **Caching is a deliberate decision.** It can make a system dramatically faster or leak private data; they set caching headers on purpose, never by accident.
> - **Every request should be traceable.** In larger systems, a request ID in every log line turns a vague "it failed sometimes" into a precise story.

## Exercises

### Exercise 1 — Take apart a URL

**Objective:** practise reading every part of a URL.

**What to do:** identify the scheme, host, port, path, query string and fragment of:

```text
http://localhost:3000/api/orders/77?include=items&currency=PKR#summary
```

Then answer: which part is never sent to the server?

<details>
<summary>Show the solution</summary>

- **Scheme:** `http` — plain HTTP, which is normal on your own computer during development.
- **Host:** `localhost` — this same computer.
- **Port:** `3000` — written explicitly because it is not the standard port 80.
- **Path:** `/api/orders/77` — the order with ID 77, inside the API.
- **Query string:** `include=items&currency=PKR` — two parameters: include the order's items, and show amounts in Pakistani rupees.
- **Fragment:** `summary` — a section of the page.

The **fragment** (`#summary`) is never sent to the server. The browser keeps it and uses it to scroll to the matching part of the page.

**Common wrong approach:** treating `3000` as part of the host name, or the `?` and `#` as part of the path. Each symbol — `://`, `:`, `/`, `?`, `&`, `#` — marks where a new part begins.

</details>

### Exercise 2 — Choose the method and status code

**Objective:** practise matching actions to HTTP methods and outcomes to status codes.

**What to do:** for each situation, give the most suitable method and status code.

1. A customer views their list of past orders. It works.
2. A customer places a new order. It is created.
3. A customer changes only their phone number. It works and nothing needs to be returned.
4. A customer asks for order 999, which does not exist.
5. A logged-in customer tries to view another customer's order.
6. A visitor who is not logged in tries to view their orders.
7. The server's code crashes while processing a request.
8. A customer registers with an email address that is already registered.

<details>
<summary>Show the solution</summary>

1. **GET**, **200 OK** — reading data; success with a body.
2. **POST**, **201 Created** — creating something new.
3. **PATCH**, **204 No Content** — changing one part of a resource; nothing to send back. (Returning **200** with the updated customer is also perfectly reasonable.)
4. **GET**, **404 Not Found** — the resource does not exist.
5. **GET**, **403 Forbidden** — the server knows who they are, but they are not allowed. (Some systems return **404** here instead, so as not to reveal that the order exists at all. Both are defensible; returning 200 with the order is the one serious mistake.)
6. **GET**, **401 Unauthorized** — the server does not know who they are; they must log in.
7. Whatever the method, **500 Internal Server Error** — the failure is the server's, not the client's.
8. **POST**, **409 Conflict** — the request conflicts with existing data.

**Common wrong approach:** using 200 for everything, or confusing 401 and 403. Ask: *is the problem the client's (4xx) or the server's (5xx)? And for access problems, does the server know who you are (403) or not (401)?*

</details>

### Exercise 3 — Read a real response

**Objective:** practise reading real HTTP responses.

**What to do:** in a terminal, run:

```text
curl -i https://example.com
```

(Use `curl.exe` in Windows PowerShell 5.1.) Then answer:

1. What is the status code?
2. What is the content type, and which character encoding does it use?
3. How long may the response be cached?
4. Now run `curl -i https://example.com/this-page-does-not-exist`. What changes?

<details>
<summary>Show the solution</summary>

Typical answers (exact headers may vary over time):

1. **200 OK** — the page was found and returned.
2. **`text/html; charset=UTF-8`** — an HTML page, encoded in UTF-8.
3. From **`Cache-Control: max-age=604800`** — up to 604,800 seconds, which is 7 days.
4. The status code changes to **404 Not Found**, because no such path exists. The server may still send a body — often a small "not found" page — because a body is allowed with error responses and helps humans understand what happened.

**Common wrong approach:** looking only at the body and missing the status line. Always read the status code first; it tells you how to interpret everything else.

</details>

### Exercise 4 — Find the broken step (debugging scenario)

**Objective:** practise locating a problem in the eight-step journey.

**The scenario:** customers report that clicking **Place order** "does nothing". A developer opens the Network tab and clicks the button. They see a request `POST /api/orders`, and its status is **500**. The response body says `{"error": "Internal Server Error"}`.

**What to do:** explain which step of the journey is failing, what the developer should look at next, and what they should *not* spend time on.

<details>
<summary>Show the solution</summary>

**What we know:**

- Steps 1 and 2 worked: the click ran and a request was sent.
- Steps 3 and 4 worked: the request reached the server and a response came back.
- The status is **500**, a **server** error. So the failure is in **step 5 or 6**: the application code or the database.
- Step 8 is also partly at fault: the frontend should show the customer a clear error message instead of "doing nothing".

**What to look at next:** the **server's logs** at the time of the request. A 500 usually means an unhandled error in the backend code — the log will show the error message and the exact line. Common causes include a database being unreachable, a bug triggered by particular data, or a missing configuration value.

**What not to spend time on:** the network, DNS, or the user's browser. A 500 response proves the request arrived and the server answered; the problem is inside the server.

**Common wrong approach:** guessing at frontend changes because "the button does nothing". The status code has already told you the button works; the server is failing.

</details>

## Summary

The web is a system of **clients** (usually browsers) and **servers** exchanging **requests** and **responses** using **HTTP**. A **URL** contains the scheme, host, port, path, query string and fragment; the fragment is never sent to the server.

A web request travels through eight steps: the user acts; the browser builds a request; it crosses the network (DNS, TCP, HTTPS, routing); the server receives it; application code routes, authenticates and validates it; the database is queried; the server builds a response; and the browser handles it.

An HTTP **request** has a request line (method, path, version), headers and an optional body. A **response** has a status line, headers and a body. **Methods** say what kind of action is wanted: GET reads and is **safe**; PUT and DELETE are **idempotent**; POST is neither, so repeated POSTs can duplicate actions. **Status codes** say how it went: 2xx success, 3xx redirection, 4xx client error, 5xx server error.

HTTP is **stateless**; **cookies** let the browser carry an identity with every request, linked to a **session** on the server. **HTTPS** adds encryption, integrity and server authentication using TLS and certificates. Browsers turn HTML, CSS and JavaScript into pages, building the **DOM**. The **frontend** runs in the browser and must never be trusted; the **backend** enforces every rule. Modern apps talk to backends through **APIs** using **JSON**. You can watch all of this in the **Network** tab and with **curl**.

## Key terms

- **HTTP (HyperText Transfer Protocol)** — The protocol that web clients and servers use to exchange requests and responses.
- **HTTPS** — HTTP sent through an encrypted and verified connection using TLS.
- **Web browser** — A program that sends HTTP requests and displays the responses as pages people can use.
- **Web server** — A program that listens for HTTP requests and sends back responses.
- **Resource** — Anything a server can provide, such as a page, an image or a piece of data.
- **URL (Uniform Resource Locator)** — The full address of a resource, including the scheme, host, optional port, path, query string and fragment.
- **Scheme** — The first part of a URL, such as `https`, saying which protocol to use.
- **Host** — The part of a URL naming the server, usually a domain name.
- **Path** — The part of a URL identifying a resource on the server, such as `/products/shoes`.
- **Query string** — The part of a URL after `?`, containing `name=value` pairs that give extra details to the request.
- **Fragment** — The part of a URL after `#`, pointing to a position within a page; it is not sent to the server.
- **Subdomain** — A name in front of a registered domain, such as `shop` in `shop.example.com`.
- **URL encoding** — Replacing characters not allowed in URLs with `%` followed by a code, such as `%20` for a space.
- **Request** — A message from a client asking a server to do something.
- **Response** — A server's reply to a request, containing a status code, headers and usually a body.
- **HTTP method** — The part of a request saying what kind of action is wanted, such as GET, POST, PUT, PATCH or DELETE.
- **Safe method** — An HTTP method that must not change anything on the server, such as GET.
- **Idempotent** — Describes an operation that has the same effect whether it is performed once or several times.
- **Idempotency key** — A unique identifier sent with a request so the server can recognise and safely ignore repeats of it.
- **Status code** — A three-digit number in a response that tells the client how the request went.
- **Header** — A `Name: value` line in a request or response that carries extra information about it.
- **Body** — The main content of a request or response, such as JSON data or an HTML page.
- **Load balancer** — A server that spreads incoming requests across several servers.
- **Routing (in a web application)** — Matching a request's method and path to the code that should handle it.
- **Stateless** — Describes a protocol or server that does not remember anything between requests.
- **Cookie** — A small piece of text a server asks a browser to store and send back with every later request to that site.
- **Session** — A server-side record linking an identifier (often stored in a cookie) to a logged-in user.
- **TLS (Transport Layer Security)** — The protocol that encrypts and verifies connections, used by HTTPS.
- **Certificate** — A digital document, vouched for by a certificate authority, proving that a server really owns a domain.
- **Certificate authority** — A trusted organisation that issues certificates after verifying who controls a domain.
- **HTML (HyperText Markup Language)** — The language that describes the structure and content of a web page.
- **CSS (Cascading Style Sheets)** — The language that describes how a web page looks.
- **DOM (Document Object Model)** — The tree-shaped, in-memory representation of a web page that JavaScript can read and change.
- **Static content** — Files that are the same for every visitor and are sent as they are, such as images and stylesheets.
- **Dynamic content** — Content generated by code for each request, such as a user's basket.
- **Frontend** — The part of an application that runs in the user's browser or device.
- **Backend** — The part of an application that runs on servers and enforces rules, stores data and talks to other services.
- **API (Application Programming Interface)** — A defined set of requests a program can make to another program, and the responses it will receive.
- **JSON (JavaScript Object Notation)** — A simple text format for structured data, widely used in APIs.
- **HTTP/2** — A version of HTTP that sends many requests and responses at once over one connection.
- **HTTP/3** — A version of HTTP that runs over QUIC instead of TCP.
- **curl** — A command-line tool for sending HTTP requests and viewing responses.
- **CORS (Cross-Origin Resource Sharing)** — A browser rule that blocks web pages from reading responses from other sites unless those sites allow it.
- **Origin** — The combination of scheme, host and port that identifies a website for security purposes.
- **Request ID** — A unique identifier attached to a request so it can be traced through logs and systems.

## What comes next

You now understand the whole path from a click to a result: URLs, HTTP requests and responses, methods, status codes, cookies, HTTPS, APIs and JSON. Part I's picture of computers, programs, the terminal, the internet and the web is nearly complete.

Before you start writing real programs, you need a proper place to write them. In the next chapter, **Setting Up Your Workshop**, you will install and configure the professional tools used throughout this book — a code editor, Node.js and Git — and write and run your first program from a file.
