'use strict';

function ultimoDiaDatos() {
  return addDias(hoy(), -1);
}

function tM3(t, b, exacto) {
  if (t === null || t === undefined || isNaN(t)) return { t: '–', m3: '' };
  return { t: (exacto ? '' : '≈ ') + nf(t) + ' t', m3: b.densidad ? '≈ ' + nf(t / b.densidad) + ' m³' : '' };
}

function tiraEquivalencias(b) {
  const hist = (S.resumen.diario || []).filter(d => d.tickets > 0).slice(-30);
  const tHist = hist.length ? sum(hist, d => d.ingresoT) / sum(hist, d => d.tickets) : null;
  const tCam = b.tickets ? b.ingreso / b.tickets : tHist;
  const tCan = tCam && b.unid ? b.unid * tCam : b.palCam ? b.palCam * b.fMol : null;
  const nodos = [
    ['Cantera', tCan, false, 'cargado a planta (' + nf(b.unid) + ' camiones)'],
    ['Viajes', tCam ? b.viajes * tCam : null, false, nf(b.viajes) + ' viajes × ' + nf(tCam, 1) + ' t' + (b.tickets ? '' : ' (habitual)')],
    ['Balanza', b.ingreso, true, 'pesado al ingresar'],
    ['Playa', b.ingresoPlaya, true, 'entra a playa' + (b.rechT ? ' (sin rechazos)' : '')],
    ['Molienda', b.consumo, !b.estimados, nf(b.molPal) + ' paladas · ' + nf(b.molPal * b.m3Palada) + ' m³ de balde'],
    ['Silo', b.siloOut, false, 'extraído a producción']
  ];
  const motivo = ['', 'camiones cargados sin viaje registrado', 'viajes sin pesar', 'rechazos por calidad', 'se acumula (+) o se consume (−) de la playa', 'se acumula (+) o se consume (−) del silo'];
  const dif = (a, c) => a === null || c === null || a === undefined || c === undefined ? null : c - a;
  const fmtD = d => d === null ? '–' : (d > 0 ? '+' : d < 0 ? '−' : '') + nf(Math.abs(d)) + ' t';
  return '<div class="equiv"><div class="equiv-h"><b>Todo en t y m³</b><span class="sub">t exactas de balanza; «≈» estimado con ' + nf(b.m3Palada) + ' m³/palada y ' + nf(b.densidad, 2) + ' t/m³</span></div><div class="equiv-g">' +
    nodos.map((n, i) => {
      const v = tM3(n[1], b, n[2]);
      const ant = i ? dif(nodos[i - 1][1], n[1]) : null;
      const sig = i < nodos.length - 1 ? dif(n[1], nodos[i + 1][1]) : null;
      return '<div class="eq"><div class="l">' + n[0] + '</div><div class="v">' + v.t + '</div><div class="m">' + v.m3 + '</div><div class="d">' + esc(n[3]) + '</div>' +
        (i ? '<div class="dl" title="' + esc(motivo[i]) + '">← ' + fmtD(ant) + '</div>' : '<div class="dl vacio">inicio</div>') +
        (i < nodos.length - 1 ? '<div class="dl" title="' + esc(motivo[i + 1]) + '">→ ' + fmtD(sig) + '</div>' : '') + '</div>';
    }).join('') + '</div><div class="sub equiv-n">← diferencia con el paso anterior · → con el siguiente. Negativo entre Balanza y Playa = rechazos; entre Playa y Molienda = lo que se consumió de la playa.</div></div>';
}

function nodoStock(b, cual) {
  const v = cual === 'playa' ? b.stockPlaya : b.stockSilo;
  const ini = cual === 'playa' ? b.inicioPlaya : b.inicioSilo;
  const inv = cual === 'playa' ? b.playaInvalidaDesde : b.siloInvalidoDesde;
  if (v !== null && v !== undefined) return { v: vn(v) + '<small> t</small>', m3: '≈ ' + nf(v / b.densidad) + ' m³' };
  return { v: '<span class="sin-dato">sin dato</span>', m3: !ini ? 'falta stock inicial o ajuste' : 'revisar desde ' + fCorta(inv) };
}

async function pintarProyeccion(cont, ok) {
  if (!cont) return;
  let pr;
  try { pr = await api('proyeccionPlaya', {}); } catch (e) { console.warn(e); return; }
  if (!ok() || !document.body.contains(cont)) return;
  const dn = pr.densidad || 1.4;
  const fin = pr.proyeccion[pr.proyeccion.length - 1] || {};
  const v7 = sum(pr.pasado, x => x.ingreso - x.consumo);
  const L = pr.pasado.map(x => fCorta(x.fecha)).concat(pr.proyeccion.map(x => fCorta(x.fecha)));
  const nP = pr.pasado.length;
  const pas = pr.pasado.map(x => x.stock).concat(pr.proyeccion.map(() => null));
  const unir = k => pr.pasado.map((x, i) => i === nP - 1 ? x.stock : null).concat(pr.proyeccion.map(x => x[k]));
  const sinStock = pr.stock === null;
  const res = sinStock ? '<div class="alert warn">' + ICON.alerta + '<div>El stock de playa no está validado (' + (pr.inicioPlaya ? 'el cálculo da negativo: faltan ingresos o un ajuste' : 'falta un stock inicial') + '). Se muestra solo el balance de ingreso y consumo esperado.</div></div>' :
    '<div class="kpis" style="margin-bottom:6px">' + kpi('Hoy', nf(pr.stock) + '<small>t</small>', '≈ ' + nf(pr.stock / dn) + ' m³', '') +
    kpi('Últimos 7 días', (v7 >= 0 ? '+' : '') + nf(v7) + '<small>t</small>', 'ingreso − molido', v7 < 0 ? 'warn' : 'ok') +
    kpi('En ' + pr.dias + ' días', '≈ ' + nf(fin.stock) + '<small>t</small>', nf(fin.stockMin) + ' a ' + nf(fin.stockMax) + ' t', pr.agota ? 'bad' : '') +
    kpi('Días de stock', pr.diasStock !== null && pr.diasStock !== undefined ? '≈ ' + nf(pr.diasStock, 1) + '<small> días</small>' : '–', 'stock ÷ ' + nf(pr.consumoHabitual) + ' t/día de molienda habitual', pr.diasStock !== null && pr.diasStock < 5 ? 'warn' : 'ok') + '</div>';
  cont.innerHTML = '<div class="card proy-card"><div class="card-h"><div class="t"><h3>Playa de molienda: 7 días atrás y ' + pr.dias + ' adelante</h3><div class="sub">Proyección con el ingreso y consumo habitual de cada día de la semana y el pronóstico de lluvia</div></div>' +
    (S.ses ? botonInforme('playa', { fecha: pr.hasta }, 'Informe') : '') + '</div>' + res +
    (sinStock ? '' : '<div class="chart" style="height:220px"><canvas id="chProy"></canvas></div>') +
    '<div class="proy-dias">' + pr.proyeccion.map(x => '<div class="' + (x.lluvia ? 'llueve' : '') + '"><span>' + fCorta(x.fecha) + ' ' + (x.clima ? climaIco(x.clima.codigo) : '') + '</span><b>' + (x.ingreso - x.consumo >= 0 ? '+' : '') + nf(x.ingreso - x.consumo) + ' t</b><span class="sub">' + (x.clima ? nf(x.clima.mm, 0) + ' mm · ' + nf(x.clima.tmax) + '°' : '') + '</span></div>').join('') + '</div>' +
    '<div class="leyenda"><span>Δ por día = ingreso esperado − consumo esperado</span><span>Lluvia: se espera el ' + nf(pr.factorLluvia * 100) + ' % del ingreso (' + esc(pr.fuenteLluvia) + ')</span>' + (pr.errorClima ? '<span class="rojo">Sin pronóstico: ' + esc(pr.errorClima) + '</span>' : '') + '</div></div>';
  enlazarInformes(cont);
  const iHoy = L.indexOf(fCorta(hoy()));
  if (typeof Chart !== 'undefined' && !S.lineaHoyOk) {
    S.lineaHoyOk = true;
    Chart.register({ id: 'lineaHoy', afterDatasetsDraw: ch => {
      const o = ch.options.plugins && ch.options.plugins.lineaHoy;
      if (!o || o.i === undefined || o.i < 0) return;
      const x = ch.scales.x.getPixelForValue(o.i);
      const a = ch.chartArea;
      const c2 = ch.ctx;
      const col = cssVar('--accent') || '#d96b3a';
      c2.save(); c2.strokeStyle = col; c2.lineWidth = 2; c2.setLineDash([4, 4]); c2.beginPath(); c2.moveTo(x, a.top); c2.lineTo(x, a.bottom); c2.stroke(); c2.setLineDash([]);
      c2.fillStyle = col; c2.font = '800 12px ' + (cssVar('--font') || 'sans-serif'); c2.textAlign = 'center'; c2.fillText('HOY', x, a.top + 12); c2.restore();
    } });
  }
  if (!sinStock) grafico('chProy', 'line', L, [
    { label: 'Stock calculado t', data: pas, borderColor: color(1), backgroundColor: color(1), pointRadius: 3 },
    { label: 'Proyección t', data: unir('stock'), borderColor: color(1), backgroundColor: color(1), borderDash: [6, 4], pointRadius: 2 },
    { label: 'Escenario favorable', data: unir('stockMax'), borderColor: 'transparent', backgroundColor: 'rgba(217,107,58,.14)', fill: '+1', pointRadius: 0 },
    { label: 'Escenario desfavorable', data: unir('stockMin'), borderColor: 'rgba(217,107,58,.35)', backgroundColor: 'rgba(217,107,58,.14)', borderDash: [2, 3], pointRadius: 0 }
  ], { scales: { y: { beginAtZero: true, min: 0 } }, plugins: { lineaHoy: { i: iHoy }, legend: { display: true, labels: { filter: it => it.text !== 'Escenario favorable' } } } });
  $$('.proy-dias > div', cont).forEach((d, i) => { if (pr.proyeccion[i] && pr.proyeccion[i].fecha === hoy()) d.classList.add('hoy'); });
}

