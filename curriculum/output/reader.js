/**
 * Career Book — Interactive Reader
 *
 *   Plan tab      — today's tasks, tick boxes, streak, countdown, week/block navigation
 *   Chapters tab  — the full curriculum with reading position saved
 *   Q&A tab       — every interview section in the book, collapsed
 *   Search        — full text across all chapters, not just titles
 *   Theme + type  — dark/light and font scale, persisted
 *
 * All progress lives in localStorage under one key so it survives rebuilds.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'career-book-v2';
  const SAVE_DEBOUNCE_MS = 800;

  const manifest = window.__BOOK_MANIFEST__ || [];
  const PLAN     = window.__PLAN__ || null;

  let currentChapterId = null;
  let interviewOnly = false;
  let saveTimer = null;
  let activePanel = PLAN ? 'plan' : 'chapters';
  let viewDate = null; // ISO date currently shown in the Plan pane

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const els = {
    app:           $('.reader-app'),
    sidebar:       $('.sidebar'),
    overlay:       $('.sidebar-overlay'),
    menuBtn:       $('.menu-btn'),
    searchInput:   $('#chapter-search'),
    planNav:       $('#plan-nav'),
    chaptersNav:   $('#chapters-nav'),
    interviewNav:  $('#interview-nav'),
    searchResults: $('#search-results'),
    tabs:          $$('.sidebar-tab'),
    breadcrumb:    $('.breadcrumb'),
    prevBtn:       $('#prev-chapter'),
    nextBtn:       $('#next-chapter'),
    todayBtn:      $('#today-btn'),
    interviewBtn:  $('#interview-toggle'),
    themeBtn:      $('#theme-toggle'),
    fontUp:        $('#font-larger'),
    fontDown:      $('#font-smaller'),
    contentScroll: $('.content-scroll'),
    planPane:      $('#plan-pane'),
    welcomePane:   $('#welcome-pane'),
    saveToast:     $('.save-toast'),
    progressBar:   $('.progress-bar'),
  };

  // ── State ───────────────────────────────────────────────────

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function saveState(partial, quiet) {
    const state = { ...loadState(), ...partial, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!quiet) showSaveToast();
  }

  function getDone() { return loadState().done || {}; }

  function setTaskDone(taskId, done) {
    const d = getDone();
    if (done) d[taskId] = 1; else delete d[taskId];
    saveState({ done: d }, true);
  }

  function showSaveToast() {
    if (!els.saveToast) return;
    els.saveToast.classList.add('show');
    clearTimeout(els.saveToast._timer);
    els.saveToast._timer = setTimeout(() => els.saveToast.classList.remove('show'), 1400);
  }

  // ── Date helpers ────────────────────────────────────────────

  function todayISO() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }

  function daysBetween(a, b) {
    return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
  }

  /** The plan day for today, or the nearest edge if today is outside the range. */
  function resolveToday() {
    if (!PLAN) return null;
    const t = todayISO();
    const exact = PLAN.days.find(d => d.date === t);
    if (exact) return exact;
    if (t < PLAN.meta.start) return PLAN.days[0];
    return PLAN.days[PLAN.days.length - 1];
  }

  function dayByDate(date) {
    return PLAN ? PLAN.days.find(d => d.date === date) : null;
  }

  // ── Progress maths ──────────────────────────────────────────

  function dayCompletion(day) {
    const done = getDone();
    const n = day.tasks.filter(t => done[t.id]).length;
    if (day.isRest) return { done: 0, total: 0, pct: 1, rest: true };
    return { done: n, total: day.tasks.length, pct: day.tasks.length ? n / day.tasks.length : 0 };
  }

  function overallStats() {
    if (!PLAN) return null;
    const done = getDone();
    const today = todayISO();
    let tasksDone = 0, tasksTotal = 0, daysComplete = 0, elapsedDays = 0, restDays = 0;

    for (const day of PLAN.days) {
      tasksTotal += day.tasks.length;
      const n = day.tasks.filter(t => done[t.id]).length;
      tasksDone += n;
      if (n === day.tasks.length && day.tasks.length) daysComplete++;
      if (day.isRest) restDays++;
      if (day.date <= today) elapsedDays++;
    }

    // Streak: consecutive worked days counting back from today. Rest days (Sundays
    // from 1 September) are NEUTRAL — they are skipped over rather than breaking it,
    // because resting on a scheduled day off is compliance, not failure.
    let streak = 0;
    const upto = PLAN.days.filter(d => d.date <= today);
    for (let i = upto.length - 1; i >= 0; i--) {
      const day = upto[i];
      if (day.isRest) continue;                       // skip, do not break
      const n = day.tasks.filter(t => done[t.id]).length;
      if (n === 0) break;
      streak++;
    }

    const remaining = Math.max(0, daysBetween(today, PLAN.meta.end));

    return {
      tasksDone, tasksTotal, daysComplete, streak, remaining, restDays,
      elapsedDays: Math.max(0, Math.min(elapsedDays, PLAN.days.length)),
      totalDays: PLAN.days.length,
      pct: tasksTotal ? tasksDone / tasksTotal : 0,
    };
  }

  function trackTotals() {
    if (!PLAN) return [];
    const done = getDone();
    const acc = {};
    for (const day of PLAN.days) {
      for (const t of day.tasks) {
        if (!acc[t.track]) acc[t.track] = { label: t.trackLabel, color: t.color, done: 0, total: 0 };
        acc[t.track].total++;
        if (done[t.id]) acc[t.track].done++;
      }
    }
    return Object.entries(acc).map(([k, v]) => ({ track: k, ...v }));
  }

  // ── Plan pane rendering ─────────────────────────────────────

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }

  function renderPlanPane(date) {
    if (!PLAN || !els.planPane) return;

    const day = dayByDate(date) || resolveToday();
    if (!day) return;
    viewDate = day.date;

    const week  = PLAN.weeks.find(w => w.n === day.week);
    const stats = overallStats();
    const comp  = dayCompletion(day);
    const done  = getDone();
    const isToday = day.date === todayISO();

    const idx  = PLAN.days.findIndex(d => d.date === day.date);
    const prev = idx > 0 ? PLAN.days[idx - 1] : null;
    const next = idx < PLAN.days.length - 1 ? PLAN.days[idx + 1] : null;

    const tracks = trackTotals();

    const anchorList = [
      ['IELTS booked',       PLAN.anchors.ieltsBooking],
      ['Proposals begin',    PLAN.anchors.proposalStart],
      ['Applications open',  PLAN.anchors.applyStart],
      ['IELTS EXAM',         PLAN.anchors.ieltsExam],
      ['IELTS results',      PLAN.anchors.ieltsResult],
      ['DEADLINE',           PLAN.anchors.deadline],
    ];

    els.planPane.innerHTML = `
      <div class="plan-hero">
        <div class="plan-hero-top">
          <div>
            <div class="plan-eyebrow">${isToday ? 'TODAY' : 'PLAN'} · DAY ${day.n} OF ${PLAN.meta.totalDays}</div>
            <h1 class="plan-date">${esc(day.pretty)}</h1>
            <div class="plan-focus">${esc(day.focus)}</div>
          </div>
          <div class="plan-countdown">
            <div class="pc-num">${stats.remaining}</div>
            <div class="pc-label">days to<br>1 Jan 2027</div>
          </div>
        </div>

        <div class="plan-metrics">
          <div class="pm"><strong>${stats.streak}</strong><span>Day streak</span></div>
          <div class="pm"><strong>${day.isRest ? '—' : comp.done + '/' + comp.total}</strong><span>${day.isRest ? 'Rest day' : 'Today'}</span></div>
          <div class="pm"><strong>${Math.round(stats.pct * 100)}%</strong><span>Overall</span></div>
          <div class="pm"><strong>${stats.daysComplete}</strong><span>Days complete</span></div>
          <div class="pm"><strong>${stats.tasksDone}</strong><span>Tasks done</span></div>
        </div>

        <div class="plan-day-nav">
          <button class="pdn-btn" data-goto="${prev ? prev.date : ''}" ${prev ? '' : 'disabled'}>← ${prev ? esc(prev.short) : ''}</button>
          <button class="pdn-btn pdn-today" data-goto="today">Today</button>
          <button class="pdn-btn" data-goto="${next ? next.date : ''}" ${next ? '' : 'disabled'}>${next ? esc(next.short) : ''} →</button>
        </div>
      </div>

      <div class="plan-week-card">
        <div class="pw-label">WEEK ${week.n} · BLOCK ${esc(week.block)}</div>
        <h2 class="pw-title">${esc(week.title)}</h2>
        <p class="pw-theme">${esc(week.theme)}</p>
        <div class="pw-row"><span class="pw-tag">Deliverable</span><div>${esc(week.deliverable)}</div></div>
        <div class="pw-row"><span class="pw-tag pw-tag-ms">Milestone</span><div>${esc(week.milestone)}</div></div>
        ${week.chapters.length ? `
        <div class="pw-chapters">
          <span class="pw-tag">Chapters</span>
          <div>${week.chapters.map(c => {
            const id = c.split('/')[0] + '--' + c.split('/')[1].replace(/^\d+-/, '');
            const meta = manifest.find(m => m.id === id);
            return `<a class="pw-chapter-link" data-chapter="${id}" href="#${id}">${esc(meta ? meta.title : c)}</a>`;
          }).join('')}</div>
        </div>` : ''}
      </div>

      ${day.isRest ? `
      <div class="plan-rest">
        <div class="rest-icon">☀</div>
        <h3>Day off</h3>
        <p>No tasks today. Sunday is a scheduled rest day and it is part of the plan, not a gap in it —
           it is what makes eighteen straight weeks possible.</p>
        <p class="rest-note">Your streak is safe. Resting on a rest day counts as following the plan.</p>
      </div>` : `
      <div class="plan-tasks">
        <div class="pt-header">
          <h3>${isToday ? "Today's schedule" : "Schedule"}</h3>
          <div class="pt-progress"><div class="pt-progress-fill" style="width:${comp.pct * 100}%"></div></div>
        </div>
        ${day.tasks.map(t => `
        <label class="task ${done[t.id] ? 'task-done' : ''}" data-task="${t.id}">
          <input type="checkbox" ${done[t.id] ? 'checked' : ''} data-task-check="${t.id}">
          <span class="task-check"></span>
          <div class="task-body">
            <div class="task-meta">
              <span class="task-time">${esc(t.time)}</span>
              <span class="task-track" style="--tc:${t.color}">${esc(t.trackLabel)}</span>
              <span class="task-mins">${t.mins}m</span>
            </div>
            <div class="task-text">${esc(t.text)}</div>
          </div>
        </label>`).join('')}
        <div class="pt-footer">${Math.floor(day.totalMins / 60)}h ${day.totalMins % 60}m scheduled${day.dow === 'Saturday' ? ' · Saturday schedule' : ''}</div>
      </div>`}

      <div class="plan-side-grid">
        <div class="plan-card">
          <h3>Track progress</h3>
          ${tracks.map(t => `
            <div class="track-row">
              <div class="track-row-top"><span style="color:${t.color}">●</span> ${esc(t.label)}<em>${t.done}/${t.total}</em></div>
              <div class="track-bar"><div style="width:${t.total ? (t.done / t.total) * 100 : 0}%;background:${t.color}"></div></div>
            </div>`).join('')}
        </div>

        <div class="plan-card">
          <h3>Fixed anchors</h3>
          ${anchorList.map(([label, d]) => {
            const delta = daysBetween(todayISO(), d);
            const cls = delta < 0 ? 'anchor-past' : (delta <= 14 ? 'anchor-soon' : '');
            return `<div class="anchor-row ${cls}">
              <span>${esc(label)}</span>
              <em>${delta < 0 ? 'passed' : (delta === 0 ? 'today' : delta + 'd')}</em>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;

    bindPlanPane();
    updateBreadcrumbForPlan(day);
  }

  function bindPlanPane() {
    $$('[data-task-check]', els.planPane).forEach(cb => {
      cb.addEventListener('change', () => {
        setTaskDone(cb.dataset.taskCheck, cb.checked);
        cb.closest('.task').classList.toggle('task-done', cb.checked);
        // Re-render only the numbers, keeping scroll position.
        const scroll = els.contentScroll.scrollTop;
        renderPlanPane(viewDate);
        buildPlanNav();
        els.contentScroll.scrollTop = scroll;
        showSaveToast();
      });
    });

    $$('[data-goto]', els.planPane).forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.goto;
        if (!target) return;
        showPlan(target === 'today' ? resolveToday().date : target);
      });
    });

    $$('[data-chapter]', els.planPane).forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        switchPanel('chapters');
        navigateToChapter(link.dataset.chapter);
      });
    });
  }

  function updateBreadcrumbForPlan(day) {
    if (!els.breadcrumb) return;
    els.breadcrumb.innerHTML = `<strong>Day ${day.n}</strong> › ${esc(day.pretty)} › Week ${day.week}`;
  }

  function showPlan(date) {
    activePanel = 'plan';
    $$('.chapter-pane').forEach(p => p.classList.remove('active'));
    if (els.welcomePane) els.welcomePane.style.display = 'none';
    if (els.planPane) els.planPane.style.display = '';
    renderPlanPane(date || viewDate || (resolveToday() && resolveToday().date));
    els.contentScroll.scrollTop = 0;
    if (PLAN) {
      const st = overallStats();
      if (els.progressBar) els.progressBar.style.width = `${st.pct * 100}%`;
    }
    saveState({ lastPanel: 'plan', lastPlanDate: viewDate }, true);
  }

  // ── Sidebar ─────────────────────────────────────────────────

  function buildPlanNav() {
    if (!PLAN || !els.planNav) return;
    const done = getDone();
    const today = todayISO();

    let html = '';
    for (const block of PLAN.blocks) {
      const weeks = block.weeks.map(n => PLAN.weeks.find(w => w.n === n));
      html += `<div class="plan-block">
        <div class="plan-block-label">BLOCK ${esc(block.name)}</div>`;

      for (const w of weeks) {
        const days = PLAN.days.filter(d => d.week === w.n);
        const work  = days.filter(d => !d.isRest);
        const wDone = work.reduce((a, d) => a + d.tasks.filter(t => done[t.id]).length, 0);
        const wTot  = work.reduce((a, d) => a + d.tasks.length, 0);
        const isCurrent = days.some(d => d.date === today);

        html += `<div class="plan-week-group ${isCurrent ? 'current' : ''}">
          <button class="plan-week-toggle" type="button">
            <span class="arrow">▸</span>
            <span class="pwt-name">W${w.n} · ${esc(w.title)}</span>
            <span class="pwt-count">${wDone}/${wTot}</span>
          </button>
          <div class="plan-day-list">
            ${days.map(d => {
              const n = d.tasks.filter(t => done[t.id]).length;
              if (d.isRest) {
                const curR = d.date === today ? 'today' : '';
                return `<a class="plan-day-link rest ${curR}" data-date="${d.date}" href="#day-${d.date}">
                  <span class="pdl-dot"></span>
                  <span class="pdl-date">${esc(d.dowShort)} ${esc(d.short)}</span>
                  <span class="pdl-n">off</span>
                </a>`;
              }
              const state = n === d.tasks.length ? 'full' : (n > 0 ? 'part' : '');
              const cur = d.date === today ? 'today' : '';
              const past = d.date < today && n === 0 ? 'missed' : '';
              return `<a class="plan-day-link ${state} ${cur} ${past}" data-date="${d.date}" href="#day-${d.date}">
                <span class="pdl-dot"></span>
                <span class="pdl-date">${esc(d.dowShort)} ${esc(d.short)}</span>
                <span class="pdl-n">${n}/${d.tasks.length}</span>
              </a>`;
            }).join('')}
          </div>
        </div>`;
      }
      html += `</div>`;
    }

    els.planNav.innerHTML = html;

    $$('.plan-week-toggle', els.planNav).forEach(btn => {
      const group = btn.closest('.plan-week-group');
      if (!group.classList.contains('current')) group.classList.add('collapsed');
      btn.addEventListener('click', () => group.classList.toggle('collapsed'));
    });

    $$('.plan-day-link', els.planNav).forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        showPlan(link.dataset.date);
        closeMobileSidebar();
      });
    });

    const cur = $('.plan-week-group.current', els.planNav);
    if (cur) cur.scrollIntoView({ block: 'center' });
  }

  function buildSidebar() {
    const phases = {};
    manifest.forEach(ch => {
      if (!phases[ch.phaseKey]) phases[ch.phaseKey] = { title: ch.phaseTitle, number: ch.phaseNumber, chapters: [] };
      phases[ch.phaseKey].chapters.push(ch);
    });

    let chaptersHtml = '';
    let interviewHtml = '';

    Object.entries(phases).forEach(([key, phase]) => {
      const links = phase.chapters.map(ch => {
        const badge = ch.hasInterview ? '<span class="iq-badge">Q&A</span>' : '';
        return `<a class="chapter-link" data-id="${ch.id}" href="#${ch.id}">${esc(ch.title)}${badge}</a>`;
      }).join('');

      chaptersHtml += `
        <div class="phase-group" data-phase="${key}">
          <button class="phase-toggle" type="button">
            <span class="arrow">▼</span>
            ${esc(phase.title)}
          </button>
          <div class="chapter-list">${links}</div>
        </div>`;

      phase.chapters.filter(c => c.hasInterview).forEach(ch => {
        interviewHtml += `<a class="chapter-link" data-id="${ch.id}" data-interview="1" href="#${ch.id}">${esc(ch.title)}</a>`;
      });
    });

    if (els.chaptersNav) els.chaptersNav.innerHTML = chaptersHtml;
    if (els.interviewNav) {
      els.interviewNav.innerHTML = interviewHtml || '<p class="nav-empty">No interview sections found.</p>';
    }

    $$('.phase-toggle').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.phase-group').classList.toggle('collapsed'));
    });

    $$('.chapter-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        navigateToChapter(link.dataset.id, link.dataset.interview === '1');
        closeMobileSidebar();
      });
    });

    buildPlanNav();
  }

  // ── Chapter navigation ──────────────────────────────────────

  function getChapterIndex(id) { return manifest.findIndex(c => c.id === id); }
  function getChapterMeta(id)  { return manifest.find(c => c.id === id); }

  function navigateToChapter(id, jumpToInterview = false) {
    if (!id || !getChapterMeta(id)) return;

    activePanel = 'chapters';
    currentChapterId = id;
    interviewOnly = jumpToInterview;

    if (els.planPane) els.planPane.style.display = 'none';
    if (els.welcomePane) els.welcomePane.style.display = 'none';

    $$('.chapter-pane').forEach(p => p.classList.remove('active'));
    const pane = document.getElementById(id);
    if (pane) {
      pane.classList.add('active');
      pane.classList.toggle('interview-only', interviewOnly);
      if (interviewOnly) {
        const zone = pane.querySelector('.interview-zone');
        if (zone) setTimeout(() => zone.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      }
    }

    $$('.chapter-link').forEach(l => l.classList.toggle('active', l.dataset.id === id));

    const meta = getChapterMeta(id);
    if (els.breadcrumb) {
      els.breadcrumb.innerHTML = `<strong>${esc(meta.phaseTitle)}</strong> › ${esc(meta.title)}`;
    }

    updateNavButtons();
    updateInterviewToggle();
    updateProgressBar();
    saveState({ chapterId: id, scrollTop: 0, interviewOnly, lastPanel: 'chapters' }, true);

    if (els.contentScroll && !interviewOnly) els.contentScroll.scrollTop = 0;
    history.replaceState(null, '', `#${id}`);
    expandPhaseForChapter(id);
  }

  function expandPhaseForChapter(id) {
    const meta = getChapterMeta(id);
    if (!meta) return;
    $$('.phase-group').forEach(g => {
      if (g.dataset.phase === meta.phaseKey) g.classList.remove('collapsed');
    });
  }

  function updateNavButtons() {
    const idx = getChapterIndex(currentChapterId);
    if (els.prevBtn) els.prevBtn.disabled = idx <= 0;
    if (els.nextBtn) els.nextBtn.disabled = idx >= manifest.length - 1;
  }

  function updateInterviewToggle() {
    if (!els.interviewBtn) return;
    const meta = getChapterMeta(currentChapterId);
    els.interviewBtn.style.display = meta && meta.hasInterview ? '' : 'none';
    els.interviewBtn.classList.toggle('active', interviewOnly);
    els.interviewBtn.textContent = interviewOnly ? 'Full Chapter' : 'Interview Q&A';
  }

  function updateProgressBar() {
    const idx = getChapterIndex(currentChapterId);
    if (els.progressBar && manifest.length > 0) {
      els.progressBar.style.width = `${((idx + 1) / manifest.length) * 100}%`;
    }
  }

  // ── Search (full text) ──────────────────────────────────────

  function initSearch() {
    if (!els.searchInput) return;
    let t = null;
    els.searchInput.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(runSearch, 180);
    });
    els.searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') { els.searchInput.value = ''; runSearch(); }
    });
  }

  function runSearch() {
    const q = els.searchInput.value.toLowerCase().trim();
    const panels = { plan: els.planNav, chapters: els.chaptersNav, interview: els.interviewNav };

    if (!q) {
      els.searchResults.style.display = 'none';
      Object.entries(panels).forEach(([k, el]) => { if (el) el.style.display = k === activePanel ? '' : 'none'; });
      return;
    }

    Object.values(panels).forEach(el => { if (el) el.style.display = 'none'; });
    els.searchResults.style.display = '';

    const hits = [];
    for (const ch of manifest) {
      const inTitle = ch.title.toLowerCase().includes(q);
      const pos = ch.text ? ch.text.indexOf(q) : -1;
      if (!inTitle && pos < 0) continue;
      let snippet = '';
      if (pos >= 0) {
        const s = Math.max(0, pos - 60);
        snippet = (s > 0 ? '…' : '') + ch.text.slice(s, pos + q.length + 90) + '…';
      }
      hits.push({ ch, inTitle, snippet, score: (inTitle ? 0 : 1) });
    }
    hits.sort((a, b) => a.score - b.score);

    els.searchResults.innerHTML = hits.length
      ? `<div class="sr-count">${hits.length} chapter${hits.length === 1 ? '' : 's'}</div>` +
        hits.slice(0, 60).map(h => `
          <a class="sr-item" data-id="${h.ch.id}" href="#${h.ch.id}">
            <div class="sr-title">${esc(h.ch.title)}</div>
            <div class="sr-phase">${esc(h.ch.phaseTitle)}</div>
            ${h.snippet ? `<div class="sr-snippet">${esc(h.snippet)}</div>` : ''}
          </a>`).join('')
      : '<p class="nav-empty">No matches.</p>';

    $$('.sr-item', els.searchResults).forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        navigateToChapter(a.dataset.id);
        closeMobileSidebar();
      });
    });
  }

  // ── Panels, theme, type scale ───────────────────────────────

  function switchPanel(panel) {
    activePanel = panel;
    els.tabs.forEach(t => t.classList.toggle('active', t.dataset.panel === panel));
    if (els.searchInput.value.trim()) { runSearch(); return; }
    els.searchResults.style.display = 'none';
    if (els.planNav)      els.planNav.style.display      = panel === 'plan' ? '' : 'none';
    if (els.chaptersNav)  els.chaptersNav.style.display  = panel === 'chapters' ? '' : 'none';
    if (els.interviewNav) els.interviewNav.style.display = panel === 'interview' ? '' : 'none';
    if (panel === 'plan') showPlan(viewDate);
  }

  function initTabs() {
    els.tabs.forEach(tab => {
      tab.addEventListener('click', () => switchPanel(tab.dataset.panel));
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    saveState({ theme }, true);
  }

  function applyFontScale(scale) {
    const s = Math.min(1.5, Math.max(0.8, scale));
    document.documentElement.style.setProperty('--font-scale', s);
    saveState({ fontScale: s }, true);
    return s;
  }

  function initChrome() {
    const state = loadState();
    applyTheme(state.theme || 'dark');
    let scale = applyFontScale(state.fontScale || 1);

    els.themeBtn?.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      applyTheme(cur === 'dark' ? 'light' : 'dark');
    });
    els.fontUp?.addEventListener('click', () => { scale = applyFontScale(scale + 0.1); });
    els.fontDown?.addEventListener('click', () => { scale = applyFontScale(scale - 0.1); });

    els.todayBtn?.addEventListener('click', () => {
      switchPanel('plan');
      const t = resolveToday();
      if (t) showPlan(t.date);
      buildPlanNav();
    });

    els.prevBtn?.addEventListener('click', () => {
      if (activePanel === 'plan') {
        const i = PLAN.days.findIndex(d => d.date === viewDate);
        if (i > 0) showPlan(PLAN.days[i - 1].date);
        return;
      }
      const idx = getChapterIndex(currentChapterId);
      if (idx > 0) navigateToChapter(manifest[idx - 1].id, false);
    });

    els.nextBtn?.addEventListener('click', () => {
      if (activePanel === 'plan') {
        const i = PLAN.days.findIndex(d => d.date === viewDate);
        if (i >= 0 && i < PLAN.days.length - 1) showPlan(PLAN.days[i + 1].date);
        return;
      }
      const idx = getChapterIndex(currentChapterId);
      if (idx < manifest.length - 1) navigateToChapter(manifest[idx + 1].id, false);
    });

    els.interviewBtn?.addEventListener('click', () => {
      interviewOnly = !interviewOnly;
      const pane = document.getElementById(currentChapterId);
      if (pane) {
        pane.classList.toggle('interview-only', interviewOnly);
        if (interviewOnly) pane.querySelector('.interview-zone')?.scrollIntoView({ behavior: 'smooth' });
      }
      updateInterviewToggle();
      saveState({ interviewOnly }, true);
    });

    els.menuBtn?.addEventListener('click', () => els.app.classList.toggle('sidebar-open'));
    els.overlay?.addEventListener('click', closeMobileSidebar);
  }

  function closeMobileSidebar() { els.app?.classList.remove('sidebar-open'); }

  function initQABlocks() {
    $$('.qa-block').forEach(block => {
      const question = block.querySelector('.qa-question');
      if (!question || question.dataset.bound) return;
      question.dataset.bound = '1';
      question.addEventListener('click', () => block.classList.toggle('open'));
    });
  }

  function initScrollSave() {
    if (!els.contentScroll) return;
    els.contentScroll.addEventListener('scroll', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (activePanel === 'chapters' && currentChapterId) {
          saveState({ chapterId: currentChapterId, scrollTop: els.contentScroll.scrollTop, interviewOnly }, true);
        }
      }, SAVE_DEBOUNCE_MS);
    });
  }

  function initResumeButton() {
    const btn = $('#resume-reading');
    if (!btn) return;
    const state = loadState();
    if (state.chapterId && getChapterMeta(state.chapterId)) {
      btn.style.display = '';
      btn.textContent = `Resume: ${getChapterMeta(state.chapterId).title}`;
      btn.addEventListener('click', () => navigateToChapter(state.chapterId, state.interviewOnly));
    } else {
      btn.style.display = 'none';
    }
  }

  function initKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea')) return;
      if (e.key === '/') { e.preventDefault(); els.searchInput?.focus(); return; }
      if (e.key === 't' || e.key === 'T') { els.todayBtn?.click(); return; }
      if (e.key === 'ArrowLeft')  els.prevBtn?.click();
      if (e.key === 'ArrowRight') els.nextBtn?.click();
    });
  }

  function restore() {
    const state = loadState();
    const hash = location.hash.replace('#', '');

    if (hash && getChapterMeta(hash)) {
      switchPanel('chapters');
      navigateToChapter(hash);
      return;
    }
    if (PLAN && (!state.lastPanel || state.lastPanel === 'plan')) {
      switchPanel('plan');
      const t = resolveToday();
      showPlan(t ? t.date : null);
      return;
    }
    if (state.chapterId && getChapterMeta(state.chapterId)) {
      switchPanel('chapters');
      navigateToChapter(state.chapterId, state.interviewOnly);
      if (state.scrollTop) setTimeout(() => { els.contentScroll.scrollTop = state.scrollTop; }, 100);
      return;
    }
    if (PLAN) { switchPanel('plan'); showPlan(resolveToday().date); }
    else { els.welcomePane.style.display = ''; }
  }

  function init() {
    if (!PLAN && els.tabs.length) {
      els.tabs.find?.(t => t.dataset.panel === 'plan')?.remove();
    }
    buildSidebar();
    initQABlocks();
    initScrollSave();
    initSearch();
    initTabs();
    initChrome();
    initResumeButton();
    initKeyboard();
    restore();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
