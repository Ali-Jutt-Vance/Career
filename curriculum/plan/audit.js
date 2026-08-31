/**
 * Audits chapter depth against the gold-standard section arc and rewrites the
 * table in EXPANSION-STATUS.md. Order follows the daily plan.
 *
 * Run: node plan/audit.js
 */
const fs   = require('fs-extra');
const path = require('path');
const { WEEKS } = require('./plan-data');

const ROOT   = path.join(__dirname, '..');
const PHASES = path.join(ROOT, 'phases');
const STATUS = path.join(ROOT, 'EXPANSION-STATUS.md');

// The full arc. A chapter is "complete" when it has the required sections.
const REQUIRED = [
  'Chapter Overview', 'Beginner Theory', 'Basic Examples', 'Intermediate Concepts',
  'Advanced Concepts', 'Security', 'Performance', 'Debugging',
  'Interview Preparation', 'Practical Tasks', 'Self Assessment', 'Cheat Sheet',
];

// Chapters that legitimately use a different arc (IELTS, plan, mission, appendix).
const EXEMPT_PHASES = ['phase-0-mission', 'phase-10-ielts-english', 'phase-12-daily-execution-plan', 'phase-13-appendix'];

function analyse(relPath) {
  const file = path.join(PHASES, relPath + '.md');
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const words = text.split(/\s+/).filter(Boolean).length;
  const sections = (text.match(/^## .+/gm) || []).map(s => s.replace(/^##\s*/, '').trim());

  // Non-technical phases use a different arc — judge them on depth alone,
  // plus the two sections every chapter in the book must have.
  const exempt = EXEMPT_PHASES.includes(relPath.split('/')[0]);
  const required = exempt ? ['Self Assessment', 'Cheat Sheet'] : REQUIRED;
  const missing = required.filter(r => !sections.some(s => s.toLowerCase().includes(r.toLowerCase())));
  return { words, sections, missing };
}

function band(relPath) {
  const phase = relPath.split('/')[0];
  if (EXEMPT_PHASES.includes(phase)) return { min: 2500, label: 'support' };
  if (/system-design|databases|backend-engineering|ai-engineering/.test(phase)) return { min: 6000, label: 'core' };
  return { min: 5000, label: 'standard' };
}

function status(a, b) {
  if (!a) return 'MISSING';
  if (a.words >= b.min && a.missing.length === 0) return 'DONE';
  if (a.words >= b.min * 1.4 && a.missing.length <= 2) return 'GOOD';
  return 'TODO';
}

function main() {
  // Chapters in plan order, deduplicated.
  const ordered = [];
  const seen = new Set();
  for (const w of WEEKS) {
    for (const c of w.chapters) {
      if (seen.has(c)) continue;
      seen.add(c);
      ordered.push({ week: w.n, ref: c });
    }
  }

  // Everything else in the book, appended after.
  const all = [];
  for (const phase of fs.readdirSync(PHASES)) {
    const dir = path.join(PHASES, phase);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
      all.push(`${phase}/${f.replace(/\.md$/, '')}`);
    }
  }
  for (const ref of all) {
    if (!seen.has(ref)) { seen.add(ref); ordered.push({ week: null, ref }); }
  }

  let rows = '';
  const counts = { DONE: 0, GOOD: 0, TODO: 0, MISSING: 0 };
  let totalWords = 0;

  rows += '| # | Week | Chapter | Words | Target | Missing sections | Status |\n';
  rows += '|---|---|---|---|---|---|---|\n';

  ordered.forEach((o, i) => {
    const a = analyse(o.ref);
    const b = band(o.ref);
    const s = status(a, b);
    counts[s]++;
    if (a) totalWords += a.words;
    const miss = a && a.missing.length
      ? (a.missing.length > 4 ? `${a.missing.length} sections` : a.missing.join(', '))
      : '—';
    rows += `| ${i + 1} | ${o.week ? 'W' + o.week : '–'} | \`${o.ref}\` | ${a ? a.words.toLocaleString('en-GB') : '—'} | ${b.min.toLocaleString('en-GB')} | ${miss} | **${s}** |\n`;
  });

  const summary =
`**${ordered.length} chapters · ${totalWords.toLocaleString('en-GB')} words total**

| Status | Count |
|---|---|
| DONE | ${counts.DONE} |
| GOOD | ${counts.GOOD} |
| TODO | ${counts.TODO} |
| MISSING | ${counts.MISSING} |

_Last audited: ${new Date().toISOString().slice(0, 16).replace('T', ' ')}_

`;

  const md = fs.readFileSync(STATUS, 'utf8');
  const out = md.replace(
    /<!-- AUDIT:START -->[\s\S]*<!-- AUDIT:END -->/,
    `<!-- AUDIT:START -->\n${summary}${rows}<!-- AUDIT:END -->`
  );
  fs.writeFileSync(STATUS, out, 'utf8');

  console.log(`\n  Audited ${ordered.length} chapters · ${totalWords.toLocaleString('en-GB')} words`);
  console.log(`  DONE ${counts.DONE} · GOOD ${counts.GOOD} · TODO ${counts.TODO}\n`);

  const todo = ordered.filter(o => status(analyse(o.ref), band(o.ref)) === 'TODO');
  console.log('  Next up (plan order):');
  todo.slice(0, 12).forEach(o => {
    const a = analyse(o.ref);
    console.log(`    ${o.week ? 'W' + o.week : '– '}  ${String(a ? a.words : 0).padStart(6)}w  ${o.ref}`);
  });
  console.log('');
}

main();
