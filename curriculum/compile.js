/**
 * Software Engineering Curriculum — PDF Compiler
 *
 * Reads all markdown chapter files from phases/, converts to HTML,
 * and renders a single book-quality PDF using Puppeteer.
 *
 * Usage:
 *   node compile.js                    — full curriculum
 *   node compile.js --phase 1          — phase 1 only
 *   node compile.js --chapter javascript — single chapter
 *   node compile.js --html-only           — skip PDF (faster, reader only)
 */

const puppeteer  = require('puppeteer');
const { marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs       = require('highlight.js');
const fs         = require('fs-extra');
const path       = require('path');
const { glob }   = require('glob');

// ── Configure marked with syntax highlighting ───────────────
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

marked.use({
  breaks: false,
  gfm: true,
  tables: true
});

// ── Config ───────────────────────────────────────────────────
const ROOT       = __dirname;
const PHASES_DIR = path.join(ROOT, 'phases');
const STYLES_DIR = path.join(ROOT, 'styles');
const OUTPUT_DIR = path.join(ROOT, 'output');
const DATA_DIR   = path.join(ROOT, 'data');
const OUTPUT_PDF = path.join(OUTPUT_DIR, 'curriculum.pdf');
const CSS_PATH   = path.join(STYLES_DIR, 'book.css');
const PLAN_PATH  = path.join(DATA_DIR, 'plan.json');

// Explicit phase order — do not rely on filename sorting.
const PHASE_ORDER = [
  'phase-0-mission',
  'phase-1-programming-foundations',
  'phase-2-backend-engineering',
  'phase-3-databases',
  'phase-4-frontend',
  'phase-5-devops',
  'phase-6-cloud',
  'phase-7-system-design',
  'phase-8-ai-engineering',
  'phase-9-software-engineering',
  'phase-10-english-communication',
  'phase-11-job-hunt-pakistan',
  'phase-12-daily-execution-plan',
  'phase-13-appendix',
];

// Phase metadata for divider pages
const PHASE_META = {
  'phase-0-mission': {
    number: 'PHASE 0',
    title: 'Mission & Method',
    desc: 'The goal, the deadline, how learning actually works, the AI habit that has to be undone, and the system that runs all 350 days.',
    topics: ['How to Use This Book','The Mission','How Learning Actually Works','The AI Dependency Problem','The Operating System','The Scoreboard']
  },
  'phase-1-programming-foundations': {
    number: 'PHASE 1',
    title: 'Programming Foundations',
    desc: 'Master the language, patterns, and principles that underpin all software engineering.',
    topics: ['JavaScript','TypeScript','Data Structures','Algorithms','OOP','Functional Programming','Async Programming','Design Patterns','SOLID','Clean Code','Git','GitHub']
  },
  'phase-2-backend-engineering': {
    number: 'PHASE 2',
    title: 'Backend Engineering',
    desc: 'Build production-grade APIs, services, and server-side systems.',
    topics: ['Node.js','Express','NestJS','REST APIs','GraphQL','Auth/JWT/OAuth','Queues','WebSockets','Redis','Rate Limiting','API Docs']
  },
  'phase-3-databases': {
    number: 'PHASE 3',
    title: 'Databases',
    desc: 'Design, optimize, and scale relational and document databases.',
    topics: ['SQL','PostgreSQL','MongoDB','Database Design','Normalization','Transactions','Indexes','Query Optimization','Replication','Sharding','Prisma','TypeORM']
  },
  'phase-4-frontend': {
    number: 'PHASE 4',
    title: 'Frontend Engineering',
    desc: 'Build modern, performant, accessible web interfaces.',
    topics: ['HTML','CSS','Tailwind CSS','React','Next.js','State Management','Forms','Auth','Performance','SEO']
  },
  'phase-5-devops': {
    number: 'PHASE 5',
    title: 'DevOps',
    desc: 'Automate, containerize, and operate production infrastructure.',
    topics: ['Linux','Shell Scripting','Docker','Docker Compose','Nginx','GitHub Actions','CI/CD','Terraform','Networking','DNS','SSL','Monitoring','Prometheus','Grafana']
  },
  'phase-6-cloud': {
    number: 'PHASE 6',
    title: 'Cloud Engineering (AWS)',
    desc: 'Design and operate scalable, secure, cost-efficient cloud architectures.',
    topics: ['AWS','IAM','EC2','S3','RDS','CloudWatch','VPC','Route 53','CloudFront','ECS','Lambda','SQS/SNS','CloudFormation','SAA Prep']
  },
  'phase-7-system-design': {
    number: 'PHASE 7',
    title: 'System Design',
    desc: 'Architect distributed systems that scale to millions of users.',
    topics: ['Fundamentals','Scalability','CAP Theorem','Caching','Message Brokers','Distributed Systems','Load Balancers','CDNs','Microservices','API Gateway','Designing Uber/WhatsApp/Netflix']
  },
  'phase-8-ai-engineering': {
    number: 'PHASE 8',
    title: 'AI Engineering',
    desc: 'Build intelligent applications using LLMs, RAG, agents, and AI pipelines.',
    topics: ['Python','LLM Fundamentals','Prompt Engineering','Embeddings','Vector DBs','RAG','AI Agents','MCP','LangChain','LangGraph','OpenAI','Anthropic','Gemini','Ollama','AI SaaS']
  },
  'phase-9-software-engineering': {
    number: 'PHASE 9',
    title: 'Software Engineering Practice',
    desc: 'Work effectively on teams, lead projects, and grow your career.',
    topics: ['Agile','Scrum','SDLC','Code Reviews','Documentation','Technical Writing','ADRs','Estimations','Leadership','Mentoring','Career Growth']
  },
  'phase-10-english-communication': {
    number: 'PHASE 10',
    title: 'English & Communication',
    desc: 'The half of the interview that is not code — speaking about your work, thinking out loud, and negotiating.',
    topics: ['Speaking About Your Work','Explaining Technical Work','The Interview Conversation','Written English at Work','The First Five Minutes','Answering What You Cannot Answer','Talking About Code Out Loud','The Salary Conversation','Interview Under Pressure','Presenting a Design']
  },
  'phase-11-job-hunt-pakistan': {
    number: 'PHASE 11',
    title: 'The Pakistan Job Hunt',
    desc: 'The market map, the CV, the applications, the referrals, the interview loop, the offer, and the first ninety days.',
    topics: ['The Pakistani Market','The CV That Gets Read','Applying Without Wasting Shots','Referrals & Recruiters','The Interview Loop','Negotiating Your Offer','The First Ninety Days','Portfolio & Personal Brand','Remote Work — The Next Step']
  },
  'phase-12-daily-execution-plan': {
    number: 'PHASE 12',
    title: 'The Daily Execution Plan',
    desc: 'All 353 days, dated and scheduled — 25 September 2026 to 12 September 2027. Open this every morning.',
    topics: ['The 350-Day Plan','September 2026','October 2026','November 2026','December 2026','January 2027','February 2027','March 2027','April 2027','May 2027','June 2027','July 2027','August 2027','September 2027']
  },
  'phase-13-appendix': {
    number: 'PHASE 13',
    title: 'Appendix',
    desc: 'Supporting personal plans kept alongside the main mission.',
    topics: ['Italy Study Route']
  }
};

// ── Helpers ──────────────────────────────────────────────────
function buildCoverPage(stats, plan) {
  return `
<div class="cover-page">
  <div class="cover-eyebrow">The 350-Day Plan</div>
  <h1>From Stuck<br>to Hired</h1>
  <div class="cover-subtitle">
    JavaScript · Node · React · PostgreSQL · AWS<br>
    System Design · AI Engineering · Interviewing · Negotiation
  </div>
  <div class="cover-divider"></div>
  <div class="cover-meta">
    ${stats.phases} Phases · ${stats.chapters} Chapters · ${stats.words.toLocaleString('en-GB')} Words · 2 Shipped Projects<br>
    ${plan ? `${plan.meta.totalDays} dated days · ${plan.meta.totalTasks} scheduled tasks · ${plan.meta.totalHours} hours<br>` : ''}
    Three years of maintenance work → a real engineering job at 3× the salary<br><br>
    <strong style="color:#bfdbfe;">25 September 2026 → 12 September 2027</strong>
  </div>
  <div class="cover-phases">
    ${PHASE_ORDER.filter(k => PHASE_META[k]).map(k => `<div class="cover-phase-item">${PHASE_META[k].number}: ${PHASE_META[k].title}</div>`).join('')}
  </div>
</div>`;
}

/** Roadmap page, generated from the real dated plan. */
function buildRoadmapPage(plan) {
  if (!plan) return '';

  const D = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const fmt = s => { const [y,m,d] = s.split('-').map(Number); return `${d} ${M[m-1]} ${y}`; };

  const roles = [
    ['◆','Tier 4 — where you are','Small shop · PHP · AngularJS · no review','PKR 50k – 120k / month','Today','rm-role-free'],
    ['⚙','Tier 3 — the floor','Devsinc · Tkxel · Contour · NETSOL','PKR 120k – 250k / month','Reachable from Week 8','rm-role-backend'],
    ['◻','Tier 2 — THE TARGET','Arbisoft · 10Pearls · VentureDive · Confiz','PKR 250k – 450k / month','Ready Week 13','rm-role-arch'],
    ['◈','Tier 1 — the year after','Motive · Careem · Bazaar · Retailo','PKR 400k – 800k+ / month','A 2-year path','rm-role-ai'],
    ['☁','International remote','The step after the Tier 2 job','$1.5K – $5K / month','Phase 11 Ch.9','rm-role-cloud'],
  ];

  const blockHtml = plan.blocks.map(block => {
    const weeks = block.weeks.map(n => plan.weeks.find(w => w.n === n));
    const weeksHtml = weeks.map(w => {
      const days = plan.days.filter(d => d.week === w.n);
      const first = days[0], last = days[days.length - 1];
      return `
      <div class="rm-week">
        <div class="rm-week-num">Week ${w.n}<br><span style="font-weight:400;opacity:.75">${first.short}–${last.short}</span></div>
        <div class="rm-week-body">
          <div class="rm-week-title">${w.title}</div>
          <div class="rm-week-tasks">${w.theme}</div>
          <div class="rm-week-daily"><strong>Deliverable:</strong> ${w.deliverable}</div>
          <div class="rm-week-milestone">✓ ${w.milestone}</div>
        </div>
      </div>`;
    }).join('');

    return `
  <div class="rm-phase-block rm-phase-learn">
    <div class="rm-phase-label">BLOCK ${block.name}</div>
    <div class="rm-phase-desc">Weeks ${block.weeks[0]}–${block.weeks[block.weeks.length - 1]}</div>
    <div class="rm-weeks">${weeksHtml}</div>
  </div>`;
  }).join('');

  const anchorRows = [
    [plan.anchors.start,       'Day 1 — the honest audit. BASELINE.md written.'],
    [plan.anchors.cvReady,     'CV, LinkedIn and GitHub finished — this is a gate'],
    [plan.anchors.applyStart,  'APPLICATIONS OPEN — on the weekly quota (5 → 10 → 15)'],
    [plan.anchors.apiLive,     'Project 1 API deployed at a public URL'],
    [plan.anchors.aiUnlock,    'AI unlocked — reviewer, never author'],
    [plan.anchors.project1,    'Project 1 data layer complete — SQL and NoSQL'],
    [plan.anchors.project2,    'Project 2 live — NestJS, queues, Redis, tested'],
    [plan.anchors.project3,    'Project 3 live — retrieval service, measured'],
    [plan.anchors.mockStart,   'First mock interview with a real person'],
    [plan.anchors.deadline,    'DEADLINE — the plan closes, final accounting'],
  ].map(([d, t]) => `<div class="rm-rule"><span class="rm-rule-num">${fmt(d).split(' ')[0]}</span><div><strong>${fmt(d)}</strong><br>${t}</div></div>`).join('');

  const slotBlurb = {
    'Deep Study':       'Chapter theory, before work. The block nothing can take from you.',
    'Job Hunt':         'Applications from 19 October on a weekly quota — 5, then 10, then 15. Referrals and follow-ups.',
    'Build':            'Implement what the morning explained. Build, do not read.',
    'Deep Build':       'The largest uninterrupted block of the week. Project work only.',
    'Study':            'Chapter reading and theory.',
    'Interview Drill':  'Problems, mocks, and speaking aloud. Always out loud.',
    'Review + Apply':   'The weekly review, and the week\'s last applications.',
  };
  const mkSlots = list => (list ?? []).map(s => [s.time.replace('–',' – '), s.name, slotBlurb[s.name] ?? '']).map(([t,n,d]) => `
      <div class="rm-schedule-slot">
        <div class="rm-slot-time">${t}</div>
        <div class="rm-slot-activity">${n}<br><span>${d}</span></div>
      </div>`).join('');

  const weekdaySlots  = mkSlots(plan.slots?.weekday);
  const saturdaySlots = mkSlots(plan.slots?.saturday);

  return `
<div class="roadmap-page">

  <div class="rm-header">
    <div class="rm-eyebrow">THE 350-DAY PLAN</div>
    <h1 class="rm-title">${fmt(plan.meta.start)} → ${fmt(plan.meta.end)}</h1>
    <p class="rm-subtitle">
      ${plan.meta.totalDays} dated days · ${plan.meta.totalWeeks} weeks · ${plan.meta.totalTasks} scheduled tasks · ${plan.meta.totalHours} hours.<br>
      ${plan.meta.workingDays} working days · ${plan.meta.restDays} rest days.<br>
      Three tracks in parallel: Engineering · Job Hunt · Communication.<br>
      <strong>2h Mon–Fri, 4h Saturday, Sunday off — 14 hours a week, every week.</strong>
    </p>
  </div>

  <div class="rm-roles-section">
    <div class="rm-section-label">THE MARKET MAP — WHERE YOU ARE AND WHERE THIS GOES</div>
    <div class="rm-roles-grid">
      ${roles.map(([icon,name,stack,salary,phase,cls]) => `
      <div class="rm-role-card ${cls}">
        <div class="rm-role-icon">${icon}</div>
        <div class="rm-role-name">${name}</div>
        <div class="rm-role-stack">${stack}</div>
        <div class="rm-role-salary">${salary}</div>
        <div class="rm-role-phase">${phase}</div>
      </div>`).join('')}
    </div>
  </div>

  ${blockHtml}

  <div class="rm-schedule-section">
    <div class="rm-section-label">THE WEEKDAY (2h, while employed full-time)</div>
    <div class="rm-schedule-grid">${weekdaySlots}</div>
  </div>

  <div class="rm-schedule-section">
    <div class="rm-section-label">SATURDAY (4h) &middot; SUNDAY OFF</div>
    <div class="rm-schedule-grid">${saturdaySlots}</div>
    <div class="rm-phase-desc" style="margin-top:14px">
      Sunday carries no tasks at all. It is a scheduled rest day and it is what makes
      fifty consecutive weeks possible. The streak counter treats it as neutral.
    </div>
  </div>

  <div class="rm-rules-section">
    <div class="rm-section-label">FIXED ANCHORS — THESE DO NOT MOVE</div>
    <div class="rm-rules-grid">${anchorRows}</div>
  </div>

  <div class="rm-rules-section">
    <div class="rm-section-label">THE EIGHT RULES</div>
    <div class="rm-rules-grid">
      <div class="rm-rule"><span class="rm-rule-num">1</span><div><strong>The dawn block is untouchable.</strong> 05:00–06:30, every working day. Evening study is the first thing life cancels; 05:00 is not.</div></div>
      <div class="rm-rule"><span class="rm-rule-num">2</span><div><strong>No AI writes code until 1 February 2027.</strong> Documentation is allowed. Concept explanations are allowed <em>after</em> twenty minutes of genuine attempt. Generated code is not.</div></div>
      <div class="rm-rule"><span class="rm-rule-num">3</span><div><strong>Commit publicly every day.</strong> A day with no commit did not happen. The contribution graph compounds for 350 days.</div></div>
      <div class="rm-rule"><span class="rm-rule-num">4</span><div><strong>Twenty minutes before you look anything up.</strong> Stuck means stuck for twenty minutes. Most of the time you solve it in eight.</div></div>
      <div class="rm-rule"><span class="rm-rule-num">5</span><div><strong>Start applying before you feel ready.</strong> Applications open 19 October regardless, on a ramping weekly quota. The funnel takes 4–8 weeks and you cannot buy that time back.</div></div>
      <div class="rm-rule"><span class="rm-rule-num">6</span><div><strong>Miss one day, fine. Miss two, diagnose.</strong> Never try to catch up — resume on today. Cut breadth, keep depth.</div></div>
      <div class="rm-rule"><span class="rm-rule-num">7</span><div><strong>Milestones are pass or fail.</strong> "Mostly" is a no. Be as strict as the interviewer will be.</div></div>
      <div class="rm-rule"><span class="rm-rule-num">8</span><div><strong>Ignore everything marked LATER.</strong> Only the core chapters are scheduled. If it is not in the week you are on, it is not your problem yet.</div></div>
    </div>
  </div>

</div>`;
}


function buildPhaseDivider(phaseKey) {
  const meta = PHASE_META[phaseKey];
  if (!meta) return '';
  const tags = meta.topics.map(t => `<span class="phase-topic-tag">${t}</span>`).join('');
  return `
<div class="phase-divider">
  <div class="phase-number">${meta.number}</div>
  <h2>${meta.title}</h2>
  <div class="phase-desc">${meta.desc}</div>
  <div class="phase-topics">${tags}</div>
</div>`;
}

function mdToHtml(mdContent) {
  return marked.parse(mdContent);
}

function getChapterId(file) {
  const phaseDir = path.dirname(file).split(path.sep).pop();
  const slug = path.basename(file, '.md').replace(/^\d+-/, '');
  return `${phaseDir}--${slug}`;
}

function getChapterTitle(mdContent, file) {
  const h1 = mdContent.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].replace(/^Phase\s+\d+\s*[—–-]\s*Chapter\s+\d+:\s*/i, '').trim();
  return path.basename(file, '.md').replace(/^\d+-/, '').replace(/-/g, ' ');
}

