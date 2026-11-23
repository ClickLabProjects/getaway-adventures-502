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
