'use strict';

async function vInicio() {
  const dias = Number(lsGet('tierra_inicio_dias', 7)) || 7;
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">' + esc(fLarga(hoy())) + '</div><h1>Control de <span>tierra</span></h1>' +
    '<p class="sub">Desde la cantera hasta el silo: cuánta tierra entra, cuánta se acopia y cuánta se consume.</p></div><div id="segDias"></div></div>' +
    '<div class="card flujo-card"><div class="skel" style="height:150px"></div></div><div class="grid g-21"><div class="card"><div class="skel" style="height:220px"></div></div><div class="card"><div class="skel" style="height:220px"></div></div></div></div>';
  segmento($('#segDias'), [['7', '7 días'], ['15', '15 días'], ['30', '30 días']], String(dias), k => { lsSet('tierra_inicio_dias', Number(k)); vInicio(); }, true);
  const ok = vivo();
  await cargarResumen();
  if (!ok()) return;
  const hasta = hoy();
  const desde = addDias(hasta, -(dias - 1));
  const b = calcBalance(desde, hasta);
  const R = S.resumen;
  const cis = R.cisterna && !R.cisterna.error ? R.cisterna : null;
  const pctP = Math.max(0, Math.min(100, b.stockPlaya / (b.maxPlaya || 1) * 100));
  const pctS = Math.max(0, Math.min(100, b.stockSilo / (b.maxSilo || 1) * 100));
  const nodo = (k, ic, l, v, d, ruta, extra) => '<div class="nodo ' + (extra ? 'stock' : '') + '" data-ir="' + ruta + '" data-k="' + k + '"><div class="ic">' + ICON[ic] + '</div><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + d + '</div>' + (extra || '') + '</div>';
  const fuentes = [
    ['viajes', 'Viajes de camiones', 'camion', '#/cargar/viajes'],
    ['jornada', 'Jornada de cantera', 'pala', '#/cargar/jornada'],
    ['pesajes', 'Balanza de ingreso', 'balanza', '#/cargar/pesaje'],
    ['molienda', 'Molienda y silo', 'molienda', '#/cargar/molienda'],
    ['calidad', 'Calidad de tierra', 'calidad', '#/cargar/calidad']
  ];
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">' + esc(fLarga(hoy())) + '</div><h1>Control de <span>tierra</span></h1>' +
    '<p class="sub">Recorrido de la tierra en los últimos ' + dias + ' días. Tocá cada etapa para ver el detalle.</p></div><div id="segDias"></div></div>' +
    (R.errorInforme && R.errorInforme !== 'Sin configurar' ? '<div class="alert warn">' + ICON.alerta + '<div><b>No se pudo leer el Informe de Producción (molienda/silo).</b> ' + esc(R.errorInforme) + '</div></div>' : '') +
    (R.errorViajes ? '<div class="alert bad">' + ICON.alerta + '<div><b>No se pudo leer la planilla de viajes.</b> ' + esc(R.errorViajes) + '</div></div>' : '') +
    '<div class="card flujo-card"><div class="flujo" id="flujo"><svg class="lineas" id="lineas"></svg>' +
    nodo('cantera', 'cantera', 'Cantera', vn(b.unid + b.internos), 'camiones cargados<br>' + nf(b.internos) + ' internos', '#/tablero/cantera') +
    nodo('viajes', 'camion', 'Viajes', vn(b.viajes), 'a planta registrados', '#/tablero/viajes') +
    nodo('balanza', 'balanza', 'Balanza', vn(b.ingreso) + '<small> t</small>', nf(b.tickets) + ' tickets · ' + nf(b.tickets ? b.ingreso / b.tickets : null, 1) + ' t/camión', '#/tablero/viajes') +
    nodo('playa', 'playa', 'Playa', vn(b.stockPlaya) + '<small> t</small>', 'stock acumulado', '#/tablero/balance', '<div class="tanque ' + (b.stockPlaya < 0 ? 'bad' : '') + '"><span data-w="' + pctP + '"></span></div>') +
    nodo('molienda', 'molienda', 'Molienda', vn(b.consumo) + '<small> t</small>', nf(b.molPal) + ' paladas al cajón', '#/tablero/balance') +
    nodo('silo', 'silo', 'Silo', vn(b.stockSilo) + '<small> t</small>', nf(b.siloOut, 0) + ' t extraídas', '#/tablero/balance', '<div class="tanque ' + (b.stockSilo < 0 ? 'bad' : '') + '"><span data-w="' + pctS + '"></span></div>') +
    '</div></div>' +
    '<div class="grid g-21" style="align-items:start"><div class="card"><div class="card-h"><div class="t"><h3>Para revisar</h3><div class="sub">Controles automáticos de los últimos 14 días</div></div></div><div class="alertas" id="alertas"><div class="skel" style="height:56px"></div><div class="skel" style="height:56px"></div><div class="skel" style="height:56px"></div></div></div>' +
    '<div class="col" style="gap:16px"><div class="card"><div class="card-h"><div class="t"><h3>Estado de la carga</h3><div class="sub">Último día con datos por fuente</div></div></div><div class="estado">' +
    fuentes.map(f => {
      const sm = semaforoDias((R.ultimo || {})[f[0]]);
      return '<a class="fila" href="' + (S.ses ? f[3] : '#/calendario') + '"><span class="ico">' + ICON[f[2]] + '</span><span class="txt"><b>' + f[1] + '</b><small>' + ((R.ultimo || {})[f[0]] ? fMedia(R.ultimo[f[0]]) + ' · ' + sm.txt : 'sin datos') + '</small></span><span class="semaforo ' + sm.cls + '"></span></a>';
    }).join('') + '</div></div>' + (cis ? gaugeCisterna(cis) : '') + '</div></div>' +
    '<div class="grid g3 stagger">' +
    '<div class="card spark"><div class="row"><span class="eyebrow">Ingreso diario</span><span class="right tag t-mut">t</span></div><div class="chart"><canvas id="spIng"></canvas></div></div>' +
    '<div class="card spark"><div class="row"><span class="eyebrow">Viajes por día</span><span class="right tag t-mut">a planta</span></div><div class="chart"><canvas id="spVia"></canvas></div></div>' +
    '<div class="card spark"><div class="row"><span class="eyebrow">Stock en playa</span><span class="right tag t-mut">t</span></div><div class="chart"><canvas id="spSto"></canvas></div></div>' +
    '</div></div>';
  segmento($('#segDias'), [['7', '7 días'], ['15', '15 días'], ['30', '30 días']], String(dias), k => { lsSet('tierra_inicio_dias', Number(k)); vInicio(); }, true);
  stagger(app());
  contar(app());
  $$('.nodo').forEach(n => { n.onclick = () => { location.hash = n.dataset.ir; }; });
  requestAnimationFrame(() => {
    $$('.tanque span').forEach(s => { s.style.width = s.dataset.w + '%'; });
    $$('.gauge .arco').forEach(a => { a.style.strokeDashoffset = a.dataset.off; });
    dibujarFlujo();
  });
  const serie = b.serie;
  const L = serie.map(s => fCorta(s.fecha));
  const spark = { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } };
  grafico('spIng', 'bar', L, [{ label: 'Ingreso t', data: serie.map(s => s.ingreso), backgroundColor: color(1) }], spark, i => { location.hash = '#/dia/' + serie[i].fecha; });
  const dv = (R.diario || []).filter(d => d.fecha >= desde && d.fecha <= hasta);
  grafico('spVia', 'bar', dv.map(d => fCorta(d.fecha)), [{ label: 'Viajes', data: dv.map(d => d.viajes), backgroundColor: color(2) }], spark, i => { location.hash = '#/dia/' + dv[i].fecha; });
  grafico('spSto', 'line', L, [{ label: 'Stock playa t', data: serie.map(s => s.stockPlaya), borderColor: color(3), backgroundColor: color(3), fill: false }], mezclar(spark, { scales: { y: { beginAtZero: false } } }));
  try {
    const r14 = await api('rango', { desde: addDias(hoy(), -13), hasta: hoy() });
    if (ok() && $('#alertas')) pintarAlertas(r14, b, cis);
  } catch (e) {
    if (ok() && $('#alertas')) $('#alertas').innerHTML = '<div class="alert warn">' + ICON.alerta + '<div>No se pudieron calcular los controles: ' + esc(e.message) + '</div></div>';
  }
}

