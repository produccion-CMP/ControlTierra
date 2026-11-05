'use strict';

const PLANO = { w: 825, h: 965, cols: 16, filas: 20, img: 'img/playa-acopios.jpg' };
const CELDAS_ACOPIO = 'C2,D1,D2,D3,D4,E1,E2,E3,E4,E5,F1,F2,F3,F4,F5,F6,G1,G2,G3,G4,G5,G6,G7,H1,H2,H3,H4,H5,H6,H7,H8,I1,I2,I3,I4,I5,I6,I7,I8,I9,J1,J2,J3,J4,J5,J6,J7,J8,J9,J10,J11,K1,K2,K3,K4,K5,K6,K7,K8,K9,K10,K11,K12,L1,L2,L3,L4,L5,L6,L7,L8,L9,L10,L11,L12,L13,M1,M2,M3,M4,M5,M6,M7,M8,M9,M10,M11,M12,M13,M14,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10,N11,N12,N13,O1,O2,O3,O4,O5,O6,O7,O8,O9,O10,O11,O12,P1,P2,P3,P4,P5,P6,P7,P8,P9,P10,P11,Q9,Q10,Q11,R9,R10,S9'.split(',');
const COLOR_ESTADO_ACOPIO = { Cargando: '#2a78d6', 'En consumo': '#1f8a4c', Agotado: '#9ca3af', '': '#d96b3a' };
const COLORES_SECTOR = ['#d96b3a', '#2a78d6', '#1f8a4c', '#b56a00', '#7c3aed', '#c0261d', '#0e7490', '#a16207', '#be185d', '#4d7c0f'];
const CALIDADES_ACOPIO = ['Arcillosa', 'Limosa', 'Arenosa', 'Balanceada', 'Con piedras', 'Mezcla', 'Otra'];

const celdaXY = c => { const r = c.charCodeAt(0) - 65; const k = Number(c.slice(1)) - 1; return { x: k * PLANO.w / PLANO.cols, y: r * PLANO.h / PLANO.filas, w: PLANO.w / PLANO.cols, h: PLANO.h / PLANO.filas }; };
const celdasDe = s => String(s.celdas || '').split(';').filter(Boolean);

function acopioDeSector(E, sid) {
  return E.acopios.filter(a => a.sector === sid).sort((a, b) => (a.estado === 'Agotado') - (b.estado === 'Agotado') || (String(b.ts) > String(a.ts) ? 1 : -1))[0] || null;
}

function acopioActivo(E, sid) {
  return E.acopios.find(a => a.sector === sid && a.estado !== 'Agotado') || null;
}

function planoSVG(E, op) {
  const o = op || {};
  const centro = cs => { const p = cs.map(celdaXY); return { x: sum(p, q => q.x + q.w / 2) / p.length, y: sum(p, q => q.y + q.h / 2) / p.length }; };
  let h = '<svg class="plano" viewBox="0 0 ' + PLANO.w + ' ' + PLANO.h + '" role="img" aria-label="Plano de acopios"><image href="' + PLANO.img + '" x="0" y="0" width="' + PLANO.w + '" height="' + PLANO.h + '" preserveAspectRatio="none"/>';
  if (o.editor) {
    const dueño = {};
    E.sectores.forEach((s, i) => celdasDe(s).forEach(c => { dueño[c] = i; }));
    h += CELDAS_ACOPIO.map(c => { const q = celdaXY(c); const i = dueño[c]; const s = i === undefined ? null : E.sectores[i]; return '<rect class="cel ed ' + (s && i === o.sel ? 'sel' : '') + '" data-cel="' + c + '" x="' + q.x + '" y="' + q.y + '" width="' + q.w + '" height="' + q.h + '" style="fill:' + (s ? (s.color || COLORES_SECTOR[i % COLORES_SECTOR.length]) : 'transparent') + ';fill-opacity:' + (s ? (i === o.sel ? 0.7 : 0.4) : 0) + '"><title>' + c + (s ? ' · ' + esc(s.nombre) : '') + '</title></rect>'; }).join('');
    h += E.sectores.map((s, i) => { const cs = celdasDe(s); if (!cs.length) return ''; const p = centro(cs); return '<text class="lbl" x="' + p.x + '" y="' + p.y + '" text-anchor="middle">' + esc(s.nombre) + '</text>'; }).join('');
    return h + '</svg>';
  }
  E.sectores.forEach((s, i) => {
    const cs = celdasDe(s);
    if (!cs.length) return;
    const a = acopioActivo(E, s.id);
    const col = a ? COLOR_ESTADO_ACOPIO[a.estado] || COLOR_ESTADO_ACOPIO[''] : '#e5e7eb';
    h += '<g class="sec ' + (o.sel === s.id ? 'sel' : '') + '" data-sec="' + s.id + '">' + cs.map(c => { const q = celdaXY(c); return '<rect x="' + q.x + '" y="' + q.y + '" width="' + (q.w + 0.6) + '" height="' + (q.h + 0.6) + '" style="fill:' + col + '"/>'; }).join('');
    const p = centro(cs);
    h += '<text class="lbl" x="' + p.x + '" y="' + (p.y - 6) + '" text-anchor="middle">' + esc(s.nombre) + '</text><text class="lbl2" x="' + p.x + '" y="' + (p.y + 16) + '" text-anchor="middle">' + (a ? nf(a.stock) + ' t' : 'libre') + '</text>';
    h += '<title>' + esc(s.nombre) + (a ? ' · ' + esc(a.nombre) + ' · ' + nf(a.stock) + ' t · ' + a.estado : ' · sin acopio') + '</title></g>';
  });
  return h + '</svg>';
}

