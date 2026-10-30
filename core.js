'use strict';

const S = {
  ses: null,
  resumen: null,
  resumenVencido: false,
  rango: null,
  rangoK: '',
  desde: '',
  hasta: '',
  preset: '30',
  cola: [],
  procesando: false,
  charts: {},
  cfg: null,
  info: null,
  cargas: 0
};

const PERMISOS = {
  viajes: ['cantera', 'balanza'],
  jornada: ['cantera'],
  pesaje: ['balanza'],
  molienda: ['molienda'],
  calidad: ['calidad', 'balanza'],
  ajustes: ['admin'],
  liquidacion: ['cantera', 'balanza']
};

const P = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
const ICON = {
  inicio: P('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'),
  tablero: P('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'),
  calendario: P('<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/>'),
  cargar: P('<path d="M12 5v14M5 12h14"/>'),
  mas: P('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'),
  config: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  camion: P('<path d="M1 15V6a1 1 0 0 1 1-1h11v10"/><path d="M13 9h4l4 4v2h-8"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/><path d="M8 17.5h7"/>'),
  pala: P('<path d="M2 18h9l2-5h4"/><path d="M17 13l3-6h2v4l-3 2"/><circle cx="5" cy="19" r="2"/><circle cx="10" cy="19" r="2"/><path d="M4 18V12h6l1 2"/>'),
  topadora: P('<rect x="4" y="9" width="12" height="6" rx="1"/><path d="M7 9V6h5v3"/><path d="M16 11h3l2 5h-4"/><rect x="3" y="15" width="14" height="4" rx="2"/>'),
  cantera: P('<path d="M2 20 9 8l4 6 3-4 6 10z"/><path d="M14 4h3l1 2"/>'),
  balanza: P('<path d="M12 3v18M5 21h14"/><path d="M6 7h12"/><path d="M6 7 3 14a3 3 0 0 0 6 0z"/><path d="M18 7l-3 7a3 3 0 0 0 6 0z"/>'),
  playa: P('<path d="M2 20c3-6 5-9 8-9s4 4 6 4 3-2 6-2v7z"/>'),
  molienda: P('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v5M12 15v5M4 12h5M15 12h5"/>'),
  silo: P('<path d="M6 8a6 4 0 0 1 12 0v10l-6 3-6-3z"/><path d="M6 12h12"/>'),
  ladrillo: P('<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M3 12h18M9 6v6M15 12v6"/>'),
  calidad: P('<path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 14h9"/>'),
  combustible: P('<path d="M3 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M2 21h13"/><path d="M14 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M6 8h5"/>'),
  dinero: P('<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'),
  ajuste: P('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>'),
  archivo: P('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 18v-6M9 15l3 3 3-3"/>'),
  camara: P('<path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/>'),
  chispa: P('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>'),
  ok: P('<path d="M20 6 9 17l-5-5"/>'),
  x: P('<path d="M18 6 6 18M6 6l12 12"/>'),
  alerta: P('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'),
  infoI: P('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  reloj: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  usuario: P('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  salir: P('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>'),
  luna: P('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  sol: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  izq: P('<path d="M15 18l-6-6 6-6"/>'),
  der: P('<path d="M9 18l6-6-6-6"/>'),
  refrescar: P('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  imprimir: P('<path d="M6 9V2h12v7"/><rect x="6" y="14" width="12" height="8"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>'),
  descargar: P('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>'),
  correo: P('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>'),
  editar: P('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  borrar: P('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
  copiar: P('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  guardar: P('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'),
  vacio: P('<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>'),
  lluvia: P('<path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/><path d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2M12 15v2"/>'),
  llave: P('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>'),
  ruta: P('<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>')
};

const COL = n => 'var(--s' + n + ')';
const CAUSAS_PERSONAL_MULTI = ['Avería mecánica', 'Mantenimiento programado'];
const CAUSAS_PERSONAL_UNO = ['Ausencia de operario', 'Condiciones climáticas', 'Sin operario', 'Sin Operario'];
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
const difDias = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 86400000);
const fCorta = f => f ? f.slice(8, 10) + '/' + f.slice(5, 7) : '';
const fMedia = f => f ? aFecha(f).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const fLarga = f => { const t = aFecha(f).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); };
const tick = v => nf(v, Math.abs(v) < 10 && v % 1 ? 1 : 0);
const nf = (n, d = 0) => (n === null || n === undefined || isNaN(n) || !isFinite(n)) ? '–' : Number(n).toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = v => { if (v === '' || v === null || v === undefined) return null; const n = Number(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
const sum = (a, f) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const minDe = h => { const m = String(h || '').match(/(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
const hDe = m => pad(Math.floor(((m % 1440) + 1440) % 1440 / 60)) + ':' + pad(((m % 60) + 60) % 60);
const dur = (a, b) => { const x = minDe(a); const y = minDe(b); if (x === null || y === null) return 0; return ((y - x + 1440) % 1440) / 60; };
const normDom = d => String(d || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const normTxt = s => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9Ñ ]/g, '').replace(/\s+/g, ' ').trim();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
const quant = (a, q) => { if (!a.length) return null; const p = (a.length - 1) * q; const b = Math.floor(p); return a[b + 1] !== undefined ? a[b] + (p - b) * (a[b + 1] - a[b]) : a[b]; };
const agrupar = (arr, fk) => arr.reduce((m, x) => { const k = fk(x); (m[k] = m[k] || []).push(x); return m; }, {});
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn(e); } };
const lsDel = k => { try { localStorage.removeItem(k); } catch (e) { console.warn(e); } };
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function parseHora(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{1,2})[:.,hH ](\d{1,2})$/);
  if (m) return (Number(m[1]) < 24 && Number(m[2]) < 60) ? pad(m[1]) + ':' + pad(m[2]) : null;
  m = s.match(/^\d{1,4}$/);
  if (!m) return null;
  let h;
  let mi;
  if (s.length <= 2) { h = Number(s); mi = 0; } else if (s.length === 3) { h = Number(s[0]); mi = Number(s.slice(1)); } else { h = Number(s.slice(0, 2)); mi = Number(s.slice(2)); }
  return h < 24 && mi < 60 ? pad(h) + ':' + pad(mi) : null;
}

function activos(hoja) {
  return ((S.resumen && S.resumen.catalogos && S.resumen.catalogos[hoja]) || []).filter(x => x.activo);
}

function nombres(hoja) {
  return activos(hoja).map(x => x.nombre).sort((a, b) => String(a).localeCompare(String(b)));
}

function opts(arr, sel, ph = 'Seleccionar…') {
  const lista = arr.slice();
  if (sel && lista.indexOf(sel) < 0) lista.unshift(sel);
  return (ph === null ? '' : '<option value="">' + esc(ph) + '</option>') +
    lista.map(v => '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(v) + '</option>').join('');
}

function vivo() {
  const t = S.nav;
  return () => t === S.nav;
}

function puede(mod) {
  return !!S.ses && (S.ses.rol === 'admin' || (PERMISOS[mod] || []).indexOf(S.ses.rol) >= 0);
}

function cargando(on) {
  S.cargas = Math.max(0, S.cargas + (on ? 1 : -1));
  $('#toploader').classList.toggle('on', S.cargas > 0);
}

function bloquear(txt) {
  let o = $('#bloqueo');
  if (!o) {
    o = document.createElement('div');
    o.id = 'bloqueo';
    o.className = 'modal-bg';
    o.innerHTML = '<div class="col" style="align-items:center;gap:10px">' + ($('#tplCamion') ? $('#tplCamion').innerHTML : '<div class="spin lg"></div>') + '<b id="bloqueoTxt" style="color:#fff"></b></div>';
    document.body.appendChild(o);
  }
  $('#bloqueoTxt').textContent = txt || 'Procesando…';
  o.classList.remove('hide');
}

function desbloquear() {
  const o = $('#bloqueo');
  if (o) o.classList.add('hide');
}

function toast(msg, tipo = 'info', ms = 4500) {
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;
  const ic = { ok: ICON.ok, bad: ICON.x, warn: ICON.alerta, info: ICON.infoI }[tipo] || ICON.infoI;
  t.innerHTML = '<span class="ic">' + ic + '</span><span></span>';
  t.lastChild.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('sale'); setTimeout(() => t.remove(), 320); }, ms);
}

function modal(titulo, html, acciones, clase) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = '<div class="modal ' + (clase || '') + '"><h3></h3><div class="mb">' + html + '</div><div class="acts"></div></div>';
  $('h3', bg).textContent = titulo;
  const cerrar = () => { bg.style.animation = 'fade .18s reverse forwards'; setTimeout(() => bg.remove(), 170); document.removeEventListener('keydown', tecla); };
  const tecla = e => { if (e.key === 'Escape') cerrar(); };
  document.addEventListener('keydown', tecla);
  const acts = $('.acts', bg);
  (acciones || [{ txt: 'Cerrar' }]).forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.cls || '');
    b.textContent = a.txt;
    b.onclick = async () => {
      if (!a.fn) return cerrar();
      b.disabled = true;
      const r = await a.fn(bg);
      b.disabled = false;
      if (r !== false) cerrar();
    };
    acts.appendChild(b);
  });
  bg.addEventListener('mousedown', e => { if (e.target === bg) cerrar(); });
  document.body.appendChild(bg);
  const primero = $('input:not([type=checkbox]), select', bg);
  if (primero) setTimeout(() => primero.focus(), 60);
  bg.cerrar = cerrar;
  return bg;
}

