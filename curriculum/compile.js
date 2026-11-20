/**
 * Becoming a Software Engineer — book compiler
 *
 * Reads book/toc.json, turns every chapter into HTML and writes ONE book:
 *
 *   output/index.html   the reader app (contents sidebar, glossary, index, search)
 *   output/book.pdf     only with --pdf
 *   REWRITE-STATUS.md   editing record: which chapters are rewritten, which are not
 *
 * A chapter is "rewritten" when book/chapters/<id>.md exists. Until then the reader
 * shows the old condensed notes from source-notes/ under a clear notice.
 *
 * Usage:
 *   node compile.js          build the reader + status record
 *   node compile.js --pdf    also render the whole book to output/book.pdf
 */

const { marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs = require('highlight.js');
const fs = require('fs-extra');
const path = require('path');

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
);
marked.use({ gfm: true, breaks: false });

const ROOT = __dirname;
const BOOK_DIR = path.join(ROOT, 'book');
const CHAPTERS_DIR = path.join(BOOK_DIR, 'chapters');
const NOTES_DIR = path.join(ROOT, 'source-notes');
const OUTPUT_DIR = path.join(ROOT, 'output');
const STATUS_PATH = path.join(ROOT, 'REWRITE-STATUS.md');

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
  'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

const CALLOUTS = {
  GOALS:   { icon: '🎯', label: 'By the end of this chapter you will understand' },
  ANALOGY: { icon: '💡', label: 'Analogy' },
  INSIDE:  { icon: '⚙️', label: 'What happens inside' },
  WARNING: { icon: '⚠️', label: 'Watch out' },
  TIP:     { icon: '✅', label: 'Tip' },
  SENIOR:  { icon: '🧭', label: 'How a senior engineer thinks' },
  TRY:     { icon: '✍️', label: 'Try it yourself' },
  RECAP:   { icon: '↩️', label: 'Quick reminder' },
  NOTE:    { icon: '📝', label: 'Note' },
};

// ── Helpers ──────────────────────────────────────────────────────────

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stripTags = s => String(s).replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

const slugify = s => stripTags(s).toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section';

const countWords = md => md.replace(/```[\s\S]*?```/g, m => m.replace(/[^\s]+/g, 'w'))
  .split(/\s+/).filter(Boolean).length;

/** Turn `> [!TAG]` blockquotes into styled callout boxes. */
function transformCallouts(html) {
  return html.replace(/<blockquote>\s*<p>\[!([A-Z]+)\]\s*(?:<br>)?\s*([\s\S]*?)<\/blockquote>/g,
    (whole, tag, rest) => {
      const c = CALLOUTS[tag];
      if (!c) return whole;
      return `<aside class="callout callout-${tag.toLowerCase()}">` +
        `<div class="callout-head"><span class="callout-icon">${c.icon}</span>${c.label}</div>` +
        `<div class="callout-body"><p>${rest}</div></aside>`;
    })
    // an empty leading <p></p> appears when the tag sits alone on its line
    .replace(/<div class="callout-body"><p>\s*<\/p>/g, '<div class="callout-body">');
}

/** Give every h2/h3 a stable id scoped to its chapter; return the section list. */
function addHeadingIds(html, chapterId) {
  const sections = [];
  const used = new Set();
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, level, inner) => {
    let id = `${chapterId}--${slugify(inner)}`;
    let n = 2;
    while (used.has(id)) id = `${chapterId}--${slugify(inner)}-${n++}`;
    used.add(id);
    sections.push({ id, level: Number(level), title: stripTags(inner).trim() });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, sections };
}

