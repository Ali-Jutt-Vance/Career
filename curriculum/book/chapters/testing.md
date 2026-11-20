# Testing Your Code

> [!GOALS]
> - Explain what an automated test is, why professional teams depend on them, and what goes wrong without them.
> - Write tests with Node's built-in test runner and with **Vitest**, using the arrange–act–assert shape and clear names.
> - Choose what to test: behaviours, boundaries, edge cases and failure paths — and what **not** to test.
> - Use **test doubles** correctly — dummies, stubs, spies, mocks and fakes — and know why fakes are usually better than mocks.
> - Control time, randomness and asynchronous work so tests are fast and **never flaky**.
> - Explain unit, integration and end-to-end tests, the **test pyramid** and its alternatives, and when each layer earns its cost.
> - Practise **test-driven development** (red, green, refactor), and know when it helps.
> - Use coverage, mutation testing and continuous integration honestly — as tools for finding gaps, not as targets.

## Why this matters

Every chapter in Part IV has quietly assumed something. When you renamed variables in {{ch:clean-code}}, extracted classes in {{ch:solid-principles}} or wrapped objects in decorators in {{ch:design-patterns}}, you were told to make sure **behaviour did not change**. How do you make sure?

You could check by hand. Open the app, add something to the cart, apply a coupon, check out, look at the total. That works once. But a real shop has hundreds of such paths: different coupons, customer types, cities, payment methods, failures. Checking all of them by hand after every change would take days. So in practice, people check a few, ship, and hope.

Then this happens. A developer changes how VAT is rounded to fix an invoice bug. It works. Two weeks later, finance discovers that bulk-order discounts have been calculated wrongly ever since, because the discount code depended on the old rounding. Nobody checked bulk orders — why would they? Thousands of orders must now be corrected by hand.

This kind of bug, where a change breaks something that used to work, is called a **regression**. Regressions are the main reason teams become **afraid of changing their own code**. And a team that is afraid to change code cannot refactor, cannot clean up, and slows down every month.

**Automated tests** are the answer. A test is a small program that checks that another program behaves correctly. Once written, it can run thousands of times, in seconds, after every change, on every developer's machine and on a server before any code is merged. The VAT change above would have been caught in seconds by a single test of the bulk discount.

Tests are also a requirement for professional work. Code without tests is a warning sign in a code review, a red flag in a take-home interview task, and a source of real risk to a business. And, as you will see, code that is **easy to test** is almost always code that is well designed — which is why this chapter comes right after the design chapters.

## The simple idea

Think of a car factory. After each car is assembled, it goes through an inspection line: brakes are tested on rollers, lights are switched on, doors are opened and closed, the engine is run. Each check is quick, precise and the same every time. If one fails, the car does not leave the factory — and the inspectors can say exactly **which** check failed.

Automated tests are your software's inspection line. Each test checks one specific thing — "a 10% coupon on a Rs 6,000 order gives Rs 5,400" — and gives a clear pass or fail. You run the whole line every time anything changes.

> [!ANALOGY]
> Tests are like a factory's inspection line: many quick, precise, repeatable checks, each of which can stop a faulty product and say exactly what is wrong.
>
> **Where the analogy breaks:** a car inspection line tests every **car**, the product. Software tests check the **design** — they run once per change, not once per customer. And an inspection line can only check what someone thought to check. Tests are the same: they find the problems you anticipated, and nothing else. Passing tests mean "no known problem", not "no problem".

## The proper definition and key words

An **automated test** is code that runs part of your program with known inputs and checks that the results match expectations, reporting pass or fail without human judgement.

The words you need:

- **System under test (SUT)** — the piece of code a test is checking: a function, a class, a module, or a whole application.
- **Assertion** — a statement in a test that must be true, such as "the total equals 540,000". If it is false, the test fails.
- **Test case** — one test, checking one behaviour.
- **Test suite** — a group of related tests, often one file, or all the tests in a project.
- **Test runner** — the program that finds your tests, runs them and reports the results. Examples: Vitest, Jest, and the runner built into Node.js.
- **Regression** — a bug in something that used to work, introduced by a later change.
- **Regression test** — a test that protects against a specific bug returning.
- **Flaky test** — a test that sometimes passes and sometimes fails with no code change.
- **Test double** — a stand-in for a real dependency during a test (you met this idea in {{ch:solid-principles}}).
- **Unit, integration and end-to-end tests** — tests of increasingly large parts of a system, explained later in this chapter.

## How it works inside

A test is ordinary code. At its heart is a very simple mechanism: **an assertion is a function that throws an error when something is wrong**, and a test runner is a loop that runs tests and catches those errors.

```ts
function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

function applyCoupon(totalPaisa: number, percent: number): number {
  return Math.round(totalPaisa * (1 - percent / 100));
}

const tests: [string, () => void][] = [
  ["10% off Rs 6,000", () => assertEqual(applyCoupon(600_000, 10), 540_000, "total")],
  ["0% changes nothing", () => assertEqual(applyCoupon(600_000, 0), 600_000, "total")],
  ["100% makes it free", () => assertEqual(applyCoupon(600_000, 100), 1, "total")], // wrong on purpose
];

let failed = 0;
for (const [name, run] of tests) {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed++;
    console.log(`FAIL ${name} — ${(error as Error).message}`);
  }
}
console.log(`${tests.length - failed} passed, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;
```

**Output:**

```text
PASS 10% off Rs 6,000
PASS 0% changes nothing
FAIL 100% makes it free — total: expected 1, got 0
2 passed, 1 failed
```

That is a complete, if tiny, test runner. Walk through it:

- `assertEqual` compares two values and **throws** if they differ, with a message that says what was expected and what actually happened.
- Each test is a name plus a function. The third test has a deliberately wrong expectation (a 100% coupon really does make the total 0), so you can see a failure.
- The loop runs each test inside `try`. If it throws, the test failed; otherwise it passed.
- `process.exitCode = 1` makes the program **exit with a non-zero code** when anything failed. That exit code is how automated systems — such as the continuous integration servers you will set up in {{ch:cicd}} — know to stop a broken change from being merged. An exit code of 0 means success; anything else means failure ({{ch:the-terminal}}).

Real test runners add a great deal: they find test files automatically, run them in parallel, show readable differences between expected and actual values, time each test, and support asynchronous code. But the core is exactly what you see here: **run code, throw on surprise, report, exit with a status.**

## Your first real tests

### Level 3 — Node's built-in test runner

Since version 20, Node.js has a stable test runner built in: `node:test`, together with the assertion library `node:assert`. It needs no installation, which makes it a good place to start.

Create a file `coupon.test.ts`:

```ts
// fragment
import { test } from "node:test";
import assert from "node:assert/strict";

function applyCoupon(totalPaisa: number, percent: number): number {
  if (percent < 0 || percent > 100) throw new RangeError("percent must be between 0 and 100");
  return Math.round(totalPaisa * (1 - percent / 100));
}

test("takes 10% off a Rs 6,000 order", () => {
  assert.equal(applyCoupon(600_000, 10), 540_000);
});

test("leaves the total unchanged for a 0% coupon", () => {
  assert.equal(applyCoupon(600_000, 0), 600_000);
});

test("rejects a coupon above 100%", () => {
  assert.throws(() => applyCoupon(600_000, 150), RangeError);
});
```

Run it — current Node versions can run TypeScript files directly by removing the types as they load them:

```bash
node --test coupon.test.ts
```

You will see something like this (the timings will differ on your machine):

```text
✔ takes 10% off a Rs 6,000 order (0.6ms)
✔ leaves the total unchanged for a 0% coupon (0.1ms)
✔ rejects a coupon above 100% (0.2ms)
ℹ tests 3
ℹ pass 3
ℹ fail 0
```

- `test(name, fn)` registers one test case. The name is a sentence describing the behaviour.
- `assert.equal(actual, expected)` from `node:assert/strict` uses strict equality (`===`). If they differ, it throws an `AssertionError` with a helpful message.
- `assert.throws(fn, RangeError)` passes only if calling `fn` throws an error of that type. You pass a **function** that calls `applyCoupon`, not the result of calling it — otherwise the error would be thrown before `assert.throws` could catch it.

The built-in runner is excellent for libraries and small projects. For applications, most teams use a fuller tool.

### Level 3 — Vitest

**Vitest** is a fast, modern test runner with first-class TypeScript and ES module support. Its API is almost identical to **Jest**, which was the dominant JavaScript test runner for years and is still the default in many existing projects, including NestJS. Everything you learn here applies to both.

Install it in a project:

```bash
npm install --save-dev vitest
```

Add a script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`vitest run` runs all tests once (what a CI server does). `vitest` on its own starts **watch mode**: it reruns the relevant tests every time you save a file, so you see results within a second of each change.

Vitest finds files named `*.test.ts` or `*.spec.ts`. Here is the code under test, in `src/pricing.ts`:

```ts
// fragment
export type Tier = "standard" | "premium";

