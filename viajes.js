'use strict';

const QV = { fecha: '', tipo: '', jornada: true, c: null, sesion: [], dia: [], pes: [], editando: false, serie: '' };

function tipoInterno() {
  return String(par('TIPO_VIAJE_INTERNO', 'INTERNO')).toUpperCase();
}

function esPlanta(destino) {
  const d = destinosPlanta();
  return !!destino && (!d.length || d.indexOf(String(destino).trim().toUpperCase()) >= 0);
}

function filaVacia(prev) {
  return { origen: prev ? prev.origen : '', destino: prev ? prev.destino : '', c: '', d: '', autoD: true, pagar: true, resp: '' };
}

function nuevoComprobante(numero) {
  const mem = lsGet('tierra_qv', {});
  const ruta = mem.ruta || ((S.info && S.info.rutas && S.info.rutas[0]) || '').split(' → ');
  return {
    numero: numero ? String(numero) : '', chofer: '', dominio: '', domAuto: false, responsable: mem.responsable || ((S.info && S.info.origenes && S.info.origenes[ruta[0]]) || {}).responsable || '', respAuto: true,
    filas: [filaVacia({ origen: ruta[0] || '', destino: ruta[1] || destinosPlanta()[0] || '' })],
    internos: { on: false, cantidad: '', lugar: '', paladas: '', pagar: true }, ia: {}
  };
}

function serieDe(n) {
  const s = String(Number(n) || '');
  return s.length > 3 ? s.slice(0, s.length - 3) : '';
}

function siguienteNumero(desde) {
  let n = Number(desde) || 0;
  if (!n) return '';
  const usados = (S.info && S.info.usados) || {};
  const ses = new Set(QV.sesion.filter(x => x.estado !== 'bad').map(x => x.numero));
  while (usados[String(n)] || ses.has(String(n))) n++;
  return String(n);
}

function numeroSugerido() {
  const series = (S.info && S.info.series) || [];
  const mem = lsGet('tierra_qv', {});
  const se = series.find(x => x.serie === (QV.serie || mem.serie)) || series[0];
  if (!se) return '';
  QV.serie = se.serie;
  return siguienteNumero(se.siguiente);
}

function guardarMemQV() {
  const f0 = QV.c && QV.c.filas[0];
  lsSet('tierra_qv', { fecha: QV.fecha, tipo: QV.tipo, jornada: QV.jornada, serie: QV.serie, responsable: QV.c ? QV.c.responsable : '', ruta: f0 && f0.origen ? [f0.origen, f0.destino] : null });
}

async function edViajes(arg, volver) {
  const mem = lsGet('tierra_qv', {});
  QV.fecha = /^\d{4}-\d{2}-\d{2}$/.test(arg || '') ? arg : (mem.fecha || hoy());
  QV.jornada = mem.jornada !== false;
  QV.editando = false;
  app().innerHTML = '<div class="vista"><div class="card"><div class="skel" style="height:90px"></div></div><div class="card"><div class="skel" style="height:260px"></div></div></div>';
  const ok = vivo();
  const [info] = await Promise.all([
    api('infoViajes').catch(e => { toast('No se pudo leer el talonario: ' + e.message, 'warn'); return { series: [], choferes: {}, origenes: {}, rutas: [], usados: {}, ultimaFecha: '' }; }),
    cargarDiaQV(true)
  ]);
  if (!ok()) return;
  S.info = info;
  QV.tipo = mem.tipo || nombres('TiposViaje').find(t => t !== tipoInterno()) || 'TIERRA';
  QV.c = nuevoComprobante(numeroSugerido());
  pintarQV(volver);
}

async function cargarDiaQV(silencioso) {
  const f = QV.fecha;
  try {
    const j = await api('jornada', { fecha: f });
    if (f !== QV.fecha) return;
    QV.dia = j.viajes || [];
    QV.pes = (j.pesajes || []).filter(p => p.tierra !== false);
  } catch (e) {
    QV.dia = [];
    QV.pes = [];
  }
  if (!silencioso) { pintarDiaQV(); refrescarBalanzaQV(); }
}

const VOLVER_QV = '<a class="btn icon" href="#/cargar" aria-label="Volver">' + ICON.izq + '</a>';

