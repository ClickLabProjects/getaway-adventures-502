import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { FiltroErrores } from './filtro-errores';

@Module({ providers: [{ provide: APP_FILTER, useClass: FiltroErrores }] })
export class ErroresModule {}
