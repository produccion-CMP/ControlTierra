'use strict';

const S = {
  ses: null,
  resumen: null,
  rango: null,
  rangoK: '',
  desde: '',
  hasta: '',
  preset: '30',
  cola: [],
  procesando: false,
  charts: {},
  cfg: null,
  ed: null,
  vf: null,
  imp: null,
  cal: null
};

const PERMISOS = {
  jornada: ['cantera'],
  viajes: ['cantera', 'balanza'],
  pesaje: ['balanza'],
  molienda: ['molienda'],
  calidad: ['calidad', 'balanza'],
  ajustes: ['admin']
};

const MODULOS = [
  ['jornada', 'Jornada de cantera', 'Tramos de producción y paradas por máquina, horómetros y paladas.'],
  ['viajes', 'Viajes de camiones', 'Comprobantes de viaje con horarios, chofer, dominio y paladas.'],
  ['pesaje', 'Balanza de ingreso', 'Importar PESAJE.XLS y cruzarlo con los viajes.'],
  ['molienda', 'Molienda y silo', 'Paladas al cajón, balanza dinámica y extracción de silo por turno.'],
  ['calidad', 'Calidad de tierra', 'Inspección visual, ensayo arcilla/limo/arena y aceptación por viaje.'],
  ['ajustes', 'Ajustes de stock', 'Stock inicial y cubicaciones de playa y silo.']
];

const COL = ['#b5532b', '#2f6690', '#2f7d4f', '#c58a1c', '#7b4fa0', '#8a7f74', '#d4785a', '#4f95c4'];
const CAUSAS_PERSONAL_MULTI = ['Avería mecánica', 'Mantenimiento programado'];
const CAUSAS_PERSONAL_UNO = ['Ausencia de operario', 'Condiciones climáticas', 'Sin operario'];
const CAUSAS_HOROMETRO = ['Avería mecánica', 'Mantenimiento programado'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const app = () => $('#app');
const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hoy = () => iso(new Date());
const aFecha = f => { const p = f.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
const addDias = (f, n) => { const d = aFecha(f); d.setDate(d.getDate() + n); return iso(d); };
const fCorta = f => f ? f.slice(8, 10) + '/' + f.slice(5, 7) : '';
const fLarga = f => aFecha(f).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const nf = (n, d = 0) => (n === null || n === undefined || isNaN(n) || !isFinite(n)) ? '–' : Number(n).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = v => { if (v === '' || v === null || v === undefined) return null; const n = Number(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
const sum = (a, f) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const minDe = h => { const m = String(h || '').match(/(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const dur = (a, b) => { const x = minDe(a); const y = minDe(b); if (x === null || y === null) return 0; return ((y - x + 1440) % 1440) / 60; };
const normDom = d => String(d || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const quant = (a, q) => { const p = (a.length - 1) * q; const b = Math.floor(p); return a[b + 1] !== undefined ? a[b] + (p - b) * (a[b + 1] - a[b]) : a[b]; };
const agrupar = (arr, fk) => arr.reduce((m, x) => { const k = fk(x); (m[k] = m[k] || []).push(x); return m; }, {});
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { console.warn(e); } };

function activos(hoja) {
  return ((S.resumen && S.resumen.catalogos && S.resumen.catalogos[hoja]) || []).filter(x => x.activo);
}

function nombres(hoja, campo = 'nombre') {
  return activos(hoja).map(x => x[campo]).sort((a, b) => String(a).localeCompare(String(b)));
}

function opts(arr, sel, ph = 'Seleccionar…') {
  const lista = arr.slice();
  if (sel && lista.indexOf(sel) < 0) lista.unshift(sel);
  return (ph === null ? '' : '<option value="">' + esc(ph) + '</option>') +
    lista.map(v => '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(v) + '</option>').join('');
}

function puede(mod) {
  return !!S.ses && (S.ses.rol === 'admin' || (PERMISOS[mod] || []).indexOf(S.ses.rol) >= 0);
}

function loading(txt) {
  $('#loaderTxt').textContent = txt || 'Cargando…';
  $('#loader').classList.add('on');
}

function loaded() {
  $('#loader').classList.remove('on');
}

function toast(msg, tipo = 'info', ms = 4500) {
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function modal(titulo, html, acciones) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = '<div class="modal"><h3>' + esc(titulo) + '</h3><div class="mb">' + html + '</div><div class="acts"></div></div>';
  const cerrar = () => bg.remove();
  const acts = $('.acts', bg);
  (acciones || [{ txt: 'Cerrar' }]).forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.cls || '');
    b.textContent = a.txt;
    b.onclick = async () => {
      if (!a.fn) return cerrar();
      const r = await a.fn(bg);
      if (r !== false) cerrar();
    };
    acts.appendChild(b);
  });
  bg.addEventListener('click', e => { if (e.target === bg) cerrar(); });
  document.body.appendChild(bg);
  const primero = $('input, select', bg);
  if (primero) primero.focus();
  return bg;
}

function confirmar(titulo, texto) {
  return new Promise(res => {
    modal(titulo, '<p>' + texto + '</p>', [
      { txt: 'Cancelar', fn: () => { res(false); } },
      { txt: 'Confirmar', cls: 'pri', fn: () => { res(true); } }
    ]);
  });
}

function csv(nombre, cols, filas) {
  const q = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const txt = '﻿' + [cols.map(c => q(c[1])).join(';')].concat(filas.map(f => cols.map(c => {
    const v = typeof c[0] === 'function' ? c[0](f) : f[c[0]];
    return q(typeof v === 'number' ? String(v).replace('.', ',') : v);
  }).join(';'))).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  a.download = nombre + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function tabla(cols, filas, op = {}) {
  if (!filas.length) return '<div class="empty">' + (op.vacio || 'Sin registros en el período.') + '</div>';
  const th = cols.map(c => '<th class="' + (c[2] === 'n' ? 'n' : '') + '">' + esc(c[1]) + '</th>').join('');
  const tb = filas.map(f => '<tr>' + cols.map(c => {
    const v = typeof c[0] === 'function' ? c[0](f) : esc(f[c[0]]);
    return '<td class="' + (c[2] || '') + '">' + (v === undefined || v === null ? '' : v) + '</td>';
  }).join('') + '</tr>').join('');
  return '<div class="tw ' + (op.max ? 'max' : '') + '"><table><thead><tr>' + th + '</tr></thead><tbody>' + tb + '</tbody></table></div>';
}

function kpi(l, v, d, cls) {
  return '<div class="kpi ' + (cls || '') + '"><div class="l">' + esc(l) + '</div><div class="v">' + v + '</div>' + (d ? '<div class="d">' + d + '</div>' : '') + '</div>';
}

function mezclar(a, b) {
  const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
  Object.keys(b || {}).forEach(k => {
    o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') ? mezclar(a[k], b[k]) : b[k];
  });
  return o;
}

function destruirGraficos() {
  Object.keys(S.charts).forEach(k => { try { S.charts[k].destroy(); } catch (e) { console.warn(e); } });
  S.charts = {};
}

function grafico(id, tipo, labels, datasets, extra) {
  const el = document.getElementById(id);
  if (!el || typeof Chart === 'undefined') return;
  if (S.charts[id]) S.charts[id].destroy();
  const css = getComputedStyle(document.documentElement);
  const tx = css.getPropertyValue('--muted').trim();
  const gr = css.getPropertyValue('--line').trim();
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: tx, boxWidth: 12, usePointStyle: true } },
      tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + nf(typeof c.parsed === 'object' ? (c.chart.options.indexAxis === 'y' ? c.parsed.x : c.parsed.y) : c.parsed, 2) } }
    },
    scales: tipo === 'doughnut' ? {} : {
      x: { ticks: { color: tx, maxRotation: 0, autoSkip: true }, grid: { display: false } },
      y: { ticks: { color: tx }, grid: { color: gr }, beginAtZero: true }
    }
  };
  if (tipo === 'doughnut') {
    base.interaction = { mode: 'nearest', intersect: true };
    base.plugins.tooltip.callbacks.label = c => ' ' + c.label + ': ' + nf(c.parsed, 1);
  }
  S.charts[id] = new Chart(el, { type: tipo, data: { labels: labels, datasets: datasets }, options: mezclar(base, extra || {}) });
}

function caja(id, titulo, sub, lg) {
  return '<div class="card"><div class="card-h"><div><h3>' + esc(titulo) + '</h3>' + (sub ? '<div class="sub">' + sub + '</div>' : '') +
    '</div></div><div class="chart ' + (lg ? 'lg' : '') + '"><canvas id="' + id + '"></canvas></div></div>';
}

