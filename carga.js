'use strict';

const MODULOS = [
  ['viajes', 'Viajes de camiones', 'Carga rápida de comprobantes, uno detrás de otro, o leyendo la foto del papel.', 'camion', 1, 'viajes'],
  ['jornada', 'Jornada de cantera', 'Tramos de producción y paradas por máquina: horómetros, camiones a planta e internos.', 'pala', 3, 'jornada'],
  ['pesaje', 'Balanza de ingreso', 'Importar el archivo PESAJE.XLS para cruzarlo con los viajes.', 'balanza', 2, 'pesajes'],
  ['molienda', 'Molienda y silo', 'Paladas al cajón, balanza dinámica y extracción de silo por turno.', 'molienda', 7, 'molienda'],
  ['calidad', 'Calidad de tierra', 'Inspección visual, ensayo arcilla/limo/arena y decisión por viaje.', 'calidad', 5, 'calidad'],
  ['ajustes', 'Ajustes de stock', 'Stock inicial y cubicaciones de playa y silo.', 'ajuste', 4, '']
];

async function vCargar(mod, arg) {
  const ok = vivo();
  await cargarResumen();
  if (!ok()) return;
  if (!mod) {
    const vis = MODULOS.filter(m => puede(m[0]));
    app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Carga de datos</div><h1>¿Qué vas a cargar?</h1><p class="sub">Módulos habilitados para tu rol (' + esc(S.ses.rol) + ').</p></div></div><div class="modulos stagger">' +
      vis.map(m => {
        const f = m[5] ? (S.resumen.ultimo || {})[m[5]] : '';
        const sm = m[5] ? semaforoDias(f) : null;
        return '<a class="card hover modulo" href="#/cargar/' + m[0] + '"><span class="ic" style="background:' + COL(m[4]) + '">' + ICON[m[3]] + '</span><h3>' + m[1] + '</h3><p class="sub">' + m[2] + '</p>' +
          (sm ? '<div class="pie"><span class="semaforo ' + sm.cls + '"></span>' + (f ? 'Último dato: ' + fMedia(f) + ' · ' + sm.txt : 'Sin datos') + '</div>' : '<div class="pie">' + ICON.ajuste.replace('<svg', '<svg width="14" height="14"') + 'Solo administradores</div>') + '</a>';
      }).join('') + '</div></div>';
    stagger(app());
    return;
  }
  if (!puede(mod)) {
    app().innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>Tu rol no tiene acceso a este módulo.</div></div>';
    return;
  }
  const volver = '<a class="btn icon" href="#/cargar" aria-label="Volver">' + ICON.izq + '</a>';
  if (mod === 'viajes') return edViajes(arg, volver);
  if (mod === 'jornada') return edJornada(arg || hoy(), volver);
  if (mod === 'pesaje') return edPesaje(volver);
  if (mod === 'molienda') return edMolienda(arg || hoy(), volver);
  if (mod === 'calidad') return edCalidad(arg || hoy(), volver);
  if (mod === 'ajustes') return edAjustes(volver);
}

function dice(a, b) {
  const x = normTxt(a).replace(/ /g, '');
  const y = normTxt(b).replace(/ /g, '');
  if (!x || !y) return 0;
  if (x === y) return 1;
  const big = s => { const m = {}; for (let i = 0; i < s.length - 1; i++) { const g = s.substr(i, 2); m[g] = (m[g] || 0) + 1; } return m; };
  const bx = big(x);
  const by = big(y);
  let inter = 0;
  Object.keys(bx).forEach(g => { if (by[g]) inter += Math.min(bx[g], by[g]); });
  return 2 * inter / Math.max(1, x.length - 1 + y.length - 1);
}

function mejorCoincidencia(valor, lista) {
  if (!valor) return '';
  let best = '';
  let bs = 0;
  lista.forEach(l => { const s = dice(valor, l) + (normTxt(l).indexOf(normTxt(valor)) >= 0 ? 0.3 : 0); if (s > bs) { bs = s; best = l; } });
  return bs >= 0.5 ? best : '';
}

function canonico(valor, lista) {
  const n = normTxt(valor).replace(/ /g, '');
  return lista.find(l => normTxt(l).replace(/ /g, '') === n) || '';
}

function autocompletar(input, fuente, alElegir, opciones) {
  let lista = null;
  let items = [];
  let idx = -1;
  const op = opciones || {};
  const cerrar = () => { if (lista) { lista.remove(); lista = null; } idx = -1; };
  const elegir = v => { input.value = v; cerrar(); input.classList.remove('adv', 'inv'); if (alElegir) alElegir(v); };
  const pintar = () => {
    const q = normTxt(input.value);
    const toks = q.split(' ').filter(Boolean);
    const base = fuente();
    items = (toks.length ? base.filter(x => { const n = normTxt(x); return toks.every(t => n.indexOf(t) >= 0); }) : base).slice(0, 40);
    if (op.agregar && q && !base.some(x => normTxt(x) === q)) items.push({ nuevo: input.value.trim().toUpperCase() });
    if (!items.length || document.activeElement !== input) return cerrar();
    if (!lista) {
      lista = document.createElement('div');
      lista.className = 'ac-lista';
      document.body.appendChild(lista);
      lista.addEventListener('mousedown', e => {
        e.preventDefault();
        const d = e.target.closest('[data-i]');
        if (!d) return;
        const it = items[Number(d.dataset.i)];
        if (it.nuevo) { cerrar(); op.agregar(it.nuevo, input); } else elegir(it);
      });
    }
    const r = input.getBoundingClientRect();
    lista.style.left = (r.left + scrollX) + 'px';
    lista.style.top = (r.bottom + scrollY + 4) + 'px';
    lista.style.minWidth = Math.max(r.width, 220) + 'px';
    idx = Math.min(Math.max(idx, 0), items.length - 1);
    const marcar = s => { if (!toks.length) return esc(s); let h = esc(s); toks.forEach(t => { h = h.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'i'), '<mark>$1</mark>'); }); return h; };
    lista.innerHTML = items.map((it, i) => '<div data-i="' + i + '" class="' + (i === idx ? 'on' : '') + '">' + (it.nuevo ? '+ Agregar «' + esc(it.nuevo) + '»' : marcar(it) + (op.detalle ? '<small>' + esc(op.detalle(it) || '') + '</small>' : '')) + '</div>').join('');
  };
  input.setAttribute('autocomplete', 'off');
  input.addEventListener('input', () => { idx = 0; pintar(); });
  input.addEventListener('focus', () => { idx = 0; pintar(); });
  input.addEventListener('blur', () => {
    setTimeout(cerrar, 120);
    const v = input.value.trim();
    if (!v) return;
    const c = canonico(v, fuente());
    if (c) { if (c !== v) input.value = c; input.classList.remove('adv'); } else input.classList.add('adv');
  });
  input.addEventListener('keydown', e => {
    if (!lista) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % items.length; pintar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + items.length) % items.length; pintar(); }
    else if (e.key === 'Escape') cerrar();
    else if ((e.key === 'Enter' || e.key === 'Tab') && idx >= 0 && items[idx] && input.value.trim()) {
      const it = items[idx];
      if (it.nuevo) { cerrar(); input.classList.add('adv'); return; }
      if (normTxt(it) !== normTxt(input.value) || e.key === 'Tab') { input.value = it; }
      cerrar();
      input.classList.remove('adv');
      if (alElegir) alElegir(it);
    }
  });
}

async function agregarAlCatalogo(hoja, valor) {
  try {
    const r = await api('agregarItem', { hoja: hoja, valor: valor });
    const cat = S.resumen.catalogos[hoja] || (S.resumen.catalogos[hoja] = []);
    if (!cat.some(x => x.nombre === r.valor)) cat.push({ nombre: r.valor, activo: true });
    lsSet('tierra_resumen', S.resumen);
    toast('Agregado a ' + hoja + ': ' + r.valor, 'ok');
    return r.valor;
  } catch (e) {
    toast(e.message, 'bad');
    return null;
  }
}

function linMin(h, esFin) {
  const m = minDe(h);
  if (m === null) return null;
  return m === 0 && esFin ? 1440 : m;
}

function maqInfo(n) {
  return ((S.resumen.catalogos || {}).Maquinas || []).find(m => m.nombre === n) || { nombre: n, tipo: 'Pala' };
}

function ppc() {
  return num(par('PALADAS_POR_CAMION', 7)) || 7;
}

function nuevoTramo(tipo, hi, hf) {
  return { tipo: tipo || 'Producción', horaInicio: hi || '', horaFin: hf || '', operador: '', horometroIni: '', horometroFin: '', paladasCamiones: '', paladasAcopios: '', unidadesCargadas: '', viajesInternos: '', palAuto: true, motivoParada: '', personal: [], horometroParada: '', observaciones: '' };
}

function sugerirHorometro(valor, previo) {
  const v = num(valor);
  const p = num(previo);
  if (v === null || !p || Math.abs(v - p) <= 30) return null;
  const s = String(valor).replace(',', '.');
  const cand = new Set();
  for (let i = 0; i < s.length; i++) cand.add(s.slice(0, i) + s.slice(i + 1));
  const ps = String(Math.floor(p));
  for (let k = 1; k <= 2; k++) cand.add(ps.slice(0, k) + s.slice(k));
  let best = null;
  cand.forEach(c => {
    const n = Number(c);
    if (!isNaN(n) && n >= p - 0.5 && n <= p + 16 && (best === null || Math.abs(n - p) < Math.abs(best - p))) best = n;
  });
  return best;
}

