# Modules and npm: Code Across Many Files

> [!GOALS]
> - Why real programs are split into many files, and what problems that solves.
> - How to share code between files with ES modules: `export` and `import`, named and default.
> - The older CommonJS system (`require` and `module.exports`), which you will meet in countless projects.
> - How Node.js finds and loads modules — and why a module runs only once.
> - Node.js's built-in modules, such as `node:fs` and `node:path`.
> - What npm is, and how `package.json`, `node_modules` and `package-lock.json` fit together.
> - How version numbers work (semantic versioning) and what `^` and `~` mean.
> - npm scripts, `npx`, and the difference between dependencies and devDependencies.
> - How to choose a package wisely, and the real security risks of depending on other people's code.

## Why this matters

Every program you have written so far fits in one file. Real applications do not. A modest online shop's backend might have hundreds of files: some for products, some for orders, some for payments, some for sending email, some for talking to the database. A frontend has hundreds more.

Splitting code into files is not just tidiness. It solves real problems:

- **Finding things.** "Where is the delivery fee calculated?" — in `pricing/delivery.js`, not somewhere in a 20,000-line file.
- **Avoiding collisions.** Two parts of a program can each have a function called `format` without interfering, because each lives in its own file with its own scope ({{ch:scope-and-closures}}).
- **Working in teams.** Five developers can change five different files at once without constantly stepping on each other's changes.
- **Reuse.** A file of price-formatting functions can be used by the basket, the invoice and the email code.

And beyond your own files, almost every project uses **code written by other people**: libraries for web servers, databases, dates, payments, testing. JavaScript has the largest collection of reusable libraries of any language, shared through a tool called **npm**. Knowing how to use it well — and how to use it **safely** — is part of every JavaScript job.

## The simple idea

Think of a large restaurant kitchen. It is not one person doing everything at one table. There are **stations**: one for grilling, one for sauces, one for desserts. Each station has its own tools and does its own job. When the grill station needs a sauce, it **asks** the sauce station for it — it does not reach over and start cooking sauce itself.

A **module** is a station: a file with its own private workings, which **offers** (exports) some things to the rest of the program, and **asks for** (imports) things it needs from other modules.

And when the kitchen needs something it does not make itself — bread, say — it buys it from a trusted **supplier**. npm is the marketplace of suppliers for JavaScript code.

> [!ANALOGY]
> A module is like a shop with a counter. Customers can buy only what is put on the counter (the exports). Everything behind the counter — the stockroom, the tools, the staff room — is private.
>
> **Where the analogy breaks:** a shop's counter shows copies of its goods. A module's exports are **live connections** to the module's own variables and objects — if a module exports an object and another file changes it, every file that imported it sees the change. And every file that imports a module gets the **same single** module, not its own copy.

## The proper definition and key words

- A **module** is a file of code with its own scope, which chooses what to make available to other files.
- **Exporting** means making a value (a function, class, object or constant) available to other modules.
- **Importing** means bringing an exported value from another module into the current one.
- A **package** is a folder of code, described by a `package.json` file, that can be published and installed — usually a library someone has shared.
- A **dependency** is a package your project needs.
- **npm** (originally short for Node Package Manager) is three things at once: the **command-line tool** installed with Node.js, the **registry** (the online database of packages at npmjs.com), and the company that runs it.
- A **package manager** is a tool that downloads packages, installs them and keeps track of their versions.

## ES modules: `export` and `import`

JavaScript's official module system is called **ES modules** (ECMAScript modules, often shortened to **ESM**). It is used by modern browsers, modern Node.js projects and every modern frontend framework.

### Telling Node.js to use ES modules

Node.js supports two module systems (the other, CommonJS, is explained later). To use ES modules, you either:

- name your files with the extension **`.mjs`**, or
- add `"type": "module"` to your project's `package.json` file (explained below), and keep using `.js`.

Let us set up a small project properly. In a terminal:

```text
> cd ~/code
> mkdir shop-modules
> cd shop-modules
> npm init -y
```

`npm init -y` creates a `package.json` file with default settings (`-y` means "yes to everything"). Open it in VS Code and add the line `"type": "module",`:

```json
{
  "name": "shop-modules",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "license": "ISC"
}
```

(Your generated file may have a few more lines, such as `description`, `keywords` and `author`; they do not matter here.) Now every `.js` file in this project is treated as an ES module.

### Named exports

Create a file `pricing.js`:

```js
// pricing.js
const VAT_RATE = 0.18;

export function formatPrice(paisa) {
  return `Rs ${(paisa / 100).toFixed(2)}`;
}

export function addVat(paisa) {
  return Math.round(paisa * (1 + VAT_RATE));
}

export const FREE_DELIVERY_THRESHOLD_PAISA = 500000;
```

Then create `index.js`:

```js
// index.js
import { formatPrice, addVat, FREE_DELIVERY_THRESHOLD_PAISA } from "./pricing.js";

const shirtPaisa = 129950;
console.log(formatPrice(shirtPaisa));
console.log(formatPrice(addVat(shirtPaisa)));
console.log(`Free delivery over ${formatPrice(FREE_DELIVERY_THRESHOLD_PAISA)}`);
```

Run it with `node index.js`:

**Output:**

```text
Rs 1299.50
Rs 1533.41
Free delivery over Rs 5000.00
```

Walkthrough of `pricing.js`:

- `export` before a function or `const` declaration makes it available to other modules. These are **named exports**: each is exported under its own name.
- `VAT_RATE` has **no** `export`, so it is **private** to `pricing.js`. Other files cannot see it at all — exactly like a variable inside a function. This is module scope from {{ch:scope-and-closures}}.

Walkthrough of `index.js`:

- `import { ... } from "./pricing.js";` brings in the named exports listed inside the curly braces. The names must match the exported names exactly.
- `"./pricing.js"` is the path to the module. The `./` means "in the same folder as this file" ({{ch:the-terminal}}). **In Node.js ES modules, you must include the `.js` extension** — `"./pricing"` alone will fail.
- After importing, `formatPrice` and the others are used as if they had been written in this file.

You can also write all the exports together at the bottom of a file, which some teams prefer because it shows the module's whole public interface in one place:

```js
function formatPrice(paisa) { /* ... */ }
function addVat(paisa) { /* ... */ }

export { formatPrice, addVat };
```

### Renaming and importing everything

When an imported name clashes with one you already have, or is unclear in its new context, rename it with `as`:

```js
import { formatPrice as formatPKR } from "./pricing.js";
```

To import **all** named exports as properties of one object, use a **namespace import**:

```js
import * as pricing from "./pricing.js";

console.log(pricing.formatPrice(49900));
console.log(pricing.FREE_DELIVERY_THRESHOLD_PAISA);
```

This is useful when a module has many exports, and makes it obvious at every use where a function comes from.

### Default exports

A module may also have **one default export** — "the main thing this module provides". It is written with `export default`, and imported **without** curly braces, under any name you choose:

```js
// Basket.js
export default class Basket {
  items = [];

  add(name, pricePaisa, quantity = 1) {
    this.items.push({ name, pricePaisa, quantity });
  }

  totalPaisa() {
    return this.items.reduce((sum, item) => sum + item.pricePaisa * item.quantity, 0);
  }
}
```

```js
// index.js
import Basket from "./Basket.js";
import { formatPrice } from "./pricing.js";

const basket = new Basket();
basket.add("Cotton shirt", 129950, 2);
basket.add("Cap", 49900);
console.log(formatPrice(basket.totalPaisa()));
```

**Output:**

```text
Rs 3098.00
```

A module can have both a default export and named exports, and you can import both in one line: `import Basket, { SHIPPING_ZONES } from "./Basket.js";`.

> [!TIP]
> **Named or default?** Many teams prefer **named exports everywhere**. With named exports, the imported name must match the exported one, so the same thing has the same name in every file — which makes searching the codebase and automatic renaming in the editor reliable. With default exports, each importing file can choose a different name (`import Basket`, `import Cart`, `import ShoppingBasket`), which gradually causes confusion. Default exports remain common in some frameworks (for example, page components in Next.js, {{ch:nextjs}}), so you must recognise both.

### How imports work: live bindings and running once

Two facts about ES modules surprise people, and both matter in real programs.

**1. A module's code runs only once.** However many files import a module, Node.js loads and runs it the **first** time it is imported, and then **caches** it. Every later import receives the same, already-loaded module.

```js
// counter.js
console.log("counter.js is running");
let count = 0;
export function increment() {
  count++;
  return count;
}
```

```js
// a.js
import { increment } from "./counter.js";
export function fromA() { return increment(); }
```

```js
// main.js
import { increment } from "./counter.js";
import { fromA } from "./a.js";

console.log(increment());
console.log(fromA());
console.log(increment());
```

**Output (running `node main.js`):**

```text
counter.js is running
1
2
3
```

"counter.js is running" printed **once**, even though two files import it. And `main.js` and `a.js` share the **same** `count`: three calls from two different files give 1, 2, 3. A module is effectively a **singleton** — one shared instance for the whole program.

This is very useful: a module that creates a database connection runs once, and every file that imports it shares the same connection. But it is also the exact mechanism behind the danger described in {{ch:scope-and-closures}}: **module-level variables are shared by every user of a server.** Never keep per-request or per-user data in them.

**2. Imports are read-only live bindings.** An imported name is a live, read-only view of the exporting module's variable — not a copy. You cannot assign to it from the importing file (`increment = null` would be a `TypeError`), and if the exporting module changes the variable, importers see the new value.

### Imports are hoisted and static

`import` statements are processed **before** any of the module's code runs — much like hoisting ({{ch:scope-and-closures}}) — and they must appear at the **top level** of a file, not inside functions or `if` blocks. This **static** structure lets tools see exactly which files depend on which, without running the code. Build tools use this to remove unused code from the files sent to browsers, a technique called **tree shaking** ({{ch:frontend-performance}}).

When you genuinely need to load a module **conditionally** or **later**, there is a separate feature called **dynamic import** — `await import("./heavy-report.js")` — which loads a module on demand. You will understand the `await` part in {{ch:asynchronous-javascript}}.

## CommonJS: the older system you will still meet

Before ES modules existed, Node.js invented its own module system, called **CommonJS** (CJS). It is still everywhere: in older projects, in many libraries, and in countless tutorials. You must be able to read it.

```js
// pricing.cjs
const VAT_RATE = 0.18;

function formatPrice(paisa) {
  return `Rs ${(paisa / 100).toFixed(2)}`;
}

function addVat(paisa) {
  return Math.round(paisa * (1 + VAT_RATE));
}

module.exports = { formatPrice, addVat };
```

```js
// index.cjs
const { formatPrice, addVat } = require("./pricing.cjs");

console.log(formatPrice(addVat(129950)));
```

**Output:**

```text
Rs 1533.41
```

- **`module.exports`** is an object that a CommonJS module fills with whatever it wants to share. Here, an object with two functions (using property shorthand from {{ch:objects}}).
- **`require("./pricing.cjs")`** loads the module and **returns** its `module.exports` object. Destructuring picks out the two functions.

The `.cjs` extension tells Node.js "this file is CommonJS" even inside a `"type": "module"` project. In a project **without** `"type": "module"`, plain `.js` files are CommonJS by default.

| | ES modules | CommonJS |
|---|---|---|
| Export | `export function f…`, `export default …` | `module.exports = { … }` |
| Import | `import { f } from "./x.js"` | `const { f } = require("./x")` |
| When loaded | Before the code runs (static) | When `require` runs (at runtime, can be anywhere) |
| File extension in path | Required in Node.js | Optional |
| Strict mode | Always | Only if `"use strict"` |
| Where | Modern Node.js, browsers, all modern tools | Older Node.js code and many existing libraries |