function dibujarFlujo() {
  const cont = $('#flujo');
  const svg = $('#lineas');
  if (!cont || !svg || getComputedStyle(svg).display === 'none') return;
  const rc = cont.getBoundingClientRect();
  const nodos = $$('.nodo', cont).map(n => n.getBoundingClientRect());
  let d = '';
  for (let i = 0; i < nodos.length - 1; i++) {
    const a = nodos[i];
    const b = nodos[i + 1];
    const y = a.top + 36 - rc.top;
    d += 'M' + (a.right - rc.left - 6) + ' ' + y + ' L' + (b.left - rc.left + 6) + ' ' + y + ' ';
  }
  svg.setAttribute('viewBox', '0 0 ' + rc.width + ' ' + rc.height);
  svg.innerHTML = '<path d="' + d + '"/><path class="mov" d="' + d + '"/>';
}

function gaugeCisterna(c) {
  const cap = c.capacidad || Math.max(c.nivel, 1);
  const pct = Math.max(0, Math.min(1, c.nivel / cap));
  const largo = 2 * Math.PI * 52 * 0.75;
  const off = largo * (1 - pct);
  const auton = c.consumoMedio > 0 ? c.nivel / c.consumoMedio : null;
  const cls = pct < 0.15 || (auton !== null && auton < 2) ? 'bad' : pct < 0.3 ? 'warn' : '';
  return '<a class="card hover" href="#/tablero/combustible" style="color:inherit"><div class="card-h"><div class="t"><h3>' + esc(c.nombre || 'Cisterna') + '</h3><div class="sub">Gasoil de cantera, estimado con cargas y consumos</div></div></div>' +
    '<div class="gauge"><svg viewBox="0 0 130 130"><circle class="arco-bg" cx="65" cy="65" r="52" stroke-dasharray="' + largo + ' 999" transform="rotate(135 65 65)"/>' +
    '<circle class="arco ' + cls + '" cx="65" cy="65" r="52" stroke-dasharray="' + largo + ' 999" stroke-dashoffset="' + largo + '" data-off="' + off + '" transform="rotate(135 65 65)"/>' +
    '<text x="65" y="68" text-anchor="middle" font-size="24">' + Math.round(pct * 100) + '%</text><text x="65" y="88" text-anchor="middle" font-size="10" style="fill:var(--muted)">de ' + nf(cap) + ' L</text></svg>' +
    '<div class="info"><b>' + nf(c.nivel) + ' L</b><span class="sub">Consumo medio ' + nf(c.consumoMedio) + ' L/día</span>' +
    (auton !== null ? '<span class="tag ' + (cls === 'bad' ? 't-bad' : cls === 'warn' ? 't-warn' : 't-ok') + '">' + ICON.reloj.replace('<svg', '<svg width="13" height="13"') + ' ≈ ' + nf(auton, 1) + ' días de autonomía</span>' : '') + '</div></div></a>';
}

function pintarAlertas(r, b, cis) {
  const k = conciliar(r);
  const out = [];
  const add = (cls, ic, t, d, ruta) => out.push({ cls: cls, ic: ic, t: t, d: d, ruta: ruta });
  const ult = (S.resumen.ultimo || {});
  const sv = semaforoDias(ult.viajes);
  if (sv.dias !== null && sv.dias > 2) add(sv.cls, 'reloj', 'Viajes cargados hasta el ' + fMedia(ult.viajes), 'Hay ' + sv.dias + ' días sin cargar comprobantes de viajes.', '#/cargar/viajes');
  if (k.pes.length) {
    if (k.sinTicket.length) add(k.sinTicket.length > 5 ? 'bad' : 'warn', 'balanza', k.sinTicket.length + ' viajes sin ticket de balanza', 'Viajes a planta que no se encontraron en el pesaje (mismo dominio, ±' + par('VENTANA_MATCH_MIN', 120) + ' min).', '#/tablero/viajes');
    if (k.sinViaje.length) add('warn', 'camion', k.sinViaje.length + ' tickets sin viaje registrado', 'Camiones pesados que no tienen comprobante cargado.', '#/tablero/viajes');
    if (k.atipicos.length) add('info', 'alerta', k.atipicos.length + ' pesajes fuera de lo normal', 'Netos muy distintos a los habituales del mismo camión.', '#/tablero/viajes');
  } else {
    add('info', 'balanza', 'Sin pesajes en los últimos 14 días', 'Importá el PESAJE.XLS para cruzar viajes con la balanza.', '#/cargar/pesaje');
  }
  const difer = k.diario.filter(d => d.unid > 0 && Math.abs(d.unid - d.viajes) > Math.max(3, d.unid * 0.15));
  if (difer.length) add('warn', 'pala', difer.length + ' días con diferencia palas ↔ viajes', 'Camiones a planta declarados por las palas no coinciden con los viajes cargados (ej. ' + fCorta(difer[difer.length - 1].fecha) + ': ' + difer[difer.length - 1].unid + ' vs ' + difer[difer.length - 1].viajes + ').', '#/tablero/viajes');
  const horBad = r.tramos.filter(t => t.tipo === 'Producción' && t.horometroIni !== null && t.horometroFin !== null && ((t.horometroFin - t.horometroIni) < 0 || (t.horometroFin - t.horometroIni) > dur(t.horaInicio, t.horaFin) + 1));
  if (horBad.length) add('bad', 'reloj', horBad.length + ' horómetros inconsistentes', horBad.slice(0, 2).map(t => t.maquina + ' ' + fCorta(t.fecha) + ': ' + nf(t.horometroIni, 1) + ' → ' + nf(t.horometroFin, 1)).join(' · '), '#/dia/' + horBad[0].fecha);
  const largos = k.ciclos.filter(c => c.min > 240);
  if (largos.length) add('info', 'reloj', largos.length + ' viajes de más de 4 h', 'Revisar hora de carga/descarga (ej. ' + esc(largos[0].v.chofer) + ' ' + fCorta(largos[0].v.fecha) + ' ' + largos[0].v.horaCarga + '→' + largos[0].v.horaDescarga + ').', '#/dia/' + largos[0].v.fecha);
  const rech = (r.calidad || []).filter(c => c.estado === 'Rechazado');
  if (rech.length) add('bad', 'calidad', rech.length + ' muestras de tierra rechazadas', rech.slice(0, 2).map(c => (c.origen || c.dominio) + ' ' + fCorta(c.fecha)).join(' · '), '#/tablero/calidad');
  if (cis && cis.capacidad && cis.nivel / cis.capacidad < 0.25) add('bad', 'combustible', 'Cisterna baja: ' + nf(cis.nivel) + ' L', 'Queda ' + nf(cis.nivel / cis.capacidad * 100) + '% de la capacidad.', '#/tablero/combustible');
  if (b.stockPlaya < 0) add('warn', 'playa', 'Stock de playa negativo', 'Falta un stock inicial o una cubicación reciente para corregir el balance.', S.ses ? '#/cargar/ajustes' : '#/tablero/balance');
  if (b.estimados) add('info', 'molienda', b.estimados + ' días sin balanza dinámica', 'El consumo de molienda se estimó con ' + nf(b.fMolHist, 2) + ' t/palada.', '#/tablero/balance');
  if (!out.length) add('ok', 'ok', 'Todo en orden', 'No se detectaron inconsistencias en los últimos 14 días.', '#/tablero');
  const orden = { bad: 0, warn: 1, info: 2, ok: 3 };
  out.sort((a, c) => orden[a.cls] - orden[c.cls]);
  $('#alertas').innerHTML = out.map((a, i) => '<div class="alerta ' + a.cls + '" data-ir="' + a.ruta + '" style="animation:cardIn .45s var(--ease) both;animation-delay:' + i * 50 + 'ms"><span class="ico">' + ICON[a.ic] + '</span><div><b>' + esc(a.t) + '</b><small>' + a.d + '</small></div></div>').join('');
  $$('#alertas .alerta').forEach(a => { a.onclick = () => { location.hash = a.dataset.ir; }; });
}

function barraFiltros() {
  const ps = [['7', 'Últimos 7 días'], ['30', 'Últimos 30 días'], ['90', 'Últimos 90 días'], ['mes', 'Mes actual'], ['mesant', 'Mes anterior'], ['anio', 'Año actual'], ['custom', 'Personalizado']];
  return '<div class="bar"><label class="f">Período<select id="fPre">' + ps.map(p => '<option value="' + p[0] + '"' + (S.preset === p[0] ? ' selected' : '') + '>' + p[1] + '</option>').join('') +
    '</select></label><label class="f">Desde<input type="date" id="fDes" value="' + S.desde + '"></label><label class="f">Hasta<input type="date" id="fHas" value="' + S.hasta +
    '"></label><button class="btn pri" id="fApl">Aplicar</button><div class="row right"><button class="btn" id="fAct">' + ICON.refrescar + 'Actualizar</button>' +
    '<button class="btn" onclick="window.print()">' + ICON.imprimir + 'Imprimir</button></div></div>';
}