async function edJornada(f, volver) {
  app().innerHTML = '<div class="vista"><div class="card"><div class="skel" style="height:60px"></div></div><div class="card"><div class="skel" style="height:220px"></div></div></div>';
  const ok = vivo();
  const j = await api('jornada', { fecha: f });
  if (!ok()) return;
  const maqs = activos('Maquinas').map(m => ({ nombre: m.nombre, tipo: m.tipo }));
  j.tramos.forEach(t => { if (!maqs.some(m => m.nombre === t.maquina)) maqs.push({ nombre: t.maquina, tipo: maqInfo(t.maquina).tipo }); });
  const t = maqs.map(m => j.tramos.filter(x => x.maquina === m.nombre)
    .sort((a, b) => linMin(a.horaInicio) - linMin(b.horaInicio))
    .map(x => Object.assign(nuevoTramo(), x, {
      personal: x.personal ? String(x.personal).split(',').map(s => s.trim()).filter(Boolean) : [],
      viajesInternos: x.viajesInternos || 0,
      palAuto: x.tipo === 'Producción' && Number(x.paladasCamiones || 0) === ((x.unidadesCargadas || 0) + (x.viajesInternos || 0)) * ppc()
    })));
  S.ed = { fecha: f, maqs: maqs, t: t, previos: j.horometrosPrevios || {}, sucio: false };
  const bor = lsGet('tierra_borrador_' + f, null);
  let aviso = j.tramos.length ? '<div class="alert info">' + ICON.infoI + '<div>Jornada ya registrada por <b>' + esc(j.tramos[0].usuario || '—') + '</b>. Al guardar se reemplaza completa.</div></div>' : '';
  if (bor && bor.t) aviso += '<div class="alert warn" id="avBor">' + ICON.alerta + '<div style="flex:1">Hay un borrador sin guardar de esta fecha. <button class="btn sm" id="bRest">Restaurar</button> <button class="btn sm dan" id="bDesc">Descartar</button></div></div>';
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos</div><h1>Jornada de cantera</h1></div></div>' +
    '<div class="row"><label class="f">Fecha<div class="row" style="flex-wrap:nowrap;gap:4px"><a class="btn icon" href="#/cargar/jornada/' + addDias(f, -1) + '">' + ICON.izq + '</a><input type="date" id="edF" value="' + f + '" style="width:170px"><a class="btn icon" href="#/cargar/jornada/' + addDias(f, 1) + '">' + ICON.der + '</a></div></label>' +
    '<button class="btn" id="bCopia" style="align-self:flex-end">' + ICON.copiar + 'Copiar día anterior</button><button class="btn pri" id="bGuardar" style="align-self:flex-end">' + ICON.guardar + 'Guardar jornada</button></div></div>' +
    aviso + '<div class="alert info">' + ICON.infoI + '<div>Las <b>paladas a camión</b> se calculan solas como (camiones a planta + internos) × ' + ppc() + '. Si el operador informó otro número, escribilo y queda como manual.</div></div><div id="edErr"></div><div id="edMaqs"></div>' +
    '<div class="row mt"><button class="btn pri" id="bGuardar2">' + ICON.guardar + 'Guardar jornada</button></div></div>';
  $('#edF').onchange = e => { location.hash = '#/cargar/jornada/' + e.target.value; };
  $('#bGuardar').onclick = guardarJornada;
  $('#bGuardar2').onclick = guardarJornada;
  $('#bCopia').onclick = copiarAnterior;
  if ($('#bRest')) $('#bRest').onclick = () => { S.ed.t = bor.t; S.ed.sucio = true; pintarEditor(); $('#avBor').remove(); };
  if ($('#bDesc')) $('#bDesc').onclick = () => { lsDel('tierra_borrador_' + f); $('#avBor').remove(); };
  pintarEditor();
  const cont = $('#edMaqs');
  cont.addEventListener('input', onEdInput);
  cont.addEventListener('change', onEdChange);
  cont.addEventListener('click', onEdClick);
}

function horPrevio(mi, i) {
  const lista = S.ed.t[mi];
  for (let k = i - 1; k >= 0; k--) {
    const x = lista[k];
    const h = x.tipo === 'Producción' ? num(x.horometroFin) : num(x.horometroParada);
    if (h) return h;
  }
  return S.ed.previos[S.ed.maqs[mi].nombre] || '';
}

function pistaMaq(mi) {
  return '<div class="pista" style="margin-top:8px">' + S.ed.t[mi].map((t, i) => {
    const a = (minDe(t.horaInicio) || 0) / 1440 * 100;
    let b = (linMin(t.horaFin, true) || 0) / 1440 * 100;
    if (!t.horaInicio || !t.horaFin) return '';
    if (b <= a) b = 100;
    return '<div class="tl-b ' + (t.tipo === 'Producción' ? 'prod' : 'par') + '" style="left:' + a + '%;width:' + (b - a) + '%;--i:' + i + '">' + esc(t.horaInicio + '–' + t.horaFin) + '</div>';
  }).join('') + '</div>';
}

function pintarEditor() {
  const ops = ((S.resumen.catalogos || {}).Operadores || []).filter(o => o.activo);
  const causas = nombres('CausasParada');
  const html = S.ed.maqs.map((m, mi) => {
    const tipoM = String(m.tipo || '').toLowerCase();
    const aptos = ops.filter(o => tipoM === 'topadora' ? o.topadora : (tipoM === 'pala' ? o.pala : true)).map(o => o.nombre);
    const tramos = S.ed.t[mi];
    const prod = tramos.filter(x => x.tipo === 'Producción');
    const resumen = tramos.length ? (tipoM === 'pala' ? sum(prod, x => num(x.unidadesCargadas) || 0) + ' a planta · ' + sum(prod, x => num(x.viajesInternos) || 0) + ' internos · ' : '') + tramos.length + ' tramo(s)' : 'sin actividad';
    return '<div class="maq" style="animation-delay:' + mi * 60 + 'ms"><div class="maq-h"><div class="t"><span class="ic">' + (tipoM === 'topadora' ? ICON.topadora : ICON.pala) + '</span><div><b>' + esc(m.nombre) + '</b> <span class="tag t-acc">' + esc(m.tipo) + '</span><div class="sub" id="res-' + mi + '">' + resumen +
      (S.ed.previos[m.nombre] ? ' · último horómetro ' + nf(S.ed.previos[m.nombre], 1) : '') + '</div></div></div><div class="row">' +
      '<button class="btn sm" data-add="' + mi + '" data-h="04:00-14:00">+ 04–14</button><button class="btn sm" data-add="' + mi + '" data-h="06:00-14:00">+ 06–14</button><button class="btn sm" data-add="' + mi + '" data-h="14:00-22:00">+ 14–22</button>' +
      '<button class="btn sm" data-add="' + mi + '" data-h="">+ Tramo</button><button class="btn sm dan" data-add="' + mi + '" data-par="1">+ Parada</button></div>' + (tramos.length ? '<div style="flex-basis:100%" id="pista-' + mi + '">' + pistaMaq(mi) + '</div>' : '') + '</div>' +
      tramos.map((t, i) => {
        const id = k => 'e-' + mi + '-' + i + '-' + k;
        const d = k => 'data-m="' + mi + '" data-i="' + i + '" data-k="' + k + '" id="' + id(k) + '"';
        let campos = '<label class="f">Régimen<select ' + d('tipo') + '>' + opts(['Producción', 'Parada'], t.tipo, null) + '</select></label>' +
          '<label class="f">Inicio<input type="time" ' + d('horaInicio') + ' value="' + esc(t.horaInicio) + '"></label>' +
          '<label class="f">Fin<input type="time" ' + d('horaFin') + ' value="' + esc(t.horaFin) + '"></label>';
        if (t.tipo === 'Producción') {
          const sug = sugerirHorometro(t.horometroIni, horPrevio(mi, i));
          campos += '<label class="f">Operador<select ' + d('operador') + '>' + opts(aptos, t.operador) + '</select></label>' +
            '<label class="f">Horómetro inicial<input inputmode="decimal" ' + d('horometroIni') + ' value="' + esc(t.horometroIni) + '">' + (sug !== null ? '<span class="sugerencia" data-sug="' + sug + '" data-m="' + mi + '" data-i="' + i + '" data-k2="horometroIni">¿Quisiste decir ' + nf(sug, 1) + '?</span>' : '') + '</label>' +
            '<label class="f">Horómetro final<input inputmode="decimal" ' + d('horometroFin') + ' value="' + esc(t.horometroFin) + '"><span class="mini-ayuda" id="' + id('hs') + '">' + horasTxt(t) + '</span></label>';
          if (tipoM === 'pala') {
            campos += '<label class="f">Camiones a planta<input type="number" min="0" inputmode="numeric" ' + d('unidadesCargadas') + ' value="' + esc(t.unidadesCargadas) + '"></label>' +
              '<label class="f"><span class="lt">Viajes internos ' + ayuda('Camiones cargados para mover tierra dentro de la cantera (viajes cortos), que no van a la fábrica.') + '</span><input type="number" min="0" inputmode="numeric" ' + d('viajesInternos') + ' value="' + esc(t.viajesInternos) + '"></label>' +
              '<label class="f"><span class="lt">Paladas a camión' + (t.palAuto ? '<span class="auto-badge" title="Calculado">auto ×' + ppc() + '</span>' : '<span class="auto-badge" data-auto="' + mi + '-' + i + '" title="Volver al cálculo automático">manual · ↺ auto</span>') + '</span>' +
              '<input type="number" min="0" inputmode="numeric" ' + d('paladasCamiones') + ' value="' + esc(t.palAuto ? (((num(t.unidadesCargadas) || 0) + (num(t.viajesInternos) || 0)) * ppc() || '') : t.paladasCamiones) + '"' + (t.palAuto ? ' style="color:var(--s7)"' : '') + '></label>' +
              '<label class="f">Paladas a acopio<input type="number" min="0" inputmode="numeric" ' + d('paladasAcopios') + ' value="' + esc(t.paladasAcopios) + '"></label>';
          }
        } else {
          campos += '<label class="f">Motivo<select ' + d('motivoParada') + '>' + opts(causas, t.motivoParada) + '</select></label>';
          if (CAUSAS_HOROMETRO.indexOf(t.motivoParada) >= 0) campos += '<label class="f">Horómetro en parada<input inputmode="decimal" ' + d('horometroParada') + ' value="' + esc(t.horometroParada) + '"></label>';
          if (CAUSAS_PERSONAL_UNO.indexOf(t.motivoParada) >= 0) campos += '<label class="f">Operario<select ' + d('personal') + '>' + opts(ops.map(o => o.nombre), (t.personal || [])[0] || '') + '</select></label>';
          if (CAUSAS_PERSONAL_MULTI.indexOf(t.motivoParada) >= 0) {
            const lista = ops.slice().sort((a, b) => (b.mecanico ? 1 : 0) - (a.mecanico ? 1 : 0)).map(o => o.nombre);
            campos += '<div class="f full" id="' + id('personal') + '"><label class="f">Personal interviniente</label><div class="chips">' +
              lista.map(n => '<label class="chip"><input type="checkbox" data-m="' + mi + '" data-i="' + i + '" data-k="personalMulti" value="' + esc(n) + '"' + ((t.personal || []).indexOf(n) >= 0 ? ' checked' : '') + '>' + esc(n) + '</label>').join('') + '</div></div>';
          }
        }
        campos += '<label class="f full">Observaciones<input ' + d('observaciones') + ' value="' + esc(t.observaciones) + '" placeholder="Novedades del tramo (lluvia, traslado, cargas desde arriba…)"></label>';
        return '<div class="tramo ' + (t.tipo === 'Parada' ? 'parada' : '') + '"><div class="cab">' + (t.tipo === 'Parada' ? ICON.alerta.replace('<svg', '<svg width="15" height="15"') + 'Parada' : ICON.reloj.replace('<svg', '<svg width="15" height="15"') + 'Producción') + ' · tramo ' + (i + 1) + '</div>' +
          '<button class="btn icon sm dan x" data-del="' + mi + '-' + i + '" aria-label="Quitar tramo">' + ICON.borrar + '</button><div class="form">' + campos + '</div></div>';
      }).join('') + '</div>';
  }).join('');
  $('#edMaqs').innerHTML = html;
}

