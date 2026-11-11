/* Hub: system cards with counts and your progress, global entity search, shaky list. */
'use strict';
S1.boot('index.html', async () => {
  const { esc, $ } = S1;
  const M = S1.META(), ENT = S1.ENT(), marks = S1.marks();
  const tot = M.ents.length;
  const nD = M.ents.filter(e => e[4] === 'D').length;
  $('#sub').innerHTML = `${M.nq.toLocaleString()} questions from your bank → ${tot.toLocaleString()} entity rows across ${M.sys.length} pages. ` +
    `Every sentence in the source columns is copied from an explanation; violet cards are AI. ${nD.toLocaleString()} entities appeared <b>only</b> as wrong answers.`;
  const bySys = {};
  M.ents.forEach(e => { (bySys[e[2]] = bySys[e[2]] || []).push(e); });
  const card = s => {
    const es = bySys[s.code] || [];
    const k = es.filter(e => marks[e[0]] === 'k').length, sh = es.filter(e => marks[e[0]] === 's').length;
    const w = n => (es.length ? (100 * n / es.length).toFixed(1) : 0) + '%';
    return `<a class="card" href="${S1.sysFile(s.code)}"><h3>${esc(s.name)}</h3>
      <div class="st">${s.n} rows · ✅ ${s.A} · ⚠ ${s.D} · 📎 ${s.M}${s.img ? ' · 🖼 ' + s.img : ''}${s.cl ? ' · ' + s.cl + ' look-alike sets' : ''}</div>
      <div class="bar" title="${k} know · ${sh} shaky"><i style="width:${w(k)};background:var(--ok)"></i><i style="width:${w(sh)};background:var(--warn)"></i></div>
      <div class="st" style="margin-top:5px">${k} know · ${sh} shaky</div></a>`;
  };
  const organ = ['CVS', 'PULM', 'RENAL', 'GI', 'ENDO', 'REPRO', 'HEME', 'NEURO', 'EYEENT', 'PSYCH', 'MSK', 'DERM'];
  const sysBy = c => M.sys.find(s => s.code === c);
  const shaky = Object.entries(marks).filter(([id, v]) => v === 's' && ENT[id]).map(([id]) => ENT[id]);
  $('#hub').innerHTML = `
    <h2 class="band">Organ systems</h2><div class="grid">${organ.map(sysBy).filter(Boolean).map(card).join('')}</div>
    <h2 class="band">Cross-cutting homes</h2><div class="grid">${M.sys.filter(s => !organ.includes(s.code)).map(card).join('')}</div>
    <h2 class="band">Drill & review tools</h2><div class="grid">
      <a class="card" href="pharm.html"><h3>💊 Pharmacology</h3><div class="st">Every drug in the bank in one place, grouped by class${M.pharm ? ` — ${M.pharm.n} drugs in ${M.pharm.classes} groups` : ''}; your Sketchy sketches on each drug.</div></a>
      <a class="card" href="micro.html"><h3>🦠 Microbiology</h3><div class="st">Every organism and every infection from all pages, grouped like Sketchy${M.micro ? ` — ${M.micro.n} rows in ${M.micro.groups} groups` : ''}; your SketchyMicro sketches on each bug.</div></a>
      <a class="card" href="embryo.html"><h3>🧬 Embryology</h3><div class="st">Every development, malformation and teratogen row from all pages, by system${M.embryo ? ` — ${M.embryo.n} rows` : ''}.</div></a>
      <a class="card" href="onco.html"><h3>🎗 Oncology</h3><div class="st">Every tumor, hematologic malignancy, paraneoplastic syndrome, oncogene, tumor marker and chemo drug from all pages${M.onco ? ` — ${M.onco.n} rows` : ''}.</div></a>
      <a class="card" href="images.html"><h3>Images table</h3><div class="st">Every recognition image by type → system, verbatim description + AI “how to spot it”.</div></a>
      <a class="card" href="trainer.html"><h3>Image trainer</h3><div class="st">See the image, commit to a diagnosis, then reveal. Misses come back.</div></a>
      <a class="card" href="buzz.html"><h3>Buzzword → diagnosis</h3><div class="st">Every highlighted board phrase, pointing at its row.</div></a>
      <a class="card" href="star.html"><h3>Master ⭐ sheet</h3><div class="st">Only the essential sentences, system by system.</div></a>
      <a class="card" href="gaps.html"><h3>⚠ Distractor-only</h3><div class="st">${nD} things you have only ever seen as “not this”.</div></a>
      <a class="card" href="report.html"><h3>Build report</h3><div class="st">Coverage, merges, the zero-omission diff, verbatim audit.</div></a></div>
    ${shaky.length ? `<h2 class="band">Your shaky rows (${shaky.length})</h2><div class="chips" style="padding:0">${shaky.map(e => `<a class="chip" href="${S1.entHref(e.id)}">${esc(e.n)}</a>`).join('')}</div>` : ''}
    <div id="hits"></div>
    <p class="count" style="margin-top:30px"><a href="#" id="forget">Lock this device</a> (forget the remembered key)</p>`;
  $('#forget').onclick = ev => { ev.preventDefault(); S1.forget(); };
  const all = Object.values(ENT).map(e => [e, e.n.toLowerCase()]);
  $('#q').oninput = ev => {
    const w = ev.target.value.trim().toLowerCase();
    if (w.length < 2) { $('#hits').innerHTML = ''; $('#count').textContent = ''; return; }
    const hits = all.filter(([e, n]) => n.includes(w)).sort((a, b) => (a[1].startsWith(w) ? 0 : 1) - (b[1].startsWith(w) ? 0 : 1) || b[0].nq - a[0].nq).slice(0, 80);
    $('#count').textContent = hits.length + ' matches';
    $('#hits').innerHTML = `<h2 class="band">Matches</h2><div class="grid">${hits.map(([e]) => {
      const s = M.sys.find(x => x.code === e.sys);
      return `<a class="card" href="${S1.entHref(e.id)}"><h3 style="font-size:16px">${esc(e.n)}</h3><div class="st">${s ? esc(s.short) : ''} · ${e.t} · ${e.nq}Q · ${e.st === 'A' ? '✅ answer' : e.st === 'D' ? '⚠ distractor-only' : '📎 mentioned'}</div></a>`;
    }).join('')}</div>`;
    $('#hits').scrollIntoView({ block: 'start' });
  };
});
