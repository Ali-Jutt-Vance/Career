# Phase 9 — Chapter 5: Testing

> **Target: 6,000 words · Core interview chapter · Week 27**
>
> You have never written a test. At the tier you are targeting that is disqualifying,
> and it is also the cheapest gap in this entire book to close — one week of real tests
> on a project you already understand changes how your repository reads to a reviewer,
> permanently.

---

## Chapter Overview

Most explanations of testing start with the pyramid and a definition of a unit. That is
why most people come away able to recite the pyramid and unable to write a useful test.

This chapter starts somewhere else: **a test is a claim about behaviour that a machine
can check.** Everything follows from taking that seriously. If you cannot state the
claim in a sentence, you cannot write the test. If the claim is about the framework
rather than about your code, the test is worthless. If the claim is true but nobody
would ever care, the test is a maintenance cost with no return.

By the end you will have three layers of tests on Project 2 — unit, integration,
end-to-end — running green from a clean checkout, and a written policy explaining what
you test, what you deliberately do not, and why. That policy is worth more in an
interview than a coverage number.

**Why this sits in Week 27, after Nest and after the data layer.** Testing is easy when
the code is well-structured and miserable when it is not. You spent Week 6 on dependency
inversion and Week 25 putting repositories behind interfaces. Those two decisions are
what make this week three lines of setup instead of a fight with mocks. If your code is
hard to test, that is information about the design, not about testing.

---

## Beginner Theory

### What a test actually is

```ts
test('applies a 10% discount to orders over 5000', () => {
  const order = { total: 6000, customerTier: 'standard' };   // arrange
  const result = applyDiscount(order);                        // act
  expect(result.total).toBe(5400);                            // assert
});
```

Three phases, always, in that order:

- **Arrange** — set up the world the claim is about.
- **Act** — do the one thing under test.
- **Assert** — state what must now be true.

The test name is the claim in English. If you cannot write that name before writing the
body, you do not yet know what you are testing. `test('works')` is not a claim.

**One behaviour per test.** A test asserting five unrelated things fails on the first
and tells you nothing about the other four. When the name needs the word "and", split
it.

### The three layers, and what each buys

| Layer | What it exercises | Speed | What it catches | What it misses |
|---|---|---|---|---|
| **Unit** | One function or class, dependencies replaced | milliseconds | Logic errors, edge cases, branches | Anything about how the pieces connect |
| **Integration** | A slice through real boundaries — usually your code and a real database | tens to hundreds of ms | Bad SQL, wrong mapping, constraint violations, transaction bugs | Routing, auth, serialisation |
| **End-to-end (e2e)** | The whole application over HTTP | hundreds of ms to seconds | Wiring, middleware order, auth, status codes, response shape | Specific branches deep in the logic |

The pyramid says: many unit, fewer integration, fewest e2e — because cost and fragility
rise as you go up. That is a reasonable default and not a law. For a CRUD-heavy backend
like Project 2, where most of the risk lives in the data layer and the wiring rather
than in clever algorithms, an honest distribution is closer to a **diamond**: a solid
base of unit tests on the logic that genuinely has branches, a *thick* middle of
integration tests, and a thin top of e2e on the critical journeys.

Say that in an interview and mean it. "I aim for the pyramid but in practice this
service's risk is in the data layer, so I weight integration more heavily" is a senior
answer. "80% coverage" is not.

### Test doubles, and being honest about which you used

Four words people use interchangeably and should not:

- **Dummy** — passed to satisfy a signature, never used.
- **Stub** — returns canned answers. `findById` always returns the same user.
- **Spy** — a real thing, wrapped so you can record how it was called.
- **Mock** — a stub that also *asserts* it was called in a particular way.
- **Fake** — a real, working, simplified implementation. An in-memory repository that
  genuinely stores and retrieves.

**Prefer fakes over mocks.** A mock asserts on the interaction — "the repository's
`save` was called once with this object". That couples your test to *how* the code works,
so a harmless refactor breaks it. A fake lets you assert on the outcome — "after calling
the service, the repository contains a record with this state" — which survives
refactoring and is what you actually care about.

