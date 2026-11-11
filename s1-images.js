/* Images v2: a gallery of every distinct image (grouped by image type), with filters, a "hide the
   diagnosis" self-quiz mode, and a detail view you can arrow through. Content is unchanged. */
'use strict';
(() => {
  const { esc, $, $$ } = S1;
  const st = { q: '', kind: 'recog', type: '', sys: '' };
  let D, ENT, TL, cards = [], vis = [], cur = -1, revealed = true;
  const sl = sids => sids.length ? `<ul class="sl2">${sids.map(s => { const [q, i] = s.split('.'); return `<li>${S1.markText(D.S[s], D.M[s])}<button class="q" data-q="${q}" data-s="${i}">${q}</button></li>`; }).join('')}</ul>` : '<span class="empty">not described in the explanation</span>';

  S1.boot('images.html', async () => {
    D = await S1.load('images'); ENT = S1.ENT(); TL = D.types;
    const M = S1.META();
    const order = Object.keys(TL), sysOrder = M.sys.map(s => s.code);
    D.I.sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t) || sysOrder.indexOf(a.sys) - sysOrder.indexOf(b.sys) || ((ENT[a.ent] || {}).n || '').localeCompare((ENT[b.ent] || {}).n || ''));
    const tc = {}, sc = {};
    D.I.forEach(i => { tc[i.t] = (tc[i.t] || 0) + 1; sc[i.sys] = (sc[i.sys] || 0) + 1; });
    S1.setTitle('Images');
    S1.setCtl(S1.SEARCH('Search diagnosis, description, aid…  ( / )') +
      `<div class="seg" data-k="kind"><button class="on" data-v="recog" title="Images you must recognize">Recognition</button><button data-v="data" title="Diagrams, graphs and data images">Diagrams</button><button data-v="all">All</button></div>` +
      `<select class="sel" id="ft"><option value="">All image types</option>${order.filter(t => tc[t]).map(t => `<option value="${t}">${esc(TL[t])} (${tc[t]})</option>`).join('')}</select>` +
      `<select class="sel" id="fs"><option value="">All systems</option>${M.sys.filter(s => sc[s.code]).map(s => `<option value="${s.code}">${esc(s.short)} (${sc[s.code]})</option>`).join('')}</select>` +
      `<button class="ib" id="hdx" title="Blur the diagnoses and quiz yourself; hover a card or open it to check ( h )">🙈 Hide diagnoses</button>`);
    let h = '<div class="gal" id="gal">', curT = '';
    D.I.forEach((im, i) => {
      if (im.t !== curT) { curT = im.t; h += `<div class="gh" data-sec="${im.t}">${esc(TL[im.t] || im.t)} <span></span></div>`; }
      const e = ENT[im.ent];
      h += `<figure class="ic" data-i="${i}"><img data-enc="${im.e}" alt=""><figcaption><span class="tp ${D.cls[im.t] || 'other'}">${esc(TL[im.t] || im.t)}</span>` +
        `<span class="dx">${e ? esc(e.n) : '<span class="empty">—</span>'}</span></figcaption></figure>`;
    });
    $('#view').innerHTML = h + '</div><p id="nores" class="noresults hide">No images match.</p>';
    document.body.insertAdjacentHTML('beforeend', '<div id="imd"><div class="box"><div class="pic"><img alt="" data-lz="1"></div><div class="inf"></div></div></div>');
    cards = $$('#gal .ic').map(el => {
      const im = D.I[el.dataset.i], e = ENT[im.ent];
      return { el, im, txt: [e ? e.n : '', TL[im.t], ...im.sh.map(s => D.S[s]), ...im.ft.map(s => D.S[s]), im.aid || ''].join(' ').toLowerCase() };
    });
    $('#q').oninput = ev => { st.q = ev.target.value; apply(); };
    $('.seg[data-k=kind]').onclick = ev => { const b = ev.target.closest('button'); if (!b) return; st.kind = b.dataset.v; $$('.seg[data-k=kind] button').forEach(x => x.classList.toggle('on', x === b)); apply(); };
    $('#ft').onchange = ev => { st.type = ev.target.value; apply(); };
    $('#fs').onchange = ev => { st.sys = ev.target.value; apply(); };
    $('#hdx').onclick = toggleHide;
    if (S1.pref('hidedx', false)) toggleHide();
    $('#gal').onclick = ev => { const c = ev.target.closest('.ic'); if (c) open(vis.indexOf(cards[c.dataset.i])); };
    const md = $('#imd');
    md.onclick = ev => {
      if (ev.target === md) return close();
      const a = ev.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'prev') go(-1); else if (a.dataset.a === 'next') go(1); else if (a.dataset.a === 'close') close(); else if (a.dataset.a === 'rev') { revealed = true; paint(); }
    };
    document.addEventListener('keydown', key);
    S1.setHelp([['/', 'search images'], ['h', 'hide / show the diagnoses (self-quiz)'], ['← →', 'previous / next image (when one is open)'], ['Space', 'reveal the diagnosis, then next image']]);
    apply();
  });

  function toggleHide() {
    const on = document.body.classList.toggle('hidedx');
    $('#hdx').classList.toggle('on', on); S1.setPref('hidedx', on);
    if (cur >= 0) { revealed = !on; paint(); }
  }
  function apply() {
    const w = st.q.trim().toLowerCase().split(/\s+/).filter(Boolean), per = {};
    vis = [];
    cards.forEach(c => {
      let ok = w.every(x => c.txt.includes(x));
      if (ok && st.kind !== 'all') ok = st.kind === 'recog' ? !!c.im.r : !c.im.r;
      if (ok && st.type) ok = c.im.t === st.type;
      if (ok && st.sys) ok = c.im.sys === st.sys;
      c.el.classList.toggle('hide', !ok);
      if (ok) { vis.push(c); per[c.im.t] = (per[c.im.t] || 0) + 1; }
    });
    $$('#gal .gh').forEach(g => { const n = per[g.dataset.sec] || 0; g.classList.toggle('hide', !n); $('span', g).textContent = '· ' + n; });
    S1.setCount(`<b>${vis.length.toLocaleString()}</b> images`);
    $('#nores').classList.toggle('hide', vis.length > 0);
  }

  function open(i) { if (i < 0) return; cur = i; revealed = !document.body.classList.contains('hidedx'); $('#imd').classList.add('on'); paint(); }
  function close() { $('#imd').classList.remove('on'); cur = -1; }
  function go(d) {
    if (cur < 0 || !vis.length) return;
    cur = (cur + d + vis.length) % vis.length;
    revealed = !document.body.classList.contains('hidedx');
    paint();
  }
  function paint() {
    const c = vis[cur]; if (!c) return close();
    const im = c.im, e = ENT[im.ent], md = $('#imd'), pic = $('.pic img', md);
    pic.removeAttribute('src'); pic.dataset.enc = im.e; pic.dataset.cap = revealed && e ? e.n : '';
    S1.img(im.e).then(u => { if (vis[cur] === c) pic.src = u; });
    const nx = vis[(cur + 1) % vis.length]; if (nx) S1.img(nx.im.e);
    const others = (im.ents || []).filter(x => x !== im.ent && ENT[x]);
    let h = `<div><span class="tp ${D.cls[im.t] || 'other'}">${esc(TL[im.t] || im.t)}</span> <span class="cnt">${cur + 1} / ${vis.length}</span></div>`;
    if (!revealed) {
      h += `<h3>What is it?</h3><p class="note">Commit to a diagnosis, then reveal.</p>
        <div class="nav"><button class="btn" data-a="rev">Reveal <kbd>Space</kbd></button><button class="btn ghost" data-a="prev">‹ Prev</button><button class="btn ghost" data-a="next">Next ›</button><button class="btn ghost" data-a="close">Close</button></div>`;
    } else {
      h += `<h3>${e ? `<a href="${S1.entHref(im.ent)}" style="color:inherit">${esc(e.n)}</a>` : '<span class="empty">no row</span>'}</h3>` +
        (im.r ? '' : `<div class="empty">${esc(im.why || 'not a recognition image')}</div>`) +
        (others.length ? `<div class="note">also on: ${others.map(x => `<a href="${S1.entHref(x)}">${esc(ENT[x].n)}</a>`).join(', ')}</div>` : '') +
        (im.lk && ENT[im.lk] ? `<div class="note">look-alike: <a href="${S1.entHref(im.lk)}">${esc(ENT[im.lk].n)}</a></div>` : '') +
        `<h5>What it shows · verbatim</h5>${sl(im.sh)}`;
      const ft = im.ft.filter(s => !im.sh.includes(s));
      if (ft.length) h += `<h5>Feature to look for · verbatim</h5>${sl(ft)}`;
      if (im.aid) h += `<h5>How to spot it</h5><div class="ai">${im.aid}</div>`;
      h += `<h5>Questions</h5><div>${im.q.map(q => `<button class="qp" data-q="${q}">${q}</button>`).join('')}</div>
        <div class="nav"><button class="btn ghost" data-a="prev">‹ Prev</button><button class="btn" data-a="next">Next ›</button>${e ? `<a class="btn ghost" href="${S1.entHref(im.ent)}">Open row →</a>` : ''}<button class="btn ghost" data-a="close">Close</button></div>`;
    }
    const inf = $('.inf', md); inf.innerHTML = h; inf.scrollTop = 0;
  }
  function key(ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    const isOpen = cur >= 0;
    if (ev.key === 'Escape') { if (isOpen && !ev.s1done) close(); return; }
    if (S1.typing() || S1.blocked()) return;
    if (ev.key === '/') { if (!isOpen) { ev.preventDefault(); $('#q').focus(); } }
    else if (ev.key === 'h') toggleHide();
    else if (isOpen && (ev.key === 'ArrowRight' || ev.key === 'j')) { ev.preventDefault(); go(1); }
    else if (isOpen && (ev.key === 'ArrowLeft' || ev.key === 'k')) { ev.preventDefault(); go(-1); }
    else if (isOpen && ev.key === ' ') { ev.preventDefault(); if (!revealed) { revealed = true; paint(); } else go(1); }
  }
})();
