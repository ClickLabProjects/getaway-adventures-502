-- migrate:up
-- Línea base portable (PostgreSQL estándar). Reproduce el esquema real de Supabase
-- (db/legacy/esquema-real-supabase-2026-11-24.sql) dentro del esquema `ga`, sin RLS ni nada de Supabase.
-- Se ejecuta como ga_migrator, que asume ga_owner (ver db/bootstrap/roles.sql).
set role ga_owner;

create schema if not exists ga;

create table ga.tours (
    id uuid default gen_random_uuid() not null,
    slug text not null,
    nombre text not null,
    destino text not null,
    descripcion text default ''::text not null,
    imagen_url text,
    precio_q numeric(10,2) not null,
    duracion text default '1 día'::text not null,
    incluye text[] default '{}'::text[] not null,
    punto_salida text default 'Antigua Guatemala'::text not null,
    activo boolean default true not null,
    orden integer default 0 not null,
    created_at timestamptz default now() not null,
    horario text,
    galeria text[] default '{}'::text[] not null,
    lat numeric(8,5),
    lng numeric(8,5),
    nombre_en text,
    destino_en text,
    descripcion_en text,
    duracion_en text,
    punto_salida_en text,
    horario_en text,
    incluye_en text[] default '{}'::text[] not null,
    constraint tours_pkey primary key (id),
    constraint tours_slug_key unique (slug),
    constraint tours_lat_check check (lat >= 13 and lat <= 18.5),
    constraint tours_lng_check check (lng >= -92.5 and lng <= -88),
    constraint tours_precio_q_check check (precio_q >= 0)
);

create table ga.salidas (
    id uuid default gen_random_uuid() not null,
    tour_id uuid not null,
    fecha date not null,
    cupo integer not null,
    precio_q numeric(10,2),
    activo boolean default true not null,
    created_at timestamptz default now() not null,
    constraint salidas_pkey primary key (id),
    constraint salidas_tour_id_fecha_key unique (tour_id, fecha),
    constraint salidas_cupo_check check (cupo > 0),
    constraint salidas_precio_q_check check (precio_q >= 0),
    constraint salidas_tour_id_fkey foreign key (tour_id) references ga.tours(id) on delete cascade
);
create index salidas_tour_fecha_idx on ga.salidas using btree (tour_id, fecha);

create table ga.promociones (
    id uuid default gen_random_uuid() not null,
    titulo text not null,
    descripcion text default ''::text not null,
    imagen_url text,
    codigo text,
    descuento_pct numeric(5,2) default 0 not null,
    tour_id uuid,
    desde date,
    hasta date,
    activo boolean default true not null,
    created_at timestamptz default now() not null,
    titulo_en text,
    descripcion_en text,
    constraint promociones_pkey primary key (id),
    constraint promociones_codigo_key unique (codigo),
    constraint promociones_check check (hasta is null or desde is null or hasta >= desde),
    constraint promociones_codigo_check check (codigo is null or codigo ~ '^[A-Z0-9_-]{3,30}$'),
    constraint promociones_descuento_pct_check check (descuento_pct >= 0 and descuento_pct <= 100),
    constraint promociones_titulo_check check (length(trim(both from titulo)) >= 2 and length(trim(both from titulo)) <= 120),
    constraint promociones_tour_id_fkey foreign key (tour_id) references ga.tours(id) on delete set null
);

create table ga.reservaciones (
    id uuid default gen_random_uuid() not null,
    codigo text not null,
    salida_id uuid not null,
    nombre text not null,
    email text not null,
    telefono text not null,
    personas integer not null,
    notas text,
    total_q numeric(10,2) not null,
    estado text default 'pendiente'::text not null,
    created_at timestamptz default now() not null,
    subtotal_q numeric(10,2),
    descuento_q numeric(10,2) default 0 not null,
    promo_id uuid,
    acepta_promos boolean default false not null,
    constraint reservaciones_pkey primary key (id),
    constraint reservaciones_codigo_key unique (codigo),
    constraint reservaciones_email_check check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    constraint reservaciones_estado_check check (estado = any (array['pendiente','confirmada','pagada','cancelada'])),
    constraint reservaciones_nombre_check check (length(trim(both from nombre)) >= 2 and length(trim(both from nombre)) <= 120),
    constraint reservaciones_notas_check check (notas is null or length(notas) <= 1000),
    constraint reservaciones_personas_check check (personas >= 1 and personas <= 30),
    constraint reservaciones_telefono_check check (length(trim(both from telefono)) >= 8 and length(trim(both from telefono)) <= 20),
    constraint reservaciones_promo_id_fkey foreign key (promo_id) references ga.promociones(id) on delete set null,
    constraint reservaciones_salida_id_fkey foreign key (salida_id) references ga.salidas(id) on delete restrict
);
create index reservaciones_salida_idx on ga.reservaciones using btree (salida_id);

create table ga.usuarios_panel (
    cognito_sub text primary key,
    email text not null unique,
    rol text not null check (rol in ('dueno','admin','personal','guia')),
    activo boolean not null default true,
    creado_en timestamptz not null default now()
);

create view ga.clientes as
 select lower(r.email) as email,
    (array_agg(r.nombre order by r.created_at desc))[1] as nombre,
    (array_agg(r.telefono order by r.created_at desc))[1] as telefono,
    (count(*))::integer as reservas,
    (count(*) filter (where r.estado <> 'cancelada'))::integer as reservas_activas,
    (coalesce(sum(r.personas) filter (where r.estado <> 'cancelada'), 0::bigint))::integer as viajeros,
    coalesce(sum(r.total_q) filter (where r.estado <> 'cancelada'), 0::numeric) as total_q,
    coalesce(sum(r.total_q) filter (where r.estado = 'pagada'), 0::numeric) as pagado_q,
    bool_or(r.acepta_promos) as acepta_promos,
    min(r.created_at) as primera_reserva,
    max(r.created_at) as ultima_reserva,
    max(s.fecha) as ultimo_viaje,
    array_agg(distinct t.nombre) as tours
   from ga.reservaciones r
     join ga.salidas s on s.id = r.salida_id
     join ga.tours t on t.id = s.tour_id
  group by (lower(r.email));

-- Permisos por tabla (explícitos; los privilegios por omisión solo dan SELECT).
-- DELETE solo donde hace falta; NUNCA en reservaciones. La vista clientes es de solo lectura.
grant select, insert, update, delete on ga.tours, ga.salidas, ga.promociones, ga.usuarios_panel to ga_app;
grant select, insert, update on ga.reservaciones to ga_app;
grant select on ga.clientes to ga_app;
grant select on ga.tours, ga.salidas, ga.promociones, ga.reservaciones, ga.usuarios_panel, ga.clientes to ga_lectura;

reset role;

-- migrate:down
-- El esquema `ga` lo crea db/bootstrap/roles.sql y se conserva (así no se pierden los permisos por omisión).
set role ga_owner;
revoke all on ga.clientes, ga.tours, ga.salidas, ga.promociones, ga.reservaciones, ga.usuarios_panel from ga_app, ga_lectura;
drop view if exists ga.clientes;
drop table if exists ga.usuarios_panel, ga.reservaciones, ga.promociones, ga.salidas, ga.tours;
reset role;