**For new projects, use ES modules.** Modern Node.js can also load most CommonJS packages from ES modules (`import express from "express"` works even though Express is written in CommonJS), so mixing is usually painless.

## Built-in modules

Node.js comes with many built-in modules that give your programs access to the world outside JavaScript — the "extra abilities" of the Node.js runtime from {{ch:from-code-to-running-program}}. You import them with the `node:` prefix, which makes it clear they are built in rather than installed packages:

```js
import path from "node:path";
import os from "node:os";
import { readFileSync, writeFileSync } from "node:fs";

const notesFile = path.join("data", "notes.txt");
console.log("Path:", notesFile);
console.log("Platform:", os.platform());

writeFileSync("hello.txt", "Hello from Node.js\n", "utf8");
console.log(readFileSync("hello.txt", "utf8"));
```

**Output (on Windows):**

```text
Path: data\notes.txt
Platform: win32
Hello from Node.js

```

Walkthrough:

- **`node:path`** works with file paths safely. `path.join` joins pieces with the correct separator for the current operating system — a backslash on Windows, a forward slash on macOS and Linux — avoiding the slash problems from {{ch:the-terminal}}.
- **`node:os`** gives information about the operating system.
- **`node:fs`** ("file system") reads and writes files. `writeFileSync` writes text to a file (creating or replacing it); `readFileSync` reads it back. The `"utf8"` argument tells Node.js to treat the bytes as UTF-8 text ({{ch:what-a-computer-is}}).
- "Sync" means these functions **wait** until the file operation finishes before the next line runs. That is fine in small scripts, but in a server it blocks every other user while the disk works. Servers use the non-blocking versions, which you will learn in {{ch:asynchronous-javascript}} and {{ch:nodejs}}.

Other built-in modules you will use include `node:http` (web servers), `node:crypto` (secure random numbers, hashing and encryption), `node:url`, `node:events` and `node:test` (a built-in test runner).

## npm: using other people's code

### Level 1 — Why packages exist

Suppose your shop needs to work with dates: "delivery in 3 working days, skipping Sundays and public holidays". Writing correct date code is surprisingly hard — time zones, month lengths, leap years. Someone has already written and tested a library for it, used by millions of projects. Rather than writing your own, you **install** that library.

The **npm registry** holds well over two million packages. A small number are used by almost every project; most are small, niche or abandoned. Learning to use npm well means both using packages effectively **and** choosing them carefully.

### `package.json`: your project's description

Every Node.js project has a `package.json` file at its root. It describes the project and lists what it depends on. Here is a typical one for a small backend:

```json
{
  "name": "shop-api",
  "version": "1.4.0",
  "description": "Backend API for Ali's Shoe Corner",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "node --test",
    "lint": "eslint ."
  },
  "engines": {
    "node": ">=22"
  },
  "dependencies": {
    "express": "^5.1.0",
    "zod": "^4.1.0"
  },
  "devDependencies": {
    "eslint": "^9.30.0",
    "prettier": "^3.6.0"
  }
}
```

The most important fields:

- **`name`** and **`version`** — the project's name and its own version number.
- **`type`** — `"module"` to use ES modules for `.js` files.
- **`main`** — the main entry file of the project.
- **`scripts`** — named commands you can run with npm (explained below).
- **`engines`** — which versions of Node.js the project supports. Recording this prevents the "works on my machine" problems from {{ch:setting-up-your-workshop}}.
- **`dependencies`** — packages the project needs **to run**: here, Express (a web server framework, {{ch:express}}) and Zod (a validation library, {{ch:validation}}).
- **`devDependencies`** — packages needed only **while developing**: linters, formatters, test tools. They are not needed on the production server.

(The version numbers shown are examples; you will see what the symbols mean shortly.)

### Installing packages

To add a package, run `npm install` (or its short form `npm i`) followed by the package name:

```text
> npm install dayjs
```

**Output (shortened):**

```text
added 1 package, and audited 2 packages in 1s
found 0 vulnerabilities
```

This does three things:

1. **Downloads** the package from the registry into a folder called **`node_modules`** in your project.
2. **Adds it to `dependencies`** in `package.json`, with a version range such as `"dayjs": "^1.11.13"`.
3. **Records the exact version installed** in a file called **`package-lock.json`**.

Now use it like any module — with just the package name, no `./`:

```js
import dayjs from "dayjs";

const orderDate = dayjs("2026-11-19");
const deliveryDate = orderDate.add(3, "day");
console.log(`Ordered ${orderDate.format("DD MMM YYYY")}, arrives ${deliveryDate.format("DD MMM YYYY")}`);
```

**Output:**

```text
Ordered 19 Nov 2026, arrives 22 Nov 2026
```

When an import path has **no** `./`, `../` or `/` at the start, Node.js treats it as a **package name** and looks for it in `node_modules`. When it **does** start with `./` or `../`, it is a file in your own project.

To install a development-only tool, add `--save-dev` (or `-D`):

```text
> npm install --save-dev prettier
```

To remove a package: `npm uninstall dayjs`.

### `node_modules`: never commit it

Look inside `node_modules` after installing a few packages and you will usually find **far more** folders than you installed. That is because packages depend on other packages, which depend on others. Your **direct dependencies** pull in **transitive dependencies** — dependencies of dependencies. A typical frontend project with twenty direct dependencies can easily contain hundreds or over a thousand packages in `node_modules`.

```text
  your project
   ├── express        (you installed this)
   │    ├── body-parser       (express needs this)
   │    │    └── iconv-lite   (body-parser needs this)
   │    ├── cookie
   │    └── ... dozens more
   └── zod            (you installed this)
```

