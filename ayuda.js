'use strict';

const AYUDA_SECTOR = { abastecimiento: 'Lo carga el responsable de abastecimiento', molienda: 'Lo carga el responsable de molienda' };

const AYUDA = {
  inicio: {
    t: 'Inicio', que: 'Muestra el recorrido de la tierra: lo que se carga en cantera, lo que entra por balanza, lo que queda en la playa, lo que se muele y lo que hay en el silo.',
    pasos: ['Tocá una etapa del recorrido para ver su análisis.', '«Para revisar» junta los controles cruzados con observaciones de los últimos 14 días.', '«Estado de la carga» muestra qué fuente está atrasada (verde al día, amarillo atrasada, rojo sin datos).'],
    fuentes: true,
    calc: [['Abastecimiento', 'cantera, gasoil, viajes y balanza de ingreso. Lo carga el responsable de abastecimiento.'], ['Molienda', 'playa, molienda, silo y ajustes de stock. Lo carga el responsable de molienda.'], ['Playa', 'stock inicial o última cubicación + ingresos de balanza (sin rechazados) − consumo de molienda.'], ['Silo', 'lo que pasó por la balanza dinámica − paladas extraídas × factor del silo.']],
    controles: '*'
  },
  'tablero/balance': {
    t: 'Balance de tierra', que: 'Cuánta tierra entró, cuánta se consumió y cuánta queda en playa y silo, día por día.',
    pasos: ['Elegí el período arriba.', 'Tocá una barra para abrir el parte de ese día.', 'Compará los ajustes de stock con lo calculado en la tabla de ajustes.'],
    controles: ['m_inventario', 'm_cubicacion', 'm_stock', 'm_cobertura', 'm_estimados']
  },
  'tablero/controles': {
    t: 'Controles cruzados', que: 'La app compara datos que vienen de fuentes distintas (palas, viajes, balanza, gasoil, molienda, ajustes de stock) para encontrar errores de carga, faltantes o desvíos.',
    pasos: ['Cada sector tiene su lista: abastecimiento arriba a la izquierda, molienda a la derecha.', 'Tocá un control para ver qué compara y la lista de registros a revisar.', '«Ir a revisar» te lleva a la pantalla donde se corrige.'],
    calc: [['Rojo', 'problema que cambia los números (stock imposible, horómetro mal, rechazos).'], ['Amarillo', 'diferencia a explicar (viajes sin ticket, tara distinta, factor fuera de rango).'], ['Azul', 'aviso o dato faltante para poder controlar.'], ['Verde', 'el control pasa.']],
    controles: '*'
  },
  'tablero/viajes': {
    t: 'Viajes y balanza', que: 'Cruza los camiones que declaran las palas, los comprobantes de viaje y los tickets de la balanza de ingreso.',
    pasos: ['Revisá «Viajes sin ticket» y «Tickets sin viaje»: cada uno debería tener su par.', 'La tabla de choferes muestra viajes, toneladas y ciclo de cada uno.'],
    controles: ['a_sin_ticket', 'a_sin_viaje', 'a_tara', 'a_doble', 'a_superpuestos', 'a_palas', 'a_atipicos']
  },
  'tablero/cantera': {
    t: 'Cantera', que: 'Producción de las palas y topadoras: horas, camiones cargados, paladas y paradas.',
    controles: ['a_carga', 'a_horometros', 'a_palas']
  },
  'tablero/calidad': {
    t: 'Calidad de la tierra', que: 'Resultados de la inspección visual y del ensayo casero de arcilla, limo y arena por viaje.',
    controles: ['a_calidad']
  },
  'tablero/combustible': {
    t: 'Gasoil de cantera', que: 'Nivel de la cisterna, cargas a cada máquina y consumo por hora, por camión y por tonelada.',
    controles: ['g_cisterna', 'g_lh', 'g_horometro', 'g_medicion']
  },
  calendario: {
    t: 'Calendario', que: 'Un cuadro por día. El color muestra qué pasó en la cantera y la barrita de abajo la métrica elegida.',
    calc: [['Verde', 'producción'], ['Rojo', 'parada por avería o mantenimiento'], ['Azul', 'clima'], ['Ámbar', 'falta de operario'], ['Degradado', 'día con varios tipos de tramo, repartido según las horas de cada uno']]
  },
  dia: {
    t: 'Parte del día', que: 'Todo lo que pasó en un día: tramos de las máquinas, viajes, pesajes, molienda y calidad.',
    pasos: ['La línea de tiempo muestra máquinas y viajes; los viajes rayados no tienen ticket de balanza.', '«Enviar parte» manda el resumen con PDF a los correos configurados.']
  },
  cargar: {
    t: 'Cargar datos', que: 'Cada responsable ve solo los módulos de su sector.',
    fuentes: true,
    calc: [['Abastecimiento', 'jornada de cantera, gasoil, viajes, balanza de ingreso y calidad.'], ['Molienda', 'turnos de molienda y silo y ajustes de stock.'], ['Sin conexión', 'lo que guardes queda en el equipo y se envía solo al volver la señal (ver «pendientes» arriba).']]
  },
  'cargar/jornada': {
    t: 'Jornada de cantera', sector: 'abastecimiento', que: 'Informe de trabajos de cantera: tramos de producción y paradas de cada máquina. Se graba en «Trabajo en Cantera» (hojas ProduccionCantera y MantenimientoCantera), igual que la app anterior.',
    calc: [['Producción', 'operador, horario, horómetro inicial y final (deben coincidir con las horas del tramo), paladas a camión y a acopio, camiones a planta e internos.'], ['Avería o mantenimiento', 'horómetro de la máquina y personal que intervino (mecánicos y operarios).'], ['Ausencia de operario', 'quién faltó.'], ['Condiciones climáticas', 'operario afectado.'], ['Sin operario / Otro', 'solo horario y observaciones.'], ['Camiones', 'en la planilla, UnidadesCargadas guarda el total (a planta + internos) y la columna N, los internos.']],
    pasos: ['Elegí la fecha y agregá una máquina.', 'Cargá horario, operador, horómetro inicial y final.', 'Camiones a planta e internos: lo que informa el palero.', 'Las paladas a camión se calculan solas como (a planta + internos) × ' + 'paladas por camión; si el operador informó otro número, escribilo y queda «manual».', '«Copiar día anterior» trae las máquinas y operadores de ayer.'],
    tips: ['Si el horómetro inicial no coincide con el final anterior, la app sugiere la corrección más probable.', 'Cargá también las paradas: alimentan la disponibilidad y el color del calendario.'],
    controles: ['a_horometros', 'a_palas', 'g_horometro']
  },
  'cargar/gasoil': {
    t: 'Gasoil de cantera', sector: 'abastecimiento', que: 'Cargas de gasoil a las máquinas, llenados de la cisterna y mediciones con varilla. Se graban en la planilla «Trabajo en Cantera».',
    pasos: ['Elegí la máquina, escribí litros y el horómetro que marca en ese momento.', 'Para un llenado de la cisterna elegí «Cisterna» y escribí los litros recibidos.', 'Una vez por semana medí la cisterna con la varilla y cargá la medición: corrige el nivel y muestra la diferencia.'],
    tips: ['El horómetro de la carga debería coincidir con el inicial de la jornada si cargás antes de arrancar.', 'Si los L/h de una carga salen muy altos, revisá litros y horómetro.'],
    controles: ['g_cisterna', 'g_lh', 'g_horometro', 'g_medicion']
  },
  'cargar/viajes': {
    t: 'Viajes de camiones', sector: 'abastecimiento', que: 'Carga rápida de los talonarios: un comprobante puede tener varios viajes con horario y viajes internos de cantera.',
    pasos: ['El número de talonario se propone solo (siguiente de la serie).', 'Escribí parte del chofer; el dominio se completa con el que más usa, pero lo podés cambiar.', 'En cada viaje: origen → destino, hora de carga y descarga (435 = 04:35). Enter avanza.', 'Si hubo viajes internos, activá la casilla y cargá cantidad y paladas por viaje.', 'Enter en una carga vacía o Ctrl+Enter guarda.'],
    tips: ['Si el destino es planta, la columna «Control balanza» busca el ticket del camión: «usar» toma la hora de la balanza.', '«Leer foto del talonario» completa los datos con IA; revisalos antes de guardar.'],
    controles: ['a_sin_ticket', 'a_superpuestos', 'a_ciclos']
  },
  'cargar/pesaje': {
    t: 'Balanza de ingreso', que: 'Importa el PESAJE.XLS exportado del software de la balanza para cruzarlo con los viajes y calcular las toneladas por palada. Lo puede importar el responsable de abastecimiento o el de molienda.',
    pasos: ['Exportá el PESAJE.XLS y soltalo acá: el formato del software se reconoce solo.', 'Se toman los camiones de tierra (material 002) con entrada y salida. Neto = entrada − salida.', 'Los camiones que todavía no salieron se importan en la próxima exportación.', 'Importá: los tickets repetidos se actualizan, no se duplican, y se envía el informe de balanza.'],
    tips: ['Importá al menos una vez por día para que los controles estén al día.', 'Si la tara de un camión cambia mucho, el neto puede estar mal: aparece en Controles.'],
    controles: ['a_sin_viaje', 'a_tara', 'a_doble', 'a_atipicos']
  },
  'cargar/calidad': {
    t: 'Calidad de tierra', sector: 'abastecimiento', que: 'Inspección visual y ensayo casero de cada viaje controlado.',
    pasos: ['Elegí el viaje o el ticket del camión.', 'Marcá defectos (piedras, raíces, tosca, humedad, material extraño).', 'Ensayo en frasco: la arena decanta primero, después el limo y arriba la arcilla; cargá el % de cada capa (suma 100).', 'Decidí: Aceptado, Observado o Rechazado.'],
    tips: ['Inspeccioná al menos 1 de cada 20 viajes.', 'Las toneladas rechazadas no suman al stock de playa (parámetro EXCLUIR_RECHAZADOS).'],
    controles: ['a_calidad']
  },
  'cargar/molienda': {
    t: 'Molienda y silo', sector: 'molienda', que: 'Los datos se leen solos del Informe de Producción (hoja Molienda). Acá solo se corrige un turno.',
    pasos: ['Elegí fecha y turno.', 'Paladas al cajón alimentador, toneladas de la balanza dinámica y paladas extraídas del silo.', 'La carga manual reemplaza al Informe en ese turno; «quitar» vuelve al dato del Informe.'],
    calc: [['Columna D', 'paladas que ingresan a molienda.'], ['Columna G', 'paladas del silo a producción.'], ['Columna J', 'toneladas de la balanza dinámica (molienda → silo).']],
    tips: ['Un factor t/palada muy distinto al habitual indica paladas o balanza mal informadas.', 'Los cambios del Informe se ven en hasta 10 minutos.'],
    controles: ['m_atraso', 'm_factor', 'm_estimados']
  },
  'cargar/ajustes': {
    t: 'Ajuste de stock', sector: 'molienda', que: 'Cargá cuánta tierra hay en la playa o el silo, en toneladas o en m³. La app convierte con la densidad y compara con lo calculado. Hace falta un primer ajuste (stock inicial) para que se vea el stock.',
    guia: [
      ['Cuándo medir', 'Una vez por mes y cada vez que el stock calculado se aleje de lo que se ve. Al cierre de un turno, sin palas trabajando. El ajuste fija el stock al inicio del día.'],
      ['Qué llevar', 'Cinta de 50 m o rueda medidora, regla de 3 m, celular con inclinómetro y un balde de volumen conocido.'],
      ['Pila cónica', 'Perímetro del pie con la cinta a ras del suelo. Si no se puede subir, medí el largo del talud y la app calcula la altura.<span class="formula">r = P / 2π · h = √(talud² − r²) · V = π·r²·h / 3</span>'],
      ['Pila alargada', 'Largo y ancho al pie, largo y ancho de la cresta y altura media. Cresta en filo: ancho 0.<span class="formula">V = h/6 · (A_pie + 4·A_media + A_cresta)</span>'],
      ['Pilas irregulares', 'Dividilas en tramos parecidos a un cono o a una pila alargada y cargá cada tramo como una pila.'],
      ['Densidad aparente', 'Balde lleno sin apretar, enrasado y pesado: (peso − tara) ÷ volumen. Promediá 3 pilas. Con lluvia sube. Alternativa: neto de un camión ÷ volumen de su caja enrasada.'],
      ['Drone o topografía', 'Lo más preciso (±2–3 %). Cargalo como «Volumen medido».'],
      ['Precisión', 'Con cinta y fórmulas el error es de ±10 %: medí siempre con el mismo método y mirá la tendencia.']
    ],
    calc: [['Lo que hay ahora / Stock inicial', 'fijan el stock en ese valor al inicio del día.'], ['Sumar / restar', 'suma o resta toneladas (negativo para restar).'], ['t ↔ m³', 'densidad = t por palada de molienda ÷ m³ del balde (M3_POR_PALADA).'], ['Diferencia', 'medido − calculado. Si se repite en el mismo sentido, revisá el t/palada o los ingresos.'], ['Sin dato', 'si el stock calculado da negativo, la app no lo muestra hasta el próximo ajuste.']],
    controles: ['m_cubicacion', 'm_inventario', 'm_stock']
  },
  acopios: {
    t: 'Acopios de la playa', sector: 'molienda', que: 'Cada sector del plano es un lugar fijo de descarga. En él se arma un acopio con un origen y una calidad; se llena con los camiones que descargan ahí y se vacía con lo que se muele. Cuando se termina se marca como agotado y el sector queda libre para el próximo.',
    pasos: ['Admin: dibujá los sectores en «Dibujar sectores».', 'Armá el acopio del sector con su origen y calidad.', 'En «Descargas» elegí los tickets de balanza (Shift para varios) y asignales el acopio.', 'En «Consumos» indicá desde qué turno se muele cada acopio (y en qué % si se muelen dos a la vez). Las paladas salen del Informe de Producción; si las sabés, cargalas para corregir.', 'Para una mezcla usá «Armar mezcla»: elegí los acopios y las proporciones y la app calcula las paladas de cada uno.', 'Cuando se termina, «Agotado».'],
    calc: [['Stock del acopio', 'cantidad medida al cerrar (si se cargó) o toneladas de los camiones asignados + traslados − paladas consumidas × t por palada.'], ['Calidad', 'la que se carga al armarlo; si no, el promedio de las muestras de calidad de sus camiones. En una mezcla, el promedio ponderado por las proporciones.'], ['Turnos sin acopio', 'turnos de molienda del Informe en los que los consumos asignados no suman 100 %.']]
  },
  liquidacion: { t: 'Liquidación a choferes', sector: 'abastecimiento', que: 'Viajes con «PAGAR = SI» por chofer y período, con la tarifa por origen.', calc: [['Tarifa', 'parámetro TARIFAS_VIAJE (ORIGEN=importe; …).'], ['Media jornada', 'si algún viaje del día tiene «Jornada completa = NO».']] },
  config: {
    t: 'Configuración', que: 'Catálogos, usuarios, correos, informes y parámetros. Solo administradores.',
    fuentes: true,
    calc: [['Correos', 'cada destinatario marca qué informes recibe (cantera, viajes, balanza, gasoil, calidad, molienda, ajuste de stock, resumen diario, estado de playa, semanal, mensual y advertencias) y si va como Para, CC o CCO.'], ['Informes', '«Envío automático» manda el informe solo cada vez que se carga ese dato. El resumen diario sale a la hora INFORME_DIARIO_HORA, el semanal el día INFORME_SEMANAL_DIA y el mensual el día 1.'], ['Datos controlados', 'los informes diario, semanal y mensual solo salen si los datos están completos (stock con ajuste, balanza importada, molienda al día). Si no, quedan retenidos en Inicio y se avisa por mail a los marcados en «Advertencias».'], ['Roles', 'Administrador (todo), Responsable de abastecimiento (cantera, gasoil, viajes, balanza, calidad, liquidación) y Responsable de molienda (molienda, silo, ajustes de stock).'], ['PIN', 'se guarda cifrado; dejá «Nuevo PIN» vacío para conservar el actual. 4 a 8 dígitos.'], ['IA de fotos', 'la clave va en Apps Script → Propiedades del script → GEMINI_API_KEY, nunca en Parámetros.'], ['Catálogos de viajes', 'choferes, dominios, lugares, tipos y responsables se guardan en la planilla original de viajes.']]
  }
};

