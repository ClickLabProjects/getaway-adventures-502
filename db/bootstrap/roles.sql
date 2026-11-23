-- Roles de base de datos. Se corre UNA vez por ambiente, a mano, fuera de las migraciones, conectado a la base de
-- la aplicación con un rol con CREATEROLE (no hace falta superusuario: sirve en Lightsail/RDS/Supabase). Re-ejecutable.
-- Requiere PostgreSQL 16 o superior (sintaxis GRANT ... WITH SET/INHERIT).
--
-- Contraseñas:
--   * Local: variables de psql (-v pass_migrator=... -v pass_app=... -v pass_lectura=...), solo con claves falsas.
--   * Remoto: NO pases claves por la línea de comandos. Corre el script sin variables y luego, en psql interactivo,
--     `\password ga_migrator`, `\password ga_app` y `\password ga_lectura`.
-- Sin variables, el script no toca las contraseñas.
\set ON_ERROR_STOP on

select 'create role ga_owner nologin' where not exists (select 1 from pg_roles where rolname = 'ga_owner') \gexec
select 'create role ga_migrator login' where not exists (select 1 from pg_roles where rolname = 'ga_migrator') \gexec
select 'create role ga_app login' where not exists (select 1 from pg_roles where rolname = 'ga_app') \gexec
select 'create role ga_lectura login' where not exists (select 1 from pg_roles where rolname = 'ga_lectura') \gexec

alter role ga_owner nologin;
alter role ga_migrator login;
alter role ga_app login;
alter role ga_lectura login;

\if :{?pass_migrator}
alter role ga_migrator password :'pass_migrator';
\endif
\if :{?pass_app}
alter role ga_app password :'pass_app';
\endif
\if :{?pass_lectura}
alter role ga_lectura password :'pass_lectura';
\endif

-- Configuración por rol
alter role ga_app set search_path = ga;
alter role ga_lectura set search_path = ga;
alter role ga_app set statement_timeout = '15s';
alter role ga_app set idle_in_transaction_session_timeout = '30s';

-- Membresías. Temporal: quien corre este script asume ga_owner / ga_migrator solo para crear esquemas y
-- privilegios por omisión; se revoca al final.
grant ga_owner to current_user with set true, inherit false;
grant ga_migrator to current_user with set true, inherit false;
-- ga_migrator puede asumir ga_owner (las migraciones hacen SET ROLE ga_owner), sin heredar sus permisos.
grant ga_owner to ga_migrator with inherit false, set true;

-- Base de datos actual
select format('grant connect on database %I to ga_migrator, ga_app, ga_lectura', current_database()) \gexec
select format('grant create on database %I to ga_owner', current_database()) \gexec
revoke create on schema public from public;

-- ga: datos de la aplicación (dueño ga_owner). Se crea vacío para que los permisos por omisión sobrevivan a un rollback.
create schema if not exists ga authorization ga_owner;
-- ga_meta: tabla de versiones de dbmate (dueño ga_migrator). Sin acceso para ga_app ni ga_lectura.
create schema if not exists ga_meta authorization ga_migrator;

-- Los permisos los otorga el dueño de cada objeto.
set role ga_owner;
grant usage on schema ga to ga_app, ga_lectura;
-- Privilegios por omisión mínimos: solo SELECT. Cada migración otorga explícitamente el resto por tabla.
alter default privileges for role ga_owner in schema ga grant select on tables to ga_app, ga_lectura;
alter default privileges for role ga_owner revoke execute on functions from public;
reset role;

set role ga_migrator;
revoke all on schema ga_meta from public;
reset role;

revoke ga_owner from current_user;
revoke ga_migrator from current_user;

-- Pendiente para Lightsail (se hará aparte): revoke connect on database <base> from public;
