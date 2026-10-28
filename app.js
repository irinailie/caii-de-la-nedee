(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s) => document.querySelector(s);

  // ---------- Așezarea în arbore ----------
  // x ca în Miro (unități de arbore, lățime ~1000); y vine din anul nașterii.
  // Al doilea număr = mică ajustare verticală, doar ca să nu se suprapună etichetele.
  const POZ = {
    puiu: [730], ciucurica: [630], ghiuri: [505], catiusa: [800], sasa: [368], murgu: [596], fulger: [704],
    bobi: [245], dochia: [530], paco: [400], saturn: [908], sumi: [310], cezar: [590], breazu: [705],
    lina: [510], vizir: [161], praslea: [819], suru: [729], zorba: [272], jar: [68], han: [463], heidi: [640],
    piciu: [357], misu: [429], bruno: [55]
  };
  // cât de tare se curbează o relație (pozitiv = spre dreapta sensului a→b)
  const CURBURI = { 'murgu|fulger': -0.4, 'bobi|sumi': 0.35, 'paco|saturn': 0.22, 'han|suru': -0.25, 'zorba|saturn': 0.32, 'zorba|praslea': 0.28, 'saturn|suru': 0.12, 'sumi|bruno': -0.3 };
  const LIDER = 'murgu';
  const R = 44;          // raza cercului
  const PX_AN = 62;      // pixeli pe an, din 2004 încoace
  const AN_BAZA = 2004;
  const SUS = 360;
  const W = 1000;

  const LUNI = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
  const an = (s) => +String(s).match(/\d{4}/)[0];
  function anZecimal(s) {
    const t = String(s).toLowerCase();
    const l = LUNI.findIndex((m) => t.includes(m));
    if (l < 0) return an(s) + 0.5;
    const zi = +((t.match(/^(\d{1,2})/) || [0, 15])[1]);
    return an(s) + (l + zi / 31) / 12;
  }
  // anii vechi sunt comprimați (până în 2004 sunt doar trei cai), ca arborele să nu fie gol sus
  const yAn = (a) => {
    if (a >= AN_BAZA) return SUS + (a - AN_BAZA) * PX_AN;
    if (a >= 1995) return SUS - (AN_BAZA - a) * 20;
    return SUS - (AN_BAZA - 1995) * 20 - (1995 - a) * 8;
  };

  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const eticAn = (c) => (c.decedat ? `${an(c.nascut)}–${c.decedat}` : String(an(c.nascut)));

  let CAI = [], BY = {};

  fetch('data/cai.json')
    .then((r) => r.json())
    .then((data) => { pregateste(data); deseneazaArbore(); legende(); cautare(); ruta(); })
    .catch(() => { $('#arbore').innerHTML = '<p style="padding:24px">Nu am putut încărca arborele. Încearcă din nou când ai semnal.</p>'; });

  function pregateste(data) {
    CAI = data.cai;
    CAI.forEach((c) => {
      BY[c.id] = c;
      Object.assign(c, { copii: [], copiiAdoptivi: [], iubire: [], prieteni: [], dusmani: [] });
      const [x, dy = 0] = POZ[c.id] || [500];
      c.x = x;
      c.y = yAn(anZecimal(c.nascut)) + dy;
    });
    CAI.forEach((c) => {
      if (c.mama) BY[c.mama].copii.push(c);
      if (c.tata) BY[c.tata].copii.push(c);
      if (c.tataAdoptiv) BY[c.tataAdoptiv].copiiAdoptivi.push(c);
    });
    // Frați = aceeași mamă sau același tată; verișori = copiii fraților părinților (doar părinți naturali)
    const parinti = (c) => [c.mama, c.tata].filter(Boolean).map((i) => BY[i]);
    CAI.forEach((c) => {
      c.frati = [...new Set(parinti(c).flatMap((p) => p.copii))].filter((x) => x !== c);
    });
    CAI.forEach((c) => {
      const exclus = new Set([c, ...c.frati, ...parinti(c), ...c.copii]);
      c.verisori = [...new Set(parinti(c).flatMap((p) => p.frati).flatMap((u) => u.copii))].filter((x) => !exclus.has(x));
    });
    data.relatii.forEach((r) => {
      const [a, b] = r.intre.map((i) => BY[i]);
      const k = { 'iubire': 'iubire', 'prietenie': 'prieteni', 'dușmănie': 'dusmani' }[r.tip];
      a[k].push(b); b[k].push(a);
    });
    RELATII = data.relatii;
  }
  let RELATII = [];

  // ---------- SVG ----------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const svg = $('#svg-arbore');
  let grup, CONT;

  function deseneazaArbore() {
    const maxY = Math.max(...CAI.map((c) => c.y));
    const minY = Math.min(...CAI.map((c) => c.y));
    CONT = { x0: -70, y0: minY - R - 30, x1: W + 10, y1: maxY + R + 70 };

    const defs = el('defs', {}, svg);
    const clip = el('clipPath', { id: 'cerc', clipPathUnits: 'objectBoundingBox' }, defs);
    el('circle', { cx: .5, cy: .5, r: .5 }, clip);
    const pat = el('pattern', { id: 'brazi', width: 22, height: 26, patternUnits: 'userSpaceOnUse' }, defs);
    el('rect', { width: 22, height: 26, fill: '#213F2F' }, pat);
    el('path', { d: 'M5.5 2 L10 13 L1 13Z M5.5 7 L11 20 L0 20Z', fill: '#305A43' }, pat);
    el('path', { d: 'M16.5 11 L21 22 L12 22Z M16.5 15 L22 27 L11 27Z', fill: '#3C6B50' }, pat);
    for (const [id, cls, d] of [
      ['mama', 'sag-mama', 'M0,0 L10,5 L0,10 L2.5,5Z'], ['tata', 'sag-tata', 'M0,0 L10,5 L0,10 L2.5,5Z'],
      ['adoptiv', 'sag-adoptiv', 'M0,0 L10,5 L0,10 L2.5,5Z'],
      ['galben', 'sag-galben', 'M1,1 L8,5 L1,9'], ['negru', 'sag-negru', 'M1,1 L8,5 L1,9']
    ]) {
      const m = el('marker', { id: 'sag-' + id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 9, markerHeight: 9, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' }, defs);
      el('path', { d, class: cls }, m);
    }

    grup = el('g', {}, svg);

    // linii de ani
    const ani = el('g', {}, grup);
    for (const a of [1985, 1995, 2000, 2005, 2010, 2015, 2020, 2025]) {
      const y = yAn(a);
      if (y > CONT.y1) continue;
      el('line', { x1: CONT.x0 + 44, x2: CONT.x1, y1: y, y2: y, class: 'an-linie' }, ani);
      el('text', { x: CONT.x0, y: y + 4, class: 'an-text' }, ani).textContent = a;
    }

    // părinți → copii
    const muchii = el('g', {}, grup);
    CAI.forEach((c) => {
      for (const [camp, tip] of [['mama', 'mama'], ['tata', 'tata'], ['tataAdoptiv', 'adoptiv']]) {
        if (!c[camp]) continue;
        const p = BY[c[camp]];
        const x1 = p.x, y1 = p.y + R + 3, x2 = c.x, y2 = c.y - R - 7;
        const k = Math.max(40, (y2 - y1) * 0.45);
        el('path', {
          d: `M${x1},${y1} C${x1},${y1 + k} ${x2},${y2 - k} ${x2},${y2}`,
          class: `muchie ${tip}${p.decedat && tip !== 'adoptiv' ? ' stins' : ''}`,
          'marker-end': `url(#sag-${tip})`
        }, muchii);
        if (tip === 'adoptiv') {
          // eticheta mai aproape de copil, ca să nu se adune toate lângă Bobi
          const t = 0.72, u = 1 - t;
          const lx = u ** 3 * x1 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x2;
          const ly = u ** 3 * y1 + 3 * u * u * t * (y1 + k) + 3 * u * t * t * (y2 - k) + t ** 3 * y2;
          eticheta(muchii, lx, ly, 'tată adoptiv', 'adoptiv');
        }
      }
    });

    // relații
    const rel = el('g', {}, grup);
    RELATII.forEach((r) => {
      const [a, b] = r.intre.map((i) => BY[i]);
      const f = CURBURI[r.intre.join('|')] ?? 0.15;
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
      const px = -dy / L, py = dx / L;
      const cx = (a.x + b.x) / 2 + px * L * f, cy = (a.y + b.y) / 2 + py * L * f;
      const capat = (n) => { const vx = cx - n.x, vy = cy - n.y, l = Math.hypot(vx, vy); return [n.x + vx / l * (R + 9), n.y + vy / l * (R + 9)]; };
      const [ax, ay] = capat(a), [bx, by] = capat(b);
      const tip = norm(r.tip);
      const sag = tip === 'dusmanie' ? 'negru' : 'galben';
      el('path', { d: `M${ax},${ay} Q${cx},${cy} ${bx},${by}`, class: `rel ${tip}`, 'marker-start': `url(#sag-${sag})`, 'marker-end': `url(#sag-${sag})` }, rel);
      eticheta(rel, .25 * ax + .5 * cx + .25 * bx, .25 * ay + .5 * cy + .25 * by, r.tip, tip);
    });

    // cai
    const noduri = el('g', {}, grup);
    CAI.forEach((c) => {
      const g = el('g', {
        class: `nod ${c.sex === 'F' ? 'f' : 'm'}${c.decedat ? ' stins' : ''}${c.id === LIDER ? ' lider' : ''}`,
        transform: `translate(${c.x},${c.y})`, 'data-id': c.id, tabindex: 0, role: 'link',
        'aria-label': `${c.nume}, ${eticAn(c)}`
      }, noduri);
      el('circle', { r: R + 7, class: 'halo' }, g);
      if (c.poza) {
        el('image', { href: `img/${c.poza}-mic.jpg`, x: -R, y: -R, width: 2 * R, height: 2 * R, preserveAspectRatio: 'xMidYMid slice', 'clip-path': 'url(#cerc)' }, g);
      } else {
        el('circle', { r: R, fill: 'url(#brazi)' }, g);
      }
      el('circle', { r: R, class: 'inel' }, g);
      el('text', { y: R + 24, class: 'nume' }, g).textContent = c.nume;
      el('text', { y: R + 39, class: 'an' }, g).textContent = eticAn(c);
    });

    panZoom();
  }

  function eticheta(parent, x, y, text, tip) {
    const g = el('g', { class: `eticheta-rel ${tip}` }, parent);
    const w = text.length * 6.6 + 12;
    el('rect', { x: x - w / 2, y: y - 9, width: w, height: 18, rx: 9 }, g);
    el('text', { x, y }, g).textContent = text;
  }

  // ---------- Pan & zoom ----------
  const vp = { s: 1, x: 0, y: 0 };
  let minS = 0.2;
  const aplica = () => grup.setAttribute('transform', `translate(${vp.x},${vp.y}) scale(${vp.s})`);

  function zoomLa(f, cx, cy) {
    const s = Math.min(4, Math.max(minS, vp.s * f));
    f = s / vp.s;
    vp.x = cx - (cx - vp.x) * f;
    vp.y = cy - (cy - vp.y) * f;
    vp.s = s;
    aplica();
  }

  function potriveste() {
    const { width: cw, height: ch } = svg.getBoundingClientRect();
    if (!cw || !ch) return;
    const w = CONT.x1 - CONT.x0, h = CONT.y1 - CONT.y0;
    // pe telefon: toată lățimea; pe ecran mare: întreg, dar nu atât de mic încât să nu se mai vadă caii
    const s = cw < 700 ? cw / w : Math.min(cw / w, Math.max(ch / h, 0.62));
    minS = Math.min(cw / w, ch / h) * 0.8;
    vp.s = s;
    vp.x = (cw - w * s) / 2 - CONT.x0 * s;
    vp.y = (h * s < ch ? (ch - h * s) / 2 : 0) - CONT.y0 * s;
    aplica();
  }

  function panZoom() {
    potriveste();
    let latime = svg.getBoundingClientRect().width;
    window.addEventListener('resize', () => {
      const w = svg.getBoundingClientRect().width;
      if (Math.abs(w - latime) > 60) potriveste();
      latime = w;
    });

    const ptr = new Map();
    let start = null, tinta = null, miscat = false;
    const mij = (p) => ({ x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 });
    const dist = (p) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);

    svg.addEventListener('pointerdown', (e) => {
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptr.size === 1) { tinta = e.target.closest('.nod'); miscat = false; start = { x: e.clientX, y: e.clientY }; }
      else tinta = null;
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener('pointermove', (e) => {
      if (!ptr.has(e.pointerId)) return;
      const vechi = [...ptr.values()];
      const prev = ptr.get(e.pointerId);
      const cur = { x: e.clientX, y: e.clientY };
      ptr.set(e.pointerId, cur);
      if (ptr.size === 1) {
        if (!miscat && Math.hypot(cur.x - start.x, cur.y - start.y) > 7) { miscat = true; svg.classList.add('trage'); }
        if (miscat) { vp.x += cur.x - prev.x; vp.y += cur.y - prev.y; aplica(); }
      } else if (ptr.size === 2) {
        const nou = [...ptr.values()];
        const r = svg.getBoundingClientRect();
        const m0 = mij(vechi), m1 = mij(nou);
        vp.x += m1.x - m0.x; vp.y += m1.y - m0.y;
        zoomLa(dist(nou) / (dist(vechi) || 1), m1.x - r.left, m1.y - r.top);
        miscat = true;
      }
    });
    const gata = (e) => {
      if (!ptr.has(e.pointerId)) return;
      if (e.type === 'pointerup' && ptr.size === 1 && !miscat && tinta) deschide(tinta.dataset.id);
      ptr.delete(e.pointerId);
      if (!ptr.size) svg.classList.remove('trage');
    };
    svg.addEventListener('pointerup', gata);
    svg.addEventListener('pointercancel', gata);

    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      zoomLa(Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0016)), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    svg.addEventListener('keydown', (e) => {
      const n = e.target.closest && e.target.closest('.nod');
      if (n && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); deschide(n.dataset.id); }
    });

    const centru = (f) => { const r = svg.getBoundingClientRect(); zoomLa(f, r.width / 2, r.height / 2); };
    $('#zoom-plus').onclick = () => centru(1.35);
    $('#zoom-minus').onclick = () => centru(1 / 1.35);
    $('#zoom-tot').onclick = potriveste;
  }

  // ---------- Legenda ----------
  function legende() {
    const ic = (inner) => `<svg viewBox="0 0 34 22" aria-hidden="true">${inner}</svg>`;
    const cerc = (cul, dash) => ic(`<circle cx="17" cy="11" r="8" fill="none" stroke="${cul}" stroke-width="3" ${dash ? 'stroke-dasharray="4 3"' : ''}/>`);
    const linie = (cul, dash) => ic(`<path d="M2 11 H32" stroke="${cul}" stroke-width="2.2" ${dash} stroke-linecap="round"/>`);
    const html = [
      [cerc('#7C2433'), 'iapă'],
      [cerc('#2B655D'), 'armăsar'],
      [cerc('#6E6254', true), 'nu mai e printre noi'],
      [linie('#7C2433', ''), 'de la mamă'],
      [linie('#2B655D', ''), 'de la tată'],
      [linie('#B8871F', 'stroke-dasharray="5 4"'), 'tată adoptiv'],
      [linie('#B8871F', 'stroke-dasharray=".5 5"'), 'iubire / prietenie'],
      [linie('#3A342E', 'stroke-dasharray=".5 5"'), 'dușmănie']
    ].map(([i, t]) => `${i}<span>${t}</span>`).join('');
    $('#legenda').innerHTML = html;
    $('#legenda-despre').innerHTML = html;
  }

  // ---------- Căutare ----------
  function miniatura(c) {
    return `<span class="mini">${c.poza ? `<img src="img/${c.poza}-mic.jpg" alt="" loading="lazy">` : '<span class="fir"></span>'}</span>`;
  }
  const claseCal = (c) => `sex-${c.sex === 'F' ? 'f' : 'm'}${c.decedat ? ' stins' : ''}`;

  function cautare() {
    const input = $('#cauta'), lista = $('#rezultate');
    let gasiti = [], activ = 0;

    function arata() {
      const q = norm(input.value.trim());
      gasiti = CAI.filter((c) => norm(c.nume).includes(q))
        .sort((a, b) => (norm(b.nume).startsWith(q) - norm(a.nume).startsWith(q)) || a.nume.localeCompare(b.nume, 'ro'));
      activ = 0;
      lista.innerHTML = gasiti.length
        ? gasiti.map((c, i) => `<li><button type="button" role="option" class="${claseCal(c)}${i === 0 ? ' activ' : ''}" data-id="${c.id}">${miniatura(c)}<b>${esc(c.nume)}</b><small>${eticAn(c)}</small></button></li>`).join('')
        : '<li class="gol">Niciun cal cu numele ăsta…</li>';
      lista.hidden = false;
    }
    const inchide = () => { lista.hidden = true; };
    const alege = (id) => { inchide(); input.value = ''; input.blur(); deschide(id); };

    input.addEventListener('input', arata);
    input.addEventListener('focus', arata);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { inchide(); input.blur(); }
      if (!gasiti.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        activ = (activ + (e.key === 'ArrowDown' ? 1 : -1) + gasiti.length) % gasiti.length;
        lista.querySelectorAll('button').forEach((b, i) => b.classList.toggle('activ', i === activ));
        lista.querySelectorAll('button')[activ].scrollIntoView({ block: 'nearest' });
      }
      if (e.key === 'Enter') { e.preventDefault(); alege(gasiti[activ].id); }
    });
    lista.addEventListener('pointerdown', (e) => e.preventDefault()); // păstrează focusul
    lista.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) alege(b.dataset.id); });
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.cautare')) inchide(); });
  }

  // ---------- Pagina calului ----------
  let pasiInApp = 0;
  function deschide(id) { pasiInApp++; location.hash = '#/cal/' + id; }
  window.addEventListener('hashchange', ruta);

  function ruta() {
    if ($('#despre').open) $('#despre').close();
    const m = location.hash.match(/^#\/cal\/([\w-]+)/);
    if (m && BY[m[1]]) aratCal(BY[m[1]]);
    else { $('#pagina-cal').hidden = true; document.title = 'Caii de la Nedee'; }
  }

  function aratCal(c) {
    const pag = $('#pagina-cal');
    const dupaAn = (l) => [...l].sort((a, b) => anZecimal(a.nascut) - anZecimal(b.nascut));
    const chip = (x) => `<a class="chip ${claseCal(x)}" href="#/cal/${x.id}" data-id="${x.id}">${miniatura(x)}<span><b>${esc(x.nume)}</b><small>${eticAn(x)}</small></span></a>`;
    const sectiune = (titlu, lista, culoare) => (lista.length
      ? `<h2><span class="punct" style="background:${culoare}"></span>${titlu}</h2><div class="chips">${lista.map(chip).join('')}</div>` : '');

    const data = c.decedat
      ? `<span class="eticheta">a trăit</span>${esc(c.nascut)} – ${esc(c.decedat)}`
      : `<span class="eticheta">${c.sex === 'F' ? 'născută' : 'născut'}</span>${esc(c.nascut)}`;

    pag.innerHTML = `
      <article class="cal ${claseCal(c)}${c.id === LIDER ? ' lider' : ''}">
        <div class="cal-top">
          <button class="btn-text" id="inapoi">← Înapoi</button>
          <a class="btn-text" href="#/">Arborele</a>
        </div>
        <div class="portret">${c.poza ? `<img src="img/${c.poza}.jpg" alt="${esc(c.nume)}">` : '<div class="fir" role="img" aria-label="fără poză"></div>'}</div>
        <h1>${esc(c.nume)}</h1>
        <p class="date">${data}</p>
        ${c.comentariu ? `<blockquote class="poveste"><p>${esc(c.comentariu)}</p></blockquote>` : ''}
        <section class="rude">
          ${sectiune('Mama', c.mama ? [BY[c.mama]] : [], 'var(--iapa)')}
          ${sectiune('Tata', c.tata ? [BY[c.tata]] : [], 'var(--armasar)')}
          ${sectiune('Tată adoptiv', c.tataAdoptiv ? [BY[c.tataAdoptiv]] : [], 'var(--mustar)')}
          ${sectiune('Copii', dupaAn(c.copii), 'var(--brad-2)')}
          ${sectiune('Copii adoptivi', dupaAn(c.copiiAdoptivi), 'var(--mustar)')}
          ${sectiune('Frați', dupaAn(c.frati), 'var(--brad-2)')}
          ${sectiune('Verișori', dupaAn(c.verisori), 'var(--brad-2)')}
          ${sectiune('Iubire', c.iubire, 'var(--mustar)')}
          ${sectiune('Prieteni', c.prieteni, 'var(--mustar)')}
          ${sectiune('Dușmani', c.dusmani, 'var(--carbune)')}
        </section>
      </article>`;
    pag.hidden = false;
    pag.scrollTop = 0;
    document.title = `${c.nume} · Caii de la Nedee`;
    $('#inapoi').onclick = () => { if (pasiInApp > 0) { pasiInApp--; history.back(); } else location.hash = '#/'; };
    pag.querySelectorAll('.chip').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); deschide(a.dataset.id); }));
  }

  // ---------- Despre + instalare ----------
  const dialog = $('#despre');
  $('#btn-despre').onclick = () => { actualizeazaInstalare(); dialog.showModal(); };

  let promptInstalare = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalare = e; });

  function actualizeazaInstalare() {
    const box = $('#instalare');
    const instalata = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (instalata) { box.innerHTML = '<b>✓ E pe telefonul tău</b> și merge și fără semnal.'; return; }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (promptInstalare) {
      box.innerHTML = '<b>Merge și fără semnal pe munte.</b> Pune-l pe telefon ca pe o aplicație:<button class="btn-plin mustar" id="instaleaza">Adaugă pe telefon</button>';
      $('#instaleaza').onclick = async () => { promptInstalare.prompt(); await promptInstalare.userChoice; promptInstalare = null; actualizeazaInstalare(); };
    } else if (ios) {
      box.innerHTML = '<b>Merge și fără semnal pe munte.</b> În Safari apasă <b>Partajează</b> (pătratul cu săgeată) → <b>Adaugă pe ecranul principal</b>.';
    } else {
      box.innerHTML = '<b>Merge și fără semnal pe munte.</b> Din meniul browserului (⋮) alege <b>Adaugă pe ecranul principal</b>.';
    }
  }

  function toast(text) {
    const t = $('#toast');
    t.textContent = text; t.hidden = false;
    setTimeout(() => { t.hidden = true; }, 3500);
  }

  // ---------- Offline ----------
  if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      if (reg.active) return;
      const sw = reg.installing || reg.waiting;
      if (sw) sw.addEventListener('statechange', () => {
        if (sw.state === 'activated') toast('Gata! Arborele merge acum și fără semnal ✓');
      });
    }).catch(() => {});
  }
})();
