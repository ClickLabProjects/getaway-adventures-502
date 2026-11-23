# Base de datos (PostgreSQL portable, esquema `ga`)

## Carpetas
- `migrations/`: migraciones de dbmate (`AAAAMMDDHHMMSS_nombre.sql`, con `-- migrate:up` / `-- migrate:down`).
- `bootstrap/roles.sql`: roles de base de datos. Se corre una vez por ambiente, a mano, fuera de las migraciones.
- `seed/local.sql`: datos de ejemplo falsos, solo para desarrollo local. No destructivo y re-ejecutable.
- `legacy/`: volcado real del Supabase anterior. Solo referencia, NO se ejecuta.
- `.env.local.example`: URL local de ejemplo. Copia a `db/.env.local` (ignorado por git).

Roles: `ga_owner` (NOLOGIN, dueño del esquema), `ga_migrator` (login, hace `SET ROLE ga_owner` en cada migración),
`ga_app` (la API; search_path `ga`, `statement_timeout` 15s, `idle_in_transaction_session_timeout` 30s), `ga_lectura` (solo SELECT).
Los permisos por tabla se otorgan en cada migración (no en `roles.sql`): `ga_app` hace SELECT/INSERT/UPDATE en
reservaciones y nunca DELETE; DELETE solo en tours, salidas, promociones y usuarios_panel; no crea tablas ni ve `ga_meta`.
Los privilegios por omisión de tablas futuras son solo SELECT: cada migración nueva debe otorgar el resto.
La tabla de versiones de dbmate vive en `ga_meta.schema_migrations` (esquema de `ga_migrator`, inaccesible para la API).

## Levantar la base local
Si el 5432 está ocupado, usa `GA_DB_PORT=5433` en todos los comandos y ese puerto en `db/.env.local`.

```
cp db/.env.local.example db/.env.local     # una vez
npm run db:local:up                        # 1. docker compose (Postgres 17)
npm run db:local:roles                     # 2. roles (contraseñas falsas locales)
npm run db:local:migrate                   # 3. migraciones
npm run db:local:seed                      # 4. datos de ejemplo
```
Otros: `db:local:status`, `db:local:rollback` (deshace la última), `db:local:reset` (borra y recrea solo la base local;
después repite roles, migrate y seed). Estos scripts nunca leen el `.env` de la raíz ni usan una `DATABASE_URL` del shell:
`scripts/db-local.mjs` lee `db/.env.local`, aborta si el host no es local y pasa la URL a dbmate con `--url`.
La API en local usa `ga_app` (`postgres://ga_app:ga_app_local_falsa@localhost:5433/ga_dev`).

Las variables `-v pass_*` de `roles.sql` son solo para el flujo local (claves falsas). En ambientes remotos
(Lightsail/RDS/Supabase) corre `roles.sql` SIN variables, con un rol con CREATEROLE (no necesita superusuario; PostgreSQL 16+),
y luego pon cada clave en psql interactivo con `\password ga_migrator`, `\password ga_app` y `\password ga_lectura`:
nunca claves en la línea de comandos ni en el SQL. Paso pendiente para Lightsail: `revoke connect on database <base> from public;`.
En producción la API exige `sslmode=verify-full` en `DATABASE_URL` (ver `apps/api/.env.example`).

## Regla de oro
Una migración ya aplicada en cualquier ambiente NUNCA se edita: se crea una nueva. El `migrate:down` conserva el
esquema `ga` (lo crea `roles.sql`) para no perder los permisos por omisión.