async function api(accion, datos) {
  const url = window.CONFIG && window.CONFIG.API_URL;
  if (!url || url.indexOf('REEMPLAZAR') >= 0) throw Object.assign(new Error('Configure API_URL en config.js'), { servidor: true });
  const r = await fetch(url, { method: 'POST', body: JSON.stringify({ accion: accion, datos: datos || {}, token: S.ses ? S.ses.token : null }) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  if (!j.ok) {
    if (/Sesión (vencida|requerida)/.test(j.error)) setSesion(null);
    throw Object.assign(new Error(j.error), { servidor: true });
  }
  return j.data;
}

async function escribir(accion, datos, desc) {
  if (!navigator.onLine) return encolar(accion, datos, desc);
  try {
    const r = await api(accion, datos);
    invalidar();
    return r;
  } catch (e) {
    if (!e.servidor) return encolar(accion, datos, desc);
    throw e;
  }
}

function invalidar() {
  S.resumenVencido = true;
  S.rango = null;
  S.rangoK = '';
}

function encolar(accion, datos, desc) {
  S.cola.push({ id: uid(), accion: accion, datos: datos, desc: desc, ts: Date.now(), error: '' });
  lsSet('tierra_cola', S.cola);
  pintarCola();
  toast('Sin conexión: «' + desc + '» quedó en cola y se enviará al reconectar.', 'warn', 6000);
  return { encolado: true };
}

async function procesarCola() {
  if (S.procesando || !navigator.onLine || !S.ses || !S.cola.length) return;
  S.procesando = true;
  for (const it of S.cola.slice()) {
    if (it.error) continue;
    try {
      await api(it.accion, it.datos);
      S.cola = S.cola.filter(x => x.id !== it.id);
      toast('Sincronizado: ' + it.desc, 'ok');
    } catch (e) {
      if (!e.servidor) break;
      if (/Sesión/.test(e.message)) break;
      it.error = e.message;
      toast('No se pudo sincronizar «' + it.desc + '»: ' + e.message, 'bad', 8000);
    }
  }
  lsSet('tierra_cola', S.cola);
  S.procesando = false;
  invalidar();
  pintarCola();
}

function pintarCola() {
  const el = $('#cola');
  el.style.display = S.cola.length ? 'inline-block' : 'none';
  el.textContent = S.cola.length + ' pendiente' + (S.cola.length > 1 ? 's' : '');
}

function verCola() {
  const html = S.cola.length ? S.cola.map(c => '<div class="alert ' + (c.error ? 'bad' : 'warn') + '"><b>' + esc(c.desc) + '</b><br><small>' +
    new Date(c.ts).toLocaleString('es-AR') + (c.error ? ' · ' + esc(c.error) : '') + '</small><div class="row mt"><button class="btn sm" data-reint="' + c.id +
    '">Reintentar</button><button class="btn sm dan" data-desc="' + c.id + '">Descartar</button></div></div>').join('') : '<p>Sin pendientes.</p>';
  const m = modal('Registros pendientes de sincronizar', html);
  m.addEventListener('click', async e => {
    const r = e.target.dataset.reint;
    const d = e.target.dataset.desc;
    if (r) {
      const it = S.cola.find(x => x.id === r);
      if (it) it.error = '';
      m.remove();
      await procesarCola();
    }
    if (d && await confirmar('Descartar', 'El registro pendiente se perderá. ¿Continuar?')) {
      S.cola = S.cola.filter(x => x.id !== d);
      lsSet('tierra_cola', S.cola);
      pintarCola();
      m.remove();
    }
  });
}

function setSesion(s) {
  S.ses = s;
  if (s) lsSet('tierra_ses', s); else lsDel('tierra_ses');
  pintarSesion();
  pintarNav();
}

function pintarSesion() {
  const b = $('#btnSesion');
  b.textContent = S.ses ? S.ses.nombre + ' · ' + S.ses.rol : 'Ingresar';
  b.classList.toggle('pri', !S.ses);
}

function login(destino) {
  const ult = lsGet('tierra_ultimo_usuario', '');
  modal('Ingresar para cargar datos', '<div class="form" style="grid-template-columns:1fr"><label class="f">Usuario<input id="lgN" autocomplete="username" value="' +
    esc(ult) + '"></label><label class="f">PIN<input id="lgP" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8"></label>' +
    '<div id="lgE" class="alert bad hide"></div></div><p class="sub">El tablero y el calendario son públicos. La carga y configuración requieren usuario.</p>', [
    { txt: 'Cancelar' },
    {
      txt: 'Ingresar', cls: 'pri', fn: async m => {
        const n = $('#lgN', m).value.trim();
        const p = $('#lgP', m).value.trim();
        try {
          loading('Verificando…');
          const s = await api('login', { nombre: n, pin: p });
          lsSet('tierra_ultimo_usuario', n);
          setSesion(s);
          toast('Bienvenido, ' + s.nombre, 'ok');
          procesarCola();
          if (destino) location.hash = destino; else render();
          return true;
        } catch (e) {
          const er = $('#lgE', m);
          er.textContent = e.message;
          er.classList.remove('hide');
          return false;
        } finally {
          loaded();
        }
      }
    }
  ]);
  setTimeout(() => { const pi = $('#lgP'); if (pi && ult) pi.focus(); }, 50);
  const pi = $('#lgP');
  if (pi) pi.addEventListener('keydown', e => { if (e.key === 'Enter') $$('.modal .btn.pri').pop().click(); });
}

function menuSesion() {
  if (!S.ses) return login();
  modal(S.ses.nombre, '<p>Rol: <b>' + esc(S.ses.rol) + '</b></p><p class="sub">La sesión vence a las ' +
    new Date(S.ses.vence).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + '.</p>', [
    { txt: 'Cerrar' },
    { txt: 'Salir', cls: 'dan', fn: () => { setSesion(null); location.hash = '#/tablero'; } }
  ]);
}

function pintarNav() {
  const ruta = (location.hash.split('/')[1]) || 'tablero';
  const items = [['tablero', 'Tablero'], ['calendario', 'Calendario']];
  if (S.ses) items.push(['cargar', 'Cargar']);
  if (S.ses && S.ses.rol === 'admin') items.push(['config', 'Configuración']);
  $('#nav').innerHTML = items.map(i => '<a href="#/' + i[0] + '" class="' + (ruta === i[0] || (ruta === 'dia' && i[0] === 'calendario') ? 'on' : '') + '">' + i[1] + '</a>').join('');
}

async function cargarResumen(forzar) {
  if (S.resumen && !forzar && !S.resumenVencido) return S.resumen;
  try {
    S.resumen = await api('resumen');
    S.resumenVencido = false;
    lsSet('tierra_resumen', S.resumen);
  } catch (e) {
    const c = lsGet('tierra_resumen', null);
    if (!c) throw e;
    S.resumen = c;
    toast('Sin conexión con el servidor: se muestran datos guardados (' + new Date(c.generado).toLocaleString('es-AR') + ').', 'warn', 7000);
  }
  return S.resumen;
}

async function cargarRango() {
  const k = S.desde + '|' + S.hasta;
  if (S.rango && S.rangoK === k) return S.rango;
  S.rango = await api('rango', { desde: S.desde, hasta: S.hasta });
  S.rangoK = k;
  return S.rango;
}

function aplicarPreset(p) {
  const h = hoy();
  S.preset = p;
  if (p === 'mes') {
    S.desde = h.slice(0, 8) + '01';
    S.hasta = h;
  } else if (p === 'mesant') {
    const d = aFecha(h.slice(0, 8) + '01');
    d.setDate(0);
    S.hasta = iso(d);
    S.desde = S.hasta.slice(0, 8) + '01';
  } else if (p === 'anio') {
    S.desde = h.slice(0, 4) + '-01-01';
    S.hasta = h;
  } else if (p !== 'custom') {
    S.hasta = h;
    S.desde = addDias(h, -(Number(p) - 1));
  }
  lsSet('tierra_rango', { preset: S.preset, desde: S.desde, hasta: S.hasta });
}

async function render() {
  destruirGraficos();
  app().onclick = null;
  app().onchange = null;
  pintarNav();
  const p = location.hash.replace(/^#\/?/, '').split('/');
  const v = p[0] || 'tablero';
  window.scrollTo(0, 0);
  try {
    if (v === 'tablero') return await vTablero(p[1] || 'balance');
    if (v === 'calendario') return await vCalendario(p[1]);
    if (v === 'dia') return await vDia(p[1] || hoy());
    if (v === 'cargar') {
      if (!S.ses) {
        app().innerHTML = '<div class="card empty">Ingrese con su usuario para cargar datos.<div class="mt"><button class="btn pri" id="bLg">Ingresar</button></div></div>';
        $('#bLg').onclick = () => login(location.hash);
        return;
      }
      return await vCargar(p[1], p[2]);
    }
    if (v === 'config') {
      if (!S.ses || S.ses.rol !== 'admin') {
        app().innerHTML = '<div class="card empty">Solo administradores.</div>';
        return;
      }
      return await vConfig(p[1] || 'Maquinas');
    }
    location.hash = '#/tablero';
  } catch (e) {
    console.error(e);
    loaded();
    app().innerHTML = '<div class="alert bad"><b>Error:</b> ' + esc(e.message) + '</div><button class="btn" onclick="render()">Reintentar</button>';
  }
}

function calcBalance() {
  const P = S.resumen.parametros || {};
  const D = S.resumen.diario || [];
  const fTeo = (num(P.M3_POR_PALADA) || 3) * (num(P.DENSIDAD_APARENTE) || 1.6);
  const tH = sum(D, d => d.molT);
  const pH = sum(D, d => d.molPalConT);
  const fMolHist = pH > 0 ? tH / pH : fTeo;
  const R = D.filter(d => d.fecha >= S.desde && d.fecha <= S.hasta);
  const tR = sum(R, d => d.molT);
  const pR = sum(R, d => d.molPalConT);
  const fMol = pR > 0 ? tR / pR : fMolHist;
  const fSilo = num(P.F_SILO) || fMolHist;
  const conPal = R.filter(d => d.ingresoT > 0 && d.palCam > 0);
  const fCant = sum(conPal, d => d.palCam) > 0 ? sum(conPal, d => d.ingresoT) / sum(conPal, d => d.palCam) : null;
  const aj = agrupar(S.resumen.ajustes || [], a => a.fecha);
  const mapD = {};
  D.forEach(d => { mapD[d.fecha] = d; });
  const fechas = Array.from(new Set(D.map(d => d.fecha).concat(Object.keys(aj)))).sort();
  let sP = 0;
  let sS = 0;
  const serie = [];
  fechas.forEach(f => {
    (aj[f] || []).forEach(a => {
      const actual = a.nodo === 'Playa' ? sP : sS;
      const v = a.tipo === 'Corrección' ? actual + (a.toneladas || 0) : (a.toneladas || 0);
      if (a.nodo === 'Playa') sP = v; else sS = v;
    });
    const d = mapD[f] || {};
    const consumo = (d.molT || 0) + ((d.molPal || 0) - (d.molPalConT || 0)) * fMolHist;
    const siloOut = (d.siloPal || 0) * fSilo;
    sP += (d.ingresoT || 0) - consumo;
    sS += consumo - siloOut;
    serie.push({
      fecha: f, ingreso: d.ingresoT || 0, consumo: consumo, siloOut: siloOut, stockPlaya: sP, stockSilo: sS,
      fCant: d.palCam > 0 && d.ingresoT > 0 ? d.ingresoT / d.palCam : null,
      fMol: d.molPalConT > 0 ? d.molT / d.molPalConT : null,
      estimado: (d.molPal || 0) > (d.molPalConT || 0)
    });
  });
  const enR = serie.filter(s => s.fecha >= S.desde && s.fecha <= S.hasta);
  const previos = serie.filter(s => s.fecha <= S.hasta);
  const ult = previos.length ? previos[previos.length - 1] : null;
  return {
    fTeo: fTeo, fMol: fMol, fMolHist: fMolHist, fSilo: fSilo, fCant: fCant, serie: enR,
    stockPlaya: ult ? ult.stockPlaya : 0, stockSilo: ult ? ult.stockSilo : 0,
    ingreso: sum(R, d => d.ingresoT), tickets: sum(R, d => d.tickets), consumo: sum(enR, s => s.consumo),
    siloOut: sum(enR, s => s.siloOut), molPal: sum(R, d => d.molPal), siloPal: sum(R, d => d.siloPal),
    hayAjuste: (S.resumen.ajustes || []).length > 0, calibrado: pH > 0,
    estimados: enR.filter(s => s.estimado).length
  };
}

function destinosPlanta() {
  return String((S.resumen && S.resumen.parametros && S.resumen.parametros.DESTINOS_PLANTA) || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
}

function conciliar(datos) {
  const P = S.resumen.parametros || {};
  const dest = destinosPlanta();
  const viajesTot = datos.viajes || [];
  const viajes = viajesTot.filter(v => !dest.length || dest.indexOf(String(v.destino).trim().toUpperCase()) >= 0);
  const pes = (datos.pesajes || []).filter(p => p.tierra !== false);
  const vent = num(P.VENTANA_MATCH_MIN) || 120;
  const absMin = (f, h) => { const p = f.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]) / 60000 + (minDe(h) || 0); };
  const porDom = agrupar(pes.map((p, i) => ({ p: p, i: i })), x => normDom(x.p.dominio));
  const cand = [];
  viajes.forEach((v, vi) => {
    let t = absMin(v.fecha, v.horaDescarga || v.horaCarga);
    if (v.horaDescarga && minDe(v.horaDescarga) < minDe(v.horaCarga)) t += 1440;
    (porDom[normDom(v.dominio)] || []).forEach(x => {
      const dt = Math.abs(absMin(x.p.fecha, x.p.hora) - t);
      if (dt <= vent) cand.push({ vi: vi, pi: x.i, dt: dt });
    });
  });
  cand.sort((a, b) => a.dt - b.dt);
  const uV = new Set();
  const uP = new Set();
  const pares = [];
  cand.forEach(c => {
    if (uV.has(c.vi) || uP.has(c.pi)) return;
    uV.add(c.vi);
    uP.add(c.pi);
    pares.push({ v: viajes[c.vi], p: pes[c.pi], dt: c.dt });
  });
  const lim = {};
  const porD = agrupar(pes, p => p.dominio);
  Object.keys(porD).forEach(d => {
    const a = porD[d].map(p => p.neto).filter(x => x !== null).sort((x, y) => x - y);
    if (a.length < 5) return;
    const q1 = quant(a, 0.25);
    const q3 = quant(a, 0.75);
    lim[d] = [q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1), quant(a, 0.5)];
  });
  const atipicos = pes.filter(p => lim[p.dominio] && (p.neto < lim[p.dominio][0] || p.neto > lim[p.dominio][1]))
    .map(p => Object.assign({}, p, { mediana: lim[p.dominio][2] }));
  const dias = {};
  const di = f => dias[f] || (dias[f] = { fecha: f, unid: 0, palCam: 0, viajesTot: 0, viajes: 0, tickets: 0, neto: 0, pares: 0 });
  (datos.tramos || []).forEach(t => {
    if (t.tipo !== 'Producción') return;
    const x = di(t.fecha);
    x.unid += t.unidadesCargadas || 0;
    x.palCam += t.paladasCamiones || 0;
  });
  viajesTot.forEach(v => { di(v.fecha).viajesTot++; });
  viajes.forEach(v => { di(v.fecha).viajes++; });
  pes.forEach(p => { const x = di(p.fecha); x.tickets++; x.neto += p.neto || 0; });
  pares.forEach(pr => { di(pr.v.fecha).pares++; });
  return {
    viajesTot: viajesTot, viajes: viajes, pes: pes, pares: pares,
    sinTicket: viajes.filter((_, i) => !uV.has(i)), sinViaje: pes.filter((_, i) => !uP.has(i)),
    atipicos: atipicos, diario: Object.keys(dias).sort().map(k => dias[k]),
    porViaje: pares.filter(pr => pr.v.paladas > 0).map(pr => ({ v: pr.v, p: pr.p, f: pr.p.neto / pr.v.paladas }))
  };
}

function barraFiltros() {
  const ps = [['7', 'Últimos 7 días'], ['30', 'Últimos 30 días'], ['90', 'Últimos 90 días'], ['mes', 'Mes actual'], ['mesant', 'Mes anterior'], ['anio', 'Año actual'], ['custom', 'Personalizado']];
  return '<div class="bar"><label class="f">Período<select id="fPre">' + ps.map(p => '<option value="' + p[0] + '"' + (S.preset === p[0] ? ' selected' : '') + '>' + p[1] + '</option>').join('') +
    '</select></label><label class="f">Desde<input type="date" id="fDes" value="' + S.desde + '"></label><label class="f">Hasta<input type="date" id="fHas" value="' + S.hasta +
    '"></label><button class="btn pri" id="fApl">Aplicar</button><div class="row right"><button class="btn" id="fAct" title="Recargar datos del servidor">↻ Actualizar</button>' +
    '<button class="btn" onclick="window.print()">Imprimir / PDF</button></div></div>';
}

function enlazarFiltros(tab) {
  $('#fPre').onchange = e => {
    aplicarPreset(e.target.value);
    if (S.preset !== 'custom') vTablero(tab);
  };
  $('#fApl').onclick = () => {
    const d = $('#fDes').value;
    const h = $('#fHas').value;
    if (!d || !h || d > h) return toast('Rango de fechas inválido', 'bad');
    S.preset = 'custom';
    S.desde = d;
    S.hasta = h;
    lsSet('tierra_rango', { preset: S.preset, desde: d, hasta: h });
    vTablero(tab);
  };
  $('#fAct').onclick = () => { invalidar(); vTablero(tab); };
}

async function vTablero(tab) {
  destruirGraficos();
  loading('Calculando tablero…');
  try {
    await cargarResumen();
    await cargarRango();
  } finally {
    loaded();
  }
  const tabs = [['balance', 'Balance de tierra'], ['viajes', 'Viajes y balanza'], ['cantera', 'Cantera'], ['calidad', 'Calidad']];
  app().innerHTML = barraFiltros() + '<div class="tabs">' + tabs.map(t => '<button data-t="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</button>').join('') +
    '</div><div id="tabC"></div>';
  $$('.tabs button').forEach(b => { b.onclick = () => { location.hash = '#/tablero/' + b.dataset.t; }; });
  enlazarFiltros(tab);
  if (tab === 'viajes') return tabViajes();
  if (tab === 'cantera') return tabCantera();
  if (tab === 'calidad') return tabCalidad();
  return tabBalance();
}

function tabBalance() {
  const b = calcBalance();
  const c = $('#tabC');
  const avisos = [];
  if (!b.hayAjuste) avisos.push('No hay stock inicial cargado: los stocks se calculan desde el primer registro (base 0). Cargue un <b>Stock inicial</b> o una <b>Cubicación</b> en Cargar → Ajustes de stock.');
  if (!b.calibrado) avisos.push('Sin turnos con balanza dinámica: se usa el factor teórico ' + nf(b.fTeo, 2) + ' t/palada (' + nf(num(S.resumen.parametros.M3_POR_PALADA), 1) + ' m³ × ' + nf(num(S.resumen.parametros.DENSIDAD_APARENTE), 2) + ' t/m³).');
  if (b.estimados) avisos.push(b.estimados + ' día(s) del período tienen turnos de molienda sin toneladas de balanza dinámica; se estimaron con ' + nf(b.fMolHist, 2) + ' t/palada.');
  const m3 = num(S.resumen.parametros.M3_POR_PALADA) || 3;
  c.innerHTML = (avisos.length ? '<div class="alert info"><ul>' + avisos.map(a => '<li>' + a + '</li>').join('') + '</ul></div>' : '') +
    '<div class="flujo">' +
    '<div class="nodo"><div class="l">Ingreso balanza</div><div class="v">' + nf(b.ingreso, 0) + ' t</div><div class="d">' + nf(b.tickets) + ' tickets</div></div>' +
    '<div class="nodo stock"><div class="l">Stock playa</div><div class="v">' + nf(b.stockPlaya, 0) + ' t</div><div class="d">al ' + fCorta(S.hasta) + '</div></div>' +
    '<div class="nodo"><div class="l">Consumo molienda</div><div class="v">' + nf(b.consumo, 0) + ' t</div><div class="d">' + nf(b.molPal) + ' paladas</div></div>' +
    '<div class="nodo stock"><div class="l">Stock silo</div><div class="v">' + nf(b.stockSilo, 0) + ' t</div><div class="d">al ' + fCorta(S.hasta) + '</div></div>' +
    '<div class="nodo"><div class="l">Extraído de silo</div><div class="v">' + nf(b.siloOut, 0) + ' t</div><div class="d">' + nf(b.siloPal) + ' paladas</div></div></div>' +
    '<div class="kpis mt">' +
    kpi('t/palada cantera', nf(b.fCant, 2), b.fCant ? '≈ ' + nf(b.fCant / m3, 2) + ' t/m³ de balde' : 'requiere pesajes y paladas', 'acc') +
    kpi('t/palada molienda', nf(b.fMol, 2), b.calibrado ? 'balanza dinámica / paladas' : 'teórico', 'acc') +
    kpi('t/palada silo', nf(b.fSilo, 2), num(S.resumen.parametros.F_SILO) ? 'parámetro fijo' : 'factor molienda histórico') +
    kpi('Desvío cantera vs molienda', b.fCant ? nf((b.fCant / b.fMol - 1) * 100, 1) + '%' : '–', 'humedad / llenado de balde') +
    kpi('Variación stock playa', nf(b.ingreso - b.consumo, 0) + ' <small>t</small>', 'ingreso − consumo en el período') +
    '</div><div class="grid g2">' + caja('chPlaya', 'Playa de molienda', 'Ingreso (balanza) y consumo (molienda) diarios · stock acumulado', true) +
    caja('chSilo', 'Silo de tierra molida', 'Entrada (balanza dinámica) y extracción (paladas) · stock acumulado', true) + '</div>' +
    caja('chFactor', 'Factor t/palada diario', 'Cantera: t netas balanza / paladas a camión · Molienda: t balanza dinámica / paladas al cajón') +
    '<div class="card"><div class="card-h"><h3>Detalle diario</h3><button class="btn sm" id="csvBal">CSV</button></div>' +
    tabla([['fecha', 'Fecha'], [r => nf(r.ingreso, 1), 'Ingreso t', 'n'], [r => nf(r.consumo, 1) + (r.estimado ? ' *' : ''), 'Consumo t', 'n'], [r => nf(r.stockPlaya, 0), 'Stock playa', 'n'],
      [r => nf(r.siloOut, 1), 'Extr. silo t', 'n'], [r => nf(r.stockSilo, 0), 'Stock silo', 'n'], [r => nf(r.fCant, 2), 't/pal cantera', 'n'], [r => nf(r.fMol, 2), 't/pal molienda', 'n']],
    b.serie.slice().reverse(), { max: true }) + '<div class="sub mt">* consumo estimado con factor por falta de balanza dinámica en algún turno.</div></div>';
  const L = b.serie.map(s => fCorta(s.fecha));
  const dual = { scales: { y1: { position: 'right', grid: { display: false }, ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() } } } };
  grafico('chPlaya', 'bar', L, [
    { label: 'Ingreso t', data: b.serie.map(s => s.ingreso), backgroundColor: COL[1], order: 2 },
    { label: 'Consumo t', data: b.serie.map(s => s.consumo), backgroundColor: COL[3], order: 2 },
    { label: 'Stock t', data: b.serie.map(s => s.stockPlaya), type: 'line', borderColor: COL[0], backgroundColor: COL[0], yAxisID: 'y1', tension: 0.25, pointRadius: 0, order: 1 }
  ], dual);
  grafico('chSilo', 'bar', L, [
    { label: 'Entrada t', data: b.serie.map(s => s.consumo), backgroundColor: COL[3], order: 2 },
    { label: 'Extracción t', data: b.serie.map(s => s.siloOut), backgroundColor: COL[4], order: 2 },
    { label: 'Stock t', data: b.serie.map(s => s.stockSilo), type: 'line', borderColor: COL[0], backgroundColor: COL[0], yAxisID: 'y1', tension: 0.25, pointRadius: 0, order: 1 }
  ], dual);
  grafico('chFactor', 'line', L, [
    { label: 'Cantera', data: b.serie.map(s => s.fCant), borderColor: COL[0], backgroundColor: COL[0], spanGaps: true, tension: 0.2 },
    { label: 'Molienda', data: b.serie.map(s => s.fMol), borderColor: COL[1], backgroundColor: COL[1], spanGaps: true, tension: 0.2 },
    { label: 'Teórico', data: b.serie.map(() => b.fTeo), borderColor: COL[5], borderDash: [5, 5], pointRadius: 0 }
  ], { scales: { y: { beginAtZero: false } } });
  $('#csvBal').onclick = () => csv('balance_' + S.desde + '_' + S.hasta, [['fecha', 'Fecha'], ['ingreso', 'Ingreso t'], ['consumo', 'Consumo t'], ['stockPlaya', 'Stock playa t'], ['siloOut', 'Extraccion silo t'], ['stockSilo', 'Stock silo t'], ['fCant', 't/palada cantera'], ['fMol', 't/palada molienda']], b.serie);
}

