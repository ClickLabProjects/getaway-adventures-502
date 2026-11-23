# Revisión previa a producción: Getaway Adventures 502

Fecha: 2026-11-22. La hicieron los agentes de `.claude/agents/` (arquitecto, seguridad, calidad, ux-diseno, despliegue).
Después el agente `revisor` comprobó cada hallazgo contra el código.
Ningún archivo del proyecto se modificó durante la revisión.

## Veredicto: listo con condiciones

La base es sólida:

- RLS está activo en todas las tablas `ga_*`.
- El precio, el descuento y el cupo se calculan en Postgres con `select … for update`.
- El público (`anon`) no puede leer reservaciones ni clientes.
- No hay secretos en el repo ni en el historial de git.

Antes de abrir al público hay que cerrar 4 bloqueantes. Cada uno tiene una corrección acotada: días de trabajo, no semanas.

---

## Bloqueantes (4)

### 1. Cualquiera puede bloquear todas las salidas de forma anónima
- **Dónde:** `supabase/admin.sql:56-115` (la función tiene `grant` a anon en `:115`), `supabase/schema.sql:44` (`personas between 1 and 30`), `supabase/seed.sql:86-87` (cupos de 8 a 20).
- **Problema:**
  - Basta un email y un teléfono con formato válido para reservar.
  - Como `personas` acepta hasta 30, **una sola llamada llena una salida**.
  - Con 7 tours × 30 días, unas 210 llamadas bloquean el mes completo.
  - No hay captcha ni límites, y las reservaciones pendientes nunca vencen.
  - Para limpiarlo, el operador tiene que cancelar una por una a mano.
- **Corrección:**
  - Tope de personas por reservación en SQL.
  - Límite de reservaciones por email/teléfono y salida.
  - Columna `expira_at` en las pendientes, para que dejen de contar en el cupo al vencer.
  - Captcha (Cloudflare Turnstile) verificado en una Edge Function, quitándole a anon el `execute` directo.
  - Cancelación masiva en el panel.

### 2. `npm run db:seed` en producción borra la configuración del panel
- **Dónde:** `supabase/seed.sql:73-91`, `README.md:51-52`.
- **Problema:** si se ejecuta en producción:
  - Reactiva los tours dados de baja.
  - Vuelve a poner los precios y las fotos del seed.
  - Borra todas las salidas futuras sin reservas y las regenera abiertas, incluidas las fechas que se cerraron a propósito y las que tenían precio especial.
  - El README lo presenta como un paso normal.
- **Corrección:**
  - Usar `on conflict do nothing`.
  - No borrar salidas existentes.
  - Agregar una protección que aborte si ya hay reservaciones.
  - Actualizar el README.

### 3. Nadie se entera de las reservaciones y el turista no recibe comprobante
- **Dónde:** no existe ningún aviso (ni trigger, ni webhook, ni correo). La confirmación solo vive en el estado de React (`src/pages/TourPage.tsx:29,114`).
- **Problema:**
  - El operador solo ve las reservaciones si abre el panel.
  - Si el turista recarga la página, pierde su código.
- **Corrección:**
  - Database Webhook → Edge Function que avise al operador (correo o WhatsApp) y mande un correo de confirmación al turista.
  - Como mínimo, guardar la confirmación en `sessionStorage`.

### 4. No hay respaldos verificados y el proyecto Supabase posiblemente es compartido *(probable)*
- **Dónde:** `supabase/schema.sql:3` ("Prefijo ga_ para no chocar con otras tablas del mismo proyecto"). No existe ningún script de respaldo, y Storage (`ga-media`) no entra en los dumps de la base.
- **Problema:** depende del plan contratado en Supabase.
  - En el plan gratuito no hay respaldos descargables y el proyecto se pausa por inactividad.
  - Si el proyecto es compartido, otras aplicaciones tienen acceso a los datos de los turistas.
- **Corrección:**
  - Proyecto dedicado al cliente, en plan Pro o con un `pg_dump` diario más una copia de `ga-media`.
  - Hacer una restauración de prueba.

---

## Importantes (18)