function transformInterviewQA(html) {
  // Wrap "Interview Preparation" section
  if (/<h2[^>]*>Interview Preparation<\/h2>/i.test(html)) {
    html = html.replace(
      /<h2[^>]*>Interview Preparation<\/h2>/gi,
      '<div class="interview-zone"><div class="interview-section-header"><span class="icon">💼</span><h2>Interview Questions &amp; Answers</h2></div>'
    );
    const closeMarkers = /<h2[^>]*>(?:Cheat Sheet|Self[- ]Assessment|Practice Projects|Quick Reference|Chapter Summary|Summary|Further Reading)/i;
    const match = html.match(closeMarkers);
    if (match) {
      const idx = html.indexOf(match[0]);
      html = html.slice(0, idx) + '</div>\n' + html.slice(idx);
    } else {
      html += '</div>';
    }
  }

  // Convert **Q1: question** paragraphs into collapsible QA blocks
  const parts = html.split(/(?=<p><strong>Q\d+:)/i);
  if (parts.length <= 1) return html;

  const rebuilt = parts.map((part, i) => {
    if (i === 0) return part;

    const qMatch = part.match(/^<p><strong>(Q\d+:\s*[^<]*)<\/strong><\/p>/i);
    if (!qMatch) return part;

    const question = qMatch[1].trim();
    let rest = part.slice(qMatch[0].length);

    const nextQ = rest.search(/<p><strong>Q\d+:/i);
    const nextH3 = rest.search(/<h3/i);
    let cutAt = rest.length;
    if (nextQ >= 0) cutAt = Math.min(cutAt, nextQ);
    if (nextH3 >= 0) cutAt = Math.min(cutAt, nextH3);

    let answer = rest.slice(0, cutAt).trim();
    const remainder = rest.slice(cutAt);

    answer = answer.replace(/^<p>\s*A:\s*/i, '<p>');

    return `<div class="qa-block">
      <div class="qa-question" role="button" tabindex="0" aria-expanded="false">
        <span class="qa-label">Q</span>
        <span class="qa-question-text">${question.replace(/^Q\d+:\s*/i, '')}</span>
        <span class="qa-chevron">▼</span>
      </div>
      <div class="qa-answer">${answer}</div>
    </div>${remainder}`;
  });

  return rebuilt.join('');
}