export const DISCOUNT_THRESHOLD_PAISA = 500_000;

export function discountedTotalPaisa(totalPaisa: number, tier: Tier): number {
  if (!Number.isInteger(totalPaisa) || totalPaisa < 0) {
    throw new RangeError("totalPaisa must be a non-negative integer");
  }
  if (totalPaisa < DISCOUNT_THRESHOLD_PAISA) return totalPaisa;
  const rate = tier === "premium" ? 0.15 : 0.1;
  return Math.round(totalPaisa * (1 - rate));
}
```

And its tests, in `src/pricing.test.ts`:

```ts
// fragment
import { describe, it, expect } from "vitest";
import { discountedTotalPaisa, DISCOUNT_THRESHOLD_PAISA } from "./pricing.js";

describe("discountedTotalPaisa", () => {
  it("gives no discount just below the threshold", () => {
    expect(discountedTotalPaisa(DISCOUNT_THRESHOLD_PAISA - 1, "standard")).toBe(499_999);
  });

  it("gives 10% exactly at the threshold for standard customers", () => {
    expect(discountedTotalPaisa(DISCOUNT_THRESHOLD_PAISA, "standard")).toBe(450_000);
  });

  it("gives 15% at the threshold for premium customers", () => {
    expect(discountedTotalPaisa(DISCOUNT_THRESHOLD_PAISA, "premium")).toBe(425_000);
  });

  it("rounds to the nearest paisa", () => {
    expect(discountedTotalPaisa(500_005, "standard")).toBe(450_005);
  });

  it("handles a zero total", () => {
    expect(discountedTotalPaisa(0, "premium")).toBe(0);
  });

  it("rejects negative totals", () => {
    expect(() => discountedTotalPaisa(-1, "standard")).toThrow(RangeError);
  });

  it("rejects fractional paisa", () => {
    expect(() => discountedTotalPaisa(100.5, "standard")).toThrow("non-negative integer");
  });
});
```

Running `npm test` prints something like:

```text
 ✓ src/pricing.test.ts (7 tests) 4ms

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

Line by line:

- `import { describe, it, expect } from "vitest";` brings in the three core functions. (Jest provides the same three as globals.)
- `describe("discountedTotalPaisa", ...)` groups related tests under a heading. Groups can be nested.
- `it("gives no discount just below the threshold", ...)` is one test. `it` is simply another name for `test`; it reads naturally as a sentence: "*it* gives no discount just below the threshold".
- `expect(value).toBe(expected)` is the assertion. `expect` wraps a value and offers **matchers** — `toBe`, `toEqual`, `toThrow` and many more. When a matcher fails, the runner prints the expected and received values side by side.
- `expect(() => ...).toThrow(RangeError)` checks the error type; `.toThrow("non-negative integer")` checks that the error **message contains** that text.
- The test file imports `"./pricing.js"` with a `.js` extension even though the source is `pricing.ts`. That is how ES modules in TypeScript refer to files: by the name of the compiled output ({{ch:modules-and-npm}}).
- 500,005 × 0.9 = 450,004.5, which `Math.round` rounds to 450,005 — the rounding test checks exactly this.

### The most common matchers

| Matcher | Checks | Example |
|---|---|---|
| `toBe(x)` | Strict equality (`Object.is`) — use for primitives | `expect(total).toBe(450_000)` |
| `toEqual(obj)` | Deep equality of contents — use for objects and arrays | `expect(order).toEqual({ id: "A", qty: 2 })` |
| `toStrictEqual(obj)` | Like `toEqual`, but also checks `undefined` properties and classes | — |
| `toBeCloseTo(n, digits)` | Floating-point numbers, within a tolerance | `expect(0.1 + 0.2).toBeCloseTo(0.3)` |
| `toContain(item)` | An array contains an item, or a string contains text | `expect(tags).toContain("vip")` |
| `toHaveLength(n)` | Length of an array or string | `expect(items).toHaveLength(3)` |
| `toThrow(...)` | A function throws (optionally a type or message) | see above |
| `toBeNull()`, `toBeUndefined()`, `toBeDefined()` | Exactly those values | — |
| `.not` | Inverts any matcher | `expect(list).not.toContain("banned")` |

The most frequent beginner confusion is `toBe` versus `toEqual`. `toBe` asks "is this the **same** value?" — for objects, the same object in memory ({{ch:objects}}). `toEqual` asks "do they have the **same contents**?". For an object freshly built by your code, `toBe` will always fail; use `toEqual`.

### Testing asynchronous code

Most real code is asynchronous ({{ch:asynchronous-javascript}}). Make the test function `async` and `await` the result:

```ts
// fragment
import { it, expect } from "vitest";

async function fetchStock(sku: string): Promise<number> {
  if (sku === "") throw new Error("sku is required");
  return 7;
}

it("returns the stock level", async () => {
  expect(await fetchStock("PEN")).toBe(7);
});

it("rejects an empty sku", async () => {
  await expect(fetchStock("")).rejects.toThrow("sku is required");
});
```

- An `async` test returns a promise; the runner waits for it before deciding pass or fail.
- `expect(promise).rejects.toThrow(...)` checks that a promise **rejects**. The `await` in front of `expect` is essential: without it, the test finishes before the promise settles, and a failure may be missed entirely — or reported against a different test.

> [!WARNING]
> A forgotten `await` is one of the most common testing bugs. The test passes — not because the code works, but because the check never ran in time. Enable the ESLint rule `@typescript-eslint/no-floating-promises`, which flags promises that are neither awaited nor handled.

## What makes a good test

### Arrange, act, assert

Almost every good test has three parts, in this order:

```ts
// fragment
it("adds the delivery fee for orders under the free-delivery threshold", () => {
  // Arrange: set up the situation
  const cart = makeCart({ items: [{ sku: "PEN", pricePaisa: 15_000, qty: 2 }] });

  // Act: do the one thing being tested
  const total = checkoutTotalPaisa(cart, "Lahore");

  // Assert: state what must now be true
  expect(total).toBe(30_000 + 25_000);
});
```

- **Arrange** builds the world the test needs.
- **Act** performs exactly **one** action — the behaviour under test.
- **Assert** checks the outcome.

Some people call this **given–when–then**: *given* a cart under the threshold, *when* I check out, *then* a delivery fee is added. Same idea.

### Name tests as claims

A test's name should state the behaviour it proves, as a sentence. When it fails, the name alone should tell you what is broken.

- Bad: `it("works")`, `it("test 3")`, `it("discount")`.
- Good: `it("gives 15% at the threshold for premium customers")`, `it("rejects an order when stock is insufficient")`.

If you cannot write the name before writing the test, you do not yet know what you are testing.

### One behaviour per test

A test that checks five unrelated things fails on the first problem and hides the other four. If a name needs "and" to describe two different behaviours, split it. (Several assertions about **one** outcome — the total, the item count and the status of one created order — are fine.)

### Test behaviour, not implementation

A test should describe **what** the code does, as seen from outside, not **how** it does it inside. Compare:

```ts
// fragment
// Tests implementation: breaks if internals change, even when behaviour is correct
expect(cart["#items"].length).toBe(2);
expect(priceCalculator.applyTierDiscount).toHaveBeenCalledTimes(1);

// Tests behaviour: survives refactoring
expect(cart.count).toBe(2);
expect(checkoutTotalPaisa(cart, "Lahore")).toBe(55_000);
```

Tests tied to implementation details break whenever you refactor — even when nothing is actually wrong. Then the team learns to "fix the tests" after every change, and the tests stop protecting anything. Good tests let you **change the inside freely** while guarding the outside.

