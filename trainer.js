/* Image trainer: image alone → commit (type or 4 look-alike choices) → reveal verbatim description,
   boards-say line and the AI how-to-spot-it card. Misses return soon and go on the shaky list; a card
   is mastered after two correct answers on separate, spaced presentations (a miss resets the count). */
'use strict';
(() => {
  const { esc, $, $$ } = S1;
  const SK = 's1r.trainer';
  let D, ENT, cards = {}, pool = [], queue = [], cur = null, phase = 'ask', tick = 0;
  let S = load();
  const cfg = Object.assign({ mode: 'all', type: '', sys: '', answer: 'type' }, S.cfg || {});

  function load() { try { return JSON.parse(localStorage.getItem(SK) || '{}'); } catch (e) { return {}; } }
  function save() { S.cfg = cfg; try { localStorage.setItem(SK, JSON.stringify(S)); } catch (e) { } }
  const rec = k => (S.c = S.c || {})[k] = (S.c[k] || { a: 0, ok: 0, run: 0, m: 0, sh: 0, last: -9 });
  const norm = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]s\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 3) return 9;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function isRight(card, guess) {
    const g = norm(guess);
    if (!g) return false;
    return (D.acc[card.ent] || [ENT[card.ent].n]).some(a => { const n = norm(a); return n === g || (n.length > 7 && lev(n, g) <= 2); });
  }

  function buildPool() {
    let p = D.I.filter(i => i.r && ENT[i.ent]);
    if (cfg.type) p = p.filter(i => i.t === cfg.type);
    if (cfg.sys) p = p.filter(i => i.sys === cfg.sys);
    if (cfg.mode === 'shaky') p = p.filter(i => (S.c || {})[i.k] && S.c[i.k].sh);
    if (cfg.mode !== 'shaky') p = p.filter(i => !((S.c || {})[i.k] || {}).m);
    pool = p;
    if (cfg.mode === 'vs') {
      // confusables back-to-back: chain each image with images of its look-alike entity
      const byEnt = {}; p.forEach(i => (byEnt[i.ent] = byEnt[i.ent] || []).push(i));
      const used = new Set(); const out = [];
      p.slice().sort((a, b) => (b.lk ? 1 : 0) - (a.lk ? 1 : 0)).forEach(i => {
        if (used.has(i.k)) return;
        const grp = [i, ...(byEnt[i.lk] || []), ...(byEnt[i.ent] || [])].filter(x => !used.has(x.k));
        grp.forEach(x => { used.add(x.k); out.push(x.k); });
      });
      queue = out;
    } else {
      queue = shuffle(p.map(i => i.k));
    }
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function choices(card) {
    const right = card.ent;
    const cand = new Set();
    if (card.lk && ENT[card.lk] && card.lk !== right) cand.add(card.lk);
    (D.lk[right] || []).forEach(x => { if (x !== right && ENT[x]) cand.add(x); });
    const same = shuffle(D.I.filter(i => i.r && i.t === card.t && i.ent !== right && ENT[i.ent]).map(i => i.ent));
    same.forEach(x => cand.add(x));
    const sameSys = shuffle(D.I.filter(i => i.r && i.sys === card.sys && i.ent !== right && ENT[i.ent]).map(i => i.ent));
    sameSys.forEach(x => cand.add(x));
    return shuffle([right, ...[...cand].slice(0, 3)]);
  }

  function next() {
    if (!queue.length) buildPool();
    if (!queue.length) { render(); return; }
    const k = queue.shift();
    cur = cards[k]; phase = 'ask'; tick++;
    render();
  }

  function grade(ok, guessEnt) {
    const r = rec(cur.k);
    r.a++; r.last = tick;
    if (ok) {
      r.ok++; r.run++;
      if (r.run >= 2) { r.m = 1; r.sh = 0; }
      else queue.splice(Math.min(queue.length, 6 + Math.floor(Math.random() * 5)), 0, cur.k);
    } else {
      r.run = 0; r.sh = 1; r.m = 0;
      queue.splice(Math.min(queue.length, 3 + Math.floor(Math.random() * 3)), 0, cur.k);
    }
    S.t = (S.t || 0) + 1; if (ok) S.r = (S.r || 0) + 1;
    save();
    phase = 'reveal';
    render(ok, guessEnt);
  }
  function override() {
    // "I was right": undo the miss
    const r = rec(cur.k);
    r.run = 1; r.ok++; r.sh = 0; S.r = (S.r || 0) + 1;
    const i = queue.indexOf(cur.k); if (i >= 0) queue.splice(i, 1);
    queue.splice(Math.min(queue.length, 7), 0, cur.k);
    save(); render(true, null, true);
  }

  function stats() {
    const all = D.I.filter(i => i.r && ENT[i.ent]);
    const c = S.c || {};
    const m = all.filter(i => (c[i.k] || {}).m).length, sh = all.filter(i => (c[i.k] || {}).sh).length;
    return `<div class="stats"><span><b>${m}</b> mastered</span><span><b>${sh}</b> shaky</span><span><b>${all.length - m}</b> to go</span>
      <span><b>${S.t || 0}</b> attempts · ${S.t ? Math.round(100 * (S.r || 0) / S.t) : 0}% right</span><span>${queue.length} in this queue</span></div>`;
  }

  function controls() {
    const types = {}; D.I.filter(i => i.r).forEach(i => types[i.t] = (types[i.t] || 0) + 1);
    const syss = {}; D.I.filter(i => i.r).forEach(i => syss[i.sys] = (syss[i.sys] || 0) + 1);
    const M = S1.META();
    return `<div class="controls" style="padding:0;margin:0 0 10px">
      <div class="seg" data-k="mode">${[['all', 'All unmastered'], ['vs', 'Confusables back-to-back'], ['shaky', 'Shaky only']].map(([v, l]) => `<button data-v="${v}" class="${cfg.mode === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="seg" data-k="answer">${[['type', 'Type it'], ['mcq', '4 look-alikes']].map(([v, l]) => `<button data-v="${v}" class="${cfg.answer === v ? 'on' : ''}">${l}</button>`).join('')}</div>
      <select id="ftype" class="btn ghost" style="padding:6px 8px"><option value="">All image types</option>${Object.keys(D.types).filter(t => types[t]).map(t => `<option value="${t}" ${cfg.type === t ? 'selected' : ''}>${esc(D.types[t])} (${types[t]})</option>`).join('')}</select>
      <select id="fsys" class="btn ghost" style="padding:6px 8px"><option value="">All systems</option>${M.sys.filter(s => syss[s.code]).map(s => `<option value="${s.code}" ${cfg.sys === s.code ? 'selected' : ''}>${esc(s.short)} (${syss[s.code]})</option>`).join('')}</select>
      <button class="btn ghost" id="reset" style="margin-left:auto">Reset progress</button></div>`;
  }

  function render(ok, guessEnt, overridden) {
    const root = $('#tr');
    if (!cur) {
      root.innerHTML = controls() + stats() + `<p class="noresults">Nothing left in this set — everything here is mastered. Pick another type/system or switch to “Shaky only”.</p>`;
      wire(); return;
    }
    const e = ENT[cur.ent];
    let h = controls() + stats() +
      `<div class="tr-stage"><div class="meta"><span class="tp ${D.cls[cur.t] || 'other'}">${esc(D.types[cur.t])}</span><span>${(S.c && S.c[cur.k] && S.c[cur.k].a) ? 'seen ' + S.c[cur.k].a + '×' : 'new'}</span></div>` +
      `<img id="timg" data-enc="${cur.e}" alt="image"></div>`;
    if (phase === 'ask') {
      if (cfg.answer === 'mcq') {
        cur._ch = choices(cur);
        h += `<div class="mcq">${cur._ch.map((x, i) => `<button data-c="${x}"><span class="k">${i + 1}</span>${esc(ENT[x].n)}</button>`).join('')}</div>`;
      } else {
        h += `<div class="tr-ans"><input id="guess" placeholder="Your diagnosis… (Enter to commit, Esc = don't know)" autocomplete="off"><button id="go">Commit</button><div class="ac hide" id="ac"></div></div>`;
      }
    } else {
      const sh = cur.sh.concat(cur.ft.filter(s => !cur.sh.includes(s)));
      const bz = (D.bz[cur.ent] || []).slice(0, 2);
      h += `<div class="reveal"><div class="verdict ${ok ? 'ok' : 'no'}">${ok ? '✓ ' : '✗ '}${esc(e.n)}</div>` +
        (!ok && guessEnt && ENT[guessEnt] ? `<div class="st">you said <b>${esc(ENT[guessEnt].n)}</b></div>` : (!ok && cur._typed ? `<div class="st">you said <b>${esc(cur._typed)}</b></div>` : '')) +
        `<h5>What the explanation says it shows · verbatim</h5>${sh.length ? `<ul class="sl">${sh.map(s => `<li>${S1.markText(D.S[s], D.M[s])} <button class="q" data-q="${s.split('.')[0]}" data-s="${s.split('.')[1]}">${s.split('.')[0]}</button></li>`).join('')}</ul>` : '<span class="empty">The explanation does not describe this image.</span>'}` +
        (bz.length ? `<h5>Boards say · verbatim</h5><ul class="sl">${bz.map(s => `<li style="color:var(--exam-ink)">“${S1.markText(D.S[s], D.M[s])}”</li>`).join('')}</ul>` : '') +
        (cur.aid ? `<h5>How to spot it</h5><div class="ai">${cur.aid}</div>` : '');
      const gImg = !ok && guessEnt ? D.I.find(i => i.ent === guessEnt && i.r && i.k !== cur.k) : null;
      if (gImg) h += `<h5>Side by side</h5><div class="contrast"><figure><img data-enc="${cur.e}"><figcaption>${esc(e.n)} (this one)</figcaption></figure><figure><img data-enc="${gImg.e}"><figcaption>${esc(ENT[guessEnt].n)} (what you said)</figcaption></figure></div>`;
      h += `<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn" id="nx">Next ⏎</button>` +
        (!ok && !overridden && cfg.answer === 'type' ? `<button class="btn ghost" id="ovr">I was right (r)</button>` : '') +
        `<a class="btn ghost" href="${S1.entHref(cur.ent)}" style="text-decoration:none">Open row →</a></div></div>`;
    }
    root.innerHTML = h;
    S1.lazy(root);
    wire();
    const g = $('#guess'); if (g) g.focus();
  }

  function wire() {
    $$('#tr .seg[data-k]').forEach(seg => seg.onclick = ev => {
      const b = ev.target.closest('button'); if (!b) return;
      cfg[seg.dataset.k] = b.dataset.v; save();
      if (seg.dataset.k === 'mode') { buildPool(); next(); } else render();
    });
    const ft = $('#ftype'), fs = $('#fsys');
    if (ft) ft.onchange = () => { cfg.type = ft.value; save(); buildPool(); next(); };
    if (fs) fs.onchange = () => { cfg.sys = fs.value; save(); buildPool(); next(); };
    const rs = $('#reset'); if (rs) rs.onclick = () => { if (confirm('Reset all trainer progress?')) { S = {}; save(); buildPool(); next(); } };
    $$('#tr .mcq button').forEach(b => b.onclick = () => grade(b.dataset.c === cur.ent, b.dataset.c));
    const g = $('#guess');
    if (g) {
      const ac = $('#ac'); let sel = -1, items = [];
      const names = D.names;
      g.oninput = () => {
        const w = norm(g.value); sel = -1;
        if (w.length < 2) { ac.classList.add('hide'); return; }
        items = names.filter(n => norm(n[1]).includes(w)).slice(0, 8);
        ac.innerHTML = items.map((n, i) => `<div data-i="${i}">${esc(n[1])}</div>`).join('');
        ac.classList.toggle('hide', !items.length);
      };
      ac.onclick = ev => { const d = ev.target.closest('[data-i]'); if (d) { g.value = items[d.dataset.i][1]; ac.classList.add('hide'); commit(); } };
      g.onkeydown = ev => {
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
          ev.preventDefault(); sel = Math.max(0, Math.min(items.length - 1, sel + (ev.key === 'ArrowDown' ? 1 : -1)));
          $$('div', ac).forEach((d, i) => d.classList.toggle('on', i === sel));
        } else if (ev.key === 'Enter') {
          ev.preventDefault();
          if (sel >= 0 && items[sel]) g.value = items[sel][1];
          commit();
        } else if (ev.key === 'Escape') { g.value = ''; commit(); }
      };
      $('#go').onclick = commit;
      function commit() {
        const v = g.value.trim();
        cur._typed = v;
        const hit = D.names.find(n => norm(n[1]) === norm(v));
        grade(isRight(cur, v), hit ? hit[0] : null);
      }
    }
    const nx = $('#nx'); if (nx) nx.onclick = next;
    const ov = $('#ovr'); if (ov) ov.onclick = override;
  }

  document.addEventListener('keydown', ev => {
    if (!D || ev.metaKey || ev.ctrlKey) return;
    const inInput = /INPUT|SELECT/.test(document.activeElement.tagName);
    if (phase === 'reveal' && (ev.key === 'Enter' || ev.key === ' ') && !inInput) { ev.preventDefault(); next(); }
    else if (phase === 'reveal' && ev.key === 'r' && !inInput && $('#ovr')) override();
    else if (phase === 'ask' && cfg.answer === 'mcq' && /^[1-4]$/.test(ev.key) && cur && cur._ch) { const x = cur._ch[+ev.key - 1]; if (x) grade(x === cur.ent, x); }
  });

  S1.boot('trainer.html', async () => {
    D = await S1.load('images'); ENT = S1.ENT();
    D.I.forEach(i => cards[i.k] = i);
    $('#sub').textContent = 'One image at a time. Commit to a diagnosis before you look — then read what the explanation says it shows, the boards line, and the “how to spot it” card. Misses come back within a few cards and land on your shaky list; two spaced correct answers master a card.';
    $('.top').insertAdjacentHTML('afterend', '');
    buildPool(); next();
  });
})();