`node_modules` can therefore be very large, and it can always be **recreated** from `package.json` and `package-lock.json`. So it must **never** be committed to Git. Every project has a file called **`.gitignore`** listing files and folders Git should ignore, and `node_modules/` is always in it ({{ch:git}}).

When you clone someone else's project, the first thing you do is:

```text
> npm install
```

With no package name, `npm install` installs everything listed in `package.json` (respecting the lock file).

### `package-lock.json`: the exact recipe

`package.json` usually lists version **ranges** ("version 5.1.0 or any compatible newer one"). If two developers ran `npm install` a month apart, they could get different versions — exactly the "works on my machine" problem.

`package-lock.json` solves this. It records the **exact** version of **every** package installed — direct and transitive — plus a fingerprint of each package's contents (called an **integrity hash**) so that npm can detect if a downloaded package has been tampered with.

- **Commit `package-lock.json` to Git.** It guarantees that everyone, and every server, installs exactly the same versions.
- **Never edit it by hand.** npm maintains it.

For automated environments — test servers, deployment pipelines ({{ch:cicd}}) — use:

```text
> npm ci
```

`npm ci` ("clean install") deletes any existing `node_modules` and installs **exactly** what the lock file says. If `package.json` and the lock file disagree, it fails instead of guessing. That strictness is exactly what you want when building the version that goes to production.

## Version numbers: semantic versioning

### Level 4 — What the three numbers mean

Almost every package uses **semantic versioning** (**semver**): a version number of three parts, `MAJOR.MINOR.PATCH`, such as `5.1.3`. Each part carries a promise about what changed:

```text
        5  .  1  .  3
        |     |     |
        |     |     PATCH: bug fixes only; nothing you use changes
        |     MINOR: new features added; existing ones still work the same
        MAJOR: breaking changes; code using the old version may need updating
```

- **PATCH** goes up for bug fixes that do not change how you use the package: `5.1.3` → `5.1.4`.
- **MINOR** goes up when new features are added in a backwards-compatible way: `5.1.4` → `5.2.0`.
- **MAJOR** goes up when something changes in a way that can **break** existing code — a function renamed, removed, or behaving differently: `5.2.0` → `6.0.0`.

Versions starting with `0.` (such as `0.8.2`) mean the package is still early in development; by convention, anything may change in any release.

### Ranges: `^` and `~`

In `package.json`, dependency versions are usually written as **ranges**:

| Written | Meaning | Allows |
|---|---|---|
| `"5.1.3"` | Exactly this version | only 5.1.3 |
| `"~5.1.3"` | Patch updates only | 5.1.3, 5.1.4, 5.1.9 — not 5.2.0 |
| `"^5.1.3"` | Minor and patch updates | 5.1.4, 5.2.0, 5.9.9 — not 6.0.0 |
| `">=22"` | This version or newer | anything 22 and above |

The **caret** `^` is npm's default. It trusts packages to follow semver: new minor versions should not break you, so they are allowed; new major versions might, so they are not.

That trust is not always justified — sometimes a minor or patch release accidentally breaks something. This is another reason the **lock file** matters: it pins exact versions, so updates only happen when **you** deliberately run an update and test it.

### Keeping dependencies up to date

```text
> npm outdated
```

**Output (example):**

```text
Package   Current   Wanted   Latest
express     5.0.1    5.1.0    5.1.0
eslint      8.57.0   8.57.1   9.30.0
```

- **Current** — the version installed now.
- **Wanted** — the newest version allowed by the range in `package.json`.
- **Latest** — the newest version published.

`npm update` moves packages to their "Wanted" versions. Moving to a new **major** version (like eslint 8 → 9 above) is a deliberate step: read the package's release notes for breaking changes, update the version in `package.json`, install, and run your tests.

Dependencies that are never updated become a problem over time: they accumulate known security holes, and the eventual upgrade becomes a huge, risky jump. Professional teams update regularly, in small steps, often with automated tools that open update proposals for them.

## npm scripts and `npx`

### Scripts: named commands for your project

The `scripts` section of `package.json` gives names to commands. Run them with `npm run <name>`:

```json
"scripts": {
  "start": "node src/index.js",
  "dev": "node --watch src/index.js",
  "test": "node --test",
  "lint": "eslint .",
  "format": "prettier --write ."
}
```

```text
> npm run dev
> npm run lint
> npm test
> npm start
```

(`npm test` and `npm start` are so common that they work without the word `run`.)

Why bother, when you could type the commands directly?

- **Everyone uses the same commands.** A new developer does not need to know whether the project uses `node --watch` or another tool; they run `npm run dev`.
- **Scripts can use locally installed tools.** When npm runs a script, it adds `node_modules/.bin` to the PATH ({{ch:the-terminal}}), so `eslint` and `prettier` are found even though they were installed only in this project, not globally.
- **Automation uses them.** Deployment pipelines run `npm ci`, `npm run lint` and `npm test` — the same commands developers use.

### `npx`: run a package's command

`npx` runs a command from a package — either one installed in your project, or one it downloads temporarily:

```text
> npx prettier --check .
> npx create-vite@latest my-frontend
```

The second example downloads a project-generator tool, runs it once to create a new frontend project, and does not keep it installed. You will use `npx` to start new projects in later chapters.

> [!WARNING]
> `npx some-package` downloads and runs code from the internet with your user's permissions. Before running an unfamiliar package this way, check the exact name carefully — attackers publish packages with names very similar to popular ones, hoping for a typing mistake. This leads us to the risks of dependencies.

## Choosing packages, and the risks they bring

### Every dependency is a trade-off

Installing a package saves you writing code. But every dependency also brings:

- **Code you did not write and have not read,** running inside your application, with all the access your application has — to your files, your environment variables (including secrets), and your users' data.
- **Its own dependencies,** which you also did not choose.
- **Maintenance:** future updates, security fixes, and breaking changes to deal with.
- **Risk of abandonment:** if its author stops maintaining it, you may be stuck on an old, insecure version.

