-- Esquema REAL de los objetos ga_* en el Supabase de dev (PostgreSQL 17.11), extraído el 2026-11-24.
-- Solo estructura, sin datos. REFERENCIA para escribir la línea base portable: NO EJECUTAR.

--
-- PostgreSQL database dump
--

\restrict QL3GgGUnIOg4GZJzDRCYmGG4pTbisH3wMPo0u7YVycr01GFuzvevqxgWkg9PtkS

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.12 (Debian 17.12-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ga_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ga_admins (
    user_id uuid NOT NULL
);


--
-- Name: ga_reservaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ga_reservaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text NOT NULL,
    salida_id uuid NOT NULL,
    nombre text NOT NULL,
    email text NOT NULL,
    telefono text NOT NULL,
    personas integer NOT NULL,
    notas text,
    total_q numeric(10,2) NOT NULL,
    estado text DEFAULT 'pendiente'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    subtotal_q numeric(10,2),
    descuento_q numeric(10,2) DEFAULT 0 NOT NULL,
    promo_id uuid,
    acepta_promos boolean DEFAULT false NOT NULL,
    CONSTRAINT ga_reservaciones_email_check CHECK ((email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)),
    CONSTRAINT ga_reservaciones_estado_check CHECK ((estado = ANY (ARRAY['pendiente'::text, 'confirmada'::text, 'pagada'::text, 'cancelada'::text]))),
    CONSTRAINT ga_reservaciones_nombre_check CHECK (((length(TRIM(BOTH FROM nombre)) >= 2) AND (length(TRIM(BOTH FROM nombre)) <= 120))),
    CONSTRAINT ga_reservaciones_notas_check CHECK (((notas IS NULL) OR (length(notas) <= 1000))),
    CONSTRAINT ga_reservaciones_personas_check CHECK (((personas >= 1) AND (personas <= 30))),
    CONSTRAINT ga_reservaciones_telefono_check CHECK (((length(TRIM(BOTH FROM telefono)) >= 8) AND (length(TRIM(BOTH FROM telefono)) <= 20)))
);


--
-- Name: ga_salidas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ga_salidas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tour_id uuid NOT NULL,
    fecha date NOT NULL,
    cupo integer NOT NULL,
    precio_q numeric(10,2),
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ga_salidas_cupo_check CHECK ((cupo > 0)),
    CONSTRAINT ga_salidas_precio_q_check CHECK ((precio_q >= (0)::numeric))
);


--
-- Name: ga_tours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ga_tours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    nombre text NOT NULL,
    destino text NOT NULL,
    descripcion text DEFAULT ''::text NOT NULL,
    imagen_url text,
    precio_q numeric(10,2) NOT NULL,
    duracion text DEFAULT '1 día'::text NOT NULL,
    incluye text[] DEFAULT '{}'::text[] NOT NULL,
    punto_salida text DEFAULT 'Antigua Guatemala'::text NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    horario text,
    galeria text[] DEFAULT '{}'::text[] NOT NULL,
    lat numeric(8,5),
    lng numeric(8,5),
    nombre_en text,
    destino_en text,
    descripcion_en text,
    duracion_en text,
    punto_salida_en text,
    horario_en text,
    incluye_en text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT ga_tours_lat_check CHECK (((lat >= (13)::numeric) AND (lat <= 18.5))),
    CONSTRAINT ga_tours_lng_check CHECK (((lng >= '-92.5'::numeric) AND (lng <= ('-88'::integer)::numeric))),
    CONSTRAINT ga_tours_precio_q_check CHECK ((precio_q >= (0)::numeric))
);