/** Old notes: collapse "**Q1: …**" interview questions into click-to-open blocks. */
function transformInterviewQA(html) {
  const parts = html.split(/(?=<p><strong>Q\d+:)/i);
  if (parts.length <= 1) return html;
  return parts.map((part, i) => {
    if (i === 0) return part;
    const q = part.match(/^<p><strong>(Q\d+:\s*[^<]*)<\/strong><\/p>/i);
    if (!q) return part;
    const rest = part.slice(q[0].length);
    const cuts = [rest.search(/<p><strong>Q\d+:/i), rest.search(/<h[23]/i)].filter(x => x >= 0);
    const cut = cuts.length ? Math.min(...cuts) : rest.length;
    const answer = rest.slice(0, cut).trim().replace(/^<p>\s*A:\s*/i, '<p>');
    return `<details class="qa"><summary>${q[1].replace(/^Q\d+:\s*/i, '')}</summary>` +
      `<div class="qa-answer">${answer}</div></details>${rest.slice(cut)}`;
  }).join('');
}

/** Parse "- **Term** — definition" lines from a chapter's "## Key terms" section. */
function extractKeyTerms(md) {
  const m = md.match(/^##\s+Key terms\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/m);
  if (!m) return [];
  const terms = [];
  for (const line of m[1].split('\n')) {
    const t = line.match(/^\s*[-*]\s+\*\*(.+?)\*\*\s*[—–:-]+\s*(.+)$/);
    if (t) terms.push({ term: t[1].trim(), def: t[2].trim() });
  }
  return terms;
}

/** Old notes need tidying before display: drop their H1 and their own "Phase N" labels. */
function prepareLegacyMarkdown(md) {
  return md
    .replace(/^#\s+.*$/m, '')           // their H1 — we supply the book's title
    .replace(/^(#{2,6})\s/gm, (m, h) => (h.length < 6 ? '#' + h : h) + ' ') // demote one level
    .replace(/^###\s+Chapter Overview\s*$/m, '### Overview');
}

// ── Build ────────────────────────────────────────────────────────────

async function loadChapters(toc) {
  const chapters = [];
  let number = 0;
  const numbers = new Map(toc.parts.flatMap(p => p.chapters).map((c, i) => [c.id, i + 1]));

  for (const [pi, part] of toc.parts.entries()) {
    for (const ch of part.chapters) {
      number += 1;
      const file = path.join(CHAPTERS_DIR, `${ch.id}.md`);
      const rewritten = await fs.pathExists(file);
      let md;
      let status;

      if (rewritten) {
        md = (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n'); // Windows checkouts use CRLF
        md = md.replace(/^#\s+.*$/m, ''); // the chapter title comes from toc.json
        status = 'rewritten';
      } else if (ch.sources.length) {
        const pieces = [];
        for (const src of ch.sources) {
          const p = path.join(NOTES_DIR, src);
          if (await fs.pathExists(p)) pieces.push(prepareLegacyMarkdown((await fs.readFile(p, 'utf8')).replace(/\r\n/g, '\n')));
          else console.warn(`  [WARN] missing source note: ${src}`);
        }
        md = pieces.join('\n\n---\n\n');
        status = 'notes';
      } else {
        md = '';
        status = 'planned';
      }

      // {{ch:some-id}} → a link that always shows the correct chapter number
      // (inside fenced code blocks, plain "Chapter N" — Markdown links would show literally)
      let inFence = false;
      md = md.split('\n').map(line => {
        if (/^\s*```/.test(line)) { inFence = !inFence; return line; }
        return line.replace(/\{\{ch:([a-z0-9-]+)\}\}/g, (m, id) => {
          if (!numbers.has(id)) { console.warn(`  [WARN] ${ch.id}: unknown chapter reference ${m}`); return m; }
          return inFence ? `Chapter ${numbers.get(id)}` : `[Chapter ${numbers.get(id)}](#${id})`;
        });
      }).join('\n');

      let html = transformCallouts(marked.parse(md));
      if (status === 'notes') html = transformInterviewQA(html);
      const { html: withIds, sections } = addHeadingIds(html, ch.id);

      chapters.push({
        ...ch,
        number,
        partIndex: pi,
        partId: part.id,
        partTitle: part.title,
        status,
        words: status === 'rewritten' ? countWords(md) : 0,
        noteWords: status === 'notes' ? countWords(md) : 0,
        html: withIds,
        sections,
        terms: status === 'rewritten' ? extractKeyTerms(md) : [],
        text: md.replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ')
          .replace(/[#*_>`|[\]()-]/g, ' ').replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return chapters;
}

function chapterBanner(ch) {
  if (ch.status === 'notes') {
    return `<aside class="status-banner notes"><strong>This chapter has not been rewritten yet.</strong>
      What follows are the original condensed notes on this topic. They are accurate but terse —
      written for someone who already knows the basics. The full beginner-friendly chapter will
      replace them.</aside>`;
  }
  if (ch.status === 'planned') {
    return `<aside class="status-banner planned"><strong>This chapter is planned but not written yet.</strong>
      It is a new topic that the original notes did not cover. It will be written as a full chapter.</aside>`;
  }
  return '';
}

function chapterHtml(ch, prev, next) {
  const navLink = (c, dir) => c
    ? `<a class="pager-link ${dir}" href="#${c.id}"><span class="pager-dir">${dir === 'prev' ? '← Previous' : 'Next →'}</span>` +
      `<span class="pager-title">${c.number}. ${esc(c.title)}</span></a>`
    : '<span></span>';
  return `<article class="page chapter" id="page-${ch.id}" data-id="${ch.id}">
    <header class="chapter-head">
      <div class="chapter-kicker">Part ${ROMAN[ch.partIndex + 1]} · ${esc(ch.partTitle)}</div>
      <h1><span class="chapter-num">Chapter ${ch.number}</span>${esc(ch.title)}</h1>
    </header>
    ${chapterBanner(ch)}
    <div class="chapter-body">${ch.html}</div>
    <nav class="pager">${navLink(prev, 'prev')}${navLink(next, 'next')}</nav>
  </article>`;
}

function homeHtml(toc, chapters, stats) {
  const parts = toc.parts.map((part, pi) => {
    const items = chapters.filter(c => c.partIndex === pi).map(c =>
      `<li class="toc-ch ${c.status}"><a href="#${c.id}"><span class="toc-num">${c.number}</span>` +
      `<span class="toc-title">${esc(c.title)}</span>` +
      (c.status === 'rewritten' ? '' : `<span class="toc-flag">${c.status === 'notes' ? 'notes' : 'planned'}</span>`) +
      '</a></li>').join('');
    return `<section class="toc-part">
      <h2><span class="toc-part-num">Part ${ROMAN[pi + 1]}</span>${esc(part.title)}</h2>
      <p class="toc-part-intro">${esc(part.intro)}</p>
      <ol class="toc-list">${items}</ol>
    </section>`;
  }).join('');

  return `<article class="page home" id="page-home" data-id="home">
    <header class="home-hero">
      <h1>${esc(toc.title)}</h1>
      <p class="home-sub">${esc(toc.subtitle)}</p>
      <div class="home-actions">
        <a class="btn primary" href="#${chapters[0].id}">Start at Chapter 1</a>
        <button class="btn" id="resume-btn" type="button" hidden>Continue where you left off</button>
      </div>
    </header>
    <section class="home-guide">
      <h2>Finding your way around</h2>
      <ul>
        <li><strong>Contents</strong> (left) lists every part and chapter. Click any chapter to open it. The chapter you are reading shows its sections underneath, so you can jump straight to one.</li>
        <li><strong>Search</strong> (top of the left panel) looks through the whole book, including headings and the glossary.</li>
        <li><strong>Glossary</strong> explains every technical word the book uses, in plain English, and links to the chapter that teaches it.</li>
        <li><strong>Index</strong> lists every topic and section in the book, A to Z.</li>
        <li>Use <kbd>←</kbd> and <kbd>→</kbd> (or the buttons at the end of each chapter) to move between chapters. The book reopens where you stopped.</li>
      </ul>
      <p class="home-stats">${stats.parts} parts · ${stats.chapters} chapters · ${stats.rewritten} fully rewritten so far</p>
    </section>
    <section class="home-toc">
      <h2>Table of contents</h2>
      ${parts}
      <section class="toc-part">
        <h2><span class="toc-part-num">Reference</span>At the back of the book</h2>
        <ol class="toc-list plain">
          <li class="toc-ch"><a href="#glossary"><span class="toc-num">A</span><span class="toc-title">Glossary</span></a></li>
          <li class="toc-ch"><a href="#index"><span class="toc-num">B</span><span class="toc-title">Index</span></a></li>
        </ol>
      </section>
    </section>
  </article>`;
}

function glossaryHtml(chapters) {
  const map = new Map();
  for (const ch of chapters) {
    for (const t of ch.terms) {
      const key = t.term.toLowerCase();
      if (!map.has(key)) map.set(key, { ...t, chapters: [] });
      map.get(key).chapters.push(ch);
    }
  }
  const entries = [...map.values()].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const byLetter = groupByLetter(entries, e => e.term);
  const body = entries.length
    ? byLetter.map(([letter, list]) => `<section class="az-group"><h2 id="glossary--${letter}">${letter}</h2><dl class="glossary">` +
      list.map(e => `<dt>${esc(e.term)}</dt><dd>${marked.parseInline(e.def)} <span class="gl-refs">— ` +
        e.chapters.map(c => `<a href="#${c.id}">Ch. ${c.number}</a>`).join(', ') + '</span></dd>').join('') +
      '</dl></section>').join('')
    : '<p>The glossary fills in automatically as chapters are rewritten.</p>';
  return {
    count: entries.length,
    entries,
    html: `<article class="page appendix" id="page-glossary" data-id="glossary">
      <header class="chapter-head"><div class="chapter-kicker">Appendix A</div><h1>Glossary</h1></header>
      <p class="appendix-intro">Every technical word this book teaches, explained in plain English. Each entry links to the chapter where it is taught properly. (${entries.length} terms so far — the glossary grows as chapters are rewritten.)</p>
      ${letterBar(byLetter, 'glossary')}
      <input type="search" class="filter-box" data-filter="glossary" placeholder="Filter the glossary…">
      ${body}
    </article>`,
  };
}

function indexHtml(chapters, glossaryEntries) {
  const rows = [];
  for (const ch of chapters) {
    rows.push({ label: ch.title, href: `#${ch.id}`, where: `Chapter ${ch.number}`, kind: 'chapter' });
    if (ch.status !== 'rewritten') continue;
    for (const s of ch.sections) {
      if (/^(key terms|summary|what comes next|exercises)$/i.test(s.title)) continue;
      if (/^exercise \d/i.test(s.title)) continue;
      rows.push({ label: s.title.replace(/^level \d+\s*[—–-]\s*/i, ''), href: `#${s.id}`, where: `Ch. ${ch.number}`, kind: 'section' });
    }
  }
  for (const g of glossaryEntries) {
    rows.push({ label: g.term, href: `#glossary--${letterOf(g.term)}`, where: 'Glossary', kind: 'term' });
  }
  rows.sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
  const byLetter = groupByLetter(rows, r => r.label);
  return `<article class="page appendix" id="page-index" data-id="index">
    <header class="chapter-head"><div class="chapter-kicker">Appendix B</div><h1>Index</h1></header>
    <p class="appendix-intro">Every chapter, every section of the rewritten chapters, and every glossary term, A to Z.</p>
    ${letterBar(byLetter, 'index')}
    <input type="search" class="filter-box" data-filter="index" placeholder="Filter the index…">
    ${byLetter.map(([letter, list]) => `<section class="az-group"><h2 id="index--${letter}">${letter}</h2><ul class="index-list">` +
      list.map(r => `<li class="ix-${r.kind}"><a href="${r.href}">${esc(r.label)}</a><span class="ix-where">${r.where}</span></li>`).join('') +
      '</ul></section>').join('')}
  </article>`;
}

const letterOf = s => { const c = stripTags(s).trim().charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; };

function groupByLetter(list, key) {
  const groups = new Map();
  for (const item of list) {
    const l = letterOf(key(item));
    if (!groups.has(l)) groups.set(l, []);
    groups.get(l).push(item);
  }
  return [...groups.entries()].sort(([a], [b]) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)));
}

const letterBar = (groups, prefix) => `<nav class="letter-bar">${groups.map(([l]) =>
  `<a href="#${prefix}--${l}">${l}</a>`).join('')}</nav>`;

function sidebarHtml(toc, chapters) {
  return toc.parts.map((part, pi) => {
    const items = chapters.filter(c => c.partIndex === pi).map(c => {
      const secs = c.sections.filter(s => s.level === 2)
        .map(s => `<a class="nav-sec" href="#${s.id}">${esc(s.title)}</a>`).join('');
      return `<li class="nav-ch ${c.status}" data-id="${c.id}">
        <a class="nav-ch-link" href="#${c.id}"><span class="nav-num">${c.number}</span><span>${esc(c.title)}</span></a>
        ${secs ? `<div class="nav-secs">${secs}</div>` : ''}
      </li>`;
    }).join('');
    return `<li class="nav-part" data-part="${part.id}">
      <button class="nav-part-btn" type="button"><span class="nav-part-num">${ROMAN[pi + 1]}</span><span>${esc(part.title)}</span><span class="chev">▾</span></button>
      <ol class="nav-chapters">${items}</ol>
    </li>`;
  }).join('') + `<li class="nav-part ref"><div class="nav-ref">
      <a class="nav-ch-link" href="#glossary" data-id="glossary"><span class="nav-num">A</span><span>Glossary</span></a>
      <a class="nav-ch-link" href="#index" data-id="index"><span class="nav-num">B</span><span>Index</span></a>
    </div></li>`;
}

function readerShell({ toc, sidebar, pages, manifest, css, js }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(toc.title)}</title>
<style>${css}</style>
</head>
<body>
<div class="app">
  <div class="scrim" id="scrim"></div>
  <aside class="sidebar" id="sidebar">
    <div class="side-head">
      <a href="#home" class="side-title">${esc(toc.title)}</a>
    </div>
    <div class="side-search">
      <input type="search" id="search" placeholder="Search the whole book…" autocomplete="off">
    </div>
    <div class="side-scroll">
      <div id="search-results" class="search-results" hidden></div>
      <ol class="nav" id="nav">${sidebar}</ol>
    </div>
  </aside>
  <div class="main">
    <header class="topbar">
      <button class="icon-btn" id="menu-btn" type="button" aria-label="Show contents">☰</button>
      <div class="crumb" id="crumb"></div>
      <div class="top-actions">
        <button class="icon-btn" id="prev-btn" type="button" title="Previous chapter (←)">←</button>
        <button class="icon-btn" id="next-btn" type="button" title="Next chapter (→)">→</button>
        <button class="icon-btn" id="font-down" type="button" title="Smaller text">A−</button>
        <button class="icon-btn" id="font-up" type="button" title="Larger text">A+</button>
        <button class="icon-btn" id="theme-btn" type="button" title="Light / dark">◐</button>
      </div>
    </header>
    <div class="read-progress"><div id="read-progress-bar"></div></div>
    <main class="scroller" id="scroller">${pages}</main>
  </div>
</div>
<script>window.__BOOK__ = ${JSON.stringify(manifest).replace(/</g, '\\u003c')};</script>
<script>${js}</script>
</body>
</html>`;
}

function statusRecord(toc, chapters, glossaryCount) {
  const done = chapters.filter(c => c.status === 'rewritten');
  const lines = [
    '# Rewrite status',
    '',
    'Editing record for the book transformation. Generated by `node compile.js` from what',
    'actually exists in `book/chapters/` — do not edit by hand. This is a record of the editing',
    'project, not something shown to the reader.',
    '',
    `- Chapters in the book: **${chapters.length}**`,
    `- Fully rewritten: **${done.length}** (${done.reduce((n, c) => n + c.words, 0).toLocaleString('en')} words)`,
    `- Still showing old notes: **${chapters.filter(c => c.status === 'notes').length}**`,
    `- New topics not yet written: **${chapters.filter(c => c.status === 'planned').length}**`,
    `- Glossary terms collected: **${glossaryCount}**`,
    '',
  ];
  for (const [pi, part] of toc.parts.entries()) {
    lines.push(`## Part ${ROMAN[pi + 1]} — ${part.title}`, '', '| # | Chapter | Status | Words |', '|---|---|---|---|');
    for (const c of chapters.filter(x => x.partIndex === pi)) {
      const label = c.status === 'rewritten' ? '✅ rewritten' : c.status === 'notes' ? '⬜ old notes' : '⬜ planned (new topic)';
      lines.push(`| ${c.number} | ${c.title.replace(/\|/g, '\\|')} | ${label} | ${c.words ? c.words.toLocaleString('en') : '—'} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

async function renderPdf(html, outFile) {
  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(0);
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 0 });
  await page.evaluate(() => document.documentElement.classList.add('print-all'));
  await page.pdf({ path: outFile, format: 'A4', printBackground: true, margin: { top: '1.6cm', bottom: '1.6cm', left: '1.6cm', right: '1.6cm' }, timeout: 0 });
  await browser.close();
}

async function main() {
  const wantPdf = process.argv.includes('--pdf');
  const toc = await fs.readJson(path.join(BOOK_DIR, 'toc.json'));
  await fs.ensureDir(OUTPUT_DIR);

  const chapters = await loadChapters(toc);
  const glossary = glossaryHtml(chapters);
  const stats = {
    parts: toc.parts.length,
    chapters: chapters.length,
    rewritten: chapters.filter(c => c.status === 'rewritten').length,
  };

  const pages = [
    homeHtml(toc, chapters, stats),
    ...chapters.map((c, i) => chapterHtml(c, chapters[i - 1], chapters[i + 1])),
    glossary.html,
    indexHtml(chapters, glossary.entries),
  ].join('\n');

  const manifest = {
    title: toc.title,
    order: ['home', ...chapters.map(c => c.id), 'glossary', 'index'],
    chapters: chapters.map(c => ({
      id: c.id, number: c.number, title: c.title, part: `Part ${ROMAN[c.partIndex + 1]}`,
      partId: c.partId, status: c.status,
      sections: c.sections.map(s => ({ id: s.id, title: s.title })),
      text: c.text.slice(0, 60000).toLowerCase(),
    })),
    glossary: glossary.entries.map(e => ({ term: e.term, def: stripTags(marked.parseInline(e.def)), href: `#glossary--${letterOf(e.term)}` })),
  };

  const css = await fs.readFile(path.join(ROOT, 'styles', 'reader.css'), 'utf8');
  const js = await fs.readFile(path.join(ROOT, 'scripts', 'reader.js'), 'utf8');
  const html = readerShell({ toc, sidebar: sidebarHtml(toc, chapters), pages, manifest, css, js });

  await fs.writeFile(path.join(OUTPUT_DIR, 'index.html'), html, 'utf8');
  await fs.writeFile(STATUS_PATH, statusRecord(toc, chapters, glossary.count), 'utf8');

  console.log(`\n  ${toc.title}`);
  console.log(`  ${stats.chapters} chapters in ${stats.parts} parts — ${stats.rewritten} rewritten, ` +
    `${chapters.filter(c => c.status === 'notes').length} on old notes, ${chapters.filter(c => c.status === 'planned').length} planned`);
  console.log(`  Glossary: ${glossary.count} terms`);
  console.log(`  Reader  → ${path.join(OUTPUT_DIR, 'index.html')}`);
  console.log(`  Status  → ${STATUS_PATH}`);

  if (wantPdf) {
    const out = path.join(OUTPUT_DIR, 'book.pdf');
    console.log('  Rendering PDF (this takes a while)…');
    await renderPdf(html, out);
    console.log(`  PDF     → ${out}`);
  }
  console.log('');
}

main().catch(err => {
  console.error('\n[FATAL]', err.stack || err.message);
  process.exit(1);
});
