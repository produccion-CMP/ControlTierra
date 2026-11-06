'use strict';

function levDom(a, b) {
  const x = normDom(a);
  const y = normDom(b);
  if (!x || !y) return 99;
  const d = Array.from({ length: x.length + 1 }, (_, i) => [i].concat(Array(y.length).fill(0)));
  for (let j = 1; j <= y.length; j++) d[0][j] = j;
  for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
  return d[x.length][y.length];
}

function minAbs(f, h) {
  const p = String(f).split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2]) / 60000 + (minDe(h) || 0);
}

function sugerenciasCruce(C) {
  const vent = num(par('VENTANA_MATCH_MIN', 120)) || 120;
  return C.sinTicket.map(v => {
    let t = minAbs(v.fecha, v.horaDescarga || v.horaCarga);
    if (v.horaDescarga && minDe(v.horaDescarga) < minDe(v.horaCarga)) t += 1440;
    const ops = C.sinViaje.map(q => {
      const dt = Math.round(Math.abs(minAbs(q.fecha, q.hora) - t));
      const dist = levDom(v.dominio, q.dominio);
      let score = 0;
      let motivo = '';
      if (dist === 0 && dt <= 480) { score = 100 - dt / 8; motivo = 'Mismo camión, ' + dt + ' min de diferencia (fuera de la ventana de ' + vent + ' min)'; }
      else if (dist <= 2 && normDom(v.dominio).length >= 5 && dt <= vent * 1.5) { score = 75 - dt / 4; motivo = 'Patente parecida (' + normDom(v.dominio) + ' en el talonario, ' + normDom(q.dominio) + ' en la balanza), ' + dt + ' min'; }
      else if (!normDom(v.dominio) && dt <= vent) { score = 60 - dt / 3; motivo = 'El viaje no tiene patente; pesaje a ' + dt + ' min'; }
      else if (dt <= 25 && v.fecha === q.fecha) { score = 35 - dt; motivo = 'Mismo horario (' + dt + ' min) con otra patente'; }
      return { q: q, dt: dt, score: score, motivo: motivo };
    }).filter(o => o.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    return { v: v, ops: ops };
  });
}

async function vRevision(tab) {
  if (!S.ses) { location.hash = '#/inicio'; return; }
  const ok = vivo();
  const st = S.revF || { desde: addDias(hoy(), -14), hasta: addDias(hoy(), -1) };
  S.revF = st;
  const t = ['controles', 'cruda'].indexOf(tab) >= 0 ? tab : 'cruce';
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Solo editores</div><h1>Revisión de datos</h1><p class="sub">Inconsistencias con opciones para corregirlas: asociar viajes con pesajes, marcar lo que no corresponde e ir a la carga para corregir.</p></div><div id="segRev"></div></div>' +
    '<div class="card"><div class="bar"><label class="f">Desde<input type="date" id="rD" value="' + st.desde + '"></label><label class="f">Hasta<input type="date" id="rH" value="' + st.hasta + '"></label><button class="btn" id="rAp">Aplicar</button></div></div><div id="revC" class="mt"><div class="card"><div class="skel" style="height:300px"></div></div></div></div>';
  segmento($('#segRev'), [['cruce', 'Viajes ↔ balanza'], ['cruda', 'Balanza cruda'], ['controles', 'Todos los controles']], t, k => { location.hash = '#/revision/' + k; }, true);
  $('#rAp').onclick = () => { st.desde = $('#rD').value; st.hasta = $('#rH').value; vRevision(t); };
  await cargarResumen();
  if (t === 'cruda') return pintarCruda($('#revC'), st);
  let R;
  try { R = await api('rango', { desde: st.desde, hasta: st.hasta }); } catch (e) { $('#revC').innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>' + esc(e.message) + '</div></div>'; return; }
  if (!ok()) return;
  S.rango = R;
  S.desde = st.desde;
  S.hasta = st.hasta;
  if (t === 'controles') { S.ultControles = controles(R, calcBalance(st.desde, st.hasta)); tabControles($('#revC')); stagger($('#revC')); contar($('#revC')); return; }
  pintarCruce($('#revC'), R, st);
}

function pintarCruce(c, R, st) {
  const C = conciliar(R);
  const sug = sugerenciasCruce(C);
  const usados = new Set();
  sug.forEach(s => s.ops.forEach(o => usados.add(clavePesaje(o.q))));
  const sueltos = C.sinViaje.filter(q => !usados.has(clavePesaje(q)));
  const fueraDia = agrupar(C.sinTicketFuera, v => v.fecha);
  const manuales = (R.asociaciones || []);
  const pes = {};
  C.pes.forEach(q => { pes[clavePesaje(q)] = q; });
  const via = {};
  C.viajes.forEach(v => { via[claveViaje(v)] = v; });
  const vTxt = v => '<b>' + fCorta(v.fecha) + ' ' + esc(v.horaCarga || '') + ' → ' + esc(v.horaDescarga || '') + '</b> · ' + (v.dominio ? esc(v.dominio) : '<span class="tag t-bad">sin patente</span>') + ' · ' + esc(v.chofer) + '<div class="sub">Talonario ' + esc(v.comprobante) + ' · ' + esc(v.origen) + ' → ' + esc(v.destino) + '</div>';
  const qTxt = q => '<b>Ticket ' + esc(q.ticket || '–') + '</b> · ' + fCorta(q.fecha) + ' ' + esc(q.hora) + ' · ' + esc(q.dominio) + ' · ' + nf(q.neto, 2) + ' t';
  c.innerHTML = '<div class="kpis stagger">' +
    kpi('Viajes con ticket', vn(C.pares.length), 'de ' + nf(C.viajes.length) + ' a planta · ' + C.pares.filter(p => p.manual).length + ' asociados a mano', 'ok') +
    kpi('Viajes sin ticket', vn(C.sinTicket.length), sug.filter(s => s.ops.length).length + ' con sugerencia', C.sinTicket.length ? 'warn' : 'ok') +
    kpi('Tickets sin viaje', vn(C.sinViaje.length), nf(sum(C.sinViaje, q => q.neto), 1) + ' t', C.sinViaje.length ? 'warn' : 'ok') +
    kpi('Después del último pesaje', vn(C.sinTicketFuera.length), 'falta importar la balanza', C.sinTicketFuera.length ? 'info' : 'ok') + '</div>' +
    (C.sinTicketFuera.length ? '<div class="alert info">' + ICON.infoI + '<div><b>La balanza importada no cubre todos los viajes.</b> ' + Object.keys(fueraDia).sort().map(f => fCorta(f) + ': ' + fueraDia[f].length + ' viajes después de las ' + hDe(C.ultPes[f] || 0)).join(' · ') + '. <a href="#/cargar/pesaje">Importá el PESAJE.XLS actualizado</a>.</div></div>' : '') +
    '<div class="card"><div class="card-h"><div class="t"><h3>Viajes sin ticket</h3><div class="sub">Elegí el pesaje que corresponde o marcá que no pasó por la balanza</div></div></div>' +
    (sug.length ? sug.map(s => '<div class="rev-it"><div class="rev-v">' + vTxt(s.v) + '</div><div class="rev-ops">' +
      (s.ops.length ? s.ops.map(o => '<div class="rev-op"><div>' + qTxt(o.q) + '<div class="sub">' + esc(o.motivo) + '</div></div><button class="btn sm pri" data-par="' + esc(claveViaje(s.v)) + '" data-pes="' + esc(clavePesaje(o.q)) + '" data-f="' + s.v.fecha + '">Asociar</button></div>').join('') : '<div class="sub">Sin pesajes parecidos en el período.</div>') +
      '<div class="row" style="gap:6px"><button class="btn sm" data-sp="' + esc(claveViaje(s.v)) + '" data-f="' + s.v.fecha + '">No pasó por la balanza</button><a class="btn sm ghost" href="#/cargar/viajes/' + s.v.fecha + '">Corregir el viaje</a></div></div></div>').join('') : vacio('Todos los viajes tienen ticket.')) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Tickets sin viaje y sin sugerencia</h3><div class="sub">Pesajes de tierra que no se pueden asociar a ningún talonario</div></div></div>' +
    (sueltos.length ? tabla([[q => esc(q.ticket), 'Ticket'], [q => fCorta(q.fecha), 'Fecha'], ['hora', 'Hora'], ['dominio', 'Dominio'], [q => nf(q.neto, 2), 'Neto t', 'n'], ['origen', 'Transportista'],
      [q => '<a class="btn sm ghost" href="#/cargar/viajes/' + q.fecha + '">Cargar viaje</a> <button class="btn sm" data-sv="' + esc(clavePesaje(q)) + '" data-f="' + q.fecha + '">No corresponde a un viaje</button>', '']], sueltos) : vacio('Sin tickets sueltos.')) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Decisiones tomadas</h3><div class="sub">Asociaciones y marcas hechas a mano; se pueden deshacer</div></div></div>' +
    (manuales.length ? tabla([[a => a.tipo === 'par' ? '<span class="tag t-ok">Asociado</span>' : a.tipo === 'sinPesaje' ? '<span class="tag t-mut">Viaje sin pesaje</span>' : '<span class="tag t-mut">Ticket sin viaje</span>', 'Decisión'],
      [a => via[a.claveViaje] ? fCorta(via[a.claveViaje].fecha) + ' ' + esc(via[a.claveViaje].horaCarga) + ' ' + esc(via[a.claveViaje].dominio) : esc(a.claveViaje.split('|').slice(0, 3).join(' ')), 'Viaje'],
      [a => pes[a.clavePesaje] ? 'Ticket ' + esc(pes[a.clavePesaje].ticket) + ' · ' + esc(pes[a.clavePesaje].hora) + ' · ' + esc(pes[a.clavePesaje].dominio) : esc(a.clavePesaje), 'Pesaje'], ['nota', 'Nota'], ['usuario', 'Usuario'],
      [a => '<button class="btn sm dan" data-des="' + a.id + '">Deshacer</button>', '']], manuales) : vacio('Todavía no hay decisiones manuales.')) + '</div>';
  stagger(c);
  contar(c);
  const hacer = async (d, txt) => {
    bloquear('Guardando…');
    try { await api(d.id ? 'desasociar' : 'asociar', d); invalidar(); toast(txt, 'ok'); vRevision('cruce'); } catch (e) { toast(e.message, 'bad', 7000); } finally { desbloquear(); }
  };
  const nota = titulo => new Promise(r => { modal(titulo, '<label class="f">Motivo (opcional)<input id="nN" placeholder="Ej: excavación sin pasar por balanza"></label>', [{ txt: 'Cancelar', fn: () => { r(null); } }, { txt: 'Confirmar', cls: 'pri', fn: mm => { r($('#nN', mm).value); return true; } }]); });
  c.onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.par) return hacer({ tipo: 'par', claveViaje: b.dataset.par, clavePesaje: b.dataset.pes, fecha: b.dataset.f }, 'Viaje asociado al pesaje');
    if (b.dataset.sp) { const n = await nota('Viaje sin pesaje'); if (n !== null) hacer({ tipo: 'sinPesaje', claveViaje: b.dataset.sp, fecha: b.dataset.f, nota: n }, 'Marcado: no pasó por la balanza'); return; }
    if (b.dataset.sv) { const n = await nota('Ticket sin viaje'); if (n !== null) hacer({ tipo: 'sinViaje', clavePesaje: b.dataset.sv, fecha: b.dataset.f, nota: n }, 'Marcado: no corresponde a un viaje'); return; }
    if (b.dataset.des) hacer({ id: b.dataset.des }, 'Decisión deshecha');
  };
}