| # | Hallazgo | Dónde | Corrección |
|---|---|---|---|
| 1 | Reactivar una reservación cancelada no revisa el cupo (sobreventa), y cancelar no pide confirmación | `Reservaciones.tsx:17-29,99`, `schema.sql:150-152` | Trigger `before update` que valide el cupo; `confirm()` al cancelar |
| 2 | Borrar un tour convierte sus promociones en promociones para todos los tours | `admin.sql:15,51`, `Tours.tsx:47` | `on delete cascade` o desactivar la promo |
| 3 | "Hoy" se calcula en UTC (a partir de las 18:00 de Guatemala ya es mañana) y no hay hora de corte: se puede reservar una salida que ya partió | `schema.sql:76`, `admin.sql:26,49-50,74`, `Promociones.tsx:13`, `Tours.tsx:25,250` | `(now() at time zone 'America/Guatemala')::date`, hora de corte por tour, `hoyGT()` en el frontend |
| 4 | Un código promo escrito sin pulsar "Apply" (o con Enter) se ignora y se cobra el precio completo | `TourPage.tsx:104,264-266` | Validarlo antes de enviar; Enter aplica el código; quitar espacios |
| 5 | Si falla la red al reservar, aparece un error crudo en inglés y el reintento duplica la reservación | `TourPage.tsx:97-112`, `i18n.tsx:327` | Clave de idempotencia (`client_ref` única), mensaje traducido, timeout |
| 6 | Cuando falla la red, el sitio dice "Tour not found", "No departures" o "Sin acceso" | `TourPage.tsx:41-44,60-61,67-74`, `Home.tsx:17-18`, `AdminApp.tsx:51` | Distinguir un error de un resultado vacío; botón de reintentar |
| 7 | El consentimiento de marketing no se puede revocar (`bool_or`) y se puede falsificar con el correo de otra persona | `admin.sql:118-136` | Tomar el de la reserva más reciente, o una tabla de consentimientos; opción para darse de baja |
| 8 | Inyección de fórmulas en los CSV exportados (`= + - @`) | `src/lib/csv.ts:3-7` | Anteponer `'` a esos valores |
| 9 | No hay aviso de privacidad ni forma de borrar los datos de un cliente | `TourPage.tsx:272-274`, `schema.sql:146-164` | Página de privacidad y función para anonimizar a un cliente |
| 10 | El build pasa aunque falten `VITE_SUPABASE_*`, y el sitio sale en blanco | `src/lib/supabase.ts:6-8`, `deploy.yml:29-32` | Paso en CI que falle si esas variables están vacías |
| 11 | Cada push a `main` va directo a producción, sin pruebas ni staging; el frontend y la base se despliegan por separado | `deploy.yml:3-6`, `package.json:8-12` | Pruebas antes del deploy, proyecto de staging, migraciones versionadas |
| 12 | GitHub Pages: las páginas `/tour/*` responden 404 (mal para SEO y para las vistas previas en WhatsApp), `BASE_PATH` está fijo y los términos de Pages excluyen sitios comerciales | `deploy.yml:23,34`, `vite.config.ts:4` | Cloudflare Pages o Netlify, o al menos `BASE_PATH` configurable |
| 13 | Falta la política de cancelación, la forma de pago y el punto de encuentro (**contenido que debe dar el cliente**) | `TourPage.tsx`, sin campos en la base | Que el cliente lo redacte; mostrarlo en la reserva y en la confirmación |
| 14 | El precio por persona no cuadra con los ATV ("passenger pays extra / 50%") | `seed.sql:48,55`, `i18n.sql:45,50`, `admin.sql:90` | Precio de acompañante, o aclarar "precio por vehículo" |
| 15 | El panel carga tablas completas y PostgREST las recorta en silencio a 1000 filas; como el orden es ascendente, se pierden las salidas futuras *(probable)* | `AdminApp.tsx:105-111` | Filtrar por fechas, paginar, calcular métricas en SQL |
| 16 | El enlace de WhatsApp en Reservaciones no antepone el 502 | `Reservaciones.tsx:90` vs `Clientes.tsx:9-12` | Usar `telWa` compartido |
| 17 | En el celular, el zoom automático del mapa bloquea el scroll | `mapa.css:11`, `MapaTours.tsx:209` | `touch-action: none` solo cuando el zoom es manual |
| 18 | El panel no permite cambiar la fecha ni las personas de una reservación *(nuevo, agregado por el revisor)* | `Reservaciones.tsx` | RPC `ga_mover_reservacion` que valide el cupo |

---

## Mejoras

**Datos:**
- El panel acepta un cupo menor a lo ya vendido, un precio vacío (que se guarda como Q0) y promociones de 100% sin pedir confirmación.
- Tras un error de cupo, la fecha agotada queda seleccionada.
- No hay historial de cambios de estado.
- Faltan checks: `total_q >= 0` y el patrón del slug.
- Una promo de 0% siempre se rechaza.
- No hay promociones privadas ni límite de usos.
- El filtro "Enviar a clientes" no filtra nada (`Clientes.tsx:46`).
- El `mailto` con muchos destinatarios en CCO se corta.
- "Por cobrar" incluye viajes que ya pasaron.
- Faltan campos para crecer: `lang`, `updated_at` y `operador_id`.

