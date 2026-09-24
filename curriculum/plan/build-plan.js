/**
 * Plan builder — expands plan-data.js into:
 *   1. data/plan.json                             (consumed by the reader app)
 *   2. phases/phase-12-daily-execution-plan/*.md   (part of the book)
 *
 * One budget, no regimes: 2h Mon–Fri, 4h Saturday, Sunday off. 14h a week,
 * fifty weeks, 25 September 2026 → 12 September 2027. The plan opens with a
 * three-day lead-in (Week 0: Friday, Saturday, Sunday off) so that Week 1 can
 * start on a Monday.
 *
 * Weeks run Monday → Sunday. Day specs are authored in calendar order, six
 * per week; the Sunday rest day is appended automatically.
 *
 * Run: node plan/build-plan.js
 */

const fs   = require('fs-extra');
const path = require('path');
const { TRACKS, SLOTS, ANCHORS, APPLY_QUOTA, CORE, WEEKS } = require('./plan-data');

const ROOT       = path.join(__dirname, '..');
const DATA_DIR   = path.join(ROOT, 'data');
const PLAN_PHASE = path.join(ROOT, 'phases', 'phase-12-daily-execution-plan');

const START = '2026-09-25';
const END   = '2027-09-12';

/** The declared budget, in minutes. Every day must match exactly. */
const WEEKDAY_MINS  = 120;
const SATURDAY_MINS = 240;
const WEEKLY_HOURS  = 14;
const TOTAL_DAYS    = 353;   // 3-day lead-in + 50 full weeks
const TOTAL_WEEKS   = 51;    // Week 0 (lead-in) + Weeks 1–50
const START_DOW     = 'Friday';