async function pintarCruda(c, st) {
  let crudo;
  let claves;
  let imps;
  const ctx = await contextoBalanza();
  try {
    [crudo, claves, imps] = await Promise.all([api('balanzaCruda', { desde: st.desde, hasta: st.hasta }), api('pesajesClaves', { desde: st.desde, hasta: st.hasta }), api('importaciones')]);
  } catch (e) { c.innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>' + esc(e.message) + '</div></div>'; return; }
  const C = clasificarBalanza(crudo, Object.assign({}, ctx, { codTierra: par('BALANZA_COD_TIERRA', ctx.codTierra || '002'), maxMinSalida: num(par('BALANZA_MAX_MIN_SALIDA', ctx.maxMinSalida || 120)) }));
  const ya = new Set(claves);
  const faltan = C.tierra.map(x => Object.assign(x, { incluir: true, motivo: x.nota || 'Pesaje de tierra completo' })).concat(C.dudosos).filter(x => !ya.has(clavePesaje(x)));
  const filtro = { q: '', mat: String(par('BALANZA_COD_TIERRA', ctx.codTierra || '002')).split(',')[0].trim() };
  const pintarTabla = () => {
    const q = normTxt(filtro.q);
    const l = crudo.filter(r => (!filtro.mat || String(r.cod_mat) === filtro.mat) && (!q || normTxt(BALANZA_COLUMNAS.map(k => r[k]).join(' ')).indexOf(q) >= 0));
    $('#crTab').innerHTML = '<div class="tw max" style="max-height:60vh"><table><thead><tr><th>Archivo</th>' + BALANZA_COLUMNAS.map(k => '<th>' + k + '</th>').join('') + '</tr></thead><tbody>' +
      l.slice(0, 800).map(r => '<tr><td class="sub">' + esc(r._archivo || '') + '</td>' + BALANZA_COLUMNAS.map(k => '<td>' + esc(r[k]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div><div class="sub mt">' + nf(l.length) + ' filas' + (l.length > 800 ? ' (se muestran 800; descargá el CSV para ver todas)' : '') + '</div>';
  };
  c.innerHTML = '<div class="kpis stagger">' + kpi('Filas crudas guardadas', vn(crudo.length), 'del período, como vienen en el archivo') + kpi('Pesajes de tierra no tomados', vn(faltan.length), 'están en el archivo y no en la base', faltan.length ? 'bad' : 'ok') +
    kpi('Dudosos', vn(C.dudosos.length), 'material o sentido contradictorio', C.dudosos.length ? 'warn' : 'ok') + kpi('Sin pesaje de salida', vn(C.sinSalida.length + C.abiertas.length), C.manuales.length + ' cargas manuales · ' + C.manuales.concat(C.sinSalida).filter(x => !x.observ).length + ' sin justificar', C.sinSalida.length + C.abiertas.length ? 'bad' : 'ok') + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>No tomados en la base</h3><div class="sub">Control automático: pesajes completos del archivo crudo que no están entre los pesajes procesados</div></div>' + (faltan.length ? '<button class="btn pri" id="crImp">' + ICON.descargar + 'Importar los marcados</button>' : '') + '</div>' + tablaDudosos(faltan, true) + '</div>' +
    '<div class="card">' + resumenPracticas(C) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Archivo crudo</h3><div class="sub">Control manual: todas las filas tal como vienen del PESAJE.XLS</div></div><div class="row"><input id="crQ" placeholder="Buscar patente, ticket…" style="width:200px"><select id="crM"><option value="">Todos los materiales</option>' + Array.from(new Set(crudo.map(r => String(r.cod_mat)))).sort().map(m => '<option' + (m === filtro.mat ? ' selected' : '') + '>' + esc(m) + '</option>').join('') + '</select><button class="btn sm" id="crCsv">' + ICON.descargar + 'CSV</button></div></div><div id="crTab"></div></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Últimas importaciones</h3></div></div>' + tabla([[r => esc(String(r.ts).slice(0, 16).replace('T', ' ')), 'Cuándo'], ['archivo', 'Archivo'], ['usuario', 'Usuario'], [r => nf(r.filas), 'Filas', 'n'], [r => nf(r.tierra), 'Tierra', 'n'], [r => nf(r.nuevos), 'Nuevos', 'n'], [r => nf(r.dudosos), 'Dudosos', 'n'], [r => nf(r.abiertas), 'Sin salida', 'n'], [r => r.desde ? fCorta(r.desde) + ' – ' + fCorta(r.hasta) : '', 'Fechas']], imps, { vacio: 'Sin importaciones registradas todavía.' }) + '</div>';
  stagger(c);
  contar(c);
  pintarTabla();
  $('#crQ').oninput = e => { filtro.q = e.target.value; pintarTabla(); };
  $('#crM').onchange = e => { filtro.mat = e.target.value; pintarTabla(); };
  $('#crCsv').onclick = () => {
    const filas = [['archivo'].concat(BALANZA_COLUMNAS)].concat(crudo.map(r => [r._archivo || ''].concat(BALANZA_COLUMNAS.map(k => r[k]))));
    const csv = filas.map(f => f.map(v => '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'balanza_cruda_' + st.desde + '_' + st.hasta + '.csv';
    a.click();
  };
  $$('[data-dud]', c).forEach(ch => { ch.onchange = () => { faltan[Number(ch.dataset.dud)].incluir = ch.checked; }; });
  if ($('#crImp')) $('#crImp').onclick = () => {
    const sel = faltan.filter(x => x.incluir);
    if (!sel.length) return toast('Marcá al menos un pesaje', 'warn');
    S.imp = { nombre: 'recuperados de la balanza cruda', balanza: C };
    importarPesajesUI(sel, { sinCrudo: true, alTerminar: r => { invalidar(); toast(r.encolado ? 'Quedó en cola' : r.nuevos + ' pesajes recuperados', 'ok'); vRevision('cruda'); } });
  };
}
