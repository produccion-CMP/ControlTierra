'use strict';

const MODULOS = [
  ['jornada', 'Jornada de cantera', 'Tramos de producción y paradas por máquina: horómetros, camiones a planta e internos.', 'pala', 3, 'jornada', 'abastecimiento'],
  ['gasoil', 'Gasoil de cantera', 'Cargas a máquinas, llenado y medición de la cisterna.', 'combustible', 6, 'gasoil', 'abastecimiento'],
  ['viajes', 'Viajes de camiones', 'Talonarios: viajes con horario, viajes internos y control con la balanza.', 'camion', 1, 'viajes', 'abastecimiento'],
  ['pesaje', 'Balanza de ingreso', 'Importar el PESAJE.XLS para cruzarlo con los viajes.', 'balanza', 2, 'pesajes', 'abastecimiento'],
  ['calidad', 'Calidad de tierra', 'Calidad enviada (abastecimiento) y recibida (molienda) de los camiones de la balanza, en bloque.', 'calidad', 5, 'calidad', 'abastecimiento'],
  ['molienda', 'Molienda y silo', 'Se lee del Informe de Producción; acá se corrige un turno.', 'molienda', 7, 'molienda', 'molienda'],
  ['ajustes', 'Ajuste de stock', 'Cargar cuánta tierra hay en playa o silo, en t o m³.', 'ajuste', 4, 'cubicacion', 'molienda']
];

