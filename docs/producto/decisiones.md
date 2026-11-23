# Decisiones

Registro de decisiones de producto. Formato: `D-n · fecha · quién decidió · decisión · fuente`.

- Ronda 1 (2026-11-23): hechos que ya estaban en el código o que el dueño del proyecto dijo en el encargo.
- Ronda 1b (2026-11-24): decisiones de arquitectura del dueño del proyecto y reglas ya implementadas en la base nueva
  (`db/migrations/`, ver `db/README.md`). **La agencia todavía no ha confirmado ninguna decisión**: sus respuestas
  llegarán por `cuestionario-cliente.md`.

Cuando una decisión reemplaza a otra, la anterior se marca como *reemplazada* y no se borra.

## Ronda 1 · 2026-11-23

| # | Fecha | Quién | Decisión | Fuente |
|---|---|---|---|---|
| D-1 | 2026-11-23 | Dueño del proyecto | El proyecto se vendió a la agencia y sale a producción. | Encargo ronda 1 |
| D-2 | 2026-11-23 | Dueño del proyecto | No hay pagos en línea: la reserva queda pendiente y el operador confirma por WhatsApp. | Encargo ronda 1; `TourPage.tsx`, `i18n.tsx` |
| D-3 | 2026-11-23 | Dueño del proyecto | Solo existe inicio de sesión para el personal de la agencia; no hay cuentas de clientes. | Encargo ronda 1; `AdminApp.tsx` |
| D-4 | 2026-11-23 | Dueño del proyecto | El producto llevará varios módulos: inicio de sesión, reservas, dashboard y otros por definir. | Encargo ronda 1 |
| D-5 | 2026-11-23 | Dueño del proyecto (técnica) | ~~El backend es Supabase (Postgres, RLS, funciones SQL, Edge Functions).~~ **Reemplazada por D-13 y D-14.** | Encargo ronda 1 |
| D-6 | existente | Código | El sitio público es bilingüe, inglés por defecto, con selector EN/ES; si falta el texto en inglés se muestra el español. | `i18n.tsx`, README |
| D-7 | existente | Código | Precios por persona en quetzales; una salida puede tener precio especial. El total lo calcula el servidor. | `schema.sql`, `admin.sql` |
| D-8 | existente | Código | Cupo por salida validado en el servidor; las canceladas no ocupan cupo. | `ga_crear_reservacion` |
| D-9 | existente | Código | Estados de reserva: pendiente, confirmada, pagada, cancelada (se agrega `vencida`, ver D-23). Toda reserva nueva entra como pendiente. | `schema.sql` |
| D-10 | existente | Código | Una promoción por reserva, por porcentaje, con vigencia y para un tour o todos (ver D-26). | `admin.sql` |
| D-11 | existente | Código | El consentimiento de marketing es opcional y viene desmarcado. | `TourPage.tsx` |
| D-12 | existente | Código | Todos los tours salen desde Antigua Guatemala; contacto principal por WhatsApp e Instagram. | `seed.sql`, `supabase.ts` |

## Ronda 1b · 2026-11-24 · Plataforma (decisiones del dueño del proyecto)

| # | Fecha | Quién | Decisión | Fuente |
|---|---|---|---|---|
| D-13 | 2026-11-24 | Dueño del proyecto | Backend propio: una API en NestJS entre el sitio y la base PostgreSQL. El sitio y el panel ya no hablan directo con la base. | Encargo ronda 1b; `docs/arquitectura/backend-propio-aws.md` (rama `docs/arquitectura-objetivo`) |
| D-14 | 2026-11-24 | Dueño del proyecto | Supabase queda solo como base de pruebas (desarrollo). No se usa en producción. | Encargo ronda 1b |
| D-15 | 2026-11-24 | Dueño del proyecto | Producción en AWS Lightsail: servidor de 1 GB + base PostgreSQL administrada con respaldos diarios automáticos, en una sola región y una sola zona. Se acepta que una falla pueda dejar el sitio caído 30-60 minutos. | Encargo ronda 1b; `docs/arquitectura/costos-mensuales.md` |
| D-16 | 2026-11-24 | Dueño del proyecto | Inicio de sesión del panel con Amazon Cognito. Cognito solo identifica a la persona; su rol (dueño, admin, personal, guía) y si está activa se guardan en la base. | Encargo ronda 1b; `db/migrations/20261123120000_linea_base.sql` (`usuarios_panel`) |
| D-17 | 2026-11-24 | Dueño del proyecto | Correos (avisos y comprobantes) con Amazon SES; imágenes en S3. | Encargo ronda 1b |
| D-18 | 2026-11-24 | Dueño del proyecto | **No se lanza la versión actual.** La salida a producción espera al backend nuevo. | Encargo ronda 1b |
| D-19 | 2026-11-24 | Dueño del proyecto | Costo estimado de producción ≈ 25 USD/mes (≈ 30 USD/mes con colchón del 20 %). Precios de lista, a confirmar con la calculadora de AWS. | `docs/arquitectura/costos-mensuales.md` |
| D-20 | 2026-11-24 | Dueño del proyecto | Verificación anti-robots del formulario con Cloudflare Turnstile (invisible para el turista). | Propuesta de arquitectura, respuesta a P-A1 |
| D-21 | 2026-11-24 | Dueño del proyecto | El sitio vive en S3 + CloudFront con dominio propio (se deja GitHub Pages). Los enlaces directos a `/tour/...` y a las políticas abren bien y muestran vista previa en WhatsApp. | P-A8 |
| D-22 | 2026-11-24 | Dueño del proyecto | El panel trabaja con páginas de resultados y métricas calculadas en el servidor; no hay límite de 1000 filas. | P-A9 |

