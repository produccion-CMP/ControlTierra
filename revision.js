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
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Solo editores</div><h1>Revisión de datos</h1><p class="sub">Comparación de los talonarios de viajes con la balanza: qué coincide, qué falta en cada lado y opciones para corregirlo.</p></div><div id="segRev"></div></div>' +
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
  const sugDe = {};
  sug.forEach(s => { sugDe[claveViaje(s.v)] = s.ops; });
  const sugerido = {};
  sug.forEach(s => s.ops.forEach(o => { const k = clavePesaje(o.q); (sugerido[k] = sugerido[k] || []).push(s.v); }));
  const manuales = R.asociaciones || [];
  const pes = {};
  C.pes.forEach(q => { pes[clavePesaje(q)] = q; });
  const via = {};
  C.viajes.forEach(v => { via[claveViaje(v)] = v; });
  const atip = new Set(C.atipicos.map(clavePesaje));
  const vent = num(par('VENTANA_MATCH_MIN', 120)) || 120;
  const hV = v => v.horaDescarga || v.horaCarga || '';
  const filas = [];
  const add = (f, h, o) => filas.push(Object.assign({ fecha: f, h: minDe(h) === null ? 9999 : minDe(h) }, o));
  C.pares.forEach(p => {
    const difs = [];
    if (normDom(p.v.dominio) !== normDom(p.p.dominio)) difs.push('patente distinta');
    if (p.dt !== null && p.dt !== undefined && p.dt > 60) difs.push(nf(p.dt, 0) + ' min entre descarga y pesaje');
    if (atip.has(clavePesaje(p.p))) difs.push('neto fuera de lo normal del camión');
    add(p.v.fecha, hV(p.v), { tipo: difs.length ? 'dif' : 'ok', v: p.v, p: p.p, como: p.manual ? 'manual' : p.porTicket ? 'ticket' : 'auto', dt: p.dt, difs: difs, a: p.manual });
  });
  const tomado = new Set();
  C.sinTicket.forEach(v => {
    const ops = sugDe[claveViaje(v)] || [];
    const top = ops.find(o => !tomado.has(clavePesaje(o.q)));
    if (top) { tomado.add(clavePesaje(top.q)); add(v.fecha, hV(v), { tipo: 'sug', v: v, o: top, otras: ops.filter(o => o !== top) }); }
    else add(v.fecha, hV(v), { tipo: 'v', v: v, ops: ops });
  });
  C.sinTicketFuera.forEach(v => add(v.fecha, hV(v), { tipo: 'vf', v: v }));
  C.sinViaje.filter(q => !tomado.has(clavePesaje(q))).forEach(q => add(q.fecha, q.hora, { tipo: 'p', p: q, sug: sugerido[clavePesaje(q)] || [] }));
  C.ignoradosV.forEach(x => add(x.v.fecha, hV(x.v), { tipo: 'vi', v: x.v, a: x.a }));
  C.ignoradosP.forEach(x => add(x.p.fecha, x.p.hora, { tipo: 'pi', p: x.p, a: x.a }));
  const n = t => filas.filter(f => t.indexOf(f.tipo) >= 0).length;
  const porTk = C.pares.filter(p => p.porTicket).length;
  const porMan = C.pares.filter(p => p.manual).length;
  const porAuto = C.pares.length - porTk - porMan;
  const F = S.revFiltro || 'problemas';
  const FIL = { problemas: ['sug', 'v', 'p', 'dif'], todos: ['ok', 'dif', 'sug', 'v', 'vf', 'p', 'vi', 'pi'], ok: ['ok', 'dif'], v: ['sug', 'v', 'vf'], p: ['sug', 'p'], dif: ['dif'], ign: ['vi', 'pi'] };
  const ver = filas.filter(f => FIL[F].indexOf(f.tipo) >= 0);
  const dias = agrupar(ver, f => f.fecha);
  const tot = Math.max(1, C.viajes.length + C.pes.length - C.pares.length);
  const seg = (k, val, cls, t) => val ? '<div class="vb ' + cls + '" style="flex:' + val + '" title="' + t + '"><b>' + nf(val) + '</b><span>' + t + '</span></div>' : '';
  const vCel = v => '<div class="rc v"><span class="src">📒 Talonario ' + esc(v.comprobante) + (v.nroViaje ? ' · viaje ' + v.nroViaje : '') + '</span><b>' + esc(v.horaCarga || '–') + ' → ' + esc(v.horaDescarga || '–') + '</b> <span class="dom">' + (v.dominio ? esc(normDom(v.dominio)) : '<span class="tag t-bad">sin patente</span>') + '</span><div class="sub">' + esc(v.chofer) + ' · ' + esc(v.origen) + (v.ticketSalida ? ' · 🎫 ' + esc(v.ticketSalida) : '') + '</div></div>';
  const pCel = q => '<div class="rc p"><span class="src">⚖️ Ticket ' + esc(q.ticket || '–') + '</span><b>' + esc(q.hora) + '</b> <span class="dom">' + esc(normDom(q.dominio)) + '</span><div class="sub">' + nf(q.neto, 2) + ' t netas' + (q.manual ? ' · carga manual' : '') + (q.sinSalida ? ' · sin pesaje de salida' : '') + '</div></div>';
  const vacioCel = (lado, txt) => '<div class="rc nada ' + lado + '">' + txt + '</div>';
  const lazo = (cls, ic, t, d) => '<div class="lazo ' + cls + '"><span class="ic">' + ic + '</span><b>' + t + '</b>' + (d ? '<small>' + d + '</small>' : '') + '</div>';
  const fila = f => {
    let h = '';
    if (f.tipo === 'ok' || f.tipo === 'dif') {
      const ic = f.como === 'ticket' ? '🎫' : f.como === 'manual' ? '✋' : '🔗';
      const t = f.como === 'ticket' ? 'por N° de ticket' : f.como === 'manual' ? 'asociado a mano' : 'misma patente';
      h = vCel(f.v) + lazo(f.tipo, ic, t, (f.dt !== null && f.dt !== undefined ? 'Δ ' + nf(f.dt, 0) + ' min' : '') + (f.difs.length ? '<span class="difs">⚠ ' + f.difs.map(esc).join(' · ') + '</span>' : '')) + pCel(f.p);
    } else if (f.tipo === 'sug') {
      h = vCel(f.v) + '<div class="lazo sug"><span class="ic">🤔</span><b>¿es este pesaje?</b><small>' + esc(f.o.motivo) + '</small><button class="btn sm pri" data-par="' + esc(claveViaje(f.v)) + '" data-pes="' + esc(clavePesaje(f.o.q)) + '" data-f="' + f.v.fecha + '">Asociar</button>' +
        (f.otras.length ? '<small>otras: ' + f.otras.map(o => '<button class="lnk" data-par="' + esc(claveViaje(f.v)) + '" data-pes="' + esc(clavePesaje(o.q)) + '" data-f="' + f.v.fecha + '">ticket ' + esc(o.q.ticket || '–') + ' ' + esc(o.q.hora) + '</button>').join(' · ') + '</small>' : '') +
        '<span class="row" style="gap:4px;justify-content:center"><button class="lnk" data-sp="' + esc(claveViaje(f.v)) + '" data-f="' + f.v.fecha + '">no pasó por balanza</button> · <a class="lnk" href="#/cargar/viajes/' + f.v.fecha + '">corregir viaje</a></span></div>' + pCel(f.o.q);
    } else if (f.tipo === 'v') {
      h = vCel(f.v) + lazo('falta', '❓', 'sin pesaje', 'viaje → balanza: no se encontró') + '<div class="rc ops">' + (f.ops.length ? f.ops.map(o => '<div class="op"><div><span class="src">⚖️ ¿Ticket ' + esc(o.q.ticket || '–') + '?</span> <b>' + esc(o.q.hora) + '</b> ' + esc(normDom(o.q.dominio)) + ' · ' + nf(o.q.neto, 1) + ' t<div class="sub">' + esc(o.motivo) + '</div></div><button class="btn sm pri" data-par="' + esc(claveViaje(f.v)) + '" data-pes="' + esc(clavePesaje(o.q)) + '" data-f="' + f.v.fecha + '">Asociar</button></div>').join('') : '<div class="sub">Sin pesajes parecidos.</div>') +
        '<div class="row" style="gap:6px"><button class="btn sm" data-sp="' + esc(claveViaje(f.v)) + '" data-f="' + f.v.fecha + '">No pasó por la balanza</button><a class="btn sm ghost" href="#/cargar/viajes/' + f.v.fecha + '">Corregir el viaje</a></div></div>';
    } else if (f.tipo === 'vf') {
      h = vCel(f.v) + lazo('info', '⏳', 'balanza pendiente', 'después del último pesaje importado') + vacioCel('p', '<a href="#/cargar/pesaje">Importar PESAJE.XLS</a>');
    } else if (f.tipo === 'p') {
      h = '<div class="rc ops">' + (f.sug.length ? '<div class="sub">Sugerido para ' + f.sug.map(v => 'el viaje de las ' + esc(hV(v)) + ' (' + esc(normDom(v.dominio) || 'sin patente') + ')').join(' o ') + ' ↑</div>' : '<div class="sub">Ningún viaje parecido en los talonarios.</div>') +
        '<div class="row" style="gap:6px"><a class="btn sm ghost" href="#/cargar/viajes/' + f.p.fecha + '">Cargar el viaje</a><button class="btn sm" data-sv="' + esc(clavePesaje(f.p)) + '" data-f="' + f.p.fecha + '">No corresponde a un viaje</button></div></div>' +
        lazo('falta', '❓', 'sin viaje', 'balanza → talonarios: no se encontró') + pCel(f.p);
    } else if (f.tipo === 'vi') {
      h = vCel(f.v) + lazo('ign', '🚫', 'no pasó por balanza', esc(f.a.nota || '') + ' · ' + esc(f.a.usuario || '')) + vacioCel('p', '—');
    } else {
      h = vacioCel('v', '—') + lazo('ign', '🚫', 'no es un viaje', esc(f.a.nota || '') + ' · ' + esc(f.a.usuario || '')) + pCel(f.p);
    }
    return '<div class="rfila ' + f.tipo + '">' + h + '</div>';
  };
  const resDia = l => {
    const k = t => l.filter(f => t.indexOf(f.tipo) >= 0).length;
    return [['ok', '✓', k(['ok'])], ['dif', '⚠', k(['dif'])], ['sug', '🤔', k(['sug'])], ['falta', '❓', k(['v', 'p'])], ['info', '⏳', k(['vf'])]].filter(x => x[2]).map(x => '<span class="mini ' + x[0] + '">' + x[1] + ' ' + x[2] + '</span>').join('');
  };
  c.innerHTML =
    '<div class="card rev-intro"><div class="card-h"><div class="t"><h3>¿Cómo se cruzan los datos?</h3><div class="sub">Cada viaje de los talonarios tiene que tener su pesaje en la balanza, y cada pesaje de tierra su viaje.</div></div></div>' +
    '<div class="rev-bases"><div class="base v"><span class="e">📒</span><b>Talonarios de viajes</b><small>hoja «Carga de viajes» · destino planta</small><strong>' + nf(C.viajes.length) + '</strong><span>viajes</span></div>' +
    '<div class="pasos"><div><span>1</span>🎫 <b>N° de ticket de salida</b> anotado en el remito <em>' + nf(porTk) + '</em></div><div><span>2</span>🔗 <b>Misma patente</b> y pesaje a ±' + vent + ' min de la descarga <em>' + nf(porAuto) + '</em></div><div><span>3</span>✋ <b>Asociado a mano</b> en esta pantalla <em>' + nf(porMan) + '</em></div></div>' +
    '<div class="base p"><span class="e">⚖️</span><b>Balanza de ingreso</b><small>PESAJE.XLS importado · solo tierra</small><strong>' + nf(C.pes.length) + '</strong><span>pesajes</span></div></div>' +
    '<div class="venn">' + seg('v', C.sinTicket.length + C.sinTicketFuera.length, 'v', 'solo en talonarios') + seg('ok', C.pares.length, 'ok', 'coinciden') + seg('p', C.sinViaje.length, 'p', 'solo en balanza') + '</div>' +
    (C.sinTicketFuera.length ? '<div class="sub mt">⏳ ' + nf(C.sinTicketFuera.length) + ' viajes son posteriores al último pesaje importado: falta importar la balanza.</div>' : '') + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Registro por registro</h3><div class="sub">Izquierda: el viaje del talonario. Derecha: el pesaje de la balanza. En el medio, cómo se unieron (🎫 ticket, 🔗 patente y hora, ✋ a mano), una posible coincidencia para confirmar (🤔) o qué falta (❓).</div></div></div>' +
    '<div class="chips" id="revFil">' + [['problemas', 'A revisar', n(['sug', 'v', 'p', 'dif'])], ['dif', '⚠ Con diferencias', n(['dif'])], ['v', '📒 Solo en talonarios', n(['sug', 'v', 'vf'])], ['p', '⚖️ Solo en balanza', n(['sug', 'p'])], ['ok', '✓ Coincidencias', n(['ok', 'dif'])], ['ign', '🚫 Descartados', n(['vi', 'pi'])], ['todos', 'Todos', filas.length]].map(x => '<button class="chip ' + (F === x[0] ? 'on' : '') + '" data-fil="' + x[0] + '">' + x[1] + ' <b>' + x[2] + '</b></button>').join('') + '</div>' +
    '<div class="rhead"><span>📒 Talonario (viaje)</span><span>Vínculo</span><span>⚖️ Balanza (pesaje)</span></div>' +
    (ver.length ? Object.keys(dias).sort().reverse().map(d => { const l = dias[d].sort((a, b) => a.h - b.h); return '<details class="rdia" ' + (F !== 'todos' && F !== 'ok' || Object.keys(dias).length <= 3 ? 'open' : '') + '><summary><b>' + fLarga(d) + '</b>' + resDia(l) + '</summary>' + l.map(fila).join('') + '</details>'; }).join('') : vacio(F === 'problemas' ? 'Nada para revisar en el período.' : 'Sin registros en este filtro.')) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Decisiones tomadas</h3><div class="sub">Asociaciones y marcas hechas a mano; se pueden deshacer</div></div></div>' +
    (manuales.length ? tabla([[a => a.tipo === 'par' ? '<span class="tag t-ok">✋ Asociado</span>' : a.tipo === 'sinPesaje' ? '<span class="tag t-mut">🚫 Viaje sin pesaje</span>' : '<span class="tag t-mut">🚫 Ticket sin viaje</span>', 'Decisión'],
      [a => a.claveViaje ? '📒 ' + (via[a.claveViaje] ? fCorta(via[a.claveViaje].fecha) + ' ' + esc(via[a.claveViaje].horaCarga) + ' ' + esc(via[a.claveViaje].dominio) : esc(a.claveViaje.split('|').slice(0, 3).join(' '))) : '', 'Viaje'],
      [a => a.clavePesaje ? '⚖️ ' + (pes[a.clavePesaje] ? 'Ticket ' + esc(pes[a.clavePesaje].ticket) + ' · ' + esc(pes[a.clavePesaje].hora) + ' · ' + esc(pes[a.clavePesaje].dominio) : esc(a.clavePesaje)) : '', 'Pesaje'], ['nota', 'Nota'], ['usuario', 'Usuario'],
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
    if (b.dataset.fil) { S.revFiltro = b.dataset.fil; pintarCruce(c, R, st); return; }
    if (b.dataset.par) return hacer({ tipo: 'par', claveViaje: b.dataset.par, clavePesaje: b.dataset.pes, fecha: b.dataset.f }, 'Viaje asociado al pesaje');
    if (b.dataset.sp) { const n2 = await nota('Viaje sin pesaje'); if (n2 !== null) hacer({ tipo: 'sinPesaje', claveViaje: b.dataset.sp, fecha: b.dataset.f, nota: n2 }, 'Marcado: no pasó por la balanza'); return; }
    if (b.dataset.sv) { const n2 = await nota('Ticket sin viaje'); if (n2 !== null) hacer({ tipo: 'sinViaje', clavePesaje: b.dataset.sv, fecha: b.dataset.f, nota: n2 }, 'Marcado: no corresponde a un viaje'); return; }
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
