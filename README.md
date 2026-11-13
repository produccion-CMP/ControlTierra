# Control de Tierra · Planta CEVIL (v6)

App única en GitHub Pages + API en Apps Script. Los **viajes viven solo en la planilla original** «Carga de viajes de tierra (respuestas)» y el **gasoil en «Trabajo en Cantera»**; la base nueva no los duplica, solo los consulta y escribe en su lugar.

```
tierra-cevil/
├── apps-script/Code.gs        → backend (reemplaza el Code.gs actual)
├── apps-script/Informes.gs    → informes por correo (archivo nuevo en el mismo proyecto)
└── web/                       → contenido del repo produccion-CMP/ControlTierra
    ├── index.html  app.css  config.js  manifest.json  sw.js
    ├── viaje.js (animación)  core.js  controles.js  ayuda.js  balanza.js  informes.js
    ├── vistas.js  carga.js  viajes.js  app.js
    └── img/ logo-cmp.png  icon-192.png  icon-512.png
```

## Usuarios y sectores

| Rol | Sector | Carga |
|---|---|---|
| `abastecimiento` · Responsable de abastecimiento | Cantera → balanza de ingreso (incluida) | Jornada de cantera, gasoil (cargas, llenado y medición de cisterna), viajes, balanza (PESAJE.XLS), calidad, liquidación |
| `molienda` · Responsable de molienda | Playa → molienda → silo | Turnos de molienda y silo (corrección del Informe), cubicaciones y ajustes de stock |
| `admin` | Todo | Además configuración, usuarios y parámetros |

Los roles anteriores (`cantera`, `balanza`, `calidad`) se convierten solos en `abastecimiento` al ingresar y al ejecutar `setup()`.

## Dónde se guarda cada dato

| Dato | Planilla | Hoja |
|---|---|---|
| Viajes (lectura) | Carga de viajes de tierra (respuestas) | `ViajesUnificados` (QUERY formulario + manuales) |
| Viajes (escritura) | Carga de viajes de tierra (respuestas) | `Respuestas de formulario 1` (14 columnas + O `PALADAS POR VIAJE`) |
| Choferes, dominios, orígenes, tipos, responsables | Carga de viajes de tierra (respuestas) | `CHOFER`, `DOMINIO`, `ORIGEN-DESTINO`, `TIPO VIAJE`, `RESPONSABLE` |
| Trabajos de cantera (lectura y escritura) | Trabajo en Cantera | `ProduccionCantera` (13 columnas + N `ViajesInternos`) y `MantenimientoCantera`, mismo formato que la app anterior |
| Gasoil (lectura y escritura) | Trabajo en Cantera | `CargaCombustibleCantera` (fila nueva al final, como la app original; borra filas vacías previas; columna G `IdApp`) |
| Ajuste de la cisterna | Trabajo en Cantera | `Configuracion` C2:D2 (se actualiza al guardar una medición con varilla) |
| Molienda y silo (lectura en vivo) | Informe de Producción CMP - Planta CEVIL | `Molienda`: B fecha, C turno, D paladas a molienda, G paladas silo → producción, J t balanza dinámica |
| Balanza de ingreso | PESAJE.XLS del software de la balanza → base nueva | `Pesajes` (solo tierra, `cod_mat` = `BALANZA_COD_TIERRA`, con entrada y salida) |
| Pesajes, calidad, ajustes, mediciones de cisterna, usuarios, correos, informes, parámetros | Base nueva (Control de Tierra) | una hoja por entidad |

## Actualizar el despliegue actual

| Paso | Acción |
|---|---|
| 1 | Apps Script → reemplazar `Code.gs` por `apps-script/Code.gs` |
| 2 | Agregar el archivo `Informes.gs` al mismo proyecto (Archivo → + → Secuencia de comandos) |
| 2b | Ejecutar `setup()` una vez y aceptar los permisos nuevos (correo y activadores): crea `Informes`, columnas de suscripción en `Correos`, parámetros nuevos, migra roles e instala el resumen diario |
| 2c | Solo si se cargaron jornadas con la versión anterior de esta app: ejecutar `migrarTramosACantera()` para pasarlas a «Trabajo en Cantera» |
| 3 | Implementar → Administrar implementaciones → Editar → **Nueva versión** (misma URL `/exec`) |
| 4 | Subir todo `web/` al repo (incluye `controles.js` y `ayuda.js` nuevos) |
| 5 | La cuenta que ejecuta la Web App necesita **edición** en «Carga de viajes» y en «Trabajo en Cantera», y lectura en el Informe de Producción |
| 5b | Dejar de usar la app anterior de cantera para no duplicar partes por correo |
| 6 | Configuración → Usuarios: asignar «Responsable de abastecimiento» y «Responsable de molienda» |

## Parámetros nuevos (v4)

| Clave | Por defecto | Uso |
|---|---|---|
| `COMBUSTIBLE_ID` | ID de «Trabajo en Cantera» | Planilla de gasoil |
| `CISTERNA_NOMBRE_CARGA` | `Cisterna Principal` | Nombre del llenado de cisterna |
| `MAX_LITROS_CARGA` | `600` | Tope por carga a máquina (error de tipeo) |
| `EXCLUIR_RECHAZADOS` | `SI` | Las toneladas rechazadas por calidad no suman a la playa |
| `TOLERANCIA_TARA` | `5` | % de diferencia de tara contra la habitual del camión |
| `TOLERANCIA_INVENTARIO` | `10` | % aceptable entre cubicación y stock calculado |
| `TOLERANCIA_HOROMETRO_GASOIL` | `3` | h aceptables entre horómetro de gasoil y de jornada |
| `DIAS_CUBICACION` | `30` | Días máximos sin cubicar la playa |
| `CAPACIDAD_PLAYA` / `CAPACIDAD_SILO` | vacío | t; vacío = máximo histórico |

