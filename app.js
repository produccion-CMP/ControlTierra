'use strict';

function setSesion(s) {
  S.ses = s;
  if (s) lsSet('tierra_ses', s); else lsDel('tierra_ses');
  pintarSesion();
  pintarNav();
}

function pintarSesion() {
  const b = $('#btnSesion');
  b.innerHTML = ICON.usuario + '<span>' + (S.ses ? esc(S.ses.nombre) : 'Ingresar') + '</span>';
  b.classList.toggle('pri', !S.ses);
}

async function listaUsuarios() {
  try {
    const l = await api('usuarios');
    if (Array.isArray(l) && l.length) lsSet('tierra_usuarios', l);
    return l;
  } catch (e) {
    return lsGet('tierra_usuarios', []);
  }
}

function login(destino) {
  const ult = lsGet('tierra_ultimo_usuario', '');
  const cache = lsGet('tierra_usuarios', []);
  const opcs = l => '<option value="">Elegí tu usuario…</option>' + l.map(u => '<option value="' + esc(u.nombre) + '"' + (normTxt(u.nombre) === normTxt(ult) ? ' selected' : '') + '>' + esc(u.nombre) + ' · ' + esc(rolTxt(u.rol)) + '</option>').join('');
  const m = modal('Ingresar para cargar datos', '<div class="col" style="gap:12px"><label class="f">Usuario<select id="lgN" autocomplete="username">' + opcs(cache) + '</select></label>' +
    '<label class="f">Contraseña<input id="lgP" type="password" inputmode="numeric" autocomplete="current-password" maxlength="8"></label><div id="lgE"></div>' +
    '<p class="sub">El inicio, el tablero y el calendario son públicos. La carga y la configuración requieren usuario.</p></div>', [
    { txt: 'Cancelar' },
    {
      txt: 'Ingresar', cls: 'pri', fn: async mm => {
        const n = $('#lgN', mm).value.trim();
        const p = $('#lgP', mm).value.trim();
        if (!n || !p) { $('#lgE', mm).innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>' + (n ? 'Escribí la contraseña' : 'Elegí tu usuario') + '</div></div>'; return false; }
        try {
          const s = await api('login', { nombre: n, pin: p });
          lsSet('tierra_ultimo_usuario', n);
          setSesion(s);
          toast('Bienvenido, ' + s.nombre, 'ok');
          procesarCola();
          if (destino) location.hash = destino; else render();
          return true;
        } catch (e) {
          $('#lgE', mm).innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>' + esc(e.message) + '</div></div>';
          $('#lgP', mm).value = '';
          $('#lgP', mm).classList.add('inv');
          return false;
        }
      }
    }
  ]);
  listaUsuarios().then(l => {
    const sel = $('#lgN', m);
    if (!sel || !l || !l.length) return;
    const v = sel.value;
    sel.innerHTML = opcs(l);
    if (v) sel.value = v;
    if (sel.value) $('#lgP', m).focus();
  });
  setTimeout(() => { const pi = $('#lgP', m); if (pi && $('#lgN', m).value) pi.focus(); }, 80);
  $('#lgP', m).addEventListener('keydown', e => { if (e.key === 'Enter') $$('.btn.pri', m).pop().click(); });
  $('#lgN', m).addEventListener('change', () => $('#lgP', m).focus());
}

function menuSesion() {
  if (!S.ses) return login();
  modal(S.ses.nombre, '<div class="col"><span class="tag t-acc" style="align-self:flex-start">' + esc(rolTxt(S.ses.rol)) + '</span><p class="sub">La sesión vence a las ' +
    new Date(S.ses.vence).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + '.</p></div>', [
    { txt: 'Cambiar PIN', fn: () => { setTimeout(cambiarPinUI, 50); } },
    { txt: 'Cerrar' },
    { txt: 'Salir', cls: 'dan', fn: () => { setSesion(null); location.hash = '#/inicio'; } }
  ]);
}

function cambiarPinUI() {
  modal('Cambiar mi PIN', '<div class="form"><label class="f">PIN actual<input id="pA" type="password" inputmode="numeric" maxlength="8"></label><label class="f">PIN nuevo (4 a 8 números)<input id="pN" type="password" inputmode="numeric" maxlength="8"></label><label class="f">Repetir PIN nuevo<input id="pR" type="password" inputmode="numeric" maxlength="8"></label></div><p class="sub">El administrador siempre puede cambiarlo desde Configuración → Usuarios.</p>', [
    { txt: 'Cancelar' },
    {
      txt: 'Cambiar', cls: 'pri', fn: async mm => {
        const n = $('#pN', mm).value;
        if (!/^\d{4,8}$/.test(n)) { toast('El PIN nuevo debe tener entre 4 y 8 números', 'warn'); return false; }
        if (n !== $('#pR', mm).value) { toast('Los PIN nuevos no coinciden', 'warn'); return false; }
        try { await api('cambiarPin', { actual: $('#pA', mm).value, nuevo: n }); toast('PIN cambiado', 'ok'); return true; } catch (e) { toast(e.message, 'bad'); return false; }
      }
    }
  ]);
}

function itemsNav() {
  const it = [['inicio', 'Inicio', 'inicio'], ['tablero', 'Tablero', 'tablero'], ['calendario', 'Calendario', 'calendario'], ['acopios', 'Acopios', 'playa']];
  if (S.ses) it.push(['cargar', 'Cargar', 'cargar'], ['revision', 'Revisión', 'alerta']);
  if (puede('liquidacion')) it.push(['liquidacion', 'Liquidación', 'dinero']);
  if (S.ses && rolN(S.ses.rol) === 'admin') it.push(['config', 'Configuración', 'config']);
  return it;
}

function rutaActual() {
  const r = (location.hash.split('/')[1]) || 'inicio';
  return r === 'dia' ? 'calendario' : r;
}

function pintarNav() {
  const r = rutaActual();
  const it = itemsNav();
  $('#nav').innerHTML = '<span class="pill"></span>' + it.map(i => '<a href="#/' + i[0] + '" title="' + i[1] + '" class="' + (r === i[0] ? 'on' : '') + '">' + ICON[i[2]] + '<span class="lb">' + i[1] + '</span></a>').join('');
  const on = $('#nav a.on');
  const pill = $('#nav .pill');
  if (on) { pill.style.left = on.offsetLeft + 'px'; pill.style.width = on.offsetWidth + 'px'; pill.style.opacity = 1; } else pill.style.opacity = 0;
  const bn = [['inicio', 'Inicio', 'inicio'], ['tablero', 'Tablero', 'tablero'], ['calendario', 'Calendario', 'calendario'], S.ses ? ['cargar', 'Cargar', 'cargar'] : ['ingresar', 'Ingresar', 'usuario'], ['mas', 'Más', 'mas']];
  $('#bnav').innerHTML = bn.map(i => '<a href="#/' + i[0] + '" data-k="' + i[0] + '" class="' + (r === i[0] ? 'on' : '') + '">' + ICON[i[2]] + '<span>' + i[1] + '</span></a>').join('');
}

function menuMas() {
  const tema = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const it = itemsNav().filter(i => ['inicio', 'tablero', 'calendario', 'cargar'].indexOf(i[0]) < 0);
  const m = modal('Más opciones', '<div class="col">' + it.map(i => '<a class="btn" style="justify-content:flex-start" href="#/' + i[0] + '">' + ICON[i[2]] + i[1] + '</a>').join('') +
    '<button class="btn" style="justify-content:flex-start" id="mTema">' + (tema === 'dark' ? ICON.sol + 'Tema claro' : ICON.luna + 'Tema oscuro') + '</button>' +
    '<button class="btn" style="justify-content:flex-start" id="mSes">' + ICON.usuario + (S.ses ? esc(S.ses.nombre) + ' · ' + esc(rolTxt(S.ses.rol)) : 'Ingresar') + '</button>' +
    (S.ses ? '<button class="btn dan" style="justify-content:flex-start" id="mSal">' + ICON.salir + 'Cerrar sesión</button>' : '') + '</div>');
  $$('a', m).forEach(a => a.addEventListener('click', () => m.cerrar()));
  $('#mTema', m).onclick = () => { m.cerrar(); cambiarTema(); };
  $('#mSes', m).onclick = () => { m.cerrar(); if (!S.ses) login(); else menuSesion(); };
  if ($('#mSal', m)) $('#mSal', m).onclick = () => { m.cerrar(); setSesion(null); location.hash = '#/inicio'; };
}

function aplicarTema(t) {
  if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme');
  const oscuro = (t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
  $('#btnTema').innerHTML = oscuro ? ICON.sol : ICON.luna;
  const meta = $('meta[name=theme-color]');
  if (meta) meta.setAttribute('content', oscuro ? '#1c1c1e' : '#d96b3a');
  if (typeof Chart !== 'undefined') Chart.defaults.color = cssVar('--muted');
}

function cambiarTema() {
  const actual = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const nuevo = actual === 'dark' ? 'light' : 'dark';
  lsSet('tierra_tema', nuevo);
  aplicarTema(nuevo);
  render();
}

async function render() {
  S.nav = (S.nav || 0) + 1;
  destruirGraficos();
  app().onclick = null;
  app().onchange = null;
  $$('.ac-lista').forEach(x => x.remove());
  pintarNav();
  const p = location.hash.replace(/^#\/?/, '').split('/');
  const v = p[0] || 'inicio';
  if (v !== 'calendario') window.scrollTo(0, 0);
  try {
    if (v === 'inicio') await vInicio();
    else if (v === 'tablero') await vTablero(p[1] || 'balance');
    else if (v === 'calendario') { const d = S.calDir; S.calDir = ''; await vCalendario(p[1], d); }
    else if (v === 'dia') await vDia(p[1] || hoy());
    else if (v === 'acopios') await vAcopios(p[1]);
    else if (v === 'revision') await vRevision(p[1]);
    else if (v === 'ingresar') { history.replaceState(null, '', '#/inicio'); await vInicio(); login('#/cargar'); }
    else if (v === 'mas') { history.replaceState(null, '', '#/inicio'); pintarNav(); await vInicio(); menuMas(); }
    else if (v === 'cargar') {
      if (!S.ses) {
        app().innerHTML = '<div class="vista card empty" style="padding:50px">' + ICON.usuario + '<b>Ingresá con tu usuario para cargar datos.</b><button class="btn pri mt" id="bLg">Ingresar</button></div>';
        $('#bLg').onclick = () => login(location.hash);
      } else await vCargar(p[1], p[2]);
    } else if (v === 'liquidacion') {
      if (!puede('liquidacion')) app().innerHTML = '<div class="vista card empty">' + ICON.alerta + 'Disponible para el responsable de abastecimiento y administradores.</div>';
      else await vLiquidacion();
    } else if (v === 'config') {
      if (!S.ses || rolN(S.ses.rol) !== 'admin') app().innerHTML = '<div class="vista card empty">' + ICON.alerta + 'Solo administradores.</div>';
      else if (p[1] === 'Datos') { location.hash = '#/datos'; }
      else await vConfig(p[1] || 'Maquinas');
    } else if (v === 'datos') {
      if (!S.ses || rolN(S.ses.rol) !== 'admin') app().innerHTML = '<div class="vista card empty">' + ICON.alerta + 'Solo administradores.</div>';
      else await vDatos(p[1] ? decodeURIComponent(p[1]) : '');
    } else location.hash = '#/inicio';
  } catch (e) {
    console.error(e);
    desbloquear();
    app().innerHTML = '<div class="vista"><div class="alert bad">' + ICON.alerta + '<div><b>No se pudo cargar.</b> ' + esc(e.message) + '</div></div><button class="btn" onclick="render()">' + ICON.refrescar + 'Reintentar</button></div>';
  }
  refrescarAyuda();
  ocultarSplash();
}

function ocultarSplash() {
  const s = $('#splash');
  if (!s || s.dataset.saliendo) return;
  s.dataset.saliendo = '1';
  const espera = Math.max(0, 2300 - performance.now());
  setTimeout(() => { s.classList.add('fuera'); setTimeout(() => s.remove(), 700); }, espera);
}

function periodoLiq(k) {
  const d = aFecha(hoy());
  const y = d.getFullYear();
  const m = d.getMonth();
  const fin = (yy, mm) => iso(new Date(yy, mm + 1, 0));
  if (k === 'q1') return d.getDate() <= 15 ? [iso(new Date(y, m, 1)), iso(new Date(y, m, 15))] : [iso(new Date(y, m, 16)), fin(y, m)];
  if (k === 'q0') return d.getDate() <= 15 ? [iso(new Date(y, m - 1, 16)), fin(y, m - 1)] : [iso(new Date(y, m, 1)), iso(new Date(y, m, 15))];
  if (k === 'm1') return [iso(new Date(y, m, 1)), fin(y, m)];
  if (k === 'm0') return [iso(new Date(y, m - 1, 1)), fin(y, m - 1)];
  return [S.liqD || hoy(), S.liqH || hoy()];
}

async function vLiquidacion() {
  const ok = vivo();
  await cargarResumen();
  if (!ok()) return;
  const k = lsGet('tierra_liq_per', 'q1');
  const per = periodoLiq(k);
  S.liqD = per[0];
  S.liqH = per[1];
  const modo = lsGet('tierra_liq_modo', 'chofer');
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Liquidación</div><h1>Viajes a pagar</h1><p class="sub">Resumen por chofer o por camión para liquidar fletes, según las columnas PAGAR? y ¿JORNADA COMPLETA? de la planilla original.</p></div></div>' +
    '<div class="bar"><div id="segPer"></div><label class="f">Desde<input type="date" id="lD" value="' + per[0] + '"></label><label class="f">Hasta<input type="date" id="lH" value="' + per[1] + '"></label><button class="btn" id="lAp">Aplicar</button>' +
    '<div class="row right"><div id="segModo"></div><button class="btn" id="lCsv">' + ICON.descargar + 'CSV</button><button class="btn icon" onclick="window.print()">' + ICON.imprimir + '</button></div></div><div id="liqC"><div class="card"><div class="skel" style="height:260px"></div></div></div></div>';
  segmento($('#segPer'), [['q1', 'Quincena actual'], ['q0', 'Quincena anterior'], ['m1', 'Mes actual'], ['m0', 'Mes anterior']], k, x => { lsSet('tierra_liq_per', x); vLiquidacion(); }, true);
  segmento($('#segModo'), [['chofer', 'Por chofer'], ['dominio', 'Por camión']], modo, x => { lsSet('tierra_liq_modo', x); pintarLiq(x); }, true);
  $('#lAp').onclick = () => { S.liqD = $('#lD').value; S.liqH = $('#lH').value; lsSet('tierra_liq_per', 'custom'); cargarLiq(lsGet('tierra_liq_modo', 'chofer')); };
  await cargarLiq(modo, ok);
}

async function cargarLiq(modo, ok) {
  const sigue = ok || vivo();
  const r = await api('liquidacion', { desde: S.liqD, hasta: S.liqH });
  if (!sigue() || !$('#liqC')) return;
  S.liq = r.viajes;
  pintarLiq(modo);
}

function pintarLiq(modo) {
  const V = S.liq || [];
  const tar = tarifas();
  const hayTar = Object.keys(tar).length > 0;
  const g = agrupar(V, v => modo === 'dominio' ? v.dominio : v.chofer);
  const filas = Object.keys(g).map(n => {
    const vs = g[n];
    const dias = agrupar(vs, v => v.fecha);
    const pagar = vs.filter(v => v.pagar);
    const orig = agrupar(pagar, v => v.origen);
    const otros = Array.from(new Set(vs.map(v => modo === 'dominio' ? v.chofer : v.dominio)));
    return {
      n: n, viajes: vs.length, pagar: pagar.length, noPagar: vs.length - pagar.length, dias: Object.keys(dias).length,
      completas: Object.keys(dias).filter(f => dias[f].every(v => v.jornadaCompleta)).length,
      medias: Object.keys(dias).filter(f => dias[f].some(v => !v.jornadaCompleta)).length,
      origenes: Object.keys(orig).map(o => o + ' (' + orig[o].length + ')').join(', '), otros: otros.join(', '),
      importe: sum(pagar, v => tar[String(v.origen).toUpperCase()] || 0), det: dias
    };
  }).sort((a, b) => b.pagar - a.pagar);
  const maxP = Math.max.apply(null, filas.map(f => f.pagar).concat([1]));
  const tot = { viajes: sum(filas, f => f.viajes), pagar: sum(filas, f => f.pagar), importe: sum(filas, f => f.importe) };
  const cols = hayTar ? 10 : 9;
  $('#liqC').innerHTML = '<div class="kpis stagger">' + kpi('Viajes', vn(tot.viajes), fMedia(S.liqD) + ' al ' + fMedia(S.liqH)) + kpi('A pagar', vn(tot.pagar), nf(tot.viajes - tot.pagar) + ' marcados NO', 'kacc') +
    kpi(modo === 'dominio' ? 'Camiones' : 'Choferes', vn(filas.length)) +
    (hayTar ? kpi('Importe estimado', '$ ' + vn(tot.importe), 'según TARIFAS_VIAJE', 'ok') : kpi('Importe', '–', 'Configurá TARIFAS_VIAJE en Parámetros', '', 'Tarifa por viaje según el origen, por ejemplo CANTERA CHAÑAR=15000; EXCAVACIÓN BOULEVARD=9000')) + '</div>' +
    '<div class="card mt"><div class="card-h"><div class="t"><h3>' + (modo === 'dominio' ? 'Por camión' : 'Por chofer') + '</h3><div class="sub">Tocá una fila para ver el detalle por día (verde: jornada completa; ámbar: media jornada)</div></div></div>' +
    (filas.length ? '<div class="tw"><table><thead><tr><th>' + (modo === 'dominio' ? 'Dominio' : 'Chofer') + '</th><th class="n">A pagar</th><th></th><th class="n">No pagar</th><th class="n">Días</th><th class="n">Completas</th><th class="n">Medias</th><th>Orígenes</th><th>' + (modo === 'dominio' ? 'Choferes' : 'Camiones') + '</th>' + (hayTar ? '<th class="n">Importe</th>' : '') + '</tr></thead><tbody>' +
      filas.map((f, i) => '<tr class="click liq-chofer" data-i="' + i + '"><td><b>' + esc(f.n) + '</b></td><td class="n"><b>' + f.pagar + '</b></td><td><div class="barra-h"><span style="width:0" data-w="' + (f.pagar / maxP * 100) + '"></span></div></td><td class="n">' + (f.noPagar || '') + '</td><td class="n">' + f.dias + '</td><td class="n">' + f.completas + '</td><td class="n">' + (f.medias || '') + '</td><td>' + esc(f.origenes) + '</td><td class="muted">' + esc(f.otros) + '</td>' + (hayTar ? '<td class="n">$ ' + nf(f.importe) + '</td>' : '') + '</tr>' +
        '<tr class="liq-det hide" data-d="' + i + '"><td colspan="' + cols + '"><div class="row" style="gap:6px">' + Object.keys(f.det).sort().map(d => '<span class="tag ' + (f.det[d].every(v => v.jornadaCompleta) ? 't-ok' : 't-warn') + '">' + fCorta(d) + ' · ' + f.det[d].length + ' v' + (f.det[d].some(v => !v.pagar) ? ' (' + f.det[d].filter(v => !v.pagar).length + ' no)' : '') + '</span>').join('') + '</div></td></tr>').join('') +
      '</tbody><tfoot><tr><th>Total</th><th class="n">' + tot.pagar + '</th><th></th><th class="n">' + (tot.viajes - tot.pagar) + '</th><th colspan="5"></th>' + (hayTar ? '<th class="n">$ ' + nf(tot.importe) + '</th>' : '') + '</tr></tfoot></table></div>' : vacio('Sin viajes en el período.')) + '</div>';
  stagger($('#liqC'));
  contar($('#liqC'));
  requestAnimationFrame(() => $$('#liqC .barra-h span').forEach(s => { s.style.width = s.dataset.w + '%'; }));
  $$('#liqC .liq-chofer').forEach(tr => { tr.onclick = () => $('#liqC [data-d="' + tr.dataset.i + '"]').classList.toggle('hide'); });
  $('#lCsv').onclick = () => csv('liquidacion_' + S.liqD + '_' + S.liqH, [['fecha', 'Fecha'], ['comprobante', 'Comprobante'], ['nroViaje', 'N viaje'], ['chofer', 'Chofer'], ['dominio', 'Dominio'], ['origen', 'Origen'], ['destino', 'Destino'], ['horaCarga', 'Hora carga'], ['horaDescarga', 'Hora descarga'],
    [v => v.pagar ? 'SI' : 'NO', 'Pagar'], [v => v.jornadaCompleta ? 'SI' : 'NO', 'Jornada completa'], [v => v.pagar ? (tar[String(v.origen).toUpperCase()] || '') : '', 'Tarifa']], V);
}

const TIPS_CFG = {
  nombre: 'Nombre que se muestra en la app y en los correos.',
  email: 'Dirección de correo del destinatario.',
  tipo: 'PARA: destinatario principal · CC: con copia · CCO: con copia oculta.',
  activo: 'Si está apagado no se usa ni recibe nada.',
  rJornada: 'Trabajos de cantera: se envía cada vez que se guarda la jornada (tramos, horómetros, paladas, camiones y paradas).',
  rViajes: 'Viajes de camiones: viajes del día por chofer y cruce con la balanza.',
  rBalanza: 'Balanza de ingreso: se envía al importar el PESAJE.XLS (toneladas, m³, camiones y cruce con viajes).',
  rGasoil: 'Gasoil de cantera: cargas del día, nivel de la cisterna y autonomía.',
  rCalidad: 'Calidad de tierra: muestras cargadas y rechazos.',
  rMolienda: 'Molienda y silo: se envía al corregir un turno de molienda.',
  rCubicacion: 'Ajuste de stock: se envía cuando se registra o autoriza un ajuste de playa o silo.',
  rDiario: 'Resumen diario de tierra: todos los días a la hora configurada (playa, molienda, ingreso y silo). Solo si los datos están controlados.',
  rPlaya: 'Estado de la playa de molienda: todos los días, con la variación de 7 días y la proyección con el pronóstico.',
  rSemanal: 'Informe semanal: playa y molienda de los últimos 7 días.',
  rMensual: 'Informe mensual: playa y molienda del mes anterior.',
  rChoferes: 'Desempeño de camioneros, semanal y mensual: ranking, viajes, toneladas, tickets y malas prácticas.',
  rAlertas: 'Advertencias: informes retenidos por datos incompletos y ajustes que esperan autorización.',
  rol: 'Administrador: todo · Abastecimiento: cantera, gasoil, viajes, balanza y calidad enviada · Molienda: molienda, silo, acopios, calidad recibida y ajustes de stock.',
  pin: 'Escribí un PIN nuevo de 4 a 8 números para cambiarlo; vacío lo deja como está.',
  paladas: 'Paladas que carga ese camión por viaje. Se usa para estimar m³ y toneladas enviadas y para completar el ingreso cuando falta la balanza.',
  dominio: 'Patente del camión, igual que en la balanza.',
  valor: 'Valor del parámetro.',
  automatico: 'Si está encendido, el informe se envía solo cuando corresponde.',
  pdf: 'Agrega el informe como PDF adjunto.'
};

const DEF_CONFIG = {
  Maquinas: { t: 'Máquinas', c: [['nombre', 'Nombre'], ['tipo', 'Tipo', 'sel', ['Pala', 'Topadora', 'Excavadora', 'Motoniveladora', 'Otro']], ['activo', 'Activa', 'bool']] },
  Operadores: { t: 'Operadores', c: [['nombre', 'Nombre'], ['pala', 'Pala', 'bool'], ['topadora', 'Topadora', 'bool'], ['mecanico', 'Mecánico', 'bool'], ['activo', 'Activo', 'bool']] },
  CausasParada: { t: 'Causas de parada', c: [['nombre', 'Nombre'], ['activo', 'Activa', 'bool']] },
  Choferes: { t: 'Choferes', c: [['nombre', 'Nombre'], ['activo', 'Activo', 'bool']], orig: 'CHOFER' },
  Dominios: { t: 'Dominios', c: [['nombre', 'Dominio'], ['activo', 'Activo', 'bool']], orig: 'DOMINIO' },
  Lugares: { t: 'Orígenes y destinos', c: [['nombre', 'Nombre'], ['activo', 'Activo', 'bool']], orig: 'ORIGEN-DESTINO' },
  TiposViaje: { t: 'Tipos de viaje', c: [['nombre', 'Nombre'], ['activo', 'Activo', 'bool']], orig: 'TIPO VIAJE' },
  Responsables: { t: 'Responsables', c: [['nombre', 'Nombre'], ['activo', 'Activo', 'bool']], orig: 'RESPONSABLE' },
  Usuarios: { t: 'Usuarios', c: [['nombre', 'Usuario'], ['rol', 'Rol', 'sel', ['abastecimiento', 'molienda', 'admin'], ROL_TXT], ['activo', 'Activo', 'bool'], ['pin', 'Nuevo PIN', 'pin']] },
  Camiones: { t: 'Camiones', c: [['dominio', 'Dominio'], ['paladas', 'Paladas por viaje'], ['observaciones', 'Observaciones'], ['activo', 'Activo', 'bool']] },
  Correos: { t: 'Correos', grupos: [['Destinatario', 4], ['Al cargar datos', 7], ['Programados', 5], ['Avisos', 1]], c: [['nombre', 'Nombre'], ['email', 'Email'], ['tipo', 'Tipo', 'sel', ['PARA', 'CC', 'CCO']], ['activo', 'Activo', 'bool'], ['rJornada', 'Cantera', 'bool'], ['rViajes', 'Viajes', 'bool'], ['rBalanza', 'Balanza', 'bool'],
    ['rGasoil', 'Gasoil', 'bool'], ['rCalidad', 'Calidad', 'bool'], ['rMolienda', 'Molienda', 'bool'], ['rCubicacion', 'Ajuste de stock', 'bool'], ['rDiario', 'Resumen diario', 'bool'], ['rPlaya', 'Estado de playa', 'bool'], ['rSemanal', 'Semanal', 'bool'], ['rMensual', 'Mensual', 'bool'], ['rChoferes', 'Camioneros', 'bool'], ['rAlertas', 'Advertencias', 'bool']] },
  Informes: { t: 'Informes', c: [['nombre', 'Informe', 'ro'], ['automatico', 'Envío automático', 'bool'], ['pdf', 'Adjuntar PDF', 'bool'], ['descripcion', 'Qué contiene', 'ro']], fijo: true },
  Parametros: { t: 'Parámetros', c: [['clave', 'Clave', 'ro'], ['valor', 'Valor'], ['descripcion', 'Descripción', 'ro']], fijo: true }
};

function segConfig(hoja) {
  segmento($('#segCfg'), Object.keys(DEF_CONFIG).map(k => [k, DEF_CONFIG[k].t]).concat([['Datos', '🗄️ Bases de datos']]), hoja, k => { location.hash = k === 'Datos' ? '#/datos' : '#/config/' + k; }, true);
}

async function vConfig(hoja) {
  if (!DEF_CONFIG[hoja]) hoja = 'Maquinas';
  const ok = vivo();
  if (!S.cfg) S.cfg = await api('leerConfig');
  if (!ok()) return;
  const def = DEF_CONFIG[hoja];
  const filas = (S.cfg[hoja] || []).map(x => Object.assign({}, x));
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Configuración</div><h1>Catálogos y parámetros</h1></div><button class="btn" id="bIA">' + ICON.camara + 'Probar IA de fotos</button></div><div id="segCfg" style="margin-bottom:16px"></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>' + def.t + ' <span class="sub">(' + filas.length + ')</span></h3>' + (def.orig ? '<div class="sub">Se guarda en la planilla original de viajes, hoja «' + def.orig + '»</div>' : '') + '</div><div class="row"><input id="cfgBus" placeholder="Buscar…" style="width:180px">' +
    (def.fijo ? '' : '<button class="btn" id="cfgAdd">+ Agregar</button>') + '<button class="btn pri" id="cfgSave">' + ICON.guardar + 'Guardar cambios</button></div></div>' +
    (hoja === 'Correos' ? '<p class="sub" style="margin:-4px 0 10px">Marcá qué recibe cada persona. Pasá el mouse por cada título para ver qué se envía.</p>' : '') +
    (hoja === 'Camiones' ? '<div class="row" style="margin:-4px 0 10px"><button class="btn sm" id="cfgSug">' + ICON.balanza + 'Agregar los camiones de la balanza con las paladas sugeridas</button><span class="sub">Sugerido = neto habitual del camión ÷ ' + nf(num(par('T_POR_PALADA_CANTERA', 4.5)) || 4.5, 1) + ' t por palada</span></div>' : '') +
    (hoja === 'Informes' ? '<div id="infCards" class="inf-cards"></div>' : hoja === 'Correos' ? '<div id="corCards" class="cor-cards"></div>' : '<div class="tw max" style="max-height:62vh"><table class="edit ' + (hoja === 'Correos' ? 'matriz' : '') + '"><thead>' +
      (def.grupos ? '<tr class="grp">' + def.grupos.map(g => '<th colspan="' + g[1] + '">' + g[0] + '</th>').join('') + (def.fijo ? '' : '<th></th>') + '</tr>' : '') +
      '<tr>' + def.c.map(c => { const tip = TIPS_CFG[c[0]] || ''; return '<th' + (tip ? ' title="' + esc(tip) + '" class="con-tip"' : '') + '>' + c[1] + (tip ? ' <span class="qi">?</span>' : '') + '</th>'; }).join('') + (def.fijo ? '' : '<th></th>') + '</tr></thead><tbody id="cfgB"></tbody></table></div>') + '</div></div>';
  $('#bIA').onclick = probarIAUI;
  if ($('#cfgSug')) $('#cfgSug').onclick = async () => {
    try {
      const l = await api('camiones');
      let n = 0;
      l.forEach(x => { if (!filas.some(f => normDominio(f.dominio) === normDominio(x.dominio))) { filas.push({ dominio: x.dominio, paladas: x.sugerido || x.paladas, observaciones: x.sugerido ? 'sugerido: neto habitual ' + nf(x.netoMediano, 1) + ' t (' + x.pesajes + ' pesajes)' : '', activo: true }); n++; } });
      toast(n ? n + ' camiones agregados: revisá y guardá' : 'No hay camiones nuevos en la balanza', n ? 'ok' : 'info');
      pintar();
    } catch (e) { toast(e.message, 'bad'); }
  };
  segConfig(hoja);
  const celda = (c, v, i) => {
    const a = 'data-i="' + i + '" data-c="' + c[0] + '"';
    if (c[2] === 'bool') return '<label class="switch"><input type="checkbox" ' + a + (v ? ' checked' : '') + '><span></span></label>';
    if (c[2] === 'sel' && c[4]) return '<select ' + a + '>' + c[3].map(o => '<option value="' + o + '"' + (rolN(v) === o ? ' selected' : '') + '>' + esc(c[4][o] || o) + '</option>').join('') + '</select>';
    if (c[2] === 'sel') return '<select ' + a + '>' + opts(c[3], v || '', '') + '</select>';
    if (c[2] === 'pin') return '<input type="password" inputmode="numeric" maxlength="8" placeholder="sin cambio" ' + a + '>';
    if (c[2] === 'ro') return c[0] === 'descripcion' ? '<span class="sub">' + esc(v) + '</span>' : c[0] === 'clave' ? '<code>' + esc(v) + '</code>' : '<b>' + esc(v) + '</b>';
    return '<input ' + a + ' value="' + esc(v) + '">';
  };
  const pintar = () => {
    if (hoja === 'Informes') return pintarInformesCfg(filas);
    if (hoja === 'Correos') return pintarCorreosCfg(filas, def, pintar);
    const q = normTxt($('#cfgBus').value);
    $('#cfgB').innerHTML = filas.map((f, i) => (q && normTxt(JSON.stringify(f)).indexOf(q) < 0) ? '' : '<tr>' + def.c.map(c => '<td' + (c[0] === 'descripcion' ? ' class="wrap"' : '') + '>' + celda(c, f[c[0]], i) + '</td>').join('') +
      (def.fijo ? '' : '<td><button class="btn icon sm dan" data-x="' + i + '">' + ICON.borrar + '</button></td>') + '</tr>').join('');
  };
  pintar();
  $('#cfgBus').oninput = pintar;
  const upd = e => { const el = e.target; if (el.dataset.c) filas[Number(el.dataset.i)][el.dataset.c] = el.type === 'checkbox' ? el.checked : el.value; };
  if ($('#cfgB')) $('#cfgB').addEventListener('input', upd);
  if ($('#cfgB')) $('#cfgB').addEventListener('change', upd);
  if ($('#cfgB')) $('#cfgB').addEventListener('click', e => { const b = e.target.closest('button[data-x]'); if (b) { filas.splice(Number(b.dataset.x), 1); pintar(); } });
  if ($('#cfgAdd')) $('#cfgAdd').onclick = () => {
    const o = {};
    def.c.forEach(c => { o[c[0]] = c[2] === 'bool' ? (hoja !== 'Correos' || c[0] === 'activo') : (c[2] === 'sel' ? c[3][0] : ''); });
    filas.unshift(o);
    $('#cfgBus').value = '';
    pintar();
    const p = $('#cfgB input') || $('#corCards input');
    if (p) p.focus();
  };
  $('#cfgSave').onclick = async () => {
    bloquear('Guardando ' + def.t + '…');
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
      desbloquear();
    }
  };
}

function pintarCorreosCfg(filas, def, repintar) {
  const q = normTxt($('#cfgBus').value);
  let k = 0;
  const grupos = def.grupos.slice(1).map(g => { const cols = def.c.slice(4 + k, 4 + k + g[1]); k += g[1]; return [g[0], cols]; });
  $('#corCards').innerHTML = filas.map((f, i) => (q && normTxt(JSON.stringify(f)).indexOf(q) < 0) ? '' : '<div class="cor-card' + (f.activo ? '' : ' off') + '"><div class="cor-h">' +
    '<input data-i="' + i + '" data-c="nombre" value="' + esc(f.nombre) + '" placeholder="Nombre" title="' + esc(TIPS_CFG.nombre) + '"><input data-i="' + i + '" data-c="email" value="' + esc(f.email) + '" placeholder="correo@empresa.com" title="' + esc(TIPS_CFG.email) + '" class="em">' +
    '<select data-i="' + i + '" data-c="tipo" title="' + esc(TIPS_CFG.tipo) + '">' + ['PARA', 'CC', 'CCO'].map(o => '<option' + (f.tipo === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select>' +
    '<label class="chk" title="' + esc(TIPS_CFG.activo) + '"><span class="switch"><input type="checkbox" data-i="' + i + '" data-c="activo"' + (f.activo ? ' checked' : '') + '><span></span></span>Activo</label><button class="btn icon sm dan" data-x="' + i + '" aria-label="Quitar">' + ICON.borrar + '</button></div>' +
    grupos.map(g => '<div class="cor-g"><span class="eyebrow">' + esc(g[0]) + '</span><div class="cor-chips">' + g[1].map(c => '<label class="cor-chip' + (f[c[0]] ? ' on' : '') + '" title="' + esc(TIPS_CFG[c[0]] || '') + '"><input type="checkbox" data-i="' + i + '" data-c="' + c[0] + '"' + (f[c[0]] ? ' checked' : '') + '>' + esc(c[1]) + '</label>').join('') + '</div></div>').join('') + '</div>').join('');
  const cc = $('#corCards');
  const upd = e => { const el = e.target; if (!el.dataset.c) return; filas[Number(el.dataset.i)][el.dataset.c] = el.type === 'checkbox' ? el.checked : el.value; if (el.type === 'checkbox') { const l = el.closest('.cor-chip'); if (l) l.classList.toggle('on', el.checked); if (el.dataset.c === 'activo') el.closest('.cor-card').classList.toggle('off', !el.checked); } };
  cc.oninput = upd;
  cc.onchange = upd;
  cc.onclick = e => { const b = e.target.closest('button[data-x]'); if (b) { filas.splice(Number(b.dataset.x), 1); repintar(); } };
}

const PERIODO_INF = { semanal: 'semana', choferesSemanal: 'semana', mensual: 'mes', choferesMensual: 'mes' };
const DIAS_SEM = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos'];

function pintarInformesCfg(filas) {
  const ayer = addDias(hoy(), -1);
  $('#infCards').innerHTML = filas.map((f, i) => '<div class="inf-card"><div class="row" style="justify-content:space-between;align-items:flex-start;gap:12px"><div><h4>' + esc(f.nombre) + '</h4><p class="sub">' + esc(f.descripcion) + '</p></div>' +
    '<button class="btn sm" data-prev="' + esc(f.clave) + '">' + ICON.correo + 'Vista previa</button></div><div class="row" style="gap:18px;margin-top:8px">' +
    '<label class="chk" title="' + esc(TIPS_CFG.automatico) + '"><span class="switch"><input type="checkbox" data-i="' + i + '" data-c="automatico"' + (f.automatico ? ' checked' : '') + '><span></span></span>Envío automático</label>' +
    '<label class="chk" title="' + esc(TIPS_CFG.pdf) + '"><span class="switch"><input type="checkbox" data-i="' + i + '" data-c="pdf"' + (f.pdf ? ' checked' : '') + '><span></span></span>Adjuntar PDF</label>' +
    (PERIODO_INF[f.clave] === 'semana' ? '<label class="chk inf-dia">📅 Se envía los <select data-i="' + i + '" data-c="dia">' + DIAS_SEM.map((d, k) => k ? '<option value="' + k + '"' + (Number(f.dia || par('INFORME_SEMANAL_DIA', 1)) === k ? ' selected' : '') + '>' + d + '</option>' : '').join('') + '</select> con los 7 días anteriores</label>' : '') +
    (PERIODO_INF[f.clave] === 'mes' ? '<span class="tag t-info inf-dia">📅 Se envía el ' + (num(par('INFORME_MENSUAL_HABIL', 2)) || 2) + '.º día hábil de cada mes (lunes a viernes sin feriados) con el mes anterior completo</span>' : '') + '</div></div>').join('');
  $('#infCards').onchange = e => { const el = e.target; if (el.dataset.c) filas[Number(el.dataset.i)][el.dataset.c] = el.dataset.c === 'dia' ? Number(el.value) : el.checked; };
  $('#infCards').onclick = e => { const b = e.target.closest('[data-prev]'); if (b) abrirInforme(b.dataset.prev, { fecha: PERIODO_INF[b.dataset.prev] === 'mes' ? addDias(hoy().slice(0, 8) + '01', -1) : ayer }); };
}

async function probarIAUI() {
  bloquear('Probando la IA con los modelos disponibles…');
  let r;
  try { r = await api('diagnosticoIA'); } catch (e) { desbloquear(); return toast(e.message, 'bad', 9000); }
  desbloquear();
  modal(r.ok ? 'La IA de fotos funciona' : 'La IA de fotos no funciona', '<div class="alert ' + (r.ok ? 'ok' : 'bad') + '">' + (r.ok ? ICON.ok : ICON.alerta) + '<div>' + esc(r.mensaje) + '</div></div>' +
    (r.fallidos && r.fallidos.length ? '<p class="sub">Modelos que fallaron antes: ' + esc(r.fallidos.join(' | ')) + '</p>' : '') +
    (r.disponibles && r.disponibles.length ? '<p class="sub">Modelos disponibles para la clave: ' + esc(r.disponibles.join(', ')) + '</p>' : '') +
    (r.errorLista ? '<p class="sub">No se pudo listar modelos: ' + esc(r.errorLista) + '</p>' : '') +
    (r.ok ? '' : '<p class="sub">Revisá en Apps Script → Configuración del proyecto → Propiedades del script que exista GEMINI_API_KEY (creada en aistudio.google.com/apikey, sin restricciones de sitio web) y que la implementación sea una versión nueva.</p>'), [{ txt: 'Cerrar' }]);
}

function iniciar() {
  aplicarTema(lsGet('tierra_tema', ''));
  iniciarTips();
  iniciarAyuda();
  iniciarClima();
  $('#btnTema').onclick = cambiarTema;
  const s = lsGet('tierra_ses', null);
  if (s && s.vence > Date.now()) S.ses = s;
  S.cola = lsGet('tierra_cola', []);
  const r = lsGet('tierra_rango', null);
  if (r && r.preset === 'custom') { S.preset = 'custom'; S.desde = r.desde; S.hasta = r.hasta; } else aplicarPreset(r ? r.preset : '30');
  $('#btnSesion').onclick = menuSesion;
  $('#cola').onclick = verCola;
  const red = () => {
    $('#red').classList.toggle('off', !navigator.onLine);
    $('#red span').textContent = navigator.onLine ? 'En línea' : 'Sin conexión';
    if (navigator.onLine) procesarCola();
  };
  addEventListener('online', red);
  addEventListener('offline', red);
  addEventListener('hashchange', () => {
    if (S.ed && S.ed.sucio && !location.hash.startsWith('#/cargar/jornada/' + S.ed.fecha)) { toast('El borrador de la jornada quedó guardado en este equipo', 'info'); S.ed.sucio = false; }
    render();
  });
  let t = 0;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { pintarNav(); dibujarFlujo(); }, 120); });
  addEventListener('beforeunload', e => { if (S.ed && S.ed.sucio && location.hash.indexOf('#/cargar/jornada') === 0) { e.preventDefault(); e.returnValue = ''; } });
  if (typeof Chart !== 'undefined') { Chart.defaults.font.family = cssVar('--font'); Chart.defaults.color = cssVar('--muted'); }
  pintarSesion();
  pintarCola();
  red();
  if (location.hash.replace(/^#\/?/, '').split('/')[0] !== 'inicio') history.replaceState(null, '', '#/inicio');
  render();
  setTimeout(listaUsuarios, 1500);
  setInterval(() => { if (S.ses && S.ses.vence < Date.now()) { setSesion(null); toast('La sesión venció', 'warn'); } }, 60000);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(e => console.warn(e));
}

iniciar();
