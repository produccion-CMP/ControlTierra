'use strict';

const COLOR_ESTADO_ACOPIO = { Cargando: '#2a78d6', 'En consumo': '#1f8a4c', Agotado: '#9ca3af', '': '#d96b3a' };
const COLORES_SECTOR = ['#d96b3a', '#2a78d6', '#1f8a4c', '#b56a00', '#7c3aed', '#c0261d', '#0e7490', '#a16207', '#be185d', '#4d7c0f'];

const CELDA_PLAYA = {};
PLANO_PLAYA.celdas.forEach(c => { CELDA_PLAYA[c[0]] = { x: c[1], y: c[2], w: PLANO_PLAYA.c, h: PLANO_PLAYA.c }; });
const celdaXY = c => CELDA_PLAYA[c];
const nomCelda = c => String(c).replace('-', '');
const celdasDe = s => String(s.celdas || '').split(';').filter(c => CELDA_PLAYA[c]);
const celdasViejas = s => String(s.celdas || '').split(';').filter(c => c && !CELDA_PLAYA[c]);
const fotoPlano = () => { try { return localStorage.getItem('planoFoto') === '1'; } catch (e) { return false; } };

function acopioDeSector(E, sid) {
  return E.acopios.filter(a => a.sector === sid).sort((a, b) => (a.estado === 'Agotado') - (b.estado === 'Agotado') || (String(b.ts) > String(a.ts) ? 1 : -1))[0] || null;
}

function acopioActivo(E, sid) {
  return E.acopios.find(a => a.sector === sid && a.estado !== 'Agotado') || null;
}

function bordeCeldas(cs) {
  const set = new Set(cs);
  const C = PLANO_PLAYA.c;
  let d = '';
  cs.forEach(k => {
    const q = celdaXY(k);
    const f = k.split('-')[0];
    const n = Number(k.split('-')[1]);
    const vec = (df, dn) => String.fromCharCode(f.charCodeAt(0) + df) + '-' + (n + dn);
    if (!set.has(vec(-1, 0))) d += 'M' + q.x + ' ' + q.y + 'h' + C;
    if (!set.has(vec(1, 0))) d += 'M' + q.x + ' ' + (q.y + C) + 'h' + C;
    if (!set.has(vec(0, -1))) d += 'M' + q.x + ' ' + q.y + 'v' + C;
    if (!set.has(vec(0, 1))) d += 'M' + (q.x + C) + ' ' + q.y + 'v' + C;
  });
  return d;
}

function planoSVG(E, op) {
  const o = op || {};
  const P = PLANO_PLAYA;
  const C = P.c;
  const centro = cs => { const p = cs.map(celdaXY); return { x: sum(p, q => q.x + C / 2) / p.length, y: sum(p, q => q.y + C / 2) / p.length }; };
  const vb = (o.editor ? P.vbEd : P.vb).join(' ');
  const foto = fotoPlano();
  let h = '<svg class="plano ' + (o.editor ? 'ed' : '') + (foto ? ' foto' : '') + '" viewBox="' + vb + '" role="img" aria-label="Plano de la playa de molienda">' +
    (foto ? '<image href="' + P.img + '" x="0" y="0" width="' + P.vb[2] + '" height="' + P.vb[3] + '" opacity=".55"/>' : '') + P.base;
  const color = (s, i) => s.color || COLORES_SECTOR[i % COLORES_SECTOR.length];
  const dueño = {};
  E.sectores.forEach((s, i) => celdasDe(s).forEach(c => { dueño[c] = i; }));
  if (o.editor) {
    h += P.celdas.map(c => { const k = c[0]; const i = dueño[k]; const s = i === undefined ? null : E.sectores[i]; return '<rect class="cel ed ' + (s && i === o.sel ? 'sel' : '') + '" data-cel="' + k + '" x="' + c[1] + '" y="' + c[2] + '" width="' + C + '" height="' + C + '" style="fill:' + (s ? color(s, i) : 'transparent') + ';fill-opacity:' + (s ? (i === o.sel ? 0.75 : 0.45) : 0) + '"><title>' + nomCelda(k) + (s ? ' · ' + esc(s.nombre) : '') + '</title></rect>'; }).join('');
    h += E.sectores.map((s, i) => { const cs = celdasDe(s); return cs.length ? '<path class="borde" d="' + bordeCeldas(cs) + '" style="stroke:' + color(s, i) + '"/>' : ''; }).join('');
    h += E.sectores.map(s => { const cs = celdasDe(s); if (!cs.length) return ''; const p = centro(cs); return '<text class="lbl" x="' + p.x + '" y="' + (p.y + 4) + '" text-anchor="middle">' + esc(s.nombre) + '</text>'; }).join('');
    return h + '</svg>';
  }
  h += '<g class="grilla">' + P.celdas.map(c => dueño[c[0]] === undefined ? '<rect x="' + c[1] + '" y="' + c[2] + '" width="' + C + '" height="' + C + '"/>' : '').join('') + '</g>';
  E.sectores.forEach((s, i) => {
    const cs = celdasDe(s);
    if (!cs.length) return;
    const a = acopioActivo(E, s.id);
    const col = a ? COLOR_ESTADO_ACOPIO[a.estado] || COLOR_ESTADO_ACOPIO[''] : '#cbd5e1';
    h += '<g class="sec ' + (o.sel === s.id ? 'sel' : '') + '" data-sec="' + s.id + '">' + cs.map(c => { const q = celdaXY(c); return '<rect x="' + q.x + '" y="' + q.y + '" width="' + (C + 0.4) + '" height="' + (C + 0.4) + '" style="fill:' + col + '"/>'; }).join('');
    h += '<path class="borde" d="' + bordeCeldas(cs) + '" style="stroke:' + color(s, i) + '"/>';
    const p = centro(cs);
    h += '<text class="lbl" x="' + p.x + '" y="' + (p.y - 1) + '" text-anchor="middle">' + esc(s.nombre) + '</text><text class="lbl2" x="' + p.x + '" y="' + (p.y + 11) + '" text-anchor="middle">' + (a ? nf(a.stock) + ' t' : 'libre') + '</text>';
    if (a && a.calidadGral) { const q0 = cs.map(celdaXY).sort((u, w) => u.y - w.y || u.x - w.x)[0]; h += '<circle class="calp" cx="' + (q0.x + 6) + '" cy="' + (q0.y + 6) + '" r="4.2" style="fill:' + (CAL_GRAL_COLOR[a.calidadGral] || '#64748b') + '"><title>Calidad ' + esc(a.calidadGral) + '</title></circle>'; }
    h += '<title>' + esc(s.nombre) + ' (' + cs.map(nomCelda).join(', ') + ')' + (a ? ' · ' + esc(a.nombre) + ' · ' + nf(a.stock) + ' t · ' + a.estado : ' · sin acopio') + '</title></g>';
  });
  return h + '</svg>';
}

function avisoViejos(E) {
  const v = E.sectores.filter(s => celdasViejas(s).length);
  return v.length ? '<div class="alert warn">' + ICON.alerta + '<div>El plano cambió: ' + v.map(s => '«' + esc(s.nombre) + '»').join(', ') + ' ' + (v.length > 1 ? 'tienen' : 'tiene') + ' celdas del plano anterior. ' + (puede('acopiosConsumo') ? '<a href="#/acopios/sectores">Redibujalos</a> en el plano nuevo.' : 'El responsable de molienda o el administrador tiene que redibujarlos.') + '</div></div>' : '';
}

function botonFoto() {
  return '<label class="chk sm" title="Muestra la foto satelital debajo del dibujo"><input type="checkbox" class="tgFoto"' + (fotoPlano() ? ' checked' : '') + '> Foto</label>';
}

function enlazarFoto(c, repintar) {
  $$('.tgFoto', c).forEach(x => { x.onchange = () => { try { localStorage.setItem('planoFoto', x.checked ? '1' : '0'); } catch (e) { } repintar(); }; });
}

function calidadTxt(a) {
  const comp = ['arcilla', 'limo', 'arena'].map(k => a[k] !== null && a[k] !== '' && a[k] !== undefined ? nf(a[k]) : null);
  const mu = ['muestraArcilla', 'muestraLimo', 'muestraArena'].map(k => a[k] !== null && a[k] !== undefined ? nf(a[k]) : null);
  const partes = [];
  if (a.calidad) partes.push(esc(a.calidad));
  if (comp.some(x => x !== null)) partes.push('Arc/Lim/Are ' + comp.map(x => x === null ? '–' : x).join('/') + ' %');
  else if (mu.some(x => x !== null)) partes.push('Muestras ' + mu.map(x => x === null ? '–' : x).join('/') + ' %');
  if (a.humedad) partes.push('humedad ' + esc(a.humedad.toLowerCase()));
  const ct = contaminantesDe(a);
  if (Object.keys(ct).length) partes.push(Object.keys(ct).map(k => esc(k.toLowerCase()) + ' ' + esc(ct[k].toLowerCase())).join(', '));
  return partes.join(' · ');
}

const CAL_GRAL_COLOR = { 'Muy buena': '#15803d', Buena: '#2a78d6', Regular: '#b45309', Mala: '#b91c1c' };

function chipCalidad(a) {
  if (!a || !a.calidadGral) return '';
  return '<span class="tag cal-gral" style="--c:' + (CAL_GRAL_COLOR[a.calidadGral] || '#64748b') + '" title="' + esc(a.calidadNota || '') + (a.calidadFecha ? ' · ' + fCorta(a.calidadFecha) : '') + '">● ' + esc(a.calidadGral) + '</span>';
}

function colorAcopio(E, a) {
  const i = E.sectores.findIndex(s => s.id === a.sector);
  const s = E.sectores[i];
  return (s && s.color) || COLORES_SECTOR[Math.max(0, i) % COLORES_SECTOR.length];
}