async function vSolicitudes(cont) {
  if (!cont || !S.ses || rolN(S.ses.rol) !== 'admin') return;
  let l = [];
  try { l = await api('solicitudes'); } catch (e) { return; }
  if (!l.length) { cont.innerHTML = ''; return; }
  const txt = r => r.tipo === 'ajusteCisterna' ? 'Nivel de la cisterna de gasoil: ' + nf(num(r.datos.litros)) + ' L el ' + fCorta(r.datos.fecha) + ' ' + esc(r.datos.hora || '') : 'Stock de ' + esc(String(r.datos.nodo || '').toLowerCase()) + ' (' + esc(TIPO_AJUSTE_TXT[r.datos.tipo] || r.datos.tipo) + '): ' + nf(num(r.datos.toneladas)) + ' t el ' + fCorta(r.datos.fecha);
  cont.innerHTML = '<div class="card retenidos solicitudes"><div class="card-h"><div class="t"><h3>' + ICON.ajuste + ' Ajustes pendientes de autorización</h3><div class="sub">Solo cuentan cuando los autorizás.</div></div></div>' +
    l.map(r => '<div class="ret"><div class="txt"><b>' + txt(r) + '</b><div class="mot">Pedido por ' + esc(r.usuario) + ': «' + esc(r.motivo) + '»</div></div><div class="row"><button class="btn sm pri" data-sa="' + r.id + '">Autorizar</button><button class="btn sm dan" data-sr="' + r.id + '">Rechazar</button></div></div>').join('') + '</div>';
  const res = async (id, accion) => {
    let nota = '';
    if (accion === 'rechazar') {
      nota = await new Promise(ok2 => { modal('Rechazar ajuste', '<label class="f">Motivo del rechazo<input id="nRech" placeholder="Opcional"></label>', [{ txt: 'Cancelar', fn: () => { ok2(null); } }, { txt: 'Rechazar', cls: 'dan', fn: mm => { ok2($('#nRech', mm).value); return true; } }]); });
      if (nota === null) return;
    }
    bloquear(accion === 'aprobar' ? 'Aplicando el ajuste…' : 'Rechazando…');
    try { await api('resolverSolicitud', { id: id, accion: accion, nota: nota }); invalidar(); await cargarResumen(true); toast(accion === 'aprobar' ? 'Ajuste autorizado y aplicado' : 'Ajuste rechazado', 'ok'); vSolicitudes(cont); } catch (e) { toast(e.message, 'bad', 8000); } finally { desbloquear(); }
  };
  $$('[data-sa]', cont).forEach(b => { b.onclick = () => res(b.dataset.sa, 'aprobar'); });
  $$('[data-sr]', cont).forEach(b => { b.onclick = () => res(b.dataset.sr, 'rechazar'); });
}

async function misSolicitudes(cont, tipo) {
  if (!cont || !S.ses || rolN(S.ses.rol) === 'admin') return;
  let l = [];
  try { l = (await api('solicitudes')).filter(r => !tipo || r.tipo === tipo); } catch (e) { return; }
  cont.innerHTML = l.length ? '<div class="card"><div class="card-h"><div class="t"><h3>Mis pedidos de ajuste</h3><div class="sub">Los autoriza el administrador</div></div></div>' +
    tabla([[r => fCorta(r.ts.slice(0, 10)), 'Pedido'], [r => r.tipo === 'ajusteCisterna' ? nf(num(r.datos.litros)) + ' L cisterna' : nf(num(r.datos.toneladas)) + ' t ' + esc(String(r.datos.nodo || '').toLowerCase()), 'Ajuste'], [r => esc(r.motivo), 'Motivo', 'wrap'],
      [r => '<span class="tag ' + (r.estado === 'Aprobado' ? 't-ok' : r.estado === 'Rechazado' ? 't-bad' : 't-warn') + '">' + esc(r.estado) + '</span>' + (r.nota ? ' <span class="sub">' + esc(r.nota) + '</span>' : ''), 'Estado']], l) + '</div>' : '';
}

async function vRetenidos(cont) {
  if (!S.ses || rolN(S.ses.rol) !== 'admin' || !cont) return;
  let l = [];
  try { l = await api('retenidos'); } catch (e) { return; }
  if (!l.length) { cont.innerHTML = ''; return; }
  cont.innerHTML = '<div class="card retenidos"><div class="card-h"><div class="t"><h3>' + ICON.alerta + ' Informes retenidos</h3><div class="sub">No se enviaron porque los datos tienen problemas. Corregí y enviá, o descartá.</div></div></div>' +
    l.map(r => '<div class="ret"><div class="txt"><b>' + esc(r.asunto) + '</b>' + String(r.motivos || '').split(' | ').map(x => '<div class="mot">' + esc(x) + '</div>').join('') + '</div><div class="row">' +
      '<button class="btn sm" data-rv="' + esc(r.id) + '">Ver</button><button class="btn sm pri" data-re="' + esc(r.id) + '">Enviar igual</button><button class="btn sm dan" data-rd="' + esc(r.id) + '">Descartar</button></div></div>').join('') + '</div>';
  const res = async (id, accion) => {
    bloquear(accion === 'enviar' ? 'Enviando…' : 'Descartando…');
    try {
      const r = await api('resolverRetenido', { id: id, accion: accion });
      toast(accion === 'enviar' ? 'Informe enviado a ' + (r.enviados || 0) + ' destinatarios' : 'Informe descartado', 'ok');
      vRetenidos(cont);
    } catch (e) { toast(e.message, 'bad', 8000); } finally { desbloquear(); }
  };
  $$('[data-re]', cont).forEach(b => { b.onclick = () => res(b.dataset.re, 'enviar'); });
  $$('[data-rd]', cont).forEach(b => { b.onclick = () => res(b.dataset.rd, 'descartar'); });
  $$('[data-rv]', cont).forEach(b => { b.onclick = () => { const r = l.find(x => x.id === b.dataset.rv); abrirInforme(r.clave, { fecha: r.fecha, desde: r.desde, hasta: r.hasta }); }; });
}