function enlazarFiltros(fn) {
  $('#fPre').onchange = e => { aplicarPreset(e.target.value); if (S.preset !== 'custom') fn(); };
  const manual = () => {
    const d = $('#fDes').value;
    const h = $('#fHas').value;
    if (!d || !h || d > h) return toast('Rango de fechas inválido', 'bad');
    S.preset = 'custom';
    S.desde = d;
    S.hasta = h;
    lsSet('tierra_rango', { preset: S.preset, desde: d, hasta: h });
    fn();
  };
  $('#fApl').onclick = manual;
  $('#fAct').onclick = () => { invalidar(); S.resumen = null; fn(); };
}

const TABS = [
  ['balance', 'Balance', ICON.playa],
  ['viajes', 'Viajes y balanza', ICON.camion],
  ['cantera', 'Cantera', ICON.pala],
  ['calidad', 'Calidad', ICON.calidad],
  ['combustible', 'Combustible', ICON.combustible]
];

async function vTablero(tab) {
  if (!TABS.some(t => t[0] === tab)) tab = 'balance';
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Tablero</div><h1>Análisis del período</h1><p class="sub">' + fMedia(S.desde) + ' al ' + fMedia(S.hasta) + '</p></div></div>' +
    barraFiltros() + '<div id="tabsT" style="margin-bottom:16px"></div><div id="tabC"><div class="kpis">' + '<div class="skel" style="height:96px"></div>'.repeat(5) + '</div><div class="card mt"><div class="skel" style="height:260px"></div></div></div></div>';
  segmento($('#tabsT'), TABS, tab, k => { history.replaceState(null, '', '#/tablero/' + k); destruirGraficos(); pintarTab(k); });
  enlazarFiltros(() => vTablero(tab));
  const ok = vivo();
  await cargarResumen();
  await cargarRango();
  if (!ok()) return;
  pintarTab(($('#tabsT .seg button.on') || {}).dataset ? $('#tabsT .seg button.on').dataset.k : tab);
}

function pintarTab(tab) {
  const c = $('#tabC');
  if (!c) return;
  c.innerHTML = '';
  if (tab === 'viajes') tabViajes(c);
  else if (tab === 'cantera') tabCantera(c);
  else if (tab === 'calidad') tabCalidad(c);
  else if (tab === 'combustible') tabCombustible(c);
  else tabBalance(c);
  c.classList.remove('vista');
  void c.offsetWidth;
  c.classList.add('vista');
  stagger(c);
  contar(c);
}

function guia(items) {
  return '<details class="guia"><summary>' + ICON.infoI.replace('<svg', '<svg width="18" height="18"') + '¿Cómo leer esta sección?</summary><div class="cuerpo">' + items.map(i => '<div><b>' + i[0] + ':</b> ' + i[1] + '</div>').join('') + '</div></details>';
}

function irDia(lista) {
  return i => { if (lista[i]) location.hash = '#/dia/' + (lista[i].fecha || lista[i]); };
}

function tabBalance(c) {
  const b = calcBalance(S.desde, S.hasta);
  const avisos = [];
  if (!b.hayAjuste) avisos.push('No hay stock inicial cargado: los stocks se calculan desde el primer registro (base 0). Cargá un <b>Stock inicial</b> o una <b>Cubicación</b> en Cargar → Ajustes de stock.');
  if (!b.calibrado) avisos.push('Sin turnos con balanza dinámica: se usa el factor teórico ' + nf(b.fTeo, 2) + ' t/palada.');
  if (b.estimados) avisos.push(b.estimados + ' día(s) con turnos de molienda sin toneladas de balanza dinámica; se estimaron con ' + nf(b.fMolHist, 2) + ' t/palada.');
  const L = b.serie.map(s => fCorta(s.fecha));
  c.innerHTML = guia([
    ['Ingreso', 'toneladas netas pesadas en la balanza de ingreso (solo productos de tierra).'],
    ['Consumo de molienda', 'toneladas de la balanza dinámica; los turnos sin balanza se estiman con paladas × factor t/palada.'],
    ['Stock de playa', 'stock inicial o última cubicación + ingresos − consumo de molienda.'],
    ['Stock de silo', 'lo que pasó por la balanza dinámica − paladas extraídas × factor del silo.']
  ]) + (avisos.length ? '<div class="alert info">' + ICON.infoI + '<ul style="margin:0">' + avisos.map(a => '<li>' + a + '</li>').join('') + '</ul></div>' : '') +
    '<div class="kpis stagger">' +
    kpi('Ingreso balanza', vn(b.ingreso) + '<small>t</small>', nf(b.tickets) + ' tickets', 'kacc', 'Suma de netos de la balanza de ingreso en el período.') +
    kpi('Consumo molienda', vn(b.consumo) + '<small>t</small>', nf(b.molPal) + ' paladas al cajón', 'kacc', 'Toneladas que entraron a la línea de molienda.') +
    kpi('Variación playa', vn(b.ingreso - b.consumo) + '<small>t</small>', b.ingreso - b.consumo >= 0 ? 'se acumuló tierra' : 'se consumió stock', b.ingreso - b.consumo >= 0 ? 'ok' : 'warn', 'Ingreso − consumo. Positivo: la playa crece.') +
    kpi('Stock playa', vn(b.stockPlaya) + '<small>t</small>', 'al ' + fCorta(S.hasta), b.stockPlaya < 0 ? 'bad' : '', 'Stock calculado al final del período.') +
    kpi('Stock silo', vn(b.stockSilo) + '<small>t</small>', nf(b.siloOut, 0) + ' t extraídas', b.stockSilo < 0 ? 'bad' : '', 'Tierra molida disponible en silo.') +
    kpi('t por camión', vn(b.tickets ? b.ingreso / b.tickets : null, 1) + '<small>t</small>', 'neto medio de balanza', '', 'Promedio de toneladas netas por ticket.') +
    kpi('t por palada (molienda)', vn(b.fMol, 2), b.calibrado ? 'balanza dinámica / paladas' : 'teórico', '', 'Se usa para estimar el consumo cuando falta la balanza dinámica.') +
    '</div><div class="grid g2">' + caja('chPlaya', 'Playa: ingreso y consumo diario', 'Tocá una barra para ver el día') + caja('chSilo', 'Silo: entrada y extracción diaria', 'Entrada = consumo de molienda') + '</div>' +
    caja('chStock', 'Evolución de stocks', 'Toneladas al cierre de cada día', 'lg') +
    '<div class="card"><div class="card-h"><div class="t"><h3>Detalle diario</h3></div><button class="btn sm" id="csvBal">' + ICON.descargar + 'CSV</button></div>' +
    tabla([[r => '<a href="#/dia/' + r.fecha + '">' + fMedia(r.fecha) + '</a>', 'Fecha'], [r => nf(r.ingreso, 1), 'Ingreso t', 'n'], [r => nf(r.consumo, 1) + (r.estimado ? ' *' : ''), 'Consumo t', 'n'], [r => nf(r.stockPlaya, 0), 'Stock playa', 'n'],
      [r => nf(r.siloOut, 1), 'Extr. silo t', 'n'], [r => nf(r.stockSilo, 0), 'Stock silo', 'n'], [r => nf(r.tCamion, 1), 't/camión', 'n'], [r => nf(r.fMol, 2), 't/palada mol.', 'n']],
    b.serie.slice().reverse(), { max: true }) + '<div class="sub mt">* consumo estimado con factor por falta de balanza dinámica en algún turno.</div></div>';
  grafico('chPlaya', 'bar', L, [
    { label: 'Ingreso t', data: b.serie.map(s => s.ingreso), backgroundColor: color(1) },
    { label: 'Consumo t', data: b.serie.map(s => s.consumo), backgroundColor: color(2) }
  ], null, irDia(b.serie));
  grafico('chSilo', 'bar', L, [
    { label: 'Entrada t', data: b.serie.map(s => s.consumo), backgroundColor: color(2) },
    { label: 'Extracción t', data: b.serie.map(s => s.siloOut), backgroundColor: color(3) }
  ], null, irDia(b.serie));
  grafico('chStock', 'line', L, [
    { label: 'Stock playa t', data: b.serie.map(s => s.stockPlaya), borderColor: color(1), backgroundColor: color(1) },
    { label: 'Stock silo t', data: b.serie.map(s => s.stockSilo), borderColor: color(3), backgroundColor: color(3) }
  ], { scales: { y: { beginAtZero: false } } }, irDia(b.serie));
  $('#csvBal').onclick = () => csv('balance_' + S.desde + '_' + S.hasta, [['fecha', 'Fecha'], ['ingreso', 'Ingreso t'], ['consumo', 'Consumo t'], ['stockPlaya', 'Stock playa t'], ['siloOut', 'Extraccion silo t'], ['stockSilo', 'Stock silo t'], ['tCamion', 't/camion'], ['fMol', 't/palada molienda']], b.serie);
}

