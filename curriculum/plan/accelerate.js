/**
 * Repacks the 50-week plan into the 30-hour accelerated timetable (plan-data.js
 * → SLOTS_V2). Days before CUTOVER are kept exactly as built. From CUTOVER on,
 * the authored work is consumed in order:
 *
 *   weekday   dawn   (90)  ← next old weekday's 90-minute engineering task
 *             office (120) ← the one after it (90) + one 30-minute task
 *             eve    (30)  ← a Communication task (English at home after gym)
 *   weekend   build/drill/review ← the next old Saturday, slot for slot
 *             extra  (60)  ← two leftover 30-minute tasks, or apply/catch-up
 *
 * Two old weekdays per new weekday and one old Saturday per weekend day means
 * two old weeks per new week. An old Saturday is only scheduled once every
 * weekday of its week has been, so each review still looks back on finished work.
 */

const { TRACKS, SLOTS_V2, CUTOVER, CATCH_UP, ANCHORS } = require('./plan-data');

const DOW   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const iso = (d) => d.toISOString().slice(0, 10);
const parse = (s) => { const [y, m, dd] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)); };
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const pretty = (d) => `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const shortDate = (d) => `${String(d.getUTCDate()).padStart(2, '0')} ${MONTH[d.getUTCMonth()].slice(0, 3)}`;

const SLOT = Object.fromEntries([...SLOTS_V2.weekday, ...SLOTS_V2.weekend].map((s) => [s.id, s]));
const OLD_SAT_TO_NEW = { dawn: 'build', mid: 'drill', late: 'review' };

/** The weekday a new week starts on (the first Monday after the transition days). */
const FIRST_NEW_WEEK = '2026-10-12';

function task(track, slotId, text, mins, time) {
  const s = SLOT[slotId];
  return {
    track,
    trackLabel: TRACKS[track].label,
    color: TRACKS[track].color,
    slot: s.id,
    time: time ?? s.time,
    mins: mins ?? s.mins,
    slotName: s.name,
    text,
  };
}

function accelerate(legacyDays) {
  const kept = legacyDays.filter((d) => d.date < CUTOVER);
  const rest = legacyDays.filter((d) => d.date >= CUTOVER && !d.isRest);

  // ── Queues of authored work, in plan order ─────────────────────
  const dawnQ = [];  // { t, day }
  const shortQ = []; // { t, day }
  const satQ = [];   // day
  for (const d of rest) {
    if (d.dow === 'Saturday') { satQ.push(d); continue; }
    for (const t of d.tasks) (t.slot === 'dawn' ? dawnQ : shortQ).push({ t, day: d });
  }
  const scheduledWeekdays = new Map(); // old week → weekday tasks still unscheduled
  for (const d of rest) if (d.dow !== 'Saturday') scheduledWeekdays.set(d.week, (scheduledWeekdays.get(d.week) ?? 0) + 1);
  const oldToNew = new Map(); // old ISO date → new ISO date (where its main work landed)

  // A short task from old week N waits until old week N-1's Saturday review has
  // been scheduled, so job-hunt gates keep their order (CV gate before applications).
  let reviewedWeek = 0;
  const eligible = (x) => x.day.week <= reviewedWeek + 1;
  const takeShort = (prefer) => {
    const window = shortQ.slice(0, 4);
    let i = window.findIndex((x) => x.t.track === prefer && eligible(x));
    if (i < 0) i = window.findIndex(eligible);
    return i >= 0 ? shortQ.splice(i, 1)[0] : null;
  };
  const takeComm = () => {
    const i = shortQ.slice(0, 6).findIndex((x) => x.t.track === 'COMM' && eligible(x));
    return i >= 0 ? shortQ.splice(i, 1)[0] : null;
  };

  const days = [];
  let cursor = parse(CUTOVER);
  let dayNum = kept.length + 1;
  const lastKeptWeek = kept[kept.length - 1].week;
  reviewedWeek = lastKeptWeek - 1; // weeks before the one in progress were reviewed already
  let lastSat = null;
  let appsOpen = false;

  const weekOf = (dateISO) =>
    dateISO < FIRST_NEW_WEEK
      ? lastKeptWeek
      : lastKeptWeek + 1 + Math.floor((parse(dateISO) - parse(FIRST_NEW_WEEK)) / (7 * 86400000));

  while (dawnQ.length || shortQ.length || satQ.length) {
    const dateISO = iso(cursor);
    const dow = cursor.getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const tasks = [];
    const sources = [];
    let focus;

    if (dateISO === CATCH_UP) {
      focus = 'Catch-up day — clear weeks 1–3 before the new timetable starts';
      tasks.push(
        task('ENG', 'build', 'Catch-up build: open weeks 1–3 in the Plan and do every unticked dawn task in order — the backend-mastery repo, the coding baseline, coercion, closures, the contact book. Tick each as you finish. No AI writes code.'),
        task('ENG', 'drill', 'DSA catch-up: arrays & hashing — four LeetCode Easy, timed, no help. Explain one solution out loud in English.'),
        task('REV', 'review', 'Weekly review in LOG.md: what got done in weeks 1–3, what did not, and why. Then read the new timetable — dawn block after Fajr and Quran, office study 10–11 and 4–5, English at 21:30 — and set every alarm in the Personal OS app.'),
        task('JOB', 'extra', 'CV gate push: CV, LinkedIn headline and About, GitHub profile README. The CV gate is Saturday 17 October — finish the drafts today so the week only needs polish.'),
      );
    } else if (weekend) {
      // Only take a Saturday whose weekdays are all scheduled.
      const next = satQ[0];
      if (next && !scheduledWeekdays.get(next.week)) {
        const sat = satQ.shift();
        sources.push(sat);
        lastSat = sat;
        reviewedWeek = sat.week;
        focus = sat.focus;
        for (const t of sat.tasks) tasks.push(task(t.track, OLD_SAT_TO_NEW[t.slot], t.text));
        oldToNew.set(sat.date, dateISO);
      } else {
        focus = 'Consolidation — finish the week properly';
        tasks.push(
          task('ENG', 'build', 'Deep build: finish whatever the week\'s deliverable still needs. If it is done, rebuild its hardest part from a blank file without looking.'),
          task('ENG', 'drill', 'DSA drill: three problems from this week\'s ladder topic, timed, no help.'),
          task('REV', 'review', 'Review: is the deliverable pass or fail? Write the honest answer in LOG.md and read next week ahead.'),
        );
      }
      // Extra hour: leftover short tasks first, otherwise applications / catch-up.
      const a = takeShort('JOB');
      const b = a ? takeShort('JOB') : null;
      if (a) {
        tasks.push(task(a.t.track, 'extra', a.t.text, 30, '15:30–16:00'));
        if (b) tasks.push(task(b.t.track, 'extra', b.t.text, 30, '16:00–16:30'));
        else tasks.push(task('JOB', 'extra', 'Applications: follow up on anything sent last week, and update TRACKER.md.', 30, '16:00–16:30'));
      } else {
        tasks.push(task(dow === 6 ? 'JOB' : 'ENG', 'extra', dow === 6
          ? 'Applications: send this week\'s quota, tailored, and follow up on last week\'s. Log every one in TRACKER.md.'
          : 'Catch-up: finish any task left unticked this week. If there is none, redo one build task from memory, no notes.'));
      }
    } else {
      const A = dawnQ.shift();
      const B = dawnQ.shift();
      for (const x of [A, B]) if (x) {
        scheduledWeekdays.set(x.day.week, scheduledWeekdays.get(x.day.week) - 1);
        oldToNew.set(x.day.date, dateISO);
        sources.push(x.day);
      }
      focus = [A, B].filter(Boolean).map((x) => x.day.focus).join(' · ') || 'Interview preparation';
      tasks.push(A
        ? task(A.t.track, 'dawn', A.t.text)
        : task('ENG', 'dawn', 'Interview drill: one system-design question on paper, then two timed DSA problems explained out loud.'));
      const eve = takeComm();
      const officeShort = takeShort('JOB');
      tasks.push(B
        ? task(B.t.track, 'office', B.t.text, 90, '10:00–11:00 + 16:00–16:30')
        : task('ENG', 'office', 'Revision: reread your weakest chapter\'s Interview Preparation section and answer every question aloud.', 90, '10:00–11:00 + 16:00–16:30'));
      tasks.push(officeShort
        ? task(officeShort.t.track, 'office', officeShort.t.text, 30, '16:30–17:00')
        : task('JOB', 'office', appsOpen
          ? 'Applications: one tailored application or one follow-up. Log it in TRACKER.md.'
          : 'CV gate polish: improve one of CV, LinkedIn or the GitHub profile README — one concrete fix, then commit or save it.', 30, '16:30–17:00'));
      tasks.push(eve
        ? task('COMM', 'eve', eve.t.text)
        : task('COMM', 'eve', 'English speaking session with Claude: explain today\'s engineering work out loud as if to an interviewer, then answer two follow-up questions. Fix every grammar point it raises.'));
    }

    if (tasks.some((t) => /APPLICATIONS OPEN/.test(t.text))) appsOpen = true;
    const ref = sources[0];
    days.push({
      n: dayNum,
      date: dateISO,
      dow: DOW[dow],
      dowShort: DOW[dow].slice(0, 3),
      pretty: pretty(cursor),
      short: shortDate(cursor),
      month: MONTH[cursor.getUTCMonth()],
      monthIdx: cursor.getUTCMonth(),
      year: cursor.getUTCFullYear(),
      week: weekOf(dateISO),
      oldWeeks: [...new Set(sources.map((s) => s.week))],
      block: (ref ?? lastSat ?? kept[kept.length - 1]).block,
      weekTitle: '',
      focus,
      isWeekend: weekend,
      isRest: false,
      isExam: false,
      totalMins: tasks.reduce((a, t) => a + t.mins, 0),
      tasks: tasks.map((t, i) => ({ id: `d${dayNum}-t${i + 1}`, ...t })),
    });
    cursor = addDays(cursor, 1);
    dayNum++;
  }

  // ── Move dates mentioned in text, and the anchors ──────────────
  const oldISOFromText = (day, monthName, year) => {
    const m = MONTH.indexOf(monthName);
    const y = year ? Number(year) : m >= 8 ? 2026 : 2027;
    return iso(new Date(Date.UTC(y, m, Number(day))));
  };
  // A weekday written before the date ("Saturday 19 December") is recomputed,
  // because a date that moves usually lands on a different day of the week.
  const remap = (text) =>
    text.replace(/\b(?:(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) )?(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December)( (\d{4}))?/g,
      (all, dow, d, mon, _y, y) => {
        const to = oldToNew.get(oldISOFromText(d, mon, y));
        if (!to) return all;
        const nd = parse(to);
        return `${dow ? DOW[nd.getUTCDay()] + ' ' : ''}${nd.getUTCDate()} ${MONTH[nd.getUTCMonth()]}${y ? ' ' + nd.getUTCFullYear() : ''}`;
      });
  // Kept days too: they can point forward (Day 1 names the final deadline).
  for (const d of [...kept, ...days]) for (const t of d.tasks) t.text = remap(t.text);

  const anchors = { ...ANCHORS };
  for (const [k, v] of Object.entries(ANCHORS)) if (oldToNew.has(v)) anchors[k] = oldToNew.get(v);
  // Applications open wherever the "APPLICATIONS OPEN" task itself landed.
  const openDay = days.find((d) => d.tasks.some((t) => /APPLICATIONS OPEN/.test(t.text)));
  if (openDay) anchors.applyStart = openDay.date;

  return { days: [...kept, ...days], anchors, remap, oldToNew };
}

module.exports = { accelerate, FIRST_NEW_WEEK };