function pintarQV(volver) {
  const c = QV.c;
  const series = (S.info && S.info.series) || [];
  const atraso = S.info && S.info.ultimaFecha ? difDias(S.info.ultimaFecha, hoy()) : null;
  const sugDom = c.chofer && S.info.choferes[c.chofer] ? S.info.choferes[c.chofer].dominios[0] : '';
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + (volver || VOLVER_QV) + '<div><div class="eyebrow">' + (QV.editando ? 'Editando comprobante' : 'Carga rápida') + '</div><h1>Viajes de camiones</h1></div></div>' +
    '<div class="row"><input type="file" id="qvFoto" accept="image/*" capture="environment" class="hide"><button class="btn brillo" id="qvIA" style="border-color:var(--s7);color:var(--s7)">' + ICON.camara + 'Leer foto del talonario</button></div></div>' +
    (atraso !== null && atraso > 2 && !QV.editando ? '<div class="alert warn">' + ICON.reloj + '<div>El último viaje cargado es del <b>' + fMedia(S.info.ultimaFecha) + '</b> (' + atraso + ' días). Cargá los talonarios en orden de fecha.</div></div>' : '') +
    '<div class="qr-wrap"><div class="col" style="gap:16px">' +
    '<div class="comp-card" id="qvCard">' +
    '<div class="row" style="margin-bottom:14px"><span class="ic-tal">' + ICON.archivo + '</span><div><div class="eyebrow">Talonario</div><span class="num-comp tnum" id="qvNumTit">N° ' + esc(c.numero || '—') + '</span></div><span id="qvEstadoN"></span>' +
    '<span class="right sub" id="qvResumen"></span><label class="chk" style="font-size:.8rem"><span class="switch"><input type="checkbox" id="qvJor"' + (QV.jornada ? ' checked' : '') + '><span></span></span>Jornada completa</label><button class="btn ghost sm" id="qvLimpiar" tabindex="-1">' + ICON.x + 'Limpiar</button></div>' +
    '<div class="tal-grid">' +
    '<label class="f">Fecha<div class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn icon sm" id="qvAnt" tabindex="-1">' + ICON.izq + '</button><input type="date" id="qvFecha" value="' + QV.fecha + '"><button class="btn icon sm" id="qvSig" tabindex="-1">' + ICON.der + '</button></div></label>' +
    '<label class="f">N° de talonario<input id="qvNum" inputmode="numeric" value="' + esc(c.numero) + '"' + (QV.editando ? ' disabled' : '') + ' class="' + (c.ia.numero ? 'ia' : '') + '">' +
    (!QV.editando && series.length ? '<span class="series">' + series.map(se => '<button type="button" tabindex="-1" class="serie ' + (se.serie === QV.serie ? 'on' : '') + '" data-serie="' + se.serie + '" title="' + esc(se.origen) + '">' + esc(siguienteNumero(se.siguiente)) + '<small>' + esc(se.origen.split(' ')[0] || '') + '</small></button>').join('') + '</span>' : '') + '</label>' +
    '<label class="f w2">Chofer<input id="qvChofer" value="' + esc(c.chofer) + '" placeholder="Escribí parte del nombre" class="' + (c.ia.chofer ? 'ia' : '') + '"></label>' +
    '<label class="f"><span class="lt">Dominio' + (c.domAuto && c.dominio ? '<span class="auto-badge">más usado</span>' : '') + '</span><input id="qvDom" value="' + esc(c.dominio) + '" placeholder="' + esc(sugDom || 'AAA 000') + '" class="' + (c.ia.dominio ? 'ia' : c.domAuto && c.dominio ? 'lleno' : '') + '"></label>' +
    '<label class="f w2">Responsable de carga<input id="qvResp" value="' + esc(c.responsable) + '" class="' + (c.ia.responsable ? 'ia' : '') + '"></label>' +
    '<label class="f">Tipo de viaje<input id="qvTipo" value="' + esc(QV.tipo) + '"></label>' +
    '</div>' +
    '<div class="sec-h"><span class="eyebrow">Viajes con horario</span><span class="sub">origen → destino · carga y descarga</span></div>' +
    '<div class="vt-head"><span>#</span><span>Origen</span><span>Destino</span><span>Carga</span><span>Descarga</span><span>Control balanza</span><span>Pagar</span><span></span></div>' +
    '<div id="qvFilas"></div>' +
    '<div class="row mt"><button class="btn sm" id="qvMas" tabindex="-1">+ Agregar viaje</button><span id="qvPre"></span></div>' +
    '<div class="internos ' + (c.internos.on ? 'on' : '') + '" id="qvInt"><label class="chk"><span class="switch"><input type="checkbox" id="qvIntOn"' + (c.internos.on ? ' checked' : '') + '><span></span></span><b>Viajes internos de tierra</b><span class="sub">(dentro de la cantera, sin horario)</span></label>' +
    '<div class="int-box"><div><div class="form" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' +
    '<label class="f">Cantidad de viajes<input id="qvIntN" type="number" min="1" inputmode="numeric" value="' + esc(c.internos.cantidad) + '"></label>' +
    '<label class="f">Lugar<input id="qvIntL" value="' + esc(c.internos.lugar) + '" placeholder="Cantera / acopio"></label>' +
    '<label class="f">Paladas por viaje <span class="muted">(opcional)</span><input id="qvIntP" type="number" min="0" inputmode="numeric" value="' + esc(c.internos.paladas) + '"></label>' +
    '<label class="chk" style="align-self:end;padding-bottom:10px"><input type="checkbox" id="qvIntPag"' + (c.internos.pagar ? ' checked' : '') + '>Pagar</label></div><div class="sub mt" id="qvIntRes"></div></div></div></div>' +
    '<div id="qvErr" class="mt"></div>' +
    '<div class="row mt"><button class="btn pri" id="qvGuardar">' + ICON.guardar + (QV.editando ? 'Guardar cambios' : 'Guardar y seguir') + '</button>' + (QV.editando ? '<button class="btn" id="qvCancelar">Cancelar edición</button>' : '') +
    '<div class="atajos right"><span><kbd>Enter</kbd> avanza</span><span><kbd>Enter</kbd> en carga vacía = guardar</span><span><kbd>Ctrl</kbd>+<kbd>Enter</kbd> guardar</span><span><kbd>435</kbd> = 04:35</span></div></div></div></div>' +
    '<div class="col" style="gap:16px"><div class="card"><div class="card-h"><div class="t"><h3>Cargados ahora</h3><div class="sub">Se graban en la planilla original</div></div></div><div class="sesion-lista" id="qvSes"></div></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3 id="qvDiaTit">Talonarios del ' + fCorta(QV.fecha) + '</h3><div class="sub" id="qvDiaSub"></div></div></div><div id="qvDia" class="sesion-lista"></div></div></div></div></div>';
  pintarFilasQV();
  pintarSesionQV();
  pintarDiaQV();
  enlazarQV();
  validarNumeroQV();
  resumenQV();
  refrescarInternosQV();
  setTimeout(() => {
    if (Object.keys(c.ia || {}).length) return;
    const el = QV.editando || c.chofer ? $('#qvFilas [data-k="c"]') : (c.numero ? $('#qvChofer') : $('#qvNum'));
    if (el) { el.focus(); if (el.select) el.select(); }
  }, 60);
}

function htmlFilaQV(x, i) {
  return '<div class="vt-row" data-i="' + i + '"><span class="n">' + (i + 1) + '</span>' +
    '<input data-i="' + i + '" data-k="origen" value="' + esc(x.origen) + '" placeholder="Origen" tabindex="-1" class="' + (QV.c.ia['o' + i] ? 'ia' : '') + '">' +
    '<input data-i="' + i + '" data-k="destino" value="' + esc(x.destino) + '" placeholder="Destino" tabindex="-1" class="' + (QV.c.ia['o' + i] ? 'ia' : '') + '">' +
    '<input data-i="' + i + '" data-k="c" value="' + esc(x.c) + '" placeholder="Carga" inputmode="numeric" maxlength="5" class="hr ' + (QV.c.ia['c' + i] ? 'ia' : '') + '">' +
    '<input data-i="' + i + '" data-k="d" value="' + esc(x.d) + '" placeholder="Descarga" inputmode="numeric" maxlength="5" class="hr ' + (QV.c.ia['d' + i] ? 'ia' : '') + '" style="' + (x.autoD && x.d ? 'color:var(--muted)' : '') + '">' +
    '<span class="bal" data-bal="' + i + '"></span>' +
    '<label class="chk"><input type="checkbox" data-i="' + i + '" data-k="pagar" tabindex="-1"' + (x.pagar ? ' checked' : '') + '></label>' +
    '<button class="btn ghost icon sm" data-quitar="' + i + '" tabindex="-1" aria-label="Quitar">' + ICON.x.replace('<svg', '<svg width="14" height="14"') + '</button></div>';
}

