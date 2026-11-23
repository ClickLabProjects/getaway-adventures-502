import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Publico } from '../../plataforma/auth/decoradores';
import { ZodPipe } from '../../plataforma/validacion/zod.pipe';
import { SalidaDto, TourDto } from './catalogo.dto';
import { CatalogoService, consultaSalidasEsquema, type ConsultaSalidas } from './catalogo.service';

@ApiTags('catalogo')
@Controller('tours')
export class CatalogoController {
  constructor(private readonly servicio: CatalogoService) {}

  @Get()
  @Publico()
  @ApiOkResponse({ type: [TourDto] })
  async tours(@Res({ passthrough: true }) res: FastifyReply): Promise<TourDto[]> {
    const r = await this.servicio.tours();
    void res.header('cache-control', 'public, max-age=60');
    return r;
  }

  @Get(':slug')
  @Publico()
  @ApiOkResponse({ type: TourDto })
  async tour(@Param('slug') slug: string, @Res({ passthrough: true }) res: FastifyReply): Promise<TourDto> {
    const t = await this.servicio.tour(slug);
    void res.header('cache-control', 'public, max-age=60');
    return t;
  }

  @Get(':slug/salidas')
  @Publico()
  @ApiQuery({ name: 'desde', required: false, example: '2030-06-01' })
  @ApiQuery({ name: 'hasta', required: false, example: '2030-07-31' })
  @ApiOkResponse({ type: [SalidaDto] })
  async salidas(
    @Param('slug') slug: string,
    @Query(new ZodPipe(consultaSalidasEsquema)) q: ConsultaSalidas,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<SalidaDto[]> {
    void res.header('cache-control', 'no-store');
    return this.servicio.salidas(slug, q);
  }
}
