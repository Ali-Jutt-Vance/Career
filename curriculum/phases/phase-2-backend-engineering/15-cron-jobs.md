# Phase 2 — Chapter 15: Cron Jobs & Scheduled Tasks

---

## Chapter Overview

Cron jobs are time-triggered background tasks: send daily reports, expire sessions, clean up orphaned files, sync data, generate invoices, send reminders. They're essential in almost every production application.

**Key challenges:**
- Preventing duplicate runs in multi-instance deployments
- Handling failures and retries
- Monitoring — knowing if a job didn't run or ran too long
- Timezone awareness

---

## Beginner Theory

### Cron Syntax

```
┌──────────── minute (0-59)
│ ┌────────── hour (0-23)
│ │ ┌──────── day of month (1-31)
│ │ │ ┌────── month (1-12 or JAN-DEC)
│ │ │ │ ┌──── day of week (0-7 or SUN-SAT; 0 and 7 = Sunday)
│ │ │ │ │
* * * * *

Examples:
"*/5 * * * *"     — every 5 minutes
"0 * * * *"       — every hour on the hour
"0 9 * * 1-5"     — 9am Monday–Friday
"0 0 1 * *"       — midnight on the 1st of every month
"0 0 * * 0"       — midnight every Sunday
"30 8,20 * * *"   — 8:30am and 8:30pm daily
"*/15 9-17 * * 1-5" — every 15 min during business hours
```

---

## Basic Examples

### node-cron

```javascript
// npm install node-cron

const cron = require("node-cron");

// Run every day at 2am
cron.schedule("0 2 * * *", async () => {
  console.log("Running nightly cleanup...");
  try {
    await cleanupExpiredSessions();
    await deleteOrphanedFiles();
    await archiveOldLogs();
    console.log("Nightly cleanup done");
  } catch (err) {
    logger.error("Nightly cleanup failed", { error: err.message });
    await alerting.notify("nightly-cleanup-failed", err);
  }
}, {
  timezone: "America/New_York"  // always specify timezone
});

// Run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  await checkPendingPayments();
});

// Run once at a specific time
const task = cron.schedule("30 9 * * 1", async () => {
  await sendWeeklyReports();
}, { scheduled: false });  // don't start yet

// Start/stop programmatically
task.start();
// Later:
task.stop();
```

### node-schedule (Date-based)

```javascript
// npm install node-schedule

const schedule = require("node-schedule");

// Cron expression
const j = schedule.scheduleJob("0 9 * * 1", function() {
  sendWeeklyDigest();
});

// Date-based (run at specific datetime)
const date = new Date(2025, 11, 31, 23, 59, 0);  // Dec 31
schedule.scheduleJob(date, function() {
  sendHappyNewYear();
});

// Recurrence rule
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [1, 3, 5];  // Mon, Wed, Fri
rule.hour      = 14;
rule.minute    = 0;
schedule.scheduleJob(rule, function() {
  generateReport();
});

// Cancel
j.cancel();
```

---

## Intermediate Concepts

### Distributed Cron with Redis Lock

In a multi-instance deployment, every instance runs the cron schedule — jobs run N times. Use a distributed lock so only one instance executes each job.

```javascript
// npm install bullmq (handles distributed scheduling)
// Or use a distributed lock manually:

const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL);

async function withDistributedLock(lockKey, ttlMs, fn) {
  const lockValue = crypto.randomUUID();
  const acquired  = await redis.set(lockKey, lockValue, "NX", "PX", ttlMs);

  if (!acquired) {
    // Another instance holds the lock — skip this run
    logger.debug(`Skipping job ${lockKey} — already running on another instance`);
    return;
  }

  try {
    await fn();
  } finally {
    // Only release if we still hold the lock (Lua script for atomicity)
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(script, 1, lockKey, lockValue);
  }
}

// Usage in cron
cron.schedule("0 2 * * *", async () => {
  await withDistributedLock("job:nightly-cleanup", 30 * 60 * 1000, async () => {
    await runNightlyCleanup();
  });
});
```

### BullMQ for Scheduled Jobs

BullMQ is a better choice for production — it handles distributed scheduling, retries, monitoring, and job history natively.