## Controles cruzados (Tablero → Controles)

| Sector | Control | Compara |
|---|---|---|
| Abastecimiento | Carga al día | Último dato de viajes, jornada, balanza y gasoil |
| Abastecimiento | Viajes con ticket / tickets con viaje | Comprobantes a planta ↔ pesadas (dominio + hora ± `VENTANA_MATCH_MIN`) |
| Abastecimiento | Tara de cada camión | Tara de cada pesada ↔ mediana del mismo dominio |
| Abastecimiento | Pesadas repetidas | Mismo dominio dos veces en < 25 min |
| Abastecimiento | Netos normales | Neto ↔ rango intercuartil del dominio |
| Abastecimiento | Viajes posibles | Viajes superpuestos del mismo camión o chofer |
| Abastecimiento | Palas ↔ viajes | Camiones declarados por las palas ↔ comprobantes |
| Abastecimiento | Carga real de los camiones | t de balanza ÷ paladas a camión ↔ factor t/palada de molienda |
| Abastecimiento | Horómetros de la jornada | Avance del horómetro ↔ horas del tramo |
| Abastecimiento | Duración de los viajes | Carga → descarga > 4 h |
| Abastecimiento | Calidad | Rechazos (toneladas fuera del stock) y % de viajes inspeccionados |
| Abastecimiento | Nivel de la cisterna | Nivel < 0 o > capacidad, nivel bajo |
| Abastecimiento | Consumo por hora | L de cada carga ÷ horas desde la carga anterior ↔ habitual de la máquina |
| Abastecimiento | Horómetro gasoil ↔ jornada | Horómetro anotado al cargar ↔ inicial de la jornada |
| Abastecimiento | Medición de la cisterna | Varilla ↔ nivel calculado |
| Molienda | Molienda al día | Último turno del Informe o manual |
| Molienda | Cubicación periódica | Días desde la última cubicación |
| Molienda | Diferencia de inventario | Cubicación ↔ stock calculado ese día |
| Molienda | Stocks posibles | Playa y silo negativos o sobre capacidad |
| Molienda | Días de cobertura | Stock ÷ consumo medio de 14 días |
| Molienda | Factor t/palada por turno | Balanza dinámica ÷ paladas ↔ mediana (±25 %) |
| Molienda | Balanza dinámica | Turnos con paladas sin toneladas |

## Ayuda

Botón `?` fijo abajo a la derecha. Abre un panel lateral con la explicación de la pantalla, cómo se usa, cómo se calcula, consejos y los controles con observaciones del sector («Ahora conviene revisar»). Muestra un punto cuando hay algo para revisar. La guía de cubicación vive en ese panel.

## Reglas de negocio

| Tema | Criterio |
|---|---|
| Talonarios | Siguiente N° = máximo de la serie + 1, salteando los usados |
| Duplicados | No se graba un comprobante que exista en `ViajesUnificados`; editar/eliminar solo en `Respuestas de formulario 1` |
| Talonario | Viajes comunes con origen → destino, hora de carga y descarga; viajes internos como cantidad + lugar + paladas |
| Paladas a camión | (camiones a planta + internos) × `PALADAS_POR_CAMION`; otro valor queda «manual» |
| Gasoil | Carga a máquina exige horómetro, que no puede bajar respecto de la carga anterior (salvo «Guardar igual») |
| Cisterna | Ajuste de `Configuracion` + llenados − cargas a máquinas. Una medición recalcula el ajuste para que el nivel a esa hora sea el medido |
| Playa | Stock inicial / cubicación + ingreso de balanza − rechazados − consumo de molienda |
| Molienda/silo | Suma por fecha + turno del Informe; la carga manual reemplaza ese turno. Caché 10 min |
| Liquidación | PAGAR? = SI; media jornada si algún viaje del día tiene ¿JORNADA COMPLETA? = NO |

## Informes por correo (v5)

| Informe | Se envía | Contenido |
|---|---|---|
| Trabajos de cantera | Al guardar la jornada | Tramos por máquina, horómetros vs duración, paladas a camión/acopio, m³, camiones, paradas con causa y personal, t/palada del día, cruce con viajes y balanza |
| Balanza de ingreso | Al importar el PESAJE.XLS | t, camiones, t/camión, t/palada, cruce viajes ↔ tickets, taras fuera de lo habitual |
| Molienda y silo | Al corregir un turno | Paladas, m³, t de balanza dinámica, t/palada, extracción de silo, stocks y últimos 7 días |
| Cubicación | Al registrar un ajuste | Cubicado vs calculado y diferencia de inventario |
| Resumen diario | Todos los días a `INFORME_DIARIO_HORA` | Stock de playa (t, m³, días), molido, ingreso, silo, gasoil y alertas |
| Viajes, gasoil, calidad, parte del día | Manual (botón «Informe») | Configurable como automático |

El admin define en **Configuración → Informes** cuáles salen solos y si llevan PDF, y en **Correos** qué recibe cada destinatario (Para / CC / CCO).

## Parámetros nuevos (v5)