function pintarFilasQV() {
  const f = QV.c.filas;
  if (!f.length || f[f.length - 1].c) f.push(filaVacia(f[f.length - 1]));
  $('#qvFilas').innerHTML = f.map((x, i) => htmlFilaQV(x, i)).join('');
  $$('#qvFilas input[data-k="origen"], #qvFilas input[data-k="destino"]').forEach(inp => {
    autocompletar(inp, () => nombres('Lugares'), v => { QV.c.filas[Number(inp.dataset.i)][inp.dataset.k] = v; alCambiarRuta(Number(inp.dataset.i)); }, { agregar: async (val, el) => { const r = await agregarAlCatalogo('Lugares', val); if (r) { el.value = r; QV.c.filas[Number(el.dataset.i)][el.dataset.k] = r; alCambiarRuta(Number(el.dataset.i)); } } });
  });
  refrescarBalanzaQV();
}

function alCambiarRuta(i) {
  const x = QV.c.filas[i];
  if (i === 0 && QV.c.respAuto && x.origen && S.info.origenes[x.origen] && S.info.origenes[x.origen].responsable) {
    QV.c.responsable = S.info.origenes[x.origen].responsable;
    $('#qvResp').value = QV.c.responsable;
  }
  for (let k = i + 1; k < QV.c.filas.length; k++) {
    const y = QV.c.filas[k];
    if (!y.c) { y.origen = x.origen; y.destino = x.destino; const r = $('#qvFilas .vt-row[data-i="' + k + '"]'); if (r) { $('[data-k="origen"]', r).value = x.origen; $('[data-k="destino"]', r).value = x.destino; } }
  }
  if (!QV.c.internos.lugar && x.origen) { QV.c.internos.lugar = x.origen; const l = $('#qvIntL'); if (l) l.value = x.origen; }
  refrescarBalanzaQV();
}

function asegurarVacioQV() {
  const f = QV.c.filas;
  const max = Number(par('MAX_VIAJES_COMPROBANTE', 8)) || 8;
  if (f.length < max && f[f.length - 1].c) {
    f.push(filaVacia(f[f.length - 1]));
    $('#qvFilas').insertAdjacentHTML('beforeend', htmlFilaQV(f[f.length - 1], f.length - 1));
    const i = f.length - 1;
    $$('#qvFilas .vt-row[data-i="' + i + '"] input[data-k="origen"], #qvFilas .vt-row[data-i="' + i + '"] input[data-k="destino"]').forEach(inp => {
      autocompletar(inp, () => nombres('Lugares'), v => { QV.c.filas[Number(inp.dataset.i)][inp.dataset.k] = v; alCambiarRuta(Number(inp.dataset.i)); });
    });
  }
}

function cicloQV(x) {
  if (!x.c || !x.d) return { txt: '', cls: '', min: null };
  const a = minDe(x.c);
  const b = minDe(x.d);
  if (a === null || b === null) return { txt: '', cls: '', min: null };
  let m = b - a;
  if (m < 0) m += 1440;
  if (b < a && !(a >= 1020 && b <= 360)) return { txt: 'descarga antes de carga', cls: 'mal', min: null };
  return { txt: (m >= 60 ? Math.floor(m / 60) + ' h ' : '') + (m % 60) + ' min', cls: m > 240 ? 'adv' : '', min: m };
}

function ticketsUsadosDia(excluir) {
  const usados = new Set();
  const vs = (QV.dia || []).filter(v => v.comprobante !== excluir && esPlanta(v.destino) && v.horaDescarga);
  vs.forEach(v => {
    const t = mejorTicket(v.dominio, v.horaDescarga, usados);
    if (t && t.dt <= 90) usados.add(t.p);
  });
  return usados;
}

function mejorTicket(dominio, hora, usados) {
  const m = minDe(hora);
  if (m === null) return null;
  let best = null;
  (QV.pes || []).forEach(p => {
    if (normDom(p.dominio) !== normDom(dominio) || (usados && usados.has(p))) return;
    const dt = Math.abs((minDe(p.hora) || 0) - m);
    if (!best || dt < best.dt) best = { p: p, dt: dt };
  });
  return best;
}

function refrescarBalanzaQV() {
  if (!QV.c || !$('#qvFilas')) return;
  const dom = QV.c.dominio;
  const usados = ticketsUsadosDia(QV.c.numero);
  const vent = num(par('VENTANA_MATCH_MIN', 120)) || 120;
  QV.c.filas.forEach((x, i) => {
    const el = $('[data-bal="' + i + '"]');
    if (!el) return;
    const ci = cicloQV(x);
    let h = ci.txt ? '<span class="ciclo ' + ci.cls + '">' + ci.txt + '</span>' : '';
    if (x.c && esPlanta(x.destino)) {
      if (!QV.pes.length) h += '<span class="tag t-mut" title="Importá el PESAJE.XLS de este día para controlar">sin pesaje del día</span>';
      else if (!dom) h += '<span class="tag t-mut">falta dominio</span>';
      else {
        const t = mejorTicket(dom, x.d || x.c, usados);
        if (t && t.dt <= 30) { usados.add(t.p); h += '<span class="tag t-ok">' + ICON.ok.replace('<svg', '<svg width="12" height="12"') + 'ticket ' + esc(t.p.ticket || '') + ' · ' + t.p.hora + ' · ' + nf(t.p.neto, 1) + ' t</span>'; }
        else if (t && t.dt <= vent) { usados.add(t.p); h += '<button class="tag t-warn" data-usar="' + i + '" data-h="' + t.p.hora + '" tabindex="-1" title="Usar la hora de balanza como descarga">balanza ' + t.p.hora + ' (Δ ' + t.dt + ' min) · usar</button>'; }
        else h += '<span class="tag t-bad">sin ticket en balanza</span>';
      }
    }
    el.innerHTML = h;
  });
  const pre = $('#qvPre');
  if (pre) {
    const libres = dom ? (QV.pes || []).filter(p => normDom(p.dominio) === normDom(dom) && !usados.has(p)) : [];
    const cargadas = QV.c.filas.filter(x => x.c).length;
    const html = libres.length && !cargadas ? '<button class="btn sm" id="qvDesdeBal" tabindex="-1" style="border-color:var(--s3);color:var(--s3)">' + ICON.balanza + 'Precargar ' + libres.length + ' viaje' + (libres.length > 1 ? 's' : '') + ' desde balanza</button>' :
      libres.length ? '<span class="sub">' + libres.length + ' pesada' + (libres.length > 1 ? 's' : '') + ' de este camión sin viaje: ' + libres.map(p => p.hora).join(', ') + '</span>' : '';
    if (pre.dataset.h !== html) { pre.innerHTML = html; pre.dataset.h = html; }
  }
}