```javascript
// npm install bullmq ioredis

const { Queue, Worker } = require("bullmq");

const scheduledJobsQueue = new Queue("scheduled-jobs", {
  connection: { host: process.env.REDIS_HOST, port: 6379 }
});

// Define recurring jobs (uses Redis for distributed coordination)
async function setupScheduledJobs() {
  await scheduledJobsQueue.upsertJobScheduler(
    "nightly-cleanup",
    { pattern: "0 2 * * *", tz: "UTC" },
    { name: "nightly-cleanup", data: {} }
  );

  await scheduledJobsQueue.upsertJobScheduler(
    "weekly-report",
    { pattern: "0 9 * * 1", tz: "America/New_York" },
    { name: "weekly-report", data: { reportType: "weekly" } }
  );

  await scheduledJobsQueue.upsertJobScheduler(
    "session-expiry",
    { pattern: "*/10 * * * *", tz: "UTC" },
    { name: "session-expiry", data: {} }
  );
}

// Worker processes scheduled jobs
const worker = new Worker("scheduled-jobs", async (job) => {
  logger.info(`Running job: ${job.name}`);
  const start = Date.now();

  switch (job.name) {
    case "nightly-cleanup":
      await runNightlyCleanup();
      break;
    case "weekly-report":
      await generateAndSendWeeklyReport();
      break;
    case "session-expiry":
      await expireStaleSessions();
      break;
    default:
      throw new Error(`Unknown job: ${job.name}`);
  }

  logger.info(`Job ${job.name} completed in ${Date.now() - start}ms`);
}, {
  connection: { host: process.env.REDIS_HOST },
  concurrency: 2
});

worker.on("failed", (job, err) => {
  logger.error("Scheduled job failed", { name: job.name, error: err.message });
  alerting.notify(`Job ${job.name} failed: ${err.message}`);
});
```

### Job Monitoring (Healthchecks.io / Cronitor)

```javascript
// Send a "heartbeat" ping when a job runs successfully
// Monitoring service alerts you if a heartbeat is missed

const https = require("https");

async function pingHealthcheck(checkId) {
  const url = `https://hc-ping.com/${checkId}`;
  return new Promise((resolve) => {
    https.get(url, resolve).on("error", () => resolve(null));
  });
}

cron.schedule("0 2 * * *", async () => {
  const checkId = process.env.HEALTHCHECK_CLEANUP_ID;

  try {
    // Signal job started
    await pingHealthcheck(`${checkId}/start`);

    await runNightlyCleanup();

    // Signal job succeeded
    await pingHealthcheck(checkId);
  } catch (err) {
    // Signal job failed
    await pingHealthcheck(`${checkId}/fail`);
    throw err;
  }
});
```

---

## Advanced Concepts

### Dynamic Job Scheduling

```javascript
// Store jobs in database, load and schedule dynamically
// Useful for user-defined reminders, scheduled reports

const activeJobs = new Map();

async function loadAndScheduleJobs() {
  const jobs = await jobRepository.findAllActive();

  for (const job of jobs) {
    scheduleJob(job);
  }
}

function scheduleJob(job) {
  if (activeJobs.has(job.id)) {
    activeJobs.get(job.id).destroy();
  }

  const task = cron.schedule(job.cronExpression, async () => {
    await executeJob(job);
  }, { timezone: job.timezone || "UTC", scheduled: job.isActive });

  activeJobs.set(job.id, task);
}

// When a job's schedule changes:
async function updateJobSchedule(jobId, newCronExpression) {
  const job = await jobRepository.update(jobId, { cronExpression: newCronExpression });
  scheduleJob(job);  // Replace existing task
}

async function disableJob(jobId) {
  const task = activeJobs.get(jobId);
  if (task) task.stop();
  await jobRepository.update(jobId, { isActive: false });
}
```

### Long-Running Jobs

```javascript
// For jobs that take minutes to hours:
// 1. Split into smaller chunks
// 2. Use worker threads for CPU-intensive work
// 3. Report progress to DB for monitoring