Use a mock when the interaction *is* the behaviour: "when payment fails, the
notification service is called exactly once". There the call is the point.

### What not to test

This section is as important as the rest of the chapter and almost nobody writes it
down.

- **The framework.** A test proving that Nest routes `GET /users` to your controller is
  testing Nest. Nest has its own tests.
- **The language or standard library.** Nobody needs a test for `Array.map`.
- **Getters, setters, and pass-through code** with no branches.
- **Third-party libraries.** Test *your usage* at the integration layer, not the library.
- **Implementation details.** If a test breaks when you rename a private method without
  changing behaviour, it was testing the wrong thing.

Every test is a liability as well as an asset: it must be read, maintained, and
understood by the next person. A test suite with three hundred worthless tests is worse
than one with forty good ones, because nobody trusts it and everybody waits for it.

---

## Basic Examples

### Step 1 — Set it up yourself

Vitest or Jest; the concepts are identical. For a Nest project Jest is the default and
you already have it, but do not accept the generated config blindly — read it.

```jsonc
// package.json
{
  "scripts": {
    "test":             "jest --testPathPattern='\\.spec\\.ts$'",
    "test:integration": "jest --testPathPattern='\\.int-spec\\.ts$' --runInBand",
    "test:e2e":         "jest --config ./test/jest-e2e.json --runInBand",
    "test:watch":       "jest --watch",
    "test:cov":         "jest --coverage"
  }
}
```

Three deliberate choices:

- **Separate scripts per layer.** Unit tests must run in under a second so you run them
  constantly; integration and e2e are slower and run less often. One command for all of
  them means you run none of them.
- **A naming convention that lets you select by layer.** `.spec.ts` for unit,
  `.int-spec.ts` for integration.
- **`--runInBand` for anything touching a database.** Jest parallelises across worker
  processes by default; several workers sharing one test database will interfere with
  each other and produce failures that look random. Run them serially, or give each
  worker its own schema — the simple answer first.

### Step 2 — The first real unit test

Take the discount logic from Project 2. Test the branches, not the happy path alone:

```ts
// src/orders/discount.spec.ts
import { applyDiscount } from './discount';

describe('applyDiscount', () => {
  it('applies no discount below the threshold', () => {
    expect(applyDiscount({ total: 4999, tier: 'standard' }).total).toBe(4999);
  });

  it('applies 10% at exactly the threshold', () => {
    expect(applyDiscount({ total: 5000, tier: 'standard' }).total).toBe(4500);
  });

  it('applies 15% for premium customers above the threshold', () => {
    expect(applyDiscount({ total: 5000, tier: 'premium' }).total).toBe(4250);
  });

  it('never produces a negative total', () => {
    expect(applyDiscount({ total: 0, tier: 'premium' }).total).toBe(0);
  });

  it('rounds to two decimal places', () => {
    expect(applyDiscount({ total: 5001, tier: 'standard' }).total).toBe(4500.9);
  });
});
```

Notice what is being tested: **the boundary** (4999 versus 5000), **each branch**
(standard versus premium), and **the edge cases nobody thinks about** (zero, rounding).
The happy path is the least interesting test in the file. Off-by-one at a boundary is
the most common real bug in code like this, and it is exactly what the second test
catches.

This is also where Week 7's functional habit pays: `applyDiscount` is a pure function,
so this file needs no setup, no mocks, and no database.

### Step 3 — Testing a service with the Nest testing module

A service depends on a repository. Because Week 25 put that repository behind an
interface and injected it by token, replacing it is trivial:

```ts
// src/orders/orders.service.spec.ts
import { Test } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { ORDER_REPOSITORY, OrderRepository } from './order.repository';

class InMemoryOrderRepository implements OrderRepository {
  private rows = new Map<string, Order>();

  async findById(id: string) { return this.rows.get(id) ?? null; }
  async save(order: Order)   { this.rows.set(order.id, order); return order; }
  async findByCustomer(id: string) {
    return [...this.rows.values()].filter(o => o.customerId === id);
  }
}

describe('OrdersService', () => {
  let service: OrdersService;
  let repo: InMemoryOrderRepository;

  beforeEach(async () => {
    repo = new InMemoryOrderRepository();

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: ORDER_REPOSITORY, useValue: repo },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  it('stores a created order', async () => {
    const created = await service.create({ customerId: 'c1', total: 100 });
    expect(await repo.findById(created.id)).not.toBeNull();
  });

  it('rejects an order for a customer over their credit limit', async () => {
    await service.create({ customerId: 'c1', total: 9000 });
    await expect(
      service.create({ customerId: 'c1', total: 9000 })
    ).rejects.toThrow(CreditLimitExceeded);
  });
});
```

What is happening, step by step:

1. `Test.createTestingModule` builds a real Nest DI container containing only what you
   list. This is the same injector from Week 23, running in the test process.
2. `{ provide: ORDER_REPOSITORY, useValue: repo }` overrides the token so `OrdersService`
   receives your fake instead of the real TypeORM repository. The service does not know
   and does not care — which is dependency inversion doing the job it was hired for.
3. `beforeEach` gives every test a fresh container and a fresh fake. **Shared state
   between tests is the number-one cause of tests that pass alone and fail together.**
4. The second test asserts on *outcome* — an exception — not on which repository methods
   were called. Refactor the service's internals and this test still holds.

Compare the effort here to what it would take if `OrdersService` constructed its own
repository. You could not replace it at all without mocking the module system. That is
what "hard to test means badly designed" means in practice.

---

## Intermediate Concepts

### Integration tests against a real database

The fake above proves the service's logic. It proves nothing about your SQL, your
constraints, your mapping, or your transactions. For that you need the real thing.

```ts
// src/orders/orders.repository.int-spec.ts
import { DataSource } from 'typeorm';

describe('TypeOrmOrderRepository', () => {
  let dataSource: DataSource;
  let repo: TypeOrmOrderRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: process.env.TEST_DATABASE_URL,
      entities: [OrderEntity, CustomerEntity],
      migrationsRun: true,     // run migrations, never synchronize
    });
    await dataSource.initialize();
    repo = new TypeOrmOrderRepository(dataSource);
  });

  afterAll(async () => { await dataSource.destroy(); });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE orders, customers RESTART IDENTITY CASCADE');
  });

  it('persists and reads back an order with its items', async () => {
    const customer = await seedCustomer(dataSource, { id: 'c1' });
    const saved = await repo.save(makeOrder({ customerId: customer.id, items: 3 }));

    const found = await repo.findById(saved.id);

    expect(found).not.toBeNull();
    expect(found!.items).toHaveLength(3);
    expect(found!.total).toBe(saved.total);
  });

  it('refuses an order referencing a customer that does not exist', async () => {
    await expect(
      repo.save(makeOrder({ customerId: 'does-not-exist' }))
    ).rejects.toThrow(/foreign key/i);
  });

  it('returns orders newest first', async () => {
    const c = await seedCustomer(dataSource, { id: 'c1' });
    await repo.save(makeOrder({ customerId: c.id, createdAt: daysAgo(2) }));
    await repo.save(makeOrder({ customerId: c.id, createdAt: daysAgo(1) }));

    const rows = await repo.findByCustomer(c.id);

    expect(rows[0].createdAt.getTime()).toBeGreaterThan(rows[1].createdAt.getTime());
  });
});
```

The decisions worth understanding:

**`migrationsRun: true`, never `synchronize: true`.** Week 25 made this rule for
production; it applies here for a different reason. If tests run against a
synchronize-generated schema, they are testing a schema that no environment actually
has. Running migrations means your tests also verify that your migrations produce a
working schema — which is a second bug class caught for free.

**`TRUNCATE ... RESTART IDENTITY CASCADE` in `beforeEach`.** Every test starts from
empty. The alternative — wrapping each test in a transaction and rolling back — is
faster and is the right answer once the suite is large, but it cannot test anything
involving transactions itself, which for Project 2 is precisely what you care about.
Truncate first; optimise later, deliberately.