**Migraciones y despliegue:**
- `ga_crear_reservacion` está duplicada en `schema.sql` y `admin.sql`, y el orden en que se corren los scripts no está documentado.
- El CI usa Node 20, que ya llegó a fin de vida; las actions no están fijadas por SHA y se usa `cancel-in-progress: true`.
- No hay separación entre staging y producción.
- El panel admin viaja en el bundle principal; conviene cargarlo con `React.lazy`.
- Los scripts usan `rejectUnauthorized: false`.
- Probablemente el registro público de Auth está activo y no hay MFA.
- `react-router-dom` tiene avisos moderados de seguridad.

**Seguridad menor:**
- No hay CSP (se puede poner una meta CSP incluso en Pages).
- El `mailto:` no usa `encodeURIComponent`.
- `imagen_url` va sin comillas dentro de `url()`.
- Quedan fotos huérfanas en Storage y las imágenes HEIC fallan.

**UX y accesibilidad:**
- Los inputs miden 14 px y provocan zoom en iOS.
- El hero ocupa 2.25 pantallas antes de ver los tours.
- El contraste de `.btn` es 3.7:1 (no llega a AA).
- Hay botones táctiles de menos de 44 px.
- Faltan `aria-pressed`, `aria-live` y `role=alert`.
- El lightbox no atrapa el foco y no se respeta `prefers-reduced-motion`.
- La confirmación no hace scroll arriba ni mueve el foco.
- El editor del panel se cierra sin avisar si hay cambios sin guardar.
- En i18n, la promo aparece en español, dice "1 spots" y `capitalize` deforma las fechas.
- Las imágenes no tienen `srcset`.
- Hay archivos grandes y lógica duplicada ("ocupados", "hoy").

## Descartados
- Diferencia de Q0.01 entre el total del cliente y el del servidor: la base usa el total calculado por el servidor.
- "`.env.example` incompleto": sí trae las 3 variables que usa el código.
- PGRST203 por la sobrecarga de la función: el frontend manda los 8 argumentos con nombre.
- Códigos promo legibles por anon: es intencional, porque la portada los muestra.
- Token de admin en `localStorage`: es lo estándar en supabase-js y no se encontró una vía de XSS.

---

## Orden recomendado de corrección

1. **Migración SQL nueva y versionada:**
   - En `ga_crear_reservacion`: tope de personas, límites, `expira_at`, `client_ref` y hora de corte en hora de Guatemala.
   - Trigger de cupo.
   - FK de promociones.
   - Consentimiento y función para anonimizar clientes.
   - Checks faltantes, `titulo_en` en la validación de promo, historial de estados y RPC para mover reservaciones.
   - Borrar la versión vieja de la función.
2. **`seed.sql` y README:** que el seed no sea destructivo y quede documentado el orden de los scripts.
3. **Edge Functions:** aviso al operador, correo al turista y captcha.
4. **Configuración de Supabase (sin código):** respaldos, proyecto dedicado, desactivar el registro público y MFA.
5. **`TourPage.tsx` / `i18n.tsx`:** errores de red, promo, idempotencia, confirmación persistente y accesibilidad. Más el contenido de políticas y el precio de los ATV cuando el cliente los entregue.
6. **Panel admin:** confirmación al cancelar, `telWa`, CSV, paginación, validaciones y fotos huérfanas.
7. **CI y hosting:** validar las variables, Node 22/24, actions por SHA, pruebas antes del deploy y decidir el hosting.
8. **CSS y componentes:** mapa, inputs a 16 px, contraste, botones táctiles y reduced-motion.
9. **Rendimiento y pruebas:** `React.lazy`, imágenes, y el plan de pruebas de abajo.

## Plan de pruebas (propuesto por el agente de calidad)

| Prioridad | Tipo | Qué cubre |
|---|---|---|
| P0 | SQL (pgTAP / `supabase test db`) | `ga_crear_reservacion`: última plaza, límites, precios y promos; concurrencia con `for update`; RLS para anon, usuario autenticado sin rol y admin |
| P1 | Vitest | CSV, `asset`/`formatFecha`, cálculo de totales, métricas del dashboard, claves de i18n y `hoyGT()` |
| P2 | Playwright | Reservar con y sin promo, con red fallida y por la última plaza; idioma y recarga de rutas en Pages; flujo del admin |
| P3 | CI | Bloquear el deploy si fallan las pruebas o faltan las variables |