function calidadTxt(a) {
  const comp = ['arcilla', 'limo', 'arena'].map(k => a[k] !== null && a[k] !== '' && a[k] !== undefined ? nf(a[k]) : null);
  const mu = ['muestraArcilla', 'muestraLimo', 'muestraArena'].map(k => a[k] !== null && a[k] !== undefined ? nf(a[k]) : null);
  const partes = [];
  if (a.calidad) partes.push(esc(a.calidad));
  if (comp.some(x => x !== null)) partes.push('Arc/Lim/Are ' + comp.map(x => x === null ? '–' : x).join('/') + ' %');
  else if (mu.some(x => x !== null)) partes.push('Muestras ' + mu.map(x => x === null ? '–' : x).join('/') + ' %');
  if (a.humedad) partes.push('humedad ' + esc(a.humedad.toLowerCase()));
  if (a.piedrasNivel) partes.push('piedras: ' + esc(a.piedrasNivel.toLowerCase()));
  return partes.join(' · ');
}

async function vAcopios(tab) {
  const ok = vivo();
  app().innerHTML = '<div class="vista"><div class="card"><div class="skel" style="height:420px"></div></div></div>';
  const E = await api('acopios');
  if (!ok()) return;
  S.acopios = E;
  const t = ['plano', 'descargas', 'consumos', 'sectores'].indexOf(tab) >= 0 ? tab : 'plano';
  const tabs = [['plano', 'Plano y stock']];
  if (puede('acopios')) tabs.push(['descargas', 'Descargas (balanza)']);
  if (puede('acopiosConsumo')) tabs.push(['consumos', 'Consumos y traslados']);
  if (esAdmin()) tabs.push(['sectores', 'Dibujar sectores']);
  const dn = E.densidad || 1.4;
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Playa de molienda</div><h1>Acopios</h1><p class="sub">Dónde se descarga cada tierra, cuánto queda en cada acopio y de dónde se está moliendo.</p></div><div id="segAc"></div></div>' +
    (S.ses ? E.avisos : []).map(a => '<div class="alert ' + a[0] + '">' + ICON.alerta + '<div>' + esc(a[1]) + '</div></div>').join('') + '<div id="acCont"></div></div>';
  segmento($('#segAc'), tabs, t, k => { location.hash = '#/acopios/' + k; }, true);
  const c = $('#acCont');
  if (t === 'plano') return pintarPlanoAcopios(c, E, dn);
  if (t === 'descargas') return pintarDescargas(c, E);
  if (t === 'consumos') return pintarConsumos(c, E, dn);
  return pintarSectores(c, E);
}

