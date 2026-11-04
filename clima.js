'use strict';

const CLIMA_COD = {
  0: ['Despejado', '☀️'], 1: ['Mayormente despejado', '🌤️'], 2: ['Parcialmente nublado', '⛅'], 3: ['Nublado', '☁️'], 45: ['Niebla', '🌫️'], 48: ['Niebla con escarcha', '🌫️'],
  51: ['Llovizna débil', '🌦️'], 53: ['Llovizna', '🌦️'], 55: ['Llovizna intensa', '🌧️'], 56: ['Llovizna helada', '🌧️'], 57: ['Llovizna helada', '🌧️'],
  61: ['Lluvia débil', '🌦️'], 63: ['Lluvia', '🌧️'], 65: ['Lluvia fuerte', '🌧️'], 66: ['Lluvia helada', '🌧️'], 67: ['Lluvia helada', '🌧️'],
  71: ['Nieve débil', '🌨️'], 73: ['Nieve', '🌨️'], 75: ['Nieve fuerte', '🌨️'], 77: ['Granos de nieve', '🌨️'],
  80: ['Chaparrones', '🌦️'], 81: ['Chaparrones', '🌧️'], 82: ['Chaparrones fuertes', '⛈️'], 85: ['Nevadas', '🌨️'], 86: ['Nevadas', '🌨️'],
  95: ['Tormenta', '⛈️'], 96: ['Tormenta con granizo', '⛈️'], 99: ['Tormenta con granizo', '⛈️']
};
const CLIMA_LAT = -26.7872928915318;
const CLIMA_LON = -65.25353053563997;
const CLIMA_TTL = 30 * 60000;

const climaTxt = c => (CLIMA_COD[c] || ['', '🌡️'])[0];
const climaIco = c => (CLIMA_COD[c] || ['', '🌡️'])[1];

function climaUbic() {
  const lat = num(par('UBICACION_LAT', '')) || CLIMA_LAT;
  const lon = num(par('UBICACION_LON', '')) || CLIMA_LON;
  return { lat: lat, lon: lon };
}

async function cargarClima(forzar) {
  const u = climaUbic();
  const k = 'tierra_clima_' + u.lat.toFixed(3) + '_' + u.lon.toFixed(3);
  const c = lsGet(k, null);
  if (!forzar && c && Date.now() - c.ts < CLIMA_TTL) return c.d;
  const q = 'latitude=' + u.lat + '&longitude=' + u.lon +
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day' +
    '&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,relative_humidity_2m,soil_moisture_0_to_1cm' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,precipitation_hours,wind_gusts_10m_max,et0_fao_evapotranspiration,uv_index_max,sunrise,sunset' +
    '&past_days=7&forecast_days=16&timezone=America%2FArgentina%2FBuenos_Aires';
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?' + q);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    lsSet(k, { ts: Date.now(), d: d });
    return d;
  } catch (e) {
    if (c) return c.d;
    throw e;
  }
}

function climaDias(d) {
  const x = d.daily || {};
  return (x.time || []).map((f, i) => ({
    fecha: f, cod: x.weather_code[i], tmax: x.temperature_2m_max[i], tmin: x.temperature_2m_min[i], mm: x.precipitation_sum[i] || 0,
    prob: x.precipitation_probability_max ? x.precipitation_probability_max[i] : null, hs: x.precipitation_hours ? x.precipitation_hours[i] : null,
    raf: x.wind_gusts_10m_max ? x.wind_gusts_10m_max[i] : null, et0: x.et0_fao_evapotranspiration ? x.et0_fao_evapotranspiration[i] : null,
    uv: x.uv_index_max ? x.uv_index_max[i] : null, sale: x.sunrise ? String(x.sunrise[i]).slice(11, 16) : '', pone: x.sunset ? String(x.sunset[i]).slice(11, 16) : ''
  }));
}

