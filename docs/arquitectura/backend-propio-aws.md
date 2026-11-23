# Arquitectura objetivo: backend propio en AWS

Propuesta del agente `arquitecto`, 2026-11-23. **Estado: pendiente de decisiones del dueño (ver al final).**

> **Actualización 2026-11-23: hosting en AWS Lightsail.** El dueño pidió lo más barato posible sin salir de AWS.
> La API corre en un **servidor Lightsail de 1 GB** con Docker y la base es la **PostgreSQL administrada de
> Lightsail**, en lugar de ECS Fargate + ALB y RDS. Producción cuesta ≈ 25 USD/mes (ver `costos-mensuales.md`).
> Se mantienen Cognito, SES, S3 + CloudFront, Turnstile, dbmate y el resto del diseño.
>
> Cambios que esto implica:
> - Las secciones de ECS, ALB, WAF, bastión y Multi-AZ quedan como referencia para cuando el negocio crezca.
> - Sin autoescalado: se escala a mano subiendo de plan, avisado por las alarmas de Lightsail.
> - Sin rol IAM en el servidor: la API usa una llave de acceso limitada a SES y Cognito.
> - Las migraciones de producción corren desde el propio servidor (no desde una tarea ECS).

## Lo que decidió el dueño

- Supabase deja de ser el backend (BaaS). Habrá una **API propia** entre el navegador y la base de datos.
- Supabase se queda **solo como Postgres para dev**. En producción la base será **Amazon RDS PostgreSQL**.
- El inicio de sesión se hace con **Amazon Cognito**.
- **No se lanza la versión actual.** Producción espera a tener el backend nuevo.
- El lenguaje se elige entre **NestJS** y **.NET** a partir de la comparación de abajo.

## Resumen de la propuesta

- **Un solo repositorio (monorepo)** con la API en **NestJS** (Node LTS, adaptador Fastify, Kysely, zod).
- La API corre en **ECS Fargate**, detrás de **CloudFront + ALB**, en el mismo dominio que el sitio.
- **RDS PostgreSQL 17** en una subred privada.
- **Cognito** solo identifica al usuario; los roles se guardan en la base de datos.
- Migraciones en **SQL plano con dbmate** e infraestructura con **Terraform**.
- Costo estimado de producción: **USD 70-130 al mes** (supuesto).

## 1. NestJS frente a .NET