async function vInicio() {
  const dSel = String(lsGet('tierra_inicio_dias', 7));
  const opDias = [['u', 'Último día'], ['7', '7 días'], ['15', '15 días'], ['30', '30 días']];
  const selDias = k => { lsSet('tierra_inicio_dias', k); vInicio(); };
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">' + esc(fLarga(hoy())) + '</div><h1>Control de <span>tierra</span></h1>' +
    '<p class="sub">De la cantera al silo.</p></div><div id="segDias"></div></div>' +
    '<div class="card flujo-card"><div class="skel" style="height:150px"></div></div><div class="grid g-21"><div class="card"><div class="skel" style="height:220px"></div></div><div class="card"><div class="skel" style="height:220px"></div></div></div></div>';
  segmento($('#segDias'), opDias, dSel, selDias, true);
  const ok = vivo();
  const p14 = S.ses ? api('rango', { desde: addDias(hoy(), -13), hasta: hoy() }) : Promise.resolve(null);
  p14.catch(() => null);
  await cargarResumen();
  if (!ok()) return;
  const ultimo = dSel === 'u';
  const dias = ultimo ? 1 : (Number(dSel) || 7);
  const hasta = ultimo ? ultimoDiaDatos() : hoy();
  const desde = addDias(hasta, -(dias - 1));
  const b = calcBalance(desde, hasta);
  const R = S.resumen;
  const cis = R.cisterna && !R.cisterna.error ? R.cisterna : null;
  const pctP = b.stockPlaya === null ? 0 : Math.max(0, Math.min(100, b.stockPlaya / (b.maxPlaya || 1) * 100));
  const pctS = b.stockSilo === null ? 0 : Math.max(0, Math.min(100, b.stockSilo / (b.maxSilo || 1) * 100));
  const nodo = (k, ic, l, v, d, ruta, extra) => '<div class="nodo ' + (extra ? 'stock' : '') + '" data-ir="' + ruta + '" data-k="' + k + '"><div class="ic">' + ICON[ic] + '</div><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="d">' + d + '</div>' + (extra || '') + '</div>';
  const fuentes = [
    ['jornada', 'Jornada de cantera', 'pala', '#/cargar/jornada', 'abastecimiento'],
    ['gasoil', 'Gasoil de cantera', 'combustible', '#/cargar/gasoil', 'abastecimiento'],
    ['viajes', 'Viajes de camiones', 'camion', '#/cargar/viajes', 'abastecimiento'],
    ['pesajes', 'Balanza de ingreso', 'balanza', '#/cargar/pesaje', 'abastecimiento'],
    ['calidad', 'Calidad de tierra', 'calidad', '#/cargar/calidad', 'abastecimiento'],
    ['molienda', 'Molienda y silo', 'molienda', '#/cargar/molienda', 'molienda'],
    ['cubicacion', 'Ajuste de stock de playa', 'ajuste', '#/cargar/ajustes', 'molienda']
  ];
  const sp = nodoStock(b, 'playa');
  const ss = nodoStock(b, 'silo');
  const m3p = b.m3Palada;
  const tPal = num(par('T_POR_PALADA_CANTERA', 4.5)) || 4.5;
  const camT = b.unid + b.internos;
  const palPlanta = camT ? b.palCam * b.unid / camT : 0;
  const palAcop = b.palCam - palPlanta + (b.palAco || 0);
  const m3Pes = (b.palPes || 0) * m3p;
  const densBal = m3Pes ? b.ingreso / m3Pes : null;
  const molT = b.molT || 0;
  const ln = (a, c) => '<span class="nl"><b>' + a + '</b>' + (c ? ' ' + c : '') + '</span>';
  const per = ultimo ? 'Ayer: ' + fLarga(hasta) : 'Últimos ' + dias + ' días';
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">' + esc(fLarga(hoy())) + '</div><h1>Control de <span>tierra</span></h1>' +
    '<p class="sub">' + esc(per) + ' · de la cantera al silo.</p></div><div class="row">' + (S.ses ? botonInforme('diario', { fecha: addDias(hoy(), -1) }, 'Resumen diario') : '') + '<div id="segDias"></div></div></div>' +
    '<div id="retenidos"></div><div id="solicitudes"></div>' +
    (S.ses && R.errorInforme && R.errorInforme !== 'Sin configurar' ? '<div class="alert warn">' + ICON.alerta + '<div><b>No se pudo leer el Informe de Producción (molienda/silo).</b> ' + esc(R.errorInforme) + '</div></div>' : '') +
    (S.ses && R.errorViajes ? '<div class="alert bad">' + ICON.alerta + '<div><b>No se pudo leer la planilla de viajes.</b> ' + esc(R.errorViajes) + '</div></div>' : '') +
    '<div class="card flujo-card"><div class="tramos-band"><span class="tb abastecimiento">' + ICON.camion + '<b>Abastecimiento</b> cantera → balanza</span><span class="tb molienda">' + ICON.molienda + '<b>Molienda</b> playa → silo</span></div><div class="flujo" id="flujo"><svg class="lineas" id="lineas"></svg>' +
    nodo('cantera', 'cantera', 'Cantera', '≈ ' + vn(palPlanta * tPal) + '<small> t</small>', ln('≈ ' + nf(palPlanta * m3p) + ' m³', 'a planta') + ln(nf(palPlanta) + ' paladas', '· ' + nf(b.unid) + ' camiones') +
      '<span class="nl sec">Acopiado en cantera: ' + nf(palAcop) + ' pal. ≈ ' + nf(palAcop * m3p) + ' m³' + (b.internos ? ' (' + nf(b.internos) + ' viajes internos)' : '') + '</span>', '#/tablero/cantera') +
    nodo('viajes', 'camion', 'Viajes a CEVIL', '≈ ' + vn(b.palViajes * tPal) + '<small> t</small>', ln('≈ ' + nf(b.palViajes * m3p) + ' m³') + ln(nf(b.palViajes) + ' paladas', '· ' + nf(b.viajes) + ' viajes') + '<span class="nl sec">paladas según cada camión × ' + nf(tPal, 1) + ' t</span>', '#/tablero/viajes') +
    nodo('balanza', 'balanza', 'Balanza', vn(b.ingreso) + '<small> t</small>', ln('≈ ' + nf(m3Pes) + ' m³', '· ' + nf(b.tickets) + ' camiones') + ln(densBal ? nf(densBal, 2) + ' t/m³' : '–', 'densidad') +
      (b.ingresoEst ? '<span class="nl sec">+ ≈ ' + nf(b.ingresoEst) + ' t de viajes sin ticket</span>' : '') + (S.ses && b.rechT ? '<span class="nl rojo">' + nf(b.rechT, 0) + ' t rechazadas</span>' : ''), '#/tablero/viajes') +
    nodo('playa', 'playa', 'Playa', sp.v, ln(sp.m3) + (b.stockPlaya !== null ? ln('≈ ' + nf(b.stockPlaya / b.densidad / m3p) + ' paladas') : '') + (b.diasPlaya !== null ? '<span class="nl sec">≈ ' + nf(b.diasPlaya, 1) + ' días de molienda</span>' : ''), '#/tablero/balance', '<div class="tanque ' + (b.stockPlaya === null ? 'bad' : '') + '"><span data-w="' + pctP + '"></span></div>') +
    nodo('molienda', 'molienda', 'Molienda', vn(b.consumo) + '<small> t</small>', ln('≈ ' + nf(b.molPal * m3p) + ' m³') + ln(nf(b.molPal) + ' paladas', 'al cajón') + '<span class="nl sec">' + nf(b.fMol, 2) + ' t/palada · ' + nf(molT) + ' t por balanza</span>', '#/tablero/balance') +
    nodo('silo', 'silo', 'Silo', ss.v, ln(ss.m3) + ln('+ ' + nf(molT) + ' t', 'entró') + ln('− ' + nf(b.siloOut, 0) + ' t', '(' + nf(b.siloPal) + ' pal.) salió'), '#/tablero/balance', '<div class="tanque ' + (b.stockSilo === null ? 'warn' : '') + '"><span data-w="' + pctS + '"></span></div>') +
    '</div></div>' + '<div id="proyPlaya"></div>' +
    '<div class="grid ' + (S.ses ? 'g-21' : 'g2') + '" style="align-items:start">' + (S.ses ? '<div class="card"><div class="card-h"><div class="t"><h3>Para revisar</h3><div class="sub">Controles cruzados de los últimos 14 días</div></div><a class="btn sm" href="#/tablero/controles">Ver todos</a></div><div class="alertas" id="alertas"><div class="skel" style="height:56px"></div><div class="skel" style="height:56px"></div><div class="skel" style="height:56px"></div></div></div>' : '') +
    '<div class="col" style="gap:16px"><div class="card"><div class="card-h"><div class="t"><h3>Estado de la carga</h3><div class="sub">Último día con datos por fuente</div></div></div><div class="estado">' +
    fuentes.map(f => {
      const sm = semaforoDias((R.ultimo || {})[f[0]]);
      const smc = f[0] === 'cubicacion' ? (sm.dias !== null && sm.dias <= (num(par('DIAS_CUBICACION', 30)) || 30) ? { cls: 'ok', txt: 'hace ' + sm.dias + ' días' } : { cls: sm.dias === null ? 'bad' : 'warn', txt: sm.dias === null ? 'sin datos' : 'hace ' + sm.dias + ' días' }) : sm;
      return '<a class="fila ' + f[4] + '" href="' + (S.ses ? f[3] : '#/calendario') + '"><span class="ico">' + ICON[f[2]] + '</span><span class="txt"><b>' + f[1] + '</b><small>' + ((R.ultimo || {})[f[0]] ? fMedia(R.ultimo[f[0]]) + ' · ' + smc.txt : 'sin datos') + '</small></span><span class="semaforo ' + smc.cls + '"></span></a>';
    }).join('') + '</div></div>' + (cis ? gaugeCisterna(cis) : '') + '</div></div>' +
    '<div class="grid g3 stagger">' +
    '<div class="card spark"><div class="row"><span class="eyebrow">Ingreso diario</span><span class="right tag t-mut">t</span></div><div class="chart"><canvas id="spIng"></canvas></div></div>' +
    '<div class="card spark"><div class="row"><span class="eyebrow">Viajes por día</span><span class="right tag t-mut">a planta</span></div><div class="chart"><canvas id="spVia"></canvas></div></div>' +
    '<div class="card spark"><div class="row"><span class="eyebrow">Stock en playa</span><span class="right tag t-mut">t' + (b.inicioPlaya ? ' · desde ' + fCorta(b.inicioPlaya) : '') + '</span></div><div class="chart"><canvas id="spSto"></canvas>' + (b.inicioPlaya ? '' : '<div class="chart-vacio">Cargá un stock inicial o un ajuste de stock de playa para ver la evolución.</div>') + '</div></div>' +
    '</div></div>';
  segmento($('#segDias'), opDias, dSel, selDias, true);
  stagger(app());
  contar(app());
  $$('.nodo').forEach(n => { n.onclick = () => { location.hash = n.dataset.ir; }; });
  enlazarInformes(app());
  vRetenidos($('#retenidos'));
  vSolicitudes($('#solicitudes'));
  pintarProyeccion($('#proyPlaya'), ok);
  requestAnimationFrame(() => {
    $$('.tanque span').forEach(s => { s.style.width = s.dataset.w + '%'; });
    $$('.gauge .arco').forEach(a => { a.style.strokeDashoffset = a.dataset.off; });
    dibujarFlujo();
  });
  const bs = ultimo ? calcBalance(addDias(hasta, -6), hasta) : b;
  const serie = bs.serie;
  const L = serie.map(s => fCorta(s.fecha));
  const spark = { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } };
  grafico('spIng', 'bar', L, [{ label: 'Ingreso t', data: serie.map(s => s.ingreso), backgroundColor: color(1) }], spark, i => { location.hash = '#/dia/' + serie[i].fecha; });
  const dv = (R.diario || []).filter(d => serie.length && d.fecha >= serie[0].fecha && d.fecha <= hasta);
  grafico('spVia', 'bar', dv.map(d => fCorta(d.fecha)), [{ label: 'Viajes', data: dv.map(d => d.viajes), backgroundColor: color(2) }], spark, i => { location.hash = '#/dia/' + dv[i].fecha; });
  if (bs.inicioPlaya) grafico('spSto', 'line', L, [{ label: 'Stock playa t', data: serie.map(s => s.stockPlaya), borderColor: color(3), backgroundColor: color(3), fill: false, spanGaps: false }], mezclar(spark, { scales: { y: { beginAtZero: true, min: 0 } } }));
  try {
    const r14 = await p14;
    if (ok() && $('#alertas')) pintarAlertas(r14);
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
  const muerto = muertoCis(c);
  const util = utilCis(c);
  const cap = Math.max(1, (c.capacidad || Math.max(c.nivel, 1)) - muerto);
  const pct = Math.max(0, Math.min(1, util / cap));
  const largo = 2 * Math.PI * 52 * 0.75;
  const off = largo * (1 - pct);
  const auton = c.consumoMedio > 0 ? util / c.consumoMedio : null;
  const cls = pct < 0.15 || (auton !== null && auton < 2) ? 'bad' : pct < 0.3 ? 'warn' : '';
  return '<a class="card hover" href="#/tablero/combustible" style="color:inherit"><div class="card-h"><div class="t"><h3>' + esc(c.nombre || 'Cisterna') + '</h3><div class="sub">Gasoil de cantera, estimado con cargas y consumos</div></div></div>' +
    '<div class="gauge"><svg viewBox="0 0 130 130"><circle class="arco-bg" cx="65" cy="65" r="52" stroke-dasharray="' + largo + ' 999" transform="rotate(135 65 65)"/>' +
    '<circle class="arco ' + cls + '" cx="65" cy="65" r="52" stroke-dasharray="' + largo + ' 999" stroke-dashoffset="' + largo + '" data-off="' + off + '" transform="rotate(135 65 65)"/>' +
    '<text x="65" y="68" text-anchor="middle" font-size="24">' + Math.round(pct * 100) + '%</text><text x="65" y="88" text-anchor="middle" font-size="10" style="fill:var(--muted)">de ' + nf(cap) + ' L útiles</text></svg>' +
    '<div class="info"><b>' + nf(util) + ' L utilizables</b><span class="sub">Total ' + nf(c.nivel) + ' L · ' + nf(muerto) + ' L de stock muerto</span><span class="sub">Consumo medio ' + nf(c.consumoMedio) + ' L/día</span>' +
    (auton !== null ? '<span class="tag ' + (cls === 'bad' ? 't-bad' : cls === 'warn' ? 't-warn' : 't-ok') + '">' + ICON.reloj.replace('<svg', '<svg width="13" height="13"') + ' ≈ ' + nf(auton, 1) + ' días de autonomía</span>' : '') + '</div></div></a>';
}