function pintarPlanoAcopios(c, E, dn) {
  const activos = E.acopios.filter(a => a.estado !== 'Agotado');
  const sinSect = !E.sectores.length;
  c.innerHTML = '<div class="kpis stagger">' + kpi('En acopios', vn(E.totalAcopios) + '<small>t</small>', '≈ ' + nf(E.totalAcopios / dn) + ' m³ · ' + activos.length + ' activos', 'kacc') +
    kpi('Stock de playa calculado', E.stockPlaya === null ? 'sin dato' : vn(E.stockPlaya) + '<small>t</small>', 'balance de ingreso y molienda') +
    kpi('t por palada', vn(E.fMol, 2), nf(E.m3Palada) + ' m³ de balde · ' + nf(dn, 2) + ' t/m³') +
    kpi('Turnos sin acopio', vn(E.sinAsignar.length), 'molienda sin asignar', E.sinAsignar.length ? 'warn' : 'ok') + '</div>' +
    (sinSect ? '<div class="alert info">' + ICON.infoI + '<div>Todavía no hay sectores dibujados. ' + (esAdmin() ? '<a href="#/acopios/sectores">Dibujalos en el plano</a>.' : 'El administrador tiene que dibujarlos.') + '</div></div>' : '') +
    '<div class="grid g-21" style="align-items:start"><div class="card plano-card"><div class="card-h"><div class="t"><h3>Plano</h3><div class="sub">Tocá un sector para ver su acopio</div></div>' +
    (puede('acopiosConsumo') ? '<button class="btn sm" id="bMezcla">' + ICON.ajuste + 'Armar mezcla</button>' : '') + '</div>' + planoSVG(E, {}) +
    '<div class="leg">' + Object.keys(COLOR_ESTADO_ACOPIO).filter(Boolean).map(k => '<span class="sw" style="--c:' + COLOR_ESTADO_ACOPIO[k] + '"></span>' + k).join('') + '<span class="sw" style="--c:#e5e7eb"></span>Libre</div></div>' +
    '<div class="col" id="acLista" style="gap:12px">' + E.sectores.map(s => tarjetaSector(E, s, dn)).join('') + '</div></div>';
  stagger(c);
  contar(c);
  $$('.plano .sec', c).forEach(g => { g.onclick = () => { const el = $('#sec-' + g.dataset.sec); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1200); } }; });
  if ($('#bMezcla')) $('#bMezcla').onclick = () => formMezcla(E);
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
    (a ? '<h3 style="margin:2px 0">' + esc(a.nombre) + '</h3><div class="sub">' + (a.tipo === 'Mezcla' ? 'Mezcla: ' + a.componentes.map(x => { const o = E.acopios.find(y => y.id === x.id); return (o ? esc(o.nombre) : '?') + ' ' + nf(x.pct) + ' %'; }).join(' + ') : 'Origen: ' + esc(a.origen)) + '</div><div class="sub">' + calidadTxt(a) + '</div>'
      : '<h3 style="margin:2px 0">Libre</h3><div class="sub">' + (ult ? 'Último: ' + esc(ult.nombre) + ' (agotado ' + fCorta(ult.agotado) + ')' : 'Sin acopios todavía') + '</div>') +
    '</div>' + (a ? '<span class="tag" style="background:' + COLOR_ESTADO_ACOPIO[a.estado] + '22;color:' + COLOR_ESTADO_ACOPIO[a.estado] + '">' + esc(a.estado) + '</span>' : '') + '</div>' +
    (a ? '<div class="ac-stock"><div><b>' + nf(a.stock) + ' t</b><small> ≈ ' + nf(a.stock / dn) + ' m³ · ≈ ' + nf(a.stock / E.fMol) + ' paladas</small></div><div class="barra"><span style="width:' + pct + '%"></span></div>' +
      '<div class="sub">Ingresó ' + nf(a.base) + ' t' + (a.tMedida !== null && a.tMedida !== '' && a.tMedida !== undefined ? ' (medido)' : ' (' + nf(a.camiones) + ' camiones' + (a.ingresoTraslado ? ' + traslados' : '') + ')') + ' · consumido ' + nf(a.consumoT) + ' t (' + nf(a.consumoPaladas) + ' paladas)' + (a.rechazos ? ' · <span class="rojo">' + a.rechazos + ' rechazo(s)</span>' : '') + '</div></div>' : '') +
    '<div class="row mt" style="gap:6px">' + bot.join('') + '</div></div>';
}

