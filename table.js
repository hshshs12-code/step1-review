/* System page: entity rows, extra fold-outs, versus blocks, filters, search, marks, keyboard. */
'use strict';
(() => {
  const { esc, $, $$ } = S1;
  const SHOW = 6;
  let D, ENT, rows = [], focusIdx = -1;
  const st = { q: '', status: 'all', mk: 'all', band: '', theme: '', img: false };

  const chip = (sid, cls = '') => {
    const [q, i] = sid.split('.');
    return `<button class="q ${cls}" data-q="${q}" data-s="${i}" title="Open Q${q} at this sentence">${q}</button>`;
  };
  const chips = (grp, cls) => {
    // grp: [sid, dupSid...]; collapse same-question dups into one chip
    const byQ = {};
    grp.forEach(s => { const [q, i] = s.split('.'); (byQ[q] = byQ[q] || []).push(i); });
    return Object.entries(byQ).map(([q, is]) => `<button class="q ${cls || ''}" data-q="${q}" data-s="${is.join(',')}" title="Open Q${q}">${q}</button>`).join('');
  };
  const flag = sid => (D.F && D.F[sid]) ? '<span class="flag" title="The AI check flagged a possible error in this source sentence — open the question for the note">⚑</span>' : '';
  const sent = grp => `<li>${S1.markText(D.S[grp[0]], D.M[grp[0]])}${grp.some(x => D.F && D.F[x]) ? flag(grp.find(x => D.F[x])) : ''}${chips(grp)}</li>`;
  function list(groups, n = SHOW) {
    if (!groups || !groups.length) return '';
    const a = groups.slice(0, n).map(sent).join('');
    const b = groups.slice(n).map(sent).join('');
    return `<ul class="sl">${a}</ul>` +
      (b ? `<ul class="sl hide more-items">${b}</ul><button class="more" data-more>+${groups.length - n} more</button>` : '');
  }
  const entLink = (id, extra = '') => {
    const e = ENT[id];
    return e ? `<a href="${S1.entHref(id)}" data-jump="${id}">${esc(e.n)}${extra}</a>` : '';
  };

  function rowHTML(id, e) {
    const mk = S1.marks()[id] || '';
    const freq = Math.min(60, 6 + e.nq * 6);
    const thumbs = (e.img || []).slice(0, 8).map(k => {
      const im = D.I[k];
      return `<img data-enc="${im[0]}" alt="" data-cap="${esc(e.n)} · Q${im[1]}${im[3] ? ' · ' + esc(D.S[im[3]] || '') : ''}" title="Q${im[1]}">`;
    }).join('');
    const al = (e.al || []).filter(a => a.toLowerCase() !== e.n.toLowerCase());
    const ans = (e.ans || []).map(([q, r]) => `<button class="q" data-q="${q}" title="${r === 'v' ? 'vignette diagnosis' : 'correct answer'}">${q}${r === 'v' ? '·dx' : ''}</button>`).join('');
    const disChips = (e.dis || []).map(([q, L, t, sids]) =>
      `<button class="q d" data-q="${q}" data-s="${sids.map(s => s.split('.')[1]).join(',')}" title="${L}) ${esc(t)}">${q}</button>`).join('');
    const dis = (e.dis || []).map(([q, L, t, sids]) => `<div class="dq">${`<button class="q d" data-q="${q}" data-s="${sids.map(s => s.split('.')[1]).join(',')}">${q}</button>`}` +
      ` <span class="opt">${L}) ${esc(t)}</span>` + (sids.length ? `<ul class="sl">${sids.map(s => `<li>${S1.markText(D.S[s], D.M[s])}${flag(s)}</li>`).join('')}</ul>` : '') + '</div>').join('');
    const cw = (e.cw || []).map(([c, n]) => ENT[c] ? `<a href="${S1.entHref(c)}" data-jump="${c}">${esc(ENT[c].n)}<span>×${n}</span></a>` : '').join('');
    const nx = (e.ext || []).length + (e.ne || []).length;
    const ai = e.aid ? `<div class="ai">${e.aid}</div>` : '';
    return `<tr class="row${e.st === 'D' ? ' dist' : e.st === 'M' ? ' men' : ''}" id="${id}" data-id="${id}">
      <td class="name"><span class="nm">${esc(e.n)}</span>
        <div class="meta">${e.st === 'D' ? '<span class="badge dis">⚠ DISTRACTOR-ONLY</span>' : e.st === 'M' ? '<span class="badge men" title="never an answer choice; taught inside explanations">📎 MENTIONED ONLY</span>' : '<span class="badge ans">✅ TESTED AS ANSWER</span>'}
          <span class="pill t">${esc(e.t)}</span><span class="freq" title="${e.nq} question${e.nq > 1 ? 's' : ''}"><i style="width:${freq}px"></i>${e.nq}Q</span>
          ${(e.th || []).map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>
        ${al.length ? `<span class="alias"><b>as:</b> ${al.map(esc).join(' · ')}</span>` : ''}
        ${thumbs ? `<div class="thumbs">${thumbs}</div>` : ''}
        ${(e.sk || []).length ? `<div class="sk"><span class="skl">Sketchy</span><div class="thumbs">${e.sk.slice(0, 6).map(([enc, t, k]) =>
          `<img data-enc="${enc}" alt="" data-cap="Sketchy ${esc(k)} · ${esc(t)}" title="Sketchy ${esc(k)} · ${esc(t)}">`).join('')}${e.sk.length > 6 ? `<span class="skmore">+${e.sk.length - 6}</span>` : ''}</div></div>` : ''}
        <div class="marks"><button class="k${mk === 'k' ? ' on' : ''}" data-mk="k">know</button><button class="s${mk === 's' ? ' on' : ''}" data-mk="s">shaky</button>
          ${nx ? `<button class="xbtn" data-x>extra ${nx}</button>` : ''}</div></td>
      <td class="ess${e.ess && e.ess.length ? '' : ' isempty'}" data-h="⭐ Essential">${list(e.ess) || '<span class="empty">—</span>'}</td>
      <td class="bz${e.bz && e.bz.length ? '' : ' isempty'}" data-h="Boards say">${list(e.bz, 4)}</td>
      <td class="ai-c${ai ? '' : ' isempty'}" data-h="🧠 Learning aid">${ai}</td>
      <td class="ans${ans ? '' : ' isempty'}" data-h="Tested as answer">${ans || '<span class="empty">never</span>'}</td>
      <td class="dis${dis ? '' : ' isempty'}" data-h="Distractor in">${dis ? `<div class="dis-chips">${disChips}<button class="whybtn" data-why>why ▸</button></div><div class="dis-full">${dis}<button class="whybtn" data-why>hide ▴</button></div>` : ''}</td>
      <td class="cw${cw ? '' : ' isempty'}" data-h="Confused with">${cw}</td></tr>`;
  }
  function extraHTML(id, e) {
    const byQ = {};
    (e.ext || []).forEach(g => { const q = g[0].split('.')[0]; (byQ[q] = byQ[q] || []).push(g); });
    let h = '';
    if (Object.keys(byQ).length) {
      h += '<h5>Extra — everything else the explanations say (verbatim, by question)</h5><div class="xq">';
      Object.entries(byQ).forEach(([q, gs]) => {
        h += `<div><button class="q" data-q="${q}">Q${q}</button><ul class="sl">${gs.map(g => `<li>${S1.markText(D.S[g[0]], D.M[g[0]])}${g.length > 1 ? chips(g.slice(1)) : ''}</li>`).join('')}</ul></div>`;
      });
      h += '</div>';
    }
    if (e.ne && e.ne.length) {
      h += '<h5>Other answer choices filed here (not entities)</h5>';
      e.ne.forEach(([q, L, t, sids, isKey]) => {
        h += `<div class="ne dq"><button class="q${isKey ? '' : ' d'}" data-q="${q}" data-s="${sids.map(s => s.split('.')[1]).join(',')}">${q}</button> ` +
          `<span class="opt">${L}) ${esc(t)}${isKey ? ' — correct answer' : ''}</span>` +
          (sids.length ? `<ul class="sl">${sids.map(s => `<li>${S1.markText(D.S[s], D.M[s])}</li>`).join('')}</ul>` : '') + '</div>';
      });
    }
    return `<tr class="xrow hide" data-for="${id}"><td colspan="7">${h}</td></tr>`;
  }
  function vsHTML(cl) {
    const ids = cl.e.filter(i => ENT[i]);
    const cols = `110px repeat(${ids.length},1fr)`;
    let g = `<div class="vsgrid" style="grid-template-columns:${cols}"><div class="h"></div>` +
      ids.map(i => `<div class="h">${entLink(i)}</div>`).join('');
    cl.rows.forEach(([q, key, by]) => {
      g += `<div class="qcell"><button class="q" data-q="${q}">Q${q}</button></div>`;
      ids.forEach(i => {
        const ss = by[i] || [];
        g += `<div>${i === key ? '<span class="won">✓ answer</span> ' : (ss.length ? '<span class="lost">✗ not this</span> ' : '')}` +
          (ss.length ? `<ul class="sl">${ss.map(s => `<li>${S1.markText(D.S[s], D.M[s])}</li>`).join('')}</ul>` : '') + '</div>';
      });
    });
    g += '</div>';
    return `<div class="vsblock"><div class="vshead">${ids.map((i, k) => (k ? '<span class="vx">VS</span>' : '') + `<span class="vn">${esc(ENT[i].n)}</span>`).join('')}` +
      `<span class="cnt">tested against each other ${cl.n}×</span></div>${cl.aid ? `<div class="ai">${cl.aid}</div>` : ''}${g}</div>`;
  }

  function build() {
    const tb = $('#tb');
    let h = '';
    D.bands.forEach(([key, label, ids]) => {
      const cls = (D.CL || []).filter(c => c.b === key);
      h += `<tr class="sec" data-band="${key}"><td colspan="7"><span class="sec-label">${esc(label)}</span><span class="sec-n">${ids.length}</span>` +
        (cls.length ? `<button class="xbtn" data-vs="${key}">look-alikes ${cls.length}</button>` : '') + '</td></tr>';
      if (D.BA && D.BA[key]) h += `<tr class="barow" data-baband="${key}"><td colspan="7"><div class="ai">${D.BA[key]}</div></td></tr>`;
      if (cls.length) h += `<tr class="vsrow hide" data-vsband="${key}"><td colspan="7">${cls.map(vsHTML).join('')}</td></tr>`;
      ids.forEach(id => { h += rowHTML(id, D.E[id]) + extraHTML(id, D.E[id]); });
    });
    tb.innerHTML = h;
    rows = $$('tr.row', tb).map(tr => {
      const id = tr.dataset.id, e = D.E[id];
      const txt = [e.n, ...(e.al || []), ...(e.ess || []).map(g => D.S[g[0]]), ...(e.bz || []).map(g => D.S[g[0]]),
        e.aid || '', ...(e.dis || []).flatMap(d => [d[2], ...d[3].map(s => D.S[s])])].join(' \u0001 ').toLowerCase();
      return { tr, id, e, txt, band: tr.previousElementSibling ? null : null, x: tb.querySelector(`tr.xrow[data-for="${id}"]`) };
    });
    let band = '';
    $$('tr', tb).forEach(tr => { if (tr.dataset.band) band = tr.dataset.band; if (tr.classList.contains('row')) rows.find(r => r.tr === tr).band = band; });
  }

  function apply() {
    const words = st.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const M = S1.marks();
    let n = 0, nd = 0;
    const bandCount = {};
    rows.forEach(r => {
      const e = r.e;
      let ok = words.every(w => r.txt.includes(w));
      if (ok && st.status !== 'all') ok = e.st === st.status;
      if (ok && st.mk !== 'all') ok = st.mk === 'none' ? !M[r.id] : M[r.id] === st.mk;
      if (ok && st.band) ok = r.band === st.band;
      if (ok && st.theme) ok = (e.th || []).includes(st.theme);
      if (ok && st.img) ok = (e.img || []).length > 0;
      r.tr.classList.toggle('hide', !ok);
      if (!ok && r.x) r.x.classList.add('hide');
      if (ok) { n++; if (e.st === 'D') nd++; bandCount[r.band] = (bandCount[r.band] || 0) + 1; }
    });
    $$('#tb tr.sec').forEach(tr => {
      const c = bandCount[tr.dataset.band] || 0;
      tr.classList.toggle('hide', !c);
      tr.querySelector('.sec-n').textContent = c;
    });
    const filtering = words.length || st.status !== 'all' || st.mk !== 'all' || st.theme || st.img;
    $$('#tb tr.vsrow').forEach(tr => { if (filtering) tr.classList.add('hide'); });
    $$('#tb tr.barow').forEach(tr => tr.classList.toggle('hide', !bandCount[tr.dataset.baband]));
    $('#count').innerHTML = `<b>${n}</b> of ${rows.length} rows · ${nd} distractor-only`;
    $('#nores').classList.toggle('hide', n > 0);
    progress();
  }
  function progress() {
    const M = S1.marks();
    const k = rows.filter(r => M[r.id] === 'k').length, s = rows.filter(r => M[r.id] === 's').length;
    $('#ring').innerHTML = S1.ring(rows.length ? k / rows.length : 0) + `${k} know · ${s} shaky · ${rows.length - k - s} unmarked`;
  }
  function setMark(r, v) {
    const cur = S1.marks()[r.id];
    const nv = cur === v ? '' : v;
    S1.mark(r.id, nv);
    $$('.marks button[data-mk]', r.tr).forEach(b => b.classList.toggle('on', b.dataset.mk === nv));
    progress();
  }
  function focusRow(i) {
    const vis = rows.filter(r => !r.tr.classList.contains('hide'));
    if (!vis.length) return;
    i = Math.max(0, Math.min(vis.length - 1, i));
    rows.forEach(r => r.tr.classList.remove('focus'));
    const r = vis[i]; r.tr.classList.add('focus');
    focusIdx = i;
    const top = r.tr.getBoundingClientRect().top - parseInt(getComputedStyle(document.documentElement).getPropertyValue('--thead-top')) - 40;
    window.scrollBy({ top, behavior: 'smooth' });
  }
  const focused = () => rows.find(r => r.tr.classList.contains('focus'));

  function controls() {
    const themes = {};
    Object.values(D.E).forEach(e => (e.th || []).forEach(t => themes[t] = (themes[t] || 0) + 1));
    const manyBands = D.bands.length > 24;
    $('#chips').innerHTML = (manyBands
      ? `<select id="bandsel" class="chip" style="padding:5px 8px"><option value="">All ${D.bands.length} groups</option>` +
        D.bands.map(([k, l, ids]) => `<option value="${k}">${esc(l)} (${ids.length})</option>`).join('') + '</select>'
      : `<span class="chip on" data-band="">All</span>` +
        D.bands.map(([k, l, ids]) => `<span class="chip" data-band="${k}">${esc(l)}<span class="n">${ids.length}</span></span>`).join('')) +
      Object.entries(themes).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<span class="chip theme" data-theme="${esc(t)}">${esc(t)}<span class="n">${n}</span></span>`).join('');
    $('#chips').onclick = ev => {
      const c = ev.target.closest('.chip'); if (!c) return;
      if (c.dataset.theme !== undefined) { st.theme = st.theme === c.dataset.theme ? '' : c.dataset.theme; }
      else { st.band = c.dataset.band; }
      $$('#chips .chip').forEach(x => x.classList.toggle('on', x.dataset.theme !== undefined ? x.dataset.theme === st.theme : x.dataset.band === st.band));
      apply();
    };
    const bs = $('#bandsel');
    if (bs) bs.onchange = () => { st.band = bs.value; apply(); if (bs.value) { const sec = $(`#tb tr.sec[data-band="${bs.value}"]`); if (sec) sec.scrollIntoView({ block: 'start' }); } };
    $('#q').oninput = ev => { st.q = ev.target.value; apply(); };
    $$('.seg[data-k]').forEach(seg => seg.onclick = ev => {
      const b = ev.target.closest('button'); if (!b) return;
      st[seg.dataset.k] = b.dataset.v;
      $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
      apply();
    });
    $('#imgonly').onchange = ev => { st.img = ev.target.checked; apply(); };
    const wa = $('#whyall');
    if (wa) {
      let on = false; try { on = localStorage.getItem('s1r.why') === '1'; } catch (e) { }
      wa.checked = on; document.body.classList.toggle('why-on', on);
      wa.onchange = () => { document.body.classList.toggle('why-on', wa.checked); try { localStorage.setItem('s1r.why', wa.checked ? '1' : '0'); } catch (e) { } };
    }
    $('#tb').addEventListener('click', ev => {
      const t = ev.target;
      const wb = t.closest('[data-why]');
      if (wb) { wb.closest('tr').classList.toggle('why-open'); return; }
      const skm = t.closest('.skmore');
      if (skm) {
        const r = rows.find(r => r.tr === skm.closest('tr')), box = skm.parentNode;
        box.innerHTML = r.e.sk.map(([enc, tt, k]) => `<img data-enc="${enc}" alt="" data-cap="Sketchy ${esc(k)} · ${esc(tt)}" title="${esc(tt)}">`).join('');
        S1.lazy(box); return;
      }
      const m = t.closest('[data-more]');
      if (m) { m.previousElementSibling.classList.remove('hide'); m.remove(); return; }
      const mk = t.closest('[data-mk]');
      if (mk) { setMark(rows.find(r => r.tr === mk.closest('tr')), mk.dataset.mk); return; }
      const x = t.closest('[data-x]');
      if (x) { const r = rows.find(r => r.tr === x.closest('tr')); r.x.classList.toggle('hide'); x.classList.toggle('on'); S1.lazy(r.x); return; }
      const vs = t.closest('[data-vs]');
      if (vs) { $(`tr.vsrow[data-vsband="${vs.dataset.vs}"]`).classList.toggle('hide'); vs.classList.toggle('on'); return; }
      const j = t.closest('[data-jump]');
      if (j && D.E[j.dataset.jump]) { ev.preventDefault(); jump(j.dataset.jump); }
    });
    document.addEventListener('keydown', ev => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { if (ev.key === 'Escape') document.activeElement.blur(); return; }
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const r = focused();
      if (ev.key === '/') { ev.preventDefault(); $('#q').focus(); }
      else if (ev.key === 'j') focusRow(focusIdx + 1);
      else if (ev.key === 'k') focusRow(focusIdx - 1);
      else if (r && ev.key === '1') setMark(r, 'k');
      else if (r && ev.key === '2') setMark(r, 's');
      else if (r && ev.key === '0') { S1.mark(r.id, ''); $$('.marks button[data-mk]', r.tr).forEach(b => b.classList.remove('on')); progress(); }
      else if (r && ev.key === 'e' && r.x) { r.x.classList.toggle('hide'); S1.lazy(r.x); }
      else if (r && ev.key === 'w') r.tr.classList.toggle('why-open');
    });
  }
  function jump(id) {
    const r = rows.find(x => x.id === id);
    if (!r) return;
    if (r.tr.classList.contains('hide')) { st.q = ''; $('#q').value = ''; st.band = ''; st.theme = ''; st.status = 'all'; st.mk = 'all'; st.img = false; apply(); }
    history.replaceState(null, '', '#' + id);
    const vis = rows.filter(x => !x.tr.classList.contains('hide'));
    focusRow(vis.indexOf(r));
  }

  S1.boot(document.body.dataset.file, async () => {
    const code = document.body.dataset.sys;
    D = await S1.load(document.body.dataset.bundle || ('sys-' + code));
    ENT = S1.ENT();
    document.title = D.name + ' · Step 1 Rapid Review';
    $('#title').innerHTML = esc(D.name);
    $('#sub').textContent = `${Object.keys(D.E).length} rows from your bank. Verbatim explanation text in ink; the violet AI cards are mine. Click any question number to open the full question at that sentence.`;
    build();
    controls();
    apply();
    window.addEventListener('hashchange', () => jump(location.hash.slice(1)));
    if (location.hash && D.E[location.hash.slice(1)]) setTimeout(() => jump(location.hash.slice(1)), 60);
  });
})();