function ecuacionReparto(E, dn) {
  const vivos = E.acopios.filter(a => a.estado !== 'Agotado' && a.stock > 0.5).sort((a, b) => b.stock - a.stock);
  const tot = Math.max(1, E.stockPlaya || 0, E.totalAcopios);
  const su = E.sinUbicar;
  const R = E.reparto;
  const seg = vivos.map(a => '<span style="flex:' + a.stock + ';background:' + colorAcopio(E, a) + '" title="' + esc(a.nombre) + ': ' + nf(a.stock) + ' t"><b>' + (a.stock / tot > 0.08 ? esc(a.nombre.split(' · ')[0]) : '') + '</b></span>').join('') +
    (su !== null && su > 0.5 ? '<span class="su" style="flex:' + su + '" title="Sin ubicar: ' + nf(su) + ' t"><b>' + (su / tot > 0.08 ? 'sin ubicar' : '') + '</b></span>' : '');
  const it = (e, t, v, d, cls) => '<div class="rep-it ' + (cls || '') + '"><span class="e">' + e + '</span><small>' + t + '</small><b>' + v + '</b><span class="d">' + d + '</span></div>';
  let h = '<div class="card rep-ec"><div class="rep-fila">' +
    it('🏔️', 'Stock de la playa', E.stockPlaya === null ? 'sin dato' : vn(E.stockPlaya) + '<small>t</small>', 'según el balance · ≈ ' + nf((E.stockPlaya || 0) / dn) + ' m³', 'st') + '<div class="op">=</div>' +
    it('🗂️', 'En acopios', vn(E.totalAcopios) + '<small>t</small>', vivos.length + ' acopios con tierra', 'ac') + '<div class="op">+</div>' +
    it(su !== null && su < -1 ? '⚠️' : '❓', 'Sin ubicar', su === null ? '–' : vn(su) + '<small>t</small>', su === null ? 'falta el stock de la playa' : su < -1 ? 'se repartió de más' : 'todavía no está en ningún acopio', su !== null && su < -1 ? 'bad' : 'su') + '</div>' +
    '<div class="rep-barra">' + seg + '</div>';
  if (R) {
    const otros = su === null ? null : su - (R.fotoSinRepartir + (R.ingreso - R.ingresoAsignado) - (R.consumo - R.consumoAsignado));
    const ln = (e, t, v, d) => '<div class="rep-ln"><span>' + e + '</span><div>' + t + '<small>' + d + '</small></div><b class="' + (v >= 0 ? 'mas' : 'menos') + '">' + (v >= 0 ? '+' : '−') + nf(Math.abs(v)) + ' t</b></div>';
    h += '<details class="rep-det"><summary>¿De dónde sale lo «sin ubicar»?</summary>' +
      ln('📷', 'Foto del ajuste del ' + fCorta(E.corte.fecha) + ' sin repartir', R.fotoSinRepartir, nf(E.corte.toneladas) + ' t medidas − ' + nf(R.fotoUbicada) + ' t repartidas') +
      ln('🚛', 'Camiones que llegaron y no tienen acopio', R.ingreso - R.ingresoAsignado, nf(R.ingreso) + ' t ingresadas − ' + nf(R.ingresoAsignado) + ' t asignadas') +
      ln('⚙️', 'Molienda sin acopio indicado', -(R.consumo - R.consumoAsignado), nf(R.consumo) + ' t molidas − ' + nf(R.consumoAsignado) + ' t con acopio') +
      (otros !== null && Math.abs(otros) > 1 ? ln('↺', 'Otros', otros, 'acopios agotados con resto, mediciones posteriores y diferencias de estimación') : '') + '</details>';
  }
  return h + '</div>';
}

async function pintarReparto(c, E, dn) {
  if (!E.corte) {
    c.innerHTML = '<div class="alert warn">' + ICON.alerta + '<div>Para repartir la playa en acopios hace falta un <b>ajuste de stock de la playa</b> (medición o stock inicial). Cargalo en Cargar → Ajuste de stock y volvé acá.</div></div>';
    return;
  }
  const activos = E.acopios.filter(a => a.estado !== 'Agotado');
  const st = S.reparto || (S.reparto = { unidad: 't', fecha: E.corte.fecha });
  if (st.fecha < E.corte.fecha) st.fecha = E.corte.fecha;
  const optAc = (sel, vacioTxt) => '<option value="">' + (vacioTxt || 'Acopio…') + '</option>' + activos.map(a => '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.nombre) + '</option>').join('');
  c.innerHTML = ecuacionReparto(E, dn) +
    '<div class="card"><div class="card-h"><div class="t"><h3><span class="paso">1</span> Foto inicial y calidad de cada acopio</h3><div class="sub">Indicá cuánta tierra hay en cada acopio el día de la foto. Lo que no repartas queda «sin ubicar». Una fecha posterior al ajuste funciona como nueva medición de ese acopio.</div></div>' +
    '<div class="row" style="gap:8px"><label class="f" style="margin:0">Fecha de la foto<input type="date" id="rF" value="' + st.fecha + '" min="' + E.corte.fecha + '" max="' + hoy() + '"></label><span class="unid-tog" id="rU"><button type="button" data-u="t" class="' + (st.unidad === 't' ? 'on' : '') + '">t</button><button type="button" data-u="m3" class="' + (st.unidad === 'm3' ? 'on' : '') + '">m³</button></span></div></div>' +
    (activos.length ? '<div class="tw"><table class="rep-tab"><thead><tr><th>Acopio</th><th>Calidad general</th><th class="n">En la foto</th><th class="n">Stock hoy</th></tr></thead><tbody>' + activos.map(a => {
      const mismo = a.ubicadoFecha === st.fecha;
      const val = mismo ? (st.unidad === 'm3' ? (a.ubicadoM3 !== null ? a.ubicadoM3 : Math.round(a.ubicado / dn)) : a.ubicado) : '';
      return '<tr data-a="' + a.id + '"><td><span class="dot" style="background:' + colorAcopio(E, a) + '"></span><b>' + esc(a.nombre) + '</b><div class="sub">' + esc(a.tipo === 'Mezcla' ? 'Mezcla' : a.origen) + (a.ubicadoFecha && !mismo ? ' · medido el ' + fCorta(a.ubicadoFecha) + ': ' + nf(a.ubicado) + ' t' : '') + '</div></td>' +
        '<td><div class="row" style="gap:6px;flex-wrap:nowrap"><select data-cal>' + opts(E.calidades || ['Muy buena', 'Buena', 'Regular', 'Mala'], a.calidadGral || '', 'Sin calificar') + '</select><input data-nota placeholder="Nota" value="' + esc(a.calidadNota || '') + '" style="min-width:110px"></div></td>' +
        '<td class="n"><input data-cant type="number" min="0" step="1" value="' + esc(val === null ? '' : val) + '" placeholder="' + st.unidad + '" style="width:110px;text-align:right"></td>' +
        '<td class="n"><b>' + nf(a.stock) + ' t</b><div class="sub">≈ ' + nf(a.stock / dn) + ' m³</div></td></tr>';
    }).join('') + '</tbody></table></div><div class="rep-pie"><div id="rRes"></div><button class="btn pri" id="rG">' + ICON.guardar + 'Guardar foto</button></div>' :
      vacio('No hay acopios armados. Armalos desde «Plano y stock» tocando un sector libre.')) + '</div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3><span class="paso">2</span> Camiones que llegaron sin acopio</h3><div class="sub">Desde el ' + fCorta(E.corte.fecha) + ', agrupados por día y origen. ✨ = acopio sugerido porque tiene el mismo origen. Los rechazados por calidad no aparecen.</div></div>' +
    '<div class="row" style="gap:6px"><button class="btn sm" id="iSug">Marcar sugeridos</button><button class="btn sm pri" id="iAsig">Asignar marcados</button></div></div><div id="iLista"><div class="skel" style="height:140px"></div></div></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3><span class="paso">3</span> Molienda sin acopio indicado</h3><div class="sub">Turnos desde el ' + fCorta(E.corte.fecha) + ' con paladas del Informe de Producción. Elegí uno o varios e indicá de qué acopio se tomó.</div></div>' +
    '<div class="row" style="gap:6px;flex-wrap:wrap"><select id="mA">' + optAc('', 'Acopio…') + '</select><label class="row" style="gap:4px;flex-wrap:nowrap"><input id="mP" type="number" min="1" max="100" value="100" style="width:70px"> %</label><button class="btn sm pri" id="mAsig">Asignar</button></div></div>' +
    (E.sinAsignar.length ? (() => {
      const dias = agrupar(E.sinAsignar, x => x.fecha);
      return '<div class="row" style="gap:8px;margin-bottom:8px"><label class="chk"><input type="checkbox" id="mAll"> Todos (' + E.sinAsignar.length + ' turnos · ≈ ' + nf(sum(E.sinAsignar, x => x.paladas * (100 - x.asignado) / 100) * E.fMol) + ' t)</label></div><div class="rep-dias">' +
        Object.keys(dias).sort().reverse().map(f => { const l = dias[f].sort((a, b) => a.turno < b.turno ? -1 : 1); return '<div class="rep-dia"><label class="chk"><input type="checkbox" data-md="' + f + '"><b>' + fCorta(f) + '</b></label><div class="tts">' +
          l.map(x => '<label class="tt' + (x.asignado ? ' parcial' : '') + '" title="' + nf(x.paladas) + ' paladas · ≈ ' + nf(x.paladas * E.fMol) + ' t' + (x.asignado ? ' · ya asignado ' + x.asignado + ' %' : '') + '"><input type="checkbox" data-mt="' + x.fecha + '|' + x.turno + '"><span>' + esc(x.turno) + '</span><small>' + nf(x.paladas) + ' pal' + (x.asignado ? ' · ' + x.asignado + ' %' : '') + '</small></label>').join('') + '</div><span class="sub">≈ ' + nf(sum(l, x => x.paladas) * E.fMol) + ' t</span></div>'; }).join('') + '</div>';
    })() :
      vacio('Todos los turnos de molienda desde el ajuste tienen acopio.')) + '</div>';
  stagger(c);
  contar(c);
  const resumen = () => {
    const vals = $$('.rep-tab tr[data-a] [data-cant]', c).map(x => num(x.value)).filter(x => x !== null && x >= 0);
    const t = sum(vals, x => st.unidad === 'm3' ? x * dn : x);
    const base = st.fecha === E.corte.fecha ? E.corte.toneladas : null;
    const r = $('#rRes');
    if (r) r.innerHTML = base === null ? 'Medición del ' + fCorta(st.fecha) + ': <b>' + nf(t) + ' t</b> en ' + vals.length + ' acopio(s)' : 'Repartido <b>' + nf(t) + ' t</b> de ' + nf(base) + ' t del ajuste · ' + (base - t >= 0 ? 'quedan <b>' + nf(base - t) + ' t</b> sin ubicar' : '<b class="rojo">' + nf(t - base) + ' t de más</b>');
  };
  resumen();
  c.addEventListener('input', e => { if (e.target.matches('[data-cant]')) resumen(); });
  if ($('#rF')) $('#rF').onchange = e => { st.fecha = e.target.value || E.corte.fecha; pintarReparto(c, E, dn); };
  if ($('#rU')) $('#rU').onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; st.unidad = b.dataset.u; pintarReparto(c, E, dn); };
  $$('.rep-tab tr[data-a] [data-cal], .rep-tab tr[data-a] [data-nota]', c).forEach(el => {
    el.onchange = async () => {
      const tr = el.closest('tr');
      try { await escribir('calidadAcopio', { id: tr.dataset.a, calidadGral: $('[data-cal]', tr).value, calidadNota: $('[data-nota]', tr).value }, 'Calidad de acopio'); toast('Calidad guardada', 'ok'); } catch (er) { toast(er.message, 'bad'); }
    };
  });
  if ($('#rG')) $('#rG').onclick = async () => {
    const filas = $$('.rep-tab tr[data-a]', c).map(tr => ({ acopio: tr.dataset.a, cantidad: $('[data-cant]', tr).value, unidad: st.unidad })).filter(x => String(x.cantidad).trim() !== '');
    if (!filas.length) return toast('Cargá la cantidad de al menos un acopio', 'warn');
    bloquear('Guardando…');
    try { const r = await escribir('ubicarAcopios', { fecha: st.fecha, filas: filas }, 'Foto de acopios'); toast(r.guardados + ' acopio(s) · ' + nf(r.toneladas) + ' t ubicadas', 'ok'); vAcopios('reparto'); } catch (er) { toast(er.message, 'bad', 7000); } finally { desbloquear(); }
  };
  const marcados = new Set();
  let grupos = [];
  const pintarGrupos = () => {
    const l = $('#iLista');
    if (!l) return;
    if (!grupos.length) { l.innerHTML = vacio('Todos los camiones desde el ajuste tienen acopio.'); return; }
    l.innerHTML = '<div class="rep-grupos">' + grupos.map((g, i) => '<details class="rep-g' + (marcados.has(i) ? ' on' : '') + '"><summary><input type="checkbox" data-g="' + i + '"' + (marcados.has(i) ? ' checked' : '') + '><span class="f">' + fCorta(g.fecha) + '</span><span class="o">' + (g.origen ? esc(g.origen) : '<i>origen desconocido</i>') + '</span><span class="n nc">' + g.tickets.length + ' 🚛</span><span class="n"><b>' + nf(g.toneladas) + ' t</b></span>' +
      '<select data-ga="' + i + '">' + optAc(g.acopio, 'Elegir acopio…') + '</select>' + (g.sugerido && g.acopio === g.sugerido ? '<span class="sug" title="Mismo origen que el acopio">✨</span>' : '<span class="sug"></span>') + '</summary>' +
      tabla([['hora', 'Hora'], ['ticket', 'Ticket'], ['dominio', 'Dominio'], ['chofer', 'Chofer'], [x => nf(x.neto, 2), 'Neto t', 'n']], g.tickets) + '</details>').join('') + '</div>' +
      '<div class="sub mt">' + grupos.length + ' grupos · ' + nf(sum(grupos, g => g.tickets.length)) + ' camiones · ' + nf(sum(grupos, g => g.toneladas)) + ' t sin acopio</div>';
  };
  try {
    const r = await api('repartoPlaya');
    grupos = (r.grupos || []).map(g => Object.assign(g, { acopio: g.sugerido || '' }));
  } catch (er) { const l = $('#iLista'); if (l) l.innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>' + esc(er.message) + '</div></div>'; return; }
  pintarGrupos();
  $('#iLista').addEventListener('click', e => { if (e.target.matches('input[data-g], select')) e.stopPropagation(); }, true);
  $('#iLista').addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.g !== undefined) { const i = Number(el.dataset.g); if (el.checked) marcados.add(i); else marcados.delete(i); el.closest('.rep-g').classList.toggle('on', el.checked); }
    if (el.dataset.ga !== undefined) { const i = Number(el.dataset.ga); grupos[i].acopio = el.value; if (el.value) marcados.add(i); pintarGrupos(); }
  });
  $('#iSug').onclick = () => { grupos.forEach((g, i) => { if (g.acopio) marcados.add(i); }); pintarGrupos(); };
  $('#iAsig').onclick = async () => {
    const sel = Array.from(marcados).map(i => grupos[i]).filter(Boolean);
    if (!sel.length) return toast('Marcá al menos un grupo', 'warn');
    if (sel.some(g => !g.acopio)) return toast('Hay grupos marcados sin acopio elegido', 'warn');
    const porAc = {};
    sel.forEach(g => { (porAc[g.acopio] = porAc[g.acopio] || []).push.apply(porAc[g.acopio], g.tickets.map(t => t.clave)); });
    bloquear('Asignando…');
    try {
      let n = 0;
      let t = 0;
      for (const id of Object.keys(porAc)) { const r = await escribir('asignarDescargas', { claves: porAc[id], acopio: id }, 'Descargas a acopio'); n += r.asignados; t += r.toneladas; }
      toast(n + ' camiones (' + nf(t) + ' t) asignados', 'ok');
      vAcopios('reparto');
    } catch (er) { toast(er.message, 'bad', 7000); } finally { desbloquear(); }
  };
  if ($('#mAll')) $('#mAll').onchange = e => { $$('[data-mt], [data-md]', c).forEach(x => { x.checked = e.target.checked; }); };
  $$('[data-md]', c).forEach(d => { d.onchange = () => { $$('[data-mt^="' + d.dataset.md + '|"]', c).forEach(x => { x.checked = d.checked; }); }; });
  $('#mAsig').onclick = async () => {
    const items = $$('[data-mt]:checked', c).map(x => ({ fecha: x.dataset.mt.split('|')[0], turno: x.dataset.mt.split('|')[1] }));
    const ac = $('#mA').value;
    if (!items.length) return toast('Marcá al menos un turno', 'warn');
    if (!ac) return toast('Elegí el acopio', 'warn');
    bloquear('Asignando…');
    try { const r = await escribir('asignarConsumos', { items: items, acopio: ac, proporcion: $('#mP').value }, 'Consumo por turnos'); toast(r.asignados + ' turno(s) asignados', 'ok'); vAcopios('reparto'); } catch (er) { toast(er.message, 'bad', 7000); } finally { desbloquear(); }
  };
}