function precargarDesdeBalanza() {
  const dom = QV.c.dominio;
  const usados = ticketsUsadosDia(QV.c.numero);
  const libres = (QV.pes || []).filter(p => normDom(p.dominio) === normDom(dom) && !usados.has(p)).sort((a, b) => (minDe(a.hora) || 0) - (minDe(b.hora) || 0));
  const base = QV.c.filas[0];
  const ciclo = cicloMedioChofer(QV.c.chofer);
  QV.c.filas = libres.map(p => ({ origen: base.origen, destino: base.destino, c: hDe((minDe(p.hora) || 0) - ciclo), d: p.hora, autoD: false, pagar: true, resp: '' }));
  QV.c.filas.forEach((x, i) => { QV.c.ia['c' + i] = true; });
  pintarFilasQV();
  resumenQV();
  toast('Se precargaron ' + libres.length + ' viajes con la hora de balanza como descarga. Corregí la hora de carga con el talonario (violeta = estimada).', 'info', 8000);
}

function cicloMedioChofer(ch) {
  const vs = (QV.dia || []).filter(v => v.chofer === ch && v.horaCarga && v.horaDescarga).map(v => dur(v.horaCarga, v.horaDescarga) * 60).filter(m => m > 10 && m < 240).sort((a, b) => a - b);
  const m = quant(vs, 0.5);
  return m ? Math.round(m / 5) * 5 : 60;
}

function resumenQV() {
  const v = QV.c.filas.filter(x => x.c);
  const ni = QV.c.internos.on ? (Number(QV.c.internos.cantidad) || 0) : 0;
  const partes = [];
  if (v.length) partes.push(v.length + ' con horario');
  if (ni) partes.push(ni + ' interno' + (ni > 1 ? 's' : ''));
  $('#qvResumen').textContent = partes.join(' · ') || 'sin viajes';
  $('#qvNumTit').textContent = 'N° ' + (QV.c.numero || '—');
}

function refrescarInternosQV() {
  const it = QV.c.internos;
  const r = $('#qvIntRes');
  if (!r) return;
  const n = Number(it.cantidad) || 0;
  const p = Number(it.paladas) || 0;
  r.textContent = n ? n + ' viaje' + (n > 1 ? 's' : '') + ' internos' + (p ? ' · ' + nf(n * p) + ' paladas trasladadas' : '') + (it.lugar ? ' en ' + it.lugar : '') : '';
}

function validarNumeroQV() {
  const n = QV.c.numero;
  const el = $('#qvEstadoN');
  if (!el) return true;
  if (!n) { el.innerHTML = ''; return false; }
  if (QV.editando) { el.innerHTML = '<span class="tag t-info">edición</span>'; return true; }
  const usado = (S.info.usados || {})[n] || (QV.sesion.find(s => s.numero === n && s.estado !== 'bad') ? 'cargado ahora' : '');
  el.innerHTML = usado ? '<span class="tag t-bad">ya existe · ' + esc(usado) + '</span>' : '<span class="tag t-ok">' + ICON.ok.replace('<svg', '<svg width="12" height="12"') + 'libre</span>';
  $('#qvNum').classList.toggle('inv', !!usado);
  return !usado;
}

function domSugerido(ch) {
  const inf = S.info && S.info.choferes ? S.info.choferes[ch] : null;
  return inf && inf.dominios.length ? inf.dominios[0] : '';
}

