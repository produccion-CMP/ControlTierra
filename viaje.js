(function () {
  const S = 0.62;
  const SUELO = 160;
  const ANCHO = 1320;
  const INI = 150;
  const FIN = 1010;
  const T = 3.2;
  const FASES = [0.6, 2.2];
  const KG = 28420;
  const NS = 'http://www.w3.org/2000/svg';

  function sierra(x0, x1, paso, base, alturas) {
    let d = 'M' + x0 + ' ' + base;
    let i = 0;
    for (let x = x0; x <= x1; x += paso) d += ' L' + x + ' ' + (base - alturas[i++ % alturas.length]);
    return d + ' L' + x1 + ' ' + base + ' Z';
  }

  function arbol(x, y, r) {
    return '<g transform="translate(' + x + ' ' + y + ')"><rect class="vj-tronco" x="-1.5" y="-9" width="3" height="10"/><circle class="vj-copa" cx="0" cy="' + (-9 - r) + '" r="' + r + '"/></g>';
  }

  function escena() {
    const alt = [30, 62, 40, 78, 34, 58, 70, 28, 50, 66];
    const cerros = sierra(-40, 1000, 55, 128, alt);
    let nieve = '';
    for (let i = 0, x = -40; x <= 1000; x += 55, i++) {
      const h = alt[i % alt.length];
      if (h < 58) continue;
      const hi = alt[(i - 1 + alt.length) % alt.length];
      const hd = alt[(i + 1) % alt.length];
      const y = 128 - h;
      const fi = Math.min(0.45, 13 / Math.max(1, h - hi));
      const fd = Math.min(0.45, 13 / Math.max(1, h - hd));
      const pi = [x - 55 * fi, y + (h - hi) * fi];
      const pd = [x + 55 * fd, y + (h - hd) * fd];
      nieve += '<path class="vj-nieve" d="M' + pi[0].toFixed(1) + ' ' + pi[1].toFixed(1) + ' L' + x + ' ' + y + ' L' + pd[0].toFixed(1) + ' ' + pd[1].toFixed(1) + ' L' + ((x + pd[0]) / 2).toFixed(1) + ' ' + ((y + pd[1]) / 2 + 3).toFixed(1) + ' L' + ((x + pi[0]) / 2).toFixed(1) + ' ' + ((y + pi[1]) / 2 + 4).toFixed(1) + ' Z"/>';
    }
    let lomas = 'M-40 150';
    for (let x = -40; x <= 1100; x += 70) lomas += ' Q' + (x + 35) + ' ' + (126 + (x % 3) * 6) + ' ' + (x + 70) + ' 150';
    lomas += ' L1100 160 L-40 160 Z';
    let arboles = '';
    [60, 150, 175, 300, 420, 445, 560, 690, 720, 830, 960].forEach((x, i) => { arboles += arbol(x, 152, 6 + (i % 3) * 2); });
    let postes = '';
    for (let x = 300; x <= 920; x += 104) postes += '<g transform="translate(' + x + ' ' + SUELO + ')"><rect class="vj-tronco" x="-1" y="-34" width="2" height="34"/><rect class="vj-tronco" x="-8" y="-34" width="16" height="2"/></g>';
    const nube = '<path d="M0 14 a10 10 0 0 1 18 -7 a13 13 0 0 1 24 2 a9 9 0 0 1 7 15 H2 a8 8 0 0 1 -2 -10 Z"/>';
    const ladrillos = [];
    for (let f = 0; f < 5; f++) for (let c = 0; c < 6; c++) ladrillos.push('<rect x="' + (1196 + c * 18 + (f % 2) * 9) + '" y="' + (112 + f * 9) + '" width="16" height="7" rx="1"/>');
    return '<svg class="viaje-svg" viewBox="0 0 600 210" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="vjCielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="c1"/><stop offset="1" class="c2"/></linearGradient>' +
      '<clipPath id="vjClip"><rect width="600" height="210" rx="20"/></clipPath></defs>' +
      '<g clip-path="url(#vjClip)">' +
      '<rect width="600" height="210" fill="url(#vjCielo)"/>' +
      '<circle class="vj-sol" cx="520" cy="44" r="18"/>' +
      '<g class="vj-nubes">' + [0, 1, 2].map(i => '<g data-nube="' + i + '">' + nube + '</g>').join('') + '</g>' +
      '<g data-capa="0.22"><path class="vj-cerro" d="' + cerros + '"/>' + nieve + '</g>' +
      '<g data-capa="0.5"><path class="vj-loma" d="' + lomas + '"/>' + arboles + '</g>' +
      '<g data-capa="1">' +
      '<path class="vj-tierra" d="M-60 160 L-60 70 C-20 62 10 74 30 82 L52 96 C64 100 70 110 82 122 L118 160 Z"/>' +
      '<path class="vj-tierra2" d="M-60 96 C-20 88 6 98 34 104 M-60 124 C-16 116 20 126 56 134 M-50 146 C-6 140 40 146 84 150" fill="none" stroke-width="2"/>' +
      '<rect class="vj-banquina" x="-60" y="' + SUELO + '" width="' + (ANCHO + 120) + '" height="50"/>' +
      '<rect class="vj-asfalto" x="-60" y="' + (SUELO + 6) + '" width="' + (ANCHO + 120) + '" height="44"/>' +
      '<line class="vj-linea" x1="-60" y1="' + (SUELO + 28) + '" x2="' + (ANCHO + 60) + '" y2="' + (SUELO + 28) + '"/>' +
      postes +
      '<g transform="translate(640 ' + SUELO + ')"><rect class="vj-tronco" x="-1.2" y="-30" width="2.4" height="30"/><rect class="vj-cartel" x="-30" y="-50" width="60" height="22" rx="4"/><text class="vj-txt" x="0" y="-41" text-anchor="middle">PLANTA CEVIL</text><text class="vj-txt" x="0" y="-32" text-anchor="middle">2 km →</text></g>' +
      '<g class="vj-pala" transform="translate(80 0)"><g data-pala-brazo><rect class="vj-brazo" x="40" y="124" width="40" height="6" rx="3"/><path class="vj-balde" d="M76 116 L94 118 L92 134 L76 132 Z"/></g>' +
      '<rect class="vj-amarillo" x="2" y="122" width="46" height="26" rx="4"/><rect class="vj-amarillo" x="8" y="100" width="22" height="24" rx="3"/><rect class="vj-vidrio" x="12" y="104" width="14" height="12" rx="2"/>' +
      '<circle class="vj-goma" cx="13" cy="151" r="9"/><circle class="vj-llanta" cx="13" cy="151" r="3.5"/><circle class="vj-goma" cx="39" cy="151" r="9"/><circle class="vj-llanta" cx="39" cy="151" r="3.5"/></g>' +
      '<rect class="vj-plataforma" x="990" y="' + (SUELO - 2) + '" width="160" height="6" rx="2"/>' +
      '<g transform="translate(1166 ' + SUELO + ')"><rect class="vj-tronco" x="-1.5" y="-46" width="3" height="46"/><rect class="vj-display" x="-34" y="-70" width="68" height="24" rx="4"/><text class="vj-kg" data-kg x="0" y="-53" text-anchor="middle">0 kg</text></g>' +
      '<text class="vj-rotulo" x="1070" y="' + (SUELO + 4) + '" text-anchor="middle">BALANZA</text>' +
      '<rect class="vj-galpon" x="1188" y="96" width="132" height="64"/><path class="vj-techo" d="M1182 98 L1254 74 L1326 98 Z"/>' +
      '<g class="vj-ladrillo">' + ladrillos.join('') + '</g>' +
      '<rect class="vj-chimenea" x="1290" y="40" width="14" height="40"/>' +
      '<rect class="vj-cartel" x="1220" y="80" width="68" height="14" rx="3"/><text class="vj-txt" x="1254" y="90" text-anchor="middle">CEVIL</text>' +
      '<g data-part></g>' +
      '<g data-camion>' +
      '<g data-carga><path class="vj-tierra" d="M18 50 C24 30 40 24 54 30 C64 18 84 16 96 26 C108 18 126 22 134 34 C142 34 148 42 148 50 Z"/>' +
      '<circle cx="46" cy="38" r="2.4" class="vj-terron"/><circle cx="80" cy="30" r="2" class="vj-terron"/><circle cx="106" cy="36" r="2.6" class="vj-terron"/><circle cx="128" cy="42" r="2" class="vj-terron"/></g>' +
      '<path class="vj-tolva" d="M12 48 H152 L146 88 H18 Z"/><path class="vj-tolva2" d="M12 48 H152" stroke-width="4"/><path class="vj-tolva2" d="M44 52 V84 M78 52 V84 M112 52 V84" stroke-width="2"/>' +
      '<rect class="vj-chasis" x="8" y="86" width="214" height="7" rx="2"/>' +
      '<path class="vj-cabina" d="M158 54 H194 L214 76 V92 H158 Z"/><path class="vj-vidrio" d="M178 59 H192 L206 75 H178 Z"/>' +
      '<rect class="vj-faro" x="216" y="80" width="8" height="6" rx="2"/><rect class="vj-chasis" x="152" y="38" width="4" height="18" rx="1"/>' +
      [40, 70, 190].map(x => '<g data-rueda="' + x + '"><circle class="vj-goma" cx="' + x + '" cy="98" r="11"/><circle class="vj-llanta" cx="' + x + '" cy="98" r="4.5"/><path class="vj-rayo" d="M' + x + ' 89 V93 M' + x + ' 103 V107 M' + (x - 9) + ' 98 H' + (x - 5) + ' M' + (x + 5) + ' 98 H' + (x + 9) + '" stroke-width="2"/></g>').join('') +
      '</g></g></g></svg>';
  }

  const suave = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

  function animar(raiz, estadoEl, barra) {
    const svg = raiz.querySelector('svg.viaje-svg');
    if (!svg) return;
    const q = s => svg.querySelector(s);
    const capas = Array.from(svg.querySelectorAll('[data-capa]')).map(g => [g, Number(g.dataset.capa)]);
    const nubes = Array.from(svg.querySelectorAll('[data-nube]'));
    const camion = q('[data-camion]');
    const carga = q('[data-carga]');
    const ruedas = Array.from(svg.querySelectorAll('[data-rueda]'));
    const brazo = q('[data-pala-brazo]');
    const kg = q('[data-kg]');
    const capaPart = q('[data-part]');
    const parts = [];
    for (let i = 0; i < 46; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', '0');
      capaPart.appendChild(c);
      parts.push({ el: c, vida: 0 });
    }
    let libre = 0;
    const emitir = (x, y, vx, vy, r, dur, cls) => {
      const p = parts[libre];
      libre = (libre + 1) % parts.length;
      Object.assign(p, { x: x, y: y, vx: vx, vy: vy, r: r, dur: dur, vida: dur });
      p.el.setAttribute('class', cls);
    };
    const t0 = performance.now();
    let prev = t0;
    let txPrev = INI;
    let distancia = 0;
    let humoT = 0;
    let escapeT = 0;
    let ultimoEstado = '';
    function cuadro(ahora) {
      if (!svg.isConnected) return;
      const dt = Math.min(0.05, (ahora - prev) / 1000);
      prev = ahora;
      const tt = (ahora - t0) / 1000;
      const t = tt % T;
      let tx = INI;
      let brazoAng = 0;
      let k = 1;
      let avance = 0;
      let estado = 'Cargando en cantera…';
      let kgVal = 0;
      if (t < FASES[0]) {
        const p = t / FASES[0];
        brazoAng = -38 * Math.sin(Math.PI * Math.min(1, p * 1.15));
        k = 0.3 + 0.7 * suave(p);
        if (p > 0.25 && p < 0.75 && Math.random() < 0.6) emitir(INI + 10 + Math.random() * 14, 108, -4 + Math.random() * 8, 40 + Math.random() * 30, 1.6 + Math.random(), 0.35, 'vj-p-tierra');
      } else if (t < FASES[1]) {
        const p = (t - FASES[0]) / (FASES[1] - FASES[0]);
        avance = suave(p);
        tx = INI + (FIN - INI) * avance;
        estado = 'Viajando a Planta CEVIL…';
      } else {
        tx = FIN;
        avance = 1;
        const p = Math.min(1, (t - FASES[1]) / 0.55);
        kgVal = Math.round(KG * suave(p) + (p < 1 ? (Math.random() - 0.5) * 600 : 0));
        estado = 'Pesando en balanza…';
      }
      let dx = tx - txPrev;
      if (dx < -100) dx = 0;
      txPrev = tx;
      distancia += dx;
      const vel = dt > 0 ? dx / dt : 0;
      const cam = Math.max(0, Math.min(ANCHO - 600, tx - 250));
      capas.forEach(c => c[0].setAttribute('transform', 'translate(' + (-cam * c[1]).toFixed(1) + ' 0)'));
      nubes.forEach((n, i) => {
        const x = ((90 + i * 250 - tt * (8 + i * 3) - cam * 0.08) % 760 + 760) % 760 - 80;
        n.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + (20 + i * 17) + ') scale(' + (1 - i * 0.18) + ')');
      });
      const rebote = Math.abs(vel) > 5 ? Math.sin(tt * 38) * 0.9 : 0;
      camion.setAttribute('transform', 'translate(' + tx.toFixed(1) + ' ' + (SUELO - 109 * S + rebote).toFixed(2) + ') scale(' + S + ')');
      carga.setAttribute('transform', 'translate(0 50) scale(1 ' + k.toFixed(3) + ') translate(0 -50)');
      const ang = (distancia / (11 * S)) * 180 / Math.PI;
      ruedas.forEach(r => { const x = r.dataset.rueda; r.setAttribute('transform', 'rotate(' + ang.toFixed(1) + ' ' + x + ' 98)'); });
      brazo.setAttribute('transform', 'rotate(' + brazoAng.toFixed(1) + ' 44 127)');
      kg.textContent = kgVal ? kgVal.toLocaleString('es-AR') + ' kg' : '0 kg';
      kg.classList.toggle('ok', t >= FASES[1] + 0.55);
      if (Math.abs(vel) > 30) {
        const n = Math.abs(vel) > 300 ? 2 : 1;
        for (let i = 0; i < n; i++) emitir(tx + 20 * S + Math.random() * 6, SUELO - 3, -vel * 0.15 - 20 - Math.random() * 30, -8 - Math.random() * 18, 2 + Math.random() * 2.5, 0.7, 'vj-p-polvo');
      }
      escapeT -= dt;
      if (escapeT <= 0) {
        escapeT = Math.abs(vel) > 30 ? 0.09 : 0.22;
        emitir(tx + 154 * S, SUELO - 109 * S + 38 * S, -vel * 0.4 - 10, -26 - Math.random() * 10, 2.4, 0.8, 'vj-p-humo');
      }
      humoT -= dt;
      if (humoT <= 0) {
        humoT = 0.16;
        emitir(1297 + (Math.random() - 0.5) * 4, 40, -14 - Math.random() * 10, -22 - Math.random() * 10, 4, 1.6, 'vj-p-humo');
      }
      parts.forEach(p => {
        if (p.vida <= 0) { if (p.el.getAttribute('r') !== '0') p.el.setAttribute('r', '0'); return; }
        p.vida -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.el.classList.contains('vj-p-tierra')) p.vy += 260 * dt;
        const f = Math.max(0, p.vida / p.dur);
        p.el.setAttribute('cx', p.x.toFixed(1));
        p.el.setAttribute('cy', p.y.toFixed(1));
        p.el.setAttribute('r', (p.el.classList.contains('vj-p-tierra') ? p.r : p.r * (1 + (1 - f) * 1.6)).toFixed(2));
        p.el.style.opacity = (f * 0.75).toFixed(2);
      });
      const borde = Math.min(t, T - t);
      svg.style.opacity = borde < 0.12 ? (0.35 + borde / 0.12 * 0.65).toFixed(2) : '1';
      if (barra) barra.style.left = (avance * 100).toFixed(1) + '%';
      if (estadoEl && estado !== ultimoEstado) { estadoEl.textContent = estado; ultimoEstado = estado; }
      requestAnimationFrame(cuadro);
    }
    requestAnimationFrame(cuadro);
  }

  window.montarViaje = function (contenedor, estadoEl) {
    if (!contenedor) return;
    contenedor.innerHTML = escena() + '<div class="trayecto"><span>Cantera</span><i><b></b></i><span>Balanza CEVIL</span></div>';
    animar(contenedor, estadoEl, contenedor.querySelector('.trayecto b'));
  };

  window.montarViaje(document.getElementById('vjSplash'), document.getElementById('vjEstado'));
})();
