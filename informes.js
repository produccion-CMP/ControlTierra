'use strict';

function avisarInforme(r) {
  const i = r && r.informe;
  if (!i || i.automatico === false) return;
  if (i.retenido) toast('Se guardó. El informe quedó retenido: ' + i.motivo, 'warn', 9000);
  else if (i.error) toast('Se guardó, pero no se pudo enviar el informe: ' + i.error, 'warn', 8000);
  else if (i.enviados) toast('Informe «' + i.asunto + '» enviado a ' + i.enviados + ' destinatario' + (i.enviados > 1 ? 's' : ''), 'ok', 6000);
  else if (i.motivo) toast('Informe no enviado: ' + i.motivo, 'info', 6000);
}

function botonInforme(clave, datos, texto) {
  return '<button class="btn" data-informe="' + clave + '" data-inf-datos="' + esc(JSON.stringify(datos || {})) + '">' + ICON.correo + esc(texto || 'Informe') + '</button>';
}

function enlazarInformes(raiz) {
  $$('[data-informe]', raiz || document).forEach(b => {
    b.onclick = e => {
      e.preventDefault();
      let d = {};
      try { d = JSON.parse(b.dataset.infDatos || '{}'); } catch (er) { console.warn(er); }
      abrirInforme(b.dataset.informe, d);
    };
  });
}

async function abrirInforme(clave, datos) {
  bloquear('Armando el informe…');
  let inf;
  let correos;
  try {
    const rs = await Promise.all([api('verInforme', Object.assign({ clave: clave }, datos || {})), api('correos')]);
    inf = rs[0];
    correos = rs[1];
  } catch (e) {
    desbloquear();
    return toast(e.message, 'bad', 8000);
  }
  desbloquear();
  const lista = correos.map((c, i) => '<label class="chk dest"><input type="checkbox" data-ci="' + i + '"' + (c[clave] ? ' checked' : '') + '><span><b>' + esc(c.nombre || c.email) + '</b> <small>' + esc(c.email) + ' · ' + esc(c.tipo || 'PARA') + '</small></span></label>').join('');
  const adv = (inf.advertencias || []).filter(a => a[0] === 'bad');
  const aviso = inf.controlado && adv.length ? '<div class="alert warn" style="margin-bottom:10px">' + ICON.alerta + '<div><b>Los datos no están completos.</b> Este informe no se envía solo hasta corregirlo: ' + adv.map(a => esc(a[1])).join(' · ') + ' Si lo enviás ahora, va con estas advertencias.</div></div>' : '';
  const m = modal(inf.asunto, aviso + '<div class="inf-prev"><iframe title="Vista previa del informe" sandbox="" srcdoc="' + esc(inf.html) + '"></iframe></div>' +
    '<div class="inf-dest"><h4>Enviar a</h4>' + (lista || '<p class="sub">No hay correos activos. Cargalos en Configuración → Correos.</p>') +
    '<label class="f mt">Otros correos (separados por coma)<input id="infOtros" placeholder="nombre@empresa.com"></label></div>', [
    { txt: 'Cerrar' },
    {
      txt: 'Enviar', cls: 'pri', fn: async mm => {
        const emails = $$('input[data-ci]:checked', mm).map(x => correos[Number(x.dataset.ci)].email)
          .concat($('#infOtros', mm).value.split(/[,;\s]+/).filter(x => /@/.test(x)));
        if (!emails.length) { toast('Elegí al menos un destinatario', 'warn'); return false; }
        try {
          const r = await api('enviarInforme', Object.assign({ clave: clave, emails: emails }, datos || {}));
          toast('Informe enviado a ' + r.enviados + ' destinatario' + (r.enviados > 1 ? 's' : ''), 'ok');
          return true;
        } catch (e) {
          toast(e.message, 'bad', 8000);
          return false;
        }
      }
    }
  ], 'grande');
  return m;
}
