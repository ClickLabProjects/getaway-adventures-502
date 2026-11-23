import { Injectable } from '@nestjs/common';
import { sql, type Kysely } from 'kysely';
import { DbService } from '../../plataforma/db/db.service';
import type { BaseDatos } from '../../plataforma/db/tipos';
import type { ReservaDto } from './reservas.dto';

export interface SalidaBloqueada {
  id: string;
  cupo: number;
  activo: boolean;
  tour_activo: boolean;
  fecha: string;
  precio_salida: string | null;
  precio_tour: string;
  tour_slug: string;
  tour_nombre: string;
  tour_nombre_en: string | null;
}

export interface ReservaFila {
  salida_id: string;
  cuerpo_hash: string | null;
  email: string;
  codigo: string;
  estado: string;
  fecha: string;
  personas: number;
  subtotal_q: string;
  descuento_q: string;
  total_q: string;
  expira_at: Date | null;
  tour_slug: string;
  tour_nombre: string;
  tour_nombre_en: string | null;
}

export interface NuevaReserva {
  codigo: string;
  salidaId: string;
  nombre: string;
  email: string;
  telefono: string;
  personas: number;
  notas: string | null;
  subtotalQ: number;
  descuentoQ: number;
  totalQ: number;
  promoId: string | null;
  aceptaPromos: boolean;
  clientRef: string;
  cuerpoHash: string;
}

export function aDto(f: ReservaFila): ReservaDto {
  return {
    codigo: f.codigo,
    estado: f.estado,
    fecha: f.fecha,
    tour: { slug: f.tour_slug, nombre: f.tour_nombre, nombre_en: f.tour_nombre_en },
    personas: f.personas,
    subtotal_q: Number(f.subtotal_q),
    descuento_q: Number(f.descuento_q),
    total_q: Number(f.total_q),
    expira_at: f.expira_at ? f.expira_at.toISOString() : null,
  };
}

const COLUMNAS = sql`
  r.salida_id, r.cuerpo_hash, r.email, r.codigo, r.estado, to_char(s.fecha, 'YYYY-MM-DD') as fecha, r.personas,
  coalesce(r.subtotal_q, r.total_q) as subtotal_q, r.descuento_q, r.total_q, r.expira_at,
  t.slug as tour_slug, t.nombre as tour_nombre, t.nombre_en as tour_nombre_en`;

@Injectable()
export class ReservasRepo {
  constructor(private readonly db: DbService) {}

  async porClientRef(clientRef: string): Promise<ReservaFila | null> {
    const r = await sql<ReservaFila>`
      select ${COLUMNAS}
      from reservaciones r join salidas s on s.id = r.salida_id join tours t on t.id = s.tour_id
      where r.client_ref = ${clientRef}`.execute(this.db.kysely);
    return r.rows[0] ?? null;
  }

  /** Bloquea la fila de la salida (serializa las reservas de esa salida). */
  async bloquearSalida(tx: Kysely<BaseDatos>, salidaId: string): Promise<SalidaBloqueada | null> {
    const r = await sql<SalidaBloqueada>`
      select s.id, s.cupo, s.activo, t.activo as tour_activo, to_char(s.fecha, 'YYYY-MM-DD') as fecha,
             s.precio_q as precio_salida, t.precio_q as precio_tour,
             t.slug as tour_slug, t.nombre as tour_nombre, t.nombre_en as tour_nombre_en
      from salidas s join tours t on t.id = s.tour_id
      where s.id = ${salidaId}
      for no key update of s`.execute(tx);
    return r.rows[0] ?? null;
  }

  async configInt(tx: Kysely<BaseDatos>, clave: string): Promise<number> {
    const r = await sql<{ v: number }>`select ga.config_int(${clave}) as v`.execute(tx);
    return r.rows[0]!.v;
  }

  /**
   * Pendientes vigentes en la salida del mismo contacto. SOLO para contar se normaliza (lo guardado no cambia):
   * teléfono a dígitos sin el prefijo 502 (si son 11 dígitos que empiezan por 502); correo en minúsculas, sin
   * "+etiqueta" y, en gmail.com/googlemail.com, sin puntos en la parte local. `email` y `telefono` ya vienen
   * normalizados por `normalizarContacto`; las filas guardadas se normalizan aquí con la misma regla.
   */
  async pendientesDelContacto(tx: Kysely<BaseDatos>, salidaId: string, email: string, telefono: string): Promise<number> {
    const r = await sql<{ n: number }>`
      with p as (
        select lower(r.email) as e, regexp_replace(r.telefono, '[^0-9]', '', 'g') as d
        from reservaciones r
        where r.salida_id = ${salidaId} and r.estado = 'pendiente' and r.expira_at > now()
      ), n as (
        select split_part(e, '@', 2) as dom, split_part(split_part(e, '@', 1), '+', 1) as loc,
               case when length(d) = 11 and d like '502%' then substr(d, 4) else d end as tel
        from p
      )
      select count(*)::int as n from n
      where (case when dom in ('gmail.com', 'googlemail.com') then replace(loc, '.', '') || '@gmail.com'
                  else loc || '@' || dom end) = ${email}
         or (${telefono} <> '' and tel = ${telefono})`.execute(tx);
    return r.rows[0]!.n;
  }

  /** Personas retenidas por pendientes vigentes en la salida (de cualquier contacto). */
  async personasPendientes(tx: Kysely<BaseDatos>, salidaId: string): Promise<number> {
    const r = await sql<{ n: number }>`
      select coalesce(sum(personas), 0)::int as n from reservaciones
      where salida_id = ${salidaId} and estado = 'pendiente' and expira_at > now()`.execute(tx);
    return r.rows[0]!.n;
  }

  async codigoExiste(tx: Kysely<BaseDatos>, codigo: string): Promise<boolean> {
    const r = await tx.selectFrom('reservaciones').select('id').where('codigo', '=', codigo).executeTakeFirst();
    return !!r;
  }

  async insertar(tx: Kysely<BaseDatos>, n: NuevaReserva): Promise<string> {
    const r = await tx
      .insertInto('reservaciones')
      .values({
        codigo: n.codigo,
        salida_id: n.salidaId,
        nombre: n.nombre,
        email: n.email,
        telefono: n.telefono,
        personas: n.personas,
        notas: n.notas,
        subtotal_q: n.subtotalQ.toFixed(2),
        descuento_q: n.descuentoQ.toFixed(2),
        total_q: n.totalQ.toFixed(2),
        promo_id: n.promoId,
        acepta_promos: n.aceptaPromos,
        client_ref: n.clientRef,
        cuerpo_hash: n.cuerpoHash,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    return r.id;
  }

  async insertarConsentimiento(tx: Kysely<BaseDatos>, email: string, reservacionId: string, versionAviso: string): Promise<void> {
    await tx
      .insertInto('consentimientos')
      .values({ email, acepta: true, origen: 'reserva', reservacion_id: reservacionId, version_aviso: versionAviso })
      .execute();
  }

  async porId(tx: Kysely<BaseDatos>, id: string): Promise<ReservaFila> {
    const r = await sql<ReservaFila>`
      select ${COLUMNAS}
      from reservaciones r join salidas s on s.id = r.salida_id join tours t on t.id = s.tour_id
      where r.id = ${id}`.execute(tx);
    return r.rows[0]!;
  }
}