So the question is never just "is there a package for this?" It is "**is this package worth what it costs?**"

### Questions to ask before installing

| Question | Why it matters |
|---|---|
| Do I really need it? Is it a few lines I could write myself, or something built into JavaScript or Node.js? | Built-in features and short functions carry no supply risk |
| Is it widely used? (Weekly downloads on npmjs.com) | Popular packages have more eyes on them and get problems noticed faster |
| Is it actively maintained? (Recent releases, issues being answered) | Abandoned packages accumulate unfixed vulnerabilities |
| How many dependencies does it pull in? | Each one is more code and more risk |
| Is the licence acceptable for your use? | Some licences place conditions on commercial use |
| Is the name **exactly** right? | Look-alike names are a known attack |

### Real incidents worth knowing

Two well-documented events shaped how the industry thinks about npm:

- **The left-pad incident (2016).** A developer removed a tiny package called `left-pad` — about eleven lines that padded strings, the job `padStart` ({{ch:types-of-data}}) now does built in — from the registry. Thousands of projects depended on it indirectly, and builds broke across the industry, including at large companies. npm changed its rules afterwards so that packages others depend on cannot simply be removed. The lesson: even a trivial dependency is a dependency.
- **The event-stream incident (2018).** A popular package, `event-stream`, was handed over by its tired original maintainer to a new volunteer, who added a dependency containing hidden malicious code designed to steal from users of a particular cryptocurrency wallet. It reached many projects through transitive dependencies before it was discovered. The lesson: trust in a package is trust in **whoever controls it now**.

Attacks of these kinds — compromising a trusted component in order to reach everyone who uses it — are called **supply-chain attacks**, and they remain an active threat.

### Defences

- **Audit known vulnerabilities:** `npm audit` checks your installed packages against a database of known security problems and suggests fixes.
- **Commit and use the lock file**, and use `npm ci` in automation, so a compromised new version is not pulled in silently.
- **Update deliberately**, review what changed, and run tests.
- **Prefer fewer, well-maintained dependencies.**
- **Use automated tools** that watch your dependencies and alert you to new vulnerabilities ({{ch:application-security}}).

> [!SENIOR]
> Experienced engineers treat adding a dependency like hiring a contractor who will have keys to the building. Sometimes it is clearly worth it — nobody should write their own web framework, database driver or cryptography. Sometimes it is clearly not — a package to check whether a number is odd. The skill is judging the cases in between, and remembering that the cost continues for as long as the dependency stays.

## Organising a project into modules

### How to split code

There is no single correct structure, but a few principles hold everywhere:

1. **One clear responsibility per module.** `pricing.js` prices things; `email.js` sends emails. If a file's name needs "and", consider splitting it.
2. **Group by feature as the project grows.** Small projects often group by kind (`utils/`, `models/`); larger ones usually group by **feature** (`orders/`, `products/`, `payments/`), keeping everything about one feature together.
3. **Export the minimum.** Export what other modules need; keep helpers private. A small public interface is easier to keep stable.
4. **Dependencies should point one way.** Low-level modules (formatting, calculations) should not import high-level ones (checkout, HTTP handlers).

### Circular dependencies

When module A imports module B and module B imports module A — directly or through a chain — you have a **circular dependency**. Because each module waits for the other to finish loading, one of them may see the other's exports before they are ready, leading to errors such as `Cannot access 'X' before initialization` or `undefined` values at start-up.

```text
   orders.js  ---imports--->  customers.js
       ^                           |
       +--------imports------------+
```

Circular dependencies are usually a sign that responsibilities are tangled. The fix is to restructure: move the shared piece into a third module that both import, so the arrows point one way.

## From beginner to enterprise: modules and packages at every level

**Level 3 — A small project.** A handful of ES modules with named exports, a `package.json` with `"type": "module"`, and perhaps one or two well-known packages.

**Level 4 — A real application.** Code is organised into folders by feature; built-in modules handle files and paths; a modest set of carefully chosen dependencies provides the web framework, validation and database access. `package-lock.json` is committed, `node_modules` is ignored, and npm scripts define how to run, test and lint the project.

**Level 5 — Professional engineering.** Builds use `npm ci` for reproducibility. Dependencies are updated regularly and audited automatically; adding a new dependency is discussed in code review. The `engines` field and a pinned Node.js version keep environments consistent. Linting rules flag unused imports and forbidden patterns, such as circular dependencies.

**Level 6 — Enterprise.** Large organisations often keep many packages in one repository (a **monorepo**), managed with workspace features of npm or alternative package managers such as **pnpm** and **Yarn**. They run **private registries** for internal packages, mirror the public registry so that builds do not depend on its availability, and use software composition analysis tools that inventory every dependency, its licence and its known vulnerabilities — sometimes required by customers or regulators as a **software bill of materials** (SBOM).

## Real-world use cases

### Beginner level — Splitting a growing script

**Situation:** a learner's single-file shop script reaches 600 lines and becomes hard to navigate.

**Solution:** move pricing functions into `pricing.js`, the basket class into `Basket.js`, and keep `index.js` as the small file that wires them together.

**Lesson:** each file now has one job, and the import lines at the top of each file show exactly what it depends on.

### Intermediate level — "Works on my machine", solved

**Business problem:** a small team's API passes all tests on developers' laptops but fails on the server after deployment.

**Cause:** the lock file was not committed; the server installed a newer minor version of a library that had changed some behaviour.

**Solution:** commit `package-lock.json`, deploy with `npm ci`, and record the Node.js version in `engines`.

**Trade-off:** updates no longer arrive automatically; the team must schedule them. That is the point — changes happen deliberately and are tested.

### Advanced level — Reducing dependency weight

**Business problem:** a frontend application loads slowly on mobile phones in areas with weak connections.

**Investigation:** one large date library is imported in full just to format a few dates, adding a large amount of JavaScript to every page load.

