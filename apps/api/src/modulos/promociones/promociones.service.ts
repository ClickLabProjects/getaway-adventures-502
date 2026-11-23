import { Injectable } from '@nestjs/common';
import { ErrorNegocio } from '../../plataforma/errores/error-negocio';
import type { PromocionDto, PromoValidaDto, ValidarPromoEntrada } from './promociones.dto';
import { PromocionesRepo } from './promociones.repo';

@Injectable()
export class PromocionesService {
  constructor(private readonly repo: PromocionesRepo) {}

  vigentes(): Promise<PromocionDto[]> {
    return this.repo.vigentes();
  }

  async validar(e: ValidarPromoEntrada): Promise<PromoValidaDto> {
    const p = await this.repo.validar(e.codigo, e.tour_slug);
    // Mismo error si el código no existe, venció o es de otro tour: no se revela cuál.
    if (!p) throw new ErrorNegocio('GA_PROMO_INVALIDA', 422, 'El código de promoción no es válido para este tour.');
    return { valida: true, ...p };
  }
}