async function vAcopios(tab) {
  const ok = vivo();
  app().innerHTML = '<div class="vista"><div class="card"><div class="skel" style="height:420px"></div></div></div>';
  const E = await api('acopios');
  if (!ok()) return;
  S.acopios = E;
  const t = ['plano', 'reparto', 'descargas', 'consumos', 'sectores'].indexOf(tab) >= 0 ? tab : 'plano';
  const tabs = [['plano', 'Plano y stock']];
  if (puede('acopiosConsumo')) tabs.push(['reparto', 'Reparto de la playa']);
  if (puede('acopios')) tabs.push(['descargas', 'Descargas (balanza)']);
  if (puede('acopiosConsumo')) tabs.push(['consumos', 'Consumos y traslados']);
  if (puede('acopiosConsumo')) tabs.push(['sectores', 'Dibujar sectores']);
  const dn = E.densidad || 1.4;
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Playa de molienda</div><h1>Acopios</h1><p class="sub">Dónde se descarga cada tierra, cuánto queda en cada acopio y de dónde se está moliendo.</p></div><div id="segAc"></div></div>' +
    (S.ses ? E.avisos : []).map(a => '<div class="alert ' + a[0] + '">' + ICON.alerta + '<div>' + esc(a[1]) + '</div></div>').join('') + '<div id="acCont"></div></div>';
  segmento($('#segAc'), tabs, t, k => { location.hash = '#/acopios/' + k; }, true);
  const c = $('#acCont');
  if (t === 'plano') return pintarPlanoAcopios(c, E, dn);
  if (t === 'reparto' && puede('acopiosConsumo')) return pintarReparto(c, E, dn);
  if (t === 'descargas') return pintarDescargas(c, E);
  if (t === 'consumos') return pintarConsumos(c, E, dn);
  return puede('acopiosConsumo') ? pintarSectores(c, E) : pintarPlanoAcopios(c, E, dn);
}

function pintarPlanoAcopios(c, E, dn) {
  const activos = E.acopios.filter(a => a.estado !== 'Agotado');
  const sinSect = !E.sectores.length;
  c.innerHTML = '<div class="kpis stagger">' + kpi('En acopios', vn(E.totalAcopios) + '<small>t</small>', '≈ ' + nf(E.totalAcopios / dn) + ' m³ · ' + activos.length + ' activos', 'kacc') +
    kpi('Sin ubicar', E.sinUbicar === null ? 'sin dato' : vn(E.sinUbicar) + '<small>t</small>', 'de ' + (E.stockPlaya === null ? '–' : nf(E.stockPlaya)) + ' t de la playa' + (puede('acopiosConsumo') ? ' · <a href="#/acopios/reparto">repartir</a>' : ''), E.sinUbicar !== null && E.sinUbicar < -1 ? 'bad' : E.sinUbicar > 1 ? 'warn' : 'ok') +
    kpi('t por palada', vn(E.fMol, 2), nf(E.m3Palada) + ' m³ de balde · ' + nf(dn, 2) + ' t/m³') +
    kpi('Turnos sin acopio', vn(E.sinAsignar.length), 'molienda sin asignar', E.sinAsignar.length ? 'warn' : 'ok') + '</div>' +
    avisoViejos(E) + (sinSect ? '<div class="alert info">' + ICON.infoI + '<div>Todavía no hay sectores dibujados. ' + (puede('acopiosConsumo') ? '<a href="#/acopios/sectores">Dibujalos en el plano</a>.' : 'El responsable de molienda o el administrador tiene que dibujarlos.') + '</div></div>' : '') +
    '<div class="grid g-21" style="align-items:start"><div class="card plano-card"><div class="card-h"><div class="t"><h3>Plano</h3><div class="sub">Vista recta de la playa · tocá un sector para ver su acopio</div></div><div class="row" style="gap:8px">' + botonFoto() +
    (puede('acopiosConsumo') ? '<button class="btn sm" id="bMezcla">' + ICON.ajuste + 'Armar mezcla</button>' : '') + '</div></div>' + planoSVG(E, {}) +
    '<div class="leg">' + Object.keys(COLOR_ESTADO_ACOPIO).filter(Boolean).map(k => '<span class="sw" style="--c:' + COLOR_ESTADO_ACOPIO[k] + '"></span>' + k).join('') + '<span class="sw" style="--c:#cbd5e1"></span>Libre</div></div>' +
    '<div class="col" id="acLista" style="gap:12px">' + E.sectores.map(s => tarjetaSector(E, s, dn)).join('') + '</div></div>';
  stagger(c);
  contar(c);
  $$('.plano .sec', c).forEach(g => { g.onclick = () => { const el = $('#sec-' + g.dataset.sec); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } }; });
  if ($('#bMezcla')) $('#bMezcla').onclick = () => formMezcla(E);
  enlazarFoto(c, () => pintarPlanoAcopios(c, E, dn));
  c.onclick = async e => {
    const b = e.target.closest('button[data-acc]');
    if (!b) return;
    const sid = b.dataset.sec;
    const a = E.acopios.find(x => x.id === b.dataset.id) || null;
    if (b.dataset.acc === 'armar') return formAcopio(E, sid, null);
    if (b.dataset.acc === 'editar') return formAcopio(E, sid, a);
    if (b.dataset.acc === 'ver') return detalleAcopio(E, a, dn);
    if (b.dataset.acc === 'agotar' && await confirmar('Acopio agotado', '¿Marcar «' + esc(a.nombre) + '» como agotado? El cálculo dice que quedan ' + nf(a.stock) + ' t.', 'Agotado', true)) {
      try { await escribir('estadoAcopio', { id: a.id, estado: 'Agotado' }, 'Acopio agotado'); toast('Acopio agotado', 'ok'); vAcopios('plano'); } catch (er) { toast(er.message, 'bad'); }
    }
    if (b.dataset.acc === 'consumo') { S.acopioSel = a.id; location.hash = '#/acopios/consumos'; }
  };
}