function horasTxt(t) {
  const hi = num(t.horometroIni);
  const hf = num(t.horometroFin);
  const hs = dur(t.horaInicio, t.horaFin);
  if (hi === null || hf === null) return hs ? 'Tramo de ' + nf(hs, 1) + ' h' : '';
  return nf(hf - hi, 1) + ' h de horómetro en ' + nf(hs, 1) + ' h';
}

function marcarSucio() {
  S.ed.sucio = true;
  lsSet('tierra_borrador_' + S.ed.fecha, { t: S.ed.t, ts: Date.now() });
}

function refrescarAuto(mi, i) {
  const t = S.ed.t[mi][i];
  if (!t || t.tipo !== 'Producción') return;
  if (t.palAuto) {
    const v = ((num(t.unidadesCargadas) || 0) + (num(t.viajesInternos) || 0)) * ppc();
    t.paladasCamiones = v || '';
    const el = $('#e-' + mi + '-' + i + '-paladasCamiones');
    if (el) el.value = t.paladasCamiones;
  }
  const hs = $('#e-' + mi + '-' + i + '-hs');
  if (hs) hs.textContent = horasTxt(t);
  const prod = S.ed.t[mi].filter(x => x.tipo === 'Producción');
  const r = $('#res-' + mi);
  const tipoM = String(S.ed.maqs[mi].tipo || '').toLowerCase();
  if (r) r.textContent = (tipoM === 'pala' ? sum(prod, x => num(x.unidadesCargadas) || 0) + ' a planta · ' + sum(prod, x => num(x.viajesInternos) || 0) + ' internos · ' : '') + S.ed.t[mi].length + ' tramo(s)';
}

function onEdInput(e) {
  const el = e.target;
  const k = el.dataset.k;
  if (!k || k === 'personalMulti' || el.tagName === 'SELECT' || el.type === 'time') return;
  const mi = Number(el.dataset.m);
  const i = Number(el.dataset.i);
  const t = S.ed.t[mi][i];
  if (k === 'paladasCamiones') { t.palAuto = false; el.style.color = ''; }
  if (k === 'horometroFin' || k === 'horometroIni' || k === 'horometroParada') el.value = el.value.replace(/[^\d.,]/g, '');
  t[k] = el.value;
  el.classList.remove('inv');
  refrescarAuto(mi, i);
  marcarSucio();
}

function onEdChange(e) {
  const el = e.target;
  const k = el.dataset.k;
  if (!k) return;
  const mi = Number(el.dataset.m);
  const i = Number(el.dataset.i);
  const t = S.ed.t[mi][i];
  el.classList.remove('inv');
  if (k === 'personalMulti') {
    t.personal = $$('input[data-k="personalMulti"][data-m="' + mi + '"][data-i="' + i + '"]:checked').map(x => x.value);
    return marcarSucio();
  }
  if (k === 'personal') { t.personal = el.value ? [el.value] : []; return marcarSucio(); }
  const anterior = t[k];
  t[k] = el.value;
  if (k === 'horometroFin') {
    const sig = S.ed.t[mi][i + 1];
    if (sig && sig.tipo === 'Producción' && (sig.horometroIni === '' || String(sig.horometroIni) === String(anterior))) {
      sig.horometroIni = el.value;
      const inp = $('#e-' + mi + '-' + (i + 1) + '-horometroIni');
      if (inp) inp.value = el.value;
    }
  }
  if (k === 'horaFin') {
    const sig = S.ed.t[mi][i + 1];
    if (sig && (!sig.horaInicio || sig.horaInicio === anterior)) {
      sig.horaInicio = el.value;
      const inp = $('#e-' + mi + '-' + (i + 1) + '-horaInicio');
      if (inp) inp.value = el.value;
    }
  }
  marcarSucio();
  if (k === 'tipo' || k === 'motivoParada' || k === 'horometroIni') {
    if (k === 'tipo' && t.tipo === 'Producción' && !t.horometroIni) t.horometroIni = horPrevio(mi, i);
    pintarEditor();
    return;
  }
  if (k === 'horaInicio' || k === 'horaFin') { const p = $('#pista-' + mi); if (p) p.innerHTML = pistaMaq(mi); }
  refrescarAuto(mi, i);
}

function onEdClick(e) {
  const s = e.target.closest('[data-sug]');
  if (s) {
    const t = S.ed.t[Number(s.dataset.m)][Number(s.dataset.i)];
    t[s.dataset.k2] = s.dataset.sug;
    marcarSucio();
    pintarEditor();
    return;
  }
  const au = e.target.closest('[data-auto]');
  if (au) {
    const p = au.dataset.auto.split('-').map(Number);
    S.ed.t[p[0]][p[1]].palAuto = true;
    refrescarAuto(p[0], p[1]);
    pintarEditor();
    return;
  }
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.add !== undefined) {
    const mi = Number(b.dataset.add);
    const lista = S.ed.t[mi];
    const ult = lista[lista.length - 1];
    let hi = ult ? ult.horaFin : '';
    let hf = '';
    if (b.dataset.h) { hi = b.dataset.h.split('-')[0]; hf = b.dataset.h.split('-')[1]; }
    const nt = nuevoTramo(b.dataset.par ? 'Parada' : 'Producción', hi, hf);
    if (nt.tipo === 'Producción') nt.horometroIni = horPrevio(mi, lista.length);
    lista.push(nt);
    lista.sort((a, c) => (linMin(a.horaInicio) || 9999) - (linMin(c.horaInicio) || 9999));
    marcarSucio();
    pintarEditor();
  }
  if (b.dataset.del) {
    const p = b.dataset.del.split('-').map(Number);
    S.ed.t[p[0]].splice(p[1], 1);
    marcarSucio();
    pintarEditor();
  }
}

async function copiarAnterior() {
  try {
    let f = S.ed.fecha;
    let j = null;
    for (let n = 1; n <= 10; n++) {
      f = addDias(S.ed.fecha, -n);
      j = await api('jornada', { fecha: f });
      if (j.tramos.length) break;
    }
    if (!j || !j.tramos.length) return toast('No hay jornadas en los 10 días anteriores', 'warn');
    let n = 0;
    S.ed.maqs.forEach((m, mi) => {
      const prev = j.tramos.filter(x => x.maquina === m.nombre && x.tipo === 'Producción').sort((a, b) => linMin(a.horaInicio) - linMin(b.horaInicio));
      if (!prev.length || S.ed.t[mi].length) return;
      let hor = S.ed.previos[m.nombre] || '';
      S.ed.t[mi] = prev.map(x => {
        const nt = nuevoTramo('Producción', x.horaInicio, x.horaFin);
        nt.operador = x.operador;
        nt.horometroIni = hor;
        hor = '';
        n++;
        return nt;
      });
    });
    marcarSucio();
    pintarEditor();
    toast(n ? 'Estructura copiada del ' + fCorta(f) + '. Completá horómetros y camiones.' : 'Las máquinas ya tienen tramos cargados.', n ? 'ok' : 'info');
  } catch (e) {
    toast(e.message, 'bad');
  }
}