async function vCargar(mod, arg) {
  const ok = vivo();
  await cargarResumen();
  if (!ok()) return;
  if (!mod) {
    const tarjeta = m => {
      const f = (S.resumen.ultimo || {})[m[5]];
      const sm = semaforoDias(f);
      return '<a class="card hover modulo" href="#/cargar/' + m[0] + '"><span class="ic" style="background:' + COL(m[4]) + '">' + ICON[m[3]] + '</span><h3>' + m[1] + '</h3><p class="sub">' + m[2] + '</p>' +
        '<div class="pie"><span class="semaforo ' + sm.cls + '"></span>' + (f ? 'Último dato: ' + fMedia(f) + ' · ' + sm.txt : 'Sin datos') + '</div></a>';
    };
    const secs = Object.keys(SECTORES).filter(k => MODULOS.some(m => m[6] === k && puede(m[0])));
    app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Carga de datos · ' + esc(rolTxt(S.ses.rol)) + '</div><h1>¿Qué vas a cargar?</h1></div></div>' +
      secs.map(k => '<div class="sector-h ' + k + '">' + ICON[SECTORES[k].ic] + '<div><b>' + SECTORES[k].t + '</b><span>' + SECTORES[k].d + ' · ' + SECTORES[k].rol + '</span></div></div><div class="modulos stagger">' +
        MODULOS.filter(m => m[6] === k && puede(m[0])).map(tarjeta).join('') + '</div>').join('') + '</div>';
    stagger(app());
    return;
  }
  if (!puede(mod)) {
    app().innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>Tu rol no tiene acceso a este módulo.</div></div>';
    return;
  }
  const volver = '<a class="btn icon" href="#/cargar" aria-label="Volver">' + ICON.izq + '</a>';
  if (mod === 'viajes') return edViajes(arg, volver);
  if (mod === 'gasoil') return edGasoil(arg || hoy(), volver);
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

function aprenderPatrones(tramos) {
  const pat = lsGet('tierra_patron', {});
  const porMaq = {};
  tramos.filter(t => t.tipo === 'Producción' && parseHora(t.horaInicio) && parseHora(t.horaFin)).forEach(t => {
    const k = t.maquina;
    if (!k) return;
    (porMaq[k] = porMaq[k] || {})[parseHora(t.horaInicio) + '-' + parseHora(t.horaFin)] = ((porMaq[k] || {})[parseHora(t.horaInicio) + '-' + parseHora(t.horaFin)] || 0) + 1;
  });
  Object.keys(porMaq).forEach(k => {
    const prev = pat[k] || {};
    Object.keys(prev).forEach(x => { prev[x] = prev[x] * 0.7; });
    Object.keys(porMaq[k]).forEach(x => { prev[x] = (prev[x] || 0) + porMaq[k][x]; });
    const top = Object.keys(prev).sort((a, b) => prev[b] - prev[a]).slice(0, 6);
    pat[k] = {};
    top.forEach(x => { pat[k][x] = Math.round(prev[x] * 100) / 100; });
  });
  lsSet('tierra_patron', pat);
}

function patronesMaq(nombre) {
  const p = lsGet('tierra_patron', {})[nombre] || {};
  const l = Object.keys(p).sort((a, b) => p[b] - p[a]).slice(0, 3);
  return (l.length ? l : ['06:00-14:00', '14:00-22:00']).sort();
}

function duracionHabitual(nombre) {
  const d = patronesMaq(nombre).map(x => { const h = x.split('-'); return (((minDe(h[1]) - minDe(h[0])) + 1440) % 1440) || 1440; }).sort((a, b) => a - b);
  return d.length ? d[Math.floor(d.length / 2)] : 480;
}

function botonesTramo(mi) {
  const m = S.ed.maqs[mi];
  const usados = S.ed.t[mi].map(t => [linMin(t.horaInicio), linMin(t.horaFin, true)]);
  const libre = x => { const h = x.split('-'); const a = minDe(h[0]); const b = minDe(h[1]) || 1440; return !usados.some(u => u[0] !== null && u[1] !== null && a < u[1] && b > u[0]); };
  return patronesMaq(m.nombre).filter(libre).map(x => '<button class="btn sm" data-add="' + mi + '" data-h="' + x + '" title="Horario habitual de esta máquina; después se puede cambiar">+ ' + x.replace('-', '–') + '</button>').join('') +
    '<button class="btn sm" data-add="' + mi + '" data-h="" title="Empieza donde terminó el tramo anterior">+ Tramo</button><button class="btn sm dan" data-add="' + mi + '" data-par="1">+ Parada</button>';
}

async function edJornada(f, volver) {
  app().innerHTML = '<div class="vista"><div class="card"><div class="skel" style="height:60px"></div></div><div class="card"><div class="skel" style="height:220px"></div></div></div>';
  const ok = vivo();
  const hist = api('rango', { desde: addDias(f, -21), hasta: addDias(f, -1) }).catch(() => null);
  const j = await api('jornada', { fecha: f });
  if (!ok()) return;
  try { const h = await hist; if (h && h.tramos) aprenderPatrones(h.tramos); } catch (e) { console.warn(e); }
  if (j.tramos.length) aprenderPatrones(j.tramos);
  const maqs = activos('Maquinas').map(m => ({ nombre: m.nombre, tipo: m.tipo }));
  j.tramos.forEach(t => { if (!maqs.some(m => m.nombre === t.maquina)) maqs.push({ nombre: t.maquina, tipo: maqInfo(t.maquina).tipo }); });
  const t = maqs.map(m => j.tramos.filter(x => x.maquina === m.nombre)
    .sort((a, b) => linMin(a.horaInicio) - linMin(b.horaInicio))
    .map(x => Object.assign(nuevoTramo(), x, {
      personal: separarPersonal(x.personal),
      viajesInternos: x.viajesInternos || 0,
      palAuto: x.tipo === 'Producción' && Number(x.paladasCamiones || 0) === ((x.unidadesCargadas || 0) + (x.viajesInternos || 0)) * ppc()
    })));
  S.ed = { fecha: f, maqs: maqs, t: t, previos: j.horometrosPrevios || {}, sucio: false };
  const bor = lsGet('tierra_borrador_' + f, null);
  let aviso = j.tramos.length ? '<div class="alert info">' + ICON.infoI + '<div>Jornada ya registrada por <b>' + esc(j.tramos[0].usuario || '—') + '</b>. Al guardar se reemplaza completa.</div></div>' : '';
  if (bor && bor.t) aviso += '<div class="alert warn" id="avBor">' + ICON.alerta + '<div style="flex:1">Hay un borrador sin guardar de esta fecha. <button class="btn sm" id="bRest">Restaurar</button> <button class="btn sm dan" id="bDesc">Descartar</button></div></div>';
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos</div><h1>Jornada de cantera</h1></div></div>' +
    '<div class="row"><label class="f">Fecha<div class="row" style="flex-wrap:nowrap;gap:4px"><a class="btn icon" href="#/cargar/jornada/' + addDias(f, -1) + '">' + ICON.izq + '</a><input type="date" id="edF" value="' + f + '" style="width:170px"><a class="btn icon" href="#/cargar/jornada/' + addDias(f, 1) + '">' + ICON.der + '</a></div></label>' +
    '<button class="btn" id="bCopia" style="align-self:flex-end">' + ICON.copiar + 'Copiar día anterior</button>' + botonInforme('jornada', { fecha: f }, 'Informe') + '<button class="btn pri" id="bGuardar" style="align-self:flex-end">' + ICON.guardar + 'Guardar jornada</button></div></div>' +
    aviso + '<div id="edErr"></div><div id="edMaqs"></div>' +
    '<div class="row mt"><button class="btn pri" id="bGuardar2">' + ICON.guardar + 'Guardar jornada</button></div></div>';
  $('#edF').onchange = e => { location.hash = '#/cargar/jornada/' + e.target.value; };
  enlazarInformes(app());
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
      botonesTramo(mi) + '</div>' + (tramos.length ? '<div style="flex-basis:100%" id="pista-' + mi + '">' + pistaMaq(mi) + '</div>' : '') + '</div>' +
      tramos.map((t, i) => {
        const id = k => 'e-' + mi + '-' + i + '-' + k;
        const d = k => 'data-m="' + mi + '" data-i="' + i + '" data-k="' + k + '" id="' + id(k) + '"';
        let campos = '<label class="f">Régimen<select ' + d('tipo') + '>' + opts(['Producción', 'Parada'], t.tipo, null) + '</select></label>' +
          '<label class="f">Inicio' + inputHora(d('horaInicio'), t.horaInicio) + '</label>' +
          '<label class="f">Fin' + inputHora(d('horaFin'), t.horaFin) + '</label>';
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
          if (CAUSAS_PERSONAL_UNO.indexOf(t.motivoParada) >= 0) campos += '<label class="f">' + (/clim/i.test(t.motivoParada) ? 'Operario afectado' : 'Operario ausente') + '<select ' + d('personal') + '>' + opts(ops.map(o => o.nombre), (t.personal || [])[0] || '') + '</select></label>';
          if (CAUSAS_PERSONAL_MULTI.indexOf(t.motivoParada) >= 0) {
            const lista = ops.slice().sort((a, b) => (b.mecanico ? 1 : 0) - (a.mecanico ? 1 : 0)).map(o => o.nombre);
            campos += '<div class="f full" id="' + id('personal') + '"><label class="f">Personal interviniente (mecánicos y operarios)</label><div class="chips">' +
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

function separarPersonal(txt) {
  const s = String(txt || '').trim();
  if (!s) return [];
  if (s.indexOf(';') >= 0) return s.split(';').map(x => x.trim()).filter(Boolean);
  const cat = ((S.resumen.catalogos || {}).Operadores || []).map(o => o.nombre).filter(Boolean).sort((a, b) => b.length - a.length);
  const out = [];
  let resto = ' ' + s + ' ';
  cat.forEach(n => { if (resto.indexOf(n) >= 0) { out.push(n); resto = resto.replace(n, ' '); } });
  resto.split(/\s*,\s*(?=[A-ZÁÉÍÓÚÑ][^,]*,)/).map(x => x.trim().replace(/^,|,$/g, '').trim()).filter(x => x.length > 2).forEach(x => out.push(x));
  return out.length ? out : [s];
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
  if (!k || k === 'personalMulti' || el.tagName === 'SELECT' || el.classList.contains('hora')) return;
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
    else {
      if (!hi) hi = patronesMaq(S.ed.maqs[mi].nombre)[0].split('-')[0];
      if (!b.dataset.par && minDe(hi) !== null) hf = hDe(Math.min(minDe(hi) + duracionHabitual(S.ed.maqs[mi].nombre), 1440) % 1440);
    }
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
      if (t.horaInicio && parseHora(t.horaInicio) === null) marcar(mi, i, 'horaInicio', 'hora de inicio inválida (HH:MM)');
      if (t.horaFin && parseHora(t.horaFin) === null) marcar(mi, i, 'horaFin', 'hora de fin inválida (HH:MM)');
      const a = linMin(t.horaInicio, false);
      let b = linMin(t.horaFin, true);
      if (a !== null && b !== null) {
        if (b === a) marcar(mi, i, 'horaFin', 'el tramo no tiene duración');
        else {
          if (b < a) { b += 1440; avisos.push(S.ed.maqs[mi].nombre + ' · tramo ' + (i + 1) + ': termina después de la medianoche (' + t.horaInicio + ' → ' + t.horaFin + ')'); }
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
    avisarInforme(r);
    lsDel('tierra_borrador_' + S.ed.fecha);
    S.ed.sucio = false;
    if (!r.encolado) {
      aprenderPatrones([].concat.apply([], S.ed.maqs.map((m, mi) => S.ed.t[mi].map(t => Object.assign({}, t, { maquina: m.nombre })))));
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
    '<div class="row" style="justify-content:flex-end;margin-bottom:10px"><a class="btn" href="#/acopios/descargas">' + ICON.playa + 'Asignar descargas a acopios</a></div><div class="card"><div class="drop" id="drop">' + ICON.archivo + '<b>Arrastrá el archivo o tocá para elegirlo</b><span class="sub">PESAJE.XLS · .xlsx · .csv</span><input type="file" id="fileP" accept=".xls,.xlsx,.csv" class="hide"></div><div id="impC"></div></div></div>';
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
  if (esFormatoBalanza(filas[0] || [])) {
    pintarImportBalanza();
    return;
  }
  S.imp.balanza = null;
  autoMapear(lsGet('tierra_mapeo_pesaje', null));
  pintarImport();
}

async function contextoBalanza() {
  if (S.ctxBal && Date.now() - S.ctxBal.t < 600000) return S.ctxBal.d;
  let d = { codTierra: par('BALANZA_COD_TIERRA', '002'), flota: [], traDom: {}, netos: {} };
  try { d = await api('contextoBalanza'); } catch (e) { console.warn(e); }
  S.ctxBal = { t: Date.now(), d: d };
  return d;
}

function tablaAbiertas(l) {
  return tabla([['ticket', 'Ticket'], [r => fCorta(r.fecha) + ' ' + esc(r.hora), 'Entrada'], [r => esc(r.dominio) + (r.manual ? ' <span class="tag t-warn">manual</span>' : ''), 'Dominio'], [r => nf(r.pesoEntrada, 2), 'Peso entrada t', 'n'], ['transportista', 'Transp.'], ['balancero', 'Balancero'],
    [r => '<span class="tag t-bad">' + esc(r.estado) + '</span>', 'Estado'], [r => r.observ ? esc(r.observ) : '<span class="tag t-warn">sin justificar</span>', 'Observación']], l, { vacio: 'No hay camiones de tierra con la entrada abierta.' });
}

function tablaPracticas(l, tipo) {
  return tabla([['ticket', 'Ticket'], [r => fCorta(r.fecha) + ' ' + esc(r.hora), 'Entrada'], [r => esc(r.salida || ''), 'Salida'], [r => r.minutos === null || r.minutos === undefined ? '' : r.minutos >= 60 ? nf(r.minutos / 60, 1) + ' h' : nf(r.minutos) + ' min', 'Entre entrada y salida', 'n'],
    [r => esc(r.dominio) + (r.dominioArchivo ? ' <span class="sub">(' + esc(r.dominioArchivo) + ')</span>' : ''), 'Dominio'], [r => nf(r.neto, 2), 'Neto t', 'n'], [r => [r.manual && tipo !== 'manual' ? 'también carga manual' : '', r.sinSalida && tipo !== 'sinSalida' ? 'también sin pesaje de salida' : ''].filter(Boolean).join(' · '), 'Además'],
    ['balancero', 'Balancero'], [r => r.observ ? esc(r.observ) : '<span class="tag t-warn">sin justificar</span>', 'Justificación (observación)', 'wrap']], l, { vacio: tipo === 'manual' ? 'Sin cargas manuales.' : 'Todos los camiones se pesaron a la salida.' });
}

function resumenPracticas(C) {
  const sinJ = C.manuales.concat(C.sinSalida.filter(x => !x.manual)).filter(x => !x.observ).length;
  return '<h3 class="mt2">Malas prácticas en balanza (solo tierra)</h3><p class="sub">Cada caso debería tener el motivo en la observación del pesaje. ' + (sinJ ? '<b class="rojo">' + pl(sinJ, 'registro', 'registros') + ' sin justificar.</b>' : 'Todos justificados.') + '</p>' +
    '<h4>Sin pesaje de salida · ' + C.sinSalida.length + '</h4><p class="sub">El camión salió sin pesarse y el pesaje se cerró con la tara cargada en el sistema (salida otro día o más de ' + C.umbral + ' min después de la entrada). El neto no usa la tara real.</p>' + tablaPracticas(C.sinSalida, 'sinSalida') +
    '<h4>Entradas todavía abiertas · ' + C.abiertas.length + '</h4>' + tablaAbiertas(C.abiertas) +
    '<h4>Cargas manuales · ' + C.manuales.length + '</h4><p class="sub">Patente escrita a mano con un carácter extra (por ejemplo «LHU 365+») porque el camión no esperó la lectura del sistema.</p>' + tablaPracticas(C.manuales, 'manual');
}

function tablaDudosos(l, conCheck) {
  return tabla([[(r, i) => conCheck ? '<input type="checkbox" data-dud="' + i + '"' + (r.incluir ? ' checked' : '') + '>' : '', ''], ['ticket', 'Ticket'], [r => fCorta(r.fecha) + ' ' + esc(r.hora), 'Entrada'], [r => esc(r.dominio) + (r.dominioArchivo ? ' <span class="sub">(' + esc(r.dominioArchivo) + ')</span>' : ''), 'Dominio'],
    ['material', 'Mat.'], [r => esc(r.cliente || ''), 'Cliente'], [r => esc(r.sentido), 'Sentido'], [r => nf(r.neto, 2), 'Neto t', 'n'], [r => esc(r.motivo), 'Por qué', 'wrap']], l, { vacio: 'Sin registros dudosos.' });
}

async function pintarImportBalanza() {
  const ctx = await contextoBalanza();
  const crudo = XLSX.utils.sheet_to_json(S.imp.wb.Sheets[S.imp.hoja], { raw: false, defval: '' });
  const C = clasificarBalanza(crudo, Object.assign({}, ctx, { codTierra: par('BALANZA_COD_TIERRA', ctx.codTierra || '002'), maxMinSalida: num(par('BALANZA_MAX_MIN_SALIDA', ctx.maxMinSalida || 120)) }));
  S.imp.balanza = C;
  S.imp.crudo = crudo.map(crudoBalanza);
  const pintar = () => {
    const val = C.tierra.concat(C.dudosos.filter(x => x.incluir)).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.fecha) && x.neto > 0);
    const fechas = val.map(x => x.fecha).sort();
    const porDia = agrupar(val, x => x.fecha);
    const corr = C.tierra.filter(x => x.dominioArchivo).concat(C.dudosos.filter(x => x.dominioArchivo));
    const terceros = C.tierra.filter(x => /tercero/.test(x.nota || ''));
    $('#impC').innerHTML = '<div class="mt vista"><div class="alert ok">' + ICON.ok + '<div><b>Archivo de la balanza reconocido: ' + nf(C.leidas) + ' filas.</b> Cada camión tiene dos filas: la entrada (opción 1) y el pesaje completo con salida (opción 2; la 4 es un pesaje cerrado en el momento). Se importan los pesajes completos que son tierra según el material, el sentido de la carga (entra cargado y sale vacío), que no tengan cliente y la patente.</div></div>' +
      '<div class="kpis mt stagger">' + kpi('Pesajes de tierra a importar', nf(val.length), fechas.length ? fCorta(fechas[0]) + ' – ' + fCorta(fechas[fechas.length - 1]) + ' · ' + nf(sum(val, x => x.neto), 1) + ' t' : '', 'kacc') +
      kpi('Dudosos', nf(C.dudosos.length), C.dudosos.filter(x => x.incluir).length + ' incluidos · revisá abajo', C.dudosos.length ? 'warn' : 'ok') +
      kpi('Sin pesaje de salida', nf(C.sinSalida.length + C.abiertas.length), C.sinSalida.length + ' cerrados con tara del sistema · ' + C.abiertas.length + ' abiertos', C.sinSalida.length + C.abiertas.length ? 'bad' : 'ok') +
      kpi('Cargas manuales', nf(C.manuales.length), nf(C.manuales.filter(x => !x.observ).length) + ' sin justificar · ' + nf(C.otros) + ' filas de otros materiales ignoradas', C.manuales.length ? 'warn' : 'ok') + '</div>' +
      (corr.length ? '<div class="alert info">' + ICON.infoI + '<div><b>' + pl(corr.length, 'patente corregida', 'patentes corregidas') + ':</b> ' + corr.map(x => esc(x.dominioArchivo) + ' → ' + esc(x.dominio) + ' (ticket ' + esc(x.ticket) + ')').join(' · ') + '. Se guarda la patente original en la nota del pesaje.</div></div>' : '') +
      (terceros.length ? '<div class="alert warn">' + ICON.alerta + '<div><b>' + pl(terceros.length, 'pesaje de tierra', 'pesajes de tierra') + ' con camiones fuera de la flota:</b> ' + Array.from(new Set(terceros.map(x => x.dominio))).join(', ') + '. Se importan como terceros; si son errores, corregilos en la balanza.</div></div>' : '') +
      '<div class="mt"><div id="impDias">' + tabla([[r => fMedia(r), 'Fecha'], [r => porDia[r].length, 'Camiones', 'n'], [r => nf(sum(porDia[r], x => x.neto), 1), 't', 'n'], [r => porDia[r].map(x => x.hora).sort().pop(), 'Último pesaje'], [r => '<span class="sub">…</span>', 'Ya en la base', 'n'], [r => '<span class="sub">…</span>', 'Nuevos', 'n']], Object.keys(porDia).sort()) + '</div>' +
      '<div>' + resumenPracticas(C) + '</div></div>' +
      (C.dudosos.length ? '<h3 class="mt2">Registros dudosos</h3><p class="sub">Marcá los que son tierra y querés importar. Por defecto se incluyen los que tienen todas las señales de tierra salvo el código de material.</p>' + tablaDudosos(C.dudosos, true) : '') +
      '<h3 class="mt2">Vista previa</h3>' + tabla([['ticket', 'Ticket'], [r => fCorta(r.fecha), 'Fecha'], ['hora', 'Entrada'], ['dominio', 'Dominio'], [r => nf(r.bruto, 2), 'Bruto t', 'n'], [r => nf(r.tara, 2), 'Tara t', 'n'], [r => nf(r.neto, 2), 'Neto t', 'n'], ['origen', 'Transportista'], [r => esc(r.nota || ''), 'Nota']], val.slice(0, 12)) +
      '<div class="row mt"><button class="btn pri" id="iImp"' + (val.length ? '' : ' disabled') + '>' + ICON.descargar + 'Importar ' + nf(val.length) + ' pesajes</button><span class="sub">También se guarda el archivo crudo para control (últimos 30 días).</span></div></div>';
    stagger($('#impC'));
    $$('[data-dud]').forEach(ch => { ch.onchange = () => { C.dudosos[Number(ch.dataset.dud)].incluir = ch.checked; pintar(); }; });
    $('#iImp').onclick = () => importarPesajesUI(val);
    if (fechas.length) api('pesajesClaves', { desde: fechas[0], hasta: fechas[fechas.length - 1] }).then(cl => {
      if (!$('#impDias')) return;
      const ya = new Set(cl);
      const nuevosTot = val.filter(x => !ya.has(clavePesaje(x))).length;
      $('#impDias').innerHTML = tabla([[r => fMedia(r), 'Fecha'], [r => porDia[r].length, 'Camiones', 'n'], [r => nf(sum(porDia[r], x => x.neto), 1), 't', 'n'], [r => porDia[r].map(x => x.hora).sort().pop(), 'Último pesaje'],
        [r => porDia[r].filter(x => ya.has(clavePesaje(x))).length, 'Ya en la base', 'n'], [r => { const n = porDia[r].filter(x => !ya.has(clavePesaje(x))).length; return n ? '<b class="verde">+' + n + '</b>' : '0'; }, 'Nuevos', 'n']], Object.keys(porDia).sort());
      $('#iImp').innerHTML = ICON.descargar + 'Importar ' + nf(val.length) + ' pesajes (' + nf(nuevosTot) + ' nuevos)';
    }).catch(e => console.warn(e));
  };
  pintar();
}

async function importarPesajesUI(val, opciones) {
  const o = opciones || {};
  const C = S.imp && S.imp.balanza;
  bloquear('Importando ' + val.length + ' pesajes…');
  try {
    const r = await escribir('importarPesajes', { filas: val, crudo: o.sinCrudo ? [] : (S.imp && S.imp.crudo) || [], archivo: (S.imp && S.imp.nombre) || '', dudosos: C ? C.dudosos.length : 0, abiertas: C ? C.abiertas.length + C.sinSalida.length : 0 }, 'Importación ' + ((S.imp && S.imp.nombre) || 'balanza'));
    if (o.alTerminar) { o.alTerminar(r); return; }
    if (!r.encolado) {
      avisarInforme(r);
      const fs = val.map(x => x.fecha).sort();
      $('#impC').innerHTML = '<div class="alert ok mt">' + ICON.ok + '<div><b>Importación completa.</b> ' + r.nuevos + ' nuevos · ' + (r.actualizados || 0) + ' corregidos · ' + (r.iguales || 0) + ' ya estaban iguales · ' + r.total + ' pesajes en la base.' + (r.corregidos ? ' ' + r.corregidos + ' pesaje(s) con corrección manual: se mantuvo la corrección.' : '') + (r.crudo ? ' Archivo crudo guardado: ' + r.crudo.filas + ' filas (' + r.crudo.nuevas + ' nuevas).' : '') + '</div></div>' +
        (r.porFecha ? tabla([[f => fMedia(f), 'Fecha'], [f => nf(val.filter(x => x.fecha === f).length), 'En el archivo', 'n'], [f => r.porFecha[f].nuevos, 'Nuevos', 'n'], [f => r.porFecha[f].actualizados, 'Corregidos', 'n'], [f => r.porFecha[f].iguales, 'Ya estaban', 'n'], [f => (r.enBase || {})[f] || 0, 'Total en la base', 'n']], Object.keys(r.porFecha).sort()) : '') +
        (C && (C.sinSalida.length || C.manuales.length || C.abiertas.length) ? '<div class="alert warn">' + ICON.alerta + '<div>En este archivo: ' + C.sinSalida.length + ' sin pesaje de salida, ' + C.abiertas.length + ' entradas abiertas y ' + C.manuales.length + ' cargas manuales de tierra. El detalle queda en Revisión → Balanza cruda y en el informe de balanza.</div></div>' : '') +
        '<div class="row"><a class="btn pri" href="#/revision">' + ICON.alerta + 'Revisar viajes ↔ balanza</a><a class="btn" href="#/revision/cruda">Balanza cruda</a>' + botonInforme('balanza', { desde: fs[0], hasta: fs[fs.length - 1] }, 'Informe de balanza') + '</div>';
      enlazarInformes($('#impC'));
    } else {
      $('#impC').innerHTML = '<div class="alert warn mt">' + ICON.alerta + '<div><b>La importación quedó en cola</b> porque no hubo conexión con el servidor. Se envía sola al volver la conexión (arriba, junto a «En línea», se ve la cola). Hasta entonces esos pesajes no están en la base.</div></div>';
    }
  } catch (e) {
    toast(e.message, 'bad', 8000);
  } finally {
    desbloquear();
  }
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
  $('#iImp').onclick = () => {
    lsSet('tierra_mapeo_pesaje', { map: S.imp.map, unidad: S.imp.unidad });
    importarPesajesUI(val);
  };
}

function resumenMolienda() {
  const h = ((S.resumen || {}).ultimo || {}).molienda || hoy();
  const b = calcBalance(addDias(h, -6), h);
  const it = (l, v, d, cls) => '<div class="' + (cls || '') + '"><div class="l">' + l + '</div><div class="v">' + v + '</div><div class="s">' + d + '</div></div>';
  return '<div class="card"><div class="card-h"><div class="t"><h3>Cómo está la tierra</h3><div class="sub">7 días al ' + fCorta(h) + '</div></div><a class="btn sm" href="#/cargar/ajustes">Ajustar stock</a></div><div class="ajuste-res" style="grid-template-columns:1fr 1fr">' +
    it('Playa', b.stockPlaya === null ? 'sin dato' : nf(b.stockPlaya, 0) + ' t', b.stockPlaya === null ? 'cargá un ajuste de stock' : '≈ ' + nf(b.stockPlaya / b.densidad, 0) + ' m³' + (b.diasPlaya !== null ? ' · ' + nf(b.diasPlaya, 1) + ' días' : ''), b.stockPlaya === null ? 'bad' : '') +
    it('Silo', b.stockSilo === null ? 'sin dato' : nf(b.stockSilo, 0) + ' t', b.stockSilo === null ? 'cargá un ajuste del silo' : '≈ ' + nf(b.stockSilo / b.densidad, 0) + ' m³') +
    it('Molido', nf(b.consumo, 0) + ' t', '≈ ' + nf(b.consumo / b.densidad, 0) + ' m³ · ' + nf(b.molPal) + ' paladas') +
    it('t por palada', nf(b.fMol, 2), nf(b.densidad, 2) + ' t/m³') + '</div></div>';
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
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos · Molienda</div><h1>Molienda y silo</h1><p class="sub">Los turnos llegan solos del Informe de Producción. Cargá acá solo si falta un turno o hay que corregirlo.</p></div></div>' + botonInforme('molienda', { fecha: f }, 'Informe del día') + '</div>' +
    '<div class="grid g-21"><div class="card"><div class="card-h"><div class="t"><h3>Cargar turno</h3></div></div><div class="form"><label class="f">Fecha<input type="date" id="mF" value="' + f + '"></label><label class="f">Turno<div id="mTseg"></div></label>' +
    '<label class="f">Paladas al cajón alimentador<input type="number" min="0" id="mP" inputmode="numeric"></label><label class="f">Toneladas balanza dinámica<input type="number" step="0.1" min="0" id="mTon" inputmode="decimal"></label>' +
    '<label class="f">Paladas extraídas de silo<input type="number" min="0" id="mS" inputmode="numeric"></label><label class="f">t por palada<input id="mFac" disabled></label>' +
    '<label class="f full">Observaciones<input id="mO"></label></div><div id="mAv" class="mt"></div><div class="row mt"><button class="btn pri" id="mG">' + ICON.guardar + 'Guardar turno</button></div></div>' +
    (rolN(S.ses.rol) === 'admin' ? '<div class="card"><div class="card-h"><div class="t"><h3>Vinculado al Informe de Producción</h3><div class="sub">Se lee en vivo de la hoja «' + esc(par('INFORME_HOJA', 'Molienda')) + '»</div></div></div>' +
    '<div class="col sub"><span><b>D</b> · paladas que ingresan a molienda</span><span><b>G</b> · paladas del silo a producción</span><span><b>J</b> · toneladas de balanza dinámica (molienda → silo)</span></div></div>' : resumenMolienda()) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Últimos 14 días</h3></div></div>' +
    tabla([[r => fMedia(r.fecha), 'Fecha'], ['turno', 'Turno'], [r => nf(val(r, 'pal')), 'Pal. cajón', 'n'], [r => nf(val(r, 't'), 1), 't bal. din.', 'n'],
      [r => { const p = val(r, 'pal'); const t = val(r, 't'); return p && t ? nf(t / p, 2) : '–'; }, 't/palada', 'n'], [r => nf(val(r, 'silo')), 'Pal. silo', 'n'],
      [r => (Object.keys(r.man).length ? '<span class="tag t-acc">Manual</span> ' : '') + (Object.keys(r.inf).length ? '<span class="tag t-info">Informe</span>' : ''), 'Fuente'],
      [r => '<button class="btn sm" data-me="' + r.fecha + '|' + r.turno + '">' + ICON.editar + '</button>' + (Object.keys(r.man).length ? ' <button class="btn sm dan" data-md="' + r.fecha + '|' + r.turno + '">' + ICON.borrar + '</button>' : ''), '']], lista) + '</div></div>';
  let turno = 'T2';
  segmento($('#mTseg'), [['T1', 'T1'], ['T2', 'T2'], ['T3', 'T3']], 'T2', k => { turno = k; }, true);
  enlazarInformes(app());
  const facs = R.molienda.filter(m => m.paladas > 0 && m.toneladas > 0).map(m => m.toneladas / m.paladas).sort((a, b) => a - b);
  const palT = R.molienda.filter(m => m.paladas > 0).map(m => m.paladas).sort((a, b) => a - b);
  const medF = facs.length ? facs[Math.floor(facs.length / 2)] : null;
  const medP = palT.length ? palT[Math.floor(palT.length / 2)] : null;
  const fac = () => {
    const p = num($('#mP').value);
    const t = num($('#mTon').value);
    const sl = num($('#mS').value);
    $('#mFac').value = p && t ? nf(t / p, 2) : '';
    const av = [];
    if (p && t && medF && Math.abs(t / p - medF) / medF > 0.25) av.push(['warn', nf(t / p, 2) + ' t/palada se aleja del habitual (' + nf(medF, 2) + '). Revisá paladas o balanza.']);
    if (p && medP && (p > medP * 1.8 || p < medP * 0.3)) av.push(['warn', nf(p) + ' paladas en un turno es muy distinto a lo habitual (' + nf(medP) + ').']);
    if (p && !t) av.push(['info', 'Sin toneladas de la balanza dinámica: se estimarán con ' + nf(medF || 0, 2) + ' t por palada.']);
    if (sl && medP && sl > medP * 2) av.push(['warn', nf(sl) + ' paladas de silo es mucho para un turno.']);
    $('#mAv').innerHTML = av.map(a => '<div class="chk-g ' + a[0] + '">' + (a[0] === 'info' ? ICON.infoI : ICON.alerta) + '<span>' + esc(a[1]) + '</span></div>').join('');
  };
  $('#mS').oninput = fac;
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
      avisarInforme(r);
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

const NIVELES_CAL = ['Nada', 'Poco', 'Moderado', 'Abundante'];
const HUMEDADES_CAL = ['Muy baja', 'Baja', 'Óptima', 'Alta', 'Muy alta'];
const CONTAMINANTES = [['caliza', 'Caliza (tosca)'], ['basura', 'Basura'], ['piedrasNivel', 'Piedras'], ['raicesNivel', 'Raíces'], ['tierraNegra', 'Tierra negra']];

function resumenCal(c) {
  if (!c) return '<span class="tag t-mut">sin cargar</span>';
  const cont = CONTAMINANTES.filter(k => c[k[0]] && c[k[0]] !== 'Nada').map(k => k[1].split(' ')[0].toLowerCase() + ' ' + String(c[k[0]]).toLowerCase());
  return '<span class="tag ' + (c.estado === 'Aceptado' ? 't-ok' : c.estado === 'Rechazado' ? 't-bad' : 't-warn') + '">' + esc(c.estado) + '</span>' + (c.humedad ? ' <span class="sub">hum. ' + esc(c.humedad.toLowerCase()) + '</span>' : '') + (cont.length ? ' <span class="sub">' + esc(cont.join(', ')) + '</span>' : '');
}

async function edCalidad(f, volver) {
  const rol = rolN(S.ses.rol);
  let persp = rol === 'molienda' ? 'Recibido' : 'Enviado';
  const st = S.calF || { desde: addDias(hoy(), -3), hasta: addDias(hoy(), -1), solo: true };
  S.calF = st;
  let acop = [];
  if (puede('acopios')) { try { acop = (await api('acopios')).acopios.filter(a => a.estado !== 'Agotado'); } catch (e) { acop = []; } }
  const v = { estado: 'Aceptado', humedad: 'Óptima', caliza: 'Nada', basura: 'Nada', piedrasNivel: 'Nada', raicesNivel: 'Nada', tierraNegra: 'Nada', arcilla: '', limo: '', arena: '', observaciones: '', acopio: '' };
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos</div><h1>Calidad de tierra</h1><p class="sub">Elegí uno o varios camiones de la balanza (Shift para un rango) y cargales la misma calidad. Abastecimiento indica lo <b>enviado</b>; molienda, lo <b>recibido</b>.</p></div></div>' +
    (rol === 'admin' ? '<div id="calP"></div>' : '<span class="tag t-acc">Calidad ' + (persp === 'Enviado' ? 'enviada' : 'recibida') + '</span>') + '</div>' +
    '<div class="grid g-21" style="align-items:start"><div class="card"><div class="bar"><label class="f">Desde<input type="date" id="qD" value="' + st.desde + '"></label><label class="f">Hasta<input type="date" id="qH" value="' + st.hasta + '"></label><label class="chk"><input type="checkbox" id="qSolo"' + (st.solo ? ' checked' : '') + '> Solo sin calidad</label><span class="right sub" id="qN"></span></div><div id="qTab"><div class="skel" style="height:220px"></div></div></div>' +
    '<div class="card cal-form" id="qForm"></div></div></div>';
  if ($('#calP')) segmento($('#calP'), [['Enviado', 'Enviado'], ['Recibido', 'Recibido']], persp, k => { persp = k; pintarTabla(); }, true);
  let filas = [];
  const selec = new Set();
  let ultimo = null;
  const visibles = () => filas.filter(x => !st.solo || !x[persp.toLowerCase()]);
  const pintarTabla = () => {
    const vis = visibles();
    $('#qN').textContent = selec.size ? selec.size + ' elegidos · ' + nf(sum(filas.filter(x => selec.has(x.clave)), x => x.neto)) + ' t' : vis.length + ' camiones';
    $('#qTab').innerHTML = vis.length ? '<div class="tw max" style="max-height:60vh"><table><thead><tr><th><input type="checkbox" id="qAll"></th><th>Fecha</th><th>Hora</th><th>Dominio</th><th>Chofer / origen</th><th class="n">t</th><th>Enviado</th><th>Recibido</th></tr></thead><tbody>' +
      vis.map(x => '<tr class="click ' + (selec.has(x.clave) ? 'sel' : '') + '" data-c="' + esc(x.clave) + '"><td><input type="checkbox"' + (selec.has(x.clave) ? ' checked' : '') + '></td><td>' + fCorta(x.fecha) + '</td><td>' + esc(x.hora) + '</td><td>' + esc(x.dominio) + '</td><td>' + esc(x.chofer) + '<div class="sub">' + esc(x.origen) + '</div></td><td class="n">' + nf(x.neto, 1) + '</td><td>' + resumenCal(x.enviado) + '</td><td>' + resumenCal(x.recibido) + '</td></tr>').join('') +
      '</tbody></table></div>' : vacio(filas.length ? 'Todos los camiones del período ya tienen calidad ' + (persp === 'Enviado' ? 'enviada' : 'recibida') + '.' : 'Sin pesajes de tierra en el período.');
    if ($('#qAll')) $('#qAll').onchange = e => { vis.forEach(x => { if (e.target.checked) selec.add(x.clave); else selec.delete(x.clave); }); pintarTabla(); };
  };
  const seg = (k, lista) => '<div class="niv" data-k="' + k + '">' + lista.map(o => '<button type="button" data-v="' + esc(o) + '" class="' + (v[k] === o ? 'on' : '') + '">' + esc(o) + '</button>').join('') + '</div>';
  const avisos = () => {
    const out = [];
    const a = num(v.arcilla);
    const l = num(v.limo);
    const r = num(v.arena);
    if (a !== null || l !== null || r !== null) { const t = (a || 0) + (l || 0) + (r || 0); if (Math.abs(t - 100) > 5) out.push(['bad', 'Arcilla + limo + arena suman ' + nf(t) + ' %: tiene que dar 100 %.']); }
    const malos = CONTAMINANTES.filter(k => v[k[0]] === 'Abundante').map(k => k[1].toLowerCase());
    if (malos.length && v.estado === 'Aceptado') out.push(['warn', 'Marcaste ' + malos.join(', ') + ' abundante y el estado es «Aceptado». ¿Es correcto?']);
    if ((v.humedad === 'Muy alta' || v.humedad === 'Muy baja') && v.estado === 'Aceptado') out.push(['warn', 'Humedad ' + v.humedad.toLowerCase() + ' con estado «Aceptado».']);
    if (v.estado === 'Rechazado' && !v.observaciones.trim()) out.push(['warn', 'Conviene anotar por qué se rechaza.']);
    const sel = filas.filter(x => selec.has(x.clave));
    const ya = sel.filter(x => x[persp.toLowerCase()]).length;
    if (ya) out.push(['info', ya + ' de los elegidos ya tienen calidad: se reemplaza.']);
    const origenes = Array.from(new Set(sel.map(x => x.origen).filter(Boolean)));
    if (origenes.length > 1) out.push(['info', 'Los camiones elegidos vienen de ' + origenes.length + ' orígenes distintos (' + origenes.join(', ') + ').']);
    return out;
  };
  const pintarForm = () => {
    $('#qForm').innerHTML = '<div class="card-h"><div class="t"><h3>Calidad a cargar</h3><div class="sub">' + (selec.size ? selec.size + ' camión(es) elegidos' : 'Elegí camiones en la lista') + '</div></div></div>' +
      '<label class="f">Estado</label>' + seg('estado', ['Aceptado', 'Observado', 'Rechazado']) +
      '<label class="f mt">Humedad</label>' + seg('humedad', HUMEDADES_CAL) +
      '<div class="mt">' + CONTAMINANTES.map(k => '<div class="cont"><span>' + k[1] + '</span>' + seg(k[0], NIVELES_CAL) + '</div>').join('') + '</div>' +
      '<div class="form mt" style="grid-template-columns:repeat(3,minmax(0,1fr))"><label class="f">% arcilla<input data-p="arcilla" type="number" min="0" max="100" value="' + esc(v.arcilla) + '"></label><label class="f">% limo<input data-p="limo" type="number" min="0" max="100" value="' + esc(v.limo) + '"></label><label class="f">% arena<input data-p="arena" type="number" min="0" max="100" value="' + esc(v.arena) + '"></label></div>' +
      (acop.length ? '<label class="f mt">Descargado en acopio (opcional)<select data-p="acopio">' + '<option value="">Sin cambiar</option>' + acop.map(a => '<option value="' + a.id + '"' + (v.acopio === a.id ? ' selected' : '') + '>' + esc(a.nombre) + '</option>').join('') + '</select></label>' : '') +
      '<label class="f mt">Observaciones<input data-p="observaciones" value="' + esc(v.observaciones) + '"></label><div id="qAv" class="mt"></div>' +
      '<button class="btn pri mt" id="qG"' + (selec.size ? '' : ' disabled') + '>' + ICON.guardar + 'Guardar calidad ' + (persp === 'Enviado' ? 'enviada' : 'recibida') + '</button>';
    pintarAvisos();
  };
  const pintarAvisos = () => { $('#qAv').innerHTML = avisos().map(a => '<div class="chk-g ' + a[0] + '">' + (a[0] === 'info' ? ICON.infoI : ICON.alerta) + '<span>' + esc(a[1]) + '</span></div>').join(''); };
  $('#qForm').addEventListener('click', e => {
    const b = e.target.closest('.niv button');
    if (b) { v[b.parentNode.dataset.k] = b.dataset.v; $$('button', b.parentNode).forEach(x => x.classList.toggle('on', x === b)); pintarAvisos(); return; }
    if (e.target.closest('#qG')) guardar();
  });
  $('#qForm').addEventListener('input', e => {
    const k = e.target.dataset.p;
    if (!k) return;
    v[k] = e.target.value;
    if (['arcilla', 'limo', 'arena'].indexOf(k) >= 0) {
      const vac = ['arcilla', 'limo', 'arena'].filter(x => x !== k && String(v[x]).trim() === '');
      const llenos = ['arcilla', 'limo', 'arena'].filter(x => String(v[x]).trim() !== '');
      if (vac.length === 1 && llenos.length === 2) { const t = 100 - sum(llenos, x => num(v[x]) || 0); if (t >= 0) { v[vac[0]] = t; $('[data-p="' + vac[0] + '"]').value = t; } }
    }
    pintarAvisos();
  });
  $('#qForm').addEventListener('change', e => { if (e.target.dataset.p === 'acopio') v.acopio = e.target.value; });
  $('#qTab').onclick = e => {
    const tr = e.target.closest('tr[data-c]');
    if (!tr) return;
    const vis = visibles().map(x => x.clave);
    const k = tr.dataset.c;
    if (e.shiftKey && ultimo !== null) { const a = vis.indexOf(ultimo); const b = vis.indexOf(k); vis.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => selec.add(x)); } else if (selec.has(k)) selec.delete(k); else selec.add(k);
    ultimo = k;
    if (selec.size === 1) { const x = filas.find(y => selec.has(y.clave)); const c = x && x[persp.toLowerCase()]; if (c) { Object.keys(v).forEach(kk => { if (c[kk] !== undefined && c[kk] !== null) v[kk] = c[kk]; }); } }
    pintarTabla();
    pintarForm();
  };
  const cargar = async () => {
    st.desde = $('#qD').value;
    st.hasta = $('#qH').value;
    try { filas = await api('calidadTickets', { desde: st.desde, hasta: st.hasta }); } catch (e) { $('#qTab').innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>' + esc(e.message) + '</div></div>'; return; }
    selec.clear();
    pintarTabla();
    pintarForm();
  };
  const guardar = async () => {
    const av = avisos();
    if (av.some(a => a[0] === 'bad')) return toast(av.find(a => a[0] === 'bad')[1], 'bad');
    if (av.some(a => a[0] === 'warn') && !(await confirmar('Revisar antes de guardar', av.filter(a => a[0] === 'warn').map(a => esc(a[1])).join('<br>'), 'Guardar igual'))) return;
    const origenes = {};
    const comps = {};
    filas.filter(x => selec.has(x.clave)).forEach(x => { origenes[x.clave] = x.origen; comps[x.clave] = x.comprobante; });
    bloquear('Guardando calidad…');
    try {
      const r = await api('guardarCalidadLote', Object.assign({}, v, { claves: Array.from(selec), perspectiva: persp, origenes: origenes, comprobantes: comps }));
      invalidar();
      toast(r.guardados + ' camión(es) con calidad cargada' + (r.acopio ? ' y asignados al acopio' : ''), 'ok');
      avisarInforme(r);
      await cargar();
    } catch (e) { toast(e.message, 'bad', 8000); } finally { desbloquear(); }
  };
  $('#qD').onchange = cargar;
  $('#qH').onchange = cargar;
  $('#qSolo').onchange = e => { st.solo = e.target.checked; pintarTabla(); };
  pintarForm();
  cargar();
}

function pintarCalidad(volver, reg) {
  const c = S.cal;
  const r = reg || {};
  const tol = num(par('TOLERANCIA_COMPOSICION', 5)) || 5;
  const colores = ['Rojiza', 'Marrón', 'Gris', 'Amarillenta', 'Negra', 'Mixta'];
  const defs = [['piedras', 'Piedras'], ['raices', 'Raíces / vegetal'], ['calcareo', 'Calcáreo / tosca'], ['humedadExcesiva', 'Humedad excesiva'], ['materialExtrano', 'Material extraño']];
  const vv = x => x === null || x === undefined ? '' : x;
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos</div><h1>' + (r.id ? 'Editar muestra' : 'Calidad de tierra') + '</h1><p class="sub">Inspección visual, ensayo de sedimentación y decisión sobre el viaje.</p></div></div>' + botonInforme('calidad', { fecha: c.fecha }, 'Informe del día') + '</div>' +
    '<div class="grid g-21"><div class="card"><div id="cErr"></div><div class="form"><label class="f">Fecha<input type="date" id="cF" value="' + c.fecha + '"></label><label class="f">Hora' + inputHora('id="cH"', r.hora || '') + '</label>' +
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
  enlazarInformes(app());
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
    avisarInforme(r);
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

const TIPO_AJUSTE_TXT = { 'Cubicación': 'Medición', 'Stock inicial': 'Stock inicial', 'Corrección': 'Corrección' };

function edAjustes(volver) {
  const lista = (S.resumen.ajustes || []).slice().sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  const pilas = lsGet('tierra_pilas', [{ nombre: 'Pila 1', forma: 'cono' }]);
  const bal = calcBalance(addDias(hoy(), -30), hoy());
  const densNodo = { Playa: bal.densidad, Silo: num(par('DENSIDAD_SILO', '')) || bal.densidad };
  const stk = (v, d) => v === null || v === undefined ? '<b>sin dato</b>' : '<b>' + nf(v, 0) + ' t</b> (≈ ' + nf(v / d, 0) + ' m³)';
  let nodo = 'Playa';
  let tipo = lista.some(a => a.nodo === 'Playa' && a.tipo !== 'Corrección') ? 'Cubicación' : 'Stock inicial';
  let unidad = lsGet('tierra_ajuste_unidad', 't');
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos · Molienda</div><h1>Ajuste de stock</h1><p class="sub">Calculado hoy: playa ' + stk(bal.stockPlaya, densNodo.Playa) + ' · silo ' + stk(bal.stockSilo, densNodo.Silo) + '</p></div></div>' +
    '<div class="row">' + botonInforme('cubicacion', { fecha: hoy() }, 'Informe') + '</div></div>' +
    '<div class="grid g-21" style="align-items:start"><div class="card"><div class="card-h"><div class="t"><h3>¿Cuánta tierra hay?</h3><div class="sub">Escribí lo que hay en toneladas o en metros cúbicos; la app hace la conversión.</div></div></div>' +
    '<div class="form"><label class="f">Fecha<input type="date" id="aF" value="' + hoy() + '"></label><label class="f">Lugar<div id="aNseg"></div></label>' +
    '<label class="f full">Qué cargás<div id="aTseg"></div></label>' +
    '<label class="f">Cantidad<div class="row" style="gap:8px;flex-wrap:nowrap"><input type="number" step="0.1" id="aV" inputmode="decimal" style="flex:1"><span class="unid-tog" id="aU"><button type="button" data-u="t">t</button><button type="button" data-u="m3">m³</button></span></div></label>' +
    '<label class="f">Motivo (obligatorio)<input id="aO" placeholder="Ej: medición mensual con odómetro"></label></div>' +
    '<div id="aRes"></div>' +
    '<div class="row mt"><button class="btn pri" id="aG">' + ICON.guardar + 'Guardar ajuste</button></div>' +
    '<details class="mt calc-pilas"><summary><b>¿No sabés los m³? Calculalos midiendo las pilas</b></summary><div class="mt"><div class="row"><button class="btn sm" id="cAdd">+ Agregar pila</button><button class="btn ghost sm" id="bGuiaCub">' + ICON.infoI + 'Cómo medir</button></div><div id="cPilas" class="mt"></div><div class="calc-res" id="cRes"></div></div></details></div>' +
    '<div class="col" style="gap:16px"><div id="aSol"></div><div class="card"><div class="card-h"><div class="t"><h3>Registrados</h3></div></div>' + tabla([[r => fCorta(r.fecha), 'Fecha'], ['nodo', 'Lugar'], [r => TIPO_AJUSTE_TXT[r.tipo] || r.tipo, 'Qué'], [r => nf(r.toneladas, 0), 't', 'n'], [r => nf(r.toneladas / (densNodo[r.nodo] || bal.densidad), 0), '≈ m³', 'n'], [r => esc(r.observaciones), 'Motivo', 'wrap'], [r => esAdmin() ? '<button class="btn icon sm dan" data-ax="' + r.id + '">' + ICON.borrar + '</button>' : '', '']], lista) + '</div></div></div></div>';
  misSolicitudes($('#aSol'), 'ajusteStock');
  $('#bGuiaCub').onclick = abrirAyuda;
  enlazarInformes(app());
  const toT = v => v === null ? null : unidad === 't' ? v : v * densNodo[nodo];
  const pintarU = () => $$('#aU button').forEach(b => b.classList.toggle('on', b.dataset.u === unidad));
  const resultado = () => {
    const f = $('#aF').value;
    const v = num($('#aV').value);
    const el = $('#aRes');
    if (!f || v === null) { el.innerHTML = '<p class="sub mt">Densidad usada: ' + nf(densNodo[nodo], 2) + ' t/m³ (t por palada ÷ ' + nf(bal.m3Palada) + ' m³ del balde).</p>'; return; }
    const t = toT(v);
    const m3 = t / densNodo[nodo];
    const b2 = calcBalance(addDias(f, -1), addDias(f, -1));
    const teo = nodo === 'Playa' ? b2.stockPlaya : b2.stockSilo;
    const tol = num(par('TOLERANCIA_INVENTARIO', 10)) || 10;
    let tarj3 = '';
    let nota = '';
    if (tipo === 'Corrección') {
      tarj3 = '<div><div class="l">Queda</div><div class="v">' + (teo === null ? '–' : nf(teo + t, 0) + ' t') + '</div><div class="s">' + (teo === null ? 'sin stock calculado' : '≈ ' + nf((teo + t) / densNodo[nodo], 0) + ' m³') + '</div></div>';
      nota = 'Suma (o resta, con negativo) a lo calculado.';
    } else if (teo === null) {
      tarj3 = '<div><div class="l">Calculado</div><div class="v">sin dato</div><div class="s">este ajuste fija el punto de partida</div></div>';
      nota = 'Desde esta fecha la app suma lo que entra y resta lo que se muele. Los días anteriores se reconstruyen hacia atrás.';
    } else {
      const dif = t - teo;
      const pct = teo ? dif / Math.abs(teo) * 100 : null;
      const fuera = pct !== null && Math.abs(pct) > tol;
      tarj3 = '<div class="' + (fuera ? 'bad' : '') + '"><div class="l">Diferencia con lo calculado</div><div class="v">' + (dif >= 0 ? '+' : '') + nf(dif, 0) + ' t</div><div class="s">calculado ' + nf(teo, 0) + ' t' + (pct !== null ? ' · ' + nf(pct, 1) + ' %' : '') + '</div></div>';
      nota = fuera ? (dif < 0 ? 'Hay menos tierra que lo calculado: puede que se muela más de lo que se registra o falten salidas.' : 'Hay más tierra que lo calculado: pueden faltar ingresos registrados o el t/palada de molienda está alto.') : 'Dentro de lo esperable (±' + tol + ' %).';
    }
    el.innerHTML = '<div class="ajuste-res"><div><div class="l">Toneladas</div><div class="v">' + nf(t, 0) + ' t</div><div class="s">' + (unidad === 'm3' ? 'convertido' : 'cargado') + '</div></div><div><div class="l">Metros cúbicos</div><div class="v">≈ ' + nf(m3, 0) + ' m³</div><div class="s">' + (unidad === 'm3' ? 'cargado' : 'convertido') + ' · ' + nf(densNodo[nodo], 2) + ' t/m³</div></div>' + tarj3 + '</div><p class="sub mt">' + nota + '</p>';
  };
  const tipos = () => segmento($('#aTseg'), [['Cubicación', 'Lo que hay ahora (medición)'], ['Stock inicial', 'Stock inicial'], ['Corrección', 'Sumar / restar']], tipo, k => { tipo = k; resultado(); }, true);
  segmento($('#aNseg'), [['Playa', 'Playa'], ['Silo', 'Silo']], 'Playa', k => { nodo = k; resultado(); }, true);
  tipos();
  pintarU();
  $('#aU').onclick = e => {
    const b = e.target.closest('[data-u]');
    if (!b || b.dataset.u === unidad) return;
    const v = num($('#aV').value);
    if (v !== null) $('#aV').value = Math.round((b.dataset.u === 'm3' ? v / densNodo[nodo] : v * densNodo[nodo]) * 10) / 10;
    unidad = b.dataset.u;
    lsSet('tierra_ajuste_unidad', unidad);
    pintarU();
    resultado();
  };
  ['#aF', '#aV'].forEach(q => { $(q).addEventListener('input', resultado); $(q).addEventListener('change', resultado); });
  resultado();
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
    $('#cRes').innerHTML = '<div><div class="eyebrow">Volumen total</div><b>' + nf(tot, 1) + ' m³</b></div><div><div class="eyebrow">≈ toneladas</div><b>' + nf(tot * densNodo[nodo], 0) + ' t</b></div>' +
      '<div class="sub">' + ok + ' de ' + pilas.length + ' pilas completas</div><button class="btn pri right" id="cUsar"' + (tot > 0 ? '' : ' disabled') + '>' + ICON.der + 'Usar estos m³</button>';
    $('#cUsar').onclick = () => {
      tipo = 'Cubicación';
      tipos();
      unidad = 'm3';
      pintarU();
      $('#aV').value = Math.round(tot * 10) / 10;
      $('#aO').value = 'Pilas: ' + pilas.filter(p => volumenPila(p)).map(p => p.nombre + ' ' + nf(volumenPila(p), 0) + ' m³').join(', ');
      $('#aV').scrollIntoView({ behavior: 'smooth', block: 'center' });
      $('#aV').classList.add('lleno');
      resultado();
    };
    lsSet('tierra_pilas', pilas);
  };
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
    const v = num($('#aV').value);
    if (!$('#aF').value || v === null) return toast('Fecha y cantidad requeridas', 'bad');
    const t = Math.round(toT(v) * 10) / 10;
    if (tipo !== 'Corrección' && t < 0) return toast('La cantidad no puede ser negativa', 'bad');
    if (!$('#aO').value.trim()) { $('#aO').classList.add('inv'); return toast('Escribí el motivo del ajuste', 'bad'); }
    const obs = [$('#aO').value.trim(), unidad === 'm3' ? nf(v, 0) + ' m³ × ' + nf(densNodo[nodo], 2) + ' t/m³' : ''].filter(Boolean).join(' · ');
    const d = { fecha: $('#aF').value, nodo: nodo, tipo: tipo, toneladas: t, observaciones: obs };
    try {
      const rA = await escribir('guardarAjuste', d, 'Ajuste ' + d.nodo + ' ' + d.fecha);
      avisarInforme(rA);
      await cargarResumen(true);
      toast(rA.pendiente ? rA.mensaje : 'Ajuste guardado', rA.pendiente ? 'info' : 'ok', 6000);
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

async function edGasoil(f, volver) {
  app().innerHTML = '<div class="vista"><div class="card"><div class="skel" style="height:260px"></div></div></div>';
  const ok = vivo();
  const g = await api('gasoil', { dias: 60 });
  if (!ok()) return;
  const cis = g.cisterna && !g.cisterna.error ? g.cisterna : null;
  const nomCis = par('CISTERNA_NOMBRE_CARGA', 'Cisterna Principal');
  const maqs = nombres('Maquinas');
  const cargasMaq = g.cargas.filter(c => !c.cisterna);
  const rg = rendimientoGasoil(cargasMaq);
  const ahora = new Date();
  const hAhora = pad(ahora.getHours()) + ':' + pad(ahora.getMinutes());
  const tolHor = num(par('TOLERANCIA_HOROMETRO_GASOIL', 3)) || 3;
  const maxL = num(par('MAX_LITROS_CARGA', 600)) || 600;
  let modo = 'maquina';
  const lhMap = {};
  rg.forEach(x => { lhMap[x.maquina + '|' + x.fecha + '|' + x.hora] = x; });
  app().innerHTML = '<div class="vista"><div class="hero"><div class="row">' + volver + '<div><div class="eyebrow">Carga de datos · Abastecimiento</div><h1>Gasoil de cantera</h1><p class="sub">Se graba en la planilla «Trabajo en Cantera».</p></div></div></div>' +
    (g.error ? '<div class="alert bad">' + ICON.alerta + '<div>' + esc(g.error) + '</div></div>' : '') +
    '<div class="row" style="justify-content:flex-end;margin-bottom:12px">' + botonInforme('gasoil', { fecha: f }, 'Informe del día') + '</div>' +
    '<div class="grid g-21"><div class="card"><div class="card-h"><div class="t"><h3>Registrar</h3></div><div id="gModo"></div></div><div id="gForm"></div><div id="gChk" class="mt"></div>' +
    '<div class="row mt"><button class="btn pri" id="gG">' + ICON.guardar + 'Guardar</button></div></div>' +
    (cis ? gaugeCisterna(cis) : '<div class="card">' + vacio('No se pudo leer la cisterna.') + '</div>') + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Últimos 60 días</h3><div class="sub">L/h = litros ÷ horas desde la carga anterior de la misma máquina</div></div></div><div id="gTab"></div></div></div>';
  requestAnimationFrame(() => $$('.gauge .arco').forEach(a => { a.style.strokeDashoffset = a.dataset.off; }));
  const pintarTabla = () => {
    $('#gTab').innerHTML = tabla([[x => fMedia(x.fecha), 'Fecha'], ['hora', 'Hora'], [x => x.cisterna ? '<span class="tag t-info">Llenado cisterna</span>' : esc(x.maquina), 'Máquina'], [x => nf(x.litros, 0), 'Litros', 'n'],
      [x => x.cisterna ? '' : nf(x.horometro, 0), 'Horómetro', 'n'],
      [x => { const r = lhMap[x.maquina + '|' + x.fecha + '|' + x.hora]; if (!r || x.cisterna) return ''; const mal = r.horas <= 0 || (r.mediana && r.lh > r.mediana * 1.5); return '<span class="tag ' + (mal ? 't-bad' : 't-mut') + '">' + (r.horas <= 0 ? 'horóm. no avanzó' : nf(r.lh, 1)) + '</span>'; }, 'L/h', 'n'],
      [x => x.app ? '<button class="btn icon sm dan" data-gx="' + x.id + '" aria-label="Borrar">' + ICON.borrar + '</button>' : '<span class="sub">planilla</span>', '']], g.cargas.slice().reverse(), { max: true, vacio: 'Sin cargas en los últimos 60 días.' });
  };
  const ultimaDe = mq => cargasMaq.filter(c => c.maquina === mq && c.horometro).slice(-1)[0] || null;
  const nivelEn = (fe, h) => {
    if (!cis) return null;
    const mov = g.cargas.filter(c => (c.fecha + ' ' + c.hora) > (fe + ' ' + h) && (!cis.fechaBase || c.fecha >= cis.fechaBase)).reduce((s2, c) => s2 + (c.cisterna ? c.litros : -c.litros), 0);
    return cis.nivel - mov;
  };
  const chequear = () => {
    const el = $('#gChk');
    const fe = $('#gF').value;
    const h = parseHora($('#gH').value) || '';
    const lit = num(($('#gL') || {}).value);
    const avisos = [];
    if (modo === 'maquina') {
      const mq = $('#gM').value;
      const hor = num($('#gHor').value);
      const ult = mq ? ultimaDe(mq) : null;
      const jor = (g.horometros[mq] || {})[fe];
      $('#gPista').innerHTML = mq ? [ult ? 'Última carga: ' + nf(ult.horometro, 0) + ' h el ' + fCorta(ult.fecha) : '', jor ? 'Jornada ' + fCorta(fe) + ': inicial ' + nf(jor, 1) + ' h' : '', (g.horometros[mq] || {}).ultimo ? 'Último horómetro de jornada: ' + nf(g.horometros[mq].ultimo, 1) + ' h' : ''].filter(Boolean).join(' · ') : '';
      if (lit && lit > maxL) avisos.push(['bad', 'Más de ' + maxL + ' L en una carga: revisá el valor.']);
      if (ult && hor !== null) {
        const hs = hor - ult.horometro;
        if (hs < 0) avisos.push(['bad', 'El horómetro es menor que el de la carga anterior (' + nf(ult.horometro, 0) + ').']);
        else if (hs === 0) avisos.push(['warn', 'El horómetro no avanzó desde la carga anterior.']);
        else if (lit) {
          const lh = lit / hs;
          const med = medianaDe(rg.filter(x => x.maquina === mq && x.lh !== null && x.horas >= 2).map(x => x.lh));
          avisos.push([med && lh > med * 1.5 ? 'warn' : 'ok', nf(lit, 0) + ' L en ' + nf(hs, 1) + ' h = <b>' + nf(lh, 1) + ' L/h</b>' + (med ? ' (habitual ' + nf(med, 1) + ' L/h)' : '')]);
        }
      }
      if (jor && hor !== null && Math.abs(hor - jor) > tolHor) avisos.push(['warn', 'Difiere ' + nf(hor - jor, 1) + ' h del horómetro inicial de la jornada de ese día.']);
    } else if (modo === 'cisterna') {
      if (cis && cis.capacidad && lit) {
        const niv = nivelEn(fe, h || '23:59');
        if (niv !== null && niv + lit > cis.capacidad * 1.05) avisos.push(['warn', 'Con este llenado la cisterna quedaría en ' + nf(niv + lit, 0) + ' L, más que su capacidad (' + nf(cis.capacidad, 0) + ' L).']);
        else if (niv !== null) avisos.push(['ok', 'Quedaría en ≈ ' + nf(niv + lit, 0) + ' L.']);
      }
    } else if (cis && h) {
      const niv = nivelEn(fe, h);
      const med = num($('#gMed').value);
      if (med !== null && niv !== null) {
        const dif = med - niv;
        const cap = cis.capacidad || 5000;
        avisos.push([Math.abs(dif) > cap * 0.05 ? 'bad' : Math.abs(dif) > cap * 0.02 ? 'warn' : 'ok', 'Calculado a esa hora: ' + nf(niv, 0) + ' L · diferencia <b>' + (dif >= 0 ? '+' : '') + nf(dif, 0) + ' L</b>' + (Math.abs(dif) > cap * 0.02 ? (dif < 0 ? '. Falta gasoil: puede haber cargas sin registrar o pérdidas.' : '. Sobra gasoil: puede faltar registrar un consumo o el llenado fue menor.') : '')]);
      }
    }
    el.innerHTML = avisos.map(a => '<div class="chk-g ' + a[0] + '">' + (a[0] === 'ok' ? ICON.ok : ICON.alerta) + '<span>' + a[1] + '</span></div>').join('');
  };
  const pintarForm = () => {
    const real = lsGet('tierra_gasoil_real', true) && f === hoy();
    const ah = new Date();
    const base = '<label class="chk full"><span class="switch"><input type="checkbox" id="gReal"' + (real ? ' checked' : '') + '><span></span></span>Operación en tiempo real (fecha y hora de ahora)</label>' +
      '<label class="f' + (real ? ' hide' : '') + '" id="gFw">Fecha<input type="date" id="gF" value="' + (real ? hoy() : f) + '"></label><label class="f' + (real ? ' hide' : '') + '" id="gHw">Hora' + inputHora('id="gH"', pad(ah.getHours()) + ':' + pad(ah.getMinutes())) + '</label>';
    const motivo = '<label class="f full">Motivo del ajuste (obligatorio)<input id="gO" placeholder="Ej: medición con varilla después del llenado"></label>';
    if (modo === 'maquina') {
      $('#gForm').innerHTML = '<div class="form">' + base + '<label class="f">Máquina<select id="gM">' + opts(maqs.concat(['+ Otra máquina…']), lsGet('tierra_gasoil_maq', ''), 'Elegir…') + '</select></label>' +
        '<label class="f hide" id="gNw">Nombre de la máquina nueva<input id="gN" placeholder="Ej: Camión Scania R450"></label>' +
        '<label class="f">Litros<input id="gL" type="number" min="0" step="1" inputmode="decimal"></label><label class="f">Horómetro<input id="gHor" type="number" min="0" step="0.1" inputmode="decimal"></label><div class="f full sub" id="gPista"></div></div>';
    } else if (modo === 'cisterna') {
      $('#gForm').innerHTML = '<div class="form">' + base + '<label class="f">Litros recibidos<input id="gL" type="number" min="0" step="1" inputmode="decimal"></label><label class="f full">Se registra como «' + esc(nomCis) + '» en la planilla de combustible.</label></div>';
    } else if (modo === 'nivel') {
      $('#gForm').innerHTML = '<div class="form">' + base + '<label class="f">Litros totales que hay en la cisterna<input id="gMed" type="number" min="0" step="1" inputmode="decimal"' + (cis ? ' placeholder="calculado ' + nf(cis.nivel, 0) + ' L"' : '') + '></label>' + motivo +
        '<p class="f full sub">Fija el nivel total (incluidos los ' + nf(muertoCis(cis), 0) + ' L de stock muerto) a esa hora; desde ahí se suman llenados y se restan cargas. No cuenta como diferencia.' + (esAdmin() ? '' : ' <b>Lo autoriza el administrador.</b>') + '</p></div><div id="gSol"></div>';
    } else {
      $('#gForm').innerHTML = '<div class="form">' + base + '<label class="f">Litros medidos (varilla)<input id="gMed" type="number" min="0" step="1" inputmode="decimal"></label><label class="f full">Observaciones<input id="gO" placeholder="Ej: medición con varilla, tabla de conversión"></label>' +
        '<p class="f full sub">La medición se compara con el nivel calculado. Para fijar el nivel usá «Ajustar nivel».</p></div>';
    }
    $('#gReal').onchange = e => { lsSet('tierra_gasoil_real', e.target.checked); $('#gFw').classList.toggle('hide', e.target.checked); $('#gHw').classList.toggle('hide', e.target.checked); if (e.target.checked) { const a2 = new Date(); $('#gF').value = hoy(); $('#gH').value = pad(a2.getHours()) + ':' + pad(a2.getMinutes()); } };
    if ($('#gM')) $('#gM').addEventListener('change', e => { $('#gNw').classList.toggle('hide', e.target.value !== '+ Otra máquina…'); if (e.target.value === '+ Otra máquina…') $('#gN').focus(); });
    if ($('#gSol')) misSolicitudes($('#gSol'), 'ajusteCisterna');
    $('#gForm').oninput = chequear;
    $('#gForm').onchange = chequear;
    chequear();
    const pr = $('#gForm input:not([type=date]):not(#gH), #gForm select');
    if (pr) pr.focus();
  };
  const nivelMal = cis && (cis.nivel < 0 || (cis.capacidad && cis.nivel > cis.capacidad * 1.05));
  if (nivelMal) modo = 'nivel';
  segmento($('#gModo'), [['maquina', 'Carga a máquina'], ['cisterna', 'Llenado cisterna'], ['medicion', 'Medición'], ['nivel', 'Ajustar nivel']], modo, k => { modo = k; pintarForm(); }, true);
  if (nivelMal) $('#gChk').insertAdjacentHTML('beforebegin', '<div class="alert warn mt">' + ICON.alerta + '<div>El nivel calculado de la cisterna (' + nf(cis.nivel, 0) + ' L) no es posible' + (cis.capacidad ? ' para ' + nf(cis.capacidad, 0) + ' L de capacidad' : '') + '. Cargá cuánto hay ahora' + (esAdmin() ? '.' : ' y el administrador lo autoriza.') + '</div></div>');
  enlazarInformes(app());
  pintarForm();
  pintarTabla();
  $('#gG').onclick = async () => {
    if ($('#gReal') && $('#gReal').checked) { const a3 = new Date(); $('#gF').value = hoy(); $('#gH').value = pad(a3.getHours()) + ':' + pad(a3.getMinutes()); }
    const fe = $('#gF').value;
    const h = parseHora($('#gH').value);
    if (!fe || !h) return toast('Fecha y hora requeridas', 'bad');
    let accion;
    let d;
    if (modo === 'nivel') {
      accion = 'ajustarCisterna';
      d = { fecha: fe, hora: h, litros: $('#gMed').value, motivo: $('#gO').value.trim() };
      if (d.litros === '') return toast('Cargá los litros que hay en la cisterna', 'bad');
      if (!d.motivo) { $('#gO').classList.add('inv'); return toast('Escribí el motivo del ajuste', 'bad'); }
    } else if (modo === 'medicion') {
      accion = 'medirCisterna';
      d = { fecha: fe, hora: h, litros: $('#gMed').value, observaciones: $('#gO').value, actualizarBase: false };
      if (d.litros === '') return toast('Litros medidos requeridos', 'bad');
    } else {
      accion = 'guardarGasoil';
      const nueva = modo === 'maquina' && $('#gM').value === '+ Otra máquina…';
      d = { fecha: fe, hora: h, maquina: modo === 'cisterna' ? nomCis : nueva ? $('#gN').value.trim() : $('#gM').value, nueva: nueva, litros: $('#gL').value, horometro: modo === 'maquina' ? $('#gHor').value : '' };
      if (!d.maquina || !d.litros) return toast('Completá máquina y litros', 'bad');
      if (modo === 'maquina' && !d.horometro) return toast('Falta el horómetro', 'bad');
      if ($('#gChk .bad')) {
        if (!(await confirmar('Revisar antes de guardar', $('#gChk').innerText, 'Guardar igual'))) return;
        d.forzar = true;
      }
      if (modo === 'maquina') lsSet('tierra_gasoil_maq', d.maquina);
    }
    try {
      bloquear('Guardando en la planilla de cantera…');
      const r = await escribir(accion, d, (modo === 'medicion' || modo === 'nivel' ? 'Cisterna ' : 'Gasoil ') + (d.maquina || '') + ' ' + fe);
      avisarInforme(r);
      desbloquear();
      if (!r.encolado) toast(r.pendiente ? r.mensaje : modo === 'nivel' ? 'Nivel de la cisterna fijado en ' + nf(r.litrosMedidos, 0) + ' L' : modo === 'medicion' ? 'Medición guardada · diferencia ' + nf(r.diferencia, 0) + ' L' : 'Carga guardada', 'ok');
      S.resumenVencido = true;
      edGasoil(fe, volver);
    } catch (e) {
      desbloquear();
      toast(e.message, 'bad', 8000);
    }
  };
  app().onclick = async e => {
    const b = e.target.closest('button[data-gx]');
    if (!b || !(await confirmar('Borrar carga', 'Se borra la fila de la planilla de cantera. ¿Continuar?', 'Borrar', true))) return;
    try {
      await escribir('eliminarGasoil', { id: b.dataset.gx }, 'Borrar carga de gasoil');
      edGasoil(f, volver);
    } catch (er) {
      toast(er.message, 'bad');
    }
  };
}