function confirmar(titulo, texto, ok = 'Confirmar', peligro) {
  return new Promise(res => {
    const m = modal(titulo, '<div class="sub" style="font-size:.92rem">' + texto + '</div>', [
      { txt: 'Cancelar', fn: () => { res(false); } },
      { txt: ok, cls: peligro ? 'dan' : 'pri', fn: () => { res(true); } }
    ]);
    m.addEventListener('mousedown', e => { if (e.target === m) res(false); });
  });
}

function ayuda(txt) {
  return '<span class="ayuda" data-tip="' + esc(txt) + '" tabindex="0">?</span>';
}

function iniciarTips() {
  const tip = document.createElement('div');
  tip.id = 'tip';
  document.body.appendChild(tip);
  let actual = null;
  const mostrar = el => {
    actual = el;
    tip.textContent = el.dataset.tip;
    tip.classList.add('on');
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    x = Math.max(10, Math.min(x, innerWidth - w - 10));
    let y = r.top - h - 8;
    if (y < 8) y = r.bottom + 8;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  };
  const ocultar = () => { actual = null; tip.classList.remove('on'); };
  document.addEventListener('mouseover', e => { const el = e.target.closest('[data-tip]'); if (el && el !== actual) mostrar(el); else if (!el && actual) ocultar(); });
  document.addEventListener('focusin', e => { const el = e.target.closest('[data-tip]'); if (el) mostrar(el); });
  document.addEventListener('focusout', ocultar);
  document.addEventListener('click', e => { const el = e.target.closest('.ayuda'); if (el) { e.preventDefault(); mostrar(el); } });
  addEventListener('scroll', ocultar, { passive: true });
}