function validarJornada() {
  const errores = [];
  const avisos = [];
  const marcar = (mi, i, k, msg) => {
    const el = $('#e-' + mi + '-' + i + '-' + k);
    if (el) el.classList.add('inv');
    errores.push({ el: el, msg: S.ed.maqs[mi].nombre + ' · tramo ' + (i + 1) + ': ' + msg });
  };
  $$('.inv', $('#edMaqs')).forEach(x => x.classList.remove('inv'));
  S.ed.t.forEach((lista, mi) => {
    const intervalos = [];
    lista.forEach((t, i) => {
      if (!t.horaInicio) marcar(mi, i, 'horaInicio', 'falta hora de inicio');
      if (!t.horaFin) marcar(mi, i, 'horaFin', 'falta hora de fin');
      const a = linMin(t.horaInicio, false);
      const b = linMin(t.horaFin, true);
      if (t.horaInicio && t.horaFin) {
        if (b <= a) marcar(mi, i, 'horaFin', 'el fin debe ser posterior al inicio');
        else {
          intervalos.forEach(x => { if (a < x[1] && b > x[0]) marcar(mi, i, 'horaInicio', 'se superpone con el tramo ' + (x[2] + 1)); });
          intervalos.push([a, b, i]);
        }
      }
      if (t.tipo === 'Producción') {
        if (!t.operador) marcar(mi, i, 'operador', 'asigná operador');
        const hi = num(t.horometroIni);
        const hf = num(t.horometroFin);
        if (hi === null || hi < 0) marcar(mi, i, 'horometroIni', 'horómetro inicial inválido');
        if (hf === null || hf < 0) marcar(mi, i, 'horometroFin', 'horómetro final inválido');
        if (hi !== null && hf !== null) {
          if (hf < hi) marcar(mi, i, 'horometroFin', 'horómetro final menor al inicial');
          const hs = dur(t.horaInicio, t.horaFin);
          if (hf - hi > hs + 1) marcar(mi, i, 'horometroFin', nf(hf - hi, 1) + ' h de horómetro en un tramo de ' + nf(hs, 1) + ' h');
          const prev = horPrevio(mi, i);
          if (prev && Math.abs(hi - prev) > 0.05) avisos.push(S.ed.maqs[mi].nombre + ' · tramo ' + (i + 1) + ': horómetro inicial ' + nf(hi, 1) + ' ≠ último registrado ' + nf(prev, 1));
        }
        const u = (num(t.unidadesCargadas) || 0) + (num(t.viajesInternos) || 0);
        const pc = t.palAuto ? u * ppc() : (num(t.paladasCamiones) || 0);
        if (pc > 0 && u <= 0) marcar(mi, i, 'unidadesCargadas', 'informá los camiones cargados');
        if (u > 0 && !t.palAuto && (pc / u < 3 || pc / u > 12)) avisos.push(S.ed.maqs[mi].nombre + ' · tramo ' + (i + 1) + ': ' + nf(pc / u, 1) + ' paladas por camión');
      } else {
        if (!t.motivoParada) marcar(mi, i, 'motivoParada', 'indicá el motivo');
        if (CAUSAS_HOROMETRO.indexOf(t.motivoParada) >= 0 && (num(t.horometroParada) === null || num(t.horometroParada) < 0)) marcar(mi, i, 'horometroParada', 'horómetro de parada requerido');
        if ((CAUSAS_PERSONAL_MULTI.indexOf(t.motivoParada) >= 0 || CAUSAS_PERSONAL_UNO.indexOf(t.motivoParada) >= 0) && !(t.personal || []).length) marcar(mi, i, 'personal', 'indicá el personal');
      }
    });
  });
  return { errores: errores, avisos: avisos };
}

async function guardarJornada() {
  const v = validarJornada();
  const box = $('#edErr');
  if (v.errores.length) {
    box.innerHTML = '<div class="alert bad">' + ICON.alerta + '<div><b>Corregí ' + v.errores.length + ' error(es):</b><ul>' + v.errores.slice(0, 12).map(e => '<li>' + esc(e.msg) + '</li>').join('') + '</ul></div></div>';
    const p = v.errores.find(e => e.el);
    if (p) p.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  box.innerHTML = '';
  if (v.avisos.length && !(await confirmar('Revisar antes de guardar', '<ul>' + v.avisos.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>¿Guardar de todos modos?', 'Guardar'))) return;
  const tramos = [];
  S.ed.t.forEach((lista, mi) => lista.forEach(t => {
    const x = Object.assign({}, t, { maquina: S.ed.maqs[mi].nombre });
    if (x.tipo === 'Producción' && x.palAuto) x.paladasCamiones = ((num(x.unidadesCargadas) || 0) + (num(x.viajesInternos) || 0)) * ppc();
    delete x.palAuto;
    tramos.push(x);
  }));
  if (!tramos.length && !(await confirmar('Jornada vacía', 'No hay tramos. Si existía una jornada para esta fecha, se eliminará. ¿Continuar?', 'Continuar', true))) return;
  bloquear('Guardando jornada…');
  try {
    const r = await escribir('guardarJornada', { fecha: S.ed.fecha, tramos: tramos }, 'Jornada cantera ' + S.ed.fecha);
    lsDel('tierra_borrador_' + S.ed.fecha);
    S.ed.sucio = false;
    if (!r.encolado) {
      toast('Jornada guardada: ' + r.guardados + ' tramo(s)', 'ok');
      location.hash = '#/dia/' + S.ed.fecha;
    }
  } catch (e) {
    toast(e.message, 'bad', 8000);
  } finally {
    desbloquear();
  }
}

const CAMPOS_PESAJE = [
  ['fecha', 'Fecha', /fecha/i, true],
  ['hora', 'Hora', /hora/i, false],
  ['ticket', 'Ticket / N° pesada', /ticket|pesada|^n[°ºo.]?\s*$|^nro\b|n[úu]mero|comprob|remito|^id$|c[oó]digo/i, false],
  ['dominio', 'Patente / dominio', /patente|dominio|chapa|veh[ií]culo|cami[oó]n/i, true],
  ['neto', 'Peso neto', /neto/i, false],
  ['bruto', 'Peso bruto', /bruto/i, false],
  ['tara', 'Tara', /tara/i, false],
  ['producto', 'Producto', /producto|material|art[ií]culo|mercader/i, false],
  ['origen', 'Origen', /origen|procedencia|cantera/i, false],
  ['chofer', 'Chofer', /chofer|conductor/i, false]
];

function excelSerialAFecha(n) {
  const d = new Date(Math.round((n - 25569) * 86400000));
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
}

function parseFechaHora(v) {
  if (v === '' || v === null || v === undefined) return { fecha: '', hora: '' };
  if (typeof v === 'number') {
    const frac = v % 1;
    const m = Math.round(frac * 1440) % 1440;
    return { fecha: v >= 1 ? excelSerialAFecha(Math.floor(v)) : '', hora: frac ? pad(Math.floor(m / 60)) + ':' + pad(m % 60) : '' };
  }
  const s = String(v).trim();
  let f = '';
  let m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) f = m[1] + '-' + pad(m[2]) + '-' + pad(m[3]);
  else {
    m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (m) f = (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad(m[2]) + '-' + pad(m[1]);
  }
  const h = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*$/) || s.match(/\s(\d{1,2}):(\d{2})/);
  return { fecha: f, hora: h ? pad(h[1]) + ':' + h[2] : '' };
}

function parseNum(v) {
  if (typeof v === 'number') return v;
  let s = String(v === null || v === undefined ? '' : v).trim().replace(/[^\d.,-]/g, '');
  if (!s) return null;
  const tp = s.indexOf('.') >= 0;
  const tc = s.indexOf(',') >= 0;
  if (tp && tc) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (tp && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else if (tc) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function edPesaje(volver) {
  S.imp = null;
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos</div><h1>Balanza de ingreso</h1><p class="sub">Exportá el pesaje desde el software de la balanza (PESAJE.XLS, .xlsx o .csv) y soltalo acá. Los tickets ya importados se actualizan, no se duplican.</p></div></div></div>' +
    '<div class="card"><div class="drop" id="drop">' + ICON.archivo + '<b>Arrastrá el archivo o tocá para elegirlo</b><span class="sub">PESAJE.XLS · .xlsx · .csv</span><input type="file" id="fileP" accept=".xls,.xlsx,.csv" class="hide"></div><div id="impC"></div></div></div>';
  const drop = $('#drop');
  const fi = $('#fileP');
  drop.onclick = () => fi.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('on'); };
  drop.ondragleave = () => drop.classList.remove('on');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('on'); if (e.dataTransfer.files[0]) leerArchivo(e.dataTransfer.files[0]); };
  fi.onchange = () => { if (fi.files[0]) leerArchivo(fi.files[0]); };
}

async function leerArchivo(file) {
  if (typeof XLSX === 'undefined') return toast('La librería de Excel aún no cargó, reintentá', 'warn');
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: false });
    S.imp = { wb: wb, nombre: file.name, hoja: wb.SheetNames[0] };
    prepararHoja();
  } catch (e) {
    toast('No se pudo leer el archivo: ' + e.message, 'bad');
  }
}

function prepararHoja() {
  const ws = S.imp.wb.Sheets[S.imp.hoja];
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  let mejor = 0;
  let pts = -1;
  filas.slice(0, 20).forEach((r, i) => {
    const p = r.filter(c => typeof c === 'string' && CAMPOS_PESAJE.some(cp => cp[2].test(c))).length;
    if (p > pts) { pts = p; mejor = i; }
  });
  S.imp.filas = filas;
  S.imp.encab = mejor;
  autoMapear(lsGet('tierra_mapeo_pesaje', null));
  pintarImport();
}