function tarjetaSector(E, s, dn) {
  const a = acopioActivo(E, s.id);
  const ult = acopioDeSector(E, s.id);
  const pct = a && a.base > 0 ? Math.max(0, Math.min(100, a.stock / a.base * 100)) : 0;
  const bot = [];
  if (a) {
    bot.push('<button class="btn sm" data-acc="ver" data-id="' + a.id + '" data-sec="' + s.id + '">Detalle</button>');
    if (puede('acopios')) bot.push('<button class="btn sm" data-acc="editar" data-id="' + a.id + '" data-sec="' + s.id + '">' + ICON.editar + '</button>');
    if (puede('acopiosConsumo')) bot.push('<button class="btn sm" data-acc="consumo" data-id="' + a.id + '" data-sec="' + s.id + '">Consumo</button><button class="btn sm dan" data-acc="agotar" data-id="' + a.id + '" data-sec="' + s.id + '">Agotado</button>');
  } else if (puede('acopios')) bot.push('<button class="btn sm pri" data-acc="armar" data-sec="' + s.id + '">+ Armar acopio</button>');
  return '<div class="card sector-card" id="sec-' + s.id + '"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><span class="eyebrow">' + esc(s.nombre) + '</span>' +
    (a ? '<h3 style="margin:2px 0">' + esc(a.nombre) + '</h3><div class="sub">' + (a.tipo === 'Mezcla' ? 'Mezcla: ' + a.componentes.map(x => { const o = E.acopios.find(y => y.id === x.id); return (o ? esc(o.nombre) : '?') + ' ' + nf(x.pct) + ' %'; }).join(' + ') : 'Origen: ' + (origenesDe(a).length > 1 ? origenesDe(a).map(o => esc(o.origen) + ' ' + nf(o.pct, 0) + ' %').join(' + ') + (razonTxt(origenesDe(a)) ? ' (' + razonTxt(origenesDe(a)) + ')' : '') : esc(a.origen))) + '</div><div class="sub">' + calidadTxt(a) + ' ' + chipCalidad(a) + '</div>'
      : '<h3 style="margin:2px 0">Libre</h3><div class="sub">' + (ult ? 'Último: ' + esc(ult.nombre) + ' (agotado ' + fCorta(ult.agotado) + ')' : 'Sin acopios todavía') + '</div>') +
    '</div>' + (a ? '<span class="tag" style="background:' + COLOR_ESTADO_ACOPIO[a.estado] + '22;color:' + COLOR_ESTADO_ACOPIO[a.estado] + '">' + esc(a.estado) + '</span>' : '') + '</div>' +
    (a ? '<div class="ac-stock"><div><b>' + nf(a.stock) + ' t</b><small> ≈ ' + nf(a.stock / dn) + ' m³ · ≈ ' + nf(a.stock / E.fMol) + ' paladas</small></div><div class="barra"><span style="width:' + pct + '%"></span></div>' +
      '<div class="sub">' + (a.ubicadoFecha ? 'Foto del ' + fCorta(a.ubicadoFecha) + ': ' + nf(a.ubicado) + ' t · ' : '') + 'Ingresó ' + nf(a.base) + ' t' + (a.ubicadoFecha ? '' : a.tMedida !== null && a.tMedida !== '' && a.tMedida !== undefined ? ' (medido)' : ' (' + nf(a.camiones) + ' camiones' + (a.ingresoTraslado ? ' + traslados' : '') + ')') + ' · consumido ' + nf(a.consumoT) + ' t (' + nf(a.consumoPaladas) + ' paladas)' + (a.rechazos ? ' · <span class="rojo">' + a.rechazos + ' rechazo(s)</span>' : '') + '</div></div>' : '') +
    '<div class="row mt" style="gap:6px">' + bot.join('') + '</div></div>';
}

const CONTAMINANTES_ACOPIO = ['Piedras', 'Caliza', 'Basura', 'Tierra negra', 'Raíces'];
const NIVELES_CONT = ['Poco', 'Mediano', 'Mucho'];
const TEXTURAS = ['Arcillosa', 'Arcillo limosa', 'Arcillo arenosa', 'Franco arcillosa', 'Franco arcillo limosa', 'Franco arcillo arenosa', 'Franca', 'Franco limosa', 'Limosa', 'Franco arenosa', 'Areno franca', 'Arenosa'];
const TEX_COLOR = { 'Arcillosa': '#b45309', 'Arcillo limosa': '#c2410c', 'Arcillo arenosa': '#d97706', 'Franco arcillosa': '#ca8a04', 'Franco arcillo limosa': '#a16207', 'Franco arcillo arenosa': '#e0a458', 'Franca': '#84a35a', 'Franco limosa': '#6b9e8f', 'Limosa': '#5b8fb0', 'Franco arenosa': '#c9b27a', 'Areno franca': '#dccb94', 'Arenosa': '#ece0b3' };

function texturaUSDA(arc, lim, are) {
  const c = Number(arc);
  const s = Number(lim);
  const a = Number(are);
  if ([c, s, a].some(x => isNaN(x)) || Math.abs(c + s + a - 100) > 1.5) return '';
  if (s + 1.5 * c < 15) return 'Arenosa';
  if (s + 2 * c < 30) return 'Areno franca';
  if ((c >= 7 && c < 20 && a > 52) || (c < 7 && s < 50)) return 'Franco arenosa';
  if (c >= 7 && c < 27 && s >= 28 && s < 50 && a <= 52) return 'Franca';
  if ((s >= 50 && c >= 12 && c < 27) || (s >= 50 && s < 80 && c < 12)) return 'Franco limosa';
  if (s >= 80 && c < 12) return 'Limosa';
  if (c >= 20 && c < 35 && s < 28 && a > 45) return 'Franco arcillo arenosa';
  if (c >= 27 && c < 40 && a > 20 && a <= 45) return 'Franco arcillosa';
  if (c >= 27 && c < 40 && a <= 20) return 'Franco arcillo limosa';
  if (c >= 35 && a > 45) return 'Arcillo arenosa';
  if (c >= 40 && s >= 40) return 'Arcillo limosa';
  return 'Arcillosa';
}

const TRI = { w: 300, h: 260, x0: 30, y0: 14 };
const triXY = (c, s) => ({ x: TRI.x0 + (s + c / 2) / 100 * TRI.w, y: TRI.y0 + (1 - c / 100) * TRI.h });
const triDesdeXY = (x, y) => { const c = Math.max(0, Math.min(100, (1 - (y - TRI.y0) / TRI.h) * 100)); const s = Math.max(0, Math.min(100 - c, ((x - TRI.x0) / TRI.w) * 100 - c / 2)); return { c: Math.round(c), s: Math.round(s), a: Math.round(100 - Math.round(c) - Math.round(s)) }; };
let TRI_FONDO = '';