function enlazarQV() {
  const c = QV.c;
  const cambiarFecha = f => {
    QV.fecha = f;
    guardarMemQV();
    $('#qvFecha').value = f;
    $('#qvDiaTit').textContent = 'Talonarios del ' + fCorta(f);
    $('#qvDiaSub').textContent = 'Cargando…';
    cargarDiaQV();
  };
  $('#qvFecha').onchange = e => { if (e.target.value) cambiarFecha(e.target.value); };
  $('#qvAnt').onclick = () => cambiarFecha(addDias(QV.fecha, -1));
  $('#qvSig').onclick = () => cambiarFecha(addDias(QV.fecha, 1));
  $$('#qvCard .serie').forEach(b => {
    b.onclick = () => {
      QV.serie = b.dataset.serie;
      $$('#qvCard .serie').forEach(x => x.classList.toggle('on', x === b));
      c.numero = siguienteNumero(((S.info.series || []).find(x => x.serie === QV.serie) || {}).siguiente);
      $('#qvNum').value = c.numero;
      guardarMemQV();
      validarNumeroQV();
      resumenQV();
      $('#qvChofer').focus();
    };
  });
  $('#qvNum').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '');
    c.numero = e.target.value;
    const se = serieDe(c.numero);
    if (se && (S.info.series || []).some(x => x.serie === se)) { QV.serie = se; $$('#qvCard .serie').forEach(x => x.classList.toggle('on', x.dataset.serie === se)); }
    validarNumeroQV();
    resumenQV();
  });
  autocompletar($('#qvChofer'), () => nombres('Choferes'), v => {
    c.chofer = v;
    const sug = domSugerido(v);
    if (sug && (!c.dominio || c.domAuto)) {
      c.dominio = sug;
      c.domAuto = true;
      const d = $('#qvDom');
      d.value = sug;
      d.classList.add('lleno');
      d.parentElement.querySelector('.lt').innerHTML = 'Dominio<span class="auto-badge">más usado</span>';
    }
    refrescarBalanzaQV();
  }, { agregar: async (val, inp) => { const r = await agregarAlCatalogo('Choferes', val); if (r) { inp.value = r; c.chofer = r; inp.classList.remove('adv'); } }, detalle: x => domSugerido(x) });
  $('#qvChofer').addEventListener('change', e => { c.chofer = e.target.value.trim(); });
  const fuenteDom = () => {
    const pref = c.chofer && S.info.choferes[c.chofer] ? S.info.choferes[c.chofer].dominios : [];
    return pref.concat(nombres('Dominios').filter(d => pref.indexOf(d) < 0));
  };
  autocompletar($('#qvDom'), fuenteDom, v => { c.dominio = v; c.domAuto = false; $('#qvDom').classList.remove('lleno'); refrescarBalanzaQV(); }, {
    agregar: async (val, inp) => { const r = await agregarAlCatalogo('Dominios', val); if (r) { inp.value = r; c.dominio = r; c.domAuto = false; inp.classList.remove('adv'); refrescarBalanzaQV(); } },
    detalle: x => { const l = c.chofer && S.info.choferes[c.chofer] ? S.info.choferes[c.chofer].dominios : []; const k = l.indexOf(x); return k === 0 ? 'más usado' : k > 0 ? 'lo usó' : ''; }
  });
  $('#qvDom').addEventListener('input', () => { c.domAuto = false; $('#qvDom').classList.remove('lleno'); });
  $('#qvDom').addEventListener('change', e => { c.dominio = e.target.value.trim(); refrescarBalanzaQV(); });
  autocompletar($('#qvResp'), () => nombres('Responsables'), v => { c.responsable = v; c.respAuto = false; guardarMemQV(); }, { agregar: async (val, inp) => { const r = await agregarAlCatalogo('Responsables', val); if (r) { inp.value = r; c.responsable = r; inp.classList.remove('adv'); } } });
  $('#qvResp').addEventListener('change', e => { c.responsable = e.target.value.trim(); c.respAuto = false; });
  autocompletar($('#qvTipo'), () => nombres('TiposViaje').filter(t => t !== tipoInterno()), v => { QV.tipo = v; guardarMemQV(); });
  $('#qvTipo').addEventListener('change', e => { QV.tipo = e.target.value.trim(); guardarMemQV(); });
  $('#qvJor').onchange = e => { QV.jornada = e.target.checked; guardarMemQV(); };
  $('#qvLimpiar').onclick = () => { QV.editando = false; QV.c = nuevoComprobante(numeroSugerido()); pintarQV(); };
  if ($('#qvCancelar')) $('#qvCancelar').onclick = () => { QV.editando = false; QV.c = nuevoComprobante(numeroSugerido()); pintarQV(); };
  $('#qvGuardar').onclick = () => guardarQV();
  $('#qvMas').onclick = () => { const f = c.filas; f.push(filaVacia(f[f.length - 1])); pintarFilasQV(); const el = $('#qvFilas .vt-row:last-child [data-k="c"]'); if (el) el.focus(); };
  const intOn = $('#qvIntOn');
  intOn.onchange = () => {
    c.internos.on = intOn.checked;
    $('#qvInt').classList.toggle('on', intOn.checked);
    if (intOn.checked) {
      if (!c.internos.lugar) { c.internos.lugar = (c.filas[0] && c.filas[0].origen) || (S.info.choferes[c.chofer] || {}).origen || ''; $('#qvIntL').value = c.internos.lugar; }
      setTimeout(() => $('#qvIntN').focus(), 220);
    }
    resumenQV();
    refrescarInternosQV();
  };
  $('#qvIntN').oninput = e => { c.internos.cantidad = e.target.value; resumenQV(); refrescarInternosQV(); };
  $('#qvIntP').oninput = e => { c.internos.paladas = e.target.value; refrescarInternosQV(); };
  $('#qvIntPag').onchange = e => { c.internos.pagar = e.target.checked; };
  autocompletar($('#qvIntL'), () => nombres('Lugares'), v => { c.internos.lugar = v; refrescarInternosQV(); });
  $('#qvIntL').addEventListener('change', e => { c.internos.lugar = e.target.value.trim(); refrescarInternosQV(); });
  const fl = $('#qvFilas');
  fl.addEventListener('input', e => {
    const el = e.target;
    const x = c.filas[Number(el.dataset.i)];
    if (!x || !el.dataset.k) return;
    if (el.dataset.k === 'c' || el.dataset.k === 'd') { el.value = el.value.replace(/[^\d:.,]/g, ''); el.classList.remove('inv', 'ia'); }
    if (el.dataset.k === 'd') { x.autoD = false; x.d = el.value; el.style.color = ''; }
    if (el.dataset.k === 'origen' || el.dataset.k === 'destino') x[el.dataset.k] = el.value;
  });
  fl.addEventListener('change', e => {
    const el = e.target;
    const i = Number(el.dataset.i);
    const x = c.filas[i];
    if (!x) return;
    if (el.dataset.k === 'pagar') x.pagar = el.checked;
    if (el.dataset.k === 'origen' || el.dataset.k === 'destino') { x[el.dataset.k] = el.value.trim(); alCambiarRuta(i); }
  });
  fl.addEventListener('focusout', e => { const el = e.target; if (el.dataset && (el.dataset.k === 'c' || el.dataset.k === 'd')) normalizarHoraQV(el); });
  $('#qvCard').addEventListener('click', e => {
    const q = e.target.closest('[data-quitar]');
    if (q) {
      c.filas.splice(Number(q.dataset.quitar), 1);
      pintarFilasQV();
      resumenQV();
      return;
    }
    const u = e.target.closest('[data-usar]');
    if (u) {
      const x = c.filas[Number(u.dataset.usar)];
      x.d = u.dataset.h;
      x.autoD = false;
      const inp = $('#qvFilas .vt-row[data-i="' + u.dataset.usar + '"] [data-k="d"]');
      if (inp) { inp.value = x.d; inp.style.color = ''; }
      refrescarBalanzaQV();
      return;
    }
    if (e.target.closest('#qvDesdeBal')) precargarDesdeBalanza();
  });
  $('#qvCard').addEventListener('input', () => { const er = $('#qvErr'); if (er && er.innerHTML) er.innerHTML = ''; });
  $('#qvCard').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || $('.ac-lista')) return;
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); guardarQV(); return; }
    const el = e.target;
    if (el.tagName === 'BUTTON' || el.type === 'checkbox') return;
    e.preventDefault();
    if (el.dataset && el.dataset.k === 'c' && !el.value.trim()) {
      if (c.internos.on && !$('#qvIntN').value) { $('#qvIntN').focus(); return; }
      guardarQV();
      return;
    }
    if (el.dataset && (el.dataset.k === 'c' || el.dataset.k === 'd')) normalizarHoraQV(el);
    siguienteCampoQV(el);
  });
}

function normalizarHoraQV(el) {
  const i = Number(el.dataset.i);
  const x = QV.c.filas[i];
  if (!x) return;
  const raw = el.value.trim();
  if (!raw) {
    x[el.dataset.k] = '';
    if (el.dataset.k === 'd') x.autoD = true;
    refrescarBalanzaQV();
    resumenQV();
    return;
  }
  const h = parseHora(raw);
  if (h === null) { el.classList.add('inv'); return; }
  el.value = h;
  x[el.dataset.k] = h;
  if (el.dataset.k === 'c' && (x.autoD || !x.d)) {
    x.d = hDe(minDe(h) + cicloMedioChofer(QV.c.chofer));
    x.autoD = true;
    const d = $('#qvFilas .vt-row[data-i="' + i + '"] [data-k="d"]');
    if (d && document.activeElement !== d) { d.value = x.d; d.style.color = 'var(--muted)'; }
  }
  asegurarVacioQV();
  refrescarBalanzaQV();
  resumenQV();
}

