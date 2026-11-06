'use strict';

const SECTORES = {
  abastecimiento: { t: 'Abastecimiento', d: 'Cantera, gasoil, viajes y balanza de ingreso', rol: 'Responsable de abastecimiento', ic: 'camion', mods: ['jornada', 'gasoil', 'viajes', 'pesaje', 'calidad'] },
  molienda: { t: 'Molienda', d: 'Playa, molienda y silo', rol: 'Responsable de molienda', ic: 'molienda', mods: ['molienda', 'ajustes'] }
};

const SEV_ORDEN = { bad: 0, warn: 1, info: 2, ok: 3 };
const pl = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);

function medianaDe(arr) {
  const a = arr.filter(x => x !== null && x !== undefined && isFinite(x)).sort((x, y) => x - y);
  return a.length ? quant(a, 0.5) : null;
}

function rendimientoGasoil(cargas) {
  const out = [];
  const porMaq = agrupar(cargas.filter(c => c.horometro), c => c.maquina);
  Object.keys(porMaq).forEach(mq => {
    const lista = porMaq[mq].slice().sort((a, b) => (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1);
    for (let i = 1; i < lista.length; i++) {
      const h = lista[i].horometro - lista[i - 1].horometro;
      out.push({ maquina: mq, fecha: lista[i].fecha, hora: lista[i].hora, litros: lista[i].litros, horas: h, lh: h > 0 ? lista[i].litros / h : null, previa: lista[i - 1].fecha });
    }
  });
  const med = {};
  Object.keys(porMaq).forEach(mq => { med[mq] = medianaDe(out.filter(x => x.maquina === mq && x.lh !== null && x.horas >= 2).map(x => x.lh)); });
  out.forEach(x => { x.mediana = med[x.maquina]; });
  return out;
}

function tPaladaCantera(k) {
  const rx = new RegExp(String(par('ORIGEN_CANTERA', 'CANTERA')), 'i');
  let ton = 0;
  let tk = 0;
  let pal = 0;
  let cam = 0;
  k.diario.filter(d => (d.unid + d.internos) > 0 && d.tickets > 0 && d.palCam > 0).forEach(d => {
    const otros = k.pares.filter(x => x.v.fecha === d.fecha && !rx.test(x.v.origen));
    ton += d.neto - sum(otros, x => x.p.neto);
    tk += d.tickets - otros.length;
    pal += d.palCam;
    cam += d.unid + d.internos;
  });
  const ppc = cam ? pal / cam : null;
  return { tp: tk && ppc ? ton / tk / ppc : null, ppc: ppc, tCamion: tk ? ton / tk : null, tickets: tk };
}

function controles(r, b) {
  const R = S.resumen;
  const k = conciliar(r);
  const ult = R.ultimo || {};
  const res = [];
  const add = (id, sector, ic, nombre, que, fn) => {
    let o;
    try {
      o = fn() || { sev: 'ok' };
    } catch (e) {
      console.warn(id, e);
      o = { sev: 'info', t: nombre + ': no se pudo calcular', d: esc(e.message) };
    }
    res.push(Object.assign({ id: id, sector: sector, ic: ic, nombre: nombre, que: que, t: nombre, d: '', ruta: '#/revision/controles', filas: [], cols: null }, o));
  };
  const atraso = (fuente, nombre, ruta) => () => {
    const sm = semaforoDias(ult[fuente]);
    if (sm.dias === null) return { sev: 'warn', t: nombre + ': sin datos', d: 'Todavía no hay registros cargados.', ruta: ruta };
    if (sm.dias > 2) return { sev: sm.dias > 4 ? 'bad' : 'warn', t: nombre + ' hasta el ' + fMedia(ult[fuente]), d: sm.dias + ' días sin cargar.', ruta: ruta };
    return { sev: 'ok', t: nombre + ' al día', d: 'Último dato: ' + fMedia(ult[fuente]) + '.' };
  };
  const A = 'abastecimiento';
  const Mo = 'molienda';
  const tolTara = (num(par('TOLERANCIA_TARA', 5)) || 5) / 100;
  const tolHor = num(par('TOLERANCIA_HOROMETRO_GASOIL', 3)) || 3;
  const tolInv = (num(par('TOLERANCIA_INVENTARIO', 10)) || 10) / 100;
  const diasCub = num(par('DIAS_CUBICACION', 30)) || 30;
  const cols = {
    viaje: [[x => fCorta(x.fecha), 'Fecha'], ['comprobante', 'Comp.'], ['horaCarga', 'Carga'], ['horaDescarga', 'Desc.'], ['chofer', 'Chofer'], ['dominio', 'Dominio']],
    ticket: [[x => fCorta(x.fecha), 'Fecha'], ['hora', 'Hora'], ['ticket', 'Ticket'], ['dominio', 'Dominio'], [x => nf(x.neto, 2), 'Neto t', 'n']]
  };

  add('a_atraso', A, 'reloj', 'Carga al día', 'Que viajes, jornada, balanza y gasoil estén cargados hasta ayer.', () => {
    const f = [['viajes', 'Viajes', '#/cargar/viajes'], ['jornada', 'Jornada de cantera', '#/cargar/jornada'], ['pesajes', 'Balanza de ingreso', '#/cargar/pesaje'], ['gasoil', 'Gasoil', '#/cargar/gasoil']]
      .map(x => Object.assign({ n: x[1], ruta: x[2] }, semaforoDias(ult[x[0]]), { f: ult[x[0]] }));
    const mal = f.filter(x => x.dias === null || x.dias > 2);
    if (!mal.length) return { sev: 'ok', t: 'Carga de abastecimiento al día', d: 'Viajes, jornada, balanza y gasoil con datos recientes.' };
    const peor = mal.sort((a, b) => (b.dias === null ? 999 : b.dias) - (a.dias === null ? 999 : a.dias))[0];
    return {
      sev: mal.some(x => x.dias === null || x.dias > 4) ? 'bad' : 'warn', t: mal.length + (mal.length > 1 ? ' fuentes atrasadas' : ' fuente atrasada') + ': ' + mal.map(x => x.n).join(', '),
      d: peor.n + (peor.f ? ' hasta el ' + fMedia(peor.f) : ' sin datos') + '.', ruta: peor.ruta,
      filas: f, cols: [['n', 'Fuente'], [x => x.f ? fMedia(x.f) : '–', 'Último dato'], [x => '<span class="tag ' + (x.cls === 'ok' ? 't-ok' : x.cls === 'warn' ? 't-warn' : 't-bad') + '">' + x.txt + '</span>', 'Estado']]
    };
  });

  add('a_sin_ticket', A, 'balanza', 'Viajes con ticket de balanza', 'Cada viaje a planta debe tener su pesada (mismo dominio, hora cercana).', () => {
    if (!k.pes.length) return { sev: 'info', t: 'Sin pesajes en el período', d: 'Importá el PESAJE.XLS para cruzar viajes con la balanza.', ruta: '#/cargar/pesaje' };
    if (!k.sinTicket.length) return k.sinTicketFuera.length ? { sev: 'info', t: k.sinTicketFuera.length + ' viajes después del último pesaje importado', d: 'Importá la balanza completa de esos días para cruzarlos.', ruta: '#/cargar/pesaje', filas: k.sinTicketFuera, cols: cols.viaje } : { sev: 'ok', t: 'Todos los viajes a planta tienen ticket', d: nf(k.pares.length) + ' viajes cruzados con la balanza.' };
    return { sev: k.sinTicket.length > 5 ? 'bad' : 'warn', t: pl(k.sinTicket.length, 'viaje sin ticket de balanza', 'viajes sin ticket de balanza'), d: 'Puede faltar el pesaje, estar mal el dominio o la hora (±' + par('VENTANA_MATCH_MIN', 120) + ' min).' + (k.sinTicketFuera.length ? ' Además ' + k.sinTicketFuera.length + ' viajes son posteriores al último pesaje importado de su día (falta importar la balanza).' : ''), ruta: '#/tablero/viajes', filas: k.sinTicket, cols: cols.viaje };
  });

  add('a_sin_viaje', A, 'camion', 'Tickets con viaje', 'Cada camión pesado debe tener su comprobante de viaje cargado.', () => {
    if (!k.pes.length) return null;
    if (!k.sinViaje.length) return { sev: 'ok', t: 'Todos los tickets tienen viaje', d: nf(k.pes.length) + ' pesadas con comprobante.' };
    return { sev: k.sinViaje.length > 5 ? 'bad' : 'warn', t: pl(k.sinViaje.length, 'ticket sin viaje registrado', 'tickets sin viaje registrado'), d: 'Camiones que entraron a la balanza sin comprobante cargado: ' + nf(sum(k.sinViaje, x => x.neto), 0) + ' t.', ruta: '#/tablero/viajes', filas: k.sinViaje, cols: cols.ticket };
  });

  add('a_practicas', A, 'balanza', 'Malas prácticas en balanza', 'Camiones de tierra sin pesaje de salida (cerrados con la tara del sistema) y patentes cargadas a mano. Cada caso debería tener el motivo en la observación.', () => {
    const p = (r.pesajes || []).filter(q => q.tierra !== false && (q.manual || q.sinSalida));
    if (!p.length) return { sev: 'ok', t: 'Pesajes completos y automáticos', d: 'Todos los camiones se pesaron a la entrada y a la salida.' };
    const sinJ = p.filter(q => !q.observ).length;
    return { sev: p.some(q => q.sinSalida) ? 'bad' : 'warn', t: p.filter(q => q.sinSalida).length + ' sin pesaje de salida · ' + p.filter(q => q.manual).length + ' cargas manuales', d: sinJ ? sinJ + ' sin justificación en la observación.' : 'Todos justificados.', ruta: '#/revision/cruda', filas: p,
      cols: [[x => fCorta(x.fecha), 'Fecha'], ['hora', 'Entrada'], ['salida', 'Salida'], ['dominio', 'Dominio'], [x => [x.manual ? 'manual' : '', x.sinSalida ? 'sin salida' : ''].filter(Boolean).join(' + '), 'Práctica'], [x => nf(x.neto, 2), 'Neto t', 'n'], [x => esc(x.observ || '—'), 'Justificación']] };
  });

  add('a_tara', A, 'balanza', 'Tara de cada camión', 'Que la tara pesada se parezca a la habitual del camión (±' + nf(tolTara * 100) + ' %). Una tara distinta cambia el neto.', () => {
    const conT = k.pes.filter(p => p.tara > 0);
    if (conT.length < 5) return { sev: 'info', t: 'Sin taras suficientes para controlar', d: 'El archivo de balanza no trae taras o hay pocos pesajes.' };
    const med = {};
    Object.keys(agrupar(conT, p => normDom(p.dominio))).forEach(d => { const a = conT.filter(p => normDom(p.dominio) === d).map(p => p.tara); if (a.length >= 3) med[d] = medianaDe(a); });
    const mal = conT.filter(p => med[normDom(p.dominio)] && Math.abs(p.tara - med[normDom(p.dominio)]) / med[normDom(p.dominio)] > tolTara)
      .map(p => Object.assign({}, p, { med: med[normDom(p.dominio)], efecto: med[normDom(p.dominio)] - p.tara }));
    if (!mal.length) return { sev: 'ok', t: 'Taras consistentes', d: Object.keys(med).length + ' camiones con tara habitual controlada.' };
    return {
      sev: mal.length > 3 ? 'bad' : 'warn', t: pl(mal.length, 'pesaje con tara fuera de lo habitual', 'pesajes con tara fuera de lo habitual'), d: 'Efecto en el neto: ' + nf(sum(mal, x => x.efecto), 1) + ' t. Revisar si el camión se taró cargado o con otro acoplado.', ruta: '#/tablero/viajes',
      filas: mal, cols: cols.ticket.concat([[x => nf(x.tara, 2), 'Tara', 'n'], [x => nf(x.med, 2), 'Tara habitual', 'n'], [x => nf(x.efecto, 2), 'Efecto t', 'n']])
    };
  });

  add('a_doble', A, 'balanza', 'Pesadas repetidas', 'Un mismo camión no puede pesar dos veces en menos de 25 minutos.', () => {
    const mal = [];
    Object.values(agrupar(k.pes, p => normDom(p.dominio) + '|' + p.fecha)).forEach(l => {
      l.sort((a, b) => (minDe(a.hora) || 0) - (minDe(b.hora) || 0));
      for (let i = 1; i < l.length; i++) if (minDe(l[i].hora) !== null && minDe(l[i].hora) - minDe(l[i - 1].hora) < 25) mal.push(Object.assign({}, l[i], { previo: l[i - 1].ticket + ' ' + l[i - 1].hora }));
    });
    if (!mal.length) return { sev: 'ok', t: 'Sin pesadas repetidas', d: 'Ningún camión pesó dos veces seguidas.' };
    return { sev: 'warn', t: pl(mal.length, 'pesada repetida', 'pesadas repetidas'), d: 'Posible doble importación o error de dominio.', ruta: '#/tablero/viajes', filas: mal, cols: cols.ticket.concat([['previo', 'Pesada anterior']]) };
  });

  add('a_atipicos', A, 'alerta', 'Netos normales', 'Que el neto de cada camión esté dentro de su rango habitual.', () => {
    if (!k.atipicos.length) return { sev: 'ok', t: 'Netos dentro de lo habitual', d: 'Sin pesadas fuera del rango de cada camión.' };
    return { sev: 'info', t: pl(k.atipicos.length, 'neto fuera de lo normal', 'netos fuera de lo normal'), d: 'Muy distintos a los habituales del mismo camión.', ruta: '#/tablero/viajes', filas: k.atipicos, cols: cols.ticket.concat([[x => nf(x.mediana, 2), 'Mediana', 'n']]) };
  });

  add('a_superpuestos', A, 'ruta', 'Viajes posibles', 'Un camión o un chofer no puede hacer dos viajes al mismo tiempo.', () => {
    const mal = [];
    const revisar = (clave, tipo) => Object.values(agrupar(k.viajesTot.filter(v => v.horaCarga && v.horaDescarga), v => clave(v) + '|' + v.fecha)).forEach(l => {
      l.sort((a, b) => minDe(a.horaCarga) - minDe(b.horaCarga));
      for (let i = 1; i < l.length; i++) {
        const fin = minDe(l[i - 1].horaDescarga) < minDe(l[i - 1].horaCarga) ? minDe(l[i - 1].horaDescarga) + 1440 : minDe(l[i - 1].horaDescarga);
        if (minDe(l[i].horaCarga) < fin) mal.push(Object.assign({}, l[i], { tipo: tipo, choque: l[i - 1].comprobante + ' ' + l[i - 1].horaCarga + '→' + l[i - 1].horaDescarga }));
      }
    });
    revisar(v => normDom(v.dominio), 'mismo camión');
    revisar(v => v.chofer, 'mismo chofer');
    if (!mal.length) return { sev: 'ok', t: 'Sin viajes superpuestos', d: 'Horarios coherentes por camión y por chofer.' };
    return { sev: 'warn', t: pl(mal.length, 'viaje superpuesto', 'viajes superpuestos'), d: 'Hay cargas que empiezan antes de terminar el viaje anterior.', ruta: '#/tablero/viajes', filas: mal, cols: cols.viaje.concat([['tipo', 'Motivo'], ['choque', 'Choca con']]) };
  });

  add('a_palas', A, 'pala', 'Camiones declarados ↔ viajes', 'Camiones a planta que declaran las palas contra los viajes cargados.', () => {
    const difer = k.diario.filter(d => d.unid > 0 && Math.abs(d.unid - d.viajes) > Math.max(3, d.unid * 0.15));
    if (!difer.length) return { sev: 'ok', t: 'Cantera y viajes coinciden', d: 'Diferencias dentro de lo normal.' };
    const u = difer[difer.length - 1];
    return { sev: 'warn', t: pl(difer.length, 'día', 'días') + ' con diferencia cantera ↔ viajes', d: 'Ej. ' + fCorta(u.fecha) + ': ' + u.unid + ' declarados vs ' + u.viajes + ' viajes.', ruta: '#/tablero/viajes', filas: difer, cols: [[x => fCorta(x.fecha), 'Fecha'], ['unid', 'Declarados en cantera', 'n'], ['viajes', 'Viajes', 'n'], [x => x.unid - x.viajes, 'Diferencia', 'n']] };
  });

  add('a_carga', A, 'pala', 'Carga real de los camiones', 'Toneladas de balanza por palada declarada en cantera, comparado con el factor de molienda.', () => {
    const f = b.fMol;
    const rx = new RegExp(String(par('ORIGEN_CANTERA', 'CANTERA')), 'i');
    const dias = k.diario.filter(d => (d.unid + d.internos) > 0 && d.tickets > 0 && d.palCam > 0).map(d => {
      const otros = k.pares.filter(x => x.v.fecha === d.fecha && !rx.test(x.v.origen));
      const tk = d.tickets - otros.length;
      const ton = d.neto - sum(otros, x => x.p.neto);
      const ppc = d.palCam / (d.unid + d.internos);
      const tp = tk > 0 ? ton / tk / ppc : null;
      return Object.assign({}, d, { tp: tp, pal: ppc * tk, ppc: ppc, desvio: f && tp ? (tp - f) / f : null });
    }).filter(d => d.tp !== null);
    if (dias.length < 3) return { sev: 'info', t: 'Pocos días para medir la carga real', d: 'Se necesitan jornadas con paladas a camión y pesajes del mismo día.' };
    const med = medianaDe(dias.map(d => d.tp));
    const mal = dias.filter(d => d.desvio !== null && Math.abs(d.desvio) > 0.2);
    const txt = nf(med, 2) + ' t por palada en cantera vs ' + nf(f, 2) + ' en molienda';
    if (!mal.length) return { sev: 'ok', t: 'Carga de camiones coherente', d: txt + '.' };
    return { sev: 'info', t: pl(mal.length, 'día', 'días') + ' con carga de camiones distinta', d: txt + '. Puede haber paladas mal contadas o baldes poco llenos.', ruta: '#/tablero/cantera', filas: mal, cols: [[x => fCorta(x.fecha), 'Fecha'], [x => nf(x.ppc, 1), 'Paladas/camión', 'n'], [x => nf(x.neto, 1), 't balanza', 'n'], [x => nf(x.tp, 2), 't/palada', 'n'], [x => nf(x.desvio * 100, 0) + '%', 'Desvío', 'n']] };
  });

  add('a_horometros', A, 'reloj', 'Horómetros de la jornada', 'Que el horómetro avance y no supere las horas del tramo.', () => {
    const mal = (r.tramos || []).filter(t => t.tipo === 'Producción' && t.horometroIni !== null && t.horometroFin !== null && ((t.horometroFin - t.horometroIni) < 0 || (t.horometroFin - t.horometroIni) > dur(t.horaInicio, t.horaFin) + 1));
    if (!mal.length) return { sev: 'ok', t: 'Horómetros coherentes', d: 'Todos los tramos avanzan dentro de su horario.' };
    return { sev: 'bad', t: pl(mal.length, 'horómetro inconsistente', 'horómetros inconsistentes'), d: mal.slice(0, 2).map(t => t.maquina + ' ' + fCorta(t.fecha) + ': ' + nf(t.horometroIni, 1) + ' → ' + nf(t.horometroFin, 1)).join(' · '), ruta: '#/dia/' + mal[0].fecha, filas: mal, cols: [[x => fCorta(x.fecha), 'Fecha'], ['maquina', 'Máquina'], [x => x.horaInicio + '–' + x.horaFin, 'Horario'], [x => nf(x.horometroIni, 1), 'Inicial', 'n'], [x => nf(x.horometroFin, 1), 'Final', 'n']] };
  });

  add('a_ciclos', A, 'reloj', 'Duración de los viajes', 'Viajes de más de 4 h entre carga y descarga.', () => {
    const l = k.ciclos.filter(c => c.min > 240);
    if (!l.length) return { sev: 'ok', t: 'Duraciones normales', d: 'Ningún viaje supera las 4 h.' };
    return { sev: 'info', t: pl(l.length, 'viaje', 'viajes') + ' de más de 4 h', d: 'Revisar hora de carga o descarga.', ruta: '#/dia/' + l[0].v.fecha, filas: l.map(c => Object.assign({ min: c.min }, c.v)), cols: cols.viaje.concat([[x => nf(x.min / 60, 1) + ' h', 'Duración', 'n']]) };
  });

  add('a_calidad', A, 'calidad', 'Calidad de la tierra', 'Muestras rechazadas y cantidad de viajes inspeccionados.', () => {
    const C = r.calidad || [];
    const rech = C.filter(c => c.estado === 'Rechazado');
    const pct = k.viajes.length ? C.length / k.viajes.length * 100 : null;
    const rt = b.rechT;
    if (rech.length) return { sev: 'bad', t: pl(rech.length, 'muestra rechazada', 'muestras rechazadas') + (rt ? ' · ' + nf(rt, 0) + ' t fuera del stock' : ''), d: rech.slice(0, 2).map(c => (c.origen || c.dominio) + ' ' + fCorta(c.fecha)).join(' · ') + (par('EXCLUIR_RECHAZADOS', 'SI') === 'SI' ? '. Las toneladas rechazadas no suman a la playa.' : ''), ruta: '#/tablero/calidad', filas: rech, cols: [[x => fCorta(x.fecha), 'Fecha'], ['hora', 'Hora'], ['dominio', 'Dominio'], ['origen', 'Origen'], [x => esc(x.observaciones), 'Motivo', 'wrap']] };
    if (pct !== null && pct < 5 && k.viajes.length > 20) return { sev: 'info', t: 'Pocos viajes inspeccionados (' + nf(pct, 1) + ' %)', d: 'Se recomienda inspeccionar al menos 1 de cada 20 viajes.', ruta: '#/cargar/calidad' };
    return { sev: 'ok', t: 'Sin rechazos de calidad', d: C.length + ' muestras en el período' + (pct !== null ? ' (' + nf(pct, 1) + ' % de los viajes).' : '.') };
  });

  const cis = R.cisterna && !R.cisterna.error ? R.cisterna : null;
  const comb = r.combustible || [];
  add('g_cisterna', A, 'combustible', 'Nivel de la cisterna', 'Que la cisterna tenga gasoil y que el nivel calculado sea posible.', () => {
    if (!cis) return { sev: 'info', t: 'Cisterna sin configurar', d: 'Revisá COMBUSTIBLE_ID en Parámetros.' };
    if (cis.nivel < 0 || (cis.capacidad && cis.nivel > cis.capacidad * 1.05)) return { sev: 'bad', t: 'Nivel imposible: ' + nf(cis.nivel) + ' L', d: cis.nivel < 0 ? 'Salió más gasoil del que entró: falta registrar un llenado o hay una carga mal tipeada.' : 'Supera la capacidad: falta registrar consumos o el nivel de inicio es incorrecto. Avisá al administrador para ajustar la cisterna.', ruta: '#/cargar/gasoil' };
    const muerto = muertoCis(cis);
    const util = utilCis(cis);
    const capU = cis.capacidad ? cis.capacidad - muerto : 0;
    const auton = cis.consumoMedio > 0 ? util / cis.consumoMedio : null;
    if (cis.nivel < muerto) return { sev: 'warn', t: 'Cisterna por debajo del stock muerto', d: 'Calculado ' + nf(cis.nivel) + ' L y no se pueden bombear los últimos ' + nf(muerto) + ' L: falta registrar un llenado o hay una carga mal anotada.', ruta: '#/cargar/gasoil' };
    if (capU && util / capU < 0.25) return { sev: 'bad', t: 'Cisterna baja: ' + nf(util) + ' L utilizables', d: 'Queda ' + nf(util / capU * 100) + ' % de lo utilizable' + (auton ? ', ≈ ' + nf(auton, 1) + ' días.' : '.'), ruta: '#/tablero/combustible' };
    return { sev: 'ok', t: 'Cisterna con ' + nf(util) + ' L utilizables', d: (auton ? '≈ ' + nf(auton, 1) + ' días de autonomía' : 'Nivel normal') + ' · ' + nf(muerto) + ' L de stock muerto.' };
  });

  add('g_lh', A, 'combustible', 'Consumo por hora', 'Litros cargados ÷ horas de horómetro desde la carga anterior de la misma máquina.', () => {
    const rg = rendimientoGasoil(comb);
    const mal = rg.filter(x => x.horas <= 0 || (x.mediana && x.lh !== null && x.horas >= 2 && x.lh > x.mediana * 1.5));
    if (rg.length < 3) return { sev: 'info', t: 'Pocas cargas con horómetro', d: 'Cargá el horómetro en cada carga de gasoil para medir el consumo.' };
    if (!mal.length) return { sev: 'ok', t: 'Consumo por hora normal', d: Array.from(new Set(rg.map(x => x.maquina))).map(m => m + ' ' + nf(rg.find(x => x.maquina === m).mediana, 1) + ' L/h').join(' · ') };
    return { sev: 'warn', t: pl(mal.length, 'carga con consumo anormal', 'cargas con consumo anormal'), d: 'Más de 1,5 veces el consumo habitual o horómetro que no avanzó.', ruta: '#/tablero/combustible', filas: mal, cols: [[x => fCorta(x.fecha), 'Fecha'], ['maquina', 'Máquina'], [x => nf(x.litros, 0), 'Litros', 'n'], [x => nf(x.horas, 1), 'Horas', 'n'], [x => nf(x.lh, 1), 'L/h', 'n'], [x => nf(x.mediana, 1), 'Habitual', 'n']] };
  });

  add('g_horometro', A, 'reloj', 'Horómetro gasoil ↔ jornada', 'El horómetro anotado al cargar gasoil debe coincidir con el de la jornada (±' + tolHor + ' h).', () => {
    const ini = {};
    (r.tramos || []).filter(t => t.tipo === 'Producción').forEach(t => {
      const kk = t.maquina + '|' + t.fecha;
      if (t.horometroIni !== null && (!ini[kk] || minDe(t.horaInicio) < ini[kk].m)) ini[kk] = { m: minDe(t.horaInicio), h: t.horometroIni, fin: t.horometroFin };
    });
    const mal = [];
    const sinJ = [];
    comb.filter(c => c.horometro).forEach(c => {
      const j = ini[c.maquina + '|' + c.fecha];
      if (!j) { sinJ.push(c); return; }
      const ref = minDe(c.hora) !== null && minDe(c.hora) > j.m && j.fin ? null : j.h;
      if (ref !== null && Math.abs(c.horometro - ref) > tolHor) mal.push(Object.assign({}, c, { ref: ref, dif: c.horometro - ref }));
    });
    if (mal.length) return { sev: 'warn', t: pl(mal.length, 'carga', 'cargas') + ' con horómetro distinto a la jornada', d: 'El horómetro del gasoil no coincide con el inicial de la jornada del mismo día.', ruta: '#/tablero/combustible', filas: mal, cols: [[x => fCorta(x.fecha), 'Fecha'], ['hora', 'Hora'], ['maquina', 'Máquina'], [x => nf(x.horometro, 1), 'Horóm. gasoil', 'n'], [x => nf(x.ref, 1), 'Horóm. jornada', 'n'], [x => nf(x.dif, 1), 'Diferencia', 'n']] };
    if (sinJ.length > 2) return { sev: 'info', t: pl(sinJ.length, 'carga', 'cargas') + ' de gasoil sin jornada ese día', d: 'Máquinas que cargaron gasoil pero no tienen tramo de producción cargado.', ruta: '#/cargar/jornada', filas: sinJ, cols: [[x => fCorta(x.fecha), 'Fecha'], ['maquina', 'Máquina'], [x => nf(x.litros, 0), 'Litros', 'n']] };
    return { sev: 'ok', t: 'Horómetros de gasoil coinciden con la jornada', d: comb.length + ' cargas controladas.' };
  });

  add('g_medicion', A, 'combustible', 'Medición de la cisterna', 'Comparar el nivel medido con varilla contra el calculado.', () => {
    const todas = (r.mediciones || []).slice().sort((a, b) => (a.fecha + a.hora) < (b.fecha + b.hora) ? -1 : 1);
    const uAj = todas.filter(esAjusteCis).pop();
    const fBase = cis && cis.fechaBase ? cis.fechaBase : '';
    const med = todas.filter(x => !esAjusteCis(x) && (!uAj || (x.fecha + x.hora) > (uAj.fecha + uAj.hora)) && (!fBase || x.fecha > fBase));
    if (!med.length) return { sev: 'info', t: 'Sin mediciones de cisterna en el período', d: 'Medí la cisterna una vez por semana para detectar faltantes.', ruta: '#/cargar/gasoil' };
    const u = med[med.length - 1];
    const cap = cis && cis.capacidad ? cis.capacidad : 5000;
    const sev = Math.abs(u.diferencia) > cap * 0.05 ? 'bad' : Math.abs(u.diferencia) > cap * 0.02 ? 'warn' : 'ok';
    return { sev: sev, t: sev === 'ok' ? 'Última medición coincide (' + nf(u.diferencia) + ' L)' : 'Diferencia de ' + nf(u.diferencia) + ' L en la cisterna', d: fCorta(u.fecha) + ' ' + u.hora + ': medido ' + nf(u.litrosMedidos) + ' L, calculado ' + nf(u.litrosEstimados) + ' L.', ruta: '#/cargar/gasoil', filas: med, cols: [[x => fCorta(x.fecha), 'Fecha'], ['hora', 'Hora'], [x => nf(x.litrosMedidos), 'Medido L', 'n'], [x => nf(x.litrosEstimados), 'Calculado L', 'n'], [x => nf(x.diferencia), 'Diferencia', 'n']] };
  });

  add('m_atraso', Mo, 'reloj', 'Molienda al día', 'Que el Informe de Producción o la carga manual tengan los turnos hasta ayer.', atraso('molienda', 'Molienda', '#/cargar/molienda'));

  add('m_cubicacion', Mo, 'ajuste', 'Ajuste de stock periódico', 'Medir la playa al menos cada ' + diasCub + ' días para corregir el balance.', () => {
    if (!b.hayAjuste) return { sev: 'warn', t: 'Sin stock inicial ni ajuste', d: 'Sin un ajuste no se puede saber el stock. Cargá cuánta tierra hay en la playa.', ruta: '#/cargar/ajustes' };
    const f = ult.cubicacion;
    const dd = f ? difDias(f, hoy()) : null;
    if (dd === null || dd > diasCub) return { sev: 'warn', t: f ? 'Último ajuste hace ' + dd + ' días' : 'Sin ajustes de playa', d: 'Conviene medir cada ' + diasCub + ' días.', ruta: '#/cargar/ajustes' };
    return { sev: 'ok', t: 'Ajuste reciente (' + fMedia(f) + ')', d: 'Hace ' + dd + ' días.' };
  });

  add('m_inventario', Mo, 'playa', 'Diferencia en los ajustes', 'Diferencia entre lo medido y el stock calculado en ese momento (tolerancia ' + nf(tolInv * 100) + ' %).', () => {
    const cub = (b.cubicaciones || []).filter(c => c.teorico !== null);
    if (!cub.length) return { sev: 'info', t: 'Sin ajustes para comparar', d: 'Con dos o más ajustes de stock se mide la diferencia.' };
    const u = cub[cub.length - 1];
    const sev = Math.abs(u.pct) > tolInv * 2 ? 'bad' : Math.abs(u.pct) > tolInv ? 'warn' : 'ok';
    return {
      sev: sev, t: (sev === 'ok' ? 'Inventario coherente: ' : 'Diferencia de inventario: ') + (u.dif >= 0 ? '+' : '') + nf(u.dif, 0) + ' t (' + nf(u.pct * 100, 1) + ' %)',
      d: u.nodo + ' ' + fCorta(u.fecha) + ': cubicado ' + nf(u.medido, 0) + ' t, calculado ' + nf(u.teorico, 0) + ' t.' + (sev !== 'ok' ? (u.dif < 0 ? ' Falta tierra: revisá el factor t/palada (consumo subestimado) o pérdidas.' : ' Sobra tierra: el factor t/palada puede estar alto o falta registrar ingresos.') : ''),
      ruta: '#/tablero/balance', filas: cub, cols: [[x => fCorta(x.fecha), 'Fecha'], ['nodo', 'Nodo'], [x => nf(x.teorico, 0), 'Calculado t', 'n'], [x => nf(x.medido, 0), 'Cubicado t', 'n'], [x => nf(x.dif, 0), 'Diferencia t', 'n'], [x => nf(x.pct * 100, 1) + '%', '%', 'n']]
    };
  });

  add('m_stock', Mo, 'playa', 'Stocks posibles', 'Playa y silo no pueden quedar negativos ni superar su capacidad.', () => {
    const capP = num(par('CAPACIDAD_PLAYA', '')) || null;
    const capS = num(par('CAPACIDAD_SILO', '')) || null;
    const mal = [];
    if (!b.inicioPlaya) return { sev: 'warn', t: 'Playa sin stock inicial', d: 'Sin un ajuste de stock no se puede saber cuánta tierra hay.', ruta: '#/cargar/ajustes' };
    if (b.stockPlaya === null) mal.push('El stock de playa da negativo desde el ' + fCorta(b.playaInvalidaDesde) + ': faltan ingresos o un ajuste');
    if (b.inicioSilo && b.stockSilo === null) mal.push('El stock de silo da negativo desde el ' + fCorta(b.siloInvalidoDesde));
    if (capP && b.stockPlaya > capP) mal.push('Playa sobre su capacidad');
    if (capS && b.stockSilo > capS) mal.push('Silo sobre su capacidad');
    if (!mal.length) return { sev: 'ok', t: 'Stocks dentro de lo posible', d: 'Playa ' + nf(b.stockPlaya, 0) + ' t (≈ ' + nf(b.stockPlaya / b.densidad, 0) + ' m³)' + (b.stockSilo !== null ? ' · silo ' + nf(b.stockSilo, 0) + ' t' : '') + '.' };
    return { sev: 'bad', t: mal.join(' · '), d: 'Cargá un ajuste de stock o revisá el factor t/palada.', ruta: '#/cargar/ajustes' };
  });

  add('m_cobertura', Mo, 'molienda', 'Días de cobertura', 'Cuántos días de molienda alcanza la tierra de la playa y del silo.', () => {
    if (!b.consumoMedio) return { sev: 'info', t: 'Sin consumo para estimar cobertura', d: 'Faltan turnos de molienda recientes.' };
    if (b.stockPlaya === null) return { sev: 'info', t: 'Sin stock válido para estimar cobertura', d: 'Cargá un ajuste de stock de playa.', ruta: '#/cargar/ajustes' };
    const dp = b.diasPlaya;
    const ds = b.diasSilo;
    const txt = 'Playa: ' + nf(dp, 1) + ' días' + (ds !== null ? ' · Silo: ' + nf(ds, 1) + ' días' : '');
    if (dp !== null && dp < 5) return { sev: dp < 2 ? 'bad' : 'warn', t: 'La playa alcanza para ' + nf(dp, 1) + ' días', d: 'Consumo medio ' + nf(b.consumoMedio, 0) + ' t/día. Coordiná más viajes con abastecimiento.', ruta: '#/tablero/balance' };
    return { sev: 'ok', t: txt, d: 'Consumo medio de molienda ' + nf(b.consumoMedio, 0) + ' t/día.' };
  });

  add('m_factor', Mo, 'molienda', 'Factor t/palada por turno', 'Toneladas de la balanza dinámica ÷ paladas al cajón. Un turno muy distinto indica paladas o balanza mal informadas.', () => {
    const t = (r.molienda || []).filter(x => x.paladas > 0 && x.toneladas > 0).map(x => Object.assign({}, x, { f: x.toneladas / x.paladas }));
    const sinP = (r.molienda || []).filter(x => !(x.paladas > 0) && x.toneladas > 0);
    if (t.length < 4) return { sev: 'info', t: 'Pocos turnos con balanza dinámica', d: 'Se necesitan turnos con paladas y toneladas.' };
    const med = medianaDe(t.map(x => x.f));
    const mal = t.filter(x => Math.abs(x.f - med) / med > 0.25).map(x => Object.assign(x, { med: med })).concat(sinP.map(x => Object.assign({}, x, { f: null, med: med })));
    if (!mal.length) return { sev: 'ok', t: 'Factor estable: ' + nf(med, 2) + ' t/palada', d: t.length + ' turnos controlados.' };
    return { sev: 'warn', t: pl(mal.length, 'turno', 'turnos') + ' con factor fuera de rango', d: 'Habitual ' + nf(med, 2) + ' t/palada (±25 %).', ruta: '#/cargar/molienda', filas: mal, cols: [[x => fCorta(x.fecha), 'Fecha'], ['turno', 'Turno'], [x => nf(x.paladas), 'Paladas', 'n'], [x => nf(x.toneladas, 1), 't', 'n'], [x => nf(x.f, 2), 't/palada', 'n'], ['fuente', 'Fuente']] };
  });

  add('m_estimados', Mo, 'molienda', 'Balanza dinámica', 'Turnos con paladas pero sin toneladas de la balanza dinámica.', () => {
    if (!b.estimados) return { sev: 'ok', t: 'Balanza dinámica completa', d: 'Todos los turnos tienen toneladas.' };
    return { sev: b.estimados > 5 ? 'warn' : 'info', t: pl(b.estimados, 'día', 'días') + ' sin balanza dinámica', d: 'El consumo se estimó con ' + nf(b.fMolHist, 2) + ' t/palada.', ruta: '#/tablero/balance', filas: b.serie.filter(s => s.estimado), cols: [[x => fCorta(x.fecha), 'Fecha'], [x => nf(x.consumo, 1), 'Consumo estimado t', 'n']] };
  });

  return res.sort((a, c) => SEV_ORDEN[a.sev] - SEV_ORDEN[c.sev]);
}

function htmlAlerta(a, i, conSector) {
  return '<div class="alerta ' + a.sev + '" data-ir="' + a.ruta + '" style="animation:cardIn .45s var(--ease) both;animation-delay:' + i * 40 + 'ms"><span class="ico">' + ICON[a.ic] + '</span><div><b>' + esc(a.t) + '</b><small>' + a.d + '</small></div>' +
    (conSector ? '<span class="chip-sector ' + a.sector + '">' + SECTORES[a.sector].t + '</span>' : '') + '</div>';
}

function tabControles(c) {
  const lista = S.ultControles || controles(S.rango, calcBalance(S.desde, S.hasta));
  const cuenta = (sec, sev) => lista.filter(x => x.sector === sec && x.sev === sev).length;
  const bloque = sec => {
    const l = lista.filter(x => x.sector === sec);
    const prob = l.filter(x => x.sev !== 'ok');
    const oks = l.filter(x => x.sev === 'ok');
    return '<div class="card sector-card ' + sec + '"><div class="card-h"><div class="t"><h3>' + ICON[SECTORES[sec].ic].replace('<svg', '<svg width="18" height="18"') + ' ' + SECTORES[sec].t + '</h3><div class="sub">' + SECTORES[sec].d + ' · ' + SECTORES[sec].rol + '</div></div>' +
      '<div class="row"><span class="tag t-bad">' + cuenta(sec, 'bad') + '</span><span class="tag t-warn">' + cuenta(sec, 'warn') + '</span><span class="tag t-ok">' + oks.length + ' ok</span></div></div>' +
      '<div class="controles">' + prob.map(x => '<details class="control ' + x.sev + '"><summary><span class="ico">' + ICON[x.ic] + '</span><span class="txt"><b>' + esc(x.t) + '</b><small>' + x.d + '</small></span>' + (x.filas.length ? '<span class="n">' + x.filas.length + '</span>' : '') + '</summary>' +
        '<div class="det"><div class="que">' + ICON.infoI.replace('<svg', '<svg width="14" height="14"') + esc(x.que) + '</div>' + (x.filas.length && x.cols ? tabla(x.cols, x.filas.slice(0, 200), { max: true }) : '') +
        '<a class="btn sm" href="' + x.ruta + '">Ir a revisar ' + ICON.der.replace('<svg', '<svg width="14" height="14"') + '</a></div></details>').join('') +
      (prob.length ? '' : '<div class="alerta ok"><span class="ico">' + ICON.ok + '</span><div><b>Sin problemas en ' + SECTORES[sec].t.toLowerCase() + '</b><small>Todos los controles pasan en el período.</small></div></div>') +
      (oks.length ? '<details class="oks"><summary>' + oks.length + ' controles en orden</summary>' + oks.map(x => '<div class="ok-it">' + ICON.ok.replace('<svg', '<svg width="14" height="14"') + '<span><b>' + esc(x.nombre) + '</b> · ' + esc(x.t) + '</span></div>').join('') + '</details>' : '') + '</div></div>';
  };
  const orden = S.ses && S.ses.rol === 'molienda' ? ['molienda', 'abastecimiento'] : ['abastecimiento', 'molienda'];
  c.innerHTML = '<div class="kpis stagger">' +
    kpi('Controles revisados', vn(lista.length), 'en el período') +
    kpi('Problemas graves', vn(lista.filter(x => x.sev === 'bad').length), 'requieren acción', lista.some(x => x.sev === 'bad') ? 'bad' : 'ok') +
    kpi('Para revisar', vn(lista.filter(x => x.sev === 'warn').length), 'diferencias a explicar', lista.some(x => x.sev === 'warn') ? 'warn' : 'ok') +
    kpi('En orden', vn(lista.filter(x => x.sev === 'ok').length), 'controles sin observaciones', 'ok') +
    '</div><div class="grid g2 sectores">' + orden.map(bloque).join('') + '</div>';
}