**The second test is the one people skip.** You added foreign keys and CHECK constraints
in Week 16 on the argument that a constraint is documentation the database enforces.
This test is where that claim gets verified. Without it you have a constraint you hope
works.

### End-to-end tests over HTTP

```ts
// test/orders.e2e-spec.ts
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    token = await registerAndLogin(app, { email: 'a@example.com' });
  });

  afterAll(async () => { await app.close(); });

  it('creates an order and reads it back', async () => {
    const create = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: 'c1', items: [{ sku: 'X', qty: 2 }] })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/orders/${create.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(res => {
        expect(res.body.items).toHaveLength(1);
      });
  });

  it('rejects an unauthenticated request', () =>
    request(app.getHttpServer()).get('/orders').expect(401));

  it('rejects an unknown field with 400', () =>
    request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: 'c1', items: [], sneaky: 'value' })
      .expect(400));
});
```

**The critical detail:** `app.useGlobalPipes(...)` and `app.useGlobalFilters(...)` must
be applied here exactly as they are in `main.ts`. A testing module built from
`AppModule` does **not** inherit what you configured on the app instance in `main.ts`.
Forget this and your e2e tests exercise an application with no validation and no error
filter — so they pass, and production behaves differently. This catches nearly
everybody once.

The third test is the one that earns its place: it proves `whitelist: true` from Week 24
actually rejects unknown fields rather than silently dropping them. That is a security
property, verified.

**Test failure paths, not just success.** A suite where every test is a 200 tells you
nothing about what your service does when it is misused, which is most of what it does.

### Fixtures and factories

Do not hand-build objects in every test. Build a factory with sensible defaults and
overrides for the field under test:

```ts
export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: randomUUID(),
    customerId: 'c1',
    total: 1000,
    status: 'pending',
    createdAt: new Date(),
    items: [],
    ...overrides,
  };
}
```

Then `makeOrder({ total: 5000 })` in a discount test says, loudly, *the total is the
thing this test is about and nothing else matters*. That readability is the point;
reducing typing is a side effect.

---

## Advanced Concepts

### Testing time

Code that calls `new Date()` or `setTimeout` is untestable until you control the clock.

```ts
beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date('2027-03-01T10:00:00Z')); });
afterEach(()  => { jest.useRealTimers(); });

it('expires a token after fifteen minutes', () => {
  const token = issueToken();
  jest.advanceTimersByTime(15 * 60 * 1000 + 1);
  expect(isExpired(token)).toBe(true);
});
```

Better still, inject a clock: a `Clock` provider with a `now()` method, real in
production and controlled in tests. It is the same dependency-inversion move as the
repository, applied to time, and it removes an entire category of flaky tests.

### Testing asynchronous and queued work

Week 31 moved work onto a queue. Testing that has a specific trap: the request returns
before the work happens, so a test that asserts immediately fails intermittently.

Test the two halves separately:

1. **The producer** — assert that handling the request *enqueued* a job with the right
   payload. Here a mock is correct, because enqueueing is the behaviour.
2. **The consumer** — call the job handler directly with a payload and assert the
   outcome. It is a plain function; test it like one.

Do not test them together by polling and hoping. If you must test the full path, run the
worker in-process and wait on a completion event with a timeout — never a bare `sleep`.

While you are there: Week 31 made every consumer idempotent. Prove it. Invoke the
handler twice with the same payload and assert nothing doubled. That single test is
worth ten happy-path tests.

### Coverage, used correctly

```bash
npm run test:cov
```

Coverage tells you which lines *executed*, not which behaviours are *verified*. A test
that calls a function and asserts nothing produces full coverage of it.

Use it in exactly one way: **sort by lowest coverage and look at what is there.** If an
uncovered block is the error branch of your payment path, write a test. If it is a
logging helper, do not. Never set a coverage gate as a quality target — teams that do
get tests written to satisfy the gate, which is worse than no test because it looks like
safety.

### Mutation testing, in one paragraph