### Choose inputs that find bugs

The "happy path" — normal input, everything works — is the least likely place for a bug. Bugs live at the edges. For every function, think about:

- **Boundaries.** If something changes at 5,000, test 4,999, 5,000 and 5,001. **Off-by-one** errors (`<` instead of `<=`) are among the most common real bugs, and boundary tests catch them.
- **Empty and minimal inputs.** An empty cart, an empty string, zero, a single item.
- **Invalid inputs.** Negative numbers, `NaN`, missing fields, wrong types from outside (JSON from a request is never guaranteed to match your types).
- **Large inputs.** Very long strings, huge quantities, values near limits.
- **Each branch.** Every `if` produces at least two behaviours. Each deserves a test.
- **Failure paths.** What happens when the database is down, the payment is declined or the file is missing? These paths run rarely, so bugs in them survive longest.

### The FIRST properties

A well-known summary says good unit tests are **FIRST**:

- **Fast** — milliseconds each, so you run them constantly.
- **Isolated** — no test depends on another, or on the order they run in.
- **Repeatable** — the same result every time, on any machine, at any time of day.
- **Self-validating** — pass or fail automatically; nobody needs to read output and judge.
- **Timely** — written close to when the code is written, not months later.

## What not to test

Every test is code that must be read, maintained and kept fast. A test that protects nothing is pure cost. Do **not** write tests for:

- **The language or standard library.** You do not need to check that `Array.prototype.map` works.
- **Third-party libraries and frameworks.** They have their own tests. Test **your use** of them — usually in integration tests — not the libraries themselves.
- **Trivial code with no logic** — a getter that returns a field, a function that only passes arguments through.
- **Private details.** Test private helpers through the public behaviour that uses them. If a private function is so complex that it needs its own tests, it probably deserves to be a separate, public module.

A suite of 40 tests that each protect something real is worth more than 400 tests that mostly check trivia, because people trust it and it runs quickly.

## Test doubles

### Level 2 — Why we need them

Much code depends on things that are slow, unpredictable or have side effects: databases, payment providers, email services, the clock. A unit test of `OrderService` should not charge a real card or send a real email. You saw the solution in {{ch:solid-principles}}: depend on interfaces, inject dependencies, and in tests, inject **test doubles** — stand-ins named after the "stunt doubles" who replace actors in dangerous film scenes.

### Level 2 — Five kinds of double

People often say "mock" for all of them, but they are different tools:

| Kind | What it is | Typical use |
|---|---|---|
| **Dummy** | Passed only to satisfy a parameter; never actually used | A logger the tested path never touches |
| **Stub** | Returns fixed, canned answers | `findCustomer` always returns the same customer |
| **Spy** | Records how it was called (arguments, count), possibly wrapping a real implementation | Checking an email was sent once, to the right address |
| **Mock** | A double with **built-in expectations** about how it must be called; the test fails if the calls differ | Strict interaction checks |
| **Fake** | A real, working but simplified implementation | An in-memory repository; an in-memory email outbox |

### Level 3 — Fakes: the workhorse

A fake behaves like the real thing, just without the slow or dangerous parts. Here is a complete example — a service, two fakes and the tests. First, the code under test, `src/orders.ts`:

```ts
// fragment
export type Order = { id: string; customerId: string; totalPaisa: number; status: "placed" | "rejected" };

export interface OrderRepository {
  save(order: Order): Promise<void>;
  totalOpenForCustomer(customerId: string): Promise<number>;
}

export interface Mailer {
  send(to: string, subject: string): Promise<void>;
}

export class CreditLimitExceeded extends Error {}

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly mailer: Mailer,
    private readonly creditLimitPaisa: number,
    private readonly newId: () => string,
  ) {}

  async place(customerId: string, email: string, totalPaisa: number): Promise<Order> {
    const open = await this.orders.totalOpenForCustomer(customerId);
    if (open + totalPaisa > this.creditLimitPaisa) {
      throw new CreditLimitExceeded(`Credit limit exceeded for ${customerId}`);
    }
    const order: Order = { id: this.newId(), customerId, totalPaisa, status: "placed" };
    await this.orders.save(order);
    await this.mailer.send(email, `Order ${order.id} confirmed`);
    return order;
  }
}
```

And the tests, `src/orders.test.ts`:

```ts
// fragment
import { describe, it, expect, beforeEach } from "vitest";
import { OrderService, CreditLimitExceeded, type Order, type OrderRepository, type Mailer } from "./orders.js";

class InMemoryOrders implements OrderRepository {
  readonly saved: Order[] = [];
  async save(order: Order): Promise<void> {
    this.saved.push(order);
  }
  async totalOpenForCustomer(customerId: string): Promise<number> {
    return this.saved.filter((o) => o.customerId === customerId).reduce((sum, o) => sum + o.totalPaisa, 0);
  }
}

class Outbox implements Mailer {
  readonly sent: { to: string; subject: string }[] = [];
  async send(to: string, subject: string): Promise<void> {
    this.sent.push({ to, subject });
  }
}

describe("OrderService.place", () => {
  let orders: InMemoryOrders;
  let outbox: Outbox;
  let service: OrderService;

  beforeEach(() => {
    orders = new InMemoryOrders();
    outbox = new Outbox();
    let next = 1;
    service = new OrderService(orders, outbox, 1_000_000, () => `ORD-${next++}`);
  });

  it("saves the order and emails a confirmation", async () => {
    const order = await service.place("C1", "hira@example.com", 300_000);

    expect(orders.saved).toEqual([order]);
    expect(outbox.sent).toEqual([{ to: "hira@example.com", subject: "Order ORD-1 confirmed" }]);
  });

  it("rejects an order that would exceed the credit limit", async () => {
    await service.place("C1", "hira@example.com", 800_000);

    await expect(service.place("C1", "hira@example.com", 300_000)).rejects.toThrow(CreditLimitExceeded);
    expect(orders.saved).toHaveLength(1);
    expect(outbox.sent).toHaveLength(1);
  });

  it("counts credit separately for each customer", async () => {
    await service.place("C1", "a@example.com", 900_000);
    await expect(service.place("C2", "b@example.com", 900_000)).resolves.toMatchObject({ customerId: "C2" });
  });
});
```

Walk through the important decisions:

- **The service receives everything it depends on** — repository, mailer, credit limit, even the id generator. That is what makes it testable at all. If it created its own database connection, these tests would be impossible without a database.
- **`newId` is injected** so ids are predictable (`ORD-1`), letting the test assert on the exact email subject. Random ids would make exact assertions impossible.
- **`beforeEach`** runs before every test and creates **fresh** fakes and a fresh service. No test can see data left behind by another. Shared state between tests is the number-one cause of tests that pass alone and fail together.
- **The tests assert on outcomes**: what was saved and what was sent. They do not check *which* repository methods were called or in what order. You could rewrite `place` completely — cache the credit total, batch the email — and these tests would still pass as long as the behaviour is right.
- The second test checks that a rejected order caused **no side effects**: still only one order saved, one email sent.
- `toMatchObject` checks that an object **contains** the given properties, ignoring others.
- `import { ..., type Order, ... }` marks some imports as **type-only**; they disappear when compiled.

### Level 3 — Spies and mocks with `vi.fn()`

