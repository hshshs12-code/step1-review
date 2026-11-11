/* Buzzword index, master ⭐ sheet, distractor-only list, build report — v2 shell. */
'use strict';
(() => {
  const page = document.body.dataset.file;
  const { esc, $, $$ } = S1;
  const chipQ = sid => { const [q, i] = sid.split('.'); return `<button class="q" data-q="${q}" data-s="${i}">${q}</button>`; };
  const grpChips = g => { const by = {}; g.forEach(s => { const [q, i] = s.split('.'); (by[q] = by[q] || []).push(i); }); return Object.entries(by).map(([q, is]) => `<button class="q" data-q="${q}" data-s="${is.join(',')}">${q}</button>`).join(''); };
  const filt = (sel, q) => {
    const w = q.toLowerCase().split(/\s+/).filter(Boolean); let n = 0;
    $$(sel).forEach(b => { const ok = w.every(x => b.dataset.t.includes(x)); b.classList.toggle('hide', !ok); if (ok) n++; });
    return n;
  };
  const key = e => { if (e.key === '/' && !S1.typing() && !S1.blocked()) { e.preventDefault(); $('#q').focus(); } };

  async function buzz() {
    const D = await S1.load('buzz'), ENT = S1.ENT();
    const groups = {};
    D.B.forEach(([ph, eid, sid]) => { const k = ph.toLowerCase(); (groups[k] = groups[k] || { ph, items: [] }).items.push([eid, sid]); });
    const first = k => (k.replace(/^[^a-z0-9]+/, '')[0] || '#').toUpperCase();
    const keys = Object.keys(groups).sort((a, b) => a.replace(/^[^a-z0-9]+/, '').localeCompare(b.replace(/^[^a-z0-9]+/, '')));
    const letters = [...new Set(keys.map(first))];
    S1.setTitle('Buzzword → <em>diagnosis</em>');
    S1.setCtl(S1.SEARCH('Search phrases or diagnoses…  ( / )') +
      `<select class="sel" id="lj"><option value="">Jump to letter…</option>${letters.map(l => `<option>${l}</option>`).join('')}</select>` +
      `<button class="ib" id="hideA" title="Blur the diagnoses so you can quiz yourself; hover a card to check">🙈 Hide answers</button>`);
    let h = '<div class="pad"><p class="lead">Every highlighted board phrase from the explanations (verbatim), pointing at the row it belongs to. Read the phrase, name the diagnosis, then check.</p><div class="lgrid">', cur = '';
    keys.forEach(k => {
      const g = groups[k], L = first(k);
      const ents = [...new Set(g.items.map(x => x[0]))].filter(e => ENT[e]);
      h += `<div class="lb" ${L !== cur ? `id="L-${L}" ` : ''}data-t="${esc((g.ph + ' ' + ents.map(e => ENT[e].n).join(' ')).toLowerCase())}">
        <div><mark>${esc(g.ph)}</mark> → <span class="ans">${ents.map(e => `<a href="${S1.entHref(e)}"><b>${esc(ENT[e].n)}</b></a>`).join(' · ')}</span></div>
        <ul class="sl2" style="margin-top:5px">${g.items.slice(0, 3).map(([e, s]) => `<li>${S1.markText(D.S[s], D.M[s])}${chipQ(s)}</li>`).join('')}</ul>
        ${g.items.length > 3 ? `<div class="note">+${g.items.length - 3} more sentences</div>` : ''}</div>`;
      cur = L;
    });
    $('#view').innerHTML = h + '</div></div>';
    const cnt = n => S1.setCount(`<b>${n.toLocaleString()}</b> phrases`);
    cnt(keys.length);
    $('#q').oninput = ev => cnt(filt('.lb', ev.target.value));
    $('#lj').onchange = ev => { const el = document.getElementById('L-' + ev.target.value); if (el) el.scrollIntoView({ block: 'start' }); ev.target.value = ''; };
    $('#hideA').onclick = ev => { const on = ev.currentTarget.classList.toggle('on'); $$('.lb .ans').forEach(a => a.classList.toggle('blur', on)); };
  }

  async function star() {
    const M = S1.META();
    S1.setTitle('Master <em>⭐ sheet</em>');
    S1.setCtl(`<select class="sel" id="ss">${M.sys.map(s => `<option value="${s.code}">${esc(s.name)}</option>`).join('')}</select>` + S1.SEARCH('Filter…  ( / )'));
    const show = async code => {
      $('#ss').value = code;
      $('#view').innerHTML = '<p class="noresults">Loading…</p>';
      const D = await S1.load('sys-' + code);
      let h = '<div class="pad"><p class="lead">Only the ⭐ essential and boards-say sentences, entity by entity — verbatim, nothing else.</p>';
      D.bands.forEach(([k, label, ids]) => {
        const rs = ids.map(id => [id, D.E[id]]).filter(([, e]) => (e.ess && e.ess.length) || (e.bz && e.bz.length));
        if (!rs.length) return;
        h += `<h2 class="sec">${esc(label)}</h2><div class="lcols">`;
        rs.forEach(([id, e]) => {
          const t = [e.n, ...(e.ess || []).map(g => D.S[g[0]]), ...(e.bz || []).map(g => D.S[g[0]])].join(' ').toLowerCase();
          h += `<div class="lb" data-t="${esc(t)}"><h4><a href="${S1.entHref(id)}">${esc(e.n)}</a> ${e.st === 'D' ? '<span class="st D">⚠ DISTRACTOR-ONLY</span>' : ''}</h4>
            <ul class="sl2">${(e.ess || []).map(g => `<li>${S1.markText(D.S[g[0]], D.M[g[0]])}${grpChips(g)}</li>`).join('')}
            ${(e.bz || []).map(g => `<li style="color:var(--exam-ink)">“${S1.markText(D.S[g[0]], D.M[g[0]])}”${grpChips(g)}</li>`).join('')}</ul></div>`;
        });
        h += '</div>';
      });
      $('#view').innerHTML = h + '</div>';
      S1.setCount(`<b>${$$('.lb').length}</b> entities`);
      history.replaceState(null, '', '#' + code);
      $('#q').value = '';
    };
    $('#ss').onchange = ev => show(ev.target.value);
    $('#q').oninput = ev => S1.setCount(`<b>${filt('.lb', ev.target.value)}</b> entities`);
    const h0 = location.hash.slice(1).toUpperCase();
    show(M.sys.some(s => s.code === h0) ? h0 : M.sys[0].code);
  }

  async function gaps() {
    const D = await S1.load('gaps'), M = S1.META();
    const total = Object.values(D.G).reduce((a, l) => a + l.length, 0);
    S1.setTitle('Only ever <em>“not this”</em>', `<b>${total.toLocaleString()}</b> entities`);
    const sys = M.sys.filter(s => D.G[s.code] && D.G[s.code].length);
    S1.setCtl(S1.SEARCH('Search…  ( / )') + `<select class="sel" id="gj"><option value="">Jump to system…</option>${sys.map(s => `<option value="${s.code}">${esc(s.name)} (${D.G[s.code].length})</option>`).join('')}</select>`);
    let h = `<div class="pad"><p class="lead">These appeared only as wrong answers — the bank taught you to rule them out but never to recognize them. Each card shows every reason it was wrong (verbatim) and what the explanations say about it. Learn these from another source.</p>`;
    sys.forEach(s => {
      h += `<h2 class="sec" id="G-${s.code}">${esc(s.name)} · ${D.G[s.code].length}</h2><div class="lcols">`;
      D.G[s.code].forEach(([id, n, nq, dis, ess]) => {
        h += `<div class="lb" data-t="${esc([n, ...dis.map(d => d[2])].join(' ').toLowerCase())}"><h4><a href="${S1.entHref(id)}">${esc(n)}</a> <span class="ty">${nq}Q</span></h4>
          ${dis.map(([q, L, opt, sids]) => `<div style="margin-bottom:6px"><button class="qp d" data-q="${q}" data-s="${sids.map(x => x.split('.')[1]).join(',')}">${q}</button> <span class="note" style="font-style:italic">${L}) ${esc(opt)}</span>
            <ul class="sl2">${sids.map(x => `<li>${S1.markText(D.S[x], D.M[x])}</li>`).join('')}</ul></div>`).join('')}
          ${ess.length ? `<div class="note">Also said about it:</div><ul class="sl2">${ess.map(g => `<li>${S1.markText(D.S[g[0]], D.M[g[0]])}${grpChips(g)}</li>`).join('')}</ul>` : ''}</div>`;
      });
      h += '</div>';
    });
    $('#view').innerHTML = h + '</div>';
    $('#q').oninput = ev => S1.setCount(`<b>${filt('.lb', ev.target.value).toLocaleString()}</b> entities`);
    $('#gj').onchange = ev => { const el = document.getElementById('G-' + ev.target.value); if (el) el.scrollIntoView({ block: 'start' }); ev.target.value = ''; };
  }

  async function report() {
    const D = await S1.load('report');
    S1.setTitle('Build <em>report</em>');
    S1.setCtl('<span class="sp"></span>');
    $('#view').innerHTML = `<div class="pad"><p class="lead">${esc(D.sub || '')}</p><div class="card report" style="padding:18px 22px">${D.html}</div></div>`;
  }

  S1.boot(page, async () => {
    await ({ 'buzz.html': buzz, 'star.html': star, 'gaps.html': gaps, 'report.html': report }[page])();
    if (page !== 'report.html') { document.addEventListener('keydown', key); S1.setHelp([['/', 'search this page']]); }
  });
})();