**Solution:** replace it with the built-in `Intl.DateTimeFormat` (part of JavaScript) or a much smaller library, and import only what is needed, so build tools can tree-shake the rest.

**Reasoning:** every byte of a dependency in the browser is paid for by every user, on every visit ({{ch:frontend-performance}}).

### Enterprise level — Responding to a vulnerable dependency

**Business problem (illustrative):** a security advisory announces a serious vulnerability in a widely used logging library, deep in many companies' dependency trees.

**What happens in a well-prepared company:** automated inventory tools immediately list every service whose dependency tree includes the affected versions; teams update the dependency (or a parent package that pulls it in), run their tests and deploy within hours; the security team verifies that no affected version remains.

**What happens in an unprepared company:** nobody knows which services use the library, because it is a transitive dependency; teams search manually for days, while the vulnerability is exploitable.

**Lesson:** knowing exactly what your software is made of is a security capability, not a bureaucratic exercise.

## Common mistakes

### Beginner mistake — "Cannot use import statement outside a module"

**What it looks like:**

```text
SyntaxError: Cannot use import statement outside a module
```

**Why it happens:** you used `import` in a `.js` file, but the project is not configured for ES modules.

**How to fix it:** add `"type": "module"` to `package.json`, or rename the file to `.mjs`.

### Beginner mistake — Missing file extension

**What it looks like:**

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\code\shop-modules\pricing' imported from C:\code\shop-modules\index.js
```

**Why it happens:** `import { formatPrice } from "./pricing";` — in Node.js ES modules, relative imports need the extension.

**How to fix it:** `from "./pricing.js"`.

### Beginner mistake — Forgetting `./` for your own files

**What it looks like:** `import { formatPrice } from "pricing.js";` failing because Node.js looks for a **package** called `pricing.js` in `node_modules`.

**How to fix it:** your own files always start with `./` or `../`.

### Beginner mistake — Named versus default import confusion

**What it looks like:** `import formatPrice from "./pricing.js";` when `formatPrice` is a named export — error: `The requested module './pricing.js' does not provide an export named 'default'`. Or `import { Basket } from "./Basket.js";` when `Basket` is a default export.

**How to fix it:** curly braces for named exports; no braces for the default export. Check how the module exports it.

### Intermediate mistake — Committing `node_modules`

**What it looks like:** a Git repository with tens of thousands of files and hundreds of megabytes.

**How to fix and prevent it:** add `node_modules/` to `.gitignore`; remove it from Git's tracking ({{ch:git}} shows how).

### Intermediate mistake — Not committing the lock file

**What happens:** different machines install different versions, and bugs appear in one place but not another.

**How to prevent it:** commit `package-lock.json`; use `npm ci` in automation.

### Production mistake — Dev tools in production, or production needs in devDependencies

**What it looks like:** a production build fails with "Cannot find package 'zod'" because it was installed with `--save-dev`; or production servers install testing tools they never use.

**How to prevent it:** anything the running application imports belongs in `dependencies`; tools used only while developing belong in `devDependencies`. Production installs can skip dev tools with `npm ci --omit=dev`.

### Enterprise mistake — Unreviewed and unmaintained dependencies

**What it looks like:** dependencies added casually and never updated; a project depending on dozens of abandoned packages.

**What happens:** growing exposure to known vulnerabilities, and painful forced upgrades when something finally breaks.

**How to prevent it:** review new dependencies; update regularly; audit automatically; remove packages you no longer use.

## Debugging and troubleshooting

| Error | Meaning | Fix |
|---|---|---|
| `Cannot use import statement outside a module` | ES module syntax in a CommonJS file | `"type": "module"` or `.mjs` |
| `ERR_MODULE_NOT_FOUND` / `Cannot find module` | The path or package name is wrong, the extension is missing, or the package is not installed | Check the path, `./`, the extension; run `npm install` |
| `does not provide an export named 'X'` | Importing a name the module does not export (or a default as named) | Check the module's exports and spelling |
| `require is not defined in ES module scope` | Using `require` in an ES module | Use `import`, or rename the file `.cjs` |
| `Cannot access 'X' before initialization` at start-up | Often a circular dependency | Restructure so imports point one way |
| `npm ERR! code ERESOLVE` | Two packages require incompatible versions of a third | Read the message; update one of the packages, or check compatibility notes |
| A package's command is "not recognized" | It is installed locally, not globally | Run it through an npm script or `npx` |
| Fresh clone does not run | Dependencies not installed | `npm install` (or `npm ci`) |

> [!TIP]
> When dependency installation gets into a strange state — confusing errors after many installs and uninstalls — a reliable reset is: delete the `node_modules` folder and run `npm install` again. If the lock file itself seems wrong, delete both `node_modules` and `package-lock.json` and reinstall — but only as a last resort, because it may change exact versions; review the resulting lock file changes before committing.

## How a senior engineer thinks about modules and dependencies

> [!SENIOR]
> - **A module is a boundary.** What it exports is a promise to the rest of the code. Small, clear interfaces are easier to keep stable and to test.
> - **Structure reflects the business.** As code grows, folders follow features — orders, payments, customers — so that one change touches one area.
> - **Dependencies are long-term commitments.** Before adding one: is it needed, maintained, popular, light and correctly named? After adding it: keep it updated, audited and justified.
> - **Reproducibility is non-negotiable.** Lock files committed, `npm ci` in automation, Node.js versions recorded. A build should produce the same result anywhere.
> - **Module state is shared state.** Anything at a module's top level exists once for the whole process — on a server, for every user at once.

## Exercises

### Exercise 1 — Split a program into modules

**Objective:** practise named exports, default exports and imports.

**What to build:** in a new project with `"type": "module"`, create:

- `money.js` — named exports `toPaisa(rupees)` (returns whole paisa) and `formatPrice(paisa)`;
- `Basket.js` — a default-exported `Basket` class with `add(name, pricePaisa, quantity)` and `totalPaisa()`;
- `index.js` — creates a basket, adds two items using `toPaisa` for the prices, and prints the formatted total.

<details>
<summary>Show the solution</summary>

```js
// money.js
export function toPaisa(rupees) {
  return Math.round(rupees * 100);
}