function tabViajes(c) {
  const R = S.rango;
  const k = conciliar(R);
  const netoT = sum(k.pes, p => p.neto);
  const cicMed = k.ciclos.length ? quant(k.ciclos.map(x => x.min).sort((a, b) => a - b), 0.5) : null;
  const pctMatch = k.viajes.length && k.pes.length ? k.pares.length / k.viajes.length * 100 : null;
  const palas = sum(k.diario, d => d.unid);
  const internos = sum(k.diario, d => d.internos);
  const porChofer = agrupar(k.viajes, v => v.chofer || '(sin chofer)');
  const chof = Object.keys(porChofer).map(n => {
    const vs = porChofer[n];
    const prs = k.pares.filter(p => p.v.chofer === n);
    const cc = k.ciclos.filter(x => x.v.chofer === n).map(x => x.min).sort((a, b) => a - b);
    return { n: n, viajes: vs.length, dias: new Set(vs.map(v => v.fecha)).size, t: sum(prs, p => p.p.neto), prom: prs.length ? sum(prs, p => p.p.neto) / prs.length : null, ciclo: quant(cc, 0.5), sinT: k.sinTicket.filter(v => v.chofer === n).length };
  }).sort((a, b) => b.viajes - a.viajes);
  const porOrigen = agrupar(k.viajesTot, v => v.origen || '(sin origen)');
  const origenes = Object.keys(porOrigen).sort((a, b) => porOrigen[b].length - porOrigen[a].length);
  c.innerHTML = guia([
    ['Camiones a planta (palas)', 'lo que declaran los operadores de pala en la jornada; los viajes internos de cantera se informan aparte.'],
    ['Viajes a planta', 'comprobantes cargados con destino ' + (destinosPlanta().join(', ') || 'cualquiera') + '.'],
    ['Tickets', 'pesadas de la balanza de ingreso. Un viaje se cruza con un ticket si coincide el dominio y la hora (±' + par('VENTANA_MATCH_MIN', 120) + ' min).'],
    ['Ciclo', 'tiempo entre hora de carga y descarga de cada viaje.']
  ]) + '<div class="kpis stagger">' +
    kpi('Camiones a planta (palas)', vn(palas), nf(internos) + ' viajes internos aparte', '', 'Declarado en la jornada de cantera.') +
    kpi('Viajes a planta', vn(k.viajes.length), nf(k.viajesTot.length) + ' viajes totales', 'kacc') +
    kpi('Diferencia palas − viajes', vn(palas - k.viajes.length), palas ? nf((palas - k.viajes.length) / palas * 100, 0) + '% de lo declarado' : '', Math.abs(palas - k.viajes.length) > palas * 0.1 ? 'warn' : 'ok', 'Si es alta, faltan comprobantes por cargar o hay viajes internos declarados como a planta.') +
    kpi('Tickets de balanza', vn(k.pes.length), nf(netoT, 0) + ' t netas') +
    kpi('Viajes con ticket', pctMatch === null ? '–' : vn(pctMatch) + '<small>%</small>', nf(k.pares.length) + ' cruzados', pctMatch !== null && pctMatch < 90 ? 'bad' : 'ok', 'Porcentaje de viajes a planta que se encontraron en la balanza.') +
    kpi('Ciclo mediano', vn(cicMed) + '<small>min</small>', 'carga → descarga') +
    '</div>' + caja('chConc', 'Conciliación diaria', 'Palas · viajes cargados · tickets de balanza. Tocá un día para el detalle.', 'lg') +
    '<div class="grid g2">' + caja('chChof', 'Viajes por chofer', 'Período seleccionado') + caja('chOri', 'Viajes por origen', 'Incluye todos los destinos') + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Choferes</h3><div class="sub">Viajes a planta, toneladas cruzadas con balanza y ciclo mediano</div></div></div>' +
    tabla([['n', 'Chofer'], ['viajes', 'Viajes', 'n'], ['dias', 'Días', 'n'], [r => nf(r.viajes / (r.dias || 1), 1), 'Viajes/día', 'n'], [r => nf(r.t, 1), 't (con ticket)', 'n'], [r => nf(r.prom, 1), 't/viaje', 'n'], [r => nf(r.ciclo, 0), 'Ciclo min', 'n'],
      [r => r.sinT ? '<span class="tag t-warn">' + r.sinT + '</span>' : '<span class="tag t-ok">0</span>', 'Sin ticket']], chof, { max: true }) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Conciliación por día</h3></div><button class="btn sm" id="csvConc">' + ICON.descargar + 'CSV</button></div>' +
    tabla([[r => '<a href="#/dia/' + r.fecha + '">' + fMedia(r.fecha) + '</a>', 'Fecha'], ['unid', 'Palas a planta', 'n'], ['internos', 'Internos', 'n'], ['viajes', 'Viajes planta', 'n'], ['tickets', 'Tickets', 'n'],
      ['pares', 'Cruzados', 'n'], [r => nf(r.neto, 1), 't netas', 'n'],
      [r => (Math.abs(r.unid - r.viajes) > Math.max(2, r.unid * 0.1) || (r.tickets && r.viajes !== r.tickets)) ? '<span class="tag t-warn">revisar</span>' : '<span class="tag t-ok">ok</span>', 'Estado']],
    k.diario.slice().reverse(), { max: true }) + '</div>' +
    '<div class="grid g2"><div class="card"><div class="card-h"><div class="t"><h3>Viajes sin ticket</h3></div><button class="btn sm" id="csvST">' + ICON.descargar + 'CSV</button></div>' +
    (k.pes.length ? tabla([[r => fCorta(r.fecha), 'Fecha'], ['comprobante', 'Comp.'], ['horaCarga', 'Carga'], ['horaDescarga', 'Desc.'], ['chofer', 'Chofer'], ['dominio', 'Dominio']], k.sinTicket, { max: true, vacio: 'Todos los viajes tienen ticket.' }) : vacio('Sin pesajes importados en el período.')) +
    '</div><div class="card"><div class="card-h"><div class="t"><h3>Tickets sin viaje</h3></div><button class="btn sm" id="csvSV">' + ICON.descargar + 'CSV</button></div>' +
    tabla([[r => fCorta(r.fecha), 'Fecha'], ['hora', 'Hora'], ['ticket', 'Ticket'], ['dominio', 'Dominio'], [r => nf(r.neto, 2), 'Neto t', 'n'], ['producto', 'Producto']], k.sinViaje, { max: true, vacio: 'Todos los tickets tienen viaje.' }) +
    '</div></div>' + (k.atipicos.length ? '<div class="card"><div class="card-h"><div class="t"><h3>Netos fuera de lo normal</h3><div class="sub">Fuera de 1,5 × rango intercuartil del mismo dominio</div></div></div>' +
      tabla([[r => fCorta(r.fecha), 'Fecha'], ['hora', 'Hora'], ['ticket', 'Ticket'], ['dominio', 'Dominio'], [r => nf(r.neto, 2), 'Neto t', 'n'], [r => nf(r.mediana, 2), 'Mediana dominio', 'n']], k.atipicos, { max: true }) + '</div>' : '');
  const L = k.diario.map(d => fCorta(d.fecha));
  grafico('chConc', 'bar', L, [
    { label: 'Palas: camiones a planta', data: k.diario.map(d => d.unid), backgroundColor: color(1) },
    { label: 'Viajes a planta', data: k.diario.map(d => d.viajes), backgroundColor: color(2) },
    { label: 'Tickets balanza', data: k.diario.map(d => d.tickets), backgroundColor: color(3) }
  ], null, irDia(k.diario));
  const ch = chof.slice(0, 15);
  grafico('chChof', 'bar', ch.map(x => x.n), [{ label: 'Viajes', data: ch.map(x => x.viajes), backgroundColor: color(1) }], { indexAxis: 'y', scales: { x: { beginAtZero: true }, y: { ticks: { autoSkip: false } } } });
  grafico('chOri', 'doughnut', origenes, [{ data: origenes.map(o => porOrigen[o].length), backgroundColor: origenes.map((_, i) => color(i % 8 + 1)), borderColor: cssVar('--chart-surface'), borderWidth: 2 }]);
  $('#csvConc').onclick = () => csv('conciliacion_' + S.desde + '_' + S.hasta, [['fecha', 'Fecha'], ['unid', 'Palas a planta'], ['internos', 'Internos'], ['viajesTot', 'Viajes totales'], ['viajes', 'Viajes planta'], ['tickets', 'Tickets'], ['pares', 'Cruzados'], ['neto', 't netas']], k.diario);
  $('#csvST').onclick = () => csv('viajes_sin_ticket', [['fecha', 'Fecha'], ['comprobante', 'Comprobante'], ['nroViaje', 'N viaje'], ['horaCarga', 'Hora carga'], ['horaDescarga', 'Hora descarga'], ['chofer', 'Chofer'], ['dominio', 'Dominio'], ['origen', 'Origen'], ['destino', 'Destino']], k.sinTicket);
  $('#csvSV').onclick = () => csv('tickets_sin_viaje', [['fecha', 'Fecha'], ['hora', 'Hora'], ['ticket', 'Ticket'], ['dominio', 'Dominio'], ['neto', 'Neto t'], ['producto', 'Producto']], k.sinViaje);
}

