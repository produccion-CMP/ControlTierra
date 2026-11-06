'use strict';

const BALANZA_MESES = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };
const BALANZA_COLUMNAS = ['patente', 'patentea', 'cod_pro', 'cod_clie', 'cod_tra', 'cod_mat', 'pesoent', 'pesosal', 'ticket', 'fecha_e', 'hora_e', 'fecha_s', 'hora_s', 'balan_e', 'balan_s', 'remito', 'observ', 'observ2', 'tic_sal', 'activo', 'popcion', 'pusuario'];

function esFormatoBalanza(encabezados) {
  const h = encabezados.map(x => String(x || '').trim().toLowerCase());
  return ['patente', 'pesoent', 'pesosal', 'ticket', 'fecha_e', 'hora_e'].every(k => h.indexOf(k) >= 0);
}

function fechaBalanza(v) {
  if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
  const s = String(v || '').trim();
  let m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[a-z]*[-/ ](\d{2,4})$/);
  if (m && BALANZA_MESES[m[2].toLowerCase()]) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3];
    return y + '-' + String(BALANZA_MESES[m[2].toLowerCase()]).padStart(2, '0') + '-' + m[1].padStart(2, '0');
  }
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : '';
}

function horaBalanza(v) {
  if (v instanceof Date && !isNaN(v)) return String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0');
  const m = String(v || '').match(/(\d{1,2}):(\d{2})/);
  return m ? m[1].padStart(2, '0') + ':' + m[2] : '';
}

function domBalanza(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function distBalanza(a, b) {
  if (!a || !b) return 99;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i].concat(Array(b.length).fill(0)));
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function crudoBalanza(r) {
  const o = {};
  BALANZA_COLUMNAS.forEach(k => { const v = r[k]; o[k] = v === undefined || v === null ? '' : v instanceof Date ? fechaBalanza(v) : String(v).trim(); });
  return o;
}

function minBalanza(f, h) {
  const p = String(f).split('-').map(Number);
  const m = String(h || '').match(/(\d{1,2}):(\d{2})/);
  return Date.UTC(p[0], p[1] - 1, p[2]) / 60000 + (m ? Number(m[1]) * 60 + Number(m[2]) : 0);
}