A mutation tester (Stryker, for Node) deliberately changes your code — flips a `>` to
`>=`, removes a line — and re-runs the suite. If the tests still pass, that mutation
"survived", and your tests do not actually check that behaviour. It is slow and you will
not run it in CI, but running it once on your core business logic tells you truthfully
how good your suite is. Mentioning it in an interview signals that you think about test
*quality* rather than test count.

---

## Industry Usage

What a team that tests well actually does:

- **Tests run on every pull request** and a red build blocks the merge. Week 37 and 38
  set this up; without it the suite decays within a month.
- **The unit suite runs in seconds** and developers run it constantly. Slowness is the
  mechanism by which suites die.
- **A bug fix starts with a failing test** that reproduces it. The test proves the fix
  works and stops the bug coming back — this is the highest-value test you will ever
  write and it is free, because you had to reproduce the bug anyway.
- **Flaky tests are treated as failures**, quarantined and fixed. One tolerated flake
  teaches the team to re-run rather than investigate, and then all failures get re-run.
- **New code arrives with tests**, enforced in review rather than by a tool.

What you will actually find at many companies: a suite somebody wrote enthusiastically
for two months in 2023, now half-skipped and failing on main. Being the person who fixes
that is visible and valuable, and it is a good story in a "tell me about impact"
question.

---

## Alternatives

| Tool | Use it for |
|---|---|
| **Jest** | The Node default; Nest's default. Large ecosystem, good mocking, slower |
| **Vitest** | Jest-compatible API, much faster, native ESM and TypeScript. Prefer for new projects |
| **node:test** | Built into Node, zero dependencies. Fine for libraries, sparse for applications |
| **Supertest** | HTTP assertions against a Nest/Express app without binding a port |
| **Testcontainers** | Starts real Postgres/Redis in Docker from inside the test run. Removes all "works on my machine" from integration tests; costs startup time |
| **Playwright** | Browser-level e2e. Relevant only to the Week 46–47 frontend, not your backend |
| **Stryker** | Mutation testing — how good are the tests themselves |
| **k6 / autocannon** | Load testing. Different question: not "is it correct" but "does it hold up" |

**Testcontainers is worth a serious look** in Week 37 when you wire this into CI. It
removes the readiness-wait dance by managing the container lifecycle from the test
process itself.

---

## Security

Tests are also where several security properties get verified, and almost nobody does it:

- **Authorisation, per role, per route.** For every protected endpoint write the test
  where the wrong role is rejected. A guard that was silently removed in a refactor is
  invisible until this test exists.
- **Unknown fields are rejected**, not ignored — mass assignment is a real vulnerability
  and `whitelist: true` is only a claim until asserted.
- **Errors do not leak.** Assert that a 500 response body contains no stack trace and no
  SQL. Week 12's error taxonomy is a promise; this test keeps it.
- **Never put real credentials in test fixtures.** Test secrets go in `.env.test`, which
  is gitignored, with an `.env.test.example` committed.
- **Never point tests at a production database.** Make the test setup refuse to run if
  `TEST_DATABASE_URL` is absent or does not contain `test` — because the `TRUNCATE` in
  `beforeEach` is a loaded gun and you want the safety on.

```ts
if (!process.env.TEST_DATABASE_URL?.includes('test')) {
  throw new Error('Refusing to run: TEST_DATABASE_URL does not look like a test database');
}
```

Six lines that will one day save your afternoon.

---

## Performance

- **Unit tests must be milliseconds.** No database, no filesystem, no network. If one is
  slow, it is not a unit test.
- **`--runInBand` for database tests**, or one schema per worker. Parallel workers on a
  shared database produce failures that look random and are not.
- **`beforeAll` for expensive setup, `beforeEach` for state.** Create the connection
  once; clear the data every test.
- **Transaction rollback beats truncation** once the suite is large — wrap each test in
  a transaction and roll back. Adopt it deliberately, and keep truncation for the tests
  that exercise transactions themselves.
- **Keep the whole suite under five minutes in CI.** Beyond that, people stop waiting.
- **Run the layers separately** so a developer can run units in a watch loop without
  starting Postgres.

---

## Debugging

1. **Read the assertion diff, not the stack trace.** Jest prints expected versus
   received; nine times in ten the answer is right there.