function formAcopio(E, sid, a) {
  const s = E.sectores.find(x => x.id === sid);
  const v = k => a && a[k] !== null && a[k] !== undefined ? a[k] : '';
  const lug = nombres('Lugares');
  let unidad = 't';
  const m = modal((a ? 'Editar acopio · ' : 'Armar acopio · ') + (s ? s.nombre : ''), '<div class="form">' +
    '<label class="f">Nombre<input id="fNom" value="' + esc(v('nombre')) + '" placeholder="' + esc((s ? s.nombre : '') + ' · origen') + '"></label>' +
    (a && a.tipo === 'Mezcla' ? '<label class="f">Tipo<input value="Mezcla" disabled></label>' : '<label class="f">Origen de la tierra<select id="fOri">' + opts(lug, v('origen'), 'Elegir…') + '</select></label>') +
    '<label class="f">Calidad<select id="fCal">' + opts(CALIDADES_ACOPIO, v('calidad'), 'Sin indicar') + '</select></label>' +
    '<label class="f">Humedad<select id="fHum">' + opts(['Seca', 'Normal', 'Húmeda'], v('humedad'), 'Sin indicar') + '</select></label>' +
    '<label class="f">Piedras<select id="fPie">' + opts(['Sin piedras', 'Pocas', 'Muchas'], v('piedrasNivel'), 'Sin indicar') + '</select></label>' +
    '<label class="f">% arcilla<input id="fArc" type="number" min="0" max="100" step="0.5" value="' + esc(v('arcilla')) + '"></label>' +
    '<label class="f">% limo<input id="fLim" type="number" min="0" max="100" step="0.5" value="' + esc(v('limo')) + '"></label>' +
    '<label class="f">% arena<input id="fAre" type="number" min="0" max="100" step="0.5" value="' + esc(v('arena')) + '"></label>' +
    '<label class="f">Cantidad medida al cerrar (opcional)<div class="row" style="gap:8px;flex-wrap:nowrap"><input id="fMed" type="number" min="0" step="1" style="flex:1" value="' + esc(v('tMedida')) + '"><span class="unid-tog" id="fU"><button type="button" data-u="t" class="on">t</button><button type="button" data-u="m3">m³</button></span></div></label>' +
    (a ? '<label class="f">Estado<select id="fEst">' + opts(ESTADOS_ACOPIO_TXT, v('estado'), null) + '</select></label>' : '') +
    '<label class="f full">Observaciones<input id="fObs" value="' + esc(v('observaciones')) + '"></label>' +
    '<p class="f full sub">Si no cargás la cantidad medida, el acopio suma las toneladas de los camiones que se asignen en «Descargas». Para medir con odómetro usá m³ (perímetro y altura con la calculadora de Ajuste de stock).</p></div>', [
    { txt: 'Cancelar' },
    {
      txt: 'Guardar', cls: 'pri', fn: async mm => {
        const med = num($('#fMed', mm).value);
        const d = {
          id: a ? a.id : '', sector: sid, nombre: $('#fNom', mm).value, tipo: a ? a.tipo : 'Simple', origen: $('#fOri', mm) ? $('#fOri', mm).value : 'Mezcla', calidad: $('#fCal', mm).value, humedad: $('#fHum', mm).value,
          piedrasNivel: $('#fPie', mm).value, arcilla: $('#fArc', mm).value, limo: $('#fLim', mm).value, arena: $('#fAre', mm).value, tMedida: med === null ? '' : Math.round(unidad === 'm3' ? med * (E.densidad || 1.4) : med),
          observaciones: $('#fObs', mm).value, estado: $('#fEst', mm) ? $('#fEst', mm).value : '', componentes: a ? a.componentes : []
        };
        try { await escribir('guardarAcopio', d, 'Acopio ' + d.nombre); toast('Acopio guardado', 'ok'); vAcopios('plano'); return true; } catch (e) { toast(e.message, 'bad', 7000); return false; }
      }
    }
  ]);
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
        const d = { sector: $('#xSec', mm).value, nombre: $('#xNom', mm).value, tipo: 'Mezcla', componentes: filas, toneladas: num($('#xT', mm).value) || 0, calidad: 'Mezcla' };
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
    c.innerHTML = '<div class="grid g-21" style="align-items:start"><div class="card plano-card"><div class="card-h"><div class="t"><h3>Dibujar sectores</h3><div class="sub">Elegí un sector a la derecha y tocá las celdas del plano para sumarlas o quitarlas.</div></div></div>' + planoSVG(ED, { editor: true, sel: sel }) + '</div>' +
      '<div class="card"><div class="card-h"><div class="t"><h3>Sectores</h3><div class="sub">Lugares fijos de descarga</div></div><button class="btn sm" id="sAdd">+ Sector</button></div>' +
      '<div class="col" style="gap:6px">' + sect.map((s, i) => '<div class="sect-it ' + (i === sel ? 'on' : '') + '" data-i="' + i + '"><span class="sw" style="background:' + (s.color || COLORES_SECTOR[i % COLORES_SECTOR.length]) + '"></span><input data-i="' + i + '" value="' + esc(s.nombre) + '"><span class="sub">' + celdasDe(s).length + ' celdas</span><button class="btn icon sm dan" data-x="' + i + '">' + ICON.borrar + '</button></div>').join('') + '</div>' +
      '<div class="row mt"><button class="btn pri" id="sG">' + ICON.guardar + 'Guardar sectores</button></div></div></div>';
    $$('.plano .cel', c).forEach(r => {
      r.onclick = () => {
        if (sel < 0) return toast('Primero creá o elegí un sector', 'warn');
        const k = r.dataset.cel;
        sect.forEach((s, i) => { if (i !== sel) s.celdas = celdasDe(s).filter(x => x !== k).join(';'); });
        const cs = celdasDe(sect[sel]);
        sect[sel].celdas = (cs.indexOf(k) >= 0 ? cs.filter(x => x !== k) : cs.concat([k])).join(';');
        pintar();
      };
    });
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