function autoMapear(guardado) {
  const enc = (S.imp.filas[S.imp.encab] || []).map(x => String(x).trim());
  const map = {};
  const usados = new Set();
  CAMPOS_PESAJE.forEach(c => {
    if (guardado && guardado.map && guardado.map[c[0]] && enc.indexOf(guardado.map[c[0]]) >= 0) { map[c[0]] = guardado.map[c[0]]; usados.add(map[c[0]]); }
  });
  CAMPOS_PESAJE.forEach(c => {
    if (map[c[0]]) return;
    const h = enc.find(x => x && !usados.has(x) && c[2].test(x));
    map[c[0]] = h || '';
    if (h) usados.add(h);
  });
  S.imp.map = map;
  S.imp.unidad = guardado && guardado.unidad ? guardado.unidad : '';
}

function normalizarImport() {
  const enc = (S.imp.filas[S.imp.encab] || []).map(x => String(x).trim());
  const ix = {};
  Object.keys(S.imp.map).forEach(k => { ix[k] = S.imp.map[k] ? enc.indexOf(S.imp.map[k]) : -1; });
  const g = (r, k) => ix[k] >= 0 ? r[ix[k]] : '';
  const out = [];
  S.imp.filas.slice(S.imp.encab + 1).forEach(r => {
    if (!r.some(c => c !== '')) return;
    const fh = parseFechaHora(g(r, 'fecha'));
    let hora = ix.hora >= 0 ? parseFechaHora(g(r, 'hora')).hora : '';
    if (ix.hora >= 0 && typeof g(r, 'hora') === 'number' && g(r, 'hora') < 1) { const m = Math.round(g(r, 'hora') * 1440) % 1440; hora = pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
    hora = hora || fh.hora;
    const bruto = parseNum(g(r, 'bruto'));
    const tara = parseNum(g(r, 'tara'));
    let neto = parseNum(g(r, 'neto'));
    if (neto === null && bruto !== null && tara !== null) neto = bruto - tara;
    out.push({ ticket: String(g(r, 'ticket')).trim(), fecha: fh.fecha, hora: hora, dominio: normDom(g(r, 'dominio')), bruto: bruto, tara: tara, neto: neto, producto: String(g(r, 'producto')).trim(), origen: String(g(r, 'origen')).trim(), chofer: String(g(r, 'chofer')).trim() });
  });
  const netos = out.map(x => x.neto).filter(x => x !== null && x > 0).sort((a, b) => a - b);
  const med = netos.length ? quant(netos, 0.5) : 0;
  if (!S.imp.unidad) S.imp.unidad = med > 200 ? 'kg' : 't';
  const div = S.imp.unidad === 'kg' ? 1000 : 1;
  out.forEach(x => { ['bruto', 'tara', 'neto'].forEach(k => { if (x[k] !== null) x[k] = Math.round(x[k] / div * 1000) / 1000; }); });
  return out;
}

function pintarImport() {
  const enc = (S.imp.filas[S.imp.encab] || []).map(x => String(x).trim()).filter(Boolean);
  const filas = normalizarImport();
  const val = filas.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.fecha) && x.neto !== null && x.neto > 0);
  const inval = filas.length - val.length;
  const fechas = val.map(x => x.fecha).sort();
  const domsCat = new Set(nombres('Dominios').map(normDom));
  const domNuevos = Array.from(new Set(val.map(x => x.dominio).filter(d => d && !domsCat.has(d))));
  const tk = val.map(x => x.ticket).filter(Boolean);
  const dup = tk.length - new Set(tk).size;
  const prods = agrupar(val, x => x.producto || '(vacío)');
  const faltan = CAMPOS_PESAJE.filter(c => c[3] && !S.imp.map[c[0]]).map(c => c[1]);
  if (!S.imp.map.neto && !(S.imp.map.bruto && S.imp.map.tara)) faltan.push('Neto (o Bruto y Tara)');
  $('#impC').innerHTML = '<div class="mt vista"><div class="row"><span class="tag t-acc">' + ICON.archivo.replace('<svg', '<svg width="13" height="13"') + esc(S.imp.nombre) + '</span>' +
    (S.imp.wb.SheetNames.length > 1 ? '<label class="f">Hoja<select id="iHoja">' + opts(S.imp.wb.SheetNames, S.imp.hoja, null) + '</select></label>' : '') +
    '<label class="f">Fila de encabezados<input type="number" id="iEnc" min="1" value="' + (S.imp.encab + 1) + '" style="width:90px"></label>' +
    '<label class="f">Unidad de peso<select id="iUni">' + opts(['kg', 't'], S.imp.unidad, null) + '</select></label></div>' +
    '<h3 class="mt2">Columnas detectadas</h3><div class="form mt">' + CAMPOS_PESAJE.map(c => '<label class="f">' + c[1] + (c[3] ? ' *' : '') + '<select data-map="' + c[0] + '" class="' + (S.imp.map[c[0]] ? 'lleno' : '') + '">' + opts(enc, S.imp.map[c[0]], '— no usar —') + '</select></label>').join('') + '</div>' +
    (faltan.length ? '<div class="alert bad mt">' + ICON.alerta + '<div>Asigná: ' + faltan.join(', ') + '</div></div>' : '') +
    '<div class="kpis mt stagger">' + kpi('Filas válidas', nf(val.length), inval ? inval + ' descartadas (sin fecha o neto)' : '', 'kacc') + kpi('Período', fechas.length ? fCorta(fechas[0]) + ' – ' + fCorta(fechas[fechas.length - 1]) : '–') +
    kpi('Toneladas netas', nf(sum(val, x => x.neto), 1)) + kpi('Tickets repetidos', nf(dup), '', dup ? 'bad' : '') +
    kpi('Dominios no registrados', nf(domNuevos.length), domNuevos.slice(0, 4).join(', '), domNuevos.length ? 'warn' : '') + '</div>' +
    '<div class="sub mt">Productos: ' + Object.keys(prods).map(p => esc(p) + ' (' + prods[p].length + ')').join(' · ') + '. Indicá cuáles son tierra en Configuración → Parámetros → PRODUCTOS_TIERRA.</div>' +
    '<h3 class="mt2">Vista previa</h3><div class="mt">' + tabla([['ticket', 'Ticket'], [r => fCorta(r.fecha), 'Fecha'], ['hora', 'Hora'], ['dominio', 'Dominio'], [r => nf(r.bruto, 2), 'Bruto t', 'n'], [r => nf(r.tara, 2), 'Tara t', 'n'], [r => nf(r.neto, 2), 'Neto t', 'n'], ['producto', 'Producto'], ['origen', 'Origen']], val.slice(0, 15)) +
    '</div><div class="row mt"><button class="btn pri" id="iImp"' + (faltan.length || !val.length ? ' disabled' : '') + '>' + ICON.descargar + 'Importar ' + nf(val.length) + ' pesajes</button></div></div>';
  stagger($('#impC'));
  if ($('#iHoja')) $('#iHoja').onchange = e => { S.imp.hoja = e.target.value; prepararHoja(); };
  $('#iEnc').onchange = e => { S.imp.encab = Math.max(0, Number(e.target.value) - 1); autoMapear(null); pintarImport(); };
  $('#iUni').onchange = e => { S.imp.unidad = e.target.value; pintarImport(); };
  $$('[data-map]').forEach(s => { s.onchange = () => { S.imp.map[s.dataset.map] = s.value; pintarImport(); }; });
  $('#iImp').onclick = async () => {
    lsSet('tierra_mapeo_pesaje', { map: S.imp.map, unidad: S.imp.unidad });
    bloquear('Importando ' + val.length + ' pesajes…');
    try {
      const r = await escribir('importarPesajes', { filas: val }, 'Importación ' + S.imp.nombre);
      if (!r.encolado) {
        $('#impC').innerHTML = '<div class="alert ok mt">' + ICON.ok + '<div><b>Importación completa.</b> ' + r.nuevos + ' nuevos · ' + r.actualizados + ' actualizados · ' + r.total + ' pesajes en la base.</div></div>' +
          '<a class="btn pri" href="#/tablero/viajes">' + ICON.tablero + 'Ver cruce viajes ↔ balanza</a>';
      }
    } catch (e) {
      toast(e.message, 'bad', 8000);
    } finally {
      desbloquear();
    }
  };
}