2. **Run the one test.** `jest -t 'applies 10% at exactly the threshold'`. Narrow before
   you think.
3. **If it passes alone but fails in the suite, it is shared state.** A module-level
   variable, a database row not cleaned, a fake not reset, a fake timer not restored.
   This is the most common failure mode in a young suite.
4. **If it fails alone but passes in the suite, it depends on another test's data.**
   Same disease, other direction.
5. **If it fails one time in five, look for time, ordering, or readiness.** A `sleep`
   somewhere, a container not ready, a real clock, or a `Date.now()` boundary.
6. **`--detectOpenHandles`** when Jest will not exit — a connection or timer you never
   closed. This is also a real leak in your application code, not just a test problem.
7. **Console output is suppressed by default.** Run with `--silent=false` when you need
   to see it.

---

## Interview Preparation

**Q: What is your approach to testing?**
Three layers with a stated purpose each: unit on logic with real branches, integration
on the data layer against a real database, e2e on critical journeys over HTTP. I weight
integration heavily for a CRUD backend because that is where the risk is. I have a
written policy for what I do not test, which is as important as what I do.

**Q: Unit or integration — which matters more?**
Depends where the risk is. For an algorithm, unit. For a service whose job is moving
data between HTTP and Postgres — which is most backend work — integration, because unit
tests with mocked repositories prove the logic and nothing about the SQL or constraints.

**Q: How do you test code that depends on a database?**
Real database, migrations run rather than synchronize, clean state between tests, and a
guard that refuses to run against anything not clearly a test database. Fakes for the
service-layer tests; the real thing for the repository tests.

**Q: Mocks or fakes?**
Fakes by default, because they let me assert on outcomes and survive refactoring. Mocks
where the interaction *is* the behaviour — "the notification is sent exactly once when
payment fails".

**Q: What coverage do you aim for?**
I do not target a number. I use coverage to find untested branches and judge each one.
A coverage gate produces tests written to satisfy the gate, which looks like safety and
is not.

**Q: How do you test something asynchronous, like a queued job?**
Split it. Assert the request enqueued the right job; test the handler directly as a
function. Never poll and hope. And test that the handler is idempotent by running it
twice, because at-least-once delivery means it will be.

**Q: Your test suite is flaky. What do you do?**
Treat it as a failure, not noise. Isolate whether it fails alone or in the suite — that
distinguishes shared state from ordering dependence. Look for real clocks, missing
readiness waits and parallel workers on one database. A tolerated flake trains the team
to re-run everything.

**Q: You inherit a service with no tests and a bug in production. Where do you start?**
Write a failing test that reproduces the bug, at whatever layer reproduces it most
cheaply. Fix it. Then add tests around the code I had to touch to fix it — not the whole
service. Coverage grows where change happens.

---

## Practical Tasks

1. Set up separate `test`, `test:integration` and `test:e2e` scripts with a naming
   convention, and `--runInBand` on the database ones.
2. Write ten unit tests on the pure business logic in Project 2. For each, name the
   boundary or branch it covers. Include at least three edge cases nobody asked for.
3. Build an in-memory fake for one repository interface and test its service through the
   Nest testing module. Assert on outcomes, never on which methods were called.
4. Write integration tests for one repository against a real Postgres: persistence and
   read-back, a constraint violation, and ordering.
5. Write e2e tests for one full journey — register, log in, create, read, delete — plus
   the 401 path and a 400 for an unknown field. Apply your global pipes and filters in
   the test setup and confirm the unknown-field test fails without them.
6. Add the `TEST_DATABASE_URL` safety guard and prove it by pointing it somewhere else.
7. Test one queued job both halves: the producer enqueues correctly, the handler is
   idempotent when run twice.
8. Take a bug you have fixed in Project 2 and write the test that would have caught it.
9. Run coverage, sort ascending, and write down for the five lowest files whether they
   need tests — with a reason either way.
10. Write `TESTING.md`: your policy, what each layer covers, what you deliberately do
    not test and why, and how to run each suite. This is a deliverable a reviewer reads.

---

## Projects

### Mini project — the characterisation harness