| Clave | Por defecto | Uso |
|---|---|---|
| `JORNADA_FUENTE` | `CANTERA` | Dónde vive la jornada (`BASE` = hoja Tramos) |
| `CANTERA_ID` / `CANTERA_HOJA_PRODUCCION` / `CANTERA_HOJA_PARADAS` | Trabajo en Cantera | Origen de los trabajos de cantera |
| `ORIGEN_CANTERA` | `CANTERA` | Distingue cantera propia de excavaciones para el t/palada |
| `BALANZA_COD_TIERRA` | `002` | Código de material de tierra en el PESAJE.XLS |
| `INFORME_DIARIO_HORA` | `7` | Hora del resumen diario |
| `DENSIDAD_APARENTE` | `1.48` (antes 1.6) | Solo se usa si no hay balanza dinámica. Si la base ya tiene 1.6, conviene cambiarlo |

## Novedades v6

| Tema | Cambio |
|---|---|
| Inicio | La app siempre abre en Inicio. Opción «Último día» (último día con datos). Tira «Todo en t y m³» bajo el diagrama con la diferencia contra el paso anterior y el siguiente |
| Stock | Arranca en el stock inicial / primer ajuste; antes se reconstruye hacia atrás. Si el cálculo da negativo se muestra «sin dato» hasta el próximo ajuste. Los gráficos nunca muestran valores negativos |
| Ajuste de stock | Reemplaza «cubicación»: se carga en t o m³ y la app convierte con la densidad (t/palada ÷ m³ del balde). Calculadora de pilas opcional |
| Molienda | Vista simplificada con el estado de la tierra; el vínculo con el Informe de Producción solo lo ve el admin |
| Gasoil | Corrige el error al guardar (se agrega al final de `CargaCombustibleCantera`). Modo «Ajustar nivel» de la cisterna |
| Horas | Todas las horas se escriben con números y el «:» aparece solo (730 → 07:30). Jornada y viajes sin horarios fijos: los botones de tramo salen de los horarios habituales de cada máquina y todo se puede editar; tramos y viajes que pasan la medianoche se aceptan con aviso |
| Calendario | Cada botón cambia el número del día (viajes, t de ingreso, paladas, t molidas con m³). Días con dos situaciones se parten en colores iguales. Sin la barra «menos/más» |
| Fotos de remitos | El modelo de Gemini se detecta solo (`GEMINI_MODELO_OK`); si Google retira un modelo se elige otro disponible |
| Ingreso | Se elige el usuario de una lista y se escribe la contraseña |
| Informes | Nuevo diseño con «Resumen rápido» arriba. Informe semanal (día `INFORME_SEMANAL_DIA`) y mensual (día 1) del estado de la playa y lo molido |
| Datos controlados | Diario, semanal y mensual salen solos solo si los datos están completos. Si no, quedan en «Informes retenidos» (Inicio, admin) y se avisa a los correos con «Advertencias». Desde ahí se envían igual o se descartan |

### Actualizar a v6

| Paso | Acción |
|---|---|
| 1 | Reemplazar `Code.gs` e `Informes.gs` |
| 2 | Ejecutar `setup()` una vez: crea la hoja `Retenidos`, las columnas `rSemanal`, `rMensual`, `rAlertas` en `Correos` y el parámetro `INFORME_SEMANAL_DIA` |
| 3 | Implementar → Nueva versión |
| 4 | Subir `web/` completo (caché `tierra-cevil-v10`) |
| 5 | Configuración → Informes: activar «Informe semanal» / «Informe mensual»; Correos: marcar Semanal, Mensual y Advertencias |
| 6 | Cargar un **stock inicial** de playa (y de silo) en Ajuste de stock para que se vean los stocks |

## Novedades v6.1

| Tema | Cambio |
|---|---|
| Estado de la playa | Informe diario nuevo (`playa`, columna `rPlaya` en Correos): stock actual en t y m³, variación de los últimos 7 días (ingreso − molido), proyección a `PROYECCION_DIAS` días con rango (escenario esperado y desfavorable), fecha en que se agotaría y pronóstico por día. Es controlado: si faltan datos queda retenido |
| Proyección | Ingreso y consumo promedio de cada día de la semana en las últimas 4 semanas. Los días con viajes sin balanza se estiman con las t por camión habituales. En días con lluvia ≥ `LLUVIA_MM_PARADA` mm el ingreso se reduce al factor aprendido de los días con parada por clima (o `FACTOR_INGRESO_LLUVIA`) |
| Inicio | Tarjeta «Playa de molienda: 7 días atrás y N adelante» con gráfico, rango y Δ diario con el clima |
| Tiempo | Botón en el encabezado (junto a «En línea») con temperatura actual y la mínima, la máxima y la probabilidad de lluvia de hoy. Abre el pronóstico de 16 días, las 48 horas, la lluvia de los últimos 7 días, la humedad del suelo, la evaporación y avisos de lluvia, calor y viento. Fuente: Open-Meteo (sin clave), ubicación `UBICACION_LAT` / `UBICACION_LON` |

| Parámetro | Por defecto | Uso |
|---|---|---|
| `UBICACION_LAT` / `UBICACION_LON` | -26.7872929 / -65.2535305 | Ubicación de la planta |
| `LLUVIA_MM_PARADA` | 5 | mm diarios que frenan el ingreso |
| `CALOR_C` | 35 | °C para avisar calor |
| `FACTOR_INGRESO_LLUVIA` | vacío (se calcula) | Fracción del ingreso en días de lluvia |
| `PROYECCION_DIAS` | 7 | Días de proyección (máx. 16) |

Actualizar: reemplazar `Code.gs` e `Informes.gs`, ejecutar `setup()`, nueva versión, subir `web/` (incluye `clima.js` nuevo, caché `tierra-cevil-v11`). Configuración → Informes: activar «Estado de la playa de molienda». Apps Script pedirá permiso para conectarse a servicios externos (pronóstico).