function siguienteCampoQV(el) {
  const orden = ['qvNum', 'qvChofer', 'qvDom', 'qvResp'];
  const k = orden.indexOf(el.id);
  if (k >= 0) {
    if (el.id === 'qvChofer' && QV.c.dominio && QV.c.responsable) { $('#qvFilas [data-k="c"]').focus(); return; }
    const sig = k < orden.length - 1 ? $('#' + orden[k + 1]) : $('#qvFilas [data-k="c"]');
    if (sig) { sig.focus(); if (sig.select) sig.select(); }
    return;
  }
  if (el.id === 'qvIntN') { $('#qvIntP').focus(); return; }
  if (el.id === 'qvIntP' || el.id === 'qvIntL') { $('#qvGuardar').focus(); return; }
  if (el.dataset && (el.dataset.k === 'origen' || el.dataset.k === 'destino')) {
    const s2 = $('#qvFilas .vt-row[data-i="' + el.dataset.i + '"] [data-k="' + (el.dataset.k === 'origen' ? 'destino' : 'c') + '"]');
    if (s2) s2.focus();
    return;
  }
  const i = Number(el.dataset.i);
  const sel = el.dataset.k === 'c' ? '.vt-row[data-i="' + i + '"] [data-k="d"]' : '.vt-row[data-i="' + (i + 1) + '"] [data-k="c"]';
  const sig = $('#qvFilas ' + sel);
  if (sig) { sig.focus(); sig.select(); } else $('#qvGuardar').focus();
}

function validarQV() {
  const c = QV.c;
  const err = [];
  const adv = [];
  const marca = (el, msg) => { if (el) el.classList.add('inv'); err.push(msg); };
  if (!c.numero) marca($('#qvNum'), 'número de talonario');
  else if (!QV.editando && !validarNumeroQV()) err.push('el talonario N° ' + c.numero + ' ya existe');
  if (!c.chofer) marca($('#qvChofer'), 'chofer');
  if (!c.dominio) marca($('#qvDom'), 'dominio');
  if (!c.responsable) marca($('#qvResp'), 'responsable de carga');
  const filas = c.filas.filter(x => x.c || x.d);
  const nInt = c.internos.on ? Number(c.internos.cantidad) || 0 : 0;
  if (!filas.length && !nInt) marca($('#qvFilas [data-k="c"]'), 'al menos un viaje con horario o viajes internos');
  if (filas.length && !QV.tipo) marca($('#qvTipo'), 'tipo de viaje');
  let prev = null;
  let off = 0;
  c.filas.forEach((x, i) => {
    if (!x.c && !x.d) return;
    const row = $('#qvFilas .vt-row[data-i="' + i + '"]');
    const q = k => row ? $('[data-k="' + k + '"]', row) : null;
    if (!x.origen) marca(q('origen'), 'origen del viaje ' + (i + 1));
    if (!x.destino) marca(q('destino'), 'destino del viaje ' + (i + 1));
    if (x.origen && normTxt(x.origen) === normTxt(x.destino)) marca(q('destino'), 'viaje ' + (i + 1) + ': origen y destino iguales (usá «viajes internos»)');
    if (!x.c) marca(q('c'), 'hora de carga del viaje ' + (i + 1));
    if (!x.d) marca(q('d'), 'hora de descarga del viaje ' + (i + 1));
    const ci = cicloQV(x);
    if (ci.cls === 'mal') marca(q('d'), 'viaje ' + (i + 1) + ': descarga antes de la carga');
    if (ci.cls === 'adv') adv.push('Viaje ' + (i + 1) + ': ciclo de ' + ci.txt);
    if (!x.c) return;
    let a = minDe(x.c) + off;
    if (prev !== null && a < prev.c && prev.c - a > 600) { off += 1440; a += 1440; }
    if (prev !== null && a < prev.d - 10) marca(q('c'), 'viaje ' + (i + 1) + ': carga antes de la descarga del viaje anterior');
    let d = minDe(x.d || x.c) + off;
    if (d < a) d += 1440;
    prev = { c: a, d: d };
  });
  if (c.internos.on) {
    if (!nInt || nInt < 1) marca($('#qvIntN'), 'cantidad de viajes internos');
    if (!c.internos.lugar) marca($('#qvIntL'), 'lugar de los viajes internos');
  }
  const sinTicket = $$('#qvFilas .bal .t-bad').length;
  if (sinTicket) adv.push(sinTicket + ' viaje(s) a planta sin ticket en la balanza de ese día');
  const nuevos = [];
  const chk = (hoja, v) => { if (v && !canonico(v, nombres(hoja))) nuevos.push([hoja, v]); };
  chk('Choferes', c.chofer);
  chk('Dominios', c.dominio);
  chk('Responsables', c.responsable);
  if (filas.length) chk('TiposViaje', QV.tipo);
  const lug = new Set();
  filas.forEach(x => { lug.add(x.origen); lug.add(x.destino); });
  if (nInt) lug.add(c.internos.lugar);
  lug.forEach(l => chk('Lugares', l));
  return { err: err, adv: adv, nuevos: nuevos };
}