const DOW   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function iso(d) { return d.toISOString().slice(0, 10); }
function parse(s) { const [y,m,dd] = s.split('-').map(Number); return new Date(Date.UTC(y, m-1, dd)); }
function addDays(d, n) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
function pretty(d) { return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
function shortDate(d) { return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTH[d.getUTCMonth()].slice(0,3)}`; }
function daysBetweenISO(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }

/** The rest-day spec appended to every week. */
const REST_DAY = {
  focus: 'Rest day — no tasks',
  rest: true,
  tasks: [],
};

/** Which slot table applies to a given day of the week. */
function slotsFor(dow) {
  if (dow === 0) return SLOTS.rest;      // Sunday off
  if (dow === 6) return SLOTS.saturday;  // 4 hours
  return SLOTS.weekday;                  // 2 hours
}

/** Applications expected per week, from the ramping quota table. */
function quotaForWeek(n) {
  let q = 0;
  for (const row of APPLY_QUOTA) if (n >= row.fromWeek) q = row.perWeek;
  return q;
}

/** Expand the week/day structures into a flat, dated list of days. */
function buildDays() {
  const days  = [];
  const end   = parse(END);
  let cursor  = parse(START);
  let dayNum  = 1;

  for (const week of WEEKS) {
    // Six authored days (Mon–Sat); Sunday is appended as rest.
    const specs = week.d.length === 6 ? [...week.d, REST_DAY] : week.d;

    for (const spec of specs) {
      if (cursor > end) break;

      const dateISO = iso(cursor);
      const dow     = cursor.getUTCDay();
      const slots   = slotsFor(dow);
      const slotMap = Object.fromEntries(slots.map(s => [s.id, s]));
      const isRest  = slots.length === 0;

      const tasks = (isRest ? [] : spec.tasks).map(([track, slotId, text], idx) => {
        const slot = slotMap[slotId];
        if (!slot) {
          throw new Error(`Week ${week.n} ${dateISO}: unknown slot "${slotId}" (available: ${slots.map(s => s.id).join(', ')})`);
        }
        if (!TRACKS[track]) {
          throw new Error(`Week ${week.n} ${dateISO}: unknown track "${track}"`);
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
        isExam:    false,
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
      leadIn: !!w.leadIn,
      block: w.block,
      title: w.title,
      theme: w.theme,
      chapters: w.chapters,
      deliverable: w.deliverable,
      milestone: w.milestone,
      applyQuota: quotaForWeek(w.n),
      dsa: w.dsa,
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
      weeklyHours: WEEKLY_HOURS,
      totalApplications: weeks.reduce((a, w) => a + w.applyQuota, 0),
      totalProblems: weeks.reduce((a, w) => a + (w.dsa ? w.dsa.problems : 0), 0),
      generated: new Date().toISOString(),
    },
    anchors: ANCHORS,
    applyQuota: APPLY_QUOTA,
    core: CORE,
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
  md += `This chapter covers weeks ${weekNums.join(', ')} of the fifty-week plan. `;
  md += `Every day below is a contract with yourself. Tick the tasks in the reader's **Plan** tab as you finish them — `;
  md += `the app tracks your streak and completion rate across all ${plan.meta.totalDays} days.\n\n`;

  md += `| Week | Dates | Hours | Apps | DSA | Focus | Milestone |\n|---|---|---|---|---|---|---|\n`;
  for (const wn of weekNums) {
    const w  = plan.weeks.find(x => x.n === wn);
    const wd = days.filter(d => d.week === wn);
    md += `| **W${wn}** | ${wd[0].short} – ${wd[wd.length - 1].short} | ${w.hours}h | ${w.applyQuota || '–'} | ${w.dsa.topic} | ${w.title} | ${w.milestone} |\n`;
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
      if (w.applyQuota) md += `**Applications this week:** ${w.applyQuota}\n\n`;
      if (w.dsa) md += `**DSA drill:** ${w.dsa.topic} — ${w.dsa.problems} problems\n\n`;
    }

    if (day.isRest) {
      md += `### Day ${day.n} — ${day.pretty} · REST\n\n`;
      md += `No tasks. Sunday is a genuine day off and it is part of the plan, not a gap in it. `;
      md += `Rest is what makes fourteen hours a week survivable for fifty straight weeks.\n\n`;
      continue;
    }

    md += `### Day ${day.n} — ${day.pretty}\n\n`;
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
  let md = `# Phase 12 — Chapter 1: The 350-Day Plan\n\n`;
  md += `> *"A goal without a date is a wish. A date without a daily task is a fantasy."*\n\n---\n\n`;

  md += `## Chapter Overview\n\n`;
  md += `This is the operating schedule for the whole book: **${plan.meta.totalDays} days**, `;
  md += `**${plan.meta.totalWeeks} weeks**, **${plan.meta.totalTasks} scheduled tasks**, `;
  md += `**${plan.meta.totalHours} hours** of deliberate work, running from `;
  md += `**${pretty(parse(plan.meta.start))}** to **${pretty(parse(plan.meta.end))}**.\n\n`;
  md += `Of those days, **${plan.meta.workingDays} are working days and ${plan.meta.restDays} are rest days**.\n\n`;
  md += `The plan opens with a short **Week 0 lead-in** — ${pretty(parse(plan.meta.start))}, the Saturday after it, and a Sunday off — `;
  md += `for setting up your machine and your routine. Week 1 proper starts on the Monday after, and every week from there runs Monday to Sunday.\n\n`;

  md += `You are doing this while employed full-time. That is the constraint the whole schedule is `;
  md += `designed around, and it is why the largest block of the day happens before work rather than after it.\n\n`;

  md += `### One budget, no regimes\n\n`;
  md += `| | Mon–Fri | Saturday | Sunday |\n|---|---|---|---|\n`;
  md += `| Hours | **2h** | **4h** | **OFF** |\n\n`;
  md += `**Fourteen hours a week, held for fifty straight weeks.** There is no ramp and no `;
  md += `second regime. One number, which you either hit or you do not, and which you can measure `;
  md += `honestly every Saturday.\n\n`;
  md += `This is deliberately half the daily load of the first version of this plan, over more than `;
  md += `three times the runway. The total is **higher** — ${plan.meta.totalHours} hours against 448 — because a budget you `;
  md += `keep for fifty weeks beats a heroic one you abandon in week five. The risk in a plan `;
  md += `this long is not intensity, it is drift, which is what the weekly milestones are for.\n\n`;

  md += `### Sunday is off\n\n`;
  md += `Every Sunday carries **zero tasks**. This is not slack in the plan; it is load-bearing. `;
  md += `Fourteen hours a week on top of a full-time job, for a year, is a real load, and a `;
  md += `schedule with no scheduled rest gets abandoned rather than adjusted. The streak counter in `;
  md += `the app treats Sundays as neutral — resting never breaks it.\n\n`;

  md += `### The three tracks\n\n`;
  md += `| Track | What it is | Why it runs every day |\n|---|---|---|\n`;
  md += `| **Engineering** | Chapters, and code you wrote yourself | Skill decays without daily contact, and yours has decayed for three years |\n`;
  md += `| **Job Hunt** | CV, GitHub, applications, referrals, interviews, offers | Pipelines take four to eight weeks to convert; you cannot buy that time back later |\n`;
  md += `| **Communication** | English, explaining your work, interview speech | Good candidates lose final rounds on communication as often as on code |\n\n`;

  md += `### The daily budget\n\n`;
  md += `**Weekday — 2 hours**\n\n| Time | Block | Length |\n|---|---|---|\n`;
  for (const s of SLOTS.weekday) md += `| \`${s.time}\` | ${s.name} | ${s.mins} min |\n`;
  md += `\n**Saturday — 4 hours**\n\n| Time | Block | Length |\n|---|---|---|\n`;
  for (const s of SLOTS.saturday) md += `| \`${s.time}\` | ${s.name} | ${s.mins} min |\n`;
  md += `\n**Sunday — rest.**\n\n`;
  md += `The dawn block is the reason this works while employed. Ninety minutes before work, five days `;
  md += `a week, is thirty hours a month that nothing can take from you — no late meeting, no `;
  md += `exhausting day, no social obligation. Evening study is the first thing life cancels, which is `;
  md += `why this version does not schedule any. Morning study is not.\n\n`;
  md += `The dawn block carries **study on some days and building on others** — the day's spec says `;
  md += `which. Do not merge them. A morning that starts as reading and drifts into building is a `;
  md += `morning where neither happened.\n\n`;

  md += `### Applications are a weekly quota\n\n`;
  md += `| From | Per week | Why |\n|---|---|---|\n`;
  for (const q of APPLY_QUOTA) md += `| Week ${q.fromWeek} | **${q.perWeek}** | ${q.note} |\n`;
  md += `\n**${plan.meta.totalApplications} applications in total** across the plan. That is the funnel size `;
  md += `that produces two to four offers, and it ramps because a tailored application from week 23 — `;
  md += `with two live projects attached — is worth five from week 5. Five a day for eight months is not `;
  md += `a funnel; it is spam, and this market is small enough to remember it.\n\n`;

  md += `### The DSA ladder\n\n`;
  md += `Every Saturday carries a **60-minute DSA drill**, and it is not random practice — it is a `;
  md += `ladder that runs the whole fifty weeks, from arrays and hashing in week 1 to timed mixed `;
  md += `sets in week 50. **${plan.meta.totalProblems} problems in total.** You will sit coding tests from `;
  md += `week 5, long before the plan's interview block, which is exactly why this runs from day one `;
  md += `rather than waiting until the end.\n\n`;
  md += `The drill stays **AI-free for all fifty weeks**, including after the unlock, because `;
  md += `interviews are. Phase 1 Chapter 13 has the pattern playbook and the full ladder.\n\n`;
  md += `| Weeks | Ladder |\n|---|---|\n`;
  const bands = [[1,4],[5,8],[9,12],[13,16],[17,20],[21,24],[25,28],[29,32],[33,36],[37,42],[43,47],[48,50]];
  for (const [a, b] of bands) {
    const topics = plan.weeks.filter(w => w.n >= a && w.n <= b).map(w => w.dsa.topic);
    md += `| W${a}–W${b} | ${[...new Set(topics)].join(' · ')} |\n`;
  }
  md += `\n`;

  md += `### The rule that makes this work\n\n`;
  md += `**For the first eighteen weeks, no AI writes code for you.** Not a line, not a snippet, not a `;
  md += `"just this once". You may read documentation, and you may ask an AI to *explain* a concept `;
  md += `after you have already tried it yourself. From ${pretty(parse(plan.anchors.aiUnlock))} it comes `;
  md += `back — as a reviewer and a teacher, never as an author, and always under the rule that you `;
  md += `must be able to explain any line it touched.\n\n`;
  md += `This is not a moral position about AI. It is a targeted correction. Three years of outsourced `;
  md += `thinking is the exact hole this plan is digging you out of, and you cannot dig out of it with a shovel that digs for you.\n\n`;

  md += `### The blocks\n\n`;
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
  md += `| ${pretty(parse(plan.anchors.start))} | Day 1 — the honest audit |\n`;
  md += `| ${pretty(parse(plan.anchors.cvReady))} | CV, LinkedIn and GitHub finished — this is a gate |\n`;
  md += `| ${pretty(parse(plan.anchors.applyStart))} | **Applications open — on the weekly quota above** |\n`;
  md += `| ${pretty(parse(plan.anchors.apiLive))} | Project 1 API deployed at a public URL |\n`;
  md += `| ${pretty(parse(plan.anchors.aiUnlock))} | AI unlocked — reviewer, never author |\n`;
  md += `| ${pretty(parse(plan.anchors.project1))} | **Project 1 data layer complete — SQL and NoSQL** |\n`;
  md += `| ${pretty(parse(plan.anchors.project2))} | **Project 2 live — NestJS, queues, Redis, tested** |\n`;
  md += `| ${pretty(parse(plan.anchors.project3))} | **Project 3 live — retrieval service, measured** |\n`;
  md += `| ${pretty(parse(plan.anchors.mockStart))} | First mock interview with a real person |\n`;
  md += `| ${pretty(parse(plan.anchors.deadline))} | **The plan closes — final accounting** |\n\n`;

  md += `### The full week index\n\n| W | Block | Hours | Apps | Title | Deliverable |\n|---|---|---|---|---|---|\n`;
  for (const w of plan.weeks) {
    md += `| ${w.n} | ${w.block.split('—')[0].trim()} | ${w.hours}h | ${w.applyQuota || '–'} | ${w.title} | ${w.deliverable} |\n`;
  }
  md += `\n`;

  md += `### Core and Later\n\n`;
  md += `**${plan.core.length} chapters are CORE** — the ones this plan schedules. Everything else in `;
  md += `the book is **LATER**: reference material for when a job actually needs it, and explicitly `;
  md += `*not* something you are behind on. Kubernetes, Terraform, microservices, GraphQL, MongoDB and `;
  md += `the rest are all real subjects and none of them will get you this job. A chapter that is not `;
  md += `in the plan is not homework you are failing to do.\n\n`;

  md += `## How to use this\n\n`;
  md += `1. **Open the Plan tab every morning.** It opens on today. Do not plan your day yourself — it is already planned.\n`;
  md += `2. **Tick tasks as you complete them.** Progress persists locally. The streak counter is the honest measure.\n`;
  md += `3. **Missing a day is fine; missing two is a pattern.** Do not "catch up" — resume on today.\n`;
  md += `4. **Take Sunday off properly.** No guilt, no "just an hour". The rest is what makes week 50 possible.\n`;
  md += `5. **The weekly review is the last Saturday slot.** One hour, and it is the highest-leverage hour of the week.\n`;
  md += `6. **The milestones are pass or fail.** "Mostly did it" is a no. Be as strict as the interviewer will be.\n`;
  md += `7. **Ignore everything marked LATER.** If it is not in the week you are on, it is not your problem yet.\n\n`;

  md += `## Self Assessment\n\n`;
  md += `At the end of every block:\n\n`;
  md += `- Did I hit every milestone, or did I quietly redefine one to make it passable?\n`;
  md += `- Which of the three tracks did I drop, and what did that cost me?\n`;
  md += `- Is my dawn block actually happening, or has it migrated to the evening and then to nowhere?\n`;
  md += `- Did the AI rule hold, honestly, or did it start writing again when a task got hard?\n`;
  md += `- Am I genuinely resting on Sundays, or leaking work into them and burning out slowly?\n`;
  md += `- What is my current streak, and what broke the last one?\n\n`;

  md += `## Cheat Sheet\n\n`;
  md += `- **${plan.meta.totalDays} days · ${plan.meta.totalWeeks} weeks · ${plan.meta.totalHours} hours · ${plan.meta.restDays} rest days**\n`;
  md += `- **2h Mon–Fri · 4h Saturday · Sunday OFF · ${WEEKLY_HOURS}h/week**\n`;
  md += `- **Weekday:** 05:00 deep work (90m) · 13:00 job hunt or English (30m)\n`;
  md += `- **Saturday:** 08:00 build (120m) · 10:30 drill (60m) · 12:00 review + apply (60m)\n`;
  md += `- **From ${pretty(parse(plan.anchors.applyStart))}:** applications on the weekly quota — 5, then 10, then 15 (${plan.meta.totalApplications} total)\n`;
  md += `- **No AI writes code until ${pretty(parse(plan.anchors.aiUnlock))}**\n`;
  md += `- **DSA every Saturday, 60m, AI-free — ${plan.meta.totalProblems} problems across the ladder**\n`;
  md += `- **${plan.core.length} chapters are CORE. Everything else is LATER, and not your problem.**\n`;
  md += `- **Deadline:** ${pretty(parse(plan.anchors.deadline))}\n`;

  return { name: '01-the-350-day-plan.md', md };
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

  if (plan.days.length !== TOTAL_DAYS) fail(`Expected ${TOTAL_DAYS} days, got ${plan.days.length}`);
  if (plan.weeks.length !== TOTAL_WEEKS) fail(`Expected ${TOTAL_WEEKS} weeks, got ${plan.weeks.length}`);
  const uniq = new Set(plan.days.map(d => d.date));
  if (uniq.size !== plan.days.length) fail('Duplicate dates in plan');
  if (plan.days[0].date !== START) fail(`Plan starts ${plan.days[0].date}, expected ${START}`);
  if (plan.days[0].dow !== START_DOW) fail(`Plan starts on a ${plan.days[0].dow}, expected a ${START_DOW}`);
  const week1 = plan.days.find(d => d.week === 1);
  if (week1.dow !== 'Monday') fail(`Week 1 starts on a ${week1.dow}, expected a Monday`);
  if (plan.days[plan.days.length - 1].date !== END) fail(`Plan ends ${plan.days[plan.days.length - 1].date}, expected ${END}`);

  for (let i = 1; i < plan.days.length; i++) {
    if (daysBetweenISO(plan.days[i - 1].date, plan.days[i].date) !== 1) {
      fail(`Gap between ${plan.days[i - 1].date} and ${plan.days[i].date}`);
    }
  }

  // Every Sunday is a rest day with no tasks; nothing else may be.
  for (const d of plan.days) {
    const shouldRest = d.dow === 'Sunday';
    if (shouldRest && (!d.isRest || d.tasks.length)) fail(`${d.date} (Sunday) should be a rest day but has ${d.tasks.length} tasks`);
    if (!shouldRest && d.isRest) fail(`${d.date} (${d.dow}) is marked rest but should not be`);
    if (!shouldRest && d.tasks.length === 0) fail(`${d.date} (${d.dow}) has no tasks`);
  }
  if (plan.meta.restDays !== TOTAL_WEEKS) fail(`Expected ${TOTAL_WEEKS} rest days, got ${plan.meta.restDays}`);

  // Daily totals must match the declared budget exactly.
  for (const d of plan.days) {
    if (d.isRest) continue;
    const expected = d.dow === 'Saturday' ? SATURDAY_MINS : WEEKDAY_MINS;
    if (d.totalMins !== expected) {
      fail(`${d.date} (${d.dow}) totals ${d.totalMins}m, expected ${expected}m`);
    }
  }

  // Every week is a full 14-hour week — except the short lead-in week.
  const odd = plan.weeks.filter(w => !w.leadIn && w.hours !== WEEKLY_HOURS);
  if (odd.length) fail(`Weeks not at ${WEEKLY_HOURS}h: ${odd.map(w => `W${w.n}=${w.hours}h`).join(', ')}`);

  // Applications must open on the anchored date, and that date must be a Monday.
  const applyDay = plan.days.find(d => d.date === ANCHORS.applyStart);
  if (!applyDay) fail(`Application start ${ANCHORS.applyStart} is not in the plan`);
  if (applyDay.dow !== 'Monday') fail(`Applications open on a ${applyDay.dow}, expected a Monday`);
  if (!applyDay.tasks.some(t => /APPLICATIONS OPEN/.test(t.text))) {
    fail(`No "APPLICATIONS OPEN" task on ${ANCHORS.applyStart}`);
  }

  // Every week from applyStart must carry real Job Hunt work and a review.
  // The application NUMBER is data (week.applyQuota), rendered into the book and
  // the app — it is deliberately not parsed out of the task prose, so that
  // rewording a task can never silently change the plan or break the build.
  const bareWeeks = [];
  const noReview = [];
  for (const w of plan.weeks) {
    const wd = plan.days.filter(d => d.week === w.n && !d.isRest);
    const tasks = wd.flatMap(d => d.tasks);
    if (!tasks.some(t => t.track === 'REV')) noReview.push(`W${w.n}`);
    if (!w.applyQuota) continue;
    if (tasks.filter(t => t.track === 'JOB').length < 3) bareWeeks.push(`W${w.n}`);
  }
  if (noReview.length) fail(`Weeks with no weekly review: ${noReview.join(', ')}`);

  // Every week must carry a DSA topic and a Saturday drill slot to run it in.
  const noDsa = plan.weeks.filter(w => !w.dsa || !w.dsa.topic || !w.dsa.problems);
  if (noDsa.length) fail(`Weeks with no DSA ladder entry: ${noDsa.map(w => 'W' + w.n).join(', ')}`);
  const noDrill = plan.days.filter(d => d.dow === 'Saturday' && !d.tasks.some(t => t.slot === 'mid'));
  if (noDrill.length) fail(`Saturdays with no drill slot: ${noDrill.map(d => d.date).join(', ')}`);
  if (bareWeeks.length) fail(`Weeks after applications open with fewer than 3 Job Hunt tasks: ${bareWeeks.join(', ')}`);

  // Every week before applications open must have none, and every week after
  // must have one. A week with a quota but no Job Hunt track is a broken week.
  const applyWeek = plan.days.find(d => d.date === ANCHORS.applyStart).week;
  for (const w of plan.weeks) {
    const expected = w.n >= applyWeek;
    if (expected && !w.applyQuota) fail(`W${w.n} is after applications open but has no quota`);
    if (!expected && w.applyQuota) fail(`W${w.n} is before applications open but has a quota of ${w.applyQuota}`);
  }

  // The quota must ramp, and must never fall.
  for (let i = 1; i < APPLY_QUOTA.length; i++) {
    if (APPLY_QUOTA[i].perWeek < APPLY_QUOTA[i - 1].perWeek) fail('Application quota goes down');
    if (APPLY_QUOTA[i].fromWeek <= APPLY_QUOTA[i - 1].fromWeek) fail('Application quota weeks out of order');
  }

  // Every anchor must fall inside the plan.
  for (const [name, date] of Object.entries(ANCHORS)) {
    if (!plan.days.some(d => d.date === date)) fail(`Anchor "${name}" (${date}) falls outside the plan`);
  }
  if (ANCHORS.start !== START) fail(`Anchor start ${ANCHORS.start} does not match plan start ${START}`);

  // Every chapter reference must resolve to a real file, and must be CORE.
  const PHASES = path.join(ROOT, 'phases');
  const coreSet = new Set(CORE);
  for (const w of plan.weeks) {
    for (const c of w.chapters) {
      if (!fs.existsSync(path.join(PHASES, c + '.md'))) fail(`W${w.n} references missing chapter: ${c}`);
      if (!coreSet.has(c)) fail(`W${w.n} schedules ${c}, which is not in CORE — add it to CORE or drop it from the week`);
    }
  }

  // Every CORE entry must be a real file. A CORE chapter that is never
  // scheduled is allowed (some are read on their own), but a missing one is not.
  for (const c of CORE) {
    if (!fs.existsSync(path.join(PHASES, c + '.md'))) fail(`CORE lists a missing chapter: ${c}`);
  }

  console.log(`  ✓ ${TOTAL_DAYS} days, continuous, ${plan.meta.restDays} Sundays off`);
  console.log(`  ✓ Daily totals match budget exactly (${WEEKDAY_MINS}m / ${SATURDAY_MINS}m)`);
  console.log(`  ✓ All ${plan.weeks.filter(w => !w.leadIn).length} full weeks at exactly ${WEEKLY_HOURS}h (plus the lead-in)`);
  console.log(`  ✓ Applications open ${applyDay.pretty}; every week meets its quota (${plan.meta.totalApplications} total)`);
  console.log(`  ✓ All ${Object.keys(ANCHORS).length} anchors fall inside the plan`);
  console.log(`  ✓ DSA ladder covers all ${plan.weeks.length} weeks (${plan.meta.totalProblems} problems)`);
  console.log(`  ✓ All chapter references resolve, and all ${CORE.length} are CORE\n`);
}

main().catch(e => { console.error('[PLAN BUILD FAILED]', e.message); process.exit(1); });
