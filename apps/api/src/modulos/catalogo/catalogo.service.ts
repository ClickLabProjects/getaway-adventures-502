import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ErrorNegocio } from '../../plataforma/errores/error-negocio';
import { RelojService } from '../../plataforma/reloj/reloj.service';
import type { SalidaDto, TourDto } from './catalogo.dto';
import { CatalogoRepo } from './catalogo.repo';

const DIA_MS = 86_400_000;
const DIAS_POR_OMISION = 60;
const DIAS_MAXIMOS = 120;

const fechaIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, 'Fecha inválida');

/** Query de /tours/:slug/salidas. El rango máximo (120 días) se valida en el servicio. */
export const consultaSalidasEsquema = z.object({ desde: fechaIso.optional(), hasta: fechaIso.optional() }).strict();
export type ConsultaSalidas = z.infer<typeof consultaSalidasEsquema>;

const ms = (f: string) => Date.parse(`${f}T00:00:00Z`);
const sumar = (f: string, n: number) => new Date(ms(f) + n * DIA_MS).toISOString().slice(0, 10);

function tourNoEncontrado(): ErrorNegocio {
  return new ErrorNegocio('GA_TOUR_NO_ENCONTRADO', 404, 'El tour no existe o no está disponible.');
}

@Injectable()
export class CatalogoService {
  constructor(
    private readonly repo: CatalogoRepo,
    private readonly reloj: RelojService,
  ) {}

  tours(): Promise<TourDto[]> {
    return this.repo.toursActivos();
  }

  async tour(slug: string): Promise<TourDto> {
    const t = await this.repo.tourPorSlug(slug);
    if (!t) throw tourNoEncontrado();
    return t;
  }

  async salidas(slug: string, q: ConsultaSalidas): Promise<SalidaDto[]> {
    const hoy = this.reloj.hoyGuatemala();
    const desdePedido = q.desde ?? hoy;
    const hasta = q.hasta ?? sumar(desdePedido > hoy ? desdePedido : hoy, DIAS_POR_OMISION);
    if (hasta < desdePedido) throw new ErrorNegocio('GA_VALIDACION', 400, 'Datos inválidos en: hasta');
    if ((ms(hasta) - ms(desdePedido)) / DIA_MS > DIAS_MAXIMOS) {
      throw new ErrorNegocio('GA_VALIDACION', 400, `Datos inválidos en: hasta (el rango máximo es de ${DIAS_MAXIMOS} días)`);
    }
    const desde = desdePedido > hoy ? desdePedido : hoy; // nunca salidas pasadas
    const r = await this.repo.salidasAbiertas(slug, desde, hasta);
    if (!r) throw tourNoEncontrado();
    return r;
  }
}