function tabViajes() {
  const R = S.rango;
  const k = conciliar(R);
  const netoT = sum(k.pes, p => p.neto);
  const cic = k.viajes.filter(v => v.horaCarga && v.horaDescarga).map(v => dur(v.horaCarga, v.horaDescarga) * 60);
  const pctMatch = k.viajes.length ? k.pares.length / k.viajes.length * 100 : null;
  const c = $('#tabC');
  const porChofer = agrupar(k.viajes, v => v.chofer || '(sin chofer)');
  const chof = Object.keys(porChofer).map(n => {
    const vs = porChofer[n];
    const prs = k.pares.filter(p => p.v.chofer === n);
    return { n: n, viajes: vs.length, t: sum(prs, p => p.p.neto), prom: prs.length ? sum(prs, p => p.p.neto) / prs.length : null, sinT: k.sinTicket.filter(v => v.chofer === n).length };
  }).sort((a, b) => b.viajes - a.viajes);
  const porDom = agrupar(k.pes, p => p.dominio);
  const doms = Object.keys(porDom).map(d => ({ d: d, n: porDom[d].length, prom: sum(porDom[d], p => p.neto) / porDom[d].length, min: Math.min.apply(null, porDom[d].map(p => p.neto)), max: Math.max.apply(null, porDom[d].map(p => p.neto)) }))
    .sort((a, b) => b.n - a.n);
  c.innerHTML = '<div class="kpis">' +
    kpi('Camiones cargados (palas)', nf(sum(k.diario, d => d.unid)), 'declarado en jornada de cantera') +
    kpi('Viajes a planta', nf(k.viajes.length), nf(k.viajesTot.length) + ' viajes totales (todos los destinos)') +
    kpi('Tickets de balanza', nf(k.pes.length), nf(netoT, 0) + ' t netas') +
    kpi('Viajes con ticket', nf(pctMatch, 0) + '%', nf(k.pares.length) + ' cruzados', pctMatch !== null && pctMatch < 90 ? 'bad' : 'ok') +
    kpi('Viajes sin ticket', nf(k.sinTicket.length), 'no pasaron por balanza', k.sinTicket.length ? 'bad' : '') +
    kpi('Tickets sin viaje', nf(k.sinViaje.length), 'pesados sin comprobante', k.sinViaje.length ? 'bad' : '') +
    kpi('Neto medio por viaje', nf(k.pares.length ? sum(k.pares, p => p.p.neto) / k.pares.length : null, 1) + ' <small>t</small>') +
    kpi('Ciclo carga→descarga', nf(cic.length ? sum(cic, x => x) / cic.length : null, 0) + ' <small>min</small>') +
    '</div>' + caja('chConc', 'Conciliación diaria', 'Camiones declarados por palas · viajes registrados a planta · tickets de balanza') +
    '<div class="grid g2">' + caja('chChof', 'Toneladas por chofer', 'Solo viajes cruzados con ticket') + caja('chDom', 'Neto promedio por dominio', 'Barras: promedio · rango min–max en tabla') + '</div>' +
    '<div class="card"><div class="card-h"><h3>Conciliación por día</h3><button class="btn sm" id="csvConc">CSV</button></div>' +
    tabla([[r => '<a href="#/dia/' + r.fecha + '">' + r.fecha + '</a>', 'Fecha'], ['unid', 'Unid. palas', 'n'], ['viajesTot', 'Viajes tot.', 'n'], ['viajes', 'Viajes planta', 'n'], ['tickets', 'Tickets', 'n'],
      ['pares', 'Cruzados', 'n'], [r => nf(r.neto, 1), 't netas', 'n'], ['palCam', 'Pal. camión', 'n'], [r => nf(r.palCam > 0 && r.neto > 0 ? r.neto / r.palCam : null, 2), 't/palada', 'n'],
      [r => (r.viajes !== r.tickets || r.unid !== r.viajesTot) ? '<span class="tag t-warn">revisar</span>' : '<span class="tag t-ok">ok</span>', 'Estado']],
    k.diario.slice().reverse(), { max: true }) + '</div>' +
    '<div class="grid g2"><div class="card"><div class="card-h"><h3>Viajes sin ticket</h3><button class="btn sm" id="csvST">CSV</button></div>' +
    tabla([['fecha', 'Fecha'], ['comprobante', 'Comp.'], ['horaCarga', 'Carga'], ['horaDescarga', 'Desc.'], ['chofer', 'Chofer'], ['dominio', 'Dominio'], ['origen', 'Origen']], k.sinTicket, { max: true, vacio: 'Todos los viajes tienen ticket.' }) +
    '</div><div class="card"><div class="card-h"><h3>Tickets sin viaje</h3><button class="btn sm" id="csvSV">CSV</button></div>' +
    tabla([['fecha', 'Fecha'], ['hora', 'Hora'], ['ticket', 'Ticket'], ['dominio', 'Dominio'], [r => nf(r.neto, 2), 'Neto t', 'n'], ['producto', 'Producto']], k.sinViaje, { max: true, vacio: 'Todos los tickets tienen viaje.' }) +
    '</div></div><div class="grid g2"><div class="card"><div class="card-h"><h3>Netos atípicos (fuera de 1,5·IQR por dominio)</h3></div>' +
    tabla([['fecha', 'Fecha'], ['hora', 'Hora'], ['ticket', 'Ticket'], ['dominio', 'Dominio'], [r => nf(r.neto, 2), 'Neto t', 'n'], [r => nf(r.mediana, 2), 'Mediana dom.', 'n']], k.atipicos, { max: true, vacio: 'Sin valores atípicos.' }) +
    '</div><div class="card"><div class="card-h"><h3>Dominios</h3></div>' +
    tabla([['d', 'Dominio'], ['n', 'Tickets', 'n'], [r => nf(r.prom, 2), 'Prom. t', 'n'], [r => nf(r.min, 2), 'Mín.', 'n'], [r => nf(r.max, 2), 'Máx.', 'n']], doms, { max: true }) + '</div></div>' +
    (k.porViaje.length ? '<div class="card"><div class="card-h"><h3>t/palada por viaje</h3><div class="sub">Viajes con paladas informadas y ticket cruzado</div></div>' +
      tabla([[r => r.v.fecha, 'Fecha'], [r => esc(r.v.comprobante), 'Comp.'], [r => esc(r.v.dominio), 'Dominio'], [r => esc(r.v.chofer), 'Chofer'], [r => r.v.paladas, 'Paladas', 'n'], [r => nf(r.p.neto, 2), 'Neto t', 'n'], [r => nf(r.f, 2), 't/palada', 'n']], k.porViaje, { max: true }) + '</div>' : '');
  const L = k.diario.map(d => fCorta(d.fecha));
  grafico('chConc', 'bar', L, [
    { label: 'Unid. cargadas (palas)', data: k.diario.map(d => d.unid), backgroundColor: COL[5] },
    { label: 'Viajes a planta', data: k.diario.map(d => d.viajes), backgroundColor: COL[0] },
    { label: 'Tickets balanza', data: k.diario.map(d => d.tickets), backgroundColor: COL[1] }
  ]);
  const ch = chof.filter(x => x.t > 0).slice(0, 15);
  grafico('chChof', 'bar', ch.map(x => x.n), [{ label: 't netas', data: ch.map(x => x.t), backgroundColor: COL[0] }], { indexAxis: 'y', plugins: { legend: { display: false } } });
  const dm = doms.slice(0, 15);
  grafico('chDom', 'bar', dm.map(x => x.d), [{ label: 'Neto promedio t', data: dm.map(x => x.prom), backgroundColor: COL[1] }], { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } });
  $('#csvConc').onclick = () => csv('conciliacion_' + S.desde + '_' + S.hasta, [['fecha', 'Fecha'], ['unid', 'Unidades palas'], ['viajesTot', 'Viajes totales'], ['viajes', 'Viajes planta'], ['tickets', 'Tickets'], ['pares', 'Cruzados'], ['neto', 't netas'], ['palCam', 'Paladas camion']], k.diario);
  $('#csvST').onclick = () => csv('viajes_sin_ticket', [['fecha', 'Fecha'], ['comprobante', 'Comprobante'], ['nroViaje', 'N viaje'], ['horaCarga', 'Hora carga'], ['horaDescarga', 'Hora descarga'], ['chofer', 'Chofer'], ['dominio', 'Dominio'], ['origen', 'Origen'], ['destino', 'Destino']], k.sinTicket);
  $('#csvSV').onclick = () => csv('tickets_sin_viaje', [['fecha', 'Fecha'], ['hora', 'Hora'], ['ticket', 'Ticket'], ['dominio', 'Dominio'], ['neto', 'Neto t'], ['producto', 'Producto']], k.sinViaje);
}

function statsCantera(R) {
  const maqTipo = {};
  activos('Maquinas').forEach(m => { maqTipo[m.nombre] = String(m.tipo || '').toLowerCase(); });
  ((S.resumen.catalogos || {}).Maquinas || []).forEach(m => { if (!maqTipo[m.nombre]) maqTipo[m.nombre] = String(m.tipo || '').toLowerCase(); });
  const M = {};
  const O = {};
  const causas = {};
  const m = n => M[n] || (M[n] = { n: n, tipo: maqTipo[n] || '', hHor: 0, hProd: 0, hPar: 0, pal: 0, palCam: 0, palAco: 0, unid: 0, litros: 0 });
  R.tramos.forEach(t => {
    const x = m(t.maquina);
    const h = dur(t.horaInicio, t.horaFin);
    if (t.tipo === 'Producción') {
      const hh = (t.horometroFin || 0) - (t.horometroIni || 0);
      const hv = hh > 0 && hh <= 24 ? hh : 0;
      x.hHor += hv;
      x.hProd += h;
      x.palCam += t.paladasCamiones || 0;
      x.palAco += t.paladasAcopios || 0;
      x.unid += t.unidadesCargadas || 0;
      if (t.operador) {
        const o = O[t.operador] || (O[t.operador] = { n: t.operador, hHor: 0, pal: 0, dias: new Set(), maqs: new Set() });
        o.hHor += hv;
        o.pal += (t.paladasCamiones || 0) + (t.paladasAcopios || 0);
        o.dias.add(t.fecha);
        o.maqs.add(t.maquina);
      }
    } else {
      x.hPar += h;
      causas[t.motivoParada || 'Sin motivo'] = (causas[t.motivoParada || 'Sin motivo'] || 0) + h;
    }
  });
  (R.combustible || []).forEach(c => { m(c.maquina).litros += c.litros || 0; });
  Object.keys(M).forEach(k => {
    const x = M[k];
    x.pal = x.palCam + x.palAco;
    x.disp = x.hProd + x.hPar > 0 ? x.hProd / (x.hProd + x.hPar) * 100 : null;
    x.palH = x.hHor > 0 ? x.pal / x.hHor : null;
    x.lH = x.hHor > 0 ? x.litros / x.hHor : null;
    x.utiliz = x.hProd > 0 ? x.hHor / x.hProd * 100 : null;
  });
  const ops = Object.keys(O).map(k => {
    const o = O[k];
    return { n: o.n, hHor: o.hHor, pal: o.pal, dias: o.dias.size, palH: o.hHor > 0 ? o.pal / o.hHor : null, palDia: o.dias.size ? o.pal / o.dias.size : null, maqs: Array.from(o.maqs).join(', ') };
  }).sort((a, b) => b.pal - a.pal);
  return { maqs: Object.keys(M).map(k => M[k]).sort((a, b) => b.pal - a.pal || b.hHor - a.hHor), ops: ops, causas: causas };
}

function tabCantera() {
  const R = S.rango;
  const st = statsCantera(R);
  const porDia = agrupar(R.tramos.filter(t => t.tipo === 'Producción'), t => t.fecha);
  const fechas = Object.keys(porDia).sort();
  const palas = st.maqs.filter(x => x.tipo === 'pala');
  const comb = agrupar(R.combustible || [], c => c.fecha);
  const fComb = Object.keys(comb).sort();
  const hProd = sum(st.maqs, x => x.hProd);
  const hPar = sum(st.maqs, x => x.hPar);
  const c = $('#tabC');
  c.innerHTML = '<div class="kpis">' +
    kpi('Paladas a camión', nf(sum(st.maqs, x => x.palCam))) + kpi('Paladas a acopio', nf(sum(st.maqs, x => x.palAco))) +
    kpi('Camiones cargados', nf(sum(st.maqs, x => x.unid)), 'Prom. ' + nf(sum(st.maqs, x => x.unid) ? sum(st.maqs, x => x.palCam) / sum(st.maqs, x => x.unid) : null, 1) + ' paladas/camión') +
    kpi('Horas horómetro', nf(sum(st.maqs, x => x.hHor), 0)) + kpi('Horas de parada', nf(hPar, 0)) +
    kpi('Disponibilidad', nf(hProd + hPar > 0 ? hProd / (hProd + hPar) * 100 : null, 0) + '%', 'h programadas productivas / totales') +
    kpi('Combustible', nf(sum(st.maqs, x => x.litros), 0) + ' <small>L</small>', nf(sum(st.maqs, x => x.hHor) ? sum(st.maqs, x => x.litros) / sum(st.maqs, x => x.hHor) : null, 1) + ' L/h') +
    '</div>' + caja('chPal', 'Paladas diarias (palas cargadoras)', 'Camión y acopio en cantera') +
    '<div class="grid g2"><div class="card"><div class="card-h"><h3>Rendimiento</h3><select id="selRend" style="width:auto"><option value="maq">por máquina</option><option value="op">por operador</option></select></div>' +
    '<div class="chart"><canvas id="chRend"></canvas></div></div>' + caja('chCaus', 'Horas de parada por causa', '') + '</div>' +
    '<div class="grid g2">' + caja('chLh', 'Litros por hora de horómetro', 'Combustible del período / horas horómetro') + caja('chComb', 'Combustible por día', 'Litros cargados (excluye cisterna)') + '</div>' +
    '<div class="card"><div class="card-h"><h3>Resumen por máquina</h3><button class="btn sm" id="csvMaq">CSV</button></div>' +
    tabla([['n', 'Máquina'], ['tipo', 'Tipo'], [r => nf(r.hHor, 1), 'h horóm.', 'n'], [r => nf(r.hProd, 1), 'h prog. prod.', 'n'], [r => nf(r.hPar, 1), 'h parada', 'n'],
      [r => nf(r.disp, 0) + '%', 'Disp.', 'n'], [r => nf(r.utiliz, 0) + '%', 'Utiliz.', 'n'], ['palCam', 'Pal. cam.', 'n'], ['palAco', 'Pal. acop.', 'n'], ['unid', 'Camiones', 'n'],
      [r => nf(r.palH, 1), 'Pal/h', 'n'], [r => nf(r.litros, 0), 'Litros', 'n'], [r => nf(r.lH, 1), 'L/h', 'n']], st.maqs) +
    '<div class="sub mt">Disponibilidad = h programadas de producción / (producción + parada). Utilización = h horómetro / h programadas de producción.</div></div>' +
    '<div class="card"><div class="card-h"><h3>Operadores</h3></div>' +
    tabla([['n', 'Operador'], ['maqs', 'Máquinas'], ['dias', 'Días', 'n'], [r => nf(r.hHor, 1), 'h horóm.', 'n'], ['pal', 'Paladas', 'n'], [r => nf(r.palDia, 0), 'Pal/día', 'n'], [r => nf(r.palH, 1), 'Pal/h', 'n']], st.ops) + '</div>';
  grafico('chPal', 'bar', fechas.map(fCorta), [
    { label: 'A camión', data: fechas.map(f => sum(porDia[f], t => t.paladasCamiones)), backgroundColor: COL[0] },
    { label: 'A acopio', data: fechas.map(f => sum(porDia[f], t => t.paladasAcopios)), backgroundColor: COL[1] }
  ], { scales: { x: { stacked: true }, y: { stacked: true } } });
  const rend = () => {
    const op = $('#selRend').value === 'op';
    const arr = op ? st.ops.filter(o => o.palH !== null) : palas.filter(x => x.palH !== null);
    grafico('chRend', 'bar', arr.map(x => x.n), [
      { label: 'Paladas/h horómetro', data: arr.map(x => x.palH), backgroundColor: COL[0] }
    ], { indexAxis: 'y', plugins: { legend: { display: false } } });
  };
  $('#selRend').onchange = rend;
  rend();
  const ck = Object.keys(st.causas);
  grafico('chCaus', 'doughnut', ck, [{ data: ck.map(k => st.causas[k]), backgroundColor: ck.map((_, i) => COL[i % COL.length]), borderWidth: 0 }], { plugins: { legend: { position: 'right' } } });
  const conL = st.maqs.filter(x => x.lH !== null && x.litros > 0);
  grafico('chLh', 'bar', conL.map(x => x.n), [{ label: 'L/h', data: conL.map(x => x.lH), backgroundColor: COL[3] }], { plugins: { legend: { display: false } } });
  grafico('chComb', 'bar', fComb.map(fCorta), [{ label: 'Litros', data: fComb.map(f => sum(comb[f], x => x.litros)), backgroundColor: COL[3] }], { plugins: { legend: { display: false } } });
  $('#csvMaq').onclick = () => csv('cantera_maquinas_' + S.desde + '_' + S.hasta, [['n', 'Maquina'], ['tipo', 'Tipo'], ['hHor', 'h horometro'], ['hProd', 'h prog produccion'], ['hPar', 'h parada'], ['palCam', 'Paladas camion'], ['palAco', 'Paladas acopio'], ['unid', 'Camiones'], ['litros', 'Litros']], st.maqs);
}