function contar(raiz) {
  $$('[data-count]', raiz || document).forEach(el => {
    const fin = Number(el.dataset.count);
    const dec = Number(el.dataset.dec || 0);
    if (!isFinite(fin) || reducido()) { el.textContent = nf(fin, dec); return; }
    const t0 = performance.now();
    const durac = 520;
    const paso = t => {
      const k = Math.min(1, (t - t0) / durac);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = nf(fin * e, dec);
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });
}

function vn(n, dec = 0) {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return '–';
  return '<span data-count="' + n + '" data-dec="' + dec + '">' + nf(0, dec) + '</span>';
}

function stagger(raiz) {
  $$('.stagger', raiz).forEach(g => Array.from(g.children).forEach((c, i) => c.style.setProperty('--i', i)));
}

function segmento(cont, botones, activo, alCambiar, chico) {
  cont.innerHTML = '<div class="seg ' + (chico ? 'sm' : '') + '"><span class="pill"></span>' + botones.map(b => '<button type="button" data-k="' + b[0] + '" class="' + (b[0] === activo ? 'on' : '') + '">' + (b[2] || '') + esc(b[1]) + '</button>').join('') + '</div>';
  const seg = $('.seg', cont);
  const mover = () => {
    const on = $('button.on', seg);
    const pill = $('.pill', seg);
    if (!on) { pill.style.width = '0'; return; }
    pill.style.left = on.offsetLeft + 'px';
    pill.style.width = on.offsetWidth + 'px';
  };
  requestAnimationFrame(mover);
  seg.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
    mover();
    alCambiar(b.dataset.k);
  });
  return { mover: mover };
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