const FUENTES_DATOS = [
  ['Trabajos de cantera', 'Trabajo en Cantera → ProduccionCantera y MantenimientoCantera', 'Responsable de abastecimiento'],
  ['Gasoil', 'Trabajo en Cantera → CargaCombustibleCantera y Configuracion', 'Responsable de abastecimiento'],
  ['Viajes de camiones', 'Carga de viajes de tierra (respuestas) → Respuestas de formulario 1 (se lee ViajesUnificados)', 'Responsable de abastecimiento'],
  ['Balanza de ingreso', 'PESAJE.XLS del software de la balanza → hoja Pesajes de esta base', 'Abastecimiento (molienda también puede importar)'],
  ['Molienda y silo', 'Informe de Producción CMP → hoja Molienda (D paladas, G paladas de silo, J balanza dinámica)', 'Formulario de turno; correcciones: responsable de molienda'],
  ['Ajustes de stock y calidad', 'Base de Control de Tierra → Ajustes y Calidad', 'Molienda (ajustes) · abastecimiento (calidad)']
];

function claveAyuda() {
  const p = location.hash.replace(/^#\/?/, '').split('/');
  const v = p[0] || 'inicio';
  if (v === 'tablero') return 'tablero/' + (S.ayudaTab || p[1] || 'balance');
  if (v === 'cargar') return p[1] ? 'cargar/' + p[1] : 'cargar';
  if (v === 'config' || v === 'calendario' || v === 'dia' || v === 'liquidacion' || v === 'acopios') return v;
  return 'inicio';
}

function sugerenciasAyuda(def) {
  const out = (S.ayudaSug || []).map(t => ({ sev: 'info', t: t }));
  const lista = S.ultControles || [];
  if (def && def.controles && lista.length) {
    const ids = def.controles === '*' ? null : def.controles;
    lista.filter(c => c.sev !== 'ok' && (!ids || ids.indexOf(c.id) >= 0)).slice(0, 4).forEach(c => out.push({ sev: c.sev, t: c.t, d: c.d, ruta: c.ruta }));
  }
  return out;
}

function htmlAyuda() {
  const k = claveAyuda();
  const def = AYUDA[k] || AYUDA.inicio;
  const sug = sugerenciasAyuda(def);
  const calc = (S.ayudaExtra && k.indexOf('tablero/') === 0 ? S.ayudaExtra : []).concat(def.calc || []);
  const secc = (t, html) => html ? '<section><h4>' + t + '</h4>' + html + '</section>' : '';
  return '<div class="ay-h"><div><div class="eyebrow">Ayuda</div><h3>' + esc(def.t) + '</h3>' + (def.sector ? '<span class="chip-sector ' + def.sector + '">' + AYUDA_SECTOR[def.sector] + '</span>' : '') + '</div><button class="btn icon sm" id="ayCerrar" aria-label="Cerrar ayuda">' + ICON.x + '</button></div>' +
    '<div class="ay-c"><p class="ay-que">' + def.que + '</p>' +
    secc('Ahora conviene revisar', sug.map(x => '<a class="ay-sug ' + x.sev + '"' + (x.ruta ? ' href="' + x.ruta + '"' : '') + '><b>' + esc(x.t) + '</b>' + (x.d ? '<small>' + x.d + '</small>' : '') + '</a>').join('')) +
    secc('De dónde sale cada dato', def.fuentes ? '<dl>' + FUENTES_DATOS.map(x => '<dt>' + x[0] + '</dt><dd>' + x[1] + '<br><small>' + x[2] + '</small></dd>').join('') + '</dl>' : '') +
    secc('Cómo se usa', def.pasos ? '<ol>' + def.pasos.map(x => '<li>' + x + '</li>').join('') + '</ol>' : '') +
    secc('Cómo medir una pila', def.guia ? '<div class="guia-cub">' + def.guia.map((p, i) => '<div class="paso"><b><i>' + (i + 1) + '</i>' + p[0] + '</b><div>' + p[1] + '</div></div>').join('') + '</div>' : '') +
    secc('Cómo se calcula', calc.length ? '<dl>' + calc.map(x => '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>').join('') + '</dl>' : '') +
    secc('Consejos', def.tips ? '<ul>' + def.tips.map(x => '<li>' + x + '</li>').join('') + '</ul>' : '') +
    '</div>';
}

function abrirAyuda() {
  const p = $('#ayuda');
  p.innerHTML = htmlAyuda();
  p.classList.add('on');
  $('#ayudaFondo').classList.add('on');
  $('#btnAyuda').setAttribute('aria-expanded', 'true');
  $('#ayCerrar').onclick = cerrarAyuda;
  $$('.ay-sug[href]', p).forEach(a => a.addEventListener('click', cerrarAyuda));
}

function cerrarAyuda() {
  $('#ayuda').classList.remove('on');
  $('#ayudaFondo').classList.remove('on');
  $('#btnAyuda').setAttribute('aria-expanded', 'false');
}

function refrescarAyuda() {
  const b = $('#btnAyuda');
  if (!b) return;
  const def = AYUDA[claveAyuda()] || AYUDA.inicio;
  const n = sugerenciasAyuda(def).filter(x => x.sev === 'bad' || x.sev === 'warn').length;
  b.classList.toggle('aviso', n > 0);
  b.dataset.tip = n ? 'Ayuda · ' + n + ' cosa' + (n > 1 ? 's' : '') + ' para revisar' : 'Ayuda de esta pantalla';
  if ($('#ayuda').classList.contains('on')) {
    $('#ayuda').innerHTML = htmlAyuda();
    $('#ayCerrar').onclick = cerrarAyuda;
  }
}

function iniciarAyuda() {
  const b = document.createElement('button');
  b.id = 'btnAyuda';
  b.className = 'btn-ayuda';
  b.setAttribute('aria-label', 'Ayuda');
  b.setAttribute('aria-expanded', 'false');
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 4"/><path d="M12 17.4h.01"/></svg><i></i>';
  b.onclick = () => ($('#ayuda').classList.contains('on') ? cerrarAyuda() : abrirAyuda());
  const f = document.createElement('div');
  f.id = 'ayudaFondo';
  f.onclick = cerrarAyuda;
  const p = document.createElement('aside');
  p.id = 'ayuda';
  p.setAttribute('aria-label', 'Ayuda');
  document.body.appendChild(f);
  document.body.appendChild(p);
  document.body.appendChild(b);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && p.classList.contains('on')) cerrarAyuda(); });
  addEventListener('hashchange', () => { S.ayudaSug = null; S.ayudaExtra = null; S.ayudaTab = ''; });
}