## Novedades v6.2

| Tema | Cambio |
|---|---|
| Stock muerto | `CISTERNA_STOCK_MUERTO` (500 L): el indicador, la autonomía, los avisos de nivel bajo y los informes usan el gasoil utilizable (total − stock muerto) |
| Inicio de control de la cisterna | Solo el admin (acción `ajustarCisterna`, modo «Inicio de control» en Gasoil). Fija el nivel total y no se registra como diferencia; las mediciones anteriores dejan de controlarse. Abastecimiento solo registra mediciones con varilla, que se comparan sin cambiar el nivel |
| Último día | Es siempre el día anterior; la proyección de la playa también parte de ayer |
| Calendario | Emojis por situación: ⛏️ PROD, 🔧 PARADA, 🌧️ CLIMA, 👷 FALTA, ⛔ RECH (en celular solo el emoji) |

Actualizar: reemplazar `Code.gs` e `Informes.gs`, ejecutar `setup()` (agrega la columna `tipo` en `MedicionesCisterna` y el parámetro), nueva versión, subir `web/` (caché `tierra-cevil-v12`).

## Novedades v7 · Acopios e IA de fotos

### Acopios (menú «Acopios»)
| Pestaña | Quién | Qué hace |
|---|---|---|
| Plano y stock | Todos | Plano satelital de la playa (zona E1–H4 y G5) con los sectores coloreados por estado y las toneladas de cada acopio; tarjetas con origen, calidad, ingreso, consumo y stock en t, m³ y paladas |
| Descargas (balanza) | Abastecimiento, molienda | Tickets del PESAJE.XLS con chofer y origen del viaje; selección individual, en bloque o por rango (Shift) y asignación a un acopio |
| Consumos y traslados | Molienda | De qué acopio se muele desde un turno hasta otro (o «sigue») y en qué %; las paladas salen del Informe de Producción y se pueden corregir cargándolas. Lista de turnos sin acopio |
| Armar mezcla | Molienda | Elegís acopios, proporciones y toneladas; calcula paladas de cada uno y la composición, y registra los traslados |
| Dibujar sectores | Admin | Se tocan las celdas del plano para formar cada sector fijo |

Hojas nuevas en la base: `Sectores`, `Acopios`, `DescargasAcopio`, `MovimientosAcopio`. Archivo nuevo: `apps-script/Acopios.gs` y `web/acopios.js`, `web/img/playa-acopios.jpg`.

### IA de fotos
`leerComprobante` prueba en orden el último modelo que funcionó, el de `GEMINI_MODELO` (vacío = automático), los Flash vigentes y los que la clave tenga disponibles; si uno está retirado o sin cuota pasa al siguiente. Los errores de clave se informan con la causa. Configuración → «Probar IA de fotos» (o `probarIA()` desde el editor) muestra qué modelo funciona.

Actualizar: reemplazar `Code.gs` e `Informes.gs`, **agregar `Acopios.gs`**, ejecutar `setup()`, Implementar → **Nueva versión**, subir `web/` (caché `tierra-cevil-v13`).

## Novedades v8

| Tema | Cambio |
|---|---|
| IA de fotos | Elige primero los Flash estables más nuevos que tenga la clave (ej. 3.8 → 3.7 → 3.6 → 3.5…), sigue el modelo que Google sugiere en el error 404 y reintenta los 503 |
| Diagrama de Inicio | Cada paso en t y m³ con su referencia en paladas: cantera (a planta + acopiado en cantera), viajes (paladas por camión × `T_POR_PALADA_CANTERA`), balanza (t, m³ y densidad), playa, molienda (paladas al cajón) y silo (entra por balanza de molienda, sale por paladas) |
| Ingreso dual | Balanza primero; los viajes a planta sin ticket se completan con paladas del camión × t por palada |
| Camiones | Configuración → Camiones: paladas por viaje de cada dominio, con sugerencia según la balanza |
| Solo editores | Controles, avisos y errores no se muestran sin iniciar sesión |
| Proyección | «Días de stock» en lugar de «Se agota»; línea y casilla «HOY» |
| Ajustes con autorización | Ajustes de stock (playa/silo) y de nivel de la cisterna llevan motivo obligatorio y, si no los hace el admin, quedan pendientes hasta que el admin los autoriza en Inicio (hoja `Solicitudes`). Los ajustes de acopios no requieren autorización. Las mediciones anteriores a un inicio de control de la cisterna ya no marcan diferencia |
| Configuración | Correos por persona con grupos y explicación al pasar el mouse; Informes como tarjetas con vista previa |
| Gasoil | Operación en tiempo real, «Otra máquina» (se agrega al catálogo), tanque con stock muerto, consumo promedio por día activo, evolución por día/mes/año y máquina, registro con búsqueda y orden |
| Velocidad | El servidor reutiliza la planilla y las hojas leídas en cada pedido y guarda en caché las consultas (rango, jornada, acopios, proyección) hasta la próxima carga |
| Advertencias al cargar | Molienda (t/palada y paladas fuera de lo habitual), calidad, ajustes, gasoil, viajes y jornada |
| PIN | Cada usuario puede cambiar su PIN desde su nombre (arriba a la derecha) |
| Calidad | Enviada (abastecimiento) y recibida (molienda) sobre los camiones de la balanza, en bloque; humedad en 5 niveles; caliza, basura, piedras, raíces y tierra negra en Nada/Poco/Moderado/Abundante; % arcilla/limo/arena; opción de asignar el acopio |

