/* Step 1 Rapid Review — core: unlock, encrypted loader, nav, side panel, lightbox, marks, help. */
'use strict';
const S1 = (() => {
  const KEY_SLOT = 's1r.key';
  const QSHARDS = 60;
  let K = null;
  const cache = {}, imgCache = {};
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64e = u => { let s = ''; u.forEach(b => s += String.fromCharCode(b)); return btoa(s); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------------- keys ---------------- */
  function stored() {
    try { return sessionStorage.getItem(KEY_SLOT) || localStorage.getItem(KEY_SLOT); } catch (e) { return null; }
  }
  async function useRaw(raw) {
    K = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  }
  async function unlock(pw, remember) {
    const kj = await (await fetch('k.json', { cache: 'no-cache' })).json();
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const pk = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64d(kj.salt), iterations: kj.it, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const raw = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(kj.iv) }, pk, b64d(kj.wk)));
    await useRaw(raw);
    try {
      sessionStorage.setItem(KEY_SLOT, b64e(raw));
      if (remember) localStorage.setItem(KEY_SLOT, b64e(raw));
    } catch (e) { }
  }
  function lockScreen() {
    return new Promise(res => {
      const d = document.createElement('div');
      d.id = 'lock';
      d.innerHTML = `<form><h2>Step 1 Rapid Review</h2><p>Encrypted study notes. Enter the password to unlock.</p>
        <input type="password" autocomplete="current-password" placeholder="Password" required>
        <label><input type="checkbox"> Remember on this device</label><button>Unlock</button><div class="err"></div></form>`;
      document.body.appendChild(d);
      const f = d.querySelector('form'), inp = f.querySelector('input[type=password]');
      inp.focus();
      f.onsubmit = async ev => {
        ev.preventDefault();
        f.querySelector('.err').textContent = 'Unlocking…';
        try {
          await unlock(inp.value, f.querySelector('input[type=checkbox]').checked);
          d.remove(); res();
        } catch (e) { f.querySelector('.err').textContent = 'Wrong password.'; inp.select(); }
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
  async function decBuf(buf) {
    const u = new Uint8Array(buf);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: u.slice(0, 12) }, K, u.slice(12));
  }
  async function gunzip(buf) {
    const ds = new DecompressionStream('gzip');
    return new Response(new Blob([buf]).stream().pipeThrough(ds)).text();
  }
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
      const r = await fetch('i/' + enc + '.bin');
      const plain = new Uint8Array(await decBuf(await r.arrayBuffer()));
      const t = plain[0] === 0x89 ? 'image/png' : plain[0] === 0x47 ? 'image/gif' : plain[0] === 0x52 ? 'image/webp' : 'image/jpeg';
      return URL.createObjectURL(new Blob([plain], { type: t }));
    })();
    return imgCache[enc];
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; io.unobserve(el);
      img(el.dataset.enc).then(u => { el.src = u; }).catch(() => { el.alt = 'image failed'; });
    });
  }, { rootMargin: '400px 0px' }) : null;
  function lazy(root = document) {
    $$('img[data-enc]:not([data-lz])', root).forEach(el => {
      el.dataset.lz = 1;
      if (io) io.observe(el); else img(el.dataset.enc).then(u => el.src = u);
    });
  }

  /* ---------------- marks (know / shaky) ---------------- */
  const MK = 's1r.marks';
  let marks = {};
  try { marks = JSON.parse(localStorage.getItem(MK) || '{}'); } catch (e) { }
  function mark(id, v) {
    if (v) marks[id] = v; else delete marks[id];
    try { localStorage.setItem(MK, JSON.stringify(marks)); } catch (e) { }
  }

  /* ---------------- meta / nav ---------------- */
  let META = null, ENT = {};
  async function meta() {
    if (META) return META;
    META = await load('meta');
    META.ents.forEach(e => { ENT[e[0]] = { id: e[0], n: e[1], sys: e[2], t: e[3], st: e[4], nq: e[5] }; });
    return META;
  }
  const sysFile = c => 'sys-' + c.toLowerCase() + '.html';
  const entHref = id => { const e = ENT[id]; return e ? sysFile(e.sys) + '#' + id : '#'; };
  function nav(active) {
    const n = document.createElement('nav'); n.className = 'site';
    const links = [['index.html', 'Hub'], ...META.sys.map(s => [sysFile(s.code), s.short])];
    const tools = [['pharm.html', '💊 Pharmacology'], ['micro.html', '🦠 Microbiology'], ['embryo.html', '🧬 Embryology'], ['onco.html', '🎗 Oncology'], ['images.html', 'Images'], ['trainer.html', 'Image trainer'], ['buzz.html', 'Buzzword index'],
      ['star.html', '⭐ Sheet'], ['gaps.html', '⚠ Distractor-only'], ['report.html', 'Report']];
    n.innerHTML = links.map(([h, t]) => `<a href="${h}" class="${h === active ? 'on' : ''}">${esc(t)}</a>`).join('') +
      '<span class="sep"></span>' + tools.map(([h, t]) => `<a href="${h}" class="${h === active ? 'on' : ''}">${esc(t)}</a>`).join('');
    const h = $('header.top');
    h.parentNode.insertBefore(n, h.nextSibling);
  }

  /* ---------------- shared UI shells ---------------- */
  function shells() {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="scrim"></div>
      <aside id="panel" aria-label="Question"><div class="ph"><h3></h3><span class="tag"></span><button data-x>Close ✕</button></div><div class="pb"></div></aside>
      <div id="lb"><img alt=""><div class="cap"></div></div>
      <div id="help"><h3 style="margin:0 0 8px;font-family:var(--serif)">Keyboard</h3><table>
        <tr><td><kbd>/</kbd></td><td>search</td></tr><tr><td><kbd>j</kbd> <kbd>k</kbd></td><td>next / previous row</td></tr>
        <tr><td><kbd>1</kbd> <kbd>2</kbd> <kbd>0</kbd></td><td>mark know / shaky / clear</td></tr>
        <tr><td><kbd>e</kbd></td><td>open / close the extra row</td></tr><tr><td><kbd>w</kbd></td><td>show / hide why-wrong for the row</td></tr><tr><td><kbd>Esc</kbd></td><td>close panel / image</td></tr>
        <tr><td><kbd>?</kbd></td><td>this help</td></tr></table></div>`);
    $('#scrim').onclick = closePanel;
    $('#panel [data-x]').onclick = closePanel;
    $('#lb').onclick = () => $('#lb').classList.remove('on');
    document.addEventListener('click', ev => {
      const q = ev.target.closest('[data-q]');
      if (q) { ev.preventDefault(); openQ(q.dataset.q, q.dataset.s, q.dataset.e); return; }
      const z = ev.target.closest('img[data-enc]');
      if (z && !z.closest('.tr-stage') && !z.closest('#lb')) { ev.preventDefault(); zoom(z.dataset.enc, z.dataset.cap || z.alt || ''); }
    });
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape') { closePanel(); $('#lb').classList.remove('on'); $('#help').classList.remove('on'); }
      if (ev.key === '?' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) $('#help').classList.toggle('on');
    });
  }
  function zoom(enc, cap) {
    img(enc).then(u => { $('#lb img').src = u; $('#lb .cap').textContent = cap || ''; $('#lb').classList.add('on'); });
  }
  function closePanel() { $('#panel').classList.remove('on'); $('#scrim').classList.remove('on'); }

  /* ---------------- question side panel ---------------- */
  async function openQ(qid, sid, fromEnt) {
    const P = $('#panel');
    P.classList.add('on'); $('#scrim').classList.add('on');
    $('.ph h3', P).textContent = 'Q' + qid;
    $('.ph .tag', P).textContent = '';
    $('.pb', P).innerHTML = '<p class="note">Loading…</p>';
    const shard = await load('q' + (parseInt(qid, 10) % QSHARDS));
    const q = shard[qid];
    if (!q) { $('.pb', P).innerHTML = '<p class="note">Question not found.</p>'; return; }
    $('.ph .tag', P).textContent = q.sj + ' · ' + q.sy;
    const imgTag = f => `<img class="qi" data-enc="${q.im[f]}" alt="" data-cap="Q${qid}">`;
    let h = '<div class="stem">';
    let ul = false;
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
      const ids = String(sid).split(',');
      let first = null;
      ids.forEach(i => { const el = $(`.ex span.s[data-i="${i}"]`, P); if (el) { el.classList.add('hit'); first = first || el; } });
      if (first) first.scrollIntoView({ block: 'center' });
    }
  }

  /* ---------------- helpers for pages ---------------- */
  function markText(t, subs) {
    let h = esc(t);
    (subs || []).slice().sort((a, b) => b.length - a.length).forEach(s => {
      const e = esc(s);
      const i = h.indexOf(e);
      if (i >= 0 && !/<mark>[^<]*$/.test(h.slice(0, i))) h = h.slice(0, i) + '<mark>' + e + '</mark>' + h.slice(i + e.length);
    });
    return h;
  }
  function ring(pct) {
    const r = 9, c = 2 * Math.PI * r;
    return `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="${r}" fill="none" stroke="#e3ded3" stroke-width="4"/>` +
      `<circle cx="12" cy="12" r="${r}" fill="none" stroke="#1f7a4d" stroke-width="4" stroke-dasharray="${c * pct} ${c}"/></svg>`;
  }
  function setTheadTop() {
    const st = $('.stickytop');
    if (st) document.documentElement.style.setProperty('--thead-top', st.offsetHeight + 'px');
  }
  window.addEventListener('resize', setTheadTop);

  async function boot(page, init) {
    await ready();
    await meta();
    nav(page);
    shells();
    try { await init(); }
    catch (e) { console.error(e); document.querySelector('main').insertAdjacentHTML('afterbegin', `<p class="noresults">Could not load: ${esc(e.message)}</p>`); }
    setTheadTop();
    lazy();
    if (location.hash) { const el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 50); }
  }
  return { boot, load, img, lazy, esc, $, $$, marks: () => marks, mark, ENT: () => ENT, META: () => META, entHref, sysFile, openQ, zoom, markText, ring, setTheadTop, forget };
})();
