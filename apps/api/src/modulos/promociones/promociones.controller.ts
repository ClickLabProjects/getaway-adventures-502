import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Publico } from '../../plataforma/auth/decoradores';
import { ZodPipe } from '../../plataforma/validacion/zod.pipe';
import {
  PromocionDto,
  PromoValidaDto,
  ValidarPromoEntradaDto,
  validarPromoEsquema,
  type ValidarPromoEntrada,
} from './promociones.dto';
import { PromocionesService } from './promociones.service';

@ApiTags('promociones')
@Controller('promociones')
export class PromocionesController {
  constructor(private readonly servicio: PromocionesService) {}

  @Get()
  @Publico()
  @ApiOkResponse({ type: [PromocionDto] })
  async vigentes(@Res({ passthrough: true }) res: FastifyReply): Promise<PromocionDto[]> {
    const r = await this.servicio.vigentes();
    void res.header('cache-control', 'public, max-age=60');
    return r;
  }

  @Post('validar')
  @Publico()
  @HttpCode(200)
  @ApiBody({ type: ValidarPromoEntradaDto })
  @ApiOkResponse({ type: PromoValidaDto })
  @ApiResponse({ status: 422, description: 'GA_PROMO_INVALIDA' })
  validar(
    @Body(new ZodPipe(validarPromoEsquema)) cuerpo: ValidarPromoEntrada,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<PromoValidaDto> {
    void res.header('cache-control', 'no-store');
    return this.servicio.validar(cuerpo);
  }
}
