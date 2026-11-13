'use strict';

const DATOS_DESC = {
  Ajustes: 'Ajustes e inicios de stock de playa, silo y molienda', Pesajes: 'Pesajes de la balanza importados', Calidad: 'Controles de calidad por ticket', Acopios: 'Acopios de la playa', Sectores: 'Sectores dibujados en el plano',
  DescargasAcopio: 'Tickets asignados a acopios', MovimientosAcopio: 'Consumos y traslados de acopios', UbicacionesAcopio: 'Fotos y mediciones de acopios', Asociaciones: 'Viajes ↔ pesajes asociados a mano',
  CorreccionesPesaje: 'Correcciones de datos de balanza', Solicitudes: 'Pedidos de autorización', AuditoriaAdmin: 'Registro de cambios hechos desde esta pantalla', Usuarios: 'Usuarios (el PIN no se muestra)',
  Parametros: 'Parámetros de la app', Correos: 'Destinatarios de informes', Informes: 'Configuración de informes', Camiones: 'Camiones y paladas', BalanzaCruda: 'Archivo crudo de PESAJE.XLS', Importaciones: 'Historial de importaciones',
  MedicionesCisterna: 'Mediciones con varilla de la cisterna', Retenidos: 'Informes retenidos'
};

const DATOS_OPC = { Ajustes: { nodo: ['Playa', 'Silo'], tipo: ['Cubicación', 'Stock inicial', 'Corrección'] } };

function valorInput(c, v, hoja) {
  const id = 'dF_' + c;
  const op = (DATOS_OPC[hoja] || {})[c];
  if (op) return '<label class="f">' + esc(c) + '<select id="' + id + '">' + op.concat(op.indexOf(v) < 0 && v ? [v] : []).map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></label>';
  if (typeof v === 'boolean') return '<label class="chk"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + '> ' + esc(c) + '</label>';
  if (/^fecha/.test(c) && (!v || /^\d{4}-\d{2}-\d{2}$/.test(v))) return '<label class="f">' + esc(c) + '<input type="date" id="' + id + '" value="' + esc(v || '') + '"></label>';
  if (typeof v === 'number') return '<label class="f">' + esc(c) + '<input type="number" step="any" id="' + id + '" value="' + v + '"></label>';
  const s = v === null || v === undefined ? '' : String(v);
  return '<label class="f' + (s.length > 60 ? ' full' : '') + '">' + esc(c) + (s.length > 60 ? '<textarea id="' + id + '" rows="3">' + esc(s) + '</textarea>' : '<input id="' + id + '" value="' + esc(s) + '">') + '</label>';
}

function formRegistroAdmin(hoja, cols, fila, alTerminar) {
  const nuevo = !fila;
  const base = fila || {};
  const m = modal((nuevo ? 'Nuevo registro · ' : 'Editar registro · ') + hoja, '<div class="alert warn">' + ICON.alerta + '<div>Los cambios se guardan directo en la base y quedan en «AuditoriaAdmin» con el valor anterior. Usalo solo para corregir errores.</div></div>' +
    '<div class="form">' + cols.filter(c => !(nuevo && (c === 'id' || c === 'ts'))).map(c => valorInput(c, base[c], hoja)).join('') +
    '<label class="f full">Motivo del cambio<input id="dMot" placeholder="Ej: el responsable cargó el mismo valor en playa y molienda"></label></div>', [
    { txt: 'Cancelar' },
    {
      txt: 'Guardar', cls: 'pri', fn: async mm => {
        const mot = $('#dMot', mm).value.trim();
        if (!mot) { toast('Indicá el motivo', 'warn'); return false; }
        const nv = {};
        cols.forEach(c => { const el = $('#dF_' + c, mm); if (!el) return; nv[c] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value; });
        bloquear('Guardando…');
        try {
          await api('adminFila', nuevo ? { hoja: hoja, accion: 'agregar', fila: nv, motivo: mot } : { hoja: hoja, accion: 'editar', i: fila._i, antes: limpiarFila(fila), fila: nv, motivo: mot });
          invalidar();
          toast('Registro guardado', 'ok');
          if (alTerminar) alTerminar();
          return true;
        } catch (e) { toast(e.message, 'bad', 8000); return false; } finally { desbloquear(); }
      }
    }
  ], 'grande');
  return m;
}

function limpiarFila(f) {
  const o = Object.assign({}, f);
  delete o._i;
  return o;
}

async function eliminarRegistroAdmin(hoja, fila, alTerminar) {
  const m = modal('Eliminar registro · ' + hoja, '<p>Se elimina este registro de la base. Queda guardado en «AuditoriaAdmin».</p><pre class="dat-pre">' + esc(JSON.stringify(limpiarFila(fila), null, 1)) + '</pre><label class="f">Motivo<input id="dMot" placeholder="Motivo de la eliminación"></label>', [
    { txt: 'Cancelar' },
    {
      txt: 'Eliminar', cls: 'dan', fn: async mm => {
        const mot = $('#dMot', mm).value.trim();
        if (!mot) { toast('Indicá el motivo', 'warn'); return false; }
        bloquear('Eliminando…');
        try { await api('adminFila', { hoja: hoja, accion: 'eliminar', i: fila._i, antes: limpiarFila(fila), motivo: mot }); invalidar(); toast('Registro eliminado', 'ok'); if (alTerminar) alTerminar(); return true; } catch (e) { toast(e.message, 'bad', 8000); return false; } finally { desbloquear(); }
      }
    }
  ]);
  return m;
}