function fondoTriangulo() {
  if (TRI_FONDO) return TRI_FONDO;
  const st = 2.5;
  const cen = {};
  let h = '';
  const pt = (c, s) => { const p = triXY(c, s); return p.x.toFixed(1) + ',' + p.y.toFixed(1); };
  for (let c = 0; c < 100; c += st) for (let s = 0; s + c < 100; s += st) {
    const t1 = texturaUSDA(c + st / 3, s + st / 3, 100 - c - s - 2 * st / 3);
    h += '<polygon points="' + pt(c, s) + ' ' + pt(c, s + st) + ' ' + pt(c + st, s) + '" fill="' + TEX_COLOR[t1] + '" stroke="' + TEX_COLOR[t1] + '" stroke-width=".4"/>';
    (cen[t1] = cen[t1] || []).push([c + st / 3, s + st / 3]);
    if (s + c + st < 100) {
      const t2 = texturaUSDA(c + 2 * st / 3, s + 2 * st / 3, 100 - c - s - 4 * st / 3);
      h += '<polygon points="' + pt(c + st, s) + ' ' + pt(c, s + st) + ' ' + pt(c + st, s + st) + '" fill="' + TEX_COLOR[t2] + '" stroke="' + TEX_COLOR[t2] + '" stroke-width=".4"/>';
      (cen[t2] = cen[t2] || []).push([c + 2 * st / 3, s + 2 * st / 3]);
    }
  }
  let g = '';
  for (let k = 10; k < 100; k += 10) {
    g += '<line x1="' + triXY(k, 0).x + '" y1="' + triXY(k, 0).y + '" x2="' + triXY(k, 100 - k).x + '" y2="' + triXY(k, 100 - k).y + '"/>';
    g += '<line x1="' + triXY(0, k).x + '" y1="' + triXY(0, k).y + '" x2="' + triXY(100 - k, k).x + '" y2="' + triXY(100 - k, k).y + '"/>';
    g += '<line x1="' + triXY(0, 100 - k).x + '" y1="' + triXY(0, 100 - k).y + '" x2="' + triXY(100 - k, 0).x + '" y2="' + triXY(100 - k, 0).y + '"/>';
  }
  const abrev = { 'Arcillosa': 'Arcillosa', 'Arcillo limosa': 'Arc. limosa', 'Arcillo arenosa': 'Arc. aren.', 'Franco arcillosa': 'Fr. arcillosa', 'Franco arcillo limosa': 'Fr. arc. lim.', 'Franco arcillo arenosa': 'Fr. arc. aren.', 'Franca': 'Franca', 'Franco limosa': 'Fr. limosa', 'Limosa': 'Limosa', 'Franco arenosa': 'Fr. arenosa', 'Areno franca': '', 'Arenosa': '' };
  const lbl = Object.keys(cen).map(t => { const l = cen[t]; const c = sum(l, x => x[0]) / l.length; const s = sum(l, x => x[1]) / l.length; const p = triXY(c, s); return abrev[t] ? '<text x="' + p.x.toFixed(1) + '" y="' + (p.y + 3).toFixed(1) + '" text-anchor="middle">' + abrev[t] + '</text>' : ''; }).join('');
  const ax = [];
  for (let k = 0; k <= 100; k += 20) {
    const pc = triXY(k, 0);
    ax.push('<text class="ax" x="' + (pc.x - 6) + '" y="' + (pc.y + 3) + '" text-anchor="end">' + k + '</text>');
    const ps = triXY(100 - k, k);
    ax.push('<text class="ax" x="' + (ps.x + 6) + '" y="' + (ps.y + 3) + '">' + k + '</text>');
    const pa = triXY(0, 100 - k);
    ax.push('<text class="ax" x="' + pa.x + '" y="' + (pa.y + 13) + '" text-anchor="middle">' + k + '</text>');
  }
  TRI_FONDO = '<g class="reg">' + h + '</g><g class="grid">' + g + '</g><g class="lbls">' + lbl + '</g><polygon class="borde" points="' + pt(0, 0) + ' ' + pt(0, 100) + ' ' + pt(100, 0) + '"/>' + ax.join('') +
    '<text class="axt" x="' + (TRI.x0 + TRI.w * 0.18) + '" y="' + (TRI.y0 + TRI.h * 0.45) + '" transform="rotate(-60 ' + (TRI.x0 + TRI.w * 0.18) + ' ' + (TRI.y0 + TRI.h * 0.45) + ')" text-anchor="middle" dy="-16">% arcilla ↑</text>' +
    '<text class="axt" x="' + (TRI.x0 + TRI.w * 0.82) + '" y="' + (TRI.y0 + TRI.h * 0.45) + '" transform="rotate(60 ' + (TRI.x0 + TRI.w * 0.82) + ' ' + (TRI.y0 + TRI.h * 0.45) + ')" text-anchor="middle" dy="-16">% limo ↓</text>' +
    '<text class="axt" x="' + (TRI.x0 + TRI.w / 2) + '" y="' + (TRI.y0 + TRI.h + 28) + '" text-anchor="middle">← % arena</text>';
  return TRI_FONDO;
}

function trianguloSVG(c, s) {
  const ok = c !== null && s !== null && !isNaN(c) && !isNaN(s) && c + s <= 100.5;
  const p = ok ? triXY(c, s) : null;
  return '<svg class="tri" viewBox="0 0 ' + (TRI.w + 60) + ' ' + (TRI.h + 50) + '" role="img" aria-label="Triángulo de textura">' + fondoTriangulo() +
    (p ? '<line class="guia" x1="' + p.x + '" y1="' + p.y + '" x2="' + triXY(c, 0).x + '" y2="' + triXY(c, 0).y + '"/><line class="guia" x1="' + p.x + '" y1="' + p.y + '" x2="' + triXY(100 - s, s).x + '" y2="' + triXY(100 - s, s).y + '"/><line class="guia" x1="' + p.x + '" y1="' + p.y + '" x2="' + triXY(0, s).x + '" y2="' + triXY(0, s).y + '"/>' +
      '<circle class="pto" cx="' + p.x + '" cy="' + p.y + '" r="7"/>' : '') + '</svg>';
}

function origenesDe(a) {
  if (!a) return [];
  const s = String(a.origenes || '').trim();
  if (s) return s.split(';').map(x => { const i = x.lastIndexOf(':'); return { origen: x.slice(0, i), pct: Number(x.slice(i + 1)) || 0 }; }).filter(x => x.origen);
  return a.origen && a.origen !== 'Mezcla' ? [{ origen: a.origen, pct: 100 }] : [];
}

function contaminantesDe(a) {
  const o = {};
  if (!a) return o;
  String(a.contaminantes || '').split(';').forEach(x => { const p = x.split(':'); if (p[0] && NIVELES_CONT.indexOf(p[1]) >= 0) o[p[0]] = p[1]; });
  if (!a.contaminantes && a.piedrasNivel) { const m = { Pocas: 'Poco', Muchas: 'Mucho' }[a.piedrasNivel]; if (m) o.Piedras = m; }
  return o;
}

function razonTxt(l) {
  if (l.length < 2) return '';
  const min = Math.min.apply(null, l.map(x => x.pct).filter(x => x > 0));
  const r = l.map(x => x.pct / min);
  return r.every(x => Math.abs(x - Math.round(x)) < 0.08) ? r.map(x => Math.round(x)).join(' : ') : '';
}