Actualizar: reemplazar `Code.gs`, `Informes.gs` y `Acopios.gs`, ejecutar `setup()` (crea `Solicitudes` y `Camiones`, columnas nuevas de `Calidad` y el parámetro `T_POR_PALADA_CANTERA`), Implementar → Nueva versión, subir `web/` (caché `tierra-cevil-v14`). Después: Configuración → Camiones → «Agregar los camiones de la balanza», revisar y guardar.

## Novedades v9

| Tema | Cambio |
|---|---|
| Revisión (menú nuevo, solo editores) | «Viajes ↔ balanza»: cada viaje sin ticket muestra hasta 3 pesajes posibles con el motivo (mismo camión fuera de la ventana, patente parecida, viaje sin patente, mismo horario) y botones Asociar / No pasó por la balanza / Corregir el viaje; tickets sueltos con Cargar viaje / No corresponde; decisiones registradas en la hoja `Asociaciones` y reversibles. «Todos los controles» reemplaza a la pestaña Controles del tablero |
| Cruce | El backend y la app usan primero las asociaciones manuales, después el cruce automático |
| Importación de balanza | Antes de importar muestra por día cuántos pesajes ya están en la base y cuántos son nuevos; después, nuevos / corregidos / ya estaban / total por día. Si el envío queda en cola por falta de conexión, lo avisa |

## Novedades v10 · Balanza

### Cómo se interpreta el PESAJE.XLS
| Señal | Columna | Tierra | Despacho de ladrillos |
|---|---|---|---|
| Material | `cod_mat` | 002 | 001 |
| Sentido | `pesoent` vs `pesosal` | entra cargado, sale vacío | entra vacío, sale cargado |
| Cliente / proveedor | `cod_clie` / `cod_pro` | sin cliente, proveedor 003 | con cliente |
| Camión | `patente` | flota (catálogo DOMINIO, Camiones y pesajes de tierra de 180 días) | cualquiera |
| Transportista | `cod_tra` | se usa para corregir patentes mal tipeadas | — |

- Se importan las filas con pesaje completo (`popcion` 2 o 4) que son tierra por material, sentido y sin cliente. Las contradictorias quedan como **dudosas** (se elige cuáles importar).
- Patentes fuera de la flota se corrigen si el transportista trae casi siempre (≥ 60 %) una patente que difiere en 1–2 caracteres, o si difieren en 1 carácter de una única patente de la flota. Se guarda la original en `dominioArchivo`.
- **Entradas sin salida**: filas `popcion` 1 activas, sin ticket de salida; se marcan «volvió a entrar», «sin salida» o «probablemente en planta» (últimas 2 h del archivo).
- **Duplicados**: clave = ticket. Nuevo → se agrega; igual → no se toca; distinto → se corrige.

### Balanza cruda
Cada importación guarda el archivo tal cual en la hoja `BalanzaCruda` (las últimas 30 importaciones o 31 días) y un registro en `Importaciones`. Revisión → «Balanza cruda» compara automáticamente el crudo con los pesajes procesados, muestra los no tomados (con importación en un clic), las entradas sin salida, el archivo completo con búsqueda y descarga CSV, y las últimas importaciones.

Actualizar: reemplazar `Code.gs`, ejecutar `setup()` (crea `BalanzaCruda`, `Importaciones` y columnas `nota`/`dominioArchivo` en `Pesajes`), nueva versión, subir `web/` (caché `tierra-cevil-v16`).

## Novedades v11 · Malas prácticas en balanza (solo tierra)

| Práctica | Cómo se detecta | Dónde se ve |
|---|---|---|
| Sin pesaje de salida | El camión salió sin pesarse y el pesaje se cerró con la tara del sistema: salida otro día, más de `BALANZA_MAX_MIN_SALIDA` (120) min después de la entrada, o `popcion` 4 | Importación, Revisión → Balanza cruda, control «Malas prácticas en balanza», informe de balanza |
| Entrada todavía abierta | Fila de entrada (`popcion` 1) activa sin ticket de salida | Ídem |
| Carga manual | La patente tiene un carácter extra (`+`, `'`, etc.), p. ej. «LHU 365+» | Ídem |

Cada caso muestra la observación del pesaje (`observ`/`observ2`) como justificación o «sin justificar». Solo se analizan pesajes de tierra; los demás materiales se ignoran. `Pesajes` guarda `manual`, `sinSalida`, `salida` y `observ`.

Actualizar: reemplazar `Code.gs` e `Informes.gs`, ejecutar `setup()`, nueva versión, subir `web/` (caché `tierra-cevil-v17`) y volver a importar los PESAJE recientes para marcar los registros ya cargados.

## Novedades v12 · Plano de la playa de molienda

- El plano de Acopios es un dibujo vectorial recto (`web/plano-playa.js`), alineado al eje del galpón (girado 46° respecto del norte; la flecha indica el norte geográfico).
- Referencias: galpón principal, galpón este, calle interna, producto terminado, límite del predio, salida a oficinas e ingreso.
- La playa de molienda es la «L» al este del galpón, con una grilla de 20 × 20 (filas A–Y, columnas 1–14). Las celdas se guardan como `F-C` (ej. `P-4`) y se muestran como `P4`.
- Cada sector se dibuja con su contorno en el color del sector y se rellena según el estado de su acopio.
- El interruptor «Foto» superpone la foto satelital enderezada (`img/playa-plano.jpg`); la preferencia queda guardada en el navegador.
- Los sectores dibujados en el plano anterior se marcan con «⚠ plano anterior» y hay que redibujarlos (Acopios → Dibujar sectores).
- Actualizar: subir `web/` (caché `tierra-cevil-v18`). No hay cambios en Apps Script.

## Novedades v13

