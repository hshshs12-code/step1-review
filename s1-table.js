/* Entity pages v2: compact grid rows, density levels, details drawer, band jump + scrollspy, cram mode, keyboard. */
'use strict';
(() => {
  const { esc, $, $$ } = S1;
  let D, ENT, rows = [], byId = {}, cur = null;
  const st = { q: '', status: 'all', mk: 'all', theme: '', img: false };
  const FILE = document.body.dataset.file;

  /* ---------- sentence rendering ---------- */
  const flag = sid => (D.F && D.F[sid]) ? '<span class="flag" title="The AI check flagged a possible error in this source sentence — open the question for the note">⚑</span>' : '';
  const chipQ = grp => {
    const by = {};
    grp.forEach(s => { const [q, i] = s.split('.'); (by[q] = by[q] || []).push(i); });
    return Object.entries(by).map(([q, is]) => `<button class="q" data-q="${q}" data-s="${is.join(',')}" title="Open Q${q} at this sentence">${q}</button>`).join('');
  };
  const sentLi = (g, cls) => `<li${cls ? ` class="${cls}"` : ''}>${S1.markText(D.S[g[0]], D.M[g[0]])}${g.some(x => D.F && D.F[x]) ? flag(g.find(x => D.F[x])) : ''}${chipQ(g)}</li>`;
  function list(groups, kind) {
    if (!groups || !groups.length) return '';
    const a = kind === 'e' ? 3 : 2, b = kind === 'e' ? 5 : 3, ca = kind === 'e' ? 'n3' : 'b2', cb = kind === 'e' ? 'n5' : 'b3';
    const c = Math.max(0, groups.length - a), r = Math.max(0, groups.length - b);
    return `<ul class="sl2">${groups.map((g, i) => sentLi(g, i >= b ? ca + ' ' + cb : i >= a ? ca : '')).join('')}</ul>` +
      (c ? `<button class="more" data-more data-c="+${c}" data-r="${r ? '+' + r : ''}"><span class="mc">+${c} more</span><span class="mr">+${r} more</span></button>` : '');
  }
  const jlink = (id, n) => ENT[id] ? `<a href="${S1.entHref(id)}" data-jump="${id}">${esc(ENT[id].n)}${n != null ? `<span>×${n}</span>` : ''}</a>` : '';
  const STL = { A: '✅ ANSWER', D: '⚠ DISTRACTOR-ONLY', M: '📎 MENTIONED' };
  const STT = { A: 'Tested as the correct answer or the vignette diagnosis', D: 'Only ever appeared as a wrong answer choice', M: 'Never an answer choice; taught inside explanations' };

  function thumbsHTML(e, n, nsk, big) {
    const im = (e.img || []), sk = (e.sk || []);
    let h = im.slice(0, n).map(k => { const x = D.I[k]; return x ? `<img data-enc="${x[0]}" alt="" data-cap="${esc(e.n)} · Q${x[1]}${x[3] && D.S[x[3]] ? ' · ' + esc(D.S[x[3]]) : ''}" title="Q${x[1]}">` : ''; }).join('');
    h += sk.slice(0, nsk).map(([enc, t, k]) => `<img class="sk" data-enc="${enc}" alt="" data-cap="Sketchy ${esc(k)} · ${esc(t)}" title="Sketchy ${esc(k)} · ${esc(t)}">`).join('');
    const rest = Math.max(0, im.length - n) + Math.max(0, sk.length - nsk);
    if (!h) return '';
    return `<div class="thumbs${big ? ' big' : ''}">${h}${rest && !big ? `<span class="tm" data-det title="Show all images">+${rest}</span>` : ''}</div>`;
  }

  function rowHTML(id, e) {
    const mk = S1.marks()[id] || '';
    const nA = (e.ans || []).length, nD = (e.dis || []).length;
    const cw = (e.cw || []).slice(0, 3).map(([c, n]) => jlink(c, n)).filter(Boolean).join(', ');
    const ai = e.aid ? `<div class="ai">${e.aid}</div>` : '';
    return `<article class="row ${e.st}${mk ? ' mk-' + mk : ''}" id="${id}" data-id="${id}">
<div class="c-ent"><h3 class="nm" data-det title="Show details (e)">${esc(e.n)}</h3>
<div class="meta"><span class="st ${e.st}" title="${STT[e.st]}">${STL[e.st]}</span><span class="ty">${esc(e.t)}</span><span class="fq" title="${e.nq} question${e.nq > 1 ? 's' : ''} touch this row"><i style="width:${Math.min(46, 5 + e.nq * 4)}px"></i>${e.nq}Q</span>${(e.th || []).map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>
${cw ? `<div class="vs">vs ${cw}</div>` : ''}${thumbsHTML(e, 3, 2)}
<div class="acts"><button class="mkb k" data-mk="k" title="Mark as known (1)">know</button><button class="mkb s" data-mk="s" title="Mark as shaky (2)">shaky</button><button class="det" data-det title="Questions, why-wrong reasons, extra sentences (e)">${nA ? `<b class="a">✅${nA}</b> ` : ''}${nD ? `<b class="d">⚠${nD}</b> ` : ''}details ▾</button></div></div>
<div class="c-ess${e.ess && e.ess.length ? '' : ' isempty'}" data-h="⭐ Essential">${list(e.ess, 'e') || '<span class="empty">—</span>'}</div>
<div class="c-bz${e.bz && e.bz.length ? '' : ' isempty'}" data-h="Boards say">${list(e.bz, 'b')}</div>
<div class="c-ai${ai ? '' : ' isempty'}" data-h="🧠 Learning aid">${ai}</div></article>`;
  }

  function drawerHTML(e) {
    let h = '';
    if ((e.ans || []).length) h += `<h5>✅ Answer / vignette diagnosis in</h5><div>${e.ans.map(([q, r]) => `<button class="qp" data-q="${q}" title="${r === 'v' ? 'vignette diagnosis' : 'correct answer'}">${q}${r === 'v' ? '·dx' : ''}</button>`).join('')}</div>`;
    if ((e.dis || []).length) h += `<h5>⚠ Wrong answer choice in — why it was wrong · verbatim</h5><div class="cols">${e.dis.map(([q, L, t, sids]) =>
      `<div><button class="qp d" data-q="${q}" data-s="${sids.map(s => s.split('.')[1]).join(',')}">${q}</button> <span class="opt">${L}) ${esc(t)}</span>` +
      (sids.length ? `<ul class="sl2">${sids.map(s => `<li>${S1.markText(D.S[s], D.M[s])}${flag(s)}</li>`).join('')}</ul>` : '') + '</div>').join('')}</div>`;
    if ((e.cw || []).length) h += `<h5>↔ Confused with</h5><div class="vsfull">${e.cw.map(([c, n]) => jlink(c, n)).join('')}</div>`;
    const al = (e.al || []).filter(a => a.toLowerCase() !== e.n.toLowerCase());
    if (al.length) h += `<h5>Appeared in answer choices as</h5><div class="al">${al.map(esc).join(' · ')}</div>`;
    if ((e.img || []).length + (e.sk || []).length) h += `<h5>Images</h5>${thumbsHTML(e, 99, 99, true)}`;
    if ((e.ext || []).length) {
      const by = {};
      e.ext.forEach(g => { const q = g[0].split('.')[0]; (by[q] = by[q] || []).push(g); });
      h += `<h5>Extra — everything else the explanations say · verbatim</h5><div class="cols">${Object.entries(by).map(([q, gs]) =>
        `<div><button class="qp" data-q="${q}">Q${q}</button><ul class="sl2">${gs.map(g => `<li>${S1.markText(D.S[g[0]], D.M[g[0]])}${g.some(x => D.F && D.F[x]) ? flag(g.find(x => D.F[x])) : ''}${g.length > 1 ? chipQ(g.slice(1)) : ''}</li>`).join('')}</ul></div>`).join('')}</div>`;
    }
    if ((e.ne || []).length) h += `<h5>Other answer choices filed here (not entities)</h5><div class="cols">${e.ne.map(([q, L, t, sids, isKey]) =>
      `<div><button class="qp${isKey ? '' : ' d'}" data-q="${q}" data-s="${sids.map(s => s.split('.')[1]).join(',')}">${q}</button> <span class="opt">${L}) ${esc(t)}${isKey ? ' — correct answer' : ''}</span>` +
      (sids.length ? `<ul class="sl2">${sids.map(s => `<li>${S1.markText(D.S[s], D.M[s])}${flag(s)}</li>`).join('')}</ul>` : '') + '</div>').join('')}</div>`;
    return h || '<span class="empty">Nothing more for this row.</span>';
  }

  function vsHTML(cl) {
    const ids = cl.e.filter(i => ENT[i]);
    let g = `<div class="vsgrid" style="grid-template-columns:86px repeat(${ids.length},minmax(0,1fr))"><div class="h"></div>` + ids.map(i => `<div class="h">${jlink(i)}</div>`).join('');
    cl.rows.forEach(([q, key, by]) => {
      g += `<div class="qc"><button class="qp" data-q="${q}">Q${q}</button></div>`;
      ids.forEach(i => {
        const ss = by[i] || [];
        g += `<div>${i === key ? '<span class="won">✓ answer</span> ' : (ss.length ? '<span class="lost">✗ not this</span> ' : '')}` +
          (ss.length ? `<ul class="sl2">${ss.map(s => `<li>${S1.markText(D.S[s], D.M[s])}</li>`).join('')}</ul>` : '') + '</div>';
      });
    });
    return `<div class="vsblock"><div class="vshead">${ids.map((i, k) => (k ? '<span class="vx">VS</span>' : '') + `<span class="vn">${esc(ENT[i].n)}</span>`).join('')}` +
      `<span class="c">tested against each other ${cl.n}×</span></div>${cl.aid ? `<div class="ai">${cl.aid}</div>` : ''}${g}</div></div>`;
  }

  /* ---------- build ---------- */
  function build() {
    let h = '';
    D.bands.forEach(([key, label, ids]) => {
      const ncl = (D.CL || []).filter(c => c.b === key).length;
      h += `<div class="band" data-band="${key}"><div class="bl"><span title="${esc(label)}">${esc(label)}</span><b class="bn">${ids.length}</b>` +
        (ncl ? `<button class="tinybtn" data-vs="${key}" title="Side-by-side comparisons of things the bank tests against each other">look-alikes ${ncl}</button>` : '') +
        `</div><div class="ch">⭐ Essential · verbatim</div><div class="ch bz">Boards say · verbatim</div><div class="ch ai">🧠 Learning aid · AI</div></div>`;
      if (D.BA && D.BA[key]) h += `<div class="bandaid" data-ba="${key}"><div class="ai">${D.BA[key]}</div></div>`;
      if (ncl) h += `<div class="vswrap hide" data-vsband="${key}"></div>`;
      ids.forEach(id => { h += rowHTML(id, D.E[id]); });
    });
    $('#view').innerHTML = `<div class="rows" id="rows">${h}</div><p id="nores" class="noresults hide">No rows match these filters.</p>`;
    let band = '';
    $$('#rows > *').forEach(el => {
      if (el.dataset.band) band = el.dataset.band;
      else if (el.classList.contains('row')) {
        const r = { el, id: el.dataset.id, e: D.E[el.dataset.id], band, x: null, open: false, txt: null };
        rows.push(r); byId[r.id] = r;
      }
    });
  }
  const txtOf = e => [e.n, ...(e.al || []), ...(e.ess || []).map(g => D.S[g[0]]), ...(e.bz || []).map(g => D.S[g[0]]),
    (e.aid || '').replace(/<[^>]+>/g, ' '), ...(e.dis || []).flatMap(d => [d[2], ...d[3].map(s => D.S[s])])].join(' \u0001 ').toLowerCase();
  const vis = () => rows.filter(r => !r.el.classList.contains('hide'));

  /* ---------- filtering ---------- */
  function apply() {
    const words = st.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const M = S1.marks();
    let n = 0; const bc = {};
    rows.forEach(r => {
      const e = r.e;
      let ok = true;
      if (words.length) { if (r.txt == null) r.txt = txtOf(e); ok = words.every(w => r.txt.includes(w)); }
      if (ok && st.status !== 'all') ok = e.st === st.status;
      if (ok && st.mk !== 'all') ok = st.mk === 'none' ? !M[r.id] : st.mk === 'todo' ? M[r.id] !== 'k' : M[r.id] === st.mk;
      if (ok && st.theme) ok = (e.th || []).includes(st.theme);
      if (ok && st.img) ok = (e.img || []).length + (e.sk || []).length > 0;
      r.el.classList.toggle('hide', !ok);
      if (r.x) r.x.classList.toggle('hide', !ok || !r.open);
      if (ok) { n++; bc[r.band] = (bc[r.band] || 0) + 1; }
    });
    const filtering = words.length || st.status !== 'all' || st.mk !== 'all' || st.theme || st.img;
    $$('#rows .band').forEach(b => { const c = bc[b.dataset.band] || 0; b.classList.toggle('hide', !c); $('.bn', b).textContent = c; });
    $$('#rows .bandaid').forEach(b => b.classList.toggle('hide', !bc[b.dataset.ba] || !!words.length));
    if (filtering) $$('#rows .vswrap').forEach(v => v.classList.add('hide'));
    $('#nores').classList.toggle('hide', n > 0);
    paintCount(n);
    const j = $('#jump');
    if (j) [...j.options].forEach(o => { if (o.value) o.hidden = !bc[o.value]; });
  }
  function paintCount(n) {
    const M = S1.marks();
    const k = rows.filter(r => M[r.id] === 'k').length, s = rows.filter(r => M[r.id] === 's').length;
    if (n == null) n = vis().length;
    S1.setCount(`<b>${n}</b>${n !== rows.length ? '/' + rows.length : ''} rows · <span style="color:var(--ok)">${k}✓</span> <span style="color:var(--warn)">${s}●</span>`);
  }

  /* ---------- row actions ---------- */
  function setMark(r, v, toggle = true) {
    const curv = S1.marks()[r.id] || '';
    const nv = toggle && curv === v ? '' : v;
    S1.mark(r.id, nv);
    r.el.classList.remove('mk-k', 'mk-s');
    if (nv) r.el.classList.add('mk-' + nv);
    paintCount();
  }
  function toggleDrawer(r, force) {
    const open = force != null ? force : !r.open;
    if (open && !r.x) {
      r.x = document.createElement('div');
      r.x.className = 'rowx'; r.x.dataset.for = r.id;
      r.x.innerHTML = drawerHTML(r.e);
      r.el.after(r.x);
      S1.lazy(r.x);
    }
    r.open = open;
    if (r.x) r.x.classList.toggle('hide', !open);
    r.el.classList.toggle('open', open);
    const b = $('.det', r.el); if (b) b.innerHTML = b.innerHTML.replace(/details [▾▴]/, 'details ' + (open ? '▴' : '▾'));
  }
  function focusRow(r, scroll = true) {
    if (!r) return;
    if (cur) cur.el.classList.remove('focus');
    cur = r; r.el.classList.add('focus');
    if (scroll) r.el.scrollIntoView({ block: 'nearest' });
    S1.setPref('row:' + FILE, r.id);
  }
  function step(d) {
    const v = vis(); if (!v.length) return;
    const i = cur ? v.indexOf(cur) : -1;
    if (i < 0) return focusRow(firstInView() || v[0]);
    focusRow(v[Math.max(0, Math.min(v.length - 1, i + d))]);
  }
  function firstInView() {
    const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) + 34;
    return vis().find(r => r.el.getBoundingClientRect().bottom > top + 10);
  }
  function jump(id) {
    const r = byId[id]; if (!r) return false;
    if (r.el.classList.contains('hide')) { resetFilters(); apply(); }
    history.replaceState(null, '', '#' + id);
    focusRow(r, false);
    r.el.scrollIntoView({ block: 'start' });
    return true;
  }
  function resetFilters() {
    st.q = ''; st.status = 'all'; st.mk = 'all'; st.theme = ''; st.img = false;
    $('#q').value = ''; $('#fmk').value = 'all'; const ft = $('#fth'); if (ft) ft.value = '';
    $$('.seg[data-k=status] button').forEach(b => b.classList.toggle('on', b.dataset.v === 'all'));
    $('#imgBtn').classList.remove('on');
  }
  function bandStep(d) {
    const bs = $$('#rows .band:not(.hide)'); if (!bs.length) return;
    const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top-h'));
    let i = -1;
    bs.forEach((b, k) => { if (b.getBoundingClientRect().top <= top + 2) i = k; });
    const t = bs[Math.max(0, Math.min(bs.length - 1, d > 0 ? i + 1 : (i <= 0 ? 0 : i - 1)))];
    if (t) scrollToBand(t);
  }
  function scrollToBand(b) {
    let el = b.nextElementSibling;
    while (el && el.classList.contains('hide')) el = el.nextElementSibling;
    if (el) el.scrollIntoView({ block: 'start' });
    const r = rows.find(x => x.band === b.dataset.band && !x.el.classList.contains('hide'));
    if (r) focusRow(r, false);
  }
  function setDensity(v) {
    document.body.classList.remove('den-c', 'den-r', 'den-f');
    document.body.classList.add('den-' + v);
    S1.setPref('den', v);
    $$('.seg[data-k=den] button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  }

  /* ---------- controls ---------- */
  function controls() {
    const themes = {};
    Object.values(D.E).forEach(e => (e.th || []).forEach(t => themes[t] = (themes[t] || 0) + 1));
    const tl = Object.entries(themes).sort((a, b) => b[1] - a[1]);
    S1.setCtl(S1.SEARCH('Filter this page…  ( / )') +
      `<div class="seg" data-k="status" title="Row status"><button class="on" data-v="all">All</button><button data-v="A" title="Tested as answer">✅</button><button data-v="D" title="Distractor-only">⚠</button><button data-v="M" title="Mentioned only">📎</button></div>
<select class="sel" id="fmk" title="Your marks"><option value="all">Any mark</option><option value="todo">Hide known</option><option value="s">Shaky only</option><option value="k">Known only</option><option value="none">Unmarked</option></select>
${tl.length ? `<select class="sel" id="fth" title="Cross-cutting theme"><option value="">Any theme</option>${tl.map(([t, n]) => `<option value="${esc(t)}">${esc(t)} (${n})</option>`).join('')}</select>` : ''}
<button class="ib" id="imgBtn" title="Only rows with images">🖼</button>
<select class="sel" id="jump" title="Jump to a section  ( [ and ] step through sections )"><option value="">Jump to…</option>${D.bands.map(([k, l, ids]) => `<option value="${k}">${esc(l)} (${ids.length})</option>`).join('')}</select>
<div class="seg" data-k="den" title="Row density (d): compact / regular / full"><button data-v="c">S</button><button data-v="r">M</button><button data-v="f">L</button></div>
<button class="ib pri" id="cramBtn" title="Cram mode: one row at a time (c)">▶ Cram</button>`);
    $('#q').oninput = ev => { st.q = ev.target.value; apply(); };
    $('.seg[data-k=status]').onclick = ev => {
      const b = ev.target.closest('button'); if (!b) return;
      st.status = b.dataset.v; $$('.seg[data-k=status] button').forEach(x => x.classList.toggle('on', x === b)); apply();
    };
    $('.seg[data-k=den]').onclick = ev => { const b = ev.target.closest('button'); if (b) setDensity(b.dataset.v); };
    $('#fmk').onchange = ev => { st.mk = ev.target.value; apply(); };
    if ($('#fth')) $('#fth').onchange = ev => { st.theme = ev.target.value; apply(); };
    $('#imgBtn').onclick = ev => { st.img = !st.img; ev.currentTarget.classList.toggle('on', st.img); apply(); };
    $('#jump').onchange = ev => { const b = $(`#rows .band[data-band="${ev.target.value}"]`); if (b) scrollToBand(b); ev.target.blur(); };
    $('#cramBtn').onclick = () => cramOpen((cur && !cur.el.classList.contains('hide') ? cur : firstInView() || vis()[0] || {}).id);

    $('#view').addEventListener('click', ev => {
      const t = ev.target;
      const rowEl = t.closest('.row'), r = rowEl && byId[rowEl.dataset.id];
      const m = t.closest('[data-more]');
      if (m && r) { r.el.classList.add('open'); return; }
      const mk = t.closest('[data-mk]');
      if (mk && r) { setMark(r, mk.dataset.mk); focusRow(r, false); return; }
      const dt = t.closest('[data-det]');
      if (dt && r) { toggleDrawer(r); focusRow(r, false); return; }
      const vsb = t.closest('[data-vs]');
      if (vsb) {
        const w = $(`.vswrap[data-vsband="${vsb.dataset.vs}"]`);
        if (!w.dataset.done) { w.innerHTML = (D.CL || []).filter(c => c.b === vsb.dataset.vs).map(vsHTML).join(''); w.dataset.done = 1; }
        w.classList.toggle('hide'); vsb.classList.toggle('on', !w.classList.contains('hide')); return;
      }
      const j = t.closest('[data-jump]');
      if (j && byId[j.dataset.jump]) { ev.preventDefault(); jump(j.dataset.jump); return; }
      if (r && !t.closest('button,a,img')) focusRow(r, false);
    });

    let tick = false;
    window.addEventListener('scroll', () => {
      if (tick) return; tick = true;
      requestAnimationFrame(() => {
        tick = false;
        const top = $('#top').offsetHeight; let curB = '';
        for (const b of $$('#rows .band:not(.hide)')) { if (b.getBoundingClientRect().top <= top + 2) curB = b.dataset.band; else break; }
        const j = $('#jump'); if (j && document.activeElement !== j) j.value = curB;
      });
    }, { passive: true });

    document.addEventListener('keydown', ev => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.s1done) return;
      if (cram.on) { if (!S1.blocked() || ev.key === 'Escape') cramKey(ev); return; }
      if (S1.typing()) { if (ev.key === 'Escape') document.activeElement.blur(); return; }
      if (S1.blocked()) return;
      const k = ev.key;
      if (k === '/') { ev.preventDefault(); $('#q').focus(); $('#q').select(); return; }
      if (k === 'j' || k === 'ArrowDown') { ev.preventDefault(); cur && !cur.el.classList.contains('hide') ? step(1) : focusRow(firstInView()); return; }
      if (k === 'k' || k === 'ArrowUp') { ev.preventDefault(); cur ? step(-1) : focusRow(firstInView()); return; }
      if (k === ']') return bandStep(1);
      if (k === '[') return bandStep(-1);
      if (k === 'd') return setDensity({ c: 'r', r: 'f', f: 'c' }[S1.pref('den', 'r')]);
      if (k === 'c') return $('#cramBtn').click();
      const r = cur && !cur.el.classList.contains('hide') ? cur : null;
      if (!r) return;
      if (k === '1' || k === '2') { setMark(r, k === '1' ? 'k' : 's', false); step(1); }
      else if (k === '0') { S1.mark(r.id, ''); r.el.classList.remove('mk-k', 'mk-s'); paintCount(); }
      else if (k === 'e' || k === 'Enter') { ev.preventDefault(); toggleDrawer(r); }
      else if (k === 'o') { const qs = [...new Set([...(r.e.ans || []).map(a => a[0]), ...(r.e.dis || []).map(d => d[0])])]; if (qs.length) S1.openQ(qs[0], null, qs); }
    });
    S1.setHelp([['/', 'filter this page'], ['j k or ↓ ↑', 'next / previous row'], ['1 2 0', 'mark know / shaky (and move on) / clear'],
      ['e or Enter', 'open / close the row’s details drawer'], ['o', 'open the row’s questions in the side panel'],
      ['[ ]', 'previous / next section'], ['d', 'cycle row density S → M → L'], ['c', 'cram mode from the current row']]);
  }

  /* ---------- cram mode ---------- */
  const cram = { on: false, list: [], i: 0, rev: false };
  function cramOpen(startId) {
    cram.list = vis().map(r => r.id);
    if (!cram.list.length) return;
    cram.i = Math.max(0, cram.list.indexOf(startId));
    cram.on = true; cram.rev = S1.pref('cramAuto', false);
    if (!$('#cram')) {
      document.body.insertAdjacentHTML('beforeend', '<div id="cram"><div class="ctop"></div><div class="cbody"></div><div class="cfoot"></div></div>');
      $('#cram').addEventListener('click', ev => {
        const a = ev.target.closest('[data-c]'); if (!a) return;
        const c = a.dataset.c;
        if (c === 'x') cramClose(); else if (c === 'prev') cramStep(-1); else if (c === 'next') cramNext();
        else if (c === 'k' || c === 's') { setMark(byId[cram.list[cram.i]], c, false); cramStep(1); }
        else if (c === 'jump') { ev.preventDefault(); const id = a.dataset.id; cramClose(); S1.onJump(id) || (location.href = S1.entHref(id)); }
      });
      $('#cram').addEventListener('change', ev => { if (ev.target.id === 'cramAuto') { S1.setPref('cramAuto', ev.target.checked); cram.rev = cram.rev || ev.target.checked; cramRender(); } });
    }
    $('#cram').classList.add('on');
    document.body.style.overflow = 'hidden';
    cramRender();
  }
  function cramClose() {
    cram.on = false; $('#cram').classList.remove('on'); document.body.style.overflow = '';
    const r = byId[cram.list[cram.i]]; if (r) { focusRow(r, false); r.el.scrollIntoView({ block: 'center' }); }
  }
  function cramStep(d) {
    const n = cram.i + d;
    if (n >= cram.list.length) { S1.toast(`Done — ${cram.list.length} rows crammed.`); cramClose(); return; }
    cram.i = Math.max(0, n); cram.rev = S1.pref('cramAuto', false); cramRender();
  }
  function cramNext() { if (!cram.rev) { cram.rev = true; cramRender(); } else cramStep(1); }
  function cramRender() {
    const id = cram.list[cram.i], e = D.E[id], mk = S1.marks()[id] || '', r = byId[id];
    const band = (D.bands.find(b => b[0] === r.band) || [])[1] || '';
    $('#cram .ctop').innerHTML = `<button class="ib" data-c="x" title="Exit (Esc)">✕ Exit</button><span class="cnt"><b>${cram.i + 1}</b> / ${cram.list.length}</span>` +
      `<div class="prog"><b style="width:${100 * (cram.i + 1) / cram.list.length}%"></b></div>` +
      `<label class="cnt" title="Skip the reveal step and show everything right away"><input type="checkbox" id="cramAuto"${S1.pref('cramAuto', false) ? ' checked' : ''}> show answers right away</label>`;
    let h = `<div class="card"><h2 class="cname">${esc(e.n)}</h2><div class="cmeta"><span class="st ${e.st}">${STL[e.st]}</span><span class="ty">${esc(e.t)}</span><span class="fq">${e.nq}Q</span><span class="ty">${esc(band)}</span>${(e.th || []).map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>`;
    if (!cram.rev) h += `<p class="hint">Say what you know about it out loud, then press <kbd>Space</kbd> to check.</p>`;
    else {
      if (e.aid) h += `<div class="ai">${e.aid}</div>`;
      const all = (gs) => `<ul class="sl2">${gs.map(g => sentLi(g, '')).join('')}</ul>`;
      h += '<div class="cgrid">' +
        `<div class="cbox"><h5>⭐ Essential · verbatim</h5>${(e.ess || []).length ? all(e.ess) : '<span class="empty">—</span>'}</div>` +
        `<div>${(e.bz || []).length ? `<div class="cbox bz"><h5>Boards say · verbatim</h5>${all(e.bz)}</div>` : ''}` +
        ((e.cw || []).length ? `<div class="cbox" style="margin-top:12px"><h5>↔ Confused with</h5><div class="vs" style="margin:0;font-size:13.5px">${e.cw.map(([c, n]) => ENT[c] ? `<a href="${S1.entHref(c)}" data-c="jump" data-id="${c}">${esc(ENT[c].n)}<span>×${n}</span></a>` : '').join(', ')}</div></div>` : '') +
        `${thumbsHTML(e, 8, 6, true)}</div></div>`;
    }
    h += '</div>';
    $('#cram .cbody').innerHTML = h; $('#cram .cbody').scrollTop = 0;
    $('#cram .cfoot').innerHTML = `<button class="ib" data-c="prev" title="←">← Prev</button>` +
      `<button class="ib k${mk === 'k' ? ' on' : ''}" data-c="k" title="1">✓ Know <kbd>1</kbd></button><button class="ib s${mk === 's' ? ' on' : ''}" data-c="s" title="2">● Shaky <kbd>2</kbd></button>` +
      `<button class="ib pri" data-c="next">${cram.rev ? 'Next →' : 'Reveal'} <kbd>Space</kbd></button>`;
    S1.lazy($('#cram'));
  }
  function cramKey(ev) {
    const k = ev.key;
    if (S1.typing() && k !== 'Escape') return;
    if (k === 'Escape') { if (!S1.blocked()) cramClose(); return; }
    if (k === ' ' || k === 'Enter' || k === 'ArrowRight') { ev.preventDefault(); cramNext(); }
    else if (k === 'ArrowLeft') { ev.preventDefault(); cramStep(-1); }
    else if (k === '1' || k === '2') { setMark(byId[cram.list[cram.i]], k === '1' ? 'k' : 's', false); cramStep(1); }
    else if (k === '0') { const r = byId[cram.list[cram.i]]; S1.mark(r.id, ''); r.el.classList.remove('mk-k', 'mk-s'); paintCount(); cramRender(); }
  }

  /* ---------- boot ---------- */
  S1.boot(FILE, async () => {
    D = await S1.load(document.body.dataset.bundle || ('sys-' + document.body.dataset.sys));
    ENT = S1.ENT();
    document.title = D.name + ' · Step 1 Rapid Review';
    S1.setTitle(esc(D.short && D.name.length > 30 ? D.short : D.name));
    document.body.classList.add('den-' + S1.pref('den', 'r'));
    build();
    controls();
    setDensity(S1.pref('den', 'r'));
    apply();
    S1.onJump = id => jump(id);
    window.addEventListener('hashchange', () => jump(location.hash.slice(1)));
    const hid = location.hash.slice(1);
    if (hid && byId[hid]) setTimeout(() => jump(hid), 40);
    else {
      const last = S1.pref('row:' + FILE, '');
      if (last && byId[last] && rows.indexOf(byId[last]) > 4) S1.toast(`↩ Resume at <b>${esc(byId[last].e.n)}</b>`, () => jump(last), 9000);
    }
  });
})();
