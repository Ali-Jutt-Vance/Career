/**
 * Plan builder — expands plan-data.js into:
 *   1. data/plan.json                             (consumed by the reader app)
 *   2. phases/phase-12-daily-execution-plan/*.md   (part of the book)
 *
 * Two budget regimes:
 *   before BUDGET_SWITCH — 4h30 weekdays / 7h weekend days, seven working days
 *   from  BUDGET_SWITCH — 3h Mon–Fri, 6h Saturday, SUNDAY OFF (zero tasks)
 *
 * Weeks run Tuesday → Monday. Day specs are authored in calendar order.
 * Weeks with six specs get a Sunday rest day inserted at index 5.
 *
 * Run: node plan/build-plan.js
 */

const fs   = require('fs-extra');
const path = require('path');
const { TRACKS, SLOTS, ANCHORS, WEEKS, BUDGET_SWITCH } = require('./plan-data');

const ROOT       = path.join(__dirname, '..');
const DATA_DIR   = path.join(ROOT, 'data');
const PLAN_PHASE = path.join(ROOT, 'phases', 'phase-12-daily-execution-plan');

const START = '2026-08-18';
const END   = '2027-01-01';

const DOW   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function iso(d) { return d.toISOString().slice(0, 10); }
function parse(s) { const [y,m,dd] = s.split('-').map(Number); return new Date(Date.UTC(y, m-1, dd)); }
function addDays(d, n) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
function pretty(d) { return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
function shortDate(d) { return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTH[d.getUTCMonth()].slice(0,3)}`; }
function daysBetweenISO(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }

/** The rest-day spec inserted on Sundays once the reduced budget begins. */
const REST_DAY = {
  focus: 'Rest day — no tasks',
  rest: true,
  tasks: [],
};

/** Which slot table applies to a given date. */
function slotsFor(dateISO, dow) {
  const reduced = dateISO >= BUDGET_SWITCH;
  if (!reduced) return (dow === 0 || dow === 6) ? SLOTS.legacyWeekend : SLOTS.legacyWeekday;
  if (dow === 0) return SLOTS.rest;          // Sunday off
  if (dow === 6) return SLOTS.saturday;      // 6 hours
  return SLOTS.weekday;                      // 3 hours
}

/** Expand the week/day structures into a flat, dated list of days. */
function buildDays() {
  const days  = [];
  const end   = parse(END);
  let cursor  = parse(START);
  let dayNum  = 1;

  for (const week of WEEKS) {
    // Six authored days means Sunday is a rest day; insert it in calendar position.
    const specs = week.d.length === 6
      ? [...week.d.slice(0, 5), REST_DAY, week.d[5]]
      : week.d;

    for (const spec of specs) {
      if (cursor > end) break;

      const dateISO = iso(cursor);
      const dow     = cursor.getUTCDay();
      const slots   = slotsFor(dateISO, dow);
      const slotMap = Object.fromEntries(slots.map(s => [s.id, s]));
      const isRest  = slots.length === 0;

      const tasks = (isRest ? [] : spec.tasks).map(([track, slotId, text], idx) => {
        const slot = slotMap[slotId];
        if (!slot) {
          throw new Error(`Week ${week.n} ${dateISO}: unknown slot "${slotId}" (available: ${slots.map(s => s.id).join(', ')})`);
        }
        return {
          id:         `d${dayNum}-t${idx + 1}`,
          track,
          trackLabel: TRACKS[track].label,
          color:      TRACKS[track].color,
          slot:       slot.id,
          time:       slot.time,
          mins:       slot.mins,
          slotName:   slot.name,
          text,
        };
      });

      days.push({
        n:         dayNum,
        date:      dateISO,
        dow:       DOW[dow],
        dowShort:  DOW[dow].slice(0, 3),
        pretty:    pretty(cursor),
        short:     shortDate(cursor),
        month:     MONTH[cursor.getUTCMonth()],
        monthIdx:  cursor.getUTCMonth(),
        year:      cursor.getUTCFullYear(),
        week:      week.n,
        block:     week.block,
        weekTitle: week.title,
        focus:     spec.focus.replace(/^Day\s+\d+\s*—\s*/, ''),
        isWeekend: dow === 0 || dow === 6,
        isRest:    isRest,
        isExam:    !!spec.exam,
        reduced:   dateISO >= BUDGET_SWITCH,
        totalMins: tasks.reduce((a, t) => a + t.mins, 0),
        tasks,
      });

      cursor = addDays(cursor, 1);
      dayNum++;
    }
  }
  return days;
}

function buildPlan() {
  const days = buildDays();

  const weeks = WEEKS.map(w => {
    const wd = days.filter(d => d.week === w.n);
    return {
      n: w.n,
      block: w.block,
      title: w.title,
      theme: w.theme,
      chapters: w.chapters,
      deliverable: w.deliverable,
      milestone: w.milestone,
      dates: wd.map(d => d.date),
      hours: Math.round(wd.reduce((a, d) => a + d.totalMins, 0) / 60 * 10) / 10,
    };
  });

  const blocks = [];
  for (const w of weeks) {
    let b = blocks.find(x => x.name === w.block);
    if (!b) { b = { name: w.block, weeks: [] }; blocks.push(b); }
    b.weeks.push(w.n);
  }

  const workingDays = days.filter(d => !d.isRest);

  return {
    meta: {
      start: START,
      end: END,
      totalDays: days.length,
      workingDays: workingDays.length,
      restDays: days.length - workingDays.length,
      totalWeeks: weeks.length,
      totalTasks: days.reduce((a, d) => a + d.tasks.length, 0),
      totalHours: Math.round(days.reduce((a, d) => a + d.totalMins, 0) / 60),
      budgetSwitch: BUDGET_SWITCH,
      weeklyHours: 21,
      generated: new Date().toISOString(),
    },
    anchors: ANCHORS,
    tracks: TRACKS,
    slots: SLOTS,
    blocks,
    weeks,
    days,
  };
}

// ── Markdown rendering (the plan as book chapters) ────────────────

function chapterIdFor(ref) {
  const [phase, file] = ref.split('/');
  return `${phase}--${file.replace(/^\d+-/, '')}`;
}

function refTitle(ref) {
  const file = ref.split('/')[1].replace(/^\d+-/, '').replace(/-/g, ' ');
  return file.replace(/\b\w/g, c => c.toUpperCase());
}

function renderMonth(plan, monthIdx, year, chapterNo) {
  const days = plan.days.filter(d => d.monthIdx === monthIdx && d.year === year);
  if (!days.length) return null;

  const name = MONTH[monthIdx];
  const hours = Math.round(days.reduce((a, d) => a + d.totalMins, 0) / 60);
  const rest = days.filter(d => d.isRest).length;

  let md = `# Phase 12 — Chapter ${chapterNo}: ${name} ${year}\n\n`;
  md += `> **${days.length} days · Day ${days[0].n} to Day ${days[days.length - 1].n} · `;
  md += `${hours} scheduled hours${rest ? ` · ${rest} rest days` : ''}**\n\n`;

  const weekNums = [...new Set(days.map(d => d.week))];
  md += `## Chapter Overview\n\n`;
  md += `This chapter covers weeks ${weekNums.join(', ')} of the 20-week plan. `;
  md += `Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — `;
  md += `the app tracks your streak and completion rate across all ${plan.meta.totalDays} days.\n\n`;

  md += `| Week | Dates | Hours | Focus | Milestone |\n|---|---|---|---|---|\n`;
  for (const wn of weekNums) {
    const w  = plan.weeks.find(x => x.n === wn);
    const wd = days.filter(d => d.week === wn);
    md += `| **W${wn}** | ${wd[0].short} – ${wd[wd.length - 1].short} | ${w.hours}h | ${w.title} | ${w.milestone} |\n`;
  }
  md += `\n---\n\n`;

  let lastWeek = null;
  for (const day of days) {
    if (day.week !== lastWeek) {
      lastWeek = day.week;
      const w = plan.weeks.find(x => x.n === day.week);
      md += `## Week ${w.n} — ${w.title}\n\n`;
      md += `*Block ${w.block} · ${w.hours} hours*\n\n`;
      md += `${w.theme}\n\n`;
      if (w.chapters.length) {
        md += `**Chapters this week:**\n\n`;
        for (const c of w.chapters) md += `- [${refTitle(c)}](#${chapterIdFor(c)})\n`;
        md += `\n`;
      }
      md += `**Deliverable:** ${w.deliverable}\n\n`;
      md += `**Milestone:** ${w.milestone}\n\n`;
    }

    if (day.isRest) {
      md += `### Day ${day.n} — ${day.pretty} · REST\n\n`;
      md += `No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. `;
      md += `Rest is what makes the other six days sustainable for twenty weeks.\n\n`;
      continue;
    }

    md += `### Day ${day.n} — ${day.pretty}${day.isExam ? ' ⭐ EXAM' : ''}\n\n`;
    md += `**${day.focus}**\n\n`;
    md += `| Time | Track | Task |\n|---|---|---|\n`;
    for (const t of day.tasks) {
      md += `| \`${t.time}\` | **${t.trackLabel}** | ${t.text.replace(/\|/g, '\\|')} |\n`;
    }
    md += `\n*Total: ${Math.floor(day.totalMins / 60)}h ${day.totalMins % 60}m*\n\n`;
  }

  return { name: `${String(chapterNo).padStart(2, '0')}-${name.toLowerCase()}-${year}.md`, md };
}