## Diferencias con el esquema real de Supabase
| Real (Supabase) | Aquí | Por qué |
|---|---|---|
| `public.ga_tours`, `ga_salidas`, `ga_reservaciones`, `ga_promociones` | `ga.tours`, `salidas`, `reservaciones`, `promociones` | Todo en el esquema `ga`, sin prefijo |
| Vista `ga_clientes` con `security_invoker` | `ga.clientes` sin esa opción | Era para RLS; ahora mandan los permisos de rol |
| `ga_admins(user_id → auth.users)` | `ga.usuarios_panel(cognito_sub, email, rol, activo, creado_en)` | Login con Cognito y roles del panel |
| Funciones `ga_crear_reservacion`, `ga_validar_promo`, `ga_salidas_disponibles`, `ga_es_admin` | No se recrean | La lógica pasa a la API |
| Políticas RLS y `ENABLE ROW LEVEL SECURITY` | No existen | La API decide permisos; roles de BD limitan el acceso |
| Tabla de versiones en `public.schema_migrations` (dbmate por omisión) | `ga_meta.schema_migrations` | Fuera del alcance de la API |
| GRANT a `anon`/`authenticated`/`service_role` | Roles `ga_owner/migrator/app/lectura` | Sin roles de Supabase |
| Nombres de constraints/índices `ga_<tabla>_...` | `<tabla>_...` (p. ej. `reservaciones_estado_check`) | Se quita el prefijo; la lógica es idéntica |
| Políticas de Storage `ga-media` | No existen | Imágenes irán a S3 |
| Bugs conocidos (FK `promociones.tour_id` en `set null`, cupo, fechas con `current_date`, consentimiento) | Se conservan | Se corrigen en otra migración |

## Valores pendientes de confirmar por el comercio
La tabla `ga.configuracion` guarda valores de negocio que el comercio aún no confirma (`pendiente_confirmar = true`).
Se leen con `ga.config_int('<clave>')`. La API (`ga_app`) solo puede actualizar las columnas `valor` y `pendiente_confirmar`
(no crear, borrar ni renombrar claves). Cada cambio queda en `ga.configuracion_historial`; la API fija quién lo hizo con
`set local ga.actor = '<id>'` dentro de la transacción. El valor es siempre un entero JSON dentro del rango de su clave.

| Clave | Valor inicial | Rango | Qué controla |
|---|---|---|---|
| `horas_vencimiento_pendiente` | 24 | 1-168 | Horas que una reservación pendiente retiene cupo antes de vencer |
| `max_personas_reserva_web` | 10 | 1-30 | Máximo de personas por reservación web |
| `max_pendientes_por_contacto` | 2 | 1-20 | Máximo de pendientes vigentes por contacto |
| `horas_corte_defecto` | 12 | 0-168 | Horas antes de la salida en que cierra la reserva (cada tour puede fijar `horas_corte`) |

Cambiar un valor (al confirmarlo se marca como confirmado):
```
update ga.configuracion set valor = '48', pendiente_confirmar = false
where clave = 'horas_vencimiento_pendiente';
```

## Promociones huérfanas (migración de correcciones de negocio)
La migración NO deduce el alcance de las promociones existentes: todas quedan con `aplica_todos = false` y las que no
tenían tour (`tour_id is null`) se desactivan, porque eran huérfanas del bug de borrado de tours. El dueño debe revisar
`select codigo, titulo, activo from ga.promociones where not activo and tour_id is null;` y reactivar a mano las que de
verdad son globales: `update ga.promociones set aplica_todos = true, activo = true where codigo = '<CODIGO>';`.
Una promo activa debe tener tour o `aplica_todos` (lo exige un CHECK). Al borrar un tour, sus promos quedan inactivas.

## Reglas de concurrencia y plazos (para la API)
- La API opera en READ COMMITTED. El trigger de cupo rechaza otro nivel de aislamiento.
- Debe reintentar ante `40P01` (deadlock) y `40001`. Para evitar deadlocks, bloquea primero las salidas (ordenadas por id)
  y luego las reservaciones.
- Códigos que lanzan los triggers: `GA001` `GA_CUPO_INSUFICIENTE` (detail JSON con `disponibles`), `GA002`
  `GA_CUPO_MENOR_A_OCUPADO`, `GA003` `GA_SALIDA_CERRADA`, `GA004` `GA_FUERA_DE_PLAZO`.
- Al INSERTAR una reservación que ocupa lugar, la base rechaza salidas inactivas y reservas pasado el cierre
  (`ga.cierre_reserva`). Solo para el personal del panel, la API puede saltarse el plazo (no la salida inactiva) con
  `set local ga.permitir_fuera_de_plazo = 'on'` dentro de la transacción.
- Confirmar o pagar una reservación en una salida ya sobrevendida está permitido: solo se revalida cuando sube la ocupación.

## Revertir la migración de correcciones de negocio
`db:local:rollback` de `20261124120000_correcciones_negocio` falla con `down destructivo: respaldar antes` si hay filas en
`consentimientos`, `configuracion_historial` o reservaciones `vencida`. No se revierte en producción sin respaldo.
