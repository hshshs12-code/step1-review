/* Buzzword index, master ⭐ sheet, distractor-only gaps, build report. */
'use strict';
(() => {
  const page = document.body.dataset.file;
  const { esc, $, $$ } = S1;
  const chipQ = (sid, cls = '') => { const [q, i] = sid.split('.'); return `<button class="q ${cls}" data-q="${q}" data-s="${i}">${q}</button>`; };
  const grpChips = g => { const by = {}; g.forEach(s => { const [q, i] = s.split('.'); (by[q] = by[q] || []).push(i); }); return Object.entries(by).map(([q, is]) => `<button class="q" data-q="${q}" data-s="${is.join(',')}">${q}</button>`).join(''); };
  const filterBlocks = (sel, words) => {
    let n = 0;
    $$(sel).forEach(b => { const ok = words.every(w => b.dataset.t.includes(w)); b.classList.toggle('hide', !ok); if (ok) n++; });
    return n;
  };

  async function buzz() {
    const D = await S1.load('buzz'), ENT = S1.ENT();
    $('#sub').textContent = `${D.B.length.toLocaleString()} highlighted board phrases from the explanations (verbatim), each pointing at the row it belongs to. Use it backwards: read the phrase, name the diagnosis, then check.`;
    const groups = {};
    D.B.forEach(([ph, eid, sid]) => { const k = ph.toLowerCase(); (groups[k] = groups[k] || { ph, items: [] }).items.push([eid, sid]); });
    const keys = Object.keys(groups).sort((a, b) => a.replace(/^[^a-z0-9]+/, '').localeCompare(b.replace(/^[^a-z0-9]+/, '')));
    const letters = [...new Set(keys.map(k => (k.replace(/^[^a-z0-9]+/, '')[0] || '#').toUpperCase()))];
    $('#chips').innerHTML = letters.map(l => `<a class="chip" href="#L-${l}">${l}</a>`).join('') + '<label class="chip"><input type="checkbox" id="hide"> hide answers</label>';
    let h = '', cur = '';
    keys.forEach(k => {
      const g = groups[k], L = (k.replace(/^[^a-z0-9]+/, '')[0] || '#').toUpperCase();
      if (L !== cur) { cur = L; h += `<h2 class="band" id="L-${L}">${L}</h2>`; }
      const ents = [...new Set(g.items.map(x => x[0]))];
      h += `<div class="card bzb" style="margin-bottom:8px" data-t="${esc((g.ph + ' ' + ents.map(e => ENT[e] ? ENT[e].n : '').join(' ')).toLowerCase())}">
        <div style="font-size:15px"><mark>${esc(g.ph)}</mark> → <span class="ans">${ents.map(e => ENT[e] ? `<a href="${S1.entHref(e)}"><b>${esc(ENT[e].n)}</b></a>` : '').join(' · ')}</span></div>
        <ul class="sl" style="margin-top:6px">${g.items.slice(0, 4).map(([e, s]) => `<li>${S1.markText(D.S[s], D.M[s])}${chipQ(s)}</li>`).join('')}</ul>
        ${g.items.length > 4 ? `<div class="st">+${g.items.length - 4} more sentences</div>` : ''}</div>`;
    });
    $('#main').innerHTML = h;
    $('#q').oninput = ev => { const n = filterBlocks('.bzb', ev.target.value.toLowerCase().split(/\s+/).filter(Boolean)); $('#count').innerHTML = `<b>${n}</b> phrases`; };
    $('#count').innerHTML = `<b>${keys.length}</b> phrases`;
    $('#hide').onchange = ev => $$('.bzb .ans').forEach(a => a.style.filter = ev.target.checked ? 'blur(6px)' : '');
  }

  async function star() {
    const M = S1.META();
    $('#sub').textContent = 'Only the ⭐ essential and boards-say sentences, entity by entity — verbatim, nothing else. Pick a system.';
    $('#chips').innerHTML = M.sys.map(s => `<span class="chip" data-sys="${s.code}">${esc(s.short)}</span>`).join('');
    const show = async code => {
      $$('#chips .chip').forEach(c => c.classList.toggle('on', c.dataset.sys === code));
      $('#main').innerHTML = '<p class="noresults">Loading…</p>';
      const D = await S1.load('sys-' + code);
      let h = '';
      D.bands.forEach(([k, label, ids]) => {
        const rows = ids.map(id => [id, D.E[id]]).filter(([, e]) => (e.ess && e.ess.length) || (e.bz && e.bz.length));
        if (!rows.length) return;
        h += `<h2 class="band">${esc(label)}</h2>`;
        rows.forEach(([id, e]) => {
          const t = [e.n, ...(e.ess || []).map(g => D.S[g[0]]), ...(e.bz || []).map(g => D.S[g[0]])].join(' ').toLowerCase();
          h += `<div class="card sb" style="margin-bottom:8px" data-t="${esc(t)}"><h3 style="font-size:16px"><a href="${S1.entHref(id)}" style="color:inherit">${esc(e.n)}</a>
            ${e.st === 'D' ? '<span class="badge dis">⚠ DISTRACTOR-ONLY</span>' : ''}</h3>
            <ul class="sl">${(e.ess || []).map(g => `<li>${S1.markText(D.S[g[0]], D.M[g[0]])}${grpChips(g)}</li>`).join('')}
            ${(e.bz || []).filter(g => true).map(g => `<li style="color:var(--exam-ink)">“${S1.markText(D.S[g[0]], D.M[g[0]])}”${grpChips(g)}</li>`).join('')}</ul></div>`;
        });
      });
      $('#main').innerHTML = h || '<p class="noresults">Nothing here yet.</p>';
      $('#count').innerHTML = `<b>${$$('.sb').length}</b> entities`;
      history.replaceState(null, '', '#' + code);
    };
    $('#chips').onclick = ev => { const c = ev.target.closest('[data-sys]'); if (c) show(c.dataset.sys); };
    $('#q').oninput = ev => { const n = filterBlocks('.sb', ev.target.value.toLowerCase().split(/\s+/).filter(Boolean)); $('#count').innerHTML = `<b>${n}</b> entities`; };
    show((location.hash.slice(1) || M.sys[0].code).toUpperCase());
  }

  async function gaps() {
    const D = await S1.load('gaps'), M = S1.META();
    const total = Object.values(D.G).reduce((a, l) => a + l.length, 0);
    $('#sub').textContent = `${total} entities appeared only as wrong answers — the bank taught you to rule them out but never to recognize them. Each card shows every reason it was wrong (verbatim) and what the explanations say about it. Learn these from another source.`;
    $('#chips').innerHTML = M.sys.filter(s => D.G[s.code] && D.G[s.code].length).map(s => `<a class="chip" href="#G-${s.code}">${esc(s.short)}<span class="n">${D.G[s.code].length}</span></a>`).join('');
    let h = '';
    M.sys.forEach(s => {
      const L = D.G[s.code];
      if (!L || !L.length) return;
      h += `<h2 class="band" id="G-${s.code}">${esc(s.name)} · ${L.length}</h2>`;
      L.forEach(([id, n, nq, dis, ess]) => {
        const t = [n, ...dis.map(d => d[2])].join(' ').toLowerCase();
        h += `<div class="card gb" style="margin-bottom:8px" data-t="${esc(t)}"><h3 style="font-size:16px"><a href="${S1.entHref(id)}" style="color:inherit">${esc(n)}</a> <span class="st">${nq}Q</span></h3>
          ${dis.map(([q, Lt, opt, sids]) => `<div class="dq"><button class="q d" data-q="${q}" data-s="${sids.map(x => x.split('.')[1]).join(',')}">${q}</button> <span class="opt">${Lt}) ${esc(opt)}</span>
            <ul class="sl">${sids.map(x => `<li>${S1.markText(D.S[x], D.M[x])}</li>`).join('')}</ul></div>`).join('')}
          ${ess.length ? `<div class="st" style="margin-top:4px">Also said about it:</div><ul class="sl">${ess.map(g => `<li>${S1.markText(D.S[g[0]], D.M[g[0]])}${grpChips(g)}</li>`).join('')}</ul>` : ''}</div>`;
      });
    });
    $('#main').innerHTML = h;
    $('#q').oninput = ev => { const n = filterBlocks('.gb', ev.target.value.toLowerCase().split(/\s+/).filter(Boolean)); $('#count').innerHTML = `<b>${n}</b> entities`; };
    $('#count').innerHTML = `<b>${total}</b> entities`;
  }

  async function report() {
    const D = await S1.load('report');
    $('#sub').textContent = D.sub || '';
    $('#main').innerHTML = `<div class="card report" style="padding:18px 22px">${D.html}</div>`;
    $('.stickytop').classList.add('hide');
  }

  S1.boot(page, { 'buzz.html': buzz, 'star.html': star, 'gaps.html': gaps, 'report.html': report }[page]);
})();
