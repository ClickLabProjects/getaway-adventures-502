-- migrate:up
-- Correcciones de negocio sobre la línea base. Ninguna función es security definer.
-- La API opera en READ COMMITTED (el trigger de cupo lo exige); ver db/README.md.
set role ga_owner;

-- 1. Configuración (valores que el comercio aún debe confirmar) --------------------------------------------
create table ga.configuracion (
    clave text primary key,
    valor jsonb not null,
    pendiente_confirmar boolean not null default true,
    descripcion text not null,
    actualizado_en timestamptz not null default now(),
    constraint configuracion_clave_check check (clave in (
        'horas_vencimiento_pendiente', 'max_personas_reserva_web', 'max_pendientes_por_contacto', 'horas_corte_defecto', 'pct_max_cupo_pendiente_web')),
    -- El valor es siempre un entero JSON, dentro del rango de su clave.
    constraint configuracion_valor_check check (
        case
          when jsonb_typeof(valor) <> 'number' or (valor #>> '{}') !~ '^[0-9]{1,6}$' then false
          else case clave
            when 'horas_vencimiento_pendiente' then (valor #>> '{}')::integer between 1 and 168
            when 'max_personas_reserva_web' then (valor #>> '{}')::integer between 1 and 30
            when 'max_pendientes_por_contacto' then (valor #>> '{}')::integer between 1 and 20
            when 'horas_corte_defecto' then (valor #>> '{}')::integer between 0 and 168
            when 'pct_max_cupo_pendiente_web' then (valor #>> '{}')::integer between 10 and 100
            else false
          end
        end)
);
insert into ga.configuracion (clave, valor, descripcion) values
 ('horas_vencimiento_pendiente', '24', 'Horas que una reservación pendiente retiene cupo antes de vencer.'),
 ('max_personas_reserva_web', '10', 'Máximo de personas por reservación hecha desde la web.'),
 ('max_pendientes_por_contacto', '2', 'Máximo de reservaciones pendientes vigentes por correo/teléfono.'),
 ('horas_corte_defecto', '12', 'Horas antes de la salida en que se cierra la reserva web (si el tour no define las suyas).'),
 ('pct_max_cupo_pendiente_web', '60', 'Porcentaje máximo del cupo de una salida que pueden retener reservaciones pendientes (sin pagar) hechas desde la web.');

create table ga.configuracion_historial (
    id uuid primary key default gen_random_uuid(),
    clave text not null,
    valor_anterior jsonb,
    valor_nuevo jsonb,
    cambiado_en timestamptz not null default now(),
    cambiado_por text
);

create function ga.config_int(p_clave text) returns integer
language plpgsql stable as $$
declare v integer;
begin
  select (c.valor #>> '{}')::integer into v from ga.configuracion c where c.clave = p_clave;
  if not found or v is null then
    raise exception 'Falta la clave de configuración %', p_clave;
  end if;
  return v;
end $$;

-- Marca la fecha de cambio y deja constancia. La API fija el actor con `set local ga.actor = '<id>'`.
create function ga.auditar_configuracion() returns trigger
language plpgsql set search_path = pg_catalog, ga as $$
begin
  new.actualizado_en := now();
  insert into ga.configuracion_historial (clave, valor_anterior, valor_nuevo, cambiado_por)
  values (old.clave, old.valor, new.valor, nullif(current_setting('ga.actor', true), ''));
  return new;
end $$;
create trigger configuracion_auditoria before update on ga.configuracion
    for each row execute function ga.auditar_configuracion();

-- 2. Hora de Guatemala ---------------------------------------------------------------------------------------
create function ga.ahora_gt() returns timestamp
language sql stable as $$ select now() at time zone 'America/Guatemala' $$;
create function ga.hoy_gt() returns date
language sql stable as $$ select (now() at time zone 'America/Guatemala')::date $$;

-- 3. Corte por tour -------------------------------------------------------------------------------------------
alter table ga.tours
    add column hora_salida time,
    add column horas_corte integer,
    add constraint tours_horas_corte_check check (horas_corte between 0 and 168);

-- Momento (timestamptz) en que se cierra la reserva de una salida. Null si la salida no existe.
create function ga.cierre_reserva(p_salida_id uuid) returns timestamptz
language sql stable as $$
  select ((s.fecha + coalesce(t.hora_salida, time '00:00')) at time zone 'America/Guatemala')
         - make_interval(hours => coalesce(t.horas_corte, ga.config_int('horas_corte_defecto')))
  from ga.salidas s join ga.tours t on t.id = s.tour_id
  where s.id = p_salida_id
$$;

-- 4. Vencimiento de pendientes ------------------------------------------------------------------------------
alter table ga.reservaciones add column expira_at timestamptz;
alter table ga.reservaciones drop constraint reservaciones_estado_check;
alter table ga.reservaciones add constraint reservaciones_estado_check
    check (estado = any (array['pendiente','confirmada','pagada','cancelada','vencida']));

-- Pendientes existentes: las de salidas pasadas vencen; las futuras reciben plazo desde hoy.
update ga.reservaciones r set estado = 'vencida'
from ga.salidas s
where s.id = r.salida_id and r.estado = 'pendiente' and s.fecha < ga.hoy_gt();
update ga.reservaciones set expira_at = greatest(
    created_at + make_interval(hours => ga.config_int('horas_vencimiento_pendiente')),
    now() + make_interval(hours => ga.config_int('horas_vencimiento_pendiente')))
where estado = 'pendiente' and expira_at is null;
alter table ga.reservaciones add constraint reservaciones_pendiente_expira_check
    check (estado <> 'pendiente' or expira_at is not null);

create function ga.fijar_expiracion() returns trigger
language plpgsql set search_path = pg_catalog, ga as $$
begin
  if new.estado = 'pendiente' then
    -- Al volver a pendiente desde otro estado, el plazo viejo no sirve: se renueva.
    if new.expira_at is null or (tg_op = 'UPDATE' and old.estado <> 'pendiente' and new.expira_at is not distinct from old.expira_at) then
      new.expira_at := now() + make_interval(hours => ga.config_int('horas_vencimiento_pendiente'));
    end if;
    if new.expira_at is null then
      raise exception 'Una reservación pendiente necesita expira_at';
    end if;
  end if;
  return new;
end $$;
create trigger reservaciones_1_expiracion before insert or update of estado on ga.reservaciones
    for each row execute function ga.fijar_expiracion();

-- 5. Cupo protegido en la base ------------------------------------------------------------------------------
-- Única definición de "ocupa lugar", en modo cerrado: ocupa salvo cancelada, vencida o pendiente vencida.
create function ga.ocupa_lugar(p_estado text, p_expira_at timestamptz) returns boolean
language sql stable as $$
  select not (p_estado in ('cancelada', 'vencida')
              or (p_estado = 'pendiente' and p_expira_at is not null and p_expira_at <= now()))
$$;

-- Personas que ocupan lugar en una salida; p_excluir omite una reservación (para actualizaciones).
create function ga.ocupados(p_salida_id uuid, p_excluir uuid default null) returns integer
language sql stable as $$
  select coalesce(sum(r.personas), 0)::integer
  from ga.reservaciones r
  where r.salida_id = p_salida_id
    and (p_excluir is null or r.id <> p_excluir)
    and ga.ocupa_lugar(r.estado, r.expira_at)
$$;

create function ga.validar_cupo_reservacion() returns trigger
language plpgsql set search_path = pg_catalog, ga as $$
declare v_cupo integer; v_activo boolean; v_ocupados integer;
begin
  if not ga.ocupa_lugar(new.estado, new.expira_at) then
    return new;
  end if;
  -- Si no aumenta la ocupación (misma salida, ya ocupaba y no suben las personas) no se revalida:
  -- así se puede confirmar o pagar en una salida ya sobrevendida.
  if tg_op = 'UPDATE' and old.salida_id = new.salida_id and ga.ocupa_lugar(old.estado, old.expira_at)
     and new.personas <= old.personas then
    return new;
  end if;
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'La validación de cupo exige el nivel de aislamiento READ COMMITTED';
  end if;

  select s.cupo, s.activo into v_cupo, v_activo from ga.salidas s where s.id = new.salida_id for no key update;
  if not found then
    return new; -- la FK rechazará la fila
  end if;

  if tg_op = 'INSERT' then
    if not v_activo then
      raise exception using errcode = 'GA003', message = 'GA_SALIDA_CERRADA';
    end if;
    if coalesce(current_setting('ga.permitir_fuera_de_plazo', true), '') <> 'on'
       and ga.ahora_gt() at time zone 'America/Guatemala' > ga.cierre_reserva(new.salida_id) then
      raise exception using errcode = 'GA004', message = 'GA_FUERA_DE_PLAZO';
    end if;
  end if;

  v_ocupados := ga.ocupados(new.salida_id, case when tg_op = 'UPDATE' then new.id end);
  if v_ocupados + new.personas > v_cupo then
    raise exception using errcode = 'GA001', message = 'GA_CUPO_INSUFICIENTE',
      detail = json_build_object('disponibles', greatest(v_cupo - v_ocupados, 0))::text;
  end if;
  return new;
end $$;
create trigger reservaciones_2_cupo before insert or update of estado, salida_id, personas, expira_at
    on ga.reservaciones for each row execute function ga.validar_cupo_reservacion();

create function ga.validar_cupo_salida() returns trigger
language plpgsql set search_path = pg_catalog, ga as $$
declare v_ocupados integer;
begin
  v_ocupados := ga.ocupados(new.id);
  if new.cupo < v_ocupados then
    raise exception using errcode = 'GA002', message = 'GA_CUPO_MENOR_A_OCUPADO',
      detail = json_build_object('ocupados', v_ocupados)::text;
  end if;
  return new;
end $$;
create trigger salidas_cupo before update of cupo on ga.salidas
    for each row execute function ga.validar_cupo_salida();

create index reservaciones_email_idx on ga.reservaciones (lower(email), created_at);

-- 6. Idempotencia ---------------------------------------------------------------------------------------------
alter table ga.reservaciones
    add column client_ref text,
    add column cuerpo_hash text,
    add constraint reservaciones_client_ref_key unique (client_ref),
    add constraint reservaciones_client_ref_check check (length(client_ref) between 1 and 100);

-- 7. Promociones al borrar un tour ---------------------------------------------------------------------------
-- Las existentes NO se deducen: todas quedan aplica_todos = false y las que no tenían tour se desactivan
-- (huérfanas del bug). El dueño reactiva a mano las globales de verdad (ver db/README.md).
alter table ga.promociones add column aplica_todos boolean not null default false;
update ga.promociones set activo = false where tour_id is null;
alter table ga.promociones
    add constraint promociones_aplica_todos_check check (not (aplica_todos and tour_id is not null)),
    add constraint promociones_alcance_check check (aplica_todos or tour_id is not null or not activo);

create function ga.desactivar_promos_de_tour() returns trigger
language plpgsql set search_path = pg_catalog, ga as $$
begin
  update ga.promociones set activo = false where tour_id = old.id;
  return old;
end $$;
create trigger tours_desactivar_promos before delete on ga.tours
    for each row execute function ga.desactivar_promos_de_tour();

-- 8. Consentimiento ---------------------------------------------------------------------------------------------
create table ga.consentimientos (
    id uuid primary key default gen_random_uuid(),
    email text not null,
    acepta boolean not null,
    origen text not null check (origen in ('reserva', 'baja', 'panel')),
    creado_en timestamptz not null default now(),
    version_aviso text,
    reservacion_id uuid references ga.reservaciones(id) on delete set null,
    constraint consentimientos_email_check check (email = lower(btrim(email)) and length(email) <= 254),
    constraint consentimientos_baja_check check (origen <> 'baja' or not acepta)
);
create index consentimientos_email_idx on ga.consentimientos (lower(email), creado_en);

drop view ga.clientes;
create view ga.clientes as
 select g.email, g.nombre, g.telefono, g.reservas, g.reservas_activas, g.viajeros, g.total_q, g.pagado_q,
    -- Una baja (origen 'baja') solo la anula un consentimiento POSTERIOR de origen 'panel' (o un futuro doble opt-in):
    -- nunca uno de origen 'reserva' ni el acepta_promos de una reservación. Sin baja, gana la decisión más reciente;
    -- a igual fecha gana el consentimiento y, dentro, acepta = false.
    case
      when exists (select 1 from ga.consentimientos b where lower(b.email) = g.email and b.origen = 'baja') then
        exists (select 1 from ga.consentimientos c
                where lower(c.email) = g.email and c.origen = 'panel' and c.acepta
                  and c.creado_en > (select max(b.creado_en) from ga.consentimientos b
                                     where lower(b.email) = g.email and b.origen = 'baja'))
      else coalesce((select d.acepta from (
        select c.acepta, c.creado_en, 0 as fuente from ga.consentimientos c where lower(c.email) = g.email
        union all
        select r2.acepta_promos, r2.created_at, 1 from ga.reservaciones r2 where lower(r2.email) = g.email
      ) d order by d.creado_en desc, d.fuente asc, d.acepta asc limit 1), false)
    end as acepta_promos,
    g.primera_reserva, g.ultima_reserva, g.ultimo_viaje, g.tours
 from (
   select lower(r.email) as email,
    (array_agg(r.nombre order by r.created_at desc))[1] as nombre,
    (array_agg(r.telefono order by r.created_at desc))[1] as telefono,
    (count(*))::integer as reservas,
    (count(*) filter (where r.estado not in ('cancelada', 'vencida')))::integer as reservas_activas,
    (coalesce(sum(r.personas) filter (where r.estado not in ('cancelada', 'vencida')), 0::bigint))::integer as viajeros,
    coalesce(sum(r.total_q) filter (where r.estado not in ('cancelada', 'vencida')), 0::numeric) as total_q,
    coalesce(sum(r.total_q) filter (where r.estado = 'pagada'), 0::numeric) as pagado_q,
    min(r.created_at) as primera_reserva,
    max(r.created_at) as ultima_reserva,
    max(s.fecha) as ultimo_viaje,
    array_agg(distinct t.nombre) as tours
   from ga.reservaciones r
     join ga.salidas s on s.id = r.salida_id
     join ga.tours t on t.id = s.tour_id
   group by lower(r.email)
 ) g;

-- 9. Permisos explícitos -----------------------------------------------------------------------------------------
revoke update on ga.configuracion from ga_app;
grant select on ga.configuracion to ga_app;
grant update (valor, pendiente_confirmar) on ga.configuracion to ga_app;
grant select, insert on ga.configuracion_historial to ga_app;
grant select, insert on ga.consentimientos to ga_app;
grant select on ga.clientes to ga_app;
grant select on ga.configuracion, ga.configuracion_historial, ga.consentimientos, ga.clientes to ga_lectura;

revoke execute on function
  ga.config_int(text), ga.ahora_gt(), ga.hoy_gt(), ga.cierre_reserva(uuid), ga.ocupa_lugar(text, timestamptz),
  ga.ocupados(uuid, uuid), ga.auditar_configuracion(), ga.fijar_expiracion(), ga.validar_cupo_reservacion(),
  ga.validar_cupo_salida(), ga.desactivar_promos_de_tour()
  from public;
grant execute on function
  ga.config_int(text), ga.ahora_gt(), ga.hoy_gt(), ga.cierre_reserva(uuid), ga.ocupa_lugar(text, timestamptz),
  ga.ocupados(uuid, uuid)
  to ga_app, ga_lectura;

reset role;

-- migrate:down
set role ga_owner;

-- Esta migración no se revierte en producción sin respaldo.
do $$
begin
  if exists (select 1 from ga.consentimientos)
     or exists (select 1 from ga.configuracion_historial)
     or exists (select 1 from ga.reservaciones where estado = 'vencida') then
    raise exception 'down destructivo: respaldar antes';
  end if;
end $$;

drop view ga.clientes;
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
grant select on ga.clientes to ga_app, ga_lectura;

drop table ga.consentimientos;

drop trigger tours_desactivar_promos on ga.tours;
drop function ga.desactivar_promos_de_tour();
alter table ga.promociones
    drop constraint promociones_alcance_check,
    drop constraint promociones_aplica_todos_check,
    drop column aplica_todos;

alter table ga.reservaciones
    drop constraint reservaciones_client_ref_check,
    drop constraint reservaciones_client_ref_key,
    drop column cuerpo_hash,
    drop column client_ref;
drop index ga.reservaciones_email_idx;

drop trigger salidas_cupo on ga.salidas;
drop function ga.validar_cupo_salida();
drop trigger reservaciones_2_cupo on ga.reservaciones;
drop function ga.validar_cupo_reservacion();
drop function ga.ocupados(uuid, uuid);
drop function ga.ocupa_lugar(text, timestamptz);

drop trigger reservaciones_1_expiracion on ga.reservaciones;
drop function ga.fijar_expiracion();
alter table ga.reservaciones
    drop constraint reservaciones_pendiente_expira_check,
    drop constraint reservaciones_estado_check;
alter table ga.reservaciones add constraint reservaciones_estado_check
    check (estado = any (array['pendiente','confirmada','pagada','cancelada']));
alter table ga.reservaciones drop column expira_at;

drop function ga.cierre_reserva(uuid);
alter table ga.tours drop constraint tours_horas_corte_check, drop column horas_corte, drop column hora_salida;

drop function ga.hoy_gt();
drop function ga.ahora_gt();
drop trigger configuracion_auditoria on ga.configuracion;
drop function ga.auditar_configuracion();
drop function ga.config_int(text);
drop table ga.configuracion_historial;
drop table ga.configuracion;

reset role;