function tabCalidad() {
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
  const c = $('#tabC');
  c.innerHTML = '<div class="kpis">' + kpi('Muestras', nf(n)) +
    kpi('Aceptadas', nf(n ? cnt('Aceptado') / n * 100 : null, 0) + '%', nf(cnt('Aceptado')) + ' muestras', 'ok') +
    kpi('Observadas', nf(n ? cnt('Observado') / n * 100 : null, 0) + '%', nf(cnt('Observado')) + ' muestras') +
    kpi('Rechazadas', nf(n ? cnt('Rechazado') / n * 100 : null, 0) + '%', nf(cnt('Rechazado')) + ' muestras', cnt('Rechazado') ? 'bad' : '') +
    kpi('Arcilla promedio', nf(prom('arcilla'), 1) + '%', conComp.length + ' ensayos') + kpi('Limo promedio', nf(prom('limo'), 1) + '%') + kpi('Arena promedio', nf(prom('arena'), 1) + '%') +
    '</div><div class="grid g2">' + caja('chEst', 'Estado por origen', 'Cantidad de muestras') + caja('chComp', 'Composición promedio por origen', 'Ensayo casero: % arcilla / limo / arena') + '</div>' +
    '<div class="grid g2">' + caja('chDef', 'Defectos detectados (inspección visual)', '% de muestras con el defecto') + caja('chEvo', 'Evolución de la composición', 'Promedio diario') + '</div>' +
    '<div class="card"><div class="card-h"><h3>Muestras observadas y rechazadas</h3><button class="btn sm" id="csvCal">CSV todo</button></div>' +
    tabla([['fecha', 'Fecha'], ['hora', 'Hora'], [r => '<span class="tag ' + (r.estado === 'Rechazado' ? 't-bad' : 't-warn') + '">' + r.estado + '</span>', 'Estado'], ['dominio', 'Dominio'], ['chofer', 'Chofer'], ['origen', 'Origen'],
      [r => defs.filter(d => r[d[0]]).map(d => d[1]).join(', '), 'Defectos'], [r => [r.arcilla, r.limo, r.arena].map(x => x === null ? '–' : nf(x, 0)).join(' / '), 'A/L/Ar %'], [r => esc(r.observaciones), 'Obs.', 'wrap']],
    C.filter(x => x.estado !== 'Aceptado').reverse(), { max: true, vacio: 'Sin muestras observadas ni rechazadas.' }) + '</div>';
  grafico('chEst', 'bar', orig, [
    { label: 'Aceptado', data: orig.map(o => porOr[o].filter(x => x.estado === 'Aceptado').length), backgroundColor: COL[2] },
    { label: 'Observado', data: orig.map(o => porOr[o].filter(x => x.estado === 'Observado').length), backgroundColor: COL[3] },
    { label: 'Rechazado', data: orig.map(o => porOr[o].filter(x => x.estado === 'Rechazado').length), backgroundColor: '#b8342f' }
  ], { scales: { x: { stacked: true }, y: { stacked: true } } });
  const oc = orig.filter(o => porOr[o].some(x => x.arcilla !== null));
  const pr = (o, k) => { const a = porOr[o].filter(x => x[k] !== null); return a.length ? sum(a, x => x[k]) / a.length : 0; };
  grafico('chComp', 'bar', oc, [
    { label: 'Arcilla', data: oc.map(o => pr(o, 'arcilla')), backgroundColor: COL[0] },
    { label: 'Limo', data: oc.map(o => pr(o, 'limo')), backgroundColor: COL[3] },
    { label: 'Arena', data: oc.map(o => pr(o, 'arena')), backgroundColor: COL[5] }
  ], { indexAxis: 'y', scales: { x: { stacked: true, max: 100 }, y: { stacked: true } } });
  grafico('chDef', 'bar', defs.map(d => d[1]), [{ label: '% muestras', data: defs.map(d => n ? C.filter(x => x[d[0]]).length / n * 100 : 0), backgroundColor: COL[4] }], { plugins: { legend: { display: false } } });
  const pf = (f, k) => { const a = porFecha[f].filter(x => x[k] !== null); return a.length ? sum(a, x => x[k]) / a.length : null; };
  grafico('chEvo', 'line', fs.map(fCorta), [
    { label: 'Arcilla', data: fs.map(f => pf(f, 'arcilla')), borderColor: COL[0], backgroundColor: COL[0], spanGaps: true },
    { label: 'Limo', data: fs.map(f => pf(f, 'limo')), borderColor: COL[3], backgroundColor: COL[3], spanGaps: true },
    { label: 'Arena', data: fs.map(f => pf(f, 'arena')), borderColor: COL[5], backgroundColor: COL[5], spanGaps: true }
  ], { scales: { y: { max: 100 } } });
  $('#csvCal').onclick = () => csv('calidad_' + S.desde + '_' + S.hasta, [['fecha', 'Fecha'], ['hora', 'Hora'], ['dominio', 'Dominio'], ['comprobante', 'Comprobante'], ['ticket', 'Ticket'], ['origen', 'Origen'], ['chofer', 'Chofer'],
    ['estado', 'Estado'], ['arcilla', 'Arcilla %'], ['limo', 'Limo %'], ['arena', 'Arena %'], ['piedras', 'Piedras'], ['raices', 'Raices'], ['calcareo', 'Calcareo'], ['humedadExcesiva', 'Humedad'], ['materialExtrano', 'Mat. extrano'], ['color', 'Color'], ['observaciones', 'Obs']], C);
}

async function vCalendario(mes) {
  loading('Cargando calendario…');
  try {
    await cargarResumen();
  } finally {
    loaded();
  }
  const ym = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : hoy().slice(0, 7);
  const y = Number(ym.slice(0, 4));
  const mo = Number(ym.slice(5, 7)) - 1;
  const D = {};
  (S.resumen.diario || []).forEach(d => { D[d.fecha] = d; });
  const prim = new Date(y, mo, 1).getDay();
  const dias = new Date(y, mo + 1, 0).getDate();
  const ant = iso(new Date(y, mo - 1, 1)).slice(0, 7);
  const sig = iso(new Date(y, mo + 1, 1)).slice(0, 7);
  const tit = new Date(y, mo, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  let h = '<div class="card"><div class="cal-h"><a class="btn" href="#/calendario/' + ant + '">◀</a><h2 style="text-transform:capitalize">' + tit +
    '</h2><a class="btn" href="#/calendario/' + sig + '">▶</a></div><div class="cal">' + ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => '<div class="dn">' + d + '</div>').join('');
  for (let i = 0; i < prim; i++) h += '<div class="c vacio"></div>';
  let tV = 0;
  let tT = 0;
  let tM = 0;
  for (let d = 1; d <= dias; d++) {
    const f = ym + '-' + pad(d);
    const x = D[f];
    let ev = '';
    let lin = '';
    if (x) {
      tV += x.viajes;
      tT += x.ingresoT;
      tM += x.molT;
      if (x.prod) ev += '<i class="t-ok">PROD</i>';
      x.paradas.forEach(p => {
        if (/clim/i.test(p)) ev += '<i class="t-info">CLIMA</i>';
        else if (/ausencia|sin operario/i.test(p)) ev += '<i class="t-warn">FALTA</i>';
        else ev += '<i class="t-bad">PARADA</i>';
      });
      if (x.rechazos) ev += '<i class="t-bad">RECH ' + x.rechazos + '</i>';
      if (x.viajes) lin += '<div class="ln"><span>Viajes</span><span>' + x.viajes + '</span></div>';
      if (x.ingresoT) lin += '<div class="ln"><span>Ingreso</span><span>' + nf(x.ingresoT, 0) + ' t</span></div>';
      if (x.molPal) lin += '<div class="ln"><span>Molienda</span><span>' + nf(x.molPal) + ' pal</span></div>';
    }
    h += '<a class="c ' + (f === hoy() ? 'hoy' : '') + '" href="#/dia/' + f + '" style="text-decoration:none;color:inherit"><b>' + d + '</b>' + lin + '<div class="ev">' + ev + '</div></a>';
  }
  h += '</div><div class="leg"><span><i class="tag t-ok">PROD</i> producción en cantera</span><span><i class="tag t-bad">PARADA</i> avería/mantenimiento</span><span><i class="tag t-info">CLIMA</i> clima</span>' +
    '<span><i class="tag t-warn">FALTA</i> ausencia</span></div></div><div class="kpis mt">' + kpi('Viajes a planta en el mes', nf(tV)) + kpi('Ingreso balanza', nf(tT, 0) + ' <small>t</small>') +
    kpi('Molienda (balanza dinámica)', nf(tM, 0) + ' <small>t</small>') + '</div>';
  app().innerHTML = h;
}

async function vDia(f) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) f = hoy();
  loading('Cargando jornada…');
  let j;
  try {
    await cargarResumen();
    j = await api('jornada', { fecha: f });
  } finally {
    loaded();
  }
  const k = conciliar(j);
  const pal = j.tramos.filter(t => t.tipo === 'Producción');
  const palCam = sum(pal, t => t.paladasCamiones);
  const neto = sum(k.pes, p => p.neto);
  const molR = agrupar(j.molienda, m => m.turno);
  const siloR = agrupar(j.silo, s => s.turno);
  const turnos = Array.from(new Set(Object.keys(molR).concat(Object.keys(siloR)))).sort();
  const elegir = arr => (arr || []).find(x => x.fuente === 'Manual') || (arr || [])[0] || null;
  const acc = [];
  if (puede('jornada')) acc.push('<a class="btn" href="#/cargar/jornada/' + f + '">✎ Jornada cantera</a>');
  if (puede('viajes')) acc.push('<a class="btn" href="#/cargar/viajes/' + f + '">✎ Viajes</a>');
  if (puede('molienda')) acc.push('<a class="btn" href="#/cargar/molienda/' + f + '">✎ Molienda</a>');
  if (puede('calidad')) acc.push('<a class="btn" href="#/cargar/calidad/' + f + '">✎ Calidad</a>');
  if (S.ses) acc.push('<button class="btn" id="bParte">✉ Enviar parte</button>');
  const porMaq = agrupar(j.tramos, t => t.maquina);
  app().innerHTML = '<div class="card"><div class="card-h"><div class="row"><a class="btn sm" href="#/dia/' + addDias(f, -1) + '">◀</a><h2 style="text-transform:capitalize">' + fLarga(f) +
    '</h2><a class="btn sm" href="#/dia/' + addDias(f, 1) + '">▶</a></div><div class="row">' + acc.join('') + '<button class="btn" onclick="window.print()">Imprimir</button></div></div>' +
    '<div class="kpis">' + kpi('Camiones cargados (palas)', nf(sum(pal, t => t.unidadesCargadas))) + kpi('Viajes a planta', nf(k.viajes.length), nf(k.viajesTot.length) + ' totales') +
    kpi('Tickets balanza', nf(k.pes.length), nf(k.pares.length) + ' cruzados con viaje') + kpi('Ingreso', nf(neto, 1) + ' <small>t</small>') +
    kpi('t/palada cantera', nf(palCam > 0 && neto > 0 ? neto / palCam : null, 2), palCam + ' paladas a camión') +
    kpi('Calidad', nf(j.calidad.length), j.calidad.filter(c => c.estado === 'Rechazado').length + ' rechazadas', j.calidad.some(c => c.estado === 'Rechazado') ? 'bad' : '') + '</div>' +
    (k.sinTicket.length || k.sinViaje.length ? '<div class="alert warn">' + (k.sinTicket.length ? k.sinTicket.length + ' viaje(s) sin ticket de balanza. ' : '') + (k.sinViaje.length ? k.sinViaje.length + ' ticket(s) sin viaje registrado.' : '') + '</div>' : '') +
    '</div>' +
    '<div class="card"><h3>Cantera</h3><div class="mt">' + (Object.keys(porMaq).length ? Object.keys(porMaq).map(mq => '<div class="sub" style="margin:10px 0 6px"><b>' + esc(mq) + '</b></div>' +
      tabla([[t => '<span class="tag ' + (t.tipo === 'Producción' ? 't-ok' : 't-bad') + '">' + t.tipo + '</span>', 'Tipo'], [t => t.horaInicio + '–' + t.horaFin, 'Horario'], [t => esc(t.tipo === 'Producción' ? t.operador : t.motivoParada), 'Operador / motivo'],
        [t => t.tipo === 'Producción' ? nf(t.horometroIni, 1) + ' → ' + nf(t.horometroFin, 1) : nf(t.horometroParada, 1), 'Horómetro'], [t => t.tipo === 'Producción' ? t.paladasCamiones : '', 'Pal. cam.', 'n'],
        [t => t.tipo === 'Producción' ? t.paladasAcopios : '', 'Pal. acop.', 'n'], [t => t.tipo === 'Producción' ? t.unidadesCargadas : '', 'Camiones', 'n'], [t => esc(t.personal), 'Personal'], [t => esc(t.observaciones), 'Obs.', 'wrap']], porMaq[mq])).join('') :
      '<div class="empty">Sin jornada de cantera cargada.</div>') + '</div></div>' +
    '<div class="grid g2"><div class="card"><h3>Viajes</h3><div class="mt">' + tabla([[v => esc(v.comprobante) + '·' + v.nroViaje, 'Comp.'], ['horaCarga', 'Carga'], ['horaDescarga', 'Desc.'], ['chofer', 'Chofer'], ['dominio', 'Dominio'], [v => esc(v.destino), 'Destino'],
      [v => k.pares.some(p => p.v === v) ? '<span class="tag t-ok">' + nf(k.pares.find(p => p.v === v).p.neto, 1) + ' t</span>' : (k.viajes.indexOf(v) >= 0 ? '<span class="tag t-warn">sin ticket</span>' : '<span class="tag t-info">otro destino</span>'), 'Balanza']], j.viajes) + '</div></div>' +
    '<div class="card"><h3>Balanza de ingreso</h3><div class="mt">' + tabla([['ticket', 'Ticket'], ['hora', 'Hora'], ['dominio', 'Dominio'], [p => nf(p.neto, 2), 'Neto t', 'n'], ['producto', 'Producto'],
      [p => p.tierra === false ? '<span class="tag t-info">no tierra</span>' : (k.pares.some(x => x.p === p) ? '<span class="tag t-ok">con viaje</span>' : '<span class="tag t-warn">sin viaje</span>'), 'Cruce']], j.pesajes) + '</div></div></div>' +
    '<div class="grid g2"><div class="card"><h3>Molienda y silo</h3><div class="mt">' + tabla([[t => t, 'Turno'], [t => nf((elegir(molR[t]) || {}).paladas), 'Pal. cajón', 'n'], [t => nf((elegir(molR[t]) || {}).toneladas, 1), 't bal. din.', 'n'],
      [t => { const m = elegir(molR[t]); return m && m.paladas && m.toneladas ? nf(m.toneladas / m.paladas, 2) : '–'; }, 't/palada', 'n'], [t => nf((elegir(siloR[t]) || {}).paladas), 'Pal. silo', 'n'], [t => esc((elegir(molR[t]) || elegir(siloR[t]) || {}).fuente), 'Fuente']], turnos) + '</div></div>' +
    '<div class="card"><h3>Calidad</h3><div class="mt">' + tabla([['hora', 'Hora'], ['dominio', 'Dominio'], ['origen', 'Origen'], [c => '<span class="tag ' + (c.estado === 'Aceptado' ? 't-ok' : c.estado === 'Rechazado' ? 't-bad' : 't-warn') + '">' + c.estado + '</span>', 'Estado'],
      [c => [c.arcilla, c.limo, c.arena].map(x => x === null ? '–' : nf(x, 0)).join(' / '), 'A/L/Ar %'], [c => esc(c.observaciones), 'Obs.', 'wrap']], j.calidad) + '</div></div></div>';
  const bp = $('#bParte');
  if (bp) bp.onclick = () => enviarParte(f);
}

