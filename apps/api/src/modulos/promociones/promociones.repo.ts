import { Injectable } from '@nestjs/common';
import { sql, type ExpressionBuilder, type Kysely } from 'kysely';
import { DbService } from '../../plataforma/db/db.service';
import type { BaseDatos } from '../../plataforma/db/tipos';
import type { PromocionDto, PromoValidaDto } from './promociones.dto';

/** Vigencia por fecha de Guatemala (ga.hoy_gt), inclusive en ambos bordes. */
const vigente = (eb: ExpressionBuilder<BaseDatos & { p: BaseDatos['promociones'] }, 'p'>) =>
  eb.and([
    eb('p.activo', '=', true),
    eb('p.descuento_pct', '>', '0'),
    eb.or([eb('p.desde', 'is', null), eb('p.desde', '<=', sql<string>`ga.hoy_gt()`)]),
    eb.or([eb('p.hasta', 'is', null), eb('p.hasta', '>=', sql<string>`ga.hoy_gt()`)]),
  ]);

@Injectable()
export class PromocionesRepo {
  constructor(private readonly db: DbService) {}

  async vigentes(): Promise<PromocionDto[]> {
    const filas = await this.db.kysely
      .selectFrom('promociones as p')
      .leftJoin('tours as t', 't.id', 'p.tour_id')
      .select([
        'p.id', 'p.titulo', 'p.titulo_en', 'p.descripcion', 'p.descripcion_en', 'p.imagen_url',
        'p.codigo', 'p.descuento_pct', 'p.aplica_todos', 't.slug as tour_slug', 't.nombre as tour_nombre',
      ])
      .where(vigente)
      // O aplica a todos, o su tour existe y está activo.
      .where((eb) => eb.or([eb('p.aplica_todos', '=', true), eb('t.activo', '=', true)]))
      .orderBy('p.created_at', 'desc')
      .execute();
    return filas.map(({ tour_slug, tour_nombre, descuento_pct, ...f }) => ({
      ...f,
      descuento_pct: Number(descuento_pct),
      tour: f.aplica_todos || tour_slug === null ? null : { slug: tour_slug, nombre: tour_nombre! },
    }));
  }

  /** Promoción vigente con ese código (ya normalizado) que aplica al tour activo `tourSlug`. */
  async validar(
    codigo: string,
    tourSlug: string,
    ejecutor: Kysely<BaseDatos> = this.db.kysely,
  ): Promise<(Omit<PromoValidaDto, 'valida'> & { id: string }) | null> {
    const f = await ejecutor
      .selectFrom('promociones as p')
      .innerJoin('tours as t', (j) => j.on('t.slug', '=', tourSlug).on('t.activo', '=', true))
      .select(['p.id', 'p.titulo', 'p.titulo_en', 'p.descuento_pct'])
      .where('p.codigo', '=', codigo)
      .where(vigente)
      .where((eb) => eb.or([eb('p.aplica_todos', '=', true), eb('p.tour_id', '=', eb.ref('t.id'))]))
      .limit(1)
      .executeTakeFirst();
    return f ? { id: f.id, titulo: f.titulo, titulo_en: f.titulo_en, descuento_pct: Number(f.descuento_pct) } : null;
  }
}