async function guardarQV() {
  const c = QV.c;
  $$('#qvCard .inv').forEach(x => x.classList.remove('inv'));
  c.chofer = $('#qvChofer').value.trim();
  c.dominio = $('#qvDom').value.trim();
  c.responsable = $('#qvResp').value.trim();
  QV.tipo = $('#qvTipo').value.trim();
  c.internos.lugar = $('#qvIntL').value.trim();
  $$('#qvFilas input[data-k="c"], #qvFilas input[data-k="d"]').forEach(el => { const x = c.filas[Number(el.dataset.i)]; const h = el.value.trim() ? parseHora(el.value) : ''; if (h === null) el.classList.add('inv'); else if (x) x[el.dataset.k] = h; });
  $$('#qvFilas input[data-k="origen"], #qvFilas input[data-k="destino"]').forEach(el => { const x = c.filas[Number(el.dataset.i)]; if (x) x[el.dataset.k] = el.value.trim(); });
  const v = validarQV();
  if (v.err.length) {
    $('#qvErr').innerHTML = '<div class="alert bad">' + ICON.alerta + '<div><b>Falta completar o corregir:</b> ' + v.err.map(esc).join(' · ') + '</div></div>';
    const p = $('#qvCard .inv');
    if (p) p.focus();
    return;
  }
  $('#qvErr').innerHTML = '';
  if (v.nuevos.length || v.adv.length) {
    const txt = (v.nuevos.length ? 'Se agregarán al catálogo de la planilla original: <b>' + v.nuevos.map(n => esc(n[1])).join(', ') + '</b>.<br>' : '') + v.adv.map(esc).join('<br>');
    if (!(await confirmar('Revisar antes de guardar', txt, 'Guardar igual'))) return;
    for (const n of v.nuevos) {
      const r = await agregarAlCatalogo(n[0], n[1]);
      if (!r) return;
      if (n[0] === 'Choferes') c.chofer = r;
      if (n[0] === 'Dominios') c.dominio = r;
      if (n[0] === 'Responsables') c.responsable = r;
      if (n[0] === 'TiposViaje') QV.tipo = r;
      if (n[0] === 'Lugares') {
        c.filas.forEach(x => { if (normTxt(x.origen) === normTxt(r)) x.origen = r; if (normTxt(x.destino) === normTxt(r)) x.destino = r; });
        if (normTxt(c.internos.lugar) === normTxt(r)) c.internos.lugar = r;
      }
    }
  }
  const comunes = c.filas.filter(x => x.c).map(x => ({ origen: x.origen, destino: x.destino, tipo: QV.tipo, horaCarga: x.c, horaDescarga: x.d, responsable: c.responsable, pagar: x.pagar }));
  const nInt = c.internos.on ? Number(c.internos.cantidad) || 0 : 0;
  const internos = [];
  for (let k = 0; k < nInt; k++) internos.push({ interno: true, origen: c.internos.lugar, destino: c.internos.lugar, paladas: c.internos.paladas, responsable: c.responsable, pagar: c.internos.pagar });
  const datos = { fecha: QV.fecha, comprobante: c.numero, chofer: c.chofer, dominio: c.dominio, responsable: c.responsable, tipo: QV.tipo, jornadaCompleta: QV.jornada, reemplazar: QV.editando, viajes: comunes.concat(internos) };
  const item = { id: uid(), numero: c.numero, chofer: c.chofer, dominio: c.dominio, n: comunes.length, ni: nInt, fecha: QV.fecha, estado: 'enviando', comp: JSON.parse(JSON.stringify(c)) };
  QV.sesion.unshift(item);
  guardarMemQV();
  const eraEdicion = QV.editando;
  QV.editando = false;
  const serie = serieDe(c.numero);
  if (serie) QV.serie = serie;
  QV.c = nuevoComprobante(siguienteNumero(Number(c.numero) + 1));
  QV.c.responsable = c.responsable;
  pintarQV();
  try {
    const r = await escribir('guardarViajes', datos, 'Talonario ' + datos.comprobante);
    item.estado = r.encolado ? 'cola' : 'ok';
    if (!r.encolado) {
      S.info.usados[datos.comprobante] = datos.fecha + ' · ' + datos.chofer;
      const se = (S.info.series || []).find(x => x.serie === serieDe(datos.comprobante));
      if (se && Number(datos.comprobante) >= se.ultimo) { se.ultimo = Number(datos.comprobante); se.siguiente = Number(siguienteNumero(se.ultimo + 1)); }
      const ch = S.info.choferes[datos.chofer] || (S.info.choferes[datos.chofer] = { dominios: [], origen: '' });
      if (ch.dominios.indexOf(datos.dominio) < 0) ch.dominios.push(datos.dominio);
      if (datos.fecha === QV.fecha) cargarDiaQV();
      if (eraEdicion) toast('Talonario ' + datos.comprobante + ' actualizado', 'ok');
    }
  } catch (e) {
    item.estado = 'bad';
    item.error = e.message;
    toast('Talonario ' + datos.comprobante + ': ' + e.message, 'bad', 8000);
  }
  pintarSesionQV();
  validarNumeroQV();
}

function pintarSesionQV() {
  const el = $('#qvSes');
  if (!el) return;
  if (!QV.sesion.length) { el.innerHTML = '<div class="empty" style="padding:14px">' + ICON.camion + '<span>Los talonarios que guardes aparecen acá.</span></div>'; return; }
  const st = { enviando: '<span class="st"><span class="spin"></span></span>', ok: '<span class="st ok"><svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg></span>', bad: '<span class="st bad">' + ICON.x + '</span>', cola: '<span class="st cola">' + ICON.reloj + '</span>' };
  el.innerHTML = QV.sesion.map(s => '<div class="ses-item"><span>' + st[s.estado] + '</span><div class="txt"><b>N° ' + esc(s.numero) + ' · ' + (s.n ? s.n + ' con horario' : '') + (s.n && s.ni ? ' + ' : '') + (s.ni ? s.ni + ' internos' : '') + '</b><small>' + esc(s.chofer) + ' · ' + esc(s.dominio) + ' · ' + fCorta(s.fecha) + (s.error ? '<br><span style="color:var(--bad)">' + esc(s.error) + '</span>' : s.estado === 'cola' ? ' · pendiente (sin conexión)' : '') + '</small></div>' +
    (s.estado === 'bad' ? '<button class="btn sm" data-rec="' + s.id + '">Corregir</button>' : '') + '</div>').join('');
  el.onclick = e => {
    const b = e.target.closest('[data-rec]');
    if (!b) return;
    const s = QV.sesion.find(x => x.id === b.dataset.rec);
    if (!s) return;
    QV.sesion = QV.sesion.filter(x => x !== s);
    QV.fecha = s.fecha;
    QV.c = s.comp;
    QV.c.ia = {};
    pintarQV();
  };
}