function renderOverviewChapter(plan) {
  const sw = pretty(parse(plan.meta.budgetSwitch));

  let md = `# Phase 12 — Chapter 1: The 137-Day Plan\n\n`;
  md += `> *"A goal without a date is a wish. A date without a daily task is a fantasy."*\n\n---\n\n`;

  md += `## Chapter Overview\n\n`;
  md += `This is the operating schedule for the whole book: **${plan.meta.totalDays} days**, `;
  md += `**${plan.meta.totalWeeks} weeks**, **${plan.meta.totalTasks} scheduled tasks**, `;
  md += `**${plan.meta.totalHours} hours** of deliberate work, running from `;
  md += `**${pretty(parse(plan.meta.start))}** to **${pretty(parse(plan.meta.end))}**.\n\n`;
  md += `Of those days, **${plan.meta.workingDays} are working days and ${plan.meta.restDays} are rest days**.\n\n`;

  md += `### Two budget regimes\n\n`;
  md += `The plan runs at two different intensities, switching on **${sw}**.\n\n`;
  md += `| | Weeks 1–2 (18–31 Aug) | Weeks 3–20 (1 Sep → 1 Jan) |\n|---|---|---|\n`;
  md += `| Mon–Fri | 4h 30m | **3h** |\n`;
  md += `| Saturday | 7h | **6h** |\n`;
  md += `| Sunday | 7h | **OFF** |\n`;
  md += `| Weekly total | 36h 30m | **21h** |\n\n`;
  md += `The first two weeks are a deliberate sprint while motivation is highest and the material is `;
  md += `foundational. From September the plan settles into **21 hours a week, held for eighteen straight weeks**. `;
  md += `That is the number that matters, because a schedule you abandon in October is worth less than a smaller one you keep.\n\n`;

  md += `### Sunday is off\n\n`;
  md += `Every Sunday from ${sw} carries **zero tasks**. This is not slack in the plan; it is load-bearing. `;
  md += `Eighteen weeks is long enough that recovery stops being optional, and a plan with no scheduled rest gets `;
  md += `abandoned rather than adjusted. The streak counter in the app treats Sundays as neutral — resting does not break it.\n\n`;
  md += `The weekly review moved to the last Saturday slot so that Sunday stays genuinely empty.\n\n`;

  md += `### What the reduced budget cut\n\n`;
  md += `Dropping from 36 to 21 hours a week is a 38% cut, and pretending the same content fits would be dishonest. `;
  md += `These were removed:\n\n`;
  md += `- **Project 3 (full-stack Next.js app)** — replaced by a one-page portfolio site in week 16\n`;
  md += `- **Frontend phase** — demoted to reference reading rather than scheduled study\n`;
  md += `- **GraphQL, MongoDB, TypeORM, EKS, CloudFormation** — reference only\n`;
  md += `- **LeetCode volume** — from ~250 problems to ~140, weighted toward Mediums\n`;
  md += `- **Proposal volume** — from 15 a week to 10\n\n`;
  md += `These were protected, because they are what decides a senior offer:\n\n`;
  md += `- **PostgreSQL depth** — query plans, indexes, transactions. The biggest interview differentiator.\n`;
  md += `- **System design** — two full weeks plus the named case studies.\n`;
  md += `- **AI engineering** — the whole RAG pipeline with measured retrieval quality.\n`;
  md += `- **Authentication** — refresh rotation, OAuth, multi-tenancy.\n`;
  md += `- **IELTS** — the complete ramp to the exam, untouched.\n`;
  md += `- **Applications** — still five every weekday from 6 October.\n\n`;

  md += `### The four tracks\n\n`;
  md += `| Track | What it is | Why it runs continuously |\n|---|---|---|\n`;
  md += `| **Engineering** | Chapters, code, two shipped projects | Skill decays without daily contact |\n`;
  md += `| **IELTS** | Band 7.5+, exam ${pretty(parse(plan.anchors.ieltsExam))} | Language gains come from frequency, not duration |\n`;
  md += `| **Business** | Proposals, clients, contracts, revenue | A pipeline fed intermittently produces nothing |\n`;
  md += `| **Job Hunt** | Applications, interviews, offers | Applications take 4–8 weeks to convert |\n\n`;

  md += `### The daily budget, from ${sw}\n\n`;
  md += `**Weekday — 3 hours**\n\n| Time | Block | Length |\n|---|---|---|\n`;
  for (const s of SLOTS.weekday) md += `| \`${s.time}\` | ${s.name} | ${s.mins} min |\n`;
  md += `\n**Saturday — 6 hours**\n\n| Time | Block | Length |\n|---|---|---|\n`;
  for (const s of SLOTS.saturday) md += `| \`${s.time}\` | ${s.name} | ${s.mins} min |\n`;
  md += `\n**Sunday — rest.**\n\n`;
  md += `The dawn block is the reason this works while employed. Ninety minutes before work, five days a week, `;
  md += `is thirty-two hours a month that nothing can take from you — no late meeting, no exhausting day, no social `;
  md += `obligation. Evening study is the first thing life cancels. Morning study is not.\n\n`;
  md += `At three hours a day the evening block is a single hour, which changes how you use it: it is for **building `;
  md += `and drilling**, not for reading. Reading happens at dawn when your mind is clear. If you find yourself reading `;
  md += `documentation at 21:00, the day has gone wrong.\n\n`;

  md += `### The six blocks\n\n`;
  for (const b of plan.blocks) {
    const ws = b.weeks.map(n => plan.weeks.find(w => w.n === n));
    const firstDay = plan.days.find(d => d.week === ws[0].n);
    const lastDay  = [...plan.days].reverse().find(d => d.week === ws[ws.length - 1].n);
    md += `**Block ${b.name}** — weeks ${b.weeks[0]}–${b.weeks[b.weeks.length - 1]} `;
    md += `(${firstDay.short} – ${lastDay.short})\n\n`;
    for (const w of ws) md += `- *W${w.n}* — ${w.title}\n`;
    md += `\n`;
  }

  md += `### Fixed anchors\n\n| Date | Anchor |\n|---|---|\n`;
  md += `| ${pretty(parse(plan.anchors.ieltsBooking))} | IELTS booked and paid — do not let this slip |\n`;
  md += `| ${pretty(parse(plan.anchors.proposalStart))} | First client proposals go out |\n`;
  md += `| ${pretty(parse(plan.meta.budgetSwitch))} | **Budget drops to 3h/day, Sundays off** |\n`;
  md += `| ${pretty(parse(plan.anchors.applyStart))} | Job applications open — 5 per weekday from here on |\n`;
  md += `| ${pretty(parse(plan.anchors.ieltsExam))} | **IELTS EXAM** |\n`;
  md += `| ${pretty(parse(plan.anchors.ieltsResult))} | IELTS results |\n`;
  md += `| ${pretty(parse(plan.anchors.deadline))} | **DEADLINE — job closed** |\n\n`;

  md += `### The full week index\n\n| W | Block | Hours | Title | Deliverable |\n|---|---|---|---|---|\n`;
  for (const w of plan.weeks) {
    md += `| ${w.n} | ${w.block.split('—')[0].trim()} | ${w.hours}h | ${w.title} | ${w.deliverable} |\n`;
  }
  md += `\n`;

  md += `## How to use this\n\n`;
  md += `1. **Open the Plan tab every morning.** It opens on today. Do not plan your day yourself — it is already planned.\n`;
  md += `2. **Tick tasks as you complete them.** Progress persists locally. The streak counter is the honest measure.\n`;
  md += `3. **Missing a day is fine; missing two is a pattern.** Do not "catch up" — resume on today.\n`;
  md += `4. **Take Sunday off properly.** No guilt, no "just an hour". The rest is what makes week 18 possible.\n`;
  md += `5. **The weekly review is the last Saturday slot.** Thirty minutes, and it is the highest-leverage half hour of the week.\n`;
  md += `6. **The milestones are pass/fail.** "Mostly did it" is a no. Be strict — the interviewer will be.\n\n`;

  md += `## Self Assessment\n\n`;
  md += `At the end of every block:\n\n`;
  md += `- Did I hit every milestone, or did I redefine one to make it passable?\n`;
  md += `- Which of the four tracks did I quietly drop, and what did that cost?\n`;
  md += `- Is my dawn block actually happening, or has it migrated to the evening?\n`;
  md += `- Am I genuinely resting on Sundays, or leaking work into them and burning out slowly?\n`;
  md += `- What is my current streak, and what broke the last one?\n\n`;

  md += `## Cheat Sheet\n\n`;
  md += `- **${plan.meta.totalDays} days · ${plan.meta.totalWeeks} weeks · ${plan.meta.totalHours} hours · ${plan.meta.restDays} rest days**\n`;
  md += `- **From ${sw}: 3h Mon–Fri · 6h Saturday · Sunday OFF · 21h/week**\n`;
  md += `- **Weekday:** 05:30 study (90m) · 12:30 outreach (30m) · 21:00 build (60m)\n`;
  md += `- **Saturday:** 08:00 build (180m) · 11:30 study (90m) · 15:00 drill + review (90m)\n`;
  md += `- **From 6 Oct:** 5 job applications every weekday\n`;
  md += `- **From 31 Aug:** proposals every weekday\n`;
  md += `- **IELTS exam:** ${pretty(parse(plan.anchors.ieltsExam))}\n`;
  md += `- **Deadline:** ${pretty(parse(plan.anchors.deadline))}\n`;

  return { name: '01-the-137-day-plan.md', md };
}