async function enviarParte(f) {
  loading('Cargando destinatarios…');
  let lista = [];
  try {
    lista = await api('correos');
  } catch (e) {
    return toast(e.message, 'bad');
  } finally {
    loaded();
  }
  if (!lista.length) return toast('No hay correos configurados', 'warn');
  modal('Enviar parte del ' + fCorta(f), '<p class="sub">Se envía el parte diario (cantera, viajes, balanza y calidad) con PDF adjunto.</p>' +
    lista.map((c, i) => '<label class="chk" style="display:flex;padding:5px 0"><input type="checkbox" data-i="' + i + '"' + (c.tipo !== 'CCO' ? ' checked' : '') + '> ' + esc(c.nombre || '') + ' <span class="sub">' + esc(c.email) + ' · ' + esc(c.tipo) + '</span></label>').join(''), [
    { txt: 'Cancelar' },
    {
      txt: 'Enviar', cls: 'pri', fn: async m => {
        const emails = $$('input[data-i]:checked', m).map(x => lista[Number(x.dataset.i)].email);
        if (!emails.length) { toast('Seleccione destinatarios', 'warn'); return false; }
        loading('Enviando…');
        try {
          await api('enviarParte', { fecha: f, emails: emails });
          toast('Parte enviado a ' + emails.length + ' destinatario(s)', 'ok');
        } catch (e) {
          toast(e.message, 'bad');
          return false;
        } finally {
          loaded();
        }
        return true;
      }
    }
  ]);
}

async function vCargar(mod, arg) {
  await cargarResumen();
  if (!mod) {
    const vis = MODULOS.filter(m => puede(m[0]));
    app().innerHTML = '<h2>Cargar datos</h2><p class="sub">Módulos habilitados para su rol (' + esc(S.ses.rol) + ').</p><div class="grid g3 mt">' +
      vis.map(m => '<a class="card" style="text-decoration:none;color:inherit;margin:0" href="#/cargar/' + m[0] + '"><h3 style="color:var(--accent)">' + m[1] + '</h3><p class="sub">' + m[2] + '</p></a>').join('') + '</div>';
    return;
  }
  if (!puede(mod)) {
    app().innerHTML = '<div class="alert bad">Su rol no tiene acceso a este módulo.</div>';
    return;
  }
  const volver = '<a class="btn sm" href="#/cargar">← Módulos</a> ';
  if (mod === 'jornada') return edJornada(arg || hoy(), volver);
  if (mod === 'viajes') return edViajes(arg || hoy(), volver);
  if (mod === 'pesaje') return edPesaje(volver);
  if (mod === 'molienda') return edMolienda(arg || hoy(), volver);
  if (mod === 'calidad') return edCalidad(arg || hoy(), volver);
  if (mod === 'ajustes') return edAjustes(volver);
}

function linMin(h, esFin) {
  const m = minDe(h);
  if (m === null) return null;
  if (m >= 1320) return (m === 1320 && esFin) ? 1440 : m - 1320;
  return m + 120;
}

function maqInfo(n) {
  return ((S.resumen.catalogos || {}).Maquinas || []).find(m => m.nombre === n) || { nombre: n, tipo: 'Pala' };
}

function nuevoTramo(tipo, hi, hf) {
  return {
    tipo: tipo || 'Producción', horaInicio: hi || '', horaFin: hf || '', operador: '',
    horometroIni: '', horometroFin: '', paladasCamiones: '', paladasAcopios: '', unidadesCargadas: '',
    motivoParada: '', personal: [], horometroParada: '', observaciones: ''
  };
}

async function edJornada(f, volver) {
  loading('Cargando jornada…');
  let j;
  try {
    j = await api('jornada', { fecha: f });
  } finally {
    loaded();
  }
  const maqs = activos('Maquinas').map(m => ({ nombre: m.nombre, tipo: m.tipo }));
  j.tramos.forEach(t => { if (!maqs.some(m => m.nombre === t.maquina)) maqs.push({ nombre: t.maquina, tipo: maqInfo(t.maquina).tipo }); });
  const t = maqs.map(m => j.tramos.filter(x => x.maquina === m.nombre)
    .sort((a, b) => linMin(a.horaInicio) - linMin(b.horaInicio))
    .map(x => Object.assign(nuevoTramo(), x, { personal: x.personal ? String(x.personal).split(',').map(s => s.trim()).filter(Boolean) : [] })));
  S.ed = { fecha: f, maqs: maqs, t: t, previos: j.horometrosPrevios || {}, existe: j.tramos.length > 0, sucio: false };
  const bor = lsGet('tierra_borrador_' + f, null);
  let aviso = j.tramos.length ? '<div class="alert info">Jornada ya registrada por ' + esc(j.tramos[0].usuario || '—') + '. Al guardar se reemplaza completa.</div>' : '';
  if (bor && bor.t) {
    aviso += '<div class="alert warn">Hay un borrador local sin guardar de esta fecha. <button class="btn sm" id="bRest">Restaurar borrador</button> <button class="btn sm dan" id="bDesc">Descartar</button></div>';
  }
  app().innerHTML = '<div class="card"><div class="card-h"><div class="row">' + volver + '<h2>Jornada de cantera</h2></div><div class="row"><label class="f">Fecha<input type="date" id="edF" value="' + f + '"></label>' +
    '<button class="btn" id="bCopia" title="Copia máquinas, horarios y operadores del último día cargado">Copiar estructura del día anterior</button>' +
    '<button class="btn pri" id="bGuardar">Guardar jornada</button></div></div>' + aviso + '<div id="edErr"></div></div><div id="edMaqs"></div>' +
    '<div class="row mt"><button class="btn pri" id="bGuardar2">Guardar jornada</button></div>';
  $('#edF').onchange = e => { location.hash = '#/cargar/jornada/' + e.target.value; };
  $('#bGuardar').onclick = guardarJornada;
  $('#bGuardar2').onclick = guardarJornada;
  $('#bCopia').onclick = copiarAnterior;
  if ($('#bRest')) $('#bRest').onclick = () => { S.ed.t = bor.t; S.ed.sucio = true; pintarEditor(); $('#bRest').parentElement.remove(); };
  if ($('#bDesc')) $('#bDesc').onclick = () => { lsDel('tierra_borrador_' + f); $('#bDesc').parentElement.remove(); };
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

function pintarEditor() {
  const ops = ((S.resumen.catalogos || {}).Operadores || []).filter(o => o.activo);
  const causas = nombres('CausasParada');
  const html = S.ed.maqs.map((m, mi) => {
    const tipoM = String(m.tipo || '').toLowerCase();
    const aptos = ops.filter(o => tipoM === 'topadora' ? o.topadora : (tipoM === 'pala' ? o.pala : true)).map(o => o.nombre);
    const tramos = S.ed.t[mi];
    const resumen = tramos.length ? sum(tramos.filter(x => x.tipo === 'Producción'), x => (num(x.paladasCamiones) || 0) + (num(x.paladasAcopios) || 0)) + ' paladas · ' + tramos.length + ' tramo(s)' : 'sin actividad';
    return '<div class="maq"><div class="maq-h"><div><b>' + esc(m.nombre) + '</b> <span class="tag t-acc">' + esc(m.tipo) + '</span> <span class="sub">' + resumen +
      (S.ed.previos[m.nombre] ? ' · último horómetro ' + nf(S.ed.previos[m.nombre], 1) : '') + '</span></div><div class="row">' +
      '<button class="btn sm" data-add="' + mi + '" data-h="06:00-14:00">+ T2 06–14</button><button class="btn sm" data-add="' + mi + '" data-h="14:00-22:00">+ T3 14–22</button>' +
      '<button class="btn sm" data-add="' + mi + '" data-h="">+ Tramo</button><button class="btn sm dan" data-add="' + mi + '" data-par="1">+ Parada</button></div></div>' +
      tramos.map((t, i) => {
        const id = k => 'e-' + mi + '-' + i + '-' + k;
        const d = k => 'data-m="' + mi + '" data-i="' + i + '" data-k="' + k + '" id="' + id(k) + '"';
        let campos = '<label class="f">Régimen<select ' + d('tipo') + '>' + opts(['Producción', 'Parada'], t.tipo, null) + '</select></label>' +
          '<label class="f">Inicio<input type="time" ' + d('horaInicio') + ' value="' + esc(t.horaInicio) + '"></label>' +
          '<label class="f">Fin<input type="time" ' + d('horaFin') + ' value="' + esc(t.horaFin) + '"></label>';
        if (t.tipo === 'Producción') {
          campos += '<label class="f">Operador<select ' + d('operador') + '>' + opts(aptos, t.operador) + '</select></label>' +
            '<label class="f">Horómetro inicial<input type="number" step="0.1" inputmode="decimal" ' + d('horometroIni') + ' value="' + esc(t.horometroIni) + '"></label>' +
            '<label class="f">Horómetro final<input type="number" step="0.1" inputmode="decimal" ' + d('horometroFin') + ' value="' + esc(t.horometroFin) + '"></label>';
          if (tipoM === 'pala') {
            const pc = num(t.paladasCamiones) || 0;
            const u = num(t.unidadesCargadas) || 0;
            campos += '<label class="f">Paladas a camión<input type="number" min="0" inputmode="numeric" ' + d('paladasCamiones') + ' value="' + esc(t.paladasCamiones) + '"></label>' +
              '<label class="f">Paladas a acopio<input type="number" min="0" inputmode="numeric" ' + d('paladasAcopios') + ' value="' + esc(t.paladasAcopios) + '"></label>' +
              '<label class="f">Camiones cargados<input type="number" min="0" inputmode="numeric" ' + d('unidadesCargadas') + ' value="' + esc(t.unidadesCargadas) + '">' +
              '<span class="prom" id="' + id('prom') + '">' + (u ? nf(pc / u, 1) + ' paladas/camión' : '') + '</span></label>';
          }
        } else {
          campos += '<label class="f">Motivo<select ' + d('motivoParada') + '>' + opts(causas, t.motivoParada) + '</select></label>';
          if (CAUSAS_HOROMETRO.indexOf(t.motivoParada) >= 0) {
            campos += '<label class="f">Horómetro en parada<input type="number" step="0.1" inputmode="decimal" ' + d('horometroParada') + ' value="' + esc(t.horometroParada) + '"></label>';
          }
          if (CAUSAS_PERSONAL_UNO.indexOf(t.motivoParada) >= 0) {
            campos += '<label class="f">Operario<select ' + d('personal') + '>' + opts(ops.map(o => o.nombre), (t.personal || [])[0] || '') + '</select></label>';
          }
          if (CAUSAS_PERSONAL_MULTI.indexOf(t.motivoParada) >= 0) {
            const lista = ops.slice().sort((a, b) => (b.mecanico ? 1 : 0) - (a.mecanico ? 1 : 0)).map(o => o.nombre);
            campos += '<div class="f full" id="' + id('personal') + '"><label class="f">Personal interviniente</label><div class="chips">' +
              lista.map(n => '<label class="chip"><input type="checkbox" data-m="' + mi + '" data-i="' + i + '" data-k="personalMulti" value="' + esc(n) + '"' +
                ((t.personal || []).indexOf(n) >= 0 ? ' checked' : '') + '>' + esc(n) + '</label>').join('') + '</div></div>';
          }
        }
        campos += '<label class="f full">Observaciones<input ' + d('observaciones') + ' value="' + esc(t.observaciones) + '"></label>';
        return '<div class="tramo ' + (t.tipo === 'Parada' ? 'parada' : '') + '"><button class="btn sm dan x" data-del="' + mi + '-' + i + '">✕</button><div class="form">' + campos + '</div></div>';
      }).join('') + '</div>';
  }).join('');
  $('#edMaqs').innerHTML = html;
}

function marcarSucio() {
  S.ed.sucio = true;
  lsSet('tierra_borrador_' + S.ed.fecha, { t: S.ed.t, ts: Date.now() });
}

function onEdInput(e) {
  const el = e.target;
  const k = el.dataset.k;
  if (!k || k === 'personalMulti' || el.tagName === 'SELECT' || k === 'horometroFin' || k === 'horaFin' || el.type === 'time') return;
  const mi = Number(el.dataset.m);
  const i = Number(el.dataset.i);
  const t = S.ed.t[mi][i];
  t[k] = el.value;
  el.classList.remove('inv');
  if (k === 'paladasCamiones' || k === 'unidadesCargadas') {
    const p = $('#e-' + mi + '-' + i + '-prom');
    const u = num(t.unidadesCargadas) || 0;
    if (p) p.textContent = u ? nf((num(t.paladasCamiones) || 0) / u, 1) + ' paladas/camión' : '';
  }
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
  if (k === 'personal') {
    t.personal = el.value ? [el.value] : [];
    return marcarSucio();
  }
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
  if (k === 'tipo' || k === 'motivoParada') {
    if (k === 'tipo' && t.tipo === 'Producción' && !t.horometroIni) t.horometroIni = horPrevio(mi, i);
    pintarEditor();
  }
}

function onEdClick(e) {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.add !== undefined) {
    const mi = Number(b.dataset.add);
    const lista = S.ed.t[mi];
    const ult = lista[lista.length - 1];
    const hor = horPrevio(mi, lista.length);
    let hi = ult ? ult.horaFin : '';
    let hf = '';
    if (b.dataset.h) {
      hi = b.dataset.h.split('-')[0];
      hf = b.dataset.h.split('-')[1];
    }
    const nt = nuevoTramo(b.dataset.par ? 'Parada' : 'Producción', hi, hf);
    if (nt.tipo === 'Producción') {
      nt.horometroIni = hor;
      if (ult && ult.tipo === 'Producción' && b.dataset.h && ult.operador && b.dataset.h === '06:00-14:00') nt.operador = ult.operador;
    }
    lista.push(nt);
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
  loading('Buscando último día cargado…');
  try {
    let f = S.ed.fecha;
    let j = null;
    for (let n = 1; n <= 10; n++) {
      f = addDias(S.ed.fecha, -n);
      j = await api('jornada', { fecha: f });
      if (j.tramos.length) break;
    }
    if (!j || !j.tramos.length) return toast('No hay jornadas en los 10 días anteriores', 'warn');
    S.ed.maqs.forEach((m, mi) => {
      const prev = j.tramos.filter(x => x.maquina === m.nombre && x.tipo === 'Producción').sort((a, b) => linMin(a.horaInicio) - linMin(b.horaInicio));
      if (!prev.length || S.ed.t[mi].length) return;
      let hor = S.ed.previos[m.nombre] || '';
      S.ed.t[mi] = prev.map(x => {
        const nt = nuevoTramo('Producción', x.horaInicio, x.horaFin);
        nt.operador = x.operador;
        nt.horometroIni = hor;
        hor = '';
        return nt;
      });
    });
    marcarSucio();
    pintarEditor();
    toast('Estructura copiada del ' + fCorta(f) + '. Complete horómetros y paladas.', 'ok');
  } catch (e) {
    toast(e.message, 'bad');
  } finally {
    loaded();
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
        if (b <= a) marcar(mi, i, 'horaFin', 'el fin debe ser posterior al inicio (jornada 22:00 → 22:00)');
        else {
          intervalos.forEach(x => { if (a < x[1] && b > x[0]) marcar(mi, i, 'horaInicio', 'se superpone con el tramo ' + (x[2] + 1)); });
          intervalos.push([a, b, i]);
        }
      }
      if (t.tipo === 'Producción') {
        if (!t.operador) marcar(mi, i, 'operador', 'asigne operador');
        const hi = num(t.horometroIni);
        const hf = num(t.horometroFin);
        if (hi === null || hi < 0) marcar(mi, i, 'horometroIni', 'horómetro inicial inválido');
        if (hf === null || hf < 0) marcar(mi, i, 'horometroFin', 'horómetro final inválido');
        if (hi !== null && hf !== null) {
          if (hf < hi) marcar(mi, i, 'horometroFin', 'horómetro final menor al inicial');
          const hs = dur(t.horaInicio, t.horaFin);
          if (hf - hi > hs + 0.5) avisos.push(S.ed.maqs[mi].nombre + ' · tramo ' + (i + 1) + ': ' + nf(hf - hi, 1) + ' h de horómetro en un tramo de ' + nf(hs, 1) + ' h');
          const prev = horPrevio(mi, i);
          if (prev && Math.abs(hi - prev) > 0.05) avisos.push(S.ed.maqs[mi].nombre + ' · tramo ' + (i + 1) + ': horómetro inicial ' + nf(hi, 1) + ' ≠ último registrado ' + nf(prev, 1));
        }
        const pc = num(t.paladasCamiones) || 0;
        const u = num(t.unidadesCargadas) || 0;
        if (pc > 0 && u <= 0) marcar(mi, i, 'unidadesCargadas', 'informe camiones cargados');
        if (u > 0 && pc <= 0) marcar(mi, i, 'paladasCamiones', 'informe paladas a camión');
        if (u > 0 && (pc / u < 2 || pc / u > 12)) avisos.push(S.ed.maqs[mi].nombre + ' · tramo ' + (i + 1) + ': ' + nf(pc / u, 1) + ' paladas/camión fuera de rango habitual');
      } else {
        if (!t.motivoParada) marcar(mi, i, 'motivoParada', 'indique el motivo');
        if (CAUSAS_HOROMETRO.indexOf(t.motivoParada) >= 0 && (num(t.horometroParada) === null || num(t.horometroParada) < 0)) marcar(mi, i, 'horometroParada', 'horómetro de parada requerido');
        if ((CAUSAS_PERSONAL_MULTI.indexOf(t.motivoParada) >= 0 || CAUSAS_PERSONAL_UNO.indexOf(t.motivoParada) >= 0) && !(t.personal || []).length) marcar(mi, i, 'personal', 'indique personal');
      }
    });
  });
  return { errores: errores, avisos: avisos };
}