function formAcopio(E, sid, a) {
  const s = E.sectores.find(x => x.id === sid);
  const v = k => a && a[k] !== null && a[k] !== undefined ? a[k] : '';
  const lug = nombres('Lugares');
  const mezcla = a && a.tipo === 'Mezcla';
  let unidad = 't';
  let modo = 'partes';
  const ori0 = origenesDe(a);
  let oris = ori0.length ? ori0.map(x => ({ origen: x.origen, parte: x.pct })) : [{ origen: '', parte: 1 }];
  if (ori0.length > 1) { const mn = Math.min.apply(null, ori0.map(x => x.pct)); const ok = ori0.every(x => Math.abs(x.pct / mn - Math.round(x.pct / mn)) < 0.08); if (ok) oris = ori0.map(x => ({ origen: x.origen, parte: Math.round(x.pct / mn) })); else modo = 'pct'; }
  const cont = contaminantesDe(a);
  const tx = { c: num(v('arcilla')), s: num(v('limo')), a: num(v('arena')) };
  const m = modal((a ? 'Editar acopio · ' : 'Armar acopio · ') + (s ? s.nombre : ''), '<div class="fa">' +
    '<section><h4>📍 Acopio</h4><div class="form"><label class="f">Nombre<input id="fNom" value="' + esc(v('nombre')) + '" placeholder="' + esc((s ? s.nombre : '') + ' · origen') + '"></label>' +
    (a ? '<label class="f">Estado<select id="fEst">' + opts(ESTADOS_ACOPIO_TXT, v('estado'), null) + '</select></label>' : '') +
    '<label class="f">Humedad<select id="fHum">' + opts(['Seca', 'Normal', 'Húmeda'], v('humedad'), 'Sin indicar') + '</select></label>' +
      '<label class="f full">📏 Cantidad medida al cerrar (opcional)<div class="row" style="gap:8px;flex-wrap:nowrap"><input id="fMed" type="number" min="0" step="1" style="flex:1" value="' + esc(v('tMedida')) + '"><span class="unid-tog" id="fU"><button type="button" data-u="t" class="on">t</button><button type="button" data-u="m3">m³</button></span></div></label>' +
      '<label class="f full">Observaciones<input id="fObs" value="' + esc(v('observaciones')) + '"></label></div><p class="sub">Si no cargás la cantidad medida, el acopio suma las toneladas de los camiones que se asignen. Para el reparto de la playa usá «Reparto de la playa».</p></section>' +
    (mezcla ? '<section><h4>🔀 Mezcla de acopios</h4><div class="sub">' + esc(a.componentes.map(x => { const o = E.acopios.find(y => y.id === x.id); return (o ? o.nombre : '?') + ' ' + x.pct + ' %'; }).join(' + ')) + '</div></section>' :
      '<section><h4>🚛 Origen de la tierra</h4><div class="sub">Si se armó con tierra de varios lugares, agregá cada uno con su proporción en paladas (2 a 1, 3 a 1) o en %.</div>' +
      '<div class="row" style="gap:6px;margin:8px 0"><span class="unid-tog" id="fModo"><button type="button" data-m="partes">Partes</button><button type="button" data-m="pct">%</button></span><button type="button" class="btn sm" data-pre="1,1">50 / 50</button><button type="button" class="btn sm" data-pre="2,1">2 a 1</button><button type="button" class="btn sm" data-pre="3,1">3 a 1</button></div>' +
      '<div id="fOris"></div><button type="button" class="btn sm mt" id="fOriAdd">+ Otro origen</button><div id="fOriRes" class="ori-barra mt"></div></section>') +
    '<section><h4>🔍 Calidad: qué tiene la tierra</h4><div class="cont">' + CONTAMINANTES_ACOPIO.map(k => '<div class="cont-it' + (cont[k] ? ' on' : '') + '" data-c="' + esc(k) + '"><label class="chk"><input type="checkbox"' + (cont[k] ? ' checked' : '') + '> ' + esc(k) + '</label><span class="niv">' + NIVELES_CONT.map(n => '<button type="button" data-n="' + n + '" class="' + (cont[k] === n ? 'on' : '') + '">' + n + '</button>').join('') + '</span></div>').join('') + '</div></section>' +
    '<section><h4>🔺 Textura: arcilla, limo y arena</h4><div class="tex"><div id="fTri"></div><div class="tex-in"><div class="sub">Tocá el triángulo o cargá dos valores: el tercero se completa para sumar 100 %.</div><div class="tex-3">' +
      '<label class="f">% arcilla<input id="fArc" type="number" min="0" max="100" step="1" value="' + esc(v('arcilla')) + '"></label>' +
      '<label class="f">% limo<input id="fLim" type="number" min="0" max="100" step="1" value="' + esc(v('limo')) + '"></label>' +
      '<label class="f">% arena<input id="fAre" type="number" min="0" max="100" step="1" value="' + esc(v('arena')) + '"></label></div><div id="fPerfil" class="perfil"></div></div></div></section>' +
    '</div>', [
    { txt: 'Cancelar' },
    {
      txt: 'Guardar', cls: 'pri', fn: async mm => {
        const med = num($('#fMed', mm).value);
        const lista = mezcla ? [] : pcts();
        if (!mezcla && !lista.length) { toast('Indicá al menos un origen', 'warn'); return false; }
        if (!mezcla && new Set(lista.map(x => x.origen)).size !== lista.length) { toast('Hay orígenes repetidos', 'warn'); return false; }
        const ar = $('#fArc', mm).value;
        const li = $('#fLim', mm).value;
        const an = $('#fAre', mm).value;
        const hayTx = [ar, li, an].some(x => String(x).trim() !== '');
        if (hayTx && Math.abs((Number(ar) || 0) + (Number(li) || 0) + (Number(an) || 0) - 100) > 1) { toast('Arcilla + limo + arena tienen que sumar 100 %', 'warn'); return false; }
        const cs = $$('.cont-it.on', mm).map(x => { const n = $('.niv button.on', x); return n ? x.dataset.c + ':' + n.dataset.n : null; });
        if (cs.some(x => x === null)) { toast('Elegí poco, mediano o mucho en cada ítem marcado', 'warn'); return false; }
        const d = {
          id: a ? a.id : '', sector: sid, nombre: $('#fNom', mm).value, tipo: a ? a.tipo : 'Simple', origenes: lista, origen: mezcla ? 'Mezcla' : lista.map(x => x.origen).join(' + '),
          calidad: hayTx ? texturaUSDA(ar, li, an) : '', humedad: $('#fHum', mm).value, contaminantes: cs.join(';'), piedrasNivel: '',
          arcilla: ar, limo: li, arena: an, tMedida: med === null ? '' : Math.round(unidad === 'm3' ? med * (E.densidad || 1.4) : med),
          observaciones: $('#fObs', mm).value, estado: $('#fEst', mm) ? $('#fEst', mm).value : '', componentes: a ? a.componentes : []
        };
        try { await escribir('guardarAcopio', d, 'Acopio ' + d.nombre); toast('Acopio guardado', 'ok'); vAcopios('plano'); return true; } catch (e) { toast(e.message, 'bad', 7000); return false; }
      }
    }
  ], 'grande');
  const pcts = () => {
    const l = oris.filter(x => x.origen && Number(x.parte) > 0);
    const t = sum(l, x => Number(x.parte)) || 1;
    return l.map(x => ({ origen: x.origen, pct: Math.round(Number(x.parte) / t * 1000) / 10 }));
  };
  const pintarOris = () => {
    if (mezcla) return;
    $$('#fModo button', m).forEach(b => b.classList.toggle('on', b.dataset.m === modo));
    $('#fOris', m).innerHTML = oris.map((o, i) => '<div class="row ori" style="gap:8px;margin-bottom:6px;flex-wrap:nowrap"><select data-i="' + i + '" data-k="origen" style="flex:1">' + opts(lug.indexOf(o.origen) >= 0 || !o.origen ? lug : lug.concat([o.origen]), o.origen, 'Elegir origen…') + '</select>' +
      '<input data-i="' + i + '" data-k="parte" type="number" min="0" step="' + (modo === 'pct' ? '1' : '0.5') + '" value="' + o.parte + '" style="width:80px"><span class="sub" style="width:44px">' + (modo === 'pct' ? '%' : 'partes') + '</span>' + (oris.length > 1 ? '<button type="button" class="btn icon sm dan" data-x="' + i + '">' + ICON.borrar + '</button>' : '') + '</div>').join('');
    const l = pcts();
    const tot = sum(oris.filter(x => x.origen), x => Number(x.parte) || 0);
    $('#fOriRes', m).innerHTML = l.length ? '<div class="barra">' + l.map((x, i) => '<span style="flex:' + x.pct + ';background:' + COLORES_SECTOR[i % COLORES_SECTOR.length] + '">' + esc(x.origen) + ' ' + nf(x.pct, 0) + ' %</span>').join('') + '</div><div class="sub">' + (l.length > 1 ? (razonTxt(l) ? 'Proporción ' + razonTxt(l) + ' · ' : '') + 'de cada 10 paladas: ' + l.map(x => nf(x.pct / 10, 1) + ' de ' + esc(x.origen)).join(', ') : 'Un solo origen') + (modo === 'pct' && Math.abs(tot - 100) > 0.5 ? ' · <span class="rojo">suman ' + nf(tot) + ' %: se normaliza a 100 %</span>' : '') + '</div>' : '';
  };
  const pintarTex = () => {
    const c = num($('#fArc', m).value);
    const sl = num($('#fLim', m).value);
    const an = num($('#fAre', m).value);
    $('#fTri', m).innerHTML = trianguloSVG(c, sl);
    const t = c !== null && sl !== null && an !== null ? texturaUSDA(c, sl, an) : '';
    const sm = (c || 0) + (sl || 0) + (an || 0);
    $('#fPerfil', m).innerHTML = t ? '<span class="sw" style="background:' + TEX_COLOR[t] + '"></span><div><small>Perfil de la tierra</small><b>' + t + '</b></div>' : (c !== null || sl !== null || an !== null) && Math.abs(sm - 100) > 1 ? '<span class="rojo">Suman ' + nf(sm) + ' %</span>' : '<span class="sub">Sin datos de textura</span>';
  };
  pintarOris();
  pintarTex();
  if (!mezcla) {
    $('#fModo', m).onclick = e => { const b = e.target.closest('[data-m]'); if (!b || b.dataset.m === modo) return; const l = pcts(); modo = b.dataset.m; if (modo === 'pct') oris = l.length ? l.map(x => ({ origen: x.origen, parte: x.pct })) : oris; else { const r = razonTxt(l); oris = r ? l.map((x, i) => ({ origen: x.origen, parte: Number(r.split(' : ')[i]) })) : oris.map(x => ({ origen: x.origen, parte: x.parte })); } pintarOris(); };
    $$('[data-pre]', m).forEach(b => { b.onclick = () => { const p = b.dataset.pre.split(',').map(Number); while (oris.length < 2) oris.push({ origen: '', parte: 1 }); modo = 'partes'; oris = oris.slice(0, 2).map((o, i) => ({ origen: o.origen, parte: p[i] })); pintarOris(); }; });
    $('#fOriAdd', m).onclick = () => { oris.push({ origen: '', parte: modo === 'pct' ? 0 : 1 }); pintarOris(); };
    $('#fOris', m).addEventListener('change', e => { const el = e.target; if (el.dataset.k) { oris[Number(el.dataset.i)][el.dataset.k] = el.dataset.k === 'parte' ? Number(el.value) : el.value; pintarOris(); } });
    $('#fOris', m).addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) { oris.splice(Number(b.dataset.x), 1); pintarOris(); } });
  }
  $$('.cont-it', m).forEach(it => {
    const ck = $('input', it);
    ck.onchange = () => { it.classList.toggle('on', ck.checked); if (!ck.checked) $$('.niv button', it).forEach(x => x.classList.remove('on')); };
    $$('.niv button', it).forEach(b => { b.onclick = () => { $$('.niv button', it).forEach(x => x.classList.toggle('on', x === b)); ck.checked = true; it.classList.add('on'); }; });
  });
  const completar = (cambio) => {
    const c = num($('#fArc', m).value);
    const sl = num($('#fLim', m).value);
    const an = num($('#fAre', m).value);
    if (cambio !== 'are' && c !== null && sl !== null && c + sl <= 100) $('#fAre', m).value = Math.round((100 - c - sl) * 10) / 10;
    else if (cambio === 'are' && c !== null && an !== null && c + an <= 100) $('#fLim', m).value = Math.round((100 - c - an) * 10) / 10;
    pintarTex();
  };
  $('#fArc', m).oninput = () => completar('arc');
  $('#fLim', m).oninput = () => completar('lim');
  $('#fAre', m).oninput = () => completar('are');
  $('#fTri', m).onclick = e => {
    const svg = e.target.closest('svg');
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const q = pt.matrixTransform(svg.getScreenCTM().inverse());
    const r = triDesdeXY(q.x, q.y);
    if (r.a < 0) return;
    $('#fArc', m).value = r.c;
    $('#fLim', m).value = r.s;
    $('#fAre', m).value = r.a;
    pintarTex();
  };
  $('#fU', m).onclick = e => { const b = e.target.closest('[data-u]'); if (!b) return; unidad = b.dataset.u; $$('#fU button', m).forEach(x => x.classList.toggle('on', x === b)); };
}

const ESTADOS_ACOPIO_TXT = ['Cargando', 'En consumo', 'Agotado'];