async function edMolienda(f, volver) {
  app().innerHTML = '<div class="vista"><div class="card"><div class="skel" style="height:200px"></div></div></div>';
  const ok = vivo();
  const R = await api('rango', { desde: addDias(f, -13), hasta: f });
  if (!ok()) return;
  const filas = {};
  const fila = x => filas[x.fecha + '|' + x.turno] || (filas[x.fecha + '|' + x.turno] = { fecha: x.fecha, turno: x.turno, man: {}, inf: {} });
  R.molienda.forEach(m => { const r = fila(m)[m.fuente === 'Manual' ? 'man' : 'inf']; r.pal = m.paladas; r.t = m.toneladas; r.obs = m.observaciones; });
  R.silo.forEach(s => { fila(s)[s.fuente === 'Manual' ? 'man' : 'inf'].silo = s.paladas; });
  const lista = Object.keys(filas).sort().reverse().map(k => filas[k]);
  const val = (r, k) => r.man[k] !== undefined && r.man[k] !== null ? r.man[k] : r.inf[k];
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos</div><h1>Molienda y silo</h1><p class="sub">Un registro por turno. La carga manual tiene prioridad sobre lo importado del Informe de Turno.</p></div></div></div>' +
    '<div class="grid g-21"><div class="card"><div class="card-h"><div class="t"><h3>Cargar turno</h3></div></div><div class="form"><label class="f">Fecha<input type="date" id="mF" value="' + f + '"></label><label class="f">Turno<div id="mTseg"></div></label>' +
    '<label class="f">Paladas al cajón alimentador<input type="number" min="0" id="mP" inputmode="numeric"></label><label class="f">Toneladas balanza dinámica<input type="number" step="0.1" min="0" id="mTon" inputmode="decimal"></label>' +
    '<label class="f">Paladas extraídas de silo<input type="number" min="0" id="mS" inputmode="numeric"></label><label class="f">t por palada<input id="mFac" disabled></label>' +
    '<label class="f full">Observaciones<input id="mO"></label></div><div class="row mt"><button class="btn pri" id="mG">' + ICON.guardar + 'Guardar turno</button></div></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Vinculado al Informe de Producción</h3><div class="sub">Se lee en vivo de la hoja «' + esc(par('INFORME_HOJA', 'Molienda')) + '»</div></div></div>' +
    '<div class="col sub"><span><b>D</b> · paladas que ingresan a molienda</span><span><b>G</b> · paladas del silo a producción</span><span><b>J</b> · toneladas de balanza dinámica (molienda → silo)</span>' +
    '<span class="mt">Cargá acá solo para corregir un turno: la carga manual reemplaza al Informe en ese turno. Los cambios en el Informe se ven en hasta 10 minutos.</span></div></div></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Últimos 14 días</h3></div></div>' +
    tabla([[r => fMedia(r.fecha), 'Fecha'], ['turno', 'Turno'], [r => nf(val(r, 'pal')), 'Pal. cajón', 'n'], [r => nf(val(r, 't'), 1), 't bal. din.', 'n'],
      [r => { const p = val(r, 'pal'); const t = val(r, 't'); return p && t ? nf(t / p, 2) : '–'; }, 't/palada', 'n'], [r => nf(val(r, 'silo')), 'Pal. silo', 'n'],
      [r => (Object.keys(r.man).length ? '<span class="tag t-acc">Manual</span> ' : '') + (Object.keys(r.inf).length ? '<span class="tag t-info">Informe</span>' : ''), 'Fuente'],
      [r => '<button class="btn sm" data-me="' + r.fecha + '|' + r.turno + '">' + ICON.editar + '</button>' + (Object.keys(r.man).length ? ' <button class="btn sm dan" data-md="' + r.fecha + '|' + r.turno + '">' + ICON.borrar + '</button>' : ''), '']], lista) + '</div></div>';
  let turno = 'T2';
  segmento($('#mTseg'), [['T1', 'T1'], ['T2', 'T2'], ['T3', 'T3']], 'T2', k => { turno = k; }, true);
  const fac = () => { const p = num($('#mP').value); const t = num($('#mTon').value); $('#mFac').value = p && t ? nf(t / p, 2) : ''; };
  $('#mP').oninput = fac;
  $('#mTon').oninput = fac;
  $('#mF').onchange = e => { location.hash = '#/cargar/molienda/' + e.target.value; };
  $('#mG').onclick = async () => {
    const d = { fecha: $('#mF').value, turno: turno, paladas: $('#mP').value, toneladas: $('#mTon').value, paladasSilo: $('#mS').value, observaciones: $('#mO').value };
    if (!d.fecha) return toast('Fecha requerida', 'bad');
    if (d.paladas === '' && d.toneladas === '' && d.paladasSilo === '') return toast('Cargá al menos un valor', 'warn');
    const p = num(d.paladas);
    const t = num(d.toneladas);
    if (p && t && (t / p < 1 || t / p > 10) && !(await confirmar('Factor fuera de rango', nf(t / p, 2) + ' t/palada es inusual. ¿Guardar igual?', 'Guardar'))) return;
    try {
      const r = await escribir('guardarMolienda', d, 'Molienda ' + d.fecha + ' ' + d.turno);
      if (!r.encolado) toast('Turno ' + d.turno + ' guardado', 'ok');
      edMolienda(d.fecha, volver);
    } catch (e) {
      toast(e.message, 'bad');
    }
  };
  app().onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.me) {
      const r = filas[b.dataset.me];
      $('#mF').value = r.fecha;
      turno = r.turno;
      segmento($('#mTseg'), [['T1', 'T1'], ['T2', 'T2'], ['T3', 'T3']], r.turno, k => { turno = k; }, true);
      const v = k => { const x = val(r, k); return x === null || x === undefined ? '' : x; };
      $('#mP').value = v('pal');
      $('#mTon').value = v('t');
      $('#mS').value = v('silo');
      $('#mO').value = (r.man.obs || r.inf.obs || '');
      fac();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (b.dataset.md) {
      const p = b.dataset.md.split('|');
      if (!(await confirmar('Quitar carga manual', 'Se eliminará la carga manual de ' + fCorta(p[0]) + ' ' + p[1] + '. Si existe dato del Informe de Turno, pasará a usarse.', 'Quitar', true))) return;
      try {
        await escribir('eliminarMolienda', { fecha: p[0], turno: p[1] }, 'Quitar molienda ' + b.dataset.md);
        edMolienda(f, volver);
      } catch (er) {
        toast(er.message, 'bad');
      }
    }
  };
}

async function edCalidad(f, volver) {
  app().innerHTML = '<div class="vista"><div class="card"><div class="skel" style="height:240px"></div></div></div>';
  const ok = vivo();
  const j = await api('jornada', { fecha: f });
  if (!ok()) return;
  S.cal = { fecha: f, lista: j.calidad, viajes: j.viajes, pesajes: j.pesajes, id: null };
  pintarCalidad(volver);
}

