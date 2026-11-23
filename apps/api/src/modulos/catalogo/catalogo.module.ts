import { Module } from '@nestjs/common';
import { CatalogoController } from './catalogo.controller';
import { CatalogoRepo } from './catalogo.repo';
import { CatalogoService } from './catalogo.service';

@Module({ controllers: [CatalogoController], providers: [CatalogoService, CatalogoRepo] })
export class CatalogoModule {}
