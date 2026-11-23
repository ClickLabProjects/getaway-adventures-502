# Arquitectura objetivo: separar backend y frontend

Propuesta del agente `arquitecto`, 2026-11-23, sobre la rama `dev`. **Estado: pendiente de aprobación del dueño.**
Parte de `docs/producto/` (borrador de la ronda 1, con preguntas abiertas).

## Decisión propuesta

**Seguir con Supabase como backend (BaaS), en un solo repositorio, con las capas bien separadas dentro de él.**

"Separar" no significa crear un servidor propio ni repos aparte. Significa separar responsabilidades, contratos y
formas de desplegar:

- **Frontend:** `src/`, organizado por módulos (`features/`). El panel admin se carga aparte, solo cuando se entra a `/admin`.
- **Base de datos:** `supabase/migrations/`, con migraciones versionadas usando Supabase CLI.
- **Servidor:** `supabase/functions/`, con Edge Functions para todo lo que necesite secretos, servicios externos o la IP del usuario.
- **Pruebas:** `supabase/tests/` (pgTAP) y `e2e/` (Playwright).

Lo que falla hoy no es la falta de una API propia. Faltan tres cosas:

1. **Migraciones versionadas.** Hoy son scripts que se reaplican a mano y no dejan registro de versión.
2. **Una capa de servidor** para captcha, correos, vencimientos y pagos.
3. **Un contrato tipado.** Los tipos están escritos a mano y los errores se reconocen comparando textos en español.

### Opciones comparadas

| Opción | Veredicto | Motivo |
|---|---|---|
| a) Supabase + capas claras en un repo | **Recomendada** | Conserva lo que funciona (RLS, cupo atómico) y agrega lo que falta. Cada carpeta corresponde a un agente. |
| b) Monorepo con apps separadas (público / admin) | Todavía no | Duplica configuración y despliegues para unas 1.300 líneas de admin. `React.lazy` logra lo mismo. |
| c) API propia (Node: Hono, Fastify o Nest) | No | Hay que hospedarla y pagarla. Reescribe lo que ya resuelve RLS y crea un segundo lugar donde vivirían las reglas de cupo. |
| d) Repos separados | No | Cada cambio de contrato exige PRs coordinados en dos repos, y los agentes pierden contexto. |

**Cuándo cambiar de opción:**
- **A la (b):** si aparece un segundo frontend con otro ciclo de publicación (por ejemplo, una app para guías) o si el equipo crece.
- **A la (c):** solo si se deja Supabase o llegan integraciones de proceso largo (OTAs, conciliación bancaria). Aun así, sería un servicio pequeño al lado de Supabase, no uno que lo reemplace.

## Quién decide qué

- **Navegador:** muestra y valida para la experiencia de uso. Nunca decide.
- **SQL** (RLS, funciones RPC, triggers, `pg_cron`): decide dinero, cupo, estados y permisos.
- **Edge Functions:** lo que necesite un secreto, un servicio externo, la IP del cliente o un webhook entrante.

| Módulo | Navegador | SQL | Edge Functions |
|---|---|---|---|
| Catálogo | Mostrar, mapa, i18n, formulario admin | Lectura pública con RLS, salidas disponibles, cupo mínimo, hora de corte (Guatemala) | Más adelante: regenerar páginas al editar un tour |
| Reservas | Formulario, total estimado, confirmación en `sessionStorage` | `ga_crear_reservacion` (tope de personas, límites, `client_ref`, `expira_at`), `ga_cambiar_estado`, `ga_mover_reservacion`, historial | `crear-reserva`: captcha Turnstile y límite por IP, luego llama a la RPC |
| Pagos | Registrar pagos | `ga_pagos` (solo inserción), saldo, trigger a "pagada" | F2: webhook y enlace de pago |
| Notificaciones | — | Tabla de pendientes de envío ("outbox") llenada por trigger, `pg_cron` | `procesar-notificaciones` (correo / WhatsApp) |
| Cuentas | Login, MFA | `ga_personal(user_id, rol)`, `ga_tiene_rol()`, RLS por rol | F2: `invitar-usuario` |
| Operación | Vistas, impresión | RPC paginadas | Lista del día por correo (F2) |
| Dashboard | Gráficas | `ga_dashboard_metricas(desde, hasta)` | — |
| Promociones | CRUD, mostrar | Validación, límite de usos, qué pasa al borrar el tour | — |
| Clientes | Lista, CSV seguro | Vista paginada, consentimientos, anonimizar | `baja-marketing` con enlace firmado |
| Políticas | Mostrar, aceptar | `ga_politicas` versionada; la reserva guarda la versión aceptada | — |
| Tareas programadas | — | `pg_cron`: vencer pendientes, recordatorios | Invocadas con `pg_net` |

## Estructura de carpetas objetivo