function tabCantera(c) {
  const R = S.rango;
  const st = statsCantera(R);
  const porDia = agrupar(R.tramos.filter(t => t.tipo === 'Producción'), t => t.fecha);
  const fechas = Object.keys(porDia).sort();
  const palas = st.maqs.filter(x => x.tipo === 'pala');
  const hProd = sum(st.maqs, x => x.hProd);
  const hPar = sum(st.maqs, x => x.hPar);
  const unid = sum(st.maqs, x => x.unid);
  const internos = sum(st.maqs, x => x.internos);
  const palCam = sum(st.maqs, x => x.palCam);
  c.innerHTML = guia([
    ['Camiones a planta / internos', 'camiones cargados por las palas, separados entre los que van a la fábrica y los viajes cortos dentro de la cantera.'],
    ['Disponibilidad', 'horas programadas de producción / (producción + paradas).'],
    ['Utilización', 'horas de horómetro / horas programadas de producción.'],
    ['Paladas por camión', 'paladas a camión / camiones cargados (por defecto se calcula × ' + par('PALADAS_POR_CAMION', 7) + ').']
  ]) + '<div class="kpis stagger">' +
    kpi('Camiones a planta', vn(unid), 'declarados por palas', 'kacc') +
    kpi('Viajes internos', vn(internos), 'dentro de la cantera') +
    kpi('Paladas a acopio', vn(sum(st.maqs, x => x.palAco))) +
    kpi('Paladas por camión', vn(unid + internos ? palCam / (unid + internos) : null, 1), nf(palCam) + ' paladas a camión') +
    kpi('Horas de horómetro', vn(sum(st.maqs, x => x.hHor))) +
    kpi('Disponibilidad', vn(hProd + hPar > 0 ? hProd / (hProd + hPar) * 100 : null) + '<small>%</small>', nf(hPar, 0) + ' h de parada', '', 'Horas programadas productivas / totales.') +
    kpi('Combustible', vn(sum(st.maqs, x => x.litros)) + '<small>L</small>', nf(sum(st.maqs, x => x.hHor) ? sum(st.maqs, x => x.litros) / sum(st.maqs, x => x.hHor) : null, 1) + ' L/h') +
    '</div>' + caja('chCam', 'Camiones cargados por día', 'A planta e internos (palas). Tocá un día para el detalle.', 'lg') +
    '<div class="grid g2"><div class="card"><div class="card-h"><div class="t"><h3>Rendimiento</h3><div class="sub">Camiones cargados por hora de horómetro</div></div><div id="segRend"></div></div><div class="chart"><canvas id="chRend"></canvas></div></div>' +
    caja('chCaus', 'Horas de parada por causa', '') + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Resumen por máquina</h3></div><button class="btn sm" id="csvMaq">' + ICON.descargar + 'CSV</button></div>' +
    tabla([['n', 'Máquina'], ['tipo', 'Tipo'], [r => nf(r.hHor, 1), 'h horóm.', 'n'], [r => nf(r.hPar, 1), 'h parada', 'n'],
      [r => nf(r.disp, 0) + '%', 'Disp.', 'n'], [r => nf(r.utiliz, 0) + '%', 'Utiliz.', 'n'], ['unid', 'A planta', 'n'], ['internos', 'Internos', 'n'], ['palAco', 'Pal. acopio', 'n'],
      [r => nf(r.camH, 1), 'Cam/h', 'n'], [r => nf(r.litros, 0), 'Litros', 'n'], [r => nf(r.lH, 1), 'L/h', 'n']], st.maqs) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Operadores</h3></div></div>' +
    tabla([['n', 'Operador'], ['maqs', 'Máquinas'], ['dias', 'Días', 'n'], [r => nf(r.hHor, 1), 'h horóm.', 'n'], ['cam', 'Camiones', 'n'], [r => nf(r.camDia, 1), 'Cam/día', 'n'], ['pal', 'Paladas', 'n'], [r => nf(r.palH, 1), 'Pal/h', 'n']], st.ops) + '</div>';
  grafico('chCam', 'bar', fechas.map(fCorta), [
    { label: 'A planta', data: fechas.map(f => sum(porDia[f], t => t.unidadesCargadas)), backgroundColor: color(1) },
    { label: 'Internos', data: fechas.map(f => sum(porDia[f], t => t.viajesInternos)), backgroundColor: color(2) }
  ], { scales: { x: { stacked: true }, y: { stacked: true } } }, irDia(fechas));
  const rend = k => {
    const arr = k === 'op' ? st.ops.filter(o => o.hHor > 0).map(o => ({ n: o.n, v: o.cam / o.hHor })) : palas.filter(x => x.camH !== null).map(x => ({ n: x.n, v: x.camH }));
    grafico('chRend', 'bar', arr.map(x => x.n), [{ label: 'Camiones/h', data: arr.map(x => x.v), backgroundColor: color(1) }], { indexAxis: 'y', scales: { y: { ticks: { autoSkip: false } } } });
  };
  segmento($('#segRend'), [['maq', 'Máquina'], ['op', 'Operador']], 'maq', rend, true);
  rend('maq');
  const ck = Object.keys(st.causas);
  if (ck.length) grafico('chCaus', 'doughnut', ck, [{ data: ck.map(k => st.causas[k]), backgroundColor: ck.map((_, i) => color(i % 8 + 1)), borderColor: cssVar('--chart-surface'), borderWidth: 2 }], { plugins: { legend: { position: 'right' } } });
  else $('#chCaus').parentElement.innerHTML = vacio('Sin paradas en el período.');
  $('#csvMaq').onclick = () => csv('cantera_maquinas_' + S.desde + '_' + S.hasta, [['n', 'Maquina'], ['tipo', 'Tipo'], ['hHor', 'h horometro'], ['hProd', 'h prog produccion'], ['hPar', 'h parada'], ['unid', 'Camiones planta'], ['internos', 'Internos'], ['palCam', 'Paladas camion'], ['palAco', 'Paladas acopio'], ['litros', 'Litros']], st.maqs);
}