Sometimes the **interaction itself** is the behaviour you care about: "when a payment fails, alert the on-call channel exactly once". For that, a **spy** is the right tool. Vitest provides `vi.fn()` (Jest's equivalent is `jest.fn()`), which creates a function that records every call:

```ts
// fragment
import { it, expect, vi } from "vitest";

async function chargeOrAlert(charge: () => Promise<boolean>, alert: (msg: string) => void, orderId: string) {
  const ok = await charge();
  if (!ok) alert(`Payment failed for ${orderId}`);
  return ok;
}

it("alerts once when the payment is declined", async () => {
  const alert = vi.fn();
  const declined = vi.fn().mockResolvedValue(false);

  await chargeOrAlert(declined, alert, "ORD-9");

  expect(alert).toHaveBeenCalledTimes(1);
  expect(alert).toHaveBeenCalledWith("Payment failed for ORD-9");
});

it("does not alert when the payment succeeds", async () => {
  const alert = vi.fn();
  await chargeOrAlert(vi.fn().mockResolvedValue(true), alert, "ORD-10");
  expect(alert).not.toHaveBeenCalled();
});
```

- `vi.fn()` creates a spy function that does nothing but record its calls.
- `vi.fn().mockResolvedValue(false)` creates a **stub** that returns a promise resolving to `false` — a declined payment.
- `toHaveBeenCalledTimes(1)` and `toHaveBeenCalledWith(...)` assert on the recorded calls.

### Level 5 — Fakes or mocks?

There are two schools of thought, sometimes called **classicist** (prefer real objects and fakes, assert on state) and **mockist** (isolate every unit with mocks, assert on interactions). Most experienced engineers today lean towards this practical rule:

- **Prefer fakes** and assert on **outcomes**. Tests survive refactoring, and fakes are reusable across many tests.
- **Use spies or mocks when the interaction is the behaviour** — an alert sent, an event published, a call that must **not** happen.
- **Avoid mocking what you do not own.** Mocking a third-party SDK's methods couples your tests to that SDK's exact API, and your mock may not behave like the real thing. Instead, wrap the SDK in your own adapter ({{ch:design-patterns}}), fake the adapter in unit tests, and test the real adapter in integration tests.

Vitest and Jest can also replace whole modules (`vi.mock("./mailer.js")`). This is powerful but makes tests harder to follow and is a sign the code under test does not receive its dependencies. Prefer dependency injection; use module mocking mainly for legacy code you cannot yet restructure.

## Controlling time, randomness and the environment

A test that depends on the current time, random numbers, the network or the order other tests ran in will eventually produce a different result for no visible reason. That is a **flaky test**, and it is poison: once a team learns that failures are sometimes "just flakiness", they start re-running failures instead of investigating them — and real bugs slip through.

### Time

You already know the cleanest solution from {{ch:functional-programming}} and {{ch:solid-principles}}: **pass time in**. Accept a `now` parameter or inject a clock, and tests can set any moment they like.

When you cannot change the code, test runners can **fake the timers**:

```ts
// fragment
import { it, expect, vi, beforeEach, afterEach } from "vitest";

function isTokenExpired(issuedAtMs: number, lifetimeMs: number): boolean {
  return Date.now() - issuedAtMs >= lifetimeMs;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-01T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

it("expires a 15-minute token after exactly 15 minutes", () => {
  const issuedAt = Date.now();
  vi.advanceTimersByTime(15 * 60 * 1000 - 1);
  expect(isTokenExpired(issuedAt, 15 * 60 * 1000)).toBe(false);
  vi.advanceTimersByTime(1);
  expect(isTokenExpired(issuedAt, 15 * 60 * 1000)).toBe(true);
});
```

- `vi.useFakeTimers()` replaces `Date`, `setTimeout`, `setInterval` and related functions with controllable versions.
- `vi.setSystemTime(...)` sets "now" to a fixed moment.
- `vi.advanceTimersByTime(ms)` moves the fake clock forward instantly — fifteen minutes pass in a microsecond — and runs any timers that would have fired.
- `afterEach` **restores real timers**. Forgetting this leaks fake time into later tests: a classic source of mysterious failures.
- The test checks **both sides of the boundary**: one millisecond before expiry, and exactly at expiry.

### Randomness

Inject the random source (or an id generator, as `OrderService` did), or use a fixed **seed** for libraries that support one. Never assert on values that are random.

### The environment

Tests should not depend on environment variables, the current working directory, the machine's time zone or locale, unless they set them explicitly. A test that formats a date correctly on your laptop in Pakistan Standard Time may fail on a CI server running in UTC. Either set the time zone for the test run (for example, the `TZ` environment variable), or write code that takes the time zone explicitly.

## The layers of testing

### Level 2 — Unit, integration and end-to-end

Tests are commonly grouped by **how much of the system** they exercise:

| Layer | Exercises | Speed | Finds | Misses |
|---|---|---|---|---|
| **Unit** | One function, class or small module; dependencies replaced by doubles | Milliseconds | Logic errors, edge cases, branches | Problems in how pieces connect |
| **Integration** | Your code together with a real external piece — usually a real database, sometimes a real HTTP framework | Tens to hundreds of ms | Wrong SQL, broken mappings, constraint violations, transaction bugs, configuration mistakes | Full user journeys |
| **End-to-end (E2E)** | The whole running application, through its real interface (HTTP API or browser) | Seconds | Wiring, routing, authentication, middleware order, serialisation | Specific branches deep in the logic |

There is no universal agreement on exact boundaries — some teams call a test of a service plus in-memory fakes a "unit" test, others a "component" test. What matters is that your team agrees on the names and each layer has a clear purpose.

### Level 4 — Integration tests against a real database

Fakes prove your **logic**. They prove nothing about your SQL, indexes, constraints or transactions. For those, you need the real database. A typical integration test:

```ts
// fragment
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Pool } from "pg";
import { PostgresOrderRepository } from "./postgres-order-repository.js";

const url = process.env.TEST_DATABASE_URL;
if (!url || !url.includes("test")) {
  throw new Error("Refusing to run: TEST_DATABASE_URL must point to a test database");
}

describe("PostgresOrderRepository", () => {
  const pool = new Pool({ connectionString: url });
  const repo = new PostgresOrderRepository(pool);

  beforeEach(async () => {
    await pool.query("TRUNCATE orders, customers RESTART IDENTITY CASCADE");
    await pool.query("INSERT INTO customers (id, name) VALUES ('C1', 'Test Customer')");
  });

  afterAll(async () => {
    await pool.end();
  });

  it("saves an order and reads it back", async () => {
    await repo.save({ id: "ORD-1", customerId: "C1", totalPaisa: 250_000, status: "placed" });
    expect(await repo.totalOpenForCustomer("C1")).toBe(250_000);
  });

  it("refuses an order for a customer that does not exist", async () => {
    await expect(
      repo.save({ id: "ORD-2", customerId: "NOPE", totalPaisa: 1, status: "placed" }),
    ).rejects.toThrow(/foreign key/i);
  });
});
```

The decisions worth understanding:

- **A safety guard at the top.** The test empties tables with `TRUNCATE`. Pointed at a production database by mistake, that would be a disaster. The guard refuses to run unless the connection string clearly names a test database. A few lines that will one day save you.
- **Clean state before each test.** `TRUNCATE ... RESTART IDENTITY CASCADE` empties the tables and resets id counters, so each test starts from the same known state. A faster alternative for large suites is to run each test inside a database **transaction** and roll it back at the end — but that cannot be used to test code that manages transactions itself.
- **The constraint test** proves that the database really rejects bad data. Without it, you only *hope* your foreign key exists. You will learn about constraints in {{ch:database-design}}.
- **Run the real schema.** The test database should be built by running your real **migrations** (scripts that create and change the schema — {{ch:orms}}), so tests also catch broken migrations.
- **Run database tests one file at a time** (Vitest's `--no-file-parallelism`, Jest's `--runInBand`), or give each parallel worker its own database. Parallel tests sharing one database interfere with each other and fail randomly.

Where does the test database come from? Common options: a local database you run yourself; a database started with Docker Compose before the tests ({{ch:docker-compose}}); or **Testcontainers**, a library that starts a real PostgreSQL (or Redis, or anything) in a Docker container from inside the test run and removes it afterwards — which avoids "it works on my machine" problems.

### Level 4 — End-to-end API tests

An end-to-end test exercises the application the way a client does: over HTTP, with real routing, validation, authentication and error handling. With an Express app ({{ch:express}}), the library **Supertest** sends requests to the app in memory, without opening a real network port:

```ts
// fragment
import { it, expect } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";

const app = buildApp({ databaseUrl: process.env.TEST_DATABASE_URL! });

it("rejects requests without a token", async () => {
  await request(app).get("/orders").expect(401);
});

it("creates an order and returns it", async () => {
  const token = await loginAsTestUser(app);
  const created = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${token}`)
    .send({ items: [{ sku: "PEN", qty: 2 }] })
    .expect(201);

  const fetched = await request(app).get(`/orders/${created.body.id}`).set("Authorization", `Bearer ${token}`).expect(200);
  expect(fetched.body.items).toHaveLength(1);
});