```
src/                         FRONTEND (una SPA; admin en un chunk aparte)
  app/                       main.tsx, router.tsx (React.lazy para /admin)
  features/
    catalogo/  reservas/  politicas/  mi-reserva/ (F2)
    admin/                   dashboard/ reservaciones/ tours/ promociones/ clientes/ pagos/ usuarios/ (F2)
                             (cada módulo con su api.ts)
  components/                UI compartida
  lib/                       supabase.ts (tipado), fechas.ts (hoyGT), dinero.ts, csv.ts, errores.ts, i18n/ (es.ts, en.ts)
  types/                     database.types.ts (GENERADO) y dominio.ts (alias)
supabase/                    BACKEND
  config.toml
  migrations/                <timestamp>_baseline.sql, <timestamp>_limpieza.sql, … (nunca se editan)
  functions/
    _shared/                 cors, cliente admin, turnstile, correo, plantillas, contratos.ts (tipos compartidos)
    crear-reserva/  procesar-notificaciones/  baja-marketing/  mi-reserva/ (F2)  webhook-pagos/ (F2)
  tests/                     pgTAP
  seed.sql                   solo local y dev, no destructivo
  legacy/                    schema.sql, admin.sql, i18n.sql y seed.sql actuales, marcados "NO EJECUTAR"
e2e/                         Playwright
docs/arquitectura/           decisiones (ADR) y contrato
docs/operacion/              respaldos, restauración, promover a producción
.github/workflows/           ci.yml (PR), deploy-dev.yml, deploy-prod.yml (con aprobación humana)
```

## Contrato entre frontend y backend

1. **Lecturas públicas:** por tablas o vistas con RLS. Más adelante, vistas con columnas explícitas.
2. **Escrituras con reglas de negocio:** solo por RPC. Se retira el `update` directo sobre `ga_reservaciones`.
3. **CRUD del catálogo en el admin:** directo con RLS, más triggers que protejan las invariantes.
4. **Lo que necesita un secreto o la IP:** `supabase.functions.invoke(...)`, con tipos en `_shared/contratos.ts`.
5. **Errores:** códigos estables (`GA_CUPO_INSUFICIENTE`, etc.) y un mapa a i18n en `lib/errores.ts`.
6. **Tipos:** se generan con `supabase gen types` y se usa `createClient<Database>`. El CI falla si el SQL cambió y nadie regeneró los tipos.
7. **Cambios de firma en tres pasos:** primero se agrega lo nuevo, luego se despliega lo que lo usa y al final se borra lo viejo.

## Roles sin rehacer todo

- **F1:** `ga_personal(user_id, rol: dueno | admin | personal | guia)` y `ga_tiene_rol()`. `ga_es_admin()` se conserva para no romper las políticas existentes.
- **F2:** el rol de personal solo cambia políticas. Los usuarios se crean con `invitar-usuario`, que solo puede usar el dueño.
- **F3, guía:** asignado por salida, ve una vista con los datos mínimos.
- **F3, clientes registrados:** desde que exista el registro público, ninguna política puede apoyarse solo en "usuario autenticado". Una prueba pgTAP lo garantiza.
- **Hoy:** desactivar el registro público en Supabase Auth y activar MFA para el personal.

## Ambientes

| | Local | Dev (pruebas) | Producción |
|---|---|---|---|
| Base de datos | `supabase start` (Docker) | Proyecto Supabase **dev** propio | Proyecto Supabase **dedicado**, con respaldos |
| Funciones | `supabase functions serve` | Desplegadas por CI al integrar en `dev` | Desplegadas por CI al integrar en `main`, con aprobación |
| Frontend | `npm run dev` | GitHub Pages | Cloudflare Pages (u otro con uso comercial), dominio propio |

Orden de cada despliegue:
1. Respaldo (solo en producción).
2. `supabase db push`.
3. Edge Functions.
4. Frontend.
5. Prueba de humo.

Ningún agente ejecuta `db push`: lo dispara un merge aprobado por una persona.

## Plan de migración (el sitio funciona después de cada paso)

| # | Qué cambia | Riesgo | Quién |
|---|---|---|---|
| 0 | Crear el proyecto Supabase dev y las variables `*_DEV`. Que el build de dev falle si faltan. | Bajo | Persona + dev-mecanico |
| 1 | `supabase init` (sin cambios de esquema) | Nulo | dev-mecanico |
| 2 | Baseline: una persona exporta el esquema real como primera migración. Los SQL viejos pasan a `legacy/` y se retiran los `db:*`. | **Medio** | dev-backend + persona |
| 3 | `seed.sql` nuevo, solo local y no destructivo | Bajo | dev-backend |
| 4 | Pruebas pgTAP del comportamiento actual (RLS, reserva) | Nulo | dev-pruebas |
| 5 | CI en cada PR: tsc, pgTAP y verificación de tipos | Bajo | dev-pruebas |
| 6 | Tipos generados y `createClient<Database>` | Bajo | dev-frontend |
| 7 | Limpieza: borrar la versión vieja de `ga_crear_reservacion`, `ga_hoy_gt()`, índices | Bajo | dev-backend → seguridad |
| 8 | Reorganizar `src/` en `features/` y cargar el admin con `React.lazy` | Medio | dev-mecanico (en paralelo con el 7) |
| 9 | Pipeline de despliegue del backend para dev y prod | Medio | dev-pruebas → despliegue |
| 10–12 | Reservas: nuevas reglas, `crear-reserva` con captcha y después quitarle a anon el acceso directo | Medio | dev-backend, dev-frontend → seguridad |
| 13 | Notificaciones (outbox, función, `pg_cron`) | Medio | dev-backend |
| 14 | RPC del admin: estados, mover reserva, paginación, métricas | Medio | dev-backend, dev-frontend |
| 15 | Pagos, políticas y personal | Medio | dev-backend → seguridad |
| 16 | Hosting de producción, dominio y vistas previas por tour | Medio | dev-frontend + despliegue + persona |