function formMezcla(E) {
  const libres = E.sectores.filter(s => !acopioActivo(E, s.id));
  const fuentes = E.acopios.filter(a => a.estado !== 'Agotado' && a.stock > 0);
  if (!libres.length) return toast('No hay sectores libres para armar la mezcla', 'warn');
  if (fuentes.length < 2) return toast('Hacen falta al menos dos acopios con tierra', 'warn');
  const filas = [{ id: fuentes[0].id, pct: 50 }, { id: fuentes[1].id, pct: 50 }];
  const m = modal('Armar acopio de mezcla', '<div class="form"><label class="f">Sector de destino<select id="xSec">' + libres.map(s => '<option value="' + s.id + '">' + esc(s.nombre) + '</option>').join('') + '</select></label>' +
    '<label class="f">Nombre<input id="xNom" placeholder="Mezcla …"></label><label class="f">Toneladas a armar<input id="xT" type="number" min="1" step="10" value="500"></label></div><div id="xComp" class="mt"></div><button class="btn sm mt" id="xAdd">+ Otro acopio</button><div id="xRes" class="mt"></div>', [
    { txt: 'Cancelar' },
    {
      txt: 'Armar mezcla', cls: 'pri', fn: async mm => {
        const tot = sum(filas, x => Number(x.pct) || 0);
        if (Math.abs(tot - 100) > 0.5) { toast('Las proporciones tienen que sumar 100 %', 'warn'); return false; }
        const cx = ['arcilla', 'limo', 'arena'].map(k => { const v2 = filas.map(f => { const a = fuentes.find(x => x.id === f.id); const val = a ? (a[k] !== null && a[k] !== '' && a[k] !== undefined ? Number(a[k]) : a['muestra' + k.charAt(0).toUpperCase() + k.slice(1)]) : null; return val === null || val === undefined ? null : val * f.pct / 100; }); return v2.every(x => x !== null) ? Math.round(sum(v2, x => x) * 10) / 10 : null; });
        const tex = cx.every(x => x !== null) ? texturaUSDA(cx[0], cx[1], cx[2]) : '';
        const d = { sector: $('#xSec', mm).value, nombre: $('#xNom', mm).value, tipo: 'Mezcla', componentes: filas, toneladas: num($('#xT', mm).value) || 0, calidad: tex || 'Mezcla', arcilla: tex ? cx[0] : '', limo: tex ? cx[1] : '', arena: tex ? Math.round((100 - cx[0] - cx[1]) * 10) / 10 : '' };
        try { await escribir('guardarAcopio', d, 'Mezcla'); toast('Mezcla registrada: se descontaron las paladas de cada acopio', 'ok', 6000); vAcopios('plano'); return true; } catch (e) { toast(e.message, 'bad', 7000); return false; }
      }
    }
  ], 'grande');
  const pintar = () => {
    const T = num($('#xT', m).value) || 0;
    $('#xComp', m).innerHTML = filas.map((f, i) => '<div class="row mez" style="gap:8px;margin-bottom:6px"><select data-i="' + i + '" data-k="id" style="flex:1">' + fuentes.map(a => '<option value="' + a.id + '"' + (a.id === f.id ? ' selected' : '') + '>' + esc(a.nombre) + ' · ' + nf(a.stock) + ' t</option>').join('') + '</select>' +
      '<input data-i="' + i + '" data-k="pct" type="number" min="1" max="100" value="' + f.pct + '" style="width:80px"> %' + (filas.length > 2 ? '<button class="btn icon sm dan" data-x="' + i + '">' + ICON.borrar + '</button>' : '') + '</div>').join('');
    const tot = sum(filas, x => Number(x.pct) || 0);
    const comp = k => { const v = filas.map(f => { const a = fuentes.find(x => x.id === f.id); const val = a ? (a[k] !== null && a[k] !== '' && a[k] !== undefined ? Number(a[k]) : a['muestra' + k.charAt(0).toUpperCase() + k.slice(1)]) : null; return val === null || val === undefined ? null : val * f.pct / (tot || 1); }); return v.every(x => x !== null) ? sum(v, x => x) : null; };
    $('#xRes', m).innerHTML = '<div class="ajuste-res">' + filas.map(f => { const a = fuentes.find(x => x.id === f.id); const t = T * f.pct / 100; const fal = a && t > a.stock; return '<div class="' + (fal ? 'bad' : '') + '"><div class="l">' + esc(a ? a.nombre : '') + '</div><div class="v">≈ ' + nf(t / E.fMol) + ' paladas</div><div class="s">' + nf(t) + ' t · ≈ ' + nf(t / (E.densidad || 1.4)) + ' m³' + (fal ? ' · alcanza solo ' + nf(a.stock) + ' t' : '') + '</div></div>'; }).join('') + '</div>' +
      '<p class="sub mt">' + (Math.abs(tot - 100) > 0.5 ? '<span class="rojo">Las proporciones suman ' + nf(tot) + ' %.</span> ' : '') + 'Composición estimada: arcilla ' + nf(comp('arcilla'), 1) + ' % · limo ' + nf(comp('limo'), 1) + ' % · arena ' + nf(comp('arena'), 1) + ' %. Al confirmar se descuentan esas paladas de cada acopio y se suman a la mezcla.</p>';
  };
  pintar();
  $('#xT', m).oninput = pintar;
  $('#xComp', m).addEventListener('change', e => { const el = e.target; if (el.dataset.k) { filas[Number(el.dataset.i)][el.dataset.k] = el.dataset.k === 'pct' ? Number(el.value) : el.value; pintar(); } });
  $('#xComp', m).addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b) { filas.splice(Number(b.dataset.x), 1); pintar(); } });
  $('#xAdd', m).onclick = () => { const libre = fuentes.find(a => !filas.some(f => f.id === a.id)) || fuentes[0]; filas.push({ id: libre.id, pct: 0 }); pintar(); };
}

function detalleAcopio(E, a, dn) {
  const movs = E.movimientos.filter(x => x.acopio === a.id || x.destino === a.id);
  const nom = id => id === 'Molienda' ? 'Molienda' : ((E.acopios.find(x => x.id === id) || {}).nombre || '?');
  modal(a.nombre, '<div class="ajuste-res"><div><div class="l">Queda</div><div class="v">' + nf(a.stock) + ' t</div><div class="s">≈ ' + nf(a.stock / dn) + ' m³ · ≈ ' + nf(a.stock / E.fMol) + ' paladas</div></div>' +
    '<div><div class="l">Ingresó</div><div class="v">' + nf(a.base) + ' t</div><div class="s">' + nf(a.camiones) + ' camiones · ' + nf(a.ingresoPesado) + ' t pesadas' + (a.ingresoTraslado ? ' + ' + nf(a.ingresoTraslado) + ' t por traslado' : '') + '</div></div>' +
    '<div><div class="l">Consumido</div><div class="v">' + nf(a.consumoT) + ' t</div><div class="s">' + nf(a.consumoPaladas) + ' paladas</div></div></div>' +
    '<p class="sub mt">' + calidadTxt(a) + (a.muestras ? ' · ' + a.muestras + ' muestra(s) de calidad de sus camiones' + (a.rechazos ? ', ' + a.rechazos + ' rechazada(s)' : '') : '') + (a.observaciones ? '<br>' + esc(a.observaciones) : '') + '</p>' +
    '<h4>Consumos y traslados</h4>' + tabla([[x => x.acopio === a.id ? 'Sale a ' + esc(nom(x.destino)) : 'Entra de ' + esc(nom(x.acopio)), 'Movimiento'],
      [x => x.desde ? fCorta(x.desde) + ' ' + (x.turnoDesde || '') + (x.hasta ? ' → ' + fCorta(x.hasta) + ' ' + (x.turnoHasta || '') : ' → sigue') : '', 'Período'], [x => x.manual ? 'cargadas' : nf(x.proporcion) + ' % del Informe', 'Fuente'], [x => nf(x.pal), 'Paladas', 'n'], [x => nf(x.pal * E.fMol), 't', 'n']], movs, { vacio: 'Sin consumos registrados.' }), [{ txt: 'Cerrar' }], 'grande');
}