function pintarAlertas(r) {
  const lista = controles(r, calcBalance(addDias(hoy(), -13), hoy()));
  S.ultControles = lista;
  const mio = S.ses ? rolN(S.ses.rol) : '';
  const prob = lista.filter(a => a.sev !== 'ok').sort((a, c) => (SEV_ORDEN[a.sev] - SEV_ORDEN[c.sev]) || ((c.sector === mio) - (a.sector === mio)));
  const oks = lista.length - prob.length;
  const vis = prob.slice(0, 7);
  $('#alertas').innerHTML = (vis.length ? vis.map((a, i) => htmlAlerta(a, i, true)).join('') : htmlAlerta({ sev: 'ok', ic: 'ok', t: 'Todo en orden', d: lista.length + ' controles sin observaciones en los últimos 14 días.', ruta: '#/tablero/controles', sector: 'abastecimiento' }, 0, false)) +
    '<a class="mas-controles" href="#/tablero/controles">' + (prob.length > vis.length ? '+' + (prob.length - vis.length) + ' observaciones más · ' : '') + oks + ' controles en orden ' + ICON.der.replace('<svg', '<svg width="14" height="14"') + '</a>';
  $$('#alertas .alerta').forEach(a => { a.onclick = () => { location.hash = a.dataset.ir; }; });
  if (window.refrescarAyuda) refrescarAyuda();
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

const TABS_T = [
  ['balance', 'Balance', ICON.playa],
  ['controles', 'Controles', ICON.alerta],
  ['viajes', 'Viajes y balanza', ICON.camion],
  ['cantera', 'Cantera', ICON.pala],
  ['calidad', 'Calidad', ICON.calidad],
  ['combustible', 'Combustible', ICON.combustible]
];

async function vTablero(tab) {
  const TABS = TABS_T.filter(t => S.ses || t[0] !== 'controles');
  if (!TABS.some(t => t[0] === tab)) tab = 'balance';
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Tablero</div><h1>Análisis del período</h1><p class="sub">' + fMedia(S.desde) + ' al ' + fMedia(S.hasta) + '</p></div></div>' +
    barraFiltros() + '<div id="tabsT" style="margin-bottom:16px"></div><div id="tabC"><div class="kpis">' + '<div class="skel" style="height:96px"></div>'.repeat(5) + '</div><div class="card mt"><div class="skel" style="height:260px"></div></div></div></div>';
  segmento($('#tabsT'), TABS, tab, k => { history.replaceState(null, '', '#/tablero/' + k); destruirGraficos(); pintarTab(k); });
  enlazarFiltros(() => vTablero(tab));
  const ok = vivo();
  await Promise.all([cargarResumen(), cargarRango()]);
  if (!ok()) return;
  pintarTab(($('#tabsT .seg button.on') || {}).dataset ? $('#tabsT .seg button.on').dataset.k : tab);
}

function pintarTab(tab) {
  const c = $('#tabC');
  if (!c) return;
  c.innerHTML = '';
  S.ayudaExtra = null;
  S.ayudaSug = null;
  S.ayudaTab = tab;
  try {
    S.ultControles = controles(S.rango, calcBalance(S.desde, S.hasta));
  } catch (e) {
    console.warn(e);
  }
  if (tab === 'viajes') tabViajes(c);
  else if (tab === 'controles') tabControles(c);
  else if (tab === 'cantera') tabCantera(c);
  else if (tab === 'calidad') tabCalidad(c);
  else if (tab === 'combustible') tabCombustible(c);
  else tabBalance(c);
  c.classList.remove('vista');
  void c.offsetWidth;
  c.classList.add('vista');
  stagger(c);
  contar(c);
  if (window.refrescarAyuda) refrescarAyuda();
}

function guia(items) {
  S.ayudaExtra = items;
  return '';
}

function irDia(lista) {
  return i => { if (lista[i]) location.hash = '#/dia/' + (lista[i].fecha || lista[i]); };
}

function tabBalance(c) {
  const b = calcBalance(S.desde, S.hasta);
  const avisos = [];
  if (!b.hayAjuste) avisos.push('No hay stock inicial: el stock no se puede mostrar. Cargá cuánta tierra hay en Cargar → Ajuste de stock.');
  if (!b.calibrado) avisos.push('Sin balanza dinámica: se usa el factor teórico ' + nf(b.fTeo, 2) + ' t/palada.');
  if (b.estimados) avisos.push(b.estimados + ' día(s) con molienda estimada con ' + nf(b.fMolHist, 2) + ' t/palada por falta de balanza dinámica.');
  S.ayudaSug = avisos;
  const cub = b.cubicaciones.filter(x => x.teorico !== null).slice().reverse();
  const L = b.serie.map(s => fCorta(s.fecha));
  c.innerHTML = guia([
    ['Ingreso', 'toneladas netas pesadas en la balanza de ingreso (solo productos de tierra).'],
    ['Rechazado', 'toneladas de camiones rechazados por calidad. ' + (b.excluyeRechazos ? 'No suman al stock de playa.' : 'Igual suman al stock (parámetro EXCLUIR_RECHAZADOS).')],
    ['Cobertura', 'stock de playa ÷ consumo medio de molienda de los últimos 14 días con actividad.'],
    ['Ajuste de stock', 'cada medición de la playa se compara con el stock que la app calculaba ese día. La diferencia mide el error acumulado del factor t/palada.'],
    ['Consumo de molienda', 'toneladas de la balanza dinámica; los turnos sin balanza se estiman con paladas × factor t/palada.'],
    ['Stock de playa', 'stock inicial o último ajuste + ingresos − consumo de molienda. Antes del primer ajuste se reconstruye hacia atrás; si da negativo se marca «sin dato» hasta el próximo ajuste.'],
    ['m³', 'aproximados: t ÷ densidad (' + nf(b.densidad, 2) + ' t/m³ = t por palada ÷ ' + nf(b.m3Palada) + ' m³ de balde).'],
    ['Stock de silo', 'lo que pasó por la balanza dinámica − paladas extraídas × factor del silo.']
  ]) + '<div class="kpis stagger">' +
    kpi('Ingreso balanza', vn(b.ingreso) + '<small>t</small>', '≈ ' + nf(b.ingreso / b.densidad) + ' m³ · ' + nf(b.tickets) + ' camiones', 'kacc', 'Suma de netos de la balanza de ingreso en el período.') +
    kpi('Consumo molienda', vn(b.consumo) + '<small>t</small>', '≈ ' + nf(b.consumo / b.densidad) + ' m³ · ' + nf(b.molPal) + ' paladas', 'kacc', 'Toneladas que entraron a la línea de molienda.') +
    kpi('Variación playa', vn(b.ingreso - b.consumo) + '<small>t</small>', '≈ ' + nf((b.ingreso - b.consumo) / b.densidad) + ' m³ · ' + (b.ingreso - b.consumo >= 0 ? 'se acumuló' : 'se consumió stock'), b.ingreso - b.consumo >= 0 ? 'ok' : 'warn', 'Ingreso − consumo. Positivo: la playa crece.') +
    (b.rechT ? kpi('Rechazado por calidad', vn(b.rechT) + '<small>t</small>', b.excluyeRechazos ? 'no suma a la playa' : 'suma a la playa', 'bad', 'Neto de los camiones con muestra rechazada.') : '') +
    kpi('Stock playa', b.stockPlaya === null ? 'sin dato' : vn(b.stockPlaya) + '<small>t</small>', b.stockPlaya === null ? (b.inicioPlaya ? 'revisar desde ' + fCorta(b.playaInvalidaDesde) : 'falta stock inicial o ajuste') : '≈ ' + nf(b.stockPlaya / b.densidad) + ' m³ al ' + fCorta(S.hasta), b.stockPlaya === null ? 'bad' : '', 'Stock calculado al final del período. Sin ajuste o con un faltante de datos no se muestra.') +
    kpi('Cobertura playa', vn(b.diasPlaya, 1) + '<small>días</small>', nf(b.consumoMedio, 0) + ' t/día de molienda', b.diasPlaya !== null && b.diasPlaya < 5 ? 'warn' : '', 'Días de molienda que alcanza el stock de playa.') +
    kpi('Stock silo', b.stockSilo === null ? 'sin dato' : vn(b.stockSilo) + '<small>t</small>', b.stockSilo === null ? 'falta un ajuste del silo' : '≈ ' + nf(b.stockSilo / b.densidad) + ' m³ · ' + nf(b.siloOut, 0) + ' t extraídas', b.stockSilo === null ? 'warn' : '', 'Tierra molida disponible en silo.') +
    kpi('t por camión', vn(b.tickets ? b.ingreso / b.tickets : null, 1) + '<small>t</small>', 'neto medio de balanza', '', 'Promedio de toneladas netas por ticket.') +
    kpi('t por palada (molienda)', vn(b.fMol, 2), b.calibrado ? 'balanza dinámica / paladas' : 'teórico', '', 'Se usa para estimar el consumo cuando falta la balanza dinámica.') +
    '</div>' + tarjetaCalibracion(b) + '<div class="grid g2">' + caja('chPlaya', 'Playa: ingreso y consumo diario', 'Tocá una barra para ver el día') + caja('chSilo', 'Silo: entrada y extracción diaria', 'Entrada = consumo de molienda') + '</div>' +
    caja('chStock', 'Evolución de stocks', 'Toneladas al cierre de cada día', 'lg') +
    '<div class="card"><div class="card-h"><div class="t"><h3>Ajustes de stock: medido vs calculado</h3><div class="sub">Tolerancia ±' + par('TOLERANCIA_INVENTARIO', 10) + ' %</div></div></div>' +
    tabla([[x => fMedia(x.fecha), 'Fecha'], ['nodo', 'Nodo'], [x => nf(x.teorico, 0), 'Calculado t', 'n'], [x => nf(x.medido, 0), 'Medido t', 'n'], [x => nf(x.medido / b.densidad, 0), '≈ m³', 'n'], [x => (x.dif >= 0 ? '+' : '') + nf(x.dif, 0), 'Diferencia t', 'n'],
      [x => '<span class="tag ' + (Math.abs(x.pct) * 100 > (num(par('TOLERANCIA_INVENTARIO', 10)) || 10) ? 't-bad' : 't-ok') + '">' + nf(x.pct * 100, 1) + ' %</span>', '%', 'n'], [x => esc(x.obs), 'Método', 'wrap']], cub, { vacio: 'Con dos o más ajustes de stock se mide la diferencia.' }) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Detalle diario</h3></div><button class="btn sm" id="csvBal">' + ICON.descargar + 'CSV</button></div>' +
    tabla([[r => '<a href="#/dia/' + r.fecha + '">' + fMedia(r.fecha) + '</a>', 'Fecha'], [r => nf(r.ingreso, 1), 'Ingreso t', 'n'], [r => nf(r.consumo, 1) + (r.estimado ? ' *' : ''), 'Consumo t', 'n'], [r => nf(r.consumo / b.densidad, 0), '≈ m³', 'n'], [r => r.stockPlaya === null ? '<span class="tag t-warn">sin dato</span>' : nf(r.stockPlaya, 0) + (r.estPlaya === 'rec' ? ' ↺' : ''), 'Stock playa t', 'n'],
      [r => nf(r.siloOut, 1), 'Extr. silo t', 'n'], [r => r.stockSilo === null ? '–' : nf(r.stockSilo, 0), 'Stock silo t', 'n'], [r => nf(r.tCamion, 1), 't/camión', 'n'], [r => nf(r.fMol, 2), 't/palada mol.', 'n']],
    b.serie.slice().reverse(), { max: true }) + '<div class="sub mt">* consumo estimado con factor por falta de balanza dinámica en algún turno. ↺ stock reconstruido hacia atrás desde el primer ajuste.</div></div>';
  grafico('chPlaya', 'bar', L, [
    { label: 'Ingreso a playa t', data: b.serie.map(s => s.ingresoPlaya), backgroundColor: color(1) },
    { label: 'Consumo t', data: b.serie.map(s => s.consumo), backgroundColor: color(2) }
  ], null, irDia(b.serie));
  grafico('chSilo', 'bar', L, [
    { label: 'Entrada t', data: b.serie.map(s => s.consumo), backgroundColor: color(2) },
    { label: 'Extracción t', data: b.serie.map(s => s.siloOut), backgroundColor: color(3) }
  ], null, irDia(b.serie));
  grafico('chStock', 'line', L, [
    { label: 'Stock playa t', data: b.serie.map(s => s.stockPlaya), borderColor: color(1), backgroundColor: color(1) },
    { label: 'Stock silo t', data: b.serie.map(s => s.stockSilo), borderColor: color(3), backgroundColor: color(3) }
  ], { scales: { y: { beginAtZero: true, min: 0 } } }, irDia(b.serie));
  $('#csvBal').onclick = () => csv('balance_' + S.desde + '_' + S.hasta, [['fecha', 'Fecha'], ['ingreso', 'Ingreso t'], ['consumo', 'Consumo t'], ['stockPlaya', 'Stock playa t'], ['siloOut', 'Extraccion silo t'], ['stockSilo', 'Stock silo t'], ['tCamion', 't/camion'], ['fMol', 't/palada molienda']], b.serie);
}

function tarjetaCalibracion(b) {
  const tc = S.rango ? tPaladaCantera(conciliar(S.rango)) : { tp: null };
  const m3 = num(par('M3_POR_PALADA', 3)) || 3;
  const fila = (t, v, d, cls) => '<div class="cal-it ' + (cls || '') + '"><span class="eyebrow">' + t + '</span><b>' + (v === null ? '–' : nf(v, 2)) + '<small> t/palada</small></b><small>' + d + '</small></div>';
  return '<div class="card"><div class="card-h"><div class="t"><h3>Toneladas por palada</h3><div class="sub">Balde de ' + nf(m3) + ' m³. Se recalcula solo con cada balanza importada y cada turno de molienda.</div></div></div><div class="calibra">' +
    fila('Cantera → balanza de ingreso', tc.tp, tc.tp ? nf(tc.tCamion, 1) + ' t/camión ÷ ' + nf(tc.ppc, 1) + ' paladas/camión · ' + nf(tc.tp / m3, 2) + ' t/m³' : 'faltan jornadas o pesajes en el período', 'a') +
    fila('Molienda → balanza dinámica', b.calibrado ? b.fMol : null, b.calibrado ? 'toneladas de cinta ÷ paladas al cajón · ' + nf(b.fMol / m3, 2) + ' t/m³' : 'sin turnos con balanza dinámica', 'm') +
    fila('Teórico (parámetros)', b.fTeo, nf(m3) + ' m³ × ' + nf(num(par('DENSIDAD_APARENTE', 1.48)), 2) + ' t/m³ · se usa solo si falta lo medido', '') +
    (tc.tp && b.calibrado ? '<div class="cal-dif"><b>' + nf((b.fMol - tc.tp) / tc.tp * 100, 1) + ' %</b><small>molienda vs cantera. Una diferencia sostenida indica tierra pegada en el balde, humedad distinta o paladas mal contadas; lo que queda en el cajón alimentador explica diferencias de un turno.</small></div>' : '') +
    '</div></div>';
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
    ['Camiones declarados en cantera', 'lo que declaran los operadores de pala en la jornada; los viajes internos de cantera se informan aparte.'],
    ['Viajes a planta', 'comprobantes cargados con destino ' + (destinosPlanta().join(', ') || 'cualquiera') + '.'],
    ['Tickets', 'pesadas de la balanza de ingreso. Un viaje se cruza con un ticket si coincide el dominio y la hora (±' + par('VENTANA_MATCH_MIN', 120) + ' min).'],
    ['Ciclo', 'tiempo entre hora de carga y descarga de cada viaje.']
  ]) + '<div class="kpis stagger">' +
    kpi('Camiones declarados en cantera', vn(palas), nf(internos) + ' viajes internos aparte', '', 'Declarado en la jornada de cantera.') +
    kpi('Viajes a planta', vn(k.viajes.length), nf(k.viajesTot.length) + ' viajes totales', 'kacc') +
    kpi('Diferencia cantera − viajes', vn(palas - k.viajes.length), palas ? nf((palas - k.viajes.length) / palas * 100, 0) + '% de lo declarado' : '', Math.abs(palas - k.viajes.length) > palas * 0.1 ? 'warn' : 'ok', 'Si es alta, faltan comprobantes por cargar o hay viajes internos declarados como a planta.') +
    kpi('Tickets de balanza', vn(k.pes.length), nf(netoT, 0) + ' t netas') +
    kpi('Viajes con ticket', pctMatch === null ? '–' : vn(pctMatch) + '<small>%</small>', nf(k.pares.length) + ' cruzados', pctMatch !== null && pctMatch < 90 ? 'bad' : 'ok', 'Porcentaje de viajes a planta que se encontraron en la balanza.') +
    kpi('Ciclo mediano', vn(cicMed) + '<small>min</small>', 'carga → descarga') +
    '</div>' + caja('chConc', 'Conciliación diaria', 'Camiones declarados en cantera · viajes cargados · tickets de balanza. Tocá un día para el detalle.', 'lg') +
    '<div class="grid g2">' + caja('chChof', 'Viajes por chofer', 'Período seleccionado') + caja('chOri', 'Viajes por origen', 'Incluye todos los destinos') + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Choferes</h3><div class="sub">Viajes a planta, toneladas cruzadas con balanza y ciclo mediano</div></div></div>' +
    tabla([['n', 'Chofer'], ['viajes', 'Viajes', 'n'], ['dias', 'Días', 'n'], [r => nf(r.viajes / (r.dias || 1), 1), 'Viajes/día', 'n'], [r => nf(r.t, 1), 't (con ticket)', 'n'], [r => nf(r.prom, 1), 't/viaje', 'n'], [r => nf(r.ciclo, 0), 'Ciclo min', 'n'],
      [r => r.sinT ? '<span class="tag t-warn">' + r.sinT + '</span>' : '<span class="tag t-ok">0</span>', 'Sin ticket']], chof, { max: true }) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Conciliación por día</h3></div><button class="btn sm" id="csvConc">' + ICON.descargar + 'CSV</button></div>' +
    tabla([[r => '<a href="#/dia/' + r.fecha + '">' + fMedia(r.fecha) + '</a>', 'Fecha'], ['unid', 'Declarados en cantera', 'n'], ['internos', 'Internos', 'n'], ['viajes', 'Viajes planta', 'n'], ['tickets', 'Tickets', 'n'],
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
    { label: 'Declarados en cantera', data: k.diario.map(d => d.unid), backgroundColor: color(1) },
    { label: 'Viajes a planta', data: k.diario.map(d => d.viajes), backgroundColor: color(2) },
    { label: 'Tickets balanza', data: k.diario.map(d => d.tickets), backgroundColor: color(3) }
  ], null, irDia(k.diario));
  const ch = chof.slice(0, 15);
  grafico('chChof', 'bar', ch.map(x => x.n), [{ label: 'Viajes', data: ch.map(x => x.viajes), backgroundColor: color(1) }], { indexAxis: 'y', scales: { x: { beginAtZero: true }, y: { ticks: { autoSkip: false } } } });
  grafico('chOri', 'doughnut', origenes, [{ data: origenes.map(o => porOrigen[o].length), backgroundColor: origenes.map((_, i) => color(i % 8 + 1)), borderColor: cssVar('--chart-surface'), borderWidth: 2 }]);
  $('#csvConc').onclick = () => csv('conciliacion_' + S.desde + '_' + S.hasta, [['fecha', 'Fecha'], ['unid', 'Declarados en cantera'], ['internos', 'Internos'], ['viajesTot', 'Viajes totales'], ['viajes', 'Viajes planta'], ['tickets', 'Tickets'], ['pares', 'Cruzados'], ['neto', 't netas']], k.diario);
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
    '</div>' + caja('chCam', 'Camiones cargados por día', 'A planta e internos, según la jornada de cantera. Tocá un día para el detalle.', 'lg') +
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
    c.innerHTML = '<div class="alert info">' + ICON.infoI + '<div>No se pudo leer la planilla de gasoil. Revisá <b>COMBUSTIBLE_ID</b> en Parámetros.' + (cis && cis.error ? ' (' + esc(cis.error) + ')' : '') + '</div></div>';
    return;
  }
  const b = calcBalance(S.desde, S.hasta);
  const rg = rendimientoGasoil(comb);
  const litros = sum(comb, x => x.litros);
  const camiones = sum(st.maqs, x => x.unid + x.internos);
  const med = (R.mediciones || []).slice().reverse();
  const serie = (cis.serie || []).filter(d => d.fecha >= S.desde && d.fecha <= S.hasta);
  const conL = st.maqs.filter(x => x.lH !== null && x.litros > 0);
  c.innerHTML = guia([
    ['Nivel de cisterna', 'ajuste inicial de la hoja Configuración + cargas de "Cisterna Principal" − cargas a las máquinas.'],
    ['Stock muerto', nf(muertoCis(cis)) + ' L que quedan en el fondo y no se pueden bombear (parámetro CISTERNA_STOCK_MUERTO).'],
    ['Autonomía', '(nivel − stock muerto) / consumo medio de los últimos 14 días con cargas.'],
    ['Inicio de control', 'el administrador fija el nivel real de la cisterna; desde ahí se suman llenados y se restan cargas. No cuenta como diferencia.'],
    ['L/h', 'litros cargados en el período / horas de horómetro de la máquina.'],
    ['L/h por carga', 'litros de cada carga ÷ horas del horómetro desde la carga anterior de esa máquina. Detecta cargas mal anotadas o consumos anormales.'],
    ['L por tonelada', 'gasoil de cantera ÷ toneladas ingresadas por balanza: cuánto gasoil cuesta cada tonelada de tierra.'],
    ['Medición', 'medí la cisterna con varilla y cargala en Cargar → Gasoil: la diferencia con el nivel calculado muestra faltantes o cargas sin registrar.']
  ]) + '<div class="kpis stagger">' +
    kpi('Gasoil a máquinas', vn(litros) + '<small>L</small>', comb.length + ' cargas', 'kacc') +
    kpi('L por tonelada', vn(b.ingreso ? litros / b.ingreso : null, 2) + '<small>L/t</small>', 'gasoil ÷ ingreso de balanza', '', 'Costo en gasoil de cada tonelada que entró.') +
    kpi('L por camión', vn(camiones ? litros / camiones : null, 1) + '<small>L</small>', nf(camiones) + ' camiones cargados', '', 'Gasoil ÷ camiones cargados por las palas (a planta + internos).') +
    kpi('Gasoil utilizable', vn(utilCis(cis)) + '<small>L</small>', 'total ' + nf(cis.nivel) + ' L − ' + nf(muertoCis(cis)) + ' L muertos' + (cis.consumoMedio ? ' · ≈ ' + nf(utilCis(cis) / cis.consumoMedio, 1) + ' días' : ''), cis.nivel < 0 || (cis.capacidad && cis.nivel > cis.capacidad * 1.05) ? 'bad' : '') +
    '</div><div class="grid g-21"><div>' + caja('chNivel', 'Nivel de la cisterna', 'Litros al cierre de cada día', 'lg') + '</div>' + gaugeCisterna(cis) + '</div>' +
    '<div class="grid g2">' + caja('chMov', 'Entradas y salidas de la cisterna', 'Litros por día', '') + caja('chCons', 'Consumo diario por máquina', 'Litros cargados', '') + '</div>' +
    '<div class="grid g2">' + caja('chLh', 'Litros por hora de horómetro', 'Período seleccionado') +
    '<div class="card"><div class="card-h"><div class="t"><h3>Resumen por máquina</h3></div></div>' + tabla([['n', 'Máquina'], [r => nf(r.litros, 0), 'Litros', 'n'], [r => nf(r.hHor, 1), 'h horóm.', 'n'], [r => nf(r.lH, 1), 'L/h', 'n'],
      [r => nf(medianaDe(rg.filter(x => x.maquina === r.n && x.lh !== null && x.horas >= 2).map(x => x.lh)), 1), 'L/h por carga', 'n']], st.maqs.filter(x => x.litros > 0)) + '</div></div>' +
    '<div class="grid g2"><div class="card"><div class="card-h"><div class="t"><h3>Consumo entre cargas</h3><div class="sub">Rojo: más de 1,5 veces lo habitual de la máquina</div></div></div>' +
    tabla([[x => fCorta(x.fecha), 'Fecha'], ['maquina', 'Máquina'], [x => nf(x.litros, 0), 'Litros', 'n'], [x => nf(x.horas, 1), 'Horas', 'n'],
      [x => '<span class="tag ' + (x.horas <= 0 || (x.mediana && x.lh > x.mediana * 1.5) ? 't-bad' : 't-mut') + '">' + nf(x.lh, 1) + '</span>', 'L/h', 'n']], rg.slice().reverse(), { max: true, vacio: 'Cargá el horómetro en cada carga de gasoil.' }) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Mediciones de cisterna</h3><div class="sub">Medido con varilla vs calculado</div></div></div>' +
    tabla([[x => fCorta(x.fecha), 'Fecha'], ['hora', 'Hora'], [x => nf(x.litrosMedidos), 'Medido L', 'n'], [x => nf(x.litrosEstimados), 'Calculado L', 'n'],
      [x => esAjusteCis(x) ? '<span class="tag t-info">Inicio de control</span>' : '<span class="tag ' + (Math.abs(x.diferencia) > (cis.capacidad || 5000) * 0.03 ? 't-bad' : 't-ok') + '">' + nf(x.diferencia) + '</span>', 'Diferencia', 'n']], med, { vacio: 'Sin mediciones en el período.' }) + '</div></div>';
  requestAnimationFrame(() => $$('.gauge .arco').forEach(a => { a.style.strokeDashoffset = a.dataset.off; }));
  const L = serie.map(d => fCorta(d.fecha));
  grafico('chNivel', 'line', L, [{ label: 'Nivel L', data: serie.map(d => d.nivel), borderColor: color(1), backgroundColor: color(1), fill: false }], { scales: { y: { beginAtZero: true, suggestedMax: cis.capacidad || undefined } } });
  grafico('chMov', 'bar', L, [
    { label: 'Entrada L', data: serie.map(d => d.entrada), backgroundColor: color(3) },
    { label: 'Salida L', data: serie.map(d => d.salida), backgroundColor: color(2) }
  ]);
  grafico('chCons', 'bar', fd.map(fCorta), maqs.slice(0, 8).map((m, i) => ({ label: m, data: fd.map(f => sum(porDia[f].filter(x => x.maquina === m), x => x.litros)), backgroundColor: color(i + 1) })), { scales: { x: { stacked: true }, y: { stacked: true } } });
  grafico('chLh', 'bar', conL.map(x => x.n), [{ label: 'L/h', data: conL.map(x => x.lH), backgroundColor: color(4) }]);
  extrasCombustible(c, cis, comb);
}