**Calendario por grupos**
- Ingreso: trabajo en cantera (paladas), viajes de camiones, pesajes (t y tickets).
- Stock de playa: stock al cierre de cada día, variación ▲/▼ contra el día anterior y relleno de nivel. KPIs: cierre, máximo, mínimo, variación del mes y días de stock.
- Consumo: consumo de playa (paladas al cajón × t/palada), molienda → silo (balanza dinámica), silo → producción.
- Stock de silo: igual que playa.
- La elección queda guardada por navegador (`tierra_cal_grupo`, `tierra_cal_sub_*`).

**Inicio**
- Cada nodo indica si es «Movimiento» (lo que pasó en el período) o «Stock al dd/mm» (foto, no se suma).
- Playa y Silo se dibujan como pila y silo con nivel animado, variación del período y entradas/salidas.
- Conectores con flechas y partículas: verde entra a un stock, rojo sale. Respeta «reducir movimiento».

**Indicadores por camión** (Tablero → Viajes y balanza)
- Una tarjeta por dominio: viajes, días, viajes/día, total t, t/viaje (mediana), ciclo, t/m³ estimada, rango de netos, % con ticket.
- Alertas por camión: sin ticket, netos atípicos, sin salida, carga manual, rechazos.
- Exportación a CSV.

**Remitos: horómetro de pala y ticket de salida (opcionales)**
- Se graban en la planilla de viajes, columnas P «HOROMETRO PALA» y Q «TICKET SALIDA». Las columnas se crean solas.
- Si `ViajesUnificados` no trae esas columnas, se completan leyendo «Respuestas de formulario 1» por comprobante y N° de viaje.
- Para leerlas directo de ViajesUnificados hay que extender su rango a P:Q.
- Al cargar se controla el ticket contra la balanza y se avisa si el horómetro retrocede o avanza más que el reloj.
- La IA de fotos también lee estos dos campos.
- El cruce viaje ↔ pesaje usa primero el ticket de salida (frontend `conciliar` y backend `cruzarViajes_`); después, dominio y hora.
- Tablero → Cantera → «Pala cargadora en los remitos»:
  - qué pala cargó cada camión (por el rango de horómetro de la jornada);
  - minutos de pala entre camiones;
  - camiones por hora;
  - lecturas dudosas.
- Controles nuevos: `a_ticketSal` y `a_pala`.
- `rango` devuelve `palDom` (paladas por dominio).
- Actualizar: reemplazar `Code.gs` e `Informes.gs`, nueva versión de la implementación, subir `web/` (caché `tierra-cevil-v19`).

## Novedades v14

- **Silo:** días aproximados de stock (stock ÷ extracción media) en Inicio, Tablero y Calendario.
- **Playa 7 + 7:** debajo de cada fecha del eje X va una tira con clima, mm de lluvia y saldo del día (real hacia atrás, esperado hacia adelante). Queda alineada con los puntos del gráfico (plugin `alinearTira`).
- **Tablero → Balance:**
  - Las tarjetas superiores se reemplazan por dos ecuaciones visuales: 🚛 Entró ➜ 🏔️ Variación de la playa (stock, nivel y días) ➜ ⚙️ Salió, y lo mismo para el silo.
  - Abajo, chips con t/camión, t/palada, densidad y rechazos.
- **Gráficos diarios de Playa y Silo:** ingresos hacia arriba, salidas hacia abajo y un rombo con el saldo del día (verde si el stock crece, rojo si baja).
- **Renombre:** «Camiones declarados en cantera» pasa a «Cargas completas a camiones en cantera».
- **Revisión → Viajes ↔ balanza:**
  - Esquema de las dos bases (📒 talonarios, ⚖️ balanza) con los 3 pasos del cruce y cuántos unió cada uno.
  - Barra con lo que hay solo en talonarios, lo que coincide y lo que hay solo en balanza.
  - Lista registro por registro por día: viaje a la izquierda, vínculo en el medio, pesaje a la derecha. Muestra las diferencias, las posibles coincidencias para confirmar (🤔) y el sentido de la búsqueda.
  - Filtros por tipo.
- Solo cambia el frontend (caché `tierra-cevil-v20`).

## Novedades v15 · Informes visuales

- **Paleta:**
  - cabecera tierra oscura;
  - colores fijos por significado: verde = entra, naranja = sale, tierra = stock de playa, pizarra = silo;
  - resumen rápido en tarjetas tipo semáforo.
- **Estado de la playa de molienda:**
  - Tarjeta grande «Stock hoy» con m³, paladas, nivel respecto del máximo, variación de 7 días y días que alcanza.
  - Al lado, dos tarjetas con lo que lo explica: 🚛 Ingresó y ⚙️ Se molió.
  - Gráfico de variación diaria: ingreso hacia arriba, molienda hacia abajo y saldo con número; los 7 días proyectados en tono claro, con clima.
  - Proyección con indicadores y gráfico de stock (calculado, esperado y rango).
  - Tablas de detalle con columna de saldo y barra de stock.
- **Informes diario, semanal y mensual:** la misma tarjeta de stock para playa y silo, con la variación día por día de cada uno.
- **Molienda:** tarjeta de stock del silo con lo que entró de molienda y lo que salió a producción.
- **Todas las secciones:** encabezados con emoji. Los gráficos son tablas HTML compatibles con Gmail y Outlook, y en celular las columnas se apilan.
- Actualizar: reemplazar `Informes.gs` y publicar una nueva versión de la implementación.

## Novedades v16 · Reparto de la playa en acopios

Pestaña nueva en Acopios → «Reparto de la playa». La usan el rol molienda y el administrador.

