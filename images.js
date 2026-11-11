/* Images table: one row per distinct image, grouped by image type then system. */
'use strict';
(() => {
  const { esc, $, $$ } = S1;
  const st = { q: '', kind: 'recog', type: '' };
  let D, ENT, rows = [];
  const sl = sids => sids.length ? `<ul class="sl">${sids.map(s => `<li>${S1.markText(D.S[s], D.M[s])}</li>`).join('')}</ul>` : '<span class="empty">not described in the explanation</span>';

  S1.boot('images.html', async () => {
    D = await S1.load('images'); ENT = S1.ENT();
    const TL = D.types;
    $('#sub').textContent = `${D.I.filter(i => i.r).length} recognition images and ${D.I.filter(i => !i.r).length} diagrams/data images (after removing ${D.ndup} exact repeats). Descriptions are the explanation's own sentences; the violet card is my “how to spot it”.`;
    const order = Object.keys(TL);
    const sysOrder = S1.META().sys.map(s => s.code);
    D.I.sort((a, b) => order.indexOf(a.t) - order.indexOf(b.t) || sysOrder.indexOf(a.sys) - sysOrder.indexOf(b.sys) || ((ENT[a.ent] || {}).n || '').localeCompare((ENT[b.ent] || {}).n || ''));
    let h = '', cur = '';
    D.I.forEach((im, i) => {
      if (im.t !== cur) { cur = im.t; h += `<tr class="sec" data-sec="${im.t}"><td colspan="7"><span class="sec-label">${esc(TL[im.t] || im.t)}</span><span class="sec-n"></span></td></tr>`; }
      const e = ENT[im.ent];
      const others = (im.ents || []).filter(x => x !== im.ent && ENT[x]);
      h += `<tr class="row" data-i="${i}"><td class="im"><img data-enc="${im.e}" alt="" data-cap="${esc(e ? e.n : '')}"></td>
        <td><span class="tp ${D.cls[im.t] || 'other'}">${esc(TL[im.t] || im.t)}</span>${im.r ? '' : `<div class="empty" style="margin-top:5px">${esc(im.why || 'not a recognition image')}</div>`}</td>
        <td>${e ? `<a href="${S1.entHref(im.ent)}"><b>${esc(e.n)}</b></a>` : '<span class="empty">—</span>'}
          ${others.length ? `<div class="st" style="font-size:11px;color:var(--muted)">also on: ${others.map(x => `<a href="${S1.entHref(x)}">${esc(ENT[x].n)}</a>`).join(', ')}</div>` : ''}
          ${im.lk && ENT[im.lk] ? `<div style="font-size:11px;margin-top:4px;color:var(--muted)">look-alike: <a href="${S1.entHref(im.lk)}">${esc(ENT[im.lk].n)}</a></div>` : ''}</td>
        <td>${sl(im.sh)}</td><td>${sl(im.ft.filter(s => !im.sh.includes(s)))}</td>
        <td>${im.aid ? `<div class="ai">${im.aid}</div>` : ''}</td>
        <td>${im.q.map(q => `<button class="q" data-q="${q}">${q}</button>`).join(' ')}</td></tr>`;
    });
    $('#tb').innerHTML = h;
    rows = $$('#tb tr.row').map(tr => {
      const im = D.I[tr.dataset.i];
      const e = ENT[im.ent];
      return { tr, im, txt: [e ? e.n : '', TL[im.t], ...im.sh.map(s => D.S[s]), ...im.ft.map(s => D.S[s]), im.aid || ''].join(' ').toLowerCase() };
    });
    const counts = {};
    D.I.forEach(i => counts[i.t] = (counts[i.t] || 0) + 1);
    $('#chips').innerHTML = `<span class="chip on" data-t="">All types</span>` + order.filter(t => counts[t]).map(t => `<span class="chip" data-t="${t}">${esc(TL[t])}<span class="n">${counts[t]}</span></span>`).join('');
    $('#chips').onclick = ev => { const c = ev.target.closest('[data-t]'); if (!c) return; st.type = c.dataset.t; $$('#chips .chip').forEach(x => x.classList.toggle('on', x === c)); apply(); };
    $('#q').oninput = ev => { st.q = ev.target.value; apply(); };
    $$('.seg[data-k]').forEach(seg => seg.onclick = ev => { const b = ev.target.closest('button'); if (!b) return; st.kind = b.dataset.v; $$('button', seg).forEach(x => x.classList.toggle('on', x === b)); apply(); });
    apply();
  });

  function apply() {
    const w = st.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let n = 0; const per = {};
    rows.forEach(r => {
      let ok = w.every(x => r.txt.includes(x));
      if (ok && st.kind !== 'all') ok = st.kind === 'recog' ? r.im.r : !r.im.r;
      if (ok && st.type) ok = r.im.t === st.type;
      r.tr.classList.toggle('hide', !ok);
      if (ok) { n++; per[r.im.t] = (per[r.im.t] || 0) + 1; }
    });
    $$('#tb tr.sec').forEach(tr => { const c = per[tr.dataset.sec] || 0; tr.classList.toggle('hide', !c); tr.querySelector('.sec-n').textContent = c; });
    $('#count').innerHTML = `<b>${n}</b> images`;
    $('#nores').classList.toggle('hide', n > 0);
    S1.lazy();
  }
})();