function vacio(txt) {
  return '<div class="empty">' + ICON.vacio + '<span>' + (txt || 'Sin registros en el período.') + '</span></div>';
}

function tabla(cols, filas, op = {}) {
  if (!filas.length) return vacio(op.vacio);
  const th = cols.map(c => '<th class="' + (c[2] === 'n' ? 'n' : '') + '">' + esc(c[1]) + '</th>').join('');
  const tb = filas.map((f, i) => '<tr' + (op.fila ? ' class="click" data-fila="' + i + '"' : '') + '>' + cols.map(c => {
    const v = typeof c[0] === 'function' ? c[0](f) : esc(f[c[0]]);
    return '<td class="' + (c[2] || '') + '">' + (v === undefined || v === null ? '' : v) + '</td>';
  }).join('') + '</tr>').join('');
  return '<div class="tw ' + (op.max ? 'max' : '') + '"' + (op.id ? ' id="' + op.id + '"' : '') + '><table><thead><tr>' + th + '</tr></thead><tbody>' + tb + '</tbody></table></div>';
}

function kpi(l, v, d, cls, tip) {
  return '<div class="kpi ' + (cls || '') + '"><div class="l">' + esc(l) + (tip ? ayuda(tip) : '') + '</div><div class="v">' + v + '</div>' + (d ? '<div class="d">' + d + '</div>' : '') + '</div>';
}