it("rejects unknown fields with 400", async () => {
  const token = await loginAsTestUser(app);
  await request(app).post("/orders").set("Authorization", `Bearer ${token}`).send({ items: [], isAdmin: true }).expect(400);
});
```

- `buildApp` is a function that creates the application **without starting a server**. Structuring your app this way — creating it in one function, calling `listen` only in the real entry point — is what makes it testable.
- These tests cover **failure paths** too: no token gives 401; an unexpected field gives 400. The last test verifies a security property — that clients cannot sneak extra fields such as `isAdmin` into a request ({{ch:validation}}).
- `loginAsTestUser` is a test helper (not shown) that registers and logs in a user and returns a token.

> [!WARNING]
> An end-to-end test is only as real as its setup. If your production entry point adds global validation, error handlers or security middleware, the test application must have **exactly the same** configuration — ideally built by the same `buildApp` function. A common mistake is a test app that silently lacks validation: every test passes, and production behaves differently.

**Browser end-to-end tests** drive a real browser through the user interface: click "Add to cart", fill in the address, press "Pay", check the confirmation page. **Playwright** is the most widely used tool for this today; Cypress is another. They catch problems nothing else does — a button that is hidden behind another element, a broken page after a CSS change — but they are the slowest and most fragile tests, so teams keep them for the few most important user journeys.

### Level 5 — The test pyramid, and alternatives

The **test pyramid**, popularised by Mike Cohn, recommends many unit tests, fewer integration tests and very few end-to-end tests:

```text
              /\
             /E2E\          few: slow, broad, fragile
            /------\
           /integr- \       some
          /  ation   \
         /------------\
        /     unit     \    many: fast, narrow, stable
       /________________\
```

The reasoning: lower tests are faster, cheaper and pinpoint failures precisely; higher tests are slower and more fragile but prove the parts work together.

This is a sensible default, not a law. Other shapes are argued for in practice:

- The **testing trophy** (Kent C. Dodds) puts **integration** tests at the widest point, arguing they give the most confidence per test for typical web applications, with static checks (TypeScript, linting) as the foundation.
- For a back-end service whose main job is moving data between HTTP and a database — which describes much real work — most risk lives in queries and wiring, not in clever algorithms. A **diamond** shape, with a thick middle of integration tests, often fits better.

A senior answer in an interview sounds like: "I aim for fast unit tests on the logic that has real branches, integration tests against a real database for the data layer, and a small number of end-to-end tests for the critical journeys — and I adjust the balance to where this particular system's risk is."

## Test data: factories and fixtures

Building complete objects by hand in every test is noisy, and it hides what the test is actually about. A **test data factory** creates a valid object with sensible defaults and lets each test override only the fields it cares about:

```ts
type Customer = { id: string; name: string; tier: "standard" | "premium"; city: string; isVerified: boolean };

let counter = 0;
function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  counter++;
  return { id: `C${counter}`, name: `Customer ${counter}`, tier: "standard", city: "Lahore", isVerified: true, ...overrides };
}

const premium = makeCustomer({ tier: "premium" });
const unverified = makeCustomer({ isVerified: false });
console.log(premium);
console.log(unverified.id, unverified.isVerified, unverified.tier);
```

**Output:**

```text
{
  id: 'C1',
  name: 'Customer 1',
  tier: 'premium',
  city: 'Lahore',
  isVerified: true
}
C2 false standard
```

- `Partial<Customer>` ({{ch:typescript-advanced}}) means "any subset of `Customer`'s fields".
- The spread `...overrides` comes **last**, so the test's values replace the defaults.
- A test that calls `makeCustomer({ tier: "premium" })` tells the reader, clearly: *the tier is what matters here; everything else is just valid filler.*

A **fixture** is any fixed state a test relies on — a set of rows inserted before the test, a sample file, a configured object. Keep fixtures small and close to the tests that use them. Huge shared fixture files ("the test database with 2,000 rows") become impossible to change, because nobody knows which test depends on which row.

## Test-driven development

### Level 2 — The cycle

**Test-driven development (TDD)**, made popular by Kent Beck in the early 2000s, reverses the usual order: you write the test **first**, then the code. It works in a short loop:

```text
     ┌──────────────────────────────────────────────┐
     │  RED      write a small test that fails      │
     │    │                                         │
     │    ▼                                         │
     │  GREEN    write the simplest code that       │
     │    │      makes it pass                      │
     │    ▼                                         │
     │  REFACTOR clean up code and tests, keeping   │
     │    │      all tests green                    │
     │    └──────────── back to RED ────────────────┘
```

Each loop takes minutes. The failing test in the **red** step proves that the test can actually fail — a test that has never failed may not be testing anything. The **green** step stops you writing code nobody needs. The **refactor** step is safe, because the tests protect you.

### Level 3 — A worked example

Suppose the requirement is: *split a restaurant bill among friends; amounts are in paisa; nobody should pay a fraction of a paisa; the parts must add up exactly to the total; any leftover paisa go to the first people.*

**Red.** Start with the simplest case:

```ts
// fragment
it("splits evenly when the total divides exactly", () => {
  expect(splitBill(90_000, 3)).toEqual([30_000, 30_000, 30_000]);
});
```

It fails — `splitBill` does not exist yet.

**Green.** Write the simplest code that passes:

```ts
// fragment
export function splitBill(totalPaisa: number, people: number): number[] {
  return Array(people).fill(totalPaisa / people);
}
```

**Red again.** Add the next behaviour:

```ts
// fragment
it("gives leftover paisa to the first people", () => {
  expect(splitBill(100_000, 3)).toEqual([33_334, 33_333, 33_333]);
});
```

It fails: the code returns `33333.333…` three times.

**Green.** Make it pass:

```ts
// fragment
export function splitBill(totalPaisa: number, people: number): number[] {
  const base = Math.floor(totalPaisa / people);
  const leftover = totalPaisa - base * people;
  return Array.from({ length: people }, (_, i) => (i < leftover ? base + 1 : base));
}
```

**Red again** — now the edge cases the requirement implies:

```ts
// fragment
it("rejects zero people", () => {
  expect(() => splitBill(1_000, 0)).toThrow(RangeError);
});

it("always adds up to the exact total", () => {
  for (const [total, people] of [[1, 3], [99_999, 7], [500_000, 12]] as const) {
    const parts = splitBill(total, people);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
  }
});
```

The first fails (with zero people, the current code divides by zero and returns an empty list). Add a guard, see everything turn green, then **refactor** — rename, simplify — with the tests protecting you. Here is the finished function, running the same checks:

```ts
function splitBill(totalPaisa: number, people: number): number[] {
  if (!Number.isInteger(people) || people < 1) throw new RangeError("people must be a positive integer");
  if (!Number.isInteger(totalPaisa) || totalPaisa < 0) throw new RangeError("totalPaisa must be a non-negative integer");
  const base = Math.floor(totalPaisa / people);
  const leftover = totalPaisa - base * people;
  return Array.from({ length: people }, (_, i) => (i < leftover ? base + 1 : base));
}

console.log(splitBill(90_000, 3));
console.log(splitBill(100_000, 3));
for (const [total, people] of [[1, 3], [99_999, 7], [500_000, 12]] as const) {
  const parts = splitBill(total, people);
  console.log(total, people, parts.reduce((a, b) => a + b, 0) === total);
}
try {
  splitBill(1_000, 0);
} catch (error) {
  console.log((error as Error).name);
}
```

**Output:**

```text
[ 30000, 30000, 30000 ]
[ 33334, 33333, 33333 ]
1 3 true
99999 7 true
500000 12 true
RangeError
```

Notice how the tests drove the design: the "adds up exactly" test forced integer arithmetic; the "zero people" test forced input validation. The final code handles exactly the cases the requirement needed — no more, no less.

### Level 5 — When TDD helps, and when it does not

TDD is especially valuable for **business logic with clear rules** (pricing, permissions, calculations, parsers) and for **bug fixes**. It also improves design: code written test-first is naturally small, decoupled and easy to call, because the test was its first user.

It is less useful when you are **exploring** — trying out a new library, sketching a user interface, or building a prototype whose shape you do not know yet. Many engineers explore first, throw the experiment away, and then build the real thing test-first, or add tests immediately after.

One TDD habit is valuable for **everyone**, always: **when you fix a bug, first write a test that reproduces it.** Watch it fail, fix the bug, watch it pass. The test proves the fix works and guarantees the bug never returns — and it costs almost nothing, because you had to reproduce the bug anyway.

## Coverage and mutation testing

### Coverage

**Code coverage** tools measure which lines, branches and functions of your code ran during the tests. Vitest reports it with `vitest run --coverage`:

```text
 File          | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
 pricing.ts    |   100   |   100    |   100   |   100   |
 orders.ts     |   85.7  |   75     |   100   |   85.7  | 31-33