async function guardarJornada() {
  const v = validarJornada();
  const box = $('#edErr');
  if (v.errores.length) {
    box.innerHTML = '<div class="alert bad"><b>Corrija ' + v.errores.length + ' error(es):</b><ul>' + v.errores.slice(0, 12).map(e => '<li>' + esc(e.msg) + '</li>').join('') + '</ul></div>';
    const p = v.errores.find(e => e.el);
    if (p) p.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  box.innerHTML = '';
  if (v.avisos.length && !(await confirmar('Revisar antes de guardar', '<ul>' + v.avisos.map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>¿Guardar de todos modos?'))) return;
  const tramos = [];
  S.ed.t.forEach((lista, mi) => lista.forEach(t => tramos.push(Object.assign({}, t, { maquina: S.ed.maqs[mi].nombre }))));
  if (!tramos.length && !(await confirmar('Jornada vacía', 'No hay tramos. Si existía una jornada para esta fecha, se eliminará. ¿Continuar?'))) return;
  loading('Guardando jornada…');
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
    loaded();
  }
}

function selConAgregar(id, hoja, lista, valor, label, campo) {
  return '<label class="f">' + label + '<div class="row" style="flex-wrap:nowrap;gap:4px"><select id="' + id + '">' + opts(lista, valor) + '</select>' +
    '<button type="button" class="btn sm" data-agregar="' + hoja + '" data-sel="' + id + '" data-campo="' + (campo || 'nombre') + '" title="Agregar">+</button></div></label>';
}

async function agregarItemRapido(b) {
  const hoja = b.dataset.agregar;
  const sel = $('#' + b.dataset.sel);
  modal('Agregar a ' + hoja, '<label class="f">Valor<input id="nvItem" autocomplete="off"></label>', [
    { txt: 'Cancelar' },
    {
      txt: 'Agregar', cls: 'pri', fn: async m => {
        const v = $('#nvItem', m).value.trim();
        if (!v) return false;
        loading('Agregando…');
        try {
          const r = await api('agregarItem', { hoja: hoja, valor: v });
          const campo = b.dataset.campo;
          const cat = S.resumen.catalogos[hoja] || (S.resumen.catalogos[hoja] = []);
          if (!cat.some(x => x[campo] === r.valor)) {
            const o = { activo: true };
            o[campo] = r.valor;
            cat.push(o);
          }
          $$('select[id]').forEach(s => {
            const btn = $('[data-sel="' + s.id + '"]');
            if (btn && btn.dataset.agregar === hoja && !Array.from(s.options).some(o => o.value === r.valor)) {
              const o = document.createElement('option');
              o.value = r.valor;
              o.textContent = r.valor;
              s.appendChild(o);
            }
          });
          sel.value = r.valor;
          sel.dispatchEvent(new Event('change'));
          lsSet('tierra_resumen', S.resumen);
          toast('Agregado: ' + r.valor, 'ok');
        } catch (e) {
          toast(e.message, 'bad');
          return false;
        } finally {
          loaded();
        }
        return true;
      }
    }
  ]);
}

async function edViajes(f, volver) {
  loading('Cargando viajes…');
  let j;
  let sig = '';
  try {
    const r = await Promise.all([api('jornada', { fecha: f }), api('siguienteComprobante')]);
    j = r[0];
    sig = r[1];
  } finally {
    loaded();
  }
  const mem = lsGet('tierra_viaje_comun', {});
  S.vf = {
    fecha: f, comprobante: String(sig), chofer: mem.chofer || '', dominio: mem.dominio || '', origen: mem.origen || '', destino: mem.destino || (destinosPlanta()[0] || ''),
    tipo: mem.tipo || '', responsable: mem.responsable || '', jornadaCompleta: true, viajes: [{ horaCarga: '', horaDescarga: '', paladas: '', responsable: mem.responsable || '', pagar: true, auto: true }],
    lote: uid(), reemplazar: false, lista: j.viajes, sig: String(sig)
  };
  pintarViajes(volver);
}

function pintarViajes(volver) {
  const v = S.vf;
  const lugares = nombres('Lugares');
  const resp = nombres('Responsables');
  const grupos = agrupar(v.lista, x => x.comprobante);
  app().innerHTML = '<div class="card"><div class="card-h"><div class="row">' + volver + '<h2>' + (v.reemplazar ? 'Editar comprobante N° ' + esc(v.comprobante) : 'Nuevo comprobante de viajes') + '</h2></div>' +
    (v.reemplazar ? '<button class="btn" id="vCancelar">Cancelar edición</button>' : '') + '</div><div id="vErr"></div><div class="form">' +
    '<label class="f">Fecha<input type="date" id="vF" value="' + v.fecha + '"></label>' +
    '<label class="f">N° comprobante<input id="vComp" inputmode="numeric" value="' + esc(v.comprobante) + '"' + (v.reemplazar ? ' disabled' : '') + '></label>' +
    selConAgregar('vChofer', 'Choferes', nombres('Choferes'), v.chofer, 'Chofer') +
    selConAgregar('vDom', 'Dominios', nombres('Dominios', 'dominio'), v.dominio, 'Dominio', 'dominio') +
    selConAgregar('vOri', 'Lugares', lugares, v.origen, 'Origen') +
    selConAgregar('vDes', 'Lugares', lugares, v.destino, 'Destino') +
    selConAgregar('vTipo', 'TiposViaje', nombres('TiposViaje'), v.tipo, 'Tipo de viaje') +
    selConAgregar('vResp', 'Responsables', resp, v.responsable, 'Responsable de carga') +
    '<label class="chk" style="align-self:end;padding-bottom:9px"><input type="checkbox" id="vJor"' + (v.jornadaCompleta ? ' checked' : '') + '> Jornada completa</label></div>' +
    '<h3 class="mt">Viajes del comprobante</h3><div id="vLista" class="mt"></div><div class="row"><button class="btn" id="vMas">+ Agregar viaje</button><span class="sub">La hora de descarga se completa con +1 h si no la modifica.</span>' +
    '<button class="btn pri right" id="vGuardar">' + (v.reemplazar ? 'Guardar cambios' : 'Guardar comprobante') + '</button></div></div>' +
    '<div class="card"><div class="card-h"><h3>Comprobantes del ' + fCorta(v.fecha) + '</h3><span class="sub">' + v.lista.length + ' viajes</span></div>' +
    (Object.keys(grupos).length ? tabla([[c => '<b>' + esc(c) + '</b>', 'Comp.'], [c => esc(grupos[c][0].chofer), 'Chofer'], [c => esc(grupos[c][0].dominio), 'Dominio'],
      [c => esc(grupos[c][0].origen) + ' → ' + esc(grupos[c][0].destino), 'Ruta'], [c => grupos[c].length, 'Viajes', 'n'], [c => grupos[c].map(x => x.horaCarga).join(', '), 'Cargas'],
      [c => '<button class="btn sm" data-ed="' + esc(c) + '">Editar</button> <button class="btn sm dan" data-el="' + esc(c) + '">Eliminar</button>', '']], Object.keys(grupos)) : '<div class="empty">Sin viajes en esta fecha.</div>') + '</div>';
  pintarFilasViaje();
  const sync = () => {
    v.fecha = $('#vF').value;
    v.comprobante = $('#vComp').value.trim();
    v.chofer = $('#vChofer').value;
    v.dominio = $('#vDom').value;
    v.origen = $('#vOri').value;
    v.destino = $('#vDes').value;
    v.tipo = $('#vTipo').value;
    v.jornadaCompleta = $('#vJor').checked;
  };
  app().onchange = e => {
    if (!S.vf || !$('#vF')) return;
    if (e.target.id === 'vF') {
      sync();
      return location.hash === '#/cargar/viajes/' + v.fecha ? null : (location.hash = '#/cargar/viajes/' + v.fecha);
    }
    if (e.target.id === 'vResp') {
      const ant = v.responsable;
      v.responsable = e.target.value;
      v.viajes.forEach(x => { if (!x.responsable || x.responsable === ant) x.responsable = v.responsable; });
      pintarFilasViaje();
    }
    if (e.target.id === 'vOri' || e.target.id === 'vDes') {
      if ($('#vOri').value && $('#vOri').value === $('#vDes').value) {
        toast('Origen y destino no pueden ser iguales', 'warn');
        e.target.value = '';
      }
    }
    sync();
  };
  app().onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.agregar) return agregarItemRapido(b);
    if (b.id === 'vMas') {
      sync();
      const u = v.viajes[v.viajes.length - 1];
      v.viajes.push({ horaCarga: '', horaDescarga: '', paladas: u ? u.paladas : '', responsable: v.responsable, pagar: true, auto: true });
      pintarFilasViaje();
    }
    if (b.dataset.qv !== undefined) {
      v.viajes.splice(Number(b.dataset.qv), 1);
      if (!v.viajes.length) v.viajes.push({ horaCarga: '', horaDescarga: '', paladas: '', responsable: v.responsable, pagar: true, auto: true });
      pintarFilasViaje();
    }
    if (b.id === 'vGuardar') {
      sync();
      guardarViajes(volver);
    }
    if (b.id === 'vCancelar') edViajes(v.fecha, volver);
    if (b.dataset.ed) {
      const c = b.dataset.ed;
      const vs = v.lista.filter(x => x.comprobante === c).sort((a, b2) => a.nroViaje - b2.nroViaje);
      Object.assign(v, {
        comprobante: c, chofer: vs[0].chofer, dominio: vs[0].dominio, origen: vs[0].origen, destino: vs[0].destino, tipo: vs[0].tipo, responsable: vs[0].responsable,
        jornadaCompleta: vs[0].jornadaCompleta, lote: vs[0].lote, reemplazar: true,
        viajes: vs.map(x => ({ horaCarga: x.horaCarga, horaDescarga: x.horaDescarga, paladas: x.paladas === null ? '' : x.paladas, responsable: x.responsable, pagar: x.pagar, auto: false }))
      });
      pintarViajes(volver);
    }
    if (b.dataset.el) {
      if (!(await confirmar('Eliminar comprobante', 'Se eliminarán todos los viajes del comprobante N° ' + esc(b.dataset.el) + '.'))) return;
      loading('Eliminando…');
      try {
        await escribir('eliminarViajes', { comprobante: b.dataset.el }, 'Eliminar comprobante ' + b.dataset.el);
        toast('Comprobante eliminado', 'ok');
        edViajes(v.fecha, volver);
      } catch (er) {
        toast(er.message, 'bad');
      } finally {
        loaded();
      }
    }
  };
}

function pintarFilasViaje() {
  const v = S.vf;
  const resp = nombres('Responsables');
  $('#vLista').innerHTML = v.viajes.map((x, i) => '<div class="viaje"><div class="nro">#' + (i + 1) + '</div>' +
    '<label class="f">Hora carga<input type="time" data-vi="' + i + '" data-vk="horaCarga" value="' + esc(x.horaCarga) + '"></label>' +
    '<label class="f">Hora descarga<input type="time" data-vi="' + i + '" data-vk="horaDescarga" value="' + esc(x.horaDescarga) + '"></label>' +
    '<label class="f">Paladas<input type="number" min="0" inputmode="numeric" data-vi="' + i + '" data-vk="paladas" value="' + esc(x.paladas) + '" placeholder="opcional"></label>' +
    '<label class="f">Responsable<select data-vi="' + i + '" data-vk="responsable">' + opts(resp, x.responsable) + '</select></label>' +
    '<label class="chk" style="padding-bottom:9px"><input type="checkbox" data-vi="' + i + '" data-vk="pagar"' + (x.pagar ? ' checked' : '') + '> Pagar</label>' +
    '<div style="text-align:right"><button class="btn sm dan" data-qv="' + i + '">✕</button></div></div>').join('');
  $$('[data-vk]', $('#vLista')).forEach(el => {
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
      const i = Number(el.dataset.vi);
      const k = el.dataset.vk;
      const x = v.viajes[i];
      x[k] = el.type === 'checkbox' ? el.checked : el.value;
      if (k === 'horaDescarga') x.auto = false;
      if (k === 'horaCarga' && el.value && (x.auto || !x.horaDescarga)) {
        const m = (minDe(el.value) + 60) % 1440;
        x.horaDescarga = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
        x.auto = true;
        const d = $('[data-vi="' + i + '"][data-vk="horaDescarga"]');
        if (d) d.value = x.horaDescarga;
      }
    });
  });
}

async function guardarViajes(volver) {
  const v = S.vf;
  const err = [];
  if (!v.fecha) err.push('Fecha');
  if (!v.comprobante) err.push('N° de comprobante');
  if (!v.chofer) err.push('Chofer');
  if (!v.dominio) err.push('Dominio');
  if (!v.origen) err.push('Origen');
  if (!v.destino) err.push('Destino');
  if (!v.tipo) err.push('Tipo de viaje');
  v.viajes.forEach((x, i) => {
    if (!x.horaCarga) err.push('Hora de carga del viaje #' + (i + 1));
    if (!x.responsable) err.push('Responsable del viaje #' + (i + 1));
  });
  if (v.origen && v.origen === v.destino) err.push('Origen y destino iguales');
  const cargas = v.viajes.map(x => minDe(x.horaCarga)).filter(x => x !== null);
  if (new Set(cargas).size !== cargas.length) err.push('Hay viajes con la misma hora de carga');
  if (err.length) {
    $('#vErr').innerHTML = '<div class="alert bad"><b>Complete:</b> ' + err.map(esc).join(' · ') + '</div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  $('#vErr').innerHTML = '';
  loading('Guardando viajes…');
  try {
    const r = await escribir('guardarViajes', {
      fecha: v.fecha, comprobante: v.comprobante, chofer: v.chofer, dominio: v.dominio, origen: v.origen, destino: v.destino, tipo: v.tipo,
      responsable: v.responsable, jornadaCompleta: v.jornadaCompleta, lote: v.lote, reemplazar: v.reemplazar,
      viajes: v.viajes.map(x => ({ horaCarga: x.horaCarga, horaDescarga: x.horaDescarga, paladas: x.paladas, responsable: x.responsable, pagar: x.pagar }))
    }, 'Comprobante ' + v.comprobante);
    lsSet('tierra_viaje_comun', { chofer: v.chofer, dominio: v.dominio, origen: v.origen, destino: v.destino, tipo: v.tipo, responsable: v.responsable });
    if (!r.encolado) toast('Comprobante ' + v.comprobante + ' guardado (' + r.guardados + ' viajes)', 'ok');
    await edViajes(v.fecha, volver);
    if (r.encolado) {
      S.vf.comprobante = String(Number(v.comprobante) + 1);
      $('#vComp').value = S.vf.comprobante;
    }
  } catch (e) {
    $('#vErr').innerHTML = '<div class="alert bad">' + esc(e.message) + '</div>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    loaded();
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
  app().innerHTML = '<div class="card"><div class="card-h"><div class="row">' + volver + '<h2>Importar balanza de ingreso</h2></div></div>' +
    '<p class="sub">Exporte el pesaje desde el software de la balanza (PESAJE.XLS, .xlsx o .csv) y arrástrelo aquí. Los tickets ya importados se actualizan, no se duplican.</p>' +
    '<div class="drop mt" id="drop">Arrastre el archivo o haga clic para seleccionar<input type="file" id="fileP" accept=".xls,.xlsx,.csv" class="hide"></div><div id="impC"></div></div>';
  const drop = $('#drop');
  const fi = $('#fileP');
  drop.onclick = () => fi.click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('on'); };
  drop.ondragleave = () => drop.classList.remove('on');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('on'); if (e.dataTransfer.files[0]) leerArchivo(e.dataTransfer.files[0]); };
  fi.onchange = () => { if (fi.files[0]) leerArchivo(fi.files[0]); };
}

async function leerArchivo(file) {
  if (typeof XLSX === 'undefined') return toast('La librería de Excel aún no cargó, reintente', 'warn');
  loading('Leyendo ' + file.name + '…');
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: false });
    S.imp = { wb: wb, nombre: file.name, hoja: wb.SheetNames[0] };
    prepararHoja();
  } catch (e) {
    toast('No se pudo leer el archivo: ' + e.message, 'bad');
  } finally {
    loaded();
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
  const guardado = lsGet('tierra_mapeo_pesaje', null);
  autoMapear(guardado);
  pintarImport();
}