function pintarCalidad(volver, reg) {
  const c = S.cal;
  const r = reg || {};
  const tol = num(par('TOLERANCIA_COMPOSICION', 5)) || 5;
  const colores = ['Rojiza', 'Marrón', 'Gris', 'Amarillenta', 'Negra', 'Mixta'];
  const defs = [['piedras', 'Piedras'], ['raices', 'Raíces / vegetal'], ['calcareo', 'Calcáreo / tosca'], ['humedadExcesiva', 'Humedad excesiva'], ['materialExtrano', 'Material extraño']];
  const vv = x => x === null || x === undefined ? '' : x;
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos</div><h1>' + (r.id ? 'Editar muestra' : 'Calidad de tierra') + '</h1><p class="sub">Inspección visual, ensayo de sedimentación y decisión sobre el viaje.</p></div></div></div>' +
    '<div class="grid g-21"><div class="card"><div id="cErr"></div><div class="form"><label class="f">Fecha<input type="date" id="cF" value="' + c.fecha + '"></label><label class="f">Hora<input type="time" id="cH" value="' + esc(r.hora || '') + '"></label>' +
    '<label class="f w2">Vincular a un viaje del día<select id="cV"><option value="">— sin vincular —</option>' + c.viajes.map((v, i) => '<option value="' + i + '"' +
      (r.comprobante && r.comprobante === v.comprobante && normDom(r.dominio) === normDom(v.dominio) ? ' selected' : '') + '>' + esc(v.horaCarga + ' · ' + v.dominio + ' · ' + v.chofer + ' · comp. ' + v.comprobante) + '</option>').join('') + '</select></label>' +
    '<label class="f">Dominio<input id="cDom" value="' + esc(r.dominio || '') + '"></label><label class="f">Chofer<input id="cCh" value="' + esc(r.chofer || '') + '"></label>' +
    '<label class="f">Origen / frente<input id="cOr" value="' + esc(r.origen || '') + '"></label>' +
    '<label class="f">Comprobante<input id="cComp" value="' + esc(r.comprobante || '') + '"></label><label class="f">Ticket balanza<input id="cTk" value="' + esc(r.ticket || '') + '"></label></div>' +
    '<h3 class="mt2">Inspección visual</h3><div class="chips mt">' + defs.map(d => '<label class="chip"><input type="checkbox" id="cd_' + d[0] + '"' + (r[d[0]] ? ' checked' : '') + '>' + d[1] + '</label>').join('') + '</div>' +
    '<div class="form mt"><label class="f">Color<select id="cCol">' + opts(colores, r.color || '') + '</select></label></div>' +
    '<h3 class="mt2">Ensayo de sedimentación ' + ayuda('En un frasco con agua y la muestra: se agita, se deja reposar y se miden las capas. Abajo arena, en el medio limo y arriba arcilla.') + '</h3><div class="form mt"><label class="f">% Arcilla<input type="number" min="0" max="100" step="0.5" id="cA" value="' + vv(r.arcilla) + '"></label>' +
    '<label class="f">% Limo<input type="number" min="0" max="100" step="0.5" id="cL" value="' + vv(r.limo) + '"></label>' +
    '<label class="f">% Arena<input type="number" min="0" max="100" step="0.5" id="cR" value="' + vv(r.arena) + '" placeholder="por diferencia"></label>' +
    '<div class="f w2"><label class="f">Composición <span id="cSum"></span></label><div class="comp" id="cBar"></div></div></div>' +
    '<h3 class="mt2">Decisión</h3><div class="chips mt" id="cEst">' + [['Aceptado', 't-ok'], ['Observado', 't-warn'], ['Rechazado', 't-bad']].map(e => '<label class="chip"><input type="radio" name="cE" value="' + e[0] + '"' + (r.estado === e[0] ? ' checked' : '') + '>' + e[0] + '</label>').join('') + '</div>' +
    '<div class="form mt"><label class="f full">Observaciones<input id="cO" value="' + esc(r.observaciones || '') + '" placeholder="Obligatorio si se rechaza"></label></div>' +
    '<div class="row mt"><button class="btn pri" id="cG">' + ICON.guardar + (r.id ? 'Guardar cambios' : 'Guardar muestra') + '</button>' + (r.id ? '<button class="btn" id="cN">Nueva muestra</button>' : '') + '</div></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Muestras del ' + fCorta(c.fecha) + '</h3></div></div><div class="sesion-lista">' + (c.lista.length ? c.lista.map(x => '<div class="ses-item" style="animation:none"><span class="tag ' + (x.estado === 'Aceptado' ? 't-ok' : x.estado === 'Rechazado' ? 't-bad' : 't-warn') + '">' + x.estado + '</span><div class="txt"><b>' + esc(x.hora || '—') + ' · ' + esc(x.dominio || x.origen) + '</b><small>' +
      [x.arcilla, x.limo, x.arena].map(y => y === null ? '–' : nf(y, 0)).join(' / ') + ' % · ' + defs.filter(d => x[d[0]]).map(d => d[1]).join(', ') + '</small></div><button class="btn icon sm" data-ce="' + x.id + '">' + ICON.editar + '</button><button class="btn icon sm dan" data-cx="' + x.id + '">' + ICON.borrar + '</button></div>').join('') : vacio('Sin muestras para este día.')) + '</div></div></div></div>';
  c.id = r.id || null;
  autocompletar($('#cDom'), () => nombres('Dominios'));
  autocompletar($('#cCh'), () => nombres('Choferes'));
  autocompletar($('#cOr'), () => nombres('Lugares'));
  const barra = () => {
    const a = num($('#cA').value);
    const l = num($('#cL').value);
    let ar = num($('#cR').value);
    if (ar === null && a !== null && l !== null) { ar = Math.max(0, 100 - a - l); $('#cR').placeholder = 'auto: ' + nf(ar, 1); }
    const s = (a || 0) + (l || 0) + (ar || 0);
    $('#cSum').innerHTML = (a !== null || l !== null) ? '· suma ' + nf(s, 1) + '% ' + (Math.abs(s - 100) <= tol ? '<span class="tag t-ok">ok</span>' : '<span class="tag t-bad">≠ 100</span>') : '';
    $('#cBar').innerHTML = '<span style="width:' + (a || 0) + '%;background:' + COL(1) + '" title="Arcilla"></span><span style="width:' + (l || 0) + '%;background:' + COL(2) + '" title="Limo"></span><span style="width:' + (ar || 0) + '%;background:' + COL(3) + '" title="Arena"></span>';
  };
  ['cA', 'cL', 'cR'].forEach(id => { $('#' + id).oninput = barra; });
  barra();
  $('#cF').onchange = e => { location.hash = '#/cargar/calidad/' + e.target.value; };
  $('#cV').onchange = e => {
    const v = c.viajes[Number(e.target.value)];
    if (!v) return;
    $('#cDom').value = v.dominio;
    $('#cCh').value = v.chofer;
    $('#cOr').value = v.origen;
    $('#cComp').value = v.comprobante;
    if (!$('#cH').value) $('#cH').value = v.horaDescarga || v.horaCarga;
    const p = c.pesajes.find(x => normDom(x.dominio) === normDom(v.dominio) && Math.abs((minDe(x.hora) || 0) - (minDe(v.horaDescarga) || 0)) <= 120);
    if (p) $('#cTk').value = p.ticket;
    ['cDom', 'cCh', 'cOr', 'cComp'].forEach(id => $('#' + id).classList.add('lleno'));
  };
  $('#cG').onclick = () => guardarCalidad(volver, defs);
  if ($('#cN')) $('#cN').onclick = () => pintarCalidad(volver);
  app().onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ce) { pintarCalidad(volver, c.lista.find(x => x.id === b.dataset.ce)); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (b.dataset.cx) {
      if (!(await confirmar('Eliminar muestra', '¿Eliminar el registro de calidad?', 'Eliminar', true))) return;
      try {
        await escribir('eliminarCalidad', { id: b.dataset.cx }, 'Eliminar muestra calidad');
        edCalidad(c.fecha, volver);
      } catch (er) {
        toast(er.message, 'bad');
      }
    }
  };
}