- **Ecuación:** Stock de la playa (balance) = En acopios + Sin ubicar.
  - Una barra muestra la parte de cada acopio.
  - Un desplegable explica de dónde sale lo «sin ubicar»: foto sin repartir, camiones sin acopio, molienda sin acopio y otros.
- **1. Foto inicial:** se toma desde el último ajuste de playa que no sea «Corrección».
  - Se carga la cantidad de cada acopio en t o m³; los m³ se convierten con la densidad vigente.
  - Una fecha posterior al ajuste funciona como nueva medición del acopio.
  - Desde ahí, cada acopio cuenta solo los ingresos y consumos con fecha ≥ a su medición.
  - Hoja nueva: `UbicacionesAcopio`.
- **Calidad general por acopio:** Muy buena, Buena, Regular o Mala, con nota.
  - Se guarda en las columnas nuevas de Acopios (`calidadGral`, `calidadNota`, `calidadFecha`).
  - Se ve como un punto de color en el plano y como un chip en la tarjeta del sector.
- **2. Camiones sin acopio:** tickets desde el ajuste, agrupados por día y origen (el origen sale del cruce con los viajes).
  - Se sugiere el acopio activo con el mismo origen (✨) y se asigna en bloque.
  - Los rechazados por calidad no aparecen.
- **3. Molienda sin acopio:** turnos desde el ajuste, agrupados por día. Se marcan día o turnos y se asignan a un acopio con un %. Lo que no se asigna se descuenta de «Sin ubicar».
- Al marcar un acopio como agotado, el saldo que le quedaba vuelve a «Sin ubicar».
- Se avisa si «Sin ubicar» da negativo, es decir, si se repartió de más.
- Acciones nuevas: `repartoPlaya`, `ubicarAcopios`, `eliminarUbicacion`, `asignarConsumos`, `calidadAcopio`.
- Actualizar: `Code.gs` y `Acopios.gs`, nueva versión de la implementación, `web/` (caché `tierra-cevil-v21`).
- v16.1: el responsable de molienda también dibuja sectores (`guardarSectores` con rol molienda; caché `tierra-cevil-v22`).

## Novedades v17 · Formulario de acopio

- **Varios orígenes por acopio**, con proporción en partes de paladas (2 a 1, 3 a 1) o en %. Hay atajos 50/50, 2 a 1 y 3 a 1.
  - Una barra muestra el reparto y «de cada 10 paladas…».
  - Se guarda en `Acopios.origenes` como `ORIGEN:pct;…`, normalizado a 100 %.
  - `origen` queda como etiqueta «A + B».
  - La sugerencia de acopio para camiones busca coincidencias en cualquiera de los orígenes.
- **Calidad en forma de checklist:** piedras, caliza, basura, tierra negra y raíces, cada una con Poco, Mediano o Mucho.
  - Se guarda en `Acopios.contaminantes`.
  - Si no hay checklist cargado, se lee el valor anterior de `piedrasNivel`.
- **Triángulo de textura USDA interactivo:** se toca un punto o se cargan dos valores y el tercero se completa.
  - Arcilla + limo + arena se validan para que sumen 100 % en la app y en el servidor.
  - El perfil (12 clases USDA) se calcula solo y se guarda en `calidad`.
  - Las mezclas también calculan el perfil a partir de su composición.
- Actualizar: `Code.gs` y `Acopios.gs`, nueva versión de la implementación, `web/` (caché `tierra-cevil-v23`).

## Novedades v18 · Programación de informes y desempeño de camioneros

- **Día de envío:** cada informe semanal tiene su día (lunes … domingo) en Configuración → Informes (columna `Informes.dia`) y cubre los 7 días anteriores. Los mensuales salen siempre el día 1 con el mes anterior completo. `INFORME_SEMANAL_DIA` queda como valor por defecto.
- **Informes nuevos** `choferesSemanal` y `choferesMensual`:
  - KPIs: viajes a planta, toneladas, camioneros y mejor desempeño.
  - Ranking con medallas. Por camionero muestra:
    - viajes (planta + internos) y comparación con el período anterior;
    - viajes por día, t/viaje y ciclo mediano;
    - % con ticket;
    - alertas: sin ticket, patente cargada a mano, salida sin pesar y rechazos.
    - Mapa de calor de viajes por día.
- **Suscripción nueva:** columna `Correos.rChoferes` («Camioneros»).
- Actualizar: `Code.gs` e `Informes.gs`, nueva versión de la implementación, `web/` (caché `tierra-cevil-v24`). Luego tildar «Camioneros» a quien corresponda y activar «Envío automático» en los informes nuevos.

## Novedades v19 · Revisión: candidatos y correcciones de balanza

- **Pesajes sin viaje:** se listan los viajes sin pesaje cuya descarga está a ±8 h. Van primero los de la misma patente (✅), después los de patente parecida y por último por cercanía horaria. Cada uno tiene su botón Asociar (asociación manual en `Asociaciones`).
- **Corregir pesaje** (enlace «corregir» en cada pesaje de Revisión):
  - Se pueden cambiar fecha, hora, dominio, bruto, tara y neto (el neto se recalcula), o anular el pesaje. El motivo es obligatorio.
  - Lo usan abastecimiento y molienda con autorización del administrador (`Solicitudes`, tipo `correccionPesaje`); el administrador lo aplica directo.
  - Hoja nueva `CorreccionesPesaje`, con el dato original en JSON. En `Pesajes` se agregan `corregido` y `claveOrig`.
  - `importarPesajes_` aplica las correcciones al reimportar: no duplica, no pisa y no vuelve a agregar los anulados. Devuelve `corregidos`.
  - Las correcciones se listan en Revisión; el administrador puede deshacerlas (vuelve el dato original).