function tanqueCisterna(cis) {
  const cap = cis.capacidad || Math.max(cis.nivel, 1);
  const muerto = muertoCis(cis);
  const util = utilCis(cis);
  const pM = Math.max(0, Math.min(100, Math.min(cis.nivel, muerto) / cap * 100));
  const pU = Math.max(0, Math.min(100 - pM, util / cap * 100));
  return '<div class="tanque-cis"><div class="tq"><span class="u" style="height:' + pU + '%;bottom:' + pM + '%"></span><span class="m" style="height:' + pM + '%"></span></div>' +
    '<div class="tq-d"><b>Máx. ' + nf(cap) + ' L</b><span><i class="sw" style="background:var(--ok)"></i>Consumible <b>' + nf(util) + ' L</b></span><span><i class="sw" style="background:var(--bad)"></i>Stock muerto <b>' + nf(muerto) + ' L</b></span><span class="sub">Físico total ' + nf(cis.nivel) + ' L</span></div></div>';
}

function extrasCombustible(c, cis, comb) {
  const maq = comb.filter(x => !x.cisterna);
  const est = {};
  maq.forEach(x => { const e = est[x.maquina] || (est[x.maquina] = { t: 0, d: new Set() }); e.t += x.litros; e.d.add(x.fecha); });
  const nombresM = Object.keys(est).sort();
  c.insertAdjacentHTML('beforeend', '<div class="grid g-21" style="align-items:start"><div class="card"><div class="card-h"><div class="t"><h3>Cisterna</h3><div class="sub">Consumible y stock muerto</div></div></div>' + tanqueCisterna(cis) + '</div>' +
    caja('chProm', 'Consumo promedio por día activo', 'Litros ÷ días con carga de cada máquina') + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Evolución del consumo</h3></div><div class="row"><select id="evAg"><option value="dia">Por día</option><option value="mes">Por mes</option><option value="anio">Por año</option></select><select id="evMq"><option value="">Todas las máquinas</option>' + nombresM.map(m => '<option>' + esc(m) + '</option>').join('') + '</select></div></div><div class="chart"><canvas id="chEvo"></canvas></div></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Registro de cargas</h3><div class="sub">Tocá un encabezado para ordenar</div></div><input id="evBus" placeholder="Buscar fecha, máquina o valor…" style="width:240px"></div><div id="evTab"></div></div>');
  grafico('chProm', 'bar', nombresM, [{ label: 'L por día activo', data: nombresM.map(m => est[m].t / est[m].d.size), backgroundColor: color(2) }]);
  const evo = () => {
    const ag = $('#evAg').value;
    const mq = $('#evMq').value;
    const ser = {};
    maq.filter(x => !mq || x.maquina === mq).forEach(x => { const k = ag === 'dia' ? x.fecha : ag === 'mes' ? x.fecha.slice(0, 7) : x.fecha.slice(0, 4); ser[k] = (ser[k] || 0) + x.litros; });
    const L = Object.keys(ser).sort();
    grafico('chEvo', 'line', L.map(k => ag === 'dia' ? fCorta(k) : k), [{ label: 'Litros', data: L.map(k => ser[k]), borderColor: color(1), backgroundColor: 'rgba(217,107,58,.12)', fill: true }], { scales: { y: { beginAtZero: true } } });
  };
  let orden = ['fh', -1];
  const tab = () => {
    const q = normTxt($('#evBus').value);
    const val = { fh: x => x.fecha + ' ' + x.hora, maquina: x => x.maquina, litros: x => x.litros, horometro: x => x.horometro || 0 };
    const l = comb.filter(x => !q || normTxt(x.fecha + ' ' + x.hora + ' ' + x.maquina + ' ' + x.litros + ' ' + (x.horometro || '')).indexOf(q) >= 0)
      .sort((a, b2) => { const va = val[orden[0]](a); const vb = val[orden[0]](b2); return (va < vb ? -1 : va > vb ? 1 : 0) * orden[1]; });
    $('#evTab').innerHTML = '<div class="tw max"><table><thead><tr>' + [['fh', 'Fecha y hora'], ['maquina', 'Máquina'], ['litros', 'Litros'], ['horometro', 'Horómetro']].map(h => '<th class="click' + (h[0] === 'litros' || h[0] === 'horometro' ? ' n' : '') + '" data-o="' + h[0] + '">' + h[1] + (orden[0] === h[0] ? (orden[1] > 0 ? ' ▲' : ' ▼') : '') + '</th>').join('') + '</tr></thead><tbody>' +
      l.map(x => '<tr><td>' + fCorta(x.fecha) + ' ' + esc(x.hora) + '</td><td' + (x.cisterna ? ' style="color:var(--ok)"' : '') + '>' + esc(x.maquina) + '</td><td class="n"><b>' + nf(x.litros) + '</b></td><td class="n">' + (x.cisterna || !x.horometro ? '–' : nf(x.horometro, 1)) + '</td></tr>').join('') + '</tbody></table></div><div class="sub mt">' + l.length + ' registros · ' + nf(sum(l.filter(x => !x.cisterna), x => x.litros)) + ' L a máquinas</div>';
    $$('#evTab th[data-o]').forEach(th => { th.onclick = () => { orden = [th.dataset.o, orden[0] === th.dataset.o ? -orden[1] : 1]; tab(); }; });
  };
  $('#evAg').onchange = evo;
  $('#evMq').onchange = evo;
  $('#evBus').oninput = tab;
  evo();
  tab();
}

const COLOR_DIA = { prod: '--ok', parada: '--bad', clima: '--info', falta: '--warn' };

function segmentosDia(x) {
  if (!x) return [];
  if (x.seg && x.seg.length) return x.seg.filter(s => COLOR_DIA[s[0]] && s[1] > 0);
  const out = [];
  if (x.prod) out.push(['prod', 1]);
  (x.paradas || []).forEach(p => {
    const k = /clim|lluvia/i.test(p) ? 'clima' : /ausencia|sin operario|falta/i.test(p) ? 'falta' : 'parada';
    if (!out.some(s => s[0] === k)) out.push([k, 1]);
  });
  return out;
}

function fondoDia(x) {
  const seg = segmentosDia(x);
  if (!seg.length) return '';
  const cats = Array.from(new Set(seg.map(z => z[0])));
  const tinte = k => 'color-mix(in srgb, var(' + COLOR_DIA[k] + ') 38%, var(--panel))';
  if (cats.length === 1) return tinte(cats[0]);
  const paso = 100 / cats.length;
  return 'linear-gradient(90deg, ' + cats.map((k, i) => tinte(k) + ' ' + (i * paso).toFixed(2) + '% ' + ((i + 1) * paso).toFixed(2) + '%').join(', ') + ')';
}

async function vCalendario(mes, dir) {
  const ok = vivo();
  await cargarResumen();
  if (!ok()) return;
  const ym = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : hoy().slice(0, 7);
  let metrica = lsGet('tierra_cal_metrica', 'viajes');
  if (metrica === 'palas') metrica = 'paladas';
  const y = Number(ym.slice(0, 4));
  const mo = Number(ym.slice(5, 7)) - 1;
  const D = {};
  (S.resumen.diario || []).forEach(d => { D[d.fecha] = d; });
  const prim = new Date(y, mo, 1).getDay();
  const dias = new Date(y, mo + 1, 0).getDate();
  const ant = iso(new Date(y, mo - 1, 1)).slice(0, 7);
  const sig = iso(new Date(y, mo + 1, 1)).slice(0, 7);
  const tit = new Date(y, mo, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const b = calcBalance(ym + '-01', ym + '-' + pad(dias));
  const dens = b.densidad;
  const m3p = b.m3Palada;
  const molDia = x => (x.molT || 0) + ((x.molPal || 0) - (x.molPalConT || 0)) * b.fMol;
  const celda = x => {
    if (metrica === 'ingreso') return x.ingresoT ? { v: nf(x.ingresoT, 0) + ' t', s: '≈ ' + nf(x.ingresoT / dens, 0) + ' m³' } : null;
    if (metrica === 'paladas') return (x.palCam + x.palAco) ? { v: nf(x.palCam + x.palAco) + ' pal.', s: '≈ ' + nf((x.palCam + x.palAco) * m3p, 0) + ' m³' } : null;
    if (metrica === 'molienda') return x.molPal ? { v: (x.molPal > x.molPalConT ? '≈ ' : '') + nf(molDia(x), 0) + ' t', s: '≈ ' + nf(molDia(x) / dens, 0) + ' m³ · ' + nf(x.molPal) + ' pal.' } : null;
    return x.viajes || x.internos ? { v: nf(x.viajes) + ' viajes', s: x.internos ? nf(x.internos) + ' internos' : '' } : null;
  };
  let h = '';
  for (let i = 0; i < prim; i++) h += '<div class="c vacio"></div>';
  const tot = { v: 0, t: 0, m: 0, p: 0, mp: 0, i: 0 };
  for (let d = 1; d <= dias; d++) {
    const f = ym + '-' + pad(d);
    const x = D[f];
    let ev = '';
    let lin = '';
    let tip = fLarga(f);
    if (x) {
      tot.v += x.viajes;
      tot.i += x.internos || 0;
      tot.t += x.ingresoT;
      tot.m += molDia(x);
      tot.mp += x.molPal || 0;
      tot.p += (x.palCam || 0) + (x.palAco || 0);
      if (x.prod) ev += '<i class="t-ok">⛏️<span> PROD</span></i>';
      Array.from(new Set(x.paradas.map(p => /clim/i.test(p) ? 'CLIMA' : /ausencia|sin operario/i.test(p) ? 'FALTA' : 'PARADA'))).forEach(k => {
        ev += '<i class="' + (k === 'CLIMA' ? 't-info' : k === 'FALTA' ? 't-warn' : 't-bad') + '">' + { CLIMA: '🌧️', FALTA: '👷', PARADA: '🔧' }[k] + '<span> ' + k + '</span></i>';
      });
      if (x.rechazos) ev += '<i class="t-bad">⛔<span> RECH</span> ' + x.rechazos + '</i>';
      const cv = celda(x);
      if (cv) lin = '<div class="mv">' + cv.v + '</div>' + (cv.s ? '<div class="ms">' + cv.s + '</div>' : '');
      tip += ' · ' + x.viajes + ' viajes · ' + nf(x.ingresoT, 0) + ' t ingresadas · ' + nf((x.palCam || 0) + (x.palAco || 0)) + ' paladas en cantera · ' + nf(x.molPal) + ' paladas a molienda' + (x.paradas.length ? ' · Paradas: ' + x.paradas.join(', ') : '');
    }
    const fondo = fondoDia(x);
    h += '<a class="c ' + (f === hoy() ? 'hoy ' : '') + (new Date(y, mo, d).getDay() === 0 ? 'domingo ' : '') + (fondo ? 'pintado' : '') + '" href="#/dia/' + f + '" style="--i:' + d + (fondo ? ';--fondo:' + fondo : '') + '" data-tip="' + esc(tip) + '"><b>' + d + '</b>' + lin + '<div class="ev">' + ev + '</div></a>';
  }
  const nombres = { viajes: 'los viajes a planta', ingreso: 'las toneladas pesadas en la balanza de ingreso', paladas: 'las paladas cargadas en cantera (camiones y acopio)', molienda: 'las toneladas molidas (balanza dinámica)' };
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Calendario</div><h1>Actividad diaria</h1><p class="sub">El color muestra qué pasó en la cantera: si hubo dos cosas (por ejemplo producción y clima) el día se parte en dos colores. El número de cada día muestra ' + nombres[metrica] + '.</p></div><div id="segMet"></div></div>' +
    '<div class="card"><div class="cal-h"><a class="btn icon" href="#/calendario/' + ant + '" data-dir="der" aria-label="Mes anterior">' + ICON.izq + '</a><h2>' + tit + '</h2><a class="btn icon" href="#/calendario/' + sig + '" data-dir="izq" aria-label="Mes siguiente">' + ICON.der + '</a></div>' +
    '<div class="cal met-' + metrica + ' ' + (dir ? 'anim-' + dir : '') + '">' + ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => '<div class="dn">' + d + '</div>').join('') + h + '</div>' +
    '<div class="leg"><span class="sw" style="--c:var(--ok)"></span>⛏️ PROD producción<span class="sw" style="--c:var(--bad)"></span>🔧 PARADA avería / mantenimiento<span class="sw" style="--c:var(--info)"></span>🌧️ CLIMA<span class="sw" style="--c:var(--warn)"></span>👷 FALTA de operario<span class="sw mezcla"></span>Dos cosas en el día<span>⛔ RECH camiones rechazados</span></div></div>' +
    '<div class="kpis mt stagger">' + kpi('Viajes a planta', vn(tot.v), nf(tot.i) + ' internos') + kpi('Ingreso balanza', vn(tot.t) + '<small>t</small>', '≈ ' + nf(tot.t / dens) + ' m³') +
    kpi('Paladas en cantera', vn(tot.p), '≈ ' + nf(tot.p * m3p) + ' m³') + kpi('Molienda', vn(tot.m) + '<small>t</small>', '≈ ' + nf(tot.m / dens) + ' m³ · ' + nf(tot.mp) + ' paladas') + '</div></div>';
  segmento($('#segMet'), [['viajes', 'Viajes'], ['ingreso', 'Ingreso (t)'], ['paladas', 'Paladas'], ['molienda', 'Molienda (t)']], metrica, k => { lsSet('tierra_cal_metrica', k); vCalendario(ym); }, true);
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
  if (puede('gasoil')) acc.push('<a class="btn" href="#/cargar/gasoil/' + f + '">' + ICON.combustible + 'Gasoil</a>');
  if (puede('viajes')) acc.push('<a class="btn" href="#/cargar/viajes/' + f + '">' + ICON.camion + 'Viajes</a>');
  if (puede('molienda')) acc.push('<a class="btn" href="#/cargar/molienda/' + f + '">' + ICON.molienda + 'Molienda</a>');
  if (puede('calidad')) acc.push('<a class="btn" href="#/cargar/calidad/' + f + '">' + ICON.calidad + 'Calidad</a>');
  if (S.ses) acc.push(botonInforme('dia', { fecha: f }, 'Enviar parte'));
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
    '<div class="kpis stagger">' + kpi('Declarados en cantera', vn(unid), nf(internos) + ' viajes internos') + kpi('Viajes a planta', vn(k.viajes.length), nf(k.viajesTot.length) + ' totales', 'kacc') +
    kpi('Tickets balanza', vn(k.pes.length), nf(k.pares.length) + ' cruzados') + kpi('Ingreso', vn(neto, 1) + '<small>t</small>', k.pes.length ? nf(neto / k.pes.length, 1) + ' t/camión' : '') +
    kpi('Molienda', vn(sum(turnos, t => (elegir(molR[t]) || {}).toneladas || 0), 0) + '<small>t</small>', nf(sum(turnos, t => (elegir(molR[t]) || {}).paladas || 0)) + ' paladas') +
    kpi('Calidad', vn(j.calidad.length), j.calidad.filter(c => c.estado === 'Rechazado').length + ' rechazadas', j.calidad.some(c => c.estado === 'Rechazado') ? 'bad' : '') + '</div>' +
    (k.pes.length && (k.sinTicket.length || k.sinViaje.length) ? '<div class="alert warn mt">' + ICON.alerta + '<div>' + (k.sinTicket.length ? '<b>' + k.sinTicket.length + '</b> viaje(s) sin ticket de balanza. ' : '') + (k.sinViaje.length ? '<b>' + k.sinViaje.length + '</b> ticket(s) sin viaje registrado.' : '') + '</div></div>' : '') +
    (Math.abs(unid - k.viajes.length) > 2 && unid ? '<div class="alert info mt">' + ICON.infoI + '<div>En la cantera se declararon <b>' + unid + '</b> camiones a planta y hay <b>' + k.viajes.length + '</b> viajes cargados.</div></div>' : '') + '</div>' +
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
  enlazarInformes(app());
}