async function runBulkEmailCampaign(campaignId) {
  const campaign = await campaignRepo.findById(campaignId);
  const totalRecipients = await recipientRepo.countByCampaign(campaignId);

  await campaignRepo.update(campaignId, {
    status: "running",
    startedAt: new Date(),
    totalRecipients
  });

  const BATCH_SIZE = 100;
  let offset = 0;
  let sent = 0;

  while (true) {
    const batch = await recipientRepo.findByCampaign(campaignId, { offset, limit: BATCH_SIZE });
    if (!batch.length) break;

    await Promise.allSettled(
      batch.map(r => emailService.send({ to: r.email, ...campaign.content }))
    );

    sent += batch.length;
    offset += BATCH_SIZE;

    // Update progress in DB every batch
    await campaignRepo.update(campaignId, { sentCount: sent });
  }

  await campaignRepo.update(campaignId, {
    status: "completed",
    completedAt: new Date()
  });
}
```

---

## Interview Preparation

**Q1: How do you prevent a cron job from running on every instance in a multi-server deployment?**
A: Use a distributed lock (Redis SET NX) at the start of the job. Only the instance that acquires the lock executes the job; others skip. BullMQ's job schedulers handle this natively — the scheduler only creates one job instance in Redis regardless of how many workers are running. Alternative: use a single dedicated "cron server" instance, but this is a single point of failure.

**Q2: What happens if a cron job fails? How do you handle it?**
A: Catch errors inside the job handler and log them with full context. For critical jobs, send alerts (Slack, PagerDuty). Use healthcheck monitoring (Cronitor, Healthchecks.io) so you're alerted if a job doesn't run at all. For retriable failures, use BullMQ with retry settings. For idempotent jobs, safe to retry. For non-idempotent jobs (send email), ensure you check "was this already sent?" before doing the work.

**Q3: Why should you always specify a timezone in cron jobs?**
A: Server timezone can change (e.g., daylight saving adjustments, server migration to a different region). Your "9am daily report" would run at 8am or 10am after a DST change. Always specify the timezone explicitly (`{ timezone: "America/New_York" }`) — the cron library handles DST adjustments. In UTC-only environments, use UTC but document when that corresponds to in the relevant user timezone.

---

## Practical Tasks

### Beginner (10 Tasks)
1. Set up node-cron to log "tick" every minute — verify it runs.
2. Schedule a daily cleanup of temporary files older than 24 hours.
3. Schedule a weekly email report every Monday at 9am with timezone.
4. Create a session expiry job that runs every 10 minutes.
5. Wrap a cron job in try/catch with error logging.
6. Use `cron.validate()` to validate a cron expression before scheduling.
7. List all currently scheduled jobs in a `/admin/jobs` endpoint.
8. Stop and start a scheduled task based on an environment flag.
9. Schedule a one-time job using `node-schedule` with a Date object.
10. Test cron jobs by temporarily setting them to run every 30 seconds.

### Intermediate (10 Tasks)
1. Implement distributed lock with Redis to prevent duplicate runs.
2. Set up BullMQ recurring jobs with `upsertJobScheduler`.
3. Add job monitoring with Healthchecks.io pings.
4. Build a dynamic job scheduler loaded from the database.
5. Implement progress tracking for a long-running batch job.
6. Add admin endpoints to enable/disable/trigger jobs manually.
7. Implement job timeout: kill a job if it runs longer than 5 minutes.
8. Build a job history table logging run time, duration, status.
9. Add alerting on job failures (Slack notification).
10. Handle idempotency: check if job already completed before running.

### Advanced (10 Tasks)
1. Build a job queue with BullMQ for distributed cron across 5 workers.
2. Implement graceful job shutdown on SIGTERM.
3. Build a real-time job dashboard with status and last run info.
4. Implement database-backed job scheduler with UI for non-technical users.
5. Add priority queue: urgent jobs run before regular jobs.
6. Build dead letter queue for permanently failed jobs.
7. Implement distributed tracing through scheduled jobs.
8. Build auto-scaling: spin up more workers when job queue depth grows.
9. Implement a cron job chaos test (randomly delay/fail jobs, measure recovery).
10. Build a job audit log with tamper detection.

---

## Self Assessment
1. What does `"0 9 * * 1"` mean in cron syntax?
2. Why is a distributed lock needed in multi-instance deployments?
3. What is the difference between `node-cron` and `BullMQ` for scheduling?
4. Why should you always specify a timezone in cron jobs?
5. What is healthcheck monitoring for cron jobs?
6. How do you handle a job that runs longer than expected?
7. What is job idempotency and why does it matter for retry?
8. How do you stop all cron jobs gracefully on SIGTERM?
9. What happens if a cron job throws an unhandled exception?
10. How would you implement a "send at 9am in user's local timezone" feature?

---

## Cheat Sheet

### Cron Syntax
```
*/5 * * * *     — every 5 minutes
0 * * * *       — every hour
0 9 * * 1       — 9am every Monday
0 2 * * *       — 2am daily
0 0 1 * *       — midnight 1st of month
```

### node-cron
```javascript
cron.schedule("0 2 * * *", async () => { ... }, { timezone: "UTC" });
```

### BullMQ Recurring
```javascript
await queue.upsertJobScheduler("job-name", { pattern: "0 9 * * *", tz: "UTC" }, { name: "job-name", data: {} });
```

### Distributed Lock
```javascript
const acquired = await redis.set("lock:job", uuid, "NX", "PX", ttlMs);
if (!acquired) return;  // Skip — another instance running it
```