function autoMapear(guardado) {
  const enc = (S.imp.filas[S.imp.encab] || []).map(x => String(x).trim());
  const map = {};
  const usados = new Set();
  CAMPOS_PESAJE.forEach(c => {
    if (guardado && guardado.map && guardado.map[c[0]] && enc.indexOf(guardado.map[c[0]]) >= 0) {
      map[c[0]] = guardado.map[c[0]];
      usados.add(map[c[0]]);
    }
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
    const hh = ix.hora >= 0 ? parseFechaHora(g(r, 'hora')) : { hora: '' };
    let hora = hh.hora || fh.hora;
    if (ix.hora >= 0 && typeof g(r, 'hora') === 'number' && g(r, 'hora') < 1) {
      const m = Math.round(g(r, 'hora') * 1440) % 1440;
      hora = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
    }
    const bruto = parseNum(g(r, 'bruto'));
    const tara = parseNum(g(r, 'tara'));
    let neto = parseNum(g(r, 'neto'));
    if (neto === null && bruto !== null && tara !== null) neto = bruto - tara;
    out.push({ ticket: String(g(r, 'ticket')).trim(), fecha: fh.fecha, hora: hora, dominio: normDom(g(r, 'dominio')), bruto: bruto, tara: tara, neto: neto,
      producto: String(g(r, 'producto')).trim(), origen: String(g(r, 'origen')).trim(), chofer: String(g(r, 'chofer')).trim() });
  });
  const netos = out.map(x => x.neto).filter(x => x !== null && x > 0).sort((a, b) => a - b);
  const med = netos.length ? quant(netos, 0.5) : 0;
  if (!S.imp.unidad) S.imp.unidad = med > 200 ? 'kg' : 't';
  const div = S.imp.unidad === 'kg' ? 1000 : 1;
  out.forEach(x => {
    ['bruto', 'tara', 'neto'].forEach(k => { if (x[k] !== null) x[k] = Math.round(x[k] / div * 1000) / 1000; });
  });
  return out;
}

function pintarImport() {
  const enc = (S.imp.filas[S.imp.encab] || []).map(x => String(x).trim()).filter(Boolean);
  const filas = normalizarImport();
  const val = filas.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.fecha) && x.neto !== null && x.neto > 0);
  const inval = filas.length - val.length;
  const fechas = val.map(x => x.fecha).sort();
  const domsCat = new Set(nombres('Dominios', 'dominio').map(normDom));
  const domNuevos = Array.from(new Set(val.map(x => x.dominio).filter(d => d && !domsCat.has(d))));
  const tk = val.map(x => x.ticket).filter(Boolean);
  const dup = tk.length - new Set(tk).size;
  const prods = agrupar(val, x => x.producto || '(vacío)');
  const faltan = CAMPOS_PESAJE.filter(c => c[3] && !S.imp.map[c[0]]).map(c => c[1]);
  if (!S.imp.map.neto && !(S.imp.map.bruto && S.imp.map.tara)) faltan.push('Neto (o Bruto y Tara)');
  $('#impC').innerHTML = '<div class="mt"><div class="row"><b>' + esc(S.imp.nombre) + '</b>' +
    (S.imp.wb.SheetNames.length > 1 ? '<label class="f">Hoja<select id="iHoja">' + opts(S.imp.wb.SheetNames, S.imp.hoja, null) + '</select></label>' : '') +
    '<label class="f">Fila de encabezados<input type="number" id="iEnc" min="1" value="' + (S.imp.encab + 1) + '" style="width:90px"></label>' +
    '<label class="f">Unidad de peso<select id="iUni">' + opts(['kg', 't'], S.imp.unidad, null) + '</select></label></div>' +
    '<h3 class="mt">Columnas</h3><div class="form mt">' + CAMPOS_PESAJE.map(c => '<label class="f">' + c[1] + (c[3] ? ' *' : '') + '<select data-map="' + c[0] + '">' + opts(enc, S.imp.map[c[0]], '— no usar —') + '</select></label>').join('') + '</div>' +
    (faltan.length ? '<div class="alert bad mt">Asigne: ' + faltan.join(', ') + '</div>' : '') +
    '<div class="kpis mt">' + kpi('Filas válidas', nf(val.length), inval ? inval + ' descartadas (sin fecha o neto)' : '') + kpi('Período', fechas.length ? fCorta(fechas[0]) + ' – ' + fCorta(fechas[fechas.length - 1]) : '–') +
    kpi('Toneladas netas', nf(sum(val, x => x.neto), 1)) + kpi('Tickets duplicados en archivo', nf(dup), '', dup ? 'bad' : '') +
    kpi('Dominios no registrados', nf(domNuevos.length), domNuevos.slice(0, 4).join(', '), domNuevos.length ? 'bad' : '') + '</div>' +
    '<div class="sub">Productos: ' + Object.keys(prods).map(p => esc(p) + ' (' + prods[p].length + ')').join(' · ') + '. Configure cuáles son tierra en Parámetros → PRODUCTOS_TIERRA.</div>' +
    '<h3 class="mt">Vista previa</h3><div class="mt">' + tabla([['ticket', 'Ticket'], ['fecha', 'Fecha'], ['hora', 'Hora'], ['dominio', 'Dominio'], [r => nf(r.bruto, 2), 'Bruto t', 'n'], [r => nf(r.tara, 2), 'Tara t', 'n'], [r => nf(r.neto, 2), 'Neto t', 'n'], ['producto', 'Producto'], ['origen', 'Origen']], val.slice(0, 15)) +
    '</div><div class="row mt"><button class="btn pri" id="iImp"' + (faltan.length || !val.length ? ' disabled' : '') + '>Importar ' + nf(val.length) + ' pesajes</button></div></div>';
  if ($('#iHoja')) $('#iHoja').onchange = e => { S.imp.hoja = e.target.value; prepararHoja(); };
  $('#iEnc').onchange = e => { S.imp.encab = Math.max(0, Number(e.target.value) - 1); autoMapear(null); pintarImport(); };
  $('#iUni').onchange = e => { S.imp.unidad = e.target.value; pintarImport(); };
  $$('[data-map]').forEach(s => { s.onchange = () => { S.imp.map[s.dataset.map] = s.value; pintarImport(); }; });
  $('#iImp').onclick = async () => {
    lsSet('tierra_mapeo_pesaje', { map: S.imp.map, unidad: S.imp.unidad });
    loading('Importando ' + val.length + ' pesajes…');
    try {
      const r = await escribir('importarPesajes', { filas: val }, 'Importación ' + S.imp.nombre);
      if (!r.encolado) {
        $('#impC').innerHTML = '<div class="alert ok mt"><b>Importación completa.</b> ' + r.nuevos + ' nuevos · ' + r.actualizados + ' actualizados · ' + r.total + ' pesajes en la base.</div>' +
          '<a class="btn pri" href="#/tablero/viajes">Ver conciliación viajes ↔ balanza</a>';
      }
    } catch (e) {
      toast(e.message, 'bad', 8000);
    } finally {
      loaded();
    }
  };
}

async function edMolienda(f, volver) {
  const desde = addDias(f, -13);
  loading('Cargando molienda…');
  let R;
  try {
    R = await api('rango', { desde: desde, hasta: f });
  } finally {
    loaded();
  }
  const filas = {};
  const fila = (x) => filas[x.fecha + '|' + x.turno] || (filas[x.fecha + '|' + x.turno] = { fecha: x.fecha, turno: x.turno, man: {}, inf: {} });
  R.molienda.forEach(m => { const r = fila(m); r[m.fuente === 'Manual' ? 'man' : 'inf'].pal = m.paladas; r[m.fuente === 'Manual' ? 'man' : 'inf'].t = m.toneladas; r[m.fuente === 'Manual' ? 'man' : 'inf'].obs = m.observaciones; });
  R.silo.forEach(s => { const r = fila(s); r[s.fuente === 'Manual' ? 'man' : 'inf'].silo = s.paladas; });
  const lista = Object.keys(filas).sort().reverse().map(k => filas[k]);
  app().innerHTML = '<div class="card"><div class="card-h"><div class="row">' + volver + '<h2>Molienda y silo por turno</h2></div></div>' +
    '<div class="form"><label class="f">Fecha<input type="date" id="mF" value="' + f + '"></label><label class="f">Turno<select id="mT">' + opts(['T1', 'T2', 'T3'], 'T2', null) + '</select></label>' +
    '<label class="f">Paladas al cajón alimentador<input type="number" min="0" id="mP" inputmode="numeric"></label><label class="f">t balanza dinámica<input type="number" step="0.1" min="0" id="mTon" inputmode="decimal"></label>' +
    '<label class="f">Paladas extraídas de silo<input type="number" min="0" id="mS" inputmode="numeric"></label><label class="f">t/palada<input id="mFac" disabled></label>' +
    '<label class="f full">Observaciones<input id="mO"></label></div><div class="row mt"><button class="btn pri" id="mG">Guardar turno</button>' +
    '<span class="sub">La carga manual tiene prioridad sobre lo importado del Informe de Turno.</span></div></div>' +
    '<div class="card"><div class="card-h"><h3>Importar desde Informe de Turno</h3></div><div class="row"><label class="f">Desde<input type="date" id="iD" value="' + addDias(hoy(), -7) + '"></label>' +
    '<label class="f">Hasta<input type="date" id="iH" value="' + hoy() + '"></label><button class="btn" id="iGo" style="align-self:end">Importar</button></div>' +
    '<p class="sub">Requiere configurar INFORME_* en Parámetros (planilla, hoja y encabezados de columnas).</p></div>' +
    '<div class="card"><div class="card-h"><h3>Últimos 14 días</h3></div>' +
    tabla([['fecha', 'Fecha'], ['turno', 'Turno'], [r => nf(r.man.pal !== undefined ? r.man.pal : r.inf.pal), 'Pal. cajón', 'n'], [r => nf(r.man.t !== undefined ? r.man.t : r.inf.t, 1), 't bal. din.', 'n'],
      [r => { const p = r.man.pal !== undefined ? r.man.pal : r.inf.pal; const t = r.man.t !== undefined ? r.man.t : r.inf.t; return p && t ? nf(t / p, 2) : '–'; }, 't/palada', 'n'],
      [r => nf(r.man.silo !== undefined ? r.man.silo : r.inf.silo), 'Pal. silo', 'n'],
      [r => (Object.keys(r.man).length ? '<span class="tag t-acc">Manual</span> ' : '') + (Object.keys(r.inf).length ? '<span class="tag t-info">Informe</span>' : ''), 'Fuente'],
      [r => '<button class="btn sm" data-me="' + r.fecha + '|' + r.turno + '">Editar</button>' + (Object.keys(r.man).length ? ' <button class="btn sm dan" data-md="' + r.fecha + '|' + r.turno + '">Quitar manual</button>' : ''), '']], lista) + '</div>';
  const fac = () => {
    const p = num($('#mP').value);
    const t = num($('#mTon').value);
    $('#mFac').value = p && t ? nf(t / p, 2) : '';
  };
  $('#mP').oninput = fac;
  $('#mTon').oninput = fac;
  $('#mF').onchange = e => { location.hash = '#/cargar/molienda/' + e.target.value; };
  $('#mG').onclick = async () => {
    const d = { fecha: $('#mF').value, turno: $('#mT').value, paladas: $('#mP').value, toneladas: $('#mTon').value, paladasSilo: $('#mS').value, observaciones: $('#mO').value };
    if (!d.fecha) return toast('Fecha requerida', 'bad');
    if (d.paladas === '' && d.toneladas === '' && d.paladasSilo === '') return toast('Cargue al menos un valor', 'warn');
    const p = num(d.paladas);
    const t = num(d.toneladas);
    if (p && t && (t / p < 1 || t / p > 10) && !(await confirmar('Factor fuera de rango', nf(t / p, 2) + ' t/palada es inusual. ¿Guardar igual?'))) return;
    loading('Guardando…');
    try {
      const r = await escribir('guardarMolienda', d, 'Molienda ' + d.fecha + ' ' + d.turno);
      if (!r.encolado) toast('Turno guardado', 'ok');
      edMolienda(d.fecha, volver);
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      loaded();
    }
  };
  $('#iGo').onclick = async () => {
    loading('Importando Informe de Turno…');
    try {
      const r = await api('importarInforme', { desde: $('#iD').value, hasta: $('#iH').value });
      invalidar();
      toast('Importados ' + r.turnos + ' turno(s)', 'ok');
      edMolienda(f, volver);
    } catch (e) {
      toast(e.message, 'bad', 8000);
    } finally {
      loaded();
    }
  };
  app().onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.me) {
      const r = filas[b.dataset.me];
      const src = Object.keys(r.man).length ? r.man : r.inf;
      $('#mF').value = r.fecha;
      $('#mT').value = r.turno;
      $('#mP').value = src.pal === null || src.pal === undefined ? '' : src.pal;
      $('#mTon').value = src.t === null || src.t === undefined ? '' : src.t;
      $('#mS').value = src.silo === null || src.silo === undefined ? '' : src.silo;
      $('#mO').value = src.obs || '';
      fac();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (b.dataset.md) {
      const p = b.dataset.md.split('|');
      if (!(await confirmar('Quitar carga manual', 'Se eliminará la carga manual de ' + p[0] + ' ' + p[1] + '. Si existe dato del Informe de Turno, pasará a usarse.'))) return;
      loading('Eliminando…');
      try {
        await escribir('eliminarMolienda', { fecha: p[0], turno: p[1] }, 'Quitar molienda ' + b.dataset.md);
        edMolienda(f, volver);
      } catch (er) {
        toast(er.message, 'bad');
      } finally {
        loaded();
      }
    }
  };
}

async function edCalidad(f, volver) {
  loading('Cargando…');
  let j;
  try {
    j = await api('jornada', { fecha: f });
  } finally {
    loaded();
  }
  S.cal = { fecha: f, lista: j.calidad, viajes: j.viajes, pesajes: j.pesajes, id: null };
  pintarCalidad(volver);
}