```

Coverage is useful in exactly one way: **finding untested code.** "Lines 31–33 of `orders.ts` never ran" is valuable information: perhaps that is an error-handling branch nobody tested.

Coverage is **not** a measure of test quality. A test that calls a function and asserts nothing gives that function full coverage. Teams that set a coverage percentage as a target ("we must reach 90%") tend to get tests written to raise the number — tests that execute code without checking anything. Use coverage to **look for gaps**, then decide case by case whether each gap matters.

### Mutation testing

**Mutation testing** measures whether your tests would actually **notice** a bug. A tool (Stryker is the common one for JavaScript and TypeScript) makes small changes — **mutants** — to your code, such as turning `<` into `<=`, `+` into `-`, or deleting a line, and runs your tests against each mutant. If the tests still pass, the mutant "survived": your tests do not really check that behaviour.

Mutation testing is slow, so it is usually run occasionally on the most important business logic, not on every change. But it gives an honest answer to the question coverage cannot: *are my tests checking anything?*

## Other kinds of testing you will meet

- **Snapshot tests** save the output of something (a rendered component, a large JSON response) to a file, and fail when the output changes. They are quick to write, but easy to approve blindly ("update snapshots") without reading. Use them for output that is genuinely meant to stay stable, and keep snapshots small.
- **Property-based tests** check that a **property** holds for hundreds of automatically generated inputs, instead of a few hand-picked examples — for instance, "for any total and any number of people, `splitBill`'s parts add up to the total". The library **fast-check** does this in TypeScript, and when it finds a failing input, it **shrinks** it to the smallest example that still fails.
- **Contract tests** check that two systems agree on the shape of the messages between them — for example, that an API still returns what its clients expect ({{ch:solid-principles}}, {{ch:api-versioning}}).
- **Load and performance tests** check whether the system stays fast under heavy traffic, using tools such as k6 ({{ch:performance-engineering}}). They answer a different question from correctness tests.
- **Security tests** check authorisation rules, input handling and known vulnerability patterns ({{ch:application-security}}).

## Testing asynchronous and background work

Work that happens later — a queued job, an event handler — is a common source of flaky tests, because the test may check the result before the work finishes.

Split it into two halves and test each directly:

1. **The producer:** assert that handling the request **enqueued** a job with the right data. Here a spy is right, because enqueueing *is* the behaviour.
2. **The consumer:** call the job handler **directly**, as a normal async function, with a payload, and assert on the outcome.

Never write tests that wait a fixed time ("sleep 2 seconds, then check") and hope the work is done. They are slow when the work is fast and flaky when the machine is busy. If you must test the whole path, wait for a specific completion signal, with a timeout.

And because job queues usually deliver a message **at least once** — sometimes twice — test that handlers are **idempotent** ({{ch:functional-programming}}): run the handler twice with the same payload and check that nothing happened twice (no double charge, no duplicate email). You will see why this matters in {{ch:queues}}.

## Tests in continuous integration

Tests protect you only if they run. Professional teams run them automatically:

- **On every pull request**, a continuous integration (CI) server installs dependencies, type-checks, lints and runs the tests. A failing check **blocks** the merge ({{ch:cicd}}, {{ch:github-actions}}).
- **Fast tests run first** so developers get feedback in a minute or two; slower integration and end-to-end suites run after, or in parallel.
- **Flaky tests are treated as failures.** They are fixed promptly, or moved out of the main suite into quarantine with an owner and a ticket — never simply ignored, because a suite people do not trust is a suite people stop reading.
- **The whole pipeline is kept fast.** If it takes an hour, people stop waiting for it and start merging around it.

A useful habit is to provide separate scripts per layer so developers can run the fast unit tests constantly without starting a database:

```json
{
  "scripts": {
    "test": "vitest run --project unit",
    "test:integration": "vitest run --project integration --no-file-parallelism",
    "test:e2e": "vitest run --project e2e --no-file-parallelism",
    "test:watch": "vitest --project unit"
  }
}
```

(Vitest "projects" let one configuration file define separate groups of tests, for example by file name pattern: `*.test.ts`, `*.int.test.ts` and `*.e2e.test.ts`.)

## From beginner to enterprise

**Level 3 — your first tests.** Pure functions tested with Vitest or `node:test`. Boundaries, edge cases, failure paths. Names that state claims.

**Level 4 — an application.** Services tested with fakes injected through constructors. Repositories tested against a real database. A handful of API tests with Supertest. Test data factories. A bug fix always begins with a failing test.

**Level 5 — a professional team.** Tests run on every pull request and block merges. A written testing policy says what each layer covers and what is deliberately not tested. Flaky tests are fixed immediately. Coverage is reviewed for gaps; mutation testing is run on critical logic.

**Level 6 — large organisations.** Thousands of tests run in parallel across many machines; test selection runs only the tests affected by a change. Contract tests protect agreements between independently deployed services. Production itself is part of the safety net: changes are released gradually (feature flags, canary releases — {{ch:cicd}}) and monitored ({{ch:observability-and-incidents}}), because no test suite can anticipate everything that happens with real users. Some organisations, famously Netflix, deliberately inject failures into production systems to test their resilience — a practice called **chaos engineering**.

## Real-world use cases

### Protecting pricing rules

- **Problem:** pricing has many interacting rules; mistakes cost money and trust.
- **Approach:** pricing is a pure module with dense unit tests: every rule, every boundary, every combination that has ever caused a bug. Each bug report becomes a new test.
- **Result:** the pricing team can change rules quickly and confidently; the tests run in under a second.
- **Limit:** the tests only check rules that someone wrote down. A misunderstood requirement passes all tests. Review requirements and test names with the business people who own the rules.

### A legacy service with no tests

- **Problem:** you inherit a 5,000-line service with no tests and a production bug.
- **Approach:** do not try to test everything. Write one test that reproduces the bug, at whatever layer does so most cheaply (often an end-to-end or integration test, because the code is not structured for unit testing). Fix the bug. Add **characterisation tests** ({{ch:clean-code}}) around the code you had to touch. Repeat with each change.
- **Result:** coverage grows exactly where the code changes — which is where the risk is.

### Third-party integration

- **Problem:** your shop integrates with a courier's API, which sometimes changes without notice.
- **Approach:** the courier client is an adapter ({{ch:design-patterns}}). Unit tests use a fake adapter. A small set of integration tests calls the courier's **sandbox** (a test version of their API) on a schedule, not on every pull request, to detect changes on their side without slowing everyone down.

## Common mistakes

### Beginner: no assertions

```ts
// fragment
it("calculates the total", () => {
  calculateTotal(cart); // runs code, checks nothing
});
```

This test passes whatever `calculateTotal` returns. It inflates coverage and protects nothing. **Fix:** every test must assert something meaningful.

### Beginner: forgetting `await`

Covered above: an un-awaited `expect(...).rejects` may never run before the test ends. **Fix:** always `await` async expectations; use the `no-floating-promises` lint rule.

### Beginner: `toBe` for objects

`expect(createOrder()).toBe({ id: "A" })` always fails, because two different objects are never the same object. **Fix:** `toEqual`.

### Intermediate: tests that depend on each other

Test B relies on the order created in test A. Run test B alone, or in a different order, and it fails. **Fix:** each test arranges its own data; reset state in `beforeEach`.

### Intermediate: over-mocking

Every dependency mocked, and assertions on every internal call. **Consequence:** any refactoring breaks dozens of tests, though behaviour is unchanged; and the tests pass even when the real pieces do not fit together. **Fix:** fakes and outcome assertions; real collaborators where they are fast; integration tests for the boundaries.

### Production: tests that differ from production

The test database uses a different engine (SQLite in tests, PostgreSQL in production), or the test app lacks production middleware. **Consequence:** green tests, broken production. **Fix:** test against the same kind of database and build the test app with the same code as the real one.

### Production: a destructive test pointed at a real database

A missing safety guard plus a wrong environment variable, and `TRUNCATE` empties a shared staging — or production — database. **Fix:** guards that refuse to run unless the target is clearly a test database; test databases on separate servers; no production credentials on developer machines or CI test jobs.

### Enterprise: chasing coverage numbers

A mandated 90% coverage gate produces thousands of assertion-free tests. **Fix:** measure coverage to find gaps; review test quality in code review; use mutation testing to check whether tests detect bugs.

## Debugging and troubleshooting

1. **Read the failure message first.** The runner shows expected versus received values; most of the time, the answer is in that difference.
2. **Run only the failing test.** In Vitest, `vitest run -t "rounds to the nearest paisa"` runs tests whose names match; `it.only(...)` temporarily runs just one test (remove it before committing — a lint rule can enforce this).
3. **Passes alone, fails with the others?** Shared state: a module-level variable, a database row not cleaned up, fake timers not restored, a spy not reset.
4. **Fails alone, passes with the others?** It depends on data created by another test.
5. **Fails occasionally?** Look for real time (`Date.now()`, `setTimeout`), randomness, unawaited promises, fixed sleeps, tests running in parallel against one database, or a dependency not ready yet.
6. **The test runner will not exit?** Something is still open: a database pool, a server, a timer. Close resources in `afterAll`. (In Jest, `--detectOpenHandles` lists them.) This often reveals a real leak in application code too.
7. **"It passes but I am not sure it tests anything"?** Break the code on purpose — change `<` to `<=` — and check that the test fails. If it does not, the test is not protecting that behaviour. This is mutation testing by hand.

## Security and performance

**Security.** Tests are where security promises become checked facts:

- For every protected route, test that an unauthenticated request gets 401 and a user with the wrong role gets 403. A permission check that someone removes during a refactor is invisible until such a test fails ({{ch:authentication}}).
- Test that unknown or forbidden fields are rejected, and that error responses do not leak stack traces or SQL ({{ch:error-handling}}).
- Never put real secrets in test files. Use dedicated test credentials, stored in a git-ignored `.env.test` file, with an example file committed instead.
- Never point tests at production data.

**Performance.** Keep unit tests free of databases, networks and file systems, so they run in milliseconds. Create expensive resources once per file (`beforeAll`) and reset only data per test (`beforeEach`). Run database tests serially or with separate databases per worker. Keep the full CI test run under a few minutes; when it grows, split it into parallel jobs rather than letting it slow everyone down.

## How a senior engineer thinks about this

- **Tests are for confidence to change.** The question is not "how many tests?" but "can we change this code safely and quickly?"
- **Test where the risk is.** Complex business rules get dense unit tests; data access gets integration tests; critical journeys get a few end-to-end tests. Trivial code gets none.
- **Hard to test means badly designed.** When a test needs huge setup or many mocks, they change the **code** — inject dependencies, separate pure logic from I/O — rather than writing heroic tests.
- **Tests are code.** They deserve clear names, factories, no duplication of knowledge and regular clean-up.
- **A flaky test is a bug.** It is fixed or removed, never tolerated.
- **Production is the final test.** Good tests reduce risk; monitoring, gradual rollouts and quick rollbacks handle what tests cannot foresee.

## Exercises

### Exercise 1 — Find the missing tests

**Objective:** practise choosing test cases at boundaries and edges.
**Starting point:** this function decides the delivery fee:

```ts
// fragment
export function deliveryFeePaisa(subtotalPaisa: number, city: string): number {
  if (subtotalPaisa >= 300_000) return 0;
  if (city === "Lahore" || city === "Karachi") return 15_000;
  return 25_000;
}
```

**What to do:** list the test cases you would write, with the input and expected result for each, and explain what each one protects against. Then write them as a Vitest file.

<details>
<summary>Show the solution</summary>

| Case | Input | Expected | Protects against |
|---|---|---|---|
| Just below free threshold, major city | 299,999, Lahore | 15,000 | `>=` changed to `>` or threshold moved |
| Exactly at threshold | 300,000, Multan | 0 | Off-by-one at the boundary |
| Above threshold, other city | 450,000, Quetta | 0 | Free delivery applying only to major cities |
| Second major city | 100,000, Karachi | 15,000 | One city accidentally removed |
| Other city | 100,000, Multan | 25,000 | Default fee wrong |
| City name casing | 100,000, "lahore" | 25,000 (current behaviour) | Documents that matching is case-sensitive — a likely real bug to raise |
| Empty cart | 0, Lahore | 15,000 | Decide: should an empty order be charged at all? |

```ts
// fragment
import { describe, it, expect } from "vitest";
import { deliveryFeePaisa } from "./delivery.js";