function tabCalidad(c) {
  const C = S.rango.calidad || [];
  const n = C.length;
  const cnt = e => C.filter(x => x.estado === e).length;
  const conComp = C.filter(x => x.arcilla !== null || x.limo !== null || x.arena !== null);
  const prom = k => conComp.length ? sum(conComp, x => x[k]) / conComp.length : null;
  const porOr = agrupar(C, x => x.origen || '(sin origen)');
  const orig = Object.keys(porOr).sort();
  const defs = [['piedras', 'Piedras'], ['raices', 'Raíces'], ['calcareo', 'Calcáreo / tosca'], ['humedadExcesiva', 'Humedad excesiva'], ['materialExtrano', 'Material extraño']];
  const porFecha = agrupar(conComp, x => x.fecha);
  const fs = Object.keys(porFecha).sort();
  c.innerHTML = guia([
    ['Ensayo de sedimentación', 'en frasco con agua: la arena decanta primero, después el limo y arriba la arcilla. Se informa el % de cada capa.'],
    ['Estado', 'Aceptado, Observado (se descarga con reparos) o Rechazado.']
  ]) + '<div class="kpis stagger">' + kpi('Muestras', vn(n)) +
    kpi('Aceptadas', vn(n ? cnt('Aceptado') / n * 100 : null) + '<small>%</small>', nf(cnt('Aceptado')) + ' muestras', 'ok') +
    kpi('Observadas', vn(n ? cnt('Observado') / n * 100 : null) + '<small>%</small>', nf(cnt('Observado')) + ' muestras', 'warn') +
    kpi('Rechazadas', vn(n ? cnt('Rechazado') / n * 100 : null) + '<small>%</small>', nf(cnt('Rechazado')) + ' muestras', cnt('Rechazado') ? 'bad' : '') +
    kpi('Arcilla', vn(prom('arcilla'), 1) + '<small>%</small>', conComp.length + ' ensayos', 'kacc') + kpi('Limo', vn(prom('limo'), 1) + '<small>%</small>') + kpi('Arena', vn(prom('arena'), 1) + '<small>%</small>') +
    '</div>' + (n ? '<div class="grid g2">' + caja('chEst', 'Estado por origen', 'Cantidad de muestras') + caja('chComp', 'Composición promedio por origen', '% arcilla / limo / arena') + '</div>' +
    '<div class="grid g2">' + caja('chDef', 'Defectos detectados', '% de muestras con cada defecto') + caja('chEvo', 'Evolución de la composición', 'Promedio diario') + '</div>' : '<div class="card mt">' + vacio('Sin muestras de calidad en el período.') + '</div>') +
    '<div class="card"><div class="card-h"><div class="t"><h3>Muestras observadas y rechazadas</h3></div><button class="btn sm" id="csvCal">' + ICON.descargar + 'CSV</button></div>' +
    tabla([[r => fCorta(r.fecha), 'Fecha'], ['hora', 'Hora'], [r => '<span class="tag ' + (r.estado === 'Rechazado' ? 't-bad' : 't-warn') + '">' + r.estado + '</span>', 'Estado'], ['dominio', 'Dominio'], ['chofer', 'Chofer'], ['origen', 'Origen'],
      [r => defs.filter(d => r[d[0]]).map(d => d[1]).join(', '), 'Defectos'], [r => [r.arcilla, r.limo, r.arena].map(x => x === null ? '–' : nf(x, 0)).join(' / '), 'A/L/Ar %'], [r => esc(r.observaciones), 'Obs.', 'wrap']],
    C.filter(x => x.estado !== 'Aceptado').reverse(), { max: true, vacio: 'Sin muestras observadas ni rechazadas.' }) + '</div>';
  if (n) {
    const estados = [['Aceptado', cssVar('--ok')], ['Observado', cssVar('--warn')], ['Rechazado', cssVar('--bad')]];
    grafico('chEst', 'bar', orig, estados.map(e => ({ label: e[0], data: orig.map(o => porOr[o].filter(x => x.estado === e[0]).length), backgroundColor: e[1] })), { scales: { x: { stacked: true }, y: { stacked: true } } });
    const oc = orig.filter(o => porOr[o].some(x => x.arcilla !== null));
    const pr = (o, k) => { const a = porOr[o].filter(x => x[k] !== null); return a.length ? sum(a, x => x[k]) / a.length : 0; };
    grafico('chComp', 'bar', oc, [['Arcilla', 1, 'arcilla'], ['Limo', 2, 'limo'], ['Arena', 3, 'arena']].map(x => ({ label: x[0], data: oc.map(o => pr(o, x[2])), backgroundColor: color(x[1]) })),
      { indexAxis: 'y', scales: { x: { stacked: true, max: 100 }, y: { stacked: true } } });
    grafico('chDef', 'bar', defs.map(d => d[1]), [{ label: '% muestras', data: defs.map(d => C.filter(x => x[d[0]]).length / n * 100), backgroundColor: color(7) }]);
    const pf = (f, k) => { const a = porFecha[f].filter(x => x[k] !== null); return a.length ? sum(a, x => x[k]) / a.length : null; };
    grafico('chEvo', 'line', fs.map(fCorta), [['Arcilla', 1, 'arcilla'], ['Limo', 2, 'limo'], ['Arena', 3, 'arena']].map(x => ({ label: x[0], data: fs.map(f => pf(f, x[2])), borderColor: color(x[1]), backgroundColor: color(x[1]), spanGaps: true, pointRadius: 3 })), { scales: { y: { max: 100 } } }, irDia(fs));
  }
  $('#csvCal').onclick = () => csv('calidad_' + S.desde + '_' + S.hasta, [['fecha', 'Fecha'], ['hora', 'Hora'], ['dominio', 'Dominio'], ['comprobante', 'Comprobante'], ['ticket', 'Ticket'], ['origen', 'Origen'], ['chofer', 'Chofer'],
    ['estado', 'Estado'], ['arcilla', 'Arcilla %'], ['limo', 'Limo %'], ['arena', 'Arena %'], ['piedras', 'Piedras'], ['raices', 'Raices'], ['calcareo', 'Calcareo'], ['humedadExcesiva', 'Humedad'], ['materialExtrano', 'Mat. extrano'], ['color', 'Color'], ['observaciones', 'Obs']], C);
}

function tabCombustible(c) {
  const cis = S.resumen.cisterna;
  const R = S.rango;
  const st = statsCantera(R);
  const comb = R.combustible || [];
  const porDia = agrupar(comb, x => x.fecha);
  const fd = Object.keys(porDia).sort();
  const maqs = Array.from(new Set(comb.map(x => x.maquina)));
  if (!cis || cis.error) {
    c.innerHTML = '<div class="alert info">' + ICON.infoI + '<div>Configurá <b>COMBUSTIBLE_ID</b> en Parámetros para ver la cisterna y el consumo de gasoil.' + (cis && cis.error ? ' (' + esc(cis.error) + ')' : '') + '</div></div>';
    return;
  }
  const serie = (cis.serie || []).filter(d => d.fecha >= S.desde && d.fecha <= S.hasta);
  const conL = st.maqs.filter(x => x.lH !== null && x.litros > 0);
  c.innerHTML = guia([
    ['Nivel de cisterna', 'ajuste inicial de la hoja Configuración + cargas de "Cisterna Principal" − cargas a las máquinas.'],
    ['Autonomía', 'nivel actual / consumo medio de los últimos 14 días con cargas.'],
    ['L/h', 'litros cargados en el período / horas de horómetro de la máquina.']
  ]) + '<div class="grid g-21"><div>' + caja('chNivel', 'Nivel de la cisterna', 'Litros al cierre de cada día', 'lg') + '</div>' + gaugeCisterna(cis) + '</div>' +
    '<div class="grid g2">' + caja('chMov', 'Entradas y salidas de la cisterna', 'Litros por día', '') + caja('chCons', 'Consumo diario por máquina', 'Litros cargados', '') + '</div>' +
    '<div class="grid g2">' + caja('chLh', 'Litros por hora de horómetro', 'Período seleccionado') +
    '<div class="card"><div class="card-h"><div class="t"><h3>Resumen por máquina</h3></div></div>' + tabla([['n', 'Máquina'], [r => nf(r.litros, 0), 'Litros', 'n'], [r => nf(r.hHor, 1), 'h horóm.', 'n'], [r => nf(r.lH, 1), 'L/h', 'n']], st.maqs.filter(x => x.litros > 0)) + '</div></div>';
  requestAnimationFrame(() => $$('.gauge .arco').forEach(a => { a.style.strokeDashoffset = a.dataset.off; }));
  const L = serie.map(d => fCorta(d.fecha));
  grafico('chNivel', 'line', L, [{ label: 'Nivel L', data: serie.map(d => d.nivel), borderColor: color(1), backgroundColor: color(1), fill: false }], { scales: { y: { beginAtZero: true, suggestedMax: cis.capacidad || undefined } } });
  grafico('chMov', 'bar', L, [
    { label: 'Entrada L', data: serie.map(d => d.entrada), backgroundColor: color(3) },
    { label: 'Salida L', data: serie.map(d => d.salida), backgroundColor: color(2) }
  ]);
  grafico('chCons', 'bar', fd.map(fCorta), maqs.slice(0, 8).map((m, i) => ({ label: m, data: fd.map(f => sum(porDia[f].filter(x => x.maquina === m), x => x.litros)), backgroundColor: color(i + 1) })), { scales: { x: { stacked: true }, y: { stacked: true } } });
  grafico('chLh', 'bar', conL.map(x => x.n), [{ label: 'L/h', data: conL.map(x => x.lH), backgroundColor: color(4) }]);
}