function pintarCalidad(volver, reg) {
  const c = S.cal;
  const r = reg || {};
  const tol = num(S.resumen.parametros.TOLERANCIA_COMPOSICION) || 5;
  const colores = ['Rojiza', 'Marrón', 'Gris', 'Amarillenta', 'Negra', 'Mixta'];
  const defs = [['piedras', 'Piedras'], ['raices', 'Raíces / vegetal'], ['calcareo', 'Calcáreo / tosca'], ['humedadExcesiva', 'Humedad excesiva'], ['materialExtrano', 'Material extraño']];
  app().innerHTML = '<div class="card"><div class="card-h"><div class="row">' + volver + '<h2>' + (r.id ? 'Editar muestra' : 'Control de calidad de tierra') + '</h2></div></div><div id="cErr"></div>' +
    '<div class="form"><label class="f">Fecha<input type="date" id="cF" value="' + c.fecha + '"></label><label class="f">Hora<input type="time" id="cH" value="' + esc(r.hora || '') + '"></label>' +
    '<label class="f w2">Vincular a viaje del día<select id="cV">' + '<option value="">— sin vincular —</option>' + c.viajes.map((v, i) => '<option value="' + i + '"' +
      (r.comprobante && r.comprobante === v.comprobante && r.dominio === v.dominio ? ' selected' : '') + '>' + esc(v.horaCarga + ' · ' + v.dominio + ' · ' + v.chofer + ' · comp. ' + v.comprobante) + '</option>').join('') + '</select></label>' +
    '<label class="f">Dominio<select id="cDom">' + opts(nombres('Dominios', 'dominio'), r.dominio || '') + '</select></label>' +
    '<label class="f">Chofer<select id="cCh">' + opts(nombres('Choferes'), r.chofer || '') + '</select></label>' +
    '<label class="f">Origen / frente<select id="cOr">' + opts(nombres('Lugares'), r.origen || '') + '</select></label>' +
    '<label class="f">Comprobante<input id="cComp" value="' + esc(r.comprobante || '') + '"></label><label class="f">Ticket balanza<input id="cTk" value="' + esc(r.ticket || '') + '"></label></div>' +
    '<h3 class="mt">Inspección visual</h3><div class="chips mt">' + defs.map(d => '<label class="chip"><input type="checkbox" id="cd_' + d[0] + '"' + (r[d[0]] ? ' checked' : '') + '>' + d[1] + '</label>').join('') + '</div>' +
    '<div class="form mt"><label class="f">Color<select id="cCol">' + opts(colores, r.color || '') + '</select></label></div>' +
    '<h3 class="mt">Ensayo de sedimentación (casero)</h3><div class="form mt"><label class="f">% Arcilla<input type="number" min="0" max="100" step="0.5" id="cA" value="' + esc(r.arcilla === null || r.arcilla === undefined ? '' : r.arcilla) + '"></label>' +
    '<label class="f">% Limo<input type="number" min="0" max="100" step="0.5" id="cL" value="' + esc(r.limo === null || r.limo === undefined ? '' : r.limo) + '"></label>' +
    '<label class="f">% Arena<input type="number" min="0" max="100" step="0.5" id="cR" value="' + esc(r.arena === null || r.arena === undefined ? '' : r.arena) + '" placeholder="auto por diferencia"></label>' +
    '<div class="f w2"><label class="f">Composición <span id="cSum"></span></label><div class="comp" id="cBar"></div></div></div>' +
    '<h3 class="mt">Decisión</h3><div class="chips mt">' + ['Aceptado', 'Observado', 'Rechazado'].map(e => '<label class="chip"><input type="radio" name="cE" value="' + e + '"' + (r.estado === e ? ' checked' : '') + '>' + e + '</label>').join('') + '</div>' +
    '<div class="form mt"><label class="f full">Observaciones<input id="cO" value="' + esc(r.observaciones || '') + '"></label></div>' +
    '<div class="row mt"><button class="btn pri" id="cG">' + (r.id ? 'Guardar cambios' : 'Guardar muestra') + '</button>' + (r.id ? '<button class="btn" id="cN">Nueva muestra</button>' : '') + '</div></div>' +
    '<div class="card"><div class="card-h"><h3>Muestras del ' + fCorta(c.fecha) + '</h3></div>' +
    tabla([['hora', 'Hora'], ['dominio', 'Dominio'], ['chofer', 'Chofer'], ['origen', 'Origen'], [x => '<span class="tag ' + (x.estado === 'Aceptado' ? 't-ok' : x.estado === 'Rechazado' ? 't-bad' : 't-warn') + '">' + x.estado + '</span>', 'Estado'],
      [x => [x.arcilla, x.limo, x.arena].map(y => y === null ? '–' : nf(y, 0)).join(' / '), 'A/L/Ar %'], [x => defs.filter(d => x[d[0]]).map(d => d[1]).join(', '), 'Defectos'],
      [x => '<button class="btn sm" data-ce="' + x.id + '">Editar</button> <button class="btn sm dan" data-cx="' + x.id + '">✕</button>', '']], c.lista) + '</div>';
  c.id = r.id || null;
  const barra = () => {
    const a = num($('#cA').value);
    const l = num($('#cL').value);
    let ar = num($('#cR').value);
    if (ar === null && a !== null && l !== null && $('#cR').dataset.auto !== 'no') {
      ar = Math.max(0, 100 - a - l);
      $('#cR').placeholder = 'auto: ' + nf(ar, 1);
    }
    const s = (a || 0) + (l || 0) + (ar || 0);
    $('#cSum').innerHTML = (a !== null || l !== null) ? '· suma ' + nf(s, 1) + '% ' + (Math.abs(s - 100) <= tol ? '<span class="tag t-ok">ok</span>' : '<span class="tag t-bad">≠ 100</span>') : '';
    $('#cBar').innerHTML = '<span style="width:' + (a || 0) + '%;background:' + COL[0] + '"></span><span style="width:' + (l || 0) + '%;background:' + COL[3] + '"></span><span style="width:' + (ar || 0) + '%;background:' + COL[5] + '"></span>';
  };
  ['cA', 'cL', 'cR'].forEach(id => { $('#' + id).oninput = barra; });
  $('#cR').addEventListener('input', () => { $('#cR').dataset.auto = $('#cR').value === '' ? '' : 'no'; });
  barra();
  $('#cF').onchange = e => { location.hash = '#/cargar/calidad/' + e.target.value; };
  $('#cV').onchange = e => {
    const v = c.viajes[Number(e.target.value)];
    if (!v) return;
    $('#cDom').innerHTML = opts(nombres('Dominios', 'dominio'), v.dominio);
    $('#cCh').innerHTML = opts(nombres('Choferes'), v.chofer);
    $('#cOr').innerHTML = opts(nombres('Lugares'), v.origen);
    $('#cComp').value = v.comprobante;
    if (!$('#cH').value) $('#cH').value = v.horaDescarga || v.horaCarga;
    const p = c.pesajes.find(x => normDom(x.dominio) === normDom(v.dominio) && Math.abs((minDe(x.hora) || 0) - (minDe(v.horaDescarga) || 0)) <= 120);
    if (p) $('#cTk').value = p.ticket;
  };
  $('#cG').onclick = () => guardarCalidad(volver, defs);
  if ($('#cN')) $('#cN').onclick = () => pintarCalidad(volver);
  app().onclick = async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.ce) {
      pintarCalidad(volver, c.lista.find(x => x.id === b.dataset.ce));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (b.dataset.cx) {
      if (!(await confirmar('Eliminar muestra', '¿Eliminar el registro de calidad?'))) return;
      loading('Eliminando…');
      try {
        await escribir('eliminarCalidad', { id: b.dataset.cx }, 'Eliminar muestra calidad');
        edCalidad(c.fecha, volver);
      } catch (er) {
        toast(er.message, 'bad');
      } finally {
        loaded();
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
  const tol = num(S.resumen.parametros.TOLERANCIA_COMPOSICION) || 5;
  if ((a !== null || l !== null || ar !== null) && Math.abs((a || 0) + (l || 0) + (ar || 0) - 100) > tol) err.push('arcilla + limo + arena debe sumar 100%');
  if (est === 'Rechazado' && !$('#cO').value.trim()) err.push('motivo del rechazo en observaciones');
  if (err.length) {
    $('#cErr').innerHTML = '<div class="alert bad">Complete: ' + err.join(' · ') + '</div>';
    return window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const d = {
    id: c.id, fecha: $('#cF').value, hora: $('#cH').value, dominio: $('#cDom').value, chofer: $('#cCh').value, origen: $('#cOr').value, comprobante: $('#cComp').value, ticket: $('#cTk').value,
    color: $('#cCol').value, arcilla: a, limo: l, arena: ar, estado: est, observaciones: $('#cO').value
  };
  defs.forEach(x => { d[x[0]] = $('#cd_' + x[0]).checked; });
  loading('Guardando…');
  try {
    const r = await escribir('guardarCalidad', d, 'Calidad ' + d.fecha + ' ' + (d.dominio || d.origen));
    if (!r.encolado) toast('Muestra guardada', 'ok');
    edCalidad(d.fecha, volver);
  } catch (e) {
    $('#cErr').innerHTML = '<div class="alert bad">' + esc(e.message) + '</div>';
  } finally {
    loaded();
  }
}

function edAjustes(volver) {
  const lista = (S.resumen.ajustes || []).slice().sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  app().innerHTML = '<div class="card"><div class="card-h"><div class="row">' + volver + '<h2>Ajustes de stock</h2></div></div>' +
    '<div class="alert info"><b>Stock inicial</b> y <b>Cubicación</b> fijan el stock en ese valor al inicio del día; <b>Corrección</b> suma o resta toneladas (use negativo para restar). Cargue una cubicación periódica (topografía o drone) para corregir la deriva del factor t/palada.</div>' +
    '<div class="form"><label class="f">Fecha<input type="date" id="aF" value="' + hoy() + '"></label><label class="f">Nodo<select id="aN">' + opts(['Playa', 'Silo'], 'Playa', null) + '</select></label>' +
    '<label class="f">Tipo<select id="aT">' + opts(['Stock inicial', 'Cubicación', 'Corrección'], 'Cubicación', null) + '</select></label><label class="f">Toneladas<input type="number" step="0.1" id="aV"></label>' +
    '<label class="f full">Observaciones / método<input id="aO" placeholder="Ej: cubicación con drone, densidad 1,55 t/m³"></label></div><div class="row mt"><button class="btn pri" id="aG">Guardar ajuste</button></div></div>' +
    '<div class="card"><h3>Ajustes registrados</h3><div class="mt">' + tabla([['fecha', 'Fecha'], ['nodo', 'Nodo'], ['tipo', 'Tipo'], [r => nf(r.toneladas, 1), 't', 'n'], ['usuario', 'Usuario'], [r => esc(r.observaciones), 'Obs.', 'wrap'],
      [r => '<button class="btn sm dan" data-ax="' + r.id + '">✕</button>', '']], lista) + '</div></div>';
  $('#aG').onclick = async () => {
    const d = { fecha: $('#aF').value, nodo: $('#aN').value, tipo: $('#aT').value, toneladas: $('#aV').value, observaciones: $('#aO').value };
    if (!d.fecha || d.toneladas === '') return toast('Fecha y toneladas requeridas', 'bad');
    loading('Guardando…');
    try {
      await escribir('guardarAjuste', d, 'Ajuste ' + d.nodo + ' ' + d.fecha);
      await cargarResumen(true);
      toast('Ajuste guardado', 'ok');
      edAjustes(volver);
    } catch (e) {
      toast(e.message, 'bad');
    } finally {
      loaded();
    }
  };
  app().onclick = async e => {
    const b = e.target.closest('button[data-ax]');
    if (!b || !(await confirmar('Eliminar ajuste', '¿Eliminar este ajuste de stock?'))) return;
    loading('Eliminando…');
    try {
      await escribir('eliminarAjuste', { id: b.dataset.ax }, 'Eliminar ajuste');
      await cargarResumen(true);
      edAjustes(volver);
    } catch (er) {
      toast(er.message, 'bad');
    } finally {
      loaded();
    }
  };
}

const DEF_CONFIG = {
  Maquinas: { t: 'Máquinas', c: [['nombre', 'Nombre'], ['tipo', 'Tipo', 'sel', ['Pala', 'Topadora', 'Excavadora', 'Motoniveladora', 'Otro']], ['activo', 'Activa', 'bool']] },
  Operadores: { t: 'Operadores', c: [['nombre', 'Nombre'], ['pala', 'Pala', 'bool'], ['topadora', 'Topadora', 'bool'], ['mecanico', 'Mecánico', 'bool'], ['activo', 'Activo', 'bool']] },
  Choferes: { t: 'Choferes', c: [['nombre', 'Nombre'], ['activo', 'Activo', 'bool']] },
  Dominios: { t: 'Dominios', c: [['dominio', 'Dominio'], ['descripcion', 'Descripción / propietario'], ['activo', 'Activo', 'bool']] },
  Lugares: { t: 'Orígenes y destinos', c: [['nombre', 'Nombre'], ['clase', 'Clase', 'sel', ['Frente', 'Acopio cantera', 'Playa', 'Fábrica', 'Otro']], ['activo', 'Activo', 'bool']] },
  TiposViaje: { t: 'Tipos de viaje', c: [['nombre', 'Nombre'], ['activo', 'Activo', 'bool']] },
  Responsables: { t: 'Responsables', c: [['nombre', 'Nombre'], ['activo', 'Activo', 'bool']] },
  CausasParada: { t: 'Causas de parada', c: [['nombre', 'Nombre'], ['activo', 'Activa', 'bool']] },
  Usuarios: { t: 'Usuarios', c: [['nombre', 'Usuario'], ['rol', 'Rol', 'sel', ['admin', 'cantera', 'balanza', 'molienda', 'calidad']], ['activo', 'Activo', 'bool'], ['pin', 'Nuevo PIN', 'pin']] },
  Correos: { t: 'Correos', c: [['nombre', 'Nombre'], ['email', 'Email'], ['tipo', 'Tipo', 'sel', ['PARA', 'CC', 'CCO']], ['activo', 'Activo', 'bool']] },
  Parametros: { t: 'Parámetros', c: [['clave', 'Clave', 'ro'], ['valor', 'Valor'], ['descripcion', 'Descripción', 'ro']], fijo: true }
};

async function vConfig(hoja) {
  if (!DEF_CONFIG[hoja]) hoja = 'Maquinas';
  if (!S.cfg) {
    loading('Cargando configuración…');
    try {
      S.cfg = await api('leerConfig');
    } finally {
      loaded();
    }
  }
  const def = DEF_CONFIG[hoja];
  const filas = (S.cfg[hoja] || []).map(x => Object.assign({}, x));
  app().innerHTML = '<h2>Configuración</h2><div class="tabs mt">' + Object.keys(DEF_CONFIG).map(k => '<button data-h="' + k + '" class="' + (k === hoja ? 'on' : '') + '">' + DEF_CONFIG[k].t + '</button>').join('') + '</div>' +
    '<div class="card"><div class="card-h"><h3>' + def.t + ' <span class="sub">(' + filas.length + ')</span></h3><div class="row"><input id="cfgBus" placeholder="Buscar…" style="width:180px">' +
    (def.fijo ? '' : '<button class="btn" id="cfgAdd">+ Agregar</button>') + '<button class="btn pri" id="cfgSave">Guardar cambios</button></div></div>' +
    (hoja === 'Usuarios' ? '<div class="alert info">El PIN se guarda cifrado; deje "Nuevo PIN" vacío para conservar el actual. 4 a 8 dígitos.</div>' : '') +
    '<div class="tw max" style="max-height:60vh"><table class="edit"><thead><tr>' + def.c.map(c => '<th>' + c[1] + '</th>').join('') + (def.fijo ? '' : '<th></th>') + '</tr></thead><tbody id="cfgB"></tbody></table></div></div>';
  const celda = (c, v, i) => {
    const a = 'data-i="' + i + '" data-c="' + c[0] + '"';
    if (c[2] === 'bool') return '<input type="checkbox" ' + a + (v ? ' checked' : '') + '>';
    if (c[2] === 'sel') return '<select ' + a + '>' + opts(c[3], v || '', '') + '</select>';
    if (c[2] === 'pin') return '<input type="password" inputmode="numeric" maxlength="8" placeholder="sin cambio" ' + a + '>';
    if (c[2] === 'ro') return c[0] === 'descripcion' ? '<span class="sub">' + esc(v) + '</span>' : '<code>' + esc(v) + '</code>';
    return '<input ' + a + ' value="' + esc(v) + '">';
  };
  const pintar = () => {
    const q = $('#cfgBus').value.trim().toUpperCase();
    $('#cfgB').innerHTML = filas.map((f, i) => (q && !JSON.stringify(f).toUpperCase().includes(q)) ? '' : '<tr>' + def.c.map(c => '<td' + (c[0] === 'descripcion' && def.fijo ? ' class="wrap"' : '') + '>' + celda(c, f[c[0]], i) + '</td>').join('') +
      (def.fijo ? '' : '<td><button class="btn sm dan" data-x="' + i + '">✕</button></td>') + '</tr>').join('');
  };
  pintar();
  $('#cfgBus').oninput = pintar;
  $$('.tabs button').forEach(b => { b.onclick = () => { location.hash = '#/config/' + b.dataset.h; }; });
  $('#cfgB').addEventListener('input', e => { const el = e.target; if (el.dataset.c) filas[Number(el.dataset.i)][el.dataset.c] = el.type === 'checkbox' ? el.checked : el.value; });
  $('#cfgB').addEventListener('change', e => { const el = e.target; if (el.dataset.c) filas[Number(el.dataset.i)][el.dataset.c] = el.type === 'checkbox' ? el.checked : el.value; });
  $('#cfgB').addEventListener('click', e => {
    const b = e.target.closest('button[data-x]');
    if (b) { filas.splice(Number(b.dataset.x), 1); pintar(); }
  });
  if ($('#cfgAdd')) $('#cfgAdd').onclick = () => {
    const o = {};
    def.c.forEach(c => { o[c[0]] = c[2] === 'bool' ? true : (c[2] === 'sel' ? c[3][0] : ''); });
    filas.unshift(o);
    $('#cfgBus').value = '';
    pintar();
    const p = $('#cfgB input');
    if (p) p.focus();
  };
  $('#cfgSave').onclick = async () => {
    loading('Guardando ' + def.t + '…');
    try {
      const r = await api('guardarCatalogo', { hoja: hoja, filas: filas });
      S.cfg = null;
      invalidar();
      await cargarResumen(true);
      toast(def.t + ': ' + r.guardados + ' registros guardados', 'ok');
      vConfig(hoja);
    } catch (e) {
      toast(e.message, 'bad', 8000);
    } finally {
      loaded();
    }
  };
}

function aplicarTema(t) {
  if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
}

function iniciar() {
  aplicarTema(lsGet('tierra_tema', ''));
  $('#btnTema').onclick = () => {
    const actual = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nuevo = actual === 'dark' ? 'light' : 'dark';
    lsSet('tierra_tema', nuevo);
    aplicarTema(nuevo);
    render();
  };
  const s = lsGet('tierra_ses', null);
  if (s && s.vence > Date.now()) S.ses = s;
  S.cola = lsGet('tierra_cola', []);
  const r = lsGet('tierra_rango', null);
  if (r && r.preset === 'custom') {
    S.preset = 'custom';
    S.desde = r.desde;
    S.hasta = r.hasta;
  } else {
    aplicarPreset(r ? r.preset : '30');
  }
  $('#btnSesion').onclick = menuSesion;
  $('#cola').onclick = verCola;
  const red = () => {
    $('#red').classList.toggle('off', !navigator.onLine);
    $('#red').title = navigator.onLine ? 'En línea' : 'Sin conexión';
    if (navigator.onLine) procesarCola();
  };
  window.addEventListener('online', red);
  window.addEventListener('offline', red);
  window.addEventListener('hashchange', () => {
    if (S.ed && S.ed.sucio && !location.hash.startsWith('#/cargar/jornada/' + S.ed.fecha)) toast('Borrador de jornada guardado localmente', 'info');
    render();
  });
  window.addEventListener('beforeunload', e => { if (S.ed && S.ed.sucio && location.hash.indexOf('#/cargar/jornada') === 0) { e.preventDefault(); e.returnValue = ''; } });
  if (typeof Chart !== 'undefined') Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
  pintarSesion();
  pintarCola();
  red();
  render();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(e => console.warn(e));
  setInterval(() => { if (S.ses && S.ses.vence < Date.now()) { setSesion(null); toast('La sesión venció', 'warn'); } }, 60000);
}

iniciar();
