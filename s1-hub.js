/* Hub v2: search-first dashboard with progress, continue card, collections, systems, tools, shaky list. */
'use strict';
S1.boot('index.html', async () => {
  const { esc, $ } = S1;
  const M = S1.META(), ENT = S1.ENT(), marks = S1.marks();
  S1.setTitle('Step 1 <em>Rapid Review</em>', `${M.nq.toLocaleString()} questions · ${M.ents.length.toLocaleString()} rows`);
  S1.setCtl('<span class="sp"></span>');
  const bySys = {};
  M.ents.forEach(e => { (bySys[e[2]] = bySys[e[2]] || []).push(e); });
  const known = Object.entries(marks).filter(([id, v]) => v === 'k' && ENT[id]).length;
  const shaky = Object.entries(marks).filter(([id, v]) => v === 's' && ENT[id]).map(([id]) => ENT[id]);
  const nD = M.ents.filter(e => e[4] === 'D').length;
  const card = s => {
    const es = bySys[s.code] || [];
    const k = es.filter(e => marks[e[0]] === 'k').length, sh = es.filter(e => marks[e[0]] === 's').length;
    const w = n => (es.length ? (100 * n / es.length).toFixed(1) : 0) + '%';
    return `<a class="card" href="${S1.sysFile(s.code)}"><h3>${esc(s.name)}</h3>
      <div class="s">${s.n} rows · ✅ ${s.A} · ⚠ ${s.D}${s.img ? ' · 🖼 ' + s.img : ''}${s.cl ? ' · ' + s.cl + ' look-alike sets' : ''}</div>
      <div class="pbar" title="${k} known · ${sh} shaky"><i style="width:${w(k)};background:var(--ok)"></i><i style="width:${w(sh)};background:var(--warn)"></i></div></a>`;
  };
  const names = { 'pharm.html': '💊 Pharmacology', 'micro.html': '🦠 Microbiology', 'embryo.html': '🧬 Embryology', 'onco.html': '🎗 Oncology',
    'images.html': 'Images', 'trainer.html': 'Image trainer', 'buzz.html': 'Buzzwords', 'star.html': '⭐ Sheet', 'gaps.html': 'Distractor-only', 'report.html': 'Report' };
  M.sys.forEach(s => names[S1.sysFile(s.code)] = s.name);
  const last = S1.pref('lastPage', ''), lastRow = last ? S1.pref('row:' + last, '') : '';
  const cont = last && names[last] ? `<a class="card" href="${last}${lastRow && ENT[lastRow] ? '#' + lastRow : ''}" style="border-color:var(--exam-strong)">
    <div class="s">↩ CONTINUE WHERE YOU LEFT OFF</div><h3 style="margin-top:4px">${esc(names[last])}</h3>
    ${lastRow && ENT[lastRow] ? `<div class="s">at ${esc(ENT[lastRow].n)}</div>` : ''}</a>` : '';
  const organ = S1.ORGAN.map(c => M.sys.find(s => s.code === c)).filter(Boolean);
  $('#view').innerHTML = `<div class="pad">
    <div class="hero">
      <div class="bigfind" id="bf">🔍 Search all ${M.ents.length.toLocaleString()} rows — any drug, bug, disease, nerve… <kbd>⌘K</kbd></div>
      <div class="stat"><b>${known.toLocaleString()}</b><span>KNOWN</span></div>
      <div class="stat"><b>${shaky.length}</b><span>SHAKY</span></div>
      <div class="stat"><b>${(M.ents.length - known).toLocaleString()}</b><span>TO GO</span></div>
    </div>
    ${cont ? `<h2 class="sec">Continue</h2><div class="cards">${cont}</div>` : ''}
    <h2 class="sec">Collections — everything of one kind, from every page</h2><div class="cards">
      <a class="card" href="pharm.html"><h3>💊 Pharmacology</h3><div class="s">${M.pharm ? M.pharm.n + ' drugs by class' : ''} · your Sketchy sketches on each drug</div></a>
      <a class="card" href="micro.html"><h3>🦠 Microbiology</h3><div class="s">${M.micro ? M.micro.n + ' bugs & infections in ' + M.micro.groups + ' groups' : ''} · SketchyMicro on each bug</div></a>
      <a class="card" href="embryo.html"><h3>🧬 Embryology</h3><div class="s">${M.embryo ? M.embryo.n + ' rows' : ''} · development, malformations, teratogens</div></a>
      <a class="card" href="onco.html"><h3>🎗 Oncology</h3><div class="s">${M.onco ? M.onco.n + ' rows' : ''} · tumors, markers, oncogenes, chemo</div></a></div>
    <h2 class="sec">Organ systems</h2><div class="cards">${organ.map(card).join('')}</div>
    <h2 class="sec">Cross-cutting</h2><div class="cards">${M.sys.filter(s => !S1.ORGAN.includes(s.code)).map(card).join('')}</div>
    <h2 class="sec">Drill & review tools</h2><div class="cards">
      <a class="card" href="trainer.html"><h3>🎯 Image trainer</h3><div class="s">See the image, commit to a diagnosis, reveal. Misses come back.</div></a>
      <a class="card" href="images.html"><h3>🖼 Images</h3><div class="s">Every recognition image as a gallery, with “how to spot it”.</div></a>
      <a class="card" href="buzz.html"><h3>❝ Buzzword → diagnosis</h3><div class="s">Every highlighted board phrase, pointing at its row.</div></a>
      <a class="card" href="star.html"><h3>⭐ Master sheet</h3><div class="s">Only the essential sentences, system by system.</div></a>
      <a class="card" href="gaps.html"><h3>⚠ Distractor-only</h3><div class="s">${nD.toLocaleString()} things you have only ever seen as “not this”.</div></a>
      <a class="card" href="report.html"><h3>📋 Build report</h3><div class="s">Coverage, merges, zero-omission diff, verbatim audit.</div></a></div>
    ${shaky.length ? `<h2 class="sec">Your shaky rows (${shaky.length})</h2><div class="chips">${shaky.map(e => `<a class="chip" href="${S1.entHref(e.id)}">${esc(e.n)}</a>`).join('')}</div>` : ''}
    <p class="note" style="margin-top:26px">Tip: press <kbd>⌘K</kbd> (or <kbd>Ctrl</kbd>+<kbd>K</kbd>) anywhere to jump to any row. Press <kbd>?</kbd> on a page for its keys.</p>
  </div>`;
  $('#bf').onclick = () => S1.palOpen();
});