| Criterio | NestJS (Node + TypeScript) | .NET 10 (ASP.NET Core, C#) |
|---|---|---|
| Quién lo respalda | Nest: MIT, núcleo pequeño (Trilon y patrocinios). Node: OpenJS Foundation | Microsoft y la .NET Foundation |
| Soporte a largo plazo (LTS) | Node tiene LTS de unos 30 meses. **Nest no tiene una política LTS escrita**; saca una versión mayor al año aproximadamente | **.NET 10 LTS con soporte hasta nov. 2028**. Versiones anuales y predecibles. (.NET 8 ya terminó su soporte) |
| Rendimiento a nuestra escala | Más que suficiente. El límite real es Postgres, no el framework | Más rápido en benchmarks. En la práctica, empate |
| Postgres, ORM y migraciones | Kysely o Drizzle (SQL tipado), Prisma o TypeORM. Hay que elegir uno | EF Core + Npgsql, el estándar y muy maduro |
| Cognito / JWT | `aws-jwt-verify` (oficial), unas 30 líneas | `AddJwtBearer`, integrado |
| OpenAPI | `@nestjs/swagger` o zod; puede desalinearse del código | Integrado desde .NET 9 |
| Tareas programadas | `@nestjs/schedule` | `BackgroundService`, Quartz o Hangfire |
| **Tipos compartidos con el frontend** | **Mismo lenguaje**: los esquemas zod sirven para el formulario y la API, y un solo `tsc` lo revisa todo | Hay que generar el cliente TypeScript desde OpenAPI (un paso más, dos lenguajes) |
| Curva para el equipo actual (TypeScript) | Baja | Lenguaje nuevo |
| Desarrolladores en Guatemala / LatAm (supuesto) | Muchos perfiles JS/TS full-stack | Muchos en C#, sobre todo en banca y empresa; suelen ser más caros |
| Agentes IA (Sonnet) | Muy bien; frontend y API en un mismo lenguaje | Muy bien; compilador estricto, pero hay que cambiar de lenguaje y regenerar el contrato |

**Recomendación: NestJS.** Un solo lenguaje, contratos compartidos sin generar código y un mismo perfil de desarrollador.
El riesgo de que Nest madure poco se acota así:
- la lógica vive en servicios TypeScript sin decoradores y en SQL;
- si Nest se estanca, migrar a Fastify o Hono sería rehacer los controladores, no el dominio;
- se fijan las versiones y se actualiza una vez al año.

**Cuándo convendría .NET:**
- si quien lo va a mantener es un equipo C#;
- si el cliente exige un LTS contractual de un proveedor grande;
- si hay integración con el ecosistema Microsoft (por ejemplo, facturación FEL con un SDK .NET);
- si se elige Lambda y el arranque en frío importa.

Todo lo demás (AWS, base de datos, Cognito, repositorio, CI y fases) vale igual para los dos lenguajes.

## 2. Arquitectura objetivo (producción)

```
                   https://<dominio-agencia>  (Route 53 + ACM)
Navegador ──► CloudFront  [WAF: límite por IP; cabeceras de seguridad]
  │             ├─ /*        → S3 "web" (SPA)
  │             ├─ /media/*  → S3 "media" (imágenes)
  │             ├─ /tour/*   → API (HTML con meta OG por tour, para WhatsApp/SEO)
  │             └─ /api/*    → ALB → ECS Fargate: API + worker (mismo contenedor)
  │                                    ├─ RDS PostgreSQL (subred privada, rol ga_app, TLS)
  │                                    ├─ SES (correo) · Turnstile (captcha) · S3 (subidas prefirmadas)
  │                                    └─ Secrets Manager / SSM · CloudWatch (logs y alarmas)
  └──► Cognito (inicio de sesión del personal, código + PKCE)
Dev:   mismo diseño, base de datos = Supabase usado como Postgres simple (sin Data API)
Local: docker compose (postgres:17 + api + mailpit) + vite
```

**Módulos de la API** (según `docs/producto/modulos.md`):
- `catalogo`, `reservas`, `pagos`, `notificaciones`, `cuentas`, `operacion`, `dashboard`, `promociones`, `clientes`, `politicas` y `media`;
- además, una capa `plataforma` con configuración, base de datos, autenticación, errores, reloj de Guatemala, outbox, jobs y auditoría.

Cada módulo sigue el mismo patrón: controller (HTTP y roles) → service (casos de uso y transacción) → repo (SQL tipado).

### Dónde vive cada regla (RLS deja de ser la barrera principal)

| Regla | Navegador | API | SQL |
|---|---|---|---|
| Cupo | Muestra lo disponible | Transacción con `SELECT … FOR UPDATE` | **Trigger** que impide pasarse del cupo aunque la API tenga un bug; el cupo no puede bajar de lo vendido |
| Precio, descuento y total | Solo muestra un estimado | `Cotizador` (función pura con pruebas) | CHECK `total = subtotal - descuento` y que ninguno sea negativo |
| Tope de personas y límite por contacto | Límite en el campo | Se valida dentro de la transacción | CHECK de personas entre 1 y 30 |
| Anti-robots | Widget Turnstile | Verifica el token | — |
| Vencimiento de pendientes | — | El worker las marca como vencidas y avisa | El cupo solo cuenta pendientes con `expira_at > now()` |
| Estados de la reserva | Botones | Máquina de estados con motivo obligatorio | CHECK de estados y trigger de historial |
| Hora de Guatemala | `hoyGT()` solo para mostrar | Servicio `reloj` | `now() at time zone 'America/Guatemala'` |
| Permisos por rol | Oculta los menús | **Guarda global que niega todo por omisión**, `@Roles` y filtro por actor | GRANT mínimos por rol de base de datos |
| Idempotencia | Genera `Idempotency-Key` | Lo exige | `unique (client_ref)` |

Las funciones `security definer` y el rol anónimo de la base de datos desaparecen.

## 3. Base de datos

- **Misma versión mayor (Postgres 17)** en local, dev (Supabase) y producción (RDS). Esquema propio `ga`, no `public`.
  En Supabase de dev se apaga la Data API.
- **Lo que hay que quitar porque no existe en RDS:**
  - `auth.users`, `auth.uid()`;
  - los roles `anon` y `authenticated`;
  - `storage.*`, `notify pgrst`, `pg_net` y `pg_cron`;
  - `make-admin`, que lee `auth.users`.
- **Migraciones con dbmate:** SQL plano en `db/migrations/`, con la tabla `schema_migrations` como registro de versión.
  No depende del lenguaje de la API.
- **Roles de base de datos:**

  | Rol | Uso |
  |---|---|
  | `ga_owner` | Dueño del esquema; nadie se conecta con él |
  | `ga_migrator` | Lo usa CI para aplicar migraciones |
  | `ga_app` | Lo usa la API: sin DDL y sin DELETE en reservaciones, pagos ni historial |
  | `ga_lectura` | Soporte y reportes |

- **Dev con Supabase:** la conexión directa solo funciona por IPv6, así que se usa el **pooler en modo sesión
  (puerto 5432)**. El plan gratuito se pausa si no hay actividad.
- **Pasar de Supabase a RDS:**
  1. Una persona exporta el esquema real (`pg_dump --schema-only`). Con eso se escribe la línea base portable;
     no se toma de los `.sql` del repo, porque no se sabe qué versión corre de verdad.
  2. Se migra solo lo que sirva (probablemente el catálogo).
  3. Las imágenes se pasan a S3 y en la base se guarda la clave de cada archivo, no la URL de Supabase.
  4. Se ensaya todo en un RDS temporal antes de hacer el cambio definitivo.

## 4. Servicios AWS

| Necesidad | Propuesta |
|---|---|
| API | **ECS Fargate (ARM, 0,25-0,5 vCPU) + ALB**, sin NAT Gateway |
| Frontend | S3 + CloudFront (se deja GitHub Pages) |
| Imágenes | S3 privado servido por CloudFront `/media/*`. Las subidas usan un POST prefirmado de hasta 5 MB |
| Correo | SES (hay que verificar el dominio con DKIM/SPF/DMARC y pedir salir del sandbox) |
| Tareas programadas | Worker dentro del contenedor con bloqueo en Postgres (vencer pendientes cada 5 min, enviar avisos pendientes cada 30 s). Más adelante se puede pasar a EventBridge Scheduler |
| Secretos | Secrets Manager (base de datos, Turnstile) y SSM (configuración). GitHub entra por OIDC, sin claves fijas |
| Anti-abuso | Turnstile, regla de WAF por tasa y límites de negocio dentro de la transacción |
| Logs y alarmas | CloudWatch, sin datos personales en los logs |
| Respaldos | RDS con respaldo automático de 14 días, restauración a un punto en el tiempo, protección contra borrado y snapshot antes de cada migración. Restauración de prueba una vez al mes |
| Infraestructura como código | **Terraform / OpenTofu**. Solo una persona ejecuta `apply` |

**Opciones de hosting para la API** (producción, USD al mes, supuesto us-east-1):

| Opción | Total aprox. | Veredicto |
|---|---|---|
| **ECS Fargate + ALB** | 35-50 | **Recomendada** |
| App Runner | 40-65 | No: para llegar a RDS privado necesita NAT |
| Lambda + API Gateway | 55-65 | No: necesita NAT y RDS Proxy, y el arranque en frío afecta a la reserva |
| EC2 + Docker | 15-20 | Solo si manda el presupuesto: hay que administrarlo y es un único punto de falla |

## 5. Inicio de sesión con Cognito

- **Pool "personal"** sin registro público y con **MFA TOTP obligatorio**. Un **pool "clientes" separado en la Fase 3**.
- **Cognito solo autentica.** El rol vive en `ga.usuarios_panel(cognito_sub, rol, activo)`.
  Así se puede quitar el acceso al instante y queda auditado.
- **Frontend:** `oidc-client-ts` con flujo de código + PKCE; el token se guarda en memoria.
- **API:** verifica el access token (`iss`, `token_use`, `client_id`, `exp`) y después carga el rol.
  Si el usuario no está o está inactivo, responde 403.
- **Admins actuales:** se recrean en Cognito con `AdminCreateUser`. Lo hace una persona.

## 6. Repositorio y contrato

```
apps/web/          frontend actual (features/, lib/api, lib/auth, React.lazy para /admin)
apps/api/          API (plataforma/, modulos/<dominio>/, pruebas, Dockerfile)
packages/contratos openapi.json generado, cliente TS, códigos de error, esquemas zod
db/                migrations/, tests/ (pgTAP), seed/local.sql, bootstrap/roles.sql, legacy/ (SQL actual: NO EJECUTAR)
infra/             módulos Terraform (red, rds, api-ecs, web-cdn, media, cognito, ses, observabilidad, waf) y envs/{dev,prod}
e2e/               Playwright
docker-compose.yml postgres:17, api, mailpit
```

**Contrato entre la API y el frontend:**
- La API expone `/api/v1` con OpenAPI generado.
- El cliente del frontend se genera con `openapi-typescript` y `openapi-fetch`.
- Los errores siguen `problem+json` con códigos estables (`GA_CUPO_INSUFICIENTE`, `GA_PROMO_INVALIDA`, …).
- El CI falla si el contrato quedó desalineado.

## 7. Ambientes y CI/CD

| | Local | Dev | Producción |
|---|---|---|---|
| Base de datos | Postgres en Docker | Supabase (esquema `ga`) | RDS privado |
| API | `npm run dev` | Fargate, 1 tarea | Fargate, 1-2 tareas |
| Web | Vite | S3 + CloudFront (o Pages mientras se migra) | S3 + CloudFront con dominio propio |
| Correo | Mailpit | SES en sandbox | SES en producción |

**Pipelines:**
1. **`ci.yml`, en cada PR:**
   - tipos, lint y pruebas;
   - migraciones desde cero + pgTAP;
   - integración de la API, con matriz de autorización y concurrencia por la última plaza;
   - verificación del contrato y `terraform plan`.
2. **`deploy-dev.yml`, al integrar en `dev`:**
   - imagen a ECR;
   - migraciones en Supabase dev;
   - despliegue a ECS y de la web;
   - prueba de humo.
3. **`deploy-prod.yml`, de `dev` a `main` con aprobación humana:**
   - snapshot de RDS;
   - migraciones como tarea de ECS dentro de la VPC;
   - **la misma imagen** que se probó en dev;
   - despliegue de la web y prueba de humo.

Las migraciones deben ser compatibles con la versión anterior de la API.

## 8. Seguridad (lo que antes daba RLS)

- **Guarda global que niega por omisión.** Una prueba falla si alguna ruta no está en la matriz de autorización.
- **Filtro por actor en el SQL**, por ejemplo en lo que ve el guía y en "mi reserva".
- **Respuestas con DTO explícitos**, nunca `select *`.
- **Defensa en la base de datos:**
  - GRANT mínimos;
  - triggers que protegen las reglas que no deben romperse;
  - pagos e historial sin UPDATE ni DELETE;
  - RLS por variable de sesión se deja para la Fase 3.
- **Red:**
  - RDS privado con SSL forzado y cifrado;
  - el ALB solo acepta tráfico de CloudFront;
  - el acceso de desarrolladores pasa por un bastión con SSM, sin puertos abiertos, y entra con el rol `ga_lectura`.
- **Datos personales:** nunca en los logs. Exportar CSV solo pueden admin y dueño, con escape de fórmulas y bitácora.

## 9. Costo mensual estimado (supuesto: us-east-1, tráfico bajo)

| Componente | Producción | Dev |
|---|---|---|
| RDS t4g.micro Single-AZ (Multi-AZ) | 15 (30) | Supabase: 0 en el plan gratuito, unos 25 en Pro |
| ECS Fargate | 7-15 | 7 |
| ALB | 18-22 | 18-22 |
| IPv4 públicas | 8-15 | 8-11 |
| CloudFront + S3 | 0-3 | 0-1 |
| WAF | 8-10 | — |
| Route 53, SES, secretos, CloudWatch, ECR | 5-14 | 2-5 |
| **Total** | **unos 70-110 (Multi-AZ: 85-130)** | **unos 35-50** |

Hay que confirmarlo con AWS Pricing Calculator. Evitar NAT Gateway, que suma unos 33 por ambiente.

## 10. Plan por fases

| # | Qué se construye | Riesgo | Quién |
|---|---|---|---|
| H0 | Cuenta AWS (dev y prod), MFA, alarmas de presupuesto, OIDC para GitHub, dominio, Cloudflare/Turnstile, lenguaje y región | Bajo | **Dueño** |
| 1 | Monorepo: mover `src/` a `apps/web` sin cambios, workspaces y CI básico | Bajo | dev-mecanico |
| 2 | `db/`: línea base portable a partir del volcado real, dbmate, docker-compose, roles, seed local y `legacy/` | Medio | Persona (volcado) + dev-backend → seguridad |
| 3 | Correcciones de esquema: trigger de cupo, CHECK de totales, hora de Guatemala, `expira_at`, `client_ref`, FK de promociones, consentimientos | Medio | dev-backend → dev-pruebas → seguridad |
| 4 | Esqueleto de la API: configuración, pool, errores, OpenAPI, guarda que niega por omisión, Dockerfile | Bajo | dev-backend + dev-pruebas |
| 5 | Lectura pública (tours, salidas, promociones). La web la consume a través de `lib/api` | Bajo | dev-backend, dev-frontend |
| 6 | `POST /v1/reservaciones` con transacción, Turnstile, idempotencia y límites | **Alto** | dev-backend, dev-frontend, dev-pruebas → seguridad |
| 7 | Terraform dev y `deploy-dev.yml` | Medio | dev-backend → despliegue + seguridad; **`apply` lo hace una persona** |
| 8 | Cognito en el panel y roles | Medio | dev-backend, dev-frontend → seguridad |
| 9 | Endpoints del admin (paginados, estados, mover, métricas en SQL, CSV) y `React.lazy` | Medio | dev-backend, dev-frontend, dev-pruebas |
| 10 | Media en S3 y migración de las imágenes | Medio | dev-backend, dev-frontend |
| 11 | Outbox, SES y worker (aviso al operador, comprobante en ES/EN, vencimientos) | Medio | dev-backend, dev-pruebas |
| 12 | Resto de la Fase 1 del producto (pagos manuales, políticas, baja, anonimizar, historial) | Medio | dev-* → seguridad |
| 13 | Quitar supabase-js, los scripts `db:*` y GitHub Pages | Bajo | dev-mecanico |
| 14 | Terraform prod (RDS, WAF, alarmas, bastión, Cognito prod, SES fuera del sandbox) y `deploy-prod.yml` | **Alto** | dev-backend → despliegue + seguridad; **`apply` lo hace una persona** |
| 15 | Ensayo de la migración de datos, alta de admins, cambio definitivo y DNS | **Alto** | **Persona**, con apoyo de dev-backend |

Los pasos 4-6 y 7 pueden ir en paralelo. El 3 va antes del 6.

## 11. Preguntas del arquitecto (P-A1..A9) con la nueva arquitectura

- **A1 Anti-robots:** Turnstile, Idempotency-Key, límites dentro de la transacción y WAF por IP.
  Ya no se puede llamar directo a la base de datos.
- **A2 Vencimiento:** el cupo ignora las pendientes vencidas al instante; el worker las marca cada 5 minutos.
- **A3 Avisos:** outbox en la misma transacción que la reserva, envío por SES con reintentos y alarma si fallan.
  WhatsApp sigue manual en la Fase 1.
- **A4 Pagos:** tabla `pagos` en la que solo se agregan filas; las anulaciones son filas nuevas.
  Se guardan moneda y tipo de cambio, y el saldo sale de una vista.
- **A5 Acompañante:** tarifas por tour y líneas por reserva. El tour define si el cupo se cuenta en personas o en vehículos.
- **A6 Mi reserva:** el turista recibe por correo un token de un solo uso que vence en 24 h. La respuesta es siempre la misma,
  exista o no la reserva, y hay límite por IP. No usa Cognito.
- **A7 Políticas:** versiones que no se modifican; la reserva guarda qué versión aceptó el turista.
- **A8 Hosting:** CloudFront + S3 con dominio propio. `/tour/*` devuelve HTML con meta OG.
- **A9 Panel con mucho volumen:** paginación por cursor, métricas en SQL e índices.

## Decisiones pendientes del dueño

1. **Lenguaje:** NestJS (recomendado) o .NET 10.
2. **Cuenta AWS:** a nombre de quién, quién la paga, si dev y prod van en cuentas separadas, y la región
   (us-east-1 o México).
3. **RDS:** Single-AZ (unos 15 USD; si falla, 30-60 min sin servicio) o Multi-AZ (unos 30 USD).
4. **Base de dev:** Supabase gratuito (se pausa), Supabase Pro (unos 25 USD) o un RDS de dev (unos 15 USD, sin diferencias con producción).
5. **Dominio y remitente de correo** (por ejemplo, reservas@…).
6. **Captcha:** Turnstile (gratis, requiere cuenta de Cloudflare).
7. **Datos a migrar:** ¿hay reservaciones reales en el Supabase actual o solo el catálogo?
8. **Varias empresas** en los próximos 12 meses: define si las tablas llevan `empresa_id` desde el inicio.
9. **Quién aprueba los despliegues y quién ejecuta `terraform apply`.**
10. **Infraestructura como código:** Terraform (recomendado) o CDK.

## Hallazgos sobre el código actual

- **[BLOQUEANTE]** El esquema no se puede llevar tal cual a RDS (`auth.*`, `anon`/`authenticated`, `storage.*`).
- **[BLOQUEANTE]** No se sabe qué versión del esquema tiene la base actual (dos versiones de `ga_crear_reservacion`).
- **[IMPORTANTE]** Se puede sobrevender fuera de la función de reserva (el panel cambia estados directo).
- **[IMPORTANTE]** El frontend tiene 28 llamadas a supabase-js y reconoce los errores por el texto del mensaje.
- **[IMPORTANTE]** El panel trae tablas completas y calcula las métricas en el navegador.
- **[IMPORTANTE]** "Hoy" se calcula en UTC.
- **[IMPORTANTE]** Al borrar un tour, sus promociones pasan a aplicar a todo; el consentimiento de marketing no se puede revocar.
- **[IMPORTANTE]** Las imágenes guardan la URL absoluta de Supabase.
- **[IMPORTANTE, verificado]** El sitio de dev usa la base de datos principal: no existen las variables `_DEV`.
- **[MEJORA]** El admin va en el bundle público, las imágenes de `public/` pesan y no tienen `srcset`, los scripts no verifican
  TLS, el CI usa Node 20 y el seed es destructivo.

## Límites de esta revisión

- No se pudo compilar ni medir el bundle, porque no hay `node_modules`.
- No hubo acceso a la base real.
- Los precios de AWS y los datos de mercado son **supuestos**.
- Algunos archivos del frontend (`Tours.tsx`, `MapaTours.tsx`, `i18n.tsx`, `Clientes.tsx`, `Promociones.tsx`) se revisaron solo con búsquedas.