async function pintarDescargas(c, E) {
  const activos = E.acopios.filter(a => a.estado !== 'Agotado');
  const st = S.descargasF || { desde: addDias(hoy(), -7), hasta: addDias(hoy(), -1), solo: true };
  S.descargasF = st;
  c.innerHTML = '<div class="card"><div class="card-h"><div class="t"><h3>Descargas de camiones en acopios</h3><div class="sub">Tickets de la balanza de ingreso. Elegí uno o varios (Shift para un rango) y asignales el acopio donde descargaron.</div></div></div>' +
    '<div class="bar"><label class="f">Desde<input type="date" id="dD" value="' + st.desde + '"></label><label class="f">Hasta<input type="date" id="dH" value="' + st.hasta + '"></label><label class="chk"><input type="checkbox" id="dSolo"' + (st.solo ? ' checked' : '') + '> Solo sin asignar</label>' +
    '<div class="row right"><select id="dAc"><option value="">Acopio…</option>' + activos.map(a => '<option value="' + a.id + '">' + esc(a.nombre) + '</option>').join('') + '</select><button class="btn pri" id="dAsig">Asignar <span id="dN"></span></button><button class="btn" id="dQuit">Quitar asignación</button></div></div>' +
    '<div id="dTab"><div class="skel" style="height:200px"></div></div></div>';
  if (!activos.length) $('#dTab').insertAdjacentHTML('beforebegin', '<div class="alert warn">' + ICON.alerta + '<div>No hay acopios armados. Armá uno desde «Plano y stock».</div></div>');
  let filas = [];
  const selec = new Set();
  let ultimo = null;
  const nom = id => ((E.acopios.find(x => x.id === id) || {}).nombre || '');
  const pintar = () => {
    const vis = filas.filter(f => !st.solo || !f.acopio);
    $('#dN').textContent = selec.size ? '(' + selec.size + ' · ' + nf(sum(filas.filter(f => selec.has(f.clave)), f => f.neto)) + ' t)' : '';
    $('#dTab').innerHTML = vis.length ? '<div class="tw max"><table><thead><tr><th><input type="checkbox" id="dAll"></th><th>Fecha</th><th>Hora</th><th>Ticket</th><th>Dominio</th><th>Chofer</th><th>Origen</th><th class="n">Neto t</th><th>Acopio</th></tr></thead><tbody>' +
      vis.map(f => '<tr class="click ' + (selec.has(f.clave) ? 'sel' : '') + '" data-c="' + esc(f.clave) + '"><td><input type="checkbox" ' + (selec.has(f.clave) ? 'checked' : '') + '></td><td>' + fCorta(f.fecha) + '</td><td>' + esc(f.hora) + '</td><td>' + esc(f.ticket) + '</td><td>' + esc(f.dominio) + '</td><td>' + esc(f.chofer) + '</td><td>' + esc(f.origen) + '</td><td class="n">' + nf(f.neto, 2) + '</td><td>' + (f.acopio ? '<span class="tag t-ok">' + esc(nom(f.acopio)) + '</span>' : '<span class="tag t-mut">sin asignar</span>') + '</td></tr>').join('') +
      '</tbody></table></div><div class="sub mt">' + vis.length + ' tickets · ' + nf(sum(vis, f => f.neto)) + ' t</div>' : vacio(filas.length ? 'Todos los tickets del período ya tienen acopio.' : 'Sin pesajes de tierra en el período. Importá el PESAJE.XLS en Cargar → Balanza.');
    const all = $('#dAll');
    if (all) all.onchange = () => { vis.forEach(f => { if (all.checked) selec.add(f.clave); else selec.delete(f.clave); }); pintar(); };
  };
  const cargar = async () => {
    st.desde = $('#dD').value;
    st.hasta = $('#dH').value;
    try { filas = await api('descargasAcopio', { desde: st.desde, hasta: st.hasta }); } catch (e) { $('#dTab').innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>' + esc(e.message) + '</div></div>'; return; }
    selec.clear();
    pintar();
  };
  $('#dD').onchange = cargar;
  $('#dH').onchange = cargar;
  $('#dSolo').onchange = e => { st.solo = e.target.checked; pintar(); };
  $('#dTab').onclick = e => {
    const tr = e.target.closest('tr[data-c]');
    if (!tr) return;
    const vis = filas.filter(f => !st.solo || !f.acopio).map(f => f.clave);
    const k = tr.dataset.c;
    if (e.shiftKey && ultimo !== null) {
      const a = vis.indexOf(ultimo);
      const b = vis.indexOf(k);
      vis.slice(Math.min(a, b), Math.max(a, b) + 1).forEach(x => selec.add(x));
    } else if (selec.has(k)) selec.delete(k); else selec.add(k);
    ultimo = k;
    pintar();
  };
  const enviar = async acopio => {
    if (!selec.size) return toast('Elegí al menos un ticket', 'warn');
    if (acopio === null) { acopio = $('#dAc').value; if (!acopio) return toast('Elegí el acopio', 'warn'); }
    bloquear('Guardando…');
    try {
      const r = await api('asignarDescargas', { claves: Array.from(selec), acopio: acopio });
      toast(acopio ? r.asignados + ' camiones (' + nf(r.toneladas) + ' t) asignados a ' + nom(acopio) : r.quitados + ' asignaciones quitadas', 'ok');
      await cargar();
    } catch (e) { toast(e.message, 'bad'); } finally { desbloquear(); }
  };
  $('#dAsig').onclick = () => enviar(null);
  $('#dQuit').onclick = () => enviar('');
  cargar();
}

function pintarConsumos(c, E, dn) {
  const activos = E.acopios.filter(a => a.estado !== 'Agotado');
  const nom = id => id === 'Molienda' ? 'Molienda' : ((E.acopios.find(x => x.id === id) || {}).nombre || '?');
  const turnos = ['T1', 'T2', 'T3'];
  const sel = S.acopioSel || (activos[0] || {}).id || '';
  c.innerHTML = '<div class="grid g-21" style="align-items:start"><div class="card"><div class="card-h"><div class="t"><h3>Registrar consumo</h3><div class="sub">De qué acopio se molió y desde cuándo. Las paladas salen del Informe de Producción; si las sabés, cargalas para corregir.</div></div></div>' +
    '<div class="form"><label class="f">Acopio<select id="cA">' + activos.map(a => '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.nombre) + ' · ' + nf(a.stock) + ' t</option>').join('') + '</select></label>' +
    '<label class="f">Destino<select id="cDst"><option value="Molienda">Molienda (cajón alimentador)</option>' + activos.map(a => '<option value="' + a.id + '">Traslado a ' + esc(a.nombre) + '</option>').join('') + '</select></label>' +
    '<label class="f">Desde<div class="row" style="gap:6px;flex-wrap:nowrap"><input type="date" id="cD" value="' + addDias(hoy(), -1) + '"><select id="cTD">' + opts(turnos, 'T1', null) + '</select></div></label>' +
    '<label class="f">Hasta (vacío = sigue)<div class="row" style="gap:6px;flex-wrap:nowrap"><input type="date" id="cH"><select id="cTH">' + opts(turnos, 'T3', null) + '</select></div></label>' +
    '<label class="f">% de las paladas del turno<input id="cP" type="number" min="1" max="100" value="100"></label>' +
    '<label class="f">Paladas (opcional, corrige el Informe)<input id="cPal" type="number" min="1" step="1"></label>' +
    '<label class="f full">Observaciones<input id="cO"></label></div><div class="row mt"><button class="btn pri" id="cG">' + ICON.guardar + 'Guardar</button></div>' +
    '<p class="sub mt">Si se muele de dos acopios a la vez, cargá uno con 60 % y el otro con 40 % para el mismo período. Para marcar que un acopio se terminó usá «Agotado» en el plano.</p></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Turnos de molienda sin acopio</h3><div class="sub">Desde el primer consumo registrado</div></div></div>' +
    tabla([[x => fCorta(x.fecha), 'Fecha'], ['turno', 'Turno'], [x => nf(x.paladas), 'Paladas', 'n'], [x => nf(x.asignado) + ' %', 'Asignado', 'n']], E.sinAsignar.slice().reverse(), { vacio: 'Todos los turnos tienen acopio asignado.' }) + '</div></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Consumos y traslados registrados</h3></div></div>' +
    tabla([[x => esc(nom(x.acopio)), 'Acopio'], [x => esc(nom(x.destino)), 'Destino'], [x => x.desde ? fCorta(x.desde) + ' ' + (x.turnoDesde || '') + (x.hasta ? ' → ' + fCorta(x.hasta) + ' ' + (x.turnoHasta || '') : ' → sigue') : '', 'Período'],
      [x => x.manual ? '<span class="tag t-acc">cargadas</span>' : nf(x.proporcion) + ' % · ' + nf(x.turnos.length) + ' turnos', 'Fuente'], [x => nf(x.pal), 'Paladas', 'n'], [x => nf(x.pal * E.fMol), 't', 'n'], [x => nf(x.pal * E.fMol / dn), '≈ m³', 'n'], [x => esc(x.observaciones), 'Obs.', 'wrap'],
      [x => '<button class="btn icon sm dan" data-mx="' + x.id + '">' + ICON.borrar + '</button>', '']], E.movimientos, { vacio: 'Sin consumos registrados.' }) + '</div>';
  S.acopioSel = '';
  $('#cG').onclick = async () => {
    const d = { acopio: $('#cA').value, destino: $('#cDst').value, desde: $('#cD').value, turnoDesde: $('#cTD').value, hasta: $('#cH').value, turnoHasta: $('#cTH').value, proporcion: $('#cP').value, paladas: $('#cPal').value, observaciones: $('#cO').value };
    if (!d.acopio) return toast('Elegí el acopio', 'warn');
    try { await escribir('guardarMovimientoAcopio', d, 'Consumo de acopio'); toast('Consumo guardado', 'ok'); vAcopios('consumos'); } catch (e) { toast(e.message, 'bad', 7000); }
  };
  c.onclick = async e => {
    const b = e.target.closest('button[data-mx]');
    if (!b || !(await confirmar('Eliminar', '¿Eliminar este consumo?', 'Eliminar', true))) return;
    try { await escribir('eliminarMovimientoAcopio', { id: b.dataset.mx }, 'Eliminar consumo'); vAcopios('consumos'); } catch (er) { toast(er.message, 'bad'); }
  };
}

function pintarSectores(c, E) {
  const sect = E.sectores.map(s => Object.assign({}, s));
  let sel = sect.length ? 0 : -1;
  const pintar = () => {
    const ED = { sectores: sect };
    c.innerHTML = '<div class="grid g-21" style="align-items:start"><div class="card plano-card"><div class="card-h"><div class="t"><h3>Dibujar sectores</h3><div class="sub">Elegí un sector a la derecha y tocá las celdas de la playa para sumarlas o quitarlas. Las referencias (filas A–Y, columnas 1–14) están en el borde de la playa.</div></div>' + botonFoto() + '</div>' + avisoViejos(ED) + planoSVG(ED, { editor: true, sel: sel }) + '</div>' +
      '<div class="card"><div class="card-h"><div class="t"><h3>Sectores</h3><div class="sub">Lugares fijos de descarga</div></div><button class="btn sm" id="sAdd">+ Sector</button></div>' +
      '<div class="col" style="gap:6px">' + sect.map((s, i) => '<div class="sect-it ' + (i === sel ? 'on' : '') + '" data-i="' + i + '"><span class="sw" style="background:' + (s.color || COLORES_SECTOR[i % COLORES_SECTOR.length]) + '"></span><input data-i="' + i + '" value="' + esc(s.nombre) + '"><span class="sub">' + celdasDe(s).length + ' celdas</span><button class="btn icon sm dan" data-x="' + i + '">' + ICON.borrar + '</button></div>').join('') + '</div>' +
      '<div class="row mt"><button class="btn pri" id="sG">' + ICON.guardar + 'Guardar sectores</button></div></div></div>';
    $$('.plano .cel', c).forEach(r => {
      r.onclick = () => {
        if (sel < 0) return toast('Primero creá o elegí un sector', 'warn');
        const k = r.dataset.cel;
        sect.forEach((s, i) => { s.celdas = celdasDe(s).filter(x => i === sel || x !== k).join(';'); });
        const cs = celdasDe(sect[sel]);
        sect[sel].celdas = (cs.indexOf(k) >= 0 ? cs.filter(x => x !== k) : cs.concat([k])).join(';');
        pintar();
      };
    });
    enlazarFoto(c, pintar);
    $$('.sect-it', c).forEach(d => { d.onclick = e => { if (e.target.tagName === 'INPUT' || e.target.closest('button')) return; sel = Number(d.dataset.i); pintar(); }; });
    $$('.sect-it input', c).forEach(inp => { inp.oninput = () => { sect[Number(inp.dataset.i)].nombre = inp.value; }; inp.onfocus = () => { sel = Number(inp.dataset.i); $$('.sect-it', c).forEach(x => x.classList.toggle('on', Number(x.dataset.i) === sel)); }; });
    $$('.sect-it [data-x]', c).forEach(b => {
      b.onclick = async () => {
        const s = sect[Number(b.dataset.x)];
        if (s.id && E.acopios.some(a => a.sector === s.id && a.estado !== 'Agotado')) return toast('El sector tiene un acopio activo', 'warn');
        sect.splice(Number(b.dataset.x), 1);
        sel = Math.min(sel, sect.length - 1);
        pintar();
      };
    });
    $('#sAdd').onclick = () => { sect.push({ nombre: 'Sector ' + (sect.length + 1), celdas: '', color: COLORES_SECTOR[sect.length % COLORES_SECTOR.length], activo: true }); sel = sect.length - 1; pintar(); };
    $('#sG').onclick = async () => {
      try { const r = await api('guardarSectores', { filas: sect }); toast(r.guardados + ' sectores guardados', 'ok'); vAcopios('sectores'); } catch (e) { toast(e.message, 'bad', 7000); }
    };
  };
  pintar();
}