export function formatPrice(paisa) {
  return `Rs ${(paisa / 100).toFixed(2)}`;
}
```

```js
// Basket.js
export default class Basket {
  #items = [];

  add(name, pricePaisa, quantity = 1) {
    this.#items.push({ name, pricePaisa, quantity });
  }

  totalPaisa() {
    return this.#items.reduce((sum, item) => sum + item.pricePaisa * item.quantity, 0);
  }
}
```

```js
// index.js
import Basket from "./Basket.js";
import { toPaisa, formatPrice } from "./money.js";

const basket = new Basket();
basket.add("Cotton shirt", toPaisa(1299.5), 2);
basket.add("Cap", toPaisa(499));

console.log("Total:", formatPrice(basket.totalPaisa()));
```

**Output (`node index.js`):**

```text
Total: Rs 3098.00
```

Walkthrough:

- `money.js` has two named exports; `index.js` imports them by name, in curly braces.
- `Basket.js` has one default export; `index.js` imports it without braces.
- Both relative paths start with `./` and include `.js`.
- `toPaisa` uses `Math.round` because multiplying a decimal by 100 can produce tiny floating-point errors ({{ch:types-of-data}}): `1299.5 * 100` happens to be exact, but `0.29 * 100` is `28.999999999999996`.
- The basket's items are a private field, so only the class's methods can change them.

**Common wrong approach:** `import { Basket } from "./Basket.js"` — curly braces for a default export. Node.js reports that the module does not provide an export named `Basket`.

</details>

### Exercise 2 — Read the version ranges

**Objective:** practise semantic versioning.

**What to do:** for each range in `package.json`, say whether the given version would be allowed:

1. `"^4.18.2"` — would `4.21.0` be allowed? `5.0.0`?
2. `"~4.18.2"` — would `4.18.9` be allowed? `4.19.0`?
3. `"4.18.2"` — would `4.18.3` be allowed?
4. A package goes from `2.3.1` to `3.0.0`. What does that tell you?

<details>
<summary>Show the solution</summary>

1. `^4.18.2` allows any `4.x.y` from `4.18.2` up: **`4.21.0` yes**, **`5.0.0` no** (major version change).
2. `~4.18.2` allows only patch updates within `4.18`: **`4.18.9` yes**, **`4.19.0` no**.
3. `"4.18.2"` is exact: **`4.18.3` no**.
4. A **major** version change: the maintainers are signalling **breaking changes**. Read the release notes (often a "migration guide") before upgrading, update deliberately, and run your tests.

**Common wrong approach:** assuming `^` means "always the latest". It means "the latest **without** a new major version" — and, because of the lock file, even that only happens when you run an update.

</details>

### Exercise 3 — Use built-in modules

**Objective:** practise `node:fs` and `node:path`.

**What to build:** a script `save-order.js` that creates a folder called `orders` (if it does not exist), writes an order object to `orders/ORD-5521.json` as nicely indented JSON, then reads it back, parses it, and prints the number of items.

**Hints:** `mkdirSync(folder, { recursive: true })` creates a folder and does nothing if it already exists. Use `path.join` to build the file path, and `JSON.stringify(value, null, 2)` from {{ch:objects}}.

<details>
<summary>Show the solution</summary>

```js
// save-order.js
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

const order = {
  id: "ORD-5521",
  items: [
    { name: "Cotton shirt", pricePaisa: 129950, quantity: 2 },
    { name: "Cap", pricePaisa: 49900, quantity: 1 },
  ],
};

const folder = "orders";
mkdirSync(folder, { recursive: true });

const filePath = path.join(folder, `${order.id}.json`);
writeFileSync(filePath, JSON.stringify(order, null, 2), "utf8");

const loaded = JSON.parse(readFileSync(filePath, "utf8"));
console.log(`Saved ${filePath} with ${loaded.items.length} items`);
```

**Output (on Windows):**

```text
Saved orders\ORD-5521.json with 2 items
```

Walkthrough:

- `mkdirSync` with `recursive: true` creates the folder, and does not fail if it is already there — so the script can be run repeatedly.
- `path.join` builds the path with the correct separator for the operating system.
- `JSON.stringify(order, null, 2)` turns the object into readable JSON text; `writeFileSync` saves it as UTF-8.
- `readFileSync` reads the text back, and `JSON.parse` turns it into an object again — a full serialise-and-deserialise round trip.

Open `orders/ORD-5521.json` in VS Code to see the saved JSON.

**Common wrong approach:** building the path with a hard-coded backslash, `folder + "\\" + order.id + ".json"`. It works on Windows and breaks on Linux servers. `path.join` works everywhere.

</details>

### Exercise 4 — Fix the broken project (debugging)

**Objective:** practise diagnosing module errors.

**The scenario:** a colleague's project has these files and fails to start. `package.json` contains no `"type"` field.

```js
// utils.js
export const formatPrice = (paisa) => `Rs ${(paisa / 100).toFixed(2)}`;
```

```js
// app.js
import formatPrice from "./utils";
console.log(formatPrice(129950));
```

**What to do:** run `node app.js`, fix each error in turn, and explain each one.

<details>
<summary>Show the solution</summary>

**Error 1:**

```text
SyntaxError: Cannot use import statement outside a module
```

Without `"type": "module"`, `.js` files are CommonJS, where `import` is not allowed. **Fix:** add `"type": "module"` to `package.json`. (Recent Node.js versions may detect ES module syntax automatically and only print a warning, but relying on that is fragile; declare the type explicitly.)

**Error 2:**

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\utils' imported from ...\app.js
```

