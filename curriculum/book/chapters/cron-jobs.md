# Scheduled Jobs (Cron)

> [!GOALS]
> - Explain what scheduled jobs are for and where they run: the system `cron`, in-process schedulers, queue schedulers, and platform schedulers.
> - Read and write **cron expressions** confidently, including the less obvious rules.
> - Handle **time zones and daylight saving time** correctly.
> - Make scheduled jobs safe when the application runs on **several servers**: one run per period, using locks or unique run records.
> - Design jobs that are **idempotent**, resumable and able to **catch up** after missed runs.
> - Monitor jobs so you notice when one fails — or silently never runs.

## Why this matters

Many things in an application happen because of the **clock**, not because a user clicked something:

- every night: delete expired sessions and abandoned uploads, back up data, rebuild search indexes;
- every morning: send the daily sales summary to shop owners;
- every month: generate invoices and charge subscriptions;
- every few minutes: retry failed webhooks, check for orders stuck in "processing", sync stock levels with a supplier;
- three days before a subscription renews: send a reminder.

These jobs are easy to start and easy to get wrong. The classic problems:

- The application scales from one server to three, and every customer suddenly receives **three** copies of the monthly invoice.
- The "9 a.m. report" arrives at 8 a.m. for half the year because the server's time zone and daylight saving time were ignored.
- The nightly clean-up has been failing for six weeks, and nobody noticed until the disk filled up.
- A deployment happened at 02:00 exactly, the job never ran that night, and the billing run for that day was simply skipped.

This chapter explains how scheduling works, how to write schedules, and how to make scheduled work correct and visible.

## The simple idea

A scheduled job is an **alarm clock for your software**. You set it — "every weekday at 9:00", "on the 1st of every month" — and when it rings, a piece of code runs.

The difficult parts are the same as with real alarm clocks in a shared house:

- if **everyone** in the house has the same alarm, the task gets done several times (several servers);
- if you were asleep when it rang (the server was restarting), the task is missed unless you check later;
- if the clocks change for summer time, your alarm may ring an hour early — or, at 2:30 a.m. on the wrong night, not at all.

> [!ANALOGY]
> A scheduled job is like an alarm clock for your software: it rings at set times and a task runs. In a house with several people (servers) all setting the same alarm, someone has to make sure the task is done exactly once.
>
> **Where the analogy breaks:** an alarm clock does not care whether the task succeeded. A scheduled job's real goal is not "run at 09:00" but "make sure this period's work is done" — so good jobs record what they finished, retry what failed, and catch up on what was missed, which an alarm clock never does.

## The proper definition and key words

A **scheduled job** (cron job) is a task executed automatically at specified times or intervals, defined by a schedule rather than triggered by a request.

Key words:

