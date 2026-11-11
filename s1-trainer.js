/* Image trainer v2: image alone → commit (type or 4 look-alike choices) → reveal verbatim description,
   boards-say line and the AI how-to-spot-it card, side by side with the image. Misses return soon and go
   on the shaky list; a card is mastered after two correct answers on separate, spaced presentations
   (a miss resets the count). Same logic and same saved progress as before. */
'use strict';
(() => {
  const { esc, $, $$ } = S1;
  const SK = 's1r.trainer';
  let D, ENT, cards = {}, queue = [], cur = null, phase = 'ask', tick = 0;
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
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function buildPool() {
    let p = D.I.filter(i => i.r && ENT[i.ent]);
    if (cfg.type) p = p.filter(i => i.t === cfg.type);
    if (cfg.sys) p = p.filter(i => i.sys === cfg.sys);
    if (cfg.mode === 'shaky') p = p.filter(i => (S.c || {})[i.k] && S.c[i.k].sh);
    if (cfg.mode !== 'shaky') p = p.filter(i => !((S.c || {})[i.k] || {}).m);
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
    } else queue = shuffle(p.map(i => i.k));
  }

  function choices(card) {
    const right = card.ent;
    const cand = new Set();
    if (card.lk && ENT[card.lk] && card.lk !== right) cand.add(card.lk);
    (D.lk[right] || []).forEach(x => { if (x !== right && ENT[x]) cand.add(x); });
    shuffle(D.I.filter(i => i.r && i.t === card.t && i.ent !== right && ENT[i.ent]).map(i => i.ent)).forEach(x => cand.add(x));
    shuffle(D.I.filter(i => i.r && i.sys === card.sys && i.ent !== right && ENT[i.ent]).map(i => i.ent)).forEach(x => cand.add(x));
    return shuffle([right, ...[...cand].slice(0, 3)]);
  }

  function next() {
    if (!queue.length) buildPool();
    if (!queue.length) { cur = null; render(); return; }
    cur = cards[queue.shift()]; phase = 'ask'; tick++;
    if (queue.length) S1.img(cards[queue[0]].e);   // warm the next image
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
    S1.setCount(`<b>${m}</b> / ${all.length} mastered`);
    return `<div class="stats"><span><b>${m}</b> mastered</span><span><b>${sh}</b> shaky</span><span><b>${all.length - m}</b> to go</span>
      <span><b>${S.t || 0}</b> attempts · ${S.t ? Math.round(100 * (S.r || 0) / S.t) : 0}% right</span><span><b>${queue.length}</b> left in this queue</span></div>`;
  }

  function controls() {
    const types = {}, syss = {};
    D.I.filter(i => i.r && ENT[i.ent]).forEach(i => { types[i.t] = (types[i.t] || 0) + 1; syss[i.sys] = (syss[i.sys] || 0) + 1; });
    const M = S1.META();
    S1.setCtl(
      `<div class="seg" data-k="mode">${[['all', 'Unmastered', 'Everything you have not mastered yet, shuffled'], ['vs', 'Look-alikes', 'Confusable images back-to-back'], ['shaky', 'Shaky', 'Only the ones you missed']].map(([v, l, t]) => `<button data-v="${v}" title="${t}" class="${cfg.mode === v ? 'on' : ''}">${l}</button>`).join('')}</div>` +
      `<div class="seg" data-k="answer">${[['type', 'Type it', 'Type the diagnosis'], ['mcq', '4 choices', 'Pick from four look-alikes (keys 1–4)']].map(([v, l, t]) => `<button data-v="${v}" title="${t}" class="${cfg.answer === v ? 'on' : ''}">${l}</button>`).join('')}</div>` +
      `<select class="sel" id="ftype"><option value="">All image types</option>${Object.keys(D.types).filter(t => types[t]).map(t => `<option value="${t}" ${cfg.type === t ? 'selected' : ''}>${esc(D.types[t])} (${types[t]})</option>`).join('')}</select>` +
      `<select class="sel" id="fsys"><option value="">All systems</option>${M.sys.filter(s => syss[s.code]).map(s => `<option value="${s.code}" ${cfg.sys === s.code ? 'selected' : ''}>${esc(s.short)} (${syss[s.code]})</option>`).join('')}</select>` +
      `<span class="sp"></span><button class="ib" id="reset" title="Forget all trainer progress">Reset</button>`);
    $$('#ctl .seg[data-k]').forEach(seg => seg.onclick = ev => {
      const b = ev.target.closest('button'); if (!b) return;
      cfg[seg.dataset.k] = b.dataset.v; save();
      $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
      if (seg.dataset.k === 'mode') { buildPool(); next(); } else if (phase === 'ask') render();
    });
    $('#ftype').onchange = ev => { cfg.type = ev.target.value; save(); buildPool(); next(); };
    $('#fsys').onchange = ev => { cfg.sys = ev.target.value; save(); buildPool(); next(); };
    $('#reset').onclick = () => { if (confirm('Reset all trainer progress?')) { S = {}; save(); buildPool(); next(); } };
  }

  function render(ok, guessEnt, overridden) {
    const root = $('#view');
    if (!cur) {
      root.innerHTML = `<div class="tr">${stats()}<p class="noresults">Nothing left in this set — everything here is mastered${cfg.mode === 'shaky' ? ' or nothing is shaky' : ''}. Pick another type / system or another mode.</p></div>`;
      return;
    }
    const e = ENT[cur.ent], seen = S.c && S.c[cur.k] && S.c[cur.k].a;
    let side = '';
    if (phase === 'ask') {
      if (cfg.answer === 'mcq') {
        cur._ch = choices(cur);
        side = `<div class="mcq">${cur._ch.map((x, i) => `<button data-c="${x}"><span class="k">${i + 1}</span>${esc(ENT[x].n)}</button>`).join('')}</div>
          <p class="note">Press <kbd>1</kbd>–<kbd>4</kbd> to answer.</p>`;
      } else {
        side = `<div class="tr-ans"><input id="guess" placeholder="Your diagnosis…" autocomplete="off" spellcheck="false"><button class="btn" id="go">Commit</button><div class="ac hide" id="ac"></div></div>
          <p class="note"><kbd>⏎</kbd> commit · <kbd>Esc</kbd> don’t know · <kbd>↑</kbd><kbd>↓</kbd> pick a suggestion</p>`;
      }
    } else {
      const sh = cur.sh.concat(cur.ft.filter(s => !cur.sh.includes(s)));
      const bz = (D.bz[cur.ent] || []).slice(0, 2);
      side = `<div class="reveal"><div class="verdict ${ok ? 'ok' : 'no'}">${ok ? '✓ ' : '✗ '}${esc(e.n)}</div>` +
        (!ok && guessEnt && ENT[guessEnt] ? `<div class="note">you said <b>${esc(ENT[guessEnt].n)}</b></div>` : (!ok && cur._typed ? `<div class="note">you said <b>${esc(cur._typed)}</b></div>` : '')) +
        `<div style="display:flex;gap:8px;margin:10px 0 2px;flex-wrap:wrap"><button class="btn" id="nx">Next <kbd>⏎</kbd></button>` +
        (!ok && !overridden && cfg.answer === 'type' ? `<button class="btn ghost" id="ovr">I was right <kbd>r</kbd></button>` : '') +
        `<a class="btn ghost" href="${S1.entHref(cur.ent)}">Open row →</a></div>` +
        `<h5>What the explanation says it shows · verbatim</h5>${sh.length ? `<ul class="sl2">${sh.map(s => `<li>${S1.markText(D.S[s], D.M[s])}<button class="q" data-q="${s.split('.')[0]}" data-s="${s.split('.')[1]}">${s.split('.')[0]}</button></li>`).join('')}</ul>` : '<span class="empty">The explanation does not describe this image.</span>'}` +
        (bz.length ? `<h5>Boards say · verbatim</h5><ul class="sl2">${bz.map(s => `<li style="color:var(--exam-ink)">“${S1.markText(D.S[s], D.M[s])}”</li>`).join('')}</ul>` : '') +
        (cur.aid ? `<h5>How to spot it</h5><div class="ai">${cur.aid}</div>` : '');
      const gImg = !ok && guessEnt ? D.I.find(i => i.ent === guessEnt && i.r && i.k !== cur.k) : null;
      if (gImg) side += `<h5>Side by side</h5><div class="contrast"><figure><img data-enc="${cur.e}"><figcaption>${esc(e.n)} (this one)</figcaption></figure><figure><img data-enc="${gImg.e}"><figcaption>${esc(ENT[guessEnt].n)} (what you said)</figcaption></figure></div>`;
      side += '</div>';
    }
    root.innerHTML = `<div class="tr">${stats()}<div class="tr-grid"><div class="tr-stage"><div class="m"><span class="tp ${D.cls[cur.t] || 'other'}">${esc(D.types[cur.t])}</span><span>${seen ? 'seen ' + seen + '×' : 'new'}</span></div>` +
      `<img id="timg" data-enc="${cur.e}" data-lz="1" alt="image"></div><div class="tr-side">${side}</div></div></div>`;
    const k = cur.k, im = $('#timg');
    S1.img(cur.e).then(u => { if (cur && cur.k === k && im.isConnected) im.src = u; });
    S1.lazy(root);
    wire();
    const g = $('#guess'); if (g) g.focus();
  }

  function wire() {
    $$('#view .mcq button').forEach(b => b.onclick = () => grade(b.dataset.c === cur.ent, b.dataset.c));
    const g = $('#guess');
    if (g) {
      const ac = $('#ac'); let sel = -1, items = [];
      const commit = () => {
        const v = g.value.trim();
        cur._typed = v;
        const hit = D.names.find(n => norm(n[1]) === norm(v));
        grade(isRight(cur, v), hit ? hit[0] : null);
      };
      g.oninput = () => {
        const w = norm(g.value); sel = -1;
        if (w.length < 2) { ac.classList.add('hide'); return; }
        items = D.names.filter(n => norm(n[1]).includes(w)).slice(0, 8);
        ac.innerHTML = items.map((n, i) => `<div data-i="${i}">${esc(n[1])}</div>`).join('');
        ac.classList.toggle('hide', !items.length);
      };
      ac.onclick = ev => { const d = ev.target.closest('[data-i]'); if (d) { g.value = items[d.dataset.i][1]; ac.classList.add('hide'); commit(); } };
      g.onkeydown = ev => {
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
          ev.preventDefault(); sel = Math.max(0, Math.min(items.length - 1, sel + (ev.key === 'ArrowDown' ? 1 : -1)));
          $$('div', ac).forEach((d, i) => d.classList.toggle('on', i === sel));
        } else if (ev.key === 'Enter') {
          ev.preventDefault(); ev.stopPropagation();   // don't let this same Enter also trigger "Next"
          if (sel >= 0 && items[sel]) g.value = items[sel][1];
          commit();
        } else if (ev.key === 'Escape') { ev.stopPropagation(); g.value = ''; commit(); }
      };
      $('#go').onclick = commit;
    }
    const nx = $('#nx'); if (nx) nx.onclick = next;
    const ov = $('#ovr'); if (ov) ov.onclick = override;
  }

  document.addEventListener('keydown', ev => {
    if (!D || !cur || ev.metaKey || ev.ctrlKey || ev.altKey || S1.blocked()) return;
    const inInput = S1.typing();
    if (phase === 'reveal' && (ev.key === 'Enter' || ev.key === ' ') && !inInput) { ev.preventDefault(); next(); }
    else if (phase === 'reveal' && ev.key === 'r' && !inInput && $('#ovr')) override();
    else if (phase === 'ask' && cfg.answer === 'mcq' && /^[1-4]$/.test(ev.key) && !inInput && cur._ch) { const x = cur._ch[+ev.key - 1]; if (x) grade(x === cur.ent, x); }
  });

  S1.boot('trainer.html', async () => {
    D = await S1.load('images'); ENT = S1.ENT();
    D.I.forEach(i => cards[i.k] = i);
    S1.setTitle('Image <em>trainer</em>');
    S1.setHelp([['⏎', 'commit your answer / next image'], ['Esc', 'don’t know (while typing)'], ['1-4', 'answer in 4-choices mode'], ['r', '“I was right” after a typed miss'], ['Space', 'next image (after the reveal)']]);
    controls();
    buildPool(); next();
  });
})();