async function vCalendario(mes, dir) {
  const ok = vivo();
  await cargarResumen();
  if (!ok()) return;
  const ym = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : hoy().slice(0, 7);
  const metrica = lsGet('tierra_cal_metrica', 'viajes');
  const y = Number(ym.slice(0, 4));
  const mo = Number(ym.slice(5, 7)) - 1;
  const D = {};
  (S.resumen.diario || []).forEach(d => { D[d.fecha] = d; });
  const prim = new Date(y, mo, 1).getDay();
  const dias = new Date(y, mo + 1, 0).getDate();
  const ant = iso(new Date(y, mo - 1, 1)).slice(0, 7);
  const sig = iso(new Date(y, mo + 1, 1)).slice(0, 7);
  const tit = new Date(y, mo, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const val = x => !x ? 0 : metrica === 'ingreso' ? x.ingresoT : metrica === 'molienda' ? x.molT || x.molPal : metrica === 'palas' ? x.unid + x.internos : x.viajes;
  let max = 1;
  for (let d = 1; d <= dias; d++) max = Math.max(max, val(D[ym + '-' + pad(d)]));
  let h = '';
  for (let i = 0; i < prim; i++) h += '<div class="c vacio"></div>';
  let tV = 0;
  let tT = 0;
  let tM = 0;
  let tP = 0;
  for (let d = 1; d <= dias; d++) {
    const f = ym + '-' + pad(d);
    const x = D[f];
    let ev = '';
    let lin = '';
    let tip = fLarga(f);
    if (x) {
      tV += x.viajes;
      tT += x.ingresoT;
      tM += x.molT;
      tP += x.unid + x.internos;
      if (x.prod) ev += '<i class="t-ok">PROD</i>';
      x.paradas.forEach(p => {
        if (/clim/i.test(p)) ev += '<i class="t-info">CLIMA</i>';
        else if (/ausencia|sin operario/i.test(p)) ev += '<i class="t-warn">FALTA</i>';
        else ev += '<i class="t-bad">PARADA</i>';
      });
      if (x.rechazos) ev += '<i class="t-bad">RECH ' + x.rechazos + '</i>';
      if (x.viajes) lin += '<div class="ln"><span>Viajes</span><span>' + x.viajes + '</span></div>';
      if (x.ingresoT) lin += '<div class="ln"><span>Ingreso</span><span>' + nf(x.ingresoT, 0) + ' t</span></div>';
      if (x.unid + x.internos) lin += '<div class="ln"><span>Palas</span><span>' + (x.unid + x.internos) + '</span></div>';
      tip += ' · ' + x.viajes + ' viajes · ' + nf(x.ingresoT, 0) + ' t ingresadas · ' + (x.unid + x.internos) + ' camiones (palas) · ' + nf(x.molPal) + ' paladas molienda' + (x.paradas.length ? ' · Paradas: ' + x.paradas.join(', ') : '');
    }
    const heat = val(x) / max * 0.28;
    h += '<a class="c ' + (f === hoy() ? 'hoy ' : '') + (new Date(y, mo, d).getDay() === 0 ? 'domingo' : '') + '" href="#/dia/' + f + '" style="--heat:' + heat.toFixed(3) + ';--i:' + d + '" data-tip="' + esc(tip) + '"><b>' + d + '</b>' + lin + '<div class="ev">' + ev + '</div></a>';
  }
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Calendario</div><h1>Actividad diaria</h1><p class="sub">La intensidad del color indica la métrica elegida. Tocá un día para ver el detalle completo.</p></div><div id="segMet"></div></div>' +
    '<div class="card"><div class="cal-h"><a class="btn icon" href="#/calendario/' + ant + '" data-dir="der" aria-label="Mes anterior">' + ICON.izq + '</a><h2>' + tit + '</h2><a class="btn icon" href="#/calendario/' + sig + '" data-dir="izq" aria-label="Mes siguiente">' + ICON.der + '</a></div>' +
    '<div class="cal ' + (dir ? 'anim-' + dir : '') + '">' + ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => '<div class="dn">' + d + '</div>').join('') + h + '</div>' +
    '<div class="leg"><span class="esc">Menos <i style="opacity:.1"></i><i style="opacity:.3"></i><i style="opacity:.55"></i><i style="opacity:.8"></i> Más</span><span><i class="tag t-ok">PROD</i> producción</span><span><i class="tag t-bad">PARADA</i> avería/mant.</span><span><i class="tag t-info">CLIMA</i> clima</span><span><i class="tag t-warn">FALTA</i> ausencia</span></div></div>' +
    '<div class="kpis mt stagger">' + kpi('Viajes a planta', vn(tV)) + kpi('Ingreso balanza', vn(tT) + '<small>t</small>') + kpi('Camiones (palas)', vn(tP)) + kpi('Molienda (bal. dinámica)', vn(tM) + '<small>t</small>') + '</div></div>';
  $$('.leg .esc i').forEach(i => { i.style.background = 'var(--accent)'; });
  segmento($('#segMet'), [['viajes', 'Viajes'], ['ingreso', 'Ingreso t'], ['palas', 'Palas'], ['molienda', 'Molienda']], metrica, k => { lsSet('tierra_cal_metrica', k); vCalendario(ym); }, true);
  $$('.cal-h a').forEach(a => a.addEventListener('click', () => { S.calDir = a.dataset.dir; }));
  stagger(app());
  contar(app());
}