--
-- Name: ga_clientes; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.ga_clientes WITH (security_invoker='true') AS
 SELECT lower(r.email) AS email,
    (array_agg(r.nombre ORDER BY r.created_at DESC))[1] AS nombre,
    (array_agg(r.telefono ORDER BY r.created_at DESC))[1] AS telefono,
    (count(*))::integer AS reservas,
    (count(*) FILTER (WHERE (r.estado <> 'cancelada'::text)))::integer AS reservas_activas,
    (COALESCE(sum(r.personas) FILTER (WHERE (r.estado <> 'cancelada'::text)), (0)::bigint))::integer AS viajeros,
    COALESCE(sum(r.total_q) FILTER (WHERE (r.estado <> 'cancelada'::text)), (0)::numeric) AS total_q,
    COALESCE(sum(r.total_q) FILTER (WHERE (r.estado = 'pagada'::text)), (0)::numeric) AS pagado_q,
    bool_or(r.acepta_promos) AS acepta_promos,
    min(r.created_at) AS primera_reserva,
    max(r.created_at) AS ultima_reserva,
    max(s.fecha) AS ultimo_viaje,
    array_agg(DISTINCT t.nombre) AS tours
   FROM ((public.ga_reservaciones r
     JOIN public.ga_salidas s ON ((s.id = r.salida_id)))
     JOIN public.ga_tours t ON ((t.id = s.tour_id)))
  GROUP BY (lower(r.email));


--
-- Name: ga_promociones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ga_promociones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    descripcion text DEFAULT ''::text NOT NULL,
    imagen_url text,
    codigo text,
    descuento_pct numeric(5,2) DEFAULT 0 NOT NULL,
    tour_id uuid,
    desde date,
    hasta date,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    titulo_en text,
    descripcion_en text,
    CONSTRAINT ga_promociones_check CHECK (((hasta IS NULL) OR (desde IS NULL) OR (hasta >= desde))),
    CONSTRAINT ga_promociones_codigo_check CHECK (((codigo IS NULL) OR (codigo ~ '^[A-Z0-9_-]{3,30}$'::text))),
    CONSTRAINT ga_promociones_descuento_pct_check CHECK (((descuento_pct >= (0)::numeric) AND (descuento_pct <= (100)::numeric))),
    CONSTRAINT ga_promociones_titulo_check CHECK (((length(TRIM(BOTH FROM titulo)) >= 2) AND (length(TRIM(BOTH FROM titulo)) <= 120)))
);


--
-- Name: ga_admins ga_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_admins
    ADD CONSTRAINT ga_admins_pkey PRIMARY KEY (user_id);


--
-- Name: ga_promociones ga_promociones_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_promociones
    ADD CONSTRAINT ga_promociones_codigo_key UNIQUE (codigo);


--
-- Name: ga_promociones ga_promociones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_promociones
    ADD CONSTRAINT ga_promociones_pkey PRIMARY KEY (id);


--
-- Name: ga_reservaciones ga_reservaciones_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_reservaciones
    ADD CONSTRAINT ga_reservaciones_codigo_key UNIQUE (codigo);


--
-- Name: ga_reservaciones ga_reservaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_reservaciones
    ADD CONSTRAINT ga_reservaciones_pkey PRIMARY KEY (id);


--
-- Name: ga_salidas ga_salidas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_salidas
    ADD CONSTRAINT ga_salidas_pkey PRIMARY KEY (id);


--
-- Name: ga_salidas ga_salidas_tour_id_fecha_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_salidas
    ADD CONSTRAINT ga_salidas_tour_id_fecha_key UNIQUE (tour_id, fecha);


--
-- Name: ga_tours ga_tours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_tours
    ADD CONSTRAINT ga_tours_pkey PRIMARY KEY (id);


--
-- Name: ga_tours ga_tours_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_tours
    ADD CONSTRAINT ga_tours_slug_key UNIQUE (slug);


--
-- Name: ga_reservaciones_salida_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ga_reservaciones_salida_idx ON public.ga_reservaciones USING btree (salida_id);


--
-- Name: ga_salidas_tour_fecha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ga_salidas_tour_fecha_idx ON public.ga_salidas USING btree (tour_id, fecha);


--
-- Name: ga_admins ga_admins_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_admins
    ADD CONSTRAINT ga_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ga_promociones ga_promociones_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_promociones
    ADD CONSTRAINT ga_promociones_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.ga_tours(id) ON DELETE SET NULL;


--
-- Name: ga_reservaciones ga_reservaciones_promo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_reservaciones
    ADD CONSTRAINT ga_reservaciones_promo_id_fkey FOREIGN KEY (promo_id) REFERENCES public.ga_promociones(id) ON DELETE SET NULL;


--
-- Name: ga_reservaciones ga_reservaciones_salida_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_reservaciones
    ADD CONSTRAINT ga_reservaciones_salida_id_fkey FOREIGN KEY (salida_id) REFERENCES public.ga_salidas(id) ON DELETE RESTRICT;


