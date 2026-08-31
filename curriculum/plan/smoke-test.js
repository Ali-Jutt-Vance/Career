/**
 * Smoke test for the compiled reader — loads output/index.html in a real
 * browser, exercises the Plan tab, and asserts the interactive pieces work.
 *
 * Run: node plan/smoke-test.js
 */
const puppeteer = require('puppeteer');
const path = require('path');

const URL = 'file:///' + path.join(__dirname, '..', 'output', 'index.html').replace(/\\/g, '/');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? '  — ' + detail : ''}`);
}

(async () => {
  console.log('\n  Smoke test: ' + URL + '\n');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // Pretend it is day 1 so the Plan tab has a real "today".
  await page.evaluateOnNewDocument(() => {
    const FAKE = new Date('2026-08-18T09:00:00');
    const _Date = Date;
    // eslint-disable-next-line no-global-assign
    Date = class extends _Date {
      constructor(...a) { return a.length ? new _Date(...a) : new _Date(FAKE); }
      static now() { return FAKE.getTime(); }
    };
    Date.parse = _Date.parse;
    Date.UTC = _Date.UTC;
  });

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 120000 });
  await new Promise(r => setTimeout(r, 800));

  check('page loads without JS errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  const planVisible = await page.$eval('#plan-pane', el => el.offsetHeight > 100).catch(() => false);
  check('Plan pane renders on open', planVisible);

  const heroDate = await page.$eval('.plan-date', el => el.textContent.trim()).catch(() => '');
  check('Plan opens on today', /18 August 2026/.test(heroDate), heroDate);

  const taskCount = await page.$$eval('.task', els => els.length).catch(() => 0);
  check('Day 1 shows its tasks', taskCount === 4, `${taskCount} tasks`);

  const countdown = await page.$eval('.pc-num', el => el.textContent.trim()).catch(() => '');
  check('Countdown to 1 Jan 2027', countdown === '136', countdown + ' days');

  // Tick the first task and confirm it persists in state.
  await page.click('.task');
  await new Promise(r => setTimeout(r, 400));
  const afterTick = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('career-book-v2') || '{}');
    return { done: Object.keys(s.done || {}).length, todayCount: document.querySelector('.pm strong')?.textContent };
  });
  check('ticking a task persists', afterTick.done === 1, `${afterTick.done} stored`);

  const streak = await page.$$eval('.pm strong', els => els.map(e => e.textContent));
  check('streak counter updates', streak[0] === '1', 'streak=' + streak[0]);

  // Sidebar day list
  const dayLinks = await page.$$eval('.plan-day-link', els => els.length);
  check('sidebar lists all 137 days', dayLinks === 137, `${dayLinks} links`);

  // Navigate to a chapter from the week card
  const chapLink = await page.$('.pw-chapter-link');
  if (chapLink) {
    await chapLink.click();
    await new Promise(r => setTimeout(r, 500));
    const paneActive = await page.$$eval('.chapter-pane.active', els => els.length);
    check('week-card chapter link opens the chapter', paneActive === 1);
  } else {
    check('week-card chapter link exists', false);
  }

  // Full-text search
  await page.click('[data-panel="chapters"]');
  await page.type('#chapter-search', 'refresh token rotation');
  await new Promise(r => setTimeout(r, 500));
  const hits = await page.$$eval('.sr-item', els => els.length).catch(() => 0);
  check('full-text search finds matches', hits > 0, `${hits} chapters`);

  // Theme toggle
  await page.click('#theme-toggle');
  await new Promise(r => setTimeout(r, 200));
  const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('theme toggles', theme === 'light', 'now ' + theme);

  // Today button returns to plan
  await page.click('#today-btn');
  await new Promise(r => setTimeout(r, 400));
  const backOnPlan = await page.$eval('#plan-pane', el => el.style.display !== 'none');
  check('Today button returns to the plan', backOnPlan);

  // ── Reduced budget + Sunday rest ────────────────────────────
  const budget = await page.evaluate(() => {
    const P = window.__PLAN__;
    const sun = P.days.filter(d => d.reduced && d.dow === 'Sunday');
    const wd  = P.days.filter(d => d.reduced && !d.isWeekend);
    const sat = P.days.filter(d => d.reduced && d.dow === 'Saturday');
    return {
      restCount:  sun.length,
      restEmpty:  sun.every(d => d.tasks.length === 0),
      weekdayOK:  wd.every(d => d.totalMins === 180),
      saturdayOK: sat.every(d => d.totalMins === 360),
      totalHours: P.meta.totalHours,
    };
  });
  check('17 Sundays are rest days', budget.restCount === 17 && budget.restEmpty, budget.restCount + ' rest days');
  check('weekdays are exactly 3h from 1 Sep', budget.weekdayOK);
  check('Saturdays are exactly 6h from 1 Sep', budget.saturdayOK);
  check('total is 442 hours', budget.totalHours === 442, budget.totalHours + 'h');

  // Navigate to a Sunday and confirm the rest card renders.
  await page.evaluate(() => {
    const link = [...document.querySelectorAll('.plan-day-link')]
      .find(a => a.dataset.date === '2026-09-06');
    link.click();
  });
  await new Promise(r => setTimeout(r, 400));
  const restCard = await page.$eval('.plan-rest h3', el => el.textContent.trim()).catch(() => '');
  check('Sunday renders the rest card', restCard === 'Day off', restCard);
  const restTasks = await page.$$eval('.task', els => els.length).catch(() => 0);
  check('rest day shows no tasks', restTasks === 0);

  await page.screenshot({ path: path.join(__dirname, '..', 'output', 'preview-plan.png') });

  await browser.close();

  const failed = results.filter(r => !r.ok);
  console.log(`\n  ${results.length - failed.length}/${results.length} checks passed\n`);
  if (failed.length) process.exit(1);
})().catch(e => { console.error('\n[SMOKE TEST ERROR]', e); process.exit(1); });