## Ronda 1b · 2026-11-24 · Reglas ya implementadas en la base nueva

Implementado en `db/migrations/20261124120000_correcciones_negocio.sql`, con pruebas. Falta que la API y las pantallas
lo usen. Los **valores** de D-28 son propuestas hasta que la agencia los confirme.

| # | Fecha | Quién | Decisión | Fuente |
|---|---|---|---|---|
| D-23 | 2026-11-24 | Dueño del proyecto | Nuevo estado `vencida`. Una pendiente tiene fecha de vencimiento; al vencer deja de ocupar cupo **en ese instante** (aunque el proceso que la marca como `vencida` pase cada pocos minutos). | Migración; P-A2 |
| D-24 | 2026-11-24 | Dueño del proyecto | Cupo protegido en la base: nadie (ni el panel) puede pasarse del cupo al crear, reactivar, cambiar de fecha o subir personas; el cupo de una salida no puede bajar por debajo de lo ya reservado. Confirmar o marcar pagada una reserva que ya ocupaba lugar no se bloquea. | Migración |
| D-25 | 2026-11-24 | Dueño del proyecto | Todas las fechas del negocio ("hoy", vencimientos, cortes) se calculan en hora de Guatemala. | Migración |
| D-26 | 2026-11-24 | Dueño del proyecto | Cada tour puede tener su **hora de salida** y sus **horas de corte** (cuántas horas antes de salir se cierra la reserva en línea). Si el tour no las define, se usa el valor por defecto. El panel puede registrar una reserva fuera de plazo; el sitio público no. | Migración |
| D-27 | 2026-11-24 | Dueño del proyecto | Protección contra reservas duplicadas: si el turista reenvía por doble clic o red caída, se crea una sola reserva. | Migración (`client_ref`) |
| D-28 | 2026-11-24 | Dueño del proyecto | Los valores de negocio son **parametrizables** (se cambian sin programar y cada cambio queda registrado). Valores iniciales, **pendientes de confirmar por la agencia**: vencimiento de pendientes 24 h; máximo 10 personas por reserva en línea; máximo 2 pendientes por correo/teléfono; corte por defecto 12 h antes de la salida. | Migración (`ga.configuracion`); `db/README.md` |
| D-29 | 2026-11-24 | Dueño del proyecto | Promociones con alcance explícito: valen para **un tour** o para **todos los tours** (marcado a propósito). Al borrar un tour, sus promociones se desactivan. Las promociones sin tour que existían quedaron desactivadas y se reactivan a mano si de verdad eran para todos. | Migración; `db/README.md` |
| D-30 | 2026-11-24 | Dueño del proyecto | El consentimiento de marketing se guarda como historial (reserva, baja, panel) y vale la **decisión más reciente** del cliente. | Migración (`ga.consentimientos`, vista `clientes`) |

## Ronda 1b · 2026-11-24 · Respuestas del arquitecto aceptadas (P-A1..A9)

| # | Fecha | Quién | Decisión | Fuente |
|---|---|---|---|---|
| D-31 | 2026-11-24 | Dueño del proyecto | Límites del formulario (tope de personas, pendientes por contacto, anti-robots) se aplican en la API dentro de la misma operación que crea la reserva; ya nadie puede saltárselos llamando directo a la base. | P-A1 |
| D-32 | 2026-11-24 | Dueño del proyecto | Avisos y correos: se guardan en una cola en la misma operación que la reserva y se envían por SES con reintentos y alarma si fallan. **WhatsApp sigue siendo manual en la Fase 1.** | P-A3 |
| D-33 | 2026-11-24 | Dueño del proyecto | Pagos como registros que solo se agregan (una corrección es un registro nuevo), con moneda y tipo de cambio; el saldo se calcula. | P-A4 |
| D-34 | 2026-11-24 | Dueño del proyecto | Acompañante y extras: cada tour tiene tarifas (por ejemplo conductor y acompañante) y la reserva guarda líneas por tarifa. Cada tour define si su cupo se cuenta en personas o en vehículos. | P-A5 |
| D-35 | 2026-11-24 | Dueño del proyecto | "Mi reserva" sin cuenta: el turista pide acceso y recibe **un enlace por correo** de un solo uso que vence en 24 h. La pantalla responde igual exista o no la reserva y limita intentos. No usa Cognito. | P-A6 |
| D-36 | 2026-11-24 | Dueño del proyecto | Políticas con versiones que no se modifican; cada reserva guarda qué versión aceptó el turista. | P-A7 |
| D-37 | 2026-11-24 | Dueño del proyecto | Panel sin registro público y con segundo factor obligatorio (app autenticadora) para todo el personal. Las cuentas de clientes, si llegan (Fase 3), van separadas. | Diseño de arquitectura aceptado (sección 5) |