- Actualizar: `Code.gs`, nueva versión de la implementación, `web/` (caché `tierra-cevil-v25`).

## v19.1

- Configuración → Informes arma la lista desde `INFORMES_DEF`, así los informes nuevos aparecen aunque todavía no existan en la hoja `Informes` (se agregan al guardar).
- Los mensuales salen el **día hábil `INFORME_MENSUAL_HABIL` (por defecto 2)** de cada mes, con el mes anterior completo.
  - Se cuentan de lunes a viernes sin feriados. Los feriados salen de los nacionales fijos, del calendario de feriados de Argentina de Google (`CalendarApp`) y del parámetro `FERIADOS` (ej. `24/09`).
  - Requiere volver a autorizar el script una vez por el permiso de calendario.
- Actualizar: `Code.gs` e `Informes.gs`, nueva versión; `web/` (caché `tierra-cevil-v26`).
- v19.2: `ACCIONES` pasa a construirse la primera vez que se usa (`acciones_()`). Así el script funciona sin importar el orden de los archivos en el editor de Apps Script; antes fallaba con «ReferenceError: correos_ is not defined» si Informes.gs quedaba después de Code.gs.
- v19.3: informe de camioneros sin puntaje.
  - Ranking por cantidad de viajes a planta; los internos van en una columna aparte.
  - KPIs: viajes a planta, toneladas totales, promedio por viaje, camioneros, días trabajados y tiempo promedio de viaje.
  - `kpis_` arma filas de 3 cuando la cantidad de tarjetas es múltiplo de 3.

## v19.4 · Cisterna y modo visualizador

- **Registro de cargas (Tablero → Combustible):** ahora incluye los llenados de la cisterna (`R.cisternaCargas`); antes solo mostraba las cargas a máquinas.
- **Cálculo de la cisterna en `cisterna_`:**
  - Se calcula carga por carga y no por día.
  - Si un llenado supera la capacidad, el nivel se limita a la capacidad y el exceso queda en `excesos`. Si una carga lo deja por debajo de 0, queda en `faltantes`.
  - El panel muestra un aviso solo a usuarios con sesión.
  - Cuando dos registros tienen la misma hora, primero se suma el llenado.
- **Inicio de control:** guarda el nivel medido, la fecha y la hora (columna E «Hora» de Configuración). Desde ahí cuentan solo los movimientos posteriores a esa hora; antes descontaba las cargas del día y podía restarlas dos veces si se anotaban después.
- **Visitantes (sin sesión):** no ven controles ni faltantes.
  - Inicio: sin «Para revisar» ni «Estado de la carga»; se reacomodan cisterna y gráficos.
  - Viajes: sin la diferencia con cantera, % con ticket, columnas Estado y Sin ticket, alertas de dominio, viajes sin ticket, tickets sin viaje ni netos atípicos.
  - Balance: sin ajustes medido vs calculado.
  - Cantera: sin la tarjeta de pala.
  - Combustible: sin mediciones ni consumo entre cargas.
- Caché `tierra-cevil-v27`. Actualizar `Code.gs` y `web/`.

## v20 · Corrección de ajustes y Bases de datos (admin)
- **Configuración → 🗄️ Bases de datos** (`#/datos`, solo admin): lista todas las hojas de la base con cantidad de registros, búsqueda, ✏️ editar, 🗑 eliminar y ＋ agregar. Enlaces directos a la base y a las planillas externas (viajes, cantera/combustible, informe de producción).
- Cada cambio exige motivo y queda en la hoja nueva **AuditoriaAdmin** (antes / después / usuario / fecha). Se crea sola.
- Control de concurrencia: si el registro cambió desde que se abrió, el guardado se rechaza.
- `pinHash` de Usuarios no se muestra. AuditoriaAdmin es solo lectura.
- **Cargar → Ajuste de stock**: el admin tiene ✏️ en cada ajuste registrado (lugar y tipo como lista).
- Backend: `adminHojas`, `adminLeer`, `adminFila` (roles admin, con lock).

## v21 · Informes por correo, personalización, configuración y pantallas más livianas
- **Informes por correo**: los estilos se pasan a cada elemento (CSS en línea) al generar el informe. Gmail, Outlook, el celular y los reenvíos ya no pierden el formato. En el `<style>` queda solo el ajuste para celular. Tablas con clases propias (sin selectores anidados). El mensual queda por debajo de los 102 KB, el límite a partir del cual Gmail recorta el mensaje.
- **Personalizar cada informe** (Configuración → Informes → ✏️ Personalizar contenido):
  - título propio (también se usa en el asunto) y mensaje al inicio;
  - elegir qué bloques aparecen (resumen rápido, control de datos, botón, tarjetas, gráficos y tablas de cada sección);
  - la vista previa muestra los cambios antes de guardar.
  - Columnas nuevas en Informes: `titulo`, `ocultos`, `intro`. Se crean solas.
- **Configuración**: las pestañas se agrupan en Cantera · Viajes y camiones · Informes · Sistema.
- **Visualizadores** (sin sesión): no ven ajustes de stock ni referencias a ellos.
- **Responsable de molienda**: puede importar la balanza de ingreso.
- **Pantallas cargadas**: Balance, Viajes, Cantera, Calidad y Combustible muestran primero los indicadores y gráficos principales. El resto queda en «📋 Ver información detallada», que recuerda si se dejó abierto. En Inicio, «Para revisar» muestra 4 observaciones.

