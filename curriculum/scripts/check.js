/**
 * Sanity checks for the book. Fails (exit 1) on real problems, warns on style issues.
 *
 *  - every chapter id in toc.json is unique and every listed source note exists
 *  - every old source note is used by at least one chapter (nothing silently dropped)
 *  - every rewritten chapter has exactly one H1, a GOALS box, Key terms, exercises
 *  - rewritten chapters contain no schedule / tracking language
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const toc = JSON.parse(fs.readFileSync(path.join(ROOT, 'book', 'toc.json'), 'utf8'));
const notesDir = path.join(ROOT, 'source-notes');
const errors = [];
const warnings = [];

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);

const ids = new Set();
const usedSources = new Set();
for (const part of toc.parts) {
  for (const ch of part.chapters) {
    if (ids.has(ch.id)) errors.push(`duplicate chapter id: ${ch.id}`);
    ids.add(ch.id);
    for (const s of ch.sources) {
      usedSources.add(s);
      if (!fs.existsSync(path.join(notesDir, s))) errors.push(`${ch.id}: missing source note ${s}`);
    }
  }
}
for (const f of walk(notesDir).filter(f => f.endsWith('.md'))) {
  const rel = path.relative(notesDir, f).split(path.sep).join('/');
  if (!usedSources.has(rel)) warnings.push(`source note not used by any chapter: ${rel}`);
}

const chaptersDir = path.join(ROOT, 'book', 'chapters');
const schedule = /\b(today'?s task|yesterday|streak|habit tracker|week \d+|W\d{1,2}\b|by \d{1,2} (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec))/i;
let rewritten = 0;
if (fs.existsSync(chaptersDir)) {
  for (const f of fs.readdirSync(chaptersDir).filter(f => f.endsWith('.md'))) {
    const id = f.replace(/\.md$/, '');
    if (!ids.has(id)) errors.push(`book/chapters/${f} is not listed in toc.json`);
    const md = fs.readFileSync(path.join(chaptersDir, f), 'utf8');
    const noCode = md.replace(/```[\s\S]*?```/g, '');
    rewritten++;
    const h1 = (noCode.match(/^#\s/gm) || []).length;
    if (h1 !== 1) errors.push(`${f}: expected exactly one H1, found ${h1}`);
    if (!/\[!GOALS\]/.test(md)) warnings.push(`${f}: no [!GOALS] box`);
    if (!/^## Key terms\s*$/m.test(md)) errors.push(`${f}: no "## Key terms" section (feeds the glossary)`);
    if (!/^## Exercises/m.test(md)) warnings.push(`${f}: no "## Exercises" section`);
    if (!/^## What comes next/m.test(md)) warnings.push(`${f}: no "## What comes next" section`);
    const hard = noCode.match(/bChapters? d+/);
    if (hard) warnings.push(`${f}: hand-typed chapter number "${hard[0]}" — use {{ch:id}}`);
    for (const [, ref] of noCode.matchAll(/{{ch:([a-z0-9-]+)}}/g)) if (!ids.has(ref)) errors.push(`${f}: unknown chapter reference {{ch:${ref}}}`);
    const m = noCode.match(schedule);
    if (m) warnings.push(`${f}: schedule-like wording "${m[0]}"`);
    const opens = (md.match(/<details>/g) || []).length;
    const closes = (md.match(/<\/details>/g) || []).length;
    if (opens !== closes) errors.push(`${f}: ${opens} <details> but ${closes} </details>`);
  }
}

warnings.forEach(w => console.log('  warn  ' + w));
errors.forEach(e => console.log('  ERROR ' + e));
console.log(`  ${ids.size} chapters in toc · ${rewritten} rewritten · ${errors.length} errors · ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