describe("deliveryFeePaisa", () => {
  it("charges the major-city fee just below the free threshold", () => {
    expect(deliveryFeePaisa(299_999, "Lahore")).toBe(15_000);
  });
  it("is free exactly at the threshold", () => {
    expect(deliveryFeePaisa(300_000, "Multan")).toBe(0);
  });
  it("is free above the threshold in any city", () => {
    expect(deliveryFeePaisa(450_000, "Quetta")).toBe(0);
  });
  it("charges the major-city fee in Karachi", () => {
    expect(deliveryFeePaisa(100_000, "Karachi")).toBe(15_000);
  });
  it("charges the standard fee in other cities", () => {
    expect(deliveryFeePaisa(100_000, "Multan")).toBe(25_000);
  });
  it("matches city names case-sensitively (current behaviour)", () => {
    expect(deliveryFeePaisa(100_000, "lahore")).toBe(25_000);
  });
});
```

**Walkthrough:** the boundary pair (299,999 and 300,000) is the most valuable: it is where an off-by-one would hide. The casing test is interesting: writing it reveals a probable bug ("lahore" is charged as a non-major city). Tests often expose questions about requirements; the right move is to ask the product owner, then fix the code (for example, normalise the city name) and update the test. The empty-cart question is the same: tests force you to decide behaviour explicitly.

</details>

### Exercise 2 — Make it testable

**Objective:** practise restructuring code so it can be tested without real services.
**Starting point:**

```ts
// fragment
import { sendSms } from "./sms-provider.js";

export async function remindUnpaidInvoices(invoices: { phone: string; dueDate: string; paid: boolean }[]) {
  const today = new Date();
  for (const inv of invoices) {
    if (!inv.paid && new Date(inv.dueDate) < today) {
      await sendSms(inv.phone, "Your invoice is overdue");
    }
  }
}
```

**What to build:** change the function so that the current time and the SMS sender are injected. Then write a test (using a simple fake that records messages) showing that only unpaid, overdue invoices get a reminder.

<details>
<summary>Show the solution</summary>

```ts
type Invoice = { phone: string; dueDate: string; paid: boolean };
type SmsSender = (phone: string, text: string) => Promise<void>;

async function remindUnpaidInvoices(invoices: readonly Invoice[], now: Date, sendSms: SmsSender): Promise<number> {
  let sent = 0;
  for (const inv of invoices) {
    if (!inv.paid && new Date(inv.dueDate) < now) {
      await sendSms(inv.phone, "Your invoice is overdue");
      sent++;
    }
  }
  return sent;
}

// A test, written without a framework so you can run it directly
const messages: string[] = [];
const fakeSms: SmsSender = async (phone) => {
  messages.push(phone);
};

const invoices: Invoice[] = [
  { phone: "+923001111111", dueDate: "2026-05-01", paid: false }, // overdue, unpaid -> remind
  { phone: "+923002222222", dueDate: "2026-05-01", paid: true }, // paid -> no
  { phone: "+923003333333", dueDate: "2026-05-20", paid: false }, // not yet due -> no
];