Del paso 0 al 9 es solo la separación y no cambia ninguna regla de negocio. Del 10 en adelante es la Fase 1 del
producto, ya sobre la estructura nueva.

## Hallazgos nuevos

- **[BLOQUEANTE, verificado] Dev usa la base de datos principal.** `deploy.yml` usa
  `vars.VITE_SUPABASE_URL_DEV || vars.VITE_SUPABASE_URL`, y en GitHub **no existen** las variables `_DEV`.
  Cualquier prueba en el sitio de dev crea reservas, tours o promociones en la base real.
- **[BLOQUEANTE] Las migraciones no tienen versión.** Si se vuelve a correr `schema.sql`, revive una versión pública
  de `ga_crear_reservacion` que se salta las correcciones futuras (tope de personas, captcha). No se sabe si ya existe en
  producción.
- **[IMPORTANTE]** El captcha no sirve mientras anon pueda llamar directo a la RPC.
- **[IMPORTANTE]** El panel cambia estados con `update` directo, sin validar cupo, y calcula las métricas en el navegador.
- **[IMPORTANTE]** Los errores dependen del texto en español de las excepciones.
- **[IMPORTANTE]** Los tipos están escritos a mano y no se verifican contra el esquema.
- **[IMPORTANTE]** "Hoy" se calcula en UTC.
- **[IMPORTANTE]** El SQL mezcla esquema y contenido.
- **[MEJORA]** El admin va dentro del bundle público.
- **[MEJORA]** Hay archivos grandes con varias responsabilidades.
- **[MEJORA]** Decidir ya si habrá varias empresas operando en el sistema (multiempresa).

## Respuestas a las preguntas del arquitecto (P-A1..A9)

- **A1 Anti-robots:** Edge Function con Turnstile y límite por IP, más límites dentro de la RPC (máximo 10 personas y 2 pendientes por contacto). Al final se le quita a anon el acceso directo.
- **A2 Vencimiento:** el cupo cuenta solo las pendientes no vencidas (correcto al instante) y `pg_cron` las marca como vencidas cada 5 minutos.
- **A3 Avisos:** outbox en la base, `pg_cron` + `pg_net` y la función de envío. Correo con Resend o Postmark (requiere dominio propio). En F1, WhatsApp sigue siendo manual.
- **A4 Pagos:** tabla `ga_pagos` en la que solo se agregan registros, con anulaciones por RPC, vista de saldo y trigger a "pagada". Una referencia única hace idempotentes los webhooks.
- **A5 Acompañante:** tarifas por tour (`ga_tour_tarifas`) y líneas por reserva. El tour define si el cupo se cuenta en personas o en vehículos.
- **A6 Mi reserva:** Edge Function que envía por correo un enlace firmado (24 h). No se consulta con código + correo directo, porque se podría adivinar.
- **A7 Políticas:** `ga_politicas` versionada; la reserva guarda la versión aceptada.
- **A8 Hosting:** Cloudflare Pages para producción, con páginas pre-generadas por tour para SEO y WhatsApp. Dev sigue en GitHub Pages.
- **A9 Panel con mucho volumen:** RPC paginadas, métricas en SQL e índices.

## Decisiones pendientes del dueño

1. Proyectos Supabase: uno dedicado para producción con respaldos y otro para dev. ¿Quién los paga?
2. Hosting de producción y dominio propio. ¿Cloudflare Pages?
3. Proveedor de correo (Resend o Postmark). ¿WhatsApp automático en Fase 1 o sigue manual?
4. ¿Turnstile (Cloudflare) como captcha?
5. ¿Varias empresas en los próximos 12 meses? Define si las tablas nuevas llevan `empresa_id`.
6. ¿Desarrollo local con Docker o solo contra el proyecto dev?
7. ¿Quién aprueba los despliegues a producción?

## Lo que se conserva

Cupo, precio y descuento en Postgres con bloqueo; RLS en todas las tablas; el público no lee reservaciones;
el prefijo `ga_`; la optimización de imágenes; las ramas `dev`/`main` y CODEOWNERS.

## Límites de esta revisión

No se pudo compilar ni medir el bundle (no hay `node_modules`) ni consultar la base real. `MapaTours.tsx`,
`Clientes.tsx` y `Promociones.tsx` se revisaron solo de forma parcial.