Take one Project 2 service you wrote before this week and write tests for it *without
changing it*. The point is not the tests; the point is what you discover.

Every place you reach for a hack — mocking a module, faking a clock you cannot inject,
starting the whole application to test one branch — is a design defect the tests just
found. Keep a list. Then fix the three worst and re-write those tests; they should get
shorter.

This is the exercise that makes "hard to test means badly designed" true for you rather
than a slogan, and it produces a genuinely good interview story: *"I added tests to a
service and the tests told me the design was wrong."*

### Production project — the full three-layer suite

On Project 2, in this order:

1. **Unit** — every branch in the business logic, boundaries included, with a factory for
   fixtures and no database.
2. **Integration** — every repository against real Postgres, migrations run, state cleaned
   between tests, including at least one constraint violation and one ordering assertion.
3. **E2E** — one full journey per feature plus the 401 and 400 paths, with the global
   pipes and filters from `main.ts` applied.
4. **Security assertions** — role rejection on every protected route, unknown-field
   rejection, and a 500 body containing no stack trace.
5. **`TESTING.md`** — the policy, the layers, what you do not test, and how to run each.

The completion test is brutal and simple: **clone into an empty directory, follow your own
README, run each suite.** If anything only works on your machine, it is not finished.

### Capstone — make it run in CI and keep it honest

In Week 37 this suite goes into GitHub Actions with a service database, and in Week 38
into Jenkins with sidecar containers. Two additional requirements then:

- **Branch protection**, so a red suite blocks a merge. A suite that can be bypassed
  decays within a month.
- **A flake hunt.** Run the full suite twenty times in a loop locally. Any test that
  fails even once is flaky. Fix it — do not re-run it. One tolerated flake teaches the
  team to re-run everything, and then failures stop meaning anything.

```bash
for i in $(seq 1 20); do npm run test:integration || echo "FAILED on run $i"; done
```

That loop is the most honest measure of a test suite you will ever run, and almost nobody
does it.

---

## Self Assessment

- What are the three phases of a test, and what does it mean if you cannot name one?
- Why is a fake usually better than a mock, and when is a mock correct?
- Why `migrationsRun` rather than `synchronize` in an integration test?
- Why must you apply global pipes and filters in an e2e setup, and what fails silently
  if you forget?
- Your test passes alone and fails in the suite. What is your first hypothesis?
- Why is `--runInBand` needed for database tests, and what is the better fix later?
- Name four things you should not test, and say why for each.
- What does coverage measure, and what does it not?
- How do you test that a queue consumer is idempotent?
- What is the highest-value test you can write, and why is it nearly free?

---

## Cheat Sheet

```ts
// Structure
describe('subject', () => {
  beforeAll(async () => { /* expensive setup: connections */ });
  beforeEach(async () => { /* state: truncate, fresh fakes */ });
  afterEach(()       => { jest.useRealTimers(); });
  afterAll(async ()  => { /* close everything */ });

  it('states the claim in English', async () => {
    // arrange / act / assert
  });
});
```

```ts
// Overriding a provider in Nest
const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(ORDER_REPOSITORY).useValue(fakeRepo)
  .compile();

// e2e — mirror main.ts exactly
app = moduleRef.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.useGlobalFilters(new AllExceptionsFilter());
await app.init();
```

**Assertions worth knowing:** `toBe` (identity), `toEqual` (deep), `toMatchObject`
(partial), `rejects.toThrow`, `toHaveLength`, `toHaveBeenCalledWith`, `expect.any(Type)`.

**Commands:** `jest -t 'name'` · `--runInBand` · `--detectOpenHandles` ·
`--coverage` · `--silent=false` · `--watch`

**Rules:**
- One behaviour per test; the name is the claim.
- Test boundaries and branches, not the happy path.
- Fakes by default, mocks when the call *is* the behaviour.
- Real database for repositories; migrations, never synchronize.
- Clean state in `beforeEach`; shared state is the flake.
- Test failure paths and authorisation, not just 200s.
- Every bug fix starts with a failing test.
- Coverage finds gaps; it does not define the target.