const count = await remindUnpaidInvoices(invoices, new Date("2026-05-10T00:00:00Z"), fakeSms);
console.log(count, messages);
```

**Output:**

```text
1 [ '+923001111111' ]
```

**Walkthrough:** the function's two hidden dependencies — the clock and the SMS provider — are now parameters. The test picks a fixed date and passes a fake that records phone numbers instead of sending real messages. One fixture covers all three branches: unpaid and overdue, paid, and not yet due. In a Vitest file, the last two lines would become `expect(count).toBe(1)` and `expect(messages).toEqual(["+923001111111"])`. In production, the caller passes `new Date()` and the real `sendSms`. Returning the count is a small design improvement that makes the function easier to test and to log.

</details>

### Exercise 3 — Debug a flaky test

**Objective:** practise diagnosing flakiness.
**The scenario:** this test passes on most developers' machines but fails about once a week in CI, always near midnight UTC:

```ts
// fragment
it("labels orders placed today as 'new'", () => {
  const order = { placedAt: new Date() };
  expect(orderLabel(order)).toBe("new");
});

// in the code:
export function orderLabel(order: { placedAt: Date }): string {
  const today = new Date().toDateString();
  return order.placedAt.toDateString() === today ? "new" : "old";
}
```

**What to do:** explain the cause, and fix both the code and the test.

<details>
<summary>Show the solution</summary>

**Cause:** the test calls `new Date()` once, then `orderLabel` calls `new Date()` again a moment later. If midnight passes between the two calls, the dates differ and the label is "old". It happens rarely — only when the test runs within a few milliseconds of midnight — which is exactly what makes it flaky. (`toDateString` uses the machine's local time zone, which adds a second source of variation between machines.)

**Fix:** inject "now", and test both sides of the boundary deliberately:

```ts
function orderLabel(order: { placedAt: Date }, now: Date): string {
  const sameUtcDay = order.placedAt.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  return sameUtcDay ? "new" : "old";
}

const justBeforeMidnight = new Date("2026-07-01T23:59:59.999Z");
const justAfterMidnight = new Date("2026-07-02T00:00:00.000Z");

console.log(orderLabel({ placedAt: justBeforeMidnight }, justBeforeMidnight));
console.log(orderLabel({ placedAt: justBeforeMidnight }, justAfterMidnight));
```

**Output:**

```text
new
old
```

**Walkthrough:** `now` is now a parameter, so the test fully controls time. Comparing the first 10 characters of `toISOString()` (`"2026-07-01"`) compares **UTC** calendar days, removing the machine's time zone from the equation. (Whether "today" should mean UTC or the shop's local time is a business decision; the point is that it is now explicit and testable.) The new tests check the exact boundary that used to cause random failures — turning a flaky test into two deterministic ones.

</details>

### Exercise 4 — Production scenario: a testing plan

**Objective:** practise deciding what to test, at which layer.
**The scenario:** you are adding "apply a coupon at checkout" to an online shop. Coupons have codes, a percentage or fixed amount, an expiry date, a minimum order value, and a limit of one use per customer. Usage is recorded in PostgreSQL. The checkout API is `POST /checkout`.

**What to do:** write a short testing plan: which tests at which layer, and what you deliberately will not test.

<details>
<summary>Show the solution</summary>

**Unit tests (pure coupon rules, many, fast):**
- Percentage and fixed coupons calculate correctly, including rounding to whole paisa.
- A fixed coupon never makes the total negative.
- Minimum order value: just below, exactly at, and above.
- Expiry: one millisecond before, exactly at, and after the expiry time (with the time passed in).
- An unknown code is rejected with a clear error.

**Service tests with fakes:**
- A customer who already used a coupon is refused (fake usage repository pre-loaded with a usage).
- A successful checkout records exactly one usage.
- A failed payment does **not** record a usage (no side effects on failure).

**Integration tests (real PostgreSQL):**
- Recording a usage and reading it back.
- The database's **unique constraint** on (customer, coupon) rejects a second usage — this is what really enforces "once per customer" when two requests arrive at the same moment from two browser tabs ({{ch:transactions}}).

**End-to-end API tests (few):**
- `POST /checkout` with a valid coupon returns the discounted total.
- An expired coupon returns a 400 with a helpful message.
- No authentication returns 401.

**Not tested, deliberately:**
- The web framework's routing or JSON parsing in isolation.
- The database driver itself.
- Every combination of every rule at the end-to-end layer — those combinations are covered far more cheaply by unit tests.

**Walkthrough:** each layer covers what it is best at. Most cases live in fast unit tests. The integration test checks the one thing only a real database can prove — the concurrency guarantee of a unique constraint. A few end-to-end tests prove the wiring. Writing the "not tested" list is part of a senior answer: it shows the choices were deliberate.

</details>

## Summary

Automated tests are code that checks code. They catch **regressions** in seconds, make refactoring safe and give teams the confidence to change software quickly. An assertion throws when an expectation is wrong; a test runner runs tests, reports results and exits with a failure code that CI systems use to block broken changes.

Write tests with Vitest, Jest or `node:test`, in **arrange–act–assert** form, with names that state claims, one behaviour per test. Test **behaviour**, not implementation; focus on boundaries, edge cases, invalid input and failure paths; skip trivial code and other people's libraries. Use **test doubles** — dummies, stubs, spies, mocks and fakes — preferring fakes and outcome assertions, with spies where the interaction is the behaviour. Control time, randomness and the environment so tests are never **flaky**.

Combine **unit**, **integration** and **end-to-end** tests in proportions that match where the risk is — the pyramid is a default, not a law. Run integration tests against the same kind of database as production, behind a safety guard. Use **factories** for test data. **TDD** — red, green, refactor — drives good design for rule-heavy code, and every bug fix should start with a failing test. Use **coverage** to find gaps and **mutation testing** to check that tests detect bugs. Run everything automatically on every change, and treat a flaky test as a bug.

## Key terms

- **Automated test** — Code that runs part of a program with known inputs and automatically checks the results.
- **System under test (SUT)** — The function, class, module or application that a test is checking.
- **Assertion** — A check in a test that a condition holds, causing the test to fail if it does not.
- **Test case** — A single test that checks one behaviour.
- **Test suite** — A collection of related tests.
- **Test runner** — A tool that finds tests, runs them and reports which passed and failed.
- **Matcher** — A function such as `toBe` or `toEqual` that compares an actual value with an expectation in a test.
- **Regression** — A bug in previously working behaviour, introduced by a later change.
- **Regression test** — A test written to prevent a particular bug from returning.
- **Arrange–act–assert** — The three-part structure of a test: set up, perform one action, check the outcome.
- **Edge case** — An input at the extreme or boundary of what code must handle, where bugs are most likely.
- **Off-by-one error** — A bug where a boundary is wrong by one, such as using `<` instead of `<=`.
- **Flaky test** — A test that passes or fails inconsistently without any change to the code.
- **Test double** — A stand-in for a real dependency used during a test.
- **Stub** — A test double that returns fixed answers.
- **Spy** — A test double that records how it was called.
- **Mock** — A test double with built-in expectations about how it must be called.
- **Fake** — A working but simplified implementation of a dependency, such as an in-memory repository.
- **Fake timers** — A test-runner feature that replaces the clock and timers with versions the test can control.
- **Unit test** — A test of a small piece of code in isolation, with dependencies replaced by doubles.
- **Integration test** — A test of code working together with a real external component, such as a database.
- **End-to-end test** — A test of the whole running application through its real interface, such as HTTP or a browser.
- **Test pyramid** — A guideline recommending many unit tests, fewer integration tests and very few end-to-end tests.
- **Test data factory** — A helper that builds valid test objects with defaults that individual tests can override.
- **Fixture** — Fixed data or state that a test relies on.
- **Test-driven development (TDD)** — Writing a failing test first, then the simplest code to pass it, then refactoring, in short cycles.
- **Code coverage** — A measurement of which parts of the code ran during the tests.
- **Mutation testing** — Checking test quality by deliberately introducing small bugs and seeing whether the tests catch them.
- **Snapshot test** — A test that compares output with a previously saved copy.
- **Property-based test** — A test that checks a general property against many automatically generated inputs.
- **Characterisation test** — A test that records the current behaviour of existing code before it is changed.

## What comes next

Part IV is complete. You can now design code with objects and functions, keep it clean, structure it with SOLID and patterns, and protect it with tests.

Part V is about working the way professional teams do. It starts with the tool that records every change you make and lets many people work on the same code without overwriting each other: **Git**. In {{ch:git}} you will learn how Git stores history, how to commit, branch and merge, and how to recover from mistakes — the foundation for pull requests, code review and the automated pipelines that run your tests.