function climaAvisos(d) {
  const mmL = num(par('LLUVIA_MM_PARADA', 5)) || 5;
  const cal = num(par('CALOR_C', 35)) || 35;
  const hoyF = hoy();
  const dias = climaDias(d);
  const fut = dias.filter(x => x.fecha >= hoyF);
  const pas = dias.filter(x => x.fecha < hoyF);
  const out = [];
  const lluvia = fut.slice(0, 7).filter(x => x.mm >= mmL || (x.prob >= 70 && x.mm >= mmL / 2));
  if (lluvia.length) out.push(['warn', '🌧️', 'Lluvia en los próximos 7 días', lluvia.map(x => fCorta(x.fecha) + ' ' + nf(x.mm, 1) + ' mm (' + nf(x.prob) + ' %)').join(' · ') + '. Puede frenar los viajes desde cantera y mojar la playa: conviene tener stock.']);
  const calor = fut.slice(0, 7).filter(x => x.tmax >= cal);
  if (calor.length) out.push(['info', '🔥', 'Días calurosos', calor.map(x => fCorta(x.fecha) + ' ' + nf(x.tmax) + ' °C').join(' · ') + '. La tierra de la playa se seca rápido; cuidar al personal.']);
  const viento = fut.slice(0, 7).filter(x => x.raf >= 60);
  if (viento.length) out.push(['info', '💨', 'Ráfagas fuertes', viento.map(x => fCorta(x.fecha) + ' ' + nf(x.raf) + ' km/h').join(' · ') + '. Polvo en la playa y en los caminos.']);
  const mmPas = sum(pas, x => x.mm);
  const ultLl = pas.filter(x => x.mm >= 1).pop();
  out.push([mmPas >= mmL ? 'warn' : 'ok', '💧', 'Lluvia de los últimos 7 días: ' + nf(mmPas, 1) + ' mm', ultLl ? 'Última lluvia el ' + fMedia(ultLl.fecha) + ' (' + nf(ultLl.mm, 1) + ' mm).' : 'Sin lluvia: la tierra de la playa debería estar seca.']);
  const et = sum(fut.slice(0, 7), x => x.et0);
  if (et) out.push(['ok', '☀️', 'Evaporación próxima semana ≈ ' + nf(et, 0) + ' mm', 'Cuanto más alta, más rápido se seca la tierra después de una lluvia.']);
  return out;
}

function pintarClimaChip(d) {
  const b = $('#clima');
  if (!b) return;
  if (!d) { b.innerHTML = '🌡️<span>–</span>'; return; }
  const c = d.current || {};
  const hoyD = climaDias(d).find(x => x.fecha === hoy()) || {};
  const alerta = climaAvisos(d).some(a => a[0] === 'warn' && a[1] !== '💧');
  b.innerHTML = '<span class="ico">' + climaIco(c.weather_code) + '</span><b>' + nf(c.temperature_2m) + '°</b><span class="det">' + nf(hoyD.tmin) + '/' + nf(hoyD.tmax) + '° · 💧' + nf(hoyD.prob) + '%</span>' + (alerta ? '<i class="punto"></i>' : '');
  b.title = climaTxt(c.weather_code) + ' · ' + nf(c.temperature_2m, 1) + ' °C en la planta. Tocá para ver el pronóstico extendido';
}

async function iniciarClima() {
  const b = $('#clima');
  if (!b) return;
  b.onclick = abrirClima;
  const act = async f => { try { pintarClimaChip(await cargarClima(f)); } catch (e) { console.warn(e); pintarClimaChip(null); } };
  act(false);
  setInterval(() => act(true), CLIMA_TTL);
}