function clasificarBalanza(filas, ctx) {
  const c = ctx || {};
  const cods = String(c.codTierra || '002').split(',').map(x => x.trim()).filter(Boolean);
  const flota = new Set((c.flota || []).map(domBalanza));
  const traDom = c.traDom || {};
  const netos = c.netos || {};
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const vacio = v => { const s = String(v === undefined || v === null ? '' : v).trim(); return !s || /^0+$/.test(s); };
  const esCodTierra = mat => cods.indexOf(mat) >= 0 || cods.indexOf(String(Number(mat))) >= 0;
  const flotaDe = d => {
    if (flota.has(d)) return { dom: d, corr: '' };
    return null;
  };
  const corregir = (d, tra) => {
    const t = traDom[String(tra || '').trim()];
    if (t) {
      const tot = Object.keys(t).reduce((s, k) => s + t[k], 0);
      const top = Object.keys(t).sort((a, b) => t[b] - t[a])[0];
      if (top && t[top] / tot >= 0.6 && distBalanza(d, top) <= 2) return { dom: top, corr: 'patente corregida: el transportista ' + tra + ' trae siempre ' + top };
    }
    const cerca = Array.from(flota).filter(f => distBalanza(d, f) === 1);
    if (cerca.length === 1) return { dom: cerca[0], corr: 'patente corregida: ' + d + ' difiere en un carácter de ' + cerca[0] + ' de la flota' };
    return null;
  };
  const filasN = filas.map(crudoBalanza);
  const cerrados = new Set(filasN.filter(r => r.popcion !== '1').map(r => r.ticket));
  let ultimo = 0;
  filasN.forEach(r => { const f = fechaBalanza(r.fecha_e); if (f) ultimo = Math.max(ultimo, minBalanza(f, r.hora_e)); });
  const umbral = Number(c.maxMinSalida) || 120;
  const res = { tierra: [], dudosos: [], abiertas: [], manuales: [], sinSalida: [], otros: 0, anuladas: 0, correcciones: 0, leidas: filasN.length, ultimo: ultimo, umbral: umbral };
  filasN.forEach(r => {
    const mat = r.cod_mat;
    const ent = num(r.pesoent);
    const sal = num(r.pesosal);
    const d0 = domBalanza(r.patente);
    const fecha = fechaBalanza(r.fecha_e);
    const hora = horaBalanza(r.hora_e);
    const cli = !vacio(r.cod_clie);
    const pro = !vacio(r.cod_pro);
    const manual = /[^A-Za-z0-9\s]/.test(String(r.patente || '').trim());
    const observ = [r.observ, r.observ2].filter(Boolean).join(' ').trim();
    if (r.popcion === '1') {
      if ((num(r.tic_sal) && cerrados.has(r.tic_sal)) || String(r.activo).toLowerCase() === 'false') return;
      if (!(esCodTierra(mat) && !cli)) return;
      const min = fecha ? ultimo - minBalanza(fecha, hora) : null;
      const reingreso = filasN.some(x => x !== r && domBalanza(x.patente) === d0 && fechaBalanza(x.fecha_e) && minBalanza(fechaBalanza(x.fecha_e), x.hora_e) > minBalanza(fecha, hora));
      res.abiertas.push({ ticket: r.ticket, fecha: fecha, hora: hora, dominio: d0, pesoEntrada: ent / 1000, material: mat, transportista: r.cod_tra, balancero: r.balan_e, observ: observ, manual: manual, minutos: min,
        estado: reingreso ? 'Volvió a entrar sin pesar la salida' : 'Todavía sin cierre: se cerrará con la tara del sistema' });
      return;
    }
    if (!ent || !sal) { res.anuladas++; return; }
    const ingreso = ent > sal;
    const bruto = Math.max(ent, sal) / 1000;
    const tara = Math.min(ent, sal) / 1000;
    const neto = Math.round((bruto - tara) * 1000) / 1000;
    let fl = flotaDe(d0);
    let corr = '';
    if (!fl && (esCodTierra(mat) || pro)) { const x = corregir(d0, r.cod_tra); if (x) { fl = x; corr = x.corr; } }
    const dom = fl ? fl.dom : d0;
    const tip = netos[dom];
    const netoNormal = tip ? Math.abs(neto - tip) / tip <= 0.35 : null;
    const fechaS = fechaBalanza(r.fecha_s);
    const horaS = horaBalanza(r.hora_s);
    const durS = fechaS && horaS ? minBalanza(fechaS, horaS) - minBalanza(fecha, hora) : null;
    const sinSalida = r.popcion === '4' || durS === null || fechaS !== fecha || durS > umbral || durS < 0;
    const reg = {
      manual: manual, sinSalida: sinSalida, salida: fechaS && horaS ? (fechaS !== fecha ? fechaS.slice(8, 10) + '/' + fechaS.slice(5, 7) + ' ' : '') + horaS : '', minutos: durS, observ: observ, balancero: r.balan_s || r.balan_e,
      ticket: r.ticket, fecha: fecha, hora: hora, dominio: dom, dominioArchivo: d0 !== dom ? d0 : '', bruto: Math.round(bruto * 1000) / 1000, tara: Math.round(tara * 1000) / 1000, neto: neto,
      producto: 'TIERRA', origen: r.cod_tra ? 'TRANSP. ' + r.cod_tra : '', chofer: '', material: mat, cliente: r.cod_clie, proveedor: r.cod_pro, opcion: r.popcion, sentido: ingreso ? 'Ingreso cargado' : 'Egreso cargado'
    };
    const motivos = [];
    if (esCodTierra(mat)) {
      if (!ingreso) motivos.push('el camión salió más pesado de lo que entró (como un despacho de ladrillos)');
      if (cli) motivos.push('tiene código de cliente ' + r.cod_clie);
      if (motivos.length) { res.dudosos.push(Object.assign(reg, { tipo: 'tierraDudosa', motivo: 'Cargado como tierra, pero ' + motivos.join(' y '), incluir: false })); return; }
      if (corr) { reg.nota = corr; res.correcciones++; }
      if (!fl) reg.nota = 'camión fuera de la flota (tercero)';
      if (manual) reg.nota = [reg.nota, 'carga manual de patente'].filter(Boolean).join(' · ');
      if (sinSalida) reg.nota = [reg.nota, 'sin pesaje de salida: cerrado con la tara del sistema'].filter(Boolean).join(' · ');
      res.tierra.push(reg);
      if (manual) res.manuales.push(reg);
      if (sinSalida) res.sinSalida.push(reg);
      return;
    }
    if (ingreso && !cli && (fl || pro)) {
      const fuerte = !!fl && netoNormal !== false;
      res.dudosos.push(Object.assign(reg, { tipo: 'otroMaterial', motivo: 'Cargado con material ' + mat + ', pero entró cargado y salió vacío, sin cliente' + (fl ? ', y el camión es de la flota de tierra' : '') + (netoNormal ? ' con un neto habitual de tierra' : ''), nota: corr, incluir: fuerte }));
      return;
    }
    res.otros++;
  });
  return res;
}

function convertirBalanza(filas, codTierra, ctx) {
  const r = clasificarBalanza(filas, Object.assign({}, ctx || {}, { codTierra: codTierra }));
  return { filas: r.tierra, resumen: { leidas: r.leidas, tierra: r.tierra.length, abiertas: r.abiertas.length, otros: r.otros, dudosos: r.dudosos.length }, detalle: r };
}

if (typeof module !== 'undefined') module.exports = { esFormatoBalanza: esFormatoBalanza, convertirBalanza: convertirBalanza, clasificarBalanza: clasificarBalanza, fechaBalanza: fechaBalanza, crudoBalanza: crudoBalanza, BALANZA_COLUMNAS: BALANZA_COLUMNAS };