--
-- Name: ga_salidas ga_salidas_tour_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ga_salidas
    ADD CONSTRAINT ga_salidas_tour_id_fkey FOREIGN KEY (tour_id) REFERENCES public.ga_tours(id) ON DELETE CASCADE;


--
-- Name: ga_admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ga_admins ENABLE ROW LEVEL SECURITY;

--
-- Name: ga_admins ga_admins_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ga_admins_self ON public.ga_admins FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: ga_promociones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ga_promociones ENABLE ROW LEVEL SECURITY;

--
-- Name: ga_promociones ga_promos_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ga_promos_admin_all ON public.ga_promociones TO authenticated USING (public.ga_es_admin()) WITH CHECK (public.ga_es_admin());


--
-- Name: ga_promociones ga_promos_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ga_promos_public_read ON public.ga_promociones FOR SELECT USING (((activo AND ((desde IS NULL) OR (desde <= CURRENT_DATE)) AND ((hasta IS NULL) OR (hasta >= CURRENT_DATE))) OR public.ga_es_admin()));


--
-- Name: ga_reservaciones ga_res_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ga_res_admin_read ON public.ga_reservaciones FOR SELECT TO authenticated USING (public.ga_es_admin());


--
-- Name: ga_reservaciones ga_res_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ga_res_admin_update ON public.ga_reservaciones FOR UPDATE TO authenticated USING (public.ga_es_admin()) WITH CHECK (public.ga_es_admin());


--
-- Name: ga_reservaciones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ga_reservaciones ENABLE ROW LEVEL SECURITY;

--
-- Name: ga_salidas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ga_salidas ENABLE ROW LEVEL SECURITY;

--
-- Name: ga_salidas ga_salidas_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ga_salidas_admin_all ON public.ga_salidas TO authenticated USING (public.ga_es_admin()) WITH CHECK (public.ga_es_admin());


--
-- Name: ga_tours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ga_tours ENABLE ROW LEVEL SECURITY;

--
-- Name: ga_tours ga_tours_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ga_tours_admin_all ON public.ga_tours TO authenticated USING (public.ga_es_admin()) WITH CHECK (public.ga_es_admin());


--
-- Name: ga_tours ga_tours_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ga_tours_public_read ON public.ga_tours FOR SELECT USING ((activo OR public.ga_es_admin()));


--
-- Name: TABLE ga_admins; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ga_admins TO authenticated;
GRANT ALL ON TABLE public.ga_admins TO service_role;


--
-- Name: TABLE ga_reservaciones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ga_reservaciones TO authenticated;
GRANT ALL ON TABLE public.ga_reservaciones TO service_role;


--
-- Name: TABLE ga_salidas; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ga_salidas TO anon;
GRANT ALL ON TABLE public.ga_salidas TO authenticated;
GRANT ALL ON TABLE public.ga_salidas TO service_role;


--
-- Name: TABLE ga_tours; Type: ACL; Schema: public; Owner: -
--

GRANT SELECT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE public.ga_tours TO anon;
GRANT ALL ON TABLE public.ga_tours TO authenticated;
GRANT ALL ON TABLE public.ga_tours TO service_role;


--
-- Name: TABLE ga_clientes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ga_clientes TO authenticated;
GRANT ALL ON TABLE public.ga_clientes TO service_role;


--
-- Name: TABLE ga_promociones; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ga_promociones TO anon;
GRANT ALL ON TABLE public.ga_promociones TO authenticated;
GRANT ALL ON TABLE public.ga_promociones TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict QL3GgGUnIOg4GZJzDRCYmGG4pTbisH3wMPo0u7YVycr01GFuzvevqxgWkg9PtkS