async function abrirClima() {
  let d;
  try { d = await cargarClima(false); } catch (e) { return toast('No se pudo obtener el pronóstico: ' + e.message, 'bad'); }
  const u = climaUbic();
  const c = d.current || {};
  const dias = climaDias(d);
  const hoyF = hoy();
  const fut = dias.filter(x => x.fecha >= hoyF);
  const pas = dias.filter(x => x.fecha < hoyF);
  const hd = fut[0] || {};
  const mmL = num(par('LLUVIA_MM_PARADA', 5)) || 5;
  const cal = num(par('CALOR_C', 35)) || 35;
  const h = d.hourly || {};
  const ahoraIso = (d.current && d.current.time) || '';
  const i0 = Math.max(0, (h.time || []).findIndex(t => t >= ahoraIso.slice(0, 13)));
  const idx = [];
  for (let i = i0; i < Math.min((h.time || []).length, i0 + 48); i++) idx.push(i);
  const suelo = h.soil_moisture_0_to_1cm ? h.soil_moisture_0_to_1cm[i0] : null;
  const tarj = (x, pasado) => {
    const n = Math.round((new Date(x.fecha + 'T12:00:00') - new Date(hoyF + 'T12:00:00')) / 86400000);
    const ll = x.mm >= mmL || (x.prob >= 70 && x.mm >= mmL / 2);
    return '<div class="cd ' + (pasado ? 'pas ' : '') + (n > 7 ? 'lejos ' : '') + (ll ? 'llueve ' : '') + (x.tmax >= cal ? 'calor ' : '') + '" title="' + esc(climaTxt(x.cod)) + (x.et0 !== null ? ' · evaporación ' + nf(x.et0, 1) + ' mm' : '') + (x.uv !== null ? ' · UV ' + nf(x.uv, 0) : '') + '">' +
      '<div class="f">' + (n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : fMedia(x.fecha)) + '</div><div class="i">' + climaIco(x.cod) + '</div><div class="t"><b>' + nf(x.tmax) + '°</b> ' + nf(x.tmin) + '°</div>' +
      '<div class="ll">' + (x.mm >= 0.1 ? nf(x.mm, 1) + ' mm' : 'sin lluvia') + (pasado || x.prob === null ? '' : ' · ' + nf(x.prob) + ' %') + '</div>' + (x.raf ? '<div class="v">💨 ' + nf(x.raf) + ' km/h</div>' : '') + '</div>';
  };
  const avisos = climaAvisos(d);
  const m = modal('Tiempo en la planta', '<div class="clima-p">' +
    '<div class="clima-ahora"><div class="ic">' + climaIco(c.weather_code) + '</div><div><div class="tt">' + nf(c.temperature_2m, 1) + ' °C</div><div class="sub">' + esc(climaTxt(c.weather_code)) + ' · sensación ' + nf(c.apparent_temperature, 0) + ' °C</div></div>' +
    '<div class="clima-dat"><span>Humedad <b>' + nf(c.relative_humidity_2m) + ' %</b></span><span>Viento <b>' + nf(c.wind_speed_10m) + ' km/h</b> · ráfagas ' + nf(c.wind_gusts_10m) + '</span><span>Hoy <b>' + nf(hd.tmin) + '° / ' + nf(hd.tmax) + '°</b> · ' + nf(hd.mm, 1) + ' mm (' + nf(hd.prob) + ' %)</span>' +
    (suelo !== null && suelo !== undefined ? '<span>Humedad del suelo superficial <b>' + nf(suelo * 100, 0) + ' %</b> vol.</span>' : '') + '<span>Sol ' + esc(hd.sale || '') + ' – ' + esc(hd.pone || '') + '</span></div></div>' +
    '<div class="clima-av">' + avisos.map(a => '<div class="ca ' + a[0] + '"><span class="e">' + a[1] + '</span><div><b>' + esc(a[2]) + '</b><div class="sub">' + esc(a[3]) + '</div></div></div>').join('') + '</div>' +
    '<h4>Próximas 48 horas</h4><div class="chart" style="height:200px"><canvas id="chClima"></canvas></div>' +
    '<h4>Pronóstico de ' + fut.length + ' días</h4><div class="clima-dias">' + fut.map(x => tarj(x, false)).join('') + '</div>' +
    '<p class="sub">Del día 8 en adelante (más claros) el pronóstico es una tendencia: puede cambiar bastante.</p>' +
    '<h4>Últimos 7 días</h4><div class="clima-dias">' + pas.map(x => tarj(x, true)).join('') + '</div>' +
    '<p class="sub mt">Fuente: Open-Meteo (combina modelos ECMWF, GFS e ICON) para ' + nf(u.lat, 4) + ', ' + nf(u.lon, 4) + ' · <a href="https://www.google.com/maps?q=' + u.lat + ',' + u.lon + '" target="_blank" rel="noopener">ver en el mapa</a> · <a href="https://www.smn.gob.ar/alertas" target="_blank" rel="noopener">alertas del SMN</a>. Actualizado ' + esc(String(c.time || '').slice(11, 16)) + ' h.</p></div>',
  [{ txt: 'Cerrar' }], 'grande');
  const L = idx.map(i => { const t = h.time[i]; return t.slice(11, 13) === '00' ? fCorta(t.slice(0, 10)) : t.slice(11, 13) + 'h'; });
  grafico('chClima', 'bar', L, [
    { type: 'line', label: 'Temperatura °C', data: idx.map(i => h.temperature_2m[i]), borderColor: color(1), backgroundColor: color(1), yAxisID: 'y' },
    { type: 'bar', label: 'Probabilidad de lluvia %', data: idx.map(i => h.precipitation_probability ? h.precipitation_probability[i] : null), backgroundColor: 'rgba(42,120,214,.25)', yAxisID: 'y1' },
    { type: 'bar', label: 'Lluvia mm', data: idx.map(i => h.precipitation[i]), backgroundColor: color(2), yAxisID: 'y2' }
  ], { scales: { y: { position: 'left', title: { display: true, text: '°C' } }, y1: { position: 'right', min: 0, max: 100, grid: { display: false }, title: { display: true, text: '%' } }, y2: { display: false, min: 0, suggestedMax: 10 } } });
  return m;
}
