import { Injectable } from '@nestjs/common';
import { sql } from 'kysely';
import { DbService } from '../../plataforma/db/db.service';
import type { SalidaDto, TourDto } from './catalogo.dto';

const num = (v: string | null): number | null => (v === null ? null : Number(v));

@Injectable()
export class CatalogoRepo {
  constructor(private readonly db: DbService) {}

  private consultaTours() {
    return this.db.kysely
      .selectFrom('tours')
      .select([
        'id', 'slug', 'nombre', 'nombre_en', 'destino', 'destino_en', 'descripcion', 'descripcion_en',
        'duracion', 'duracion_en', 'incluye', 'incluye_en', 'punto_salida', 'punto_salida_en',
        'horario', 'horario_en', 'imagen_url', 'galeria', 'precio_q', 'lat', 'lng',
        sql<string | null>`to_char(hora_salida, 'HH24:MI')`.as('hora_salida'),
      ])
      .where('activo', '=', true);
  }

  private aDto(f: Awaited<ReturnType<ReturnType<CatalogoRepo['consultaTours']>['execute']>>[number]): TourDto {
    return { ...f, precio_q: Number(f.precio_q), lat: num(f.lat), lng: num(f.lng) };
  }

  async toursActivos(): Promise<TourDto[]> {
    const filas = await this.consultaTours().orderBy('orden').orderBy('nombre').execute();
    return filas.map((f) => this.aDto(f));
  }

  async tourPorSlug(slug: string): Promise<TourDto | null> {
    const f = await this.consultaTours().where('slug', '=', slug).executeTakeFirst();
    return f ? this.aDto(f) : null;
  }

  /**
   * Salidas activas del tour (activo) entre `desde` y `hasta` (fechas de Guatemala, inclusive)
   * cuyo cierre de reserva (ga.cierre_reserva) no ha pasado. Null si el tour no existe o está inactivo.
   */
  async salidasAbiertas(slug: string, desde: string, hasta: string): Promise<SalidaDto[] | null> {
    const tour = await this.db.kysely
      .selectFrom('tours').select('id').where('slug', '=', slug).where('activo', '=', true).executeTakeFirst();
    if (!tour) return null;
    const r = await sql<{ id: string; fecha: string; cupo: number; disponibles: number; precio_q: string }>`
      select s.id, to_char(s.fecha, 'YYYY-MM-DD') as fecha, s.cupo,
             greatest(s.cupo - ga.ocupados(s.id), 0)::int as disponibles,
             coalesce(s.precio_q, t.precio_q) as precio_q
      from salidas s join tours t on t.id = s.tour_id
      where s.tour_id = ${tour.id} and s.activo and t.activo
        and s.fecha >= ga.hoy_gt()
        and s.fecha between ${desde}::date and ${hasta}::date
        and ga.cierre_reserva(s.id) > now()
      order by s.fecha`.execute(this.db.kysely);
    return r.rows.map((x) => ({ ...x, precio_q: Number(x.precio_q) }));
  }
}
