/* Becoming a Software Engineer — reader app
 *
 * One page is visible at a time (home, a chapter, glossary or index).
 * Navigation is by URL hash:
 *   #home  #<chapter-id>  #<chapter-id>--<section>  #glossary--A  #index--B
 * The only thing remembered between visits is where you stopped reading,
 * your theme and your text size.
 */
(function () {
  'use strict';

  const BOOK = window.__BOOK__;
  const order = BOOK.order;
  const chapterById = new Map(BOOK.chapters.map(c => [c.id, c]));
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  const els = {
    app: $('.app'),
    scroller: $('#scroller'),
    crumb: $('#crumb'),
    prev: $('#prev-btn'),
    next: $('#next-btn'),
    search: $('#search'),
    results: $('#search-results'),
    nav: $('#nav'),
    bar: $('#read-progress-bar'),
  };

  // ── Small persistent preferences (safe if storage is unavailable) ──
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem('book:' + key); return v === null ? fallback : JSON.parse(v); }
      catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('book:' + key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  let currentPage = null;

  // ── Pages and routing ──────────────────────────────────────────────
  function parseHash() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!raw) return { page: 'home', target: null };
    const page = raw.split('--')[0];
    if (!order.includes(page)) return { page: 'home', target: null };
    return { page, target: raw.includes('--') ? raw : null };
  }

  function showPage(pageId, targetId, restoreScroll) {
    const pageEl = document.getElementById('page-' + pageId);
    if (!pageEl) return;
    if (currentPage !== pageId) {
      $$('.page.active').forEach(p => p.classList.remove('active'));
      pageEl.classList.add('active');
      currentPage = pageId;
      updateChrome(pageId);
    }
    requestAnimationFrame(() => {
      if (targetId) {
        const t = document.getElementById(targetId);
        if (t) { t.scrollIntoView({ block: 'start' }); }
      } else if (typeof restoreScroll === 'number') {
        els.scroller.scrollTop = restoreScroll;
      } else {
        els.scroller.scrollTop = 0;
      }
      onScroll();
    });
    els.app.classList.remove('side-open');
    if (pageId !== 'home') store.set('last', { page: pageId, scroll: 0 });
  }

  function route() {
    const { page, target } = parseHash();
    showPage(page, target);
  }

  function go(pageId) {
    if (location.hash === '#' + pageId) route();
    else location.hash = pageId;
  }

  function updateChrome(pageId) {
    // Sidebar highlight
    $$('.nav-ch.active').forEach(li => li.classList.remove('active'));
    $$('.nav-ref .nav-ch-link.active').forEach(a => a.classList.remove('active'));
    const li = els.nav.querySelector(`.nav-ch[data-id="${pageId}"]`);
    if (li) {
      li.classList.add('active');
      const part = li.closest('.nav-part');
      if (part) part.classList.remove('collapsed');
      li.scrollIntoView({ block: 'nearest' });
    }
    const ref = els.nav.querySelector(`.nav-ref .nav-ch-link[data-id="${pageId}"]`);
    if (ref) ref.classList.add('active');

    // Breadcrumb
    const ch = chapterById.get(pageId);
    if (ch) {
      els.crumb.innerHTML = `${esc(ch.part)} › <strong>${ch.number}. ${esc(ch.title)}</strong>`;
      document.title = `${ch.number}. ${ch.title} — ${BOOK.title}`;
    } else {
      const names = { home: 'Contents', glossary: 'Glossary', index: 'Index' };
      els.crumb.innerHTML = `<strong>${names[pageId] || ''}</strong>`;
      document.title = pageId === 'home' ? BOOK.title : `${names[pageId]} — ${BOOK.title}`;
    }

    // Previous / next
    const i = order.indexOf(pageId);
    els.prev.disabled = i <= 0;
    els.next.disabled = i >= order.length - 1;
  }

  function step(delta) {
    const i = order.indexOf(currentPage);
    const j = i + delta;
    if (j >= 0 && j < order.length) go(order[j]);
  }

  // ── Scrolling: progress bar, current section, remembered position ──
  let saveTimer = null;
  function onScroll() {
    const s = els.scroller;
    const max = s.scrollHeight - s.clientHeight;
    els.bar.style.width = (max > 0 ? Math.min(100, (s.scrollTop / max) * 100) : 0) + '%';

    if (chapterById.has(currentPage)) {
      const heads = $$(`#page-${currentPage} .chapter-body h2`);
      let current = null;
      const top = s.getBoundingClientRect().top + 90;
      for (const h of heads) { if (h.getBoundingClientRect().top <= top) current = h.id; else break; }
      $$('.nav-sec.current').forEach(a => a.classList.remove('current'));
      if (current) {
        const link = els.nav.querySelector(`.nav-sec[href="#${CSS.escape(current)}"]`);
        if (link) link.classList.add('current');
      }
    }

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      if (currentPage && currentPage !== 'home') store.set('last', { page: currentPage, scroll: Math.round(s.scrollTop) });
    }, 400);
  }

  // ── Search ─────────────────────────────────────────────────────────
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function highlight(text, q) {
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function runSearch() {
    const q = els.search.value.trim().toLowerCase();
    if (q.length < 2) {
      els.results.hidden = true;
      els.nav.hidden = false;
      return;
    }
    const chapterHits = [];
    const sectionHits = [];
    for (const c of BOOK.chapters) {
      if (c.title.toLowerCase().includes(q)) chapterHits.push(c);
      for (const s of c.sections) {
        if (s.title.toLowerCase().includes(q)) sectionHits.push({ c, s });
      }
    }
    const termHits = BOOK.glossary.filter(g => g.term.toLowerCase().includes(q));
    const textHits = [];
    for (const c of BOOK.chapters) {
      const i = c.text.indexOf(q);
      if (i >= 0 && !chapterHits.includes(c)) {
        const start = Math.max(0, i - 50);
        textHits.push({ c, snip: (start ? '…' : '') + c.text.slice(start, i + q.length + 70) + '…' });
      }
    }

    let html = '';
    if (chapterHits.length) {
      html += '<div class="sr-head">Chapters</div>' + chapterHits.slice(0, 15).map(c =>
        `<a href="#${c.id}"><span class="sr-title">${c.number}. ${highlight(c.title, q)}</span></a>`).join('');
    }
    if (termHits.length) {
      html += '<div class="sr-head">Glossary</div>' + termHits.slice(0, 12).map(g =>
        `<a href="${g.href}"><span class="sr-title">${highlight(g.term, q)}</span><span class="sr-snip">${esc(g.def.slice(0, 120))}</span></a>`).join('');
    }
    if (sectionHits.length) {
      html += '<div class="sr-head">Sections</div>' + sectionHits.slice(0, 25).map(({ c, s }) =>
        `<a href="#${s.id}"><span class="sr-title">${highlight(s.title, q)}</span><span class="sr-meta"> · Ch. ${c.number}</span></a>`).join('');
    }
    if (textHits.length) {
      html += '<div class="sr-head">Mentioned in</div>' + textHits.slice(0, 30).map(({ c, snip }) =>
        `<a href="#${c.id}"><span class="sr-title">${c.number}. ${esc(c.title)}</span><span class="sr-snip">${highlight(snip, q)}</span></a>`).join('');
    }
    els.results.innerHTML = html || '<div class="sr-empty">Nothing found. Try a shorter or different word.</div>';
    els.results.hidden = false;
    els.nav.hidden = true;
  }

  // ── Glossary / index filter boxes ──────────────────────────────────
  function initFilters() {
    $$('.filter-box').forEach(box => {
      const page = box.closest('.page');
      box.addEventListener('input', () => {
        const q = box.value.trim().toLowerCase();
        const items = page.querySelectorAll(box.dataset.filter === 'glossary' ? 'dt' : '.index-list li');
        items.forEach(item => {
          const hit = !q || item.textContent.toLowerCase().includes(q) ||
            (item.tagName === 'DT' && item.nextElementSibling.textContent.toLowerCase().includes(q));
          item.classList.toggle('hidden-by-filter', !hit);
          if (item.tagName === 'DT') item.nextElementSibling.classList.toggle('hidden-by-filter', !hit);
        });
        page.querySelectorAll('.az-group').forEach(g => {
          const visible = g.querySelector('dt:not(.hidden-by-filter), li:not(.hidden-by-filter)');
          g.classList.toggle('hidden-by-filter', !visible);
        });
      });
    });
  }

  // ── Theme and text size ────────────────────────────────────────────
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    store.set('theme', theme);
  }
  function applyScale(scale) {
    scale = Math.min(1.4, Math.max(0.8, Math.round(scale * 10) / 10));
    document.documentElement.style.setProperty('--scale', scale);
    store.set('scale', scale);
    return scale;
  }

  // ── Wire everything up ─────────────────────────────────────────────
  function init() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(store.get('theme', prefersDark ? 'dark' : 'light'));
    let scale = applyScale(store.get('scale', 1));

    $('#theme-btn').addEventListener('click', () =>
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));
    $('#font-up').addEventListener('click', () => { scale = applyScale(scale + 0.1); });
    $('#font-down').addEventListener('click', () => { scale = applyScale(scale - 0.1); });
    els.prev.addEventListener('click', () => step(-1));
    els.next.addEventListener('click', () => step(1));
    $('#menu-btn').addEventListener('click', () => els.app.classList.toggle('side-open'));
    $('#scrim').addEventListener('click', () => els.app.classList.remove('side-open'));

    $$('.nav-part-btn').forEach(btn => btn.addEventListener('click', () =>
      btn.closest('.nav-part').classList.toggle('collapsed')));

    els.search.addEventListener('input', runSearch);
    els.search.addEventListener('keydown', e => {
      if (e.key === 'Escape') { els.search.value = ''; runSearch(); }
      if (e.key === 'Enter') { const first = els.results.querySelector('a'); if (first) first.click(); }
    });
    els.results.addEventListener('click', e => { if (e.target.closest('a')) els.app.classList.remove('side-open'); });

    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea')) return;
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === '/') { e.preventDefault(); els.search.focus(); }
    });

    els.scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', route);
    initFilters();

    // Resume button on the home page
    const last = store.get('last', null);
    const resume = $('#resume-btn');
    if (last && last.page && order.includes(last.page) && resume) {
      const ch = chapterById.get(last.page);
      resume.textContent = ch ? `Continue: Chapter ${ch.number}, ${ch.title}` : 'Continue where you left off';
      resume.hidden = false;
      resume.addEventListener('click', () => {
        history.replaceState(null, '', '#' + last.page);
        showPage(last.page, null, last.scroll);
      });
    }

    // First load: an explicit link wins; otherwise reopen where the reader stopped.
    if (location.hash) route();
    else if (last && order.includes(last.page)) {
      history.replaceState(null, '', '#' + last.page);
      showPage(last.page, null, last.scroll);
    } else showPage('home');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