function pintarDiaQV() {
  const el = $('#qvDia');
  if (!el) return;
  const g = agrupar(QV.dia || [], v => v.comprobante);
  const ks = Object.keys(g).sort((a, b) => (g[a][0].horaCarga || '99') < (g[b][0].horaCarga || '99') ? -1 : 1);
  const ti = tipoInterno();
  $('#qvDiaSub').textContent = ks.length ? ks.length + ' talonarios · ' + (QV.dia || []).length + ' viajes' + (QV.pes.length ? ' · ' + QV.pes.length + ' pesadas en balanza' : ' · sin pesaje importado') : 'Sin viajes cargados para esta fecha';
  el.innerHTML = ks.map(k => {
    const vs = g[k];
    const ints = vs.filter(v => String(v.tipo).toUpperCase() === ti).length;
    const hs = vs.filter(v => String(v.tipo).toUpperCase() !== ti);
    return '<div class="ses-item" style="animation:none"><span class="st" style="background:var(--panel);border:1px solid var(--line)">' + ICON.camion.replace('<svg', '<svg width="14" height="14"') + '</span><div class="txt"><b>N° ' + esc(k) + ' · ' + (hs.length ? hs.length + ' viajes' : '') + (ints ? (hs.length ? ' + ' : '') + ints + ' internos' : '') + '</b><small>' + esc(vs[0].chofer) + ' · ' + esc(vs[0].dominio) + (hs.length ? ' · ' + hs.map(v => v.horaCarga).join(' ') : '') + '</small></div>' +
      '<button class="btn icon sm" data-ed="' + esc(k) + '" aria-label="Editar">' + ICON.editar + '</button><button class="btn icon sm dan" data-el="' + esc(k) + '" aria-label="Eliminar">' + ICON.borrar + '</button></div>';
  }).join('');
  el.onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ed) {
      const vs = g[b.dataset.ed].slice().sort((a, c) => (a.nroViaje || 0) - (c.nroViaje || 0));
      const ints = vs.filter(v => String(v.tipo).toUpperCase() === ti);
      const hs = vs.filter(v => String(v.tipo).toUpperCase() !== ti);
      QV.editando = true;
      QV.jornada = vs[0].jornadaCompleta;
      if (hs.length) QV.tipo = hs[0].tipo;
      QV.c = {
        numero: b.dataset.ed, chofer: vs[0].chofer, dominio: vs[0].dominio, domAuto: false, responsable: vs[0].responsable, respAuto: false, ia: {},
        filas: hs.map(v => ({ origen: v.origen, destino: v.destino, c: v.horaCarga, d: v.horaDescarga, autoD: false, pagar: v.pagar, resp: '' })),
        internos: { on: ints.length > 0, cantidad: ints.length || '', lugar: ints.length ? ints[0].origen : '', paladas: ints.length && ints[0].paladas !== null ? ints[0].paladas : '', pagar: ints.length ? ints[0].pagar : true }
      };
      if (!QV.c.filas.length) QV.c.filas.push(filaVacia({ origen: QV.c.internos.lugar, destino: destinosPlanta()[0] || '' }));
      pintarQV();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (b.dataset.el) {
      if (!(await confirmar('Eliminar talonario', 'Se eliminarán de la planilla original los ' + g[b.dataset.el].length + ' viajes del talonario N° ' + esc(b.dataset.el) + '.', 'Eliminar', true))) return;
      try {
        await escribir('eliminarViajes', { comprobante: b.dataset.el }, 'Eliminar talonario ' + b.dataset.el);
        delete S.info.usados[b.dataset.el];
        toast('Talonario eliminado', 'ok');
        cargarDiaQV();
      } catch (er) {
        toast(er.message, 'bad', 8000);
      }
    }
  };
}

function comprimirImagen(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * k);
      cv.height = Math.round(img.height * k);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      const data = cv.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(url);
      res({ data: data.split(',')[1], url: data });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

document.addEventListener('click', e => {
  if (e.target.closest('#qvIA')) $('#qvFoto').click();
});

document.addEventListener('change', async e => {
  if (e.target.id !== 'qvFoto' || !e.target.files[0]) return;
  const file = e.target.files[0];
  e.target.value = '';
  let img;
  try {
    img = await comprimirImagen(file);
  } catch (er) {
    return toast(er.message, 'bad');
  }
  const m = modal('Leyendo talonario', '<div class="escaneo"><img src="' + img.url + '" alt="Talonario"></div><p class="sub mt" style="text-align:center">La IA está transcribiendo el talonario…</p>', [{ txt: 'Cancelar' }]);
  try {
    const r = await api('leerComprobante', { imagen: img.data, mime: 'image/jpeg' });
    if (!document.body.contains(m)) return;
    m.cerrar();
    aplicarIA(r);
  } catch (er) {
    if (document.body.contains(m)) m.cerrar();
    toast('No se pudo leer la foto: ' + er.message, 'bad', 8000);
  }
});

function aplicarIA(r) {
  const c = QV.c;
  c.ia = {};
  const lug = v => v ? (canonico(v, nombres('Lugares')) || mejorCoincidencia(v, nombres('Lugares')) || v) : '';
  const set = (k, v, hoja) => {
    if (!v) return;
    c[k] = canonico(v, nombres(hoja)) || mejorCoincidencia(v, nombres(hoja)) || v;
    c.ia[k] = true;
  };
  if (r.comprobante && !QV.editando) { c.numero = r.comprobante; c.ia.numero = true; }
  set('chofer', r.chofer, 'Choferes');
  set('dominio', r.dominio, 'Dominios');
  set('responsable', r.responsable, 'Responsables');
  if (c.ia.dominio) c.domAuto = false;
  if (!c.dominio && c.chofer) { c.dominio = domSugerido(c.chofer); c.domAuto = !!c.dominio; }
  const fAnt = QV.fecha;
  if (r.fecha && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha) && Math.abs(difDias(r.fecha, hoy())) < 120) QV.fecha = r.fecha;
  if (r.viajes && r.viajes.length) {
    const base = c.filas[0] || filaVacia();
    c.filas = r.viajes.map((v, i) => {
      c.ia['c' + i] = true;
      if (v.horaDescarga) c.ia['d' + i] = true;
      if (v.origen || v.destino) c.ia['o' + i] = true;
      return { origen: lug(v.origen) || base.origen, destino: lug(v.destino) || base.destino, c: v.horaCarga, d: v.horaDescarga || '', autoD: !v.horaDescarga, pagar: true, resp: '' };
    });
  }
  if (r.internos && r.internos.cantidad > 0) {
    c.internos = { on: true, cantidad: r.internos.cantidad, lugar: lug(r.internos.lugar) || (c.filas[0] && c.filas[0].origen) || '', paladas: r.internos.paladas === null ? '' : r.internos.paladas, pagar: true };
  }
  pintarQV();
  if (QV.fecha !== fAnt) { guardarMemQV(); cargarDiaQV(); }
  toast('Datos leídos' + (r.confianza ? ' (confianza ' + Math.round(r.confianza * 100) + '%)' : '') + '. Revisá los campos en violeta antes de guardar.', 'info', 8000);
  if (r.notas) toast('Nota de la IA: ' + r.notas, 'info', 8000);
}