async function editarPorIdAdmin(hoja, id, alTerminar) {
  bloquear('Abriendo…');
  try {
    const r = await api('adminLeer', { hoja: hoja, q: id, limite: 50 });
    const f = r.filas.find(x => x.id === id);
    if (!f) return toast('No se encontró el registro', 'bad');
    formRegistroAdmin(hoja, r.columnas, f, alTerminar);
  } catch (e) { toast(e.message, 'bad'); } finally { desbloquear(); }
}

async function vDatos(hoja) {
  if (!esAdmin()) { app().innerHTML = '<div class="vista">' + vacio('Solo el administrador puede ver las bases de datos.') + '</div>'; return; }
  const ok = vivo();
  const H = await api('adminHojas');
  if (!ok()) return;
  const sel = hoja && H.hojas.some(x => x.hoja === hoja) ? hoja : '';
  const st = S.datos || (S.datos = { q: '' });
  app().innerHTML = '<div class="vista"><div class="hero"><div><div class="eyebrow">Configuración · administrador</div><h1>Bases de datos</h1><p class="sub">Ver, corregir, agregar o eliminar registros. Cada cambio queda auditado con el valor anterior.</p></div></div><div id="segCfg" style="margin-bottom:16px"></div>' +
    '<div class="card"><div class="card-h"><div class="t"><h3>Planillas de Google</h3><div class="sub">Para revisar o editar directo en la planilla</div></div></div><div class="dat-links"><a class="btn sm" target="_blank" rel="noopener" href="' + esc(H.base) + '">🗄️ Base de la app</a>' +
    H.externas.map(x => '<a class="btn sm" target="_blank" rel="noopener" href="' + esc(x.url) + '">📄 ' + esc(x.nombre) + '</a>').join('') + '</div></div>' +
    '<div class="dat-grid"><div class="card dat-lista"><div class="card-h"><div class="t"><h3>Hojas de la base</h3></div></div>' +
    H.hojas.slice().sort((a, b) => a.hoja.localeCompare(b.hoja)).map(x => '<a class="dat-hoja' + (x.hoja === sel ? ' on' : '') + '" href="#/datos/' + x.hoja + '"><b>' + esc(x.hoja) + '</b><span class="tag t-mut">' + nf(x.filas) + '</span><small>' + esc(DATOS_DESC[x.hoja] || '') + '</small></a>').join('') + '</div>' +
    '<div class="card" id="datCont">' + (sel ? '<div class="skel" style="height:300px"></div>' : vacio('Elegí una hoja de la izquierda.')) + '</div></div></div>';
  if (typeof segConfig === 'function') segConfig('Datos');
  if (!sel) return;
  const cont = $('#datCont');
  const cargar = async () => {
    const r = await api('adminLeer', { hoja: sel, q: st.q, limite: 400 });
    if (!ok()) return;
    const info = H.hojas.find(x => x.hoja === sel);
    const ro = sel === 'AuditoriaAdmin';
    const corto = v => { const s = v === null || v === undefined ? '' : typeof v === 'boolean' ? (v ? '✓' : '') : String(v); return s.length > 40 ? '<span title="' + esc(s) + '">' + esc(s.slice(0, 40)) + '…</span>' : esc(s); };
    cont.innerHTML = '<div class="card-h"><div class="t"><h3>' + esc(sel) + ' <span class="sub">(' + nf(r.total) + ' registros' + (r.encontradas !== r.total ? ' · ' + nf(r.encontradas) + ' encontrados' : '') + ')</span></h3><div class="sub">' + esc(DATOS_DESC[sel] || '') + ' · se muestran los últimos ' + Math.min(r.filas.length, 400) + ', del más nuevo al más viejo</div></div>' +
      '<div class="row" style="gap:6px"><input id="datQ" placeholder="Buscar en todos los campos…" value="' + esc(st.q) + '" style="width:220px">' + (info && info.url ? '<a class="btn sm" target="_blank" rel="noopener" href="' + esc(info.url) + '">Abrir hoja</a>' : '') + (ro ? '' : '<button class="btn sm pri" id="datAdd">+ Agregar</button>') + '</div></div>' +
      (r.pesada ? '<p class="sub">Hoja con mucho texto por registro: se recomienda no editarla salvo necesidad.</p>' : '') +
      '<div class="tw max" style="max-height:66vh"><table class="dat-tab"><thead><tr>' + (ro ? '' : '<th></th>') + r.columnas.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      r.filas.map((f, k) => '<tr>' + (ro ? '' : '<td class="acc"><button class="btn icon sm" data-ed="' + k + '" title="Editar">✏️</button><button class="btn icon sm dan" data-del="' + k + '" title="Eliminar">' + ICON.borrar + '</button></td>') + r.columnas.map(c => '<td>' + corto(f[c]) + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>';
    const q = $('#datQ');
    let t = null;
    q.oninput = () => { clearTimeout(t); t = setTimeout(() => { st.q = q.value.trim(); cargar(); }, 400); };
    if ($('#datAdd')) $('#datAdd').onclick = () => formRegistroAdmin(sel, r.columnas, null, cargar);
    cont.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.ed !== undefined) formRegistroAdmin(sel, r.columnas, r.filas[Number(b.dataset.ed)], cargar);
      if (b.dataset.del !== undefined) eliminarRegistroAdmin(sel, r.filas[Number(b.dataset.del)], cargar);
    };
  };
  try { await cargar(); } catch (e) { cont.innerHTML = '<div class="alert bad">' + ICON.alerta + '<div>' + esc(e.message) + '</div></div>'; }
}
