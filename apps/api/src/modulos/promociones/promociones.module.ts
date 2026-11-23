import { Module } from '@nestjs/common';
import { PromocionesController } from './promociones.controller';
import { PromocionesRepo } from './promociones.repo';
import { PromocionesService } from './promociones.service';

@Module({ controllers: [PromocionesController], providers: [PromocionesService, PromocionesRepo] })
export class PromocionesModule {}