Relative ES module imports in Node.js need the file extension. **Fix:** `from "./utils.js"`.

**Error 3:**

```text
SyntaxError: The requested module './utils.js' does not provide an export named 'default'
```

`utils.js` has a **named** export, but `app.js` imports it as a **default**. **Fix:** use curly braces.

**Corrected `app.js`:**

```js
import { formatPrice } from "./utils.js";
console.log(formatPrice(129950));
```

**Output:**

```text
Rs 1299.50
```

**Lesson:** each error message named exactly one problem. Fixing them one at a time, reading each new message, was faster than guessing at all three together.

</details>

## Summary

Real programs are split into **modules** — files with their own scope that **export** what others may use and **import** what they need. **ES modules** use `export` (named exports and at most one `export default`) and `import` (curly braces for named, none for default, `as` to rename, `* as` for a namespace). In Node.js, enable them with `"type": "module"` or `.mjs`, and include `./` and the `.js` extension in relative imports. A module runs **once** and is shared by every importer — a singleton — so module-level variables are shared state. Imports are static, read-only **live bindings**. The older **CommonJS** system uses `require` and `module.exports` and remains common.

Node.js provides **built-in modules** such as `node:fs`, `node:path` and `node:os`. **npm** is the package manager, registry and tool for installing others' code. **`package.json`** describes the project: its type, scripts, engines, **dependencies** and **devDependencies**. `npm install` downloads packages into **`node_modules`** (never committed) and records exact versions in **`package-lock.json`** (always committed); `npm ci` installs exactly from the lock file. Packages pull in **transitive dependencies**.

Versions follow **semantic versioning**: MAJOR (breaking), MINOR (features), PATCH (fixes). `^` allows minor and patch updates; `~` only patch. **npm scripts** name project commands; **`npx`** runs package commands. Every dependency is a trade-off with real risks — including **supply-chain attacks** — so choose carefully, keep the lock file, update deliberately and audit regularly. Organise modules by responsibility and feature, export the minimum, and avoid **circular dependencies**.

## Key terms

- **Module** — A file of code with its own scope that exports values for other files and imports what it needs.
- **Export** — Making a value from a module available to other modules.
- **Import** — Bringing an exported value from another module into the current one.
- **ES modules (ESM)** — JavaScript's official module system, using `import` and `export`.
- **Named export** — A value exported under its own name, imported with curly braces.
- **Default export** — The single main value a module exports, imported without curly braces under any name.
- **Namespace import** — Importing all of a module's named exports as properties of one object, with `import * as name`.
- **Singleton** — Something that exists as exactly one shared instance; modules behave as singletons.
- **Live binding** — An import that reflects the current value of the exporting module's variable rather than a copy.
- **Tree shaking** — Removing unused exported code when building files, made possible by static imports.
- **Dynamic import** — Loading a module on demand at runtime with `import()`.
- **CommonJS (CJS)** — Node.js's original module system, using `require` and `module.exports`.
- **`require`** — The CommonJS function that loads a module and returns its exports.
- **`module.exports`** — The object a CommonJS module fills with the values it shares.
- **Built-in module** — A module that comes with Node.js, such as `node:fs` or `node:path`, imported with the `node:` prefix.
- **`node:fs`** — The built-in module for reading and writing files.
- **`node:path`** — The built-in module for building and working with file paths correctly on every operating system.
- **Package** — A folder of code described by a `package.json` file, which can be published and installed.
- **npm** — The Node.js package manager: a command-line tool, an online registry of packages, and the company that runs them.
- **Registry** — An online database of packages from which a package manager downloads them.
- **Package manager** — A tool that installs packages and tracks their versions.
- **`package.json`** — The file describing a Node.js project: its name, version, scripts and dependencies.
- **Dependency** — A package a project needs.
- **Direct dependency** — A package your project lists itself.
- **Transitive dependency** — A package needed by one of your dependencies, rather than by your project directly.
- **devDependency** — A package needed only during development, such as a linter or test tool.
- **`node_modules`** — The folder where installed packages are stored; it is never committed to Git.
- **`package-lock.json`** — The file recording the exact version and integrity hash of every installed package; it is always committed.
- **Integrity hash** — A fingerprint of a package's contents used to detect tampering.
- **`npm ci`** — A command that installs exactly what the lock file specifies, used in automated environments.
- **Semantic versioning (semver)** — A version-numbering scheme of MAJOR.MINOR.PATCH, where each part signals the kind of change.
- **Breaking change** — A change that can stop existing code that uses a package from working.
- **Caret range (`^`)** — A version range allowing minor and patch updates but not a new major version.
- **Tilde range (`~`)** — A version range allowing only patch updates.
- **npm script** — A named command defined in `package.json` and run with `npm run`.
- **`npx`** — A tool that runs a command from an npm package, installed locally or downloaded temporarily.
- **`.gitignore`** — A file listing files and folders that Git should not track.
- **Supply-chain attack** — An attack that compromises a trusted component, such as a package, to reach everyone who depends on it.
- **`npm audit`** — A command that checks installed packages against a database of known vulnerabilities.
- **Circular dependency** — Two or more modules that import each other, directly or indirectly.
- **Monorepo** — A single repository containing many packages or projects.
- **Software bill of materials (SBOM)** — A complete inventory of the components and dependencies that make up a piece of software.

## What comes next

You can now organise code into modules and build on other people's packages. One major idea remains before you have the full picture of how JavaScript programs really behave.

Every program so far has done its work instantly, line by line. But real programs constantly **wait**: for a file to be read, a database to answer, a payment provider to respond, a user to click. If JavaScript simply stopped and waited each time, a server could serve only one user at a time. In the next chapter, **Asynchronous JavaScript: Callbacks, Promises and async/await**, you will learn how JavaScript starts slow work, carries on with other things, and comes back when the work is done — the single most important idea for backend development in Node.js.