- **cron** — the Unix scheduling service, and by extension any scheduler using its expression format ({{ch:linux}}).
- **Cron expression** — five fields (minute, hour, day of month, month, day of week) describing when a job runs.
- **crontab** — the file listing a user's cron schedules on a Unix system.
- **Scheduler** — the component that decides when a job is due; the **worker** is what executes it.
- **Overlap** — a new run starting while the previous one is still running.
- **Distributed lock** — a lock shared by several servers, ensuring only one of them does a piece of work at a time.
- **Idempotent job** — a job that produces the same result whether it runs once or several times for the same period ({{ch:rest-apis}}).
- **Catch-up** (backfill) — running work for periods that were missed.
- **Heartbeat monitoring** (dead man's switch) — an external service that alerts you when a job **fails to report** that it ran.

## Cron expressions

### Level 1 — The five fields

```text
 ┌───────────── minute        (0–59)
 │ ┌─────────── hour          (0–23)
 │ │ ┌───────── day of month  (1–31)
 │ │ │ ┌─────── month         (1–12, or JAN–DEC)
 │ │ │ │ ┌───── day of week   (0–7, or SUN–SAT; 0 and 7 are both Sunday)
 │ │ │ │ │
 * * * * *
```

Each field accepts:

- `*` — every value;
- a number — `30` (minute 30);
- a list — `8,20` (8 and 20);
- a range — `1-5` (Monday to Friday in the day-of-week field);
- a step — `*/15` (every 15th value: 0, 15, 30, 45), or `9-17/2` (9, 11, 13, 15, 17).

Common examples:

| Expression | Meaning |
|---|---|
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour, on the hour |
| `0 9 * * 1-5` | 09:00, Monday to Friday |
| `30 2 * * *` | 02:30 every day |
| `0 0 1 * *` | Midnight on the 1st of every month |
| `0 8,20 * * *` | 08:00 and 20:00 every day |
| `*/15 9-17 * * 1-5` | Every 15 minutes during office hours on weekdays |

### Level 2 — How a scheduler reads an expression

To see exactly what an expression means, here is a small matcher that lists the next run times. Real libraries are more complete, but they follow the same logic:

```ts
// A tiny cron matcher (minute hour day-of-month month day-of-week), evaluated in UTC
function parseField(field: string, min: number, max: number): Set<number> {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    const [range, stepText] = part.split("/");
    const step = stepText ? Number(stepText) : 1;
    let [from, to] = [min, max];
    if (range !== "*") {
      const [a, b] = range!.split("-").map(Number);
      from = a!;
      to = b ?? (stepText ? max : a!);
    }
    for (let v = from; v <= to; v += step) values.add(v === 7 && max === 7 ? 0 : v); // 7 also means Sunday
  }
  return values;
}

function cron(expression: string) {
  const [mi, h, dom, mo, dow] = expression.trim().split(/\s+/);
  const minutes = parseField(mi!, 0, 59), hours = parseField(h!, 0, 23);
  const days = parseField(dom!, 1, 31), months = parseField(mo!, 1, 12), weekdays = parseField(dow!, 0, 7);
  const domAny = dom === "*", dowAny = dow === "*";
  return (d: Date): boolean => {
    const dayOk = domAny || dowAny
      ? days.has(d.getUTCDate()) && weekdays.has(d.getUTCDay())
      : days.has(d.getUTCDate()) || weekdays.has(d.getUTCDay());   // both restricted: either may match
    return minutes.has(d.getUTCMinutes()) && hours.has(d.getUTCHours()) && months.has(d.getUTCMonth() + 1) && dayOk;
  };
}

function nextRuns(expression: string, after: Date, count: number): string[] {
  const matches = cron(expression);
  const runs: string[] = [];
  const t = new Date(after);
  t.setUTCSeconds(0, 0);
  while (runs.length < count) {
    t.setUTCMinutes(t.getUTCMinutes() + 1);
    if (matches(t)) runs.push(t.toISOString().slice(0, 16).replace("T", " ") + " " + ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][t.getUTCDay()]);
  }
  return runs;
}

const start = new Date("2026-11-20T10:07:00Z"); // a Friday
for (const expr of ["*/15 * * * *", "0 9 * * 1-5", "30 2 1 * *", "0 0 13 * 5"]) {
  console.log(expr.padEnd(13), "→", nextRuns(expr, start, 4).join(" | "));
}
```

**Output:**

```text
*/15 * * * *  → 2026-11-20 10:15 Fri | 2026-11-20 10:30 Fri | 2026-11-20 10:45 Fri | 2026-11-20 11:00 Fri
0 9 * * 1-5   → 2026-11-23 09:00 Mon | 2026-11-24 09:00 Tue | 2026-11-25 09:00 Wed | 2026-11-26 09:00 Thu
30 2 1 * *    → 2026-12-01 02:30 Tue | 2027-01-01 02:30 Fri | 2027-02-01 02:30 Mon | 2027-03-01 02:30 Mon
0 0 13 * 5    → 2026-11-27 00:00 Fri | 2026-12-04 00:00 Fri | 2026-12-11 00:00 Fri | 2026-12-13 00:00 Sun
```

Points to notice:

- `*/15` means "minutes divisible by 15", counted from the start of the hour — not "15 minutes after the application started".
- The weekday job started at 10:07 on a Friday, so the next 09:00 on a weekday is **Monday**.
- The last line shows the most surprising cron rule: when **both** day of month and day of week are restricted, the job runs when **either** matches. `0 0 13 * 5` is not "Friday the 13th" — it is "every Friday **and** every 13th". (Checking "is it the 13th?" inside the job is the usual workaround.)
- The example works in UTC. Real schedulers also let you choose a time zone — which brings us to the hardest part.

Use a tool or library to check expressions before deploying them: most libraries can validate an expression and list its next run times, as above.

### Level 2 — Variations you will meet

- Some libraries add a **seconds** field at the start (six fields).
- AWS EventBridge uses six fields including a **year**, and requires `?` in either day of month or day of week (`cron(0 9 ? * MON-FRI *)`).
- Shortcuts such as `@daily` and `@hourly` exist in many implementations.
- Some schedulers accept "rate" expressions instead (`rate(5 minutes)`, "every 5m").

Always check the documentation of the scheduler you are using.

## Time zones and daylight saving time

### Level 3 — Choose the time zone deliberately

A cron expression has no time zone of its own. It is evaluated in the scheduler's time zone — often the server's, which on cloud machines and containers is usually **UTC**. "0 9 * * *" on a UTC server runs at 09:00 UTC: 10:00 in Berlin in winter, 11:00 in summer, 04:00 in New York.

Rules of thumb:

- **System and maintenance jobs** (clean-ups, backups): schedule in **UTC**. Daylight saving time never affects them.
- **Jobs tied to people's local time** ("daily summary at 08:00 for the shop owner"): schedule with an explicit **IANA time zone** such as `Europe/London` or `America/New_York`, which every serious scheduler supports. Never rely on the server's local setting.
- **Per-user local times** (each user's own 08:00): do not create one cron job per user. Store each user's time zone, run a frequent job (for example, every 15 minutes) that finds users whose local time has just passed 08:00 and who have not received today's summary, and queue their messages.

### Level 3 — The two dangerous days of the year

In time zones with daylight saving time, local clocks jump forward one night in spring and back one night in autumn. Watch how UTC instants map to London time on those days:

```ts
const london = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", timeZoneName: "short",
});

function show(label: string, utcTimes: string[]) {
  console.log(label);
  for (const t of utcTimes) console.log(`  ${t.slice(11, 16)} UTC → ${london.format(new Date(t))} in London`);
}

show("Clocks go forward (29 March 2026):", ["2026-03-29T00:30:00Z", "2026-03-29T01:30:00Z", "2026-03-29T02:30:00Z"]);
show("Clocks go back (25 October 2026):", ["2026-10-24T23:30:00Z", "2026-10-25T00:30:00Z", "2026-10-25T01:30:00Z"]);
```

**Output:**

```text
Clocks go forward (29 March 2026):
  00:30 UTC → 00:30 GMT in London
  01:30 UTC → 02:30 BST in London
  02:30 UTC → 03:30 BST in London
Clocks go back (25 October 2026):
  23:30 UTC → 00:30 BST in London
  00:30 UTC → 01:30 BST in London
  01:30 UTC → 01:30 GMT in London
```

- In spring, London local time jumps from 00:59 GMT straight to 02:00 BST. **01:30 local time does not exist** that night, so a job scheduled at `30 1 * * *` in `Europe/London` has no matching minute.
- In autumn, local time passes 01:00–01:59 **twice** (first in BST, then in GMT). A job at `30 1 * * *` could run **twice**.

Schedulers handle these days differently — some skip, some run immediately after the gap, some run twice. Two practical defences:

1. Avoid scheduling local-time jobs between 01:00 and 03:00 (the window most countries use for the change).
2. Make jobs **idempotent per period** (below), so a second run on the same day does nothing.

Store and compare timestamps in UTC everywhere in your data ({{ch:postgresql}}); convert to local time only for schedules and display.

## Where scheduled jobs run

### Level 2 — The options

| Option | How it works | Good for | Watch out for |
|---|---|---|---|
| **System cron** (`crontab -e`) | The operating system runs a command at the scheduled time | A single server; scripts | Invisible to the app; lost when servers are replaced; no retries |
| **In-process scheduler** (`node-cron`, `croner`) | A library inside your Node process fires a function | Small apps on one instance | Runs on **every** instance; missed while the process is down |
| **Queue scheduler** (BullMQ job schedulers, {{ch:queues}}) | One shared schedule in Redis creates **one** job per tick, processed by any worker | Most Node applications with several instances | Needs Redis; still design for retries |
| **Platform scheduler** (Kubernetes CronJob, AWS EventBridge Scheduler, Cloud Scheduler, GitHub Actions `schedule`) | The platform starts a container, function or HTTP call on schedule | Containerised and serverless systems ({{ch:eks}}, {{ch:lambda}}) | Platform-specific configuration; check its overlap and missed-run settings |
| **Database scheduler** (`pg_cron` in PostgreSQL) | The database runs SQL on schedule | Pure-SQL maintenance (refreshing summary tables, deleting old rows) | Limited to SQL work |

An in-process schedule is the simplest:

```ts
// fragment
import cron from "node-cron";

cron.schedule("0 8 * * *", () => runSafely("daily-sales-summary", sendDailySummaries), {
  timezone: "Europe/London",
});
```

A queue scheduler moves the schedule into shared storage, so it fires once however many workers exist:

```ts
// fragment
import { Queue, Worker } from "bullmq";

const scheduled = new Queue("scheduled", { connection });

// Run once at startup (or deploy time); "upsert" makes it safe to repeat
await scheduled.upsertJobScheduler("daily-sales-summary", { pattern: "0 8 * * *", tz: "Europe/London" }, {
  name: "daily-sales-summary",
});
await scheduled.upsertJobScheduler("cleanup-expired-sessions", { pattern: "*/10 * * * *" }, {
  name: "cleanup-expired-sessions",
});

new Worker("scheduled", async (job) => {
  if (job.name === "daily-sales-summary") return sendDailySummaries();
  if (job.name === "cleanup-expired-sessions") return deleteExpiredSessions();
  throw new Error(`unknown scheduled job ${job.name}`);
}, { connection });
```

A Kubernetes CronJob runs each tick in a fresh container and has explicit settings for the hard questions:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-invoices
spec:
  schedule: "0 6 1 * *"
  timeZone: "Europe/London"
  concurrencyPolicy: Forbid          # never start a run while the previous one is still going
  startingDeadlineSeconds: 3600      # if the start was missed, still start within an hour
  jobTemplate:
    spec:
      backoffLimit: 3                # retry a failed run up to three times
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: invoices
              image: registry.example/cornershop-api:2026.11.3
              command: ["node", "dist/jobs/monthly-invoices.js"]
```

Whatever runs the schedule, keep the **job logic** in your application code (a function or script you can also run by hand and test), and treat the scheduler as just the trigger.

## Making jobs correct

### Level 3 — One run per period, even with several servers

The most common bug: an in-process schedule on an application that runs on three servers runs **three times**. Two families of fixes:

- **Only one trigger**: a queue scheduler or platform scheduler that creates one job per tick.
- **Only one winner**: every instance may try, but a **lock** or **unique record** lets just one proceed.

A Redis lock with an expiry is common for short jobs (`SET lock:job value NX PX 600000`, released only by its owner — {{ch:redis}}). For jobs that must run **once per period** — invoices, monthly reports — a stronger approach records the run in the database with a **unique key per period**. The record doubles as history and lets failed runs be retried:

```ts
// Simulates a table "job_runs" with a UNIQUE constraint on (job, period)
const jobRuns = new Map<string, { status: "running" | "succeeded" | "failed"; instance: string }>();

function claimRun(job: string, period: string, instance: string): boolean {
  const key = `${job}:${period}`;
  const existing = jobRuns.get(key);
  if (existing && existing.status !== "failed") return false;  // INSERT ... ON CONFLICT DO NOTHING
  jobRuns.set(key, { status: "running", instance });
  return true;
}

async function monthlyInvoices(period: string, instance: string, fail = false): Promise<void> {
  if (!claimRun("monthly-invoices", period, instance)) {
    console.log(`${instance}: ${period} already claimed, skipping`);
    return;
  }
  const run = jobRuns.get(`monthly-invoices:${period}`)!;
  try {
    if (fail) throw new Error("payment provider timeout");
    run.status = "succeeded";
    console.log(`${instance}: invoiced ${period}`);
  } catch (err) {
    run.status = "failed";
    console.log(`${instance}: ${period} failed (${(err as Error).message}), can be retried`);
  }
}

// The schedule fires on three servers at the same moment
await Promise.all(["web-1", "web-2", "web-3"].map((i) => monthlyInvoices("2026-11", i)));
// A failed run, then a retry
await monthlyInvoices("2026-12", "web-2", true);
await monthlyInvoices("2026-12", "web-3");
// Someone re-runs November by hand
await monthlyInvoices("2026-11", "admin-cli");
```

**Output:**

```text
web-1: invoiced 2026-11
web-2: 2026-11 already claimed, skipping
web-3: 2026-11 already claimed, skipping
web-2: 2026-12 failed (payment provider timeout), can be retried
web-3: invoiced 2026-12
admin-cli: 2026-11 already claimed, skipping
```

- The **period** (`2026-11`), not the current time, identifies the work. Whichever server or retry gets there first does it; everyone else skips.
- In a real database this is a table with `UNIQUE (job, period)` and an atomic `INSERT ... ON CONFLICT DO NOTHING`, or an update that changes `failed` back to `running` ({{ch:transactions}}). In this single-threaded simulation, checking and setting the map happen with no `await` between them, which makes them atomic in the same way.
- A run stuck in `running` because its server crashed needs handling too: record a `started_at` and allow a new claim after a timeout.

### Level 3 — Idempotent work inside the job

Claiming the period stops duplicate **runs**; the work itself should also be safe to repeat, because a run can fail half-way. The monthly invoice job should skip customers who already have an invoice for that period (a unique constraint on `(customer_id, period)`), not create a second one. A job that sends emails should record what it sent with deterministic keys ({{ch:email}}). Then "just run it again" is always a safe answer to a failure.

### Level 3 — Long jobs and overlap

If a job scheduled every 5 minutes sometimes takes 7, runs pile up and fight over the same data. Options:

- **Prevent overlap** with a lock or the scheduler's setting (`concurrencyPolicy: Forbid`; some libraries have a "no overlap" option).
- **Process in batches** — for example, delete expired sessions 1,000 at a time — so each run is short, and the next run continues where this one stopped.
- **Fan out**: the scheduled job only **finds** work and queues one job per item (one per shop, one per invoice), and a pool of workers processes them in parallel with retries ({{ch:queues}}). This is the standard shape for large scheduled work.

Also handle **shutdown**: when a deployment stops a server mid-job, the job should stop at a safe point and leave the period claimable, rather than leaving half-written data ({{ch:nodejs}}).

### Level 4 — Missed runs and catching up

Schedulers fire at a moment. If nothing was running at that moment — a deployment, an outage, a scheduler bug — the run is simply missed, unless the job is designed to notice. A robust pattern: on each run, look at the last **successful** period and process every finished period since then, with a limit:

```ts
function dailyPeriods(lastSucceeded: string, now: Date, maxCatchUp: number): { run: string[]; skipped: number } {
  const periods: string[] = [];
  const day = new Date(lastSucceeded + "T00:00:00Z");
  const today = now.toISOString().slice(0, 10);
  for (;;) {
    day.setUTCDate(day.getUTCDate() + 1);
    const p = day.toISOString().slice(0, 10);
    if (p >= today) break;            // only finished days
    periods.push(p);
  }
  return { run: periods.slice(-maxCatchUp), skipped: Math.max(0, periods.length - maxCatchUp) };
}

const now = new Date("2026-11-20T02:00:00Z");
console.log(dailyPeriods("2026-11-19", now, 7));
console.log(dailyPeriods("2026-11-16", now, 7));
console.log(dailyPeriods("2026-10-30", now, 7));
```

**Output:**

```text
{ run: [], skipped: 0 }
{ run: [ '2026-11-17', '2026-11-18', '2026-11-19' ], skipped: 0 }
{
  run: [
    '2026-11-13',
    '2026-11-14',
    '2026-11-15',
    '2026-11-16',
    '2026-11-17',
    '2026-11-18',
    '2026-11-19'
  ],
  skipped: 13
}
```

- Up to date: nothing to do.
- Three days missed: all three are processed, oldest first.
- Three weeks missed: only the last seven are processed automatically, and the 13 skipped days are reported. Whether old periods should still be processed is a business decision — a daily report from three weeks ago may be useless, but missing invoices are not — so large gaps should alert a person rather than silently produce a flood of work.

Combined with per-period claims, catch-up makes a job **self-healing**: a missed night is completed automatically the next time it runs.

## Monitoring scheduled jobs

### Level 3 — Failure is loud; not running is silent

An error inside a job can be logged and alerted like any other error ({{ch:logging}}). The dangerous case is a job that **does not run at all** — the scheduler was removed in a refactor, the container image is broken, the time zone is wrong. Nothing logs an error, because nothing happens.

**Heartbeat monitoring** catches this. You tell an external service, "this job should report every day by 03:00"; the job pings a URL when it finishes successfully; if no ping arrives in time, the service alerts you. Healthchecks.io and Cronitor are dedicated services, and most monitoring platforms have the same feature ({{ch:monitoring}}).

```ts
// fragment
async function runSafely(name: string, work: () => Promise<{ processed: number }>) {
  const started = Date.now();
  logger.info({ job: name }, "job started");
  try {
    const result = await work();
    logger.info({ job: name, durationMs: Date.now() - started, ...result }, "job succeeded");
    metrics.histogram("job_duration_seconds", (Date.now() - started) / 1000, { job: name });
    await fetch(`${process.env.HEARTBEAT_URL}/${name}`, { signal: AbortSignal.timeout(5_000) }).catch(() => {});
  } catch (err) {
    logger.error({ job: name, err, durationMs: Date.now() - started }, "job failed");
    metrics.increment("job_failures_total", { job: name });
    throw err;                                   // let the scheduler or queue record the failure and retry
  }
}
```

Keep a **run history** (start, end, status, items processed, error) — the `job_runs` table above does this — and show it on an internal admin page. Alert on: failures, missed heartbeats, runs much longer than usual, and catch-up backlogs.

### Level 3 — Operating jobs

Useful features once you have more than a handful of jobs:

- **Run now** — trigger a job manually for a given period (an admin action or command-line script), using the same claims and idempotency.
- **Pause** — disable a job without deploying, for example during a database migration.
- **A list of all schedules** in one place, with owners and descriptions, so nobody is surprised by "what sends emails at 04:00?".

## From beginner to enterprise

**Level 1–2 — first jobs.** A cron expression checked with a tool, a job function that logs its start, end and errors, schedules in UTC.

**Level 3 — correct jobs.** One run per period across servers (queue scheduler, lock, or unique run records); idempotent work; explicit time zones for local-time jobs; no local-time jobs in the daylight-saving window; heartbeat monitoring.

**Level 4 — production systems.** Fan-out to worker queues for large work; batched processing; catch-up of missed periods with limits; overlap prevention; graceful shutdown; a run-history table and admin page with "run now" and "pause".

**Level 5 — professional practice.** Platform schedulers (Kubernetes CronJobs, EventBridge Scheduler) with explicit concurrency and deadline settings; per-user local-time scheduling through frequent "due" scans; metrics and dashboards per job; runbooks for each critical job.

**Level 6 — enterprises.** Workflow orchestrators (Temporal, Airflow, AWS Step Functions) for multi-step scheduled pipelines with dependencies, retries per step and full history; data pipelines with backfills; change control and auditing for jobs that move money; service-level objectives for "report delivered by 07:00".

## Real-world use cases

### Monthly subscription billing

- **Design**: a platform or queue scheduler fires at 06:00 on the 1st; the job claims period `2026-12`; it queues one charge job per due subscription; each charge job uses an idempotency key `charge:{subscriptionId}:{period}` with the payment provider; failures retry with backoff and, after several attempts, mark the subscription "past due" and email the customer.
- **Safety**: unique `(subscription_id, period)` invoices; a dashboard of the run's progress; alerting if the run has not completed by 09:00.

### Per-user morning summary

- **Design**: a job every 15 minutes selects shops whose local time (from their stored time zone) is between 08:00 and 08:15 and whose `last_summary_date` is before today in their time zone; it queues one email per shop and updates the date in the same transaction as queuing.
- **Why**: one schedule serves every time zone and daylight-saving rule correctly, and catch-up is natural — a missed tick is covered by the next.

## Common mistakes

### Beginner: in-process cron on several instances

**Consequence:** duplicate runs. **Fix:** queue or platform scheduler; locks or unique per-period run records.

### Beginner: ignoring time zones

**Fix:** UTC for system jobs; explicit IANA time zones for local-time jobs; nothing between 01:00 and 03:00 local.

### Beginner: no error handling or monitoring

**Fix:** structured logs, failure alerts, and heartbeat monitoring for jobs that fail silently by not running.

### Intermediate: non-idempotent jobs

**Consequence:** retries and manual re-runs duplicate invoices or emails. **Fix:** per-period claims and unique constraints on the work produced.

### Intermediate: overlapping runs

**Fix:** overlap prevention, batching, or fan-out to queues.

### Intermediate: assuming every scheduled run happens

**Fix:** catch-up from the last successful period, with limits and alerts.

### Production: misreading cron expressions

Such as `0 0 13 * 5` meaning "every Friday and every 13th". **Fix:** list the next runs with a tool before deploying, and in code review.

### Production: heavy jobs in the web process

**Consequence:** a big job slows down user requests. **Fix:** run jobs in separate worker processes or containers.

## Debugging and troubleshooting

- **The job did not run**: check the scheduler is deployed and enabled; the expression and time zone (list next runs); whether a lock was stuck from a crashed run; platform events (Kubernetes `kubectl get cronjob` and its jobs; EventBridge invocation metrics).
- **The job ran twice**: several instances with in-process schedules; a daylight-saving autumn night; a retry after a lost confirmation — add per-period claims.
- **The job ran at the wrong hour**: scheduler time zone differs from what you assumed (containers are usually UTC); daylight saving time changed.
- **The job gets slower over time**: processing everything instead of increments, or missing indexes on the "due" query ({{ch:indexes}}).
- **A lock never releases**: the process crashed while holding it — locks need expiry times, and run records need a stale-run timeout.

## Security summary

- Run jobs with **least-privilege** credentials; a clean-up job does not need payment permissions ({{ch:iam}}).
- Protect **"run now" and "pause"** actions with authorisation and audit logs.
- Be careful with jobs that **delete** data: dry-run modes, limits per run, and backups.
- Do not put secrets in crontab lines or command-line arguments, which appear in process lists; use environment variables or a secrets manager ({{ch:secrets-manager}}).
- Scheduled HTTP triggers (a platform calling `/internal/jobs/...`) must be authenticated and not publicly reachable.

## How a senior engineer thinks about this

- **"Make sure this period is done", not "run at 09:00".** Jobs are designed around periods, claims, idempotency and catch-up.
- **Assume several instances, failures and missed ticks.** The design is correct even when the scheduler misbehaves.
- **Silence is the dangerous failure.** Heartbeats and run histories make absence visible.
- **The scheduler only triggers; queues do the work.** Large jobs fan out into small, retryable units.
- **Time is local only at the edges.** UTC inside; time zones explicitly at the schedule and the display.

## Exercises

### Exercise 1 — Write the expressions

**Objective:** practise cron syntax.
**What to do:** write expressions for: (1) every 10 minutes; (2) 07:30 on weekdays; (3) 23:00 on the 1st and 15th of each month; (4) every hour from 08:00 to 18:00 on Saturdays; (5) 03:15 every Sunday. Then explain why "the last day of the month" is hard in standard cron.

<details>
<summary>Show the solution</summary>

1. `*/10 * * * *`
2. `30 7 * * 1-5`
3. `0 23 1,15 * *`
4. `0 8-18 * * 6`
5. `15 3 * * 0` (or `15 3 * * 7`)

**Last day of the month:** months have 28–31 days, and standard cron has no "last day" symbol. Common solutions: run on days 28–31 (`0 23 28-31 * *`) and check inside the job whether tomorrow is the 1st; schedule "00:00 on the 1st" and process the **previous** month (usually the cleaner design for monthly work); or use a scheduler with an `L` extension, such as some Quartz-style and AWS schedulers.

</details>

### Exercise 2 — Plan for daylight saving time

**Objective:** practise reasoning about local-time schedules.
**What to do:** a bakery chain in Germany (`Europe/Berlin`, clocks change at 02:00 → 03:00 in March and 03:00 → 02:00 in October) wants (a) a stock reorder job at 02:30 local time every night, and (b) a database backup every night. What problems can occur and what would you configure?

<details>
<summary>Show the solution</summary>

**(a) Reorder at 02:30 Berlin time:** on the March night, 02:30 does not exist (clocks jump from 02:00 to 03:00) — the job may be skipped or run late, depending on the scheduler. On the October night, 02:30 occurs twice — the job may run twice and order stock twice.
**Fix:** move it out of the window, for example to 04:00 local; make it idempotent per **business date** (claim `reorder:2026-10-25`, unique orders per shop and date), so a double trigger does nothing.

**(b) Backup:** it has no reason to follow local time. Schedule it in **UTC** (for example, `0 1 * * *` UTC), so it runs exactly every 24 hours all year, and monitor it with a heartbeat.

</details>

### Exercise 3 — Review a scheduled job

**Objective:** practise spotting problems.
**The scenario:** the API (running on four instances) contains `cron.schedule("0 9 * * *", sendRenewalReminders)` with no time zone. `sendRenewalReminders` loads all subscriptions renewing in three days and emails each customer, with no record of what was sent. Errors are caught and ignored. List the problems and a better design.

<details>
<summary>Show the solution</summary>

**Problems**
1. **Four instances** → four reminders per customer.
2. **No time zone** → 09:00 in the server's zone (probably UTC), which is the wrong time for customers and shifts with daylight saving relative to local time.
3. **No record of sends** → retries or re-runs send duplicates; a missed day sends nothing ("renewing in exactly three days" skips anyone due in the missed window).
4. **Errors ignored** → silent failures; no heartbeat, so a job that stops running goes unnoticed.
5. **All in one run in the web process** → slow for large numbers, and slows the API.

**Better design**
- A queue scheduler (one tick) every hour, in UTC.
- Select subscriptions renewing within the next three days **without** a `reminder_sent_at` for this renewal date — this covers missed runs automatically.
- Queue one email job per subscription with key `renewal-reminder:{subscriptionId}:{renewalDate}`; set `reminder_sent_at` when queued, in the same transaction.
- Optionally respect each customer's time zone by only sending during their daytime.
- Structured logs, failure alerts and a heartbeat; workers separate from the web servers.

</details>

### Exercise 4 — Production scenario: a missed billing run

**Objective:** practise handling scheduled-job incidents.
**The scenario:** on 2 December, finance notices that no invoices were generated on 1 December. Investigation shows a deployment at 05:58 on the 1st replaced the worker containers, and the 06:00 tick was missed. Describe the immediate fix and the long-term changes.

<details>
<summary>Show the solution</summary>

**Immediate**
1. Confirm in the run history that no run claimed period `2026-12` and no invoices exist for it.
2. Trigger the job manually for `2026-12` ("run now"). Because the job claims the period and invoices are unique per `(subscription, period)`, this is safe even if a partial run had happened.
3. Check the payment results and failures; communicate with finance and, if charges are late, with customers.

**Long-term**
4. **Catch-up**: each run processes every unfinished period since the last success, so a later tick (or the next hourly check) would have recovered automatically. Consider running the billing check **hourly** on the 1st and 2nd, with per-period claims, instead of once at 06:00.
5. **Platform settings**: a scheduler that tolerates missed starts (`startingDeadlineSeconds` on Kubernetes, or a queue scheduler independent of worker restarts).
6. **Monitoring**: a heartbeat expecting the billing run by 07:00 on the 1st, paging the on-call engineer; an alert on the invoice count for the day.
7. **Deployment practice**: graceful worker shutdown, and avoiding deployments around critical scheduled times (or making them irrelevant through the measures above).
8. **Post-incident review** documenting the timeline and the changes ({{ch:observability-and-incidents}}).

</details>

## Summary

**Scheduled jobs** run code on a timetable: clean-ups, reports, invoices, reminders, retries. Their timing is written as **cron expressions** — minute, hour, day of month, month, day of week — with lists, ranges and steps; remember that when both day fields are restricted, **either** may match, and always check expressions by listing their next runs.

A cron expression is evaluated in a **time zone**: use **UTC** for system jobs and an explicit **IANA time zone** for jobs tied to local time, avoid the 01:00–03:00 window when daylight saving time can skip or repeat an hour, and handle per-user local times with a frequent scan for due work.

Jobs can be triggered by system cron, in-process libraries, **queue schedulers** or **platform schedulers**. With several servers, ensure **one run per period** — one shared trigger, a distributed lock, or a **unique run record per period** — and make the work itself **idempotent**. Prevent overlap, batch or **fan out** large jobs to queues, shut down gracefully, and **catch up** missed periods from the last success, with limits and alerts.

Monitor jobs with structured logs, metrics, a run history and **heartbeat monitoring**, because the most dangerous failure — a job that never runs — produces no error at all. Give critical jobs "run now" and "pause" controls, protected and audited.

## Key terms

- **Scheduled job** — A task run automatically according to a schedule rather than a request.
- **cron** — The Unix scheduling service, and the expression format many schedulers use.
- **Cron expression** — A five-field description of when a job runs: minute, hour, day of month, month and day of week.
- **crontab** — A file listing cron schedules and the commands they run.
- **Step value** — A cron field such as `*/15` matching every nth value.
- **IANA time zone** — A named time zone such as `Europe/London`, including its daylight-saving rules.
- **Daylight saving time (DST)** — The seasonal change of local clocks, which skips or repeats an hour.
- **In-process scheduler** — A library inside an application process that triggers functions on a schedule.
- **Queue scheduler** — A schedule stored in shared queue storage that creates one job per tick for any worker.
- **Platform scheduler** — A cloud or cluster service that starts jobs on schedule, such as a Kubernetes CronJob.
- **Overlap** — A scheduled run starting while the previous run is still in progress.
- **Distributed lock** — A lock shared across servers so only one performs a task at a time.
- **Run record** — A stored record of a job run, its period and its status, used for claims and history.
- **Period key** — An identifier for the unit of work a run covers, such as `2026-11` for a monthly job.
- **Idempotent job** — A job that produces the same result whether run once or several times for a period.
- **Catch-up (backfill)** — Processing periods that were missed while a job did not run.
- **Fan-out** — A job that queues many small tasks for workers instead of doing all the work itself.
- **Heartbeat monitoring** — Alerting when a job fails to report a successful run within its expected time.
- **Dead man's switch** — Another name for heartbeat monitoring: an alarm triggered by the absence of a signal.
- **Workflow orchestrator** — A system that runs multi-step, scheduled or long-running workflows with retries and history.

## What comes next

Scheduled jobs are one kind of background work. The next chapter, {{ch:queues}}, covers background jobs in general: why slow work leaves the request, how queues and workers operate, retries with backoff, dead-letter queues, delivery guarantees, idempotency, priorities and scaling workers — the machinery that most scheduled jobs hand their work to.