function hasInterviewSection(html) {
  return /Interview Preparation|interview-zone|class="qa-block"/i.test(html);
}

async function getChapterFiles(filterPhase, filterChapter) {
  const pattern = path.join(PHASES_DIR, '**', '*.md').replace(/\\/g, '/');
  let files = await glob(pattern);

  // Sort by explicit PHASE_ORDER, then by file numeric prefix.
  const rank = key => {
    const i = PHASE_ORDER.indexOf(key);
    return i === -1 ? PHASE_ORDER.length : i;
  };
  files.sort((a, b) => {
    const pa = path.dirname(a).split(path.sep).pop();
    const pb = path.dirname(b).split(path.sep).pop();
    if (pa !== pb) {
      const d = rank(pa) - rank(pb);
      if (d !== 0) return d;
      return pa.localeCompare(pb, undefined, { numeric: true });
    }
    return path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true });
  });

  if (filterPhase) {
    files = files.filter(f => path.dirname(f).includes(`phase-${filterPhase}`));
  }
  if (filterChapter) {
    files = files.filter(f => path.basename(f).toLowerCase().includes(filterChapter.toLowerCase()));
  }

  return files;
}

function buildFullHtml(bodyContent, cssContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Software Engineering Mastery Curriculum</title>
  <style>${cssContent}</style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

function buildReaderHtml(chapters, manifest, plan, stats) {
  const chapterPanes = chapters.map(ch => `
  <article id="${ch.id}" class="chapter-pane" data-phase="${ch.phaseKey}">
    ${ch.html}
  </article>`).join('\n');

  const manifestJson = JSON.stringify(manifest);
  const planJson     = plan ? JSON.stringify(plan) : 'null';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Career Book — Software Engineering Mastery</title>
  <link rel="stylesheet" href="reader.css">
</head>
<body>
  <div class="reader-app">
    <div class="sidebar-overlay"></div>
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1>Career Book</h1>
        <p>${stats.chapters} chapters · ${plan ? plan.meta.totalDays + ' days' : 'Interactive Reader'}</p>
      </div>
      <div class="sidebar-search">
        <input type="search" id="chapter-search" placeholder="Search the whole book…" autocomplete="off">
      </div>
      <div class="sidebar-tabs">
        <button class="sidebar-tab active" data-panel="plan" type="button">Plan</button>
        <button class="sidebar-tab" data-panel="chapters" type="button">Chapters</button>
        <button class="sidebar-tab" data-panel="interview" type="button">Q&amp;A</button>
      </div>
      <nav class="sidebar-nav">
        <div id="plan-nav" class="plan-nav"></div>
        <div id="chapters-nav" style="display:none"></div>
        <div id="interview-nav" class="interview-list" style="display:none"></div>
        <div id="search-results" class="search-results" style="display:none"></div>
      </nav>
    </aside>

    <div class="main-area">
      <header class="top-bar">
        <button class="menu-btn" type="button" aria-label="Toggle menu">☰</button>
        <div class="breadcrumb">Your plan for today</div>
        <div class="top-actions">
          <button class="nav-btn" id="today-btn" type="button" title="Jump to today">Today</button>
          <button class="view-toggle" id="interview-toggle" type="button" style="display:none">Interview Q&amp;A</button>
          <button class="nav-btn" id="prev-chapter" type="button" title="Previous">←</button>
          <button class="nav-btn" id="next-chapter" type="button" title="Next">→</button>
          <button class="nav-btn icon-btn" id="theme-toggle" type="button" title="Toggle theme">◐</button>
          <button class="nav-btn icon-btn" id="font-smaller" type="button" title="Smaller text">A−</button>
          <button class="nav-btn icon-btn" id="font-larger" type="button" title="Larger text">A+</button>
        </div>
      </header>
      <div class="progress-bar-wrap"><div class="progress-bar"></div></div>
      <div class="content-scroll">
        <div id="plan-pane" class="plan-pane"></div>
        <div id="welcome-pane" class="welcome-pane" style="display:none">
          <h2>Career Book</h2>
          <p>Fundamentals through cloud, AI engineering, system design, interviewing and negotiation — wired to a dated ${plan ? plan.meta.totalDays + '-day' : ''} plan that ends in a signed offer.</p>
          <div class="welcome-stats">
            <div class="welcome-stat"><strong>${stats.phases}</strong><span>Phases</span></div>
            <div class="welcome-stat"><strong>${stats.chapters}</strong><span>Chapters</span></div>
            <div class="welcome-stat"><strong>${Math.round(stats.words / 1000)}k</strong><span>Words</span></div>
            <div class="welcome-stat"><strong>${manifest.filter(c => c.hasInterview).length}</strong><span>Q&amp;A Sets</span></div>
          </div>
          <button class="resume-btn" id="resume-reading" type="button">Resume Reading</button>
        </div>
        ${chapterPanes}
      </div>
    </div>
  </div>
  <div class="save-toast">Progress saved</div>
  <script>
    window.__BOOK_MANIFEST__ = ${manifestJson};
    window.__PLAN__ = ${planJson};
  </script>
  <script src="reader.js"></script>
</body>
</html>`;
}

// ── Main Compile Function ─────────────────────────────────────
async function compile() {
  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log('  Software Engineering Curriculum — PDF Compiler');
  console.log('══════════════════════════════════════════════════════');

  // Parse args
  const args = process.argv.slice(2);
  const phaseArg   = args.includes('--phase')   ? args[args.indexOf('--phase')   + 1] : null;
  const chapterArg = args.includes('--chapter')  ? args[args.indexOf('--chapter') + 1] : null;
  const htmlOnly   = args.includes('--html-only');

  // Ensure output dir
  await fs.ensureDir(OUTPUT_DIR);

  // Load CSS
  let cssContent = '';
  if (await fs.pathExists(CSS_PATH)) {
    cssContent = await fs.readFile(CSS_PATH, 'utf8');
  } else {
    console.warn('[WARN] book.css not found, PDF will use default styles');
  }

  // Gather chapter files
  const files = await getChapterFiles(phaseArg, chapterArg);
  if (files.length === 0) {
    console.error('[ERROR] No chapter files found. Generate some chapters first!');
    process.exit(1);
  }
  console.log(`\n  Found ${files.length} chapter(s) to compile\n`);

  // Load reader assets
  const READER_CSS  = path.join(STYLES_DIR, 'reader.css');
  const READER_CSS2 = path.join(STYLES_DIR, 'reader-v2.css');
  const READER_JS   = path.join(ROOT, 'scripts', 'reader.js');
  let readerCss = '';
  let readerJs  = '';
  if (await fs.pathExists(READER_CSS))  readerCss  = await fs.readFile(READER_CSS,  'utf8');
  if (await fs.pathExists(READER_CSS2)) readerCss += '\n' + await fs.readFile(READER_CSS2, 'utf8');
  if (await fs.pathExists(READER_JS))   readerJs   = await fs.readFile(READER_JS,   'utf8');

  // Load the dated plan (built by plan/build-plan.js)
  let plan = null;
  if (await fs.pathExists(PLAN_PATH)) {
    plan = await fs.readJson(PLAN_PATH);
    console.log(`  Plan loaded: ${plan.meta.totalDays} days, ${plan.meta.totalTasks} tasks\n`);
  } else {
    console.warn('  [WARN] data/plan.json not found — run `node plan/build-plan.js` first.\n');
  }

  // Build HTML body (PDF) + reader chapters
  let body = '';
  let currentPhase = null;
  const chapters = [];
  const manifest = [];
  const phaseKeys = new Set();
  let totalWords = 0;

  // Cover + roadmap are appended after the loop, once stats are known.
  const bodyParts = [];

  for (const file of files) {
    const phaseDir = path.dirname(file).split(path.sep).pop();
    const phaseMeta = PHASE_META[phaseDir];

    // Phase divider
    if (phaseDir !== currentPhase) {
      currentPhase = phaseDir;
      bodyParts.push(buildPhaseDivider(phaseDir));
      console.log(`\n  ▶  ${phaseMeta?.title || phaseDir}`);
    }

    // Chapter content
    const md = await fs.readFile(file, 'utf8');
    let html = mdToHtml(md);
    html = transformInterviewQA(html);

    const chapterId    = getChapterId(file);
    const chapterTitle = getChapterTitle(md, file);
    const chapterName  = path.basename(file, '.md').replace(/^\d+-/, '').replace(/-/g, ' ');
    const words        = md.split(/\s+/).filter(Boolean).length;
    totalWords += words;
    phaseKeys.add(phaseDir);
    console.log(`     • ${chapterName.padEnd(42)} ${String(words).padStart(6)} words`);

    bodyParts.push(`<section class="chapter" data-chapter="${chapterName}">\n${html}\n</section>\n`);

    chapters.push({ id: chapterId, phaseKey: phaseDir, html });
    manifest.push({
      id: chapterId,
      title: chapterTitle,
      phaseKey: phaseDir,
      phaseTitle: phaseMeta?.title || phaseDir,
      phaseNumber: phaseMeta?.number || '',
      words,
      hasInterview: hasInterviewSection(html),
      // Plain-text index for full-text search in the reader.
      text: md.replace(/```[\s\S]*?```/g, ' ').replace(/[#*_>`|\-]/g, ' ')
              .replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 24000),
    });
  }

  const stats = { phases: phaseKeys.size, chapters: files.length, words: totalWords };

  if (!phaseArg && !chapterArg) {
    body += buildCoverPage(stats, plan);
    body += buildRoadmapPage(plan);
  }
  body += bodyParts.join('');

  const fullHtml = buildFullHtml(body, cssContent);

  // Write PDF-oriented HTML
  const htmlOut = path.join(OUTPUT_DIR, 'curriculum.html');
  await fs.writeFile(htmlOut, fullHtml, 'utf8');
  console.log(`\n  PDF HTML written → ${htmlOut}`);

  // Write interactive reader
  const readerHtml = buildReaderHtml(chapters, manifest, plan, stats);
  const readerOut  = path.join(OUTPUT_DIR, 'index.html');
  await fs.writeFile(readerOut, readerHtml, 'utf8');
  await fs.writeFile(path.join(OUTPUT_DIR, 'reader.css'), readerCss, 'utf8');
  await fs.writeFile(path.join(OUTPUT_DIR, 'reader.js'), readerJs, 'utf8');
  console.log(`  Interactive reader → ${readerOut}`);

  if (htmlOnly) {
    console.log('\n  Skipping PDF (--html-only)');
    console.log('');
    console.log('══════════════════════════════════════════════════════');
    console.log(`  ✓  ${files.length} chapter(s) compiled`);
    console.log(`  ✓  Reader: ${readerOut}`);
    console.log('══════════════════════════════════════════════════════');
    console.log('');
    return;
  }

  // Launch Puppeteer and render PDF
  console.log('\n  Launching Puppeteer (this may take a moment)...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0);
  await page.setDefaultTimeout(0);
  await page.setContent(fullHtml, { waitUntil: 'domcontentloaded', timeout: 0 });

  // Give fonts and images time to load
  await new Promise(r => setTimeout(r, 2000));

  console.log('  Rendering PDF...');
  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-size:8px;color:#94a3b8;width:100%;padding:0 2.2cm;display:flex;justify-content:space-between;font-family:Inter,sans-serif;">
        <span>Software Engineering Mastery Curriculum</span>
        <span class="title"></span>
      </div>`,
    footerTemplate: `
      <div style="font-size:8px;color:#94a3b8;width:100%;padding:0 2.2cm;display:flex;justify-content:space-between;font-family:Inter,sans-serif;">
        <span>© ${new Date().getFullYear()} — Personal Use Only</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
    margin: { top: '1.8cm', bottom: '1.8cm', left: '0', right: '0' },
    timeout: 300000
  });

  await browser.close();

  const stat = await fs.stat(OUTPUT_PDF);
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);

  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  ✓  PDF compiled successfully!`);
  console.log(`  ✓  ${files.length} chapter(s) included`);
  console.log(`  ✓  File size: ${sizeMB} MB`);
  console.log(`  ✓  PDF output: ${OUTPUT_PDF}`);
  console.log(`  ✓  Reader: ${readerOut}`);
  console.log('══════════════════════════════════════════════════════');
  console.log('');
}

compile().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