async function guardarCalidad(volver, defs) {
  const c = S.cal;
  const a = num($('#cA').value);
  const l = num($('#cL').value);
  let ar = num($('#cR').value);
  if (ar === null && a !== null && l !== null) ar = Math.max(0, Math.round((100 - a - l) * 10) / 10);
  const est = ($('input[name="cE"]:checked') || {}).value;
  const err = [];
  if (!$('#cF').value) err.push('fecha');
  if (!est) err.push('decisión (aceptado / observado / rechazado)');
  if (!$('#cDom').value && !$('#cOr').value) err.push('dominio u origen');
  const tol = num(par('TOLERANCIA_COMPOSICION', 5)) || 5;
  if ((a !== null || l !== null || ar !== null) && Math.abs((a || 0) + (l || 0) + (ar || 0) - 100) > tol) err.push('arcilla + limo + arena debe sumar 100%');
  if (est === 'Rechazado' && !$('#cO').value.trim()) err.push('motivo del rechazo en observaciones');
  if (err.length) {
    $('#cErr').innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>Completá: ' + err.join(' · ') + '</div></div>';
    return window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const d = {
    id: c.id, fecha: $('#cF').value, hora: $('#cH').value, dominio: $('#cDom').value, chofer: $('#cCh').value, origen: $('#cOr').value, comprobante: $('#cComp').value, ticket: $('#cTk').value,
    color: $('#cCol').value, arcilla: a, limo: l, arena: ar, estado: est, observaciones: $('#cO').value
  };
  defs.forEach(x => { d[x[0]] = $('#cd_' + x[0]).checked; });
  try {
    const r = await escribir('guardarCalidad', d, 'Calidad ' + d.fecha + ' ' + (d.dominio || d.origen));
    if (!r.encolado) toast('Muestra guardada', 'ok');
    edCalidad(d.fecha, volver);
  } catch (e) {
    $('#cErr').innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>' + esc(e.message) + '</div></div>';
  }
}

const FORMAS_PILA = {
  cono: { t: 'Cono', campos: [['per', 'Perímetro del pie (m)'], ['h', 'Altura (m)'], ['tal', 'o largo del talud (m)']] },
  prisma: { t: 'Pila alargada', campos: [['L', 'Largo al pie (m)'], ['W', 'Ancho al pie (m)'], ['l', 'Largo de la cresta (m)'], ['w', 'Ancho de la cresta (m)'], ['h', 'Altura (m)']] },
  medido: { t: 'Volumen medido', campos: [['v', 'Volumen (m³)']] }
};

function volumenPila(p) {
  const g = k => num(p[k]);
  if (p.forma === 'cono') {
    const per = g('per');
    if (!per) return null;
    const r = per / (2 * Math.PI);
    let h = g('h');
    const tal = g('tal');
    if (!h && tal && tal > r) h = Math.sqrt(tal * tal - r * r);
    return h ? Math.PI * r * r * h / 3 : null;
  }
  if (p.forma === 'prisma') {
    const L = g('L');
    const W = g('W');
    const h = g('h');
    if (!L || !W || !h) return null;
    const l = g('l') || 0;
    const w = g('w') || 0;
    return h / 6 * (L * W + 4 * ((L + l) / 2) * ((W + w) / 2) + l * w);
  }
  return g('v');
}

function figuraPila(forma) {
  if (forma === 'cono') return '<svg class="figura" viewBox="0 0 220 110"><path class="rel" d="M20 90 L110 18 L200 90 Z"/><ellipse cx="110" cy="90" rx="90" ry="10"/><line class="cota" x1="110" y1="18" x2="110" y2="90"/><text x="116" y="58">h</text><text x="60" y="48">talud</text><text x="92" y="108">perímetro</text></svg>';
  if (forma === 'prisma') return '<svg class="figura" viewBox="0 0 220 110"><path class="rel" d="M14 92 L206 92 L164 30 L58 30 Z"/><line class="cota" x1="58" y1="22" x2="164" y2="22"/><line class="cota" x1="14" y1="100" x2="206" y2="100"/><line class="cota" x1="186" y1="30" x2="186" y2="92"/><text x="96" y="18">largo cresta</text><text x="88" y="110">largo al pie</text><text x="192" y="64">h</text></svg>';
  return '<svg class="figura" viewBox="0 0 220 110"><path class="rel" d="M10 90 C40 40 70 30 100 50 C130 20 170 30 210 90 Z"/><circle cx="110" cy="18" r="8" style="fill:none;stroke:var(--accent);stroke-width:2"/><path d="M96 18 H124 M110 4 V32" style="stroke:var(--accent);stroke-width:2"/><text x="64" y="106">drone / topografía</text></svg>';
}

function edAjustes(volver) {
  const lista = (S.resumen.ajustes || []).slice().sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  const pilas = lsGet('tierra_pilas', [{ nombre: 'Pila 1', forma: 'cono' }]);
  const dens = { Playa: num(par('DENSIDAD_APARENTE', 1.6)) || 1.6, Silo: 1.3 };
  const pasos = [
    ['Cuándo cubicar', 'Una vez por mes y cada vez que el balance de la playa o del silo se aleje de lo que se ve. Hacelo al cierre de un turno, sin palas trabajando en la pila, y anotá la fecha: el ajuste fija el stock al inicio de ese día.'],
    ['Qué llevar', 'Cinta métrica de 50 m (o rueda medidora), jalón o regla de 3 m, celular con inclinómetro, planilla o esta pantalla, y un balde de volumen conocido para la densidad.'],
    ['Pila cónica', 'Medí el perímetro del pie caminando con la cinta a ras del suelo. Para la altura, si no se puede subir, medí el largo del talud (del pie a la punta, sobre la superficie) y la app calcula la altura.<span class="formula">r = P / 2π · h = √(talud² − r²) · V = π·r²·h / 3</span>'],
    ['Pila alargada', 'Medí largo y ancho al pie, largo y ancho de la cresta (arriba) y la altura media. Si la cresta es un filo, dejá su ancho en 0.<span class="formula">V = h/6 · (A_pie + 4·A_media + A_cresta)</span>'],
    ['Pilas irregulares', 'Dividilas en tramos que se parezcan a un cono o a una pila alargada y cargá cada tramo como una pila. Las diferencias se compensan en la suma.'],
    ['Densidad aparente', 'Llená el balde con tierra de la pila sin apretar, enrasá y pesá. Densidad = (peso − tara) / volumen. Repetí en 3 pilas y promediá. Con lluvia la densidad sube: medila el mismo día. Alternativa: un camión pesado en balanza dividido por el volumen de su caja enrasada.'],
    ['Drone o topografía', 'Es el método más preciso (±2–3 %). Un vuelo con fotogrametría o un relevamiento con GPS/estación total da el volumen sobre el piso de la playa: cargalo como «Volumen medido».'],
    ['Precisión esperable', 'Con cinta y fórmulas el error suele ser de ±10 %. Por eso conviene cubicar siempre con el mismo método y comparar la tendencia mes a mes.']
  ];
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos</div><h1>Ajustes de stock</h1><p class="sub">El balance acumula diferencias del factor t/palada; una cubicación periódica las corrige.</p></div></div></div>' +
    '<details class="guia" id="guiaCub"><summary>' + ICON.infoI.replace('<svg', '<svg width="18" height="18"') + 'Guía rápida para cubicar la playa y el silo</summary><div class="cuerpo" style="display:block"><div class="guia-cub">' +
    pasos.map((p, i) => '<div class="paso"><b><i>' + (i + 1) + '</i>' + p[0] + '</b><div>' + p[1] + '</div></div>').join('') + '</div></div></details>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Calculadora de cubicación</h3><div class="sub">Cargá cada pila; la app suma volúmenes y los pasa a toneladas</div></div><div class="row"><button class="btn sm" id="cAdd">+ Agregar pila</button></div></div>' +
    '<div id="cPilas"></div><div class="form mt" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))"><label class="f">Densidad aparente (t/m³)<input id="cDen" type="number" step="0.01" value="' + dens.Playa + '"></label></div>' +
    '<div class="calc-res" id="cRes"></div></div>' +
    '<div class="grid g-21"><div class="card"><div class="card-h"><div class="t"><h3>Registrar ajuste</h3></div></div><div class="form"><label class="f">Fecha<input type="date" id="aF" value="' + hoy() + '"></label><label class="f">Nodo<div id="aNseg"></div></label>' +
    '<label class="f">Tipo<select id="aT">' + opts(['Stock inicial', 'Cubicación', 'Corrección'], 'Cubicación', null) + '</select></label><label class="f">Toneladas<input type="number" step="0.1" id="aV"></label>' +
    '<label class="f full">Observaciones / método<input id="aO" placeholder="Ej: cubicación con cinta, 3 pilas, densidad 1,55 t/m³"></label></div>' +
    '<div class="sub mt"><b>Stock inicial</b> y <b>Cubicación</b> fijan el stock en ese valor al inicio del día. <b>Corrección</b> suma o resta toneladas (negativo para restar).</div>' +
    '<div class="row mt"><button class="btn pri" id="aG">' + ICON.guardar + 'Guardar ajuste</button></div></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Registrados</h3></div></div>' + tabla([[r => fCorta(r.fecha), 'Fecha'], ['nodo', 'Nodo'], ['tipo', 'Tipo'], [r => nf(r.toneladas, 1), 't', 'n'], [r => esc(r.observaciones), 'Método', 'wrap'], [r => '<button class="btn icon sm dan" data-ax="' + r.id + '">' + ICON.borrar + '</button>', '']], lista) + '</div></div></div>';
  if (!lista.length) $('#guiaCub').open = true;
  let nodo = 'Playa';
  segmento($('#aNseg'), [['Playa', 'Playa'], ['Silo', 'Silo']], 'Playa', k => {
    nodo = k;
    $('#cDen').value = dens[k];
    calcular();
  }, true);
  const pintarPilas = () => {
    $('#cPilas').innerHTML = pilas.map((p, i) => '<div class="maq" style="margin-bottom:10px"><div class="maq-h"><div class="t"><input data-p="' + i + '" data-k="nombre" value="' + esc(p.nombre) + '" style="width:150px;font-weight:800"><div class="seg sm" style="display:inline-flex">' +
      Object.keys(FORMAS_PILA).map(f => '<button type="button" data-p="' + i + '" data-forma="' + f + '" class="' + (p.forma === f ? 'on' : '') + '" style="' + (p.forma === f ? 'background:var(--panel);box-shadow:var(--shadow);color:var(--text)' : '') + '">' + FORMAS_PILA[f].t + '</button>').join('') + '</div></div>' +
      '<div class="row"><b class="tnum" data-vol="' + i + '"></b><button class="btn icon sm dan" data-quitarp="' + i + '" aria-label="Quitar">' + ICON.borrar + '</button></div></div>' +
      '<div class="tramo" style="display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:14px;align-items:center"><div class="form" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">' +
      FORMAS_PILA[p.forma].campos.map(c => '<label class="f">' + c[1] + '<input type="number" step="0.01" min="0" inputmode="decimal" data-p="' + i + '" data-k="' + c[0] + '" value="' + esc(p[c[0]] === undefined ? '' : p[c[0]]) + '"></label>').join('') + '</div>' + figuraPila(p.forma) + '</div></div>').join('');
    calcular();
  };
  const calcular = () => {
    let tot = 0;
    let ok = 0;
    pilas.forEach((p, i) => {
      const v = volumenPila(p);
      const el = $('[data-vol="' + i + '"]');
      if (el) el.textContent = v ? nf(v, 1) + ' m³' : '—';
      if (v) { tot += v; ok++; }
    });
    const d = num($('#cDen').value) || 0;
    const t = tot * d;
    $('#cRes').innerHTML = '<div><div class="eyebrow">Volumen total</div><b>' + nf(tot, 1) + ' m³</b></div><div><div class="eyebrow">Toneladas (' + nf(d, 2) + ' t/m³)</div><b>' + nf(t, 1) + ' t</b></div>' +
      '<div class="sub">' + ok + ' de ' + pilas.length + ' pilas completas</div><button class="btn pri right" id="cUsar"' + (t > 0 ? '' : ' disabled') + '>' + ICON.der + 'Usar como cubicación</button>';
    $('#cUsar').onclick = () => {
      $('#aT').value = 'Cubicación';
      $('#aV').value = Math.round(t * 10) / 10;
      $('#aO').value = 'Cubicación ' + pilas.filter(p => volumenPila(p)).map(p => p.nombre + ' ' + FORMAS_PILA[p.forma].t.toLowerCase() + ' ' + nf(volumenPila(p), 0) + ' m³').join(', ') + ' · ' + nf(tot, 0) + ' m³ × ' + nf(d, 2) + ' t/m³';
      $('#aV').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#aV').classList.add('lleno');
    };
    lsSet('tierra_pilas', pilas);
  };
  $('#cDen').oninput = calcular;
  $('#cAdd').onclick = () => { pilas.push({ nombre: 'Pila ' + (pilas.length + 1), forma: 'cono' }); pintarPilas(); };
  $('#cPilas').addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.p === undefined || !el.dataset.k) return;
    pilas[Number(el.dataset.p)][el.dataset.k] = el.value;
    if (el.dataset.k !== 'nombre') calcular(); else lsSet('tierra_pilas', pilas);
  });
  $('#cPilas').addEventListener('click', e => {
    const f = e.target.closest('[data-forma]');
    if (f) { pilas[Number(f.dataset.p)].forma = f.dataset.forma; pintarPilas(); return; }
    const q = e.target.closest('[data-quitarp]');
    if (q) { pilas.splice(Number(q.dataset.quitarp), 1); if (!pilas.length) pilas.push({ nombre: 'Pila 1', forma: 'cono' }); pintarPilas(); }
  });
  pintarPilas();
  $('#aG').onclick = async () => {
    const d = { fecha: $('#aF').value, nodo: nodo, tipo: $('#aT').value, toneladas: $('#aV').value, observaciones: $('#aO').value };
    if (!d.fecha || d.toneladas === '') return toast('Fecha y toneladas requeridas', 'bad');
    try {
      await escribir('guardarAjuste', d, 'Ajuste ' + d.nodo + ' ' + d.fecha);
      await cargarResumen(true);
      toast('Ajuste guardado', 'ok');
      edAjustes(volver);
    } catch (e) {
      toast(e.message, 'bad');
    }
  };
  app().onclick = async e => {
    const b = e.target.closest('button[data-ax]');
    if (!b || !(await confirmar('Eliminar ajuste', '¿Eliminar este ajuste de stock?', 'Eliminar', true))) return;
    try {
      await escribir('eliminarAjuste', { id: b.dataset.ax }, 'Eliminar ajuste');
      await cargarResumen(true);
      edAjustes(volver);
    } catch (er) {
      toast(er.message, 'bad');
    }
  };
}