-- ===== Funciones ga_* =====
CREATE OR REPLACE FUNCTION public.ga_crear_reservacion(p_salida_id uuid, p_nombre text, p_email text, p_telefono text, p_personas integer, p_notas text DEFAULT NULL::text, p_codigo_promo text DEFAULT NULL::text, p_acepta_promos boolean DEFAULT false)
 RETURNS TABLE(codigo text, subtotal_q numeric, descuento_q numeric, total_q numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_salida  public.ga_salidas%rowtype;
  v_precio  numeric;
  v_usados  int;
  v_codigo  text;
  v_sub     numeric;
  v_desc    numeric := 0;
  v_promo_id  uuid;
  v_promo_pct numeric;
begin
  select * into v_salida from public.ga_salidas where id = p_salida_id for update;
  if not found or not v_salida.activo or v_salida.fecha < current_date then
    raise exception 'La salida seleccionada no está disponible';
  end if;

  select coalesce(v_salida.precio_q, t.precio_q) into v_precio
  from public.ga_tours t where t.id = v_salida.tour_id and t.activo;
  if v_precio is null then raise exception 'El tour no está disponible'; end if;

  if p_personas is null or p_personas < 1 then raise exception 'Número de personas inválido'; end if;

  select coalesce(sum(r.personas), 0) into v_usados
  from public.ga_reservaciones r where r.salida_id = p_salida_id and r.estado <> 'cancelada';
  if v_usados + p_personas > v_salida.cupo then
    raise exception 'Solo quedan % lugares disponibles', v_salida.cupo - v_usados;
  end if;

  v_sub := v_precio * p_personas;
  if nullif(trim(coalesce(p_codigo_promo, '')), '') is not null then
    select vp.id, vp.descuento_pct into v_promo_id, v_promo_pct
    from public.ga_validar_promo(p_codigo_promo, v_salida.tour_id) vp;
    if v_promo_id is null then raise exception 'El código de promoción no es válido para este tour'; end if;
    v_desc := round(v_sub * v_promo_pct / 100, 2);
  end if;

  loop
    v_codigo := 'GA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.ga_reservaciones r where r.codigo = v_codigo);
  end loop;

  insert into public.ga_reservaciones
    (codigo, salida_id, nombre, email, telefono, personas, notas,
     subtotal_q, descuento_q, total_q, promo_id, acepta_promos)
  values
    (v_codigo, p_salida_id, trim(p_nombre), lower(trim(p_email)), trim(p_telefono), p_personas,
     nullif(trim(coalesce(p_notas, '')), ''), v_sub, v_desc, v_sub - v_desc, v_promo_id,
     coalesce(p_acepta_promos, false));

  return query select v_codigo, v_sub, v_desc, v_sub - v_desc;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.ga_es_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.ga_admins where user_id = auth.uid());
$function$
;
CREATE OR REPLACE FUNCTION public.ga_salidas_disponibles(p_tour_id uuid)
 RETURNS TABLE(id uuid, fecha date, cupo integer, disponibles integer, precio_q numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.id, s.fecha, s.cupo,
         s.cupo - coalesce((
           select sum(r.personas) from public.ga_reservaciones r
           where r.salida_id = s.id and r.estado <> 'cancelada'), 0)::int as disponibles,
         coalesce(s.precio_q, t.precio_q) as precio_q
  from public.ga_salidas s
  join public.ga_tours t on t.id = s.tour_id
  where s.tour_id = p_tour_id and s.activo and t.activo and s.fecha >= current_date
  order by s.fecha;
$function$
;
CREATE OR REPLACE FUNCTION public.ga_validar_promo(p_codigo text, p_tour_id uuid)
 RETURNS TABLE(id uuid, titulo text, descuento_pct numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id, p.titulo, p.descuento_pct
  from public.ga_promociones p
  where p.codigo = upper(trim(p_codigo))
    and p.activo and p.descuento_pct > 0
    and (p.desde is null or p.desde <= current_date)
    and (p.hasta is null or p.hasta >= current_date)
    and (p.tour_id is null or p.tour_id = p_tour_id)
  limit 1;
$function$
;
-- ===== Permisos de funciones ga_* =====
-- ga_crear_reservacion(uuid,text,text,text,integer,text,text,boolean) -> postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- ga_es_admin() -> =X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- ga_salidas_disponibles(uuid) -> =X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- ga_validar_promo(text,uuid) -> =X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres
-- ===== Políticas de Storage del bucket ga-media =====
-- ga_media_admin_insert | INSERT | authenticated | using:  | check: ((bucket_id = 'ga-media'::text) AND ga_es_admin())
-- ga_media_admin_update | UPDATE | authenticated | using: ((bucket_id = 'ga-media'::text) AND ga_es_admin()) | check: 
-- ga_media_admin_delete | DELETE | authenticated | using: ((bucket_id = 'ga-media'::text) AND ga_es_admin()) | check: 