async function vDia(f) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) f = hoy();
  app().innerHTML = '<div class="vista"><div class="card"><div class="skel" style="height:40px;width:60%"></div><div class="kpis mt">' + '<div class="skel" style="height:90px"></div>'.repeat(6) + '</div></div><div class="card"><div class="skel" style="height:200px"></div></div></div>';
  const ok = vivo();
  await cargarResumen();
  const j = await api('jornada', { fecha: f });
  if (!ok()) return;
  const k = conciliar(j);
  const pal = j.tramos.filter(t => t.tipo === 'Producción');
  const neto = sum(k.pes, p => p.neto);
  const unid = sum(pal, t => t.unidadesCargadas);
  const internos = sum(pal, t => t.viajesInternos);
  const molR = agrupar(j.molienda, m => m.turno);
  const siloR = agrupar(j.silo, s => s.turno);
  const turnos = Array.from(new Set(Object.keys(molR).concat(Object.keys(siloR)))).sort();
  const elegir = arr => (arr || []).find(x => x.fuente === 'Manual') || (arr || [])[0] || null;
  const acc = [];
  if (puede('jornada')) acc.push('<a class="btn" href="#/cargar/jornada/' + f + '">' + ICON.pala + 'Jornada</a>');
  if (puede('viajes')) acc.push('<a class="btn" href="#/cargar/viajes/' + f + '">' + ICON.camion + 'Viajes</a>');
  if (puede('molienda')) acc.push('<a class="btn" href="#/cargar/molienda/' + f + '">' + ICON.molienda + 'Molienda</a>');
  if (puede('calidad')) acc.push('<a class="btn" href="#/cargar/calidad/' + f + '">' + ICON.calidad + 'Calidad</a>');
  if (S.ses) acc.push('<button class="btn" id="bParte">' + ICON.correo + 'Enviar parte</button>');
  const porMaq = agrupar(j.tramos, t => t.maquina);
  const conTicket = new Set(k.pares.map(p => p.v));
  const aPlanta = new Set(k.viajes);
  const porChofer = agrupar(j.viajes, v => v.chofer + ' · ' + v.dominio);
  const pos = h => { const m = minDe(h); return m === null ? 0 : m / 1440 * 100; };
  const barra = (ini, fin, cls, txt, tip, i) => {
    const a = pos(ini);
    let b = pos(fin);
    if (b <= a) b = 100;
    return '<div class="tl-b ' + cls + '" style="left:' + a + '%;width:' + Math.max(b - a, 0.8) + '%;--i:' + i + '" data-tip="' + esc(tip) + '">' + esc(txt) + '</div>';
  };
  let n = 0;
  const filasMaq = Object.keys(porMaq).map(mq => '<div class="tl-fila"><div class="nom" title="' + esc(mq) + '">' + esc(mq) + '</div><div class="pista">' + porMaq[mq].map(t => barra(t.horaInicio, t.horaFin, t.tipo === 'Producción' ? 'prod' : 'par',
    t.tipo === 'Producción' ? (t.operador || '').split(',')[0] : t.motivoParada, t.horaInicio + '–' + t.horaFin + ' · ' + (t.tipo === 'Producción' ? t.operador + ' · ' + (t.unidadesCargadas || 0) + ' a planta, ' + (t.viajesInternos || 0) + ' internos' : t.motivoParada), n++)).join('') + '</div></div>').join('');
  const filasVia = Object.keys(porChofer).sort().map(ch => '<div class="tl-fila"><div class="nom" title="' + esc(ch) + '">' + esc(ch.split(' · ')[0].split(' ')[0]) + ' <span class="muted">' + esc(ch.split(' · ')[1] || '') + '</span></div><div class="pista">' +
    porChofer[ch].map(v => barra(v.horaCarga, v.horaDescarga || hDe(minDe(v.horaCarga) + 60), !aPlanta.has(v) ? 'viaje' : conTicket.has(v) || !k.pes.length ? 'viaje' : 'viaje sin', String(v.nroViaje || ''),
      'Comp. ' + v.comprobante + ' · ' + v.horaCarga + '→' + v.horaDescarga + ' · ' + v.origen + ' → ' + v.destino + (aPlanta.has(v) && k.pes.length ? (conTicket.has(v) ? ' · con ticket' : ' · SIN TICKET') : ''), n++)).join('') + '</div></div>').join('');
  const escala = '<div class="tl-esc"><div></div><div class="horas">' + [0, 3, 6, 9, 12, 15, 18, 21, 24].map(h => '<span style="left:' + (h / 24 * 100) + '%">' + pad(h) + '</span>').join('') + '</div></div>';
  app().innerHTML = '<div class="vista"><div class="card"><div class="card-h"><div class="row"><a class="btn icon" href="#/dia/' + addDias(f, -1) + '" aria-label="Día anterior">' + ICON.izq + '</a><div class="t" style="text-align:center;min-width:220px"><div class="eyebrow">Parte del día</div><h2>' + fLarga(f) +
    '</h2></div><a class="btn icon" href="#/dia/' + addDias(f, 1) + '" aria-label="Día siguiente">' + ICON.der + '</a></div><div class="row">' + acc.join('') + '<button class="btn" onclick="window.print()">' + ICON.imprimir + '</button></div></div>' +
    '<div class="kpis stagger">' + kpi('Palas: a planta', vn(unid), nf(internos) + ' viajes internos') + kpi('Viajes a planta', vn(k.viajes.length), nf(k.viajesTot.length) + ' totales', 'kacc') +
    kpi('Tickets balanza', vn(k.pes.length), nf(k.pares.length) + ' cruzados') + kpi('Ingreso', vn(neto, 1) + '<small>t</small>', k.pes.length ? nf(neto / k.pes.length, 1) + ' t/camión' : '') +
    kpi('Molienda', vn(sum(turnos, t => (elegir(molR[t]) || {}).toneladas || 0), 0) + '<small>t</small>', nf(sum(turnos, t => (elegir(molR[t]) || {}).paladas || 0)) + ' paladas') +
    kpi('Calidad', vn(j.calidad.length), j.calidad.filter(c => c.estado === 'Rechazado').length + ' rechazadas', j.calidad.some(c => c.estado === 'Rechazado') ? 'bad' : '') + '</div>' +
    (k.pes.length && (k.sinTicket.length || k.sinViaje.length) ? '<div class="alert warn mt">' + ICON.alerta + '<div>' + (k.sinTicket.length ? '<b>' + k.sinTicket.length + '</b> viaje(s) sin ticket de balanza. ' : '') + (k.sinViaje.length ? '<b>' + k.sinViaje.length + '</b> ticket(s) sin viaje registrado.' : '') + '</div></div>' : '') +
    (Math.abs(unid - k.viajes.length) > 2 && unid ? '<div class="alert info mt">' + ICON.infoI + '<div>Las palas declaran <b>' + unid + '</b> camiones a planta y hay <b>' + k.viajes.length + '</b> viajes cargados.</div></div>' : '') + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Línea de tiempo</h3><div class="sub">Máquinas (verde producción, rojo parada) y viajes por camión (azul; rayado = sin ticket de balanza). Pasá el mouse para ver el detalle.</div></div></div>' +
    (filasMaq || filasVia ? '<div class="timeline">' + escala + (filasMaq ? '<div class="eyebrow" style="margin:8px 0 4px">Cantera</div>' + filasMaq : '') + (filasVia ? '<div class="eyebrow" style="margin:14px 0 4px">Camiones</div>' + filasVia : '') + '</div>' : vacio('Sin actividad registrada.')) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Cantera</h3></div></div>' + (Object.keys(porMaq).length ? Object.keys(porMaq).map(mq => '<div class="eyebrow" style="margin:12px 0 6px">' + esc(mq) + '</div>' +
      tabla([[t => '<span class="tag ' + (t.tipo === 'Producción' ? 't-ok' : 't-bad') + '">' + t.tipo + '</span>', 'Tipo'], [t => t.horaInicio + '–' + t.horaFin, 'Horario'], [t => esc(t.tipo === 'Producción' ? t.operador : t.motivoParada), 'Operador / motivo'],
        [t => t.tipo === 'Producción' ? nf(t.horometroIni, 1) + ' → ' + nf(t.horometroFin, 1) : nf(t.horometroParada, 1), 'Horómetro'], [t => t.tipo === 'Producción' ? t.unidadesCargadas : '', 'A planta', 'n'], [t => t.tipo === 'Producción' ? (t.viajesInternos || 0) : '', 'Internos', 'n'],
        [t => t.tipo === 'Producción' ? t.paladasCamiones : '', 'Pal. cam.', 'n'], [t => t.tipo === 'Producción' ? t.paladasAcopios : '', 'Pal. acop.', 'n'], [t => esc(t.personal), 'Personal'], [t => esc(t.observaciones), 'Obs.', 'wrap']], porMaq[mq])).join('') : vacio('Sin jornada de cantera cargada.')) + '</div>' +
    '<div class="grid g2"><div class="card"><div class="card-h"><div class="t"><h3>Viajes</h3></div></div>' + tabla([[v => esc(v.comprobante) + '·' + (v.nroViaje || ''), 'Comp.'], ['horaCarga', 'Carga'], ['horaDescarga', 'Desc.'], ['chofer', 'Chofer'], ['dominio', 'Dominio'], [v => esc(v.origen) + ' → ' + esc(v.destino), 'Ruta'],
      [v => k.pares.some(p => p.v === v) ? '<span class="tag t-ok">' + nf(k.pares.find(p => p.v === v).p.neto, 1) + ' t</span>' : (!aPlanta.has(v) ? '<span class="tag t-mut">otro destino</span>' : k.pes.length ? '<span class="tag t-warn">sin ticket</span>' : '–'), 'Balanza']], j.viajes) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Balanza de ingreso</h3></div></div>' + tabla([['ticket', 'Ticket'], ['hora', 'Hora'], ['dominio', 'Dominio'], [p => nf(p.neto, 2), 'Neto t', 'n'], ['producto', 'Producto'],
      [p => p.tierra === false ? '<span class="tag t-mut">no tierra</span>' : (k.pares.some(x => x.p === p) ? '<span class="tag t-ok">con viaje</span>' : '<span class="tag t-warn">sin viaje</span>'), 'Cruce']], j.pesajes) + '</div></div>' +
    '<div class="grid g2"><div class="card"><div class="card-h"><div class="t"><h3>Molienda y silo</h3></div></div>' + tabla([[t => t, 'Turno'], [t => nf((elegir(molR[t]) || {}).paladas), 'Pal. cajón', 'n'], [t => nf((elegir(molR[t]) || {}).toneladas, 1), 't bal. din.', 'n'],
      [t => { const m = elegir(molR[t]); return m && m.paladas && m.toneladas ? nf(m.toneladas / m.paladas, 2) : '–'; }, 't/palada', 'n'], [t => nf((elegir(siloR[t]) || {}).paladas), 'Pal. silo', 'n'], [t => esc((elegir(molR[t]) || elegir(siloR[t]) || {}).fuente), 'Fuente']], turnos) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Calidad</h3></div></div>' + tabla([['hora', 'Hora'], ['dominio', 'Dominio'], ['origen', 'Origen'], [c => '<span class="tag ' + (c.estado === 'Aceptado' ? 't-ok' : c.estado === 'Rechazado' ? 't-bad' : 't-warn') + '">' + c.estado + '</span>', 'Estado'],
      [c => [c.arcilla, c.limo, c.arena].map(x => x === null ? '–' : nf(x, 0)).join(' / '), 'A/L/Ar %'], [c => esc(c.observaciones), 'Obs.', 'wrap']], j.calidad) + '</div></div></div>';
  stagger(app());
  contar(app());
  const bp = $('#bParte');
  if (bp) bp.onclick = () => enviarParte(f);
}

async function enviarParte(f) {
  let lista = [];
  try {
    lista = await api('correos');
  } catch (e) {
    return toast(e.message, 'bad');
  }
  if (!lista.length) return toast('No hay correos configurados', 'warn');
  modal('Enviar parte del ' + fCorta(f), '<p class="sub" style="margin-bottom:10px">Se envía el parte diario (cantera, viajes, balanza y calidad) con PDF adjunto.</p>' +
    lista.map((c, i) => '<label class="chk" style="display:flex;padding:7px 0"><input type="checkbox" data-i="' + i + '"' + (c.tipo !== 'CCO' ? ' checked' : '') + '> ' + esc(c.nombre || '') + ' <span class="sub">' + esc(c.email) + ' · ' + esc(c.tipo) + '</span></label>').join(''), [
    { txt: 'Cancelar' },
    {
      txt: 'Enviar', cls: 'pri', fn: async m => {
        const emails = $$('input[data-i]:checked', m).map(x => lista[Number(x.dataset.i)].email);
        if (!emails.length) { toast('Seleccioná destinatarios', 'warn'); return false; }
        try {
          await api('enviarParte', { fecha: f, emails: emails });
          toast('Parte enviado a ' + emails.length + ' destinatario(s)', 'ok');
        } catch (e) {
          toast(e.message, 'bad');
          return false;
        }
        return true;
      }
    }
  ]);
}