async function main() {
  const plan = buildPlan();

  await fs.ensureDir(DATA_DIR);
  await fs.writeJson(path.join(DATA_DIR, 'plan.json'), plan, { spaces: 0 });

  await fs.emptyDir(PLAN_PHASE);
  const files = [renderOverviewChapter(plan)];

  const monthsSeen = [];
  for (const d of plan.days) {
    const key = `${d.year}-${d.monthIdx}`;
    if (!monthsSeen.includes(key)) monthsSeen.push(key);
  }
  monthsSeen.forEach((key, i) => {
    const [year, monthIdx] = key.split('-').map(Number);
    const f = renderMonth(plan, monthIdx, year, i + 2);
    if (f) files.push(f);
  });

  for (const f of files) await fs.writeFile(path.join(PLAN_PHASE, f.name), f.md, 'utf8');

  console.log(`\n  Plan built`);
  console.log(`  ────────────────────────────────────────`);
  console.log(`  Days:      ${plan.meta.totalDays}   (${plan.meta.start} → ${plan.meta.end})`);
  console.log(`  Working:   ${plan.meta.workingDays}   Rest: ${plan.meta.restDays}`);
  console.log(`  Weeks:     ${plan.meta.totalWeeks}`);
  console.log(`  Tasks:     ${plan.meta.totalTasks}`);
  console.log(`  Hours:     ${plan.meta.totalHours}`);
  console.log(`  Chapters:  ${files.length} → phases/phase-12-daily-execution-plan/`);
  console.log('');

  // ── Sanity assertions ───────────────────────────────────────────
  const fail = m => { throw new Error(m); };

  if (plan.days.length !== 137) fail(`Expected 137 days, got ${plan.days.length}`);
  const uniq = new Set(plan.days.map(d => d.date));
  if (uniq.size !== plan.days.length) fail('Duplicate dates in plan');
  if (plan.days[0].date !== START) fail(`Plan starts ${plan.days[0].date}, expected ${START}`);
  if (plan.days[plan.days.length - 1].date !== END) fail(`Plan ends ${plan.days[plan.days.length - 1].date}, expected ${END}`);

  for (let i = 1; i < plan.days.length; i++) {
    if (daysBetweenISO(plan.days[i - 1].date, plan.days[i].date) !== 1) {
      fail(`Gap between ${plan.days[i - 1].date} and ${plan.days[i].date}`);
    }
  }

  // The budget switch must land on a week boundary.
  const switchDay = plan.days.find(d => d.date === BUDGET_SWITCH);
  if (!switchDay) fail(`Budget switch ${BUDGET_SWITCH} is not in the plan`);
  if (switchDay.dow !== 'Tuesday') fail(`Budget switch is a ${switchDay.dow}, expected a Tuesday (week boundary)`);
  const prev = plan.days[plan.days.indexOf(switchDay) - 1];
  if (prev.week === switchDay.week) fail('Budget switch falls mid-week');

  // Every Sunday from the switch must be a rest day with no tasks; nothing else may be.
  for (const d of plan.days) {
    const shouldRest = d.reduced && d.dow === 'Sunday';
    if (shouldRest && (!d.isRest || d.tasks.length)) fail(`${d.date} (Sunday) should be a rest day but has ${d.tasks.length} tasks`);
    if (!shouldRest && d.isRest) fail(`${d.date} (${d.dow}) is marked rest but should not be`);
    if (!shouldRest && d.tasks.length === 0) fail(`${d.date} (${d.dow}) has no tasks`);
  }

  // Daily totals must match the declared budget exactly.
  for (const d of plan.days) {
    if (d.isRest) continue;
    let expected;
    if (!d.reduced) expected = d.isWeekend ? 420 : 270;
    else expected = d.dow === 'Saturday' ? 360 : 180;
    if (d.totalMins !== expected) {
      fail(`${d.date} (${d.dow}) totals ${d.totalMins}m, expected ${expected}m`);
    }
  }

  // The exam must fall on the anchored Saturday.
  const examDays = plan.days.filter(d => d.isExam);
  if (examDays.length !== 1) fail(`Expected exactly 1 exam day, found ${examDays.length}`);
  if (examDays[0].date !== ANCHORS.ieltsExam) fail(`Exam is on ${examDays[0].date}, anchor says ${ANCHORS.ieltsExam}`);
  if (examDays[0].dow !== 'Saturday') fail(`Exam day is a ${examDays[0].dow}, expected Saturday`);

  // Applications must open on the anchored date.
  const applyDay = plan.days.find(d => d.date === ANCHORS.applyStart);
  if (!applyDay.tasks.some(t => /APPLICATIONS OPEN/i.test(t.text))) {
    fail(`No "APPLICATIONS OPEN" task on ${ANCHORS.applyStart}`);
  }

  // Every chapter reference must resolve to a real file.
  const PHASES = path.join(ROOT, 'phases');
  for (const w of plan.weeks) {
    for (const c of w.chapters) {
      if (!fs.existsSync(path.join(PHASES, c + '.md'))) fail(`W${w.n} references missing chapter: ${c}`);
    }
  }

  // Weeks 3-19 are full 21h weeks. Week 20 is short because the plan ends on 1 Jan.
  const fullWeeks = plan.weeks.filter(w => w.n >= 3 && w.n <= 19);
  const odd = fullWeeks.filter(w => w.hours !== 21);
  if (odd.length) fail(`Weeks not at 21h: ${odd.map(w => `W${w.n}=${w.hours}h`).join(", ")}`);
  const lastWeek = plan.weeks.find(w => w.n === 20);

  console.log(`  ✓ 137 days, continuous, ${plan.meta.restDays} Sundays off`);
  console.log(`  ✓ Budget switch on ${switchDay.pretty} (week ${switchDay.week} boundary)`);
  console.log(`  ✓ Daily totals match budget exactly`);
  console.log(`  ✓ Weeks 3-19 all exactly 21h (W20 = ${lastWeek.hours}h, plan ends 1 Jan)`);
  console.log(`  ✓ Exam on ${examDays[0].pretty}`);
  console.log(`  ✓ Applications open ${applyDay.pretty}`);
  console.log(`  ✓ All chapter references resolve\n`);
}

main().catch(e => { console.error('[PLAN BUILD FAILED]', e.message); process.exit(1); });
