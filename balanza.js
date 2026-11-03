'use strict';

const BALANZA_MESES = { ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12 };

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

function convertirBalanza(filas, codTierra) {
  const cods = String(codTierra || '002').split(',').map(x => x.trim()).filter(Boolean);
  const num = v => { const n = Number(String(v === undefined || v === null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const out = [];
  const resumen = { leidas: filas.length, tierra: 0, abiertas: 0, otros: 0 };
  filas.forEach(r => {
    const mat = String(r.cod_mat === undefined ? '' : r.cod_mat).trim();
    const esTierra = !cods.length || cods.indexOf(mat) >= 0 || cods.indexOf(String(Number(mat))) >= 0;
    if (!esTierra) { resumen.otros++; return; }
    const ent = num(r.pesoent);
    const sal = num(r.pesosal);
    if (String(r.popcion).trim() !== '2' || !ent || !sal) { resumen.abiertas++; return; }
    const bruto = Math.max(ent, sal) / 1000;
    const tara = Math.min(ent, sal) / 1000;
    resumen.tierra++;
    out.push({
      ticket: String(r.ticket || '').trim(),
      fecha: fechaBalanza(r.fecha_e),
      hora: horaBalanza(r.hora_e),
      dominio: String(r.patente || '').replace(/\+/g, '').trim(),
      bruto: Math.round(bruto * 1000) / 1000,
      tara: Math.round(tara * 1000) / 1000,
      neto: Math.round((bruto - tara) * 1000) / 1000,
      producto: 'TIERRA',
      origen: r.cod_tra ? 'TRANSP. ' + String(r.cod_tra).trim() : '',
      chofer: ''
    });
  });
  return { filas: out, resumen: resumen };
}

if (typeof module !== 'undefined') module.exports = { esFormatoBalanza: esFormatoBalanza, convertirBalanza: convertirBalanza, fechaBalanza: fechaBalanza };
