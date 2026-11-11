/* Step 1 Rapid Review — core v2: unlock, encrypted loader, app shell (sidebar + bar), command palette,
   question panel with prev/next, lightbox, marks, prefs, theme. Content bundles are unchanged. */
'use strict';
const S1 = (() => {
  const KEY_SLOT = 's1r.key', QSHARDS = 60;
  let K = null;
  const cache = {}, imgCache = {};
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64e = u => { let s = ''; u.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------------- prefs + theme ---------------- */
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem('s1r.prefs') || '{}'); } catch (e) { }
  const pref = (k, d) => (k in prefs ? prefs[k] : d);
  const setPref = (k, v) => { prefs[k] = v; try { localStorage.setItem('s1r.prefs', JSON.stringify(prefs)); } catch (e) { } };
  const sysDark = () => { try { return matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } };
  const applyTheme = t => { document.documentElement.dataset.theme = t; };
  applyTheme(pref('theme', sysDark() ? 'dark' : 'light'));

  /* ---------------- keys ---------------- */
  function stored() { try { return sessionStorage.getItem(KEY_SLOT) || localStorage.getItem(KEY_SLOT); } catch (e) { return null; } }
  async function useRaw(raw) { K = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']); }
  async function unlock(pw, remember) {
    const kj = await (await fetch('k.json', { cache: 'no-cache' })).json();
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const pk = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64d(kj.salt), iterations: kj.it, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(kj.iv) }, pk, b64d(kj.wk)));
    await useRaw(raw);
    try { sessionStorage.setItem(KEY_SLOT, b64e(raw)); if (remember) localStorage.setItem(KEY_SLOT, b64e(raw)); } catch (e) { }
  }
  function lockScreen() {
    return new Promise(res => {
      const d = document.createElement('div');
      d.id = 'lock';
      d.innerHTML = `<form><h2>Step 1 <em>Rapid Review</em></h2><p>Encrypted study notes. Enter the password to unlock.</p>
        <input type="password" autocomplete="current-password" placeholder="Password" required>
        <label><input type="checkbox" checked> Remember on this device</label><button>Unlock</button><div class="err"></div></form>`;
      document.body.appendChild(d);
      const f = $('form', d), inp = $('input[type=password]', f);
      inp.focus();
      f.onsubmit = async ev => {
        ev.preventDefault();
        $('.err', f).textContent = 'Unlocking…';
        try { await unlock(inp.value, $('input[type=checkbox]', f).checked); d.remove(); res(); }
        catch (e) { $('.err', f).textContent = 'Wrong password.'; inp.select(); }
      };
    });
  }
  async function ready() {
    const s = stored();
    if (s) { try { await useRaw(b64d(s)); return; } catch (e) { } }
    await lockScreen();
  }
  function forget() { try { sessionStorage.removeItem(KEY_SLOT); localStorage.removeItem(KEY_SLOT); } catch (e) { } location.reload(); }

  /* ---------------- encrypted fetch ---------------- */
  async function decBuf(buf) { const u = new Uint8Array(buf); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, K, u.slice(12)); }
  async function gunzip(buf) { return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
  function load(name) {
    if (!cache[name]) cache[name] = (async () => {
      const r = await fetch('d/' + name + '.bin');
      if (!r.ok) throw new Error('missing ' + name);
      return JSON.parse(await gunzip(await decBuf(await r.arrayBuffer())));
    })();
    return cache[name];
  }
  function img(enc) {
    if (!imgCache[enc]) imgCache[enc] = (async () => {
      let r = null;
      for (let t = 0; t < 3 && !r; t++) {            // retry a dropped connection instead of leaving a dead image
        try { const x = await fetch('i/' + enc + '.bin'); if (x.ok) r = x; } catch (e) { }
        if (!r) await new Promise(ok => setTimeout(ok, 400 * (t + 1)));
      }
      if (!r) { delete imgCache[enc]; throw new Error('image ' + enc); }
      const p = new Uint8Array(await decBuf(await r.arrayBuffer()));
      const t = p[0] === 0x89 ? 'image/png' : p[0] === 0x47 ? 'image/gif' : p[0] === 0x52 ? 'image/webp' : 'image/jpeg';
      return URL.createObjectURL(new Blob([p], { type: t }));
    })();
    return imgCache[enc];
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; io.unobserve(el);
      img(el.dataset.enc).then(u => { el.src = u; }).catch(() => { el.alt = 'image failed'; });
    });
  }, { rootMargin: '500px 0px' }) : null;
  function lazy(root = document) {
    $$('img[data-enc]:not([data-lz])', root).forEach(el => {
      el.dataset.lz = 1;
      if (io) io.observe(el); else img(el.dataset.enc).then(u => el.src = u);
    });
  }

  /* ---------------- marks ---------------- */
  const MK = 's1r.marks';
  let marks = {};
  try { marks = JSON.parse(localStorage.getItem(MK) || '{}'); } catch (e) { }
  function mark(id, v) {
    if (v) marks[id] = v; else delete marks[id];
    try { localStorage.setItem(MK, JSON.stringify(marks)); } catch (e) { }
  }

  /* ---------------- meta ---------------- */
  let META = null, ENT = {};
  async function meta() {
    if (META) return META;
    META = await load('meta');
    META.ents.forEach(e => { ENT[e[0]] = { id: e[0], n: e[1], sys: e[2], t: e[3], st: e[4], nq: e[5] }; });
    return META;
  }
  const sysFile = c => 'sys-' + c.toLowerCase() + '.html';
  const entHref = id => { const e = ENT[id]; return e ? sysFile(e.sys) + '#' + id : '#'; };
  const ORGAN = ['CVS', 'PULM', 'RENAL', 'GI', 'ENDO', 'REPRO', 'HEME', 'NEURO', 'EYEENT', 'PSYCH', 'MSK', 'DERM'];
  const COLL = [['pharm.html', '💊 Pharmacology', 'pharm'], ['micro.html', '🦠 Microbiology', 'micro'], ['embryo.html', '🧬 Embryology', 'embryo'], ['onco.html', '🎗 Oncology', 'onco']];
  const TOOLS = [['images.html', '🖼 Images'], ['trainer.html', '🎯 Image trainer'], ['buzz.html', '❝ Buzzwords'], ['star.html', '⭐ Sheet'],
    ['gaps.html', '⚠ Distractor-only'], ['report.html', '📋 Report']];

  /* ---------------- shell ---------------- */
  let PAGE = '';
  function shell(page) {
    PAGE = page;
    const bySys = {};
    META.ents.forEach(e => { (bySys[e[2]] = bySys[e[2]] || []).push(e[0]); });
    const sysLink = s => {
      const ids = bySys[s.code] || [], k = ids.filter(i => marks[i] === 'k').length, f = sysFile(s.code);
      return `<a class="sl${f === page ? ' on' : ''}" href="${f}" title="${esc(s.name)} — ${k} of ${ids.length} known"><span class="t">${esc(s.name)}</span>` +
        `<i class="pb"><b style="width:${ids.length ? 100 * k / ids.length : 0}%"></b></i><span class="n">${s.n}</span></a>`;
    };
    const link = ([f, t, key]) => `<a class="sl${f === page ? ' on' : ''}" href="${f}"><span class="t">${t}</span>${key && META[key] ? `<span class="n">${META[key].n}</span>` : ''}</a>`;
    const organ = ORGAN.map(c => META.sys.find(s => s.code === c)).filter(Boolean);
    const cross = META.sys.filter(s => !ORGAN.includes(s.code));
    document.body.insertAdjacentHTML('afterbegin', `
<div class="shell">
  <aside class="side" id="side">
    <a class="brand" href="index.html">Step 1 <em>Rapid Review</em></a>
    <button class="sfind" id="sfind">🔍 Search everything <kbd>⌘K</kbd></button>
    <a class="sl${page === 'index.html' ? ' on' : ''}" href="index.html"><span class="t">🏠 Hub</span></a>
    <div class="sg">Collections</div>${COLL.map(link).join('')}
    <div class="sg">Organ systems</div>${organ.map(sysLink).join('')}
    <div class="sg">Cross-cutting</div>${cross.map(sysLink).join('')}
    <div class="sg">Tools</div>${TOOLS.map(link).join('')}
    <div class="sfoot"><button id="themeBtn"></button><button id="lockBtn" title="Forget the remembered key on this device">🔒 Lock</button></div>
  </aside>
  <div class="main">
    <div class="top" id="top"><div class="bar">
      <button class="ib" id="sideBtn" title="Show / hide the sidebar ( \\ )">☰</button>
      <div class="ttl"><h1 id="title"></h1><span class="cnt" id="count"></span></div>
      <div class="ctl" id="ctl"></div>
      <button class="ib" id="palBtn" title="Search everything (⌘K / Ctrl+K)">🔍 <kbd>⌘K</kbd></button>
      <button class="ib" id="helpBtn" title="Keyboard shortcuts (?)">?</button>
    </div></div>
    <main id="view"></main>
  </div>
</div>
<div id="sideScrim"></div><div id="scrim"></div>
<aside id="panel" aria-label="Question"><div class="ph"><h3></h3><button class="ib" data-pq="-1" title="Previous question (←)">‹</button>
  <span class="cnt" id="pqn"></span><button class="ib" data-pq="1" title="Next question (→)">›</button><span class="tag"></span>
  <button class="ib" data-x>Close ✕</button></div><div class="pb"></div></aside>
<div id="lb"><img alt=""><div class="cap"></div></div>
<div id="help"></div><div id="toast"></div>
<div id="pal"><div class="box"><input placeholder="Jump to any drug, bug, disease, page…" autocomplete="off" spellcheck="false">
  <div class="res"></div><div class="hint"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>⏎</kbd> open</span><span><kbd>Esc</kbd> close</span></div></div></div>`);
    // sidebar state
    const narrow = () => matchMedia('(max-width:1020px)').matches;
    if (!pref('side', innerWidth >= 1440)) document.body.classList.add('side-off');
    $('#sideBtn').onclick = toggleSide;
    $('#sideScrim').onclick = () => document.body.classList.remove('side-open');
    function toggleSide() {
      if (narrow()) document.body.classList.toggle('side-open');
      else { const off = document.body.classList.toggle('side-off'); setPref('side', !off); }
    }
    S1api.toggleSide = toggleSide;
    const tb = $('#themeBtn');
    const paintTheme = () => { tb.textContent = document.documentElement.dataset.theme === 'dark' ? '☀ Light' : '◐ Dark'; };
    paintTheme();
    tb.onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; applyTheme(t); setPref('theme', t); paintTheme(); };
    $('#lockBtn').onclick = () => { if (confirm('Forget the saved key on this device? You will need the password again.')) forget(); };
    $('#sfind').onclick = $('#palBtn').onclick = () => palOpen();
    $('#helpBtn').onclick = () => helpToggle();
    const top = $('#top');
    const setTop = () => document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px');
    setTop();
    if ('ResizeObserver' in window) new ResizeObserver(setTop).observe(top);
    window.addEventListener('resize', setTop);

    $('#scrim').onclick = closePanel;
    $('#panel [data-x]').onclick = closePanel;
    $$('#panel [data-pq]').forEach(b => b.onclick = () => stepQ(+b.dataset.pq));
    $('#lb').onclick = () => $('#lb').classList.remove('on');
    $('#toast').onclick = () => { const f = toastFn; hideToast(); if (f) f(); };
    document.addEventListener('click', ev => {
      const q = ev.target.closest('[data-q]');
      if (q) {
        ev.preventDefault();
        const scope = q.closest('.row,.rowx,.lb,.card,.inf,.reveal,.vsblock') || q.parentNode;
        const list = [...new Set($$('[data-q]', scope).map(x => x.dataset.q))];
        openQ(q.dataset.q, q.dataset.s, list);
        return;
      }
      const z = ev.target.closest('img[data-enc]');
      if (z && !z.closest('.ic') && !z.closest('#lb')) { ev.preventDefault(); zoom(z.dataset.enc, z.dataset.cap || ''); }
    });
    document.addEventListener('keydown', ev => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); $('#pal').classList.contains('on') ? palClose() : palOpen(); return; }
      if (ev.key === 'Escape') {
        // close only the topmost overlay; flag the event so page scripts don't also react to this Esc
        ev.s1done = true;
        if ($('#pal').classList.contains('on')) palClose();
        else if ($('#help').classList.contains('on')) $('#help').classList.remove('on');
        else if ($('#lb').classList.contains('on')) $('#lb').classList.remove('on');
        else if ($('#panel').classList.contains('on')) closePanel();
        else if (document.body.classList.contains('side-open')) document.body.classList.remove('side-open');
        else ev.s1done = false;
        return;
      }
      if (typing || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if ($('#panel').classList.contains('on') && !$('#lb').classList.contains('on')) {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); stepQ(1); }
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); stepQ(-1); }
        return;
      }
      if (ev.key === '?') helpToggle();
      else if (ev.key === '\\') toggleSide();
    });
    if (page !== 'index.html') setPref('lastPage', page);
  }

  /* ---------------- toast / help / zoom ---------------- */
  let toastFn = null, toastT = 0;
  function toast(html, fn, ms = 6000) {
    const t = $('#toast'); t.innerHTML = html; t.classList.add('on'); toastFn = fn || null;
    clearTimeout(toastT); toastT = setTimeout(hideToast, ms);
  }
  function hideToast() { $('#toast').classList.remove('on'); toastFn = null; }
  let helpRows = [];
  function helpToggle() {
    const h = $('#help');
    if (h.classList.toggle('on')) {
      const rows = [['⌘K / Ctrl+K', 'search everything, jump anywhere'], ['\\', 'show / hide the sidebar'], ...helpRows,
        ['Esc', 'close panel, image or overlay'], ['← →', 'previous / next question (when the question panel is open)'], ['?', 'this help']];
      h.innerHTML = '<h3>Keyboard</h3><table>' + rows.map(([k, d]) => `<tr><td>${k.split(' ').map(x => (x === 'or' || x === '/' && k.length > 1) ? x : `<kbd>${esc(x)}</kbd>`).join(' ')}</td><td>${esc(d)}</td></tr>`).join('') + '</table>';
    }
  }
  function zoom(enc, cap) { img(enc).then(u => { $('#lb img').src = u; $('#lb .cap').textContent = cap || ''; $('#lb').classList.add('on'); }); }

  /* ---------------- command palette ---------------- */
  let palItems = null, palSel = 0, palShown = [];
  function palBuild() {
    const pages = [['index.html', '🏠 Hub'], ...COLL.map(c => [c[0], c[1]]), ...META.sys.map(s => [sysFile(s.code), s.name]), ...TOOLS];
    palItems = pages.map(([href, n]) => ({ n, l: n.toLowerCase(), m: 'page', href, w: 1e6 }));
    const short = {}; META.sys.forEach(s => short[s.code] = s.short);
    Object.values(ENT).forEach(e => palItems.push({ n: e.n, l: e.n.toLowerCase(), id: e.id, href: entHref(e.id), w: e.nq,
      m: `${short[e.sys] || ''} · ${e.t} · ${e.st === 'A' ? '✅' : e.st === 'D' ? '⚠' : '📎'} ${e.nq}Q` }));
  }
  function palRender(q) {
    const w = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let hits;
    if (!w.length) hits = palItems.filter(x => x.m === 'page');
    else {
      hits = [];
      for (const x of palItems) {
        if (!w.every(t => x.l.includes(t))) continue;
        const s = x.l.startsWith(w[0]) ? 0 : (x.l.includes(' ' + w[0]) ? 1 : 2);
        hits.push([s, -x.w, x]);
      }
      hits.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].l.length - b[2].l.length);
      hits = hits.slice(0, 40).map(h => h[2]);
    }
    palShown = hits; palSel = 0;
    $('#pal .res').innerHTML = hits.length ? hits.map((x, i) => `<div class="it${i ? '' : ' on'}" data-i="${i}"><span class="n">${esc(x.n)}</span><span class="m">${esc(x.m)}</span></div>`).join('')
      : '<div class="it"><span class="n" style="color:var(--muted)">No matches</span></div>';
  }
  function palGo(i) {
    const x = palShown[i]; if (!x) return;
    palClose();
    if (x.id && S1api.onJump && S1api.onJump(x.id)) return;
    location.href = x.href;
  }
  function palOpen() {
    if (!palItems) palBuild();
    const p = $('#pal'), inp = $('input', p);
    p.classList.add('on'); inp.value = ''; palRender(''); inp.focus();
    inp.oninput = () => palRender(inp.value);
    inp.onkeydown = ev => {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        palSel = Math.max(0, Math.min(palShown.length - 1, palSel + (ev.key === 'ArrowDown' ? 1 : -1)));
        $$('#pal .it').forEach((d, i) => d.classList.toggle('on', i === palSel));
        const on = $('#pal .it.on'); if (on) on.scrollIntoView({ block: 'nearest' });
      } else if (ev.key === 'Enter') { ev.preventDefault(); palGo(palSel); }
    };
    $('.res', p).onclick = ev => { const d = ev.target.closest('[data-i]'); if (d) palGo(+d.dataset.i); };
    p.onclick = ev => { if (ev.target === p) palClose(); };
  }
  function palClose() { $('#pal').classList.remove('on'); }

  /* ---------------- question side panel ---------------- */
  let qList = [], qIdx = 0;
  function closePanel() { $('#panel').classList.remove('on'); $('#scrim').classList.remove('on'); }
  function stepQ(d) {
    if (qList.length < 2) return;
    qIdx = (qIdx + d + qList.length) % qList.length;
    openQ(qList[qIdx], null, qList);
  }
  async function openQ(qid, sid, list) {
    qList = list && list.length ? list : [qid];
    qIdx = Math.max(0, qList.indexOf(qid));
    const P = $('#panel');
    P.classList.add('on'); $('#scrim').classList.add('on');
    $('.ph h3', P).textContent = 'Q' + qid;
    $('#pqn').textContent = qList.length > 1 ? `${qIdx + 1}/${qList.length}` : '';
    $$('[data-pq]', P).forEach(b => b.classList.toggle('hide', qList.length < 2));
    $('.ph .tag', P).textContent = '';
    $('.pb', P).innerHTML = '<p class="note">Loading…</p>';
    const shard = await load('q' + (parseInt(qid, 10) % QSHARDS));
    const q = shard[qid];
    if (!q) { $('.pb', P).innerHTML = '<p class="note">Question not found.</p>'; return; }
    $('.ph .tag', P).textContent = q.sj + ' · ' + q.sy;
    const imgTag = f => `<img class="qi" data-enc="${q.im[f]}" alt="" data-cap="Q${qid}">`;
    let h = '<div class="stem">', ul = false;
    q.stem.forEach(p => {
      if (p.img) { h += imgTag(p.img); return; }
      if (p.li) { if (!ul) { h += '<ul>'; ul = true; } h += `<li>${esc(p.t)}</li>`; return; }
      if (ul) { h += '</ul>'; ul = false; }
      h += `<p>${esc(p.t)}</p>`;
    });
    if (ul) h += '</ul>';
    h += '</div><ol class="opts">';
    q.o.forEach(([L, t, pct, eid]) => {
      const e = eid && ENT[eid];
      h += `<li class="${L === q.k ? 'key' : ''}"><span class="L">${L}</span><span>${esc(t)}${L === q.k ? ' ✓' : ''}` +
        (e ? `<a class="er" href="${entHref(eid)}">→ ${esc(e.n)}</a>` : '') + `</span><span class="pct">${pct == null ? '' : pct + '%'}</span></li>`;
    });
    h += '</ol>';
    if (q.note) h += `<div class="ai" style="margin:8px 0">⚑ <b>AI check of this explanation:</b> ${esc(q.note)}</div>`;
    if (q.k0 && q.k0 !== q.k) h += `<p class="note">⚑ The bank's stored key is <b>${q.k0}</b>, but the explanation defends <b>${q.k}</b> (options were reshuffled without updating the key). Rows follow the explanation.</p>`;
    if (q.home && ENT[q.home]) h += `<p class="note">Filed under <a href="${entHref(q.home)}">${esc(ENT[q.home].n)}</a>` +
      (q.vdx && q.vdx.length ? ` · vignette: ${q.vdx.map(v => ENT[v] ? `<a href="${entHref(v)}">${esc(ENT[v].n)}</a>` : '').join(', ')}` : '') + '</p>';
    h += '<div class="ex">';
    const optText = L => { const o = q.o.find(x => x[0] === L); return o ? o[1] : ''; };
    q.b.forEach(b => {
      if (b.k === 'img') { h += imgTag(b.img); return; }
      if (b.k === 'head') {
        const disp = q.mp[q.st] || q.k;
        h += `<p><span class="lab">${esc(b.hdr || '')}</span>${q.st && disp !== q.st ? `<span class="map">= option ${disp} in your order</span>` : ''}</p>`;
        return;
      }
      const sents = b.s.map(i => `<span class="s" data-i="${i}">${esc(q.s[i])}</span>`).join(' ');
      if (b.k === 'cap') { h += `<p class="cap">${sents}</p>`; return; }
      let lab = '';
      if (b.hdr) {
        const letters = (b.lab || '').split('');
        lab = `<span class="lab">${esc(b.hdr)}</span> <span class="map">${letters.map(c => { const D = q.mp[c] || c; return D + ' · ' + esc(optText(D)); }).join(' / ')}</span> `;
      }
      h += `<p${b.k === 'li' ? ' style="padding-left:14px"' : ''}>${b.k === 'li' ? '• ' : ''}${lab}${sents}</p>`;
    });
    h += '</div>';
    $('.pb', P).innerHTML = h;
    lazy(P);
    $('.pb', P).scrollTop = 0;
    if (sid != null && sid !== '') {
      let first = null;
      String(sid).split(',').forEach(i => { const el = $(`.ex span.s[data-i="${i}"]`, P); if (el) { el.classList.add('hit'); first = first || el; } });
      if (first) first.scrollIntoView({ block: 'center' });
    }
  }

  /* ---------------- helpers ---------------- */
  function markText(t, subs) {
    let h = esc(t);
    (subs || []).slice().sort((a, b) => b.length - a.length).forEach(s => {
      const e = esc(s), i = h.indexOf(e);
      if (i >= 0 && !/<mark>[^<]*$/.test(h.slice(0, i))) h = h.slice(0, i) + '<mark>' + e + '</mark>' + h.slice(i + e.length);
    });
    return h;
  }
  const blocked = () => ['#pal', '#help', '#lb', '#panel'].some(s => { const el = $(s); return el && el.classList.contains('on'); });
  const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  const SEARCH = (ph, id = 'q') => `<div class="search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="${id}" type="search" placeholder="${ph}" autocomplete="off"></div>`;

  async function boot(page, init) {
    await ready();
    await meta();
    shell(page);
    try { await init(); }
    catch (e) { console.error(e); $('#view').insertAdjacentHTML('afterbegin', `<p class="noresults">Could not load: ${esc(e.message)}</p>`); }
    lazy();
  }
  const S1api = {
    boot, load, img, lazy, esc, $, $$, marks: () => marks, mark, ENT: () => ENT, META: () => META, entHref, sysFile, openQ, zoom,
    markText, pref, setPref, toast, forget, blocked, typing, SEARCH, palOpen, ORGAN,
    setTitle: (html, count) => { $('#title').innerHTML = html; if (count != null) $('#count').innerHTML = count; },
    setCount: html => { $('#count').innerHTML = html; },
    setCtl: html => { $('#ctl').innerHTML = html; },
    setHelp: rows => { helpRows = rows; },
    onJump: null, page: () => PAGE,
  };
  return S1api;
})();