function caja(id, titulo, sub, tam, extra) {
  return '<div class="card"><div class="card-h"><div class="t"><h3>' + esc(titulo) + '</h3>' + (sub ? '<div class="sub">' + sub + '</div>' : '') +
    '</div>' + (extra || '') + '</div><div class="chart ' + (tam || '') + '"><canvas id="' + id + '" role="img" aria-label="' + esc(titulo) + '"></canvas></div></div>';
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

function color(n) {
  return cssVar('--s' + n);
}

function grafico(id, tipo, labels, datasets, extra, alClick) {
  const el = document.getElementById(id);
  if (!el || typeof Chart === 'undefined') return null;
  if (S.charts[id]) S.charts[id].destroy();
  const tx = cssVar('--muted');
  const gr = cssVar('--line');
  const sup = cssVar('--chart-surface');
  datasets.forEach(d => {
    const t = d.type || tipo;
    if (t === 'bar') {
      d.borderRadius = d.borderRadius === undefined ? 4 : d.borderRadius;
      d.borderSkipped = 'start';
      d.borderColor = sup;
      d.borderWidth = d.borderWidth === undefined ? { top: 0, right: 1, bottom: 0, left: 1 } : d.borderWidth;
      d.maxBarThickness = d.maxBarThickness || 38;
    }
    if (t === 'line') {
      d.borderWidth = d.borderWidth || 2;
      d.pointRadius = d.pointRadius === undefined ? 0 : d.pointRadius;
      d.pointHoverRadius = 5;
      d.pointHoverBorderColor = sup;
      d.pointHoverBorderWidth = 2;
      d.tension = d.tension === undefined ? 0.3 : d.tension;
    }
  });
  const base = {
    responsive: true,
    maintainAspectRatio: false,
    animation: reducido() ? false : { duration: 450, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    onHover: (e, els) => { e.native.target.style.cursor = (alClick && els.length) ? 'pointer' : 'default'; },
    onClick: (e, els) => { if (alClick && els.length) alClick(els[0].index); },
    plugins: {
      legend: { display: datasets.length > 1 || tipo === 'doughnut', position: 'top', align: 'start', labels: { color: tx, boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', font: { family: cssVar('--font'), weight: '600' } } },
      tooltip: {
        backgroundColor: cssVar('--text'), titleColor: cssVar('--bg'), bodyColor: cssVar('--bg'), padding: 10, cornerRadius: 10, boxPadding: 4,
        titleFont: { family: cssVar('--font'), weight: '800' }, bodyFont: { family: cssVar('--font'), weight: '600' },
        callbacks: { label: c => ' ' + (c.dataset.label ? c.dataset.label + ': ' : '') + nf(typeof c.parsed === 'object' ? (c.chart.options.indexAxis === 'y' ? c.parsed.x : c.parsed.y) : c.parsed, 1) }
      }
    },
    scales: tipo === 'doughnut' ? {} : {
      x: { ticks: { color: tx, maxRotation: 0, autoSkip: true, font: { family: cssVar('--font'), weight: '600' } }, grid: { display: false }, border: { color: gr } },
      y: { ticks: { color: tx, font: { family: cssVar('--font') }, callback: v => tick(v) }, grid: { color: gr }, border: { display: false }, beginAtZero: true }
    }
  };
  if (tipo === 'doughnut') {
    base.interaction = { mode: 'nearest', intersect: true };
    base.cutout = '68%';
    base.plugins.tooltip.callbacks.label = c => ' ' + c.label + ': ' + nf(c.parsed, 1);
  }
  const op = mezclar(base, extra || {});
  if (op.indexAxis === 'y' && op.scales && op.scales.y) {
    op.scales.y.ticks = Object.assign({}, op.scales.y.ticks, { callback: function (v) { return this.getLabelForValue(v); } });
    op.scales.x.ticks = Object.assign({}, op.scales.x.ticks, { callback: v => tick(v) });
  }
  S.charts[id] = new Chart(el, { type: tipo, data: { labels: labels, datasets: datasets }, options: op });
  return S.charts[id];
}

async function api(accion, datos) {
  const url = window.CONFIG && window.CONFIG.API_URL;
  if (!url || url.indexOf('REEMPLAZAR') >= 0) throw Object.assign(new Error('Configure API_URL en config.js'), { servidor: true });
  cargando(true);
  try {
    const r = await fetch(url, { method: 'POST', body: JSON.stringify({ accion: accion, datos: datos || {}, token: S.ses ? S.ses.token : null }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!j.ok) {
      if (/Sesión (vencida|requerida)/.test(j.error)) setSesion(null);
      throw Object.assign(new Error(j.error), { servidor: true });
    }
    return j.data;
  } finally {
    cargando(false);
  }
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
  toast('Sin conexión: «' + desc + '» quedó guardado en el equipo y se enviará al reconectar.', 'warn', 6000);
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
      if (!e.servidor || /Sesión/.test(e.message)) break;
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
  const html = S.cola.length ? S.cola.map(c => '<div class="alert ' + (c.error ? 'bad' : 'warn') + '"><div style="flex:1"><b>' + esc(c.desc) + '</b><br><small>' +
    new Date(c.ts).toLocaleString('es-AR') + (c.error ? ' · ' + esc(c.error) : '') + '</small><div class="row mt"><button class="btn sm" data-reint="' + c.id +
    '">Reintentar</button><button class="btn sm dan" data-desc="' + c.id + '">Descartar</button></div></div></div>').join('') : '<p>Sin pendientes.</p>';
  const m = modal('Pendientes de sincronizar', html);
  m.addEventListener('click', async e => {
    const r = e.target.dataset.reint;
    const d = e.target.dataset.desc;
    if (r) {
      const it = S.cola.find(x => x.id === r);
      if (it) it.error = '';
      m.cerrar();
      await procesarCola();
    }
    if (d && await confirmar('Descartar', 'El registro pendiente se perderá. ¿Continuar?', 'Descartar', true)) {
      S.cola = S.cola.filter(x => x.id !== d);
      lsSet('tierra_cola', S.cola);
      pintarCola();
      m.cerrar();
    }
  });
}

async function traerResumen() {
  try {
    const r = await api('resumen');
    S.resumen = r;
    S.resumenVencido = false;
    lsSet('tierra_resumen', r);
    return r;
  } catch (e) {
    const c = S.resumen || lsGet('tierra_resumen', null);
    if (!c || /API_URL/.test(e.message)) throw e;
    S.resumen = c;
    const motivo = e.servidor ? 'El servidor respondió: ' + e.message : 'Sin conexión con el servidor (' + e.message + ')';
    toast(motivo + '. Se muestran los últimos datos guardados (' + new Date(c.generado).toLocaleString('es-AR') + ').', 'warn', 9000);
    return c;
  }
}

async function cargarResumen(forzar) {
  if (S.resumen && !forzar && !S.resumenVencido) return S.resumen;
  if (!S.resumen && !forzar) {
    const c = lsGet('tierra_resumen', null);
    if (c && c.generado) {
      S.resumen = c;
      S.resumenVencido = false;
      const ruta = location.hash;
      traerResumen().then(r => {
        if (r !== c && r.generado !== c.generado && location.hash === ruta && /^#\/(inicio|calendario|tablero)|^#?$/.test(ruta) && !document.querySelector('.modal-bg')) {
          document.body.classList.add('quieto');
          render().then(() => setTimeout(() => document.body.classList.remove('quieto'), 80));
        }
      }).catch(e => console.warn(e));
      return c;
    }
  }
  return traerResumen();
}

async function cargarRango(desde, hasta) {
  const d = desde || S.desde;
  const h = hasta || S.hasta;
  const k = d + '|' + h;
  if (S.rango && S.rangoK === k) return S.rango;
  const r = await api('rango', { desde: d, hasta: h });
  S.rango = r;
  S.rangoK = k;
  return r;
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

function par(k, d) {
  const v = S.resumen && S.resumen.parametros ? S.resumen.parametros[k] : undefined;
  return v === undefined || v === '' ? d : v;
}

function destinosPlanta() {
  return String(par('DESTINOS_PLANTA', '')).split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
}

function tarifas() {
  const out = {};
  String(par('TARIFAS_VIAJE', '')).split(';').forEach(p => {
    const m = p.split('=');
    if (m.length === 2 && num(m[1]) !== null) out[m[0].trim().toUpperCase()] = num(m[1]);
  });
  return out;
}

function calcBalance(desde, hasta) {
  const D = S.resumen.diario || [];
  const fTeo = (num(par('M3_POR_PALADA', 3)) || 3) * (num(par('DENSIDAD_APARENTE', 1.6)) || 1.6);
  const tH = sum(D, d => d.molT);
  const pH = sum(D, d => d.molPalConT);
  const fMolHist = pH > 0 ? tH / pH : fTeo;
  const R = D.filter(d => d.fecha >= desde && d.fecha <= hasta);
  const tR = sum(R, d => d.molT);
  const pR = sum(R, d => d.molPalConT);
  const fMol = pR > 0 ? tR / pR : fMolHist;
  const fSilo = num(par('F_SILO', '')) || fMolHist;
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
      fecha: f, ingreso: d.ingresoT || 0, tickets: d.tickets || 0, consumo: consumo, siloOut: siloOut, stockPlaya: sP, stockSilo: sS,
      tCamion: d.tickets ? d.ingresoT / d.tickets : null, fMol: d.molPalConT > 0 ? d.molT / d.molPalConT : null,
      estimado: (d.molPal || 0) > (d.molPalConT || 0)
    });
  });
  const enR = serie.filter(s => s.fecha >= desde && s.fecha <= hasta);
  const previos = serie.filter(s => s.fecha <= hasta);
  const ult = previos.length ? previos[previos.length - 1] : null;
  const maxP = Math.max.apply(null, serie.map(s => s.stockPlaya).concat([1]));
  const maxS = Math.max.apply(null, serie.map(s => s.stockSilo).concat([1]));
  return {
    fTeo: fTeo, fMol: fMol, fMolHist: fMolHist, fSilo: fSilo, serie: enR,
    stockPlaya: ult ? ult.stockPlaya : 0, stockSilo: ult ? ult.stockSilo : 0, maxPlaya: maxP, maxSilo: maxS,
    ingreso: sum(R, d => d.ingresoT), tickets: sum(R, d => d.tickets), consumo: sum(enR, s => s.consumo),
    siloOut: sum(enR, s => s.siloOut), molPal: sum(R, d => d.molPal), siloPal: sum(R, d => d.siloPal),
    viajes: sum(R, d => d.viajes), unid: sum(R, d => d.unid), internos: sum(R, d => d.internos),
    hayAjuste: (S.resumen.ajustes || []).length > 0, calibrado: pH > 0, estimados: enR.filter(s => s.estimado).length
  };
}

function conciliar(datos) {
  const dest = destinosPlanta();
  const viajesTot = datos.viajes || [];
  const viajes = viajesTot.filter(v => !dest.length || dest.indexOf(String(v.destino).trim().toUpperCase()) >= 0);
  const pes = (datos.pesajes || []).filter(p => p.tierra !== false);
  const vent = num(par('VENTANA_MATCH_MIN', 120)) || 120;
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
  const porD = agrupar(pes, p => normDom(p.dominio));
  Object.keys(porD).forEach(d => {
    const a = porD[d].map(p => p.neto).filter(x => x !== null).sort((x, y) => x - y);
    if (a.length < 5) return;
    const q1 = quant(a, 0.25);
    const q3 = quant(a, 0.75);
    lim[d] = [q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1), quant(a, 0.5)];
  });
  const atipicos = pes.filter(p => { const l = lim[normDom(p.dominio)]; return l && (p.neto < l[0] || p.neto > l[1]); })
    .map(p => Object.assign({}, p, { mediana: lim[normDom(p.dominio)][2] }));
  const dias = {};
  const di = f => dias[f] || (dias[f] = { fecha: f, unid: 0, internos: 0, palCam: 0, viajesTot: 0, viajes: 0, tickets: 0, neto: 0, pares: 0 });
  (datos.tramos || []).forEach(t => {
    if (t.tipo !== 'Producción') return;
    const x = di(t.fecha);
    x.unid += t.unidadesCargadas || 0;
    x.internos += t.viajesInternos || 0;
    x.palCam += t.paladasCamiones || 0;
  });
  viajesTot.forEach(v => { di(v.fecha).viajesTot++; });
  viajes.forEach(v => { di(v.fecha).viajes++; });
  pes.forEach(p => { const x = di(p.fecha); x.tickets++; x.neto += p.neto || 0; });
  pares.forEach(pr => { di(pr.v.fecha).pares++; });
  const ciclos = viajes.filter(v => v.horaCarga && v.horaDescarga).map(v => ({ v: v, min: dur(v.horaCarga, v.horaDescarga) * 60 }));
  return {
    viajesTot: viajesTot, viajes: viajes, pes: pes, pares: pares, ciclos: ciclos,
    sinTicket: viajes.filter((_, i) => !uV.has(i)), sinViaje: pes.filter((_, i) => !uP.has(i)),
    atipicos: atipicos, diario: Object.keys(dias).sort().map(k => dias[k])
  };
}

function statsCantera(R) {
  const maqTipo = {};
  ((S.resumen.catalogos || {}).Maquinas || []).forEach(m => { maqTipo[m.nombre] = String(m.tipo || '').toLowerCase(); });
  const M = {};
  const O = {};
  const causas = {};
  const m = n => M[n] || (M[n] = { n: n, tipo: maqTipo[n] || '', hHor: 0, hProd: 0, hPar: 0, pal: 0, palCam: 0, palAco: 0, unid: 0, internos: 0, litros: 0 });
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
      x.internos += t.viajesInternos || 0;
      if (t.operador) {
        const o = O[t.operador] || (O[t.operador] = { n: t.operador, hHor: 0, pal: 0, cam: 0, dias: new Set(), maqs: new Set() });
        o.hHor += hv;
        o.pal += (t.paladasCamiones || 0) + (t.paladasAcopios || 0);
        o.cam += (t.unidadesCargadas || 0) + (t.viajesInternos || 0);
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
    x.camH = x.hHor > 0 ? (x.unid + x.internos) / x.hHor : null;
    x.lH = x.hHor > 0 ? x.litros / x.hHor : null;
    x.utiliz = x.hProd > 0 ? x.hHor / x.hProd * 100 : null;
  });
  const ops = Object.keys(O).map(k => {
    const o = O[k];
    return { n: o.n, hHor: o.hHor, pal: o.pal, cam: o.cam, dias: o.dias.size, palH: o.hHor > 0 ? o.pal / o.hHor : null, camDia: o.dias.size ? o.cam / o.dias.size : null, maqs: Array.from(o.maqs).join(', ') };
  }).sort((a, b) => b.pal - a.pal);
  return { maqs: Object.keys(M).map(k => M[k]).sort((a, b) => b.pal - a.pal || b.hHor - a.hHor), ops: ops, causas: causas };
}

function semaforoDias(f) {
  if (!f) return { cls: 'bad', txt: 'sin datos', dias: null };
  const d = difDias(f, hoy());
  if (d <= 1) return { cls: 'ok', txt: d <= 0 ? 'al día' : 'ayer', dias: d };
  if (d <= 4) return { cls: 'warn', txt: d + ' días de atraso', dias: d };
  return { cls: 'bad', txt: d + ' días de atraso', dias: d };
}
